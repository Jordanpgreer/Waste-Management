import { Response } from 'express';
import { TicketService } from '../services/ticket.service';
import {
  CreateTicketInput,
  UpdateTicketInput,
  TicketMessageStatusTag,
  TicketMessageRecipientType,
} from '../types/ticket.types';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { pool } from '../config/database';
import * as pdfParse from 'pdf-parse';
import { promises as fs } from 'fs';
import path from 'path';

export class TicketController {
  private ticketService: TicketService;

  constructor(ticketService: TicketService) {
    this.ticketService = ticketService;
  }

  private sendCancellationError(
    res: Response,
    status: number,
    code: string,
    message: string
  ) {
    return res.status(status).json({
      success: false,
      error: { code, message },
    });
  }

  private mapCancellationError(error: any): { status: number; code: string; message: string } {
    const message = error?.message || 'Failed to process cancellation workflow';

    const knownErrors: Record<string, { status: number; code: string }> = {
      'Ticket not found': { status: 404, code: 'TICKET_NOT_FOUND' },
      'Ticket is already cancelled': { status: 409, code: 'CANCELLATION_ALREADY_COMPLETED' },
      'A cancellation request is already pending': {
        status: 409,
        code: 'CANCELLATION_ALREADY_PENDING',
      },
      'No pending cancellation request found': { status: 409, code: 'CANCELLATION_NOT_PENDING' },
    };

    return {
      status: knownErrors[message]?.status || 500,
      code: knownErrors[message]?.code || 'CANCELLATION_PROCESSING_FAILED',
      message,
    };
  }

  private async resolveClientId(req: AuthRequest): Promise<string | null> {
    if (req.user?.clientId) {
      return req.user.clientId;
    }

    try {
      const result = await pool.query(
        'SELECT client_id FROM users WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
        [req.user!.userId, req.user!.orgId]
      );

      return result.rows[0]?.client_id || null;
    } catch (error: any) {
      // Some environments may not have the users.client_id migration yet.
      if (error?.code === '42703') {
        return null;
      }
      throw error;
    }
  }

