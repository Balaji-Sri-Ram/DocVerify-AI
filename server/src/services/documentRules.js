/**
 * Document Rules & Pattern Matching Engine for Indian Identity Documents.
 * Handles keyword spotting, fuzzy OCR correction, regex patterns, and privacy masking.
 */

// Privacy masking helpers
function maskAadhaar(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 12) {
    return `XXXX XXXX ${digits.slice(-4)}`;
  }
  return 'XXXX XXXX XXXX';
}

function maskVid(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 16) {
    return `XXXX XXXX XXXX ${digits.slice(-4)}`;
  }
  return 'XXXX XXXX XXXX XXXX';
}

function maskPan(pan) {
  const clean = pan.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length === 10) {
    return `${clean.slice(0, 2)}XXXXXX${clean.slice(-1)}`;
  }
  return 'XXXXXXXXXX';
}

function maskPassport(pass) {
  const clean = pass.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length >= 8) {
    return `${clean[0]}XXXXX${clean.slice(-2)}`;
  }
  return 'PXXXXXXX';
}

/**
 * Normalizes text for keyword spotting (case-insensitive, strips extra spaces).
 */
function normalizeForMatching(text) {
  return text
    .toLowerCase()
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/[^\w\s\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0C80-\u0CFF\u0D00-\u0D7F<]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates OCR text against document-specific rules.
 *
 * @param {string} rawText - Unmodified extracted OCR text
 * @returns {Object} - Evidence breakdown per category
 */
function evaluateDocumentRules(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      aadhaar: createEmptyEvidence('aadhaar'),
      pan: createEmptyEvidence('pan'),
      passport: createEmptyEvidence('passport'),
      driving_license: createEmptyEvidence('driving_license')
    };
  }

  const normalized = normalizeForMatching(rawText);
  const upperText = rawText.toUpperCase();

  return {
    aadhaar: evaluateAadhaar(normalized, upperText, rawText),
    pan: evaluatePan(normalized, upperText, rawText),
    passport: evaluatePassport(normalized, upperText, rawText),
    driving_license: evaluateDrivingLicense(normalized, upperText, rawText)
  };
}

function createEmptyEvidence(category) {
  return {
    category,
    strongMatches: [],
    supportingMatches: [],
    patterns: [],
    score: 0,
    hasStrongIndicator: false
  };
}

