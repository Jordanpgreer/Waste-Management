import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export interface POLineItem {
  id?: string;
  description: string;
  service_type?: string;
  quantity: number;
  unit_price: number;
  amount?: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  org_id: string;
  po_number: string;
  client_id: string;
  vendor_id: string;
  site_id?: string;
  po_date: string;
  expected_delivery_date?: string;
  status: 'draft' | 'sent' | 'approved' | 'completed' | 'cancelled';
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;
  terms?: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  line_items?: POLineItem[];
}

export interface CreatePOInput {
  client_id: string;
  vendor_id: string;
  site_id?: string;
  po_date: string;
  expected_delivery_date?: string;
  terms?: string;
  notes?: string;
  line_items: POLineItem[];
}

export interface ListPOParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  client_id?: string;
  vendor_id?: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const createPO = async (data: CreatePOInput): Promise<PurchaseOrder> => {
  const response = await axios.post(`${API_BASE_URL}/purchase-orders`, data, {
    headers: getAuthHeader(),
  });
  return response.data.data.purchase_order;
};

export const getPO = async (id: string): Promise<PurchaseOrder> => {
  const response = await axios.get(`${API_BASE_URL}/purchase-orders/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data.data.purchase_order;
};

export const listPOs = async (params: ListPOParams = {}) => {
  const response = await axios.get(`${API_BASE_URL}/purchase-orders`, {
    headers: getAuthHeader(),
    params,
  });
  return response.data.data;
};

export const updatePO = async (id: string, data: Partial<CreatePOInput>): Promise<PurchaseOrder> => {
  const response = await axios.put(`${API_BASE_URL}/purchase-orders/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data.data.purchase_order;
};

export const deletePO = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/purchase-orders/${id}`, {
    headers: getAuthHeader(),
  });
};

export const approvePO = async (id: string): Promise<PurchaseOrder> => {
  const response = await axios.post(`${API_BASE_URL}/purchase-orders/${id}/approve`, {}, {
    headers: getAuthHeader(),
  });
  return response.data.data.purchase_order;
};

export const sendPO = async (id: string): Promise<PurchaseOrder> => {
  const response = await axios.post(`${API_BASE_URL}/purchase-orders/${id}/send`, {}, {
    headers: getAuthHeader(),
  });
  return response.data.data.purchase_order;
};

export const linkPOToTicket = async (poId: string, ticketId: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/purchase-orders/${poId}/tickets`, { ticket_id: ticketId }, {
    headers: getAuthHeader(),
  });
};
