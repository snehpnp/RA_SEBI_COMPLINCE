import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IVariableMapping {
  index: number;
  placeholder: string;
  fieldKey: string;
  selectedFields?: string[];
  customLabel?: string;
}

export interface ISmsTemplate extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId?: Types.ObjectId | null;
  name: string;
  type: string; // 'TRADE_SIGNAL' | 'LOGIN_2FA' | 'REGISTRATION_OTP' | 'CUSTOM'
  category: string; // 'TRADE_SIGNAL' | 'AUTH_OTP' | 'CUSTOM'
  applicableSegments: string[]; // e.g. ['CASH', 'FUTURE', 'OPTION']
  applicableActions: string[]; // e.g. ['BUY', 'SELL', 'TARGET', 'STOPLOSS']
  applicableCombinations: string[]; // e.g. ['CASH_BUY', 'CASH_SELL']
  variableMappings?: IVariableMapping[];
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
    type: { type: String, required: true, trim: true, default: 'TRADE_SIGNAL' },
    category: { type: String, default: 'TRADE_SIGNAL', trim: true },
    applicableSegments: { type: [String], default: [] },
    applicableActions: { type: [String], default: [] },
    applicableCombinations: { type: [String], default: [] },
    variableMappings: {
      type: [
        {
          index: { type: Number, required: true },
          placeholder: { type: String, required: true },
          fieldKey: { type: String, default: '' },
          selectedFields: { type: [String], default: [] },
          customLabel: { type: String, default: '' }
        }
      ],
      default: []
    },
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
SmsTemplateSchema.index({ tenantId: 1, applicableCombinations: 1 });

export const SmsTemplate =
  mongoose.models.SmsTemplate ||
  mongoose.model<ISmsTemplate>('SmsTemplate', SmsTemplateSchema, 'SmsTemplate');

export default SmsTemplate;
