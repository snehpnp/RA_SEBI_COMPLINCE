"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithTenantContext = runWithTenantContext;
exports.getTenantContext = getTenantContext;
exports.getActiveTenantPrisma = getActiveTenantPrisma;
const async_hooks_1 = require("async_hooks");
const tenantStorage = new async_hooks_1.AsyncLocalStorage();
/**
 * Runs a function within the specified Tenant Context
 */
function runWithTenantContext(context, fn) {
    return tenantStorage.run(context, fn);
}
/**
 * Retrieves the current Tenant Context for the executing asynchronous operation
 */
function getTenantContext() {
    return tenantStorage.getStore();
}
/**
 * Retrieves the active Prisma Client (Tenant-specific or undefined)
 */
function getActiveTenantPrisma() {
    return tenantStorage.getStore()?.prisma;
}
