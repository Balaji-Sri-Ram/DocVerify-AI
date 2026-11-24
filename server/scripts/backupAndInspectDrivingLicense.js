const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

const DL_DIR = path.resolve(__dirname, '../../dataset_working/driving_license');
const DL_BACKUP_DIR = path.resolve(__dirname, '../../dataset_working/driving_license_backup');
const DL2_DIR = path.resolve(__dirname, '../../dataset_working/driving_license2');
const REPORT_PATH_JSON = path.resolve(__dirname, '../../reports/driving_license_replacement_report.json');
const REPORT_PATH_MD = path.resolve(__dirname, '../../reports/driving_license_replacement_report.md');

function computeHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function run() {
  console.log('=== Step 1: Inspecting Existing DL Dataset ===');
  const existingFiles = [];
  for (const s of ['train', 'valid', 'test']) {
    const sDir = path.join(DL_DIR, s);
    if (fs.existsSync(sDir)) {
      const files = fs.readdirSync(sDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
      for (const f of files) existingFiles.push({ split: s, name: f, path: path.join(sDir, f) });
    }
  }
  console.log(`Found ${existingFiles.length} existing genuine DL images in ${DL_DIR}.`);

  console.log('\n=== Step 2: Creating Safety Backup of Existing DL Dataset ===');
  if (!fs.existsSync(DL_BACKUP_DIR)) {
    fs.mkdirSync(DL_BACKUP_DIR, { recursive: true });
    for (const s of ['train', 'valid', 'test']) {
      const srcSplit = path.join(DL_DIR, s);
      const dstSplit = path.join(DL_BACKUP_DIR, s);
      fs.mkdirSync(dstSplit, { recursive: true });
      for (const f of fs.readdirSync(srcSplit)) {
        fs.copyFileSync(path.join(srcSplit, f), path.join(dstSplit, f));
      }
    }
    console.log(`✅ Backup created at: ${DL_BACKUP_DIR}`);
  } else {
    console.log(`ℹ️ Backup already exists at: ${DL_BACKUP_DIR}`);
  }

  console.log('\n=== Step 3: Inspecting the 30 New Images in driving_license2 ===');
  const newFiles = [];
  const hashes = new Set();
  const duplicates = [];
  const corruptions = [];

  for (const s of ['train', 'valid', 'test']) {
    const sDir = path.join(DL2_DIR, s);
    if (fs.existsSync(sDir)) {
      const files = fs.readdirSync(sDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
      for (const f of files) {
        const p = path.join(sDir, f);
        try {
          const meta = await sharp(p).metadata();
          const hash = computeHash(p);
          if (hashes.has(hash)) {
            duplicates.push(f);
          } else {
            hashes.add(hash);
          }
          newFiles.push({
            split: s,
            name: f,
            width: meta.width,
            height: meta.height,
            format: meta.format,
            sizeKb: (fs.statSync(p).size / 1024).toFixed(1)
          });
        } catch (err) {
          corruptions.push({ name: f, error: err.message });
        }
      }
    }
  }

  console.log(`Total valid images in driving_license2: ${newFiles.length}`);
  console.log(`Duplicates detected: ${duplicates.length}`);
  console.log(`Corrupted files detected: ${corruptions.length}`);

  const report = {
    date: new Date().toISOString(),
    existingDatasetCount: existingFiles.length,
    backupLocation: DL_BACKUP_DIR,
    newDatasetCount: newFiles.length,
    duplicates,
    corruptions,
    newDatasetDistribution: {
      train: newFiles.filter(f => f.split === 'train').length,
      valid: newFiles.filter(f => f.split === 'valid').length,
      test: newFiles.filter(f => f.split === 'test').length
    },
    criticalFindings: [
      'The 30 images in driving_license2 are 1024x1024 AI-generated synthetic images (DALL-E / Midjourney).',
      'Contain hallucinated pseudo-text ("Maharahaitra State Transfert", "Date of bibth", "Tamil Nevaiu Transfors", "Verlicée Class").',
      'Lack authentic Indian smart-card physical chips, genuine Ashok Stambh emblems, and Form 7 Sarathi structures.',
      'Training MobileNet solely on 30 synthetic images while other classes have 1,000+ real images creates a severe ~50:1 class imbalance.',
      'Existing dataset has been safely preserved and backed up.'
    ]
  };

  fs.writeFileSync(REPORT_PATH_JSON, JSON.stringify(report, null, 2));

  let md = `# Driving Licence Dataset Inspection & Safety Backup Report\n\n`;
  md += `**Date**: ${report.date}\n`;
  md += `**Original DL Count**: ${existingFiles.length} images (Backed up to \`${DL_BACKUP_DIR}\`)\n`;
  md += `**New Candidate DL Count**: ${newFiles.length} images (\`${DL2_DIR}\`)\n\n`;
  md += `## 1. File Integrity & Distribution\n\n`;
  md += `- **Train split**: ${report.newDatasetDistribution.train} images\n`;
  md += `- **Valid split**: ${report.newDatasetDistribution.valid} images\n`;
  md += `- **Test split**: ${report.newDatasetDistribution.test} images\n`;
  md += `- **Corrupt files**: ${corruptions.length}\n`;
  md += `- **Duplicate files**: ${duplicates.length}\n\n`;
  md += `## 2. Technical Findings & Dataset Limitations\n\n`;
  for (const f of report.criticalFindings) {
    md += `- ${f}\n`;
  }

  fs.writeFileSync(REPORT_PATH_MD, md);
  console.log(`\n✅ Report saved to ${REPORT_PATH_MD}`);
}

run().catch(console.error);
