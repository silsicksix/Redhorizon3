/**
 * RED HORIZON - ONTOLOGY NORMALIZER & SLOT EXTRACTOR
 * Automatic intelligence entity detection, regex parsing, and Malaysian/global identifier extraction.
 */

export interface ExtractedOntologySlot {
  key: string;
  category: 'NRIC' | 'PHONE' | 'PLATE' | 'CRYPTO' | 'BANK' | 'SSM' | 'EMAIL' | 'IP' | 'DOMAIN';
  label: string;
  rawValue: string;
  normalizedValue: string;
  confidence: number; // 0 - 100
  metadata?: Record<string, any>;
}

// Malaysian State codes in NRIC (PB)
const MY_NRIC_STATES: Record<string, string> = {
  '01': 'Johor', '21': 'Johor', '22': 'Johor', '23': 'Johor', '24': 'Johor',
  '02': 'Kedah', '25': 'Kedah', '26': 'Kedah', '27': 'Kedah',
  '03': 'Kelantan', '28': 'Kelantan', '29': 'Kelantan',
  '04': 'Melaka', '30': 'Melaka',
  '05': 'Negeri Sembilan', '31': 'Negeri Sembilan', '59': 'Negeri Sembilan',
  '06': 'Pahang', '32': 'Pahang', '33': 'Pahang',
  '07': 'Pulau Pinang', '34': 'Pulau Pinang', '35': 'Pulau Pinang',
  '08': 'Perak', '36': 'Perak', '37': 'Perak', '38': 'Perak', '39': 'Perak',
  '09': 'Perlis', '40': 'Perlis',
  '10': 'Selangor', '41': 'Selangor', '42': 'Selangor', '43': 'Selangor', '44': 'Selangor',
  '11': 'Terengganu', '45': 'Terengganu', '46': 'Terengganu',
  '12': 'Sabah', '47': 'Sabah', '48': 'Sabah', '49': 'Sabah',
  '13': 'Sarawak', '50': 'Sarawak', '51': 'Sarawak', '52': 'Sarawak', '53': 'Sarawak',
  '14': 'Wilayah Persekutuan KL', '54': 'Wilayah Persekutuan KL', '55': 'Wilayah Persekutuan KL', '56': 'Wilayah Persekutuan KL', '57': 'Wilayah Persekutuan KL',
  '15': 'Wilayah Persekutuan Labuan', '58': 'Wilayah Persekutuan Labuan',
  '16': 'Wilayah Persekutuan Putrajaya',
};

/**
 * Normalizes Malaysian / International Phone numbers to standard E.164
 */
export function normalizePhone(phone: string): { e164: string; local: string; carrier?: string } {
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('00')) clean = '+' + clean.substring(2);
  
  if (clean.startsWith('0') && clean.length >= 9) {
    clean = '+60' + clean.substring(1);
  } else if (!clean.startsWith('+') && clean.startsWith('60')) {
    clean = '+' + clean;
  } else if (!clean.startsWith('+')) {
    clean = '+60' + clean;
  }

  // Determine carrier if Malaysian mobile
  let carrier = 'Unknown Telco';
  if (clean.startsWith('+6011')) carrier = 'U Mobile / Yoodo / Celcom';
  else if (clean.startsWith('+6012') || clean.startsWith('+6017')) carrier = 'Maxis / Hotlink';
  else if (clean.startsWith('+6013') || clean.startsWith('+6019')) carrier = 'CelcomDigi';
  else if (clean.startsWith('+6014') || clean.startsWith('+6016')) carrier = 'Digi / Celcom';
  else if (clean.startsWith('+6018')) carrier = 'U Mobile';
  else if (clean.startsWith('+6010')) carrier = 'Yes 5G / Yoodo';

  return {
    e164: clean,
    local: clean.replace(/^\+60/, '0'),
    carrier
  };
}

/**
 * Parses and validates Malaysian NRIC (MyKad)
 */
export function parseMalaysianNric(nricRaw: string): ExtractedOntologySlot | null {
  const digits = nricRaw.replace(/\D/g, '');
  if (digits.length !== 12) return null;

  const yy = digits.substring(0, 2);
  const mm = digits.substring(2, 4);
  const dd = digits.substring(4, 6);
  const pb = digits.substring(6, 8);
  const serial = digits.substring(8, 12);
  const lastDigit = parseInt(digits.substring(11, 12), 10);

  const mmNum = parseInt(mm, 10);
  const ddNum = parseInt(dd, 10);
  if (mmNum < 1 || mmNum > 12 || ddNum < 1 || ddNum > 31) return null;

  // Approximate Century: if yy > 40, likely 19yy, else 20yy
  const yearPrefix = parseInt(yy, 10) > 40 ? '19' : '20';
  const fullDob = `${yearPrefix}${yy}-${mm}-${dd}`;
  const gender = lastDigit % 2 === 1 ? 'Lelaki (Male)' : 'Perempuan (Female)';
  const state = MY_NRIC_STATES[pb] || 'Kelahiran Luar Negara / Tidak Diketahui';

  const formatted = `${yy}${mm}${dd}-${pb}-${serial}`;

  return {
    key: 'nric',
    category: 'NRIC',
    label: `MyKad: ${formatted}`,
    rawValue: nricRaw,
    normalizedValue: digits,
    confidence: 98,
    metadata: {
      formatted,
      dob: fullDob,
      gender,
      stateOfOrigin: state,
      pbCode: pb
    }
  };
}

