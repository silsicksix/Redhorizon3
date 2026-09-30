import { Node } from '../types';

export interface ExtractedComment {
  id: string;
  snippet: string;
  commentUrl?: string;
  profileUrl?: string;
  timestamp?: string;
  author?: string;
  fbId?: string;
  platform?: string;
}

export interface NodeSocialIntel {
  platform: string;
  brandColor: string;
  profileUrl?: string;
  primaryCommentUrl?: string;
  fbId?: string;
  comments: ExtractedComment[];
  hasDirectCommentLink: boolean;
}

/**
 * Detect platform from URL or string
 */
export function detectPlatformFromUrl(url?: string): string {
  if (!url) return 'web';
  const u = url.toLowerCase();
  if (u.includes('facebook.com') || u.includes('fb.com') || u.includes('fb.watch')) return 'Facebook';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'X (Twitter)';
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'Instagram';
  if (u.includes('tiktok.com')) return 'TikTok';
  if (u.includes('threads.net')) return 'Threads';
  if (u.includes('bsky.app') || u.includes('bsky.social')) return 'Bluesky';
  if (u.includes('reddit.com')) return 'Reddit';
  if (u.includes('linkedin.com')) return 'LinkedIn';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('t.me') || u.includes('telegram.me')) return 'Telegram';
  if (u.includes('pinterest.com') || u.includes('pin.it')) return 'Pinterest';
  return 'Social Media';
}

export function getPlatformBrandColor(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'facebook': return '#1877f2';
    case 'x (twitter)':
    case 'twitter': return '#1da1f2';
    case 'instagram': return '#e1306c';
    case 'tiktok': return '#00f2fe';
    case 'threads': return '#ffffff';
    case 'bluesky': return '#0085ff';
    case 'reddit': return '#ff4500';
    case 'linkedin': return '#0a66c2';
    case 'youtube': return '#ff0000';
    case 'telegram': return '#229ed9';
    default: return '#06b6d4';
  }
}

/**
 * Extracts structured comment snippets and direct comment URLs from a Node
 */
