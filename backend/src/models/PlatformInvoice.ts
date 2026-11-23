import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IPlatformInvoice extends Document {
  _id: Types.ObjectId;
  id: string;
  invoiceNumber: string;
  tenantId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  planId: Types.ObjectId;
  planName: string;
  invoiceDate: Date;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  baseAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  isInterState: boolean;
  platformState: string;
  tenantState: string;
  tenantCompanyName: string;
  tenantGstin?: string;
  tenantEmail: string;
  pdfUrl?: string;
  emailedAt?: Date;
  lastEmailedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PlatformInvoiceSchema = new Schema<IPlatformInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'AllCompany', required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'TenantSubscription', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'PlatformPlan', required: true },
    planName: { type: String, required: true },
    invoiceDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['PAID', 'PENDING', 'CANCELLED'], default: 'PAID' },
    baseAmount: { type: Number, required: true, default: 0 },
    gstAmount: { type: Number, required: true, default: 0 },
    cgstAmount: { type: Number, required: true, default: 0 },
    sgstAmount: { type: Number, required: true, default: 0 },
    igstAmount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    isInterState: { type: Boolean, default: false },
    platformState: { type: String, required: true },
    tenantState: { type: String, required: true },
    tenantCompanyName: { type: String, required: true },
    tenantGstin: { type: String, default: '' },
    tenantEmail: { type: String, required: true },
    pdfUrl: { type: String, default: null },
    emailedAt: { type: Date, default: null },
    lastEmailedTo: { type: String, default: null }
  },
  { ...baseSchemaOptions, collection: 'PlatformInvoice' }
);

export const PlatformInvoice =
  mongoose.models.PlatformInvoice ||
  mongoose.model<IPlatformInvoice>('PlatformInvoice', PlatformInvoiceSchema, 'PlatformInvoice');
export default PlatformInvoice;
