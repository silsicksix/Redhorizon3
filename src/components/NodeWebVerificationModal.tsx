import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Plus,
  Network,
  X,
  FileText,
  AlertCircle,
  Zap,
  ArrowRight,
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Node, GraphData } from '../types';
import { verifyNodeAtWeb, NodeWebVerificationResult } from '../services/aiAnalystService';
import { useGlobalStore } from '../store/GlobalStore';

interface NodeWebVerificationModalProps {
  node: Node;
  graphData: GraphData;
  onClose: () => void;
  onUpdateGraph: (data: Partial<GraphData>) => void;
  onLog: (msg: string, type: 'info' | 'warning' | 'error' | 'success') => void;
  onOpenTool?: (toolId: string, initialTarget?: string) => void;
}

export const NodeWebVerificationModal: React.FC<NodeWebVerificationModalProps> = ({
  node,
  graphData,
  onClose,
  onUpdateGraph,
  onLog,
  onOpenTool
}) => {
  const { state } = useGlobalStore();
  const [customQuery, setCustomQuery] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [result, setResult] = useState<NodeWebVerificationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'entities' | 'sources' | 'discrepancies'>('overview');
  const [injectedEntityLabels, setInjectedEntityLabels] = useState<Set<string>>(new Set());

  const executeVerification = async (query?: string) => {
    setIsVerifying(true);
    try {
      const res = await verifyNodeAtWeb(node, graphData, query || customQuery, state.config);
      setResult(res);
      if (res.verdict === 'VERIFIED_LEGITIMATE') {
        onLog(`[Neural Fact-Check] Nod "${node.label}" disahkan sahih melalui carian web langsung.`, 'success');
      } else if (res.verdict === 'ANOMALOUS_DISCREPANCY' || res.verdict === 'SUSPICIOUS_RISK') {
        onLog(`[Neural Fact-Check] Amaran: Anomali atau risiko dikesan pada nod "${node.label}".`, 'warning');
      } else {
        onLog(`[Neural Fact-Check] Pengesahan web selesai untuk nod "${node.label}".`, 'info');
      }
    } catch (e: any) {
      onLog(`Ralat pengesahan web: ${e.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    executeVerification();
  }, [node.id]);

  // Inject single discovered entity into canvas
  const handleInjectEntity = (ent: { label: string; type: string; details?: string; relationship?: string }) => {
    if (injectedEntityLabels.has(ent.label)) return;

    const newId = `ent_web_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newNode: Node = {
      id: newId,
      label: ent.label,
      type: ent.type as any || 'person',
      details: ent.details || `Entiti ditemui melalui pengesahan web ke atas ${node.label} (${ent.relationship || 'Hubungan Terpaut'}).`,
      x: (node.x || 400) + (Math.random() * 120 - 60),
      y: (node.y || 300) + (Math.random() * 120 - 60),
      tags: ['web_verified', 'neural_discovery']
    };

    const newLink = {
      source: node.id,
      target: newId,
      label: ent.relationship || 'DISAHKAN_BERKAITAN',
      type: 'VERIFIED_RELATION'
    };

    onUpdateGraph({
      nodes: [...(graphData.nodes || []), newNode],
      links: [...(graphData.links || []), newLink]
    });

    setInjectedEntityLabels(prev => new Set([...prev, ent.label]));
    onLog(`[Neural Graph] Berjaya menyuntik entiti baru "${ent.label}" terpaut ke "${node.label}".`, 'success');
  };

  // Inject all discovered entities
  const handleInjectAllEntities = () => {
    if (!result?.discoveredEntities || result.discoveredEntities.length === 0) return;

    const newNodes: Node[] = [];
    const newLinks: any[] = [];
    const newlyInjected = new Set(injectedEntityLabels);

    result.discoveredEntities.forEach((ent, idx) => {
      if (!newlyInjected.has(ent.label)) {
        const newId = `ent_web_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
        newNodes.push({
          id: newId,
          label: ent.label,
          type: ent.type as any || 'person',
          details: ent.details || `Disahkan melalui carian web ke atas ${node.label} (${ent.relationship || 'Hubungan'}).`,
          x: (node.x || 400) + Math.cos((idx * 2 * Math.PI) / result.discoveredEntities.length) * 150,
          y: (node.y || 300) + Math.sin((idx * 2 * Math.PI) / result.discoveredEntities.length) * 150,
          tags: ['web_verified', 'neural_discovery']
        });
        newLinks.push({
          source: node.id,
          target: newId,
          label: ent.relationship || 'DISAHKAN_BERKAITAN',
          type: 'VERIFIED_RELATION'
        });
        newlyInjected.add(ent.label);
      }
    });

    if (newNodes.length > 0) {
      onUpdateGraph({
        nodes: [...(graphData.nodes || []), ...newNodes],
        links: [...(graphData.links || []), ...newLinks]
      });
      setInjectedEntityLabels(newlyInjected);
      onLog(`[Neural Graph] Berjaya menyuntik ${newNodes.length} entiti baru yang disahkan ke kanvas!`, 'success');
    }
  };

  const getVerdictTheme = (verdict?: string) => {
    switch (verdict) {
      case 'VERIFIED_LEGITIMATE':
        return {
          bg: 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300',
          icon: <ShieldCheck size={20} className="text-emerald-400" />,
          badge: 'DISAHKAN SAHIH (VERIFIED)'
        };
      case 'ANOMALOUS_DISCREPANCY':
        return {
          bg: 'bg-rose-950/70 border-rose-500/80 text-rose-300',
          icon: <AlertTriangle size={20} className="text-rose-400" />,
          badge: 'PERCANGGAHAN / ANOMALI DIKESAN'
        };
      case 'SUSPICIOUS_RISK':
        return {
          bg: 'bg-amber-950/70 border-amber-500/80 text-amber-300',
          icon: <ShieldAlert size={20} className="text-amber-400" />,
          badge: 'AMARAN RISIKO / SCAM'
        };
      case 'PARTIALLY_VERIFIED':
        return {
          bg: 'bg-cyan-950/70 border-cyan-500/80 text-cyan-300',
          icon: <CheckCircle2 size={20} className="text-cyan-400" />,
          badge: 'SEBAHAGIAN DISAHKAN'
        };
      default:
        return {
          bg: 'bg-gray-900 border-gray-700 text-gray-300',
          icon: <HelpCircle size={20} className="text-gray-400" />,
          badge: 'TIADA REKOD TERBUKA (GHOST)'
        };
    }
  };

  const verdictTheme = getVerdictTheme(result?.verdict);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-4xl max-h-[90vh] bg-[#0c1017] border border-cyan-500/40 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-gray-200"
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-950 via-[#0e1626] to-slate-950 border-b border-cyan-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Globe size={18} className="text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  Neural Web Fact-Check & Live Verification
                </h2>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-2 py-0.5 rounded font-mono uppercase">
                  Google Search Grounded
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">
                Pemeriksaan silang konteks kanvas dengan rekod awam internet secara langsung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Target Node Summary Card */}
        <div className="px-5 py-3 bg-black/40 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-mono">Sasaran Disahkan:</span>
            <span className="px-2.5 py-1 bg-cyan-950/80 border border-cyan-500/50 text-white font-bold text-xs rounded flex items-center gap-1.5 font-mono">
              <Fingerprint size={12} className="text-cyan-400" />
              {node.label}
            </span>
            <span className="text-[11px] px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 rounded font-mono uppercase">
              {node.type || 'entity'}
            </span>
          </div>

          {/* Custom Query Search Input */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeVerification()}
                placeholder="cth: Semak pendaftaran SSM, kes mahkamah, atau profil..."
                className="w-full bg-black/70 border border-gray-700 text-white text-xs pl-8 pr-3 py-1.5 rounded focus:border-cyan-500 outline-none font-mono placeholder:text-gray-600"
              />
            </div>
            <button
              onClick={() => executeVerification()}
              disabled={isVerifying}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-bold text-xs rounded transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              <RefreshCw size={12} className={isVerifying ? 'animate-spin' : ''} />
              {isVerifying ? 'Mengimbas...' : 'Sahkan'}
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isVerifying ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-2 border-rose-500/20 border-b-rose-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                <Globe size={24} className="absolute inset-0 m-auto text-cyan-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Menjalankan Carian Live Web & Grounding...
                </h3>
                <p className="text-xs text-gray-400 max-w-md mt-1 font-mono">
                  Menghubungi Google Search Grounding untuk menyemak silang profil "{node.label}", mengesan rekod pangkalan data, berita, dan mengesahkan integriti kontekstual.
                </p>
              </div>
            </div>
          ) : result ? (
            <>
              {/* Verdict Banner */}
              <div className={`p-4 rounded-xl border ${verdictTheme.bg} flex flex-wrap items-center justify-between gap-4 shadow-lg`}>
                <div className="flex items-center gap-3">
                  {verdictTheme.icon}
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-widest font-mono text-gray-400">
                      Keputusan Pengesahan Web (Verification Verdict)
                    </div>
                    <div className="text-sm font-black tracking-wide uppercase font-mono mt-0.5">
                      {result.verdictLabel || verdictTheme.badge}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Confidence Meter */}
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400 uppercase font-mono">Tahap Keyakinan</div>
                    <div className="text-lg font-black text-cyan-400 font-mono">
                      {result.confidenceScore}%
                    </div>
                  </div>

                  {/* Risk Level Badge */}
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400 uppercase font-mono">Tahap Risiko</div>
                    <span className={`inline-block text-[11px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                      result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH'
                        ? 'bg-rose-950 text-rose-300 border-rose-600'
                        : result.riskLevel === 'MEDIUM'
                        ? 'bg-amber-950 text-amber-300 border-amber-600'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                    }`}>
                      {result.riskLevel} RISK
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-gray-800 pb-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Ringkasan & Fakta ({result.confirmedFacts.length})
                </button>
                <button
                  onClick={() => setActiveTab('entities')}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'entities'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Entiti Terbongkar ({result.discoveredEntities?.length || 0})
                  {result.discoveredEntities && result.discoveredEntities.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('discrepancies')}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                    activeTab === 'discrepancies'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Anomali & Isyarat Risiko ({result.discrepancies.length + result.riskSignals.length})
                </button>
                <button
                  onClick={() => setActiveTab('sources')}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                    activeTab === 'sources'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Sumber Carian Langsung ({result.webSources.length})
                </button>
              </div>

              {/* Tab: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Summary Text */}
                  <div className="p-4 bg-black/60 border border-gray-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase font-mono">
                      <FileText size={14} /> Sintesis Eksekutif Pengesahan
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                      {result.summary}
                    </p>
                  </div>

                  {/* Confirmed Facts List */}
                  <div className="p-4 bg-black/60 border border-emerald-900/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase font-mono">
                      <CheckCircle2 size={14} /> Fakta Disahkan di Internet ({result.confirmedFacts.length})
                    </div>
                    {result.confirmedFacts.length > 0 ? (
                      <ul className="space-y-1.5">
                        {result.confirmedFacts.map((fact, i) => (
                          <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 italic">Tiada fakta positif dapat disahkan secara terbuka.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Discovered Entities */}
              {activeTab === 'entities' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-mono">
                      Entiti, profil, atau perniagaan yang ditemui semasa carian web dan boleh disuntik terus ke dalam graf:
                    </p>
                    {result.discoveredEntities && result.discoveredEntities.length > 0 && (
                      <button
                        onClick={handleInjectAllEntities}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded transition-all flex items-center gap-1.5 font-mono cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      >
                        <Plus size={13} /> Suntik Semua Entiti ({result.discoveredEntities.length})
                      </button>
                    )}
                  </div>

                  {result.discoveredEntities && result.discoveredEntities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.discoveredEntities.map((ent, idx) => {
                        const isInjected = injectedEntityLabels.has(ent.label);
                        return (
                          <div
                            key={idx}
                            className="p-3.5 bg-black/60 border border-cyan-900/40 hover:border-cyan-500/60 rounded-xl flex flex-col justify-between gap-2.5 transition-all"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white font-mono">{ent.label}</span>
                                <span className="text-[10px] px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-mono uppercase">
                                  {ent.type}
                                </span>
                              </div>
                              <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                                Hubungan: {ent.relationship || 'Terpaut'}
                              </div>
                              {ent.details && (
                                <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                                  {ent.details}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                              <span className="text-[10px] text-gray-500 font-mono">
                                Padanan: {ent.confidence || 85}%
                              </span>
                              <button
                                onClick={() => handleInjectEntity(ent)}
                                disabled={isInjected}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 font-mono transition-all cursor-pointer ${
                                  isInjected
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-cyan-600 hover:bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                                }`}
                              >
                                {isInjected ? 'Telah Disuntik' : '+ Tambah ke Canvas'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500 text-xs font-mono border border-dashed border-gray-800 rounded-xl">
                      Tiada entiti baru dikesan secara automatik.
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Discrepancies & Risks */}
              {activeTab === 'discrepancies' && (
                <div className="space-y-4">
                  {/* Discrepancies */}
                  <div className="p-4 bg-black/60 border border-rose-900/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase font-mono">
                      <AlertTriangle size={14} /> Percanggahan / Maklumat Tidak Sahih ({result.discrepancies.length})
                    </div>
                    {result.discrepancies.length > 0 ? (
                      <ul className="space-y-1.5">
                        {result.discrepancies.map((disc, i) => (
                          <li key={i} className="text-xs text-rose-200/90 flex items-start gap-2">
                            <span className="text-rose-400 mt-0.5">•</span>
                            <span>{disc}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 italic">Tiada percanggahan nyata dikesan dengan konteks kanvas.</p>
                    )}
                  </div>

                  {/* Risk Signals */}
                  <div className="p-4 bg-black/60 border border-amber-900/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase font-mono">
                      <ShieldAlert size={14} /> Isyarat Risiko / Bendera Merah ({result.riskSignals.length})
                    </div>
                    {result.riskSignals.length > 0 ? (
                      <ul className="space-y-1.5">
                        {result.riskSignals.map((risk, i) => (
                          <li key={i} className="text-xs text-amber-200/90 flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 italic">Tiada pendedahan risiko tinggi atau laporan penipuan ditemui.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Web Sources */}
              {activeTab === 'sources' && (
                <div className="space-y-3">
                  {/* Search Queries Executed */}
                  {result.searchQueries && result.searchQueries.length > 0 && (
                    <div className="p-3 bg-black/60 border border-gray-800 rounded-xl space-y-1.5">
                      <div className="text-[10px] text-gray-400 uppercase font-mono font-bold">
                        Kueri Google Grounding Dijalankan:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.searchQueries.map((q, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-900 border border-gray-700 text-cyan-300 text-[11px] rounded font-mono">
                            🔍 {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clickable Citations */}
                  <div className="space-y-2">
                    <div className="text-[10px] text-gray-400 uppercase font-mono font-bold">
                      Pautan & Rujukan Web Disahkan ({result.webSources.length}):
                    </div>
                    {result.webSources.length > 0 ? (
                      <div className="space-y-1.5">
                        {result.webSources.map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-black/60 border border-gray-800 hover:border-cyan-500/60 rounded-lg flex items-center justify-between gap-3 text-xs text-gray-300 hover:text-cyan-300 transition-all group"
                          >
                            <span className="truncate font-mono">{src.title || src.url}</span>
                            <ExternalLink size={13} className="shrink-0 text-gray-500 group-hover:text-cyan-400" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">Tiada pautan rujukan langsung direkodkan.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Recommended Next Actions */}
              {result.recommendedNextTools && result.recommendedNextTools.length > 0 && (
                <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-cyan-950/40 border border-cyan-900/60 rounded-xl space-y-2">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase font-mono flex items-center gap-1.5">
                    <Zap size={12} /> Alatan RedHorizon Disyorkan Untuk Memajukan Siasatan:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.recommendedNextTools.map((tool, i) => (
                      <button
                        key={i}
                        onClick={() => onOpenTool && onOpenTool(tool.id, node.label)}
                        className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900/80 border border-cyan-600/50 text-cyan-200 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>⚡ {tool.name}</span>
                        <ArrowRight size={11} className="text-cyan-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-gray-400 text-xs font-mono">
              Tiada data pengesahan ditemui.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-black/60 border-t border-gray-800 flex items-center justify-between shrink-0">
          <div className="text-[10px] text-gray-500 font-mono">
            RedHorizon Live Intelligence Engine • Gemini 3.7 Flash
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono font-bold rounded transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
};
