import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
  planId?: Types.ObjectId | null;
  amount: number;
  paymentMode: string;
  transactionRef: string;
  receiptUrl?: string | null;
  status: string;
  remarks?: string | null;
  verifiedByStaffId?: Types.ObjectId | null;
  assignedByAdminName?: string | null;
  assignedByStaffName?: string | null;
  clientCity?: string | null;
  clientState?: string | null;
  tenantState?: string | null;
  planValidityDays?: number | null;
  paymentGatewayId?: Types.ObjectId | null;
  paymentDate?: Date | null;
  couponId?: Types.ObjectId | null;
  discountApplied?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = new Schema<IPayment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null },
    amount: { type: Number, required: true },
    paymentMode: { type: String, required: true },
    transactionRef: { type: String, required: true, unique: true },
    receiptUrl: { type: String, default: null },
    status: { type: String, default: 'PENDING' },
    remarks: { type: String, default: null },
    verifiedByStaffId: { type: Schema.Types.ObjectId, ref: 'Staff', default: null },
    assignedByAdminName: { type: String, default: null },
    assignedByStaffName: { type: String, default: null },
    clientCity: { type: String, default: null },
    clientState: { type: String, default: null },
    tenantState: { type: String, default: null },
    planValidityDays: { type: Number, default: null },
    paymentGatewayId: { type: Schema.Types.ObjectId, default: null },
    paymentDate: { type: Date, default: null },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
    discountApplied: { type: Number, default: 0 }
  },
  { ...baseSchemaOptions, collection: 'Payment' }
);

PaymentSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

PaymentSchema.virtual('coupon', {
  ref: 'Coupon',
  localField: 'couponId',
  foreignField: '_id',
  justOne: true
});

PaymentSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

PaymentSchema.virtual('plan', {
  ref: 'Plan',
  localField: 'planId',
  foreignField: '_id',
  justOne: true
});

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema, 'Payment');
export default Payment;
