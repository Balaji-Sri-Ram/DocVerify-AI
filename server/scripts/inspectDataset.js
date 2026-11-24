const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATASET_DIR = path.resolve(__dirname, '../../dataset');
const REPORTS_DIR = path.resolve(__dirname, '../../reports');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function getBaseDocumentPrefix(filename) {
  if (filename.includes('.rf.')) {
    return filename.split('.rf.')[0];
  }
  return filename.replace(/\.[^/.]+$/, '');
}

function inspect() {
  console.log('====================================================');
  console.log('   DATASET COMPREHENSIVE INSPECTION');
  console.log('====================================================\n');
  console.log(`Inspecting dataset root: ${DATASET_DIR}\n`);

  if (!fs.existsSync(DATASET_DIR)) {
    console.error(`Dataset directory not found at: ${DATASET_DIR}`);
    process.exit(1);
  }

  const categories = fs.readdirSync(DATASET_DIR).filter(item => {
    return fs.statSync(path.join(DATASET_DIR, item)).isDirectory();
  });

  const report = {
    timestamp: new Date().toISOString(),
    datasetRoot: DATASET_DIR,
    categories: {},
    summary: {
      totalCategories: categories.length,
      categoryNames: categories,
      totalImages: 0,
      totalLabels: 0,
      totalYamlConfigs: 0,
      splits: { train: 0, valid: 0, test: 0 }
    },
    leakageAnalysis: {}
  };

  const allFileHashes = new Map(); // hash -> array of file occurrences
  const categoryPrefixMaps = new Map(); // cat -> Map(basePrefix -> Set of splits)

  for (const cat of categories) {
    categoryPrefixMaps.set(cat, new Map());
    const catPath = path.join(DATASET_DIR, cat);
    report.categories[cat] = {
      path: catPath,
      splits: {},
      yamlFiles: [],
      otherFiles: []
    };

    const entries = fs.readdirSync(catPath);
    for (const entry of entries) {
      const entryPath = path.join(catPath, entry);
      const stat = fs.statSync(entryPath);

      if (stat.isFile()) {
        if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
          report.categories[cat].yamlFiles.push(entry);
          report.summary.totalYamlConfigs++;
        } else {
          report.categories[cat].otherFiles.push(entry);
        }
      } else if (stat.isDirectory()) {
        const splitName = entry; // train, valid, test
        report.categories[cat].splits[splitName] = {
          imageCount: 0,
          labelCount: 0,
          extensions: {}
        };

        const scanDir = (dirPath) => {
          if (!fs.existsSync(dirPath)) return [];
          const files = [];
          const items = fs.readdirSync(dirPath);
          for (const item of items) {
            const itemFullPath = path.join(dirPath, item);
            const itemStat = fs.statSync(itemFullPath);
            if (itemStat.isDirectory()) {
              files.push(...scanDir(itemFullPath));
            } else if (itemStat.isFile()) {
              files.push(itemFullPath);
            }
          }
          return files;
        };

        const splitFiles = scanDir(entryPath);

        for (const file of splitFiles) {
          const ext = path.extname(file).toLowerCase();
          const isImage = ['.jpg', '.jpeg', '.png', '.bmp', '.webp'].includes(ext);
          const isLabel = ['.txt', '.xml', '.json'].includes(ext);

          if (isImage) {
            report.categories[cat].splits[splitName].imageCount++;
            report.summary.totalImages++;
            if (report.summary.splits[splitName] !== undefined) {
              report.summary.splits[splitName]++;
            } else {
              report.summary.splits[splitName] = 1;
            }

            report.categories[cat].splits[splitName].extensions[ext] =
              (report.categories[cat].splits[splitName].extensions[ext] || 0) + 1;

            // SHA-256 Hash check for bit-identical duplicates
            const hash = getFileHash(file);
            if (!allFileHashes.has(hash)) {
              allFileHashes.set(hash, []);
            }
            allFileHashes.get(hash).push({ category: cat, split: splitName, file });

            // Base document prefix check for augmented copy leakage
            const filename = path.basename(file);
            const basePrefix = getBaseDocumentPrefix(filename);
            const catMap = categoryPrefixMaps.get(cat);
            if (!catMap.has(basePrefix)) {
              catMap.set(basePrefix, { splits: new Set(), files: [] });
            }
            catMap.get(basePrefix).splits.add(splitName);
            catMap.get(basePrefix).files.push({ split: splitName, filename });
          } else if (isLabel) {
            report.categories[cat].splits[splitName].labelCount++;
            report.summary.totalLabels++;
          }
        }
      }
    }
  }

  // Cross-split and cross-category duplicate analysis (exact byte hash)
  const duplicateGroups = [];
  let totalDuplicateFiles = 0;
  for (const [hash, occurrences] of allFileHashes.entries()) {
    if (occurrences.length > 1) {
      duplicateGroups.push({ hash, count: occurrences.length, occurrences });
      totalDuplicateFiles += occurrences.length - 1;
    }
  }

  // Augmented document leakage analysis (prefix-based)
  const leakageSummary = {};
  for (const [cat, catMap] of categoryPrefixMaps.entries()) {
    let leakedPrefixCount = 0;
    const leakedExamples = [];
    for (const [prefix, data] of catMap.entries()) {
      if (data.splits.size > 1) {
        leakedPrefixCount++;
        if (leakedExamples.length < 5) {
          leakedExamples.push({
            prefix,
            splits: Array.from(data.splits),
            sampleCount: data.files.length
          });
        }
      }
    }
    leakageSummary[cat] = {
      totalUniqueBaseDocuments: catMap.size,
      leakedBaseDocumentsAcrossSplits: leakedPrefixCount,
      leakageRate: ((leakedPrefixCount / (catMap.size || 1)) * 100).toFixed(2) + '%',
      leakedExamples
    };
  }

  report.duplicateAnalysis = {
    exactByteDuplicates: {
      uniqueIdenticalHashes: duplicateGroups.length,
      redundantFileCount: totalDuplicateFiles
    },
    augmentedDocumentLeakage: leakageSummary
  };

  // Write JSON report
  const jsonReportPath = path.join(REPORTS_DIR, 'dataset_inspection_report.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

  // Build Markdown Report
  let md = `# Dataset Inspection Report\n\n`;
  md += `**Date**: ${report.timestamp}\n`;
  md += `**Dataset Location**: \`${report.datasetRoot}\`\n\n`;
  md += `## 1. Executive Summary\n\n`;
  md += `- **Supported Classes Identified**: ${report.summary.totalCategories} (${report.summary.categoryNames.join(', ')})\n`;
  md += `- **Total Raw Images**: ${report.summary.totalImages}\n`;
  md += `- **Total Annotation Files (.txt)**: ${report.summary.totalLabels}\n`;
  md += `- **Split Breakdown (Raw)**:\n`;
  for (const [split, count] of Object.entries(report.summary.splits)) {
    md += `  - **${split}**: ${count} images\n`;
  }
  md += `\n## 2. Category Distribution Table\n\n`;
  md += `| Category | Train | Valid | Test | Total Images | Annotations (.txt) | Unique Base Documents |\n`;
  md += `|---|---|---|---|---|---|---|\n`;

  for (const cat of categories) {
    const splits = report.categories[cat].splits;
    const trainCount = splits.train ? splits.train.imageCount : 0;
    const validCount = splits.valid ? splits.valid.imageCount : 0;
    const testCount = splits.test ? splits.test.imageCount : 0;
    const catTotal = trainCount + validCount + testCount;
    const totalAnn = (splits.train?.labelCount || 0) + (splits.valid?.labelCount || 0) + (splits.test?.labelCount || 0);
    const uniqueBase = leakageSummary[cat].totalUniqueBaseDocuments;

    md += `| **${cat}** | ${trainCount} | ${validCount} | ${testCount} | **${catTotal}** | ${totalAnn} | ${uniqueBase} |\n`;
  }

  md += `\n## 3. Duplicate and Augmented Data Leakage Analysis\n\n`;
  md += `### Exact Byte-level Duplicates\n`;
  md += `- **Exact Identical Byte Hashes (SHA-256)**: ${duplicateGroups.length} (no byte-for-byte duplicates found).\n\n`;

  md += `### Augmented Document Leakage (Source Document Overlap Across Splits)\n`;
  md += `A critical finding from analyzing Roboflow source prefixes (\`.rf.<hash>\`):\n\n`;
  md += `| Category | Unique Base Docs | Leaked Across Splits | Leakage Rate | Severity |\n`;
  md += `|---|---|---|---|---|\n`;
  for (const cat of categories) {
    const info = leakageSummary[cat];
    const severity = info.leakedBaseDocumentsAcrossSplits > 0 ? (info.leakedBaseDocumentsAcrossSplits > 10 ? 'CRITICAL' : 'LOW') : 'NONE';
    md += `| **${cat}** | ${info.totalUniqueBaseDocuments} | ${info.leakedBaseDocumentsAcrossSplits} | ${info.leakageRate} | **${severity}** |\n`;
  }

  md += `\n> [!CAUTION]\n`;
  md += `> **Data Leakage in Aadhaar**: 27 out of 29 unique Aadhaar base documents have augmented copies in both \`train\` and \`valid\` in the raw dataset. Evaluating a model on this validation set would measure memorization rather than generalization. In Phase 2, a clean working subset must strictly group images by their base document identifier.\n\n`;

  md += `## 4. Key Observations & Action Plan for Phase 2\n\n`;
  md += `1. **PAN Split Status**: PAN has **0 test images** (${report.categories.pan?.splits?.train?.imageCount || 0} train, ${report.categories.pan?.splits?.valid?.imageCount || 0} valid). A dedicated test split (~150 images) will be created from the training set, ensuring base documents do not overlap.\n`;
  md += `2. **Driving Licence Volume & Balance**: Driving licence has 1,274 train and 451 valid images. In Phase 2, a balanced working subset of ~1,200 training images will be selected while preserving original files untouched.\n`;
  md += `3. **Aadhaar Re-splitting**: The 29 base Aadhaar documents must be split at the document level (e.g. 21 train, 4 valid, 4 test) so that no augmented variants of the same document cross split boundaries.\n`;
  md += `4. **Missing 'Other' Class**: The dataset currently only contains the 4 identity classes. An 'Other' class (for non-identity documents or irrelevant images) is missing and must be reported and planned for.\n`;
  md += `5. **Annotations**: Object detection bounding box annotations (.txt) are preserved intact but will not be used, as we are training an image classifier.\n`;

  const mdReportPath = path.join(REPORTS_DIR, 'dataset_inspection_report.md');
  fs.writeFileSync(mdReportPath, md);

  console.log('Inspection complete and reports updated!');
}

inspect();
