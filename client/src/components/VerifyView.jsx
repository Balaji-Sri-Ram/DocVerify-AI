import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Camera,
  FileCheck2,
  FileX2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  X,
  CreditCard,
  FileText,
  BookOpen,
  Car,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { classifyDocument } from '../services/api';
import DocumentScanner, { stopAllCameraHardware } from './DocumentScanner';
import DocumentFormView from './DocumentFormView';

const DOCUMENT_OPTIONS = [
  {
    id: 'aadhaar',
    name: 'Aadhaar Card',
    issuer: 'UIDAI',
    icon: CreditCard,
    desc: 'National biometric & demographic ID'
  },
  {
    id: 'pan',
    name: 'PAN Card',
    issuer: 'Income Tax Dept',
    icon: FileText,
    desc: 'Permanent Account Number plastic card'
  },
  {
    id: 'passport',
    name: 'Indian Passport',
    issuer: 'Ministry of External Affairs',
    icon: BookOpen,
    desc: 'Official travel booklet format'
  },
  {
    id: 'driving_license',
    name: 'Driving Licence',
    issuer: 'Transport Dept',
    icon: Car,
    desc: 'State-issued driver license card'
  }
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export default function VerifyView() {
  const [selectedType, setSelectedType] = useState('aadhaar');
  const [inputMode, setInputMode] = useState('scan'); // 'scan' | 'upload'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  // Verification states
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('verify'); // 'verify' | 'form'

  const fileInputRef = useRef(null);

  // Ensure camera hardware is shut down when leaving page or switching tabs
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopAllCameraHardware();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopAllCameraHardware();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Measure real-time image dimensions and size
  const updateFileMeta = (file, previewUrl, sourceName) => {
    const img = new Image();
    img.onload = () => {
      const formattedSize = file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
      const format = file.type ? file.type.replace('image/', '').toUpperCase() : 'JPEG';
      setFileMeta({
        formattedSize,
        resolution: `${img.naturalWidth} × ${img.naturalHeight} px`,
        format,
        source: sourceName
      });
    };
    img.src = previewUrl;
  };

  // Handle camera capture callback
  const handleCameraCapture = (file, previewUrl) => {
    stopAllCameraHardware();
    setValidationError('');
    setResult(null);
    if (filePreview && filePreview !== previewUrl) {
      URL.revokeObjectURL(filePreview);
    }
    const finalUrl = previewUrl || (file ? URL.createObjectURL(file) : null);
    setSelectedFile(file);
    setFilePreview(finalUrl);
    updateFileMeta(file, finalUrl, 'Camera Scan');
  };

  // Retake photo in camera mode
  const handleRetakeCamera = () => {
    stopAllCameraHardware();
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    setFileMeta(null);
    setResult(null);
    setStep('verify');
    setValidationError('');
    setInputMode('scan');
  };

  // Handle file selection (Upload mode)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
    // Reset so re-selecting the same file also triggers change
    if (e.target) {
      e.target.value = '';
    }
  };

  const validateAndSetFile = (file) => {
    setValidationError('');
    setResult(null);

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setValidationError(`Unsupported file format (${file.type || 'unknown'}). Please upload a JPEG, PNG, or WebP image.`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setValidationError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
      return;
    }

    // Clean up any existing preview URL
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
    updateFileMeta(file, previewUrl, 'File Upload');
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // Reset form
  const handleReset = () => {
    stopAllCameraHardware();
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    setFileMeta(null);
    setResult(null);
    setStep('verify');
    setValidationError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit to Real Backend API
  const handleVerify = async () => {
    if (!selectedType) {
      setValidationError('Please select the claimed document type.');
      return;
    }

    if (!selectedFile) {
      setValidationError('Please upload a document image to verify.');
      return;
    }

    setIsLoading(true);
    setValidationError('');
    setResult(null);

    try {
      const response = await classifyDocument(selectedFile, selectedType);
      setResult(response);
    } catch (err) {
      setResult({
        success: false,
        status: 'NETWORK_ERROR',
        selectedType,
        detectedType: null,
        confidence: 0,
        message: err.message || 'Failed to communicate with classification backend.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDocName = (typeKey) => {
    if (!typeKey || typeKey === 'other' || typeKey === 'none' || typeKey === 'unknown') {
      return 'Other';
    }
    const found = DOCUMENT_OPTIONS.find((d) => d.id === typeKey);
    return found ? found.name : 'Other';
  };

  // If matched and user transitioned to the form step, render the interactive form view
  if (step === 'form' && result && (result.status === 'CORRECT_DOCUMENT' || result.status === 'MATCH')) {
    return (
      <DocumentFormView
        documentType={result.detectedType || selectedType}
        extractedData={result.extractedFields || {}}
        selectedFile={selectedFile}
        filePreview={filePreview}
        verificationResult={result}
        onBackToVerification={() => setStep('verify')}
        onResetAll={handleReset}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Stepper Progress Bar */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-forest/70 px-1 sm:px-2 max-w-xl mx-auto">
        <span className="flex items-center space-x-1 sm:space-x-1.5 text-forest font-bold shrink-0">
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-forest text-warm-white text-[10px] sm:text-[11px] inline-flex items-center justify-center">
            1
          </span>
          <span className="hidden sm:inline">Upload & Verify</span>
          <span className="sm:hidden text-[11px]">1. Verify</span>
        </span>
        <span className="h-0.5 w-6 sm:w-20 bg-muted-border rounded mx-1.5 sm:mx-2" />
        <span className="flex items-center space-x-1 sm:space-x-1.5 text-forest/40 shrink-0">
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-muted-border text-forest/60 text-[10px] sm:text-[11px] inline-flex items-center justify-center">
            2
          </span>
          <span className="hidden sm:inline">Review & Edit Form</span>
          <span className="sm:hidden text-[11px]">2. Form</span>
        </span>
        <span className="h-0.5 w-6 sm:w-20 bg-muted-border rounded mx-1.5 sm:mx-2" />
        <span className="flex items-center space-x-1 sm:space-x-1.5 text-forest/40 shrink-0">
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-muted-border text-forest/60 text-[10px] sm:text-[11px] inline-flex items-center justify-center">
            3
          </span>
          <span className="hidden sm:inline">Submit</span>
          <span className="sm:hidden text-[11px]">3. Submit</span>
        </span>
      </div>

      {/* Page Title & Explanation */}
      <div className="text-center space-y-1 sm:space-y-2 px-2">
        <h2 className="text-xl sm:text-3xl font-extrabold text-forest-deep tracking-tight">
          Verify Your Identity Document
        </h2>
        <p className="text-[11px] sm:text-sm text-forest/70 max-w-xl mx-auto leading-relaxed">
          Select what document you are presenting, upload its photo, and let our trained AI model independently verify if the uploaded document matches your claim.
        </p>
        {/* Mobile notice placed at top */}
        <p className="lg:hidden text-[11px] text-red-600 font-medium px-2 pt-1 leading-snug">
          <span className="font-bold">Note:</span> Only updated documents are verified. If your documents are outdated or very old documents, please update them and then verify it.
        </p>
      </div>

      {/* Verification Card with Side Note outside the complete box */}
      <div className="relative">
        {/* Main Verification Card */}
        <div className="bg-warm-white border border-muted-border rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs space-y-6 sm:space-y-8">
        {/* Step 1: Document Selection */}
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] sm:text-xs font-bold text-forest-deep uppercase tracking-wider flex items-center space-x-1.5">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-forest text-warm-white text-[10px] sm:text-[11px] inline-flex items-center justify-center font-bold shrink-0">
                1
              </span>
              <span>Select Claimed Document Type</span>
            </label>
            <span className="text-[10px] sm:text-[11px] text-forest/60">Choose 1 of 4 categories</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {DOCUMENT_OPTIONS.map((doc) => {
              const IconComp = doc.icon;
              const isSelected = selectedType === doc.id;
              return (
                <button
                  key={doc.id}
                  id={`select-${doc.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedType(doc.id);
                    setResult(null);
                  }}
                  className={`p-2.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between touch-manipulation min-h-[82px] sm:min-h-[96px] active:scale-[0.98] ${
                    isSelected
                      ? 'border-forest bg-sage-light text-forest shadow-xs ring-2 ring-forest/20'
                      : 'border-muted-border bg-warm-white text-forest/80 hover:border-forest/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-forest text-warm-white' : 'bg-beige text-forest'}`}>
                      <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest shrink-0" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-forest-deep truncate">{doc.name}</div>
                    <div className="text-[9px] sm:text-[10px] text-forest/60 font-medium truncate">{doc.issuer}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Choose Input Method (Scan or Upload) & Provide Document Image */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-[11px] sm:text-xs font-bold text-forest-deep uppercase tracking-wider flex items-center space-x-1.5">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-forest text-warm-white text-[10px] sm:text-[11px] inline-flex items-center justify-center font-bold shrink-0">
                2
              </span>
              <span>Provide Document Image</span>
            </label>
            <span className="text-[10px] sm:text-[11px] text-forest/60">
              Live Camera Scanner or Direct File Upload
            </span>
          </div>

          {/* Mode Switcher Tabs: Scan with Camera vs Upload Image File */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-beige-light rounded-xl border border-muted-border">
            <button
              type="button"
              onClick={() => {
                setInputMode('scan');
                if (!selectedFile) setValidationError('');
              }}
              className={`py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer touch-manipulation ${
                inputMode === 'scan'
                  ? 'bg-forest text-warm-white shadow-xs'
                  : 'text-forest/70 hover:text-forest active:bg-beige'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>Scan with Camera</span>
              <span className={`hidden xs:inline text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                inputMode === 'scan' ? 'bg-sage text-forest' : 'bg-muted-border/60 text-forest/70'
              }`}>
                Camera
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopAllCameraHardware();
                setInputMode('upload');
                if (!selectedFile) setValidationError('');
              }}
              className={`py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer touch-manipulation ${
                inputMode === 'upload'
                  ? 'bg-forest text-warm-white shadow-xs'
                  : 'text-forest/70 hover:text-forest active:bg-beige'
              }`}
            >
              <UploadCloud className="w-4 h-4 shrink-0" />
              <span>Upload Image File</span>
              <span className={`hidden xs:inline text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                inputMode === 'upload' ? 'bg-sage text-forest' : 'bg-muted-border/60 text-forest/70'
              }`}>
                File
              </span>
            </button>
          </div>

          {/* Hidden file input for Upload mode */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* When an image is confirmed/selected, show the clean preview card (matching Screenshot 2) */}
          {filePreview ? (
            <div className="border border-muted-border rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-beige-light flex flex-col sm:flex-row items-center gap-3 sm:gap-4 shadow-xs">
              <div className="w-full sm:w-44 h-40 sm:h-36 rounded-xl overflow-hidden bg-warm-white border border-muted-border flex items-center justify-center relative shadow-xs shrink-0">
                <img
                  src={filePreview}
                  alt="Document Preview"
                  onError={(e) => {
                    if (selectedFile) {
                      const fresh = URL.createObjectURL(selectedFile);
                      setFilePreview(fresh);
                      e.target.src = fresh;
                    }
                  }}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1 w-full text-center sm:text-left">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-forest-deep text-xs sm:text-sm truncate max-w-full">
                    {selectedFile?.name || 'document_image.jpg'}
                  </h4>
                  <button
                    onClick={handleReset}
                    className="p-1 rounded-lg text-forest/50 hover:text-red-700 hover:bg-red-50 transition-colors shrink-0 touch-manipulation cursor-pointer"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-forest/70 truncate">
                  Size: {fileMeta?.formattedSize || `${(selectedFile?.size / 1024).toFixed(1)} KB`} • {fileMeta?.resolution ? `${fileMeta.resolution} • ` : ''}Source: {fileMeta?.source || (inputMode === 'scan' ? 'Camera Scan' : 'File Upload')}
                </p>
                <div className="pt-1.5 sm:pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      if (inputMode === 'scan') {
                        handleRetakeCamera();
                      } else {
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        fileInputRef.current?.click();
                      }
                    }}
                    className="text-xs font-semibold text-forest hover:underline cursor-pointer touch-manipulation py-1"
                  >
                    {fileMeta?.source === 'Camera Scan' || inputMode === 'scan' ? 'Retake Image' : 'Replace Image'}
                  </button>
                  <span className="text-muted-border self-center">•</span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-semibold text-red-700 hover:underline cursor-pointer touch-manipulation py-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* When no image is present yet: show Camera Scanner or Upload box */
            <>
              {inputMode === 'scan' ? (
                <DocumentScanner
                  selectedType={selectedType}
                  onCapture={handleCameraCapture}
                  onCancel={() => setInputMode('upload')}
                />
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer touch-manipulation ${
                    isDragging
                      ? 'border-forest bg-sage-light/60 scale-[1.01]'
                      : 'border-muted-border bg-beige-light hover:border-forest/50 hover:bg-beige/40 active:bg-beige/60'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-sage flex items-center justify-center text-forest mx-auto mb-2.5 sm:mb-3 shadow-xs">
                    <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h4 className="font-bold text-forest-deep text-xs sm:text-sm mb-1">
                    Drag and drop your document image here
                  </h4>
                  <p className="text-[11px] sm:text-xs text-forest/70 mb-3 sm:mb-4">
                    Supports JPEG, PNG, or WebP • Max 10 MB
                  </p>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-forest text-warm-white text-xs font-semibold hover:bg-forest-deep active:scale-[0.98] transition-all shadow-xs touch-manipulation"
                  >
                    Browse Image Files
                  </button>
                </div>
              )}
            </>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="leading-tight">{validationError}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {!result && (
          <div className="pt-1 sm:pt-2">
            <button
              id="verify-doc-btn"
              onClick={handleVerify}
              disabled={isLoading || !selectedFile}
              className={`w-full py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-[0.99] touch-manipulation ${
                isLoading || !selectedFile
                  ? 'bg-muted-border text-forest/40 cursor-not-allowed'
                  : 'bg-forest text-warm-white hover:bg-forest-deep'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-warm-white/40 border-t-warm-white rounded-full animate-spin shrink-0" />
                  <span>Running AI Classification...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Verify Document</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Real API Classification Result Section */}
        {result && (
          <div className="pt-3 sm:pt-4 border-t border-muted-border space-y-4 sm:space-y-6">
            {/* Multimodal Outcome Banners */}
            {(result.status === 'CORRECT_DOCUMENT' || result.status === 'MATCH') && (
              <div className="bg-[#EDF4F0] border-2 border-forest rounded-2xl p-4 sm:p-6 text-forest-deep shadow-xs space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-forest text-warm-white flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5 text-sage" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-forest truncate block">
                      Multimodal Verification Outcome
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-forest-deep tracking-tight leading-tight">
                      CORRECT DOCUMENT VERIFIED
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-forest-deep font-semibold leading-relaxed">
                  {result.message}
                </p>

                {/* 4-Panel Verification Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1 text-xs">
                  <div className="bg-warm-white/90 p-2.5 sm:p-3 rounded-xl border border-forest/20 min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-forest/70 font-semibold uppercase truncate">Selected Claim</div>
                    <div className="font-bold text-forest-deep text-xs sm:text-sm truncate">{getDocName(result.selectedType)}</div>
                  </div>
                  <div className="bg-warm-white/90 p-2.5 sm:p-3 rounded-xl border border-forest/20 min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-forest/70 font-semibold uppercase truncate">Final Detection</div>
                    <div className="font-bold text-forest text-xs sm:text-sm truncate">{getDocName(result.detectedType)}</div>
                  </div>
                  <div className="bg-warm-white/90 p-2.5 sm:p-3 rounded-xl border border-forest/20 min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-forest/70 font-semibold uppercase truncate">Visual Prediction</div>
                    <div className="font-bold text-forest-deep text-xs sm:text-sm truncate">
                      {getDocName(result.visualResult?.category || result.detectedType)}
                      <span className="text-[11px] font-normal text-forest/80 ml-1">
                        ({((result.visualResult?.confidence || result.confidence) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <div className="bg-warm-white/90 p-2.5 sm:p-3 rounded-xl border border-forest/20 min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-forest/70 font-semibold uppercase truncate">OCR Category</div>
                    <div className="font-bold text-forest text-xs sm:text-sm truncate">
                      {result.ocrResult?.category ? getDocName(result.ocrResult.category) : 'Detected'}
                      {result.ocrResult?.score ? ` (${result.ocrResult.score}%)` : ''}
                    </div>
                  </div>
                </div>

                {/* Decision Explanation & Text Evidence */}
                {result.explanation && (
                  <div className="bg-white/80 rounded-xl p-3 sm:p-3.5 border border-forest/20 text-xs text-forest-deep space-y-1.5">
                    <div className="font-bold uppercase tracking-wider text-[10px] text-forest">
                      Multimodal Decision Explanation
                    </div>
                    <p className="leading-relaxed font-medium break-words">{result.explanation}</p>
                    {result.ocrResult?.detectedKeywords?.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1 sm:gap-1.5 items-center">
                        <span className="text-[10px] text-forest/70 font-semibold">Verified Indicators:</span>
                        {result.ocrResult.detectedKeywords.concat(result.ocrResult.patternsDetected || []).map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-forest/10 text-forest text-[10px] font-semibold break-all">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Call to Action: Proceed to Auto-Filled Form */}
                <div className="pt-2">
                  <button
                    id="proceed-to-form-btn"
                    type="button"
                    onClick={() => setStep('form')}
                    className="w-full py-3.5 sm:py-4 rounded-xl bg-forest text-warm-white font-extrabold text-xs sm:text-sm hover:bg-forest-deep active:scale-[0.99] transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-4 h-4 text-sage" />
                    <span>Proceed to Auto-Filled Application Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {(result.status === 'WRONG_DOCUMENT' || result.status === 'MISMATCH') && (
              <div className="bg-[#FFF5F5] border-2 border-red-600 rounded-2xl p-4 sm:p-6 text-red-950 shadow-xs space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600 text-warm-white flex items-center justify-center shrink-0">
                    <FileX2 className="w-4 h-4 sm:w-5 sm:h-5 text-warm-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-red-700 truncate block">
                      Multimodal Verification Outcome
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-red-900 tracking-tight leading-tight">
                      WRONG DOCUMENT UPLOADED
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-red-900 font-semibold leading-relaxed">
                  {result.message}
                </p>

                {/* 4-Panel Verification Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1 text-xs">
                  <div className="bg-warm-white p-2.5 sm:p-3 rounded-xl border border-red-200 min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-red-700/80 font-semibold uppercase truncate">Selected Claim</div>
                    <div className="font-bold text-red-950 text-xs sm:text-sm line-through opacity-70 truncate">
                      {getDocName(result.selectedType)}
                    </div>
                  </div>
                  <div className="bg-warm-white p-2.5 sm:p-3 rounded-xl border border-red-300 min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-red-700 font-semibold uppercase truncate">Actual Detected</div>
                    <div className="font-bold text-red-700 text-xs sm:text-sm truncate">{getDocName(result.detectedType)}</div>
                  </div>
                  <div className="bg-warm-white p-2.5 sm:p-3 rounded-xl border border-red-200 min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-red-700/80 font-semibold uppercase truncate">Visual Prediction</div>
                    <div className="font-bold text-red-950 text-xs sm:text-sm truncate">
                      {getDocName(result.visualResult?.category || result.detectedType)}
                      <span className="text-[11px] font-normal text-red-800 ml-1">
                        ({((result.visualResult?.confidence || result.confidence) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <div className="bg-warm-white p-2.5 sm:p-3 rounded-xl border border-red-200 min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-red-700/80 font-semibold uppercase truncate">OCR Category</div>
                    <div className="font-bold text-red-700 text-xs sm:text-sm truncate">
                      {result.ocrResult?.category ? getDocName(result.ocrResult.category) : 'Not Detected'}
                      {result.ocrResult?.score ? ` (${result.ocrResult.score}%)` : ''}
                    </div>
                  </div>
                </div>

                {/* Decision Explanation */}
                {result.explanation && (
                  <div className="bg-white/80 rounded-xl p-3 sm:p-3.5 border border-red-200 text-xs text-red-950 space-y-1.5">
                    <div className="font-bold uppercase tracking-wider text-[10px] text-red-700">
                      Reason for Rejection
                    </div>
                    <p className="leading-relaxed font-medium break-words">{result.explanation}</p>
                    {result.ocrResult?.detectedKeywords?.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1 sm:gap-1.5 items-center">
                        <span className="text-[10px] text-red-700/80 font-semibold">Detected Indicators:</span>
                        {result.ocrResult.detectedKeywords.concat(result.ocrResult.patternsDetected || []).map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-semibold break-all">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {result.status === 'UNRECOGNIZED_DOCUMENT' && (
              <div className="bg-[#FFFBEB] border-2 border-amber-600 rounded-2xl p-4 sm:p-6 text-amber-950 shadow-xs space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-600 text-warm-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-warm-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700 truncate block">
                      Verification Outcome
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-amber-950 tracking-tight leading-tight">
                      UNRECOGNIZED DOCUMENT
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-amber-950 font-semibold leading-relaxed">
                  {result.message}
                </p>

                {result.explanation && (
                  <div className="bg-white/80 rounded-xl p-3 sm:p-3.5 border border-amber-200 text-xs text-amber-950 space-y-1">
                    <div className="font-bold uppercase tracking-wider text-[10px] text-amber-700">
                      Diagnostic Note
                    </div>
                    <p className="leading-relaxed font-medium break-words">{result.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {(result.status === 'UNABLE_TO_VERIFY' || result.status === 'UNCERTAIN') && (
              <div className="bg-[#FFFBEB] border-2 border-amber-600 rounded-2xl p-4 sm:p-6 text-amber-950 shadow-xs space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-600 text-warm-white flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warm-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700 truncate block">
                      Verification Uncertainty
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-amber-950 tracking-tight leading-tight">
                      UNABLE TO VERIFY CONFIDENTLY
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-amber-950 font-semibold leading-relaxed">
                  {result.message}
                </p>

                {result.explanation && (
                  <div className="bg-white/80 rounded-xl p-3 sm:p-3.5 border border-amber-200 text-xs text-amber-950 space-y-1">
                    <div className="font-bold uppercase tracking-wider text-[10px] text-amber-700">
                      Evidence Analysis
                    </div>
                    <p className="leading-relaxed font-medium break-words">{result.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {(result.status === 'INVALID_IMAGE' || result.status === 'INVALID_SELECTION' || result.status === 'NETWORK_ERROR') && (
              <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 sm:p-6 text-red-900 shadow-xs space-y-2">
                <div className="flex items-center space-x-2 text-red-800 font-bold">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
                  <span className="text-xs sm:text-sm uppercase tracking-wide truncate">
                    {result.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-red-900 leading-relaxed font-medium">
                  {result.message}
                </p>
              </div>
            )}

            {/* Probability Distribution Breakdown */}
            {result.probabilities && (
              <div className="bg-beige-light border border-muted-border rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="text-[11px] sm:text-xs font-bold text-forest-deep uppercase tracking-wider">
                  Model Softmax Probability Breakdown
                </div>
                <div className="space-y-2">
                  {Object.entries(result.probabilities).map(([catKey, prob]) => {
                    const pct = (prob * 100).toFixed(1);
                    const isDetected = result.detectedType === catKey;
                    return (
                      <div key={catKey} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={`truncate mr-2 ${isDetected ? 'text-forest font-bold' : 'text-forest/70'}`}>
                            {getDocName(catKey)} {isDetected && '★'}
                          </span>
                          <span className="font-mono text-forest-deep shrink-0">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted-border/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isDetected ? 'bg-forest' : 'bg-forest/30'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Try Again Button */}
            <div className="pt-2">
              <button
                id="reset-btn"
                type="button"
                onClick={handleReset}
                className="w-full py-3 sm:py-3.5 rounded-xl border border-forest text-forest font-semibold text-xs sm:text-sm hover:bg-forest hover:text-warm-white active:scale-[0.99] transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs touch-manipulation"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Verify Another Document</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Note placed at the right side outside of the complete box at the top (aligned with document selection) */}
      <aside className="hidden lg:block lg:absolute lg:left-[calc(100%+1.5rem)] lg:top-6 lg:w-60 xl:w-72 text-red-600 text-xs sm:text-sm font-medium leading-relaxed pointer-events-none select-none">
        <p>
          <span className="font-bold">Note:</span> Only updated documents are verified. If your documents are outdated or very old documents, please update them and then verify it.
        </p>
      </aside>
    </div>
    </div>
  );
}
