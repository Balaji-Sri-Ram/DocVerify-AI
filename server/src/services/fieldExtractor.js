/**
 * Intelligent Document Field Extraction Engine.
 * Extracts key identity attributes (Number, Name, DOB, Father's Name, Gender, Expiry, etc.)
 * from raw OCR text for Indian Aadhaar, PAN, Passport, and Driving Licence documents.
 */

// Common date regex patterns (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY)
const DATE_REGEX = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/;
const ALL_DATES_REGEX = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}\b/g;

// Standard stopwords and department keywords to exclude from name candidates
const COMMON_STOPWORDS = new Set([
  'government', 'india', 'govt', 'unique', 'identification', 'authority', 'uidai',
  'income', 'tax', 'department', 'permanent', 'account', 'number', 'card',
  'father', 'name', 'date', 'birth', 'year', 'yob', 'dob', 'male', 'female',
  'transgender', 'address', 'signature', 'director', 'deputy', 'republic',
  'passport', 'driving', 'licence', 'license', 'union', 'transport', 'motor',
  'vehicles', 'form', 'valid', 'validity', 'from', 'to', 'till', 'holder',
  'issued', 'issue', 'expiry', 'authorized', 'class', 'lmv', 'mcwg', 'cov',
  'enrolment', 'enrollment', 'help', 'resident', 'mera', 'meri', 'pechan', 'pehechan',
  'state', 'nationality', 'indian', 'country', 'code', 'type'
]);

/**
 * Normalizes string by trimming and removing extra internal whitespace
 */
