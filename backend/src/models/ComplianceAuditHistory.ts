import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IComplianceAuditHistory extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  requirementId: Types.ObjectId;
  auditId: Types.ObjectId;
  previousStatus?: string | null;
  newStatus: string;
  officerRemarks?: string | null;
  proofDocumentUrl?: string | null;
  updatedByUserId?: Types.ObjectId | null;
  updatedByName?: string | null;
  periodLabel?: string | null;
  createdAt: Date;
}

export const ComplianceAuditHistorySchema = new Schema<IComplianceAuditHistory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    requirementId: { type: Schema.Types.ObjectId, ref: 'ComplianceRequirement', required: true },
    auditId: { type: Schema.Types.ObjectId, ref: 'ComplianceAudit', required: true },
    previousStatus: { type: String, default: null },
    newStatus: { type: String, required: true },
    officerRemarks: { type: String, default: null },
    proofDocumentUrl: { type: String, default: null },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedByName: { type: String, default: null },
    periodLabel: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'ComplianceAuditHistory' }
);

ComplianceAuditHistorySchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

ComplianceAuditHistorySchema.virtual('requirement', {
  ref: 'ComplianceRequirement',
  localField: 'requirementId',
  foreignField: '_id',
  justOne: true
});

ComplianceAuditHistorySchema.virtual('audit', {
  ref: 'ComplianceAudit',
  localField: 'auditId',
  foreignField: '_id',
  justOne: true
});

export const ComplianceAuditHistory =
  mongoose.models.ComplianceAuditHistory ||
  mongoose.model<IComplianceAuditHistory>('ComplianceAuditHistory', ComplianceAuditHistorySchema, 'ComplianceAuditHistory');
export default ComplianceAuditHistory;
