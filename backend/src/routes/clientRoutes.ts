import { Router } from 'express';
import {
  createClient,
  getClient,
  listClients,
  updateClient,
  deleteClient,
  createSite,
  getSite,
  listSites,
  updateSite,
  deleteSite,
  createClientValidation,
  createSiteValidation,
} from '../controllers/clientController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

// Site routes MUST come before client :id routes to avoid route conflicts
router.post(
  '/sites',
  authorize(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.BROKER_OPS_AGENT),
  createSiteValidation,
  createSite
);
router.get('/sites', listSites);
router.get('/sites/:id', getSite);
router.put(
  '/sites/:id',
  authorize(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER),
  updateSite
);
router.delete(
  '/sites/:id',
  authorize(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER),
  deleteSite
);

// Client routes - MUST come after /sites routes to avoid conflicts
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.BROKER_OPS_AGENT),
  createClientValidation,
  createClient
);
router.get('/', listClients);
router.get('/:id', getClient);
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER),
  updateClient
);
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER),
  deleteClient
);

export default router;
