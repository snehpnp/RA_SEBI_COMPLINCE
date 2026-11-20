import { Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middlewares/auth';
import {
  PlatformPlan,
  PlatformBillingConfig,
  TenantSubscription,
  PlatformInvoice,
  AllCompany,
  dynamicDb
} from '../config/db';
import { sendEmail } from '../services/emailService';
import { generatePlatformInvoicePdf } from '../services/invoiceGenerator';

/**
 * 1. GET ALL PLATFORM PLANS
 */
export const getPlatformPlans = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await PlatformPlan.find().sort({ price: 1, createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: plans });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. CREATE PLATFORM PLAN (SuperAdmin can create ₹0 Trial plans or custom plans)
 */
export const createPlatformPlan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      code,
      description,
      price,
      durationDays,
      maxActiveClients,
      features,
      lockPermissionsOnExpiry,
      isPopular
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Plan name and unique plan code are required.' });
    }

    const existing = await PlatformPlan.findOne({ code: String(code).trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Plan code "${code}" already exists.` });
    }

    const plan = await PlatformPlan.create({
      name: String(name).trim(),
      code: String(code).trim().toUpperCase(),
      description: description || '',
      price: price !== undefined && Number(price) >= 0 ? Number(price) : 0,
      durationDays: durationDays ? Number(durationDays) : 30,
      maxActiveClients: maxActiveClients !== undefined ? Number(maxActiveClients) : 50,
      features: Array.isArray(features) ? features : [],
      lockPermissionsOnExpiry: lockPermissionsOnExpiry || {
        lockNewClientAddition: true,
        lockSignalBroadcast: true,
        lockAgreementSigning: true,
        lockReportsGeneration: false,
        lockStaffLogins: false
      },
      isPopular: Boolean(isPopular),
      isActive: true
    });

    return res.status(201).json({ success: true, message: 'Platform plan created successfully.', data: plan });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. UPDATE PLATFORM PLAN
 */
export const updatePlatformPlan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.code) updateData.code = String(updateData.code).trim().toUpperCase();

    const plan = await PlatformPlan.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Platform plan not found.' });

    return res.status(200).json({ success: true, message: 'Platform plan updated successfully.', data: plan });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. TOGGLE PLAN ACTIVE STATUS
 */
export const togglePlatformPlanStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const plan = await PlatformPlan.findById(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Platform plan not found.' });

    plan.isActive = !plan.isActive;
    await plan.save();

    return res.status(200).json({
      success: true,
      message: `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: plan
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. GET PLATFORM BILLING / INVOICE CONFIGURATION
 */
export const getPlatformBillingConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let config = await PlatformBillingConfig.findOne().lean();
    if (!config) {
      config = await PlatformBillingConfig.create({
        companyName: 'Platform Infrastructure Technologies',
        email: 'billing@platform.com',
        mobile: '+91 9876543210',
        address: 'Corporate Park, Financial District',
        state: 'DELHI',
        gstCalculationType: 'EXCLUSIVE',
        hsnSacCode: '998313',
        invoicePrefix: 'PLAT-INV-',
        nextInvoiceSequence: 1001
      });
    }
    return res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. UPDATE PLATFORM BILLING / INVOICE CONFIGURATION
 */
export const updatePlatformBillingConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configData = req.body;

    // Strict validation when enabling Gateway
    if (configData.enableGatewayPayment === true) {
      if (!configData.razorpayKeyId?.trim() || !configData.razorpayKeySecret?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Razorpay Key ID and Key Secret are required when Gateway payment is enabled.'
        });
      }
    }

    // Strict validation when enabling Bank/QR
    if (configData.enableBankQrPayment === true) {
      const hasBank = Boolean(configData.bankAccountNumber?.trim() && configData.bankIfsc?.trim());
      const hasUpi = Boolean(configData.upiId?.trim());
      const hasQr = Boolean(configData.qrCodeUrl?.trim());

      if (!hasBank && !hasUpi && !hasQr) {
        return res.status(400).json({
          success: false,
          message: 'Please provide Bank Account details or UPI ID / QR code before enabling Bank/QR payment.'
        });
      }
    }

    let config = await PlatformBillingConfig.findOne();
    if (config) {
      Object.assign(config, configData);
      await config.save();
    } else {
      config = await PlatformBillingConfig.create(configData);
    }
    return res.status(200).json({ success: true, message: 'Platform billing configuration updated successfully.', data: config });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6B. UPLOAD PLATFORM QR CODE
 */
