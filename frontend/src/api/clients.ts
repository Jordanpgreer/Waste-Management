import { apiClient } from './client';
import { Client, ClientSite, PaginatedResponse } from '../types';

export interface CreateClientInput {
  name: string;
  legalName?: string;
  industry?: string;
  email?: string;
  phone?: string;
  billingEmail?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  assignedVendorId?: string;
  accountManagerId?: string;
  slaResponseHours?: number;
  slaResolutionHours?: number;
  notes?: string;
}

export interface CreateSiteInput {
  clientId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  siteManagerName?: string;
  siteManagerPhone?: string;
  siteManagerEmail?: string;
  accessInstructions?: string;
  gateCode?: string;
  operatingHours?: string;
  specialInstructions?: string;
}

export interface ServiceScheduleItem {
  id: string;
  site_id: string;
  site_name: string;
  site_city: string;
  site_state: string;
  service_type: string;
  frequency: string;
  day_of_week: number | null;
  container_size?: string;
  container_type?: string;
  container_count: number;
  start_date?: string;
  end_date?: string;
}

export interface ClientContractDownload {
  url: string;
  file_name?: string;
  uploaded_at?: string;
}

export const clientsApi = {
  async listClients(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Client>> {
    const response = await apiClient.get<PaginatedResponse<Client>>('/clients', params);
    return response.data!;
  },

  async getClient(id: string): Promise<Client> {
    const response = await apiClient.get<{ client: Client }>(`/clients/${id}`);
    return response.data!.client;
  },

  async createClient(input: CreateClientInput): Promise<Client> {
    const response = await apiClient.post<{ client: Client }>('/clients', input);
    return response.data!.client;
  },

  async updateClient(id: string, input: Partial<CreateClientInput>): Promise<Client> {
    const response = await apiClient.put<{ client: Client }>(`/clients/${id}`, input);
    return response.data!.client;
  },

  async uploadClientContract(id: string, file: File): Promise<Client> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.postMultipart<{ client: Client }>(`/clients/${id}/contract`, formData);
    return response.data!.client;
  },

  async getClientContractDownload(id: string): Promise<ClientContractDownload> {
    const response = await apiClient.get<ClientContractDownload>(`/clients/${id}/contract`);
    return response.data!;
  },

  async deleteClient(id: string): Promise<void> {
    await apiClient.delete(`/clients/${id}`);
  },

  async listSites(params?: {
    page?: number;
    limit?: number;
    clientId?: string;
    search?: string;
  }): Promise<PaginatedResponse<ClientSite>> {
    const response = await apiClient.get<PaginatedResponse<ClientSite>>('/clients/sites', params);
    return response.data!;
  },

  async listServiceSchedule(): Promise<ServiceScheduleItem[]> {
    const response = await apiClient.get<{ items: ServiceScheduleItem[] }>('/clients/service-schedule');
    return response.data?.items || [];
  },

  async getSite(id: string): Promise<ClientSite> {
    const response = await apiClient.get<{ site: ClientSite }>(`/clients/sites/${id}`);
    return response.data!.site;
  },

  async createSite(input: CreateSiteInput): Promise<ClientSite> {
    const response = await apiClient.post<{ site: ClientSite }>('/clients/sites', input);
    return response.data!.site;
  },

  async updateSite(id: string, input: Partial<CreateSiteInput>): Promise<ClientSite> {
    const response = await apiClient.put<{ site: ClientSite }>(`/clients/sites/${id}`, input);
    return response.data!.site;
  },

  async deleteSite(id: string): Promise<void> {
    await apiClient.delete(`/clients/sites/${id}`);
  },
};