// -----------------------------------------------------------------------------
// 1. AADHAAR CARD EVALUATION
// -----------------------------------------------------------------------------
function evaluateAadhaar(normalized, upperText, rawText) {
  const strongMatches = [];
  const supportingMatches = [];
  const patterns = [];

  // Strong Indicators
  if (/\baadha+r\b/.test(normalized) || /\baadhar\b/.test(normalized)) {
    strongMatches.push('Aadhaar');
  }
  if (normalized.includes('आधार')) {
    strongMatches.push('आधार (Hindi Aadhaar)');
  }
  if (normalized.includes('ఆధార్')) {
    strongMatches.push('ఆధార్ (Telugu Aadhaar)');
  }
  if (normalized.includes('ஆதார்')) {
    strongMatches.push('ஆதார் (Tamil Aadhaar)');
  }
  if (normalized.includes('ಆಧಾರ್')) {
    strongMatches.push('ಆಧಾರ್ (Kannada Aadhaar)');
  }
  if (normalized.includes('ആധാർ')) {
    strongMatches.push('ആധാർ (Malayalam Aadhaar)');
  }
  if (normalized.includes('unique identification authority of india')) {
    strongMatches.push('Unique Identification Authority of India');
  }
  if (/\buidai\b/.test(normalized)) {
    strongMatches.push('UIDAI');
  }

  // Supporting Indicators
  if (
    /\bmera\s*aadha+r\b/.test(normalized) ||
    normalized.includes('मेरी पहचान') ||
    normalized.includes('నా ఆధార్') ||
    normalized.includes('నా గుర్తింపు') ||
    normalized.includes('గుర్తింపు')
  ) {
    supportingMatches.push('Aadhaar Slogan / Identity marker');
  }
  if (
    normalized.includes('government of india') ||
    normalized.includes('भारत सरकार') ||
    normalized.includes('భారత ప్రభుత్వం') ||
    normalized.includes('இந்திய அரசு') ||
    normalized.includes('ಭಾರತ ಸರ್ಕಾರ')
  ) {
    supportingMatches.push('Government of India');
  }
  if (/\benrol+ment\s*no\b/.test(normalized)) {
    supportingMatches.push('Enrollment No');
  }
  if (/\bvid\b/.test(normalized) || normalized.includes('virtual id')) {
    supportingMatches.push('Virtual ID (VID)');
  }

  // Common demographic indicators on Aadhaar cards
  if (
    /\b(dob|date\s*of\s*birth|year\s*of\s*birth|yob)\b/i.test(rawText) ||
    normalized.includes('పుట్టిన తేదీ') ||
    normalized.includes('பிறந்த தேதி') ||
    normalized.includes('ಜನ್ಮ ದಿನಾಂಕ')
  ) {
    supportingMatches.push('Date of Birth (DOB)');
  }
  if (
    /\b(male|female|transgender)\b/i.test(rawText) ||
    normalized.includes('పురుషుడు') ||
    normalized.includes('స్త్రీ') ||
    normalized.includes('ஆண்') ||
    normalized.includes('பெண்')
  ) {
    supportingMatches.push('Gender indicator');
  }

  // 16-Digit VID Pattern (spaced or unspaced)
  const vidMatch = rawText.match(/\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/) || rawText.match(/VID\s*[:\-]?\s*(\d{16}|\d{4}\s\d{4}\s\d{4}\s\d{4})/i);
  if (vidMatch) {
    patterns.push(`16-Digit VID: ${maskVid(vidMatch[1] || vidMatch[0])}`);
  }

  // 12-Digit Aadhaar Pattern (must NEVER establish Aadhaar alone)
  // Look for spaced 4-4-4 digit format
  const aadhaarNumMatch = rawText.match(/\b\d{4}\s\d{4}\s\d{4}\b/);
  if (aadhaarNumMatch) {
    patterns.push(`12-Digit Aadhaar Format: ${maskAadhaar(aadhaarNumMatch[0])}`);
  }

  // Scoring
  // Strong match = 40 pts each
  // Supporting match = 15 pts each
  // Pattern = 20 pts (only if at least 1 keyword present, to prevent naked numbers from scoring)
  let score = 0;
  score += strongMatches.length * 40;
  score += supportingMatches.length * 15;

  if (strongMatches.length > 0 || supportingMatches.length > 0) {
    score += patterns.length * 20;
  }

  return {
    category: 'aadhaar',
    strongMatches,
    supportingMatches,
    patterns,
    score: Math.min(score, 100),
    hasStrongIndicator: strongMatches.length > 0
  };
}

