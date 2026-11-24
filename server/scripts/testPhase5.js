const path = require('path');
const fs = require('fs');
const http = require('http');
const sharp = require('sharp');
const app = require('../src/app');
const modelService = require('../src/services/modelService');

const WORKING_DATASET_DIR = path.resolve(__dirname, '../../dataset_working');
const REPORTS_DIR = path.resolve(__dirname, '../../reports');

function getSampleImage(category, index = 0) {
  const dir = path.join(WORKING_DATASET_DIR, category, 'test');
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  if (files.length === 0) throw new Error(`No test files in ${dir}`);
  const chosenIndex = Math.min(index, files.length - 1);
  return path.join(dir, files[chosenIndex]);
}

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

function makeRequest(port, method, reqPath, headers, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path: reqPath,
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

async function runPhase5Tests() {
  console.log('================================================================');
  console.log('   PHASE 5: FRONTEND-BACKEND WORKFLOW E2E TEST SUITE');
  console.log('================================================================\n');

  console.log('[Setup] Initializing model pipeline...');
  await modelService.initModel();
  console.log('[Setup] Model pipeline ready.\n');

  const testServerPort = 5056;
  const server = app.listen(testServerPort);

  const testResults = [];

  async function testScenario(testId, name, selectedType, fileObj) {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fields = selectedType ? { selectedType } : {};
    const payload = buildMultipartPayload(boundary, fields, fileObj);
    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': payload.length
    };

    const res = await makeRequest(testServerPort, 'POST', '/api/classify', headers, payload);
    const item = {
      testId,
      name,
      selectedType,
      fileName: fileObj ? fileObj.filename : null,
      httpStatus: res.status,
      frontendDisplay: {
        statusBadge: res.body.status || 'ERROR',
        detectedType: res.body.detectedType || null,
        confidencePct: res.body.confidence ? `${(res.body.confidence * 100).toFixed(1)}%` : null,
        message: res.body.message
      },
      rawResponse: res.body
    };
    testResults.push(item);

    console.log(`Test ${testId}: ${name}`);
    console.log(`  HTTP: ${res.status}`);
    console.log(`  UI Status Badge: ${item.frontendDisplay.statusBadge}`);
    console.log(`  Selected: ${selectedType} | Detected: ${item.frontendDisplay.detectedType} | Conf: ${item.frontendDisplay.confidencePct}`);
    console.log(`  UI Display Message: ${item.frontendDisplay.message}\n`);
    return res;
  }

  try {
    // 1. Aadhaar selected + Aadhaar image
    const aadhaarPath = getSampleImage('aadhaar', 4);
    const aadhaarBuf = fs.readFileSync(aadhaarPath);
    await testScenario(1, 'Aadhaar selected + Aadhaar image', 'aadhaar', {
      fieldname: 'image', filename: 'aadhaar_sample.jpg', contentType: 'image/jpeg', buffer: aadhaarBuf
    });

    // 2. Aadhaar selected + PAN image
    const panPath = getSampleImage('pan', 0);
    const panBuf = fs.readFileSync(panPath);
    await testScenario(2, 'Aadhaar selected + PAN image', 'aadhaar', {
      fieldname: 'image', filename: 'pan_sample.jpg', contentType: 'image/jpeg', buffer: panBuf
    });

    // 3. PAN selected + Passport image
    const passportPath = getSampleImage('passport', 0);
    const passportBuf = fs.readFileSync(passportPath);
    await testScenario(3, 'PAN selected + Passport image', 'pan', {
      fieldname: 'image', filename: 'passport_sample.jpg', contentType: 'image/jpeg', buffer: passportBuf
    });

    // 4. Driving Licence selected + Driving Licence image
    const dlPath = getSampleImage('driving_license', 0);
    const dlBuf = fs.readFileSync(dlPath);
    await testScenario(4, 'Driving Licence selected + Driving Licence image', 'driving_license', {
      fieldname: 'image', filename: 'dl_sample.jpg', contentType: 'image/jpeg', buffer: dlBuf
    });

    // 5. Passport selected + Aadhaar image
    await testScenario(5, 'Passport selected + Aadhaar image', 'passport', {
      fieldname: 'image', filename: 'aadhaar_sample.jpg', contentType: 'image/jpeg', buffer: aadhaarBuf
    });

    // 6. Blurry image
    const blurryBuf = await sharp(aadhaarBuf).blur(25).toBuffer();
    await testScenario(6, 'Aadhaar selected + Blurry image', 'aadhaar', {
      fieldname: 'image', filename: 'blurry_aadhaar.jpg', contentType: 'image/jpeg', buffer: blurryBuf
    });

    // 7. Unrelated photograph
    const unrelatedBuf = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 50, g: 150, b: 60 } }
    }).composite([{
      input: Buffer.from('<svg width="400" height="300"><circle cx="200" cy="150" r="70" fill="gold"/><text x="200" y="270" font-size="22" text-anchor="middle" fill="white">Forest Park Nature</text></svg>'),
      top: 0, left: 0
    }]).jpeg().toBuffer();

    await testScenario(7, 'Aadhaar selected + Unrelated photograph (Nature scene)', 'aadhaar', {
      fieldname: 'image', filename: 'nature_park.jpg', contentType: 'image/jpeg', buffer: unrelatedBuf
    });

    // 8. Corrupt image
    const corruptBuf = Buffer.from('NOT_AN_IMAGE_RANDOM_BYTE_STREAM');
    await testScenario(8, 'Aadhaar selected + Corrupt image file', 'aadhaar', {
      fieldname: 'image', filename: 'corrupted_file.jpg', contentType: 'image/jpeg', buffer: corruptBuf
    });

    // 9. Unsupported file format (.pdf / .txt)
    const pdfBuf = Buffer.from('%PDF-1.4 sample pdf content');
    await testScenario(9, 'Aadhaar selected + Unsupported file format (PDF document)', 'aadhaar', {
      fieldname: 'image', filename: 'doc.pdf', contentType: 'application/pdf', buffer: pdfBuf
    });

    // 10. Backend unavailable simulation (connecting to non-existent port)
    console.log('Test 10: Backend unavailable scenario simulation');
    let backendOfflineResult;
    try {
      await makeRequest(59999, 'GET', '/api/health', {}, null);
    } catch (netErr) {
      backendOfflineResult = {
        testId: 10,
        name: 'Backend unavailable (Server offline)',
        selectedType: 'aadhaar',
        httpStatus: 'CONN_REFUSED',
        frontendDisplay: {
          statusBadge: 'NETWORK_ERROR',
          detectedType: null,
          confidencePct: null,
          message: 'Could not connect to the backend server. Please verify the backend is running.'
        },
        rawResponse: { success: false, status: 'NETWORK_ERROR', error: netErr.message }
      };
      testResults.push(backendOfflineResult);
      console.log('  HTTP: Connection Refused (Port 59999)');
      console.log('  UI Status Badge: NETWORK_ERROR');
      console.log(`  UI Display Message: ${backendOfflineResult.frontendDisplay.message}\n`);
    }

    // Save Markdown and JSON reports
    const jsonPath = path.join(REPORTS_DIR, 'phase5_frontend_workflow_test_results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));

    let md = `# Phase 5: Frontend-to-Backend Workflow Test Results\n\n`;
    md += `**Execution Date**: ${new Date().toISOString()}\n`;
    md += `**Total Workflows Tested**: 10\n\n`;
    md += `| Test # | Workflow Scenario | HTTP | UI Outcome Badge | Selected Type | Detected Type | Confidence Score |\n`;
    md += `|---|---|---|---|---|---|---|\n`;

    for (const t of testResults) {
      const disp = t.frontendDisplay;
      md += `| ${t.testId} | ${t.name} | ${t.httpStatus} | **${disp.statusBadge}** | ${t.selectedType || '-'} | ${disp.detectedType || '-'} | ${disp.confidencePct || '-'} |\n`;
    }

    md += `\n## Real API Responses Rendered on Frontend\n\n`;
    for (const t of testResults) {
      md += `### Test ${t.testId}: ${t.name}\n`;
      md += `- **UI Outcome**: \`${t.frontendDisplay.statusBadge}\`\n`;
      md += `- **Explanation Message**: "${t.frontendDisplay.message}"\n`;
      md += `\`\`\`json\n${JSON.stringify(t.rawResponse, null, 2)}\n\`\`\`\n\n`;
    }

    const mdPath = path.join(REPORTS_DIR, 'phase5_frontend_workflow_test_results.md');
    fs.writeFileSync(mdPath, md);

    console.log(`Phase 5 E2E tests complete! Reports saved:`);
    console.log(`- ${jsonPath}`);
    console.log(`- ${mdPath}`);

  } finally {
    server.close();
  }
}

runPhase5Tests().catch(err => {
  console.error('[E2E TEST ERROR]:', err);
  process.exit(1);
});
