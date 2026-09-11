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
exports.runThirdPartyComplianceSweep = exports.getThirdPartyCompliance = exports.getThirdPartyStats = exports.getThirdPartyInfo = exports.getThirdPartyPlans = exports.getThirdPartyStaff = exports.getThirdPartyClients = exports.resolveTenantFromRequest = void 0;
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
        const tenantIdStr = tenant ? (tenant._id || tenant.id || tenant.tenantId).toString() : null;
        const isObjectId = tenantIdStr && mongoose_1.default.Types.ObjectId.isValid(tenantIdStr);
        const tenantIds = tenantIdStr ? [
            tenantIdStr,
            ...(tenant.tenantId ? [tenant.tenantId.toString()] : []),
            ...(tenant._id ? [tenant._id.toString()] : [])
        ] : [];
        const tenantOids = tenantIds
            .filter(tId => mongoose_1.default.Types.ObjectId.isValid(tId))
            .map(tId => new mongoose_1.default.Types.ObjectId(tId));
        // 1. Find all matching Client users for this tenant
        const clientRoles = await db_1.default.Role.find({
            name: { $regex: /^(client|user|customer|investor)$/i }
        }).lean();
        const clientRoleIds = clientRoles.map((r) => r._id || r.id);
        const matchingUsers = await db_1.default.User.find({
            deletedAt: null,
            $and: [
                ...(tenantIds.length > 0 ? [{
                        $or: [
                            { tenantId: { $in: [...tenantIds, ...tenantOids] } },
                            { tenantId: tenantIdStr }
                        ]
                    }] : []),
                {
                    $or: [
                        { roleId: { $in: clientRoleIds } },
                        { role: { $regex: /^(client|user|customer|investor)$/i } }
                    ]
                }
            ]
        }).populate('roleId', 'id name description').sort({ createdAt: -1 }).lean();
        const userIds = matchingUsers.map(u => u._id || u.id);
        const userOids = userIds
            .filter(uId => mongoose_1.default.Types.ObjectId.isValid(String(uId)))
            .map(uId => new mongoose_1.default.Types.ObjectId(String(uId)));
        // 2. Find Client documents for this tenant directly or linked via users
        const matchingClients = await db_1.default.Client.find({
            ...(tenantIds.length > 0 ? {
                $or: [
                    { tenantId: { $in: [...tenantIds, ...tenantOids] } },
                    ...(userIds.length > 0 ? [{ userId: { $in: [...userIds, ...userOids, ...userIds.map(String)] } }] : [])
                ]
            } : {})
        })
            .populate('userId')
            .sort({ createdAt: -1 })
            .lean();
        // Map existing Client records by userId
        const clientByUserId = new Map();
        for (const c of matchingClients) {
            const uIdStr = String(c.userId?._id || c.userId?.id || c.userId || '');
            if (uIdStr) {
                clientByUserId.set(uIdStr, c);
            }
        }
        // Combine Client records and any Users with client role that don't have a Client doc yet
        const combinedClients = [...matchingClients];
        for (const u of matchingUsers) {
            const uIdStr = String(u._id || u.id);
            if (!clientByUserId.has(uIdStr)) {
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email || 'Client';
                const synthClient = {
                    _id: u._id,
                    id: uIdStr,
                    userId: u,
                    name: fullName,
                    email: u.email,
                    mobile: u.mobile || '',
                    dob: u.dob || null,
                    pan: u.pan || null,
                    aadhaar: u.aadhaar || null,
                    category: u.category || 'INDIVIDUAL',
                    occupation: u.occupation || 'OTHER',
                    status: u.status || 'ACTIVE',
                    kraVerified: false,
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt
                };
                combinedClients.push(synthClient);
                clientByUserId.set(uIdStr, synthClient);
            }
        }
        const allClientIds = combinedClients.map((c) => c._id || c.id);
        const allUserIds = combinedClients.map((c) => String(c.userId?._id || c.userId?.id || c.userId || c._id || c.id));
        const allLookupIds = [...new Set([...allClientIds, ...allUserIds])];
        // Look up Profiles, Subscriptions, Agreements, Documents
        const [profiles, subscriptions, agreements, documents] = await Promise.all([
            db_1.default.ClientProfile.find({ clientId: { $in: allLookupIds } }).lean().catch(() => []),
            db_1.default.Subscription.find({ clientId: { $in: allLookupIds } })
                .populate('planId', 'id name price durationMonths researchSegments')
                .sort({ createdAt: -1 })
                .lean()
                .catch(() => []),
            db_1.default.Agreement.find({ clientId: { $in: allLookupIds } }).lean().catch(() => []),
            db_1.default.ClientDocument.find({ clientId: { $in: allLookupIds } }).lean().catch(() => [])
        ]);
        const profileMap = new Map(profiles.map(p => [String(p.clientId), p]));
        const subMap = new Map();
        for (const sub of subscriptions) {
            const cId = String(sub.clientId);
            if (!subMap.has(cId))
                subMap.set(cId, []);
            subMap.get(cId).push(sub);
        }
        const agMap = new Map();
        for (const ag of agreements) {
            const cId = String(ag.clientId);
            agMap.set(cId, (agMap.get(cId) || 0) + 1);
        }
        const docMap = new Map();
        for (const doc of documents) {
            const cId = String(doc.clientId);
            docMap.set(cId, (docMap.get(cId) || 0) + 1);
        }
        const sanitizedClients = combinedClients.map((c) => {
            const cIdStr = String(c._id || c.id);
            const userObj = c.userId || {};
            const uIdStr = String(userObj._id || userObj.id || c.userId || cIdStr);
            const prof = profileMap.get(cIdStr) || profileMap.get(uIdStr);
            const clientSubs = subMap.get(cIdStr) || subMap.get(uIdStr) || [];
            const primarySub = clientSubs[0] || null;
            const planObj = primarySub?.planId && typeof primarySub.planId === 'object'
                ? primarySub.planId
                : (primarySub?.plan || null);
            return {
                id: cIdStr,
                userId: uIdStr,
                name: c.name || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.name || 'Client',
                email: c.email || userObj.email || '',
                mobile: c.mobile || userObj.mobile || '',
                dob: c.dob || userObj.dob || null,
                pan: c.pan || userObj.pan || null,
                aadhaar: c.aadhaar || userObj.aadhaar || null,
                category: c.category || 'INDIVIDUAL',
                occupation: c.occupation || 'OTHER',
                status: c.status || userObj.status || 'ACTIVE',
                kraVerified: c.kraVerified || false,
                riskProfile: prof?.riskProfile || 'MODERATE',
                city: prof?.city || null,
                state: prof?.state || null,
                address: prof?.address || null,
                joinedAt: userObj.createdAt || c.createdAt,
                lastLogin: userObj.lastLogin || null,
                activeSubscription: primarySub ? {
                    id: primarySub._id || primarySub.id,
                    plan: planObj ? {
                        id: planObj._id || planObj.id,
                        name: planObj.name || 'Subscription Plan',
                        price: planObj.price,
                        durationMonths: planObj.durationMonths || 1,
                        researchSegments: planObj.researchSegments || []
                    } : null,
                    startDate: primarySub.startDate,
                    endDate: primarySub.endDate,
                    status: primarySub.status,
                    amountTotal: primarySub.amountTotal || primarySub.amountBase || null
                } : null,
                subscriptionsCount: clientSubs.length,
                agreementsCount: agMap.get(cIdStr) || agMap.get(uIdStr) || 0,
                documentsCount: docMap.get(cIdStr) || docMap.get(uIdStr) || 0
            };
        });
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            company: tenant ? {
                id: tenantIdStr,
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
/**
 * GET /api/v1/third-party-api/stats
 * GET /api/v1/third-party-api/:tenantId/stats
 * Returns aggregated dashboard counts — accessible with x-tenant-api-key only (no JWT)
 */
const getThirdPartyStats = async (req, res) => {
    try {
        const tenant = await (0, exports.resolveTenantFromRequest)(req);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant company not found.' });
        }
        const tenantId = (tenant._id || tenant.id).toString();
        const [totalClients, activeClients, totalStaff, totalPlans, activePlans, totalResearch] = await Promise.all([
            db_1.default.Client.countDocuments({}),
            db_1.default.Client.countDocuments({ status: 'ACTIVE' }),
            db_1.default.Staff.countDocuments({}),
            db_1.default.Plan.countDocuments({ deletedAt: null }),
            db_1.default.Plan.countDocuments({ status: 'ACTIVE', deletedAt: null }),
            db_1.default.ResearchReport.countDocuments({ tenantId }).catch(() => 0)
        ]);
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            company: {
                id: tenantId,
                companyName: tenant.companyName,
                status: tenant.status
            },
            data: {
                clientCount: totalClients,
                activeClients,
                pendingClients: totalClients - activeClients,
                staffCount: totalStaff,
                planCount: activePlans,
                totalPlans,
                researchCount: totalResearch
            }
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch stats: ' + error.message
        });
    }
};
exports.getThirdPartyStats = getThirdPartyStats;
/**
 * GET /api/v1/third-party-api/compliance
 * GET /api/v1/third-party-api/:tenantId/compliance
 */
