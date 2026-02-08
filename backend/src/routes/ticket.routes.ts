import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { TicketController } from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';

export const createTicketRoutes = (ticketController: TicketController): Router => {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
      const lowerName = file.originalname.toLowerCase();
      const allowedExt = ['.eml', '.msg', '.txt', '.pdf'];
      const isAllowed = allowedExt.some((ext) => lowerName.endsWith(ext));

      if (isAllowed) {
        cb(null, true);
      } else {
        cb(new Error('Only .eml, .msg, .txt, and .pdf files are allowed for ticket correspondence'));
      }
    },
  });
  const attachmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      const isPdf = file.mimetype === 'application/pdf';
      const isImage = file.mimetype.startsWith('image/');
      if (isPdf || isImage) {
        cb(null, true);
      } else {
        cb(new Error('Only image or PDF files are allowed'));
      }
    },
  });

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
      body('client_id').optional().isUUID().withMessage('Invalid client ID'),
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
          'untouched',
          'client_approval',
          'vendor_rates',
          'quoted_to_client',
          'response_from_vendor',
          'response_from_client',
          'completed',
          'eta_received_from_vendor',
          'eta_provided_to_client',
          'waiting_on_client_info',
          'waiting_on_vendor_info',
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
      body('status_tag')
        .optional({ nullable: true })
        .isIn([
          'untouched',
          'client_approval',
          'vendor_rates',
          'quoted_to_client',
          'response_from_vendor',
          'response_from_client',
          'completed',
          'eta_received_from_vendor',
          'eta_provided_to_client',
          'waiting_on_client_info',
          'waiting_on_vendor_info',
        ])
        .withMessage('Invalid message status tag'),
      body('recipient_type')
        .optional()
        .isIn(['client', 'vendor', 'other'])
        .withMessage('Invalid recipient type'),
      body('recipient_email')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .withMessage('Invalid recipient email'),
      body('email_subject')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage('Email subject is too long'),
      validate,
    ],
    ticketController.addTicketMessage.bind(ticketController)
  );

  router.put(
    '/:id/messages/:messageId/status',
    [
      body('status_tag')
        .optional({ nullable: true })
        .isIn([
          'untouched',
          'client_approval',
          'vendor_rates',
          'quoted_to_client',
          'response_from_vendor',
          'response_from_client',
          'completed',
          'eta_received_from_vendor',
          'eta_provided_to_client',
          'waiting_on_client_info',
          'waiting_on_vendor_info',
        ])
        .withMessage('Invalid message status tag'),
      validate,
    ],
    ticketController.updateTicketMessageStatus.bind(ticketController)
  );

  router.delete(
    '/:id/messages/:messageId',
    ticketController.deleteTicketMessage.bind(ticketController)
  );

  router.get(
    '/:id/messages/:messageId/file',
    ticketController.downloadTicketMessageFile.bind(ticketController)
  );

  // Upload correspondence file and append to ticket thread
  router.post(
    '/:id/messages/upload',
    upload.single('file'),
    ticketController.uploadTicketMessageFile.bind(ticketController)
  );

  // Cancellation workflow
  router.post(
    '/:id/request-cancellation',
    [body('reason').trim().isLength({ min: 3 }).withMessage('Cancellation reason is required'), validate],
    ticketController.requestCancellation.bind(ticketController)
  );
  router.post('/:id/approve-cancellation', ticketController.approveCancellation.bind(ticketController));
  router.post(
    '/:id/reject-cancellation',
    [body('reason').trim().isLength({ min: 3 }).withMessage('Rejection reason is required'), validate],
    ticketController.rejectCancellation.bind(ticketController)
  );

  // Ticket attachments
  router.get('/:id/attachments', ticketController.getTicketAttachments.bind(ticketController));
  router.post(
    '/:id/attachments',
    attachmentUpload.array('files', 5),
    ticketController.uploadTicketAttachments.bind(ticketController)
  );

  return router;
};
