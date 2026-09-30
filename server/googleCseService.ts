/**
 * GOOGLE CUSTOM SEARCH ENGINE (CSE) - SOCINT SERVICE
 * Search Engine ID default: 53a0041f2f24f4e3b
 * Specialized for Social Media Intelligence (SOCINT) harvesting,
 * entity extraction, and automatic Red Horizon graph plotting.
 */

import { executeGeminiWithFallback } from './geminiService';

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

const DEFAULT_CX = '53a0041f2f24f4e3b';

const SOCINT_PLATFORMS: Record<string, { name: string; domains: string[]; siteDork: string }> = {
  all: {
    name: 'Semua SOCINT',
    domains: ['instagram.com', 'x.com', 'twitter.com', 'tiktok.com', 'facebook.com', 't.me', 'linkedin.com', 'youtube.com', 'reddit.com', 'threads.net', 'github.com'],
    siteDork: '(site:instagram.com OR site:x.com OR site:twitter.com OR site:tiktok.com OR site:facebook.com OR site:t.me OR site:linkedin.com OR site:youtube.com OR site:reddit.com OR site:threads.net)'
  },
  instagram: {
    name: 'Instagram',
    domains: ['instagram.com'],
    siteDork: 'site:instagram.com'
  },
  x: {
    name: 'X / Twitter',
    domains: ['x.com', 'twitter.com'],
    siteDork: '(site:x.com OR site:twitter.com)'
  },
  tiktok: {
    name: 'TikTok',
    domains: ['tiktok.com'],
    siteDork: 'site:tiktok.com'
  },
  facebook: {
    name: 'Facebook',
    domains: ['facebook.com'],
    siteDork: 'site:facebook.com'
  },
  telegram: {
    name: 'Telegram',
    domains: ['t.me', 'telegram.me'],
    siteDork: '(site:t.me OR site:telegram.me)'
  },
  linkedin: {
    name: 'LinkedIn',
    domains: ['linkedin.com'],
    siteDork: 'site:linkedin.com'
  },
  youtube: {
    name: 'YouTube',
    domains: ['youtube.com'],
    siteDork: 'site:youtube.com'
  },
  reddit: {
    name: 'Reddit',
    domains: ['reddit.com'],
    siteDork: 'site:reddit.com'
  },
  github: {
    name: 'GitHub',
    domains: ['github.com'],
    siteDork: 'site:github.com'
  }
};

export function detectPlatformFromUrl(urlStr: string): { platform: string; username: string } {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    if (host.includes('instagram.com')) {
      const match = pathname.match(/^\/([a-zA-Z0-9_.]+)/);
      const user = match && !['p', 'reel', 'explore', 'stories', 'tv', 'direct'].includes(match[1].toLowerCase()) ? match[1] : '';
      return { platform: 'Instagram', username: user ? user.replace(/^@/, '') : '' };
    }

    if (host.includes('x.com') || host.includes('twitter.com')) {
      const match = pathname.match(/^\/([a-zA-Z0-9_]+)/);
      const user = match && !['home', 'explore', 'notifications', 'messages', 'i', 'search', 'hashtag', 'settings'].includes(match[1].toLowerCase()) ? match[1] : '';
      return { platform: 'X / Twitter', username: user ? user.replace(/^@/, '') : '' };
    }

    if (host.includes('tiktok.com')) {
      const match = pathname.match(/^\/@?([a-zA-Z0-9_.]+)/);
      return { platform: 'TikTok', username: match ? match[1].replace(/^@/, '') : '' };
    }

    if (host.includes('t.me') || host.includes('telegram.me')) {
      const match = pathname.match(/^\/([a-zA-Z0-9_]+)/);
      const user = match && !['joinchat', 's', 'c', 'share', 'contact'].includes(match[1].toLowerCase()) ? match[1] : '';
      return { platform: 'Telegram', username: user ? user.replace(/^@/, '') : '' };
    }

    if (host.includes('facebook.com')) {
      const match = pathname.match(/^\/([a-zA-Z0-9_.]+)/);
      const user = match && !['groups', 'pages', 'watch', 'marketplace', 'events', 'photo', 'share'].includes(match[1].toLowerCase()) ? match[1] : '';
      return { platform: 'Facebook', username: user ? user.replace(/^@/, '') : '' };
    }

    if (host.includes('linkedin.com')) {
      const match = pathname.match(/\/in\/([a-zA-Z0-9_-]+)/);
      return { platform: 'LinkedIn', username: match ? match[1] : '' };
    }

    if (host.includes('youtube.com')) {
      const match = pathname.match(/\/@([a-zA-Z0-9_.-]+)/) || pathname.match(/\/c\/([a-zA-Z0-9_.-]+)/);
      return { platform: 'YouTube', username: match ? match[1] : '' };
    }

    if (host.includes('reddit.com')) {
      const match = pathname.match(/\/user\/([a-zA-Z0-9_-]+)/);
      return { platform: 'Reddit', username: match ? match[1] : '' };
    }

    if (host.includes('github.com')) {
      const match = pathname.match(/^\/([a-zA-Z0-9_-]+)/);
      const user = match && !['features', 'topics', 'trending', 'collections', 'events', 'about', 'orgs', 'search'].includes(match[1].toLowerCase()) ? match[1] : '';
      return { platform: 'GitHub', username: user ? user.replace(/^@/, '') : '' };
    }

    return { platform: 'Social Media', username: '' };
  } catch {
    return { platform: 'Social Media', username: '' };
  }
}

