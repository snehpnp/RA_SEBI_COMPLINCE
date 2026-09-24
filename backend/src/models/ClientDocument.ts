import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IClientDocument extends Document {
  _id: Types.ObjectId;
  id: string;
  clientId: Types.ObjectId;
  docType: string;
  fileUrl: string;
  fileName: string;
  status: string;
  uploadedAt: Date;
}

export const ClientDocumentSchema = new Schema<IClientDocument>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    docType: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    status: { type: String, default: 'PENDING' },
    uploadedAt: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'ClientDocument' }
);

ClientDocumentSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

export const ClientDocument =
  mongoose.models.ClientDocument || mongoose.model<IClientDocument>('ClientDocument', ClientDocumentSchema, 'ClientDocument');
export default ClientDocument;
