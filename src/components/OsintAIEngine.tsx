import React, { useState } from 'react';
import { Cpu, X, Brain, Filter, Layers, CheckCircle2, AlertTriangle, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useGlobalStore } from '../store/GlobalStore';
import { getSessionCache, setSessionCache, generateCacheKey } from '../utils/sessionCache';

const CONFIG = {
  smallModel: "qwen/qwen-2.5-coder-32b-instruct:free",   // Tapis peringkat 1 (OpenRouter free model example)
  bigModel:   "google/gemini-2.5-pro",    // Analisis mendalam
  chunkSize:  100,                            
  maxTokensPerRequest: 1500,
};

// --- CACHING (SESSION STORAGE - Auto Purge On Close) ---
const analysisCache = new Map();
function getCached(key: string) { 
  if (analysisCache.has(key)) return analysisCache.get(key);
  const sessionItem = getSessionCache<any>(generateCacheKey('osint_ai', key));
  if (sessionItem) {
    analysisCache.set(key, sessionItem);
    return sessionItem;
  }
  return null; 
}
function setCache(key: string, value: any) { 
  const entry = { result: value, timestamp: Date.now() };
  analysisCache.set(key, entry); 
  setSessionCache(generateCacheKey('osint_ai', key), entry);
}

interface OsintAIEngineProps {
  onClose: () => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
}

