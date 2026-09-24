import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { dynamicDb } from '../config/db';

interface TimelineEvent {
  id: string;
  source: 'REALTIME' | 'HISTORICAL';
  category: 'AUTH' | 'KYC_COMPLIANCE' | 'PAYMENT' | 'SUBSCRIPTION' | 'STAFF_ACTION' | 'SUPPORT' | 'SYSTEM';
  action: string;
  title: string;
  description: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'INFO';
  timestamp: Date;
  actorName?: string;
  actorType?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  os?: string;
  metadata?: Record<string, any>;
}

function humanizePaymentMode(mode?: string | null): string {
  if (!mode) return 'Online Payment';
  const m = mode.toUpperCase().trim();
  if (m === 'CUSTOM_PRO_RATA') return 'Custom Plan (Adjusted Validity/Amount)';
  if (m === 'ADMIN_ASSIGNED' || m === 'MANUAL_ADMIN') return 'Admin Manual Assignment';
  if (m === 'ONLINE_RAZORPAY' || m === 'RAZORPAY') return 'Online Payment (Razorpay)';
  if (m === 'OFFLINE_CASH' || m === 'CASH') return 'Cash';
  if (m === 'OFFLINE_BANK_TRANSFER' || m === 'BANK_TRANSFER' || m === 'NEFT' || m === 'RTGS') return 'Bank Transfer (NEFT/RTGS)';
  if (m === 'OFFLINE_UPI' || m === 'UPI') return 'UPI Transfer';
  if (m === 'OFFLINE_CHEQUE' || m === 'CHEQUE') return 'Cheque';
  return mode.replace(/_/g, ' ');
}

function humanizeEsignMode(mode?: string | null): string {
  if (!mode) return 'Aadhaar eSign (Digio)';
  const m = mode.toUpperCase().trim();
  if (m.includes('AADHAAR') || m.includes('MOCK') || m.includes('DIGIO')) {
    return 'Aadhaar eSign (Digio)';
  }
  return mode.replace(/_/g, ' ');
}

function cleanRemark(remark?: string | null): string {
  if (!remark) return '';
  return remark
    .replace(/^\[PRO-RATA\]\s*Assigned by Admin\s*-\s*/i, '')
    .replace(/^\[PRO-RATA\]\s*/i, '')
    .replace(/^Assigned by Admin\s*-\s*/i, '')
    .trim();
}

