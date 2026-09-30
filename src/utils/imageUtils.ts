/**
 * Shared Image Proxy and Utilities for OSINT targets
 */

export const getProxiedImageUrl = (url?: string | null): string | undefined => {
    if (!url || typeof url !== 'string') return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    
    // Data URIs and local server endpoints can be used directly
    if (trimmed.startsWith('data:') || trimmed.startsWith('/api/proxy-image')) {
        return trimmed;
    }
    
    // Route through local server proxy to bypass CORS, anti-hotlinking headers, and strict SSL issues
    return `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
};

export const extractImageUrl = (text?: string | null): string | null => {
    if (!text) return null;
    const cleanText = text.replace(/\\n/g, '\n');
    
    // 1. Explicit tags and labels
    const match = cleanText.match(/(?:IMAGE_URL|URL Gambar Profil|Avatar_URL|Avatar|Gambar|avatar_url|Profile Picture|Image|Photo|URL Gambar|Attached Image \d+):\s*(https?:\/\/[^\s\n"'<>\\]+)/i)
        || cleanText.match(/(https?:\/\/[^\s\n"'<>\\]+\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?[^\s\n"'<>\\]*)?)/i)
        || cleanText.match(/(https?:\/\/[^\s\n"'<>\\]*(?:fbcdn|scontent|googleusercontent|twimg|discordapp|t\.me|wikimedia\.org)[^\s\n"'<>\\]*)/i);
    
    if (match) return match[1] || match[0];

    // 2. Base64 embedded data URI
    const base64Match = cleanText.match(/(data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+)/i);
    if (base64Match) return base64Match[1];

    return null;
};
