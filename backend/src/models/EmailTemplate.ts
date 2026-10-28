import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IEmailTemplate extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  type: string; // WELCOME, CHANGE_PASSWORD, KYC_AGREEMENT, INVOICE, LOGIN_2FA, REGISTRATION_OTP, etc.
  name?: string;
  description?: string;
  subject: string;
  body: string;
  variables?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    type: { type: String, required: true },
    name: { type: String },
    description: { type: String },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    variables: [{ type: String }]
  },
  { ...baseSchemaOptions, collection: 'EmailTemplate' }
);

EmailTemplateSchema.index({ tenantId: 1, type: 1 }, { unique: true });

EmailTemplateSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

export const EmailTemplate =
  mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema, 'EmailTemplate');
export default EmailTemplate;
