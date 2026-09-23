import { Request, Response } from 'express';
import mongoose from 'mongoose';
import dynamicDb, { centralModels } from '../config/db';

export const getStocks = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    let whereClause: any = {};
    if (query && typeof query === 'string' && query.trim() !== '') {
      const q = query.trim();
      whereClause = {
        $or: [
          { symbol: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } }
        ]
      };
    }

    const stocks = await dynamicDb.Stock.find(whereClause)
      .limit(50)
      .sort({ symbol: 1 })
      .lean();

    const formattedStocks = stocks.map((s: any) => ({
      ...s,
      id: s._id?.toString() || s.id
    }));

    return res.json({ success: true, data: formattedStocks });
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
      const roleDoc = await dynamicDb.Role.findOne({ name: userRole }).lean();
      const roleId = roleDoc?._id;
      const addPerm = await dynamicDb.Permission.findOne({ code: 'ADD_RESEARCH' }).lean();
      const ownPerm = await dynamicDb.Permission.findOne({ code: 'OWN_RESEARCH' }).lean();

      const hasAdd = addPerm && roleId ? await dynamicDb.RolePermission.findOne({ roleId, permissionId: addPerm._id }).lean() : null;
      const hasOwn = ownPerm && roleId ? await dynamicDb.RolePermission.findOne({ roleId, permissionId: ownPerm._id }).lean() : null;

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
    for (const pId of parsedPlanIds) {
      const newSignal = await dynamicDb.Signal.create({
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
      });

      createdSignals.push({
        ...newSignal.toObject(),
        id: newSignal._id.toString()
      });
    }

    return res.json({ success: true, data: createdSignals, message: 'Signals added successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

function calculatePotential(s: any) {
  const callType = (s.callType || 'BUY').toUpperCase();
  const isBuy = callType === 'BUY';
  const lastTarget = Number(s.target3 || s.target2 || s.target1 || s.entryPrice || 0);
  const entryPrice = Number(s.entryPrice || 0);
  const target1 = Number(s.target1 || entryPrice);

  const isTarget1Done = Boolean(
    (s.closeTargets && s.closeTargets.includes('TARGET1')) ||
    s.closeStatus === 'PARTIALLY_CLOSED' ||
    s.closeStatus === 'TARGET1_DONE' ||
    s.closeStatus === 'TARGET_1_REACHED'
  );

  const basePrice = isTarget1Done ? target1 : entryPrice;
  let remainingPct = 0;
  if (basePrice > 0 && lastTarget > 0) {
    if (isBuy) {
      remainingPct = Math.max(0, ((lastTarget - basePrice) / basePrice) * 100);
    } else {
      remainingPct = Math.max(0, ((basePrice - lastTarget) / basePrice) * 100);
    }
  }

  const formattedPct = remainingPct.toFixed(1);
  const directionText = isBuy ? 'Upside' : 'Downside';
  const potentialMessage = isTarget1Done
    ? `🎯 Target 1 Done • +${formattedPct}% ${directionText} Remaining`
    : `🔥 +${formattedPct}% Potential ${directionText} Remaining`;

  return {
    remainingPotentialPercent: parseFloat(formattedPct),
    isTarget1Done,
    potentialMessage,
    directionText
  };
}

export const listSignals = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const userRole = (req as any).user.role;

    if (userRole === 'CLIENT') {
      const client = await dynamicDb.Client.findOne({ userId: (req as any).user.id }).lean();
      if (!client) {
        return res.status(403).json({
          success: false,
          message: 'Access Restricted',
          errors: ['Client profile not found.']
        });
      }

      // Check KYC and Agreement compliance
      const isKycDone = Boolean((client as any).kraVerified === true || (client as any).kycStatus === 'VERIFIED' || (client as any).kycStatus === 'APPROVED');
      const isAgreementDone = Boolean((client as any).agreementSigned === true);
      const isCompliant = isKycDone && isAgreementDone;

      // Find all subscriptions for this client
      const allSubs = await dynamicDb.Subscription.find({
        clientId: client._id,
        status: { $in: ['ACTIVE', 'active'] }
      }).lean();

      // If client has an assigned/active plan BUT KYC or Agreement is pending:
      // STRICT SEBI COMPLIANCE: Do not show open trades on dashboard or signals list
      if (allSubs.length > 0 && !isCompliant) {
        return res.json({
          success: true,
          data: [],
          compliancePending: true,
          message: 'Compliance Pending: Please complete KYC & Sign Agreement to access active trade recommendations.'
        });
      }

      // Fetch tenant settings to get lockedTradesPreviewCount
      const tenantDoc = await dynamicDb.Tenant.findById(tenantId).lean() || await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
      const previewLimit = tenantDoc?.lockedTradesPreviewCount !== undefined ? tenantDoc.lockedTradesPreviewCount : 5;

      let unlockedSignals: any[] = [];
      const subscribedPlanIds = allSubs.map((s: any) => s.planId.toString());

      if (allSubs.length > 0) {
        const subConditions = allSubs.map((sub: any) => {
          const conditions: any = {
            planId: sub.planId,
            createdAt: { $gte: sub.startDate }
          };
          if (sub.endDate) {
            conditions.createdAt.$lte = sub.endDate;
          }
          return conditions;
        });

        unlockedSignals = await dynamicDb.Signal.find({
          tenantId,
          $or: subConditions
        })
          .populate({ path: 'messages', options: { sort: { createdAt: -1 } } })
          .sort({ createdAt: -1 })
          .lean();
      }

      // Fetch teaser locked signals from plans the user does NOT have active subscriptions for
      let lockedSignals: any[] = [];
      if (previewLimit > 0) {
        const lockedWhere: any = {
          tenantId,
          status: 'OPEN'
        };
        if (subscribedPlanIds.length > 0) {
          lockedWhere.planId = { $nin: subscribedPlanIds };
        }

        lockedSignals = await dynamicDb.Signal.find(lockedWhere)
          .sort({ createdAt: -1 })
          .limit(previewLimit)
          .lean();
      }

      // Collect plan IDs and stock IDs for mapping
      const allSignalsToMap = [...unlockedSignals, ...lockedSignals];
      const planIds = allSignalsToMap.map((s: any) => s.planId).filter(Boolean);
      const plans = await dynamicDb.Plan.find({ _id: { $in: planIds } }).lean();
      const categories = await dynamicDb.PlanCategory.find({ _id: { $in: planIds } }).lean();

      const planMap = new Map<string, string>();
      plans.forEach((p: any) => planMap.set(p._id.toString(), p.name));
      categories.forEach((c: any) => planMap.set(c._id.toString(), c.name));

      const userIds = [...new Set(allSignalsToMap.map((s: any) => s.createdById).filter(Boolean))];
      const users = await dynamicDb.User.find({ _id: { $in: userIds } }).select('id firstName lastName').lean();
      const userMap = new Map<string, string>();
      users.forEach((u: any) => userMap.set(u._id.toString(), `${u.firstName || ''} ${u.lastName || ''}`.trim()));

      const stockIdList = allSignalsToMap
        .map((s: any) => s.stockId?._id || s.stockId || s.stock?._id || s.stock)
        .filter(Boolean)
        .map((id: any) => id.toString());
      const uniqueStockIds = [...new Set(stockIdList)];
      const validStockObjectIds = uniqueStockIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id));

      const stocks = await dynamicDb.Stock.find({
        $or: [
          ...(validStockObjectIds.length > 0 ? [{ _id: { $in: validStockObjectIds } }] : []),
          { id: { $in: uniqueStockIds } }
        ]
      }).lean();

      const stockMap = new Map<string, any>();
      stocks.forEach((st: any) => {
        const sId = String(st._id || st.id);
        stockMap.set(sId, { ...st, id: sId });
      });

      // Map unlocked signals
      const mappedUnlocked = unlockedSignals.map((s: any) => {
        const pIdStr = s.planId?.toString();
        const cIdStr = s.createdById?.toString();
        const sIdStr = s.stockId ? String(s.stockId?._id || s.stockId) : (s.stock ? String(s.stock?._id || s.stock) : '');
        const matchedStock = (sIdStr && stockMap.get(sIdStr)) ||
          (typeof s.stockId === 'object' && s.stockId?.symbol ? s.stockId : null) ||
          (typeof s.stock === 'object' && s.stock?.symbol ? s.stock : null);

        const potential = calculatePotential(s);

        return {
          ...s,
          id: s._id?.toString() || s.id,
          isLocked: false,
          stockId: sIdStr,
          stock: matchedStock ? { ...matchedStock, id: String(matchedStock._id || matchedStock.id) } : null,
          symbol: matchedStock?.symbol || s.symbol || '',
          stockName: matchedStock?.name || s.stockName || '',
          planName: (pIdStr && planMap.get(pIdStr)) || pIdStr || '',
          createdByName: (cIdStr && userMap.get(cIdStr)) || 'Unknown Researcher',
          ...potential
        };
      });

      // Map locked teaser signals
      const mappedLocked = lockedSignals.map((s: any) => {
        const pIdStr = s.planId?.toString();
        const potential = calculatePotential(s);
        const sIdStr = s.stockId ? String(s.stockId?._id || s.stockId) : (s.stock ? String(s.stock?._id || s.stock) : '');
        const matchedStock = (sIdStr && stockMap.get(sIdStr)) ||
          (typeof s.stockId === 'object' && s.stockId?.symbol ? s.stockId : null);

        const rawSymbol = matchedStock?.symbol || 'STOCK';
        const maskedSymbol = rawSymbol.length > 2 ? `${rawSymbol.slice(0, 1)}****` : 'T****';

        return {
          id: s._id?.toString() || s.id,
          _id: s._id,
          isLocked: true,
          symbol: maskedSymbol,
          stockName: 'Locked Recommendation',
          segment: s.segment || 'CASH',
          callType: s.callType || 'BUY',
          tradeDuration: s.tradeDuration || 'INTRADAY',
          planId: s.planId,
          planName: (pIdStr && planMap.get(pIdStr)) || 'Premium Advisory Plan',
          entryPrice: null,
          target1: null,
          target2: null,
          target3: null,
          stoploss: null,
          status: 'OPEN',
          createdAt: s.createdAt,
          ...potential
        };
      });

      return res.json({
        success: true,
        data: [...mappedUnlocked, ...mappedLocked],
        hasActivePlan: allSubs.length > 0
      });
    }

    // Staff / Admin logic
    let whereClause: any = { tenantId };
    const isFullAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    if (!isFullAdmin) {
      const roleDoc = await dynamicDb.Role.findOne({ name: userRole }).lean();
      const roleId = roleDoc?._id;
      const addPerm = await dynamicDb.Permission.findOne({ code: 'ADD_RESEARCH' }).lean();
      const viewPerm = await dynamicDb.Permission.findOne({ code: 'VIEW_RESEARCH' }).lean();
      const ownPerm = await dynamicDb.Permission.findOne({ code: 'OWN_RESEARCH' }).lean();

      const hasAdd = addPerm && roleId ? await dynamicDb.RolePermission.findOne({ roleId, permissionId: addPerm._id }).lean() : null;
      const hasView = viewPerm && roleId ? await dynamicDb.RolePermission.findOne({ roleId, permissionId: viewPerm._id }).lean() : null;
      const hasOwn = ownPerm && roleId ? await dynamicDb.RolePermission.findOne({ roleId, permissionId: ownPerm._id }).lean() : null;

      if (!hasAdd && !hasView && !hasOwn) {
        return res.status(403).json({ success: false, message: 'You do not have permission to view signals.' });
      }

      if (!hasAdd && !hasView && hasOwn) {
        whereClause.createdById = (req as any).user.id;
      }
    }

    const signals = await dynamicDb.Signal.find(whereClause)
      .populate({
        path: 'messages',
        options: { sort: { createdAt: -1 } }
      })
      .sort({ createdAt: -1 })
      .lean();

    const planIds = signals.map((s: any) => s.planId).filter(Boolean);
    const plans = await dynamicDb.Plan.find({ _id: { $in: planIds } }).lean();
    const categories = await dynamicDb.PlanCategory.find({ _id: { $in: planIds } }).lean();

    const map = new Map<string, string>();
    plans.forEach((p: any) => map.set(p._id.toString(), p.name));
    categories.forEach((c: any) => map.set(c._id.toString(), c.name));

    const userIds = [...new Set(signals.map((s: any) => s.createdById).filter(Boolean))];
    const users = await dynamicDb.User.find({ _id: { $in: userIds } }).select('id firstName lastName').lean();
    const userMap = new Map<string, string>();
    users.forEach((u: any) => userMap.set(u._id.toString(), `${u.firstName || ''} ${u.lastName || ''}`.trim()));

    const stockIdList = signals
      .map((s: any) => s.stockId?._id || s.stockId || s.stock?._id || s.stock)
      .filter(Boolean)
      .map((id: any) => id.toString());
    const uniqueStockIds = [...new Set(stockIdList)];
    const validStockObjectIds = uniqueStockIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id));

    const stocks = await dynamicDb.Stock.find({
      $or: [
        ...(validStockObjectIds.length > 0 ? [{ _id: { $in: validStockObjectIds } }] : []),
        { id: { $in: uniqueStockIds } }
      ]
    }).lean();

    const stockMap = new Map<string, any>();
    stocks.forEach((st: any) => {
      const sId = String(st._id || st.id);
      stockMap.set(sId, { ...st, id: sId });
    });

    const finalData = signals.map((s: any) => {
      const pIdStr = s.planId?.toString();
      const cIdStr = s.createdById?.toString();
      const sIdStr = s.stockId ? String(s.stockId?._id || s.stockId) : (s.stock ? String(s.stock?._id || s.stock) : '');
      const matchedStock = (sIdStr && stockMap.get(sIdStr)) ||
        (typeof s.stockId === 'object' && s.stockId?.symbol ? s.stockId : null) ||
        (typeof s.stock === 'object' && s.stock?.symbol ? s.stock : null);

      const potential = calculatePotential(s);

      return {
        ...s,
        id: s._id?.toString() || s.id,
        stockId: sIdStr,
        stock: matchedStock ? { ...matchedStock, id: String(matchedStock._id || matchedStock.id) } : null,
        symbol: matchedStock?.symbol || '',
        stockName: matchedStock?.name || '',
        planName: (pIdStr && map.get(pIdStr)) || pIdStr || '',
        createdByName: (cIdStr && userMap.get(cIdStr)) || 'Unknown Researcher',
        ...potential
      };
    });

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

    const signal = await dynamicDb.Signal.findOne({ _id: id, tenantId })
      .populate('stock')
      .lean();

    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found' });
    }

    const updatedSignal = await dynamicDb.Signal.findByIdAndUpdate(
      id,
      {
        $set: {
          status: isFinalClose ? 'CLOSED' : 'OPEN',
          closeStatus,
          exitPrice: exitPrice ? parseFloat(exitPrice) : null,
          closeRemark,
          closeTargets,
          closedAt: isFinalClose ? new Date() : null
        }
      },
      { returnDocument: 'after', lean: true }
    );

    // Notify clients who were subscribed to this plan AT THE TIME the signal was created
    const allSubs = await dynamicDb.Subscription.find({
      planId: signal.planId,
      startDate: { $lte: signal.createdAt }
    })
      .populate({
        path: 'clientId',
        populate: { path: 'userId', select: '_id id firstName lastName' }
      })
      .lean();

    const sig: any = signal;
    const eligibleSubs = allSubs.filter((sub: any) => !sub.endDate || new Date(sub.endDate) >= new Date(signal.createdAt));
    const stock = sig.stockId || sig.stock || {};
    const stockSymbol = stock.symbol || 'Stock';

    const notificationPromises = eligibleSubs.map((sub: any) => {
      const client = sub.clientId || sub.client;
      const user = client?.userId || client?.user;
      const recipientId = user?._id || client?.userId;
      if (!recipientId) return null;

      return dynamicDb.NotificationLog.create({
        tenantId,
        recipient: recipientId,
        channel: 'INAPP',
        title: `Signal Update: ${stockSymbol}`,
        message: `The signal for ${stockSymbol} has been closed/updated. Status: ${closeStatus}. ${closeRemark ? `Remark: ${closeRemark}` : ''}`
      });
    }).filter(Boolean);

    await Promise.all(notificationPromises);

    return res.json({
      success: true,
      data: updatedSignal ? { ...updatedSignal, id: updatedSignal._id?.toString() || updatedSignal.id } : null,
      message: 'Signal closed successfully and clients notified.'
    });
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

    const signal = await dynamicDb.Signal.findOne({ _id: id, tenantId });

    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found' });
    }

    const updatedSignal = await dynamicDb.Signal.findByIdAndUpdate(
      id,
      { $set: { reportUrl } },
      { returnDocument: 'after', lean: true }
    );

    return res.json({
      success: true,
      data: updatedSignal ? { ...updatedSignal, id: updatedSignal._id?.toString() || updatedSignal.id } : null,
      message: 'Report uploaded successfully.'
    });
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

    const signalMessage = await dynamicDb.SignalMessage.create({
      signalId: id,
      message
    });

    const signal = await dynamicDb.Signal.findById(id)
      .populate('stock')
      .lean();

    if (signal) {
      const tenantId = (req as any).user.tenantId || signal.tenantId;

      const allSubs = await dynamicDb.Subscription.find({
        planId: signal.planId,
        startDate: { $lte: signal.createdAt }
      })
        .populate({
          path: 'clientId',
          populate: { path: 'userId', select: '_id id' }
        })
        .lean();

      const eligibleSubs = allSubs.filter((sub: any) => !sub.endDate || new Date(sub.endDate) >= new Date(signal.createdAt));
      const sig: any = signal;
      const stock = sig.stockId || sig.stock || {};
      const stockSymbol = stock.symbol || 'Stock';

      const notificationPromises = eligibleSubs.map((sub: any) => {
        const client = sub.clientId || sub.client;
        const user = client?.userId || client?.user;
        const recipientId = user?._id || client?.userId;
        if (!recipientId) return null;

        return dynamicDb.NotificationLog.create({
          tenantId,
          recipient: recipientId,
          channel: 'INAPP',
          title: `Trade Update: ${stockSymbol}`,
          message: `New update on trade ${stockSymbol}: ${message}`
        });
      }).filter(Boolean);

      await Promise.all(notificationPromises);
    }

    res.status(201).json({
      success: true,
      message: 'Alert sent successfully',
      data: {
        ...signalMessage.toObject(),
        id: signalMessage._id.toString()
      }
    });
  } catch (error: any) {
    console.error('Error adding signal message:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
