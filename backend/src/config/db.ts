import { PrismaClient } from '@prisma/client';
import { centralPrisma } from '../services/tenantConnectionManager';
import { getTenantContext } from './tenantContext';

export { centralPrisma };

/**
 * Transparent Dynamic Prisma Proxy:
 * Automatically resolves the active request's Tenant Prisma Client from AsyncLocalStorage context.
 * If no tenant context is active (e.g. SuperAdmin operations, system crons, migrations),
 * falls back to the Central Prisma Client (`sebi-compliance`).
 */
export const dynamicPrisma = new Proxy(centralPrisma, {
  get(target: PrismaClient, prop: string | symbol, receiver: any) {
    const context = getTenantContext();
    const activePrisma = (!context?.isCentral && context?.prisma) ? context.prisma : target;
    const value = Reflect.get(activePrisma, prop, receiver);

    if (typeof value === 'function') {
      return value.bind(activePrisma);
    }
    return value;
  }
});

export default dynamicPrisma;
