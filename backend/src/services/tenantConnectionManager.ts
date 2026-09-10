import { PrismaClient } from '@prisma/client';

// Dedicated Central DB Prisma Client
export const centralPrisma = new PrismaClient({
  log: ['error', 'warn']
});

interface CachedTenantMeta {
  id: string;
  companyName: string;
  domainUrl: string | null;
  dbName: string;
  mongoDbUrl: string;
  status: string;
  createdById?: string | null;
  cachedAt: number;
}

class TenantConnectionManager {
  private clientPool = new Map<string, PrismaClient>();
  private tenantMetaCache = new Map<string, CachedTenantMeta>();
  private domainToIdMap = new Map<string, string>();
  private readonly CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

  /**
   * Constructs a dedicated MongoDB connection URI for a tenant based on the cluster configuration
   */
  public buildTenantMongoUri(dbName: string, customBaseUrl?: string): string {
    const defaultCentralUrl = process.env.DATABASE_URL || 'mongodb://sebi:Sebi%40123@192.168.1.203:27017/sebi-compliance?authSource=sebi-compliance&replicaSet=rs0';
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
  public async resolveTenantMeta(identifier: string): Promise<CachedTenantMeta | null> {
    const trimmed = identifier.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const now = Date.now();

    // Check domain mapping
    const mappedId = this.domainToIdMap.get(trimmed) || identifier;
    const cached = this.tenantMetaCache.get(mappedId);
    if (cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached;
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier.trim());

    // Query Central DB: First check AllCompany catalog, then Tenant
    let allComp: any = null;
    try {
      if (isObjectId) {
        allComp = await centralPrisma.allCompany.findFirst({
          where: {
            OR: [
              { tenantId: identifier.trim() },
              { id: identifier.trim() }
            ]
          }
        });
      } else {
        allComp = await centralPrisma.allCompany.findFirst({
          where: {
            OR: [
              { domainUrl: { contains: trimmed, mode: 'insensitive' } },
              { email: trimmed }
            ]
          }
        });
      }
    } catch {
      allComp = null;
    }

    let tenantRecord: any = null;
    if (!allComp) {
      try {
        if (isObjectId) {
          tenantRecord = await centralPrisma.tenant.findUnique({
            where: { id: identifier.trim() }
          });
        } else {
          tenantRecord = await centralPrisma.tenant.findFirst({
            where: {
              OR: [
                { domainUrl: { contains: trimmed, mode: 'insensitive' } },
                { email: trimmed }
              ]
            }
          });
        }
      } catch {
        tenantRecord = null;
      }
    }

    if (!allComp && !tenantRecord) {
      return null;
    }

    const tenantId = allComp?.tenantId || tenantRecord?.id;
    const companyName = allComp?.companyName || tenantRecord?.companyName;
    const domainUrl = allComp?.domainUrl || tenantRecord?.domainUrl;
    const dbName = allComp?.dbName || tenantRecord?.dbName || this.sanitizeTenantDbName(companyName, tenantId);
    const mongoDbUrl = allComp?.mongoDbUrl || tenantRecord?.mongoDbUrl || this.buildTenantMongoUri(dbName);
    const status = allComp?.status || tenantRecord?.status || 'ACTIVE';
    const createdById = allComp?.createdById || tenantRecord?.createdById || null;

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
   * Returns an active PrismaClient instance connected to the tenant's dedicated database
   */
  public async getTenantPrisma(identifier: string): Promise<{ prisma: PrismaClient; meta: CachedTenantMeta } | null> {
    const meta = await this.resolveTenantMeta(identifier);
    if (!meta) {
      return null;
    }

    if (!meta.mongoDbUrl || meta.mongoDbUrl.includes('/sebi-compliance')) {
      return { prisma: centralPrisma, meta };
    }

    const cacheKey = meta.mongoDbUrl;
    let client = this.clientPool.get(cacheKey);

    if (!client) {
      try {
        const dedicatedClient = new PrismaClient({
          datasources: {
            db: {
              url: meta.mongoDbUrl
            }
          },
          log: ['error', 'warn']
        });

        // Test read access on the target database
        await dedicatedClient.role.findFirst();
        client = dedicatedClient;
        this.clientPool.set(cacheKey, client);
      } catch (connErr: any) {
        // If MongoDB cluster restricts multi-database access for current user, fallback to Central DB
        client = centralPrisma;
      }
    }

    return { prisma: client || centralPrisma, meta };
  }

  /**
   * Direct PrismaClient for a raw MongoDB URL
   */
  public getPrismaByUri(mongoDbUrl: string): PrismaClient {
    let client = this.clientPool.get(mongoDbUrl);
    if (!client) {
      client = new PrismaClient({
        datasources: {
          db: {
            url: mongoDbUrl
          }
        },
        log: ['error', 'warn']
      });
      this.clientPool.set(mongoDbUrl, client);
    }
    return client;
  }

  /**
   * Evicts a tenant from cache and closes connections on deletion or update
   */
  public async evictTenant(tenantId: string): Promise<void> {
    const meta = this.tenantMetaCache.get(tenantId);
    if (meta) {
      this.tenantMetaCache.delete(tenantId);
      if (meta.domainUrl) {
        const cleanDomain = meta.domainUrl.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        this.domainToIdMap.delete(cleanDomain);
      }
      if (meta.mongoDbUrl && this.clientPool.has(meta.mongoDbUrl)) {
        const client = this.clientPool.get(meta.mongoDbUrl);
        this.clientPool.delete(meta.mongoDbUrl);
        await client?.$disconnect().catch(() => {});
      }
    }
  }

  /**
   * Cleanly disconnects all tenant Prisma clients
   */
  public async disconnectAll(): Promise<void> {
    for (const [key, client] of this.clientPool.entries()) {
      await client.$disconnect().catch(() => {});
    }
    this.clientPool.clear();
    await centralPrisma.$disconnect().catch(() => {});
  }
}

export const tenantConnectionManager = new TenantConnectionManager();
export default tenantConnectionManager;
