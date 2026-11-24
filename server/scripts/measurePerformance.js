const fs = require('fs');
const path = require('path');
const modelService = require('../src/services/modelService');

const WORKING_DATASET_DIR = path.resolve(__dirname, '../../dataset_working');
const DIST_DIR = path.resolve(__dirname, '../../client/dist');
const REPORTS_DIR = path.resolve(__dirname, '../../reports');

function getSampleImagePath(category) {
  const dir = path.join(WORKING_DATASET_DIR, category, 'test');
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  return path.join(dir, files[0]);
}

function getDirSize(dirPath) {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const full = path.join(dirPath, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      size += getDirSize(full);
    } else {
      size += stat.size;
    }
  }
  return size;
}

async function measure() {
  console.log('====================================================');
  console.log('   PHASE 6: PERFORMANCE BENCHMARK & METRICS');
  console.log('====================================================\n');

  // 1. Backend Model Loading Time
  const t0 = Date.now();
  await modelService.initModel();
  const modelLoadTimeMs = Date.now() - t0;
  console.log(`[1] Backend Model Pipeline Initialization: ${modelLoadTimeMs} ms`);

  // 2. Measure Memory & Inference Latency over 10 repeated passes
  const samplePath = getSampleImagePath('pan');
  const sampleBuf = fs.readFileSync(samplePath);

  global.gc && global.gc();
  const initialMem = process.memoryUsage();

  const latencies = [];
  console.log('\n[2] Running 10 inference passes on actual test images...');
  for (let i = 1; i <= 10; i++) {
    const start = Date.now();
    const pred = await modelService.predictDocument(sampleBuf);
    const duration = Date.now() - start;
    latencies.push(duration);
    console.log(`  Pass ${i.toString().padStart(2, '0')}: ${duration}ms (Detected: ${pred.detectedType}, Conf: ${(pred.confidence*100).toFixed(1)}%)`);
  }

  const avgInferenceMs = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1);
  const minInferenceMs = Math.min(...latencies);
  const maxInferenceMs = Math.max(...latencies);
  console.log(`\nAverage Inference Latency: ${avgInferenceMs} ms (Min: ${minInferenceMs}ms, Max: ${maxInferenceMs}ms)`);

  const finalMem = process.memoryUsage();
  const heapDiffMb = ((finalMem.heapUsed - initialMem.heapUsed) / (1024 * 1024)).toFixed(2);
  const totalHeapMb = (finalMem.heapUsed / (1024 * 1024)).toFixed(2);
  console.log(`\n[3] Memory Stability:`);
  console.log(`  Initial Heap: ${(initialMem.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Final Heap: ${totalHeapMb} MB (Heap delta over 10 runs: ${heapDiffMb} MB)`);

  // 3. Frontend Production Build Size
  const distBytes = getDirSize(DIST_DIR);
  const distKb = (distBytes / 1024).toFixed(1);
  console.log(`\n[4] Frontend Production Build Size: ${distKb} KB (${(distBytes / (1024 * 1024)).toFixed(2)} MB)`);

  const perfReport = {
    timestamp: new Date().toISOString(),
    measurements: {
      modelInitTimeMs: modelLoadTimeMs,
      latenciesMs: latencies,
      avgInferenceLatencyMs: parseFloat(avgInferenceMs),
      minInferenceLatencyMs: minInferenceMs,
      maxInferenceLatencyMs: maxInferenceMs,
      memory: {
        initialHeapUsedMb: parseFloat((initialMem.heapUsed / (1024 * 1024)).toFixed(2)),
        finalHeapUsedMb: parseFloat(totalHeapMb),
        heapDeltaMb: parseFloat(heapDiffMb),
        rssMb: parseFloat((finalMem.rss / (1024 * 1024)).toFixed(2))
      },
      frontendBuild: {
        distSizeBytes: distBytes,
        distSizeKb: parseFloat(distKb)
      }
    }
  };

  fs.writeFileSync(path.join(REPORTS_DIR, 'performance_metrics.json'), JSON.stringify(perfReport, null, 2));
  console.log(`\nPerformance metrics saved to: ${path.join(REPORTS_DIR, 'performance_metrics.json')}`);
}

measure().catch(console.error);
