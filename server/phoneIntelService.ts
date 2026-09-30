import https from "https";
import http from "http";
import { serverGenerateContent } from "./geminiService";

export interface NumVerifyResult {
  valid: boolean;
  number: string;
  local_format: string;
  international_format: string;
  country_prefix: string;
  country_code: string;
  country_name: string;
  location: string;
  carrier: string;
  line_type: string;
  raw?: any;
  error?: string;
}

export interface SerpApiPhoneResult {
  query: string;
  total_results?: number;
  results: Array<{
    title: string;
    link: string;
    snippet: string;
    displayed_link?: string;
    category?: 'social' | 'scam_report' | 'business' | 'leak_directory' | 'general';
    thumbnail?: string;
    date?: string;
  }>;
  knowledge_graph?: any;
  related_searches?: string[];
  error?: string;
}

export interface TelegramPhoneReconResult {
  phone: string;
  cleanPhone: string;
  tgDeepLink: string;
  tgWebLink: string;
  directPhoneLink: string;
  bellingcatScript: string;
  publicProfileFound: boolean;
  profileData?: {
    username?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    bio?: string;
    status?: string;
    verified?: boolean;
    isBot?: boolean;
    userId?: string;
  };
  footprints: Array<{
    source: string;
    title: string;
    link: string;
    snippet: string;
  }>;
  instructions: string;
  error?: string;
}

export interface ComprehensivePhoneIntelReport {
  targetPhone: string;
  normalizedPhone: string;
  numverify?: NumVerifyResult;
  serpapi?: SerpApiPhoneResult;
  telegram?: TelegramPhoneReconResult;
  whatsapp?: {
    waLink: string;
    waApiLink: string;
    webLink: string;
    avatarProbeUrl: string;
  };
  aiAnalysis?: {
    threatScore: number; // 0-100
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    ownerIdentityGuess: string;
    carrierSummary: string;
    socialFootprints: string[];
    scamWarning: boolean;
    scamDetails?: string;
    executiveSummary: string;
  };
  suggestedNodes: Array<{
    id: string;
    label: string;
    type: string;
    details: string;
    imageUrl?: string;
  }>;
  suggestedEdges: Array<{
    source: string;
    target: string;
    label: string;
  }>;
}

