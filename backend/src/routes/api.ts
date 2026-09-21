import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { login, refreshToken, forgotPassword, resetPassword, getMe, getPublicTenants, changePassword, logout, requestOtp, verifyOtp } from '../controllers/authController';
import { createTenant, getTenants, toggleTenantStatus, getAuditLogs, getGlobalTelemetry, deleteTenant, restoreTenant, permanentDeleteTenant, impersonateTenant, getTenantDetails, updateTenantDetails, updateSuperAdminPassword, parseSebiCertificate, parseNismCertificate, getComplianceRules, updateComplianceRule, getTenantDocumentHistory, provisionTenantDb, syncTenantApi, syncAllTenantsApi, getCompanyClients, getCompanyStaff, getCompanyCompliance, runCompanyComplianceSweep, verifyDomainUrl, testMongoConnection, getCompanyPanelStats } from '../controllers/superAdminController';
import { thirdPartyRoutes, getThirdPartyClients } from '../third-party-api';

import { getDashboardStats, getProfileCompleteness, saveProfileStep, createStaff, getStaff, updateStaff, toggleStaffStatus, deleteStaff, restoreStaff, getAdminClients, toggleClientStatus, updateClient, deleteClient, restoreClient, getAdminPlans, createPlan, updatePlan, deletePlan, restorePlan, updateTenantSettings, uploadSignature, getAdminCategories, createCategory, updateCategory, toggleCategoryStatus, togglePlanStatus, getTenantAuditLogs, assignPlanByAdmin, getAdminPayments, getEmailTemplates, updateEmailTemplate, testSmtp, verifyPaymentGateway, getAdminDeletedClients, approveClient, exportInvoicesZip, exportAgreementsZip, getClientCommunications, exportKRAZip, exportClientsCSV, exportDeletedClientsCSV, exportPaymentsCSV, exportResearchReportsZip, previewPolicyPdf, resetClientKyc } from '../controllers/adminController';
import { registerClient, verifyKRA, initiateDigioKyc, acceptConsent, signAgreement, handleRazorpayWebhook, initiateRazorpayPayment, verifyRazorpayPayment, submitManualPayment, verifyManualPayment, getPlans, getClientProfile, updateClientProfile, deleteClientAccount, uploadClientDocument, downloadInvoice, initiateCCAvenuePayment, handleCCAvenueResponse, getPaymentGatewayStatus } from '../controllers/clientController';
import { createResearch, updateResearch, publishResearch, listResearch, viewResearchDetail } from '../controllers/researchController';
import { runComplianceCheck, getAlerts, closeAlert, getChecklist, updateAuditStatus, getChecklistHistory, getPenalties, resolvePenalty, getComplianceDashboardMetrics, getPeriodicReportData, getPeriodicReportMeta } from '../controllers/complianceController';
import { createTicket, listTickets, getTicket, replyTicket, listAdminTickets, getAdminTicket, replyAdminTicket, closeAdminTicket } from '../controllers/ticketController';
import { getSubscriptions, getPaymentHistory, updateProfile, getNotifications } from '../controllers/clientPortalController';
import { getStocks, createSignal, listSignals, closeSignal, uploadReport, addSignalMessage } from '../controllers/signalController';
import { getComplaints, createComplaint, resolveComplaint } from '../controllers/complaintController';
import { getRoles, createRole, updateRolePermissions, updateRole, deleteRole } from '../controllers/roleController';
import { getActiveClientSummary, getActiveClientsByDate, getActiveClientsByMonthExport } from '../controllers/activeClientController';
import { getCoupons, createCoupon, updateCoupon, toggleCouponStatus, toggleCouponVisibility, applyCoupon, getClientCoupons } from '../controllers/couponController';
import { uploadResource, deleteResource, getResources } from '../controllers/resourceController';
import { getStates } from '../controllers/locationController';
import { initiateKyc, initiateAgreementEsign, updateKycAgreementStatus } from '../controllers/kycController';
import { authenticateJWT, requireRoles, requirePermission, requireAnyPermission } from '../middlewares/auth';
import { enforceTenantIsolation } from '../middlewares/tenant';
import { getMarketOverview } from '../controllers/marketController';
import { getActivePages, getPageBySlug, getAdminPages, savePage, deletePage, getComplaintReport, saveComplaintReport, getComplaintReportHistory } from '../controllers/pageController';
import { getSuperAdminProfile, updateSuperAdminProfile, getAdminProfile, updateAdminProfile, getStaffProfile, updateStaffProfile } from '../controllers/profileController';
import { getGlobalBranding, updateGlobalBranding, testSmtpConnection } from '../controllers/systemSettingController';
import { getTenantPermissions, updateTenantPermissions } from '../controllers/permissionController';
import { bootstrapTenant, syncTenantUpdate, syncTenantStatus, syncTenantDelete, getTenantSyncConfig } from '../controllers/tenantSyncController';
import { generateAgreementPdf } from '../services/pdfService';
import { generateInvoicePdf } from '../services/invoiceGenerator';
import {
  sendSignalApi,
  getGroupInviteLinkApi,
  getTelegramSettingsApi,
  updateTelegramSettingsApi,
  testTelegramConnectionApi,
  getClientTelegramGroupsApi,
  listTelegramGroupsApi,
  createTelegramGroupApi,
  updateTelegramGroupApi,
  deleteTelegramGroupApi,
  autoDetectTelegramGroupsApi,
  testTelegramGroupPingApi,
  generateGroupInviteLinkApi,
  sendTelegramPhoneOtpApi,
  verifyTelegramPhoneOtpApi,
  syncTelegramAccountGroupsApi,
  disconnectTelegramAccountApi,
  getTelegramAuthStatusApi,
  getTelegramPlanMatrixApi,
  bulkMapTelegramPlansApi,
  createTelegramChannelViaAccountApi,
  generateClientConnectTokenApi,
  getClientTelegramStatusApi,
  unlinkClientTelegramApi,
  telegramWebhookApi,
  getLinkedTelegramUsersApi,
  getTelegramDeliveryLogsApi
} from '../controllers/telegramController';

const router = Router();

