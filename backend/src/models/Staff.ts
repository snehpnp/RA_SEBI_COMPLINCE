import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IStaff extends Document {
  _id: Types.ObjectId;
  id: string;
  userId: Types.ObjectId;
  employeeId: string;
  name: string;
  email: string;
  mobile: string;
  dob?: Date | null;
  joiningDate?: Date | null;
  nismNumber?: string | null;
  nismUpload?: string | null;
  nismValidity?: Date | null;
  status: string;
}

export const StaffSchema = new Schema<IStaff>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    dob: { type: Date, default: null },
    joiningDate: { type: Date, default: null },
    nismNumber: { type: String, default: null },
    nismUpload: { type: String, default: null },
    nismValidity: { type: Date, default: null },
    status: { type: String, default: 'ACTIVE' }
  },
  { ...baseSchemaOptions, collection: 'Staff' }
);

// Virtual relations
StaffSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

StaffSchema.virtual('personAssociated', {
  ref: 'PersonAssociated',
  localField: '_id',
  foreignField: 'staffId',
  justOne: true
});

export const Staff = mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema, 'Staff');
export default Staff;
