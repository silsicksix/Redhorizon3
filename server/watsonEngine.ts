import { executeGeminiWithFallback, cleanJsonOutput } from "./geminiService";

export interface WatsonEntity {
  name: string;
  type: 
    | 'person' 
    | 'company' 
    | 'organization' 
    | 'location' 
    | 'phone' 
    | 'email' 
    | 'domain' 
    | 'crypto' 
    | 'vehicle' 
    | 'event' 
    | 'document' 
    | 'fictional_character'
    | 'fictional_object'
    | 'found_footage'
    | 'cryptid_myth'
    | 'weapon_hardware'
    | 'malware_payload'
    | 'biometric_evidence'
    | 'surveillance_device'
    | 'broadcast_frequency'
    | 'classified_dossier'
    | 'financial_instrument'
    | 'other';
  role?: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'suspicious' | 'critical_threat';
  confidence: number; // 0-100
  relevanceScore?: number; // 0.0 - 1.0
  aliases?: string[];
  attributes?: Record<string, string>;
  contextExcerpt?: string;
}

export interface WatsonRelation {
  source: string;
  target: string;
  predicate: string; // e.g. "DIRECTOR_OF", "TRANSFERRED_FUNDS_TO", "COMMUNICATES_WITH", "REGISTERED_AT", "SPOUSE_OF"
  relationshipType: 'hierarchy' | 'financial' | 'communication' | 'ownership' | 'kinship' | 'criminal_link' | 'geographical' | 'association';
  confidence: number; // 0-100
  evidenceSnippet?: string;
}

export interface WatsonCognitiveResult {
  success: boolean;
  sourceType: 'text_dossier' | 'live_grounded_search';
  queryOrTitle?: string;
  executiveSummary: string;
  threatScore: number; // 1-10
  overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'HIGH_RISK_THREAT';
  riskFlags: string[];
  keyCategories: string[];
  entities: WatsonEntity[];
  relations: WatsonRelation[];
  totalEntities: number;
  totalRelations: number;
  timestamp: number;
  error?: string;
}

/**
 * Watson Cognitive Entity & Relation Extractor
 * Deconstructs raw unstructured text (reports, news, court documents, leaks) into Maltego/Watson ontological entities and semantic links.
 */