// Clean and normalize phone number
export function cleanPhoneNumber(phone: string): { raw: string; digits: string; e164: string } {
  const raw = (phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  let e164 = digits;
  if (!raw.startsWith('+') && !digits.startsWith('00')) {
    // If starts with 0 and likely Malaysia/ASEAN, normalize default if needed, or keep digits
    e164 = digits;
  }
  return { raw, digits, e164: `+${digits}` };
}

// 1. NUMVERIFY API CALL
export async function lookupNumVerify(phone: string, apiKeyOverride?: string): Promise<NumVerifyResult> {
  const apiKey = apiKeyOverride || process.env.NUMVERIFY_API_KEY || '';
  const { digits } = cleanPhoneNumber(phone);

  if (!apiKey) {
    // Return heuristic response with clear notification
    return {
      valid: digits.length >= 8 && digits.length <= 15,
      number: `+${digits}`,
      local_format: digits,
      international_format: `+${digits}`,
      country_prefix: digits.startsWith('60') ? '+60' : digits.startsWith('1') ? '+1' : digits.startsWith('62') ? '+62' : digits.startsWith('65') ? '+65' : '',
      country_code: digits.startsWith('60') ? 'MY' : digits.startsWith('1') ? 'US' : digits.startsWith('62') ? 'ID' : digits.startsWith('65') ? 'SG' : 'UNKNOWN',
      country_name: digits.startsWith('60') ? 'Malaysia' : digits.startsWith('1') ? 'United States' : digits.startsWith('62') ? 'Indonesia' : digits.startsWith('65') ? 'Singapore' : 'Unknown',
      location: digits.startsWith('601') ? 'Kuala Lumpur / Mobile GSM' : 'Global',
      carrier: digits.startsWith('6012') || digits.startsWith('6017') ? 'Maxis' : digits.startsWith('6019') || digits.startsWith('6013') ? 'Celcom' : digits.startsWith('6016') ? 'Digi' : digits.startsWith('6018') ? 'U Mobile' : 'Unknown Carrier',
      line_type: 'mobile',
      error: 'NUMVERIFY_API_KEY tidak dikonfigurasi. Sila masukkan API Key di tab Settings atau tetapan NumVerify untuk data telekom rasmi.'
    };
  }

  // Try standard NumVerify endpoints with automatic redirect following
  const candidateUrls = [
    `https://api.numverify.com/v1/validate?access_key=${encodeURIComponent(apiKey)}&number=${encodeURIComponent(digits)}&format=1`,
    `http://apilayer.net/api/validate?access_key=${encodeURIComponent(apiKey)}&number=${encodeURIComponent(digits)}&format=1`,
    `https://api.apilayer.net/numverify/validate?number=${encodeURIComponent(digits)}`
  ];

  let lastError = '';

  for (const url of candidateUrls) {
    try {
      const headers: Record<string, string> = {};
      if (url.includes('api.apilayer.net')) {
        headers['apikey'] = apiKey;
      }

      const res = await fetch(url, { headers, redirect: 'follow' });
      const text = await res.text();

      // Guard against HTML error or redirect pages
      if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
        lastError = `API NumVerify mengembalikan respons HTML (${res.status}). Sila pastikan NumVerify API Key dimasukkan dengan betul.`;
        continue;
      }

      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        lastError = `Gagal memproses data JSON dari NumVerify.`;
        continue;
      }

      if (json && json.error) {
        return {
          valid: false,
          number: `+${digits}`,
          local_format: digits,
          international_format: `+${digits}`,
          country_prefix: '',
          country_code: '',
          country_name: '',
          location: '',
          carrier: '',
          line_type: '',
          error: `NumVerify API Error [${json.error.code || 'ERR'}]: ${json.error.info || json.error.type || JSON.stringify(json.error)}`
        };
      }

      if (json && (json.valid !== undefined || json.country_code || json.number)) {
        return {
          valid: Boolean(json.valid),
          number: json.number || `+${digits}`,
          local_format: json.local_format || digits,
          international_format: json.international_format || `+${digits}`,
          country_prefix: json.country_prefix || '',
          country_code: json.country_code || '',
          country_name: json.country_name || '',
          location: json.location || '',
          carrier: json.carrier || 'N/A (Unlisted / MVNO)',
          line_type: json.line_type || 'mobile',
          raw: json
        };
      }
    } catch (err: any) {
      lastError = `NumVerify Connection Error: ${err?.message || err}`;
    }
  }

  return {
    valid: digits.length >= 8 && digits.length <= 15,
    number: `+${digits}`,
    local_format: digits,
    international_format: `+${digits}`,
    country_prefix: digits.startsWith('60') ? '+60' : '',
    country_code: digits.startsWith('60') ? 'MY' : 'UNKNOWN',
    country_name: digits.startsWith('60') ? 'Malaysia' : 'Unknown',
    location: digits.startsWith('601') ? 'Kuala Lumpur / Mobile GSM' : 'Global',
    carrier: 'Unknown Carrier',
    line_type: 'mobile',
    error: lastError || 'Ralat komunikasi bersama pelayan NumVerify.'
  };
}

