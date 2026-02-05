import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { vendorService } from '../services/vendorService';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';

export const createVendorValidation = [
  body('name').trim().notEmpty().withMessage('Vendor name is required'),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('emergencyPhone').optional().isMobilePhone('any').withMessage('Invalid emergency phone number'),
  body('primaryContactEmail').optional().isEmail().withMessage('Invalid primary contact email'),
  body('primaryContactPhone').optional().isMobilePhone('any').withMessage('Invalid primary contact phone'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('performanceScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Performance score must be between 0 and 100'),
];

export const createVendor = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    const vendor = await vendorService.createVendor({
      ...req.body,
      orgId: req.user!.orgId,
    });

    const response: ApiResponse = {
      success: true,
      data: { vendor },
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getVendor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id as string, req.user!.orgId);

    if (!vendor) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Vendor not found',
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { vendor },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const listVendors = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort_by, sort_order, search, vendorType, serviceCapability } = req.query;

    const result = await vendorService.listVendors(req.user!.orgId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sort_by: sort_by as string,
      sort_order: sort_order as 'asc' | 'desc',
      search: search as string,
      vendorType: vendorType as string,
      serviceCapability: serviceCapability as string,
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

export const updateVendor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await vendorService.updateVendor({
      ...req.body,
      id: req.params.id as string,
      orgId: req.user!.orgId,
    });

    const response: ApiResponse = {
      success: true,
      data: { vendor },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const deleteVendor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await vendorService.deleteVendor(req.params.id as string, req.user!.orgId);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Vendor deleted successfully' },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
