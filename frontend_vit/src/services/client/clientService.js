import api from '../api';

export const registerClient = (data) => api.registerClient(data);
export const getClientProfile = () => api.getClientProfile();
export const updateClientProfile = (data) => api.updateClientProfile(data);
export const updateProfile = (data) => api.updateProfile(data);
export const updateClientTelegram = (data) => api.updateClientTelegram(data);
export const testClientTelegramPing = (data) => api.testClientTelegramPing(data);
export const verifyKRA = (data) => api.verifyKRA(data);
export const acceptConsent = (data) => api.acceptConsent(data);
export const deleteClientAccount = () => api.deleteClientAccount();
export const signAgreement = (data) => api.signAgreement(data);

export const getPlans = (params) => api.getPlans(params);
export const getClientSubscriptions = () => api.getClientSubscriptions();
export const getClientPayments = () => api.getClientPayments();
export const downloadInvoicePdf = (paymentId) => api.downloadInvoicePdf(paymentId);
export const submitManualPayment = (data) => api.submitManualPayment(data);
export const getPaymentGatewayStatus = () => api.getPaymentGatewayStatus();
export const initiateCCAvenuePayment = (data) => api.initiateCCAvenuePayment(data);
export const initiateRazorpayPayment = (data) => api.initiateRazorpayPayment(data);
export const verifyRazorpayPayment = (data) => api.verifyRazorpayPayment(data);

export const getClientNotifications = (params) => api.getClientNotifications(params);
export const markClientNotificationsAsRead = (data) => api.markClientNotificationsAsRead(data);

export const createTicket = (data) => api.createTicket(data);
export const listTickets = (params) => api.listTickets(params);
export const getTicket = (id) => api.getTicket(id);
export const replyTicket = (id, data) => api.replyTicket(id, data);

export const createComplaint = (data) => api.createComplaint(data);
export const getClientCoupons = () => api.getClientCoupons();
export const applyCoupon = (data) => api.applyCoupon(data);
export const getClientTimeline = (params) => api.getClientTimeline(params);

export default {
  registerClient,
  getClientProfile,
  updateClientProfile,
  updateProfile,
  updateClientTelegram,
  testClientTelegramPing,
  verifyKRA,
  acceptConsent,
  deleteClientAccount,
  signAgreement,
  getPlans,
  getClientSubscriptions,
  getClientPayments,
  downloadInvoicePdf,
  submitManualPayment,
  getPaymentGatewayStatus,
  initiateCCAvenuePayment,
  initiateRazorpayPayment,
  verifyRazorpayPayment,
  getClientNotifications,
  markClientNotificationsAsRead,
  createTicket,
  listTickets,
  getTicket,
  replyTicket,
  createComplaint,
  getClientCoupons,
  applyCoupon,
  getClientTimeline
};
