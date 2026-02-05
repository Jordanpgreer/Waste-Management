import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { clientService } from '../services/clientService';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';

export const createClientValidation = [
  body('name').trim().notEmpty().withMessage('Client name is required'),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('billingEmail').optional().isEmail().withMessage('Invalid billing email'),
  body('accountManagerId').optional().isUUID().withMessage('Invalid account manager ID'),
  body('slaResponseHours').optional().isInt({ min: 1 }).withMessage('SLA response hours must be positive'),
  body('slaResolutionHours').optional().isInt({ min: 1 }).withMessage('SLA resolution hours must be positive'),
];

export const createSiteValidation = [
  body('clientId').isUUID().withMessage('Client ID is required'),
  body('name').trim().notEmpty().withMessage('Site name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('zip').trim().notEmpty().withMessage('ZIP code is required'),
  body('siteManagerEmail').optional().isEmail().withMessage('Invalid site manager email'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

export const createClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    const client = await clientService.createClient({
      ...req.body,
      orgId: req.user!.orgId,
    });

    const response: ApiResponse = {
      success: true,
      data: { client },
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // For client_user role, verify they can only access their own client
    if (req.user!.clientId && req.params.id !== req.user!.clientId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only access your own client data',
        },
      };
      return res.status(403).json(response);
    }

    const client = await clientService.getClientById(req.params.id as string, req.user!.orgId);

    if (!client) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Client not found',
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { client },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const listClients = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort_by, sort_order, search, accountManagerId } = req.query;

    const result = await clientService.listClients(req.user!.orgId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sort_by: sort_by as string,
      sort_order: sort_order as 'asc' | 'desc',
      search: search as string,
      accountManagerId: accountManagerId as string,
      clientId: req.user!.clientId, // Filter by client for client_user role
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

export const updateClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const client = await clientService.updateClient({
      ...req.body,
      id: req.params.id as string,
      orgId: req.user!.orgId,
    });

    const response: ApiResponse = {
      success: true,
      data: { client },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const deleteClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await clientService.deleteClient(req.params.id as string, req.user!.orgId);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Client deleted successfully' },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const createSite = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    const site = await clientService.createSite({
      ...req.body,
      orgId: req.user!.orgId,
    });

    const response: ApiResponse = {
      success: true,
      data: { site },
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getSite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const site = await clientService.getSiteById(req.params.id as string, req.user!.orgId);

    if (!site) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Site not found',
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { site },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const listSites = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort_by, sort_order, search, clientId } = req.query;

    const result = await clientService.listSites(req.user!.orgId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sort_by: sort_by as string,
      sort_order: sort_order as 'asc' | 'desc',
      search: search as string,
      clientId: clientId as string,
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

export const updateSite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const site = await clientService.updateSite({
      ...req.body,
      id: req.params.id as string,
      orgId: req.user!.orgId,
    });

    const response: ApiResponse = {
      success: true,
      data: { site },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const deleteSite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await clientService.deleteSite(req.params.id as string, req.user!.orgId);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Site deleted successfully' },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
