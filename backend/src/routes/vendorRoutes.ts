import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { UserRole } from '../types';
import {
  createVendor,
  getVendor,
  listVendors,
  updateVendor,
  deleteVendor,
  createVendorValidation,
} from '../controllers/vendorController';

const router = Router();

// All vendor routes require authentication
router.use(authenticate);

// List and create vendors (all broker staff can view, only admin/ops/vendor_manager can create)
router.get('/', listVendors);
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.BROKER_OPS_AGENT, UserRole.VENDOR_MANAGER]),
  createVendorValidation,
  createVendor
);

// Single vendor operations
router.get('/:id', getVendor);
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.BROKER_OPS_AGENT, UserRole.VENDOR_MANAGER]),
  updateVendor
);
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.VENDOR_MANAGER]),
  deleteVendor
);

export default router;
