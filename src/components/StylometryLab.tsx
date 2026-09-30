
import React, { useState } from 'react';
import { X, Fingerprint, Brain, Loader2, AlertCircle, CheckCircle, ArrowRightLeft, Type, Zap, Share, Copy, ExternalLink, Code2, Globe, Shield } from 'lucide-react';
import { performStylometryAnalysis } from '../services/geminiService';
import { generateArenaStylometryPayload } from '../utils/payloadGenerator';

interface StylometryLabProps {
  onClose: () => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
  onUpdateGraph?: (data: any) => void;
}

const StylometryLab: React.FC<StylometryLabProps> = ({ onClose, onLog, onUpdateGraph }) => {
  const [showUplink, setShowUplink] = useState(false);
  const [targets, setTargets] = useState([
    { label: 'Akaun Suspek 1', samples: '' },
    { label: 'Akaun Suspek 2', samples: '' }
  ]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');

  const updateTarget = (index: number, field: string, value: string) => {
    const newTargets = [...targets];
    newTargets[index] = { ...newTargets[index], [field]: value };
    setTargets(newTargets);
  };

  const addTarget = () => {
    setTargets([...targets, { label: `Target ${targets.length + 1}`, samples: '' }]);
  };

  const handleRunAnalysis = async () => {
    if (targets.some(t => t.samples.length < 20)) {
        onLog("Samples too short for forensic attribution.", 'warning');
        return;
    }
    setLoading(true);
    onLog("Initializing Forensic JSON Stream...", 'info');
    try {
        const res = await performStylometryAnalysis(targets);
        setResults(res);
        onLog("Authorship JSON validated and parsed.", 'success');
        
        // Push results to canvas
        if (onUpdateGraph) {
            const newNodes = (res.fingerprints || []).map((f: any, i: number) => ({
                id: `stylometry-${Date.now()}-${i}`,
                label: f.target,
                type: 'analysis_result',
                details: `Origin: ${f.dialect}\nTraits: ${(f.traits || []).join(', ')}`
            }));
            onUpdateGraph({ nodes: newNodes, links: [] });
        }
    } catch (e: any) {
        onLog(`Parsing Error: ${e.message}`, 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleArenaUplink = () => {
      const payload = generateArenaStylometryPayload(targets, results);
      navigator.clipboard.writeText(payload);
      setShowUplink(true);
      onLog("Arena Payload copied to clipboard.", 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95  p-4">
      <div className="w-full max-w-6xl bg-[#050505] border-2 border-[#ff0033] shadow-[0_0_50px_rgba(255,0,51,0.3)] font-mono flex flex-col h-[90vh] relative">
        
        {/* Arena Uplink Overlay (Red Theme) */}
        {showUplink && (
            <div className="absolute inset-0 z-[60] bg-black/98 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-[#ff0033]/10 rounded-full flex items-center justify-center mb-6 border border-[#ff0033] shadow-[0_0_30px_rgba(255,0,51,0.5)]">
                   <Share className="text-[#ff0033]" size={40} />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2 underline decoration-[#ff0033] decoration-4">JSON UPLINK GENERATED</h3>
                <p className="text-xs text-gray-400 max-w-md mb-8 leading-relaxed uppercase opacity-70">
                    Tactical JSON Payload for Cross-Intelligence Validation is ready. Paste into LMArena to verify Gemini's findings with secondary AI models.
                </p>
                <div className="flex gap-4">
                    <button 
                        onClick={() => window.open('https://chat.lmsys.org/', '_blank')}
                        className="bg-[#ff0033] text-black font-black px-8 py-3 uppercase flex items-center gap-2 hover:bg-white transition-all shadow-lg"
                    >
                        <ExternalLink size={18}/> Open LMArena.ai
                    </button>
                    <button 
                        onClick={() => setShowUplink(false)}
                        className="border border-gray-700 text-gray-500 px-8 py-3 uppercase hover:text-white"
                    >
                        Return to Lab
                    </button>
                </div>
            </div>
        )}

        {/* Header (Classic RedHorizon) */}
        <div className="flex justify-between items-center p-4 border-b border-[#ff0033]/50 bg-[#ff0033]/5">
          <div className="flex items-center gap-4">
             <Fingerprint className="text-[#ff0033] animate-pulse" size={28} />
             <div>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Stylometry Lab <span className="text-[10px] bg-[#ff0033] text-black px-1 rounded ml-2">JSON v2</span></h2>
               <div className="text-[10px] text-[#ff0033] mt-1 border border-[#ff0033]/30 inline-block px-1 bg-[#ff0033]/10">⚠️ MENGGUNAKAN KUOTA TOKEN AI</div>
               <p className="text-[10px] text-[#ff0033] font-bold">FORENSIC AUTHORSHIP ATTRIBUTION ENGINE</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             {results && (
                 <div className="flex bg-[#111] p-1 rounded border border-gray-800">
                    <button onClick={() => setViewMode('visual')} className={`px-3 py-1 text-[10px] font-bold rounded ${viewMode === 'visual' ? 'bg-[#ff0033] text-black' : 'text-gray-500 hover:text-white'}`}>VISUAL</button>
                    <button onClick={() => setViewMode('json')} className={`px-3 py-1 text-[10px] font-bold rounded ${viewMode === 'json' ? 'bg-cyan-600 text-black' : 'text-gray-500 hover:text-white'}`}>JSON</button>
                 </div>
             )}
             <button onClick={onClose} className="hover:text-white text-[#ff0033]"><X /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Input Panel */}
            <div className="w-5/12 border-r border-[#ff0033]/20 p-6 overflow-y-auto custom-scrollbar space-y-4 bg-[#0a0a0a]">
                <div className="bg-white/5 border border-white/10 p-3 rounded text-xs text-gray-400 mb-4">
                    <strong className="text-white">Cara Guna:</strong> Masukkan sampel penulisan (post, komen, tweet) dari 2 atau lebih akaun berbeza. AI akan menganalisis gaya bahasa untuk menentukan adakah ianya individu yang sama. (Minima 20 patah perkataan).
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center justify-between border-l-2 border-[#ff0033] pl-2">
                   <div className="flex items-center gap-2"><Type size={14}/> Evidence Ingestion</div>
                   <button 
                     onClick={() => setTargets([
                       { label: 'Akaun A (Scammer)', samples: 'Hari ni saya nak share peluang buat duit mudah. Modal RM100, pulangan RM1000 dalam 24 jam! Roger cepat siapa nak. Benda boleh buat duit napa nak tengok je kan.' },
                       { label: 'Akaun B (Fake Profile)', samples: 'Ade sesiapa nak join group vip sy? Modal rm100 jee, confirm dapat rm1000 dlm 24jam!! Cepat PM sy, benda boleh buat duit knpa nk tengok jee.' }
                     ])}
                     className="text-[10px] text-cyan-500 hover:text-white border border-cyan-500/30 px-2 py-1 rounded"
                   >
                     ISI CONTOH DATA
                   </button>
                </h3>
                {targets.map((t, i) => (
                    <div key={i} className="bg-black border border-gray-800 p-4 space-y-3 relative group hover:border-[#ff0033]/50 transition-all">
                        <div className="flex justify-between items-center">
                            <input 
                                value={t.label} 
                                onChange={(e) => updateTarget(i, 'label', e.target.value)}
                                className="bg-transparent border-b border-[#ff0033]/30 text-[#ff0033] text-xs font-bold uppercase outline-none focus:border-[#ff0033] w-1/2"
                            />
                            <div className="text-[9px] text-gray-700 font-bold">SOURCE_VECTOR::{i+101}</div>
                        </div>
                        <textarea 
                            value={t.samples}
                            onChange={(e) => updateTarget(i, 'samples', e.target.value)}
                            placeholder="Paste suspicious text samples here..."
                            className="w-full h-28 bg-[#050505] border border-gray-900 text-gray-400 text-[11px] p-3 focus:border-[#ff0033] outline-none resize-none leading-relaxed font-mono"
                        />
                    </div>
                ))}
                <button onClick={addTarget} className="w-full py-3 border border-dashed border-gray-800 text-gray-600 text-[10px] hover:text-[#ff0033] hover:border-[#ff0033] uppercase transition-all">+ Add Comparative Vector</button>
                
                <div className="grid grid-cols-2 gap-3 mt-6">
                    <button 
                        onClick={handleRunAnalysis}
                        disabled={loading}
                        className="bg-[#ff0033] text-black font-black py-4 uppercase hover:bg-white transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18}/> : <Brain size={18}/>}
                        {loading ? 'PROCESSING...' : 'RUN FORENSIC'}
                    </button>
                    <button 
                        onClick={handleArenaUplink}
                        disabled={loading || targets.every(t => !t.samples)}
                        className="bg-black border-2 border-cyan-500 text-cyan-500 font-black py-4 uppercase hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-2"
                    >
                        <Share size={18}/> Arena Uplink
                    </button>
                </div>
            </div>

            {/* Results Panel */}
            <div className="w-7/12 bg-black p-8 overflow-y-auto custom-scrollbar">
                {results ? (
                    viewMode === 'visual' ? (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="bg-[#ff0033]/5 border-l-4 border-[#ff0033] p-6 shadow-xl">
                                <h3 className="text-[#ff0033] font-black text-xs uppercase mb-2 flex items-center gap-2">
                                    <AlertCircle size={16}/> Forensic Determination
                                </h3>
                                <p className="text-white text-lg font-bold italic leading-tight">"{results.verdict}"</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <h4 className="text-gray-500 font-bold text-[10px] uppercase mb-4 flex items-center gap-2">
                                        <ArrowRightLeft size={14}/> Correlation Matrix
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {(results.matrix || []).map((m: any, i: number) => (
                                            <div key={i} className="bg-[#0a0a0a] border border-gray-800 p-4 hover:border-[#ff0033]/50 transition-all">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-white font-black uppercase tracking-tighter">{m.pair}</span>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-xl font-black ${m.similarityScore > 75 ? 'text-[#ff0033] animate-pulse' : m.similarityScore > 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                                                            {m.similarityScore}%
                                                        </span>
                                                        <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Similarity</span>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-900 pt-2 mt-2 font-mono">{m.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-gray-500 font-bold text-[10px] uppercase mb-4 flex items-center gap-2">
                                        <Zap size={14}/> Linguistic Idiolects
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {(results.fingerprints || []).map((f: any, i: number) => (
                                            <div key={i} className="bg-[#0a0a0a] border border-gray-800 p-4">
                                                <div className="text-[#ff0033] text-xs font-black mb-3 uppercase flex items-center justify-between">
                                                    {f.target}
                                                    <span className="text-[9px] text-gray-600">ID::OS-FRNSC-{i}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {(f.traits || []).map((t: string, j: number) => (
                                                        <span key={j} className="bg-gray-900 text-gray-300 text-[9px] font-bold px-3 py-1 rounded-sm border border-gray-800 hover:bg-[#ff0033]/20 hover:text-[#ff0033] cursor-default transition-all uppercase">
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold bg-black p-2 rounded">
                                                    <Globe size={12} className="text-cyan-500" /> 
                                                    PROBABLE ORIGIN: <span className="text-white">{f.dialect}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-[#050505] p-4 border border-gray-800 font-mono overflow-auto">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                                <span className="text-cyan-500 font-bold text-xs uppercase flex items-center gap-2">
                                    <Code2 size={14}/> forensic_data_stream.json
                                </span>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(JSON.stringify(results, null, 2));
                                        onLog("JSON string copied.", 'success');
                                    }}
                                    className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1"
                                >
                                    <Copy size={12}/> Copy Raw
                                </button>
                            </div>
                            <pre className="text-green-500 text-[11px] leading-relaxed">
                                {JSON.stringify(results, null, 4)}
                            </pre>
                        </div>
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-50 space-y-6">
                        <div className="relative">
                            <Fingerprint size={100} strokeWidth={1} />
                            <div className="absolute inset-0 animate-pulse border-2 border-[#ff0033]/20 rounded-full scale-150"></div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black uppercase tracking-[0.3em]">Awaiting Forensic Stream</p>
                            <p className="text-[10px] mt-2 max-w-[250px] mx-auto opacity-70">Submit text samples to initiate the Authorship Attribution Protocol.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default StylometryLab;