const getThirdPartyCompliance = async (req, res) => {
    try {
        const tenant = await (0, exports.resolveTenantFromRequest)(req);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant company not found.' });
        }
        const tenantId = (tenant._id || tenant.id).toString();
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const audits = await db_1.default.ComplianceAudit.find({
            $or: [{ tenantId }, { tenantId: tenant._id }]
        })
            .populate('requirementId')
            .populate('penalty')
            .lean();
        const normalizeAudit = (a) => {
            const reqObj = a.requirementId && typeof a.requirementId === 'object' ? a.requirementId : (a.requirement || {});
            return {
                id: a._id ? a._id.toString() : a.id,
                _id: a._id,
                tenantId,
                status: a.status,
                dueDate: a.dueDate,
                officerRemarks: a.officerRemarks,
                proofDocumentUrl: a.proofDocumentUrl,
                resolvedAt: a.resolvedAt,
                updatedAt: a.updatedAt,
                requirement: {
                    id: reqObj._id ? reqObj._id.toString() : reqObj.id,
                    serialNo: reqObj.serialNo,
                    requirement: reqObj.requirement || reqObj.title || 'SEBI Regulation',
                    frequency: reqObj.frequency,
                    frequencyType: reqObj.frequencyType,
                    severityLevel: reqObj.severityLevel,
                    penaltyAmount: reqObj.penaltyAmount
                },
                requirementId: reqObj,
                penalty: a.penalty || null,
                tenant: {
                    id: tenantId,
                    companyName: tenant.companyName,
                    sebiRegistration: tenant.sebiRegistration,
                    domainUrl: tenant.domainUrl,
                    website: tenant.website
                }
            };
        };
        const upcoming = audits.filter((a) => (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'UPCOMING') &&
            a.dueDate && new Date(a.dueDate) >= now && new Date(a.dueDate) <= thirtyDaysFromNow).map(normalizeAudit);
        const due = audits.filter((a) => (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'DUE') &&
            a.dueDate && new Date(a.dueDate) >= now).map(normalizeAudit);
        const overdue = audits.filter((a) => ((a.status === 'PENDING' || a.status === 'OVERDUE') && a.dueDate && new Date(a.dueDate) < now) ||
            a.status === 'OVERDUE').map(normalizeAudit);
        const penalty = audits.filter((a) => a.penalty && (a.penalty.status === 'PENDING_PAYMENT' || a.status === 'PENALTY')).map(normalizeAudit);
        const closed = audits.filter((a) => a.status === 'COMPLIANT' || a.status === 'PENALTY_RESOLVED' || a.status === 'CLOSED').map(normalizeAudit);
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            company: {
                id: tenantId,
                companyName: tenant.companyName,
                sebiRegistration: tenant.sebiRegistration,
                bseEnrollment: tenant.bseEnrollment,
                domainUrl: tenant.domainUrl,
                website: tenant.website,
                status: tenant.status
            },
            data: {
                counts: {
                    upcoming: upcoming.length,
                    due: due.length,
                    overdue: overdue.length,
                    penalty: penalty.length,
                    closed: closed.length,
                    total: audits.length
                },
                upcoming,
                due,
                overdue,
                penalty,
                closed
            }
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch third party compliance: ' + error.message
        });
    }
};
exports.getThirdPartyCompliance = getThirdPartyCompliance;
/**
 * POST /api/v1/third-party-api/compliance/sweep
 * POST /api/v1/third-party-api/:tenantId/compliance/sweep
 */
const runThirdPartyComplianceSweep = async (req, res) => {
    try {
        const tenant = await (0, exports.resolveTenantFromRequest)(req);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant company not found.' });
        }
        const tenantId = (tenant._id || tenant.id).toString();
        const { checkComplianceForTenant } = await Promise.resolve().then(() => __importStar(require('../controllers/complianceController')));
        const alertsCreated = await checkComplianceForTenant(tenantId);
        return res.status(200).json({
            success: true,
            source: 'THIRD_PARTY_API',
            message: `Compliance sweep completed for ${tenant.companyName}. Evaluated rules and updated audit records.`,
            company: {
                id: tenantId,
                companyName: tenant.companyName
            },
            alertsGenerated: Array.isArray(alertsCreated) ? alertsCreated.length : 0
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to execute compliance sweep: ' + error.message
        });
    }
};
exports.runThirdPartyComplianceSweep = runThirdPartyComplianceSweep;
