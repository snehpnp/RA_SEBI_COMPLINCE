import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IAgreement extends Document {
  _id: Types.ObjectId;
  id: string;
  clientId: Types.ObjectId;
  agreementUrl: string;
  version: string;
  esignMode: string;
  signedAt: Date;
  ipAddress?: string | null;
  status: string;
}

export const AgreementSchema = new Schema<IAgreement>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    agreementUrl: { type: String, required: true },
    version: { type: String, default: '1.0' },
    esignMode: { type: String, default: 'MOCK_AADHAAR' },
    signedAt: { type: Date, default: Date.now },
    ipAddress: { type: String, default: null },
    status: { type: String, default: 'SIGNED' }
  },
  { ...baseSchemaOptions, collection: 'Agreement' }
);

AgreementSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

AgreementSchema.virtual('history', {
  ref: 'AgreementHistory',
  localField: '_id',
  foreignField: 'agreementId'
});

export const Agreement = mongoose.models.Agreement || mongoose.model<IAgreement>('Agreement', AgreementSchema, 'Agreement');
export default Agreement;
