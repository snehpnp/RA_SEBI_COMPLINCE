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
exports.Coupon = exports.CouponSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.CouponSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    code: { type: String, required: true },
    discountType: { type: String, required: true },
    discountValue: { type: Number, required: true },
    percentageType: { type: String, default: null },
    minPurchaseValue: { type: Number, default: null },
    maxDiscountValue: { type: Number, default: null },
    expiryDate: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Client', default: null },
    planId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Plan', default: null },
    categoryId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PlanCategory', default: null },
    status: { type: String, default: 'ACTIVE' },
    isPublic: { type: Boolean, default: false }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'Coupon' });
exports.CouponSchema.index({ tenantId: 1, code: 1 }, { unique: true });
exports.CouponSchema.virtual('tenant', {
    ref: 'Tenant',
    localField: 'tenantId',
    foreignField: '_id',
    justOne: true
});
exports.CouponSchema.virtual('client', {
    ref: 'Client',
    localField: 'clientId',
    foreignField: '_id',
    justOne: true
});
exports.Coupon = mongoose_1.default.models.Coupon || mongoose_1.default.model('Coupon', exports.CouponSchema, 'Coupon');
exports.default = exports.Coupon;
