import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface INotificationLog extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId?: Types.ObjectId | null;
  recipient: string;
  channel: string;
  title: string;
  message: string;
  status: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const NotificationLogSchema = new Schema<INotificationLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    recipient: { type: String, required: true },
    channel: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: 'PENDING' },
    retryCount: { type: Number, default: 0 }
  },
  { ...baseSchemaOptions, collection: 'NotificationLog' }
);

NotificationLogSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

export const NotificationLog =
  mongoose.models.NotificationLog || mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema, 'NotificationLog');
export default NotificationLog;
