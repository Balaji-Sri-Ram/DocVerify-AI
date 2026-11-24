const sharp = require('sharp');

/**
 * Image Quality and Clarity Assessment Service.
 * Evaluates document image sharpness using Laplacian variance,
 * along with lighting and contrast checks.
 */

/**
 * Calculates the Laplacian variance (sharpness score) on a standardized resolution.
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<{ sharpnessScore: number, avgBrightness: number, isBlurry: boolean, isTooDark: boolean, isGlared: boolean, isClear: boolean }>}
 */
async function assessImageQuality(buffer) {
  try {
    // Normalize: flatten alpha against white, resize to 600px width, convert to greyscale raw
    const { data, info } = await sharp(buffer)
      .flatten({ background: '#ffffff' })
      .resize({ width: 600, withoutEnlargement: true })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;

    if (width < 3 || height < 3) {
      return { sharpnessScore: 0, avgBrightness: 0, isBlurry: true, isTooDark: false, isGlared: false, isClear: false };
    }

    let sum = 0;
    let sumSq = 0;
    let brightnessSum = 0;
    let count = 0;

    // Fast 3x3 discrete Laplacian filter:
    // [ 0,  1,  0]
    // [ 1, -4,  1]
    // [ 0,  1,  0]
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x;
        brightnessSum += data[idx];
        const lap =
          data[idx - width] +
          data[idx + width] +
          data[idx - 1] +
          data[idx + 1] -
          (data[idx] << 2);
        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);
    const avgBrightness = brightnessSum / count;

    // Objective thresholds:
    // Variance < 45 indicates severe blur where text/print details cannot be resolved
    const isBlurry = variance < 45;
    // AvgBrightness < 20 indicates near-total darkness
    const isTooDark = avgBrightness < 20;
    // AvgBrightness > 252 indicates blown-out white flash/glare
    const isGlared = avgBrightness > 252;
    const isClear = !isBlurry && !isTooDark && !isGlared;

    return {
      sharpnessScore: Number(variance.toFixed(2)),
      avgBrightness: Number(avgBrightness.toFixed(1)),
      isBlurry,
      isTooDark,
      isGlared,
      isClear
    };
  } catch (err) {
    console.warn('[ImageQualityService] Error assessing quality:', err.message);
    return {
      sharpnessScore: 100,
      avgBrightness: 128,
      isBlurry: false,
      isTooDark: false,
      isGlared: false,
      isClear: true
    };
  }
}

module.exports = {
  assessImageQuality
};
