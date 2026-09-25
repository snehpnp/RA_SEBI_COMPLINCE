import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ISystemSetting extends Document {
  _id: Types.ObjectId;
  id: string;
  key: string;
  value: string; // JSON string containing name, logoUrl, faviconUrl
  updatedById?: Types.ObjectId | null;
  updatedAt: Date;
}

export const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    updatedById: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { ...baseSchemaOptions, collection: 'SystemSetting' }
);

export const SystemSetting =
  mongoose.models.SystemSetting || mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema, 'SystemSetting');
export default SystemSetting;
