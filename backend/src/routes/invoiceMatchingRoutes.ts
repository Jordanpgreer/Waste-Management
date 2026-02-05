import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import {
  autoMatch,
  autoMatchValidation,
  getMatchingRecords,
  approveMatch,
  rejectMatch,
} from '../controllers/invoiceMatchingController';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Auto-match vendor invoice to PO - Billing/Finance, Account Managers, Admins
router.post(
  '/auto-match',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.ACCOUNT_MANAGER]),
  autoMatchValidation,
  autoMatch
);

// Get matching records for an invoice - All authenticated users
router.get('/records/:invoiceId', getMatchingRecords);

// Approve a match - Billing/Finance, Account Managers, Admins
router.post(
  '/records/:id/approve',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.ACCOUNT_MANAGER]),
  approveMatch
);

// Reject a match - Billing/Finance, Account Managers, Admins
router.post(
  '/records/:id/reject',
  requireRole([UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.ACCOUNT_MANAGER]),
  rejectMatch
);

export default router;
