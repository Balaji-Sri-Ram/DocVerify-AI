const fs = require('fs');
const path = require('path');
const modelService = require('../src/services/modelService');

const WORKING_DATASET_DIR = path.resolve(__dirname, '../../dataset_working');
const CATEGORIES = ['pan', 'driving_license', 'aadhaar', 'passport'];

async function runVerification() {
  console.log('========================================================================');
  console.log('   PRACTICAL TEST: GENUINE IDENTITY DOCUMENT CATEGORY IDENTIFICATION');
  console.log('========================================================================\n');

  console.log('[1/3] Initializing Model Service (Local MobileNet v2 + Balanced Head)...');
  await modelService.initModel();
  console.log('[1/3] Model Service ready!\n');

  const summary = {};

  for (const cat of CATEGORIES) {
    const testDir = path.join(WORKING_DATASET_DIR, cat, 'test');
    const allFiles = fs.readdirSync(testDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    const sampleFiles = allFiles.slice(0, 15); // 15 genuine test images per class = 60 total

    console.log(`\n========================================================================`);
    console.log(` Testing Category: ${cat.toUpperCase()} (${sampleFiles.length} genuine images)`);
    console.log(`========================================================================`);

    let correctCount = 0;
    const catResults = [];

    for (let i = 0; i < sampleFiles.length; i++) {
      const fileName = sampleFiles[i];
      const filePath = path.join(testDir, fileName);
      const imageBuffer = fs.readFileSync(filePath);

      const prediction = await modelService.predictDocument(imageBuffer);
      const isCorrect = prediction.detectedType === cat;
      if (isCorrect) correctCount++;

      catResults.push({
        file: fileName,
        detectedType: prediction.detectedType,
        confidence: prediction.confidence,
        probabilities: prediction.probabilities,
        isCorrect
      });

      const mark = isCorrect ? '✅ CORRECT' : '❌ WRONG';
      const confStr = `${(prediction.confidence * 100).toFixed(1)}%`;
      console.log(`[#${(i+1).toString().padStart(2, '0')}] ${mark} Expected: ${cat.padEnd(15)} | Predicted: ${prediction.detectedType.padEnd(15)} | Conf: ${confStr.padEnd(7)}`);
    }

    const accuracy = (correctCount / sampleFiles.length) * 100;
    summary[cat] = {
      total: sampleFiles.length,
      correct: correctCount,
      accuracy: accuracy.toFixed(1) + '%',
      results: catResults
    };
    console.log(`--> Score for ${cat.toUpperCase()}: ${correctCount}/${sampleFiles.length} (${accuracy.toFixed(1)}%)`);
  }

  console.log('\n========================================================================');
  console.log('   FINAL SUMMARY: PRACTICAL IDENTIFICATION ACCURACY');
  console.log('========================================================================');
  let totalTested = 0;
  let totalCorrect = 0;

  for (const cat of CATEGORIES) {
    const s = summary[cat];
    totalTested += s.total;
    totalCorrect += s.correct;
    console.log(` - ${cat.padEnd(16)}: ${s.correct}/${s.total} correct (${s.accuracy})`);
  }
  const overallAcc = (totalCorrect / totalTested) * 100;
  console.log(`\nOverall Practical Identification: ${totalCorrect}/${totalTested} (${overallAcc.toFixed(1)}%)`);
  console.log('========================================================================\n');
}

runVerification().catch(err => {
  console.error('[Verification Failed]:', err);
  process.exit(1);
});
