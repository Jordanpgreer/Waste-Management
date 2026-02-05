import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { clientsApi, CreateClientInput } from '../api/clients';
import { Client } from '../types';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
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
    notes: '',
  });

  useEffect(() => {
    fetchClients();
  }, [page, searchTerm]);

  const fetchClients = async () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await clientsApi.updateClient(editingClient.id, formData);
      } else {
        await clientsApi.createClient(formData);
      }
      setShowModal(false);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error('Failed to save client:', error);
    }
  };

  const handleEdit = (client: Client) => {
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
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientsApi.deleteClient(id);
        fetchClients();
      } catch (error) {
        console.error('Failed to delete client:', error);
      }
    }
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
      notes: '',
    });
    setEditingClient(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
                    <tr key={client.id} className="hover:bg-secondary-50 transition-colors">
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
                          onClick={() => handleEdit(client)}
                          className="text-primary-600 hover:text-primary-900 mr-4 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
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
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingClient ? 'Update Client' : 'Create Client'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
