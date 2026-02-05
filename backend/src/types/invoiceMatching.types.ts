export interface InvoiceMatchingRecord {
  id: string;
  org_id: string;
  vendor_invoice_id: string;
  vendor_line_item_id: string;
  po_id?: string;
  po_line_item_id?: string;
  match_type: 'exact' | 'fuzzy' | 'manual' | 'unmatched';
  similarity_score?: number;
  price_difference_percentage?: number;
  match_status: 'pending' | 'approved' | 'rejected';
  matched_by?: string;
  matched_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MatchResult {
  vendor_line_item_id: string;
  po_line_item_id?: string;
  match_type: 'exact' | 'fuzzy' | 'unmatched';
  similarity_score: number;
  price_difference: number;
  price_difference_percentage: number;
  recommended_action: 'auto_approve' | 'review' | 'flag_discrepancy';
}

export interface AutoMatchInput {
  vendor_invoice_id: string;
  po_id?: string;
}

export interface InvoiceSettings {
  id: string;
  org_id: string;
  default_markup_percentage: number;
  fuzzy_match_threshold: number;
  price_tolerance_percentage: number;
  auto_approve_exact_matches: boolean;
  require_po_for_invoices: boolean;
  client_invoice_prefix: string;
  po_prefix: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateInvoiceSettingsInput {
  orgId: string;
  default_markup_percentage?: number;
  fuzzy_match_threshold?: number;
  price_tolerance_percentage?: number;
  auto_approve_exact_matches?: boolean;
  require_po_for_invoices?: boolean;
  client_invoice_prefix?: string;
  po_prefix?: string;
}
