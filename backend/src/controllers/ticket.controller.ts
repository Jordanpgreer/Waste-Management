import { Response } from 'express';
import { TicketService } from '../services/ticket.service';
import { CreateTicketInput, UpdateTicketInput } from '../types/ticket.types';
import { AuthRequest } from '../middleware/auth';

export class TicketController {
  private ticketService: TicketService;

  constructor(ticketService: TicketService) {
    this.ticketService = ticketService;
  }

  async createTicket(req: AuthRequest, res: Response) {
    try {
      const input: CreateTicketInput = req.body;
      const orgId = req.user!.orgId;

      const ticket = await this.ticketService.createTicket(orgId, input);

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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters = {
        client_id: req.query.client_id as string,
        site_id: req.query.site_id as string,
        ticket_type: req.query.ticket_type as any,
        status: req.query.status as any,
        priority: req.query.priority as any,
        assignee_id: req.query.assignee_id as string,
        vendor_id: req.query.vendor_id as string,
        is_escalated: req.query.is_escalated ? req.query.is_escalated === 'true' : undefined,
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
      const orgId = req.user!.orgId;

      const ticket = await this.ticketService.getTicket(ticketId, orgId);

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
      const input: UpdateTicketInput = req.body;

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

      const messages = await this.ticketService.getTicketMessages(ticketId, orgId);

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
      const { message, is_internal } = req.body;
      const userId = req.user!.userId;

      const newMessage = await this.ticketService.addTicketMessage(
        ticketId,
        orgId,
        userId,
        message,
        is_internal || false
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
