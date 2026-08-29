"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPeriodicReportMeta = exports.getPeriodicReportData = exports.getComplianceDashboardMetrics = exports.resolvePenalty = exports.getPenalties = exports.getChecklistHistory = exports.updateAuditStatus = exports.getChecklist = exports.closeAlert = exports.getAlerts = exports.runComplianceCheck = exports.checkComplianceForTenant = void 0;
const db_1 = __importDefault(require("../config/db"));
const complianceDateHelper_1 = require("../utils/complianceDateHelper");
const auditService_1 = require("../services/auditService");
const adminController_1 = require("./adminController");
const checkComplianceForTenant = async (tenantId) => {
    const tenant = await db_1.default.tenant.findUnique({
        where: { id: tenantId },
        include: { users: { include: { staff: true, client: true } } }
    });
    if (!tenant)
        throw new Error('Tenant not found.');
    // DO NOT run compliance checks for tenants that haven't finished onboarding
    const completeness = await (0, adminController_1.calculateCompleteness)(tenantId);
    if (completeness === 0 || completeness.score < 100) {
        return []; // Return empty alerts, skipping all checks
    }
    const alertsCreated = [];
    // 1. DEPOSIT RULE CHECK
    const activeClientsCount = await db_1.default.client.count({ where: { user: { tenantId }, status: 'ACTIVE' } });
    let requiredDeposit = 100000;
    if (activeClientsCount <= 150) {
        requiredDeposit = 100000;
    }
    else if (activeClientsCount <= 300) {
        requiredDeposit = 200000;
    }
    else if (activeClientsCount <= 1000) {
        requiredDeposit = 500000;
    }
    else {
        requiredDeposit = 1000000;
    }
    if (tenant.depositAmount < requiredDeposit) {
        const description = `Compliance Alert: Deposit threshold low. Required deposit is Rs. ${requiredDeposit} for ${activeClientsCount} active clients. Current actual deposit is Rs. ${tenant.depositAmount}. Please submit deposit proof.`;
        const existingAlert = await db_1.default.complianceAlert.findFirst({ where: { tenantId, alertType: 'DEPOSIT_LOW', status: 'OPEN' } });
        if (!existingAlert) {
            alertsCreated.push(await db_1.default.complianceAlert.create({ data: { tenantId, alertType: 'DEPOSIT_LOW', severity: 'HIGH', description } }));
        }
    }
    // 1B. PART-TIME RA LIMIT CHECK
    if (tenant.raType === 'PART_TIME') {
        const isOverLimit = activeClientsCount > 75;
        // Find the latest penalty alert to check status
        const latestPenaltyAlert = await db_1.default.complianceAlert.findFirst({
            where: { tenantId, alertType: 'PART_TIME_LIMIT_EXCEEDED' },
            orderBy: { createdAt: 'desc' }
        });
        if (isOverLimit) {
            // Create new penalty only if no alert exists, or it's CLOSED, or it was OPEN but marked as DROPPED
            const needsNewPenalty = !latestPenaltyAlert ||
                latestPenaltyAlert.status === 'CLOSED' ||
                (latestPenaltyAlert.remarks || '').includes('[COUNT_DROPPED]');
            if (needsNewPenalty) {
                const description = `Code of Conduct Violation: Part-time RA active clients limit (75) exceeded. Current active clients: ${activeClientsCount}. You must apply for a Full-Time RA or reduce clients to avoid further penalties.`;
                const newAlert = await db_1.default.complianceAlert.create({
                    data: { tenantId, alertType: 'PART_TIME_LIMIT_EXCEEDED', severity: 'HIGH', description }
                });
                alertsCreated.push(newAlert);
                // Find requirement for Part-time limit (usually serialNo: 12)
                const requirement = await db_1.default.complianceRequirement.findFirst({
                    where: { serialNo: 12 }
                });
                if (requirement) {
                    const audit = await db_1.default.complianceAudit.create({
                        data: {
                            tenantId,
                            requirementId: requirement.id,
                            status: 'NON_COMPLIANT',
                            officerRemarks: 'System auto-generated penalty: Part-time RA client limit exceeded.',
                        }
                    });
                    await db_1.default.penalty.create({
                        data: {
                            tenantId,
                            auditId: audit.id,
                            amount: 10000,
                            reason: 'Code of Conduct Violation: Part-time RA client limit exceeded.',
                            status: 'PENDING_PAYMENT'
                        }
                    });
                }
            }
        }
        else {
            // activeClientsCount <= 75
            // If there's an OPEN alert and it hasn't been marked yet, mark it as DROPPED.
            if (latestPenaltyAlert && latestPenaltyAlert.status === 'OPEN' && !(latestPenaltyAlert.remarks || '').includes('[COUNT_DROPPED]')) {
                await db_1.default.complianceAlert.update({
                    where: { id: latestPenaltyAlert.id },
                    data: { remarks: ((latestPenaltyAlert.remarks || '') + ' [COUNT_DROPPED]').trim() }
                });
            }
        }
    }
    // 2. SEBI CERTIFICATE EXPIRY CHECK (90-day warning)
    if (tenant.certificateValidity) {
        const daysLeft = Math.ceil((tenant.certificateValidity.getTime() - Date.now()) / (1000 * 3600 * 24));
        if (daysLeft <= 90) {
            const description = `SEBI Certificate validity expires in ${daysLeft} days (valid until: ${tenant.certificateValidity.toDateString()}).`;
            const severity = daysLeft <= 15 ? 'HIGH' : 'MEDIUM';
            const existingAlert = await db_1.default.complianceAlert.findFirst({ where: { tenantId, alertType: 'CERTIFICATE_EXPIRY', status: 'OPEN' } });
            if (!existingAlert) {
                alertsCreated.push(await db_1.default.complianceAlert.create({ data: { tenantId, alertType: 'CERTIFICATE_EXPIRY', severity, description } }));
            }
            else {
                const updated = await db_1.default.complianceAlert.update({
                    where: { id: existingAlert.id },
                    data: { severity, description }
                });
                alertsCreated.push(updated);
            }
        }
    }
    // 3. NISM STAFF EXPIRY CHECK (90-day warning, severity levels: LOW/MEDIUM/HIGH)
    const rawStaffMembers = await db_1.default.staff.findMany({
        where: {
            user: {
                tenantId,
            },
            status: 'ACTIVE'
        },
        include: {
            user: {
                include: { role: true }
            }
        }
    });
    const staffMembers = rawStaffMembers.filter(st => st.user && !st.user.deletedAt);
    for (const staff of staffMembers) {
        if (staff.nismValidity) {
            const daysLeft = Math.ceil((staff.nismValidity.getTime() - Date.now()) / (1000 * 3600 * 24));
            const existingAlert = await db_1.default.complianceAlert.findFirst({
                where: {
                    tenantId,
                    alertType: 'NISM_EXPIRY',
                    status: 'OPEN',
                    description: { contains: `Staff "${staff.name}"` }
                }
            });
            if (daysLeft <= 90) {
                const formattedExpiryDate = staff.nismValidity.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const description = `NISM Certificate of Staff "${staff.name}" (Expiry Date: ${formattedExpiryDate}) expires in ${daysLeft} day(s). Please renew before expiry.`;
                let severity = 'LOW';
                if (daysLeft <= 30) {
                    severity = 'HIGH';
                }
                else if (daysLeft <= 60) {
                    severity = 'MEDIUM';
                }
                if (existingAlert) {
                    if (existingAlert.description !== description || existingAlert.severity !== severity) {
                        await db_1.default.complianceAlert.update({
                            where: { id: existingAlert.id },
                            data: { description, severity }
                        });
                    }
                }
                else {
                    alertsCreated.push(await db_1.default.complianceAlert.create({
                        data: { tenantId, alertType: 'NISM_EXPIRY', severity, description }
                    }));
                }
            }
            else {
                if (existingAlert) {
                    await db_1.default.complianceAlert.update({
                        where: { id: existingAlert.id },
                        data: { status: 'CLOSED', remarks: 'NISM Certificate validity updated/renewed.', closedAt: new Date() }
                    });
                }
            }
        }
    }
    // Clean up alerts for staff members who are no longer active or present
    const openNismAlerts = await db_1.default.complianceAlert.findMany({
        where: { tenantId, alertType: 'NISM_EXPIRY', status: 'OPEN' }
    });
    for (const alert of openNismAlerts) {
        const matchesActiveStaff = staffMembers.some(st => alert.description.includes(`Staff "${st.name}"`));
        if (!matchesActiveStaff) {
            await db_1.default.complianceAlert.update({
                where: { id: alert.id },
                data: { status: 'CLOSED', remarks: 'Staff member is no longer active or has been removed.', closedAt: new Date() }
            });
        }
    }
    // 4. MISSING KYC / AGREEMENT CHECK for active subscribers
    const rawClientsWithSubscriptions = await db_1.default.client.findMany({
        where: {
            user: { tenantId },
            subscriptions: { some: { status: 'ACTIVE' } }
        },
        include: { agreements: true, subscriptions: true, user: true }
    });
    const clientsWithSubscriptions = rawClientsWithSubscriptions.filter(c => c.user && !c.user.deletedAt);
    for (const client of clientsWithSubscriptions) {
        // 4a. KYC Check
        const isKycPending = ['PENDING_ONBOARDING', 'KYC_PENDING', 'KYC_FAILED'].includes(client.status);
        const kycDescription = `Client "${client.name}" (PAN: ${client.pan || 'N/A'}) has an active subscription but incomplete KYC (Status: ${client.status}).`;
        const existingKycAlert = await db_1.default.complianceAlert.findFirst({ where: { tenantId, alertType: 'KYC_MISSING', status: 'OPEN', clientId: client.id } });
        if (isKycPending) {
            if (!existingKycAlert) {
                alertsCreated.push(await db_1.default.complianceAlert.create({
                    data: { tenantId, alertType: 'KYC_MISSING', severity: 'MEDIUM', description: kycDescription, clientId: client.id }
                }));
            }
        }
        else {
            if (existingKycAlert) {
                await db_1.default.complianceAlert.update({
                    where: { id: existingKycAlert.id },
                    data: { status: 'CLOSED', remarks: 'Daily auto-sweep: resolved as client completed KYC.', closedAt: new Date() }
                });
            }
        }
        // 4b. Agreement Check
        if (client.agreements.length === 0) {
            const aggDescription = `Client "${client.name}" (PAN: ${client.pan || 'N/A'}) has an active subscription but no signed agreement.`;
            const existingAggAlert = await db_1.default.complianceAlert.findFirst({ where: { tenantId, alertType: 'AGREEMENT_MISSING', status: 'OPEN', description: aggDescription } });
            if (!existingAggAlert) {
                alertsCreated.push(await db_1.default.complianceAlert.create({
                    data: { tenantId, alertType: 'AGREEMENT_MISSING', severity: 'HIGH', description: aggDescription, clientId: client.id }
                }));
            }
        }
    }
    // 4c. AUTO-CLOSE RESOLVED KYC/AGREEMENT ALERTS
    // For agreements
    const openAgreementAlerts = await db_1.default.complianceAlert.findMany({
        where: { tenantId, alertType: 'AGREEMENT_MISSING', status: 'OPEN' }
    });
    for (const alert of openAgreementAlerts) {
        if (alert.clientId) {
            const client = await db_1.default.client.findUnique({
                where: { id: alert.clientId },
                include: { agreements: true, subscriptions: true }
            });
            if (client) {
                const isKycComplete = !['PENDING_ONBOARDING', 'KYC_PENDING', 'KYC_FAILED'].includes(client.status);
                const isAgreementComplete = client.agreements.length > 0;
                const hasActiveSub = client.subscriptions.some((s) => s.status === 'ACTIVE');
                if ((isKycComplete && isAgreementComplete) || !hasActiveSub) {
                    await db_1.default.complianceAlert.update({
                        where: { id: alert.id },
                        data: { status: 'CLOSED', remarks: 'Daily auto-sweep: resolved or subscription ended.', closedAt: new Date() }
                    });
                }
            }
        }
    }
    // For KYC
    const openKycAlerts = await db_1.default.complianceAlert.findMany({
        where: { tenantId, alertType: 'KYC_MISSING', status: 'OPEN' }
    });
    for (const alert of openKycAlerts) {
        if (alert.clientId) {
            const client = await db_1.default.client.findUnique({
                where: { id: alert.clientId },
                include: { subscriptions: true }
            });
            if (client) {
                const isKycComplete = !['PENDING_ONBOARDING', 'KYC_PENDING', 'KYC_FAILED'].includes(client.status);
                const hasActiveSub = client.subscriptions.some((s) => s.status === 'ACTIVE');
                if (isKycComplete || !hasActiveSub) {
                    await db_1.default.complianceAlert.update({
                        where: { id: alert.id },
                        data: { status: 'CLOSED', remarks: 'Resolved or client no longer has active subscription.', closedAt: new Date() }
                    });
                }
            }
        }
    }
    // 5. SEBI FEE FRAMEWORK CHECK (SR.17) — Max ₹1,51,000 incl. GST per client per financial year
    // Financial year: April 1 to March 31
    const today = new Date();
    const fyStart = today.getMonth() >= 3 // April = month index 3
        ? new Date(today.getFullYear(), 3, 1) // Current year April 1
        : new Date(today.getFullYear() - 1, 3, 1); // Previous year April 1
    const fyEnd = new Date(fyStart.getFullYear() + 1, 2, 31, 23, 59, 59); // March 31
    const SEBI_FEE_CAP = 151000; // ₹1,51,000 incl. GST
    // Get all active clients for this tenant
    const rawAllTenantClients = await db_1.default.client.findMany({
        where: { user: { tenantId } },
        select: { id: true, name: true, pan: true, user: true }
    });
    const allTenantClients = rawAllTenantClients.filter(c => c.user && !c.user.deletedAt);
    for (const client of allTenantClients) {
        // Sum all SUCCESS payments for this client in current FY
        const clientPayments = await db_1.default.payment.findMany({
            where: {
                tenantId,
                clientId: client.id,
                status: 'SUCCESS',
                createdAt: { gte: fyStart, lte: fyEnd }
            },
            select: { amount: true }
        });
        const totalPaidFY = clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const existingFeeAlert = await db_1.default.complianceAlert.findFirst({
            where: {
                tenantId,
                alertType: 'SEBI_FEE_EXCEEDED',
                status: 'OPEN',
                clientId: client.id
            }
        });
        if (totalPaidFY > SEBI_FEE_CAP) {
            const excessAmount = totalPaidFY - SEBI_FEE_CAP;
            const description = `SEBI Fee Cap Violation (SR.17): Client "${client.name}" (PAN: ${client.pan || 'N/A'}) has been charged ₹${totalPaidFY.toLocaleString('en-IN')} (incl. GST) in FY ${fyStart.getFullYear()}-${fyEnd.getFullYear()} — exceeds the SEBI limit of ₹1,51,000 by ₹${excessAmount.toLocaleString('en-IN')}. Refund or rectify immediately.`;
            if (!existingFeeAlert) {
                const newAlert = await db_1.default.complianceAlert.create({
                    data: {
                        tenantId,
                        alertType: 'SEBI_FEE_EXCEEDED',
                        severity: 'HIGH',
                        description,
                        clientId: client.id
                    }
                });
                alertsCreated.push(newAlert);
                // Auto-penalty for SR.17 violation — ₹10,000 per violation
                const feeRequirement = await db_1.default.complianceRequirement.findFirst({
                    where: { serialNo: 17 }
                });
                if (feeRequirement) {
                    const feeAudit = await db_1.default.complianceAudit.create({
                        data: {
                            tenantId,
                            requirementId: feeRequirement.id,
                            status: 'NON_COMPLIANT',
                            officerRemarks: `System auto-generated: SEBI fee cap exceeded for client "${client.name}". Total charged: ₹${totalPaidFY.toLocaleString('en-IN')}`,
                        }
                    });
                    await db_1.default.penalty.create({
                        data: {
                            tenantId,
                            auditId: feeAudit.id,
                            amount: 10000,
                            reason: `SEBI Fee Framework Violation (SR.17): Client "${client.name}" charged ₹${totalPaidFY.toLocaleString('en-IN')} incl. GST — exceeds ₹1,51,000 annual cap.`,
                            status: 'PENDING_PAYMENT'
                        }
                    });
                }
            }
            else {
                // Update alert description if amount changed
                if (existingFeeAlert.description !== description) {
                    await db_1.default.complianceAlert.update({
                        where: { id: existingFeeAlert.id },
                        data: { description }
                    });
                }
            }
        }
        else {
            // Client is within limit — close any open alert
            if (existingFeeAlert) {
                await db_1.default.complianceAlert.update({
                    where: { id: existingFeeAlert.id },
                    data: {
                        status: 'CLOSED',
                        remarks: `Auto-resolved: Client "${client.name}" total FY payment ₹${totalPaidFY.toLocaleString('en-IN')} is now within ₹1,51,000 cap.`,
                        closedAt: new Date()
                    }
                });
            }
        }
    }
    // 5B. PAN COLLECTION FOR SEGREGATION CHECK (SR.48)
    // Rule: Client has active subscription + KYC complete + PAN missing = alert + penalty
    const KYC_COMPLETE_STATUSES = ['AGREEMENT_PENDING', 'PAYMENT_PENDING', 'ACTIVE', 'INACTIVE'];
    const rawClientsWithActivePlans = await db_1.default.client.findMany({
        where: {
            user: { tenantId },
            subscriptions: { some: { status: 'ACTIVE' } },
            status: { in: KYC_COMPLETE_STATUSES }
        },
        select: { id: true, name: true, pan: true, status: true, user: true }
    });
    const clientsWithActivePlans = rawClientsWithActivePlans.filter(c => c.user && !c.user.deletedAt);
    for (const client of clientsWithActivePlans) {
        const isPanMissing = !client.pan || client.pan.trim() === '';
        const existingPanAlert = await db_1.default.complianceAlert.findFirst({
            where: { tenantId, alertType: 'PAN_MISSING', status: 'OPEN', clientId: client.id }
        });
        if (isPanMissing) {
            const description = `PAN Collection Violation (SR.48): Client "${client.name}" has an active subscription and completed KYC, but PAN details are missing. PAN is mandatory for family/dependent segregation compliance under SEBI regulations.`;
            if (!existingPanAlert) {
                const newPanAlert = await db_1.default.complianceAlert.create({
                    data: { tenantId, alertType: 'PAN_MISSING', severity: 'HIGH', description, clientId: client.id }
                });
                alertsCreated.push(newPanAlert);
                // Auto-penalty for SR.48 violation — ₹5,000
                const panRequirement = await db_1.default.complianceRequirement.findFirst({ where: { serialNo: 48 } });
                if (panRequirement) {
                    const panAudit = await db_1.default.complianceAudit.create({
                        data: {
                            tenantId,
                            requirementId: panRequirement.id,
                            status: 'NON_COMPLIANT',
                            officerRemarks: `System auto-generated: PAN missing for client "${client.name}" with active subscription and completed KYC.`
                        }
                    });
                    await db_1.default.penalty.create({
                        data: {
                            tenantId,
                            auditId: panAudit.id,
                            amount: 5000,
                            reason: `PAN Collection Violation (SR.48): Client "${client.name}" — active subscription + KYC complete but PAN missing.`,
                            status: 'PENDING_PAYMENT'
                        }
                    });
                }
            }
        }
        else {
            // PAN exists — auto-close any open alert
            if (existingPanAlert) {
                await db_1.default.complianceAlert.update({
                    where: { id: existingPanAlert.id },
                    data: {
                        status: 'CLOSED',
                        remarks: `Auto-resolved: PAN "${client.pan}" collected for client "${client.name}".`,
                        closedAt: new Date()
                    }
                });
            }
        }
    }
    // 5C. MISSING PRINCIPAL OFFICER CHECK (SR.7)
    const hasPrincipalOfficer = staffMembers.some(st => st.user?.role?.name === 'PRINCIPAL_OFFICER');
    const existingPoAlert = await db_1.default.complianceAlert.findFirst({
        where: { tenantId, alertType: 'MISSING_PRINCIPAL_OFFICER', status: 'OPEN' }
    });
    if (!hasPrincipalOfficer) {
        if (!existingPoAlert) {
            const description = `Compliance Alert: No Principal Officer found. Please designate a Principal Officer within 10 days to avoid a penalty.`;
            const newAlert = await db_1.default.complianceAlert.create({
                data: { tenantId, alertType: 'MISSING_PRINCIPAL_OFFICER', severity: 'MEDIUM', description }
            });
            alertsCreated.push(newAlert);
        }
        else {
            const ageInDays = (Date.now() - new Date(existingPoAlert.createdAt).getTime()) / (1000 * 3600 * 24);
            if (ageInDays >= 7 && ageInDays < 10 && existingPoAlert.severity !== 'HIGH') {
                await db_1.default.complianceAlert.update({
                    where: { id: existingPoAlert.id },
                    data: { severity: 'HIGH', description: 'CRITICAL: No Principal Officer found. Appoint within 3 days to avoid a ₹5,000 penalty.' }
                });
            }
            else if (ageInDays >= 10) {
                const poReq = await db_1.default.complianceRequirement.findFirst({ where: { serialNo: 7 } });
                if (poReq) {
                    const existingAudit = await db_1.default.complianceAudit.findFirst({
                        where: { tenantId, requirementId: poReq.id, status: 'NON_COMPLIANT' }
                    });
                    if (!existingAudit) {
                        const penaltyDesc = `Compliance Violation (SR.7): No Principal Officer found after 10-day grace period. Designation is mandatory.`;
                        const poAudit = await db_1.default.complianceAudit.create({
                            data: {
                                tenantId,
                                requirementId: poReq.id,
                                status: 'NON_COMPLIANT',
                                officerRemarks: 'System auto-generated: No Principal Officer designated after grace period.'
                            }
                        });
                        await db_1.default.penalty.create({
                            data: { tenantId, auditId: poAudit.id, amount: 5000, reason: penaltyDesc, status: 'PENDING_PAYMENT' }
                        });
                        await db_1.default.complianceAlert.update({
                            where: { id: existingPoAlert.id },
                            data: { description: penaltyDesc }
                        });
                    }
                }
            }
        }
    }
    else if (existingPoAlert) {
        await db_1.default.complianceAlert.update({
            where: { id: existingPoAlert.id },
            data: { status: 'CLOSED', remarks: 'Auto-resolved: Principal Officer is now designated.', closedAt: new Date() }
        });
        // Auto-resolve associated audit & penalty
        const poReq = await db_1.default.complianceRequirement.findFirst({ where: { serialNo: 7 } });
        if (poReq) {
            await db_1.default.complianceAudit.updateMany({
                where: { tenantId, requirementId: poReq.id, status: { in: ['NON_COMPLIANT', 'PENDING', 'OVERDUE'] } },
                data: { status: 'COMPLIANT', resolvedAt: new Date(), officerRemarks: 'Auto-resolved: Principal Officer designated.' }
            });
            const poAudit = await db_1.default.complianceAudit.findFirst({ where: { tenantId, requirementId: poReq.id }, orderBy: { updatedAt: 'desc' } });
            if (poAudit) {
                await db_1.default.penalty.updateMany({
                    where: { auditId: poAudit.id, status: 'PENDING_PAYMENT' },
                    data: { status: 'WAIVED', remarks: 'Auto-waived: PO added' }
                });
            }
        }
    }
    // 5D. MISSING COMPLIANCE OFFICER CHECK (SR.8)
    const hasComplianceOfficer = staffMembers.some(st => st.user?.role?.name === 'COMPLIANCE_OFFICER');
    const existingCoAlert = await db_1.default.complianceAlert.findFirst({
        where: { tenantId, alertType: 'MISSING_COMPLIANCE_OFFICER', status: 'OPEN' }
    });
    if (!hasComplianceOfficer) {
        if (!existingCoAlert) {
            const description = `Compliance Alert: No Compliance Officer found. Please designate a Compliance Officer within 10 days to avoid a penalty.`;
            const newAlert = await db_1.default.complianceAlert.create({
                data: { tenantId, alertType: 'MISSING_COMPLIANCE_OFFICER', severity: 'MEDIUM', description }
            });
            alertsCreated.push(newAlert);
        }
        else {
            const ageInDays = (Date.now() - new Date(existingCoAlert.createdAt).getTime()) / (1000 * 3600 * 24);
            if (ageInDays >= 7 && ageInDays < 10 && existingCoAlert.severity !== 'HIGH') {
                await db_1.default.complianceAlert.update({
                    where: { id: existingCoAlert.id },
                    data: { severity: 'HIGH', description: 'CRITICAL: No Compliance Officer found. Appoint within 3 days to avoid a ₹20,000 penalty.' }
                });
            }
            else if (ageInDays >= 10) {
                const coReq = await db_1.default.complianceRequirement.findFirst({ where: { serialNo: 8 } });
                if (coReq) {
                    const existingAudit = await db_1.default.complianceAudit.findFirst({
                        where: { tenantId, requirementId: coReq.id, status: 'NON_COMPLIANT' }
                    });
                    if (!existingAudit) {
                        const penaltyDesc = `Compliance Violation (SR.8): No Compliance Officer found after 10-day grace period. Appointment is mandatory.`;
                        const coAudit = await db_1.default.complianceAudit.create({
                            data: {
                                tenantId,
                                requirementId: coReq.id,
                                status: 'NON_COMPLIANT',
                                officerRemarks: 'System auto-generated: No Compliance Officer designated after grace period.'
                            }
                        });
                        await db_1.default.penalty.create({
                            data: { tenantId, auditId: coAudit.id, amount: 20000, reason: penaltyDesc, status: 'PENDING_PAYMENT' }
                        });
                        await db_1.default.complianceAlert.update({
                            where: { id: existingCoAlert.id },
                            data: { description: penaltyDesc }
                        });
                    }
                }
            }
        }
    }
    else if (existingCoAlert) {
        await db_1.default.complianceAlert.update({
            where: { id: existingCoAlert.id },
            data: { status: 'CLOSED', remarks: 'Auto-resolved: Compliance Officer is now designated.', closedAt: new Date() }
        });
        // Auto-resolve associated audit & penalty
        const coReq = await db_1.default.complianceRequirement.findFirst({ where: { serialNo: 8 } });
        if (coReq) {
            await db_1.default.complianceAudit.updateMany({
                where: { tenantId, requirementId: coReq.id, status: { in: ['NON_COMPLIANT', 'PENDING', 'OVERDUE'] } },
                data: { status: 'COMPLIANT', resolvedAt: new Date(), officerRemarks: 'Auto-resolved: Compliance Officer designated.' }
            });
            const coAudit = await db_1.default.complianceAudit.findFirst({ where: { tenantId, requirementId: coReq.id }, orderBy: { updatedAt: 'desc' } });
            if (coAudit) {
                await db_1.default.penalty.updateMany({
                    where: { auditId: coAudit.id, status: 'PENDING_PAYMENT' },
                    data: { status: 'WAIVED', remarks: 'Auto-waived: CO added' }
                });
            }
        }
    }
    // 5E. INTERNAL POLICIES URL MISSING (SR.11)
    const isPolicyMissing = !tenant.internalPolicyUrl || tenant.internalPolicyUrl.trim() === '';
    const existingPolicyAlert = await db_1.default.complianceAlert.findFirst({
        where: { tenantId, alertType: 'MISSING_INTERNAL_POLICY', status: 'OPEN' }
    });
    if (isPolicyMissing) {
        if (!existingPolicyAlert) {
            const description = `Compliance Violation (SR.11): Written internal policies and controls are missing. Please upload/provide the Internal Policy URL in Settings.`;
            alertsCreated.push(await db_1.default.complianceAlert.create({
                data: { tenantId, alertType: 'MISSING_INTERNAL_POLICY', severity: 'MEDIUM', description }
            }));
        }
    }
    else if (existingPolicyAlert) {
        await db_1.default.complianceAlert.update({
            where: { id: existingPolicyAlert.id },
            data: { status: 'CLOSED', remarks: 'Auto-resolved: Internal policy provided.', closedAt: new Date() }
        });
    }
    // 5F. COMPLAINT RESOLUTION TIMELINE (SR.28)
    // Check complaints unresolved for > 21 days
    const overdueComplaints = await db_1.default.complaint.findMany({
        where: {
            tenantId,
            status: 'OPEN',
            receivedAt: { lte: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) }
        }
    });
    for (const complaint of overdueComplaints) {
        const description = `Compliance Violation (SR.28): Complaint (${complaint.subject}) is unresolved for over 21 days. Penalty of ₹100 per complaint applies.`;
        const existingOverdueComplaintAlert = await db_1.default.complianceAlert.findFirst({
            where: { tenantId, alertType: 'COMPLAINT_OVERDUE', status: 'OPEN', description: { contains: complaint.id } }
        });
        if (!existingOverdueComplaintAlert) {
            const newAlert = await db_1.default.complianceAlert.create({
                data: { tenantId, alertType: 'COMPLAINT_OVERDUE', severity: 'HIGH', description: `${description} [Ref: ${complaint.id}]` }
            });
            alertsCreated.push(newAlert);
            const overdueReq = await db_1.default.complianceRequirement.findFirst({ where: { serialNo: 28 } });
            if (overdueReq) {
                const audit = await db_1.default.complianceAudit.create({
                    data: {
                        tenantId,
                        requirementId: overdueReq.id,
                        status: 'NON_COMPLIANT',
                        officerRemarks: `System auto-generated: Complaint ${complaint.id} unresolved > 21 days.`
                    }
                });
                await db_1.default.penalty.create({
                    data: {
                        tenantId,
                        auditId: audit.id,
                        amount: 100,
                        reason: `Complaint resolution timeline exceeded for complaint ${complaint.id}`,
                        status: 'PENDING_PAYMENT'
                    }
                });
            }
        }
    }
    // 6. PREEMPTIVE COMPLIANCE AUDIT GENERATION & OVERDUE STATUS MANAGEMENT
    const activeRules = await db_1.default.complianceRequirement.findMany({ where: { isActive: true } });
    const now = new Date();
    for (const rule of activeRules) {
        const initialNextDueDate = (0, complianceDateHelper_1.calculateNextDueDate)(rule.frequencyType, rule.serialNo, new Date(), tenant.createdAt);
        if (!initialNextDueDate)
            continue;
        // Find the latest audit for this requirement and tenant
        let latestAudit = await db_1.default.complianceAudit.findFirst({
            where: {
                tenantId,
                requirementId: rule.id
            },
            orderBy: { dueDate: 'desc' }
        });
        if (!latestAudit) {
            // Create initial pending audit
            latestAudit = await db_1.default.complianceAudit.create({
                data: {
                    tenantId,
                    requirementId: rule.id,
                    status: 'PENDING',
                    dueDate: initialNextDueDate
                }
            });
        }
        // Catch-up Loop: process overdue audits and stack penalties
        let keepCatchingUp = true;
        while (keepCatchingUp) {
            // If latestAudit is in the future or current period (not past due), we are caught up
            if (!latestAudit.dueDate || latestAudit.dueDate.getTime() >= now.getTime()) {
                keepCatchingUp = false;
                // If the latest audit is ALREADY resolved, spawn the next one preemptively
                if (latestAudit.status === 'COMPLIANT' || latestAudit.status === 'PENALTY_RESOLVED' || latestAudit.status === 'PENALIZED') {
                    if (latestAudit.dueDate) {
                        const nextRefDate = new Date(latestAudit.dueDate.getTime() + 24 * 60 * 60 * 1000);
                        const nextDueDate = (0, complianceDateHelper_1.calculateNextDueDate)(rule.frequencyType, rule.serialNo, nextRefDate);
                        if (nextDueDate && nextDueDate.getTime() > latestAudit.dueDate.getTime()) {
                            const existingNext = await db_1.default.complianceAudit.findFirst({
                                where: { tenantId, requirementId: rule.id, dueDate: nextDueDate }
                            });
                            if (!existingNext) {
                                await db_1.default.complianceAudit.create({
                                    data: { tenantId, requirementId: rule.id, status: 'PENDING', dueDate: nextDueDate }
                                });
                            }
                        }
                    }
                }
                break;
            }
            // At this point, latestAudit is past due.
            // 1. Mark as OVERDUE and apply penalty if it's still PENDING
            if (latestAudit.status === 'PENDING') {
                latestAudit = await db_1.default.complianceAudit.update({
                    where: { id: latestAudit.id },
                    data: { status: 'OVERDUE' }
                });
                // Trigger penalty if defined
                if (rule.penaltyAmount) {
                    const amountMatch = rule.penaltyAmount.replace(/,/g, '').match(/\d+/);
                    const penaltyAmt = amountMatch ? parseFloat(amountMatch[0]) : 5000.0;
                    const existingPenalty = await db_1.default.penalty.findUnique({
                        where: { auditId: latestAudit.id }
                    });
                    if (!existingPenalty) {
                        await db_1.default.penalty.create({
                            data: {
                                tenantId,
                                auditId: latestAudit.id,
                                amount: penaltyAmt,
                                reason: `Overdue compliance: ${rule.requirement}`,
                                status: 'PENDING_PAYMENT'
                            }
                        });
                    }
                }
            }
            // 2. Generate the next period's audit REGARDLESS of its resolution status
            const nextRefDate = new Date(latestAudit.dueDate.getTime() + 24 * 60 * 60 * 1000);
            const nextDueDate = (0, complianceDateHelper_1.calculateNextDueDate)(rule.frequencyType, rule.serialNo, nextRefDate);
            // Guard against infinite loop
            if (!nextDueDate || nextDueDate.getTime() <= latestAudit.dueDate.getTime()) {
                keepCatchingUp = false;
                break;
            }
            // Check if audit for nextDueDate already exists
            const existingNext = await db_1.default.complianceAudit.findFirst({
                where: { tenantId, requirementId: rule.id, dueDate: nextDueDate }
            });
            if (existingNext) {
                latestAudit = existingNext;
            }
            else {
                // Create new PENDING audit for the next period
                latestAudit = await db_1.default.complianceAudit.create({
                    data: {
                        tenantId,
                        requirementId: rule.id,
                        status: 'PENDING',
                        dueDate: nextDueDate
                    }
                });
            }
        }
    }
    return alertsCreated;
};
exports.checkComplianceForTenant = checkComplianceForTenant;
const runComplianceCheck = async (req, res) => {
    try {
        let tenantId = req.user.tenantId;
        if (!tenantId && req.user.role === 'SUPER_ADMIN') {
            const queryTenant = req.query.tenantId;
            if (queryTenant) {
                const alertsCreated = await (0, exports.checkComplianceForTenant)(queryTenant);
                return res.status(200).json({ success: true, message: 'Compliance verification completed successfully.', alertsGenerated: alertsCreated.length, data: alertsCreated });
            }
            else {
                const tenants = await db_1.default.tenant.findMany({ where: { deletedAt: null } });
                let totalAlerts = 0;
                for (const t of tenants) {
                    const alerts = await (0, exports.checkComplianceForTenant)(t.id);
                    totalAlerts += alerts.length;
                }
                return res.status(200).json({ success: true, message: 'Compliance verification completed for all companies.', alertsGenerated: totalAlerts });
            }
        }
        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Invalid tenant context' });
        }
        const alertsCreated = await (0, exports.checkComplianceForTenant)(tenantId);
        return res.status(200).json({ success: true, message: 'Compliance verification completed successfully.', alertsGenerated: alertsCreated.length, data: alertsCreated });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.runComplianceCheck = runComplianceCheck;
const getAlerts = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const alerts = await db_1.default.complianceAlert.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
        const alertsWithPenalty = await Promise.all(alerts.map(async (alert) => {
            if (alert.alertType === 'PENALTY_LEVIED' && alert.remarks) {
                const match = alert.remarks.match(/Associated with Audit ID:\s*([a-f0-9\-]+)/i);
                if (match && match[1]) {
                    const auditId = match[1].trim();
                    const penalty = await db_1.default.penalty.findFirst({
                        where: { auditId }
                    });
                    if (penalty) {
                        return {
                            ...alert,
                            penaltyId: penalty.id
                        };
                    }
                }
            }
            return alert;
        }));
        return res.status(200).json({ success: true, data: alertsWithPenalty });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getAlerts = getAlerts;
const closeAlert = async (req, res) => {
    const { id } = req.params;
    const { remarks, actualDepositAmount } = req.body;
    const proofUrl = req.file ? `/uploads/compliance/${req.file.filename}` : undefined;
    try {
        const alert = await db_1.default.complianceAlert.findUnique({ where: { id } });
        if (!alert)
            return res.status(404).json({ success: false, message: 'Compliance alert not found.' });
        // Validate if client's KYC/Agreement/PAN is complete for DB-backed alerts
        if (alert.alertType === 'AGREEMENT_MISSING' || alert.alertType === 'KYC_MISSING' || alert.alertType === 'KYC_FAILED' || alert.alertType === 'PAN_MISSING') {
            if (!alert.clientId) {
                return res.status(400).json({ success: false, message: 'This alert is not linked to a valid client ID.' });
            }
            const client = await db_1.default.client.findUnique({
                where: { id: alert.clientId },
                include: { agreements: true }
            });
            if (!client) {
                return res.status(404).json({ success: false, message: 'Client associated with this alert not found.' });
            }
            const isKycComplete = !['PENDING_ONBOARDING', 'KYC_PENDING', 'KYC_FAILED'].includes(client.status);
            const isAgreementComplete = client.agreements.length > 0;
            const isPanComplete = !!(client.pan && client.pan.trim() !== '');
            if (alert.alertType === 'AGREEMENT_MISSING') {
                if (!isKycComplete || !isAgreementComplete) {
                    let errorMsg = 'Cannot resolve alert: ';
                    if (!isKycComplete && !isAgreementComplete) {
                        errorMsg += "Client's KYC and signed agreement are both incomplete.";
                    }
                    else if (!isKycComplete) {
                        errorMsg += "Client's KYC verification is incomplete.";
                    }
                    else {
                        errorMsg += "Client's Service Agreement has not been signed.";
                    }
                    return res.status(400).json({ success: false, message: errorMsg });
                }
            }
            else if (alert.alertType === 'KYC_MISSING' || alert.alertType === 'KYC_FAILED') {
                if (!isKycComplete) {
                    return res.status(400).json({ success: false, message: "Cannot resolve alert: Client's KYC verification is incomplete." });
                }
            }
            else if (alert.alertType === 'PAN_MISSING') {
                if (!isPanComplete) {
                    return res.status(400).json({ success: false, message: "Cannot resolve alert: Client's PAN details are missing." });
                }
            }
        }
        const result = await db_1.default.$transaction(async (tx) => {
            if (alert.alertType === 'DEPOSIT_LOW' && actualDepositAmount) {
                await tx.tenant.update({ where: { id: alert.tenantId }, data: { depositAmount: { increment: parseFloat(actualDepositAmount) } } });
            }
            const updatedAlert = await tx.complianceAlert.update({ where: { id }, data: { status: 'CLOSED', remarks, proofUrl, closedAt: new Date() } });
            if (alert.alertType === 'DEADLINE_UPCOMING') {
                const requirements = await tx.complianceRequirement.findMany();
                const matchedReq = requirements.find(r => alert.description.includes(r.requirement));
                if (matchedReq) {
                    const tenant = await tx.tenant.findUnique({ where: { id: alert.tenantId } });
                    const p = (0, complianceDateHelper_1.getCompliancePeriod)(matchedReq.frequencyType, new Date(), tenant?.createdAt);
                    let audit = await tx.complianceAudit.findFirst({
                        where: { tenantId: alert.tenantId, requirementId: matchedReq.id, dueDate: { gte: p.startDate, lte: p.dueDate } }
                    });
                    if (!audit) {
                        await tx.complianceAudit.create({
                            data: { tenantId: alert.tenantId, requirementId: matchedReq.id, status: 'COMPLIANT', officerRemarks: remarks || 'Resolved from alerts desk', proofDocumentUrl: proofUrl, dueDate: p.dueDate, resolvedAt: new Date(), updatedByUserId: req.user.id }
                        });
                    }
                    else if (audit.status !== 'COMPLIANT') {
                        await tx.complianceAudit.update({
                            where: { id: audit.id },
                            data: { status: 'COMPLIANT', officerRemarks: remarks || 'Resolved from alerts desk', proofDocumentUrl: proofUrl || audit.proofDocumentUrl, resolvedAt: new Date(), updatedByUserId: req.user.id }
                        });
                    }
                }
            }
            return updatedAlert;
        });
        await (0, auditService_1.logAudit)({ tenantId: alert.tenantId, userId: req.user.id, action: 'UPDATE', module: 'COMPLIANCE', oldValue: alert, newValue: result, ipAddress: req.ip });
        // Write to ComplianceAuditHistory for alert resolution
        const alertTypeToSerialNo = {
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
                const requirement = await db_1.default.complianceRequirement.findFirst({ where: { serialNo } });
                const tenant = await db_1.default.tenant.findUnique({ where: { id: alert.tenantId } });
                if (requirement) {
                    const period = (0, complianceDateHelper_1.getCompliancePeriod)(requirement.frequencyType, new Date(), tenant?.createdAt);
                    let audit = await db_1.default.complianceAudit.findFirst({
                        where: { tenantId: alert.tenantId, requirementId: requirement.id, dueDate: { gte: period.startDate, lte: period.dueDate } }
                    });
                    if (!audit) {
                        audit = await db_1.default.complianceAudit.create({
                            data: { tenantId: alert.tenantId, requirementId: requirement.id, status: 'COMPLIANT', dueDate: period.dueDate, resolvedAt: new Date(), updatedByUserId: req.user.id, officerRemarks: `Auto-resolved via alert closure: ${alert.alertType}` }
                        });
                    }
                    const updaterUser = await db_1.default.user.findUnique({ where: { id: req.user.id } });
                    const updatedByName = updaterUser ? `${updaterUser.firstName} ${updaterUser.lastName}` : 'System';
                    await db_1.default.complianceAuditHistory.create({
                        data: {
                            tenantId: alert.tenantId,
                            requirementId: requirement.id,
                            auditId: audit.id,
                            previousStatus: audit.status,
                            newStatus: 'COMPLIANT',
                            officerRemarks: `Alert resolved: ${alert.alertType.replace(/_/g, ' ')}. ${remarks || ''}`,
                            proofDocumentUrl: proofUrl,
                            updatedByUserId: req.user.id,
                            updatedByName,
                            periodLabel: period.label
                        }
                    });
                }
            }
            catch (historyErr) {
                console.error('Failed to write alert history:', historyErr.message);
            }
        }
        return res.status(200).json({ success: true, message: 'Alert resolved successfully.', data: result });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.closeAlert = closeAlert;
// ─── SEBI CHECKLIST ────────────────────────────────────────────────────────────
const getChecklist = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
        return res.status(200).json({ success: true, data: [] });
    }
    try {
        const tenant = await db_1.default.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            return res.status(404).json({ success: false, message: 'Tenant not found.' });
        const requirements = await db_1.default.complianceRequirement.findMany({
            where: { isActive: true },
            orderBy: { serialNo: 'asc' }
        });
        const checklist = [];
        const now = new Date();
        for (const req of requirements) {
            const period = (0, complianceDateHelper_1.getCompliancePeriod)(req.frequencyType, now, tenant.createdAt);
            const audit = await db_1.default.complianceAudit.findFirst({
                where: {
                    tenantId,
                    requirementId: req.id,
                    dueDate: {
                        gte: period.startDate,
                        lte: period.dueDate
                    }
                },
                include: { penalty: true }
            });
            checklist.push({
                ...req,
                audit: audit || null,
                currentPeriod: period
            });
        }
        return res.status(200).json({ success: true, data: checklist });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getChecklist = getChecklist;
const updateAuditStatus = async (req, res) => {
    const { requirementId } = req.params;
    const { status, officerRemarks } = req.body;
    const tenantId = req.user.tenantId;
    const proofDocumentUrl = req.file ? `/uploads/compliance/${req.file.filename}` : undefined;
    try {
        const requirement = await db_1.default.complianceRequirement.findUnique({ where: { id: requirementId } });
        if (!requirement) {
            return res.status(404).json({ success: false, message: 'Compliance requirement not found.' });
        }
        const tenant = await db_1.default.tenant.findUnique({ where: { id: tenantId } });
        let parsedAmount = 5000;
        if (requirement.penaltyAmount) {
            const cleanStr = requirement.penaltyAmount.replace(/[^\d]/g, '');
            if (cleanStr) {
                parsedAmount = parseFloat(cleanStr);
            }
        }
        const period = (0, complianceDateHelper_1.getCompliancePeriod)(requirement.frequencyType, new Date(), tenant?.createdAt);
        // Find the audit record for the current period
        let audit = await db_1.default.complianceAudit.findFirst({
            where: {
                tenantId,
                requirementId,
                dueDate: {
                    gte: period.startDate,
                    lte: period.dueDate
                }
            }
        });
        const previousStatus = audit ? audit.status : 'PENDING';
        // Prevent editing if already resolved
        if (audit && (audit.status === 'COMPLIANT' || audit.status === 'PENALTY_RESOLVED')) {
            return res.status(400).json({ success: false, message: 'This compliance task has already been resolved and cannot be edited.' });
        }
        if (!audit) {
            audit = await db_1.default.complianceAudit.create({
                data: {
                    tenantId,
                    requirementId,
                    status,
                    officerRemarks,
                    proofDocumentUrl,
                    dueDate: period.dueDate,
                    resolvedAt: status === 'COMPLIANT' ? new Date() : null,
                    updatedByUserId: req.user.id
                }
            });
        }
        else {
            audit = await db_1.default.complianceAudit.update({
                where: { id: audit.id },
                data: {
                    status,
                    officerRemarks,
                    ...(proofDocumentUrl && { proofDocumentUrl }),
                    dueDate: period.dueDate,
                    resolvedAt: status === 'COMPLIANT' ? new Date() : null,
                    updatedByUserId: req.user.id
                }
            });
        }
        const updaterUser = await db_1.default.user.findUnique({
            where: { id: req.user.id }
        });
        const updatedByName = updaterUser ? `${updaterUser.firstName} ${updaterUser.lastName}` : 'System';
        // Write to ComplianceAuditHistory
        await db_1.default.complianceAuditHistory.create({
            data: {
                tenantId,
                requirementId,
                auditId: audit.id,
                previousStatus,
                newStatus: status,
                officerRemarks,
                proofDocumentUrl,
                updatedByUserId: req.user.id,
                updatedByName,
                periodLabel: period.label
            }
        });
        // Auto-levy penalty and compliance alert if marked NON_COMPLIANT
        if (status === 'NON_COMPLIANT') {
            const existingPenalty = await db_1.default.penalty.findUnique({ where: { auditId: audit.id } });
            if (!existingPenalty) {
                await db_1.default.penalty.create({
                    data: {
                        tenantId,
                        auditId: audit.id,
                        amount: parsedAmount,
                        reason: `Non-compliance with rule: ${requirement.requirement}`,
                        status: 'PENDING_PAYMENT'
                    }
                });
                await db_1.default.complianceAlert.create({
                    data: {
                        tenantId,
                        alertType: 'PENALTY_LEVIED',
                        severity: requirement.severityLevel || 'HIGH',
                        description: `SEBI Penalty Risk: Rs.${parsedAmount.toLocaleString()} can be levied for non-compliance with rule: "${requirement.requirement}". Please upload payment proof and reference to close this penalty.`,
                        status: 'OPEN',
                        remarks: `Associated with Audit ID: ${audit.id}`
                    }
                });
            }
        }
        else if (status === 'COMPLIANT') {
            // Auto-resolve any DEADLINE_UPCOMING alerts for this requirement
            await db_1.default.complianceAlert.updateMany({
                where: {
                    tenantId,
                    alertType: 'DEADLINE_UPCOMING',
                    status: 'OPEN',
                    description: { contains: requirement.requirement }
                },
                data: {
                    status: 'CLOSED',
                    remarks: 'Auto-resolved: Checklist marked as COMPLIANT.',
                    closedAt: new Date()
                }
            });
        }
        return res.status(200).json({ success: true, message: 'Compliance task resolved.', data: audit });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateAuditStatus = updateAuditStatus;
const getChecklistHistory = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
        return res.status(200).json({ success: true, data: [] });
    }
    try {
        const history = await db_1.default.complianceAuditHistory.findMany({
            where: { tenantId },
            include: {
                requirement: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return res.status(200).json({ success: true, data: history });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getChecklistHistory = getChecklistHistory;
// ─── PENALTIES ────────────────────────────────────────────────────────────────
const getPenalties = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
        return res.status(200).json({ success: true, data: [] });
    }
    try {
        const penalties = await db_1.default.penalty.findMany({
            where: { tenantId },
            include: { audit: { include: { requirement: true } } },
            orderBy: { audit: { updatedAt: 'desc' } }
        });
        return res.status(200).json({ success: true, data: penalties });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getPenalties = getPenalties;
const resolvePenalty = async (req, res) => {
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
        const penalty = await db_1.default.penalty.findUnique({
            where: { id },
            include: {
                audit: {
                    include: {
                        requirement: true
                    }
                }
            }
        });
        if (!penalty || !penalty.audit)
            return res.status(404).json({ success: false, message: 'Penalty not found.' });
        const updated = await db_1.default.penalty.update({
            where: { id },
            data: {
                status: 'PAID',
                paymentRef: resolutionType === 'Paid' ? paymentRef : 'WAIVED_COMPLIANT',
                proofUrl,
                remarks,
                paidAt: new Date()
            }
        });
        await db_1.default.complianceAudit.update({
            where: { id: penalty.auditId },
            data: { status: resolutionType.toUpperCase(), officerRemarks: `Penalty resolved as ${resolutionType}. ${remarks || ''}` }
        });
        const updaterUser = await db_1.default.user.findUnique({
            where: { id: req.user.id }
        });
        const updatedByName = updaterUser ? `${updaterUser.firstName} ${updaterUser.lastName}` : 'System';
        const period = (0, complianceDateHelper_1.getCompliancePeriod)(penalty.audit.requirement.frequencyType, penalty.audit.updatedAt || new Date());
        // Write to ComplianceAuditHistory when resolving penalty
        await db_1.default.complianceAuditHistory.create({
            data: {
                tenantId: penalty.tenantId,
                requirementId: penalty.audit.requirementId,
                auditId: penalty.auditId,
                previousStatus: penalty.audit.status,
                newStatus: resolutionType.toUpperCase(),
                officerRemarks: `Penalty paid. Ref: ${paymentRef}. ${remarks || ''}`,
                proofDocumentUrl: proofUrl,
                updatedByUserId: req.user.id,
                updatedByName,
                periodLabel: period.label
            }
        });
        // Close the corresponding compliance alert
        await db_1.default.complianceAlert.updateMany({
            where: {
                tenantId: penalty.tenantId,
                alertType: 'PENALTY_LEVIED',
                status: 'OPEN',
                remarks: { contains: penalty.auditId }
            },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                remarks: `Resolved via Penalty Payment. Ref: ${paymentRef}. ${remarks || ''}`,
                proofUrl
            }
        });
        return res.status(200).json({ success: true, message: 'Penalty resolved successfully.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.resolvePenalty = resolvePenalty;
const getMetricsForTenant = async (tenantId, res) => {
    try {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const audits = await db_1.default.complianceAudit.findMany({
            where: { tenantId },
            include: { requirement: true, penalty: true }
        });
        const upcoming = audits.filter(a => (a.status === 'PENDING' || a.status === 'OVERDUE') &&
            a.dueDate && a.dueDate >= now && a.dueDate <= thirtyDaysFromNow);
        const due = audits.filter(a => (a.status === 'PENDING' || a.status === 'OVERDUE') &&
            a.dueDate && a.dueDate >= now);
        const overdue = audits.filter(a => (a.status === 'PENDING' || a.status === 'OVERDUE') &&
            ((a.dueDate && a.dueDate < now) || a.status === 'OVERDUE'));
        const penalty = audits.filter(a => a.penalty && a.penalty.status === 'PENDING_PAYMENT');
        const closed = audits.filter(a => a.status === 'COMPLIANT' || a.status === 'PENALTY_RESOLVED');
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
                    closed: closed.length
                }
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
const getGlobalComplianceMetrics = async (res) => {
    try {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const audits = await db_1.default.complianceAudit.findMany({
            include: { requirement: true, penalty: true, tenant: true }
        });
        const upcoming = audits.filter(a => (a.status === 'PENDING' || a.status === 'OVERDUE') &&
            a.dueDate && a.dueDate >= now && a.dueDate <= thirtyDaysFromNow);
        const due = audits.filter(a => (a.status === 'PENDING' || a.status === 'OVERDUE') &&
            a.dueDate && a.dueDate >= now);
        const overdue = audits.filter(a => (a.status === 'PENDING' || a.status === 'OVERDUE') &&
            ((a.dueDate && a.dueDate < now) || a.status === 'OVERDUE'));
        const penalty = audits.filter(a => a.penalty && a.penalty.status === 'PENDING_PAYMENT');
        const closed = audits.filter(a => a.status === 'COMPLIANT' || a.status === 'PENALTY_RESOLVED');
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
                    closed: closed.length
                }
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
const getComplianceDashboardMetrics = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
        const queryTenantId = req.query.tenantId;
        if (req.user.role === 'SUPER_ADMIN' && queryTenantId) {
            return getMetricsForTenant(queryTenantId, res);
        }
        if (req.user.role === 'SUPER_ADMIN') {
            return getGlobalComplianceMetrics(res);
        }
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    }
    return getMetricsForTenant(tenantId, res);
};
exports.getComplianceDashboardMetrics = getComplianceDashboardMetrics;
const getPeriodicReportData = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const { startDate, endDate } = req.query;
        // Default to last 6 months if not provided
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), end.getMonth() - 6, end.getDate());
        const tenant = await db_1.default.tenant.findUnique({
            where: { id: tenantId },
            include: {
                users: { include: { staff: true, client: true } }
            }
        });
        if (!tenant)
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        // 1. Half Yearly Report Data
        const reportsPublished = await db_1.default.researchReport.count({
            where: {
                tenantId,
                status: 'PUBLISHED',
                publishedAt: { gte: start, lte: end }
            }
        });
        const staffMembers = await db_1.default.staff.findMany({
            where: { user: { tenantId, deletedAt: null }, status: 'ACTIVE' },
            include: { user: { include: { role: true } } }
        });
        const raCount = staffMembers.filter(s => s.user.role.name === 'RESEARCHER' || s.user.role.name === 'ADMIN').length;
        const parsCount = staffMembers.filter(s => ['PERSON_ASSOCIATED', 'SALES', 'MARKETING'].includes(s.user.role.name)).length;
        const totalEmployees = staffMembers.length;
        const complianceOfficer = staffMembers.find(s => s.user.role.name === 'COMPLIANCE_OFFICER');
        const principalOfficer = staffMembers.find(s => s.user.role.name === 'PRINCIPAL_OFFICER');
        // 2. Complaints Data
        const complaintsReceived = await db_1.default.complaint.count({
            where: { tenantId, receivedAt: { gte: start, lte: end } }
        });
        const complaintsResolved = await db_1.default.complaint.count({
            where: { tenantId, resolvedAt: { gte: start, lte: end } }
        });
        const complaintsPendingStart = await db_1.default.complaint.count({
            where: {
                tenantId,
                receivedAt: { lt: start },
                OR: [
                    { status: 'OPEN' },
                    { resolvedAt: { gte: start } }
                ]
            }
        });
        const complaintsPendingEnd = complaintsPendingStart + complaintsReceived - complaintsResolved;
        // 3. Clients and Fees
        const clientsAtStart = await db_1.default.client.count({
            where: {
                user: { tenantId, deletedAt: null },
                subscriptions: { some: { startDate: { lt: start }, endDate: { gte: start }, status: 'ACTIVE' } }
            }
        });
        const clientsAcquired = await db_1.default.client.count({
            where: {
                user: { tenantId, deletedAt: null },
                subscriptions: { some: { startDate: { gte: start, lte: end }, status: 'ACTIVE' } }
            }
        });
        const clientsAtEnd = await db_1.default.client.count({
            where: {
                user: { tenantId, deletedAt: null },
                subscriptions: { some: { startDate: { lte: end }, endDate: { gte: end }, status: 'ACTIVE' } }
            }
        });
        let clientsExpired = clientsAtStart + clientsAcquired - clientsAtEnd;
        if (clientsExpired < 0)
            clientsExpired = 0;
        const payments = await db_1.default.payment.aggregate({
            where: { tenantId, status: 'SUCCESS', createdAt: { gte: start, lte: end } },
            _sum: { amount: true }
        });
        const feesCollected = payments._sum.amount || 0;
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
                allStaff: staffMembers.map(s => ({
                    name: s.name,
                    email: s.email,
                    role: s.user.role.name,
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPeriodicReportData = getPeriodicReportData;
const getPeriodicReportMeta = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const tenant = await db_1.default.tenant.findUnique({
            where: { id: tenantId },
            select: { createdAt: true }
        });
        if (!tenant)
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        // The registration date's financial year
        const regDate = tenant.createdAt;
        const regFinYear = regDate.getMonth() >= 3 ? regDate.getFullYear() : regDate.getFullYear() - 1;
        return res.status(200).json({ success: true, data: { startYear: regFinYear } });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPeriodicReportMeta = getPeriodicReportMeta;
