import { apiClient } from './client';
import { Ticket, TicketType, TicketStatus, TicketPriority } from '../types/ticket';

export interface CreateTicketInput {
  client_id: string;
  site_id?: string;
  asset_id?: string;
  ticket_type?: TicketType;
  priority?: TicketPriority;
  subject: string;
  description?: string;
}

export interface UpdateTicketInput {
  ticket_type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  subject?: string;
  description?: string;
  assignee_id?: string;
  vendor_id?: string;
  scheduled_at?: Date;
  resolution_notes?: string;
}

export interface TicketFilters {
  client_id?: string;
  site_id?: string;
  ticket_type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  is_escalated?: boolean;
  search?: string;
}

export interface TicketListParams extends TicketFilters {
  page?: number;
  limit?: number;
}

export interface TicketListResponse {
  items: Ticket[];
  total: number;
  total_pages: number;
}

export const ticketsApi = {
  async listTickets(params: TicketListParams = {}): Promise<TicketListResponse> {
    const response = await apiClient.get<TicketListResponse>('/tickets', params);
    return response.data!;
  },

  async getTicket(id: string): Promise<Ticket> {
    const response = await apiClient.get<Ticket>(`/tickets/${id}`);
    return response.data!;
  },

  async createTicket(data: CreateTicketInput): Promise<Ticket> {
    const response = await apiClient.post<Ticket>('/tickets', data);
    return response.data!;
  },

  async updateTicket(id: string, data: UpdateTicketInput): Promise<Ticket> {
    const response = await apiClient.put<Ticket>(`/tickets/${id}`, data);
    return response.data!;
  },

  async deleteTicket(id: string): Promise<void> {
    await apiClient.delete(`/tickets/${id}`);
  },

  async getTicketMessages(id: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(`/tickets/${id}/messages`);
    return response.data!;
  },

  async addTicketMessage(id: string, message: string, isInternal: boolean = false): Promise<any> {
    const response = await apiClient.post<any>(`/tickets/${id}/messages`, {
      message,
      is_internal: isInternal,
    });
    return response.data!;
  },

  async classifyTicket(subject: string, description?: string): Promise<any> {
    const response = await apiClient.post<any>('/tickets/classify', { subject, description });
    return response.data!;
  },
};
