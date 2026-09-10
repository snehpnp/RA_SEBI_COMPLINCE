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
exports.User = exports.UserSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.UserSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    roleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Role', required: true },
    employeeCode: { type: String, default: null },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    passwordHash: { type: String, required: true },
    status: { type: String, default: 'ACTIVE' },
    lastLogin: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    currentSessionId: { type: String, default: null },
    sessionExpiresAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    tempPassword: { type: String, default: null }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'User' });
// Virtual relations
exports.UserSchema.virtual('role', {
    ref: 'Role',
    localField: 'roleId',
    foreignField: '_id',
    justOne: true
});
exports.UserSchema.virtual('tenant', {
    ref: 'Tenant',
    localField: 'tenantId',
    foreignField: '_id',
    justOne: true
});
exports.UserSchema.virtual('staff', {
    ref: 'Staff',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});
exports.UserSchema.virtual('client', {
    ref: 'Client',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});
exports.User = mongoose_1.default.models.User || mongoose_1.default.model('User', exports.UserSchema, 'User');
exports.default = exports.User;
