import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface ITicketMessage extends Document {
  _id: Types.ObjectId;
  id: string;
  ticketId: Types.ObjectId;
  senderId: Types.ObjectId;
  message: string;
  attachmentUrl?: string | null;
  createdAt: Date;
}

export const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    attachmentUrl: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { ...baseSchemaOptions, collection: 'TicketMessage' }
);

TicketMessageSchema.virtual('ticket', {
  ref: 'SupportTicket',
  localField: 'ticketId',
  foreignField: '_id',
  justOne: true
});

TicketMessageSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true
});

export const TicketMessage =
  mongoose.models.TicketMessage || mongoose.model<ITicketMessage>('TicketMessage', TicketMessageSchema, 'TicketMessage');
export default TicketMessage;
