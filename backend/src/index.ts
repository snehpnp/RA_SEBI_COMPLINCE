process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import cron from 'node-cron';
import router from './routes/api';
import prisma from './config/db';
import { calculateCompleteness } from './controllers/adminController';
import { initCronJobs } from './services/cronService';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerDocument = YAML.load(path.join(__dirname, '../swagger-output.yml'));


const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allow serving files to external domains locally
}));
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploads as Static Folder
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes mapping
app.use('/api/v1', router);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    res.status(200).json({ success: true, message: 'Server is healthy and connected to MongoDB.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Database connection failed', errors: [error.message] });
  }
});

// Root route
app.get('/', (req: express.Request, res: express.Response) => {
  res.send('Research Analyst Governance & Compliance Platform (RAGCP) API Server');
});

// Standard Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: [err.message]
  });
});

// Background Cron Jobs
// Run daily compliance check (Deposit levels, SEBI/NISM exipires, missing agreements)
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily automated compliance sweep...');
  try {
    const tenants = await prisma.tenant.findMany({ where: { status: 'ACTIVE', deletedAt: null } });
    for (const tenant of tenants) {
      // Calculate Active Clients Count
      const activeClientsCount = await prisma.client.count({
        where: { user: { tenantId: tenant.id }, status: 'ACTIVE' }
      });

      // 1. DEPOSIT Sweep
      const requiredDeposit = activeClientsCount * 1000;
      if (tenant.depositAmount < requiredDeposit) {
        const description = `Daily automated swept compliance alert: Deposit threshold low. Required deposit is Rs. ${requiredDeposit} for ${activeClientsCount} active clients. Current deposit: Rs. ${tenant.depositAmount}.`;
        const exists = await prisma.complianceAlert.findFirst({
          where: { tenantId: tenant.id, alertType: 'DEPOSIT_LOW', status: 'OPEN' }
        });
        if (!exists) {
          await prisma.complianceAlert.create({
            data: {
              tenantId: tenant.id,
              alertType: 'DEPOSIT_LOW',
              severity: 'HIGH',
              description
            }
          });
        }
      }

      // 2. CERTIFICATE EXPIRES Sweep (SEBI)
      if (tenant.certificateValidity) {
        const daysLeft = Math.ceil((tenant.certificateValidity.getTime() - Date.now()) / (1000 * 3600 * 24));
        if (daysLeft <= 90) {
          const description = `Daily swept alert: SEBI Certificate validity expires in ${daysLeft} days.`;
          const exists = await prisma.complianceAlert.findFirst({
            where: { tenantId: tenant.id, alertType: 'CERTIFICATE_EXPIRY', status: 'OPEN' }
          });
          if (!exists) {
            await prisma.complianceAlert.create({
              data: {
                tenantId: tenant.id,
                alertType: 'CERTIFICATE_EXPIRY',
                severity: daysLeft <= 15 ? 'HIGH' : 'MEDIUM',
                description
              }
            });
          } else {
            await prisma.complianceAlert.update({
              where: { id: exists.id },
              data: {
                severity: daysLeft <= 15 ? 'HIGH' : 'MEDIUM',
                description
              }
            });
          }
        }
      }
    }
    console.log('Automated compliance sweep finished.');
  } catch (error) {
    console.error('Error running automated daily compliance cron:', error);
  }
});

// Seed default permissions and bind to ADMIN / SUPER_ADMIN
const ensurePermissions = async () => {
  console.log('Verifying & seeding granular permissions...');
  try {
    const newPerms = [
      { code: 'CREATE_PLANS', name: 'Create Plans' },
      { code: 'EDIT_PLANS', name: 'Edit Plans' },
      { code: 'DELETE_PLANS', name: 'Delete Plans' },
      { code: 'VIEW_ALL_PLANS', name: 'View All Plans' },
      { code: 'VIEW_OWN_PLANS', name: 'View Own Created Plans' },
      { code: 'CREATE_CLIENTS', name: 'Create Clients' },
      { code: 'EDIT_CLIENTS', name: 'Edit Clients' },
      { code: 'DELETE_CLIENTS', name: 'Delete Clients' },
      { code: 'VIEW_ALL_CLIENTS', name: 'View All Clients' },
      { code: 'VIEW_OWN_CLIENTS', name: 'View Own Created Clients' },
      { code: 'ACCESS_TICKETS', name: 'Access Tickets Desk' },
      { code: 'VIEW_ALL_TICKETS', name: 'View All Tickets' },
      { code: 'VIEW_OWN_TICKETS', name: 'View Own Client Tickets' },
      { code: 'ACCESS_RESEARCH', name: 'Signal & Research Desk Tab Access' },
      { code: 'VIEW_RESEARCH', name: 'View Only Research' },
      { code: 'ADD_RESEARCH', name: 'Add Research' },
      { code: 'OWN_RESEARCH', name: 'Own Research' },
      { code: 'VIEW_SENSITIVE_DATA', name: 'View Sensitive Client Details (Unmask)' },
      { code: 'EXPORT_DATA', name: 'Export Data to CSV' },
      { code: 'ACCESS_SETTINGS', name: 'Access Platform Settings' },
      { code: 'ACCESS_ROLES', name: 'Manage Staff Roles & Permissions' },
    ];

    for (const perm of newPerms) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: perm
      });
    }

    // Seed missing system roles (SALES, MARKETING)
    console.log('Verifying system roles...');
    const rolesToSeed = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED', 'CLIENT', 'SALES', 'MARKETING'];
    for (const r of rolesToSeed) {
      await prisma.role.upsert({
        where: { name: r },
        update: {},
        create: {
          name: r,
          description: `System Role: ${r.replace('_', ' ')}`
        }
      });
    }

    // Auto-bind to ADMIN & SUPER_ADMIN
    const admins = await prisma.role.findMany({
      where: { name: { in: ['SUPER_ADMIN', 'ADMIN'] } }
    });

    const allDbPerms = await prisma.permission.findMany();

    for (const adminRole of admins) {
      for (const perm of allDbPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: perm.id
            }
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: perm.id
          }
        });
      }
    }

    // Auto-bind some permissions to CO & PO
    const complianceRoles = await prisma.role.findMany({
      where: { name: { in: ['COMPLIANCE_OFFICER', 'PRINCIPAL_OFFICER'] } }
    });

    const compliancePerms = allDbPerms.filter(p => ['VIEW_SENSITIVE_DATA', 'EXPORT_DATA'].includes(p.code));

    for (const cr of complianceRoles) {
      for (const perm of compliancePerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: cr.id,
              permissionId: perm.id
            }
          },
          update: {},
          create: {
            roleId: cr.id,
            permissionId: perm.id
          }
        });
      }
    }

    console.log('Granular permissions seeding/verification complete.');
  } catch (err: any) {
    console.error('Failed to seed granular permissions:', err.message);
  }
};

// Start Server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`RAGCP Express Server is running on http://0.0.0.0:${PORT}`);
  await ensurePermissions();
  initCronJobs(); // Initialize penalty engine
});