export async function extractWatsonEntitiesAndRelations(
  text: string,
  customKey?: string
): Promise<WatsonCognitiveResult> {
  const sanitizedText = String(text || '').trim().slice(0, 30000);
  if (!sanitizedText || sanitizedText.length < 5) {
    return {
      success: false,
      sourceType: 'text_dossier',
      executiveSummary: 'Teks input terlalu pendek untuk dianalisis.',
      threatScore: 1,
      overallSentiment: 'NEUTRAL',
      riskFlags: [],
      keyCategories: [],
      entities: [],
      relations: [],
      totalEntities: 0,
      totalRelations: 0,
      timestamp: Date.now(),
      error: 'Teks input tidak sah atau kosong.'
    };
  }

  const systemInstruction = `Anda adalah IBM Watson Cognitive & Maltego Transform OSINT Intelligence Engine bertaraf perisikan tertinggi.
Tugas anda: Baca teks input yang diberikan secara mendalam, lakukan Pengekstrakan Entiti Bernama (Named Entity Recognition - NER), Pemadanan Hubungan Semantik (Semantic Relation Extraction), dan Penilaian Risiko/Sentimen Kognitif.

Kategori Entiti yang disokong:
- "person": Individu, suspek, saksi, pegawai, pemegang saham, proksi
- "company" / "organization": Syarikat, anak syarikat, agensi kerajaan, persatuan, sindiket
- "location": Alamat fizikal, bandar, negara, fasiliti, koordinat
- "phone": Nombor telefon, talian WhatsApp, hotline
- "email": Alamat e-mel peribadi atau korporat
- "domain": Laman web, domain, subdomain, URL
- "crypto": Alamat dompet kripto (Bitcoin, Ethereum, USDT/TRON), transaksi hash
- "vehicle": Nombor plat pendaftaran kereta/motosikal, jenis kenderaan, kapal
- "event": Insiden, tarikh perjumpaan, transaksi kewangan, serbuan
- "document": No kad pengenalan (IC/Passport), nombor pendaftaran syarikat (SSM), no akaun bank

Kategori Hubungan Semantik (Relations):
- "DIRECTOR_OF", "SHAREHOLDER_OF", "TRANSFERRED_FUNDS_TO", "COMMUNICATES_WITH", "LOCATED_AT", "OWNS_DOMAIN", "USED_PHONE", "FAMILY_OF", "ACCOMPLICE_OF", "REPORTED_BY", "REGISTERED_TO", "SUBSIDIARY_OF"

Format JSON yang MESTI dikembalikan (tiada markdown di luar json):
{
  "executiveSummary": "Ringkasan eksekutif padat 2-3 perenggan mengenai apa yang terbongkar dalam dokumen ini (Bahasa Melayu).",
  "threatScore": 7, // Nombor 1 hingga 10 mengikut tahap ancaman/penipuan/risiko
  "overallSentiment": "HIGH_RISK_THREAT", // "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "HIGH_RISK_THREAT"
  "riskFlags": ["Petunjuk Risiko 1", "Petunjuk Risiko 2"],
  "keyCategories": ["Pengubahan Wang Haram", "Syarikat Kulit", "Penipuan Pelaburan"],
  "entities": [
    {
      "name": "Nama Entiti",
      "type": "person",
      "role": "Pengarah Urusan",
      "sentiment": "suspicious",
      "confidence": 95,
      "relevanceScore": 0.9,
      "aliases": ["Alias 1"],
      "attributes": { "no_kp": "880101-14-5555", "warganegara": "Malaysia" },
      "contextExcerpt": "Petikan ayat tepat di mana entiti disebut"
    }
  ],
  "relations": [
    {
      "source": "Nama Entiti A",
      "target": "Nama Entiti B",
      "predicate": "DIRECTOR_OF",
      "relationshipType": "hierarchy",
      "confidence": 90,
      "evidenceSnippet": "Bukti ayat dalam teks"
    }
  ]
}`;

  const prompt = `Lakukan Watson Cognitive Extraction secara menyeluruh ke atas teks siasatan berikut:
---
${sanitizedText}
---`;

  try {
    const result = await executeGeminiWithFallback({
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.15,
        responseMimeType: "application/json"
      },
      primaryModel: 'gemini-3.7-flash',
      fallbackModels: ['gemini-flash-latest', 'gemini-3.1-flash-lite'],
      customKey
    });

    if (!result.success || !result.text) {
      throw new Error(result.error?.message || "Gagal memperoleh respon daripada enjin AI.");
    }

    const cleaned = cleanJsonOutput(result.text);
    const parsed = JSON.parse(cleaned);

    const entities: WatsonEntity[] = Array.isArray(parsed.entities)
      ? parsed.entities.map((e: any) => ({
          name: String(e.name || '').trim(),
          type: normalizeWatsonEntityType(e.type),
          role: e.role ? String(e.role).trim() : undefined,
          sentiment: (['positive', 'neutral', 'negative', 'suspicious', 'critical_threat'].includes(e.sentiment) ? e.sentiment : 'neutral') as any,
          confidence: Math.min(100, Math.max(10, Number(e.confidence) || 85)),
          relevanceScore: Number(e.relevanceScore) || 0.8,
          aliases: Array.isArray(e.aliases) ? e.aliases.map(String) : [],
          attributes: typeof e.attributes === 'object' && e.attributes !== null ? e.attributes : {},
          contextExcerpt: e.contextExcerpt ? String(e.contextExcerpt).slice(0, 300) : undefined
        })).filter(e => e.name.length > 0)
      : [];

    const relations: WatsonRelation[] = Array.isArray(parsed.relations)
      ? parsed.relations.map((r: any) => ({
          source: String(r.source || '').trim(),
          target: String(r.target || '').trim(),
          predicate: String(r.predicate || 'ASSOCIATED_WITH').toUpperCase().replace(/\s+/g, '_'),
          relationshipType: (['hierarchy', 'financial', 'communication', 'ownership', 'kinship', 'criminal_link', 'geographical', 'association'].includes(r.relationshipType) ? r.relationshipType : 'association') as any,
          confidence: Math.min(100, Math.max(10, Number(r.confidence) || 80)),
          evidenceSnippet: r.evidenceSnippet ? String(r.evidenceSnippet).slice(0, 300) : undefined
        })).filter(r => r.source.length > 0 && r.target.length > 0 && r.source !== r.target)
      : [];

    return {
      success: true,
      sourceType: 'text_dossier',
      executiveSummary: String(parsed.executiveSummary || 'Pengekstrakan entiti kognitif selesai tanpa ringkasan tambahan.'),
      threatScore: Math.min(10, Math.max(1, Number(parsed.threatScore) || 5)),
      overallSentiment: parsed.overallSentiment || 'NEUTRAL',
      riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags.map(String) : [],
      keyCategories: Array.isArray(parsed.keyCategories) ? parsed.keyCategories.map(String) : [],
      entities,
      relations,
      totalEntities: entities.length,
      totalRelations: relations.length,
      timestamp: Date.now()
    };
  } catch (err: any) {
    console.error('Watson Cognitive Extraction Error:', err);
    return {
      success: false,
      sourceType: 'text_dossier',
      executiveSummary: 'Ralat memproses pengekstrakan entiti kognitif.',
      threatScore: 1,
      overallSentiment: 'NEUTRAL',
      riskFlags: [],
      keyCategories: [],
      entities: [],
      relations: [],
      totalEntities: 0,
      totalRelations: 0,
      timestamp: Date.now(),
      error: err?.message || String(err)
    };
  }
}

