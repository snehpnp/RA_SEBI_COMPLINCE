import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ISignal extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  segment: string;
  planId: Types.ObjectId;
  callType: string;
  tradeDuration: string;
  stockId: Types.ObjectId;
  expiryDate?: Date | null;
  strikePrice?: number | null;
  optionType?: string | null;
  entryPrice: number;
  entryType: string;
  suggestedQuantity?: string | null;
  target1: number;
  target2?: number | null;
  target3?: number | null;
  stoploss: number;
  description?: string | null;
  reportUrl?: string | null;
  closeStatus?: string | null;
  exitPrice?: number | null;
  closeRemark?: string | null;
  closedAt?: Date | null;
  closeTargets?: string | null;
  status: string;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const SignalSchema = new Schema<ISignal>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    segment: { type: String, required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    callType: { type: String, required: true },
    tradeDuration: { type: String, required: true },
    stockId: { type: Schema.Types.ObjectId, ref: 'Stock', required: true },
    expiryDate: { type: Date, default: null },
    strikePrice: { type: Number, default: null },
    optionType: { type: String, default: null },
    entryPrice: { type: Number, required: true },
    entryType: { type: String, required: true },
    suggestedQuantity: { type: String, default: null },
    target1: { type: Number, required: true },
    target2: { type: Number, default: null },
    target3: { type: Number, default: null },
    stoploss: { type: Number, required: true },
    description: { type: String, default: null },
    reportUrl: { type: String, default: null },
    closeStatus: { type: String, default: null },
    exitPrice: { type: Number, default: null },
    closeRemark: { type: String, default: null },
    closedAt: { type: Date, default: null },
    closeTargets: { type: String, default: null },
    status: { type: String, default: 'OPEN' },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { ...baseSchemaOptions, collection: 'Signal' }
);

SignalSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

SignalSchema.virtual('stock', {
  ref: 'Stock',
  localField: 'stockId',
  foreignField: '_id',
  justOne: true
});

SignalSchema.virtual('plan', {
  ref: 'Plan',
  localField: 'planId',
  foreignField: '_id',
  justOne: true
});

SignalSchema.virtual('messages', {
  ref: 'SignalMessage',
  localField: '_id',
  foreignField: 'signalId'
});

export const Signal = mongoose.models.Signal || mongoose.model<ISignal>('Signal', SignalSchema, 'Signal');
export default Signal;
