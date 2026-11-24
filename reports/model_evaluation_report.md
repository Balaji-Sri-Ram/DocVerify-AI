# Model Training & Evaluation Report (Phase 3)

**Execution Date**: 2026-11-22T09:49:51.709Z
**Model Architecture**: Pretrained MobileNet v2 (Frozen Feature Extractor) + Custom Dense Head
**Backend**: cpu (CPU)
**Head Training Duration**: 743.6 seconds (Total Pipeline: 748.4s)

## 1. Executive Evaluation Summary

- **Overall Test Accuracy**: **89.61%** (587 test images)
- **Validation Accuracy**: **91.21%** (614 valid images)
- **Macro-Averaged F1-Score**: **89.51%**
- **Weighted-Averaged F1-Score**: **89.40%**

## 2. Per-Class Test Performance

| Class | Accuracy | Precision | Recall | F1-Score | Support (Test Images) |
|---|---|---|---|---|---|
| **aadhaar** | 100.00% | 87.66% | 100.00% | 93.43% | 135 |
| **driving_license** | 96.03% | 86.31% | 96.03% | 90.91% | 151 |
| **pan** | 87.33% | 89.73% | 87.33% | 88.51% | 150 |
| **passport** | 76.16% | 96.64% | 76.16% | 85.19% | 151 |
| **Macro Avg** | - | 90.08% | 89.88% | **89.51%** | 587 |
| **Weighted Avg** | - | 90.15% | 89.61% | **89.40%** | 587 |

## 3. Confusion Matrix (Test Split)

Rows represent Ground Truth, Columns represent Model Predictions:

| True Class \ Predicted | **aadhaar** | **driving_license** | **pan** | **passport** |
|---|---|---|---|---|
| **aadhaar** | 135 | 0 | 0 | 0 |
| **driving_license** | 3 | 145 | 2 | 1 |
| **pan** | 5 | 11 | 131 | 3 |
| **passport** | 11 | 12 | 13 | 115 |

## 4. Aadhaar Generalization Analysis

- **Unique Base Documents in Test Split**: 5 base documents (135 images).
- **Test Accuracy for Aadhaar**: **100.00%** (Precision: 87.66%, Recall: 100.00%).
- **Findings**: Because document-level partitioning grouped augmented copies into distinct splits in Phase 2, this evaluation reflects genuine generalization to unseen Aadhaar source documents rather than memorized augmentations.

## 5. Training History

| Epoch | Training Loss | Training Accuracy | Validation Loss | Validation Accuracy |
|---|---|---|---|---|
| 1 | 1.3009 | 36.40% | 1.1281 | 56.84% |
| 2 | 1.0495 | 54.27% | 0.8772 | 66.12% |
| 3 | 0.8538 | 64.61% | 0.6678 | 73.13% |
| 4 | 0.7070 | 71.58% | 0.5645 | 83.88% |
| 5 | 0.6085 | 75.99% | 0.5782 | 73.62% |
| 6 | 0.5756 | 76.28% | 0.4426 | 85.99% |
| 7 | 0.5077 | 80.15% | 0.4057 | 85.83% |
| 8 | 0.4560 | 82.83% | 0.4293 | 82.74% |
| 9 | 0.4303 | 82.59% | 0.3394 | 89.41% |
| 10 | 0.4059 | 84.10% | 0.3081 | 90.07% |
| 11 | 0.3990 | 84.62% | 0.2936 | 91.37% |
| 12 | 0.3493 | 86.70% | 0.4614 | 82.08% |
| 13 | 0.3666 | 85.09% | 0.3762 | 86.97% |
| 14 | 0.3580 | 86.44% | 0.2820 | 90.55% |
| 15 | 0.3413 | 86.65% | 0.2981 | 89.41% |
| 16 | 0.3371 | 87.30% | 0.3126 | 88.60% |
| 17 | 0.3002 | 88.65% | 0.2526 | 92.02% |
| 18 | 0.2990 | 89.24% | 0.2571 | 91.04% |
| 19 | 0.2893 | 88.49% | 0.3648 | 85.99% |
| 20 | 0.3064 | 87.69% | 0.2648 | 91.21% |

## 6. Real-World Limitations & 'Other' Class Handling

1. **No Fabricated 'Other' Class**: As the 'Other' dataset has not been provided, the model is strictly trained on the 4 genuine identity document classes.
2. **Recommended Decision Threshold**: Based on validation distribution, a minimum softmax confidence threshold of **0.70** is recommended. Any prediction where confidence < 0.70 should be treated as **UNCERTAIN**.
3. **Tampering & Authenticity**: This model verifies document visual category only, not legal validity or authenticity.
