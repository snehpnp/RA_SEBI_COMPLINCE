"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThirdPartyInfo = exports.getThirdPartyPlans = exports.getThirdPartyStaff = exports.getThirdPartyClients = exports.resolveTenantFromRequest = void 0;
const db_1 = __importDefault(require("../config/db"));
/**
 * Helper to resolve Tenant from route params, query, or headers without requiring JWT auth
 */
const resolveTenantFromRequest = async (req) => {
    const paramId = req.params.tenantId || req.params.adminId || req.params.companyId;
    const queryTenantId = (req.query.tenantId || req.query.companyId || req.query.id);
    const queryAdminId = (req.query.adminId || req.query.userId);
    const queryEmail = (req.query.email || req.query.adminEmail);
    const apiKey = req.headers['x-tenant-api-key'] || req.headers['x-api-key'] || req.query.apiKey;
    const domainHeader = req.headers['x-tenant-domain'] || req.query.domain || req.headers.host;
    const headerTenantId = req.headers['x-tenant-id'] || req.headers['tenant-id'];
    // 1. Try by API Key
    if (apiKey) {
        const tenant = await db_1.default.tenant.findFirst({
            where: { tenantApiKey: apiKey }
        });
        if (tenant)
            return tenant;
    }
    // 2. Try by Tenant ID (Header / Param / Query)
    const directTenantId = headerTenantId || paramId || queryTenantId;
    if (directTenantId) {
        const tenant = await db_1.default.tenant.findUnique({
            where: { id: directTenantId }
        }).catch(() => null);
        if (tenant)
            return tenant;
    }
    // 3. Try by Admin User ID / Email
    const adminIdentifier = queryEmail || paramId || queryAdminId;
    if (adminIdentifier) {
        const adminUser = await db_1.default.user.findFirst({
            where: {
                OR: [
                    { id: adminIdentifier },
                    { email: adminIdentifier.toLowerCase().trim() }
                ]
            },
            include: { tenant: true }
        }).catch(() => null);
        if (adminUser?.tenant)
            return adminUser.tenant;
    }
    // 4. Try by Domain Name / Website / Host
    if (domainHeader) {
        const cleanDomain = domainHeader.replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/\/.*$/, '').toLowerCase().trim();
        if (cleanDomain && cleanDomain !== 'localhost' && cleanDomain !== '127.0.0.1') {
            const tenant = await db_1.default.tenant.findFirst({
                where: {
                    OR: [
                        { domainUrl: { contains: cleanDomain, mode: 'insensitive' } },
                        { website: { contains: cleanDomain, mode: 'insensitive' } }
                    ]
                }
            });
            if (tenant)
                return tenant;
        }
    }
    // 5. Fallback for Single-Tenant standalone instance
    const tenantCount = await db_1.default.tenant.count({ where: { deletedAt: null } });
    if (tenantCount === 1) {
        return await db_1.default.tenant.findFirst({ where: { deletedAt: null } });
    }
    return null;
};
exports.resolveTenantFromRequest = resolveTenantFromRequest;
/**
 * GET /api/v1/third-party-api/clients
 * GET /api/v1/third-party-api/:tenantId/clients
 */
