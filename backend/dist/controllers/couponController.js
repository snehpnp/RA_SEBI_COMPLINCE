"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientCoupons = exports.applyCoupon = exports.toggleCouponStatus = exports.toggleCouponVisibility = exports.updateCoupon = exports.createCoupon = exports.getCoupons = void 0;
const db_1 = __importDefault(require("../config/db"));
const getCoupons = async (req, res) => {
    const tenantId = req.user.tenantId;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const coupons = await db_1.default.coupon.findMany({ where: { tenantId } });
        return res.status(200).json({ success: true, data: coupons });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getCoupons = getCoupons;
const createCoupon = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { code, discountType, discountValue, percentageType, minPurchaseValue, maxDiscountValue, expiryDate, usageLimit, clientId, planId, categoryId, isPublic = false } = req.body;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        const coupon = await db_1.default.coupon.create({
            data: {
                tenantId,
                code: code.toUpperCase(),
                discountType,
                discountValue: parseFloat(discountValue),
                percentageType: percentageType || null,
                minPurchaseValue: minPurchaseValue ? parseFloat(minPurchaseValue) : null,
                maxDiscountValue: maxDiscountValue ? parseFloat(maxDiscountValue) : null,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                usageLimit: usageLimit ? parseInt(usageLimit) : null,
                clientId: clientId || null,
                planId: planId || null,
                categoryId: categoryId || null,
                isPublic: !!isPublic,
            }
        });
        return res.status(201).json({ success: true, data: coupon });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.createCoupon = createCoupon;
const updateCoupon = async (req, res) => {
    const { id } = req.params;
    const { discountType, discountValue, percentageType, minPurchaseValue, maxDiscountValue, expiryDate, usageLimit, clientId, planId, categoryId } = req.body;
    try {
        const existing = await db_1.default.coupon.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        if (existing.expiryDate && new Date(existing.expiryDate).getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'Expired coupons cannot be edited' });
        }
        const coupon = await db_1.default.coupon.update({
            where: { id },
            data: {
                discountType,
                discountValue: parseFloat(discountValue),
                percentageType: percentageType || null,
                minPurchaseValue: minPurchaseValue ? parseFloat(minPurchaseValue) : null,
                maxDiscountValue: maxDiscountValue ? parseFloat(maxDiscountValue) : null,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                usageLimit: usageLimit ? parseInt(usageLimit) : null,
                clientId: clientId || null,
                planId: planId || null,
                categoryId: categoryId || null,
            }
        });
        return res.status(200).json({ success: true, data: coupon });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateCoupon = updateCoupon;
const toggleCouponVisibility = async (req, res) => { const { id } = req.params; try {
    const coupon = await db_1.default.coupon.findUnique({ where: { id } });
    if (!coupon)
        return res.status(404).json({ success: false, message: 'Coupon not found' });
    const updated = await db_1.default.coupon.update({ where: { id }, data: { isPublic: !coupon.isPublic } });
    return res.status(200).json({ success: true, data: updated });
}
catch (error) {
    return res.status(500).json({ success: false, errors: [error.message] });
} };
exports.toggleCouponVisibility = toggleCouponVisibility;
const toggleCouponStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await db_1.default.coupon.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ success: false, message: 'Not found' });
        if (existing.expiryDate && new Date(existing.expiryDate).getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'Expired coupons cannot be toggled' });
        }
        const coupon = await db_1.default.coupon.update({
            where: { id },
            data: { status: existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
        });
        return res.status(200).json({ success: true, data: coupon });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.toggleCouponStatus = toggleCouponStatus;
const applyCoupon = async (req, res) => {
    const tenantId = req.user.tenantId;
    const { code, clientId, planId, categoryId, amount } = req.body;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    try {
        const coupon = await db_1.default.coupon.findFirst({
            where: { tenantId, code: code.toUpperCase(), status: 'ACTIVE' }
        });
        if (!coupon)
            return res.status(404).json({ success: false, message: 'Invalid or inactive coupon' });
        if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'Coupon has expired' });
        }
        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ success: false, message: 'Coupon expired' });
        }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }
        if (coupon.clientId && clientId && coupon.clientId !== clientId) {
            return res.status(400).json({ success: false, message: 'Coupon is not applicable for this client' });
        }
        if (coupon.planId && planId) {
            let allowedPlans = [];
            try {
                allowedPlans = JSON.parse(coupon.planId);
                if (!Array.isArray(allowedPlans))
                    allowedPlans = [coupon.planId];
            }
            catch (e) {
                allowedPlans = [coupon.planId];
            }
            if (allowedPlans.length > 0 && !allowedPlans.includes(planId)) {
                return res.status(400).json({ success: false, message: 'Coupon is not applicable for this plan' });
            }
        }
        if (coupon.categoryId && categoryId) {
            let allowedCats = [];
            try {
                allowedCats = JSON.parse(coupon.categoryId);
                if (!Array.isArray(allowedCats))
                    allowedCats = [coupon.categoryId];
            }
            catch (e) {
                allowedCats = [coupon.categoryId];
            }
            if (allowedCats.length > 0 && !allowedCats.includes(categoryId)) {
                return res.status(400).json({ success: false, message: 'Coupon is not applicable for this segment' });
            }
        }
        if (amount) {
            const purchaseAmount = parseFloat(amount);
            if (coupon.minPurchaseValue && purchaseAmount < coupon.minPurchaseValue) {
                return res.status(400).json({ success: false, message: `Minimum purchase of Rs. ${coupon.minPurchaseValue} required` });
            }
            let discountAmount = 0;
            if (coupon.discountType === 'FLAT') {
                discountAmount = coupon.discountValue;
            }
            else if (coupon.discountType === 'PERCENTAGE') {
                discountAmount = (purchaseAmount * coupon.discountValue) / 100;
                if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && discountAmount > coupon.maxDiscountValue) {
                    discountAmount = coupon.maxDiscountValue;
                }
            }
            // Ensure discount doesn't exceed amount
            if (discountAmount > purchaseAmount)
                discountAmount = purchaseAmount;
            return res.status(200).json({ success: true, data: { ...coupon, calculatedDiscount: discountAmount } });
        }
        return res.status(200).json({ success: true, data: coupon });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.applyCoupon = applyCoupon;
const getClientCoupons = async (req, res) => {
    const tenantId = req.headers['x-tenant-id'];
    const clientId = req.user?.id;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const coupons = await db_1.default.coupon.findMany({
            where: {
                tenantId,
                status: 'ACTIVE',
                isPublic: true,
                OR: [
                    { expiryDate: null },
                    { expiryDate: { gt: new Date() } }
                ]
            }
        });
        // Optionally filter by clientId matching
        const validCoupons = coupons.filter(c => !c.clientId || c.clientId === clientId);
        return res.status(200).json({ success: true, data: validCoupons });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getClientCoupons = getClientCoupons;
