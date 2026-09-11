"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const node_cron_1 = __importDefault(require("node-cron"));
const api_1 = __importDefault(require("./routes/api"));
const db_1 = require("./config/db");
const cronService_1 = require("./services/cronService");
const third_party_api_1 = require("./third-party-api");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
// Security Middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false // Allow serving files to external domains locally
}));
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request Logger Middleware (Prints all incoming API calls to console)
app.use((req, res, next) => {
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
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../uploads')));
const tenantResolver_1 = __importDefault(require("./middlewares/tenantResolver"));
// Mount Dynamic Tenant Resolver Middleware
app.use(tenantResolver_1.default);
// Routes mapping
app.use('/api/v1', api_1.default);
app.use('/third-party-api', third_party_api_1.thirdPartyRoutes);
app.get('/clients', third_party_api_1.getThirdPartyClients);
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        if (db_1.centralConnection.db) {
            await db_1.centralConnection.db.admin().ping();
        }
        res.status(200).json({ success: true, message: 'Server is healthy and connected to MongoDB.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Database connection failed', errors: [error.message] });
    }
});
// Root route
app.get('/', (req, res) => {
    res.send('Research Analyst Governance & Compliance Platform (RAGCP) API Server');
});
// Standard Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        errors: [err.message]
    });
});
// Background Cron Jobs
// Run daily compliance check (Deposit levels, SEBI/NISM expires, missing agreements)
node_cron_1.default.schedule('0 0 * * *', async () => {
    try {
        const tenants = await db_1.Tenant.find({ status: 'ACTIVE', deletedAt: null }).lean();
        for (const tenant of tenants) {
            // Calculate Active Clients Count
            const activeClientsCount = await db_1.Client.countDocuments({
                tenantId: tenant._id || tenant.id,
                status: 'ACTIVE'
            });
            // 1. DEPOSIT Sweep
            const requiredDeposit = activeClientsCount * 1000;
            if (tenant.depositAmount < requiredDeposit) {
                const description = `Daily automated swept compliance alert: Deposit threshold low. Required deposit is Rs. ${requiredDeposit} for ${activeClientsCount} active clients. Current deposit: Rs. ${tenant.depositAmount}.`;
                const exists = await db_1.ComplianceAlert.findOne({
                    tenantId: tenant._id || tenant.id,
                    alertType: 'DEPOSIT_LOW',
                    status: 'OPEN'
                }).lean();
                if (!exists) {
                    await db_1.ComplianceAlert.create({
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
                    const exists = await db_1.ComplianceAlert.findOne({
                        tenantId: tenant._id || tenant.id,
                        alertType: 'CERTIFICATE_EXPIRY',
                        status: 'OPEN'
                    }).lean();
                    if (!exists) {
                        await db_1.ComplianceAlert.create({
                            tenantId: tenant._id || tenant.id,
                            alertType: 'CERTIFICATE_EXPIRY',
                            severity: daysLeft <= 15 ? 'HIGH' : 'MEDIUM',
                            description
                        });
                    }
                    else {
                        await db_1.ComplianceAlert.findByIdAndUpdate(exists._id, {
                            severity: daysLeft <= 15 ? 'HIGH' : 'MEDIUM',
                            description
                        });
                    }
                }
            }
        }
    }
    catch (error) {
        console.error('Error running automated daily compliance cron:', error);
    }
});
// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`RAGCP Express Server is running on http://0.0.0.0:${PORT}`);
    (0, cronService_1.initCronJobs)(); // Initialize penalty engine
});
