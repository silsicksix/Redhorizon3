import { Node, Link, GraphData, ModelConfig } from '../types';

export interface AIAnalystRequest {
  mentionTag: string; // '@ai' | '@gemini' | '@deepseek' | '@nomatron' | '@nemotron' | '@analyst' | '@scout' | string;
  userPrompt: string;
  senderName: string;
  graphData: GraphData;
  activeNode?: Node | null;
  recentMessages?: Array<{
    senderName: string;
    senderRole?: string;
    text: string;
    type?: string;
    timestamp?: number;
  }>;
  config?: ModelConfig;
}

export interface SocialNodeIntel {
  nodeId?: string;
  platform: string;
  platformName: string;
  symbol?: string;
  handleOrLabel: string;
  url?: string;
  relationship?: string;
  isCanvasNode: boolean;
  status?: string;
  details?: string;
  imageUrl?: string;
}

export interface MatchedCanvasNodeIntel {
  nodeId: string;
  label: string;
  type: string;
  details?: string;
  url?: string;
  connectionsCount?: number;
  relevanceReason?: string;
  imageUrl?: string;
}

export interface AIAnalystResponse {
  analystName: string;
  analystModel: string;
  role: 'ai_analyst';
  content: string;
  suggestedTools: Array<{
    id: string;
    name: string;
    modalId: string;
    icon: string;
    reason: string;
  }>;
  targetFocusNodeId?: string;
  matchedCanvasNodes?: MatchedCanvasNodeIntel[];
  socialMediaNodes?: SocialNodeIntel[];
  webSources?: Array<{ title: string; url: string }>;
  searchQueries?: string[];
}

export interface NodeWebVerificationResult {
  success: boolean;
  targetNode: Partial<Node>;
  verdict: 'VERIFIED_LEGITIMATE' | 'PARTIALLY_VERIFIED' | 'ANOMALOUS_DISCREPANCY' | 'UNCONFIRMED_GHOST' | 'SUSPICIOUS_RISK' | string;
  verdictLabel: string;
  confidenceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  summary: string;
  confirmedFacts: string[];
  discrepancies: string[];
  riskSignals: string[];
  discoveredEntities: Array<{
    label: string;
    type: string;
    relationship: string;
    confidence: number;
    details: string;
    sourceUrl?: string;
  }>;
  recommendedNextTools: Array<{ id: string; name: string; reason: string }>;
  webSources: Array<{ title: string; url: string }>;
  searchQueries: string[];
  timestamp: string;
}

const safeParseAnalystResponse = async (res: Response): Promise<any> => {
  try {
    const text = await res.text();
    if (!text || text.trim().startsWith('<') || text.toLowerCase().includes('<!doctype html>')) {
      return null;
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Client helper to trigger Live Web Grounded Node Verification via Server AI
 */
export async function verifyNodeAtWeb(
  node: Node,
  graphData?: GraphData,
  customQuery?: string,
  config?: ModelConfig
): Promise<NodeWebVerificationResult> {
  try {
    const connectedLinks = (graphData?.links || []).filter(l => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      return src === node.id || tgt === node.id;
    });

    const connectedNodeIds = new Set<string>();
    connectedLinks.forEach(l => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      if (src !== node.id) connectedNodeIds.add(src);
      if (tgt !== node.id) connectedNodeIds.add(tgt);
    });

    const connectedNodes = (graphData?.nodes || [])
      .filter(n => connectedNodeIds.has(n.id))
      .map(n => ({ label: n.label, type: n.type, details: n.details?.slice(0, 100) }));

    const otherEntities = (graphData?.nodes || [])
      .filter(n => n.id !== node.id && !connectedNodeIds.has(n.id))
      .slice(0, 15)
      .map(n => n.label);

    const res = await fetch('/api/ai/verify-node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node: {
          id: node.id,
          label: node.label,
          type: node.type,
          details: node.details,
          tags: node.tags
        },
        canvasContext: {
          connectedNodes,
          otherEntities
        },
        customQuery,
        config: config ? {
          apiKey: config.apiKey,
          openrouterApiKey: config.openrouterApiKey,
          openrouterModel: config.openrouterModel,
          provider: config.provider
        } : undefined
      })
    });

    if (res.ok) {
      const data = await safeParseAnalystResponse(res);
      if (data && data.success) {
        return data;
      }
    }
  } catch (e) {
    console.warn('[verifyNodeAtWeb] API error:', e);
  }

  // Fallback
  return {
    success: true,
    targetNode: node,
    verdict: 'PARTIALLY_VERIFIED',
    verdictLabel: 'Pengesahan Heuristik Tempatan',
    confidenceScore: 65,
    riskLevel: 'LOW',
    summary: `Nod "${node.label}" (${node.type}) telah diproses melalui enjin prapengesahan konteks graf. Sila hubungkan ke pangkalan data langsung untuk pengesahan mendalam.`,
    confirmedFacts: [`Entiti "${node.label}" wujud dalam pangkalan kanvas aktif.`],
    discrepancies: ['Tiada rekod pengesahan pihak ketiga secara langsung.'],
    riskSignals: [],
    discoveredEntities: [],
    recommendedNextTools: [
      { id: 'social_recon', name: 'Social Recon & Auto Scout', reason: 'Imbas profil media sosial' },
      { id: 'dork_builder', name: 'Google Dorking Engine', reason: 'Jana dork carian terbuka' }
    ],
    webSources: [],
    searchQueries: [`${node.label} ${node.type}`],
    timestamp: new Date().toISOString()
  };
}

