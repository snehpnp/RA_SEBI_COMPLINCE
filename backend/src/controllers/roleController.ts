import { Response } from 'express';
import dynamicDb from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { syncAllTenantsToRemote } from '../services/tenantSyncDispatcher';

const SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED', 'CLIENT'];

export const getRoles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await dynamicDb.Role.find({}).lean();
    const roleIds = roles.map((r: any) => r._id || r.id);

    // Fetch all role permissions populated with permission details
    const rolePermissions = await dynamicDb.RolePermission.find({
      roleId: { $in: roleIds }
    }).populate('permissionId').lean();

    // Fetch user counts grouped by roleId
    const userCounts = await dynamicDb.User.aggregate([
      { $match: { roleId: { $in: roleIds } } },
      { $group: { _id: '$roleId', count: { $sum: 1 } } }
    ]);
    const userCountMap = new Map(userCounts.map((uc: any) => [String(uc._id), uc.count]));

    // Group permissions by roleId
    const permMap = new Map<string, string[]>();
    for (const rp of rolePermissions) {
      const rId = String((rp as any).roleId);
      const permCode = (rp as any).permissionId?.code || (rp as any).permission?.code;
      if (permCode) {
        if (!permMap.has(rId)) permMap.set(rId, []);
        permMap.get(rId)!.push(permCode);
      }
    }

    const formattedRoles = roles
      .filter((r: any) => r.name !== 'CLIENT' && r.name !== 'PERSON_ASSOCIATED')
      .map((role: any) => {
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
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      errors: [error.message]
    });
  }
};

export const createRole = async (req: AuthenticatedRequest, res: Response) => {
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
    const existing = await dynamicDb.Role.findOne({
      name: formattedName
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Role '${formattedName}' already exists.`
      });
    }

    const newRole = await dynamicDb.Role.create({
      name: formattedName,
      description
    });

    await logAudit({
      tenantId: req.user?.tenantId,
      userId: req.user!.id,
      action: 'CREATE',
      module: 'USERS',
      newValue: JSON.stringify(newRole),
      ipAddress: req.ip
    });

    syncAllTenantsToRemote({ reason: 'ROLE_UPDATE' }).catch(() => {});

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
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create role',
      errors: [error.message]
    });
  }
};

export const updateRolePermissions = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      message: 'Permissions must be provided as an array of codes.'
    });
  }

  try {
    const role = await dynamicDb.Role.findById(id);

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

    const existingRolePerms = await dynamicDb.RolePermission.find({ roleId: id }).populate('permissionId').lean();
    const oldPerms = existingRolePerms.map((p: any) => p.permissionId?.code || p.permission?.code).filter(Boolean);

    // 1. Delete existing role permissions
    await dynamicDb.RolePermission.deleteMany({ roleId: id });

    // 2. Fetch the permissions matching the request codes
    const dbPermissions = await dynamicDb.Permission.find({
      code: { $in: filteredPermissions }
    }).lean();

    // 3. Create new role permission links
    if (dbPermissions.length > 0) {
      await dynamicDb.RolePermission.insertMany(
        dbPermissions.map((perm: any) => ({
          roleId: id,
          permissionId: perm._id || perm.id
        }))
      );
    }

    const updatedData = {
      id: String(role._id || role.id),
      name: role.name,
      description: role.description,
      permissions: dbPermissions.map((p: any) => p.code)
    };

    await logAudit({
      tenantId: req.user?.tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'USERS',
      oldValue: JSON.stringify(oldPerms),
      newValue: JSON.stringify(updatedData.permissions),
      ipAddress: req.ip
    });

    syncAllTenantsToRemote({ reason: 'ROLE_PERMISSION_UPDATE' }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Access permissions updated successfully.',
      data: updatedData
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update permissions',
      errors: [error.message]
    });
  }
};

export const updateRole = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, allowMultiDeviceLogin } = req.body;

  try {
    const role = await dynamicDb.Role.findById(id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const dataToUpdate: any = {};
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
        const existing = await dynamicDb.Role.findOne({ name: formattedName });
        if (existing && String(existing._id || existing.id) !== id) {
          return res.status(400).json({ success: false, message: `Role '${formattedName}' already exists.` });
        }
      }

      const userCount = await dynamicDb.User.countDocuments({ roleId: id });
      if (userCount > 0) {
        return res.status(400).json({ success: false, message: 'Cannot edit role name because it is assigned to one or more users.' });
      }

      dataToUpdate.name = formattedName;
      dataToUpdate.description = description;
    } else if (description !== undefined) {
      dataToUpdate.description = description;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided.' });
    }

    const updatedRole = await dynamicDb.Role.findByIdAndUpdate(
      id,
      { $set: dataToUpdate },
      { returnDocument: 'after' }
    );

    await logAudit({
      tenantId: req.user?.tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'USERS',
      oldValue: JSON.stringify(role),
      newValue: JSON.stringify(updatedRole),
      ipAddress: req.ip
    });

    syncAllTenantsToRemote({ reason: 'ROLE_UPDATE' }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: updatedRole
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update role',
      errors: [error.message]
    });
  }
};

export const deleteRole = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const role = await dynamicDb.Role.findById(id);

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

    const userCount = await dynamicDb.User.countDocuments({ roleId: id });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role because it is assigned to one or more users.'
      });
    }

    // 1. Delete associated permissions first
    await dynamicDb.RolePermission.deleteMany({ roleId: id });

    // 2. Delete the role
    await dynamicDb.Role.findByIdAndDelete(id);

    await logAudit({
      tenantId: req.user?.tenantId,
      userId: req.user!.id,
      action: 'DELETE',
      module: 'USERS',
      oldValue: JSON.stringify(role),
      ipAddress: req.ip
    });

    syncAllTenantsToRemote({ reason: 'ROLE_DELETE' }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully.'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      errors: [error.message]
    });
  }
};
