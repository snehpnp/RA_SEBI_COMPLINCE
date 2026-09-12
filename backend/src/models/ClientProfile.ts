import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IClientProfile extends Document {
  _id: Types.ObjectId;
  id: string;
  clientId: Types.ObjectId;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  riskProfile: string;
  netWorth?: number | null;
  investmentLimit?: number | null;
  investmentPeriod?: number | null; // in months
  createdAt: Date;
  updatedAt: Date;
}

export const ClientProfileSchema = new Schema<IClientProfile>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, unique: true },
    addressLine1: { type: String, default: null },
    addressLine2: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: null },
    zipCode: { type: String, default: null },
    riskProfile: { type: String, default: 'MODERATE' },
    netWorth: { type: Number, default: null },
    investmentLimit: { type: Number, default: null },
    investmentPeriod: { type: Number, default: null }
  },
  { ...baseSchemaOptions, collection: 'ClientProfile' }
);

ClientProfileSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

export const ClientProfile =
  mongoose.models.ClientProfile || mongoose.model<IClientProfile>('ClientProfile', ClientProfileSchema, 'ClientProfile');
export default ClientProfile;
