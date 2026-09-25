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
exports.Payment = exports.PaymentSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.PaymentSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Client', required: true },
    planId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Plan', default: null },
    amount: { type: Number, required: true },
    paymentMode: { type: String, required: true },
    transactionRef: { type: String, required: true, unique: true },
    receiptUrl: { type: String, default: null },
    status: { type: String, default: 'PENDING' },
    remarks: { type: String, default: null },
    verifiedByStaffId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Staff', default: null },
    assignedByAdminName: { type: String, default: null },
    assignedByStaffName: { type: String, default: null },
    clientCity: { type: String, default: null },
    clientState: { type: String, default: null },
    tenantState: { type: String, default: null },
    planValidityDays: { type: Number, default: null },
    paymentGatewayId: { type: mongoose_1.Schema.Types.ObjectId, default: null },
    paymentDate: { type: Date, default: null },
    couponId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    discountApplied: { type: Number, default: 0 }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'Payment' });
exports.PaymentSchema.virtual('tenant', {
    ref: 'Tenant',
    localField: 'tenantId',
    foreignField: '_id',
    justOne: true
});
exports.PaymentSchema.virtual('coupon', {
    ref: 'Coupon',
    localField: 'couponId',
    foreignField: '_id',
    justOne: true
});
exports.PaymentSchema.virtual('client', {
    ref: 'Client',
    localField: 'clientId',
    foreignField: '_id',
    justOne: true
});
exports.PaymentSchema.virtual('plan', {
    ref: 'Plan',
    localField: 'planId',
    foreignField: '_id',
    justOne: true
});
exports.Payment = mongoose_1.default.models.Payment || mongoose_1.default.model('Payment', exports.PaymentSchema, 'Payment');
exports.default = exports.Payment;
