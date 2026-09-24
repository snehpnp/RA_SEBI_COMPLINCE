import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IOccupation extends Document {
  _id: Types.ObjectId;
  id: string;
  tenantId?: Types.ObjectId | null;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
  createdById?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const OccupationSchema = new Schema<IOccupation>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    isDefault: { type: Boolean, default: false },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { ...baseSchemaOptions, collection: 'Occupation' }
);

OccupationSchema.virtual('tenant', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

export const Occupation =
  mongoose.models.Occupation || mongoose.model<IOccupation>('Occupation', OccupationSchema, 'Occupation');
export default Occupation;
