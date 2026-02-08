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
  status_bucket?: 'open' | 'completed' | 'cancelled';
  sort_by?: 'newest' | 'oldest' | 'last_touched' | 'last_touched_oldest';
  priority?: TicketPriority;
  is_escalated?: boolean;
  cancellation_status?: 'pending' | 'approved' | 'rejected';
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

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string | null;
  message: string;
  status_tag?: Exclude<TicketStatus, 'cancelled'> | null;
  is_origin_message?: boolean;
  recipient_type?: 'client' | 'vendor' | 'other' | null;
  recipient_email?: string | null;
  email_from?: string | null;
  email_to?: string | null;
  email_subject?: string | null;
  source_file_name?: string | null;
  source_file_path?: string | null;
  source_file_size?: number | null;
  source_file_type?: string | null;
  is_internal: boolean;
  is_auto_generated: boolean;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  created_at: string;
}

const normalizeTicketId = (id: string): string => {
  const trimmed = (id || '').trim();
  const withoutQuery = trimmed.split('?')[0];
  const withoutEdges = withoutQuery.replace(/^\/+|\/+$/g, '');
  const lastSegment = withoutEdges.includes('/') ? withoutEdges.split('/').pop() || '' : withoutEdges;
  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
};

const withClientQuery = (path: string, clientId?: string): string => {
  if (!clientId) return path;
  const safeClientId = clientId.trim();
  if (!safeClientId) return path;
  const join = path.includes('?') ? '&' : '?';
  return `${path}${join}client_id=${encodeURIComponent(safeClientId)}`;
};

