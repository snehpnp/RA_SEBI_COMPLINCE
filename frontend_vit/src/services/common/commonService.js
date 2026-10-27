import api from '../api';

export const getHeaders = (extraHeaders) => api.getHeaders(extraHeaders);
export const getBaseUrl = () => api.getBaseUrl();
export const getDownloadUrl = (url) => api.getDownloadUrl(url);
export const downloadFileFromUrl = (url, filename) => api.downloadFileFromUrl(url, filename);

// Common Data & References
export const getStates = () => api.getStates();
export const getTelemetry = (params) => api.getTelemetry(params);
export const getOccupations = () => api.getOccupations();
export const getFaqs = () => api.getFaqs();
export const getStocks = (params) => api.getStocks(params);
export const getMarketOverview = () => api.getMarketOverview();
export const getNewsFeed = () => api.getNewsFeed();

// Common DigiLocker & KYC Bridge
export const initiateDigioKyc = (data) => api.initiateDigioKyc(data);
export const initiateDigioAgreement = (data) => api.initiateDigioAgreement(data);
export const updateDigioStatus = (id, data) => api.updateDigioStatus(id, data);
export const testDigioConfig = (data) => api.testDigioConfig(data);
export const fetchDigioRecord = (data) => api.fetchDigioRecord(data);
export const testCamsKra = (data) => api.testCamsKra(data);
export const fetchCamsRecord = (data) => api.fetchCamsRecord(data);

// Common Video KYC Verification
export const getVideoKycSession = (sessionId) => api.getVideoKycSession(sessionId);
export const verifyVideoKycOtp = (sessionId, otp) => api.verifyVideoKycOtp(sessionId, otp);
export const resendVideoKycOtp = (sessionId) => api.resendVideoKycOtp(sessionId);

// DSC Bridge Helpers
export const getDscBridgeUrl = () => api.getDscBridgeUrl();
export const setDscBridgeUrl = (url) => api.setDscBridgeUrl(url);
export const checkDscBridgeStatus = (url) => api.checkDscBridgeStatus(url);
export const pingDscBridge = (url) => api.pingDscBridge(url);
export const signPdfWithDscBridge = (data) => api.signPdfWithDscBridge(data);

export default {
  getHeaders,
  getBaseUrl,
  getDownloadUrl,
  downloadFileFromUrl,
  getStates,
  getTelemetry,
  getOccupations,
  getFaqs,
  getStocks,
  getMarketOverview,
  getNewsFeed,
  initiateDigioKyc,
  initiateDigioAgreement,
  updateDigioStatus,
  testDigioConfig,
  fetchDigioRecord,
  testCamsKra,
  fetchCamsRecord,
  getVideoKycSession,
  verifyVideoKycOtp,
  resendVideoKycOtp,
  getDscBridgeUrl,
  setDscBridgeUrl,
  checkDscBridgeStatus,
  pingDscBridge,
  signPdfWithDscBridge
};
