import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IClient extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId?: Types.ObjectId | null;
  userId: Types.ObjectId;
  name: string;
  panName?: string | null;
  aadhaarName?: string | null;
  email: string;
  mobile: string;
  dob?: Date | string | null;
  gender?: string | null;
  fatherName?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  category: string;
  occupation?: string | null;
  status: string;
  kycStatus?: string | null;
  agreementSigned?: boolean;
  kraVerified: boolean;
  digilockerData?: any;
  signatureUrl?: string | null;
  signedAt?: Date | null;
  createdById?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ClientSchema = new Schema<IClient>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true },
    panName: { type: String, default: null },
    aadhaarName: { type: String, default: null },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    dob: { type: Schema.Types.Mixed, default: null },
    gender: { type: String, default: null },
    fatherName: { type: String, default: null },
    pan: { type: String, default: undefined },
    aadhaar: { type: String, default: undefined },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    zipCode: { type: String, default: null },
    country: { type: String, default: 'India' },
    category: { type: String, default: 'INDIVIDUAL' },
    occupation: { type: String, default: null },
    status: { type: String, default: 'ACTIVE' },
    kycStatus: { type: String, default: 'PENDING' },
    agreementSigned: { type: Boolean, default: false },
    kraVerified: { type: Boolean, default: false },
    digilockerData: { type: Schema.Types.Mixed, default: null },
    signatureUrl: { type: String, default: null },
    signedAt: { type: Date, default: null },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { ...baseSchemaOptions, collection: 'Client', autoIndex: false }
);

ClientSchema.index(
  { pan: 1 },
  { unique: true, partialFilterExpression: { pan: { $type: 'string' } } }
);
ClientSchema.index(
  { aadhaar: 1 },
  { unique: true, partialFilterExpression: { aadhaar: { $type: 'string' } } }
);

// Virtual relations
ClientSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

ClientSchema.virtual('profile', {
  ref: 'ClientProfile',
  localField: '_id',
  foreignField: 'clientId',
  justOne: true
});

ClientSchema.virtual('documents', {
  ref: 'ClientDocument',
  localField: '_id',
  foreignField: 'clientId'
});

ClientSchema.virtual('agreements', {
  ref: 'Agreement',
  localField: '_id',
  foreignField: 'clientId'
});

ClientSchema.virtual('consents', {
  ref: 'Consent',
  localField: '_id',
  foreignField: 'clientId'
});

ClientSchema.virtual('subscriptions', {
  ref: 'Subscription',
  localField: '_id',
  foreignField: 'clientId'
});

ClientSchema.virtual('supportTickets', {
  ref: 'SupportTicket',
  localField: '_id',
  foreignField: 'clientId'
});

ClientSchema.virtual('complaints', {
  ref: 'Complaint',
  localField: '_id',
  foreignField: 'clientId'
});

ClientSchema.virtual('identityHistory', {
  ref: 'ClientIdentityHistory',
  localField: '_id',
  foreignField: 'clientId'
});

ClientSchema.virtual('complianceAlerts', {
  ref: 'ComplianceAlert',
  localField: '_id',
  foreignField: 'clientId'
});

ClientSchema.virtual('coupons', {
  ref: 'Coupon',
  localField: '_id',
  foreignField: 'clientId'
});

export const Client = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema, 'Client');
export default Client;
