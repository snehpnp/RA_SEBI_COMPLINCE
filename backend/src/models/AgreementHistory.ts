import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IAgreementHistory extends Document {
  _id: Types.ObjectId;
  id: string;
  agreementId: Types.ObjectId;
  action: string;
  performedBy: string;
  ipAddress?: string | null;
  timestamp: Date;
}

export const AgreementHistorySchema = new Schema<IAgreementHistory>(
  {
    agreementId: { type: Schema.Types.ObjectId, ref: 'Agreement', required: true },
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    ipAddress: { type: String, default: null },
    timestamp: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'AgreementHistory' }
);

AgreementHistorySchema.virtual('agreement', {
  ref: 'Agreement',
  localField: 'agreementId',
  foreignField: '_id',
  justOne: true
});

export const AgreementHistory =
  mongoose.models.AgreementHistory || mongoose.model<IAgreementHistory>('AgreementHistory', AgreementHistorySchema, 'AgreementHistory');
export default AgreementHistory;
