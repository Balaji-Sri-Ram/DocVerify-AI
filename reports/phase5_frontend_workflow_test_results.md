# Phase 5: Frontend-to-Backend Workflow Test Results

**Execution Date**: 2026-11-19T14:09:49.179Z
**Total Workflows Tested**: 10

| Test # | Workflow Scenario | HTTP | UI Outcome Badge | Selected Type | Detected Type | Confidence Score |
|---|---|---|---|---|---|---|
| 1 | Aadhaar selected + Aadhaar image | 200 | **MATCH** | aadhaar | aadhaar | 73.2% |
| 2 | Aadhaar selected + PAN image | 200 | **MISMATCH** | aadhaar | pan | 95.9% |
| 3 | PAN selected + Passport image | 200 | **MISMATCH** | pan | passport | 88.1% |
| 4 | Driving Licence selected + Driving Licence image | 200 | **MATCH** | driving_license | driving_license | 94.3% |
| 5 | Passport selected + Aadhaar image | 200 | **MISMATCH** | passport | aadhaar | 73.2% |
| 6 | Aadhaar selected + Blurry image | 200 | **UNCERTAIN** | aadhaar | pan | 63.2% |
| 7 | Aadhaar selected + Unrelated photograph (Nature scene) | 200 | **MISMATCH** | aadhaar | pan | 81.6% |
| 8 | Aadhaar selected + Corrupt image file | 400 | **INVALID_IMAGE** | aadhaar | - | - |
| 9 | Aadhaar selected + Unsupported file format (PDF document) | 400 | **INVALID_IMAGE** | aadhaar | - | - |
| 10 | Backend unavailable (Server offline) | CONN_REFUSED | **NETWORK_ERROR** | aadhaar | - | - |

## Real API Responses Rendered on Frontend

### Test 1: Aadhaar selected + Aadhaar image
- **UI Outcome**: `MATCH`
- **Explanation Message**: "The uploaded document is identified as Aadhaar Card and matches your selection."
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

### Test 2: Aadhaar selected + PAN image
- **UI Outcome**: `MISMATCH`
- **Explanation Message**: "You selected Aadhaar Card, but the uploaded document appears to be a PAN Card."
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

### Test 3: PAN selected + Passport image
- **UI Outcome**: `MISMATCH`
- **Explanation Message**: "You selected PAN Card, but the uploaded document appears to be a Indian Passport."
```json
{
  "success": true,
  "status": "MISMATCH",
  "selectedType": "pan",
  "detectedType": "passport",
  "confidence": 0.8811,
  "message": "You selected PAN Card, but the uploaded document appears to be a Indian Passport.",
  "probabilities": {
    "aadhaar": 0.001,
    "driving_license": 0.0443,
    "pan": 0.0735,
    "passport": 0.8811
  }
}
```

### Test 4: Driving Licence selected + Driving Licence image
- **UI Outcome**: `MATCH`
- **Explanation Message**: "The uploaded document is identified as Driving Licence and matches your selection."
```json
{
  "success": true,
  "status": "MATCH",
  "selectedType": "driving_license",
  "detectedType": "driving_license",
  "confidence": 0.9435,
  "message": "The uploaded document is identified as Driving Licence and matches your selection.",
  "probabilities": {
    "aadhaar": 0.0416,
    "driving_license": 0.9435,
    "pan": 0.0041,
    "passport": 0.0108
  }
}
```

### Test 5: Passport selected + Aadhaar image
- **UI Outcome**: `MISMATCH`
- **Explanation Message**: "You selected Indian Passport, but the uploaded document appears to be a Aadhaar Card."
```json
{
  "success": true,
  "status": "MISMATCH",
  "selectedType": "passport",
  "detectedType": "aadhaar",
  "confidence": 0.7319,
  "message": "You selected Indian Passport, but the uploaded document appears to be a Aadhaar Card.",
  "probabilities": {
    "aadhaar": 0.7319,
    "driving_license": 0.2246,
    "pan": 0.0384,
    "passport": 0.0051
  }
}
```

### Test 6: Aadhaar selected + Blurry image
- **UI Outcome**: `UNCERTAIN`
- **Explanation Message**: "We could not confidently identify this document. Please upload a clearer image and try again."
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

### Test 7: Aadhaar selected + Unrelated photograph (Nature scene)
- **UI Outcome**: `MISMATCH`
- **Explanation Message**: "You selected Aadhaar Card, but the uploaded document appears to be a PAN Card."
```json
{
  "success": true,
  "status": "MISMATCH",
  "selectedType": "aadhaar",
  "detectedType": "pan",
  "confidence": 0.8158,
  "message": "You selected Aadhaar Card, but the uploaded document appears to be a PAN Card.",
  "probabilities": {
    "aadhaar": 0.0133,
    "driving_license": 0.0235,
    "pan": 0.8158,
    "passport": 0.1474
  }
}
```

### Test 8: Aadhaar selected + Corrupt image file
- **UI Outcome**: `INVALID_IMAGE`
- **Explanation Message**: "Corrupt or unsupported image file: Input buffer contains unsupported image format. Please upload a valid JPEG, PNG, or WebP image."
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

### Test 9: Aadhaar selected + Unsupported file format (PDF document)
- **UI Outcome**: `INVALID_IMAGE`
- **Explanation Message**: "Unsupported file type: application/pdf. Allowed types: JPEG, PNG, WEBP."
```json
{
  "success": false,
  "status": "INVALID_IMAGE",
  "selectedType": "aadhaar",
  "detectedType": null,
  "confidence": 0,
  "message": "Unsupported file type: application/pdf. Allowed types: JPEG, PNG, WEBP."
}
```

### Test 10: Backend unavailable (Server offline)
- **UI Outcome**: `NETWORK_ERROR`
- **Explanation Message**: "Could not connect to the backend server. Please verify the backend is running."
```json
{
  "success": false,
  "status": "NETWORK_ERROR",
  "error": ""
}
```