// Robust Upload Root Helper
const getUploadRoot = () => {
  const candidates = [
    path.resolve(process.cwd(), '../uploads'),
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(__dirname, '../../uploads'),
    path.resolve(__dirname, '../../../uploads'),
    'A:/RA_SEBI_COMPLINCE/uploads',
    'A:/RA_SEBI_COMPLINCE/backend/uploads'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const defaultDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(defaultDir)) {
    try { fs.mkdirSync(defaultDir, { recursive: true }); } catch {}
  }
  return defaultDir;
};

const uploadRoot = getUploadRoot();
const folders = ['policies', 'agreements', 'kyc', 'payments', 'compliance', 'staff', 'branding', 'tickets', 'research', 'resources'];
folders.forEach(f => {
  const dir = path.join(uploadRoot, f);
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
});

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const root = getUploadRoot();
    let folder = 'policies';
    if (req.path.includes('manual')) folder = 'payments';
    else if (req.path.includes('close') || req.path.includes('resolve') || req.path.includes('compliance') || req.path.includes('checklist')) folder = 'compliance';
    else if (req.path.includes('kyc')) folder = 'kyc';
    else if (req.path.includes('staff')) folder = 'staff';
    else if (req.path.includes('settings') || req.path.includes('signature')) folder = 'branding';
    else if (req.path.includes('ticket') || req.path.includes('reply')) folder = 'tickets';
    else if (req.path.includes('signals') || req.path.includes('research')) folder = 'research';
    else if (req.path.includes('resources')) folder = 'resources';

    const dest = path.join(root, folder);
    if (!fs.existsSync(dest)) {
      try { fs.mkdirSync(dest, { recursive: true }); } catch {}
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'application/pdf', 'image/png', 'image/jpeg', 'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx', '.csv'];

  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, Word, Excel, and Image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // Max 20MB
});

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------
router.post('/auth/login', login);
router.post('/auth/refresh', refreshToken);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);
router.get('/auth/me', authenticateJWT, getMe);

router.post('/auth/change-password', authenticateJWT, changePassword);
router.post('/auth/logout', authenticateJWT, logout);
router.get('/public/tenants', getPublicTenants);
router.get('/public/clients', getThirdPartyClients);
router.get('/clients', getThirdPartyClients);
router.post('/public/request-otp', requestOtp);
router.post('/public/verify-otp', verifyOtp);
// ----------------------------------------------------
// PROFILE
// ----------------------------------------------------
router.get('/profile/super-admin', authenticateJWT, requireRoles(['SUPER_ADMIN']), getSuperAdminProfile);
router.put('/profile/super-admin', authenticateJWT, requireRoles(['SUPER_ADMIN']), updateSuperAdminProfile);

router.get('/profile/admin', authenticateJWT, requireRoles(['ADMIN']), getAdminProfile);
router.put('/profile/admin', authenticateJWT, requireRoles(['ADMIN']), updateAdminProfile);

router.get('/profile/staff', authenticateJWT, requireRoles(['PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED']), getStaffProfile);
router.put('/profile/staff', authenticateJWT, requireRoles(['PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED']), updateStaffProfile);

// ----------------------------------------------------
// SUPER ADMIN PORTAL
// ----------------------------------------------------
router.post(
  '/super-admin/parse-sebi-certificate',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  upload.single('sebiCertificate'),
  parseSebiCertificate
);
router.post(
  '/super-admin/parse-nism-certificate',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  upload.single('nismCertificate'),
  parseNismCertificate
);
router.post(
  '/super-admin/tenants',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  upload.fields([{ name: 'sebiCertificate', maxCount: 1 }, { name: 'nismCertificate', maxCount: 1 }]),
  createTenant
);
router.get(
  '/super-admin/tenants',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getTenants
);

router.post(
  '/super-admin/tenants/:id/status',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  toggleTenantStatus
);
router.delete(
  '/super-admin/tenants/:id',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  deleteTenant
);
router.post(
  '/super-admin/tenants/:id/restore',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  restoreTenant
);
router.delete(
  '/super-admin/tenants/:id/permanent',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  permanentDeleteTenant
);
router.post(
  '/super-admin/tenants/:id/impersonate',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  impersonateTenant
);
router.get(
  '/super-admin/tenants/:id',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getTenantDetails
);
router.get(
  '/super-admin/tenants/:id/documents',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getTenantDocumentHistory
);
router.put(
  '/super-admin/tenants/:id',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  upload.fields([
    { name: 'sebiCertificate', maxCount: 1 },
    { name: 'nismCertificate', maxCount: 1 }
  ]),
  updateTenantDetails
);
router.post(
  '/super-admin/tenants/:id/provision-db',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  provisionTenantDb
);
router.post(
  '/super-admin/tenants/:id/sync-api',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  syncTenantApi
);
router.post(
  '/super-admin/test-mongo-connection',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  testMongoConnection
);
router.post(
  '/super-admin/sync-all',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  syncAllTenantsApi
);
router.post(
  '/super-admin/tenants/sync-all',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  syncAllTenantsApi
);
router.post(
  '/super-admin/verify-domain',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  verifyDomainUrl
);
// Universal Remote Instance Webhook Sync Endpoints
router.post('/sync/bootstrap', bootstrapTenant);
router.post('/sync/tenant', bootstrapTenant);
router.post('/sync/update', syncTenantUpdate);
router.post('/sync/status', syncTenantStatus);
router.post('/sync/delete', syncTenantDelete);
router.get('/sync/config', getTenantSyncConfig);
router.get('/tenant/sync-config', getTenantSyncConfig);

router.get(
  '/super-admin/tenants/:id/clients',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getCompanyClients
);
router.get(
  '/super-admin/tenants/:id/staff',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getCompanyStaff
);
router.get(
  '/super-admin/tenants/:id/compliance',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getCompanyCompliance
);
router.post(
  '/super-admin/tenants/:id/compliance/sweep',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  runCompanyComplianceSweep
);
router.use('/third-party-api', thirdPartyRoutes);
router.get(
  '/super-admin/tenants/:tenantId/permissions',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getTenantPermissions
);
router.put(
  '/super-admin/tenants/:tenantId/permissions',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  updateTenantPermissions
);
router.post(
  '/super-admin/tenants/sync-all',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  syncAllTenantsApi
);
router.post(
  '/super-admin/verify-domain',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  verifyDomainUrl
);
router.put(
  '/super-admin/password',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  updateSuperAdminPassword
);
router.get(
  '/super-admin/logs',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getAuditLogs
);
router.get(
  '/super-admin/compliance-rules',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getComplianceRules
);
router.put(
  '/super-admin/compliance-rules/:id',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  updateComplianceRule
);
router.get(
  '/super-admin/telemetry',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getGlobalTelemetry
);
router.get(
  '/super-admin/dashboard',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getGlobalTelemetry
);
router.get(
  '/super-admin/dashboard-stats',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getGlobalTelemetry
);
router.get(
  '/super-admin/companies/:id/panel-stats',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  getCompanyPanelStats
);

