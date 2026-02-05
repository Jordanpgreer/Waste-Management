import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole, ApiResponse } from '../types';

/**
 * Middleware to check if user has required role
 * @param allowedRoles Array of roles that can access the route
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };
      return res.status(401).json(response);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
      };
      return res.status(403).json(response);
    }

    return next();
  };
};
