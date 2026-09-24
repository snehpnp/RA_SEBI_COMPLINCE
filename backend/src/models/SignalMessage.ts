import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ISignalMessage extends Document {
  _id: Types.ObjectId;
  id: string;
  signalId: Types.ObjectId;
  message: string;
  createdAt: Date;
}

export const SignalMessageSchema = new Schema<ISignalMessage>(
  {
    signalId: { type: Schema.Types.ObjectId, ref: 'Signal', required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'SignalMessage' }
);

SignalMessageSchema.virtual('signal', {
  ref: 'Signal',
  localField: 'signalId',
  foreignField: '_id',
  justOne: true
});

export const SignalMessage =
  mongoose.models.SignalMessage || mongoose.model<ISignalMessage>('SignalMessage', SignalMessageSchema, 'SignalMessage');
export default SignalMessage;
