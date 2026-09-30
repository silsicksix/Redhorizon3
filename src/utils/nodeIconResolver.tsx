import React from 'react';
import { isLocationNode } from './geoUtils';
import { 
  Phone, Mail, Globe, MapPin, Cpu, ShieldAlert, Database, User, 
  Building2, Coins, MessageSquare, Terminal, Hash, Share2, 
  ExternalLink, Sparkles, AlertCircle, FileCode, CheckCircle2,
  Tv, Video, Radio, Link as LinkIcon, Camera, Compass
} from 'lucide-react';

export type NodeBrandType = 
  | 'telegram'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'twitter'
  | 'tiktok'
  | 'github'
  | 'linkedin'
  | 'reddit'
  | 'discord'
  | 'snapchat'
  | 'pinterest'
  | 'vk'
  | 'twitch'
  | 'threads'
  | 'bluesky'
  | 'medium'
  | 'phone'
  | 'email'
  | 'location'
  | 'domain'
  | 'ip'
  | 'person'
  | 'organization'
  | 'vault'
  | 'crypto'
  | 'telco'
  | 'scammer'
  | 'police'
  | 'hypothesis'
  | 'provenance'
  | 'conflict'
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
  | 'darkweb_forum'
  | 'satellite_imagery'
  | 'deepfake_media'
  | 'chemical_hazard'
  | 'quantum_cipher'
  | 'ai_model_weights'
  | 'anomaly_portal'
  | 'occult_symbol'
  | 'subsea_cable'
  | 'black_budget_project'
  | 'generic';

export interface NodeBrandMeta {
  brand: NodeBrandType;
  brandName: string;
  category: 'social' | 'communication' | 'network' | 'identity' | 'location' | 'data' | 'system' | 'fictional' | 'evidence' | 'tactical';
  brandColor: string;
  bgColor: string;
  borderColor: string;
  svgPath: string; // 24x24 standard viewport SVG path data
  emoji: string;
}

