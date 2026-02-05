import { Router } from 'express';
import { body } from 'express-validator';
import { TicketController } from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

export const createTicketRoutes = (ticketController: TicketController): Router => {
  const router = Router();

  // All routes require authentication
  router.use(authenticate);

  // Auto-classify ticket (utility endpoint) - MUST BE BEFORE /:id route
  router.post(
    '/classify',
    [
      body('subject').trim().isLength({ min: 1 }).withMessage('Subject is required'),
      body('description').optional().trim(),
      validate,
    ],
    ticketController.classifyTicket.bind(ticketController)
  );

  // Escalate overdue tickets (admin/cron endpoint) - MUST BE BEFORE /:id route
  router.post('/escalate-overdue', ticketController.escalateOverdueTickets.bind(ticketController));

  // List tickets with filters
  router.get('/', ticketController.listTickets.bind(ticketController));

  // Get single ticket
  router.get('/:id', ticketController.getTicket.bind(ticketController));

  // Create ticket
  router.post(
    '/',
    [
      body('client_id').isUUID().withMessage('Invalid client ID'),
      body('site_id').optional().isUUID().withMessage('Invalid site ID'),
      body('asset_id').optional().isUUID().withMessage('Invalid asset ID'),
      body('ticket_type')
        .optional()
        .isIn([
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
        ])
        .withMessage('Invalid ticket type'),
      body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority'),
      body('subject')
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('Subject must be between 3 and 255 characters'),
      body('description')
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage('Description must not exceed 5000 characters'),
      validate,
    ],
    ticketController.createTicket.bind(ticketController)
  );

  // Update ticket
  router.put(
    '/:id',
    [
      body('ticket_type')
        .optional()
        .isIn([
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
        ])
        .withMessage('Invalid ticket type'),
      body('status')
        .optional()
        .isIn([
          'new',
          'triaged',
          'vendor_assigned',
          'scheduled',
          'in_progress',
          'completed',
          'verified',
          'closed',
          'cancelled',
        ])
        .withMessage('Invalid status'),
      body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority'),
      body('subject')
        .optional()
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('Subject must be between 3 and 255 characters'),
      body('assignee_id').optional().isUUID().withMessage('Invalid assignee ID'),
      body('vendor_id').optional().isUUID().withMessage('Invalid vendor ID'),
      validate,
    ],
    ticketController.updateTicket.bind(ticketController)
  );

  // Delete ticket
  router.delete('/:id', ticketController.deleteTicket.bind(ticketController));

  // Get ticket messages
  router.get('/:id/messages', ticketController.getTicketMessages.bind(ticketController));

  // Add ticket message
  router.post(
    '/:id/messages',
    [
      body('message').trim().isLength({ min: 1 }).withMessage('Message cannot be empty'),
      body('is_internal').optional().isBoolean().withMessage('is_internal must be boolean'),
      validate,
    ],
    ticketController.addTicketMessage.bind(ticketController)
  );

  return router;
};
