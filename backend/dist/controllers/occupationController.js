"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOccupation = exports.toggleOccupationStatus = exports.updateOccupation = exports.createOccupation = exports.getAdminOccupations = exports.getPublicOccupations = exports.DEFAULT_OCCUPATIONS = void 0;
const db_1 = __importDefault(require("../config/db"));
const auditService_1 = require("../services/auditService");
exports.DEFAULT_OCCUPATIONS = [
    'Job / Salaried',
    'Business / Self-Employed',
    'Professional',
    'Student',
    'Retired',
    'Homemaker',
    'Others'
];
/**
 * Ensures default occupations exist for a tenant context.
 */
async function ensureDefaultOccupations(tenantId) {
    const query = tenantId ? { tenantId } : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
    const count = await db_1.default.Occupation.countDocuments(query);
    if (count === 0) {
        const docs = exports.DEFAULT_OCCUPATIONS.map(name => ({
            tenantId: tenantId || null,
            name,
            status: 'ACTIVE',
            isDefault: true
        }));
        await db_1.default.Occupation.insertMany(docs);
    }
}
/**
 * Public/Client endpoint: returns ACTIVE occupations for dropdowns
 */
const getPublicOccupations = async (req, res) => {
    try {
        const queryTenantId = req.query.tenantId;
        const headerTenantId = req.headers['x-tenant-id'];
        const authTenantId = req.user?.tenantId;
        let tenantId = authTenantId || headerTenantId || queryTenantId || null;
        if (!tenantId) {
            const singleTenant = await db_1.default.Tenant.findOne({ status: 'ACTIVE' }).lean();
            if (singleTenant) {
                tenantId = (singleTenant._id || singleTenant.id)?.toString();
            }
        }
        if (tenantId) {
            await ensureDefaultOccupations(tenantId);
        }
        else {
            await ensureDefaultOccupations(null);
        }
        const filter = {
            status: 'ACTIVE',
            ...(tenantId ? { tenantId } : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] })
        };
        const occupations = await db_1.default.Occupation.find(filter)
            .sort({ isDefault: -1, name: 1 })
            .lean();
        // Deduplicate by name (case-insensitive)
        const seen = new Set();
        const deduplicated = [];
        for (const o of occupations) {
            const key = o.name.trim().toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                deduplicated.push({
                    id: o._id?.toString() || o.id,
                    _id: o._id,
                    name: o.name,
                    status: o.status,
                    isDefault: !!o.isDefault
                });
            }
        }
        return res.status(200).json({
            success: true,
            data: deduplicated
        });
    }
    catch (error) {
        console.error('Error fetching public occupations:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch occupations' });
    }
};
exports.getPublicOccupations = getPublicOccupations;
/**
 * Admin endpoint: returns all occupations (ACTIVE & INACTIVE) for management
 */
const getAdminOccupations = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (tenantId) {
            await ensureDefaultOccupations(tenantId);
        }
        else {
            await ensureDefaultOccupations(null);
        }
        const filter = tenantId
            ? { tenantId }
            : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
        const occupations = await db_1.default.Occupation.find(filter)
            .sort({ createdAt: 1 })
            .lean();
        return res.status(200).json({
            success: true,
            data: occupations.map((o) => ({
                id: o._id?.toString() || o.id,
                _id: o._id,
                name: o.name,
                status: o.status,
                isDefault: !!o.isDefault,
                createdAt: o.createdAt
            }))
        });
    }
    catch (error) {
        console.error('Error fetching admin occupations:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch occupations' });
    }
};
exports.getAdminOccupations = getAdminOccupations;
/**
 * Admin endpoint: create a new occupation
 */
