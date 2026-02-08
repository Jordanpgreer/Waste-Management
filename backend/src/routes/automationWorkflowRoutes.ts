import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { UserRole } from '../types';
import { validate } from '../middleware/validation';
import {
  AutomationWorkflowController,
  createAutomationWorkflowValidation,
  updateAutomationWorkflowValidation,
} from '../controllers/automationWorkflowController';

export const createAutomationWorkflowRoutes = (
  controller: AutomationWorkflowController
): Router => {
  const router = Router();

  router.use(authenticate);
  router.use(requireRole([UserRole.ADMIN]));

  router.get('/', controller.listWorkflows.bind(controller));
  router.post('/', createAutomationWorkflowValidation, validate, controller.createWorkflow.bind(controller));
  router.put('/:id', updateAutomationWorkflowValidation, validate, controller.updateWorkflow.bind(controller));
  router.delete('/:id', controller.deleteWorkflow.bind(controller));

  return router;
};

