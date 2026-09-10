import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClient } from '@prisma/client';

export interface TenantContext {
  tenantId?: string | null;
  domainUrl?: string | null;
  dbName?: string | null;
  mongoDbUrl?: string | null;
  isCentral?: boolean;
  prisma?: PrismaClient;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Runs a function within the specified Tenant Context
 */
export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
  return tenantStorage.run(context, fn);
}

/**
 * Retrieves the current Tenant Context for the executing asynchronous operation
 */
export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

/**
 * Retrieves the active Prisma Client (Tenant-specific or undefined)
 */
export function getActiveTenantPrisma(): PrismaClient | undefined {
  return tenantStorage.getStore()?.prisma;
}
