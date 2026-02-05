import { pool } from '../config/database';
import { Vendor, PaginatedResponse, PaginationParams } from '../types';
import { AppError } from '../middleware/errorHandler';

export interface CreateVendorInput {
  orgId: string;
  name: string;
  legalName?: string;
  vendorType?: string;
  email?: string;
  phone?: string;
  emergencyPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  serviceCapabilities?: string[];
  coverageAreas?: string[];
  performanceScore?: number;
}

export interface UpdateVendorInput extends Partial<CreateVendorInput> {
  id: string;
}

export class VendorService {
  async createVendor(input: CreateVendorInput): Promise<Vendor> {
    const result = await pool.query(
      `INSERT INTO vendors (
        org_id, name, legal_name, vendor_type, email, phone, emergency_phone,
        address, city, state, zip, website, primary_contact_name,
        primary_contact_phone, primary_contact_email, service_capabilities,
        coverage_areas, performance_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        input.orgId,
        input.name,
        input.legalName,
        input.vendorType,
        input.email,
        input.phone,
        input.emergencyPhone,
        input.address,
        input.city,
        input.state,
        input.zip,
        input.website,
        input.primaryContactName,
        input.primaryContactPhone,
        input.primaryContactEmail,
        JSON.stringify(input.serviceCapabilities || []),
        JSON.stringify(input.coverageAreas || []),
        input.performanceScore || 0,
      ]
    );

    return result.rows[0];
  }

  async getVendorById(id: string, orgId: string): Promise<Vendor | null> {
    const result = await pool.query(
      'SELECT * FROM vendors WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );

    return result.rows[0] || null;
  }

  async listVendors(
    orgId: string,
    params: PaginationParams & { search?: string; vendorType?: string; serviceCapability?: string }
  ): Promise<PaginatedResponse<Vendor>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Whitelist allowed sort columns to prevent SQL injection
    const allowedSortColumns = ['name', 'legal_name', 'vendor_type', 'performance_score', 'created_at', 'updated_at'];
    const sortBy = allowedSortColumns.includes(params.sort_by || '') ? params.sort_by : 'created_at';
    const sortOrder = params.sort_order === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE org_id = $1 AND deleted_at IS NULL';
    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    if (params.search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR legal_name ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.vendorType) {
      whereClause += ` AND vendor_type = $${paramIndex}`;
      queryParams.push(params.vendorType);
      paramIndex++;
    }

    if (params.serviceCapability) {
      whereClause += ` AND $${paramIndex} = ANY(service_capabilities)`;
      queryParams.push(params.serviceCapability);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM vendors ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT * FROM vendors ${whereClause}
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

  async updateVendor(input: UpdateVendorInput): Promise<Vendor> {
    const { id, ...updateData } = input;

    const existing = await this.getVendorById(id, input.orgId!);
    if (!existing) {
      throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'orgId') {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${paramIndex}`);

        // Convert arrays to JSON strings for JSONB fields
        if (key === 'serviceCapabilities' || key === 'coverageAreas') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    values.push(id, input.orgId);

    const result = await pool.query(
      `UPDATE vendors SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async deleteVendor(id: string, orgId: string): Promise<void> {
    await pool.query(
      'UPDATE vendors SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND org_id = $2',
      [id, orgId]
    );
  }
}

export const vendorService = new VendorService();