/**
 * Watson Live Grounded Search & Extraction Engine
 * Searches open web, news, and records with Google Search Grounding and constructs the Watson Knowledge Graph.
 */
export async function searchAndExtractWatsonIntelligence(
  query: string,
  customKey?: string
): Promise<WatsonCognitiveResult> {
  const sanitizedQuery = String(query || '').trim().slice(0, 500);
  if (!sanitizedQuery || sanitizedQuery.length < 2) {
    return {
      success: false,
      sourceType: 'live_grounded_search',
      queryOrTitle: sanitizedQuery,
      executiveSummary: 'Kata kunci carian tidak sah.',
      threatScore: 1,
      overallSentiment: 'NEUTRAL',
      riskFlags: [],
      keyCategories: [],
      entities: [],
      relations: [],
      totalEntities: 0,
      totalRelations: 0,
      timestamp: Date.now(),
      error: 'Kata kunci carian kosong.'
    };
  }

  const systemInstruction = `Anda adalah IBM Watson OSINT Recon & Grounded Intelligence Search Engine.
Lakukan pencarian maklumat terkini di internet berkenaan sasaran yang diberikan, kenal pasti semua entiti utama (individu, syarikat, laman web, persatuan, lokasi, kes mahkamah, transaksi), petakan hubungan antara mereka secara semantik, dan hitung skor ancaman risiko.

Format JSON yang MESTI dikembalikan:
{
  "executiveSummary": "Ringkasan siasatan menyeluruh berdasarkan penemuan carian terkini (Bahasa Melayu).",
  "threatScore": 8, // 1-10
  "overallSentiment": "HIGH_RISK_THREAT", // "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "HIGH_RISK_THREAT"
  "riskFlags": ["Petunjuk Ancaman 1", "Petunjuk Ancaman 2"],
  "keyCategories": ["Kategori 1", "Kategori 2"],
  "entities": [
    {
      "name": "Nama Entiti",
      "type": "person",
      "role": "Pengasas / Suspek",
      "sentiment": "suspicious",
      "confidence": 92,
      "relevanceScore": 0.95,
      "aliases": ["Nama Samaran"],
      "attributes": { "sumber": "Berita Harian / The Star" },
      "contextExcerpt": "Petikan fakta penemuan"
    }
  ],
  "relations": [
    {
      "source": "Nama Entiti A",
      "target": "Nama Entiti B",
      "predicate": "DIRECTOR_OF",
      "relationshipType": "hierarchy",
      "confidence": 90,
      "evidenceSnippet": "Fakta hubungan yang ditemui"
    }
  ]
}`;

  const prompt = `Cari dan ekstrak graf kognitif perisikan penuh untuk sasaran: "${sanitizedQuery}"`;

  try {
    const result = await executeGeminiWithFallback({
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        responseMimeType: "application/json"
      },
      primaryModel: 'gemini-3.7-flash',
      fallbackModels: ['gemini-flash-latest', 'gemini-3.1-flash-lite'],
      useSearch: true,
      customKey
    });

    if (!result.success || !result.text) {
      throw new Error(result.error?.message || "Gagal memperoleh maklumat carian daripada Google Search Grounding.");
    }

    const cleaned = cleanJsonOutput(result.text);
    const parsed = JSON.parse(cleaned);

    const entities: WatsonEntity[] = Array.isArray(parsed.entities)
      ? parsed.entities.map((e: any) => ({
          name: String(e.name || '').trim(),
          type: normalizeWatsonEntityType(e.type),
          role: e.role ? String(e.role).trim() : undefined,
          sentiment: (['positive', 'neutral', 'negative', 'suspicious', 'critical_threat'].includes(e.sentiment) ? e.sentiment : 'neutral') as any,
          confidence: Math.min(100, Math.max(10, Number(e.confidence) || 85)),
          relevanceScore: Number(e.relevanceScore) || 0.8,
          aliases: Array.isArray(e.aliases) ? e.aliases.map(String) : [],
          attributes: typeof e.attributes === 'object' && e.attributes !== null ? e.attributes : {},
          contextExcerpt: e.contextExcerpt ? String(e.contextExcerpt).slice(0, 300) : undefined
        })).filter(e => e.name.length > 0)
      : [];

    const relations: WatsonRelation[] = Array.isArray(parsed.relations)
      ? parsed.relations.map((r: any) => ({
          source: String(r.source || '').trim(),
          target: String(r.target || '').trim(),
          predicate: String(r.predicate || 'ASSOCIATED_WITH').toUpperCase().replace(/\s+/g, '_'),
          relationshipType: (['hierarchy', 'financial', 'communication', 'ownership', 'kinship', 'criminal_link', 'geographical', 'association'].includes(r.relationshipType) ? r.relationshipType : 'association') as any,
          confidence: Math.min(100, Math.max(10, Number(r.confidence) || 80)),
          evidenceSnippet: r.evidenceSnippet ? String(r.evidenceSnippet).slice(0, 300) : undefined
        })).filter(r => r.source.length > 0 && r.target.length > 0 && r.source !== r.target)
      : [];

    return {
      success: true,
      sourceType: 'live_grounded_search',
      queryOrTitle: sanitizedQuery,
      executiveSummary: String(parsed.executiveSummary || 'Carian dan pengekstrakan entiti selesai.'),
      threatScore: Math.min(10, Math.max(1, Number(parsed.threatScore) || 5)),
      overallSentiment: parsed.overallSentiment || 'NEUTRAL',
      riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags.map(String) : [],
      keyCategories: Array.isArray(parsed.keyCategories) ? parsed.keyCategories.map(String) : [],
      entities,
      relations,
      totalEntities: entities.length,
      totalRelations: relations.length,
      timestamp: Date.now()
    };
  } catch (err: any) {
    console.error('Watson Live Search & Extract Error:', err);
    return {
      success: false,
      sourceType: 'live_grounded_search',
      queryOrTitle: sanitizedQuery,
      executiveSummary: 'Ralat semasa menjalankan carian berpandukan internet.',
      threatScore: 1,
      overallSentiment: 'NEUTRAL',
      riskFlags: [],
      keyCategories: [],
      entities: [],
      relations: [],
      totalEntities: 0,
      totalRelations: 0,
      timestamp: Date.now(),
      error: err?.message || String(err)
    };
  }
}

