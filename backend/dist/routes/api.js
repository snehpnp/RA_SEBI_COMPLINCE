"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const authController_1 = require("../controllers/authController");
const superAdminController_1 = require("../controllers/superAdminController");
const third_party_api_1 = require("../third-party-api");
const adminController_1 = require("../controllers/adminController");
const clientController_1 = require("../controllers/clientController");
const researchController_1 = require("../controllers/researchController");
const complianceController_1 = require("../controllers/complianceController");
const ticketController_1 = require("../controllers/ticketController");
const clientPortalController_1 = require("../controllers/clientPortalController");
const signalController_1 = require("../controllers/signalController");
const complaintController_1 = require("../controllers/complaintController");
const roleController_1 = require("../controllers/roleController");
const activeClientController_1 = require("../controllers/activeClientController");
const couponController_1 = require("../controllers/couponController");
const resourceController_1 = require("../controllers/resourceController");
const locationController_1 = require("../controllers/locationController");
const kycController_1 = require("../controllers/kycController");
const auth_1 = require("../middlewares/auth");
const tenant_1 = require("../middlewares/tenant");
const marketController_1 = require("../controllers/marketController");
const pageController_1 = require("../controllers/pageController");
const profileController_1 = require("../controllers/profileController");
const systemSettingController_1 = require("../controllers/systemSettingController");
const permissionController_1 = require("../controllers/permissionController");
const tenantSyncController_1 = require("../controllers/tenantSyncController");
const pdfService_1 = require("../services/pdfService");
const invoiceGenerator_1 = require("../services/invoiceGenerator");
const occupationController_1 = require("../controllers/occupationController");
const clientTimelineController_1 = require("../controllers/clientTimelineController");
const clientVaultController_1 = require("../controllers/clientVaultController");
const faqController_1 = require("../controllers/faqController");
const router = (0, express_1.Router)();
// Robust Upload Root Helper
const getUploadRoot = () => {
    const candidates = [
        path_1.default.resolve(process.cwd(), '../uploads'),
        path_1.default.resolve(process.cwd(), 'uploads'),
        path_1.default.resolve(__dirname, '../../uploads'),
        path_1.default.resolve(__dirname, '../../../uploads'),
        'A:/RA_SEBI_COMPLINCE/uploads',
        'A:/RA_SEBI_COMPLINCE/backend/uploads'
    ];
    for (const c of candidates) {
        if (fs_1.default.existsSync(c))
            return c;
    }
    const defaultDir = path_1.default.resolve(process.cwd(), 'uploads');
    if (!fs_1.default.existsSync(defaultDir)) {
        try {
            fs_1.default.mkdirSync(defaultDir, { recursive: true });
        }
        catch { }
    }
    return defaultDir;
};
const uploadRoot = getUploadRoot();
const folders = ['policies', 'agreements', 'kyc', 'payments', 'compliance', 'staff', 'branding', 'tickets', 'research', 'resources', 'recordings'];
folders.forEach(f => {
    const dir = path_1.default.join(uploadRoot, f);
    if (!fs_1.default.existsSync(dir)) {
        try {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        catch { }
    }
});
// Configure Multer Storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const root = getUploadRoot();
        let folder = 'policies';
        if (req.path.includes('manual'))
            folder = 'payments';
        else if (req.path.includes('recording') || req.path.includes('audio') || req.path.includes('vault'))
            folder = 'recordings';
        else if (req.path.includes('close') || req.path.includes('resolve') || req.path.includes('compliance') || req.path.includes('checklist'))
            folder = 'compliance';
        else if (req.path.includes('kyc'))
            folder = 'kyc';
        else if (req.path.includes('staff'))
            folder = 'staff';
        else if (req.path.includes('settings') || req.path.includes('signature'))
            folder = 'branding';
        else if (req.path.includes('ticket') || req.path.includes('reply'))
            folder = 'tickets';
        else if (req.path.includes('signals') || req.path.includes('research'))
            folder = 'research';
        else if (req.path.includes('resources'))
            folder = 'resources';
        const dest = path_1.default.join(root, folder);
        if (!fs_1.default.existsSync(dest)) {
            try {
                fs_1.default.mkdirSync(dest, { recursive: true });
            }
            catch { }
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf', 'image/png', 'image/jpeg', 'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/x-m4a', 'audio/m4a', 'audio/ogg', 'audio/webm', 'audio/aac'
    ];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'];
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error('Only PDF, Word, Excel, Image, and Audio recording files are allowed!'), false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // Max 50MB (supports call recordings)
});
// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------
router.post('/auth/login', authController_1.login);
router.post('/auth/request-login-otp', authController_1.requestLoginOtp);
router.post('/auth/login-with-otp', authController_1.loginWithOtp);
router.post('/auth/verify-2fa', authController_1.verify2FALogin);
router.post('/auth/resend-2fa', authController_1.resend2FAOtp);
router.get('/auth/security-policy', authController_1.getSecurityPolicy);
router.post('/auth/refresh', authController_1.refreshToken);
router.post('/auth/forgot-password', authController_1.forgotPassword);
router.post('/auth/reset-password', authController_1.resetPassword);
router.get('/auth/me', auth_1.authenticateJWT, authController_1.getMe);
router.post('/auth/change-password', auth_1.authenticateJWT, authController_1.changePassword);
router.post('/auth/logout', auth_1.authenticateJWT, authController_1.logout);
router.get('/public/tenants', authController_1.getPublicTenants);
router.get('/public/clients', third_party_api_1.getThirdPartyClients);
router.get('/clients', third_party_api_1.getThirdPartyClients);
router.post('/public/request-otp', authController_1.requestOtp);
router.post('/public/verify-otp', authController_1.verifyOtp);
// ----------------------------------------------------
// PROFILE
// ----------------------------------------------------
router.get('/profile/super-admin', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), profileController_1.getSuperAdminProfile);
router.put('/profile/super-admin', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), profileController_1.updateSuperAdminProfile);
router.get('/profile/admin', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN']), profileController_1.getAdminProfile);
router.put('/profile/admin', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN']), profileController_1.updateAdminProfile);
router.get('/profile/staff', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED']), profileController_1.getStaffProfile);
router.put('/profile/staff', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED']), profileController_1.updateStaffProfile);
// ----------------------------------------------------
// SUPER ADMIN PORTAL
// ----------------------------------------------------
router.post('/super-admin/parse-sebi-certificate', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), upload.single('sebiCertificate'), superAdminController_1.parseSebiCertificate);
router.post('/super-admin/parse-nism-certificate', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), upload.single('nismCertificate'), superAdminController_1.parseNismCertificate);
router.post('/super-admin/tenants', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), upload.fields([{ name: 'sebiCertificate', maxCount: 1 }, { name: 'nismCertificate', maxCount: 1 }]), superAdminController_1.createTenant);
router.get('/super-admin/tenants', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getTenants);
router.post('/super-admin/tenants/:id/status', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.toggleTenantStatus);
router.delete('/super-admin/tenants/:id', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.deleteTenant);
router.post('/super-admin/tenants/:id/restore', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.restoreTenant);
router.delete('/super-admin/tenants/:id/permanent', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.permanentDeleteTenant);
router.post('/super-admin/tenants/:id/impersonate', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.impersonateTenant);
router.get('/super-admin/tenants/:id', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getTenantDetails);
router.get('/super-admin/tenants/:id/documents', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getTenantDocumentHistory);
router.put('/super-admin/tenants/:id', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), upload.fields([
    { name: 'sebiCertificate', maxCount: 1 },
    { name: 'nismCertificate', maxCount: 1 }
]), superAdminController_1.updateTenantDetails);
router.post('/super-admin/tenants/:id/provision-db', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.provisionTenantDb);
router.post('/super-admin/tenants/:id/sync-api', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.syncTenantApi);
router.post('/super-admin/test-mongo-connection', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.testMongoConnection);
router.post('/super-admin/sync-all', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.syncAllTenantsApi);
router.post('/super-admin/tenants/sync-all', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.syncAllTenantsApi);
router.post('/super-admin/verify-domain', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.verifyDomainUrl);
// Universal Remote Instance Webhook Sync Endpoints
router.post('/sync/bootstrap', tenantSyncController_1.bootstrapTenant);
router.post('/sync/tenant', tenantSyncController_1.bootstrapTenant);
router.post('/sync/update', tenantSyncController_1.syncTenantUpdate);
router.post('/sync/status', tenantSyncController_1.syncTenantStatus);
router.post('/sync/delete', tenantSyncController_1.syncTenantDelete);
router.get('/sync/config', tenantSyncController_1.getTenantSyncConfig);
router.get('/tenant/sync-config', tenantSyncController_1.getTenantSyncConfig);
router.get('/super-admin/tenants/:id/clients', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getCompanyClients);
router.get('/super-admin/tenants/:id/staff', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getCompanyStaff);
router.get('/super-admin/tenants/:id/compliance', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getCompanyCompliance);
router.post('/super-admin/tenants/:id/compliance/sweep', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.runCompanyComplianceSweep);
router.use('/third-party-api', third_party_api_1.thirdPartyRoutes);
router.get('/super-admin/tenants/:tenantId/permissions', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), permissionController_1.getTenantPermissions);
router.put('/super-admin/tenants/:tenantId/permissions', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), permissionController_1.updateTenantPermissions);
router.post('/super-admin/tenants/sync-all', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.syncAllTenantsApi);
router.post('/super-admin/verify-domain', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.verifyDomainUrl);
router.put('/super-admin/password', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.updateSuperAdminPassword);
router.get('/super-admin/logs', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getAuditLogs);
router.get('/super-admin/compliance-rules', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getComplianceRules);
router.put('/super-admin/compliance-rules/:id', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.updateComplianceRule);
router.get('/super-admin/telemetry', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getGlobalTelemetry);
router.get('/super-admin/dashboard', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getGlobalTelemetry);
router.get('/super-admin/dashboard-stats', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getGlobalTelemetry);
router.get('/super-admin/companies/:id/panel-stats', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getCompanyPanelStats);
// ----------------------------------------------------
// SYSTEM SETTINGS (GLOBAL BRANDING)
// ----------------------------------------------------
router.get('/system-settings/branding', systemSettingController_1.getGlobalBranding);
router.get('/system-settings/preview-pdf/:type', adminController_1.previewPolicyPdf);
router.get('/admin/preview-pdf/:type', adminController_1.previewPolicyPdf);
router.put('/system-settings/branding', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }, { name: 'loginLogo', maxCount: 1 }]), systemSettingController_1.updateGlobalBranding);
// ----------------------------------------------------
// ADMIN PORTAL
// ----------------------------------------------------
router.put('/admin/signature', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN', 'SUPER_ADMIN', 'RESEARCHER']), upload.single('coSignature'), adminController_1.uploadSignature);
router.put('/admin/settings', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'termsPdf', maxCount: 1 },
    { name: 'privacyPdf', maxCount: 1 },
    { name: 'coSignature', maxCount: 1 },
    { name: 'internalPolicyPdf', maxCount: 1 },
    { name: 'upiQrImage', maxCount: 1 }
]), adminController_1.updateTenantSettings);
router.get('/admin/email-templates', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN', 'PRINCIPAL_OFFICER']), adminController_1.getEmailTemplates);
router.put('/admin/email-templates/:type', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN', 'PRINCIPAL_OFFICER']), adminController_1.updateEmailTemplate);
router.post('/admin/test-smtp', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN']), adminController_1.testSmtp);
router.post('/admin/test-smtp-connection', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN']), systemSettingController_1.testSmtpConnection);
router.post('/admin/verify-payment-gateway', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'RESEARCHER']), adminController_1.verifyPaymentGateway);
// Bulk Exports
router.get('/admin/exports/invoices', auth_1.authenticateJWT, (0, auth_1.requirePermission)('EXPORT_DATA'), adminController_1.exportInvoicesZip);
router.get('/admin/exports/agreements', auth_1.authenticateJWT, (0, auth_1.requirePermission)('EXPORT_DATA'), adminController_1.exportAgreementsZip);
router.get('/admin/exports/kra', auth_1.authenticateJWT, (0, auth_1.requirePermission)('EXPORT_DATA'), adminController_1.exportKRAZip);
router.get('/admin/exports/clients', auth_1.authenticateJWT, (0, auth_1.requirePermission)('EXPORT_DATA'), adminController_1.exportClientsCSV);
router.get('/admin/exports/deleted-clients', auth_1.authenticateJWT, (0, auth_1.requirePermission)('EXPORT_DATA'), adminController_1.exportDeletedClientsCSV);
router.get('/admin/exports/payments', auth_1.authenticateJWT, (0, auth_1.requirePermission)('EXPORT_DATA'), adminController_1.exportPaymentsCSV);
router.get('/admin/exports/research-reports', auth_1.authenticateJWT, (0, auth_1.requirePermission)('EXPORT_DATA'), adminController_1.exportResearchReportsZip);
// Custom Pages (Admin & Read-only for Staff/CO/PO)
router.get('/admin/pages', auth_1.authenticateJWT, pageController_1.getAdminPages);
router.post('/admin/pages', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN']), pageController_1.savePage);
router.delete('/admin/pages/:id', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN']), pageController_1.deletePage);
// Complaint Status Report (Admin)
router.post('/admin/complaint-report', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN']), pageController_1.saveComplaintReport);
// Public/Client Page Routes
router.get('/pages', pageController_1.getActivePages);
router.get('/pages/:slug', pageController_1.getPageBySlug);
router.get('/complaint-report', pageController_1.getComplaintReport);
router.get('/complaint-report/history', pageController_1.getComplaintReportHistory);
// Public Occupations Route (for Registration / Signup dropdowns)
router.get('/occupations', occupationController_1.getPublicOccupations);
// Admin Occupations Management Routes
router.get('/admin/occupations', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, occupationController_1.getAdminOccupations);
router.post('/admin/occupations', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, occupationController_1.createOccupation);
router.put('/admin/occupations/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, occupationController_1.updateOccupation);
router.post('/admin/occupations/:id/status', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, occupationController_1.toggleOccupationStatus);
router.patch('/admin/occupations/:id/status', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, occupationController_1.toggleOccupationStatus);
router.delete('/admin/occupations/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, occupationController_1.deleteOccupation);
// Admin SMS Templates & Gateway Routes
router.get('/admin/sms-templates', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, adminController_1.getSmsTemplates);
router.post('/admin/sms-templates', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, adminController_1.createSmsTemplate);
router.put('/admin/sms-templates/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, adminController_1.updateSmsTemplate);
router.post('/admin/sms-templates/:id/status', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, adminController_1.toggleSmsTemplateStatus);
router.patch('/admin/sms-templates/:id/status', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, adminController_1.toggleSmsTemplateStatus);
router.delete('/admin/sms-templates/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, adminController_1.deleteSmsTemplate);
router.post('/admin/sms/test', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, adminController_1.testSmsGateway);
router.post('/admin/test-digio', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, adminController_1.testDigioConfig);
// ==========================================
router.get('/admin/profile-completeness', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_DASHBOARD'), tenant_1.enforceTenantIsolation, adminController_1.getProfileCompleteness);
// Active Client History endpoints
router.get('/admin/active-clients/summary', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_DASHBOARD'), tenant_1.enforceTenantIsolation, activeClientController_1.getActiveClientSummary);
router.get('/admin/active-clients/month-export', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_DASHBOARD'), tenant_1.enforceTenantIsolation, activeClientController_1.getActiveClientsByMonthExport);
router.get('/admin/active-clients/date', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_DASHBOARD'), tenant_1.enforceTenantIsolation, activeClientController_1.getActiveClientsByDate);
router.get('/admin/audit-logs', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, adminController_1.getTenantAuditLogs);
router.post('/admin/profile-wizard', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_DASHBOARD'), tenant_1.enforceTenantIsolation, upload.single('nismFile'), adminController_1.saveProfileStep);
router.post('/admin/staff', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_STAFF'), tenant_1.enforceTenantIsolation, upload.single('nismUpload'), adminController_1.createStaff);
// --- Dashboard Stats ---
router.get('/admin/dashboard-stats', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_DASHBOARD'), tenant_1.enforceTenantIsolation, adminController_1.getDashboardStats);
router.get('/admin/staff', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_STAFF', 'ACCESS_COMPLIANCE']), tenant_1.enforceTenantIsolation, adminController_1.getStaff);
router.put('/admin/staff/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_STAFF'), tenant_1.enforceTenantIsolation, upload.single('nismUpload'), adminController_1.updateStaff);
router.post('/admin/staff/:id/status', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_STAFF'), tenant_1.enforceTenantIsolation, adminController_1.toggleStaffStatus);
router.delete('/admin/staff/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_STAFF'), tenant_1.enforceTenantIsolation, adminController_1.deleteStaff);
router.post('/admin/staff/:id/delete', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_STAFF'), tenant_1.enforceTenantIsolation, adminController_1.deleteStaff);
router.post('/admin/staff/:id/restore', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_STAFF'), tenant_1.enforceTenantIsolation, adminController_1.restoreStaff);
router.post('/admin/parse-nism-certificate', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_STAFF', 'ACCESS_DASHBOARD']), upload.single('nismCertificate'), superAdminController_1.parseNismCertificate);
// Admin Client Management
router.get('/admin/clients', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_CLIENTS', 'ACCESS_COMPLIANCE']), tenant_1.enforceTenantIsolation, adminController_1.getAdminClients);
router.post('/admin/clients/reset-kyc', adminController_1.resetClientKyc);
router.get('/admin/clients/deleted', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.getAdminDeletedClients);
router.post('/admin/clients/:id/status', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.toggleClientStatus);
router.get('/admin/clients/:id/communications', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.getClientCommunications);
router.put('/admin/clients/:id/approve', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.approveClient);
router.put('/admin/clients/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.updateClient);
router.delete('/admin/clients/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.deleteClient);
router.post('/admin/clients/:id/delete', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.deleteClient);
router.post('/admin/clients/:id/restore', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.restoreClient);
router.post('/admin/clients/:id/assign-plan', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.assignPlanByAdmin);
router.get('/admin/clients/:clientId/timeline', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_CLIENTS', 'ACCESS_COMPLIANCE']), tenant_1.enforceTenantIsolation, clientTimelineController_1.getClientTimeline);
// Admin Client Digital Vaults & File Explorer (Role-Permission controlled)
router.get('/admin/vaults', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_VAULTS', 'ACCESS_VAULTS_VIEW', 'ACCESS_VAULTS_FULL']), tenant_1.enforceTenantIsolation, clientVaultController_1.listClientVaults);
router.get('/admin/vaults/:clientId', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_VAULTS', 'ACCESS_VAULTS_VIEW', 'ACCESS_VAULTS_FULL']), tenant_1.enforceTenantIsolation, clientVaultController_1.getClientVaultDetails);
router.post('/admin/vaults/:clientId/recordings', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_VAULTS', 'ACCESS_VAULTS_FULL']), tenant_1.enforceTenantIsolation, upload.single('file'), clientVaultController_1.uploadCallRecording);
router.delete('/admin/vaults/:clientId/recordings/:recordingId', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_VAULTS', 'ACCESS_VAULTS_FULL']), tenant_1.enforceTenantIsolation, clientVaultController_1.deleteCallRecording);
router.get('/admin/vaults/:clientId/export-zip', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_VAULTS_FULL'), tenant_1.enforceTenantIsolation, clientVaultController_1.exportClientVaultZip);
router.get('/admin/vaults/:clientId/export-folder/:folderKey', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_VAULTS_FULL'), tenant_1.enforceTenantIsolation, clientVaultController_1.exportSingleFolder);
router.get('/admin/vaults/:clientId/invoice/:paymentId', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_VAULTS_FULL'), tenant_1.enforceTenantIsolation, clientVaultController_1.downloadSingleInvoice);
router.get('/admin/vaults/:clientId/agreement', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_VAULTS_FULL'), tenant_1.enforceTenantIsolation, clientVaultController_1.downloadAgreementPdf);
router.get('/admin/vaults/:clientId/research-report/:reportId', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_VAULTS_FULL'), tenant_1.enforceTenantIsolation, clientVaultController_1.downloadSingleResearchReport);
// ============================================================================
// Frequently Asked Questions (FAQ) - Client & Admin Endpoints
// ============================================================================
router.get('/faqs', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, faqController_1.getPublicFaqs);
router.get('/admin/faqs', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_TICKETS', 'ACCESS_SETTINGS']), tenant_1.enforceTenantIsolation, faqController_1.getAdminFaqs);
router.post('/admin/faqs', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_TICKETS', 'ACCESS_SETTINGS']), tenant_1.enforceTenantIsolation, faqController_1.createFaq);
router.put('/admin/faqs/:id', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_TICKETS', 'ACCESS_SETTINGS']), tenant_1.enforceTenantIsolation, faqController_1.updateFaq);
router.delete('/admin/faqs/:id', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_TICKETS', 'ACCESS_SETTINGS']), tenant_1.enforceTenantIsolation, faqController_1.deleteFaq);
// Admin Category Management
router.get('/admin/categories', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PLANS'), tenant_1.enforceTenantIsolation, adminController_1.getAdminCategories);
router.post('/admin/categories', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PLANS'), tenant_1.enforceTenantIsolation, adminController_1.createCategory);
router.put('/admin/categories/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PLANS'), tenant_1.enforceTenantIsolation, adminController_1.updateCategory);
router.post('/admin/categories/:id/status', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PLANS'), tenant_1.enforceTenantIsolation, adminController_1.toggleCategoryStatus);
// Admin Plan Management
router.get('/admin/plans', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_PLANS', 'ACCESS_RESEARCH']), tenant_1.enforceTenantIsolation, adminController_1.getAdminPlans);
router.post('/admin/plans', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PLANS'), tenant_1.enforceTenantIsolation, adminController_1.createPlan);
router.put('/admin/plans/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PLANS'), tenant_1.enforceTenantIsolation, adminController_1.updatePlan);
router.delete('/admin/plans/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PLANS'), tenant_1.enforceTenantIsolation, adminController_1.deletePlan);
router.post('/admin/plans/:id/delete', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PLANS'), tenant_1.enforceTenantIsolation, adminController_1.deletePlan);
router.post('/admin/plans/:id/restore', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PLANS'), tenant_1.enforceTenantIsolation, adminController_1.restorePlan);
router.post('/admin/plans/:id/status', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PLANS'), tenant_1.enforceTenantIsolation, adminController_1.togglePlanStatus);
// Admin Role Management
router.get('/admin/roles', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_ROLES'), roleController_1.getRoles);
router.post('/admin/roles', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_ROLES'), roleController_1.createRole);
router.put('/admin/roles/:id/permissions', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_ROLES'), roleController_1.updateRolePermissions);
router.put('/admin/roles/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_ROLES'), roleController_1.updateRole);
router.delete('/admin/roles/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_ROLES'), roleController_1.deleteRole);
// Admin Coupon Management
router.get('/admin/coupons', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, couponController_1.getCoupons);
router.post('/admin/coupons', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, couponController_1.createCoupon);
router.put('/admin/coupons/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, couponController_1.updateCoupon);
router.post('/admin/coupons/:id/visibility', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, couponController_1.toggleCouponVisibility);
router.post('/admin/coupons/:id/status', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_SETTINGS'), tenant_1.enforceTenantIsolation, couponController_1.toggleCouponStatus);
// ----------------------------------------------------
// CLIENT PORTAL (ONBOARDING & MANAGEMENT)
// ----------------------------------------------------
router.post('/client/register', clientController_1.registerClient);
// Digio Dynamic KYC and eSign routes
router.post('/client/kyc/initiate', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), kycController_1.initiateKyc);
router.post('/client/agreement/initiate', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), kycController_1.initiateAgreementEsign);
router.post('/client/kyc/status', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), kycController_1.updateKycAgreementStatus);
router.get('/client/profile', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.getClientProfile);
router.put('/client/profile', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.updateClientProfile);
router.delete('/client/account', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.deleteClientAccount);
router.post('/client/documents', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), upload.single('file'), clientController_1.uploadClientDocument);
router.post('/client/kyc/initiate-digio', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.initiateDigioKyc);
router.post('/client/kyc/initiate', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), kycController_1.initiateKyc);
router.post('/client/agreement/initiate', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), kycController_1.initiateAgreementEsign);
router.post('/client/kyc/status', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), kycController_1.updateKycAgreementStatus);
router.post('/client/kyc-agreement/status', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), kycController_1.updateKycAgreementStatus);
router.post('/client/kyc/verify', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.verifyKRA);
router.post('/client/consent', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.acceptConsent);
router.post('/client/esign', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.signAgreement);
router.get('/client/plans', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, clientController_1.getPlans);
router.post('/client/payments/manual', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), upload.fields([{ name: 'receipt', maxCount: 1 }, { name: 'screenshot', maxCount: 1 }]), clientController_1.submitManualPayment);
router.post('/admin/payments/verify', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PAYMENTS'), tenant_1.enforceTenantIsolation, clientController_1.verifyManualPayment);
router.get('/admin/payments', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PAYMENTS'), tenant_1.enforceTenantIsolation, adminController_1.getAdminPayments);
router.post('/client/coupons/apply', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, couponController_1.applyCoupon);
router.get('/client/payments/:id/invoice', auth_1.authenticateJWT, clientController_1.downloadInvoice);
// ----------------------------------------------------
// PAYMENTS WEBHOOK (RAZORPAY SIMULATOR)
// ----------------------------------------------------
router.post('/webhook/razorpay', clientController_1.handleRazorpayWebhook);
// ----------------------------------------------------
// PAYMENT GATEWAY STATUS CHECK
// ----------------------------------------------------
router.get('/payment/gateway-status', auth_1.authenticateJWT, clientController_1.getPaymentGatewayStatus);
// ----------------------------------------------------
// RAZORPAY REAL PAYMENT INTEGRATION
// ----------------------------------------------------
router.post('/payment/razorpay/initiate', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.initiateRazorpayPayment);
router.post('/payment/razorpay/verify', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.verifyRazorpayPayment);
// ----------------------------------------------------
// CCAVENUE REAL PAYMENT INTEGRATION
// ----------------------------------------------------
router.post('/payment/ccavenue/initiate', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.initiateCCAvenuePayment);
router.post('/payment/ccavenue/response', clientController_1.handleCCAvenueResponse);
// ----------------------------------------------------
// RESEARCH MODULE
// ----------------------------------------------------
router.post('/research', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_RESEARCH'), tenant_1.enforceTenantIsolation, researchController_1.createResearch);
router.put('/research/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_RESEARCH'), tenant_1.enforceTenantIsolation, researchController_1.updateResearch);
router.post('/research/:id/publish', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_RESEARCH'), tenant_1.enforceTenantIsolation, researchController_1.publishResearch);
router.get('/research/list', auth_1.authenticateJWT, (req, res, next) => {
    if (req.user?.role === 'CLIENT')
        return next();
    return (0, auth_1.requireAnyPermission)(['ACCESS_RESEARCH', 'ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD'])(req, res, next);
}, tenant_1.enforceTenantIsolation, researchController_1.listResearch);
router.get('/research/:id/detail', auth_1.authenticateJWT, (req, res, next) => {
    if (req.user?.role === 'CLIENT')
        return next();
    return (0, auth_1.requireAnyPermission)(['ACCESS_RESEARCH', 'ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD'])(req, res, next);
}, tenant_1.enforceTenantIsolation, researchController_1.viewResearchDetail);
// ----------------------------------------------------
// COMPLIANCE & DEPOSIT ENGINE
// ----------------------------------------------------
router.post('/compliance/check', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']), tenant_1.enforceTenantIsolation, complianceController_1.runComplianceCheck);
router.get('/compliance/alerts', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']), tenant_1.enforceTenantIsolation, complianceController_1.getAlerts);
router.get('/compliance/dashboard-metrics', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']), complianceController_1.getComplianceDashboardMetrics);
router.get('/compliance/periodic-report-data', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']), tenant_1.enforceTenantIsolation, complianceController_1.getPeriodicReportData);
router.get('/compliance/periodic-report-meta', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']), tenant_1.enforceTenantIsolation, complianceController_1.getPeriodicReportMeta);
router.post('/compliance/alerts/:id/close', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_COMPLIANCE'), tenant_1.enforceTenantIsolation, upload.single('proof'), complianceController_1.closeAlert);
router.get('/compliance/checklist', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_COMPLIANCE'), tenant_1.enforceTenantIsolation, complianceController_1.getChecklist);
router.get('/compliance/checklist/history', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_COMPLIANCE'), tenant_1.enforceTenantIsolation, complianceController_1.getChecklistHistory);
router.post('/compliance/checklist/:requirementId', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_COMPLIANCE'), tenant_1.enforceTenantIsolation, upload.single('proofDocumentUrl'), complianceController_1.updateAuditStatus);
router.get('/compliance/penalties', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_COMPLIANCE'), tenant_1.enforceTenantIsolation, complianceController_1.getPenalties);
router.post('/compliance/penalties/:id/resolve', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_COMPLIANCE'), tenant_1.enforceTenantIsolation, upload.single('proof'), complianceController_1.resolvePenalty);
// ----------------------------------------------------
// CLIENT PORTAL & TICKETS
// ----------------------------------------------------
router.get('/client/market-overview', auth_1.authenticateJWT, marketController_1.getMarketOverview);
router.get('/client/news-feed', auth_1.authenticateJWT, marketController_1.getNewsFeed);
router.get('/client/subscriptions', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, clientPortalController_1.getSubscriptions);
router.get('/client/payments', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, clientPortalController_1.getPaymentHistory);
router.put('/client/profile', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, clientPortalController_1.updateProfile);
router.get('/client/notifications', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, clientPortalController_1.getNotifications);
// TICKETS
router.post('/client/tickets', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, upload.single('attachment'), ticketController_1.createTicket);
router.get('/client/tickets', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, ticketController_1.listTickets);
router.get('/client/tickets/:id', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, ticketController_1.getTicket);
router.post('/client/tickets/:id/reply', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, upload.single('attachment'), ticketController_1.replyTicket);
// ADMIN/STAFF TICKETS
router.get('/admin/tickets', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, ticketController_1.listAdminTickets);
router.get('/admin/tickets/:id', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, ticketController_1.getAdminTicket);
router.get('/client/coupons', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, couponController_1.getClientCoupons);
router.post('/client/coupons/apply', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, couponController_1.applyCoupon);
router.post('/admin/tickets/:id/reply', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, upload.single('attachment'), ticketController_1.replyAdminTicket);
router.post('/admin/tickets/:id/close', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, ticketController_1.closeAdminTicket);
// ----------------------------------------------------
// SIGNAL & STOCK MANAGEMENT
// ----------------------------------------------------
router.get('/stocks', auth_1.authenticateJWT, signalController_1.getStocks);
router.get('/signals', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, signalController_1.listSignals);
router.post('/signals', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_RESEARCH'), tenant_1.enforceTenantIsolation, upload.single('report'), signalController_1.createSignal);
router.patch('/signals/:id/close', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_RESEARCH'), tenant_1.enforceTenantIsolation, signalController_1.closeSignal);
router.post('/signals/:id/report', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_RESEARCH'), tenant_1.enforceTenantIsolation, upload.single('report'), signalController_1.uploadReport);
router.post('/signals/:id/messages', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_RESEARCH'), tenant_1.enforceTenantIsolation, signalController_1.addSignalMessage);
// ----------------------------------------------------
// COMPLAINTS & GRIEVANCES
// ----------------------------------------------------
router.get('/compliance/complaints', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_COMPLIANCE'), tenant_1.enforceTenantIsolation, complaintController_1.getComplaints);
router.post('/compliance/complaints', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_COMPLIANCE'), tenant_1.enforceTenantIsolation, complaintController_1.createComplaint);
// Client-specific complaint routes
router.get('/client/complaints', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, complaintController_1.getComplaints);
router.post('/client/complaints', auth_1.authenticateJWT, tenant_1.enforceTenantIsolation, complaintController_1.createComplaint);
router.put('/compliance/complaints/:id/resolve', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_COMPLIANCE'), tenant_1.enforceTenantIsolation, upload.single('proof'), complaintController_1.resolveComplaint);
// ----------------------------------------------------
// RESOURCES MANAGEMENT
// ----------------------------------------------------
router.post('/super-admin/resources', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), upload.single('file'), resourceController_1.uploadResource);
router.delete('/super-admin/resources/:id', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), resourceController_1.deleteResource);
router.get('/resources', auth_1.authenticateJWT, resourceController_1.getResources);
// ----------------------------------------------------
// LOCATIONS MANAGEMENT
// ----------------------------------------------------
router.get('/locations/states', locationController_1.getStates);
// ----------------------------------------------------
// GENERIC DOWNLOAD (Bypasses Nginx Static Block)
// ----------------------------------------------------
router.get('/download', async (req, res) => {
    try {
        let fileUrl = req.query.path;
        if (!fileUrl) {
            return res.status(400).json({ success: false, message: 'Invalid file path' });
        }
        if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
            try {
                fileUrl = new URL(fileUrl).pathname;
            }
            catch { }
        }
        try {
            fileUrl = decodeURIComponent(fileUrl);
        }
        catch { }
        // Prevent directory traversal
        const normalizedUrl = path_1.default.normalize(fileUrl).replace(/^(\.\.[\/\\])+/, '');
        const relativePath = normalizedUrl.replace(/^[\/\\]?uploads[\/\\]/, '');
        const fileName = path_1.default.basename(normalizedUrl);
        const roots = [
            getUploadRoot(),
            path_1.default.resolve(process.cwd(), '../uploads'),
            path_1.default.resolve(process.cwd(), 'uploads'),
            path_1.default.resolve(__dirname, '../../uploads'),
            path_1.default.resolve(__dirname, '../../../uploads'),
            'A:/RA_SEBI_COMPLINCE/uploads',
            'A:/RA_SEBI_COMPLINCE/backend/uploads'
        ];
        const subfolders = ['research', 'resources', 'policies', 'branding', 'agreements', 'payments', 'compliance', 'kyc', 'staff', 'tickets'];
        let foundPath = null;
        // 1. Check relative path directly
        for (const root of roots) {
            const p = path_1.default.resolve(root, relativePath);
            if (fs_1.default.existsSync(p) && fs_1.default.statSync(p).isFile()) {
                foundPath = p;
                break;
            }
        }
        // 2. Check direct fileName at root
        if (!foundPath) {
            for (const root of roots) {
                const p = path_1.default.resolve(root, fileName);
                if (fs_1.default.existsSync(p) && fs_1.default.statSync(p).isFile()) {
                    foundPath = p;
                    break;
                }
            }
        }
        // 3. Search across all known subfolders
        if (!foundPath) {
            for (const root of roots) {
                for (const sub of subfolders) {
                    const p = path_1.default.resolve(root, sub, fileName);
                    if (fs_1.default.existsSync(p) && fs_1.default.statSync(p).isFile()) {
                        foundPath = p;
                        break;
                    }
                }
                if (foundPath)
                    break;
            }
        }
        // 4. Stem/Fuzzy matching if exact timestamped filename was rotated/modified or uploaded with a different prefix
        if (!foundPath) {
            const stems = new Set();
            let tempName = fileName;
            while (/^\d+_(.+)$/.test(tempName)) {
                tempName = tempName.replace(/^\d+_/, '');
                if (tempName)
                    stems.add(tempName);
            }
            const cleanBase = fileName.replace(/^(\d+_)+/, '');
            if (cleanBase)
                stems.add(cleanBase);
            const candidateMatches = [];
            for (const root of roots) {
                if (!fs_1.default.existsSync(root))
                    continue;
                const foldersToScan = ['', ...subfolders];
                for (const sub of foldersToScan) {
                    const dir = sub ? path_1.default.resolve(root, sub) : root;
                    if (!fs_1.default.existsSync(dir) || !fs_1.default.statSync(dir).isDirectory())
                        continue;
                    try {
                        const files = fs_1.default.readdirSync(dir);
                        for (const f of files) {
                            const fullFPath = path_1.default.resolve(dir, f);
                            if (!fs_1.default.statSync(fullFPath).isFile())
                                continue;
                            for (const stem of stems) {
                                if (f === stem) {
                                    candidateMatches.push({ filePath: fullFPath, mtime: fs_1.default.statSync(fullFPath).mtimeMs, score: 100 });
                                }
                                else if (f.endsWith(stem)) {
                                    candidateMatches.push({ filePath: fullFPath, mtime: fs_1.default.statSync(fullFPath).mtimeMs, score: 80 });
                                }
                                else if (cleanBase.length > 4 && f.toLowerCase().includes(cleanBase.toLowerCase())) {
                                    candidateMatches.push({ filePath: fullFPath, mtime: fs_1.default.statSync(fullFPath).mtimeMs, score: 50 });
                                }
                            }
                        }
                    }
                    catch { }
                }
            }
            if (candidateMatches.length > 0) {
                candidateMatches.sort((a, b) => b.score - a.score || b.mtime - a.mtime);
                foundPath = candidateMatches[0].filePath;
            }
        }
        // 5. On-Demand Dynamic Agreement PDF Generation
        if (!foundPath && (fileName.includes('_signed_agreement') || fileUrl.includes('agreement'))) {
            try {
                const clientMatch = fileName.match(/^([a-f0-9]{24})_signed_agreement/i) || fileUrl.match(/([a-f0-9]{24})/i);
                if (clientMatch && clientMatch[1]) {
                    const clientId = clientMatch[1];
                    const pdfBuffer = await (0, pdfService_1.generateAgreementPdf)(clientId, { isSigned: true });
                    if (pdfBuffer && pdfBuffer.length > 0) {
                        const saveDir = path_1.default.resolve(getUploadRoot(), 'agreements');
                        if (!fs_1.default.existsSync(saveDir)) {
                            try {
                                fs_1.default.mkdirSync(saveDir, { recursive: true });
                            }
                            catch { }
                        }
                        const savePath = path_1.default.resolve(saveDir, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
                        try {
                            fs_1.default.writeFileSync(savePath, pdfBuffer);
                        }
                        catch { }
                        res.setHeader('Content-Type', 'application/pdf');
                        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                        return res.send(pdfBuffer);
                    }
                }
            }
            catch (genErr) {
                console.warn('[DOWNLOAD] Agreement PDF dynamic generation failed:', genErr);
            }
        }
        // 6. On-Demand Dynamic Invoice PDF Generation
        if (!foundPath && (fileName.toLowerCase().includes('invoice') || fileUrl.toLowerCase().includes('invoice'))) {
            try {
                const invMatch = fileName.match(/^Invoice_([a-zA-Z0-9_-]+)\.pdf/i) || fileUrl.match(/Invoice_([a-zA-Z0-9_-]+)/i) || fileName.match(/^([a-f0-9]{24})/i);
                if (invMatch && invMatch[1]) {
                    const identifier = invMatch[1];
                    const pdfBuffer = await (0, invoiceGenerator_1.generateInvoicePdf)(identifier);
                    if (pdfBuffer && pdfBuffer.length > 0) {
                        const saveDir = path_1.default.resolve(getUploadRoot(), 'payments');
                        if (!fs_1.default.existsSync(saveDir)) {
                            try {
                                fs_1.default.mkdirSync(saveDir, { recursive: true });
                            }
                            catch { }
                        }
                        const savePath = path_1.default.resolve(saveDir, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
                        try {
                            fs_1.default.writeFileSync(savePath, pdfBuffer);
                        }
                        catch { }
                        res.setHeader('Content-Type', 'application/pdf');
                        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                        return res.send(pdfBuffer);
                    }
                }
            }
            catch (invErr) {
                console.warn('[DOWNLOAD] Invoice PDF dynamic generation failed:', invErr);
            }
        }
        if (foundPath) {
            const ext = path_1.default.extname(foundPath).toLowerCase();
            if (ext === '.pdf') {
                res.setHeader('Content-Type', 'application/pdf');
            }
            return res.download(foundPath, fileName);
        }
        else {
            return res.status(404).json({ success: false, message: 'File not found on server' });
        }
    }
    catch (err) {
        console.error('[DOWNLOAD ERROR]:', err);
        return res.status(500).json({ success: false, message: 'Internal server error during download' });
    }
});
exports.default = router;
