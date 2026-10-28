import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IRole extends Document {
  _id: Types.ObjectId;
  id: string;
  name: string;
  description?: string | null;
  allowMultiDeviceLogin: boolean;
  requiresNism?: boolean;
  twoFactorAuth?: 'DISABLED' | 'EMAIL_OTP' | 'SMS_OTP' | 'BOTH';
  createdAt: Date;
  updatedAt: Date;
}

export const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
    allowMultiDeviceLogin: { type: Boolean, default: false },
    requiresNism: { type: Boolean, default: false },
    twoFactorAuth: {
      type: String,
      enum: ['DISABLED', 'EMAIL_OTP', 'SMS_OTP', 'BOTH'],
      default: 'DISABLED'
    }
  },
  { ...baseSchemaOptions, collection: 'Role' }
);

// Virtual relations
RoleSchema.virtual('permissions', {
  ref: 'RolePermission',
  localField: '_id',
  foreignField: 'roleId'
});

export const Role = mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema, 'Role');
export default Role;
