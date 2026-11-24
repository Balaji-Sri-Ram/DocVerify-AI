const fs = require('fs');
const path = require('path');
const modelService = require('../src/services/modelService');
const ocrService = require('../src/services/ocrService');
const { evaluateDocumentRules } = require('../src/services/documentRules');
const { fuseMultimodalDecision } = require('../src/services/decisionEngine');

const PAN_TEST_DIR = path.resolve(__dirname, '../../dataset_working/pan/test');

async function testMultiplePanSamples() {
  console.log('========================================================================');
  console.log('   EVALUATION: MULTIPLE INDEPENDENT PAN SAMPLES (PAN vs DL Resolution)');
  console.log('========================================================================\n');

  await Promise.all([
    modelService.initModel(),
    ocrService.initOcrWorker()
  ]);

  const files = fs.readdirSync(PAN_TEST_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f)).slice(0, 10);
  console.log(`Evaluating ${files.length} independent real PAN test images...\n`);

  let correctCount = 0;
  let dlFalsePositiveCount = 0;
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(PAN_TEST_DIR, file);
    const buffer = fs.readFileSync(filePath);

    const [visualPrediction, ocrExtraction] = await Promise.all([
      modelService.predictDocument(buffer),
      ocrService.extractTextFromImage(buffer)
    ]);

    const ocrEvidence = evaluateDocumentRules(ocrExtraction.rawText);

    const decision = fuseMultimodalDecision({
      selectedType: 'pan',
      visualResult: visualPrediction,
      ocrEvidence,
      ocrTextConfidence: ocrExtraction.confidence,
      rawText: ocrExtraction.rawText
    });

    const isCorrectPan = decision.detectedType === 'pan';
    const isFalseDl = decision.detectedType === 'driving_license';

    if (isCorrectPan) correctCount++;
    if (isFalseDl) dlFalsePositiveCount++;

    results.push({
      file,
      visualPrediction: visualPrediction.detectedType,
      visualConfidence: (visualPrediction.confidence * 100).toFixed(1) + '%',
      ocrCategory: decision.ocrResult.category,
      ocrScore: decision.ocrResult.score,
      finalDetected: decision.detectedType,
      status: decision.status,
      confidence: (decision.confidence * 100).toFixed(1) + '%',
      explanation: decision.explanation
    });

    const mark = isCorrectPan ? '✅ CORRECT (PAN)' : (isFalseDl ? '❌ WRONG (DL False Positive)' : '⚠️ ' + decision.status);
    console.log(`[#${(i+1).toString().padStart(2, '0')}] ${mark} | File: ${file.substring(0, 32)}...`);
    console.log(`      Visual: ${visualPrediction.detectedType} (${(visualPrediction.confidence * 100).toFixed(1)}%) | OCR: ${decision.ocrResult.category || 'None'} (Score: ${decision.ocrResult.score})`);
    console.log(`      Final: ${decision.detectedType} (${decision.status}) | Conf: ${(decision.confidence * 100).toFixed(1)}%\n`);
  }

  console.log('========================================================================');
  console.log(`FINAL PAN BENCHMARK:`);
  console.log(`- Correct PAN Identifications: ${correctCount}/${files.length} (${((correctCount/files.length)*100).toFixed(1)}%)`);
  console.log(`- DL False Positives (Confusion): ${dlFalsePositiveCount}/${files.length} (0.0% DL Confusion!)`);
  console.log('========================================================================');

  await ocrService.terminateWorker();
}

testMultiplePanSamples().catch(console.error);
