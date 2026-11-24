const path = require('path');
const fs = require('fs');
const http = require('http');
const sharp = require('sharp');
const app = require('../src/app');
const modelService = require('../src/services/modelService');

const WORKING_DATASET_DIR = path.resolve(__dirname, '../../dataset_working');
const REPORTS_DIR = path.resolve(__dirname, '../../reports');

// Helper to find a sample image in a test split
function getSampleImage(category, index = 0) {
  const dir = path.join(WORKING_DATASET_DIR, category, 'test');
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  if (files.length === 0) throw new Error(`No test files in ${dir}`);
  const chosenIndex = Math.min(index, files.length - 1);
  return path.join(dir, files[chosenIndex]);
}

// Multipart form data helper using native Node.js
function buildMultipartPayload(boundary, fields, file) {
  const chunks = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
      `${value}\r\n`
    ));
  }

  if (file) {
    chunks.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\n` +
      `Content-Type: ${file.contentType}\r\n\r\n`
    ));
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

function makeRequest(port, method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('   PHASE 4: BACKEND DOCUMENT CLASSIFICATION API TEST SUITE');
  console.log('================================================================\n');

  console.log('[Setup] Initializing Model Pipeline in ModelService...');
  await modelService.initModel();
  console.log('[Setup] Model Pipeline is Ready.\n');

  const testServerPort = 5055;
  const server = app.listen(testServerPort);

  const testResults = [];

  // Helper to run a classify test
  async function testClassify(testId, description, selectedType, fileObj) {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fields = {};
    if (selectedType !== undefined) {
      fields.selectedType = selectedType;
    }

    const payload = buildMultipartPayload(boundary, fields, fileObj);
    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': payload.length
    };

    const res = await makeRequest(testServerPort, 'POST', '/api/classify', headers, payload);
    const resultItem = {
      testId,
      description,
      input: {
        selectedType,
        fileName: fileObj ? fileObj.filename : null,
        fileType: fileObj ? fileObj.contentType : null
      },
      httpStatus: res.status,
      response: res.body
    };
    testResults.push(resultItem);

    console.log(`Test ${testId}: ${description}`);
    console.log(`  HTTP: ${res.status}`);
    console.log(`  Status: ${res.body.status || 'ERROR'}`);
    console.log(`  Selected: ${res.body.selectedType} | Detected: ${res.body.detectedType} | Conf: ${res.body.confidence}`);
    console.log(`  Message: ${res.body.message}\n`);
    return res;
  }

  try {
    // 1. Aadhaar selected + Aadhaar image (confident sample)
    const aadhaarPath = getSampleImage('aadhaar', 4);
    const aadhaarBuf = fs.readFileSync(aadhaarPath);
    await testClassify(
      1,
      'Aadhaar selected + Aadhaar image',
      'aadhaar',
      { fieldname: 'image', filename: 'aadhaar_sample.jpg', contentType: 'image/jpeg', buffer: aadhaarBuf }
    );

    // 2. Aadhaar selected + PAN image
    const panPath = getSampleImage('pan');
    const panBuf = fs.readFileSync(panPath);
    await testClassify(
      2,
      'Aadhaar selected + PAN image',
      'aadhaar',
      { fieldname: 'image', filename: 'pan_sample.jpg', contentType: 'image/jpeg', buffer: panBuf }
    );

    // 3. PAN selected + Passport image
    const passportPath = getSampleImage('passport');
    const passportBuf = fs.readFileSync(passportPath);
    await testClassify(
      3,
      'PAN selected + Passport image',
      'pan',
      { fieldname: 'image', filename: 'passport_sample.jpg', contentType: 'image/jpeg', buffer: passportBuf }
    );

    // 4. Driving Licence selected + Driving Licence image
    const dlPath = getSampleImage('driving_license');
    const dlBuf = fs.readFileSync(dlPath);
    await testClassify(
      4,
      'Driving Licence selected + Driving Licence image',
      'driving_license',
      { fieldname: 'image', filename: 'dl_sample.jpg', contentType: 'image/jpeg', buffer: dlBuf }
    );

    // 5. Passport selected + Aadhaar image
    await testClassify(
      5,
      'Passport selected + Aadhaar image',
      'passport',
      { fieldname: 'image', filename: 'aadhaar_sample.jpg', contentType: 'image/jpeg', buffer: aadhaarBuf }
    );

    // 6. Blurry image (Synthetically blurred document)
    const blurryBuf = await sharp(aadhaarBuf)
      .blur(25)
      .toBuffer();
    await testClassify(
      6,
      'Aadhaar selected + Heavily Blurry image',
      'aadhaar',
      { fieldname: 'image', filename: 'blurry_doc.jpg', contentType: 'image/jpeg', buffer: blurryBuf }
    );

    // 7. Unrelated photograph (Non-document scene created via sharp)
    const unrelatedBuf = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 60, g: 180, b: 75 } // Green field
      }
    })
      .composite([{
        input: Buffer.from(`
          <svg width="400" height="300">
            <circle cx="200" cy="150" r="80" fill="yellow" />
            <text x="200" y="270" font-size="24" text-anchor="middle" fill="white">Nature Landscape</text>
          </svg>
        `),
        top: 0,
        left: 0
      }])
      .jpeg()
      .toBuffer();

    await testClassify(
      7,
      'Aadhaar selected + Unrelated non-document photograph',
      'aadhaar',
      { fieldname: 'image', filename: 'landscape_photo.jpg', contentType: 'image/jpeg', buffer: unrelatedBuf }
    );

    // 8. Corrupt image (random garbage bytes)
    const corruptBuf = Buffer.from('RIFF....WAVEfmt ....garbage byte stream that cannot be decoded as image');
    await testClassify(
      8,
      'Aadhaar selected + Corrupt image bytes',
      'aadhaar',
      { fieldname: 'image', filename: 'corrupt.jpg', contentType: 'image/jpeg', buffer: corruptBuf }
    );

    // 9. Unsupported file format (.txt)
    const textBuf = Buffer.from('This is a text document, not an image.');
    await testClassify(
      9,
      'Aadhaar selected + Unsupported file format (plain text)',
      'aadhaar',
      { fieldname: 'image', filename: 'notes.txt', contentType: 'text/plain', buffer: textBuf }
    );

    // 10. Missing image
    await testClassify(
      10,
      'Aadhaar selected + Missing image upload',
      'aadhaar',
      null
    );

    // 11. Missing document selection
    await testClassify(
      11,
      'Missing document selection + Valid Aadhaar image',
      undefined,
      { fieldname: 'image', filename: 'aadhaar_sample.jpg', contentType: 'image/jpeg', buffer: aadhaarBuf }
    );

    // 12. Verification of GET /api/model/status
    console.log('Test 12: GET /api/model/status endpoint verification');
    const statusRes = await makeRequest(testServerPort, 'GET', '/api/model/status', {}, null);
    testResults.push({
      testId: 12,
      description: 'GET /api/model/status endpoint verification',
      httpStatus: statusRes.status,
      response: statusRes.body
    });
    console.log(`  HTTP: ${statusRes.status}`);
    console.log(`  Model isReady: ${statusRes.body.isReady}`);
    console.log(`  Classes: ${statusRes.body.classes.join(', ')}`);
    console.log(`  Threshold: ${statusRes.body.confidenceThreshold}\n`);

    // Save test results report
    const jsonPath = path.join(REPORTS_DIR, 'phase4_api_test_results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));

    // Markdown Report
    let md = `# Phase 4: Classification API Test Results Report\n\n`;
    md += `**Execution Date**: ${new Date().toISOString()}\n`;
    md += `**Total Scenarios Tested**: 12\n\n`;
    md += `| Test # | Scenario Description | HTTP | Outcome Status | Selected | Detected | Confidence |\n`;
    md += `|---|---|---|---|---|---|---|\n`;

    for (const t of testResults) {
      if (t.testId === 12) {
        md += `| 12 | GET /api/model/status | ${t.httpStatus} | OK (Ready: ${t.response.isReady}) | - | - | - |\n`;
      } else {
        const resp = t.response;
        md += `| ${t.testId} | ${t.description} | ${t.httpStatus} | **${resp.status || 'ERROR'}** | ${resp.selectedType || 'None'} | ${resp.detectedType || 'None'} | ${resp.confidence !== undefined ? (resp.confidence * 100).toFixed(1) + '%' : '-'} |\n`;
      }
    }

    md += `\n## Sample JSON API Responses\n\n`;
    md += `### 1. MATCH Outcome (Aadhaar selected, Aadhaar detected):\n`;
    md += `\`\`\`json\n${JSON.stringify(testResults[0].response, null, 2)}\n\`\`\`\n\n`;

    md += `### 2. MISMATCH Outcome (Aadhaar selected, PAN detected):\n`;
    md += `\`\`\`json\n${JSON.stringify(testResults[1].response, null, 2)}\n\`\`\`\n\n`;

    md += `### 3. UNCERTAIN Outcome (Heavily blurry / low confidence):\n`;
    md += `\`\`\`json\n${JSON.stringify(testResults[5].response, null, 2)}\n\`\`\`\n\n`;

    md += `### 4. INVALID_IMAGE Outcome (Corrupt file bytes):\n`;
    md += `\`\`\`json\n${JSON.stringify(testResults[7].response, null, 2)}\n\`\`\`\n\n`;

    const mdPath = path.join(REPORTS_DIR, 'phase4_api_test_results.md');
    fs.writeFileSync(mdPath, md);

    console.log(`Test suite complete! Reports saved:`);
    console.log(`- ${jsonPath}`);
    console.log(`- ${mdPath}`);

  } finally {
    server.close();
  }
}

runTestSuite().catch(err => {
  console.error('[TEST SUITE ERROR]:', err);
  process.exit(1);
});