export interface WatsonCanvasNodeInput {
  id: string;
  label: string;
  type?: string;
  details?: string;
  riskScore?: number;
  tags?: string[];
  attributes?: Record<string, any>;
}

export interface WatsonCanvasLinkInput {
  source: string;
  target: string;
  label?: string;
  notes?: string;
}

export interface WatsonCanvasAnalysisResult extends WatsonCognitiveResult {
  hypothesisAndInsights: string[];
  hiddenCorrelations: string[];
  suggestedActionItems: string[];
  criticalVectors: string[];
}

const VALID_WATSON_TYPES = new Set([
  'person', 'company', 'organization', 'location', 'phone', 'email', 'domain', 'crypto', 'vehicle', 'event', 'document',
  'fictional_character', 'fictional_object', 'found_footage', 'cryptid_myth', 'weapon_hardware', 'malware_payload',
  'biometric_evidence', 'surveillance_device', 'broadcast_frequency', 'classified_dossier', 'financial_instrument', 'other'
]);

function normalizeWatsonEntityType(rawType: any): WatsonEntity['type'] {
  const t = String(rawType || '').toLowerCase().trim();
  if (VALID_WATSON_TYPES.has(t)) return t as WatsonEntity['type'];
  if (t.includes('character') || t.includes('watak')) return 'fictional_character';
  if (t.includes('artifact') || t.includes('relic') || t.includes('magic') || t.includes('object')) return 'fictional_object';
  if (t.includes('footage') || t.includes('vhs') || t.includes('cctv') || t.includes('tape')) return 'found_footage';
  if (t.includes('cryptid') || t.includes('myth') || t.includes('anomaly') || t.includes('monster')) return 'cryptid_myth';
  if (t.includes('weapon') || t.includes('tactical') || t.includes('firearm') || t.includes('drone')) return 'weapon_hardware';
  if (t.includes('malware') || t.includes('virus') || t.includes('trojan') || t.includes('exploit')) return 'malware_payload';
  if (t.includes('biometric') || t.includes('dna') || t.includes('fingerprint') || t.includes('iris')) return 'biometric_evidence';
  if (t.includes('surveillance') || t.includes('sensor') || t.includes('camera') || t.includes('tracker')) return 'surveillance_device';
  if (t.includes('broadcast') || t.includes('frequency') || t.includes('signal') || t.includes('radio')) return 'broadcast_frequency';
  if (t.includes('classified') || t.includes('dossier') || t.includes('secret') || t.includes('leak')) return 'classified_dossier';
  if (t.includes('financial') || t.includes('bank') || t.includes('mule') || t.includes('offshore')) return 'financial_instrument';
  return 'other';
}

