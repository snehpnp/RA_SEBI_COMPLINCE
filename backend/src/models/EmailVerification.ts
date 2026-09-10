import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IEmailVerification extends Document {
  _id: Types.ObjectId;
  id: string;
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

export const EmailVerificationSchema = new Schema<IEmailVerification>(
  {
    email: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'EmailVerification' }
);

export const EmailVerification =
  mongoose.models.EmailVerification ||
  mongoose.model<IEmailVerification>('EmailVerification', EmailVerificationSchema, 'EmailVerification');
export default EmailVerification;
