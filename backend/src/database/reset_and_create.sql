-- Clean Database Reset and Schema Creation
-- This drops all existing objects and recreates them

-- Drop all tables first (in reverse dependency order)
DROP TABLE IF EXISTS automation_workflows CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS email_messages CASCADE;
DROP TABLE IF EXISTS email_threads CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS invoice_discrepancies CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS ticket_attachments CASCADE;
DROP TABLE IF EXISTS ticket_messages CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS site_assets CASCADE;
DROP TABLE IF EXISTS site_services CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS client_sites CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS service_frequency CASCADE;
DROP TYPE IF EXISTS service_type CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS ticket_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Now run the schema creation
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Waste Management Broker Operations OS - Database Schema
-- Version: 1.0.0
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ==============================================
-- ENUMS
-- ==============================================

-- User roles
CREATE TYPE user_role AS ENUM (
  'admin',
  'broker_ops_agent',
  'account_manager',
  'billing_finance',
  'vendor_manager',
  'client_user'
);

-- Ticket types
CREATE TYPE ticket_type AS ENUM (
  'missed_pickup',
  'extra_pickup',
  'new_service',
  'modify_service',
  'container_delivery',
  'container_swap',
  'contamination',
  'lock_key_issue',
  'access_issue',
  'billing_dispute',
  'site_cleanup',
  'compactor_maintenance',
  'other'
);

-- Ticket status
CREATE TYPE ticket_status AS ENUM (
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
  'cancelled'
);

-- Invoice status
CREATE TYPE invoice_status AS ENUM (
  'pending',
  'under_review',
  'approved',
  'disputed',
  'paid',
  'rejected'
);

-- Service types
CREATE TYPE service_type AS ENUM (
  'waste',
  'recycle',
  'organics',
  'roll_off',
  'compactor',
  'portable_toilet',
  'medical_waste',
  'hazardous_waste'
);

-- Service frequency
CREATE TYPE service_frequency AS ENUM (
  'daily',
  'weekly',
  'bi_weekly',
  'monthly',
  'on_demand',
  'as_needed'
);

-- Document types
CREATE TYPE document_type AS ENUM (
  'contract',
  'coi',
  'permit',
  'manifest',
  'waste_profile',
  'certificate',
  'invoice',
  'rate_sheet',
  'photo',
  'other'
);

-- ==============================================
-- CORE TABLES
-- ==============================================

-- Organizations (Multi-tenant root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  role user_role NOT NULL DEFAULT 'client_user',
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  password_changed_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(org_id, email)
);

-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  industry VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  billing_email VARCHAR(255),
  billing_address TEXT,
  billing_city VARCHAR(100),
  billing_state VARCHAR(50),
  billing_zip VARCHAR(20),
  account_manager_id UUID REFERENCES users(id),
  sla_response_hours INTEGER DEFAULT 24,
  sla_resolution_hours INTEGER DEFAULT 72,
  communication_preferences JSONB DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Client Sites
