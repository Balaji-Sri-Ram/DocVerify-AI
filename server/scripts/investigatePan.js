const fs = require('fs');
const path = require('path');
const modelService = require('../src/services/modelService');

const WORKING_DATASET_DIR = path.resolve(__dirname, '../../dataset_working');
const RAW_DATASET_DIR = path.resolve(__dirname, '../../dataset');
const REPORTS_DIR = path.resolve(__dirname, '../../reports');

async function investigate() {
  console.log('====================================================');
  console.log('   PHASE 2: INVESTIGATE PAN PREDICTION PROBLEM');
  console.log('====================================================\n');

  console.log('[Setup] Initializing model service...');
  await modelService.initModel();
  console.log('[Setup] Model service initialized.\n');

  const categories = ['pan', 'driving_license', 'aadhaar', 'passport'];
  const results = {};

  for (const cat of categories) {
    const testDir = path.join(WORKING_DATASET_DIR, cat, 'test');
    const files = fs.readdirSync(testDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f)).slice(0, 10);
    results[cat] = [];

    console.log(`\n================ Testing 10 ${cat.toUpperCase()} Images ================`);
    let correct = 0;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const filePath = path.join(testDir, f);
      const buf = fs.readFileSync(filePath);
      const pred = await modelService.predictDocument(buf);

      const isCorrect = pred.detectedType === cat;
      if (isCorrect) correct++;

      const item = {
        index: i + 1,
        file: f,
        actualType: cat,
        detectedType: pred.detectedType,
        confidence: pred.confidence,
        isCorrect,
        probabilities: pred.probabilities
      };
      results[cat].push(item);

      const mark = isCorrect ? '✅ CORRECT' : '❌ WRONG';
      console.log(`[#${(i+1).toString().padStart(2, '0')}] ${mark} Actual: ${cat.padEnd(15)} | Predicted: ${pred.detectedType.padEnd(15)} | Conf: ${(pred.confidence * 100).toFixed(1)}%`);
      console.log(`     Probabilities:`, pred.probabilities);
    }
    console.log(`--> Score for ${cat}: ${correct}/10 correct (${(correct / 10 * 100).toFixed(0)}%)`);
  }

  // Also check if there are any uploaded/downloaded files in common locations or workspace
  console.log('\nChecking workspace for any uploaded test PAN images...');
  const possiblePaths = [
    'D:\\VickeyApps Intern\\Document Classification',
    'D:\\VickeyApps Intern\\Document Classification\\server',
    'D:\\VickeyApps Intern\\Document Classification\\client'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const items = fs.readdirSync(p).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
      if (items.length > 0) {
        console.log(`Found image files in ${p}:`, items);
      }
    }
  }

  // Save report
  const jsonPath = path.join(REPORTS_DIR, 'pan_investigation_results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  let md = `# PAN Classification Problem Investigation Report\n\n`;
  md += `**Execution Date**: ${new Date().toISOString()}\n\n`;
  md += `## 1. 40-Image Ground-Truth Benchmark Results\n\n`;
  md += `| Category | Tested | Correct | Misclassified | Accuracy | Major Confusion Pattern |\n`;
  md += `|---|---|---|---|---|---|\n`;

  for (const cat of categories) {
    const list = results[cat];
    const corr = list.filter(x => x.isCorrect).length;
    const mis = list.filter(x => !x.isCorrect);
    const confusionCounts = {};
    for (const m of mis) {
      confusionCounts[m.detectedType] = (confusionCounts[m.detectedType] || 0) + 1;
    }
    const confPattern = Object.entries(confusionCounts).map(([k, v]) => `${k} (${v})`).join(', ') || 'None';
    md += `| **${cat}** | 10 | ${corr} | ${mis.length} | **${(corr/10*100).toFixed(0)}%** | ${confPattern} |\n`;
  }

  md += `\n## 2. Detailed Predictions on 10 PAN Card Test Images\n\n`;
  md += `| # | File | Ground Truth | Prediction | Confidence | Probabilities (Aadh / DL / PAN / Pass) |\n`;
  md += `|---|---|---|---|---|---|\n`;
  for (const item of results.pan) {
    const probs = item.probabilities;
    const pStr = `${(probs.aadhaar*100).toFixed(1)}% / ${(probs.driving_license*100).toFixed(1)}% / ${(probs.pan*100).toFixed(1)}% / ${(probs.passport*100).toFixed(1)}%`;
    md += `| ${item.index} | \`${item.file.slice(0, 30)}...\` | pan | **${item.detectedType}** | ${(item.confidence*100).toFixed(1)}% | ${pStr} |\n`;
  }

  const mdPath = path.join(REPORTS_DIR, 'pan_investigation_results.md');
  fs.writeFileSync(mdPath, md);

  console.log(`\nInvestigation complete! Report written to:`);
  console.log(`- ${jsonPath}`);
  console.log(`- ${mdPath}`);
}

investigate().catch(console.error);
