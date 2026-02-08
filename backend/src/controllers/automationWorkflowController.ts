import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';
import {
  AutomationWorkflowService,
  CreateAutomationWorkflowInput,
  UpdateAutomationWorkflowInput,
} from '../services/automationWorkflowService';

const TICKET_TYPES = [
  'missed_pickup',
  'extra_pickup',
  'new_service',
  'modify_service',
  'container_delivery',
  'container_swap',
  'contamination',
  'lock_key_issue',
  'access_issue',
  'billing_dispute',
  'site_cleanup',
  'compactor_maintenance',
  'other',
];

const ACTION_TYPES = ['email_vendor', 'email_client', 'update_status', 'internal_note', 'wait'];

export const createAutomationWorkflowValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Name must be between 2 and 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description is too long'),
  body('ticket_type').isIn(TICKET_TYPES).withMessage('Invalid ticket type'),
  body('trigger_event').optional().isIn(['ticket_created']).withMessage('Invalid trigger event'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  body('steps').isArray({ min: 0 }).withMessage('steps must be an array'),
  body('steps.*.id').optional().isString().withMessage('Step id is invalid'),
  body('steps.*.action_type').optional().isIn(ACTION_TYPES).withMessage('Invalid action type'),
  body('steps.*.title').optional().isString().withMessage('Step title is invalid'),
];

export const updateAutomationWorkflowValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Name must be between 2 and 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description is too long'),
  body('ticket_type').optional().isIn(TICKET_TYPES).withMessage('Invalid ticket type'),
  body('trigger_event').optional().isIn(['ticket_created']).withMessage('Invalid trigger event'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  body('steps').optional().isArray({ min: 0 }).withMessage('steps must be an array'),
  body('steps.*.id').optional().isString().withMessage('Step id is invalid'),
  body('steps.*.action_type').optional().isIn(ACTION_TYPES).withMessage('Invalid action type'),
  body('steps.*.title').optional().isString().withMessage('Step title is invalid'),
];

export class AutomationWorkflowController {
  constructor(private readonly service: AutomationWorkflowService) {}

  async listWorkflows(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const ticketType = typeof req.query.ticket_type === 'string' ? req.query.ticket_type : undefined;
      const workflows = await this.service.listWorkflows(orgId, ticketType);

      const response: ApiResponse = {
        success: true,
        data: { items: workflows },
      };
      return res.status(200).json(response);
    } catch (error) {
      return next(error);
    }
  }

  async createWorkflow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user!.userId;

      const input: CreateAutomationWorkflowInput = {
        name: req.body.name,
        description: req.body.description,
        ticket_type: req.body.ticket_type,
        trigger_event: req.body.trigger_event || 'ticket_created',
        is_active: typeof req.body.is_active === 'boolean' ? req.body.is_active : true,
        steps: Array.isArray(req.body.steps) ? req.body.steps : [],
      };

      const workflow = await this.service.createWorkflow(orgId, userId, input);

      const response: ApiResponse = {
        success: true,
        data: { workflow },
      };
      return res.status(201).json(response);
    } catch (error) {
      return next(error);
    }
  }

  async updateWorkflow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user!.userId;
      const workflowId = req.params.id as string;

      const input: UpdateAutomationWorkflowInput = {
        name: req.body.name,
        description: req.body.description,
        ticket_type: req.body.ticket_type,
        trigger_event: req.body.trigger_event,
        is_active: req.body.is_active,
        steps: req.body.steps,
      };

      const workflow = await this.service.updateWorkflow(orgId, workflowId, userId, input);
      if (!workflow) {
        const response: ApiResponse = {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Workflow not found' },
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: { workflow },
      };
      return res.status(200).json(response);
    } catch (error) {
      return next(error);
    }
  }

  async deleteWorkflow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.orgId;
      const workflowId = req.params.id as string;
      const removed = await this.service.deleteWorkflow(orgId, workflowId);

      if (!removed) {
        const response: ApiResponse = {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Workflow not found' },
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: { message: 'Workflow deleted' },
      };
      return res.status(200).json(response);
    } catch (error) {
      return next(error);
    }
  }
}

