import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IStock extends Document {
  _id: Types.ObjectId;
  id: string;
  symbol: string;
  name: string;
  segment: string;
  isFno: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const StockSchema = new Schema<IStock>(
  {
    symbol: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    segment: { type: String, default: 'EQUITY' },
    isFno: { type: Boolean, default: false }
  },
  { ...baseSchemaOptions, collection: 'Stock' }
);

StockSchema.virtual('signals', {
  ref: 'Signal',
  localField: '_id',
  foreignField: 'stockId'
});

export const Stock = mongoose.models.Stock || mongoose.model<IStock>('Stock', StockSchema, 'Stock');
export default Stock;