// ----------------------------------------------------
// SYSTEM SETTINGS (GLOBAL BRANDING)
// ----------------------------------------------------
router.get('/system-settings/branding', getGlobalBranding);
router.get('/system-settings/preview-pdf/:type', previewPolicyPdf);
router.get('/admin/preview-pdf/:type', previewPolicyPdf);

router.put(
  '/system-settings/branding',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }, { name: 'loginLogo', maxCount: 1 }]),
  updateGlobalBranding
);

// ----------------------------------------------------
// ADMIN PORTAL
// ----------------------------------------------------

router.put(
  '/admin/signature',
  authenticateJWT,
  requireRoles(['ADMIN', 'SUPER_ADMIN', 'RESEARCHER']),
  upload.single('coSignature'),
  uploadSignature
);

router.put(
  '/admin/settings',
  authenticateJWT,
  requirePermission('ACCESS_SETTINGS'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'termsPdf', maxCount: 1 },
    { name: 'privacyPdf', maxCount: 1 },
    { name: 'coSignature', maxCount: 1 },
    { name: 'internalPolicyPdf', maxCount: 1 }
  ]),
  updateTenantSettings
);
router.get('/admin/email-templates', authenticateJWT, requireRoles(['ADMIN', 'PRINCIPAL_OFFICER']), getEmailTemplates);
router.put('/admin/email-templates/:type', authenticateJWT, requireRoles(['ADMIN', 'PRINCIPAL_OFFICER']), updateEmailTemplate);
router.post('/admin/test-smtp', authenticateJWT, requireRoles(['ADMIN']), testSmtp);
router.post('/admin/test-smtp-connection', authenticateJWT, requireRoles(['ADMIN']), testSmtpConnection);
router.post('/admin/verify-payment-gateway', authenticateJWT, requireRoles(['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'RESEARCHER']), verifyPaymentGateway);

// Bulk Exports
router.get('/admin/exports/invoices', authenticateJWT, requirePermission('EXPORT_DATA'), exportInvoicesZip);
router.get('/admin/exports/agreements', authenticateJWT, requirePermission('EXPORT_DATA'), exportAgreementsZip);
router.get('/admin/exports/kra', authenticateJWT, requirePermission('EXPORT_DATA'), exportKRAZip);
router.get('/admin/exports/clients', authenticateJWT, requirePermission('EXPORT_DATA'), exportClientsCSV);
router.get('/admin/exports/deleted-clients', authenticateJWT, requirePermission('EXPORT_DATA'), exportDeletedClientsCSV);
router.get('/admin/exports/payments', authenticateJWT, requirePermission('EXPORT_DATA'), exportPaymentsCSV);
router.get('/admin/exports/research-reports', authenticateJWT, requirePermission('EXPORT_DATA'), exportResearchReportsZip);

// Custom Pages (Admin & Read-only for Staff/CO/PO)
router.get('/admin/pages', authenticateJWT, getAdminPages);
router.post('/admin/pages', authenticateJWT, requireRoles(['ADMIN']), savePage);
router.delete('/admin/pages/:id', authenticateJWT, requireRoles(['ADMIN']), deletePage);

// Complaint Status Report (Admin)
router.post('/admin/complaint-report', authenticateJWT, requireRoles(['ADMIN']), saveComplaintReport);

// Public/Client Page Routes
router.get('/pages', getActivePages);
router.get('/pages/:slug', getPageBySlug);
router.get('/complaint-report', getComplaintReport);
router.get('/complaint-report/history', getComplaintReportHistory);

// ==========================================
router.get(
  '/admin/profile-completeness',
  authenticateJWT,
  requirePermission('ACCESS_DASHBOARD'),
  enforceTenantIsolation,
  getProfileCompleteness
);

// Active Client History endpoints
router.get(
  '/admin/active-clients/summary',
  authenticateJWT,
  requirePermission('ACCESS_DASHBOARD'),
  enforceTenantIsolation,
  getActiveClientSummary
);

router.get(
  '/admin/active-clients/month-export',
  authenticateJWT,
  requirePermission('ACCESS_DASHBOARD'),
  enforceTenantIsolation,
  getActiveClientsByMonthExport
);

router.get(
  '/admin/active-clients/date',
  authenticateJWT,
  requirePermission('ACCESS_DASHBOARD'),
  enforceTenantIsolation,
  getActiveClientsByDate
);

router.get(
  '/admin/audit-logs',
  authenticateJWT,
  enforceTenantIsolation,
  getTenantAuditLogs
);
router.post(
  '/admin/profile-wizard',
  authenticateJWT,
  requirePermission('ACCESS_DASHBOARD'),
  enforceTenantIsolation,
  upload.single('nismFile'),
  saveProfileStep
);
router.post(
  '/admin/staff',
  authenticateJWT,
  requirePermission('ACCESS_STAFF'),
  enforceTenantIsolation,
  upload.single('nismUpload'),
  createStaff
);
// --- Dashboard Stats ---
router.get(
  '/admin/dashboard-stats',
  authenticateJWT,
  requirePermission('ACCESS_DASHBOARD'),
  enforceTenantIsolation,
  getDashboardStats
);

router.get(
  '/admin/staff',
  authenticateJWT,
  requireAnyPermission(['ACCESS_STAFF', 'ACCESS_COMPLIANCE']),
  enforceTenantIsolation,
  getStaff
);
router.put(
  '/admin/staff/:id',
  authenticateJWT,
  requirePermission('ACCESS_STAFF'),
  enforceTenantIsolation,
  upload.single('nismUpload'),
  updateStaff
);
router.post(
  '/admin/staff/:id/status',
  authenticateJWT,
  requirePermission('ACCESS_STAFF'),
  enforceTenantIsolation,
  toggleStaffStatus
);
router.delete(
  '/admin/staff/:id',
  authenticateJWT,
  requirePermission('ACCESS_STAFF'),
  enforceTenantIsolation,
  deleteStaff
);
router.post(
  '/admin/staff/:id/delete',
  authenticateJWT,
  requirePermission('ACCESS_STAFF'),
  enforceTenantIsolation,
  deleteStaff
);
router.post(
  '/admin/staff/:id/restore',
  authenticateJWT,
  requirePermission('ACCESS_STAFF'),
  enforceTenantIsolation,
  restoreStaff
);
router.post(
  '/admin/parse-nism-certificate',
  authenticateJWT,
  requireAnyPermission(['ACCESS_STAFF', 'ACCESS_DASHBOARD']),
  upload.single('nismCertificate'),
  parseNismCertificate
);

// Admin Client Management
router.get(
  '/admin/clients',
  authenticateJWT,
  requireAnyPermission(['ACCESS_CLIENTS', 'ACCESS_COMPLIANCE']),
  enforceTenantIsolation,
  getAdminClients
);
router.post(
  '/admin/clients/reset-kyc',
  resetClientKyc
);
router.get(
  '/admin/clients/deleted',
  authenticateJWT,
  requirePermission('ACCESS_CLIENTS'),
  enforceTenantIsolation,
  getAdminDeletedClients
);
router.post(
  '/admin/clients/:id/status',
  authenticateJWT,
  requirePermission('ACCESS_CLIENTS'),
  enforceTenantIsolation,
  toggleClientStatus
);
router.get(
  '/admin/clients/:id/communications',
  authenticateJWT,
  requirePermission('ACCESS_CLIENTS'),
  enforceTenantIsolation,
  getClientCommunications
);
router.put(
  '/admin/clients/:id/approve',
  authenticateJWT,
  requirePermission('ACCESS_CLIENTS'),
  enforceTenantIsolation,
  approveClient
);
router.put(
  '/admin/clients/:id',
  authenticateJWT,
  requirePermission('ACCESS_CLIENTS'),
  enforceTenantIsolation,
  updateClient
);
router.delete(
  '/admin/clients/:id',
  authenticateJWT,
  requirePermission('ACCESS_CLIENTS'),
  enforceTenantIsolation,
  deleteClient
);
router.post(
  '/admin/clients/:id/delete',
  authenticateJWT,
  requirePermission('ACCESS_CLIENTS'),
  enforceTenantIsolation,
  deleteClient
);
router.post(
  '/admin/clients/:id/restore',
  authenticateJWT,
  requirePermission('ACCESS_CLIENTS'),
  enforceTenantIsolation,
  restoreClient
);
router.post(
  '/admin/clients/:id/assign-plan',
  authenticateJWT,
  requirePermission('ACCESS_CLIENTS'),
  enforceTenantIsolation,
  assignPlanByAdmin
);

// Admin Category Management
router.get(
  '/admin/categories',
  authenticateJWT,
  requirePermission('ACCESS_PLANS'),
  enforceTenantIsolation,
  getAdminCategories
);
router.post(
  '/admin/categories',
  authenticateJWT,
  requirePermission('ACCESS_PLANS'),
  enforceTenantIsolation,
  createCategory
);
router.put(
  '/admin/categories/:id',
  authenticateJWT,
  requirePermission('ACCESS_PLANS'),
  enforceTenantIsolation,
  updateCategory
);
router.post(
  '/admin/categories/:id/status',
  authenticateJWT,
  requirePermission('ACCESS_PLANS'),
  enforceTenantIsolation,
  toggleCategoryStatus
);

// Admin Plan Management
router.get(
  '/admin/plans',
  authenticateJWT,
  requireAnyPermission(['ACCESS_PLANS', 'ACCESS_RESEARCH']),
  enforceTenantIsolation,
  getAdminPlans
);
router.post(
  '/admin/plans',
  authenticateJWT,
  requirePermission('ACCESS_PLANS'),
  enforceTenantIsolation,
  createPlan
);
router.put(
  '/admin/plans/:id',
  authenticateJWT,
  requirePermission('ACCESS_PLANS'),
  enforceTenantIsolation,
  updatePlan
);
router.delete(
  '/admin/plans/:id',
  authenticateJWT,
  requirePermission('ACCESS_PLANS'),
  enforceTenantIsolation,
  deletePlan
);
router.post(
  '/admin/plans/:id/delete',
  authenticateJWT,
  requirePermission('ACCESS_PLANS'),
  enforceTenantIsolation,
  deletePlan
);
router.post(
  '/admin/plans/:id/restore',
  authenticateJWT,
  requirePermission('ACCESS_PLANS'),
  enforceTenantIsolation,
  restorePlan
);
router.post(
  '/admin/plans/:id/status',
  authenticateJWT,
  requirePermission('ACCESS_PLANS'),
  enforceTenantIsolation,
  togglePlanStatus
);

// Admin Role Management
router.get(
  '/admin/roles',
  authenticateJWT,
  requirePermission('ACCESS_ROLES'),
  getRoles
);
router.post(
  '/admin/roles',
  authenticateJWT,
  requirePermission('ACCESS_ROLES'),
  createRole
);
router.put(
  '/admin/roles/:id/permissions',
  authenticateJWT,
  requirePermission('ACCESS_ROLES'),
  updateRolePermissions
);
router.put(
  '/admin/roles/:id',
  authenticateJWT,
  requirePermission('ACCESS_ROLES'),
  updateRole
);
router.delete(
  '/admin/roles/:id',
  authenticateJWT,
  requirePermission('ACCESS_ROLES'),
  deleteRole
);

// Admin Coupon Management
router.get(
  '/admin/coupons',
  authenticateJWT,
  requirePermission('ACCESS_SETTINGS'),
  enforceTenantIsolation,
  getCoupons
);
router.post(
  '/admin/coupons',
  authenticateJWT,
  requirePermission('ACCESS_SETTINGS'),
  enforceTenantIsolation,
  createCoupon
);
router.put(
  '/admin/coupons/:id',
  authenticateJWT,
  requirePermission('ACCESS_SETTINGS'),
  enforceTenantIsolation,
  updateCoupon
);
router.post(
  '/admin/coupons/:id/visibility',
  authenticateJWT,
  requirePermission('ACCESS_SETTINGS'),
  enforceTenantIsolation,
  toggleCouponVisibility
);
router.post(
  '/admin/coupons/:id/status',
  authenticateJWT,
  requirePermission('ACCESS_SETTINGS'),
  enforceTenantIsolation,
  toggleCouponStatus
);

// ----------------------------------------------------
// CLIENT PORTAL (ONBOARDING & MANAGEMENT)
// ----------------------------------------------------
router.post('/client/register', registerClient);

// Digio Dynamic KYC and eSign routes
router.post('/client/kyc/initiate', authenticateJWT, requireRoles(['CLIENT']), initiateKyc);
router.post('/client/agreement/initiate', authenticateJWT, requireRoles(['CLIENT']), initiateAgreementEsign);
router.post('/client/kyc/status', authenticateJWT, requireRoles(['CLIENT']), updateKycAgreementStatus);

router.get(
  '/client/profile',
  authenticateJWT,
  requireRoles(['CLIENT']),
  getClientProfile
);
router.put(
  '/client/profile',
  authenticateJWT,
  requireRoles(['CLIENT']),
  updateClientProfile
);
router.delete(
  '/client/account',
  authenticateJWT,
  requireRoles(['CLIENT']),
  deleteClientAccount
);
router.post(
  '/client/documents',
  authenticateJWT,
  requireRoles(['CLIENT']),
  upload.single('file'),
  uploadClientDocument
);

router.post(
  '/client/kyc/initiate-digio',
  authenticateJWT,
  requireRoles(['CLIENT']),
  initiateDigioKyc
);

router.post(
  '/client/kyc/verify',
  authenticateJWT,
  requireRoles(['CLIENT']),
  verifyKRA
);
router.post(
  '/client/consent',
  authenticateJWT,
  requireRoles(['CLIENT']),
  acceptConsent
);
router.post(
  '/client/esign',
  authenticateJWT,
  requireRoles(['CLIENT']),
  signAgreement
);
router.get(
  '/client/plans',
  authenticateJWT,
  requireRoles(['CLIENT']),
  enforceTenantIsolation,
  getPlans
);
router.post(
  '/client/payments/manual',
  authenticateJWT,
  requireRoles(['CLIENT']),
  upload.single('receipt'),
  submitManualPayment
);
router.post(
  '/admin/payments/verify',
  authenticateJWT,
  requirePermission('ACCESS_PAYMENTS'),
  enforceTenantIsolation,
  verifyManualPayment
);
router.get(
  '/admin/payments',
  authenticateJWT,
  requirePermission('ACCESS_PAYMENTS'),
  enforceTenantIsolation,
  getAdminPayments
);

router.post(
  '/client/coupons/apply',
  authenticateJWT,
  requireRoles(['CLIENT']),
  enforceTenantIsolation,
  applyCoupon
);

router.get(
  '/client/payments/:id/invoice',
  authenticateJWT,
  downloadInvoice
);

// ----------------------------------------------------
// PAYMENTS WEBHOOK (RAZORPAY SIMULATOR)
// ----------------------------------------------------
router.post('/webhook/razorpay', handleRazorpayWebhook);

// ----------------------------------------------------
// PAYMENT GATEWAY STATUS CHECK
// ----------------------------------------------------
router.get(
  '/payment/gateway-status',
  authenticateJWT,
  getPaymentGatewayStatus
);

// ----------------------------------------------------
// RAZORPAY REAL PAYMENT INTEGRATION
// ----------------------------------------------------
router.post(
  '/payment/razorpay/initiate',
  authenticateJWT,
  requireRoles(['CLIENT']),
  initiateRazorpayPayment
);
router.post(
  '/payment/razorpay/verify',
  authenticateJWT,
  requireRoles(['CLIENT']),
  verifyRazorpayPayment
);

// ----------------------------------------------------
// CCAVENUE REAL PAYMENT INTEGRATION
// ----------------------------------------------------
router.post(
  '/payment/ccavenue/initiate',
  authenticateJWT,
  requireRoles(['CLIENT']),
  initiateCCAvenuePayment
);
router.post('/payment/ccavenue/response', handleCCAvenueResponse);

// ----------------------------------------------------
// RESEARCH MODULE
// ----------------------------------------------------
router.post(
  '/research',
  authenticateJWT,
  requirePermission('ACCESS_RESEARCH'),
  enforceTenantIsolation,
  createResearch
);
router.put(
  '/research/:id',
  authenticateJWT,
  requirePermission('ACCESS_RESEARCH'),
  enforceTenantIsolation,
  updateResearch
);
router.post(
  '/research/:id/publish',
  authenticateJWT,
  requirePermission('ACCESS_RESEARCH'),
  enforceTenantIsolation,
  publishResearch
);
router.get(
  '/research/list',
  authenticateJWT,
  (req: any, res: any, next: any) => {
    if (req.user?.role === 'CLIENT') return next();
    return requireAnyPermission(['ACCESS_RESEARCH', 'ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD'])(req, res, next);
  },
  enforceTenantIsolation,
  listResearch
);
router.get(
  '/research/:id/detail',
  authenticateJWT,
  (req: any, res: any, next: any) => {
    if (req.user?.role === 'CLIENT') return next();
    return requireAnyPermission(['ACCESS_RESEARCH', 'ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD'])(req, res, next);
  },
  enforceTenantIsolation,
  viewResearchDetail
);

// ----------------------------------------------------
// COMPLIANCE & DEPOSIT ENGINE
// ----------------------------------------------------
router.post(
  '/compliance/check',
  authenticateJWT,
  requireAnyPermission(['ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']),
  enforceTenantIsolation,
  runComplianceCheck
);
router.get(
  '/compliance/alerts',
  authenticateJWT,
  requireAnyPermission(['ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']),
  enforceTenantIsolation,
  getAlerts
);
router.get(
  '/compliance/dashboard-metrics',
  authenticateJWT,
  requireAnyPermission(['ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']),
  getComplianceDashboardMetrics
);
router.get(
  '/compliance/periodic-report-data',
  authenticateJWT,
  requireAnyPermission(['ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']),
  enforceTenantIsolation,
  getPeriodicReportData
);
router.get(
  '/compliance/periodic-report-meta',
  authenticateJWT,
  requireAnyPermission(['ACCESS_COMPLIANCE', 'ACCESS_DASHBOARD']),
  enforceTenantIsolation,
  getPeriodicReportMeta
);
router.post(
  '/compliance/alerts/:id/close',
  authenticateJWT,
  requirePermission('ACCESS_COMPLIANCE'),
  enforceTenantIsolation,
  upload.single('proof'),
  closeAlert
);
router.get(
  '/compliance/checklist',
  authenticateJWT,
  requirePermission('ACCESS_COMPLIANCE'),
  enforceTenantIsolation,
  getChecklist
);
router.get(
  '/compliance/checklist/history',
  authenticateJWT,
  requirePermission('ACCESS_COMPLIANCE'),
  enforceTenantIsolation,
  getChecklistHistory
);
router.post(
  '/compliance/checklist/:requirementId',
  authenticateJWT,
  requirePermission('ACCESS_COMPLIANCE'),
  enforceTenantIsolation,
  upload.single('proofDocumentUrl'),
  updateAuditStatus
);
router.get(
  '/compliance/penalties',
  authenticateJWT,
  requirePermission('ACCESS_COMPLIANCE'),
  enforceTenantIsolation,
  getPenalties
);
router.post(
  '/compliance/penalties/:id/resolve',
  authenticateJWT,
  requirePermission('ACCESS_COMPLIANCE'),
  enforceTenantIsolation,
  upload.single('proof'),
  resolvePenalty
);

// ----------------------------------------------------
// CLIENT PORTAL & TICKETS
// ----------------------------------------------------
router.get(
  '/client/market-overview',
  authenticateJWT,
  getMarketOverview
);

router.get(
  '/client/subscriptions',
  authenticateJWT,
  requireRoles(['CLIENT']),
  enforceTenantIsolation,
  getSubscriptions
);
router.get(
  '/client/payments',
  authenticateJWT,
  requireRoles(['CLIENT']),
  enforceTenantIsolation,
  getPaymentHistory
);
router.put(
  '/client/profile',
  authenticateJWT,
  requireRoles(['CLIENT']),
  enforceTenantIsolation,
  updateProfile
);
router.get(
  '/client/notifications',
  authenticateJWT,
  requireRoles(['CLIENT']),
  enforceTenantIsolation,
  getNotifications
);

// TICKETS
router.post(
  '/client/tickets',
  authenticateJWT,
  requireRoles(['CLIENT']),
  enforceTenantIsolation,
  upload.single('attachment'),
  createTicket
);
router.get(
  '/client/tickets',
  authenticateJWT,
  requireRoles(['CLIENT']),
  enforceTenantIsolation,
  listTickets
);
router.get(
  '/client/tickets/:id',
  authenticateJWT,
  requireRoles(['CLIENT']),
  enforceTenantIsolation,
  getTicket
);
router.post(
  '/client/tickets/:id/reply',
  authenticateJWT,
  requireRoles(['CLIENT']),
  enforceTenantIsolation,
  upload.single('attachment'),
  replyTicket
);

// ADMIN/STAFF TICKETS
router.get(
  '/admin/tickets',
  authenticateJWT,
  enforceTenantIsolation,
  listAdminTickets
);
router.get(
  '/admin/tickets/:id',
  authenticateJWT,
  enforceTenantIsolation,
  getAdminTicket
);
router.get(
  '/client/coupons',
  authenticateJWT,
  enforceTenantIsolation,
  getClientCoupons
);
router.post(
  '/client/coupons/apply',
  authenticateJWT,
  enforceTenantIsolation,
  applyCoupon
);
router.post(
  '/admin/tickets/:id/reply',
  authenticateJWT,
  enforceTenantIsolation,
  upload.single('attachment'),
  replyAdminTicket
);
router.post(
  '/admin/tickets/:id/close',
  authenticateJWT,
  enforceTenantIsolation,
  closeAdminTicket
);


// ----------------------------------------------------
// SIGNAL & STOCK MANAGEMENT
// ----------------------------------------------------
router.get(
  '/stocks',
  authenticateJWT,
  getStocks
);
router.get(
  '/signals',
  authenticateJWT,
  enforceTenantIsolation,
  listSignals
);
router.post(
  '/signals',
  authenticateJWT,
  requirePermission('ACCESS_RESEARCH'),
  enforceTenantIsolation,
  upload.single('report'),
  createSignal
);
router.patch(
  '/signals/:id/close',
  authenticateJWT,
  requirePermission('ACCESS_RESEARCH'),
  enforceTenantIsolation,
  closeSignal
);
router.post(
  '/signals/:id/report',
  authenticateJWT,
  requirePermission('ACCESS_RESEARCH'),
  enforceTenantIsolation,
  upload.single('report'),
  uploadReport
);
router.post(
  '/signals/:id/messages',
  authenticateJWT,
  requirePermission('ACCESS_RESEARCH'),
  enforceTenantIsolation,
  addSignalMessage
);

// ----------------------------------------------------
// COMPLAINTS & GRIEVANCES
// ----------------------------------------------------
router.get(
  '/compliance/complaints',
  authenticateJWT,
  requirePermission('ACCESS_COMPLIANCE'),
  enforceTenantIsolation,
  getComplaints
);
router.post(
  '/compliance/complaints',
  authenticateJWT,
  requirePermission('ACCESS_COMPLIANCE'),
  enforceTenantIsolation,
  createComplaint
);

// Client-specific complaint routes
router.get(
  '/client/complaints',
  authenticateJWT,
  enforceTenantIsolation,
  getComplaints
);
router.post(
  '/client/complaints',
  authenticateJWT,
  enforceTenantIsolation,
  createComplaint
);
router.put(
  '/compliance/complaints/:id/resolve',
  authenticateJWT,
  requirePermission('ACCESS_COMPLIANCE'),
  enforceTenantIsolation,
  upload.single('proof'),
  resolveComplaint
);

// ----------------------------------------------------
// RESOURCES MANAGEMENT
// ----------------------------------------------------
router.post(
  '/super-admin/resources',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  upload.single('file'),
  uploadResource
);

router.delete(
  '/super-admin/resources/:id',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN']),
  deleteResource
);

router.get(
  '/resources',
  authenticateJWT,
  getResources
);

// ----------------------------------------------------
// LOCATIONS MANAGEMENT
// ----------------------------------------------------
router.get(
  '/locations/states',
  getStates
);

// ----------------------------------------------------
// GENERIC DOWNLOAD (Bypasses Nginx Static Block)
// ----------------------------------------------------
router.get('/download', async (req, res) => {
  try {
    let fileUrl = req.query.path as string;
    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }

    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      try {
        fileUrl = new URL(fileUrl).pathname;
      } catch {}
    }

    try {
      fileUrl = decodeURIComponent(fileUrl);
    } catch {}

    // Prevent directory traversal
    const normalizedUrl = path.normalize(fileUrl).replace(/^(\.\.[\/\\])+/, '');
    const relativePath = normalizedUrl.replace(/^[\/\\]?uploads[\/\\]/, '');
    const fileName = path.basename(normalizedUrl);

    const roots = [
      getUploadRoot(),
      path.resolve(process.cwd(), '../uploads'),
      path.resolve(process.cwd(), 'uploads'),
      path.resolve(__dirname, '../../uploads'),
      path.resolve(__dirname, '../../../uploads'),
      'A:/RA_SEBI_COMPLINCE/uploads',
      'A:/RA_SEBI_COMPLINCE/backend/uploads'
    ];

    const subfolders = ['research', 'resources', 'policies', 'branding', 'agreements', 'payments', 'compliance', 'kyc', 'staff', 'tickets'];

    let foundPath: string | null = null;

    // 1. Check relative path directly
    for (const root of roots) {
      const p = path.resolve(root, relativePath);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        foundPath = p;
        break;
      }
    }

    // 2. Check direct fileName at root
    if (!foundPath) {
      for (const root of roots) {
        const p = path.resolve(root, fileName);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          foundPath = p;
          break;
        }
      }
    }

    // 3. Search across all known subfolders
    if (!foundPath) {
      for (const root of roots) {
        for (const sub of subfolders) {
          const p = path.resolve(root, sub, fileName);
          if (fs.existsSync(p) && fs.statSync(p).isFile()) {
            foundPath = p;
            break;
          }
        }
        if (foundPath) break;
      }
    }

    // 4. Stem/Fuzzy matching if exact timestamped filename was rotated/modified or uploaded with a different prefix
    if (!foundPath) {
      const stems = new Set<string>();
      let tempName = fileName;
      while (/^\d+_(.+)$/.test(tempName)) {
        tempName = tempName.replace(/^\d+_/, '');
        if (tempName) stems.add(tempName);
      }
      const cleanBase = fileName.replace(/^(\d+_)+/, '');
      if (cleanBase) stems.add(cleanBase);

      const candidateMatches: { filePath: string; mtime: number; score: number }[] = [];

      for (const root of roots) {
        if (!fs.existsSync(root)) continue;
        const foldersToScan = ['', ...subfolders];
        for (const sub of foldersToScan) {
          const dir = sub ? path.resolve(root, sub) : root;
          if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
          try {
            const files = fs.readdirSync(dir);
            for (const f of files) {
              const fullFPath = path.resolve(dir, f);
              if (!fs.statSync(fullFPath).isFile()) continue;

              for (const stem of stems) {
                if (f === stem) {
                  candidateMatches.push({ filePath: fullFPath, mtime: fs.statSync(fullFPath).mtimeMs, score: 100 });
                } else if (f.endsWith(stem)) {
                  candidateMatches.push({ filePath: fullFPath, mtime: fs.statSync(fullFPath).mtimeMs, score: 80 });
                } else if (cleanBase.length > 4 && f.toLowerCase().includes(cleanBase.toLowerCase())) {
                  candidateMatches.push({ filePath: fullFPath, mtime: fs.statSync(fullFPath).mtimeMs, score: 50 });
                }
              }
            }
          } catch {}
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
          const pdfBuffer = await generateAgreementPdf(clientId, { isSigned: true });
          if (pdfBuffer && pdfBuffer.length > 0) {
            const saveDir = path.resolve(getUploadRoot(), 'agreements');
            if (!fs.existsSync(saveDir)) {
              try { fs.mkdirSync(saveDir, { recursive: true }); } catch {}
            }
            const savePath = path.resolve(saveDir, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
            try { fs.writeFileSync(savePath, pdfBuffer); } catch {}
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.send(pdfBuffer);
          }
        }
      } catch (genErr) {
        console.warn('[DOWNLOAD] Agreement PDF dynamic generation failed:', genErr);
      }
    }

    // 6. On-Demand Dynamic Invoice PDF Generation
    if (!foundPath && (fileName.toLowerCase().includes('invoice') || fileUrl.toLowerCase().includes('invoice'))) {
      try {
        const invMatch = fileName.match(/^Invoice_([a-zA-Z0-9_-]+)\.pdf/i) || fileUrl.match(/Invoice_([a-zA-Z0-9_-]+)/i) || fileName.match(/^([a-f0-9]{24})/i);
        if (invMatch && invMatch[1]) {
          const identifier = invMatch[1];
          const pdfBuffer = await generateInvoicePdf(identifier);
          if (pdfBuffer && pdfBuffer.length > 0) {
            const saveDir = path.resolve(getUploadRoot(), 'payments');
            if (!fs.existsSync(saveDir)) {
              try { fs.mkdirSync(saveDir, { recursive: true }); } catch {}
            }
            const savePath = path.resolve(saveDir, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
            try { fs.writeFileSync(savePath, pdfBuffer); } catch {}
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.send(pdfBuffer);
          }
        }
      } catch (invErr) {
        console.warn('[DOWNLOAD] Invoice PDF dynamic generation failed:', invErr);
      }
    }

    if (foundPath) {
      const ext = path.extname(foundPath).toLowerCase();
      if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
      }
      return res.download(foundPath, fileName);
    } else {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }
  } catch (err: any) {
    console.error('[DOWNLOAD ERROR]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during download' });
  }
});

