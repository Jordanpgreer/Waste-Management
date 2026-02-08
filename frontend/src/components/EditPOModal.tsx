import React, { useEffect, useState } from 'react';
import { POLineItem, PurchaseOrder, updatePO } from '../api/purchaseOrder';
import { clientsApi } from '../api/clients';
import { listVendors, Vendor } from '../api/vendor';
import { Client, ClientSite } from '../types';

interface EditPOModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditPOModal: React.FC<EditPOModalProps> = ({ po, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [formData, setFormData] = useState({
    client_id: po.client_id,
    vendor_id: po.vendor_id,
    site_id: po.site_id || '',
    po_date: po.po_date?.slice(0, 10) || '',
    expected_delivery_date: po.expected_delivery_date?.slice(0, 10) || '',
    terms: po.terms || '',
    notes: po.notes || '',
  });
  const [lineItems, setLineItems] = useState<POLineItem[]>(
    (po.line_items || []).map((item) => ({
      ...item,
      vendor_unit_price: item.vendor_unit_price ?? item.unit_price ?? null,
      client_unit_price: item.client_unit_price ?? item.unit_price ?? null,
    }))
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [clientsRes, vendorsRes] = await Promise.all([
          clientsApi.listClients({ limit: 100 }),
          listVendors({ limit: 100 }),
        ]);
        setClients(clientsRes.items);
        setVendors(vendorsRes.items);
      } catch (err) {
        console.error('Failed to load clients/vendors for PO edit:', err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!formData.client_id) {
      setSites([]);
      return;
    }
    const loadSites = async () => {
      try {
        const response = await clientsApi.listSites({ clientId: formData.client_id, limit: 200 });
        setSites(response.items);
      } catch (err) {
        console.error('Failed to load client sites for PO edit:', err);
        setSites([]);
      }
    };
    loadSites();
  }, [formData.client_id]);

  const handleLineItemChange = (
    index: number,
    field: keyof POLineItem,
    value: string | number | null
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: 1,
        vendor_unit_price: null,
        client_unit_price: null,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateClientTotal = () => {
    return lineItems.reduce((sum, item) => {
      const unit = item.client_unit_price ?? item.vendor_unit_price ?? item.unit_price ?? 0;
      return sum + item.quantity * unit;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.client_id || !formData.vendor_id || !formData.site_id) {
      setError('Client, Site, and Vendor are required');
      return;
    }

    if (lineItems.length === 0 || lineItems.some((item) => !item.description?.trim())) {
      setError('At least one line item with a description is required');
      return;
    }

    try {
      setLoading(true);
      await updatePO(po.id, {
        ...formData,
        line_items: lineItems.map((item) => ({
          description: item.description,
          service_type: item.service_type,
          quantity: Number(item.quantity || 0),
          vendor_unit_price:
            item.vendor_unit_price !== undefined && item.vendor_unit_price !== null
              ? Number(item.vendor_unit_price)
              : null,
          client_unit_price:
            item.client_unit_price !== undefined && item.client_unit_price !== null
              ? Number(item.client_unit_price)
              : null,
          notes: item.notes,
        })),
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to update purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <div className="relative w-full max-w-5xl rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Edit Purchase Order {po.po_number}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="form-label">Client *</label>
                <select
                  className="form-select"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value, site_id: '' })}
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
              <div>
                <label className="form-label">Site *</label>
                <select
                  className="form-select"
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
              <div>
                <label className="form-label">Vendor *</label>
                <select
                  className="form-select"
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
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="form-label">PO Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.po_date}
                  onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Expected Delivery Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="form-label">Line Items</label>
                <button type="button" onClick={handleAddLineItem} className="text-sm text-blue-600 hover:text-blue-700">
                  + Add Line Item
                </button>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-4">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        className="form-input"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Vendor $"
                        min="0"
                        step="0.01"
                        value={item.vendor_unit_price ?? ''}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            'vendor_unit_price',
                            e.target.value === '' ? null : parseFloat(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Client $"
                        min="0"
                        step="0.01"
                        value={item.client_unit_price ?? ''}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            'client_unit_price',
                            e.target.value === '' ? null : parseFloat(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium">
                      ${(
                        item.quantity * (item.client_unit_price ?? item.vendor_unit_price ?? item.unit_price ?? 0)
                      ).toFixed(2)}
                    </div>
                    <div className="col-span-1 text-right">
                      {lineItems.length > 1 && (
                        <button type="button" onClick={() => handleRemoveLineItem(index)} className="text-red-600 hover:text-red-700">
                          x
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right text-lg font-semibold">Client Total: ${calculateClientTotal().toFixed(2)}</div>
            </div>

            <div className="mt-4">
              <label className="form-label">Terms</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              />
            </div>
            <div className="mt-4">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save PO Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
