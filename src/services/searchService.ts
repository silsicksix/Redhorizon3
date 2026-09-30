
/**
 * SEARCH INTELLIGENCE SERVICE
 * Handles interactions with Tavily AI Search (Advanced Mode)
 */

import { searchWithGeminiGrounding, searchProfileImagesWithGemini, searchTargetVisualMatches } from './geminiService';

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    source: 'tavily' | 'tavily (AI)' | 'gemini (Grounding)';
}

// Social media CDN patterns that indicate authentic profile avatars
const SOCIAL_CDN_DOMAINS = [
    'fbcdn.net',
    'instagram.com',
    'twimg.com',
    'licdn.com',
    'tiktokcdn.com',
    'githubusercontent.com',
    'googleusercontent.com',
    'cdn.discordapp.com',
    'tapatalk.com',
    'wikimedia.org',
    'wikipedia.org'
];

// Domains that usually contain fictional concept art, wallpapers, stock photos, or wiki fanart
const GENERIC_NOISE_DOMAINS = [
    'wallpaper',
    'deviantart',
    'pinterest',
    'shutterstock',
    'freepik',
    'fandom.com',
    'gamepedia',
    'artstation',
    'cleanpng'
];

export const searchTavilyImages = async (query: string, apiKey?: string, maxResults: number = 6): Promise<string[]> => {
    if (!apiKey) {
        const visualRes = await searchTargetVisualMatches(query, { maxResults });
        if (visualRes.imageUrls.length > 0) return visualRes.imageUrls;
        return searchProfileImagesWithGemini(query);
    }

    const url = "https://api.tavily.com/search";
    
    // Construct target-constrained query to prevent generic concept art / game wallpaper hallucinations
    const isProfileQuery = query.toLowerCase().includes("profile") || query.toLowerCase().includes("account") || query.toLowerCase().includes("user");
    const targetQuery = isProfileQuery 
        ? `${query} (site:facebook.com OR site:instagram.com OR site:twitter.com OR site:tiktok.com OR site:linkedin.com)`
        : `${query} profile avatar photo`;
    
    try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

        let response: Response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: targetQuery,
                    search_depth: "basic",
                    include_images: true,
                    max_results: Math.max(maxResults * 2, 10) // Fetch wider pool to filter noise
                }),
                signal: controller?.signal
            });
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }

        if (response.ok) {
            const data = await response.json();
            if (data.images && data.images.length > 0) {
                const rawUrls: string[] = data.images
                    .map((img: any) => typeof img === 'string' ? img : (img?.url || img?.src || ''))
                    .filter((u: string) => typeof u === 'string' && u.startsWith('http'));

                // Filter 1: Exclude generic noise wallpaper/wiki/stock domains
                const cleanedUrls = rawUrls.filter(u => {
                    const lower = u.toLowerCase();
                    return !GENERIC_NOISE_DOMAINS.some(noise => lower.includes(noise));
                });

                // Filter 2: Prioritize authentic Social Media CDN domains
                const socialCdnUrls = cleanedUrls.filter(u => {
                    const lower = u.toLowerCase();
                    return SOCIAL_CDN_DOMAINS.some(cdn => lower.includes(cdn));
                });

                if (socialCdnUrls.length > 0) {
                    return socialCdnUrls.slice(0, maxResults);
                }

                if (cleanedUrls.length > 0) {
                    return cleanedUrls.slice(0, maxResults);
                }
            }
        }
    } catch (e) {
        console.warn("searchTavilyImages warning, falling back to unified visual search:", e);
    }

    const visualRes = await searchTargetVisualMatches(query, { tavilyApiKey: apiKey, maxResults });
    if (visualRes.imageUrls.length > 0) return visualRes.imageUrls;
    return searchProfileImagesWithGemini(query);
};

export const searchTavily = async (query: string, apiKey: string): Promise<SearchResult[]> => {
    if (!apiKey) {
        return searchWithGeminiGrounding(query);
    }

    const url = "https://api.tavily.com/search";
    
    try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

        let response: Response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: query,
                    search_depth: "basic",
                    include_answer: true,
                    include_raw_content: false,
                    max_results: 10
                }),
                signal: controller?.signal
            });
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }

        if (!response.ok) {
            console.warn("Tavily request failed, using Gemini Search Grounding fallback...");
            return searchWithGeminiGrounding(query);
        }

        const data = await response.json();
        
        const results: SearchResult[] = (data.results || []).map((r: any) => ({
            title: r.title,
            link: r.url,
            snippet: r.content,
            source: 'tavily'
        }));

        if (data.answer) {
            results.unshift({
                title: "Tavily AI Intelligence Brief",
                link: "#", 
                snippet: data.answer,
                source: 'tavily (AI)'
            });
        }
        
        return results;
    } catch (e: any) {
        if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
            console.log("Tavily search reached 12s timeout limit, smoothly falling back to Gemini Search Grounding.");
        } else {
            console.warn("searchTavily note, falling back to Gemini Search Grounding:", e?.message || e);
        }
        return searchWithGeminiGrounding(query);
    }
};
