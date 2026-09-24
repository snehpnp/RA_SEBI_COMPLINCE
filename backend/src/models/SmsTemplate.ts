import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ISmsTemplate extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId?: Types.ObjectId | null;
  name: string;
  type: string; // 'LOGIN_2FA' | 'REGISTRATION_OTP' | 'CUSTOM'
  dltTemplateId: string;
  message: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
  createdById?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const SmsTemplateSchema = new Schema<ISmsTemplate>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true, default: 'CUSTOM' },
    dltTemplateId: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    isDefault: { type: Boolean, default: false },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { ...baseSchemaOptions, collection: 'SmsTemplate' }
);

SmsTemplateSchema.index({ tenantId: 1, type: 1 });
SmsTemplateSchema.index({ tenantId: 1, status: 1 });

export const SmsTemplate =
  mongoose.models.SmsTemplate ||
  mongoose.model<ISmsTemplate>('SmsTemplate', SmsTemplateSchema, 'SmsTemplate');

export default SmsTemplate;
