import { pool } from '../config/database';
import { Invoice, InvoiceStatus, PaginatedResponse, PaginationParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { storageService } from './storageService';
import { ocrService } from './ocrService';

export interface CreateVendorInvoiceInput {
  orgId: string;
  vendorId: string;
  clientId?: string;
  siteId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  periodStart?: string;
  periodEnd?: string;
  subtotal?: number;
  tax?: number;
  fees?: number;
  total: number;
  notes?: string;
  filePath?: string;
  ocrData?: any;
}

export interface UpdateVendorInvoiceInput extends Partial<CreateVendorInvoiceInput> {
  id: string;
  status?: InvoiceStatus;
}

export interface UploadVendorInvoiceInput {
  orgId: string;
  vendorId: string;
  clientId?: string;
  siteId?: string;
  poId?: string;
  file: Express.Multer.File;
}

export class VendorInvoiceService {
  private async canJoinPurchaseOrders(): Promise<boolean> {
    try {
      const [tableResult, columnResult] = await Promise.all([
        pool.query(`SELECT to_regclass('public.purchase_orders') AS table_ref`),
        pool.query(
          `SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'invoices'
             AND column_name = 'po_id'
           LIMIT 1`
        ),
      ]);
      const hasTable = Boolean(tableResult.rows[0]?.table_ref);
      const hasColumn = columnResult.rows.length > 0;
      return hasTable && hasColumn;
    } catch {
      return false;
    }
  }

  private extractPONumberFromText(rawText: string | undefined): string | null {
    if (!rawText) return null;

    const patterns = [
      /\b(PO-\d{4}-\d{5})\b/i,
      /\bPO\s*#?:?\s*([A-Z0-9-]{4,})\b/i,
      /\bPurchase\s+Order\s*#?:?\s*([A-Z0-9-]{4,})\b/i,
    ];

    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (!match) continue;
      const normalized = (match[1] || '').trim().toUpperCase();
      if (!normalized) continue;
      return normalized.startsWith('PO-') ? normalized : `PO-${normalized}`;
    }

    return null;
  }

  private async resolvePurchaseOrderForInvoice(
    orgId: string,
    vendorId: string,
    clientId: string | undefined,
    siteId: string | undefined,
    explicitPoId: string | undefined,
    invoiceDate: string,
    invoiceTotal: number,
    ocrRawText?: string
  ): Promise<string | null> {
    if (explicitPoId) {
      const poResult = await pool.query(
        `SELECT id
         FROM purchase_orders
         WHERE id = $1
           AND org_id = $2
           AND deleted_at IS NULL`,
        [explicitPoId, orgId]
      );
      if (poResult.rows.length > 0) {
        return poResult.rows[0].id;
      }
    }

    const extractedPoNumber = this.extractPONumberFromText(ocrRawText);
    if (extractedPoNumber) {
      const poByNumberResult = await pool.query(
        `SELECT id
         FROM purchase_orders
         WHERE org_id = $1
           AND po_number = $2
           AND deleted_at IS NULL
         LIMIT 1`,
        [orgId, extractedPoNumber]
      );
      if (poByNumberResult.rows.length > 0) {
        return poByNumberResult.rows[0].id;
      }
    }

    if (!siteId) {
      return null;
    }

    const fallbackResult = await pool.query(
      `SELECT
         po.id,
         ABS(COALESCE(po.total, 0) - $6::numeric) AS amount_delta,
         ABS(EXTRACT(EPOCH FROM (po.po_date::timestamp - $5::timestamp))) AS date_delta
       FROM purchase_orders po
       WHERE po.org_id = $1
         AND po.vendor_id = $2
         AND po.site_id = $3
         AND ($4::uuid IS NULL OR po.client_id = $4::uuid)
         AND po.service_scope = 'non_recurring'
         AND po.status IN ('draft', 'sent', 'approved')
         AND po.deleted_at IS NULL
         AND (
           po.po_date BETWEEN ($5::date - INTERVAL '45 day') AND ($5::date + INTERVAL '45 day')
           OR (
             po.expected_delivery_date IS NOT NULL
             AND po.expected_delivery_date BETWEEN ($5::date - INTERVAL '45 day') AND ($5::date + INTERVAL '45 day')
           )
         )
       ORDER BY amount_delta ASC, date_delta ASC
       LIMIT 1`,
      [orgId, vendorId, siteId, clientId || null, invoiceDate, invoiceTotal || 0]
    );

    return fallbackResult.rows[0]?.id || null;
  }

  /**
   * Upload and process a vendor invoice PDF with OCR
   */
  async uploadAndProcessInvoice(input: UploadVendorInvoiceInput): Promise<Invoice> {
    const client = await pool.connect();
    let uploadedFilePath: string | null = null;

    try {
      await client.query('BEGIN');

      console.log('Uploading file to storage...');
      // Upload file to Supabase Storage
      const filePath = await storageService.uploadFile(
        input.file,
        input.orgId,
        input.vendorId
      );
      uploadedFilePath = filePath;

      console.log('Running OCR extraction...');
      // Extract data from PDF using OCR
      const ocrResult = await ocrService.extractInvoiceData(input.file.buffer);

      console.log('Creating invoice record...');
      // Create invoice record with OCR data
      const invoiceData: CreateVendorInvoiceInput = {
        orgId: input.orgId,
        vendorId: input.vendorId,
        clientId: input.clientId,
        siteId: input.siteId,
        invoiceNumber: ocrResult.invoiceNumber || `INV-${Date.now()}`,
        invoiceDate: ocrResult.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: ocrResult.dueDate,
        subtotal: ocrResult.subtotal,
        tax: ocrResult.tax,
        total: ocrResult.total || 0,
        filePath,
        ocrData: {
          ...ocrResult,
          processedAt: new Date().toISOString(),
        },
      };

      const matchedPoId = await this.resolvePurchaseOrderForInvoice(
        input.orgId,
        input.vendorId,
        input.clientId,
        input.siteId,
        input.poId,
        invoiceData.invoiceDate,
        invoiceData.total,
        ocrResult.rawText
      );

      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          org_id, vendor_id, client_id, site_id, invoice_number, invoice_date,
          due_date, period_start, period_end, subtotal, tax, fees, total, po_id,
          currency, status, notes, file_path, ocr_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [
          invoiceData.orgId,
          invoiceData.vendorId,
          invoiceData.clientId,
          invoiceData.siteId,
          invoiceData.invoiceNumber,
          invoiceData.invoiceDate,
          invoiceData.dueDate,
          invoiceData.periodStart,
          invoiceData.periodEnd,
          invoiceData.subtotal,
          invoiceData.tax,
          invoiceData.fees,
          invoiceData.total,
          matchedPoId,
          'USD',
          InvoiceStatus.PENDING,
          invoiceData.notes,
          invoiceData.filePath,
          JSON.stringify(invoiceData.ocrData),
        ]
      );

      const invoice = invoiceResult.rows[0];

      // Create line items if OCR found any
      if (ocrResult.lineItems && ocrResult.lineItems.length > 0) {
        console.log(`Creating ${ocrResult.lineItems.length} line items...`);
        for (const lineItem of ocrResult.lineItems) {
          await client.query(
            `INSERT INTO invoice_line_items (
              invoice_id, description, quantity, unit_price, amount
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              invoice.id,
              lineItem.description,
              lineItem.quantity || 1,
              lineItem.unitPrice || lineItem.amount,
              lineItem.amount,
            ]
          );
        }
      }

      await client.query('COMMIT');
      console.log('Invoice created successfully:', invoice.id);

      return invoice;
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Failed to upload and process invoice:', error);

      // If we uploaded the file but failed to create the invoice, try to clean up
      if (uploadedFilePath) {
        try {
          await storageService.deleteFile(uploadedFilePath);
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded file:', cleanupError);
        }
      }

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Failed to process invoice upload',
        500,
        'UPLOAD_PROCESSING_FAILED'
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get vendor invoice by ID
   */
  async getVendorInvoiceById(id: string, orgId: string): Promise<Invoice | null> {
    const hasPurchaseOrdersTable = await this.canJoinPurchaseOrders();
    const poSelect = hasPurchaseOrdersTable ? 'po.po_number,' : 'NULL::text AS po_number,';
    const poJoin = hasPurchaseOrdersTable ? 'LEFT JOIN purchase_orders po ON i.po_id = po.id' : '';
    const poGroupBy = hasPurchaseOrdersTable ? ', po.po_number' : '';

    const result = await pool.query(
      `SELECT i.*,
        v.name as vendor_name,
        c.name as client_name,
        ${poSelect}
        COALESCE(
          json_agg(
            json_build_object(
              'id', li.id,
              'description', li.description,
              'quantity', li.quantity,
              'unit_price', li.unit_price,
              'amount', li.amount,
              'match_status', li.match_status,
              'po_line_item_id', li.po_line_item_id
            )
          ) FILTER (WHERE li.id IS NOT NULL),
          '[]'
        ) as line_items
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN clients c ON i.client_id = c.id
      ${poJoin}
      LEFT JOIN invoice_line_items li ON i.id = li.invoice_id
      WHERE i.id = $1 AND i.org_id = $2 AND i.deleted_at IS NULL
      GROUP BY i.id, v.name, c.name${poGroupBy}`,
      [id, orgId]
    );

    return result.rows[0] || null;
  }

  /**
   * List vendor invoices with pagination and filters
   */
  async listVendorInvoices(
    orgId: string,
    params: PaginationParams & {
      search?: string;
      vendorId?: string;
      clientId?: string;
      status?: InvoiceStatus;
    }
  ): Promise<PaginatedResponse<Invoice>> {
    const hasPurchaseOrdersTable = await this.canJoinPurchaseOrders();
    const poSelect = hasPurchaseOrdersTable ? 'po.po_number' : 'NULL::text as po_number';
    const poJoin = hasPurchaseOrdersTable ? 'LEFT JOIN purchase_orders po ON i.po_id = po.id' : '';

    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const allowedSortColumns = ['invoice_number', 'invoice_date', 'due_date', 'total', 'status', 'created_at'];
    const sortBy = allowedSortColumns.includes(params.sort_by || '') ? params.sort_by : 'created_at';
    const sortOrder = params.sort_order === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE i.org_id = $1 AND i.deleted_at IS NULL';
    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    if (params.search) {
      whereClause += ` AND (i.invoice_number ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.vendorId) {
      whereClause += ` AND i.vendor_id = $${paramIndex}`;
      queryParams.push(params.vendorId);
      paramIndex++;
    }

    if (params.clientId) {
      whereClause += ` AND i.client_id = $${paramIndex}`;
      queryParams.push(params.clientId);
      paramIndex++;
    }

    if (params.status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM invoices i
       LEFT JOIN vendors v ON i.vendor_id = v.id
       ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT i.*,
        v.name as vendor_name,
        c.name as client_name,
        ${poSelect}
       FROM invoices i
       LEFT JOIN vendors v ON i.vendor_id = v.id
       LEFT JOIN clients c ON i.client_id = c.id
       ${poJoin}
       ${whereClause}
       ORDER BY i.${sortBy} ${sortOrder}
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
   * Update vendor invoice
   */
  async updateVendorInvoice(input: UpdateVendorInvoiceInput): Promise<Invoice> {
    const { id, ...updateData } = input;

    const existing = await this.getVendorInvoiceById(id, input.orgId!);
    if (!existing) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'orgId') {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    values.push(id, input.orgId);

    const result = await pool.query(
      `UPDATE invoices SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete vendor invoice (soft delete)
   */
  async deleteVendorInvoice(id: string, orgId: string): Promise<void> {
    const invoice = await this.getVendorInvoiceById(id, orgId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    await pool.query(
      'UPDATE invoices SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND org_id = $2',
      [id, orgId]
    );

    // Optionally delete the file from storage
    if (invoice.file_path) {
      try {
        await storageService.deleteFile(invoice.file_path);
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
        // Continue even if file deletion fails
      }
    }
  }

  /**
   * Get signed URL for downloading invoice PDF
   */
  async getInvoicePdfUrl(id: string, orgId: string): Promise<string> {
    const invoice = await this.getVendorInvoiceById(id, orgId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    if (!invoice.file_path) {
      throw new AppError('Invoice has no associated PDF file', 404, 'NO_FILE');
    }

    return storageService.getSignedUrl(invoice.file_path);
  }

  async markAsPaid(
    id: string,
    orgId: string,
    paymentDate: string,
    paymentMethod?: string,
    paymentReference?: string
  ): Promise<Invoice> {
    const result = await pool.query(
      `UPDATE invoices
       SET status = 'paid',
           payment_date = $1,
           payment_method = $2,
           payment_reference = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND org_id = $5 AND deleted_at IS NULL
       RETURNING *`,
      [paymentDate, paymentMethod || null, paymentReference || null, id, orgId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    return result.rows[0];
  }
}

export const vendorInvoiceService = new VendorInvoiceService();
