import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import dynamicDb from '../config/db';
import {
  createDocumentForEsign,
  getDocumentStatus,
  downloadDocument,
  extractAadhaarDetailsFromDigio
} from '../services/digioService';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { broadcastSignalNotification } from '../services/notificationService';

// Helper to format today's date in IST (YYYY-MM-DD)
const getTodayIST = (): string => {
  const d = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};

// Helper to stamp verified Aadhaar seal on PDF
export const stampAadhaarSealOnPdf = async (
  pdfBuffer: Buffer,
  signerName: string,
  aadhaarLast4: string,
  verifiedDate: string,
  currentTimestamp: Date,
  signScope: 'ALL_PAGES' | 'LAST_PAGE' = 'ALL_PAGES',
  placement: 'BOTTOM_RIGHT' | 'BOTTOM_CENTER' | 'BOTTOM_LEFT' = 'BOTTOM_RIGHT'
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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
    } else if (placement === 'BOTTOM_LEFT') {
      x = 25;
    }
    const y = 18;

    // Draw background box
    page.drawRectangle({
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.96, 0.99, 0.97),
      borderColor: rgb(0.12, 0.63, 0.32),
      borderWidth: 1.2,
    });

    // Draw top badge / header bar
    page.drawRectangle({
      x,
      y: y + boxHeight - 12,
      width: boxWidth,
      height: 12,
      color: rgb(0.12, 0.63, 0.32),
    });

    // Header label
    page.drawText('VERIFIED AADHAAR eSIGN', {
      x: x + 8,
      y: y + boxHeight - 9,
      size: 6.5,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    // Signer Name
    page.drawText(`Signer: ${signerName}`, {
      x: x + 8,
      y: y + 21,
      size: 7,
      font: helveticaBold,
      color: rgb(0.08, 0.15, 0.1),
    });

    // Aadhaar number + verified date
    page.drawText(`Aadhaar: XXXX-XXXX-${aadhaarLast4}  (Session: ${verifiedDate})`, {
      x: x + 8,
      y: y + 12,
      size: 5.8,
      font: helveticaFont,
      color: rgb(0.2, 0.3, 0.25),
    });

    // Current report timestamp
    page.drawText(`Report Generated: ${istDateString}`, {
      x: x + 8,
      y: y + 4,
      size: 5.5,
      font: helveticaFont,
      color: rgb(0.25, 0.35, 0.28),
    });
  }

  const modifiedBytes = await pdfDoc.save();
  return Buffer.from(modifiedBytes);
};

