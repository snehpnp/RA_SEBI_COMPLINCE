import api from '@/services/api';

export const login = (credentials) => api.post('/auth/login', credentials);
export const adminLogin = (credentials) => api.post('/auth/admin-login', credentials);
export const superAdminLogin = (credentials) => api.post('/auth/super-admin/login', credentials);
export const clientLogin = (credentials) => api.post('/auth/client-login', credentials);
export const staffLogin = (credentials) => api.post('/auth/staff-login', credentials);

export const register = (data) => api.post('/auth/register', data);
export const clientRegister = (data) => api.post('/auth/client-register', data);

export const verifyOtp = (data) => api.post('/auth/verify-otp', data);
export const resendOtp = (data) => api.post('/auth/resend-otp', data);
export const logout = () => api.post('/auth/logout');
export const getCurrentUser = () => api.get('/auth/me');
