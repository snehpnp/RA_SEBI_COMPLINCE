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

// Serve Uploads as Static Folder
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

import tenantResolverMiddleware from './middlewares/tenantResolver';

// Mount Dynamic Tenant Resolver Middleware
app.use(tenantResolverMiddleware);

// Routes mapping
app.use('/api/v1', router);
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
// Run daily compliance check (Deposit levels, SEBI/NISM expires, missing agreements)
cron.schedule('0 0 * * *', async () => {
  try {
    const tenants: any[] = await Tenant.find({ status: 'ACTIVE', deletedAt: null }).lean();
    for (const tenant of tenants) {
      // Calculate Active Clients Count
      const activeClientsCount = await Client.countDocuments({
        tenantId: tenant._id || tenant.id,
        status: 'ACTIVE'
      });

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
          } else {
            await ComplianceAlert.findByIdAndUpdate(exists._id, {
              severity: daysLeft <= 15 ? 'HIGH' : 'MEDIUM',
              description
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error running automated daily compliance cron:', error);
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`RAGCP Express Server is running on http://0.0.0.0:${PORT}`);
  initCronJobs(); // Initialize penalty engine
});
