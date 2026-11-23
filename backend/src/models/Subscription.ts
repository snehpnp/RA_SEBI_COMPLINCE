import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  id: string;
  clientId: Types.ObjectId;
  planId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  originalEndDate?: Date | null;
  status: string;
  amountBase?: number | null;
  amountGst?: number | null;
  amountTotal?: number | null;
  isGstInclusive?: boolean | null;
  cancelledAt?: Date | null;
  cancellationEffectiveDate?: Date | null;
  cancellationType?: 'ONLY_CANCEL' | 'CANCEL_AND_REFUND' | null;
  refundMode?: 'WITH_GST' | 'WITHOUT_GST' | null;
  refundAmount?: number | null;
  refundBaseAmount?: number | null;
  refundGstAmount?: number | null;
  refundRemarks?: string | null;
  creditNoteNumber?: string | null;
  creditNoteSent?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export const SubscriptionSchema = new Schema<ISubscription>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    originalEndDate: { type: Date, default: null },
    status: { type: String, default: 'ACTIVE' },
    amountBase: { type: Number, default: null },
    amountGst: { type: Number, default: null },
    amountTotal: { type: Number, default: null },
    isGstInclusive: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    cancellationEffectiveDate: { type: Date, default: null },
    cancellationType: { type: String, enum: ['ONLY_CANCEL', 'CANCEL_AND_REFUND'], default: null },
    refundMode: { type: String, enum: ['WITH_GST', 'WITHOUT_GST'], default: null },
    refundAmount: { type: Number, default: null },
    refundBaseAmount: { type: Number, default: null },
    refundGstAmount: { type: Number, default: null },
    refundRemarks: { type: String, default: null },
    creditNoteNumber: { type: String, default: null },
    creditNoteSent: { type: Boolean, default: false }
  },
  { ...baseSchemaOptions, collection: 'Subscription' }
);

SubscriptionSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

SubscriptionSchema.virtual('plan', {
  ref: 'Plan',
  localField: 'planId',
  foreignField: '_id',
  justOne: true
});

export const Subscription =
  mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema, 'Subscription');
export default Subscription;
