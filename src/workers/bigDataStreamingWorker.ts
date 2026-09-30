/**
 * REDHORIZON - HIGH-CAPACITY STREAMING INGESTION WEB WORKER
 * Dedicated background thread for parsing mega-files (CSV, TSV, JSONL, Dumps)
 * Zero UI freezing, low-memory chunk streaming, regex ontology extraction, and semantic triples generation.
 */

export interface WorkerScanConfig {
  query?: string;
  useRegex?: boolean;
  chunkSizeBytes?: number; // default 10MB
  enableOntology?: boolean;
  autoExtract?: boolean;
  delimiter?: string; // auto or ',' | '\t' | '|' | ';'
  maxMatchesToRetain?: number; // default 5000 in memory
  targetCategories?: string[]; // 'NRIC' | 'PHONE' | 'EMAIL' | 'IP' | 'CRYPTO' | 'BANK' | 'SSM' | 'PLATE'
}

export interface IngestedEntityRecord {
  id: string;
  label: string;
  type: string;
  details: string;
  category: string;
  confidence: number;
  vaultMatch?: boolean;
  vaultSource?: string;
  metadata?: Record<string, any>;
}

export interface IngestedLinkRecord {
  source: string;
  target: string;
  label: string;
  confidence?: number;
}

export interface WorkerTelemetryPayload {
  bytesProcessed: number;
  totalBytes: number;
  percent: number;
  rowsProcessed: number;
  matchesFound: number;
  entitiesExtracted: number;
  triplesGenerated: number;
  speedRowsPerSec: number;
  memoryEstimateMb: number;
  currentStage: string;
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
  '14': 'Kuala Lumpur', '54': 'Kuala Lumpur', '55': 'Kuala Lumpur', '56': 'Kuala Lumpur', '57': 'Kuala Lumpur',
  '15': 'Labuan', '58': 'Labuan',
  '16': 'Putrajaya',
};

// Fast regex patterns
const REGEX_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  phoneMy: /(?:\+?60|0)1[0-46-9][- ]?\d{7,8}\b/g,
  phoneGeneral: /\b\+?[1-9]\d{8,13}\b/g,
  nric: /\b\d{6}[- ]?\d{2}[- ]?\d{4}\b/g,
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  eth: /\b0x[a-fA-F0-9]{40}\b/g,
  btc: /\b(?:1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,59})\b/g,
  tron: /\bT[A-Za-z1-9]{33}\b/g,
  ssmOld: /\b\d{5,7}-[A-Za-z]\b/g,
  ssmNew: /\b20\d{10}\b/g,
  plate: /\b[A-Z]{1,3}\s?\d{1,4}\s?[A-Z]?\b/g,
  bankAcc: /\b\d{10,16}\b/g
};

let isAborted = false;

