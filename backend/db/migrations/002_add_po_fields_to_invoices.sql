-- Migration: Add PO References to Existing Tables
-- Description: Adds purchase order references to invoices, invoice line items, and tickets
-- Date: 2026-02-05

-- Add PO reference to vendor invoices
ALTER TABLE invoices ADD COLUMN po_id UUID REFERENCES purchase_orders(id);
CREATE INDEX idx_invoices_po_id ON invoices(po_id);

-- Add PO line item reference and match status to vendor invoice line items
ALTER TABLE invoice_line_items ADD COLUMN po_line_item_id UUID REFERENCES po_line_items(id);
ALTER TABLE invoice_line_items ADD COLUMN match_status VARCHAR(50) DEFAULT 'unmatched';
CREATE INDEX idx_invoice_line_items_po_line_item_id ON invoice_line_items(po_line_item_id);
CREATE INDEX idx_invoice_line_items_match_status ON invoice_line_items(match_status);

-- Add PO number field to tickets for easy reference
ALTER TABLE tickets ADD COLUMN po_number VARCHAR(100);
