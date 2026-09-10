import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IComplaint extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  clientId?: Types.ObjectId | null;
  clientName: string;
  clientEmail?: string | null;
  clientMobile?: string | null;
  clientPan?: string | null;
  source: string;
  scoresRefId?: string | null;
  subject: string;
  description: string;
  status: string;
  receivedAt: Date;
  deadlineAt: Date;
  resolvedAt?: Date | null;
  resolutionNote?: string | null;
  atrProofUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ComplaintSchema = new Schema<IComplaint>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
    clientName: { type: String, required: true },
    clientEmail: { type: String, default: null },
    clientMobile: { type: String, default: null },
    clientPan: { type: String, default: null },
    source: { type: String, required: true },
    scoresRefId: { type: String, default: null },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, default: 'OPEN' },
    receivedAt: { type: Date, default: Date.now },
    deadlineAt: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: null },
    atrProofUrl: { type: String, default: null }
  },
  { ...baseSchemaOptions, collection: 'Complaint' }
);

ComplaintSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

ComplaintSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

export const Complaint = mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', ComplaintSchema, 'Complaint');
export default Complaint;
