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
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  client_id?: string;
  is_active: boolean;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

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
  contract_uploaded_at?: string;
  account_manager_id?: string;
  sla_response_hours: number;
  sla_resolution_hours: number;
  communication_preferences?: Record<string, any>;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
