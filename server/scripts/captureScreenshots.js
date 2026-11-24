const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const BROWSER_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ALT_BROWSER_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const OUT_DIR_REPORTS = path.resolve(__dirname, '../../reports/screenshots');
const OUT_DIR_ARTIFACTS = 'C:\\Users\\ramup\\.gemini\\antigravity\\brain\\06a84466-42fb-497e-beb0-d58444ab9b68\\screenshots';

const WORKING_DATASET_DIR = path.resolve(__dirname, '../../dataset_working');

function getSampleImagePath(category, index = 0) {
  const dir = path.join(WORKING_DATASET_DIR, category, 'test');
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  const chosen = Math.min(index, files.length - 1);
  return path.join(dir, files[chosen]);
}

async function saveScreenshot(page, filename) {
  const p1 = path.join(OUT_DIR_REPORTS, filename);
  const p2 = path.join(OUT_DIR_ARTIFACTS, filename);

  await page.screenshot({ path: p1, fullPage: false });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  const exePath = fs.existsSync(BROWSER_PATH) ? BROWSER_PATH : ALT_BROWSER_PATH;
  console.log('Using browser executable:', exePath);

  const browser = await puppeteer.launch({
    executablePath: exePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // 1. Screenshot 1: Home Page
  console.log('Capturing Home Page...');
  await saveScreenshot(page, '01_home_page.png');

  // 2. Navigate to Verify Document tab
  console.log('Navigating to Verify Document...');
  const navButtons = await page.$$('nav button');
  if (navButtons.length >= 2) {
    await navButtons[1].click();
  }
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot 2: Document Upload Page
  console.log('Capturing Upload Page...');
  await saveScreenshot(page, '02_upload_page.png');

  // 3. Scenario: MATCH (Aadhaar selected + Aadhaar image)
  console.log('Executing MATCH scenario (Aadhaar + Aadhaar)...');
  const aadhaarImgPath = getSampleImagePath('aadhaar', 4);
  const fileInput = await page.waitForSelector('input[type="file"]');
  await fileInput.uploadFile(aadhaarImgPath);
  await new Promise(r => setTimeout(r, 1000));

  // Click Verify Document button
  const verifyBtn = await page.waitForSelector('#verify-doc-btn');
  await verifyBtn.click();

  // Wait for MATCH result
  await page.waitForFunction(() => document.body.innerText.includes('DOCUMENT MATCHED'), { timeout: 25000 });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot(page, '03_match_result.png');

  // 4. Scenario: MISMATCH (Aadhaar selected + PAN image)
  console.log('Executing MISMATCH scenario (Aadhaar + PAN)...');
  const resetBtn1 = await page.waitForSelector('#reset-btn');
  await resetBtn1.click();
  await new Promise(r => setTimeout(r, 800));

  // Upload PAN image
  const panImgPath = getSampleImagePath('pan', 0);
  const fileInput2 = await page.waitForSelector('input[type="file"]');
  await fileInput2.uploadFile(panImgPath);
  await new Promise(r => setTimeout(r, 1000));

  const verifyBtn2 = await page.waitForSelector('#verify-doc-btn');
  await verifyBtn2.click();

  // Wait for MISMATCH result
  await page.waitForFunction(() => document.body.innerText.includes('DOCUMENT MISMATCH'), { timeout: 25000 });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot(page, '04_mismatch_result.png');

  // 5. Scenario: UNCERTAIN (Aadhaar selected + Heavily Blurry image)
  console.log('Executing UNCERTAIN scenario (Aadhaar + Blurry image)...');
  const resetBtn2 = await page.waitForSelector('#reset-btn');
  await resetBtn2.click();
  await new Promise(r => setTimeout(r, 800));

  // Generate temp blurry image on disk
  const blurryPath = path.resolve(__dirname, '../../reports/temp_blurry.jpg');
  await sharp(fs.readFileSync(aadhaarImgPath)).blur(25).toFile(blurryPath);

  const fileInput3 = await page.waitForSelector('input[type="file"]');
  await fileInput3.uploadFile(blurryPath);
  await new Promise(r => setTimeout(r, 1000));

  const verifyBtn3 = await page.waitForSelector('#verify-doc-btn');
  await verifyBtn3.click();

  // Wait for UNCERTAIN result
  await page.waitForFunction(() => document.body.innerText.includes('DOCUMENT TYPE COULD NOT BE CONFIRMED'), { timeout: 25000 });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot(page, '05_uncertain_result.png');

  // Clean up temp blurry file
  if (fs.existsSync(blurryPath)) fs.unlinkSync(blurryPath);

  await browser.close();
  console.log('All 5 screenshots captured and saved successfully!');
}

run().catch(err => {
  console.error('Screenshot capture error:', err);
  process.exit(1);
});