// 1. GET SIGNATURE SETTINGS (User-specific)
export const getSignatureSettings = async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    const userId = userPayload.id || userPayload._id;
    const tenantId = userPayload.tenantId;

    const user = await dynamicDb.User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tenant = await dynamicDb.Tenant.findById(tenantId).lean() || await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();

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
  } catch (err: any) {
    console.error('Error fetching signature settings:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// 2. UPDATE SIGNATURE SETTINGS (User-specific)
export const updateSignatureSettings = async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    const userId = userPayload.id || userPayload._id;
    const { signatureMode, dscSettings, signatureUrl } = req.body;

    const updates: any = {};
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

    const updatedUser = await dynamicDb.User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { returnDocument: 'after', lean: true }
    );

    return res.json({
      success: true,
      message: 'Signature settings updated successfully',
      data: {
        signatureMode: updatedUser?.signatureMode,
        dscSettings: updatedUser?.dscSettings,
        signatureUrl: updatedUser?.signatureUrl
      }
    });
  } catch (err: any) {
    console.error('Error updating signature settings:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// 3. UPLOAD RESEARCHER PERSONAL SIGNATURE
export const uploadResearcherSignature = async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    const userId = userPayload.id || userPayload._id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No signature file provided' });
    }

    const folder = req.file.destination ? path.basename(req.file.destination) : 'signatures';
    const signatureUrl = `/uploads/${folder}/${req.file.filename}`;

    const updatedUser = await dynamicDb.User.findByIdAndUpdate(
      userId,
      { $set: { signatureUrl } },
      { returnDocument: 'after', lean: true }
    );

    return res.json({
      success: true,
      message: 'Signature uploaded successfully',
      data: {
        signatureUrl: updatedUser?.signatureUrl
      }
    });
  } catch (err: any) {
    console.error('Error uploading signature:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// 4. INITIATE REPORT AADHAAR ESIGN (Digio Gateway)
export const initiateReportAadhaarEsign = async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    const userId = userPayload.id || userPayload._id;
    const tenantId = userPayload.tenantId;
    const { signalId } = req.body;

    const file = req.file;
    const pdfBuffer = file?.buffer || (file?.path ? fs.readFileSync(file.path) : null);
    if (!pdfBuffer) {
      return res.status(400).json({ success: false, message: 'Report PDF buffer could not be read' });
    }

    const user = await dynamicDb.User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const tenant = await dynamicDb.Tenant.findById(tenantId).lean() || await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    if (!tenant?.digioClientId || !tenant?.digioClientSecret) {
      return res.status(400).json({
        success: false,
        message: 'Digio credentials not configured for this tenant. Please configure them in Admin Settings.'
      });
    }

    const signal = await dynamicDb.Signal.findById(signalId).populate('stockId').lean();
    const stockSymbol = (signal?.stockId as any)?.symbol || 'Signal';
    const fileName = `Research_Report_${stockSymbol}_${Date.now()}.pdf`;

    const signerIdentifier = user.email || user.mobile;

    // Do NOT pass profile name (e.g. Rahul Verma) so Digio does not pre-fill or enforce an unverified profile name.
    // Omit signerName so Digio prompts the signer to verify via Aadhaar OTP, and UIDAI returns the legal verified name.
    const digioResponse = await createDocumentForEsign(
      tenant.digioClientId,
      tenant.digioClientSecret,
      pdfBuffer,
      fileName,
      signerIdentifier,
      undefined,
      tenant.digioEnvironment || undefined
    );

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
  } catch (err: any) {
    console.error('Error initiating report Aadhaar eSign:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// 5. COMPLETE REPORT AADHAAR ESIGN (Verify & Save Signed PDF + Cache Daily Sign)
export const completeReportAadhaarEsign = async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    const userId = userPayload.id || userPayload._id;
    const tenantId = userPayload.tenantId;
    const { documentId, signalId } = req.body;

    if (!documentId || !signalId) {
      return res.status(400).json({ success: false, message: 'documentId and signalId are required' });
    }

    const tenant = await dynamicDb.Tenant.findById(tenantId).lean() || await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    if (!tenant?.digioClientId || !tenant?.digioClientSecret) {
      return res.status(400).json({ success: false, message: 'Digio credentials not configured' });
    }

    // 1. Fetch document status from Digio
    const docStatus = await getDocumentStatus(tenant.digioClientId, tenant.digioClientSecret, documentId, tenant.digioEnvironment || undefined);
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
    const signedPdfBuffer = await downloadDocument(tenant.digioClientId, tenant.digioClientSecret, documentId, tenant.digioEnvironment || undefined);
    if (!signedPdfBuffer) {
      return res.status(500).json({ success: false, message: 'Failed to download signed document from Digio' });
    }

    // 3. Extract Aadhaar details for daily re-use
    const extracted = extractAadhaarDetailsFromDigio(docStatus);
    const user = await dynamicDb.User.findById(userId).lean();

    // Strict priority: Use the legal verified name from Aadhaar (UIDAI PKI)
    const verifiedAadhaarName = extracted?.aadhaarName;
    const signerName = verifiedAadhaarName || user?.email || 'Research Analyst';
    const aadhaarLast4 = extracted?.maskedAadhaar ? extracted.maskedAadhaar.slice(-4) : 'XXXX';
    const todayIST = getTodayIST();

    // 4. Cache daily Aadhaar session on user AND sync profile name with verified Aadhaar name
    const userUpdates: any = {
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

    await dynamicDb.User.findByIdAndUpdate(userId, { $set: userUpdates });

    // 5. Save the signed PDF to uploads/research/
    const signal = await dynamicDb.Signal.findById(signalId).populate('stockId').lean();
    const stockSymbol = (signal?.stockId as any)?.symbol || 'Signal';
    const finalFileName = `Research_Report_${stockSymbol}_Signed_${Date.now()}.pdf`;
    const targetDir = path.join(process.cwd(), 'uploads', 'research');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, finalFileName);
    fs.writeFileSync(filePath, signedPdfBuffer);

    const reportUrl = `/uploads/research/${finalFileName}`;

    // 6. Update Signal record
    const updatedSignal = await dynamicDb.Signal.findByIdAndUpdate(
      signalId,
      {
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
      },
      { returnDocument: 'after', lean: true }
    );

    // Broadcast report notification to subscribers and Admin
    try {
      if (signal?.planId) {
        await broadcastSignalNotification({
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
    } catch (notifErr) {
      console.warn('[Notification] Failed to broadcast completeReportAadhaarEsign notification:', notifErr);
    }

    return res.json({
      success: true,
      message: 'Report eSigned and saved successfully!',
      reportUrl,
      signerName,
      data: updatedSignal ? { ...updatedSignal, id: updatedSignal._id?.toString() || updatedSignal.id } : null
    });
  } catch (err: any) {
    console.error('Error completing report Aadhaar eSign:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// 6. USE TODAY'S VERIFIED AADHAAR SIGN (Instant Sign with Current Timestamp)
export const useDailyAadhaarSign = async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    const userId = userPayload.id || userPayload._id;
    const { signalId } = req.body;

    const pdfBuffer = req.file?.buffer || (req.file?.path ? fs.readFileSync(req.file.path) : null);
    if (!pdfBuffer) {
      return res.status(400).json({ success: false, message: 'Report PDF file could not be read' });
    }

    const user = await dynamicDb.User.findById(userId).lean();
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

    const signal = await dynamicDb.Signal.findById(signalId).populate('stockId').lean();
    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found' });
    }

    const stockSymbol = (signal?.stockId as any)?.symbol || 'Signal';
    const currentTimestamp = new Date();

    const dscSettings = user.dscSettings || { placement: 'BOTTOM_RIGHT', signScope: 'ALL_PAGES' };
    const signScope = dscSettings.signScope === 'LAST_PAGE' ? 'LAST_PAGE' : 'ALL_PAGES';
    const placement = dscSettings.placement || 'BOTTOM_RIGHT';

    // Stamp the verified Aadhaar seal with current timestamp
    const stampedPdfBuffer = await stampAadhaarSealOnPdf(
      pdfBuffer,
      daily.signerName,
      daily.aadhaarLast4 || 'XXXX',
      daily.date,
      currentTimestamp,
      signScope,
      placement
    );

    const finalFileName = `Research_Report_${stockSymbol}_Aadhaar_${Date.now()}.pdf`;
    const targetDir = path.join(process.cwd(), 'uploads', 'research');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, finalFileName);
    fs.writeFileSync(filePath, stampedPdfBuffer);

    const reportUrl = `/uploads/research/${finalFileName}`;

    const updatedSignal = await dynamicDb.Signal.findByIdAndUpdate(
      signalId,
      {
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
      },
      { returnDocument: 'after', lean: true }
    );

    // Broadcast report notification to subscribers and Admin
    try {
      if (signal?.planId) {
        await broadcastSignalNotification({
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
    } catch (notifErr) {
      console.warn('[Notification] Failed to broadcast useDailyAadhaarSign notification:', notifErr);
    }

    return res.json({
      success: true,
      message: "Report signed instantly with today's verified Aadhaar seal!",
      reportUrl,
      data: updatedSignal ? { ...updatedSignal, id: updatedSignal._id?.toString() || updatedSignal.id } : null
    });
  } catch (err: any) {
    console.error('Error applying daily Aadhaar sign:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// 7. SAVE DSC SIGNED REPORT (From Local Hardware DSC Bridge)
export const saveDscSignedReport = async (req: Request, res: Response) => {
  try {
    const userPayload = (req as any).user;
    const { signalId, signatureMeta } = req.body;

    const pdfBuffer = req.file?.buffer || (req.file?.path ? fs.readFileSync(req.file.path) : null);
    if (!pdfBuffer) {
      return res.status(400).json({ success: false, message: 'DSC signed PDF file could not be read' });
    }

    const signal = await dynamicDb.Signal.findById(signalId).populate('stockId').lean();
    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found' });
    }

    const stockSymbol = (signal?.stockId as any)?.symbol || 'Signal';
    const finalFileName = `Research_Report_${stockSymbol}_DSC_${Date.now()}.pdf`;

    const targetDir = path.join(process.cwd(), 'uploads', 'research');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, finalFileName);
    fs.writeFileSync(filePath, pdfBuffer);

    const reportUrl = `/uploads/research/${finalFileName}`;

    let parsedMeta: any = { method: 'HARDWARE_DSC_TOKEN' };
    if (signatureMeta) {
      try {
        parsedMeta = typeof signatureMeta === 'string' ? JSON.parse(signatureMeta) : signatureMeta;
      } catch (e) {
        parsedMeta = { raw: signatureMeta };
      }
    }

    const updatedSignal = await dynamicDb.Signal.findByIdAndUpdate(
      signalId,
      {
        $set: {
          reportUrl,
          signatureMode: 'DSC_TOKEN',
          signatureMeta: {
            ...parsedMeta,
            signedAt: new Date()
          }
        }
      },
      { returnDocument: 'after', lean: true }
    );

    // Broadcast report notification to subscribers and Admin
    try {
      if (signal?.planId) {
        await broadcastSignalNotification({
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
    } catch (notifErr) {
      console.warn('[Notification] Failed to broadcast saveDscSignedReport notification:', notifErr);
    }

    return res.json({
      success: true,
      message: 'DSC Hardware Token signed report saved successfully!',
      reportUrl,
      data: updatedSignal ? { ...updatedSignal, id: updatedSignal._id?.toString() || updatedSignal.id } : null
    });
  } catch (err: any) {
    console.error('Error saving DSC signed report:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
