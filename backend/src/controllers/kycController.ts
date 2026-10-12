import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../middlewares/auth';
import dynamicDb from '../config/db';
import {
  createKycRequest,
  createDocumentForEsign,
  getKycStatus,
  getDocumentStatus,
  downloadDocument,
  extractAadhaarDetailsFromDigio
} from '../services/digioService';
import { generateAgreementPdf } from '../services/pdfService';
import { sendSignedAgreementEmail, sendTaxInvoiceEmail } from '../services/emailService';
import { generateInvoicePdf } from '../services/invoiceGenerator';
import { getCamsCredentials, getPanDownload, extractCamsPanDetails, mapKraStatus } from '../services/camsKraService';
import { generateCamsKraPdfBuffer, generateAndSaveCamsKraPdf } from '../services/camsKraPdfService';

export const initiateKyc = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const client: any = await dynamicDb.Client.findOne({ userId }).populate('userId').lean();

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const tenant: any = await dynamicDb.Tenant.findById(req.user!.tenantId as string).lean();
    if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
      return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
    }

    const userObj = (client.userId && typeof client.userId === 'object') ? client.userId : {};
    const reqUserAny = (req.user as any) || {};
    const identifier = client.email || userObj.email || reqUserAny.email || client.mobile || userObj.mobile || reqUserAny.mobile;
    const customerName = client.name || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.name || reqUserAny.name || 'Client';

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Client email or mobile is required for Digio KYC' });
    }

    const isSandbox = (tenant.digioEnvironment || '').toUpperCase() === 'SANDBOX' || (tenant.digioEnvironment || '').toUpperCase() === 'UAT';
    const digioResponse = await createKycRequest(
      tenant.digioClientId as string,
      tenant.digioClientSecret as string,
      tenant.digioKycTemplateName || 'DIGILOCKER_KYC',
      identifier,
      customerName,
      tenant.digioEnvironment
    );

    res.json({
      success: true,
      data: digioResponse,
      environment: isSandbox ? 'sandbox' : 'production'
    });
  } catch (error: any) {
    console.error('Initiate KYC Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const initiateAgreementEsign = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const client: any = await dynamicDb.Client.findOne({ userId })
      .populate('userId')
      .populate('profile')
      .lean();

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const tenant: any = await dynamicDb.Tenant.findById(req.user!.tenantId as string).lean();
    if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
      return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
    }

    const clientIdStr = String(client._id || client.id);

    const isGeneric = (n?: string | null) => {
      if (!n || typeof n !== 'string') return true;
      const l = n.toLowerCase().trim();
      return (
        l === '' ||
        l === 'digo' ||
        l === 'digio' ||
        l === 'digo client' ||
        l === 'digio client' ||
        l === 'digio esign' ||
        l === 'aadhaar esign' ||
        l === 'client' ||
        l === 'test' ||
        l === 'test user' ||
        l === 'user' ||
        l.includes('@')
      );
    };
    // Resolve signer full name & masked Aadhaar directly from DB (from Step 1 DigiLocker KYC)
    const profileObj = client.profile || {};
    let signerName = '';
    let verifiedMaskedAadhaar = '';

    if (req.body?.digioResponse) {
      const extracted = extractAadhaarDetailsFromDigio(req.body.digioResponse);
      if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) {
        signerName = extracted.aadhaarName.trim();
      }
      if (extracted?.maskedAadhaar) {
        verifiedMaskedAadhaar = extracted.maskedAadhaar;
      }
    }

    if (!signerName) {
      if (client.aadhaarName && !isGeneric(client.aadhaarName)) {
        signerName = client.aadhaarName.trim();
      } else if (client.panName && !isGeneric(client.panName)) {
        signerName = client.panName.trim();
      } else if (profileObj.aadhaarName && !isGeneric(profileObj.aadhaarName)) {
        signerName = profileObj.aadhaarName.trim();
      } else if (profileObj.panName && !isGeneric(profileObj.panName)) {
        signerName = profileObj.panName.trim();
      } else if (client.name && !isGeneric(client.name)) {
        signerName = client.name.trim();
      } else if (client.userId?.firstName || client.userId?.lastName) {
        signerName = `${client.userId?.firstName || ''} ${client.userId?.lastName || ''}`.trim();
      }
    }

    if (!verifiedMaskedAadhaar) {
      verifiedMaskedAadhaar = client.aadhaar || profileObj.aadhaar || '';
    }

    console.log('✍️ [Initiate Agreement eSign] Resolved Signer Name from DB KYC:', signerName, '| Aadhaar:', verifiedMaskedAadhaar);

    // 1. Generate PDF dynamically
    const pdfBuffer = await generateAgreementPdf(clientIdStr, {
      ipAddress: req.ip,
      signingDate: new Date(),
      signerName: signerName,
      aadhaarSuffix: verifiedMaskedAadhaar || undefined
    });

    // 2. Upload to Digio for eSign
    const identifier = req.user!.email || client.email;
    const fileName = `Agreement_${clientIdStr}.pdf`;

    const isSandbox = (tenant.digioEnvironment || '').toUpperCase() === 'SANDBOX' || (tenant.digioEnvironment || '').toUpperCase() === 'UAT';
    const digioResponse = await createDocumentForEsign(
      tenant.digioClientId as string,
      tenant.digioClientSecret as string,
      pdfBuffer,
      fileName,
      identifier,
      signerName,
      tenant.digioEnvironment
    );

    const tokenId = digioResponse?.tokenId || digioResponse?.access_token?.id || digioResponse?.token_id || null;
    res.json({
      success: true,
      data: digioResponse,
      tokenId: tokenId,
      signerName: signerName,
      environment: isSandbox ? 'sandbox' : 'production'
    });
  } catch (error: any) {
    console.error('Initiate Agreement Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateKycAgreementStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, type, kycId, digioKycId, documentId, digioResponse, signatureText } = req.body;
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;

    const client: any = await dynamicDb.Client.findOne({ userId }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const tenant: any = tenantId ? await dynamicDb.Tenant.findById(tenantId).lean() : null;
    const clientId = client._id || client.id;
    const clientIdStr = String(clientId);

    const isGeneric = (n?: string | null) => {
      if (!n || typeof n !== 'string') return true;
      const l = n.toLowerCase().trim();
      return (
        l === '' ||
        l === 'digo' ||
        l === 'digio' ||
        l === 'digo client' ||
        l === 'digio client' ||
        l === 'digio esign' ||
        l === 'aadhaar esign' ||
        l === 'client' ||
        l === 'test' ||
        l === 'test user' ||
        l === 'user' ||
        l.includes('@') ||
        /\d/.test(l) ||
        l.length < 2
      );
    };

    let verifiedAadhaarName = '';
    let verifiedPanName = '';
    let verifiedMaskedAadhaar = '';
    let verifiedPanNumber = '';
    let verifiedDob = '';
    let verifiedGender = '';
    let verifiedFatherName = '';
    let verifiedAddress = '';
    let verifiedCity = '';
    let verifiedState = '';
    let verifiedZipCode = '';
    let rawDigioData: any = null;

    // Extract verified Aadhaar details / pki_signature_details from Digio response payload
    if (digioResponse) {
      rawDigioData = digioResponse;
      const extracted = extractAadhaarDetailsFromDigio(digioResponse);
      if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) {
        verifiedAadhaarName = extracted.aadhaarName;
      }
      if (extracted?.panName && !isGeneric(extracted.panName)) {
        verifiedPanName = extracted.panName;
      }
      if (extracted?.maskedAadhaar) verifiedMaskedAadhaar = extracted.maskedAadhaar;
      if (extracted?.panNumber) verifiedPanNumber = extracted.panNumber;
      if (extracted?.dob) verifiedDob = extracted.dob;
      if (extracted?.gender) verifiedGender = extracted.gender;
      if (extracted?.fatherName) verifiedFatherName = extracted.fatherName;
      if (extracted?.address) verifiedAddress = extracted.address;
      if (extracted?.city) verifiedCity = extracted.city;
      if (extracted?.state) verifiedState = extracted.state;
      if (extracted?.zipCode) verifiedZipCode = extracted.zipCode;
    }

    // If KYC details are incomplete or not present in browser callback, query Digio KYC API directly
    const targetKycId = kycId || digioKycId || digioResponse?.digio_doc_id || digioResponse?.id;
    if (type === 'KYC' && targetKycId && tenant?.digioClientId && tenant?.digioClientSecret) {
      try {
        const fetchedKycStatus = await getKycStatus(tenant.digioClientId, tenant.digioClientSecret, targetKycId, tenant.digioEnvironment);
        if (fetchedKycStatus) {
          rawDigioData = fetchedKycStatus;
          const extracted = extractAadhaarDetailsFromDigio(fetchedKycStatus);
          if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) verifiedAadhaarName = extracted.aadhaarName;
          if (extracted?.panName && !isGeneric(extracted.panName)) verifiedPanName = extracted.panName;
          if (extracted?.maskedAadhaar) verifiedMaskedAadhaar = extracted.maskedAadhaar;
          if (extracted?.panNumber) verifiedPanNumber = extracted.panNumber;
          if (extracted?.dob) verifiedDob = extracted.dob;
          if (extracted?.gender) verifiedGender = extracted.gender;
          if (extracted?.fatherName) verifiedFatherName = extracted.fatherName;
          if (extracted?.address) verifiedAddress = extracted.address;
          if (extracted?.city) verifiedCity = extracted.city;
          if (extracted?.state) verifiedState = extracted.state;
          if (extracted?.zipCode) verifiedZipCode = extracted.zipCode;
        }
      } catch (kErr: any) {
        console.warn('[Digio KYC] Error fetching full KYC status:', kErr.message);
      }
    }

    if (!verifiedAadhaarName && documentId && tenant?.digioClientId && tenant?.digioClientSecret) {
      try {
        const docStatus = await getDocumentStatus(tenant.digioClientId, tenant.digioClientSecret, documentId, tenant.digioEnvironment);
        if (docStatus) {
          rawDigioData = docStatus;
          const extracted = extractAadhaarDetailsFromDigio(docStatus);
          if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) {
            verifiedAadhaarName = extracted.aadhaarName;
          }
          if (extracted?.panName && !isGeneric(extracted.panName)) {
            verifiedPanName = extracted.panName;
          }
          if (extracted?.maskedAadhaar) verifiedMaskedAadhaar = extracted.maskedAadhaar;
          if (extracted?.panNumber) verifiedPanNumber = extracted.panNumber;
          if (extracted?.dob) verifiedDob = extracted.dob;
          if (extracted?.gender) verifiedGender = extracted.gender;
          if (extracted?.fatherName) verifiedFatherName = extracted.fatherName;
          if (extracted?.address) verifiedAddress = extracted.address;
          if (extracted?.city) verifiedCity = extracted.city;
          if (extracted?.state) verifiedState = extracted.state;
          if (extracted?.zipCode) verifiedZipCode = extracted.zipCode;
        }
      } catch (dErr: any) {
        console.warn('[Digio eSign] Error fetching document status:', dErr.message);
      }
    }

    const primaryName = (verifiedPanName && !isGeneric(verifiedPanName))
      ? verifiedPanName
      : (verifiedAadhaarName && !isGeneric(verifiedAadhaarName) ? verifiedAadhaarName : '');

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║               🟢 [DIGIO KYC / eSIGN VERIFICATION]               ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log('║ Type                   :', type);
    console.log('║ Status                 :', status);
    console.log('║ Client ID              :', clientIdStr);
    console.log('║ Primary Verified Name  :', primaryName || '—');
    console.log('║ Aadhaar Name           :', verifiedAadhaarName || '—');
    console.log('║ PAN Name               :', verifiedPanName || '—');
    console.log('║ PAN Number             :', verifiedPanNumber || '—');
    console.log('║ Masked Aadhaar         :', verifiedMaskedAadhaar || '—');
    console.log('║ Date of Birth (DOB)    :', verifiedDob || '—');
    console.log('║ Gender                 :', verifiedGender || '—');
    console.log('║ Father / Guardian Name :', verifiedFatherName || '—');
    console.log('║ Full Address           :', verifiedAddress || '—');
    console.log('║ City / District        :', verifiedCity || '—');
    console.log('║ State                  :', verifiedState || '—');
    console.log('║ Pincode                :', verifiedZipCode || '—');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    if (type === 'KYC' && (status === 'COMPLETED' || status === 'SUCCESS')) {
      const existingClientForKyc = await dynamicDb.Client.findById(clientId).lean();
      const updateFields: Record<string, any> = {
        status: 'AGREEMENT_PENDING',
        kraVerified: Boolean(existingClientForKyc?.camsKraData && existingClientForKyc?.kraVerified),
        kycStatus: 'VERIFIED'
      };
      if (primaryName) {
        updateFields.name = primaryName;
      }
      if (verifiedPanName) updateFields.panName = verifiedPanName;
      if (verifiedAadhaarName) updateFields.aadhaarName = verifiedAadhaarName;
      if (verifiedMaskedAadhaar) updateFields.aadhaar = verifiedMaskedAadhaar;
      if (verifiedPanNumber) updateFields.pan = verifiedPanNumber;
      if (verifiedDob) updateFields.dob = verifiedDob;
      if (verifiedGender) updateFields.gender = verifiedGender;
      if (verifiedFatherName) updateFields.fatherName = verifiedFatherName;
      if (verifiedAddress) updateFields.address = verifiedAddress;
      if (verifiedCity) updateFields.city = verifiedCity;
      if (verifiedState) updateFields.state = verifiedState;
      if (verifiedZipCode) updateFields.zipCode = verifiedZipCode;
      if (rawDigioData) updateFields.digilockerData = rawDigioData;
      if (updateFields.pan) {
        const cleanPan = updateFields.pan.trim().toUpperCase();
        const duplicateClient = await dynamicDb.Client.findOne({
          pan: cleanPan,
          _id: { $ne: clientId }
        }).lean();

        if (duplicateClient) {
          return res.status(400).json({
            success: false,
            message: `This PAN card (${cleanPan}) is already registered with another account. Please use another PAN.`,
            errors: [`This PAN card (${cleanPan}) is already registered with another account. Please use another PAN.`],
            duplicateField: 'pan'
          });
        }
      }

      const updatedClientDoc = await dynamicDb.Client.findByIdAndUpdate(clientId, { $set: updateFields }, { returnDocument: 'after', lean: true });
      console.log('💾 [DB Update] Client model updated with DigiLocker verified details:', {
        id: updatedClientDoc?._id || clientId,
        name: updatedClientDoc?.name,
        pan: updatedClientDoc?.pan,
        aadhaar: updatedClientDoc?.aadhaar,
        dob: updatedClientDoc?.dob,
        status: updatedClientDoc?.status
      });

      const profileUpdate: Record<string, any> = {
        kraVerified: true,
        isDigiLockerLocked: true,
        country: 'India'
      };
      if (verifiedPanName) profileUpdate.panName = verifiedPanName;
      else if (primaryName) profileUpdate.panName = primaryName;
      if (verifiedAadhaarName) profileUpdate.aadhaarName = verifiedAadhaarName;
      if (verifiedDob) profileUpdate.dob = verifiedDob;
      if (verifiedGender) profileUpdate.gender = verifiedGender;
      if (verifiedFatherName) profileUpdate.fatherName = verifiedFatherName;
      if (verifiedAddress) profileUpdate.addressLine1 = verifiedAddress;
      if (verifiedCity) profileUpdate.city = verifiedCity;
      if (verifiedState) profileUpdate.state = verifiedState;
      if (verifiedZipCode) profileUpdate.zipCode = verifiedZipCode;
      if (rawDigioData) profileUpdate.digilockerData = rawDigioData;

      const updatedProfileDoc = await dynamicDb.ClientProfile.findOneAndUpdate(
        { clientId },
        { $set: profileUpdate },
        { upsert: true, returnDocument: 'after', lean: true }
      );
      console.log('💾 [DB Update] ClientProfile model updated & locked:', {
        panName: updatedProfileDoc?.panName,
        aadhaarName: updatedProfileDoc?.aadhaarName,
        dob: updatedProfileDoc?.dob,
        address: updatedProfileDoc?.addressLine1,
        city: updatedProfileDoc?.city,
        state: updatedProfileDoc?.state,
        zipCode: updatedProfileDoc?.zipCode,
        isDigiLockerLocked: updatedProfileDoc?.isDigiLockerLocked
      });

      if (primaryName) {
        const nameParts = primaryName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        await dynamicDb.User.findByIdAndUpdate(userId, { $set: { firstName, lastName } });
      }
    } else if (type === 'AGREEMENT' && (status === 'COMPLETED' || status === 'SIGNED' || status === 'SUCCESS')) {
      const signerName = verifiedAadhaarName || (signatureText && !isGeneric(signatureText) ? signatureText : (client.panName || client.name || 'Investor / Client'));
      const fileName = `${clientIdStr}_signed_agreement.pdf`;
      const agreementUrl = `/uploads/agreements/${fileName}`;

      // Update client name in DB with pki_signature_details.name
      if (verifiedAadhaarName) {
        const nameParts = verifiedAadhaarName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        await dynamicDb.Client.findByIdAndUpdate(clientId, {
          $set: {
            name: verifiedAadhaarName,
            panName: verifiedAadhaarName,
            ...(verifiedMaskedAadhaar ? { aadhaar: verifiedMaskedAadhaar } : {})
          }
        });
        await dynamicDb.User.findByIdAndUpdate(userId, { $set: { firstName, lastName } });
        await dynamicDb.ClientProfile.findOneAndUpdate(
          { clientId },
          { $set: { panName: verifiedAadhaarName } },
          { upsert: true }
        );
      }

      // Try to download the signed PDF from Digio first
      let pdfBuffer: Buffer | null = null;
      if (documentId && tenant?.digioClientId && tenant?.digioClientSecret) {
        pdfBuffer = await downloadDocument(tenant.digioClientId, tenant.digioClientSecret, documentId, tenant.digioEnvironment);
      }

      // Fallback: Generate signed PDF with Aadhaar signature block displaying pki_signature_details.name
      if (!pdfBuffer) {
        try {
          pdfBuffer = await generateAgreementPdf(clientIdStr, {
            ipAddress: req.ip,
            signingDate: new Date(),
            signerName: signerName,
            aadhaarSuffix: verifiedMaskedAadhaar || undefined,
            isSigned: true
          });
        } catch (pdfErr: any) {
          console.error('[Agreement] Error generating signed agreement PDF:', pdfErr.message);
        }
      }

      if (pdfBuffer) {
        const targetDirs = [
          path.resolve(process.cwd(), 'uploads/agreements'),
          path.resolve(__dirname, '../../../uploads/agreements'),
          path.resolve(__dirname, '../../public/uploads/agreements')
        ];

        for (const dir of targetDirs) {
          try {
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(path.join(dir, fileName), pdfBuffer);
          } catch { }
        }
      }

      // Create Agreement Record
      try {
        await dynamicDb.Agreement.create({
          clientId,
          agreementUrl,
          esignMode: 'AADHAAR_ESIGN',
          ipAddress: req.ip,
          status: 'SIGNED',
          signedAt: new Date()
        });
      } catch (agrErr: any) {
        console.warn('[Digio eSign] Error creating agreement DB record:', agrErr.message);
      }

      // Check active subscription
      const activeSub = await dynamicDb.Subscription.findOne({
        clientId,
        status: 'ACTIVE'
      }).lean();

      const newStatus = activeSub ? 'ACTIVE' : 'PAYMENT_PENDING';

      await dynamicDb.Client.findByIdAndUpdate(clientId, {
        $set: {
          status: newStatus,
          agreementSigned: true
        }
      });

      // Send Signed Agreement copy via Email directly to Client with attached PDF
      const toEmail = client.email || req.user?.email;
      if (toEmail) {
        sendSignedAgreementEmail({
          tenantId: client.tenantId || req.user?.tenantId,
          toEmail,
          clientName: signerName || client.name,
          companyName: tenant?.companyName || tenant?.name || 'Research Analyst Services',
          agreementUrl,
          pdfBuffer,
          maskedAadhaar: verifiedMaskedAadhaar || client.aadhaar,
          signedAt: new Date()
        }).then((sent) => {
          if (sent) console.log(`[Agreement Email] 📧 Signed agreement PDF successfully emailed to client: ${toEmail}`);
        }).catch((mailErr) => {
          console.warn('[Agreement Email] Failed to dispatch signed agreement email:', mailErr.message);
        });
      }

      // Batch Release any Pending Invoices for this Client (Deferred Invoicing)
      try {
        const pendingPayments = await dynamicDb.Payment.find({
          clientId,
          invoiceStatus: 'PENDING_AGREEMENT'
        }).lean();

        if (pendingPayments && pendingPayments.length > 0) {
          console.log(`[Batch Invoice Release] Found ${pendingPayments.length} pending invoice(s) for client ${clientId}`);
          for (const pay of pendingPayments) {
            await dynamicDb.Payment.findByIdAndUpdate(pay._id || pay.id, {
              $set: { invoiceStatus: 'GENERATED' }
            });

            if (toEmail) {
              generateInvoicePdf(String(pay._id || pay.id))
                .then(invBuffer => {
                  const invNo = pay.transactionRef
                    ? `INV/${new Date().getFullYear()}/${String(pay.transactionRef).slice(-6).toUpperCase()}`
                    : `INV/${new Date().getFullYear()}/001`;
                  return sendTaxInvoiceEmail({
                    tenantId: client.tenantId || req.user?.tenantId,
                    toEmail,
                    clientName: signerName || client.name,
                    companyName: tenant?.companyName,
                    planName: (pay as any).planName || (pay as any).plan?.name || 'Research Service Plan',
                    invoiceNumber: invNo,
                    amount: pay.amount,
                    pdfBuffer: invBuffer
                  });
                })
                .then(() => {
                  dynamicDb.Payment.findByIdAndUpdate(pay._id || pay.id, {
                    $set: { invoiceSentAt: new Date(), lastEmailedTo: toEmail }
                  }).catch(() => {});
                })
                .catch(batchErr => console.warn(`[Batch Invoice Release] Failed for payment ${pay._id}:`, batchErr.message));
            }
          }
        }
      } catch (batchInvErr: any) {
        console.warn('[Batch Invoice Release] Error releasing pending invoices:', batchInvErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      verifiedName: verifiedAadhaarName || null
    });
  } catch (error: any) {
    console.error('Update Status Error:', error);
    const rawMsg = String(error?.message || '');
    if (error?.code === 11000 || error?.name === 'MongoServerError' || rawMsg.includes('E11000') || rawMsg.includes('duplicate key')) {
      if (error?.keyPattern?.email || /\bemail\b/i.test(rawMsg)) {
        const msg = 'This email address is already registered with another account.';
        return res.status(400).json({ success: false, message: msg, errors: [msg], duplicateField: 'email' });
      }
      if (error?.keyPattern?.mobile || /\b(mobile|phone)\b/i.test(rawMsg)) {
        const msg = 'This mobile number is already registered with another account.';
        return res.status(400).json({ success: false, message: msg, errors: [msg], duplicateField: 'mobile' });
      }
      if (error?.keyPattern?.pan || /\bpan_unique_partial\b/i.test(rawMsg) || /index:\s*pan/i.test(rawMsg) || /dup key:\s*\{\s*pan:/i.test(rawMsg) || /\bpan\b/i.test(rawMsg)) {
        const match = rawMsg.match(/dup key:\s*\{\s*pan:\s*"([^"]+)"/i) || rawMsg.match(/\{ pan:\s*"([^"]+)"\s*\}/i);
        const panVal = match ? match[1] : '';
        const msg = panVal
          ? `This PAN (${panVal}) is already registered with another account. Please use another PAN.`
          : 'This PAN is already registered with another account. Please use another PAN.';
        return res.status(400).json({ success: false, message: msg, errors: [msg], duplicateField: 'pan' });
      }
      if (error?.keyPattern?.aadhaar || /\baadhaar\b/i.test(rawMsg)) {
        const msg = 'This Aadhaar number is already registered with another account.';
        return res.status(400).json({ success: false, message: msg, errors: [msg], duplicateField: 'aadhaar' });
      }
      const msg = 'An account with these credentials already exists. Please use unique details.';
      return res.status(400).json({ success: false, message: msg, errors: [msg] });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error', errors: [error.message] });
  }
};

// =====================================================
// Admin: Fetch Client KYC Details by Digio ID
// POST /api/v1/admin/digio/fetch-by-id
// Body: { digioId, kycDigioId?, esignDigioId?, clientId?, saveToClient? }
// =====================================================
export const fetchDigioRecord = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Supports: single `digioId` OR separate `kycDigioId` + `esignDigioId`
    const { digioId, kycDigioId, esignDigioId, clientId, saveToClient } = req.body;

    const singleId = (digioId || '').trim();
    const kycId = (kycDigioId || '').trim();
    const esignId = (esignDigioId || '').trim();

    if (!singleId && !kycId && !esignId) {
      return res.status(400).json({ success: false, message: 'At least one Digio ID is required' });
    }

    const tenantId = req.user!.tenantId;
    const tenant: any = tenantId ? await dynamicDb.Tenant.findById(tenantId).lean() : null;

    if (!tenant?.digioClientId || !tenant?.digioClientSecret) {
      return res.status(400).json({
        success: false,
        message: 'Digio API credentials are not configured. Please configure them in Settings > Integrations > Digio KYC.'
      });
    }

    const dClientId = tenant.digioClientId as string;
    const dClientSecret = tenant.digioClientSecret as string;
    const dEnv = tenant.digioEnvironment as string | undefined;

    const isGeneric = (n?: string | null) => {
      if (!n || typeof n !== 'string') return true;
      const l = n.toLowerCase().trim();
      return l === '' || l === 'digio' || l === 'client' || l === 'test' || l === 'user' || l.includes('@') || l.length < 2;
    };

    // ── Helper: fetch a single ID, auto-detect KYC vs eSign ──
    const fetchOneId = async (id: string): Promise<{ rawData: any; fetchType: string }> => {
      const looksLikeKyc = /^KYC/i.test(id);
      const looksLikeDoc = /^DID/i.test(id);
      let rawData: any = null;
      let fetchType = 'unknown';

      if (looksLikeKyc || !looksLikeDoc) {
        try {
          rawData = await getKycStatus(dClientId, dClientSecret, id, dEnv);
          if (rawData?.id || rawData?.status || rawData?.kyc_status) { fetchType = 'KYC'; }
          else rawData = null;
        } catch { rawData = null; }
      }

      if (!rawData) {
        try {
          rawData = await getDocumentStatus(dClientId, dClientSecret, id, dEnv);
          if (rawData?.id || rawData?.status) { fetchType = 'ESIGN_DOCUMENT'; }
          else rawData = null;
        } catch { rawData = null; }
      }

      if (!rawData && !looksLikeKyc) {
        try {
          rawData = await getKycStatus(dClientId, dClientSecret, id, dEnv);
          if (rawData?.id || rawData?.status || rawData?.kyc_status) { fetchType = 'KYC'; }
          else rawData = null;
        } catch { rawData = null; }
      }
      if (!rawData && !looksLikeDoc) {
        try {
          rawData = await getDocumentStatus(dClientId, dClientSecret, id, dEnv);
          if (rawData?.id || rawData?.status) { fetchType = 'ESIGN_DOCUMENT'; }
          else rawData = null;
        } catch { rawData = null; }
      }

      return { rawData, fetchType };
    };

    // ── Resolve all IDs ──
    let kycRawData: any = null;
    let esignRawData: any = null;
    let resolvedKycId = kycId;
    let resolvedEsignId = esignId;

    if (kycId) {
      const r = await fetchOneId(kycId);
      kycRawData = r.rawData;
    }
    if (esignId) {
      const r = await fetchOneId(esignId);
      esignRawData = r.rawData;
    }

    // Single ID mode: auto-route to kyc or esign bucket
    if (singleId) {
      const r = await fetchOneId(singleId);
      if (r.fetchType === 'KYC') {
        kycRawData = kycRawData || r.rawData;
        resolvedKycId = resolvedKycId || singleId;
      } else if (r.fetchType === 'ESIGN_DOCUMENT') {
        esignRawData = esignRawData || r.rawData;
        resolvedEsignId = resolvedEsignId || singleId;
      }
    }

    if (!kycRawData && !esignRawData) {
      return res.status(404).json({
        success: false,
        message: 'No record found on Digio for the provided ID(s). Please verify the ID is correct and belongs to your Digio account.'
      });
    }

    // ── Extract & merge data ──
    const extractedKyc: any = kycRawData ? (extractAadhaarDetailsFromDigio(kycRawData) || {}) : {};
    const extractedEsign: any = esignRawData ? (extractAadhaarDetailsFromDigio(esignRawData) || {}) : {};

    const merged = {
      aadhaarName:  extractedKyc.aadhaarName  || extractedEsign.aadhaarName  || null,
      panName:      extractedKyc.panName       || extractedEsign.panName       || null,
      panNumber:    extractedKyc.panNumber     || extractedEsign.panNumber     || null,
      maskedAadhaar:extractedKyc.maskedAadhaar || extractedEsign.maskedAadhaar || null,
      dob:          extractedKyc.dob           || extractedEsign.dob           || null,
      gender:       extractedKyc.gender        || extractedEsign.gender        || null,
      fatherName:   extractedKyc.fatherName    || extractedEsign.fatherName    || null,
      address:      extractedKyc.address       || extractedEsign.address       || null,
      city:         extractedKyc.city          || extractedEsign.city          || null,
      state:        extractedKyc.state         || extractedEsign.state         || null,
      zipCode:      extractedKyc.zipCode       || extractedEsign.zipCode       || null,
    };

    console.log(`\n🔍 [Admin Fetch Digio] KycID=${resolvedKycId||'—'} | EsignID=${resolvedEsignId||'—'} | Client=${clientId || 'N/A'}`);
    console.log('   Name:', merged.aadhaarName || merged.panName || '—', '| PAN:', merged.panNumber || '—');

    // ── Load client data from DB ──
    let existingClient: any = null;
    let existingProfile: any = null;
    let existingAgreements: any[] = [];

    if (clientId) {
      existingClient  = await dynamicDb.Client.findById(clientId).lean();
      existingProfile = await dynamicDb.ClientProfile.findOne({ clientId }).lean();
      existingAgreements = await dynamicDb.Agreement.find({ clientId }).sort({ createdAt: -1 }).lean();
    }

    // ── SAVE TO CLIENT ──
    let savedToClient = false;
    let agreementCreated = false;
    let agreementUrl = '';

    if (saveToClient && clientId) {
      try {
        const primaryName =
          (merged.panName && !isGeneric(merged.panName)) ? merged.panName :
          (merged.aadhaarName && !isGeneric(merged.aadhaarName)) ? merged.aadhaarName : null;

        const existingClientForAgr = await dynamicDb.Client.findById(clientId).lean();
        const clientHasKra = Boolean(existingClientForAgr?.camsKraData && existingClientForAgr?.kraVerified);

        // 1. Update Client record
        const clientFields: Record<string, any> = { kraVerified: clientHasKra };
        if (kycRawData) { clientFields.digilockerData = kycRawData; clientFields.kycStatus = 'VERIFIED'; }
        if (primaryName) clientFields.name = primaryName;
        if (merged.aadhaarName && !isGeneric(merged.aadhaarName)) clientFields.aadhaarName = merged.aadhaarName;
        if (merged.panName    && !isGeneric(merged.panName))      clientFields.panName      = merged.panName;
        if (merged.maskedAadhaar) clientFields.aadhaar    = merged.maskedAadhaar;
        if (merged.panNumber)     clientFields.pan         = merged.panNumber;
        if (merged.dob)           clientFields.dob         = merged.dob;
        if (merged.gender)        clientFields.gender      = merged.gender;
        if (merged.fatherName)    clientFields.fatherName  = merged.fatherName;
        if (merged.address)       clientFields.address     = merged.address;
        if (merged.city)          clientFields.city        = merged.city;
        if (merged.state)         clientFields.state       = merged.state;
        if (merged.zipCode)       clientFields.zipCode     = merged.zipCode;
        await dynamicDb.Client.findByIdAndUpdate(clientId, { $set: clientFields });

        // 2. Update ClientProfile
        const profileFields: Record<string, any> = { kraVerified: clientHasKra };
        if (kycRawData) { profileFields.isDigiLockerLocked = true; profileFields.digilockerData = kycRawData; }
        if (merged.panName    && !isGeneric(merged.panName))    profileFields.panName     = merged.panName;
        if (merged.aadhaarName&& !isGeneric(merged.aadhaarName))profileFields.aadhaarName = merged.aadhaarName;
        if (merged.dob)        profileFields.dob         = merged.dob;
        if (merged.gender)     profileFields.gender      = merged.gender;
        if (merged.fatherName) profileFields.fatherName  = merged.fatherName;
        if (merged.address)    profileFields.addressLine1= merged.address;
        if (merged.city)       profileFields.city        = merged.city;
        if (merged.state)      profileFields.state       = merged.state;
        if (merged.zipCode)    profileFields.zipCode     = merged.zipCode;
        await dynamicDb.ClientProfile.findOneAndUpdate({ clientId }, { $set: profileFields }, { upsert: true });

        // 3. Update User name
        if (primaryName && existingClient?.userId) {
          const parts = primaryName.split(' ');
          await dynamicDb.User.findByIdAndUpdate(existingClient.userId, {
            $set: { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' }
          });
        }

        // 4. eSign document → download PDF → create Agreement record
        if (resolvedEsignId && esignRawData) {
          const clientIdStr = String(clientId);
          const fileName = `${clientIdStr}_signed_agreement.pdf`;
          agreementUrl = `/uploads/agreements/${fileName}`;

          let pdfBuffer: Buffer | null = null;
          // Try Digio PDF download
          try { pdfBuffer = await downloadDocument(dClientId, dClientSecret, resolvedEsignId, dEnv); } catch { }

          // Fallback: generate locally
          if (!pdfBuffer) {
            try {
              const signerName = merged.aadhaarName || merged.panName || existingClient?.name || 'Client';
              pdfBuffer = await generateAgreementPdf(clientIdStr, {
                signerName,
                aadhaarSuffix: merged.maskedAadhaar || existingClient?.aadhaar || undefined,
                isSigned: true,
                signingDate: new Date()
              });
            } catch { }
          }

          // Save PDF to disk
          if (pdfBuffer) {
            for (const dir of [
              path.resolve(process.cwd(), 'uploads/agreements'),
              path.resolve(__dirname, '../../../uploads/agreements'),
              path.resolve(__dirname, '../../public/uploads/agreements')
            ]) {
              try {
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(dir, fileName), pdfBuffer);
              } catch { }
            }
          }

          // Upsert Agreement record
          const existingAgreement: any = await dynamicDb.Agreement.findOne({ clientId, status: 'SIGNED' }).lean();
          if (!existingAgreement) {
            await dynamicDb.Agreement.create({
              clientId,
              agreementUrl,
              esignMode: 'AADHAAR_ESIGN',
              ipAddress: req.ip || '0.0.0.0',
              status: 'SIGNED',
              signedAt: new Date(),
              digioDocumentId: resolvedEsignId
            });
            agreementCreated = true;
          } else {
            agreementUrl = existingAgreement.agreementUrl || agreementUrl;
          }

          // Mark client agreementSigned
          const activeSub = await dynamicDb.Subscription.findOne({ clientId, status: 'ACTIVE' }).lean();
          await dynamicDb.Client.findByIdAndUpdate(clientId, {
            $set: {
              agreementSigned: true,
              status: activeSub ? 'ACTIVE' : (existingClient?.status || 'PAYMENT_PENDING')
            }
          });
        }

        savedToClient = true;
        console.log(`✅ [Admin Fetch Digio] Saved to client ${clientId} | Agreement created: ${agreementCreated}`);

        // Reload after save
        existingClient     = await dynamicDb.Client.findById(clientId).lean();
        existingProfile    = await dynamicDb.ClientProfile.findOne({ clientId }).lean();
        existingAgreements = await dynamicDb.Agreement.find({ clientId }).sort({ createdAt: -1 }).lean();

      } catch (saveErr: any) {
        console.warn('[Admin Fetch Digio] Save failed:', saveErr.message);
      }
    }

    // ── Client snapshot: merge Digio data + DB data ──
    const clientSnapshot = existingClient ? {
      name:           merged.aadhaarName || merged.panName || existingClient.name,
      panName:        merged.panName       || existingClient.panName,
      aadhaarName:    merged.aadhaarName   || existingClient.aadhaarName,
      pan:            merged.panNumber     || existingClient.pan,
      aadhaar:        merged.maskedAadhaar || existingClient.aadhaar,
      dob:            merged.dob           || existingClient.dob,
      gender:         merged.gender        || existingClient.gender,
      fatherName:     merged.fatherName    || existingClient.fatherName,
      address:        merged.address       || existingClient.address     || existingProfile?.addressLine1,
      city:           merged.city          || existingClient.city        || existingProfile?.city,
      state:          merged.state         || existingClient.state       || existingProfile?.state,
      zipCode:        merged.zipCode       || existingClient.zipCode     || existingProfile?.zipCode,
      email:          existingClient.email,
      mobile:         existingClient.mobile,
      status:         existingClient.status,
      kraVerified:    existingClient.kraVerified,
      agreementSigned:existingClient.agreementSigned,
      agreements: existingAgreements.map((a: any) => ({
        id:             String(a._id),
        status:         a.status,
        esignMode:      a.esignMode,
        signedAt:       a.signedAt,
        agreementUrl:   a.agreementUrl,
        digioDocumentId:a.digioDocumentId
      }))
    } : null;

    return res.json({
      success: true,
      fetchTypes: {
        kycId:       resolvedKycId  || null,
        esignId:     resolvedEsignId|| null,
        kycFetched:  !!kycRawData,
        esignFetched:!!esignRawData,
      },
      digioStatus: kycRawData?.status || kycRawData?.kyc_status || esignRawData?.status || 'UNKNOWN',
      extracted: merged,
      savedToClient,
      agreementCreated,
      agreementUrl: agreementUrl || null,
      clientSnapshot
    });

  } catch (error: any) {
    console.error('[Admin Fetch Digio] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * Fetch and optionally save client KYC details from CAMS KRA PANdownload API
 */
export const fetchCamsRecord = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pan, dob, clientId, saveToClient } = req.body;
    const cleanPan = (pan || '').trim().toUpperCase();

    if (!cleanPan) {
      return res.status(400).json({ success: false, message: 'PAN number is required' });
    }

    const tenantId = req.user?.tenantId;
    const creds = await getCamsCredentials(tenantId);

    if (!creds.camsClientCode || !creds.camsClientId || !creds.camsClientSecret) {
      return res.status(400).json({
        success: false,
        message: 'CAMS KRA API credentials are not configured. Please configure them in Settings > Integrations > CAMS KRA.'
      });
    }

    if (creds.camsClientId.trim() === creds.camsClientSecret.trim()) {
      return res.status(400).json({
        success: false,
        message: 'CAMS Client ID aur Client Secret identical hain! Settings > Integrations me jakar apna sahi CAMS Client Secret update karein.'
      });
    }

    // Call CAMS KRA
    const camsResponse = await getPanDownload(cleanPan, dob, creds);
    if (!camsResponse.success || !camsResponse.data) {
      const msg = camsResponse.message === 'No data found.'
        ? 'CAMS KRA token error: "No data found." Kripya Settings > Integrations me CAMS Client Code, Client ID aur Client Secret verify karein.'
        : (camsResponse.message || 'Failed to download PAN details from CAMS KRA');

      return res.status(400).json({
        success: false,
        message: msg,
        error: camsResponse.error,
        data: camsResponse.data
      });
    }

    const extracted = extractCamsPanDetails(camsResponse.data);

    let savedToClient = false;
    let clientSnapshot: any = null;

    const targetClientId = clientId || (req.user?.role === 'CLIENT' ? req.user?.id : null);

    if (targetClientId) {
      let existingClient: any = null;
      if (clientId) {
        existingClient = await dynamicDb.Client.findById(clientId).lean();
      } else {
        existingClient = await dynamicDb.Client.findOne({ userId: req.user?.id }).lean();
      }

      if (existingClient) {
        const cId = existingClient._id || existingClient.id;
        if (saveToClient) {
          const statusObj = mapKraStatus(extracted.rawRecord?.status || extracted.kraStatusCode || extracted.kraStatus);
          const isTrulyVerified = statusObj.isVerified;
          const formattedKraStatus = `${statusObj.label} (${statusObj.code})`;

          const clientUpdates: Record<string, any> = {
            kraVerified: isTrulyVerified,
            camsKraData: camsResponse.data,
            kraStatus: formattedKraStatus
          };
          if (extracted.name) {
            clientUpdates.name = extracted.name;
            clientUpdates.panName = extracted.name;
          }
          if (extracted.pan) clientUpdates.pan = extracted.pan;
          if (extracted.dob) clientUpdates.dob = extracted.dob;
          if (extracted.gender) clientUpdates.gender = extracted.gender;
          if (extracted.fatherName) clientUpdates.fatherName = extracted.fatherName;
          if (extracted.address) clientUpdates.address = extracted.address;
          if (extracted.city) clientUpdates.city = extracted.city;
          if (extracted.state) clientUpdates.state = extracted.state;
          if (extracted.zipCode) clientUpdates.zipCode = extracted.zipCode;

          await dynamicDb.Client.findByIdAndUpdate(cId, { $set: clientUpdates });

          const profileUpdates: Record<string, any> = {
            kraVerified: isTrulyVerified,
            camsKraData: camsResponse.data,
            kraStatus: formattedKraStatus
          };
          if (extracted.name) profileUpdates.panName = extracted.name;
          if (extracted.dob) profileUpdates.dob = extracted.dob;
          if (extracted.gender) profileUpdates.gender = extracted.gender;
          if (extracted.fatherName) profileUpdates.fatherName = extracted.fatherName;
          if (extracted.address) profileUpdates.addressLine1 = extracted.address;
          if (extracted.city) profileUpdates.city = extracted.city;
          if (extracted.state) profileUpdates.state = extracted.state;
          if (extracted.zipCode) profileUpdates.zipCode = extracted.zipCode;

          await dynamicDb.ClientProfile.findOneAndUpdate(
            { clientId: cId },
            { $set: profileUpdates },
            { upsert: true }
          );

          savedToClient = true;

          // Automatically generate official CAMS KRA KYC Verification PDF and archive to Client Vault
          try {
            const tenant = await dynamicDb.Tenant.findById(tenantId).lean();
            const clientForPdf = await dynamicDb.Client.findById(cId).lean();
            const pdfRes = await generateAndSaveCamsKraPdf(clientForPdf, camsResponse.data, tenant);
            if (pdfRes?.fileUrl) {
              await dynamicDb.Client.findByIdAndUpdate(cId, { $set: { camsKraPdfUrl: pdfRes.fileUrl } });
              await dynamicDb.ClientProfile.findOneAndUpdate({ clientId: cId }, { $set: { camsKraPdfUrl: pdfRes.fileUrl } });
            }
          } catch (pdfErr: any) {
            console.warn('[CAMS KRA PDF Generation Error]:', pdfErr.message);
          }
        }

        clientSnapshot = await dynamicDb.Client.findById(cId).lean();
      }
    }

    return res.json({
      success: true,
      message: savedToClient ? 'CAMS KRA details fetched and saved to client profile!' : 'CAMS KRA details fetched successfully!',
      data: camsResponse.data,
      extracted,
      clientSnapshot,
      pdfUrl: clientSnapshot?.camsKraPdfUrl || null,
      savedToClient
    });
  } catch (err: any) {
    console.error('[CAMS KRA Fetch Error]:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error while fetching CAMS KRA details'
    });
  }
};

export const getCamsKraPdf = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    const client: any = await dynamicDb.Client.findById(clientId).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    if (!client.camsKraData) {
      return res.status(400).json({ success: false, message: 'Client has no CAMS KRA data to generate report' });
    }
    const tenant = await dynamicDb.Tenant.findById(req.user?.tenantId || client.tenantId).lean();
    const pdfBuffer = await generateCamsKraPdfBuffer(client, client.camsKraData, tenant);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="CAMS_KRA_KYC_${client.pan || 'REPORT'}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Error generating KRA PDF' });
  }
};



