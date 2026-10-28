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
exports.ComplianceAuditHistory = exports.ComplianceAuditHistorySchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.ComplianceAuditHistorySchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    requirementId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ComplianceRequirement', required: true },
    auditId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ComplianceAudit', required: true },
    previousStatus: { type: String, default: null },
    newStatus: { type: String, required: true },
    officerRemarks: { type: String, default: null },
    proofDocumentUrl: { type: String, default: null },
    updatedByUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedByName: { type: String, default: null },
    periodLabel: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'ComplianceAuditHistory' });
exports.ComplianceAuditHistorySchema.virtual('tenant', {
    ref: 'Tenant',
    localField: 'tenantId',
    foreignField: '_id',
    justOne: true
});
exports.ComplianceAuditHistorySchema.virtual('requirement', {
    ref: 'ComplianceRequirement',
    localField: 'requirementId',
    foreignField: '_id',
    justOne: true
});
exports.ComplianceAuditHistorySchema.virtual('audit', {
    ref: 'ComplianceAudit',
    localField: 'auditId',
    foreignField: '_id',
    justOne: true
});
exports.ComplianceAuditHistory = mongoose_1.default.models.ComplianceAuditHistory ||
    mongoose_1.default.model('ComplianceAuditHistory', exports.ComplianceAuditHistorySchema, 'ComplianceAuditHistory');
exports.default = exports.ComplianceAuditHistory;
