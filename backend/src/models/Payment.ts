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
  serviceStartDate?: Date | null;
  approvalStatus?: 'DIRECT_APPROVED' | 'L1_PENDING' | 'L2_PENDING' | 'APPROVED' | 'REJECTED';
  l1Details?: {
    submittedBy?: Types.ObjectId | null;
    submittedByName?: string | null;
    planId?: Types.ObjectId | null;
    amount?: number | null;
    validityDays?: number | null;
    discount?: number | null;
    paymentDate?: Date | null;
    serviceStartDate?: Date | null;
    remarks?: string | null;
    submittedAt?: Date | null;
  } | null;
  l2Details?: {
    reviewedBy?: Types.ObjectId | null;
    reviewedByName?: string | null;
    action?: 'APPROVED' | 'REJECTED';
    finalPlanId?: Types.ObjectId | null;
    finalAmount?: number | null;
    finalValidityDays?: number | null;
    finalDiscount?: number | null;
    finalPaymentDate?: Date | null;
    finalServiceStartDate?: Date | null;
    remarks?: string | null;
    rejectionReason?: string | null;
    reviewedAt?: Date | null;
  } | null;
  couponId?: Types.ObjectId | null;
  discountApplied?: number | null;
  couponCode?: string | null;
  subscriptionId?: Types.ObjectId | null;
  gstEnabled?: boolean | null;
  gstCalculationType?: string | null;
  invoicePolicy?: 'IMMEDIATE_ON_PAYMENT' | 'AFTER_KYC_AGREEMENT';
  invoiceStatus?: 'PENDING_AGREEMENT' | 'GENERATED';
  invoiceSentAt?: Date | null;
  lastEmailedTo?: string | null;
  subscriptionId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = new Schema<IPayment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', default: null },
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
    serviceStartDate: { type: Date, default: null },
    approvalStatus: { type: String, enum: ['DIRECT_APPROVED', 'L1_PENDING', 'L2_PENDING', 'APPROVED', 'REJECTED'], default: 'DIRECT_APPROVED' },
    l1Details: { type: Schema.Types.Mixed, default: null },
    l2Details: { type: Schema.Types.Mixed, default: null },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
    discountApplied: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', default: null },
    gstEnabled: { type: Boolean, default: null },
    gstCalculationType: { type: String, default: null },
    invoicePolicy: { type: String, enum: ['IMMEDIATE_ON_PAYMENT', 'AFTER_KYC_AGREEMENT'], default: 'AFTER_KYC_AGREEMENT' },
    invoiceStatus: { type: String, enum: ['PENDING_AGREEMENT', 'GENERATED'], default: 'GENERATED' },
    invoiceSentAt: { type: Date, default: null },
    lastEmailedTo: { type: String, default: null }
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
