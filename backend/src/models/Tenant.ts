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
  gstCalculationType: string;
  state?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFrom?: string | null;
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
  agreementContent?: string | null;
  kraProvider?: string | null;
  kraApiKey?: string | null;
  kraApiSecret?: string | null;
  coSignatureUrl?: string | null;
  activePaymentGateway?: string | null;
  razorpayKeyId?: string | null;
  razorpayKeySecret?: string | null;
  cashfreeAppId?: string | null;
  cashfreeSecretKey?: string | null;
  ccavenueMerchantId?: string | null;
  ccavenueAccessCode?: string | null;
  ccavenueWorkingKey?: string | null;
  stripePublishableKey?: string | null;
  stripeSecretKey?: string | null;
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
    gstCalculationType: { type: String, default: 'EXCLUSIVE' },
    state: { type: String, default: null },
    smtpHost: { type: String, default: null },
    smtpPort: { type: Number, default: null },
    smtpUser: { type: String, default: null },
    smtpPassword: { type: String, default: null },
    smtpFrom: { type: String, default: null },
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
    agreementContent: { type: String, default: null },
    kraProvider: { type: String, default: null },
    kraApiKey: { type: String, default: null },
    kraApiSecret: { type: String, default: null },
    coSignatureUrl: { type: String, default: null },
    activePaymentGateway: { type: String, default: 'RAZORPAY' },
    razorpayKeyId: { type: String, default: null },
    razorpayKeySecret: { type: String, default: null },
    cashfreeAppId: { type: String, default: null },
    cashfreeSecretKey: { type: String, default: null },
    ccavenueMerchantId: { type: String, default: null },
    ccavenueAccessCode: { type: String, default: null },
    ccavenueWorkingKey: { type: String, default: null },
    stripePublishableKey: { type: String, default: null },
    stripeSecretKey: { type: String, default: null },
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
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null }
  },
  { ...baseSchemaOptions, collection: 'Tenant' }
);

export const Tenant = mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema, 'Tenant');
export default Tenant;
