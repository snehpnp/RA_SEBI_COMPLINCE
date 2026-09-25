import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId?: Types.ObjectId | null;
  userId?: Types.ObjectId | null;
  action: string;
  module: string;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  timestamp: Date;
}

export const AuditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    module: { type: String, required: true },
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
    ipAddress: { type: String, default: null },
    timestamp: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'AuditLog' }
);

AuditLogSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

AuditLogSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema, 'AuditLog');
export default AuditLog;
