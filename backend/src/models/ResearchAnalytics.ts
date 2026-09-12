import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IResearchAnalytics extends Document {
  _id: Types.ObjectId;
  id: string;
  reportId: Types.ObjectId;
  userId: Types.ObjectId;
  action: string;
  duration: number;
  ipAddress?: string | null;
  timestamp: Date;
}

export const ResearchAnalyticsSchema = new Schema<IResearchAnalytics>(
  {
    reportId: { type: Schema.Types.ObjectId, ref: 'ResearchReport', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    duration: { type: Number, default: 0 },
    ipAddress: { type: String, default: null },
    timestamp: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'ResearchAnalytics' }
);

ResearchAnalyticsSchema.virtual('report', {
  ref: 'ResearchReport',
  localField: 'reportId',
  foreignField: '_id',
  justOne: true
});

ResearchAnalyticsSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

export const ResearchAnalytics =
  mongoose.models.ResearchAnalytics ||
  mongoose.model<IResearchAnalytics>('ResearchAnalytics', ResearchAnalyticsSchema, 'ResearchAnalytics');
export default ResearchAnalytics;
