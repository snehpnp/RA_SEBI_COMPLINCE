import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IPersonAssociated extends Document {
  _id: Types.ObjectId;
  id: string;
  staffId: Types.ObjectId;
  roleType: string;
  customRole?: string | null;
}

export const PersonAssociatedSchema = new Schema<IPersonAssociated>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true, unique: true },
    roleType: { type: String, required: true },
    customRole: { type: String, default: null }
  },
  { ...baseSchemaOptions, collection: 'PersonAssociated' }
);

// Virtual relations
PersonAssociatedSchema.virtual('staff', {
  ref: 'Staff',
  localField: 'staffId',
  foreignField: '_id',
  justOne: true
});

export const PersonAssociated =
  mongoose.models.PersonAssociated || mongoose.model<IPersonAssociated>('PersonAssociated', PersonAssociatedSchema, 'PersonAssociated');
export default PersonAssociated;
