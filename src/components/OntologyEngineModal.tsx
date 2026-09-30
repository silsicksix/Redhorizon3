/**
 * RED HORIZON - DEFENSE ONTOLOGY ENGINE & REASONING HUB MODAL
 * Unified Semantic Taxonomy, Automated Inference Engine, Dead-End Buster, and Next-Best-Action Matrix.
 */

import React, { useState, useMemo } from 'react';
import { 
  Brain, ShieldCheck, AlertTriangle, Network, Zap, CheckCircle2, 
  ArrowRight, Search, Filter, Layers, Database, Sparkles, RefreshCw, 
  ExternalLink, ChevronRight, User, Phone, Coins, Car, MapPin, 
  Building2, Globe, Calendar, Link2, Check, X, Compass, Activity
} from 'lucide-react';
import { GraphData, Node, Link } from '../types';
import { TacticalModalWrapper } from './TacticalModalWrapper';
import { ONTOLOGY_CLASSES, ONTOLOGY_PREDICATES, OntologyClassDef } from '../ontology/ontologySchema';
import { runOntologyInferenceEngine, InferredRelationship } from '../ontology/inferenceEngine';
import { auditInvestigationDeadEnds, autoStructurizeNodeSlots, DeadEndIssue } from '../ontology/deadEndDetector';

interface OntologyEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphData: GraphData;
  onUpdateGraph: (data: { nodes?: Node[]; links?: Link[]; replace?: boolean }) => void;
  onOpenEnricherHub?: (node: Node, target?: string, targetType?: string) => void;
  onSelectNode?: (nodeId: string) => void;
  onLog?: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
}

