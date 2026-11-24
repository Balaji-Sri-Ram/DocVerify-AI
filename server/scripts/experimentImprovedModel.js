const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');

const CACHE_DIR = path.resolve(__dirname, '../../models/.cache_features');
const CLASSES = ['aadhaar', 'driving_license', 'pan', 'passport'];
const NUM_CLASSES = CLASSES.length;
const FEATURE_DIM = 1280;

function loadCachedSplit(splitName) {
  const featuresBin = path.join(CACHE_DIR, `${splitName}_features.bin`);
  const labelsJson = path.join(CACHE_DIR, `${splitName}_labels.json`);

  const rawLabels = JSON.parse(fs.readFileSync(labelsJson, 'utf8'));
  const rawFeatures = fs.readFileSync(featuresBin);
  const floatArr = new Float32Array(rawFeatures.buffer, rawFeatures.byteOffset, rawFeatures.byteLength / 4);

  const numSamples = rawLabels.length;
  const featuresTensor = tf.tensor2d(floatArr, [numSamples, FEATURE_DIM]);
  const labelsTensor = tf.oneHot(tf.tensor1d(rawLabels, 'int32'), NUM_CLASSES);

  return { featuresTensor, labelsTensor, rawLabels, numSamples };
}

async function evaluate(model, featuresTensor, labelsTensor) {
  const predsTensor = model.predict(featuresTensor);
  const predIndices = await predsTensor.argMax(-1).data();
  const trueIndices = await labelsTensor.argMax(-1).data();

  const total = trueIndices.length;
  let correct = 0;
  const matrix = Array.from({ length: NUM_CLASSES }, () => Array(NUM_CLASSES).fill(0));

  for (let i = 0; i < total; i++) {
    const t = trueIndices[i];
    const p = predIndices[i];
    matrix[t][p]++;
    if (t === p) correct++;
  }

  const classMetrics = {};
  for (let c = 0; c < NUM_CLASSES; c++) {
    const cat = CLASSES[c];
    let tp = matrix[c][c];
    let fn = 0;
    let fp = 0;
    for (let col = 0; col < NUM_CLASSES; col++) if (col !== c) fn += matrix[c][col];
    for (let row = 0; row < NUM_CLASSES; row++) if (row !== c) fp += matrix[row][c];

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    classMetrics[cat] = { tp, fp, fn, precision, recall, f1, support: tp + fn };
  }

  predsTensor.dispose();
  const accuracy = correct / total;
  return { accuracy, matrix, classMetrics };
}

