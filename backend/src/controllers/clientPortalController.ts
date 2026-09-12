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

    const formatted = subscriptions.map((s: any) => ({
      ...s,
      id: String(s._id || s.id),
      plan: s.planId ? {
        ...s.planId,
        id: String(s.planId._id || s.planId.id)
      } : null
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
      .sort({ createdAt: -1 })
      .lean();

    const formatted = payments.map((p: any) => ({
      ...p,
      id: String(p._id || p.id),
      coupon: p.couponId || null
    }));

    return res.status(200).json({ success: true, data: formatted });
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
    const notifications = await dynamicDb.NotificationLog.find({
      tenantId,
      $or: [
        { recipient: email },
        { recipient: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: notifications });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};