// ----------------------------------------------------
// TELEGRAM BOT INTEGRATION & SIGNAL COMMUNITY
// ----------------------------------------------------
// Client Subscribed Telegram Groups (Per-plan private groups)
router.get(
  '/client/telegram/groups',
  authenticateJWT,
  enforceTenantIsolation,
  getClientTelegramGroupsApi
);

router.get(
  '/telegram/client-groups',
  authenticateJWT,
  enforceTenantIsolation,
  getClientTelegramGroupsApi
);

// Client / User Connect Link (To join the common Telegram group)
router.get(
  '/telegram/invite-link',
  authenticateJWT,
  enforceTenantIsolation,
  getGroupInviteLinkApi
);

// Public / Guest invite link
router.get(
  '/public/telegram/invite-link',
  getGroupInviteLinkApi
);

// Broadcast signal directly to Telegram (Admin / Staff with ACCESS_RESEARCH)
router.post(
  '/telegram/send-signal',
  authenticateJWT,
  requirePermission('ACCESS_RESEARCH'),
  enforceTenantIsolation,
  sendSignalApi
);

// Admin: View Telegram bot and group status
router.get(
  '/telegram/settings',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  getTelegramSettingsApi
);
router.get(
  '/admin/telegram/settings',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  getTelegramSettingsApi
);

