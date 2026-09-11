import 'dotenv/config';
import mongoose, { Connection } from 'mongoose';
import { ITenantModels, registerTenantModels } from '../models';

const defaultDbName: string = (process.env.DB_NAME && process.env.DB_NAME.trim()) || 'sebi-compliance';
const defaultCentralUrl: string = process.env.DATABASE_URL || `mongodb://localhost:27017/${defaultDbName}`;

// Dedicated Central DB Mongoose Connection
export const centralConnection: Connection = mongoose.createConnection(defaultCentralUrl, {
  dbName: defaultDbName,
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000
});

// Central Models
export const centralModels: ITenantModels = registerTenantModels(centralConnection);

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

    const tenantId = (allComp?.tenantId || tenantRecord?._id || tenantRecord?.id)?.toString();
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
        await poolItem?.connection.close().catch(() => {});
      }
    }
  }

  /**
   * Cleanly disconnects all tenant Mongoose connections
   */
  public async disconnectAll(): Promise<void> {
    this.connectionPool.forEach(async (poolItem) => {
      await poolItem.connection.close().catch(() => {});
    });
    this.connectionPool.clear();
    await centralConnection.close().catch(() => {});
  }
}

export const tenantConnectionManager = new TenantConnectionManager();
export default tenantConnectionManager;
