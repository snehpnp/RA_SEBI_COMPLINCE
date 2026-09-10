"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRole = exports.updateRole = exports.updateRolePermissions = exports.createRole = exports.getRoles = void 0;
const db_1 = __importDefault(require("../config/db"));
const auditService_1 = require("../services/auditService");
const tenantSyncDispatcher_1 = require("../services/tenantSyncDispatcher");
const SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED', 'CLIENT'];
const getRoles = async (req, res) => {
    try {
        const roles = await db_1.default.Role.find({}).lean();
        const roleIds = roles.map((r) => r._id || r.id);
        // Fetch all role permissions populated with permission details
        const rolePermissions = await db_1.default.RolePermission.find({
            roleId: { $in: roleIds }
        }).populate('permissionId').lean();
        // Fetch user counts grouped by roleId
        const userCounts = await db_1.default.User.aggregate([
            { $match: { roleId: { $in: roleIds } } },
            { $group: { _id: '$roleId', count: { $sum: 1 } } }
        ]);
        const userCountMap = new Map(userCounts.map((uc) => [String(uc._id), uc.count]));
        // Group permissions by roleId
        const permMap = new Map();
        for (const rp of rolePermissions) {
            const rId = String(rp.roleId);
            const permCode = rp.permissionId?.code || rp.permission?.code;
            if (permCode) {
                if (!permMap.has(rId))
                    permMap.set(rId, []);
                permMap.get(rId).push(permCode);
            }
        }
        const formattedRoles = roles
            .filter((r) => r.name !== 'CLIENT' && r.name !== 'PERSON_ASSOCIATED')
            .map((role) => {
            const idStr = String(role._id || role.id);
            return {
                id: idStr,
                name: role.name,
                description: role.description,
                allowMultiDeviceLogin: role.allowMultiDeviceLogin || false,
                permissions: permMap.get(idStr) || [],
                isAssigned: (userCountMap.get(idStr) || 0) > 0
            };
        });
        return res.status(200).json({
            success: true,
            data: formattedRoles
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch roles',
            errors: [error.message]
        });
    }
};
exports.getRoles = getRoles;
const createRole = async (req, res) => {
    const { name, description } = req.body;
    if (!name || name.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Role name must be at least 2 characters long.'
        });
    }
    // Format to UPPERCASE with underscores, e.g. "Research Analyst" -> "RESEARCH_ANALYST"
    const formattedName = name.toUpperCase().trim().replace(/\s+/g, '_');
    try {
        const existing = await db_1.default.Role.findOne({
            name: formattedName
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Role '${formattedName}' already exists.`
            });
        }
        const newRole = await db_1.default.Role.create({
            name: formattedName,
            description
        });
        await (0, auditService_1.logAudit)({
            tenantId: req.user?.tenantId,
            userId: req.user.id,
            action: 'CREATE',
            module: 'USERS',
            newValue: JSON.stringify(newRole),
            ipAddress: req.ip
        });
        (0, tenantSyncDispatcher_1.syncAllTenantsToRemote)({ reason: 'ROLE_UPDATE' }).catch(() => { });
        return res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: {
                id: String(newRole._id || newRole.id),
                name: newRole.name,
                description: newRole.description,
                permissions: []
            }
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create role',
            errors: [error.message]
        });
    }
};
exports.createRole = createRole;
const updateRolePermissions = async (req, res) => {
    const { id } = req.params;
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
        return res.status(400).json({
            success: false,
            message: 'Permissions must be provided as an array of codes.'
        });
    }
    try {
        const role = await db_1.default.Role.findById(id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found.'
            });
        }
        // Lock ADMIN and SUPER_ADMIN from modification
        if (role.name === 'SUPER_ADMIN' || role.name === 'ADMIN') {
            return res.status(400).json({
                success: false,
                message: `Permissions for '${role.name}' role are locked for safety and cannot be modified.`
            });
        }
        // Restrict global settings, roles, and staff logs from non-admins
        const RESTRICTED_PERMISSIONS = ['ACCESS_SETTINGS', 'ACCESS_ROLES', 'ACCESS_STAFF_LOGS'];
        const filteredPermissions = permissions.filter(p => !RESTRICTED_PERMISSIONS.includes(p));
        const existingRolePerms = await db_1.default.RolePermission.find({ roleId: id }).populate('permissionId').lean();
        const oldPerms = existingRolePerms.map((p) => p.permissionId?.code || p.permission?.code).filter(Boolean);
        // 1. Delete existing role permissions
        await db_1.default.RolePermission.deleteMany({ roleId: id });
        // 2. Fetch the permissions matching the request codes
        const dbPermissions = await db_1.default.Permission.find({
            code: { $in: filteredPermissions }
        }).lean();
        // 3. Create new role permission links
        if (dbPermissions.length > 0) {
            await db_1.default.RolePermission.insertMany(dbPermissions.map((perm) => ({
                roleId: id,
                permissionId: perm._id || perm.id
            })));
        }
        const updatedData = {
            id: String(role._id || role.id),
            name: role.name,
            description: role.description,
            permissions: dbPermissions.map((p) => p.code)
        };
        await (0, auditService_1.logAudit)({
            tenantId: req.user?.tenantId,
            userId: req.user.id,
            action: 'UPDATE',
            module: 'USERS',
            oldValue: JSON.stringify(oldPerms),
            newValue: JSON.stringify(updatedData.permissions),
            ipAddress: req.ip
        });
        (0, tenantSyncDispatcher_1.syncAllTenantsToRemote)({ reason: 'ROLE_PERMISSION_UPDATE' }).catch(() => { });
        return res.status(200).json({
            success: true,
            message: 'Access permissions updated successfully.',
            data: updatedData
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update permissions',
            errors: [error.message]
        });
    }
};
exports.updateRolePermissions = updateRolePermissions;
const updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, description, allowMultiDeviceLogin } = req.body;
    try {
        const role = await db_1.default.Role.findById(id);
        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }
        const dataToUpdate = {};
        if (allowMultiDeviceLogin !== undefined) {
            dataToUpdate.allowMultiDeviceLogin = allowMultiDeviceLogin;
        }
        if (name) {
            if (name.trim().length < 2) {
                return res.status(400).json({ success: false, message: 'Role name must be at least 2 characters long.' });
            }
            const formattedName = name.toUpperCase().trim().replace(/\s+/g, '_');
            if (SYSTEM_ROLES.includes(role.name)) {
                return res.status(400).json({ success: false, message: `System role '${role.name}' name cannot be modified.` });
            }
            if (role.name !== formattedName) {
                const existing = await db_1.default.Role.findOne({ name: formattedName });
                if (existing && String(existing._id || existing.id) !== id) {
                    return res.status(400).json({ success: false, message: `Role '${formattedName}' already exists.` });
                }
            }
            const userCount = await db_1.default.User.countDocuments({ roleId: id });
            if (userCount > 0) {
                return res.status(400).json({ success: false, message: 'Cannot edit role name because it is assigned to one or more users.' });
            }
            dataToUpdate.name = formattedName;
            dataToUpdate.description = description;
        }
        else if (description !== undefined) {
            dataToUpdate.description = description;
        }
        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ success: false, message: 'No updates provided.' });
        }
        const updatedRole = await db_1.default.Role.findByIdAndUpdate(id, { $set: dataToUpdate }, { returnDocument: 'after' });
        await (0, auditService_1.logAudit)({
            tenantId: req.user?.tenantId,
            userId: req.user.id,
            action: 'UPDATE',
            module: 'USERS',
            oldValue: JSON.stringify(role),
            newValue: JSON.stringify(updatedRole),
            ipAddress: req.ip
        });
        (0, tenantSyncDispatcher_1.syncAllTenantsToRemote)({ reason: 'ROLE_UPDATE' }).catch(() => { });
        return res.status(200).json({
            success: true,
            message: 'Role updated successfully',
            data: updatedRole
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update role',
            errors: [error.message]
        });
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res) => {
    const { id } = req.params;
    try {
        const role = await db_1.default.Role.findById(id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found.'
            });
        }
        if (SYSTEM_ROLES.includes(role.name)) {
            return res.status(400).json({
                success: false,
                message: `System role '${role.name}' cannot be deleted.`
            });
        }
        const userCount = await db_1.default.User.countDocuments({ roleId: id });
        if (userCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete role because it is assigned to one or more users.'
            });
        }
        // 1. Delete associated permissions first
        await db_1.default.RolePermission.deleteMany({ roleId: id });
        // 2. Delete the role
        await db_1.default.Role.findByIdAndDelete(id);
        await (0, auditService_1.logAudit)({
            tenantId: req.user?.tenantId,
            userId: req.user.id,
            action: 'DELETE',
            module: 'USERS',
            oldValue: JSON.stringify(role),
            ipAddress: req.ip
        });
        (0, tenantSyncDispatcher_1.syncAllTenantsToRemote)({ reason: 'ROLE_DELETE' }).catch(() => { });
        return res.status(200).json({
            success: true,
            message: 'Role deleted successfully.'
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to delete role',
            errors: [error.message]
        });
    }
};
exports.deleteRole = deleteRole;
