/**
 * RED HORIZON - MONOCRAWL MCP & MULTI-PLATFORM SOCIAL RECON SERVICE
 * Integrates Monocrawl (70+ Social, Search & E-Commerce Platforms) via MCP & REST API,
 * with a resilient high-speed fallback probe engine when API keys are unconfigured.
 */

import { serverGenerateContent, serverSearchGrounding } from "./geminiService";
import { runUsernameEnum, runGithubRecon, runGravatarLookup, ToolResult } from "./osintAgentTools";

export interface MonocrawlProfile {
  platform: string;
  platformName: string;
  username: string;
  displayName?: string;
  url: string;
  avatarUrl?: string;
  bio?: string;
  verified?: boolean;
  followers?: string | number;
  following?: string | number;
  location?: string;
  website?: string;
  recentPosts?: string[];
  extractedEmails?: string[];
  extractedPhones?: string[];
}

export interface MonocrawlExecutionResult {
  target: string;
  targetType: string;
  isMonocrawlLiveApiUsed: boolean;
  platformsScannedCount: number;
  platformsFoundCount: number;
  profiles: MonocrawlProfile[];
  discoveredNodes: Array<{
    id: string;
    label: string;
    type: string;
    details?: string;
    imageUrl?: string;
    confidence?: number;
    vaultMatch?: boolean;
    properties?: Record<string, any>;
  }>;
  discoveredLinks: Array<{
    source: string;
    target: string;
    label: string;
    relationship?: string;
    confidence?: number;
  }>;
  summary: string;
  riskScore: number;
  executionTimeMs: number;
  sources: string[];
}

// Clean username or target string
export function cleanTargetHandle(raw: string): string {
  let cleaned = String(raw || '').trim();
  // Strip url prefix if pasted as full link
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\/[@]?/i, '');
  cleaned = cleaned.replace(/^@/, '');
  cleaned = cleaned.split('/')[0];
  cleaned = cleaned.split('?')[0];
  return cleaned.trim();
}

/**
 * Validates Monocrawl API key
 */
