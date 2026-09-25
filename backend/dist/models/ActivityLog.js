"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLog = exports.ActivityLogSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.ActivityLogSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    actorType: { type: String, enum: ['CLIENT', 'STAFF', 'ADMIN', 'SYSTEM'], default: 'CLIENT' },
    actorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, default: null },
    actorEmail: { type: String, default: null },
    targetClientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Client', default: null, index: true },
    category: {
        type: String,
        enum: ['AUTH', 'KYC_COMPLIANCE', 'PAYMENT', 'SUBSCRIPTION', 'STAFF_ACTION', 'SUPPORT', 'SYSTEM'],
        required: true,
        index: true
    },
    action: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING', 'INFO'], default: 'SUCCESS' },
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    device: { type: String, default: null },
    browser: { type: String, default: null },
    os: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: -1 }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'ActivityLog' });
// Compound indexes for fast query performance
exports.ActivityLogSchema.index({ tenantId: 1, targetClientId: 1, timestamp: -1 });
exports.ActivityLogSchema.index({ tenantId: 1, category: 1, timestamp: -1 });
exports.ActivityLog = mongoose_1.default.models.ActivityLog || mongoose_1.default.model('ActivityLog', exports.ActivityLogSchema, 'ActivityLog');
exports.default = exports.ActivityLog;
