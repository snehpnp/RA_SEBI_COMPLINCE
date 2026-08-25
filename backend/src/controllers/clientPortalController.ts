import { Request, Response } from 'express';
import prisma from '../config/db';
import { logAudit } from '../services/auditService';

// Fetch client subscriptions
export const getSubscriptions = async (req: Request, res: Response) => {
  const { tenantId, id: userId } = (req as any).user;

  try {
    const client = await prisma.client.findUnique({ where: { userId } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const subscriptions = await prisma.subscription.findMany({
      where: { clientId: client.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, data: subscriptions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Fetch client payment history
export const getPaymentHistory = async (req: Request, res: Response) => {
  const { tenantId, id: userId } = (req as any).user;

  try {
    const client = await prisma.client.findUnique({ where: { userId } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const payments = await prisma.payment.findMany({
      include: { coupon: true },
      where: { clientId: client.id, tenantId },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, data: payments });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

// Update client profile
export const updateProfile = async (req: Request, res: Response) => {
  const { tenantId, id: userId } = (req as any).user;
  const { addressLine1, city, state, zipCode, occupation, name, mobile } = req.body;

  try {
    const client = await prisma.client.findUnique({ where: { userId }, include: { profile: true } });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    // Update Client basic details
    await prisma.client.update({
      where: { id: client.id },
      data: { 
        occupation,
        ...(name && { name }),
        ...(mobile && { mobile })
      }
    });

    // Also update User if name provided
    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { firstName: name }
      });
    }

    // Update or Create Client Profile
    if (client.profile) {
      await prisma.clientProfile.update({
        where: { id: client.profile.id },
        data: { addressLine1, city, state, zipCode }
      });
    } else {
      await prisma.clientProfile.create({
        data: {
          clientId: client.id,
          addressLine1,
          city,
          state,
          zipCode
        }
      });
    }

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
    const notifications = await prisma.notificationLog.findMany({
      where: { 
        tenantId, 
        OR: [
          { recipient: email },
          { recipient: userId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, data: notifications });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};
