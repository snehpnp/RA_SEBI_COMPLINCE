import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IFaq extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  question: string;
  answer: string;
  category: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const FaqSchema = new Schema<IFaq>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { ...baseSchemaOptions, collection: 'Faq' }
);

FaqSchema.index({ tenantId: 1, isActive: 1, order: 1 });

export const Faq = mongoose.models.Faq || mongoose.model<IFaq>('Faq', FaqSchema);
