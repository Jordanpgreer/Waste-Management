import React, { useState, useEffect } from 'react';
import { ClientInvoice, getClientInvoice } from '../api/clientInvoice';

interface ViewClientInvoiceModalProps {
  invoice: ClientInvoice;
  onClose: () => void;
}

export const ViewClientInvoiceModal: React.FC<ViewClientInvoiceModalProps> = ({ invoice: initialInvoice, onClose }) => {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch full invoice details with line items
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const fullInvoice = await getClientInvoice(initialInvoice.id);
        setInvoice(fullInvoice);
      } catch (error) {
        console.error('Failed to fetch invoice details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [initialInvoice.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Client Invoice: {invoice.invoice_number}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-gray-500">Loading invoice details...</div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Invoice Date</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Due Date</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing Period</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <div className="mt-1 text-sm text-gray-900">{invoice.notes}</div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">Line Items</label>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Markup</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {invoice.line_items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.description}
                            {item.service_date && (
                              <div className="text-xs text-gray-500">
                                {new Date(item.service_date).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-gray-600">{formatCurrency(item.cost_basis)}</td>
                          <td className="px-4 py-2 text-right text-sm text-green-600">
                            +{item.markup_percentage}%
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.tax && invoice.tax > 0 && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">{formatCurrency(invoice.tax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(invoice.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
