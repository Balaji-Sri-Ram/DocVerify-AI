# Dataset Inspection Report

**Date**: 2026-11-19T12:10:42.400Z
**Dataset Location**: `D:\VickeyApps Intern\Document Classification\dataset`

## 1. Executive Summary

- **Supported Classes Identified**: 4 (aadhaar, driving_license, pan, passport)
- **Total Raw Images**: 5276
- **Total Annotation Files (.txt)**: 11718
- **Split Breakdown (Raw)**:
  - **train**: 4395 images
  - **valid**: 749 images
  - **test**: 132 images

## 2. Category Distribution Table

| Category | Train | Valid | Test | Total Images | Annotations (.txt) | Unique Base Documents |
|---|---|---|---|---|---|---|
| **aadhaar** | 669 | 46 | 31 | **746** | 746 | 29 |
| **driving_license** | 1274 | 451 | 5 | **1730** | 8172 | 881 |
| **pan** | 1200 | 188 | 0 | **1388** | 1388 | 1387 |
| **passport** | 1252 | 64 | 96 | **1412** | 1412 | 1051 |

## 3. Duplicate and Augmented Data Leakage Analysis

### Exact Byte-level Duplicates
- **Exact Identical Byte Hashes (SHA-256)**: 0 (no byte-for-byte duplicates found).

### Augmented Document Leakage (Source Document Overlap Across Splits)
A critical finding from analyzing Roboflow source prefixes (`.rf.<hash>`):

| Category | Unique Base Docs | Leaked Across Splits | Leakage Rate | Severity |
|---|---|---|---|---|
| **aadhaar** | 29 | 27 | 93.10% | **CRITICAL** |
| **driving_license** | 881 | 0 | 0.00% | **NONE** |
| **pan** | 1387 | 0 | 0.00% | **NONE** |
| **passport** | 1051 | 1 | 0.10% | **LOW** |

> [!CAUTION]
> **Data Leakage in Aadhaar**: 27 out of 29 unique Aadhaar base documents have augmented copies in both `train` and `valid` in the raw dataset. Evaluating a model on this validation set would measure memorization rather than generalization. In Phase 2, a clean working subset must strictly group images by their base document identifier.

## 4. Key Observations & Action Plan for Phase 2

1. **PAN Split Status**: PAN has **0 test images** (1200 train, 188 valid). A dedicated test split (~150 images) will be created from the training set, ensuring base documents do not overlap.
2. **Driving Licence Volume & Balance**: Driving licence has 1,274 train and 451 valid images. In Phase 2, a balanced working subset of ~1,200 training images will be selected while preserving original files untouched.
3. **Aadhaar Re-splitting**: The 29 base Aadhaar documents must be split at the document level (e.g. 21 train, 4 valid, 4 test) so that no augmented variants of the same document cross split boundaries.
4. **Missing 'Other' Class**: The dataset currently only contains the 4 identity classes. An 'Other' class (for non-identity documents or irrelevant images) is missing and must be reported and planned for.
5. **Annotations**: Object detection bounding box annotations (.txt) are preserved intact but will not be used, as we are training an image classifier.