// Crisp standard SVG paths (24x24 coordinate box, viewBox="0 0 24 24")
export const BRAND_SVG_PATHS: Record<NodeBrandType, string> = {
  // Telegram Paper Airplane
  telegram: "M21.6 3.4L2.8 10.7c-1.3.5-1.3 1.3-.2 1.6l4.8 1.5 11.2-7.1c.5-.3 1-.1.6.2L9.6 15.3l-.4 5.3c.5 0 .8-.2 1.1-.5l2.6-2.5 5.4 4c1 .5 1.7.3 2-.9l3.5-16.5c.4-1.5-.5-2.2-1.6-1.8z",
  
  // WhatsApp Speech Bubble + Phone receiver
  whatsapp: "M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zM17.5 15.4c-.23.65-1.33 1.24-1.84 1.32-.47.07-1.07.1-3.13-.75-2.63-1.09-4.32-3.77-4.45-3.95-.13-.18-1.07-1.42-1.07-2.71s.67-1.92.91-2.18c.24-.26.52-.33.7-.33.18 0 .36 0 .52.01.17.01.4-.06.63.48.23.55.79 1.93.86 2.07.07.14.12.31.02.5-.09.19-.14.3-.28.46-.14.16-.29.35-.42.47-.14.13-.28.28-.12.56.16.27.7 1.16 1.5 1.88 1.03.92 1.9 1.2 2.17 1.34.27.13.43.12.59-.07.16-.18.69-.81.87-1.08.19-.28.37-.23.62-.14.25.09 1.58.74 1.85.88.27.14.45.2.52.31.07.11.07.66-.16 1.31z",
  
  // Instagram Camera & Lens
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  
  // Facebook 'f' Logo
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  
  // YouTube Play Button in rounded rectangle
  youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  
  // X (Twitter) Modern Cross
  twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  
  // TikTok Note
  tiktok: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.36a6.34 6.34 0 0 0-.85-.06A6.34 6.34 0 0 0 3.14 15.64a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 4.84 1.4v-3.46a4.85 4.85 0 0 1-1.07 0z",
  
  // GitHub Octocat
  github: "M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z",
  
  // LinkedIn 'in'
  linkedin: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z",
  
  // Reddit Alien
  reddit: "M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.56 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z",
  
  // Discord Gamepad controller
  discord: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z",
  
  // Snapchat Ghost
  snapchat: "M12.03 2c-3.56 0-6.14 2.63-6.14 5.92 0 .61.1 1.21.3 1.77-.38.25-.8.61-.8 1.09 0 .6.56.97 1.15 1.03.11.75.48 2.37 1.96 3.12-.39.42-1.08.76-2.3.93-.65.09-.9.46-.8.85.15.58 1.21.72 2.21.72.67 0 1.48-.07 2.42-.4 1.33.91 2.82.91 4 0 .94.33 1.75.4 2.42.4 1 0 2.06-.14 2.21-.72.1-.39-.15-.76-.8-.85-1.22-.17-1.91-.51-2.3-.93 1.48-.75 1.85-2.37 1.96-3.12.59-.06 1.15-.43 1.15-1.03 0-.48-.42-.84-.8-1.09.2-.56.3-1.16.3-1.77 0-3.29-2.58-5.92-6.14-5.92z",
  
  // Pinterest 'P'
  pinterest: "M12 0a12 12 0 0 0-4.37 23.18c-.05-.98-.1-2.49.02-3.56.11-.98.74-6.27.74-6.27s-.19-.38-.19-.94c0-.88.51-1.54 1.15-1.54.54 0 .8.41.8.89 0 .55-.35 1.36-.53 2.12-.15.64.32 1.16.95 1.16 1.14 0 2.02-1.2 2.02-2.94 0-1.54-1.1-2.61-2.68-2.61-1.83 0-2.9 1.37-2.9 2.78 0 .55.21 1.14.48 1.46.05.06.06.12.04.19-.05.21-.16.65-.18.74-.03.12-.1.17-.23.11-1.04-.48-1.69-2-1.69-3.22 0-2.62 1.9-5.02 5.48-5.02 2.88 0 5.11 2.05 5.11 4.79 0 2.86-1.8 5.16-4.3 5.16-.84 0-1.63-.44-1.9-.96l-.52 1.97c-.19.72-.7 1.62-1.04 2.18A12 12 0 1 0 12 0z",
  
  // VKontakte 'VK'
  vk: "M12 0C5.37 0 0 5.37 0 12c0 6.63 5.37 12 12 12 6.63 0 12-5.37 12-12 0-6.63-5.37-12-12-12zm6.28 13.56c.55.53 1.13 1.03 1.63 1.6.22.25.43.51.6.8.25.42.06.94-.37.96h-2.48c-.64.06-1.14-.2-1.54-.67-.38-.45-.73-.93-1.09-1.4-.15-.19-.31-.37-.52-.48-.34-.18-.63-.09-.8.27-.18.37-.22.78-.24 1.19-.03.52-.2.9-1 .99-1.63.18-3.13-.23-4.48-1.21-1.32-.96-2.29-2.22-3.11-3.62-.77-1.32-1.42-2.7-2-4.1-.14-.33-.04-.52.33-.53h2.51c.23 0 .41.11.51.32.48 1.09 1.07 2.12 1.8 3.06.2.26.41.51.68.7.25.17.47.11.59-.18.15-.36.21-.75.24-1.14.07-.94-.06-1.85-.56-2.65-.29-.46-.16-.68.37-.73h2.61c.42.09.52.28.57.7.08.68.08 1.36.01 2.04-.03.3.09.6.35.73.2.1.37.02.51-.12.44-.45.77-.99 1.07-1.55.43-.8.77-1.64 1.08-2.5.08-.23.23-.37.49-.37h2.72c.08 0 .16 0 .24.03.42.13.52.35.39.77-.32.99-.88 1.83-1.48 2.65-.49.68-1.02 1.32-1.51 2-.23.32-.22.51.04.81.42.48.88.93 1.35 1.38z",
  
  // Twitch Glitch
  twitch: "M2.149 0l-1.612 4.119v16.474h5.497v3.407h3.57l3.297-3.407h4.945l5.626-5.626v-14.967h-21.323zm18.577 13.597l-3.297 3.297h-5.497l-3.297 3.297v-3.297h-4.397v-14.145h16.488v10.848zm-10.435-6.59h2.198v6.59h-2.198v-6.59zm6.04 0h2.198v6.59h-2.198v-6.59z",
  
  // Threads / Bluesky / Medium
  threads: "M12.002 2C6.48 2 2 6.48 2 12s4.48 10 10.002 10c3.08 0 5.86-1.4 7.74-3.61l-1.82-1.39C16.46 18.58 14.34 19.5 12.002 19.5c-4.14 0-7.5-3.36-7.5-7.5s3.36-7.5 7.5-7.5c3.82 0 7.02 2.87 7.45 6.57h-7.45v2.5h10c.03-.52.05-1.04.05-1.57 0-5.52-4.48-10-10.002-10z",
  bluesky: "M12 10.8c-1.78-2.9-4.88-5.3-7.5-6.8C2.1 2.6.5 4.3.5 6.8c0 5.4 3.7 9.8 7.3 12.2 1.4 1 2.8 1.9 4.2 2.8 1.4-.9 2.8-1.8 4.2-2.8 3.6-2.4 7.3-6.8 7.3-12.2 0-2.5-1.6-4.2-4-2.8-2.62 1.5-5.72 3.9-7.5 6.8z",
  medium: "M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z",

  // Phone / Smartphone receiver
  phone: "M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",

  // Email Mail envelope
  email: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",

  // Location Map Pin
  location: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",

  // Domain Globe
  domain: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",

  // Server / IP Microchip
  ip: "M4 6h16v12H4z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4",

  // Person Avatar
  person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",

  // Organization / Building
  organization: "M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z",

  // Vault / Darkweb Database Shield
  vault: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z",

  // Cryptocurrency / Bitcoin
  crypto: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15.5v-1.1c1.37-.2 2.5-1.12 2.5-2.4 0-1.47-1.17-2.14-2.5-2.4v-3.1c.62.15 1.15.56 1.4 1.16l1.37-.58C15.34 7.82 14.28 7 13 6.6V5.5h-2v1.1c-1.39.2-2.5 1.1-2.5 2.4 0 1.47 1.17 2.14 2.5 2.4v3.1c-.62-.15-1.15-.56-1.4-1.16l-1.37.58c.43 1.26 1.49 2.08 2.77 2.48v1.1h2z",

  // Telco Tower / Radio Mast
  telco: "M12 2l-3 18h2l.6-3.6h4.8l.6 3.6h2L12 2zm-1.8 12.4l1.8-10.8 1.8 10.8h-3.6zM4.9 6.9a9.9 9.9 0 0 1 14.2 0l-1.4 1.4a7.9 7.9 0 0 0-11.4 0L4.9 6.9zm2.8 2.8a5.9 5.9 0 0 1 8.6 0l-1.4 1.4a3.9 3.9 0 0 0-5.8 0L7.7 9.7z",

  // Scammer / Pig Face / Babi Icon
  scammer: "M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zM5.5 6a2 2 0 0 1 3.5-1.4L10 6H5.5zm13 0H14l1-1.4a2 2 0 0 1 3.5 1.4zM7.5 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm9 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-4.5 3c2.2 0 4 1.34 4 3s-1.8 3-4 3-4-1.34-4-3 1.8-3 4-3zm-1.5 2a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm3 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z",

  // Police Shield / Polis / PDRM / CCID
  police: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 3.2l6 2.67V11c0 4.19-2.83 8.11-6 9.17-3.17-1.06-6-4.98-6-9.17V6.87l6-2.67zM12 7l1.45 2.94 3.25.47-2.35 2.29.55 3.24L12 14.4l-2.91 1.53.55-3.24-2.35-2.29 3.25-.47L12 7z",

  // AI Hypothesis / Decision / Semantica Inference Node (Neural Hexagon & Sparkle)
  hypothesis: "M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.24l6.75 3.75-2.8 1.56-6.75-3.75L12 4.24zM5.25 8.57L11 11.77v7.49L5.25 16.06V8.57zm7.75 10.69v-7.49l6-3.33v7.49l-6 3.33zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",

  // Provenance / Evidence Chain
  provenance: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h2v14H4z",

  // Conflict / Anomaly Warning Icon
  conflict: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",

  // 1. Fictional Character (Fantasy Avatar / Superhero Cloak / Persona)
  fictional_character: "M12 2a4.5 4.5 0 0 0-4.5 4.5c0 1.9 1.2 3.5 2.9 4.2C6.8 11.6 4 14.5 4 18.2V21a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.8c0-3.7-2.8-6.6-6.4-7.5 1.7-.7 2.9-2.3 2.9-4.2A4.5 4.5 0 0 0 12 2zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm-6 16c.5-2.6 2.8-4.5 6-4.5s5.5 1.9 6 4.5H6z",

  // 2. Fictional Object / Artifact / Relic (Magic Crystal Gem)
  fictional_object: "M12 2l4.8 7.2L22 12l-5.2 2.8L12 22l-4.8-7.2L2 12l5.2-2.8L12 2zm0 3.8L8.6 11l-3.4 1 3.4 1 3.4 5.2 3.4-5.2 3.4-1-3.4-1L12 5.8z",

  // 3. Found Footage (VHS Video Tape / Analog Reel)
  found_footage: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm4 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm10 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-10 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm10 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-7 7h4v2h-4v-2z",

  // 4. Cryptid & Mythological Entity (Mystery Monster / Alien Eye)
  cryptid_myth: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 3c3.9 0 7 3.1 7 7s-3.1 7-7 7-7-3.1-7-7 3.1-7 7-7zm-4 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-4 4c-2.2 0-4 1.3-4 3h8c0-1.7-1.8-3-4-3z",

  // 5. Weapon & Tactical Hardware (Combat Crosshair & Blade)
  weapon_hardware: "M12 1a1 1 0 0 1 1 1v2.07A8.004 8.004 0 0 1 19.93 11H22a1 1 0 0 1 0 2h-2.07A8.004 8.004 0 0 1 13 19.93V22a1 1 0 0 1-2 0v-2.07A8.004 8.004 0 0 1 4.07 13H2a1 1 0 0 1 0-2h2.07A8.004 8.004 0 0 1 11 4.07V2a1 1 0 0 1 1-1zm0 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",

  // 6. Malware & Exploit Payload (Hacker Virus Bug)
  malware_payload: "M19 8h-1.81a5.985 5.985 0 0 0-1.82-2.55l1.34-1.34a1 1 0 0 0-1.42-1.42l-1.63 1.63A6.04 6.04 0 0 0 12 4c-.58 0-1.14.07-1.66.21L8.71 2.58a1 1 0 1 0-1.42 1.42l1.34 1.34A5.985 5.985 0 0 0 6.81 8H5a1 1 0 0 0 0 2h1.08c-.05.33-.08.66-.08 1v1H4a1 1 0 0 0 0 2h2v1c0 .34.03.67.08 1H5a1 1 0 0 0 0 2h1.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H19a1 1 0 0 0 0-2h-1.08c.05-.33.08-.66.08-1v-1h2a1 1 0 0 0 0-2h-2v-1c0-.34-.03-.67-.08-1H19a1 1 0 0 0 0-2zm-9 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z",

  // 7. Biometric Evidence (DNA & Fingerprint Forensics)
  biometric_evidence: "M12 2a10 10 0 0 0-10 10c0 3.3 1.6 6.3 4.1 8.1l1.2-1.6A8 8 0 0 1 4 12a8 8 0 0 1 16 0c0 2.6-1.3 5-3.3 6.5l1.2 1.6A10 10 0 0 0 22 12a10 10 0 0 0-10-10zm0 4a6 6 0 0 0-6 6c0 1.8.8 3.5 2.1 4.6l1.3-1.5A4 4 0 0 1 8 12a4 4 0 0 1 8 0c0 1.2-.5 2.3-1.4 3.1l1.3 1.5A6 6 0 0 0 18 12a6 6 0 0 0-6-6zm0 4a2 2 0 0 0-2 2c0 .6.3 1.1.7 1.5l1.3-1.5V12h-2a2 2 0 0 1 2-2z",

  // 8. Surveillance Device (CCTV Camera & IoT Sensor)
  surveillance_device: "M3 5h14l4 4-2 3-3-2v7H3V5zm2 2v8h8V9.5L16 11l1-1.5-3-3H5zm14 12H1v2h18v-2z",

  // 9. Broadcast Frequency (Radio Tower / RF Signal)
  broadcast_frequency: "M12 2a2 2 0 0 0-2 2c0 .7.4 1.4 1 1.7V17l-3 5h2l2-3.3 2 3.3h2l-3-5V5.7c.6-.3 1-1 1-1.7a2 2 0 0 0-2-2zm-5 4a7 7 0 0 0 0 10l1.4-1.4a5 5 0 0 1 0-7.2L7 6zm10 0l-1.4 1.4a5 5 0 0 1 0 7.2l1.4 1.4a7 7 0 0 0 0-10z",

  // 10. Classified Dossier (Top Secret Document & Leaked File)
  classified_dossier: "M6 2h9l5 5v15H6V2zm2 2v16h10V8h-4V4H8zm4 7a2 2 0 0 1 2 2v1h1v4h-6v-4h1v-1a2 2 0 0 1 2-2zm0 1.5c-.3 0-.5.2-.5.5v1h1v-1c0-.3-.2-.5-.5-.5z",

  // 11. Financial Instrument (Offshore Account / Mule Ledger)
  financial_instrument: "M12 2L2 7v2h20V7L12 2zm-8 8v8h3v-8H4zm6 0v8h4v-8h-4zm7 0v8h3v-8h-3zM2 20v2h20v-2H2z",

  // 12. Darkweb Forum & Underground Marketplace
  darkweb_forum: "M12 1a11 11 0 1 0 11 11A11.013 11.013 0 0 0 12 1zm0 3a8 8 0 1 1-8 8 8.009 8.009 0 0 1 8-8zm-4 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-7.9 6a6.002 6.002 0 0 0 7.8 0 1 1 0 0 0-1.4-1.4 4.001 4.001 0 0 1-5 0 1 1 0 0 0-1.4 1.4z",

  // 13. Satellite Imagery & Earth Observation
  satellite_imagery: "M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5zm0 2h14v14H5V5zm7 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",

  // 14. Deepfake Media & Visual Synthetics
  deepfake_media: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-7 4.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z",

  // 15. Chemical Hazard & CBRN Materials
  chemical_hazard: "M12 2a1 1 0 0 0-.894.553l-7 14A1 1 0 0 0 5 18h14a1 1 0 0 0 .894-1.447l-7-14A1 1 0 0 0 12 2zm0 3.236L17.382 16H6.618L12 5.236zM11 9h2v4h-2V9zm0 5h2v2h-2v-2z",

  // 16. Quantum Encryption Cipher Key
  quantum_cipher: "M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",

  // 17. AI Model Weights & Autonomous Neural Network
  ai_model_weights: "M12 2a2 2 0 0 0-2 2v2H8a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v2a2 2 0 0 0 2 2h2v2a2 2 0 0 0 4 0v-2h2a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2zm0 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-4 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm8 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-4 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z",

  // 18. Anomaly Portal & Spatiotemporal Anomaly
  anomaly_portal: "M12 2A10 10 0 1 0 22 12 10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6.006 6.006 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4.005 4.005 0 0 1-4 4z",

  // 19. Occult Symbol & Sacred Lore
  occult_symbol: "M12 2L2 22h20L12 2zm0 4.5l6.5 13H5.5L12 6.5zm0 3.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z",

  // 20. Subsea Fiber Cable & Pipeline
  subsea_cable: "M2 12h3l3-7 4 14 3-9 2 4h5v2h-4l-3-6-3 9-4-14-2 4H2v-2z",

  // 21. Black Budget Special Operations Project
  black_budget_project: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4a4 4 0 1 1-4 4 4 4 0 0 1 4-4zm0 9c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z",

  // Generic Entity node
  generic: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
};

