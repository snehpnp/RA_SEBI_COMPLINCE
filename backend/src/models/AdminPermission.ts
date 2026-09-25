import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IAdminPermission extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  module: string; // CLIENTS, RESEARCH_REPORTS, SIGNALS, COMPLIANCE, BILLING, KYC, COUPONS, CUSTOM_PAGES, AI_FEATURES, EXPORT_DATA
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  isEnabled: boolean;
  customLimits?: string | null; // JSON string
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const AdminPermissionSchema = new Schema<IAdminPermission>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    module: { type: String, required: true },
    canView: { type: Boolean, default: true },
    canCreate: { type: Boolean, default: true },
    canEdit: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: true },
    canExport: { type: Boolean, default: true },
    isEnabled: { type: Boolean, default: true },
    customLimits: { type: String, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { ...baseSchemaOptions, collection: 'AdminPermission' }
);

AdminPermissionSchema.index({ tenantId: 1, module: 1 }, { unique: true });

AdminPermissionSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

export const AdminPermission =
  mongoose.models.AdminPermission || mongoose.model<IAdminPermission>('AdminPermission', AdminPermissionSchema, 'AdminPermission');
export default AdminPermission;
