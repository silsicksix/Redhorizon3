
import React, { useState, useMemo } from 'react';
import { GraphData, Node, Link } from '../types';
import { Network, TrendingUp, GitMerge, X, ShieldAlert, ArrowRight, BrainCircuit, Loader2, Gauge } from 'lucide-react';
import { analyzeConnectionPath } from '../services/geminiService';

interface SnaPanelProps {
  graph: GraphData;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

// Helper: Calculate Degree Centrality
const calculateDegreeCentrality = (nodes: Node[], links: Link[]) => {
  const scores: Record<string, number> = {};
  (nodes || []).forEach(n => scores[n.id] = 0);
  
  (links || []).forEach(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (scores[s] !== undefined) scores[s]++;
    if (scores[t] !== undefined) scores[t]++;
  });

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, score]) => ({ id, score }));
};

// Helper: Simple Betweenness/Bridge heuristic
const findKeyBrokers = (nodes: Node[], links: Link[]) => {
    const adj: Record<string, string[]> = {};
    (nodes || []).forEach(n => adj[n.id] = []);
    (links || []).forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (adj[s]) adj[s].push(t);
        if (adj[t]) adj[t].push(s);
    });

    const scores: Record<string, number> = {};
    
    (nodes || []).forEach(node => {
        const neighbors = adj[node.id] || [];
        if (neighbors.length < 2) {
            scores[node.id] = 0;
            return;
        }
        let distinctGroups = 0;
        for (let i = 0; i < neighbors.length; i++) {
            for (let j = i + 1; j < neighbors.length; j++) {
                const n1 = neighbors[i];
                const n2 = neighbors[j];
                if (!(adj[n1] || []).includes(n2)) {
                    distinctGroups++;
                }
            }
        }
        scores[node.id] = distinctGroups;
    });

    return Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, score]) => ({ id, score }));
};

// Helper: Shortest Path (BFS)
const findShortestPath = (startId: string, endId: string, nodes: Node[], links: Link[]): string[] | null => {
    const adj: Record<string, string[]> = {};
    (nodes || []).forEach(n => adj[n.id] = []);
    (links || []).forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (adj[s]) adj[s].push(t);
        if (adj[t]) adj[t].push(s);
    });

    const queue = [[startId]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
        const path = queue.shift()!;
        const node = path[path.length - 1];

        if (node === endId) return path;

        for (const neighbor of (adj[node] || [])) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push([...path, neighbor]);
            }
        }
    }
    return null;
};

