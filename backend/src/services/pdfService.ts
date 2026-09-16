import PDFDocument from 'pdfkit';
import { Tenant, Client } from '../config/db';
import fs from 'fs';
import path from 'path';

/**
 * Safely resolves an attachment file path across different runtime working directories
 * and environments, verifying existence on disk to avoid ENOENT errors.
 */
export const resolveAttachmentFilePath = (filePathOrUrl?: string | null): string | null => {
  if (!filePathOrUrl || typeof filePathOrUrl !== 'string') return null;
  const trimmed = filePathOrUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed; // Direct URL
  }

  const cleanPath = trimmed.replace(/^[/\\]+/, '');
  const fileName = path.basename(trimmed);

  const candidatePaths = [
    path.resolve(__dirname, '../../../uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
    path.resolve(process.cwd(), '../uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
    path.resolve(process.cwd(), 'uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
    path.resolve(process.cwd(), cleanPath),
    path.resolve(process.cwd(), '..', cleanPath),
    path.resolve(__dirname, '../../..', cleanPath),
    path.resolve(__dirname, '../../', cleanPath),
    path.resolve('a:/RA_SEBI_COMPLINCE/uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
    path.resolve('a:/RA_SEBI_COMPLINCE/uploads/branding', fileName),
    path.join(__dirname, '../../../uploads/branding', fileName),
    path.join(process.cwd(), '../uploads/branding', fileName),
    path.join(process.cwd(), 'uploads/branding', fileName)
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Ignore file system check errors
    }
  }

  return null;
};

/**
 * Generates an official, SEBI-compliant Terms & Conditions PDF for the tenant advisory.
 */
export const generateTermsAndConditionsPdf = async (tenant: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ compress: false, margins: { top: 40, bottom: 40, left: 45, right: 45 } });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const companyName = tenant?.companyName || 'Research Analyst Advisory';
      const sebiReg = tenant?.sebiRegistration || 'SEBI Registered RA';
      const email = tenant?.email || '';
      const address = tenant?.address || 'India';

      // Header Banner
      doc.rect(45, 40, 522, 55).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(15).font('Helvetica-Bold').text(companyName, 55, 48, { align: 'left' });
      doc.fillColor('#94A3B8').fontSize(9).font('Helvetica').text(`SEBI Registration: ${sebiReg} | Email: ${email}`, 55, 68);
      doc.text(`Address: ${address}`, 55, 80);

      doc.moveDown(3.5);
      doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('TERMS & CONDITIONS FOR RESEARCH ANALYST SERVICES', { align: 'center' });
      doc.moveDown(0.5);
      doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(`Effective Date: ${new Date().toLocaleDateString('en-IN')} | Document ID: TNC-${tenant?.id || tenant?._id || 'GLOBAL'}`, { align: 'center' });
      doc.moveDown(1);

      const sections = [
        {
          title: '1. Regulatory Scope & Services',
          body: `${companyName} is a SEBI registered Research Analyst providing research reports, market recommendations, and analytical commentary in strict compliance with the SEBI (Research Analysts) Regulations, 2014.`
        },
        {
          title: '2. Client Eligibility & Onboarding',
          body: 'Research recommendations are provided to clients upon successful completion of identity verification (KYC) and acceptance of advisory service terms. Clients must provide accurate and updated personal and financial information.'
        },
        {
          title: '3. Mandatory Risk Warning & Disclaimers',
          body: 'Investments in securities market are subject to market risks. Read all the related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.'
        },
        {
          title: '4. Independence & Non-Execution Mandate',
          body: 'The Research Analyst provides independent research recommendations only and does not execute trades, manage funds, or offer portfolio management / discretionary trading on behalf of clients.'
        },
        {
          title: '5. Confidentiality & Intellectual Property',
          body: 'All research reports, analytical notes, and recommendations published by the Research Analyst are for the exclusive personal use of the subscriber and must not be redistributed or reproduced without prior written permission.'
        },
        {
          title: '6. Grievance Redressal Mechanism',
          body: `For queries or grievances, contact our Compliance & Grievance desk at ${email}. Clients may also lodge complaints on SEBI SCORES portal (scores.sebi.gov.in) or SMART ODR portal (smartodr.in).`
        }
      ];

      for (const sec of sections) {
        doc.fillColor('#1E293B').fontSize(10).font('Helvetica-Bold').text(sec.title);
        doc.moveDown(0.2);
        doc.fillColor('#334155').fontSize(9).font('Helvetica').text(sec.body, { align: 'justify', lineGap: 2 });
        doc.moveDown(0.8);
      }

      // Footer
      doc.fillColor('#94A3B8').fontSize(8).font('Helvetica-Oblique').text(
        `This is a regulatory document issued by ${companyName} in compliance with SEBI guidelines.`,
        45,
        740,
        { align: 'center', width: 522 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generates an official, SEBI-compliant Privacy Policy PDF for the tenant advisory.
 */
export const generatePrivacyPolicyPdf = async (tenant: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ compress: false, margins: { top: 40, bottom: 40, left: 45, right: 45 } });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const companyName = tenant?.companyName || 'Research Analyst Advisory';
      const sebiReg = tenant?.sebiRegistration || 'SEBI Registered RA';
      const email = tenant?.email || '';
      const address = tenant?.address || 'India';

      // Header Banner
      doc.rect(45, 40, 522, 55).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(15).font('Helvetica-Bold').text(companyName, 55, 48, { align: 'left' });
      doc.fillColor('#94A3B8').fontSize(9).font('Helvetica').text(`SEBI Registration: ${sebiReg} | Email: ${email}`, 55, 68);
      doc.text(`Address: ${address}`, 55, 80);

      doc.moveDown(3.5);
      doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('PRIVACY & DATA PROTECTION POLICY', { align: 'center' });
      doc.moveDown(0.5);
      doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(`Effective Date: ${new Date().toLocaleDateString('en-IN')} | Document ID: PRIV-${tenant?.id || tenant?._id || 'GLOBAL'}`, { align: 'center' });
      doc.moveDown(1);

      const sections = [
        {
          title: '1. Information We Collect',
          body: `We collect personal identification details (Name, Email, Mobile Number), statutory KYC documents (PAN, Aadhaar/KRA verification data), and communication records required under SEBI regulations.`
        },
        {
          title: '2. Purpose of Data Collection',
          body: 'Your information is collected solely to verify client identity under statutory KYC norms, deliver research reports and market insights, maintain audit trails, and fulfill regulatory compliance obligations.'
        },
        {
          title: '3. Data Security & Storage',
          body: 'We implement industry-standard encryption, strict access controls, and secure data storage to safeguard your personal information against unauthorized access, disclosure, or misuse.'
        },
        {
          title: '4. Non-Disclosure & Information Sharing',
          body: 'We do not sell, trade, or rent client personal data. Data is shared exclusively with statutory authorities (SEBI, Stock Exchanges), accredited KYC Registration Agencies (KRAs), and secure payment processors as required by law.'
        },
        {
          title: '5. Retention & Audit Mandate',
          body: 'In accordance with SEBI compliance mandates, client records and transaction logs are maintained securely for a minimum statutory period of 5 years.'
        },
        {
          title: '6. Contact & Grievance Desk',
          body: `For privacy queries or data protection concerns, contact our designated Grievance & Compliance Officer at ${email}.`
        }
      ];

      for (const sec of sections) {
        doc.fillColor('#1E293B').fontSize(10).font('Helvetica-Bold').text(sec.title);
        doc.moveDown(0.2);
        doc.fillColor('#334155').fontSize(9).font('Helvetica').text(sec.body, { align: 'justify', lineGap: 2 });
        doc.moveDown(0.8);
      }

      // Footer
      doc.fillColor('#94A3B8').fontSize(8).font('Helvetica-Oblique').text(
        `This is a regulatory privacy policy issued by ${companyName} in compliance with SEBI guidelines.`,
        45,
        740,
        { align: 'center', width: 522 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Returns compliance PDF attachments (Terms & Conditions and Privacy Policy)
 * for a tenant, utilizing uploaded files where available or dynamically generated PDFs.
 */
export const getTenantComplianceAttachments = async (
  tenantOrId: any
): Promise<Array<{ filename: string; path?: string; content?: Buffer; contentType?: string }>> => {
  try {
    let tenant = tenantOrId;
    if (typeof tenantOrId === 'string') {
      tenant = await Tenant.findById(tenantOrId).lean();
    }
    if (!tenant) return [];

    const attachments: Array<{ filename: string; path?: string; content?: Buffer; contentType?: string }> = [];

    // 1. Terms & Conditions PDF
    const termsDiskPath = resolveAttachmentFilePath(tenant.termsPdfUrl);
    if (termsDiskPath) {
      attachments.push({
        filename: 'Terms_and_Conditions.pdf',
        path: termsDiskPath,
        contentType: 'application/pdf'
      });
    } else {
      try {
        const termsBuffer = await generateTermsAndConditionsPdf(tenant);
        attachments.push({
          filename: 'Terms_and_Conditions.pdf',
          content: termsBuffer,
          contentType: 'application/pdf'
        });
      } catch (err) {
        console.error('[PDF] Failed to generate terms PDF fallback:', err);
      }
    }

    // 2. Privacy Policy PDF
    const privacyDiskPath = resolveAttachmentFilePath(tenant.privacyPdfUrl);
    if (privacyDiskPath) {
      attachments.push({
        filename: 'Privacy_Policy.pdf',
        path: privacyDiskPath,
        contentType: 'application/pdf'
      });
    } else {
      try {
        const privacyBuffer = await generatePrivacyPolicyPdf(tenant);
        attachments.push({
          filename: 'Privacy_Policy.pdf',
          content: privacyBuffer,
          contentType: 'application/pdf'
        });
      } catch (err) {
        console.error('[PDF] Failed to generate privacy PDF fallback:', err);
      }
    }

    return attachments;
  } catch (error) {
    console.error('[ATTACHMENTS] Error preparing compliance attachments:', error);
    return [];
  }
};

export const generateAgreementPdf = async (
  clientId: string,
  options?: {
    ipAddress?: string;
    signingDate?: Date;
    signerName?: string;
    aadhaarSuffix?: string;
    isSigned?: boolean;
  }
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const client: any = await Client.findById(clientId)
        .populate('user')
        .populate('userId')
        .populate('profile')
        .lean();

      if (!client) {
        return reject(new Error('Client not found'));
      }

      const tenantId = client.tenantId || client.user?.tenantId || client.userId?.tenantId;
      let tenant: any = null;
      if (tenantId) {
        tenant = await Tenant.findById(tenantId).lean();
      }
      if (!tenant) {
        tenant = await Tenant.findOne({ deletedAt: null }).lean();
      }

      const companyName = tenant?.companyName || 'Think Up Research';
      const sebiReg = tenant?.sebiRegistration || 'SEBI Registered RA';
      const companyAddress = tenant?.address || '407 B IT Park, Indore, Madhya Pradesh';
      const userObj = client.user || client.userId || {};
      const profileObj = client.profile || {};

      const isGenericName = (n?: string | null) => {
        if (!n || typeof n !== 'string') return true;
        const lower = n.toLowerCase().trim();
        return (
          lower === '' ||
          lower === 'digo' ||
          lower === 'digio' ||
          lower === 'digo client' ||
          lower === 'digio client' ||
          lower === 'digio esign' ||
          lower === 'aadhaar esign' ||
          lower === 'client' ||
          lower === 'test' ||
          lower === 'test user' ||
          lower === 'user' ||
          lower.includes('@')
        );
      };

      // Resolve true legal client full name (pki_signature_details.name / Digio verified Aadhaar name prioritized)
      let clientFullName = '';

      console.log('options-------------------------------------', options);

      if (options?.signerName) {
        clientFullName = options.signerName.trim();
      } else {
        clientFullName = "Ram Kumar"
      }


      // Aadhaar format
      let displayAadhaar = options?.aadhaarSuffix || '';
      if (!displayAadhaar) {
        const rawAadhaar = String(client.aadhaar || '').replace(/\D/g, '');
        displayAadhaar = rawAadhaar.length >= 12
          ? rawAadhaar
          : (client.aadhaar || (rawAadhaar.length >= 4 ? `XXXX-XXXX-${rawAadhaar.slice(-4)}` : 'XXXX-XXXX-XXXX'));
      }

      const signingDate = options?.signingDate || new Date();
      const dateStr = `${signingDate.getDate()}/${signingDate.getMonth() + 1}/${signingDate.getFullYear()}`;

      const cleanClientAddress = (
        profileObj.addressLine1
          ? `${profileObj.addressLine1}${profileObj.addressLine2 ? ', ' + profileObj.addressLine2 : ''}${profileObj.city ? ', ' + profileObj.city : ''}${profileObj.state ? ', ' + profileObj.state : ''}`
          : (client.address || '55, Chandigarh')
      ).trim();

      let agreementText =
        tenant?.agreementContent ||
        `${companyName} Services Agreement\n\n` +
        `This Services Agreement (this "Agreement") is made and entered into as of the ${dateStr}, by and between the ${companyName}, having its registered office at ${companyAddress}\n\n` +
        `And\n\n` +
        `Mr./Mrs./Miss: ${clientFullName} Residing: ${cleanClientAddress} Having PAN No: ${client.pan || 'NA'} UID/AADHAAR: ${displayAadhaar} Mobile No: ${client.mobile || 'NA'} E-Mail ID: ${client.email || userObj.email || 'NA'}\n\n` +
        `Whereas Client is an active investor or trader in the share market and wishes to obtain research and related services from ${companyName}. Resulting which ${companyName} is ready to provide its research services and the Client is ready to receive and use such research services subject to the following terms and conditions.\n\n` +
        `Now Therefore, The Parties Agree as Follows....Please find the attached files of Disclaimer as well as Terms and Conditions of the company and read them carefully.\n\n` +
        `Disclaimer:-- All subscription fees paid to ${companyName} shall be subject to the applicable terms of the selected research service and refund policy. ${companyName} is a SEBI Registered Research Analyst and provides research reports and research recommendations based on its research activities. However, no recommendation or research view should be construed as a guarantee of returns or profits.`;

      const replacements: Record<string, string> = {
        '{{CLIENT_NAME}}': clientFullName,
        '{{CLIENT_EMAIL}}': client.email || userObj.email || '',
        '{{CLIENT_MOBILE}}': client.mobile || 'NA',
        '{{PAN_NUMBER}}': client.pan || 'NA',
        '{{AADHAAR_NUMBER}}': displayAadhaar,
        '{{CLIENT_ADDRESS}}': cleanClientAddress,
        '{{COMPANY_NAME}}': companyName,
        '{{SEBI_REGISTRATION}}': sebiReg,
        '{{COMPANY_ADDRESS}}': companyAddress,
        '{{DATE}}': dateStr
      };

      for (const [key, value] of Object.entries(replacements)) {
        agreementText = agreementText.replace(new RegExp(key, 'g'), value);
      }

      // Fix formatting and spacing from HTML templates
      let plainText = agreementText;
      plainText = plainText.replace(/<\/h[1-6]>/gi, '\n\n');
      plainText = plainText.replace(/<\/p>/gi, '\n\n');
      plainText = plainText.replace(/<br\s*\/?>/gi, '\n');
      plainText = plainText.replace(/<li>/gi, '\n- ');
      plainText = plainText.replace(/<\/li>/gi, '');
      plainText = plainText.replace(/<[^>]+>/gm, ' ');
      plainText = plainText.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');

      plainText = plainText.replace(/Services Agreement\s*This Services Agreement/gi, 'Services Agreement\n\nThis Services Agreement');
      plainText = plainText.replace(/AgreementThis Services Agreement/gi, 'Agreement\n\nThis Services Agreement');
      plainText = plainText.replace(/([a-zA-Z0-9,])This Services Agreement/gi, '$1\n\nThis Services Agreement');
      plainText = plainText.replace(/([a-zA-Z0-9,])Having PAN No/gi, '$1 Having PAN No');
      plainText = plainText.replace(/([a-zA-Z0-9,])UID\/AADHAAR/gi, '$1 UID/AADHAAR');
      plainText = plainText.replace(/([a-zA-Z0-9,])Mobile No/gi, '$1 Mobile No');
      plainText = plainText.replace(/([a-zA-Z0-9,])E-Mail ID/gi, '$1 E-Mail ID');
      plainText = plainText.replace(/([a-zA-Z0-9,])Residing:/gi, '$1 Residing:');
      plainText = plainText.replace(/Residing:\s*,/gi, 'Residing: ');

      plainText = plainText.replace(/[ \t]+/g, ' ');
      plainText = plainText.replace(/\n\s*\n\s*\n+/g, '\n\n');
      plainText = plainText.trim();

      const doc = new PDFDocument({
        size: 'A4',
        compress: false,
        margins: { top: 45, bottom: 45, left: 45, right: 45 }
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const startX = 45;
      const contentWidth = 505;

      // Clean Center Title
      doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold').text('SERVICE AGREEMENT', startX, 45, {
        align: 'center',
        width: contentWidth
      });
      doc.y = 80;

      // Agreement Terms Content
      doc.fillColor('#111827').fontSize(9.5).font('Helvetica').text(plainText, startX, doc.y, {
        align: 'justify',
        width: contentWidth,
        lineGap: 3.5
      });

      // ── Official Aadhaar Signature Block (When Signed with Digio Aadhaar eSign) ──
      if (options?.isSigned && clientFullName && clientFullName !== 'Investor / Client') {
        const signDate = options.signingDate || new Date();
        const dateFormatted = signDate.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        if (doc.y > 680) {
          doc.addPage();
        } else {
          doc.moveDown(2);
        }

        const stampX = 320;
        const stampY = doc.y;

        doc.lineWidth(0.75).strokeColor('#0284C7').rect(stampX - 5, stampY - 5, 230, 80).stroke();

        doc.fillColor('#0369A1').fontSize(9.5).font('Helvetica-Bold').text(`Signed by: ${clientFullName}`, stampX, stampY);
        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        doc.text(`Reason: SEBI Research Advisory Agreement eSign`, stampX, stampY + 14, { width: 220 });
        doc.text(`eSigned using Aadhaar (Digio.in / UIDAI)`, stampX, stampY + 28);
        if (options.aadhaarSuffix) {
          doc.text(`Aadhaar: ${options.aadhaarSuffix}`, stampX, stampY + 42);
          doc.text(`Date: ${dateFormatted} IST`, stampX, stampY + 56);
        } else {
          doc.text(`Date: ${dateFormatted} IST`, stampX, stampY + 42);
        }
      }

      doc.end();
    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
};
