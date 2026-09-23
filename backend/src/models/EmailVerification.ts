import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IEmailVerification extends Document {
  _id: Types.ObjectId;
  id: string;
  email?: string;
  mobile?: string | null;
  otp: string;
  smsOtp?: string | null;
  emailVerified?: boolean;
  smsVerified?: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export const EmailVerificationSchema = new Schema<IEmailVerification>(
  {
    email: { type: String, default: null, sparse: true },
    mobile: { type: String, default: null, sparse: true },
    otp: { type: String, required: true },
    smsOtp: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
    smsVerified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'EmailVerification' }
);

export const EmailVerification =
  mongoose.models.EmailVerification ||
  mongoose.model<IEmailVerification>('EmailVerification', EmailVerificationSchema, 'EmailVerification');
export default EmailVerification;
