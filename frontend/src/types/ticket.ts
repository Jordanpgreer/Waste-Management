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
  | 'untouched'
  | 'client_approval'
  | 'vendor_rates'
  | 'quoted_to_client'
  | 'response_from_vendor'
  | 'response_from_client'
  | 'completed'
  | 'eta_received_from_vendor'
  | 'eta_provided_to_client'
  | 'waiting_on_client_info'
  | 'waiting_on_vendor_info'
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
  untouched: 'Untouched',
  client_approval: 'Client Approval',
  vendor_rates: 'Vendor Rates',
  quoted_to_client: 'Quoted to Client',
  response_from_vendor: 'Response from Vendor',
  response_from_client: 'Response from Client',
  completed: 'Completed',
  eta_received_from_vendor: 'ETA Received from Vendor',
  eta_provided_to_client: 'ETA Provided to Client',
  waiting_on_client_info: 'Waiting on Client Info',
  waiting_on_vendor_info: 'Waiting on Vendor Info',
  cancelled: 'Cancelled',
};

export const TICKET_STATUS_OPTIONS: TicketStatus[] = [
  'untouched',
  'client_approval',
  'vendor_rates',
  'quoted_to_client',
  'response_from_vendor',
  'response_from_client',
  'completed',
  'eta_received_from_vendor',
  'eta_provided_to_client',
  'waiting_on_client_info',
  'waiting_on_vendor_info',
];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};
