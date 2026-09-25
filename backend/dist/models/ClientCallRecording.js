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
exports.ClientCallRecording = exports.ClientCallRecordingSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.ClientCallRecordingSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true },
    callType: {
        type: String,
        enum: ['INBOUND', 'OUTBOUND', 'ADVISORY', 'ONBOARDING', 'COMPLAINT', 'RISK_PROFILE'],
        default: 'ADVISORY'
    },
    callDate: { type: Date, default: Date.now, required: true },
    durationSeconds: { type: Number, default: 0 },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: 'audio/mpeg' },
    callerStaffId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Staff', default: null },
    callerStaffName: { type: String, default: null },
    clientPhone: { type: String, default: null },
    summary: { type: String, default: null },
    isComplianceVerified: { type: Boolean, default: true },
    verifiedByStaffId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Staff', default: null }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'ClientCallRecording' });
exports.ClientCallRecordingSchema.index({ clientId: 1, callDate: -1 });
exports.ClientCallRecording = mongoose_1.default.models.ClientCallRecording ||
    mongoose_1.default.model('ClientCallRecording', exports.ClientCallRecordingSchema, 'ClientCallRecording');
exports.default = exports.ClientCallRecording;