// 2. SERPAPI SEARCH & DORKING
export async function lookupSerpApiPhone(
  phone: string,
  apiKeyOverride?: string,
  customQuery?: string
): Promise<SerpApiPhoneResult> {
  const apiKey = apiKeyOverride || process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || '';
  const { digits, raw } = cleanPhoneNumber(phone);

  const query = customQuery || `"${digits}" OR "${raw}"`;

  if (!apiKey) {
    return {
      query,
      results: [],
      error: 'SERPAPI_API_KEY tidak disediakan. Sila masukkan SerpApi API Key dalam panel Settings atau konfigurasi Phone Intel.'
    };
  }

  try {
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(apiKey)}&num=15`;
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();

    if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
      return {
        query,
        results: [],
        error: `SerpApi mengembalikan respons HTML (${res.status}). Sila semak semula SerpApi Key.`
      };
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        query,
        results: [],
        error: `Gagal membaca format JSON SerpApi.`
      };
    }

    if (json.error) {
      return {
        query,
        results: [],
        error: `SerpApi Error: ${json.error}`
      };
    }

    const rawResults = Array.isArray(json.organic_results) ? json.organic_results : [];
    const processedResults = rawResults.map((item: any) => {
      const link = item.link || '';
      const snippet = item.snippet || '';
      const title = item.title || '';
      
      let category: 'social' | 'scam_report' | 'business' | 'leak_directory' | 'general' = 'general';
      const lowerLink = link.toLowerCase();
      const lowerText = `${title} ${snippet}`.toLowerCase();

      if (lowerLink.includes('facebook') || lowerLink.includes('instagram') || lowerLink.includes('twitter') || lowerLink.includes('t.me') || lowerLink.includes('telegram') || lowerLink.includes('tiktok') || lowerLink.includes('linkedin')) {
        category = 'social';
      } else if (lowerLink.includes('whoscall') || lowerLink.includes('truecaller') || lowerLink.includes('sync.me') || lowerLink.includes('tellows') || lowerLink.includes('semakmule') || lowerText.includes('scam') || lowerText.includes('penipu') || lowerText.includes('fraud') || lowerText.includes('aduan')) {
        category = 'scam_report';
      } else if (lowerLink.includes('mudah.my') || lowerLink.includes('carousell') || lowerLink.includes('shopee') || lowerLink.includes('ssm') || lowerLink.includes('company') || lowerText.includes('sdn bhd') || lowerText.includes('enterprise')) {
        category = 'business';
      } else if (lowerLink.includes('pastebin') || lowerLink.includes('leak') || lowerLink.includes('database') || lowerLink.includes('breach')) {
        category = 'leak_directory';
      }

      return {
        title,
        link,
        snippet,
        displayed_link: item.displayed_link || link,
        category,
        thumbnail: item.thumbnail || (item.rich_snippet?.top?.detected_extensions?.thumbnail) || undefined,
        date: item.date || undefined
      };
    });

    return {
      query,
      total_results: json.search_information?.total_results,
      results: processedResults,
      knowledge_graph: json.knowledge_graph,
      related_searches: Array.isArray(json.related_searches) ? json.related_searches.map((r: any) => r.query || '') : []
    };
  } catch (err: any) {
    return {
      query,
      results: [],
      error: `SerpApi Network Request Failed: ${err?.message || err}`
    };
  }
}

// 3. BELLINGCAT TELEGRAM PHONE CHECKER & RECONNAISSANCE
export function generateBellingcatTelegramScript(phone: string, apiId: string = 'YOUR_API_ID', apiHash: string = 'YOUR_API_HASH'): string {
  const { digits } = cleanPhoneNumber(phone);
  return `#!/usr/bin/env python3
"""
Bellingcat Telegram Phone Number Checker (Automated Telethon MTProto Runner)
Target: +${digits}
Method: ImportContactsRequest -> User Metadata Harvest -> DeleteContactsRequest
"""

import sys
import json
import asyncio
from telethon import TelegramClient
from telethon.tl.types import InputPhoneContact
from telethon.tl.functions.contacts import ImportContactsRequest, DeleteContactsRequest

API_ID = ${apiId === 'YOUR_API_ID' ? 'YOUR_API_ID' : Number(apiId) || 'YOUR_API_ID'}
API_HASH = "${apiHash}"
PHONE_TARGET = "+${digits}"

async def main():
    if API_ID == 'YOUR_API_ID' or API_HASH == 'YOUR_API_HASH':
        print(json.dumps({
            "status": "error",
            "message": "Sila masukkan Telegram API_ID & API_HASH dari https://my.telegram.org"
        }, indent=2))
        return

    client = TelegramClient('redhorizon_tg_session', API_ID, API_HASH)
    await client.start()

    contact = InputPhoneContact(client_id=0, phone=PHONE_TARGET, first_name="Target", last_name="Recon")
    result = await client(ImportContactsRequest([contact]))
    
    output = {
        "target_phone": PHONE_TARGET,
        "registered_on_telegram": False,
        "users_found": []
    }

    if result.users:
        output["registered_on_telegram"] = True
        for u in result.users:
            output["users_found"].append({
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "username": u.username,
                "phone": u.phone,
                "bot": u.bot,
                "verified": u.verified,
                "scam": u.scam,
                "fake": u.fake,
                "photo_id": str(u.photo.photo_id) if u.photo else None
            })
            # Clean up contact from address book immediately
            await client(DeleteContactsRequest(id=[u.id]))

    print(json.dumps(output, indent=2))
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
`;
}

export async function lookupTelegramRecon(phone: string, apiId?: string, apiHash?: string): Promise<TelegramPhoneReconResult> {
  const { digits } = cleanPhoneNumber(phone);
  const tgDeepLink = `tg://resolve?phone=${digits}`;
  const tgWebLink = `https://t.me/+${digits}`;
  const directPhoneLink = `https://t.me/${digits}`;

  const script = generateBellingcatTelegramScript(digits, apiId, apiHash);

  // Perform search grounding / web footprint lookup for the telegram phone number
  const tgFootprints: Array<{ source: string; title: string; link: string; snippet: string }> = [];

  try {
    const aiSearch = await serverGenerateContent(
      `Conduct an OSINT reconnaissance scan on Telegram for phone number "+${digits}" or "${digits}".
Find any publicly associated Telegram usernames (@username), channels, group mentions, t.me links, leak database records, or public usernames linked with this exact phone number.
Return structured JSON:
{
  "publicProfileFound": boolean,
  "profileData": {
    "username": "string or null",
    "firstName": "string or null",
    "lastName": "string or null",
    "bio": "string or null",
    "userId": "string or null",
    "avatarUrl": "string or null"
  },
  "footprints": [
    { "source": "Telegram/Web", "title": "string", "link": "string", "snippet": "string" }
  ]
}`,
      { model: "gemini-3.7-flash", useSearch: true, responseMimeType: "application/json" }
    );

    let parsed: any = null;
    if (aiSearch && aiSearch.text) {
      try {
        parsed = JSON.parse(aiSearch.text);
      } catch {
        const jsonMatch = aiSearch.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      }
    }

    if (parsed) {
      return {
        phone: `+${digits}`,
        cleanPhone: digits,
        tgDeepLink,
        tgWebLink,
        directPhoneLink,
        bellingcatScript: script,
        publicProfileFound: Boolean(parsed.publicProfileFound),
        profileData: parsed.profileData || undefined,
        footprints: Array.isArray(parsed.footprints) ? parsed.footprints : [],
        instructions: "Gunakan skrip Python Telethon Bellingcat di atas dalam Terminal / Termux untuk semakan langsung MTProto Telegram, atau gunakan pautan pantas t.me di atas."
      };
    }
  } catch (err: any) {
    console.warn("[TELEGRAM RECON WARNING]", err?.message || err);
  }

  return {
    phone: `+${digits}`,
    cleanPhone: digits,
    tgDeepLink,
    tgWebLink,
    directPhoneLink,
    bellingcatScript: script,
    publicProfileFound: false,
    footprints: [],
    instructions: "Gunakan skrip Python Telethon Bellingcat di atas dalam Terminal / Termux untuk semakan langsung MTProto Telegram, atau gunakan pautan pantas t.me di atas."
  };
}