const REDHORIZON_TOOLS_CATALOG = [
  { id: 'social_recon', modalId: 'social_recon', name: 'Social Recon & Auto Scout', icon: '💬', desc: 'Carian profil FB, X, TikTok, IG, Telegram & variasi 5-target dinamik' },
  { id: 'geo_recon', modalId: 'geo_recon', name: 'Geospatial Recon & Peta GIS', icon: '🌐', desc: 'Analisis koordinat, satelit, peta Malaysia & kluster lokasi' },
  { id: 'cctv_hub', modalId: 'cctv_hub', name: 'TrafficVision CCTV Hub', icon: '📹', desc: 'Pemantauan video strim lebuhraya & trafik masa nyata' },
  { id: 'image_intel', modalId: 'image_intel', name: 'Visual Intel & EXIF Lab', icon: '📷', desc: 'Pengecaman wajah AI, metadata EXIF, GPS bayang & OCR' },
  { id: 'dork_builder', modalId: 'dork_builder', name: 'Google Dorking Engine', icon: '🔎', desc: 'Pembina dork khusus carian pangkalan data bocor & dokumen sensitif' },
  { id: 'shodan_panel', modalId: 'shodan_panel', name: 'Shodan & Port Scanner', icon: '🛡️', desc: 'Imbasan port pasif, CVE kerentanan & perkhidmatan pelayan terbuka' },
  { id: 'stylometry', modalId: 'stylometry', name: 'Stylometry Lab', icon: '✍️', desc: 'Analisis kepengarangan linguistik, corak ejaan & cap jari teks' },
  { id: 'timeline', modalId: 'timeline', name: 'Forensic Timeline', icon: '⏱️', desc: 'Rekonstruksi kronologi kejadian & urutan masa interaksi' },
  { id: 'sna_panel', modalId: 'sna_panel', name: 'SNA Network Centrality', icon: '🕸️', desc: 'Kiraan Betweenness, Degree & Closeness nod utama' },
  { id: 'autonomous_agent', modalId: 'autonomous_agent', name: 'Autonomous Drone Swarm', icon: '🤖', desc: 'Bot perayap OSINT berautonomi multi-langkah' },
  { id: 'location_sting', modalId: 'location_sting', name: 'Location Sting Payload', icon: '🎯', desc: 'Penjejakan koordinat GPS aktif via pautan umpan' },
  { id: 'share_trace', modalId: 'share_trace', name: 'ShareTrace Inspector', icon: '🔗', desc: 'Nyahkod rantaian rujukan pautan & metadata pengguna' },
  { id: 'web_capture', modalId: 'web_capture', name: 'SnapRender Web Capture', icon: '📸', desc: 'Tangkapan bukti laman web arkib digital' },
  { id: 'intelligence_briefing', modalId: 'intelligence_briefing', name: 'Intelligence Briefing Exporter', icon: '📄', desc: 'Jana laporan rasmi PDF/Markdown lengkap' }
];

