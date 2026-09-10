"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantConnectionManager = exports.centralPrisma = void 0;
const client_1 = require("@prisma/client");
// Dedicated Central DB Prisma Client
exports.centralPrisma = new client_1.PrismaClient({
    log: ['error', 'warn']
});
class TenantConnectionManager {
    clientPool = new Map();
    tenantMetaCache = new Map();
    domainToIdMap = new Map();
    CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
    /**
     * Constructs a dedicated MongoDB connection URI for a tenant based on the cluster configuration
     */
    buildTenantMongoUri(dbName, customBaseUrl) {
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
    sanitizeTenantDbName(companyName, suffix) {
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
    async resolveTenantMeta(identifier) {
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
        let allComp = null;
        try {
            if (isObjectId) {
                allComp = await exports.centralPrisma.allCompany.findFirst({
                    where: {
                        OR: [
                            { tenantId: identifier.trim() },
                            { id: identifier.trim() }
                        ]
                    }
                });
            }
            else {
                allComp = await exports.centralPrisma.allCompany.findFirst({
                    where: {
                        OR: [
                            { domainUrl: { contains: trimmed, mode: 'insensitive' } },
                            { email: trimmed }
                        ]
                    }
                });
            }
        }
        catch {
            allComp = null;
        }
        let tenantRecord = null;
        if (!allComp) {
            try {
                if (isObjectId) {
                    tenantRecord = await exports.centralPrisma.tenant.findUnique({
                        where: { id: identifier.trim() }
                    });
                }
                else {
                    tenantRecord = await exports.centralPrisma.tenant.findFirst({
                        where: {
                            OR: [
                                { domainUrl: { contains: trimmed, mode: 'insensitive' } },
                                { email: trimmed }
                            ]
                        }
                    });
                }
            }
            catch {
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
        const meta = {
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
    async getTenantPrisma(identifier) {
        const meta = await this.resolveTenantMeta(identifier);
        if (!meta) {
            return null;
        }
        if (!meta.mongoDbUrl || meta.mongoDbUrl.includes('/sebi-compliance')) {
            return { prisma: exports.centralPrisma, meta };
        }
        const cacheKey = meta.mongoDbUrl;
        let client = this.clientPool.get(cacheKey);
        if (!client) {
            try {
                const dedicatedClient = new client_1.PrismaClient({
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
            }
            catch (connErr) {
                // If MongoDB cluster restricts multi-database access for current user, fallback to Central DB
                client = exports.centralPrisma;
            }
        }
        return { prisma: client || exports.centralPrisma, meta };
    }
    /**
     * Direct PrismaClient for a raw MongoDB URL
     */
    getPrismaByUri(mongoDbUrl) {
        let client = this.clientPool.get(mongoDbUrl);
        if (!client) {
            client = new client_1.PrismaClient({
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
    async evictTenant(tenantId) {
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
                await client?.$disconnect().catch(() => { });
            }
        }
    }
    /**
     * Cleanly disconnects all tenant Prisma clients
     */
    async disconnectAll() {
        for (const [key, client] of this.clientPool.entries()) {
            await client.$disconnect().catch(() => { });
        }
        this.clientPool.clear();
        await exports.centralPrisma.$disconnect().catch(() => { });
    }
}
exports.tenantConnectionManager = new TenantConnectionManager();
exports.default = exports.tenantConnectionManager;
