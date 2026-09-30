import React, { useState, useMemo } from 'react';
import { GraphConflict, Node, GraphData, ConflictCategory, ConflictSeverity } from '../types';
import { 
  AlertTriangle, ShieldAlert, CheckCircle2, MapPin, 
  Clock, UserX, Network, Sparkles, Eye, X, RefreshCw, 
  ArrowRight, Filter, ChevronRight, Zap
} from 'lucide-react';

export interface ConflictDetectorModalProps {
  conflicts: GraphConflict[];
  graphData?: GraphData;
  graph?: GraphData;
  onClose: () => void;
  onSelectNode?: (nodeId: string) => void;
  onSelectNodes?: (nodeIds: string[]) => void;
  onResolveConflict?: (conflictId: string) => void;
  onAddConflictNodeToGraph?: (conflict: GraphConflict) => void;
  onRunAiConflictResolution?: (conflict: GraphConflict) => Promise<string | undefined>;
  onRunAiResolution?: (conflict: GraphConflict) => Promise<string | null | undefined>;
  isAiResolving?: boolean;
}

const ConflictDetectorModal: React.FC<ConflictDetectorModalProps> = ({
  conflicts,
  graphData,
  graph,
  onClose,
  onSelectNode,
  onSelectNodes,
  onResolveConflict,
  onAddConflictNodeToGraph,
  onRunAiConflictResolution,
  onRunAiResolution,
  isAiResolving = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [activeConflictId, setActiveConflictId] = useState<string | null>(conflicts[0]?.id || null);
  const [aiResolutionMap, setAiResolutionMap] = useState<Record<string, string>>({});
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);

  const filteredConflicts = useMemo(() => {
    return conflicts.filter(c => {
      if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;
      if (selectedSeverity !== 'ALL' && c.severity !== selectedSeverity) return false;
      return true;
    });
  }, [conflicts, selectedCategory, selectedSeverity]);

  const activeConflict = useMemo(() => {
    return conflicts.find(c => c.id === activeConflictId) || filteredConflicts[0] || null;
  }, [conflicts, activeConflictId, filteredConflicts]);

  const criticalCount = useMemo(() => conflicts.filter(c => c.severity === 'CRITICAL').length, [conflicts]);
  const warningCount = useMemo(() => conflicts.filter(c => c.severity === 'WARNING').length, [conflicts]);

  const handleResolveAi = async (conflict: GraphConflict) => {
    const resolver = onRunAiConflictResolution || onRunAiResolution;
    if (!resolver) return;
    setLoadingAiId(conflict.id);
    try {
      const result = await resolver(conflict);
      if (result) {
        setAiResolutionMap(prev => ({ ...prev, [conflict.id]: result }));
      }
    } finally {
      setLoadingAiId(null);
    }
  };

  const handleFocusNodes = (nodeIds: string[]) => {
    if (onSelectNodes) {
      onSelectNodes(nodeIds);
    } else if (onSelectNode && nodeIds.length > 0) {
      onSelectNode(nodeIds[0]);
    }
  };

  const getCategoryIcon = (cat: ConflictCategory) => {
    switch (cat) {
      case 'SPATIO_TEMPORAL': return <Clock size={14} className="text-amber-400" />;
      case 'IDENTITY': return <UserX size={14} className="text-rose-400" />;
      case 'NETWORK': return <Network size={14} className="text-cyan-400" />;
      case 'RELATIONAL': return <AlertTriangle size={14} className="text-purple-400" />;
      case 'VERIFICATION': return <ShieldAlert size={14} className="text-red-400" />;
      default: return <AlertTriangle size={14} className="text-amber-400" />;
    }
  };

  const getSeverityBadge = (sev: ConflictSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider bg-red-950/80 text-red-300 border border-red-500/60 rounded flex items-center gap-1 shadow-[0_0_8px_rgba(239,68,68,0.3)]"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Kritikal</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-500/60 rounded">Amaran</span>;
      default:
        return <span className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-500/60 rounded">Panduan</span>;
    }
  };

  return (
    <div className="flex flex-col h-full text-gray-200 font-mono overflow-hidden">
      
      {/* Top Intelligence Ribbon */}
      <div className="p-3 bg-gradient-to-r from-red-950/30 via-zinc-950 to-amber-950/30 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-950/80 border border-red-500/60 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.35)] shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              Enjin Pengesan Percanggahan Data
              <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded">
                {conflicts.length} Dikesan
              </span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Pengesanan automatik anomali masa-lokasi, percanggahan identiti, dan pemalsuan hubungan dalam topologi graf.
            </div>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 bg-red-900/30 border border-red-500/40 rounded flex items-center gap-1.5 text-red-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold">{criticalCount}</span> Kritikal
          </div>
          <div className="px-2.5 py-1 bg-amber-900/30 border border-amber-500/40 rounded flex items-center gap-1.5 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-bold">{warningCount}</span> Amaran
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="px-3 py-2 bg-black/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[9px] text-gray-500 uppercase tracking-widest mr-1 flex items-center gap-1">
            <Filter size={10} /> Kategori:
          </span>
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'SPATIO_TEMPORAL', label: 'Masa & Lokasi' },
            { id: 'IDENTITY', label: 'Identiti' },
            { id: 'RELATIONAL', label: 'Hubungan' },
            { id: 'NETWORK', label: 'Rangkaian' },
            { id: 'VERIFICATION', label: 'Kesahihan' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-1 rounded text-[9.5px] font-bold uppercase transition-all ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-500 uppercase tracking-widest mr-1">Tahap:</span>
          {['ALL', 'CRITICAL', 'WARNING'].map(sev => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2 py-0.5 rounded text-[8.5px] uppercase font-bold transition-all ${
                selectedSeverity === sev
                  ? 'bg-white/20 text-white border border-white/40'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {sev === 'ALL' ? 'Semua' : sev}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Body: Left List & Right Dossier View */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        
        {/* Left Conflicts List */}
        <div className="w-full md:w-5/12 border-r border-white/10 flex flex-col overflow-y-auto bg-black/40 p-2 space-y-1.5">
          {filteredConflicts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
              <CheckCircle2 size={36} className="text-emerald-500/60 mb-2" />
              <div className="text-xs font-bold text-gray-300 uppercase">Tiada Percanggahan Dikesan</div>
              <div className="text-[10px] text-gray-500 mt-1 max-w-xs text-center">
                Topologi graf mematuhi logik konsistensi temporal dan tiada pertembungan identiti dikesan buat masa ini.
              </div>
            </div>
          ) : (
            filteredConflicts.map(c => {
              const isActive = activeConflict?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConflictId(c.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer text-left relative overflow-hidden group ${
                    isActive
                      ? 'bg-zinc-900 border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      : 'bg-zinc-950/60 border-white/5 hover:border-white/20 hover:bg-zinc-900/60'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                  )}

                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getCategoryIcon(c.category)}
                      <span className="text-[9px] text-gray-400 font-bold uppercase truncate">
                        {c.category.replace('_', ' ')}
                      </span>
                    </div>
                    {getSeverityBadge(c.severity)}
                  </div>

                  <div className="text-[11px] font-bold text-white group-hover:text-red-300 transition-colors line-clamp-1">
                    {c.title}
                  </div>

                  <div className="text-[9.5px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {c.description}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5 text-[8.5px] text-gray-500 font-mono">
                    <span>{c.nodeIds.length} Nod Terlibat</span>
                    <span className="text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Perincian <ChevronRight size={10} />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Conflict Detail & Resolution Panel */}
        <div className="w-full md:w-7/12 flex flex-col overflow-y-auto bg-zinc-950/90 p-4">
          {activeConflict ? (
            <div className="space-y-4">
              
              {/* Header of Active Conflict */}
              <div className="p-3 rounded-lg bg-zinc-900/90 border border-white/10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(activeConflict.category)}
                    <span className="text-[10px] text-cyan-400 uppercase font-black tracking-widest">
                      {activeConflict.category}
                    </span>
                  </div>
                  {getSeverityBadge(activeConflict.severity)}
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  {activeConflict.title}
                </h3>
                <p className="text-xs text-gray-300 mt-1.5 leading-relaxed font-sans">
                  {activeConflict.description}
                </p>
              </div>

              {/* Side-by-Side Contradiction Comparison Matrix */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Matriks Perbandingan Percanggahan Data:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {activeConflict.conflictingProperties.map((prop, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 rounded bg-black/60 border border-red-500/30 space-y-1"
                    >
                      <div className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">
                        {prop.property}
                      </div>
                      <div className="text-xs font-bold text-red-300 font-mono">
                        {prop.value}
                      </div>
                      <div className="text-[8.5px] text-gray-500 truncate pt-1 border-t border-white/5">
                        Nod Sumber: <span className="text-white font-bold">{prop.nodeLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation Box */}
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/40 text-xs space-y-1">
                <div className="text-[9.5px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1">
                  <Sparkles size={11} /> Cadangan Tindakan Prosedural:
                </div>
                <div className="text-[11px] text-gray-200 leading-relaxed font-sans">
                  {activeConflict.recommendation}
                </div>
              </div>

              {/* AI Resolution Section (Gemini 3.1 Pro) */}
              <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
                    <Zap size={12} className="text-purple-400" /> Semantica AI Dispute Resolution:
                  </div>
                  {(onRunAiConflictResolution || onRunAiResolution) && (
                    <button
                      onClick={() => handleResolveAi(activeConflict)}
                      disabled={loadingAiId === activeConflict.id || isAiResolving}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[9.5px] font-bold uppercase transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.4)] disabled:opacity-50 cursor-pointer"
                    >
                      {loadingAiId === activeConflict.id ? (
                        <>
                          <RefreshCw size={11} className="animate-spin" /> Menganalisis...
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} /> Analisis AI Semantica
                        </>
                      )}
                    </button>
                  )}
                </div>

                {aiResolutionMap[activeConflict.id] ? (
                  <div className="p-2.5 rounded bg-black/60 border border-purple-500/30 text-[10.5px] text-purple-200 leading-relaxed font-sans whitespace-pre-wrap">
                    {aiResolutionMap[activeConflict.id]}
                  </div>
                ) : (
                  <div className="text-[9.5px] text-gray-500 italic">
                    Klik butang di atas untuk meminta AI menyemak kebolehpercayaan bukti dan mengesyorkan rekonsiliasi data.
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFocusNodes(activeConflict.nodeIds)}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase rounded text-[10px] tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.4)] cursor-pointer"
                    title="Pilih dan sorot nod bercanggah di atas kanvas graf"
                  >
                    <Eye size={12} /> Sorot Pada Graf ({activeConflict.nodeIds.length} Nod)
                  </button>

                  {onAddConflictNodeToGraph && (
                    <button
                      onClick={() => onAddConflictNodeToGraph(activeConflict)}
                      className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white border border-red-500/50 font-bold uppercase rounded text-[10px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Jana nod amaran anomali yang menghubungkan bukti di atas graf"
                    >
                      <AlertTriangle size={12} /> Terbitkan Nod Amaran ke Graf
                    </button>
                  )}
                </div>

                {onResolveConflict && (
                  <button
                    onClick={() => onResolveConflict(activeConflict.id)}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/20 rounded text-[9.5px] font-bold uppercase transition-all flex items-center gap-1"
                  >
                    <CheckCircle2 size={11} className="text-emerald-400" /> Selesai / Abaikan
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
              <div className="text-xs">Pilih percanggahan dari senarai sebelah kiri untuk melihat perincian matriks bukti.</div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default ConflictDetectorModal;
