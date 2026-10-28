"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTenantPermissions = exports.getTenantPermissions = void 0;
const db_1 = __importDefault(require("../config/db"));
const auditService_1 = require("../services/auditService");
const tenantSyncDispatcher_1 = require("../services/tenantSyncDispatcher");
const getTenantPermissions = async (req, res) => {
    const { tenantId } = req.params;
    try {
        const permissions = await db_1.default.AdminPermission.find({ tenantId })
            .sort({ module: 1 })
            .lean();
        return res.status(200).json({
            success: true,
            data: permissions
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTenantPermissions = getTenantPermissions;
const updateTenantPermissions = async (req, res) => {
    const { tenantId } = req.params;
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
        return res.status(400).json({ success: false, message: 'Permissions array is required.' });
    }
    try {
        const updated = await Promise.all(permissions.map(async (p) => {
            const updateData = {
                canView: p.canView ?? true,
                canCreate: p.canCreate ?? true,
                canEdit: p.canEdit ?? true,
                canDelete: p.canDelete ?? true,
                canExport: p.canExport ?? true,
                isEnabled: p.isEnabled ?? true,
                customLimits: typeof p.customLimits === 'object' ? JSON.stringify(p.customLimits) : p.customLimits,
                updatedBy: req.user?.id
            };
            return await db_1.default.AdminPermission.findOneAndUpdate({ tenantId, module: p.module }, {
                $set: updateData,
                $setOnInsert: { tenantId, module: p.module }
            }, { upsert: true, returnDocument: 'after', lean: true });
        }));
        if (req.user?.id) {
            await (0, auditService_1.logAudit)({
                tenantId,
                userId: req.user.id,
                action: 'UPDATE',
                module: 'PERMISSIONS',
                newValue: JSON.stringify(permissions)
            });
        }
        // Auto-sync permission changes to remote domainUrl and dedicated MongoDB in background
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'PERMISSIONS_UPDATE' }).catch(err => {
            console.warn('Background sync for tenant permissions error:', err);
        });
        return res.status(200).json({
            success: true,
            message: 'Admin permissions updated and dispatched to company domain database successfully.',
            data: updated
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateTenantPermissions = updateTenantPermissions;
