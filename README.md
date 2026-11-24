# AI-Based Identity Document Classification and Verification System

A lightweight, robust full-stack AI web application designed to automatically identify uploaded Indian identity documents and verify whether they match the document type declared by the user.

Built for college project demonstrations and engineering reviews with **clean separation between user input and model prediction**, **zero simulated data**, and a **genuine deep learning transfer-learning model**.

---

## 📌 Project Overview & Verification Workflow

The system supports four official Indian identity document categories:
1. **Aadhaar Card**
2. **PAN Card**
3. **Indian Passport**
4. **Driving Licence**

### The Core Verification Workflow
```text
User selects claimed document type (e.g. Aadhaar)
       ↓
Uploads document image (JPEG, PNG, WebP)
       ↓
AI Model independently predicts actual document type
(The user selection is NEVER passed into the model)
       ↓
Application checks prediction confidence against threshold (0.70)
       ↓
Application compares selected type with detected type
       ↓
Displays Transparent Outcome:
  • MATCH: Document matched user claim (Forest Green)
  • MISMATCH: Detected type differs from claim (Muted Red, states actual detected document)
  • UNCERTAIN: Confidence < 70% or blurry/unrecognizable image (Warm Amber)
  • INVALID_IMAGE: Corrupt file, missing payload, or unsupported format
```

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide React icons, Axios.
- **Backend**: Node.js, Express.js, Multer (`memoryStorage`), Sharp (image decoding, resizing, and normalization).
- **Machine Learning**: TensorFlow.js (`@tensorflow/tfjs`), Pretrained MobileNet v2 (frozen feature extractor), custom Dense classification head.
- **Design System**: Natural Forest Green (`#234B3A`), Deep Green (`#18392C`), Light Beige (`#F5F0E5`), Warm White (`#FFFDF8`), and Sage (`#DCE6D9`).

---

## 🧠 Machine Learning Architecture

```text
Input Image (Raw Buffer)
       ↓
Sharp Preprocessing: Resize to 224×224 RGB, removeAlpha, normalized to [-1, 1]
       ↓
Tensor [1, 224, 224, 3]
       ↓
Pretrained MobileNet v2 (Frozen Backbone - Global Average Pooling)
       ↓
Feature Embedding Vector [1, 1280]
       ↓
Dense Layer (128 units, ReLU, He-Normal)
       ↓
Dropout (0.3 rate)
       ↓
Dense Layer (64 units, ReLU)
       ↓
Dropout (0.2 rate)
       ↓
Dense Output Layer (4 units, Softmax)
       ↓
Class Probabilities: [aadhaar, driving_license, pan, passport]
```

- **Total Trainable Parameters**: 172,484
- **Loss Function**: Categorical Crossentropy
- **Optimizer**: Adam ($\text{learning rate} = 0.0005$)
- **Runtime Backend**: TensorFlow.js CPU Backend (pure JavaScript engine, verified on Node.js v26 on Windows 11).

---

## 📊 Dataset Structure & Evaluation Results

### Working Dataset Distribution (`dataset_working/`)
All original dataset images (`dataset/`) remain 100% intact and untouched. The model was trained and evaluated strictly on the partitioned, zero-leakage working dataset:

| Document Category | Unique Base Docs | Train Split | Valid Split | Test Split | Total Images |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Aadhaar Card** | 29 | 487 | 124 | 135 | **746** |
| **PAN Card** | 1,387 | 1,050 | 188 | 150 | **1,388** |
| **Driving Licence** | 762 | 1,201 | 152 | 151 | **1,504** |
| **Indian Passport** | 1,051 | 1,111 | 150 | 151 | **1,412** |
| **Total** | **3,229** | **3,849** | **614** | **587** | **5,050** |

### Evaluation Metrics (Evaluated on 587 Unseen Test Images)

- **Overall Test Accuracy**: **83.13%** (488 / 587 correct)
- **Validation Accuracy**: **82.08%** (504 / 614 correct)
- **Macro-Averaged F1-Score**: **83.27%**
- **Weighted-Averaged F1-Score**: **83.22%**

