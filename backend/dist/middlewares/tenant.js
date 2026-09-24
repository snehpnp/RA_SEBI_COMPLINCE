"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTenantIsolation = void 0;
const db_1 = require("../config/db");
const enforceTenantIsolation = async (req, res, next) => {
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
    let userTenantId = req.user.tenantId;
    if (!userTenantId) {
        try {
            const singleTenant = await db_1.centralModels.Tenant.findOne({ status: { $ne: 'DELETED' } }).lean() || await db_1.centralModels.Tenant.findOne().lean();
            if (singleTenant) {
                userTenantId = (singleTenant._id || singleTenant.id).toString();
                req.user.tenantId = userTenantId;
            }
        }
        catch { }
    }
    if (!userTenantId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden',
            errors: ['Company setup pending. Please contact admin.']
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
