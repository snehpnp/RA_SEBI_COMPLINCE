import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IResource extends Document {
  _id: Types.ObjectId;
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: Date;
}

export const ResourceSchema = new Schema<IResource>(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'Resource' }
);

export const Resource = mongoose.models.Resource || mongoose.model<IResource>('Resource', ResourceSchema, 'Resource');
export default Resource;
