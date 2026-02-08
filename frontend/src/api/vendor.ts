import { apiClient } from './client';

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
  created_at: string;
  updated_at: string;
}

export interface CreateVendorInput {
  name: string;
  legalName?: string;
  vendorType?: string;
  email?: string;
  phone?: string;
  emergencyPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  serviceCapabilities?: string[];
  coverageAreas?: string[];
}

export interface UpdateVendorInput extends Partial<CreateVendorInput> {
  performanceScore?: number;
}

export interface VendorsListResponse {
  items: Vendor[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export const listVendors = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  vendorType?: string;
  serviceCapability?: string;
}): Promise<VendorsListResponse> => {
  const response = await apiClient.get<VendorsListResponse>('/vendors', params);
  return response.data!;
};

export const getVendor = async (id: string): Promise<Vendor> => {
  const response = await apiClient.get<{ vendor: Vendor }>(`/vendors/${id}`);
  return response.data!.vendor;
};

export const createVendor = async (data: CreateVendorInput): Promise<Vendor> => {
  const response = await apiClient.post<{ vendor: Vendor }>('/vendors', data);
  return response.data!.vendor;
};

export const updateVendor = async (id: string, data: UpdateVendorInput): Promise<Vendor> => {
  const response = await apiClient.put<{ vendor: Vendor }>(`/vendors/${id}`, data);
  return response.data!.vendor;
};

export const deleteVendor = async (id: string): Promise<void> => {
  await apiClient.delete(`/vendors/${id}`);
};
