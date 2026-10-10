"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantConnectionManager = exports.centralModels = exports.centralConnection = void 0;
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const defaultDbName = (process.env.DB_NAME && process.env.DB_NAME.trim()) || 'sebi-compliance';
const defaultCentralUrl = (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) || 'mongodb://localhost:27017/sebi-compliance';
// Dedicated Central DB Mongoose Connection
exports.centralConnection = mongoose_1.default.createConnection(defaultCentralUrl, {
    dbName: defaultDbName,
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
});
exports.centralConnection.on('connected', () => {
    console.log(`✅ [DB] Connected to MongoDB: ${defaultDbName}`);
});
exports.centralConnection.on('error', (err) => {
    console.error('❌ [DB] Central MongoDB connection error:', err?.message || err);
});
exports.centralConnection.on('disconnected', () => {
    console.warn('⚠️ [DB] Central MongoDB connection disconnected.');
});
// Central Models
exports.centralModels = (0, models_1.registerTenantModels)(exports.centralConnection);
// Ensure index sanity for Client and User collections & backfill usernames
exports.centralConnection.on('open', async () => {
    try {
        const clientCol = exports.centralConnection.db?.collection('Client');
        if (clientCol) {
            const idxs = await clientCol.indexes();
            const legacyPanIdx = idxs.find((idx) => idx.name === 'pan_1' && !idx.partialFilterExpression);
            if (legacyPanIdx) {
                await clientCol.dropIndex('pan_1').catch(() => { });
            }
            const legacyAadhaarIdx = idxs.find((idx) => idx.name === 'aadhaar_1' && !idx.partialFilterExpression);
            if (legacyAadhaarIdx) {
                await clientCol.dropIndex('aadhaar_1').catch(() => { });
            }
            await clientCol.createIndex({ pan: 1 }, { unique: true, partialFilterExpression: { pan: { $type: 'string', $gt: '' } }, name: 'pan_unique_partial', background: true }).catch(() => { });
            await clientCol.createIndex({ aadhaar: 1 }, { unique: true, partialFilterExpression: { aadhaar: { $type: 'string', $gt: '' } }, name: 'aadhaar_unique_partial', background: true }).catch(() => { });
        }
        const userCol = exports.centralConnection.db?.collection('User');
        if (userCol) {
            const userIdxs = await userCol.indexes();
            for (const idx of userIdxs) {
                if (idx.key && idx.key.email && idx.unique && idx.name && idx.name !== '_id_') {
                    await userCol.dropIndex(idx.name).catch(() => { });
                }
            }
            await userCol.createIndex({ username: 1 }, { unique: true, partialFilterExpression: { username: { $type: 'string', $gt: '' } }, name: 'username_unique_partial', background: true }).catch(() => { });
        }
        // Backfill missing usernames for existing users & staff
        try {
            const usersWithoutUsername = await exports.centralModels.User.find({
                $or: [{ username: null }, { username: { $exists: false } }, { username: '' }]
            }).populate('role').lean();
            for (const u of usersWithoutUsername) {
                let suggestedUsername = '';
                const roleName = u.role?.name;
                if (roleName === 'SUPER_ADMIN') {
                    suggestedUsername = 'superadmin';
                }
                else if (roleName === 'ADMIN' && u.email === 'admin@gmail.com') {
                    suggestedUsername = 'admin';
                }
                else if (roleName === 'COMPLIANCE_OFFICER' && u.email?.includes('compliance')) {
                    suggestedUsername = 'compliance';
                }
                else if (roleName === 'RESEARCHER' && u.email?.includes('researcher')) {
                    suggestedUsername = 'researcher';
                }
                else if (u.email) {
                    suggestedUsername = u.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '');
                }
                else {
                    suggestedUsername = `user_${String(u._id || u.id).slice(-4)}`;
                }
                let finalUsername = suggestedUsername;
                let counter = 1;
                while (await exports.centralModels.User.findOne({ username: finalUsername, _id: { $ne: u._id || u.id } }).lean()) {
                    finalUsername = `${suggestedUsername}_${counter}`;
                    counter++;
                }
                await exports.centralModels.User.findByIdAndUpdate(u._id || u.id, { $set: { username: finalUsername } });
                if (exports.centralModels.Staff) {
                    await exports.centralModels.Staff.findOneAndUpdate({ userId: u._id || u.id }, { $set: { username: finalUsername } });
                }
            }
        }
        catch (bfErr) {
            console.warn('[DB] Username backfill notice:', bfErr?.message || bfErr);
        }
    }
    catch (err) {
        console.warn('[DB] Index sync notice:', err?.message || err);
    }
});
class TenantConnectionManager {
    connectionPool = new Map();
    tenantMetaCache = new Map();
    domainToIdMap = new Map();
    CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
    /**
     * Constructs a dedicated MongoDB connection URI for a tenant based on the cluster configuration
     */
    buildTenantMongoUri(dbName, customBaseUrl) {
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
        if (!identifier)
            return null;
        const strIdentifier = (typeof identifier === 'string' ? identifier : identifier.toString()).trim();
        if (!strIdentifier)
            return null;
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
        let allComp = null;
        try {
            if (isObjectId) {
                allComp = await exports.centralModels.AllCompany.findOne({
                    $or: [
                        { tenantId: strIdentifier },
                        { _id: strIdentifier }
                    ]
                }).lean();
            }
            else {
                allComp = await exports.centralModels.AllCompany.findOne({
                    $or: [
                        { companyName: new RegExp(`^${trimmed}$`, 'i') },
                        { domainUrl: new RegExp(trimmed, 'i') },
                        { email: trimmed }
                    ]
                }).lean();
            }
        }
        catch {
            allComp = null;
        }
        let tenantRecord = null;
        if (!allComp) {
            try {
                if (isObjectId) {
                    tenantRecord = await exports.centralModels.Tenant.findById(strIdentifier).lean();
                }
                else {
                    tenantRecord = await exports.centralModels.Tenant.findOne({
                        $or: [
                            { domainUrl: new RegExp(trimmed, 'i') },
                            { email: trimmed }
                        ]
                    }).lean();
                }
            }
            catch {
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
     * Returns an active Mongoose connection & models (always points to central DB in API-first architecture)
     */
    async getTenantConnection(identifier) {
        const meta = await this.resolveTenantMeta(identifier);
        if (!meta) {
            return null;
        }
        return { connection: exports.centralConnection, models: exports.centralModels, meta };
    }
    /**
     * Direct connection & models for a MongoDB URL (returns central connection & models)
     */
    getConnectionByUri(_mongoDbUrl) {
        return { connection: exports.centralConnection, models: exports.centralModels };
    }
    /**
     * Evicts a tenant from cache and closes connection on deletion or update
     */
    async evictTenant(tenantId) {
        const strId = tenantId ? tenantId.toString().trim() : '';
        if (!strId)
            return;
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
    async disconnectAll() {
        this.connectionPool.forEach(async (poolItem) => {
            await poolItem.connection.close().catch(() => { });
        });
        this.connectionPool.clear();
        await exports.centralConnection.close().catch(() => { });
    }
}
exports.tenantConnectionManager = new TenantConnectionManager();
exports.default = exports.tenantConnectionManager;