/**
 * Enhanced brand & node type detection engine.
 * Inspects node type, label, url, and details to pinpoint the exact social media brand or entity type.
 */
export function resolveNodeBrandOrType(node: { 
  type?: string; 
  label?: string; 
  details?: string; 
  url?: string; 
  vaultMatch?: boolean;
}): NodeBrandMeta {
  const type = (node.type || '').toLowerCase().trim();
  const label = (node.label || '').toLowerCase().trim();
  const details = (node.details || '').toLowerCase().trim();
  const url = (node.url || '').toLowerCase().trim();
  const combined = `${type} ${label} ${details} ${url}`;

  // Vault / Database Match
  if (node.vaultMatch || type === 'vault' || type === 'breach' || type === 'leak' || combined.includes('darkweb') || combined.includes('breach directory')) {
    return {
      brand: 'vault',
      brandName: 'Pangkalan Data / Vault',
      category: 'data',
      brandColor: '#f59e0b', // Amber
      bgColor: '#451a03',
      borderColor: '#f59e0b',
      svgPath: BRAND_SVG_PATHS.vault,
      emoji: '🗄️'
    };
  }

  // SEMANTICA HYPOTHESIS / AI INFERENCE / DECISION PROVENANCE
  if (
    type === 'hypothesis' ||
    type === 'ai_inference' ||
    type === 'decision' ||
    type === 'provenance' ||
    type === 'deduction' ||
    combined.includes('hipotesis') ||
    combined.includes('keputusan ai') ||
    combined.includes('inference') ||
    combined.includes('semantica')
  ) {
    return {
      brand: 'hypothesis',
      brandName: 'Nod Keputusan & Salasilah AI',
      category: 'system',
      brandColor: '#a855f7', // Vivid Purple Neon
      bgColor: '#3b0764',
      borderColor: '#c084fc',
      svgPath: BRAND_SVG_PATHS.hypothesis,
      emoji: '🔮'
    };
  }

  // CONFLICT / ANOMALY NODE
  if (
    type === 'conflict' ||
    type === 'anomaly' ||
    type === 'contradiction' ||
    combined.includes('percanggahan') ||
    combined.includes('anomali')
  ) {
    return {
      brand: 'conflict',
      brandName: 'Nod Percanggahan & Anomali',
      category: 'system',
      brandColor: '#ef4444', // Red Warning
      bgColor: '#450a0a',
      borderColor: '#f87171',
      svgPath: BRAND_SVG_PATHS.conflict,
      emoji: '⚠️'
    };
  }

  // POLIS / PDRM / CCID
  if (
    type === 'police' || 
    type === 'polis' || 
    type === 'pdrm' || 
    type === 'ccid' ||
    combined.includes('polis') || 
    combined.includes('pdrm') || 
    combined.includes('ccid') || 
    combined.includes('jsjk') || 
    combined.includes('police') || 
    combined.includes('cop') ||
    combined.includes('pegawai polis') ||
    combined.includes('balai polis')
  ) {
    return {
      brand: 'police',
      brandName: 'Polis / PDRM / CCID',
      category: 'identity',
      brandColor: '#3b82f6', // Police Royal Blue
      bgColor: '#1e3a8a',
      borderColor: '#2563eb',
      svgPath: BRAND_SVG_PATHS.police,
      emoji: '👮'
    };
  }

  // SCAMMER / SCAM / FRAUD (Ikon Babi)
  if (
    type === 'scammer' || 
    type === 'scam' || 
    type === 'fraud' ||
    combined.includes('scammer') || 
    combined.includes('scam') || 
    combined.includes('penipu') || 
    combined.includes('fraudster') ||
    combined.includes('scamming')
  ) {
    return {
      brand: 'scammer',
      brandName: 'Scammer / Suspek Fraud',
      category: 'identity',
      brandColor: '#ec4899', // Hot Pink Piggy Color
      bgColor: '#831843',
      borderColor: '#db2777',
      svgPath: BRAND_SVG_PATHS.scammer,
      emoji: '🐖'
    };
  }

  // TELCO / TOWER / CARRIER (Menara Telco)
  if (
    type === 'telco' || 
    type === 'carrier' || 
    type === 'telecom' || 
    type === 'tower' ||
    combined.includes('telco') || 
    combined.includes('telecom') || 
    combined.includes('menara telco') || 
    combined.includes('celcom') || 
    combined.includes('digi') || 
    combined.includes('maxis') || 
    combined.includes('umobile') || 
    combined.includes('unifi') || 
    combined.includes('yoodo') || 
    combined.includes('yes 5g') || 
    combined.includes('base station')
  ) {
    return {
      brand: 'telco',
      brandName: 'Menara Telco / Telekomunikasi',
      category: 'network',
      brandColor: '#06b6d4', // Cyan Telco
      bgColor: '#164e63',
      borderColor: '#0891b2',
      svgPath: BRAND_SVG_PATHS.telco,
      emoji: '📡'
    };
  }

  // 1. TELEGRAM
  if (
    type === 'telegram' || 
    type === 'tg' || 
    url.includes('t.me/') || 
    url.includes('telegram.me/') || 
    url.includes('telegram.org') || 
    combined.includes('telegram') ||
    combined.includes('t.me') ||
    label.startsWith('@') && (combined.includes('bot') || combined.includes('channel') || combined.includes('group'))
  ) {
    return {
      brand: 'telegram',
      brandName: 'Telegram',
      category: 'social',
      brandColor: '#229ed9', // Telegram Blue
      bgColor: '#082f49',
      borderColor: '#0284c7',
      svgPath: BRAND_SVG_PATHS.telegram,
      emoji: '✈️'
    };
  }

  // 2. WHATSAPP
  if (
    type === 'whatsapp' || 
    type === 'wa' || 
    url.includes('wa.me/') || 
    url.includes('api.whatsapp.com') || 
    url.includes('chat.whatsapp.com') || 
    combined.includes('whatsapp') ||
    combined.includes('wa.me')
  ) {
    return {
      brand: 'whatsapp',
      brandName: 'WhatsApp',
      category: 'communication',
      brandColor: '#25d366', // WhatsApp Green
      bgColor: '#052e16',
      borderColor: '#16a34a',
      svgPath: BRAND_SVG_PATHS.whatsapp,
      emoji: '💬'
    };
  }

  // 3. INSTAGRAM & THREADS
  if (
    type === 'instagram' || 
    type === 'ig' || 
    url.includes('instagram.com/') || 
    url.includes('instagr.am/') || 
    combined.includes('instagram') ||
    combined.includes('instagr.am')
  ) {
    return {
      brand: 'instagram',
      brandName: 'Instagram',
      category: 'social',
      brandColor: '#e1306c', // Instagram Pink
      bgColor: '#4a044e',
      borderColor: '#c026d3',
      svgPath: BRAND_SVG_PATHS.instagram,
      emoji: '📸'
    };
  }

  if (type === 'threads' || url.includes('threads.net') || combined.includes('threads.net')) {
    return {
      brand: 'threads',
      brandName: 'Threads',
      category: 'social',
      brandColor: '#ffffff',
      bgColor: '#18181b',
      borderColor: '#71717a',
      svgPath: BRAND_SVG_PATHS.threads,
      emoji: '🧵'
    };
  }

  // 4. FACEBOOK
  if (
    type === 'facebook' || 
    type === 'fb' || 
    url.includes('facebook.com/') || 
    url.includes('fb.me/') || 
    url.includes('fb.com/') || 
    combined.includes('facebook') ||
    combined.includes('fb.me')
  ) {
    return {
      brand: 'facebook',
      brandName: 'Facebook',
      category: 'social',
      brandColor: '#1877f2', // Facebook Blue
      bgColor: '#172554',
      borderColor: '#2563eb',
      svgPath: BRAND_SVG_PATHS.facebook,
      emoji: '👤'
    };
  }

  // 5. YOUTUBE
  if (
    type === 'youtube' || 
    type === 'yt' || 
    url.includes('youtube.com/') || 
    url.includes('youtu.be/') || 
    combined.includes('youtube') ||
    combined.includes('youtu.be')
  ) {
    return {
      brand: 'youtube',
      brandName: 'YouTube',
      category: 'social',
      brandColor: '#ff0000', // YouTube Red
      bgColor: '#450a0a',
      borderColor: '#dc2626',
      svgPath: BRAND_SVG_PATHS.youtube,
      emoji: '▶️'
    };
  }

  // 6. X / TWITTER
  if (
    type === 'twitter' || 
    type === 'x' || 
    type === 'tweet' || 
    url.includes('twitter.com/') || 
    url.includes('x.com/') || 
    url.includes('t.co/') || 
    combined.includes('twitter.com') ||
    combined.includes('x.com') ||
    combined.includes('tweet')
  ) {
    return {
      brand: 'twitter',
      brandName: 'X (Twitter)',
      category: 'social',
      brandColor: '#1da1f2', // Twitter / X Blue
      bgColor: '#082f49',
      borderColor: '#0284c7',
      svgPath: BRAND_SVG_PATHS.twitter,
      emoji: '𝕏'
    };
  }

  // 7. TIKTOK
  if (
    type === 'tiktok' || 
    type === 'tt' || 
    url.includes('tiktok.com/') || 
    combined.includes('tiktok')
  ) {
    return {
      brand: 'tiktok',
      brandName: 'TikTok',
      category: 'social',
      brandColor: '#00f2fe', // TikTok Cyan/Pink
      bgColor: '#042f2e',
      borderColor: '#0d9488',
      svgPath: BRAND_SVG_PATHS.tiktok,
      emoji: '🎵'
    };
  }

  // 8. GITHUB
  if (
    type === 'github' || 
    type === 'git' || 
    url.includes('github.com/') || 
    url.includes('gist.github.com') || 
    combined.includes('github.com') ||
    combined.includes('github repo')
  ) {
    return {
      brand: 'github',
      brandName: 'GitHub',
      category: 'social',
      brandColor: '#f0f6fc', // GitHub Off-White
      bgColor: '#18181b',
      borderColor: '#52525b',
      svgPath: BRAND_SVG_PATHS.github,
      emoji: '🐙'
    };
  }

  // 9. LINKEDIN
  if (
    type === 'linkedin' || 
    type === 'li' || 
    url.includes('linkedin.com/') || 
    combined.includes('linkedin')
  ) {
    return {
      brand: 'linkedin',
      brandName: 'LinkedIn',
      category: 'social',
      brandColor: '#0a66c2', // LinkedIn Blue
      bgColor: '#0c4a6e',
      borderColor: '#0284c7',
      svgPath: BRAND_SVG_PATHS.linkedin,
      emoji: '💼'
    };
  }

  // 10. REDDIT
  if (
    type === 'reddit' || 
    url.includes('reddit.com/') || 
    url.includes('redd.it/') || 
    label.startsWith('r/') || 
    label.startsWith('u/') || 
    combined.includes('reddit')
  ) {
    return {
      brand: 'reddit',
      brandName: 'Reddit',
      category: 'social',
      brandColor: '#ff4500', // Reddit Orange
      bgColor: '#431407',
      borderColor: '#ea580c',
      svgPath: BRAND_SVG_PATHS.reddit,
      emoji: '🤖'
    };
  }

  // 11. DISCORD
  if (
    type === 'discord' || 
    url.includes('discord.com/') || 
    url.includes('discord.gg/') || 
    combined.includes('discord')
  ) {
    return {
      brand: 'discord',
      brandName: 'Discord',
      category: 'social',
      brandColor: '#5865f2', // Discord Blurple
      bgColor: '#1e1b4b',
      borderColor: '#4f46e5',
      svgPath: BRAND_SVG_PATHS.discord,
      emoji: '🎮'
    };
  }

  // 12. PINTEREST
  if (type === 'pinterest' || url.includes('pinterest.com') || url.includes('pin.it') || combined.includes('pinterest')) {
    return {
      brand: 'pinterest',
      brandName: 'Pinterest',
      category: 'social',
      brandColor: '#e60023',
      bgColor: '#450a0a',
      borderColor: '#dc2626',
      svgPath: BRAND_SVG_PATHS.pinterest,
      emoji: '📌'
    };
  }

  // 13. SNAPCHAT
  if (type === 'snapchat' || url.includes('snapchat.com') || combined.includes('snapchat')) {
    return {
      brand: 'snapchat',
      brandName: 'Snapchat',
      category: 'social',
      brandColor: '#fffc00',
      bgColor: '#422006',
      borderColor: '#ca8a04',
      svgPath: BRAND_SVG_PATHS.snapchat,
      emoji: '👻'
    };
  }

  // 14. VK
  if (type === 'vk' || url.includes('vk.com') || combined.includes('vkontakte') || combined.includes('vk.com')) {
    return {
      brand: 'vk',
      brandName: 'VKontakte',
      category: 'social',
      brandColor: '#4c75a3',
      bgColor: '#0f172a',
      borderColor: '#38bdf8',
      svgPath: BRAND_SVG_PATHS.vk,
      emoji: '🔷'
    };
  }

  // 15. TWITCH
  if (type === 'twitch' || url.includes('twitch.tv') || combined.includes('twitch')) {
    return {
      brand: 'twitch',
      brandName: 'Twitch',
      category: 'social',
      brandColor: '#9146ff',
      bgColor: '#2e1065',
      borderColor: '#7c3aed',
      svgPath: BRAND_SVG_PATHS.twitch,
      emoji: '👾'
    };
  }

  // 16. BLUESKY
  if (type === 'bluesky' || url.includes('bsky.app') || url.includes('bsky.social') || combined.includes('bluesky')) {
    return {
      brand: 'bluesky',
      brandName: 'Bluesky',
      category: 'social',
      brandColor: '#0285ff',
      bgColor: '#082f49',
      borderColor: '#0284c7',
      svgPath: BRAND_SVG_PATHS.bluesky,
      emoji: '🦋'
    };
  }

  // 17. GENERIC SOCIAL
  if (type === 'social') {
    return {
      brand: 'instagram', // Default friendly social icon
      brandName: 'Akaun Media Sosial',
      category: 'social',
      brandColor: '#3b82f6',
      bgColor: '#172554',
      borderColor: '#2563eb',
      svgPath: BRAND_SVG_PATHS.instagram,
      emoji: '🌐'
    };
  }

  // 18. PHONE / NOMBOR TELEFON
  const isPhoneNumberPattern = /^(\+?\d{1,4}[-\s]?)?(\(?\d{2,5}\)?[-\s]?)?\d{3,5}[-\s]?\d{3,5}$/.test(label.replace(/\s+/g, '')) && label.replace(/\D/g, '').length >= 7;
  if (
    type === 'phone' || 
    type === 'telephone' || 
    type === 'mobile' || 
    type === 'tel' || 
    type === 'carrier' ||
    combined.includes('nombor telefon') || 
    combined.includes('phone number') ||
    combined.includes('truecaller') ||
    isPhoneNumberPattern
  ) {
    return {
      brand: 'phone',
      brandName: 'Nombor Telefon',
      category: 'communication',
      brandColor: '#a855f7', // Purple/Violet
      bgColor: '#3b0764',
      borderColor: '#9333ea',
      svgPath: BRAND_SVG_PATHS.phone,
      emoji: '📱'
    };
  }

  // 19. EMAIL
  const isEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(label) || label.includes('@');
  if (type === 'email' || type === 'mail' || isEmailPattern || combined.includes('email address')) {
    return {
      brand: 'email',
      brandName: 'Alamat E-mel',
      category: 'communication',
      brandColor: '#eab308', // Amber / Yellow
      bgColor: '#422006',
      borderColor: '#ca8a04',
      svgPath: BRAND_SVG_PATHS.email,
      emoji: '✉️'
    };
  }

  // 20. LOCATION / GPS / ADDRESS
  if (
    type === 'location' || 
    type === 'address' || 
    type === 'gps' || 
    type === 'geo' || 
    type === 'place' ||
    type === 'site' ||
    type === 'checkpoint' ||
    type === 'waypoint' ||
    isLocationNode(node)
  ) {
    return {
      brand: 'location',
      brandName: 'Lokasi / Geospatial',
      category: 'location',
      brandColor: '#f97316', // Orange
      bgColor: '#431407',
      borderColor: '#ea580c',
      svgPath: BRAND_SVG_PATHS.location,
      emoji: '📍'
    };
  }

  // 21. DOMAIN / WEBSITE / URL
  if (
    type === 'domain' || 
    type === 'web' || 
    type === 'url' || 
    type === 'website' || 
    url.startsWith('http') || 
    label.endsWith('.com') || 
    label.endsWith('.org') || 
    label.endsWith('.net') || 
    label.endsWith('.my') || 
    label.endsWith('.io') ||
    label.endsWith('.gov')
  ) {
    return {
      brand: 'domain',
      brandName: 'Laman Web / Domain',
      category: 'network',
      brandColor: '#0ea5e9', // Sky Blue
      bgColor: '#082f49',
      borderColor: '#0284c7',
      svgPath: BRAND_SVG_PATHS.domain,
      emoji: '🌐'
    };
  }

  // 22. IP ADDRESS / SERVER
  const isIpPattern = /^(\d{1,3}\.){3}\d{1,3}$/.test(label) || /^[0-9a-fA-F:]{7,39}$/.test(label);
  if (type === 'ip' || type === 'server' || type === 'host' || type === 'dns' || isIpPattern) {
    return {
      brand: 'ip',
      brandName: 'IP / Pelayan (Server)',
      category: 'network',
      brandColor: '#8b5cf6', // Violet
      bgColor: '#2e1065',
      borderColor: '#7c3aed',
      svgPath: BRAND_SVG_PATHS.ip,
      emoji: '🖥️'
    };
  }

  // 23. CRYPTOCURRENCY / WALLET
  if (
    type === 'crypto' || 
    type === 'wallet' || 
    type === 'bitcoin' || 
    type === 'btc' || 
    type === 'eth' || 
    type === 'usdt' || 
    combined.includes('crypto wallet') ||
    combined.includes('blockchain')
  ) {
    return {
      brand: 'crypto',
      brandName: 'Dompet Kripto / Wallet',
      category: 'data',
      brandColor: '#f59e0b',
      bgColor: '#451a03',
      borderColor: '#d97706',
      svgPath: BRAND_SVG_PATHS.crypto,
      emoji: '🪙'
    };
  }

  // 24. ORGANIZATION / COMPANY / SSM
  if (
    type === 'organization' || 
    type === 'company' || 
    type === 'corp' || 
    type === 'ssm' || 
    type === 'agency' || 
    combined.includes('sdn bhd') || 
    combined.includes('berhad') || 
    combined.includes('llc') || 
    combined.includes('inc.') ||
    combined.includes('syarikat')
  ) {
    return {
      brand: 'organization',
      brandName: 'Syarikat / Organisasi',
      category: 'identity',
      brandColor: '#6366f1', // Indigo
      bgColor: '#1e1b4b',
      borderColor: '#4f46e5',
      svgPath: BRAND_SVG_PATHS.organization,
      emoji: '🏢'
    };
  }

  // 25. FICTIONAL CHARACTER / WATAK FIKSYEN
  if (
    type === 'fictional_character' ||
    type === 'fiction_character' ||
    type === 'character' ||
    type === 'npc' ||
    type === 'myth_character' ||
    type === 'persona' ||
    combined.includes('fictional character') ||
    combined.includes('watak fiksyen') ||
    combined.includes('anime') ||
    combined.includes('tokoh mitos') ||
    combined.includes('superhero')
  ) {
    return {
      brand: 'fictional_character',
      brandName: 'Watak Fiksyen / Persona',
      category: 'fictional',
      brandColor: '#ec4899', // Pink Neon
      bgColor: '#500724',
      borderColor: '#db2777',
      svgPath: BRAND_SVG_PATHS.fictional_character,
      emoji: '🧙'
    };
  }

  // 26. FICTIONAL OBJECT / ARTIFAK FIKSYEN
  if (
    type === 'fictional_object' ||
    type === 'fiction_object' ||
    type === 'artifact' ||
    type === 'relic' ||
    type === 'magic_item' ||
    combined.includes('fictional object') ||
    combined.includes('artifak fiksyen') ||
    combined.includes('relic') ||
    combined.includes('magic item') ||
    combined.includes('prop sci-fi')
  ) {
    return {
      brand: 'fictional_object',
      brandName: 'Objek / Artifak Fiksyen',
      category: 'fictional',
      brandColor: '#d946ef', // Fuchsia
      bgColor: '#4a044e',
      borderColor: '#c026d3',
      svgPath: BRAND_SVG_PATHS.fictional_object,
      emoji: '💎'
    };
  }

  // 27. FOUND FOOTAGE / RAKAMAN FORENSIK (VHS / CCTV / TAPE)
  if (
    type === 'found_footage' ||
    type === 'footage' ||
    type === 'vhs' ||
    type === 'cctv_clip' ||
    type === 'audio_tape' ||
    type === 'media_artifact' ||
    combined.includes('found footage') ||
    combined.includes('rakaman vhs') ||
    combined.includes('cctv footage') ||
    combined.includes('pita rakaman') ||
    combined.includes('bodycam')
  ) {
    return {
      brand: 'found_footage',
      brandName: 'Rakaman Dijumpai (Found Footage)',
      category: 'evidence',
      brandColor: '#f43f5e', // Rose Red
      bgColor: '#4c0519',
      borderColor: '#e11d48',
      svgPath: BRAND_SVG_PATHS.found_footage,
      emoji: '📼'
    };
  }

  // 28. CRYPTID & MYTH / MAKHLUK MISTERI
  if (
    type === 'cryptid_myth' ||
    type === 'cryptid' ||
    type === 'myth' ||
    type === 'anomaly_entity' ||
    type === 'scp' ||
    combined.includes('cryptid') ||
    combined.includes('makhluk misteri') ||
    combined.includes('legenda urban') ||
    combined.includes('bigfoot') ||
    combined.includes('wendigo')
  ) {
    return {
      brand: 'cryptid_myth',
      brandName: 'Kriptid & Entiti Anomali',
      category: 'identity',
      brandColor: '#06b6d4', // Cyan
      bgColor: '#083344',
      borderColor: '#0891b2',
      svgPath: BRAND_SVG_PATHS.cryptid_myth,
      emoji: '👁️'
    };
  }

  // 29. WEAPON & TACTICAL HARDWARE
  if (
    type === 'weapon_hardware' ||
    type === 'weapon' ||
    type === 'tactical' ||
    type === 'firearm' ||
    type === 'explosive' ||
    type === 'drone' ||
    combined.includes('weapon') ||
    combined.includes('senjata') ||
    combined.includes('tactical hardware') ||
    combined.includes('kelengkapan taktikal')
  ) {
    return {
      brand: 'weapon_hardware',
      brandName: 'Senjata & Kelengkapan Taktikal',
      category: 'tactical',
      brandColor: '#fb7185', // Coral Crimson
      bgColor: '#4c0519',
      borderColor: '#f43f5e',
      svgPath: BRAND_SVG_PATHS.weapon_hardware,
      emoji: '🎯'
    };
  }

  // 30. MALWARE & EXPLOIT PAYLOAD
  if (
    type === 'malware_payload' ||
    type === 'malware' ||
    type === 'payload' ||
    type === 'virus' ||
    type === 'trojan' ||
    type === 'ransomware' ||
    type === 'exploit' ||
    combined.includes('malware') ||
    combined.includes('perisian hasad') ||
    combined.includes('ransomware') ||
    combined.includes('trojan') ||
    combined.includes('zero-day')
  ) {
    return {
      brand: 'malware_payload',
      brandName: 'Perisian Hasad & Kod Eksploit',
      category: 'network',
      brandColor: '#84cc16', // Lime Hacker Green
      bgColor: '#1a2e05',
      borderColor: '#65a30d',
      svgPath: BRAND_SVG_PATHS.malware_payload,
      emoji: '🪲'
    };
  }

  // 31. BIOMETRIC EVIDENCE
  if (
    type === 'biometric_evidence' ||
    type === 'biometric' ||
    type === 'dna' ||
    type === 'fingerprint' ||
    type === 'iris' ||
    type === 'voiceprint' ||
    combined.includes('biometric') ||
    combined.includes('cap jari') ||
    combined.includes('profil dna') ||
    combined.includes('iris scan')
  ) {
    return {
      brand: 'biometric_evidence',
      brandName: 'Bukti Biometrik & DNA',
      category: 'evidence',
      brandColor: '#14b8a6', // Teal
      bgColor: '#042f2e',
      borderColor: '#0d9488',
      svgPath: BRAND_SVG_PATHS.biometric_evidence,
      emoji: '🧬'
    };
  }

  // 32. SURVEILLANCE DEVICE & SENSORS
  if (
    type === 'surveillance_device' ||
    type === 'surveillance' ||
    type === 'cctv' ||
    type === 'sensor' ||
    type === 'camera' ||
    type === 'gps_tracker' ||
    type === 'imsi_catcher' ||
    type === 'bug' ||
    combined.includes('surveillance') ||
    combined.includes('kamera litar tertutup') ||
    combined.includes('penderia') ||
    combined.includes('penjejak gps') ||
    combined.includes('imsi catcher')
  ) {
    return {
      brand: 'surveillance_device',
      brandName: 'Peranti Pengintipan & Penderia',
      category: 'system',
      brandColor: '#38bdf8', // Light Sky Blue
      bgColor: '#082f49',
      borderColor: '#0284c7',
      svgPath: BRAND_SVG_PATHS.surveillance_device,
      emoji: '📹'
    };
  }

  // 33. BROADCAST FREQUENCY & SIGNALS
  if (
    type === 'broadcast_frequency' ||
    type === 'frequency' ||
    type === 'radio_signal' ||
    type === 'numbers_station' ||
    type === 'rf' ||
    type === 'broadcast' ||
    combined.includes('radio frequency') ||
    combined.includes('frekuensi radio') ||
    combined.includes('numbers station') ||
    combined.includes('isyarat siaran')
  ) {
    return {
      brand: 'broadcast_frequency',
      brandName: 'Frekuensi Radio & Isyarat',
      category: 'communication',
      brandColor: '#fbbf24', // Amber
      bgColor: '#451a03',
      borderColor: '#d97706',
      svgPath: BRAND_SVG_PATHS.broadcast_frequency,
      emoji: '📡'
    };
  }

  // 34. CLASSIFIED DOSSIER & LEAKED DOCUMENTS
  if (
    type === 'classified_dossier' ||
    type === 'classified' ||
    type === 'dossier' ||
    type === 'leaked_doc' ||
    type === 'secret_file' ||
    combined.includes('classified') ||
    combined.includes('rahsia rasmi') ||
    combined.includes('dokumen sulit') ||
    combined.includes('leaked document') ||
    combined.includes('fail risikan')
  ) {
    return {
      brand: 'classified_dossier',
      brandName: 'Dokumen Rahsia & Fail Sulit',
      category: 'data',
      brandColor: '#ef4444', // Red Alert
      bgColor: '#450a0a',
      borderColor: '#dc2626',
      svgPath: BRAND_SVG_PATHS.classified_dossier,
      emoji: '📁'
    };
  }

  // 35. FINANCIAL INSTRUMENT & MULE LEDGER
  if (
    type === 'financial_instrument' ||
    type === 'financial' ||
    type === 'bank_account' ||
    type === 'mule_account' ||
    type === 'offshore' ||
    type === 'transaction' ||
    combined.includes('bank account') ||
    combined.includes('akaun keldai') ||
    combined.includes('offshore account') ||
    combined.includes('transaksi kewangan') ||
    combined.includes('swift transfer')
  ) {
    return {
      brand: 'financial_instrument',
      brandName: 'Instrumen Kewangan & Akaun Pesisir',
      category: 'data',
      brandColor: '#10b981', // Emerald Green
      bgColor: '#022c22',
      borderColor: '#059669',
      svgPath: BRAND_SVG_PATHS.financial_instrument,
      emoji: '🏛️'
    };
  }

  // 36. DARKWEB FORUM & MARKETPLACE
  if (
    type === 'darkweb_forum' ||
    type === 'darkweb' ||
    type === 'tor_site' ||
    type === 'onion' ||
    combined.includes('darkweb') ||
    combined.includes('.onion') ||
    combined.includes('forum darknet')
  ) {
    return {
      brand: 'darkweb_forum',
      brandName: 'Forum Darknet & Pasaran',
      category: 'network',
      brandColor: '#a855f7', // Purple
      bgColor: '#3b0764',
      borderColor: '#9333ea',
      svgPath: BRAND_SVG_PATHS.darkweb_forum,
      emoji: '🧅'
    };
  }

  // 37. SATELLITE IMAGERY & REMOTE SENSING
  if (
    type === 'satellite_imagery' ||
    type === 'satellite' ||
    type === 'imagery' ||
    combined.includes('imej satelit') ||
    combined.includes('earth observation') ||
    combined.includes('sar radar')
  ) {
    return {
      brand: 'satellite_imagery',
      brandName: 'Imej Satelit & Remote Sensing',
      category: 'location',
      brandColor: '#38bdf8', // Sky Blue
      bgColor: '#0c4a6e',
      borderColor: '#0284c7',
      svgPath: BRAND_SVG_PATHS.satellite_imagery,
      emoji: '🛰️'
    };
  }

  // 38. DEEPFAKE MEDIA & SYNTHETICS
  if (
    type === 'deepfake_media' ||
    type === 'deepfake' ||
    type === 'synthetic_media' ||
    combined.includes('deepfake') ||
    combined.includes('tiruan digital')
  ) {
    return {
      brand: 'deepfake_media',
      brandName: 'Tiruan Deepfake & Synthetic Media',
      category: 'evidence',
      brandColor: '#f43f5e', // Rose
      bgColor: '#4c0519',
      borderColor: '#e11d48',
      svgPath: BRAND_SVG_PATHS.deepfake_media,
      emoji: '🎭'
    };
  }

  // 39. CHEMICAL HAZARD & CBRN
  if (
    type === 'chemical_hazard' ||
    type === 'cbrn' ||
    type === 'hazard' ||
    type === 'biohazard' ||
    combined.includes('chemical hazard') ||
    combined.includes('cbrn') ||
    combined.includes('bahan berbahaya')
  ) {
    return {
      brand: 'chemical_hazard',
      brandName: 'Bahan Hazard CBRN',
      category: 'tactical',
      brandColor: '#eab308', // Yellow hazard
      bgColor: '#422006',
      borderColor: '#ca8a04',
      svgPath: BRAND_SVG_PATHS.chemical_hazard,
      emoji: '⚠️'
    };
  }

  // 40. QUANTUM CIPHER KEY
  if (
    type === 'quantum_cipher' ||
    type === 'cipher' ||
    type === 'encryption_key' ||
    combined.includes('kunci kriptografi') ||
    combined.includes('quantum cipher')
  ) {
    return {
      brand: 'quantum_cipher',
      brandName: 'Kunci Kriptografi Quantum',
      category: 'system',
      brandColor: '#06b6d4', // Cyan
      bgColor: '#164e63',
      borderColor: '#0891b2',
      svgPath: BRAND_SVG_PATHS.quantum_cipher,
      emoji: '🔑'
    };
  }

  // 41. AI MODEL WEIGHTS & AUTONOMOUS AGENT
  if (
    type === 'ai_model_weights' ||
    type === 'ai_model' ||
    type === 'autonomous_agent' ||
    combined.includes('model ai') ||
    combined.includes('neural weights')
  ) {
    return {
      brand: 'ai_model_weights',
      brandName: 'Model AI & Ejen Autonomi',
      category: 'system',
      brandColor: '#8b5cf6', // Violet
      bgColor: '#2e1065',
      borderColor: '#7c3aed',
      svgPath: BRAND_SVG_PATHS.ai_model_weights,
      emoji: '🤖'
    };
  }

  // 42. ANOMALY PORTAL
  if (
    type === 'anomaly_portal' ||
    type === 'portal' ||
    type === 'stargate' ||
    combined.includes('portal anomali') ||
    combined.includes('ruang masa')
  ) {
    return {
      brand: 'anomaly_portal',
      brandName: 'Portal Anomali Ruang Masa',
      category: 'fictional',
      brandColor: '#ec4899', // Pink
      bgColor: '#500724',
      borderColor: '#db2777',
      svgPath: BRAND_SVG_PATHS.anomaly_portal,
      emoji: '🌀'
    };
  }

  // 43. OCCULT SYMBOL & GRIMOIRE
  if (
    type === 'occult_symbol' ||
    type === 'grimoire' ||
    type === 'sigil' ||
    combined.includes('simbol okultisme') ||
    combined.includes('grimoire')
  ) {
    return {
      brand: 'occult_symbol',
      brandName: 'Simbol Okultisme & Grimoire',
      category: 'fictional',
      brandColor: '#f97316', // Orange
      bgColor: '#431407',
      borderColor: '#ea580c',
      svgPath: BRAND_SVG_PATHS.occult_symbol,
      emoji: '📜'
    };
  }

  // 44. SUBSEA CABLE & FIBER PIPELINE
  if (
    type === 'subsea_cable' ||
    type === 'fiber_cable' ||
    combined.includes('kabel kapal selam') ||
    combined.includes('subsea cable')
  ) {
    return {
      brand: 'subsea_cable',
      brandName: 'Kabel Kapal Selam & Fiber',
      category: 'network',
      brandColor: '#0284c7', // Ocean Blue
      bgColor: '#082f49',
      borderColor: '#0369a1',
      svgPath: BRAND_SVG_PATHS.subsea_cable,
      emoji: '🌊'
    };
  }

  // 45. BLACK BUDGET PROJECT
  if (
    type === 'black_budget_project' ||
    type === 'black_project' ||
    type === 'special_ops' ||
    combined.includes('black budget') ||
    combined.includes('projek rahsia negara')
  ) {
    return {
      brand: 'black_budget_project',
      brandName: 'Projek Rahsia Black Budget',
      category: 'tactical',
      brandColor: '#dc2626', // Deep Red
      bgColor: '#450a0a',
      borderColor: '#b91c1c',
      svgPath: BRAND_SVG_PATHS.black_budget_project,
      emoji: '⚡'
    };
  }

  // 36. PERSON / INDIVIDUAL / TARGET
  if (
    type === 'person' || 
    type === 'user' || 
    type === 'target' || 
    type === 'suspect' || 
    type === 'witness' || 
    type === 'individual' ||
    type === 'personal_id'
  ) {
    return {
      brand: 'person',
      brandName: 'Individu / Sasaran',
      category: 'identity',
      brandColor: '#22c55e', // Green
      bgColor: '#052e16',
      borderColor: '#16a34a',
      svgPath: BRAND_SVG_PATHS.person,
      emoji: '👤'
    };
  }

  // Default Generic Entity
  return {
    brand: 'generic',
    brandName: type ? type.toUpperCase() : 'Entiti',
    category: 'system',
    brandColor: '#9ca3af', // Gray
    bgColor: '#18181b',
    borderColor: '#52525b',
    svgPath: BRAND_SVG_PATHS.generic,
    emoji: '🔹'
  };
}

