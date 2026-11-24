# Dataset Preparation & Leakage Resolution Report (Phase 2)

**Execution Date**: 2026-11-19T12:15:08.132Z
**Source Directory**: `D:\VickeyApps Intern\Document Classification\dataset` (Preserved Intact)
**Working Directory**: `D:\VickeyApps Intern\Document Classification\dataset_working`

## 1. Final Working Dataset Distribution

| Document Category | Base Documents | Train Images | Valid Images | Test Images | Total Images |
|---|---|---|---|---|---|
| **aadhaar** | 29 | 487 | 124 | 135 | **746** |
| **pan** | 1387 | 1050 | 188 | 150 | **1388** |
| **driving_license** | 762 | 1201 | 152 | 151 | **1504** |
| **passport** | 1051 | 1111 | 150 | 151 | **1412** |
| **Total** | - | **3849** | **614** | **587** | **5050** |

## 2. Key Actions Taken & Leakage Resolutions

### 1. Aadhaar Data Leakage Resolution
- **Previous State**: 27 out of 29 base documents had augmented variants spanning both train and valid splits.
- **Resolution**: All augmented variations of each base document were grouped together. The 29 unique document groups were deterministically partitioned:
  - **Train**: 19 base documents (487 images)
  - **Valid**: 5 base documents (124 images)
  - **Test**: 5 base documents (135 images)
- **Leakage**: **0%** cross-split leakage verified.

### 2. Creation of Dedicated PAN Test Split
- **Previous State**: PAN had 0 test images (1,200 train, 188 valid).
- **Resolution**: 150 unique base documents were extracted from the training set to form a dedicated test set:
  - **Train**: 1050 images
  - **Valid**: 188 images
  - **Test**: 150 images

### 3. Driving Licence Balance & Test Split Augmentation
- **Previous State**: Test set had only 5 images; class was heavily unbalanced.
- **Resolution**: Selected a clean, grouped working subset of ~1,500 images while preserving original files untouched:
  - **Train**: 1201 images
  - **Valid**: 152 images
  - **Test**: 151 images
  - Test capacity increased by 30x (from 5 to 151 images) with zero document-level leakage.

### 4. Passport Re-balancing & Grouping
- **Resolution**: Base documents were grouped to eliminate cross-split augmentations:
  - **Train**: 1111 images
  - **Valid**: 150 images
  - **Test**: 151 images

## 3. Specification & Acquisition Plan for Missing 'Other' Class

Per project guidelines, no synthetic or dummy data has been fabricated. To enable the 5th class ('other') for rejecting unsupported or unrelated images, the following dataset profile is required:

- **Target Volume**: ~1,200 - 1,500 real-world images (Train: ~1,000, Valid: ~150, Test: ~150).
- **Image Categories Needed**:
  1. **Non-identity documents**: Electricity/water utility bills, GST invoices, salary slips, bank passbooks, university degrees, printed forms.
  2. **Everyday non-document objects**: Selfies, group portraits, landscapes, pets, vehicles, office desks, food items.
  3. **Edge cases**: Blank paper sheets, blurred documents, backside of plastic cards without identifiable markings.
- **Target Directory Structure**:
  ```text
  dataset_working/other/
  ├── train/
  ├── valid/
  └── test/
  ```
- **Interim Handling**: Until genuine 'Other' class images are collected and trained, the application will use confidence thresholding (softmax rejection threshold) to detect uncertain and unclassifiable inputs, rather than guessing a document category.
