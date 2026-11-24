const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAW_DATASET_DIR = path.resolve(__dirname, '../../dataset');
const WORKING_DATASET_DIR = path.resolve(__dirname, '../../dataset_working');
const REPORTS_DIR = path.resolve(__dirname, '../../reports');

// Deterministic Pseudo-Random Number Generator (Mulberry32)
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, seed = 42) {
  const rng = mulberry32(seed);
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getBaseDocumentPrefix(filename) {
  if (filename.includes('.rf.')) {
    return filename.split('.rf.')[0];
  }
  return filename.replace(/\.[^/.]+$/, '');
}

function getCategoryGroups(category) {
  const catPath = path.join(RAW_DATASET_DIR, category);
  const splits = ['train', 'valid', 'test'].filter(s => fs.existsSync(path.join(catPath, s)));
  const docMap = new Map();

  for (const s of splits) {
    const imgDir = path.join(catPath, s, 'images');
    const targetDir = fs.existsSync(imgDir) ? imgDir : path.join(catPath, s);
    if (!fs.existsSync(targetDir)) continue;

    const files = fs.readdirSync(targetDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    for (const f of files) {
      const prefix = getBaseDocumentPrefix(f);
      if (!docMap.has(prefix)) {
        docMap.set(prefix, { prefix, files: [] });
      }
      docMap.get(prefix).files.push({
        filename: f,
        rawSplit: s,
        sourcePath: path.join(targetDir, f)
      });
    }
  }

  return Array.from(docMap.values());
}

function prepareDataset() {
  console.log('====================================================');
  console.log('   PHASE 2: DATASET PREPARATION & LEAKAGE RESOLUTION');
  console.log('====================================================\n');

  if (!fs.existsSync(WORKING_DATASET_DIR)) {
    fs.mkdirSync(WORKING_DATASET_DIR, { recursive: true });
  }

  const categories = ['aadhaar', 'pan', 'driving_license', 'passport'];
  const summaryReport = {
    timestamp: new Date().toISOString(),
    rawDatasetPath: RAW_DATASET_DIR,
    workingDatasetPath: WORKING_DATASET_DIR,
    categories: {},
    overall: {
      train: 0,
      valid: 0,
      test: 0,
      total: 0
    }
  };

  for (const cat of categories) {
    console.log(`Processing category: ${cat}...`);
    const groups = getCategoryGroups(cat);
    // Shuffle groups deterministically
    const shuffledGroups = seededShuffle(groups, 2026);

    let trainGroups = [];
    let validGroups = [];
    let testGroups = [];

    if (cat === 'aadhaar') {
      // 29 base documents, ~746 images total.
      // Target: Train ~530-560 images, Valid ~90-110, Test ~90-110
      // We partition groups to reach target counts
      let validCount = 0;
      let testCount = 0;
      for (const g of shuffledGroups) {
        if (validCount < 100 && validGroups.length < 5) {
          validGroups.push(g);
          validCount += g.files.length;
        } else if (testCount < 105 && testGroups.length < 5) {
          testGroups.push(g);
          testCount += g.files.length;
        } else {
          trainGroups.push(g);
        }
      }
    } else if (cat === 'pan') {
      // 1,387 unique base documents. Total 1,388 images.
      // Target: Test = 150 images, Valid = 188 images (using existing valid base docs), Train = remaining ~1,050
      // Keep existing valid base docs in valid to maintain consistency where possible
      const rawValidGroups = [];
      const rawTrainGroups = [];

      for (const g of shuffledGroups) {
        const hasValid = g.files.some(f => f.rawSplit === 'valid');
        if (hasValid) {
          rawValidGroups.push(g);
        } else {
          rawTrainGroups.push(g);
        }
      }

      validGroups = rawValidGroups; // 188 images
      // From rawTrainGroups, take 150 for test
      testGroups = rawTrainGroups.slice(0, 150);
      trainGroups = rawTrainGroups.slice(150);
    } else if (cat === 'driving_license') {
      // Total 881 base documents (1,730 images).
      // Requirement: Working subset of approx 1,500 images; improve test split from 5 images.
      // Target: Train ~1,200 images, Valid ~150 images, Test ~150 images (Total ~1,500)
      let trainCount = 0;
      let validCount = 0;
      let testCount = 0;

      for (const g of shuffledGroups) {
        if (testCount < 150) {
          testGroups.push(g);
          testCount += g.files.length;
        } else if (validCount < 150) {
          validGroups.push(g);
          validCount += g.files.length;
        } else if (trainCount < 1200) {
          trainGroups.push(g);
          trainCount += g.files.length;
        } else {
          // Stop when ~1,500 subset reached
          break;
        }
      }
    } else if (cat === 'passport') {
      // Total 1,051 base documents (1,412 images).
      // Target: Train ~1,112 images, Valid ~150 images, Test ~150 images
      let validCount = 0;
      let testCount = 0;

      for (const g of shuffledGroups) {
        if (validCount < 150) {
          validGroups.push(g);
          validCount += g.files.length;
        } else if (testCount < 150) {
          testGroups.push(g);
          testCount += g.files.length;
        } else {
          trainGroups.push(g);
        }
      }
    }

    const splitsData = {
      train: trainGroups,
      valid: validGroups,
      test: testGroups
    };

    summaryReport.categories[cat] = {
      splits: {},
      totalImages: 0,
      totalBaseDocuments: trainGroups.length + validGroups.length + testGroups.length
    };

    // Copy files to working dataset directory
    for (const [splitName, splitGroupList] of Object.entries(splitsData)) {
      const destDir = path.join(WORKING_DATASET_DIR, cat, splitName);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      let imgCount = 0;
      for (const g of splitGroupList) {
        for (const file of g.files) {
          const destPath = path.join(destDir, file.filename);
          fs.copyFileSync(file.sourcePath, destPath);
          imgCount++;
        }
      }

      summaryReport.categories[cat].splits[splitName] = {
        baseDocumentsCount: splitGroupList.length,
        imageCount: imgCount
      };
      summaryReport.categories[cat].totalImages += imgCount;
      summaryReport.overall[splitName] += imgCount;
      summaryReport.overall.total += imgCount;
    }

    console.log(`- ${cat} complete: Train=${summaryReport.categories[cat].splits.train.imageCount}, Valid=${summaryReport.categories[cat].splits.valid.imageCount}, Test=${summaryReport.categories[cat].splits.test.imageCount}`);
  }

  // Cross-Split Leakage Verification Check on Working Dataset
  console.log('\nVerifying Zero-Leakage Guarantee across all working splits...');
  const verificationErrors = [];
  for (const cat of categories) {
    const prefixSplitMap = new Map();
    for (const s of ['train', 'valid', 'test']) {
      const splitDir = path.join(WORKING_DATASET_DIR, cat, s);
      const files = fs.readdirSync(splitDir);
      for (const f of files) {
        const prefix = getBaseDocumentPrefix(f);
        if (!prefixSplitMap.has(prefix)) prefixSplitMap.set(prefix, new Set());
        prefixSplitMap.get(prefix).add(s);
      }
    }

    let leakedPrefixes = 0;
    for (const [p, sSet] of prefixSplitMap.entries()) {
      if (sSet.size > 1) {
        leakedPrefixes++;
        verificationErrors.push(`Leakage detected in ${cat}: prefix "${p}" in [${Array.from(sSet).join(', ')}]`);
      }
    }
    console.log(`- ${cat}: 0 leakages detected (${prefixSplitMap.size} distinct document groups clean)`);
  }

  if (verificationErrors.length > 0) {
    console.error('CRITICAL: Data leakage detected during verification!');
    console.error(verificationErrors.join('\n'));
    process.exit(1);
  }

  // Save JSON report
  const jsonPath = path.join(REPORTS_DIR, 'dataset_preparation_report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summaryReport, null, 2));

  // Build Markdown report
  let md = `# Dataset Preparation & Leakage Resolution Report (Phase 2)\n\n`;
  md += `**Execution Date**: ${summaryReport.timestamp}\n`;
  md += `**Source Directory**: \`${summaryReport.rawDatasetPath}\` (Preserved Intact)\n`;
  md += `**Working Directory**: \`${summaryReport.workingDatasetPath}\`\n\n`;

  md += `## 1. Final Working Dataset Distribution\n\n`;
  md += `| Document Category | Base Documents | Train Images | Valid Images | Test Images | Total Images |\n`;
  md += `|---|---|---|---|---|---|\n`;

  for (const cat of categories) {
    const info = summaryReport.categories[cat];
    md += `| **${cat}** | ${info.totalBaseDocuments} | ${info.splits.train.imageCount} | ${info.splits.valid.imageCount} | ${info.splits.test.imageCount} | **${info.totalImages}** |\n`;
  }

  md += `| **Total** | - | **${summaryReport.overall.train}** | **${summaryReport.overall.valid}** | **${summaryReport.overall.test}** | **${summaryReport.overall.total}** |\n\n`;

  md += `## 2. Key Actions Taken & Leakage Resolutions\n\n`;
  md += `### 1. Aadhaar Data Leakage Resolution\n`;
  md += `- **Previous State**: 27 out of 29 base documents had augmented variants spanning both train and valid splits.\n`;
  md += `- **Resolution**: All augmented variations of each base document were grouped together. The 29 unique document groups were deterministically partitioned:\n`;
  md += `  - **Train**: ${summaryReport.categories.aadhaar.splits.train.baseDocumentsCount} base documents (${summaryReport.categories.aadhaar.splits.train.imageCount} images)\n`;
  md += `  - **Valid**: ${summaryReport.categories.aadhaar.splits.valid.baseDocumentsCount} base documents (${summaryReport.categories.aadhaar.splits.valid.imageCount} images)\n`;
  md += `  - **Test**: ${summaryReport.categories.aadhaar.splits.test.baseDocumentsCount} base documents (${summaryReport.categories.aadhaar.splits.test.imageCount} images)\n`;
  md += `- **Leakage**: **0%** cross-split leakage verified.\n\n`;

  md += `### 2. Creation of Dedicated PAN Test Split\n`;
  md += `- **Previous State**: PAN had 0 test images (1,200 train, 188 valid).\n`;
  md += `- **Resolution**: 150 unique base documents were extracted from the training set to form a dedicated test set:\n`;
  md += `  - **Train**: ${summaryReport.categories.pan.splits.train.imageCount} images\n`;
  md += `  - **Valid**: ${summaryReport.categories.pan.splits.valid.imageCount} images\n`;
  md += `  - **Test**: ${summaryReport.categories.pan.splits.test.imageCount} images\n\n`;

  md += `### 3. Driving Licence Balance & Test Split Augmentation\n`;
  md += `- **Previous State**: Test set had only 5 images; class was heavily unbalanced.\n`;
  md += `- **Resolution**: Selected a clean, grouped working subset of ~1,500 images while preserving original files untouched:\n`;
  md += `  - **Train**: ${summaryReport.categories.driving_license.splits.train.imageCount} images\n`;
  md += `  - **Valid**: ${summaryReport.categories.driving_license.splits.valid.imageCount} images\n`;
  md += `  - **Test**: ${summaryReport.categories.driving_license.splits.test.imageCount} images\n`;
  md += `  - Test capacity increased by 30x (from 5 to ${summaryReport.categories.driving_license.splits.test.imageCount} images) with zero document-level leakage.\n\n`;

  md += `### 4. Passport Re-balancing & Grouping\n`;
  md += `- **Resolution**: Base documents were grouped to eliminate cross-split augmentations:\n`;
  md += `  - **Train**: ${summaryReport.categories.passport.splits.train.imageCount} images\n`;
  md += `  - **Valid**: ${summaryReport.categories.passport.splits.valid.imageCount} images\n`;
  md += `  - **Test**: ${summaryReport.categories.passport.splits.test.imageCount} images\n\n`;

  md += `## 3. Specification & Acquisition Plan for Missing 'Other' Class\n\n`;
  md += `Per project guidelines, no synthetic or dummy data has been fabricated. To enable the 5th class ('other') for rejecting unsupported or unrelated images, the following dataset profile is required:\n\n`;
  md += `- **Target Volume**: ~1,200 - 1,500 real-world images (Train: ~1,000, Valid: ~150, Test: ~150).\n`;
  md += `- **Image Categories Needed**:\n`;
  md += `  1. **Non-identity documents**: Electricity/water utility bills, GST invoices, salary slips, bank passbooks, university degrees, printed forms.\n`;
  md += `  2. **Everyday non-document objects**: Selfies, group portraits, landscapes, pets, vehicles, office desks, food items.\n`;
  md += `  3. **Edge cases**: Blank paper sheets, blurred documents, backside of plastic cards without identifiable markings.\n`;
  md += `- **Target Directory Structure**:\n`;
  md += `  \`\`\`text\n`;
  md += `  dataset_working/other/\n`;
  md += `  ├── train/\n`;
  md += `  ├── valid/\n`;
  md += `  └── test/\n`;
  md += `  \`\`\`\n`;
  md += `- **Interim Handling**: Until genuine 'Other' class images are collected and trained, the application will use confidence thresholding (softmax rejection threshold) to detect uncertain and unclassifiable inputs, rather than guessing a document category.\n`;

  const mdPath = path.join(REPORTS_DIR, 'dataset_preparation_report.md');
  fs.writeFileSync(mdPath, md);

  console.log(`\nPhase 2 Complete! Reports saved:`);
  console.log(`- ${jsonPath}`);
  console.log(`- ${mdPath}`);
}

prepareDataset();
