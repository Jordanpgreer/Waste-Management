// Ticket Types
export type TicketType =
  | 'missed_pickup'
  | 'extra_pickup'
  | 'new_service'
  | 'modify_service'
  | 'container_delivery'
  | 'container_swap'
  | 'contamination'
  | 'lock_key_issue'
  | 'access_issue'
  | 'billing_dispute'
  | 'site_cleanup'
  | 'compactor_maintenance'
  | 'other';

export type TicketStatus =
  | 'new'
  | 'triaged'
  | 'vendor_assigned'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'verified'
  | 'closed'
  | 'cancelled';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  org_id: string;
  ticket_number: string;
  client_id: string;
  site_id: string | null;
  asset_id: string | null;
  ticket_type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  subject: string;
  description: string | null;
  reporter_id: string | null;
  assignee_id: string | null;
  vendor_id: string | null;
  sla_due_at: Date | null;
  scheduled_at: Date | null;
  completed_at: Date | null;
  verified_at: Date | null;
  closed_at: Date | null;
  resolution_notes: string | null;
  is_escalated: boolean;
  escalated_at: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TicketMessage {
  id: string;
  org_id: string;
  ticket_id: string;
  user_id: string | null;
  message: string;
  is_internal: boolean;
  is_auto_generated: boolean;
  created_at: Date;
}

export interface TicketAttachment {
  id: string;
  org_id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: Date;
}

export interface CreateTicketInput {
  client_id: string;
  site_id?: string;
  asset_id?: string;
  ticket_type: TicketType;
  priority?: TicketPriority;
  subject: string;
  description?: string;
  reporter_id?: string;
}

export interface UpdateTicketInput {
  ticket_type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  subject?: string;
  description?: string;
  assignee_id?: string;
  vendor_id?: string;
  scheduled_at?: Date;
  resolution_notes?: string;
}

export interface TicketFilters {
  client_id?: string;
  site_id?: string;
  ticket_type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignee_id?: string;
  vendor_id?: string;
  is_escalated?: boolean;
  search?: string;
}

// Auto-classification types
export interface ClassificationResult {
  ticket_type: TicketType;
  priority: TicketPriority;
  confidence: number;
  suggested_vendor_id?: string;
  estimated_sla_hours?: number;
}

export interface AutoAssignmentRule {
  ticket_type: TicketType;
  site_zip_code?: string;
  default_vendor_id?: string;
  sla_hours: number;
}
