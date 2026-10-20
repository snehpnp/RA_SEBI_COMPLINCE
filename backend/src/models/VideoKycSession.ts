import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IVideoKycSession extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
  sessionId: string;
  status: 'REQUESTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  scheduleType?: 'INSTANT' | 'SCHEDULED';
  scheduledAt?: Date | null;
  expiresAt?: Date | null;
  initiatedBy: 'ADMIN' | 'CLIENT';
  consentText: string;
  otpCode: string;
  videoUrl?: string;
  fileName?: string;
  fileSize?: number;
  durationSeconds?: number;
  geoData?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    ip?: string;
    accuracy?: number;
  };
  panSnapshotUrl?: string;
  clientFaceSnapshotUrl?: string;
  snapshots?: Array<{
    type: 'PAN' | 'FACE' | 'OTHER';
    url: string;
    capturedAt: Date;
    label?: string;
  }>;
  rejectionReason?: string;
  adminNotes?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const VideoKycSessionSchema = new Schema<IVideoKycSession>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['REQUESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED', 'EXPIRED'],
      default: 'REQUESTED',
      index: true
    },
    scheduleType: {
      type: String,
      enum: ['INSTANT', 'SCHEDULED'],
      default: 'INSTANT'
    },
    scheduledAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    initiatedBy: {
      type: String,
      enum: ['ADMIN', 'CLIENT'],
      default: 'ADMIN'
    },
    consentText: { type: String, required: true },
    otpCode: { type: String, required: true },
    videoUrl: { type: String },
    fileName: { type: String },
    fileSize: { type: Number, default: 0 },
    durationSeconds: { type: Number, default: 0 },
    geoData: {
      latitude: { type: Number },
      longitude: { type: Number },
      city: { type: String },
      ip: { type: String },
      accuracy: { type: Number }
    },
    panSnapshotUrl: { type: String },
    clientFaceSnapshotUrl: { type: String },
    snapshots: [
      {
        type: { type: String, enum: ['PAN', 'FACE', 'OTHER'], default: 'OTHER' },
        url: { type: String, required: true },
        capturedAt: { type: Date, default: Date.now },
        label: { type: String }
      }
    ],
    rejectionReason: { type: String },
    adminNotes: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date }
  },
  { ...baseSchemaOptions, collection: 'VideoKycSession' }
);

VideoKycSessionSchema.index({ tenantId: 1, clientId: 1, createdAt: -1 });

VideoKycSessionSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

VideoKycSessionSchema.virtual('reviewer', {
  ref: 'User',
  localField: 'reviewedBy',
  foreignField: '_id',
  justOne: true
});

export const VideoKycSession =
  mongoose.models.VideoKycSession ||
  mongoose.model<IVideoKycSession>('VideoKycSession', VideoKycSessionSchema, 'VideoKycSession');

export default VideoKycSession;
