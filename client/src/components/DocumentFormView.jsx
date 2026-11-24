import React, { useState } from 'react';
import {
  CreditCard,
  FileText,
  BookOpen,
  Car,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Edit3,
  Send,
  Eye,
  RotateCcw,
  AlertCircle,
  FileCheck2,
  Calendar,
  User,
  Hash,
  MapPin,
  Heart
} from 'lucide-react';

const DOC_CONFIGS = {
  aadhaar: {
    name: 'Aadhaar Card',
    issuer: 'UIDAI',
    icon: CreditCard,
    theme: 'border-forest/30 bg-forest/5',
    fields: [
      { key: 'aadhaarNumber', label: 'Aadhaar Number (12 Digits)', placeholder: '4567 8901 2345', required: true, icon: Hash, format: 'aadhaar' },
      { key: 'fullName', label: 'Full Name as on Aadhaar', placeholder: 'e.g. Rahul Sharma', required: true, icon: User },
      { key: 'dob', label: 'Date of Birth (DOB) / Year', placeholder: 'DD/MM/YYYY', required: true, icon: Calendar, format: 'date' },
      { key: 'gender', label: 'Gender', placeholder: 'Select Gender', required: true, type: 'select', options: ['Male', 'Female', 'Transgender'], icon: User },
      { key: 'vid', label: '16-Digit Virtual ID (VID)', placeholder: '9182 7364 5019 2837', required: false, icon: Hash },
      { key: 'addressOrGuardian', label: "Address / Father / Guardian", placeholder: 'e.g. S/O Ramesh Sharma, Pune, Maharashtra', required: false, icon: MapPin }
    ]
  },
  pan: {
    name: 'PAN Card',
    issuer: 'Income Tax Department',
    icon: FileText,
    theme: 'border-blue-700/30 bg-blue-50/30',
    fields: [
      { key: 'panNumber', label: 'Permanent Account Number (PAN)', placeholder: 'ABCDE1234F', required: true, uppercase: true, icon: Hash, format: 'pan' },
      { key: 'fullName', label: 'Cardholder Full Name', placeholder: 'e.g. RAMESH KUMAR SHARMA', required: true, icon: User },
      { key: 'fatherName', label: "Father's Full Name", placeholder: 'e.g. SURESH KUMAR SHARMA', required: true, icon: User },
      { key: 'dob', label: 'Date of Birth (DOB)', placeholder: 'DD/MM/YYYY', required: true, icon: Calendar, format: 'date' }
    ]
  },
  driving_license: {
    name: 'Driving Licence',
    issuer: 'Ministry of Road Transport',
    icon: Car,
    theme: 'border-amber-700/30 bg-amber-50/30',
    fields: [
      { key: 'dlNumber', label: 'Driving Licence Number', placeholder: 'e.g. MH02-20180012345', required: true, icon: Hash },
      { key: 'fullName', label: 'Licence Holder Name', placeholder: 'e.g. ANAND VERMA', required: true, icon: User },
      { key: 'dob', label: 'Date of Birth (DOB)', placeholder: 'DD/MM/YYYY', required: true, icon: Calendar, format: 'date' },
      { key: 'issueDate', label: 'Date of Issue', placeholder: 'DD/MM/YYYY', required: false, icon: Calendar, format: 'date' },
      { key: 'validTill', label: 'Valid Till / Expiry Date', placeholder: 'DD/MM/YYYY', required: true, icon: Calendar, format: 'date' },
      { key: 'vehicleClass', label: 'Authorized Vehicle Class', placeholder: 'e.g. LMV, MCWG', required: true, icon: Car },
      { key: 'bloodGroup', label: 'Blood Group', placeholder: 'e.g. O+, B+, A+', required: false, icon: Heart }
    ]
  },
  passport: {
    name: 'Indian Passport',
    issuer: 'Ministry of External Affairs',
    icon: BookOpen,
    theme: 'border-emerald-700/30 bg-emerald-50/30',
    fields: [
      { key: 'passportNumber', label: 'Passport Number', placeholder: 'e.g. Z4819203', required: true, uppercase: true, icon: Hash, format: 'passport' },
      { key: 'givenName', label: 'Given Name(s)', placeholder: 'e.g. PRIYA', required: true, icon: User },
      { key: 'surname', label: 'Surname', placeholder: 'e.g. PATEL', required: true, icon: User },
      { key: 'nationality', label: 'Nationality', placeholder: 'INDIAN', required: true, icon: User },
      { key: 'dob', label: 'Date of Birth (DOB)', placeholder: 'DD/MM/YYYY', required: true, icon: Calendar, format: 'date' },
      { key: 'gender', label: 'Gender', placeholder: 'Select Gender', required: true, type: 'select', options: ['Female', 'Male', 'Other'], icon: User },
      { key: 'placeOfBirth', label: 'Place of Birth', placeholder: 'e.g. AHMEDABAD, GUJARAT', required: false, icon: MapPin },
      { key: 'issueDate', label: 'Date of Issue', placeholder: 'DD/MM/YYYY', required: true, icon: Calendar, format: 'date' },
      { key: 'expiryDate', label: 'Date of Expiry', placeholder: 'DD/MM/YYYY', required: true, icon: Calendar, format: 'date' }
    ]
  }
};

