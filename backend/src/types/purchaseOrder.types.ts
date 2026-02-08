export interface PurchaseOrder {
  id: string;
  org_id: string;
  po_number: string;
  client_id: string;
  vendor_id: string;
  site_id: string;
  service_scope: 'non_recurring' | 'recurring';
  po_date: string;
  expected_delivery_date?: string;
  status: 'draft' | 'sent' | 'approved' | 'completed' | 'cancelled';
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;
  terms?: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface POLineItem {
  id: string;
  org_id: string;
  po_id: string;
  line_number: number;
  description: string;
  service_type?: string;
  quantity: number;
  unit_price?: number;
  amount?: number;
  vendor_unit_price?: number | null;
  client_unit_price?: number | null;
  vendor_amount?: number | null;
  client_amount?: number | null;
  notes?: string;
  created_at: string;
}

export interface CreatePOInput {
  client_id: string;
  vendor_id: string;
  site_id: string;
  service_scope?: 'non_recurring' | 'recurring';
  po_date: string;
  expected_delivery_date?: string;
  terms?: string;
  notes?: string;
  line_items: Array<{
    description: string;
    service_type?: string;
    quantity: number;
    unit_price?: number;
    vendor_unit_price?: number | null;
    client_unit_price?: number | null;
    notes?: string;
  }>;
}

export interface UpdatePOInput extends Partial<CreatePOInput> {
  id: string;
  orgId: string;
}

export interface TicketPOLink {
  id: string;
  org_id: string;
  ticket_id: string;
  po_id: string;
  created_at: string;
}

export interface PurchaseOrderWithLineItems extends PurchaseOrder {
  line_items: POLineItem[];
}
