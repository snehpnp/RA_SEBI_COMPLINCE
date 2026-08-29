"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTenantIsolation = void 0;
const enforceTenantIsolation = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
            errors: ['User context missing']
        });
    }
    // Super Admin bypasses tenant isolation constraints (they manage all tenants)
    if (req.user.role === 'SUPER_ADMIN') {
        return next();
    }
    const userTenantId = req.user.tenantId;
    if (!userTenantId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden',
            errors: ['User does not belong to any tenant company']
        });
    }
    // Resolve target tenantId from different request parameters
    // e.g. path parameter :tenantId, query parameter ?tenantId, or body parameter tenantId
    const targetTenantId = (req.params.tenantId || req.query.tenantId || req.body.tenantId || req.headers['x-tenant-id']);
    if (targetTenantId && targetTenantId !== userTenantId) {
        return res.status(403).json({
            success: false,
            message: 'Access Forbidden: Tenant Isolation Violation',
            errors: ['You are not authorized to view or modify data of another tenant']
        });
    }
    // Override/Ensure target parameter is set to the user's actual tenantId for query building safety
    req.body.tenantId = userTenantId;
    req.query.tenantId = userTenantId;
    next();
};
exports.enforceTenantIsolation = enforceTenantIsolation;
