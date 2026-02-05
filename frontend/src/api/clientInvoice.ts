import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export interface ClientInvoiceLineItem {
  id: string;
  description: string;
  service_type?: string;
  service_date?: string;
  quantity?: number;
  cost_basis: number;
  markup_percentage: number;
  unit_price: number;
  amount: number;
  notes?: string;
}

export interface ClientInvoice {
  id: string;
  org_id: string;
  invoice_number: string;
  client_id: string;
  invoice_date: string;
  due_date?: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_date?: string;
  notes?: string;
  generated_by: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  line_items?: ClientInvoiceLineItem[];
}

export interface GenerateClientInvoiceInput {
  client_id: string;
  period_start: string;
  period_end: string;
  markup_percentage?: number;
  notes?: string;
}

export interface ListClientInvoiceParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  client_id?: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const generateClientInvoice = async (data: GenerateClientInvoiceInput): Promise<ClientInvoice> => {
  const response = await axios.post(`${API_BASE_URL}/client-invoices/generate`, data, {
    headers: getAuthHeader(),
  });
  return response.data.data.client_invoice;
};

export const getClientInvoice = async (id: string): Promise<ClientInvoice> => {
  const response = await axios.get(`${API_BASE_URL}/client-invoices/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data.data.client_invoice;
};

export const listClientInvoices = async (params: ListClientInvoiceParams = {}) => {
  const response = await axios.get(`${API_BASE_URL}/client-invoices`, {
    headers: getAuthHeader(),
    params,
  });
  return response.data.data;
};

export const approveClientInvoice = async (id: string): Promise<ClientInvoice> => {
  const response = await axios.post(`${API_BASE_URL}/client-invoices/${id}/approve`, {}, {
    headers: getAuthHeader(),
  });
  return response.data.data.client_invoice;
};

export const sendClientInvoice = async (id: string): Promise<ClientInvoice> => {
  const response = await axios.post(`${API_BASE_URL}/client-invoices/${id}/send`, {}, {
    headers: getAuthHeader(),
  });
  return response.data.data.client_invoice;
};

export const markClientInvoiceAsPaid = async (id: string, paymentDate: string): Promise<ClientInvoice> => {
  const response = await axios.post(`${API_BASE_URL}/client-invoices/${id}/mark-paid`,
    { payment_date: paymentDate },
    { headers: getAuthHeader() }
  );
  return response.data.data.client_invoice;
};
