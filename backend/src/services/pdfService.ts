import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