const createOccupation = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Occupation title is required (minimum 2 characters).'
            });
        }
        const trimmedName = name.trim();
        // Case-insensitive duplicate check within the tenant
        const existing = await db_1.default.Occupation.findOne({
            ...(tenantId ? { tenantId } : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] }),
            name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).lean();
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Occupation "${trimmedName}" already exists.`
            });
        }
        const occupation = await db_1.default.Occupation.create({
            tenantId: tenantId || null,
            name: trimmedName,
            status: 'ACTIVE',
            isDefault: false,
            createdById: req.user?.id || null
        });
        if (tenantId && req.user?.id) {
            (0, auditService_1.logAudit)({
                tenantId,
                userId: req.user.id,
                action: 'CREATE',
                module: 'SETTINGS',
                newValue: { name: trimmedName },
                ipAddress: req.ip
            }).catch(() => { });
        }
        return res.status(201).json({
            success: true,
            message: 'Occupation created successfully',
            data: occupation
        });
    }
    catch (error) {
        console.error('Error creating occupation:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to create occupation' });
    }
};
exports.createOccupation = createOccupation;
/**
 * Admin endpoint: update / rename an occupation
 * Note: Existing clients retain their saved occupation snapshot; their records are not modified.
 */
const updateOccupation = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Occupation title must be at least 2 characters.'
            });
        }
        const trimmedName = name.trim();
        const occupation = await db_1.default.Occupation.findById(id);
        if (!occupation) {
            return res.status(404).json({ success: false, message: 'Occupation not found.' });
        }
        // Check duplicate with another item
        const duplicate = await db_1.default.Occupation.findOne({
            _id: { $ne: id },
            ...(tenantId ? { tenantId } : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] }),
            name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).lean();
        if (duplicate) {
            return res.status(400).json({
                success: false,
                message: `Another occupation with name "${trimmedName}" already exists.`
            });
        }
        const oldName = occupation.name;
        occupation.name = trimmedName;
        await occupation.save();
        if (tenantId && req.user?.id) {
            (0, auditService_1.logAudit)({
                tenantId,
                userId: req.user.id,
                action: 'UPDATE',
                module: 'SETTINGS',
                oldValue: { name: oldName },
                newValue: { name: trimmedName },
                ipAddress: req.ip
            }).catch(() => { });
        }
        return res.status(200).json({
            success: true,
            message: 'Occupation updated successfully',
            data: occupation
        });
    }
    catch (error) {
        console.error('Error updating occupation:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to update occupation' });
    }
};
exports.updateOccupation = updateOccupation;
/**
 * Admin endpoint: toggle status (ACTIVE <-> INACTIVE)
 */
const toggleOccupationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const occupation = await db_1.default.Occupation.findById(id);
        if (!occupation) {
            return res.status(404).json({ success: false, message: 'Occupation not found.' });
        }
        const newStatus = occupation.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        occupation.status = newStatus;
        await occupation.save();
        if (tenantId && req.user?.id) {
            (0, auditService_1.logAudit)({
                tenantId,
                userId: req.user.id,
                action: 'UPDATE',
                module: 'SETTINGS',
                oldValue: { status: occupation.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
                newValue: { status: newStatus },
                ipAddress: req.ip
            }).catch(() => { });
        }
        return res.status(200).json({
            success: true,
            message: `Occupation marked as ${newStatus}`,
            data: occupation
        });
    }
    catch (error) {
        console.error('Error toggling occupation status:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to toggle status' });
    }
};
exports.toggleOccupationStatus = toggleOccupationStatus;
/**
 * Admin endpoint: delete an occupation
 */
const deleteOccupation = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const occupation = await db_1.default.Occupation.findById(id);
        if (!occupation) {
            return res.status(404).json({ success: false, message: 'Occupation not found.' });
        }
        await db_1.default.Occupation.findByIdAndDelete(id);
        if (tenantId && req.user?.id) {
            (0, auditService_1.logAudit)({
                tenantId,
                userId: req.user.id,
                action: 'DELETE',
                module: 'SETTINGS',
                oldValue: { name: occupation.name },
                ipAddress: req.ip
            }).catch(() => { });
        }
        return res.status(200).json({
            success: true,
            message: 'Occupation deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting occupation:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to delete occupation' });
    }
};
exports.deleteOccupation = deleteOccupation;
