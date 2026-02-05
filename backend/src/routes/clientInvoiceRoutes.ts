import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import {
  generateClientInvoice,
  generateClientInvoiceValidation,
  getClientInvoice,
  listClientInvoices,
  updateClientInvoice,
  deleteClientInvoice,
  approveClientInvoice,
  sendClientInvoice,
  markClientInvoiceAsPaid,
} from '../controllers/clientInvoiceController';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Generate client invoice - Billing/Finance, Account Managers, Admins
router.post(
  '/generate',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.ACCOUNT_MANAGER]),
  generateClientInvoiceValidation,
  generateClientInvoice
);

// List client invoices - All authenticated users (filtered by role)
router.get('/', listClientInvoices);

// Get single client invoice - All authenticated users
router.get('/:id', getClientInvoice);

// Update client invoice - Billing/Finance, Account Managers, Admins
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.ACCOUNT_MANAGER]),
  updateClientInvoice
);

// Delete client invoice - Admins only
router.delete('/:id', requireRole([UserRole.ADMIN]), deleteClientInvoice);

// Approve client invoice - Billing/Finance, Account Managers, Admins
router.post(
  '/:id/approve',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.ACCOUNT_MANAGER]),
  approveClientInvoice
);

// Send client invoice to client - Billing/Finance, Account Managers, Admins
router.post(
  '/:id/send',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.ACCOUNT_MANAGER]),
  sendClientInvoice
);

// Mark client invoice as paid - Billing/Finance, Admins
router.post(
  '/:id/mark-paid',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE]),
  markClientInvoiceAsPaid
);

export default router;
