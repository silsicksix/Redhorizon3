import React, { useState } from 'react';
import { 
  User, Building2, Phone, Globe, ShieldAlert, Search, Network, 
  MapPin, Brain, AlertTriangle, FileText, Check, ChevronRight, 
  Sparkles, Zap, Edit3, ArrowRight, Layers, Target, Info
} from 'lucide-react';
import { OSINT_TACTICAL_PHASES, TacticalPhase, TacticalPreOrderStep } from '../data/tacticalPreOrders';
import { Node } from '../types';

interface TacticalPreOrderDrawerProps {
  activeTarget: string;
  selectedNodes: Node[];
  onSelectPrompt: (promptText: string, autoSend?: boolean) => void;
  onClose: () => void;
}

export const TacticalPreOrderDrawer: React.FC<TacticalPreOrderDrawerProps> = ({
  activeTarget,
  selectedNodes,
  onSelectPrompt,
  onClose
}) => {
  const [selectedPhaseId, setSelectedPhaseId] = useState<number>(1);
  const [customTarget, setCustomTarget] = useState<string>(activeTarget || '');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const currentTargetName = customTarget.trim() || activeTarget || (selectedNodes.length > 0 ? selectedNodes[0].label : 'Sasaran Utama');

  const selectedPhase = OSINT_TACTICAL_PHASES.find(p => p.id === selectedPhaseId) || OSINT_TACTICAL_PHASES[0];

  const renderIcon = (type: TacticalPreOrderStep['iconType'], size = 14) => {
    switch (type) {
      case 'user': return <User size={size} className="text-cyan-400" />;
      case 'building': return <Building2 size={size} className="text-blue-400" />;
      case 'phone': return <Phone size={size} className="text-emerald-400" />;
      case 'globe': return <Globe size={size} className="text-indigo-400" />;
      case 'shield': return <ShieldAlert size={size} className="text-rose-400" />;
      case 'search': return <Search size={size} className="text-yellow-400" />;
      case 'network': return <Network size={size} className="text-purple-400" />;
      case 'map': return <MapPin size={size} className="text-emerald-400" />;
      case 'brain': return <Brain size={size} className="text-pink-400" />;
      case 'alert': return <AlertTriangle size={size} className="text-amber-400" />;
      case 'file': return <FileText size={size} className="text-cyan-400" />;
      default: return <Sparkles size={size} className="text-cyan-400" />;
    }
  };

  // Filter steps if user searches
  const filteredSteps = searchFilter.trim() 
    ? OSINT_TACTICAL_PHASES.flatMap(p => p.steps).filter(s => 
        s.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.phaseName.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : selectedPhase.steps;

  const preparePrompt = (template: string) => {
    return template.replace(/\{TARGET\}/g, currentTargetName);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/98 text-slate-100 border-t border-cyan-500/30 overflow-hidden select-none animate-fadeIn">
      {/* Header Info */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
            <Layers size={14} />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-cyan-300 font-mono flex items-center gap-1.5">
              <span>Doktrin SOP OSINT (Pre-Order Taktikal)</span>
            </div>
            <div className="text-[8.5px] text-slate-400 font-mono">
              Arahan perisikan bertingkat mengikut kitaran piawai siasatan
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all"
        >
          Kembali ke Bual
        </button>
      </div>

      {/* Target Selector Bar */}
      <div className="px-3 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2">
        <div className="flex items-center gap-1 text-[9.5px] font-mono text-cyan-400 whitespace-nowrap">
          <Target size={12} />
          <span className="font-bold">Sasaran Operasi:</span>
        </div>
        <input 
          type="text"
          value={customTarget}
          onChange={(e) => setCustomTarget(e.target.value)}
          placeholder="Taip nama entiti / sasaran..."
          className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-cyan-500 rounded px-2 py-1 text-[10.5px] text-cyan-200 font-mono focus:outline-none transition-all"
        />
        {selectedNodes.length > 0 && customTarget !== selectedNodes[0].label && (
          <button
            onClick={() => setCustomTarget(selectedNodes[0].label)}
            className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 cursor-pointer whitespace-nowrap"
            title="Gunakan nod yang sedang dipilih pada graf"
          >
            Pilih Nod Aktif
          </button>
        )}
      </div>

      {/* Phase Navigation Tabs */}
      <div className="px-2 pt-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {OSINT_TACTICAL_PHASES.map(phase => {
          const isSelected = !searchFilter && selectedPhaseId === phase.id;
          return (
            <button
              key={phase.id}
              onClick={() => {
                setSearchFilter('');
                setSelectedPhaseId(phase.id);
              }}
              className={`px-2.5 py-1.5 rounded-t-lg text-[9.5px] font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-slate-950 text-cyan-300 border-t-2 border-x border-cyan-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                phase.id === 1 ? 'bg-cyan-400' :
                phase.id === 2 ? 'bg-rose-400' :
                phase.id === 3 ? 'bg-purple-400' :
                phase.id === 4 ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span>{phase.code}</span>
              <span className="hidden sm:inline opacity-70 font-normal">({phase.steps.length})</span>
            </button>
          );
        })}
      </div>

      {/* Search Input for Quick Finding */}
      <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2">
        <Search size={11} className="text-slate-500" />
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Cari arahan (contoh: SSM, telefon, breach, satelit, dalang)..."
          className="w-full bg-transparent text-[9.5px] text-slate-300 placeholder:text-slate-600 focus:outline-none font-mono"
        />
        {searchFilter && (
          <button 
            onClick={() => setSearchFilter('')}
            className="text-[8.5px] text-slate-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Phase Description Header */}
      {!searchFilter && (
        <div className="px-3 py-1.5 bg-cyan-950/20 border-b border-cyan-500/10 flex items-center justify-between">
          <div className="text-[9px] font-mono text-cyan-300 flex items-center gap-1.5">
            <Info size={11} />
            <span className="font-bold">{selectedPhase.title}</span>
          </div>
          <span className="text-[8px] font-mono text-slate-500 uppercase">
            {selectedPhase.subtitle}
          </span>
        </div>
      )}

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar bg-slate-950/95">
        {filteredSteps.map((step) => {
          const finalPrompt = preparePrompt(step.promptTemplate);
          return (
            <div
              key={step.id}
              className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 hover:border-cyan-500/40 transition-all shadow-sm group"
            >
              {/* Step Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-slate-950 border border-slate-800 flex items-center justify-center">
                    {renderIcon(step.iconType, 13)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8.5px] font-mono font-bold">
                        {step.stepCode}
                      </span>
                      <h4 className="text-[10.5px] font-bold text-slate-100 font-sans group-hover:text-cyan-200 transition-colors">
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Canvas Impact Badge */}
              <div className="mt-2 flex items-center gap-1 text-[8.5px] font-mono text-emerald-400/90 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">
                <Zap size={9} />
                <span>Kesan Graf: {step.canvasImpact}</span>
              </div>

              {/* Prompt Preview Snippet */}
              <div className="mt-2 p-1.5 rounded bg-slate-950/80 border border-white/5 text-[9px] font-mono text-slate-300 italic line-clamp-2">
                "{finalPrompt}"
              </div>

              {/* Action Buttons */}
              <div className="mt-2.5 flex items-center justify-end gap-1.5 pt-1.5 border-t border-white/5">
                <button
                  onClick={() => onSelectPrompt(finalPrompt, false)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[9px] font-mono flex items-center gap-1 cursor-pointer transition-all"
                  title="Salin arahan ke ruang teks chat untuk disemak atau diubahsuai"
                >
                  <Edit3 size={10} />
                  <span>Salin ke Chat</span>
                </button>
                <button
                  onClick={() => onSelectPrompt(finalPrompt, true)}
                  className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-black font-mono font-bold text-[9px] flex items-center gap-1 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02] active:scale-95"
                  title="Jalankan arahan strategik ini secara langsung ke atas graf kanvas"
                >
                  <Zap size={10} className="fill-black" />
                  <span>Jalankan Arahan</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredSteps.length === 0 && (
          <div className="text-center py-8 text-slate-500 font-mono text-xs">
            Tiada arahan SOP yang sepadan dengan carian "{searchFilter}".
          </div>
        )}
      </div>

      {/* Footer Doctrine Note */}
      <div className="p-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[8px] font-mono text-slate-500">
        <span>Prinsip OSINT: Peninjauan ➔ Ujian Kerentanan ➔ Pautan Rangkaian ➔ GEOINT ➔ Sintesis</span>
        <span className="text-cyan-400">Standard Operasi 2026</span>
      </div>
    </div>
  );
};

export default TacticalPreOrderDrawer;
