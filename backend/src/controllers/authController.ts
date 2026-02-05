import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse } from '../types';
import { validatePasswordStrength } from '../utils/password';

export const registerValidation = [
  body('orgId').isUUID().withMessage('Invalid organization ID'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').custom((value) => {
    const validation = validatePasswordStrength(value);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    return true;
  }),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  body('orgId').optional().isUUID().withMessage('Invalid organization ID'),
];

export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    const result = await authService.register(req.body);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    const result = await authService.login(req.body);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      return res.status(401).json(response);
    }

    const user = await authService.getUserById(req.user.userId, req.user.orgId);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { user },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      return res.status(401).json(response);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current password and new password are required',
        },
      };
      return res.status(400).json(response);
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password does not meet requirements',
          details: validation.errors,
        },
      };
      return res.status(400).json(response);
    }

    await authService.changePassword(req.user.userId, req.user.orgId, currentPassword, newPassword);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Password changed successfully' },
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
