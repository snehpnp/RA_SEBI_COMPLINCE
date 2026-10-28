import { Request, Response } from 'express';
import dynamicDb from '../config/db';
import { logAudit } from '../services/auditService';

// Fetch client subscriptions
export const getSubscriptions = async (req: Request, res: Response) => {
  const { tenantId, id: userId } = (req as any).user;

  try {
    let client: any = await dynamicDb.Client.findOne({ userId }).lean();
    if (!client) {
      client = await dynamicDb.Client.findById(userId).lean();
    }

    const clientId = client ? (client._id || client.id) : userId;

    const subscriptions = await dynamicDb.Subscription.find({
      $or: [
        { clientId },
        { clientId: userId }
      ]
    })
      .populate('planId')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = await Promise.all(subscriptions.map(async (s: any) => {
      let planObj = s.planId;
      if (planObj && typeof planObj === 'object' && (planObj.name || planObj.title)) {
        return {
          ...s,
          id: String(s._id || s.id),
          plan: {
            ...planObj,
            id: String(planObj._id || planObj.id)
          }
        };
      } else if (planObj) {
        const foundPlan: any = await dynamicDb.Plan.findById(planObj).lean();
        return {
          ...s,
          id: String(s._id || s.id),
          plan: foundPlan ? {
            ...foundPlan,
            id: String(foundPlan._id || foundPlan.id)
          } : null
        };
      }
      return {
        ...s,
        id: String(s._id || s.id),
        plan: null
      };
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Fetch client payment history
export const getPaymentHistory = async (req: Request, res: Response) => {
  const { tenantId, id: userId } = (req as any).user;

  try {
    const client: any = await dynamicDb.Client.findOne({ userId }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const clientId = client._id || client.id;
    const payments = await dynamicDb.Payment.find({
      $or: [
        { clientId },
        { clientId: userId }
      ],
      tenantId
    })
      .populate('couponId')
      .populate('planId')
      .sort({ createdAt: -1 })
      .lean();

    const couponIds = [...new Set(payments.map((p: any) => p.couponId ? (typeof p.couponId === 'object' ? p.couponId._id || p.couponId.id : p.couponId) : null).filter(Boolean))];
    const coupons = await dynamicDb.Coupon.find({ _id: { $in: couponIds } }).lean();
    const couponMap = new Map(coupons.map((c: any) => [String(c._id || c.id), { ...c, id: String(c._id || c.id) }]));

    const tenantObj: any = await dynamicDb.Tenant.findById(tenantId).lean();
    const isGstEnabled = tenantObj?.gstEnabled !== false;
    const gstCalculationType = tenantObj?.gstCalculationType || 'INCLUSIVE';

    const formatted = payments.map((p: any) => {
      const cIdStr = p.couponId ? String(typeof p.couponId === 'object' ? (p.couponId._id || p.couponId.id) : p.couponId) : null;
      const couponObj = (p.couponId && typeof p.couponId === 'object' && p.couponId.code) ? p.couponId : (cIdStr ? couponMap.get(cIdStr) : null);
      return {
        ...p,
        id: String(p._id || p.id),
        coupon: couponObj || null,
        couponCode: couponObj?.code || null,
        plan: p.planId || null,
        gstEnabled: isGstEnabled,
        gstCalculationType
      };
    });

    return res.status(200).json({ success: true, data: formatted, gstEnabled: isGstEnabled, gstCalculationType });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Update client profile
export const updateProfile = async (req: Request, res: Response) => {
  const { tenantId, id: userId } = (req as any).user;
  const { addressLine1, city, state, zipCode, occupation, name, mobile } = req.body;

  try {
    const client: any = await dynamicDb.Client.findOne({ userId }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const clientUpdate: any = {};
    if (occupation !== undefined) clientUpdate.occupation = occupation;
    if (name) clientUpdate.name = name;
    if (mobile) clientUpdate.mobile = mobile;

    if (Object.keys(clientUpdate).length > 0) {
      await dynamicDb.Client.findByIdAndUpdate(client._id || client.id, {
        $set: clientUpdate
      });
    }

    if (name) {
      await dynamicDb.User.findByIdAndUpdate(userId, {
        $set: { firstName: name }
      });
    }

    await dynamicDb.ClientProfile.findOneAndUpdate(
      { clientId: client._id || client.id },
      {
        $set: { addressLine1, city, state, zipCode },
        $setOnInsert: { clientId: client._id || client.id, country: 'India' }
      },
      { upsert: true, returnDocument: 'after' }
    );

    await logAudit({
      tenantId,
      userId,
      action: 'UPDATE',
      module: 'CLIENTS',
      ipAddress: req.ip
    });

    return res.status(200).json({ success: true, message: 'Profile updated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Fetch client notifications
export const getNotifications = async (req: Request, res: Response) => {
  const { tenantId, id: userId, email } = (req as any).user;

  try {
    const client: any = await dynamicDb.Client.findOne({ userId }).lean();
    const clientId = client?._id?.toString() || client?.id;

    const orConditions: any[] = [
      { recipient: String(userId) },
      { recipient: email }
    ];
    if (clientId) {
      orConditions.push({ recipient: String(clientId) });
      orConditions.push({ 'data.clientId': String(clientId) });
    }

    const query: any = {
      $or: orConditions
    };
    if (tenantId) {
      query.tenantId = tenantId;
    }

    const notifications = await dynamicDb.NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formatted = notifications.map((n: any) => ({
      ...n,
      id: String(n._id || n.id),
      read: n.isRead || n.read || n.status === 'READ',
      isRead: n.isRead || n.read || n.status === 'READ'
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Mark client notifications as read
export const markNotificationsAsRead = async (req: Request, res: Response) => {
  const { tenantId, id: userId, email } = (req as any).user;
  const { notificationId } = req.body;

  try {
    const client: any = await dynamicDb.Client.findOne({ userId }).lean();
    const clientId = client?._id?.toString() || client?.id;

    const orConditions: any[] = [
      { recipient: String(userId) },
      { recipient: email }
    ];
    if (clientId) {
      orConditions.push({ recipient: String(clientId) });
      orConditions.push({ 'data.clientId': String(clientId) });
    }

    const filter: any = {
      $or: orConditions
    };
    if (tenantId) {
      filter.tenantId = tenantId;
    }
    if (notificationId) {
      filter._id = notificationId;
    }

    await dynamicDb.NotificationLog.updateMany(filter, {
      $set: { isRead: true, status: 'READ' }
    });

    return res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

