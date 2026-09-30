import React, { useState } from 'react';
import { StrategyResult, StrategyStep, Node } from '../types';
import { 
    Terminal, Loader2, Play, Target, CheckCircle, BrainCircuit, 
    Trash2, ShieldAlert, Activity, Lock, Zap, ExternalLink, 
    Copy, Check, Wrench, Sparkles, Database, Search, ArrowUpRight, Crosshair
} from 'lucide-react';
import { motion } from 'framer-motion';

interface StrategyPanelProps {
  strategyResult: StrategyResult | null;
  targetName: string;
  onGenerate: () => void;
  onExecuteCommand: (cmd: string) => void;
  onSwitchToArmory?: (targetNodeLabel?: string, toolId?: string) => void;
  onTriggerRadialAction?: (actionKey: string, targetNode?: Node) => void;
  onFocusNode?: (nodeLabelOrId: string) => void;
  loading: boolean;
  onClear?: () => void;
  activeNode?: Node | null;
  allNodes?: Node[];
}

const StrategyPanel: React.FC<StrategyPanelProps> = ({ 
  strategyResult, 
  targetName, 
  onGenerate, 
  onExecuteCommand, 
  onSwitchToArmory,
  onTriggerRadialAction,
  onFocusNode,
  loading, 
  onClear,
  activeNode,
  allNodes = []
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCommand = (cmd: string, index: number) => {
    if (!cmd) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(cmd).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        });
    }
  };

  // Helper to determine the best interactive actions for a directive step
  const resolveStepActions = (step: StrategyStep) => {
    const targetLabel = step.targetNodeLabel || targetName;
    const matchedNode = allNodes.find(n => n.label.toLowerCase() === (targetLabel || '').toLowerCase()) 
      || (activeNode?.label.toLowerCase() === (targetLabel || '').toLowerCase() ? activeNode : null)
      || activeNode 
      || allNodes[0];

    const toolLower = (step.recommendedTool || '').toLowerCase();
    const titleLower = (step.title || '').toLowerCase();
    const actionKey = (step.actionKey || '').toUpperCase();

    // 1. Armory Tool Mapping
    let armoryToolId: string | null = null;
    let armoryToolName = 'Armory Toolkit';
    if (toolLower.includes('sherlock') || titleLower.includes('sherlock')) { armoryToolId = 'sherlock'; armoryToolName = 'Sherlock'; }
    else if (toolLower.includes('stalker') || titleLower.includes('stalker')) { armoryToolId = 'stalker_strike'; armoryToolName = 'Stalker-Strike'; }
    else if (toolLower.includes('maigret') || titleLower.includes('maigret')) { armoryToolId = 'maigret'; armoryToolName = 'Maigret'; }
    else if (toolLower.includes('blackbird') || titleLower.includes('blackbird')) { armoryToolId = 'blackbird'; armoryToolName = 'Blackbird'; }
    else if (toolLower.includes('whatsmyname') || titleLower.includes('whatsmyname')) { armoryToolId = 'whatsmyname'; armoryToolName = 'WhatsMyName'; }
    else if (toolLower.includes('holehe') || titleLower.includes('holehe')) { armoryToolId = 'holehe'; armoryToolName = 'Holehe'; }
    else if (toolLower.includes('phoneinfoga') || titleLower.includes('phoneinfoga')) { armoryToolId = 'phoneinfoga'; armoryToolName = 'PhoneInfoga'; }
    else if (toolLower.includes('socialscan') || titleLower.includes('socialscan')) { armoryToolId = 'socialscan'; armoryToolName = 'SocialScan'; }
    else if (toolLower.includes('ghunt') || titleLower.includes('ghunt')) { armoryToolId = 'ghunt'; armoryToolName = 'GHunt'; }
    else if (toolLower.includes('theharvester') || toolLower.includes('harvester') || titleLower.includes('theharvester')) { armoryToolId = 'theharvester'; armoryToolName = 'TheHarvester'; }
    else if (toolLower.includes('photon') || titleLower.includes('photon')) { armoryToolId = 'photon'; armoryToolName = 'Photon'; }
    else if (toolLower.includes('spiderfoot') || toolLower.includes('sf_cli') || titleLower.includes('spiderfoot')) { armoryToolId = 'sf_cli'; armoryToolName = 'SpiderFoot'; }
    else if (step.actionType === 'ARMORY' || toolLower.includes('armory')) { armoryToolId = 'sherlock'; armoryToolName = 'Armory Tools'; }

    // 2. Radial Menu / Dial Action Mapping
    let radialActionKey: string | null = null;
    let radialActionLabel = 'Dial Menu Action';

    if (actionKey && ['SOCIAL_RECON', 'SOCIAL_SCAN', 'DORK_BUILDER', 'VAULT', 'BREACH_DIRECTORY', 'ZUCKERED', 'CHECKLEAKED', 'TRUECALLER', 'WHATSAPP_LEAK', 'WHATSAPP', 'WHOIS', 'OPEN_MAP_HUD', 'AI_SEARCH', 'BRAVE', 'YANDEX'].includes(actionKey)) {
        radialActionKey = actionKey;
        radialActionLabel = actionKey.replace(/_/g, ' ');
    } else if (toolLower.includes('social recon') || titleLower.includes('social recon')) {
        radialActionKey = 'SOCIAL_RECON';
        radialActionLabel = 'Social Recon';
    } else if (toolLower.includes('social scan') || toolLower.includes('socials') || titleLower.includes('social')) {
        radialActionKey = 'SOCIAL_SCAN';
        radialActionLabel = 'Socials Analyzer';
    } else if (toolLower.includes('dork') || titleLower.includes('dork')) {
        radialActionKey = 'DORK_BUILDER';
        radialActionLabel = 'Dork Builder';
    } else if (toolLower.includes('vault') || toolLower.includes('big data') || titleLower.includes('vault') || titleLower.includes('arkib')) {
        radialActionKey = 'VAULT';
        radialActionLabel = 'Big Data Vault';
    } else if (toolLower.includes('breach') || titleLower.includes('breach')) {
        radialActionKey = 'BREACH_DIRECTORY';
        radialActionLabel = 'BreachDirectory';
    } else if (toolLower.includes('zucker') || titleLower.includes('zucker')) {
        radialActionKey = 'ZUCKERED';
        radialActionLabel = 'Zuckered FB Leak';
    } else if (toolLower.includes('check leaks') || toolLower.includes('leak') || titleLower.includes('leak')) {
        radialActionKey = 'CHECKLEAKED';
        radialActionLabel = 'Check Leaks';
    } else if (toolLower.includes('truecaller') || titleLower.includes('truecaller')) {
        radialActionKey = 'TRUECALLER';
        radialActionLabel = 'Truecaller';
    } else if (toolLower.includes('whatsapp') || titleLower.includes('whatsapp')) {
        radialActionKey = 'WHATSAPP_LEAK';
        radialActionLabel = 'WhatsApp OSINT';
    } else if (toolLower.includes('whois') || titleLower.includes('whois')) {
        radialActionKey = 'WHOIS';
        radialActionLabel = 'WHOIS Lookup';
    } else if (toolLower.includes('map') || toolLower.includes('sat') || toolLower.includes('geo') || titleLower.includes('geo')) {
        radialActionKey = 'OPEN_MAP_HUD';
        radialActionLabel = 'Satellite Map HUD';
    } else if (toolLower.includes('ai search') || titleLower.includes('ai search')) {
        radialActionKey = 'AI_SEARCH';
        radialActionLabel = 'AI Deep Search';
    }

    return {
        targetNode: matchedNode,
        targetLabel,
        armoryToolId,
        armoryToolName,
        radialActionKey,
        radialActionLabel,
        hasCli: Boolean(step.commandExample && step.commandExample.trim().length > 0)
    };
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#050505] relative overflow-hidden font-mono select-none">
       {/* Scanning Line Animation */}
       <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden opacity-10">
          <motion.div 
              initial={{ top: '-10%' }}
              animate={{ top: '110%' }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[1px] bg-emerald-500 shadow-[0_0_10px_#10b981]"
          />
       </div>

       {/* HEADER ACTIONS */}
       <div className="p-4 md:p-5 border-b border-emerald-900/40 bg-black/90 z-10 shrink-0 shadow-lg">
          <div className="flex justify-between items-center mb-3">
             <div className="flex flex-col">
                <h3 className="text-emerald-400 font-black uppercase text-[11px] md:text-xs flex items-center gap-2 tracking-[0.2em]">
                    <ShieldAlert size={15} className="animate-pulse text-emerald-500" /> Neural Forensic Advisor
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/20 rounded-sm">
                        DIRECTIVE OSINT v14.0
                    </span>
                    <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                        ARCHITECT_CORE
                    </span>
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                <button 
                    onClick={onGenerate}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-white text-black px-3.5 py-1.5 text-[10px] uppercase font-black transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] rounded-sm cursor-pointer active:scale-95"
                    title="Jana pelan arahan taktikal perisikan"
                >
                    {loading ? <Loader2 className="animate-spin" size={13}/> : <Zap size={13} className="fill-black"/>}
                    {loading ? 'ANALYZING...' : 'GENERATE STRATEGY'}
                </button>

                {strategyResult && onClear && (
                    <button 
                        onClick={onClear}
                        className="bg-red-950/30 border border-red-800/50 text-red-400 hover:bg-red-600 hover:text-black p-1.5 transition-all rounded-sm cursor-pointer"
                        title="Kosongkan Laporan"
                    >
                        <Trash2 size={13}/>
                    </button>
                )}
             </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
             <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">
                <Target size={12} className="text-emerald-500 shrink-0" />
                <span>Sasaran Fokus:</span>
                <span className="text-white bg-white/10 px-2 py-0.5 rounded border border-white/10 truncate font-black">
                    {targetName || (activeNode ? activeNode.label : 'SELURUH RANGKAIAN')}
                </span>
             </div>
             {strategyResult && (
                 <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest hidden sm:inline">
                     ● {strategyResult.steps?.length || 0} ARAHAN SEDIA DIJALANKAN
                 </span>
             )}
          </div>
       </div>

       {/* SCROLLABLE BODY */}
       <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6 relative z-[6]">
          {strategyResult ? (
             <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
             >
                {/* SITUATION REPORT (RUMUSAN) */}
                <div className="bg-emerald-950/20 border-l-4 border-emerald-500 p-5 shadow-xl relative overflow-hidden rounded-r-md border-t border-r border-b border-emerald-900/30">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Activity size={90} /></div>
                    <div className="flex items-center justify-between mb-3 border-b border-emerald-900/40 pb-2">
                        <h4 className="text-emerald-400 font-black text-[11px] uppercase tracking-[0.25em] flex items-center gap-2">
                            <Terminal size={14} className="text-emerald-500"/> Situation Report (Rumusan Perisikan)
                        </h4>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 uppercase tracking-widest font-black rounded-sm">
                            Threat Assessment
                        </span>
                    </div>
                    <p className="text-[12px] text-gray-200 leading-relaxed font-mono whitespace-pre-wrap tracking-tight select-text">
                        {strategyResult.situationReport}
                    </p>
                </div>

                {/* TACTICAL DIRECTIVES SECTION */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                            <Crosshair size={16} className="text-emerald-500" />
                            <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Tactical Directives & Action Triggers</span>
                        </div>
                        <span className="text-[9px] text-gray-500 italic">Tekan butang arahan untuk terus lancarkan</span>
                    </div>

                    {(strategyResult.steps || []).map((step, i) => {
                        const actions = resolveStepActions(step);
                        const isCopied = copiedIndex === i;

                        return (
                            <motion.div 
                                key={i} 
                                initial={{ x: -15, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.08 }}
                                className="bg-black/60 border border-white/10 hover:border-emerald-500/50 transition-all p-4 md:p-5 relative group shadow-lg rounded-sm"
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                {/* HEADER: STEP NUMBER, BADGES & PRIORITY */}
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-emerald-400 font-black tracking-widest bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded-sm">
                                            ARAHAN {i + 1}
                                        </span>
                                        <span className="text-[10px] text-white font-black uppercase tracking-wider bg-white/10 px-2 py-0.5 border border-white/10 rounded-sm flex items-center gap-1">
                                            <Wrench size={10} className="text-emerald-400"/> {step.recommendedTool}
                                        </span>
                                    </div>

                                    {/* PRIORITY BADGE */}
                                    <div className={`text-[9px] font-black px-2 py-0.5 rounded-sm border ${
                                        step.priority === 'CRITICAL' ? 'text-red-400 border-red-600 bg-red-950/40 animate-pulse' :
                                        step.priority === 'HIGH' ? 'text-orange-400 border-orange-700 bg-orange-950/30' :
                                        step.priority === 'MEDIUM' ? 'text-yellow-400 border-yellow-800 bg-yellow-950/20' :
                                        'text-gray-400 border-gray-800 bg-gray-900/30'
                                    } tracking-widest`}>
                                        {step.priority} PRIORITY
                                    </div>
                                </div>

                                {/* TITLE */}
                                <h4 className="text-white font-black text-sm md:text-base mb-2 tracking-tight group-hover:text-emerald-300 transition-colors">
                                    {step.title}
                                </h4>
                                
                                {/* TARGET ASSET PILL (CLICKABLE TO FOCUS) */}
                                {(step.targetNodeLabel || actions.targetLabel) && (
                                    <div className="flex items-center gap-2 mb-3">
                                        <button 
                                            onClick={() => {
                                                if (onFocusNode && (step.targetNodeLabel || actions.targetLabel)) {
                                                    onFocusNode(step.targetNodeLabel || actions.targetLabel);
                                                }
                                            }}
                                            className="text-[10px] text-yellow-400/90 hover:text-yellow-300 bg-yellow-950/30 hover:bg-yellow-950/60 border border-yellow-800/40 px-2.5 py-1 rounded flex items-center gap-1.5 font-bold uppercase tracking-wider transition-all cursor-pointer"
                                            title="Fokus nod ini pada graf perisikan"
                                        >
                                            <Target size={11} className="text-yellow-400 animate-spin-slow" />
                                            <span>Sasaran: <span className="text-white underline">{step.targetNodeLabel || actions.targetLabel}</span></span>
                                            <ArrowUpRight size={11} />
                                        </button>
                                    </div>
                                )}

                                {/* DESCRIPTION */}
                                <p className="text-[11px] md:text-[12px] text-gray-300 mb-4 leading-relaxed border-l-2 border-emerald-500/30 pl-3.5 select-text">
                                    {step.description}
                                </p>
                                
                                {/* COMMAND EXAMPLE SNIPPET */}
                                {step.commandExample && (
                                    <div className="space-y-1.5 mb-4 bg-black/80 p-2.5 rounded border border-white/10">
                                        <div className="flex items-center justify-between text-[9px] text-gray-500 font-black uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Terminal size={10} className="text-emerald-500"/> Arahan Terminal (CLI)</span>
                                            <button 
                                                onClick={() => handleCopyCommand(step.commandExample!, i)}
                                                className="text-gray-400 hover:text-white flex items-center gap-1 text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                                            >
                                                {isCopied ? <Check size={10} className="text-emerald-400"/> : <Copy size={10} />}
                                                {isCopied ? 'DISALIN!' : 'SALIN'}
                                            </button>
                                        </div>
                                        <div className="font-mono text-[11px] text-emerald-400 bg-black/90 p-2 rounded border border-emerald-900/30 overflow-x-auto custom-scrollbar flex items-center justify-between gap-2">
                                            <span className="select-text"><span className="text-gray-600 select-none mr-2">$</span>{step.commandExample}</span>
                                        </div>
                                    </div>
                                )}

                                {/* INTERACTIVE ACTION BUTTONS TRAY */}
                                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
                                    {/* BUTTON 1: JALANKAN DI ARMORY */}
                                    {actions.armoryToolId && onSwitchToArmory && (
                                        <button
                                            onClick={() => onSwitchToArmory(step.targetNodeLabel || actions.targetLabel, actions.armoryToolId!)}
                                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 hover:border-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] cursor-pointer active:scale-95"
                                            title={`Buka & jalankan alatan ${actions.armoryToolName} pada tab Armory`}
                                        >
                                            <Zap size={12} className="fill-current" />
                                            <span>Jalankan di Armory ({actions.armoryToolName})</span>
                                        </button>
                                    )}

                                    {/* BUTTON 2: JALANKAN DIAL MENU / RADIAL ACTION */}
                                    {actions.radialActionKey && onTriggerRadialAction && (
                                        <button
                                            onClick={() => onTriggerRadialAction(actions.radialActionKey!, actions.targetNode || undefined)}
                                            className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/30 hover:border-cyan-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)] cursor-pointer active:scale-95"
                                            title={`Lancarkan fungsi Dial Menu: ${actions.radialActionLabel}`}
                                        >
                                            <Sparkles size={12} />
                                            <span>Lancarkan Dial Menu: {actions.radialActionLabel}</span>
                                        </button>
                                    )}

                                    {/* BUTTON 3: RUN CLI COMMAND DIRECTLY */}
                                    {step.commandExample && (
                                        <button
                                            onClick={() => onExecuteCommand(step.commandExample!)}
                                            className="bg-[#ff0033]/15 hover:bg-[#ff0033] text-[#ff0033] hover:text-black border border-[#ff0033]/40 hover:border-[#ff0033] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                            title="Jalankan arahan ini terus di Terminal Console"
                                        >
                                            <Play size={11} className="fill-current" />
                                            <span>Run CLI</span>
                                        </button>
                                    )}
                                </div>
                                
                                {/* RATIONALE */}
                                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-start gap-2 text-[10px] text-gray-500 italic">
                                    <Lock size={11} className="text-gray-600 mt-0.5 shrink-0" />
                                    <span><span className="font-bold not-italic text-gray-400 uppercase mr-1">Rasional Taktikal:</span> {step.rationale}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
             </motion.div>
          ) : (
             /* EMPTY STATE */
             <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-6 py-16 px-4">
                <div className="relative">
                    <BrainCircuit size={80} strokeWidth={1} className="animate-pulse text-emerald-500/60" />
                    <div className="absolute inset-0 bg-emerald-500 blur-[50px] opacity-15"></div>
                </div>

                <div className="text-center space-y-3 max-w-sm">
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-300">
                        Neural Forensic Advisor Bersedia
                    </p>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-mono">
                        Advisor akan memetakan graf rangkaian intelijen anda, mengira jurang keselamatan (intelligence gaps), dan menjana arahan operasi taktikal dengan butang pelancaran langsung ke Armory & Dial Menu.
                    </p>
                    
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={onGenerate}
                            disabled={loading}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-white text-black px-5 py-2.5 text-[11px] uppercase font-black tracking-widest transition-all rounded-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] cursor-pointer"
                        >
                            {loading ? <Loader2 className="animate-spin" size={14}/> : <Zap size={14} className="fill-black"/>}
                            {loading ? 'SEDANG MENJANA...' : 'JANA STRATEGI TAKTIKAL'}
                        </button>
                    </div>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};

export default StrategyPanel;
