import React, { useState, useEffect, useMemo } from 'react';
import { 
  fetchEnricherCatalog, 
  executeEnricher, 
  EnricherDefinition, 
  EnricherExecutionResult 
} from '../services/enricherService';
import { Node } from '../types';
import { 
  Zap, 
  Search, 
  User, 
  Phone, 
  Coins, 
  Globe, 
  Building2, 
  Car, 
  Mail, 
  IdCard, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  PlusCircle, 
  Layers, 
  Sparkles, 
  RefreshCw, 
  Terminal as TerminalIcon,
  Play,
  Filter,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';

interface ModularEnricherHubModalProps {
  initialNode?: Node | null;
  graphNodes?: Node[];
  onClose: () => void;
  onUpdateGraph: (data: { nodes: any[]; links: any[] }) => void;
  onLog?: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
}

export const ModularEnricherHubModal: React.FC<ModularEnricherHubModalProps> = ({
  initialNode,
  graphNodes = [],
  onClose,
  onUpdateGraph,
  onLog,
}) => {
  const [catalog, setCatalog] = useState<EnricherDefinition[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'poi' | 'crypto' | 'network'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Target State
  const [currentTarget, setCurrentTarget] = useState(initialNode?.label || '');
  const [targetType, setTargetType] = useState(initialNode?.type || 'person');
  const [context, setContext] = useState(initialNode?.details || '');

  // Execution State
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [results, setResults] = useState<EnricherExecutionResult[]>([]);
  const [activeResultIdx, setActiveResultIdx] = useState<number>(0);
  const [importedStatus, setImportedStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    fetchEnricherCatalog()
      .then((data) => {
        if (mounted) {
          setCatalog(data);
          setLoadingCatalog(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingCatalog(false);
      });
    return () => { mounted = false; };
  }, []);

  // Update target if initialNode changes
  useEffect(() => {
    if (initialNode) {
      setCurrentTarget(initialNode.label || '');
      setTargetType(initialNode.type || 'person');
      setContext(initialNode.details || '');
    }
  }, [initialNode]);

  // Filter enrichers
  const filteredEnrichers = useMemo(() => {
    return catalog.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchFilter.toLowerCase();
      const matchQuery = !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.badge.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [catalog, selectedCategory, searchFilter]);

  // Check which enrichers are recommended for the current target type
  const isRecommended = (item: EnricherDefinition) => {
    const t = targetType.toLowerCase();
    return item.applicableTypes.some(appType => t.includes(appType) || appType.includes(t) || appType === 'target');
  };

  // Run a single enricher
  const handleRunEnricher = async (enricher: EnricherDefinition) => {
    if (!currentTarget.trim()) {
      alert('Sila masukkan nilai sasaran sebelum menjalankan enricher.');
      return;
    }

    setExecutingId(enricher.id);
    onLog?.(`[ENRICHER HUB] Menjalankan modul: ${enricher.name} untuk "${currentTarget}"`, 'info');

    try {
      const res = await executeEnricher(enricher.id, currentTarget, targetType, context);
      setResults((prev) => [res, ...prev.filter(r => r.enricherId !== enricher.id)]);
      setActiveResultIdx(0);
      onLog?.(`[ENRICHER HUB] ${enricher.name} selesai: Ditemui ${res.discoveredNodes.length} nod & ${res.discoveredLinks.length} pautan`, 'success');
    } catch (err: any) {
      onLog?.(`[ENRICHER HUB] Ralat menjalankan ${enricher.name}: ${err?.message || err}`, 'error');
    } finally {
      setExecutingId(null);
    }
  };

  // Run all recommended enrichers in sequence
  const handleRunAllMatched = async () => {
    const matched = filteredEnrichers.filter(isRecommended);
    if (matched.length === 0) {
      alert('Tiada enricher yang sepadan secara khusus dengan jenis sasaran ini.');
      return;
    }
    if (!currentTarget.trim()) {
      alert('Sila masukkan sasaran.');
      return;
    }

    setIsBatchRunning(true);
    onLog?.(`[ENRICHER HUB] Memulakan larian pukal untuk ${matched.length} modul sepadan...`, 'info');

    for (const enricher of matched) {
      try {
        setExecutingId(enricher.id);
        const res = await executeEnricher(enricher.id, currentTarget, targetType, context);
        setResults((prev) => [res, ...prev.filter(r => r.enricherId !== enricher.id)]);
      } catch (err: any) {
        console.warn(`Enricher ${enricher.id} failed:`, err);
      }
    }

    setExecutingId(null);
    setIsBatchRunning(false);
    setActiveResultIdx(0);
    onLog?.(`[ENRICHER HUB] Larian pukal selesai untuk semua modul padanan.`, 'success');
  };

  // Import findings into Canvas Graph
  const handleImportToGraph = (result: EnricherExecutionResult) => {
    if (!result.discoveredNodes || result.discoveredNodes.length === 0) {
      alert('Tiada nod baru untuk diimport.');
      return;
    }

    // Prepare target parent node ID
    const rootId = initialNode?.id || `root_${currentTarget.replace(/\s+/g, '_').toLowerCase()}`;

    // Map discovered nodes
    const newNodes = result.discoveredNodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      details: n.details || `Enriched via ${result.enricherName}`,
      vaultMatch: n.vaultMatch || false,
    }));

    // Map links to root or between nodes
    const newLinks = result.discoveredLinks.map((l) => ({
      source: l.source === result.target ? rootId : l.source,
      target: l.target,
      label: l.label || 'enriched_relation',
    }));

    onUpdateGraph({ nodes: newNodes, links: newLinks });
    setImportedStatus(prev => ({ ...prev, [result.enricherId]: true }));
    onLog?.(`[ENRICHER HUB] Berjaya mengimport ${newNodes.length} nod dan ${newLinks.length} pautan ke graf!`, 'success');
  };

  const activeResult = results[activeResultIdx];

  return (
    <div className="flex flex-col h-[750px] max-h-[85vh] bg-[#0c1017] text-slate-200 text-xs font-sans select-none overflow-hidden">
      {/* Top Banner: Modular Architecture Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#121824] border-b border-cyan-500/20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Zap size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-wide text-white font-mono uppercase">
                Modular Enricher Hub
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 tracking-wider">
                V3.8 TACTICAL
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                POI-FIRST SUITE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Enjin modul OSINT termaju: Penjejakan Individu/POI, Kripto Multi-Chain & Rangkaian Siber
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunAllMatched}
            disabled={isBatchRunning || executingId !== null}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-900/40 border border-cyan-400/50 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isBatchRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            <span>Jalankan Semua Padanan ({filteredEnrichers.filter(isRecommended).length})</span>
          </button>
        </div>
      </div>

      {/* Target Configuration Bar */}
      <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-[#0e1420] border-b border-slate-800/80 items-center">
        <div className="col-span-5 flex items-center gap-2">
          <label className="text-slate-400 font-mono text-[11px] whitespace-nowrap">Sasaran (Target):</label>
          <div className="relative flex-1">
            <input
              type="text"
              value={currentTarget}
              onChange={(e) => setCurrentTarget(e.target.value)}
              placeholder="Masukkan nama individu, nombor telefon, NRIC, dompet kripto, atau domain..."
              className="w-full bg-[#161f30] border border-cyan-500/30 focus:border-cyan-400 rounded px-3 py-1.5 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
        </div>

        <div className="col-span-3 flex items-center gap-2">
          <label className="text-slate-400 font-mono text-[11px] whitespace-nowrap">Jenis Entiti:</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="flex-1 bg-[#161f30] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="person">👤 Individu / POI</option>
            <option value="phone">📱 Telefon / Telco</option>
            <option value="email">📧 E-mel / ID</option>
            <option value="document">🪪 MyKad / NRIC / Pasport</option>
            <option value="vehicle">🚗 Plat Kenderaan (JPJ)</option>
            <option value="crypto">🪙 Dompet Kripto (Multi-Chain)</option>
            <option value="domain">🌐 Nama Domain</option>
            <option value="ip">🖥️ Alamat IP / Pelayan</option>
            <option value="company">🏢 Syarikat / Korporat (SSM)</option>
            <option value="social">💬 Akaun Media Sosial</option>
          </select>
        </div>

        <div className="col-span-4 flex items-center gap-2">
          <label className="text-slate-400 font-mono text-[11px] whitespace-nowrap">Konteks:</label>
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Maklumat tambahan / wilayah / petunjuk..."
            className="w-full bg-[#161f30] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Main Split Layout: Left Catalog / Right Live Output */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Column: Enricher Modules & Categories */}
        <div className="col-span-7 flex flex-col border-r border-slate-800/80 bg-[#0c1017] overflow-hidden">
          {/* Category Tabs & Search Bar */}
          <div className="p-3 border-b border-slate-800/70 bg-[#0f1522] flex flex-col gap-2.5">
            {/* Tabs */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded text-[11px] font-medium transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-850 text-slate-300'
                }`}
              >
                Semua Modul ({catalog.length})
              </button>
              <button
                onClick={() => setSelectedCategory('poi')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-all ${
                  selectedCategory === 'poi'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-850 text-slate-300'
                }`}
              >
                <User size={13} />
                <span>Individu / POI (Utama)</span>
                <span className="px-1.5 py-0.2 bg-cyan-900/80 text-cyan-200 rounded-full text-[9px]">
                  {catalog.filter(c => c.category === 'poi').length}
                </span>
              </button>
              <button
                onClick={() => setSelectedCategory('crypto')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-all ${
                  selectedCategory === 'crypto'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-850 text-slate-300'
                }`}
              >
                <Coins size={13} />
                <span>Kripto & Kewangan</span>
                <span className="px-1.5 py-0.2 bg-amber-900/80 text-amber-200 rounded-full text-[9px]">
                  {catalog.filter(c => c.category === 'crypto').length}
                </span>
              </button>
              <button
                onClick={() => setSelectedCategory('network')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-all ${
                  selectedCategory === 'network'
                    ? 'bg-blue-500 text-slate-950 font-bold shadow-md shadow-blue-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-850 text-slate-300'
                }`}
              >
                <Globe size={13} />
                <span>Rangkaian & Siber</span>
                <span className="px-1.5 py-0.2 bg-blue-900/80 text-blue-200 rounded-full text-[9px]">
                  {catalog.filter(c => c.category === 'network').length}
                </span>
              </button>
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Tapis modul mengikut nama, tag, atau kata kunci..."
                className="w-full bg-[#141b29] border border-slate-700/80 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/80"
              />
            </div>
          </div>

          {/* Enricher Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {loadingCatalog ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                <RefreshCw size={24} className="animate-spin text-cyan-400" />
                <span>Memuatkan katalog enricher modular...</span>
              </div>
            ) : filteredEnrichers.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-mono">
                Tiada modul enricher ditemui untuk carian ini.
              </div>
            ) : (
              filteredEnrichers.map((enricher) => {
                const recommended = isRecommended(enricher);
                const isRunning = executingId === enricher.id;
                const hasExecuted = results.some(r => r.enricherId === enricher.id);

                return (
                  <div
                    key={enricher.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      recommended
                        ? 'bg-[#121a2a] border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                        : 'bg-[#0f1420] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-2 rounded-md ${
                          enricher.category === 'poi'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : enricher.category === 'crypto'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {enricher.category === 'poi' && <User size={16} />}
                          {enricher.category === 'crypto' && <Coins size={16} />}
                          {enricher.category === 'network' && <Globe size={16} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100 text-xs tracking-wide">
                              {enricher.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {enricher.badge}
                            </span>
                            {recommended && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                SEPADAN
                              </span>
                            )}
                            {hasExecuted && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <CheckCircle2 size={10} /> SIAP
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {enricher.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-slate-500">
                            <span>Jenis Sasaran:</span>
                            <span className="text-cyan-400">
                              {enricher.applicableTypes.join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleRunEnricher(enricher)}
                        disabled={isRunning || isBatchRunning}
                        className={`px-3 py-1.5 rounded font-mono font-semibold flex items-center gap-1.5 transition-all text-[11px] shrink-0 cursor-pointer ${
                          isRunning
                            ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50'
                            : 'bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white border border-cyan-500/40 shadow-sm'
                        }`}
                      >
                        {isRunning ? (
                          <>
                            <RefreshCw size={12} className="animate-spin text-cyan-300" />
                            <span>Memproses...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={12} />
                            <span>Jalankan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Execution Output & Node Extraction */}
        <div className="col-span-5 flex flex-col bg-[#0b0e14] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-[#101623] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TerminalIcon size={14} className="text-cyan-400" />
              <span className="font-mono font-bold text-slate-200 uppercase tracking-wider">
                Hasil Pengayaan & Penemuan Nod
              </span>
              <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded text-[10px] font-mono">
                {results.length} laporan
              </span>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <Layers size={36} className="text-slate-700 mb-3" />
              <p className="font-mono text-xs text-slate-400">Belum ada modul enricher dijalankan.</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                Pilih modul di sebelah kiri atau tekan butang <span className="text-cyan-400 font-semibold">"Jalankan Semua Padanan"</span> untuk memulakan penyiasatan.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Result Select Tabs if multiple results */}
              {results.length > 1 && (
                <div className="flex items-center gap-1 p-2 bg-[#0e131d] border-b border-slate-800 overflow-x-auto custom-scrollbar">
                  {results.map((res, idx) => (
                    <button
                      key={res.enricherId + idx}
                      onClick={() => setActiveResultIdx(idx)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono whitespace-nowrap transition-all ${
                        activeResultIdx === idx
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {res.enricherName.split(' ')[0]} ({res.discoveredNodes.length})
                    </button>
                  ))}
                </div>
              )}

              {activeResult && (
                <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4 custom-scrollbar">
                  {/* Result Summary Card */}
                  <div className="p-3.5 rounded-lg bg-[#131b2b] border border-cyan-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-cyan-300 font-mono text-xs">
                        {activeResult.enricherName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock size={11} /> {activeResult.executionTimeMs}ms
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                          activeResult.riskLevel === 'critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : activeResult.riskLevel === 'high'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          RISIKO: {activeResult.riskLevel || 'LOW'}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {activeResult.summary}
                    </p>
                  </div>

                  {/* Discovered Entities Box */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-400" />
                        Nod Baharu Ditemui ({activeResult.discoveredNodes.length})
                      </span>

                      {/* Import Button */}
                      <button
                        onClick={() => handleImportToGraph(activeResult)}
                        disabled={importedStatus[activeResult.enricherId]}
                        className={`px-3 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          importedStatus[activeResult.enricherId]
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                        }`}
                      >
                        {importedStatus[activeResult.enricherId] ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Telah Diimport ke Graf</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle size={12} />
                            <span>Import ke Graf</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {activeResult.discoveredNodes.map((n) => (
                        <div
                          key={n.id}
                          className="p-2.5 rounded bg-[#111723] border border-slate-800 hover:border-slate-700 flex items-start justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white text-xs">
                                {n.label}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-slate-800 text-cyan-300 border border-slate-700">
                                {n.type}
                              </span>
                            </div>
                            {n.details && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{n.details}</p>
                            )}
                          </div>
                          {n.confidence && (
                            <span className="font-mono text-[10px] text-slate-500">
                              {n.confidence}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Structured Data Viewer */}
                  {activeResult.structuredData && Object.keys(activeResult.structuredData).length > 0 && (
                    <div>
                      <span className="font-mono text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                        Data Struktur (Raw Key-Value)
                      </span>
                      <pre className="p-3 bg-[#080b10] border border-slate-800 rounded font-mono text-[10px] text-cyan-300/90 overflow-x-auto max-h-44 custom-scrollbar">
                        {JSON.stringify(activeResult.structuredData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#0e1420] border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Hub Enricher Sedia • 18 Modul Terbina • Kuasa Penuh OSINT Red Horizon</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs transition-colors cursor-pointer"
        >
          Tutup Panel
        </button>
      </div>
    </div>
  );
};
