import api from '@/services/api';

export const getStaffProfile = () => api.get('/staff/profile');
export const updateStaffProfile = (data) => api.put('/staff/profile', data);
export const getAssignedClients = (params) => api.get('/staff/clients', { params });
export const getStaffTasks = () => api.get('/staff/tasks');
export const updateStaffTask = (id, data) => api.put(`/staff/tasks/${id}`, data);
export const uploadNismCertificate = (data) => api.post('/staff/nism-certificate', data);