function clean(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes date into standard DD/MM/YYYY format
 */
function normalizeDate(str) {
  if (!str) return '';
  const cleaned = clean(str);
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }
  const parts = cleaned.split(/[\/\-\.]/);
  if (parts.length === 3 && parts[2].length === 4) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}/${month}/${year}`;
  }
  return cleaned.replace(/[\-\.]/g, '/');
}

/**
 * Cleans candidate names by stripping non-alphabetic noise
 */
function cleanNameCandidate(line) {
  if (!line) return '';
  // Strip labels like "Name:", "Holder Name:"
  let cleaned = line.replace(/^(?:Name|Holder Name|Given Name|Surname|Father's Name|Father Name|Father|To|नाम|पिता का नाम)\s*[:\-\.]?\s*/i, '');
  cleaned = cleaned.replace(/[^A-Za-z\s\.\']/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(w => w.length > 1 || (w.length === 1 && w.match(/[A-Z]/)));
  if (words.length < 1) return '';
  return words.join(' ');
}

/**
 * Checks if a candidate line is a genuine person name
 */
function isPotentialName(line) {
  if (!line || typeof line !== 'string') return false;
  // Strip label first
  let cleaned = line.replace(/^(?:Name|Holder Name|Given Name|Surname|Father's Name|Father Name|Father|To|नाम|पिता का नाम)\s*[:\-\.]?\s*/i, '').trim();
  if (cleaned.length < 3 || cleaned.length > 50) return false;

  // Should have mostly alphabetic characters
  const letters = (cleaned.match(/[A-Za-z]/g) || []).length;
  if (letters / cleaned.length < 0.6) return false;

  // Must not have long numbers
  if (/\d{3,}/.test(cleaned)) return false;

  // Must not match known system stopwords
  const lowerWords = cleaned.toLowerCase().split(/[\s,:\/\-]+/);
  for (const word of lowerWords) {
    if (COMMON_STOPWORDS.has(word)) return false;
  }

  return true;
}

/**
 * Extract fields for Aadhaar Card
 */
function extractAadhaarFields(rawText, lines) {
  const fields = {
    aadhaarNumber: '',
    fullName: '',
    dob: '',
    gender: '',
    vid: '',
    addressOrGuardian: ''
  };

  const text = rawText || '';

  // 1. Aadhaar Number (12 digits, format 4 4 4)
  const numMatch = text.match(/\b\d{4}\s\d{4}\s\d{4}\b/);
  if (numMatch) {
    fields.aadhaarNumber = numMatch[0];
  } else {
    const unspaced = text.match(/\b\d{12}\b/);
    if (unspaced) {
      fields.aadhaarNumber = `${unspaced[0].slice(0, 4)} ${unspaced[0].slice(4, 8)} ${unspaced[0].slice(8, 12)}`;
    }
  }

  // 2. 16-Digit VID
  const vidMatch = text.match(/VID\s*[:\-]?\s*(\d{4}\s\d{4}\s\d{4}\s\d{4}|\d{16})/i) || text.match(/\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/);
  if (vidMatch) {
    const rawVid = (vidMatch[1] || vidMatch[0]).replace(/\s+/g, '');
    fields.vid = `${rawVid.slice(0, 4)} ${rawVid.slice(4, 8)} ${rawVid.slice(8, 12)} ${rawVid.slice(12, 16)}`;
  }

  // 3. Date of Birth / Year of Birth
  const dobMatch = text.match(/(?:DOB|Date of Birth|Birth|DOB\/Year of Birth|Year of Birth|YOB|पुట్టిన తేదీ|பிறந்த தேதி|ಜನ್ಮ ದಿನಾಂಕ)\s*[:\-\/]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4}|[0-9]{4})/i)
    || text.match(DATE_REGEX);
  if (dobMatch) {
    fields.dob = normalizeDate(dobMatch[1] || dobMatch[0]);
  }

  // 4. Gender
  if (/\b(female|महिला|స్త్రీ|பெண்|ಮಹಿಳೆ|സ്ത്രീ)\b/i.test(text)) {
    fields.gender = 'Female';
  } else if (/\b(male|पुरुष|పురుషుడు|ஆண்|ಪುರುಷ|പുരുഷൻ)\b/i.test(text)) {
    fields.gender = 'Male';
  } else if (/\b(transgender)\b/i.test(text)) {
    fields.gender = 'Transgender';
  }

  // 5. Full Name
  let dobLineIndex = -1;
  lines.forEach((l, idx) => {
    if (/(?:DOB|Date of Birth|Birth|YOB)/i.test(l) || (fields.dob && l.includes(fields.dob))) {
      if (dobLineIndex === -1) dobLineIndex = idx;
    }
  });

  if (dobLineIndex > 0) {
    for (let i = dobLineIndex - 1; i >= Math.max(0, dobLineIndex - 3); i--) {
      const candidate = lines[i];
      if (isPotentialName(candidate)) {
        fields.fullName = cleanNameCandidate(candidate);
        break;
      }
    }
  }

  if (!fields.fullName) {
    for (let i = 0; i < Math.min(lines.length, 12); i++) {
      const candidate = lines[i];
      if (isPotentialName(candidate) && !candidate.toLowerCase().includes('authority') && !candidate.toLowerCase().includes('enrolment')) {
        fields.fullName = cleanNameCandidate(candidate);
        break;
      }
    }
  }

  // 6. Address / Guardian / Care of
  const coMatch = text.match(/(?:C\/O|S\/O|D\/O|W\/O|Care of|Address|पता|చిరునామా)\s*[:\-]?\s*([^\n\r]{5,60})/i);
  if (coMatch) {
    fields.addressOrGuardian = clean(coMatch[1]);
  }

  return fields;
}

/**
 * Extract fields for PAN Card
 */
function extractPanFields(rawText, lines) {
  const fields = {
    panNumber: '',
    fullName: '',
    fatherName: '',
    dob: ''
  };

  const text = rawText || '';

  // 1. PAN Number: 5 letters, 4 numbers, 1 letter
  const panMatch = text.toUpperCase().match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
  if (panMatch) {
    fields.panNumber = panMatch[1];
  } else {
    const fuzzy = text.toUpperCase().match(/\b([A-Z]{5}[0-9ODIZ]{4}[A-Z])\b/);
    if (fuzzy && !['DEPARTMENT', 'GOVERNMENT', 'AUTHORITY'].includes(fuzzy[1])) {
      const fixedDigits = fuzzy[1].slice(5, 9)
        .replace(/O|D/g, '0')
        .replace(/I/g, '1')
        .replace(/Z/g, '2');
      fields.panNumber = `${fuzzy[1].slice(0, 5)}${fixedDigits}${fuzzy[1].slice(9)}`;
    }
  }

  // 2. Date of Birth
  const dobMatch = text.match(/(?:Date of Birth|DOB|जन्म तारीख|जन्म की तारीख)\s*[:\-\/]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i)
    || text.match(DATE_REGEX);
  if (dobMatch) {
    fields.dob = normalizeDate(dobMatch[1] || dobMatch[0]);
  }

  // 3. Name & Father's Name
  let fatherAnchorIdx = -1;
  lines.forEach((l, idx) => {
    if (/(?:father|पिता)/i.test(l)) fatherAnchorIdx = idx;
  });

  if (fatherAnchorIdx !== -1 && fatherAnchorIdx + 1 < lines.length) {
    const candidateFather = lines[fatherAnchorIdx + 1];
    if (isPotentialName(candidateFather)) {
      fields.fatherName = cleanNameCandidate(candidateFather);
    }
    if (fatherAnchorIdx - 1 >= 0) {
      const candidateName = lines[fatherAnchorIdx - 1];
      if (isPotentialName(candidateName)) {
        fields.fullName = cleanNameCandidate(candidateName);
      }
    }
  }

  if (!fields.fullName || !fields.fatherName) {
    const candidates = [];
    for (const line of lines) {
      if (isPotentialName(line) && !line.includes(fields.panNumber)) {
        candidates.push(cleanNameCandidate(line));
      }
    }
    if (!fields.fullName && candidates.length > 0) {
      fields.fullName = candidates[0];
    }
    if (!fields.fatherName && candidates.length > 1) {
      fields.fatherName = candidates[1];
    }
  }

  return fields;
}

/**
 * Extract fields for Driving Licence
 */
function extractDrivingLicenseFields(rawText, lines) {
  const fields = {
    dlNumber: '',
    fullName: '',
    dob: '',
    issueDate: '',
    validTill: '',
    vehicleClass: '',
    bloodGroup: ''
  };

  const text = rawText || '';

  // 1. DL Number (handles DL-04..., MH02..., KA-01-2015..., etc.)
  const dlMatch = text.toUpperCase().match(/\b([A-Z]{2}[-\s]?[0-9]{2}[-\s]?[0-9A-Z]{7,15})\b/);
  if (dlMatch && !['DRIVING', 'LICENCE', 'LICENSE', 'TRANSPORT'].includes(dlMatch[1])) {
    fields.dlNumber = clean(dlMatch[1]);
  } else {
    const dlLabelMatch = text.match(/(?:DL\s*No|Licence\s*No|License\s*No)\s*[:\-]?\s*([A-Za-z0-9\-\/\s]{8,25})/i);
    if (dlLabelMatch) {
      fields.dlNumber = clean(dlLabelMatch[1]);
    }
  }

  // 2. Dates
  const dobMatch = text.match(/(?:DOB|Date of Birth|Birth)\s*[:\-\/]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
  if (dobMatch) {
    fields.dob = normalizeDate(dobMatch[1]);
  }

  const issueMatch = text.match(/(?:Issue\s*Date|DOI|Date of Issue|Issued)\s*[:\-\/]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
  if (issueMatch) {
    fields.issueDate = normalizeDate(issueMatch[1]);
  }

  const validMatch = text.match(/(?:Valid\s*Till|Validity|Valid\s*Upto|Expiry\s*Date|Exp\s*Date)\s*[:\-\/]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
  if (validMatch) {
    fields.validTill = normalizeDate(validMatch[1]);
  }

  const allDates = text.match(ALL_DATES_REGEX) || [];
  if (allDates.length > 0 && !fields.dob) fields.dob = normalizeDate(allDates[0]);
  if (allDates.length > 1 && !fields.issueDate) fields.issueDate = normalizeDate(allDates[1]);
  if (allDates.length > 2 && !fields.validTill) fields.validTill = normalizeDate(allDates[2]);

  // 3. Vehicle Classes: LMV, MCWG, HGMV, TRANS, etc.
  const classes = [];
  if (/\bLMV\b/i.test(text)) classes.push('LMV');
  if (/\bMCWG\b/i.test(text) || /\bMCWOG\b/i.test(text)) classes.push('MCWG');
  if (/\bTRANS\b/i.test(text)) classes.push('TRANS');
  if (/\bHGMV\b/i.test(text) || /\bHMV\b/i.test(text)) classes.push('HGMV');
  fields.vehicleClass = classes.length > 0 ? classes.join(', ') : 'LMV';

  // 4. Blood Group
  const bgMatch = text.match(/\b(A|B|AB|O)\s*([+-]|POS|NEG)(?:\s|$|,|\n|\r)/i);
  if (bgMatch) {
    fields.bloodGroup = `${bgMatch[1].toUpperCase()}${bgMatch[2].startsWith('P') || bgMatch[2] === '+' ? '+' : '-'}`;
  }

  // 5. Name
  const nameLabelMatch = text.match(/(?:Name|Holder Name|Name of Holder)\s*[:\-]?\s*([^\n\r,:]{3,35})/i);
  if (nameLabelMatch && isPotentialName(nameLabelMatch[1])) {
    fields.fullName = cleanNameCandidate(nameLabelMatch[1]);
  } else {
    for (const line of lines) {
      if (isPotentialName(line) && !line.includes(fields.dlNumber) && !line.includes('STATE') && !line.includes('TRANSPORT')) {
        fields.fullName = cleanNameCandidate(line);
        break;
      }
    }
  }

  return fields;
}

/**
 * Extract fields for Indian Passport
 */
function extractPassportFields(rawText, lines) {
  const fields = {
    passportNumber: '',
    surname: '',
    givenName: '',
    nationality: 'INDIAN',
    dob: '',
    gender: '',
    placeOfBirth: '',
    issueDate: '',
    expiryDate: ''
  };

  const text = rawText || '';

  // 1. Check Machine Readable Zone (MRZ)
  const mrzLine1 = lines.find(l => l.startsWith('P<IND') || (l.includes('P<IND') && l.includes('<<')));
  if (mrzLine1) {
    const rawMrz = mrzLine1.replace(/.*P<IND/, '');
    const parts = rawMrz.split('<<');
    if (parts[0]) {
      fields.surname = parts[0].replace(/</g, ' ').trim();
    }
    if (parts[1]) {
      fields.givenName = parts[1].replace(/<.*/, '').replace(/</g, ' ').trim();
    }
  }

  // 2. Passport Number (Letter + 7 digits)
  const passMatch = text.toUpperCase().match(/\b([A-Z][0-9]{7})\b/);
  if (passMatch) {
    fields.passportNumber = passMatch[1];
  } else {
    const labelMatch = text.match(/(?:Passport\s*No|Passport\s*Number)\s*[:\-]?\s*([A-Za-z0-9]{8})/i);
    if (labelMatch) {
      fields.passportNumber = clean(labelMatch[1]).toUpperCase();
    }
  }

  // 3. Surname & Given Name (from visual labels if not from MRZ)
  if (!fields.surname) {
    const surMatch = text.match(/(?:Surname|उपनाम)\s*[:\-]?\s*([^\n\r,:]{2,30})/i);
    if (surMatch && isPotentialName(surMatch[1])) {
      fields.surname = cleanNameCandidate(surMatch[1]);
    }
  }

  if (!fields.givenName) {
    const givenMatch = text.match(/(?:Given\s*Name\(s\)|Given\s*Names|Given\s*Name|दिया गया नाम)\s*[:\-]?\s*([^\n\r,:]{2,40})/i);
    if (givenMatch && isPotentialName(givenMatch[1])) {
      fields.givenName = cleanNameCandidate(givenMatch[1]);
    }
  }

  // 4. Gender
  if (/\b(Sex|Gender)\s*[:\-]?\s*F\b/i.test(text) || /\bFEMALE\b/i.test(text)) {
    fields.gender = 'Female';
  } else if (/\b(Sex|Gender)\s*[:\-]?\s*M\b/i.test(text) || /\bMALE\b/i.test(text)) {
    fields.gender = 'Male';
  }

  // 5. Place of Birth
  const pobMatch = text.match(/(?:Place of Birth|जन्म का स्थान)\s*[:\-]?\s*([^\n\r,:]{3,35})/i);
  if (pobMatch) {
    fields.placeOfBirth = clean(pobMatch[1]);
  }

  // 6. Dates (DOB, Date of Issue, Date of Expiry)
  const dobMatch = text.match(/(?:Date of Birth|DOB|जन्म तिथि)\s*[:\-\/]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
  if (dobMatch) {
    fields.dob = normalizeDate(dobMatch[1]);
  }

  const issueMatch = text.match(/(?:Date of Issue|Issue Date|जारी करने की तिथि)\s*[:\-\/]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
  if (issueMatch) {
    fields.issueDate = normalizeDate(issueMatch[1]);
  }

  const expiryMatch = text.match(/(?:Date of Expiry|Expiry Date|समाप्ति की तिथि)\s*[:\-\/]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
  if (expiryMatch) {
    fields.expiryDate = normalizeDate(expiryMatch[1]);
  }

  const allDates = text.match(ALL_DATES_REGEX) || [];
  if (allDates.length > 0 && !fields.dob) fields.dob = normalizeDate(allDates[0]);
  if (allDates.length > 1 && !fields.issueDate) fields.issueDate = normalizeDate(allDates[1]);
  if (allDates.length > 2 && !fields.expiryDate) fields.expiryDate = normalizeDate(allDates[2]);

  return fields;
}

/**
 * Universal dispatcher that extracts appropriate fields based on document category
 */
function extractDocumentFields(documentType, rawText, lines = []) {
  if (!rawText || typeof rawText !== 'string') {
    return {};
  }

  const textLines = lines.length > 0
    ? lines
    : rawText.split('\n').map(l => l.trim()).filter(Boolean);

  switch (documentType) {
    case 'aadhaar':
      return extractAadhaarFields(rawText, textLines);
    case 'pan':
      return extractPanFields(rawText, textLines);
    case 'driving_license':
      return extractDrivingLicenseFields(rawText, textLines);
    case 'passport':
      return extractPassportFields(rawText, textLines);
    default:
      return {};
  }
}

module.exports = {
  extractDocumentFields,
  extractAadhaarFields,
  extractPanFields,
  extractDrivingLicenseFields,
  extractPassportFields
};