self.onmessage = async (e: MessageEvent) => {
  const { action, payload } = e.data;

  if (action === 'ABORT') {
    isAborted = true;
    return;
  }

  if (action === 'START') {
    isAborted = false;
    const file = payload.file as File;
    const config = (payload.config || {}) as WorkerScanConfig;
    const fileName = file.name;
    const totalBytes = file.size;

    const chunkSizeBytes = config.chunkSizeBytes || 10 * 1024 * 1024; // 10MB chunk default
    const query = (config.query || '').trim();
    const queryLower = query.toLowerCase();
    const useRegex = !!config.useRegex;
    const enableOntology = config.enableOntology !== false;
    const autoExtract = config.autoExtract !== false;
    const maxMatches = config.maxMatchesToRetain || 2000;

    let queryRegexObj: RegExp | null = null;
    if (useRegex && query) {
      try {
        queryRegexObj = new RegExp(query, 'i');
      } catch (err: any) {
        self.postMessage({ action: 'ERROR', payload: `Regex tidak sah: ${err.message}` });
        return;
      }
    }

    let offset = 0;
    let rowsProcessed = 0;
    let matchesFound = 0;
    let entitiesExtracted = 0;
    let triplesGenerated = 0;
    let leftover = '';
    const startTime = Date.now();
    let lastTelemetryTime = startTime;

    // Buffer for batch sending
    let matchBuffer: any[] = [];
    let nodeBuffer: IngestedEntityRecord[] = [];
    let linkBuffer: IngestedLinkRecord[] = [];
    const seenEntityKeys = new Set<string>();

    let columnHeaders: string[] = [];
    let isFirstChunk = true;

    // Auto detect delimiter from first line
    const detectDelimiter = (line: string): string => {
      const commas = (line.match(/,/g) || []).length;
      const tabs = (line.match(/\t/g) || []).length;
      const pipes = (line.match(/\|/g) || []).length;
      const semicolons = (line.match(/;/g) || []).length;
      if (tabs >= commas && tabs >= pipes && tabs >= semicolons && tabs > 0) return '\t';
      if (pipes >= commas && pipes >= semicolons && pipes > 0) return '|';
      if (semicolons >= commas && semicolons > 0) return ';';
      return ',';
    };

    let activeDelimiter = config.delimiter || ',';

    while (offset < totalBytes) {
      if (isAborted) {
        self.postMessage({ action: 'ABORTED', payload: { rowsProcessed, matchesFound } });
        return;
      }

      const chunkBlob = file.slice(offset, offset + chunkSizeBytes);
      const chunkText = await chunkBlob.text();
      const content = leftover + chunkText;
      const lines = content.split(/\r?\n/);
      leftover = lines.pop() || '';

      if (isFirstChunk && lines.length > 0) {
        activeDelimiter = config.delimiter || detectDelimiter(lines[0]);
        // If first line has letters and separators, treat as header
        if (lines[0].includes(activeDelimiter) && /[a-zA-Z]/.test(lines[0])) {
          columnHeaders = lines[0].split(activeDelimiter).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        }
        isFirstChunk = false;
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        rowsProcessed++;

        // Search match check
        let isMatch = false;
        if (!query) {
          isMatch = true; // Ingest all if no specific query
        } else if (useRegex && queryRegexObj) {
          isMatch = queryRegexObj.test(line);
        } else {
          isMatch = line.toLowerCase().includes(queryLower);
        }

        if (isMatch) {
          matchesFound++;
          const matchId = `match_${rowsProcessed}`;
          
          if (matchBuffer.length < maxMatches) {
            matchBuffer.push({
              id: matchId,
              line: line.length > 300 ? line.substring(0, 300) + '...' : line,
              rawLine: line,
              lineNumber: rowsProcessed,
              fileName
            });
          }

          // ONTOLOGY & ENTITY EXTRACTION
          if (enableOntology && autoExtract) {
            const rootRecordId = `rec_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${rowsProcessed}`;
            const primaryEntitiesInRow: IngestedEntityRecord[] = [];

            // 1. Check Malaysian NRIC
            const nricMatches = line.match(REGEX_PATTERNS.nric);
            if (nricMatches) {
              for (const rawNric of nricMatches) {
                const digits = rawNric.replace(/\D/g, '');
                if (digits.length === 12) {
                  const mm = parseInt(digits.substring(2, 4), 10);
                  const dd = parseInt(digits.substring(4, 6), 10);
                  if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
                    const pb = digits.substring(6, 8);
                    const state = MY_NRIC_STATES[pb] || 'Kelahiran Luar Negara / Tidak Diketahui';
                    const lastDigit = parseInt(digits.substring(11, 12), 10);
                    const gender = lastDigit % 2 === 1 ? 'Lelaki' : 'Perempuan';
                    const formatted = `${digits.substring(0, 6)}-${pb}-${digits.substring(8)}`;
                    const entityKey = `nric:${digits}`;

                    const ent: IngestedEntityRecord = {
                      id: `ent_nric_${digits}`,
                      label: formatted,
                      type: 'person',
                      category: 'NRIC',
                      confidence: 96,
                      details: `MyKad: ${formatted}\nNegeri: ${state}\nJantina: ${gender}\nSumber: ${fileName} (Brs: ${rowsProcessed})`,
                      vaultMatch: true,
                      vaultSource: fileName,
                      metadata: { nric: digits, state, gender, sourceFile: fileName, line: rowsProcessed }
                    };

                    primaryEntitiesInRow.push(ent);
                    if (!seenEntityKeys.has(entityKey)) {
                      seenEntityKeys.add(entityKey);
                      nodeBuffer.push(ent);
                      entitiesExtracted++;
                    }
                  }
                }
              }
            }

            // 2. Check Phones
            const phoneMatches = line.match(REGEX_PATTERNS.phoneMy) || line.match(REGEX_PATTERNS.phoneGeneral);
            if (phoneMatches) {
              for (const rawPhone of phoneMatches) {
                let cleanPhone = rawPhone.replace(/[^\d+]/g, '');
                if (cleanPhone.length >= 8 && cleanPhone.length <= 15) {
                  if (cleanPhone.startsWith('0') && cleanPhone.length >= 10) cleanPhone = '+60' + cleanPhone.substring(1);
                  const entityKey = `phone:${cleanPhone}`;

                  let carrier = 'Telco';
                  if (cleanPhone.startsWith('+6012') || cleanPhone.startsWith('+6017')) carrier = 'Maxis';
                  else if (cleanPhone.startsWith('+6013') || cleanPhone.startsWith('+6019')) carrier = 'CelcomDigi';
                  else if (cleanPhone.startsWith('+6018')) carrier = 'U Mobile';
                  else if (cleanPhone.startsWith('+6011')) carrier = 'U Mobile / Yoodo / Celcom';

                  const ent: IngestedEntityRecord = {
                    id: `ent_phone_${cleanPhone.replace('+', '')}`,
                    label: cleanPhone,
                    type: 'phone',
                    category: 'PHONE',
                    confidence: 92,
                    details: `No. Telefon: ${cleanPhone} (${carrier})\nSumber: ${fileName} (Brs: ${rowsProcessed})`,
                    vaultMatch: true,
                    vaultSource: fileName,
                    metadata: { phone: cleanPhone, carrier, sourceFile: fileName, line: rowsProcessed }
                  };

                  primaryEntitiesInRow.push(ent);
                  if (!seenEntityKeys.has(entityKey)) {
                    seenEntityKeys.add(entityKey);
                    nodeBuffer.push(ent);
                    entitiesExtracted++;
                  }
                }
              }
            }

            // 3. Check Emails
            const emailMatches = line.match(REGEX_PATTERNS.email);
            if (emailMatches) {
              for (const email of emailMatches) {
                const normEmail = email.toLowerCase().trim();
                const entityKey = `email:${normEmail}`;
                const ent: IngestedEntityRecord = {
                  id: `ent_email_${normEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
                  label: normEmail,
                  type: 'email',
                  category: 'EMAIL',
                  confidence: 94,
                  details: `Emel: ${normEmail}\nSumber: ${fileName} (Brs: ${rowsProcessed})`,
                  vaultMatch: true,
                  vaultSource: fileName,
                  metadata: { email: normEmail, sourceFile: fileName, line: rowsProcessed }
                };

                primaryEntitiesInRow.push(ent);
                if (!seenEntityKeys.has(entityKey)) {
                  seenEntityKeys.add(entityKey);
                  nodeBuffer.push(ent);
                  entitiesExtracted++;
                }
              }
            }

            // 4. Check IPv4
            const ipMatches = line.match(REGEX_PATTERNS.ipv4);
            if (ipMatches) {
              for (const ip of ipMatches) {
                if (ip !== '127.0.0.1' && ip !== '0.0.0.0' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
                  const entityKey = `ip:${ip}`;
                  const ent: IngestedEntityRecord = {
                    id: `ent_ip_${ip.replace(/\./g, '_')}`,
                    label: ip,
                    type: 'ip_address',
                    category: 'IP',
                    confidence: 90,
                    details: `IP Awam: ${ip}\nSumber: ${fileName} (Brs: ${rowsProcessed})`,
                    vaultMatch: true,
                    vaultSource: fileName,
                    metadata: { ip, sourceFile: fileName, line: rowsProcessed }
                  };

                  primaryEntitiesInRow.push(ent);
                  if (!seenEntityKeys.has(entityKey)) {
                    seenEntityKeys.add(entityKey);
                    nodeBuffer.push(ent);
                    entitiesExtracted++;
                  }
                }
              }
            }

            // 5. Check Crypto (ETH / BTC / Tron)
            const ethMatches = line.match(REGEX_PATTERNS.eth);
            if (ethMatches) {
              for (const wallet of ethMatches) {
                const entityKey = `crypto:${wallet.toLowerCase()}`;
                const ent: IngestedEntityRecord = {
                  id: `ent_eth_${wallet.substring(2, 10)}`,
                  label: `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`,
                  type: 'crypto_wallet',
                  category: 'CRYPTO',
                  confidence: 98,
                  details: `EVM Wallet: ${wallet}\nNetwork: Ethereum / BSC / Polygon\nSumber: ${fileName}`,
                  vaultMatch: true,
                  vaultSource: fileName,
                  metadata: { wallet, chain: 'EVM', sourceFile: fileName }
                };
                primaryEntitiesInRow.push(ent);
                if (!seenEntityKeys.has(entityKey)) {
                  seenEntityKeys.add(entityKey);
                  nodeBuffer.push(ent);
                  entitiesExtracted++;
                }
              }
            }

            // 6. GENERATE SEMANTIC TRIPLES & CROSS-RELATIONSHIPS
            // If multiple entities exist in the same row, connect them with semantic predicates
            if (primaryEntitiesInRow.length >= 2) {
              const personNode = primaryEntitiesInRow.find(e => e.type === 'person') || primaryEntitiesInRow[0];

              for (let j = 0; j < primaryEntitiesInRow.length; j++) {
                const targetNode = primaryEntitiesInRow[j];
                if (targetNode.id === personNode.id) continue;

                let predicate = 'associated_with';
                if (targetNode.type === 'phone') predicate = 'uses_phone';
                else if (targetNode.type === 'email') predicate = 'communicates_via';
                else if (targetNode.type === 'ip_address') predicate = 'accessed_from_ip';
                else if (targetNode.type === 'crypto_wallet') predicate = 'transferred_crypto';
                else if (targetNode.type === 'bank_account') predicate = 'owns_account';

                linkBuffer.push({
                  source: personNode.id,
                  target: targetNode.id,
                  label: predicate,
                  confidence: 90
                });
                triplesGenerated++;
              }
            }
          }
        }
      }

      offset += chunkSizeBytes;

      const now = Date.now();
      // Send telemetry every 300ms or when buffers are full
      if (now - lastTelemetryTime > 300 || offset >= totalBytes || matchBuffer.length >= 500 || nodeBuffer.length >= 200) {
        const timeElapsedSec = Math.max((now - startTime) / 1000, 0.05);
        const speedRowsPerSec = Math.round(rowsProcessed / timeElapsedSec);
        const percent = Math.min(Math.round((offset / totalBytes) * 100), 100);

        // Estimate memory usage from buffers
        const memoryEstimateMb = Math.round((seenEntityKeys.size * 0.0005) + (nodeBuffer.length * 0.001) + 25);

        const telemetry: WorkerTelemetryPayload = {
          bytesProcessed: Math.min(offset, totalBytes),
          totalBytes,
          percent,
          rowsProcessed,
          matchesFound,
          entitiesExtracted,
          triplesGenerated,
          speedRowsPerSec,
          memoryEstimateMb,
          currentStage: offset >= totalBytes ? 'Selesai' : `Menghurai baris data (${speedRowsPerSec.toLocaleString()} bps)...`
        };

        self.postMessage({
          action: 'TELEMETRY_UPDATE',
          payload: {
            telemetry,
            matches: matchBuffer,
            newNodes: nodeBuffer,
            newLinks: linkBuffer
          }
        });

        // Flush batch buffers
        matchBuffer = [];
        nodeBuffer = [];
        linkBuffer = [];
        lastTelemetryTime = now;
      }
    }

    // Final completion dispatch
    const totalTimeSec = Math.max((Date.now() - startTime) / 1000, 0.1);
    self.postMessage({
      action: 'COMPLETE',
      payload: {
        totalRows: rowsProcessed,
        totalMatches: matchesFound,
        totalEntities: entitiesExtracted,
        totalTriples: triplesGenerated,
        durationSeconds: totalTimeSec.toFixed(2),
        speedAvg: Math.round(rowsProcessed / totalTimeSec),
        remainingMatches: matchBuffer,
        remainingNodes: nodeBuffer,
        remainingLinks: linkBuffer
      }
    });
  }
};