/**
 * Cache Path2D objects for ultra-fast canvas vector rendering
 */
const path2dCache = new Map<string, Path2D>();

function getPath2D(svgPath: string): Path2D | null {
  if (typeof window === 'undefined' || typeof Path2D === 'undefined') return null;
  if (!path2dCache.has(svgPath)) {
    try {
      path2dCache.set(svgPath, new Path2D(svgPath));
    } catch {
      return null;
    }
  }
  return path2dCache.get(svgPath) || null;
}

/**
 * High-performance Canvas Vector Drawing Routine for every graph node.
 * Draws either a centered crisp brand logo or a badge over an avatar image.
 */
export function drawNodeIconOnCanvas(
  ctx: CanvasRenderingContext2D,
  node: { type?: string; label?: string; details?: string; url?: string; vaultMatch?: boolean },
  x: number,
  y: number,
  radius: number,
  transformK: number,
  isSelected: boolean = false,
  hasImage: boolean = false
) {
  const meta = resolveNodeBrandOrType(node);
  const path = getPath2D(meta.svgPath);

  ctx.save();

  if (hasImage) {
    // If the node already renders a person's photo avatar,
    // draw a micro brand badge on the bottom-right of the node circle
    // so the analyst knows this account/avatar belongs to Telegram / WhatsApp / Phone / etc.
    const badgeRadius = Math.max(5, Math.min(10, radius * 0.42));
    const badgeX = x + (radius * 0.65);
    const badgeY = y + (radius * 0.65);

    // Badge circle background
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = meta.brandColor;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fill();
    
    ctx.lineWidth = 1.5 / transformK;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    // Draw miniature icon inside badge
    if (path) {
      ctx.save();
      ctx.translate(badgeX, badgeY);
      const iconScale = (badgeRadius * 1.25) / 24;
      ctx.scale(iconScale, iconScale);
      ctx.translate(-12, -12);
      ctx.fillStyle = '#ffffff';
      ctx.fill(path);
      ctx.restore();
    }
  } else {
    // No photo image: Render the crisp brand/entity vector icon centered inside the node circle!
    // 1. Draw subtle radial glow or contrast background
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.82, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    if (path) {
      ctx.save();
      ctx.translate(x, y);
      
      // Calculate scale from standard 24x24 viewBox to fit inside node radius nicely
      const iconTargetSize = radius * 1.15;
      const scale = iconTargetSize / 24;
      ctx.scale(scale, scale);
      ctx.translate(-12, -12); // Center 24x24 box

      // Icon fill
      ctx.fillStyle = isSelected ? '#ffffff' : (meta.brand === 'github' ? '#ffffff' : meta.brandColor);
      
      // Subtle shadow behind vector
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = Math.max(2, 4 / transformK);
      ctx.fill(path);

      ctx.restore();
    } else {
      // Fallback: draw sharp text glyph
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10, radius * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.emoji || (node.type || '?')[0].toUpperCase(), x, y);
    }
  }

  ctx.restore();
}

