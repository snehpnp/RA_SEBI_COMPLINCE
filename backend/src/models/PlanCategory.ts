import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IPlanCategory extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  name: string;
  segments: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PlanCategorySchema = new Schema<IPlanCategory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    segments: { type: String, required: true },
    status: { type: String, default: 'ACTIVE' }
  },
  { ...baseSchemaOptions, collection: 'PlanCategory' }
);

PlanCategorySchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

PlanCategorySchema.virtual('plans', {
  ref: 'Plan',
  localField: '_id',
  foreignField: 'categoryId'
});

export const PlanCategory =
  mongoose.models.PlanCategory || mongoose.model<IPlanCategory>('PlanCategory', PlanCategorySchema, 'PlanCategory');
export default PlanCategory;
