import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ITenantSubscription extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  planId: Types.ObjectId;
  planName: string;
  startDate: Date;
  endDate: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING_APPROVAL';
  maxActiveClients: number;
  price: number;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  isGstInclusive: boolean;
  assignedBySuperAdmin: boolean;
  paymentMode?: 'SUPERADMIN_ASSIGNED' | 'ONLINE_GATEWAY' | 'BANK_TRANSFER' | 'QR_UPI';
  gatewayTransactionId?: string;
  offlineTransactionRef?: string;
  offlinePaymentDate?: Date;
  offlineProofUrl?: string;
  remarks?: string;
  invoiceStatus: 'GENERATED' | 'PENDING_STATE' | 'NONE';
  invoiceId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const TenantSubscriptionSchema = new Schema<ITenantSubscription>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'AllCompany', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'PlatformPlan', required: true },
    planName: { type: String, required: true },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_APPROVAL'], default: 'ACTIVE' },
    maxActiveClients: { type: Number, required: true, default: 50 },
    price: { type: Number, required: true, default: 0 },
    baseAmount: { type: Number, required: true, default: 0 },
    gstAmount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    isGstInclusive: { type: Boolean, default: false },
    assignedBySuperAdmin: { type: Boolean, default: true },
    paymentMode: {
      type: String,
      enum: ['SUPERADMIN_ASSIGNED', 'ONLINE_GATEWAY', 'BANK_TRANSFER', 'QR_UPI'],
      default: 'SUPERADMIN_ASSIGNED'
    },
    gatewayTransactionId: { type: String, default: null },
    offlineTransactionRef: { type: String, default: null },
    offlinePaymentDate: { type: Date, default: null },
    offlineProofUrl: { type: String, default: null },
    remarks: { type: String, default: null },
    invoiceStatus: { type: String, enum: ['GENERATED', 'PENDING_STATE', 'NONE'], default: 'NONE' },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'PlatformInvoice', default: null }
  },
  { ...baseSchemaOptions, collection: 'TenantSubscription' }
);

TenantSubscriptionSchema.virtual('tenant', {
  ref: 'AllCompany',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

TenantSubscriptionSchema.virtual('plan', {
  ref: 'PlatformPlan',
  localField: 'planId',
  foreignField: '_id',
  justOne: true
});

export const TenantSubscription =
  mongoose.models.TenantSubscription ||
  mongoose.model<ITenantSubscription>('TenantSubscription', TenantSubscriptionSchema, 'TenantSubscription');
export default TenantSubscription;
