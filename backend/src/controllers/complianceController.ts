import { Response } from 'express';
import mongoose from 'mongoose';
import dynamicDb from '../config/db';
import { calculateNextDueDate, getCompliancePeriod } from '../utils/complianceDateHelper';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { calculateCompleteness } from './adminController';
import { syncTenantToRemote, syncAllTenantsToRemote } from '../services/tenantSyncDispatcher';

export const checkComplianceForTenant = async (tenantId?: string) => {
  try {
    let tenant: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      tenant = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!tenant && tenantId) {
      tenant = await dynamicDb.Tenant.findOne({
        $or: [{ id: tenantId }, { tenantId: tenantId }]
      }).lean();
    }
    if (!tenant) {
      tenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }
    if (!tenant) return [];

    const resolvedTenantId = String(tenant._id || tenantId || '');

    // DO NOT run compliance checks for tenants that haven't finished onboarding
    const completeness = await calculateCompleteness(resolvedTenantId);
    if (!completeness || completeness.score < 100) {
      return []; // Return empty alerts, skipping all checks
    }

  const alertsCreated: any[] = [];

  const tenantUsers = await dynamicDb.User.find({ tenantId, deletedAt: null }).select('_id').lean();
  const tenantUserIds = tenantUsers.map(u => u._id);

  // 1. DEPOSIT RULE CHECK
  const activeClientsCount = await dynamicDb.Client.countDocuments({
    userId: { $in: tenantUserIds },
    status: 'ACTIVE'
  });
  
  let requiredDeposit = 100000;
  if (activeClientsCount <= 150) {
    requiredDeposit = 100000;
  } else if (activeClientsCount <= 300) {
    requiredDeposit = 200000;
  } else if (activeClientsCount <= 1000) {
    requiredDeposit = 500000;
  } else {
    requiredDeposit = 1000000;
  }

  if ((tenant.depositAmount || 0) < requiredDeposit) {
    const description = `Compliance Alert: Deposit threshold low. Required deposit is Rs. ${requiredDeposit} for ${activeClientsCount} active clients. Current actual deposit is Rs. ${tenant.depositAmount || 0}. Please submit deposit proof.`;
    const existingAlert = await dynamicDb.ComplianceAlert.findOne({
      tenantId,
      alertType: 'DEPOSIT_LOW',
      status: 'OPEN'
    }).lean();

    if (!existingAlert) {
      const newAlert = await dynamicDb.ComplianceAlert.create({
        tenantId,
        alertType: 'DEPOSIT_LOW',
        severity: 'HIGH',
        description
      });
      alertsCreated.push(newAlert.toObject());
    }
  }

  // 1B. PART-TIME RA LIMIT CHECK
  if (tenant.raType === 'PART_TIME') {
    const isOverLimit = activeClientsCount > 75;
    
    // Find the latest penalty alert to check status
    const latestPenaltyAlert = await dynamicDb.ComplianceAlert.findOne({
      tenantId,
      alertType: 'PART_TIME_LIMIT_EXCEEDED'
    }).sort({ createdAt: -1 }).lean();

    if (isOverLimit) {
      // Create new penalty only if no alert exists, or it's CLOSED, or it was OPEN but marked as DROPPED
      const needsNewPenalty = !latestPenaltyAlert || 
                              latestPenaltyAlert.status === 'CLOSED' || 
                              (latestPenaltyAlert.remarks || '').includes('[COUNT_DROPPED]');

      if (needsNewPenalty) {
        const description = `Code of Conduct Violation: Part-time RA active clients limit (75) exceeded. Current active clients: ${activeClientsCount}. You must apply for a Full-Time RA or reduce clients to avoid further penalties.`;
        const newAlert = await dynamicDb.ComplianceAlert.create({
          tenantId,
          alertType: 'PART_TIME_LIMIT_EXCEEDED',
          severity: 'HIGH',
          description
        });
        alertsCreated.push(newAlert.toObject());
        
        // Find requirement for Part-time limit (usually serialNo: 12)
        const requirement = await dynamicDb.ComplianceRequirement.findOne({
          serialNo: 12
        }).lean();

        if (requirement) {
          const audit = await dynamicDb.ComplianceAudit.create({
            tenantId,
            requirementId: requirement._id,
            status: 'NON_COMPLIANT',
            officerRemarks: 'System auto-generated penalty: Part-time RA client limit exceeded.'
          });

          await dynamicDb.Penalty.create({
            tenantId,
            auditId: audit._id,
            amount: 10000,
            reason: 'Code of Conduct Violation: Part-time RA client limit exceeded.',
            status: 'PENDING_PAYMENT'
          });
        }
      }
    } else {
      // activeClientsCount <= 75
      // If there's an OPEN alert and it hasn't been marked yet, mark it as DROPPED.
      if (latestPenaltyAlert && latestPenaltyAlert.status === 'OPEN' && !(latestPenaltyAlert.remarks || '').includes('[COUNT_DROPPED]')) {
        await dynamicDb.ComplianceAlert.findByIdAndUpdate(latestPenaltyAlert._id, {
          $set: { remarks: ((latestPenaltyAlert.remarks || '') + ' [COUNT_DROPPED]').trim() }
        });
      }
    }
  }

  // 2. SEBI CERTIFICATE EXPIRY CHECK (90-day warning)
  if (tenant.certificateValidity) {
    const certDate = new Date(tenant.certificateValidity);
    const daysLeft = Math.ceil((certDate.getTime() - Date.now()) / (1000 * 3600 * 24));
    if (daysLeft <= 90) {
      const description = `SEBI Certificate validity expires in ${daysLeft} days (valid until: ${certDate.toDateString()}).`;
      const severity = daysLeft <= 15 ? 'HIGH' : 'MEDIUM';
      const existingAlert = await dynamicDb.ComplianceAlert.findOne({
        tenantId,
        alertType: 'CERTIFICATE_EXPIRY',
        status: 'OPEN'
      }).lean();

      if (!existingAlert) {
        const newAlert = await dynamicDb.ComplianceAlert.create({
          tenantId,
          alertType: 'CERTIFICATE_EXPIRY',
          severity,
          description
        });
        alertsCreated.push(newAlert.toObject());
      } else {
        const updated = await dynamicDb.ComplianceAlert.findByIdAndUpdate(
          existingAlert._id,
          { $set: { severity, description } },
          { returnDocument: 'after', lean: true }
        );
        alertsCreated.push(updated);
      }
    }
  }

  // 3. NISM STAFF EXPIRY CHECK (90-day warning, severity levels: LOW/MEDIUM/HIGH)
  const rawStaffMembers = await dynamicDb.Staff.find({
    userId: { $in: tenantUserIds },
    status: 'ACTIVE'
  })
    .populate({
      path: 'userId',
      populate: { path: 'role' }
    })
    .lean();

  const staffMembers = rawStaffMembers.filter((st: any) => st.userId && !st.userId.deletedAt);

  for (const staff of staffMembers) {
    if (staff.nismValidity) {
      const nismDate = new Date(staff.nismValidity);
      const daysLeft = Math.ceil((nismDate.getTime() - Date.now()) / (1000 * 3600 * 24));
      
      const existingAlert = await dynamicDb.ComplianceAlert.findOne({
        tenantId,
        alertType: 'NISM_EXPIRY',
        status: 'OPEN',
        description: { $regex: `Staff "${staff.name}"`, $options: 'i' }
      }).lean();

      if (daysLeft <= 90) {
        const formattedExpiryDate = nismDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const description = `NISM Certificate of Staff "${staff.name}" (Expiry Date: ${formattedExpiryDate}) expires in ${daysLeft} day(s). Please renew before expiry.`;
        
        let severity = 'LOW';
        if (daysLeft <= 30) {
          severity = 'HIGH';
        } else if (daysLeft <= 60) {
          severity = 'MEDIUM';
        }

        if (existingAlert) {
          if (existingAlert.description !== description || existingAlert.severity !== severity) {
            await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingAlert._id, {
              $set: { description, severity }
            });
          }
        } else {
          const newAlert = await dynamicDb.ComplianceAlert.create({
            tenantId,
            alertType: 'NISM_EXPIRY',
            severity,
            description
          });
          alertsCreated.push(newAlert.toObject());
        }
      } else {
        if (existingAlert) {
          await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingAlert._id, {
            $set: {
              status: 'CLOSED',
              remarks: 'NISM Certificate validity updated/renewed.',
              closedAt: new Date()
            }
          });
        }
      }
    }
  }

  // Clean up alerts for staff members who are no longer active or present
  const openNismAlerts = await dynamicDb.ComplianceAlert.find({
    tenantId,
    alertType: 'NISM_EXPIRY',
    status: 'OPEN'
  }).lean();

  for (const alert of openNismAlerts) {
    const matchesActiveStaff = staffMembers.some((st: any) => alert.description.includes(`Staff "${st.name}"`));
    if (!matchesActiveStaff) {
      await dynamicDb.ComplianceAlert.findByIdAndUpdate(alert._id, {
        $set: {
          status: 'CLOSED',
          remarks: 'Staff member is no longer active or has been removed.',
          closedAt: new Date()
        }
      });
    }
  }

  // 4. MISSING KYC / AGREEMENT CHECK for active subscribers
  const rawClientsWithSubscriptions = await dynamicDb.Client.find({
    userId: { $in: tenantUserIds }
  })
    .populate('agreements')
    .populate('subscriptions')
    .populate('userId')
    .lean();

  const clientsWithSubscriptions = rawClientsWithSubscriptions.filter((c: any) => {
    const hasActiveSub = (c.subscriptions || []).some((s: any) => s.status === 'ACTIVE');
    return hasActiveSub && c.userId && !c.userId.deletedAt;
  });

  for (const clientItem of clientsWithSubscriptions) {
    const client: any = clientItem;
    const clientId = client._id;
    // 4a. KYC Check
    const isKycPending = ['PENDING_ONBOARDING', 'KYC_PENDING', 'KYC_FAILED'].includes(client.status);
    const kycDescription = `Client "${client.name}" (PAN: ${client.pan || 'N/A'}) has an active subscription but incomplete KYC (Status: ${client.status}).`;
    const existingKycAlert = await dynamicDb.ComplianceAlert.findOne({
      tenantId,
      alertType: 'KYC_MISSING',
      status: 'OPEN',
      clientId
    }).lean();
    
    if (isKycPending) {
      if (!existingKycAlert) {
        const newAlert = await dynamicDb.ComplianceAlert.create({
          tenantId,
          alertType: 'KYC_MISSING',
          severity: 'MEDIUM',
          description: kycDescription,
          clientId
        });
        alertsCreated.push(newAlert.toObject());
      }
    } else {
      if (existingKycAlert) {
        await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingKycAlert._id, {
          $set: {
            status: 'CLOSED',
            remarks: 'Daily auto-sweep: resolved as client completed KYC.',
            closedAt: new Date()
          }
        });
      }
    }

    // 4b. Agreement Check
    const hasAgreements = Array.isArray(client.agreements) && client.agreements.length > 0;
    if (!hasAgreements) {
      const aggDescription = `Client "${client.name}" (PAN: ${client.pan || 'N/A'}) has an active subscription but no signed agreement.`;
      const existingAggAlert = await dynamicDb.ComplianceAlert.findOne({
        tenantId,
        alertType: 'AGREEMENT_MISSING',
        status: 'OPEN',
        description: aggDescription
      }).lean();

      if (!existingAggAlert) {
        const newAlert = await dynamicDb.ComplianceAlert.create({
          tenantId,
          alertType: 'AGREEMENT_MISSING',
          severity: 'HIGH',
          description: aggDescription,
          clientId
        });
        alertsCreated.push(newAlert.toObject());
      }
    }
  }

  // 4c. AUTO-CLOSE RESOLVED KYC/AGREEMENT ALERTS
  // For agreements
  const openAgreementAlerts = await dynamicDb.ComplianceAlert.find({
    tenantId,
    alertType: 'AGREEMENT_MISSING',
    status: 'OPEN'
  }).lean();

  for (const alert of openAgreementAlerts) {
    if (alert.clientId) {
      const client: any = await dynamicDb.Client.findById(alert.clientId)
        .populate('agreements')
        .populate('subscriptions')
        .lean();

      if (client) {
        const isKycComplete = !['PENDING_ONBOARDING', 'KYC_PENDING', 'KYC_FAILED'].includes(client.status);
        const isAgreementComplete = Array.isArray(client.agreements) && client.agreements.length > 0;
        const hasActiveSub = (client.subscriptions || []).some((s: any) => s.status === 'ACTIVE');
        if ((isKycComplete && isAgreementComplete) || !hasActiveSub) {
          await dynamicDb.ComplianceAlert.findByIdAndUpdate(alert._id, {
            $set: {
              status: 'CLOSED',
              remarks: 'Daily auto-sweep: resolved or subscription ended.',
              closedAt: new Date()
            }
          });
        }
      }
    }
  }

  // For KYC
  const openKycAlerts = await dynamicDb.ComplianceAlert.find({
    tenantId,
    alertType: 'KYC_MISSING',
    status: 'OPEN'
  }).lean();

  for (const alert of openKycAlerts) {
    if (alert.clientId) {
      const client: any = await dynamicDb.Client.findById(alert.clientId)
        .populate('subscriptions')
        .lean();

      if (client) {
        const isKycComplete = !['PENDING_ONBOARDING', 'KYC_PENDING', 'KYC_FAILED'].includes(client.status);
        const hasActiveSub = (client.subscriptions || []).some((s: any) => s.status === 'ACTIVE');
        if (isKycComplete || !hasActiveSub) {
          await dynamicDb.ComplianceAlert.findByIdAndUpdate(alert._id, {
            $set: {
              status: 'CLOSED',
              remarks: 'Resolved or client no longer has active subscription.',
              closedAt: new Date()
            }
          });
        }
      }
    }
  }

  // 5. SEBI FEE FRAMEWORK CHECK (SR.17) — Max ₹1,51,000 incl. GST per client per financial year
  const today = new Date();
  const fyStart = today.getMonth() >= 3
    ? new Date(today.getFullYear(), 3, 1)
    : new Date(today.getFullYear() - 1, 3, 1);
  const fyEnd = new Date(fyStart.getFullYear() + 1, 2, 31, 23, 59, 59);

  const SEBI_FEE_CAP = 151000;

  const rawAllTenantClients = await dynamicDb.Client.find({
    userId: { $in: tenantUserIds }
  }).populate('userId').lean();

  const allTenantClients = rawAllTenantClients.filter((c: any) => c.userId && !c.userId.deletedAt);

  for (const client of allTenantClients) {
    const clientId = client._id;
    const clientPayments = await dynamicDb.Payment.find({
      tenantId,
      clientId,
      status: 'SUCCESS',
      createdAt: { $gte: fyStart, $lte: fyEnd }
    }).select('amount').lean();

    const totalPaidFY = clientPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const existingFeeAlert = await dynamicDb.ComplianceAlert.findOne({
      tenantId,
      alertType: 'SEBI_FEE_EXCEEDED',
      status: 'OPEN',
      clientId
    }).lean();

    if (totalPaidFY > SEBI_FEE_CAP) {
      const excessAmount = totalPaidFY - SEBI_FEE_CAP;
      const description = `SEBI Fee Cap Violation (SR.17): Client "${client.name}" (PAN: ${client.pan || 'N/A'}) has been charged ₹${totalPaidFY.toLocaleString('en-IN')} (incl. GST) in FY ${fyStart.getFullYear()}-${fyEnd.getFullYear()} — exceeds the SEBI limit of ₹1,51,000 by ₹${excessAmount.toLocaleString('en-IN')}. Refund or rectify immediately.`;

      if (!existingFeeAlert) {
        const newAlert = await dynamicDb.ComplianceAlert.create({
          tenantId,
          alertType: 'SEBI_FEE_EXCEEDED',
          severity: 'HIGH',
          description,
          clientId
        });
        alertsCreated.push(newAlert.toObject());

        // Auto-penalty for SR.17 violation — ₹10,000 per violation
        const feeRequirement = await dynamicDb.ComplianceRequirement.findOne({
          serialNo: 17
        }).lean();

        if (feeRequirement) {
          const feeAudit = await dynamicDb.ComplianceAudit.create({
            tenantId,
            requirementId: feeRequirement._id,
            status: 'NON_COMPLIANT',
            officerRemarks: `System auto-generated: SEBI fee cap exceeded for client "${client.name}". Total charged: ₹${totalPaidFY.toLocaleString('en-IN')}`
          });

          await dynamicDb.Penalty.create({
            tenantId,
            auditId: feeAudit._id,
            amount: 10000,
            reason: `SEBI Fee Framework Violation (SR.17): Client "${client.name}" charged ₹${totalPaidFY.toLocaleString('en-IN')} incl. GST — exceeds ₹1,51,000 annual cap.`,
            status: 'PENDING_PAYMENT'
          });
        }
      } else {
        if (existingFeeAlert.description !== description) {
          await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingFeeAlert._id, {
            $set: { description }
          });
        }
      }
    } else {
      if (existingFeeAlert) {
        await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingFeeAlert._id, {
          $set: {
            status: 'CLOSED',
            remarks: `Auto-resolved: Client "${client.name}" total FY payment ₹${totalPaidFY.toLocaleString('en-IN')} is now within ₹1,51,000 cap.`,
            closedAt: new Date()
          }
        });
      }
    }
  }

  // 5B. PAN COLLECTION FOR SEGREGATION CHECK (SR.48)
  const KYC_COMPLETE_STATUSES = ['AGREEMENT_PENDING', 'PAYMENT_PENDING', 'ACTIVE', 'INACTIVE'];

  const rawClientsWithActivePlans = await dynamicDb.Client.find({
    userId: { $in: tenantUserIds },
    status: { $in: KYC_COMPLETE_STATUSES }
  })
    .populate('subscriptions')
    .populate('userId')
    .lean();

  const clientsWithActivePlans = rawClientsWithActivePlans.filter((c: any) => {
    const hasActiveSub = (c.subscriptions || []).some((s: any) => s.status === 'ACTIVE');
    return hasActiveSub && c.userId && !c.userId.deletedAt;
  });

  for (const client of clientsWithActivePlans) {
    const isPanMissing = !client.pan || client.pan.trim() === '';
    const clientId = client._id;

    const existingPanAlert = await dynamicDb.ComplianceAlert.findOne({
      tenantId,
      alertType: 'PAN_MISSING',
      status: 'OPEN',
      clientId
    }).lean();

    if (isPanMissing) {
      const description = `PAN Collection Violation (SR.48): Client "${client.name}" has an active subscription and completed KYC, but PAN details are missing. PAN is mandatory for family/dependent segregation compliance under SEBI regulations.`;

      if (!existingPanAlert) {
        const newPanAlert = await dynamicDb.ComplianceAlert.create({
          tenantId,
          alertType: 'PAN_MISSING',
          severity: 'HIGH',
          description,
          clientId
        });
        alertsCreated.push(newPanAlert.toObject());

        const panRequirement = await dynamicDb.ComplianceRequirement.findOne({ serialNo: 48 }).lean();
        if (panRequirement) {
          const panAudit = await dynamicDb.ComplianceAudit.create({
            tenantId,
            requirementId: panRequirement._id,
            status: 'NON_COMPLIANT',
            officerRemarks: `System auto-generated: PAN missing for client "${client.name}" with active subscription and completed KYC.`
          });

          await dynamicDb.Penalty.create({
            tenantId,
            auditId: panAudit._id,
            amount: 5000,
            reason: `PAN Collection Violation (SR.48): Client "${client.name}" — active subscription + KYC complete but PAN missing.`,
            status: 'PENDING_PAYMENT'
          });
        }
      }
    } else {
      if (existingPanAlert) {
        await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingPanAlert._id, {
          $set: {
            status: 'CLOSED',
            remarks: `Auto-resolved: PAN "${client.pan}" collected for client "${client.name}".`,
            closedAt: new Date()
          }
        });
      }
    }
  }

  // 5C. MISSING PRINCIPAL OFFICER CHECK (SR.7)
  const hasPrincipalOfficer = staffMembers.some((st: any) => {
    const role = st.userId?.role || {};
    return role.name === 'PRINCIPAL_OFFICER';
  });

  const existingPoAlert = await dynamicDb.ComplianceAlert.findOne({
    tenantId,
    alertType: 'MISSING_PRINCIPAL_OFFICER',
    status: 'OPEN'
  }).lean();

  if (!hasPrincipalOfficer) {
    if (!existingPoAlert) {
      const description = `Compliance Alert: No Principal Officer found. Please designate a Principal Officer within 10 days to avoid a penalty.`;
      const newAlert = await dynamicDb.ComplianceAlert.create({
        tenantId,
        alertType: 'MISSING_PRINCIPAL_OFFICER',
        severity: 'MEDIUM',
        description
      });
      alertsCreated.push(newAlert.toObject());
    } else {
      const ageInDays = (Date.now() - new Date(existingPoAlert.createdAt).getTime()) / (1000 * 3600 * 24);
      
      if (ageInDays >= 7 && ageInDays < 10 && existingPoAlert.severity !== 'HIGH') {
        await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingPoAlert._id, {
          $set: {
            severity: 'HIGH',
            description: 'CRITICAL: No Principal Officer found. Appoint within 3 days to avoid a ₹5,000 penalty.'
          }
        });
      } else if (ageInDays >= 10) {
        const poReq = await dynamicDb.ComplianceRequirement.findOne({ serialNo: 7 }).lean();
        if (poReq) {
          const existingAudit = await dynamicDb.ComplianceAudit.findOne({ 
            tenantId,
            requirementId: poReq._id,
            status: 'NON_COMPLIANT'
          }).lean();

          if (!existingAudit) {
            const penaltyDesc = `Compliance Violation (SR.7): No Principal Officer found after 10-day grace period. Designation is mandatory.`;
            const poAudit = await dynamicDb.ComplianceAudit.create({
              tenantId,
              requirementId: poReq._id,
              status: 'NON_COMPLIANT',
              officerRemarks: 'System auto-generated: No Principal Officer designated after grace period.'
            });
            await dynamicDb.Penalty.create({
              tenantId,
              auditId: poAudit._id,
              amount: 5000,
              reason: penaltyDesc,
              status: 'PENDING_PAYMENT'
            });
            await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingPoAlert._id, {
              $set: { description: penaltyDesc }
            });
          }
        }
      }
    }
  } else if (existingPoAlert) {
    await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingPoAlert._id, {
      $set: {
        status: 'CLOSED',
        remarks: 'Auto-resolved: Principal Officer is now designated.',
        closedAt: new Date()
      }
    });

    const poReq = await dynamicDb.ComplianceRequirement.findOne({ serialNo: 7 }).lean();
    if (poReq) {
      await dynamicDb.ComplianceAudit.updateMany(
        { tenantId, requirementId: poReq._id, status: { $in: ['NON_COMPLIANT', 'PENDING', 'OVERDUE'] } },
        { $set: { status: 'COMPLIANT', resolvedAt: new Date(), officerRemarks: 'Auto-resolved: Principal Officer designated.' } }
      );
      const poAudit = await dynamicDb.ComplianceAudit.findOne({ tenantId, requirementId: poReq._id }).sort({ updatedAt: -1 }).lean();
      if (poAudit) {
        await dynamicDb.Penalty.updateMany(
          { auditId: poAudit._id, status: 'PENDING_PAYMENT' },
          { $set: { status: 'WAIVED', remarks: 'Auto-waived: PO added' } }
        );
      }
    }
  }

  // 5D. MISSING COMPLIANCE OFFICER CHECK (SR.8)
  const hasComplianceOfficer = staffMembers.some((st: any) => {
    const role = st.userId?.role || {};
    return role.name === 'COMPLIANCE_OFFICER';
  });

  const existingCoAlert = await dynamicDb.ComplianceAlert.findOne({
    tenantId,
    alertType: 'MISSING_COMPLIANCE_OFFICER',
    status: 'OPEN'
  }).lean();

  if (!hasComplianceOfficer) {
    if (!existingCoAlert) {
      const description = `Compliance Alert: No Compliance Officer found. Please designate a Compliance Officer within 10 days to avoid a penalty.`;
      const newAlert = await dynamicDb.ComplianceAlert.create({
        tenantId,
        alertType: 'MISSING_COMPLIANCE_OFFICER',
        severity: 'MEDIUM',
        description
      });
      alertsCreated.push(newAlert.toObject());
    } else {
      const ageInDays = (Date.now() - new Date(existingCoAlert.createdAt).getTime()) / (1000 * 3600 * 24);
      
      if (ageInDays >= 7 && ageInDays < 10 && existingCoAlert.severity !== 'HIGH') {
        await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingCoAlert._id, {
          $set: {
            severity: 'HIGH',
            description: 'CRITICAL: No Compliance Officer found. Appoint within 3 days to avoid a ₹20,000 penalty.'
          }
        });
      } else if (ageInDays >= 10) {
        const coReq = await dynamicDb.ComplianceRequirement.findOne({ serialNo: 8 }).lean();
        if (coReq) {
          const existingAudit = await dynamicDb.ComplianceAudit.findOne({ 
            tenantId,
            requirementId: coReq._id,
            status: 'NON_COMPLIANT'
          }).lean();

          if (!existingAudit) {
            const penaltyDesc = `Compliance Violation (SR.8): No Compliance Officer found after 10-day grace period. Appointment is mandatory.`;
            const coAudit = await dynamicDb.ComplianceAudit.create({
              tenantId,
              requirementId: coReq._id,
              status: 'NON_COMPLIANT',
              officerRemarks: 'System auto-generated: No Compliance Officer designated after grace period.'
            });
            await dynamicDb.Penalty.create({
              tenantId,
              auditId: coAudit._id,
              amount: 20000,
              reason: penaltyDesc,
              status: 'PENDING_PAYMENT'
            });
            await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingCoAlert._id, {
              $set: { description: penaltyDesc }
            });
          }
        }
      }
    }
  } else if (existingCoAlert) {
    await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingCoAlert._id, {
      $set: {
        status: 'CLOSED',
        remarks: 'Auto-resolved: Compliance Officer is now designated.',
        closedAt: new Date()
      }
    });

    const coReq = await dynamicDb.ComplianceRequirement.findOne({ serialNo: 8 }).lean();
    if (coReq) {
      await dynamicDb.ComplianceAudit.updateMany(
        { tenantId, requirementId: coReq._id, status: { $in: ['NON_COMPLIANT', 'PENDING', 'OVERDUE'] } },
        { $set: { status: 'COMPLIANT', resolvedAt: new Date(), officerRemarks: 'Auto-resolved: Compliance Officer designated.' } }
      );
      const coAudit = await dynamicDb.ComplianceAudit.findOne({ tenantId, requirementId: coReq._id }).sort({ updatedAt: -1 }).lean();
      if (coAudit) {
        await dynamicDb.Penalty.updateMany(
          { auditId: coAudit._id, status: 'PENDING_PAYMENT' },
          { $set: { status: 'WAIVED', remarks: 'Auto-waived: CO added' } }
        );
      }
    }
  }

  // 5E. INTERNAL POLICIES URL MISSING (SR.11)
  const isPolicyMissing = !tenant.internalPolicyUrl || tenant.internalPolicyUrl.trim() === '';
  const existingPolicyAlert = await dynamicDb.ComplianceAlert.findOne({
    tenantId,
    alertType: 'MISSING_INTERNAL_POLICY',
    status: 'OPEN'
  }).lean();

  if (isPolicyMissing) {
    if (!existingPolicyAlert) {
      const description = `Compliance Violation (SR.11): Written internal policies and controls are missing. Please upload/provide the Internal Policy URL in Settings.`;
      const newAlert = await dynamicDb.ComplianceAlert.create({
        tenantId,
        alertType: 'MISSING_INTERNAL_POLICY',
        severity: 'MEDIUM',
        description
      });
      alertsCreated.push(newAlert.toObject());
    }
  } else if (existingPolicyAlert) {
    await dynamicDb.ComplianceAlert.findByIdAndUpdate(existingPolicyAlert._id, {
      $set: {
        status: 'CLOSED',
        remarks: 'Auto-resolved: Internal policy provided.',
        closedAt: new Date()
      }
    });
  }

  // 5F. COMPLAINT RESOLUTION TIMELINE (SR.28)
  const overdueComplaints = await dynamicDb.Complaint.find({
    tenantId,
    status: 'OPEN',
    receivedAt: { $lte: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) }
  }).lean();

  for (const complaint of overdueComplaints) {
    const complaintIdStr = complaint._id.toString();
    const description = `Compliance Violation (SR.28): Complaint (${complaint.subject}) is unresolved for over 21 days. Penalty of ₹100 per complaint applies.`;
    const existingOverdueComplaintAlert = await dynamicDb.ComplianceAlert.findOne({
      tenantId,
      alertType: 'COMPLAINT_OVERDUE',
      status: 'OPEN',
      description: { $regex: complaintIdStr, $options: 'i' }
    }).lean();

    if (!existingOverdueComplaintAlert) {
      const newAlert = await dynamicDb.ComplianceAlert.create({
        tenantId,
        alertType: 'COMPLAINT_OVERDUE',
        severity: 'HIGH',
        description: `${description} [Ref: ${complaintIdStr}]`
      });
      alertsCreated.push(newAlert.toObject());

      const overdueReq = await dynamicDb.ComplianceRequirement.findOne({ serialNo: 28 }).lean();
      if (overdueReq) {
        const audit = await dynamicDb.ComplianceAudit.create({
          tenantId,
          requirementId: overdueReq._id,
          status: 'NON_COMPLIANT',
          officerRemarks: `System auto-generated: Complaint ${complaintIdStr} unresolved > 21 days.`
        });
        await dynamicDb.Penalty.create({
          tenantId,
          auditId: audit._id,
          amount: 100,
          reason: `Complaint resolution timeline exceeded for complaint ${complaintIdStr}`,
          status: 'PENDING_PAYMENT'
        });
      }
    }
  }

  // 6. PREEMPTIVE COMPLIANCE AUDIT GENERATION & OVERDUE STATUS MANAGEMENT
  const activeRules = await dynamicDb.ComplianceRequirement.find({ isActive: true }).lean();
  const now = new Date();

  for (const rule of activeRules) {
    const initialNextDueDate = calculateNextDueDate(rule.frequencyType, rule.serialNo, new Date(), tenant.createdAt);
    if (!initialNextDueDate) continue;

    let latestAudit: any = await dynamicDb.ComplianceAudit.findOne({
      tenantId,
      requirementId: rule._id
    }).sort({ dueDate: -1 }).lean();

    if (!latestAudit) {
      const created = await dynamicDb.ComplianceAudit.create({
        tenantId,
        requirementId: rule._id,
        status: 'PENDING',
        dueDate: initialNextDueDate
      });
      latestAudit = created.toObject();
    }

    let keepCatchingUp = true;
    while (keepCatchingUp) {
      const latestDueDate = latestAudit.dueDate ? new Date(latestAudit.dueDate) : null;
      if (!latestDueDate || latestDueDate.getTime() >= now.getTime()) {
        keepCatchingUp = false;

        if (latestAudit.status === 'COMPLIANT' || latestAudit.status === 'PENALTY_RESOLVED' || latestAudit.status === 'PENALIZED') {
          if (latestDueDate) {
            const nextRefDate = new Date(latestDueDate.getTime() + 24 * 60 * 60 * 1000);
            const nextDueDate = calculateNextDueDate(rule.frequencyType, rule.serialNo, nextRefDate);
            if (nextDueDate && nextDueDate.getTime() > latestDueDate.getTime()) {
              const existingNext = await dynamicDb.ComplianceAudit.findOne({
                tenantId,
                requirementId: rule._id,
                dueDate: nextDueDate
              }).lean();

              if (!existingNext) {
                await dynamicDb.ComplianceAudit.create({
                  tenantId,
                  requirementId: rule._id,
                  status: 'PENDING',
                  dueDate: nextDueDate
                });
              }
            }
          }
        }
        break;
      }

      // Past due
      if (latestAudit.status === 'PENDING') {
        latestAudit = await dynamicDb.ComplianceAudit.findByIdAndUpdate(
          latestAudit._id,
          { $set: { status: 'OVERDUE' } },
          { returnDocument: 'after', lean: true }
        );

        if (rule.penaltyAmount) {
          const amountMatch = rule.penaltyAmount.replace(/,/g, '').match(/\d+/);
          const penaltyAmt = amountMatch ? parseFloat(amountMatch[0]) : 5000.0;

          const existingPenalty = await dynamicDb.Penalty.findOne({
            auditId: latestAudit._id
          }).lean();

          if (!existingPenalty) {
            await dynamicDb.Penalty.create({
              tenantId,
              auditId: latestAudit._id,
              amount: penaltyAmt,
              reason: `Overdue compliance: ${rule.requirement}`,
              status: 'PENDING_PAYMENT'
            });
          }
        }
      }

      const nextRefDate = new Date(latestDueDate.getTime() + 24 * 60 * 60 * 1000);
      const nextDueDate = calculateNextDueDate(rule.frequencyType, rule.serialNo, nextRefDate);

      if (!nextDueDate || nextDueDate.getTime() <= latestDueDate.getTime()) {
        keepCatchingUp = false;
        break;
      }

      const existingNext = await dynamicDb.ComplianceAudit.findOne({
        tenantId,
        requirementId: rule._id,
        dueDate: nextDueDate
      }).lean();

      if (existingNext) {
        latestAudit = existingNext;
      } else {
        const created = await dynamicDb.ComplianceAudit.create({
          tenantId,
          requirementId: rule._id,
          status: 'PENDING',
          dueDate: nextDueDate
        });
        latestAudit = created.toObject();
      }
    }
  }

  return alertsCreated;
} catch (err: any) {
  console.error('checkComplianceForTenant error:', err?.message);
  return [];
}
};