/**
 * React Component for displaying Brand/Node Icon with accurate colors & tooltips.
 */
export const NodeBrandIcon: React.FC<{
  node: { type?: string; label?: string; details?: string; url?: string; vaultMatch?: boolean };
  size?: number;
  className?: string;
  showBadge?: boolean;
}> = ({ node, size = 16, className = '', showBadge = false }) => {
  const meta = resolveNodeBrandOrType(node);

  const renderIconElement = () => {
    switch (meta.brand) {
      case 'telegram':
      case 'whatsapp':
      case 'instagram':
      case 'facebook':
      case 'youtube':
      case 'twitter':
      case 'tiktok':
      case 'github':
      case 'linkedin':
      case 'reddit':
      case 'discord':
      case 'snapchat':
      case 'pinterest':
      case 'vk':
      case 'twitch':
      case 'threads':
      case 'bluesky':
      case 'medium':
      case 'telco':
      case 'scammer':
      case 'police':
      case 'fictional_character':
      case 'fictional_object':
      case 'found_footage':
      case 'cryptid_myth':
      case 'weapon_hardware':
      case 'malware_payload':
      case 'biometric_evidence':
      case 'surveillance_device':
      case 'broadcast_frequency':
      case 'classified_dossier':
      case 'financial_instrument':
        return (
          <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            style={{ color: meta.brandColor }}
            className={`inline-block flex-shrink-0 ${className}`}
          >
            <path d={meta.svgPath} />
          </svg>
        );
      case 'phone':
        return <Phone size={size} style={{ color: meta.brandColor }} className={className} />;
      case 'email':
        return <Mail size={size} style={{ color: meta.brandColor }} className={className} />;
      case 'location':
        return <MapPin size={size} style={{ color: meta.brandColor }} className={className} />;
      case 'domain':
        return <Globe size={size} style={{ color: meta.brandColor }} className={className} />;
      case 'ip':
        return <Cpu size={size} style={{ color: meta.brandColor }} className={className} />;
      case 'person':
        return <User size={size} style={{ color: meta.brandColor }} className={className} />;
      case 'organization':
        return <Building2 size={size} style={{ color: meta.brandColor }} className={className} />;
      case 'vault':
        return <Database size={size} style={{ color: meta.brandColor }} className={className} />;
      case 'crypto':
        return <Coins size={size} style={{ color: meta.brandColor }} className={className} />;
      default:
        return <Sparkles size={size} style={{ color: meta.brandColor }} className={className} />;
    }
  };

  if (!showBadge) {
    return renderIconElement();
  }

  return (
    <span 
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${className}`}
      style={{ 
        backgroundColor: `${meta.brandColor}18`, 
        borderColor: `${meta.brandColor}40`,
        color: meta.brandColor 
      }}
      title={`${meta.brandName}: ${node.label || node.type}`}
    >
      {renderIconElement()}
      <span className="truncate max-w-[120px]">{meta.brandName}</span>
    </span>
  );
};