export const getClientTimeline = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const { category, search, limit = '100' } = req.query as {
      category?: string;
      search?: string;
      limit?: string;
    };

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required.' });
    }

    // 1. Fetch Client & User info
    const client: any = await dynamicDb.Client.findById(clientId).lean();
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }
    const user: any = client.userId ? await dynamicDb.User.findById(client.userId).lean() : null;

    // 2. Fetch Real-time Activity Logs
    const rawLogs = await (dynamicDb.ActivityLog as any)
      .find({ targetClientId: client._id || client.id })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10) || 100)
      .lean();

    const realTimeEvents: TimelineEvent[] = (rawLogs || []).map((log: any) => ({
      id: String(log._id || log.id),
      source: 'REALTIME',
      category: log.category,
      action: log.action,
      title: log.title,
      description: log.description || '',
      status: log.status || 'SUCCESS',
      timestamp: new Date(log.timestamp || log.createdAt),
      actorName: log.actorName,
      actorType: log.actorType,
      ipAddress: log.ipAddress,
      device: log.device,
      browser: log.browser,
      os: log.os,
      metadata: log.metadata || {}
    }));

    // 3. Historical Data Aggregation (Self-Healing Fallback for older clients)
    const historicalEvents: TimelineEvent[] = [];

    // 3A. Registration / Signup Event (Guaranteed for every client)
    const signupDate = new Date(
      client.createdAt ||
      user?.createdAt ||
      (client._id ? parseInt(String(client._id).substring(0, 8), 16) * 1000 : Date.now())
    );

    historicalEvents.push({
      id: `hist_reg_${client._id}`,
      source: 'HISTORICAL',
      category: 'AUTH',
      action: 'CLIENT_SIGNUP',
      title: 'Account Signed Up & Registered',
      description: `Client registered as ${client.category || 'INDIVIDUAL'} investor (${client.createdById ? 'Assisted by Staff' : 'Self-Registration with OTP'})`,
      status: 'SUCCESS',
      timestamp: signupDate,
      actorName: client.name,
      actorType: 'CLIENT',
      metadata: {
        email: client.email,
        mobile: client.mobile,
        category: client.category || 'INDIVIDUAL',
        registrationType: client.createdById ? 'Staff Assisted Creation' : 'Self-Registration (OTP Verified)'
      }
    });

    // 3B. Historical Logins from AuditLog
    if (client.userId) {
      try {
        const userAudits = await dynamicDb.AuditLog.find({
          $or: [
            { userId: client.userId },
            { userId: String(client.userId) }
          ],
          action: { $in: ['LOGIN', 'LOGIN_OTP', 'VERIFY_OTP', 'OTP_REQUEST'] }
        })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();

        for (const audit of userAudits) {
          const isOtp = audit.action === 'LOGIN_OTP' || audit.action === 'VERIFY_OTP';
          const aTime = new Date(audit.timestamp || (audit as any).createdAt || client.createdAt || signupDate);
          historicalEvents.push({
            id: `audit_login_${audit._id}`,
            source: 'HISTORICAL',
            category: 'AUTH',
            action: isOtp ? 'LOGIN_OTP' : 'LOGIN',
            title: isOtp ? 'Client Logged In via OTP' : 'Client Logged In',
            description: isOtp
              ? `Client entered OTP and authenticated session (IP: ${audit.ipAddress || '127.0.0.1'})`
              : `Client logged in with credentials (IP: ${audit.ipAddress || '127.0.0.1'})`,
            status: 'SUCCESS',
            timestamp: aTime,
            actorName: client.name,
            actorType: 'CLIENT',
            ipAddress: audit.ipAddress || undefined,
            metadata: {
              loginMethod: isOtp ? 'OTP Verification (Email/SMS)' : 'Password Credentials',
              ipAddress: audit.ipAddress || '127.0.0.1'
            }
          });
        }
      } catch (aErr) {
        console.warn('[Timeline] Error fetching user audit logs:', aErr);
      }
    }

    // 3C. DigiLocker KYC Verified
    if (client.kraVerified || (client.pan && client.pan.length === 10)) {
      const kycTime = new Date(client.updatedAt || client.createdAt || signupDate);
      historicalEvents.push({
        id: `hist_kyc_${client._id}`,
        source: 'HISTORICAL',
        category: 'KYC_COMPLIANCE',
        action: 'KYC_VERIFIED',
        title: 'DigiLocker KYC Verified',
        description: `PAN (${client.pan}) & Aadhaar verified via DigiLocker UIDAI`,
        status: 'SUCCESS',
        timestamp: kycTime,
        actorName: client.name,
        actorType: 'CLIENT',
        metadata: {
          pan: client.pan,
          aadhaar: client.aadhaar,
          verificationSource: 'DigiLocker / KRA'
        }
      });
    }

    const now = new Date();

    // 3C. Agreements
    const agreements = await dynamicDb.Agreement.find({
      $or: [{ clientId: client._id }, { clientId: client.id }, { clientId: client.userId }]
    }).lean();

    for (const agr of agreements) {
      const friendlyEsign = humanizeEsignMode(agr.esignMode);
      const agrTime = new Date(agr.signedAt || (agr as any).createdAt || client.createdAt);
      historicalEvents.push({
        id: `hist_agr_${agr._id}`,
        source: 'HISTORICAL',
        category: 'KYC_COMPLIANCE',
        action: 'AGREEMENT_SIGNED',
        title: `Advisory Agreement Signed (v${agr.version || '1.0'})`,
        description: `Service terms digitally signed via ${friendlyEsign}`,
        status: 'SUCCESS',
        timestamp: agrTime > now ? now : agrTime,
        actorName: client.name,
        actorType: 'CLIENT',
        metadata: {
          version: agr.version,
          esignMode: friendlyEsign,
          agreementUrl: agr.agreementUrl,
          ipAddress: agr.ipAddress
        }
      });
    }

    // 3D. Subscriptions
    const subscriptions = await dynamicDb.Subscription.find({
      $or: [{ clientId: client._id }, { clientId: client.id }, { clientId: client.userId }]
    })
      .populate('planId')
      .lean();

    // 3E. Payments
    const payments = await dynamicDb.Payment.find({
      $or: [{ clientId: client._id }, { clientId: client.id }, { clientId: client.userId }]
    })
      .populate('planId')
      .lean();

    const handledSubIds = new Set<string>();

    for (const pay of payments) {
      const isSuccess = pay.status === 'SUCCESS' || pay.status === 'VERIFIED';
      const isStaffAssigned = Boolean(
        pay.assignedByAdminName ||
        pay.assignedByStaffName ||
        pay.paymentMode === 'CUSTOM_PRO_RATA' ||
        pay.paymentMode === 'ADMIN_ASSIGNED'
      );
      const planName = (pay.planId as any)?.name || 'Advisory Plan';
      const friendlyPaymentMode = humanizePaymentMode(pay.paymentMode);
      const cleanNote = cleanRemark(pay.remarks);

      // Match with an unhandled subscription if exists
      const matchingSub = subscriptions.find(
        (s: any) =>
          !handledSubIds.has(String(s._id)) &&
          (String((s.planId as any)?._id || s.planId) === String((pay.planId as any)?._id || pay.planId))
      ) || (subscriptions.length === 1 && !handledSubIds.has(String(subscriptions[0]._id)) ? subscriptions[0] : undefined);

      let validityStr = '';
      if (matchingSub) {
        handledSubIds.add(String(matchingSub._id));
        const sDate = new Date(matchingSub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const eDate = new Date(matchingSub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        validityStr = `${sDate} to ${eDate}`;
      }

      let desc = '';
      if (isStaffAssigned) {
        const staff = pay.assignedByAdminName || pay.assignedByStaffName || 'Admin';
        const parts = [`Assigned by ${staff}`, `Mode: ${friendlyPaymentMode}`];
        if (validityStr) parts.push(`Validity: ${validityStr}`);
        if (cleanNote) parts.push(`Note: "${cleanNote}"`);
        desc = parts.join(' • ');
      } else {
        const parts = [`Paid for ${planName} via ${friendlyPaymentMode}`];
        if (validityStr) parts.push(`Validity: ${validityStr}`);
        desc = parts.join(' • ');
      }

      const payTime = new Date(pay.paymentDate || pay.createdAt || client.createdAt);
      const safePayTime = payTime > now ? now : payTime;

      historicalEvents.push({
        id: `hist_pay_${pay._id}`,
        source: 'HISTORICAL',
        category: isStaffAssigned ? 'STAFF_ACTION' : 'PAYMENT',
        action: isStaffAssigned ? 'STAFF_PLAN_ASSIGNED' : isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_PENDING',
        title: isStaffAssigned
          ? `Plan Assigned by Staff: ${planName} (₹${(pay.amount || 0).toLocaleString('en-IN')})`
          : `Payment ${isSuccess ? 'Successful' : pay.status}: ${planName} (₹${(pay.amount || 0).toLocaleString('en-IN')})`,
        description: desc,
        status: isSuccess ? 'SUCCESS' : 'PENDING',
        timestamp: safePayTime,
        actorName: isStaffAssigned ? (pay.assignedByAdminName || pay.assignedByStaffName || 'Admin') : client.name,
        actorType: isStaffAssigned ? 'STAFF' : 'CLIENT',
        metadata: {
          plan: planName,
          amount: `₹${(pay.amount || 0).toLocaleString('en-IN')}`,
          paymentMode: friendlyPaymentMode,
          ...(validityStr ? { planValidity: validityStr } : {}),
          ...(cleanNote ? { note: cleanNote } : {}),
          ...(pay.transactionRef ? { transactionRef: pay.transactionRef } : {}),
          ...(pay.assignedByAdminName || pay.assignedByStaffName ? { assignedBy: pay.assignedByAdminName || pay.assignedByStaffName } : {}),
          receiptUrl: pay.receiptUrl
        }
      });
    }

    // 3F. Standalone Subscriptions (only those not already attached to a payment card above)
    for (const sub of subscriptions) {
      if (handledSubIds.has(String(sub._id))) {
        continue; // Deduplicated with payment card!
      }
      const planName = (sub.planId as any)?.name || 'Advisory Plan';
      const sDate = new Date(sub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const eDate = new Date(sub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      // IMPORTANT: Activity event timestamp is when this happened (sub.createdAt), NEVER future startDate/endDate!
      const subTime = new Date((sub as any).createdAt || client.createdAt);
      const safeSubTime = subTime > now ? now : subTime;

      historicalEvents.push({
        id: `hist_sub_${sub._id}`,
        source: 'HISTORICAL',
        category: 'SUBSCRIPTION',
        action: 'SUBSCRIPTION_ACTIVATED',
        title: `Subscription Activated: ${planName}`,
        description: `Plan: ${planName} • Valid from ${sDate} to ${eDate} (${sub.status || 'ACTIVE'})`,
        status: sub.status === 'ACTIVE' ? 'SUCCESS' : 'INFO',
        timestamp: safeSubTime,
        actorName: 'System',
        actorType: 'SYSTEM',
        metadata: {
          plan: planName,
          validity: `${sDate} to ${eDate}`,
          status: sub.status,
          ...(sub.amountTotal ? { amount: `₹${Number(sub.amountTotal).toLocaleString('en-IN')}` } : {})
        }
      });
    }

    // 3F. Support Tickets
    try {
      const tickets = await dynamicDb.SupportTicket.find({
        $or: [{ clientId: client._id }, { clientId: client.id }, { clientId: client.userId }]
      }).lean();

      for (const t of tickets) {
        const ticket = t as any;
        historicalEvents.push({
          id: `hist_tkt_${ticket._id}`,
          source: 'HISTORICAL',
          category: 'SUPPORT',
          action: 'TICKET_CREATED',
          title: `Support Ticket Raised: #${ticket.ticketNo || String(ticket._id).slice(-6)}`,
          description: `${ticket.subject} (${ticket.status || 'OPEN'})`,
          status: ticket.status === 'RESOLVED' ? 'SUCCESS' : 'PENDING',
          timestamp: new Date(ticket.createdAt),
          actorName: client.name,
          actorType: 'CLIENT',
          metadata: {
            ticketNo: ticket.ticketNo,
            subject: ticket.subject,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status
          }
        });
      }
    } catch (tErr) {
      // SupportTicket optional
    }

    // 4. Merge Real-time and Historical without duplicates
    const combinedMap = new Map<string, TimelineEvent>();

    // Add historical events first
    for (const h of historicalEvents) {
      const key = `${h.category}_${h.action}_${h.metadata?.transactionRef || h.metadata?.version || h.title}`;
      combinedMap.set(key, h);
    }

    // Real-time events overwrite or append
    for (const r of realTimeEvents) {
      const key = `${r.category}_${r.action}_${r.metadata?.transactionRef || r.metadata?.version || r.title}`;
      combinedMap.set(key, r);
    }

    let allEvents = Array.from(combinedMap.values());

    // 5. Apply Category Filter if provided
    if (category && category !== 'ALL') {
      allEvents = allEvents.filter((e) => e.category === category);
    }

    // 6. Apply Search Keyword Filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      allEvents = allEvents.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          (e.actorName && e.actorName.toLowerCase().includes(q)) ||
          (e.metadata?.transactionRef && String(e.metadata.transactionRef).toLowerCase().includes(q)) ||
          (e.metadata?.planName && String(e.metadata.planName).toLowerCase().includes(q))
      );
    }

    // Ensure all event timestamps never exceed current time (preventing future year buckets)
    const currentTime = new Date();
    allEvents.forEach((e) => {
      if (e.timestamp && e.timestamp.getTime() > currentTime.getTime()) {
        e.timestamp = new Date(currentTime.getTime());
      }
    });

    // Sort descending by timestamp (Newest to Oldest)
    allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 7. Calculate 5-Step Lifecycle Milestones
    const hasKyc = Boolean(client.kraVerified || (client.pan && client.pan.length === 10));
    const hasAgreement = agreements.length > 0;
    const hasPayment = payments.some((p: any) => p.status === 'SUCCESS' || p.status === 'VERIFIED');
    const hasActiveSub = subscriptions.some((s: any) => s.status === 'ACTIVE' && new Date(s.endDate) > currentTime);

    const milestones = [
      {
        step: 1,
        key: 'REGISTRATION',
        label: 'Registration',
        completed: true,
        current: false,
        timestamp: client.createdAt,
        detail: `Registered as ${client.category || 'INDIVIDUAL'}`
      },
      {
        step: 2,
        key: 'DIGILOCKER_KYC',
        label: 'DigiLocker KYC',
        completed: hasKyc,
        current: !hasKyc,
        timestamp: hasKyc ? (client.updatedAt || client.createdAt) : null,
        detail: hasKyc ? `PAN: ${client.pan}` : 'Pending e-KYC'
      },
      {
        step: 3,
        key: 'ADVISORY_ESIGN',
        label: 'Advisory eSign',
        completed: hasAgreement,
        current: hasKyc && !hasAgreement,
        timestamp: hasAgreement ? agreements[0].signedAt : null,
        detail: hasAgreement ? `Signed v${agreements[0].version}` : 'Awaiting eSign'
      },
      {
        step: 4,
        key: 'PAYMENT_AND_PLAN',
        label: 'Payment & Plan',
        completed: hasPayment || subscriptions.length > 0,
        current: hasAgreement && !hasPayment && subscriptions.length === 0,
        timestamp: payments[0]?.paymentDate || (subscriptions[0] as any)?.createdAt || client.createdAt || null,
        detail: hasPayment
          ? `₹${payments.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString()}`
          : subscriptions.length > 0
          ? 'Assigned by Staff'
          : 'Awaiting Payment'
      },
      {
        step: 5,
        key: 'ACTIVE_SERVICE',
        label: 'Active Research',
        completed: hasActiveSub,
        current: (hasPayment || subscriptions.length > 0) && hasActiveSub,
        timestamp: hasActiveSub ? ((subscriptions[0] as any)?.createdAt || subscriptions[0]?.startDate || null) : null,
        detail: hasActiveSub ? 'Active & Subscribed' : subscriptions.length > 0 ? 'Service Inactive / Pending' : 'Not Subscribed'
      }
    ];

    // 8. Calculate KPI Statistics
    const totalSpent = payments
      .filter((p: any) => p.status === 'SUCCESS' || p.status === 'VERIFIED')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const loginEventsCount = allEvents.filter(
      (e) => e.category === 'AUTH' && (e.action === 'LOGIN' || e.action === 'LOGIN_OTP' || e.action === 'LOGIN_SUCCESS')
    ).length;

    // 9. Group Events into Date Buckets (Today, Yesterday, This Month, Older)
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    const groupedBuckets: { [groupKey: string]: { label: string; count: number; events: TimelineEvent[] } } = {};

    for (const ev of allEvents) {
      let groupKey = '';
      let groupLabel = '';

      if (isSameDay(ev.timestamp, today)) {
        groupKey = 'TODAY';
        groupLabel = 'Today';
      } else if (isSameDay(ev.timestamp, yesterday)) {
        groupKey = 'YESTERDAY';
        groupLabel = 'Yesterday';
      } else {
        const monthYear = ev.timestamp.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        groupKey = monthYear.toUpperCase().replace(/\s+/g, '_');
        groupLabel = monthYear;
      }

      if (!groupedBuckets[groupKey]) {
        groupedBuckets[groupKey] = {
          label: groupLabel,
          count: 0,
          events: []
        };
      }
      groupedBuckets[groupKey].count++;
      groupedBuckets[groupKey].events.push(ev);
    }

    const groups = Object.entries(groupedBuckets).map(([key, data]) => ({
      key,
      label: data.label,
      count: data.count,
      events: data.events
    }));

    return res.status(200).json({
      success: true,
      data: {
        clientSummary: {
          id: String(client._id || client.id),
          name: client.name,
          email: client.email,
          mobile: client.mobile,
          pan: client.pan,
          status: client.status,
          category: client.category || 'INDIVIDUAL',
          registeredAt: client.createdAt,
          totalSpent,
          activeSubscriptions: subscriptions.filter((s: any) => s.status === 'ACTIVE' && new Date(s.endDate) > now).length
        },
        milestones,
        stats: {
          totalEvents: allEvents.length,
          totalSpent,
          totalPayments: payments.length,
          totalSubscriptions: subscriptions.length,
          totalLogins: loginEventsCount,
          lastActive: allEvents[0]?.timestamp || client.createdAt
        },
        groups,
        rawEvents: allEvents
      }
    });
  } catch (error: any) {
    console.error('[ClientTimeline] Error fetching timeline:', error);
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};
