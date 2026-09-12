import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ICoupon extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  code: string;
  discountType: string; // PERCENTAGE, FIXED
  discountValue: number;
  percentageType?: string | null; // FLAT, CAPPED
  minPurchaseValue?: number | null;
  maxDiscountValue?: number | null;
  expiryDate?: Date | null;
  usageLimit?: number | null;
  usedCount: number;
  clientId?: Types.ObjectId | null;
  planId?: Types.ObjectId | null;
  categoryId?: Types.ObjectId | null;
  status: string; // ACTIVE, INACTIVE
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CouponSchema = new Schema<ICoupon>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    code: { type: String, required: true },
    discountType: { type: String, required: true },
    discountValue: { type: Number, required: true },
    percentageType: { type: String, default: null },
    minPurchaseValue: { type: Number, default: null },
    maxDiscountValue: { type: Number, default: null },
    expiryDate: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: 'PlanCategory', default: null },
    status: { type: String, default: 'ACTIVE' },
    isPublic: { type: Boolean, default: false }
  },
  { ...baseSchemaOptions, collection: 'Coupon' }
);

CouponSchema.index({ tenantId: 1, code: 1 }, { unique: true });

CouponSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

CouponSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

export const Coupon = mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema, 'Coupon');
export default Coupon;
