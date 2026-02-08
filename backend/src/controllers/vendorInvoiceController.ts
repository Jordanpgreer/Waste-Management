import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { vendorInvoiceService } from '../services/vendorInvoiceService';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';

export const uploadVendorInvoiceValidation = [
  body('vendorId').trim().notEmpty().withMessage('Vendor ID is required'),
  body('clientId').optional({ checkFalsy: true }).trim(),
  body('siteId').optional({ checkFalsy: true }).trim(),
  body('poId').optional({ checkFalsy: true }).trim(),
];

export const uploadVendorInvoice = async (
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

    if (!req.file) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      };
      return res.status(400).json(response);
    }

    const invoice = await vendorInvoiceService.uploadAndProcessInvoice({
      orgId: req.user!.orgId,
      vendorId: req.body.vendorId,
      clientId: req.body.clientId,
      siteId: req.body.siteId,
      poId: req.body.poId,
      file: req.file,
    });

    const response: ApiResponse = {
      success: true,
      data: { invoice },
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getVendorInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const invoice = await vendorInvoiceService.getVendorInvoiceById(
      req.params.id as string,
      req.user!.orgId
    );

    if (!invoice) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { invoice },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const listVendorInvoices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, sort_by, sort_order, search, vendorId, clientId, status } = req.query;

    const result = await vendorInvoiceService.listVendorInvoices(req.user!.orgId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sort_by: sort_by as string,
      sort_order: sort_order as 'asc' | 'desc',
      search: search as string,
      vendorId: vendorId as string,
      clientId: clientId as string,
      status: status as any,
    });

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const updateVendorInvoiceValidation = [
  body('invoiceNumber').optional({ checkFalsy: true }).trim(),
  body('invoiceDate').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid invoice date'),
  body('dueDate').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid due date'),
  body('subtotal').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Subtotal must be a positive number'),
  body('tax').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Tax must be a positive number'),
  body('fees').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Fees must be a positive number'),
  body('total').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  body('status').optional({ checkFalsy: true }).isIn(['pending', 'under_review', 'approved', 'disputed', 'paid', 'rejected']).withMessage('Invalid status'),
  body('paymentMethod').optional({ checkFalsy: true }).trim(),
  body('paymentReference').optional({ checkFalsy: true }).trim(),
];

export const updateVendorInvoice = async (
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

    const invoice = await vendorInvoiceService.updateVendorInvoice({
      ...req.body,
      id: req.params.id,
      orgId: req.user!.orgId,
    });

    const response: ApiResponse = {
      success: true,
      data: { invoice },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const deleteVendorInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await vendorInvoiceService.deleteVendorInvoice(req.params.id as string, req.user!.orgId);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Invoice deleted successfully' },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getVendorInvoicePdf = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const signedUrl = await vendorInvoiceService.getInvoicePdfUrl(
      req.params.id as string,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { url: signedUrl },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const markVendorInvoiceAsPaidValidation = [
  body('paymentDate').isISO8601().withMessage('Valid payment date is required'),
  body('paymentMethod').optional({ checkFalsy: true }).trim(),
  body('paymentReference').optional({ checkFalsy: true }).trim(),
];

export const markVendorInvoiceAsPaid = async (
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

    const invoice = await vendorInvoiceService.markAsPaid(
      req.params.id as string,
      req.user!.orgId,
      req.body.paymentDate,
      req.body.paymentMethod,
      req.body.paymentReference
    );

    const response: ApiResponse = {
      success: true,
      data: { invoice },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