// Admin: Update Telegram bot token and group settings
router.put(
  '/telegram/settings',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  updateTelegramSettingsApi
);
router.post(
  '/telegram/settings',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  updateTelegramSettingsApi
);
router.patch(
  '/telegram/settings',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  updateTelegramSettingsApi
);
router.put(
  '/admin/telegram/settings',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  updateTelegramSettingsApi
);
router.post(
  '/admin/telegram/settings',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  updateTelegramSettingsApi
);

// Admin: Test Telegram connection and send test message
router.post(
  '/telegram/test-connection',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  testTelegramConnectionApi
);
router.post(
  '/admin/telegram/test-connection',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  testTelegramConnectionApi
);

// Dynamic Telegram Groups Management
router.get(
  '/telegram/groups',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  listTelegramGroupsApi
);
router.get(
  '/admin/telegram/groups',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  listTelegramGroupsApi
);

router.post(
  '/telegram/groups',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  createTelegramGroupApi
);
router.post(
  '/admin/telegram/groups',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  createTelegramGroupApi
);

router.post(
  '/telegram/groups/auto-detect',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  autoDetectTelegramGroupsApi
);
router.post(
  '/admin/telegram/groups/auto-detect',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  autoDetectTelegramGroupsApi
);

router.put(
  '/telegram/groups/:id',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  updateTelegramGroupApi
);
router.put(
  '/admin/telegram/groups/:id',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  updateTelegramGroupApi
);

