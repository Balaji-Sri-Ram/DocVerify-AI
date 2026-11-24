const sharp = require('sharp');
const tf = require('@tensorflow/tfjs');

/**
 * Standard preprocessing for MobileNet v2:
 * 1. Resize to target dimension (default 224x224).
 * 2. Remove alpha channel (ensure 3-channel RGB).
 * 3. Convert raw buffer to 3D Float32 Tensor [height, width, 3].
 * 4. Normalize pixel values from [0, 255] to [-1, 1]: (pixel / 127.5) - 1.0.
 */
const IMAGE_SIZE = 224;

async function preprocessImageBuffer(buffer) {
  // Use sharp for ultra-fast, robust image decoding & resizing
  const { data, info } = await sharp(buffer)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    throw new Error(`Expected 3 channels (RGB), but got ${info.channels}`);
  }

  // Create tf tensor from raw byte buffer
  // Memory management: clean tensor creation
  return tf.tidy(() => {
    const uint8Array = new Uint8Array(data);
    const tensor3d = tf.tensor3d(uint8Array, [IMAGE_SIZE, IMAGE_SIZE, 3], 'float32');
    // Normalize to [-1, 1] as required by MobileNet v2
    const normalized = tensor3d.div(127.5).sub(1.0);
    return normalized;
  });
}

async function preprocessImageFile(filePath) {
  const { data, info } = await sharp(filePath)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return tf.tidy(() => {
    const uint8Array = new Uint8Array(data);
    const tensor3d = tf.tensor3d(uint8Array, [IMAGE_SIZE, IMAGE_SIZE, 3], 'float32');
    return tensor3d.div(127.5).sub(1.0);
  });
}

module.exports = {
  IMAGE_SIZE,
  preprocessImageBuffer,
  preprocessImageFile
};
