import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts text from a PDF file.
 * First tries native text extraction (pdf-parse).
 * If the PDF is scanned (no readable text), falls back to pdf2pic + tesseract OCR.
 * If OCR also fails, returns empty string (caller handles graceful fallback).
 * 
 * NOTE: Tesseract.js cannot read PDF files directly — only image files.
 * For scanned PDFs, pdf2pic (requires GraphicsMagick/ImageMagick) converts PDF pages to images first.
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  // Step 1: Try native text extraction
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const text = (data.text || '').trim();
    if (text.length >= 30) {
      console.log('[PDF] Native text extraction successful. Length:', text.length);
      return data.text;
    }
    console.log('[PDF] Native text too short (' + text.length + ' chars). Attempting OCR...');
  } catch (e: any) {
    console.log('[PDF] Native text extraction failed:', e?.message || e);
  }

  // Step 2: Try converting PDF page to image using pdf2pic, then run Tesseract OCR on the image
  // This requires GraphicsMagick or ImageMagick to be installed on the system.
  try {
    const { fromPath } = require('pdf2pic');
    const Tesseract = require('tesseract.js');

    const tmpDir = path.join(path.dirname(filePath), 'ocr_tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const converter = fromPath(filePath, {
      density: 200,
      saveFilename: 'ocr_page',
      savePath: tmpDir,
      format: 'png',
      width: 1700,
      height: 2200
    });

    const result = await converter(1, { responseType: 'image' });
    const imagePath = (result as any).path;

    if (imagePath && fs.existsSync(imagePath)) {
      console.log('[OCR] PDF converted to image. Running Tesseract OCR...');
      const ocrResult = await Tesseract.recognize(imagePath, 'eng', {
        logger: () => {} // suppress verbose logs
      });
      // Cleanup temp image
      try { fs.unlinkSync(imagePath); } catch {}

      const ocrText = (ocrResult.data.text || '').trim();
      if (ocrText.length >= 10) {
        console.log('[OCR] Tesseract OCR succeeded. Length:', ocrText.length);
        return ocrResult.data.text;
      }
      console.log('[OCR] Tesseract returned minimal text.');
    }
  } catch (err: any) {
    // GraphicsMagick/ImageMagick not installed — OCR not available, graceful fallback
    console.log('[OCR] pdf2pic/Tesseract OCR not available:', err?.message || err);
  }

  // All methods failed — return empty (caller should show graceful fallback message)
  console.log('[PDF] Could not extract text from PDF. Returning empty string.');
  return '';
}
