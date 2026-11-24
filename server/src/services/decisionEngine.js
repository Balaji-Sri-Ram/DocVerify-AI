/**
 * Hybrid Multimodal Decision Engine.
 * Fuses Computer Vision (MobileNet v2), OCR Evidence (Tesseract.js),
 * and Objective Image Clarity / Sharpness Analysis.
 */

const CATEGORIES = ['aadhaar', 'pan', 'passport', 'driving_license'];

const DISPLAY_NAMES = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  passport: 'Indian Passport',
  driving_license: 'Driving Licence',
  other: 'Other'
};

function getConfidenceLevel(confidence) {
  if (confidence >= 0.85) return 'VERY_HIGH';
  if (confidence >= 0.70) return 'HIGH';
  if (confidence >= 0.50) return 'MEDIUM';
  return 'LOW';
}

function formatDocName(type) {
  if (type === 'other') return 'Other Document';
  return DISPLAY_NAMES[type] || type || 'Unknown Document';
}

/**
 * Compiles privacy-safe category evidence for API response.
 */
function compileCategoryEvidence(ocrEvidence, visualProbs) {
  const categoryEvidence = {};
  for (const cat of CATEGORIES) {
    categoryEvidence[cat] = {
      score: ocrEvidence?.[cat]?.score || 0,
      strongMatches: ocrEvidence?.[cat]?.strongMatches || [],
      supportingMatches: ocrEvidence?.[cat]?.supportingMatches || [],
      patterns: ocrEvidence?.[cat]?.patterns || [],
      visualProbability: visualProbs?.[cat] || 0
    };
  }
  return categoryEvidence;
}

/**
 * Fuses visual prediction, OCR evidence, and image quality into a verified decision.
 *
 * @param {Object} params
 * @param {string} params.selectedType - User claimed document type
 * @param {Object} params.visualResult - { detectedType, confidence, probabilities } from MobileNet v2
 * @param {Object} params.ocrEvidence - Evidence object from evaluateDocumentRules
 * @param {number} params.ocrTextConfidence - Raw Tesseract word confidence
 * @param {string} params.rawText - Extracted text for diagnostic length check
 * @param {Object} params.imageQuality - { sharpnessScore, isBlurry, isTooDark, isGlared, isClear }
 * @returns {Object} - Complete fused decision with transparent explanations
 */
