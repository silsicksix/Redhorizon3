import https from 'https';
import http from 'http';
import { hasValidGeminiKey, executeGeminiWithFallback, cleanJsonOutput } from './geminiService';

export interface VisualImageResult {
  url: string;
  thumbnail?: string;
  title?: string;
  source?: string;
  engine?: 'tavily' | 'google_grounding' | 'bing' | 'wikipedia' | 'wikidata' | 'deezer' | 'tvmaze' | 'youtube' | 'google_images' | 'clearbit' | 'duckduckgo' | 'yahoo' | 'github' | 'gravatar' | 'openverse' | 'web_scraper';
  width?: number;
  height?: number;
  relevanceScore?: number; // 0 - 100
  contextReason?: string; // Human explanation of contextual relevance
  category?: 'PORTRAIT' | 'EVIDENCE' | 'LOCATION' | 'ORGANIZATION' | 'SOCIAL' | 'CRIME_NEWS' | 'GENERAL';
  matchedKeywords?: string[];
}

export interface VisualSearchOptions {
  maxResults?: number;
  tavilyApiKey?: string;
  nodeType?: string;
  caseName?: string;
  caseDescription?: string;
  connectedEntities?: string[];
  notes?: string;
  tags?: string[];
  targetMode?: 'AUTO' | 'PORTRAIT' | 'EVIDENCE' | 'LOCATION' | 'ORGANIZATION' | 'SOCIAL' | 'CRIME_NEWS';
  contextKeywords?: string[];
  strictContextFilter?: boolean;
  preferredEngine?: 'ALL' | 'TAVILY' | 'GOOGLE_GROUNDING' | 'WIKIPEDIA' | 'WEB';
}

export interface ContextDiagnostics {
  canonicalName: string;
  aliases: string[];
  anchors: string[];
  detectedMode: string;
  queriesExecuted: string[];
  enginesQueried: string[];
  engineStats: Record<string, { attempted: boolean; success: boolean; count: number; error?: string }>;
}

// Noise patterns to reject non-actionable icons, blank gifs, trackers, or generic stock templates
const NOISE_PATTERNS = [
  'pixel.gif',
  '1x1.png',
  '1x1.gif',
  'spacer.gif',
  'tracking',
  'adservice',
  'favicon.ico',
  'blank.gif',
  'data:image/svg+xml;base64,PHN2Zy',
  'placeholder',
  'default-avatar',
  'avatar_default',
  'user_placeholder',
  'no-image',
  'no_image',
  'shutterstock_vector',
  'freepik-vector',
  'istockphoto_vector',
  'vector-icon'
];

/**
 * Honorifics and common prefixes to strip for canonical search queries
 */
