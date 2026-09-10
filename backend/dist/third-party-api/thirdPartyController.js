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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThirdPartyInfo = exports.getThirdPartyPlans = exports.getThirdPartyStaff = exports.getThirdPartyClients = exports.resolveTenantFromRequest = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = __importStar(require("../config/db"));
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
        let tenant = await db_1.default.Tenant.findOne({ tenantApiKey: apiKey }).lean();
        if (!tenant && db_1.centralModels.CentralTenant) {
            tenant = await db_1.centralModels.CentralTenant.findOne({ tenantApiKey: apiKey }).lean();
        }
        if (!tenant && db_1.centralModels.AllCompany) {
            tenant = await db_1.centralModels.AllCompany.findOne({ apiKey: apiKey }).lean();
        }
        if (tenant)
            return tenant;
    }
    // 2. Try by Tenant ID (Header / Param / Query)
    const directTenantId = headerTenantId || paramId || queryTenantId;
    if (directTenantId) {
        let tenant = null;
        if (mongoose_1.default.Types.ObjectId.isValid(directTenantId)) {
            tenant = await db_1.default.Tenant.findById(directTenantId).lean().catch(() => null);
            if (!tenant && db_1.centralModels.CentralTenant) {
                tenant = await db_1.centralModels.CentralTenant.findById(directTenantId).lean().catch(() => null);
            }
        }
        if (!tenant && db_1.centralModels.AllCompany) {
            tenant = await db_1.centralModels.AllCompany.findOne({
                $or: [
                    ...(mongoose_1.default.Types.ObjectId.isValid(directTenantId) ? [{ _id: directTenantId }] : []),
                    { companyId: directTenantId }
                ]
            }).lean().catch(() => null);
        }
        if (tenant)
            return tenant;
    }
    // 3. Try by Admin User ID / Email
    const adminIdentifier = queryEmail || paramId || queryAdminId;
    if (adminIdentifier) {
        const isOid = mongoose_1.default.Types.ObjectId.isValid(adminIdentifier);
        const adminUser = await db_1.default.User.findOne({
            $or: [
                ...(isOid ? [{ _id: adminIdentifier }] : []),
                { email: String(adminIdentifier).toLowerCase().trim() }
            ]
        }).populate('tenant').lean().catch(() => null);
        if (adminUser?.tenant)
            return adminUser.tenant;
    }
    // 4. Try by Domain Name / Website / Host
    if (domainHeader) {
        const cleanDomain = domainHeader.replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/\/.*$/, '').toLowerCase().trim();
        if (cleanDomain && cleanDomain !== 'localhost' && cleanDomain !== '127.0.0.1') {
            let tenant = await db_1.default.Tenant.findOne({
                $or: [
                    { domainUrl: { $regex: cleanDomain, $options: 'i' } },
                    { website: { $regex: cleanDomain, $options: 'i' } }
                ]
            }).lean();
            if (!tenant && db_1.centralModels.CentralTenant) {
                tenant = await db_1.centralModels.CentralTenant.findOne({
                    $or: [
                        { domainUrl: { $regex: cleanDomain, $options: 'i' } },
                        { website: { $regex: cleanDomain, $options: 'i' } }
                    ]
                }).lean();
            }
            if (tenant)
                return tenant;
        }
    }
    // 5. Fallback for Single-Tenant standalone instance
    const tenantCount = await db_1.default.Tenant.countDocuments({ deletedAt: null });
    if (tenantCount === 1) {
        return await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
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
        const userFilter = {};
        if (tenant) {
            userFilter.tenantId = tenant._id || tenant.id;
        }
        const matchingUsers = await db_1.default.User.find(userFilter).select('_id').lean();
        const userIds = matchingUsers.map(u => u._id);
        const clients = await db_1.default.Client.find({
            ...(userIds.length > 0 || !tenant ? { userId: { $in: userIds } } : { _id: null })
        })
            .populate({
            path: 'userId',
            select: 'id email mobile firstName lastName status createdAt lastLogin'
        })
            .populate('profile')
            .populate({
            path: 'subscriptions',
            populate: {
                path: 'plan',
                select: 'id name price durationMonths researchSegments'
            },
            options: { sort: { createdAt: -1 } }
        })
            .populate({
            path: 'agreements',
            select: 'id status signedAt agreementUrl'
        })
            .populate({
            path: 'documents',
            select: 'id docType status fileName uploadedAt'
        })
            .sort({ createdAt: -1 })
            .lean();
        const sanitizedClients = clients.map((c) => {
            const user = c.userId || {};
            return {
                id: c._id?.toString() || c.id,
                userId: user._id?.toString() || user.id || c.userId,
                name: c.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                email: c.email || user.email,
                mobile: c.mobile || user.mobile,
                pan: c.pan,
                aadhaar: c.aadhaar,
                category: c.category,
                occupation: c.occupation,
                status: c.status || user.status,
                riskProfile: c.profile?.riskProfile || 'MODERATE',
                city: c.profile?.city || null,
                state: c.profile?.state || null,
                joinedAt: user.createdAt,
                activeSubscription: c.subscriptions?.[0] || null,
                subscriptionsCount: c.subscriptions?.length || 0,
                agreementsCount: c.agreements?.length || 0,
                documentsCount: c.documents?.length || 0
            };
        });
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            company: tenant ? {
                id: tenant._id?.toString() || tenant.id,
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
        const tenantId = tenant._id || tenant.id;
        const users = await db_1.default.User.find({ tenantId }).select('_id').lean();
        const userIds = users.map(u => u._id);
        const staffMembers = await db_1.default.Staff.find({
            userId: { $in: userIds }
        })
            .populate({
            path: 'userId',
            select: 'id email mobile firstName lastName status roleId',
            populate: { path: 'role', select: 'name' }
        })
            .populate('personAssociated')
            .sort({ createdAt: -1 })
            .lean();
        const formattedStaff = staffMembers.map((s) => {
            const user = s.userId || {};
            return {
                ...s,
                id: s._id?.toString() || s.id,
                user: user ? {
                    id: user._id?.toString() || user.id,
                    email: user.email,
                    mobile: user.mobile,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    status: user.status,
                    role: user.role ? { name: user.role.name } : null
                } : null
            };
        });
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            company: {
                id: tenant._id?.toString() || tenant.id,
                companyName: tenant.companyName,
                sebiRegistration: tenant.sebiRegistration
            },
            count: formattedStaff.length,
            data: formattedStaff
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
        const tenantId = tenant._id || tenant.id;
        const plans = await db_1.default.Plan.find({
            tenantId,
            status: 'ACTIVE'
        })
            .populate('category')
            .sort({ price: 1 })
            .lean();
        const formattedPlans = plans.map((p) => ({
            ...p,
            id: p._id?.toString() || p.id
        }));
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            count: formattedPlans.length,
            data: formattedPlans
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
                id: tenant._id?.toString() || tenant.id,
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
