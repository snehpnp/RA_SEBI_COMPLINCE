import { MongoClient, ObjectId } from 'mongodb';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { centralModels, tenantConnectionManager } from './tenantConnectionManager';
import { provisionAllTenantCollections, TenantProvisionData, AdminUserData } from './tenantProvisionService';

export interface AutomatedProvisionResult {
  success: boolean;
  message: string;
  tenantId: string;
  companyName: string;
  domainUrl?: string | null;
  dbName: string;
  mongoDbUrl: string;
  adminEmail: string;
  adminUserId?: string;
  tempPassword?: string;
  errors?: string[];
}

export class TenantProvisionEngine {
  private readonly ALL_COLLECTIONS = [
    'Tenant',
    'User',
    'Role',
    'Permission',
    'RolePermission',
    'AdminPermission',
    'Staff',
    'PersonAssociated',
    'Client',
    'ClientProfile',
    'ClientDocument',
    'Agreement',
    'AgreementHistory',
    'Consent',
    'ConsentHistory',
    'Subscription',
    'ClientIdentityHistory',
    'PlanCategory',
    'Plan',
    'Coupon',
    'Payment',
    'Signal',
    'SignalMessage',
    'ResearchReport',
    'ResearchAnalytics',
    'Stock',
    'ComplianceRequirement',
    'ComplianceAudit',
    'ComplianceAuditHistory',
    'ComplianceAlert',
    'Penalty',
    'Complaint',
    'ComplaintMonthlyReport',
    'CustomPage',
    'EmailTemplate',
    'EmailVerification',
    'SystemSetting',
    'State',
    'SupportTicket',
    'TicketMessage',
    'AuditLog',
    'NotificationLog',
    'TenantDocumentHistory',
    'Resource'
  ];

  /**
   * Pre-creates all collections in the dedicated MongoDB database using native driver
   */
  public async precreateAllCollections(mongoDbUrl: string, dbName?: string): Promise<void> {
    const client = new MongoClient(mongoDbUrl, { serverSelectionTimeoutMS: 5000 });
    try {
      await client.connect();
      const db = dbName ? client.db(dbName) : client.db();
      const existingCollections = (await db.listCollections().toArray()).map((c) => c.name);

      for (const colName of this.ALL_COLLECTIONS) {
        if (!existingCollections.includes(colName)) {
          await db.createCollection(colName).catch(() => {});
        }
      }
    } finally {
      await client.close().catch(() => {});
    }
  }

