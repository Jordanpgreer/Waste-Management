import { Pool } from 'pg';

export interface AutomationWorkflowStep {
  id: string;
  action_type: 'email_vendor' | 'email_client' | 'update_status' | 'internal_note' | 'wait';
  title: string;
  config: Record<string, any>;
}

export interface CreateAutomationWorkflowInput {
  name: string;
  description?: string;
  ticket_type: string;
  trigger_event: 'ticket_created';
  is_active?: boolean;
  steps: AutomationWorkflowStep[];
}

export interface UpdateAutomationWorkflowInput {
  name?: string;
  description?: string;
  ticket_type?: string;
  trigger_event?: 'ticket_created';
  is_active?: boolean;
  steps?: AutomationWorkflowStep[];
}

export interface AutomationWorkflowRecord {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  ticket_type: string;
  trigger_event: 'ticket_created';
  is_active: boolean;
  steps: AutomationWorkflowStep[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export class AutomationWorkflowService {
  constructor(private readonly pool: Pool) {}

  async listWorkflows(orgId: string, ticketType?: string): Promise<AutomationWorkflowRecord[]> {
    const params: any[] = [orgId];
    let where = 'org_id = $1 AND deleted_at IS NULL';

    if (ticketType) {
      params.push(ticketType);
      where += ` AND ticket_type = $${params.length}`;
    }

    const result = await this.pool.query<AutomationWorkflowRecord>(
      `SELECT
         id,
         org_id,
         name,
         description,
         ticket_type,
         trigger_event,
         is_active,
         steps,
         created_by,
         updated_by,
         created_at,
         updated_at
       FROM automation_workflows
       WHERE ${where}
       ORDER BY ticket_type ASC, name ASC, created_at ASC`,
      params
    );

    return result.rows;
  }

  async createWorkflow(
    orgId: string,
    userId: string,
    input: CreateAutomationWorkflowInput
  ): Promise<AutomationWorkflowRecord> {
    const result = await this.pool.query<AutomationWorkflowRecord>(
      `INSERT INTO automation_workflows (
         org_id,
         name,
         description,
         ticket_type,
         trigger_event,
         is_active,
         steps,
         created_by,
         updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING
         id,
         org_id,
         name,
         description,
         ticket_type,
         trigger_event,
         is_active,
         steps,
         created_by,
         updated_by,
         created_at,
         updated_at`,
      [
        orgId,
        input.name.trim(),
        input.description?.trim() || null,
        input.ticket_type,
        input.trigger_event,
        input.is_active ?? true,
        JSON.stringify(input.steps || []),
        userId,
        userId,
      ]
    );

    return result.rows[0]!;
  }

  async updateWorkflow(
    orgId: string,
    workflowId: string,
    userId: string,
    input: UpdateAutomationWorkflowInput
  ): Promise<AutomationWorkflowRecord | null> {
    const updates: string[] = [];
    const params: any[] = [orgId, workflowId];
    let idx = 3;

    if (typeof input.name === 'string') {
      updates.push(`name = $${idx++}`);
      params.push(input.name.trim());
    }
    if (typeof input.description === 'string') {
      updates.push(`description = $${idx++}`);
      params.push(input.description.trim() || null);
    }
    if (typeof input.ticket_type === 'string') {
      updates.push(`ticket_type = $${idx++}`);
      params.push(input.ticket_type);
    }
    if (typeof input.trigger_event === 'string') {
      updates.push(`trigger_event = $${idx++}`);
      params.push(input.trigger_event);
    }
    if (typeof input.is_active === 'boolean') {
      updates.push(`is_active = $${idx++}`);
      params.push(input.is_active);
    }
    if (input.steps) {
      updates.push(`steps = $${idx++}`);
      params.push(JSON.stringify(input.steps));
    }

    if (updates.length === 0) {
      const unchanged = await this.getWorkflowById(orgId, workflowId);
      return unchanged;
    }

    updates.push(`updated_by = $${idx++}`);
    params.push(userId);
    updates.push('updated_at = CURRENT_TIMESTAMP');

    const result = await this.pool.query<AutomationWorkflowRecord>(
      `UPDATE automation_workflows
       SET ${updates.join(', ')}
       WHERE org_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING
         id,
         org_id,
         name,
         description,
         ticket_type,
         trigger_event,
         is_active,
         steps,
         created_by,
         updated_by,
         created_at,
         updated_at`,
      params
    );

    return result.rows[0] || null;
  }

  async deleteWorkflow(orgId: string, workflowId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE automation_workflows
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE org_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [orgId, workflowId]
    );

    return (result.rowCount || 0) > 0;
  }

  async getWorkflowById(orgId: string, workflowId: string): Promise<AutomationWorkflowRecord | null> {
    const result = await this.pool.query<AutomationWorkflowRecord>(
      `SELECT
         id,
         org_id,
         name,
         description,
         ticket_type,
         trigger_event,
         is_active,
         steps,
         created_by,
         updated_by,
         created_at,
         updated_at
       FROM automation_workflows
       WHERE org_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [orgId, workflowId]
    );

    return result.rows[0] || null;
  }
}
