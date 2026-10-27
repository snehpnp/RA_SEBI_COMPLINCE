import api from '../api';

// Profile Completeness & Setup
export const getProfileCompleteness = () => api.getProfileCompleteness();
export const saveProfileStep = (step, data) => api.saveProfileStep(step, data);
export const goLiveTenant = (data) => api.goLiveTenant(data);
export const adminParseNismCertificate = (file) => api.adminParseNismCertificate(file);

// Staff Management
export const getStaff = (params) => api.getStaff(params);
export const createStaff = (data) => api.createStaff(data);
export const updateStaff = (id, data) => api.updateStaff(id, data);
export const toggleStaffStatus = (id) => api.toggleStaffStatus(id);
export const deleteStaff = (id) => api.deleteStaff(id);
export const restoreStaff = (id) => api.restoreStaff(id);
export const getStaffPassword = (id) => api.getStaffPassword(id);
export const resendStaffPassword = (id) => api.resendStaffPassword(id);

// Clients Management
export const getAdminClients = (params) => api.getAdminClients(params);
export const getClientCommunicationsAdmin = (clientId) => api.getClientCommunicationsAdmin(clientId);
export const getClientTimelineAdmin = (clientId) => api.getClientTimelineAdmin(clientId);
export const getAdminDeletedClients = () => api.getAdminDeletedClients();
export const toggleAdminClientStatus = (id) => api.toggleAdminClientStatus(id);
export const approveClient = (id) => api.approveClient(id);
export const updateAdminClient = (id, data) => api.updateAdminClient(id, data);
export const deleteAdminClient = (id) => api.deleteAdminClient(id);
export const restoreAdminClient = (id) => api.restoreAdminClient(id);
export const assignPlanByAdmin = (clientId, planId, data) => api.assignPlanByAdmin(clientId, planId, data);

// Plans & Categories
export const getAdminCategories = () => api.getAdminCategories();
export const createCategory = (data) => api.createCategory(data);
export const updateCategory = (id, data) => api.updateCategory(id, data);
export const toggleCategoryStatus = (id) => api.toggleCategoryStatus(id);
export const getAdminPlans = () => api.getAdminPlans();
export const createPlan = (data) => api.createPlan(data);
export const updatePlan = (id, data) => api.updatePlan(id, data);
export const togglePlanStatus = (id) => api.togglePlanStatus(id);
export const deletePlan = (id) => api.deletePlan(id);
export const restorePlan = (id) => api.restorePlan(id);

// Payments & Approvals
export const getAdminPayments = (params) => api.getAdminPayments(params);
export const verifyManualPayment = (id, status, remarks) => api.verifyManualPayment(id, status, remarks);
export const sendPaymentInvoiceEmail = (paymentId) => api.sendPaymentInvoiceEmail(paymentId);
export const simulateRazorpayWebhook = (data) => api.simulateRazorpayWebhook(data);

// Compliance & Penalties
export const getComplianceChecklist = () => api.getComplianceChecklist();
export const getComplianceChecklistHistory = (params) => api.getComplianceChecklistHistory(params);
export const updateAuditStatus = (id, data) => api.updateAuditStatus(id, data);
export const getPenalties = (params) => api.getPenalties(params);
export const resolvePenalty = (id, data) => api.resolvePenalty(id, data);
export const runComplianceCheck = () => api.runComplianceCheck();
export const getComplianceAlerts = () => api.getComplianceAlerts();
export const closeComplianceAlert = (id, data) => api.closeComplianceAlert(id, data);
export const getTenantCompliance = (params) => api.getTenantCompliance(params);
export const runTenantComplianceSweep = () => api.runTenantComplianceSweep();

// Roles & Permissions
export const getRoles = () => api.getRoles();
export const createRole = (data) => api.createRole(data);
export const updateRolePermissions = (id, permissions) => api.updateRolePermissions(id, permissions);
export const updateRole = (id, data) => api.updateRole(id, data);
export const deleteRole = (id) => api.deleteRole(id);

// Settings, FAQs & Occupations
export const updateTenantSettings = (data) => api.updateTenantSettings(data);
export const getAdminFaqs = () => api.getAdminFaqs();
export const createFaq = (data) => api.createFaq(data);
export const updateFaq = (id, data) => api.updateFaq(id, data);
export const deleteFaq = (id) => api.deleteFaq(id);
export const getAdminOccupations = () => api.getAdminOccupations();
export const createOccupation = (data) => api.createOccupation(data);
export const updateOccupation = (id, data) => api.updateOccupation(id, data);
export const toggleOccupationStatus = (id) => api.toggleOccupationStatus(id);
export const deleteOccupation = (id) => api.deleteOccupation(id);