export function extractNodeCommentsAndIntel(node: Node): NodeSocialIntel {
  const details = node.details || '';
  const reports = node.reports || '';
  const fullText = `${details}\n${reports}`;
  
  // 1. Identify Profile URL
  let profileUrl: string | undefined = node.url;
  const profileMatch = fullText.match(/(?:PROFILE_URL|URL Profil|Profile URL|Akaun|Account):\s*(https?:\/\/[^\s\n<]+)/i)
                    || fullText.match(/(https?:\/\/(?:www\.)?(?:facebook\.com|twitter\.com|x\.com|instagram\.com|tiktok\.com|threads\.net|bsky\.app|linkedin\.com)\/[^\s\n<]+)/i);
  if (profileMatch) {
    profileUrl = profileMatch[1];
  } else if (!profileUrl && (node.label.startsWith('http://') || node.label.startsWith('https://'))) {
    profileUrl = node.label;
  }

  // 2. Extract FB ID if present
  let fbId: string | undefined;
  const fbIdMatch = fullText.match(/(?:FB_ID|Facebook ID|ID):\s*(\d+)/i);
  if (fbIdMatch) {
    fbId = fbIdMatch[1];
  }

  // 3. Extract Comment Snippets and respective URLs
  const comments: ExtractedComment[] = [];
  
  // Method A: Multi-comment blocks separated by '---'
  const sections = fullText.split(/\n\s*---\s*\n/);
  
  sections.forEach((sec, idx) => {
    // Check if section has a snippet / comment
    const snippetMatch = sec.match(/(?:Snippet|Komen|Comment|Komentar|POST|Teks|Message):\s*([^\n]+(?:\n[^\n]+)?)/i)
                      || sec.match(/^>\s*([^\n]+(?:\n[^\n]+)?)/m);
    
    const commentUrlMatch = sec.match(/(?:COMMENT_URL|Pautan Komen|URL Komen|Comment URL|Post URL|Source URL|Permalink):\s*(https?:\/\/[^\s\n<]+)/i)
                         || sec.match(/(https?:\/\/[^\s\n<]+(?:\/posts\/|\/permalink\/|\/comment\/|\/comments\/|\/video\/|\/status\/|\?comment_id=|\&comment_id=)[^\s\n<]*)/i);
    
    const timeMatch = sec.match(/(?:Original Time|Captured At|Timestamp|Masa|Tarikh):\s*([^\n]+)/i);
    const authorMatch = sec.match(/(?:Author|Pengarang|User|Nama):\s*([^\n]+)/i);

    if (snippetMatch || commentUrlMatch) {
      const snippetText = snippetMatch ? snippetMatch[1].trim() : (sec.length < 300 ? sec.trim() : '');
      const commentUrl = commentUrlMatch ? commentUrlMatch[1].trim() : undefined;
      const timestamp = timeMatch ? timeMatch[1].trim() : undefined;
      const author = authorMatch ? authorMatch[1].trim() : node.label;

      if (snippetText || commentUrl) {
        comments.push({
          id: `comment_${idx}_${Date.now()}`,
          snippet: snippetText || 'Komentar sasaran yang dikesan.',
          commentUrl: commentUrl,
          profileUrl: profileUrl,
          timestamp: timestamp,
          author: author,
          fbId: fbId,
          platform: detectPlatformFromUrl(commentUrl || profileUrl)
        });
      }
    }
  });

  // Method B: Fallback if no multi-blocks but plain snippet exists in text
  if (comments.length === 0) {
    const singleSnippetMatch = fullText.match(/(?:Snippet|Komen|Comment|Komentar|POST):\s*(.+)/is);
    const singleCommentUrlMatch = fullText.match(/(?:COMMENT_URL|Pautan Komen|URL Komen|Comment URL):\s*(https?:\/\/[^\s\n<]+)/i);
    
    if (singleSnippetMatch || singleCommentUrlMatch) {
      const cUrl = singleCommentUrlMatch ? singleCommentUrlMatch[1].trim() : (node.url && (node.url.includes('/posts/') || node.url.includes('/status/') || node.url.includes('comment')) ? node.url : undefined);
      comments.push({
        id: `comment_0_${Date.now()}`,
        snippet: singleSnippetMatch ? singleSnippetMatch[1].trim().substring(0, 500) : 'Komentar sasaran',
        commentUrl: cUrl,
        profileUrl: profileUrl,
        author: node.label,
        fbId: fbId,
        platform: detectPlatformFromUrl(cUrl || profileUrl)
      });
    }
  }

  // Determine Primary Comment URL (prefer direct comment URL, then source URL)
  let primaryCommentUrl = comments.find(c => c.commentUrl)?.commentUrl;
  if (!primaryCommentUrl) {
    const directUrlMatch = fullText.match(/(?:COMMENT_URL|Source URL):\s*(https?:\/\/[^\s\n<]+)/i);
    if (directUrlMatch) {
      primaryCommentUrl = directUrlMatch[1];
    }
  }

  const detectedPlatform = detectPlatformFromUrl(primaryCommentUrl || profileUrl || node.url);
  const brandColor = getPlatformBrandColor(detectedPlatform);

  return {
    platform: detectedPlatform,
    brandColor,
    profileUrl,
    primaryCommentUrl,
    fbId,
    comments,
    hasDirectCommentLink: Boolean(primaryCommentUrl || comments.some(c => Boolean(c.commentUrl)))
  };
}

/**
 * Safely open external link in new browser tab
 */
export function openExternalUrl(url?: string): boolean {
  if (!url || typeof url !== 'string' || !url.trim()) return false;
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }
  try {
    const win = window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    if (win) win.focus();
    return true;
  } catch (e) {
    console.error('Failed to open external url:', e);
    return false;
  }
}
