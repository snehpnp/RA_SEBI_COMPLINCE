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
exports.requireAnyPermission = exports.requirePermission = exports.requireRoles = exports.authenticateJWT = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const db_1 = require("../config/db");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1]; // Authorization: Bearer <token>
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token',
                    errors: ['Token verification failed']
                });
            }
            // Check user status in DB to auto-logout inactive/suspended users
            try {
                if (!decoded.isImpersonated) {
                    let user = await db_1.User.findById(decoded.id)
                        .populate('role', 'name allowMultiDeviceLogin')
                        .populate('tenant', 'status')
                        .select('status tokenVersion currentSessionId roleId tenantId')
                        .lean();
                    if (!user) {
                        user = await db_1.centralModels.User.findById(decoded.id)
                            .populate('role', 'name allowMultiDeviceLogin')
                            .populate('tenant', 'status')
                            .select('status tokenVersion currentSessionId roleId tenantId')
                            .lean();
                    }
                    if (!user || user.status !== 'ACTIVE') {
                        return res.status(403).json({
                            success: false,
                            message: 'Your account has been deactivated. Please contact admin.',
                            errors: ['User inactive or suspended']
                        });
                    }
                    // Session validation
                    const decodedTokenVersion = Number(decoded.tokenVersion || 0);
                    const userTokenVersion = Number(user.tokenVersion || 0);
                    if (decoded.tokenVersion !== undefined && decodedTokenVersion !== userTokenVersion) {
                        return res.status(401).json({
                            success: false,
                            message: 'Session revoked. Please login again.',
                            errors: ['Token version mismatch']
                        });
                    }
                    const allowMultiDevice = user.role?.allowMultiDeviceLogin ?? (decoded.role === 'SUPER_ADMIN');
                    if (!allowMultiDevice && decoded.sessionId && user.currentSessionId && decoded.sessionId !== user.currentSessionId) {
                        return res.status(401).json({
                            success: false,
                            message: 'Logged out because you logged in from another device.',
                            errors: ['Single device constraint violated']
                        });
                    }
                    if (user.tenant) {
                        const tenantStatus = user.tenant.status;
                        if (tenantStatus === 'DELETED') {
                            return res.status(403).json({
                                success: false,
                                message: 'Your organization account has been deleted.',
                                errors: ['User inactive or suspended', 'Tenant deleted']
                            });
                        }
                        if (tenantStatus === 'SUSPENDED') {
                            return res.status(403).json({
                                success: false,
                                message: 'Your organization account is suspended. Please contact super admin.',
                                errors: ['User inactive or suspended', 'Tenant suspended']
                            });
                        }
                    }
                }
            }
            catch (dbErr) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                tenantId: decoded.tenantId,
                isImpersonated: decoded.isImpersonated || false
            };
            if (req.user.isImpersonated && !['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
                return res.status(403).json({
                    success: false,
                    message: 'Read-Only Mode: Write operations are disabled during impersonation.',
                    errors: ['Impersonation read-only restriction']
                });
            }
            next();
        });
    }
    else {
        res.status(401).json({
            success: false,
            message: 'Authorization header missing',
            errors: ['No token provided']
        });
    }
};
exports.authenticateJWT = authenticateJWT;
const requireRoles = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                errors: ['User not authenticated']
            });
        }
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access Forbidden',
                errors: [`Role '${req.user.role}' is not authorized to access this resource`]
            });
        }
        next();
    };
};
exports.requireRoles = requireRoles;
const requirePermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                errors: ['User not authenticated']
            });
        }
        if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
            return next();
        }
        try {
            const role = await db_1.Role.findOne({ name: req.user.role }).lean();
            if (!role) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Forbidden',
                    errors: [`Role not found`]
                });
            }
            const perm = await db_1.Permission.findOne({ code: permission }).lean();
            if (!perm) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Forbidden',
                    errors: [`Permission not found`]
                });
            }
            const hasPermission = await db_1.RolePermission.findOne({
                roleId: role._id,
                permissionId: perm._id
            }).lean();
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Forbidden',
                    errors: [`Permission '${permission}' is required to access this resource.`]
                });
            }
            next();
        }
        catch (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to authorize permission',
                errors: [err.message]
            });
        }
    };
};
exports.requirePermission = requirePermission;
const requireAnyPermission = (permissions) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                errors: ['User not authenticated']
            });
        }
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }
        try {
            const role = await db_1.Role.findOne({ name: req.user.role }).lean();
            if (!role) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Forbidden',
                    errors: [`Role not found`]
                });
            }
            const perms = await db_1.Permission.find({ code: { $in: permissions } }).select('_id').lean();
            const permIds = perms.map((p) => p._id);
            const hasPermission = await db_1.RolePermission.findOne({
                roleId: role._id,
                permissionId: { $in: permIds }
            }).lean();
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Forbidden',
                    errors: [`One of the following permissions is required: ${permissions.join(', ')}`]
                });
            }
            next();
        }
        catch (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to authorize permission',
                errors: [err.message]
            });
        }
    };
};
exports.requireAnyPermission = requireAnyPermission;
