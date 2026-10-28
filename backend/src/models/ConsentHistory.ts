import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IConsentHistory extends Document {
  _id: Types.ObjectId;
  id: string;
  consentId: Types.ObjectId;
  action: string;
  timestamp: Date;
}

export const ConsentHistorySchema = new Schema<IConsentHistory>(
  {
    consentId: { type: Schema.Types.ObjectId, ref: 'Consent', required: true },
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'ConsentHistory' }
);

ConsentHistorySchema.virtual('consent', {
  ref: 'Consent',
  localField: 'consentId',
  foreignField: '_id',
  justOne: true
});

export const ConsentHistory =
  mongoose.models.ConsentHistory || mongoose.model<IConsentHistory>('ConsentHistory', ConsentHistorySchema, 'ConsentHistory');
export default ConsentHistory;
