import React, { useState, useEffect } from 'react';
import { 
  UserSearch, 
  X, 
  Loader2, 
  BrainCircuit, 
  CheckSquare, 
  Square, 
  Plus, 
  ShieldCheck, 
  ExternalLink, 
  Sparkles, 
  AlertCircle,
  Fingerprint,
  Search,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  Tag,
  Network,
  Share2,
  Globe,
  Compass,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Node, SmartSocialResolutionResult } from '../types';
import { runSocialMediaTransform, runSmartSocialEntityResolution } from '../services/geminiService';
import { searchTavilyImages } from '../services/searchService';

interface SocialReconProps {
  targetNode: Node;
  tavilyApiKey: string;
  onClose: () => void;
  onComplete: (nodes: Node[]) => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LinkedIn: { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-700' },
  Facebook: { bg: 'bg-indigo-950/60', text: 'text-indigo-400', border: 'border-indigo-700' },
  'Twitter/X': { bg: 'bg-slate-900', text: 'text-slate-200', border: 'border-slate-700' },
  'X/Twitter': { bg: 'bg-slate-900', text: 'text-slate-200', border: 'border-slate-700' },
  Instagram: { bg: 'bg-pink-950/60', text: 'text-pink-400', border: 'border-pink-700' },
  TikTok: { bg: 'bg-teal-950/60', text: 'text-teal-300', border: 'border-teal-700' },
  YouTube: { bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-700' },
  GitHub: { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-700' },
  Reddit: { bg: 'bg-orange-950/60', text: 'text-orange-400', border: 'border-orange-700' },
  Threads: { bg: 'bg-neutral-900', text: 'text-neutral-300', border: 'border-neutral-700' },
  Telegram: { bg: 'bg-sky-950/60', text: 'text-sky-400', border: 'border-sky-700' },
};

const SocialRecon: React.FC<SocialReconProps> = ({ targetNode, tavilyApiKey, onClose, onComplete, onLog }) => {
  const [activeTab, setActiveTab] = useState<'smart_resolve' | 'multi_sweep' | 'dork_matrix'>('smart_resolve');
  const [customTarget, setCustomTarget] = useState(targetNode.label || '');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Tab 1: Smart Resolution State
  const [smartResult, setSmartResult] = useState<SmartSocialResolutionResult | null>(null);
  const [selectedSmartProfiles, setSelectedSmartProfiles] = useState<Set<number>>(new Set());

  // Tab 2: Multi Sweep State
  const [hasSearchedSweep, setHasSearchedSweep] = useState(false);
  const [foundNodes, setFoundNodes] = useState<Node[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Auto detect if target looks like a URL or handle
  useEffect(() => {
    if (targetNode.label) {
      setCustomTarget(targetNode.label);
    }
  }, [targetNode]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
    onLog(`Disalin ke papan klip: "${text}"`, 'info');
  };

  // --- SMART RESOLUTION EXECUTION ---
  const handleExecuteSmartResolve = async () => {
    const targetQuery = customTarget.trim() || targetNode.label;
    if (!targetQuery) return;

    setLoading(true);
    setSmartResult(null);
    onLog(`[Smart Entity Resolution] Menganalisis ketidakpadanan Handle vs Nama Paparan untuk "${targetQuery}"...`, 'info');

    try {
      const result = await runSmartSocialEntityResolution(targetQuery, keywords);
      setSmartResult(result);
      if (result.discoveredProfiles && result.discoveredProfiles.length > 0) {
        setSelectedSmartProfiles(new Set(result.discoveredProfiles.map((_, i) => i)));
        onLog(`[Smart Resolution] Berjaya menguraikan ${result.discoveredProfiles.length} profil dengan pengesanan penyamaran fonetik & vanity handle.`, 'success');
      } else {
        onLog(`[Smart Resolution] Analisis siap. Matrik dorking & variasi fonetik sedia digunakan.`, 'info');
      }
    } catch (e: any) {
      onLog(`Smart Entity Resolution ralat: ${e.message || e}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- CLASSIC MULTI SWEEP EXECUTION ---
  const handleExecuteMultiSweep = async () => {
    const targetQuery = customTarget.trim() || targetNode.label;
    if (!targetQuery) return;

    setLoading(true);
    setHasSearchedSweep(true);
    setFoundNodes([]);
    onLog(`[OSINT Grounding] Menjalankan imbasan profil media sosial sah bagi "${targetQuery}"...`, 'info');
    try {
      let results = await runSocialMediaTransform(targetQuery, keywords);
      
      // Fetch profile pictures automatically if Tavily is available
      if (tavilyApiKey && results.length > 0) {
        onLog(`Mengambil foto avatar awam untuk ${results.length} akaun yang disahkan...`, 'info');
        results = await Promise.all(results.map(async (node) => {
          try {
            if (!node.imageUrl || node.imageUrl.includes('placeholder') || node.imageUrl.includes('example.com')) {
              const fetchedImages = await searchTavilyImages(`${node.label} ${node.type} profile photo`, tavilyApiKey, 1);
              if (fetchedImages && fetchedImages.length > 0) {
                return { ...node, imageUrl: fetchedImages[0], imageUrls: [fetchedImages[0]] };
              }
            }
          } catch (err) {
            console.error(`Failed to fetch image for ${node.label}`, err);
          }
          return node;
        }));
      }

      setFoundNodes(results);
      setSelectedIndices(new Set(results.map((_, index) => index)));
      if (results.length > 0) {
        onLog(`[OSINT Kejayaan] Menemui ${results.length} profil media sosial sah.`, 'success');
      } else {
        onLog(`[OSINT Sah] Tiada profil media sosial sah ditemui untuk "${targetQuery}".`, 'warning');
      }
    } catch (e: any) {
      onLog(`Social Recon gagal: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- IMPORT ACTIONS ---
  const handleImportSweep = () => {
    const selected = foundNodes.filter((_, index) => selectedIndices.has(index)).map(n => ({
        ...n,
        x: targetNode.x ? targetNode.x + (Math.random() * 100 - 50) : undefined,
        y: targetNode.y ? targetNode.y + (Math.random() * 100 - 50) : undefined
    }));
    onComplete(selected);
  };

  const handleImportSmartResolve = () => {
    if (!smartResult) return;
    const nodesToImport: Node[] = [];

    // Add suggested graph nodes
    if (smartResult.suggestedGraphNodes && smartResult.suggestedGraphNodes.length > 0) {
      smartResult.suggestedGraphNodes.forEach((n, idx) => {
        nodesToImport.push({
          ...n,
          id: n.id || `node_smart_${Date.now()}_${idx}`,
          x: targetNode.x ? targetNode.x + (idx * 60 - 120) : undefined,
          y: targetNode.y ? targetNode.y + (idx * 40 + 50) : undefined
        });
      });
    }

    onComplete(nodesToImport);
    onLog(`Diimport ${nodesToImport.length} entiti terurai dan profil media sosial ke dalam graf kanvas.`, 'success');
  };

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === foundNodes.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(foundNodes.map((_, i) => i)));
    }
  };

  const toggleSmartProfileSelection = (index: number) => {
    const newSelection = new Set(selectedSmartProfiles);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedSmartProfiles(newSelection);
  };

  const addQuickKeyword = (kw: string) => {
    setKeywords(prev => prev ? `${prev}, ${kw}` : kw);
  };

  return (
    <div className="w-full bg-[#0a0a0a] text-white p-4 sm:p-6 font-mono flex flex-col max-h-[85vh] overflow-hidden">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-900/60 pb-3 mb-4">
        <div>
          <h2 className="text-lg font-black uppercase flex items-center gap-2 text-cyan-400 tracking-wide">
            <Fingerprint className="text-cyan-400" size={20} />
            <span>Social Entity Recon & De-Obfuscator</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Sistem penguraian ketidakpadanan <strong>Handle / Vanity URL</strong> vs <strong>Nama Paparan Sebenar</strong> (Anti-Obfuscation).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('smart_resolve')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'smart_resolve'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BrainCircuit size={13} />
            <span>Smart De-Obfuscator</span>
          </button>
          <button
            onClick={() => setActiveTab('multi_sweep')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'multi_sweep'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Globe size={13} />
            <span>Live Sweep</span>
          </button>
          <button
            onClick={() => setActiveTab('dork_matrix')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dork_matrix'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Compass size={13} />
            <span>Dork Matrix</span>
          </button>
        </div>
      </div>

      {/* Input Parameters Bar */}
      <div className="bg-slate-950/90 border border-slate-800/80 p-3.5 rounded-xl mb-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center justify-between">
              <span>Sasaran (Handle / URL / Nama Menyamar)</span>
              <span className="text-cyan-400 text-[9px] font-mono">Input Fleksibel</span>
            </label>
            <div className="relative">
              <input
                value={customTarget}
                onChange={e => setCustomTarget(e.target.value)}
                placeholder="Cth: facebook.com/wan.kalisa, @wan.kalisa, atau Tok Wan BaNz Kliza"
                className="w-full bg-black border border-cyan-500/40 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none font-bold"
              />
            </div>
          </div>

          <div className="sm:col-span-7">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center justify-between">
              <span>Kata Kunci Konteks & Geografi (Pilihan)</span>
              <span className="text-slate-500 text-[9px]">Membantu ketepatan AI</span>
            </label>
            <input
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="Cth: Malaysia, Kelisa, Kedah, Polis, Cyber, Maybank, PDRM"
              className="w-full bg-black border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
            />
          </div>
        </div>

        {/* Quick Context Tags */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-900">
          <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
            <Tag size={10} /> Konteks Pantas:
          </span>
          {['Malaysia', 'Kuala Lumpur', 'Kedah', 'PDRM', 'Cybersecurity', 'Kelisa', 'Perodua', 'Tok Wan'].map(k => (
            <button
              key={k}
              type="button"
              onClick={() => addQuickKeyword(k)}
              className="text-[9px] px-2 py-0.5 bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-700 text-slate-300 hover:text-cyan-300 rounded transition-all cursor-pointer"
            >
              +{k}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area based on Tab */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
        
        {/* ==================================================== */}
        {/* TAB 1: SMART DE-OBFUSCATOR & HANDLE <-> NAME RESOLVER */}
        {/* ==================================================== */}
        {activeTab === 'smart_resolve' && (
          <div className="space-y-4">
            {/* Execute Button */}
            <button
              onClick={handleExecuteSmartResolve}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-black font-black py-3 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin text-black" size={18} /> : <BrainCircuit size={18} />}
              <span>{loading ? `Menganalisis & Menguraikan Identiti "${customTarget}"...` : 'Jalankan Resolusi Identiti & Penyahsamaran (De-Obfuscate)'}</span>
            </button>

            {/* Explanation Guide when not searched */}
            {!smartResult && !loading && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <HelpCircle size={16} />
                  <span>Bagaimana Sasaran Menyamar & Bagaimana Enjin Ini Menyelesaikannya:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-300">
                  <div className="p-3 bg-black/40 border border-rose-900/30 rounded-lg space-y-1.5">
                    <div className="text-rose-400 font-bold flex items-center gap-1.5">
                      <ShieldAlert size={13} />
                      <span>Taktik Penyamaran Sasaran:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li>Mendaftar URL handle lama (cth: <code>facebook.com/wan.kalisa</code>).</li>
                      <li>Menukar nama paparan kepada ejaan leet / slang pasar (cth: <code>Tok Wan BaNz Kliza</code>).</li>
                      <li>Memutuskan korelasi carian teks biasa supaya enjin carian umum gagal mengesan.</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-black/40 border border-emerald-900/30 rounded-lg space-y-1.5">
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <ShieldCheck size={13} />
                      <span>Solusi Red Horizon OSINT:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li>Menggunakan Google Search Grounding untuk membaca tajuk indeks sebenar profil.</li>
                      <li>Mengekstrak kata dasar fonetik (<code>Wan</code>, <code>Kelisa</code>, <code>BaNz = Bang</code>).</li>
                      <li>Menjana dorking khusus untuk mencari akaun tersembunyi merentasi platform lain.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Result Display */}
            {smartResult && (
              <div className="space-y-4">
                {/* Visual Identity Discrepancy Card */}
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-black border-2 border-cyan-500/50 rounded-xl p-4 shadow-xl shadow-cyan-950/30">
                  <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="text-cyan-400" size={18} />
                      <span className="text-xs font-black uppercase text-cyan-300">Hasil Resolusi Entiti & Penyahsamaran</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold rounded-full">
                      Keyakinan: {smartResult.targetAnalysis?.confidenceLevel || 90}%
                    </span>
                  </div>

                  {/* Discrepancy Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {/* Registered Handle */}
                    <div className="p-3 bg-black/60 border border-slate-700/80 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                        URL / Vanity Handle Dikesan:
                      </span>
                      <div className="text-sm font-black text-amber-300 font-mono flex items-center justify-between">
                        <span>@{smartResult.primaryHandle || 'N/A'}</span>
                        <button
                          onClick={() => copyToClipboard(`@${smartResult.primaryHandle}`, 'handle')}
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedText === 'handle' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 block">
                        Pengecam kekal pendaftaran profil / URL sistem
                      </span>
                    </div>

                    {/* Discovered Real Display Name */}
                    <div className="p-3 bg-black/60 border border-cyan-600/50 rounded-lg">
                      <span className="text-[10px] text-cyan-400 uppercase font-bold block mb-1">
                        Nama Paparan Sebenar (Display Name):
                      </span>
                      <div className="text-sm font-black text-cyan-200 flex items-center justify-between">
                        <span>{smartResult.realDisplayName || 'N/A'}</span>
                        <button
                          onClick={() => copyToClipboard(smartResult.realDisplayName || '', 'name')}
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedText === 'name' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <span className="text-[9px] text-cyan-500/80 mt-1 block">
                        Nama yang dipaparkan pada skrin akaun semasa
                      </span>
                    </div>
                  </div>

                  {/* Tradecraft Breakdown */}
                  {smartResult.targetAnalysis && (
                    <div className="p-3 bg-cyan-950/20 border border-cyan-900/50 rounded-lg text-xs space-y-1.5 mb-3">
                      <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                        <ShieldAlert size={14} />
                        <span>Analisis Taktik Penyamaran: {smartResult.targetAnalysis.obfuscationTechnique}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {smartResult.targetAnalysis.tradecraftBreakdown}
                      </p>
                      {smartResult.targetAnalysis.phoneticRoots && smartResult.targetAnalysis.phoneticRoots.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] text-slate-400 font-bold">Kata Dasar Fonetik:</span>
                          {smartResult.targetAnalysis.phoneticRoots.map((root, rIdx) => (
                            <span key={rIdx} className="text-[10px] px-2 py-0.2 bg-black border border-cyan-700/60 text-cyan-300 font-bold rounded">
                              {root}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Phonetic & Slang Alias Cloud */}
                  {smartResult.phoneticAliases && smartResult.phoneticAliases.length > 0 && (
                    <div className="p-3 bg-black/40 border border-slate-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          <Layers size={12} /> Variasi Alias & Ejaan Slang Terkorelasi:
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {smartResult.phoneticAliases.map((al, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 hover:border-cyan-700 rounded transition-all text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-white block truncate">{al.alias}</span>
                              <span className="text-[9px] text-slate-400">{al.reason}</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(al.alias, `alias_${aIdx}`)}
                              className="text-[10px] text-slate-400 hover:text-cyan-300 p-1 cursor-pointer shrink-0"
                              title="Salin Alias"
                            >
                              {copiedText === `alias_${aIdx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Discovered Profiles List */}
                {smartResult.discoveredProfiles && smartResult.discoveredProfiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                        <Globe size={14} /> Profil Yang Disahkan Sah ({smartResult.discoveredProfiles.length})
                      </span>
                    </div>

                    {smartResult.discoveredProfiles.map((prof, pIdx) => {
                      const pColor = PLATFORM_COLORS[prof.platform] || { bg: 'bg-indigo-950/60', text: 'text-indigo-400', border: 'border-indigo-700' };
                      return (
                        <div
                          key={pIdx}
                          onClick={() => toggleSmartProfileSelection(pIdx)}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${
                            selectedSmartProfiles.has(pIdx)
                              ? 'bg-slate-900/90 border-cyan-500'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-cyan-400 mt-1">
                            {selectedSmartProfiles.has(pIdx) ? <CheckSquare size={16} /> : <Square size={16} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-black text-white">{prof.displayName || prof.label}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${pColor.bg} ${pColor.text} ${pColor.border}`}>
                                {prof.platform}
                              </span>
                              {prof.isVanityMismatch && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-amber-950/80 border border-amber-600 text-amber-300 font-bold rounded">
                                  ⚠️ Vanity Mismatch
                                </span>
                              )}
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-600 text-emerald-300 font-mono rounded">
                                ✓ {prof.confidence}% Sah
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap mb-1.5">
                              {prof.details}
                            </p>

                            <div className="flex items-center justify-between text-[10px] font-mono flex-wrap gap-2">
                              <span className="text-slate-400">
                                Handle: <strong className="text-amber-300">{prof.handle}</strong>
                              </span>
                              {prof.url && (
                                <a
                                  href={prof.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                                >
                                  <ExternalLink size={11} /> {prof.url}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Import to Graph Button */}
                <button
                  onClick={handleImportSmartResolve}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-3 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <Plus size={18} />
                  <span>Import Entiti Terurai & Profil Disahkan Ke Graf Canvas</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: MULTI-PLATFORM LIVE GROUNDED SWEEP             */}
        {/* ==================================================== */}
        {activeTab === 'multi_sweep' && (
          <div className="space-y-4">
            <div className="text-[10px] text-emerald-400 border border-emerald-500/30 px-3 py-2 bg-emerald-950/30 rounded-lg flex items-center gap-2">
              <ShieldCheck size={16} className="shrink-0 text-emerald-400" />
              <span><strong>Enjin Anti-Halusinasi Aktif:</strong> Hanya profil yang disahkan wujud secara langsung melalui Google Search Grounding & semakan API akan dipaparkan.</span>
            </div>

            <button 
              onClick={handleExecuteMultiSweep}
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-black py-3 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/40"
            >
              {loading ? <Loader2 className="animate-spin text-black" size={18} /> : <BrainCircuit size={18} />}
              <span>{loading ? `Mencari & Mengesahkan Profil "${customTarget}"...` : 'Jalankan Transformasi Risikan Media Sosial'}</span>
            </button>

            {/* Results Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <span>Profil Yang Disahkan Sah ({foundNodes.length})</span>
                </h3>
                {foundNodes.length > 0 && (
                  <button onClick={toggleSelectAll} className="text-[10px] text-cyan-400 hover:underline cursor-pointer font-bold">
                    {selectedIndices.size === foundNodes.length ? 'Nyahpilih Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>

              {loading && (
                <div className="text-center p-8 text-slate-400 bg-black/40 border border-cyan-900/40 rounded-xl">
                  <Loader2 className="animate-spin mx-auto mb-2 text-cyan-400" size={24} />
                  <div className="text-sm font-bold text-cyan-300">Menjalankan Pengesahan Langsung Web & Platform...</div>
                  <div className="text-[11px] text-slate-500 mt-1">Mengelakkan tekaan palsu dan menapis profil yang tidak sahih.</div>
                </div>
              )}

              {!loading && !hasSearchedSweep && (
                <div className="text-center p-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  Klik butang di atas untuk memulakan pengesahan profil bagi <strong>{customTarget || targetNode.label}</strong>.
                </div>
              )}

              {!loading && hasSearchedSweep && foundNodes.length === 0 && (
                <div className="text-left p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                    <AlertCircle size={16} />
                    <span>Tiada Profil Media Sosial Sah Ditemui</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Enjin Red Horizon tidak menemui profil awam yang sah bagi sasaran <strong>"{customTarget}"</strong>.
                    Sistem menolak tekaan palsu. Cuba gunakan tab <strong>Smart De-Obfuscator</strong> untuk mencari berasaskan variasi handle dan ejaan leet.
                  </p>
                </div>
              )}

              {foundNodes.map((node, index) => {
                const platformName = (node as any).platform || node.label.match(/\(([^)]+)\)/)?.[1] || 'Social';
                const pColor = PLATFORM_COLORS[platformName] || { bg: 'bg-cyan-950/40', text: 'text-cyan-400', border: 'border-cyan-800' };
                const confidence = (node as any).confidence || 85;

                return (
                  <div 
                    key={node.id} 
                    onClick={() => toggleSelection(index)}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      selectedIndices.has(index) ? 'bg-cyan-950/30 border-cyan-600' : 'bg-black/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-cyan-400 mt-1">
                      {selectedIndices.has(index) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>

                    {(() => {
                      const rawImg = (node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls[node.imageUrls.length - 1] : node.imageUrl);
                      const imgUrl = typeof rawImg === 'string' ? rawImg : (rawImg as any)?.url;
                      if (!imgUrl) return null;
                      const proxied = imgUrl.startsWith('data:') ? imgUrl : `https://wsrv.nl/?url=${encodeURIComponent(imgUrl)}&we`;
                      return (
                        <img 
                          src={proxied} 
                          className="w-10 h-10 object-cover rounded-full border border-slate-700 bg-slate-900 shrink-0" 
                          alt="profile"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      );
                    })()}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">{node.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${pColor.bg} ${pColor.text} ${pColor.border}`}>
                          {platformName}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded font-mono">
                          ✓ {confidence}% Sah
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 whitespace-pre-wrap mt-1 leading-snug">{node.details}</div>
                      {node.url && (
                        <a 
                          href={node.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()} 
                          className="text-[10px] text-cyan-400 hover:underline truncate inline-flex items-center gap-1 mt-1.5 font-mono font-bold"
                        >
                          <ExternalLink size={10} /> {node.url}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {foundNodes.length > 0 && (
              <button
                onClick={handleImportSweep}
                disabled={selectedIndices.size === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-3 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Plus size={18} />
                <span>Import {selectedIndices.size} Profil Yang Dipilih Ke Graf</span>
              </button>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: LIVE OSINT DORKING MATRIX                      */}
        {/* ==================================================== */}
        {activeTab === 'dork_matrix' && (
          <div className="space-y-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
              <div className="text-cyan-400 font-bold flex items-center gap-2">
                <Compass size={16} />
                <span>Matrik Carian Dork Lanjutan (1-Click Execution)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Gunakan kueri dorking di bawah untuk memintas sekatan indeks carian dan mendedahkan cache pendaftaran akaun yang mengandungi handle <code>{customTarget}</code> walaupun nama paparannya telah ditukar.
              </p>
            </div>

            {/* Generated Dork Cards */}
            <div className="space-y-2.5">
              {[
                {
                  engine: 'Google',
                  title: 'Google: Exact Facebook Handle Search',
                  query: `site:facebook.com "${customTarget.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/^@/, '')}"`,
                  desc: 'Mencari halaman profil Facebook yang menyebut handle tepat ini pada URL atau teks.'
                },
                {
                  engine: 'Google',
                  title: 'Google: Facebook InURL Vanity Extraction',
                  query: `site:facebook.com inurl:${customTarget.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/^@/, '')}`,
                  desc: 'Memaksa Google mengeluarkan tajuk Display Name bagi pautan URL khusus ini.'
                },
                {
                  engine: 'Facebook',
                  title: 'Facebook: Direct People Search Query',
                  query: customTarget.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/^@/, ''),
                  desc: 'Membuka carian rasmi direktori orang Facebook secara langsung.'
                },
                {
                  engine: 'Bing',
                  title: 'Bing: Multi-Social Sweep (FB, IG, TikTok, X)',
                  query: `(site:facebook.com OR site:instagram.com OR site:tiktok.com OR site:twitter.com) "${customTarget.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/^@/, '')}"`,
                  desc: 'Carian rentas platform alternatif melalui indeks enjin carian Bing.'
                },
                {
                  engine: 'DuckDuckGo',
                  title: 'DuckDuckGo: Uncensored Social Profile Fingerprint',
                  query: `site:facebook.com "${customTarget.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/^@/, '')}"`,
                  desc: 'Carian tanpa penjejakan cookie / algoritma peribadi.'
                }
              ].map((dork, dIdx) => {
                const searchUrl = dork.engine === 'Facebook'
                  ? `https://www.facebook.com/search/people/?q=${encodeURIComponent(dork.query)}`
                  : dork.engine === 'Bing'
                  ? `https://www.bing.com/search?q=${encodeURIComponent(dork.query)}`
                  : dork.engine === 'DuckDuckGo'
                  ? `https://duckduckgo.com/?q=${encodeURIComponent(dork.query)}`
                  : `https://www.google.com/search?q=${encodeURIComponent(dork.query)}`;

                return (
                  <div
                    key={dIdx}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-cyan-700/60 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold rounded">
                          {dork.engine}
                        </span>
                        <span className="text-xs font-bold text-white">{dork.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(dork.query, `dork_${dIdx}`)}
                          className="text-[10px] px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedText === `dork_${dIdx}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>Salin</span>
                        </button>
                        <a
                          href={searchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded flex items-center gap-1 shadow-sm"
                        >
                          <ExternalLink size={11} />
                          <span>Buka Carian</span>
                        </a>
                      </div>
                    </div>

                    <div className="p-2 bg-black/60 rounded border border-slate-900 font-mono text-[11px] text-cyan-300 break-all select-all">
                      {dork.query}
                    </div>
                    <p className="text-[10px] text-slate-400">{dork.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SocialRecon;
