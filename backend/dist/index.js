"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const db_1 = __importDefault(require("./config/db"));
const cronService_1 = require("./services/cronService");
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
// Serve Uploads as Static Folder
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../uploads')));
// Routes mapping
app.use('/api/v1', api_1.default);
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await db_1.default.$runCommandRaw({ ping: 1 });
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
// Run daily compliance check (Deposit levels, SEBI/NISM exipires, missing agreements)
node_cron_1.default.schedule('0 0 * * *', async () => {
    try {
        const tenants = await db_1.default.tenant.findMany({ where: { status: 'ACTIVE', deletedAt: null } });
        for (const tenant of tenants) {
            // Calculate Active Clients Count
            const activeClientsCount = await db_1.default.client.count({
                where: { user: { tenantId: tenant.id }, status: 'ACTIVE' }
            });
            // 1. DEPOSIT Sweep
            const requiredDeposit = activeClientsCount * 1000;
            if (tenant.depositAmount < requiredDeposit) {
                const description = `Daily automated swept compliance alert: Deposit threshold low. Required deposit is Rs. ${requiredDeposit} for ${activeClientsCount} active clients. Current deposit: Rs. ${tenant.depositAmount}.`;
                const exists = await db_1.default.complianceAlert.findFirst({
                    where: { tenantId: tenant.id, alertType: 'DEPOSIT_LOW', status: 'OPEN' }
                });
                if (!exists) {
                    await db_1.default.complianceAlert.create({
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
                    const exists = await db_1.default.complianceAlert.findFirst({
                        where: { tenantId: tenant.id, alertType: 'CERTIFICATE_EXPIRY', status: 'OPEN' }
                    });
                    if (!exists) {
                        await db_1.default.complianceAlert.create({
                            data: {
                                tenantId: tenant.id,
                                alertType: 'CERTIFICATE_EXPIRY',
                                severity: daysLeft <= 15 ? 'HIGH' : 'MEDIUM',
                                description
                            }
                        });
                    }
                    else {
                        await db_1.default.complianceAlert.update({
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
    }
    catch (error) {
        console.error('Error running automated daily compliance cron:', error);
    }
});
// Seed default permissions and bind to ADMIN / SUPER_ADMIN
const ensurePermissions = async () => {
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
            await db_1.default.permission.upsert({
                where: { code: perm.code },
                update: {},
                create: perm
            });
        }
        // Seed missing system roles (SALES, MARKETING)
        const rolesToSeed = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED', 'CLIENT', 'SALES', 'MARKETING'];
        for (const r of rolesToSeed) {
            await db_1.default.role.upsert({
                where: { name: r },
                update: {},
                create: {
                    name: r,
                    description: `System Role: ${r.replace('_', ' ')}`
                }
            });
        }
        // Auto-bind to ADMIN & SUPER_ADMIN
        const admins = await db_1.default.role.findMany({
            where: { name: { in: ['SUPER_ADMIN', 'ADMIN'] } }
        });
        const allDbPerms = await db_1.default.permission.findMany();
        for (const adminRole of admins) {
            for (const perm of allDbPerms) {
                await db_1.default.rolePermission.upsert({
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
        const complianceRoles = await db_1.default.role.findMany({
            where: { name: { in: ['COMPLIANCE_OFFICER', 'PRINCIPAL_OFFICER'] } }
        });
        const compliancePerms = allDbPerms.filter(p => ['VIEW_SENSITIVE_DATA', 'EXPORT_DATA'].includes(p.code));
        for (const cr of complianceRoles) {
            for (const perm of compliancePerms) {
                await db_1.default.rolePermission.upsert({
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
    }
    catch (err) {
        console.error('Failed to seed granular permissions:', err.message);
    }
};
// Start Server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`RAGCP Express Server is running on http://0.0.0.0:${PORT}`);
    await ensurePermissions();
    (0, cronService_1.initCronJobs)(); // Initialize penalty engine
});
