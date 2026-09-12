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
exports.AdminPermission = exports.AdminPermissionSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const _schemaOptions_1 = require("./_schemaOptions");
exports.AdminPermissionSchema = new mongoose_1.Schema({
    tenantId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    module: { type: String, required: true },
    canView: { type: Boolean, default: true },
    canCreate: { type: Boolean, default: true },
    canEdit: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: true },
    canExport: { type: Boolean, default: true },
    isEnabled: { type: Boolean, default: true },
    customLimits: { type: String, default: null },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null }
}, { ..._schemaOptions_1.baseSchemaOptions, collection: 'AdminPermission' });
exports.AdminPermissionSchema.index({ tenantId: 1, module: 1 }, { unique: true });
exports.AdminPermissionSchema.virtual('tenant', {
    ref: 'Tenant',
    localField: 'tenantId',
    foreignField: '_id',
    justOne: true
});
exports.AdminPermission = mongoose_1.default.models.AdminPermission || mongoose_1.default.model('AdminPermission', exports.AdminPermissionSchema, 'AdminPermission');
exports.default = exports.AdminPermission;
