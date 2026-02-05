import React, { useState, useEffect } from 'react';
import { generateClientInvoice } from '../api/clientInvoice';
import { clientsApi } from '../api/clients';
import { Client } from '../types';

interface GenerateClientInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const GenerateClientInvoiceModal: React.FC<GenerateClientInvoiceModalProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  const [formData, setFormData] = useState({
    client_id: '',
    period_start: '',
    period_end: '',
    markup_percentage: '15',
    notes: '',
  });

  useEffect(() => {
    fetchClients();
    // Set default period to last month
    const today = new Date();
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    setFormData(prev => ({
      ...prev,
      period_start: firstDayLastMonth.toISOString().split('T')[0],
      period_end: lastDayLastMonth.toISOString().split('T')[0],
    }));
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsApi.listClients({ limit: 100 });
      setClients(response.items);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.client_id) {
      setError('Client is required');
      return;
    }

    if (!formData.period_start || !formData.period_end) {
      setError('Period dates are required');
      return;
    }

    if (new Date(formData.period_start) > new Date(formData.period_end)) {
      setError('Period start date must be before end date');
      return;
    }

    try {
      setLoading(true);
      await generateClientInvoice({
        client_id: formData.client_id,
        period_start: formData.period_start,
        period_end: formData.period_end,
        markup_percentage: parseFloat(formData.markup_percentage),
        notes: formData.notes || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Generate Client Invoice</h3>
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
            <div className="space-y-4">
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
                <p className="mt-1 text-sm text-gray-500">
                  Select the client to generate an invoice for
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Period Start *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Period End *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Markup Percentage</label>
                <div className="relative">
                  <input
                    type="number"
                    className="form-input pr-8"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.markup_percentage}
                    onChange={(e) => setFormData({ ...formData, markup_percentage: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Default is 15%. This markup will be applied to all vendor invoice line items.
                </p>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes for this invoice..."
                />
              </div>

              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-blue-800">How it works</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        This will find all <strong>approved vendor invoices</strong> for the selected client
                        during the specified period, apply the markup percentage, and create a consolidated
                        client invoice with all line items.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
                {loading ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
