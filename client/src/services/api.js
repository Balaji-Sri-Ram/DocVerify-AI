import axios from 'axios';

// Base API URL from environment variable or default to relative path
const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
  : '';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s timeout for CPU inference & OCR
});

/**
 * Check backend server health.
 */
export async function checkHealth() {
  try {
    const res = await apiClient.get('/api/health');
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Server unreachable'
    };
  }
}

/**
 * Fetch trained model status, architecture, and evaluation metrics.
 */
export async function getModelStatus() {
  try {
    const res = await apiClient.get('/api/model/status');
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Model status unavailable'
    };
  }
}

/**
 * Fetch dataset inspection and split distribution stats.
 */
export async function getDatasetStats() {
  try {
    const res = await apiClient.get('/api/dataset/stats');
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Dataset stats unavailable'
    };
  }
}

/**
 * Classify and verify an uploaded identity document against the selected type.
 *
 * @param {File} file - Image file object from user input
 * @param {string} selectedType - 'aadhaar' | 'pan' | 'passport' | 'driving_license'
 * @returns {Promise<Object>} API response payload
 */
export async function classifyDocument(file, selectedType) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('selectedType', selectedType);

  try {
    const res = await apiClient.post('/api/classify', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (err) {
    if (err.response && err.response.data) {
      // Backend returned a formatted error response (e.g. 400 with status: INVALID_IMAGE)
      return err.response.data;
    }

    // Network error or timeout
    return {
      success: false,
      status: 'NETWORK_ERROR',
      selectedType,
      detectedType: null,
      confidence: 0,
      message: err.message === 'Network Error'
        ? 'Could not connect to the backend server. Please verify the backend is running.'
        : `Request failed: ${err.message}`
    };
  }
}

export default {
  checkHealth,
  getModelStatus,
  getDatasetStats,
  classifyDocument
};