// -----------------------------------------------------------------------------
// 2. PAN CARD EVALUATION
// -----------------------------------------------------------------------------
function evaluatePan(normalized, upperText, rawText) {
  const strongMatches = [];
  const supportingMatches = [];
  const patterns = [];

  // Strong Indicators
  if (normalized.includes('permanent account number')) {
    strongMatches.push('Permanent Account Number');
  }
  if (normalized.includes('स्थायी लेखा संख्या') || normalized.includes('स्थायी लेखा')) {
    strongMatches.push('स्थायी लेखा संख्या');
  }
  if (normalized.includes('income tax department')) {
    strongMatches.push('Income Tax Department');
  }
  if (normalized.includes('आयकर विभाग')) {
    strongMatches.push('आयकर विभाग (Income Tax Dept)');
  }

  // Supporting Indicators
  if (normalized.includes('govt of india') || normalized.includes('government of india') || normalized.includes('भारत सरकार')) {
    supportingMatches.push('Govt. of India');
  }
  if (/\bpan\b/.test(normalized)) {
    supportingMatches.push('PAN');
  }
  if (normalized.includes('father s name') || normalized.includes("father's name") || normalized.includes('पिता का नाम')) {
    supportingMatches.push("Father's Name");
  }

  // PAN 10-Character Alphanumeric Pattern: [A-Z]{5}[0-9]{4}[A-Z]
  // Also handle common OCR errors: O/0 substitution in number part
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
  const panMatches = upperText.match(panRegex);
  if (panMatches) {
    for (const m of panMatches) {
      // Exclude generic English words that happen to be 10 letters
      if (!['DEPARTMENT', 'GOVERNMENT', 'AUTHORITY', 'CONFIDENCE'].includes(m)) {
        patterns.push(`PAN Format: ${maskPan(m)}`);
        break;
      }
    }
  } else {
    // OCR fuzzy fallback: 5 letters, 4 numbers/O/D, 1 letter
    const fuzzyPan = upperText.match(/\b[A-Z]{5}[0-9ODIZ]{4}[A-Z]\b/g);
    if (fuzzyPan) {
      for (const m of fuzzyPan) {
        if (!['DEPARTMENT', 'GOVERNMENT'].includes(m)) {
          patterns.push(`Fuzzy PAN Format: ${maskPan(m)}`);
          break;
        }
      }
    }
  }

  // Scoring
  // Strong match = 45 pts each
  // Supporting match = 15 pts each
  // Pattern match = 30 pts (evaluated with keywords; regex alone capped at 30)
  let score = 0;
  score += strongMatches.length * 45;
  score += supportingMatches.length * 15;
  if (patterns.length > 0) {
    score += (strongMatches.length > 0 || supportingMatches.length > 0) ? 35 : 15;
  }

  return {
    category: 'pan',
    strongMatches,
    supportingMatches,
    patterns,
    score: Math.min(score, 100),
    hasStrongIndicator: strongMatches.length > 0
  };
}

// -----------------------------------------------------------------------------
// 3. INDIAN PASSPORT EVALUATION
// -----------------------------------------------------------------------------
function evaluatePassport(normalized, upperText, rawText) {
  const strongMatches = [];
  const supportingMatches = [];
  const patterns = [];

  // Strong Indicators
  if (normalized.includes('indian passport')) {
    strongMatches.push('Indian Passport');
  } else if (/\bpassport\b/.test(normalized)) {
    strongMatches.push('Passport');
  }

  if (normalized.includes('republic of india') || normalized.includes('भारत गणराज्य')) {
    strongMatches.push('Republic of India');
  }

  // MRZ (Machine Readable Zone) Detection
  // Typical Indian passport MRZ: P<IND[SURNAME]<<[GIVEN_NAMES]<<<<<<<<
  if (upperText.includes('P<IND') || (upperText.includes('IND') && upperText.includes('<<<'))) {
    strongMatches.push('Passport MRZ (P<IND)');
  }

  // Supporting Indicators
  if (normalized.includes('passport no') || normalized.includes('passport number')) {
    supportingMatches.push('Passport No');
  }
  if (normalized.includes('old passport no') || normalized.includes('old passport number')) {
    supportingMatches.push('Old Passport No');
  }
  if (normalized.includes('place of issue') || normalized.includes('जारी करने का स्थान')) {
    supportingMatches.push('Place of Issue');
  }
  if (normalized.includes('date of expiry') || normalized.includes('समाप्ति की तिथि')) {
    supportingMatches.push('Date of Expiry');
  }
  if (/\btype\s*[:\/]?\s*p\b/i.test(rawText)) {
    supportingMatches.push('Type: P (Passport)');
  }
  if (/\bcode\s*[:\/]?\s*ind\b/i.test(rawText)) {
    supportingMatches.push('Country Code: IND');
  }

  // Passport Number Pattern (1 letter followed by 7 digits)
  const passNumMatch = upperText.match(/\b[A-Z][0-9]{7}\b/);
  if (passNumMatch) {
    patterns.push(`Passport No Format: ${maskPassport(passNumMatch[0])}`);
  }

  let score = 0;
  score += strongMatches.length * 40;
  score += supportingMatches.length * 15;
  if (patterns.length > 0 && strongMatches.length > 0) {
    score += 25;
  }

  return {
    category: 'passport',
    strongMatches,
    supportingMatches,
    patterns,
    score: Math.min(score, 100),
    hasStrongIndicator: strongMatches.length > 0
  };
}

