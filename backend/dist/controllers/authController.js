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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtp = exports.requestOtp = exports.logout = exports.changePassword = exports.getPublicTenants = exports.getMe = exports.resetPassword = exports.forgotPassword = exports.refreshToken = exports.login = void 0;
const crypto = __importStar(require("crypto"));
const db_1 = require("../config/db");
const tenantConnectionManager_1 = require("../services/tenantConnectionManager");
const tenantConnectionManager_2 = __importDefault(require("../services/tenantConnectionManager"));
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const auditService_1 = require("../services/auditService");
const emailService_1 = require("../services/emailService");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-refresh-key-54321';
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required',
            errors: ['Missing fields']
        });
    }
    try {
        const cleanEmail = String(email || '').toLowerCase().trim();
        const emailQuery = { email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } };
        let user = await db_1.User.findOne(emailQuery)
            .populate({
            path: 'role',
            populate: {
                path: 'permissions',
                populate: { path: 'permission' }
            }
        })
            .populate('tenant')
            .lean();
        // Fallback: If user wasn't found in current context (e.g. portal login without domain header), locate tenant
        if (!user) {
            const tenantMatch = (await tenantConnectionManager_1.centralModels.AllCompany.findOne(emailQuery).lean().catch(() => null)) ||
                (await tenantConnectionManager_1.centralModels.Tenant.findOne(emailQuery).lean().catch(() => null));
            if (tenantMatch) {
                const resolved = await tenantConnectionManager_2.default.getTenantConnection(tenantMatch.tenantId || tenantMatch._id || tenantMatch.id);
                if (resolved) {
                    user = await resolved.models.User.findOne(emailQuery)
                        .populate({
                        path: 'role',
                        populate: {
                            path: 'permissions',
                            populate: { path: 'permission' }
                        }
                    })
                        .populate('tenant')
                        .lean();
                }
            }
        }
        if (!user || user.deletedAt || user.status === 'DELETED') {
            if (user && (user.deletedAt || user.status === 'DELETED')) {
                const adminMsg = user.role?.name === 'ADMIN'
                    ? 'Your company has been removed. Please contact super admin.'
                    : 'Your company has been removed. Please contact admin.';
                return res.status(403).json({
                    success: false,
                    message: adminMsg,
                    errors: ['User deleted']
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                errors: ['User not found']
            });
        }
        if (user.tenant) {
            if (user.tenant.status === 'DELETED' || user.tenant.deletedAt) {
                return res.status(403).json({
                    success: false,
                    message: 'Your company workspace has been removed. Please contact super admin.',
                    errors: ['Tenant deleted', 'User inactive or suspended']
                });
            }
            if (user.tenant.status === 'SUSPENDED' && user.role?.name !== 'SUPER_ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'This company portal has been suspended by Super Admin. Access is disabled.',
                    errors: ['Tenant suspended', 'User inactive or suspended']
                });
            }
        }
        if (user.status === 'SUSPENDED') {
            const suspendMsg = user.role?.name === 'ADMIN'
                ? 'Your account is suspended. Please contact super admin.'
                : 'Your account is suspended. Please contact admin.';
            return res.status(403).json({
                success: false,
                message: suspendMsg,
                errors: ['User suspended', 'User inactive or suspended']
            });
        }
        if (user.status === 'PENDING_APPROVAL') {
            await db_1.User.findByIdAndUpdate(user._id || user.id, {
                status: 'ACTIVE',
                tempPassword: null
            });
            await db_1.Client.updateMany({ userId: user._id || user.id }, { status: 'ACTIVE' });
            user.status = 'ACTIVE';
        }
        if (user.status === 'INACTIVE') {
            const inactiveMsg = user.role?.name === 'ADMIN'
                ? 'Your account has been deactivated. Please contact super admin.'
                : 'Your account has been deactivated. Please contact admin.';
            return res.status(403).json({
                success: false,
                message: inactiveMsg,
                errors: ['User inactive']
            });
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                errors: ['Password incorrect']
            });
        }
        const permissions = user.role?.permissions?.map((rp) => rp.permission?.code || rp.permissionCode).filter(Boolean) || [];
        const sessionId = crypto.randomUUID();
        const userId = (user._id || user.id).toString();
        // Generate tokens
        const accessToken = jwt.sign({
            id: userId,
            email: user.email,
            role: user.role?.name,
            tenantId: user.tenantId ? user.tenantId.toString() : null,
            tokenVersion: user.tokenVersion || 0,
            sessionId: sessionId
        }, JWT_SECRET, { expiresIn: '12h' });
        const refreshToken = jwt.sign({
            id: userId,
            tokenVersion: user.tokenVersion || 0,
            sessionId: sessionId
        }, REFRESH_SECRET, { expiresIn: '7d' });
        // Update last login and session tracking
        await db_1.User.findByIdAndUpdate(userId, {
            lastLogin: new Date(),
            currentSessionId: sessionId,
            sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
        });
        // Write audit log
        await (0, auditService_1.logAudit)({
            tenantId: user.tenantId ? user.tenantId.toString() : null,
            userId: userId,
            action: 'LOGIN',
            module: 'USERS',
            ipAddress: req.ip
        });
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role?.name,
                    allowMultiDeviceLogin: user.role?.allowMultiDeviceLogin || false,
                    permissions,
                    tenantId: user.tenantId ? user.tenantId.toString() : null,
                    tenantStatus: user.tenant?.status || null,
                    tenantName: user.tenant?.companyName || 'RAGCP',
                    tenantLogo: user.tenant?.logoUrl || null
                }
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            errors: [error.message]
        });
    }
};
exports.login = login;
const refreshToken = async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Refresh token is required',
            errors: ['Missing token']
        });
    }
    try {
        const decoded = jwt.verify(token, REFRESH_SECRET);
        const user = await db_1.User.findById(decoded.id).populate('role').lean();
        if (!user || user.deletedAt || user.status !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                message: 'Invalid or suspended user session',
                errors: ['User invalid']
            });
        }
        const userId = (user._id || user.id).toString();
        const newAccessToken = jwt.sign({
            id: userId,
            email: user.email,
            role: user.role?.name,
            tenantId: user.tenantId ? user.tenantId.toString() : null
        }, JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({
            success: true,
            message: 'Token refreshed',
            data: { accessToken: newAccessToken }
        });
    }
    catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid refresh token',
            errors: [error.message]
        });
    }
};
exports.refreshToken = refreshToken;
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    try {
        const user = await db_1.User.findOne({ email }).populate('role').lean();
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If this email is registered, a new password has been sent to it.'
            });
        }
        const newPassword = 'Temp@' + Math.floor(100000 + Math.random() * 900000);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        await db_1.User.findByIdAndUpdate(user._id || user.id, { passwordHash });
        const loginUrl = req.headers.origin || `${req.protocol}://${req.headers.host}`;
        const tenant = user.tenantId ? await db_1.Tenant.findById(user.tenantId).lean() : null;
        const userName = user.firstName + (user.lastName ? ' ' + user.lastName : '');
        await (0, emailService_1.sendForgotPasswordEmail)({
            tenantId: user.tenantId ? user.tenantId.toString() : null,
            toEmail: email,
            name: userName,
            newPassword,
            loginUrl,
            companyName: tenant?.companyName || 'RAGCP Platform'
        });
        await db_1.NotificationLog.create({
            tenantId: user.tenantId || null,
            recipient: email,
            channel: 'EMAIL',
            title: 'Password Reset',
            message: `New temporary password sent to ${email}`,
            status: 'SENT'
        });
        return res.status(200).json({
            success: true,
            message: 'If this email is registered, a new password has been sent to it.'
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error',
            errors: [error.message]
        });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Token and new password are required'
        });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long'
        });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        await db_1.User.findByIdAndUpdate(userId, { passwordHash });
        return res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired token',
            errors: [error.message]
        });
    }
};
exports.resetPassword = resetPassword;
const getMe = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    try {
        const user = await db_1.User.findById(req.user.id)
            .populate({
            path: 'role',
            populate: {
                path: 'permissions',
                populate: { path: 'permission' }
            }
        })
            .populate('tenant')
            .populate({
            path: 'staff',
            populate: { path: 'personAssociated' }
        })
            .populate({
            path: 'client',
            populate: { path: 'profile' }
        })
            .lean();
        if (!user || user.deletedAt) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.tenant && user.tenant.status === 'SUSPENDED' && user.role?.name !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Your organization account is suspended. Please contact super admin.',
                errors: ['User inactive or suspended', 'Tenant suspended']
            });
        }
        const permissions = user.role?.permissions?.map((rp) => rp.permission?.code || rp.permissionCode).filter(Boolean) || [];
        const userId = (user._id || user.id).toString();
        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    mobile: user.mobile,
                    role: user.role?.name,
                    allowMultiDeviceLogin: user.role?.allowMultiDeviceLogin || false,
                    permissions,
                    tenantId: user.tenantId ? user.tenantId.toString() : null,
                    tenantStatus: user.tenant?.status || null,
                    staff: user.staff,
                    client: user.client,
                    tenant: user.tenant
                }
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.getMe = getMe;
const getPublicTenants = async (req, res) => {
    try {
        const tenants = await db_1.Tenant.find({ status: 'ACTIVE' })
            .select('id companyName')
            .lean();
        return res.json({ success: true, data: tenants });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [err.message] });
    }
};
exports.getPublicTenants = getPublicTenants;
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;
    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current password and new password are required' });
        }
        const user = await db_1.User.findById(userId).lean();
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch)
            return res.status(400).json({ success: false, message: 'Incorrect current password' });
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);
        await db_1.User.findByIdAndUpdate(userId, {
            passwordHash: newHash,
            $inc: { tokenVersion: 1 },
            currentSessionId: null,
            sessionExpiresAt: null
        });
        return res.json({ success: true, message: 'Password changed successfully' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [err.message] });
    }
};
exports.changePassword = changePassword;
const logout = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { allDevices } = req.body;
        if (allDevices) {
            await db_1.User.findByIdAndUpdate(req.user.id, {
                $inc: { tokenVersion: 1 },
                currentSessionId: null,
                sessionExpiresAt: null
            });
        }
        else {
            await db_1.User.findByIdAndUpdate(req.user.id, {
                currentSessionId: null,
                sessionExpiresAt: null
            });
        }
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.logout = logout;
const requestOtp = async (req, res) => {
    try {
        const { email, tenantId: bodyTenantId } = req.body;
        const headerTenantId = req.headers['x-tenant-id'];
        const queryTenantId = req.query.tenantId;
        const tenantId = bodyTenantId || headerTenantId || queryTenantId || null;
        if (!email)
            return res.status(400).json({ success: false, message: 'Email is required' });
        const cleanEmail = String(email || '').toLowerCase().trim();
        const existingUser = await db_1.User.findOne({
            email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).lean();
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email is already registered. Please login.' });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await db_1.EmailVerification.findOneAndUpdate({ email: cleanEmail }, { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) }, { upsert: true, returnDocument: 'after' });
        console.log(`[OTP] Generated OTP for ${cleanEmail}: ${otp}`);
        let companyName = 'RAGCP Platform';
        if (tenantId) {
            try {
                const t = await tenantConnectionManager_1.centralModels.Tenant.findById(tenantId).lean() || await tenantConnectionManager_1.centralModels.AllCompany.findById(tenantId).lean();
                if (t?.companyName)
                    companyName = t.companyName;
            }
            catch { }
        }
        else {
            try {
                const t = await tenantConnectionManager_1.centralModels.Tenant.findOne({ status: 'ACTIVE' }).lean();
                if (t?.companyName)
                    companyName = t.companyName;
            }
            catch { }
        }
        const emailSent = await (0, emailService_1.sendOtpEmail)({
            tenantId,
            toEmail: cleanEmail,
            otp,
            companyName
        });
        if (emailSent) {
            console.log(`[OTP] Successfully sent OTP email to ${cleanEmail} using DB SMTP`);
        }
        else {
            console.warn(`[OTP] Note: SMTP could not deliver email to ${cleanEmail}, but OTP is recorded: ${otp}`);
        }
        return res.json({
            success: true,
            message: 'OTP sent successfully to your email.'
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.requestOtp = requestOtp;
const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp)
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        const record = await db_1.EmailVerification.findOne({ email }).lean();
        if (!record)
            return res.status(400).json({ success: false, message: 'No OTP requested for this email' });
        if (record.otp !== otp)
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        if (new Date(record.expiresAt) < new Date())
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        await db_1.EmailVerification.deleteOne({ email });
        return res.json({ success: true, message: 'Email verified successfully.' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.verifyOtp = verifyOtp;