function fuseMultimodalDecision({
  selectedType,
  visualResult,
  ocrEvidence,
  ocrTextConfidence = 0,
  rawText = '',
  imageQuality = null
}) {
  const visualCategory = visualResult?.detectedType || null;
  const visualConfidence = visualResult?.confidence || 0;
  const visualProbs = visualResult?.probabilities || {};

  // Rank OCR evidence across categories
  const ocrRanking = CATEGORIES.map(cat => ({
    category: cat,
    score: ocrEvidence?.[cat]?.score || 0,
    hasStrong: ocrEvidence?.[cat]?.hasStrongIndicator || false,
    strongMatches: ocrEvidence?.[cat]?.strongMatches || [],
    supportingMatches: ocrEvidence?.[cat]?.supportingMatches || [],
    patterns: ocrEvidence?.[cat]?.patterns || []
  })).sort((a, b) => b.score - a.score);

  const topOcr = ocrRanking[0] || { score: 0, category: null, strongMatches: [], patterns: [], supportingMatches: [] };
  const secondOcr = ocrRanking[1] || { score: 0, category: null, strongMatches: [], patterns: [], supportingMatches: [] };

  const ocrHasSubstantialMatch = topOcr.score >= 35;
  const ocrCategory = ocrHasSubstantialMatch ? topOcr.category : null;
  const ocrScore = topOcr.score;

  // Track conflict between top 2 OCR matches
  const ocrInternalConflict = topOcr.score >= 35 && secondOcr.score >= 35 && (topOcr.score - secondOcr.score < 15);

  let finalCategory = null;
  let finalConfidence = 0;
  let decisionStatus = 'UNRECOGNIZED_DOCUMENT';
  let reasoning = [];
  let confidenceLevel = 'LOW';

  // ---------------------------------------------------------------------------
  // 1. OBJECTIVE IMAGE CLARITY & BLURRINESS EVALUATION
  // If image is blurry/unclear and OCR cannot extract text, report unclarity.
  // Never guess a document category on blurry/degraded inputs.
  // ---------------------------------------------------------------------------
  if (imageQuality?.isBlurry && !ocrHasSubstantialMatch) {
    reasoning.push(
      `Image sharpness analysis detected that the document is blurry or out of focus (sharpness score: ${imageQuality.sharpnessScore}). Document text and fine details could not be legibly resolved. Please hold the document steady and provide a clear, well-lit image.`
    );

    return {
      status: 'UNABLE_TO_VERIFY',
      selectedType,
      detectedType: null,
      confidence: 0,
      confidenceLevel: 'LOW',
      message: 'The uploaded image is not clear or blurry. Please upload or capture a clearer, well-lit image of your document.',
      explanation: reasoning.join(' '),
      visualResult: {
        category: visualCategory,
        confidence: Number(visualConfidence.toFixed(4)),
        probabilities: visualProbs
      },
      ocrResult: {
        category: null,
        score: 0,
        textConfidence: ocrTextConfidence,
        detectedKeywords: [],
        patternsDetected: []
      },
      imageQuality,
      evidence: compileCategoryEvidence(ocrEvidence, visualProbs)
    };
  }

  if (imageQuality?.isTooDark && !ocrHasSubstantialMatch) {
    reasoning.push(
      `Image lighting analysis detected low brightness (${imageQuality.avgBrightness}/255). Text and document details are obscured in shadow. Please provide a well-lit image.`
    );

    return {
      status: 'UNABLE_TO_VERIFY',
      selectedType,
      detectedType: null,
      confidence: 0,
      confidenceLevel: 'LOW',
      message: 'The uploaded image is too dark to verify. Please upload a well-lit image.',
      explanation: reasoning.join(' '),
      visualResult: {
        category: visualCategory,
        confidence: Number(visualConfidence.toFixed(4)),
        probabilities: visualProbs
      },
      ocrResult: {
        category: null,
        score: 0,
        textConfidence: ocrTextConfidence,
        detectedKeywords: [],
        patternsDetected: []
      },
      imageQuality,
      evidence: compileCategoryEvidence(ocrEvidence, visualProbs)
    };
  }

  // ---------------------------------------------------------------------------
  // 2. OCR INTERNAL CONFLICT (Ambiguous text across multiple documents)
  // ---------------------------------------------------------------------------
  if (ocrInternalConflict) {
    decisionStatus = 'UNABLE_TO_VERIFY';
    reasoning.push(
      `Conflicting textual indicators detected between ${formatDocName(topOcr.category)} (${topOcr.strongMatches.concat(topOcr.patterns).join(', ')}) and ${formatDocName(secondOcr.category)} (${secondOcr.strongMatches.concat(secondOcr.patterns).join(', ')}).`
    );
  }

  // ---------------------------------------------------------------------------
  // 3. OCR PATTERN MATCH (Confirm the document with matching OCR pattern)
  // ---------------------------------------------------------------------------
  else if (ocrHasSubstantialMatch) {
    const PVC_CARD_CATEGORIES = ['aadhaar', 'pan', 'driving_license'];
    const isPvcCardAmbiguity = (
      PVC_CARD_CATEGORIES.includes(ocrCategory) &&
      PVC_CARD_CATEGORIES.includes(visualCategory) &&
      ocrCategory !== visualCategory
    );

    if (ocrCategory === visualCategory) {
      // Both OCR pattern and visual prediction agree
      finalCategory = visualCategory;
      finalConfidence = Math.min(0.99, (visualConfidence * 0.5) + ((ocrScore / 100) * 0.5));
      confidenceLevel = 'VERY_HIGH';
      reasoning.push(
        `Strong Multimodal Agreement: Visual model (${(visualConfidence * 100).toFixed(1)}%) and text analysis confirm ${formatDocName(finalCategory)}.`
      );
      if (topOcr.strongMatches.length > 0) {
        reasoning.push(`Identified key textual markers: ${topOcr.strongMatches.join(', ')}.`);
      }
      if (topOcr.patterns.length > 0) {
        reasoning.push(`Validated document pattern: ${topOcr.patterns.join(', ')}.`);
      }
    } else if (isPvcCardAmbiguity || topOcr.hasStrong || topOcr.score >= 35) {
      // Text pattern definitively establishes the document category
      finalCategory = ocrCategory;
      finalConfidence = Math.min(0.95, 0.4 * (visualProbs[ocrCategory] || 0) + 0.6 * (ocrScore / 100));
      confidenceLevel = getConfidenceLevel(finalConfidence);
      const markers = topOcr.strongMatches.concat(topOcr.patterns).concat(topOcr.supportingMatches).join(', ');
      reasoning.push(
        `Verified text markers (${markers || 'Document pattern'}) confirmed category as ${formatDocName(ocrCategory)}.`
      );
    } else {
      finalCategory = ocrCategory;
      finalConfidence = (ocrScore / 100) * 0.85;
      confidenceLevel = getConfidenceLevel(finalConfidence);
      reasoning.push(
        `Text pattern evidence outweighed visual prediction of ${formatDocName(visualCategory)}.`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 4. NO OCR PATTERN, BUT VISUAL MODEL STRONGLY RECOGNIZES DOCUMENT
  // (Only for clear images where document features are unambiguous, e.g. Passport cover)
  // ---------------------------------------------------------------------------
  else if (visualConfidence >= 0.85) {
    finalCategory = visualCategory;
    finalConfidence = visualConfidence * 0.88;
    confidenceLevel = getConfidenceLevel(finalConfidence);
    reasoning.push(
      `Visual identification: Document layout strongly matched ${formatDocName(visualCategory)} (${(visualConfidence * 100).toFixed(1)}%).`
    );
  }

  // ---------------------------------------------------------------------------
  // 5. CLEAR IMAGE, BUT MATCHES NONE OF OUR 4 DOCUMENTS (Unrelated Image / Other)
  // ---------------------------------------------------------------------------
  else {
    finalCategory = 'other';
    finalConfidence = 0;
    decisionStatus = 'WRONG_DOCUMENT';
    confidenceLevel = 'LOW';
    reasoning.push(
      'The uploaded image does not match any of the 4 supported Indian identity documents (Aadhaar Card, PAN Card, Indian Passport, or Driving Licence).'
    );
  }

  // Derived confidence level
  if (finalCategory && finalCategory !== 'other') {
    confidenceLevel = getConfidenceLevel(finalConfidence);
  }

  // ---------------------------------------------------------------------------
  // Final Outcome Mapping
  // ---------------------------------------------------------------------------
  let message = '';
  if (finalCategory && finalCategory !== 'other') {
    if (finalCategory === selectedType) {
      decisionStatus = 'CORRECT_DOCUMENT';
      message = `Your uploaded document matches the selected ${formatDocName(selectedType)} category.`;
    } else {
      decisionStatus = 'WRONG_DOCUMENT';
      message = `You selected ${formatDocName(selectedType)}, but the uploaded document appears to be a ${formatDocName(finalCategory)}.`;
    }
  } else if (finalCategory === 'other') {
    decisionStatus = 'WRONG_DOCUMENT';
    message = 'Wrong document uploaded. Please upload the selected document.';
  } else if (decisionStatus === 'UNABLE_TO_VERIFY') {
    message = 'The document could not be verified confidently. Please upload a clearer image.';
  } else {
    decisionStatus = 'UNRECOGNIZED_DOCUMENT';
    message = 'We could not identify this document. Please upload a clear image of a supported document.';
  }

  return {
    status: decisionStatus,
    selectedType,
    detectedType: finalCategory,
    confidence: Number(finalConfidence.toFixed(4)),
    confidenceLevel,
    message,
    explanation: reasoning.join(' '),
    visualResult: {
      category: visualCategory,
      confidence: Number(visualConfidence.toFixed(4)),
      probabilities: visualProbs
    },
    ocrResult: {
      category: ocrCategory,
      score: ocrScore,
      textConfidence: ocrTextConfidence,
      detectedKeywords: topOcr?.strongMatches.concat(topOcr?.supportingMatches) || [],
      patternsDetected: topOcr?.patterns || []
    },
    imageQuality,
    evidence: compileCategoryEvidence(ocrEvidence, visualProbs)
  };
}

module.exports = {
  fuseMultimodalDecision,
  formatDocName
};
