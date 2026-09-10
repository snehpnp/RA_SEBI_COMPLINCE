import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IComplianceAudit extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  requirementId: Types.ObjectId;
  status: string;
  dueDate?: Date | null;
  officerRemarks?: string | null;
  proofDocumentUrl?: string | null;
  resolvedAt?: Date | null;
  updatedByUserId?: Types.ObjectId | null;
  updatedAt: Date;
}

export const ComplianceAuditSchema = new Schema<IComplianceAudit>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    requirementId: { type: Schema.Types.ObjectId, ref: 'ComplianceRequirement', required: true },
    status: { type: String, default: 'PENDING' },
    dueDate: { type: Date, default: null },
    officerRemarks: { type: String, default: null },
    proofDocumentUrl: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { ...baseSchemaOptions, collection: 'ComplianceAudit' }
);

ComplianceAuditSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

ComplianceAuditSchema.virtual('requirement', {
  ref: 'ComplianceRequirement',
  localField: 'requirementId',
  foreignField: '_id',
  justOne: true
});

ComplianceAuditSchema.virtual('penalty', {
  ref: 'Penalty',
  localField: '_id',
  foreignField: 'auditId',
  justOne: true
});

ComplianceAuditSchema.virtual('history', {
  ref: 'ComplianceAuditHistory',
  localField: '_id',
  foreignField: 'auditId'
});

export const ComplianceAudit =
  mongoose.models.ComplianceAudit || mongoose.model<IComplianceAudit>('ComplianceAudit', ComplianceAuditSchema, 'ComplianceAudit');
export default ComplianceAudit;
