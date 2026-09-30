
import React, { useState, useEffect, useMemo } from 'react';
/* Added missing RefreshCw import from lucide-react */
import { ShieldCheck, X, Zap, Target, AlertTriangle, Fingerprint, Info, CheckCircle2, ChevronRight, Activity, Brain, RefreshCw, FileText, Trash2, Lock, Eye, ShieldAlert, FileWarning, Terminal, UserCheck, Shield, Camera, Share2, Sparkles, GitFork, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProxiedImageUrl } from '../utils/imageUtils';
import { extractProvenanceFromSynthesis } from '../utils/provenanceEngine';
import { DecisionProvenance, SynthesisResult } from '../types';

interface StrategicSynthesisProps {
    result: SynthesisResult | null;
    nodes?: any[];
    loading: boolean;
    onClose: () => void;
    onRun: (suggestedParts?: number) => void;
    onClear?: () => void;
    onCopyForExternalAI?: () => void;
    onApplyProvenanceToGraph?: (findings: DecisionProvenance[]) => void;
    onHighlightNodes?: (nodeIds: string[]) => void;
}

const StrategicSynthesis: React.FC<StrategicSynthesisProps> = ({ 
    result, 
    nodes = [], 
    loading, 
    onClose, 
    onRun, 
    onClear, 
    onCopyForExternalAI,
    onApplyProvenanceToGraph,
    onHighlightNodes
}) => {
    const [displayedSummary, setDisplayedSummary] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [deployedSuccess, setDeployedSuccess] = useState(false);

    // Semantica Provenance Findings extraction
    const provenanceFindings = useMemo(() => {
        if (!result) return [];
        return extractProvenanceFromSynthesis(result, nodes);
    }, [result, nodes]);
    
    // Extract all images from the graph
    const reportImages = nodes.reduce((acc: string[], node: any) => {
        if (node.imageUrls && node.imageUrls.length > 0) {
            acc.push(...node.imageUrls);
        } else if (node.imageUrl) {
            acc.push(node.imageUrl);
        }
        return acc;
    }, []);

    useEffect(() => {
        if (result?.summary && !loading) {
            setIsTyping(true);
            setDisplayedSummary('');
            let i = 0;
            const fullText = result.summary;
            const interval = setInterval(() => {
                setDisplayedSummary(fullText.substring(0, i));
                i += 5; // Faster typing for long reports
                if (i > fullText.length) {
                    clearInterval(interval);
                    setIsTyping(false);
                }
            }, 10);
            return () => clearInterval(interval);
        }
    }, [result?.summary, loading]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 -3xl p-4 overflow-hidden">
            {/* Scanning Line Animation */}
            <div className="absolute inset-0 pointer-events-none z-[110] overflow-hidden opacity-20">
                <motion.div 
                    initial={{ top: '-10%' }}
                    animate={{ top: '110%' }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-[2px] bg-[#ff0033] shadow-[0_0_15px_#ff0033]"
                />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-6xl bg-[#050505] border-2 border-[#ff0033]/40 shadow-[0_0_150px_rgba(255,0,51,0.15)] font-mono flex flex-col max-h-[95vh] overflow-hidden relative"
            >
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-5 pointer-events-none"></div>
                
                {/* Spy Dossier Elements */}
                <div className="absolute top-20 right-20 opacity-[0.03] pointer-events-none select-none rotate-12 border-[12px] border-[#ff0033] p-8 text-[#ff0033] font-black text-9xl tracking-tighter">CLASSIFIED</div>
                <div className="absolute bottom-40 left-20 opacity-[0.02] pointer-events-none select-none -rotate-12 border-8 border-white p-4 text-white font-black text-6xl tracking-widest">EYES ONLY</div>

                <div className="flex justify-between items-center p-6 border-b border-[#ff0033]/30 bg-gradient-to-r from-[#ff0033]/10 via-black to-transparent relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <div className="flex items-center gap-6 relative z-10">
                        <motion.div 
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="bg-[#ff0033] text-black p-3 rounded-sm shadow-[0_0_40px_rgba(255,0,51,0.6)]"
                        >
                            <ShieldAlert size={32} />
                        </motion.div>
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="bg-[#ff0033] text-black text-[9px] px-2 py-0.5 font-black uppercase tracking-tighter rounded-sm">Level 5 Clearance Required</span>
                                <span className="text-gray-600 text-[9px] font-black uppercase tracking-widest border-l border-white/10 pl-3">Ref: RH-INTEL-SYNTH-v14.0.2</span>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <h2 className="text-3xl font-black text-white uppercase italic tracking-[0.25em] leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                    Strategic Intelligence Dossier
                                </h2>
                                <span className="px-2 py-0.5 bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                                    Agent 2: 1,000K Reasoning
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex flex-col">
                                    <p className="text-[11px] text-[#ff0033] font-bold tracking-[0.6em] uppercase opacity-90">Neural Correlation & Forensic Synthesis</p>
                                    <div className="text-[10px] text-cyan-400 border border-cyan-500/30 inline-block px-1.5 py-0.5 bg-cyan-950/40 w-fit mt-1 font-mono">
                                        ⚡ Multi-Agent Matrix: NVIDIA Nemotron 3 Ultra 550B (1M Token) / Super 120B
                                    </div>
                                </div>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#ff0033]/50 to-transparent"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="hidden lg:flex flex-col items-end mr-6 border-r border-white/10 pr-6">
                            <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">System Status</span>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[11px] text-emerald-500 font-black uppercase tracking-widest">Encrypted Stream Active</span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-3 hover:bg-[#ff0033] hover:text-black transition-all rounded-full border border-white/10 group"
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar relative bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-fixed">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-10 py-20">
                            <div className="relative group">
                                <motion.div 
                                    animate={{ 
                                        rotate: [0, 90, 180, 270, 360],
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-2 border-dashed border-[#ff0033]/30 rounded-full"
                                />
                                <div className="relative p-10 bg-black/40 rounded-full border border-white/5 ">
                                    <Fingerprint size={100} className="text-[#ff0033] animate-pulse" />
                                    {/* Scanning Line over Fingerprint */}
                                    <motion.div 
                                        animate={{ top: ['0%', '100%', '0%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute left-0 right-0 h-1 bg-[#ff0033] shadow-[0_0_15px_#ff0033] z-20"
                                    />
                                </div>
                                <div className="absolute inset-0 bg-[#ff0033] blur-[60px] opacity-10 animate-pulse"></div>
                            </div>
                            <div className="text-center space-y-4">
                                <h3 className="text-3xl font-black text-white uppercase tracking-[0.4em] italic">
                                    <motion.span
                                        animate={{ opacity: [1, 0.5, 1] }}
                                        transition={{ duration: 0.5, repeat: Infinity }}
                                    >
                                        Initiating Neural Link...
                                    </motion.span>
                                </h3>
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-[11px] text-gray-500 font-black uppercase tracking-[0.3em]">Bypassing Encryption Protocols</p>
                                    <div className="w-64 bg-white/5 h-1 rounded-full overflow-hidden border border-white/10">
                                        <motion.div 
                                            animate={{ x: ['-100%', '100%'] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                            className="w-1/2 h-full bg-[#ff0033] shadow-[0_0_10px_#ff0033]"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 opacity-30">
                                <div className="flex flex-col items-center">
                                    <Terminal size={16} className="text-white mb-1" />
                                    <span className="text-[8px] text-white uppercase font-bold">SIGINT</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <Shield size={16} className="text-white mb-1" />
                                    <span className="text-[8px] text-white uppercase font-bold">SECURE</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <Activity size={16} className="text-white mb-1" />
                                    <span className="text-[8px] text-white uppercase font-bold">UPLINK</span>
                                </div>
                            </div>
                        </div>
                    ) : (result && result.verdict && result.verdict !== 'NO_DATA') ? (
                        <div className="space-y-8 animate-in fade-in duration-700">
                            {/* Split Suggestion Alert */}
                            {result.splitSuggestion && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-yellow-950/40 border-2 border-yellow-500/50 p-6 rounded-sm shadow-[0_0_30px_rgba(245,158,11,0.2)] flex items-center gap-6"
                                >
                                    <div className="bg-yellow-500 text-black p-4 rounded-sm">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-yellow-500 font-black uppercase tracking-widest text-sm mb-2">Analysis Complexity Detected</h5>
                                        <p className="text-gray-200 text-sm mb-4">
                                            {result.splitSuggestion.reason}. The AI recommends splitting this analysis into <strong>{result.splitSuggestion.suggestParts}</strong> parts for higher accuracy.
                                        </p>
                                        <button 
                                            onClick={() => {
                                                // Simplified implementation for now: re-run with smaller chunkSize
                                                onRun(result.splitSuggestion.suggestParts); 
                                            }}
                                            className="bg-yellow-500 text-black font-black uppercase text-xs px-6 py-3 hover:bg-white transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                        >
                                            Process in {result.splitSuggestion.suggestParts} parts
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                             {/* Verdict Header */}
                            <motion.div 
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="grid grid-cols-1 md:grid-cols-4 gap-8"
                            >
                                <div className="md:col-span-3 bg-gradient-to-br from-red-950/60 via-black to-black border-l-[12px] border-[#ff0033] p-10 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-1000"><Target size={160} /></div>
                                    <div className="absolute bottom-0 right-0 p-4 opacity-[0.05]"><Fingerprint size={80} /></div>
                                    
                                    <h4 className="text-[#ff0033] font-black text-[12px] uppercase mb-4 flex items-center gap-3 tracking-[0.4em]">
                                        <Target size={18}/> Operational Verdict
                                    </h4>
                                    <div className="flex items-center gap-4 mb-2">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Codename:</span>
                                        <span className="text-xl text-white font-black uppercase tracking-[0.2em] bg-[#ff0033]/20 px-3 py-1 border border-[#ff0033]/30">
                                            {result.codename || 'UNKNOWN_ASSET'}
                                        </span>
                                    </div>
                                    <p className="text-white text-5xl font-black italic uppercase leading-none tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] mb-6">
                                        {result.verdict || 'PENDING_DETERMINATION'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-6 border-t border-white/10 pt-6">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Threat Level</span>
                                            <span className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                                                result.threatLevel === 'CRITICAL' ? 'text-red-500 animate-pulse' : 
                                                result.threatLevel === 'SEVERE' ? 'text-orange-500' : 
                                                result.threatLevel === 'ELEVATED' ? 'text-yellow-500' : 'text-emerald-500'
                                            }`}>
                                                <ShieldAlert size={12}/> {result.threatLevel || 'UNCATEGORIZED'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Authorization</span>
                                            <span className="text-xs text-white font-black uppercase tracking-widest flex items-center gap-2">
                                                <Lock size={12}/> GRANTED (EYES ONLY)
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Source Protocol</span>
                                            <span className="text-xs text-cyan-500 font-black uppercase tracking-widest">NEURAL_SYNTH_V14</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-black/80 border-2 border-white/10 p-8 flex flex-col items-center justify-center relative overflow-hidden group  shadow-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50"></div>
                                    <div className="absolute top-0 right-0 p-3 opacity-10"><Zap size={80} /></div>
                                    <span className="text-[10px] text-gray-400 font-black uppercase mb-2 tracking-[0.3em] relative z-10">Confidence Index</span>
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 100, delay: 0.5 }}
                                        className={`text-6xl font-black relative z-10 ${(result.confidenceScore || 0) > 80 ? 'text-emerald-500' : (result.confidenceScore || 0) > 50 ? 'text-yellow-500' : 'text-red-500'} drop-shadow-[0_0_25px_currentColor]`}
                                    >
                                        {result.confidenceScore || 0}%
                                    </motion.div>
                                    <div className="w-full bg-gray-900 h-2 mt-6 rounded-full overflow-hidden border border-white/10 relative z-10">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${result.confidenceScore || 0}%` }}
                                            transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                                            className={`h-full ${(result.confidenceScore || 0) > 80 ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-yellow-500 shadow-[0_0_15px_#f59e0b]'}`} 
                                        />
                                    </div>
                                    <p className="text-[9px] text-gray-600 mt-4 uppercase font-bold tracking-widest relative z-10">Statistical Probability</p>
                                </div>
                            </motion.div>

                            {/* Intelligence Summary */}
                            <motion.div 
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="bg-[#080808] border-2 border-white/10 p-10 space-y-8 relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
                            >
                                <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff0033]/5 blur-[120px] -mr-48 -mt-48"></div>
                                <div className="flex justify-between items-center border-b border-white/10 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/5 p-3 rounded-sm border border-white/10">
                                            <FileText size={24} className="text-[#ff0033]"/>
                                        </div>
                                        <div>
                                            <h4 className="text-white font-black text-lg uppercase tracking-[0.3em]">Intelligence Briefing</h4>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Laporan Perisik Strategik (Classified)</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-[#ff0033] rounded-full animate-ping"></span>
                                            <span className="text-[10px] text-[#ff0033] font-black uppercase tracking-widest">Live Decryption</span>
                                        </div>
                                        <span className="text-[8px] text-gray-600 font-bold mt-1">AES-256 ENCRYPTED</span>
                                    </div>
                                </div>
                                
                                <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-6 bg-black/80 p-10 border border-white/5 rounded-sm shadow-inner relative group">
                                    <div className="absolute top-10 right-10 opacity-[0.03] pointer-events-none group-hover:opacity-[0.07] transition-opacity duration-1000"><Brain size={150} /></div>
                                    
                                    {/* Typewriter Effect Container */}
                                    <div className="text-[15px] text-gray-300 leading-relaxed whitespace-pre-wrap font-mono tracking-tight relative z-10">
                                        {displayedSummary}
                                        {isTyping && <span className="inline-block w-2 h-5 bg-[#ff0033] animate-pulse ml-1 align-middle"></span>}
                                    </div>

                                    {/* Attachments & Media Evidence */}
                                    {reportImages.length > 0 && (
                                        <div className="mt-10 pt-6 border-t border-white/10 relative z-10">
                                            <h5 className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <Camera size={14} className="text-[#ff0033]" />
                                                Attached Photographic Evidence / Media ({reportImages.length})
                                            </h5>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {[...new Set(reportImages)].map((img: unknown, i: number) => (
                                                    <div key={i} className="relative group/evidence aspect-square border border-white/20 rounded-sm overflow-hidden bg-black shadow-lg">
                                                        <img src={getProxiedImageUrl(img as string)} alt={`Evidence ${i+1}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 border-t border-[#ff0033]/30  opacity-0 group-hover/evidence:opacity-100 transition-opacity">
                                                            <div className="text-[8px] text-center font-mono text-[#ff0033] uppercase">EVD-{String(i+1).padStart(3, '0')}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap justify-between items-end gap-6 relative z-10">
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Authorized Signature</p>
                                            <div className="text-3xl font-serif text-white/80 italic tracking-tighter select-none opacity-60 hover:opacity-100 transition-opacity cursor-default">
                                                Agent Architect
                                            </div>
                                            <p className="text-[9px] text-gray-700 font-bold uppercase">Neural Forensic Division</p>
                                        </div>
                                        <div className="text-right space-y-2">
                                            <div className="flex flex-col items-end">
                                                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Transmission Date</p>
                                                <p className="text-[12px] text-white font-black uppercase tracking-widest mt-1">
                                                    {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Transmission Time</p>
                                                <p className="text-[12px] text-[#ff0033] font-black uppercase tracking-widest mt-1">
                                                    {new Date().toLocaleTimeString('en-US', { hour12: false })} ZULU
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Smoking Gun */}
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="bg-emerald-950/40 border-2 border-emerald-500/50 p-10 flex flex-col md:flex-row gap-10 items-center relative overflow-hidden group shadow-[0_0_50px_rgba(16,185,129,0.1)]"
                            >
                                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <div className="bg-emerald-500 text-black p-5 rounded-sm shrink-0 shadow-[0_0_40px_rgba(16,185,129,0.6)] rotate-3 group-hover:rotate-0 transition-all duration-500 relative z-10">
                                    <Fingerprint size={40}/>
                                </div>
                                <div className="relative z-10 flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <h4 className="text-emerald-500 font-black text-base uppercase italic tracking-[0.3em]">Critical Evidence</h4>
                                        <div className="h-[1px] flex-1 bg-emerald-500/30"></div>
                                        <span className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">Bukti Utama</span>
                                    </div>
                                    <p className="text-xl text-white leading-tight font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                        "{result.smokingGun || 'No primary evidence isolated.'}"
                                    </p>
                                </div>
                                <div className="shrink-0 relative z-10">
                                    <div className="border border-emerald-500/30 p-3 rounded-sm bg-black/40">
                                        <UserCheck size={24} className="text-emerald-500" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Semantica Decision & Evidence Provenance Trail (Cadangan #1) */}
                            {provenanceFindings.length > 0 && (
                                <motion.div
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className="bg-purple-950/20 border-2 border-purple-500/40 p-8 rounded-sm space-y-6 relative overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.15)]"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-500/30 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded bg-purple-500 text-black shadow-[0_0_15px_#a855f7]">
                                                <GitFork size={22} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-black text-base uppercase tracking-widest flex items-center gap-2">
                                                    Salasilah Bukti & Keputusan AI (Semantica Provenance)
                                                    <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded">
                                                        PROV-O Framework
                                                    </span>
                                                </h4>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    AI inferens ditransformasikan menjadi nod keputusan graf lengkap dengan pautan rantaian bukti langsung.
                                                </p>
                                            </div>
                                        </div>

                                        {onApplyProvenanceToGraph && (
                                            <button
                                                onClick={() => {
                                                    onApplyProvenanceToGraph(provenanceFindings);
                                                    setDeployedSuccess(true);
                                                    setTimeout(() => setDeployedSuccess(false), 3000);
                                                }}
                                                className={`px-4 py-2 rounded text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                                                    deployedSuccess
                                                        ? 'bg-emerald-500 text-black shadow-[0_0_20px_#10b981]'
                                                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                                                }`}
                                            >
                                                {deployedSuccess ? (
                                                    <>
                                                        <Check size={14} /> Berjaya Diterapkan ke Graf!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Share2 size={14} /> Terapkan Salasilah Bukti ke Graf ({provenanceFindings.length} Nod)
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Provenance Findings Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {provenanceFindings.map((finding, idx) => {
                                            const supportingNodes = nodes.filter(n => finding.supportingNodeIds.includes(n.id));
                                            return (
                                                <div 
                                                    key={finding.id || idx}
                                                    className="p-4 rounded bg-black/60 border border-purple-500/30 space-y-2 hover:border-purple-500/60 transition-all text-left group"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[9px] font-mono text-purple-400 font-black uppercase tracking-wider bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">
                                                            {finding.category}
                                                        </span>
                                                        <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                                            {finding.confidence}% Keyakinan
                                                        </span>
                                                    </div>

                                                    <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                                                        {finding.title}
                                                    </div>

                                                    <div className="text-[11px] text-gray-300 leading-relaxed font-mono">
                                                        {finding.verdict}
                                                    </div>

                                                    {/* Supporting Evidence Chips */}
                                                    <div className="pt-2 border-t border-white/5 space-y-1">
                                                        <div className="text-[8.5px] text-gray-500 uppercase font-black tracking-wider">
                                                            Nod Bukti Sokongan ({finding.supportingNodeIds.length}):
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {supportingNodes.length > 0 ? (
                                                                supportingNodes.map(sn => (
                                                                    <button
                                                                        key={sn.id}
                                                                        onClick={() => onHighlightNodes && onHighlightNodes([sn.id])}
                                                                        className="px-2 py-0.5 bg-white/5 hover:bg-purple-900/40 border border-white/10 hover:border-purple-500/50 rounded text-[9px] text-gray-300 hover:text-white font-mono transition-all truncate max-w-[140px]"
                                                                        title={`Klik untuk sorot nod '${sn.label}' di graf`}
                                                                    >
                                                                        {sn.label}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <span className="text-[8.5px] text-gray-600 italic">Topologi hubungan graf am</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                             {/* Reasoning List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <motion.div 
                                    initial={{ x: -30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="space-y-8"
                                >
                                    <h4 className="text-white font-black text-sm uppercase flex items-center gap-4 tracking-[0.3em]">
                                        <Activity size={20} className="text-[#ff0033]"/> Analytical Reasoning
                                    </h4>
                                    <div className="space-y-5">
                                        {(result.reasoning || []).length > 0 ? (result.reasoning || []).map((r: string, i: number) => (
                                            <motion.div 
                                                key={i} 
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: 1 + (i * 0.1) }}
                                                className="flex gap-5 text-[14px] text-gray-300 group p-5 bg-white/5 border border-white/5 hover:border-[#ff0033]/50 transition-all rounded-sm relative overflow-hidden shadow-lg"
                                            >
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ff0033] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <ChevronRight size={18} className="text-[#ff0033] shrink-0 mt-0.5" />
                                                <span className="group-hover:text-white transition-colors font-medium leading-relaxed tracking-tight">{r}</span>
                                            </motion.div>
                                        )) : (
                                            <div className="text-[12px] text-gray-500 italic p-8 border border-dashed border-white/10 rounded-sm bg-white/5">
                                                No specific reasoning steps were provided by the analysis engine.
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                                <motion.div 
                                    initial={{ x: 30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="space-y-8"
                                >
                                    <h4 className="text-white font-black text-sm uppercase flex items-center gap-4 tracking-[0.3em]">
                                        <ShieldAlert size={20} className="text-cyan-500"/> Tactical Recommendations
                                    </h4>
                                    <div className="bg-cyan-950/30 border-2 border-cyan-500/40 p-10 text-[14px] text-cyan-400 leading-relaxed font-mono whitespace-pre-wrap relative overflow-hidden group shadow-2xl">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500"><Lock size={50}/></div>
                                        <div className="absolute bottom-0 left-0 p-4 opacity-[0.05]"><Shield size={60} /></div>
                                        {result.suggestedNextSteps || "No tactical advice available for this profile."}
                                    </div>
                                    
                                    <div className="p-8 border-2 border-white/10 bg-white/5 rounded-sm space-y-4 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#ff0033]/5 to-transparent"></div>
                                        <div className="flex items-center gap-3 text-red-500">
                                            <FileWarning size={18} />
                                            <h5 className="text-[11px] font-black uppercase tracking-[0.2em]">Operational Security Notice</h5>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-relaxed italic relative z-10">
                                            This report is generated using Neural Correlation Protocol v14.0.2. All intelligence data is strictly confidential. Any unauthorized disclosure or duplication will result in immediate termination of clearance and severe disciplinary action under Intelligence Directive 7.
                                        </p>
                                        <div className="flex justify-end pt-2">
                                            <span className="text-[8px] text-gray-700 font-black tracking-widest uppercase">Property of RedHorizon Intel</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center space-y-6 py-20 opacity-40">
                            <Zap size={80} className={`${result?.verdict === 'NO_DATA' ? 'text-yellow-500' : 'text-gray-800'}`} />
                            <div className="text-center">
                                <p className="text-sm font-black uppercase tracking-[0.3em]">
                                    {result?.verdict === 'NO_DATA' ? 'No Data Available' : 'System Idling'}
                                </p>
                                <p className="text-[10px] mt-2 max-w-xs mx-auto">
                                    {result?.verdict === 'NO_DATA' 
                                        ? 'Tiada node dijumpai pada graf. Sila tambah maklumat atau entiti pada kanvas sebelum menjalankan analisis.'
                                        : 'Klik butang di bawah untuk memulakan Neural Correlation terhadap semua data yang telah dikumpul.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 flex justify-between items-center bg-black/40">
                    <div className="flex items-center gap-6">
                        <button onClick={onClose} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Abort Analysis</button>
                        {result && onClear && (
                            <button 
                                onClick={onClear} 
                                className="text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-2"
                            >
                                <Trash2 size={12} /> Clear Report
                            </button>
                        )}
                    </div>
                    {!result && (
                        <div className="flex items-center gap-4">
                            {onCopyForExternalAI && (
                                <button 
                                    onClick={onCopyForExternalAI} 
                                    className="bg-purple-600/20 text-purple-400 font-black uppercase text-xs px-6 py-4 hover:bg-purple-600 hover:text-white transition-all border border-purple-500/30 flex items-center gap-2"
                                    title="Copy data and prompt to clipboard for external AI analysis (e.g., lmarena.ai)"
                                >
                                    <FileText size={16} /> Fallback: Copy for External AI
                                </button>
                            )}
                            <button 
                                onClick={() => onRun()} 
                                className="bg-[#ff0033] text-black font-black uppercase text-xs px-12 py-4 hover:bg-white transition-all shadow-[0_0_40px_rgba(255,0,51,0.4)] flex items-center gap-3 italic"
                            >
                                <Brain size={18} /> Execute Intelligence Synthesis
                            </button>
                        </div>
                    )}
                    {result && (
                        <div className="flex items-center gap-4">
                            {onCopyForExternalAI && (
                                <button 
                                    onClick={onCopyForExternalAI} 
                                    className="bg-purple-600/20 text-purple-400 font-black uppercase text-xs px-6 py-4 hover:bg-purple-600 hover:text-white transition-all border border-purple-500/30 flex items-center gap-2"
                                    title="Copy data and prompt to clipboard for external AI analysis (e.g., lmarena.ai)"
                                >
                                    <FileText size={16} /> Copy for External AI
                                </button>
                            )}
                            <button 
                                onClick={() => onRun()} 
                                className="bg-white/10 text-white font-black uppercase text-xs px-8 py-4 hover:bg-white hover:text-black transition-all border border-white/10 flex items-center gap-3"
                            >
                                <RefreshCw size={18} /> Re-analyze Graph
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default StrategicSynthesis;
