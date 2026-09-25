import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IActivityLog extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  actorType: 'CLIENT' | 'STAFF' | 'ADMIN' | 'SYSTEM';
  actorId?: Types.ObjectId | null;
  actorName?: string | null;
  actorEmail?: string | null;
  targetClientId?: Types.ObjectId | null;
  category: 'AUTH' | 'KYC_COMPLIANCE' | 'PAYMENT' | 'SUBSCRIPTION' | 'STAFF_ACTION' | 'SUPPORT' | 'SYSTEM';
  action: string;
  title: string;
  description?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'INFO';
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const ActivityLogSchema = new Schema<IActivityLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    actorType: { type: String, enum: ['CLIENT', 'STAFF', 'ADMIN', 'SYSTEM'], default: 'CLIENT' },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, default: null },
    actorEmail: { type: String, default: null },
    targetClientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null, index: true },
    category: {
      type: String,
      enum: ['AUTH', 'KYC_COMPLIANCE', 'PAYMENT', 'SUBSCRIPTION', 'STAFF_ACTION', 'SUPPORT', 'SYSTEM'],
      required: true,
      index: true
    },
    action: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING', 'INFO'], default: 'SUCCESS' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    device: { type: String, default: null },
    browser: { type: String, default: null },
    os: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: -1 }
  },
  { ...baseSchemaOptions, collection: 'ActivityLog' }
);

// Compound indexes for fast query performance
ActivityLogSchema.index({ tenantId: 1, targetClientId: 1, timestamp: -1 });
ActivityLogSchema.index({ tenantId: 1, category: 1, timestamp: -1 });

export const ActivityLog =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema, 'ActivityLog');

export default ActivityLog;
