import prisma from '../config/db';
import bcrypt from 'bcryptjs';
import { checkComplianceForTenant } from '../controllers/complianceController';
import { getAlertThresholdsForFrequency } from '../utils/complianceDateHelper';

async function main() {
  const email = 'info@stockmarket.com';
  let tenant = await prisma.tenant.findUnique({ where: { email } });
  
  if (!tenant) {
    console.log('Tenant not found. Creating STOCK MARKET...');
    tenant = await prisma.tenant.create({
      data: {
        companyName: 'STOCK MARKET',
        email,
        pan: 'ABCDE1234F',
        gst: '22AAAAA0000A1Z5',
        mobile: '9876543210',
        sebiRegistration: 'INH000000001',
        address: '123 Market St, Mumbai'
      }
    });

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Stock',
        lastName: 'Admin',
        mobile: '9876543210',
        email,
        passwordHash: hashedPassword,
        roleId: adminRole!.id,
        status: 'ACTIVE'
      }
    });
    console.log('Created Tenant & Admin user.');
  } else {
    console.log('Tenant found.');
  }

  // Find compliance officer user
  const coRole = await prisma.role.findUnique({ where: { name: 'COMPLIANCE_OFFICER' } });
  let officer = await prisma.user.findFirst({ where: { tenantId: tenant.id, roleId: coRole!.id } });
  if (!officer) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);
    officer = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Stock',
        lastName: 'Officer',
        mobile: '9876543210',
        email: 'officer@stockmarket.com',
        passwordHash: hashedPassword,
        roleId: coRole!.id,
        status: 'ACTIVE'
      }
    });
    console.log('Created Officer user.');
  }

  console.log('Running compliance sweep to generate audits...');
  await checkComplianceForTenant(tenant.id);

  console.log('Simulating CRON thresholds generation...');
  const pendingAudits = await prisma.complianceAudit.findMany({
    where: { tenantId: tenant.id, status: 'PENDING', dueDate: { not: null } },
    include: { requirement: true }
  });

  const now = new Date();
  for (const audit of pendingAudits) {
    const timeDiff = audit.dueDate!.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
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
      await prisma.complianceAlert.create({
        data: {
          tenantId: audit.tenantId,
          alertType: 'DEADLINE_UPCOMING',
          severity,
          description: alertMessage
        }
      });
      console.log(`Created alert: ${severity} - ${alertMessage}`);
    } else {
      // Force an alert anyway for testing?
      await prisma.complianceAlert.create({
        data: {
          tenantId: audit.tenantId,
          alertType: 'DEADLINE_UPCOMING',
          severity: 'LOW',
          description: `TESTING UPCOMING: ${audit.requirement.requirement} is due in ${daysRemaining} days.`
        }
      });
      console.log(`Forced alert for testing: ${audit.requirement.serialNo}`);
    }
  }

  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