#### Per-Class Performance Breakdown

| Class | Support | Recall (Accuracy) | Precision | F1-Score |
| :--- | :---: | :---: | :---: | :---: |
| **Driving Licence** | 151 | **94.70%** | 71.86% | **81.71%** |
| **Indian Passport** | 151 | **83.44%** | 83.44% | **83.44%** |
| **Aadhaar Card** | 135 | **79.26%** | **92.24%** | **85.26%** |
| **PAN Card** | 150 | **74.67%** | **92.56%** | **82.66%** |

#### Confusion Matrix (Ground Truth vs. Predictions)

| True \ Pred | Aadhaar | Driving Licence | PAN | Passport | Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Aadhaar** | **107** | 28 | 0 | 0 | 135 |
| **Driving Licence** | 1 | **143** | 2 | 5 | 151 |
| **PAN** | 7 | 11 | **112** | 20 | 150 |
| **Passport** | 1 | 17 | 7 | **126** | 151 |

> ⚠️ **Important Aadhaar Dataset Context**: Although the test split contains 135 Aadhaar images, they originate from 5 unique source documents that were augmented. While document-level grouping eliminated cross-split data leakage, 79.26% recall on 5 source documents indicates that broader Aadhaar data collection is recommended before production deployment.

---

## ⚡ Performance Benchmarks (Measured)

| Metric | Measured Value | Notes |
| :--- | :---: | :--- |
| **Backend Startup & Model Preload** | **12.44 s** | Loads MobileNet v2 graph model + Dense head once on server boot |
| **Average Inference Latency** | **1,019.7 ms** | End-to-end (Sharp resizing + MobileNet feature extraction + Dense prediction) |
| **Min / Max Latency** | **811 ms / 1,224 ms** | Measured over 10 consecutive passes on Intel i5-1235U CPU |
| **Memory Behavior** | **21.28 MB final heap** | Zero memory leak (-1.55 MB net heap delta; V8 sweeps all buffers) |
| **Frontend Production Build** | **352.5 KB (0.34 MB)** | Ultra-lightweight Vite bundle (gzipped: ~106 KB) |

---

## 📁 Project Structure

```text
Document Classification/
├── dataset/                        # Original raw dataset (preserved intact)
├── dataset_working/                # Cleaned, partitioned, zero-leakage working dataset
│   ├── aadhaar/ (train/valid/test)
│   ├── driving_license/ (train/valid/test)
│   ├── pan/ (train/valid/test)
│   └── passport/ (train/valid/test)
├── client/                         # React 19 + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Header with live model status badge
│   │   │   ├── HomeView.jsx        # Project overview, specs & metrics
│   │   │   ├── VerifyView.jsx      # Interactive 4-card upload & result screen
│   │   │   └── Footer.jsx          # Scope & privacy notice
│   │   ├── services/
│   │   │   └── api.js              # Axios backend client
│   │   ├── App.jsx                 # Main state & tab controller
│   │   └── index.css               # Tailwind CSS v4 design tokens
│   ├── .env                        # VITE_API_BASE_URL=http://localhost:5000
│   ├── package.json
│   └── vite.config.js              # Proxy to port 5000
├── server/                         # Express.js backend
│   ├── src/
│   │   ├── controllers/
│   │   │   └── classifyController.js # Verification logic & thresholding
│   │   ├── middleware/
│   │   │   └── uploadMiddleware.js   # Multer memoryStorage (no disk saving)
│   │   ├── ml/
│   │   │   ├── preprocessor.js       # Sharp 224x224 RGB image normalization
│   │   │   └── localFileHandler.js   # Custom tfjs model IOHandler for Node
│   │   ├── routes/
│   │   │   └── api.js                # Endpoints (/health, /model/status, /dataset/stats, /classify)
│   │   ├── services/
│   │   │   └── modelService.js       # Singleton model loading & inference engine
│   │   └── app.js                    # Express application entrypoint
│   ├── scripts/
│   │   ├── inspectDataset.js         # Dataset inspection & leakage analysis
│   │   ├── prepareDataset.js         # Zero-leakage partitioning script
│   │   ├── trainModel.js             # MobileNet transfer-learning training script
│   │   ├── testPhase4.js             # Phase 4 API test suite
│   │   ├── testPhase5.js             # Phase 5 E2E integration test suite
│   │   ├── testPhase6Functional.js   # Phase 6 16-case functional test suite
│   │   ├── measurePerformance.js     # Phase 6 performance benchmark script
│   │   └── captureScreenshots.js     # Automated browser screenshot capture
│   └── package.json
├── models/                         # Local model storage
│   ├── document_classifier/        # Trained head (model.json, weights.bin, metadata.json)
│   └── .cache_features/            # Precomputed 1280-d MobileNet feature cache
├── reports/                        # Detailed generated reports
│   ├── screenshots/                # Real browser UI screenshots
│   ├── dataset_inspection_report.md
│   ├── dataset_preparation_report.md
│   ├── model_evaluation_report.md
│   ├── phase4_api_test_results.md
│   ├── phase5_frontend_workflow_test_results.md
│   └── phase6_functional_test_results.md
├── .gitignore
└── README.md
```

