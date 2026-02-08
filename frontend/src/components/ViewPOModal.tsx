import React, { useState, useEffect } from 'react';
import { PurchaseOrder, getPO } from '../api/purchaseOrder';

interface ViewPOModalProps {
  po: PurchaseOrder;
  onClose: () => void;
}

export const ViewPOModal: React.FC<ViewPOModalProps> = ({ po: initialPO, onClose }) => {
  const [po, setPO] = useState(initialPO);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch full PO details with line items
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const fullPO = await getPO(initialPO.id);
        setPO(fullPO);
      } catch (error) {
        console.error('Failed to fetch PO details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [initialPO.id]);

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
            <h3 className="text-lg font-medium text-gray-900">Purchase Order: {po.po_number}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-gray-500">Loading PO details...</div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">PO Date</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(po.po_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold`}>
                      {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </span>
                  </div>
                </div>
                {po.expected_delivery_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Expected Delivery</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {new Date(po.expected_delivery_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {po.terms && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-500">Terms</label>
                  <div className="mt-1 text-sm text-gray-900">{po.terms}</div>
                </div>
              )}

              {po.notes && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <div className="mt-1 text-sm text-gray-900">{po.notes}</div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">Line Items</label>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Vendor Unit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Client Unit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Vendor Amount</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Client Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {po.line_items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-right text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-sm text-gray-900">
                            {item.vendor_unit_price !== undefined && item.vendor_unit_price !== null
                              ? formatCurrency(item.vendor_unit_price)
                              : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-gray-900">
                            {item.client_unit_price !== undefined && item.client_unit_price !== null
                              ? formatCurrency(item.client_unit_price)
                              : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-gray-900">
                            {item.vendor_amount !== undefined && item.vendor_amount !== null
                              ? formatCurrency(item.vendor_amount)
                              : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                            {item.client_amount !== undefined && item.client_amount !== null
                              ? formatCurrency(item.client_amount)
                              : formatCurrency(item.amount || 0)}
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
                      <span className="font-medium">{formatCurrency(po.subtotal)}</span>
                    </div>
                    {po.tax && po.tax > 0 && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">{formatCurrency(po.tax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(po.total)}</span>
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
