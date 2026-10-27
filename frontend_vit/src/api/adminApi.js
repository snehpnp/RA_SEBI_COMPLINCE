import api from '@/services/api';

export const getDashboardStats = () => api.get('/admin/stats');
export const getStaffList = () => api.get('/admin/staff');
export const createStaff = (data) => api.post('/admin/staff', data);
export const updateStaff = (id, data) => api.put(`/admin/staff/${id}`, data);
export const deleteStaff = (id) => api.delete(`/admin/staff/${id}`);

export const getClientsList = (params) => api.get('/admin/clients', { params });
export const getClientDetails = (id) => api.get(`/admin/clients/${id}`);
export const updateClient = (id, data) => api.put(`/admin/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/admin/clients/${id}`);

export const getPlans = () => api.get('/admin/plans');
export const createPlan = (data) => api.post('/admin/plans', data);
export const updatePlan = (id, data) => api.put(`/admin/plans/${id}`, data);
export const deletePlan = (id) => api.delete(`/admin/plans/${id}`);

export const getPayments = (params) => api.get('/admin/payments', { params });
export const approvePayment = (id, data) => api.post(`/admin/payments/${id}/approve`, data);
export const rejectPayment = (id, data) => api.post(`/admin/payments/${id}/reject`, data);

export const getAuditLogs = (params) => api.get('/admin/audit-logs', { params });
export const getComplianceChecklist = () => api.get('/admin/compliance-checklist');
export const updateComplianceItem = (id, data) => api.put(`/admin/compliance-checklist/${id}`, data);

export const getAlerts = () => api.get('/admin/alerts');
export const closeAlert = (id, data) => api.post(`/admin/alerts/${id}/resolve`, data);

export const getTenantDetails = () => api.get('/tenant/profile');
export const updateTenantDetails = (data) => api.put('/tenant/profile', data);
