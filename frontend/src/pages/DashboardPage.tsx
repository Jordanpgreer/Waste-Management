import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserRole, Client, ClientSite } from '../types';
import { ticketsApi } from '../api/tickets';
import { clientsApi, ServiceScheduleItem } from '../api/clients';
import { ClientInvoice } from '../api/clientInvoice';
import { Ticket } from '../types/ticket';

const serviceTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    waste: 'Solid Waste',
    recycle: 'Recycling',
    organics: 'Organics',
    roll_off: 'Roll-off',
    compactor: 'Compactor',
    portable_toilet: 'Portable Toilet',
    medical_waste: 'Medical Waste',
    hazardous_waste: 'Hazardous Waste',
  };
  return labels[type] || type.replace('_', ' ');
};

const dayLabel = (dayOfWeek: number) => {
  const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return labels[dayOfWeek] || 'Unknown Day';
};

const formatFrequencyText = (frequency: string, days: number[]) => {
  if (frequency === 'daily') {
    return 'Daily';
  }
  if (frequency === 'weekly') {
    if (days.length === 0) {
      return 'Every week';
    }
    return `Every ${days.map((day) => dayLabel(day)).join(', ')}`;
  }
  if (frequency === 'bi_weekly') {
    if (days.length > 0) {
      return `Every other ${days.map((day) => dayLabel(day)).join(' and ')}`;
    }
    return 'Every other week';
  }
  if (frequency === 'monthly') {
    return 'Monthly';
  }
  if (frequency === 'on_demand') {
    return 'On demand';
  }
  if (frequency === 'as_needed') {
    return 'As needed';
  }
  return frequency.replace('_', ' ');
};

type Trend = 'up' | 'down' | 'neutral';
type PageResult<T> = {
  items: T[];
  total: number;
  total_pages: number;
};

const PERIOD_DAYS = 30;

const getPeriodBounds = () => {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - PERIOD_DAYS);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - PERIOD_DAYS);

  return { now, currentStart, previousStart };
};

const isInRange = (date: Date, start: Date, end: Date) => date >= start && date < end;

const calculateTrend = (current: number, previous: number): { change: string; trend: Trend } => {
  if (current === 0 && previous === 0) {
    return { change: '0%', trend: 'neutral' };
  }

  if (previous === 0) {
    return { change: '+100%', trend: 'up' };
  }

  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct);

  if (rounded > 0) {
    return { change: `+${rounded}%`, trend: 'up' };
  }
  if (rounded < 0) {
    return { change: `${rounded}%`, trend: 'down' };
  }
  return { change: '0%', trend: 'neutral' };
};

const getPeriodChangeFromDates = (dates: Array<string | null | undefined>) => {
  const { now, currentStart, previousStart } = getPeriodBounds();
  let current = 0;
  let previous = 0;

  dates.forEach((value) => {
    if (!value) return;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;

    if (isInRange(parsed, currentStart, now)) {
      current += 1;
    } else if (isInRange(parsed, previousStart, currentStart)) {
      previous += 1;
    }
  });

  return calculateTrend(current, previous);
};

const getClientProgressLabel = (status: string) => {
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'completed') return 'Completed';
  return 'In Progress';
};