// Email & SMS Templates
export const getEmailTemplates = () => api.getEmailTemplates();
export const updateEmailTemplate = (id, data) => api.updateEmailTemplate(id, data);
export const resetEmailTemplate = (id) => api.resetEmailTemplate(id);
export const getSmsTemplates = () => api.getSmsTemplates();
export const createSmsTemplate = (data) => api.createSmsTemplate(data);
export const updateSmsTemplate = (id, data) => api.updateSmsTemplate(id, data);
export const toggleSmsTemplateStatus = (id) => api.toggleSmsTemplateStatus(id);
export const deleteSmsTemplate = (id) => api.deleteSmsTemplate(id);
export const testSmsGateway = (data) => api.testSmsGateway(data);
export const testSmtpConnection = (data) => api.testSmtpConnection(data);
export const verifyPaymentGateway = (data) => api.verifyPaymentGateway(data);

// Tickets Desk
export const listAdminTickets = (params) => api.listAdminTickets(params);
export const getAdminTicket = (id) => api.getAdminTicket(id);
export const replyAdminTicket = (id, data) => api.replyAdminTicket(id, data);
export const closeAdminTicket = (id, data) => api.closeAdminTicket(id, data);

// Research & Delivery Reports
export const createResearch = (data) => api.createResearch(data);
export const updateResearch = (id, data) => api.updateResearch(id, data);
export const publishResearch = (id) => api.publishResearch(id);
export const listResearch = (params) => api.listResearch(params);
export const getResearchDetail = (id) => api.getResearchDetail(id);
export const getSignals = (params) => api.getSignals(params);
export const createSignal = (data) => api.createSignal(data);
export const closeSignal = (id, data) => api.closeSignal(id, data);
export const uploadSignalReport = (data) => api.uploadSignalReport(data);
export const getMasterDeliveryReport = (params) => api.getMasterDeliveryReport(params);
export const getChannelDeliveryReport = (params) => api.getChannelDeliveryReport(params);
export const syncSmsDeliveryReports = () => api.syncSmsDeliveryReports();
export const testTelegramBot = (data) => api.testTelegramBot(data);

// Client Vaults & Records
export const getClientVaults = (params) => api.getClientVaults(params);
export const getClientVaultDetails = (clientId) => api.getClientVaultDetails(clientId);
export const downloadVaultInvoice = (invoiceId) => api.downloadVaultInvoice(invoiceId);
export const downloadVaultAgreement = (agreementId) => api.downloadVaultAgreement(agreementId);
export const downloadVaultResearchReport = (reportId) => api.downloadVaultResearchReport(reportId);
export const uploadCallRecording = (clientId, file) => api.uploadCallRecording(clientId, file);
export const deleteCallRecording = (recordingId) => api.deleteCallRecording(recordingId);
export const downloadVaultFile = (fileId) => api.downloadVaultFile(fileId);

// Video KYC Desk
export const createVideoKycSession = (clientId) => api.createVideoKycSession(clientId);
export const startEarlyVideoKycSession = (sessionId) => api.startEarlyVideoKycSession(sessionId);
export const listVideoKycSessions = (params) => api.listVideoKycSessions(params);
export const uploadVideoKycRecording = (sessionId, file) => api.uploadVideoKycRecording(sessionId, file);
export const reviewVideoKycSession = (sessionId, data) => api.reviewVideoKycSession(sessionId, data);
export const getVideoKycSettings = () => api.getVideoKycSettings();
export const updateVideoKycSettings = (data) => api.updateVideoKycSettings(data);

// Digital Signatures
export const getResearcherSignatureSettings = () => api.getResearcherSignatureSettings();
export const updateResearcherSignatureSettings = (data) => api.updateResearcherSignatureSettings(data);
export const uploadResearcherSignature = (data) => api.uploadResearcherSignature(data);
export const initiateReportAadhaarEsign = (data) => api.initiateReportAadhaarEsign(data);
export const completeReportAadhaarEsign = (data) => api.completeReportAadhaarEsign(data);
export const useDailyAadhaarSign = (data) => api.useDailyAadhaarSign(data);
export const saveDscSignedReport = (data) => api.saveDscSignedReport(data);
export const verifyDscToken = (data) => api.verifyDscToken(data);
export const getResearcherDscPermissions = () => api.getResearcherDscPermissions();
export const updateResearcherDscPermission = (id, data) => api.updateResearcherDscPermission(id, data);

