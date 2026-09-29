"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDscSignedReport = exports.useDailyAadhaarSign = exports.completeReportAadhaarEsign = exports.initiateReportAadhaarEsign = exports.uploadResearcherSignature = exports.updateSignatureSettings = exports.getSignatureSettings = exports.stampAadhaarSealOnPdf = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("../config/db"));
const digioService_1 = require("../services/digioService");
const pdf_lib_1 = require("pdf-lib");
const notificationService_1 = require("../services/notificationService");
// Helper to format today's date in IST (YYYY-MM-DD)
const getTodayIST = () => {
    const d = new Date();
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};
// Helper to stamp verified Aadhaar seal on PDF
const stampAadhaarSealOnPdf = async (pdfBuffer, signerName, aadhaarLast4, verifiedDate, currentTimestamp, signScope = 'ALL_PAGES', placement = 'BOTTOM_RIGHT') => {
    const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
    const helveticaFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const pagesToStamp = signScope === 'LAST_PAGE' ? [pages[pages.length - 1]] : pages;
    const istDateString = currentTimestamp.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    const boxWidth = 175;
    const boxHeight = 44;
    for (const page of pagesToStamp) {
        const { width, height } = page.getSize();
        let x = width - boxWidth - 25; // default BOTTOM_RIGHT
        if (placement === 'BOTTOM_CENTER') {
            x = (width - boxWidth) / 2;
        }
        else if (placement === 'BOTTOM_LEFT') {
            x = 25;
        }
        const y = 18;
        // Draw background box
        page.drawRectangle({
            x,
            y,
            width: boxWidth,
            height: boxHeight,
            color: (0, pdf_lib_1.rgb)(0.96, 0.99, 0.97),
            borderColor: (0, pdf_lib_1.rgb)(0.12, 0.63, 0.32),
            borderWidth: 1.2,
        });
        // Draw top badge / header bar
        page.drawRectangle({
            x,
            y: y + boxHeight - 12,
            width: boxWidth,
            height: 12,
            color: (0, pdf_lib_1.rgb)(0.12, 0.63, 0.32),
        });
        // Header label
        page.drawText('VERIFIED AADHAAR eSIGN', {
            x: x + 8,
            y: y + boxHeight - 9,
            size: 6.5,
            font: helveticaBold,
            color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        // Signer Name
        page.drawText(`Signer: ${signerName}`, {
            x: x + 8,
            y: y + 21,
            size: 7,
            font: helveticaBold,
            color: (0, pdf_lib_1.rgb)(0.08, 0.15, 0.1),
        });
        // Aadhaar number + verified date
        page.drawText(`Aadhaar: XXXX-XXXX-${aadhaarLast4}  (Session: ${verifiedDate})`, {
            x: x + 8,
            y: y + 12,
            size: 5.8,
            font: helveticaFont,
            color: (0, pdf_lib_1.rgb)(0.2, 0.3, 0.25),
        });
        // Current report timestamp
        page.drawText(`Report Generated: ${istDateString}`, {
            x: x + 8,
            y: y + 4,
            size: 5.5,
            font: helveticaFont,
            color: (0, pdf_lib_1.rgb)(0.25, 0.35, 0.28),
        });
    }
    const modifiedBytes = await pdfDoc.save();
    return Buffer.from(modifiedBytes);
};
exports.stampAadhaarSealOnPdf = stampAadhaarSealOnPdf;
// 1. GET SIGNATURE SETTINGS (User-specific)
const getSignatureSettings = async (req, res) => {
    try {
        const userPayload = req.user;
        const userId = userPayload.id || userPayload._id;
        const tenantId = userPayload.tenantId;
        const user = await db_1.default.User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const tenant = await db_1.default.Tenant.findById(tenantId).lean() || await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
        const todayIST = getTodayIST();
        const dailySign = user.dailyAadhaarSignature;
        const hasValidDailySign = !!(dailySign && dailySign.date === todayIST && dailySign.signerName);
        return res.json({
            success: true,
            data: {
                signatureMode: user.signatureMode || 'UPLOAD_SIGN',
                signatureUrl: user.signatureUrl || null,
                tenantSignatureUrl: tenant?.coSignatureUrl || null,
                dailyAadhaarSignature: {
                    hasValidDailySign,
                    date: dailySign?.date || null,
                    verifiedAt: dailySign?.verifiedAt || null,
                    signerName: dailySign?.signerName || null,
                    aadhaarLast4: dailySign?.aadhaarLast4 || null,
                    documentId: dailySign?.documentId || null
                },
                dscSettings: user.dscSettings || {
                    placement: 'BOTTOM_RIGHT',
                    signScope: 'ALL_PAGES'
                },
                user: {
                    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Researcher',
                    email: user.email,
                    mobile: user.mobile
                }
            }
        });
    }
    catch (err) {
        console.error('Error fetching signature settings:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};
exports.getSignatureSettings = getSignatureSettings;
// 2. UPDATE SIGNATURE SETTINGS (User-specific)
const updateSignatureSettings = async (req, res) => {
    try {
        const userPayload = req.user;
        const userId = userPayload.id || userPayload._id;
        const { signatureMode, dscSettings, signatureUrl } = req.body;
        const updates = {};
        if (signatureMode && ['UPLOAD_SIGN', 'AADHAAR_ESIGN', 'DSC_TOKEN'].includes(signatureMode)) {
            updates.signatureMode = signatureMode;
        }
        if (dscSettings && typeof dscSettings === 'object') {
            updates.dscSettings = {
                placement: dscSettings.placement || 'BOTTOM_RIGHT',
                signScope: dscSettings.signScope || 'ALL_PAGES',
                registeredCertSerial: dscSettings.registeredCertSerial || null
            };
        }
        if (signatureUrl !== undefined) {
            updates.signatureUrl = signatureUrl;
        }
        const updatedUser = await db_1.default.User.findByIdAndUpdate(userId, { $set: updates }, { returnDocument: 'after', lean: true });
        return res.json({
            success: true,
            message: 'Signature settings updated successfully',
            data: {
                signatureMode: updatedUser?.signatureMode,
                dscSettings: updatedUser?.dscSettings,
                signatureUrl: updatedUser?.signatureUrl
            }
        });
    }
    catch (err) {
        console.error('Error updating signature settings:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};
exports.updateSignatureSettings = updateSignatureSettings;
// 3. UPLOAD RESEARCHER PERSONAL SIGNATURE
const uploadResearcherSignature = async (req, res) => {
    try {
        const userPayload = req.user;
        const userId = userPayload.id || userPayload._id;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No signature file provided' });
        }
        const folder = req.file.destination ? path_1.default.basename(req.file.destination) : 'signatures';
        const signatureUrl = `/uploads/${folder}/${req.file.filename}`;
        const updatedUser = await db_1.default.User.findByIdAndUpdate(userId, { $set: { signatureUrl } }, { returnDocument: 'after', lean: true });
        return res.json({
            success: true,
            message: 'Signature uploaded successfully',
            data: {
                signatureUrl: updatedUser?.signatureUrl
            }
        });
    }
    catch (err) {
        console.error('Error uploading signature:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};
exports.uploadResearcherSignature = uploadResearcherSignature;
// 4. INITIATE REPORT AADHAAR ESIGN (Digio Gateway)
const initiateReportAadhaarEsign = async (req, res) => {
    try {
        const userPayload = req.user;
        const userId = userPayload.id || userPayload._id;
        const tenantId = userPayload.tenantId;
        const { signalId } = req.body;
        const file = req.file;
        const pdfBuffer = file?.buffer || (file?.path ? fs_1.default.readFileSync(file.path) : null);
        if (!pdfBuffer) {
            return res.status(400).json({ success: false, message: 'Report PDF buffer could not be read' });
        }
        const user = await db_1.default.User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const tenant = await db_1.default.Tenant.findById(tenantId).lean() || await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
        if (!tenant?.digioClientId || !tenant?.digioClientSecret) {
            return res.status(400).json({
                success: false,
                message: 'Digio credentials not configured for this tenant. Please configure them in Admin Settings.'
            });
        }
        const signal = await db_1.default.Signal.findById(signalId).populate('stockId').lean();
        const stockSymbol = signal?.stockId?.symbol || 'Signal';
        const fileName = `Research_Report_${stockSymbol}_${Date.now()}.pdf`;
        const signerIdentifier = user.email || user.mobile;
        // Do NOT pass profile name (e.g. Rahul Verma) so Digio does not pre-fill or enforce an unverified profile name.
        // Omit signerName so Digio prompts the signer to verify via Aadhaar OTP, and UIDAI returns the legal verified name.
        const digioResponse = await (0, digioService_1.createDocumentForEsign)(tenant.digioClientId, tenant.digioClientSecret, pdfBuffer, fileName, signerIdentifier, undefined, tenant.digioEnvironment || undefined);
        const tokenId = digioResponse?.tokenId || digioResponse?.access_token?.id || digioResponse?.token_id || null;
        const isSandbox = (tenant.digioEnvironment || '').toUpperCase() === 'SANDBOX' || (tenant.digioEnvironment || '').toUpperCase() === 'UAT';
        return res.json({
            success: true,
            data: digioResponse,
            documentId: digioResponse?.id,
            tokenId,
            signerName: null,
            signerIdentifier,
            environment: isSandbox ? 'sandbox' : 'production'
        });
    }
    catch (err) {
        console.error('Error initiating report Aadhaar eSign:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};
exports.initiateReportAadhaarEsign = initiateReportAadhaarEsign;
// 5. COMPLETE REPORT AADHAAR ESIGN (Verify & Save Signed PDF + Cache Daily Sign)
const completeReportAadhaarEsign = async (req, res) => {
    try {
        const userPayload = req.user;
        const userId = userPayload.id || userPayload._id;
        const tenantId = userPayload.tenantId;
        const { documentId, signalId } = req.body;
        if (!documentId || !signalId) {
            return res.status(400).json({ success: false, message: 'documentId and signalId are required' });
        }
        const tenant = await db_1.default.Tenant.findById(tenantId).lean() || await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
        if (!tenant?.digioClientId || !tenant?.digioClientSecret) {
            return res.status(400).json({ success: false, message: 'Digio credentials not configured' });
        }
        // 1. Fetch document status from Digio
        const docStatus = await (0, digioService_1.getDocumentStatus)(tenant.digioClientId, tenant.digioClientSecret, documentId, tenant.digioEnvironment || undefined);
        if (!docStatus) {
            return res.status(400).json({ success: false, message: 'Could not fetch document status from Digio' });
        }
        const statusStr = (docStatus.agreement_status || docStatus.status || '').toLowerCase();
        if (statusStr !== 'signed' && statusStr !== 'completed') {
            return res.status(400).json({
                success: false,
                message: `Document not signed yet. Current status: ${docStatus.status || docStatus.agreement_status}`
            });
        }
        // 2. Download signed PDF buffer from Digio
        const signedPdfBuffer = await (0, digioService_1.downloadDocument)(tenant.digioClientId, tenant.digioClientSecret, documentId, tenant.digioEnvironment || undefined);
        if (!signedPdfBuffer) {
            return res.status(500).json({ success: false, message: 'Failed to download signed document from Digio' });
        }
        // 3. Extract Aadhaar details for daily re-use
        const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(docStatus);
        const user = await db_1.default.User.findById(userId).lean();
        // Strict priority: Use the legal verified name from Aadhaar (UIDAI PKI)
        const verifiedAadhaarName = extracted?.aadhaarName;
        const signerName = verifiedAadhaarName || user?.email || 'Research Analyst';
        const aadhaarLast4 = extracted?.maskedAadhaar ? extracted.maskedAadhaar.slice(-4) : 'XXXX';
        const todayIST = getTodayIST();
        // 4. Cache daily Aadhaar session on user AND sync profile name with verified Aadhaar name
        const userUpdates = {
            dailyAadhaarSignature: {
                date: todayIST,
                verifiedAt: new Date(),
                signerName,
                aadhaarLast4,
                documentId
            }
        };
        if (verifiedAadhaarName) {
            const parts = verifiedAadhaarName.split(' ');
            userUpdates.firstName = parts[0] || '';
            userUpdates.lastName = parts.slice(1).join(' ') || '';
        }
        await db_1.default.User.findByIdAndUpdate(userId, { $set: userUpdates });
        // 5. Save the signed PDF to uploads/research/
        const signal = await db_1.default.Signal.findById(signalId).populate('stockId').lean();
        const stockSymbol = signal?.stockId?.symbol || 'Signal';
        const finalFileName = `Research_Report_${stockSymbol}_Signed_${Date.now()}.pdf`;
        const targetDir = path_1.default.join(process.cwd(), 'uploads', 'research');
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
        }
        const filePath = path_1.default.join(targetDir, finalFileName);
        fs_1.default.writeFileSync(filePath, signedPdfBuffer);
        const reportUrl = `/uploads/research/${finalFileName}`;
        // 6. Update Signal record
        const updatedSignal = await db_1.default.Signal.findByIdAndUpdate(signalId, {
            $set: {
                reportUrl,
                signatureMode: 'AADHAAR_ESIGN',
                signatureMeta: {
                    method: 'AADHAAR_DIGIO',
                    documentId,
                    signedAt: new Date(),
                    signerName,
                    aadhaarLast4
                }
            }
        }, { returnDocument: 'after', lean: true });
        // Broadcast report notification to subscribers and Admin
        try {
            if (signal?.planId) {
                await (0, notificationService_1.broadcastSignalNotification)({
                    tenantId,
                    planIds: [signal.planId],
                    title: `📄 Aadhaar eSigned Report: ${stockSymbol}`,
                    message: `Verified Aadhaar eSigned research report for ${stockSymbol} is now published.`,
                    type: 'report',
                    data: {
                        signalId,
                        stockSymbol,
                        reportUrl,
                        action: 'REPORT_SIGNED'
                    },
                    signalCreatedAt: signal.createdAt,
                    adminTitle: `📄 Aadhaar Report Signed: ${stockSymbol}`,
                    adminMessage: `${signerName} signed and published research report for ${stockSymbol}.`
                });
            }
        }
        catch (notifErr) {
            console.warn('[Notification] Failed to broadcast completeReportAadhaarEsign notification:', notifErr);
        }
        return res.json({
            success: true,
            message: 'Report eSigned and saved successfully!',
            reportUrl,
            signerName,
            data: updatedSignal ? { ...updatedSignal, id: updatedSignal._id?.toString() || updatedSignal.id } : null
        });
    }
    catch (err) {
        console.error('Error completing report Aadhaar eSign:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};
exports.completeReportAadhaarEsign = completeReportAadhaarEsign;
// 6. USE TODAY'S VERIFIED AADHAAR SIGN (Instant Sign with Current Timestamp)
const useDailyAadhaarSign = async (req, res) => {
    try {
        const userPayload = req.user;
        const userId = userPayload.id || userPayload._id;
        const { signalId } = req.body;
        const pdfBuffer = req.file?.buffer || (req.file?.path ? fs_1.default.readFileSync(req.file.path) : null);
        if (!pdfBuffer) {
            return res.status(400).json({ success: false, message: 'Report PDF file could not be read' });
        }
        const user = await db_1.default.User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const todayIST = getTodayIST();
        const daily = user.dailyAadhaarSignature;
        if (!daily || daily.date !== todayIST || !daily.signerName) {
            return res.status(400).json({
                success: false,
                message: 'No active Aadhaar verification found for today. Please complete a fresh Aadhaar eSign.'
            });
        }
        const signal = await db_1.default.Signal.findById(signalId).populate('stockId').lean();
        if (!signal) {
            return res.status(404).json({ success: false, message: 'Signal not found' });
        }
        const stockSymbol = signal?.stockId?.symbol || 'Signal';
        const currentTimestamp = new Date();
        const dscSettings = user.dscSettings || { placement: 'BOTTOM_RIGHT', signScope: 'ALL_PAGES' };
        const signScope = dscSettings.signScope === 'LAST_PAGE' ? 'LAST_PAGE' : 'ALL_PAGES';
        const placement = dscSettings.placement || 'BOTTOM_RIGHT';
        // Stamp the verified Aadhaar seal with current timestamp
        const stampedPdfBuffer = await (0, exports.stampAadhaarSealOnPdf)(pdfBuffer, daily.signerName, daily.aadhaarLast4 || 'XXXX', daily.date, currentTimestamp, signScope, placement);
        const finalFileName = `Research_Report_${stockSymbol}_Aadhaar_${Date.now()}.pdf`;
        const targetDir = path_1.default.join(process.cwd(), 'uploads', 'research');
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
        }
        const filePath = path_1.default.join(targetDir, finalFileName);
        fs_1.default.writeFileSync(filePath, stampedPdfBuffer);
        const reportUrl = `/uploads/research/${finalFileName}`;
        const updatedSignal = await db_1.default.Signal.findByIdAndUpdate(signalId, {
            $set: {
                reportUrl,
                signatureMode: 'AADHAAR_ESIGN',
                signatureMeta: {
                    method: 'AADHAAR_DAILY_SESSION',
                    sessionDate: daily.date,
                    signedAt: currentTimestamp,
                    signerName: daily.signerName,
                    aadhaarLast4: daily.aadhaarLast4
                }
            }
        }, { returnDocument: 'after', lean: true });
        // Broadcast report notification to subscribers and Admin
        try {
            if (signal?.planId) {
                await (0, notificationService_1.broadcastSignalNotification)({
                    tenantId: signal.tenantId || userPayload.tenantId,
                    planIds: [signal.planId],
                    title: `📄 Verified Research Report: ${stockSymbol}`,
                    message: `Verified research report for ${stockSymbol} has been generated and signed with verified seal.`,
                    type: 'report',
                    data: {
                        signalId,
                        stockSymbol,
                        reportUrl,
                        action: 'REPORT_SIGNED'
                    },
                    signalCreatedAt: signal.createdAt,
                    adminTitle: `📄 Research Report Signed: ${stockSymbol}`,
                    adminMessage: `${daily.signerName} signed research report for ${stockSymbol} using today's verified Aadhaar seal.`
                });
            }
        }
        catch (notifErr) {
            console.warn('[Notification] Failed to broadcast useDailyAadhaarSign notification:', notifErr);
        }
        return res.json({
            success: true,
            message: "Report signed instantly with today's verified Aadhaar seal!",
            reportUrl,
            data: updatedSignal ? { ...updatedSignal, id: updatedSignal._id?.toString() || updatedSignal.id } : null
        });
    }
    catch (err) {
        console.error('Error applying daily Aadhaar sign:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};
exports.useDailyAadhaarSign = useDailyAadhaarSign;
// 7. SAVE DSC SIGNED REPORT (From Local Hardware DSC Bridge)
const saveDscSignedReport = async (req, res) => {
    try {
        const userPayload = req.user;
        const { signalId, signatureMeta } = req.body;
        const pdfBuffer = req.file?.buffer || (req.file?.path ? fs_1.default.readFileSync(req.file.path) : null);
        if (!pdfBuffer) {
            return res.status(400).json({ success: false, message: 'DSC signed PDF file could not be read' });
        }
        const signal = await db_1.default.Signal.findById(signalId).populate('stockId').lean();
        if (!signal) {
            return res.status(404).json({ success: false, message: 'Signal not found' });
        }
        const stockSymbol = signal?.stockId?.symbol || 'Signal';
        const finalFileName = `Research_Report_${stockSymbol}_DSC_${Date.now()}.pdf`;
        const targetDir = path_1.default.join(process.cwd(), 'uploads', 'research');
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
        }
        const filePath = path_1.default.join(targetDir, finalFileName);
        fs_1.default.writeFileSync(filePath, pdfBuffer);
        const reportUrl = `/uploads/research/${finalFileName}`;
        let parsedMeta = { method: 'HARDWARE_DSC_TOKEN' };
        if (signatureMeta) {
            try {
                parsedMeta = typeof signatureMeta === 'string' ? JSON.parse(signatureMeta) : signatureMeta;
            }
            catch (e) {
                parsedMeta = { raw: signatureMeta };
            }
        }
        const updatedSignal = await db_1.default.Signal.findByIdAndUpdate(signalId, {
            $set: {
                reportUrl,
                signatureMode: 'DSC_TOKEN',
                signatureMeta: {
                    ...parsedMeta,
                    signedAt: new Date()
                }
            }
        }, { returnDocument: 'after', lean: true });
        // Broadcast report notification to subscribers and Admin
        try {
            if (signal?.planId) {
                await (0, notificationService_1.broadcastSignalNotification)({
                    tenantId: signal.tenantId || userPayload.tenantId,
                    planIds: [signal.planId],
                    title: `📄 DSC Signed Report: ${stockSymbol}`,
                    message: `DSC USB Token digitally signed research report for ${stockSymbol} is now published.`,
                    type: 'report',
                    data: {
                        signalId,
                        stockSymbol,
                        reportUrl,
                        action: 'REPORT_SIGNED'
                    },
                    signalCreatedAt: signal.createdAt,
                    adminTitle: `📄 DSC Report Signed: ${stockSymbol}`,
                    adminMessage: `USB DSC Token digitally signed research report published for ${stockSymbol}.`
                });
            }
        }
        catch (notifErr) {
            console.warn('[Notification] Failed to broadcast saveDscSignedReport notification:', notifErr);
        }
        return res.json({
            success: true,
            message: 'DSC Hardware Token signed report saved successfully!',
            reportUrl,
            data: updatedSignal ? { ...updatedSignal, id: updatedSignal._id?.toString() || updatedSignal.id } : null
        });
    }
    catch (err) {
        console.error('Error saving DSC signed report:', err);
        return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};
exports.saveDscSignedReport = saveDscSignedReport;
