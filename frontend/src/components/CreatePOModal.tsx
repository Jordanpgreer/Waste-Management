import React, { useState, useEffect } from 'react';
import { createPO, POLineItem } from '../api/purchaseOrder';
import { clientsApi } from '../api/clients';
import { listVendors, Vendor } from '../api/vendor';
import { Client } from '../types';

interface CreatePOModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [formData, setFormData] = useState({
    client_id: '',
    vendor_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    terms: '',
    notes: '',
  });

  const [lineItems, setLineItems] = useState<POLineItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ]);

  useEffect(() => {
    fetchClients();
    fetchVendors();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsApi.listClients({ limit: 100 });
      setClients(response.items);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await listVendors({ limit: 100 });
      setVendors(response.items);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: keyof POLineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.client_id || !formData.vendor_id) {
      setError('Client and Vendor are required');
      return;
    }

    if (lineItems.length === 0 || lineItems.some(item => !item.description)) {
      setError('At least one line item with a description is required');
      return;
    }

    try {
      setLoading(true);
      await createPO({
        ...formData,
        line_items: lineItems,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Create Purchase Order</h3>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Client *</label>
                <select
                  className="form-select"
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
              <div className="flex items-center justify-between mb-2">
                <label className="form-label">Line Items *</label>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Line Item
                </button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Qty"
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
                        placeholder="Price"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                    <div className="col-span-1">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-right">
                <div className="text-lg font-semibold">
                  Total: ${calculateSubtotal().toFixed(2)}
                </div>
              </div>
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
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
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
