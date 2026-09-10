import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ICustomPage extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  title: string;
  slug: string;
  type: string; // CONTENT, URL
  content?: string | null;
  externalUrl?: string | null;
  isSystem: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CustomPageSchema = new Schema<ICustomPage>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    type: { type: String, required: true },
    content: { type: String, default: null },
    externalUrl: { type: String, default: null },
    isSystem: { type: Boolean, default: false },
    status: { type: String, default: 'ACTIVE' }
  },
  { ...baseSchemaOptions, collection: 'CustomPage' }
);

CustomPageSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

CustomPageSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

export const CustomPage =
  mongoose.models.CustomPage || mongoose.model<ICustomPage>('CustomPage', CustomPageSchema, 'CustomPage');
export default CustomPage;
