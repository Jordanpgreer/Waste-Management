import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { clientService } from '../services/clientService';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse, UserRole } from '../types';
import { pool } from '../config/database';
import { storageService } from '../services/storageService';

const resolveClientId = async (req: AuthRequest): Promise<string | null> => {
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
    if (error?.code === '42703') {
      return null;
    }
    throw error;
  }
};

export const createClientValidation = [
  body('name').trim().notEmpty().withMessage('Client name is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address'),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('billingEmail').optional({ checkFalsy: true }).isEmail().withMessage('Invalid billing email'),
  body('assignedVendorId').optional({ checkFalsy: true }).isUUID().withMessage('Invalid vendor ID'),
  body('accountManagerId').optional({ checkFalsy: true }).isUUID().withMessage('Invalid account manager ID'),
  body('slaResponseHours').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('SLA response hours must be positive'),
  body('slaResolutionHours').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('SLA resolution hours must be positive'),
];

export const createSiteValidation = [
  body('clientId').isUUID().withMessage('Client ID is required'),
  body('name').trim().notEmpty().withMessage('Site name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('zip').trim().notEmpty().withMessage('ZIP code is required'),
  body('siteManagerEmail').optional({ checkFalsy: true }).isEmail().withMessage('Invalid site manager email'),
  body('siteManagerPhone').optional({ checkFalsy: true }).trim(),
  body('latitude').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
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

export const uploadClientContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'Please upload a PDF contract file.',
        },
      };
      return res.status(400).json(response);
    }

    const clientId = req.params.id as string;
    const orgId = req.user!.orgId;

    const existingClient = await clientService.getClientById(clientId, orgId);
    if (!existingClient) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Client not found',
        },
      };
      return res.status(404).json(response);
    }

    const filePath = await storageService.uploadFile(req.file, orgId, clientId);
    const fileName = req.file.originalname || 'client-contract.pdf';

    const client = await clientService.updateClient({
      id: clientId,
      orgId,
      contractFilePath: filePath,
      contractFileName: fileName,
      contractUploadedAt: new Date().toISOString(),
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

export const getClientContractDownload = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = req.params.id as string;
    const orgId = req.user!.orgId;

    const client = await clientService.getClientById(clientId, orgId);
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

    if (!client.contract_file_path) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_CONTRACT',
          message: 'No contract uploaded for this client',
        },
      };
      return res.status(404).json(response);
    }

    const url = await storageService.getSignedUrl(client.contract_file_path);

    const response: ApiResponse = {
      success: true,
      data: {
        url,
        file_name: client.contract_file_name,
        uploaded_at: client.contract_uploaded_at,
      },
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
    const isClientUser = req.user?.role === UserRole.CLIENT_USER;
    const effectiveClientId = isClientUser ? await resolveClientId(req) : null;
    const requestedClientId = typeof clientId === 'string' ? clientId : undefined;

    if (isClientUser && !effectiveClientId && !requestedClientId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_CLIENT_ASSOCIATION',
          message: 'Your account is not associated with a client profile.',
        },
      };
      return res.status(403).json(response);
    }

    const result = await clientService.listSites(req.user!.orgId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sort_by: sort_by as string,
      sort_order: sort_order as 'asc' | 'desc',
      search: search as string,
      clientId: isClientUser ? (effectiveClientId || requestedClientId) : requestedClientId,
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

export const listServiceSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const effectiveClientId = await resolveClientId(req);
    const requestedClientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
    const clientId = effectiveClientId || requestedClientId;

    if (!clientId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_CLIENT_ASSOCIATION',
          message: 'Your account is not associated with a client profile.',
        },
      };
      return res.status(403).json(response);
    }

    const items = await clientService.listServiceSchedule(req.user!.orgId, clientId);

    const response: ApiResponse = {
      success: true,
      data: { items },
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
