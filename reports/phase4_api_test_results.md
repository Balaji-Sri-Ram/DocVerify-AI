# Phase 4: Classification API Test Results Report

**Execution Date**: 2026-11-19T14:04:00.195Z
**Total Scenarios Tested**: 12

| Test # | Scenario Description | HTTP | Outcome Status | Selected | Detected | Confidence |
|---|---|---|---|---|---|---|
| 1 | Aadhaar selected + Aadhaar image | 200 | **MATCH** | aadhaar | aadhaar | 73.2% |
| 2 | Aadhaar selected + PAN image | 200 | **MISMATCH** | aadhaar | pan | 95.9% |
| 3 | PAN selected + Passport image | 200 | **MISMATCH** | pan | passport | 88.1% |
| 4 | Driving Licence selected + Driving Licence image | 200 | **MATCH** | driving_license | driving_license | 94.3% |
| 5 | Passport selected + Aadhaar image | 200 | **MISMATCH** | passport | aadhaar | 73.2% |
| 6 | Aadhaar selected + Heavily Blurry image | 200 | **UNCERTAIN** | aadhaar | pan | 63.2% |
| 7 | Aadhaar selected + Unrelated non-document photograph | 200 | **MISMATCH** | aadhaar | pan | 81.3% |
| 8 | Aadhaar selected + Corrupt image bytes | 400 | **INVALID_IMAGE** | aadhaar | None | 0.0% |
| 9 | Aadhaar selected + Unsupported file format (plain text) | 400 | **INVALID_IMAGE** | aadhaar | None | 0.0% |
| 10 | Aadhaar selected + Missing image upload | 400 | **INVALID_IMAGE** | aadhaar | None | 0.0% |
| 11 | Missing document selection + Valid Aadhaar image | 400 | **INVALID_SELECTION** | None | None | 0.0% |
| 12 | GET /api/model/status | 200 | OK (Ready: true) | - | - | - |

## Sample JSON API Responses

### 1. MATCH Outcome (Aadhaar selected, Aadhaar detected):
```json
{
  "success": true,
  "status": "MATCH",
  "selectedType": "aadhaar",
  "detectedType": "aadhaar",
  "confidence": 0.7319,
  "message": "The uploaded document is identified as Aadhaar Card and matches your selection.",
  "probabilities": {
    "aadhaar": 0.7319,
    "driving_license": 0.2246,
    "pan": 0.0384,
    "passport": 0.0051
  }
}
```

### 2. MISMATCH Outcome (Aadhaar selected, PAN detected):
```json
{
  "success": true,
  "status": "MISMATCH",
  "selectedType": "aadhaar",
  "detectedType": "pan",
  "confidence": 0.9587,
  "message": "You selected Aadhaar Card, but the uploaded document appears to be a PAN Card.",
  "probabilities": {
    "aadhaar": 0.0082,
    "driving_license": 0.0011,
    "pan": 0.9587,
    "passport": 0.032
  }
}
```

### 3. UNCERTAIN Outcome (Heavily blurry / low confidence):
```json
{
  "success": true,
  "status": "UNCERTAIN",
  "selectedType": "aadhaar",
  "detectedType": "pan",
  "confidence": 0.6317,
  "message": "We could not confidently identify this document. Please upload a clearer image and try again.",
  "probabilities": {
    "aadhaar": 0.0057,
    "driving_license": 0.0255,
    "pan": 0.6317,
    "passport": 0.3372
  }
}
```

### 4. INVALID_IMAGE Outcome (Corrupt file bytes):
```json
{
  "success": false,
  "status": "INVALID_IMAGE",
  "selectedType": "aadhaar",
  "detectedType": null,
  "confidence": 0,
  "message": "Corrupt or unsupported image file: Input buffer contains unsupported image format. Please upload a valid JPEG, PNG, or WebP image."
}
```

