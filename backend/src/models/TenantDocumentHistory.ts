import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ITenantDocumentHistory extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  docType: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: Date;
}

export const TenantDocumentHistorySchema = new Schema<ITenantDocumentHistory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    docType: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'TenantDocumentHistory' }
);

TenantDocumentHistorySchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

export const TenantDocumentHistory =
  mongoose.models.TenantDocumentHistory ||
  mongoose.model<ITenantDocumentHistory>('TenantDocumentHistory', TenantDocumentHistorySchema, 'TenantDocumentHistory');
export default TenantDocumentHistory;
