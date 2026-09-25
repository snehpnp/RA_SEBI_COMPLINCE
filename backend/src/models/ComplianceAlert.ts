import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IComplianceAlert extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  clientId?: Types.ObjectId | null;
  alertType: string;
  severity: string;
  status: string;
  description: string;
  proofUrl?: string | null;
  remarks?: string | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ComplianceAlertSchema = new Schema<IComplianceAlert>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
    alertType: { type: String, required: true },
    severity: { type: String, required: true },
    status: { type: String, default: 'OPEN' },
    description: { type: String, required: true },
    proofUrl: { type: String, default: null },
    remarks: { type: String, default: null },
    closedAt: { type: Date, default: null }
  },
  { ...baseSchemaOptions, collection: 'ComplianceAlert' }
);

ComplianceAlertSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

ComplianceAlertSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

export const ComplianceAlert =
  mongoose.models.ComplianceAlert || mongoose.model<IComplianceAlert>('ComplianceAlert', ComplianceAlertSchema, 'ComplianceAlert');
export default ComplianceAlert;
