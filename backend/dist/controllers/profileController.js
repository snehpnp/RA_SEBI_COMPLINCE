"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStaffProfile = exports.getStaffProfile = exports.updateAdminProfile = exports.getAdminProfile = exports.updateSuperAdminProfile = exports.getSuperAdminProfile = void 0;
const db_1 = __importDefault(require("../config/db"));
const getSuperAdminProfile = async (req, res) => {
    try {
        const user = await db_1.default.User.findById(req.user.id)
            .populate('roleId')
            .select('id firstName lastName email mobile roleId')
            .lean();
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        // Format role output
        const formatted = {
            ...user,
            id: String(user._id || user.id),
            role: user.roleId ? {
                id: String(user.roleId._id || user.roleId.id),
                name: user.roleId.name,
                description: user.roleId.description
            } : null
        };
        return res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getSuperAdminProfile = getSuperAdminProfile;
const updateSuperAdminProfile = async (req, res) => {
    try {
        const { firstName, lastName, mobile } = req.body;
        const user = await db_1.default.User.findByIdAndUpdate(req.user.id, { $set: { firstName, lastName, mobile } }, { returnDocument: 'after', lean: true });
        return res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateSuperAdminProfile = updateSuperAdminProfile;
const getAdminProfile = async (req, res) => {
    try {
        const user = await db_1.default.User.findById(req.user.id).lean();
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        let tenant = null;
        if (user.tenantId) {
            tenant = await db_1.default.Tenant.findById(user.tenantId).lean();
        }
        const formatted = {
            ...user,
            id: String(user._id || user.id),
            tenant
        };
        return res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getAdminProfile = getAdminProfile;
const updateAdminProfile = async (req, res) => {
    try {
        const { firstName, lastName, mobile, companyName, raType, address, ownerName, pan, gst, website, logoUrl } = req.body;
        const userId = req.user.id;
        const user = await db_1.default.User.findById(userId);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        if (firstName || lastName || mobile) {
            const userUpdate = {};
            if (firstName !== undefined)
                userUpdate.firstName = firstName;
            if (lastName !== undefined)
                userUpdate.lastName = lastName;
            if (mobile !== undefined)
                userUpdate.mobile = mobile;
            await db_1.default.User.findByIdAndUpdate(userId, { $set: userUpdate });
        }
        if (user.tenantId) {
            const tenantUpdate = {};
            if (companyName)
                tenantUpdate.companyName = companyName;
            if (raType)
                tenantUpdate.raType = raType;
            if (address)
                tenantUpdate.address = address;
            if (ownerName)
                tenantUpdate.ownerName = ownerName;
            if (pan)
                tenantUpdate.pan = pan;
            if (gst !== undefined)
                tenantUpdate.gst = gst;
            if (website !== undefined)
                tenantUpdate.website = website;
            if (logoUrl !== undefined)
                tenantUpdate.logoUrl = logoUrl;
            if (Object.keys(tenantUpdate).length > 0) {
                await db_1.default.Tenant.findByIdAndUpdate(user.tenantId, { $set: tenantUpdate });
            }
        }
        return res.status(200).json({ success: true, message: 'Admin profile updated successfully' });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateAdminProfile = updateAdminProfile;
const getStaffProfile = async (req, res) => {
    try {
        const user = await db_1.default.User.findById(req.user.id)
            .populate('roleId')
            .lean();
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const staff = await db_1.default.Staff.findOne({ userId: user._id || user.id }).lean();
        let personAssociated = null;
        if (staff) {
            personAssociated = await db_1.default.PersonAssociated.findOne({ staffId: staff._id || staff.id }).lean();
        }
        const formatted = {
            ...user,
            id: String(user._id || user.id),
            role: user.roleId,
            staff: staff ? {
                ...staff,
                id: String(staff._id || staff.id),
                personAssociated: personAssociated ? {
                    ...personAssociated,
                    id: String(personAssociated._id || personAssociated.id)
                } : null
            } : null
        };
        return res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getStaffProfile = getStaffProfile;
const updateStaffProfile = async (req, res) => {
    try {
        const { firstName, lastName, mobile, dob, nismNumber, nismValidity, nismUpload, customRole } = req.body;
        const userId = req.user.id;
        const user = await db_1.default.User.findById(userId);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        if (firstName || lastName || mobile) {
            const userUpdate = {};
            if (firstName !== undefined)
                userUpdate.firstName = firstName;
            if (lastName !== undefined)
                userUpdate.lastName = lastName;
            if (mobile !== undefined)
                userUpdate.mobile = mobile;
            await db_1.default.User.findByIdAndUpdate(userId, { $set: userUpdate });
        }
        const staff = await db_1.default.Staff.findOne({ userId });
        if (staff) {
            const staffUpdate = {};
            if (mobile)
                staffUpdate.mobile = mobile;
            if (dob)
                staffUpdate.dob = new Date(dob);
            if (nismNumber !== undefined)
                staffUpdate.nismNumber = nismNumber;
            if (nismValidity)
                staffUpdate.nismValidity = new Date(nismValidity);
            if (nismUpload !== undefined)
                staffUpdate.nismUpload = nismUpload;
            if (Object.keys(staffUpdate).length > 0) {
                await db_1.default.Staff.findByIdAndUpdate(staff._id || staff.id, { $set: staffUpdate });
            }
            if (customRole !== undefined) {
                await db_1.default.PersonAssociated.findOneAndUpdate({ staffId: staff._id || staff.id }, { $set: { customRole } });
            }
        }
        return res.status(200).json({ success: true, message: 'Staff profile updated successfully' });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateStaffProfile = updateStaffProfile;
