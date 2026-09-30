import React, { useState, useRef, useEffect } from 'react';
import { 
  Briefcase, Search, Globe, Shield, ShieldAlert, Brain, Database,
  Layers, ChevronDown, Save, Download, Copy, Trash2, Zap, GitMerge,
  FileText, Network, AlertTriangle, Clock, Fingerprint, Webhook,
  Binary, FileSearch, Link as LinkIcon, Lock, Key, Settings as SettingsIcon,
  Maximize, Minimize, HelpCircle, Undo2, Combine, Radar, Workflow,
  Share2, Circle, Grid, Shapes, Map as MapIcon, Plus, Eye, EyeOff,
  Filter, CheckSquare, Sparkles, Check, Smartphone, Monitor
} from 'lucide-react';
import { LayoutMode, Node, Workspace } from '../../types';
import { Tooltip } from '../Tooltip';

export interface WorkstationHeaderProps {
  workspaces: Workspace[];
  activeWsId: string;
  activeWs: Workspace;
  selectedNodes: Node[];
  historyCount: number;
  showAIChat: boolean;
  currentLayout: LayoutMode;
  nodeRenderMode?: 'classic' | 'schematic';
  detectedConflictsCount?: number;
  lowPowerMode?: boolean;
  isFullscreen: boolean;
  isRoomLocked?: boolean;
  onSwitchWorkspace: (id: string) => void;
  onCreateWorkspace: (name?: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDuplicateWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onClearWorkspace: () => void;
  onUndo: () => void;
  onDeleteSelected: () => void;
  onMergeSelected: () => void;
  onOpenRadial: (e: React.MouseEvent) => void;
  onToggleAIChat: () => void;
  onLayoutChange: (mode: LayoutMode) => void;
  onToggleRenderMode: () => void;
  onToggleLowPowerMode: () => void;
  onToggleFullscreen: () => void;
  onLockApp: () => void;
  onOpenMasterKey: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  onOpenOntologyEngine: () => void;
  onOpenCaseManager: () => void;
  onSaveToFile: () => void;
  onExportMaltegoCSV: () => void;
  onCopyForExternalAI: () => void;
  onExecuteAction: (action: string, payload?: any) => void;
}

type ActiveMenu = 'case' | 'investigate' | 'entities' | 'layout' | 'analysis' | 'report' | null;

export const WorkstationHeader: React.FC<WorkstationHeaderProps> = ({
  workspaces,
  activeWsId,
  activeWs,
  selectedNodes,
  historyCount,
  showAIChat,
  currentLayout,
  nodeRenderMode = 'classic',
  detectedConflictsCount = 0,
  lowPowerMode = false,
  isFullscreen,
  isRoomLocked = false,
  onSwitchWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onClearWorkspace,
  onUndo,
  onDeleteSelected,
  onMergeSelected,
  onOpenRadial,
  onToggleAIChat,
  onLayoutChange,
  onToggleRenderMode,
  onToggleLowPowerMode,
  onToggleFullscreen,
  onLockApp,
  onOpenMasterKey,
  onOpenSettings,
  onOpenTutorial,
  onOpenOntologyEngine,
  onOpenCaseManager,
  onSaveToFile,
  onExportMaltegoCSV,
  onCopyForExternalAI,
  onExecuteAction
}) => {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editingWsName, setEditingWsName] = useState('');
  const headerRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as HTMLElement)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // Keyboard shortcut listener for ribbon menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') setActiveMenu(null);
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onExecuteAction('OPEN_MODAL', 'global_search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExecuteAction]);

  const toggleMenu = (menu: ActiveMenu) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWsId(id);
    setEditingWsName(currentName);
  };

  const handleSaveRename = (id: string, e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editingWsName.trim()) {
      onRenameWorkspace(id, editingWsName.trim());
    }
    setEditingWsId(null);
  };

  // Layout icon resolver
  const getLayoutIcon = (mode: LayoutMode) => {
    switch (mode) {
      case 'schematic': return <Workflow size={13} className="text-amber-400" />;
      case 'orthogonal': return <Network size={13} className="text-emerald-400" />;
      case 'orthogonal_vertical': return <Network size={13} className="text-cyan-400 rotate-90" />;
      case 'force': return <Share2 size={13} className="text-cyan-400" />;
      case 'hierarchy': return <Layers size={13} className="text-amber-400" />;
      case 'circle': return <Circle size={13} className="text-blue-400" />;
      case 'cluster': return <Shapes size={13} className="text-purple-400" />;
      case 'grid': return <Grid size={13} className="text-gray-400" />;
      case 'map': return <MapIcon size={13} className="text-orange-400" />;
      default: return <Share2 size={13} className="text-cyan-400" />;
    }
  };

  const getLayoutLabel = (mode: LayoutMode) => {
    switch (mode) {
      case 'schematic': return 'Flowsint Pipeline';
      case 'orthogonal': return 'Orthogonal Melintang';
      case 'orthogonal_vertical': return 'Orthogonal Menegak';
      case 'force': return 'Susunan Organik';
      case 'hierarchy': return 'Hierarki Piramid';
      case 'circle': return 'Radial Circle';
      case 'cluster': return 'Kelompok Entiti';
      case 'grid': return 'Matriks Grid';
      case 'map': return 'Peta GIS Spasial';
      default: return 'Organik';
    }
  };

  return (
    <div ref={headerRef} className="w-full shrink-0 z-50 bg-[#090d16] border-b border-white/10 select-none font-mono">
      {/* ========================================================================= */}
      {/* ROW 1: PRIMARY APPLICATION COMMAND BAR (Height: 40px)                      */}
      {/* ========================================================================= */}
      <div className="h-10 px-2 sm:px-3 flex items-center justify-between border-b border-white/5 gap-2">
        {/* LEFT ZONE: Brand & Active Investigation Context */}
        <div className="flex items-center gap-2 shrink-0">
          <div 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 cursor-pointer group pr-2 border-r border-white/10"
            title="Muat semula Red Horizon Operative Console"
          >
            <div className="w-5 h-5 rounded bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform shadow-[0_0_8px_rgba(244,63,94,0.3)]">
              <span className="text-[10px] font-black">RH</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-black tracking-wider text-white">REDHORIZON</span>
              <span className="text-[8px] text-rose-400 font-bold tracking-widest hidden md:inline">CARBON</span>
            </div>
          </div>

          {/* Active Case Selector Button */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('case')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                activeMenu === 'case'
                  ? 'bg-cyan-950 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:border-cyan-500/50 hover:text-white'
              }`}
              title="Pengurus Kes & Operasi Siasatan"
            >
              <Briefcase size={12} className="text-emerald-400 shrink-0" />
              <span className="text-slate-400 text-[10px] hidden sm:inline">KES:</span>
              <span className="text-white max-w-[110px] sm:max-w-[140px] truncate">{activeWs.name}</span>
              <ChevronDown size={11} className={`transition-transform duration-150 ${activeMenu === 'case' ? 'rotate-180' : ''}`} />
            </button>

            {/* Case Dropdown Menu */}
            {activeMenu === 'case' && (
              <div className="absolute left-0 top-[110%] w-72 bg-[#0c121e] border border-cyan-500/50 rounded-lg shadow-2xl p-1.5 z-[100] space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 border-b border-white/5 flex items-center justify-between text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                  <span>Operasi Kes Semasa</span>
                  <span className="text-cyan-400 font-bold">{workspaces.length} RUANG</span>
                </div>
                
                {/* Workspace list */}
                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
                  {workspaces.map((w, idx) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        onSwitchWorkspace(w.id);
                        setActiveMenu(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs transition-colors cursor-pointer ${
                        w.id === activeWsId 
                          ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/40 font-bold' 
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[9px] text-slate-500 font-mono">0{idx + 1}</span>
                        <span className="truncate">{w.name}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 tabular-nums font-mono">{w.data.nodes.length} nod</span>
                    </button>
                  ))}
                </div>

                <div className="pt-1 border-t border-white/5 space-y-0.5 text-[11px]">
                  <button
                    onClick={() => {
                      setActiveMenu(null);
                      onOpenCaseManager();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-cyan-300 hover:text-white hover:bg-cyan-950/60 rounded text-left transition-colors cursor-pointer"
                  >
                    <Briefcase size={12} className="text-cyan-400" />
                    <span>Pusat Pengurus Kes Lengkap...</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveMenu(null);
                      onSaveToFile();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-emerald-300 hover:text-white hover:bg-emerald-950/60 rounded text-left transition-colors cursor-pointer"
                  >
                    <Save size={12} className="text-emerald-400" />
                    <span>Simpan Fail Kes (.RHZ)</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveMenu(null);
                      onExportMaltegoCSV();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-blue-300 hover:text-white hover:bg-blue-950/60 rounded text-left transition-colors cursor-pointer"
                  >
                    <Download size={12} className="text-blue-400" />
                    <span>Eksport ke Format Maltego / CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveMenu(null);
                      onClearWorkspace();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-rose-400 hover:text-white hover:bg-rose-950/60 rounded text-left transition-colors cursor-pointer border-t border-white/5 mt-1"
                  >
                    <Trash2 size={12} className="text-rose-400" />
                    <span>Kosongkan Kanvas Semasa</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER ZONE: Professional Maltego/i2 Modular Ribbon Menus */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar no-scrollbar py-0.5">
          {/* 1. INVESTIGATE MENU */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('investigate')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeMenu === 'investigate'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Search size={12} className="text-cyan-400" />
              <span>Siasatan</span>
              <ChevronDown size={10} className={`transition-transform ${activeMenu === 'investigate' ? 'rotate-180' : ''}`} />
            </button>

            {activeMenu === 'investigate' && (
              <div className="absolute left-0 top-[110%] w-64 bg-[#0c121e] border border-cyan-500/40 rounded-lg shadow-2xl p-1.5 z-[100] space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'global_search'); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-cyan-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Search size={12} className="text-cyan-400" /> Carian Global</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-black/60 border border-white/10 text-slate-400 font-mono">Ctrl+K</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'watson_recon'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-cyan-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Brain size={12} className="text-cyan-400" />
                  <span>IBM Watson Cognitive NER</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'phone_intel'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-cyan-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Smartphone size={12} className="text-emerald-400" />
                  <span>Phone Intel &amp; Leak Hub</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'google_socint'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-cyan-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Globe size={12} className="text-blue-400" />
                  <span>Google SOCINT Studio (CX)</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'dork_builder'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-cyan-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Filter size={12} className="text-amber-400" />
                  <span>Advanced Dorking Engine</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'vault'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-cyan-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Database size={12} className="text-purple-400" />
                  <span>Big Data Scanner &amp; Vault</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'offline_logic'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-cyan-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Binary size={12} className="text-gray-400" />
                  <span>Offline Regex Extractor</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. ENTITIES & TRANSFORMS MENU */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('entities')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeMenu === 'entities'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Zap size={12} className="text-amber-400" />
              <span>Entiti &amp; Transform</span>
              <ChevronDown size={10} className={`transition-transform ${activeMenu === 'entities' ? 'rotate-180' : ''}`} />
            </button>

            {activeMenu === 'entities' && (
              <div className="absolute left-0 top-[110%] w-64 bg-[#0c121e] border border-amber-500/40 rounded-lg shadow-2xl p-1.5 z-[100] space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'manual'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-amber-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Plus size={12} className="text-emerald-400" />
                  <span>Tambah Entiti Manual</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'import'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-amber-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Database size={12} className="text-blue-400" />
                  <span>Ingest Data (CSV / JSON)</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'entity_fusion'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-amber-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <GitMerge size={12} className="text-cyan-400" />
                  <span>Resolusi &amp; Entity Fusion</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'enricher_hub'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-amber-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Sparkles size={12} className="text-amber-400" />
                  <span>Modular Enricher (POI, Kripto)</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onOpenOntologyEngine(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-amber-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Brain size={12} className="text-purple-400" />
                  <span>Enjin Ontologi &amp; Dead-End Solver</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'data_processor'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-amber-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <FileText size={12} className="text-yellow-400" />
                  <span>AI Data Text Processor</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. LAYOUT & TOPOLOGY MENU */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('layout')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeMenu === 'layout'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {getLayoutIcon(currentLayout)}
              <span>Susunan ({getLayoutLabel(currentLayout)})</span>
              <ChevronDown size={10} className={`transition-transform ${activeMenu === 'layout' ? 'rotate-180' : ''}`} />
            </button>

            {activeMenu === 'layout' && (
              <div className="absolute left-0 top-[110%] w-72 bg-[#0c121e] border border-purple-500/40 rounded-lg shadow-2xl p-1.5 z-[100] space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 border-b border-white/5 flex items-center justify-between text-[9px] text-slate-400 uppercase font-bold">
                  <span>Pilihan Topologi Rangkaian</span>
                  <button 
                    onClick={onToggleRenderMode}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    {nodeRenderMode === 'schematic' ? 'Guna Nod Bulat' : 'Guna Kad Skematik'}
                  </button>
                </div>
                
                {[
                  { id: 'schematic', name: 'Flowsint Pipeline (Skematik)', icon: <Workflow size={12} className="text-amber-400" /> },
                  { id: 'orthogonal', name: 'Maltego Orthogonal (Melintang)', icon: <Network size={12} className="text-emerald-400" /> },
                  { id: 'orthogonal_vertical', name: 'Maltego Orthogonal (Menegak)', icon: <Network size={12} className="text-cyan-400 rotate-90" /> },
                  { id: 'force', name: 'Susunan Organik (Force-Directed)', icon: <Share2 size={12} className="text-cyan-400" /> },
                  { id: 'hierarchy', name: 'Hierarki Piramid (Top-Down)', icon: <Layers size={12} className="text-amber-400" /> },
                  { id: 'circle', name: 'Radial Sepusat (Circle)', icon: <Circle size={12} className="text-blue-400" /> },
                  { id: 'cluster', name: 'Kelompok Kategori Entiti', icon: <Shapes size={12} className="text-purple-400" /> },
                  { id: 'grid', name: 'Matriks Grid Sekata', icon: <Grid size={12} className="text-gray-400" /> },
                  { id: 'map', name: 'Unjuran Peta Geospasial GIS', icon: <MapIcon size={12} className="text-orange-400" /> },
                ].map(l => (
                  <button
                    key={l.id}
                    onClick={() => {
                      onLayoutChange(l.id as LayoutMode);
                      setActiveMenu(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                      currentLayout === l.id 
                        ? 'bg-purple-950/80 text-purple-200 border border-purple-500/50 font-bold' 
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {l.icon}
                      <span>{l.name}</span>
                    </div>
                    {currentLayout === l.id && <Check size={12} className="text-purple-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. ANALYSIS & FORENSICS MENU */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('analysis')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeMenu === 'analysis'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Network size={12} className="text-emerald-400" />
              <span>Analisis</span>
              {detectedConflictsCount > 0 && (
                <span className="px-1 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-bold animate-pulse">
                  {detectedConflictsCount}
                </span>
              )}
              <ChevronDown size={10} className={`transition-transform ${activeMenu === 'analysis' ? 'rotate-180' : ''}`} />
            </button>

            {activeMenu === 'analysis' && (
              <div className="absolute left-0 top-[110%] w-64 bg-[#0c121e] border border-emerald-500/40 rounded-lg shadow-2xl p-1.5 z-[100] space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'timeline'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-emerald-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Clock size={12} className="text-amber-400" />
                  <span>Peluncur Garis Masa (Timeline)</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'sna_panel'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-emerald-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Network size={12} className="text-cyan-400" />
                  <span>Analisis Topologi &amp; SNA Centrality</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'conflict_detector'); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-emerald-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={12} className={detectedConflictsCount > 0 ? "text-amber-400" : "text-gray-400"} />
                    <span>Percanggahan Semantik</span>
                  </span>
                  {detectedConflictsCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-black font-bold">
                      {detectedConflictsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'file_scanner'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-emerald-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <FileSearch size={12} className="text-blue-400" />
                  <span>Forensik Fail &amp; Metadata</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'stylometry'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-emerald-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Fingerprint size={12} className="text-purple-400" />
                  <span>Makmal Stilometri (Linguistik)</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'web_capture'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-emerald-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Globe size={12} className="text-emerald-400" />
                  <span>SnapRender Web Capture</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. EXPORT & REPORT MENU */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('report')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeMenu === 'report'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <FileText size={12} className="text-blue-400" />
              <span>Laporan</span>
              <ChevronDown size={10} className={`transition-transform ${activeMenu === 'report' ? 'rotate-180' : ''}`} />
            </button>

            {activeMenu === 'report' && (
              <div className="absolute left-0 top-[110%] w-64 bg-[#0c121e] border border-blue-500/40 rounded-lg shadow-2xl p-1.5 z-[100] space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setActiveMenu(null); onExecuteAction('OPEN_MODAL', 'intelligence_briefing'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-blue-950/70 rounded text-left transition-colors cursor-pointer font-bold text-emerald-300"
                >
                  <FileText size={12} className="text-emerald-400" />
                  <span>Military Intelligence Briefing</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onSaveToFile(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-blue-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Save size={12} className="text-emerald-400" />
                  <span>Simpan Fail Siasatan (.RHZ)</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onExportMaltegoCSV(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-blue-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Download size={12} className="text-blue-400" />
                  <span>Eksport Maltego CSV / Gephi</span>
                </button>
                <button
                  onClick={() => { setActiveMenu(null); onCopyForExternalAI(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:text-white hover:bg-blue-950/70 rounded text-left transition-colors cursor-pointer"
                >
                  <Copy size={12} className="text-purple-400" />
                  <span>Salin Ringkasan untuk Prompt AI</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT ZONE: Agentic Copilot, Security, Settings */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* AI Copilot Toggle Button */}
          <button
            onClick={onToggleAIChat}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-bold transition-all cursor-pointer ${
              showAIChat 
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]' 
                : 'bg-white/5 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/15'
            }`}
            title="Buka Agentic AI Copilot (Penaakulan Autonomi)"
          >
            <Brain size={13} className={showAIChat ? "text-black animate-pulse" : "text-cyan-400"} />
            <span className="hidden sm:inline font-bold">COPILOT</span>
            {selectedNodes.length > 0 && (
              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${showAIChat ? 'bg-black text-cyan-400' : 'bg-cyan-500/30 text-cyan-300'}`}>
                {selectedNodes.length}
              </span>
            )}
          </button>

          {/* Eco Low Power Mode Toggle */}
          <button
            onClick={onToggleLowPowerMode}
            className={`p-1.5 rounded border transition-all cursor-pointer ${
              lowPowerMode
                ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title={lowPowerMode ? "Mod Penjimatan Kuasa: AKTIF" : "Aktifkan Mod Penjimatan Kuasa (Eco)"}
          >
            <Zap size={13} className={lowPowerMode ? "fill-emerald-400 text-emerald-400" : ""} />
          </button>

          {/* OPSEC Lock Screen */}
          <button
            onClick={onLockApp}
            className="p-1.5 rounded border border-rose-500/40 bg-black/40 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
            title="Kunci Siasatan (OPSEC Privacy Shield)"
          >
            <Lock size={13} />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            className={`p-1.5 rounded border transition-all cursor-pointer ${
              isFullscreen
                ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title={isFullscreen ? "Keluar Skrin Penuh (Esc)" : "Paparan Skrin Penuh"}
          >
            {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all cursor-pointer"
            title="Tetapan Sistem &amp; Enjin Graf"
          >
            <SettingsIcon size={13} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: HIGH-DENSITY CANVAS WORKSTATION BAR (Height: 32px)                  */}
      {/* ========================================================================= */}
      <div className="h-8 px-2 sm:px-3 bg-[#070b13] flex items-center justify-between gap-3 text-[10px] border-b border-white/5">
        {/* LEFT: Multi-Canvas Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden xl:inline mr-1">
            KANVAS:
          </span>
          {workspaces.map((w, idx) => {
            const isActive = w.id === activeWsId;
            const isEditing = editingWsId === w.id;

            return (
              <div
                key={w.id}
                onClick={() => onSwitchWorkspace(w.id)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-cyan-950/80 text-cyan-200 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.25)] font-bold'
                    : 'bg-black/40 text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <span className="text-[8.5px] text-slate-500 font-mono">0{idx + 1}</span>
                {isEditing ? (
                  <form onSubmit={(e) => handleSaveRename(w.id, e)} className="flex items-center">
                    <input
                      type="text"
                      value={editingWsName}
                      onChange={(e) => setEditingWsName(e.target.value)}
                      onBlur={() => handleSaveRename(w.id)}
                      autoFocus
                      className="bg-black text-cyan-300 px-1 py-0.2 rounded border border-cyan-400 outline-none text-[10px] w-20 font-bold"
                    />
                  </form>
                ) : (
                  <span 
                    onDoubleClick={(e) => handleStartRename(w.id, w.name, e)}
                    className="max-w-[90px] sm:max-w-[120px] truncate"
                  >
                    {w.name}
                  </span>
                )}
                <span className="text-[8px] text-slate-500 font-mono">({w.data.nodes.length})</span>
                {workspaces.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWorkspace(w.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity p-0.5"
                    title="Tutup kanvas ini"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {workspaces.length < 3 && (
            <button
              onClick={() => onCreateWorkspace()}
              className="p-1 rounded border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-cyan-400 hover:bg-cyan-950/30 transition-all cursor-pointer"
              title="Buka Kanvas Siasatan Baharu (Maks 3)"
            >
              <Plus size={11} />
            </button>
          )}
        </div>

        {/* CENTER: Active Selection & Quick Edit Context Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onUndo}
            disabled={historyCount === 0}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
              historyCount > 0
                ? 'text-cyan-400 hover:bg-cyan-950/60 cursor-pointer'
                : 'text-slate-600 opacity-40 cursor-not-allowed'
            }`}
            title="Undo / Undur Langkah (Ctrl+Z)"
          >
            <Undo2 size={11} />
            <span className="hidden sm:inline text-[9px]">Undo</span>
          </button>

          <div className="w-px h-3 bg-white/10" />

          {selectedNodes.length > 0 ? (
            <div className="flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded text-cyan-300">
              <span className="font-bold text-[9px] tabular-nums">
                {selectedNodes.length} DIPILIH
              </span>

              {selectedNodes.length >= 2 && (
                <button
                  onClick={onMergeSelected}
                  className="flex items-center gap-1 text-[9px] text-emerald-400 hover:text-white px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/50 rounded cursor-pointer"
                  title="Gabungkan entiti terpilih menjadi satu"
                >
                  <Combine size={10} />
                  <span>Gabung</span>
                </button>
              )}

              <button
                onClick={onDeleteSelected}
                className="flex items-center gap-1 text-[9px] text-rose-400 hover:text-white px-1.5 py-0.2 bg-rose-950/80 border border-rose-500/50 rounded cursor-pointer"
                title="Padamkan entiti terpilih dari kanvas"
              >
                <Trash2 size={10} />
                <span>Padam</span>
              </button>
            </div>
          ) : (
            <span className="text-[9px] text-slate-500 font-mono hidden md:inline">
              Klik nod untuk memilih atau seret untuk menggerakkan
            </span>
          )}

          {/* Quick Radial Dial Trigger */}
          <button
            onClick={onOpenRadial}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 transition-all cursor-pointer text-[9px]"
            title="Buka Roda Transformasi 360° Maltego Radial"
          >
            <Radar size={11} className="text-amber-400" />
            <span className="hidden sm:inline font-bold">RADIAL DIAL</span>
          </button>
        </div>

        {/* RIGHT: Camera Viewport Controls & 60FPS Engine Indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Zoom Presets */}
          <div className="flex items-center gap-0.5 bg-black/50 border border-white/10 rounded p-0.5">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('app:graph-zoom-in'))}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer"
              title="Dekatkan Kamera (+)"
            >
              +
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('app:graph-zoom-out'))}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer"
              title="Jauhkan Kamera (-)"
            >
              -
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('app:graph-zoom-reset'))}
              className="px-1.5 py-0.5 text-[8.5px] text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer font-mono"
              title="Reset Skala Kamera 100%"
            >
              100%
            </button>
          </div>

          <div className="w-px h-3 bg-white/10 hidden sm:block" />

          {/* Engine indicator */}
          <div 
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-[8.5px] text-cyan-400 cursor-pointer hover:border-cyan-400 transition-colors"
            title="Enjin Grafik Hardware-Accelerated 60FPS (Klik untuk Tetapan)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="hidden lg:inline font-bold">CANVAS 2D TURBO</span>
            <span className="lg:hidden font-bold">TURBO</span>
          </div>
        </div>
      </div>
    </div>
  );
};
