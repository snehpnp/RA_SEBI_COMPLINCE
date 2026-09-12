import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IClient extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId?: Types.ObjectId | null;
  userId: Types.ObjectId;
  name: string;
  email: string;
  mobile: string;
  dob?: Date | null;
  pan: string;
  aadhaar: string;
  category: string;
  occupation?: string | null;
  status: string;
  kraVerified: boolean;
  createdById?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ClientSchema = new Schema<IClient>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    dob: { type: Date, default: null },
    pan: { type: String, required: true, unique: true },
    aadhaar: { type: String, required: true, unique: true },
    category: { type: String, default: 'INDIVIDUAL' },
    occupation: { type: String, default: null },
    status: { type: String, default: 'ACTIVE' },
    kraVerified: { type: Boolean, default: false },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { ...baseSchemaOptions, collection: 'Client' }
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
