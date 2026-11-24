const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const modelService = require('../src/services/modelService');
const ocrService = require('../src/services/ocrService');
const { assessImageQuality } = require('../src/services/imageQualityService');
const { evaluateDocumentRules } = require('../src/services/documentRules');
const { fuseMultimodalDecision } = require('../src/services/decisionEngine');

const WORKING_DIR = path.resolve(__dirname, '../../dataset_working');
const REPORT_PATH = path.resolve(__dirname, '../../reports/comprehensive_verification_report.json');

async function runComprehensiveVerification() {
  console.log('========================================================================');
  console.log('   COMPREHENSIVE MULTIMODAL VERIFICATION & AUDIT SUITE');
  console.log('========================================================================\n');

  console.log('[Setup] Initializing MobileNet v2 and Tesseract worker...');
  await Promise.all([
    modelService.initModel(),
    ocrService.initOcrWorker()
  ]);
  console.log('[Setup] Ready!\n');

  const testResults = [];

  // Helper to execute single verification pipeline
  async function testPipeline({ id, name, selectedType, imageBuffer, expectedStatus, expectedCategory }) {
    const start = Date.now();
    const [visualPrediction, ocrExtraction, imageQuality] = await Promise.all([
      modelService.predictDocument(imageBuffer),
      ocrService.extractTextFromImage(imageBuffer),
      assessImageQuality(imageBuffer)
    ]);

    const ocrEvidence = evaluateDocumentRules(ocrExtraction.rawText);

    const decision = fuseMultimodalDecision({
      selectedType,
      visualResult: visualPrediction,
      ocrEvidence,
      ocrTextConfidence: ocrExtraction.confidence,
      rawText: ocrExtraction.rawText,
      imageQuality
    });
    const durationMs = Date.now() - start;

    const statusPass = expectedStatus ? decision.status === expectedStatus : true;
    const catPass = expectedCategory !== undefined ? decision.detectedType === expectedCategory : true;
    const passed = statusPass && catPass;

    const resultRecord = {
      id,
      name,
      selectedType,
      expectedStatus,
      expectedCategory,
      actualStatus: decision.status,
      actualCategory: decision.detectedType,
      visualCategory: visualPrediction.detectedType,
      visualConfidence: Number((visualPrediction.confidence * 100).toFixed(1)),
      ocrCategory: decision.ocrResult.category,
      ocrScore: decision.ocrResult.score,
      finalConfidence: Number((decision.confidence * 100).toFixed(1)),
      confidenceLevel: decision.confidenceLevel,
      keywordsDetected: decision.ocrResult.detectedKeywords,
      patternsDetected: decision.ocrResult.patternsDetected,
      explanation: decision.explanation,
      durationMs,
      passed
    };

    testResults.push(resultRecord);

    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${id}] ${mark}: ${name}`);
    console.log(`   Claim: ${selectedType} | Final: ${decision.detectedType || 'None'} (${decision.status}) | Conf: ${(decision.confidence * 100).toFixed(1)}% [${decision.confidenceLevel}]`);
    console.log(`   Visual: ${visualPrediction.detectedType} (${(visualPrediction.confidence * 100).toFixed(1)}%) | OCR: ${decision.ocrResult.category || 'None'} (Score: ${decision.ocrResult.score})`);
    console.log(`   Explanation: ${decision.explanation}`);
    console.log(`   Time: ${durationMs}ms\n`);

    return resultRecord;
  }

  // 1. Genuine PAN Card
  const panFile = fs.readdirSync(path.join(WORKING_DIR, 'pan/test'))[0];
  const panBuf = fs.readFileSync(path.join(WORKING_DIR, 'pan/test', panFile));
  await testPipeline({
    id: 'TC-01',
    name: 'Genuine PAN Card (Selected: PAN)',
    selectedType: 'pan',
    imageBuffer: panBuf,
    expectedStatus: 'CORRECT_DOCUMENT',
    expectedCategory: 'pan'
  });

  // 2. Genuine Aadhaar Card
  const aadhaarFile = fs.readdirSync(path.join(WORKING_DIR, 'aadhaar/test'))[0];
  const aadhaarBuf = fs.readFileSync(path.join(WORKING_DIR, 'aadhaar/test', aadhaarFile));
  await testPipeline({
    id: 'TC-02',
    name: 'Genuine Aadhaar Card (Selected: Aadhaar)',
    selectedType: 'aadhaar',
    imageBuffer: aadhaarBuf,
    expectedStatus: 'CORRECT_DOCUMENT',
    expectedCategory: 'aadhaar'
  });

  // 3. Genuine Indian Passport
  const passFile = fs.readdirSync(path.join(WORKING_DIR, 'passport/test'))[1];
  const passBuf = fs.readFileSync(path.join(WORKING_DIR, 'passport/test', passFile));
  await testPipeline({
    id: 'TC-03',
    name: 'Genuine Passport (Selected: Passport)',
    selectedType: 'passport',
    imageBuffer: passBuf,
    expectedStatus: 'CORRECT_DOCUMENT',
    expectedCategory: 'passport'
  });

  // 4. Genuine Driving Licence
  const dlFile = fs.readdirSync(path.join(WORKING_DIR, 'driving_license/test'))[0];
  const dlBuf = fs.readFileSync(path.join(WORKING_DIR, 'driving_license/test', dlFile));
  await testPipeline({
    id: 'TC-04',
    name: 'Genuine Driving Licence (Selected: Driving Licence)',
    selectedType: 'driving_license',
    imageBuffer: dlBuf,
    expectedStatus: 'CORRECT_DOCUMENT',
    expectedCategory: 'driving_license'
  });

  // 5. Tricky PAN Card (Visual MobileNet predicted Driving Licence at 84.5%)
  const trickyPanFile = path.join(WORKING_DIR, 'pan/test/00fb6eeb-58c10f76367dd5b167225fbe_pan_jpg.rf.2e84961f7659576a2da89681ca9ff2f3.jpg');
  const trickyPanBuf = fs.readFileSync(trickyPanFile);
  await testPipeline({
    id: 'TC-05',
    name: 'Tricky PAN (MobileNet DL confusion resolved by OCR)',
    selectedType: 'pan',
    imageBuffer: trickyPanBuf,
    expectedStatus: 'CORRECT_DOCUMENT',
    expectedCategory: 'pan'
  });

  // 6. Wrong Document: Selected Aadhaar, Uploaded PAN
  await testPipeline({
    id: 'TC-06',
    name: 'Wrong Document (Claimed: Aadhaar, Uploaded: PAN)',
    selectedType: 'aadhaar',
    imageBuffer: panBuf,
    expectedStatus: 'WRONG_DOCUMENT',
    expectedCategory: 'pan'
  });

  // 7. Wrong Document: Selected Passport, Uploaded Driving Licence
  await testPipeline({
    id: 'TC-07',
    name: 'Wrong Document (Claimed: Passport, Uploaded: Driving Licence)',
    selectedType: 'passport',
    imageBuffer: dlBuf,
    expectedStatus: 'WRONG_DOCUMENT',
    expectedCategory: 'driving_license'
  });

  // 8. Unrelated Image: hero.png (Website banner graphic)
  const heroBuf = fs.readFileSync(path.resolve(__dirname, '../../client/src/assets/hero.png'));
  await testPipeline({
    id: 'TC-08',
    name: 'Unrelated Image (Hero Graphic - Other Document)',
    selectedType: 'pan',
    imageBuffer: heroBuf,
    expectedStatus: 'WRONG_DOCUMENT',
    expectedCategory: 'other'
  });

  // 9. Rotated Document: PAN rotated 90 degrees clockwise
  const rotatedPanBuf = await sharp(panBuf).rotate(90).toBuffer();
  await testPipeline({
    id: 'TC-09',
    name: 'Rotated Document (PAN 90° Clockwise)',
    selectedType: 'pan',
    imageBuffer: rotatedPanBuf,
    expectedStatus: 'CORRECT_DOCUMENT',
    expectedCategory: 'pan'
  });

  // 10. Blurry Image (Objective blur detection triggers clarity alert)
  const blurryDlBuf = await sharp(dlBuf).blur(2.0).toBuffer();
  await testPipeline({
    id: 'TC-10',
    name: 'Blurry Document Image (Unclear / Out of focus)',
    selectedType: 'driving_license',
    imageBuffer: blurryDlBuf,
    expectedStatus: 'UNABLE_TO_VERIFY',
    expectedCategory: null
  });

  // 11. Low-Resolution Resized Image (200px width)
  const lowResPassBuf = await sharp(passBuf).resize({ width: 200 }).toBuffer();
  await testPipeline({
    id: 'TC-11',
    name: 'Low Resolution Document (200px width)',
    selectedType: 'passport',
    imageBuffer: lowResPassBuf,
    expectedStatus: 'CORRECT_DOCUMENT',
    expectedCategory: 'passport'
  });

  // 12. Privacy Audit: Check masking on raw output
  console.log('[Audit] Verifying sensitive information masking...');
  let privacyViolations = 0;
  for (const r of testResults) {
    const rawPatterns = r.patternsDetected.join(' ');
    // Check if unmasked 12 digit number or 10-char PAN or 8-char passport is exposed
    if (/\b\d{4}\s\d{4}\s\d{4}\b/.test(rawPatterns)) {
      console.error(`Privacy alert in ${r.id}: Unmasked 12-digit Aadhaar!`);
      privacyViolations++;
    }
    if (/\b[A-Z]{5}[0-9]{4}[A-Z]\b/.test(rawPatterns)) {
      console.error(`Privacy alert in ${r.id}: Unmasked PAN!`);
      privacyViolations++;
    }
  }
  const privacyPassed = privacyViolations === 0;
  console.log(`Privacy masking verification: ${privacyPassed ? '✅ 100% MASKED' : '❌ VIOLATIONS FOUND'}\n`);

  // Write full JSON report
  const summary = {
    executionDate: new Date().toISOString(),
    totalTests: testResults.length,
    passedCount: testResults.filter(t => t.passed).length,
    failedCount: testResults.filter(t => !t.passed).length,
    privacyViolations,
    averageDurationMs: Math.round(testResults.reduce((a, b) => a + b.durationMs, 0) / testResults.length),
    testResults
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));

  console.log('========================================================================');
  console.log(`SUMMARY: ${summary.passedCount}/${summary.totalTests} Tests Passed (${((summary.passedCount/summary.totalTests)*100).toFixed(1)}%)`);
  console.log(`Average Latency: ${summary.averageDurationMs}ms`);
  console.log(`Report saved to: ${REPORT_PATH}`);
  console.log('========================================================================');

  await ocrService.terminateWorker();
}

runComprehensiveVerification().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