const OsintAIEngine: React.FC<OsintAIEngineProps> = ({ onClose, onLog }) => {
  const { state, dispatch } = useGlobalStore();
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [statusText, setStatusText] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState(state.config?.openrouterApiKey || state.config?.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [testMsg, setTestMsg] = useState('');

  React.useEffect(() => {
    const key = state.config?.openrouterApiKey || state.config?.apiKey;
    if (key && !openRouterKey) {
      setOpenRouterKey(key);
    }
  }, [state.config?.openrouterApiKey, state.config?.apiKey]);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMsg('');
    const key = openRouterKey.trim();
    if (!key) {
      setTestStatus('fail');
      setTestMsg('Sila masukkan OpenRouter API Key.');
      return;
    }
    try {
      const res = await fetch('/api/ai/openrouter-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setTestStatus('success');
        setTestMsg(data.message || 'OpenRouter API Key sah & bersambung!');
      } else {
        setTestStatus('fail');
        setTestMsg(data?.error || 'OpenRouter API Key tidak sah atau kuota habis.');
      }
    } catch (e: any) {
      setTestStatus('fail');
      setTestMsg(e.message || 'Ralat sambungan ujian.');
    }
  };

  // --- SMART FILTER ---
  function smartFilter(posts: any[]) {
    const stopWords = ["yang", "dan", "di", "ke", "dari", "ini", "itu", "ada", "saya", "aku", "the", "is", "a", "an", "i"];
    return posts
      .filter(post => post.text && post.text.trim().length > 10)
      .filter((post, index, self) => index === self.findIndex(t => t.text?.substring(0,50) === post.text?.substring(0,50)))
      .map(post => ({
        id: post.id,
        time: post.timestamp,
        keywords: extractKeywords(post.text, stopWords),
        text: post.text.length > 200 ? post.text.substring(0, 200) + "..." : post.text,
        platform: post.platform || "facebook"
      }));
  }

  function extractKeywords(text: string, stopWords: string[]) {
    return text.toLowerCase().replace(/[^\w\s]/g, "").split(" ")
      .filter(word => word.length > 3 && !stopWords.includes(word)).slice(0, 15);
  }

  function splitIntoChunks(data: any[], size = CONFIG.chunkSize) {
    const chunks = [];
    for (let i = 0; i < data.length; i += size) {
      chunks.push(data.slice(i, i + size));
    }
    return chunks;
  }

  async function callAI(prompt: string, model = CONFIG.smallModel) {
    if (!openRouterKey) {
        throw new Error("OpenRouter API Key required to run AI analysis.");
    }
    
    // For simplicity, using OpenRouter as requested in code
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization":  `Bearer ${openRouterKey}`,
        "Content-Type":   "application/json",
        "HTTP-Referer":   "http://localhost:3000",
        "X-Title":        "RedHorizon OSINT"
      },
      body: JSON.stringify({
        model,
        max_tokens: CONFIG.maxTokensPerRequest,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async function analyzeChunk(chunk: any[], chunkIndex: number) {
    const cacheKey = `chunk_${chunkIndex}_${JSON.stringify(chunk).substring(0, 50)}`;
    if (getCached(cacheKey)) return getCached(cacheKey).result;

    const prompt = `Analisis posts media sosial ini. Output MUST be valid JSON sahaja, tiada teks lain:
{
  "gaya_bahasa": "formal/tidak formal/rojak/lain",
  "emosi_dominan": "marah/sedih/gembira/neutral",
  "topik_utama": ["topik1", "topik2"],
  "perkataan_unik": ["perkataan1", "perkataan2"],
  "waktu_aktif": ["pagi/tengahari/malam"],
  "mencurigakan": true,
  "sebab": "ringkasan"
}
Data: ${JSON.stringify(chunk)}`;

    const result = await callAI(prompt, CONFIG.smallModel);
    try {
      // Find JSON block if wrapped
      const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      setCache(cacheKey, parsed);
      return parsed;
    } catch {
      return { raw: result, parsed: false, mencurigakan: true }; // default to true if failed
    }
  }

  async function deepAnalysis(summaries: any[], profileInfo: any) {
    const cacheKey = `deep_${profileInfo.id}_${Date.now()}`;
    const prompt = `Kamu adalah pakar OSINT. Analisis ringkasan ini dan buat kesimpulan. Output MUST be valid JSON sahaja:
{
  "identiti_sebenar": {
    "jantina_dianggar": "",
    "umur_dianggar": "",
    "lokasi_dianggar": "",
    "bahasa_ibunda": ""
  },
  "corak_tingkah_laku": {
    "waktu_aktif_utama": "",
    "frekuensi_post": "",
    "topik_obsesi": []
  },
  "petunjuk_akaun_palsu": {
    "skor_risiko": 0,
    "sebab_utama": [],
    "percanggahan_ditemui": []
  },
  "cadangan_siasatan": []
}
Maklumat Profil: ${JSON.stringify(profileInfo)}
Ringkasan: ${JSON.stringify(summaries)}`;

    // Fallback to primary config model if OpenRouter big model fails or we just use general API
    const result = await callAI(prompt, CONFIG.bigModel);
    try {
      const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      setCache(cacheKey, parsed);
      return parsed;
    } catch {
      return { raw: result };
    }
  }

  const runAnalysis = async () => {
    const effectiveKey = openRouterKey || state.config?.apiKey;
    if (!effectiveKey) {
        onLog("Sila masukkan API Key (OpenRouter / Gemini) yang sah.", "error");
        return;
    }

    try {
        setLoading(true);
        setResult(null);
        
        let allPosts = [];
        try {
            allPosts = JSON.parse(jsonInput);
        } catch {
            throw new Error("Format JSON Posts tidak sah");
        }

        const profileInfo = { id: targetId, name: targetName };
        
        setStatusText("Langkah 1: Filter data mentah (Smart Filter)...");
        onLog(`Mula analisis: ${profileInfo.name} (${allPosts.length} post)`, 'info');
        
        const filteredPosts = smartFilter(allPosts);
        onLog(`Selepas filter: ${filteredPosts.length} post`, 'success');

        setStatusText("Langkah 2: Pecah kepada chunks...");
        const chunks = splitIntoChunks(filteredPosts);
        
        setStatusText("Langkah 3: Analisis peringkat 1 (Model Kecil)...");
        const chunkSummaries = [];
        for (let i = 0; i < chunks.length; i++) {
            setStatusText(`Analisis chunk ${i + 1}/${chunks.length}...`);
            const summary = await analyzeChunk(chunks[i], i);
            chunkSummaries.push(summary);
            await new Promise(r => setTimeout(r, 1000));
        }

        const suspiciousChunks = chunkSummaries.filter(s => s.mencurigakan);
        onLog(`Chunks mencurigakan: ${suspiciousChunks.length}`, suspiciousChunks.length > 0 ? 'warning' : 'success');

        let deepResult = null;
        if (suspiciousChunks.length > 0) {
            setStatusText("Langkah 4: Analisis Mendalam (Model Besar)...");
            onLog("Jalankan deep analysis...", 'info');
            deepResult = await deepAnalysis(chunkSummaries, profileInfo);
        }

        setStatusText("Selesai.");
        onLog("Analisis OSINT Engine selesai.", 'success');
        
        const finalResult = {
            profil: profileInfo,
            statistik: {
                jumlah_post_asal: allPosts.length,
                jumlah_post_filter: filteredPosts.length,
                jumlah_chunks: chunks.length,
                chunks_mencurigakan: suspiciousChunks.length
            },
            analisis_ringkas: chunkSummaries,
            analisis_mendalam: deepResult,
            timestamp: new Date().toISOString()
        };

        setResult(finalResult);

        // Auto-add to graph if deep analysis produced results
        if (deepResult && deepResult.petunjuk_akaun_palsu) {
            const nodeId = `osint_target_${targetId}`;
            dispatch({
                type: 'UPDATE_GRAPH',
                payload: {
                    nodes: [{
                        id: nodeId,
                        label: targetName,
                        type: deepResult.petunjuk_akaun_palsu.skor_risiko > 50 ? 'suspicious' : 'person',
                        details: JSON.stringify(deepResult, null, 2)
                    }],
                    links: []
                }
            });
        }

    } catch (e: any) {
        onLog(`Ralat: ${e.message}`, 'error');
        setStatusText("Ralat berlaku. Sila semak log.");
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80  p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#0a0a0a] border border-[#ff0033] text-white flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-[#ff0033]/10 p-4 border-b border-[#ff0033]">
          <h2 className="text-xl font-black uppercase text-[#ff0033] flex items-center gap-2">
            <Cpu /> OSINT AI ENGINE <span className="text-xs text-gray-400 font-normal ml-2">Smart Filter & Chunking Phase</span>
          </h2>
          <div className="absolute top-10 left-4 text-[10px] text-[#ff0033] border border-[#ff0033]/30 inline-block px-1 bg-[#ff0033]/10">⚠️ MENGGUNAKAN KUOTA TOKEN AI</div>
          <button onClick={onClose}><X className="text-[#ff0033] hover:text-white" /></button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            
            <div className="flex flex-col gap-2 p-3 bg-black/60 border border-gray-800 rounded-lg">
                <label className="text-xs text-[#ff0033] font-bold flex justify-between">
                    <span>OPENROUTER API KEY</span>
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline text-gray-500 hover:text-white">Dapatkan Key (Percuma)</a>
                </label>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 flex items-center">
                        <input 
                            type={showKey ? "text" : "password"}
                            value={openRouterKey}
                            onChange={e => setOpenRouterKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                            className="w-full bg-black border border-gray-700 p-2 pr-10 text-sm focus:border-[#ff0033] outline-none font-mono text-white"
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-2 text-gray-400 hover:text-white p-1"
                            title={showKey ? "Sembunyikan Kunci" : "Pamerkan Kunci"}
                        >
                            {showKey ? <EyeOff className="w-4 h-4 text-[#ff0033]" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testStatus === 'testing'}
                        className={`px-3 py-2 text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 border ${
                            testStatus === 'testing'
                                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                                : testStatus === 'success'
                                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                                : testStatus === 'fail'
                                ? 'bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60'
                                : 'bg-zinc-900 border-gray-700 text-zinc-300 hover:text-white hover:border-gray-500'
                        }`}
                    >
                        {testStatus === 'testing' ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{testStatus === 'testing' ? 'MENGUJI...' : testStatus === 'success' ? 'ONLINE' : 'UJI SAMBUNGAN'}</span>
                    </button>
                </div>

                {testMsg && (
                    <div className={`p-2 rounded text-[11px] border font-mono flex items-start gap-2 ${
                        testStatus === 'success' 
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                            : 'bg-red-950/40 border-red-500/40 text-red-300'
                    }`}>
                        {testStatus === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-snug">{testMsg}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-xs text-[#ff0033] font-bold">TARGET NAME</label>
                    <input 
                        value={targetName}
                        onChange={e => setTargetName(e.target.value)}
                        placeholder="Contoh: Ahmad Bin Ali"
                        className="bg-black border border-gray-700 p-2 text-sm focus:border-[#ff0033] outline-none"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-xs text-[#ff0033] font-bold">TARGET ID</label>
                    <input 
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                        placeholder="Contoh: 100012345678"
                        className="bg-black border border-gray-700 p-2 text-sm focus:border-[#ff0033] outline-none"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2 flex-1">
                <div className="flex justify-between items-end">
                    <div>
                        <label className="text-xs text-[#ff0033] font-bold">JSON POSTS DATA</label>
                        <p className="text-[10px] text-gray-500 mt-1">Sila masukkan array JSON dari hasil scrape laman sosial (kemestian ada 'text', boleh tambah 'id' & 'timestamp').</p>
                    </div>
                    <button 
                        onClick={() => setJsonInput('[\n  { "id": "1", "text": "Weh korang tengok la cerita ni memang best gila", "timestamp": "2024-01-10 23:45" },\n  { "id": "2", "text": "Sesiapa nak duit cepat? Contact saya sekarang!!!", "timestamp": "2024-01-11 02:30" },\n  { "id": "3", "text": "Dah ramai yang berjaya dengan bisnes saya ni", "timestamp": "2024-01-12 01:15" }\n]')}
                        className="text-[10px] bg-white/10 hover:bg-[#ff0033] hover:text-black px-2 py-1 rounded transition-colors"
                    >
                        + MASUKKAN CONTOH FORMAT
                    </button>
                </div>
                <textarea 
                    value={jsonInput}
                    onChange={e => setJsonInput(e.target.value)}
                    className="bg-black border border-gray-700 p-2 text-xs font-mono h-40 focus:border-[#ff0033] outline-none resize-y"
                    placeholder={`Contoh format:\n[\n  { "text": "Saya suka OSINT" },\n  { "text": "Ini post kedua" }\n]`}
                />
            </div>

            {loading && (
                <div className="p-4 border border-[#ff0033] bg-[#ff0033]/10 text-[#ff0033] flex items-center gap-3">
                    <Loader2 className="animate-spin" />
                    <div>
                        <div className="font-bold">PROCESSING...</div>
                        <div className="text-xs">{statusText}</div>
                    </div>
                </div>
            )}

            {!loading && result && (
                <div className="border border-gray-700 p-4 bg-gray-900/50 flex flex-col gap-2">
                    <h3 className="text-[#ff0033] font-bold text-sm border-b border-gray-700 pb-2">HASIL ANALISIS</h3>
                    <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                        <div className="bg-black p-2 border border-gray-800">
                            <span className="text-gray-500 block">POST ASAL</span>
                            <span className="text-lg font-bold">{result.statistik.jumlah_post_asal}</span>
                        </div>
                        <div className="bg-black p-2 border border-gray-800">
                            <span className="text-gray-500 block">FILTERED</span>
                            <span className="text-lg font-bold text-green-500">{result.statistik.jumlah_post_filter}</span>
                        </div>
                        <div className="bg-black p-2 border border-gray-800">
                            <span className="text-gray-500 block">CHUNKS</span>
                            <span className="text-lg font-bold">{result.statistik.jumlah_chunks}</span>
                        </div>
                        <div className="bg-black p-2 border border-gray-800">
                            <span className="text-gray-500 block">SUSPICIOUS</span>
                            <span className={`text-lg font-bold ${result.statistik.chunks_mencurigakan > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                {result.statistik.chunks_mencurigakan}
                            </span>
                        </div>
                    </div>

                    {result.analisis_mendalam && (
                        <div className="bg-black border border-gray-800 p-3 mt-2 text-sm">
                            <div className="flex items-center gap-2 mb-2 text-[#ff0033]"><Brain size={14} /> <strong>PERINCIAN MENDALAM</strong></div>
                            <pre className="text-xs font-mono whitespace-pre-wrap text-gray-300">
                                {JSON.stringify(result.analisis_mendalam, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="bg-black p-4 border-t border-[#ff0033] flex justify-end gap-4">
            <button 
                onClick={onClose}
                className="px-6 py-2 border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800 font-bold uppercase text-sm"
            >
                TUTUP
            </button>
            <button 
                onClick={runAnalysis}
                disabled={loading}
                className="px-6 py-2 bg-[#ff0033] text-black font-black uppercase text-sm flex items-center gap-2 hover:bg-white disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Filter size={16} />}
                JALANKAN ENJIN
            </button>
        </div>
      </div>
    </div>
  );
};

export default OsintAIEngine;