export const uploadPlatformQrCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No QR code image uploaded.' });
    }
    const relativeUrl = `/uploads/branding/${req.file.filename}`;
    let config = await PlatformBillingConfig.findOne();
    if (config) {
      config.qrCodeUrl = relativeUrl;
      await config.save();
    } else {
      config = await PlatformBillingConfig.create({ qrCodeUrl: relativeUrl });
    }
    return res.status(200).json({
      success: true,
      message: 'UPI QR code uploaded successfully.',
      data: { url: relativeUrl }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. ASSIGN SAAS PLAN TO COMPANY (With custom start date, custom expiry date, client limit, and deferred invoice if state missing)
 */
export const assignPlatformPlanToCompany = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.params;
    const {
      planId,
      customStartDate,
      customEndDate,
      customMaxActiveClients,
      customPrice,
      remarks,
      sendInvoiceEmail
    } = req.body;

    const company: any = await AllCompany.findById(companyId);
    if (!company) return res.status(404).json({ success: false, message: 'Company record not found.' });

    const plan: any = await PlatformPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Platform plan not found.' });

    // Resolve dates
    const startDate = customStartDate ? new Date(customStartDate) : new Date();
    let endDate: Date;
    if (customEndDate) {
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const duration = Number(plan.durationDays) || 30;
      endDate = new Date(startDate);
      // For a D-day subscription starting today, it is valid for D calendar days (inclusive of today)
      endDate.setDate(endDate.getDate() + Math.max(0, duration - 1));
      endDate.setHours(23, 59, 59, 999);
    }

    const price = customPrice !== undefined && Number(customPrice) >= 0 ? Number(customPrice) : plan.price;
    const maxActiveClients = customMaxActiveClients !== undefined && Number(customMaxActiveClients) >= 0
      ? Number(customMaxActiveClients)
      : plan.maxActiveClients;

    // Check platform billing config for tax computation
    const billingConfig: any = (await PlatformBillingConfig.findOne().lean()) || {
      companyName: 'Platform Infrastructure Technologies',
      state: 'DELHI',
      gstCalculationType: 'EXCLUSIVE',
      invoicePrefix: 'PLAT-INV-',
      nextInvoiceSequence: 1001
    };

    const platformState = (billingConfig.state || 'DELHI').trim().toUpperCase();
    const companyState = (company.state || '').trim().toUpperCase();
    const isStateAvailable = Boolean(companyState && companyState !== 'N/A');

    // Tax calculation
    let baseAmount = price;
    let gstAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalAmount = price;
    let isInterState = false;

    if (price > 0 && isStateAvailable) {
      isInterState = companyState !== platformState;
      if (billingConfig.gstCalculationType === 'INCLUSIVE') {
        baseAmount = parseFloat((price / 1.18).toFixed(2));
        gstAmount = parseFloat((price - baseAmount).toFixed(2));
        totalAmount = price;
      } else {
        baseAmount = price;
        gstAmount = parseFloat((price * 0.18).toFixed(2));
        totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2));
      }

      if (isInterState) {
        igstAmount = gstAmount;
      } else {
        cgstAmount = parseFloat((gstAmount / 2).toFixed(2));
        sgstAmount = parseFloat((gstAmount - cgstAmount).toFixed(2));
      }
    }

    // Set existing active subscriptions for this tenant to EXPIRED
    await TenantSubscription.updateMany(
      { tenantId: company._id, status: 'ACTIVE' },
      { $set: { status: 'EXPIRED' } }
    );

    // Determine invoice status (Deferred if state missing and price > 0)
    let invoiceStatus: 'GENERATED' | 'PENDING_STATE' | 'NONE' = 'NONE';
    if (price === 0) {
      invoiceStatus = 'NONE';
    } else if (!isStateAvailable) {
      invoiceStatus = 'PENDING_STATE';
    } else {
      invoiceStatus = 'GENERATED';
    }

    // Create Subscription record
    const subscription: any = await TenantSubscription.create({
      tenantId: company._id,
      planId: plan._id,
      planName: plan.name,
      startDate,
      endDate,
      status: 'ACTIVE',
      maxActiveClients,
      price,
      baseAmount,
      gstAmount,
      totalAmount,
      isGstInclusive: billingConfig.gstCalculationType === 'INCLUSIVE',
      assignedBySuperAdmin: true,
      remarks: remarks || 'Assigned by SuperAdmin',
      invoiceStatus
    });

    let invoice: any = null;
    if (invoiceStatus === 'GENERATED') {
      const invPrefix = billingConfig.invoicePrefix || 'PLAT-INV-';
      const seq = billingConfig.nextInvoiceSequence || 1001;
      const invoiceNumber = `${invPrefix}${seq}`;

      invoice = await PlatformInvoice.create({
        invoiceNumber,
        tenantId: company._id,
        subscriptionId: subscription._id,
        planId: plan._id,
        planName: plan.name,
        invoiceDate: new Date(),
        status: 'PAID',
        baseAmount,
        gstAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
        isInterState,
        platformState,
        tenantState: companyState,
        tenantCompanyName: company.companyName || 'Registered Advisory Firm',
        tenantGstin: company.gst || company.gstin || '',
        tenantEmail: company.email || ''
      });

      subscription.invoiceId = invoice._id;
      await subscription.save();

      // Increment sequence
      await PlatformBillingConfig.updateOne({}, { $inc: { nextInvoiceSequence: 1 } });

      // Send invoice email to company if requested
      if (sendInvoiceEmail && company.email) {
        const emailSubject = `Subscription Tax Invoice (${invoiceNumber}) — ${billingConfig.companyName}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <h2>Subscription Activated Successfully</h2>
            <p>Dear <strong>${company.companyName}</strong>,</p>
            <p>Your SaaS subscription plan <strong>${plan.name}</strong> has been successfully activated on the platform.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc;">
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0;">Invoice Number:</td><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${invoiceNumber}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0;">Plan:</td><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${plan.name}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0;">Active Client Capacity:</td><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${maxActiveClients} Clients</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0;">Valid Period:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${startDate.toLocaleDateString('en-IN')} to ${endDate.toLocaleDateString('en-IN')}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0;">Taxable Base Amount:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">₹${baseAmount.toLocaleString('en-IN')}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0;">GST Amount (18%):</td><td style="padding: 8px; border: 1px solid #e2e8f0;">₹${gstAmount.toLocaleString('en-IN')} (${isInterState ? 'IGST' : 'CGST+SGST'})</td></tr>
              <tr style="background: #e2e8f0;"><td style="padding: 8px; font-weight: bold;">Total Amount:</td><td style="padding: 8px; font-weight: bold; color: #059669;">₹${totalAmount.toLocaleString('en-IN')}</td></tr>
            </table>
            <p>Thank you for partnering with us.</p>
          </div>
        `;
        sendEmail(null, company.email, emailSubject, emailHtml).catch(err =>
          console.warn('[Company Invoice Email Error]:', err.message)
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: invoiceStatus === 'PENDING_STATE'
        ? `Plan assigned successfully. Note: Invoice generation is deferred because company state is not selected.`
        : `Plan "${plan.name}" successfully assigned to company.`,
      data: {
        subscription,
        invoice,
        isStateAvailable
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. GET COMPANY SUBSCRIPTION & INVOICE HISTORY
 */
export const getCompanySubscriptionHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.params;
    const subscriptions = await TenantSubscription.find({ tenantId: companyId })
      .populate('planId')
      .populate('invoiceId')
      .sort({ createdAt: -1 })
      .lean();

    const invoices = await PlatformInvoice.find({ tenantId: companyId }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: {
        subscriptions,
        invoices
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. RESEND PLATFORM INVOICE TO COMPANY
 */
export const resendPlatformInvoiceEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const invoice: any = await PlatformInvoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const company: any = await AllCompany.findById(invoice.tenantId);
    const targetEmail = company?.email || invoice.tenantEmail;

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'No valid company email found to send invoice.' });
    }

    const emailSubject = `Subscription Tax Invoice Copy (${invoice.invoiceNumber})`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h2>Tax Invoice Copy</h2>
        <p>Dear <strong>${invoice.tenantCompanyName}</strong>,</p>
        <p>Here is a copy of your platform subscription tax invoice.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc;">
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;">Invoice Number:</td><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${invoice.invoiceNumber}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;">Plan:</td><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${invoice.planName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;">Total Amount:</td><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #059669;">₹${invoice.totalAmount.toLocaleString('en-IN')}</td></tr>
        </table>
      </div>
    `;

    await sendEmail(null, targetEmail, emailSubject, emailHtml);
    invoice.emailedAt = new Date();
    invoice.lastEmailedTo = targetEmail;
    await invoice.save();

    return res.status(200).json({ success: true, message: `Invoice successfully sent to ${targetEmail}.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. DOWNLOAD PLATFORM INVOICE PDF
 */
export const downloadPlatformInvoice = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const invoice: any = await PlatformInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Platform invoice not found.' });
    }

    // Permission check: SuperAdmin or the owning tenant admin
    if (req.user?.role !== 'SUPER_ADMIN') {
      const userTenantId = String(req.user?.tenantId || '');
      const invTenantId = String(invoice.tenantId || '');
      let isOwner = userTenantId === invTenantId;
      if (!isOwner) {
        try {
          const comp: any = await AllCompany.findById(userTenantId) || await dynamicDb.Tenant.findById(userTenantId);
          if (comp && String(comp._id) === invTenantId) isOwner = true;
          if (!isOwner && req.user?.role === 'ADMIN') isOwner = true;
        } catch {}
      }
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Unauthorized to download this platform invoice.' });
      }
    }

    const pdfBuffer = await generatePlatformInvoicePdf(invoiceId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber || 'Platform_Invoice'}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error: any) {
    console.error('Error streaming platform invoice PDF:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to download invoice PDF' });
  }
};

