import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IPermission extends Document {
  _id: Types.ObjectId;
  id: string;
  code: string;
  name: string;
  createdAt: Date;
}

export const PermissionSchema = new Schema<IPermission>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true }
  },
  { ...baseSchemaOptions, collection: 'Permission' }
);

export const Permission = mongoose.models.Permission || mongoose.model<IPermission>('Permission', PermissionSchema, 'Permission');
export default Permission;
