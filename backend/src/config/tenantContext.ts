import { AsyncLocalStorage } from 'async_hooks';
import { Connection } from 'mongoose';
import { ITenantModels } from '../models';

export interface TenantContext {
  tenantId?: string | null;
  domainUrl?: string | null;
  dbName?: string | null;
  mongoDbUrl?: string | null;
  isCentral?: boolean;
  connection?: Connection;
  models?: ITenantModels;
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
 * Retrieves the active Tenant Mongoose Connection (Tenant-specific or undefined)
 */
export function getActiveTenantConnection(): Connection | undefined {
  return tenantStorage.getStore()?.connection;
}

/**
 * Retrieves the active Tenant Mongoose Models
 */
export function getActiveTenantModels(): ITenantModels | undefined {
  return tenantStorage.getStore()?.models;
}
