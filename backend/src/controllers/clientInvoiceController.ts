import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { clientInvoiceService } from '../services/clientInvoiceService';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse, UserRole } from '../types';

export const generateClientInvoiceValidation = [
  body('client_id').trim().notEmpty().withMessage('Client ID is required'),
  body('period_start').isDate().withMessage('Valid period start date is required'),
  body('period_end').isDate().withMessage('Valid period end date is required'),
  body('markup_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Markup percentage must be between 0 and 100'),
];

export const generateClientInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array(),
        },
      };
      return res.status(400).json(response);
    }

    const invoice = await clientInvoiceService.generateClientInvoice(
      req.user!.orgId,
      req.user!.userId,
      req.body
    );

    const response: ApiResponse = {
      success: true,
      data: { client_invoice: invoice },
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getClientInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const invoice = await clientInvoiceService.getClientInvoiceById(
      req.params.id as string,
      req.user!.orgId
    );

    if (!invoice) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Client invoice not found',
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { client_invoice: invoice },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const listClientInvoices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, sort_by, sort_order, search, status, client_id } =
      req.query;
    const filteredClientId =
      req.user?.role === UserRole.CLIENT_USER ? req.user.clientId : undefined;

    if (req.user?.role === UserRole.CLIENT_USER && !filteredClientId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_CLIENT_ASSOCIATION',
          message: 'Your account is not associated with a client profile.',
        },
      };
      return res.status(403).json(response);
    }

    const result = await clientInvoiceService.listClientInvoices(
      req.user!.orgId,
      {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sort_by: sort_by as string,
        sort_order: sort_order as 'asc' | 'desc',
        search: search as string,
        status: status as string,
        client_id: filteredClientId || (client_id as string),
      }
    );

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const updateClientInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const invoice = await clientInvoiceService.updateClientInvoice({
      id: req.params.id as string,
      orgId: req.user!.orgId,
      ...req.body,
    });

    const response: ApiResponse = {
      success: true,
      data: { client_invoice: invoice },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const deleteClientInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await clientInvoiceService.deleteClientInvoice(
      req.params.id as string,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { message: 'Client invoice deleted successfully' },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const approveClientInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const invoice = await clientInvoiceService.approveClientInvoice(
      req.params.id as string,
      req.user!.userId,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { client_invoice: invoice },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const sendClientInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const invoice = await clientInvoiceService.sendClientInvoice(
      req.params.id as string,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { client_invoice: invoice },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const markClientInvoiceAsPaid = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { payment_date } = req.body;

    if (!payment_date) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payment date is required',
        },
      };
      return res.status(400).json(response);
    }

    const invoice = await clientInvoiceService.markAsPaid(
      req.params.id as string,
      payment_date,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { client_invoice: invoice },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
