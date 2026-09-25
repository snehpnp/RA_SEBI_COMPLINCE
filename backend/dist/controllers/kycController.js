"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateKycAgreementStatus = exports.initiateAgreementEsign = exports.initiateKyc = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = __importDefault(require("../config/db"));
const digioService_1 = require("../services/digioService");
const pdfService_1 = require("../services/pdfService");
const emailService_1 = require("../services/emailService");
const initiateKyc = async (req, res) => {
    try {
        const userId = req.user.id;
        const client = await db_1.default.Client.findOne({ userId }).populate('userId').lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        const tenant = await db_1.default.Tenant.findById(req.user.tenantId).lean();
        if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
            return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
        }
        const userObj = (client.userId && typeof client.userId === 'object') ? client.userId : {};
        const reqUserAny = req.user || {};
        const identifier = client.email || userObj.email || reqUserAny.email || client.mobile || userObj.mobile || reqUserAny.mobile;
        const customerName = client.name || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.name || reqUserAny.name || 'Client';
        if (!identifier) {
            return res.status(400).json({ success: false, message: 'Client email or mobile is required for Digio KYC' });
        }
        const isSandbox = (tenant.digioEnvironment || '').toUpperCase() === 'SANDBOX' || (tenant.digioEnvironment || '').toUpperCase() === 'UAT';
        const digioResponse = await (0, digioService_1.createKycRequest)(tenant.digioClientId, tenant.digioClientSecret, tenant.digioKycTemplateName || 'DIGILOCKER_KYC', identifier, customerName, tenant.digioEnvironment);
        res.json({
            success: true,
            data: digioResponse,
            environment: isSandbox ? 'sandbox' : 'production'
        });
    }
    catch (error) {
        console.error('Initiate KYC Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.initiateKyc = initiateKyc;
const initiateAgreementEsign = async (req, res) => {
    try {
        const userId = req.user.id;
        const client = await db_1.default.Client.findOne({ userId })
            .populate('userId')
            .populate('profile')
            .lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }
        const tenant = await db_1.default.Tenant.findById(req.user.tenantId).lean();
        if (!tenant || !tenant.digioClientId || !tenant.digioClientSecret) {
            return res.status(400).json({ success: false, message: 'Digio credentials not configured by Admin' });
        }
        const clientIdStr = String(client._id || client.id);
        const isGeneric = (n) => {
            if (!n || typeof n !== 'string')
                return true;
            const l = n.toLowerCase().trim();
            return (l === '' ||
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
                l.includes('@'));
        };
        // Resolve signer full name & masked Aadhaar directly from DB (from Step 1 DigiLocker KYC)
        const profileObj = client.profile || {};
        let signerName = '';
        let verifiedMaskedAadhaar = '';
        if (req.body?.digioResponse) {
            const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(req.body.digioResponse);
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
            }
            else if (client.panName && !isGeneric(client.panName)) {
                signerName = client.panName.trim();
            }
            else if (profileObj.aadhaarName && !isGeneric(profileObj.aadhaarName)) {
                signerName = profileObj.aadhaarName.trim();
            }
            else if (profileObj.panName && !isGeneric(profileObj.panName)) {
                signerName = profileObj.panName.trim();
            }
            else if (client.name && !isGeneric(client.name)) {
                signerName = client.name.trim();
            }
            else if (client.userId?.firstName || client.userId?.lastName) {
                signerName = `${client.userId?.firstName || ''} ${client.userId?.lastName || ''}`.trim();
            }
        }
        if (!verifiedMaskedAadhaar) {
            verifiedMaskedAadhaar = client.aadhaar || profileObj.aadhaar || '';
        }
        console.log('✍️ [Initiate Agreement eSign] Resolved Signer Name from DB KYC:', signerName, '| Aadhaar:', verifiedMaskedAadhaar);
        // 1. Generate PDF dynamically
        const pdfBuffer = await (0, pdfService_1.generateAgreementPdf)(clientIdStr, {
            ipAddress: req.ip,
            signingDate: new Date(),
            signerName: signerName,
            aadhaarSuffix: verifiedMaskedAadhaar || undefined
        });
        // 2. Upload to Digio for eSign
        const identifier = req.user.email || client.email;
        const fileName = `Agreement_${clientIdStr}.pdf`;
        const isSandbox = (tenant.digioEnvironment || '').toUpperCase() === 'SANDBOX' || (tenant.digioEnvironment || '').toUpperCase() === 'UAT';
        const digioResponse = await (0, digioService_1.createDocumentForEsign)(tenant.digioClientId, tenant.digioClientSecret, pdfBuffer, fileName, identifier, signerName, tenant.digioEnvironment);
        const tokenId = digioResponse?.tokenId || digioResponse?.access_token?.id || digioResponse?.token_id || null;
        res.json({
            success: true,
            data: digioResponse,
            tokenId: tokenId,
            signerName: signerName,
            environment: isSandbox ? 'sandbox' : 'production'
        });
    }
    catch (error) {
        console.error('Initiate Agreement Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};
exports.initiateAgreementEsign = initiateAgreementEsign;
const updateKycAgreementStatus = async (req, res) => {
    try {
        const { status, type, kycId, digioKycId, documentId, digioResponse, signatureText } = req.body;
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        const client = await db_1.default.Client.findOne({ userId }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found' });
        const tenant = tenantId ? await db_1.default.Tenant.findById(tenantId).lean() : null;
        const clientId = client._id || client.id;
        const clientIdStr = String(clientId);
        const isGeneric = (n) => {
            if (!n || typeof n !== 'string')
                return true;
            const l = n.toLowerCase().trim();
            return (l === '' ||
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
                l.length < 2);
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
        let rawDigioData = null;
        // Extract verified Aadhaar details / pki_signature_details from Digio response payload
        if (digioResponse) {
            rawDigioData = digioResponse;
            const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(digioResponse);
            if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) {
                verifiedAadhaarName = extracted.aadhaarName;
            }
            if (extracted?.panName && !isGeneric(extracted.panName)) {
                verifiedPanName = extracted.panName;
            }
            if (extracted?.maskedAadhaar)
                verifiedMaskedAadhaar = extracted.maskedAadhaar;
            if (extracted?.panNumber)
                verifiedPanNumber = extracted.panNumber;
            if (extracted?.dob)
                verifiedDob = extracted.dob;
            if (extracted?.gender)
                verifiedGender = extracted.gender;
            if (extracted?.fatherName)
                verifiedFatherName = extracted.fatherName;
            if (extracted?.address)
                verifiedAddress = extracted.address;
            if (extracted?.city)
                verifiedCity = extracted.city;
            if (extracted?.state)
                verifiedState = extracted.state;
            if (extracted?.zipCode)
                verifiedZipCode = extracted.zipCode;
        }
        // If KYC details are incomplete or not present in browser callback, query Digio KYC API directly
        const targetKycId = kycId || digioKycId || digioResponse?.digio_doc_id || digioResponse?.id;
        if (type === 'KYC' && targetKycId && tenant?.digioClientId && tenant?.digioClientSecret) {
            try {
                const fetchedKycStatus = await (0, digioService_1.getKycStatus)(tenant.digioClientId, tenant.digioClientSecret, targetKycId, tenant.digioEnvironment);
                if (fetchedKycStatus) {
                    rawDigioData = fetchedKycStatus;
                    const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(fetchedKycStatus);
                    if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName))
                        verifiedAadhaarName = extracted.aadhaarName;
                    if (extracted?.panName && !isGeneric(extracted.panName))
                        verifiedPanName = extracted.panName;
                    if (extracted?.maskedAadhaar)
                        verifiedMaskedAadhaar = extracted.maskedAadhaar;
                    if (extracted?.panNumber)
                        verifiedPanNumber = extracted.panNumber;
                    if (extracted?.dob)
                        verifiedDob = extracted.dob;
                    if (extracted?.gender)
                        verifiedGender = extracted.gender;
                    if (extracted?.fatherName)
                        verifiedFatherName = extracted.fatherName;
                    if (extracted?.address)
                        verifiedAddress = extracted.address;
                    if (extracted?.city)
                        verifiedCity = extracted.city;
                    if (extracted?.state)
                        verifiedState = extracted.state;
                    if (extracted?.zipCode)
                        verifiedZipCode = extracted.zipCode;
                }
            }
            catch (kErr) {
                console.warn('[Digio KYC] Error fetching full KYC status:', kErr.message);
            }
        }
        if (!verifiedAadhaarName && documentId && tenant?.digioClientId && tenant?.digioClientSecret) {
            try {
                const docStatus = await (0, digioService_1.getDocumentStatus)(tenant.digioClientId, tenant.digioClientSecret, documentId, tenant.digioEnvironment);
                if (docStatus) {
                    rawDigioData = docStatus;
                    const extracted = (0, digioService_1.extractAadhaarDetailsFromDigio)(docStatus);
                    if (extracted?.aadhaarName && !isGeneric(extracted.aadhaarName)) {
                        verifiedAadhaarName = extracted.aadhaarName;
                    }
                    if (extracted?.panName && !isGeneric(extracted.panName)) {
                        verifiedPanName = extracted.panName;
                    }
                    if (extracted?.maskedAadhaar)
                        verifiedMaskedAadhaar = extracted.maskedAadhaar;
                    if (extracted?.panNumber)
                        verifiedPanNumber = extracted.panNumber;
                    if (extracted?.dob)
                        verifiedDob = extracted.dob;
                    if (extracted?.gender)
                        verifiedGender = extracted.gender;
                    if (extracted?.fatherName)
                        verifiedFatherName = extracted.fatherName;
                    if (extracted?.address)
                        verifiedAddress = extracted.address;
                    if (extracted?.city)
                        verifiedCity = extracted.city;
                    if (extracted?.state)
                        verifiedState = extracted.state;
                    if (extracted?.zipCode)
                        verifiedZipCode = extracted.zipCode;
                }
            }
            catch (dErr) {
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
            const updateFields = {
                status: 'AGREEMENT_PENDING',
                kraVerified: true,
                kycStatus: 'VERIFIED'
            };
            if (primaryName) {
                updateFields.name = primaryName;
            }
            if (verifiedPanName)
                updateFields.panName = verifiedPanName;
            if (verifiedAadhaarName)
                updateFields.aadhaarName = verifiedAadhaarName;
            if (verifiedMaskedAadhaar)
                updateFields.aadhaar = verifiedMaskedAadhaar;
            if (verifiedPanNumber)
                updateFields.pan = verifiedPanNumber;
            if (verifiedDob)
                updateFields.dob = verifiedDob;
            if (verifiedGender)
                updateFields.gender = verifiedGender;
            if (verifiedFatherName)
                updateFields.fatherName = verifiedFatherName;
            if (verifiedAddress)
                updateFields.address = verifiedAddress;
            if (verifiedCity)
                updateFields.city = verifiedCity;
            if (verifiedState)
                updateFields.state = verifiedState;
            if (verifiedZipCode)
                updateFields.zipCode = verifiedZipCode;
            if (rawDigioData)
                updateFields.digilockerData = rawDigioData;
            if (updateFields.pan) {
                const cleanPan = updateFields.pan.trim().toUpperCase();
                const duplicateClient = await db_1.default.Client.findOne({
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
            const updatedClientDoc = await db_1.default.Client.findByIdAndUpdate(clientId, { $set: updateFields }, { returnDocument: 'after', lean: true });
            console.log('💾 [DB Update] Client model updated with DigiLocker verified details:', {
                id: updatedClientDoc?._id || clientId,
                name: updatedClientDoc?.name,
                pan: updatedClientDoc?.pan,
                aadhaar: updatedClientDoc?.aadhaar,
                dob: updatedClientDoc?.dob,
                status: updatedClientDoc?.status
            });
            const profileUpdate = {
                kraVerified: true,
                isDigiLockerLocked: true,
                country: 'India'
            };
            if (verifiedPanName)
                profileUpdate.panName = verifiedPanName;
            else if (primaryName)
                profileUpdate.panName = primaryName;
            if (verifiedAadhaarName)
                profileUpdate.aadhaarName = verifiedAadhaarName;
            if (verifiedDob)
                profileUpdate.dob = verifiedDob;
            if (verifiedGender)
                profileUpdate.gender = verifiedGender;
            if (verifiedFatherName)
                profileUpdate.fatherName = verifiedFatherName;
            if (verifiedAddress)
                profileUpdate.addressLine1 = verifiedAddress;
            if (verifiedCity)
                profileUpdate.city = verifiedCity;
            if (verifiedState)
                profileUpdate.state = verifiedState;
            if (verifiedZipCode)
                profileUpdate.zipCode = verifiedZipCode;
            if (rawDigioData)
                profileUpdate.digilockerData = rawDigioData;
            const updatedProfileDoc = await db_1.default.ClientProfile.findOneAndUpdate({ clientId }, { $set: profileUpdate }, { upsert: true, returnDocument: 'after', lean: true });
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
                await db_1.default.User.findByIdAndUpdate(userId, { $set: { firstName, lastName } });
            }
        }
        else if (type === 'AGREEMENT' && (status === 'COMPLETED' || status === 'SIGNED' || status === 'SUCCESS')) {
            const signerName = verifiedAadhaarName || (signatureText && !isGeneric(signatureText) ? signatureText : (client.panName || client.name || 'Investor / Client'));
            const fileName = `${clientIdStr}_signed_agreement.pdf`;
            const agreementUrl = `/uploads/agreements/${fileName}`;
            // Update client name in DB with pki_signature_details.name
            if (verifiedAadhaarName) {
                const nameParts = verifiedAadhaarName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                await db_1.default.Client.findByIdAndUpdate(clientId, {
                    $set: {
                        name: verifiedAadhaarName,
                        panName: verifiedAadhaarName,
                        ...(verifiedMaskedAadhaar ? { aadhaar: verifiedMaskedAadhaar } : {})
                    }
                });
                await db_1.default.User.findByIdAndUpdate(userId, { $set: { firstName, lastName } });
                await db_1.default.ClientProfile.findOneAndUpdate({ clientId }, { $set: { panName: verifiedAadhaarName } }, { upsert: true });
            }
            // Try to download the signed PDF from Digio first
            let pdfBuffer = null;
            if (documentId && tenant?.digioClientId && tenant?.digioClientSecret) {
                pdfBuffer = await (0, digioService_1.downloadDocument)(tenant.digioClientId, tenant.digioClientSecret, documentId, tenant.digioEnvironment);
            }
            // Fallback: Generate signed PDF with Aadhaar signature block displaying pki_signature_details.name
            if (!pdfBuffer) {
                try {
                    pdfBuffer = await (0, pdfService_1.generateAgreementPdf)(clientIdStr, {
                        ipAddress: req.ip,
                        signingDate: new Date(),
                        signerName: signerName,
                        aadhaarSuffix: verifiedMaskedAadhaar || undefined,
                        isSigned: true
                    });
                }
                catch (pdfErr) {
                    console.error('[Agreement] Error generating signed agreement PDF:', pdfErr.message);
                }
            }
            if (pdfBuffer) {
                const targetDirs = [
                    path_1.default.resolve(process.cwd(), 'uploads/agreements'),
                    path_1.default.resolve(__dirname, '../../../uploads/agreements'),
                    path_1.default.resolve(__dirname, '../../public/uploads/agreements')
                ];
                for (const dir of targetDirs) {
                    try {
                        if (!fs_1.default.existsSync(dir)) {
                            fs_1.default.mkdirSync(dir, { recursive: true });
                        }
                        fs_1.default.writeFileSync(path_1.default.join(dir, fileName), pdfBuffer);
                    }
                    catch { }
                }
            }
            // Create Agreement Record
            try {
                await db_1.default.Agreement.create({
                    clientId,
                    agreementUrl,
                    esignMode: 'AADHAAR_ESIGN',
                    ipAddress: req.ip,
                    status: 'SIGNED',
                    signedAt: new Date()
                });
            }
            catch (agrErr) {
                console.warn('[Digio eSign] Error creating agreement DB record:', agrErr.message);
            }
            // Check active subscription
            const activeSub = await db_1.default.Subscription.findOne({
                clientId,
                status: 'ACTIVE'
            }).lean();
            const newStatus = activeSub ? 'ACTIVE' : 'PAYMENT_PENDING';
            await db_1.default.Client.findByIdAndUpdate(clientId, {
                $set: {
                    status: newStatus,
                    agreementSigned: true
                }
            });
            // Send Signed Agreement copy via Email directly to Client with attached PDF
            const toEmail = client.email || req.user?.email;
            if (toEmail) {
                (0, emailService_1.sendSignedAgreementEmail)({
                    tenantId: client.tenantId || req.user?.tenantId,
                    toEmail,
                    clientName: signerName || client.name,
                    companyName: tenant?.companyName || tenant?.name || 'Research Analyst Advisory',
                    agreementUrl,
                    pdfBuffer,
                    maskedAadhaar: verifiedMaskedAadhaar || client.aadhaar,
                    signedAt: new Date()
                }).then((sent) => {
                    if (sent)
                        console.log(`[Agreement Email] 📧 Signed agreement PDF successfully emailed to client: ${toEmail}`);
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
    }
    catch (error) {
        console.error('Update Status Error:', error);
        const rawMsg = String(error?.message || '');
        if (error?.code === 11000 || error?.name === 'MongoServerError' || rawMsg.includes('E11000') || rawMsg.includes('duplicate key')) {
            if (error?.keyPattern?.pan || rawMsg.includes('pan') || rawMsg.includes('pan_unique_partial')) {
                const match = rawMsg.match(/dup key:\s*\{\s*pan:\s*"([^"]+)"/i) || rawMsg.match(/\{ pan:\s*"([^"]+)"\s*\}/i);
                const panVal = match ? match[1] : '';
                const msg = panVal
                    ? `This PAN (${panVal}) is already registered with another account. Please use another PAN.`
                    : 'This PAN is already registered with another account. Please use another PAN.';
                return res.status(400).json({ success: false, message: msg, errors: [msg], duplicateField: 'pan' });
            }
            if (error?.keyPattern?.aadhaar || rawMsg.includes('aadhaar')) {
                const msg = 'This Aadhaar number is already registered with another account.';
                return res.status(400).json({ success: false, message: msg, errors: [msg], duplicateField: 'aadhaar' });
            }
            if (error?.keyPattern?.email || rawMsg.includes('email')) {
                const msg = 'This email address is already registered with another account.';
                return res.status(400).json({ success: false, message: msg, errors: [msg], duplicateField: 'email' });
            }
            if (error?.keyPattern?.mobile || rawMsg.includes('mobile')) {
                const msg = 'This mobile number is already registered with another account.';
                return res.status(400).json({ success: false, message: msg, errors: [msg], duplicateField: 'mobile' });
            }
            const msg = 'An account with these credentials already exists. Please use unique details.';
            return res.status(400).json({ success: false, message: msg, errors: [msg] });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error', errors: [error.message] });
    }
};
exports.updateKycAgreementStatus = updateKycAgreementStatus;
