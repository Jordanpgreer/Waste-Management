-- Migration: Create Purchase Orders and Related Tables
-- Description: Adds tables for PO management, client invoicing, and invoice matching
-- Date: 2026-02-05

-- Purchase Orders table
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_number VARCHAR(100) NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  site_id UUID REFERENCES client_sites(id),
  po_date DATE NOT NULL,
  expected_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'draft',
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2),
  total DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  terms TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(org_id, po_number)
);

CREATE INDEX idx_purchase_orders_org_id ON purchase_orders(org_id);
CREATE INDEX idx_purchase_orders_client_id ON purchase_orders(client_id);
CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- PO Line Items table
CREATE TABLE po_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  service_type service_type,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(po_id, line_number)
);

CREATE INDEX idx_po_line_items_org_id ON po_line_items(org_id);
CREATE INDEX idx_po_line_items_po_id ON po_line_items(po_id);
CREATE INDEX idx_po_line_items_description ON po_line_items USING gin(to_tsvector('english', description));

-- Ticket-PO Junction table (many-to-many)
CREATE TABLE ticket_purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ticket_id, po_id)
);

CREATE INDEX idx_ticket_purchase_orders_ticket_id ON ticket_purchase_orders(ticket_id);
CREATE INDEX idx_ticket_purchase_orders_po_id ON ticket_purchase_orders(po_id);

-- Client Invoices table (separate from vendor invoices)
CREATE TABLE client_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  invoice_date DATE NOT NULL,
  due_date DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2),
  total DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'draft',
  payment_date DATE,
  notes TEXT,
  generated_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(org_id, invoice_number)
);

CREATE INDEX idx_client_invoices_org_id ON client_invoices(org_id);
CREATE INDEX idx_client_invoices_client_id ON client_invoices(client_id);
CREATE INDEX idx_client_invoices_status ON client_invoices(status);
CREATE INDEX idx_client_invoices_period ON client_invoices(period_start, period_end);

-- Client Invoice Line Items table
CREATE TABLE client_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_invoice_id UUID NOT NULL REFERENCES client_invoices(id) ON DELETE CASCADE,
  vendor_invoice_id UUID REFERENCES invoices(id),
  vendor_line_item_id UUID REFERENCES invoice_line_items(id),
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  service_type service_type,
  service_date DATE,
  quantity DECIMAL(10, 2),
  cost_basis DECIMAL(12, 2) NOT NULL,
  markup_percentage DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_invoice_id, line_number)
);

CREATE INDEX idx_client_invoice_line_items_org_id ON client_invoice_line_items(org_id);
CREATE INDEX idx_client_invoice_line_items_client_invoice_id ON client_invoice_line_items(client_invoice_id);
CREATE INDEX idx_client_invoice_line_items_vendor_invoice_id ON client_invoice_line_items(vendor_invoice_id);

-- Invoice Matching Records table
CREATE TABLE invoice_matching_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  vendor_line_item_id UUID NOT NULL REFERENCES invoice_line_items(id) ON DELETE CASCADE,
  po_id UUID REFERENCES purchase_orders(id),
  po_line_item_id UUID REFERENCES po_line_items(id),
  match_type VARCHAR(50) NOT NULL,
  similarity_score DECIMAL(5, 2),
  price_difference_percentage DECIMAL(5, 2),
  match_status VARCHAR(50) DEFAULT 'pending',
  matched_by UUID REFERENCES users(id),
  matched_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_matching_records_vendor_invoice_id ON invoice_matching_records(vendor_invoice_id);
CREATE INDEX idx_invoice_matching_records_vendor_line_item_id ON invoice_matching_records(vendor_line_item_id);
CREATE INDEX idx_invoice_matching_records_po_line_item_id ON invoice_matching_records(po_line_item_id);

-- Invoice Settings table (org-level configuration)
CREATE TABLE invoice_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  default_markup_percentage DECIMAL(5, 2) DEFAULT 15.00,
  fuzzy_match_threshold DECIMAL(5, 2) DEFAULT 85.00,
  price_tolerance_percentage DECIMAL(5, 2) DEFAULT 5.00,
  auto_approve_exact_matches BOOLEAN DEFAULT false,
  require_po_for_invoices BOOLEAN DEFAULT false,
  client_invoice_prefix VARCHAR(20) DEFAULT 'INV',
  po_prefix VARCHAR(20) DEFAULT 'PO',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
