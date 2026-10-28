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
        const coupons = await db_1.default.Coupon.find({ tenantId }).lean();
        const mapped = (coupons || []).map((c) => ({
            ...c,
            id: String(c._id || c.id)
        }));
        return res.status(200).json({ success: true, data: mapped });
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
    const parsedDiscount = parseFloat(discountValue);
    if (isNaN(parsedDiscount) || parsedDiscount <= 0) {
        return res.status(400).json({ success: false, message: 'Discount value must be greater than 0' });
    }
    if (discountType === 'PERCENTAGE' && parsedDiscount > 100) {
        return res.status(400).json({ success: false, message: 'Discount percentage cannot exceed 100%' });
    }
    try {
        const coupon = await db_1.default.Coupon.create({
            tenantId,
            code: String(code).trim().toUpperCase(),
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
    const { discountType, discountValue, percentageType, minPurchaseValue, maxDiscountValue, expiryDate, usageLimit, clientId, planId, categoryId, isPublic } = req.body;
    if (!id || id === 'undefined' || id === 'null') {
        return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }
    const parsedDiscount = parseFloat(discountValue);
    if (isNaN(parsedDiscount) || parsedDiscount <= 0) {
        return res.status(400).json({ success: false, message: 'Discount value must be greater than 0' });
    }
    if (discountType === 'PERCENTAGE' && parsedDiscount > 100) {
        return res.status(400).json({ success: false, message: 'Discount percentage cannot exceed 100%' });
    }
    try {
        const existing = await db_1.default.Coupon.findById(id);
        if (!existing)
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        if (existing.expiryDate && new Date(existing.expiryDate).getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'Expired coupons cannot be edited' });
        }
        const updateFields = {
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
        };
        if (isPublic !== undefined) {
            updateFields.isPublic = !!isPublic;
        }
        const coupon = await db_1.default.Coupon.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: 'after', lean: true });
        return res.status(200).json({ success: true, data: coupon });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.updateCoupon = updateCoupon;
const toggleCouponVisibility = async (req, res) => {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
        return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }
    try {
        const coupon = await db_1.default.Coupon.findById(id);
        if (!coupon)
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        const updated = await db_1.default.Coupon.findByIdAndUpdate(id, { $set: { isPublic: !coupon.isPublic } }, { returnDocument: 'after', lean: true });
        return res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.toggleCouponVisibility = toggleCouponVisibility;
const toggleCouponStatus = async (req, res) => {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
        return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }
    try {
        const existing = await db_1.default.Coupon.findById(id);
        if (!existing)
            return res.status(404).json({ success: false, message: 'Not found' });
        if (existing.expiryDate && new Date(existing.expiryDate).getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'Expired coupons cannot be toggled' });
        }
        const coupon = await db_1.default.Coupon.findByIdAndUpdate(id, { $set: { status: existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } }, { returnDocument: 'after', lean: true });
        return res.status(200).json({ success: true, data: coupon });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.toggleCouponStatus = toggleCouponStatus;
