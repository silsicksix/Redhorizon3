import React from 'react';
import { 
  X, 
  Maximize2, 
  Layers, 
  Globe, 
  Clock, 
  Camera, 
  Bot, 
  Share2, 
  FileText, 
  ShieldAlert, 
  Radio, 
  Cpu, 
  Search, 
  Sparkles,
  Sliders
} from 'lucide-react';

export interface MinimizedToolItem {
  id: string;
  name: string;
  icon?: string | React.ReactNode;
  activeCount?: number;
}

interface TacticalMinimizedDockProps {
  minimizedModals: string[];
  onRestoreModal: (modalId: string) => void;
  onCloseModal: (modalId: string) => void;
  onRestoreAll?: () => void;
}

export const getModalMetadata = (id: string): { name: string; icon: string; accent: string } => {
  switch (id) {
    case 'geo_recon':
      return { name: 'Tactical GEOINT', icon: '🌐', accent: 'border-red-500 text-red-300' };
    case 'cctv_hub':
      return { name: 'GIS & TrafficVision', icon: '📹', accent: 'border-cyan-500 text-cyan-300' };
    case 'timeline':
      return { name: 'Timeline Forensik', icon: '⏱️', accent: 'border-amber-500 text-amber-300' };
    case 'image_intel':
      return { name: 'Visual Intel & EXIF', icon: '📷', accent: 'border-purple-500 text-purple-300' };
    case 'autonomous_agent':
      return { name: 'Auto Recon Drone', icon: '🤖', accent: 'border-emerald-500 text-emerald-300' };
    case 'social_recon':
      return { name: 'Social Recon OSINT', icon: '💬', accent: 'border-blue-500 text-blue-300' };
    case 'social_analyzer':
      return { name: 'Social Analyzer', icon: '📊', accent: 'border-cyan-500 text-cyan-300' };
    case 'entity_fusion':
      return { name: 'Entity Fusion', icon: '🔀', accent: 'border-rose-500 text-rose-300' };
    case 'intelligence_briefing':
      return { name: 'Briefing Exporter', icon: '📄', accent: 'border-yellow-500 text-yellow-300' };
    case 'stylometry':
      return { name: 'Stylometry Lab', icon: '✍️', accent: 'border-indigo-500 text-indigo-300' };
    case 'dork_builder':
      return { name: 'Google Dorking', icon: '🔎', accent: 'border-orange-500 text-orange-300' };
    case 'forensic_vault':
      return { name: 'Forensic Vault', icon: '🗄️', accent: 'border-red-500 text-red-300' };
    case 'osint_engine':
      return { name: 'Smart OSINT Engine', icon: '⚡', accent: 'border-amber-400 text-amber-200' };
    case 'location_sting':
      return { name: 'Location Sting', icon: '🎯', accent: 'border-red-600 text-red-300' };
    case 'file_scanner':
      return { name: 'File Scanner', icon: '📁', accent: 'border-zinc-500 text-zinc-300' };
    case 'web_capture':
      return { name: 'Web Capture', icon: '📸', accent: 'border-cyan-400 text-cyan-200' };
    case 'share_trace':
      return { name: 'ShareTrace Links', icon: '🔗', accent: 'border-blue-400 text-blue-200' };
    case 'data_processor':
      return { name: 'Data Processor', icon: '⚙️', accent: 'border-teal-500 text-teal-300' };
    case 'sna_panel':
      return { name: 'SNA Graph Metrics', icon: '🕸️', accent: 'border-purple-400 text-purple-200' };
    case 'case_manager':
      return { name: 'Case Manager', icon: '📂', accent: 'border-amber-500 text-amber-300' };
    case 'settings':
      return { name: 'Settings / Tetapan', icon: '⚙️', accent: 'border-zinc-400 text-zinc-200' };
    case 'import':
      return { name: 'Import Data', icon: '📥', accent: 'border-blue-500 text-blue-300' };
    case 'vault':
      return { name: 'BigData Scanner', icon: '💾', accent: 'border-red-500 text-red-300' };
    default:
      return { name: id.replace(/_/g, ' ').toUpperCase(), icon: '🛠️', accent: 'border-zinc-500 text-zinc-300' };
  }
};

export const TacticalMinimizedDock: React.FC<TacticalMinimizedDockProps> = ({
  minimizedModals,
  onRestoreModal,
  onCloseModal,
  onRestoreAll
}) => {
  if (!minimizedModals || minimizedModals.length === 0) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-45 max-w-[94vw] overflow-x-auto custom-scrollbar select-none pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 rounded-full shadow-[0_0_25px_rgba(6,182,212,0.3)]">
        
        <div className="flex items-center gap-1 px-2 text-[9px] font-mono text-cyan-400 uppercase font-black tracking-wider shrink-0">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping mr-0.5" />
          <span>Modul Minimized ({minimizedModals.length}):</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {minimizedModals.map((modalId) => {
            const meta = getModalMetadata(modalId);
            return (
              <div
                key={modalId}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border ${meta.accent} hover:bg-slate-800 transition-all shadow-md group`}
              >
                <button
                  onClick={() => onRestoreModal(modalId)}
                  className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-tight cursor-pointer"
                  title={`Klik untuk kembangkan modul ${meta.name}`}
                >
                  <span className="text-xs">{meta.icon}</span>
                  <span className="truncate max-w-[120px]">{meta.name}</span>
                  <Maximize2 size={10} className="opacity-60 group-hover:opacity-100 text-cyan-300 ml-0.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseModal(modalId);
                  }}
                  className="p-0.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/20 rounded-full transition-colors ml-1 cursor-pointer"
                  title={`Tutup modul ${meta.name}`}
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
