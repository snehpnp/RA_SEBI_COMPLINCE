"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantSyncConfig = exports.syncTenantUpdate = exports.bootstrapTenant = void 0;
const db_1 = __importDefault(require("../config/db"));
const tenantProvisionService_1 = require("../services/tenantProvisionService");
/**
 * Universal Endpoint on any deployed instance / client build to sync, bootstrap,
 * or update its tenant database and collections via API call.
 * POST /api/v1/sync/bootstrap
 * POST /api/v1/sync/update
 * POST /api/v1/sync/tenant
 */
const bootstrapTenant = async (req, res) => {
    try {
        const apiKey = req.headers['x-tenant-api-key'] || req.body.apiKey;
        const { tenant, adminUser, permissions, action, emailTemplates, customPages, plans, planCategories, complianceRequirements, complianceAudits, systemSettings, resources } = req.body;
        if (!tenant || !adminUser) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payload. "tenant" and "adminUser" objects are required.'
            });
        }
        if (!adminUser.email) {
            return res.status(400).json({
                success: false,
                message: 'Admin user email is required.'
            });
        }
        const tenantData = {
            ...tenant,
            customPages: customPages || tenant.customPages || [],
            emailTemplates: emailTemplates || tenant.emailTemplates || [],
            plans: plans || tenant.plans || [],
            planCategories: planCategories || tenant.planCategories || [],
            complianceRequirements: complianceRequirements || tenant.complianceRequirements || [],
            complianceAudits: complianceAudits || tenant.complianceAudits || [],
            systemSettings: systemSettings || tenant.systemSettings || [],
            resources: resources || tenant.resources || [],
            tenantApiKey: apiKey || tenant.tenantApiKey || null
        };
        // Execute comprehensive provisioning of all collections on the local DB
        const result = await (0, tenantProvisionService_1.provisionAllTenantCollections)(db_1.default, tenantData, adminUser, permissions);
        return res.status(200).json({
            success: true,
            action: action || 'SYNC',
            message: `Tenant "${result.tenant.companyName}" successfully synchronized on domain database. All collections updated and Admin user "${result.adminUser.email}" is ready.`,
            data: {
                tenantId: String(result.tenant._id || result.tenant.id),
                companyName: result.tenant.companyName,
                status: result.tenant.status,
                domainUrl: result.tenant.domainUrl,
                adminEmail: result.adminUser.email,
                adminUserId: String(result.adminUser._id || result.adminUser.id),
                tempPassword: result.adminUser.tempPassword
            }
        });
    }
    catch (error) {
        console.error('Error in bootstrapTenant API:', error);
        return res.status(500).json({
            success: false,
            message: `Failed to sync tenant on domain database: ${error.message}`,
            error: error.message
        });
    }
};
exports.bootstrapTenant = bootstrapTenant;
/**
 * Alias for sync update endpoint
 */
exports.syncTenantUpdate = exports.bootstrapTenant;
/**
 * Endpoint to retrieve tenant sync configuration
 * GET /api/v1/sync/config
 */
const getTenantSyncConfig = async (req, res) => {
    try {
        const domainHeader = req.headers['x-tenant-domain'] || req.query.domain;
        const apiKey = req.headers['x-tenant-api-key'] || req.query.apiKey;
        const tenantIdQuery = req.query.tenantId;
        if (!domainHeader && !apiKey && !tenantIdQuery) {
            return res.status(400).json({
                success: false,
                message: 'Domain, API Key, or Tenant ID is required to sync configuration.'
            });
        }
        let tenant = null;
        if (apiKey) {
            tenant = await db_1.default.Tenant.findOne({ tenantApiKey: apiKey }).lean();
        }
        else if (domainHeader) {
            tenant = await db_1.default.Tenant.findOne({
                $or: [
                    { domainUrl: { $regex: domainHeader, $options: 'i' } },
                    { website: { $regex: domainHeader, $options: 'i' } }
                ]
            }).lean();
        }
        else if (tenantIdQuery) {
            tenant = await db_1.default.Tenant.findById(tenantIdQuery).lean();
        }
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'No tenant configuration found for given domain/credentials.'
            });
        }
        const tenantIdStr = String(tenant._id || tenant.id);
        const adminRole = await db_1.default.Role.findOne({ name: 'ADMIN' }).lean();
        let adminUser = null;
        if (adminRole) {
            adminUser = await db_1.default.User.findOne({
                tenantId: tenantIdStr,
                roleId: adminRole._id || adminRole.id
            }).lean();
        }
        const adminPermissions = await db_1.default.AdminPermission.find({
            tenantId: tenantIdStr
        }).lean();
        return res.status(200).json({
            success: true,
            data: {
                tenantId: tenantIdStr,
                companyName: tenant.companyName,
                panelName: tenant.panelName || `${tenant.companyName} Portal`,
                domainUrl: tenant.domainUrl,
                mongoDbUrl: tenant.mongoDbUrl,
                dbName: tenant.dbName,
                status: tenant.status,
                sebiRegistration: tenant.sebiRegistration,
                logoUrl: tenant.logoUrl,
                faviconUrl: tenant.faviconUrl,
                activePaymentGateway: tenant.activePaymentGateway,
                permissions: adminPermissions,
                adminUser: adminUser ? {
                    id: String(adminUser._id || adminUser.id),
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    mobile: adminUser.mobile,
                    passwordHash: adminUser.passwordHash,
                    tempPassword: adminUser.tempPassword
                } : null,
                syncedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to sync tenant configuration.',
            error: error.message
        });
    }
};
exports.getTenantSyncConfig = getTenantSyncConfig;
