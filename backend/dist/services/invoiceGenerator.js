"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = exports.resolveLogoPath = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../config/db");
// Helper to convert number to words (simple version for INR)
function numberToWords(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if ((num = num.toString().replace(/[\, ]/g, '')) != parseFloat(num))
        return 'not a number';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n)
        return '';
    let str = '';
    str += (n[1] != '00') ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != '00') ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != '00') ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != '0') ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim() + ' Only';
}
// Indian currency formatting: ₹ 15,000.00
function formatInr(amount) {
    const parts = Number(amount || 0).toFixed(2).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    const isNegative = integerPart.startsWith('-');
    if (isNegative)
        integerPart = integerPart.substring(1);
    let lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== '')
        lastThree = ',' + lastThree;
    const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    return (isNegative ? '- ' : '') + '₹ ' + formattedInt + '.' + decimalPart;
}
// Monogram letters from company name
function getInitials(name) {
    if (!name)
        return 'RA';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1)
        return words[0].slice(0, 3).toUpperCase();
    if (words.length === 2)
        return (words[0][0] + words[1][0]).toUpperCase();
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
}
/**
 * Safely resolves the logo image file path on disk
 */
const resolveLogoPath = (logoUrl) => {
    if (!logoUrl || typeof logoUrl !== 'string')
        return null;
    const trimmed = logoUrl.trim();
    if (!trimmed)
        return null;
    let cleanPath = trimmed;
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
        try {
            const parsed = new URL(cleanPath);
            cleanPath = parsed.pathname;
        }
        catch { }
    }
    cleanPath = cleanPath.replace(/^[/\\]+/, '');
    const fileName = path_1.default.basename(cleanPath);
    const candidatePaths = [
        path_1.default.resolve(process.cwd(), cleanPath),
        path_1.default.resolve(process.cwd(), 'uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
        path_1.default.resolve(process.cwd(), '../uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
        path_1.default.resolve(process.cwd(), 'uploads/branding', fileName),
        path_1.default.resolve(process.cwd(), '../uploads/branding', fileName),
        path_1.default.resolve(__dirname, '../../../uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
        path_1.default.resolve(__dirname, '../../../uploads/branding', fileName),
        path_1.default.resolve(__dirname, '../../uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
        path_1.default.resolve(__dirname, '../../uploads/branding', fileName),
        path_1.default.resolve(process.cwd(), '../frontend/public', cleanPath.replace(/^frontend[/\\]public[/\\]?/, '')),
        path_1.default.resolve(process.cwd(), '../frontend/public', fileName),
        path_1.default.resolve(process.cwd(), 'frontend/public', fileName),
        path_1.default.resolve(__dirname, '../../../frontend/public', fileName),
        path_1.default.resolve(__dirname, '../../frontend/public', fileName),
        path_1.default.resolve('d:/RA_SEBI_COMPLINCE/uploads/branding', fileName),
        path_1.default.resolve('d:/RA_SEBI_COMPLINCE/frontend/public', fileName)
    ];
    for (const candidate of candidatePaths) {
        try {
            if (fs_1.default.existsSync(candidate) && fs_1.default.statSync(candidate).isFile()) {
                const ext = path_1.default.extname(candidate).toLowerCase();
                if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                    return candidate;
                }
            }
        }
        catch { }
    }
    return null;
};
exports.resolveLogoPath = resolveLogoPath;
const generateInvoicePdf = async (paymentId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let payment = null;
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(paymentId).trim());
            if (isObjectId) {
                try {
                    payment = await db_1.Payment.findById(paymentId).populate('coupon').populate('couponId').lean();
                }
                catch { }
                if (!payment && db_1.dynamicDb?.Payment) {
                    try {
                        payment = await db_1.dynamicDb.Payment.findById(paymentId).populate('coupon').populate('couponId').lean();
                    }
                    catch { }
                }
            }
            if (!payment) {
                const orConditions = [{ transactionRef: paymentId }, { gatewayPaymentId: paymentId }];
                if (isObjectId)
                    orConditions.unshift({ _id: paymentId });
                try {
                    payment = await db_1.Payment.findOne({ $or: orConditions }).populate('coupon').populate('couponId').lean();
                }
                catch { }
                if (!payment && db_1.dynamicDb?.Payment) {
                    try {
                        payment = await db_1.dynamicDb.Payment.findOne({ $or: orConditions }).populate('coupon').populate('couponId').lean();
                    }
                    catch { }
                }
            }
            if (!payment) {
                return reject(new Error('Payment record not found'));
            }
            let client = null;
            if (payment.clientId) {
                try {
                    client = await db_1.Client.findById(payment.clientId).populate('user').populate('profile').lean();
                }
                catch { }
                if (!client && db_1.dynamicDb?.Client) {
                    try {
                        client = await db_1.dynamicDb.Client.findById(payment.clientId).populate('user').populate('profile').lean();
                    }
                    catch { }
                }
            }
            if (!client) {
                client = {
                    name: payment.clientName,
                    email: payment.clientEmail || '',
                    mobile: payment.clientPhone || '',
                    pan: payment.clientPan || 'N/A',
                    profile: { addressLine1: 'India', state: 'MADHYA PRADESH', city: 'N/A', zipCode: 'N/A' }
                };
            }
            let tenant = null;
            if (payment.tenantId) {
                try {
                    tenant = await db_1.Tenant.findById(payment.tenantId).lean();
                }
                catch { }
                if (!tenant && db_1.dynamicDb?.Tenant) {
                    try {
                        tenant = await db_1.dynamicDb.Tenant.findById(payment.tenantId).lean();
                    }
                    catch { }
                }
            }
            if (!tenant) {
                try {
                    tenant = await db_1.Tenant.findOne({ deletedAt: null }).lean();
                }
                catch { }
            }
            if (!tenant && db_1.dynamicDb?.Tenant) {
                try {
                    tenant = await db_1.dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
                }
                catch { }
            }
            if (!tenant) {
                try {
                    tenant = await db_1.Tenant.findOne().lean();
                }
                catch { }
            }
            if (!tenant) {
                tenant = {
                    companyName: 'Alpha Research Partners',
                    address: 'India',
                    email: 'support@alpharesearch.com',
                    mobile: '9999999999',
                    sebiRegistration: 'INH000001234'
                };
            }
            // Check SystemSetting if logoUrl is not populated on tenant
            if (!tenant.logoUrl) {
                try {
                    const sysSetting = await db_1.SystemSetting.findOne({ key: 'GLOBAL_BRANDING' }).lean() ||
                        (db_1.dynamicDb?.SystemSetting ? await db_1.dynamicDb.SystemSetting.findOne({ key: 'GLOBAL_BRANDING' }).lean() : null);
                    if (sysSetting && sysSetting.value) {
                        const parsed = typeof sysSetting.value === 'string' ? JSON.parse(sysSetting.value) : sysSetting.value;
                        if (parsed.logoUrl)
                            tenant.logoUrl = parsed.logoUrl;
                    }
                }
                catch { }
            }
            let planName = 'Advisory Plan';
            if (payment.planId) {
                try {
                    const plan = await db_1.Plan.findById(payment.planId).lean() || (db_1.dynamicDb?.Plan ? await db_1.dynamicDb.Plan.findById(payment.planId).lean() : null);
                    if (plan)
                        planName = plan.name;
                }
                catch { }
            }
            if (!planName && payment.planName)
                planName = payment.planName;
            const doc = new pdfkit_1.default({ margin: 30, size: 'A4', compress: false });
            const buffers = [];
            // Resolve TrueType fonts for full Unicode support (e.g. ₹ Indian Rupee sign)
            const resolveFont = (filenames) => {
                for (const filename of filenames) {
                    const candidatePaths = [
                        path_1.default.resolve(__dirname, '../../assets/fonts', filename),
                        path_1.default.resolve(__dirname, '../../../assets/fonts', filename),
                        path_1.default.resolve(process.cwd(), 'assets/fonts', filename),
                        path_1.default.resolve(process.cwd(), 'backend/assets/fonts', filename),
                        `C:\\Windows\\Fonts\\${filename}`,
                        `C:\\Windows\\Fonts\\${filename.toLowerCase()}`,
                        `C:\\Windows\\Fonts\\${filename.toUpperCase()}`
                    ];
                    for (const p of candidatePaths) {
                        try {
                            if (fs_1.default.existsSync(p) && fs_1.default.statSync(p).isFile())
                                return p;
                        }
                        catch { }
                    }
                }
                return null;
            };
            const regularFontPath = resolveFont(['arial.ttf', 'Arial.ttf']);
            const boldFontPath = resolveFont(['arialbd.ttf', 'ARIALBD.TTF', 'Arial-Bold.ttf', 'ArialBold.ttf']);
            const italicFontPath = resolveFont(['ariali.ttf', 'ARIALI.TTF', 'Arial-Italic.ttf']);
            let regularFont = 'Helvetica';
            let boldFont = 'Helvetica-Bold';
            let italicFont = 'Helvetica-Oblique';
            if (regularFontPath) {
                try {
                    doc.registerFont('App-Regular', regularFontPath);
                    regularFont = 'App-Regular';
                }
                catch { }
            }
            if (boldFontPath) {
                try {
                    doc.registerFont('App-Bold', boldFontPath);
                    boldFont = 'App-Bold';
                }
                catch { }
            }
            if (italicFontPath) {
                try {
                    doc.registerFont('App-Italic', italicFontPath);
                    italicFont = 'App-Italic';
                }
                catch { }
            }
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            // --- CALCULATE TAXES & DISCOUNT ---
            const totalAmount = Number(payment.amount || 0);
            let couponObj = payment.coupon || payment.couponId;
            if (payment.couponId && (!couponObj || typeof couponObj !== 'object' || !couponObj.code)) {
                try {
                    couponObj = await db_1.dynamicDb.Coupon.findById(payment.couponId).lean();
                }
                catch { }
            }
            const couponCodeText = couponObj?.code || payment.coupon?.code || payment.couponCode || '';
            let planObj = null;
            if (payment.planId) {
                try {
                    planObj = await db_1.Plan.findById(payment.planId).lean() || (db_1.dynamicDb?.Plan ? await db_1.dynamicDb.Plan.findById(payment.planId).lean() : null);
                }
                catch { }
            }
            const fullPlanPrice = Number(planObj?.amount || planObj?.price || 0);
            // Determine raw discount
            let rawDiscount = Number(payment.discountApplied || payment.discount || 0);
            // Determine if GST is INCLUSIVE or EXCLUSIVE
            // 1. Check tenant setting: 'INCLUSIVE' vs 'EXCLUSIVE'
            // 2. Also check if the transaction amount was charged inclusive (i.e. amount equals plan price minus discount)
            let isGstInclusive = tenant.gstCalculationType === 'INCLUSIVE';
            if (!isGstInclusive && fullPlanPrice > 0 && totalAmount > 0) {
                if (Math.abs(totalAmount - (fullPlanPrice - rawDiscount)) < 2) {
                    isGstInclusive = true;
                }
            }
            let grossBase = 0;
            let baseDiscount = 0;
            let taxableValue = 0;
            let totalGst = 0;
            let netInvoiceTotal = 0;
            if (isGstInclusive) {
                // INCLUSIVE:
                // 1. Discount is applied directly on the plan price:
                //    Net Payable = Plan Price (e.g. 1500) - Discount (e.g. 500) = 1000 (Inc. GST)
                netInvoiceTotal = totalAmount > 0 ? totalAmount : Math.max(0, fullPlanPrice - rawDiscount);
                // 2. Gross Plan Value is the full direct plan price
                grossBase = fullPlanPrice > 0 ? fullPlanPrice : Number((netInvoiceTotal + rawDiscount).toFixed(2));
                // 3. Discount is the direct coupon discount (no GST on discount amount)
                baseDiscount = rawDiscount;
                // 4. Taxable value & GST are calculated from the remaining payable amount:
                taxableValue = Number((netInvoiceTotal / 1.18).toFixed(2));
                totalGst = Number((netInvoiceTotal - taxableValue).toFixed(2));
            }
            else {
                // EXCLUSIVE: Plan price is Base, 18% GST is added on top
                // Example: Plan = ₹15000 (Base), Coupon = ₹500, Taxable = ₹14500, GST = ₹2610, Total = ₹17110
                if (couponObj?.discountValue) {
                    if (couponObj.discountType === 'PERCENTAGE') {
                        baseDiscount = ((fullPlanPrice || totalAmount) * couponObj.discountValue) / 100;
                        if (couponObj.percentageType === 'CAPPED' && couponObj.maxDiscountValue && baseDiscount > couponObj.maxDiscountValue) {
                            baseDiscount = couponObj.maxDiscountValue;
                        }
                    }
                    else {
                        baseDiscount = Number(couponObj.discountValue);
                    }
                }
                else if (rawDiscount > 0) {
                    baseDiscount = rawDiscount;
                }
                grossBase = fullPlanPrice > 0 ? fullPlanPrice : (totalAmount > 0 ? Number((totalAmount / 1.18).toFixed(2)) : 0);
                taxableValue = Math.max(0, grossBase - baseDiscount);
                totalGst = Number((taxableValue * 0.18).toFixed(2));
                netInvoiceTotal = totalAmount > 0 ? totalAmount : Number((taxableValue + totalGst).toFixed(2));
            }
            const stateCodes = {
                'JAMMU AND KASHMIR': '01', 'HIMACHAL PRADESH': '02', 'PUNJAB': '03', 'CHANDIGARH': '04', 'UTTARAKHAND': '05',
                'HARYANA': '06', 'DELHI': '07', 'RAJASTHAN': '08', 'UTTAR PRADESH': '09', 'BIHAR': '10', 'SIKKIM': '11',
                'ARUNACHAL PRADESH': '12', 'NAGALAND': '13', 'MANIPUR': '14', 'MIZORAM': '15', 'TRIPURA': '16', 'MEGHALAYA': '17',
                'ASSAM': '18', 'WEST BENGAL': '19', 'JHARKHAND': '20', 'ODISHA': '21', 'CHHATTISGARH': '22', 'MADHYA PRADESH': '23',
                'GUJARAT': '24', 'DAMAN AND DIU': '25', 'DADRA AND NAGAR HAVELI': '26', 'MAHARASHTRA': '27', 'KARNATAKA': '29',
                'GOA': '30', 'LAKSHADWEEP': '31', 'KERALA': '32', 'TAMIL NADU': '33', 'PUDUCHERRY': '34', 'ANDAMAN AND NICOBAR ISLANDS': '35',
                'TELANGANA': '36', 'ANDHRA PRADESH': '37', 'LADAKH': '38',
                'MP': '23', 'MH': '27', 'DL': '07', 'GA': '30', 'UP': '09', 'HR': '06', 'RJ': '08', 'KA': '29', 'TN': '33', 'TS': '36', 'AP': '37', 'GJ': '24', 'WB': '19'
            };
            const resolveStateCode = (st) => {
                if (!st)
                    return '';
                const clean = st.trim().toUpperCase();
                if (stateCodes[clean])
                    return stateCodes[clean];
                const noSpace = clean.replace(/[^A-Z]/g, '');
                for (const [k, v] of Object.entries(stateCodes)) {
                    if (k.replace(/[^A-Z]/g, '') === noSpace)
                        return v;
                }
                return '';
            };
            let displayClientState = (client.profile?.state || client.state || 'MADHYA PRADESH').trim().toUpperCase();
            let displayTenantState = (tenant.state ? tenant.state.trim().toUpperCase() : (tenant.address?.split(',').pop()?.trim().toUpperCase() || 'MAHARASHTRA'));
            const normClientState = displayClientState.replace(/[^A-Z]/g, '');
            const normTenantState = displayTenantState.replace(/[^A-Z]/g, '');
            const isIntraState = normClientState === normTenantState && normClientState !== '';
            let cgst = 0, sgst = 0, igst = 0;
            if (isIntraState) {
                cgst = Number((totalGst / 2).toFixed(2));
                sgst = Number((totalGst - cgst).toFixed(2));
            }
            else {
                igst = totalGst;
            }
            const clientStateCode = resolveStateCode(displayClientState);
            const tenantStateCode = resolveStateCode(displayTenantState) || '27';
            const clientFullName = (client.name ||
                (client.user ? `${client.user.firstName || ''} ${client.user.lastName || ''}`.trim() : '') ||
                payment.clientName ||
                'Valued Client');
            const clientEmail = client.user?.email || client.email || payment.clientEmail || 'N/A';
            const clientMobile = client.mobile || client.user?.mobile || payment.clientPhone || 'N/A';
            const clientPan = client.pan || client.user?.pan || 'N/A';
            const clientPincode = client.profile?.zipCode || client.zipCode || '';
            const clientCity = client.profile?.city || client.city || '';
            const clientAddressRaw = client.profile?.addressLine1
                ? `${client.profile.addressLine1}${client.profile.addressLine2 ? ', ' + client.profile.addressLine2 : ''}`
                : (client.address || 'India');
            let clientAddressDisplay = clientAddressRaw;
            if (clientCity && clientCity !== 'N/A' && !clientAddressDisplay.includes(clientCity)) {
                clientAddressDisplay = `${clientAddressDisplay}, ${clientCity}`;
            }
            if (clientPincode && clientPincode !== 'N/A' && !clientAddressDisplay.includes(clientPincode)) {
                clientAddressDisplay = `${clientAddressDisplay} - ${clientPincode}`;
            }
            const invoiceNo = payment.transactionRef ? `INV/${new Date().getFullYear()}/${String(payment.transactionRef).slice(-6).toUpperCase()}` : `INV/${new Date().getFullYear()}/001`;
            const invoiceDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-GB') : new Date(payment.createdAt || Date.now()).toLocaleDateString('en-GB');
            // ==========================================
            // 1. OUTER DOCUMENT BORDER
            // ==========================================
            doc.roundedRect(26, 26, 543, 755, 4).strokeColor('#CBD5E1').lineWidth(0.75).stroke();
            // ==========================================
            // 2. HEADER TOP ROW: LOGO & COMPANY INFO (Y: 34 to 90)
            // ==========================================
            const logoPath = (0, exports.resolveLogoPath)(tenant.logoUrl);
            let renderedLogo = false;
            if (logoPath) {
                try {
                    doc.image(logoPath, 36, 36, { fit: [140, 48] });
                    renderedLogo = true;
                }
                catch { }
            }
            if (!renderedLogo) {
                // Render sleek monogram corporate badge
                const initials = getInitials(tenant.companyName);
                doc.roundedRect(36, 36, 44, 44, 5).fillColor('#0F2444').fill();
                doc.font(boldFont).fontSize(14).fillColor('#FFFFFF').text(initials, 36, 50, { width: 44, align: 'center' });
                doc.font(boldFont).fontSize(12.5).fillColor('#0F2444').text(tenant.companyName, 88, 39);
                doc.font(boldFont).fontSize(7.5).fillColor('#2563EB').text('SEBI REGISTERED RESEARCH ANALYST', 88, 55);
                doc.font(regularFont).fontSize(7).fillColor('#64748B').text('Financial Research & Advisory Services', 88, 67);
            }
            // Right Side: Company Details
            const tenantGst = tenant.gst || tenant.gstin || '';
            doc.font(boldFont).fontSize(9).fillColor('#0F172A').text(tenant.companyName, 250, 36, { width: 310, align: 'right' });
            doc.font(regularFont).fontSize(7.5).fillColor('#475569').text(tenant.address || 'India', 250, 48, { width: 310, align: 'right' });
            doc.text(`Email: ${tenant.email || 'support@advisory.com'}  |  Mobile: ${tenant.mobile || 'N/A'}`, 250, 60, { width: 310, align: 'right' });
            doc.text(`SEBI Regn: ${tenant.sebiRegistration || 'INH000001234'}  |  PAN: ${tenant.pan || 'N/A'}  |  GSTIN: ${tenantGst || 'N/A'}`, 250, 72, { width: 310, align: 'right' });
            // Separator Line
            doc.moveTo(26, 92).lineTo(569, 92).strokeColor('#E2E8F0').lineWidth(0.75).stroke();
            // ==========================================
            // 3. TAX INVOICE RIBBON (Y: 98 to 122)
            // ==========================================
            doc.roundedRect(34, 98, 527, 24, 3).fillColor('#0F2444').fill();
            doc.font(boldFont).fontSize(10.5).fillColor('#FFFFFF').text('TAX INVOICE', 34, 105, { width: 527, align: 'center' });
            doc.font(boldFont).fontSize(7.5).fillColor('#93C5FD').text('ORIGINAL FOR RECIPIENT', 34, 106, { width: 517, align: 'right' });
            doc.font(regularFont).fontSize(7.5).fillColor('#94A3B8').text('(Under Rule 46 of CGST Rules, 2017)', 44, 106, { width: 220, align: 'left' });
            // ==========================================
            // 4. TWO-COLUMN METADATA CARDS (Y: 128 to 230)
            // ==========================================
            // Left Card: Invoice Details
            doc.rect(34, 128, 260, 18).fillColor('#F1F5F9').fill();
            doc.font(boldFont).fontSize(8).fillColor('#0F2444').text('INVOICE INFORMATION', 42, 133);
            doc.roundedRect(34, 128, 260, 96, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
            doc.moveTo(34, 146).lineTo(294, 146).strokeColor('#CBD5E1').stroke();
            const invLabels = [
                ['Invoice No:', invoiceNo, true],
                ['Invoice Date:', invoiceDate, false],
                ['Place of Supply:', `${displayTenantState} (State Code: ${tenantStateCode})`, false],
                ['SAC Code:', '997156 (Financial Advisory Services)', false],
                ['Reverse Charge (Y/N):', 'No (N)', false]
            ];
            let invY = 151;
            for (const [lbl, val, isBold] of invLabels) {
                doc.font(boldFont).fontSize(7.5).fillColor('#475569').text(lbl, 42, invY, { width: 100 });
                doc.font(isBold ? boldFont : regularFont).fontSize(7.5).fillColor('#0F172A').text(val, 142, invY, { width: 148 });
                invY += 14;
            }
            // Right Card: Client Details
            doc.rect(301, 128, 260, 18).fillColor('#F1F5F9').fill();
            doc.font(boldFont).fontSize(8).fillColor('#0F2444').text('BILL TO (CLIENT DETAILS)', 309, 133);
            doc.roundedRect(301, 128, 260, 96, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
            doc.moveTo(301, 146).lineTo(561, 146).strokeColor('#CBD5E1').stroke();
            const clientLabels = [
                ['Client Name:', clientFullName, true],
                ['Mobile No:', clientMobile, false],
                ['Address:', clientAddressDisplay, false],
                ['State / State Code:', `${displayClientState} (Code: ${clientStateCode || 'N/A'})`, false],
                ['Client PAN / Tax ID:', clientPan, false]
            ];
            let clY = 151;
            for (const [lbl, val, isBold] of clientLabels) {
                doc.font(boldFont).fontSize(7.5).fillColor('#475569').text(lbl, 309, clY, { width: 95 });
                doc.font(isBold ? boldFont : regularFont).fontSize(7.5).fillColor('#0F172A').text(val, 404, clY, { width: 153 });
                clY += 14;
            }
            // ==========================================
            // 5. SERVICES TABLE (Y: 232 to 308)
            // ==========================================
            const tableY = 232;
            // Header row
            doc.rect(34, tableY, 527, 22).fillColor('#F1F5F9').fill();
            doc.roundedRect(34, tableY, 527, 22, 2).strokeColor('#94A3B8').lineWidth(0.5).stroke();
            doc.font(boldFont).fontSize(7.5).fillColor('#0F172A');
            doc.text('Sr.', 36, tableY + 7, { width: 26, align: 'center' });
            doc.text('Description of Services', 66, tableY + 7, { width: 155, align: 'left' });
            doc.text('SAC Code', 225, tableY + 7, { width: 50, align: 'center' });
            doc.text('Validity Period', 280, tableY + 7, { width: 95, align: 'center' });
            doc.text('Gross Amount', 370, tableY + 7, { width: 65, align: 'right' });
            doc.text('Discount (-)', 440, tableY + 7, { width: 55, align: 'right' });
            doc.text('Taxable Value', 500, tableY + 7, { width: 55, align: 'right' });
            // Table Body Row
            const bodyY = tableY + 22;
            const bodyH = 48;
            doc.rect(34, bodyY, 527, bodyH).fillColor('#FFFFFF').fill();
            doc.roundedRect(34, bodyY, 527, bodyH, 2).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
            // Vertical grid dividers
            const divXs = [64, 223, 278, 378, 438, 498];
            for (const x of divXs) {
                doc.moveTo(x, tableY).lineTo(x, bodyY + bodyH).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
            }
            // Sr. No
            doc.font(regularFont).fontSize(8).fillColor('#0F172A').text('1', 36, bodyY + 17, { width: 26, align: 'center' });
            // Description & Coupon Badge
            doc.font(boldFont).fontSize(8.5).fillColor('#0F172A').text(planName, 68, bodyY + 11, { width: 150 });
            if (couponCodeText) {
                doc.roundedRect(68, bodyY + 26, 125, 14, 2).fillColor('#ECFDF5').strokeColor('#A7F3D0').lineWidth(0.5).fillAndStroke('#ECFDF5', '#A7F3D0');
                doc.font(boldFont).fontSize(7).fillColor('#047857').text(`Coupon Applied: ${couponCodeText}`, 74, bodyY + 29);
            }
            else {
                doc.font(regularFont).fontSize(7).fillColor('#64748B').text('Research Analyst Advisory Subscription', 68, bodyY + 28, { width: 150 });
            }
            // SAC Code
            doc.font(regularFont).fontSize(8).fillColor('#0F172A').text('997156', 225, bodyY + 17, { width: 50, align: 'center' });
            // Validity Period
            const startDate = invoiceDate;
            const validityDays = payment.planValidityDays || 30;
            const endDate = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
            doc.font(boldFont).fontSize(7.5).fillColor('#0F172A').text(`${startDate} - ${endDate}`, 280, bodyY + 13, { width: 95, align: 'center' });
            doc.font(regularFont).fontSize(6.8).fillColor('#64748B').text(`${validityDays} Days Active Access`, 280, bodyY + 26, { width: 95, align: 'center' });
            // Amounts (Right aligned!)
            doc.font(regularFont).fontSize(8).fillColor('#0F172A').text(formatInr(grossBase), 380, bodyY + 17, { width: 55, align: 'right' });
            doc.font(boldFont).fontSize(8).fillColor('#047857').text(baseDiscount > 0 ? ('- ' + formatInr(baseDiscount)) : '-', 440, bodyY + 17, { width: 55, align: 'right' });
            doc.font(boldFont).fontSize(8).fillColor('#0F172A').text(formatInr(taxableValue), 500, bodyY + 17, { width: 55, align: 'right' });
            // ==========================================
            // 6. SUMMARY & SETTLEMENT SECTION (Y: 310 to 475)
            // ==========================================
            const sumY = 310;
            // Left Box: Amount in words + Settlement Details
            // Card 1: Words
            doc.roundedRect(34, sumY, 310, 38, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
            doc.rect(34, sumY, 310, 15).fillColor('#F8FAFC').fill();
            doc.font(boldFont).fontSize(7).fillColor('#64748B').text('TOTAL INVOICE AMOUNT (IN WORDS)', 42, sumY + 4);
            doc.font(boldFont).fontSize(8).fillColor('#0F172A').text(numberToWords(Math.round(netInvoiceTotal)), 42, sumY + 21, { width: 295 });
            // Card 2: Settlement Info
            const setY = sumY + 44;
            doc.roundedRect(34, setY, 310, 114, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
            doc.rect(34, setY, 310, 16).fillColor('#F1F5F9').fill();
            doc.font(boldFont).fontSize(7.5).fillColor('#0F2444').text('PAYMENT & SETTLEMENT DETAILS', 42, setY + 4);
            const pModeText = payment.paymentMode === 'UPI_QR' ? 'UPI / QR CODE' : (payment.paymentMode || 'ONLINE / GATEWAY');
            const pDetails = [
                ['Payment Status:', 'COMPLETED (PAID)', '#047857', true],
                ['Payment Mode:', pModeText, '#0F172A', false],
                ['Txn / UTR Reference:', payment.transactionRef || 'N/A', '#0F172A', false]
            ];
            if (couponCodeText) {
                pDetails.push(['Coupon Redeemed:', `${couponCodeText} (Discount: ${formatInr(baseDiscount)})`, '#047857', false]);
            }
            if (tenant.bankName || tenant.bankAccountNo) {
                pDetails.push(['Bank Account Ref:', `${tenant.bankName || 'N/A'} | A/C: ${tenant.bankAccountNo || 'N/A'} | IFSC: ${tenant.bankIfsc || 'N/A'}`, '#475569', false]);
            }
            pDetails.push(['GST on Reverse Charge:', 'No', '#475569', false]);
            let py = setY + 21;
            for (const [lbl, val, col, isB] of pDetails) {
                doc.font(boldFont).fontSize(7.2).fillColor('#475569').text(lbl, 42, py, { width: 100 });
                doc.font(isB ? boldFont : regularFont).fontSize(7.2).fillColor(col).text(val, 145, py, { width: 195 });
                py += 14.5;
            }
            // Right Box: Tax Breakdown Rows
            const rightX = 352;
            const rightW = 209;
            doc.roundedRect(rightX, sumY, rightW, 158, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
            const taxRows = [];
            if (baseDiscount > 0) {
                taxRows.push(['Gross Plan Value', formatInr(grossBase), '#0F172A', false]);
                taxRows.push([`Less: Discount (${couponCodeText || 'Coupon'})`, '- ' + formatInr(baseDiscount), '#047857', true]);
                taxRows.push(['Net Taxable Value', formatInr(taxableValue), '#0F172A', true]);
            }
            else {
                taxRows.push(['Taxable Value', formatInr(taxableValue), '#0F172A', true]);
            }
            if (isIntraState) {
                taxRows.push(['Add: CGST (9%)', formatInr(cgst), '#0F172A', false]);
                taxRows.push(['Add: SGST (9%)', formatInr(sgst), '#0F172A', false]);
            }
            else {
                taxRows.push(['Add: IGST (18%)', formatInr(igst), '#0F172A', false]);
                taxRows.push(['Add: CGST / SGST', '₹ 0.00', '#64748B', false]);
            }
            taxRows.push(['Total Tax Amount (GST)', formatInr(totalGst), '#0F172A', true]);
            let rY = sumY;
            const rowH = baseDiscount > 0 ? 21 : 25;
            for (const [lbl, val, col, isB] of taxRows) {
                doc.font(isB ? boldFont : regularFont).fontSize(7.5).fillColor('#475569').text(lbl, rightX + 8, rY + 6, { width: 115 });
                doc.font(isB ? boldFont : regularFont).fontSize(7.5).fillColor(col).text(val, rightX + 115, rY + 6, { width: 86, align: 'right' });
                rY += rowH;
                doc.moveTo(rightX, rY).lineTo(rightX + rightW, rY).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
            }
            // Final Total Row Highlighted
            const totalBarHeight = baseDiscount > 0 ? 32 : 33;
            doc.rect(rightX, rY, rightW, totalBarHeight).fillColor('#0F2444').fill();
            doc.font(boldFont).fontSize(8.5).fillColor('#FFFFFF').text('Total Amount (INR)', rightX + 8, rY + 9, { width: 110 });
            doc.font(boldFont).fontSize(10).fillColor('#FFFFFF').text(formatInr(netInvoiceTotal), rightX + 110, rY + 8, { width: 91, align: 'right' });
            // ==========================================
            // 7. STATUTORY DISCLAIMERS & SIGNATORY (Y: 476 to 738)
            // ==========================================
            const discY = 476;
            // Left: Disclaimers
            doc.roundedRect(34, discY, 335, 256, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
            doc.rect(34, discY, 335, 18).fillColor('#F8FAFC').fill();
            doc.font(boldFont).fontSize(7.5).fillColor('#0F2444').text('REGULATORY DISCLAIMERS & INVESTOR CHARTER', 42, discY + 5);
            const discPoints = [
                '• 1. Securities Market Risk: Investments in securities market are subject to market risks. Read all the related documents carefully before investing.',
                '• 2. No Return Assurance: Registration granted by SEBI, membership of BASL and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.',
                '• 3. Compliance Mandate: Research advisory services are rendered in strict compliance with the SEBI (Research Analysts) Regulations, 2014 and code of conduct stipulated thereunder.',
                '• 4. Fee & Refund Terms: Advisory subscription fees once remitted are non-refundable as agreed in the service terms and investor agreement.',
                '• 5. Stop Loss Advisory: Investors are advised to adhere strictly to stop-loss guidelines and practice responsible risk management.',
                `• 6. Grievance Redressal: For any service queries or unresolved grievances, please reach out to our Compliance Officer at ${tenant.email || 'support@advisory.com'} or phone ${tenant.mobile || 'N/A'}.`,
                '• 7. SEBI Redressal Portals: Investors may also lodge grievances directly on SEBI SCORES portal (https://scores.sebi.gov.in) or access the SMART ODR platform (https://smartodr.in) for online conciliation.'
            ];
            let dy = discY + 26;
            for (const p of discPoints) {
                doc.font(regularFont).fontSize(6.5).fillColor('#475569').text(p, 42, dy, { width: 318, lineGap: 2.5 });
                dy += (p.length > 130 ? 30 : 22);
            }
            // Right: Signatory Card
            doc.roundedRect(378, discY, 183, 256, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
            doc.rect(378, discY, 183, 18).fillColor('#F8FAFC').fill();
            doc.font(boldFont).fontSize(7.5).fillColor('#0F2444').text('AUTHORIZED SIGNATORY', 386, discY + 5);
            doc.font(boldFont).fontSize(8.5).fillColor('#0F172A').text(`For ${tenant.companyName}`, 386, discY + 45, { width: 167, align: 'center' });
            // Seal badge box
            doc.roundedRect(405, discY + 80, 130, 52, 4).strokeColor('#93C5FD').lineWidth(0.75).stroke();
            doc.rect(406, discY + 81, 128, 50).fillColor('#EFF6FF').fill();
            doc.font(boldFont).fontSize(8).fillColor('#1D4ED8').text('DIGITALLY SIGNED', 405, discY + 92, { width: 130, align: 'center' });
            doc.font(regularFont).fontSize(6.8).fillColor('#2563EB').text('Verified Electronic Invoice', 405, discY + 107, { width: 130, align: 'center' });
            doc.font(boldFont).fontSize(8).fillColor('#334155').text('Authorized Signatory', 386, discY + 155, { width: 167, align: 'center' });
            doc.font(italicFont).fontSize(6.5).fillColor('#64748B').text('(Computer generated document)', 386, discY + 172, { width: 167, align: 'center' });
            doc.font(italicFont).fontSize(6.5).fillColor('#64748B').text('No physical signature required', 386, discY + 184, { width: 167, align: 'center' });
            // ==========================================
            // 8. BOTTOM FOOTER (Y: 746)
            // ==========================================
            const footY = 746;
            doc.moveTo(34, footY).lineTo(561, footY).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
            doc.font(regularFont).fontSize(6.5).fillColor('#64748B').text('This is a system-generated electronic tax invoice issued under Rule 46 of the CGST Rules, 2017 & SEBI (Research Analysts) Regulations, 2014.', 34, footY + 8, { width: 420, align: 'left' });
            doc.font(boldFont).fontSize(6.5).fillColor('#64748B').text('Page 1 of 1', 460, footY + 8, { width: 101, align: 'right' });
            doc.end();
        }
        catch (error) {
            console.error('PDF Generation Error:', error);
            reject(error);
        }
    });
};
exports.generateInvoicePdf = generateInvoicePdf;
