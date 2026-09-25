"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteResource = exports.getResources = exports.uploadResource = void 0;
const db_1 = __importDefault(require("../config/db"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const tenantSyncDispatcher_1 = require("../services/tenantSyncDispatcher");
const uploadResource = async (req, res) => {
    try {
        const { title, category } = req.body;
        const file = req.file;
        if (!title || !category || !file) {
            return res.status(400).json({ success: false, message: 'Missing required fields: title, category, or file' });
        }
        const fileUrl = `/uploads/resources/${file.filename}`;
        const resource = await db_1.default.Resource.create({
            title,
            category,
            fileUrl,
            fileName: file.originalname,
        });
        // Auto-sync new resource across all company databases in background
        (0, tenantSyncDispatcher_1.syncAllTenantsToRemote)({ reason: 'RESOURCE_UPLOAD' }).catch((syncErr) => {
            console.warn('[SYNC] Resource upload sync note:', syncErr.message);
        });
        res.status(201).json({ success: true, data: resource });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Failed to upload resource' });
    }
};
exports.uploadResource = uploadResource;
const getResources = async (req, res) => {
    try {
        const resources = await db_1.default.Resource.find({}).sort({ uploadedAt: -1 }).lean();
        res.status(200).json({ success: true, data: resources });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Failed to fetch resources' });
    }
};
exports.getResources = getResources;
const deleteResource = async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await db_1.default.Resource.findById(id);
        if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }
        // Delete the file from the filesystem if it exists
        const filePath = path_1.default.join(__dirname, '../../..', resource.fileUrl);
        if (fs_1.default.existsSync(filePath)) {
            try {
                fs_1.default.unlinkSync(filePath);
            }
            catch (fileErr) {
                console.error('Failed to delete resource file:', fileErr);
            }
        }
        await db_1.default.Resource.findByIdAndDelete(id);
        // Auto-sync resource deletion across all company databases in background
        (0, tenantSyncDispatcher_1.syncAllTenantsToRemote)({ reason: 'RESOURCE_DELETE' }).catch((syncErr) => {
            console.warn('[SYNC] Resource delete sync note:', syncErr.message);
        });
        res.status(200).json({ success: true, message: 'Resource deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Failed to delete resource' });
    }
};
exports.deleteResource = deleteResource;
