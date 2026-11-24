const tf = require('@tensorflow/tfjs');
const mobilenet = require('@tensorflow-models/mobilenet');
const path = require('path');
const fs = require('fs');
const { preprocessImageBuffer } = require('../ml/preprocessor');
const { getLocalFileHandler } = require('../ml/localFileHandler');

const MODEL_DIR = path.resolve(__dirname, '../../../models/document_classifier');
const MOBILENET_DIR = path.resolve(__dirname, '../../../models/mobilenet_v2');
const METADATA_PATH = path.join(MODEL_DIR, 'metadata.json');

// Supported document labels (matching training index order)
const CLASSES = ['aadhaar', 'driving_license', 'pan', 'passport'];
const CONFIDENCE_THRESHOLD = 0.70;

let baseModel = null;
let headModel = null;
let metadata = null;
let isModelReady = false;
let initError = null;
let isInitializing = false;

/**
 * Initializes and caches MobileNet v2 and the custom classification head.
 * Loads once on startup.
 */
async function initModel() {
  if (isModelReady) return true;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    return isModelReady;
  }

  isInitializing = true;
  initError = null;

  try {
    console.log('[ModelService] Initializing document classification pipeline...');

    // 1. Read metadata
    if (!fs.existsSync(METADATA_PATH)) {
      throw new Error(`Model metadata not found at: ${METADATA_PATH}. Train model in Phase 3 first.`);
    }
    metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));

    // 2. Load Pretrained MobileNet v2 feature extractor
    console.log('[ModelService] Loading MobileNet v2 base feature extractor...');
    if (fs.existsSync(MOBILENET_DIR)) {
      const mobilenetHandler = getLocalFileHandler(MOBILENET_DIR);
      baseModel = await mobilenet.load({ version: 2, alpha: 1.0, modelUrl: mobilenetHandler, inputRange: [0, 1] });
      console.log('[ModelService] Loaded MobileNet v2 from local disk cache with inputRange [0, 1].');
    } else {
      baseModel = await mobilenet.load({ version: 2, alpha: 1.0 });
    }

    // 3. Load Trained Classification Head from local disk
    console.log('[ModelService] Loading custom classification head from local storage...');
    const fileHandler = getLocalFileHandler(MODEL_DIR);
    headModel = await tf.loadLayersModel(fileHandler);

    isModelReady = true;
    console.log('[ModelService] Model pipeline successfully loaded and ready for inference.');
    return true;
  } catch (err) {
    initError = err.message;
    isModelReady = false;
    console.error('[ModelService] Failed to load model pipeline:', err.message);
    throw err;
  } finally {
    isInitializing = false;
  }
}

/**
 * Returns current model health and status.
 */
function getModelStatus() {
  return {
    isReady: isModelReady,
    isTrained: fs.existsSync(METADATA_PATH),
    classes: CLASSES,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
    error: initError,
    metadata: metadata || null
  };
}

/**
 * Independent document classification.
 * The model NEVER receives or considers the user's selected document type.
 *
 * @param {Buffer} imageBuffer - Raw image file buffer
 * @returns {Promise<{detectedType: string, confidence: number, probabilities: Object}>}
 */
async function predictDocument(imageBuffer) {
  if (!isModelReady) {
    await initModel();
  }

  let inputTensor = null;
  let batchTensor = null;
  let featureTensor = null;
  let predictionTensor = null;

  try {
    // 1. Preprocess image buffer (224x224 RGB, [-1, 1] normalized)
    inputTensor = await preprocessImageBuffer(imageBuffer);
    batchTensor = inputTensor.expandDims(0); // [1, 224, 224, 3]

    // 2. Extract 1,280-d feature embeddings via frozen MobileNet v2
    featureTensor = baseModel.infer(batchTensor, true); // [1, 1280]

    // 3. Run through trained classification head
    predictionTensor = headModel.predict(featureTensor); // [1, 4]
    const probabilities = await predictionTensor.data();

    // 4. Determine predicted class and confidence
    let maxIdx = 0;
    let maxProb = -1;
    const probMap = {};

    for (let i = 0; i < CLASSES.length; i++) {
      const prob = probabilities[i];
      probMap[CLASSES[i]] = parseFloat(prob.toFixed(4));
      if (prob > maxProb) {
        maxProb = prob;
        maxIdx = i;
      }
    }

    const detectedType = CLASSES[maxIdx];
    const confidence = parseFloat(maxProb.toFixed(4));

    return {
      detectedType,
      confidence,
      probabilities: probMap
    };
  } finally {
    // Clean up all GPU/CPU tensors immediately to prevent any memory leakage
    if (inputTensor) inputTensor.dispose();
    if (batchTensor) batchTensor.dispose();
    if (featureTensor) featureTensor.dispose();
    if (predictionTensor) predictionTensor.dispose();
  }
}

module.exports = {
  CLASSES,
  CONFIDENCE_THRESHOLD,
  initModel,
  getModelStatus,
  predictDocument
};
