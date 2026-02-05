import { pool } from '../config/database';
import {
  ClientInvoice,
  ClientInvoiceLineItem,
  GenerateClientInvoiceInput,
  UpdateClientInvoiceInput,
  ClientInvoiceWithLineItems,
  PaginatedResponse,
  PaginationParams,
} from '../types';
import { AppError } from '../middleware/errorHandler';

export class ClientInvoiceService {
  /**
   * Generate a unique client invoice number in format: INV-YYYY-#####
   */
  private async generateInvoiceNumber(orgId: string): Promise<string> {
    const year = new Date().getFullYear();

    // Get prefix from settings
    const settingsResult = await pool.query(
      'SELECT client_invoice_prefix FROM invoice_settings WHERE org_id = $1',
      [orgId]
    );

    const prefix = settingsResult.rows.length > 0
      ? settingsResult.rows[0].client_invoice_prefix
      : 'INV';

    const invoicePrefix = `${prefix}-${year}-`;

    const result = await pool.query(
      `SELECT invoice_number FROM client_invoices
       WHERE org_id = $1 AND invoice_number LIKE $2
       ORDER BY invoice_number DESC LIMIT 1`,
      [orgId, `${invoicePrefix}%`]
    );

    let sequence = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].invoice_number;
      const parts = lastNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1]);
      sequence = lastSequence + 1;
    }

    return `${invoicePrefix}${sequence.toString().padStart(5, '0')}`;
  }

  /**
   * Generate client invoice from approved vendor invoices in a period
   * Applies markup percentage to all line items
   */
  async generateClientInvoice(
    orgId: string,
    userId: string,
    input: GenerateClientInvoiceInput
  ): Promise<ClientInvoiceWithLineItems> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get default markup percentage from settings if not provided
      let markupPercentage = input.markup_percentage || 15.0;

      if (!input.markup_percentage) {
        const settingsResult = await client.query(
          'SELECT default_markup_percentage FROM invoice_settings WHERE org_id = $1',
          [orgId]
        );

        if (settingsResult.rows.length > 0) {
          markupPercentage = Number(settingsResult.rows[0].default_markup_percentage);
        }
      }

      // Find all approved vendor invoices for the client in the period
      const vendorInvoicesResult = await client.query(
        `SELECT * FROM invoices
         WHERE org_id = $1
         AND client_id = $2
         AND status = 'approved'
         AND invoice_date >= $3
         AND invoice_date <= $4
         AND deleted_at IS NULL
         ORDER BY invoice_date, created_at`,
        [orgId, input.client_id, input.period_start, input.period_end]
      );

      if (vendorInvoicesResult.rows.length === 0) {
        throw new AppError(
          'No approved vendor invoices found for this client in the specified period',
          404,
          'NO_INVOICES_FOUND'
        );
      }

      const vendorInvoices = vendorInvoicesResult.rows;
      const vendorInvoiceIds = vendorInvoices.map(inv => inv.id);

      // Get all line items from these vendor invoices
      const lineItemsResult = await client.query(
        `SELECT * FROM invoice_line_items
         WHERE invoice_id = ANY($1) AND org_id = $2
         ORDER BY invoice_id, line_number`,
        [vendorInvoiceIds, orgId]
      );

      if (lineItemsResult.rows.length === 0) {
        throw new AppError(
          'No line items found in vendor invoices',
          404,
          'NO_LINE_ITEMS'
        );
      }

      const vendorLineItems = lineItemsResult.rows;

      // Calculate totals with markup
      let subtotal = 0;
      const clientLineItems: any[] = [];

      for (let i = 0; i < vendorLineItems.length; i++) {
        const vendorItem = vendorLineItems[i];
        const costBasis = parseFloat(vendorItem.amount);
        const markedUpAmount = costBasis * (1 + markupPercentage / 100);

        subtotal += markedUpAmount;

        clientLineItems.push({
          line_number: i + 1,
          vendor_invoice_id: vendorItem.invoice_id,
          vendor_line_item_id: vendorItem.id,
          description: vendorItem.description,
          service_type: vendorItem.service_type,
          service_date: vendorInvoices.find(inv => inv.id === vendorItem.invoice_id)?.invoice_date,
          quantity: vendorItem.quantity,
          cost_basis: costBasis,
          markup_percentage: markupPercentage,
          unit_price: vendorItem.unit_price
            ? parseFloat(vendorItem.unit_price) * (1 + markupPercentage / 100)
            : null,
          amount: markedUpAmount,
          notes: vendorItem.notes,
        });
      }

      const tax = 0; // Tax calculation can be added later
      const total = subtotal + tax;

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(orgId);

      // Determine invoice date and due date
      const invoiceDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]; // 30 days from now

      // Create client invoice header
      const invoiceResult = await client.query(
        `INSERT INTO client_invoices (
          org_id, invoice_number, client_id, invoice_date, due_date,
          period_start, period_end, subtotal, tax, total, notes, generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          orgId,
          invoiceNumber,
          input.client_id,
          invoiceDate,
          dueDate,
          input.period_start,
          input.period_end,
          subtotal,
          tax,
          total,
          input.notes,
          userId,
        ]
      );

      const clientInvoice = invoiceResult.rows[0];

      // Insert client invoice line items
      const insertedLineItems: ClientInvoiceLineItem[] = [];

      for (const item of clientLineItems) {
        const lineItemResult = await client.query(
          `INSERT INTO client_invoice_line_items (
            org_id, client_invoice_id, vendor_invoice_id, vendor_line_item_id,
            line_number, description, service_type, service_date, quantity,
            cost_basis, markup_percentage, unit_price, amount, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *`,
          [
            orgId,
            clientInvoice.id,
            item.vendor_invoice_id,
            item.vendor_line_item_id,
            item.line_number,
            item.description,
            item.service_type,
            item.service_date,
            item.quantity,
            item.cost_basis,
            item.markup_percentage,
            item.unit_price,
            item.amount,
            item.notes,
          ]
        );

        insertedLineItems.push(lineItemResult.rows[0]);
      }

      await client.query('COMMIT');

      return {
        ...clientInvoice,
        line_items: insertedLineItems,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get client invoice by ID with line items
   */
  async getClientInvoiceById(
    id: string,
    orgId: string
  ): Promise<ClientInvoiceWithLineItems | null> {
    const invoiceResult = await pool.query(
      'SELECT * FROM client_invoices WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );

    if (invoiceResult.rows.length === 0) {
      return null;
    }

    const lineItemsResult = await pool.query(
      'SELECT * FROM client_invoice_line_items WHERE client_invoice_id = $1 AND org_id = $2 ORDER BY line_number',
      [id, orgId]
    );

    return {
      ...invoiceResult.rows[0],
      line_items: lineItemsResult.rows,
    };
  }

  /**
   * List client invoices with pagination and filters
   */
  async listClientInvoices(
    orgId: string,
    params: PaginationParams & {
      search?: string;
      status?: string;
      client_id?: string;
    }
  ): Promise<PaginatedResponse<ClientInvoice>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const allowedSortColumns = [
      'invoice_number',
      'invoice_date',
      'due_date',
      'status',
      'total',
      'created_at',
      'updated_at',
    ];
    const sortBy = allowedSortColumns.includes(params.sort_by || '')
      ? params.sort_by
      : 'created_at';
    const sortOrder = params.sort_order === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE org_id = $1 AND deleted_at IS NULL';
    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    if (params.search) {
      whereClause += ` AND (invoice_number ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    if (params.client_id) {
      whereClause += ` AND client_id = $${paramIndex}`;
      queryParams.push(params.client_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM client_invoices ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT * FROM client_invoices ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    return {
      items: result.rows,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update client invoice (only if status is 'draft')
   */
  async updateClientInvoice(
    input: UpdateClientInvoiceInput
  ): Promise<ClientInvoice> {
    const existing = await this.getClientInvoiceById(input.id, input.orgId);
    if (!existing) {
      throw new AppError('Client invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    if (existing.status !== 'draft') {
      throw new AppError(
        'Can only update client invoices in draft status',
        400,
        'INVOICE_NOT_DRAFT'
      );
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'orgId') {
        const snakeKey = key.replace(/[A-Z]/g, (letter) =>
          `_${letter.toLowerCase()}`
        );
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(input.id, input.orgId);

    const result = await pool.query(
      `UPDATE client_invoices SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete (soft delete) a client invoice
   */
  async deleteClientInvoice(id: string, orgId: string): Promise<void> {
    await pool.query(
      'UPDATE client_invoices SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND org_id = $2',
      [id, orgId]
    );
  }

  /**
   * Approve a client invoice
   */
  async approveClientInvoice(
    id: string,
    userId: string,
    orgId: string
  ): Promise<ClientInvoice> {
    const result = await pool.query(
      `UPDATE client_invoices
       SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND org_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [userId, id, orgId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Client invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Send a client invoice to the client
   */
  async sendClientInvoice(id: string, orgId: string): Promise<ClientInvoice> {
    const result = await pool.query(
      `UPDATE client_invoices
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Client invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Mark a client invoice as paid
   */
  async markAsPaid(
    id: string,
    paymentDate: string,
    orgId: string
  ): Promise<ClientInvoice> {
    const result = await pool.query(
      `UPDATE client_invoices
       SET status = 'paid', payment_date = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND org_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [paymentDate, id, orgId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Client invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    return result.rows[0];
  }
}

export const clientInvoiceService = new ClientInvoiceService();
