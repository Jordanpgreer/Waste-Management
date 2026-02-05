import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole } from '../types';

/**
 * Middleware to enforce client data isolation for client_user role
 * Adds clientId filter to query parameters for client users
 */
export const enforceClientFilter = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Only apply filtering to client_user role
  if (req.user?.role === UserRole.CLIENT_USER) {
    // Client user must have a client_id associated
    if (!req.user.clientId) {
      res.status(403);
      res.json({
        success: false,
        error: {
          code: 'NO_CLIENT_ASSOCIATION',
          message: 'Your account is not associated with a client. Please contact support.',
        },
      });
      return;
    }

    // Add client_id to request for use in services
    req.query.clientId = req.user.clientId;

    // Store in a custom property for easier access
    (req as any).filteredClientId = req.user.clientId;
  }

  next();
};

/**
 * Get the client ID to filter by, considering user role
 * Returns the client ID for client_user, undefined for other roles (see all data)
 */
export const getClientFilter = (req: AuthRequest): string | undefined => {
  if (req.user?.role === UserRole.CLIENT_USER) {
    return req.user.clientId;
  }
  return undefined; // Broker staff see all clients
};
