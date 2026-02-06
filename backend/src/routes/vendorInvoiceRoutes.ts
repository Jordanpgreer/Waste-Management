import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { UserRole } from '../types';
import { uploadSinglePDF } from '../middleware/fileUpload';
import {
  uploadVendorInvoice,
  getVendorInvoice,
  listVendorInvoices,
  updateVendorInvoice,
  deleteVendorInvoice,
  getVendorInvoicePdf,
  uploadVendorInvoiceValidation,
  updateVendorInvoiceValidation,
} from '../controllers/vendorInvoiceController';

const router = Router();

// All vendor invoice routes require authentication
router.use(authenticate);

// Upload vendor invoice with PDF (vendor_manager, billing_finance, admin)
router.post(
  '/upload',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.VENDOR_MANAGER]),
  uploadSinglePDF,
  uploadVendorInvoiceValidation,
  uploadVendorInvoice
);

// List vendor invoices (all authenticated users can view)
router.get('/', listVendorInvoices);

// Get single vendor invoice
router.get('/:id', getVendorInvoice);

// Get PDF download URL
router.get('/:id/pdf', getVendorInvoicePdf);

// Update vendor invoice (vendor_manager, billing_finance, admin)
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.VENDOR_MANAGER]),
  updateVendorInvoiceValidation,
  updateVendorInvoice
);

// Delete vendor invoice (admin, billing_finance only)
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE]),
  deleteVendorInvoice
);

export default router;
