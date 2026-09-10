"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantResolverMiddleware = tenantResolverMiddleware;
const jwt = __importStar(require("jsonwebtoken"));
const tenantContext_1 = require("../config/tenantContext");
const tenantConnectionManager_1 = require("../services/tenantConnectionManager");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
/**
 * Global Middleware: Automatically resolves the Tenant Database from Domain, Headers, or JWT.
 * Sets the active Tenant Mongoose Connection & Models in AsyncLocalStorage context for transparent isolation.
 */
async function tenantResolverMiddleware(req, res, next) {
    const path = req.path || '';
    // 1. SuperAdmin management routes always execute in Central DB context
    if (path.startsWith('/api/super-admin')) {
        return (0, tenantContext_1.runWithTenantContext)({ isCentral: true, connection: tenantConnectionManager_1.centralConnection, models: tenantConnectionManager_1.centralModels }, () => next());
    }
    // 2. Extract tenant identifier candidates
    let tenantIdentifier = null;
    // Header candidates
    const headerTenantId = req.headers['x-tenant-id'];
    const headerDomainUrl = req.headers['x-domain-url'];
    if (headerTenantId) {
        tenantIdentifier = headerTenantId;
    }
    else if (headerDomainUrl) {
        tenantIdentifier = headerDomainUrl;
    }
    // Domain / Host candidates
    if (!tenantIdentifier) {
        const origin = (req.headers.origin || req.headers.referer);
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
                const decoded = jwt.decode(token);
                if (decoded && decoded.role === 'SUPER_ADMIN') {
                    return (0, tenantContext_1.runWithTenantContext)({ isCentral: true, connection: tenantConnectionManager_1.centralConnection, models: tenantConnectionManager_1.centralModels }, () => next());
                }
                if (decoded && decoded.tenantId) {
                    tenantIdentifier = decoded.tenantId;
                }
            }
        }
        catch { }
    }
    // 3. If a tenant was identified, resolve its dedicated database connection
    if (tenantIdentifier) {
        try {
            const resolved = await tenantConnectionManager_1.tenantConnectionManager.getTenantConnection(tenantIdentifier);
            if (resolved) {
                req.tenant = resolved.meta;
                req.tenantId = resolved.meta.id;
                req.tenantConnection = resolved.connection;
                req.tenantModels = resolved.models;
                return (0, tenantContext_1.runWithTenantContext)({
                    tenantId: resolved.meta.id,
                    domainUrl: resolved.meta.domainUrl,
                    dbName: resolved.meta.dbName,
                    mongoDbUrl: resolved.meta.mongoDbUrl,
                    connection: resolved.connection,
                    models: resolved.models,
                    isCentral: false
                }, () => next());
            }
        }
        catch (err) {
            console.error(`Error resolving tenant for identifier '${tenantIdentifier}':`, err.message);
        }
    }
    // 4. Default fallback: Central DB context
    return (0, tenantContext_1.runWithTenantContext)({ isCentral: true, connection: tenantConnectionManager_1.centralConnection, models: tenantConnectionManager_1.centralModels }, () => next());
}
exports.default = tenantResolverMiddleware;
