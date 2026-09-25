import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IEmailTemplate extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  type: string; // WELCOME, CHANGE_PASSWORD, KYC_AGREEMENT, INVOICE
  subject: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    type: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true }
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