/**
 * Extracts all ontology slots from free-text (notes, details, titles)
 */
export function extractOntologySlotsFromText(text: string): ExtractedOntologySlot[] {
  if (!text || typeof text !== 'string') return [];
  const slots: ExtractedOntologySlot[] = [];
  const seenKeys = new Set<string>();

  const addSlot = (slot: ExtractedOntologySlot) => {
    const uniqueHash = `${slot.category}_${slot.normalizedValue}`;
    if (!seenKeys.has(uniqueHash)) {
      seenKeys.add(uniqueHash);
      slots.push(slot);
    }
  };

  // 1. Malaysian NRIC / MyKad Detection
  // Matches: 901015-08-5431 or 901015085431
  const nricRegex = /\b(\d{6}[-\s]?\d{2}[-\s]?\d{4})\b/g;
  let match: RegExpExecArray | null;
  while ((match = nricRegex.exec(text)) !== null) {
    const parsed = parseMalaysianNric(match[1]);
    if (parsed) addSlot(parsed);
  }

  // 2. Phone Numbers (Malaysian & Global)
  // Matches: +6012-345 6789, 012-3456789, 019 888 7777, +60 11 2345 6789
  const phoneRegex = /(?:\+?60\s?|0)(?:1[0-9][-\s]?\d{3,4}[-\s]?\d{4}|[2-9][-\s]?\d{3,4}[-\s]?\d{4})\b/g;
  while ((match = phoneRegex.exec(text)) !== null) {
    const raw = match[0].trim();
    // Exclude if it looks like an NRIC or date
    const cleanDigits = raw.replace(/\D/g, '');
    if (cleanDigits.length >= 9 && cleanDigits.length <= 13) {
      // Don't treat a 12 digit NRIC as phone
      if (cleanDigits.length === 12 && parseMalaysianNric(raw)) {
        continue;
      }
      const norm = normalizePhone(raw);
      addSlot({
        key: 'phone',
        category: 'PHONE',
        label: `Telefon: ${norm.e164}`,
        rawValue: raw,
        normalizedValue: norm.e164,
        confidence: 92,
        metadata: {
          e164: norm.e164,
          local: norm.local,
          carrier: norm.carrier
        }
      });
    }
  }

  // 3. Malaysian Vehicle Registration Plate
  // Common formats: WXX 1234, VAA 123, JQR 4567, SABAH/SARAWAK QA 1234 B, PDRM, TAXI
  const plateRegex = /\b([A-Z]{1,3}\s?\d{1,4}\s?[A-Z]?)\b/g;
  while ((match = plateRegex.exec(text)) !== null) {
    const raw = match[1].trim().toUpperCase();
    const cleanNorm = raw.replace(/\s+/g, '');
    // Filter out common false positives
    if (
      cleanNorm.length >= 4 && cleanNorm.length <= 8 &&
      !['HTTP', 'HTTPS', 'JSON', 'HTML', 'SSM', 'PDRM', 'CCTV', 'WGS84', 'UTC'].includes(cleanNorm) &&
      /\d/.test(cleanNorm) && /[A-Z]/.test(cleanNorm)
    ) {
      addSlot({
        key: 'plate_number',
        category: 'PLATE',
        label: `Plat Kenderaan: ${raw}`,
        rawValue: raw,
        normalizedValue: cleanNorm,
        confidence: 85,
        metadata: { plate: raw }
      });
    }
  }

  // 4. Crypto Addresses
  // Ethereum / EVM: 0x[a-fA-F0-9]{40}
  const ethRegex = /\b(0x[a-fA-F0-9]{40})\b/g;
  while ((match = ethRegex.exec(text)) !== null) {
    addSlot({
      key: 'crypto_eth',
      category: 'CRYPTO',
      label: `Dompet EVM/ETH: ${match[1].substring(0, 6)}...${match[1].substring(38)}`,
      rawValue: match[1],
      normalizedValue: match[1].toLowerCase(),
      confidence: 99,
      metadata: { network: 'EVM / Ethereum / BSC / Polygon', address: match[1] }
    });
  }

  // Bitcoin: Legacy (1...), SegWit (3...), Native Segwit (bc1...)
  const btcRegex = /\b((?:1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})\b/g;
  while ((match = btcRegex.exec(text)) !== null) {
    addSlot({
      key: 'crypto_btc',
      category: 'CRYPTO',
      label: `Dompet Bitcoin: ${match[1].substring(0, 6)}...`,
      rawValue: match[1],
      normalizedValue: match[1],
      confidence: 97,
      metadata: { network: 'Bitcoin (BTC)', address: match[1] }
    });
  }

  // Tron: T[a-zA-Z0-9]{33}
  const tronRegex = /\b(T[a-zA-Z0-9]{33})\b/g;
  while ((match = tronRegex.exec(text)) !== null) {
    addSlot({
      key: 'crypto_tron',
      category: 'CRYPTO',
      label: `Dompet Tron TRC20: ${match[1].substring(0, 6)}...`,
      rawValue: match[1],
      normalizedValue: match[1],
      confidence: 95,
      metadata: { network: 'Tron (TRC20)', address: match[1] }
    });
  }

  // 5. Malaysian SSM Company Number
  // Format: 12-digit (e.g. 202101012345) or old (e.g. 123456-X / 123456-A)
  const ssmOldRegex = /\b(\d{5,7}\s?[-–]\s?[A-Z])\b/g;
  while ((match = ssmOldRegex.exec(text)) !== null) {
    const raw = match[1].replace(/\s+/g, '').toUpperCase();
    addSlot({
      key: 'ssm_reg',
      category: 'SSM',
      label: `SSM (Format Lama): ${raw}`,
      rawValue: raw,
      normalizedValue: raw,
      confidence: 95,
      metadata: { ssmNumber: raw, format: 'OLD' }
    });
  }

  const ssmNewRegex = /\b(20\d{2}01\d{6})\b/g; // 12-digit SSM starts with 20XX01XXXXXX
  while ((match = ssmNewRegex.exec(text)) !== null) {
    addSlot({
      key: 'ssm_reg',
      category: 'SSM',
      label: `SSM (12-Digit): ${match[1]}`,
      rawValue: match[1],
      normalizedValue: match[1],
      confidence: 96,
      metadata: { ssmNumber: match[1], format: 'NEW_12_DIGIT' }
    });
  }

  // 6. Email Addresses
  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  while ((match = emailRegex.exec(text)) !== null) {
    addSlot({
      key: 'email',
      category: 'EMAIL',
      label: `E-mel: ${match[1].toLowerCase()}`,
      rawValue: match[1],
      normalizedValue: match[1].toLowerCase(),
      confidence: 95,
      metadata: { email: match[1].toLowerCase() }
    });
  }

  // 7. IPv4 Addresses
  const ipRegex = /\b((?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b/g;
  while ((match = ipRegex.exec(text)) !== null) {
    // Ignore private local IPs if needed or keep with tag
    addSlot({
      key: 'ip_address',
      category: 'IP',
      label: `Alamat IP: ${match[1]}`,
      rawValue: match[1],
      normalizedValue: match[1],
      confidence: 95,
      metadata: { ip: match[1] }
    });
  }

  return slots;
}

/**
 * Intelligently suggests the best ontology class based on label, details, and extracted slots.
 */
export function inferBestOntologyClass(label: string, details: string, currentType?: string): string {
  const combined = `${label} ${details}`;
  const slots = extractOntologySlotsFromText(combined);

  // If there's an NRIC slot, it's definitely a Person
  if (slots.some(s => s.category === 'NRIC')) return 'person';

  // If crypto address detected
  if (slots.some(s => s.category === 'CRYPTO')) return 'crypto';

  // If SSM detected or mentions Sdn Bhd, Berhad
  if (slots.some(s => s.category === 'SSM') || /\b(sdn bhd|berhad|enterprise|holding|corp|ltd)\b/i.test(combined)) {
    return 'organization';
  }

  // If only phone number exists in label
  if (slots.some(s => s.category === 'PHONE') && slots.length === 1 && label.replace(/[^\d+]/g, '').length >= 9) {
    return 'phone';
  }

  // If car plate detected
  if (slots.some(s => s.category === 'PLATE') && (currentType === 'vehicle' || /\b(kereta|vios|civic|hilux|motor|lori|honda|toyota|proton|perodua|plat)\b/i.test(combined))) {
    return 'vehicle';
  }

  // If IP or domain
  if (slots.some(s => s.category === 'IP') || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(label.trim())) {
    return 'cyber_infra';
  }

  return currentType || 'person';
}
