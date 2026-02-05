import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import {
  createPO,
  createPOValidation,
  getPO,
  listPOs,
  updatePO,
  deletePO,
  approvePO,
  sendPO,
  linkPOToTicket,
  unlinkPOFromTicket,
} from '../controllers/purchaseOrderController';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create PO - Account Managers, Broker Ops, Admins
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.BROKER_OPS_AGENT]),
  createPOValidation,
  createPO
);

// Get single PO - All authenticated users
router.get('/:id', getPO);

// List POs - All authenticated users
router.get('/', listPOs);

// Update PO - Account Managers, Broker Ops, Admins
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.BROKER_OPS_AGENT]),
  updatePO
);

// Delete PO - Admins only
router.delete('/:id', requireRole([UserRole.ADMIN]), deletePO);

// Approve PO - Account Managers, Admins
router.post(
  '/:id/approve',
  requireRole([UserRole.ADMIN, UserRole.ACCOUNT_MANAGER]),
  approvePO
);

// Send PO to vendor - Account Managers, Broker Ops, Admins
router.post(
  '/:id/send',
  requireRole([UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.BROKER_OPS_AGENT]),
  sendPO
);

// Link PO to ticket - Account Managers, Broker Ops, Admins
router.post(
  '/:id/tickets',
  requireRole([UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.BROKER_OPS_AGENT]),
  linkPOToTicket
);

// Unlink PO from ticket - Account Managers, Broker Ops, Admins
router.delete(
  '/:id/tickets/:ticketId',
  requireRole([UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.BROKER_OPS_AGENT]),
  unlinkPOFromTicket
);

export default router;