  private async getAccessibleTicket(req: AuthRequest, ticketId: string) {
    const orgId = req.user!.orgId;
    const ticket = await this.ticketService.getTicket(ticketId, orgId);

    if (!ticket) {
      return null;
    }

    if (req.user!.role === UserRole.CLIENT_USER) {
      const effectiveClientId = await this.resolveClientId(req);
      const requestedClientIdRaw =
        (typeof req.query.client_id === 'string' ? req.query.client_id : undefined) ||
        (typeof (req.body as any)?.client_id === 'string' ? (req.body as any).client_id : undefined);

      const fallbackClientId = requestedClientIdRaw || null;
      const canAccessByReporter = ticket.reporter_id === req.user!.userId;
      const allowedClientId = fallbackClientId || effectiveClientId;

      if (!canAccessByReporter && (!allowedClientId || ticket.client_id !== allowedClientId)) {
        return null;
      }
    }

    return ticket;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  private async resolveSenderEmail(orgId: string, userId: string): Promise<string | null> {
    const result = await pool.query(
      'SELECT email FROM users WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [userId, orgId]
    );
    return result.rows[0]?.email || null;
  }

  private async resolveRecipientEmail(
    orgId: string,
    ticket: any,
    recipientType: TicketMessageRecipientType,
    requestedEmail?: string
  ): Promise<string | null> {
    const manualEmail = (requestedEmail || '').trim();
    if (manualEmail) {
      return manualEmail;
    }

    if (recipientType === 'client') {
      const result = await pool.query(
        `SELECT COALESCE(NULLIF(billing_email, ''), NULLIF(email, '')) AS recipient_email
         FROM clients
         WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
        [ticket.client_id, orgId]
      );
      return result.rows[0]?.recipient_email || null;
    }

    if (recipientType === 'vendor' && ticket.vendor_id) {
      const result = await pool.query(
        `SELECT COALESCE(NULLIF(primary_contact_email, ''), NULLIF(email, '')) AS recipient_email
         FROM vendors
         WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
        [ticket.vendor_id, orgId]
      );
      return result.rows[0]?.recipient_email || null;
    }

    return null;
  }

  private resolveRecipientType(rawValue: unknown): TicketMessageRecipientType {
    const value = typeof rawValue === 'string' ? rawValue.trim().toLowerCase() : '';
    if (value === 'vendor' || value === 'other') return value;
    return 'client';
  }

  private async extractTextFromCorrespondenceFile(file: Express.Multer.File): Promise<string> {
    const lowerName = file.originalname.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || file.mimetype === 'application/pdf';

    if (isPdf) {
      try {
        const pdfData = await (pdfParse as any)(file.buffer);
        return (pdfData?.text || '').replace(/\u0000/g, '').trim();
      } catch {
        return '';
      }
    }

    return file.buffer.toString('utf8').replace(/\u0000/g, '').trim();
  }

  private parseEmailEnvelope(rawText: string): {
    from: string | null;
    to: string | null;
    subject: string | null;
    body: string;
  } {
    const fromMatch = rawText.match(/^From:\s*(.+)$/im);
    const toMatch = rawText.match(/^To:\s*(.+)$/im);
    const subjectMatch = rawText.match(/^Subject:\s*(.+)$/im);
    const bodySplit = rawText.split(/\r?\n\r?\n/);
    const body = bodySplit.length > 1 ? bodySplit.slice(1).join('\n\n').trim() : rawText.trim();

    return {
      from: fromMatch?.[1]?.trim() || null,
      to: toMatch?.[1]?.trim() || null,
      subject: subjectMatch?.[1]?.trim() || null,
      body,
    };
  }

  private buildUploadedMessageText(fileName: string, emailBody: string): string {
    if (!emailBody) {
      return `Uploaded correspondence file: ${fileName}`;
    }

    const trimmedBody = emailBody.length > 6000 ? `${emailBody.slice(0, 6000)}\n\n[truncated]` : emailBody;
    return `Uploaded correspondence file: ${fileName}\n\n${trimmedBody}`;
  }

  async createTicket(req: AuthRequest, res: Response) {
    try {
      const input: CreateTicketInput = { ...req.body };
      const orgId = req.user!.orgId;
      const isClientUser = req.user!.role === UserRole.CLIENT_USER;

      if (isClientUser) {
        const effectiveClientId = await this.resolveClientId(req);

        const requestClientId = typeof input.client_id === 'string' ? input.client_id : undefined;
        const resolvedClientId = effectiveClientId || requestClientId;

        if (!resolvedClientId) {
          return res.status(403).json({
            success: false,
            error: {
              message: 'Your account is not associated with a client profile.',
            },
          });
        }

        // Verify client exists in org before using fallback request value
        const clientExists = await pool.query(
          'SELECT id FROM clients WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
          [resolvedClientId, orgId]
        );

        if (clientExists.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Selected client is not valid for this organization.',
            },
          });
        }

        input.client_id = resolvedClientId;
        input.priority = undefined;
        input.reporter_id = req.user!.userId;

        if (!input.site_id) {
          const defaultSiteId = await this.ticketService.getDefaultSiteForClient(orgId, resolvedClientId);
          input.site_id = defaultSiteId || undefined;
        }
      } else if (!input.client_id) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Client is required',
          },
        });
      }

      const ticket = await this.ticketService.createTicket(orgId, input, isClientUser);

      return res.status(201).json({
        success: true,
        data: ticket,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async listTickets(req: AuthRequest, res: Response) {
    try {
      const orgId = req.user!.orgId;
      const isClientUser = req.user!.role === UserRole.CLIENT_USER;
      const effectiveClientId = isClientUser ? (await this.resolveClientId(req)) || undefined : undefined;
      const requestedClientId = req.query.client_id as string | undefined;

      if (isClientUser && !effectiveClientId && !requestedClientId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Your account is not associated with a client profile.',
          },
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters = {
        client_id: isClientUser ? requestedClientId || effectiveClientId : requestedClientId,
        site_id: req.query.site_id as string,
        ticket_type: req.query.ticket_type as any,
        status: req.query.status as any,
        status_bucket: req.query.status_bucket as 'open' | 'completed' | 'cancelled' | undefined,
        sort_by: req.query.sort_by as
          | 'newest'
          | 'oldest'
          | 'last_touched'
          | 'last_touched_oldest'
          | undefined,
        priority: req.query.priority as any,
        assignee_id: req.query.assignee_id as string,
        vendor_id: req.query.vendor_id as string,
        is_escalated: req.query.is_escalated ? req.query.is_escalated === 'true' : undefined,
        cancellation_status: req.query.cancellation_status as 'pending' | 'approved' | 'rejected' | undefined,
        search: req.query.search as string,
      };

      const result = await this.ticketService.listTickets(orgId, filters, page, limit);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async getTicket(req: AuthRequest, res: Response) {
    try {
      const ticketId = req.params.id as string;
      const ticket = await this.getAccessibleTicket(req, ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Ticket not found',
          },
        });
      }

      return res.json({
        success: true,
        data: ticket,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async updateTicket(req: AuthRequest, res: Response) {
    try {
      const ticketId = req.params.id as string;
      const orgId = req.user!.orgId;
      const input: UpdateTicketInput = { ...req.body };
      const isClientUser = req.user!.role === UserRole.CLIENT_USER;

      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);
      if (!accessibleTicket) {
        return res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
      }

      if (isClientUser) {
        // Client users cannot edit core ticket fields.
        delete input.ticket_type;
        delete input.subject;
        delete input.description;
        delete input.status;
        delete input.priority;
        delete input.assignee_id;
        delete input.vendor_id;
        delete input.scheduled_at;
        delete input.resolution_notes;
      }

      const ticket = await this.ticketService.updateTicket(ticketId, orgId, input);

      return res.json({
        success: true,
        data: ticket,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async deleteTicket(req: AuthRequest, res: Response) {
    try {
      const ticketId = req.params.id as string;
      const orgId = req.user!.orgId;
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);

      if (!accessibleTicket) {
        return res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
      }

      await this.ticketService.deleteTicket(ticketId, orgId);

      return res.json({
        success: true,
        message: 'Ticket deleted successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async getTicketMessages(req: AuthRequest, res: Response) {
    try {
      const ticketId = req.params.id as string;
      const orgId = req.user!.orgId;
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);

      if (!accessibleTicket) {
        return res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
      }

      let messages = await this.ticketService.getTicketMessages(ticketId, orgId);
      if (req.user!.role === UserRole.CLIENT_USER) {
        messages = messages.filter(
          (msg) =>
            !msg.is_internal &&
            msg.recipient_type !== 'vendor' &&
            msg.recipient_type !== 'other' &&
            (msg.user_id === req.user!.userId || !msg.recipient_type || msg.recipient_type === 'client')
        );
      }

      return res.json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async addTicketMessage(req: AuthRequest, res: Response) {
    try {
      const ticketId = req.params.id as string;
      const orgId = req.user!.orgId;
      const { message, is_internal, status_tag, recipient_type, recipient_email, email_subject } = req.body;
      const userId = req.user!.userId;
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);

      if (!accessibleTicket) {
        return res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
      }

      const isClientUser = req.user!.role === UserRole.CLIENT_USER;
      const resolvedRecipientType = isClientUser
        ? 'client'
        : this.resolveRecipientType(recipient_type);
      const resolvedRecipientEmailRaw = await this.resolveRecipientEmail(
        orgId,
        accessibleTicket,
        resolvedRecipientType,
        typeof recipient_email === 'string' ? recipient_email : undefined
      );
      const resolvedRecipientEmail = resolvedRecipientEmailRaw?.trim() || null;
      const senderEmail = await this.resolveSenderEmail(orgId, userId);
      const messageEmailSubject =
        typeof email_subject === 'string' && email_subject.trim()
          ? email_subject.trim()
          : `Request #${accessibleTicket.ticket_number}: ${accessibleTicket.subject}`;

      if (
        !isClientUser &&
        (resolvedRecipientType === 'vendor' || resolvedRecipientType === 'other') &&
        !resolvedRecipientEmail
      ) {
        return res.status(400).json({
          success: false,
          error: { message: 'Recipient email is required for Vendor or Other correspondence' },
        });
      }

      if (resolvedRecipientEmail && !this.isValidEmail(resolvedRecipientEmail)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Recipient email is invalid' },
        });
      }

      const newMessage = await this.ticketService.addTicketMessage(
        ticketId,
        orgId,
        userId,
        message,
        isClientUser ? false : (is_internal || false),
        isClientUser ? null : ((status_tag || null) as TicketMessageStatusTag | null),
        {
          recipient_type: resolvedRecipientType,
          recipient_email: resolvedRecipientEmail,
          email_from: senderEmail,
          email_to: resolvedRecipientEmail,
          email_subject: messageEmailSubject,
        }
      );

      return res.status(201).json({
        success: true,
        data: newMessage,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async updateTicketMessageStatus(req: AuthRequest, res: Response) {
    try {
      if (req.user!.role === UserRole.CLIENT_USER) {
        return res.status(403).json({
          success: false,
          error: { message: 'Only staff can update message status tags' },
        });
      }

      const ticketId = req.params.id as string;
      const messageId = req.params.messageId as string;
      const orgId = req.user!.orgId;
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);
      const statusTag = (req.body.status_tag || null) as TicketMessageStatusTag | null;

      if (!accessibleTicket) {
        return res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
      }

      const messages = await this.ticketService.getTicketMessages(ticketId, orgId);
      const targetMessage = messages.find((msg) => msg.id === messageId);
      if (!targetMessage) {
        return res.status(404).json({
          success: false,
          error: { message: 'Message not found' },
        });
      }

      if (targetMessage.is_origin_message) {
        return res.status(400).json({
          success: false,
          error: { message: 'The original ticket request message cannot be retagged' },
        });
      }

      const updated = await this.ticketService.updateTicketMessageStatus(
        messageId,
        ticketId,
        orgId,
        statusTag
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: { message: 'Message not found' },
        });
      }

      return res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async deleteTicketMessage(req: AuthRequest, res: Response) {
    try {
      if (req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          error: { message: 'Only admin can delete correspondence messages' },
        });
      }

      const ticketId = req.params.id as string;
      const messageId = req.params.messageId as string;
      const orgId = req.user!.orgId;
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);

      if (!accessibleTicket) {
        return res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
      }

      const messages = await this.ticketService.getTicketMessages(ticketId, orgId);
      const targetMessage = messages.find((msg) => msg.id === messageId);
      if (!targetMessage) {
        return res.status(404).json({
          success: false,
          error: { message: 'Message not found' },
        });
      }

      if (targetMessage.is_origin_message) {
        return res.status(400).json({
          success: false,
          error: { message: 'The original ticket request message cannot be deleted' },
        });
      }

      const deleted = await this.ticketService.deleteTicketMessage(messageId, ticketId, orgId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: { message: 'Message not found' },
        });
      }

      return res.json({
        success: true,
        message: 'Message deleted',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async getTicketAttachments(req: AuthRequest, res: Response) {
    try {
      const ticketId = req.params.id as string;
      const orgId = req.user!.orgId;
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);

      if (!accessibleTicket) {
        return res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
      }

      const attachments = await this.ticketService.getTicketAttachments(ticketId, orgId);

      return res.json({
        success: true,
        data: attachments,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async uploadTicketAttachments(req: AuthRequest, res: Response) {
    try {
      const ticketId = req.params.id as string;
      const orgId = req.user!.orgId;
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);
      const files = ((req as any).files || []) as Express.Multer.File[];

      if (!accessibleTicket) {
        return res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
      }

      if (!files.length) {
        return res.status(400).json({
          success: false,
          error: { message: 'No files uploaded' },
        });
      }

      const created = [];
      for (const file of files) {
        const attachment = await this.ticketService.addTicketAttachment(
          orgId,
          ticketId,
          file,
          req.user!.userId
        );
        created.push(attachment);
      }

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async uploadTicketMessageFile(req: AuthRequest, res: Response) {
    try {
      const ticketId = req.params.id as string;
      const orgId = req.user!.orgId;
      const userId = req.user!.userId;
      const file = (req as any).file as Express.Multer.File | undefined;
      const overrideRaw = typeof req.body?.message_override === 'string' ? req.body.message_override : '';
      const rawRecipientType = req.body?.recipient_type;
      const rawRecipientEmail =
        typeof req.body?.recipient_email === 'string' ? req.body.recipient_email : undefined;
      const rawEmailSubject =
        typeof req.body?.email_subject === 'string' ? req.body.email_subject.trim() : '';

      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);
      if (!accessibleTicket) {
        return res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          error: { message: 'No file uploaded' },
        });
      }

      const extractedText = await this.extractTextFromCorrespondenceFile(file);
      const parsed = this.parseEmailEnvelope(extractedText);
      const overrideMessage = overrideRaw.trim();
      const messageBody = overrideMessage || this.buildUploadedMessageText(file.originalname, parsed.body);
      const storedFile = await this.ticketService.storeTicketMessageSourceFile(orgId, ticketId, file);
      const isClientUser = req.user!.role === UserRole.CLIENT_USER;
      const resolvedRecipientType = isClientUser ? 'client' : this.resolveRecipientType(rawRecipientType);
      const resolvedRecipientEmailRaw = await this.resolveRecipientEmail(
        orgId,
        accessibleTicket,
        resolvedRecipientType,
        rawRecipientEmail
      );
      const resolvedRecipientEmail = resolvedRecipientEmailRaw?.trim() || null;
      const senderEmail = await this.resolveSenderEmail(orgId, userId);
      const explicitOutgoing = Boolean(overrideMessage || rawRecipientType || rawRecipientEmail || rawEmailSubject);
      const messageEmailSubject =
        rawEmailSubject || `Request #${accessibleTicket.ticket_number}: ${accessibleTicket.subject}`;

      if (
        !isClientUser &&
        (resolvedRecipientType === 'vendor' || resolvedRecipientType === 'other') &&
        !resolvedRecipientEmail
      ) {
        return res.status(400).json({
          success: false,
          error: { message: 'Recipient email is required for Vendor or Other correspondence' },
        });
      }

      if (resolvedRecipientEmail && !this.isValidEmail(resolvedRecipientEmail)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Recipient email is invalid' },
        });
      }

      const message = await this.ticketService.addTicketMessage(ticketId, orgId, userId, messageBody, false, null, {
        recipient_type: resolvedRecipientType,
        recipient_email: resolvedRecipientEmail,
        email_from: explicitOutgoing ? senderEmail : parsed.from || senderEmail,
        email_to: explicitOutgoing ? resolvedRecipientEmail : parsed.to || resolvedRecipientEmail,
        email_subject: explicitOutgoing ? messageEmailSubject : parsed.subject || messageEmailSubject,
        source_file_name: storedFile.source_file_name,
        source_file_path: storedFile.source_file_path,
        source_file_size: storedFile.source_file_size,
        source_file_type: storedFile.source_file_type,
      });

      return res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async downloadTicketMessageFile(req: AuthRequest, res: Response) {
    try {
      const ticketId = req.params.id as string;
      const messageId = req.params.messageId as string;
      const orgId = req.user!.orgId;
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);

      if (!accessibleTicket) {
        return res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
      }

      const messages = await this.ticketService.getTicketMessages(ticketId, orgId);
      const targetMessage = messages.find((msg) => msg.id === messageId);
      if (!targetMessage) {
        return res.status(404).json({
          success: false,
          error: { message: 'Message not found' },
        });
      }

      if (!targetMessage.source_file_path) {
        return res.status(404).json({
          success: false,
          error: { message: 'No file is attached to this message' },
        });
      }

      if (
        req.user!.role === UserRole.CLIENT_USER &&
        (targetMessage.is_internal ||
          targetMessage.recipient_type === 'vendor' ||
          targetMessage.recipient_type === 'other')
      ) {
        return res.status(404).json({
          success: false,
          error: { message: 'Message not found' },
        });
      }

      const absolutePath = path.resolve(process.cwd(), targetMessage.source_file_path);
      const allowedBase = path.resolve(process.cwd(), 'uploads', 'ticket-messages');
      if (!absolutePath.startsWith(allowedBase)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid file path' },
        });
      }

      await fs.access(absolutePath);
      const downloadName = targetMessage.source_file_name || 'ticket-correspondence.eml';
      return res.download(absolutePath, downloadName);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: { message: 'Attached file not found on server' },
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async requestCancellation(req: AuthRequest, res: Response) {
    try {
      const ticketId = req.params.id as string;
      const orgId = req.user!.orgId;
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);
      const reason = (req.body.reason || '').trim();

      if (!accessibleTicket) {
        return this.sendCancellationError(res, 404, 'TICKET_NOT_FOUND', 'Ticket not found');
      }

      if (!reason) {
        return this.sendCancellationError(
          res,
          400,
          'CANCELLATION_REASON_REQUIRED',
          'Cancellation reason is required'
        );
      }

      const updated = await this.ticketService.requestTicketCancellation(
        ticketId,
        orgId,
        req.user!.userId,
        reason
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const mapped = this.mapCancellationError(error);
      return this.sendCancellationError(res, mapped.status, mapped.code, mapped.message);
    }
  }

  async approveCancellation(req: AuthRequest, res: Response) {
    try {
      if (req.user!.role === UserRole.CLIENT_USER) {
        return this.sendCancellationError(
          res,
          403,
          'CANCELLATION_STAFF_ONLY',
          'Only staff can approve cancellation requests'
        );
      }

      const ticketId = req.params.id as string;
      const orgId = req.user!.orgId;
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);

      if (!accessibleTicket) {
        return this.sendCancellationError(res, 404, 'TICKET_NOT_FOUND', 'Ticket not found');
      }

      const updated = await this.ticketService.approveTicketCancellation(
        ticketId,
        orgId,
        req.user!.userId
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const mapped = this.mapCancellationError(error);
      return this.sendCancellationError(res, mapped.status, mapped.code, mapped.message);
    }
  }

  async rejectCancellation(req: AuthRequest, res: Response) {
    try {
      if (req.user!.role === UserRole.CLIENT_USER) {
        return this.sendCancellationError(
          res,
          403,
          'CANCELLATION_STAFF_ONLY',
          'Only staff can reject cancellation requests'
        );
      }

      const ticketId = req.params.id as string;
      const orgId = req.user!.orgId;
      const reason = (req.body.reason || '').trim();
      const accessibleTicket = await this.getAccessibleTicket(req, ticketId);

      if (!accessibleTicket) {
        return this.sendCancellationError(res, 404, 'TICKET_NOT_FOUND', 'Ticket not found');
      }

      if (!reason) {
        return this.sendCancellationError(
          res,
          400,
          'CANCELLATION_REJECTION_REASON_REQUIRED',
          'Rejection reason is required'
        );
      }

      const updated = await this.ticketService.rejectTicketCancellation(
        ticketId,
        orgId,
        req.user!.userId,
        reason
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const mapped = this.mapCancellationError(error);
      return this.sendCancellationError(res, mapped.status, mapped.code, mapped.message);
    }
  }

  async classifyTicket(req: AuthRequest, res: Response) {
    try {
      const { subject, description } = req.body;

      const classification = await this.ticketService.autoClassifyTicket(subject, description || '');

      return res.json({
        success: true,
        data: classification,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }

  async escalateOverdueTickets(req: AuthRequest, res: Response) {
    try {
      const orgId = req.user!.orgId;

      const count = await this.ticketService.checkAndEscalateOverdueTickets(orgId);

      return res.json({
        success: true,
        message: `Escalated ${count} overdue ticket(s)`,
        data: { count },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message,
        },
      });
    }
  }
}
