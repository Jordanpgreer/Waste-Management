import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadVendorInvoice } from '../api/vendorInvoice';
import { listVendors, Vendor } from '../api/vendor';
import { clientsApi } from '../api/clients';
import { Client } from '../types';

interface UploadVendorInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadVendorInvoiceModal: React.FC<UploadVendorInvoiceModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [clientId, setClientId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVendors();
    fetchClients();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await listVendors({ limit: 100 });
      setVendors(response.items);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientsApi.listClients({ limit: 100 });
      setClients(response.items);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
        setError('');
      }
    },
    onDropRejected: () => {
      setError('Only PDF files are accepted');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!vendorId) {
      setError('Please select a vendor');
      return;
    }

    if (!selectedFile) {
      setError('Please select a PDF file to upload');
      return;
    }

    try {
      setUploading(true);
      await uploadVendorInvoice({
        vendorId,
        clientId: clientId || undefined,
        file: selectedFile,
      });
      onSuccess();
    } catch (error: any) {
      console.error('Failed to upload invoice:', error);
      setError(error.message || 'Failed to upload invoice. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Vendor Invoice</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="vendor" className="form-label">
                    Vendor <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="vendor"
                    className="form-select"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    required
                  >
                    <option value="">Select vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="client" className="form-label">
                    Client (Optional)
                  </label>
                  <select
                    id="client"
                    className="form-select"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    <option value="">Select client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Invoice PDF <span className="text-red-500">*</span>
                  </label>
                  <div
                    {...getRootProps()}
                    className={`mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 cursor-pointer ${
                      isDragActive ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="text-center">
                      {selectedFile ? (
                        <>
                          <svg
                            className="mx-auto h-12 w-12 text-green-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="mt-4 text-sm text-gray-600">
                            <p className="font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-gray-500">{formatFileSize(selectedFile.size)}</p>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Click or drag to replace file
                          </p>
                        </>
                      ) : (
                        <>
                          <svg
                            className="mx-auto h-12 w-12 text-gray-300"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <div className="mt-4 flex text-sm leading-6 text-gray-600">
                            <span className="font-semibold text-blue-600 hover:text-blue-500">
                              Upload a file
                            </span>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs leading-5 text-gray-600">PDF up to 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    The invoice will be processed with OCR to extract data automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={uploading}
                className="btn-primary w-full sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
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
                    Processing...
                  </>
                ) : (
                  'Upload & Process'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="btn-secondary mt-3 w-full sm:mt-0 sm:w-auto disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