const HONORIFICS_PREFIXES = [
  /^dato['’\s]*/i,
  /^datuk['’\s]*/i,
  /^tan\s*sri['’\s]*/i,
  /^tun['’\s]*/i,
  /^dr\.?['’\s]*/i,
  /^tuan['’\s]*/i,
  /^puan['’\s]*/i,
  /^cik['’\s]*/i,
  /^mr\.?['’\s]*/i,
  /^ms\.?['’\s]*/i,
  /^mrs\.?['’\s]*/i,
  /^ir\.?['’\s]*/i,
  /^prof\.?['’\s]*/i,
  /^kapten['’\s]*/i,
  /^inspektor['’\s]*/i,
  /^dsp['’\s]*/i,
  /^acp['’\s]*/i,
  /^sac['’\s]*/i,
  /^cp['’\s]*/i,
  /^y\.?b\.?['’\s]*/i,
  /^yb['’\s]*/i,
  /^suspek:\s*/i,
  /^target:\s*/i,
  /^sasaran:\s*/i,
  /^node:\s*/i,
  /^subjek:\s*/i,
  /^individu:\s*/i,
  /^syarikat:\s*/i,
  /^organisasi:\s*/i,
  /^entity:\s*/i
];

/**
 * Intelligent Target and Context Sanitizer
 */
export function sanitizeSearchTarget(rawQuery: string): { 
  cleanName: string; 
  canonicalName: string; 
  extractedContext: string[]; 
  aliases: string[];
} {
  const extractedContext: string[] = [];
  const aliases: string[] = [];
  if (!rawQuery) return { cleanName: '', canonicalName: '', extractedContext, aliases };

  // 1. Extract bracketed / parenthesized metadata
  const parenMatches = rawQuery.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    for (const m of parenMatches) {
      const inside = m.replace(/[()]/g, '').trim();
      if (inside && inside.length > 1) extractedContext.push(inside);
    }
  }
  const bracketMatches = rawQuery.match(/\[([^\]]+)\]/g);
  if (bracketMatches) {
    for (const m of bracketMatches) {
      const inside = m.replace(/[\[\]]/g, '').trim();
      if (inside && inside.length > 1) extractedContext.push(inside);
    }
  }

  // 2. Extract slash or hyphenated aliases (e.g. "Sanjeevan / MyWatch", "Jho Low @ Low Taek Jho")
  const aliasParts = rawQuery.split(/[@\/|\\]+/);
  if (aliasParts.length > 1) {
    for (let i = 1; i < aliasParts.length; i++) {
      const part = aliasParts[i].replace(/[\[\]()]/g, '').trim();
      if (part.length > 1) aliases.push(part);
    }
  }

  // 3. Clean string by removing parentheses, brackets and redundant whitespaces
  let cleanName = rawQuery
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Strip honorifics & prefixes to obtain the core Canonical Name for deep search
  let canonicalName = cleanName;
  for (const prefix of HONORIFICS_PREFIXES) {
    canonicalName = canonicalName.replace(prefix, '').trim();
  }

  // Fallbacks if over-stripped
  if (!cleanName || cleanName.length < 2) cleanName = rawQuery.trim();
  if (!canonicalName || canonicalName.length < 2) canonicalName = cleanName;

  return { cleanName, canonicalName, extractedContext, aliases };
}

/**
 * Fast Scraper for Web Page OpenGraph & Media Tags
 */
export async function extractPageVisualMedia(pageUrl: string, timeoutMs = 4500): Promise<VisualImageResult[]> {
  try {
    const parsed = new URL(pageUrl);
    if (!parsed.protocol.startsWith('http')) return [];

    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; RedHorizonOSINT/3.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8,id;q=0.7'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) return [];
    const html = await res.text();
    const results: VisualImageResult[] = [];
    const hostname = parsed.hostname;

    // 1. OpenGraph Image
    const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    // 2. Twitter Image
    const twImg = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
    // 3. Schema.org image
    const schemaImg = html.match(/"image":\s*["'](https?:\/\/[^"']+)["']/i) ||
                      html.match(/"thumbnailUrl":\s*["'](https?:\/\/[^"']+)["']/i);
    // 4. Page Title
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : hostname;

    const candidateUrls = [ogImg?.[1], twImg?.[1], schemaImg?.[1]].filter(Boolean) as string[];

    for (let u of candidateUrls) {
      if (u.startsWith('//')) u = 'https:' + u;
      else if (u.startsWith('/')) u = `${parsed.origin}${u}`;
      
      if (u.startsWith('http') && !NOISE_PATTERNS.some(p => u.toLowerCase().includes(p))) {
        results.push({
          url: u,
          thumbnail: u,
          title: pageTitle,
          source: hostname,
          engine: 'web_scraper',
          relevanceScore: 88,
          contextReason: `Diekstrak dari laporan web rasmi (${hostname})`,
          category: 'CRIME_NEWS'
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * High-Yield Bing Image Search Scraper (Extracts High-Res Media + Ultra-Reliable Thumbnails)
 */
async function searchBingImages(query: string, maxResults = 10): Promise<VisualImageResult[]> {
  try {
    const formattedQuery = query.trim();
    if (!formattedQuery) return [];

    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(formattedQuery)}&form=HDRSC2&first=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8,id;q=0.7',
        'Referer': 'https://www.bing.com/'
      },
      signal: AbortSignal.timeout(6500)
    });

    if (!res.ok) return [];
    const html = await res.text();
    const results: VisualImageResult[] = [];
    const seenUrls = new Set<string>();

    // Bing encodes full image metadata in m="{...}" attributes
    const mMatches = Array.from(html.matchAll(/(?:class=["']iusc["'][^>]*m=["']|m=["'])\s*({[^"']+})\s*["']/gi));

    for (const match of mMatches) {
      try {
        const rawJson = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const meta = JSON.parse(rawJson);
        const imgUrl = meta.murl || meta.turl;
        const thumbUrl = meta.turl || meta.murl;
        const title = meta.t || meta.desc || formattedQuery;
        const pUrl = meta.purl || '';

        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http') && !seenUrls.has(imgUrl)) {
          if (!NOISE_PATTERNS.some(p => imgUrl.toLowerCase().includes(p))) {
            seenUrls.add(imgUrl);
            let sourceHost = 'bing.com';
            try {
              if (pUrl && pUrl.startsWith('http')) sourceHost = new URL(pUrl).hostname;
            } catch { /* ignore */ }

            results.push({
              url: imgUrl,
              thumbnail: thumbUrl || imgUrl,
              title: title.trim(),
              source: sourceHost,
              engine: 'bing',
              relevanceScore: 88,
              contextReason: `Padanan imej beresolusi tinggi daripada enjin carian web (${title})`,
              category: 'GENERAL'
            });
          }
        }
      } catch {
        // continue
      }
      if (results.length >= maxResults) break;
    }

    return results;
  } catch (err: any) {
    return [];
  }
}

/**
 * Fetch DuckDuckGo Image Search Results with Multi-Vector Resilience
 */
async function searchDuckDuckGoImages(query: string, maxResults = 8): Promise<VisualImageResult[]> {
  try {
    const formattedQuery = query.trim();
    if (!formattedQuery) return [];

    // Step 1: Obtain VQD token with multiple fallback regexes
    const initRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(formattedQuery)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!initRes.ok) return [];
    const html = await initRes.text();
    const vqdMatch = 
      html.match(/vqd=[\"']?([^\"'&]+)/) || 
      html.match(/vqd=([0-9-]+)/) ||
      html.match(/\"vqd\":\s*\"([^\"]+)\"/) ||
      html.match(/data-vqd=\"([^\"]+)\"/);

    if (!vqdMatch || !vqdMatch[1]) return [];
    const vqd = vqdMatch[1];

    // Step 2: Fetch JSON image results using VQD
    const imgRes = await fetch(`https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(formattedQuery)}&vqd=${vqd}&f=,,,`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/',
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!imgRes.ok) return [];
    const data: any = await imgRes.json();
    if (!data || !Array.isArray(data.results)) return [];

    const results: VisualImageResult[] = [];
    for (const item of data.results) {
      const imgUrl = item.image || item.thumbnail;
      if (
        typeof imgUrl === 'string' &&
        imgUrl.startsWith('http') &&
        !NOISE_PATTERNS.some(p => imgUrl.toLowerCase().includes(p))
      ) {
        results.push({
          url: item.image || item.thumbnail,
          thumbnail: item.thumbnail || item.image,
          title: item.title || formattedQuery,
          source: item.url ? new URL(item.url).hostname : 'duckduckgo',
          engine: 'duckduckgo',
          width: item.width,
          height: item.height,
          relevanceScore: 78,
          contextReason: `Padanan visual web daripada DuckDuckGo (${item.title || formattedQuery})`
        });
      }
      if (results.length >= maxResults) break;
    }

    return results;
  } catch (err: any) {
    return [];
  }
}

/**
 * Yahoo Images Fallback Scraper
 */
async function searchYahooImages(query: string, maxResults = 6): Promise<VisualImageResult[]> {
  try {
    const formattedQuery = query.trim();
    if (!formattedQuery) return [];

    const res = await fetch(`https://images.search.yahoo.com/search/images?p=${encodeURIComponent(formattedQuery)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) return [];
    const html = await res.text();
    const results: VisualImageResult[] = [];
    
    // Extract image URLs from Yahoo HTML attributes (e.g. data-src or imgurl)
    const imgMatches = Array.from(html.matchAll(/(?:imgurl=|"iurl":\s*")([^"&]+)/g));
    const titleMatches = Array.from(html.matchAll(/(?:alt="([^"]+)"|title="([^"]+)")/g));

    let idx = 0;
    for (const match of imgMatches) {
      let rawUrl = decodeURIComponent(match[1]);
      if (rawUrl.startsWith('//')) rawUrl = 'https:' + rawUrl;
      if (rawUrl.startsWith('http') && !NOISE_PATTERNS.some(p => rawUrl.toLowerCase().includes(p))) {
        const title = titleMatches[idx]?.[1] || titleMatches[idx]?.[2] || formattedQuery;
        results.push({
          url: rawUrl,
          thumbnail: rawUrl,
          title: title,
          source: 'yahoo.com',
          engine: 'yahoo',
          relevanceScore: 75,
          contextReason: `Padanan visual enjin Yahoo (${title})`
        });
      }
      idx++;
      if (results.length >= maxResults) break;
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * High-Precision Wikidata Entity Resolution Engine
 * Extracts official claimed portrait photos (P18), official logos (P154), and flags (P41)
 */
async function searchWikidataImages(query: string, canonicalQuery?: string): Promise<VisualImageResult[]> {
  try {
    const results: VisualImageResult[] = [];
    const queriesToTry = Array.from(new Set([query, canonicalQuery].filter(Boolean) as string[]));
    const seenEntities = new Set<string>();

    for (const q of queriesToTry) {
      for (const lang of ['ms', 'en', 'id']) {
        try {
          const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=${lang}&format=json&limit=4&origin=*`;
          const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'RedHorizonOSINT/2.8 (https://redhorizon.app; intel@redhorizon.app)' },
            signal: AbortSignal.timeout(3500)
          });
          if (!searchRes.ok) continue;
          const sData: any = await searchRes.json();
          const entities = sData?.search || [];

          for (const ent of entities) {
            const entityId = ent.id;
            if (!entityId || seenEntities.has(entityId)) continue;
            seenEntities.add(entityId);

            const entityLabel = ent.label || q;
            const entityDesc = ent.description || '';

            // Fetch entity claims
            try {
              const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`;
              const entityRes = await fetch(entityUrl, {
                headers: { 'User-Agent': 'RedHorizonOSINT/2.8 (https://redhorizon.app; intel@redhorizon.app)' },
                signal: AbortSignal.timeout(3500)
              });
              if (!entityRes.ok) continue;
              const eData: any = await entityRes.json();
              const claims = eData?.entities?.[entityId]?.claims;
              if (!claims) continue;

              // P18 = image, P154 = logo image, P41 = flag image, P94 = coat of arms
              const imageFile = claims.P18?.[0]?.mainsnak?.datavalue?.value ||
                                claims.P154?.[0]?.mainsnak?.datavalue?.value ||
                                claims.P41?.[0]?.mainsnak?.datavalue?.value;

              if (imageFile && typeof imageFile === 'string') {
                const encodedFile = encodeURIComponent(imageFile.replace(/ /g, '_'));
                const highResUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFile}?width=800`;
                const thumbUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFile}?width=350`;

                results.push({
                  url: highResUrl,
                  thumbnail: thumbUrl,
                  title: `${entityLabel} — ${entityDesc || 'Entiti Rasmi Wikidata'}`,
                  source: 'wikidata.org',
                  engine: 'wikidata',
                  relevanceScore: 98,
                  contextReason: `Foto profil disahkan daripada Wikidata (${entityLabel} - ${entityDesc})`,
                  category: 'PORTRAIT'
                });
              }
            } catch {
              // continue
            }
          }
        } catch {
          // continue
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Universal Deezer Music Artist Master Visual API (Ultra High-Res 1000x1000 Studio Portraits)
 */
async function searchDeezerArtistImages(query: string, canonicalQuery?: string): Promise<VisualImageResult[]> {
  try {
    const results: VisualImageResult[] = [];
    const queriesToTry = Array.from(new Set([query, canonicalQuery].filter(Boolean) as string[]));

    for (const q of queriesToTry) {
      try {
        const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=4`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3500)
        });
        if (!res.ok) continue;
        const data: any = await res.json();
        const artists = data?.data || [];

        for (const artist of artists) {
          const imgUrl = artist.picture_xl || artist.picture_big || artist.picture_medium;
          const thumbUrl = artist.picture_medium || artist.picture_small || imgUrl;
          if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http') && !imgUrl.includes('/artist//')) {
            results.push({
              url: imgUrl,
              thumbnail: thumbUrl,
              title: `${artist.name} (Artis / Penyanyi Muzik Rasmi)`,
              source: 'deezer.com',
              engine: 'deezer',
              relevanceScore: 96,
              contextReason: `Foto studio profil penyanyi/artis daripada Deezer Music Hub (${artist.name})`,
              category: 'PORTRAIT'
            });
          }
        }
      } catch {
        // continue
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * TVMaze & Global Actor / Personality Directory API
 */
async function searchTVMazeImages(query: string, canonicalQuery?: string): Promise<VisualImageResult[]> {
  try {
    const results: VisualImageResult[] = [];
    const queriesToTry = Array.from(new Set([query, canonicalQuery].filter(Boolean) as string[]));

    for (const q of queriesToTry) {
      try {
        const res = await fetch(`https://api.tvmaze.com/search/people?q=${encodeURIComponent(q)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3500)
        });
        if (!res.ok) continue;
        const people: any = await res.json();

        for (const item of people) {
          const person = item?.person;
          const img = person?.image?.original || person?.image?.medium;
          if (img && typeof img === 'string' && img.startsWith('http')) {
            results.push({
              url: img,
              thumbnail: person?.image?.medium || img,
              title: `${person.name} (Pelakon / Personaliti Televisyen & Filem)`,
              source: 'tvmaze.com',
              engine: 'tvmaze',
              relevanceScore: 95,
              contextReason: `Foto profil rasmi pelakon/tokoh daripada pengkalan data TVMaze (${person.name})`,
              category: 'PORTRAIT'
            });
          }
        }
      } catch {
        // continue
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * YouTube Public Video & Channel Avatar Visual Scraper
 */
async function searchYouTubeVisuals(query: string, canonicalQuery?: string): Promise<VisualImageResult[]> {
  try {
    const results: VisualImageResult[] = [];
    const queriesToTry = Array.from(new Set([query, canonicalQuery].filter(Boolean) as string[]));

    for (const q of queriesToTry.slice(0, 2)) {
      try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
        const res = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8'
          },
          signal: AbortSignal.timeout(4000)
        });
        if (!res.ok) continue;
        const html = await res.text();

        // 1. Channel Avatars (yt3.googleusercontent.com)
        const avatarMatches = Array.from(html.matchAll(/(https:\/\/yt3\.googleusercontent\.com\/[^"'\s\\]+)/g)).map(m => m[1]);
        const seenAvatars = new Set<string>();
        for (const av of avatarMatches) {
          const cleanAv = av.split('=')[0] + '=s800-c-k-c0x00ffffff-no-rj';
          if (!seenAvatars.has(cleanAv) && !cleanAv.includes('default_user')) {
            seenAvatars.add(cleanAv);
            results.push({
              url: cleanAv,
              thumbnail: cleanAv,
              title: `${q} (Avatar Saluran YouTube / Media Rasmi)`,
              source: 'youtube.com',
              engine: 'youtube',
              relevanceScore: 92,
              contextReason: `Avatar saluran awam YouTube bagi ${q}`,
              category: 'SOCIAL'
            });
            if (results.length >= 3) break;
          }
        }

        // 2. High-Res Video Thumbnails (i.ytimg.com/vi/...)
        const videoMatches = Array.from(html.matchAll(/https:\/\/i\.ytimg\.com\/vi\/([a-zA-Z0-9_-]{11})\/(?:hqdefault|mqdefault|hq720|maxresdefault)\.jpg/g));
        const seenVideoIds = new Set<string>();
        for (const vm of videoMatches) {
          const videoId = vm[1];
          if (!seenVideoIds.has(videoId)) {
            seenVideoIds.add(videoId);
            const highResThumb = `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
            results.push({
              url: highResThumb,
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              title: `Video / Temubual YouTube — ${q}`,
              source: 'youtube.com',
              engine: 'youtube',
              relevanceScore: 85,
              contextReason: `Imej tangkapan video awam YouTube berkait ${q}`,
              category: 'GENERAL'
            });
            if (results.length >= 8) break;
          }
        }
      } catch {
        // continue
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Clearbit Corporate Logo & Brand Identity Engine
 */
async function searchClearbitAndBrandLogos(query: string, canonicalQuery?: string): Promise<VisualImageResult[]> {
  try {
    const results: VisualImageResult[] = [];
    const q = (canonicalQuery || query).trim();
    if (!q || q.length < 3) return [];

    const cleanStr = q.toLowerCase().replace(/[^a-z0-9]/g, '');
    const candidateDomains = [
      `${cleanStr}.com`,
      `${cleanStr}.com.my`,
      `${cleanStr}.org`,
      `${cleanStr}.gov.my`,
      `${cleanStr}.net`
    ];

    for (const domain of candidateDomains.slice(0, 3)) {
      try {
        const logoUrl = `https://logo.clearbit.com/${domain}`;
        const res = await fetch(logoUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(2500)
        });
        if (res.ok) {
          results.push({
            url: logoUrl,
            thumbnail: logoUrl,
            title: `Logo Syarikat / Organisasi Rasmi (${domain})`,
            source: 'clearbit.com',
            engine: 'clearbit',
            relevanceScore: 95,
            contextReason: `Emblem / logo syarikat rasmi bagi domain ${domain}`,
            category: 'ORGANIZATION'
          });
          break;
        }
      } catch {
        // continue
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Public Web Google Images Scraper (High-Yield Fallback)
 */
async function searchGooglePublicImages(query: string, maxResults = 8): Promise<VisualImageResult[]> {
  try {
    const results: VisualImageResult[] = [];
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&safe=off&hl=ms`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) return [];
    const html = await res.text();

    const matches = Array.from(html.matchAll(/(https:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=[^"'\s\\]+)/g)).map(m => m[1]);
    const seenUrls = new Set<string>();

    for (const imgUrl of matches) {
      const cleanUrl = imgUrl.replace(/&amp;/g, '&');
      if (!seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        results.push({
          url: cleanUrl,
          thumbnail: cleanUrl,
          title: `Carian Visual Web Awam Google — ${query}`,
          source: 'google.com',
          engine: 'google_images',
          relevanceScore: 88,
          contextReason: `Hasil imej web awam daripada Google Images (${query})`,
          category: 'GENERAL'
        });
        if (results.length >= maxResults) break;
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Fetch Wikipedia / Wikimedia portrait, logo or bio image for entities
 */
async function searchWikipediaImages(query: string, canonicalQuery?: string): Promise<VisualImageResult[]> {
  try {
    const results: VisualImageResult[] = [];
    const queriesToTry = Array.from(new Set([query, canonicalQuery].filter(Boolean) as string[]));
    const langs = ['ms', 'en', 'id']; // Bahasa Melayu, English & Indonesian

    for (const q of queriesToTry) {
      for (const lang of langs) {
        // 1. Direct Page Summary API
        try {
          const summaryRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`, {
            headers: { 'User-Agent': 'RedHorizonOSINT/2.8 (https://redhorizon.app; intel@redhorizon.app)' },
            signal: AbortSignal.timeout(3500)
          });

          if (summaryRes.ok) {
            const summary = await summaryRes.json();
            const imgSrc = summary.originalimage?.source || summary.thumbnail?.source;
            if (imgSrc && typeof imgSrc === 'string' && imgSrc.startsWith('http')) {
              results.push({
                url: imgSrc,
                thumbnail: summary.thumbnail?.source || imgSrc,
                title: `${summary.title || q} — ${summary.description || 'Pangkalan Data Wikipedia'}`,
                source: `wikipedia (${lang})`,
                engine: 'wikipedia',
                relevanceScore: 96,
                contextReason: 'Foto atau profil rasmi daripada arkib ensiklopedia Wikipedia',
                category: 'PORTRAIT'
              });
            }
          }
        } catch {
          // ignore
        }

        // 2. Wikipedia Search generator with pageimages
        try {
          const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=5&prop=pageimages|extracts&exintro=1&explaintext=1&exsentences=1&pithumbsize=800&format=json&origin=*`, {
            headers: { 'User-Agent': 'RedHorizonOSINT/2.8 (https://redhorizon.app; intel@redhorizon.app)' },
            signal: AbortSignal.timeout(3500)
          });
          if (searchRes.ok) {
            const sData: any = await searchRes.json();
            if (sData?.query?.pages) {
              for (const pageId of Object.keys(sData.query.pages)) {
                const p = sData.query.pages[pageId];
                if (p?.thumbnail?.source) {
                  results.push({
                    url: p.thumbnail.source,
                    thumbnail: p.thumbnail.source,
                    title: `${p.title} — ${p.extract || 'Wikipedia'}`,
                    source: `wikipedia (${lang})`,
                    engine: 'wikipedia',
                    relevanceScore: 94,
                    contextReason: `Foto rasmi entiti arkib Wikipedia (${p.title})`,
                    category: 'PORTRAIT'
                  });
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Fetch GitHub Avatar for Developer / Tech handles
 */
async function searchGitHubAvatar(query: string): Promise<VisualImageResult[]> {
  const clean = query.replace(/[^a-zA-Z0-9-]/g, '').trim();
  if (!clean || clean.length < 2 || clean.length > 39) return [];

  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(clean)}`, {
      headers: { 'User-Agent': 'RedHorizon-OSINT-Recon' },
      signal: AbortSignal.timeout(3000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.avatar_url) {
        return [{
          url: data.avatar_url,
          thumbnail: data.avatar_url,
          title: `${data.name || clean} (@${data.login})`,
          source: 'github.com',
          engine: 'github',
          relevanceScore: 92,
          contextReason: 'Avatar profil sah pembangun GitHub',
          category: 'SOCIAL'
        }];
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Gravatar Email Hash Lookup
 */
function searchGravatar(email: string): VisualImageResult[] {
  if (!email.includes('@')) return [];
  try {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
    const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?s=400&d=404`;
    return [{
      url: gravatarUrl,
      thumbnail: `https://www.gravatar.com/avatar/${hash}?s=120&d=404`,
      title: `${email} (Gravatar)`,
      source: 'gravatar.com',
      engine: 'gravatar',
      relevanceScore: 88,
      contextReason: 'Avatar e-mel Gravatar berdaftar',
      category: 'SOCIAL'
    }];
  } catch {
    return [];
  }
}

/**
 * Openverse CC Public Image Archive
 */
async function searchOpenverseImages(query: string, maxResults = 4): Promise<VisualImageResult[]> {
  try {
    const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${maxResults}`, {
      headers: { 'User-Agent': 'RedHorizon-OSINT-Recon/3.0' },
      signal: AbortSignal.timeout(3500)
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    if (!data || !Array.isArray(data.results)) return [];

    return data.results
      .filter((item: any) => typeof item.url === 'string' && item.url.startsWith('http'))
      .map((item: any) => ({
        url: item.url,
        thumbnail: item.thumbnail || item.url,
        title: item.title || query,
        source: 'openverse.org',
        engine: 'openverse',
        relevanceScore: 70,
        contextReason: 'Arkib visual terbuka Openverse',
        category: 'GENERAL'
      }));
  } catch {
    return [];
  }
}

/**
 * Tavily AI Image Search with Enhanced Resilience & Multi-Source Extraction
 */
async function searchTavilyImages(
  query: string, 
  apiKey: string, 
  contextStr?: string,
  maxResults = 10
): Promise<{ results: VisualImageResult[]; error?: string }> {
  const cleanKey = (apiKey || process.env.TAVILY_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  if (!cleanKey) return { results: [] };

  const results: VisualImageResult[] = [];
  const seenUrls = new Set<string>();

  // Clean domain or URL query strings to avoid searching raw hostnames
  let cleanQ = query.trim();
  if (/^(https?:\/\/|www\.)/i.test(cleanQ)) {
    cleanQ = cleanQ.replace(/^(https?:\/\/|www\.)/i, '').replace(/\.[a-z]{2,}.*$/i, '').replace(/[-_.]/g, ' ').trim();
  }

  const queriesToAttempt = [
    cleanQ,
    contextStr ? `${cleanQ} ${contextStr}` : `${cleanQ} profile photo`,
  ].filter(Boolean);

  for (const q of queriesToAttempt.slice(0, 2)) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: cleanKey,
          query: q,
          search_depth: "basic",
          include_images: true,
          include_image_descriptions: true,
          max_results: Math.min(maxResults, 10)
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errDetail = errJson?.detail?.error || errJson?.message || `HTTP ${res.status}`;
        if (results.length === 0 && queriesToAttempt.indexOf(q) === 0) {
          if (res.status === 401 || res.status === 403) {
            return { results: [], error: `Kunci Tavily API tidak sah atau kuota tamat (${errDetail})` };
          }
        }
        continue;
      }

      const data: any = await res.json();
      
      // 1. Direct images array (strings or objects with url & description)
      if (Array.isArray(data.images)) {
        for (const img of data.images) {
          const imgUrl = typeof img === 'string' ? img : (img?.url || img?.src || '');
          const desc = typeof img === 'object' && img?.description ? img.description : q;
          if (typeof imgUrl === 'string' && imgUrl.startsWith('http') && !seenUrls.has(imgUrl)) {
            seenUrls.add(imgUrl);
            results.push({
              url: imgUrl,
              thumbnail: imgUrl,
              title: desc,
              source: 'tavily',
              engine: 'tavily',
              relevanceScore: 92,
              contextReason: `Padanan imej pintar Tavily AI (${desc})`
            });
          }
        }
      }

      // 2. Results array (image field or images field in each search result)
      if (Array.isArray(data.results)) {
        for (const item of data.results) {
          if (item.image && typeof item.image === 'string' && item.image.startsWith('http') && !seenUrls.has(item.image)) {
            seenUrls.add(item.image);
            results.push({
              url: item.image,
              thumbnail: item.image,
              title: item.title || q,
              source: item.url ? new URL(item.url).hostname : 'tavily',
              engine: 'tavily',
              relevanceScore: 88,
              contextReason: `Diekstrak dari laporan carian Tavily: ${item.title || q}`
            });
          }
          if (Array.isArray(item.images)) {
            for (const subImg of item.images) {
              if (typeof subImg === 'string' && subImg.startsWith('http') && !seenUrls.has(subImg)) {
                seenUrls.add(subImg);
                results.push({
                  url: subImg,
                  thumbnail: subImg,
                  title: item.title || q,
                  source: item.url ? new URL(item.url).hostname : 'tavily',
                  engine: 'tavily',
                  relevanceScore: 86,
                  contextReason: `Imej berkait artikel web Tavily (${item.title || q})`
                });
              }
            }
          }
        }
      }

      if (results.length >= maxResults) break;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || err?.message?.includes('timeout')) {
        // Handle timeout silently and fall back smoothly
      } else {
        console.warn(`[TAVILY] Query note for "${q}":`, err?.message || err);
      }
    }
  }

  return { results: results.slice(0, maxResults) };
}

/**
 * Deep Gemini Search Grounding + Web Page Scraping for Authentic Context Images
 */
async function searchGeminiGroundingImages(
  target: string,
  canonicalName: string,
  contextStr: string,
  mode: string
): Promise<{ results: VisualImageResult[]; error?: string }> {
  if (!hasValidGeminiKey()) return { results: [] };

  try {
    const prompt = `Anda adalah pakar OSINT Visual Intelligence RedHorizon.
Sasaran Utama: "${target}"
Nama Kanonikal: "${canonicalName}"
Konteks Siasatan & Entiti Berkait: "${contextStr}"
Mod Visual: "${mode}"

Tugasan:
1. Lakukan carian web masa nyata Google Search untuk mengesan entiti / sasaran ini berdasarkan konteks siasatan.
2. Cari halaman web berita rasmi, portal akhbar (cth. Malaysiakini, Berita Harian, Sinar Harian, The Star, Astro Awani, Bernama, FMT, Kosmo), atau laman profil rasmi sasaran.
3. Berikan ringkasan ringkas mengenai sasaran dan senaraikan halaman web berita/profil yang memuatkan foto entiti ini.`;

    const genRes = await executeGeminiWithFallback({
      contents: prompt,
      primaryModel: 'gemini-3.7-flash',
      fallbackModels: ['gemini-flash-latest', 'gemini-3.1-flash-lite'],
      useSearch: true,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    if (!genRes.success || !genRes.response) {
      return { results: [], error: genRes.error || 'Gemini Search Grounding tidak mengembalikan respon' };
    }

    const results: VisualImageResult[] = [];
    const candidateWebUrls: string[] = [];

    // Extract real URLs from Google Search Grounding Metadata
    const candidates = genRes.response.candidates || [];
    for (const cand of candidates) {
      const grounding = cand?.groundingMetadata;
      if (grounding?.groundingChunks && Array.isArray(grounding.groundingChunks)) {
        for (const chunk of grounding.groundingChunks) {
          const webUri = chunk?.web?.uri;
          if (webUri && typeof webUri === 'string' && webUri.startsWith('http')) {
            candidateWebUrls.push(webUri);
          }
        }
      }
    }

    // Scrape top grounded web pages concurrently for actual authentic images (og:image, article images)
    const uniqueUrls = Array.from(new Set(candidateWebUrls)).slice(0, 6);
    if (uniqueUrls.length > 0) {
      const scrapePromises = uniqueUrls.map(u => extractPageVisualMedia(u, 4000));
      const scrapedSets = await Promise.allSettled(scrapePromises);

      for (const set of scrapedSets) {
        if (set.status === 'fulfilled' && Array.isArray(set.value)) {
          for (const item of set.value) {
            item.engine = 'google_grounding';
            item.relevanceScore = 96;
            item.contextReason = `Foto berita/laporan sah melalui Google AI Grounding (${item.source})`;
            results.push(item);
          }
        }
      }
    }

    return { results };
  } catch (err: any) {
    console.warn('[VISUAL SEARCH] Gemini grounding error:', err?.message || err);
    return { results: [], error: err?.message };
  }
}

/**
 * Heuristic Contextual Relevance Scorer
 */
export function scoreCandidateRelevance(
  item: VisualImageResult,
  target: string,
  canonicalName: string,
  contextKeywords: string[]
): { score: number; reason: string; category: VisualImageResult['category']; matchedKeywords: string[] } {
  const textToScan = `${item.title || ''} ${item.source || ''} ${item.url}`.toLowerCase();
  const lowerTarget = target.toLowerCase().trim();
  const lowerCanonical = canonicalName.toLowerCase().trim();
  const targetTokens = lowerCanonical.split(/\s+/).filter(t => t.length > 2);
  
  let score = 50; // baseline
  const matchedKeywords: string[] = [];

  // 1. Exact Name / Canonical Match
  if (textToScan.includes(lowerTarget) || textToScan.includes(lowerCanonical)) {
    score += 35;
    matchedKeywords.push(canonicalName || target);
  } else {
    // Partial tokens match
    let matches = 0;
    for (const token of targetTokens) {
      if (textToScan.includes(token)) {
        matches++;
        matchedKeywords.push(token);
      }
    }
    if (matches > 0 && targetTokens.length > 0) {
      score += Math.round((matches / targetTokens.length) * 30);
    }
  }

  // 2. Context keywords match (e.g. company, case name, crime, agency, location)
  let contextMatches = 0;
  for (const kw of contextKeywords) {
    const lowerKw = kw.toLowerCase().trim();
    if (lowerKw && lowerKw.length > 2 && textToScan.includes(lowerKw)) {
      contextMatches++;
      score += 15;
      if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw);
    }
  }

  // 3. Detect category and domain authority bonus
  let category: VisualImageResult['category'] = 'GENERAL';
  if (textToScan.includes('facebook') || textToScan.includes('linkedin') || textToScan.includes('instagram') || textToScan.includes('twitter') || textToScan.includes('t.me') || textToScan.includes('tiktok')) {
    category = 'SOCIAL';
    score += 10;
  } else if (textToScan.includes('police') || textToScan.includes('polis') || textToScan.includes('court') || textToScan.includes('mahkamah') || textToScan.includes('scam') || textToScan.includes('berita') || textToScan.includes('news') || textToScan.includes('pdrm') || textToScan.includes('sprm') || textToScan.includes('malaysiakini') || textToScan.includes('bharian')) {
    category = 'CRIME_NEWS';
    score += 15;
  } else if (textToScan.includes('ssm') || textToScan.includes('sdn bhd') || textToScan.includes('company') || textToScan.includes('holding') || textToScan.includes('logo') || textToScan.includes('syarikat')) {
    category = 'ORGANIZATION';
    score += 10;
  } else if (textToScan.includes('face') || textToScan.includes('portrait') || textToScan.includes('photo') || textToScan.includes('gambar') || textToScan.includes('wajah') || textToScan.includes('profil') || textToScan.includes('bio')) {
    category = 'PORTRAIT';
    score += 10;
  }

  // 4. Source authority bonus
  if (item.source && (item.source.includes('wikipedia') || item.source.includes('wikimedia') || item.source.includes('github') || item.source.includes('tavily'))) {
    score += 15;
  }

  // 5. Engine bonus
  if (item.engine === 'google_grounding') score += 12;
  if (item.engine === 'tavily') score += 10;
  if (item.engine === 'wikipedia') score += 14;

  // 6. Penalize stock vectors / generic stock libraries if target wasn't explicitly found in title
  if (textToScan.includes('shutterstock') || textToScan.includes('freepik') || textToScan.includes('istockphoto') || textToScan.includes('vecteezy') || textToScan.includes('gettyimages')) {
    score -= 30;
  }

  // Cap score between 15 and 99
  score = Math.max(15, Math.min(99, score));

  let reason = '';
  if (matchedKeywords.length > 0) {
    reason = `Padanan kata kunci konteks: ${matchedKeywords.slice(0, 3).join(', ')}`;
  } else if (item.source) {
    reason = `Ditemui daripada sumber ${item.source}`;
  } else {
    reason = 'Padanan visual web risikan';
  }

  return { score, reason, category, matchedKeywords };
}

/**
 * Master Unified Context-Aware Visual Recon Engine
 */
export async function searchVisualTarget(
  query: string, 
  options: VisualSearchOptions = {}
): Promise<{
  results: VisualImageResult[];
  diagnostics: ContextDiagnostics;
}> {
  const rawQuery = query.trim();
  const diagnostics: ContextDiagnostics = {
    canonicalName: '',
    aliases: [],
    anchors: [],
    detectedMode: options.targetMode || 'AUTO',
    queriesExecuted: [],
    enginesQueried: [],
    engineStats: {}
  };

  if (!rawQuery) return { results: [], diagnostics };

  // 1. Sanitize target name and extract embedded contextual keywords & aliases
  const { cleanName, canonicalName, extractedContext, aliases } = sanitizeSearchTarget(rawQuery);
  const cleanQuery = cleanName || rawQuery;
  const canonical = canonicalName || cleanQuery;

  diagnostics.canonicalName = canonical;
  diagnostics.aliases = aliases;

  const maxResults = options.maxResults || 20;
  const isEmail = cleanQuery.includes('@');
  const isUsername = /^[a-zA-Z0-9_.-]{3,30}$/.test(cleanQuery);
  const targetMode = options.targetMode || 'AUTO';

  // 2. Build Context Anchors list
  const contextAnchors: string[] = [];
  if (options.caseName && options.caseName !== 'PRIMARY_RECON' && options.caseName !== 'UNTITLED') {
    contextAnchors.push(options.caseName);
  }
  for (const ec of extractedContext) {
    if (ec && !contextAnchors.includes(ec)) contextAnchors.push(ec);
  }
  for (const al of aliases) {
    if (al && !contextAnchors.includes(al)) contextAnchors.push(al);
  }
  if (Array.isArray(options.connectedEntities)) {
    for (const ent of options.connectedEntities) {
      if (ent && ent.trim() && !contextAnchors.includes(ent.trim())) {
        contextAnchors.push(ent.trim());
      }
    }
  }
  if (Array.isArray(options.tags)) {
    for (const t of options.tags) {
      if (t && t.trim() && !contextAnchors.includes(t.trim())) {
        contextAnchors.push(t.trim());
      }
    }
  }
  if (Array.isArray(options.contextKeywords)) {
    for (const ck of options.contextKeywords) {
      if (ck && ck.trim() && !contextAnchors.includes(ck.trim())) {
        contextAnchors.push(ck.trim());
      }
    }
  }
  if (options.notes) {
    const firstLine = options.notes.split(/[\n\r]+/)[0] || '';
    const cleanNote = firstLine.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    if (cleanNote && cleanNote.length > 3 && cleanNote.length < 50) {
      contextAnchors.push(cleanNote);
    }
  }

  diagnostics.anchors = contextAnchors;
  const contextStr = contextAnchors.slice(0, 5).join(' ');

  // 3. Formulate Smart High-Yield Query Dorks
  const queriesToRun: string[] = [];

  // Dork A: Exact Canonical Name
  queriesToRun.push(canonical);
  if (cleanQuery !== canonical) queriesToRun.push(cleanQuery);

  // Dork B: Target + Primary Visual Anchors
  if (targetMode === 'PORTRAIT' || options.nodeType === 'PERSON' || options.nodeType === '1') {
    queriesToRun.push(`${canonical} foto OR profil OR wajah`);
  } else if (targetMode === 'CRIME_NEWS') {
    queriesToRun.push(`${canonical} polis OR mahkamah OR siasatan`);
  } else if (targetMode === 'ORGANIZATION' || options.nodeType === 'ORGANIZATION' || options.nodeType === '2') {
    queriesToRun.push(`${canonical} logo OR syarikat OR premis`);
  } else if (targetMode === 'EVIDENCE') {
    queriesToRun.push(`${canonical} dokumen OR resit OR bukti`);
  } else if (targetMode === 'LOCATION' || options.nodeType === 'LOCATION' || options.nodeType === '3') {
    queriesToRun.push(`${canonical} bangunan OR peta OR premis`);
  } else {
    queriesToRun.push(`${canonical} gambar OR foto`);
  }

  // Dork C: Target + Context Anchor
  if (contextAnchors.length > 0) {
    const topAnchor = contextAnchors[0].replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    if (topAnchor) {
      queriesToRun.push(`${canonical} ${topAnchor}`);
    }
  }

  // Dork D: Target + Secondary Alias
  if (aliases.length > 0) {
    queriesToRun.push(aliases[0]);
  }

  const uniqueQueries = Array.from(new Set(queriesToRun)).slice(0, 4);
  diagnostics.queriesExecuted = uniqueQueries;

  // 4. Parallel Multi-Engine Search Execution
  const tavilyKey = (options.tavilyApiKey || process.env.TAVILY_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  
  type EngineTask = {
    name: string;
    promise: Promise<VisualImageResult[] | { results: VisualImageResult[]; error?: string }>;
  };

  const tasks: EngineTask[] = [];

  // 1. High-Precision Wikidata Claim Resolution (P18 official portrait, P154 logo)
  tasks.push({
    name: 'wikidata',
    promise: searchWikidataImages(cleanQuery, canonical)
  });

  // 2. Wikipedia & Wikimedia Commons Archives
  tasks.push({
    name: 'wikipedia',
    promise: searchWikipediaImages(cleanQuery, canonical)
  });

  // 3. Deezer Studio Artist Portrait Master API (Artists, Singers, Musicians)
  tasks.push({
    name: 'deezer',
    promise: searchDeezerArtistImages(cleanQuery, canonical)
  });

  // 4. TVMaze Actors & Screen Personalities Directory API
  tasks.push({
    name: 'tvmaze',
    promise: searchTVMazeImages(cleanQuery, canonical)
  });

  // 5. YouTube Channel Avatars & Video Stills Scraper
  tasks.push({
    name: 'youtube',
    promise: searchYouTubeVisuals(cleanQuery, canonical)
  });

  // 6. Clearbit & Corporate Logo Resolution
  tasks.push({
    name: 'clearbit',
    promise: searchClearbitAndBrandLogos(cleanQuery, canonical)
  });

  // 7. Google Public Web Images
  for (const q of uniqueQueries.slice(0, 2)) {
    tasks.push({
      name: 'google_images',
      promise: searchGooglePublicImages(q, 6)
    });
  }

  // 8. Bing Images Scraper across top queries (High reliability & cached CDN thumbnails)
  for (const q of uniqueQueries.slice(0, 2)) {
    tasks.push({
      name: 'bing',
      promise: searchBingImages(q, 8)
    });
  }

  // 6. DuckDuckGo Visual API across distinct queries
  for (const q of uniqueQueries.slice(0, 2)) {
    tasks.push({
      name: 'duckduckgo',
      promise: searchDuckDuckGoImages(q, 6)
    });
  }

  // 7. Yahoo Visual fallback
  tasks.push({
    name: 'yahoo',
    promise: searchYahooImages(canonical, 5)
  });

  // 8. Tavily AI Search (if key provided or in env)
  if (tavilyKey) {
    tasks.push({
      name: 'tavily',
      promise: searchTavilyImages(canonical, tavilyKey, contextStr, 8)
    });
  }

  // Gemini Live Grounding with Deep Case Context & Web Scraping
  if (hasValidGeminiKey()) {
    tasks.push({
      name: 'google_grounding',
      promise: searchGeminiGroundingImages(cleanQuery, canonical, contextStr, targetMode)
    });
  }

  // Openverse CC Archive
  tasks.push({
    name: 'openverse',
    promise: searchOpenverseImages(canonical, 3)
  });

  // GitHub developer avatar
  if (isUsername) {
    tasks.push({
      name: 'github',
      promise: searchGitHubAvatar(canonical)
    });
  }

  // Gravatar lookup
  if (isEmail) {
    tasks.push({
      name: 'gravatar',
      promise: Promise.resolve(searchGravatar(cleanQuery))
    });
  }

  diagnostics.enginesQueried = tasks.map(t => t.name);

  const taskResults = await Promise.allSettled(tasks.map(t => t.promise));

  const combined: VisualImageResult[] = [];
  const seenUrls = new Set<string>();

  tasks.forEach((task, i) => {
    const outcome = taskResults[i];
    if (outcome.status === 'fulfilled') {
      const rawVal = outcome.value;
      const items = Array.isArray(rawVal) ? rawVal : (rawVal?.results || []);
      const err = !Array.isArray(rawVal) ? rawVal?.error : undefined;

      diagnostics.engineStats[task.name] = {
        attempted: true,
        success: items.length > 0,
        count: items.length,
        error: err
      };

      for (const item of items) {
        if (!item || !item.url) continue;
        const normalized = item.url.trim();
        if (!seenUrls.has(normalized)) {
          seenUrls.add(normalized);

          // Apply Context Relevance Scoring if not already set
          if (!item.relevanceScore) {
            const evaluation = scoreCandidateRelevance(item, cleanQuery, canonical, contextAnchors);
            item.relevanceScore = evaluation.score;
            item.contextReason = evaluation.reason;
            item.category = evaluation.category;
            item.matchedKeywords = evaluation.matchedKeywords;
          }

          combined.push(item);
        }
      }
    } else {
      diagnostics.engineStats[task.name] = {
        attempted: true,
        success: false,
        count: 0,
        error: outcome.reason?.message || 'Gagal melaksanakan carian'
      };
    }
  });

  // Sort by Relevance Score (Highest contextual match first)
  combined.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  // If strict filtering is requested and we have enough candidates, filter out low score candidates (< 40)
  if (options.strictContextFilter && combined.length > 3) {
    const filtered = combined.filter(item => (item.relevanceScore || 0) >= 40);
    if (filtered.length > 0) return { results: filtered.slice(0, maxResults), diagnostics };
  }

  return { results: combined.slice(0, maxResults), diagnostics };
}
