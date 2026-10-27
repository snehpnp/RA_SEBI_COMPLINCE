import api from '@/services/api';

export const getTenants = (params) => api.get('/super-admin/tenants', { params });
export const getTenantById = (id) => api.get(`/super-admin/tenants/${id}`);
export const createTenant = (data) => api.post('/super-admin/tenants', data);
export const updateTenant = (id, data) => api.put(`/super-admin/tenants/${id}`, data);
export const deleteTenant = (id) => api.delete(`/super-admin/tenants/${id}`);

export const getPlatformStats = () => api.get('/super-admin/stats');
export const getSuperAdminPlans = () => api.get('/super-admin/plans');
export const createSuperAdminPlan = (data) => api.post('/super-admin/plans', data);
export const updateSuperAdminPlan = (id, data) => api.put(`/super-admin/plans/${id}`, data);

export const getTenantUsers = (tenantId) => api.get(`/super-admin/tenants/${tenantId}/users`);
export const impersonateTenant = (tenantId) => api.post(`/super-admin/tenants/${tenantId}/impersonate`);