/**
 * Automatically formats date digits to DD/MM/YYYY as the user types.
 * Automatically inserts '/' after 2 digits, and another '/' after 4 digits.
 * Handles backspacing cleanly without trapping the user on slashes.
 */
function formatDateInput(rawVal, prevVal = '') {
  if (!rawVal) return '';

  // If user is backspacing and just removed a slash
  if (prevVal && prevVal.length > rawVal.length) {
    if (prevVal.endsWith('/') && !rawVal.endsWith('/')) {
      const cleanDigits = rawVal.replace(/\D/g, '');
      if (cleanDigits.length === 2) {
        return cleanDigits.slice(0, 1);
      }
      if (cleanDigits.length === 4) {
        return `${cleanDigits.slice(0, 2)}/${cleanDigits.slice(2, 3)}`;
      }
    }
    return rawVal;
  }

  // Strip all non-digit characters, limit to 8 digits (DDMMYYYY)
  const digits = rawVal.replace(/\D/g, '').slice(0, 8);

  if (digits.length === 0) return '';
  if (digits.length === 1) return digits;
  if (digits.length === 2) return `${digits}/`;
  if (digits.length === 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 4) return `${digits.slice(0, 2)}/${digits.slice(2)}/`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function DocumentFormView({
  documentType = 'aadhaar',
  extractedData = {},
  selectedFile = null,
  filePreview = null,
  verificationResult = null,
  onBackToVerification,
  onResetAll
}) {
  const config = DOC_CONFIGS[documentType] || DOC_CONFIGS.aadhaar;
  const DocIcon = config.icon;

  // Initialize form state with extracted fields
  const [formData, setFormData] = useState(() => {
    const initial = {};
    config.fields.forEach((f) => {
      const val = extractedData[f.key] || '';
      initial[f.key] = f.format === 'date' && val ? formatDateInput(val) : val;
    });
    return initial;
  });

  // Track which fields were originally populated by AI
  const [aiPopulated] = useState(() => {
    const set = new Set();
    config.fields.forEach((f) => {
      if (extractedData[f.key] && extractedData[f.key].trim() !== '') {
        set.add(f.key);
      }
    });
    return set;
  });

  const [modifiedFields, setModifiedFields] = useState(new Set());
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationRef, setApplicationRef] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);

  // Field change handler with auto-date slash formatting
  const handleInputChange = (fieldKey, value, uppercase = false, format = null) => {
    let finalVal = value;
    if (format === 'date') {
      const prevVal = formData[fieldKey] || '';
      finalVal = formatDateInput(value, prevVal);
    } else if (uppercase) {
      finalVal = value.toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [fieldKey]: finalVal }));

    // Mark as modified by user
    setModifiedFields((prev) => new Set(prev).add(fieldKey));

    // Clear error for this field
    if (formErrors[fieldKey]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  // Form validation before submit
  const validateForm = () => {
    const errors = {};
    config.fields.forEach((f) => {
      const val = (formData[f.key] || '').trim();
      if (f.required && !val) {
        errors[f.key] = `${f.label} is required.`;
      } else if (val && f.format === 'date') {
        if (f.key === 'dob' && documentType === 'aadhaar' && /^\d{4}$/.test(val)) {
          // 4-digit Year of Birth accepted for Aadhaar
        } else {
          const parts = val.split('/');
          if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
            errors[f.key] = 'Date must be in DD/MM/YYYY format.';
          } else {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2099) {
              errors[f.key] = 'Please enter a valid day (01-31), month (01-12), and year.';
            }
          }
        }
      } else if (val && f.format === 'aadhaar') {
        const digits = val.replace(/\D/g, '');
        if (digits.length !== 12) {
          errors[f.key] = 'Aadhaar number must contain 12 digits.';
        }
      } else if (val && f.format === 'pan') {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
        if (!panRegex.test(val)) {
          errors[f.key] = 'PAN format must be 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).';
        }
      } else if (val && f.format === 'passport') {
        const passRegex = /^[A-Z][0-9]{7}$/;
        if (!passRegex.test(val)) {
          errors[f.key] = 'Passport format must be 1 letter followed by 7 digits (e.g. Z1234567).';
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    // Simulate brief network submission
    setTimeout(() => {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      setApplicationRef(`APP-2026-${documentType.toUpperCase().slice(0, 3)}-${randomNum}`);
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  // ---------------------------------------------------------------------------
  // View 1: Submission Confirmation Screen (Step 3)
  // ---------------------------------------------------------------------------
  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
        {/* Stepper Header */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-forest/70 px-1 sm:px-2">
          <span className="flex items-center space-x-1 sm:space-x-1.5 text-forest shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">1. Verification</span>
            <span className="sm:hidden text-[11px]">1. Verify</span>
          </span>
          <span className="h-0.5 w-6 sm:w-12 bg-forest rounded mx-1.5 sm:mx-2" />
          <span className="flex items-center space-x-1 sm:space-x-1.5 text-forest shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">2. Form Auto-Fill</span>
            <span className="sm:hidden text-[11px]">2. Form</span>
          </span>
          <span className="h-0.5 w-6 sm:w-12 bg-forest rounded mx-1.5 sm:mx-2" />
          <span className="flex items-center space-x-1 sm:space-x-1.5 text-forest font-bold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">3. Confirmed</span>
            <span className="sm:hidden text-[11px]">3. Done</span>
          </span>
        </div>

        {/* Success Card */}
        <div className="bg-warm-white border-2 border-forest rounded-2xl p-4 sm:p-8 text-center space-y-4 sm:space-y-5 shadow-sm">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-forest text-warm-white flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-7 h-7 sm:w-10 sm:h-10 text-sage" />
          </div>

          <div className="space-y-1 sm:space-y-1.5">
            <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-forest/10 text-forest text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              Verification & Submission Complete
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-forest-deep tracking-tight">
              Application Successfully Submitted!
            </h2>
            <p className="text-[11px] sm:text-sm text-forest/80 max-w-md mx-auto leading-relaxed">
              Your {config.name} has been verified and your auto-filled application details are saved in the system.
            </p>
          </div>

          {/* Reference Badge */}
          <div className="inline-block bg-beige p-3 rounded-xl border border-muted-border font-mono text-xs sm:text-sm text-forest-deep">
            Application Reference: <strong className="text-forest font-bold">{applicationRef}</strong>
          </div>

          {/* Summary Table */}
          <div className="text-left bg-beige-light border border-muted-border rounded-xl p-4 sm:p-6 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-forest-deep flex items-center space-x-2">
              <FileCheck2 className="w-4 h-4 text-forest" />
              <span>Submitted Application Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {config.fields.map((f) => {
                const val = formData[f.key];
                if (!val) return null;
                return (
                  <div key={f.key} className="bg-warm-white p-2.5 rounded-lg border border-muted-border/60">
                    <span className="text-[10px] text-forest/60 uppercase font-semibold block">{f.label}</span>
                    <span className="font-bold text-forest-deep text-xs break-all">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={onResetAll}
              className="py-3 px-6 rounded-xl bg-forest text-warm-white font-bold text-xs sm:text-sm hover:bg-forest-deep active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Verify Another Document</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="py-3 px-6 rounded-xl border border-forest text-forest font-semibold text-xs sm:text-sm hover:bg-sage-light active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Details</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // View 2: Auto-Filled Interactive Form (Step 2)
  // ---------------------------------------------------------------------------
  const totalAiFields = aiPopulated.size;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stepper Progress Bar */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-forest/70 px-1 sm:px-2">
        <button
          type="button"
          onClick={onBackToVerification}
          className="flex items-center space-x-1 sm:space-x-1.5 text-forest hover:underline cursor-pointer shrink-0"
        >
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest" />
          <span className="hidden sm:inline">1. Document Verified</span>
          <span className="sm:hidden text-[11px]">1. Verified</span>
        </button>
        <span className="h-0.5 w-6 sm:w-20 bg-forest rounded mx-1.5 sm:mx-2" />
        <span className="flex items-center space-x-1 sm:space-x-1.5 text-forest font-bold shrink-0">
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-forest text-warm-white text-[10px] sm:text-[11px] inline-flex items-center justify-center">
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

      {/* Main Container */}
      <div className="bg-warm-white border border-muted-border rounded-2xl p-3.5 sm:p-7 md:p-8 shadow-xs space-y-4 sm:space-y-6">
        {/* Verification Success Header Card */}
        <div className="bg-[#EDF4F0] border-2 border-forest rounded-xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-forest text-warm-white flex items-center justify-center shrink-0 shadow-xs">
              <DocIcon className="w-4 h-4 sm:w-5 sm:h-5 text-sage" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h3 className="font-extrabold text-sm sm:text-lg text-forest-deep tracking-tight">
                  {config.name} Verified
                </h3>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-forest text-warm-white text-[9px] sm:text-[10px] font-bold">
                  MATCHED
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-forest/80 font-medium">
                {verificationResult?.message || `Your uploaded ${config.name} matched your claim.`}
              </p>
            </div>
          </div>

          {/* AI Extraction Pill & Thumbnail Button */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {filePreview && (
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-lg border border-forest/30 bg-warm-white text-forest text-[11px] sm:text-xs font-semibold hover:bg-forest hover:text-warm-white transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Image</span>
              </button>
            )}
            <div className="py-1 px-2 sm:py-1.5 sm:px-2.5 rounded-lg bg-forest/10 border border-forest/20 text-forest text-[10px] sm:text-xs font-bold flex items-center space-x-1.5 shrink-0">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-forest" />
              <span>{totalAiFields} Fields Auto-Detected</span>
            </div>
          </div>
        </div>

        {/* Informative Guidance Banner */}
        <div className="bg-beige-light border border-muted-border rounded-xl p-3 sm:p-4 text-[11px] sm:text-xs text-forest-deep flex items-start space-x-2">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <p className="font-bold">Information Extracted Automatically</p>
            <p className="text-forest/80">
              The required fields below have been pre-filled from your document's OCR data. You can review, correct, or complete any information before submitting your application.
            </p>
          </div>
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config.fields.map((field) => {
              const value = formData[field.key] || '';
              const wasAi = aiPopulated.has(field.key);
              const isModified = modifiedFields.has(field.key);
              const error = formErrors[field.key];
              const FieldIcon = field.icon || FileText;

              return (
                <div
                  key={field.key}
                  className={`space-y-1.5 ${field.colSpan === 2 ? 'sm:col-span-2' : ''}`}
                >
                  {/* Label + Status Pill */}
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-forest-deep flex items-center space-x-1">
                      <span>{field.label}</span>
                      {field.required && <span className="text-red-600">*</span>}
                    </label>

                    {/* Status badges */}
                    {wasAi && !isModified && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-forest/10 text-forest flex items-center space-x-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>AI Extracted</span>
                      </span>
                    )}
                    {isModified && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center space-x-1">
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>Edited</span>
                      </span>
                    )}
                    {!wasAi && !isModified && (
                      <span className="text-[10px] text-forest/50">
                        {field.required ? 'Required' : 'Optional'}
                      </span>
                    )}
                  </div>

                  {/* Input Element */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-forest/40">
                      <FieldIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>

                    {field.type === 'select' ? (
                      <select
                        value={value}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className={`w-full pl-8 sm:pl-9 pr-3 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-medium bg-warm-white text-forest-deep focus:outline-none transition-all cursor-pointer ${
                          error
                            ? 'border-red-500 ring-2 ring-red-200'
                            : wasAi
                            ? 'border-forest/40 ring-1 ring-forest/10 focus:border-forest focus:ring-2 focus:ring-forest/20'
                            : 'border-muted-border focus:border-forest focus:ring-2 focus:ring-forest/20'
                        }`}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={value}
                        placeholder={field.placeholder}
                        maxLength={field.format === 'date' ? 10 : field.format === 'pan' ? 10 : field.format === 'aadhaar' ? 14 : undefined}
                        inputMode={field.format === 'date' ? 'numeric' : undefined}
                        onChange={(e) => handleInputChange(field.key, e.target.value, field.uppercase, field.format)}
                        className={`w-full pl-8 sm:pl-9 pr-3 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-medium bg-warm-white text-forest-deep focus:outline-none transition-all placeholder:text-forest/30 ${
                          error
                            ? 'border-red-500 ring-2 ring-red-200'
                            : wasAi
                            ? 'border-forest/40 ring-1 ring-forest/10 focus:border-forest focus:ring-2 focus:ring-forest/20'
                            : 'border-muted-border focus:border-forest focus:ring-2 focus:ring-forest/20'
                        }`}
                      />
                    )}
                  </div>

                  {/* Field Error Message */}
                  {error && (
                    <p className="text-[11px] font-medium text-red-600 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{error}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-muted-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackToVerification}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-muted-border text-forest font-semibold text-xs sm:text-sm hover:bg-beige active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer order-2 sm:order-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Verification</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto py-3 px-8 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-[0.98] order-1 sm:order-2 ${
                isSubmitting
                  ? 'bg-muted-border text-forest/40 cursor-not-allowed'
                  : 'bg-forest text-warm-white hover:bg-forest-deep'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-warm-white/40 border-t-warm-white rounded-full animate-spin shrink-0" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Verified Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Document Image Modal (for convenient side comparison) */}
      {showImageModal && filePreview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-warm-white rounded-2xl max-w-2xl w-full p-4 space-y-3 relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-muted-border pb-2">
              <h4 className="font-bold text-sm text-forest-deep flex items-center space-x-2">
                <DocIcon className="w-4 h-4 text-forest" />
                <span>Uploaded Document: {config.name}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded-lg text-forest/60 hover:text-forest hover:bg-beige transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-black/5 rounded-xl p-2">
              <img
                src={filePreview}
                alt="Document Full View"
                onError={(e) => {
                  if (selectedFile) {
                    const freshUrl = URL.createObjectURL(selectedFile);
                    e.target.src = freshUrl;
                  }
                }}
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-xs"
              />
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="py-1.5 px-4 rounded-lg bg-forest text-warm-white text-xs font-semibold hover:bg-forest-deep cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
