import { pool } from '../config/database';
import {
  PurchaseOrder,
  POLineItem,
  CreatePOInput,
  UpdatePOInput,
  PurchaseOrderWithLineItems,
  TicketPOLink,
  PaginatedResponse,
  PaginationParams,
} from '../types';
import { AppError } from '../middleware/errorHandler';

export class PurchaseOrderService {
  private normalizeServiceScope(scope?: string): 'non_recurring' | 'recurring' {
    if (scope === 'recurring') {
      return 'recurring';
    }
    return 'non_recurring';
  }

  private mapPricingLineItem(item: {
    quantity: number;
    unit_price?: number;
    vendor_unit_price?: number | null;
    client_unit_price?: number | null;
  }) {
    const qty = Number(item.quantity || 0);
    const vendorUnitPrice =
      item.vendor_unit_price !== undefined && item.vendor_unit_price !== null
        ? Number(item.vendor_unit_price)
        : item.unit_price !== undefined
        ? Number(item.unit_price)
        : null;
    const clientUnitPrice =
      item.client_unit_price !== undefined && item.client_unit_price !== null
        ? Number(item.client_unit_price)
        : item.unit_price !== undefined
        ? Number(item.unit_price)
        : null;

    const vendorAmount = vendorUnitPrice !== null ? qty * vendorUnitPrice : null;
    const clientAmount = clientUnitPrice !== null ? qty * clientUnitPrice : null;
    const unitPrice = vendorUnitPrice ?? clientUnitPrice;
    const amount = vendorAmount ?? clientAmount;

    return {
      quantity: qty,
      unitPrice,
      amount,
      vendorUnitPrice,
      clientUnitPrice,
      vendorAmount,
      clientAmount,
    };
  }

