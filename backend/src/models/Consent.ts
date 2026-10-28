import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IConsent extends Document {
  _id: Types.ObjectId;
  id: string;
  clientId: Types.ObjectId;
  tncAccept: boolean;
  policyAccept: boolean;
  researchAccept: boolean;
  acceptedAt: Date;
  ipAddress?: string | null;
}

export const ConsentSchema = new Schema<IConsent>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    tncAccept: { type: Boolean, default: false },
    policyAccept: { type: Boolean, default: false },
    researchAccept: { type: Boolean, default: false },
    acceptedAt: { type: Date, default: Date.now },
    ipAddress: { type: String, default: null }
  },
  { ...baseSchemaOptions, collection: 'Consent' }
);

ConsentSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

ConsentSchema.virtual('history', {
  ref: 'ConsentHistory',
  localField: '_id',
  foreignField: 'consentId'
});

export const Consent = mongoose.models.Consent || mongoose.model<IConsent>('Consent', ConsentSchema, 'Consent');
export default Consent;
