import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function generateMockAlerts() {
  try {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return console.log('No tenant found.');
    const tenantId = tenant.id;

    // 1. SEBI Expiry
    await prisma.complianceAlert.create({
      data: {
        tenantId,
        alertType: 'CERTIFICATE_EXPIRY',
        severity: 'HIGH',
        description: 'SEBI Certificate validity expires in 5 days. Please renew immediately.',
        status: 'OPEN'
      }
    });

    // 2. Staff NISM Expiry
    await prisma.complianceAlert.create({
      data: {
        tenantId,
        alertType: 'NISM_EXPIRY',
        severity: 'MEDIUM',
        description: 'NISM Certificate of Staff "Rahul Verma" expires in 15 days.',
        status: 'OPEN'
      }
    });

    // 3. Deposit Limit
    await prisma.complianceAlert.create({
      data: {
        tenantId,
        alertType: 'DEPOSIT_LOW',
        severity: 'HIGH',
        description: 'Minimum Base Capital Deposit requirement not met. Required: Rs. 5,00,000, Actual: Rs. 1,00,000.',
        status: 'OPEN'
      }
    });

    // 4. Client KYC Missing
    await prisma.complianceAlert.create({
      data: {
        tenantId,
        alertType: 'KYC_MISSING',
        severity: 'MEDIUM',
        description: 'Client "Amit Kumar" (PAN: ABCDE1234F) has an active subscription but incomplete KYC.',
        status: 'OPEN'
      }
    });

    // 5. Part-Time Limit Exceeded
    const ptAlert = await prisma.complianceAlert.create({
      data: {
        tenantId,
        alertType: 'PART_TIME_LIMIT_EXCEEDED',
        severity: 'HIGH',
        description: 'Part-Time RA limit exceeded. Active clients count is 78 (Limit: 75). You must apply for Full-Time RA.',
        status: 'OPEN'
      }
    });

    // 6. Penalty for Part-Time Limit
    const rule = await prisma.complianceRequirement.findFirst({ where: { serialNo: 12 } }); // Part-time rule
    if (rule) {
      await prisma.complianceAudit.create({
        data: {
          tenantId,
          requirementId: rule.id,
          status: 'PENALTY_PENDING',
          dueDate: new Date(),
          officerRemarks: ptAlert.id, // Link to the alert
          penalty: {
            create: {
              tenantId,
              amount: 10000,
              reason: 'System Auto-Penalty: Part-Time client limit of 75 exceeded.',
            }
          }
        }
      });
    } else {
      // Create generic penalty if rule 12 not found
      const genericRule = await prisma.complianceRequirement.findFirst();
      if (genericRule) {
        await prisma.complianceAudit.create({
          data: {
            tenantId,
            requirementId: genericRule.id,
            status: 'PENALTY_PENDING',
            dueDate: new Date(),
            officerRemarks: ptAlert.id,
            penalty: {
              create: {
                tenantId,
                amount: 10000,
                reason: 'System Auto-Penalty: Part-Time client limit of 75 exceeded.',
              }
            }
          }
        });
      }
    }

    console.log('Successfully generated all types of mock alerts and penalties!');
  } catch (err) {
    console.error('Error generating alerts:', err);
  } finally {
    await prisma.$disconnect();
  }
}

generateMockAlerts();
