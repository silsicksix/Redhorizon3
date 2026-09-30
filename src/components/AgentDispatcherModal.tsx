import React, { useState } from 'react';
import { Shield, Sparkles, Cpu, Zap, ArrowRight, X, CheckCircle2, RefreshCw, Layers, Eye, ShieldAlert, Check } from 'lucide-react';
import { SPECIALIST_AGENTS, getEffectiveAgentModel } from '../services/agentOrchestrator';
import { ModelConfig, SpecialistAgentRole } from '../types';

interface AgentDispatcherModalProps {
    roleId: SpecialistAgentRole['id'];
    taskTitle: string;
    taskDescription: string;
    config: ModelConfig;
    onConfirm: (options: { runConsensus: boolean; customModel?: string; rememberAutoDispatch?: boolean }) => void;
    onClose: () => void;
}

export const AgentDispatcherModal: React.FC<AgentDispatcherModalProps> = ({
    roleId,
    taskTitle,
    taskDescription,
    config,
    onConfirm,
    onClose
}) => {
    const recommendedAgent = SPECIALIST_AGENTS.find(a => a.id === roleId) || SPECIALIST_AGENTS[0];
    const primaryModel = getEffectiveAgentModel(roleId, false, config);
    const secondaryModel = getEffectiveAgentModel(roleId, true, config);

    const [executionMode, setExecutionMode] = useState<'single' | 'consensus'>('single');
    const [selectedModel, setSelectedModel] = useState<string>(primaryModel);
    const [rememberPref, setRememberPref] = useState(false);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
            <div className="relative w-full max-w-xl bg-[#0d0d0f] border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-950/50 overflow-hidden text-gray-200">
                {/* Top Accent Line */}
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 animate-pulse" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#121216]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-700/50 text-cyan-400">
                            <Cpu size={20} className="animate-spin-slow" />
                        </div>
                        <div>
                            <div className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
                                <Sparkles size={12} />
                                PRE-FLIGHT AGENT DISPATCHER
                            </div>
                            <h2 className="text-base font-bold text-white tracking-tight">{taskTitle}</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5">
                    <p className="text-xs text-gray-400 leading-relaxed">
                        {taskDescription} Sistem telah menganalisis keperluan tugasan ini dan menyediakan syor model AI yang paling dioptimumkan:
                    </p>

                    {/* Recommended Agent Card */}
                    <div className="p-4 rounded-lg bg-[#14151b] border border-cyan-500/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-bl tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={10} /> DISYORKAN OLEH SISTEM
                        </div>
                        
                        <div className="flex items-start gap-3">
                            <div className="mt-1 p-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                                <Shield size={18} />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-bold text-white flex items-center gap-2">
                                    {recommendedAgent.name}
                                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/40">
                                        {recommendedAgent.badge}
                                    </span>
                                </div>
                                <div className="text-[11px] text-cyan-300/90 font-medium">
                                    {recommendedAgent.title}
                                </div>
                                <div className="text-[11px] text-gray-400">
                                    {recommendedAgent.description}
                                </div>
                                <div className="pt-2 flex flex-wrap gap-1.5">
                                    {recommendedAgent.modalities.map((m, idx) => (
                                        <span key={idx} className="text-[9px] font-mono bg-black/60 border border-gray-700/60 text-gray-300 px-2 py-0.5 rounded">
                                            ✓ {m}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase font-bold text-gray-400 block tracking-wider">
                            PILIH MOD EKSEKUSI AI:
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Mode 1: Single Specialist */}
                            <button
                                type="button"
                                onClick={() => setExecutionMode('single')}
                                className={`p-3 rounded-lg border text-left transition-all ${
                                    executionMode === 'single'
                                        ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-lg shadow-cyan-950/30'
                                        : 'bg-[#111] border-gray-800 text-gray-400 hover:border-gray-700'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                        <Zap size={14} className="text-amber-400" />
                                        1. Eksekusi Pantas (Single)
                                    </span>
                                    {executionMode === 'single' && <Check size={14} className="text-cyan-400" />}
                                </div>
                                <p className="text-[10px] text-gray-400 line-clamp-2">
                                    Menggunakan model utama <span className="text-white font-mono">{primaryModel}</span> untuk inferens sepantas kilat.
                                </p>
                            </button>

                            {/* Mode 2: Parallel Dual Consensus */}
                            <button
                                type="button"
                                onClick={() => setExecutionMode('consensus')}
                                className={`p-3 rounded-lg border text-left transition-all ${
                                    executionMode === 'consensus'
                                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-lg shadow-indigo-950/30'
                                        : 'bg-[#111] border-gray-800 text-gray-400 hover:border-gray-700'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                        <Layers size={14} className="text-indigo-400" />
                                        2. Dual-Agent Consensus
                                    </span>
                                    {executionMode === 'consensus' && <Check size={14} className="text-indigo-400" />}
                                </div>
                                <p className="text-[10px] text-gray-400 line-clamp-2">
                                    Jalankan <span className="text-white font-mono">{primaryModel}</span> & <span className="text-white font-mono">{secondaryModel}</span> serentak secara paralel untuk pengesahan silang.
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Model Override Dropdown (if in single mode) */}
                    {executionMode === 'single' && (
                        <div className="pt-1">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-mono text-gray-400 uppercase font-semibold">Tukar Model AI (Pilihan):</label>
                                <span className="text-[9px] font-mono text-emerald-400">100% Free Tier</span>
                            </div>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full bg-[#111] border border-gray-700 rounded text-xs text-white p-2 outline-none focus:border-cyan-500 font-mono"
                            >
                                <option value={primaryModel}>{primaryModel} (Disyorkan)</option>
                                <option value={secondaryModel}>{secondaryModel} (Pilihan Kedua)</option>
                                <option value="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free">NVIDIA: Nemotron 3 Nano Omni [FREE] (256K / Video + Imej)</option>
                                <option value="nvidia/nemotron-3-ultra-550b-a55b:free">NVIDIA: Nemotron 3 Ultra 550B [FREE] (1,000,000 Token Context)</option>
                                <option value="nvidia/nemotron-3-super-120b-a12b:free">NVIDIA: Nemotron 3 Super 120B [FREE] (262K Context)</option>
                                <option value="google/gemma-4-31b-it:free">Google: Gemma 4 31B Vision [FREE] (262K Context)</option>
                                <option value="nvidia/nemotron-3.5-lightning:free">NVIDIA: Nemotron 3.5 Lightning [FREE] (1,000,000 Context)</option>
                            </select>
                        </div>
                    )}

                    {/* Remember preference checkbox */}
                    <div className="pt-2 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="remember_pref"
                            checked={rememberPref}
                            onChange={(e) => setRememberPref(e.target.checked)}
                            className="rounded border-gray-700 bg-black text-cyan-500 focus:ring-cyan-500 h-3.5 w-3.5"
                        />
                        <label htmlFor="remember_pref" className="text-[11px] text-gray-400 cursor-pointer select-none">
                            Ingat pilihan saya (Auto-dispatch terus pada masa akan datang)
                        </label>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-[#121216]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs text-gray-400 hover:text-white rounded transition-colors"
                    >
                        Batal
                    </button>

                    <button
                        type="button"
                        onClick={() => onConfirm({
                            runConsensus: executionMode === 'consensus',
                            customModel: executionMode === 'single' ? selectedModel : undefined,
                            rememberAutoDispatch: rememberPref
                        })}
                        className="px-5 py-2 text-xs font-bold text-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 hover:from-emerald-300 hover:to-cyan-300 rounded-lg shadow-lg shadow-cyan-900/40 flex items-center gap-2 transition-all"
                    >
                        {executionMode === 'consensus' ? '🚀 Jalankan Dual-Agent Consensus' : '⚡ Lancarkan Analisis AI'}
                        <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