const fetchAllPages = async <T,>(
  fetchPage: (page: number) => Promise<PageResult<T>>
): Promise<PageResult<T>> => {
  const first = await fetchPage(1);
  const items = [...(first.items || [])];
  const totalPages = first.total_pages || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchPage(page);
    items.push(...(next.items || []));
  }

  return {
    ...first,
    items,
    total: first.total || items.length,
    total_pages: totalPages,
  };
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isClientUser = user?.role === UserRole.CLIENT_USER;
  const [clientLoading, setClientLoading] = useState(false);
  const [clientTickets, setClientTickets] = useState<Ticket[]>([]);
  const [staffClients, setStaffClients] = useState<Client[]>([]);
  const [staffSites, setStaffSites] = useState<ClientSite[]>([]);
  const [staffTickets, setStaffTickets] = useState<Ticket[]>([]);
  const [staffPendingCancellationTickets, setStaffPendingCancellationTickets] = useState<Ticket[]>([]);
  const [clientAddress, setClientAddress] = useState('');
  const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);
  const [serviceSchedule, setServiceSchedule] = useState<ServiceScheduleItem[]>([]);

  useEffect(() => {
    if (!isClientUser) {
      return;
    }

    const loadClientDashboardData = async () => {
      try {
        setClientLoading(true);
        let resolvedClientId = user?.client_id;
        if (!resolvedClientId) {
          try {
            const clientResult = await clientsApi.listClients({ page: 1, limit: 1 });
            resolvedClientId = clientResult.items?.[0]?.id;
          } catch {
            // Ignore; client identity fallback may not be available in all environments.
          }
        }

        const candidateClientIds = Array.from(new Set([resolvedClientId].filter((id): id is string => !!id)));

        let loadedTickets: Ticket[] = [];
        for (const clientId of candidateClientIds) {
          try {
            const result = await fetchAllPages<Ticket>((page) =>
              ticketsApi.listTickets({ page, limit: 100, client_id: clientId })
            );
            loadedTickets = result.items || [];
            break;
          } catch {
            // Try next available client scope without surfacing console noise to end users.
          }
        }
        if (loadedTickets.length === 0) {
          try {
            const result = await fetchAllPages<Ticket>((page) => ticketsApi.listTickets({ page, limit: 100 }));
            loadedTickets = result.items || [];
          } catch {
            // Final fallback intentionally silent.
          }
        }

        setClientTickets(loadedTickets);
        setClientAddress('');

        // Client role may not have direct access to invoice/schedule endpoints in this environment.
        // Avoid forbidden calls on dashboard refresh; use neutral defaults here.
        setClientInvoices([]);
        setServiceSchedule([]);

      } catch (error) {
        console.error('Failed to load client dashboard data:', error);
      } finally {
        setClientLoading(false);
      }
    };

    loadClientDashboardData();
  }, [isClientUser, user?.client_id]);

  useEffect(() => {
    if (isClientUser) {
      return;
    }

    const loadStaffTicketMetrics = async () => {
      try {
        const [clientsResult, sitesResult, allTicketsResult, pendingCancellationResult] = await Promise.all([
          fetchAllPages<Client>((page) => clientsApi.listClients({ page, limit: 100 })),
          fetchAllPages<ClientSite>((page) => clientsApi.listSites({ page, limit: 100 })),
          fetchAllPages<Ticket>((page) => ticketsApi.listTickets({ page, limit: 100 })),
          fetchAllPages<Ticket>((page) =>
            ticketsApi.listTickets({ page, limit: 100, cancellation_status: 'pending' })
          ),
        ]);

        setStaffClients(clientsResult.items || []);
        setStaffSites(sitesResult.items || []);
        setStaffTickets(allTicketsResult.items || []);
        setStaffPendingCancellationTickets(pendingCancellationResult.items || []);
      } catch (error) {
        console.error('Failed to load staff dashboard metrics:', error);
        setStaffClients([]);
        setStaffSites([]);
        setStaffTickets([]);
        setStaffPendingCancellationTickets([]);
      }
    };

    loadStaffTicketMetrics();
  }, [isClientUser]);

  const staffOpenTicketCount = useMemo(
    () => staffTickets.filter((ticket) => ticket.status !== 'completed' && ticket.status !== 'cancelled').length,
    [staffTickets]
  );

  const pendingCancellationCount = useMemo(
    () => staffPendingCancellationTickets.length,
    [staffPendingCancellationTickets]
  );

  const totalClientsCount = useMemo(() => staffClients.length, [staffClients]);

  const activeSitesCount = useMemo(
    () => staffSites.filter((site) => site.is_active).length,
    [staffSites]
  );

  const clientsDelta = useMemo(
    () => getPeriodChangeFromDates(staffClients.map((client) => client.created_at)),
    [staffClients]
  );

  const activeSitesDelta = useMemo(
    () =>
      getPeriodChangeFromDates(
        staffSites.filter((site) => site.is_active).map((site) => site.created_at)
      ),
    [staffSites]
  );

  const openTicketsDelta = useMemo(
    () =>
      getPeriodChangeFromDates(
        staffTickets
          .filter((ticket) => ticket.status !== 'completed' && ticket.status !== 'cancelled')
          .map((ticket) => ticket.created_at)
      ),
    [staffTickets]
  );

  const pendingCancellationDelta = useMemo(
    () =>
      getPeriodChangeFromDates(
        staffPendingCancellationTickets.map(
          (ticket) =>
            ticket.metadata?.cancellation_request?.requested_at ||
            ticket.updated_at ||
            ticket.created_at
        )
      ),
    [staffPendingCancellationTickets]
  );

  const currentBill = useMemo(() => {
    const invoicePriority: ClientInvoice['status'][] = ['overdue', 'sent', 'pending', 'draft'];

    for (const status of invoicePriority) {
      const found = clientInvoices.find((invoice) => invoice.status === status);
      if (found) {
        return found;
      }
    }
    return null;
  }, [clientInvoices]);

  const endOfMonthDueInfo = useMemo(() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.max(
      0,
      Math.ceil((endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      amountDue: currentBill?.total || 0,
      daysUntilDue,
    };
  }, [currentBill]);

  const openTicketCount = useMemo(
    () =>
      clientTickets.filter(
        (ticket) => ticket.status !== 'completed' && ticket.status !== 'cancelled'
      ).length,
    [clientTickets]
  );

  const completedTicketCount = useMemo(
    () =>
      clientTickets.filter(
        (ticket) => ticket.status === 'completed'
      ).length,
    [clientTickets]
  );

  const recentClientTickets = useMemo(
    () =>
      [...clientTickets]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5),
    [clientTickets]
  );

  const scheduleBySite = useMemo(() => {
    const grouped: Record<string, { siteName: string; location: string; rows: ServiceScheduleItem[] }> = {};

    for (const item of serviceSchedule) {
      const key = item.site_id;
      if (!grouped[key]) {
        grouped[key] = {
          siteName: item.site_name,
          location: `${item.site_city}, ${item.site_state}`,
          rows: [],
        };
      }
      grouped[key].rows.push(item);
    }

    return Object.values(grouped).map((site) => {
      const byStreamAndFrequency: Record<string, ServiceScheduleItem[]> = {};
      for (const row of site.rows) {
        const comboKey = `${row.service_type}-${row.frequency}`;
        if (!byStreamAndFrequency[comboKey]) {
          byStreamAndFrequency[comboKey] = [];
        }
        byStreamAndFrequency[comboKey].push(row);
      }

      const streamSchedules = Object.entries(byStreamAndFrequency).map(([key, rows]) => {
        const [serviceType, frequency] = key.split('-');
        const dayList = Array.from(
          new Set(rows.map((row) => row.day_of_week).filter((day): day is number => day !== null))
        ).sort((a, b) => a - b);

        return {
          serviceType,
          scheduleText: formatFrequencyText(frequency, dayList),
        };
      });

      return {
        ...site,
        streamSchedules,
      };
    });
  }, [serviceSchedule]);

  const stats = [
    {
      label: 'Total Clients',
      value: totalClientsCount.toString(),
      change: clientsDelta.change,
      trend: clientsDelta.trend,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      bgColor: 'bg-primary-50',
      iconColor: 'text-primary-600',
    },
    {
      label: 'Active Sites',
      value: activeSitesCount.toString(),
      change: activeSitesDelta.change,
      trend: activeSitesDelta.trend,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      bgColor: 'bg-success-light/20',
      iconColor: 'text-success-dark',
    },
    {
      label: 'Open Tickets',
      value: staffOpenTicketCount.toString(),
      change: openTicketsDelta.change,
      trend: openTicketsDelta.trend,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
      bgColor: 'bg-warning-light/20',
      iconColor: 'text-warning-dark',
      onClick: () => navigate('/tickets'),
    },
    {
      label: 'Pending Cancellation Requests',
      value: pendingCancellationCount.toString(),
      change: pendingCancellationDelta.change,
      trend: pendingCancellationDelta.trend,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      bgColor: 'bg-info-light/20',
      iconColor: 'text-info-dark',
      onClick: () => navigate('/tickets?cancellation_status=pending'),
    },
  ];

  const quickActions = [
    {
      label: 'Add Client',
      description: 'Create a new client account',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      onClick: () => navigate('/clients'),
      color: 'primary',
    },
    {
      label: 'Create Ticket',
      description: 'Log a new service request',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onClick: () => navigate('/tickets'),
      color: 'success',
    },
    {
      label: 'Upload Invoice',
      description: 'Process vendor invoices',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      onClick: () => navigate('/vendor-invoices'),
      color: 'info',
    },
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (isClientUser) {
    return (
      <DashboardLayout>
        <div className="animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">
              Welcome back, {user?.first_name}!
            </h1>
            <p className="text-secondary-600">
              {clientAddress || 'Address unavailable'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="card-hover p-6">
              <p className="text-sm font-medium text-secondary-600 mb-1">Open Service Requests</p>
              <p className="text-3xl font-bold text-secondary-900">{clientLoading ? '...' : openTicketCount}</p>
            </div>
            <div className="card-hover p-6">
              <p className="text-sm font-medium text-secondary-600 mb-1">Completed Service Requests</p>
              <p className="text-3xl font-bold text-success-dark">{clientLoading ? '...' : completedTicketCount}</p>
            </div>
            <div className="card-hover p-6">
              <p className="text-sm font-medium text-secondary-600 mb-1">Current Bill</p>
              <p className="text-3xl font-bold text-primary-700">
                {clientLoading ? '...' : formatCurrency(endOfMonthDueInfo.amountDue)}
              </p>
              {!clientLoading && (
                <p className="mt-1 text-xs font-medium text-secondary-600">
                  Due in {endOfMonthDueInfo.daysUntilDue} {endOfMonthDueInfo.daysUntilDue === 1 ? 'day' : 'days'}
                </p>
              )}
            </div>
          </div>

          <div className="card mb-8">
            <div className="p-6 border-b border-secondary-200">
              <h2 className="text-lg font-semibold text-secondary-900">Quick Actions</h2>
              <p className="text-sm text-secondary-600 mt-1">Tasks clients usually need</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate('/tickets')}
                  className="p-5 rounded-xl border-2 border-secondary-200 hover:border-primary-500 hover:shadow-md transition-all duration-200 text-left"
                >
                  <h3 className="font-semibold text-secondary-900 mb-1">Create Service Request</h3>
                  <p className="text-sm text-secondary-600">Report a missed pickup, issue, or change request.</p>
                </button>
                <button
                  onClick={() => navigate('/billing')}
                  className="p-5 rounded-xl border-2 border-secondary-200 hover:border-primary-500 hover:shadow-md transition-all duration-200 text-left"
                >
                  <h3 className="font-semibold text-secondary-900 mb-1">View Billing</h3>
                  <p className="text-sm text-secondary-600">Check your current bill and due dates.</p>
                </button>
                <button
                  onClick={() => {
                    const section = document.getElementById('client-service-schedule');
                    if (section) {
                      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="p-5 rounded-xl border-2 border-secondary-200 hover:border-primary-500 hover:shadow-md transition-all duration-200 text-left"
                >
                  <h3 className="font-semibold text-secondary-900 mb-1">View Service Schedule</h3>
                  <p className="text-sm text-secondary-600">Jump to your waste stream schedule by location.</p>
                </button>
              </div>
            </div>
          </div>

          <div id="client-service-schedule" className="card mb-8 overflow-hidden">
            <div className="border-b border-secondary-200 bg-gradient-to-r from-primary-50 to-secondary-50 p-6">
              <h3 className="text-lg font-semibold text-secondary-900">Service Schedule</h3>
              <p className="mt-1 text-sm text-secondary-600">
                Your contracted waste streams and service days by location. This is view-only.
              </p>
            </div>
            <div className="p-6">
              {clientLoading ? (
                <p className="text-secondary-600">Loading service schedule...</p>
              ) : scheduleBySite.length === 0 ? (
                <div className="rounded-lg border border-dashed border-secondary-300 bg-secondary-50 p-8 text-center">
                  <p className="font-medium text-secondary-800">No service schedule available yet.</p>
                  <p className="mt-1 text-sm text-secondary-600">
                    Your account manager can add service streams and pickup days.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {scheduleBySite.map((site) => (
                    <div key={site.siteName} className="rounded-xl border border-secondary-200 bg-white p-5 shadow-sm">
                      <div className="mb-4">
                        <h4 className="text-base font-semibold text-secondary-900">{site.siteName}</h4>
                        <p className="text-sm text-secondary-600">{site.location}</p>
                      </div>
                      <div className="space-y-3">
                        {site.streamSchedules.map((entry) => (
                          <div
                            key={`${site.siteName}-${entry.serviceType}-${entry.scheduleText}`}
                            className="rounded-lg bg-secondary-50 px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-secondary-900">
                              {serviceTypeLabel(entry.serviceType)}
                            </p>
                            <p className="mt-1 text-sm text-secondary-700">{entry.scheduleText}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="p-6 border-b border-secondary-200">
              <h3 className="font-semibold text-secondary-900">Recent Service Requests</h3>
            </div>
            <div className="p-6">
              {clientLoading ? (
                <p className="text-secondary-600">Loading recent requests...</p>
              ) : recentClientTickets.length === 0 ? (
                <p className="text-secondary-600">No service requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentClientTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between rounded-lg border border-secondary-200 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-secondary-900">Request #{ticket.ticket_number}</p>
                        <p className="text-sm text-secondary-600">{ticket.subject}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-secondary-500">
                          {getClientProgressLabel(ticket.status)}
                        </p>
                        <p className="text-xs text-secondary-500">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="text-secondary-600">
            Here's what's happening with your waste management operations today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`card-hover p-6 animate-slide-up ${stat.onClick ? 'cursor-pointer' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={stat.onClick}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg ${stat.iconColor}`}>
                  {stat.icon}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.trend === 'up' ? 'bg-success-light/20 text-success-dark' :
                  stat.trend === 'down' ? 'bg-danger-light/20 text-danger-dark' :
                  'bg-secondary-100 text-secondary-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-sm font-medium text-secondary-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-secondary-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="card mb-8">
          <div className="p-6 border-b border-secondary-200">
            <h2 className="text-lg font-semibold text-secondary-900">Quick Actions</h2>
            <p className="text-sm text-secondary-600 mt-1">Common tasks to get you started</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`group p-5 rounded-xl border-2 border-secondary-200 hover:border-${action.color}-500 hover:shadow-md transition-all duration-200 text-left`}
                >
                  <div className={`inline-flex p-3 rounded-lg bg-${action.color}-50 text-${action.color}-600 mb-3 group-hover:scale-110 transition-transform duration-200`}>
                    {action.icon}
                  </div>
                  <h3 className="font-semibold text-secondary-900 mb-1">{action.label}</h3>
                  <p className="text-sm text-secondary-600">{action.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity & Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="card">
            <div className="p-6 border-b border-secondary-200">
              <h3 className="font-semibold text-secondary-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-full bg-secondary-100 mb-4">
                  <svg className="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-secondary-600 text-sm">No recent activity yet</p>
                <p className="text-secondary-500 text-xs mt-1">Activity will appear here once you start using the system</p>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          <div className="card">
            <div className="p-6 border-b border-secondary-200">
              <h3 className="font-semibold text-secondary-900">System Alerts</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-start p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <svg className="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-900">Welcome to WasteFlow!</p>
                    <p className="text-xs text-primary-700 mt-1">
                      Complete your setup by adding your first client and configuring email integration.
                    </p>
                  </div>
                </div>
                <div className="flex items-start p-4 bg-success-light/10 border border-success rounded-lg">
                  <svg className="w-5 h-5 text-success-dark mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-success-dark">System Status: Operational</p>
                    <p className="text-xs text-success-dark mt-1">
                      All services running normally.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