const getThirdPartyClients = async (req, res) => {
    try {
        const tenant = await (0, exports.resolveTenantFromRequest)(req);
        const whereClause = {};
        if (tenant) {
            whereClause.user = { tenantId: tenant.id };
        }
        const clients = await db_1.default.client.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        mobile: true,
                        firstName: true,
                        lastName: true,
                        status: true,
                        createdAt: true,
                        lastLogin: true
                    }
                },
                profile: true,
                subscriptions: {
                    include: {
                        plan: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                durationMonths: true,
                                researchSegments: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                agreements: {
                    select: {
                        id: true,
                        status: true,
                        signedAt: true,
                        agreementUrl: true
                    }
                },
                documents: {
                    select: {
                        id: true,
                        docType: true,
                        status: true,
                        fileName: true,
                        uploadedAt: true
                    }
                }
            },
            orderBy: {
                user: { createdAt: 'desc' }
            }
        });
        const sanitizedClients = clients.map(c => ({
            id: c.id,
            userId: c.userId,
            name: c.name || `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim(),
            email: c.email || c.user?.email,
            mobile: c.mobile || c.user?.mobile,
            pan: c.pan,
            aadhaar: c.aadhaar,
            category: c.category,
            occupation: c.occupation,
            status: c.status || c.user?.status,
            riskProfile: c.profile?.riskProfile || 'MODERATE',
            city: c.profile?.city || null,
            state: c.profile?.state || null,
            joinedAt: c.user?.createdAt,
            activeSubscription: c.subscriptions?.[0] || null,
            subscriptionsCount: c.subscriptions?.length || 0,
            agreementsCount: c.agreements?.length || 0,
            documentsCount: c.documents?.length || 0
        }));
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            company: tenant ? {
                id: tenant.id,
                companyName: tenant.companyName,
                sebiRegistration: tenant.sebiRegistration,
                domainUrl: tenant.domainUrl,
                website: tenant.website
            } : null,
            count: sanitizedClients.length,
            data: sanitizedClients
        });
    }
    catch (error) {
        console.error('Error in getThirdPartyClients:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch third-party clients: ' + error.message
        });
    }
};
exports.getThirdPartyClients = getThirdPartyClients;
/**
 * GET /api/v1/third-party-api/staff
 * GET /api/v1/third-party-api/:tenantId/staff
 */
const getThirdPartyStaff = async (req, res) => {
    try {
        const tenant = await (0, exports.resolveTenantFromRequest)(req);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant company not found.'
            });
        }
        const staffMembers = await db_1.default.staff.findMany({
            where: {
                user: { tenantId: tenant.id }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        mobile: true,
                        firstName: true,
                        lastName: true,
                        status: true,
                        role: { select: { name: true } }
                    }
                },
                personAssociated: true
            },
            orderBy: {
                user: { createdAt: 'desc' }
            }
        });
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            company: {
                id: tenant.id,
                companyName: tenant.companyName,
                sebiRegistration: tenant.sebiRegistration
            },
            count: staffMembers.length,
            data: staffMembers
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch third-party staff: ' + error.message
        });
    }
};
exports.getThirdPartyStaff = getThirdPartyStaff;
/**
 * GET /api/v1/third-party-api/plans
 * GET /api/v1/third-party-api/:tenantId/plans
 */
const getThirdPartyPlans = async (req, res) => {
    try {
        const tenant = await (0, exports.resolveTenantFromRequest)(req);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant company not found.'
            });
        }
        const plans = await db_1.default.plan.findMany({
            where: {
                tenantId: tenant.id,
                status: 'ACTIVE'
            },
            include: {
                category: true
            },
            orderBy: { price: 'asc' }
        });
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            count: plans.length,
            data: plans
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch third-party plans: ' + error.message
        });
    }
};
exports.getThirdPartyPlans = getThirdPartyPlans;
/**
 * GET /api/v1/third-party-api/info
 * GET /api/v1/third-party-api/:tenantId/info
 */
const getThirdPartyInfo = async (req, res) => {
    try {
        const tenant = await (0, exports.resolveTenantFromRequest)(req);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant company not found.'
            });
        }
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            data: {
                id: tenant.id,
                companyName: tenant.companyName,
                panelName: tenant.panelName || `${tenant.companyName} Portal`,
                sebiRegistration: tenant.sebiRegistration,
                bseEnrollment: tenant.bseEnrollment,
                domainUrl: tenant.domainUrl,
                website: tenant.website,
                email: tenant.email,
                mobile: tenant.mobile,
                address: tenant.address,
                logoUrl: tenant.logoUrl,
                faviconUrl: tenant.faviconUrl,
                status: tenant.status
            }
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch company info: ' + error.message
        });
    }
};
exports.getThirdPartyInfo = getThirdPartyInfo;
