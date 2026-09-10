"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../config/db");
const initCronJobs = () => {
    // Run every night at midnight
    node_cron_1.default.schedule('0 0 * * *', async () => {
        try {
            const now = new Date();
            // Find all pending audits with a due date
            const pendingAudits = await db_1.ComplianceAudit.find({
                status: 'PENDING',
                dueDate: { $ne: null }
            })
                .populate('requirement')
                .populate('tenant')
                .lean();
            for (const audit of pendingAudits) {
                if (!audit.dueDate)
                    continue;
                const timeDiff = new Date(audit.dueDate).getTime() - now.getTime();
                const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                // Penalty logic if deadline missed
                if (daysRemaining < 0) {
                    // Progressive Penalty Check
                    const penaltyText = audit.requirement?.penaltyAmount?.toLowerCase() || '';
                    const isProgressive = penaltyText.includes('second violation') || penaltyText.includes('2nd');
                    let pastViolationsCount = 0;
                    if (isProgressive) {
                        pastViolationsCount = await db_1.ComplianceAudit.countDocuments({
                            tenantId: audit.tenantId,
                            requirementId: audit.requirementId,
                            status: { $in: ['WARNING_ISSUED', 'WARNING_RESOLVED', 'PENALIZED', 'PENALTY_RESOLVED'] }
                        });
                    }
                    if (isProgressive && pastViolationsCount === 0) {
                        // First time missing it -> WARNING
                        await db_1.ComplianceAudit.findByIdAndUpdate(audit._id, {
                            status: 'WARNING_ISSUED'
                        });
                        await db_1.ComplianceAlert.create({
                            tenantId: audit.tenantId,
                            alertType: 'WARNING',
                            severity: 'HIGH',
                            description: `First Violation Warning: You missed the deadline for "${audit.requirement?.requirement}". Please provide a consent/explanation document to close this warning.`
                        });
                    }
                    else {
                        await db_1.ComplianceAudit.findByIdAndUpdate(audit._id, {
                            status: 'PENALIZED'
                        });
                        let amount = 5000;
                        if (audit.requirement?.penaltyAmount) {
                            const match = audit.requirement.penaltyAmount.match(/\d+(?:,\d+)*(?:\.\d+)?/);
                            if (match)
                                amount = parseFloat(match[0].replace(/,/g, ''));
                        }
                        await db_1.Penalty.create({
                            auditId: audit._id,
                            tenantId: audit.tenantId,
                            amount: amount,
                            reason: `Missed Deadline for: ${audit.requirement?.requirement}`,
                            status: 'PENDING_PAYMENT'
                        });
                    }
                    // Mark existing open upcoming alerts as closed to avoid clutter
                    await db_1.ComplianceAlert.updateMany({
                        tenantId: audit.tenantId,
                        alertType: 'DEADLINE_UPCOMING',
                        description: new RegExp(audit.requirement?.requirement || '', 'i')
                    }, {
                        status: 'CLOSED',
                        remarks: 'Deadline passed.'
                    });
                    continue;
                }
            }
        }
        catch (error) {
            console.error('[CRON] Error running compliance check:', error);
        }
    });
};
exports.initCronJobs = initCronJobs;