/**
 * Watson Cognitive Canvas Context Analyzer
 * Ingests selected nodes and optionally the entire graph topology, finding multi-hop relations, hidden correlations,
 * and cognitive risk intelligence.
 */
export async function analyzeWatsonCanvasContext(
  selectedNodes: WatsonCanvasNodeInput[],
  allGraphNodes: WatsonCanvasNodeInput[],
  allGraphLinks: WatsonCanvasLinkInput[],
  customInstruction?: string,
  customKey?: string
): Promise<WatsonCanvasAnalysisResult> {
  if (!selectedNodes || selectedNodes.length === 0) {
    return {
      success: false,
      sourceType: 'text_dossier',
      executiveSummary: 'Tiada nod yang dipilih untuk analisis kognitif.',
      threatScore: 1,
      overallSentiment: 'NEUTRAL',
      riskFlags: [],
      keyCategories: [],
      entities: [],
      relations: [],
      totalEntities: 0,
      totalRelations: 0,
      hypothesisAndInsights: [],
      hiddenCorrelations: [],
      suggestedActionItems: [],
      criticalVectors: [],
      timestamp: Date.now(),
      error: 'Tiada nod sasaran.'
    };
  }

  const selectedSummary = selectedNodes.map((n, i) => `[NOD SASARAN #${i+1}]
- Label/Nama: "${n.label}" (ID: ${n.id})
- Jenis Entiti: ${n.type || 'unknown'}
- Skor Risiko: ${n.riskScore ?? 'N/A'}
- Tag: ${n.tags ? n.tags.join(', ') : 'tiada'}
- Perincian/Bukti: ${n.details ? n.details.slice(0, 1500) : 'tiada perincian tambahan'}`).join('\n\n');

  const otherNodes = allGraphNodes.filter(gn => !selectedNodes.some(sn => sn.id === gn.id)).slice(0, 50);
  const contextSummary = otherNodes.length > 0
    ? `\n\n[KONTEKS KANVAS GRAF KESELURUHAN (${allGraphNodes.length} Nod, ${allGraphLinks.length} Hubungan)]:
Nod Lain dalam Kanvas:
${otherNodes.map(n => `- [${n.type || 'entity'}] "${n.label}" (ID: ${n.id}) ${n.details ? `-> ${n.details.slice(0, 100)}` : ''}`).join('\n')}

Hubungan Sedia Ada dalam Kanvas:
${allGraphLinks.slice(0, 80).map(l => `- "${l.source}" --[${l.label || 'connected'}]--> "${l.target}" ${l.notes ? `(${l.notes})` : ''}`).join('\n')}`
    : '\n\n[KONTEKS KANVAS]: Tiada nod luar dikesan dalam kanvas sedia ada.';

  const systemInstruction = `Anda adalah IBM Watson Cognitive & Graph Reasoning Intelligence Engine bertaraf tertinggi.
Tugas anda: Mengkaji dan menganalisis nod-nod yang dipilih oleh penyiasat secara mendalam berlatarbelakangkan keseluruhan topologi graf/kanvas siasatan.

Objektif Analisis:
1. Hubung kait Tersembunyi (Hidden Correlations): Cari titik pertemuan, proksi, corak transaksi, modus operandi, atau anomali semantik antara nod terpilih dan keseluruhan graf.
2. Hipotesis Kognitif (Cognitive Hypotheses & Insights): Rangka hipotesis risikan mengenai apa yang sedang berlaku (contoh: skim pengubahan wang haram, penyamaran identiti, sindiket proksi, pemilikan bersilang).
3. Entiti Baru & Hubungan Cadangan: Cadangkan entiti tambahan yang mungkin terlibat dan hubungkan secara semantik (Ontological Triples) untuk dimasukkan ke kanvas.
4. Tindakan Siasatan (Action Items): Gariskan langkah susulan taktikal yang perlu diambil oleh pegawai penyiasat.

Format JSON yang MESTI dikembalikan (tiada markdown di luar json):
{
  "executiveSummary": "Analisis kognitif menyeluruh 2-3 perenggan yang padat dan tajam (Bahasa Melayu).",
  "threatScore": 8, // 1-10
  "overallSentiment": "HIGH_RISK_THREAT", // "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "HIGH_RISK_THREAT"
  "riskFlags": ["Petunjuk Risiko 1", "Petunjuk Risiko 2"],
  "keyCategories": ["Kategori 1", "Kategori 2"],
  "hypothesisAndInsights": [
    "Hipotesis 1: Sasaran A bertindak sebagai proksi utama bagi pemindahan wang haram...",
    "Hipotesis 2: Pemilikan kenderaan mewah berkait langsung dengan akaun luar pesisir..."
  ],
  "hiddenCorrelations": [
    "Korelasi 1: Nod A dan Nod B berkongsi nod perantara C melalui pemindahan kripto.",
    "Korelasi 2: Nombor pendaftaran syarikat sepadan dengan tarikh penubuhan akaun..."
  ],
  "suggestedActionItems": [
    "Lakukan semakan silang SSM terhadap syarikat X",
    "Jejak transaksi blockchain TRC20 untuk dompet Y"
  ],
  "criticalVectors": ["Vektor Kewangan", "Vektor Komunikasi", "Vektor Korporat"],
  "entities": [
    {
      "name": "Nama Entiti Disimpulkan/Dikesan",
      "type": "person",
      "role": "Proksi Kewangan",
      "sentiment": "suspicious",
      "confidence": 90,
      "relevanceScore": 0.95,
      "aliases": [],
      "attributes": { "kaitan": "Dikesan daripada perincian transaksi" },
      "contextExcerpt": "Hubungan langsung dengan nod terpilih"
    }
  ],
  "relations": [
    {
      "source": "Label Nod A",
      "target": "Label Nod B",
      "predicate": "TRANSFERRED_FUNDS_TO",
      "relationshipType": "financial",
      "confidence": 88,
      "evidenceSnippet": "Berdasarkan bukti perincian nod"
    }
  ]
}`;

  const prompt = `Lakukan Watson Cognitive Canvas Context Reasoning untuk nod sasaran berikut:
${selectedSummary}
${contextSummary}
${customInstruction ? `\n[ARAHAN KHAS PENYIASAT]: "${customInstruction}"` : ''}`;

  try {
    const result = await executeGeminiWithFallback({
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json"
      },
      primaryModel: 'gemini-3.7-flash',
      fallbackModels: ['gemini-flash-latest', 'gemini-3.1-flash-lite'],
      customKey
    });

    if (!result.success || !result.text) {
      throw new Error(result.error?.message || "Gagal menganalisis konteks kanvas.");
    }

    const cleaned = cleanJsonOutput(result.text);
    const parsed = JSON.parse(cleaned);

    const entities: WatsonEntity[] = Array.isArray(parsed.entities)
      ? parsed.entities.map((e: any) => ({
          name: String(e.name || '').trim(),
          type: normalizeWatsonEntityType(e.type),
          role: e.role ? String(e.role).trim() : undefined,
          sentiment: (['positive', 'neutral', 'negative', 'suspicious', 'critical_threat'].includes(e.sentiment) ? e.sentiment : 'neutral') as any,
          confidence: Math.min(100, Math.max(10, Number(e.confidence) || 85)),
          relevanceScore: Number(e.relevanceScore) || 0.8,
          aliases: Array.isArray(e.aliases) ? e.aliases.map(String) : [],
          attributes: typeof e.attributes === 'object' && e.attributes !== null ? e.attributes : {},
          contextExcerpt: e.contextExcerpt ? String(e.contextExcerpt).slice(0, 300) : undefined
        })).filter(e => e.name.length > 0)
      : [];

    const relations: WatsonRelation[] = Array.isArray(parsed.relations)
      ? parsed.relations.map((r: any) => ({
          source: String(r.source || '').trim(),
          target: String(r.target || '').trim(),
          predicate: String(r.predicate || 'ASSOCIATED_WITH').toUpperCase().replace(/\s+/g, '_'),
          relationshipType: (['hierarchy', 'financial', 'communication', 'ownership', 'kinship', 'criminal_link', 'geographical', 'association'].includes(r.relationshipType) ? r.relationshipType : 'association') as any,
          confidence: Math.min(100, Math.max(10, Number(r.confidence) || 80)),
          evidenceSnippet: r.evidenceSnippet ? String(r.evidenceSnippet).slice(0, 300) : undefined
        })).filter(r => r.source.length > 0 && r.target.length > 0 && r.source !== r.target)
      : [];

    return {
      success: true,
      sourceType: 'text_dossier',
      queryOrTitle: `Analisis ${selectedNodes.length} Nod Kanvas`,
      executiveSummary: String(parsed.executiveSummary || 'Analisis kognitif kanvas selesai.'),
      threatScore: Math.min(10, Math.max(1, Number(parsed.threatScore) || 5)),
      overallSentiment: parsed.overallSentiment || 'NEUTRAL',
      riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags.map(String) : [],
      keyCategories: Array.isArray(parsed.keyCategories) ? parsed.keyCategories.map(String) : [],
      hypothesisAndInsights: Array.isArray(parsed.hypothesisAndInsights) ? parsed.hypothesisAndInsights.map(String) : [],
      hiddenCorrelations: Array.isArray(parsed.hiddenCorrelations) ? parsed.hiddenCorrelations.map(String) : [],
      suggestedActionItems: Array.isArray(parsed.suggestedActionItems) ? parsed.suggestedActionItems.map(String) : [],
      criticalVectors: Array.isArray(parsed.criticalVectors) ? parsed.criticalVectors.map(String) : [],
      entities,
      relations,
      totalEntities: entities.length,
      totalRelations: relations.length,
      timestamp: Date.now()
    };
  } catch (err: any) {
    console.error('Watson Canvas Context Analysis Error:', err);
    return {
      success: false,
      sourceType: 'text_dossier',
      queryOrTitle: `Analisis ${selectedNodes.length} Nod Kanvas`,
      executiveSummary: 'Ralat semasa menjalankan analisis kognitif ke atas nod kanvas.',
      threatScore: 1,
      overallSentiment: 'NEUTRAL',
      riskFlags: [],
      keyCategories: [],
      entities: [],
      relations: [],
      totalEntities: 0,
      totalRelations: 0,
      hypothesisAndInsights: [],
      hiddenCorrelations: [],
      suggestedActionItems: [],
      criticalVectors: [],
      timestamp: Date.now(),
      error: err?.message || String(err)
    };
  }
}

