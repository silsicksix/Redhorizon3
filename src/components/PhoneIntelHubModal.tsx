import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Search, Globe, Shield, ShieldAlert, CheckCircle2, 
  AlertTriangle, Copy, ExternalLink, RefreshCw, Send, MessageCircle, 
  Key, Database, Share2, Plus, Terminal as TerminalIcon, Sparkles, 
  ChevronRight, ArrowRight, Eye, Code, Filter, X, Check, Activity
} from 'lucide-react';
import { Node } from '../types';

interface PhoneIntelHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialNode?: Node;
  initialTab?: 'unified' | 'numverify' | 'serpapi' | 'telegram' | 'whatsapp' | 'keys';
  onAddNodesAndEdges?: (newNodes: Node[], newEdges: Array<{ id: string; source: string; target: string; label: string }>) => void;
}

export const PhoneIntelHubModal: React.FC<PhoneIntelHubModalProps> = ({
  isOpen,
  onClose,
  initialPhone = '',
  initialNode,
  initialTab = 'unified',
  onAddNodesAndEdges
}) => {
  // Input State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeTab, setActiveTab] = useState<'unified' | 'numverify' | 'serpapi' | 'telegram' | 'whatsapp' | 'keys'>(initialTab);
  
  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // API Keys (Stored in LocalStorage)
  const [numverifyKey, setNumverifyKey] = useState(() => localStorage.getItem('redhorizon_numverify_key') || '');
  const [serpapiKey, setSerpapiKey] = useState(() => localStorage.getItem('redhorizon_serpapi_key') || '');
  const [telegramApiId, setTelegramApiId] = useState(() => localStorage.getItem('redhorizon_telegram_api_id') || '');
  const [telegramApiHash, setTelegramApiHash] = useState(() => localStorage.getItem('redhorizon_telegram_api_hash') || '');
  const [keysSaved, setKeysSaved] = useState(false);

  // Key Test Status States
  const [numverifyTestStatus, setNumverifyTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [numverifyTestMsg, setNumverifyTestMsg] = useState('');
  const [serpapiTestStatus, setSerpapiTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [serpapiTestMsg, setSerpapiTestMsg] = useState('');
  const [telegramTestStatus, setTelegramTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [telegramTestMsg, setTelegramTestMsg] = useState('');

  // Results State
  const [report, setReport] = useState<any>(null);
  const [numverifyData, setNumverifyData] = useState<any>(null);
  const [serpapiData, setSerpapiData] = useState<any>(null);
  const [telegramData, setTelegramData] = useState<any>(null);
  const [serpFilter, setSerpFilter] = useState<'all' | 'social' | 'scam_report' | 'business' | 'leak_directory'>('all');

  // Sync initial phone and tab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (initialPhone) {
      setPhoneNumber(initialPhone.replace(/[^\d+]/g, ''));
    } else if (initialNode?.label) {
      const clean = initialNode.label.replace(/[^\d+]/g, '');
      if (clean) setPhoneNumber(clean);
    }
  }, [initialPhone, initialNode, isOpen]);

  // Save API keys to local storage
  const handleSaveKeys = () => {
    localStorage.setItem('redhorizon_numverify_key', numverifyKey.trim());
    localStorage.setItem('redhorizon_serpapi_key', serpapiKey.trim());
    localStorage.setItem('redhorizon_telegram_api_id', telegramApiId.trim());
    localStorage.setItem('redhorizon_telegram_api_hash', telegramApiHash.trim());
    setKeysSaved(true);
    setTimeout(() => setKeysSaved(false), 2500);
  };

  const handleTestNumVerify = async () => {
    setNumverifyTestStatus('testing');
    setNumverifyTestMsg('');
    const key = numverifyKey.trim();
    if (!key) {
      setNumverifyTestStatus('fail');
      setNumverifyTestMsg('Sila masukkan NumVerify API Key terlebih dahulu.');
      return;
    }
    try {
      const res = await fetch('/api/phone/test-numverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setNumverifyTestStatus('success');
        setNumverifyTestMsg(data.message || 'NumVerify API disahkan aktif & sah.');
      } else {
        setNumverifyTestStatus('fail');
        setNumverifyTestMsg(data?.error || 'Kunci NumVerify tidak sah.');
      }
    } catch (e: any) {
      setNumverifyTestStatus('fail');
      setNumverifyTestMsg(e.message || 'Ralat sambungan ujian NumVerify.');
    }
  };

  const handleTestSerpApi = async () => {
    setSerpapiTestStatus('testing');
    setSerpapiTestMsg('');
    const key = serpapiKey.trim();
    if (!key) {
      setSerpapiTestStatus('fail');
      setSerpapiTestMsg('Sila masukkan SerpApi Key terlebih dahulu.');
      return;
    }
    try {
      const res = await fetch('/api/phone/test-serpapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setSerpapiTestStatus('success');
        setSerpapiTestMsg(data.message || 'SerpApi Google Dorking Engine disahkan aktif & sah.');
      } else {
        setSerpapiTestStatus('fail');
        setSerpapiTestMsg(data?.error || 'Kunci SerpApi tidak sah.');
      }
    } catch (e: any) {
      setSerpapiTestStatus('fail');
      setSerpapiTestMsg(e.message || 'Ralat sambungan ujian SerpApi.');
    }
  };

  const handleTestTelegram = async () => {
    setTelegramTestStatus('testing');
    setTelegramTestMsg('');
    const id = telegramApiId.trim();
    const hash = telegramApiHash.trim();
    if (!id || !hash) {
      setTelegramTestStatus('fail');
      setTelegramTestMsg('Sila masukkan Telegram API ID dan API Hash terlebih dahulu.');
      return;
    }
    try {
      const res = await fetch('/api/phone/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiId: id, apiHash: hash })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setTelegramTestStatus('success');
        setTelegramTestMsg(data.message || 'Kredensial Telegram MTProto disahkan aktif & sah.');
      } else {
        setTelegramTestStatus('fail');
        setTelegramTestMsg(data?.error || 'Kredensial Telegram tidak sah.');
      }
    } catch (e: any) {
      setTelegramTestStatus('fail');
      setTelegramTestMsg(e.message || 'Ralat sambungan ujian Telegram.');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper to safely parse JSON response or throw clear error
  const safeParseJsonResponse = async (res: Response, defaultError: string) => {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    
    if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error(`Pelayan mengembalikan respon HTML (${res.status}). Sila pastikan pelayan latar berjalan dan API Key betul.`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(defaultError);
    }
  };

  // Run Comprehensive Unified Scan
  const handleRunComprehensiveScan = async () => {
    if (!phoneNumber.trim()) {
      setError('Sila masukkan nombor telefon sasaran.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/phone/comprehensive-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
          numverifyKey: numverifyKey.trim() || undefined,
          serpapiKey: serpapiKey.trim() || undefined,
          telegramApiId: telegramApiId.trim() || undefined,
          telegramApiHash: telegramApiHash.trim() || undefined,
        })
      });

      const data = await safeParseJsonResponse(res, 'Gagal memproses jawapan imbasan menyeluruh.');
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menjalankan imbasan menyeluruh nombor telefon.');
      }

      setReport(data.report);
      if (data.report.numverify) setNumverifyData(data.report.numverify);
      if (data.report.serpapi) setSerpapiData(data.report.serpapi);
      if (data.report.telegram) setTelegramData(data.report.telegram);
    } catch (err: any) {
      setError(err.message || 'Ralat sambungan pelayan.');
    } finally {
      setLoading(false);
    }
  };

  // Run Individual NumVerify
  const handleRunNumVerify = async () => {
    if (!phoneNumber.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/phone/numverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
          apiKey: numverifyKey.trim() || undefined
        })
      });
      const data = await safeParseJsonResponse(res, 'Ralat membaca respons NumVerify.');
      setNumverifyData(data);
    } catch (err: any) {
      setError(err.message || 'Ralat NumVerify');
    } finally {
      setLoading(false);
    }
  };

  // Run Individual SerpApi
  const handleRunSerpApi = async (customQuery?: string) => {
    if (!phoneNumber.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/phone/serpapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
          apiKey: serpapiKey.trim() || undefined,
          query: customQuery || undefined
        })
      });
      const data = await safeParseJsonResponse(res, 'Ralat membaca respons SerpApi.');
      setSerpapiData(data);
    } catch (err: any) {
      setError(err.message || 'Ralat SerpApi');
    } finally {
      setLoading(false);
    }
  };

  // Run Individual Telegram Recon
  const handleRunTelegram = async () => {
    if (!phoneNumber.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/phone/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
          apiId: telegramApiId.trim() || undefined,
          apiHash: telegramApiHash.trim() || undefined
        })
      });
      const data = await safeParseJsonResponse(res, 'Ralat membaca respons Telegram.');
      setTelegramData(data);
    } catch (err: any) {
      setError(err.message || 'Ralat Telegram');
    } finally {
      setLoading(false);
    }
  };

  // Export nodes to canvas graph
  const handleExportToGraph = () => {
    if (!report || !onAddNodesAndEdges) return;
    const nodes: Node[] = (report.suggestedNodes || []).map((n: any) => ({
      id: n.id,
      label: n.label,
      type: n.type || 'phone',
      details: n.details || '',
      imageUrl: n.imageUrl || undefined
    }));

    const edges = (report.suggestedEdges || []).map((e: any, idx: number) => ({
      id: `edge_phone_${Date.now()}_${idx}`,
      source: e.source,
      target: e.target,
      label: e.label || 'LINKED_TO'
    }));

    onAddNodesAndEdges(nodes, edges);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-[#090d16] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden font-mono text-zinc-200">
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Smartphone size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide uppercase">
                  PHONE INTELLIGENCE HUB
                </h2>
                <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-semibold">
                  v2.9.1 TELCO + SERP + TELEGRAM
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Pusat Risikan Nombor Telefon Bersepadu: NumVerify Telco Carrier + SerpApi Dorking + Telegram Bellingcat MTProto + WhatsApp Recon.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('keys')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                activeTab === 'keys'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <Key size={13} />
              <span>API Keys</span>
              {(numverifyKey || serpapiKey) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* INPUT TARGET BAR */}
        <div className="px-5 py-3 bg-zinc-900/60 border-b border-zinc-800/80 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px] flex items-center gap-2 bg-black/60 border border-zinc-700/70 rounded-lg px-3 py-1.5 focus-within:border-amber-500 transition-colors">
            <Smartphone size={16} className="text-amber-400 shrink-0" />
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Masukkan nombor telefon (cth: +60123456789 atau 0123456789)"
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleRunComprehensiveScan()}
            />
            {phoneNumber && (
              <button
                onClick={() => setPhoneNumber('')}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={handleRunComprehensiveScan}
            disabled={loading || !phoneNumber.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Mengimbas...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Imbas Menyeluruh (Multi-Source)</span>
              </>
            )}
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 px-5 pt-2 bg-zinc-950/50 border-b border-zinc-800/80 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('unified')}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-medium transition-all whitespace-nowrap ${
              activeTab === 'unified'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity size={14} />
            <span>Unified Threat Dossier</span>
            {report && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
          </button>

          <button
            onClick={() => { setActiveTab('numverify'); if (!numverifyData && phoneNumber) handleRunNumVerify(); }}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-medium transition-all whitespace-nowrap ${
              activeTab === 'numverify'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe size={14} />
            <span>NumVerify Telco</span>
            {numverifyData && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
          </button>

          <button
            onClick={() => { setActiveTab('serpapi'); if (!serpapiData && phoneNumber) handleRunSerpApi(); }}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-medium transition-all whitespace-nowrap ${
              activeTab === 'serpapi'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search size={14} />
            <span>SerpApi Dorking & Scams</span>
            {serpapiData?.results?.length ? (
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
                {serpapiData.results.length}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => { setActiveTab('telegram'); if (!telegramData && phoneNumber) handleRunTelegram(); }}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-medium transition-all whitespace-nowrap ${
              activeTab === 'telegram'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Send size={14} />
            <span>Telegram Bellingcat MTProto</span>
            {telegramData && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-medium transition-all whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'border-green-500 text-green-400 bg-green-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageCircle size={14} />
            <span>WhatsApp Recon</span>
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-medium transition-all whitespace-nowrap ${
              activeTab === 'keys'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Key size={14} />
            <span>Konfigurasi Kunci API</span>
          </button>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* ERROR ALERT */}
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-3">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: UNIFIED DOSSIER */}
          {activeTab === 'unified' && (
            <div className="space-y-4">
              {!report && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 space-y-3">
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-amber-400">
                    <Smartphone size={36} />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    Sedia Untuk Imbasan Taktikal
                  </h3>
                  <p className="text-xs max-w-md text-zinc-400">
                    Masukkan nombor telefon di bahagian atas dan tekan butang <span className="text-amber-400 font-bold">Imbas Menyeluruh</span> untuk menjalankan siasatan multi-vektor serentak.
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <RefreshCw size={32} className="text-amber-400 animate-spin" />
                  <p className="text-xs text-amber-300 animate-pulse font-medium">
                    Menghubungi NumVerify, SerpApi Dorks, Telegram MTProto & Enjin AI...
                  </p>
                </div>
              )}

              {report && !loading && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* METRIC BADGES / TOP CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* Carrier & Country */}
                    <div className="p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1">
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Telco Operator</span>
                        <Globe size={13} className="text-cyan-400" />
                      </div>
                      <div className="text-sm font-bold text-white">
                        {report.numverify?.carrier || 'Unknown Carrier'}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {report.numverify?.country_name || 'Global'} ({report.numverify?.line_type || 'Mobile'})
                      </div>
                    </div>

                    {/* Threat Score */}
                    <div className="p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1">
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Skor Ancaman / Risiko</span>
                        <ShieldAlert size={13} className={report.aiAnalysis?.threatScore > 50 ? 'text-red-400' : 'text-emerald-400'} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-bold ${
                          report.aiAnalysis?.threatScore > 60 ? 'text-red-400' : report.aiAnalysis?.threatScore > 30 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {report.aiAnalysis?.threatScore ?? 15}%
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold uppercase">
                          {report.aiAnalysis?.riskLevel || 'LOW'}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {report.aiAnalysis?.scamWarning ? 'Amaran Scam Dikesan!' : 'Tiada rekod penipuan kritikal'}
                      </div>
                    </div>

                    {/* Telegram Presence */}
                    <div className="p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1">
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Telegram Status</span>
                        <Send size={13} className="text-sky-400" />
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                        <span>{report.telegram?.publicProfileFound ? 'Profil Awam Dikesan' : 'Pautan Aktif Tersedia'}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        <a 
                          href={report.telegram?.tgWebLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-sky-400 hover:underline flex items-center gap-1"
                        >
                          <span>Buka t.me</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>

                    {/* WhatsApp Presence */}
                    <div className="p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1">
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                        <span>WhatsApp Deep Link</span>
                        <MessageCircle size={13} className="text-green-400" />
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        <span>Sedia Dihubungi</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        <a 
                          href={report.whatsapp?.waLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-green-400 hover:underline flex items-center gap-1"
                        >
                          <span>Buka wa.me</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>

                  </div>

                  {/* EXECUTIVE SUMMARY */}
                  <div className="p-4 bg-zinc-900/80 border border-amber-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={14} />
                        Ringkasan Risikan Eksekutif (AI Synthesis)
                      </span>
                      <button
                        onClick={() => handleCopy(report.aiAnalysis?.executiveSummary || '', 'summary')}
                        className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'summary' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        <span>Salin Dossier</span>
                      </button>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-line">
                      {report.aiAnalysis?.executiveSummary}
                    </p>
                  </div>

                  {/* ACTION BAR: INJECT TO GRAPH CANVAS */}
                  <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Database size={14} className="text-amber-400" />
                        <span>Eksport Penemuan ke Kanvas Graf</span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Jana {report.suggestedNodes?.length || 0} nod entiti dan {report.suggestedEdges?.length || 0} hubungan korelasi terus ke graf analisis anda.
                      </div>
                    </div>

                    <button
                      onClick={handleExportToGraph}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition-all"
                    >
                      <Plus size={14} />
                      <span>Eksport Ke Graf Kanvas</span>
                    </button>
                  </div>

                  {/* SERPAPI HIGHLIGHTS PREVIEW */}
                  {report.serpapi?.results?.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="font-semibold text-zinc-300 uppercase">Jejak Digital Ditemui ({report.serpapi.results.length})</span>
                        <button 
                          onClick={() => setActiveTab('serpapi')}
                          className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <span>Lihat Semua Carian SerpApi</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {report.serpapi.results.slice(0, 4).map((item: any, idx: number) => (
                          <div key={idx} className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs space-y-1">
                            <a 
                              href={item.link} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="font-semibold text-amber-300 hover:underline line-clamp-1 flex items-center gap-1"
                            >
                              <span>{item.title}</span>
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                            <p className="text-[11px] text-zinc-400 line-clamp-2">
                              {item.snippet}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* TAB 2: NUMVERIFY DIRECT TELCO */}
          {activeTab === 'numverify' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between p-3 bg-zinc-900/80 border border-cyan-500/30 rounded-xl">
                <div>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Globe size={14} />
                    NumVerify.com Telco Carrier Intelligence
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Pengesahan nombor telefon antarabangsa, pembekal telekomunikasi, dan zon geografi rasmi.
                  </p>
                </div>
                <button
                  onClick={handleRunNumVerify}
                  disabled={loading || !phoneNumber.trim()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-bold text-xs uppercase flex items-center gap-1.5"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  <span>Semak NumVerify</span>
                </button>
              </div>

              {numverifyData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-zinc-300 uppercase border-b border-zinc-800 pb-2">
                      Spesifikasi Nombor
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-zinc-800/50">
                        <span className="text-zinc-400">Kesahihan (Valid):</span>
                        <span className={`font-bold ${numverifyData.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                          {numverifyData.valid ? 'SAH (ACTIVE)' : 'TIDAK SAH / INVALID'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-800/50">
                        <span className="text-zinc-400">Format Antarabangsa:</span>
                        <span className="font-mono text-amber-300 font-bold">{numverifyData.international_format || numverifyData.number}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-800/50">
                        <span className="text-zinc-400">Format Tempatan:</span>
                        <span className="font-mono text-zinc-200">{numverifyData.local_format || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-800/50">
                        <span className="text-zinc-400">Kod Negara & Prefix:</span>
                        <span className="text-zinc-200">{numverifyData.country_name} ({numverifyData.country_code} / {numverifyData.country_prefix})</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-zinc-300 uppercase border-b border-zinc-800 pb-2">
                      Maklumat Telco & Rangkaian
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-zinc-800/50">
                        <span className="text-zinc-400">Syarikat Telco / Carrier:</span>
                        <span className="font-bold text-cyan-300">{numverifyData.carrier || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-800/50">
                        <span className="text-zinc-400">Jenis Talian (Line Type):</span>
                        <span className="font-bold uppercase text-zinc-200">{numverifyData.line_type || 'Mobile'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-800/50">
                        <span className="text-zinc-400">Lokasi Berdaftar:</span>
                        <span className="text-zinc-200">{numverifyData.location || 'Kebangsaan / National'}</span>
                      </div>
                      {numverifyData.error && (
                        <div className="p-2 bg-amber-950/50 border border-amber-500/30 rounded text-[11px] text-amber-300">
                          {numverifyData.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERPAPI DIGITAL FOOTPRINTS */}
          {activeTab === 'serpapi' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between p-3 bg-zinc-900/80 border border-emerald-500/30 rounded-xl">
                <div>
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Search size={14} />
                    SerpApi.com Google Dorking & Scam Intelligence
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Carian jejak digital merentas Google, forum awam, pangkalan data penipuan (Whoscall, CCID, Truecaller), dan iklan baris.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunSerpApi(`"${phoneNumber}" scam OR penipu OR aduan`)}
                    className="px-2.5 py-1.5 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 hover:bg-red-900/60 text-[11px] font-semibold"
                  >
                    Dork Scam
                  </button>
                  <button
                    onClick={() => handleRunSerpApi()}
                    disabled={loading || !phoneNumber.trim()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold text-xs uppercase flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    <span>Carian Penuh</span>
                  </button>
                </div>
              </div>

              {/* CATEGORY FILTER */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500 text-[11px]">Tapis Kategori:</span>
                {(['all', 'social', 'scam_report', 'business', 'leak_directory'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSerpFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all capitalize ${
                      serpFilter === cat
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* SEARCH RESULTS LIST */}
              {serpapiData?.results && (
                <div className="space-y-2">
                  {serpapiData.results
                    .filter((r: any) => serpFilter === 'all' || r.category === serpFilter)
                    .map((item: any, idx: number) => (
                      <div key={idx} className="p-3 bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-xl space-y-1.5 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            item.category === 'scam_report'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : item.category === 'social'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : item.category === 'business'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {item.category?.replace('_', ' ') || 'General'}
                          </span>
                          <span className="text-[10px] text-zinc-500 truncate max-w-xs">{item.displayed_link}</span>
                        </div>

                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1.5"
                        >
                          <span>{item.title}</span>
                          <ExternalLink size={11} className="shrink-0" />
                        </a>

                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {item.snippet}
                        </p>
                      </div>
                    ))}

                  {serpapiData.results.length === 0 && (
                    <div className="p-8 text-center text-zinc-500 text-xs bg-zinc-900/40 rounded-xl border border-zinc-800">
                      Tiada rekod padanan ditemui dalam indeks SerpApi untuk nombor ini.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TELEGRAM BELLINGCAT MTPROTO */}
          {activeTab === 'telegram' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-zinc-900/80 border border-sky-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                    <Send size={14} />
                    Bellingcat Telegram Phone Checker (MTProto Integration)
                  </h3>
                  <button
                    onClick={handleRunTelegram}
                    disabled={loading || !phoneNumber.trim()}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-black font-bold text-xs uppercase flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    <span>Semak Telegram</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Menggunakan metodologi Bellingcat Telethon: Semakan kenalan sementara (`ImportContactsRequest` &rarr; `DeleteContactsRequest`) dan pengekstrakan profil metadata tanpa menganggu privasi sasaran.
                </p>
              </div>

              {/* QUICK LINKS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a
                  href={`tg://resolve?phone=${phoneNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-sky-950/40 border border-sky-500/30 hover:border-sky-400 rounded-xl flex items-center justify-between text-xs text-sky-300 font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Send size={14} />
                    <span>Buka Telegram App</span>
                  </span>
                  <ExternalLink size={12} />
                </a>

                <a
                  href={`https://t.me/+${phoneNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-zinc-900/70 border border-zinc-800 hover:border-sky-500/50 rounded-xl flex items-center justify-between text-xs text-zinc-300 font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Globe size={14} className="text-sky-400" />
                    <span>Pautan Web t.me/+</span>
                  </span>
                  <ExternalLink size={12} />
                </a>

                <button
                  onClick={() => handleCopy(`tg://resolve?phone=${phoneNumber.replace(/\D/g, '')}`, 'tgu')}
                  className="p-3 bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-between text-xs text-zinc-300 font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Copy size={14} />
                    <span>Salin URI Telegram</span>
                  </span>
                  {copiedKey === 'tgu' ? <Check size={12} className="text-green-400" /> : null}
                </button>
              </div>

              {/* BELLINGCAT TELETHON SCRIPT RUNNER */}
              <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TerminalIcon size={14} className="text-amber-400" />
                    <span className="text-xs font-bold text-zinc-200 uppercase">
                      Bellingcat MTProto Telethon Automation Script (Python)
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(telegramData?.bellingcatScript || '', 'script')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px] text-zinc-300 transition-colors"
                  >
                    {copiedKey === 'script' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    <span>Salin Skrip Python</span>
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400">
                  Untuk menjalankan semakan MTProto terus pada Termux atau Linux menggunakan akaun Telegram anda, jalankan skrip di bawah:
                </p>

                <div className="relative">
                  <pre className="p-3 bg-black/80 border border-zinc-800 rounded-lg text-[11px] text-emerald-400 font-mono overflow-x-auto max-h-56">
                    {telegramData?.bellingcatScript || '# Masukkan nombor telefon dan tekan Semak Telegram untuk menjana skrip.'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WHATSAPP RECON */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-zinc-900/80 border border-green-500/30 rounded-xl space-y-1">
                <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
                  <MessageCircle size={14} />
                  WhatsApp Direct Reconnaissance
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Akses terus ke WhatsApp Web, API endpoint pengesahan pendaftaran, dan semakan avatar profil.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`https://wa.me/${phoneNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 bg-zinc-900/70 border border-zinc-800 hover:border-green-500 rounded-xl flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Buka Chat wa.me</div>
                      <div className="text-[11px] text-zinc-400">https://wa.me/{phoneNumber.replace(/\D/g, '')}</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-zinc-500" />
                </a>

                <a
                  href={`https://web.whatsapp.com/send?phone=${phoneNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 bg-zinc-900/70 border border-zinc-800 hover:border-green-500 rounded-xl flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Globe size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">WhatsApp Web Client</div>
                      <div className="text-[11px] text-zinc-400">Melancarkan WhatsApp Web Desktop</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-zinc-500" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 6: API KEYS MANAGER */}
          {activeTab === 'keys' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Key size={14} className="text-amber-400" />
                      Konfigurasi Kunci API (NumVerify, SerpApi & Telegram)
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Kunci ini disimpan secara selamat dalam pelayar anda dan dihantar ke pelayan untuk pemprosesan API.
                    </p>
                  </div>

                  <button
                    onClick={handleSaveKeys}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    {keysSaved ? <Check size={14} /> : <Key size={14} />}
                    <span>{keysSaved ? 'Disimpan!' : 'Simpan Kunci API'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* NumVerify Key */}
                  <div className="space-y-1.5 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span>NumVerify API Key</span>
                      <a 
                        href="https://numverify.com" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>Dapatkan Kunci</span>
                        <ExternalLink size={10} />
                      </a>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={numverifyKey}
                        onChange={(e) => setNumverifyKey(e.target.value)}
                        placeholder="cth: 9a8b7c6d5e4f3g2h1..."
                        className="w-full px-3 py-1.5 bg-black/80 border border-zinc-700/80 rounded-lg text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleTestNumVerify}
                        disabled={numverifyTestStatus === 'testing'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 shrink-0 border ${
                          numverifyTestStatus === 'testing'
                            ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                            : numverifyTestStatus === 'success'
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                            : numverifyTestStatus === 'fail'
                            ? 'bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
                        }`}
                      >
                        {numverifyTestStatus === 'testing' ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        <span>{numverifyTestStatus === 'testing' ? 'MENGUJI...' : numverifyTestStatus === 'success' ? 'ONLINE' : 'UJI'}</span>
                      </button>
                    </div>

                    {numverifyTestMsg && (
                      <div className={`p-2 rounded text-[11px] border font-mono flex items-start gap-1.5 ${
                        numverifyTestStatus === 'success' 
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                          : 'bg-red-950/40 border-red-500/40 text-red-300'
                      }`}>
                        {numverifyTestStatus === 'success' ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-snug">{numverifyTestMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* SerpApi Key */}
                  <div className="space-y-1.5 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span>SerpApi Key (Google Dorking)</span>
                      <a 
                        href="https://serpapi.com" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>Dapatkan Kunci</span>
                        <ExternalLink size={10} />
                      </a>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={serpapiKey}
                        onChange={(e) => setSerpapiKey(e.target.value)}
                        placeholder="cth: 3a2b1c4d5e6f7g8h9..."
                        className="w-full px-3 py-1.5 bg-black/80 border border-zinc-700/80 rounded-lg text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleTestSerpApi}
                        disabled={serpapiTestStatus === 'testing'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 shrink-0 border ${
                          serpapiTestStatus === 'testing'
                            ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                            : serpapiTestStatus === 'success'
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                            : serpapiTestStatus === 'fail'
                            ? 'bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
                        }`}
                      >
                        {serpapiTestStatus === 'testing' ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        <span>{serpapiTestStatus === 'testing' ? 'MENGUJI...' : serpapiTestStatus === 'success' ? 'ONLINE' : 'UJI'}</span>
                      </button>
                    </div>

                    {serpapiTestMsg && (
                      <div className={`p-2 rounded text-[11px] border font-mono flex items-start gap-1.5 ${
                        serpapiTestStatus === 'success' 
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                          : 'bg-red-950/40 border-red-500/40 text-red-300'
                      }`}>
                        {serpapiTestStatus === 'success' ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-snug">{serpapiTestMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* Telegram Credentials Container */}
                  <div className="md:col-span-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Send size={13} className="text-sky-400" />
                        Telegram MTProto Credentials (API ID + HASH)
                      </span>
                      <div className="flex items-center gap-2">
                        <a 
                          href="https://my.telegram.org" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
                        >
                          <span>Telegram Portal</span>
                          <ExternalLink size={10} />
                        </a>
                        <button
                          type="button"
                          onClick={handleTestTelegram}
                          disabled={telegramTestStatus === 'testing'}
                          className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 shrink-0 border ${
                            telegramTestStatus === 'testing'
                              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                              : telegramTestStatus === 'success'
                              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                              : telegramTestStatus === 'fail'
                              ? 'bg-red-950/60 border-red-500/50 text-red-300 hover:bg-red-900/60'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
                          }`}
                        >
                          {telegramTestStatus === 'testing' ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          <span>{telegramTestStatus === 'testing' ? 'MENGUJI...' : telegramTestStatus === 'success' ? 'ONLINE' : 'UJI SAMBUNGAN TELEGRAM'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-zinc-400">Telegram API ID</label>
                        <input
                          type="text"
                          value={telegramApiId}
                          onChange={(e) => setTelegramApiId(e.target.value)}
                          placeholder="cth: 12345678"
                          className="w-full px-3 py-1.5 bg-black/80 border border-zinc-700/80 rounded-lg text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-zinc-400">Telegram API HASH</label>
                        <input
                          type="password"
                          value={telegramApiHash}
                          onChange={(e) => setTelegramApiHash(e.target.value)}
                          placeholder="cth: abcdef1234567890abcdef..."
                          className="w-full px-3 py-1.5 bg-black/80 border border-zinc-700/80 rounded-lg text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    {telegramTestMsg && (
                      <div className={`p-2 rounded text-[11px] border font-mono flex items-start gap-1.5 ${
                        telegramTestStatus === 'success' 
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                          : 'bg-red-950/40 border-red-500/40 text-red-300'
                      }`}>
                        {telegramTestStatus === 'success' ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-snug">{telegramTestMsg}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/80 bg-zinc-950/90 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Enjin Risikan Nombor Telefon RedHorizon Aktif</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PhoneIntelHubModal;
