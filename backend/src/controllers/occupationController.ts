import { Request, Response } from 'express';
import dynamicDb from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';

export const DEFAULT_OCCUPATIONS = [
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
async function ensureDefaultOccupations(tenantId?: any) {
  const query = tenantId ? { tenantId } : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
  const count = await dynamicDb.Occupation.countDocuments(query);
  if (count === 0) {
    const docs = DEFAULT_OCCUPATIONS.map(name => ({
      tenantId: tenantId || null,
      name,
      status: 'ACTIVE',
      isDefault: true
    }));
    await dynamicDb.Occupation.insertMany(docs);
  }
}

/**
 * Public/Client endpoint: returns ACTIVE occupations for dropdowns
 */
export const getPublicOccupations = async (req: Request, res: Response) => {
  try {
    const queryTenantId = req.query.tenantId as string;
    const headerTenantId = req.headers['x-tenant-id'] as string;
    const authTenantId = (req as any).user?.tenantId;
    let tenantId = authTenantId || headerTenantId || queryTenantId || null;

    if (!tenantId) {
      const singleTenant = await dynamicDb.Tenant.findOne({ status: 'ACTIVE' }).lean();
      if (singleTenant) {
        tenantId = (singleTenant._id || singleTenant.id)?.toString();
      }
    }

    if (tenantId) {
      await ensureDefaultOccupations(tenantId);
    } else {
      await ensureDefaultOccupations(null);
    }

    const filter: any = {
      status: 'ACTIVE',
      ...(tenantId ? { tenantId } : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] })
    };

    const occupations = await dynamicDb.Occupation.find(filter)
      .sort({ isDefault: -1, name: 1 })
      .lean();

    // Deduplicate by name (case-insensitive)
    const seen = new Set<string>();
    const deduplicated: any[] = [];
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
  } catch (error: any) {
    console.error('Error fetching public occupations:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch occupations' });
  }
};

/**
 * Admin endpoint: returns all occupations (ACTIVE & INACTIVE) for management
 */
export const getAdminOccupations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (tenantId) {
      await ensureDefaultOccupations(tenantId);
    } else {
      await ensureDefaultOccupations(null);
    }

    const filter: any = tenantId
      ? { tenantId }
      : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };

    const occupations = await dynamicDb.Occupation.find(filter)
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: occupations.map((o: any) => ({
        id: o._id?.toString() || o.id,
        _id: o._id,
        name: o.name,
        status: o.status,
        isDefault: !!o.isDefault,
        createdAt: o.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Error fetching admin occupations:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch occupations' });
  }
};

/**
 * Admin endpoint: create a new occupation
 */
export const createOccupation = async (req: AuthenticatedRequest, res: Response) => {
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
    const existing = await dynamicDb.Occupation.findOne({
      ...(tenantId ? { tenantId } : { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] }),
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).lean();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Occupation "${trimmedName}" already exists.`
      });
    }

    const occupation = await dynamicDb.Occupation.create({
      tenantId: tenantId || null,
      name: trimmedName,
      status: 'ACTIVE',
      isDefault: false,
      createdById: req.user?.id || null
    });

    if (tenantId && req.user?.id) {
      logAudit({
        tenantId,
        userId: req.user.id,
        action: 'CREATE',
        module: 'SETTINGS',
        newValue: { name: trimmedName },
        ipAddress: req.ip
      }).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: 'Occupation created successfully',
      data: occupation
    });
  } catch (error: any) {
    console.error('Error creating occupation:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create occupation' });
  }
};

/**
 * Admin endpoint: update / rename an occupation
 * Note: Existing clients retain their saved occupation snapshot; their records are not modified.
 */
export const updateOccupation = async (req: AuthenticatedRequest, res: Response) => {
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

    const occupation = await dynamicDb.Occupation.findById(id);
    if (!occupation) {
      return res.status(404).json({ success: false, message: 'Occupation not found.' });
    }

    // Check duplicate with another item
    const duplicate = await dynamicDb.Occupation.findOne({
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
      logAudit({
        tenantId,
        userId: req.user.id,
        action: 'UPDATE',
        module: 'SETTINGS',
        oldValue: { name: oldName },
        newValue: { name: trimmedName },
        ipAddress: req.ip
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: 'Occupation updated successfully',
      data: occupation
    });
  } catch (error: any) {
    console.error('Error updating occupation:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update occupation' });
  }
};

/**
 * Admin endpoint: toggle status (ACTIVE <-> INACTIVE)
 */
export const toggleOccupationStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const occupation = await dynamicDb.Occupation.findById(id);
    if (!occupation) {
      return res.status(404).json({ success: false, message: 'Occupation not found.' });
    }

    const newStatus = occupation.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    occupation.status = newStatus;
    await occupation.save();

    if (tenantId && req.user?.id) {
      logAudit({
        tenantId,
        userId: req.user.id,
        action: 'UPDATE',
        module: 'SETTINGS',
        oldValue: { status: occupation.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
        newValue: { status: newStatus },
        ipAddress: req.ip
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: `Occupation marked as ${newStatus}`,
      data: occupation
    });
  } catch (error: any) {
    console.error('Error toggling occupation status:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to toggle status' });
  }
};

/**
 * Admin endpoint: delete an occupation
 */
export const deleteOccupation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const occupation = await dynamicDb.Occupation.findById(id);
    if (!occupation) {
      return res.status(404).json({ success: false, message: 'Occupation not found.' });
    }

    await dynamicDb.Occupation.findByIdAndDelete(id);

    if (tenantId && req.user?.id) {
      logAudit({
        tenantId,
        userId: req.user.id,
        action: 'DELETE',
        module: 'SETTINGS',
        oldValue: { name: occupation.name },
        ipAddress: req.ip
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: 'Occupation deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting occupation:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete occupation' });
  }
};
