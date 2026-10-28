import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IPlan extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  categoryId?: Types.ObjectId | null;
  name: string;
  description?: string | null;
  price: number;
  durationMonths: number;
  researchSegments: string;
  notificationsAllowed: string;
  clientLimit: number;
  status: string;
  createdById?: Types.ObjectId | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PlanSchema = new Schema<IPlan>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'PlanCategory', default: null },
    name: { type: String, required: true },
    description: { type: String, default: null },
    price: { type: Number, required: true },
    durationMonths: { type: Number, default: 1 },
    researchSegments: { type: String, required: true },
    notificationsAllowed: { type: String, required: true },
    clientLimit: { type: Number, default: 100 },
    status: { type: String, default: 'ACTIVE' },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null }
  },
  { ...baseSchemaOptions, collection: 'Plan' }
);

PlanSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

PlanSchema.virtual('category', {
  ref: 'PlanCategory',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true
});

PlanSchema.virtual('subscriptions', {
  ref: 'Subscription',
  localField: '_id',
  foreignField: 'planId'
});

export const Plan = mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema, 'Plan');
export default Plan;
