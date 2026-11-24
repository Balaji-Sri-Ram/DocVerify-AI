# PAN Classification Problem Investigation Report

**Execution Date**: 2026-11-19T18:18:14.576Z

## 1. 40-Image Ground-Truth Benchmark Results

| Category | Tested | Correct | Misclassified | Accuracy | Major Confusion Pattern |
|---|---|---|---|---|---|
| **pan** | 10 | 9 | 1 | **90%** | driving_license (1) |
| **driving_license** | 10 | 8 | 2 | **80%** | aadhaar (1), pan (1) |
| **aadhaar** | 10 | 10 | 0 | **100%** | None |
| **passport** | 10 | 9 | 1 | **90%** | pan (1) |

## 2. Detailed Predictions on 10 PAN Card Test Images

| # | File | Ground Truth | Prediction | Confidence | Probabilities (Aadh / DL / PAN / Pass) |
|---|---|---|---|---|---|
| 1 | `00c167be-imgtopdf_generated_25...` | pan | **pan** | 98.8% | 0.1% / 0.0% / 98.8% / 1.1% |
| 2 | `00fb6eeb-58c10f76367dd5b167225...` | pan | **driving_license** | 84.5% | 1.6% / 84.5% / 8.8% / 5.1% |
| 3 | `01d05582-5847b2009867b37d04746...` | pan | **pan** | 89.2% | 0.3% / 3.8% / 89.2% / 6.7% |
| 4 | `0a38d6ac-imgtopdf_generated_22...` | pan | **pan** | 99.1% | 0.1% / 0.1% / 99.1% / 0.6% |
| 5 | `0b169e06-5844e4ba2b1bd3e91955b...` | pan | **pan** | 59.4% | 1.3% / 15.8% / 59.4% / 23.6% |
| 6 | `0e626de1-56a8-4965-acaf-811cea...` | pan | **pan** | 79.0% | 0.3% / 5.8% / 79.0% / 14.9% |
| 7 | `110_jpg.rf.a9d04154c2ca7411b63...` | pan | **pan** | 100.0% | 0.0% / 0.0% / 100.0% / 0.0% |
| 8 | `1148_png_jpg.rf.34f8e4f358c3f5...` | pan | **pan** | 91.2% | 0.1% / 3.2% / 91.2% / 5.4% |
| 9 | `114_png.rf.77bb80dc148fc2d068d...` | pan | **pan** | 100.0% | 0.0% / 0.0% / 100.0% / 0.0% |
| 10 | `115_jpg.rf.9f2a01b4a2102011d3d...` | pan | **pan** | 100.0% | 0.0% / 0.0% / 100.0% / 0.0% |
