import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IPenalty extends Document {
  _id: Types.ObjectId;
  id: string;
  auditId: Types.ObjectId;
  tenantId: Types.ObjectId;
  amount: number;
  reason: string;
  status: string;
  paidAt?: Date | null;
  paymentRef?: string | null;
  proofUrl?: string | null;
  remarks?: string | null;
}

export const PenaltySchema = new Schema<IPenalty>(
  {
    auditId: { type: Schema.Types.ObjectId, ref: 'ComplianceAudit', required: true, unique: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, default: 'PENDING_PAYMENT' },
    paidAt: { type: Date, default: null },
    paymentRef: { type: String, default: null },
    proofUrl: { type: String, default: null },
    remarks: { type: String, default: null }
  },
  { ...baseSchemaOptions, collection: 'Penalty' }
);

PenaltySchema.virtual('audit', {
  ref: 'ComplianceAudit',
  localField: 'auditId',
  foreignField: '_id',
  justOne: true
});

PenaltySchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

export const Penalty = mongoose.models.Penalty || mongoose.model<IPenalty>('Penalty', PenaltySchema, 'Penalty');
export default Penalty;