/**
 * 9. TEST SUPERADMIN PLATFORM PAYMENT GATEWAY (RAZORPAY)
 */
export const testPlatformGateway = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { razorpayKeyId, razorpayKeySecret } = req.body;
    if (!razorpayKeyId || !razorpayKeySecret) {
      return res.status(400).json({ success: false, message: 'Razorpay Key ID and Secret are both required to test connection.' });
    }

    const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId.trim()}:${razorpayKeySecret.trim()}`).toString('base64');
    await axios.get('https://api.razorpay.com/v1/orders?count=1', {
      headers: { Authorization: authHeader }
    });

    const isLive = razorpayKeyId.trim().startsWith('rzp_live');
    return res.status(200).json({
      success: true,
      mode: isLive ? 'LIVE' : 'TEST',
      message: `Razorpay connected successfully! (${isLive ? 'Live Production Mode' : 'Test Sandbox Mode'} Active)`
    });
  } catch (err: any) {
    const errMsg = err?.response?.data?.error?.description || err.message || 'Verification failed';
    return res.status(400).json({ success: false, message: `Gateway connection failed: ${errMsg}` });
  }
};

/**
 * 10. GET UNIFIED SUBSCRIPTIONS & INVOICES (MERGED IN ONE COMPLETE TABLE)
 */
export const getUnifiedPlatformSubscriptions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.query;
    const filter: any = {};
    if (companyId && companyId !== 'ALL' && companyId !== '') {
      filter.tenantId = companyId;
    }

    const subscriptions = await TenantSubscription.find(filter)
      .populate('planId')
      .populate('invoiceId')
      .sort({ createdAt: -1 })
      .lean();

    const companies = await AllCompany.find().lean();
    const compMap = new Map();
    for (const c of companies) compMap.set(String(c._id), c);

    const unifiedList = subscriptions.map((sub: any) => {
      const comp = compMap.get(String(sub.tenantId)) || {};
      const inv = sub.invoiceId || null;
      return {
        _id: sub._id,
        tenantId: sub.tenantId,
        companyName: comp.companyName || inv?.tenantCompanyName || 'Advisory Firm',
        companyEmail: comp.email || inv?.tenantEmail || '',
        companyState: comp.state || inv?.tenantState || '',
        planName: sub.planName,
        planCode: sub.planId?.code || '',
        startDate: sub.startDate,
        endDate: sub.endDate,
        status: sub.status,
        maxActiveClients: sub.maxActiveClients,
        price: sub.price,
        baseAmount: sub.baseAmount || inv?.baseAmount || sub.price,
        gstAmount: sub.gstAmount || inv?.gstAmount || 0,
        totalAmount: sub.totalAmount || inv?.totalAmount || sub.price,
        isInterState: inv?.isInterState || false,
        paymentMode: sub.paymentMode || (sub.assignedBySuperAdmin ? 'SUPERADMIN_ASSIGNED' : 'ONLINE_GATEWAY'),
        offlineTransactionRef: sub.offlineTransactionRef,
        offlinePaymentDate: sub.offlinePaymentDate,
        remarks: sub.remarks,
        invoiceId: inv?._id || null,
        invoiceNumber: inv?.invoiceNumber || (sub.invoiceStatus === 'PENDING_STATE' ? 'PENDING STATE' : 'N/A'),
        invoiceStatus: sub.invoiceStatus,
        createdAt: sub.createdAt
      };
    });

    return res.status(200).json({ success: true, data: unifiedList });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 11. APPROVE OFFLINE SUBSCRIPTION (SUPERADMIN)
 */
export const approveOfflineSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const subscription: any = await TenantSubscription.findById(subscriptionId).populate('planId');
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription record not found.' });

    if (subscription.status === 'ACTIVE' && subscription.invoiceId) {
      return res.status(400).json({ success: false, message: 'Subscription is already active.' });
    }

    const company: any = await AllCompany.findById(subscription.tenantId) || await dynamicDb.Tenant.findById(subscription.tenantId);
    if (!company) return res.status(404).json({ success: false, message: 'Company record not found.' });

    // Expire other active subscriptions for this tenant
    await TenantSubscription.updateMany(
      { tenantId: subscription.tenantId, _id: { $ne: subscription._id }, status: 'ACTIVE' },
      { $set: { status: 'EXPIRED' } }
    );

    const billingConfig: any = (await PlatformBillingConfig.findOne().lean()) || {
      companyName: 'Platform Infrastructure Technologies',
      state: 'DELHI',
      invoicePrefix: 'PLAT-INV-',
      nextInvoiceSequence: 1001
    };

    const platformState = (billingConfig.state || 'DELHI').trim().toUpperCase();
    const companyState = (company.state || '').trim().toUpperCase();
    const isStateAvailable = Boolean(companyState && companyState !== 'N/A');
    const isInterState = companyState !== platformState;

    subscription.status = 'ACTIVE';
    subscription.startDate = new Date();
    const duration = Number(subscription.planId?.durationDays) || 30;
    const endDate = new Date(subscription.startDate);
    endDate.setDate(endDate.getDate() + Math.max(0, duration - 1));
    endDate.setHours(23, 59, 59, 999);
    subscription.endDate = endDate;

    if (isStateAvailable) {
      const invPrefix = billingConfig.invoicePrefix || 'PLAT-INV-';
      const seq = billingConfig.nextInvoiceSequence || 1001;
      const invoiceNumber = `${invPrefix}${seq}`;

      const invoice = await PlatformInvoice.create({
        invoiceNumber,
        tenantId: company._id,
        subscriptionId: subscription._id,
        planId: subscription.planId._id,
        planName: subscription.planName,
        invoiceDate: new Date(),
        status: 'PAID',
        baseAmount: subscription.baseAmount,
        gstAmount: subscription.gstAmount,
        cgstAmount: isInterState ? 0 : parseFloat((subscription.gstAmount / 2).toFixed(2)),
        sgstAmount: isInterState ? 0 : parseFloat((subscription.gstAmount / 2).toFixed(2)),
        igstAmount: isInterState ? subscription.gstAmount : 0,
        totalAmount: subscription.totalAmount,
        isInterState,
        platformState,
        tenantState: companyState,
        tenantCompanyName: company.companyName || 'Registered Advisory Firm',
        tenantGstin: company.gst || company.gstin || '',
        tenantEmail: company.email || ''
      });

      subscription.invoiceId = invoice._id;
      subscription.invoiceStatus = 'GENERATED';
      await PlatformBillingConfig.updateOne({}, { $inc: { nextInvoiceSequence: 1 } });

      if (company.email) {
        try {
          const emailSubject = `Platform Subscription Approved & Activated (${invoiceNumber})`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #0284c7;">Subscription Approved & Activated</h2>
              <p>Dear <strong>${company.companyName}</strong>,</p>
              <p>Your payment for <strong>${subscription.planName}</strong> has been verified and approved.</p>
              <p>Your subscription is now <strong>ACTIVE</strong> until <strong>${endDate.toLocaleDateString('en-IN')}</strong>.</p>
              <p>Invoice Number: <strong>${invoiceNumber}</strong> | Total Paid: <strong>₹${subscription.totalAmount.toLocaleString('en-IN')}</strong></p>
            </div>
          `;
          await sendEmail(null, company.email, emailSubject, emailHtml);
        } catch {}
      }
    } else {
      subscription.invoiceStatus = 'PENDING_STATE';
    }

    await subscription.save();
    return res.status(200).json({ success: true, message: 'Subscription successfully approved and activated!' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 12. GET PUBLIC PLATFORM PAYMENT OPTIONS (FOR TENANT ADMIN UPGRADE MODAL)
 */
export const getPlatformPaymentOptions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config: any = await PlatformBillingConfig.findOne().lean();
    if (!config) {
      return res.status(200).json({
        success: true,
        data: {
          enableGatewayPayment: false,
          enableBankQrPayment: false,
          gatewayProvider: 'RAZORPAY',
          razorpayKeyId: '',
          bankDetails: null
        }
      });
    }

    const hasValidGateway = Boolean(config.enableGatewayPayment && config.razorpayKeyId && config.razorpayKeySecret);
    const hasValidBankQr = Boolean(config.enableBankQrPayment && (config.bankAccountNo || config.upiId || config.qrCodeUrl));

    return res.status(200).json({
      success: true,
      data: {
        enableGatewayPayment: hasValidGateway,
        enableBankQrPayment: hasValidBankQr,
        gatewayProvider: config.gatewayProvider || 'RAZORPAY',
        razorpayKeyId: hasValidGateway ? config.razorpayKeyId : '',
        bankDetails: hasValidBankQr ? {
          companyName: config.companyName || 'Platform Infrastructure Technologies',
          bankName: config.bankName || '',
          accountHolderName: config.bankAccountName || config.companyName || '',
          accountNumber: config.bankAccountNo || '',
          ifscCode: config.bankIfsc || '',
          accountType: config.bankAccountType || 'CURRENT',
          branch: config.bankBranch || '',
          upiId: config.upiId || '',
          upiPayeeName: config.upiPayeeName || config.companyName || '',
          qrCodeUrl: config.qrCodeUrl || ''
        } : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 13. INITIATE TENANT PLATFORM GATEWAY ORDER (RAZORPAY)
 */
export const initiateTenantPlatformGatewayOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId } = req.body;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing.' });

    const plan: any = await PlatformPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Platform plan not found.' });

    const billingConfig: any = await PlatformBillingConfig.findOne().lean();
    if (!billingConfig?.enableGatewayPayment || !billingConfig.razorpayKeyId || !billingConfig.razorpayKeySecret) {
      return res.status(400).json({ success: false, message: 'Direct payment gateway is not enabled by SuperAdmin.' });
    }

    const company: any = await AllCompany.findById(tenantId) || await dynamicDb.Tenant.findById(tenantId);
    const price = Number(plan.price || 0);
    let baseAmount = price;
    let gstAmount = 0;
    let totalAmount = price;

    if (price > 0) {
      if (billingConfig.gstCalculationType === 'INCLUSIVE') {
        baseAmount = parseFloat((price / 1.18).toFixed(2));
        gstAmount = parseFloat((price - baseAmount).toFixed(2));
        totalAmount = price;
      } else {
        baseAmount = price;
        gstAmount = parseFloat((price * 0.18).toFixed(2));
        totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2));
      }
    }

    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({
      key_id: billingConfig.razorpayKeyId.trim(),
      key_secret: billingConfig.razorpayKeySecret.trim()
    });

    const receipt = `PLAT_RCP_${Date.now().toString().slice(-8)}`;
    const order = await rzp.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt,
      notes: {
        tenantId: String(company?._id || tenantId),
        planId: String(plan._id),
        planName: plan.name,
        companyName: company?.companyName || 'Advisory Firm'
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: billingConfig.razorpayKeyId,
        plan: {
          id: plan._id,
          name: plan.name,
          baseAmount,
          gstAmount,
          totalAmount,
          durationDays: plan.durationDays,
          maxActiveClients: plan.maxActiveClients
        },
        company: {
          name: company?.companyName || 'Advisory Firm',
          email: company?.email || req.user?.email || '',
          mobile: company?.mobile || ''
        }
      }
    });
  } catch (error: any) {
    console.error('Initiate platform gateway order error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create payment order.' });
  }
};

