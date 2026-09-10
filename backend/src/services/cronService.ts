import cron from 'node-cron';
import { ComplianceAudit, ComplianceAlert, Penalty } from '../config/db';

export const initCronJobs = () => {
  // Run every night at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();
      // Find all pending audits with a due date
      const pendingAudits: any[] = await ComplianceAudit.find({
        status: 'PENDING',
        dueDate: { $ne: null }
      })
        .populate('requirement')
        .populate('tenant')
        .lean();

      for (const audit of pendingAudits) {
        if (!audit.dueDate) continue;

        const timeDiff = new Date(audit.dueDate).getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Penalty logic if deadline missed
        if (daysRemaining < 0) {
          // Progressive Penalty Check
          const penaltyText = audit.requirement?.penaltyAmount?.toLowerCase() || '';
          const isProgressive = penaltyText.includes('second violation') || penaltyText.includes('2nd');

          let pastViolationsCount = 0;
          if (isProgressive) {
            pastViolationsCount = await ComplianceAudit.countDocuments({
              tenantId: audit.tenantId,
              requirementId: audit.requirementId,
              status: { $in: ['WARNING_ISSUED', 'WARNING_RESOLVED', 'PENALIZED', 'PENALTY_RESOLVED'] }
            });
          }

          if (isProgressive && pastViolationsCount === 0) {
            // First time missing it -> WARNING
            await ComplianceAudit.findByIdAndUpdate(audit._id, {
              status: 'WARNING_ISSUED'
            });

            await ComplianceAlert.create({
              tenantId: audit.tenantId,
              alertType: 'WARNING',
              severity: 'HIGH',
              description: `First Violation Warning: You missed the deadline for "${audit.requirement?.requirement}". Please provide a consent/explanation document to close this warning.`
            });
          } else {
            await ComplianceAudit.findByIdAndUpdate(audit._id, {
              status: 'PENALIZED'
            });

            let amount = 5000;
            if (audit.requirement?.penaltyAmount) {
              const match = audit.requirement.penaltyAmount.match(/\d+(?:,\d+)*(?:\.\d+)?/);
              if (match) amount = parseFloat(match[0].replace(/,/g, ''));
            }

            await Penalty.create({
              auditId: audit._id,
              tenantId: audit.tenantId,
              amount: amount,
              reason: `Missed Deadline for: ${audit.requirement?.requirement}`,
              status: 'PENDING_PAYMENT'
            });
          }

          // Mark existing open upcoming alerts as closed to avoid clutter
          await ComplianceAlert.updateMany(
            {
              tenantId: audit.tenantId,
              alertType: 'DEADLINE_UPCOMING',
              description: new RegExp(audit.requirement?.requirement || '', 'i')
            },
            {
              status: 'CLOSED',
              remarks: 'Deadline passed.'
            }
          );
          continue;
        }
      }
    } catch (error) {
      console.error('[CRON] Error running compliance check:', error);
    }
  });
};
