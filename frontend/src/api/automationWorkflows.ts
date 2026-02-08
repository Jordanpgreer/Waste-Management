import { apiClient } from './client';
import { TicketType, TicketStatus } from '../types/ticket';

export type AutomationTriggerEvent = 'ticket_created';

export type AutomationActionType =
  | 'email_vendor'
  | 'email_client'
  | 'update_status'
  | 'internal_note'
  | 'wait';

export interface AutomationWorkflowStep {
  id: string;
  action_type: AutomationActionType;
  title: string;
  config: {
    recipient_type?: 'vendor' | 'client';
    recipient_email?: string;
    subject_template?: string;
    body_template?: string;
    status?: Exclude<TicketStatus, 'cancelled'>;
    note_template?: string;
    wait_minutes?: number;
  };
}

export interface AutomationWorkflow {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  ticket_type: TicketType;
  trigger_event: AutomationTriggerEvent;
  is_active: boolean;
  steps: AutomationWorkflowStep[];
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationWorkflowInput {
  name: string;
  description?: string;
  ticket_type: TicketType;
  trigger_event: AutomationTriggerEvent;
  is_active: boolean;
  steps: AutomationWorkflowStep[];
}

export type UpdateAutomationWorkflowInput = Partial<CreateAutomationWorkflowInput>;

export const automationWorkflowsApi = {
  async list(ticketType?: TicketType): Promise<AutomationWorkflow[]> {
    const response = await apiClient.get<{ items: AutomationWorkflow[] }>('/automation-workflows', {
      ticket_type: ticketType,
    });
    return response.data?.items || [];
  },

  async create(input: CreateAutomationWorkflowInput): Promise<AutomationWorkflow> {
    const response = await apiClient.post<{ workflow: AutomationWorkflow }>('/automation-workflows', input);
    return response.data!.workflow;
  },

  async update(id: string, input: UpdateAutomationWorkflowInput): Promise<AutomationWorkflow> {
    const response = await apiClient.put<{ workflow: AutomationWorkflow }>(`/automation-workflows/${id}`, input);
    return response.data!.workflow;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/automation-workflows/${id}`);
  },
};

