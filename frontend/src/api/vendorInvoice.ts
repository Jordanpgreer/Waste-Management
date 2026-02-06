import { apiClient } from './client';
import { PaginatedResponse } from '../types';

export interface VendorInvoice {
  id: string;
  org_id: string;
  invoice_number: string;
  vendor_id: string;
  vendor_name?: string;
  client_id?: string;
  client_name?: string;
  site_id?: string;
  invoice_date: string;
  due_date?: string;
  period_start?: string;
  period_end?: string;
  subtotal?: number;
  tax?: number;
  fees?: number;
  total: number;
  currency: string;
  status: 'pending' | 'under_review' | 'approved' | 'disputed' | 'paid' | 'rejected';
  payment_date?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  file_path?: string;
  ocr_data?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    subtotal?: number;
    tax?: number;
    total?: number;
    vendorName?: string;
    vendorAddress?: string;
    confidence: number;
    rawText: string;
    lineItems: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      amount: number;
    }>;
  };
  line_items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    match_status?: string;
    po_line_item_id?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface UploadVendorInvoiceParams {
  vendorId: string;
  clientId?: string;
  file: File;
}

export interface ListVendorInvoicesParams {
  page?: number;
  limit?: number;
  search?: string;
  vendorId?: string;
  clientId?: string;
  status?: string;
}

export interface UpdateVendorInvoiceParams {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  periodStart?: string;
  periodEnd?: string;
  subtotal?: number;
  tax?: number;
  fees?: number;
  total?: number;
  status?: string;
  notes?: string;
}

export const uploadVendorInvoice = async (
  params: UploadVendorInvoiceParams
): Promise<VendorInvoice> => {
  const formData = new FormData();
  formData.append('vendorId', params.vendorId);
  if (params.clientId) {
    formData.append('clientId', params.clientId);
  }
  formData.append('file', params.file);

  const response = await apiClient.postMultipart<{ invoice: VendorInvoice }>(
    '/vendor-invoices/upload',
    formData
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to upload invoice');
  }

  return response.data.invoice;
};

export const listVendorInvoices = async (
  params?: ListVendorInvoicesParams
): Promise<PaginatedResponse<VendorInvoice>> => {
  const response = await apiClient.get<PaginatedResponse<VendorInvoice>>(
    '/vendor-invoices',
    params
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch vendor invoices');
  }

  return response.data;
};

export const getVendorInvoice = async (id: string): Promise<VendorInvoice> => {
  const response = await apiClient.get<{ invoice: VendorInvoice }>(
    `/vendor-invoices/${id}`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch invoice');
  }

  return response.data.invoice;
};

export const updateVendorInvoice = async (
  id: string,
  params: UpdateVendorInvoiceParams
): Promise<VendorInvoice> => {
  const response = await apiClient.put<{ invoice: VendorInvoice }>(
    `/vendor-invoices/${id}`,
    params
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to update invoice');
  }

  return response.data.invoice;
};

export const deleteVendorInvoice = async (id: string): Promise<void> => {
  const response = await apiClient.delete(`/vendor-invoices/${id}`);

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to delete invoice');
  }
};

export const getVendorInvoicePdfUrl = async (id: string): Promise<string> => {
  const response = await apiClient.get<{ url: string }>(
    `/vendor-invoices/${id}/pdf`
  );

  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get PDF URL');
  }

  return response.data.url;
};
