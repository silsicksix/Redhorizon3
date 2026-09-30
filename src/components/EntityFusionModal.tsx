import React, { useState } from 'react';
import { Node, Link, GraphData } from '../types';
import { findDuplicateCandidates, mergeNodes, autoResolveAndFuseGraph, DuplicateCandidate, calculateConfidence } from '../services/entityResolutionService';
import { GitMerge, CheckCircle, ShieldAlert, Sparkles, X, ArrowRight, Layers, FileText } from 'lucide-react';

interface EntityFusionModalProps {
  graph: GraphData;
  onUpdateGraph: (updatedGraph: GraphData) => void;
  onClose: () => void;
  onLog: (msg: string, type: 'info' | 'warning' | 'success' | 'error') => void;
}

export const EntityFusionModal: React.FC<EntityFusionModalProps> = ({
  graph,
  onUpdateGraph,
  onClose,
  onLog
}) => {
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>(() => findDuplicateCandidates(graph.nodes));
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);

  const handleAutoFuseAll = () => {
    const { updatedGraph, mergeCount } = autoResolveAndFuseGraph(graph);
    if (mergeCount > 0) {
      onUpdateGraph(updatedGraph);
      onLog(`[FASA 1: ENTITY FUSION] Successfully fused ${mergeCount} duplicate entities into single canonical nodes.`, 'success');
      onClose();
    } else {
      onLog('[FASA 1: ENTITY FUSION] No candidate duplicates detected in active graph.', 'info');
    }
  };

  const handleMergeSingleCandidate = (candidate: DuplicateCandidate) => {
    const { mergedNode, updatedLinks, removedNodeIds } = mergeNodes(candidate.primaryNode, candidate.candidateNodes, graph.links);
    
    const removedSet = new Set(removedNodeIds);
    const newNodes = graph.nodes.filter(n => !removedSet.has(n.id) && n.id !== mergedNode.id);
    newNodes.push(mergedNode);

    const newGraph: GraphData = {
      nodes: newNodes,
      links: updatedLinks
    };

    onUpdateGraph(newGraph);
    onLog(`[FASA 1: ENTITY FUSION] Merged "${candidate.candidateNodes.map(c => c.label).join(', ')}" into "${mergedNode.label}".`, 'success');

    // Re-evaluate remaining candidates
    const remaining = findDuplicateCandidates(newNodes);
    setCandidates(remaining);
    setSelectedCandidateIndex(0);
  };

  const currentCandidate = candidates[selectedCandidateIndex];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0c10] border border-cyan-500/50 shadow-[0_0_30px_rgba(0,240,255,0.2)] w-full max-w-4xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-cyan-950/80 via-black to-blue-950/80 px-5 py-4 border-b border-cyan-500/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400">
              <GitMerge size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                  FASA 1: ENTITY RESOLUTION
                </span>
                <span className="text-xs font-mono text-gray-400">Canonical Profiling & Data Fusion</span>
              </div>
              <h2 className="text-lg font-black text-white tracking-wide mt-0.5">
                Penggabungan Entiti & Penghapusan Duplikasi
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          
          {candidates.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400">
                <CheckCircle size={48} />
              </div>
              <h3 className="text-lg font-bold text-white">Tiada Entiti Duplikat Dikesan</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Semua entiti/nod dalam ruang kerja OSINT ini telah diselaraskan secara unik. Tiada duplikasi nama, handle sosial, atau pautan URL bertindih.
              </p>
            </div>
          ) : (
            <>
              {/* TOP ACTION BAR */}
              <div className="bg-cyan-950/30 border border-cyan-500/30 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="text-amber-400 shrink-0" size={24} />
                  <div>
                    <p className="text-sm font-bold text-white">
                      Dikesan {candidates.length} Pasangan Entiti Yang Berpotensi Bertindih
                    </p>
                    <p className="text-xs text-gray-400">
                      Sistem mengesan nama/handle yang sama. Menggabungkannya akan menyatukan sejarah bukti & pautan tanpa kehilangan data.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleAutoFuseAll}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all shrink-0 cursor-pointer"
                >
                  <Sparkles size={16} /> Auto-Fuse Semua ({candidates.length})
                </button>
              </div>

              {/* CANDIDATE INSPECTOR */}
              {currentCandidate && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-wider">
                      Ujian Pengesahan #{selectedCandidateIndex + 1} Daripada {candidates.length}
                    </span>
                    <span className="text-xs text-amber-400 font-mono bg-amber-950/50 px-2.5 py-0.5 rounded border border-amber-500/40">
                      Sebab: {currentCandidate.similarityReason}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    
                    {/* PRIMARY TARGET */}
                    <div className="bg-gray-900/80 border border-cyan-500/50 p-4 rounded-lg space-y-3 relative">
                      <div className="absolute top-3 right-3 text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40 font-bold uppercase">
                        Entiti Utama (Primary)
                      </div>

                      <div className="flex items-center gap-3">
                        {currentCandidate.primaryNode.imageUrl ? (
                          <img
                            src={currentCandidate.primaryNode.imageUrl}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-cyan-500/50"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black">
                            {currentCandidate.primaryNode.label.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-white text-base">{currentCandidate.primaryNode.label}</h4>
                          <span className="text-xs text-cyan-400 font-mono uppercase bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 inline-block mt-0.5">
                            {currentCandidate.primaryNode.type}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-300 font-mono bg-black/50 p-2.5 rounded border border-gray-800 space-y-1">
                        <p><strong className="text-gray-400">Details:</strong> {currentCandidate.primaryNode.details || 'Tiada info tambahan'}</p>
                        {currentCandidate.primaryNode.url && (
                          <p className="truncate"><strong className="text-gray-400">URL:</strong> {currentCandidate.primaryNode.url}</p>
                        )}
                      </div>

                      {/* CONFIDENCE PREVIEW */}
                      {(() => {
                        const conf = calculateConfidence(currentCandidate.primaryNode);
                        return (
                          <div className="flex items-center justify-between text-xs font-mono pt-1">
                            <span className="text-gray-400">Skor Keyakinan Asal:</span>
                            <span className={`font-bold ${conf.score >= 75 ? 'text-emerald-400' : conf.score >= 45 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {conf.score}% ({conf.level})
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* CANDIDATE SECONDARIES */}
                    <div className="bg-gray-900/80 border border-amber-500/50 p-4 rounded-lg space-y-3 relative flex flex-col justify-between">
                      <div>
                        <div className="absolute top-3 right-3 text-[10px] font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 font-bold uppercase">
                          Entiti Sekunder ({currentCandidate.candidateNodes.length})
                        </div>

                        {currentCandidate.candidateNodes.map(secNode => (
                          <div key={secNode.id} className="space-y-2">
                            <div className="flex items-center gap-3">
                              {secNode.imageUrl ? (
                                <img
                                  src={secNode.imageUrl}
                                  alt=""
                                  className="w-12 h-12 rounded-lg object-cover border border-amber-500/50"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-amber-950 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                                  {secNode.label.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-white text-base">{secNode.label}</h4>
                                <span className="text-xs text-amber-400 font-mono uppercase bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 inline-block mt-0.5">
                                  {secNode.type}
                                </span>
                              </div>
                            </div>

                            <div className="text-xs text-gray-300 font-mono bg-black/50 p-2.5 rounded border border-gray-800 space-y-1">
                              <p><strong className="text-gray-400">Details:</strong> {secNode.details || 'Tiada info tambahan'}</p>
                              {secNode.url && (
                                <p className="truncate"><strong className="text-gray-400">URL:</strong> {secNode.url}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* MERGE BUTTON */}
                      <button
                        onClick={() => handleMergeSingleCandidate(currentCandidate)}
                        className="w-full mt-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <GitMerge size={16} /> Gabungkan Kedua-dua Entiti Ini
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-black/90 p-4 border-t border-gray-800 flex items-center justify-between text-xs font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-cyan-400" />
            <span>Jumlah Nod Dalam Graf: <strong>{graph.nodes.length}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors cursor-pointer"
          >
            Tutup Window
          </button>
        </div>

      </div>
    </div>
  );
};
