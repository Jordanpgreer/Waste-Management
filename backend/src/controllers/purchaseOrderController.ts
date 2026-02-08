import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';

export const createPOValidation = [
  body('client_id').trim().notEmpty().withMessage('Client ID is required'),
  body('vendor_id').trim().notEmpty().withMessage('Vendor ID is required'),
  body('site_id').trim().notEmpty().withMessage('Site ID is required'),
  body('service_scope')
    .optional()
    .isIn(['non_recurring', 'recurring'])
    .withMessage('service_scope must be non_recurring or recurring'),
  body('po_date').isDate().withMessage('Valid PO date is required'),
  body('line_items')
    .isArray({ min: 1 })
    .withMessage('At least one line item is required'),
  body('line_items.*.description')
    .trim()
    .notEmpty()
    .withMessage('Line item description is required'),
  body('line_items.*.quantity')
    .isFloat({ gt: 0 })
    .withMessage('Line item quantity must be greater than 0'),
  body('line_items.*')
    .custom((item) => {
      const hasLegacy = item?.unit_price !== undefined && item?.unit_price !== null;
      const hasVendor = item?.vendor_unit_price !== undefined && item?.vendor_unit_price !== null;
      const hasClient = item?.client_unit_price !== undefined && item?.client_unit_price !== null;
      if (!hasLegacy && !hasVendor && !hasClient) {
        throw new Error('Line item must include vendor_unit_price, client_unit_price, or unit_price');
      }
      return true;
    }),
  body('line_items.*.unit_price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Line item unit price must be 0 or greater'),
  body('line_items.*.vendor_unit_price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Line item vendor_unit_price must be 0 or greater'),
  body('line_items.*.client_unit_price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Line item client_unit_price must be 0 or greater'),
];

export const createPO = async (
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

    const po = await purchaseOrderService.createPO(
      req.user!.orgId,
      req.user!.userId,
      req.body
    );

    const response: ApiResponse = {
      success: true,
      data: { purchase_order: po },
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getPO = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const po = await purchaseOrderService.getPOById(
      req.params.id as string,
      req.user!.orgId
    );

    if (!po) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Purchase order not found',
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { purchase_order: po },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const listPOs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page,
      limit,
      sort_by,
      sort_order,
      search,
      status,
      client_id,
      vendor_id,
      site_id,
    } = req.query;

    const result = await purchaseOrderService.listPOs(req.user!.orgId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sort_by: sort_by as string,
      sort_order: sort_order as 'asc' | 'desc',
      search: search as string,
      status: status as string,
      client_id: client_id as string,
      vendor_id: vendor_id as string,
      site_id: site_id as string,
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

export const updatePO = async (
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

    const po = await purchaseOrderService.updatePO({
      ...req.body,
      id: req.params.id,
      orgId: req.user!.orgId,
    });

    const response: ApiResponse = {
      success: true,
      data: { purchase_order: po },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const deletePO = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await purchaseOrderService.deletePO(req.params.id as string, req.user!.orgId);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Purchase order deleted successfully' },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const approvePO = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const po = await purchaseOrderService.approvePO(
      req.params.id as string,
      req.user!.userId,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { purchase_order: po },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const sendPO = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const po = await purchaseOrderService.sendPO(
      req.params.id as string,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { purchase_order: po },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const linkPOToTicket = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ticket_id } = req.body;

    if (!ticket_id) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ticket ID is required',
        },
      };
      return res.status(400).json(response);
    }

    const link = await purchaseOrderService.linkPOToTicket(
      req.params.id as string,
      ticket_id,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { link },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const unlinkPOFromTicket = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await purchaseOrderService.unlinkPOFromTicket(
      req.params.id as string,
      req.params.ticketId as string,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { message: 'PO unlinked from ticket successfully' },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
