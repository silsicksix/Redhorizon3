import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  Loader2, 
  CheckSquare, 
  Square, 
  ExternalLink, 
  ShieldCheck, 
  Plus, 
  Sparkles, 
  Globe, 
  AlertCircle,
  FileText,
  Key,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { Node, Link } from '../types';
import { 
  queryGoogleSocint, 
  transformSocintItemToNode, 
  SocintResultItem, 
  DEFAULT_SOCINT_CX 
} from '../services/googleCseService';

export interface GoogleSocintModalProps {
  isOpen?: boolean;
  initialTarget?: Node | null;
  initialQuery?: string;
  targetNode?: Node | null;
  googleCseApiKey?: string;
  googleCseId?: string;
  onClose: () => void;
  onPlotToGraph?: (nodes: Node[], links: Link[], focusNodeId?: string) => void;
  onAddNodesAndEdges?: (newNodes: Node[], newEdges: { source: string; target: string; label: string }[]) => void;
  onLog?: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
}

const PLATFORMS = [
  { id: 'all', name: 'Semua SOCINT', icon: '🌐', color: 'border-cyan-500 text-cyan-400 bg-cyan-950/40' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'border-pink-500 text-pink-400 bg-pink-950/40' },
  { id: 'x', name: 'X / Twitter', icon: '🐦', color: 'border-slate-500 text-slate-300 bg-slate-900/60' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'border-teal-500 text-teal-300 bg-teal-950/40' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'border-indigo-500 text-indigo-400 bg-indigo-950/40' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'border-sky-500 text-sky-400 bg-sky-950/40' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'border-blue-500 text-blue-400 bg-blue-950/40' },
  { id: 'youtube', name: 'YouTube', icon: '🔴', color: 'border-red-500 text-red-400 bg-red-950/40' },
  { id: 'reddit', name: 'Reddit', icon: '🤖', color: 'border-orange-500 text-orange-400 bg-orange-950/40' }
];

