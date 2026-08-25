import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';

const SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED', 'CLIENT'];

export const getRoles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: { users: true }
        }
      }
    });

    const formattedRoles = roles
      .filter(r => r.name !== 'CLIENT' && r.name !== 'PERSON_ASSOCIATED')
      .map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        allowMultiDeviceLogin: role.allowMultiDeviceLogin,
        permissions: role.permissions.map(p => p.permission.code),
        isAssigned: role._count.users > 0
    }));

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
    const existing = await prisma.role.findUnique({
      where: { name: formattedName }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Role '${formattedName}' already exists.`
      });
    }

    const newRole = await prisma.role.create({
      data: {
        name: formattedName,
        description
      }
    });

    await logAudit({
      tenantId: req.user?.tenantId,
      userId: req.user!.id,
      action: 'CREATE',
      module: 'USERS',
      newValue: JSON.stringify(newRole),
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: {
        id: newRole.id,
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
    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } }
    });

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

    const oldPerms = role.permissions.map(p => p.permission.code);

    const updatedRole = await prisma.$transaction(async (tx) => {
      // 1. Delete existing role permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      });

      // 2. Fetch the permissions matching the request codes
      const dbPermissions = await tx.permission.findMany({
        where: {
          code: { in: filteredPermissions }
        }
      });

      // 3. Create new role permission links
      if (dbPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dbPermissions.map(perm => ({
            roleId: id,
            permissionId: perm.id
          }))
        });
      }

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: dbPermissions.map(p => p.code)
      };
    });

    await logAudit({
      tenantId: req.user?.tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'USERS',
      oldValue: JSON.stringify(oldPerms),
      newValue: JSON.stringify(updatedRole.permissions),
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Access permissions updated successfully.',
      data: updatedRole
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
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } }
    });

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
        const existing = await prisma.role.findUnique({ where: { name: formattedName } });
        if (existing) {
          return res.status(400).json({ success: false, message: `Role '${formattedName}' already exists.` });
        }
      }

      if (role._count.users > 0) {
        return res.status(400).json({ success: false, message: 'Cannot edit role name because it is assigned to one or more users.' });
      }

      dataToUpdate.name = formattedName;
      dataToUpdate.description = description;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided.' });
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: dataToUpdate
    });

    await logAudit({
      tenantId: req.user?.tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'USERS',
      oldValue: JSON.stringify(role),
      newValue: JSON.stringify(updatedRole),
      ipAddress: req.ip
    });

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
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

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

    if (role._count.users > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role because it is assigned to one or more users.'
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated permissions first
      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      });

      // 2. Delete the role
      await tx.role.delete({
        where: { id }
      });
    });

    await logAudit({
      tenantId: req.user?.tenantId,
      userId: req.user!.id,
      action: 'DELETE',
      module: 'USERS',
      oldValue: JSON.stringify(role),
      ipAddress: req.ip
    });

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

