const fs = require('fs');
const path = require('path');
const modelService = require('../src/services/modelService');
const ocrService = require('../src/services/ocrService');
const { evaluateDocumentRules } = require('../src/services/documentRules');
const { fuseMultimodalDecision } = require('../src/services/decisionEngine');

const WORKING_DIR = path.resolve(__dirname, '../../dataset_working');

async function runTests() {
  console.log('========================================================================');
  console.log('   HYBRID MULTIMODAL VERIFICATION TEST SUITE (VISION + OCR + RULES)');
  console.log('========================================================================\n');

  console.log('[1/2] Initializing MobileNet v2 & Tesseract OCR Worker...');
  await Promise.all([
    modelService.initModel(),
    ocrService.initOcrWorker()
  ]);
  console.log('[1/2] Both engines ready!\n');

  const testCases = [
    {
      label: 'Genuine PAN Card (Selected: pan)',
      category: 'pan',
      selectedType: 'pan',
      file: fs.readdirSync(path.join(WORKING_DIR, 'pan/test'))[0],
      dir: path.join(WORKING_DIR, 'pan/test')
    },
    {
      label: 'Genuine Aadhaar Card (Selected: aadhaar)',
      category: 'aadhaar',
      selectedType: 'aadhaar',
      file: fs.readdirSync(path.join(WORKING_DIR, 'aadhaar/test'))[0],
      dir: path.join(WORKING_DIR, 'aadhaar/test')
    },
    {
      label: 'Genuine Passport (Selected: passport)',
      category: 'passport',
      selectedType: 'passport',
      file: fs.readdirSync(path.join(WORKING_DIR, 'passport/test'))[1],
      dir: path.join(WORKING_DIR, 'passport/test')
    },
    {
      label: 'Genuine Driving Licence (Selected: driving_license)',
      category: 'driving_license',
      selectedType: 'driving_license',
      file: fs.readdirSync(path.join(WORKING_DIR, 'driving_license/test'))[0],
      dir: path.join(WORKING_DIR, 'driving_license/test')
    },
    {
      label: 'Wrong Document Test (Selected Aadhaar, but uploaded PAN)',
      category: 'pan',
      selectedType: 'aadhaar',
      file: fs.readdirSync(path.join(WORKING_DIR, 'pan/test'))[0],
      dir: path.join(WORKING_DIR, 'pan/test')
    }
  ];

  for (const tc of testCases) {
    console.log(`------------------------------------------------------------------------`);
    console.log(`TEST: ${tc.label}`);
    console.log(`File: ${tc.file}`);
    console.log(`User Claim: ${tc.selectedType.toUpperCase()}`);

    const filePath = path.join(tc.dir, tc.file);
    const buffer = fs.readFileSync(filePath);

    const [visualPrediction, ocrExtraction] = await Promise.all([
      modelService.predictDocument(buffer),
      ocrService.extractTextFromImage(buffer)
    ]);

    const ocrEvidence = evaluateDocumentRules(ocrExtraction.rawText);

    const decision = fuseMultimodalDecision({
      selectedType: tc.selectedType,
      visualResult: visualPrediction,
      ocrEvidence,
      ocrTextConfidence: ocrExtraction.confidence,
      rawText: ocrExtraction.rawText
    });

    console.log(`-> Visual Prediction: ${visualPrediction.detectedType} (${(visualPrediction.confidence * 100).toFixed(1)}%)`);
    console.log(`-> OCR Detected:      ${decision.ocrResult.category || 'None'} (Score: ${decision.ocrResult.score})`);
    console.log(`-> Keywords/Patterns: [${decision.ocrResult.detectedKeywords.concat(decision.ocrResult.patternsDetected).join(', ')}]`);
    console.log(`-> FINAL OUTCOME:     ${decision.status} (Detected: ${decision.detectedType || 'None'})`);
    console.log(`-> Final Confidence:  ${(decision.confidence * 100).toFixed(1)}% (${decision.confidenceLevel})`);
    console.log(`-> Explanation:       ${decision.explanation}`);
  }

  await ocrService.terminateWorker();
  console.log('\n========================================================================');
  console.log('   HYBRID VERIFICATION TEST SUITE FINISHED');
  console.log('========================================================================');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
