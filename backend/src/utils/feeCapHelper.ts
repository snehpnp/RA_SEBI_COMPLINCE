import { dynamicDb, Payment, Subscription, Client } from '../config/db';

/**
 * Returns Indian Financial Year dates (1st April to 31st March)
 */
export const getIndianFinancialYearDates = (refDate = new Date()) => {
  const currentMonth = refDate.getMonth(); // 0 = Jan, 3 = Apr
  const fyStartYear = currentMonth >= 3 ? refDate.getFullYear() : refDate.getFullYear() - 1;
  const fyStart = new Date(fyStartYear, 3, 1, 0, 0, 0, 0); // 1 April 00:00:00
  const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999); // 31 March 23:59:59
  const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
  return { fyStart, fyEnd, fyLabel, fyStartYear };
};

export const MAX_SEBI_BASE_FEE_CAP = 151000;

export interface ClientFeeSummary {
  clientId: string;
  fyLabel: string;
  fyStart: Date;
  fyEnd: Date;
  maxBaseFeeCap: number;
  totalApprovedBasePaid: number;
  totalPendingBaseFee: number;
  totalBasePaid: number; // approved + pending committed
  totalGstPaid: number;
  totalGrossPaid: number;
  remainingBaseQuota: number;
  isQuotaFull: boolean;
  paymentCount: number;
  pendingPaymentCount: number;
}

/**
 * Calculates current FY fee breakdown (Approved + In-flight L1/L2 Pending Requests) for a client
 */
export const getClientFyFeeSummary = async (
  clientId: any,
  tenantId: any,
  dynamicDbInstance?: any,
  excludePaymentId?: any
): Promise<ClientFeeSummary> => {
  const { fyStart, fyEnd, fyLabel } = getIndianFinancialYearDates();
  const paymentModel = dynamicDbInstance?.Payment || dynamicDb?.Payment || Payment;
  const subscriptionModel = dynamicDbInstance?.Subscription || dynamicDb?.Subscription || Subscription;
  const clientModel = dynamicDbInstance?.Client || dynamicDb?.Client || Client;

  // Resolve all possible client ID variants (client._id, client.userId, client.id)
  let clientIds: any[] = [clientId];
  try {
    const clientDoc: any = await clientModel.findOne({
      $or: [{ _id: clientId }, { userId: clientId }, { id: clientId }]
    }).lean();
    if (clientDoc) {
      if (clientDoc._id) clientIds.push(clientDoc._id);
      if (clientDoc.userId) clientIds.push(clientDoc.userId);
      if (clientDoc.id) clientIds.push(clientDoc.id);
    }
  } catch (e) {
    // ignore
  }

  // Find all SUCCESS and PENDING (in-flight L1/L2 approval queue) payments in current FY
  const query: any = {
    tenantId,
    clientId: { $in: clientIds },
    status: { $in: ['SUCCESS', 'PENDING'] },
    approvalStatus: { $nin: ['REJECTED'] },
    createdAt: { $gte: fyStart, $lte: fyEnd }
  };
  if (excludePaymentId) {
    query._id = { $ne: excludePaymentId };
  }

  const payments: any[] = await paymentModel.find(query).lean();

  let totalApprovedBasePaid = 0;
  let totalPendingBaseFee = 0;
  let totalGstPaid = 0;
  let totalGrossPaid = 0;
  let paymentCount = 0;
  let pendingPaymentCount = 0;

  for (const p of payments) {
    let base = 0;
    let gst = 0;
    const gross = Number(p.amount || 0);
    const isApproved = p.status === 'SUCCESS' && p.approvalStatus !== 'REJECTED';
    const isPendingQueue = p.status === 'PENDING' && ['L2_PENDING', 'L1_PENDING'].includes(p.approvalStatus);

    if (p.subscriptionId) {
      try {
        const sub: any = await subscriptionModel.findById(p.subscriptionId).lean();
        if (sub && sub.amountBase != null) {
          base = Number(sub.amountBase);
          gst = Number(sub.amountGst ?? (gross - base));
        }
      } catch (e) {
        // Fallback below
      }
    }

    if (base === 0 && gross > 0) {
      const isGstOff = p.gstEnabled === false;
      if (isGstOff) {
        base = gross;
        gst = 0;
      } else {
        base = parseFloat((gross / 1.18).toFixed(2));
        gst = parseFloat((gross - base).toFixed(2));
      }
    }

    if (isApproved) {
      totalApprovedBasePaid += base;
      totalGstPaid += gst;
      totalGrossPaid += gross;
      paymentCount++;
    } else if (isPendingQueue) {
      totalPendingBaseFee += base;
      pendingPaymentCount++;
    }
  }

  totalApprovedBasePaid = parseFloat(totalApprovedBasePaid.toFixed(2));
  totalPendingBaseFee = parseFloat(totalPendingBaseFee.toFixed(2));
  const totalBasePaid = parseFloat((totalApprovedBasePaid + totalPendingBaseFee).toFixed(2));
  totalGstPaid = parseFloat(totalGstPaid.toFixed(2));
  totalGrossPaid = parseFloat(totalGrossPaid.toFixed(2));

  // The remaining quota is strictly what is left after deducting BOTH approved and pending in-flight requests
  const remainingBaseQuota = Math.max(0, parseFloat((MAX_SEBI_BASE_FEE_CAP - totalBasePaid).toFixed(2)));
  const isQuotaFull = totalBasePaid >= MAX_SEBI_BASE_FEE_CAP;

  return {
    clientId: String(clientId),
    fyLabel,
    fyStart,
    fyEnd,
    maxBaseFeeCap: MAX_SEBI_BASE_FEE_CAP,
    totalApprovedBasePaid,
    totalPendingBaseFee,
    totalBasePaid, // Total committed (approved + pending in queue)
    totalGstPaid,
    totalGrossPaid,
    remainingBaseQuota,
    isQuotaFull,
    paymentCount,
    pendingPaymentCount
  };
};