async function runExperiments() {
  console.log('Loading dataset features from cache...');
  const train = loadCachedSplit('train');
  const valid = loadCachedSplit('valid');
  const test = loadCachedSplit('test');
  console.log(`Loaded Train: ${train.numSamples}, Valid: ${valid.numSamples}, Test: ${test.numSamples}`);

  // Calculate balanced class weights
  const classCounts = [0, 0, 0, 0];
  train.rawLabels.forEach(l => classCounts[l]++);
  console.log('Train class counts:', classCounts);
  const total = train.numSamples;
  const classWeights = {};
  for (let c = 0; c < NUM_CLASSES; c++) {
    classWeights[c] = total / (NUM_CLASSES * classCounts[c]);
  }
  console.log('Class weights:', classWeights);

  const configs = [
    {
      name: 'Config A (256-128, 20 epochs, lr=0.0003, no classWeight)',
      epochs: 20,
      batchSize: 16,
      lr: 0.0003,
      useClassWeight: false,
      build: () => {
        const m = tf.sequential();
        m.add(tf.layers.dense({ units: 256, activation: 'relu', inputShape: [FEATURE_DIM], kernelInitializer: 'heNormal' }));
        m.add(tf.layers.dropout({ rate: 0.25 }));
        m.add(tf.layers.dense({ units: 128, activation: 'relu', kernelInitializer: 'heNormal' }));
        m.add(tf.layers.dropout({ rate: 0.2 }));
        m.add(tf.layers.dense({ units: NUM_CLASSES, activation: 'softmax' }));
        return m;
      }
    },
    {
      name: 'Config B (256-128, 25 epochs, lr=0.0003, with classWeight)',
      epochs: 25,
      batchSize: 16,
      lr: 0.0003,
      useClassWeight: true,
      build: () => {
        const m = tf.sequential();
        m.add(tf.layers.dense({ units: 256, activation: 'relu', inputShape: [FEATURE_DIM], kernelInitializer: 'heNormal' }));
        m.add(tf.layers.dropout({ rate: 0.25 }));
        m.add(tf.layers.dense({ units: 128, activation: 'relu', kernelInitializer: 'heNormal' }));
        m.add(tf.layers.dropout({ rate: 0.2 }));
        m.add(tf.layers.dense({ units: NUM_CLASSES, activation: 'softmax' }));
        return m;
      }
    },
    {
      name: 'Config C (384-128-64, 25 epochs, lr=0.0004, with classWeight)',
      epochs: 25,
      batchSize: 16,
      lr: 0.0004,
      useClassWeight: true,
      build: () => {
        const m = tf.sequential();
        m.add(tf.layers.dense({ units: 384, activation: 'relu', inputShape: [FEATURE_DIM], kernelInitializer: 'heNormal' }));
        m.add(tf.layers.dropout({ rate: 0.3 }));
        m.add(tf.layers.dense({ units: 128, activation: 'relu', kernelInitializer: 'heNormal' }));
        m.add(tf.layers.dropout({ rate: 0.2 }));
        m.add(tf.layers.dense({ units: 64, activation: 'relu', kernelInitializer: 'heNormal' }));
        m.add(tf.layers.dropout({ rate: 0.15 }));
        m.add(tf.layers.dense({ units: NUM_CLASSES, activation: 'softmax' }));
        return m;
      }
    },
    {
      name: 'Config D (512-256, 30 epochs, lr=0.0002, with classWeight)',
      epochs: 30,
      batchSize: 16,
      lr: 0.0002,
      useClassWeight: true,
      build: () => {
        const m = tf.sequential();
        m.add(tf.layers.dense({ units: 512, activation: 'relu', inputShape: [FEATURE_DIM], kernelInitializer: 'heNormal' }));
        m.add(tf.layers.dropout({ rate: 0.35 }));
        m.add(tf.layers.dense({ units: 256, activation: 'relu', kernelInitializer: 'heNormal' }));
        m.add(tf.layers.dropout({ rate: 0.25 }));
        m.add(tf.layers.dense({ units: NUM_CLASSES, activation: 'softmax' }));
        return m;
      }
    }
  ];

  for (const cfg of configs) {
    console.log(`\n======================================================`);
    console.log(`Running Experiment: ${cfg.name}`);
    console.log(`======================================================`);

    const model = cfg.build();
    model.compile({
      optimizer: tf.train.adam(cfg.lr),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    const fitOpts = {
      epochs: cfg.epochs,
      batchSize: cfg.batchSize,
      validationData: [valid.featuresTensor, valid.labelsTensor],
      shuffle: true,
      verbose: 0
    };
    if (cfg.useClassWeight) {
      fitOpts.classWeight = classWeights;
    }

    const tStart = Date.now();
    await model.fit(train.featuresTensor, train.labelsTensor, fitOpts);
    const duration = ((Date.now() - tStart) / 1000).toFixed(1);
    console.log(`Training completed in ${duration}s.`);

    const evalValid = await evaluate(model, valid.featuresTensor, valid.labelsTensor);
    const evalTest = await evaluate(model, test.featuresTensor, test.labelsTensor);

    console.log(`Valid Accuracy: ${(evalValid.accuracy * 100).toFixed(2)}%`);
    console.log(`Test Accuracy:  ${(evalTest.accuracy * 100).toFixed(2)}%`);
    console.log(`Test Confusion Matrix:`);
    console.log('True \\ Pred\t' + CLASSES.map(c => c.slice(0, 5)).join('\t'));
    for (let r = 0; r < NUM_CLASSES; r++) {
      console.log(`${CLASSES[r].slice(0, 8)}\t` + evalTest.matrix[r].join('\t'));
    }

    console.log(`Per-class Test Metrics:`);
    for (const cat of CLASSES) {
      const m = evalTest.classMetrics[cat];
      console.log(` - ${cat.padEnd(16)}: Recall=${(m.recall * 100).toFixed(2)}% | Precision=${(m.precision * 100).toFixed(2)}% | F1=${(m.f1 * 100).toFixed(2)}% (TP: ${m.tp}, FP: ${m.fp}, FN: ${m.fn})`);
    }

    model.dispose();
  }

  train.featuresTensor.dispose();
  train.labelsTensor.dispose();
  valid.featuresTensor.dispose();
  valid.labelsTensor.dispose();
  test.featuresTensor.dispose();
  test.labelsTensor.dispose();
}

runExperiments().catch(console.error);
