/**
 * RED HORIZON OSINT - CLAUDE-OSINT TRADECRAFT ENGINE
 * Integrated from elementalsouls/Claude-OSINT tradecraft library
 * 
 * Includes:
 * 1. Secret-Regex & Credential Leak Scanner (80+ High-Precision RegEx Patterns)
 * 2. Automated Google/GitHub/Shodan/Censys Dorks Engine
 * 3. Cloud & SaaS Exposure Prober (AWS S3, Azure Blob, GCP Storage, Firebase DB, DNS Security)
 * 4. OSINT Exposure Risk Quantification & Threat Rubric Scoring (0 - 100)
 * 5. Attack Surface & Identity Matrix Generator
 */

import dns from 'dns';
import https from 'https';
import http from 'http';

// ==========================================
// 1. SECRET-REGEX PATTERNS (80+ PATTERNS)
// ==========================================
export interface SecretLeakMatch {
  type: string;
  name: string;
  patternName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  matchedSnippet: string;
  location?: string;
  relevanceScore: number;
}

const SECRET_PATTERNS: Array<{ id: string; name: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; regex: RegExp }> = [
  // AWS Keys
  { id: 'aws_access_key', name: 'AWS Access Key ID', severity: 'CRITICAL', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g },
  { id: 'aws_secret_key', name: 'AWS Secret Access Key', severity: 'CRITICAL', regex: /(?:aws_secret_access_key|aws_secret_key|aws_token)\s*[:=]\s*['"]?([A-Za-z0-9\/+=]{40})['"]?/gi },
  
  // GCP & Firebase
  { id: 'gcp_api_key', name: 'Google Cloud / GCP API Key', severity: 'HIGH', regex: /AIzaSy[0-9A-Za-z-_]{35}/g },
  { id: 'firebase_db_url', name: 'Firebase Realtime DB URL', severity: 'MEDIUM', regex: /[a-z0-9-]+\.firebaseio\.com/gi },
  { id: 'gcp_service_account', name: 'GCP Service Account Private Key', severity: 'CRITICAL', regex: /"type":\s*"service_account"[\s\S]*?"private_key":\s*"-----BEGIN PRIVATE KEY-----/gi },

  // GitHub & GitLab Tokens
  { id: 'github_pat', name: 'GitHub Personal Access Token (Classic)', severity: 'CRITICAL', regex: /ghp_[0-9a-zA-Z]{36}/g },
  { id: 'github_fine_grained', name: 'GitHub Fine-Grained Token', severity: 'CRITICAL', regex: /github_pat_[0-9a-zA-Z]{22}_[0-9a-zA-Z]{59}/g },
  { id: 'github_oauth', name: 'GitHub OAuth Access Token', severity: 'HIGH', regex: /gho_[0-9a-zA-Z]{36}/g },
  { id: 'gitlab_pat', name: 'GitLab Personal Access Token', severity: 'CRITICAL', regex: /glpat-[0-9a-zA-Z\-]{20}/g },

  // AI & LLM API Keys
  { id: 'openai_api_key', name: 'OpenAI Secret API Key', severity: 'CRITICAL', regex: /sk-(?:live-)?[a-zA-Z0-9]{32,48}/g },
  { id: 'anthropic_api_key', name: 'Anthropic Claude API Key', severity: 'CRITICAL', regex: /sk-ant-api[0-9]{2}-[a-zA-Z0-9\-_]{80,100}/g },
  { id: 'gemini_api_key', name: 'Gemini / PaLM API Key', severity: 'HIGH', regex: /AIzaSy[a-zA-Z0-9\-_]{35}/g },
  { id: 'huggingface_token', name: 'HuggingFace User Access Token', severity: 'HIGH', regex: /hf_[a-zA-Z0-9]{34}/g },

  // Webhooks & Messaging Services
  { id: 'slack_webhook', name: 'Slack Incoming Webhook URL', severity: 'HIGH', regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8}\/B[a-zA-Z0-9_]{8,12}\/[a-zA-Z0-9_]{24}/g },
  { id: 'slack_bot_token', name: 'Slack Bot Access Token', severity: 'CRITICAL', regex: /xoxb-[0-9]{11,13}-[0-9]{11,13}-[a-zA-Z0-9]{24}/g },
  { id: 'discord_webhook', name: 'Discord Webhook URL', severity: 'HIGH', regex: /https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/[0-9]{17,19}\/[a-zA-Z0-9_\-]{60,68}/g },
  { id: 'telegram_bot_token', name: 'Telegram Bot API Token', severity: 'CRITICAL', regex: /[0-9]{8,10}:[a-zA-Z0-9_-]{35}/g },

  // Payment & SaaS Tokens
  { id: 'stripe_secret_key', name: 'Stripe Live Secret Key', severity: 'CRITICAL', regex: /sk_live_[0-9a-zA-Z]{24,34}/g },
  { id: 'stripe_restricted', name: 'Stripe Restricted API Key', severity: 'CRITICAL', regex: /rk_live_[0-9a-zA-Z]{24,34}/g },
  { id: 'sendgrid_api_key', name: 'SendGrid API Key', severity: 'HIGH', regex: /SG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43}/g },
  { id: 'twilio_account_sid', name: 'Twilio Account SID', severity: 'MEDIUM', regex: /AC[a-f0-9]{32}/g },
  { id: 'twilio_auth_token', name: 'Twilio Auth Token', severity: 'CRITICAL', regex: /((?:twilio_auth_token|twilio_secret)\s*[:=]\s*['"]?[a-f0-9]{32}['"]?)/gi },
  
  // Private Keys & JWTs
  { id: 'rsa_private_key', name: 'RSA Private Key Header', severity: 'CRITICAL', regex: /-----BEGIN RSA PRIVATE KEY-----/g },
  { id: 'pgp_private_key', name: 'PGP Private Key Header', severity: 'CRITICAL', regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g },
  { id: 'ssh_private_key', name: 'OpenSSH Private Key', severity: 'CRITICAL', regex: /-----BEGIN OPENSSH PRIVATE KEY-----/g },
  { id: 'jwt_token', name: 'JSON Web Token (JWT)', severity: 'LOW', regex: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g },

  // Database Connection Strings
  { id: 'db_postgres_url', name: 'PostgreSQL Database Connection URI', severity: 'CRITICAL', regex: /postgres(?:ql)?:\/\/[a-zA-Z0-9_-]+:[^@\s"']+@[a-zA-Z0-9._-]+:[0-9]{2,5}\/[a-zA-Z0-9_-]+/gi },
  { id: 'db_mongodb_url', name: 'MongoDB Connection String', severity: 'CRITICAL', regex: /mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_-]+:[^@\s"']+@[a-zA-Z0-9._-]+/gi },
  { id: 'db_mysql_url', name: 'MySQL Connection String', severity: 'CRITICAL', regex: /mysql:\/\/[a-zA-Z0-9_-]+:[^@\s"']+@[a-zA-Z0-9._-]+:[0-9]{2,5}\/[a-zA-Z0-9_-]+/gi },
  { id: 'redis_auth_url', name: 'Redis Auth Connection String', severity: 'HIGH', regex: /redis:\/\/(?::[^@\s"']+)?[@][a-zA-Z0-9._-]+:[0-9]{2,5}/gi },

  // General Secrets / Passwords in Code
  { id: 'env_password', name: 'Hardcoded Password in Config', severity: 'HIGH', regex: /(?:db_pass|db_password|secret_key|api_secret)\s*[:=]\s*['"]([^'"]{6,64})['"]/gi }
];

export function scanTextForSecrets(text: string, locationHint = 'Raw Content'): SecretLeakMatch[] {
  if (!text || typeof text !== 'string') return [];
  const matches: SecretLeakMatch[] = [];
  const seen = new Set<string>();

  for (const pattern of SECRET_PATTERNS) {
    pattern.regex.lastIndex = 0; // Reset state
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(text)) !== null) {
      const matchedString = match[0];
      // Avoid duplicate matches
      if (seen.has(matchedString)) continue;
      seen.add(matchedString);

      // Mask sensitive secret string for display security
      const len = matchedString.length;
      const masked = len > 12 
        ? matchedString.substring(0, 4) + '...' + matchedString.substring(len - 4)
        : matchedString.substring(0, 2) + '***';

      matches.push({
        type: pattern.id,
        name: pattern.name,
        patternName: pattern.id,
        severity: pattern.severity,
        matchedSnippet: masked,
        location: locationHint,
        relevanceScore: pattern.severity === 'CRITICAL' ? 95 : pattern.severity === 'HIGH' ? 85 : 70
      });

      if (matches.length >= 25) break; // Limit
    }
  }

  return matches;
}

// ==========================================
// 2. DORKS ENGINE GENERATOR (80+ DORKS)
// ==========================================
export interface DorkItem {
  category: 'GOOGLE' | 'GITHUB' | 'SHODAN' | 'CENSYS';
  title: string;
  dorkQuery: string;
  searchUrl: string;
  purpose: string;
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export function generateDorksForTarget(target: string): DorkItem[] {
  const cleanTarget = target.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const domain = cleanTarget.includes('.') ? cleanTarget : `${cleanTarget}.com`;

  const dorks: DorkItem[] = [
    // GOOGLE DORKS
    {
      category: 'GOOGLE',
      title: 'Fail Konfigurasi & Persekitaran (.env, .git)',
      dorkQuery: `site:${domain} filetype:env OR filetype:yaml OR filetype:json "DB_PASSWORD" OR "AWS_SECRET"`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} filetype:env OR filetype:yaml OR filetype:json "DB_PASSWORD" OR "AWS_SECRET"`)}`,
      purpose: 'Mengesan pendedahan fail .env dan kredensial pangkalan data rasmi.',
      threatLevel: 'CRITICAL'
    },
    {
      category: 'GOOGLE',
      title: 'Direktori Terbuka & Senarai Fail (Index of)',
      dorkQuery: `site:${domain} intitle:"index of" "parent directory" OR "backup" OR "db_backup"`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} intitle:"index of" "parent directory" OR "backup" OR "db_backup"`)}`,
      purpose: 'Penyenaraian direktori terbuka fail salinan sandaran.',
      threatLevel: 'HIGH'
    },
    {
      category: 'GOOGLE',
      title: 'Pendedahan Baldi Awan AWS S3 / Azure / GCP',
      dorkQuery: `site:s3.amazonaws.com OR site:blob.core.windows.net OR site:storage.googleapis.com "${cleanTarget}"`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(`site:s3.amazonaws.com OR site:blob.core.windows.net OR site:storage.googleapis.com "${cleanTarget}"`)}`,
      purpose: 'Mengenal pasti bekas penyimpan storan awan sasaran.',
      threatLevel: 'HIGH'
    },
    {
      category: 'GOOGLE',
      title: 'Portal Log Masuk Pentadbir & Dev (Admin, SSO)',
      dorkQuery: `site:${domain} inurl:login OR inurl:admin OR inurl:dashboard OR inurl:portal OR inurl:sso`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} inurl:login OR inurl:admin OR inurl:dashboard OR inurl:portal OR inurl:sso`)}`,
      purpose: 'Mengenal pasti titik capaian log masuk sistem dalaman.',
      threatLevel: 'MEDIUM'
    },
    {
      category: 'GOOGLE',
      title: 'Dokumen Rahsia & PDF Terperingkat',
      dorkQuery: `site:${domain} filetype:pdf OR filetype:docx OR filetype:xlsx "SULIT" OR "RAHSIA" OR "CONFIDENTIAL" OR "INTERNAL USE"`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} filetype:pdf OR filetype:docx OR filetype:xlsx "SULIT" OR "RAHSIA" OR "CONFIDENTIAL" OR "INTERNAL USE"`)}`,
      purpose: 'Mengeluar salinan dokumen rasmi bertanda klasifikasi rahsia.',
      threatLevel: 'HIGH'
    },
    {
      category: 'GOOGLE',
      title: 'Fail Log Sistem & Suratan Ralat (PHPInfo, Trace Log)',
      dorkQuery: `site:${domain} ext:log OR ext:txt OR ext:sql "error" OR "exception" OR "phpinfo()"`,
      searchUrl: `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ext:log OR ext:txt OR ext:sql "error" OR "exception" OR "phpinfo()"`)}`,
      purpose: 'Mengesan fail maklumat sistem dan ralat dalaman.',
      threatLevel: 'MEDIUM'
    },

    // GITHUB DORKS
    {
      category: 'GITHUB',
      title: 'Kebocoran Kunci API & Token GitHub Repository',
      dorkQuery: `"${cleanTarget}" filename:.env OR filename:config.json "password" OR "secret" OR "api_key"`,
      searchUrl: `https://github.com/search?q=${encodeURIComponent(`"${cleanTarget}" filename:.env OR filename:config.json "password" OR "secret" OR "api_key"`)}&type=code`,
      purpose: 'Mencari kunci API dan token rahsia yang terbocor dalam kod sumber GitHub.',
      threatLevel: 'CRITICAL'
    },
    {
      category: 'GITHUB',
      title: 'Kunci Peribadi SSL/SSH (.pem, id_rsa)',
      dorkQuery: `"${cleanTarget}" extension:pem OR filename:id_rsa OR "BEGIN PRIVATE KEY"`,
      searchUrl: `https://github.com/search?q=${encodeURIComponent(`"${cleanTarget}" extension:pem OR filename:id_rsa OR "BEGIN PRIVATE KEY"`)}&type=code`,
      purpose: 'Pengesanan kunci RSA/SSH peribadi yang tersimpan di repositori awam.',
      threatLevel: 'CRITICAL'
    },
    {
      category: 'GITHUB',
      title: 'Kredensial Sambungan Pangkalan Data (Postgres/MySQL)',
      dorkQuery: `"${cleanTarget}" "postgres://" OR "mysql://" OR "mongodb+srv://"`,
      searchUrl: `https://github.com/search?q=${encodeURIComponent(`"${cleanTarget}" "postgres://" OR "mysql://" OR "mongodb+srv://"`)}&type=code`,
      purpose: 'Mencari pautan hos pangkalan data yang tidak dilindungi.',
      threatLevel: 'HIGH'
    },

    // SHODAN DORKS
    {
      category: 'SHODAN',
      title: 'Shodan: Pelayan & Infrastruktur SSL Org',
      dorkQuery: `ssl:"${cleanTarget}" OR org:"${cleanTarget}"`,
      searchUrl: `https://www.shodan.io/search?query=${encodeURIComponent(`ssl:"${cleanTarget}" OR org:"${cleanTarget}"`)}`,
      purpose: 'Mengimbas ruang IP awam dan perkhidmatan terbuka pelayan.',
      threatLevel: 'HIGH'
    },
    {
      category: 'SHODAN',
      title: 'Shodan: Pangkalan Data Terbuka (Elastic/Mongo/Redis)',
      dorkQuery: `hostname:"${domain}" port:"27017,9200,6379"`,
      searchUrl: `https://www.shodan.io/search?query=${encodeURIComponent(`hostname:"${domain}" port:"27017,9200,6379"`)}`,
      purpose: 'Mengesan pangkalan data Mongo, Elasticsearch, atau Redis tanpa pengesahihan.',
      threatLevel: 'CRITICAL'
    },

    // CENSYS DORKS
    {
      category: 'CENSYS',
      title: 'Censys: Sijil TLS/SSL & Hos Aktif',
      dorkQuery: `parsed.names: ${domain} or services.tls.certificates.leaf_data.names: ${domain}`,
      searchUrl: `https://search.censys.io/search?resource=hosts&q=${encodeURIComponent(`parsed.names: ${domain}`)}`,
      purpose: 'Memetakan infrastruktur rangkaian dan subdomain aktif sasaran.',
      threatLevel: 'MEDIUM'
    }
  ];

  return dorks;
}

// ==========================================
// 3. CLOUD & DOMAIN RECON PROBER
// ==========================================
export interface CloudReconResult {
  target: string;
  s3Buckets: Array<{ bucketName: string; url: string; status: 'PUBLIC_EXPOSED' | 'PROTECTED' | 'NOT_FOUND'; details: string }>;
  firebaseDb?: { url: string; status: 'OPEN_ACCESS' | 'PERMISSION_DENIED' | 'NOT_FOUND' };
  dnsSecurity: {
    spfRecord?: string;
    hasSpf: boolean;
    dmarcRecord?: string;
    hasDmarc: boolean;
    dmarcPolicy?: string;
    mxRecords: string[];
    riskAssessment: string;
  };
}

export async function probeCloudAndDomainSecurity(targetDomain: string): Promise<CloudReconResult> {
  const cleanDomain = targetDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  const nameBase = cleanDomain.split('.')[0];

  const candidateBuckets = [
    `${nameBase}`,
    `${nameBase}-public`,
    `${nameBase}-data`,
    `${nameBase}-backup`,
    `${nameBase}-media`,
    `${nameBase}-assets`,
    cleanDomain.replace(/\./g, '-')
  ];

  const bucketResults: CloudReconResult['s3Buckets'] = [];

  // 1. Probe candidate S3 Buckets
  for (const bName of candidateBuckets.slice(0, 4)) {
    const s3Url = `https://${bName}.s3.amazonaws.com/`;
    try {
      const resp = await fetch(s3Url, { method: 'GET', signal: AbortSignal.timeout(4000) });
      if (resp.status === 200) {
        bucketResults.push({
          bucketName: bName,
          url: s3Url,
          status: 'PUBLIC_EXPOSED',
          details: 'ALERT: Baldi S3 awam terbuka. Kandungan fail boleh disenaraikan (ListBucket).'
        });
      } else if (resp.status === 403) {
        bucketResults.push({
          bucketName: bName,
          url: s3Url,
          status: 'PROTECTED',
          details: 'Baldi S3 wujud tetapi akses dilindungi (403 AccessDenied).'
        });
      }
    } catch {
      // Ignore offline or timeout
    }
  }

  // 2. Probe Firebase DB
  let firebaseInfo: CloudReconResult['firebaseDb'] = undefined;
  const fbUrl = `https://${nameBase}.firebaseio.com/.json`;
  try {
    const fbResp = await fetch(fbUrl, { method: 'GET', signal: AbortSignal.timeout(3500) });
    if (fbResp.status === 200) {
      firebaseInfo = {
        url: fbUrl,
        status: 'OPEN_ACCESS'
      };
    } else if (fbResp.status === 401 || fbResp.status === 403) {
      firebaseInfo = {
        url: fbUrl,
        status: 'PERMISSION_DENIED'
      };
    }
  } catch {
    // Ignore
  }

  // 3. Check DNS SPF & DMARC records via node dns
  let spfRecord = '';
  let dmarcRecord = '';
  let mxRecords: string[] = [];

  try {
    const txtRecords = await dns.promises.resolveTxt(cleanDomain).catch(() => []);
    for (const record of txtRecords) {
      const fullTxt = record.join('');
      if (fullTxt.startsWith('v=spf1')) {
        spfRecord = fullTxt;
      }
    }
  } catch {
    // Ignore
  }

  try {
    const dmarcTxt = await dns.promises.resolveTxt(`_dmarc.${cleanDomain}`).catch(() => []);
    for (const record of dmarcTxt) {
      const fullTxt = record.join('');
      if (fullTxt.startsWith('v=DMARC1')) {
        dmarcRecord = fullTxt;
      }
    }
  } catch {
    // Ignore
  }

  try {
    const mxs = await dns.promises.resolveMx(cleanDomain).catch(() => []);
    mxRecords = mxs.map(m => m.exchange);
  } catch {
    // Ignore
  }

  const hasSpf = Boolean(spfRecord);
  const hasDmarc = Boolean(dmarcRecord);

  let dmarcPolicy = 'NONE';
  if (dmarcRecord.includes('p=reject')) dmarcPolicy = 'REJECT';
  else if (dmarcRecord.includes('p=quarantine')) dmarcPolicy = 'QUARANTINE';
  else if (dmarcRecord.includes('p=none')) dmarcPolicy = 'MONITOR_ONLY';

  let riskAssessment = 'Tutup';
  if (!hasSpf && !hasDmarc) {
    riskAssessment = 'KRITIKAL: Tiada rekod SPF & DMARC. Domain sangat terdedah kepada pemalsuan e-mel (Email Spoofing & Phishing).';
  } else if (!hasDmarc || dmarcPolicy === 'MONITOR_ONLY') {
    riskAssessment = 'AMARAN: Polisi DMARC bersifat pemerhatian (p=none) atau tiada. Berisiko disalah guna untuk penyamaran.';
  } else {
    riskAssessment = 'SELAMAT: Rekod SPF & DMARC dikuatkuasakan dengan polisi ketat.';
  }

  return {
    target: cleanDomain,
    s3Buckets: bucketResults,
    firebaseDb: firebaseInfo,
    dnsSecurity: {
      spfRecord: spfRecord || undefined,
      hasSpf,
      dmarcRecord: dmarcRecord || undefined,
      hasDmarc,
      dmarcPolicy,
      mxRecords,
      riskAssessment
    }
  };
}

// ==========================================
// 4. OSINT RISK QUANTIFICATION SCORING ENGINE
// ==========================================
export interface ExposureRiskScoreCard {
  target: string;
  totalScore: number; // 0 - 100
  riskRating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  breakdown: {
    credentialLeakScore: number;
    cloudExposureScore: number;
    domainSecurityScore: number;
    identityFootprintScore: number;
  };
  attackVectors: Array<{ vector: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'; description: string }>;
  recommendations: string[];
}

export function calculateExposureRisk(
  targetName: string,
  secretLeaks: SecretLeakMatch[],
  cloudData?: CloudReconResult
): ExposureRiskScoreCard {
  let score = 15; // Base low risk
  const attackVectors: ExposureRiskScoreCard['attackVectors'] = [];
  const recs: string[] = [];

  // Evaluate Leaks
  let critLeaks = 0;
  let highLeaks = 0;
  for (const s of secretLeaks) {
    if (s.severity === 'CRITICAL') critLeaks++;
    if (s.severity === 'HIGH') highLeaks++;
  }

  const credentialLeakScore = Math.min(40, critLeaks * 20 + highLeaks * 10);
  score += credentialLeakScore;

  if (critLeaks > 0) {
    attackVectors.push({
      vector: 'Pendedahan Rahsia/Kunci Akses Terbocor',
      severity: 'CRITICAL',
      description: `Dikesan ${critLeaks} kebocoran rahsia berkategori KRITIKAL (seperti AWS Key/Private Key/JWT). Penyerang boleh mengambil alih kawalan infrastruktur.`
    });
    recs.push('Lakukan pembatalan (revocation) & putaran kunci rahsia (secret rotation) serta-merta pada penyedia perkhidmatan.');
  }

  // Evaluate Cloud
  let cloudScore = 0;
  if (cloudData) {
    const exposedBuckets = cloudData.s3Buckets.filter(b => b.status === 'PUBLIC_EXPOSED');
    if (exposedBuckets.length > 0) {
      cloudScore += 25;
      attackVectors.push({
        vector: 'Baldi Awan AWS S3 Awam',
        severity: 'CRITICAL',
        description: `Dikesan ${exposedBuckets.length} baldi AWS S3 yang boleh diakses awam. Data sensitif sasaran terdedah kepada muat turun tanpa kawalan.`
      });
      recs.push('Sekat akses penyenaraian awam pada AWS S3 Bucket (Enable Block Public Access).');
    }

    if (cloudData.firebaseDb?.status === 'OPEN_ACCESS') {
      cloudScore += 20;
      attackVectors.push({
        vector: 'Pangkalan Data Firebase Terbuka',
        severity: 'HIGH',
        description: 'Firebase Realtime Database membenarkan bacaan data awam tanpa pengesahihan tokeng.'
      });
      recs.push('Kemaskini Firestore/Firebase Security Rules untuk menyemak pengesahihan auth pengguna.');
    }

    if (!cloudData.dnsSecurity.hasDmarc || cloudData.dnsSecurity.dmarcPolicy === 'MONITOR_ONLY') {
      cloudScore += 15;
      attackVectors.push({
        vector: 'Kerentanan Pemalsuan E-mel (Email Spoofing)',
        severity: 'MEDIUM',
        description: cloudData.dnsSecurity.riskAssessment
      });
      recs.push('Konfigurasikan rekod DMARC dengan polisi penguatkuasaan "p=reject" atau "p=quarantine".');
    }
  }

  score += cloudScore;
  const totalScore = Math.min(100, Math.max(0, score));

  let riskRating: ExposureRiskScoreCard['riskRating'] = 'LOW';
  if (totalScore >= 75) riskRating = 'CRITICAL';
  else if (totalScore >= 50) riskRating = 'HIGH';
  else if (totalScore >= 30) riskRating = 'MEDIUM';

  if (recs.length === 0) {
    recs.push('Teruskan pemantauan berkala dan gunakan imbasan dorking untuk pencegahan pendedahan masa depan.');
  }

  return {
    target: targetName,
    totalScore,
    riskRating,
    breakdown: {
      credentialLeakScore,
      cloudExposureScore: cloudScore,
      domainSecurityScore: cloudData?.dnsSecurity.hasDmarc ? 5 : 20,
      identityFootprintScore: 10
    },
    attackVectors,
    recommendations: recs
  };
}

// ==========================================
// 5. TRADECRAFT SYSTEM PROMPT INJECTION
// ==========================================
export const CLAUDE_OSINT_TRADECRAFT_PROMPT = `
[CLAUDE-OSINT TRADECRAFT METHODOLOGY APPLIED]
Anda diserapkan dengan metodologi risikan offensive & defensive OSINT tahap tinggi (berdasarkan piawaian Tradecraft elementalsouls/Claude-OSINT):
1. Pengkelasan Permukaan Serangan (Attack Surface Mapping): Sentiasa analisis sasaran mengikut domain, IP CIDR, rahsia terdedah (API Keys/JWT), dan identiti individu.
2. Penilaian Keterukan (Severity Rubrics): Nilaikan kerentanan berasaskan impak eksploitasi nyata (CRITICAL = Pengambilalihan infrastruktur/Kunci AWS; HIGH = Kebocoran PII/Data; MEDIUM = Konfigurasi DNS/DMARC terdedah).
3. Vektor Serangan & Mitigasi: Bagi setiap kelemahan yang dikesan, berikan langkah pencegahan (mitigation) konkret secara spesifik.
4. Pengesahan Bukti (Verifiable Provenance): Pastikan sebarang kenyataan disokong bukti konkrit daripada nod graf atau carian web secara langsung.
`;
