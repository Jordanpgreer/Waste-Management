import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ticketsApi, CreateTicketInput, TicketFilters } from '../api/tickets';
import { clientsApi } from '../api/clients';
import { Ticket, TicketType, TicketStatus, TicketPriority, TICKET_TYPE_LABELS, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '../types/ticket';
import { Client, ClientSite } from '../types';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState<TicketFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateTicketInput>({
    client_id: '',
    site_id: '',
    subject: '',
    description: '',
    ticket_type: 'other',
    priority: 'medium',
  });

  const [autoClassification, setAutoClassification] = useState<any>(null);
  const [classifying, setClassifying] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ticketsApi.listTickets({
        ...filters,
        search: searchTerm || undefined,
        page,
        limit: 10,
      });
      setTickets(response.items);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters, searchTerm]);

  useEffect(() => {
    fetchTickets();
    fetchClients();
  }, [fetchTickets]);

  useEffect(() => {
    if (formData.client_id) {
      fetchSitesForClient(formData.client_id);
    }
  }, [formData.client_id]);

  const fetchClients = async () => {
    try {
      const response = await clientsApi.listClients({ limit: 100 });
      setClients(response.items);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchSitesForClient = async (clientId: string) => {
    try {
      const response = await clientsApi.listSites({ clientId: clientId, limit: 100 });
      setSites(response.items);
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    }
  };

  const handleAutoClassify = async () => {
    if (!formData.subject) return;

    try {
      setClassifying(true);
      const result = await ticketsApi.classifyTicket(formData.subject, formData.description);
      setAutoClassification(result);

      // Auto-fill suggested values
      setFormData({
        ...formData,
        ticket_type: result.ticket_type,
        priority: result.priority,
      });
    } catch (error) {
      console.error('Auto-classification failed:', error);
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ticketsApi.createTicket(formData);
      setShowModal(false);
      resetForm();
      fetchTickets();
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleViewTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await ticketsApi.updateTicket(ticketId, { status: newStatus });
      fetchTickets();
      if (selectedTicket) {
        const updated = await ticketsApi.getTicket(ticketId);
        setSelectedTicket(updated);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      site_id: '',
      subject: '',
      description: '',
      ticket_type: 'other',
      priority: 'medium',
    });
    setAutoClassification(null);
  };

  const getStatusBadgeColor = (status: TicketStatus): string => {
    const colors: Record<TicketStatus, string> = {
      new: 'bg-info-light/20 text-info-dark border-info',
      triaged: 'bg-purple-100 text-purple-800 border-purple-300',
      vendor_assigned: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      scheduled: 'bg-warning-light/20 text-warning-dark border-warning',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      completed: 'bg-success-light/20 text-success-dark border-success',
      verified: 'bg-teal-100 text-teal-800 border-teal-300',
      closed: 'bg-secondary-100 text-secondary-600 border-secondary-300',
      cancelled: 'bg-danger-light/20 text-danger-dark border-danger',
    };
    return colors[status] || 'bg-secondary-100 text-secondary-600';
  };

  const getPriorityBadgeColor = (priority: TicketPriority): string => {
    const colors: Record<TicketPriority, string> = {
      low: 'bg-secondary-100 text-secondary-600',
      medium: 'bg-info-light/20 text-info-dark',
      high: 'bg-warning-light/20 text-warning-dark',
      urgent: 'bg-danger-light/20 text-danger-dark',
    };
    return colors[priority];
  };

  const getSLAStatus = (slaDueAt: string | null): { text: string; color: string } => {
    if (!slaDueAt) return { text: 'No SLA', color: 'text-secondary-500' };

    const now = new Date();
    const due = new Date(slaDueAt);
    const diff = due.getTime() - now.getTime();
    const hoursLeft = diff / (1000 * 60 * 60);

    if (diff < 0) {
      return { text: 'Overdue', color: 'text-danger font-semibold' };
    } else if (hoursLeft < 6) {
      return { text: `${Math.round(hoursLeft)}h left`, color: 'text-warning-dark font-semibold' };
    } else {
      return { text: `${Math.round(hoursLeft)}h left`, color: 'text-success-dark' };
    }
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Unknown';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const getNextStatusOptions = (currentStatus: TicketStatus): TicketStatus[] => {
    const workflow: Record<TicketStatus, TicketStatus[]> = {
      new: ['triaged', 'cancelled'],
      triaged: ['vendor_assigned', 'cancelled'],
      vendor_assigned: ['scheduled', 'cancelled'],
      scheduled: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: ['verified', 'closed'],
      verified: ['closed'],
      closed: [],
      cancelled: [],
    };
    return workflow[currentStatus] || [];
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="page-title">Tickets</h1>
              <p className="page-subtitle">Manage service requests and issues</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="btn-primary flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Ticket
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search tickets..."
                  className="input pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="input"
                value={filters.status || ''}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value as TicketStatus || undefined });
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                className="input"
                value={filters.priority || ''}
                onChange={(e) => {
                  setFilters({ ...filters, priority: e.target.value as TicketPriority || undefined });
                  setPage(1);
                }}
              >
                <option value="">All Priorities</option>
                {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Escalated Filter */}
            <div>
              <select
                className="input"
                value={filters.is_escalated === undefined ? '' : filters.is_escalated.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({
                    ...filters,
                    is_escalated: value === '' ? undefined : value === 'true'
                  });
                  setPage(1);
                }}
              >
                <option value="">All Tickets</option>
                <option value="true">Escalated Only</option>
                <option value="false">Not Escalated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="card">
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-secondary-600">Loading tickets...</span>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="inline-flex p-4 rounded-full bg-primary-50 mb-4">
              <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">No tickets found</h3>
            <p className="text-secondary-600 mb-6">
              {searchTerm || Object.keys(filters).length > 0
                ? 'Try adjusting your filters'
                : 'Get started by creating your first ticket'}
            </p>
            {!searchTerm && Object.keys(filters).length === 0 && (
              <button onClick={() => setShowModal(true)} className="btn-primary">
                Create Your First Ticket
              </button>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      SLA
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {tickets.map((ticket) => {
                    const slaStatus = getSLAStatus(ticket.sla_due_at);
                    return (
                      <tr key={ticket.id} className="hover:bg-secondary-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center">
                              <button
                                onClick={() => handleViewTicket(ticket)}
                                className="text-sm font-semibold text-primary-600 hover:text-primary-900"
                              >
                                {ticket.ticket_number}
                              </button>
                              {ticket.is_escalated && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-danger-light/20 text-danger-dark">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Escalated
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-secondary-500 mt-1">{ticket.subject}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-secondary-900">{getClientName(ticket.client_id)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="badge-primary text-xs">
                            {TICKET_TYPE_LABELS[ticket.ticket_type]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge border ${getStatusBadgeColor(ticket.status)}`}>
                            {TICKET_STATUS_LABELS[ticket.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${getPriorityBadgeColor(ticket.priority)}`}>
                            {TICKET_PRIORITY_LABELS[ticket.priority]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs ${slaStatus.color}`}>
                            {slaStatus.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewTicket(ticket)}
                            className="text-primary-600 hover:text-primary-900 transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-lg shadow-sm">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 rounded-l-lg border border-secondary-300 bg-white text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="relative inline-flex items-center px-6 py-2 border-t border-b border-secondary-300 bg-white text-sm font-medium text-secondary-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="relative inline-flex items-center px-4 py-2 rounded-r-lg border border-secondary-300 bg-white text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </nav>
          </div>
        )}

        {/* Create Ticket Modal */}
        {showModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-secondary-900 bg-opacity-50 transition-opacity"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              ></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full animate-slide-up">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-secondary-900">Create New Ticket</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          resetForm();
                        }}
                        className="text-secondary-400 hover:text-secondary-600 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            Client *
                          </label>
                          <select
                            name="client_id"
                            required
                            className="input"
                            value={formData.client_id}
                            onChange={handleChange}
                          >
                            <option value="">Select client</option>
                            {clients.map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            Site (optional)
                          </label>
                          <select
                            name="site_id"
                            className="input"
                            value={formData.site_id}
                            onChange={handleChange}
                            disabled={!formData.client_id}
                          >
                            <option value="">Select site</option>
                            {sites.map((site) => (
                              <option key={site.id} value={site.id}>
                                {site.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Subject *
                        </label>
                        <input
                          type="text"
                          name="subject"
                          required
                          className="input"
                          placeholder="Brief description of the issue"
                          value={formData.subject}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Description
                        </label>
                        <textarea
                          name="description"
                          rows={4}
                          className="input"
                          placeholder="Detailed description..."
                          value={formData.description}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Auto-Classification */}
                      {formData.subject && (
                        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-primary-900">AI Classification</span>
                            <button
                              type="button"
                              onClick={handleAutoClassify}
                              disabled={classifying}
                              className="text-xs btn-secondary py-1 px-3"
                            >
                              {classifying ? 'Analyzing...' : 'Auto-Classify'}
                            </button>
                          </div>
                          {autoClassification && (
                            <div className="text-xs text-primary-700 space-y-1">
                              <div>Suggested Type: <strong>{TICKET_TYPE_LABELS[autoClassification.ticket_type as TicketType]}</strong></div>
                              <div>Suggested Priority: <strong>{TICKET_PRIORITY_LABELS[autoClassification.priority as TicketPriority]}</strong></div>
                              <div>Confidence: <strong>{Math.round(autoClassification.confidence * 100)}%</strong></div>
                              <div>Estimated SLA: <strong>{autoClassification.estimated_sla_hours}h</strong></div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            Type *
                          </label>
                          <select
                            name="ticket_type"
                            className="input"
                            value={formData.ticket_type}
                            onChange={handleChange}
                          >
                            {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            Priority *
                          </label>
                          <select
                            name="priority"
                            className="input"
                            value={formData.priority}
                            onChange={handleChange}
                          >
                            {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-secondary-50 px-6 py-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Create Ticket
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Detail Modal */}
        {showDetailModal && selectedTicket && (
          <div className="fixed z-50 inset-0 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-secondary-900 bg-opacity-50 transition-opacity"
                onClick={() => setShowDetailModal(false)}
              ></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="bg-white px-6 pt-6 pb-4">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-secondary-900">
                        {selectedTicket.ticket_number}
                      </h3>
                      <p className="text-sm text-secondary-600 mt-1">{selectedTicket.subject}</p>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-secondary-400 hover:text-secondary-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-secondary-500">Status</span>
                        <div className="mt-1">
                          <span className={`badge border ${getStatusBadgeColor(selectedTicket.status)}`}>
                            {TICKET_STATUS_LABELS[selectedTicket.status]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-secondary-500">Priority</span>
                        <div className="mt-1">
                          <span className={`badge ${getPriorityBadgeColor(selectedTicket.priority)}`}>
                            {TICKET_PRIORITY_LABELS[selectedTicket.priority]}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-secondary-500">Type</span>
                        <div className="mt-1">
                          <span className="badge-primary">
                            {TICKET_TYPE_LABELS[selectedTicket.ticket_type]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-secondary-500">Client</span>
                        <div className="mt-1 text-sm font-medium text-secondary-900">
                          {getClientName(selectedTicket.client_id)}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-secondary-500">Created</span>
                        <div className="mt-1 text-sm text-secondary-900">
                          {new Date(selectedTicket.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-secondary-500">SLA</span>
                        <div className="mt-1">
                          <span className={`text-sm ${getSLAStatus(selectedTicket.sla_due_at).color}`}>
                            {getSLAStatus(selectedTicket.sla_due_at).text}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedTicket.description && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-secondary-700 mb-2">Description</h4>
                      <p className="text-sm text-secondary-600">{selectedTicket.description}</p>
                    </div>
                  )}

                  {/* Status Workflow */}
                  <div className="border-t border-secondary-200 pt-6">
                    <h4 className="text-sm font-semibold text-secondary-700 mb-4">Quick Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {getNextStatusOptions(selectedTicket.status).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(selectedTicket.id, status)}
                          className="btn-secondary text-sm"
                        >
                          Mark as {TICKET_STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
