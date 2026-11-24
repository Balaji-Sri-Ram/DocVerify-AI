# Phase 6: Comprehensive Functional Test Results Report

**Execution Date**: 2026-11-19T15:54:16.838Z
**Total Scenarios Tested**: 16
**Target Server**: `http://localhost:5000`

| # | Test Scenario | HTTP | Outcome Status | Selected | Detected | Confidence | Latency |
|---|---|---|---|---|---|---|---|
| 1 | Aadhaar selected + Aadhaar image | 200 | **MATCH** | aadhaar | aadhaar | 73.2% | 1081ms |
| 2 | Aadhaar selected + PAN image | 200 | **MISMATCH** | aadhaar | pan | 95.9% | 1078ms |
| 3 | PAN selected + Passport image | 200 | **MISMATCH** | pan | passport | 88.1% | 893ms |
| 4 | Driving Licence selected + Driving Licence image | 200 | **MATCH** | driving_license | driving_license | 94.3% | 850ms |
| 5 | Passport selected + Aadhaar image | 200 | **MISMATCH** | passport | aadhaar | 73.2% | 826ms |
| 6 | Aadhaar selected + Heavily Blurry image | 200 | **UNCERTAIN** | aadhaar | pan | 63.2% | 806ms |
| 7 | Aadhaar selected + Unrelated photograph | 200 | **MISMATCH** | aadhaar | pan | 81.6% | 799ms |
| 8 | Aadhaar selected + Corrupt image file | 400 | **INVALID_IMAGE** | aadhaar | - | 0.0% | 14ms |
| 9 | Aadhaar selected + Unsupported file type (PDF) | 400 | **INVALID_IMAGE** | aadhaar | - | 0.0% | 1ms |
| 10 | Aadhaar selected + Missing image upload | 400 | **INVALID_IMAGE** | aadhaar | - | 0.0% | 1ms |
| 11 | Missing document selection + Valid Aadhaar image | 400 | **INVALID_SELECTION** | - | - | 0.0% | 1ms |
| 12 | Image larger than 10 MB limit (10.5 MB) | 400 | **INVALID_IMAGE** | aadhaar | - | 0.0% | 22ms |
| 13 | Backend unavailable (Server offline) | CONN_REFUSED | **NETWORK_ERROR** | aadhaar | - | - | 12ms |
| 14 | GET /api/model/status endpoint check | 200 | **MODEL_READY** | - | - | - | 1ms |
| 15 | Repeated image uploads (5 consecutive inference passes) | 200 | **MATCH** | pan | pan | 95.9% | 979ms |
| 16 | Form reset & secondary upload workflow (Passport as Passport) | 200 | **MATCH** | passport | passport | 88.1% | 1165ms |

## Detailed Test Case Findings

### Test 1: Aadhaar selected + Aadhaar image
- **Outcome**: `MATCH` (HTTP 200)
- **Latency**: 1081 ms
- **System Response Message**: "The uploaded document is identified as Aadhaar Card and matches your selection."

### Test 2: Aadhaar selected + PAN image
- **Outcome**: `MISMATCH` (HTTP 200)
- **Latency**: 1078 ms
- **System Response Message**: "You selected Aadhaar Card, but the uploaded document appears to be a PAN Card."

### Test 3: PAN selected + Passport image
- **Outcome**: `MISMATCH` (HTTP 200)
- **Latency**: 893 ms
- **System Response Message**: "You selected PAN Card, but the uploaded document appears to be a Indian Passport."

### Test 4: Driving Licence selected + Driving Licence image
- **Outcome**: `MATCH` (HTTP 200)
- **Latency**: 850 ms
- **System Response Message**: "The uploaded document is identified as Driving Licence and matches your selection."

### Test 5: Passport selected + Aadhaar image
- **Outcome**: `MISMATCH` (HTTP 200)
- **Latency**: 826 ms
- **System Response Message**: "You selected Indian Passport, but the uploaded document appears to be a Aadhaar Card."

### Test 6: Aadhaar selected + Heavily Blurry image
- **Outcome**: `UNCERTAIN` (HTTP 200)
- **Latency**: 806 ms
- **System Response Message**: "We could not confidently identify this document. Please upload a clearer image and try again."

### Test 7: Aadhaar selected + Unrelated photograph
- **Outcome**: `MISMATCH` (HTTP 200)
- **Latency**: 799 ms
- **System Response Message**: "You selected Aadhaar Card, but the uploaded document appears to be a PAN Card."

### Test 8: Aadhaar selected + Corrupt image file
- **Outcome**: `INVALID_IMAGE` (HTTP 400)
- **Latency**: 14 ms
- **System Response Message**: "Corrupt or unsupported image file: Input buffer contains unsupported image format. Please upload a valid JPEG, PNG, or WebP image."

### Test 9: Aadhaar selected + Unsupported file type (PDF)
- **Outcome**: `INVALID_IMAGE` (HTTP 400)
- **Latency**: 1 ms
- **System Response Message**: "Unsupported file type: application/pdf. Allowed types: JPEG, PNG, WEBP."

### Test 10: Aadhaar selected + Missing image upload
- **Outcome**: `INVALID_IMAGE` (HTTP 400)
- **Latency**: 1 ms
- **System Response Message**: "No image uploaded. Please select and upload a document image."

### Test 11: Missing document selection + Valid Aadhaar image
- **Outcome**: `INVALID_SELECTION` (HTTP 400)
- **Latency**: 1 ms
- **System Response Message**: "Missing document selection. Please select one of: Aadhaar, PAN, Passport, or Driving Licence."

### Test 12: Image larger than 10 MB limit (10.5 MB)
- **Outcome**: `INVALID_IMAGE` (HTTP 400)
- **Latency**: 22 ms
- **System Response Message**: "Uploaded file exceeds the maximum allowed size of 10 MB."

### Test 13: Backend unavailable (Server offline)
- **Outcome**: `NETWORK_ERROR` (HTTP CONN_REFUSED)
- **Latency**: 12 ms
- **System Response Message**: "Could not connect to the backend server. Please verify the backend is running."

### Test 14: GET /api/model/status endpoint check
- **Outcome**: `MODEL_READY` (HTTP 200)
- **Latency**: 1 ms
- **System Response Message**: "Model ready: true, classes: aadhaar, driving_license, pan, passport"

### Test 15: Repeated image uploads (5 consecutive inference passes)
- **Outcome**: `MATCH` (HTTP 200)
- **Latency**: 979 ms
- **System Response Message**: "5 consecutive requests successful. Latencies: [830ms, 791ms, 816ms, 1209ms, 1249ms]. Average: 979.0ms."

### Test 16: Form reset & secondary upload workflow (Passport as Passport)
- **Outcome**: `MATCH` (HTTP 200)
- **Latency**: 1165 ms
- **System Response Message**: "The uploaded document is identified as Indian Passport and matches your selection."

