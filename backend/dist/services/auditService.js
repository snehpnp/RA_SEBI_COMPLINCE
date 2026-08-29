"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = void 0;
const db_1 = __importDefault(require("../config/db"));
const logAudit = async (params) => {
    try {
        await db_1.default.auditLog.create({
            data: {
                tenantId: params.tenantId || null,
                userId: params.userId,
                action: params.action,
                module: params.module,
                oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
                newValue: params.newValue ? JSON.stringify(params.newValue) : null,
                ipAddress: params.ipAddress || null,
            }
        });
    }
    catch (err) {
        console.error('Audit logging failed:', err);
    }
};
exports.logAudit = logAudit;