export const ticketsApi = {
  async listTickets(params: TicketListParams = {}): Promise<TicketListResponse> {
    const response = await apiClient.get<TicketListResponse>('/tickets', params);
    return response.data!;
  },

  async getTicket(id: string, clientId?: string): Promise<Ticket> {
    const ticketId = normalizeTicketId(id);
    const response = await apiClient.get<Ticket>(withClientQuery(`/tickets/${ticketId}`, clientId));
    return response.data!;
  },

  async createTicket(data: CreateTicketInput): Promise<Ticket> {
    const response = await apiClient.post<Ticket>('/tickets', data);
    return response.data!;
  },

  async updateTicket(id: string, data: UpdateTicketInput, clientId?: string): Promise<Ticket> {
    const ticketId = normalizeTicketId(id);
    const response = await apiClient.put<Ticket>(withClientQuery(`/tickets/${ticketId}`, clientId), data);
    return response.data!;
  },

  async deleteTicket(id: string): Promise<void> {
    const ticketId = normalizeTicketId(id);
    await apiClient.delete(`/tickets/${ticketId}`);
  },

  async getTicketMessages(id: string, clientId?: string): Promise<TicketMessage[]> {
    const ticketId = normalizeTicketId(id);
    const response = await apiClient.get<TicketMessage[]>(
      withClientQuery(`/tickets/${ticketId}/messages`, clientId)
    );
    return response.data!;
  },

  async addTicketMessage(
    id: string,
    message: string,
    isInternal: boolean = false,
    clientId?: string,
    statusTag?: Exclude<TicketStatus, 'cancelled'>,
    recipientType?: 'client' | 'vendor' | 'other',
    recipientEmail?: string,
    emailSubject?: string
  ): Promise<TicketMessage> {
    const ticketId = normalizeTicketId(id);
    const response = await apiClient.post<TicketMessage>(withClientQuery(`/tickets/${ticketId}/messages`, clientId), {
      message,
      is_internal: isInternal,
      status_tag: statusTag || null,
      recipient_type: recipientType || 'client',
      recipient_email: recipientEmail || null,
      email_subject: emailSubject || null,
    });
    return response.data!;
  },

  async updateTicketMessageStatus(
    ticketIdInput: string,
    messageId: string,
    statusTag: Exclude<TicketStatus, 'cancelled'> | null,
    clientId?: string
  ): Promise<TicketMessage> {
    const ticketId = normalizeTicketId(ticketIdInput);
    const response = await apiClient.put<TicketMessage>(
      withClientQuery(`/tickets/${ticketId}/messages/${messageId}/status`, clientId),
      { status_tag: statusTag }
    );
    return response.data!;
  },

  async deleteTicketMessage(ticketIdInput: string, messageId: string, clientId?: string): Promise<void> {
    const ticketId = normalizeTicketId(ticketIdInput);
    await apiClient.delete<void>(withClientQuery(`/tickets/${ticketId}/messages/${messageId}`, clientId));
  },

  async uploadTicketMessageFile(
    id: string,
    file: File,
    clientId?: string,
    messageOverride?: string,
    recipientType?: 'client' | 'vendor' | 'other',
    recipientEmail?: string,
    emailSubject?: string
  ): Promise<TicketMessage> {
    const ticketId = normalizeTicketId(id);
    const formData = new FormData();
    formData.append('file', file);
    if (messageOverride && messageOverride.trim()) {
      formData.append('message_override', messageOverride.trim());
    }
    if (recipientType) {
      formData.append('recipient_type', recipientType);
    }
    if (recipientEmail && recipientEmail.trim()) {
      formData.append('recipient_email', recipientEmail.trim());
    }
    if (emailSubject && emailSubject.trim()) {
      formData.append('email_subject', emailSubject.trim());
    }
    const response = await apiClient.postMultipart<TicketMessage>(
      withClientQuery(`/tickets/${ticketId}/messages/upload`, clientId),
      formData
    );
    return response.data!;
  },

  async downloadTicketMessageFile(ticketIdInput: string, messageId: string, clientId?: string): Promise<void> {
    const ticketId = normalizeTicketId(ticketIdInput);
    const endpoint = withClientQuery(`/tickets/${ticketId}/messages/${messageId}/file`, clientId);
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      const fallback = 'Failed to download email attachment';
      throw new Error(fallback);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const filenameMatch =
      disposition.match(/filename\*=UTF-8''([^;]+)/i) || disposition.match(/filename="?([^";]+)"?/i);
    const fileName = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : 'ticket-correspondence.eml';

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  },

  async getTicketAttachments(id: string, clientId?: string): Promise<TicketAttachment[]> {
    const ticketId = normalizeTicketId(id);
    const response = await apiClient.get<TicketAttachment[]>(
      withClientQuery(`/tickets/${ticketId}/attachments`, clientId)
    );
    return response.data!;
  },

  async uploadTicketAttachments(id: string, files: File[], clientId?: string): Promise<TicketAttachment[]> {
    const ticketId = normalizeTicketId(id);
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await apiClient.postMultipart<TicketAttachment[]>(
      withClientQuery(`/tickets/${ticketId}/attachments`, clientId),
      formData
    );
    return response.data!;
  },

  async requestTicketCancellation(id: string, reason: string, clientId?: string): Promise<Ticket> {
    const ticketId = normalizeTicketId(id);
    const response = await apiClient.post<Ticket>(
      withClientQuery(`/tickets/${ticketId}/request-cancellation`, clientId),
      { reason }
    );
    return response.data!;
  },

  async approveTicketCancellation(id: string): Promise<Ticket> {
    const ticketId = normalizeTicketId(id);
    const response = await apiClient.post<Ticket>(`/tickets/${ticketId}/approve-cancellation`);
    return response.data!;
  },

  async rejectTicketCancellation(id: string, reason: string): Promise<Ticket> {
    const ticketId = normalizeTicketId(id);
    const response = await apiClient.post<Ticket>(`/tickets/${ticketId}/reject-cancellation`, { reason });
    return response.data!;
  },

  async classifyTicket(subject: string, description?: string): Promise<any> {
    const response = await apiClient.post<any>('/tickets/classify', { subject, description });
    return response.data!;
  },
};
