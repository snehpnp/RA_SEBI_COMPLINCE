import { PrismaClient } from '@prisma/client';
import { calculateNextDueDate, getCompliancePeriod } from '../src/utils/complianceDateHelper';

const prisma = new PrismaClient();

async function seedHistory() {
  const tenant = await prisma.tenant.findFirst({ where: { deletedAt: null } });
  if (!tenant) return console.log('No tenant found.');

  console.log(`Seeding history for Tenant: ${tenant.companyName}`);

  // 1. Wipe existing
  await prisma.penalty.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.complianceAuditHistory.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.complianceAudit.deleteMany({ where: { tenantId: tenant.id } });

  const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: { name: 'TENANT_ADMIN' } } });
  const adminId = admin ? admin.id : 'SYSTEM';

  const requirements = await prisma.complianceRequirement.findMany({ where: { isActive: true } });

  let startDate = new Date(2022, 3, 1); // April 1, 2022
  const now = new Date();

  // Create random statuses
  const getRandomStatus = () => {
    const rand = Math.random();
    if (rand < 0.8) return 'COMPLIANT';
    if (rand < 0.9) return 'OVERDUE';
    return 'PENALTY_RESOLVED';
  };

  for (const rule of requirements) {
    let refDate = new Date(startDate);
    
    // Check if initialNextDueDate is valid
    let nextDueDate = calculateNextDueDate(rule.frequencyType, rule.serialNo, refDate);
    if (!nextDueDate) continue;

    // Loop through time
    while (nextDueDate && nextDueDate.getTime() < now.getTime()) {
      const period = getCompliancePeriod(rule.frequencyType, refDate);

      const status = getRandomStatus();
      
      const audit = await prisma.complianceAudit.create({
        data: {
          tenantId: tenant.id,
          requirementId: rule.id,
          status,
          dueDate: nextDueDate,
          resolvedAt: status !== 'OVERDUE' ? new Date(nextDueDate.getTime() - 2 * 24 * 60 * 60 * 1000) : null,
          updatedByUserId: adminId,
          officerRemarks: status === 'COMPLIANT' ? 'Completed on time' : (status === 'OVERDUE' ? 'Missed deadline' : 'Penalty paid and resolved')
        }
      });

      await prisma.complianceAuditHistory.create({
        data: {
          tenantId: tenant.id,
          requirementId: rule.id,
          auditId: audit.id,
          previousStatus: 'PENDING',
          newStatus: status,
          officerRemarks: audit.officerRemarks,
          updatedByUserId: adminId,
          updatedByName: 'Seeder',
          periodLabel: period.label,
          createdAt: nextDueDate // Fake the creation date
        }
      });

      if (status === 'OVERDUE' || status === 'PENALTY_RESOLVED') {
        const amountMatch = rule.penaltyAmount?.replace(/,/g, '').match(/\d+/);
        const penaltyAmt = amountMatch ? parseFloat(amountMatch[0]) : 5000.0;

        await prisma.penalty.create({
          data: {
            tenantId: tenant.id,
            auditId: audit.id,
            amount: penaltyAmt,
            reason: `Overdue compliance: ${rule.requirement}`,
            status: status === 'OVERDUE' ? 'PENDING_PAYMENT' : 'PAID'
          }
        });
      }

      refDate = new Date(nextDueDate.getTime() + 24 * 60 * 60 * 1000); // add 1 day
      const newDueDate = calculateNextDueDate(rule.frequencyType, rule.serialNo, refDate);
      if (!newDueDate || newDueDate.getTime() <= nextDueDate.getTime()) {
        break; // Infinite loop guard
      }
      nextDueDate = newDueDate;
    }
    
    // Create the current pending one
    if (nextDueDate && nextDueDate.getTime() >= now.getTime()) {
      await prisma.complianceAudit.create({
        data: {
          tenantId: tenant.id,
          requirementId: rule.id,
          status: 'PENDING',
          dueDate: nextDueDate
        }
      });
    }
  }

  console.log('Seeding completed successfully!');
}

seedHistory().catch(console.error).finally(() => prisma.$disconnect());