/**
 * 14. VERIFY TENANT PLATFORM GATEWAY PAYMENT
 */
export const verifyTenantPlatformGatewayPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      planId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing.' });

    const billingConfig: any = await PlatformBillingConfig.findOne().lean();
    if (!billingConfig?.razorpayKeySecret) {
      return res.status(400).json({ success: false, message: 'Platform gateway secret not configured.' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', billingConfig.razorpayKeySecret.trim())
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' });
    }

    const plan: any = await PlatformPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Platform plan not found.' });

    const company: any = await AllCompany.findById(tenantId) || await dynamicDb.Tenant.findById(tenantId);
    const platformState = (billingConfig.state || 'DELHI').trim().toUpperCase();
    const companyState = (company?.state || '').trim().toUpperCase();
    const isStateAvailable = Boolean(companyState && companyState !== 'N/A');
    const isInterState = companyState !== platformState;

    const price = Number(plan.price || 0);
    let baseAmount = price;
    let gstAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalAmount = price;

    if (price > 0 && isStateAvailable) {
      if (billingConfig.gstCalculationType === 'INCLUSIVE') {
        baseAmount = parseFloat((price / 1.18).toFixed(2));
        gstAmount = parseFloat((price - baseAmount).toFixed(2));
        totalAmount = price;
      } else {
        baseAmount = price;
        gstAmount = parseFloat((price * 0.18).toFixed(2));
        totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2));
      }
      if (isInterState) {
        igstAmount = gstAmount;
      } else {
        cgstAmount = parseFloat((gstAmount / 2).toFixed(2));
        sgstAmount = parseFloat((gstAmount - cgstAmount).toFixed(2));
      }
    }

    await TenantSubscription.updateMany(
      { tenantId: company?._id || tenantId, status: 'ACTIVE' },
      { $set: { status: 'EXPIRED' } }
    );

    const startDate = new Date();
    const duration = Number(plan.durationDays) || 30;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.max(0, duration - 1));
    endDate.setHours(23, 59, 59, 999);

    const subscription = await TenantSubscription.create({
      tenantId: company?._id || tenantId,
      planId: plan._id,
      planName: plan.name,
      startDate,
      endDate,
      status: 'ACTIVE',
      maxActiveClients: plan.maxActiveClients,
      price,
      baseAmount,
      gstAmount,
      totalAmount,
      isGstInclusive: billingConfig.gstCalculationType === 'INCLUSIVE',
      assignedBySuperAdmin: false,
      paymentMode: 'ONLINE_GATEWAY',
      gatewayTransactionId: razorpay_payment_id,
      remarks: `Paid online via Razorpay (Order: ${razorpay_order_id})`,
      invoiceStatus: isStateAvailable ? 'GENERATED' : 'PENDING_STATE'
    });

    if (isStateAvailable) {
      const invPrefix = billingConfig.invoicePrefix || 'PLAT-INV-';
      const seq = billingConfig.nextInvoiceSequence || 1001;
      const invoiceNumber = `${invPrefix}${seq}`;

      const invoice = await PlatformInvoice.create({
        invoiceNumber,
        tenantId: company?._id || tenantId,
        subscriptionId: subscription._id,
        planId: plan._id,
        planName: plan.name,
        invoiceDate: new Date(),
        status: 'PAID',
        baseAmount,
        gstAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
        isInterState,
        platformState,
        tenantState: companyState,
        tenantCompanyName: company?.companyName || 'Registered Advisory Firm',
        tenantGstin: company?.gst || company?.gstin || '',
        tenantEmail: company?.email || req.user?.email || ''
      });

      subscription.invoiceId = invoice._id;
      await subscription.save();
      await PlatformBillingConfig.updateOne({}, { $inc: { nextInvoiceSequence: 1 } });

      if (company?.email) {
        try {
          const emailSubject = `Official Platform Subscription Tax Invoice (${invoiceNumber})`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #0284c7;">Payment Successful & Plan Activated</h2>
              <p>Dear <strong>${company.companyName}</strong>,</p>
              <p>Thank you for subscribing to <strong>${plan.name}</strong> on our platform.</p>
              <p>Invoice Number: <strong>${invoiceNumber}</strong></p>
              <p>Total Paid: <strong>₹${totalAmount.toLocaleString('en-IN')}</strong></p>
              <p>Validity: <strong>${startDate.toLocaleDateString('en-IN')} to ${endDate.toLocaleDateString('en-IN')}</strong></p>
            </div>
          `;
          await sendEmail(null, company.email, emailSubject, emailHtml);
        } catch {}
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Plan successfully purchased and activated! Official tax invoice generated.',
      data: subscription
    });
  } catch (error: any) {
    console.error('Verify platform payment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Payment verification failed.' });
  }
};

/**
 * 15. SUBMIT TENANT PLATFORM OFFLINE PAYMENT (BANK TRANSFER / UPI QR)
 */
export const submitTenantPlatformOfflinePayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, offlineTransactionRef, offlinePaymentDate, remarks, offlineProofUrl } = req.body;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing.' });

    if (!offlineTransactionRef || !offlineTransactionRef.trim()) {
      return res.status(400).json({ success: false, message: 'UTR / Transaction Reference number is required.' });
    }

    const plan: any = await PlatformPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Platform plan not found.' });

    const company: any = await AllCompany.findById(tenantId) || await dynamicDb.Tenant.findById(tenantId);
    const billingConfig: any = await PlatformBillingConfig.findOne().lean();

    const price = Number(plan.price || 0);
    let baseAmount = price;
    let gstAmount = 0;
    let totalAmount = price;

    if (price > 0) {
      if (billingConfig?.gstCalculationType === 'INCLUSIVE') {
        baseAmount = parseFloat((price / 1.18).toFixed(2));
        gstAmount = parseFloat((price - baseAmount).toFixed(2));
        totalAmount = price;
      } else {
        baseAmount = price;
        gstAmount = parseFloat((price * 0.18).toFixed(2));
        totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2));
      }
    }

    const startDate = new Date();
    const duration = Number(plan.durationDays) || 30;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.max(0, duration - 1));
    endDate.setHours(23, 59, 59, 999);

    const subscription = await TenantSubscription.create({
      tenantId: company?._id || tenantId,
      planId: plan._id,
      planName: plan.name,
      startDate,
      endDate,
      status: 'PENDING_APPROVAL',
      maxActiveClients: plan.maxActiveClients,
      price,
      baseAmount,
      gstAmount,
      totalAmount,
      isGstInclusive: billingConfig?.gstCalculationType === 'INCLUSIVE',
      assignedBySuperAdmin: false,
      paymentMode: 'BANK_TRANSFER',
      offlineTransactionRef: offlineTransactionRef.trim(),
      offlinePaymentDate: offlinePaymentDate ? new Date(offlinePaymentDate) : new Date(),
      offlineProofUrl: offlineProofUrl || null,
      remarks: remarks || 'Submitted via Bank/QR Payment by Tenant Admin',
      invoiceStatus: 'NONE'
    });

    return res.status(200).json({
      success: true,
      message: 'Payment details submitted successfully! Your plan will activate once SuperAdmin verifies the transaction.',
      data: subscription
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
