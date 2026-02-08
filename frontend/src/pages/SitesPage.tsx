import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { clientsApi, CreateSiteInput } from '../api/clients';
import { Client, ClientSite } from '../types';

export const SitesPage: React.FC = () => {
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<ClientSite | null>(null);
  const [viewingSite, setViewingSite] = useState<ClientSite | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState<CreateSiteInput>({
    clientId: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    siteManagerName: '',
    siteManagerPhone: '',
    siteManagerEmail: '',
    accessInstructions: '',
    operatingHours: '',
    specialInstructions: '',
  });

  const fetchSites = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientsApi.listSites({
        page,
        limit: 10,
        search: searchTerm || undefined,
      });
      setSites(response.items);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchSites();
    fetchClients();
  }, [fetchSites]);

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
    try {
      if (editingSite) {
        await clientsApi.updateSite(editingSite.id, formData);
      } else {
        await clientsApi.createSite(formData);
      }
      setShowModal(false);
      resetForm();
      fetchSites();
    } catch (error) {
      console.error('Failed to save site:', error);
    }
  };

  const handleEdit = (site: ClientSite) => {
    setEditingSite(site);
    setFormData({
      clientId: site.client_id,
      name: site.name,
      address: site.address,
      city: site.city,
      state: site.state,
      zip: site.zip,
      country: site.country,
      siteManagerName: site.site_manager_name || '',
      siteManagerPhone: site.site_manager_phone || '',
      siteManagerEmail: site.site_manager_email || '',
      accessInstructions: site.access_instructions || '',
      operatingHours: site.operating_hours || '',
      specialInstructions: site.special_instructions || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this site?')) {
      try {
        await clientsApi.deleteSite(id);
        fetchSites();
        return true;
      } catch (error) {
        console.error('Failed to delete site:', error);
      }
    }
    return false;
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
      siteManagerName: '',
      siteManagerPhone: '',
      siteManagerEmail: '',
      accessInstructions: '',
      operatingHours: '',
      specialInstructions: '',
    });
    setEditingSite(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown';
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="page-title">Sites</h1>
              <p className="page-subtitle">Manage service locations and site details</p>
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
              Add Site
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search sites by name, address, or city..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="card">
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-secondary-600">Loading sites...</span>
            </div>
          </div>
        ) : sites.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="inline-flex p-4 rounded-full bg-primary-50 mb-4">
              <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">No sites found</h3>
            <p className="text-secondary-600 mb-6">
              {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first site'}
            </p>
            {!searchTerm && (
              <button onClick={() => setShowModal(true)} className="btn-primary">
                Add Your First Site
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
                      Site
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Location
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
                  {sites.map((site) => (
                    <tr
                      key={site.id}
                      className="hover:bg-secondary-50 transition-colors cursor-pointer"
                      onClick={() => setViewingSite(site)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-success-light/30 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-success-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-secondary-900">{site.name}</div>
                            <div className="text-xs text-secondary-500">{site.address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge-primary">{getClientName(site.client_id)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-900">{site.city}, {site.state}</div>
                        <div className="text-xs text-secondary-500">{site.zip}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={site.is_active ? 'badge-success' : 'badge-danger'}>
                          {site.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(site);
                          }}
                          className="text-primary-600 hover:text-primary-900 mr-4 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(site.id);
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

        {showModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-secondary-900 bg-opacity-50 transition-opacity" onClick={() => {
                setShowModal(false);
                resetForm();
              }}></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full animate-slide-up">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-6 pt-6 pb-4 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-secondary-900">
                        {editingSite ? 'Edit Site' : 'Add New Site'}
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
                          Client *
                        </label>
                        <select
                          name="clientId"
                          required
                          className="input"
                          value={formData.clientId}
                          onChange={handleChange}
                        >
                          <option value="">Select a client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Site Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          className="input"
                          placeholder="Main Warehouse"
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Address *
                        </label>
                        <input
                          type="text"
                          name="address"
                          required
                          className="input"
                          placeholder="123 Industrial Pkwy"
                          value={formData.address}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          name="city"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-success focus:border-success"
                          value={formData.city}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          name="state"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-success focus:border-success"
                          value={formData.state}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          name="zip"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-success focus:border-success"
                          value={formData.zip}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Site Manager Name
                        </label>
                        <input
                          type="text"
                          name="siteManagerName"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-success focus:border-success"
                          value={formData.siteManagerName}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Site Manager Phone
                        </label>
                        <input
                          type="tel"
                          name="siteManagerPhone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-success focus:border-success"
                          value={formData.siteManagerPhone}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Site Manager Email
                        </label>
                        <input
                          type="email"
                          name="siteManagerEmail"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-success focus:border-success"
                          value={formData.siteManagerEmail}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Operating Hours
                        </label>
                        <input
                          type="text"
                          name="operatingHours"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-success focus:border-success"
                          placeholder="e.g., Mon-Fri 8am-5pm"
                          value={formData.operatingHours}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Access Instructions
                        </label>
                        <textarea
                          name="accessInstructions"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-success focus:border-success"
                          placeholder="Gate codes, parking instructions, etc."
                          value={formData.accessInstructions}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Special Instructions
                        </label>
                        <textarea
                          name="specialInstructions"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-success focus:border-success"
                          value={formData.specialInstructions}
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
                      {editingSite ? 'Update Site' : 'Create Site'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {viewingSite && (
          <div className="fixed z-50 inset-0 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-secondary-900 bg-opacity-50 transition-opacity"
                onClick={() => setViewingSite(null)}
              ></div>

              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full animate-slide-up">
                <div className="bg-white px-6 pt-6 pb-5">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-secondary-900">{viewingSite.name}</h3>
                      <p className="text-sm text-secondary-500">{getClientName(viewingSite.client_id)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingSite(null)}
                      className="text-secondary-400 hover:text-secondary-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-secondary-500 uppercase">Address</p>
                      <p className="text-sm text-secondary-900 mt-1">
                        {viewingSite.address}, {viewingSite.city}, {viewingSite.state} {viewingSite.zip}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-secondary-500 uppercase">Country</p>
                      <p className="text-sm text-secondary-900 mt-1">{viewingSite.country || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-secondary-500 uppercase">Status</p>
                      <p className="mt-1">
                        <span className={viewingSite.is_active ? 'badge-success' : 'badge-danger'}>
                          {viewingSite.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-secondary-500 uppercase">Site Manager</p>
                      <p className="text-sm text-secondary-900 mt-1">{viewingSite.site_manager_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-secondary-500 uppercase">Site Manager Phone</p>
                      <p className="text-sm text-secondary-900 mt-1">{viewingSite.site_manager_phone || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-secondary-500 uppercase">Site Manager Email</p>
                      <p className="text-sm text-secondary-900 mt-1">{viewingSite.site_manager_email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-secondary-500 uppercase">Operating Hours</p>
                      <p className="text-sm text-secondary-900 mt-1">{viewingSite.operating_hours || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-secondary-500 uppercase">Access Instructions</p>
                      <p className="text-sm text-secondary-900 mt-1 whitespace-pre-wrap">{viewingSite.access_instructions || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-secondary-500 uppercase">Special Instructions</p>
                      <p className="text-sm text-secondary-900 mt-1 whitespace-pre-wrap">{viewingSite.special_instructions || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary-50 px-6 py-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={async () => {
                      const deleted = await handleDelete(viewingSite.id);
                      if (deleted) {
                        setViewingSite(null);
                      }
                    }}
                    className="btn-secondary text-danger border-danger hover:bg-danger/5"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleEdit(viewingSite);
                      setViewingSite(null);
                    }}
                    className="btn-primary"
                  >
                    Edit Site
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

