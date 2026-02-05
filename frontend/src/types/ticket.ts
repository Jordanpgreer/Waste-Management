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
  sla_due_at: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  verified_at: string | null;
  closed_at: string | null;
  resolution_notes: string | null;
  is_escalated: boolean;
  escalated_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  missed_pickup: 'Missed Pickup',
  extra_pickup: 'Extra Pickup',
  new_service: 'New Service',
  modify_service: 'Modify Service',
  container_delivery: 'Container Delivery',
  container_swap: 'Container Swap',
  contamination: 'Contamination',
  lock_key_issue: 'Lock/Key Issue',
  access_issue: 'Access Issue',
  billing_dispute: 'Billing Dispute',
  site_cleanup: 'Site Cleanup',
  compactor_maintenance: 'Compactor Maintenance',
  other: 'Other',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  triaged: 'Triaged',
  vendor_assigned: 'Vendor Assigned',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  verified: 'Verified',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};
