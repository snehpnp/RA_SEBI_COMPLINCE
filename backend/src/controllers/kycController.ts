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
import { sendSignedAgreementEmail } from '../services/emailService';

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
      const updateFields: Record<string, any> = {
        status: 'AGREEMENT_PENDING',
        kraVerified: true,
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
          companyName: tenant?.companyName || tenant?.name || 'Research Analyst Advisory',
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
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      verifiedName: verifiedAadhaarName || null
    });
  } catch (error: any) {
    console.error('Update Status Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