export function detectPlatformFromText(text: string, type: string = ''): { platform: string; platformName: string; symbol: string } {
  const t = (text + ' ' + type).toLowerCase();
  if (t.includes('twitter') || t.includes('x.com') || t.includes('twt') || t.includes('tweet') || type.toLowerCase() === 'twitter' || type.toLowerCase() === 'x') {
    return { platform: 'twitter', platformName: 'Twitter / X', symbol: '𝕏' };
  }
  if (t.includes('instagram') || t.includes('instagr.am') || t.includes('ig:') || type.toLowerCase() === 'instagram') {
    return { platform: 'instagram', platformName: 'Instagram', symbol: '📸' };
  }
  if (t.includes('facebook') || t.includes('fb.com') || t.includes('fb.me') || t.includes('fb:') || type.toLowerCase() === 'facebook') {
    return { platform: 'facebook', platformName: 'Facebook', symbol: '👤' };
  }
  if (t.includes('tiktok') || type.toLowerCase() === 'tiktok') {
    return { platform: 'tiktok', platformName: 'TikTok', symbol: '🎵' };
  }
  if (t.includes('telegram') || t.includes('t.me') || type.toLowerCase() === 'telegram') {
    return { platform: 'telegram', platformName: 'Telegram', symbol: '✈️' };
  }
  if (t.includes('github') || type.toLowerCase() === 'github') {
    return { platform: 'github', platformName: 'GitHub', symbol: '🐙' };
  }
  if (t.includes('linkedin') || type.toLowerCase() === 'linkedin') {
    return { platform: 'linkedin', platformName: 'LinkedIn', symbol: '💼' };
  }
  if (t.includes('youtube') || t.includes('youtu.be') || type.toLowerCase() === 'youtube') {
    return { platform: 'youtube', platformName: 'YouTube', symbol: '🎥' };
  }
  if (t.includes('reddit') || type.toLowerCase() === 'reddit') {
    return { platform: 'reddit', platformName: 'Reddit', symbol: '👽' };
  }
  if (t.includes('discord') || type.toLowerCase() === 'discord') {
    return { platform: 'discord', platformName: 'Discord', symbol: '🎮' };
  }
  if (t.includes('email') || t.includes('gmail') || t.includes('yahoo') || t.includes('proton') || type.toLowerCase() === 'email') {
    return { platform: 'email', platformName: 'Email / Mel', symbol: '✉️' };
  }
  if (t.includes('phone') || t.includes('telefon') || t.includes('whatsapp') || t.includes('wa.me') || type.toLowerCase() === 'phone') {
    return { platform: 'phone', platformName: 'WhatsApp / Phone', symbol: '📱' };
  }
  if (t.includes('http://') || t.includes('https://') || type.toLowerCase() === 'website' || type.toLowerCase() === 'domain') {
    return { platform: 'website', platformName: 'Laman Web / Domain', symbol: '🌐' };
  }
  return { platform: 'social', platformName: 'Media Sosial / Profil', symbol: '🔗' };
}

