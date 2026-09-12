"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComplaintReportHistory = exports.saveComplaintReport = exports.getComplaintReport = exports.deletePage = exports.savePage = exports.getAdminPages = exports.getPageBySlug = exports.getActivePages = void 0;
const db_1 = __importDefault(require("../config/db"));
const tenantSyncDispatcher_1 = require("../services/tenantSyncDispatcher");
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
// ----------------------------------------------------
// CUSTOM PAGES (POLICIES)
// ----------------------------------------------------
const getActivePages = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId || !isValidObjectId(tenantId))
            throw new Error('Valid Tenant ID required');
        let pages = await db_1.default.CustomPage.find({
            tenantId,
            status: 'ACTIVE'
        })
            .select('title slug type content externalUrl isSystem')
            .sort({ createdAt: 1 })
            .lean();
        // Only return pages explicitly marked ACTIVE by the admin
        // Also, explicitly exclude complaint-status because it is now a dedicated sidebar feature, not a policy.
        pages = pages.filter((p) => p.slug !== 'complaint-status');
        res.status(200).json({ success: true, data: pages });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.getActivePages = getActivePages;
const getPageBySlug = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId || !isValidObjectId(tenantId))
            throw new Error('Valid Tenant ID required');
        const { slug } = req.params;
        const page = await db_1.default.CustomPage.findOne({
            tenantId,
            slug
        }).lean();
        if (!page || page.status !== 'ACTIVE') {
            return res.status(404).json({ success: false, message: 'Page not found' });
        }
        res.status(200).json({ success: true, data: page });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.getPageBySlug = getPageBySlug;
const getAdminPages = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.headers['x-tenant-id'];
        if (!tenantId || !isValidObjectId(tenantId))
            throw new Error('Valid Tenant ID required');
        const pages = await db_1.default.CustomPage.find({ tenantId })
            .sort({ createdAt: 1 })
            .lean();
        res.status(200).json({ success: true, data: pages });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.getAdminPages = getAdminPages;
const savePage = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.headers['x-tenant-id'];
        if (!tenantId || !isValidObjectId(tenantId))
            throw new Error('Valid Tenant ID required');
        const { id, title, slug, type, content, externalUrl, status } = req.body;
        if (!title || !slug || !type) {
            throw new Error('Title, slug, and type are required');
        }
        let page;
        if (id) {
            if (!isValidObjectId(id))
                throw new Error('Invalid Page ID format');
            page = await db_1.default.CustomPage.findByIdAndUpdate(id, {
                $set: {
                    title,
                    slug,
                    type,
                    content: type === 'CONTENT' ? content : null,
                    externalUrl: type === 'URL' ? externalUrl : null,
                    status
                }
            }, { returnDocument: 'after', lean: true });
        }
        else {
            page = await db_1.default.CustomPage.create({
                tenantId,
                title,
                slug,
                type,
                content: type === 'CONTENT' ? content : null,
                externalUrl: type === 'URL' ? externalUrl : null,
                status: status || 'ACTIVE'
            });
        }
        // Automatically sync updated page to tenant's domain DB
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'PAGE_UPDATE' }).catch((e) => console.warn(`[PageSync] Domain sync note for tenant ${tenantId}:`, e.message));
        res.status(200).json({ success: true, message: 'Page saved successfully', data: page });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.savePage = savePage;
const deletePage = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.headers['x-tenant-id'];
        if (!tenantId || !isValidObjectId(tenantId))
            throw new Error('Valid Tenant ID required');
        const { id } = req.params;
        if (!isValidObjectId(id))
            throw new Error('Invalid Page ID format');
        const page = await db_1.default.CustomPage.findById(id);
        if (!page || page.tenantId !== tenantId)
            throw new Error('Page not found');
        await db_1.default.CustomPage.findByIdAndDelete(id);
        // Automatically sync deletion to tenant's domain DB
        (0, tenantSyncDispatcher_1.syncTenantToRemote)(tenantId, { reason: 'PAGE_DELETE' }).catch((e) => console.warn(`[PageSync] Domain sync note for tenant ${tenantId}:`, e.message));
        res.status(200).json({ success: true, message: 'Page deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.deletePage = deletePage;
// ----------------------------------------------------
// COMPLAINT STATUS REPORT
// ----------------------------------------------------
const getComplaintReport = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId || !isValidObjectId(tenantId))
            throw new Error('Valid Tenant ID required');
        const { month, year } = req.query;
        let targetMonth;
        let targetYear;
        if (month && year) {
            targetMonth = parseInt(month);
            targetYear = parseInt(year);
        }
        else {
            const now = new Date();
            if (now.getMonth() === 0) {
                // Jan -> Dec of prev year
                targetMonth = 12;
                targetYear = now.getFullYear() - 1;
            }
            else {
                targetMonth = now.getMonth(); // 1-12 mapped
                targetYear = now.getFullYear();
            }
        }
        const report = await db_1.default.ComplaintMonthlyReport.findOne({
            tenantId,
            month: targetMonth,
            year: targetYear
        }).lean();
        res.status(200).json({
            success: true,
            data: report ? JSON.parse(report.data) : null,
            month: targetMonth,
            year: targetYear
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.getComplaintReport = getComplaintReport;
const saveComplaintReport = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.headers['x-tenant-id'];
        if (!tenantId || !isValidObjectId(tenantId))
            throw new Error('Valid Tenant ID required');
        const { month, year, data } = req.body;
        if (!month || !year || !data) {
            throw new Error('Month, year, and data are required');
        }
        const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
        const report = await db_1.default.ComplaintMonthlyReport.findOneAndUpdate({
            tenantId,
            month: parseInt(month),
            year: parseInt(year)
        }, {
            $set: { data: jsonStr },
            $setOnInsert: {
                tenantId,
                month: parseInt(month),
                year: parseInt(year)
            }
        }, { upsert: true, returnDocument: 'after', lean: true });
        res.status(200).json({ success: true, message: 'Complaint report saved successfully', data: report });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.saveComplaintReport = saveComplaintReport;
const getComplaintReportHistory = async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId || !isValidObjectId(tenantId))
            throw new Error('Valid Tenant ID required');
        const reports = await db_1.default.ComplaintMonthlyReport.find({ tenantId })
            .sort({ year: -1, month: -1 })
            .lean();
        const parsedReports = reports.map((r) => ({
            id: String(r._id || r.id),
            month: r.month,
            year: r.year,
            updatedAt: r.updatedAt,
            data: JSON.parse(r.data)
        }));
        res.status(200).json({
            success: true,
            data: parsedReports
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.getComplaintReportHistory = getComplaintReportHistory;
