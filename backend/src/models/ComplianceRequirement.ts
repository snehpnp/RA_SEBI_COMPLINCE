import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IComplianceRequirement extends Document {
  _id: Types.ObjectId;
  id: string;
  serialNo: number;
  requirement: string;
  frequency: string;
  frequencyType: string;
  severityLevel: string;
  penaltyAmount?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const ComplianceRequirementSchema = new Schema<IComplianceRequirement>(
  {
    serialNo: { type: Number, required: true },
    requirement: { type: String, required: true },
    frequency: { type: String, required: true },
    frequencyType: { type: String, default: 'CONTINUOUS' },
    severityLevel: { type: String, default: 'MODERATE' },
    penaltyAmount: { type: String, default: null },
    isActive: { type: Boolean, default: true }
  },
  { ...baseSchemaOptions, collection: 'ComplianceRequirement' }
);

ComplianceRequirementSchema.virtual('audits', {
  ref: 'ComplianceAudit',
  localField: '_id',
  foreignField: 'requirementId'
});

ComplianceRequirementSchema.virtual('history', {
  ref: 'ComplianceAuditHistory',
  localField: '_id',
  foreignField: 'requirementId'
});

export const ComplianceRequirement =
  mongoose.models.ComplianceRequirement ||
  mongoose.model<IComplianceRequirement>('ComplianceRequirement', ComplianceRequirementSchema, 'ComplianceRequirement');
export default ComplianceRequirement;