export const runComplianceCheck = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let tenantId = req.user!.tenantId;
    
    if (!tenantId && req.user!.role === 'SUPER_ADMIN') {
      const queryTenant = req.query.tenantId as string;
      if (queryTenant) {
        const alertsCreated = await checkComplianceForTenant(queryTenant);
        syncTenantToRemote(queryTenant, { reason: 'COMPLIANCE_SWEEP' }).catch(() => {});
        return res.status(200).json({
          success: true,
          message: 'Compliance verification completed successfully.',
          alertsGenerated: alertsCreated.length,
          data: alertsCreated
        });
      } else {
        const tenants = await dynamicDb.Tenant.find({ deletedAt: null }).lean();
        let totalAlerts = 0;
        for (const t of tenants) {
          const alerts = await checkComplianceForTenant(t._id.toString());
          totalAlerts += alerts.length;
        }
        syncAllTenantsToRemote({ reason: 'COMPLIANCE_SWEEP' }).catch(() => {});
        return res.status(200).json({
          success: true,
          message: 'Compliance verification completed for all companies.',
          alertsGenerated: totalAlerts
        });
      }
    }

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }

    const alertsCreated = await checkComplianceForTenant(tenantId);
    syncTenantToRemote(tenantId, { reason: 'COMPLIANCE_SWEEP' }).catch(() => {});
    return res.status(200).json({
      success: true,
      message: 'Compliance verification completed successfully.',
      alertsGenerated: alertsCreated.length,
      data: alertsCreated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getAlerts = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  try {
    const alerts = await dynamicDb.ComplianceAlert.find({ tenantId })
      .sort({ createdAt: -1 })
      .lean();
    
    const alertsWithPenalty = await Promise.all(alerts.map(async (alert: any) => {
      if (alert.alertType === 'PENALTY_LEVIED' && alert.remarks) {
        const match = alert.remarks.match(/Associated with Audit ID:\s*([a-f0-9\-]+)/i);
        if (match && match[1]) {
          const auditId = match[1].trim();
          const penalty = await dynamicDb.Penalty.findOne({
            auditId
          }).lean();
          if (penalty) {
            return {
              ...alert,
              id: alert._id?.toString() || alert.id,
              penaltyId: penalty._id?.toString() || penalty.id
            };
          }
        }
      }
      return {
        ...alert,
        id: alert._id?.toString() || alert.id
      };
    }));

    return res.status(200).json({ success: true, data: alertsWithPenalty });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const closeAlert = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { remarks, actualDepositAmount } = req.body;
  const proofUrl = req.file ? `/uploads/compliance/${req.file.filename}` : undefined;
  try {
    const alert = await dynamicDb.ComplianceAlert.findById(id).lean();
    if (!alert) return res.status(404).json({ success: false, message: 'Compliance alert not found.' });

    // Validate if client's KYC/Agreement/PAN is complete for DB-backed alerts
    if (alert.alertType === 'AGREEMENT_MISSING' || alert.alertType === 'KYC_MISSING' || alert.alertType === 'KYC_FAILED' || alert.alertType === 'PAN_MISSING') {
      if (!alert.clientId) {
        return res.status(400).json({ success: false, message: 'This alert is not linked to a valid client ID.' });
      }
      const client: any = await dynamicDb.Client.findById(alert.clientId)
        .populate('agreements')
        .lean();
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client associated with this alert not found.' });
      }
      const isKycComplete = !['PENDING_ONBOARDING', 'KYC_PENDING', 'KYC_FAILED'].includes(client.status);
      const isAgreementComplete = Array.isArray(client.agreements) && client.agreements.length > 0;
      const isPanComplete = !!(client.pan && client.pan.trim() !== '');

      if (alert.alertType === 'AGREEMENT_MISSING') {
        if (!isKycComplete || !isAgreementComplete) {
          let errorMsg = 'Cannot resolve alert: ';
          if (!isKycComplete && !isAgreementComplete) {
            errorMsg += "Client's KYC and signed agreement are both incomplete.";
          } else if (!isKycComplete) {
            errorMsg += "Client's KYC verification is incomplete.";
          } else {
            errorMsg += "Client's Service Agreement has not been signed.";
          }
          return res.status(400).json({ success: false, message: errorMsg });
        }
      } else if (alert.alertType === 'KYC_MISSING' || alert.alertType === 'KYC_FAILED') {
        if (!isKycComplete) {
          return res.status(400).json({ success: false, message: "Cannot resolve alert: Client's KYC verification is incomplete." });
        }
      } else if (alert.alertType === 'PAN_MISSING') {
        if (!isPanComplete) {
          return res.status(400).json({ success: false, message: "Cannot resolve alert: Client's PAN details are missing." });
        }
      }
    }

    if (alert.alertType === 'DEPOSIT_LOW' && actualDepositAmount) {
      await dynamicDb.Tenant.findByIdAndUpdate(alert.tenantId, {
        $inc: { depositAmount: parseFloat(actualDepositAmount) }
      });
    }
    
    const updatedAlert = await dynamicDb.ComplianceAlert.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'CLOSED',
          remarks,
          proofUrl,
          closedAt: new Date()
        }
      },
      { returnDocument: 'after', lean: true }
    );

    if (alert.alertType === 'DEADLINE_UPCOMING') {
      const requirements = await dynamicDb.ComplianceRequirement.find().lean();
      const matchedReq = requirements.find((r: any) => alert.description.includes(r.requirement));
      if (matchedReq) {
        const tenant = await dynamicDb.Tenant.findById(alert.tenantId).lean();
        const p = getCompliancePeriod(matchedReq.frequencyType, new Date(), tenant?.createdAt);
        let audit = await dynamicDb.ComplianceAudit.findOne({
          tenantId: alert.tenantId,
          requirementId: matchedReq._id,
          dueDate: { $gte: p.startDate, $lte: p.dueDate }
        }).lean();

        if (!audit) {
          await dynamicDb.ComplianceAudit.create({
            tenantId: alert.tenantId,
            requirementId: matchedReq._id,
            status: 'COMPLIANT',
            officerRemarks: remarks || 'Resolved from alerts desk',
            proofDocumentUrl: proofUrl,
            dueDate: p.dueDate,
            resolvedAt: new Date(),
            updatedByUserId: req.user!.id
          });
        } else if (audit.status !== 'COMPLIANT') {
          await dynamicDb.ComplianceAudit.findByIdAndUpdate(audit._id, {
            $set: {
              status: 'COMPLIANT',
              officerRemarks: remarks || 'Resolved from alerts desk',
              proofDocumentUrl: proofUrl || audit.proofDocumentUrl,
              resolvedAt: new Date(),
              updatedByUserId: req.user!.id
            }
          });
        }
      }
    }

    await logAudit({
      tenantId: alert.tenantId.toString(),
      userId: req.user!.id,
      action: 'UPDATE',
      module: 'COMPLIANCE',
      oldValue: alert,
      newValue: updatedAlert,
      ipAddress: req.ip
    });

    // Write to ComplianceAuditHistory for alert resolution
    const alertTypeToSerialNo: Record<string, number> = {
      'DEPOSIT_LOW': 6,
      'NISM_EXPIRY': 4,
      'CERTIFICATE_EXPIRY': 5,
      'KYC_MISSING': 48,
      'KYC_FAILED': 48,
      'PAN_MISSING': 48,
      'AGREEMENT_MISSING': 48
    };
    const serialNo = alertTypeToSerialNo[alert.alertType];
    if (serialNo) {
      try {
        const requirement = await dynamicDb.ComplianceRequirement.findOne({ serialNo }).lean();
        const tenant = await dynamicDb.Tenant.findById(alert.tenantId).lean();
        if (requirement) {
          const period = getCompliancePeriod(requirement.frequencyType, new Date(), tenant?.createdAt);
          let audit = await dynamicDb.ComplianceAudit.findOne({
            tenantId: alert.tenantId,
            requirementId: requirement._id,
            dueDate: { $gte: period.startDate, $lte: period.dueDate }
          }).lean();

          if (!audit) {
            const created = await dynamicDb.ComplianceAudit.create({
              tenantId: alert.tenantId,
              requirementId: requirement._id,
              status: 'COMPLIANT',
              dueDate: period.dueDate,
              resolvedAt: new Date(),
              updatedByUserId: req.user!.id,
              officerRemarks: `Auto-resolved via alert closure: ${alert.alertType}`
            });
            audit = created.toObject();
          }

          const updaterUser = await dynamicDb.User.findById(req.user!.id).lean();
          const updatedByName = updaterUser ? `${updaterUser.firstName || ''} ${updaterUser.lastName || ''}`.trim() : 'System';

          await dynamicDb.ComplianceAuditHistory.create({
            tenantId: alert.tenantId,
            requirementId: requirement._id,
            auditId: audit._id,
            previousStatus: audit.status,
            newStatus: 'COMPLIANT',
            officerRemarks: `Alert resolved: ${alert.alertType.replace(/_/g, ' ')}. ${remarks || ''}`,
            proofDocumentUrl: proofUrl,
            updatedByUserId: req.user!.id,
            updatedByName,
            periodLabel: period.label
          });
        }
      } catch (historyErr: any) {
        console.error('Failed to write alert history:', historyErr.message);
      }
    }

    syncTenantToRemote(alert.tenantId.toString(), { reason: 'ALERT_RESOLVED' }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Alert resolved successfully.',
      data: updatedAlert ? { ...updatedAlert, id: updatedAlert._id?.toString() || updatedAlert.id } : null
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

// ─── SEBI CHECKLIST ────────────────────────────────────────────────────────────

export const getChecklist = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    return res.status(200).json({ success: true, data: [] });
  }
  try {
    let tenant: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      tenant = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!tenant && tenantId) {
      tenant = await dynamicDb.Tenant.findOne({
        $or: [{ id: tenantId }, { tenantId: tenantId }]
      }).lean();
    }
    if (!tenant) {
      tenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }
    if (!tenant) {
      tenant = { createdAt: new Date() };
    }

    const requirements = await dynamicDb.ComplianceRequirement.find({ isActive: true })
      .sort({ serialNo: 1 })
      .lean();

    const checklist: any[] = [];
    const now = new Date();

    for (const reqItem of requirements) {
      const period = getCompliancePeriod(reqItem.frequencyType, now, tenant.createdAt);
      
      const audit: any = await dynamicDb.ComplianceAudit.findOne({
        tenantId,
        requirementId: reqItem._id,
        dueDate: {
          $gte: period.startDate,
          $lte: period.dueDate
        }
      })
        .populate('penalty')
        .lean();

      checklist.push({
        ...reqItem,
        id: reqItem._id?.toString() || reqItem.id,
        audit: audit ? {
          ...audit,
          id: audit._id?.toString() || audit.id,
          penalty: audit.penalty ? { ...audit.penalty, id: (audit.penalty as any)._id?.toString() || (audit.penalty as any).id } : null
        } : null,
        currentPeriod: period
      });
    }

    return res.status(200).json({ success: true, data: checklist });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const updateAuditStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { requirementId } = req.params;
  const { status, officerRemarks } = req.body;
  const tenantId = req.user!.tenantId!;
  const proofDocumentUrl = req.file ? `/uploads/compliance/${req.file.filename}` : undefined;

  try {
    const requirement = await dynamicDb.ComplianceRequirement.findById(requirementId).lean();
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Compliance requirement not found.' });
    }
    const tenant = await dynamicDb.Tenant.findById(tenantId).lean();

    let parsedAmount = 5000;
    if (requirement.penaltyAmount) {
      const cleanStr = requirement.penaltyAmount.replace(/[^\d]/g, '');
      if (cleanStr) {
        parsedAmount = parseFloat(cleanStr);
      }
    }

    const period = getCompliancePeriod(requirement.frequencyType, new Date(), tenant?.createdAt);

    // Find the audit record for the current period
    let audit: any = await dynamicDb.ComplianceAudit.findOne({
      tenantId,
      requirementId,
      dueDate: {
        $gte: period.startDate,
        $lte: period.dueDate
      }
    }).lean();

    const previousStatus = audit ? audit.status : 'PENDING';

    // Prevent editing if already resolved
    if (audit && (audit.status === 'COMPLIANT' || audit.status === 'PENALTY_RESOLVED')) {
      return res.status(400).json({ success: false, message: 'This compliance task has already been resolved and cannot be edited.' });
    }

    if (!audit) {
      const created = await dynamicDb.ComplianceAudit.create({ 
        tenantId, 
        requirementId, 
        status, 
        officerRemarks,
        proofDocumentUrl,
        dueDate: period.dueDate,
        resolvedAt: status === 'COMPLIANT' ? new Date() : null,
        updatedByUserId: req.user!.id
      });
      audit = created.toObject();
    } else {
      audit = await dynamicDb.ComplianceAudit.findByIdAndUpdate(
        audit._id,
        { 
          $set: {
            status, 
            officerRemarks,
            ...(proofDocumentUrl && { proofDocumentUrl }),
            dueDate: period.dueDate,
            resolvedAt: status === 'COMPLIANT' ? new Date() : null,
            updatedByUserId: req.user!.id
          }
        },
        { returnDocument: 'after', lean: true }
      );
    }

    const updaterUser = await dynamicDb.User.findById(req.user!.id).lean();
    const updatedByName = updaterUser ? `${updaterUser.firstName || ''} ${updaterUser.lastName || ''}`.trim() : 'System';

    // Write to ComplianceAuditHistory
    await dynamicDb.ComplianceAuditHistory.create({
      tenantId,
      requirementId,
      auditId: audit._id,
      previousStatus,
      newStatus: status,
      officerRemarks,
      proofDocumentUrl,
      updatedByUserId: req.user!.id,
      updatedByName,
      periodLabel: period.label
    });

    // Auto-levy penalty and compliance alert if marked NON_COMPLIANT
    if (status === 'NON_COMPLIANT') {
      const existingPenalty = await dynamicDb.Penalty.findOne({ auditId: audit._id }).lean();
      if (!existingPenalty) {
        await dynamicDb.Penalty.create({
          tenantId,
          auditId: audit._id,
          amount: parsedAmount,
          reason: `Non-compliance with rule: ${requirement.requirement}`,
          status: 'PENDING_PAYMENT'
        });

        await dynamicDb.ComplianceAlert.create({
          tenantId,
          alertType: 'PENALTY_LEVIED',
          severity: requirement.severityLevel || 'HIGH',
          description: `SEBI Penalty Risk: Rs.${parsedAmount.toLocaleString()} can be levied for non-compliance with rule: "${requirement.requirement}". Please upload payment proof and reference to close this penalty.`,
          status: 'OPEN',
          remarks: `Associated with Audit ID: ${audit._id.toString()}`
        });
      }
    } else if (status === 'COMPLIANT') {
      // Auto-resolve any DEADLINE_UPCOMING alerts for this requirement
      await dynamicDb.ComplianceAlert.updateMany(
        { 
          tenantId, 
          alertType: 'DEADLINE_UPCOMING', 
          status: 'OPEN',
          description: { $regex: requirement.requirement, $options: 'i' }
        },
        { 
          $set: {
            status: 'CLOSED', 
            remarks: 'Auto-resolved: Checklist marked as COMPLIANT.', 
            closedAt: new Date()
          }
        }
      );
    }

    syncTenantToRemote(tenantId, { reason: 'COMPLIANCE_AUDIT_UPDATE' }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Compliance task resolved.',
      data: audit ? { ...audit, id: audit._id?.toString() || audit.id } : null
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getChecklistHistory = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    return res.status(200).json({ success: true, data: [] });
  }
  try {
    const history = await dynamicDb.ComplianceAuditHistory.find({ tenantId })
      .populate('requirementId')
      .sort({ createdAt: -1 })
      .lean();

    const formattedHistory = history.map((h: any) => {
      const reqDoc = h.requirementId || h.requirement;
      return {
        ...h,
        id: h._id?.toString() || h.id,
        requirement: reqDoc ? {
          ...reqDoc,
          id: reqDoc._id?.toString() || reqDoc.id
        } : null
      };
    });

    return res.status(200).json({ success: true, data: formattedHistory });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

// ─── PENALTIES ────────────────────────────────────────────────────────────────

export const getPenalties = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    return res.status(200).json({ success: true, data: [] });
  }
  try {
    const penalties = await dynamicDb.Penalty.find({ tenantId })
      .populate({
        path: 'auditId',
        populate: { path: 'requirementId' }
      })
      .sort({ updatedAt: -1 })
      .lean();

    const formattedPenalties = penalties.map((p: any) => {
      const audit = p.auditId || p.audit;
      const reqDoc = audit?.requirementId || audit?.requirement;
      return {
        ...p,
        id: p._id?.toString() || p.id,
        audit: audit ? {
          ...audit,
          id: audit._id?.toString() || audit.id,
          requirement: reqDoc ? {
            ...reqDoc,
            id: reqDoc._id?.toString() || reqDoc.id
          } : null
        } : null
      };
    });

    return res.status(200).json({ success: true, data: formattedPenalties });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const resolvePenalty = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { paymentRef, remarks, resolutionType } = req.body;
  const proofUrl = req.file ? `/uploads/compliance/${req.file.filename}` : undefined;
  
  if (!resolutionType) {
    return res.status(400).json({ success: false, message: 'Resolution Type (Compliant/Paid) is mandatory.' });
  }

  if (resolutionType === 'Paid') {
    if (!paymentRef || !paymentRef.trim()) {
      return res.status(400).json({ success: false, message: 'Payment Reference ID is mandatory.' });
    }
  }

  if (!remarks || !remarks.trim()) {
    return res.status(400).json({ success: false, message: 'Remarks are mandatory.' });
  }

  try {
    const penalty: any = await dynamicDb.Penalty.findById(id)
      .populate({
        path: 'auditId',
        populate: { path: 'requirementId' }
      })
      .lean();

    const audit = penalty?.auditId || penalty?.audit;
    if (!penalty || !audit) return res.status(404).json({ success: false, message: 'Penalty not found.' });
    
    const updated = await dynamicDb.Penalty.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'PAID', 
          paymentRef: resolutionType === 'Paid' ? paymentRef : 'WAIVED_COMPLIANT', 
          proofUrl, 
          remarks, 
          paidAt: new Date() 
        }
      },
      { returnDocument: 'after', lean: true }
    );
    
    await dynamicDb.ComplianceAudit.findByIdAndUpdate(audit._id, {
      $set: {
        status: resolutionType.toUpperCase(),
        officerRemarks: `Penalty resolved as ${resolutionType}. ${remarks || ''}`
      }
    });

    const updaterUser = await dynamicDb.User.findById(req.user!.id).lean();
    const updatedByName = updaterUser ? `${updaterUser.firstName || ''} ${updaterUser.lastName || ''}`.trim() : 'System';
    const requirement = audit.requirementId || audit.requirement;
    const period = getCompliancePeriod(requirement?.frequencyType || 'CONTINUOUS', audit.updatedAt || new Date());

    // Write to ComplianceAuditHistory when resolving penalty
    await dynamicDb.ComplianceAuditHistory.create({
      tenantId: penalty.tenantId,
      requirementId: audit.requirementId?._id || audit.requirementId,
      auditId: audit._id,
      previousStatus: audit.status,
      newStatus: resolutionType.toUpperCase(),
      officerRemarks: `Penalty paid. Ref: ${paymentRef}. ${remarks || ''}`,
      proofDocumentUrl: proofUrl,
      updatedByUserId: req.user!.id,
      updatedByName,
      periodLabel: period.label
    });

    // Close the corresponding compliance alert
    await dynamicDb.ComplianceAlert.updateMany(
      { 
        tenantId: penalty.tenantId, 
        alertType: 'PENALTY_LEVIED', 
        status: 'OPEN',
        remarks: { $regex: audit._id.toString(), $options: 'i' }
      },
      {
        $set: {
          status: 'CLOSED',
          closedAt: new Date(),
          remarks: `Resolved via Penalty Payment. Ref: ${paymentRef}. ${remarks || ''}`,
          proofUrl
        }
      }
    );
    
    syncTenantToRemote(penalty.tenantId.toString(), { reason: 'PENALTY_RESOLVED' }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Penalty resolved successfully.',
      data: updated ? { ...updated, id: updated._id?.toString() || updated.id } : null
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

const getMetricsForTenant = async (tenantId: string, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const audits = await dynamicDb.ComplianceAudit.find({ tenantId })
      .populate('requirementId')
      .populate('penalty')
      .populate('tenantId')
      .lean();

    const normalizeAudit = (a: any) => {
      const reqObj = a.requirementId && typeof a.requirementId === 'object' ? a.requirementId : (a.requirement || {});
      const tenObj = a.tenantId && typeof a.tenantId === 'object' ? a.tenantId : (a.tenant || {});
      return {
        ...a,
        id: a._id ? a._id.toString() : a.id,
        requirement: {
          id: reqObj._id ? reqObj._id.toString() : reqObj.id,
          serialNo: reqObj.serialNo,
          requirement: reqObj.requirement || reqObj.title || 'SEBI Regulation',
          frequency: reqObj.frequency,
          frequencyType: reqObj.frequencyType,
          severityLevel: reqObj.severityLevel,
          penaltyAmount: reqObj.penaltyAmount
        },
        requirementId: reqObj,
        tenant: {
          id: tenObj._id ? tenObj._id.toString() : (tenObj.id || tenantId),
          companyName: tenObj.companyName || '—',
          sebiRegistration: tenObj.sebiRegistration || '—',
          domainUrl: tenObj.domainUrl || null,
          website: tenObj.website || null
        },
        penalty: a.penalty || null
      };
    };

    const upcoming = audits.filter((a: any) => 
      (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'UPCOMING') && 
      a.dueDate && new Date(a.dueDate) >= now && new Date(a.dueDate) <= thirtyDaysFromNow
    ).map(normalizeAudit);

    const due = audits.filter((a: any) => 
      (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'DUE') && 
      a.dueDate && new Date(a.dueDate) >= now
    ).map(normalizeAudit);

    const overdue = audits.filter((a: any) => 
      ((a.status === 'PENDING' || a.status === 'OVERDUE') && a.dueDate && new Date(a.dueDate) < now) || 
      a.status === 'OVERDUE'
    ).map(normalizeAudit);

    const penalty = audits.filter((a: any) => 
      a.penalty && (a.penalty.status === 'PENDING_PAYMENT' || a.status === 'PENALTY')
    ).map(normalizeAudit);

    const closed = audits.filter((a: any) => 
      a.status === 'COMPLIANT' || a.status === 'PENALTY_RESOLVED' || a.status === 'CLOSED'
    ).map(normalizeAudit);

    return res.status(200).json({
      success: true,
      data: {
        upcoming,
        due,
        overdue,
        penalty,
        closed,
        counts: {
          upcoming: upcoming.length,
          due: due.length,
          overdue: overdue.length,
          penalty: penalty.length,
          closed: closed.length,
          total: audits.length
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

const getGlobalComplianceMetrics = async (res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const audits = await dynamicDb.ComplianceAudit.find()
      .populate('requirementId')
      .populate('penalty')
      .populate('tenantId')
      .lean();

    const normalizeAudit = (a: any) => {
      const reqObj = a.requirementId && typeof a.requirementId === 'object' ? a.requirementId : (a.requirement || {});
      const tenObj = a.tenantId && typeof a.tenantId === 'object' ? a.tenantId : (a.tenant || {});
      return {
        ...a,
        id: a._id ? a._id.toString() : a.id,
        requirement: {
          id: reqObj._id ? reqObj._id.toString() : reqObj.id,
          serialNo: reqObj.serialNo,
          requirement: reqObj.requirement || reqObj.title || 'SEBI Regulation',
          frequency: reqObj.frequency,
          frequencyType: reqObj.frequencyType,
          severityLevel: reqObj.severityLevel,
          penaltyAmount: reqObj.penaltyAmount
        },
        requirementId: reqObj,
        tenant: {
          id: tenObj._id ? tenObj._id.toString() : (tenObj.id || ''),
          companyName: tenObj.companyName || '—',
          sebiRegistration: tenObj.sebiRegistration || '—',
          domainUrl: tenObj.domainUrl || null,
          website: tenObj.website || null
        },
        penalty: a.penalty || null
      };
    };

    const upcoming = audits.filter((a: any) => 
      (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'UPCOMING') && 
      a.dueDate && new Date(a.dueDate) >= now && new Date(a.dueDate) <= thirtyDaysFromNow
    ).map(normalizeAudit);

    const due = audits.filter((a: any) => 
      (a.status === 'PENDING' || a.status === 'OVERDUE' || a.status === 'DUE') && 
      a.dueDate && new Date(a.dueDate) >= now
    ).map(normalizeAudit);

    const overdue = audits.filter((a: any) => 
      ((a.status === 'PENDING' || a.status === 'OVERDUE') && a.dueDate && new Date(a.dueDate) < now) || 
      a.status === 'OVERDUE'
    ).map(normalizeAudit);

    const penalty = audits.filter((a: any) => 
      a.penalty && (a.penalty.status === 'PENDING_PAYMENT' || a.status === 'PENALTY')
    ).map(normalizeAudit);

    const closed = audits.filter((a: any) => 
      a.status === 'COMPLIANT' || a.status === 'PENALTY_RESOLVED' || a.status === 'CLOSED'
    ).map(normalizeAudit);

    return res.status(200).json({
      success: true,
      data: {
        upcoming,
        due,
        overdue,
        penalty,
        closed,
        counts: {
          upcoming: upcoming.length,
          due: due.length,
          overdue: overdue.length,
          penalty: penalty.length,
          closed: closed.length,
          total: audits.length
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, errors: [error.message] });
  }
};

export const getComplianceDashboardMetrics = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    const queryTenantId = req.query.tenantId as string;
    if (req.user!.role === 'SUPER_ADMIN' && queryTenantId) {
      return getMetricsForTenant(queryTenantId, res);
    }
    if (req.user!.role === 'SUPER_ADMIN') {
      return getGlobalComplianceMetrics(res);
    }
    return res.status(400).json({ success: false, message: 'Invalid tenant context' });
  }
  return getMetricsForTenant(tenantId, res);
};

export const getPeriodicReportData = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, message: 'Invalid tenant context' });

  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 6 months if not provided
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(end.getFullYear(), end.getMonth() - 6, end.getDate());

    let tenant: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      tenant = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!tenant && tenantId) {
      tenant = await dynamicDb.Tenant.findOne({
        $or: [{ id: tenantId }, { tenantId: tenantId }]
      }).lean();
    }
    if (!tenant) {
      tenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }
    if (!tenant) {
      tenant = { createdAt: new Date() };
    }

    const tenantUsers = await dynamicDb.User.find({ tenantId, deletedAt: null }).select('_id roleId').populate('role').lean();
    const tenantUserIds = tenantUsers.map(u => u._id);

    // 1. Half Yearly Report Data
    const reportsPublished = await dynamicDb.ResearchReport.countDocuments({
      tenantId,
      status: 'PUBLISHED',
      publishedAt: { $gte: start, $lte: end }
    });

    const staffMembers = await dynamicDb.Staff.find({
      userId: { $in: tenantUserIds },
      status: 'ACTIVE'
    })
      .populate({
        path: 'userId',
        populate: { path: 'role' }
      })
      .lean();

    const raCount = staffMembers.filter((s: any) => {
      const roleName = s.userId?.role?.name;
      return roleName === 'RESEARCHER' || roleName === 'ADMIN';
    }).length;

    const parsCount = staffMembers.filter((s: any) => {
      const roleName = s.userId?.role?.name;
      return ['PERSON_ASSOCIATED', 'SALES', 'MARKETING'].includes(roleName);
    }).length;

    const totalEmployees = staffMembers.length;
    
    const complianceOfficer = staffMembers.find((s: any) => s.userId?.role?.name === 'COMPLIANCE_OFFICER');
    const principalOfficer = staffMembers.find((s: any) => s.userId?.role?.name === 'PRINCIPAL_OFFICER');

    // 2. Complaints Data
    const complaintsReceived = await dynamicDb.Complaint.countDocuments({
      tenantId,
      receivedAt: { $gte: start, $lte: end }
    });
    const complaintsResolved = await dynamicDb.Complaint.countDocuments({
      tenantId,
      resolvedAt: { $gte: start, $lte: end }
    });
    
    const complaintsPendingStart = await dynamicDb.Complaint.countDocuments({
      tenantId,
      receivedAt: { $lt: start },
      $or: [
        { status: 'OPEN' },
        { resolvedAt: { $gte: start } }
      ]
    });

    const complaintsPendingEnd = complaintsPendingStart + complaintsReceived - complaintsResolved;

    // 3. Clients and Fees
    const allClients = await dynamicDb.Client.find({
      userId: { $in: tenantUserIds }
    }).populate('subscriptions').lean();

    const clientsAtStart = allClients.filter((c: any) => {
      return (c.subscriptions || []).some((s: any) =>
        new Date(s.startDate) < start && new Date(s.endDate) >= start && s.status === 'ACTIVE'
      );
    }).length;

    const clientsAcquired = allClients.filter((c: any) => {
      return (c.subscriptions || []).some((s: any) =>
        new Date(s.startDate) >= start && new Date(s.startDate) <= end && s.status === 'ACTIVE'
      );
    }).length;
    
    const clientsAtEnd = allClients.filter((c: any) => {
      return (c.subscriptions || []).some((s: any) =>
        new Date(s.startDate) <= end && new Date(s.endDate) >= end && s.status === 'ACTIVE'
      );
    }).length;

    let clientsExpired = clientsAtStart + clientsAcquired - clientsAtEnd;
    if (clientsExpired < 0) clientsExpired = 0;

    const payments = await dynamicDb.Payment.find({
      tenantId,
      status: 'SUCCESS',
      createdAt: { $gte: start, $lte: end }
    }).select('amount').lean();

    const feesCollected = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const reportData = {
      tenant: {
        companyName: tenant.companyName,
        sebiRegistration: tenant.sebiRegistration,
        depositAmount: tenant.depositAmount,
        website: tenant.website || 'NA',
        ownerName: tenant.ownerName,
        nismValidity: tenant.nismValidity,
        address: tenant.address,
        mobile: tenant.mobile,
        email: tenant.email,
        createdAt: tenant.createdAt,
        bankAccountName: tenant.bankAccountName,
        bankAccountNo: tenant.bankAccountNo,
        bankAccountType: tenant.bankAccountType,
        bankIfsc: tenant.bankIfsc,
        bankName: tenant.bankName,
        bankBranch: tenant.bankBranch,
        socialMediaLinks: tenant.socialMediaLinks
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      staffInfo: {
        raCount,
        parsCount,
        totalEmployees,
        complianceOfficer: complianceOfficer ? {
          name: complianceOfficer.name,
          email: complianceOfficer.email,
          mobile: complianceOfficer.mobile,
          nismNumber: complianceOfficer.nismNumber
        } : null,
        principalOfficer: principalOfficer ? {
          name: principalOfficer.name,
          email: principalOfficer.email,
          mobile: principalOfficer.mobile,
          nismNumber: principalOfficer.nismNumber
        } : null,
        allStaff: staffMembers.map((s: any) => ({
          name: s.name,
          email: s.email,
          role: s.userId?.role?.name,
          nismNumber: s.nismNumber,
          nismValidity: s.nismValidity
        }))
      },
      research: {
        reportsPublished
      },
      complaints: {
        pendingStart: complaintsPendingStart,
        received: complaintsReceived,
        resolved: complaintsResolved,
        pendingEnd: complaintsPendingEnd
      },
      clientsAndFees: {
        atStart: clientsAtStart,
        acquired: clientsAcquired,
        expired: clientsExpired,
        atEnd: clientsAtEnd,
        feesCollected
      }
    };

    return res.status(200).json({ success: true, data: reportData });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPeriodicReportMeta = async (req: any, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    let tenant: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      tenant = await dynamicDb.Tenant.findById(tenantId).select('createdAt').lean();
    }
    if (!tenant && tenantId) {
      tenant = await dynamicDb.Tenant.findOne({
        $or: [{ id: tenantId }, { tenantId: tenantId }]
      }).select('createdAt').lean();
    }
    if (!tenant) {
      tenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).select('createdAt').lean();
    }
    
    // The registration date's financial year
    const regDate = tenant?.createdAt ? new Date(tenant.createdAt) : new Date();
    const regFinYear = regDate.getMonth() >= 3 ? regDate.getFullYear() : regDate.getFullYear() - 1;
    
    return res.status(200).json({ success: true, data: { startYear: regFinYear } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