const SnaPanel: React.FC<SnaPanelProps> = ({ graph, onClose, onSelectNode }) => {
  const [mode, setMode] = useState<'metrics' | 'pathfinder'>('metrics');
  const [sourceNode, setSourceNode] = useState<string>('');
  const [targetNode, setTargetNode] = useState<string>('');
  const [pathResult, setPathResult] = useState<string[] | null>(null);
  
  // AI Analysis State
  const [analyzingPath, setAnalyzingPath] = useState(false);
  // FIX: Make connectionType flexible to handle object responses from AI
  const [pathAnalysis, setPathAnalysis] = useState<{ strengthScore: number; connectionType: any; explanation: string } | null>(null);

  const keyInfluencers = useMemo(() => calculateDegreeCentrality(graph?.nodes || [], graph?.links || []), [graph]);
  const keyBrokers = useMemo(() => findKeyBrokers(graph?.nodes || [], graph?.links || []), [graph]);

  const getNodeLabel = (id: string) => (graph?.nodes || []).find(n => n.id === id)?.label || id;

  const handlePathfind = () => {
      if (!sourceNode || !targetNode) return;
      const path = findShortestPath(sourceNode, targetNode, graph?.nodes || [], graph?.links || []);
      setPathResult(path);
      setPathAnalysis(null); // Reset previous analysis
  };

  const handleAIPathAnalysis = async () => {
      if (!pathResult) return;
      setAnalyzingPath(true);
      
      const nodeDetails = (pathResult || []).map(id => {
          const node = (graph?.nodes || []).find(n => n.id === id);
          return {
              label: node?.label || id,
              type: node?.type || 'unknown',
              details: node?.details || ''
          };
      });

      try {
          const result = await analyzeConnectionPath(nodeDetails);
          setPathAnalysis(result);
      } catch (e) {
          console.error("AI Error", e);
      } finally {
          setAnalyzingPath(false);
      }
  };

  const getStrengthColor = (score: number) => {
      if (score >= 80) return "text-red-500 border-red-500 shadow-red-500/50";
      if (score >= 50) return "text-yellow-500 border-yellow-500 shadow-yellow-500/50";
      return "text-gray-500 border-gray-500";
  };
  
  // FIX: Safely render connectionType whether it's a string or an object
  const connectionTypeDisplay = pathAnalysis?.connectionType
    ? (typeof pathAnalysis.connectionType === 'object'
        ? (pathAnalysis.connectionType.relationship || JSON.stringify(pathAnalysis.connectionType))
        : pathAnalysis.connectionType)
    : 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80  p-4">
      <div className="w-full max-w-2xl bg-[#0a0a0a] border-2 border-[#ff0033] shadow-[0_0_40px_rgba(255,0,51,0.2)] font-mono flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#ff0033]/50 bg-[#ff0033]/10">
          <div className="flex items-center gap-3">
             <Network className="text-[#ff0033] animate-pulse" size={24} />
             <div>
               <h2 className="text-xl font-bold text-white tracking-widest uppercase">SNA Tactical Computer</h2>
               <p className="text-[10px] text-gray-400">NETWORK TOPOLOGY & HIGH VALUE TARGETS</p>
             </div>
          </div>
          <button onClick={onClose} className="hover:text-white text-[#ff0033]"><X /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#ff0033]/30">
            <button 
                onClick={() => setMode('metrics')}
                className={`flex-1 py-3 text-xs font-bold uppercase ${mode === 'metrics' ? 'bg-[#ff0033]/20 text-white' : 'text-gray-500 hover:text-[#ff0033]'}`}
            >
                Key Metrics
            </button>
            <button 
                onClick={() => setMode('pathfinder')}
                className={`flex-1 py-3 text-xs font-bold uppercase ${mode === 'pathfinder' ? 'bg-[#ff0033]/20 text-white' : 'text-gray-500 hover:text-[#ff0033]'}`}
            >
                Connection Pathfinder
            </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {mode === 'metrics' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* INFLUENCERS */}
                    <div className="bg-[#111] border border-gray-800 p-4">
                        <h3 className="text-[#00ccff] font-bold uppercase text-xs mb-4 flex items-center gap-2">
                            <TrendingUp size={16} /> Key Influencers (Hubs)
                        </h3>
                        <p className="text-[9px] text-gray-500 mb-4">
                            Entities with the most direct connections. They control the flow of information.
                        </p>
                        <div className="space-y-2">
                            {keyInfluencers.map((item, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => onSelectNode(item.id)}
                                    className="flex justify-between items-center p-2 bg-black border border-gray-800 hover:border-[#00ccff] cursor-pointer group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#00ccff] font-bold text-lg">#{i+1}</span>
                                        <span className="text-gray-300 text-xs group-hover:text-white">{getNodeLabel(item.id)}</span>
                                    </div>
                                    <span className="text-[10px] bg-[#00ccff]/20 text-[#00ccff] px-1.5 rounded">{item.score} links</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* BROKERS */}
                    <div className="bg-[#111] border border-gray-800 p-4">
                        <h3 className="text-yellow-500 font-bold uppercase text-xs mb-4 flex items-center gap-2">
                            <GitMerge size={16} /> Bridges (Brokers)
                        </h3>
                         <p className="text-[9px] text-gray-500 mb-4">
                            Entities connecting different groups. Removing them fragments the network.
                        </p>
                        <div className="space-y-2">
                            {keyBrokers.map((item, i) => (
                                <div 
                                    key={i}
                                    onClick={() => onSelectNode(item.id)}
                                    className="flex justify-between items-center p-2 bg-black border border-gray-800 hover:border-yellow-500 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-yellow-500 font-bold text-lg">#{i+1}</span>
                                        <span className="text-gray-300 text-xs group-hover:text-white">{getNodeLabel(item.id)}</span>
                                    </div>
                                    <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded">Score: {item.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500">Source Entity</label>
                            <select 
                                value={sourceNode}
                                onChange={(e) => setSourceNode(e.target.value)}
                                className="w-full bg-black border border-gray-700 text-white text-xs p-2 mt-1 focus:border-[#ff0033] outline-none"
                            >
                                <option value="">Select Start Node</option>
                                {(graph?.nodes || []).map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500">Target Entity</label>
                             <select 
                                value={targetNode}
                                onChange={(e) => setTargetNode(e.target.value)}
                                className="w-full bg-black border border-gray-700 text-white text-xs p-2 mt-1 focus:border-[#ff0033] outline-none"
                            >
                                <option value="">Select End Node</option>
                                {(graph?.nodes || []).map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                            </select>
                         </div>
                    </div>
                    
                    <div className="text-[10px] text-[#ff0033] mt-2 mb-1 border border-[#ff0033]/30 inline-block px-1 bg-[#ff0033]/10 w-full text-center">⚠️ PENJALURAN LALUAN MENGGUNAKAN KUOTA TOKEN AI</div>
                    <button 
                        onClick={handlePathfind}
                        disabled={!sourceNode || !targetNode}
                        className="w-full bg-[#ff0033] text-black font-bold uppercase py-2 hover:bg-white disabled:opacity-50"
                    >
                        Calculate Interception Path
                    </button>

                    {pathResult && (
                        <div className="bg-[#111] border-l-2 border-[#ff0033] p-4 animate-in fade-in slide-in-from-bottom-2">
                             <div className="flex justify-between items-center mb-3">
                                <h3 className="text-white font-bold text-xs uppercase">Path Analysis Result</h3>
                                <div className="text-[10px] text-gray-500">
                                    Degrees of Separation: <span className="text-white font-bold">{pathResult.length - 1}</span>
                                </div>
                             </div>
                             
                             <div className="flex flex-wrap items-center gap-2 mb-4">
                                 {pathResult.map((id, index) => (
                                     <React.Fragment key={id}>
                                         <div 
                                            onClick={() => onSelectNode(id)}
                                            className={`
                                                px-3 py-1 text-xs border cursor-pointer hover:bg-white hover:text-black transition
                                                ${index === 0 || index === pathResult.length -1 ? 'border-[#ff0033] text-[#ff0033] font-bold' : 'border-gray-600 text-gray-400'}
                                            `}
                                         >
                                             {getNodeLabel(id)}
                                         </div>
                                         {index < pathResult.length - 1 && <ArrowRight size={12} className="text-gray-600" />}
                                     </React.Fragment>
                                 ))}
                             </div>

                             {/* AI ANALYSIS SECTION */}
                             {!pathAnalysis ? (
                                 <button 
                                    onClick={handleAIPathAnalysis}
                                    disabled={analyzingPath}
                                    className="w-full border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-black py-2 text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
                                 >
                                     {analyzingPath ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                                     {analyzingPath ? 'AI ANALYZING CONNECTION STRENGTH...' : 'ANALYZE CONNECTION STRENGTH (AI)'}
                                 </button>
                             ) : (
                                 <div className="mt-4 border-t border-gray-800 pt-4">
                                     <div className="flex items-center gap-4 mb-3">
                                         <div className={`border-2 rounded-full w-12 h-12 flex items-center justify-center text-xs font-bold ${getStrengthColor(pathAnalysis.strengthScore)}`}>
                                             {pathAnalysis.strengthScore}%
                                         </div>
                                         <div>
                                             <div className="text-[9px] text-gray-500 uppercase">Connection Type</div>
                                             <div className="text-sm font-bold text-white">{connectionTypeDisplay}</div>
                                         </div>
                                         <div className="ml-auto">
                                             <Gauge size={24} className={pathAnalysis.strengthScore > 75 ? 'text-red-500' : 'text-gray-600'} />
                                         </div>
                                     </div>
                                     <div className="bg-black/50 p-2 border border-gray-800 text-xs text-gray-300 leading-relaxed italic">
                                         "{pathAnalysis.explanation}"
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                    
                    {pathResult === null && sourceNode && targetNode && (
                         <div className="text-center text-gray-600 text-xs mt-4">
                             No direct or indirect path found between these entities. They exist in disjointed clusters.
                         </div>
                    )}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default SnaPanel;