export const GoogleSocintModal: React.FC<GoogleSocintModalProps> = ({
  isOpen = true,
  initialTarget,
  initialQuery = '',
  targetNode,
  googleCseApiKey = '',
  googleCseId = DEFAULT_SOCINT_CX,
  onClose,
  onPlotToGraph,
  onAddNodesAndEdges,
  onLog = () => {}
}) => {
  const effectiveTarget = initialTarget || targetNode || null;
  const [query, setQuery] = useState(initialQuery || '');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SocintResultItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [activeCx, setActiveCx] = useState(googleCseId || DEFAULT_SOCINT_CX);
  const [customKey, setCustomKey] = useState(googleCseApiKey);
  const [showConfig, setShowConfig] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    } else if (effectiveTarget?.label) {
      // Clean label from prefixes like "Person:" or "Target:"
      const cleanLabel = effectiveTarget.label
        .replace(/^[A-Za-z0-9\s/]+:\s*/, '')
        .replace(/^@+/, '')
        .trim();
      setQuery(cleanLabel);
    }
  }, [effectiveTarget, initialQuery]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setHasSearched(true);
    setResults([]);
    setStatusNotice(null);
    onLog(`[Google CSE] Menjalankan carian SOCINT untuk "${cleanQuery}" (Platform: ${selectedPlatform}, CX: ${activeCx})...`, 'info');

    try {
      const resp = await queryGoogleSocint({
        query: cleanQuery,
        cx: activeCx,
        apiKey: customKey,
        platform: selectedPlatform,
        num: 10
      });

      if (resp.success && resp.items.length > 0) {
        setResults(resp.items);
        setSelectedIndices(new Set(resp.items.map((_, i) => i))); // select all by default
        setStatusNotice(resp.notice || null);
        onLog(`[Google CSE] Berjaya menemui ${resp.items.length} hasil profil media sosial bagi "${cleanQuery}".`, 'success');
      } else {
        setResults([]);
        setStatusNotice(resp.notice || resp.error || 'Tiada hasil ditemui.');
        onLog(`[Google CSE] Tiada rekod SOCINT ditemui bagi "${cleanQuery}".`, 'warning');
      }
    } catch (err: any) {
      console.error('Google SOCINT error:', err);
      setStatusNotice(`Ralat: ${err.message}`);
      onLog(`Google CSE gagal: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndices(next);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === results.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(results.map((_, i) => i)));
    }
  };

  // Plot a single item and immediately open its Dossier panel
  const handlePlotSingle = (item: SocintResultItem, idx: number) => {
    const { node, link } = transformSocintItemToNode(item, effectiveTarget, idx);
    if (onPlotToGraph) {
      onPlotToGraph([node], link ? [link] : [], node.id);
    } else if (onAddNodesAndEdges) {
      onAddNodesAndEdges([node], link ? [{ source: typeof link.source === 'string' ? link.source : (link.source as any).id, target: typeof link.target === 'string' ? link.target : (link.target as any).id, label: link.label }] : []);
    }
    onLog(`[Red Horizon] Nod [${node.label}] berjaya dipetakan ke kanvas & maklumat dimuatkan ke Panel Dossier.`, 'success');
  };

  // Plot all selected items and focus the first one in the Dossier panel
  const handlePlotSelected = () => {
    const selectedItems = results.filter((_, i) => selectedIndices.has(i));
    if (selectedItems.length === 0) return;

    const newNodes: Node[] = [];
    const newLinks: Link[] = [];

    selectedItems.forEach((item, i) => {
      const { node, link } = transformSocintItemToNode(item, effectiveTarget, i);
      newNodes.push(node);
      if (link) newLinks.push(link);
    });

    const firstNodeId = newNodes[0]?.id;
    if (onPlotToGraph) {
      onPlotToGraph(newNodes, newLinks, firstNodeId);
    } else if (onAddNodesAndEdges) {
      onAddNodesAndEdges(
        newNodes, 
        newLinks.map(l => ({
          source: typeof l.source === 'string' ? l.source : (l.source as any).id,
          target: typeof l.target === 'string' ? l.target : (l.target as any).id,
          label: l.label
        }))
      );
    }
    onLog(`[Red Horizon] Memetakan ${newNodes.length} nod profil SOCINT ke kanvas. Dossier pertama kini aktif.`, 'success');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-mono">
      <div className="w-full max-w-4xl bg-[#0a0d14] border-2 border-cyan-500/80 rounded-xl flex flex-col max-h-[92vh] shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden">
        
        {/* Header Bar */}
        <div className="h-16 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-950/80 via-[#0a0d14] to-transparent px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Search size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-black text-sm tracking-wider uppercase">Google Custom Search (SOCINT) Studio</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  CX: {activeCx}
                </span>
              </div>
              <p className="text-[11px] text-cyan-300/70">
                Pencarian profil media sosial berasaskan Google Custom Search dengan integrasi nod kanvas & panel dossier
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded border text-xs flex items-center gap-1.5 transition-all ${
                showConfig 
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' 
                  : 'bg-black/50 border-gray-700 text-gray-400 hover:text-white'
              }`}
              title="Konfigurasi Enjin Google CSE"
            >
              <Key size={14} />
              <span className="hidden sm:inline">Konfigurasi CSE</span>
            </button>

            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Optional Config Drawer */}
        {showConfig && (
          <div className="p-4 bg-cyan-950/20 border-b border-cyan-900/50 text-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                  Google Search Engine ID (CX)
                </label>
                <input
                  value={activeCx}
                  onChange={(e) => setActiveCx(e.target.value)}
                  placeholder="53a0041f2f24f4e3b"
                  className="w-full bg-black border border-cyan-800 text-cyan-200 px-3 py-1.5 rounded outline-none focus:border-cyan-400 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                  Google Cloud Custom Search API Key (Pilihan)
                </label>
                <input
                  type="password"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="AIzaSy... (Biarkan kosong untuk mod Grounding automatik)"
                  className="w-full bg-black border border-gray-700 text-white px-3 py-1.5 rounded outline-none focus:border-cyan-400 font-mono text-xs"
                />
              </div>
            </div>
            <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
              <Info size={13} className="text-cyan-400 shrink-0" />
              <span>Jika anda tiada Google Cloud API Key, sistem secara automatik menggunakan enjin sandaran SOCINT Grounding untuk mencari profil mengikut laman media sosial yang sama.</span>
            </div>
          </div>
        )}

        {/* Search Bar & Platform Selector */}
        <div className="p-4 bg-black/60 border-b border-white/5 shrink-0 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Masukkan nama sasaran, username handle, atau kata kunci (Cth: mrbean, Khairul Aming, @ahmadalbab)..."
                className="w-full bg-black border border-cyan-800/80 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-gray-600 font-bold"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>{loading ? 'Mencari...' : 'Cari SOCINT'}</span>
            </button>
          </form>

          {/* Platform Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
            <span className="text-[10px] text-gray-500 uppercase font-bold shrink-0 mr-1">Platform:</span>
            {PLATFORMS.map(p => {
              const active = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all ${
                    active 
                      ? `${p.color} border-current shadow-[0_0_10px_rgba(6,182,212,0.2)]` 
                      : 'border-white/10 text-gray-400 hover:text-white hover:border-gray-600 bg-black/40'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Target Reference Link Indicator */}
          {targetNode && (
            <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-1">
              <span className="text-gray-500">Sasaran Rujukan Semasa:</span>
              <span className="px-2 py-0.5 bg-cyan-950/60 border border-cyan-800 text-cyan-300 rounded font-bold">
                {targetNode.label}
              </span>
              <span className="text-[10px] text-emerald-400">
                (Nod yang ditemui akan disambungkan secara automatik ke sasaran ini)
              </span>
            </div>
          )}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#07090e] space-y-3">
          {statusNotice && (
            <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-lg text-xs text-cyan-300 flex items-start gap-2">
              <ShieldCheck size={16} className="text-cyan-400 shrink-0 mt-0.5" />
              <span>{statusNotice}</span>
            </div>
          )}

          {loading && (
            <div className="text-center py-16 space-y-3">
              <Loader2 size={32} className="animate-spin text-cyan-400 mx-auto" />
              <div className="text-sm font-bold text-cyan-300">Menjalankan Pengesahan Google CSE SOCINT...</div>
              <div className="text-xs text-gray-500">Mengekstrak profil media sosial, handle akaun, dan avatar rasmi.</div>
            </div>
          )}

          {!loading && !hasSearched && (
            <div className="text-center py-16 text-gray-600 text-xs border border-dashed border-gray-800 rounded-xl space-y-2">
              <Search size={28} className="mx-auto text-gray-700" />
              <div className="text-gray-400 font-bold">Enjin Carian Google SOCINT Sedia Digunakan</div>
              <p className="max-w-md mx-auto text-gray-500 text-[11px]">
                Masukkan nama sasaran atau handle di atas untuk mencari akaun media sosial rasmi (Instagram, X, TikTok, Facebook, Telegram, LinkedIn).
              </p>
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className="p-6 bg-amber-950/20 border border-amber-800/40 rounded-xl text-center space-y-2">
              <AlertCircle size={24} className="mx-auto text-amber-400" />
              <div className="text-amber-300 font-bold text-sm">Tiada Profil SOCINT Ditemui</div>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Tiada akaun awam dipadankan bagi carian "{query}". Cuba gunakan variasi ejaan, nama pengguna (@handle), atau pilih platform khusus.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div className="text-xs text-gray-400 font-bold uppercase flex items-center gap-2">
                  <span>Hasil Risikan ({results.length})</span>
                  <span className="text-[10px] text-cyan-400 normal-case">
                    ({selectedIndices.size} dipilih untuk dipetakan ke graf)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-cyan-400 hover:underline font-bold"
                >
                  {selectedIndices.size === results.length ? 'Nyahpilih Semua' : 'Pilih Semua'}
                </button>
              </div>

              <div className="space-y-2.5">
                {results.map((item, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => toggleSelect(idx)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3.5 group ${
                        isSelected 
                          ? 'bg-cyan-950/30 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                          : 'bg-[#0d1017] border-white/5 hover:border-gray-700'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="text-cyan-400 mt-1 shrink-0">
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>

                      {/* Avatar / Thumbnail */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-900 border border-cyan-800/60 shrink-0 flex items-center justify-center">
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl.startsWith('data:') ? item.avatarUrl : `https://wsrv.nl/?url=${encodeURIComponent(item.avatarUrl)}&we`}
                            alt={item.displayName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-lg">
                            {PLATFORMS.find(p => p.name.toLowerCase().includes(item.platform.toLowerCase()))?.icon || '🌐'}
                          </span>
                        )}
                      </div>

                      {/* Info & Snippet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors truncate">
                            {item.displayName || item.sourceTitle}
                          </span>
                          
                          <span className="text-[10px] px-2 py-0.5 rounded border font-bold bg-cyan-950/80 text-cyan-300 border-cyan-700">
                            {item.platform}
                          </span>

                          {item.username && (
                            <span className="text-[11px] text-cyan-400 font-mono font-bold">
                              @{item.username.replace(/^@/, '')}
                            </span>
                          )}

                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded font-mono ml-auto">
                            ✓ {item.confidence}% Sah
                          </span>
                        </div>

                        <p className="text-xs text-gray-300 mt-1 leading-relaxed line-clamp-2">
                          {item.snippet}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-cyan-400 hover:text-white flex items-center gap-1 font-mono truncate max-w-[280px]"
                          >
                            <ExternalLink size={12} />
                            <span className="truncate">{item.url}</span>
                          </a>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlotSingle(item, idx);
                              }}
                              className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-800 border border-cyan-700 text-cyan-200 text-[10px] font-bold rounded flex items-center gap-1 transition-all"
                            >
                              <FileText size={11} />
                              <span>Papar Nod & Buka Dossier</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {results.length > 0 && (
          <div className="p-4 bg-black/80 border-t border-cyan-900/50 flex items-center justify-between shrink-0">
            <div className="text-xs text-gray-400">
              <span className="text-white font-bold">{selectedIndices.size}</span> daripada <span className="text-white font-bold">{results.length}</span> nod dipilih untuk dimasukkan ke kanvas.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 rounded-lg transition-all"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={handlePlotSelected}
                disabled={selectedIndices.size === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <Plus size={16} />
                <span>Plot {selectedIndices.size} Nod Ke Graf & Buka Dossier</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GoogleSocintModal;
