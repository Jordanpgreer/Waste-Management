import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { listVendorInvoices, deleteVendorInvoice, VendorInvoice } from '../api/vendorInvoice';
import { UploadVendorInvoiceModal } from '../components/UploadVendorInvoiceModal';
import { ViewVendorInvoiceModal } from '../components/ViewVendorInvoiceModal';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  paid: 'bg-purple-100 text-purple-800',
  rejected: 'bg-gray-100 text-gray-800',
};

export const VendorInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<VendorInvoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listVendorInvoices({
        page,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      });
      setInvoices(response.items);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch vendor invoices:', error);
      alert('Failed to load vendor invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    fetchInvoices();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      await deleteVendorInvoice(id);
      fetchInvoices();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert('Failed to delete invoice. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const calculateTotalAmount = () => {
    return invoices.reduce((sum, inv) => sum + inv.total, 0);
  };

  const calculatePaidAmount = () => {
    return invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);
  };

  const calculatePendingAmount = () => {
    return invoices
      .filter((inv) => inv.status !== 'paid' && inv.status !== 'rejected')
      .reduce((sum, inv) => sum + inv.total, 0);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Invoices</h1>
            <p className="mt-1 text-sm text-gray-600">
              Upload and manage invoices received from vendors
            </p>
          </div>
          <button onClick={() => setShowUploadModal(true)} className="btn-primary">
            + Upload Invoice
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Total Amount</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {formatCurrency(calculateTotalAmount())}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Paid</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {formatCurrency(calculatePaidAmount())}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Pending</div>
            <div className="mt-2 text-3xl font-bold text-yellow-600">
              {formatCurrency(calculatePendingAmount())}
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="search" className="form-label">
              Search
            </label>
            <input
              type="text"
              id="search"
              className="form-input"
              placeholder="Search by invoice number or vendor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              className="form-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="disputed">Disputed</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">Loading vendor invoices...</div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No vendor invoices</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by uploading a vendor invoice PDF.
            </p>
            <div className="mt-6">
              <button onClick={() => setShowUploadModal(true)} className="btn-primary">
                + Upload Invoice
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      OCR
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoice_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(invoice.invoice_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{invoice.vendor_name}</div>
                        {invoice.client_name && (
                          <div className="text-sm text-gray-500">for {invoice.client_name}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            STATUS_COLORS[invoice.status]
                          }`}
                        >
                          {formatStatus(invoice.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {invoice.ocr_data ? (
                          <div className="flex items-center">
                            <div
                              className={`h-2 w-2 rounded-full mr-2 ${
                                invoice.ocr_data.confidence >= 70
                                  ? 'bg-green-500'
                                  : invoice.ocr_data.confidence >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                            ></div>
                            {invoice.ocr_data.confidence}%
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => setViewingInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * 10, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showUploadModal && (
        <UploadVendorInvoiceModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {viewingInvoice && (
        <ViewVendorInvoiceModal
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onUpdate={fetchInvoices}
        />
      )}
    </DashboardLayout>
  );
};