  private deriveHeaderTotals(
    lineItems: Array<{ vendorAmount: number | null; clientAmount: number | null }>
  ): { subtotal: number; tax: number; total: number } {
    const vendorSubtotal = lineItems.reduce((sum, item) => sum + (item.vendorAmount || 0), 0);
    const clientSubtotal = lineItems.reduce((sum, item) => sum + (item.clientAmount || 0), 0);
    const subtotal = clientSubtotal > 0 ? clientSubtotal : vendorSubtotal;
    const tax = 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }
  /**
   * Generate a unique PO number in format: PO-YYYY-#####
   */
  private async generatePONumber(orgId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const result = await pool.query(
      `SELECT po_number FROM purchase_orders
       WHERE org_id = $1 AND po_number LIKE $2
       ORDER BY po_number DESC LIMIT 1`,
      [orgId, `${prefix}%`]
    );

    let sequence = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].po_number;
      const lastSequence = parseInt(lastNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(5, '0')}`;
  }

  /**
   * Create a new purchase order with line items
   */
  async createPO(
    orgId: string,
    userId: string,
    input: CreatePOInput
  ): Promise<PurchaseOrderWithLineItems> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const poNumber = await this.generatePONumber(orgId);
      const serviceScope = this.normalizeServiceScope(input.service_scope);

      if (serviceScope === 'recurring') {
        throw new AppError(
          'Recurring services should not use purchase orders. Create POs only for non-recurring work.',
          400,
          'PO_RECURRING_NOT_ALLOWED'
        );
      }

      const mappedItems = input.line_items.map((item) => this.mapPricingLineItem(item));
      const { subtotal, tax, total } = this.deriveHeaderTotals(mappedItems);

      // Insert PO header
      const poResult = await client.query(
        `INSERT INTO purchase_orders (
          org_id, po_number, client_id, vendor_id, site_id, service_scope, po_date,
          expected_delivery_date, subtotal, tax, total, terms, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          orgId,
          poNumber,
          input.client_id,
          input.vendor_id,
          input.site_id,
          serviceScope,
          input.po_date,
          input.expected_delivery_date,
          subtotal,
          tax,
          total,
          input.terms,
          input.notes,
          userId,
        ]
      );

      const po = poResult.rows[0];

      // Insert line items
      const lineItems: POLineItem[] = [];
      for (let i = 0; i < input.line_items.length; i++) {
        const item = input.line_items[i];
        const mapped = mappedItems[i];

        const lineItemResult = await client.query(
          `INSERT INTO po_line_items (
            org_id, po_id, line_number, description, service_type,
            quantity, unit_price, amount, vendor_unit_price, client_unit_price, vendor_amount, client_amount, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            orgId,
            po.id,
            i + 1,
            item.description,
            item.service_type,
            mapped.quantity,
            mapped.unitPrice,
            mapped.amount,
            mapped.vendorUnitPrice,
            mapped.clientUnitPrice,
            mapped.vendorAmount,
            mapped.clientAmount,
            item.notes,
          ]
        );

        lineItems.push(lineItemResult.rows[0]);
      }

      await client.query('COMMIT');

      return {
        ...po,
        line_items: lineItems,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get purchase order by ID with line items
   */
  async getPOById(
    id: string,
    orgId: string
  ): Promise<PurchaseOrderWithLineItems | null> {
    const poResult = await pool.query(
      'SELECT * FROM purchase_orders WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );

    if (poResult.rows.length === 0) {
      return null;
    }

    const lineItemsResult = await pool.query(
      'SELECT * FROM po_line_items WHERE po_id = $1 AND org_id = $2 ORDER BY line_number',
      [id, orgId]
    );

    return {
      ...poResult.rows[0],
      line_items: lineItemsResult.rows,
    };
  }

  /**
   * List purchase orders with pagination and filters
   */
  async listPOs(
    orgId: string,
    params: PaginationParams & {
      search?: string;
      status?: string;
      client_id?: string;
      vendor_id?: string;
      site_id?: string;
    }
  ): Promise<PaginatedResponse<PurchaseOrder>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const allowedSortColumns = [
      'po_number',
      'po_date',
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
      whereClause += ` AND (po_number ILIKE $${paramIndex})`;
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

    if (params.vendor_id) {
      whereClause += ` AND vendor_id = $${paramIndex}`;
      queryParams.push(params.vendor_id);
      paramIndex++;
    }

    if (params.site_id) {
      whereClause += ` AND site_id = $${paramIndex}`;
      queryParams.push(params.site_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM purchase_orders ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT * FROM purchase_orders ${whereClause}
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
   * Update purchase order (only if status is 'draft')
   */
  async updatePO(input: UpdatePOInput): Promise<PurchaseOrderWithLineItems> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await this.getPOById(input.id, input.orgId);
      if (!existing) {
        throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');
      }

      if (existing.status === 'cancelled' || existing.status === 'completed') {
        throw new AppError(
          'Cannot update cancelled or completed purchase orders',
          400,
          'PO_LOCKED'
        );
      }

      // Update PO header if there are changes
      const { id, orgId, line_items, ...updateData } = input;

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          const snakeKey = key.replace(/[A-Z]/g, (letter) =>
            `_${letter.toLowerCase()}`
          );
          fields.push(`${snakeKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (fields.length > 0) {
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id, orgId);

        await client.query(
          `UPDATE purchase_orders SET ${fields.join(', ')}
           WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}`,
          values
        );
      }

      // If line items are provided, replace them
      if (line_items && line_items.length > 0) {
        // Delete existing line items
        await client.query(
          'DELETE FROM po_line_items WHERE po_id = $1 AND org_id = $2',
          [id, orgId]
        );

        const mappedItems = line_items.map((item) => this.mapPricingLineItem(item));
        const { subtotal, tax, total } = this.deriveHeaderTotals(mappedItems);

        // Update PO totals
        await client.query(
          `UPDATE purchase_orders
           SET subtotal = $1, tax = $2, total = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4 AND org_id = $5`,
          [subtotal, tax, total, id, orgId]
        );

        // Insert new line items
        for (let i = 0; i < line_items.length; i++) {
          const item = line_items[i];
          const mapped = mappedItems[i];

          await client.query(
            `INSERT INTO po_line_items (
              org_id, po_id, line_number, description, service_type,
              quantity, unit_price, amount, vendor_unit_price, client_unit_price, vendor_amount, client_amount, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              orgId,
              id,
              i + 1,
              item.description,
              item.service_type,
              mapped.quantity,
              mapped.unitPrice,
              mapped.amount,
              mapped.vendorUnitPrice,
              mapped.clientUnitPrice,
              mapped.vendorAmount,
              mapped.clientAmount,
              item.notes,
            ]
          );
        }
      }

      await client.query('COMMIT');

      const updated = await this.getPOById(id, orgId);
      if (!updated) {
        throw new AppError('Failed to retrieve updated PO', 500, 'UPDATE_FAILED');
      }

      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft delete a purchase order
   */
  async deletePO(id: string, orgId: string): Promise<void> {
    await pool.query(
      'UPDATE purchase_orders SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND org_id = $2',
      [id, orgId]
    );
  }

  /**
   * Approve a purchase order
   */
  async approvePO(id: string, userId: string, orgId: string): Promise<PurchaseOrder> {
    const result = await pool.query(
      `UPDATE purchase_orders
       SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND org_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [userId, id, orgId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Send a purchase order to vendor
   */
  async sendPO(id: string, orgId: string): Promise<PurchaseOrder> {
    const result = await pool.query(
      `UPDATE purchase_orders
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * Link a purchase order to a ticket
   */
  async linkPOToTicket(
    poId: string,
    ticketId: string,
    orgId: string
  ): Promise<TicketPOLink> {
    try {
      const result = await pool.query(
        `INSERT INTO ticket_purchase_orders (org_id, ticket_id, po_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (ticket_id, po_id) DO NOTHING
         RETURNING *`,
        [orgId, ticketId, poId]
      );

      if (result.rows.length === 0) {
        // Link already exists
        const existing = await pool.query(
          'SELECT * FROM ticket_purchase_orders WHERE ticket_id = $1 AND po_id = $2',
          [ticketId, poId]
        );
        return existing.rows[0];
      }

      return result.rows[0];
    } catch (error) {
      throw new AppError('Failed to link PO to ticket', 500, 'LINK_FAILED');
    }
  }

  /**
   * Unlink a purchase order from a ticket
   */
  async unlinkPOFromTicket(
    poId: string,
    ticketId: string,
    orgId: string
  ): Promise<void> {
    await pool.query(
      'DELETE FROM ticket_purchase_orders WHERE ticket_id = $1 AND po_id = $2 AND org_id = $3',
      [ticketId, poId, orgId]
    );
  }

  /**
   * Get all tickets linked to a purchase order
   */
  async getLinkedTickets(poId: string, orgId: string): Promise<string[]> {
    const result = await pool.query(
      'SELECT ticket_id FROM ticket_purchase_orders WHERE po_id = $1 AND org_id = $2',
      [poId, orgId]
    );

    return result.rows.map((row) => row.ticket_id);
  }
}

export const purchaseOrderService = new PurchaseOrderService();