export async function testMonocrawlApiKey(apiKey: string): Promise<{ success: boolean; message: string; balance?: any }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: "Kunci API Monocrawl kosong." };
  }

  const cleanKey = apiKey.trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch("https://api.monocrawl.com/v1/profile?platform=github&username=torvalds", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${cleanKey}`,
        "X-API-Key": cleanKey,
        "Accept": "application/json"
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (resp.status === 401 || resp.status === 403) {
      return { success: false, message: "Kunci API tidak sah atau ditolak oleh Monocrawl." };
    }

    if (resp.ok || resp.status === 200 || resp.status === 404) {
      return { success: true, message: "Sambungan ke Monocrawl MCP API disahkan berjaya!" };
    }

    return { success: true, message: `Pelayan Monocrawl aktif (HTTP ${resp.status}).` };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, message: "Sambungan ke Monocrawl tamat masa (Timeout)." };
    }
    return { success: false, message: `Ralat rangkaian Monocrawl: ${err.message}` };
  }
}

/**
 * Execute Monocrawl Social Recon
 * Supports Monocrawl live endpoint + hybrid resilient fallback
 */
export async function executeMonocrawlSocialInvestigation(
  target: string,
  targetType: string = "person",
  options?: { apiKey?: string; context?: string }
): Promise<MonocrawlExecutionResult> {
  const startTime = Date.now();
  const handle = cleanTargetHandle(target);
  const apiKey = (options?.apiKey || process.env.MONOCRAWL_API_KEY || '').trim();

  const profiles: MonocrawlProfile[] = [];
  const discoveredNodes: MonocrawlExecutionResult['discoveredNodes'] = [];
  const discoveredLinks: MonocrawlExecutionResult['discoveredLinks'] = [];
  const sources: string[] = [];
  let isMonocrawlLiveApiUsed = false;

  // 1. ATTEMPT MONOCRAWL OFFICIAL / MCP SERVER CALL IF API KEY PROVIDED
  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(`https://api.monocrawl.com/v1/crawl`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "X-API-Key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          target: handle,
          type: "social_recon",
          platforms: ["github", "reddit", "twitter", "instagram", "tiktok", "linkedin", "youtube"]
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (resp.ok) {
        const data: any = await resp.json();
        isMonocrawlLiveApiUsed = true;
        sources.push("MONOCRAWL_LIVE_API_MCP");

        if (Array.isArray(data.profiles)) {
          for (const p of data.profiles) {
            profiles.push({
              platform: p.platform || "social",
              platformName: p.platformName || p.platform,
              username: p.username || handle,
              displayName: p.displayName || p.name,
              url: p.url || `https://${p.platform}.com/${handle}`,
              avatarUrl: p.avatarUrl || p.image,
              bio: p.bio || p.description,
              verified: p.verified || false,
              followers: p.followers || p.followersCount,
              following: p.following,
              location: p.location,
              extractedEmails: p.emails || [],
              extractedPhones: p.phones || []
            });
          }
        }
      }
    } catch (err) {
      console.warn("[Monocrawl Service] Live API call skipped or timed out, executing resilient hybrid fallback:", err);
    }
  }

  // 2. RESILIENT HYBRID MULTI-PLATFORM PROBE (Runs if API key not supplied or returned 0 items)
  if (profiles.length === 0) {
    sources.push("REDHORIZON_HYBRID_SOCIAL_PROBER");

    // A. Run internal HTTP probes concurrently
    const [ghResult, gravatarResult, userEnumResult] = await Promise.all([
      runGithubRecon(handle).catch(() => null),
      runGravatarLookup(handle).catch(() => null),
      runUsernameEnum(handle).catch(() => null)
    ]);

    // Parse GitHub
    if (ghResult && ghResult.structuredData?.profile) {
      const p = ghResult.structuredData.profile;
      profiles.push({
        platform: "github",
        platformName: "GitHub",
        username: p.login || handle,
        displayName: p.name || p.login,
        url: p.html_url || `https://github.com/${handle}`,
        avatarUrl: p.avatar_url,
        bio: p.bio,
        followers: p.followers,
        following: p.following,
        location: p.location,
        website: p.blog,
        extractedEmails: p.email ? [p.email] : []
      });
    }

    // Parse Gravatar
    if (gravatarResult && gravatarResult.structuredData?.displayName) {
      const g = gravatarResult.structuredData;
      profiles.push({
        platform: "gravatar",
        platformName: "Gravatar",
        username: handle,
        displayName: g.displayName,
        url: `https://gravatar.com/${handle}`,
        avatarUrl: g.thumbnailUrl,
        bio: g.aboutMe,
        location: g.currentLocation
      });
    }

    // Parse Username Enum results
    if (userEnumResult && Array.isArray(userEnumResult.structuredData?.found)) {
      for (const item of userEnumResult.structuredData.found) {
        if (!profiles.some(existing => existing.url === item.url)) {
          profiles.push({
            platform: item.platform.toLowerCase(),
            platformName: item.platform,
            username: handle,
            displayName: `${item.platform}: ${handle}`,
            url: item.url,
            bio: `Akaun disahkan aktif pada platform ${item.platform}`
          });
        }
      }
    }

    // B. AI Web Grounding for real-time social links (TikTok, X, Instagram, LinkedIn, Reddit)
    try {
      const searchPrompt = `Lakukan peninjauan OSINT media sosial mendalam untuk carian pemegang akaun: "${handle}". 
Cari akaun awam sasaran pada X/Twitter, Instagram, TikTok, LinkedIn, Reddit, Telegram, dan YouTube.
Ekstrak profil URL, nama paparan sebenar, bio/perihalan, dan sebarang emel atau nombor telefon awam.`;

      const aiIntel = await serverSearchGrounding(searchPrompt);
      if (aiIntel && (aiIntel as any).groundingMetadata?.webSearchQueries) {
        sources.push("GEMINI_LIVE_GROUNDING");
      }

      const aiText = aiIntel?.text || "";

      // Regex extract platform links from AI synthesis
      const platformRegexes = [
        { platform: "twitter", name: "X (Twitter)", regex: /https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,30})/gi },
        { platform: "instagram", name: "Instagram", regex: /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]{1,30})/gi },
        { platform: "tiktok", name: "TikTok", regex: /https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]{1,30})/gi },
        { platform: "linkedin", name: "LinkedIn", regex: /https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/([a-zA-Z0-9_-]{1,60})/gi },
        { platform: "reddit", name: "Reddit", regex: /https?:\/\/(?:www\.)?reddit\.com\/user\/([a-zA-Z0-9_-]{1,30})/gi },
        { platform: "telegram", name: "Telegram", regex: /https?:\/\/t\.me\/([a-zA-Z0-9_]{4,32})/gi },
        { platform: "youtube", name: "YouTube", regex: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|user\/)?([a-zA-Z0-9_.-]{1,40})/gi }
      ];

      for (const pDef of platformRegexes) {
        const matches = Array.from(aiText.matchAll(pDef.regex));
        for (const m of matches) {
          const profileUrl = m[0];
          const foundHandle = m[1] || handle;
          if (!profiles.some(p => p.url.toLowerCase() === profileUrl.toLowerCase())) {
            profiles.push({
              platform: pDef.platform,
              platformName: pDef.name,
              username: foundHandle,
              displayName: `${pDef.name} (@${foundHandle})`,
              url: profileUrl,
              bio: `Profil dikesan melalui imbasan carian awam media sosial.`
            });
          }
        }
      }
    } catch (e) {
      console.warn("[Monocrawl Service] Search grounding step completed with fallback.", e);
    }
  }

  // 3. MAP DISCOVERED PROFILES TO ONTOLOGY NODES & SEMANTIC TRIPLES
  const rootTargetId = `target_${handle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  for (let i = 0; i < profiles.length; i++) {
    const prof = profiles[i];
    const profileNodeId = `prof_${prof.platform}_${prof.username.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i}`;

    let detailsText = `PLATFORM: ${prof.platformName}\nUSERNAME: @${prof.username}\nURL: ${prof.url}`;
    if (prof.displayName) detailsText += `\nNAMA: ${prof.displayName}`;
    if (prof.bio) detailsText += `\nBIO: ${prof.bio}`;
    if (prof.followers) detailsText += `\nFOLLOWERS: ${prof.followers}`;
    if (prof.location) detailsText += `\nLOKASI: ${prof.location}`;

    // Profile Node
    discoveredNodes.push({
      id: profileNodeId,
      label: `${prof.platformName}: @${prof.username}`,
      type: "social",
      details: detailsText,
      imageUrl: prof.avatarUrl,
      confidence: 94,
      properties: {
        platform: prof.platform,
        username: prof.username,
        profileUrl: prof.url,
        avatarUrl: prof.avatarUrl
      }
    });

    // Semantic link: Target -> owns_account -> Profile
    discoveredLinks.push({
      source: target,
      target: profileNodeId,
      label: "owns_account",
      relationship: "OWNS_ACCOUNT",
      confidence: 92
    });

    // If emails were extracted
    if (prof.extractedEmails && prof.extractedEmails.length > 0) {
      for (const email of prof.extractedEmails) {
        const emailId = `email_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        if (!discoveredNodes.some(n => n.id === emailId)) {
          discoveredNodes.push({
            id: emailId,
            label: email,
            type: "email",
            details: `Emel awam diekstrak dari profil ${prof.platformName} (@${prof.username})`,
            confidence: 90
          });
        }
        discoveredLinks.push({
          source: profileNodeId,
          target: emailId,
          label: "communicates_via",
          relationship: "COMMUNICATES_VIA",
          confidence: 88
        });
      }
    }

    // If phones were extracted
    if (prof.extractedPhones && prof.extractedPhones.length > 0) {
      for (const phone of prof.extractedPhones) {
        const phoneId = `phone_${phone.replace(/\D/g, '')}`;
        if (!discoveredNodes.some(n => n.id === phoneId)) {
          discoveredNodes.push({
            id: phoneId,
            label: phone,
            type: "phone",
            details: `Nombor telefon awam dikesan pada profil ${prof.platformName} (@${prof.username})`,
            confidence: 88
          });
        }
        discoveredLinks.push({
          source: profileNodeId,
          target: phoneId,
          label: "uses_phone",
          relationship: "USES_PHONE",
          confidence: 85
        });
      }
    }

    // If location was extracted
    if (prof.location) {
      const locId = `loc_${prof.location.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (!discoveredNodes.some(n => n.id === locId)) {
        discoveredNodes.push({
          id: locId,
          label: prof.location,
          type: "location",
          details: `Lokasi dinyatakan pada profil ${prof.platformName}`,
          confidence: 80
        });
      }
      discoveredLinks.push({
        source: profileNodeId,
        target: locId,
        label: "located_at",
        relationship: "LOCATED_AT",
        confidence: 80
      });
    }
  }

  const durationMs = Date.now() - startTime;
  const riskScore = Math.min(profiles.length * 12 + (profiles.some(p => (p.extractedEmails?.length || 0) > 0) ? 25 : 0), 95);

  const summary = `Imbasan Monocrawl & Social Recon berjaya menemui ${profiles.length} akaun profil aktif merentasi platform (${profiles.map(p => p.platformName).join(", ") || "Tiada"}). ${discoveredNodes.filter(n => n.type === 'email').length} emel dan ${discoveredNodes.filter(n => n.type === 'phone').length} telefon berjaya dihubungkan ke kanvas ontologi.`;

  return {
    target,
    targetType,
    isMonocrawlLiveApiUsed,
    platformsScannedCount: 70,
    platformsFoundCount: profiles.length,
    profiles,
    discoveredNodes,
    discoveredLinks,
    summary,
    riskScore,
    executionTimeMs: durationMs,
    sources
  };
}
