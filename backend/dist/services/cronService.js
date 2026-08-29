"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = __importDefault(require("../config/db"));
const initCronJobs = () => {
    // Run every night at midnight
    node_cron_1.default.schedule('0 0 * * *', async () => {
        try {
            const now = new Date();
            // Find all pending audits with a due date
            const pendingAudits = await db_1.default.complianceAudit.findMany({
                where: {
                    status: 'PENDING',
                    dueDate: { not: null }
                },
                include: {
                    requirement: true,
                    tenant: true
                }
            });
            for (const audit of pendingAudits) {
                if (!audit.dueDate)
                    continue;
                const timeDiff = audit.dueDate.getTime() - now.getTime();
                const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                // Penalty logic if deadline missed
                if (daysRemaining < 0) {
                    // Progressive Penalty Check
                    const penaltyText = audit.requirement.penaltyAmount?.toLowerCase() || '';
                    const isProgressive = penaltyText.includes('second violation') || penaltyText.includes('2nd');
                    let pastViolationsCount = 0;
                    if (isProgressive) {
                        pastViolationsCount = await db_1.default.complianceAudit.count({
                            where: {
                                tenantId: audit.tenantId,
                                requirementId: audit.requirementId,
                                status: { in: ['WARNING_ISSUED', 'WARNING_RESOLVED', 'PENALIZED', 'PENALTY_RESOLVED'] }
                            }
                        });
                    }
                    if (isProgressive && pastViolationsCount === 0) {
                        // First time missing it -> WARNING
                        await db_1.default.complianceAudit.update({
                            where: { id: audit.id },
                            data: { status: 'WARNING_ISSUED' }
                        });
                        await db_1.default.complianceAlert.create({
                            data: {
                                tenantId: audit.tenantId,
                                alertType: 'WARNING',
                                severity: 'HIGH',
                                description: `First Violation Warning: You missed the deadline for "${audit.requirement.requirement}". Please provide a consent/explanation document to close this warning.`
                            }
                        });
                    }
                    else {
                        await db_1.default.complianceAudit.update({
                            where: { id: audit.id },
                            data: { status: 'PENALIZED' }
                        });
                        let amount = 5000;
                        if (audit.requirement.penaltyAmount) {
                            const match = audit.requirement.penaltyAmount.match(/\d+(?:,\d+)*(?:\.\d+)?/);
                            if (match)
                                amount = parseFloat(match[0].replace(/,/g, ''));
                        }
                        await db_1.default.penalty.create({
                            data: {
                                auditId: audit.id,
                                tenantId: audit.tenantId,
                                amount: amount,
                                reason: `Missed Deadline for: ${audit.requirement.requirement}`,
                                status: 'PENDING_PAYMENT'
                            }
                        });
                    }
                    // Mark existing open upcoming alerts as closed to avoid clutter
                    await db_1.default.complianceAlert.updateMany({
                        where: { tenantId: audit.tenantId, alertType: 'DEADLINE_UPCOMING', description: { contains: audit.requirement.requirement } },
                        data: { status: 'CLOSED', remarks: 'Deadline passed.' }
                    });
                    continue;
                }
                /*
                // Notification / Alert Generation Logic disabled as per user request to only show DB data-related alerts
                const thresholds = getAlertThresholdsForFrequency(audit.requirement.frequency);
                let severity: 'LOW' | 'MODERATE' | 'HIGH' | null = null;
                let alertMessage = '';
        
                if (daysRemaining <= thresholds.high) {
                  severity = 'HIGH';
                  alertMessage = `CRITICAL: ${audit.requirement.requirement} is due in ${daysRemaining} days.`;
                } else if (daysRemaining <= thresholds.moderate) {
                  severity = 'MODERATE';
                  alertMessage = `WARNING: ${audit.requirement.requirement} is due in ${daysRemaining} days.`;
                } else if (daysRemaining <= thresholds.low) {
                  severity = 'LOW';
                  alertMessage = `UPCOMING: ${audit.requirement.requirement} is due in ${daysRemaining} days.`;
                }
        
                if (severity) {
                  const existingAlert = await prisma.complianceAlert.findFirst({
                    where: {
                      tenantId: audit.tenantId,
                      alertType: 'DEADLINE_UPCOMING',
                      description: { contains: audit.requirement.requirement },
                      status: 'OPEN'
                    }
                  });
        
                  if (existingAlert) {
                    if (existingAlert.severity !== severity || existingAlert.description !== alertMessage) {
                      await prisma.complianceAlert.update({
                        where: { id: existingAlert.id },
                        data: { severity, description: alertMessage }
                      });
                    }
                  } else {
                    await prisma.complianceAlert.create({
                      data: {
                        tenantId: audit.tenantId,
                        alertType: 'DEADLINE_UPCOMING',
                        severity,
                        description: alertMessage
                      }
                    });
                  }
                }
                */
            }
        }
        catch (error) {
            console.error('[CRON] Error running compliance check:', error);
        }
    });
};
exports.initCronJobs = initCronJobs;
