"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicPrisma = exports.centralPrisma = void 0;
const tenantConnectionManager_1 = require("../services/tenantConnectionManager");
Object.defineProperty(exports, "centralPrisma", { enumerable: true, get: function () { return tenantConnectionManager_1.centralPrisma; } });
const tenantContext_1 = require("./tenantContext");
/**
 * Transparent Dynamic Prisma Proxy:
 * Automatically resolves the active request's Tenant Prisma Client from AsyncLocalStorage context.
 * If no tenant context is active (e.g. SuperAdmin operations, system crons, migrations),
 * falls back to the Central Prisma Client (`sebi-compliance`).
 */
exports.dynamicPrisma = new Proxy(tenantConnectionManager_1.centralPrisma, {
    get(target, prop, receiver) {
        const context = (0, tenantContext_1.getTenantContext)();
        const activePrisma = (!context?.isCentral && context?.prisma) ? context.prisma : target;
        const value = Reflect.get(activePrisma, prop, receiver);
        if (typeof value === 'function') {
            return value.bind(activePrisma);
        }
        return value;
    }
});
exports.default = exports.dynamicPrisma;
