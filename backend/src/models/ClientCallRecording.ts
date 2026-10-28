import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IClientCallRecording extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
  userId?: Types.ObjectId;
  title: string;
  callType: 'INBOUND' | 'OUTBOUND' | 'ADVISORY' | 'ONBOARDING' | 'COMPLAINT' | 'RISK_PROFILE';
  callDate: Date;
  durationSeconds?: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  callerStaffId?: Types.ObjectId;
  callerStaffName?: string;
  clientPhone?: string;
  summary?: string;
  isComplianceVerified: boolean;
  verifiedByStaffId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const ClientCallRecordingSchema = new Schema<IClientCallRecording>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true },
    callType: {
      type: String,
      enum: ['INBOUND', 'OUTBOUND', 'ADVISORY', 'ONBOARDING', 'COMPLAINT', 'RISK_PROFILE'],
      default: 'ADVISORY'
    },
    callDate: { type: Date, default: Date.now, required: true },
    durationSeconds: { type: Number, default: 0 },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: 'audio/mpeg' },
    callerStaffId: { type: Schema.Types.ObjectId, ref: 'Staff', default: null },
    callerStaffName: { type: String, default: null },
    clientPhone: { type: String, default: null },
    summary: { type: String, default: null },
    isComplianceVerified: { type: Boolean, default: true },
    verifiedByStaffId: { type: Schema.Types.ObjectId, ref: 'Staff', default: null }
  },
  { ...baseSchemaOptions, collection: 'ClientCallRecording' }
);

ClientCallRecordingSchema.index({ clientId: 1, callDate: -1 });

export const ClientCallRecording =
  mongoose.models.ClientCallRecording ||
  mongoose.model<IClientCallRecording>('ClientCallRecording', ClientCallRecordingSchema, 'ClientCallRecording');

export default ClientCallRecording;
