import api from '@/services/api';

export const getClientProfile = () => api.get('/client/profile');
export const updateClientProfile = (data) => api.put('/client/profile', data);
export const getMySubscriptions = () => api.get('/client/subscriptions');
export const getAvailablePlans = () => api.get('/client/available-plans');
export const initSubscriptionPayment = (data) => api.post('/client/payments/init', data);

export const getKycStatus = () => api.get('/client/kyc-status');
export const submitRiskAssessment = (answers) => api.post('/client/risk-assessment', { answers });
export const getAgreement = () => api.get('/client/agreement');
export const signAgreement = (signatureData) => api.post('/client/agreement/sign', signatureData);

export const getResearchReports = (params) => api.get('/client/research-reports', { params });
export const getInvoices = () => api.get('/client/invoices');
export const submitComplaint = (data) => api.post('/client/complaints', data);
