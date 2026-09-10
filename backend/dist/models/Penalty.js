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
exports.Penalty = exports.PenaltySchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.PenaltySchema = new mongoose_1.Schema({
    auditId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ComplianceAudit', required: true, unique: true },
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, default: 'PENDING_PAYMENT' },
    paidAt: { type: Date, default: null },
    paymentRef: { type: String, default: null },
    proofUrl: { type: String, default: null },
    remarks: { type: String, default: null }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'Penalty' });
exports.PenaltySchema.virtual('audit', {
    ref: 'ComplianceAudit',
    localField: 'auditId',
    foreignField: '_id',
    justOne: true
});
exports.PenaltySchema.virtual('tenant', {
    ref: 'Tenant',
    localField: 'tenantId',
    foreignField: '_id',
    justOne: true
});
exports.Penalty = mongoose_1.default.models.Penalty || mongoose_1.default.model('Penalty', exports.PenaltySchema, 'Penalty');
exports.default = exports.Penalty;
