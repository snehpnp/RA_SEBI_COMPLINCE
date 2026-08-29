"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Helper to convert number to words (simple version for INR)
function numberToWords(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if ((num = num.toString().replace(/[\, ]/g, '')) != parseFloat(num))
        return 'not a number';
    let n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
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
const generateInvoicePdf = async (paymentId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
                include: { coupon: true }
            });
            if (!payment) {
                return reject(new Error('Payment not found'));
            }
            const client = await prisma.client.findUnique({
                where: { id: payment.clientId },
                include: { user: true, profile: true }
            });
            if (!client) {
                return reject(new Error('Client not found'));
            }
            const tenant = await prisma.tenant.findUnique({
                where: { id: payment.tenantId }
            });
            if (!tenant) {
                return reject(new Error('Tenant not found'));
            }
            let planName = 'Custom Plan';
            if (payment.planId) {
                const plan = await prisma.plan.findUnique({ where: { id: payment.planId } });
                if (plan)
                    planName = plan.name;
            }
            const doc = new pdfkit_1.default({ margin: 30, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            // --- CALCULATE TAXES ---
            // Assuming payment.amount is inclusive of 18% GST
            const totalAmount = payment.amount;
            const discount = payment.discountApplied || 0;
            const taxableValue = totalAmount / 1.18;
            const totalGst = totalAmount - taxableValue;
            const baseProductPrice = taxableValue + discount;
            const stateCodes = {
                'JAMMU AND KASHMIR': '01', 'HIMACHAL PRADESH': '02', 'PUNJAB': '03', 'CHANDIGARH': '04', 'UTTARAKHAND': '05',
                'HARYANA': '06', 'DELHI': '07', 'RAJASTHAN': '08', 'UTTAR PRADESH': '09', 'BIHAR': '10', 'SIKKIM': '11',
                'ARUNACHAL PRADESH': '12', 'NAGALAND': '13', 'MANIPUR': '14', 'MIZORAM': '15', 'TRIPURA': '16', 'MEGHALAYA': '17',
                'ASSAM': '18', 'WEST BENGAL': '19', 'JHARKHAND': '20', 'ODISHA': '21', 'CHHATTISGARH': '22', 'MADHYA PRADESH': '23',
                'GUJARAT': '24', 'DAMAN AND DIU': '25', 'DADRA AND NAGAR HAVELI': '26', 'MAHARASHTRA': '27', 'KARNATAKA': '29',
                'GOA': '30', 'LAKSHADWEEP': '31', 'KERALA': '32', 'TAMIL NADU': '33', 'PUDUCHERRY': '34', 'ANDAMAN AND NICOBAR ISLANDS': '35',
                'TELANGANA': '36', 'ANDHRA PRADESH': '37', 'LADAKH': '38'
            };
            // Raw states for display
            let displayClientState = client.profile?.state?.trim().toUpperCase() || 'UNKNOWN';
            let displayTenantState = tenant.state ? tenant.state.trim().toUpperCase() : (tenant.address?.split(',').pop()?.trim().toUpperCase() || 'UNKNOWN');
            // Normalized states for matching GST/IGST (removes all spaces)
            const normClientState = displayClientState.replace(/\s+/g, '');
            const normTenantState = displayTenantState.replace(/\s+/g, '');
            let cgst = 0, sgst = 0, igst = 0;
            if (normClientState === normTenantState && normClientState !== 'UNKNOWN') {
                cgst = totalGst / 2;
                sgst = totalGst / 2;
            }
            else {
                igst = totalGst;
            }
            // --- HEADER ---
            doc.rect(30, 30, 535, 750).stroke(); // Main Border
            // Company Info (Right aligned)
            doc.fontSize(12).font('Helvetica-Bold').text(tenant.companyName, 300, 40, { align: 'right' });
            doc.fontSize(8).font('Helvetica').text(`Address: ${tenant.address}`, 300, 55, { align: 'right' });
            doc.text(`E-Mail: ${tenant.email}`, 300, 65, { align: 'right' });
            doc.text(`Phone: ${tenant.mobile}`, 300, 75, { align: 'right' });
            if (tenant.website)
                doc.text(`Website: ${tenant.website}`, 300, 85, { align: 'right' });
            // Logo/Company name (Left aligned)
            doc.fontSize(20).font('Helvetica-Bold').fillColor('#0055AA').text(tenant.companyName, 40, 50, { width: 250 });
            doc.fillColor('black'); // reset color
            // --- SUBHEADER ---
            doc.moveTo(30, 100).lineTo(565, 100).stroke();
            doc.fontSize(9).font('Helvetica-Bold').text(tenant.gst ? `GSTIN ${tenant.gst}` : '', 30, 105, { align: 'center', width: 535 });
            doc.moveTo(30, 118).lineTo(565, 118).stroke();
            doc.text('Tax Invoice', 30, 122, { align: 'center', width: 535 });
            doc.moveTo(30, 135).lineTo(565, 135).stroke();
            // --- INVOICE DETAILS ---
            const year = new Date(payment.createdAt).getFullYear();
            const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
            const paymentCount = await prisma.payment.count({
                where: {
                    tenantId: payment.tenantId,
                    createdAt: {
                        gte: startOfYear,
                        lt: payment.createdAt
                    }
                }
            });
            const seqNo = String(paymentCount + 1).padStart(3, '0');
            const invoiceNo = `INV/${year}/${seqNo}`;
            const invoiceDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
            doc.fontSize(9).font('Helvetica-Bold').text('Invoice No: ', 35, 140, { continued: true }).font('Helvetica').text(invoiceNo);
            doc.moveTo(30, 153).lineTo(565, 153).stroke();
            doc.font('Helvetica-Bold').text('Invoice date: ', 35, 158, { continued: true }).font('Helvetica').text(invoiceDate);
            doc.moveTo(30, 171).lineTo(565, 171).stroke();
            doc.text('Reverse Charge (Y/N)', 35, 176);
            doc.moveTo(300, 171).lineTo(300, 207).stroke(); // vertical line
            doc.text('N', 305, 176);
            doc.moveTo(30, 189).lineTo(565, 189).stroke();
            doc.text(`State: ${displayTenantState}`, 35, 194);
            doc.text(`State Code: ${stateCodes[displayTenantState.replace(/\s+/g, '')] || ''}`, 305, 194);
            doc.moveTo(30, 207).lineTo(565, 207).stroke();
            doc.font('Helvetica-Bold').text('SAC CODE: 997156', 35, 212); // Standard for financial services
            doc.moveTo(30, 225).lineTo(565, 225).stroke();
            doc.text('Bill to Party', 30, 230, { align: 'center', width: 535 });
            doc.moveTo(30, 243).lineTo(565, 243).stroke();
            // --- CLIENT DETAILS ---
            const clientAddress = client.profile ? `${client.profile.addressLine1 || ''}, ${client.profile.city || ''}, ${client.profile.state || ''}` : 'N/A';
            doc.font('Helvetica').text(`Client Name: ${client.user.firstName} ${client.user.lastName}`, 35, 248, { width: 260 });
            doc.moveTo(300, 243).lineTo(300, 315).stroke(); // vertical line
            doc.text(`Mobile no: ${client.mobile}`, 305, 248);
            doc.moveTo(30, 261).lineTo(565, 261).stroke();
            doc.text(`Address: ${clientAddress}`, 35, 266, { width: 260 });
            doc.text(`Pincode: ${client.profile?.zipCode || 'N/A'}`, 305, 266);
            // city state 
            doc.text(`City: ${client.profile?.city || 'N/A'}`, 35, 286, { continued: true }).text(`          State: ${displayClientState}`);
            doc.text(`State Code: ${stateCodes[displayClientState.replace(/\s+/g, '')] || ''}`, 305, 286);
            doc.moveTo(30, 298).lineTo(565, 298).stroke();
            doc.text(`Email: ${client.user.email}`, 35, 303, { width: 260 });
            doc.text(`PAN: ${client.pan}`, 305, 303);
            doc.moveTo(30, 315).lineTo(565, 315).stroke();
            // --- LINE ITEMS ---
            doc.font('Helvetica-Bold');
            doc.text('S. No.', 35, 320, { width: 40, align: 'center' });
            doc.text('Product', 80, 320, { width: 140, align: 'center' });
            doc.text('Durations', 225, 320, { width: 120, align: 'center' });
            doc.text('Received\nAmount', 350, 320, { width: 60, align: 'center' });
            doc.text('Discount', 415, 320, { width: 60, align: 'center' });
            doc.text('Taxable\nValues', 480, 320, { width: 80, align: 'center' });
            doc.moveTo(30, 345).lineTo(565, 345).stroke();
            // vertical lines for table
            const xPositions = [75, 220, 345, 410, 475];
            xPositions.forEach(x => {
                doc.moveTo(x, 315).lineTo(x, 400).stroke();
            });
            doc.font('Helvetica').fontSize(8);
            doc.text('1', 35, 355, { width: 40, align: 'center' });
            doc.text(planName, 80, 355, { width: 140, align: 'center' });
            if (payment.coupon)
                doc.fontSize(7).text(`(Coupon: ${payment.coupon.code})`, 80, 375, { width: 140, align: 'center' });
            doc.fontSize(8);
            const startDate = invoiceDate;
            const endDate = new Date(Date.now() + (payment.planValidityDays || 30) * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
            doc.text(`Services From :-\n${startDate} To : ${endDate}`, 225, 355, { width: 120, align: 'center' });
            doc.text(`${totalAmount.toFixed(2)} /-`, 350, 360, { width: 60, align: 'center' });
            doc.text(discount > 0 ? `${discount.toFixed(2)}` : '-', 415, 360, { width: 60, align: 'center' });
            doc.text(`${taxableValue.toFixed(2)} /-`, 480, 360, { width: 80, align: 'center' });
            doc.moveTo(30, 400).lineTo(565, 400).stroke();
            // --- TOTALS ---
            doc.font('Helvetica-Bold');
            doc.text(`Total Invoice amount in words: ${numberToWords(Math.round(totalAmount))}`, 35, 405, { width: 300 });
            // Totals Box
            doc.moveTo(345, 400).lineTo(345, 490).stroke();
            doc.moveTo(475, 400).lineTo(475, 490).stroke();
            doc.text('Add: CGST(9%)', 350, 405, { width: 120 });
            doc.font('Helvetica').text(`${cgst.toFixed(2)} /-`, 480, 405, { width: 80, align: 'right' });
            doc.moveTo(345, 418).lineTo(565, 418).stroke();
            doc.font('Helvetica-Bold').text('Add: SGST(9%)', 350, 423, { width: 120 });
            doc.font('Helvetica').text(`${sgst.toFixed(2)} /-`, 480, 423, { width: 80, align: 'right' });
            doc.moveTo(345, 436).lineTo(565, 436).stroke();
            doc.font('Helvetica-Bold').text('Add: IGST(18%)', 350, 441, { width: 120 });
            doc.font('Helvetica').text(`${igst.toFixed(2)} /-`, 480, 441, { width: 80, align: 'right' });
            doc.moveTo(345, 454).lineTo(565, 454).stroke();
            doc.font('Helvetica-Bold').text('Total Amount GST', 350, 459, { width: 120 });
            doc.text(`${totalGst.toFixed(2)} /-`, 480, 459, { width: 80, align: 'right' });
            doc.moveTo(345, 472).lineTo(565, 472).stroke();
            doc.text('Total Amount after Tax', 350, 477, { width: 120 });
            doc.text(`${totalAmount.toFixed(2)} /-`, 480, 477, { width: 80, align: 'right' });
            doc.moveTo(30, 490).lineTo(565, 490).stroke();
            doc.text('Remark', 180, 495);
            doc.moveTo(345, 490).lineTo(345, 508).stroke();
            doc.text('GST on Reverse Charge', 350, 495);
            doc.moveTo(30, 508).lineTo(565, 508).stroke();
            // --- TERMS & CONDITIONS ---
            doc.text('Terms & conditions', 30, 513, { align: 'center', width: 535 });
            doc.fontSize(6).font('Helvetica').text(`This is Computer Generated Invoice No Need Any Sign. & Stamp.
1. Investments in securities market are subject to market risks. Read all the related documents carefully before investing.
2. Registration granted by SEBI, Membership of BASL and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.
3. Never Trade Without Stop Loss.
4. Please read all terms and conditions carefully on our website: ${tenant.website || 'N/A'}
5. If you have any queries concerning this invoice Contact us at : E-Mail: ${tenant.email} Phone: ${tenant.mobile}`, 35, 528);
            doc.moveTo(30, 570).lineTo(565, 570).stroke();
            doc.fontSize(8).font('Helvetica-Bold').text('*Original For Recipient', 30, 575, { align: 'center', width: 535 });
            doc.end();
        }
        catch (error) {
            console.error("PDF Generation Error:", error);
            reject(error);
        }
    });
};
exports.generateInvoicePdf = generateInvoicePdf;
