import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IState extends Document {
  _id: Types.ObjectId;
  id: string;
  name: string;
  gstCode?: string | null;
  isActive: boolean;
}

export const StateSchema = new Schema<IState>(
  {
    name: { type: String, required: true, unique: true },
    gstCode: { type: String, default: null },
    isActive: { type: Boolean, default: true }
  },
  { ...baseSchemaOptions, collection: 'State' }
);

export const State = mongoose.models.State || mongoose.model<IState>('State', StateSchema, 'State');
export default State;
