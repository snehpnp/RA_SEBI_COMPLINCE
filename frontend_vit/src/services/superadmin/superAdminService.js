import api from '../api';

export const getTenants = (params) => api.getTenants(params);
export const getPublicTenants = () => api.getPublicTenants();
export const getTenantDocumentHistory = (id) => api.getTenantDocumentHistory(id);
export const getTenantClients = (id) => api.getTenantClients(id);
export const getTenantStaff = (id) => api.getTenantStaff(id);
export const createTenant = (data) => api.createTenant(data);
export const createTenantJson = (data) => api.createTenantJson(data);
export const toggleTenantStatus = (id) => api.toggleTenantStatus(id);
export const provisionTenantDb = (id) => api.provisionTenantDb(id);
export const syncTenantApi = (id) => api.syncTenantApi(id);
export const syncAllTenants = () => api.syncAllTenants();

export const getSuperAdminDashboard = () => api.getSuperAdminDashboard();
export const getCompanyPanelStats = (id) => api.getCompanyPanelStats(id);
export const verifyDomainUrl = (url) => api.verifyDomainUrl(url);
export const testMongoConnection = (data) => api.testMongoConnection(data);
export const parseSebiCertificate = (file) => api.parseSebiCertificate(file);
export const parseNismCertificate = (file) => api.parseNismCertificate(file);
export const getSuperAdminComplianceRules = () => api.getSuperAdminComplianceRules();
export const updateSuperAdminComplianceRule = (id, data) => api.updateSuperAdminComplianceRule(id, data);

export default {
  getTenants,
  getPublicTenants,
  getTenantDocumentHistory,
  getTenantClients,
  getTenantStaff,
  createTenant,
  createTenantJson,
  toggleTenantStatus,
  provisionTenantDb,
  syncTenantApi,
  syncAllTenants,
  getSuperAdminDashboard,
  getCompanyPanelStats,
  verifyDomainUrl,
  testMongoConnection,
  parseSebiCertificate,
  parseNismCertificate,
  getSuperAdminComplianceRules,
  updateSuperAdminComplianceRule
};
