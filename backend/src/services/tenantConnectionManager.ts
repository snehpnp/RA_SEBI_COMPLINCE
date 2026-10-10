import 'dotenv/config';
import mongoose, { Connection } from 'mongoose';
import { ITenantModels, registerTenantModels } from '../models';

const defaultDbName: string = (process.env.DB_NAME && process.env.DB_NAME.trim()) || 'sebi-compliance';
const defaultCentralUrl: string = (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) || 'mongodb://localhost:27017/sebi-compliance';



// Dedicated Central DB Mongoose Connection
export const centralConnection = mongoose.createConnection(
  defaultCentralUrl,
  {
    dbName: defaultDbName,
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
  }
);

centralConnection.on('connected', () => {
  console.log(`✅ [DB] Connected to MongoDB: ${defaultDbName}`);
});

centralConnection.on('error', (err: any) => {
  console.error('❌ [DB] Central MongoDB connection error:', err?.message || err);
});

centralConnection.on('disconnected', () => {
  console.warn('⚠️ [DB] Central MongoDB connection disconnected.');
});

// Central Models
export const centralModels: ITenantModels = registerTenantModels(centralConnection);

// Ensure index sanity for Client and User collections & backfill usernames
centralConnection.on('open', async () => {
  try {
    const clientCol = centralConnection.db?.collection('Client');
    if (clientCol) {
      const idxs = await clientCol.indexes();
      const legacyPanIdx = idxs.find((idx: any) => idx.name === 'pan_1' && !idx.partialFilterExpression);
      if (legacyPanIdx) {
        await clientCol.dropIndex('pan_1').catch(() => {});
      }
      const legacyAadhaarIdx = idxs.find((idx: any) => idx.name === 'aadhaar_1' && !idx.partialFilterExpression);
      if (legacyAadhaarIdx) {
        await clientCol.dropIndex('aadhaar_1').catch(() => {});
      }
      await clientCol.createIndex(
        { pan: 1 },
        { unique: true, partialFilterExpression: { pan: { $type: 'string', $gt: '' } }, name: 'pan_unique_partial', background: true }
      ).catch(() => {});
      await clientCol.createIndex(
        { aadhaar: 1 },
        { unique: true, partialFilterExpression: { aadhaar: { $type: 'string', $gt: '' } }, name: 'aadhaar_unique_partial', background: true }
      ).catch(() => {});
    }

    const userCol = centralConnection.db?.collection('User');
    if (userCol) {
      const userIdxs = await userCol.indexes();
      for (const idx of userIdxs) {
        if (idx.key && idx.key.email && idx.unique && idx.name && idx.name !== '_id_') {
          await userCol.dropIndex(idx.name).catch(() => {});
        }
      }
      await userCol.createIndex(
        { username: 1 },
        { unique: true, partialFilterExpression: { username: { $type: 'string', $gt: '' } }, name: 'username_unique_partial', background: true }
      ).catch(() => {});
    }

    // Backfill missing usernames for existing users & staff
    try {
      const usersWithoutUsername: any[] = await centralModels.User.find({
        $or: [{ username: null }, { username: { $exists: false } }, { username: '' }]
      }).populate('role').lean();

      for (const u of usersWithoutUsername) {
        let suggestedUsername = '';
        const roleName = u.role?.name;
        if (roleName === 'SUPER_ADMIN') {
          suggestedUsername = 'superadmin';
        } else if (roleName === 'ADMIN' && u.email === 'admin@gmail.com') {
          suggestedUsername = 'admin';
        } else if (roleName === 'COMPLIANCE_OFFICER' && u.email?.includes('compliance')) {
          suggestedUsername = 'compliance';
        } else if (roleName === 'RESEARCHER' && u.email?.includes('researcher')) {
          suggestedUsername = 'researcher';
        } else if (u.email) {
          suggestedUsername = u.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '');
        } else {
          suggestedUsername = `user_${String(u._id || u.id).slice(-4)}`;
        }

        let finalUsername = suggestedUsername;
        let counter = 1;
        while (await centralModels.User.findOne({ username: finalUsername, _id: { $ne: u._id || u.id } }).lean()) {
          finalUsername = `${suggestedUsername}_${counter}`;
          counter++;
        }

        await centralModels.User.findByIdAndUpdate(u._id || u.id, { $set: { username: finalUsername } });
        if (centralModels.Staff) {
          await centralModels.Staff.findOneAndUpdate({ userId: u._id || u.id }, { $set: { username: finalUsername } });
        }
      }
    } catch (bfErr: any) {
      console.warn('[DB] Username backfill notice:', bfErr?.message || bfErr);
    }
  } catch (err: any) {
    console.warn('[DB] Index sync notice:', err?.message || err);
  }
});

export interface CachedTenantMeta {
  id: string;
  companyName: string;
  domainUrl: string | null;
  dbName: string;
  mongoDbUrl: string;
  status: string;
  createdById?: string | null;
  cachedAt: number;
}

export interface TenantConnectionResult {
  connection: Connection;
  models: ITenantModels;
  meta: CachedTenantMeta;
}

class TenantConnectionManager {
  private connectionPool = new Map<string, { connection: Connection; models: ITenantModels }>();
  private tenantMetaCache = new Map<string, CachedTenantMeta>();
  private domainToIdMap = new Map<string, string>();
  private readonly CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

