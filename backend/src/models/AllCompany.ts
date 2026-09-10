import mongoose, { Schema, Document, Types } from 'mongoose';
import { baseSchemaOptions } from './_schemaOptions';

export interface IAllCompany extends Document {
  _id: Types.ObjectId;
  id: string;
  companyName: string;
  companyType: string;
  raType: string;
  sebiRegistration: string;
  bseEnrollment?: string | null;
  email: string;
  mobile: string;
  address?: string | null;
  pan?: string | null;
  gst?: string | null;
  website?: string | null;
  ownerName: string;
  certificateUrl?: string | null;
  certificateValidity?: Date | null;
  nismCertificateUrl?: string | null;
  nismValidity?: Date | null;
  status: string;
  previousStatus?: string | null;
  depositAmount: number;
  state?: string | null;
  panelName?: string | null;
  domainUrl?: string | null;
  mongoDbUrl: string;
  dbName: string;
  tenantApiKey?: string | null;
  createdById?: Types.ObjectId | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const AllCompanySchema = new Schema<IAllCompany>(
  {
    companyName: { type: String, required: true },
    companyType: { type: String, default: 'INDIVIDUAL' },
    raType: { type: String, default: 'FULL_TIME' },
    sebiRegistration: { type: String, required: true },
    bseEnrollment: { type: String, default: null },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    address: { type: String, default: null },
    pan: { type: String, default: null },
    gst: { type: String, default: null },
    website: { type: String, default: null },
    ownerName: { type: String, default: 'Admin User' },
    certificateUrl: { type: String, default: null },
    certificateValidity: { type: Date, default: null },
    nismCertificateUrl: { type: String, default: null },
    nismValidity: { type: Date, default: null },
    status: { type: String, default: 'ACTIVE' },
    previousStatus: { type: String, default: null },
    depositAmount: { type: Number, default: 0.0 },
    state: { type: String, default: null },
    panelName: { type: String, default: null },
    domainUrl: { type: String, default: null },
    mongoDbUrl: { type: String, required: true },
    dbName: { type: String, required: true },
    tenantApiKey: { type: String, default: null },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null }
  },
  {
    ...baseSchemaOptions,
    collection: 'all_companies'
  }
);

export const AllCompany = mongoose.models.AllCompany || mongoose.model<IAllCompany>('AllCompany', AllCompanySchema, 'all_companies');
export default AllCompany;
