import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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
    path.join(process.cwd(), 'uploads/branding', fileName),
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
      doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(`Effective Date: ${new Date().toLocaleDateString('en-IN')} | Document ID: TNC-${tenant?.id || 'GLOBAL'}`, { align: 'center' });
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
      doc.fillColor('#64748B').fontSize(8).font('Helvetica').text(`Effective Date: ${new Date().toLocaleDateString('en-IN')} | Document ID: PRIV-${tenant?.id || 'GLOBAL'}`, { align: 'center' });
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
      tenant = await prisma.tenant.findUnique({ where: { id: tenantOrId } });
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

export const generateAgreementPdf = async (clientId: string): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: { user: true, profile: true }
      });

      if (!client) {
        return reject(new Error('Client not found'));
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: client.user.tenantId as string }
      });

      if (!tenant) {
        return reject(new Error('Tenant not found'));
      }

      // Fallback agreement content if none configured
      let agreementText = tenant.agreementContent || "SERVICE AGREEMENT\n\nThis agreement is made between {{COMPANY_NAME}} and {{CLIENT_NAME}}.\n\nDate: {{DATE}}";

      // Replacements
      const replacements: Record<string, string> = {
        '{{CLIENT_NAME}}': `${client.user.firstName} ${client.user.lastName}`,
        '{{CLIENT_EMAIL}}': client.user.email,
        '{{CLIENT_MOBILE}}': client.mobile || 'NA',
        '{{PAN_NUMBER}}': client.pan,
        '{{AADHAAR_NUMBER}}': client.aadhaar,
        '{{CLIENT_ADDRESS}}': client.profile?.addressLine1 ? `${client.profile.addressLine1}, ${client.profile.city}` : 'NA',
        '{{COMPANY_NAME}}': tenant.companyName,
        '{{SEBI_REGISTRATION}}': tenant.sebiRegistration,
        '{{COMPANY_ADDRESS}}': tenant.address,
        '{{DATE}}': new Date().toLocaleDateString('en-IN')
      };

      for (const [key, value] of Object.entries(replacements)) {
        // Replace all occurrences using global regex
        agreementText = agreementText.replace(new RegExp(key, 'g'), value);
      }

      // Generate PDF (compress: false prevents zlib RangeError: Maximum call stack size exceeded)
      const doc = new PDFDocument({ compress: false, margins: { top: 50, bottom: 150, left: 50, right: 50 } });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Add to first page
      doc.fontSize(20).text('SERVICE AGREEMENT', { align: 'center' });
      doc.moveDown(2);

      // Simple regex to strip HTML if the admin uses rich text editor
      let plainText = agreementText;
      // If it contains simple HTML, we can replace some common tags to preserve some structure
      plainText = plainText.replace(/<\/p>/g, '\n\n');
      plainText = plainText.replace(/<br\s*\/?>/g, '\n');
      plainText = plainText.replace(/<li>/gi, '- ');
      plainText = plainText.replace(/<\/li>/gi, '\n');
      plainText = plainText.replace(/<[^>]*>?/gm, ''); // strip remaining HTML
      // Decode entities if needed (basic)
      plainText = plainText.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
      
      // Prevent pdfkit "Maximum call stack size exceeded" by splitting any extremely long unbroken words (e.g. stray base64 data)
      plainText = plainText.replace(/(\S{100})/g, '$1 ');

      doc.fontSize(12).text(plainText.trim(), {
        align: 'justify',
        lineGap: 4
      });

      doc.end();

    } catch (error) {
      console.error("PDF Generation Error:", error);
      reject(error);
    }
  });
};
