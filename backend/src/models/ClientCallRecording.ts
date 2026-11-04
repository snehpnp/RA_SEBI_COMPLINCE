import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IConversationTurn {
  speaker: 'EXECUTIVE' | 'CLIENT';
  speakerName: string;
  text: string;
  highlightedText?: string;
  detectedKeywords?: any[];
  timestamp?: string;
}

export interface IClientCallRecording extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
  userId?: Types.ObjectId;
  title: string;
  callType?: string;
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
  transcriptText?: string;
  conversationTurns?: IConversationTurn[];
  transcriptionStatus?: string;
  detectedKeywords?: any[];
  sebiComplianceScore?: string;
  flaggedCount?: number;
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
    verifiedByStaffId: { type: Schema.Types.ObjectId, ref: 'Staff', default: null },
    transcriptText: { type: String, default: null },
    conversationTurns: {
      type: [
        {
          speaker: { type: String, default: 'EXECUTIVE' },
          speakerName: { type: String, default: 'Staff' },
          text: { type: String, default: '' },
          highlightedText: { type: String, default: '' },
          detectedKeywords: { type: [Schema.Types.Mixed], default: [] },
          timestamp: { type: String, default: '00:00' }
        }
      ],
      default: []
    },
    transcriptionStatus: { type: String, default: 'PENDING' },
    detectedKeywords: { type: [Schema.Types.Mixed], default: [] },
    sebiComplianceScore: { type: String, default: 'COMPLIANT' },
    flaggedCount: { type: Number, default: 0 }
  },
  { ...baseSchemaOptions, collection: 'ClientCallRecording' }
);

ClientCallRecordingSchema.index({ clientId: 1, callDate: -1 });

export const ClientCallRecording =
  mongoose.models.ClientCallRecording ||
  mongoose.model<IClientCallRecording>('ClientCallRecording', ClientCallRecordingSchema, 'ClientCallRecording');

export default ClientCallRecording;
