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
const router = (0, express_1.Router)();
// Create uploads subdirectories if they don't exist
const uploadRoot = path_1.default.join(__dirname, '../../../uploads');
const folders = ['policies', 'agreements', 'kyc', 'payments', 'compliance', 'staff', 'branding', 'tickets', 'research', 'resources'];
folders.forEach(f => {
    const dir = path_1.default.join(uploadRoot, f);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// Configure Multer Storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        let dest = path_1.default.join(uploadRoot, 'policies');
        if (req.path.includes('manual'))
            dest = path_1.default.join(uploadRoot, 'payments');
        if (req.path.includes('close') || req.path.includes('resolve') || req.path.includes('compliance') || req.path.includes('checklist'))
            dest = path_1.default.join(uploadRoot, 'compliance');
        if (req.path.includes('kyc'))
            dest = path_1.default.join(uploadRoot, 'kyc');
        if (req.path.includes('staff'))
            dest = path_1.default.join(uploadRoot, 'staff');
        if (req.path.includes('settings') || req.path.includes('signature'))
            dest = path_1.default.join(uploadRoot, 'branding');
        if (req.path.includes('ticket') || req.path.includes('reply'))
            dest = path_1.default.join(uploadRoot, 'tickets');
        if (req.path.includes('signals') || req.path.includes('research'))
            dest = path_1.default.join(uploadRoot, 'research');
        if (req.path.includes('resources'))
            dest = path_1.default.join(uploadRoot, 'resources');
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf', 'image/png', 'image/jpeg', 'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
    ];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx', '.csv'];
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error('Only PDF, Word, Excel, and Image files are allowed!'), false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // Max 20MB
});
// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------
router.post('/auth/login', authController_1.login);
router.post('/auth/refresh', authController_1.refreshToken);
router.post('/auth/forgot-password', authController_1.forgotPassword);
router.post('/auth/reset-password', authController_1.resetPassword);
router.get('/auth/me', auth_1.authenticateJWT, authController_1.getMe);
router.post('/auth/change-password', auth_1.authenticateJWT, authController_1.changePassword);
router.post('/auth/logout', auth_1.authenticateJWT, authController_1.logout);
router.get('/public/tenants', authController_1.getPublicTenants);
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
router.put('/super-admin/password', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.updateSuperAdminPassword);
router.get('/super-admin/logs', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getAuditLogs);
router.get('/super-admin/compliance-rules', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getComplianceRules);
router.put('/super-admin/compliance-rules/:id', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.updateComplianceRule);
router.get('/super-admin/telemetry', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN']), superAdminController_1.getGlobalTelemetry);
// ----------------------------------------------------
// SYSTEM SETTINGS (GLOBAL BRANDING)
// ----------------------------------------------------
router.get('/system-settings/branding', systemSettingController_1.getGlobalBranding);
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
    { name: 'internalPolicyPdf', maxCount: 1 }
]), adminController_1.updateTenantSettings);
router.get('/admin/email-templates', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN', 'PRINCIPAL_OFFICER']), adminController_1.getEmailTemplates);
router.put('/admin/email-templates/:type', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN', 'PRINCIPAL_OFFICER']), adminController_1.updateEmailTemplate);
router.post('/admin/test-smtp', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN']), adminController_1.testSmtp);
router.post('/admin/test-smtp-connection', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['ADMIN']), systemSettingController_1.testSmtpConnection);
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
router.post('/admin/staff/:id/restore', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_STAFF'), tenant_1.enforceTenantIsolation, adminController_1.restoreStaff);
router.post('/admin/parse-nism-certificate', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_STAFF', 'ACCESS_DASHBOARD']), upload.single('nismCertificate'), superAdminController_1.parseNismCertificate);
// Admin Client Management
router.get('/admin/clients', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_CLIENTS', 'ACCESS_COMPLIANCE']), tenant_1.enforceTenantIsolation, adminController_1.getAdminClients);
router.get('/admin/clients/deleted', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.getAdminDeletedClients);
router.post('/admin/clients/:id/status', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.toggleClientStatus);
router.get('/admin/clients/:id/communications', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.getClientCommunications);
router.put('/admin/clients/:id/approve', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.approveClient);
router.put('/admin/clients/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.updateClient);
router.delete('/admin/clients/:id', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.deleteClient);
router.post('/admin/clients/:id/restore', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.restoreClient);
router.post('/admin/clients/:id/assign-plan', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_CLIENTS'), tenant_1.enforceTenantIsolation, adminController_1.assignPlanByAdmin);
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
router.post('/client/kyc/verify', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.verifyKRA);
router.post('/client/consent', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.acceptConsent);
router.post('/client/esign', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), clientController_1.signAgreement);
router.get('/client/plans', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, clientController_1.getPlans);
router.post('/client/payments/manual', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), upload.single('receipt'), clientController_1.submitManualPayment);
router.post('/admin/payments/verify', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PAYMENTS'), tenant_1.enforceTenantIsolation, clientController_1.verifyManualPayment);
router.get('/admin/payments', auth_1.authenticateJWT, (0, auth_1.requirePermission)('ACCESS_PAYMENTS'), tenant_1.enforceTenantIsolation, adminController_1.getAdminPayments);
router.post('/client/coupons/apply', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['CLIENT']), tenant_1.enforceTenantIsolation, couponController_1.applyCoupon);
router.get('/client/payments/:id/invoice', auth_1.authenticateJWT, clientController_1.downloadInvoice);
// ----------------------------------------------------
// PAYMENTS WEBHOOK (RAZORPAY SIMULATOR)
// ----------------------------------------------------
router.post('/webhook/razorpay', clientController_1.handleRazorpayWebhook);
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
router.get('/research/list', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_RESEARCH', 'ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']), tenant_1.enforceTenantIsolation, researchController_1.listResearch);
router.get('/research/:id/detail', auth_1.authenticateJWT, (0, auth_1.requireAnyPermission)(['ACCESS_RESEARCH', 'ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']), tenant_1.enforceTenantIsolation, researchController_1.viewResearchDetail);
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
router.get('/resources', auth_1.authenticateJWT, (0, auth_1.requireRoles)(['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'PRINCIPAL_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED', 'SALES', 'MARKETING']), resourceController_1.getResources);
// ----------------------------------------------------
// LOCATIONS MANAGEMENT
// ----------------------------------------------------
router.get('/locations/states', locationController_1.getStates);
// ----------------------------------------------------
// GENERIC DOWNLOAD (Bypasses Nginx Static Block)
// ----------------------------------------------------
router.get('/download', (req, res) => {
    try {
        const fileUrl = req.query.path;
        if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
            return res.status(400).json({ success: false, message: 'Invalid file path' });
        }
        // Prevent directory traversal
        const normalizedUrl = path_1.default.normalize(fileUrl).replace(/^(\.\.[\/\\])+/, '');
        // Strip the leading slash or /uploads/ so path.join doesn't treat it as absolute
        // Using the pre-computed uploadRoot from the top of the file
        const relativePath = normalizedUrl.replace(/^[\/\\]?uploads[\/\\]/, '');
        const uploadRoot = path_1.default.join(__dirname, '../../../uploads'); // re-declaring in scope just in case
        const filePath = path_1.default.join(uploadRoot, relativePath);
        if (fs_1.default.existsSync(filePath)) {
            res.download(filePath);
        }
        else {
            res.status(404).json({ success: false, message: 'File not found on server' });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error during download' });
    }
});
exports.default = router;
