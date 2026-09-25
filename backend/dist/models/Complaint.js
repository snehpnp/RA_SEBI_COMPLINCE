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
exports.Complaint = exports.ComplaintSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.ComplaintSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Client', default: null },
    clientName: { type: String, required: true },
    clientEmail: { type: String, default: null },
    clientMobile: { type: String, default: null },
    clientPan: { type: String, default: null },
    source: { type: String, required: true },
    scoresRefId: { type: String, default: null },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, default: 'OPEN' },
    receivedAt: { type: Date, default: Date.now },
    deadlineAt: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: null },
    atrProofUrl: { type: String, default: null }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'Complaint' });
exports.ComplaintSchema.virtual('tenant', {
    ref: 'Tenant',
    localField: 'tenantId',
    foreignField: '_id',
    justOne: true
});
exports.ComplaintSchema.virtual('client', {
    ref: 'Client',
    localField: 'clientId',
    foreignField: '_id',
    justOne: true
});
exports.Complaint = mongoose_1.default.models.Complaint || mongoose_1.default.model('Complaint', exports.ComplaintSchema, 'Complaint');
exports.default = exports.Complaint;