router.delete(
  '/telegram/groups/:id',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  deleteTelegramGroupApi
);
router.delete(
  '/admin/telegram/groups/:id',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  deleteTelegramGroupApi
);

router.post(
  '/telegram/groups/:id/test',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  testTelegramGroupPingApi
);
router.post(
  '/admin/telegram/groups/:id/test',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  testTelegramGroupPingApi
);

router.post(
  '/telegram/groups/:id/generate-invite',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  generateGroupInviteLinkApi
);
router.post(
  '/admin/telegram/groups/:id/generate-invite',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  generateGroupInviteLinkApi
);

// --- Telegram Phone MTProto Authentication & 1-Click Sync ---
router.post(
  '/telegram/auth/send-code',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  sendTelegramPhoneOtpApi
);
router.post(
  '/admin/telegram/auth/send-code',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  sendTelegramPhoneOtpApi
);

router.post(
  '/telegram/auth/verify-code',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  verifyTelegramPhoneOtpApi
);
router.post(
  '/admin/telegram/auth/verify-code',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  verifyTelegramPhoneOtpApi
);

router.post(
  '/telegram/auth/sync-groups',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  syncTelegramAccountGroupsApi
);
router.post(
  '/admin/telegram/auth/sync-groups',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  syncTelegramAccountGroupsApi
);