export const OntologyEngineModal: React.FC<OntologyEngineModalProps> = ({
  isOpen,
  onClose,
  graphData,
  onUpdateGraph,
  onOpenEnricherHub,
  onSelectNode,
  onLog
}) => {
  const [activeTab, setActiveTab] = useState<'inference' | 'deadends' | 'matrix' | 'taxonomy'>('inference');
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ruleFilter, setRuleFilter] = useState<string>('ALL');
  const [selectedInferredIds, setSelectedInferredIds] = useState<Set<string>>(new Set());
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Run Inference Engine
  const inferenceResults = useMemo(() => {
    return runOntologyInferenceEngine(graphData);
  }, [graphData]);

  // Run Dead End Audit
  const deadEndReport = useMemo(() => {
    return auditInvestigationDeadEnds(graphData);
  }, [graphData]);

  // Filtered Inferred Relationships
  const filteredInferred = useMemo(() => {
    return inferenceResults.inferredRelationships.filter(r => {
      const matchSearch = searchTerm === '' || 
        r.sourceLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.targetLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.rationale.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.predicateLabel.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchRule = ruleFilter === 'ALL' || r.ruleId === ruleFilter;
      return matchSearch && matchRule;
    });
  }, [inferenceResults, searchTerm, ruleFilter]);

  // Helper to trigger temporary toast
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    if (onLog) onLog(msg, 'success');
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Toggle selection of inferred relationship
  const toggleSelectInferred = (id: string) => {
    const next = new Set(selectedInferredIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedInferredIds(next);
  };

  // Select all inferred relationships that don't already exist in graph
  const selectAllUnlinked = () => {
    const unlinked = filteredInferred.filter(r => !r.alreadyExistsInGraph).map(r => r.id);
    setSelectedInferredIds(new Set(unlinked));
  };

  // Commit selected inferred relationships to the active graph
  const handleCommitInferredToCanvas = () => {
    const toCommit = inferenceResults.inferredRelationships.filter(r => selectedInferredIds.has(r.id));
    if (toCommit.length === 0) return;

    const newLinks: Link[] = toCommit.map(r => ({
      source: r.sourceId,
      target: r.targetId,
      label: r.predicate,
      timestamp: new Date().toISOString()
    }));

    onUpdateGraph({ links: newLinks });
    showToast(`Berjaya menerapkan ${toCommit.length} hubungan inferens semantik ke kanvas!`);
    setSelectedInferredIds(new Set());
  };

  // Auto-heal a specific dead end issue
  const handleFixDeadEnd = (issue: DeadEndIssue) => {
    if (issue.type === 'UNSTRUCTURED_MANUAL_DATA' && issue.affectedNodeIds.length > 0) {
      const targetNode = graphData.nodes.find(n => n.id === issue.affectedNodeIds[0]);
      if (targetNode) {
        const { updatedNode, generatedSubNodes, generatedLinks } = autoStructurizeNodeSlots(targetNode);
        onUpdateGraph({
          nodes: [updatedNode, ...generatedSubNodes],
          links: generatedLinks
        });
        showToast(`Berjaya menstrukturkan atribut ontologi & menjana ${generatedSubNodes.length} nod semantik!`);
      }
    } else if (issue.type === 'ISOLATED_ORPHAN' && issue.affectedNodeIds.length > 0) {
      const targetNode = graphData.nodes.find(n => n.id === issue.affectedNodeIds[0]);
      if (targetNode && onOpenEnricherHub) {
        onClose();
        onOpenEnricherHub(targetNode);
      }
    } else if (issue.type === 'AMORPHOUS_LINK' && issue.affectedLinkIndices && issue.affectedLinkIndices.length > 0) {
      const idx = issue.affectedLinkIndices[0];
      const link = graphData.links[idx];
      if (link) {
        const updatedLinks = [...graphData.links];
        updatedLinks[idx] = { ...link, label: 'associated_with' };
        onUpdateGraph({ links: updatedLinks, replace: true });
        showToast(`Pautan dinaik taraf kepada predikat piawai 'associated_with'!`);
      }
    }
  };

  // Auto-heal all unstructured manual nodes at once
  const handleAutoHealAllUnstructured = () => {
    const unstructuredIssues = deadEndReport.issues.filter(i => i.type === 'UNSTRUCTURED_MANUAL_DATA');
    if (unstructuredIssues.length === 0) return;

    const allNewNodes: Node[] = [];
    const allNewLinks: Link[] = [];

    unstructuredIssues.forEach(iss => {
      const targetNode = graphData.nodes.find(n => n.id === iss.affectedNodeIds[0]);
      if (targetNode) {
        const { updatedNode, generatedSubNodes, generatedLinks } = autoStructurizeNodeSlots(targetNode);
        allNewNodes.push(updatedNode, ...generatedSubNodes);
        allNewLinks.push(...generatedLinks);
      }
    });

    onUpdateGraph({ nodes: allNewNodes, links: allNewLinks });
    showToast(`Berjaya menstrukturkan ${unstructuredIssues.length} nod manual sekaligus!`);
  };

  if (!isOpen) return null;

  return (
    <TacticalModalWrapper
      modalId="ontology_engine"
      isOpen={isOpen}
      onClose={onClose}
      title="ENJIN ONTOLOGI & PENAAKULAN SEMANTIK (DEFENSE ONTOLOGY HUB)"
      subtitle={`SKOR KESIHATAN KES: ${deadEndReport.healthScore}%`}
      isMinimized={isMinimized}
      onMinimizeToggle={() => setIsMinimized(!isMinimized)}
      accentColor="cyan"
      defaultWidth="90vw"
      defaultHeight="82vh"
    >
      <div className="flex flex-col h-[78vh] bg-[#070b12] text-gray-200 font-mono text-xs select-none">
        
        {/* Top Metric Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-cyan-950/20 border-b border-cyan-800/40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="text-cyan-400 animate-pulse" size={18} />
              <div>
                <span className="font-bold text-white text-sm tracking-wider uppercase">Sistem Ontologi Siasatan</span>
                <span className="text-[10px] text-cyan-400/80 block">Standardisasi Formal Kelas, Hubungan & Resolusi Dead End</span>
              </div>
            </div>

            <div className="h-6 w-px bg-cyan-800/40" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">Skor Kesihatan Kes:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                deadEndReport.healthScore >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                deadEndReport.healthScore >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {deadEndReport.healthScore}% {deadEndReport.healthScore >= 80 ? 'KALIS RALAT' : 'PERLU PENINGKATAN'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] bg-black/40 px-2.5 py-1 rounded border border-cyan-900/50">
              <span className="text-cyan-400 font-bold">{inferenceResults.statistics.newDiscoveriesCount}</span>
              <span className="text-gray-400">Petunjuk Inferens Tersembunyi</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] bg-black/40 px-2.5 py-1 rounded border border-rose-900/50">
              <span className="text-rose-400 font-bold">{deadEndReport.criticalCount}</span>
              <span className="text-gray-400">Halangan Dead End</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-cyan-950 bg-[#04080e] px-3 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('inference')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'inference'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-cyan-950/20'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'inference' ? 'text-cyan-400 animate-spin-slow' : ''} />
            <span>Enjin Penaakulan ({inferenceResults.inferredRelationships.length})</span>
            {inferenceResults.statistics.newDiscoveriesCount > 0 && (
              <span className="bg-cyan-500 text-black font-extrabold text-[9px] px-1.5 py-0.2 rounded-full">
                +{inferenceResults.statistics.newDiscoveriesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('deadends')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'deadends'
                ? 'border-rose-400 text-rose-300 bg-rose-950/40'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-rose-950/20'
            }`}
          >
            <AlertTriangle size={14} className={activeTab === 'deadends' ? 'text-rose-400' : ''} />
            <span>Pembongkar Dead End ({deadEndReport.totalIssues})</span>
            {deadEndReport.criticalCount > 0 && (
              <span className="bg-rose-500 text-white font-extrabold text-[9px] px-1.5 py-0.2 rounded-full">
                {deadEndReport.criticalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'matrix'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-emerald-950/20'
            }`}
          >
            <Compass size={14} className={activeTab === 'matrix' ? 'text-emerald-400' : ''} />
            <span>Matriks Langkah Seterusnya ({graphData.nodes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('taxonomy')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'taxonomy'
                ? 'border-indigo-400 text-indigo-300 bg-indigo-950/40'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-indigo-950/20'
            }`}
          >
            <Layers size={14} className={activeTab === 'taxonomy' ? 'text-indigo-400' : ''} />
            <span>Taksonomi & Skema Rasmi</span>
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="mx-4 mt-2 p-2.5 bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 rounded flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span className="font-bold text-xs">{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab 1: Inference Engine */}
        {activeTab === 'inference' && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3">
            {/* Control & Filter Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0c1320] p-2.5 rounded border border-cyan-900/40">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Search size={14} className="text-gray-400 ml-1" />
                <input
                  type="text"
                  placeholder="Cari petunjuk mengikut label entiti, predikat, atau rasional..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-black/60 border border-cyan-900/60 rounded px-2.5 py-1 text-white text-xs w-full focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={13} className="text-gray-400" />
                <select
                  value={ruleFilter}
                  onChange={e => setRuleFilter(e.target.value)}
                  className="bg-black/80 border border-cyan-900/60 rounded px-2 py-1 text-cyan-300 text-xs focus:outline-none"
                >
                  <option value="ALL">Semua Peraturan Penaakulan</option>
                  <option value="SHARED_IDENTIFIER">Resolusi Pengecam Silang (Identity Bridge)</option>
                  <option value="SPATIO_TEMPORAL_COPRESENCE">Pertemuan Spatio-Temporal</option>
                  <option value="MULTI_HOP_FINANCIAL">Laluan Dana Transit (Smurfing)</option>
                  <option value="COMMON_ASSOCIATE">Triangulasi Perantara (Broker)</option>
                </select>

                <button
                  onClick={selectAllUnlinked}
                  className="px-2.5 py-1 bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 rounded border border-cyan-700/50 text-[11px] font-bold transition-all"
                >
                  Pilih Semua Yang Belum Dipautkan
                </button>

                <button
                  onClick={handleCommitInferredToCanvas}
                  disabled={selectedInferredIds.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold rounded text-[11px] transition-all"
                >
                  <Zap size={13} />
                  <span>Terapkan ke Kanvas ({selectedInferredIds.size})</span>
                </button>
              </div>
            </div>

            {/* Inference List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredInferred.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 border border-dashed border-cyan-900/30 rounded">
                  <Brain size={32} className="mb-2 text-cyan-900" />
                  <p className="text-sm font-bold text-gray-400">Tiada Hubungan Inferens Baharu Dikesan</p>
                  <p className="text-[11px] text-gray-600 mt-1 max-w-md text-center">
                    Tambah nod baharu melalui 'Manual Entry' atau jalankan 'Modular Enricher Hub' untuk membolehkan enjin merungkaikan hubungan tersembunyi.
                  </p>
                </div>
              ) : (
                filteredInferred.map(rel => {
                  const isSelected = selectedInferredIds.has(rel.id);
                  return (
                    <div
                      key={rel.id}
                      onClick={() => !rel.alreadyExistsInGraph && toggleSelectInferred(rel.id)}
                      className={`p-3 rounded border transition-all cursor-pointer ${
                        rel.alreadyExistsInGraph 
                          ? 'bg-black/20 border-gray-800/50 opacity-60' 
                          : isSelected
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                          : 'bg-[#0a101b] border-cyan-900/40 hover:border-cyan-600/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected || rel.alreadyExistsInGraph}
                            disabled={rel.alreadyExistsInGraph}
                            onChange={() => toggleSelectInferred(rel.id)}
                            className="rounded border-cyan-800 text-cyan-500 focus:ring-0 focus:outline-none"
                            onClick={e => e.stopPropagation()}
                          />
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-cyan-300 text-xs px-2 py-0.5 bg-cyan-950/80 rounded border border-cyan-800/50">
                                {rel.ruleName}
                              </span>
                              <span className="text-[10px] text-amber-300 font-bold px-1.5 py-0.5 bg-amber-950/50 rounded border border-amber-800/50">
                                Keyakinan: {rel.confidence}%
                              </span>
                              {rel.alreadyExistsInGraph && (
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                  <Check size={11} /> Sedia Ada di Kanvas
                                </span>
                              )}
                            </div>

                            {/* Relationship Preview */}
                            <div className="flex items-center gap-2 mt-2 text-sm">
                              <span 
                                onClick={(e) => { e.stopPropagation(); onSelectNode && onSelectNode(rel.sourceId); }}
                                className="font-bold text-white hover:text-cyan-400 underline decoration-cyan-800 cursor-pointer"
                              >
                                {rel.sourceLabel}
                              </span>
                              <ArrowRight size={13} className="text-cyan-400 shrink-0" />
                              <span className="px-2 py-0.5 bg-black/60 text-cyan-200 border border-cyan-900 rounded font-bold text-xs">
                                {rel.predicateLabel}
                              </span>
                              <ArrowRight size={13} className="text-cyan-400 shrink-0" />
                              <span 
                                onClick={(e) => { e.stopPropagation(); onSelectNode && onSelectNode(rel.targetId); }}
                                className="font-bold text-white hover:text-cyan-400 underline decoration-cyan-800 cursor-pointer"
                              >
                                {rel.targetLabel}
                              </span>
                            </div>

                            {/* Rationale explanation */}
                            <p className="text-gray-300 text-[11px] mt-1.5 leading-relaxed">
                              {rel.rationale}
                            </p>

                            {/* Evidence Breakdown */}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {rel.evidenceItems.map((ev, eIdx) => (
                                <span key={eIdx} className="text-[10px] bg-black/40 text-gray-400 px-2 py-0.5 rounded border border-gray-800">
                                  {ev}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {!rel.alreadyExistsInGraph && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateGraph({
                                links: [{
                                  source: rel.sourceId,
                                  target: rel.targetId,
                                  label: rel.predicate,
                                  timestamp: new Date().toISOString()
                                }]
                              });
                              showToast(`Berjaya menerapkan pautan: [${rel.sourceLabel}] -> [${rel.targetLabel}]`);
                            }}
                            className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-500 hover:text-black text-cyan-300 rounded border border-cyan-700/60 font-bold text-[10px] shrink-0 transition-all"
                          >
                            Pautkan Segera
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Dead-End Buster */}
        {activeTab === 'deadends' && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3">
            <div className="flex items-center justify-between bg-rose-950/20 p-3 rounded border border-rose-900/40">
              <div>
                <h4 className="font-bold text-rose-300 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-400" />
                  Audit Kualiti & Pembongkar Jalan Buntu Siasatan
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Mengenal pasti punca yang menyekat perkembangan kes (data manual mentah, nod terpencil, hubungan gelap) dan membaikinya dengan satu klik.
                </p>
              </div>

              {deadEndReport.issues.some(i => i.type === 'UNSTRUCTURED_MANUAL_DATA') && (
                <button
                  onClick={handleAutoHealAllUnstructured}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs transition-all shadow-lg shadow-rose-900/30"
                >
                  <Sparkles size={14} />
                  <span>Strukturkan Semua Data Manual ({deadEndReport.issues.filter(i => i.type === 'UNSTRUCTURED_MANUAL_DATA').length})</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {deadEndReport.issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-emerald-400 border border-dashed border-emerald-900/40 rounded">
                  <ShieldCheck size={36} className="mb-2 text-emerald-500" />
                  <p className="text-sm font-bold">Graf Siasatan Bersih & Kalis Ralat</p>
                  <p className="text-[11px] text-gray-400 mt-1">Tiada sebarang jalan buntu atau nod terasing dikesan pada masa ini.</p>
                </div>
              ) : (
                deadEndReport.issues.map(iss => (
                  <div
                    key={iss.id}
                    className={`p-3 rounded border ${
                      iss.severity === 'CRITICAL' ? 'bg-rose-950/30 border-rose-900/60' :
                      iss.severity === 'WARNING' ? 'bg-amber-950/30 border-amber-900/60' :
                      'bg-cyan-950/30 border-cyan-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            iss.severity === 'CRITICAL' ? 'bg-rose-900/60 text-rose-300 border-rose-700/60' :
                            iss.severity === 'WARNING' ? 'bg-amber-900/60 text-amber-300 border-amber-700/60' :
                            'bg-cyan-900/60 text-cyan-300 border-cyan-700/60'
                          }`}>
                            {iss.severity}
                          </span>
                          <span className="font-bold text-white text-xs">{iss.title}</span>
                        </div>

                        <p className="text-gray-300 text-[11px] mt-1.5 leading-relaxed">
                          {iss.description}
                        </p>

                        <div className="mt-2 text-[10px] text-cyan-300 bg-black/50 p-1.5 rounded border border-cyan-900/40">
                          <span className="font-bold text-cyan-400">Tindakan Disyorkan: </span>
                          {iss.recommendation}
                        </div>
                      </div>

                      {iss.autoFixAvailable && (
                        <button
                          onClick={() => handleFixDeadEnd(iss)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] shrink-0 transition-all flex items-center gap-1 shadow-md shadow-emerald-950"
                        >
                          <Zap size={12} />
                          <span>{iss.fixActionLabel || 'Baiki Automatik'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Next-Best-Action Matrix */}
        {activeTab === 'matrix' && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3">
            <div className="bg-[#0b1322] p-3 rounded border border-cyan-900/40">
              <h4 className="font-bold text-cyan-300 text-sm flex items-center gap-2">
                <Compass size={16} className="text-cyan-400" />
                Matriks Pembongkaran Sasaran (Next Best Action Navigator)
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Setiap entiti dipadankan dengan langkah penyiasatan paling strategik berasaskan kelas ontologi agar proses siasatan sentiasa mara ke hadapan.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {graphData.nodes.map(n => {
                const classDef = ONTOLOGY_CLASSES[n.type] || ONTOLOGY_CLASSES.person;
                return (
                  <div key={n.id} className="p-3 bg-[#0a101b] rounded border border-gray-800 hover:border-cyan-800 transition-all">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-800 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span 
                          style={{ backgroundColor: `${classDef.color}20`, borderColor: `${classDef.color}60`, color: classDef.color }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold border"
                        >
                          {classDef.label}
                        </span>
                        <span className="font-bold text-white text-sm">{n.label}</span>
                      </div>

                      <button
                        onClick={() => {
                          if (onOpenEnricherHub) {
                            onClose();
                            onOpenEnricherHub(n);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-500 hover:text-black text-cyan-300 rounded border border-cyan-700/60 font-bold text-[10px] transition-all"
                      >
                        <Zap size={11} />
                        <span>Buka Hab Pengayaan</span>
                      </button>
                    </div>

                    {n.details && (
                      <p className="text-gray-400 text-[11px] line-clamp-2 mb-2 italic">
                        "{n.details}"
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {classDef.suggestedPivots.map(p => (
                        <div
                          key={p.id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded border border-cyan-900/40 text-[10px] hover:border-cyan-500 transition-all cursor-pointer"
                          onClick={() => {
                            if (onOpenEnricherHub) {
                              onClose();
                              onOpenEnricherHub(n, n.label, n.type);
                            }
                          }}
                        >
                          <span className="text-cyan-400 font-bold">⚡ {p.label}:</span>
                          <span className="text-gray-300 truncate max-w-[200px]">{p.description}</span>
                          <ArrowRight size={10} className="text-cyan-500 shrink-0 ml-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Taxonomy & Schema */}
        {activeTab === 'taxonomy' && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {/* Classes Column */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-1">
                  <Database size={14} className="text-cyan-400" />
                  Kelas Entiti Rasmi (Entity Classes)
                </h4>
                {Object.values(ONTOLOGY_CLASSES).map(cls => (
                  <div key={cls.id} className="p-3 bg-[#0a101b] rounded border border-gray-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        style={{ backgroundColor: `${cls.color}20`, borderColor: `${cls.color}60`, color: cls.color }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold border"
                      >
                        {cls.category}
                      </span>
                      <span className="font-bold text-white text-xs">{cls.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-2">{cls.description}</p>
                    
                    <div className="text-[10px] text-gray-500">
                      <span className="font-bold text-gray-400">Sifat Utama: </span>
                      {cls.properties.map(p => p.label).join(', ')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Predicates Column */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-1">
                  <Link2 size={14} className="text-indigo-400" />
                  Predikat & Hubungan Semantik (Predicates)
                </h4>
                {Object.values(ONTOLOGY_PREDICATES).map(pred => (
                  <div key={pred.id} className="p-3 bg-[#0a101b] rounded border border-gray-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-indigo-300 text-xs">{pred.label}</span>
                      <span className="text-[9px] bg-black text-gray-400 px-1.5 py-0.5 rounded border border-gray-800 font-mono">
                        {pred.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-2">{pred.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      {pred.inverse && <span>Songsan (Inverse): <strong className="text-cyan-400">{pred.inverse}</strong></span>}
                      {pred.isSymmetric && <span className="text-amber-400 font-bold">Simetri (2-Arah)</span>}
                      {pred.isTransitive && <span className="text-emerald-400 font-bold">Transitif (Multi-Hop)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </TacticalModalWrapper>
  );
};