  /**
   * Constructs a dedicated MongoDB connection URI for a tenant based on the cluster configuration
   */
  public buildTenantMongoUri(dbName: string, customBaseUrl?: string): string {
    const baseUrl = (customBaseUrl && customBaseUrl.trim()) ? customBaseUrl.trim() : defaultCentralUrl;

    // Replace the database name part directly without touching password encoding
    if (baseUrl.includes('/')) {
      return baseUrl.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);
    }
    return `${baseUrl}/${dbName}`;
  }

  /**
   * Generates a safe, sanitized database name for a tenant
   */
  public sanitizeTenantDbName(companyName: string, suffix?: string): string {
    const slug = companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 24);

    const safeSuffix = suffix ? `_${suffix.toLowerCase().substring(0, 8)}` : '';
    return `sebi_tenant_${slug || 'company'}${safeSuffix}`;
  }

  /**
   * Resolves tenant metadata by ID or Domain from Central DB with caching
   */
  public async resolveTenantMeta(identifier: string | any): Promise<CachedTenantMeta | null> {
    if (!identifier) return null;
    const strIdentifier = (typeof identifier === 'string' ? identifier : identifier.toString()).trim();
    if (!strIdentifier) return null;
    const trimmed = strIdentifier.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const now = Date.now();

    // Check domain mapping
    const mappedId = this.domainToIdMap.get(trimmed) || strIdentifier;
    const cached = this.tenantMetaCache.get(mappedId);
    if (cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached;
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(strIdentifier);

    // Query Central DB: First check AllCompany catalog, then Tenant
    let allComp: any = null;
    try {
      if (isObjectId) {
        allComp = await centralModels.AllCompany.findOne({
          $or: [
            { tenantId: strIdentifier },
            { _id: strIdentifier }
          ]
        }).lean();
      } else {
        allComp = await centralModels.AllCompany.findOne({
          $or: [
            { companyName: new RegExp(`^${trimmed}$`, 'i') },
            { domainUrl: new RegExp(trimmed, 'i') },
            { email: trimmed }
          ]
        }).lean();
      }
    } catch {
      allComp = null;
    }

    let tenantRecord: any = null;
    if (!allComp) {
      try {
        if (isObjectId) {
          tenantRecord = await centralModels.Tenant.findById(strIdentifier).lean();
        } else {
          tenantRecord = await centralModels.Tenant.findOne({
            $or: [
              { domainUrl: new RegExp(trimmed, 'i') },
              { email: trimmed }
            ]
          }).lean();
        }
      } catch {
        tenantRecord = null;
      }
    }

    if (!allComp && !tenantRecord) {
      return null;
    }

    const tenantId = (allComp?._id || allComp?.tenantId || tenantRecord?._id || tenantRecord?.id)?.toString();
    const companyName = allComp?.companyName || tenantRecord?.companyName;
    const domainUrl = allComp?.domainUrl || tenantRecord?.domainUrl;
    const dbName = allComp?.dbName || tenantRecord?.dbName || this.sanitizeTenantDbName(companyName, tenantId);
    const mongoDbUrl = allComp?.mongoDbUrl || tenantRecord?.mongoDbUrl || this.buildTenantMongoUri(dbName);
    const status = allComp?.status || tenantRecord?.status || 'ACTIVE';
    const createdById = (allComp?.createdById || tenantRecord?.createdById)?.toString() || null;

    const meta: CachedTenantMeta = {
      id: tenantId,
      companyName,
      domainUrl: domainUrl || null,
      dbName,
      mongoDbUrl,
      status,
      createdById,
      cachedAt: now
    };

    this.tenantMetaCache.set(tenantId, meta);
    if (domainUrl) {
      const cleanDomain = domainUrl.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      this.domainToIdMap.set(cleanDomain, tenantId);
    }

    return meta;
  }

  /**
   * Returns an active Mongoose connection & models (always points to central DB in API-first architecture)
   */
  public async getTenantConnection(identifier: string | any): Promise<TenantConnectionResult | null> {
    const meta = await this.resolveTenantMeta(identifier);
    if (!meta) {
      return null;
    }

    return { connection: centralConnection, models: centralModels, meta };
  }

  /**
   * Direct connection & models for a MongoDB URL (returns central connection & models)
   */
  public getConnectionByUri(_mongoDbUrl: string): { connection: Connection; models: ITenantModels } {
    return { connection: centralConnection, models: centralModels };
  }

  /**
   * Evicts a tenant from cache and closes connection on deletion or update
   */
  public async evictTenant(tenantId: string | any): Promise<void> {
    const strId = tenantId ? tenantId.toString().trim() : '';
    if (!strId) return;
    const meta = this.tenantMetaCache.get(strId);
    if (meta) {
      this.tenantMetaCache.delete(strId);
      if (meta.domainUrl) {
        const cleanDomain = meta.domainUrl.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        this.domainToIdMap.delete(cleanDomain);
      }
      if (meta.mongoDbUrl && this.connectionPool.has(meta.mongoDbUrl)) {
        const poolItem = this.connectionPool.get(meta.mongoDbUrl);
        this.connectionPool.delete(meta.mongoDbUrl);
        await poolItem?.connection.close().catch(() => { });
      }
    }
  }

  /**
   * Cleanly disconnects all tenant Mongoose connections
   */
  public async disconnectAll(): Promise<void> {
    this.connectionPool.forEach(async (poolItem) => {
      await poolItem.connection.close().catch(() => { });
    });
    this.connectionPool.clear();
    await centralConnection.close().catch(() => { });
  }
}

export const tenantConnectionManager = new TenantConnectionManager();
export default tenantConnectionManager;
