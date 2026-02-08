import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { listVendorInvoices, VendorInvoice } from '../api/vendorInvoice';
import { listClientInvoices, ClientInvoice } from '../api/clientInvoice';

type CombinedInvoice = {
  id: string;
  number: string;
  dueDate: string | null;
  total: number;
  status: string;
  kind: 'vendor' | 'client';
  name: string;
};

type ForecastBucket = {
  label: string;
  incoming: number;
  outgoing: number;
  net: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (value?: string | null) => {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString();
};

const getDaysUntil = (value?: string | null) => {
  if (!value) return null;
  const due = new Date(value);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const isVendorClosed = (status: string) => ['paid', 'rejected'].includes(status);
const isClientClosed = (status: string) => ['paid', 'cancelled'].includes(status);

const RingGauge: React.FC<{ value: number; label: string; subLabel: string; color: 'green' | 'blue' }> = ({
  value,
  label,
  subLabel,
  color,
}) => {
  const safeValue = Math.max(0, Math.min(100, value));
  const ringColor = color === 'green' ? '#16A34A' : '#2563EB';

  return (
    <div className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary-500">{label}</p>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="relative h-20 w-20 rounded-full"
          style={{
            background: `conic-gradient(${ringColor} ${safeValue}%, #E5E7EB ${safeValue}% 100%)`,
          }}
        >
          <div className="absolute inset-[8px] flex items-center justify-center rounded-full bg-white text-sm font-bold text-secondary-900">
            {Math.round(safeValue)}%
          </div>
        </div>
        <p className="text-sm text-secondary-600">{subLabel}</p>
      </div>
    </div>
  );
};

export const FinancesPage: React.FC = () => {
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([]);
  const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [vendorResponse, clientResponse] = await Promise.all([
          listVendorInvoices({ page: 1, limit: 200 }),
          listClientInvoices({ page: 1, limit: 200 }),
        ]);

        setVendorInvoices(vendorResponse.items || []);
        setClientInvoices(clientResponse.items || []);
      } catch (err) {
        console.error('Failed to load finance dashboard data:', err);
        setError('Failed to load finance metrics. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const vendorPaidAmount = vendorInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const vendorOpenInvoices = vendorInvoices.filter((inv) => !isVendorClosed(inv.status));
    const vendorOutstandingAmount = vendorOpenInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const vendorOverdueInvoices = vendorOpenInvoices.filter((inv) => {
      if (!inv.due_date) return false;
      const due = new Date(inv.due_date);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });

    const vendorOverdueAmount = vendorOverdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const clientPaidAmount = clientInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const clientOpenInvoices = clientInvoices.filter((inv) => !isClientClosed(inv.status));
    const clientOutstandingAmount = clientOpenInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const clientOverdueInvoices = clientOpenInvoices.filter((inv) => {
      if (inv.status === 'overdue') return true;
      if (!inv.due_date) return false;
      const due = new Date(inv.due_date);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });

    const clientOverdueAmount = clientOverdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const upcomingVendor: CombinedInvoice[] = vendorOpenInvoices
      .filter((inv) => {
        const days = getDaysUntil(inv.due_date);
        return days !== null && days >= 0 && days <= 14;
      })
      .map((inv) => ({
        id: inv.id,
        number: inv.invoice_number,
        dueDate: inv.due_date || null,
        total: inv.total || 0,
        status: inv.status,
        kind: 'vendor' as const,
        name: inv.vendor_name || 'Vendor',
      }));

    const upcomingClient: CombinedInvoice[] = clientOpenInvoices
      .filter((inv) => {
        const days = getDaysUntil(inv.due_date);
        return days !== null && days >= 0 && days <= 14;
      })
      .map((inv) => ({
        id: inv.id,
        number: inv.invoice_number,
        dueDate: inv.due_date || null,
        total: inv.total || 0,
        status: inv.status,
        kind: 'client' as const,
        name: 'Client Invoice',
      }));

    const upcomingInvoices = [...upcomingVendor, ...upcomingClient]
      .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime())
      .slice(0, 8);

    const payablesTotal = vendorInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const receivablesTotal = clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const collectionsRate = receivablesTotal > 0 ? (clientPaidAmount / receivablesTotal) * 100 : 0;
    const vendorPaymentRate = payablesTotal > 0 ? (vendorPaidAmount / payablesTotal) * 100 : 0;

    const grossSpreadRealized = clientPaidAmount - vendorPaidAmount;

    const forecastIncoming30 = clientOpenInvoices
      .filter((inv) => {
        const days = getDaysUntil(inv.due_date);
        return days !== null && days >= 0 && days <= 30;
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const forecastOutgoing30 = vendorOpenInvoices
      .filter((inv) => {
        const days = getDaysUntil(inv.due_date);
        return days !== null && days >= 0 && days <= 30;
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const forecastBuckets: ForecastBucket[] = [
      { label: 'Days 1-7', incoming: 0, outgoing: 0, net: 0 },
      { label: 'Days 8-14', incoming: 0, outgoing: 0, net: 0 },
      { label: 'Days 15-21', incoming: 0, outgoing: 0, net: 0 },
      { label: 'Days 22-30', incoming: 0, outgoing: 0, net: 0 },
    ];

    const getBucketIndex = (days: number) => {
      if (days <= 7) return 0;
      if (days <= 14) return 1;
      if (days <= 21) return 2;
      return 3;
    };

    clientOpenInvoices.forEach((inv) => {
      const days = getDaysUntil(inv.due_date);
      if (days !== null && days >= 0 && days <= 30) {
        const idx = getBucketIndex(days);
        forecastBuckets[idx].incoming += inv.total || 0;
      }
    });

    vendorOpenInvoices.forEach((inv) => {
      const days = getDaysUntil(inv.due_date);
      if (days !== null && days >= 0 && days <= 30) {
        const idx = getBucketIndex(days);
        forecastBuckets[idx].outgoing += inv.total || 0;
      }
    });

    forecastBuckets.forEach((bucket) => {
      bucket.net = bucket.incoming - bucket.outgoing;
    });

    return {
      vendorOutstandingAmount,
      vendorOverdueAmount,
      vendorOverdueCount: vendorOverdueInvoices.length,
      clientOutstandingAmount,
      clientOverdueAmount,
      clientOverdueCount: clientOverdueInvoices.length,
      upcomingInvoices,
      collectionsRate,
      vendorPaymentRate,
      grossSpreadRealized,
      forecastIncoming30,
      forecastOutgoing30,
      forecastNet30: forecastIncoming30 - forecastOutgoing30,
      forecastBuckets,
      vendorOverdueInvoices,
      clientOverdueInvoices,
    };
  }, [vendorInvoices, clientInvoices]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Snapshot of payables, receivables, and collections health.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/vendor-invoices" className="btn-secondary">Vendor Invoices</Link>
            <Link to="/client-billing" className="btn-primary">Client Billing</Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-danger bg-danger-light/20 px-4 py-3 text-sm text-danger-dark">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-secondary-200 bg-white p-10 text-center text-secondary-600 shadow-sm">
            Loading finance dashboard...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary-500">Upcoming Invoices (14 days)</p>
                <p className="mt-2 text-3xl font-bold text-secondary-900">{metrics.upcomingInvoices.length}</p>
              </div>
              <div className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary-500">Overdue Vendor Invoices</p>
                <p className="mt-2 text-3xl font-bold text-warning-dark">{metrics.vendorOverdueCount}</p>
                <p className="mt-1 text-sm text-secondary-600">{formatCurrency(metrics.vendorOverdueAmount)}</p>
              </div>
              <div className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary-500">Client Payments Overdue</p>
                <p className="mt-2 text-3xl font-bold text-danger-dark">{metrics.clientOverdueCount}</p>
                <p className="mt-1 text-sm text-secondary-600">{formatCurrency(metrics.clientOverdueAmount)}</p>
              </div>
              <div className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary-500">Net Realized Spread</p>
                <p className={`mt-2 text-3xl font-bold ${metrics.grossSpreadRealized >= 0 ? 'text-success-dark' : 'text-danger-dark'}`}>
                  {formatCurrency(metrics.grossSpreadRealized)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-secondary-900">30-Day Cash Flow Forecast</h2>
                  <p className="text-sm text-secondary-600">Based on open invoices with due dates in the next 30 days.</p>
                </div>
                <span className={`text-sm font-semibold ${metrics.forecastNet30 >= 0 ? 'text-success-dark' : 'text-danger-dark'}`}>
                  Net: {formatCurrency(metrics.forecastNet30)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-success/20 bg-success-light/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-secondary-500">Expected Inflow</p>
                  <p className="mt-1 text-xl font-bold text-success-dark">{formatCurrency(metrics.forecastIncoming30)}</p>
                </div>
                <div className="rounded-xl border border-primary-200 bg-primary-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-secondary-500">Expected Outflow</p>
                  <p className="mt-1 text-xl font-bold text-primary-700">{formatCurrency(metrics.forecastOutgoing30)}</p>
                </div>
                <div className={`rounded-xl border p-3 ${metrics.forecastNet30 >= 0 ? 'border-success/20 bg-success-light/20' : 'border-danger/20 bg-danger-light/20'}`}>
                  <p className="text-xs uppercase tracking-wide text-secondary-500">Projected Net</p>
                  <p className={`mt-1 text-xl font-bold ${metrics.forecastNet30 >= 0 ? 'text-success-dark' : 'text-danger-dark'}`}>
                    {formatCurrency(metrics.forecastNet30)}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {metrics.forecastBuckets.map((bucket) => {
                  const maxValue = Math.max(bucket.incoming, bucket.outgoing, 1);
                  const incomingWidth = (bucket.incoming / maxValue) * 100;
                  const outgoingWidth = (bucket.outgoing / maxValue) * 100;

                  return (
                    <div key={bucket.label} className="rounded-xl border border-secondary-200 bg-secondary-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-secondary-900">{bucket.label}</p>
                        <p className={`text-sm font-semibold ${bucket.net >= 0 ? 'text-success-dark' : 'text-danger-dark'}`}>
                          Net {formatCurrency(bucket.net)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-secondary-600">
                            <span>Incoming</span>
                            <span>{formatCurrency(bucket.incoming)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary-200">
                            <div className="h-2 rounded-full bg-success" style={{ width: `${incomingWidth}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-secondary-600">
                            <span>Outgoing</span>
                            <span>{formatCurrency(bucket.outgoing)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary-200">
                            <div className="h-2 rounded-full bg-primary-500" style={{ width: `${outgoingWidth}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <RingGauge
                value={metrics.collectionsRate}
                label="Collection Rate"
                subLabel={`${formatCurrency(metrics.clientOutstandingAmount)} still outstanding from clients.`}
                color="green"
              />
              <RingGauge
                value={metrics.vendorPaymentRate}
                label="Vendor Payment Completion"
                subLabel={`${formatCurrency(metrics.vendorOutstandingAmount)} unpaid vendor invoices.`}
                color="blue"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-secondary-900">Upcoming Invoices</h2>
                  <span className="text-xs text-secondary-500">Due in next 14 days</span>
                </div>
                {metrics.upcomingInvoices.length === 0 ? (
                  <p className="text-sm text-secondary-500">No upcoming invoices in the next 14 days.</p>
                ) : (
                  <div className="space-y-3">
                    {metrics.upcomingInvoices.map((inv) => (
                      <div key={`${inv.kind}-${inv.id}`} className="flex items-center justify-between rounded-xl border border-secondary-200 bg-secondary-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-secondary-900">
                            {inv.kind === 'vendor' ? 'Vendor' : 'Client'} Invoice #{inv.number}
                          </p>
                          <p className="text-xs text-secondary-600">
                            {inv.name} • Due {formatDate(inv.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-secondary-900">{formatCurrency(inv.total)}</p>
                          <p className="text-xs text-secondary-500 capitalize">{inv.status.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-secondary-900">Quick Links</h2>
                <div className="mt-4 space-y-2">
                  <Link to="/vendor-invoices" className="block rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-100">
                    Review Vendor Payables
                  </Link>
                  <Link to="/client-billing" className="block rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-100">
                    Review Client Receivables
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-secondary-900">Client Payments Overdue</h2>
                {metrics.clientOverdueInvoices.length === 0 ? (
                  <p className="mt-3 text-sm text-secondary-500">No overdue client payments.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {metrics.clientOverdueInvoices.slice(0, 6).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-lg border border-danger/20 bg-danger-light/20 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-secondary-900">#{inv.invoice_number}</p>
                          <p className="text-xs text-secondary-600">Due {formatDate(inv.due_date)}</p>
                        </div>
                        <p className="text-sm font-semibold text-danger-dark">{formatCurrency(inv.total)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-secondary-900">Vendor Invoices Overdue</h2>
                {metrics.vendorOverdueInvoices.length === 0 ? (
                  <p className="mt-3 text-sm text-secondary-500">No overdue vendor invoices.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {metrics.vendorOverdueInvoices.slice(0, 6).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning-light/30 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-secondary-900">#{inv.invoice_number}</p>
                          <p className="text-xs text-secondary-600">{inv.vendor_name || 'Vendor'} • Due {formatDate(inv.due_date)}</p>
                        </div>
                        <p className="text-sm font-semibold text-warning-dark">{formatCurrency(inv.total)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
