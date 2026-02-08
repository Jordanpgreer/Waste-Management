import React, { useState, useEffect } from 'react';
import { updateVendor, Vendor, UpdateVendorInput } from '../api/vendor';

interface EditVendorModalProps {
  vendor: Vendor;
  onClose: () => void;
  onSuccess: () => void;
}

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
  { value: 'direct_vendor', label: 'Direct Vendor' },
  { value: 'third_party_vendor', label: 'Third Party Vendor' },
];

export const EditVendorModal: React.FC<EditVendorModalProps> = ({ vendor, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateVendorInput>({
    name: vendor.name,
    legalName: vendor.legal_name || '',
    vendorType: vendor.vendor_type || '',
    email: vendor.email || '',
    phone: vendor.phone || '',
    emergencyPhone: vendor.emergency_phone || '',
    address: vendor.address || '',
    city: vendor.city || '',
    state: vendor.state || '',
    zip: vendor.zip || '',
    website: vendor.website || '',
    primaryContactName: vendor.primary_contact_name || '',
    primaryContactPhone: vendor.primary_contact_phone || '',
    primaryContactEmail: vendor.primary_contact_email || '',
    serviceCapabilities: vendor.service_capabilities || [],
    coverageAreas: vendor.coverage_areas || [],
    performanceScore: vendor.performance_score !== undefined ? vendor.performance_score : 75,
  });
  const [coverageAreasInput, setCoverageAreasInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize coverage areas input
    if (vendor.coverage_areas && vendor.coverage_areas.length > 0) {
      setCoverageAreasInput(vendor.coverage_areas.join(', '));
    }
  }, [vendor]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleServiceCapabilityToggle = (capability: string) => {
    setFormData((prev) => {
      const current = prev.serviceCapabilities || [];
      const exists = current.includes(capability);
      return {
        ...prev,
        serviceCapabilities: exists
          ? current.filter((c) => c !== capability)
          : [...current, capability],
      };
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Vendor name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.primaryContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryContactEmail)) {
      errors.primaryContactEmail = 'Invalid email format';
    }

    if (formData.website && formData.website.trim() !== '' && !/^https?:\/\/.+/.test(formData.website)) {
      errors.website = 'Website must start with http:// or https://';
    }

    if (formData.performanceScore !== undefined) {
      const score = Number(formData.performanceScore);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.performanceScore = 'Performance score must be between 0 and 100';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Parse coverage areas from comma-separated input
      const coverageAreas = coverageAreasInput
        .split(',')
        .map((area) => area.trim())
        .filter((area) => area.length > 0);

      const submitData: UpdateVendorInput = {
        ...formData,
        coverageAreas: coverageAreas.length > 0 ? coverageAreas : undefined,
        // Convert empty strings to undefined
        legalName: formData.legalName?.trim() || undefined,
        vendorType: formData.vendorType || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        emergencyPhone: formData.emergencyPhone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        state: formData.state?.trim() || undefined,
        zip: formData.zip?.trim() || undefined,
        website: formData.website?.trim() || undefined,
        primaryContactName: formData.primaryContactName?.trim() || undefined,
        primaryContactPhone: formData.primaryContactPhone?.trim() || undefined,
        primaryContactEmail: formData.primaryContactEmail?.trim() || undefined,
        serviceCapabilities:
          formData.serviceCapabilities && formData.serviceCapabilities.length > 0
            ? formData.serviceCapabilities
            : undefined,
      };

      await updateVendor(vendor.id, submitData);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to update vendor:', err);
      setError(err.response?.data?.message || 'Failed to update vendor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto animate-fade-in">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-secondary-900 bg-opacity-50 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full animate-slide-up">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-secondary-900">Edit Vendor</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-secondary-400 hover:text-secondary-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-danger-light border border-danger rounded-lg">
                  <div className="flex">
                    <svg
                      className="w-5 h-5 text-danger mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm text-danger-dark">{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-sm font-semibold text-secondary-900 mb-3 uppercase tracking-wide">
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Vendor Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className={validationErrors.name ? 'input-error' : 'input'}
                        placeholder="ABC Waste Services"
                        value={formData.name}
                        onChange={handleChange}
                      />
                      {validationErrors.name && (
                        <p className="mt-1 text-xs text-danger">{validationErrors.name}</p>
                      )}
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Legal Name
                      </label>
                      <input
                        type="text"
                        name="legalName"
                        className="input"
                        placeholder="ABC Waste Services LLC"
                        value={formData.legalName}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Vendor Type
                      </label>
                      <select
                        name="vendorType"
                        className="input"
                        value={formData.vendorType}
                        onChange={handleChange}
                      >
                        <option value="">Select type...</option>
                        {VENDOR_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Website
                      </label>
                      <input
                        type="text"
                        name="website"
                        className={validationErrors.website ? 'input-error' : 'input'}
                        placeholder="https://abcwaste.com"
                        value={formData.website}
                        onChange={handleChange}
                      />
                      {validationErrors.website && (
                        <p className="mt-1 text-xs text-danger">{validationErrors.website}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-semibold text-secondary-900 mb-3 uppercase tracking-wide">
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        className={validationErrors.email ? 'input-error' : 'input'}
                        placeholder="contact@abcwaste.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                      {validationErrors.email && (
                        <p className="mt-1 text-xs text-danger">{validationErrors.email}</p>
                      )}
                    </div>

                    <div className="col-span-2 sm:col-span-1">
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

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Emergency Phone
                      </label>
                      <input
                        type="tel"
                        name="emergencyPhone"
                        className="input"
                        placeholder="+1 (555) 999-9999"
                        value={formData.emergencyPhone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h4 className="text-sm font-semibold text-secondary-900 mb-3 uppercase tracking-wide">
                    Address Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        className="input"
                        placeholder="123 Main Street"
                        value={formData.address}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        className="input"
                        placeholder="New York"
                        value={formData.city}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-span-1 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        className="input"
                        placeholder="NY"
                        maxLength={2}
                        value={formData.state}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-span-1 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="zip"
                        className="input"
                        placeholder="10001"
                        value={formData.zip}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Contact */}
                <div>
                  <h4 className="text-sm font-semibold text-secondary-900 mb-3 uppercase tracking-wide">
                    Primary Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        name="primaryContactName"
                        className="input"
                        placeholder="John Smith"
                        value={formData.primaryContactName}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        name="primaryContactPhone"
                        className="input"
                        placeholder="+1 (555) 123-4567"
                        value={formData.primaryContactPhone}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        name="primaryContactEmail"
                        className={
                          validationErrors.primaryContactEmail ? 'input-error' : 'input'
                        }
                        placeholder="john.smith@abcwaste.com"
                        value={formData.primaryContactEmail}
                        onChange={handleChange}
                      />
                      {validationErrors.primaryContactEmail && (
                        <p className="mt-1 text-xs text-danger">
                          {validationErrors.primaryContactEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Service Capabilities */}
                <div>
                  <h4 className="text-sm font-semibold text-secondary-900 mb-3 uppercase tracking-wide">
                    Service Capabilities
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SERVICE_CAPABILITIES.map((capability) => (
                      <label
                        key={capability.value}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            formData.serviceCapabilities?.includes(capability.value) || false
                          }
                          onChange={() => handleServiceCapabilityToggle(capability.value)}
                          className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-success"
                        />
                        <span className="text-sm text-secondary-700">{capability.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Coverage Areas */}
                <div>
                  <h4 className="text-sm font-semibold text-secondary-900 mb-3 uppercase tracking-wide">
                    Coverage Areas
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      ZIP Codes (comma-separated)
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="10001, 10002, 10003"
                      value={coverageAreasInput}
                      onChange={(e) => setCoverageAreasInput(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-secondary-500">
                      Enter ZIP codes separated by commas
                    </p>
                  </div>
                </div>

                {/* Performance Score */}
                <div>
                  <h4 className="text-sm font-semibold text-secondary-900 mb-3 uppercase tracking-wide">
                    Performance Score
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Score (0-100)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        name="performanceScore"
                        min="0"
                        max="100"
                        className="flex-1"
                        value={formData.performanceScore}
                        onChange={handleChange}
                      />
                      <span className="text-lg font-semibold text-primary-600 w-12 text-center">
                        {formData.performanceScore}
                      </span>
                    </div>
                    {validationErrors.performanceScore && (
                      <p className="mt-1 text-xs text-danger">
                        {validationErrors.performanceScore}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-secondary-50 px-6 py-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Update Vendor'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

