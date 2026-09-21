import 'dotenv/config';

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
import { centralConnection, Tenant, Client, ComplianceAlert } from './config/db';
import { initCronJobs } from './services/cronService';
import { checkComplianceForTenant } from './controllers/complianceController';
import { thirdPartyRoutes, getThirdPartyClients } from './third-party-api';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false // Allow serving files to external domains locally
  })
);
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global body-parser error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload received.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request payload too large (max 50MB).' });
  }
  next(err);
});

// Request Logger Middleware (Prints all incoming API calls to console)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  const url = req.originalUrl || req.url;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 400 ? '❌' : '✅';
    console.log(`${statusColor} [${req.method}] ${url} -> ${status} (${duration}ms)`);
  });

  next();
});

// Serve Uploads as Static Folder (multi-root)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use('/uploads', express.static(path.resolve(process.cwd(), '../uploads')));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/uploads', express.static('A:/RA_SEBI_COMPLINCE/uploads'));
app.use('/uploads', express.static('A:/RA_SEBI_COMPLINCE/backend/uploads'));

// Fallback for /uploads that are missing statically: forward to the robust /api/v1/download handler
app.use('/uploads', (req: express.Request, res: express.Response) => {
  const targetPath = `/uploads${req.path}`;
  res.redirect(`/api/v1/download?path=${encodeURIComponent(targetPath)}`);
});

import tenantResolverMiddleware from './middlewares/tenantResolver';

// Mount Dynamic Tenant Resolver Middleware
app.use(tenantResolverMiddleware);

// Routes mapping
app.use('/api/v1', router);
app.use('/api', router);
app.use('/third-party-api', thirdPartyRoutes);
app.get('/clients', getThirdPartyClients);

// Health check endpoint
app.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    if (centralConnection.db) {
      await centralConnection.db.admin().ping();
    }
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
// Run daily automated compliance check at midnight (12:00 AM)
cron.schedule('0 0 * * *', async () => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n⏳ [COMPLIANCE CRON - ${timestamp}] Running daily automated compliance sweep...`);
  try {
    const tenants: any[] = await Tenant.find({ status: 'ACTIVE', deletedAt: null }).lean();
    console.log(`🔍 [COMPLIANCE CRON] Active Tenants to verify: ${tenants.length}`);
    for (const tenant of tenants) {
      const tenantIdStr = tenant._id?.toString() || tenant.id;
      // Calculate Active Clients Count
      const activeClientsCount = await Client.countDocuments({
        tenantId: tenant._id || tenant.id,
        status: 'ACTIVE'
      });

      console.log(`🏢 [COMPLIANCE CRON] Checking Tenant "${tenant.name || tenantIdStr}" — Active Clients: ${activeClientsCount}, Current Deposit: Rs. ${tenant.depositAmount || 0}`);

      // 1. DEPOSIT Sweep
      const requiredDeposit = activeClientsCount * 1000;
      if (tenant.depositAmount < requiredDeposit) {
        const description = `Daily automated swept compliance alert: Deposit threshold low. Required deposit is Rs. ${requiredDeposit} for ${activeClientsCount} active clients. Current deposit: Rs. ${tenant.depositAmount}.`;
        const exists = await ComplianceAlert.findOne({
          tenantId: tenant._id || tenant.id,
          alertType: 'DEPOSIT_LOW',
          status: 'OPEN'
        }).lean();

        if (!exists) {
          await ComplianceAlert.create({
            tenantId: tenant._id || tenant.id,
            alertType: 'DEPOSIT_LOW',
            severity: 'HIGH',
            description
          });
          console.log(`⚠️ [COMPLIANCE CRON] Alert Created: DEPOSIT_LOW for "${tenant.name || tenantIdStr}"`);
        }
      }

      // 2. CERTIFICATE EXPIRES Sweep (SEBI)
      if (tenant.certificateValidity) {
        const certDate = new Date(tenant.certificateValidity);
        const daysLeft = Math.ceil((certDate.getTime() - Date.now()) / (1000 * 3600 * 24));
        if (daysLeft <= 90) {
          const description = `Daily swept alert: SEBI Certificate validity expires in ${daysLeft} days.`;
          const exists: any = await ComplianceAlert.findOne({
            tenantId: tenant._id || tenant.id,
            alertType: 'CERTIFICATE_EXPIRY',
            status: 'OPEN'
          }).lean();

          if (!exists) {
            await ComplianceAlert.create({
              tenantId: tenant._id || tenant.id,
              alertType: 'CERTIFICATE_EXPIRY',
              severity: daysLeft <= 15 ? 'HIGH' : 'MEDIUM',
              description
            });
            console.log(`⚠️ [COMPLIANCE CRON] Alert Created: CERTIFICATE_EXPIRY for "${tenant.name || tenantIdStr}"`);
          } else {
            await ComplianceAlert.findByIdAndUpdate(exists._id, {
              severity: daysLeft <= 15 ? 'HIGH' : 'MEDIUM',
              description
            });
          }
        }
      }

      // Run full compliance engine checks (KYC, Agreement, NISM, Policies, SEBI Fee Cap, etc.)
      const autoAlerts = await checkComplianceForTenant(tenantIdStr).catch((e) => {
        console.error(`❌ [COMPLIANCE CRON] Error running checkComplianceForTenant for ${tenant.name || tenantIdStr}:`, e?.message);
        return [];
      });

      if (autoAlerts && autoAlerts.length > 0) {
        console.log(`🚨 [COMPLIANCE CRON] Generated ${autoAlerts.length} new compliance alert(s) for "${tenant.name || tenantIdStr}"`);
      }
    }
    console.log(`✅ [COMPLIANCE CRON - ${timestamp}] 1-minute compliance sweep finished.\n`);
  } catch (error: any) {
    console.error('❌ [COMPLIANCE CRON] Error running automated daily compliance cron:', error?.message);
  }
});

import { telegramService } from './services/telegramService';

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`RAGCP Express Server is running on http://0.0.0.0:${PORT}`);
  initCronJobs(); // Initialize penalty engine
  telegramService.startBotPoller(); // Start Telegram bot polling for local/realtime linking
});
