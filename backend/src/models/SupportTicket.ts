import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ISupportTicket extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
}

export const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    subject: { type: String, required: true },
    status: { type: String, default: 'PENDING' },
    priority: { type: String, default: 'NORMAL' }
  },
  { ...baseSchemaOptions, collection: 'SupportTicket' }
);

SupportTicketSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

SupportTicketSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

SupportTicketSchema.virtual('messages', {
  ref: 'TicketMessage',
  localField: '_id',
  foreignField: 'ticketId'
});

export const SupportTicket =
  mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema, 'SupportTicket');
export default SupportTicket;
