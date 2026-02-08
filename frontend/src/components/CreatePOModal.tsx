import React, { useEffect, useState } from 'react';
import { createPO, POLineItem } from '../api/purchaseOrder';
import { clientsApi } from '../api/clients';
import { listVendors, Vendor } from '../api/vendor';
import { Client, ClientSite } from '../types';

interface CreatePOModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [formData, setFormData] = useState({
    client_id: '',
    vendor_id: '',
    site_id: '',
    service_scope: 'non_recurring' as 'non_recurring' | 'recurring',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
  });
  const [markupPercentage, setMarkupPercentage] = useState(15);

  const [lineItems, setLineItems] = useState<POLineItem[]>([
    { description: '', quantity: 1, vendor_unit_price: 0, client_unit_price: 0 },
  ]);

  const roundToCents = (value: number) => Number(value.toFixed(2));
  const formatCurrencyInput = (value: number | null | undefined) => roundToCents(value || 0).toFixed(2);
  const parseCurrencyInput = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    return Math.max(0, parseFloat(sanitized) || 0);
  };

  const getVendorPrice = (item: POLineItem) => Number(item.vendor_unit_price ?? item.unit_price ?? 0);

  const calculateClientPriceFromMarkup = (vendorPrice: number, markup: number) =>
    roundToCents(vendorPrice * (1 + markup / 100));

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [clientsResponse, vendorsResponse] = await Promise.all([
          clientsApi.listClients({ limit: 100 }),
          listVendors({ limit: 100 }),
        ]);
        setClients(clientsResponse.items);
        setVendors(vendorsResponse.items);
      } catch (fetchError) {
        console.error('Failed to fetch PO form data:', fetchError);
      }
    };

    fetchOptions();
  }, []);

  useEffect(() => {
    if (!formData.client_id) {
      setSites([]);
      setFormData((prev) => ({ ...prev, site_id: '' }));
      return;
    }

    const fetchSites = async () => {
      try {
        const response = await clientsApi.listSites({ clientId: formData.client_id, limit: 200 });
        setSites(response.items);
        if (!formData.site_id && response.items.length > 0) {
          setFormData((prev) => ({ ...prev, site_id: response.items[0].id }));
        }
      } catch (fetchError) {
        console.error('Failed to fetch client sites:', fetchError);
        setSites([]);
      }
    };

    fetchSites();
  }, [formData.client_id, formData.site_id]);

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        vendor_unit_price: 0,
        client_unit_price: calculateClientPriceFromMarkup(0, markupPercentage),
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleLineItemChange = (index: number, field: keyof POLineItem, value: string | number | null) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleMarkupChange = (value: string) => {
    const nextMarkup = Math.max(0, parseFloat(value) || 0);
    setMarkupPercentage(nextMarkup);
    setLineItems((prev) =>
      prev.map((item) => {
        const vendorPrice = getVendorPrice(item);
        return {
          ...item,
          client_unit_price: calculateClientPriceFromMarkup(vendorPrice, nextMarkup),
        };
      })
    );
  };

  const handleVendorPriceChange = (index: number, value: string) => {
    const vendorPrice = Math.max(0, parseFloat(value) || 0);
    setLineItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return {
          ...item,
          vendor_unit_price: vendorPrice,
          client_unit_price: calculateClientPriceFromMarkup(vendorPrice, markupPercentage),
        };
      })
    );
  };

  const handleClientPriceChange = (index: number, value: string) => {
    const clientPrice = Math.max(0, parseFloat(value) || 0);
    const vendorPrice = getVendorPrice(lineItems[index]);

    if (vendorPrice <= 0) {
      setLineItems((prev) =>
        prev.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                client_unit_price: clientPrice,
              }
            : item
        )
      );
      return;
    }

    const nextMarkup = roundToCents(((clientPrice / vendorPrice) - 1) * 100);
    setMarkupPercentage(Math.max(0, nextMarkup));
    setLineItems((prev) =>
      prev.map((item) => {
        const baseVendorPrice = getVendorPrice(item);
        return {
          ...item,
          client_unit_price: calculateClientPriceFromMarkup(baseVendorPrice, Math.max(0, nextMarkup)),
        };
      })
    );
  };

  const calculateClientTotal = () => {
    return lineItems.reduce((sum, item) => {
      const vendor = item.vendor_unit_price ?? item.unit_price ?? 0;
      const clientPrice = vendor * (1 + markupPercentage / 100);
      return sum + item.quantity * clientPrice;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.client_id || !formData.vendor_id || !formData.site_id) {
      setError('Client, Site, and Vendor are required.');
      return;
    }

    if (lineItems.length === 0 || lineItems.some((item) => !item.description?.trim())) {
      setError('At least one line item with a description is required.');
      return;
    }

    try {
      setLoading(true);
      await createPO({
        ...formData,
        service_scope: 'non_recurring',
        line_items: lineItems.map((item) => {
          const vendorPrice = item.vendor_unit_price ?? item.unit_price ?? 0;
          const clientPrice = vendorPrice * (1 + markupPercentage / 100);
          return {
            ...item,
            vendor_unit_price: vendorPrice,
            client_unit_price: Number(clientPrice.toFixed(2)),
          };
        }),
      });
      onSuccess();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.error?.message || 'Failed to create purchase order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-6">
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

        <div className="relative w-full max-w-6xl rounded-2xl border border-gray-200 bg-white p-7 shadow-2xl">
          <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">Create Purchase Order</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a non-recurring service PO with separate vendor and client pricing.
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Client *</label>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  required
                >
                  <option value="">Select Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Vendor *</label>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                  value={formData.vendor_id}
                  onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Client Site *</label>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                  value={formData.site_id}
                  onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                  required
                  disabled={!formData.client_id}
                >
                  <option value="">Select Site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">PO Date *</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                  value={formData.po_date}
                  onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Expected Delivery Date</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <label className="block text-base font-semibold text-gray-800">Line Items *</label>
                  <p className="text-xs text-gray-500">Add quantity, vendor cost, and client bill rate.</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Markup %</label>
                  <input
                    type="number"
                    className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-right text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                    min="0"
                    step="0.01"
                    value={markupPercentage}
                    onChange={(e) => handleMarkupChange(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                  >
                    + Add Line Item
                  </button>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-12 gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <div className="col-span-4">Description</div>
                <div className="col-span-1 text-right">Qty</div>
                <div className="col-span-2 text-right">Vendor Price</div>
                <div className="col-span-2 text-right">Client Price</div>
                <div className="col-span-2 text-right">Line Total</div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <div className="col-span-4">
                      <input
                        type="text"
                        className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-right text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full rounded-md border border-gray-300 bg-white pl-6 pr-2 py-2 text-right text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                          value={formatCurrencyInput(item.vendor_unit_price ?? item.unit_price ?? 0)}
                          onChange={(e) => handleVendorPriceChange(index, String(parseCurrencyInput(e.target.value)))}
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full rounded-md border border-gray-300 bg-white pl-6 pr-2 py-2 text-right text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                          value={formatCurrencyInput(item.client_unit_price ?? 0)}
                          onChange={(e) => handleClientPriceChange(index, String(parseCurrencyInput(e.target.value)))}
                        />
                      </div>
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold text-gray-800">
                      ${((item.quantity || 0) * Number(item.client_unit_price ?? 0)).toFixed(2)}
                    </div>
                    <div className="col-span-1 text-right">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(index)}
                          className="rounded px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          x
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-right">
                <div className="text-xl font-semibold text-gray-900">Client Total: ${calculateClientTotal().toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-success focus:outline-none focus:ring-2 focus:ring-success-light"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="mt-7 flex justify-end gap-3 border-t border-gray-200 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-5"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-6"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Purchase Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

