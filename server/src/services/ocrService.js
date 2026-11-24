const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');

let worker = null;
let isInitializing = false;

/**
 * Initializes and caches a Tesseract.js worker with English and Hindi language support.
 */
async function initOcrWorker() {
  if (worker) return worker;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    return worker;
  }

  isInitializing = true;
  try {
    console.log('[OcrService] Initializing Tesseract worker (eng + hin + regional)...');
    worker = await createWorker(['eng', 'hin', 'tel', 'tam', 'kan', 'mal']);
    console.log('[OcrService] Tesseract worker ready.');
    return worker;
  } catch (err) {
    console.error('[OcrService] Failed to initialize worker:', err.message);
    throw err;
  } finally {
    isInitializing = false;
  }
}

/**
 * Preprocess high-resolution image buffer for optimal OCR:
 * - Converts to greyscale.
 * - Normalizes contrast.
 * - Sharpens text edges.
 * - Does NOT downscale to 224x224.
 *
 * @param {Buffer} buffer - Original image buffer
 * @returns {Promise<Buffer>} - Preprocessed buffer
 */
async function preprocessForOcr(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    
    let pipeline = sharp(buffer);

    // Auto-orient based on EXIF tag if present
    pipeline = pipeline.rotate();

    // Bound image dimensions for optimal OCR speed & accuracy:
    // Tesseract LSTM runs very slow on huge images (> 2000px) and glyphs become too large.
    // Downscale huge images (e.g. 4096px) to max 1600px (cuts OCR time by ~75%).
    // If image is exceptionally small (< 800px), upscale slightly to aid OCR text size.
    const maxDim = Math.max(meta.width || 0, meta.height || 0);
    if (maxDim > 1600) {
      pipeline = pipeline.resize({
        width: (meta.width && meta.width >= meta.height) ? 1600 : undefined,
        height: (meta.height && meta.height > meta.width) ? 1600 : undefined,
        fit: 'inside',
        withoutEnlargement: true
      });
    } else if (meta.width && meta.width < 800) {
      pipeline = pipeline.resize({ width: Math.min(meta.width * 2, 1600), withoutEnlargement: false });
    }

    // Enhance contrast and convert to greyscale for sharper text binarization
    const processedBuffer = await pipeline
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();

    return processedBuffer;
  } catch (err) {
    console.warn('[OcrService] Preprocessing warning, falling back to original buffer:', err.message);
    return buffer;
  }
}

/**
 * Extracts text from an image buffer using OCR with multi-pass fallback if needed.
 *
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<{text: string, confidence: number, lines: Array<string>}>}
 */
async function extractTextFromImage(imageBuffer) {
  const ocrWorker = await initOcrWorker();

  // Pass 1: Try preprocessed high-contrast buffer
  const preprocessedBuffer = await preprocessForOcr(imageBuffer);

  let result = await ocrWorker.recognize(preprocessedBuffer);
  let text = result.data.text || '';
  let confidence = result.data.confidence || 0;

  // If text is virtually empty, try original buffer directly as fallback
  if (text.trim().length < 10) {
    try {
      const fallbackResult = await ocrWorker.recognize(imageBuffer);
      if ((fallbackResult.data.text || '').trim().length > text.trim().length) {
        text = fallbackResult.data.text || '';
        confidence = fallbackResult.data.confidence || 0;
      }
    } catch (_) {
      // Keep first result
    }
  }

  // Normalize lines and remove excessive whitespace
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);

  return {
    rawText: text,
    confidence: Math.round(confidence),
    lines: rawLines
  };
}

/**
 * Cleanly terminates the OCR worker on server shutdown.
 */
async function terminateWorker() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

module.exports = {
  initOcrWorker,
  preprocessForOcr,
  extractTextFromImage,
  terminateWorker
};