router.post(
  '/telegram/auth/disconnect',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  disconnectTelegramAccountApi
);
router.post(
  '/admin/telegram/auth/disconnect',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  disconnectTelegramAccountApi
);

router.get(
  '/telegram/auth/status',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  getTelegramAuthStatusApi
);
router.get(
  '/admin/telegram/auth/status',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  getTelegramAuthStatusApi
);

// --- Telegram Multi-Plan Group Matrix ---
router.get(
  '/telegram/plans/matrix',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  getTelegramPlanMatrixApi
);
router.get(
  '/admin/telegram/plans/matrix',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  getTelegramPlanMatrixApi
);

router.post(
  '/telegram/plans/bulk-map',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  bulkMapTelegramPlansApi
);
router.post(
  '/admin/telegram/plans/bulk-map',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  bulkMapTelegramPlansApi
);

// --- Create Telegram Channel Directly On Admin Account ---
router.post(
  '/telegram/auth/create-channel',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  createTelegramChannelViaAccountApi
);
router.post(
  '/admin/telegram/auth/create-channel',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  createTelegramChannelViaAccountApi
);

// --- Client Telegram Linking Routes ---
router.post(
  '/client/telegram/generate-token',
  authenticateJWT,
  generateClientConnectTokenApi
);
router.get(
  '/client/telegram/status',
  authenticateJWT,
  getClientTelegramStatusApi
);
router.post(
  '/client/telegram/unlink',
  authenticateJWT,
  unlinkClientTelegramApi
);

// --- Public Telegram Webhook ---
router.post(
  '/telegram/webhook',
  telegramWebhookApi
);

// --- Admin: Linked Telegram Users & Delivery Logs ---
router.get(
  '/telegram/linked-users',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  getLinkedTelegramUsersApi
);
router.get(
  '/admin/telegram/linked-users',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  getLinkedTelegramUsersApi
);
router.get(
  '/telegram/delivery-logs',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  getTelegramDeliveryLogsApi
);
router.get(
  '/admin/telegram/delivery-logs',
  authenticateJWT,
  requireRoles(['SUPER_ADMIN', 'ADMIN', 'RESEARCHER', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER']),
  enforceTenantIsolation,
  getTelegramDeliveryLogsApi
);

export default router;