// 4. COMPREHENSIVE MULTI-SOURCE ORCHESTRATOR
export async function runComprehensivePhoneIntel(
  phone: string,
  options: {
    numverifyKey?: string;
    serpapiKey?: string;
    telegramApiId?: string;
    telegramApiHash?: string;
  } = {}
): Promise<ComprehensivePhoneIntelReport> {
  const { digits, raw } = cleanPhoneNumber(phone);
  const normalized = `+${digits}`;

  // WhatsApp quick links
  const whatsapp = {
    waLink: `https://wa.me/${digits}`,
    waApiLink: `https://api.whatsapp.com/send?phone=${digits}`,
    webLink: `https://web.whatsapp.com/send?phone=${digits}`,
    avatarProbeUrl: `/api/proxy-image?url=${encodeURIComponent(`https://pps.whatsapp.net/v/t61.24694-24/${digits}`)}`
  };

  // Run services in parallel
  const [numverifyRes, serpapiRes, telegramRes] = await Promise.all([
    lookupNumVerify(phone, options.numverifyKey),
    lookupSerpApiPhone(phone, options.serpapiKey),
    lookupTelegramRecon(phone, options.telegramApiId, options.telegramApiHash)
  ]);

  // Use Gemini to synthesize findings into OSINT Threat Profile and Graph Nodes/Edges
  const synthesisPrompt = `You are the Lead Cyber Intelligence Analyst for RedHorizon OSINT.
Synthesize the following multi-source reconnaissance data for phone number "${normalized}":

NUMVERIFY DATA:
${JSON.stringify(numverifyRes, null, 2)}

SERPAPI DIGITAL FOOTPRINTS:
${JSON.stringify(serpapiRes, null, 2)}

TELEGRAM RECONNAISSANCE:
${JSON.stringify(telegramRes, null, 2)}

WHATSAPP ENDPOINTS:
${JSON.stringify(whatsapp, null, 2)}

Generate a structured intelligence synthesis in JSON format:
{
  "threatScore": number (0-100 based on scam reports, suspicious activity, or identity exposure),
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "ownerIdentityGuess": "Name/Alias of owner or 'Unidentified Subject'",
  "carrierSummary": "Carrier name, Line type, country and active status",
  "socialFootprints": ["list of discovered accounts or profiles on FB, IG, TG, WA, TikTok, etc."],
  "scamWarning": boolean (true if flagged on CCID/Whoscall/Scam databases),
  "scamDetails": "Details about reported scam or fraud if any",
  "executiveSummary": "Concise Bahasa Malaysia / English tactical intelligence summary of the subject and number.",
  "suggestedNodes": [
    {
      "id": "unique_string_id",
      "label": "Display Label",
      "type": "person" | "phone" | "organization" | "location" | "social" | "server" | "email",
      "details": "Detailed dossier description with key: value pairs and IMAGE_URL if avatar found",
      "imageUrl": "optional image url"
    }
  ],
  "suggestedEdges": [
    {
      "source": "source_node_id",
      "target": "target_node_id",
      "label": "CARRIER" | "USED_BY" | "LOCATED_IN" | "TELEGRAM_ACCOUNT" | "SCAM_ALERT" | "SOCIAL_PROFILE"
    }
  ]
}`;

  let aiAnalysis: any = {
    threatScore: 10,
    riskLevel: 'LOW',
    ownerIdentityGuess: 'Unidentified Subject',
    carrierSummary: `${numverifyRes.carrier || 'Unknown'} (${numverifyRes.line_type || 'Mobile'})`,
    socialFootprints: [],
    scamWarning: false,
    executiveSummary: `Analisis nombor telefon ${normalized} selesai. Maklumat telekom dan carian jejak digital telah diproses.`
  };

  let suggestedNodes: any[] = [
    {
      id: `phone_${digits}`,
      label: normalized,
      type: 'phone',
      details: `STATUS: Valid\nCARRIER: ${numverifyRes.carrier || 'Unknown'}\nCOUNTRY: ${numverifyRes.country_name || 'MY'}\nLINE_TYPE: ${numverifyRes.line_type || 'Mobile'}\nLOCATION: ${numverifyRes.location || 'N/A'}`
    }
  ];

  let suggestedEdges: any[] = [];

  if (numverifyRes.carrier && numverifyRes.carrier !== 'Unknown Carrier' && numverifyRes.carrier !== 'N/A (Unlisted / MVNO)') {
    const carrierId = `carrier_${numverifyRes.carrier.replace(/\s+/g, '_').toLowerCase()}`;
    suggestedNodes.push({
      id: carrierId,
      label: numverifyRes.carrier,
      type: 'organization',
      details: `TELCO_OPERATOR: ${numverifyRes.carrier}\nCOUNTRY: ${numverifyRes.country_name}\nLINE_TYPE: ${numverifyRes.line_type}`
    });
    suggestedEdges.push({
      source: `phone_${digits}`,
      target: carrierId,
      label: 'CARRIER'
    });
  }

  if (numverifyRes.country_name) {
    const locId = `loc_${numverifyRes.country_code.toLowerCase()}`;
    suggestedNodes.push({
      id: locId,
      label: numverifyRes.location ? `${numverifyRes.location}, ${numverifyRes.country_name}` : numverifyRes.country_name,
      type: 'location',
      details: `COUNTRY_CODE: ${numverifyRes.country_code}\nPREFIX: ${numverifyRes.country_prefix}`
    });
    suggestedEdges.push({
      source: `phone_${digits}`,
      target: locId,
      label: 'LOCATED_IN'
    });
  }

  try {
    const aiResult = await serverGenerateContent(synthesisPrompt, {
      model: "gemini-3.7-flash",
      responseMimeType: "application/json"
    });

    if (aiResult && aiResult.text) {
      let parsed: any = null;
      try {
        parsed = JSON.parse(aiResult.text);
      } catch {
        const m = aiResult.text.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }

      if (parsed) {
        aiAnalysis = {
          threatScore: parsed.threatScore ?? 15,
          riskLevel: parsed.riskLevel || 'LOW',
          ownerIdentityGuess: parsed.ownerIdentityGuess || 'Subject',
          carrierSummary: parsed.carrierSummary || `${numverifyRes.carrier}`,
          socialFootprints: Array.isArray(parsed.socialFootprints) ? parsed.socialFootprints : [],
          scamWarning: Boolean(parsed.scamWarning),
          scamDetails: parsed.scamDetails,
          executiveSummary: parsed.executiveSummary || aiAnalysis.executiveSummary
        };

        if (Array.isArray(parsed.suggestedNodes) && parsed.suggestedNodes.length > 0) {
          suggestedNodes = parsed.suggestedNodes;
        }
        if (Array.isArray(parsed.suggestedEdges) && parsed.suggestedEdges.length > 0) {
          suggestedEdges = parsed.suggestedEdges;
        }
      }
    }
  } catch (err: any) {
    console.warn("[PHONE INTEL SYNTHESIS WARNING]", err?.message || err);
  }

  return {
    targetPhone: raw,
    normalizedPhone: normalized,
    numverify: numverifyRes,
    serpapi: serpapiRes,
    telegram: telegramRes,
    whatsapp,
    aiAnalysis,
    suggestedNodes,
    suggestedEdges
  };
}
