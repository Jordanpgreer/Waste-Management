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
  file: Express.Multer.File;
}

export class VendorInvoiceService {
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

      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          org_id, vendor_id, client_id, site_id, invoice_number, invoice_date,
          due_date, period_start, period_end, subtotal, tax, fees, total,
          currency, status, notes, file_path, ocr_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
    const result = await pool.query(
      `SELECT i.*,
        v.name as vendor_name,
        c.name as client_name,
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
      LEFT JOIN invoice_line_items li ON i.id = li.invoice_id
      WHERE i.id = $1 AND i.org_id = $2 AND i.deleted_at IS NULL
      GROUP BY i.id, v.name, c.name`,
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
        c.name as client_name
       FROM invoices i
       LEFT JOIN vendors v ON i.vendor_id = v.id
       LEFT JOIN clients c ON i.client_id = c.id
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
}

export const vendorInvoiceService = new VendorInvoiceService();
