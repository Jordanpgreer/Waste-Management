import React, { useState, useEffect, useCallback } from 'react';
import { VendorInvoice, updateVendorInvoice, getVendorInvoicePdfUrl } from '../api/vendorInvoice';

interface ViewVendorInvoiceModalProps {
  invoice: VendorInvoice;
  onClose: () => void;
  onUpdate: () => void;
}

export const ViewVendorInvoiceModal: React.FC<ViewVendorInvoiceModalProps> = ({
  invoice,
  onClose,
  onUpdate,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date || '',
    subtotal: invoice.subtotal || 0,
    tax: invoice.tax || 0,
    fees: invoice.fees || 0,
    total: invoice.total,
    status: invoice.status,
    notes: invoice.notes || '',
  });

  const fetchPdfUrl = useCallback(async () => {
    try {
      setLoadingPdf(true);
      const url = await getVendorInvoicePdfUrl(invoice.id);
      setPdfUrl(url);
    } catch (error) {
      console.error('Failed to load PDF:', error);
      setError('Failed to load PDF file');
    } finally {
      setLoadingPdf(false);
    }
  }, [invoice.id]);

  useEffect(() => {
    if (invoice.file_path) {
      fetchPdfUrl();
    } else {
      setLoadingPdf(false);
    }
  }, [invoice.file_path, fetchPdfUrl]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      await updateVendorInvoice(invoice.id, {
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate || undefined,
        subtotal: formData.subtotal,
        tax: formData.tax,
        fees: formData.fees,
        total: formData.total,
        status: formData.status as any,
        notes: formData.notes,
      });

      setEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update invoice:', error);
      setError(error.message || 'Failed to update invoice');
    } finally {
      setSaving(false);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Invoice {invoice.invoice_number}
              </h3>
              <p className="text-sm text-gray-500">
                {invoice.vendor_name} - {new Date(invoice.invoice_date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        invoiceNumber: invoice.invoice_number,
                        invoiceDate: invoice.invoice_date,
                        dueDate: invoice.due_date || '',
                        subtotal: invoice.subtotal || 0,
                        tax: invoice.tax || 0,
                        fees: invoice.fees || 0,
                        total: invoice.total,
                        status: invoice.status,
                        notes: invoice.notes || '',
                      });
                    }}
                    disabled={saving}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* OCR Confidence Banner */}
          {invoice.ocr_data && invoice.ocr_data.confidence < 70 && (
            <div className="mx-6 mt-4 rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    OCR extraction had low confidence ({invoice.ocr_data.confidence}%). Please review and verify the extracted data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Content - Split View */}
          <div className="flex-1 overflow-hidden flex">
            {/* Left: PDF Viewer */}
            <div className="w-1/2 border-r border-gray-200 bg-gray-100 overflow-auto">
              {loadingPdf ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading PDF...</div>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title="Invoice PDF"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2">No PDF available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Editable Form */}
            <div className="w-1/2 overflow-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="form-label">Invoice Number</label>
                  {editing ? (
                    <input
                      type="text"
                      name="invoiceNumber"
                      className="form-input"
                      value={formData.invoiceNumber}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{invoice.invoice_number}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Invoice Date</label>
                    {editing ? (
                      <input
                        type="date"
                        name="invoiceDate"
                        className="form-input"
                        value={formData.invoiceDate}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Due Date</label>
                    {editing ? (
                      <input
                        type="date"
                        name="dueDate"
                        className="form-input"
                        value={formData.dueDate}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        {invoice.due_date
                          ? new Date(invoice.due_date).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Status</label>
                  {editing ? (
                    <select
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="disputed">Disputed</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900">{formatStatus(invoice.status)}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Vendor</label>
                  <p className="text-sm text-gray-900">{invoice.vendor_name}</p>
                </div>

                {invoice.client_name && (
                  <div>
                    <label className="form-label">Client</label>
                    <p className="text-sm text-gray-900">{invoice.client_name}</p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Amounts</h4>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <label className="form-label">Subtotal</label>
                      {editing ? (
                        <input
                          type="number"
                          name="subtotal"
                          className="form-input"
                          value={formData.subtotal}
                          onChange={handleNumberChange}
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 text-right">
                          {formatCurrency(invoice.subtotal || 0)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <label className="form-label">Tax</label>
                      {editing ? (
                        <input
                          type="number"
                          name="tax"
                          className="form-input"
                          value={formData.tax}
                          onChange={handleNumberChange}
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 text-right">
                          {formatCurrency(invoice.tax || 0)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <label className="form-label">Fees</label>
                      {editing ? (
                        <input
                          type="number"
                          name="fees"
                          className="form-input"
                          value={formData.fees}
                          onChange={handleNumberChange}
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 text-right">
                          {formatCurrency(invoice.fees || 0)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-3">
                      <label className="form-label font-semibold">Total</label>
                      {editing ? (
                        <input
                          type="number"
                          name="total"
                          className="form-input font-semibold"
                          value={formData.total}
                          onChange={handleNumberChange}
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-gray-900 text-right">
                          {formatCurrency(invoice.total)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {invoice.line_items && invoice.line_items.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Line Items</h4>
                    <div className="space-y-2">
                      {invoice.line_items.map((item, index) => (
                        <div key={item.id} className="bg-gray-50 rounded p-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-900">{item.description}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <label className="form-label">Notes</label>
                  {editing ? (
                    <textarea
                      name="notes"
                      className="form-input"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{invoice.notes || 'No notes'}</p>
                  )}
                </div>

                {invoice.ocr_data && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">OCR Information</h4>
                    <div className="bg-gray-50 rounded p-3 space-y-1">
                      <p className="text-xs text-gray-600">
                        Confidence: {invoice.ocr_data.confidence}%
                      </p>
                      <p className="text-xs text-gray-600">
                        Fields extracted: {invoice.ocr_data.lineItems?.length || 0} line items
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
