import { pool } from '../config/database';
import { Client, ClientSite, PaginatedResponse, PaginationParams } from '../types';
import { AppError } from '../middleware/errorHandler';

export interface CreateClientInput {
  orgId: string;
  name: string;
  legalName?: string;
  industry?: string;
  email?: string;
  phone?: string;
  billingEmail?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  accountManagerId?: string;
  slaResponseHours?: number;
  slaResolutionHours?: number;
  communicationPreferences?: Record<string, any>;
  notes?: string;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {
  id: string;
}

export interface CreateSiteInput {
  orgId: string;
  clientId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  siteManagerName?: string;
  siteManagerPhone?: string;
  siteManagerEmail?: string;
  accessInstructions?: string;
  gateCode?: string;
  operatingHours?: string;
  specialInstructions?: string;
}

export interface UpdateSiteInput extends Partial<CreateSiteInput> {
  id: string;
}

export class ClientService {
  async createClient(input: CreateClientInput): Promise<Client> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (input.accountManagerId) {
        const managerCheck = await client.query(
          'SELECT id FROM users WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
          [input.accountManagerId, input.orgId]
        );

        if (managerCheck.rows.length === 0) {
          throw new AppError('Account manager not found', 404, 'MANAGER_NOT_FOUND');
        }
      }

      const result = await client.query(
        `INSERT INTO clients (
          org_id, name, legal_name, industry, email, phone, billing_email,
          billing_address, billing_city, billing_state, billing_zip,
          account_manager_id, sla_response_hours, sla_resolution_hours,
          communication_preferences, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          input.orgId,
          input.name,
          input.legalName,
          input.industry,
          input.email,
          input.phone,
          input.billingEmail,
          input.billingAddress,
          input.billingCity,
          input.billingState,
          input.billingZip,
          input.accountManagerId,
          input.slaResponseHours || 24,
          input.slaResolutionHours || 72,
          JSON.stringify(input.communicationPreferences || {}),
          input.notes,
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getClientById(id: string, orgId: string): Promise<Client | null> {
    const result = await pool.query(
      'SELECT * FROM clients WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );

    return result.rows[0] || null;
  }

  async listClients(
    orgId: string,
    params: PaginationParams & { search?: string; accountManagerId?: string; clientId?: string }
  ): Promise<PaginatedResponse<Client>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Whitelist allowed sort columns to prevent SQL injection
    const allowedSortColumns = ['name', 'legal_name', 'created_at', 'updated_at', 'is_active'];
    const sortBy = allowedSortColumns.includes(params.sort_by || '') ? params.sort_by : 'created_at';
    const sortOrder = params.sort_order === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE org_id = $1 AND deleted_at IS NULL';
    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    // Client filtering for client_user role
    if (params.clientId) {
      whereClause += ` AND id = $${paramIndex}`;
      queryParams.push(params.clientId);
      paramIndex++;
    }

    if (params.search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR legal_name ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.accountManagerId) {
      whereClause += ` AND account_manager_id = $${paramIndex}`;
      queryParams.push(params.accountManagerId);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM clients ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT * FROM clients ${whereClause}
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

  async updateClient(input: UpdateClientInput): Promise<Client> {
    const { id, ...updateData } = input;

    const existing = await this.getClientById(id, input.orgId!);
    if (!existing) {
      throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
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
      `UPDATE clients SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async deleteClient(id: string, orgId: string): Promise<void> {
    await pool.query(
      'UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND org_id = $2',
      [id, orgId]
    );
  }

  async createSite(input: CreateSiteInput): Promise<ClientSite> {
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [input.clientId, input.orgId]
    );

    if (clientCheck.rows.length === 0) {
      throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    const result = await pool.query(
      `INSERT INTO client_sites (
        org_id, client_id, name, address, city, state, zip, country,
        latitude, longitude, site_manager_name, site_manager_phone,
        site_manager_email, access_instructions, gate_code,
        operating_hours, special_instructions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        input.orgId,
        input.clientId,
        input.name,
        input.address,
        input.city,
        input.state,
        input.zip,
        input.country || 'USA',
        input.latitude,
        input.longitude,
        input.siteManagerName,
        input.siteManagerPhone,
        input.siteManagerEmail,
        input.accessInstructions,
        input.gateCode,
        input.operatingHours,
        input.specialInstructions,
      ]
    );

    return result.rows[0];
  }

  async getSiteById(id: string, orgId: string): Promise<ClientSite | null> {
    const result = await pool.query(
      'SELECT * FROM client_sites WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );

    return result.rows[0] || null;
  }

  async listSites(
    orgId: string,
    params: PaginationParams & { clientId?: string; search?: string }
  ): Promise<PaginatedResponse<ClientSite>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Whitelist allowed sort columns to prevent SQL injection
    const allowedSortColumns = ['name', 'address', 'city', 'state', 'created_at', 'updated_at'];
    const sortBy = allowedSortColumns.includes(params.sort_by || '') ? params.sort_by : 'created_at';
    const sortOrder = params.sort_order === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE org_id = $1 AND deleted_at IS NULL';
    const queryParams: any[] = [orgId];
    let paramIndex = 2;

    if (params.clientId) {
      whereClause += ` AND client_id = $${paramIndex}`;
      queryParams.push(params.clientId);
      paramIndex++;
    }

    if (params.search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM client_sites ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT * FROM client_sites ${whereClause}
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

  async updateSite(input: UpdateSiteInput): Promise<ClientSite> {
    const { id, ...updateData } = input;

    const existing = await this.getSiteById(id, input.orgId!);
    if (!existing) {
      throw new AppError('Site not found', 404, 'SITE_NOT_FOUND');
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
      `UPDATE client_sites SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async deleteSite(id: string, orgId: string): Promise<void> {
    await pool.query(
      'UPDATE client_sites SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND org_id = $2',
      [id, orgId]
    );
  }
}

export const clientService = new ClientService();