const applyCoupon = async (req, res) => {
    const tenantId = (req.user?.tenantId || req.headers['x-tenant-id']);
    const { code, clientId, planId, categoryId, amount } = req.body;
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant' });
    if (!code)
        return res.status(400).json({ success: false, message: 'Coupon code is required' });
    try {
        const coupon = await db_1.default.Coupon.findOne({
            tenantId,
            code: String(code).trim().toUpperCase(),
            status: 'ACTIVE'
        }).lean();
        if (!coupon)
            return res.status(404).json({ success: false, message: 'Invalid or inactive coupon' });
        if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'Coupon has expired' });
        }
        if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }
        if (coupon.clientId) {
            const cClientId = String(coupon.clientId?._id || coupon.clientId?.id || coupon.clientId).trim();
            const userAuthId = String(req.user?.id || '').trim();
            let clientRecordId = '';
            if (userAuthId) {
                const clientDoc = await db_1.default.Client.findOne({
                    $or: [{ userId: userAuthId }, { _id: userAuthId }]
                }).select('_id userId').lean();
                if (clientDoc) {
                    clientRecordId = String(clientDoc._id || clientDoc.id || '').trim();
                }
            }
            const passedClientId = clientId ? String(clientId).trim() : '';
            const matches = ((userAuthId && cClientId === userAuthId) ||
                (clientRecordId && cClientId === clientRecordId) ||
                (passedClientId && cClientId === passedClientId));
            if (!matches) {
                return res.status(400).json({ success: false, message: 'Coupon is not applicable for this client' });
            }
        }
        if (coupon.planId && planId) {
            let allowedPlans = [];
            if (Array.isArray(coupon.planId)) {
                allowedPlans = coupon.planId.map((p) => String(p?._id || p?.id || p).trim());
            }
            else {
                const planIdStr = String(coupon.planId).trim();
                if (planIdStr.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(planIdStr);
                        allowedPlans = Array.isArray(parsed) ? parsed.map((p) => String(p?._id || p?.id || p).trim()) : [planIdStr];
                    }
                    catch {
                        allowedPlans = [planIdStr];
                    }
                }
                else {
                    allowedPlans = [planIdStr];
                }
            }
            allowedPlans = allowedPlans.filter(Boolean);
            const cleanPlanId = String(planId).trim();
            if (allowedPlans.length > 0 && !allowedPlans.includes(cleanPlanId)) {
                return res.status(400).json({ success: false, message: 'Coupon is not applicable for this plan' });
            }
        }
        if (coupon.categoryId && categoryId) {
            let allowedCats = [];
            if (Array.isArray(coupon.categoryId)) {
                allowedCats = coupon.categoryId.map((c) => String(c?._id || c?.id || c).trim());
            }
            else {
                const catIdStr = String(coupon.categoryId).trim();
                if (catIdStr.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(catIdStr);
                        allowedCats = Array.isArray(parsed) ? parsed.map((c) => String(c?._id || c?.id || c).trim()) : [catIdStr];
                    }
                    catch {
                        allowedCats = [catIdStr];
                    }
                }
                else {
                    allowedCats = [catIdStr];
                }
            }
            allowedCats = allowedCats.filter(Boolean);
            const cleanCatId = String(categoryId).trim();
            if (allowedCats.length > 0 && !allowedCats.includes(cleanCatId)) {
                return res.status(400).json({ success: false, message: 'Coupon is not applicable for this segment' });
            }
        }
        let purchaseAmount = (amount !== undefined && amount !== null && amount !== '') ? parseFloat(amount) : null;
        if (purchaseAmount === null && planId) {
            const planDoc = await db_1.default.Plan.findById(planId).select('price amount').lean();
            if (planDoc) {
                purchaseAmount = parseFloat(planDoc.price || planDoc.amount || 0);
            }
        }
        if (purchaseAmount !== null && !isNaN(purchaseAmount)) {
            if (coupon.minPurchaseValue && purchaseAmount < coupon.minPurchaseValue) {
                return res.status(400).json({ success: false, message: `Minimum purchase of Rs. ${coupon.minPurchaseValue} required (Plan price: Rs. ${purchaseAmount})` });
            }
            let discountAmount = 0;
            if (coupon.discountType === 'FLAT' || coupon.discountType === 'FIXED') {
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
            discountAmount = Math.round(discountAmount * 100) / 100;
            return res.status(200).json({ success: true, data: { ...coupon, id: String(coupon._id || coupon.id), calculatedDiscount: discountAmount } });
        }
        return res.status(200).json({ success: true, data: { ...coupon, id: String(coupon._id || coupon.id) } });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.applyCoupon = applyCoupon;
const getClientCoupons = async (req, res) => {
    const tenantId = (req.user?.tenantId || req.headers['x-tenant-id']);
    if (!tenantId)
        return res.status(400).json({ success: false, message: 'Invalid tenant context' });
    try {
        const userAuthId = String(req.user?.id || '');
        let clientRecordId = '';
        if (userAuthId) {
            const clientDoc = await db_1.default.Client.findOne({
                $or: [{ userId: userAuthId }, { _id: userAuthId }]
            }).select('_id userId').lean();
            if (clientDoc) {
                clientRecordId = String(clientDoc._id || clientDoc.id || '');
            }
        }
        const coupons = await db_1.default.Coupon.find({
            tenantId,
            status: 'ACTIVE',
            isPublic: true,
            $or: [
                { expiryDate: null },
                { expiryDate: { $gt: new Date() } }
            ]
        }).lean();
        // Filter by clientId matching
        const validCoupons = coupons.filter((c) => {
            if (!c.clientId)
                return true;
            const cClientId = String(c.clientId?._id || c.clientId?.id || c.clientId).trim();
            return (cClientId === userAuthId ||
                (clientRecordId && cClientId === clientRecordId));
        }).map((c) => ({
            ...c,
            id: String(c._id || c.id)
        }));
        return res.status(200).json({ success: true, data: validCoupons });
    }
    catch (error) {
        return res.status(500).json({ success: false, errors: [error.message] });
    }
};
exports.getClientCoupons = getClientCoupons;