CREATE TABLE client_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  country VARCHAR(50) DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  site_manager_name VARCHAR(255),
  site_manager_phone VARCHAR(50),
  site_manager_email VARCHAR(255),
  access_instructions TEXT,
  gate_code VARCHAR(100),
  operating_hours VARCHAR(255),
  special_instructions TEXT,
  geofence JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Vendors (moved before site_services to fix circular reference)
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  vendor_type VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  emergency_phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  website VARCHAR(255),
  primary_contact_name VARCHAR(255),
  primary_contact_phone VARCHAR(50),
  primary_contact_email VARCHAR(255),
  service_capabilities JSONB DEFAULT '[]',
  coverage_areas JSONB DEFAULT '[]',
  performance_score DECIMAL(5, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Site Services
CREATE TABLE site_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES client_sites(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  frequency service_frequency NOT NULL,
  day_of_week INTEGER,
  container_size VARCHAR(50),
  container_type VARCHAR(100),
  container_count INTEGER DEFAULT 1,
  vendor_id UUID REFERENCES vendors(id),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Site Assets (Containers, Compactors, etc.)
CREATE TABLE site_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES client_sites(id) ON DELETE CASCADE,
  asset_number VARCHAR(100),
  asset_type VARCHAR(100) NOT NULL,
  size VARCHAR(50),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  installation_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  condition VARCHAR(50),
  location_description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  site_id UUID REFERENCES client_sites(id),
  asset_id UUID REFERENCES site_assets(id),
  ticket_type ticket_type NOT NULL,
  status ticket_status DEFAULT 'untouched',
  priority VARCHAR(20) DEFAULT 'medium',
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  reporter_id UUID REFERENCES users(id),
  assignee_id UUID REFERENCES users(id),
  vendor_id UUID REFERENCES vendors(id),
  sla_due_at TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  is_escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Ticket Messages
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  status_tag ticket_status,
  recipient_type VARCHAR(20) DEFAULT 'client',
  recipient_email VARCHAR(255),
  email_from VARCHAR(255),
  email_to TEXT,
  email_subject VARCHAR(500),
  source_file_name VARCHAR(255),
  source_file_path VARCHAR(500),
  source_file_size BIGINT,
  source_file_type VARCHAR(100),
  is_internal BOOLEAN DEFAULT false,
  is_auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Attachments
CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  client_id UUID REFERENCES clients(id),
  site_id UUID REFERENCES client_sites(id),
  invoice_date DATE NOT NULL,
  due_date DATE,
  period_start DATE,
  period_end DATE,
  subtotal DECIMAL(12, 2),
  tax DECIMAL(12, 2),
  fees DECIMAL(12, 2),
  total DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status invoice_status DEFAULT 'pending',
  payment_date DATE,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  file_path VARCHAR(500),
  ocr_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(org_id, vendor_id, invoice_number)
);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  service_type service_type,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(12, 2),
  amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Discrepancies
CREATE TABLE invoice_discrepancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_item_id UUID REFERENCES invoice_line_items(id),
  discrepancy_type VARCHAR(100) NOT NULL,
  expected_value VARCHAR(255),
  actual_value VARCHAR(255),
  amount_difference DECIMAL(12, 2),
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  client_id UUID REFERENCES clients(id),
  vendor_id UUID REFERENCES vendors(id),
  site_id UUID REFERENCES client_sites(id),
  expiration_date DATE,
  is_expired BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Email Threads
CREATE TABLE email_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject VARCHAR(500),
  thread_id VARCHAR(255),
  classification VARCHAR(100),
  client_id UUID REFERENCES clients(id),
  site_id UUID REFERENCES client_sites(id),
  ticket_id UUID REFERENCES tickets(id),
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email Messages
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  to_emails JSONB NOT NULL,
  cc_emails JSONB,
  subject VARCHAR(500),
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  has_attachments BOOLEAN DEFAULT false,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automation Workflows
CREATE TABLE automation_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  ticket_type ticket_type NOT NULL,
  trigger_event VARCHAR(50) NOT NULL DEFAULT 'ticket_created',
  is_active BOOLEAN NOT NULL DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================
-- INDEXES
-- ==============================================

-- Users indexes
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Clients indexes
CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_clients_account_manager ON clients(account_manager_id);

-- Client Sites indexes
CREATE INDEX idx_client_sites_org_id ON client_sites(org_id);
CREATE INDEX idx_client_sites_client_id ON client_sites(client_id);
CREATE INDEX idx_client_sites_zip ON client_sites(zip);

-- Tickets indexes
CREATE INDEX idx_tickets_org_id ON tickets(org_id);
CREATE INDEX idx_tickets_client_id ON tickets(client_id);
CREATE INDEX idx_tickets_site_id ON tickets(site_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_sla_due_at ON tickets(sla_due_at);

-- Invoices indexes
CREATE INDEX idx_invoices_org_id ON invoices(org_id);
CREATE INDEX idx_invoices_vendor_id ON invoices(vendor_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date DESC);

-- Documents indexes
CREATE INDEX idx_documents_org_id ON documents(org_id);
CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_documents_vendor_id ON documents(vendor_id);
CREATE INDEX idx_documents_expiration_date ON documents(expiration_date);

-- Email indexes
CREATE INDEX idx_email_threads_org_id ON email_threads(org_id);
CREATE INDEX idx_email_threads_ticket_id ON email_threads(ticket_id);
CREATE INDEX idx_email_messages_thread_id ON email_messages(thread_id);

-- Audit logs index
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Automation workflow indexes
CREATE INDEX idx_automation_workflows_org_id ON automation_workflows(org_id);
CREATE INDEX idx_automation_workflows_ticket_type ON automation_workflows(ticket_type);
CREATE INDEX idx_automation_workflows_is_active ON automation_workflows(is_active);

-- Full text search indexes
CREATE INDEX idx_tickets_search ON tickets USING gin(to_tsvector('english', subject || ' ' || COALESCE(description, '')));
CREATE INDEX idx_clients_search ON clients USING gin(to_tsvector('english', name || ' ' || COALESCE(legal_name, '')));

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_sites_updated_at BEFORE UPDATE ON client_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_services_updated_at BEFORE UPDATE ON site_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_assets_updated_at BEFORE UPDATE ON site_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_workflows_updated_at BEFORE UPDATE ON automation_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate ticket number function (removed - handled by application layer)
-- Ticket numbers are generated in backend/src/services/ticket.service.ts
-- This prevents conflicts between database triggers and application logic

-- ==============================================
-- ROW LEVEL SECURITY (Optional - for multi-tenancy)
-- ==============================================

-- Enable RLS on key tables
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Example policy (to be customized based on auth implementation)
-- CREATE POLICY org_isolation ON users
--   USING (org_id = current_setting('app.current_org_id')::uuid);
