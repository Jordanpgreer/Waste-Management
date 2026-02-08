import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import {
  Ticket,
  CreateTicketInput,
  UpdateTicketInput,
  TicketFilters,
  ClassificationResult,
  TicketType,
  TicketPriority,
  TicketMessageStatusTag,
  TicketMessageRecipientType,
} from '../types/ticket.types';

export class TicketService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  private normalizeMetadata(metadata: any): Record<string, any> {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch {
        return {};
      }
    }
    return metadata;
  }

  /**
   * Auto-classify ticket based on subject and description
   * This is a simple rule-based classifier - can be enhanced with ML later
   */
  async autoClassifyTicket(subject: string, description: string = ''): Promise<ClassificationResult> {
    const text = `${subject} ${description}`.toLowerCase();

    // Priority detection
    let priority: TicketPriority = 'medium';
    if (text.match(/urgent|emergency|asap|immediate|critical/i)) {
      priority = 'urgent';
    } else if (text.match(/high priority|important|soon/i)) {
      priority = 'high';
    } else if (text.match(/low priority|when possible|no rush/i)) {
      priority = 'low';
    }

    // Ticket type detection with confidence scoring
    const typePatterns: Record<TicketType, RegExp[]> = {
      missed_pickup: [/missed.*pickup/, /no.*pickup/, /not.*picked up/, /didn't.*collect/],
      extra_pickup: [/extra.*pickup/, /additional.*pickup/, /need.*another/],
      new_service: [/new.*service/, /start.*service/, /setup/, /begin/],
      modify_service: [/modify/, /change.*service/, /update.*schedule/, /different.*day/],
      container_delivery: [/deliver/, /new.*container/, /need.*bin/, /need.*dumpster/],
      container_swap: [/swap/, /exchange/, /replace.*container/, /different.*size/],
      contamination: [/contamination/, /contaminated/, /wrong.*waste/, /improper/],
      lock_key_issue: [/lock/, /key/, /locked out/, /can't.*access.*lock/],
      access_issue: [/access/, /gate/, /entry/, /blocked/, /can't.*get.*in/],
      billing_dispute: [/billing/, /invoice/, /charge/, /overcharge/, /dispute.*fee/],
      site_cleanup: [/cleanup/, /clean up/, /mess/, /spill/, /debris/],
      compactor_maintenance: [/compactor/, /broken/, /repair/, /maintenance/, /not.*working/],
      other: [],
    };

    let matchedType: TicketType = 'other';
    let maxMatches = 0;
    let confidence = 0.5; // Default confidence

    for (const [type, patterns] of Object.entries(typePatterns) as [TicketType, RegExp[]][]) {
      if (type === 'other') continue;

      const matches = patterns.filter(pattern => pattern.test(text)).length;
      if (matches > maxMatches) {
        matchedType = type;
        maxMatches = matches;
        confidence = Math.min(0.95, 0.6 + (matches * 0.15)); // Higher confidence with more matches
      }
    }

    // Estimate SLA hours based on type and priority
    const slaHours = this.calculateSLA(matchedType, priority);

    return {
      ticket_type: matchedType,
      priority,
      confidence,
      estimated_sla_hours: slaHours,
    };
  }

  /**
   * Calculate SLA hours based on ticket type and priority
   */
  private calculateSLA(ticketType: TicketType, priority: TicketPriority): number {
    const baseSLA: Record<TicketType, number> = {
      missed_pickup: 24,
      extra_pickup: 48,
      new_service: 72,
      modify_service: 48,
      container_delivery: 48,
      container_swap: 48,
      contamination: 24,
      lock_key_issue: 24,
      access_issue: 24,
      billing_dispute: 72,
      site_cleanup: 48,
      compactor_maintenance: 48,
      other: 72,
    };

    const priorityMultiplier: Record<TicketPriority, number> = {
      urgent: 0.25, // 4x faster
      high: 0.5,    // 2x faster
      medium: 1.0,  // Normal
      low: 2.0,     // 2x slower
    };

    return baseSLA[ticketType] * priorityMultiplier[priority];
  }

  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(orgId: string): Promise<string> {
    void orgId;
    const startingNumber = 120;
    const result = await this.db.query(
      `SELECT COALESCE(MAX(ticket_number::BIGINT), $1 - 1) AS max_ticket_number
       FROM tickets
       WHERE ticket_number ~ '^[0-9]+$'`,
      [startingNumber]
    );

    const maxTicketNumber = Number(result.rows[0]?.max_ticket_number || startingNumber - 1);
    return String(maxTicketNumber + 1);
  }

  /**
   * Create a new ticket with auto-classification
   */
  async createTicket(orgId: string, input: CreateTicketInput, enforceClientDefaults: boolean = false): Promise<Ticket> {
    if (input.site_id) {
      const siteValidation = await this.db.query(
        `SELECT id
         FROM client_sites
         WHERE id = $1 AND org_id = $2 AND client_id = $3 AND deleted_at IS NULL`,
        [input.site_id, orgId, input.client_id]
      );

      if (siteValidation.rows.length === 0) {
        throw new Error('Selected site is not valid for this client');
      }
    }

    // Auto-classify if type is not provided or is 'other'
    const shouldClassify = !input.ticket_type || input.ticket_type === 'other';
    let ticketType = input.ticket_type || 'other';
    let priority = input.priority || 'medium';
    let slaHours = 72;

    if (shouldClassify) {
      const classification = await this.autoClassifyTicket(input.subject, input.description || '');
      ticketType = classification.ticket_type;
      priority = enforceClientDefaults ? 'medium' : classification.priority;
      slaHours = classification.estimated_sla_hours || 72;
    } else {
      priority = enforceClientDefaults ? 'medium' : (input.priority || 'medium');
      slaHours = this.calculateSLA(ticketType, priority);
    }

    const ticketNumber = await this.generateTicketNumber(orgId);
    const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const result = await this.db.query(
      `INSERT INTO tickets (
        org_id, ticket_number, client_id, site_id, asset_id, ticket_type,
        priority, subject, description, reporter_id, sla_due_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        orgId,
        ticketNumber,
        input.client_id,
        input.site_id || null,
        input.asset_id || null,
        ticketType,
        priority,
        input.subject,
        input.description || null,
        input.reporter_id || null,
        slaDueAt,
        JSON.stringify({ auto_classified: shouldClassify }),
      ]
    );

    // Auto-assign to vendor if rules exist (placeholder for now)
    // Wrapped in try-catch to prevent ticket creation failure if auto-assignment fails
    try {
      await this.autoAssignVendor(result.rows[0].id, orgId);
    } catch (error) {
      console.error('Auto-assignment failed, continuing with ticket creation:', error);
    }

    // Create auto-acknowledgement message
    try {
      await this.createAutoAcknowledgement(result.rows[0].id, orgId, ticketNumber);
    } catch (error) {
      console.error('Auto-acknowledgement creation failed:', error);
    }

    return result.rows[0];
  }

  async getDefaultSiteForClient(orgId: string, clientId: string): Promise<string | null> {
    const result = await this.db.query(
      `SELECT id
       FROM client_sites
       WHERE org_id = $1
         AND client_id = $2
         AND is_active = true
         AND deleted_at IS NULL
       ORDER BY created_at ASC
       LIMIT 1`,
      [orgId, clientId]
    );

    return result.rows[0]?.id || null;
  }

  async addTicketAttachment(
    orgId: string,
    ticketId: string,
    file: Express.Multer.File,
    uploadedBy: string | null
  ): Promise<any> {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const storedFilename = `${timestamp}-${safeName}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'tickets', orgId, ticketId);
    const fullPath = path.join(uploadDir, storedFilename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

    const result = await this.db.query(
      `INSERT INTO ticket_attachments (org_id, ticket_id, file_name, file_path, file_size, file_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [orgId, ticketId, file.originalname, relativePath, file.size, file.mimetype, uploadedBy]
    );

    return result.rows[0];
  }

  async storeTicketMessageSourceFile(
    orgId: string,
    ticketId: string,
    file: Express.Multer.File
  ): Promise<{
    source_file_name: string;
    source_file_path: string;
    source_file_size: number;
    source_file_type: string;
  }> {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const storedFilename = `${timestamp}-${safeName}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'ticket-messages', orgId, ticketId);
    const fullPath = path.join(uploadDir, storedFilename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

    return {
      source_file_name: file.originalname,
      source_file_path: relativePath,
      source_file_size: file.size,
      source_file_type: file.mimetype || 'application/octet-stream',
    };
  }

  async requestTicketCancellation(
    ticketId: string,
    orgId: string,
    requestedBy: string,
    reason: string
  ): Promise<Ticket> {
    const existing = await this.getTicket(ticketId, orgId);
    if (!existing) {
      throw new Error('Ticket not found');
    }

    if (existing.status === 'cancelled') {
      throw new Error('Ticket is already cancelled');
    }

    const metadata = this.normalizeMetadata(existing.metadata);
    if (metadata?.cancellation_request?.status === 'pending') {
      throw new Error('A cancellation request is already pending');
    }

    metadata.cancellation_request = {
      status: 'pending',
      reason,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
      prior_status: existing.status,
    };

    const updated = await this.db.query(
      `UPDATE tickets
       SET metadata = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND org_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [JSON.stringify(metadata), ticketId, orgId]
    );

    await this.addTicketMessage(
      ticketId,
      orgId,
      requestedBy,
      `Cancellation requested by client.\nReason: ${reason}`,
      false
    );

    return updated.rows[0];
  }

  async approveTicketCancellation(
    ticketId: string,
    orgId: string,
    approvedBy: string
  ): Promise<Ticket> {
    const existing = await this.getTicket(ticketId, orgId);
    if (!existing) {
      throw new Error('Ticket not found');
    }

    const metadata = this.normalizeMetadata(existing.metadata);
    if (metadata?.cancellation_request?.status !== 'pending') {
      throw new Error('No pending cancellation request found');
    }

    metadata.cancellation_request = {
      ...metadata.cancellation_request,
      status: 'approved',
      decision_by: approvedBy,
      decision_at: new Date().toISOString(),
    };

    const updated = await this.db.query(
      `UPDATE tickets
       SET status = 'cancelled',
           closed_at = CURRENT_TIMESTAMP,
           metadata = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND org_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [JSON.stringify(metadata), ticketId, orgId]
    );

    await this.addTicketMessage(
      ticketId,
      orgId,
      approvedBy,
      'Cancellation request approved. Ticket is now cancelled.',
      false
    );

    return updated.rows[0];
  }

  async rejectTicketCancellation(
    ticketId: string,
    orgId: string,
    rejectedBy: string,
    reason: string
  ): Promise<Ticket> {
    const existing = await this.getTicket(ticketId, orgId);
    if (!existing) {
      throw new Error('Ticket not found');
    }

    const metadata = this.normalizeMetadata(existing.metadata);
    if (metadata?.cancellation_request?.status !== 'pending') {
      throw new Error('No pending cancellation request found');
    }

    metadata.cancellation_request = {
      ...metadata.cancellation_request,
      status: 'rejected',
      decision_by: rejectedBy,
      decision_at: new Date().toISOString(),
      decision_reason: reason,
    };

    const updated = await this.db.query(
      `UPDATE tickets
       SET metadata = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND org_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [JSON.stringify(metadata), ticketId, orgId]
    );

    await this.addTicketMessage(
      ticketId,
      orgId,
      rejectedBy,
      `Cancellation request was not approved.\nReason: ${reason}`,
      false
    );

    return updated.rows[0];
  }

  async getTicketAttachments(ticketId: string, orgId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT * FROM ticket_attachments
       WHERE ticket_id = $1 AND org_id = $2
       ORDER BY created_at DESC`,
      [ticketId, orgId]
    );
    return result.rows;
  }

  /**
   * Auto-assign vendor based on rules (simplified version)
   */
  private async autoAssignVendor(_ticketId: string, _orgId: string): Promise<void> {
    // This would query vendor assignment rules based on ticket type, site location, etc.
    // For now, we'll leave it unassigned - can be enhanced later
    // Implementation would check vendors table for:
    // - Service area coverage (ZIP codes)
    // - Service capabilities (ticket types they handle)
    // - Performance ratings
    // - Current workload
  }

  /**
   * Create auto-acknowledgement message
   */
  private async createAutoAcknowledgement(ticketId: string, orgId: string, ticketNumber: string): Promise<void> {
    const message = `Thank you for submitting your request. Your Request #${ticketNumber} has been received and is being processed. We'll update you on the progress shortly.`;

    await this.db.query(
      `INSERT INTO ticket_messages (org_id, ticket_id, message, is_internal, is_auto_generated)
       VALUES ($1, $2, $3, $4, $5)`,
      [orgId, ticketId, message, false, true]
    );
  }

  /**
   * List tickets with filtering
   */
  async listTickets(
    orgId: string,
    filters: TicketFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: Ticket[]; total: number; total_pages: number }> {
    const offset = (page - 1) * limit;

    let whereConditions = ['t.org_id = $1', 't.deleted_at IS NULL'];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (filters.client_id) {
      whereConditions.push(`t.client_id = $${paramIndex++}`);
      params.push(filters.client_id);
    }

    if (filters.site_id) {
      whereConditions.push(`t.site_id = $${paramIndex++}`);
      params.push(filters.site_id);
    }

    if (filters.ticket_type) {
      whereConditions.push(`t.ticket_type = $${paramIndex++}`);
      params.push(filters.ticket_type);
    }

    if (filters.status) {
      whereConditions.push(`t.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.status_bucket) {
      if (filters.status_bucket === 'open') {
        whereConditions.push(`t.status NOT IN ('completed', 'cancelled')`);
      } else if (filters.status_bucket === 'completed') {
        whereConditions.push(`t.status = 'completed'`);
      } else if (filters.status_bucket === 'cancelled') {
        whereConditions.push(`t.status = 'cancelled'`);
      }
    }

    if (filters.priority) {
      whereConditions.push(`t.priority = $${paramIndex++}`);
      params.push(filters.priority);
    }

    if (filters.assignee_id) {
      whereConditions.push(`t.assignee_id = $${paramIndex++}`);
      params.push(filters.assignee_id);
    }

    if (filters.vendor_id) {
      whereConditions.push(`t.vendor_id = $${paramIndex++}`);
      params.push(filters.vendor_id);
    }

    if (filters.is_escalated !== undefined) {
      whereConditions.push(`t.is_escalated = $${paramIndex++}`);
      params.push(filters.is_escalated);
    }

    if (filters.cancellation_status) {
      whereConditions.push(`t.metadata->'cancellation_request'->>'status' = $${paramIndex++}`);
      params.push(filters.cancellation_status);
    }

    if (filters.search) {
      whereConditions.push(
        `(t.subject ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex} OR t.ticket_number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR cs.name ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    const sortBy = filters.sort_by || 'newest';
    const orderByClause =
      sortBy === 'oldest'
        ? 't.created_at ASC'
        : sortBy === 'last_touched_oldest'
          ? `COALESCE(
               (SELECT MAX(tm.created_at) FROM ticket_messages tm WHERE tm.ticket_id = t.id AND tm.org_id = t.org_id),
               t.updated_at,
               t.created_at
             ) ASC`
        : sortBy === 'last_touched'
          ? `COALESCE(
               (SELECT MAX(tm.created_at) FROM ticket_messages tm WHERE tm.ticket_id = t.id AND tm.org_id = t.org_id),
               t.updated_at,
               t.created_at
             ) DESC`
          : 't.created_at DESC';

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM tickets t
       LEFT JOIN clients c ON c.id = t.client_id
       LEFT JOIN client_sites cs ON cs.id = t.site_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const result = await this.db.query(
      `SELECT t.* FROM tickets t
       LEFT JOIN clients c ON c.id = t.client_id
       LEFT JOIN client_sites cs ON cs.id = t.site_id
       WHERE ${whereClause}
       ORDER BY ${orderByClause}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      items: result.rows,
      total,
      total_pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: string, orgId: string): Promise<Ticket | null> {
    const result = await this.db.query(
      'SELECT * FROM tickets WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [ticketId, orgId]
    );

    return result.rows[0] || null;
  }

  /**
   * Update ticket
   */
  async updateTicket(ticketId: string, orgId: string, input: UpdateTicketInput): Promise<Ticket> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.ticket_type) {
      updates.push(`ticket_type = $${paramIndex++}`);
      params.push(input.ticket_type);
    }

    if (input.status) {
      updates.push(`status = $${paramIndex++}`);
      params.push(input.status);

      // Auto-set completion timestamps based on status
      if (input.status === 'completed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
        updates.push(`closed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (input.priority) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(input.priority);
    }

    if (input.subject) {
      updates.push(`subject = $${paramIndex++}`);
      params.push(input.subject);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(input.description);
    }

    if (input.assignee_id !== undefined) {
      updates.push(`assignee_id = $${paramIndex++}`);
      params.push(input.assignee_id);
    }

    if (input.vendor_id !== undefined) {
      updates.push(`vendor_id = $${paramIndex++}`);
      params.push(input.vendor_id);

      if (input.vendor_id && !input.status) {
        updates.push(`status = 'vendor_rates'`);
      }
    }

    if (input.scheduled_at) {
      updates.push(`scheduled_at = $${paramIndex++}`);
      params.push(input.scheduled_at);

      if (!input.status) {
        updates.push(`status = 'eta_received_from_vendor'`);
      }
    }

    if (input.resolution_notes) {
      updates.push(`resolution_notes = $${paramIndex++}`);
      params.push(input.resolution_notes);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    params.push(ticketId, orgId);
    const result = await this.db.query(
      `UPDATE tickets SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND org_id = $${paramIndex++} AND deleted_at IS NULL
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  /**
   * Delete ticket (soft delete)
   */
  async deleteTicket(ticketId: string, orgId: string): Promise<void> {
    await this.db.query(
      'UPDATE tickets SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND org_id = $2',
      [ticketId, orgId]
    );
  }

  /**
   * Get ticket messages
   */
  async getTicketMessages(ticketId: string, orgId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT
         tm.*,
         u.first_name,
         u.last_name,
         CASE
           WHEN ROW_NUMBER() OVER (ORDER BY tm.created_at ASC, tm.id ASC) = 1 THEN true
           ELSE false
         END AS is_origin_message
       FROM ticket_messages tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.ticket_id = $1 AND tm.org_id = $2
       ORDER BY tm.created_at ASC`,
      [ticketId, orgId]
    );

    return result.rows;
  }

  /**
   * Add message to ticket
   */
  async addTicketMessage(
    ticketId: string,
    orgId: string,
    userId: string | null,
    message: string,
    isInternal: boolean = false,
    statusTag?: TicketMessageStatusTag | null,
    metadata?: {
      recipient_type?: TicketMessageRecipientType | null;
      recipient_email?: string | null;
      email_from?: string | null;
      email_to?: string | null;
      email_subject?: string | null;
      source_file_name?: string | null;
      source_file_path?: string | null;
      source_file_size?: number | null;
      source_file_type?: string | null;
    }
  ): Promise<any> {
    const result = await this.db.query(
      `INSERT INTO ticket_messages (
         org_id,
         ticket_id,
         user_id,
         message,
         status_tag,
         recipient_type,
         recipient_email,
         email_from,
         email_to,
         email_subject,
         source_file_name,
         source_file_path,
         source_file_size,
         source_file_type,
         is_internal
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        orgId,
        ticketId,
        userId,
        message,
        statusTag || null,
        metadata?.recipient_type || 'client',
        metadata?.recipient_email || null,
        metadata?.email_from || null,
        metadata?.email_to || null,
        metadata?.email_subject || null,
        metadata?.source_file_name || null,
        metadata?.source_file_path || null,
        metadata?.source_file_size || null,
        metadata?.source_file_type || null,
        isInternal,
      ]
    );

    return result.rows[0];
  }

  async updateTicketMessageStatus(
    messageId: string,
    ticketId: string,
    orgId: string,
    statusTag: TicketMessageStatusTag | null
  ): Promise<any | null> {
    const result = await this.db.query(
      `UPDATE ticket_messages
       SET status_tag = $1
       WHERE id = $2 AND ticket_id = $3 AND org_id = $4
       RETURNING *`,
      [statusTag, messageId, ticketId, orgId]
    );

    return result.rows[0] || null;
  }

  async deleteTicketMessage(messageId: string, ticketId: string, orgId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM ticket_messages
       WHERE id = $1 AND ticket_id = $2 AND org_id = $3`,
      [messageId, ticketId, orgId]
    );

    return (result.rowCount || 0) > 0;
  }

  /**
   * Check and escalate overdue tickets
   */
  async checkAndEscalateOverdueTickets(orgId: string): Promise<number> {
    const result = await this.db.query(
      `UPDATE tickets
       SET is_escalated = true, escalated_at = CURRENT_TIMESTAMP
       WHERE org_id = $1
         AND status NOT IN ('completed', 'cancelled')
         AND sla_due_at < CURRENT_TIMESTAMP
         AND is_escalated = false
       RETURNING id`,
      [orgId]
    );

    return result.rowCount || 0;
  }
}
