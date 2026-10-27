"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tenant = exports.TenantSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.TenantSchema = new mongoose_1.Schema({
    companyName: { type: String, required: true },
    companyType: { type: String, default: 'INDIVIDUAL' },
    raType: { type: String, default: 'FULL_TIME' },
    sebiRegistration: { type: String, required: true },
    bseEnrollment: { type: String, default: null },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    pan: { type: String, required: true },
    gst: { type: String, default: null },
    website: { type: String, default: null },
    ownerName: { type: String, default: 'Admin User' },
    certificateUrl: { type: String, default: null },
    onboardingCertificateUrl: { type: String, default: null },
    renewedCertificateUrl: { type: String, default: null },
    certificateValidity: { type: Date, default: null },
    nismCertificateUrl: { type: String, default: null },
    nismValidity: { type: Date, default: null },
    status: { type: String, default: 'PENDING_PROFILE' },
    previousStatus: { type: String, default: null },
    depositAmount: { type: Number, default: 0.0 },
    aiUsage: { type: Boolean, default: false },
    internalPolicyUrl: { type: String, default: null },
    logoUrl: { type: String, default: null },
    faviconUrl: { type: String, default: null },
    gstEnabled: { type: Boolean, default: true },
    gstCalculationType: { type: String, default: 'EXCLUSIVE' },
    invoiceDispatchPolicy: { type: String, enum: ['IMMEDIATE_ON_PAYMENT', 'AFTER_KYC_AGREEMENT'], default: 'AFTER_KYC_AGREEMENT' },
    state: { type: String, default: null },
    smtpHost: { type: String, default: null },
    smtpPort: { type: Number, default: null },
    smtpUser: { type: String, default: null },
    smtpPassword: { type: String, default: null },
    smtpFrom: { type: String, default: null },
    ccInvoiceEnabled: { type: Boolean, default: false },
    ccInvoiceEmail: { type: String, default: null },
    ccAgreementEnabled: { type: Boolean, default: false },
    ccAgreementEmail: { type: String, default: null },
    bankAccountName: { type: String, default: null },
    bankAccountNo: { type: String, default: null },
    bankAccountType: { type: String, default: null },
    bankIfsc: { type: String, default: null },
    bankName: { type: String, default: null },
    bankBranch: { type: String, default: null },
    socialMediaLinks: { type: String, default: null },
    digioClientId: { type: String, default: null },
    digioClientSecret: { type: String, default: null },
    digioKycTemplateName: { type: String, default: null },
    digioEnvironment: { type: String, default: 'SANDBOX' },
    agreementContent: { type: String, default: null },
    kraProvider: { type: String, default: null },
    kraApiKey: { type: String, default: null },
    kraApiSecret: { type: String, default: null },
    camsClientCode: { type: String, default: null },
    camsClientId: { type: String, default: null },
    camsClientSecret: { type: String, default: null },
    camsPoscode: { type: String, default: null },
    camsStatus: { type: String, default: '1' },
    coSignatureUrl: { type: String, default: null },
    activePaymentGateway: { type: String, default: 'RAZORPAY' },
    paymentGatewayEnabled: { type: Boolean, default: true },
    razorpayKeyId: { type: String, default: null },
    razorpayKeySecret: { type: String, default: null },
    cashfreeAppId: { type: String, default: null },
    cashfreeSecretKey: { type: String, default: null },
    ccavenueMerchantId: { type: String, default: null },
    ccavenueAccessCode: { type: String, default: null },
    ccavenueWorkingKey: { type: String, default: null },
    stripePublishableKey: { type: String, default: null },
    stripeSecretKey: { type: String, default: null },
    upiQrEnabled: { type: Boolean, default: false },
    upiId: { type: String, default: null },
    upiPayeeName: { type: String, default: null },
    upiQrImageUrl: { type: String, default: null },
    upiInstructions: { type: String, default: null },
    kycFirst: { type: Boolean, default: true },
    welcomeEmailText: { type: String, default: null },
    termsPdfUrl: { type: String, default: null },
    privacyPdfUrl: { type: String, default: null },
    reportDisclaimer: { type: String, default: null },
    panelName: { type: String, default: null },
    domainUrl: { type: String, default: null },
    mongoDbUrl: { type: String, default: null },
    dbName: { type: String, default: null },
    tenantApiKey: { type: String, default: null },
    passwordPolicy: { type: String, enum: ['NORMAL', 'STRONG'], default: 'NORMAL' },
    client2FAEnabled: { type: Boolean, default: false },
    twoFactorChannel: { type: String, enum: ['EMAIL', 'SMS', 'BOTH'], default: 'EMAIL' },
    signupVerificationMode: { type: String, enum: ['EMAIL_ONLY', 'MOBILE_ONLY', 'BOTH'], default: 'EMAIL_ONLY' },
    videoKycEnabled: { type: Boolean, default: true },
    clientVideoKycRequestEnabled: { type: Boolean, default: true },
    videoKycAgreementRule: { type: String, enum: ['ALL', 'SIGNED_ONLY', 'PENDING_ONLY'], default: 'ALL' },
    videoKycPlanRule: { type: String, enum: ['ALL', 'ACTIVE_ONLY', 'EXPIRED_ONLY'], default: 'ALL' },
    globalVideoKycConsentText: {
        type: String,
        default: 'I, {{clientName}}, confirm that I have voluntarily subscribed to the research services of {{companyName}}. I have reviewed and signed the SEBI Research Analyst Service Agreement and confirm that my PAN card is {{pan}}.'
    },
    lockedTradesPreviewCount: { type: Number, default: 5 },
    showCategoryClientCountToResearcher: { type: Boolean, default: false },
    showOpenTradePotential: { type: Boolean, default: true },
    showLockedTradePotential: { type: Boolean, default: true },
    smsGatewayEnabled: { type: Boolean, default: false },
    smsGatewayUrl: { type: String, default: 'https://bulksms.pnpuniverse.com/sms/user/urlsms.php' },
    smsUsername: { type: String, default: null },
    smsPassword: { type: String, default: null },
    smsSenderId: { type: String, default: null },
    smsEntityId: { type: String, default: null },
    telegramTradeEnabled: { type: Boolean, default: false },
    smsTradeEnabled: { type: Boolean, default: false },
    telegramBotToken: { type: String, default: null },
    telegramBotUsername: { type: String, default: null },
    telegramJoinRule: { type: String, enum: ['ALL', 'KYC_AGREEMENT_VERIFIED', 'ACTIVE_PLAN_ONLY'], default: 'ALL' },
    isLive: { type: Boolean, default: false },
    goLiveAt: { type: Date, default: null },
    goLiveBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    complianceCutoffDate: { type: Date, default: null },
    complianceFeaturesEnabled: { type: Boolean, default: true },
    l2ApprovalEnabled: { type: Boolean, default: false },
    l2ApprovalRoleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Role', default: null },
    fileDownloadPolicy: { type: String, enum: ['SYSTEM', 'EMAIL', 'BOTH'], default: 'BOTH' },
    fileDownloadNotificationEmail: { type: String, default: null },
    maxEmailFileSizeMb: { type: Number, default: 10 },
    createdById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'Tenant' });
exports.Tenant = mongoose_1.default.models.Tenant || mongoose_1.default.model('Tenant', exports.TenantSchema, 'Tenant');
exports.default = exports.Tenant;
