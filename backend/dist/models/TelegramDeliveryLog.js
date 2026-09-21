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
exports.TelegramDeliveryLog = exports.TelegramDeliveryLogSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.TelegramDeliveryLogSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    signalId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Signal', default: null, index: true },
    planId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Plan', default: null, index: true },
    planName: { type: String, default: null },
    targetType: { type: String, enum: ['CHANNEL', 'USER_DIRECT'], required: true },
    targetChatId: { type: String, required: true, index: true },
    recipientClientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Client', default: null },
    recipientUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    recipientName: { type: String, default: null },
    recipientUsername: { type: String, default: null },
    status: { type: String, enum: ['DELIVERED', 'FAILED'], required: true, index: true },
    symbol: { type: String, default: null },
    action: { type: String, default: null },
    errorMessage: { type: String, default: null },
    telegramMessageId: { type: Number, default: null },
    sentAt: { type: Date, default: Date.now, index: true }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'TelegramDeliveryLog' });
// Virtual relations
exports.TelegramDeliveryLogSchema.virtual('signal', {
    ref: 'Signal',
    localField: 'signalId',
    foreignField: '_id',
    justOne: true
});
exports.TelegramDeliveryLogSchema.virtual('plan', {
    ref: 'Plan',
    localField: 'planId',
    foreignField: '_id',
    justOne: true
});
exports.TelegramDeliveryLogSchema.virtual('client', {
    ref: 'Client',
    localField: 'recipientClientId',
    foreignField: '_id',
    justOne: true
});
exports.TelegramDeliveryLog = mongoose_1.default.models.TelegramDeliveryLog || mongoose_1.default.model('TelegramDeliveryLog', exports.TelegramDeliveryLogSchema);
exports.default = exports.TelegramDeliveryLog;