---

## 🚀 Quickstart & Local Setup Guide

### 1. Prerequisites
- **Node.js** (v18, v20, v22, or v26 verified)
- **npm** (v9 or v10+)
- **Windows 11 / macOS / Linux** (CPU execution supported)

### 2. Installation
Install server and client dependencies:
```powershell
# From project root:
cd "Document Classification/server"
npm install

cd "../client"
npm install
```

### 3. Running the Backend Server
```powershell
cd "Document Classification/server"
npm start
```
*Backend runs on `http://localhost:5000`.*  
*Health Check: `http://localhost:5000/api/health`*  
*Model Status: `http://localhost:5000/api/model/status`*

### 4. Running the Frontend Development Server
In a separate terminal:
```powershell
cd "Document Classification/client"
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📡 API Reference

### `POST /api/classify`
Accepts a single document image and the claimed document category.
- **Form Data**:
  - `image`: File (JPEG, PNG, WebP; max 10 MB)
  - `selectedType`: String (`aadhaar` | `pan` | `passport` | `driving_license`)
- **Sample Success Response (MATCH)**:
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

### `GET /api/model/status`
Returns model readiness, class order, rejection threshold, and full training evaluation metrics.

### `GET /api/dataset/stats`
Returns image counts, split balances, and leakage audit summaries.

---

## 🔒 Security & Privacy Review

1. **No Permanent Storage**: Images are uploaded strictly into Node.js RAM (`multer.memoryStorage()`), preprocessed into memory buffers, and immediately garbage-collected upon response completion. No identity images are written to the disk.
2. **Zero PII Logging**: No Aadhaar numbers, PAN numbers, passport numbers, names, or addresses are logged or extracted.
3. **Strict Validation**: Upload size is capped at 10 MB, and file types are restricted to valid image MIME types (`image/jpeg`, `image/png`, `image/webp`).
4. **Scope Notice**: The application classifies document categories only. It does not certify official legal validity, government registration, or detect physical forgery.

---

## ⚠️ Known Limitations & The 'Other' Class

- **Absence of 5th 'Other' Dataset**: Because the original dataset contained only 4 identity classes, no fake or synthetic 'Other' images were fabricated.
- **Softmax Closed-Set Behavior**: In a 4-class classifier, softmax probabilities always sum to 100%. An unrelated photograph (e.g., a green landscape) will be forced onto the 4 classes and may receive an artificially high probability.
- **Mitigation via Rejection Threshold**: Any prediction with confidence **< 70%** is classified as **`UNCERTAIN`**, asking the user for a clearer image rather than guessing a document type.