// Periodic Reporting & Resources
export const getPeriodicReportData = (params) => api.getPeriodicReportData(params);
export const getPeriodicReportMeta = () => api.getPeriodicReportMeta();
export const getResources = () => api.getResources();
export const uploadResource = (data) => api.uploadResource(data);
export const deleteResource = (id) => api.deleteResource(id);

// Coupons & Complaints
export const getCoupons = () => api.getCoupons();
export const createCoupon = (data) => api.createCoupon(data);
export const updateCoupon = (id, data) => api.updateCoupon(id, data);
export const toggleCouponVisibility = (id) => api.toggleCouponVisibility(id);
export const toggleCouponStatus = (id) => api.toggleCouponStatus(id);
export const getComplaints = (params) => api.getComplaints(params);
export const logAdminComplaint = (data) => api.logAdminComplaint(data);
export const resolveComplaint = (id, data) => api.resolveComplaint(id, data);

// Notifications & Audit Logs
export const getAdminNotifications = (params) => api.getAdminNotifications(params);
export const markAdminNotificationsAsRead = (data) => api.markAdminNotificationsAsRead(data);
export const getTenantAuditLogs = (params) => api.getTenantAuditLogs(params);
export const getAuditLogs = (params) => api.getAuditLogs(params);

export default {
  getProfileCompleteness,
  saveProfileStep,
  goLiveTenant,
  adminParseNismCertificate,
  getStaff,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
  restoreStaff,
  getStaffPassword,
  resendStaffPassword,
  getAdminClients,
  getClientCommunicationsAdmin,
  getClientTimelineAdmin,
  getAdminDeletedClients,
  toggleAdminClientStatus,
  approveClient,
  updateAdminClient,
  deleteAdminClient,
  restoreAdminClient,
  assignPlanByAdmin,
  getAdminCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  getAdminPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
  deletePlan,
  restorePlan,
  getAdminPayments,
  verifyManualPayment,
  sendPaymentInvoiceEmail,
  simulateRazorpayWebhook,
  getComplianceChecklist,
  getComplianceChecklistHistory,
  updateAuditStatus,
  getPenalties,
  resolvePenalty,
  runComplianceCheck,
  getComplianceAlerts,
  closeComplianceAlert,
  getTenantCompliance,
  runTenantComplianceSweep,
  getRoles,
  createRole,
  updateRolePermissions,
  updateRole,
  deleteRole,
  updateTenantSettings,
  getAdminFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  getAdminOccupations,
  createOccupation,
  updateOccupation,
  toggleOccupationStatus,
  deleteOccupation,
  getEmailTemplates,
  updateEmailTemplate,
  resetEmailTemplate,
  getSmsTemplates,
  createSmsTemplate,
  updateSmsTemplate,
  toggleSmsTemplateStatus,
  deleteSmsTemplate,
  testSmsGateway,
  testSmtpConnection,
  verifyPaymentGateway,
  listAdminTickets,
  getAdminTicket,
  replyAdminTicket,
  closeAdminTicket,
  createResearch,
  updateResearch,
  publishResearch,
  listResearch,
  getResearchDetail,
  getSignals,
  createSignal,
  closeSignal,
  uploadSignalReport,
  getMasterDeliveryReport,
  getChannelDeliveryReport,
  syncSmsDeliveryReports,
  testTelegramBot,
  getClientVaults,
  getClientVaultDetails,
  downloadVaultInvoice,
  downloadVaultAgreement,
  downloadVaultResearchReport,
  uploadCallRecording,
  deleteCallRecording,
  downloadVaultFile,
  createVideoKycSession,
  startEarlyVideoKycSession,
  listVideoKycSessions,
  uploadVideoKycRecording,
  reviewVideoKycSession,
  getVideoKycSettings,
  updateVideoKycSettings,
  getResearcherSignatureSettings,
  updateResearcherSignatureSettings,
  uploadResearcherSignature,
  initiateReportAadhaarEsign,
  completeReportAadhaarEsign,
  useDailyAadhaarSign,
  saveDscSignedReport,
  verifyDscToken,
  getResearcherDscPermissions,
  updateResearcherDscPermission,
  getPeriodicReportData,
  getPeriodicReportMeta,
  getResources,
  uploadResource,
  deleteResource,
  getCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponVisibility,
  toggleCouponStatus,
  getComplaints,
  logAdminComplaint,
  resolveComplaint,
  getAdminNotifications,
  markAdminNotificationsAsRead,
  getTenantAuditLogs,
  getAuditLogs
};
