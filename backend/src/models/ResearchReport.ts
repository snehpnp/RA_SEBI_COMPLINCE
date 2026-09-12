import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IResearchReport extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  segment: string;
  type: string;
  title: string;
  summary: string;
  details: string;
  recommendation?: string | null;
  targetPrice?: number | null;
  disclaimer: string;
  conflictDisclosure: string;
  sebiRegNo: string;
  version: number;
  status: string;
  createdById: Types.ObjectId;
  publishedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ResearchReportSchema = new Schema<IResearchReport>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    segment: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    details: { type: String, required: true },
    recommendation: { type: String, default: null },
    targetPrice: { type: Number, default: null },
    disclaimer: { type: String, required: true },
    conflictDisclosure: { type: String, required: true },
    sebiRegNo: { type: String, required: true },
    version: { type: Number, default: 1 },
    status: { type: String, default: 'DRAFT' },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null }
  },
  { ...baseSchemaOptions, collection: 'ResearchReport' }
);

ResearchReportSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

ResearchReportSchema.virtual('views', {
  ref: 'ResearchAnalytics',
  localField: '_id',
  foreignField: 'reportId'
});

export const ResearchReport =
  mongoose.models.ResearchReport || mongoose.model<IResearchReport>('ResearchReport', ResearchReportSchema, 'ResearchReport');
export default ResearchReport;
