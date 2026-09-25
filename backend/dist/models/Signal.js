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
exports.Signal = exports.SignalSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.SignalSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    segment: { type: String, required: true },
    planId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Plan', required: true },
    callType: { type: String, required: true },
    tradeDuration: { type: String, required: true },
    stockId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Stock', required: true },
    expiryDate: { type: Date, default: null },
    strikePrice: { type: Number, default: null },
    optionType: { type: String, default: null },
    entryPrice: { type: Number, required: true },
    entryType: { type: String, required: true },
    suggestedQuantity: { type: String, default: null },
    target1: { type: Number, required: true },
    target2: { type: Number, default: null },
    target3: { type: Number, default: null },
    stoploss: { type: Number, required: true },
    description: { type: String, default: null },
    reportUrl: { type: String, default: null },
    closeStatus: { type: String, default: null },
    exitPrice: { type: Number, default: null },
    closeRemark: { type: String, default: null },
    closedAt: { type: Date, default: null },
    closeTargets: { type: String, default: null },
    status: { type: String, default: 'OPEN' },
    createdById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'Signal' });
exports.SignalSchema.virtual('tenant', {
    ref: 'Tenant',
    localField: 'tenantId',
    foreignField: '_id',
    justOne: true
});
exports.SignalSchema.virtual('stock', {
    ref: 'Stock',
    localField: 'stockId',
    foreignField: '_id',
    justOne: true
});
exports.SignalSchema.virtual('plan', {
    ref: 'Plan',
    localField: 'planId',
    foreignField: '_id',
    justOne: true
});
exports.SignalSchema.virtual('messages', {
    ref: 'SignalMessage',
    localField: '_id',
    foreignField: 'signalId'
});
exports.Signal = mongoose_1.default.models.Signal || mongoose_1.default.model('Signal', exports.SignalSchema, 'Signal');
exports.default = exports.Signal;