export function cleanDisplayName(title: string, username: string, platform: string): string {
  if (!title) return username ? `@${username}` : platform;
  let clean = title;
  clean = clean.replace(/•\s*Instagram.*$/i, '');
  clean = clean.replace(/\|\s*Twitter.*$/i, '');
  clean = clean.replace(/\|\s*X.*$/i, '');
  clean = clean.replace(/\|\s*Facebook.*$/i, '');
  clean = clean.replace(/\|\s*LinkedIn.*$/i, '');
  clean = clean.replace(/on TikTok.*$/i, '');
  clean = clean.replace(/on Telegram.*$/i, '');
  clean = clean.replace(/-\s*YouTube.*$/i, '');
  clean = clean.trim();
  return clean || (username ? `@${username}` : platform);
}

export async function executeGoogleSocintSearch(options: {
  query: string;
  cx?: string;
  apiKey?: string;
  platform?: string;
  num?: number;
  start?: number;
}): Promise<SocintSearchResponse> {
  const { query, platform = 'all', num = 10, start = 1 } = options;
  const cx = options.cx?.trim() || process.env.GOOGLE_CSE_ID || DEFAULT_CX;
  const apiKey = options.apiKey?.trim() || process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_SEARCH_API_KEY || '';

  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return {
      success: false,
      query: '',
      cx,
      engine: 'google_cse',
      totalResults: 0,
      items: [],
      error: 'Kata kunci carian diperlukan.'
    };
  }

  // Construct target query with site filters if applicable
  const platformConfig = SOCINT_PLATFORMS[platform.toLowerCase()] || SOCINT_PLATFORMS.all;
  let finalQuery = cleanQuery;
  if (!finalQuery.toLowerCase().includes('site:') && platformConfig) {
    finalQuery = `${cleanQuery} ${platformConfig.siteDork}`;
  }

  // Attempt 1: Call Google Custom Search API if apiKey is provided
  if (apiKey) {
    try {
      const googleApiUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(finalQuery)}&num=${Math.min(num, 10)}&start=${start}`;
      
      const response = await fetch(googleApiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        const rawItems = data.items || [];
        
        const items: SocintResultItem[] = rawItems.map((item: any, idx: number) => {
          const { platform: detectedPlatform, username: extractedUser } = detectPlatformFromUrl(item.link || '');
          const username = extractedUser || cleanQuery.replace(/\s+/g, '').toLowerCase();
          const displayName = cleanDisplayName(item.title || '', username, detectedPlatform);
          
          // Extract best avatar image
          const pagemap = item.pagemap || {};
          const cseImage = pagemap.cse_image?.[0]?.src;
          const cseThumbnail = pagemap.cse_thumbnail?.[0]?.src;
          const ogImage = pagemap.metatags?.[0]?.['og:image'] || pagemap.metatags?.[0]?.['twitter:image'];
          const avatarUrl = ogImage || cseImage || cseThumbnail || undefined;

          return {
            id: `socint_cse_${Date.now()}_${idx}`,
            platform: detectedPlatform,
            username,
            displayName,
            url: item.link || '',
            snippet: item.snippet || '',
            avatarUrl,
            thumbnailUrl: cseThumbnail || cseImage,
            confidence: 95,
            engine: 'google_cse',
            sourceTitle: item.title || '',
            metadata: {
              displayLink: item.displayLink,
              pagemap: pagemap.metatags?.[0] || {}
            }
          };
        });

        return {
          success: true,
          query: cleanQuery,
          cx,
          engine: 'google_cse',
          totalResults: Number(data.searchInformation?.totalResults) || items.length,
          items,
          notice: `Berjaya memperoleh ${items.length} hasil melalui Google Custom Search API (CX: ${cx}).`
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('[GOOGLE CSE API NOTICE]', response.status, errorData?.error?.message || response.statusText);
      }
    } catch (apiErr: any) {
      console.warn('[GOOGLE CSE CALL FAILED, FALLING BACK TO SOCINT GROUNDING]', apiErr.message);
    }
  }

  // Attempt 2: Intelligent Fallback using Gemini Search Grounding / SOCINT Recon
  // This ensures 100% reliability for the user even when a Google Cloud billing API key is not configured!
  try {
    console.log(`[GOOGLE CSE FALLBACK] Executing SOCINT Grounding Search for "${finalQuery}"...`);
    const prompt = `Lakukan carian risikan media sosial (SOCINT) untuk sasaran: "${cleanQuery}".
Platform yang disasarkan: ${platformConfig.name} (${platformConfig.domains.join(', ')}).

Kembalikan senarai profil media sosial yang sah dan relevan dalam format JSON tulen:
[
  {
    "platform": "Instagram / X / TikTok / Facebook / Telegram / LinkedIn / YouTube / Reddit",
    "username": "nama pengguna tanpa @",
    "displayName": "Nama Penuh atau Paparan Sasaran",
    "url": "https://url-profil-sebenar",
    "snippet": "Ringkasan bio, jawatan, atau aktiviti berkaitan sasaran",
    "confidence": 92
  }
]
Hanya senaraikan akaun yang wujud atau paling padan dengan carian web.`;

    const fallbackRes = await executeGeminiWithFallback({
      contents: prompt,
      primaryModel: 'gemini-3.7-flash',
      fallbackModels: ['gemini-flash-latest', 'gemini-3.1-flash-lite'],
      useSearch: true,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    if (fallbackRes.success && fallbackRes.text) {
      let parsedList: any[] = [];
      try {
        const jsonMatch = fallbackRes.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedList = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        console.warn('Failed to parse json from fallback grounding:', parseErr);
      }

      if (Array.isArray(parsedList) && parsedList.length > 0) {
        const items: SocintResultItem[] = parsedList.map((item: any, idx: number) => {
          const { platform: detectedPlatform, username: extractedUser } = detectPlatformFromUrl(item.url || '');
          const username = (item.username || extractedUser || cleanQuery.replace(/\s+/g, '')).replace(/^@/, '');
          return {
            id: `socint_ground_${Date.now()}_${idx}`,
            platform: item.platform || detectedPlatform,
            username,
            displayName: item.displayName || `@${username}`,
            url: item.url || `https://${detectedPlatform.toLowerCase()}.com/${username}`,
            snippet: item.snippet || `Profil media sosial ${item.platform} berkaitan ${cleanQuery}.`,
            confidence: item.confidence || 88,
            engine: 'socint_grounding',
            sourceTitle: `${item.platform}: ${item.displayName || username}`
          };
        });

        return {
          success: true,
          query: cleanQuery,
          cx,
          engine: 'socint_grounding',
          totalResults: items.length,
          items,
          notice: `Carian berjaya melalui Enjin Risikan SOCINT Grounding (CX Rujukan: ${cx}). Kunci API Google Cloud CSE boleh ditambah dalam Tetapan untuk sambungan API Google terus.`
        };
      }
    }
  } catch (groundingErr: any) {
    console.error('[SOCINT GROUNDING FALLBACK ERROR]', groundingErr);
  }

  // Attempt 3: Tavily SOCINT Fallback if available
  const tavilyKey = process.env.TAVILY_API_KEY || '';
  if (tavilyKey) {
    try {
      const tavilyRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: finalQuery,
          search_depth: 'basic',
          include_images: true,
          max_results: 10
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (tavilyRes.ok) {
        const tData = await tavilyRes.json();
        const results = tData.results || [];
        const items: SocintResultItem[] = results.map((r: any, idx: number) => {
          const { platform: detectedPlatform, username: extractedUser } = detectPlatformFromUrl(r.url || '');
          const username = extractedUser || cleanQuery.replace(/\s+/g, '').toLowerCase();
          return {
            id: `socint_tav_${Date.now()}_${idx}`,
            platform: detectedPlatform,
            username,
            displayName: cleanDisplayName(r.title || '', username, detectedPlatform),
            url: r.url || '',
            snippet: r.content || '',
            avatarUrl: tData.images?.[idx] || undefined,
            confidence: 85,
            engine: 'tavily_socint',
            sourceTitle: r.title || ''
          };
        });

        return {
          success: true,
          query: cleanQuery,
          cx,
          engine: 'tavily_socint',
          totalResults: items.length,
          items,
          notice: `Hasil carian SOCINT diperolehi melalui Tavily AI Search (CX: ${cx}).`
        };
      }
    } catch (tavErr: any) {
      console.warn('[TAVILY SOCINT FALLBACK FAILED]', tavErr.message);
    }
  }

  return {
    success: false,
    query: cleanQuery,
    cx,
    engine: 'google_cse',
    totalResults: 0,
    items: [],
    error: 'Tiada profil ditemui atau ralat sambungan enjin carian. Sila sahkan kata kunci sasaran.'
  };
}