// -----------------------------------------------------------------------------
// 4. DRIVING LICENCE EVALUATION
// -----------------------------------------------------------------------------
function evaluateDrivingLicense(normalized, upperText, rawText) {
  const strongMatches = [];
  const supportingMatches = [];
  const patterns = [];

  // Strong Indicators (British and American spelling)
  if (normalized.includes('driving licence') || normalized.includes('driving license')) {
    strongMatches.push('Driving Licence');
  }
  if (normalized.includes('motor driving licence') || normalized.includes('motor driving license')) {
    strongMatches.push('Motor Driving Licence');
  }

  // Supporting Indicators
  if (/\bdl\s*no\b/.test(normalized) || /\bdl\s*number\b/.test(normalized)) {
    supportingMatches.push('DL No');
  }
  if (/\blicen[sc]e\s*no\b/.test(normalized)) {
    supportingMatches.push('Licence No');
  }
  if (normalized.includes('transport department') || normalized.includes('transport dept')) {
    supportingMatches.push('Transport Department');
  }
  if (normalized.includes('motor vehicles department') || normalized.includes('motor vehicle department')) {
    supportingMatches.push('Motor Vehicles Department');
  }
  if (normalized.includes('form 7') || normalized.includes('form 6')) {
    supportingMatches.push('Form 7 / Form 6');
  }
  if (normalized.includes('authorisation to drive') || normalized.includes('authorization to drive')) {
    supportingMatches.push('Authorisation to Drive');
  }
  if (normalized.includes('union of india') || normalized.includes('the union of india')) {
    supportingMatches.push('Union of India');
  }

  // Vehicle Classes: LMV, MCWG, HGMV, TRANS
  const vehicleClasses = [];
  if (/\blmv\b/.test(normalized)) vehicleClasses.push('LMV');
  if (/\bmcwg\b/.test(normalized) || /\bmcv\b/.test(normalized)) vehicleClasses.push('MCWG');
  if (/\btrans\b/.test(normalized)) vehicleClasses.push('TRANS');

  if (vehicleClasses.length > 0) {
    supportingMatches.push(`Vehicle Classes (${vehicleClasses.join(', ')})`);
  }

  // DL Number Pattern: 2-letter state code + 2 digits + year + number
  // e.g. MH07 20020004710 or DL-0420110012345 or GA08N-2009-0031205
  const dlRegex = /\b[A-Z]{2}[0-9]{2}[A-Z0-9\-\s]{8,15}\b/;
  const dlMatch = upperText.match(dlRegex);
  if (dlMatch && (strongMatches.length > 0 || supportingMatches.length > 0)) {
    patterns.push(`Indian DL Format: ${dlMatch[0].slice(0, 4)}XXXXXX`);
  }

  let score = 0;
  score += strongMatches.length * 45;
  score += supportingMatches.length * 15;
  if (patterns.length > 0) {
    score += 20;
  }

  return {
    category: 'driving_license',
    strongMatches,
    supportingMatches,
    patterns,
    score: Math.min(score, 100),
    hasStrongIndicator: strongMatches.length > 0
  };
}

module.exports = {
  evaluateDocumentRules,
  normalizeForMatching,
  maskAadhaar,
  maskPan,
  maskPassport
};
