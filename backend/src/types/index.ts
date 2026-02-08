// User types
export enum UserRole {
  ADMIN = 'admin',
  BROKER_OPS_AGENT = 'broker_ops_agent',
  ACCOUNT_MANAGER = 'account_manager',
  BILLING_FINANCE = 'billing_finance',
  VENDOR_MANAGER = 'vendor_manager',
  CLIENT_USER = 'client_user',
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  client_id?: string; // For client_user role: links user to their client
  is_active: boolean;
  email_verified: boolean;
  last_login_at?: Date;
  password_changed_at?: Date;
  settings?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  settings?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Ticket types
export enum TicketType {
  MISSED_PICKUP = 'missed_pickup',
  EXTRA_PICKUP = 'extra_pickup',
  NEW_SERVICE = 'new_service',
  MODIFY_SERVICE = 'modify_service',
  CONTAINER_DELIVERY = 'container_delivery',
  CONTAINER_SWAP = 'container_swap',
  CONTAMINATION = 'contamination',
  LOCK_KEY_ISSUE = 'lock_key_issue',
  ACCESS_ISSUE = 'access_issue',
  BILLING_DISPUTE = 'billing_dispute',
  SITE_CLEANUP = 'site_cleanup',
  COMPACTOR_MAINTENANCE = 'compactor_maintenance',
  OTHER = 'other',
}

export enum TicketStatus {
  UNTOUCHED = 'untouched',
  CLIENT_APPROVAL = 'client_approval',
  VENDOR_RATES = 'vendor_rates',
  QUOTED_TO_CLIENT = 'quoted_to_client',
  RESPONSE_FROM_VENDOR = 'response_from_vendor',
  RESPONSE_FROM_CLIENT = 'response_from_client',
  COMPLETED = 'completed',
  ETA_RECEIVED_FROM_VENDOR = 'eta_received_from_vendor',
  ETA_PROVIDED_TO_CLIENT = 'eta_provided_to_client',
  WAITING_ON_CLIENT_INFO = 'waiting_on_client_info',
  WAITING_ON_VENDOR_INFO = 'waiting_on_vendor_info',
  CANCELLED = 'cancelled',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Ticket {
  id: string;
  org_id: string;
  ticket_number: string;
  client_id: string;
  site_id?: string;
  asset_id?: string;
  ticket_type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  subject: string;
  description?: string;
  reporter_id?: string;
  assignee_id?: string;
  vendor_id?: string;
  sla_due_at?: Date;
  scheduled_at?: Date;
  completed_at?: Date;
  verified_at?: Date;
  closed_at?: Date;
  resolution_notes?: string;
  is_escalated: boolean;
  escalated_at?: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Client types
export interface Client {
  id: string;
  org_id: string;
  name: string;
  legal_name?: string;
  industry?: string;
  email?: string;
  phone?: string;
  billing_email?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  assigned_vendor_id?: string;
  contract_file_path?: string;
  contract_file_name?: string;
  contract_uploaded_at?: Date;
  account_manager_id?: string;
  sla_response_hours: number;
  sla_resolution_hours: number;
  communication_preferences?: Record<string, any>;
  notes?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface ClientSite {
  id: string;
  org_id: string;
  client_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude?: number;
  longitude?: number;
  site_manager_name?: string;
  site_manager_phone?: string;
  site_manager_email?: string;
  access_instructions?: string;
  gate_code?: string;
  operating_hours?: string;
  special_instructions?: string;
  geofence?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Service types
export enum ServiceType {
  WASTE = 'waste',
  RECYCLE = 'recycle',
  ORGANICS = 'organics',
  ROLL_OFF = 'roll_off',
  COMPACTOR = 'compactor',
  PORTABLE_TOILET = 'portable_toilet',
  MEDICAL_WASTE = 'medical_waste',
  HAZARDOUS_WASTE = 'hazardous_waste',
}

export enum ServiceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi_weekly',
  MONTHLY = 'monthly',
  ON_DEMAND = 'on_demand',
  AS_NEEDED = 'as_needed',
}

export interface SiteService {
  id: string;
  org_id: string;
  site_id: string;
  service_type: ServiceType;
  frequency: ServiceFrequency;
  day_of_week?: number;
  container_size?: string;
  container_type?: string;
  container_count: number;
  vendor_id?: string;
  start_date?: Date;
  end_date?: Date;
  notes?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Vendor types
export interface Vendor {
  id: string;
  org_id: string;
  name: string;
  legal_name?: string;
  vendor_type?: string;
  email?: string;
  phone?: string;
  emergency_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  service_capabilities?: string[];
  coverage_areas?: string[];
  performance_score?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Invoice types
export enum InvoiceStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DISPUTED = 'disputed',
  PAID = 'paid',
  REJECTED = 'rejected',
}

export interface Invoice {
  id: string;
  org_id: string;
  invoice_number: string;
  vendor_id: string;
  client_id?: string;
  site_id?: string;
  invoice_date: Date;
  due_date?: Date;
  period_start?: Date;
  period_end?: Date;
  subtotal?: number;
  tax?: number;
  fees?: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  payment_date?: Date;
  payment_method?: string;
  payment_reference?: string;
  approved_by?: string;
  approved_at?: Date;
  notes?: string;
  file_path?: string;
  ocr_data?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Document types
export enum DocumentType {
  CONTRACT = 'contract',
  COI = 'coi',
  PERMIT = 'permit',
  MANIFEST = 'manifest',
  WASTE_PROFILE = 'waste_profile',
  CERTIFICATE = 'certificate',
  INVOICE = 'invoice',
  RATE_SHEET = 'rate_sheet',
  PHOTO = 'photo',
  OTHER = 'other',
}

export interface Document {
  id: string;
  org_id: string;
  document_type: DocumentType;
  name: string;
  description?: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  client_id?: string;
  vendor_id?: string;
  site_id?: string;
  expiration_date?: Date;
  is_expired: boolean;
  reminder_sent: boolean;
  uploaded_by?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Auth types
export interface AuthToken {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface JWTPayload {
  userId: string;
  orgId: string;
  email: string;
  role: UserRole;
  clientId?: string; // For client_user role: links user to their client
  iat?: number;
  exp?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// Re-export purchase order types
export * from './purchaseOrder.types';

// Re-export client invoice types
export * from './clientInvoice.types';

// Re-export invoice matching types
export * from './invoiceMatching.types';
