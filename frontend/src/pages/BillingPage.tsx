import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import axios from 'axios';
import { ClientInvoice, listClientInvoices } from '../api/clientInvoice';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const BILL_STATUS_LABELS: Record<ClientInvoice['status'], string> = {
  draft: 'Draft',
  pending: 'Pending',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const BILL_STATUS_STYLES: Record<ClientInvoice['status'], string> = {
  draft: 'bg-secondary-100 text-secondary-700',
  pending: 'bg-warning-light/20 text-warning-dark',
  sent: 'bg-info-light/20 text-info-dark',
  paid: 'bg-success-light/20 text-success-dark',
  overdue: 'bg-danger-light/20 text-danger-dark',
  cancelled: 'bg-secondary-100 text-secondary-700',
};

const STATUS_PRIORITY: ClientInvoice['status'][] = ['overdue', 'sent', 'pending', 'draft'];

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const isClientUser = user?.role === UserRole.CLIENT_USER;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await listClientInvoices({ page: 1, limit: 20 });
        setInvoices(response.items || []);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          // Some client users are not permitted for this endpoint yet.
          // Keep the page usable with an empty-state instead of surfacing console errors.
          setInvoices([]);
          setError('');
        } else {
          setError('Unable to load billing details right now.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (isClientUser) {
      setLoading(false);
      setInvoices([]);
      setError('');
      return;
    }

    fetchInvoices();
  }, [isClientUser]);

  const currentBill = useMemo(() => {
    for (const status of STATUS_PRIORITY) {
      const found = invoices.find((invoice) => invoice.status === status);
      if (found) {
        return found;
      }
    }
    return null;
  }, [invoices]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">View your current bill and invoice details.</p>
        </div>

        {loading ? (
          <div className="card p-8 text-center text-secondary-600">Loading billing details...</div>
        ) : error ? (
          <div className="card p-8 text-center text-danger">{error}</div>
        ) : currentBill ? (
          <div className="card p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-sm text-secondary-600">Current Bill</p>
                <h2 className="text-2xl font-bold text-secondary-900 mt-1">{currentBill.invoice_number}</h2>
              </div>
              <span className={`badge ${BILL_STATUS_STYLES[currentBill.status]}`}>
                {BILL_STATUS_LABELS[currentBill.status]}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-secondary-200 p-4">
                <p className="text-xs uppercase tracking-wide text-secondary-500">Total</p>
                <p className="mt-1 text-xl font-bold text-secondary-900">{formatCurrency(currentBill.total)}</p>
              </div>
              <div className="rounded-lg border border-secondary-200 p-4">
                <p className="text-xs uppercase tracking-wide text-secondary-500">Invoice Date</p>
                <p className="mt-1 text-base font-semibold text-secondary-900">{formatDate(currentBill.invoice_date)}</p>
              </div>
              <div className="rounded-lg border border-secondary-200 p-4">
                <p className="text-xs uppercase tracking-wide text-secondary-500">Due Date</p>
                <p className="mt-1 text-base font-semibold text-secondary-900">{formatDate(currentBill.due_date)}</p>
              </div>
              <div className="rounded-lg border border-secondary-200 p-4">
                <p className="text-xs uppercase tracking-wide text-secondary-500">Billing Period</p>
                <p className="mt-1 text-base font-semibold text-secondary-900">
                  {formatDate(currentBill.period_start)} - {formatDate(currentBill.period_end)}
                </p>
              </div>
            </div>

            {currentBill.notes && (
              <div className="mt-6 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                <p className="text-xs uppercase tracking-wide text-secondary-500">Notes</p>
                <p className="mt-1 text-sm text-secondary-700">{currentBill.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-10 text-center">
            <h3 className="text-xl font-semibold text-secondary-900">No current bill</h3>
            <p className="mt-2 text-secondary-600">There is no active bill available for your account right now.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
