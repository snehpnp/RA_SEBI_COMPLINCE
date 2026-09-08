import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { syncTenantToRemote } from '../services/tenantSyncDispatcher';

export const getTenantPermissions = async (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.params;
  try {
    const permissions = await prisma.adminPermission.findMany({
      where: { tenantId },
      orderBy: { module: 'asc' }
    });

    return res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTenantPermissions = async (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ success: false, message: 'Permissions array is required.' });
  }

  try {
    const updated = await prisma.$transaction(
      permissions.map((p: any) =>
        prisma.adminPermission.upsert({
          where: {
            tenantId_module: {
              tenantId,
              module: p.module
            }
          },
          update: {
            canView: p.canView ?? true,
            canCreate: p.canCreate ?? true,
            canEdit: p.canEdit ?? true,
            canDelete: p.canDelete ?? true,
            canExport: p.canExport ?? true,
            isEnabled: p.isEnabled ?? true,
            customLimits: typeof p.customLimits === 'object' ? JSON.stringify(p.customLimits) : p.customLimits,
            updatedBy: req.user?.id
          },
          create: {
            tenantId,
            module: p.module,
            canView: p.canView ?? true,
            canCreate: p.canCreate ?? true,
            canEdit: p.canEdit ?? true,
            canDelete: p.canDelete ?? true,
            canExport: p.canExport ?? true,
            isEnabled: p.isEnabled ?? true,
            customLimits: typeof p.customLimits === 'object' ? JSON.stringify(p.customLimits) : p.customLimits,
            updatedBy: req.user?.id
          }
        })
      )
    );

    if (req.user?.id) {
      await logAudit({
        tenantId,
        userId: req.user.id,
        action: 'UPDATE',
        module: 'PERMISSIONS',
        newValue: JSON.stringify(permissions)
      });
    }

    // Auto-sync permission changes to remote domainUrl and dedicated MongoDB in background
    syncTenantToRemote(tenantId, { reason: 'PERMISSIONS_UPDATE' }).catch(err => {
      console.warn('Background sync for tenant permissions error:', err);
    });

    return res.status(200).json({
      success: true,
      message: 'Admin permissions updated and dispatched to company domain database successfully.',
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
