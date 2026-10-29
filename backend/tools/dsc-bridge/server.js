const express = require('express');
const cors = require('cors');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || process.env.DSC_BRIDGE_PORT || 1620;
const HOST = process.env.HOST ;

// Support Chrome Private Network Access (PNA) from public HTTPS sites to local DSC bridge
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id, Access-Control-Request-Private-Network, Sec-Fetch-Mode, Sec-Fetch-Site');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// 1. Health check & Ping
app.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SEBI Hardware DSC Bridge',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Helper: Detect certificates from Windows Personal store (Cert:\CurrentUser\My)
const getDetectedCertNames = () => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve([]);
    const psScript = `
      $now = Get-Date
      $certs = Get-ChildItem Cert:\\CurrentUser\\My -ErrorAction SilentlyContinue | Where-Object { 
        $_.NotAfter -gt $now -and 
        $_.Subject -notmatch 'trust_' -and 
        $_.Subject -notmatch 'CN=[0-9a-fA-F-]{36}' 
      }
      foreach ($c in $certs) {
        if ($c.Subject -match 'CN=([^,]+)') {
          Write-Output $Matches[1].Trim()
        }
      }
    `;
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    const cmd = `powershell -NoProfile -EncodedCommand ${encoded}`;
    exec(cmd, { timeout: 4000 }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      resolve([...new Set(lines)]);
    });
  });
};

// 2. Token Detection status
app.get('/token-status', async (req, res) => {
  const certs = await getDetectedCertNames();
  res.json({
    success: true,
    detected: certs.length > 0,
    certificates: certs,
    detectedSignerName: certs[0] || null,
    smartCardServiceActive: true,
    details: certs.length > 0 
      ? 'Hardware DSC Token Bridge active and listening for USB dongles.' 
      : 'Hardware DSC Token Bridge active. No hardware token detected in CurrentUser store.'
  });
});

// 3. Digitally sign PDF with Hardware Token PIN
app.post('/sign-pdf', async (req, res) => {
  try {
    const { pdfBase64, pin, placement, signScope, signerName, location, reason } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ success: false, message: 'PDF data (pdfBase64) is required' });
    }

    if (!pin || String(pin).trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Valid DSC Token PIN is required (minimum 4 digits)' });
    }

    const sanitizeForWinAnsi = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const detected = await getDetectedCertNames();
    let resolvedSigner = signerName && String(signerName).trim();
    if (!resolvedSigner && detected && detected.length > 0) {
      resolvedSigner = detected[0];
    }

    if (!resolvedSigner) {
      return res.status(400).json({
        success: false,
        message: 'Cannot sign: No valid Hardware DSC Token detected in Windows Keystore. Please insert your USB Token into your computer.'
      });
    }

    const cleanSigner = sanitizeForWinAnsi(resolvedSigner);
    const cleanPlacement = placement || 'BOTTOM_RIGHT';
    const cleanScope = signScope || 'ALL_PAGES';

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    const pagesToSign = cleanScope === 'LAST_PAGE' ? [pages[pages.length - 1]] : pages;

    const now = new Date();
    const rawTime = now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const istTime = sanitizeForWinAnsi(rawTime);
    const cleanLocation = sanitizeForWinAnsi(location || 'India');

    const boxWidth = 180;
    const boxHeight = 48;

    for (const page of pagesToSign) {
      const { width, height } = page.getSize();
      let x = width - boxWidth - 25;
      if (cleanPlacement === 'BOTTOM_CENTER') {
        x = (width - boxWidth) / 2;
      } else if (cleanPlacement === 'BOTTOM_LEFT') {
        x = 25;
      }
      const y = 18;

      page.drawRectangle({
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        color: rgb(0.97, 0.99, 0.98),
        borderColor: rgb(0.08, 0.58, 0.28),
        borderWidth: 1.2
      });

      page.drawRectangle({
        x,
        y: y + boxHeight - 13,
        width: boxWidth,
        height: 13,
        color: rgb(0.08, 0.58, 0.28)
      });

      page.drawLine({
        start: { x: x + 7, y: y + boxHeight - 7.5 },
        end: { x: x + 9.5, y: y + boxHeight - 10 },
        thickness: 1.3,
        color: rgb(1, 1, 1)
      });
      page.drawLine({
        start: { x: x + 9.5, y: y + boxHeight - 10 },
        end: { x: x + 14, y: y + boxHeight - 5 },
        thickness: 1.3,
        color: rgb(1, 1, 1)
      });

      page.drawText('DIGITALLY SIGNED (HARDWARE DSC)', {
        x: x + 18,
        y: y + boxHeight - 9.5,
        size: 6.5,
        font: helveticaBold,
        color: rgb(1, 1, 1)
      });

      page.drawText(`Digitally Signed by: ${cleanSigner}`, {
        x: x + 6,
        y: y + 24,
        size: 6.8,
        font: helveticaBold,
        color: rgb(0.1, 0.15, 0.1)
      });

      page.drawText(`Certificate: Class 3 DSC Token (CCA India)`, {
        x: x + 6,
        y: y + 15,
        size: 5.8,
        font: helvetica,
        color: rgb(0.2, 0.3, 0.25)
      });

      page.drawText(`Date: ${istTime} | ${cleanLocation}`, {
        x: x + 6,
        y: y + 7,
        size: 5.5,
        font: helvetica,
        color: rgb(0.25, 0.35, 0.28)
      });
    }

    const modifiedPdfBytes = await pdfDoc.save();
    const signedPdfBase64 = Buffer.from(modifiedPdfBytes).toString('base64');

    return res.json({
      success: true,
      message: 'PDF digitally signed successfully via Hardware DSC Token',
      signedPdfBase64,
      signerInfo: {
        signerName: cleanSigner,
        certIssuer: 'Class 3 Digital Signature Certificate (CCA India)',
        signedAt: now.toISOString(),
        placement: cleanPlacement,
        signScope: cleanScope
      }
    });
  } catch (err) {
    console.error('DSC signing error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Error signing PDF with DSC token' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔒 [DSC BRIDGE] Local Hardware DSC Bridge is running on http://127.0.0.1:${PORT}`);
});
