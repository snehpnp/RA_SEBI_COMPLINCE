import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middlewares/auth';
import { dynamicDb, centralModels, Payment, Subscription, Client, Plan, Tenant, ComplianceAlert } from '../config/db';
import { generateInvoicePdf } from '../services/invoiceGenerator';
import { sendTaxInvoiceEmail } from '../services/emailService';

/**
 * Reviews and approves or rejects an L2 payment / plan assignment request.
 */
export const handleL2PaymentAction = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    action, // 'APPROVED' | 'REJECTED'
    planId,
    amount,
    validityDays,
    discount,
    paymentDate,
    serviceStartDate,
    remarks,
    rejectionReason
  } = req.body;

  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Tenant context missing.' });
  }

  if (!['APPROVED', 'REJECTED'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVED or REJECTED.' });
  }

  try {
    const paymentModel = dynamicDb?.Payment || Payment;
    const payment: any = await paymentModel.findOne({ _id: id, tenantId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (payment.approvalStatus !== 'L2_PENDING' && payment.status === 'SUCCESS') {
      return res.status(400).json({ success: false, message: 'This payment has already been approved and activated.' });
    }

    const tenantModel = dynamicDb?.Tenant || Tenant;
    const tenantObj: any = await tenantModel.findById(tenantId).lean();

    const clientModel = dynamicDb?.Client || Client;
    const client: any = await clientModel.findById(payment.clientId).lean();
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    const userModel = dynamicDb?.User;
    const reviewer: any = userModel ? await userModel.findById(req.user?.id).lean() : null;
    const reviewerName = reviewer ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() : (req.user?.email || 'L2 Approver');

    // ─────────────────────────────────────────────────────────────
    // CASE A: REJECT ACTION
    // ─────────────────────────────────────────────────────────────
    if (action === 'REJECTED') {
      payment.status = 'REJECTED';
      payment.approvalStatus = 'REJECTED';
      payment.l2Details = {
        reviewedBy: req.user?.id,
        reviewedByName: reviewerName,
        action: 'REJECTED',
        rejectionReason: rejectionReason || remarks || 'Rejected by L2 Authority',
        reviewedAt: new Date()
      };
      await payment.save();

      return res.status(200).json({
        success: true,
        message: 'Payment request has been rejected by L2 Approver.',
        data: payment
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CASE B: APPROVE ACTION (Full modification capability)
    // ─────────────────────────────────────────────────────────────
    const selectedPlanId = planId || payment.planId;
    const planModel = dynamicDb?.Plan || Plan;
    const planDoc: any = selectedPlanId ? await planModel.findById(selectedPlanId).lean() : null;

    const finalAmount = amount !== undefined && !isNaN(Number(amount))
      ? Number(amount)
      : Number(payment.amount || planDoc?.price || 0);

    const defaultDays = planDoc?.durationMonths ? planDoc.durationMonths * 30 : 30;
    const finalValidityDays = validityDays !== undefined && !isNaN(Number(validityDays))
      ? Number(validityDays)
      : Number(payment.planValidityDays || defaultDays);

    const finalDiscount = discount !== undefined && !isNaN(Number(discount))
      ? Number(discount)
      : Number(payment.discountApplied || payment.discount || 0);

    const finalPaymentDate = paymentDate ? new Date(paymentDate) : (payment.paymentDate ? new Date(payment.paymentDate) : new Date());
    const finalServiceStartDate = serviceStartDate ? new Date(serviceStartDate) : (payment.serviceStartDate ? new Date(payment.serviceStartDate) : finalPaymentDate);

    // Strict Date Validation Rule: serviceStartDate >= paymentDate
    const pDateOnly = new Date(finalPaymentDate.getFullYear(), finalPaymentDate.getMonth(), finalPaymentDate.getDate()).getTime();
    const sDateOnly = new Date(finalServiceStartDate.getFullYear(), finalServiceStartDate.getMonth(), finalServiceStartDate.getDate()).getTime();

    if (sDateOnly < pDateOnly) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Service start date cannot be earlier than the payment date.'
      });
    }

    // Calculate subscription end date
    const endDate = new Date(finalServiceStartDate.getTime() + finalValidityDays * 24 * 60 * 60 * 1000);

    const isGstActive = tenantObj?.gstEnabled !== false;
    const isExclusive = isGstActive && tenantObj?.gstCalculationType === 'EXCLUSIVE';
    const amountTotal = finalAmount;
    const amountBase = isExclusive ? (amountTotal / 1.18) : amountTotal;
    const amountGst = amountTotal - amountBase;

    // 1. Create or Activate Subscription
    const subscriptionModel = dynamicDb?.Subscription || Subscription;
    const subscription = await subscriptionModel.create({
      clientId: client._id || client.id,
      planId: planDoc ? (planDoc._id || planDoc.id) : selectedPlanId,
      startDate: finalServiceStartDate,
      endDate,
      status: 'ACTIVE',
      amountBase: parseFloat(amountBase.toFixed(2)),
      amountGst: parseFloat(amountGst.toFixed(2)),
      amountTotal: parseFloat(amountTotal.toFixed(2)),
      isGstInclusive: isGstActive && tenantObj?.gstCalculationType === 'INCLUSIVE'
    });

    // 2. Invoice Dispatch Policy Check
    const activePolicy = tenantObj?.invoiceDispatchPolicy || 'AFTER_KYC_AGREEMENT';
    const isAgreementSigned = Boolean(client.agreementSigned);
    const isKycDone = Boolean(client.kraVerified === true || client.kycStatus === 'VERIFIED' || client.status === 'VERIFIED');

    let initialInvoiceStatus: 'GENERATED' | 'PENDING_AGREEMENT' = 'GENERATED';
    if (activePolicy === 'AFTER_KYC_AGREEMENT') {
      initialInvoiceStatus = isAgreementSigned && isKycDone ? 'GENERATED' : 'PENDING_AGREEMENT';
    }

    // 3. Update Payment record to SUCCESS & APPROVED
    payment.status = 'SUCCESS';
    payment.approvalStatus = 'APPROVED';
    payment.planId = planDoc ? (planDoc._id || planDoc.id) : selectedPlanId;
    payment.amount = finalAmount;
    payment.planValidityDays = finalValidityDays;
    payment.discountApplied = finalDiscount;
    payment.paymentDate = finalPaymentDate;
    payment.serviceStartDate = finalServiceStartDate;
    payment.invoicePolicy = activePolicy as any;
    payment.invoiceStatus = initialInvoiceStatus as any;
    payment.remarks = remarks || payment.remarks || 'Approved by L2 Authority';

    payment.l2Details = {
      reviewedBy: req.user?.id,
      reviewedByName: reviewerName,
      action: 'APPROVED',
      finalPlanId: planDoc ? (planDoc._id || planDoc.id) : selectedPlanId,
      finalAmount,
      finalValidityDays,
      finalDiscount,
      finalPaymentDate,
      finalServiceStartDate,
      remarks: remarks || 'Approved by L2 Authority',
      reviewedAt: new Date()
    };

    await payment.save();

    // 4. Update Client status if needed
    const newClientStatus = (isKycDone && isAgreementSigned) ? 'ACTIVE' : (isKycDone ? 'AGREEMENT_PENDING' : 'KYC_PENDING');
    await clientModel.findByIdAndUpdate(client._id || client.id, { $set: { status: newClientStatus } });

    // 5. Generate and send Invoice if policy conditions met
    if (initialInvoiceStatus === 'GENERATED' && client.email) {
      generateInvoicePdf(String(payment._id || payment.id))
        .then((pdfBuffer: any) => {
          return sendTaxInvoiceEmail({
            tenantId,
            toEmail: client.email,
            clientName: client.name || 'Client',
            companyName: tenantObj?.companyName,
            planName: planDoc?.name || 'Research Analyst Service',
            invoiceNumber: `INV/${new Date().getFullYear()}/${String(payment.transactionRef).slice(-6).toUpperCase()}`,
            amount: finalAmount,
            pdfBuffer
          });
        })
        .catch((pdfErr: any) => {
          console.warn('L2 Invoice PDF dispatch warning:', pdfErr?.message || pdfErr);
        });
    }

    return res.status(200).json({
      success: true,
      message: `Payment successfully approved by L2 and plan activated starting ${finalServiceStartDate.toLocaleDateString('en-IN')}.`,
      invoiceDispatched: initialInvoiceStatus === 'GENERATED',
      data: {
        payment,
        subscription
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to process L2 action.' });
  }
};
