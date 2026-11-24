const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const modelService = require('../src/services/modelService');
const ocrService = require('../src/services/ocrService');
const { evaluateDocumentRules } = require('../src/services/documentRules');
const { fuseMultimodalDecision } = require('../src/services/decisionEngine');

const WORKING_DIR = path.resolve(__dirname, '../../dataset_working');

async function testEdgeCases() {
  console.log('========================================================================');
  console.log('   EDGE CASES & NOISE BENCHMARK');
  console.log('   (Screenshots, Cropped, Inverted, Blurry, Low-Quality, Random)');
  console.log('========================================================================\n');

  await Promise.all([
    modelService.initModel(),
    ocrService.initOcrWorker()
  ]);

  const panFile = path.join(WORKING_DIR, 'pan/test', fs.readdirSync(path.join(WORKING_DIR, 'pan/test'))[0]);
  const dlFile = path.join(WORKING_DIR, 'driving_license/test', fs.readdirSync(path.join(WORKING_DIR, 'driving_license/test'))[0]);
  const aadhFile = path.join(WORKING_DIR, 'aadhaar/test', fs.readdirSync(path.join(WORKING_DIR, 'aadhaar/test'))[0]);

  const panBase = fs.readFileSync(panFile);
  const dlBase = fs.readFileSync(dlFile);

  const testCases = [];

  // 1. Cropped PAN (only bottom 50% of card)
  const meta = await sharp(panBase).metadata();
  const croppedPan = await sharp(panBase)
    .extract({ left: 0, top: Math.floor(meta.height / 2), width: meta.width, height: Math.floor(meta.height / 2) })
    .toBuffer();
  testCases.push({ name: 'Cropped PAN (Bottom 50% Only)', claim: 'pan', buffer: croppedPan });

  // 2. Inverted Driving Licence (180 degrees upside down)
  const invertedDl = await sharp(dlBase).rotate(180).toBuffer();
  testCases.push({ name: 'Inverted Driving Licence (180° Upside Down)', claim: 'driving_license', buffer: invertedDl });

  // 3. Heavy Blurry Aadhaar (sigma 4.0)
  const heavyBlur = await sharp(fs.readFileSync(aadhFile)).blur(4.0).toBuffer();
  testCases.push({ name: 'Heavy Blurry Aadhaar (sigma=4.0)', claim: 'aadhaar', buffer: heavyBlur });

  // 4. Extremely Low Quality JPEG (quality=10)
  const lowQualPan = await sharp(panBase).jpeg({ quality: 10 }).toBuffer();
  testCases.push({ name: 'Extremely Low-Quality JPEG (Q=10)', claim: 'pan', buffer: lowQualPan });

  // 5. Random Noise Image (Pure RGB Noise)
  const noiseRaw = Buffer.alloc(300 * 300 * 3);
  for (let i = 0; i < noiseRaw.length; i++) noiseRaw[i] = Math.floor(Math.random() * 256);
  const randomNoise = await sharp(noiseRaw, { raw: { width: 300, height: 300, channels: 3 } }).jpeg().toBuffer();
  testCases.push({ name: 'Random Color Noise (300x300)', claim: 'pan', buffer: randomNoise });

  // 6. UI Screenshot (Real application screenshot from reports)
  const screenshotBuf = fs.readFileSync(path.resolve(__dirname, '../../reports/screenshots/01_home_page.png'));
  testCases.push({ name: 'UI Desktop Screenshot', claim: 'aadhaar', buffer: screenshotBuf });

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const [visualPrediction, ocrExtraction] = await Promise.all([
      modelService.predictDocument(tc.buffer),
      ocrService.extractTextFromImage(tc.buffer)
    ]);

    const ocrEvidence = evaluateDocumentRules(ocrExtraction.rawText);

    const decision = fuseMultimodalDecision({
      selectedType: tc.claim,
      visualResult: visualPrediction,
      ocrEvidence,
      ocrTextConfidence: ocrExtraction.confidence,
      rawText: ocrExtraction.rawText
    });

    console.log(`[EC-${i+1}] ${tc.name}`);
    console.log(`      Claim: ${tc.claim} | Status: ${decision.status} | Final Detected: ${decision.detectedType || 'None'}`);
    console.log(`      Visual: ${visualPrediction.detectedType} (${(visualPrediction.confidence * 100).toFixed(1)}%) | OCR Score: ${decision.ocrResult.score}`);
    console.log(`      Explanation: ${decision.explanation}\n`);
  }

  await ocrService.terminateWorker();
}

testEdgeCases().catch(console.error);
