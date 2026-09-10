import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IRolePermission extends Document {
  _id: Types.ObjectId;
  id: string;
  roleId: Types.ObjectId;
  permissionId: Types.ObjectId;
  createdAt: Date;
}

export const RolePermissionSchema = new Schema<IRolePermission>(
  {
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    permissionId: { type: Schema.Types.ObjectId, ref: 'Permission', required: true }
  },
  { ...baseSchemaOptions, collection: 'RolePermission' }
);

RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

// Virtual relations
RolePermissionSchema.virtual('permission', {
  ref: 'Permission',
  localField: 'permissionId',
  foreignField: '_id',
  justOne: true
});

RolePermissionSchema.virtual('role', {
  ref: 'Role',
  localField: 'roleId',
  foreignField: '_id',
  justOne: true
});

export const RolePermission = mongoose.models.RolePermission || mongoose.model<IRolePermission>('RolePermission', RolePermissionSchema, 'RolePermission');
export default RolePermission;
