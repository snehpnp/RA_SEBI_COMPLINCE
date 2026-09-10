import { centralModels, centralConnection } from '../src/services/tenantConnectionManager';
import { calculateNextDueDate, getCompliancePeriod } from '../src/utils/complianceDateHelper';

async function seedHistory() {
  const tenant = await centralModels.Tenant.findOne({ deletedAt: null }).lean();
  if (!tenant) return console.log('No tenant found.');

  // 1. Wipe existing
  await centralModels.Penalty.deleteMany({ tenantId: tenant._id });
  await centralModels.ComplianceAuditHistory.deleteMany({ tenantId: tenant._id });
  await centralModels.ComplianceAudit.deleteMany({ tenantId: tenant._id });

  const adminRole = await centralModels.Role.findOne({ name: 'ADMIN' }).lean();
  const admin = await centralModels.User.findOne({
    tenantId: tenant._id,
    ...(adminRole ? { roleId: adminRole._id } : {})
  }).lean();
  const adminId = admin ? admin._id : null;

  const requirements = await centralModels.ComplianceRequirement.find({ isActive: true }).lean();

  let startDate = new Date(2022, 3, 1);
  const now = new Date();

  const getRandomStatus = () => {
    const rand = Math.random();
    if (rand < 0.8) return 'COMPLIANT';
    if (rand < 0.9) return 'OVERDUE';
    return 'PENALTY_RESOLVED';
  };

  for (const rule of requirements) {
    let refDate = new Date(startDate);
    
    let nextDueDate = calculateNextDueDate(rule.frequencyType, rule.serialNo, refDate);
    if (!nextDueDate) continue;

    while (nextDueDate && nextDueDate.getTime() < now.getTime()) {
      const period = getCompliancePeriod(rule.frequencyType, refDate);
      const status = getRandomStatus();
      
      const audit = await centralModels.ComplianceAudit.create({
        tenantId: tenant._id,
        requirementId: rule._id,
        status,
        dueDate: nextDueDate,
        resolvedAt: status !== 'OVERDUE' ? new Date(nextDueDate.getTime() - 2 * 24 * 60 * 60 * 1000) : null,
        updatedByUserId: adminId,
        officerRemarks: status === 'COMPLIANT' ? 'Completed on time' : (status === 'OVERDUE' ? 'Missed deadline' : 'Penalty paid and resolved')
      });

      await centralModels.ComplianceAuditHistory.create({
        tenantId: tenant._id,
        requirementId: rule._id,
        auditId: audit._id,
        previousStatus: 'PENDING',
        newStatus: status,
        officerRemarks: audit.officerRemarks,
        updatedByUserId: adminId,
        updatedByName: 'Seeder',
        periodLabel: period.label,
        createdAt: nextDueDate
      });

      if (status === 'OVERDUE' || status === 'PENALTY_RESOLVED') {
        const amountMatch = rule.penaltyAmount?.replace(/,/g, '').match(/\d+/);
        const penaltyAmt = amountMatch ? parseFloat(amountMatch[0]) : 5000.0;

        await centralModels.Penalty.create({
          tenantId: tenant._id,
          auditId: audit._id,
          amount: penaltyAmt,
          reason: `Overdue compliance: ${rule.requirement}`,
          status: status === 'OVERDUE' ? 'PENDING_PAYMENT' : 'PAID'
        });
      }

      refDate = new Date(nextDueDate.getTime() + 24 * 60 * 60 * 1000);
      const newDueDate = calculateNextDueDate(rule.frequencyType, rule.serialNo, refDate);
      if (!newDueDate || newDueDate.getTime() <= nextDueDate.getTime()) {
        break;
      }
      nextDueDate = newDueDate;
    }
    
    if (nextDueDate && nextDueDate.getTime() >= now.getTime()) {
      await centralModels.ComplianceAudit.create({
        tenantId: tenant._id,
        requirementId: rule._id,
        status: 'PENDING',
        dueDate: nextDueDate
      });
    }
  }

  console.log('History seeded successfully.');
  await centralConnection.close();
}

seedHistory().catch(console.error);
