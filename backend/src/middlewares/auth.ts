import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import prisma from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string; // e.g. SUPER_ADMIN, ADMIN, PRINCIPAL_OFFICER, COMPLIANCE_OFFICER, RESEARCHER, PERSON_ASSOCIATED, CLIENT
    tenantId?: string | null;
    isImpersonated?: boolean;
  };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Authorization: Bearer <token>

    jwt.verify(token, JWT_SECRET, async (err, decoded: any) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
          errors: ['Token verification failed']
        });
      }

      // Check user status in DB to auto-logout inactive/suspended users
      try {
        if (!decoded.isImpersonated) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { 
              status: true, 
              tokenVersion: true,
              currentSessionId: true,
              role: { select: { name: true, allowMultiDeviceLogin: true } }, 
              tenant: { select: { status: true } } 
            }
          });

          if (!user || user.status !== 'ACTIVE') {
            return res.status(403).json({
              success: false,
              message: 'Your account has been deactivated. Please contact admin.',
              errors: ['User inactive or suspended']
            });
          }

          // Session validation
          if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
            return res.status(401).json({
              success: false,
              message: 'Session revoked. Please login again.',
              errors: ['Token version mismatch']
            });
          }

          if (!user.role.allowMultiDeviceLogin && decoded.sessionId && decoded.sessionId !== user.currentSessionId) {
            return res.status(401).json({
              success: false,
              message: 'Logged out because you logged in from another device.',
              errors: ['Single device constraint violated']
            });
          }



          if (user.tenant) {
            const tenantStatus = user.tenant.status;
            
            if (tenantStatus === 'DELETED') {
              return res.status(403).json({
                success: false,
                message: 'Your organization account has been deleted.',
                errors: ['User inactive or suspended']
              });
            }

            if (tenantStatus === 'SUSPENDED' && user.role.name !== 'CLIENT') {
              return res.status(403).json({
                success: false,
                message: 'Your organization account is suspended. Please contact super admin.',
                errors: ['User inactive or suspended']
              });
            }
          }
        }
      } catch (dbErr) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId,
        isImpersonated: decoded.isImpersonated || false
      };

      if (req.user.isImpersonated && !['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
        return res.status(403).json({
          success: false,
          message: 'Read-Only Mode: Write operations are disabled during impersonation.',
          errors: ['Impersonation read-only restriction']
        });
      }

      next();
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Authorization header missing',
      errors: ['No token provided']
    });
  }
};

export const requireRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        errors: ['User not authenticated']
      });
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access Forbidden',
        errors: [`Role '${req.user.role}' is not authorized to access this resource`]
      });
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        errors: ['User not authenticated']
      });
    }

    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }

    try {
      const hasPermission = await prisma.rolePermission.findFirst({
        where: {
          role: { name: req.user.role },
          permission: { code: permission }
        }
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access Forbidden',
          errors: [`Permission '${permission}' is required to access this resource.`]
        });
      }

      next();
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to authorize permission',
        errors: [err.message]
      });
    }
  };
};

export const requireAnyPermission = (permissions: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        errors: ['User not authenticated']
      });
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    try {
      const hasPermission = await prisma.rolePermission.findFirst({
        where: {
          role: { name: req.user.role },
          permission: { code: { in: permissions } }
        }
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access Forbidden',
          errors: [`One of the following permissions is required: ${permissions.join(', ')}`]
        });
      }

      next();
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to authorize permission',
        errors: [err.message]
      });
    }
  };
};
