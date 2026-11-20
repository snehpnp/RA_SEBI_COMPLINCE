import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IPlatformPlan extends Document {
  _id: Types.ObjectId;
  id: string;
  name: string;
  code: string;
  description?: string;
  price: number; // Can be 0 for Free / Trial Plan
  durationDays: number; // e.g. 30, 90, 365
  maxActiveClients: number; // 0 for unlimited or specific number (e.g. 100)
  features: string[];
  lockPermissionsOnExpiry: {
    lockNewClientAddition: boolean;
    lockSignalBroadcast: boolean;
    lockAgreementSigning: boolean;
    lockReportsGeneration: boolean;
    lockStaffLogins: boolean;
  };
  isActive: boolean;
  isPopular?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PlatformPlanSchema = new Schema<IPlatformPlan>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0, default: 0 },
    durationDays: { type: Number, required: true, min: 1, default: 30 },
    maxActiveClients: { type: Number, required: true, min: 0, default: 50 },
    features: [{ type: String }],
    lockPermissionsOnExpiry: {
      lockNewClientAddition: { type: Boolean, default: true },
      lockSignalBroadcast: { type: Boolean, default: true },
      lockAgreementSigning: { type: Boolean, default: true },
      lockReportsGeneration: { type: Boolean, default: false },
      lockStaffLogins: { type: Boolean, default: false }
    },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false }
  },
  { ...baseSchemaOptions, collection: 'PlatformPlan' }
);

export const PlatformPlan =
  mongoose.models.PlatformPlan || mongoose.model<IPlatformPlan>('PlatformPlan', PlatformPlanSchema, 'PlatformPlan');
export default PlatformPlan;
