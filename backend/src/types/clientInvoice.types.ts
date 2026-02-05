export interface ClientInvoice {
  id: string;
  org_id: string;
  invoice_number: string;
  client_id: string;
  invoice_date: string;
  due_date?: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_date?: string;
  notes?: string;
  generated_by: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ClientInvoiceLineItem {
  id: string;
  org_id: string;
  client_invoice_id: string;
  vendor_invoice_id?: string;
  vendor_line_item_id?: string;
  line_number: number;
  description: string;
  service_type?: string;
  service_date?: string;
  quantity?: number;
  cost_basis: number;
  markup_percentage: number;
  unit_price: number;
  amount: number;
  notes?: string;
  created_at: string;
}

export interface GenerateClientInvoiceInput {
  client_id: string;
  period_start: string;
  period_end: string;
  markup_percentage?: number;
  notes?: string;
}

export interface UpdateClientInvoiceInput {
  id: string;
  orgId: string;
  notes?: string;
  due_date?: string;
}

export interface ClientInvoiceWithLineItems extends ClientInvoice {
  line_items: ClientInvoiceLineItem[];
}
