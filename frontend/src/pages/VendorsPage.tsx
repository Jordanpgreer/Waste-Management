import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { listVendors, deleteVendor, Vendor } from '../api/vendor';
import { CreateVendorModal } from '../components/CreateVendorModal';
import { EditVendorModal } from '../components/EditVendorModal';

const SERVICE_CAPABILITIES = [
  { value: 'waste', label: 'General Waste' },
  { value: 'recycle', label: 'Recycling' },
  { value: 'organics', label: 'Organics' },
  { value: 'roll_off', label: 'Roll-off Dumpsters' },
  { value: 'compactor', label: 'Compactor Service' },
  { value: 'portable_toilet', label: 'Portable Toilets' },
  { value: 'medical_waste', label: 'Medical Waste' },
  { value: 'hazardous_waste', label: 'Hazardous Waste' },
];

const VENDOR_TYPES = [
  { value: 'hauler', label: 'Hauler' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'broker', label: 'Broker' },
  { value: 'facility', label: 'Facility' },
];

export const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorTypeFilter, setVendorTypeFilter] = useState('');
  const [serviceCapabilityFilter, setServiceCapabilityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listVendors({
        page,
        limit: 10,
        search: searchTerm || undefined,
        vendorType: vendorTypeFilter || undefined,
        serviceCapability: serviceCapabilityFilter || undefined,
      });
      setVendors(response.items);
      setTotalPages(response.total_pages);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, vendorTypeFilter, serviceCapabilityFilter]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      try {
        await deleteVendor(id);
        fetchVendors();
      } catch (error) {
        console.error('Failed to delete vendor:', error);
        alert('Failed to delete vendor. Please try again.');
      }
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchVendors();
  };

  const handleEditSuccess = () => {
    setEditingVendor(null);
    fetchVendors();
  };

  const getPerformanceScoreBadge = (score?: number) => {
    if (score === undefined || score === null) {
      return <span className="badge bg-secondary-100 text-secondary-600">N/A</span>;
    }

    if (score >= 90) {
      return <span className="badge-success">{score}/100</span>;
    } else if (score >= 70) {
      return <span className="badge-info">{score}/100</span>;
    } else if (score >= 50) {
      return <span className="badge-warning">{score}/100</span>;
    } else {
      return <span className="badge-danger">{score}/100</span>;
    }
  };

  const getServiceCapabilityLabel = (capability: string) => {
    const found = SERVICE_CAPABILITIES.find(sc => sc.value === capability);
    return found ? found.label : capability;
  };

  const resetFilters = () => {
    setSearchTerm('');
    setVendorTypeFilter('');
    setServiceCapabilityFilter('');
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="page-title">Vendors</h1>
              <p className="page-subtitle">Manage your vendor network and service providers</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Vendor
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search vendors by name, legal name, or city..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              className="input w-auto min-w-[200px]"
              value={vendorTypeFilter}
              onChange={(e) => {
                setVendorTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Vendor Types</option>
              {VENDOR_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              className="input w-auto min-w-[200px]"
              value={serviceCapabilityFilter}
              onChange={(e) => {
                setServiceCapabilityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Service Capabilities</option>
              {SERVICE_CAPABILITIES.map((capability) => (
                <option key={capability.value} value={capability.value}>
                  {capability.label}
                </option>
              ))}
            </select>

            {(searchTerm || vendorTypeFilter || serviceCapabilityFilter) && (
              <button
                onClick={resetFilters}
                className="btn-secondary flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>

          {total > 0 && (
            <div className="text-sm text-secondary-600">
              Showing {vendors.length} of {total} vendor{total !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="card">
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-secondary-600">Loading vendors...</span>
            </div>
          </div>
        ) : vendors.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="inline-flex p-4 rounded-full bg-primary-50 mb-4">
              <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">No vendors found</h3>
            <p className="text-secondary-600 mb-6">
              {searchTerm || vendorTypeFilter || serviceCapabilityFilter
                ? 'Try adjusting your search criteria or filters'
                : 'Get started by adding your first vendor'}
            </p>
            {!searchTerm && !vendorTypeFilter && !serviceCapabilityFilter && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                Add Your First Vendor
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
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Service Capabilities
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Performance
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
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-secondary-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-secondary-900">{vendor.name}</div>
                            {vendor.legal_name && (
                              <div className="text-xs text-secondary-500">{vendor.legal_name}</div>
                            )}
                            {vendor.city && (
                              <div className="text-xs text-secondary-500">
                                {vendor.city}{vendor.state ? `, ${vendor.state}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {vendor.vendor_type ? (
                          <span className="badge-primary capitalize">
                            {vendor.vendor_type.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-sm text-secondary-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-secondary-900">{vendor.email || '-'}</div>
                        <div className="text-xs text-secondary-500">{vendor.phone || '-'}</div>
                        {vendor.emergency_phone && (
                          <div className="text-xs text-danger flex items-center mt-1">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Emergency: {vendor.emergency_phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {vendor.service_capabilities && vendor.service_capabilities.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {vendor.service_capabilities.slice(0, 2).map((capability) => (
                              <span key={capability} className="badge bg-blue-100 text-blue-800 text-xs">
                                {getServiceCapabilityLabel(capability)}
                              </span>
                            ))}
                            {vendor.service_capabilities.length > 2 && (
                              <span className="badge bg-secondary-100 text-secondary-600 text-xs">
                                +{vendor.service_capabilities.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-secondary-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPerformanceScoreBadge(vendor.performance_score)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={vendor.is_active ? 'badge-success' : 'badge-danger'}>
                          {vendor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="text-primary-600 hover:text-primary-900 mr-4 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.id)}
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

        {/* Modals */}
        {showCreateModal && (
          <CreateVendorModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCreateSuccess}
          />
        )}

        {editingVendor && (
          <EditVendorModal
            vendor={editingVendor}
            onClose={() => setEditingVendor(null)}
            onSuccess={handleEditSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
};
