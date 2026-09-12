import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IClientIdentityHistory extends Document {
  _id: Types.ObjectId;
  id: string;
  clientId: Types.ObjectId;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedAt: Date;
  changedBy: string;
  remarks?: string | null;
}

export const ClientIdentityHistorySchema = new Schema<IClientIdentityHistory>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    fieldName: { type: String, required: true },
    oldValue: { type: String, required: true },
    newValue: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, required: true },
    remarks: { type: String, default: null }
  },
  { ...baseSchemaOptions, collection: 'ClientIdentityHistory' }
);

ClientIdentityHistorySchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

export const ClientIdentityHistory =
  mongoose.models.ClientIdentityHistory ||
  mongoose.model<IClientIdentityHistory>('ClientIdentityHistory', ClientIdentityHistorySchema, 'ClientIdentityHistory');
export default ClientIdentityHistory;
