import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IPlatformBillingConfig extends Document {
  _id: Types.ObjectId;
  id: string;
  companyName: string;
  gstin?: string;
  pan?: string;
  email: string;
  mobile: string;
  address: string;
  logoUrl?: string;
  state: string; // Registered State (e.g. "MAHARASHTRA", "DELHI") for GST calculation
  gstCalculationType: 'INCLUSIVE' | 'EXCLUSIVE';
  hsnSacCode: string;
  bankAccountName?: string;
  bankAccountNo?: string;
  bankAccountType?: string;
  bankIfsc?: string;
  bankName?: string;
  bankBranch?: string;
  upiId?: string;
  upiPayeeName?: string;
  qrCodeUrl?: string;
  enableBankQrPayment: boolean;
  enableGatewayPayment: boolean;
  gatewayProvider: 'RAZORPAY' | 'CASHFREE';
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  invoicePrefix: string;
  nextInvoiceSequence: number;
  createdAt: Date;
  updatedAt: Date;
}

export const PlatformBillingConfigSchema = new Schema<IPlatformBillingConfig>(
  {
    companyName: { type: String, required: true, default: 'Platform Infrastructure Technologies' },
    gstin: { type: String, default: '' },
    pan: { type: String, default: '' },
    email: { type: String, required: true, default: 'billing@platform.com' },
    mobile: { type: String, required: true, default: '+91 9876543210' },
    address: { type: String, required: true, default: 'Corporate Park, Financial District' },
    logoUrl: { type: String, default: '' },
    state: { type: String, required: true, default: 'DELHI' },
    gstCalculationType: { type: String, enum: ['INCLUSIVE', 'EXCLUSIVE'], default: 'EXCLUSIVE' },
    hsnSacCode: { type: String, default: '998313' },
    bankAccountName: { type: String, default: '' },
    bankAccountNo: { type: String, default: '' },
    bankAccountType: { type: String, default: 'CURRENT' },
    bankIfsc: { type: String, default: '' },
    bankName: { type: String, default: '' },
    bankBranch: { type: String, default: '' },
    upiId: { type: String, default: '' },
    upiPayeeName: { type: String, default: '' },
    qrCodeUrl: { type: String, default: '' },
    enableBankQrPayment: { type: Boolean, default: false },
    enableGatewayPayment: { type: Boolean, default: false },
    gatewayProvider: { type: String, enum: ['RAZORPAY', 'CASHFREE'], default: 'RAZORPAY' },
    razorpayKeyId: { type: String, default: '' },
    razorpayKeySecret: { type: String, default: '' },
    invoicePrefix: { type: String, default: 'PLAT-INV-' },
    nextInvoiceSequence: { type: Number, default: 1001 }
  },
  { ...baseSchemaOptions, collection: 'PlatformBillingConfig' }
);

export const PlatformBillingConfig =
  mongoose.models.PlatformBillingConfig ||
  mongoose.model<IPlatformBillingConfig>('PlatformBillingConfig', PlatformBillingConfigSchema, 'PlatformBillingConfig');
export default PlatformBillingConfig;