  /**
   * Provisions a company:
   * 1. Registers the company in Central DB's `all_companies` collection.
   * 2. In Company DB (DB B):
   *    - Creates `Tenant` collection with Company B's single profile.
   *    - Creates `User` collection with Company B's Admin user.
   *    - Initializes all other collections in Company B's database.
   */
  public async provisionTenantFull(
    tenantPayload: TenantProvisionData,
    adminPayload: AdminUserData,
    createdById?: string | null
  ): Promise<AutomatedProvisionResult> {
    const companyName = tenantPayload.companyName.trim();
    const adminEmail = adminPayload.email.toLowerCase().trim();
    const rawPassword =
      adminPayload.tempPassword || adminPayload.password || 'Admin@' + Math.floor(1000 + Math.random() * 9000);
    const apiKey = tenantPayload.tenantApiKey || 'ragcp_' + crypto.randomBytes(16).toString('hex');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = adminPayload.passwordHash || (await bcrypt.hash(rawPassword, salt));

    // Step 1: Generate unique tenantId, database name and connection URI
    const tenantId = tenantPayload.id || new ObjectId().toHexString();
    const dbName = tenantPayload.dbName || tenantConnectionManager.sanitizeTenantDbName(companyName, tenantId);
    const mongoDbUrl = tenantPayload.mongoDbUrl || tenantConnectionManager.buildTenantMongoUri(dbName);
    const ownerName =
      tenantPayload.ownerName || `${adminPayload.firstName || ''} ${adminPayload.lastName || ''}`.trim() || 'Admin User';

    const certValidity =
      tenantPayload.certificateValidity && !isNaN(new Date(tenantPayload.certificateValidity).getTime())
        ? new Date(tenantPayload.certificateValidity)
        : null;
    const nismVal =
      tenantPayload.nismValidity && !isNaN(new Date(tenantPayload.nismValidity).getTime())
        ? new Date(tenantPayload.nismValidity)
        : null;
    const depAmt =
      tenantPayload.depositAmount && !isNaN(parseFloat(String(tenantPayload.depositAmount)))
        ? parseFloat(String(tenantPayload.depositAmount))
        : 0.0;

    try {
      // Step 2: Register in Central DB `all_companies` collection
      await centralModels.AllCompany.findOneAndUpdate(
        { email: tenantPayload.email },
        {
          companyName,
          companyType: tenantPayload.companyType || 'INDIVIDUAL',
          raType: tenantPayload.raType || 'FULL_TIME',
          sebiRegistration: tenantPayload.sebiRegistration,
          bseEnrollment: tenantPayload.bseEnrollment || null,
          email: tenantPayload.email,
          mobile: tenantPayload.mobile,
          address: tenantPayload.address || null,
          pan: tenantPayload.pan || null,
          gst: tenantPayload.gst || null,
          website: tenantPayload.website || null,
          ownerName,
          certificateUrl: tenantPayload.certificateUrl || null,
          certificateValidity: certValidity,
          nismCertificateUrl: tenantPayload.nismCertificateUrl || null,
          nismValidity: nismVal,
          status: tenantPayload.status || 'ACTIVE',
          depositAmount: depAmt,
          state: tenantPayload.state || null,
          panelName: tenantPayload.panelName || `${companyName} Portal`,
          domainUrl: tenantPayload.domainUrl || null,
          mongoDbUrl,
          dbName,
          tenantApiKey: apiKey,
          createdById: createdById || null
        },
        { upsert: true, returnDocument: 'after' }
      );

      // Step 3: Provision in Company Database
      const fullTenantData: TenantProvisionData = {
        ...tenantPayload,
        id: tenantId,
        ownerName,
        dbName,
        mongoDbUrl,
        tenantApiKey: apiKey
      };

      const fullAdminData: AdminUserData = {
        ...adminPayload,
        email: adminEmail,
        passwordHash,
        tempPassword: rawPassword,
        status: 'ACTIVE'
      };

      // Provision tenant and admin in central database
      const result = await provisionAllTenantCollections(
        centralModels,
        fullTenantData,
        fullAdminData
      );
      const createdAdmin = result.adminUser;

      return {
        success: true,
        message: `Company '${companyName}' successfully created. Profile registered and Admin account initialized.`,
        tenantId,
        companyName,
        domainUrl: tenantPayload.domainUrl || null,
        dbName,
        mongoDbUrl,
        adminEmail,
        adminUserId: createdAdmin?._id?.toString() || createdAdmin?.id,
        tempPassword: rawPassword
      };
    } catch (error: any) {
      console.error(`Automated Tenant Provisioning failed for ${companyName}:`, error);

      // Rollback Central DB all_companies record if provisioning fails
      await centralModels.AllCompany.deleteMany({ email: tenantPayload.email }).catch(() => {});

      return {
        success: false,
        message: `Failed to provision company database: ${error.message}`,
        tenantId,
        companyName,
        dbName,
        mongoDbUrl,
        adminEmail,
        errors: [error.message]
      };
    }
  }

  /**
   * Drops a tenant's dedicated database during hard deletion
   */
  public async dropTenantDatabase(mongoDbUrl: string): Promise<void> {
    const client = new MongoClient(mongoDbUrl, { serverSelectionTimeoutMS: 5000 });
    try {
      await client.connect();
      await client.db().dropDatabase();
    } catch (err: any) {
      console.warn('Failed to drop tenant database:', mongoDbUrl, err.message);
    } finally {
      await client.close().catch(() => {});
    }
  }
}

export const tenantProvisionEngine = new TenantProvisionEngine();
export default tenantProvisionEngine;
