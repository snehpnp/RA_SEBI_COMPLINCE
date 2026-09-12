import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IUser extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId?: Types.ObjectId | null;
  roleId: Types.ObjectId;
  employeeCode?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  passwordHash: string;
  status: string;
  lastLogin?: Date | null;
  tokenVersion: number;
  currentSessionId?: string | null;
  sessionExpiresAt?: Date | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  tempPassword?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    employeeCode: { type: String, default: null },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    passwordHash: { type: String, required: true },
    status: { type: String, default: 'ACTIVE' },
    lastLogin: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    currentSessionId: { type: String, default: null },
    sessionExpiresAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    tempPassword: { type: String, default: null }
  },
  { ...baseSchemaOptions, collection: 'User' }
);

// Virtual relations
UserSchema.virtual('role', {
  ref: 'Role',
  localField: 'roleId',
  foreignField: '_id',
  justOne: true
});

UserSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

UserSchema.virtual('staff', {
  ref: 'Staff',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

UserSchema.virtual('client', {
  ref: 'Client',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema, 'User');
export default User;
