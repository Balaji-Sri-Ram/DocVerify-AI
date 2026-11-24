const sharp = require('sharp');
const modelService = require('../services/modelService');
const ocrService = require('../services/ocrService');
const { assessImageQuality } = require('../services/imageQualityService');
const { evaluateDocumentRules } = require('../services/documentRules');
const { fuseMultimodalDecision, formatDocName } = require('../services/decisionEngine');
const { extractDocumentFields } = require('../services/fieldExtractor');

/**
 * POST /api/classify
 * Handles image upload and multimodal (Vision + OCR) document verification.
 */
async function classifyDocument(req, res, next) {
  try {
    // 1. Validate Image Upload
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        status: 'UNRECOGNIZED_DOCUMENT',
        selectedType: req.body?.selectedType || null,
        detectedType: null,
        confidence: 0,
        message: 'No image uploaded. Please select and upload a document image.'
      });
    }

    // 2. Validate Selected Document Type
    const rawSelectedType = req.body?.selectedType || req.body?.documentType;
    if (!rawSelectedType || typeof rawSelectedType !== 'string' || !rawSelectedType.trim()) {
      return res.status(400).json({
        success: false,
        status: 'UNRECOGNIZED_DOCUMENT',
        selectedType: null,
        detectedType: null,
        confidence: 0,
        message: 'Missing document selection. Please select one of: Aadhaar, PAN, Passport, or Driving Licence.'
      });
    }

    const selectedType = rawSelectedType.trim().toLowerCase().replace(/[\s-]/g, '_');
    if (!modelService.CLASSES.includes(selectedType)) {
      return res.status(400).json({
        success: false,
        status: 'UNRECOGNIZED_DOCUMENT',
        selectedType: rawSelectedType,
        detectedType: null,
        confidence: 0,
        message: `Invalid document selection '${rawSelectedType}'. Must be one of: ${modelService.CLASSES.join(', ')}.`
      });
    }

    // 3. Validate image integrity via Sharp (distinguish corrupt/broken images)
    try {
      const metadata = await sharp(req.file.buffer).metadata();
      if (!metadata.width || !metadata.height) {
        return res.status(400).json({
          success: false,
          status: 'UNRECOGNIZED_DOCUMENT',
          selectedType,
          detectedType: null,
          confidence: 0,
          message: 'The uploaded file is corrupt or not a readable image. Please upload a valid image file.'
        });
      }
    } catch (sharpErr) {
      return res.status(400).json({
        success: false,
        status: 'UNRECOGNIZED_DOCUMENT',
        selectedType,
        detectedType: null,
        confidence: 0,
        message: `Corrupt or unsupported image file: ${sharpErr.message}. Please upload a valid JPEG, PNG, or WebP image.`
      });
    }

    // 4. Run Multimodal Pipeline in Parallel:
    // Pipeline A: Visual MobileNet v2 Feature Extractor + Dense Head (Independent)
    // Pipeline B: Full-Resolution Multi-Language OCR Engine (Tesseract.js)
    // Pipeline C: Objective Image Quality & Sharpness Analysis (Laplacian Variance)
    console.log(`[ClassifyController] Processing document (Claimed: ${selectedType})...`);

    const [visualPrediction, ocrExtraction, imageQuality] = await Promise.all([
      modelService.predictDocument(req.file.buffer),
      ocrService.extractTextFromImage(req.file.buffer),
      assessImageQuality(req.file.buffer)
    ]);

    // 5. Evaluate Document-Specific Keywords & Patterns from OCR
    const ocrEvidence = evaluateDocumentRules(ocrExtraction.rawText);

    // 6. Decision Fusion Engine (Vision + OCR + Rules + Image Quality)
    const fusedDecision = fuseMultimodalDecision({
      selectedType,
      visualResult: visualPrediction,
      ocrEvidence,
      ocrTextConfidence: ocrExtraction.confidence,
      rawText: ocrExtraction.rawText,
      imageQuality
    });

    console.log(
      `[ClassifyController] Outcome: ${fusedDecision.status} | Final: ${fusedDecision.detectedType || 'None'} | Visual: ${visualPrediction.detectedType} (${(visualPrediction.confidence * 100).toFixed(1)}%) | OCR: ${fusedDecision.ocrResult.category || 'None'} (Score: ${fusedDecision.ocrResult.score})`
    );

    // 7. Extract structured identity fields from OCR text for automatic form auto-fill
    const targetType = fusedDecision.detectedType || selectedType;
    const extractedFields = extractDocumentFields(targetType, ocrExtraction.rawText, ocrExtraction.lines);

    // 8. Return Clean, Consistent JSON Response
    return res.status(200).json({
      success: true,
      ...fusedDecision,
      extractedFields,
      rawOcrText: ocrExtraction.rawText,
      // Backwards compatibility for existing UI
      probabilities: visualPrediction.probabilities
    });

  } catch (error) {
    console.error('[Classify Error]:', error);
    next(error);
  }
}

module.exports = {
  classifyDocument,
  formatDocName
};
