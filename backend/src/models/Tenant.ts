import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ITenant extends Document {
  _id: Types.ObjectId;
  id: string;
  companyName: string;
  companyType: string;
  raType: string;
  sebiRegistration: string;
  bseEnrollment?: string | null;
  email: string;
  mobile: string;
  address: string;
  pan: string;
  gst?: string | null;
  website?: string | null;
  ownerName: string;
  certificateUrl?: string | null;
  certificateValidity?: Date | null;
  nismCertificateUrl?: string | null;
  nismValidity?: Date | null;
  status: string;
  previousStatus?: string | null;
  depositAmount: number;
  aiUsage: boolean;
  internalPolicyUrl?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  gstEnabled?: boolean;
  gstCalculationType: string;
  invoiceDispatchPolicy?: 'IMMEDIATE_ON_PAYMENT' | 'AFTER_KYC_AGREEMENT';
  state?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFrom?: string | null;
  ccInvoiceEnabled?: boolean;
  ccInvoiceEmail?: string | null;
  ccAgreementEnabled?: boolean;
  ccAgreementEmail?: string | null;
  bankAccountName?: string | null;
  bankAccountNo?: string | null;
  bankAccountType?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  socialMediaLinks?: string | null;
  digioClientId?: string | null;
  digioClientSecret?: string | null;
  digioKycTemplateName?: string | null;
  digioEnvironment?: string | null;
  agreementContent?: string | null;
  kraProvider?: string | null;
  kraApiKey?: string | null;
  kraApiSecret?: string | null;
  camsClientCode?: string | null;
  camsClientId?: string | null;
  camsClientSecret?: string | null;
  camsPoscode?: string | null;
  camsStatus?: string | null;
  coSignatureUrl?: string | null;
  activePaymentGateway?: string | null;
  paymentGatewayEnabled?: boolean;
  razorpayKeyId?: string | null;
  razorpayKeySecret?: string | null;
  cashfreeAppId?: string | null;
  cashfreeSecretKey?: string | null;
  ccavenueMerchantId?: string | null;
  ccavenueAccessCode?: string | null;
  ccavenueWorkingKey?: string | null;
  stripePublishableKey?: string | null;
  stripeSecretKey?: string | null;
  upiQrEnabled?: boolean;
  upiId?: string | null;
  upiPayeeName?: string | null;
  upiQrImageUrl?: string | null;
  upiInstructions?: string | null;
  kycFirst: boolean;
  welcomeEmailText?: string | null;
  termsPdfUrl?: string | null;
  privacyPdfUrl?: string | null;
  reportDisclaimer?: string | null;
  panelName?: string | null;
  domainUrl?: string | null;
  mongoDbUrl?: string | null;
  dbName?: string | null;
  tenantApiKey?: string | null;
  passwordPolicy?: 'NORMAL' | 'STRONG';
  client2FAEnabled?: boolean;
  twoFactorChannel?: 'EMAIL' | 'SMS' | 'BOTH';
  signupVerificationMode?: 'EMAIL_ONLY' | 'MOBILE_ONLY' | 'BOTH';
  videoKycEnabled?: boolean;
  clientVideoKycRequestEnabled?: boolean;
  videoKycAgreementRule?: 'ALL' | 'SIGNED_ONLY' | 'PENDING_ONLY';
  videoKycPlanRule?: 'ALL' | 'ACTIVE_ONLY' | 'EXPIRED_ONLY';
  globalVideoKycConsentText?: string | null;
  lockedTradesPreviewCount?: number;
  showOpenTradePotential?: boolean;
  showLockedTradePotential?: boolean;
  showCategoryClientCountToResearcher?: boolean;
  smsGatewayEnabled?: boolean;
  smsGatewayUrl?: string | null;
  smsUsername?: string | null;
  smsPassword?: string | null;
  smsSenderId?: string | null;
  smsEntityId?: string | null;
  telegramTradeEnabled?: boolean;
  smsTradeEnabled?: boolean;
  telegramBotToken?: string | null;
  telegramBotUsername?: string | null;
  telegramJoinRule?: 'ALL' | 'KYC_AGREEMENT_VERIFIED' | 'ACTIVE_PLAN_ONLY';
  isLive?: boolean;
  goLiveAt?: Date | null;
  goLiveBy?: Types.ObjectId | null;
  complianceCutoffDate?: Date | null;
  complianceFeaturesEnabled?: boolean;
  l2ApprovalEnabled?: boolean;
  l2ApprovalRoleId?: Types.ObjectId | null;
  fileDownloadPolicy?: 'SYSTEM' | 'EMAIL' | 'BOTH';
  fileDownloadNotificationEmail?: string | null;
  maxEmailFileSizeMb?: number;
  createdById?: Types.ObjectId | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const TenantSchema = new Schema<ITenant>(
  {
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
    goLiveBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    complianceCutoffDate: { type: Date, default: null },
    complianceFeaturesEnabled: { type: Boolean, default: true },
    l2ApprovalEnabled: { type: Boolean, default: false },
    l2ApprovalRoleId: { type: Schema.Types.ObjectId, ref: 'Role', default: null },
    fileDownloadPolicy: { type: String, enum: ['SYSTEM', 'EMAIL', 'BOTH'], default: 'BOTH' },
    fileDownloadNotificationEmail: { type: String, default: null },
    maxEmailFileSizeMb: { type: Number, default: 10 },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null }
  },
  { ...baseSchemaOptions, collection: 'Tenant' }
);

export const Tenant = mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema, 'Tenant');
export default Tenant;
