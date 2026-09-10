import { Response } from 'express';
import dynamicDb from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { syncTenantToRemote } from '../services/tenantSyncDispatcher';

export const getTenantPermissions = async (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.params;
  try {
    const permissions = await dynamicDb.AdminPermission.find({ tenantId })
      .sort({ module: 1 })
      .lean();

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
    const updated = await Promise.all(
      permissions.map(async (p: any) => {
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

        return await dynamicDb.AdminPermission.findOneAndUpdate(
          { tenantId, module: p.module },
          {
            $set: updateData,
            $setOnInsert: { tenantId, module: p.module }
          },
          { upsert: true, returnDocument: 'after', lean: true }
        );
      })
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
