import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ITelegramGroup extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  name: string;
  chatId: string;
  inviteLink?: string | null;
  type?: string; // group, supergroup, channel
  username?: string | null;
  memberCount?: number | null;
  isDefault?: boolean;
  status: string; // ACTIVE, INACTIVE
  createdById?: Types.ObjectId | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const TelegramGroupSchema = new Schema<ITelegramGroup>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    chatId: { type: String, required: true },
    inviteLink: { type: String, default: null },
    type: { type: String, default: 'supergroup' },
    username: { type: String, default: null },
    memberCount: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    status: { type: String, default: 'ACTIVE' },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null }
  },
  { ...baseSchemaOptions, collection: 'TelegramGroup' }
);

TelegramGroupSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

export const TelegramGroup =
  mongoose.models.TelegramGroup ||
  mongoose.model<ITelegramGroup>('TelegramGroup', TelegramGroupSchema, 'TelegramGroup');

export default TelegramGroup;
