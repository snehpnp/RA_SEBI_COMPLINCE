import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IComplaintMonthlyReport extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  month: number;
  year: number;
  data: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

export const ComplaintMonthlyReportSchema = new Schema<IComplaintMonthlyReport>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    data: { type: String, required: true }
  },
  { ...baseSchemaOptions, collection: 'ComplaintMonthlyReport' }
);

ComplaintMonthlyReportSchema.index({ tenantId: 1, month: 1, year: 1 }, { unique: true });

ComplaintMonthlyReportSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

export const ComplaintMonthlyReport =
  mongoose.models.ComplaintMonthlyReport ||
  mongoose.model<IComplaintMonthlyReport>('ComplaintMonthlyReport', ComplaintMonthlyReportSchema, 'ComplaintMonthlyReport');
export default ComplaintMonthlyReport;
