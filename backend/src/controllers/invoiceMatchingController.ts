import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { invoiceMatchingService } from '../services/invoiceMatchingService';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';

export const autoMatchValidation = [
  body('vendor_invoice_id')
    .trim()
    .notEmpty()
    .withMessage('Vendor invoice ID is required'),
];

export const autoMatch = async (
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

    const matchResults = await invoiceMatchingService.autoMatchInvoice(
      req.user!.orgId,
      req.body
    );

    const response: ApiResponse = {
      success: true,
      data: { match_results: matchResults },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getMatchingRecords = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const records = await invoiceMatchingService.getMatchingRecords(
      req.params.invoiceId as string,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { matching_records: records },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const approveMatch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const match = await invoiceMatchingService.approveMatch(
      req.params.id as string,
      req.user!.userId,
      req.user!.orgId
    );

    const response: ApiResponse = {
      success: true,
      data: { matching_record: match },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const rejectMatch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reason } = req.body;

    const match = await invoiceMatchingService.rejectMatch(
      req.params.id as string,
      req.user!.userId,
      req.user!.orgId,
      reason
    );

    const response: ApiResponse = {
      success: true,
      data: { matching_record: match },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
