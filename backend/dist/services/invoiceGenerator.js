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
// ─────────────────────────────────────────────────────────────
// FONT CONFIGURATION — TTF Fonts with full Unicode support for ₹
// ─────────────────────────────────────────────────────────────
/**
 * Registers Unicode fonts (Segoe / TTF) on the document so ₹ renders cleanly.
 * Returns font aliases to use with static ₹ symbol.
 */
const setupFonts = (doc) => {
    const possibleFontPaths = [
        {
            reg: path_1.default.join(__dirname, '../assets/fonts/Regular.ttf'),
            bold: path_1.default.join(__dirname, '../assets/fonts/Bold.ttf'),
            ital: path_1.default.join(__dirname, '../assets/fonts/Italic.ttf')
        },
        {
            reg: path_1.default.join(__dirname, '../../src/assets/fonts/Regular.ttf'),
            bold: path_1.default.join(__dirname, '../../src/assets/fonts/Bold.ttf'),
            ital: path_1.default.join(__dirname, '../../src/assets/fonts/Italic.ttf')
        },
        {
            reg: path_1.default.join(process.cwd(), 'src/assets/fonts/Regular.ttf'),
            bold: path_1.default.join(process.cwd(), 'src/assets/fonts/Bold.ttf'),
            ital: path_1.default.join(process.cwd(), 'src/assets/fonts/Italic.ttf')
        },
        {
            reg: path_1.default.join(process.cwd(), 'assets/fonts/Regular.ttf'),
            bold: path_1.default.join(process.cwd(), 'assets/fonts/Bold.ttf'),
            ital: path_1.default.join(process.cwd(), 'assets/fonts/Italic.ttf')
        },
        {
            reg: 'C:/Windows/Fonts/segoeui.ttf',
            bold: 'C:/Windows/Fonts/segoeuib.ttf',
            ital: 'C:/Windows/Fonts/segoeuii.ttf'
        },
        {
            reg: 'C:/Windows/Fonts/arial.ttf',
            bold: 'C:/Windows/Fonts/arialbd.ttf',
            ital: 'C:/Windows/Fonts/ariali.ttf'
        }
    ];
    for (const set of possibleFontPaths) {
        if (fs_1.default.existsSync(set.reg) && fs_1.default.existsSync(set.bold)) {
            try {
                doc.registerFont('Body', set.reg);
                doc.registerFont('Bold', set.bold);
                if (fs_1.default.existsSync(set.ital)) {
                    doc.registerFont('Italic', set.ital);
                }
                else {
                    doc.registerFont('Italic', set.reg);
                }
                return { reg: 'Body', bold: 'Bold', ital: 'Italic', rupee: '₹ ' };
            }
            catch (err) {
                console.warn('[PDF Invoice] Failed registering font set:', err);
            }
        }
    }
    return { reg: 'Helvetica', bold: 'Helvetica-Bold', ital: 'Helvetica-Oblique', rupee: '₹ ' };
};
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
            try {
                payment = await db_1.Payment.findById(paymentId).populate('coupon').lean();
            }
            catch { }
            if (!payment && db_1.dynamicDb?.Payment) {
                try {
                    payment = await db_1.dynamicDb.Payment.findById(paymentId).populate('coupon').lean();
                }
                catch { }
            }
            if (!payment) {
                try {
                    payment = await db_1.Payment.findOne({ $or: [{ _id: paymentId }, { transactionRef: paymentId }] }).populate('coupon').lean();
                }
                catch { }
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
                    companyName: 'Research Analyst Advisory',
                    address: 'India',
                    email: 'support@advisory.com',
                    mobile: '9999999999',
                    sebiRegistration: 'INA000000000'
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
            // Register Unicode fonts — F.reg / F.bold / F.ital / F.rupee used everywhere below
            const F = setupFonts(doc);
            const money = (n) => `${F.rupee}${n.toFixed(2)} /-`;
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            // --- CALCULATE TAXES ---
            const totalAmount = Number(payment.amount || 0);
            const discount = Number(payment.discountApplied || payment.discount || 0);
            const taxableValue = totalAmount / 1.18;
            const totalGst = totalAmount - taxableValue;
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
            let displayTenantState = tenant.state?.trim().toUpperCase() || '';
            if (!displayTenantState || !resolveStateCode(displayTenantState)) {
                const addr = (tenant.address || '').toUpperCase();
                let foundState = '';
                for (const st of Object.keys(stateCodes)) {
                    if (st.length > 2 && addr.includes(st)) {
                        foundState = st;
                        break;
                    }
                }
                displayTenantState = foundState || (displayTenantState && isNaN(Number(displayTenantState)) && !displayTenantState.includes('STREET') && !displayTenantState.includes('ROAD') ? displayTenantState : 'MADHYA PRADESH');
            }
            const normClientState = displayClientState.replace(/[^A-Z]/g, '');
            const normTenantState = displayTenantState.replace(/[^A-Z]/g, '');
            const isIntraState = normClientState === normTenantState && normClientState !== '';
            let cgst = 0, sgst = 0, igst = 0;
            if (isIntraState) {
                cgst = totalGst / 2;
                sgst = totalGst / 2;
            }
            else {
                igst = totalGst;
            }
            const clientStateCode = resolveStateCode(displayClientState);
            const tenantStateCode = resolveStateCode(displayTenantState);
            const clientFullName = (client.name ||
                (client.user ? `${client.user.firstName || ''} ${client.user.lastName || ''}`.trim() : '') ||
                payment.clientName ||
                'Valued Client');
            const clientEmail = client.user?.email || client.email || payment.clientEmail || 'N/A';
            const clientMobile = client.mobile || client.user?.mobile || payment.clientPhone || 'N/A';
            const clientPan = client.pan || client.user?.pan || 'N/A';
            const clientPincode = client.profile?.zipCode || client.zipCode || 'N/A';
            const clientCity = client.profile?.city || client.city || 'N/A';
            const clientAddress = client.profile?.addressLine1
                ? `${client.profile.addressLine1}${client.profile.addressLine2 ? ', ' + client.profile.addressLine2 : ''}`
                : (client.address || 'India');
            // --- INVOICE SEQUENCING & DATES ---
            const year = new Date(payment.createdAt || Date.now()).getFullYear();
            const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
            let paymentCount = 0;
            try {
                paymentCount = await db_1.Payment.countDocuments({
                    tenantId: payment.tenantId,
                    createdAt: {
                        $gte: startOfYear,
                        $lt: payment.createdAt || new Date()
                    }
                });
            }
            catch (err) {
                paymentCount = Math.floor(Math.random() * 800) + 1;
            }
            const sequenceNumber = String(paymentCount + 1).padStart(3, '0');
            const invoiceNo = `INV/${year}/${sequenceNumber}`;
            const invoiceDate = new Date(payment.createdAt || Date.now()).toLocaleDateString('en-GB');
            // ─────────────────────────────────────────────────────────────
            // DRAW INVOICE LAYOUT (Page bounds: X: 30 to 565, Y: 30 to 605)
            // ─────────────────────────────────────────────────────────────
            // 1. Outer Border Box (Total width: 535, Height: 575)
            doc.lineWidth(1).strokeColor('#000000').rect(30, 30, 535, 575).stroke();
            // 2. TOP HEADER (Y: 30 to 100)
            // Render Logo or styled Company Name in top-left
            let logoDrawn = false;
            const logoPath = (0, exports.resolveLogoPath)(tenant.logoUrl) ||
                (0, exports.resolveLogoPath)('/logo-light.png') ||
                (0, exports.resolveLogoPath)('logo-light-full.png') ||
                (0, exports.resolveLogoPath)('logo-light.png');
            if (logoPath) {
                try {
                    doc.image(logoPath, 38, 36, { fit: [180, 56], valign: 'center' });
                    logoDrawn = true;
                }
                catch (imgErr) {
                    console.warn('[PDF Invoice] Failed to render logo image:', imgErr);
                }
            }
            if (!logoDrawn) {
                doc.fontSize(16).font(F.bold).fillColor('#0055AA').text(tenant.companyName || 'Research Analyst Advisory', 38, 48, { width: 215 });
            }
            doc.fillColor('#000000');
            // Right-aligned Company Details (with 10px safe margin before right border at 565)
            doc.fontSize(10).font(F.bold).fillColor('#1E293B').text(tenant.companyName, 260, 36, { width: 295, align: 'right' });
            doc.fontSize(7.5).font(F.reg).fillColor('#334155');
            let rightY = 49;
            if (tenant.address) {
                doc.text(`Address: ${tenant.address}`, 260, rightY, { width: 295, align: 'right' });
                rightY += 10;
            }
            doc.text(`E-Mail: ${tenant.email || 'support@advisory.com'} | Phone: ${tenant.mobile || 'N/A'}`, 260, rightY, { width: 295, align: 'right' });
            rightY += 10;
            if (tenant.website) {
                doc.text(`Website: ${tenant.website}`, 260, rightY, { width: 295, align: 'right' });
                rightY += 10;
            }
            if (tenant.sebiRegistration) {
                doc.text(`SEBI Reg. No: ${tenant.sebiRegistration}`, 260, rightY, { width: 295, align: 'right' });
            }
            doc.fillColor('#000000');
            // 3. GSTIN BAR (Y: 100 to 118)
            doc.rect(30, 100, 535, 18).fillColor('#F8FAFC').fillAndStroke('#F8FAFC', '#000000');
            doc.fontSize(9).font(F.bold).fillColor('#000000').text(tenant.gst ? `GSTIN: ${tenant.gst}` : (tenant.sebiRegistration ? `SEBI REG NO: ${tenant.sebiRegistration}` : 'TAX INVOICE'), 30, 105, { align: 'center', width: 535 });
            // 4. TAX INVOICE TITLE BAR (Y: 118 to 136)
            doc.rect(30, 118, 535, 18).fillColor('#F1F5F9').fillAndStroke('#F1F5F9', '#000000');
            doc.fontSize(10).font(F.bold).fillColor('#000000').text('Tax Invoice', 30, 122, { align: 'center', width: 535 });
            doc.moveTo(30, 136).lineTo(565, 136).stroke();
            // 5. INVOICE METADATA GRID (Y: 136 to 196)
            doc.moveTo(300, 136).lineTo(300, 196).stroke();
            // Row 1 (Y: 136 to 156)
            doc.fontSize(8.5).font(F.bold).fillColor('#000000').text('Invoice No: ', 35, 141, { continued: true }).font(F.reg).text(invoiceNo);
            doc.font(F.bold).text('Invoice Date: ', 305, 141, { continued: true }).font(F.reg).text(invoiceDate);
            doc.moveTo(30, 156).lineTo(565, 156).stroke();
            // Row 2 (Y: 156 to 176)
            doc.font(F.bold).text('Reverse Charge (Y/N): ', 35, 161, { continued: true }).font(F.reg).text('N');
            doc.font(F.bold).text('SAC Code: ', 305, 161, { continued: true }).font(F.reg).text('997156 (Financial Advisory Services)');
            doc.moveTo(30, 176).lineTo(565, 176).stroke();
            // Row 3 (Y: 176 to 196)
            doc.font(F.bold).text('State (Place of Supply): ', 35, 181, { continued: true }).font(F.reg).text(displayTenantState);
            doc.font(F.bold).text('State Code: ', 305, 181, { continued: true }).font(F.reg).text(tenantStateCode || 'N/A');
            doc.moveTo(30, 196).lineTo(565, 196).stroke();
            // 6. BILL TO PARTY HEADER (Y: 196 to 214)
            doc.rect(30, 196, 535, 18).fillColor('#F1F5F9').fillAndStroke('#F1F5F9', '#000000');
            doc.fontSize(9.5).font(F.bold).fillColor('#000000').text('Bill to Party (Client Details)', 30, 200, { align: 'center', width: 535 });
            doc.moveTo(30, 214).lineTo(565, 214).stroke();
            // 7. CLIENT DETAILS GRID (Y: 214 to 286, 3 rows)
            doc.moveTo(300, 214).lineTo(300, 286).stroke();
            // Row 1 (Y: 214 to 238)
            doc.fontSize(8.5).font(F.bold).fillColor('#000000').text('Client Name: ', 35, 220, { continued: true }).font(F.reg).text(clientFullName, { width: 260 });
            doc.font(F.bold).text('Mobile No: ', 305, 220, { continued: true }).font(F.reg).text(clientMobile);
            doc.moveTo(30, 238).lineTo(565, 238).stroke();
            // Row 2 (Y: 238 to 262)
            doc.font(F.bold).text('Address: ', 35, 244, { continued: true }).font(F.reg).text(clientAddress, { width: 260 });
            doc.font(F.bold).text('Pincode: ', 305, 244, { continued: true }).font(F.reg).text(clientPincode);
            doc.moveTo(30, 262).lineTo(565, 262).stroke();
            // Row 3 (Y: 262 to 286)
            doc.font(F.bold).text('City: ', 35, 268, { continued: true }).font(F.reg).text(clientCity, { width: 125 });
            doc.font(F.bold).text('State: ', 165, 268, { continued: true }).font(F.reg).text(displayClientState, { width: 130 });
            doc.font(F.bold).text('State Code: ', 305, 268, { continued: true }).font(F.reg).text(clientStateCode || 'N/A', { width: 110 });
            doc.font(F.bold).text('PAN: ', 420, 268, { continued: true }).font(F.reg).text(clientPan, { width: 140 });
            doc.moveTo(30, 286).lineTo(565, 286).stroke();
            // 8. ITEM TABLE HEADER (Y: 286 to 310)
            doc.rect(30, 286, 535, 24).fillColor('#F1F5F9').fillAndStroke('#F1F5F9', '#000000');
            doc.fontSize(8.5).font(F.bold).fillColor('#000000');
            doc.text('S. No.', 30, 294, { width: 35, align: 'center' });
            doc.text('Product / Service Description', 65, 294, { width: 155, align: 'center' });
            doc.text('Durations', 220, 294, { width: 125, align: 'center' });
            doc.text('Received\nAmount', 345, 288, { width: 65, align: 'center' });
            doc.text('Discount', 410, 294, { width: 60, align: 'center' });
            doc.text('Taxable\nValue', 470, 288, { width: 95, align: 'center' });
            doc.moveTo(30, 310).lineTo(565, 310).stroke();
            // 9. ITEM TABLE ROW (Y: 310 to 365)
            const colDividers = [65, 220, 345, 410, 470];
            colDividers.forEach(x => {
                doc.moveTo(x, 286).lineTo(x, 365).stroke();
            });
            doc.font(F.reg).fontSize(8.5);
            doc.text('1', 30, 325, { width: 35, align: 'center' });
            // Product Name & Coupon
            doc.font(F.bold).text(planName, 68, 320, { width: 148, align: 'center' });
            if (payment.coupon) {
                doc.font(F.reg).fontSize(7).text(`(Coupon: ${payment.coupon.code})`, 68, 334, { width: 148, align: 'center' });
            }
            doc.fontSize(8.5).font(F.reg);
            // Durations
            const startDate = invoiceDate;
            const endDate = new Date(Date.now() + (payment.planValidityDays || 30) * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
            doc.text(`Services From :-\n${startDate} To : ${endDate}`, 222, 320, { width: 121, align: 'center' });
            doc.text(money(totalAmount), 345, 325, { width: 65, align: 'center' });
            doc.text(discount > 0 ? `${F.rupee}${discount.toFixed(2)}` : '-', 410, 325, { width: 60, align: 'center' });
            doc.text(money(taxableValue), 470, 325, { width: 95, align: 'center' });
            doc.moveTo(30, 365).lineTo(565, 365).stroke();
            // 10. TOTALS & GST BREAKDOWN (Y: 365 to 475)
            doc.moveTo(345, 365).lineTo(345, 475).stroke();
            doc.moveTo(470, 365).lineTo(470, 475).stroke();
            // Left Box: Amount in words & Bank Info
            doc.fontSize(8.5).font(F.bold).fillColor('#000000').text('Total Invoice amount in words:', 35, 370, { width: 305 });
            doc.fontSize(8).font(F.ital).fillColor('#1E293B').text(numberToWords(Math.round(totalAmount)), 35, 383, { width: 305 });
            doc.moveTo(30, 412).lineTo(345, 412).stroke();
            doc.fontSize(8).font(F.bold).fillColor('#000000').text('Payment & Settlement Details:', 35, 417);
            doc.font(F.reg).fontSize(7.5).fillColor('#334155');
            doc.text(`Status: COMPLETED (PAID) | Mode: Online / Gateway`, 35, 429);
            if (payment.transactionRef)
                doc.text(`Txn Ref: ${payment.transactionRef}`, 35, 439, { width: 305 });
            if (tenant.bankName || tenant.bankAccountNo) {
                doc.text(`Bank: ${tenant.bankName || 'N/A'} | A/C: ${tenant.bankAccountNo || 'N/A'} | IFSC: ${tenant.bankIfsc || 'N/A'}`, 35, 449, { width: 305 });
            }
            doc.text('GST on Reverse Charge: No', 35, 460);
            // Right Box: Tax Rows
            doc.fillColor('#000000');
            // Row 1: Taxable Value
            doc.fontSize(8).font(F.bold).text('Taxable Value', 350, 372, { width: 115 });
            doc.font(F.reg).text(money(taxableValue), 475, 372, { width: 85, align: 'right' });
            doc.moveTo(345, 387).lineTo(565, 387).stroke();
            // Row 2: CGST or IGST
            if (isIntraState) {
                doc.font(F.bold).text('Add: CGST (9%)', 350, 394, { width: 115 });
                doc.font(F.reg).text(money(cgst), 475, 394, { width: 85, align: 'right' });
            }
            else {
                doc.font(F.bold).text('Add: IGST (18%)', 350, 394, { width: 115 });
                doc.font(F.reg).text(money(igst), 475, 394, { width: 85, align: 'right' });
            }
            doc.moveTo(345, 409).lineTo(565, 409).stroke();
            // Row 3: SGST or Intra/Inter balance
            if (isIntraState) {
                doc.font(F.bold).text('Add: SGST (9%)', 350, 416, { width: 115 });
                doc.font(F.reg).text(money(sgst), 475, 416, { width: 85, align: 'right' });
            }
            else {
                doc.font(F.bold).text('Add: CGST / SGST', 350, 416, { width: 115 });
                doc.font(F.reg).text(money(0), 475, 416, { width: 85, align: 'right' });
            }
            doc.moveTo(345, 431).lineTo(565, 431).stroke();
            // Row 4: Total GST Amount
            doc.font(F.bold).text('Total GST Amount', 350, 438, { width: 115 });
            doc.font(F.reg).text(money(totalGst), 475, 438, { width: 85, align: 'right' });
            doc.moveTo(345, 453).lineTo(565, 453).stroke();
            // Row 5: Total Amount After Tax (Highlighted)
            doc.rect(345, 453, 220, 22).fillColor('#F1F5F9').fillAndStroke('#F1F5F9', '#000000');
            doc.fontSize(8.5).font(F.bold).fillColor('#000000').text('Total Amount (INR)', 350, 459, { width: 115 });
            doc.text(money(totalAmount), 475, 459, { width: 85, align: 'right' });
            doc.moveTo(30, 475).lineTo(565, 475).stroke();
            // 11. TERMS & CONDITIONS (Y: 475 to 585)
            doc.rect(30, 475, 535, 18).fillColor('#F8FAFC').fillAndStroke('#F8FAFC', '#000000');
            doc.fontSize(8.5).font(F.bold).fillColor('#000000').text('Terms & Conditions & Statutory Disclaimers', 30, 480, { align: 'center', width: 535 });
            doc.moveTo(30, 493).lineTo(565, 493).stroke();
            doc.fontSize(6.5).font(F.reg).fillColor('#334155');
            const terms = [
                '• This is a Computer Generated Invoice. No Signature or Stamp is required.',
                '• 1. Investments in securities market are subject to market risks. Read all related documents carefully before investing.',
                '• 2. Registration granted by SEBI, BASL membership and NISM certification in no way guarantee performance of intermediary or assure returns.',
                '• 3. Research services are provided in accordance with the SEBI (Research Analysts) Regulations, 2014.',
                '• 4. Advisory fees once paid are non-refundable according to the agreed service terms and policies.',
                `• 5. For queries regarding this invoice, contact Compliance Desk at: ${tenant.email || 'support@advisory.com'} | Phone: ${tenant.mobile || 'N/A'}`,
                `• 6. Detailed disclaimers and refund policies are available at: ${tenant.website || 'Our Official Portal'}`
            ];
            let termY = 498;
            for (const line of terms) {
                doc.text(line, 35, termY, { width: 525 });
                termY += 11;
            }
            // 12. FOOTER (Y: 585 to 605)
            doc.rect(30, 585, 535, 20).fillColor('#F1F5F9').fillAndStroke('#F1F5F9', '#000000');
            doc.fontSize(8).font(F.bold).fillColor('#000000').text('*Original For Recipient', 30, 591, { align: 'center', width: 535 });
            doc.end();
        }
        catch (error) {
            console.error('PDF Generation Error:', error);
            reject(error);
        }
    });
};
exports.generateInvoicePdf = generateInvoicePdf;