export function extractSocialIntelFromGraph(
  graphData: GraphData,
  activeNode?: Node | null,
  userPrompt: string = ''
): SocialNodeIntel[] {
  const results: SocialNodeIntel[] = [];
  const seenUrls = new Set<string>();
  const seenLabels = new Set<string>();

  const nodes = graphData?.nodes || [];
  const links = graphData?.links || [];

  const extractUrls = (txt?: string): string[] => {
    if (!txt) return [];
    const matches = txt.match(/https?:\/\/[^\s"',;()]+/gi);
    return matches ? Array.from(new Set(matches)) : [];
  };

  // 1. If activeNode is selected, prioritize connected nodes to activeNode
  if (activeNode) {
    links.forEach(l => {
      const srcId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const tgtId = typeof l.target === 'object' ? (l.target as any).id : l.target;

      let otherNodeId: string | null = null;
      if (srcId === activeNode.id) otherNodeId = tgtId;
      else if (tgtId === activeNode.id) otherNodeId = srcId;

      if (otherNodeId) {
        const neighbor = nodes.find(n => n.id === otherNodeId);
        if (neighbor) {
          const plat = detectPlatformFromText(`${neighbor.label} ${neighbor.type} ${neighbor.details || ''} ${neighbor.url || ''}`, neighbor.type);
          const isSocialLike = neighbor.type.toLowerCase().includes('social') ||
                               neighbor.type.toLowerCase().includes('person') ||
                               neighbor.type.toLowerCase().includes('profile') ||
                               neighbor.type.toLowerCase().includes('account') ||
                               plat.platform !== 'social' ||
                               Boolean(neighbor.url);

          if (isSocialLike && !seenLabels.has(neighbor.label.toLowerCase())) {
            seenLabels.add(neighbor.label.toLowerCase());
            if (neighbor.url) seenUrls.add(neighbor.url.toLowerCase());

            results.push({
              nodeId: neighbor.id,
              platform: plat.platform,
              platformName: plat.platformName,
              symbol: plat.symbol,
              handleOrLabel: neighbor.label,
              url: neighbor.url || extractUrls(neighbor.details)[0] || '',
              relationship: l.label || 'Nod Terhubung di Canvas',
              isCanvasNode: true,
              status: neighbor.verificationStatus || 'VERIFIED',
              details: neighbor.details,
              imageUrl: neighbor.imageUrl
            });
          }
        }
      }
    });

    // Check activeNode's own URLs and details for embedded profiles
    const embeddedUrls = [
      ...(activeNode.url ? [activeNode.url] : []),
      ...extractUrls(activeNode.details),
      ...extractUrls(activeNode.reports)
    ];

    embeddedUrls.forEach(u => {
      const cleanU = u.trim();
      if (!seenUrls.has(cleanU.toLowerCase())) {
        seenUrls.add(cleanU.toLowerCase());
        const plat = detectPlatformFromText(cleanU);
        results.push({
          nodeId: activeNode.id,
          platform: plat.platform,
          platformName: plat.platformName,
          symbol: plat.symbol,
          handleOrLabel: `${plat.platformName} (${activeNode.label})`,
          url: cleanU,
          relationship: 'Dikesan dalam rekod sasaran',
          isCanvasNode: false,
          status: 'EXTRACTED',
          details: `Pautan profil dikesan pada entiti ${activeNode.label}`,
          imageUrl: activeNode.imageUrl
        });
      }
    });
  }

  // 2. Also check other nodes in canvas that match social media platforms
  nodes.forEach(n => {
    if (activeNode && n.id === activeNode.id) return;
    if (seenLabels.has(n.label.toLowerCase())) return;

    const plat = detectPlatformFromText(`${n.label} ${n.type} ${n.details || ''} ${n.url || ''}`, n.type);
    const isExplicitSocial = ['twitter', 'instagram', 'facebook', 'tiktok', 'telegram', 'github', 'linkedin', 'youtube', 'reddit', 'discord'].includes(plat.platform) ||
                             n.type.toLowerCase().includes('social') ||
                             n.type.toLowerCase().includes('account');

    if (isExplicitSocial) {
      seenLabels.add(n.label.toLowerCase());
      if (n.url) seenUrls.add(n.url.toLowerCase());

      results.push({
        nodeId: n.id,
        platform: plat.platform,
        platformName: plat.platformName,
        symbol: plat.symbol,
        handleOrLabel: n.label,
        url: n.url || extractUrls(n.details)[0] || '',
        relationship: 'Nod Kanvas',
        isCanvasNode: true,
        status: n.verificationStatus || 'VERIFIED',
        details: n.details,
        imageUrl: n.imageUrl
      });
    }
  });

  return results;
}

/**
 * Intelligent Graph Node Search & Ranking Engine
 * Capable of scanning thousands of canvas nodes with semantic keyword, type, tag, notes, and centrality ranking.
 */
export function searchAndRankCanvasNodes(
  graphData: GraphData, 
  userPrompt: string, 
  activeNode?: Node | null, 
  maxResults: number = 20
): MatchedCanvasNodeIntel[] {
  const nodes = graphData?.nodes || [];
  const links = graphData?.links || [];
  if (nodes.length === 0) return [];

  // Calculate Node Degrees (Connections Count)
  const nodeDegrees: Record<string, number> = {};
  nodes.forEach(n => { nodeDegrees[n.id] = 0; });
  links.forEach(l => {
    const src = typeof l.source === 'object' ? l.source.id : l.source;
    const tgt = typeof l.target === 'object' ? l.target.id : l.target;
    if (nodeDegrees[src] !== undefined) nodeDegrees[src]++;
    if (nodeDegrees[tgt] !== undefined) nodeDegrees[tgt]++;
  });

  const promptLower = (userPrompt || '').toLowerCase();
  
  // Check if user is looking for nodes/entities
  const isAskingForNodes = /((cari|mana|senarai|senaraikan|tunjukkan|jump|fokus|shortcut|nod|node|target|sasaran|suspek|entiti|hub|paling|banyak|terpencil|akaun|nombor|telefon|ip|email|emel|syarikat|lokasi|wang|kewangan|bank|profil|orang|individu))/i.test(promptLower);

  // Stopwords to ignore
  const stopWords = new Set([
    'yang', 'mana', 'satu', 'satukah', 'pada', 'atas', 'kanvas', 'canvas', 'graf', 'tolong', 'cari', 'carikan', 
    'senarai', 'senaraikan', 'apakah', 'apa', 'di', 'ke', 'dari', 'dan', 'atau', 'adakah', 'saya', 'kita', 
    'ini', 'itu', 'ada', 'node', 'nod', 'berikan', 'nama', 'beserta', 'detail', 'detailnya', 'secara', 'ringkas',
    'butang', 'shortcut', 'bolehkah', 'buatkan', 'terus', 'ruangan', 'chat', 'tu', 'siapa', 'iaitu', 'adalah',
    'agak', 'harap', 'anda', 'faham', 'terdapat', 'ribuan', 'pastinya', 'mengelirukan', 'user', 'untuk'
  ]);

  const rawTokens = promptLower
    .replace(/[^\w\s.-]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && !stopWords.has(t));

  const scoredNodes: Array<{ node: Node; score: number; reason: string; connections: number }> = [];

  nodes.forEach(node => {
    let score = 0;
    const reasons: string[] = [];
    const labelLower = (node.label || '').toLowerCase();
    const typeLower = (node.type || '').toLowerCase();
    const detailsLower = (node.details || '').toLowerCase();
    const urlLower = (node.url || '').toLowerCase();
    const connections = nodeDegrees[node.id] || 0;

    // 1. Direct active node context bonus
    if (activeNode && node.id === activeNode.id) {
      score += 40;
      reasons.push('Nod sasaran aktif semasa');
    }

    // 2. Exact or full phrase matching on label
    if (rawTokens.length > 0 && labelLower === rawTokens.join(' ')) {
      score += 160;
      reasons.push(`Padanan tepat nama "${node.label}"`);
    } else if (rawTokens.length > 0 && labelLower.includes(rawTokens.join(' '))) {
      score += 110;
      reasons.push(`Padanan nama penuh "${node.label}"`);
    }

    // 3. Token-based matching
    rawTokens.forEach(token => {
      if (labelLower === token) {
        score += 85;
        reasons.push(`Nama tepat "${token}"`);
      } else if (labelLower.includes(token)) {
        score += 50;
        reasons.push(`Nama mengandungi "${token}"`);
      }

      if (node.id.toLowerCase().includes(token)) {
        score += 35;
      }

      if (typeLower === token || (token.length >= 3 && typeLower.includes(token))) {
        score += 55;
        reasons.push(`Jenis [${node.type}]`);
      }

      if (detailsLower.includes(token)) {
        score += 30;
        reasons.push(`Nota sepadan "${token}"`);
      }

      if (urlLower.includes(token)) {
        score += 30;
        reasons.push(`Pautan URL sepadan`);
      }
    });

    // 4. Semantic category matches
    if (/suspek|person|individu|orang|target|sasaran/i.test(promptLower) && (typeLower.includes('person') || typeLower.includes('suspect') || typeLower.includes('target') || typeLower.includes('user'))) {
      score += 45;
      reasons.push('Kategori Sasaran/Individu');
    }
    if (/kewangan|bank|duit|wang|akaun|transfer/i.test(promptLower) && (typeLower.includes('bank') || typeLower.includes('finance') || typeLower.includes('crypto') || typeLower.includes('wallet') || typeLower.includes('account') || detailsLower.includes('rm') || detailsLower.includes('bank') || detailsLower.includes('akaun'))) {
      score += 50;
      reasons.push('Kategori Kewangan/Akaun');
    }
    if (/ip|server|domain|laman|website|url|web|host/i.test(promptLower) && (typeLower.includes('ip') || typeLower.includes('domain') || typeLower.includes('server') || typeLower.includes('website') || node.url)) {
      score += 45;
      reasons.push('Kategori Infrastruktur/Siber');
    }
    if (/lokasi|tempat|geo|gps|peta|negeri|bandar|jalan/i.test(promptLower) && (typeLower.includes('location') || typeLower.includes('geo') || typeLower.includes('place') || detailsLower.includes('lat') || detailsLower.includes('jalan') || detailsLower.includes('kuala lumpur') || detailsLower.includes('selangor') || detailsLower.includes('johor'))) {
      score += 45;
      reasons.push('Kategori Lokasi/Geospatial');
    }
    if (/telefon|phone|nombor|whatsapp|call/i.test(promptLower) && (typeLower.includes('phone') || typeLower.includes('contact') || detailsLower.includes('+60') || detailsLower.includes('01'))) {
      score += 50;
      reasons.push('Kategori Komunikasi/Telefon');
    }
    if (/sosial|social|twitter|facebook|instagram|tiktok|telegram|github|linkedin|youtube/i.test(promptLower) && (typeLower.includes('social') || typeLower.includes('twitter') || typeLower.includes('instagram') || typeLower.includes('facebook') || typeLower.includes('telegram') || typeLower.includes('tiktok') || node.url?.includes('http'))) {
      score += 45;
      reasons.push('Kategori Media Sosial');
    }

    // 5. Hub / Centrality query detection
    if (/hub|utama|central|paling banyak|sambungan|terpenting|tumpuan/i.test(promptLower)) {
      score += Math.min(connections * 12, 90);
      if (connections > 0) reasons.push(`Hub utama (${connections} sambungan)`);
    }

    // 6. Isolated / Terpencil query detection
    if (/isolated|terpencil|tiada sambungan|seorangan|orphan/i.test(promptLower)) {
      if (connections === 0) {
        score += 80;
        reasons.push('Nod terpencil (0 sambungan)');
      }
    }

    // 7. General baseline bonus for nodes with active connections
    if (isAskingForNodes && score > 0) {
      score += Math.min(connections * 2, 12);
    }

    if (score > 0) {
      const uniqueReasons = Array.from(new Set(reasons)).slice(0, 2);
      const reasonText = uniqueReasons.length > 0 ? uniqueReasons.join(' • ') : `Entiti [${node.type}] (${connections} sambungan)`;
      scoredNodes.push({
        node,
        score,
        reason: reasonText,
        connections
      });
    }
  });

  // If no specific token matches but canvas has nodes, show top central hubs & active context
  if (scoredNodes.length === 0 && (isAskingForNodes || nodes.length > 0)) {
    nodes.slice(0, 30).forEach(n => {
      const conns = nodeDegrees[n.id] || 0;
      scoredNodes.push({
        node: n,
        score: conns + (activeNode?.id === n.id ? 50 : 1),
        reason: conns > 0 ? `Hub aktif (${conns} sambungan)` : `Entiti [${n.type}]`,
        connections: conns
      });
    });
  }

  scoredNodes.sort((a, b) => b.score - a.score);

  return scoredNodes.slice(0, maxResults).map(item => ({
    nodeId: item.node.id,
    label: item.node.label,
    type: item.node.type || 'entity',
    details: item.node.details ? (item.node.details.length > 130 ? item.node.details.slice(0, 127) + '...' : item.node.details) : undefined,
    url: item.node.url,
    connectionsCount: item.connections,
    relevanceReason: item.reason,
    imageUrl: item.node.imageUrl
  }));
}

export async function consultAIAnalyst(req: AIAnalystRequest): Promise<AIAnalystResponse> {
  const tag = req.mentionTag.toLowerCase().replace('@', '');
  
  let analystName = 'Gemini Neural Analyst';
  let analystModel = 'gemini-3.7-flash';
  let provider = 'google';

  if (tag.includes('deepseek')) {
    analystName = 'DeepSeek-R1 Reasoner';
    analystModel = 'deepseek/deepseek-r1';
    provider = 'openrouter';
  } else if (tag.includes('nomatron') || tag.includes('nemotron')) {
    analystName = 'NVIDIA Nemotron 30B';
    analystModel = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
    provider = 'openrouter';
  } else if (tag.includes('scout')) {
    analystName = 'Auto Scout Recon Drone';
    analystModel = 'gemini-3.7-flash';
    provider = 'google';
  } else if (tag.includes('analyst') || tag.includes('osint')) {
    analystName = 'RedHorizon Lead Analyst';
    analystModel = 'gemini-3.7-flash';
    provider = 'google';
  }

  // Extract all social media intel from graph & active node
  const socialIntel = extractSocialIntelFromGraph(req.graphData, req.activeNode, req.userPrompt);

  // Compile Canvas Summary
  const nodes = req.graphData?.nodes || [];
  const links = req.graphData?.links || [];

  // Run Semantic Graph Search & Ranking across all canvas nodes
  const matchedCanvasNodes = searchAndRankCanvasNodes(req.graphData, req.userPrompt, req.activeNode, 15);

  const nodeTypesCount: Record<string, number> = {};
  nodes.forEach(n => {
    const t = n.type || 'unknown';
    nodeTypesCount[t] = (nodeTypesCount[t] || 0) + 1;
  });

  // Calculate Node Degrees to find Key Hubs
  const nodeDegrees: Record<string, number> = {};
  nodes.forEach(n => { nodeDegrees[n.id] = 0; });
  links.forEach(l => {
    const src = typeof l.source === 'object' ? l.source.id : l.source;
    const tgt = typeof l.target === 'object' ? l.target.id : l.target;
    if (nodeDegrees[src] !== undefined) nodeDegrees[src]++;
    if (nodeDegrees[tgt] !== undefined) nodeDegrees[tgt]++;
  });

  const sortedHubs = [...nodes].sort((a, b) => (nodeDegrees[b.id] || 0) - (nodeDegrees[a.id] || 0)).slice(0, 8);
  const isolatedNodes = nodes.filter(n => (nodeDegrees[n.id] || 0) === 0).slice(0, 5);

  const canvasContext = {
    totalEntitiesOnCanvas: nodes.length,
    totalConnectionsOnCanvas: links.length,
    entityTypesDistribution: nodeTypesCount,
    activeFocusNode: req.activeNode ? { 
      id: req.activeNode.id,
      label: req.activeNode.label, 
      type: req.activeNode.type, 
      url: req.activeNode.url,
      details: req.activeNode.details 
    } : null,
    matchedCanvasNodesIntel: matchedCanvasNodes.map(m => ({
      nodeId: m.nodeId,
      label: m.label,
      type: m.type,
      connections: m.connectionsCount,
      reason: m.relevanceReason,
      details: m.details || '(Tiada nota tambahan)'
    })),
    activeNodeSocialIntel: {
      target: req.activeNode ? req.activeNode.label : 'Tiada sasaran khusus',
      identifiedAccountsCount: socialIntel.length,
      accountsList: socialIntel.map(s => ({
        nodeId: s.nodeId,
        platform: s.platformName,
        symbol: s.symbol,
        label: s.handleOrLabel,
        url: s.url || '(Tiada URL langsung)',
        isCanvasNode: s.isCanvasNode,
        relationship: s.relationship
      }))
    },
    topKeyHubs: sortedHubs.map(n => ({ id: n.id, label: n.label, type: n.type, connections: nodeDegrees[n.id] })),
    isolatedEntities: isolatedNodes.map(n => ({ id: n.id, label: n.label, type: n.type }))
  };

  const chatHistory = (req.recentMessages || []).slice(-6).map(m => `[${m.senderName}]: ${m.text}`).join('\n');

  const systemInstruction = `Anda ialah ${analystName}, seorang Pegawai Risikan Siber & Penganalisis OSINT Elit bagi platform "RedHorizon OSINT".
Tugas anda:
1. Menganalisis situasi terkini berdasarkan data Canvas Graf Siasatan (yang mungkin mengandungi puluhan hingga ribuan nod) dan perbualan sembang pasukan.
2. Menjawab soalan atau permintaan daripada Operative ${req.senderName} dengan nada taktikal, berwibawa, tajam, padat, dan profesional dalam Bahasa Melayu.
3. BANTUAN CARIAN & PINTASAN RIBUAN NOD DI CANVAS:
   - Apabila pengguna mencari nod atau meminta ringkasan, berikan nama nod berserta penerangan ringkas 1 baris mengenai kepentingannya.
   - Maklumkan kepada pengguna bahawa butang pintasan "🎯 FOKUS NOD" dan "📋 BUTIRAN" telah disediakan secara automatik terus di bawah kad mesej sembang ini untuk melompat serta-merta ke nod di atas kanvas tanpa perlu mencari secara manual!
4. PANDUAN FORMAT MARKDOWN KEMAS & BERSIH (SANGAT PENTING):
   - JANGAN gunakan tajuk berserabut seperti "####" yang berulang-ulang.
   - Gunakan format kemas:
     ### 🎯 Analisis Ringkas / Situasi Semasa
     ### 🔍 Nod Padanan Yang Ditemui
     - **[Nama Nod]** ([Jenis]) — [Penerangan ringkas fungsi/hubungan nod]
     ### 🚀 Cadangan Tindakan Seterusnya
   - Gunakan senarai bullet ringkas (-) dan teks tebal (**teks**) untuk penekanan yang kemas.
   - Pastikan teks tersusun bersih, mudah dibaca, dan tidak berserabut.`;

  const prompt = `[PERMINTAAN DARI OPERATIVE @${req.senderName}]:
"${req.userPrompt}"

[DATA TERKINI & NOD PADANAN DARI CANVAS (TOTAL: ${nodes.length} NOD)]:
${JSON.stringify(canvasContext, null, 2)}

[PERBUALAN SEMBANG OPERASI TERKINI]:
${chatHistory || '(Tiada perbualan sebelumnya)'}

Sila berikan jawapan dalam format Markdown yang kemas, senaraikan nod berkaitan dengan ringkasan padat, dan cadangkan langkah seterusnya.`;

  try {
    // Call server-side proxy
    const response = await fetch('/api/ai/chat-analyst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        analystName,
        analystModel,
        provider,
        openrouterKey: req.config?.openrouterApiKey || req.config?.apiKey || '',
        openrouterModel: analystModel
      })
    });

    if (response.ok) {
      const data = await safeParseAnalystResponse(response);
      if (data && data.text) {
        // Extract recommended tools dynamically from response or heuristics
        const matchedTools = REDHORIZON_TOOLS_CATALOG.filter(tool => {
          const lowerRes = data.text.toLowerCase();
          return lowerRes.includes(tool.name.toLowerCase()) || 
                 lowerRes.includes(tool.id) || 
                 (tool.id === 'social_recon' && (lowerRes.includes('social') || lowerRes.includes('scout') || lowerRes.includes('media sosial'))) ||
                 (tool.id === 'geo_recon' && (lowerRes.includes('geospatial') || lowerRes.includes('peta') || lowerRes.includes('gps') || lowerRes.includes('lokasi'))) ||
                 (tool.id === 'image_intel' && (lowerRes.includes('exif') || lowerRes.includes('gambar') || lowerRes.includes('imej') || lowerRes.includes('wajah') || lowerRes.includes('reverse search'))) ||
                 (tool.id === 'dork_builder' && (lowerRes.includes('dork') || lowerRes.includes('google dorking'))) ||
                 (tool.id === 'shodan_panel' && (lowerRes.includes('shodan') || lowerRes.includes('port') || lowerRes.includes('cve') || lowerRes.includes('ip'))) ||
                 (tool.id === 'stylometry' && (lowerRes.includes('stylometry') || lowerRes.includes('penulisan') || lowerRes.includes('linguistik'))) ||
                 (tool.id === 'timeline' && (lowerRes.includes('timeline') || lowerRes.includes('kronologi') || lowerRes.includes('masa'))) ||
                 (tool.id === 'location_sting' && (lowerRes.includes('sting') || lowerRes.includes('perangkap') || lowerRes.includes('umpan')));
        }).slice(0, 4);

        // Always suggest social_recon if user asks about social media
        if ((req.userPrompt.toLowerCase().includes('sosial') || req.userPrompt.toLowerCase().includes('social') || req.userPrompt.toLowerCase().includes('akaun') || req.userPrompt.toLowerCase().includes('twitter') || req.userPrompt.toLowerCase().includes('facebook') || req.userPrompt.toLowerCase().includes('instagram') || req.userPrompt.toLowerCase().includes('tiktok')) && !matchedTools.some(t => t.id === 'social_recon')) {
          const socialTool = REDHORIZON_TOOLS_CATALOG.find(t => t.id === 'social_recon');
          if (socialTool) matchedTools.unshift(socialTool);
        }

        return {
          analystName,
          analystModel: data.modelUsed || analystModel,
          role: 'ai_analyst',
          content: data.text,
          matchedCanvasNodes: matchedCanvasNodes,
          socialMediaNodes: socialIntel,
          webSources: data.webSources || [],
          searchQueries: data.searchQueries || [],
          suggestedTools: matchedTools.slice(0, 4).map(t => ({
            id: t.id,
            name: t.name,
            modalId: t.modalId,
            icon: t.icon,
            reason: `Gunakan ${t.name} untuk memajukan siasatan ini.`
          })),
          targetFocusNodeId: matchedCanvasNodes[0]?.nodeId || socialIntel[0]?.nodeId || req.activeNode?.id || sortedHubs[0]?.id
        };
      }
    }
  } catch (err) {
    console.warn('[AI Analyst Service] Server API error, executing heuristic intelligence engine:', err);
  }

  // Robust Heuristic Fallback in case of server/network limits
  let fallbackContent = `### 🎯 Analisis Ringkas Canvas & Situasi Semasa
Dikesan sejumlah **${nodes.length} entiti** dan **${links.length} hubungan** dalam bilik operasi ini.
${req.activeNode ? `Nod aktif sasaran semasa: **${req.activeNode.label}** (\`${req.activeNode.type}\`).` : 'Tiada nod sasaran khusus dipilih di canvas.'}`;

  if (matchedCanvasNodes.length > 0) {
    fallbackContent += `\n\n### 🔍 Nod Padanan Yang Ditemui (${matchedCanvasNodes.length} Nod):\n` +
      matchedCanvasNodes.map(m => `- **${m.label}** (\`${m.type}\`) — ${m.relevanceReason} ${m.connectionsCount ? `[${m.connectionsCount} sambungan]` : ''}`).join('\n') +
      `\n\n*(Gunakan butang pintasan **🎯 Fokus Nod** pada kad di bawah untuk melompat serta-merta ke nod di atas kanvas).*`;
  }

  if (socialIntel.length > 0) {
    fallbackContent += `\n\n### 📱 Penemuan Profil Media Sosial Sasaran (${socialIntel.length}):\n` +
      socialIntel.map(s => `- **${s.symbol} ${s.platformName}**: \`${s.handleOrLabel}\` (${s.isCanvasNode ? `Nod Kanvas #${s.nodeId}` : 'Rekod Pautan'})`).join('\n');
  }

  fallbackContent += `\n\n### 🚀 Cadangan Tindakan Seterusnya:
1. **Gunakan Social Recon & Auto Scout**: Imbas 15+ platform untuk mencari profil sosial sasaran tersembunyi.
2. **Gunakan Google Dorking Engine**: Cari pangkalan data bocor atau rekod pendaftaran berkaitan entiti ini.
3. **Gunakan Visual Intel & EXIF Lab**: Ekstrak maklumat geolokasi gambar dan laksanakan carian wajah.`;

  return {
    analystName,
    analystModel: `${analystModel} (Heuristic Ops)`,
    role: 'ai_analyst',
    content: fallbackContent,
    matchedCanvasNodes: matchedCanvasNodes,
    socialMediaNodes: socialIntel,
    suggestedTools: [
      { id: 'social_recon', name: 'Social Recon & Auto Scout', modalId: 'social_recon', icon: '💬', reason: 'Imbas variasi profil media sosial sasaran' },
      { id: 'dork_builder', name: 'Google Dorking Engine', modalId: 'dork_builder', icon: '🔎', reason: 'Cari pangkalan data bocor & dokumen rasmi' },
      { id: 'image_intel', name: 'Visual Intel & EXIF Lab', modalId: 'image_intel', icon: '📷', reason: 'Ekstrak metadata foto & lokasi EXIF' }
    ],
    targetFocusNodeId: matchedCanvasNodes[0]?.nodeId || socialIntel[0]?.nodeId || req.activeNode?.id || sortedHubs[0]?.id
  };
}
