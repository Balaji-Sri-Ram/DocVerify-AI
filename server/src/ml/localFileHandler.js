const fs = require('fs');
const path = require('path');

/**
 * Custom file IOHandler for TensorFlow.js in Node.js
 * Enables saving and loading models from local folders without requiring @tensorflow/tfjs-node native C++ addons.
 */
function getLocalFileHandler(dirPath) {
  return {
    save: async (modelArtifacts) => {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const weightsManifest = [{
        paths: ['./weights.bin'],
        weights: modelArtifacts.weightSpecs
      }];

      const modelJson = {
        modelTopology: modelArtifacts.modelTopology,
        format: modelArtifacts.format,
        generatedBy: modelArtifacts.generatedBy,
        convertedBy: modelArtifacts.convertedBy,
        weightsManifest
      };

      fs.writeFileSync(
        path.join(dirPath, 'model.json'),
        JSON.stringify(modelJson, null, 2)
      );

      if (modelArtifacts.weightData) {
        let weightBuf;
        if (Array.isArray(modelArtifacts.weightData)) {
          weightBuf = Buffer.concat(modelArtifacts.weightData.map(ab => Buffer.from(ab)));
        } else {
          weightBuf = Buffer.from(modelArtifacts.weightData);
        }
        fs.writeFileSync(
          path.join(dirPath, 'weights.bin'),
          weightBuf
        );
      }

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON'
        }
      };
    },

    load: async () => {
      const modelJsonPath = path.join(dirPath, 'model.json');
      const weightsPath = path.join(dirPath, 'weights.bin');

      if (!fs.existsSync(modelJsonPath)) {
        throw new Error(`Model topology file not found at: ${modelJsonPath}`);
      }

      const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));
      let weightData = null;
      let weightSpecs = [];

      if (modelJson.weightsManifest && modelJson.weightsManifest.length > 0) {
        weightSpecs = modelJson.weightsManifest[0].weights;
        if (fs.existsSync(weightsPath)) {
          const weightsBuf = fs.readFileSync(weightsPath);
          weightData = weightsBuf.buffer.slice(
            weightsBuf.byteOffset,
            weightsBuf.byteOffset + weightsBuf.byteLength
          );
        }
      }

      return {
        modelTopology: modelJson.modelTopology,
        format: modelJson.format,
        generatedBy: modelJson.generatedBy,
        convertedBy: modelJson.convertedBy,
        weightSpecs,
        weightData
      };
    }
  };
}

module.exports = { getLocalFileHandler };
