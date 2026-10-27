import api from '../api';

export const login = (username, password, tenantDomain) => api.login(username, password, tenantDomain);
export const requestLoginOtp = (username, tenantDomain) => api.requestLoginOtp(username, tenantDomain);
export const loginWithOtp = (username, otp, tenantDomain) => api.loginWithOtp(username, otp, tenantDomain);
export const verify2FA = (username, otp, tenantDomain) => api.verify2FA(username, otp, tenantDomain);
export const resend2FA = (username, tenantDomain) => api.resend2FA(username, tenantDomain);
export const logout = () => api.logout();
export const getSecurityPolicy = (tenantDomain) => api.getSecurityPolicy(tenantDomain);
export const refreshToken = () => api.refreshToken();
export const forgotPassword = (email) => api.forgotPassword(email);
export const changePassword = (oldPassword, newPassword) => api.changePassword(oldPassword, newPassword);
export const requestOtp = (data) => api.requestOtp(data);
export const verifyOtp = (data) => api.verifyOtp(data);
export const getCurrentUser = () => api.getCurrentUser();

export default {
  login,
  requestLoginOtp,
  loginWithOtp,
  verify2FA,
  resend2FA,
  logout,
  getSecurityPolicy,
  refreshToken,
  forgotPassword,
  changePassword,
  requestOtp,
  verifyOtp,
  getCurrentUser
};
