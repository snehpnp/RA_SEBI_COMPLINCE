import { Request, Response } from 'express';
import mongoose from 'mongoose';
import dynamicDb, { centralModels } from '../config/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { sendWelcomeEmail } from '../services/emailService';
import { getTenantComplianceAttachments } from '../services/pdfService';
import { createKycRequest } from '../services/digioService';
import { generateInvoicePdf } from '../services/invoiceGenerator';
import { encryptCCAvenue, decryptCCAvenue } from '../utils/ccavenue';
import querystring from 'querystring';
import Razorpay from 'razorpay';
import crypto from 'crypto';

export const registerClient = async (req: Request, res: Response) => {
  const {
    tenantId: passedTenantId,
    name,
    email,
    mobile,
    password,
    pan,
    aadhaar,
    category,
    occupation,
    addressLine1,
    city,
    state,
    zipCode
  } = req.body;

  if (!name || !email || !mobile || !password || !pan || !aadhaar || !addressLine1 || !state) {
    return res.status(400).json({
      success: false,
      message: 'All fields (name, email, mobile, password, PAN, Aadhaar, address, state) are required.'
    });
  }

  try {
    let tenantId = passedTenantId;
    let tenant: any = null;

    if (tenantId) {
      tenant = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!tenant) {
      tenant = await dynamicDb.Tenant.findOne({ status: { $ne: 'DELETED' } }).lean() || await dynamicDb.Tenant.findOne().lean();
      if (tenant) {
        tenantId = (tenant._id || tenant.id).toString();
      }
    }

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Company setup pending. Please contact admin.' });
    }

    const duplicateEmail = await dynamicDb.User.findOne({ email }).lean();
    if (duplicateEmail) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Account Detected',
        duplicateField: 'email',
        errors: ['An account with this Email already exists.']
      });
    }

    const duplicateMobile = await dynamicDb.User.findOne({ mobile }).lean();
    if (duplicateMobile) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Account Detected',
        duplicateField: 'mobile',
        errors: ['An account with this Mobile number already exists.']
      });
    }

    const duplicatePan = await dynamicDb.Client.findOne({ pan }).lean();
    if (duplicatePan) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Account Detected',
        duplicateField: 'pan',
        errors: ['An account with this PAN already exists.']
      });
    }

    const duplicateAadhaar = await dynamicDb.Client.findOne({ aadhaar }).lean();
    if (duplicateAadhaar) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Account Detected',
        duplicateField: 'aadhaar',
        errors: ['An account with this Aadhaar already exists.']
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const clientRole = await dynamicDb.Role.findOne({ name: 'CLIENT' }).lean();
    if (!clientRole) {
      return res.status(500).json({ success: false, message: 'Client role not seeded.' });
    }

    const creatorId = req.body.createdById || ((req as any).user ? (req as any).user.id : null);

    const user: any = await dynamicDb.User.create({
      tenantId,
      roleId: clientRole._id || clientRole.id,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || 'Client',
      email,
      mobile,
      passwordHash,
      status: 'ACTIVE',
      tempPassword: null
    });

    const client: any = await dynamicDb.Client.create({
      tenantId,
      userId: user._id || user.id,
      name,
      email,
      mobile,
      pan,
      aadhaar,
      category: category || 'INDIVIDUAL',
      occupation,
      status: 'ACTIVE',
      createdById: creatorId
    });

    await dynamicDb.ClientProfile.create({
      clientId: client._id || client.id,
      addressLine1,
      city,
      state,
      country: 'India',
      zipCode
    });

    await logAudit({
      tenantId,
      userId: user._id || user.id,
      action: 'CREATE',
      module: 'CLIENTS',
      newValue: client,
      ipAddress: req.ip
    });

    const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    
    try {
      const attachments = await getTenantComplianceAttachments(tenant);

      await sendWelcomeEmail({
        tenantId,
        toEmail: email,
        name,
        password: password,
        role: 'CLIENT',
        loginUrl,
        companyName: tenant?.companyName || 'RAGCP Platform',
        customText: tenant?.welcomeEmailText,
        attachments
      });
    } catch (emailErr) {
      console.error('[EMAIL] Failed to send welcome email:', emailErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Client registered and activated successfully.',
      data: client
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const initiateDigioKyc = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const client: any = await dynamicDb.Client.findOne({ userId: req.user!.id }).lean();
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    const tenant: any = await dynamicDb.Tenant.findById(tenantId).lean();
    if (!tenant?.digioClientId || !tenant?.digioClientSecret || !tenant?.digioKycTemplateName) {
      return res.status(400).json({ success: false, message: 'Digio KYC is not configured for this tenant.' });
    }

    const customerIdentifier = client.email;
    const customerName = client.name || 'Client';

    const digioResponse = await createKycRequest(
      tenant.digioClientId,
      tenant.digioClientSecret,
      tenant.digioKycTemplateName,
      customerIdentifier,
      customerName
    );

    return res.status(200).json({
      success: true,
      message: 'Digio KYC request initiated',
      data: digioResponse
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const verifyKRA = async (req: AuthenticatedRequest, res: Response) => {
  const { pan, aadhaar, statusInput } = req.body;
  const tenantId = req.user!.tenantId;

  if (!pan) {
    return res.status(400).json({ success: false, message: 'PAN is required.' });
  }

  try {
    const client: any = await dynamicDb.Client.findOne({
      userId: req.user!.id
    }).lean();

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client profile not found.' });
    }

    if (pan !== client.pan) {
      const duplicatePan = await dynamicDb.Client.findOne({
        pan,
        _id: { $ne: client._id || client.id }
      }).lean();
      if (duplicatePan) {
        return res.status(400).json({ success: false, message: 'Verified PAN is already in use by another client.' });
      }
    }

    if (aadhaar && aadhaar !== client.aadhaar) {
      const duplicateAadhaar = await dynamicDb.Client.findOne({
        aadhaar,
        _id: { $ne: client._id || client.id }
      }).lean();
      if (duplicateAadhaar) {
        return res.status(400).json({ success: false, message: 'Verified Aadhaar number is already in use by another client.' });
      }
    }

    if (pan !== client.pan) {
      await dynamicDb.ClientIdentityHistory.create({
        clientId: client._id || client.id,
        fieldName: 'PAN',
        oldValue: client.pan,
        newValue: pan,
        changedBy: 'CLIENT',
        remarks: 'Updated during DigiLocker eKYC verification'
      });
    }

    if (aadhaar && aadhaar !== client.aadhaar) {
      await dynamicDb.ClientIdentityHistory.create({
        clientId: client._id || client.id,
        fieldName: 'AADHAAR',
        oldValue: client.aadhaar,
        newValue: aadhaar,
        changedBy: 'CLIENT',
        remarks: 'Updated during DigiLocker eKYC verification'
      });
    }

    const nextStatus = statusInput === 'FAIL' ? 'KYC_FAILED' : 'AGREEMENT_PENDING';
    const updatedClient = await dynamicDb.Client.findByIdAndUpdate(
      client._id || client.id,
      {
        $set: {
          pan,
          ...(aadhaar ? { aadhaar } : {}),
          status: nextStatus,
          kraVerified: statusInput !== 'FAIL'
        }
      },
      { returnDocument: 'after', lean: true }
    );

    if (statusInput === 'FAIL') {
      await dynamicDb.ComplianceAlert.create({
        tenantId: tenantId!,
        alertType: 'KYC_FAILED',
        severity: 'HIGH',
        description: `KRA automated KYC failed for Client PAN ${pan} (${client.name}). Manual verification required.`,
        clientId: client._id || client.id
      });

      return res.status(200).json({
        success: true,
        message: 'KRA lookup failed. System generated an alert for manual verification but onboarding remains unblocked.',
        data: { kycStatus: 'MANUAL_REVIEW_REQUIRED' }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'KRA KYC verification successful.',
      data: { kycStatus: 'COMPLETED' }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const acceptConsent = async (req: AuthenticatedRequest, res: Response) => {
  const { tncAccept, policyAccept, researchAccept } = req.body;

  try {
    const client: any = await dynamicDb.Client.findOne({ userId: req.user!.id }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const consent: any = await dynamicDb.Consent.create({
      clientId: client._id || client.id,
      tncAccept: !!tncAccept,
      policyAccept: !!policyAccept,
      researchAccept: !!researchAccept,
      ipAddress: req.ip
    });

    await dynamicDb.ConsentHistory.create({
      consentId: consent._id || consent.id,
      action: 'ACCEPTED'
    });

    return res.status(200).json({
      success: true,
      message: 'Consents captured successfully.',
      data: consent
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const signAgreement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const client: any = await dynamicDb.Client.findOne({ userId: req.user!.id }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const agreementUrl = `/uploads/agreements/${client._id || client.id}_signed_agreement.pdf`;

    const agreement: any = await dynamicDb.Agreement.create({
      clientId: client._id || client.id,
      agreementUrl,
      esignMode: 'MOCK_AADHAAR',
      ipAddress: req.ip,
      status: 'SIGNED'
    });

    await dynamicDb.AgreementHistory.create({
      agreementId: agreement._id || agreement.id,
      action: 'SIGNED',
      performedBy: client.name,
      ipAddress: req.ip
    });

    // Check if client already has an active subscription assigned by admin
    const activeSub = await dynamicDb.Subscription.findOne({
      clientId: client._id || client.id,
      status: 'ACTIVE'
    }).lean();

    const newStatus = (activeSub && client.kraVerified) ? 'ACTIVE' : (activeSub ? 'ACTIVE' : 'PAYMENT_PENDING');

    await dynamicDb.Client.findByIdAndUpdate(client._id || client.id, {
      $set: { 
        status: newStatus,
        agreementSigned: true
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Agreement signed successfully via Aadhaar eSign.',
      data: agreement
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  const { clientId, planId, amount, paymentMode, transactionRef, statusInput, couponCode } = req.body;

  try {
    const client: any = await dynamicDb.Client.findById(clientId).populate('userId').lean();

    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const tenantId = client.userId?.tenantId;

    if (amount > 151000) {
      await dynamicDb.Client.findByIdAndUpdate(clientId, {
        $set: { category: 'NON_INDIVIDUAL' }
      });
    }

    if (paymentMode !== 'ONLINE_RAZORPAY' && amount >= 50000) {
      await dynamicDb.ComplianceAlert.create({
        tenantId,
        alertType: 'COMPLIANCE_PENDING',
        severity: 'HIGH',
        description: `FIU ALERT: Cash payment of ${amount} received from Client ${client.name} (PAN: ${client.pan}). High risk case logged.`
      });
    }

    const payStatus = statusInput === 'FAILED' ? 'FAILED' : 'SUCCESS';

    let discountAmount = 0;
    let appliedCouponId: any = null;
    if (couponCode) {
      const coupon: any = await dynamicDb.Coupon.findOne({ code: couponCode, tenantId }).lean();
      const plan: any = await dynamicDb.Plan.findById(planId).lean();
      if (coupon && plan && coupon.status === 'ACTIVE') {
        if (coupon.discountType === 'FLAT') {
          discountAmount = coupon.discountValue;
        } else if (coupon.discountType === 'PERCENTAGE') {
          discountAmount = (plan.price * coupon.discountValue) / 100;
          if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discountAmount > coupon.maxDiscountValue) {
            discountAmount = coupon.maxDiscountValue;
          }
        }
        if (discountAmount > plan.price) discountAmount = plan.price;
        appliedCouponId = coupon._id || coupon.id;
        
        if (statusInput !== 'FAILED') {
          await dynamicDb.Coupon.findByIdAndUpdate(coupon._id || coupon.id, {
            $inc: { usedCount: 1 }
          });
        }
      }
    }

    const tenantObj: any = await dynamicDb.Tenant.findById(tenantId).lean();
    const profile = await dynamicDb.ClientProfile.findOne({ clientId }).lean();

    const payment = await dynamicDb.Payment.create({
      tenantId,
      clientId,
      planId,
      amount: parseFloat(amount) || 0,
      couponId: appliedCouponId,
      discountApplied: discountAmount || 0,
      paymentMode: paymentMode || 'ONLINE_RAZORPAY',
      transactionRef: transactionRef || 'TXN-' + Math.floor(100000 + Math.random() * 900000),
      status: payStatus,
      clientCity: profile?.city || null,
      clientState: profile?.state || null,
      tenantState: tenantObj?.state || null
    });

    if (payStatus === 'SUCCESS') {
      const plan: any = await dynamicDb.Plan.findById(planId).lean();
      if (plan) {
        const existingSub: any = await dynamicDb.Subscription.findOne({
          clientId,
          planId,
          status: 'ACTIVE',
          endDate: { $gt: new Date() }
        }).sort({ endDate: -1 }).lean();

        let startDate = new Date();
        if (existingSub) {
          startDate = new Date(existingSub.endDate);
        }
        
        const endDate = new Date(startDate.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);

        await dynamicDb.Subscription.create({
          clientId,
          planId,
          startDate,
          endDate,
          status: 'ACTIVE'
        });

        await dynamicDb.Client.findByIdAndUpdate(clientId, {
          $set: { status: 'ACTIVE' }
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: payStatus === 'SUCCESS' ? 'Subscription activated.' : 'Payment failed.',
      data: payment
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const submitManualPayment = async (req: AuthenticatedRequest, res: Response) => {
  const { planId, amount, paymentMode, transactionRef, remarks } = req.body;
  const receiptUrl = req.file ? `/uploads/payments/${req.file.filename}` : '/uploads/payments/mock_receipt.png';

  try {
    const client: any = await dynamicDb.Client.findOne({ userId: req.user!.id }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    const tenantId = req.user!.tenantId!;
    const tenantObj: any = await dynamicDb.Tenant.findById(tenantId).lean();
    const profile = await dynamicDb.ClientProfile.findOne({ clientId: client._id || client.id }).lean();

    const kycRequired = tenantObj?.kycFirst !== false;
    const isClientKycDone = Boolean(client.kraVerified === true || client.status === 'VERIFIED' || client.status === 'APPROVED' || client.status === 'PAYMENT_PENDING');
    if (kycRequired && !isClientKycDone) {
      return res.status(403).json({
        success: false,
        requiresKyc: true,
        message: 'KYC Verification is required before purchasing a plan. Please complete your KYC verification first.'
      });
    }

    const payment = await dynamicDb.Payment.create({
      tenantId,
      clientId: client._id || client.id,
      planId,
      amount: parseFloat(amount) || 0,
      paymentMode: paymentMode || 'MANUAL_UPI',
      transactionRef: transactionRef || 'MANUAL-' + Date.now(),
      receiptUrl,
      status: 'PENDING',
      remarks,
      clientCity: profile?.city || null,
      clientState: profile?.state || null,
      tenantState: tenantObj?.state || null
    });

    return res.status(201).json({
      success: true,
      message: 'Payment details uploaded successfully. Awaiting compliance team approval.',
      data: payment
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const verifyManualPayment = async (req: AuthenticatedRequest, res: Response) => {
  const { paymentId, status, remarks } = req.body;

  try {
    const payment: any = await dynamicDb.Payment.findById(paymentId).lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });
    const tenantId = req.user!.tenantId!;

    const updatedPayment = await dynamicDb.Payment.findByIdAndUpdate(
      paymentId,
      {
        $set: {
          status,
          remarks,
          verifiedByStaffId: req.user!.id
        }
      },
      { returnDocument: 'after', lean: true }
    );

    if (status === 'SUCCESS') {
      const plan: any = await dynamicDb.Plan.findById(payment.planId).lean();
      if (plan) {
        const client: any = await dynamicDb.Client.findById(payment.clientId).lean();
        if (client) {
          if (payment.amount > 151000) {
            await dynamicDb.Client.findByIdAndUpdate(client._id || client.id, {
              $set: { category: 'NON_INDIVIDUAL' }
            });
          }
          if (payment.paymentMode !== 'ONLINE_RAZORPAY' && payment.amount >= 50000) {
            await dynamicDb.ComplianceAlert.create({
              tenantId,
              alertType: 'COMPLIANCE_PENDING',
              severity: 'HIGH',
              description: `FIU ALERT: Cash/Manual payment of ${payment.amount} received from Client ${client.name} (PAN: ${client.pan}). High risk case logged.`
            });
          }
        }

        const existingSub: any = await dynamicDb.Subscription.findOne({
          clientId: payment.clientId,
          planId: plan._id || plan.id,
          status: 'ACTIVE',
          endDate: { $gt: new Date() }
        }).sort({ endDate: -1 }).lean();

        let startDate = new Date();
        if (existingSub) {
          startDate = new Date(existingSub.endDate);
        }
        
        const endDate = new Date(startDate.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);

        await dynamicDb.Subscription.create({
          clientId: payment.clientId,
          planId: plan._id || plan.id,
          startDate,
          endDate,
          status: 'ACTIVE'
        });

        await dynamicDb.Client.findByIdAndUpdate(payment.clientId, {
          $set: { status: 'ACTIVE' }
        });
      }
    }

    await logAudit({
      tenantId,
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'PAYMENTS',
      newValue: updatedPayment,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Manual payment verification processed as ${status}.`,
      data: updatedPayment
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getPlans = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID required.' });

  try {
    const tenant: any = await dynamicDb.Tenant.findById(tenantId).lean();
    
    // Find active categories
    const activeCategories = await dynamicDb.PlanCategory.find({ tenantId, status: 'ACTIVE' }).lean();
    const activeCatIds = activeCategories.map((c: any) => c._id || c.id);

    const plans = await dynamicDb.Plan.find({ 
      tenantId, 
      deletedAt: null, 
      status: 'ACTIVE',
      $or: [
        { categoryId: null },
        { categoryId: { $in: activeCatIds } }
      ]
    })
      .populate('categoryId')
      .lean();

    const formatted = plans.map((p: any) => {
      const catObj = p.categoryId && typeof p.categoryId === 'object' ? p.categoryId : null;
      const catIdStr = catObj ? String(catObj._id || catObj.id) : (p.categoryId ? String(p.categoryId) : '');
      return {
        ...p,
        id: String(p._id || p.id),
        categoryId: catIdStr,
        category: catObj ? {
          ...catObj,
          id: String(catObj._id || catObj.id)
        } : (p.category ? p.category : null)
      };
    });

    return res.status(200).json({ 
      success: true, 
      data: formatted, 
      gstCalculationType: tenant?.gstCalculationType || 'EXCLUSIVE' 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getClientProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const client: any = await dynamicDb.Client.findOne({ userId: req.user!.id }).lean();
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client profile not found.' });
    }

    const clientId = client._id || client.id;
    const profile = await dynamicDb.ClientProfile.findOne({ $or: [{ clientId }, { clientId: client.userId }] }).lean();
    const subscriptions = await dynamicDb.Subscription.find({
      $or: [{ clientId }, { clientId: client.userId }, { clientId: req.user!.id }]
    }).populate('planId').lean();
    const agreements = await dynamicDb.Agreement.find({
      $or: [{ clientId }, { clientId: client.userId }, { clientId: req.user!.id }]
    }).lean();
    const consents = await dynamicDb.Consent.find({
      $or: [{ clientId }, { clientId: client.userId }, { clientId: req.user!.id }]
    }).lean();
    const user = await dynamicDb.User.findById(req.user!.id).lean();
    let tenantObj: any = null;
    if (user && (user as any).tenantId) {
      const tenantId = (user as any).tenantId;
      if (mongoose.Types.ObjectId.isValid(tenantId)) {
        tenantObj = await dynamicDb.Tenant.findById(tenantId).lean();
      }
      if (!tenantObj) {
        tenantObj = await dynamicDb.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId }] }).lean();
      }
      if (!tenantObj) {
        tenantObj = await centralModels.AllCompany.findOne({ $or: [{ _id: tenantId }, { tenantId }] }).lean();
      }
    }
    if (!tenantObj) {
      tenantObj = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }

    let isPaymentGatewayConfigured = false;
    let tenantFormatted = null;

    if (tenantObj) {
      const activeGateway = (tenantObj.activePaymentGateway || 'RAZORPAY').toUpperCase();
      if (activeGateway === 'RAZORPAY') {
        isPaymentGatewayConfigured = !!(tenantObj.razorpayKeyId && tenantObj.razorpayKeySecret && tenantObj.razorpayKeyId.trim() && tenantObj.razorpayKeySecret.trim());
      } else if (activeGateway === 'CCAVENUE') {
        isPaymentGatewayConfigured = !!(tenantObj.ccavenueMerchantId && tenantObj.ccavenueAccessCode && tenantObj.ccavenueWorkingKey && tenantObj.ccavenueMerchantId.trim() && tenantObj.ccavenueWorkingKey.trim());
      } else if (activeGateway === 'CASHFREE') {
        isPaymentGatewayConfigured = !!(tenantObj.cashfreeAppId && tenantObj.cashfreeSecretKey && tenantObj.cashfreeAppId.trim() && tenantObj.cashfreeSecretKey.trim());
      } else if (activeGateway === 'STRIPE') {
        isPaymentGatewayConfigured = !!(tenantObj.stripePublishableKey && tenantObj.stripeSecretKey && tenantObj.stripePublishableKey.trim() && tenantObj.stripeSecretKey.trim());
      }

      tenantFormatted = {
        _id: tenantObj._id || tenantObj.id,
        id: String(tenantObj._id || tenantObj.id),
        companyName: tenantObj.companyName,
        sebiRegistration: tenantObj.sebiRegistration,
        address: tenantObj.address,
        email: tenantObj.email,
        mobile: tenantObj.mobile,
        agreementContent: tenantObj.agreementContent,
        activePaymentGateway: tenantObj.activePaymentGateway || 'RAZORPAY',
        razorpayKeyId: tenantObj.razorpayKeyId || null,
        ccavenueMerchantId: tenantObj.ccavenueMerchantId || null,
        kycFirst: tenantObj.kycFirst !== false,
        gstCalculationType: tenantObj.gstCalculationType || 'EXCLUSIVE',
        isPaymentGatewayConfigured
      };
    }

    const formatted = {
      ...client,
      id: String(clientId),
      profile,
      subscriptions: subscriptions.map((s: any) => ({
        ...s,
        id: String(s._id || s.id),
        plan: s.planId ? {
          ...s.planId,
          id: String(s.planId._id || s.planId.id)
        } : null
      })),
      agreements,
      consents,
      user: user ? {
        ...user,
        id: String((user as any)._id || (user as any).id),
        tenant: tenantFormatted
      } : null
    };

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateClientProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pan, aadhaar, name, email, mobile, dob, address } = req.body;
    const userId = req.user!.id;

    const client: any = await dynamicDb.Client.findOne({ userId }).lean();
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    const clientUpdate: any = {};
    if (pan !== undefined) clientUpdate.pan = pan;
    if (aadhaar !== undefined) clientUpdate.aadhaar = aadhaar;
    if (name) clientUpdate.name = name;
    if (email) clientUpdate.email = email;
    if (mobile) clientUpdate.mobile = mobile;
    if (dob) clientUpdate.dob = new Date(dob);

    if (Object.keys(clientUpdate).length > 0) {
      await dynamicDb.Client.findByIdAndUpdate(client._id || client.id, { $set: clientUpdate });
    }

    if (name || email || mobile) {
      const userUpdate: any = {};
      if (name) {
        userUpdate.firstName = name.split(' ')[0];
        userUpdate.lastName = name.split(' ').slice(1).join(' ') || 'Client';
      }
      if (email) userUpdate.email = email;
      if (mobile) userUpdate.mobile = mobile;
      await dynamicDb.User.findByIdAndUpdate(userId, { $set: userUpdate });
    }

    if (address) {
      await dynamicDb.ClientProfile.findOneAndUpdate(
        { clientId: client._id || client.id },
        {
          $set: { addressLine1: address },
          $setOnInsert: { clientId: client._id || client.id, city: '', state: '', country: 'India' }
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    return res.status(200).json({ success: true, message: 'Profile updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const deleteClientAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const client: any = await dynamicDb.Client.findOne({ userId }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    await dynamicDb.User.findByIdAndUpdate(userId, {
      $set: { deletedAt: new Date(), deletedBy: 'SELF', status: 'INACTIVE' }
    });
    await dynamicDb.Client.findByIdAndUpdate(client._id || client.id, {
      $set: { status: 'INACTIVE' }
    });

    return res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const uploadClientDocument = async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Document uploaded' });
};

export const downloadInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment: any = await dynamicDb.Payment.findById(id).lean();
    
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    
    const user = (req as any).user;
    if (user && user.role === 'CLIENT') {
      const client: any = await dynamicDb.Client.findOne({ userId: user.id }).lean();
      if (!client || String(client._id || client.id) !== String(payment.clientId)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    const pdfBuffer = await generateInvoicePdf(id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${payment.transactionRef}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error("Download Invoice Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const initiateRazorpayPayment = async (req: AuthenticatedRequest, res: Response) => {
  const { planId, couponCode } = req.body;
  try {
    const client: any = await dynamicDb.Client.findOne({ userId: req.user!.id }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    
    let tenantId = req.user?.tenantId;
    if (!tenantId && req.user?.id) {
      if (client?.tenantId) tenantId = client.tenantId;
      if (!tenantId) {
        const userDoc: any = await dynamicDb.User.findById(req.user.id).lean();
        if (userDoc?.tenantId) tenantId = userDoc.tenantId;
      }
    }

    let tenantObj: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      tenantObj = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!tenantObj && tenantId) {
      tenantObj = await dynamicDb.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId }] }).lean();
    }
    if (!tenantObj && tenantId) {
      tenantObj = await centralModels.AllCompany.findOne({ $or: [{ _id: tenantId }, { tenantId }] }).lean();
    }
    if (!tenantObj) {
      tenantObj = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }
    
    if (!tenantObj || !tenantObj.razorpayKeyId || !tenantObj.razorpayKeySecret || !tenantObj.razorpayKeyId.trim() || !tenantObj.razorpayKeySecret.trim()) {
      return res.status(400).json({ 
        success: false, 
        isConfigured: false,
        message: 'Payment gateway is not configured by the administrator. To purchase this plan, please contact the administrator.' 
      });
    }

    const kycRequired = tenantObj?.kycFirst !== false;
    const isClientKycDone = Boolean(client.kraVerified === true || client.status === 'VERIFIED' || client.status === 'APPROVED' || client.status === 'PAYMENT_PENDING');
    if (kycRequired && !isClientKycDone) {
      return res.status(403).json({
        success: false,
        requiresKyc: true,
        message: 'KYC Verification is required before purchasing a plan. Please complete your KYC verification first.'
      });
    }

    const plan: any = await dynamicDb.Plan.findById(planId).lean();
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    let finalPrice = plan.price;
    let appliedCouponId = null;

    if (couponCode) {
      const coupon: any = await dynamicDb.Coupon.findOne({ code: couponCode, tenantId }).lean();
      if (coupon && coupon.status === 'ACTIVE') {
        if (coupon.discountType === 'FLAT') {
          finalPrice = Math.max(0, finalPrice - coupon.discountValue);
        } else if (coupon.discountType === 'PERCENTAGE') {
          let discount = (finalPrice * coupon.discountValue) / 100;
          if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discount > coupon.maxDiscountValue) {
            discount = coupon.maxDiscountValue;
          }
          finalPrice = Math.max(0, finalPrice - discount);
        }
        appliedCouponId = coupon._id || coupon.id;
      }
    }
    
    if (tenantObj.gstCalculationType === 'EXCLUSIVE') {
      finalPrice = finalPrice * 1.18;
    }

    const amountInPaise = Math.round(finalPrice * 100);
    const receiptId = 'RCPT_' + Math.floor(10000 + Math.random() * 90000);

    const razorpay = new Razorpay({
      key_id: tenantObj.razorpayKeyId,
      key_secret: tenantObj.razorpayKeySecret
    });

    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        clientId: String(client._id || client.id),
        planId: String(plan._id || plan.id),
        couponId: appliedCouponId ? String(appliedCouponId) : '',
        tenantId: tenantId
      }
    };

    const order: any = await razorpay.orders.create(orderOptions as any);

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: tenantObj.razorpayKeyId
    });

  } catch (error: any) {
    console.error('Razorpay Initiate Error:', error);
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const verifyRazorpayPayment = async (req: AuthenticatedRequest, res: Response) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId, couponCode } = req.body;
  try {
    const client: any = await dynamicDb.Client.findOne({ userId: req.user!.id }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    
    const tenantId = req.user!.tenantId!;
    const tenantObj: any = await dynamicDb.Tenant.findById(tenantId).lean();
    if (!tenantObj || !tenantObj.razorpayKeySecret) {
      return res.status(400).json({ success: false, message: 'Razorpay configuration error' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', tenantObj.razorpayKeySecret).update(body.toString()).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const plan: any = await dynamicDb.Plan.findById(planId).lean();
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    let discountAmount = 0;
    let appliedCouponId: any = null;

    if (couponCode) {
      const coupon: any = await dynamicDb.Coupon.findOne({ code: couponCode, tenantId }).lean();
      if (coupon && coupon.status === 'ACTIVE') {
        if (coupon.discountType === 'FLAT') {
          discountAmount = coupon.discountValue;
        } else if (coupon.discountType === 'PERCENTAGE') {
          discountAmount = (plan.price * coupon.discountValue) / 100;
          if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discountAmount > coupon.maxDiscountValue) {
            discountAmount = coupon.maxDiscountValue;
          }
        }
        if (discountAmount > plan.price) discountAmount = plan.price;
        appliedCouponId = coupon._id || coupon.id;

        await dynamicDb.Coupon.findByIdAndUpdate(coupon._id || coupon.id, {
          $inc: { usedCount: 1 }
        });
      }
    }

    let finalPrice = plan.price - discountAmount;
    if (tenantObj.gstCalculationType === 'EXCLUSIVE') {
      finalPrice = finalPrice * 1.18;
    }

    await dynamicDb.Payment.create({
      tenantId,
      clientId: client._id || client.id,
      planId,
      amount: finalPrice,
      couponId: appliedCouponId,
      discountApplied: discountAmount,
      paymentMode: 'ONLINE_RAZORPAY',
      transactionRef: razorpay_payment_id,
      status: 'SUCCESS'
    });

    const existingSub: any = await dynamicDb.Subscription.findOne({
      clientId: client._id || client.id,
      planId,
      status: 'ACTIVE',
      endDate: { $gt: new Date() }
    }).sort({ endDate: -1 }).lean();

    let startDate = new Date();
    if (existingSub) startDate = new Date(existingSub.endDate);
    const endDate = new Date(startDate.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);

    await dynamicDb.Subscription.create({
      clientId: client._id || client.id,
      planId,
      startDate,
      endDate,
      status: 'ACTIVE'
    });

    await dynamicDb.Client.findByIdAndUpdate(client._id || client.id, {
      $set: { status: 'ACTIVE' }
    });

    return res.status(200).json({ success: true, message: 'Payment verified successfully' });

  } catch (error: any) {
    console.error('Razorpay Verify Error:', error);
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const initiateCCAvenuePayment = async (req: AuthenticatedRequest, res: Response) => {
  const { planId, couponCode } = req.body;
  try {
    const client: any = await dynamicDb.Client.findOne({ userId: req.user!.id }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    
    let tenantId = req.user?.tenantId;
    if (!tenantId && req.user?.id) {
      if (client?.tenantId) tenantId = client.tenantId;
      if (!tenantId) {
        const userDoc: any = await dynamicDb.User.findById(req.user.id).lean();
        if (userDoc?.tenantId) tenantId = userDoc.tenantId;
      }
    }

    let tenantObj: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      tenantObj = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!tenantObj && tenantId) {
      tenantObj = await dynamicDb.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId }] }).lean();
    }
    if (!tenantObj && tenantId) {
      tenantObj = await centralModels.AllCompany.findOne({ $or: [{ _id: tenantId }, { tenantId }] }).lean();
    }
    if (!tenantObj) {
      tenantObj = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }

    if (!tenantObj || !tenantObj.ccavenueMerchantId || !tenantObj.ccavenueAccessCode || !tenantObj.ccavenueWorkingKey || !tenantObj.ccavenueMerchantId.trim() || !tenantObj.ccavenueWorkingKey.trim()) {
      return res.status(400).json({ 
        success: false, 
        isConfigured: false,
        message: 'Payment gateway is not configured by the administrator. To purchase this plan, please contact the administrator.' 
      });
    }

    const kycRequired = tenantObj?.kycFirst !== false;
    const isClientKycDone = Boolean(client.kraVerified === true || client.status === 'VERIFIED' || client.status === 'APPROVED' || client.status === 'PAYMENT_PENDING');
    if (kycRequired && !isClientKycDone) {
      return res.status(403).json({
        success: false,
        requiresKyc: true,
        message: 'KYC Verification is required before purchasing a plan. Please complete your KYC verification first.'
      });
    }

    const plan: any = await dynamicDb.Plan.findById(planId).lean();
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    let finalPrice = plan.price;
    let appliedCouponId: any = null;

    if (couponCode) {
      const coupon: any = await dynamicDb.Coupon.findOne({ code: couponCode, tenantId }).lean();
      if (coupon && coupon.status === 'ACTIVE') {
        if (coupon.discountType === 'FLAT') {
          finalPrice = Math.max(0, finalPrice - coupon.discountValue);
        } else if (coupon.discountType === 'PERCENTAGE') {
          let discount = (finalPrice * coupon.discountValue) / 100;
          if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discount > coupon.maxDiscountValue) {
            discount = coupon.maxDiscountValue;
          }
          finalPrice = Math.max(0, finalPrice - discount);
        }
        appliedCouponId = coupon._id || coupon.id;
      }
    }
    
    if (tenantObj.gstCalculationType === 'EXCLUSIVE') {
      finalPrice = finalPrice * 1.18;
    }

    const orderId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
    const amount = finalPrice.toFixed(2);
    
    const origin = req.headers.origin || 'http://localhost:3000';
    const redirectUrl = `${req.protocol}://${req.get('host')}/api/v1/payment/ccavenue/response?tenantId=${tenantObj._id || tenantObj.id || tenantId}`;
    const cancelUrl = `${origin}/client`;

    let merchantData = `merchant_id=${tenantObj.ccavenueMerchantId}&order_id=${orderId}&currency=INR&amount=${amount}&redirect_url=${redirectUrl}&cancel_url=${cancelUrl}&language=EN`;
    merchantData += `&billing_name=${encodeURIComponent(client.name)}&billing_email=${encodeURIComponent(client.email)}&billing_tel=${encodeURIComponent(client.pan)}`;
    merchantData += `&merchant_param1=${client._id || client.id}&merchant_param2=${plan._id || plan.id}&merchant_param3=${appliedCouponId || ''}&merchant_param4=${origin}`;

    const encRequest = encryptCCAvenue(merchantData, tenantObj.ccavenueWorkingKey);

    return res.status(200).json({
      success: true,
      encRequest,
      accessCode: tenantObj.ccavenueAccessCode,
      url: 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction'
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const handleCCAvenueResponse = async (req: Request, res: Response) => {
  const { encResp } = req.body;
  const tenantId = req.query.tenantId as string;
  if (!encResp || !tenantId) return res.status(400).send('Invalid response');

  try {
    const tenantObj: any = await dynamicDb.Tenant.findById(tenantId).lean();
    if (!tenantObj || !tenantObj.ccavenueWorkingKey) return res.status(400).send('Tenant configuration error');

    const decryptedStr = decryptCCAvenue(encResp, tenantObj.ccavenueWorkingKey);
    const parsedData = querystring.parse(decryptedStr);
    
    const status = parsedData.order_status;
    const clientId = parsedData.merchant_param1 as string;
    const planId = parsedData.merchant_param2 as string;
    const appliedCouponId = parsedData.merchant_param3 as string;
    const origin = (parsedData.merchant_param4 as string) || 'http://localhost:3000';

    if (status === 'Success') {
      const client: any = await dynamicDb.Client.findById(clientId).lean();
      const plan: any = await dynamicDb.Plan.findById(planId).lean();
      
      if (client && plan) {
        await dynamicDb.Payment.create({
          tenantId,
          clientId,
          planId,
          amount: parseFloat(parsedData.amount as string) || 0,
          couponId: appliedCouponId || null,
          paymentMode: 'ONLINE_CCAVENUE',
          transactionRef: (parsedData.tracking_id as string) || (parsedData.order_id as string),
          status: 'SUCCESS'
        });

        const existingSub: any = await dynamicDb.Subscription.findOne({
          clientId,
          planId,
          status: 'ACTIVE',
          endDate: { $gt: new Date() }
        }).sort({ endDate: -1 }).lean();

        let startDate = new Date();
        if (existingSub) startDate = new Date(existingSub.endDate);
        const endDate = new Date(startDate.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);

        await dynamicDb.Subscription.create({
          clientId,
          planId,
          startDate,
          endDate,
          status: 'ACTIVE'
        });

        await dynamicDb.Client.findByIdAndUpdate(clientId, {
          $set: { status: 'ACTIVE' }
        });

        if (appliedCouponId) {
          await dynamicDb.Coupon.findByIdAndUpdate(appliedCouponId, {
            $inc: { usedCount: 1 }
          });
        }
      }
      return res.redirect(`${origin}/client?payment=success`);
    } else {
      return res.redirect(`${origin}/client?payment=failed`);
    }
  } catch (error: any) {
    console.error('CCAvenue Response Error', error);
    return res.status(500).send('Internal Server Error');
  }
};

export const getPaymentGatewayStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId && req.user?.id) {
      const clientDoc: any = await dynamicDb.Client.findOne({ userId: req.user.id }).lean();
      if (clientDoc?.tenantId) tenantId = clientDoc.tenantId;
      if (!tenantId) {
        const userDoc: any = await dynamicDb.User.findById(req.user.id).lean();
        if (userDoc?.tenantId) tenantId = userDoc.tenantId;
      }
    }

    let tenantObj: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      tenantObj = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!tenantObj && tenantId) {
      tenantObj = await dynamicDb.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId }] }).lean();
    }
    if (!tenantObj && tenantId) {
      tenantObj = await centralModels.AllCompany.findOne({ $or: [{ _id: tenantId }, { tenantId }] }).lean();
    }
    if (!tenantObj) {
      tenantObj = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }
    if (!tenantObj) {
      tenantObj = await centralModels.AllCompany.findOne({ deletedAt: null }).lean();
    }

    if (!tenantObj) {
      return res.status(200).json({
        success: true,
        isConfigured: false,
        activeGateway: 'RAZORPAY',
        message: 'Administrator has not configured a payment gateway. Please contact admin to buy this plan.',
        adminContact: {
          companyName: 'Advisory Administration',
          email: null,
          mobile: null,
          sebiRegistration: null,
          address: null,
          website: null,
          bankDetails: null
        }
      });
    }

    const activeGateway = (tenantObj.activePaymentGateway || 'RAZORPAY').toUpperCase();
    let isConfigured = false;

    if (activeGateway === 'RAZORPAY') {
      isConfigured = !!(tenantObj.razorpayKeyId && tenantObj.razorpayKeySecret && tenantObj.razorpayKeyId.trim() && tenantObj.razorpayKeySecret.trim());
    } else if (activeGateway === 'CCAVENUE') {
      isConfigured = !!(tenantObj.ccavenueMerchantId && tenantObj.ccavenueAccessCode && tenantObj.ccavenueWorkingKey && tenantObj.ccavenueMerchantId.trim() && tenantObj.ccavenueWorkingKey.trim());
    } else if (activeGateway === 'CASHFREE') {
      isConfigured = !!(tenantObj.cashfreeAppId && tenantObj.cashfreeSecretKey && tenantObj.cashfreeAppId.trim() && tenantObj.cashfreeSecretKey.trim());
    } else if (activeGateway === 'STRIPE') {
      isConfigured = !!(tenantObj.stripePublishableKey && tenantObj.stripeSecretKey && tenantObj.stripePublishableKey.trim() && tenantObj.stripeSecretKey.trim());
    } else {
      isConfigured = false;
    }

    const adminContact = {
      companyName: tenantObj.companyName || 'Advisory Team',
      email: tenantObj.companyEmail || tenantObj.email || null,
      mobile: tenantObj.mobile || null,
      sebiRegistration: tenantObj.sebiRegistration || null,
      address: tenantObj.address || null,
      website: tenantObj.website || null,
      bankDetails: (tenantObj.bankAccountNo && tenantObj.bankIfsc) ? {
        bankAccountName: tenantObj.bankAccountName || tenantObj.companyName,
        bankAccountNo: tenantObj.bankAccountNo,
        bankAccountType: tenantObj.bankAccountType || 'Current',
        bankIfsc: tenantObj.bankIfsc,
        bankName: tenantObj.bankName,
        bankBranch: tenantObj.bankBranch
      } : null
    };

    return res.status(200).json({
      success: true,
      isConfigured,
      activeGateway,
      adminContact,
      message: isConfigured 
        ? `Payment gateway (${activeGateway}) is ready.`
        : `Payment gateway credentials are not configured by the administrator for ${activeGateway}. Please contact administrator to purchase this plan.`
    });
  } catch (error: any) {
    console.error('Payment gateway status error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

