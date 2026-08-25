import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStocks = async (req: Request, res: Response) => {
  console.log('GET STOCKS QUERY:', req.query);
  try {
    const { query } = req.query;
    let whereClause = {};
    if (query && typeof query === 'string' && query.trim() !== '') {
      const q = query.trim().toUpperCase();
      whereClause = {
        OR: [
          { symbol: { contains: q } },
          { name: { contains: q } }
        ]
      };
    }

    const stocks = await prisma.stock.findMany({
      where: whereClause,
      take: 50, // Limit to 50 results for dropdown performance
      orderBy: { symbol: 'asc' }
    });

    return res.json({ success: true, data: stocks });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createSignal = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const userId = (req as any).user.id;

    const {
      segment, planIds, callType, tradeDuration, stockId,
      expiryDate, strikePrice, optionType, entryPrice, entryType, suggestedQuantity,
      target1, target2, target3, stoploss, description
    } = req.body;

    let reportUrl = null;
    if (req.file) {
      reportUrl = `/uploads/research/${req.file.filename}`;
    }

    const userRole = (req as any).user.role;
    const isFullAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    if (!isFullAdmin) {
      const hasAdd = await prisma.rolePermission.findFirst({
        where: { role: { name: userRole }, permission: { code: 'ADD_RESEARCH' } }
      });
      const hasOwn = await prisma.rolePermission.findFirst({
        where: { role: { name: userRole }, permission: { code: 'OWN_RESEARCH' } }
      });

      if (!hasAdd && !hasOwn) {
        return res.status(403).json({ success: false, message: 'You do not have permission to create signals.' });
      }
    }

    let parsedPlanIds: string[] = [];
    try {
      parsedPlanIds = JSON.parse(planIds);
    } catch (e) {
      if (typeof planIds === 'string') parsedPlanIds = [planIds];
    }

    if (!parsedPlanIds || parsedPlanIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one plan.' });
    }

    const createdSignals: any[] = [];

    // Use transaction to ensure all or nothing
    await prisma.$transaction(async (tx) => {
      for (const pId of parsedPlanIds) {
        const newSignal = await tx.signal.create({
          data: {
            tenantId,
            segment,
            planId: pId,
            callType,
            tradeDuration,
            stockId,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            strikePrice: strikePrice ? parseFloat(strikePrice) : null,
            optionType: optionType || null,
            entryPrice: parseFloat(entryPrice),
            entryType,
            suggestedQuantity,
            target1: parseFloat(target1),
            target2: target2 ? parseFloat(target2) : null,
            target3: target3 ? parseFloat(target3) : null,
            stoploss: parseFloat(stoploss),
            description,
            reportUrl,
            createdById: userId,
            status: 'OPEN'
          }
        });
        createdSignals.push(newSignal);
      }
    });

    return res.json({ success: true, data: createdSignals, message: 'Signals added successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const listSignals = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const userRole = (req as any).user.role;

    let whereClause: any = { tenantId };

    if (userRole === 'CLIENT') {
      const client = await prisma.client.findFirst({ where: { userId: (req as any).user.id } });
      if (!client) {
        return res.status(403).json({
          success: false,
          message: 'Access Restricted',
          errors: ['Client profile not found.']
        });
      }

      // Find all subscriptions (active, expired, etc.)
      const allSubs = await prisma.subscription.findMany({
        where: { clientId: client.id }
      });

      if (allSubs.length === 0) {
        whereClause.id = 'NO_ACCESS_DUE_TO_NO_SUBSCRIPTIONS';
      } else {
        // Construct OR clause: Signal must be created during the active window of the subscription
        const subConditions = allSubs.map(sub => {
          const conditions: any = {
            planId: sub.planId,
            createdAt: { gte: sub.startDate }
          };
          if (sub.endDate) {
            conditions.createdAt.lte = sub.endDate;
          }
          return conditions;
        });

        if (whereClause.OR) {
          // If there's already an OR clause, we need to wrap them in an AND
          whereClause.AND = [
            { OR: whereClause.OR },
            { OR: subConditions }
          ];
          delete whereClause.OR;
        } else {
          whereClause.OR = subConditions;
        }
      }
    } else {
      // Staff/Admin Permissions
      const isFullAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
      if (!isFullAdmin) {
        const hasAdd = await prisma.rolePermission.findFirst({
          where: { role: { name: userRole }, permission: { code: 'ADD_RESEARCH' } }
        });
        const hasView = await prisma.rolePermission.findFirst({
          where: { role: { name: userRole }, permission: { code: 'VIEW_RESEARCH' } }
        });
        const hasOwn = await prisma.rolePermission.findFirst({
          where: { role: { name: userRole }, permission: { code: 'OWN_RESEARCH' } }
        });

        if (!hasAdd && !hasView && !hasOwn) {
          return res.status(403).json({ success: false, message: 'You do not have permission to view signals.' });
        }

        if (!hasAdd && !hasView && hasOwn) {
          whereClause.createdById = (req as any).user.id;
        }
      }
    }

    const signals = await prisma.signal.findMany({
      where: whereClause,
      include: {
        stock: true,
        messages: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const planIds = signals.map(s => s.planId);
    const plans = await prisma.plan.findMany({ where: { id: { in: planIds } } });
    const categories = await prisma.planCategory.findMany({ where: { id: { in: planIds } } });

    const map = new Map();
    plans.forEach(p => map.set(p.id, p.name));
    categories.forEach(c => map.set(c.id, c.name));

    // Manually fetch researcher names
    const userIds = [...new Set(signals.map(s => s.createdById))];
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } });
    const userMap = new Map();
    users.forEach(u => userMap.set(u.id, `${u.firstName} ${u.lastName}`));

    const finalData = signals.map(s => ({
      ...s,
      planName: map.get(s.planId) || s.planId,
      createdByName: userMap.get(s.createdById) || 'Unknown Researcher'
    }));

    return res.json({ success: true, data: finalData });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const closeSignal = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const { id } = req.params;
    const { closeStatus, exitPrice, closeRemark, closeTargets, isFinalClose } = req.body;

    const signal = await prisma.signal.findFirst({
      where: { id, tenantId },
      include: { stock: true }
    });

    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found' });
    }

    const updatedSignal = await prisma.signal.update({
      where: { id },
      data: {
        status: isFinalClose ? 'CLOSED' : 'OPEN', // Only close if it's a final close
        closeStatus,
        exitPrice: exitPrice ? parseFloat(exitPrice) : null,
        closeRemark,
        closeTargets,
        closedAt: isFinalClose ? new Date() : null
      }
    });

    // Notify clients who were subscribed to this plan AT THE TIME the signal was created
    const allSubs = await prisma.subscription.findMany({
      where: {
        planId: signal.planId,
        startDate: { lte: signal.createdAt }
      },
      include: { client: { include: { user: true } } }
    });

    // Filter out subscriptions that expired BEFORE the signal was created
    const eligibleSubs = allSubs.filter(sub => !sub.endDate || sub.endDate >= signal.createdAt);

    const notificationPromises = eligibleSubs.map(sub => {
      return prisma.notificationLog.create({
        data: {
          tenantId,
          recipient: sub.client.userId,
          channel: 'INAPP',
          title: `Signal Update: ${signal.stock.symbol}`,
          message: `The signal for ${signal.stock.symbol} has been closed/updated. Status: ${closeStatus}. ${closeRemark ? `Remark: ${closeRemark}` : ''}`
        }
      });
    });

    await Promise.all(notificationPromises);

    return res.json({ success: true, data: updatedSignal, message: 'Signal closed successfully and clients notified.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadReport = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const reportUrl = `/uploads/research/${req.file.filename}`;

    const signal = await prisma.signal.findFirst({
      where: { id, tenantId }
    });

    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found' });
    }

    const updatedSignal = await prisma.signal.update({
      where: { id },
      data: { reportUrl }
    });

    return res.json({ success: true, data: updatedSignal, message: 'Report uploaded successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const addSignalMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const signalMessage = await prisma.signalMessage.create({
      data: {
        signalId: id,
        message
      }
    });

    const signal = await prisma.signal.findFirst({
      where: { id },
      include: { stock: true }
    });

    if (signal) {
      const tenantId = (req as any).user.tenantId || signal.tenantId;

      // Notify clients who were subscribed to this plan AT THE TIME the signal was created
      const allSubs = await prisma.subscription.findMany({
        where: {
          planId: signal.planId,
          startDate: { lte: signal.createdAt }
        },
        include: { client: { include: { user: true } } }
      });

      // Filter out subscriptions that expired BEFORE the signal was created
      const eligibleSubs = allSubs.filter(sub => !sub.endDate || sub.endDate >= signal.createdAt);

      const notificationPromises = eligibleSubs.map(sub => {
        return prisma.notificationLog.create({
          data: {
            tenantId,
            recipient: sub.client.userId,
            channel: 'INAPP',
            title: `Trade Update: ${signal.stock.symbol}`,
            message: `New update on trade ${signal.stock.symbol}: ${message}`
          }
        });
      });

      await Promise.all(notificationPromises);
    }

    res.status(201).json({ success: true, message: 'Alert sent successfully', data: signalMessage });
  } catch (error: any) {
    console.error('Error adding signal message:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
