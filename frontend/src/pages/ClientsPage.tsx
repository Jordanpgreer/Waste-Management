import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { clientsApi, CreateClientInput, ServiceScheduleItem } from '../api/clients';
import { listClientInvoices, ClientInvoice } from '../api/clientInvoice';
import { listPOs, PurchaseOrder } from '../api/purchaseOrder';
import { listVendors, Vendor } from '../api/vendor';
import { ticketsApi } from '../api/tickets';
import { Client, ClientSite } from '../types';
import { Ticket, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS, TICKET_TYPE_LABELS } from '../types/ticket';
import { useNavigate } from 'react-router-dom';

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [activeClientTab, setActiveClientTab] = useState<'overview' | 'details' | 'sites' | 'openTickets' | 'contract' | 'financials'>('overview');
  const [viewClientSites, setViewClientSites] = useState<ClientSite[]>([]);
  const [viewClientSchedules, setViewClientSchedules] = useState<ServiceScheduleItem[]>([]);
  const [viewClientInvoices, setViewClientInvoices] = useState<ClientInvoice[]>([]);
  const [viewClientPOs, setViewClientPOs] = useState<PurchaseOrder[]>([]);
  const [viewClientOpenTickets, setViewClientOpenTickets] = useState<Ticket[]>([]);
  const [viewVendorsById, setViewVendorsById] = useState<Record<string, Vendor>>({});
  const [viewClientDataLoading, setViewClientDataLoading] = useState(false);
  const [viewClientDataError, setViewClientDataError] = useState<string | null>(null);
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  const [contractFileName, setContractFileName] = useState<string>('');
  const [contractUploadedAt, setContractUploadedAt] = useState<string>('');
  const [contractLoading, setContractLoading] = useState(false);
  const [contractUploading, setContractUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState<CreateClientInput>({
    name: '',
    legalName: '',
    industry: '',
    email: '',
    phone: '',
    billingEmail: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    assignedVendorId: '',
    notes: '',
  });

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientsApi.listClients({
        page,
        limit: 10,
        search: searchTerm || undefined,
      });
      setClients(response.items);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await clientsApi.createClient(formData);
      setShowModal(false);
      resetForm();
      fetchClients();
    } catch (error: any) {
      console.error('Failed to save client:', error);
      console.error('Error response:', error?.response);

      let errorMessage = 'Failed to save client. Please try again.';

      if (error?.response?.data?.error) {
        const err = error.response.data.error;
        errorMessage = err.message || 'Validation failed';

        // If there are validation details, show them
        if (err.details && Array.isArray(err.details)) {
          const details = err.details.map((d: any) => `${d.path || d.param}: ${d.msg}`).join('\n');
          errorMessage += '\n\nDetails:\n' + details;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const startInlineEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      legalName: client.legal_name || '',
      industry: client.industry || '',
      email: client.email || '',
      phone: client.phone || '',
      billingEmail: client.billing_email || '',
      billingAddress: client.billing_address || '',
      billingCity: client.billing_city || '',
      billingState: client.billing_state || '',
      billingZip: client.billing_zip || '',
      assignedVendorId: client.assigned_vendor_id || '',
      notes: client.notes || '',
    });
    setActiveClientTab('details');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientsApi.deleteClient(id);
        fetchClients();
        return true;
      } catch (error) {
        console.error('Failed to delete client:', error);
      }
    }
    return false;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      legalName: '',
      industry: '',
      email: '',
      phone: '',
      billingEmail: '',
      billingAddress: '',
      billingCity: '',
      billingState: '',
      billingZip: '',
      assignedVendorId: '',
      notes: '',
    });
    setEditingClient(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (!viewingClient) {
      return;
    }

    setActiveClientTab('overview');
    setViewClientDataError(null);
    setViewClientDataLoading(true);
    setContractLoading(true);
    setContractUrl(null);
    setContractFileName('');
    setContractUploadedAt('');

    const loadClientInsights = async () => {
      try {
        const [sitesRes, scheduleRes, invoiceRes, poRes, vendorRes, openTicketsRes] = await Promise.all([
          clientsApi.listSites({ clientId: viewingClient.id, limit: 100 }),
          clientsApi.listServiceSchedule().catch(() => [] as ServiceScheduleItem[]),
          listClientInvoices({ client_id: viewingClient.id, limit: 100 }).catch(() => ({
            items: [],
            total: 0,
            total_pages: 0,
          })),
          listPOs({ client_id: viewingClient.id, limit: 100 }).catch(() => ({
            items: [],
            total: 0,
            total_pages: 0,
          })),
          listVendors({ limit: 500 }).catch(() => ({
            items: [],
            total: 0,
            total_pages: 0,
          })),
          ticketsApi.listTickets({
            client_id: viewingClient.id,
            status_bucket: 'open',
            limit: 100,
            page: 1,
          }).catch(() => ({
            items: [],
            total: 0,
            total_pages: 0,
          })),
        ]);

        const sites = sitesRes?.items || [];
        const siteIds = new Set(sites.map((site: ClientSite) => site.id));
        const scopedSchedules = (scheduleRes || []).filter((item) => siteIds.has(item.site_id));

        const vendorMap: Record<string, Vendor> = {};
        (vendorRes.items || []).forEach((vendor: Vendor) => {
          vendorMap[vendor.id] = vendor;
        });

        setViewClientSites(sites);
        setViewClientSchedules(scopedSchedules);
        setViewClientInvoices(invoiceRes.items || []);
        setViewClientPOs(poRes.items || []);
        setViewVendorsById(vendorMap);
        setViewClientOpenTickets(openTicketsRes.items || []);

        try {
          const contract = await clientsApi.getClientContractDownload(viewingClient.id);
          setContractUrl(contract.url);
          setContractFileName(contract.file_name || '');
          setContractUploadedAt(contract.uploaded_at || '');
        } catch {
          setContractUrl(null);
          setContractFileName('');
          setContractUploadedAt('');
        } finally {
          setContractLoading(false);
        }
      } catch (error) {
        console.error('Failed to load client detail insights:', error);
        setViewClientDataError('Some client analytics could not be loaded.');
        setContractLoading(false);
      } finally {
        setViewClientDataLoading(false);
      }
    };

    void loadClientInsights();
  }, [viewingClient]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount || 0));

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  };

  const dayOfWeekLabel = (day: number | null) => {
    if (day === null || day === undefined) return 'N/A';
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return labels[day] || 'N/A';
  };

  const handleInlineClientSave = async () => {
    if (!viewingClient) return;

    setSubmitting(true);
    try {
      const updated = await clientsApi.updateClient(viewingClient.id, formData);
      setViewingClient(updated);
      setEditingClient(null);
      fetchClients();
    } catch (error: any) {
      console.error('Failed to update client:', error);
      alert(error?.response?.data?.error?.message || 'Failed to update client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContractUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!viewingClient || !event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    setContractUploading(true);
    try {
      const updatedClient = await clientsApi.uploadClientContract(viewingClient.id, file);
      setViewingClient(updatedClient);

      const contract = await clientsApi.getClientContractDownload(viewingClient.id);
      setContractUrl(contract.url);
      setContractFileName(contract.file_name || file.name);
      setContractUploadedAt(contract.uploaded_at || new Date().toISOString());
      fetchClients();
    } catch (error: any) {
      console.error('Failed to upload client contract:', error);
      alert(error?.response?.data?.error?.message || 'Failed to upload contract');
    } finally {
      setContractUploading(false);
      event.target.value = '';
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="page-title">Clients</h1>
              <p className="page-subtitle">Manage your client accounts and relationships</p>
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
              Add Client
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search clients by name, email, or industry..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="card">
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-secondary-600">Loading clients...</span>
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="inline-flex p-4 rounded-full bg-primary-50 mb-4">
              <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">No clients found</h3>
            <p className="text-secondary-600 mb-6">
              {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first client'}
            </p>
            {!searchTerm && (
              <button onClick={() => setShowModal(true)} className="btn-primary">
                Add Your First Client
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
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-secondary-50 transition-colors cursor-pointer"
                      onClick={() => setViewingClient(client)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-semibold text-sm">
                              {client.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-secondary-900">{client.name}</div>
                            {client.legal_name && (
                              <div className="text-xs text-secondary-500">{client.legal_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-900">{client.email || '-'}</div>
                        <div className="text-xs text-secondary-500">{client.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge-primary">
                          {client.industry || 'Not specified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={client.is_active ? 'badge-success' : 'badge-danger'}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingClient(client);
                            startInlineEdit(client);
                          }}
                          className="text-primary-600 hover:text-primary-900 mr-4 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(client.id);
                          }}
                          className="text-danger hover:text-danger-dark transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
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

        {/* Modal */}
        {showModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-secondary-900 bg-opacity-50 transition-opacity" onClick={() => {
                setShowModal(false);
                resetForm();
              }}></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full animate-slide-up">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-secondary-900">
                        {editingClient ? 'Edit Client' : 'Add New Client'}
                      </h3>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Client Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          className="input"
                          placeholder="ABC Company"
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Legal Name
                        </label>
                        <input
                          type="text"
                          name="legalName"
                          className="input"
                          placeholder="ABC Company LLC"
                          value={formData.legalName}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          className="input"
                          placeholder="contact@abccompany.com"
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          className="input"
                          placeholder="+1 (555) 123-4567"
                          value={formData.phone}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Industry
                        </label>
                        <input
                          type="text"
                          name="industry"
                          className="input"
                          placeholder="Manufacturing, Retail, etc."
                          value={formData.industry}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          rows={3}
                          className="input"
                          placeholder="Additional information..."
                          value={formData.notes}
                          onChange={handleChange}
                        />
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
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={submitting}>
                      {submitting ? 'Saving...' : (editingClient ? 'Update Client' : 'Create Client')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {viewingClient && (
          <div className="fixed z-50 inset-0 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-secondary-900 bg-opacity-50 transition-opacity"
                onClick={() => setViewingClient(null)}
              ></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full animate-slide-up">
                <div className="bg-white px-6 pt-6 pb-5 border-b border-secondary-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-secondary-900">{viewingClient.name}</h3>
                      <p className="text-sm text-secondary-500">Client Profile</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingClient(null)}
                      className="text-secondary-400 hover:text-secondary-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 min-h-[520px]">
                  <div className="col-span-12 md:col-span-3 border-r border-secondary-100 bg-secondary-50/60 p-4">
                    <div className="space-y-2">
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          activeClientTab === 'overview'
                            ? 'bg-primary-100 text-primary-800'
                            : 'text-secondary-700 hover:bg-white'
                        }`}
                        onClick={() => setActiveClientTab('overview')}
                      >
                        Overview
                      </button>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          activeClientTab === 'details'
                            ? 'bg-primary-100 text-primary-800'
                            : 'text-secondary-700 hover:bg-white'
                        }`}
                        onClick={() => setActiveClientTab('details')}
                      >
                        Client Details
                      </button>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          activeClientTab === 'financials'
                            ? 'bg-primary-100 text-primary-800'
                            : 'text-secondary-700 hover:bg-white'
                        }`}
                        onClick={() => setActiveClientTab('financials')}
                      >
                        Financials
                      </button>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          activeClientTab === 'sites'
                            ? 'bg-primary-100 text-primary-800'
                            : 'text-secondary-700 hover:bg-white'
                        }`}
                        onClick={() => setActiveClientTab('sites')}
                      >
                        Sites
                      </button>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          activeClientTab === 'contract'
                            ? 'bg-primary-100 text-primary-800'
                            : 'text-secondary-700 hover:bg-white'
                        }`}
                        onClick={() => setActiveClientTab('contract')}
                      >
                        Contract
                      </button>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          activeClientTab === 'openTickets'
                            ? 'bg-primary-100 text-primary-800'
                            : 'text-secondary-700 hover:bg-white'
                        }`}
                        onClick={() => setActiveClientTab('openTickets')}
                      >
                        Open Tickets
                      </button>
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-9 p-6">
                    {viewClientDataLoading ? (
                      <div className="h-full flex items-center justify-center text-secondary-600">
                        Loading client analytics...
                      </div>
                    ) : (
                      <>
                        {viewClientDataError && (
                          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-dark">
                            {viewClientDataError}
                          </div>
                        )}

                        {activeClientTab === 'overview' && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase text-secondary-500">Client Name</p>
                                <p className="text-lg font-semibold text-secondary-900 mt-1">{viewingClient.name}</p>
                                <p className="text-sm text-secondary-600 mt-3">
                                  {[viewingClient.billing_address, viewingClient.billing_city, viewingClient.billing_state, viewingClient.billing_zip]
                                    .filter(Boolean)
                                    .join(', ') || 'Billing address not set'}
                                </p>
                              </div>
                              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase text-secondary-500">Service Schedule Snapshot</p>
                                <p className="text-sm text-secondary-900 mt-1">
                                  {viewClientSchedules.length > 0
                                    ? `${viewClientSchedules.length} scheduled service route${viewClientSchedules.length === 1 ? '' : 's'}`
                                    : 'No schedule configured yet'}
                                </p>
                                <p className="text-sm text-secondary-600 mt-2">
                                  {viewClientSites.length} active site{viewClientSites.length === 1 ? '' : 's'} for this client
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase text-secondary-500">Total Billed</p>
                                <p className="text-xl font-bold text-secondary-900 mt-1">
                                  {formatCurrency(viewClientInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0))}
                                </p>
                              </div>
                              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase text-secondary-500">Outstanding AR</p>
                                <p className="text-xl font-bold text-warning-dark mt-1">
                                  {formatCurrency(
                                    viewClientInvoices
                                      .filter((inv) => inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'pending')
                                      .reduce((sum, inv) => sum + Number(inv.total || 0), 0)
                                  )}
                                </p>
                              </div>
                              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase text-secondary-500">PO Spend</p>
                                <p className="text-xl font-bold text-secondary-900 mt-1">
                                  {formatCurrency(viewClientPOs.reduce((sum, po) => sum + Number(po.total || 0), 0))}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
                              <div className="px-4 py-3 border-b border-secondary-100">
                                <p className="text-sm font-semibold text-secondary-800">Service Type / Frequency</p>
                              </div>
                              {viewClientSchedules.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-secondary-500">No service schedule entries yet.</div>
                              ) : (
                                <div className="max-h-64 overflow-y-auto">
                                  <table className="min-w-full">
                                    <thead className="bg-secondary-50">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Site</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Service</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Frequency</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Day</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-secondary-100">
                                      {viewClientSchedules.map((item) => (
                                        <tr key={item.id} className="hover:bg-secondary-50">
                                          <td className="px-4 py-2 text-sm text-secondary-900">{item.site_name}</td>
                                          <td className="px-4 py-2 text-sm text-secondary-700">{item.service_type}</td>
                                          <td className="px-4 py-2 text-sm text-secondary-700">{item.frequency}</td>
                                          <td className="px-4 py-2 text-sm text-secondary-700">{dayOfWeekLabel(item.day_of_week)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {activeClientTab === 'details' && (
                          <div className="space-y-5">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold text-secondary-900">Client Details</h4>
                              {!editingClient ? (
                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() => startInlineEdit(viewingClient)}
                                >
                                  Edit Client
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setEditingClient(null)}
                                    disabled={submitting}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => void handleInlineClientSave()}
                                    disabled={submitting}
                                  >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                  </button>
                                </div>
                              )}
                            </div>

                            {!editingClient ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-semibold text-secondary-500 uppercase">Legal Name</p>
                                  <p className="text-sm text-secondary-900 mt-1">{viewingClient.legal_name || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-secondary-500 uppercase">Industry</p>
                                  <p className="text-sm text-secondary-900 mt-1">{viewingClient.industry || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-secondary-500 uppercase">Email</p>
                                  <p className="text-sm text-secondary-900 mt-1">{viewingClient.email || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-secondary-500 uppercase">Phone</p>
                                  <p className="text-sm text-secondary-900 mt-1">{viewingClient.phone || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-secondary-500 uppercase">Billing Email</p>
                                  <p className="text-sm text-secondary-900 mt-1">{viewingClient.billing_email || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-secondary-500 uppercase">Status</p>
                                  <p className="mt-1">
                                    <span className={viewingClient.is_active ? 'badge-success' : 'badge-danger'}>
                                      {viewingClient.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </p>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="text-xs font-semibold text-secondary-500 uppercase">Assigned Vendor</p>
                                  <p className="text-sm text-secondary-900 mt-1">
                                    {viewingClient.assigned_vendor_id
                                      ? (viewVendorsById[viewingClient.assigned_vendor_id]?.name || 'Assigned vendor')
                                      : (viewClientPOs.length > 0 ? (viewVendorsById[viewClientPOs[0].vendor_id]?.name || 'Assigned vendor') : 'Not assigned')}
                                  </p>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="text-xs font-semibold text-secondary-500 uppercase">Billing Address</p>
                                  <p className="text-sm text-secondary-900 mt-1">
                                    {[viewingClient.billing_address, viewingClient.billing_city, viewingClient.billing_state, viewingClient.billing_zip]
                                      .filter(Boolean)
                                      .join(', ') || '-'}
                                  </p>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="text-xs font-semibold text-secondary-500 uppercase">Notes</p>
                                  <p className="text-sm text-secondary-900 mt-1 whitespace-pre-wrap">{viewingClient.notes || '-'}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-secondary-700 mb-2">Client Name</label>
                                  <input name="name" className="input" value={formData.name} onChange={handleChange} />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-secondary-700 mb-2">Legal Name</label>
                                  <input name="legalName" className="input" value={formData.legalName} onChange={handleChange} />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-secondary-700 mb-2">Industry</label>
                                  <input name="industry" className="input" value={formData.industry} onChange={handleChange} />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-secondary-700 mb-2">Email</label>
                                  <input name="email" type="email" className="input" value={formData.email} onChange={handleChange} />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-secondary-700 mb-2">Phone</label>
                                  <input name="phone" className="input" value={formData.phone} onChange={handleChange} />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-secondary-700 mb-2">Billing Email</label>
                                  <input name="billingEmail" type="email" className="input" value={formData.billingEmail} onChange={handleChange} />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-secondary-700 mb-2">Assigned Vendor</label>
                                  <select
                                    className="input"
                                    name="assignedVendorId"
                                    value={formData.assignedVendorId || ''}
                                    onChange={(e) => setFormData({ ...formData, assignedVendorId: e.target.value })}
                                  >
                                    <option value="">Not assigned</option>
                                    {Object.values(viewVendorsById)
                                      .sort((a, b) => a.name.localeCompare(b.name))
                                      .map((vendor) => (
                                        <option key={vendor.id} value={vendor.id}>
                                          {vendor.name}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-secondary-700 mb-2">Billing Address</label>
                                  <input name="billingAddress" className="input mb-2" value={formData.billingAddress} onChange={handleChange} />
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <input name="billingCity" className="input" placeholder="City" value={formData.billingCity} onChange={handleChange} />
                                    <input name="billingState" className="input" placeholder="State" value={formData.billingState} onChange={handleChange} />
                                    <input name="billingZip" className="input" placeholder="ZIP" value={formData.billingZip} onChange={handleChange} />
                                  </div>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-secondary-700 mb-2">Notes</label>
                                  <textarea
                                    name="notes"
                                    rows={3}
                                    className="input"
                                    value={formData.notes}
                                    onChange={handleChange}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {activeClientTab === 'sites' && (
                          <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
                            <div className="px-4 py-3 border-b border-secondary-100">
                              <p className="text-sm font-semibold text-secondary-800">
                                Client Sites ({viewClientSites.length})
                              </p>
                            </div>
                            {viewClientSites.length === 0 ? (
                              <div className="px-4 py-6 text-sm text-secondary-500">No sites configured for this client yet.</div>
                            ) : (
                              <div className="max-h-[420px] overflow-y-auto">
                                <table className="min-w-full">
                                  <thead className="bg-secondary-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Site</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Address</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Manager</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-secondary-100">
                                    {viewClientSites.map((site) => (
                                      <tr key={site.id} className="hover:bg-secondary-50">
                                        <td className="px-4 py-2 text-sm text-secondary-900">{site.name}</td>
                                        <td className="px-4 py-2 text-sm text-secondary-700">
                                          {[site.address, site.city, site.state, site.zip].filter(Boolean).join(', ')}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-secondary-700">{site.site_manager_name || '-'}</td>
                                        <td className="px-4 py-2 text-sm">
                                          <span className={site.is_active ? 'badge-success' : 'badge-danger'}>
                                            {site.is_active ? 'Active' : 'Inactive'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {activeClientTab === 'contract' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-lg font-semibold text-secondary-900">Current Contract</h4>
                                <p className="text-sm text-secondary-500">
                                  Upload a PDF contract and review it in-place.
                                </p>
                              </div>
                              <label className="btn-primary cursor-pointer">
                                {contractUploading ? 'Uploading...' : 'Upload Contract PDF'}
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  onChange={handleContractUpload}
                                  disabled={contractUploading}
                                />
                              </label>
                            </div>

                            {contractLoading ? (
                              <div className="rounded-lg border border-secondary-200 bg-white p-6 text-secondary-600">
                                Loading contract...
                              </div>
                            ) : contractUrl ? (
                              <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
                                <div className="px-4 py-3 border-b border-secondary-100 bg-secondary-50">
                                  <p className="text-sm text-secondary-700">
                                    {contractFileName || 'Client Contract'}
                                    {contractUploadedAt ? ` • Uploaded ${formatDate(contractUploadedAt)}` : ''}
                                  </p>
                                </div>
                                <div className="h-[520px] overflow-auto bg-secondary-100">
                                  <iframe title="Client Contract PDF" src={contractUrl} className="w-full h-full" />
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-secondary-300 bg-white p-8 text-center text-secondary-500">
                                No contract uploaded yet.
                              </div>
                            )}
                          </div>
                        )}

                        {activeClientTab === 'openTickets' && (
                          <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
                            <div className="px-4 py-3 border-b border-secondary-100">
                              <p className="text-sm font-semibold text-secondary-800">
                                Open Tickets ({viewClientOpenTickets.length})
                              </p>
                            </div>
                            {viewClientOpenTickets.length === 0 ? (
                              <div className="px-4 py-6 text-sm text-secondary-500">
                                No open tickets for this client.
                              </div>
                            ) : (
                              <div className="max-h-[460px] overflow-y-auto">
                                <table className="min-w-full">
                                  <thead className="bg-secondary-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Ticket</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Type</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Status</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Priority</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-secondary-100">
                                    {viewClientOpenTickets.map((ticket) => (
                                      <tr
                                        key={ticket.id}
                                        className="hover:bg-secondary-50 cursor-pointer"
                                        onClick={() => {
                                          navigate(
                                            `/tickets?client_id=${encodeURIComponent(viewingClient.id)}&status_bucket=open&open_ticket=${encodeURIComponent(ticket.id)}`
                                          );
                                          setViewingClient(null);
                                        }}
                                      >
                                        <td className="px-4 py-2 text-sm">
                                          <p className="font-semibold text-primary-700">Request #{ticket.ticket_number}</p>
                                          <p className="text-secondary-700">{ticket.subject}</p>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-secondary-700">{TICKET_TYPE_LABELS[ticket.ticket_type]}</td>
                                        <td className="px-4 py-2 text-sm text-secondary-700">{TICKET_STATUS_LABELS[ticket.status]}</td>
                                        <td className="px-4 py-2 text-sm text-secondary-700">{TICKET_PRIORITY_LABELS[ticket.priority]}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {activeClientTab === 'financials' && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase text-secondary-500">Invoices</p>
                                <p className="text-2xl font-bold text-secondary-900 mt-1">{viewClientInvoices.length}</p>
                              </div>
                              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase text-secondary-500">Paid</p>
                                <p className="text-2xl font-bold text-success-dark mt-1">
                                  {formatCurrency(
                                    viewClientInvoices
                                      .filter((inv) => inv.status === 'paid')
                                      .reduce((sum, inv) => sum + Number(inv.total || 0), 0)
                                  )}
                                </p>
                              </div>
                              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase text-secondary-500">Outstanding</p>
                                <p className="text-2xl font-bold text-warning-dark mt-1">
                                  {formatCurrency(
                                    viewClientInvoices
                                      .filter((inv) => inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'pending')
                                      .reduce((sum, inv) => sum + Number(inv.total || 0), 0)
                                  )}
                                </p>
                              </div>
                              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase text-secondary-500">Margin Estimate</p>
                                {(() => {
                                  const billed = viewClientInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
                                  const spend = viewClientPOs.reduce((sum, po) => sum + Number(po.total || 0), 0);
                                  const margin = billed - spend;
                                  const marginPct = billed > 0 ? (margin / billed) * 100 : 0;
                                  return (
                                    <p className={`text-xl font-bold mt-1 ${margin >= 0 ? 'text-success-dark' : 'text-danger'}`}>
                                      {formatCurrency(margin)} ({marginPct.toFixed(1)}%)
                                    </p>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
                                <div className="px-4 py-3 border-b border-secondary-100">
                                  <p className="text-sm font-semibold text-secondary-800">Recent Client Invoices</p>
                                </div>
                                {viewClientInvoices.length === 0 ? (
                                  <div className="px-4 py-6 text-sm text-secondary-500">No invoices yet.</div>
                                ) : (
                                  <div className="max-h-64 overflow-y-auto">
                                    <table className="min-w-full">
                                      <thead className="bg-secondary-50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Invoice</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Date</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Status</th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-secondary-600 uppercase">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-secondary-100">
                                        {viewClientInvoices.slice(0, 10).map((inv) => (
                                          <tr key={inv.id} className="hover:bg-secondary-50">
                                            <td className="px-4 py-2 text-sm text-secondary-900">{inv.invoice_number}</td>
                                            <td className="px-4 py-2 text-sm text-secondary-700">{formatDate(inv.invoice_date)}</td>
                                            <td className="px-4 py-2 text-sm text-secondary-700 capitalize">{inv.status}</td>
                                            <td className="px-4 py-2 text-sm text-secondary-900 text-right">{formatCurrency(inv.total)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              <div className="rounded-lg border border-secondary-200 bg-white overflow-hidden">
                                <div className="px-4 py-3 border-b border-secondary-100">
                                  <p className="text-sm font-semibold text-secondary-800">Purchase Orders</p>
                                </div>
                                {viewClientPOs.length === 0 ? (
                                  <div className="px-4 py-6 text-sm text-secondary-500">No purchase orders yet.</div>
                                ) : (
                                  <div className="max-h-64 overflow-y-auto">
                                    <table className="min-w-full">
                                      <thead className="bg-secondary-50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">PO #</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Vendor</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600 uppercase">Status</th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-secondary-600 uppercase">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-secondary-100">
                                        {viewClientPOs.slice(0, 10).map((po) => (
                                          <tr key={po.id} className="hover:bg-secondary-50">
                                            <td className="px-4 py-2 text-sm text-secondary-900">{po.po_number}</td>
                                            <td className="px-4 py-2 text-sm text-secondary-700">
                                              {viewVendorsById[po.vendor_id]?.name || 'Unknown Vendor'}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-secondary-700 capitalize">{po.status}</td>
                                            <td className="px-4 py-2 text-sm text-secondary-900 text-right">{formatCurrency(po.total)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-secondary-50 px-6 py-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={async () => {
                      const deleted = await handleDelete(viewingClient.id);
                      if (deleted) {
                        setViewingClient(null);
                      }
                    }}
                    className="btn-secondary text-danger border-danger hover:bg-danger/5"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      startInlineEdit(viewingClient);
                    }}
                    className="btn-primary"
                  >
                    Edit Client
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
