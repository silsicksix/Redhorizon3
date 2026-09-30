/**
 * CLIENT GOOGLE CUSTOM SEARCH (CSE) SOCINT SERVICE
 * Connects frontend to the server-side /api/socint/google-cse endpoint
 * and handles conversion to Red Horizon Graph Nodes & Dossiers.
 */

import { Node, Link } from '../types';

export interface SocintResultItem {
  id: string;
  platform: string;
  username: string;
  displayName: string;
  url: string;
  snippet: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  confidence: number;
  engine: 'google_cse' | 'socint_grounding' | 'tavily_socint';
  sourceTitle: string;
  metadata?: Record<string, any>;
}

export interface SocintSearchResponse {
  success: boolean;
  query: string;
  cx: string;
  engine: 'google_cse' | 'socint_grounding' | 'tavily_socint';
  totalResults: number;
  items: SocintResultItem[];
  notice?: string;
  error?: string;
}

export const DEFAULT_SOCINT_CX = '53a0041f2f24f4e3b';

export async function queryGoogleSocint(options: {
  query: string;
  cx?: string;
  apiKey?: string;
  platform?: string;
  num?: number;
}): Promise<SocintSearchResponse> {
  const { query, cx = DEFAULT_SOCINT_CX, apiKey, platform = 'all', num = 10 } = options;
  
  const response = await fetch('/api/socint/google-cse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      cx,
      apiKey,
      platform,
      num
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Ralat pelayan: status ${response.status}`);
  }

  return response.json();
}

/**
 * Transforms a SOCINT result item into a Red Horizon graph node
 * with full Markdown details formatted for the right-hand Dossier panel.
 */
export function transformSocintItemToNode(
  item: SocintResultItem,
  sourceNode?: Node | null,
  index: number = 0
): { node: Node; link?: Link } {
  const nodeId = `node_socint_${Date.now()}_${index}`;
  const nowStr = new Date().toLocaleString('ms-MY', { timeZoneName: 'short' });
  const cleanUsername = item.username ? `@${item.username.replace(/^@/, '')}` : item.displayName;

  // Clean, eye-catching canvas label
  const label = `${item.platform}: ${cleanUsername}`;

  // Rich markdown formatted for the Dossier Panel
  const details = `### 🌐 SOCINT Profil Risikan: ${item.platform} (${cleanUsername})

- **Platform Media Sosial:** ${item.platform}
- **Nama Pengguna / Handle:** \`${cleanUsername}\`
- **Nama Paparan:** ${item.displayName}
- **Pautan Profil Sah:** [${item.url}](${item.url})
- **Enjin Carian:** Google Custom Search (CX: \`${DEFAULT_SOCINT_CX}\`)
- **Tahap Keyakinan:** ✓ ${item.confidence}% (Disahkan Melalui Enjin SOCINT)
- **Status Hubungan:** ${sourceNode ? `Dipetakan terus dari sasaran [${sourceNode.label}]` : 'Nod Profil Bebas'}

---

#### 📝 Bio / Petikan Risikan (Snippet):
> ${item.snippet || 'Tiada maklumat bio awam tambahan diekstrak.'}

---

#### 🔍 Analisis Metadata & Forensik:
- **Sumber Enjin:** ${item.engine === 'google_cse' ? 'Google Custom Search JSON API' : 'Enjin SOCINT Grounding AI'}
- **Tajuk Halaman Asal:** ${item.sourceTitle || item.displayName}
- **Tarikh Penemuan:** ${nowStr}
- **Cadangan Siasatan:** Gunakan menu klik-kanan atau butang di bawah untuk menjalankan pengesahan imej avatar, semakan stailometri teks, atau pemetaan pautan rangkaian.`;

  const node: Node = {
    id: nodeId,
    label,
    type: 'person',
    details,
    imageUrl: item.avatarUrl,
    imageUrls: item.avatarUrl ? [item.avatarUrl] : undefined,
    url: item.url,
    confidenceScore: item.confidence,
    confidenceLevel: item.confidence >= 90 ? 'HIGH' : 'MEDIUM',
    verificationStatus: 'VERIFIED',
    sourceType: 'GOOGLE_CSE_SOCINT',
    sources: [{
      sourceName: `Google CSE (${item.platform})`,
      timestamp: nowStr,
      url: item.url,
      details: item.snippet
    }],
    metadata: {
      platform: item.platform,
      username: item.username,
      displayName: item.displayName,
      cx: DEFAULT_SOCINT_CX,
      engine: item.engine,
      ...(item.metadata || {})
    },
    x: sourceNode?.x ? sourceNode.x + (Math.cos(index * 0.8) * 160) : undefined,
    y: sourceNode?.y ? sourceNode.y + (Math.sin(index * 0.8) * 160) : undefined
  };

  const link: Link | undefined = sourceNode ? {
    source: sourceNode.id,
    target: nodeId,
    label: 'socint_profile',
    timestamp: nowStr
  } : undefined;

  return { node, link };
}
