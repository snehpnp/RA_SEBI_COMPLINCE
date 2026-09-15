import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ITelegramDeliveryLog extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId?: Types.ObjectId | null;
  signalId?: Types.ObjectId | null;
  planId?: Types.ObjectId | null;
  planName?: string | null;
  targetType: 'CHANNEL' | 'USER_DIRECT';
  targetChatId: string;
  recipientClientId?: Types.ObjectId | null;
  recipientUserId?: Types.ObjectId | null;
  recipientName?: string | null;
  recipientUsername?: string | null;
  status: 'DELIVERED' | 'FAILED';
  symbol?: string | null;
  action?: string | null;
  errorMessage?: string | null;
  telegramMessageId?: number | null;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const TelegramDeliveryLogSchema = new Schema<ITelegramDeliveryLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    signalId: { type: Schema.Types.ObjectId, ref: 'Signal', default: null, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null, index: true },
    planName: { type: String, default: null },
    targetType: { type: String, enum: ['CHANNEL', 'USER_DIRECT'], required: true },
    targetChatId: { type: String, required: true, index: true },
    recipientClientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    recipientName: { type: String, default: null },
    recipientUsername: { type: String, default: null },
    status: { type: String, enum: ['DELIVERED', 'FAILED'], required: true, index: true },
    symbol: { type: String, default: null },
    action: { type: String, default: null },
    errorMessage: { type: String, default: null },
    telegramMessageId: { type: Number, default: null },
    sentAt: { type: Date, default: Date.now, index: true }
  },
  { ...baseSchemaOptions, collection: 'TelegramDeliveryLog' }
);

// Virtual relations
TelegramDeliveryLogSchema.virtual('signal', {
  ref: 'Signal',
  localField: 'signalId',
  foreignField: '_id',
  justOne: true
});

TelegramDeliveryLogSchema.virtual('plan', {
  ref: 'Plan',
  localField: 'planId',
  foreignField: '_id',
  justOne: true
});

TelegramDeliveryLogSchema.virtual('client', {
  ref: 'Client',
  localField: 'recipientClientId',
  foreignField: '_id',
  justOne: true
});

export const TelegramDeliveryLog = mongoose.models.TelegramDeliveryLog || mongoose.model<ITelegramDeliveryLog>('TelegramDeliveryLog', TelegramDeliveryLogSchema);
export default TelegramDeliveryLog;
