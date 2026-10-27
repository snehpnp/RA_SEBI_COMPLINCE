import api from '../api';

export const getStaff = (params) => api.getStaff(params);
export const getStaffProfile = () => api.getCurrentUser();
export const updateStaffProfile = (data) => api.updateProfile(data);
export const adminParseNismCertificate = (file) => api.adminParseNismCertificate(file);
export const uploadCallRecording = (clientId, file) => api.uploadCallRecording(clientId, file);
export const listVideoKycSessions = (params) => api.listVideoKycSessions(params);
export const reviewVideoKycSession = (sessionId, data) => api.reviewVideoKycSession(sessionId, data);

export default {
  getStaff,
  getStaffProfile,
  updateStaffProfile,
  adminParseNismCertificate,
  uploadCallRecording,
  listVideoKycSessions,
  reviewVideoKycSession
};
