"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromPdf = extractTextFromPdf;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Extracts text from a PDF file.
 * First tries native text extraction (pdf-parse).
 * If the PDF is scanned (no readable text), falls back to pdf2pic + tesseract OCR.
 * If OCR also fails, returns empty string (caller handles graceful fallback).
 *
 * NOTE: Tesseract.js cannot read PDF files directly — only image files.
 * For scanned PDFs, pdf2pic (requires GraphicsMagick/ImageMagick) converts PDF pages to images first.
 */
async function extractTextFromPdf(filePath) {
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
    }
    catch (e) {
        console.log('[PDF] Native text extraction failed:', e?.message || e);
    }
    // Step 2: Try converting PDF page to image using pdf2pic, then run Tesseract OCR on the image
    // This requires GraphicsMagick or ImageMagick to be installed on the system.
    try {
        const { fromPath } = require('pdf2pic');
        const Tesseract = require('tesseract.js');
        const tmpDir = path.join(path.dirname(filePath), 'ocr_tmp');
        if (!fs.existsSync(tmpDir))
            fs.mkdirSync(tmpDir, { recursive: true });
        const converter = fromPath(filePath, {
            density: 200,
            saveFilename: 'ocr_page',
            savePath: tmpDir,
            format: 'png',
            width: 1700,
            height: 2200
        });
        const result = await converter(1, { responseType: 'image' });
        const imagePath = result.path;
        if (imagePath && fs.existsSync(imagePath)) {
            console.log('[OCR] PDF converted to image. Running Tesseract OCR...');
            const ocrResult = await Tesseract.recognize(imagePath, 'eng', {
                logger: () => { } // suppress verbose logs
            });
            // Cleanup temp image
            try {
                fs.unlinkSync(imagePath);
            }
            catch { }
            const ocrText = (ocrResult.data.text || '').trim();
            if (ocrText.length >= 10) {
                console.log('[OCR] Tesseract OCR succeeded. Length:', ocrText.length);
                return ocrResult.data.text;
            }
            console.log('[OCR] Tesseract returned minimal text.');
        }
    }
    catch (err) {
        // GraphicsMagick/ImageMagick not installed — OCR not available, graceful fallback
        console.log('[OCR] pdf2pic/Tesseract OCR not available:', err?.message || err);
    }
    // All methods failed — return empty (caller should show graceful fallback message)
    console.log('[PDF] Could not extract text from PDF. Returning empty string.');
    return '';
}
