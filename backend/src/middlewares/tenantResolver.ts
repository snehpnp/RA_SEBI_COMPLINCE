import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { runWithTenantContext } from '../config/tenantContext';
import { tenantConnectionManager, centralConnection, centralModels } from '../services/tenantConnectionManager';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';

export interface TenantRequest extends Request {
  tenant?: any;
  tenantId?: string | null;
  tenantConnection?: any;
  tenantModels?: any;
}

/**
 * Global Middleware: Automatically resolves the Tenant Database from Domain, Headers, or JWT.
 * Sets the active Tenant Mongoose Connection & Models in AsyncLocalStorage context for transparent isolation.
 */
export async function tenantResolverMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  const path = req.path || '';

  // 1. SuperAdmin management routes always execute in Central DB context
  if (path.startsWith('/api/super-admin')) {
    return runWithTenantContext(
      { isCentral: true, connection: centralConnection, models: centralModels },
      () => next()
    );
  }

  // 2. Extract tenant identifier candidates
  let tenantIdentifier: string | null = null;

  // Header candidates
  const headerTenantId = req.headers['x-tenant-id'] as string;
  const headerDomainUrl = req.headers['x-domain-url'] as string;
  if (headerTenantId) {
    tenantIdentifier = headerTenantId;
  } else if (headerDomainUrl) {
    tenantIdentifier = headerDomainUrl;
  }

  // Domain / Host candidates
  if (!tenantIdentifier) {
    const origin = (req.headers.origin || req.headers.referer) as string | undefined;
    if (origin) {
      const match = origin.match(/^https?:\/\/([^/:]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        tenantIdentifier = match[1];
      }
    }
  }

  if (!tenantIdentifier && req.hostname && req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
    tenantIdentifier = req.hostname;
  }

  // JWT token candidate
  if (!tenantIdentifier && req.headers.authorization) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      if (token) {
        const decoded: any = jwt.decode(token);
        if (decoded && decoded.role === 'SUPER_ADMIN') {
          return runWithTenantContext(
            { isCentral: true, connection: centralConnection, models: centralModels },
            () => next()
          );
        }
        if (decoded && decoded.tenantId) {
          tenantIdentifier = decoded.tenantId;
        }
      }
    } catch {}
  }

  // 3. If a tenant was identified, resolve its dedicated database connection
  if (tenantIdentifier) {
    try {
      const resolved = await tenantConnectionManager.getTenantConnection(tenantIdentifier);
      if (resolved) {
        req.tenant = resolved.meta;
        req.tenantId = resolved.meta.id;
        req.tenantConnection = resolved.connection;
        req.tenantModels = resolved.models;

        return runWithTenantContext(
          {
            tenantId: resolved.meta.id,
            domainUrl: resolved.meta.domainUrl,
            dbName: resolved.meta.dbName,
            mongoDbUrl: resolved.meta.mongoDbUrl,
            connection: resolved.connection,
            models: resolved.models,
            isCentral: false
          },
          () => next()
        );
      }
    } catch (err: any) {
      console.error(`Error resolving tenant for identifier '${tenantIdentifier}':`, err.message);
    }
  }

  // 4. Default fallback: Auto-resolve the single company from DB if present
  try {
    const singleTenant: any = await centralModels.Tenant.findOne({ status: { $ne: 'DELETED' } }).lean() || await centralModels.Tenant.findOne().lean();
    if (singleTenant) {
      const resolved = await tenantConnectionManager.getTenantConnection(singleTenant._id.toString());
      if (resolved) {
        req.tenant = resolved.meta;
        req.tenantId = resolved.meta.id;
        req.tenantConnection = resolved.connection;
        req.tenantModels = resolved.models;

        return runWithTenantContext(
          {
            tenantId: resolved.meta.id,
            domainUrl: resolved.meta.domainUrl,
            dbName: resolved.meta.dbName,
            mongoDbUrl: resolved.meta.mongoDbUrl,
            connection: resolved.connection,
            models: resolved.models,
            isCentral: false
          },
          () => next()
        );
      }
    }
  } catch (err: any) {
    // Fall back to central context
  }

  // 5. Ultimate Fallback: Central DB context
  return runWithTenantContext(
    { isCentral: true, connection: centralConnection, models: centralModels },
    () => next()
  );
}

export default tenantResolverMiddleware;
