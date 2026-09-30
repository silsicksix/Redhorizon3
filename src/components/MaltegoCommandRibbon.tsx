import React, { useState, useEffect, useRef } from 'react';
import { 
  Workspace, LayoutMode, Node 
} from '../types';
import { 
  Database, Search, HardDrive, Binary, Layers, 
  Workflow, Share2, Network, Circle, Grid, Shapes, 
  Map as MapIcon, Globe, Camera, Zap, CreditCard, 
  RotateCcw, Trash2, Combine, Brain, Radar, 
  HelpCircle, Settings, Lock, Key, Maximize, Minimize, 
  ChevronDown, ChevronUp, Briefcase, Plus, FileText, 
  ShieldAlert, Smartphone, Server, MessageCircle, 
  Fingerprint, GitMerge, AlertTriangle, Clock, 
  Crosshair, Cpu, Filter, Link as LinkIcon, Download, 
  Save, Copy, ExternalLink, ShieldCheck, Sparkles,
  Users, Webhook, FileSearch, Check, ArrowRight
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import SystemMonitor from './SystemMonitor';
import EnvironmentManager from './EnvironmentManager';

export interface MaltegoCommandRibbonProps {
  activeWs: Workspace;
  workspaces: Workspace[];
  onSwitchWorkspace: (id: string) => void;
  onCreateWorkspace: (name?: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDuplicateWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onClearWorkspace: () => void;
  onTransferSelectedNodes?: (targetWsId: string, deleteFromSource?: boolean) => void;
  currentLayout: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
  nodeRenderMode?: 'classic' | 'schematic';
  onToggleRenderMode?: () => void;
  onOpenEnricherHub?: () => void;
  selectedNodes: Node[];
  activeNode: Node | null;
  historyLength: number;
  onUndo: () => void;
  onDeleteSelected: () => void;
  onMergeNodes: () => void;
  onOpenRadial: (e: React.MouseEvent) => void;
  showAIChat: boolean;
  onToggleAIChat: () => void;
  onOpenModal: (modalId: string) => void;
  onSaveCase: () => void;
  onExportMaltego: () => void;
  onExportAIPrompt: () => void;
  onRunSynthesis: () => void;
  synthesisLoading?: boolean;
  synthesisResult?: any;
  onLaunchGoogleEarth: () => void;
  onLaunchStreetView: () => void;
  onOpenCollabChat: () => void;
  onOpenBreachModal: () => void;
  onOpenTrafficVision: () => void;
  onOpenTimeline: () => void;
  onOpenOntology: () => void;
  onOpenTriples: () => void;
  detectedConflictsCount?: number;
  isLowPower: boolean;
  onToggleLowPower: () => void;
  onLockApp: () => void;
  onOpenMasterKey: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  backendStatus: any;
  isMobile: boolean;
}

export type RibbonTab = 'investigate' | 'transforms' | 'layout' | 'geospatial' | 'evidence' | 'copilot';

export const MaltegoCommandRibbon: React.FC<MaltegoCommandRibbonProps> = ({
  activeWs,
  workspaces,
  onSwitchWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onClearWorkspace,
  onTransferSelectedNodes,
  currentLayout,
  onLayoutChange,
  nodeRenderMode = 'classic',
  onToggleRenderMode,
  onOpenEnricherHub,
  selectedNodes,
  activeNode,
  historyLength,
  onUndo,
  onDeleteSelected,
  onMergeNodes,
  onOpenRadial,
  showAIChat,
  onToggleAIChat,
  onOpenModal,
  onSaveCase,
  onExportMaltego,
  onExportAIPrompt,
  onRunSynthesis,
  synthesisLoading,
  synthesisResult,
  onLaunchGoogleEarth,
  onLaunchStreetView,
  onOpenCollabChat,
  onOpenBreachModal,
  onOpenTrafficVision,
  onOpenTimeline,
  onOpenOntology,
  onOpenTriples,
  detectedConflictsCount = 0,
  isLowPower,
  onToggleLowPower,
  onLockApp,
  onOpenMasterKey,
  isFullscreen,
  onToggleFullscreen,
  backendStatus,
  isMobile
}) => {
  const [activeTab, setActiveTab] = useState<RibbonTab>('investigate');
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState<boolean>(false);
  const [isCaseDropdownOpen, setIsCaseDropdownOpen] = useState<boolean>(false);
  const [caseMenuPos, setCaseMenuPos] = useState<{ top: number; left: number }>({ top: 40, left: 140 });
  const caseDropdownRef = useRef<HTMLDivElement>(null);

  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState<boolean>(false);
  const [layoutMenuPos, setLayoutMenuPos] = useState<{ top: number; left: number }>({ top: 40, left: 320 });
  const layoutDropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleCaseDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLayoutDropdownOpen(false);
    if (!isCaseDropdownOpen && caseDropdownRef.current) {
      const rect = caseDropdownRef.current.getBoundingClientRect();
      const menuWidth = Math.min(290, window.innerWidth - 20);
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }
      setCaseMenuPos({
        top: Math.round(rect.bottom + 4),
        left: Math.round(Math.max(10, left))
      });
    }
    setIsCaseDropdownOpen(prev => !prev);
  };

  const handleToggleLayoutDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCaseDropdownOpen(false);
    if (!isLayoutDropdownOpen && layoutDropdownRef.current) {
      const rect = layoutDropdownRef.current.getBoundingClientRect();
      const menuWidth = Math.min(380, window.innerWidth - 20);
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }
      setLayoutMenuPos({
        top: Math.round(rect.bottom + 4),
        left: Math.round(Math.max(10, left))
      });
    }
    setIsLayoutDropdownOpen(prev => !prev);
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (caseDropdownRef.current && !caseDropdownRef.current.contains(e.target as HTMLElement)) {
        setIsCaseDropdownOpen(false);
      }
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(e.target as HTMLElement)) {
        setIsLayoutDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard shortcut Ctrl+B or Alt+R to collapse/expand ribbon
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsRibbonCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const layoutNames: Record<LayoutMode, string> = {
    schematic: 'Skematik Flowsint',
    force: 'Organik (Force)',
    orthogonal: 'Orthogonal H',
    orthogonal_vertical: 'Orthogonal V',
    hierarchy: 'Hierarki Top-Down',
    cluster: 'Kelompok Entiti',
    circle: 'Membulat Radial',
    grid: 'Grid Matriks',
    map: 'Unjuran GIS'
  };

  return (
    <div className="w-full bg-[#0b0f19] border-b border-slate-800/80 text-slate-200 select-none font-mono shrink-0 shadow-xl z-50">
      
      {/* 1. TOP APPLICATION TITLE & GLOBAL STATUS BAR (Maltego / i2 Carbon Style) */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-white/5 bg-[#070a12]/95 backdrop-blur-md gap-2">
        
        {/* Left: Brand Identity + Active Case Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 cursor-pointer group"
            title="Muat Semula Aplikasi"
          >
            <div className="relative flex items-center justify-center w-6 h-6 rounded bg-gradient-to-br from-red-600/30 to-rose-950 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" className="text-red-400 group-hover:scale-110 transition-transform">
                <path d="M7 12l1-6.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5L17 12" />
                <path d="M2 13.5a1.5 1.5 0 0 0 1.5 1.5h17a1.5 1.5 0 0 0 1.5-1.5v-1a.5.5 0 0 0-.5-.5H2.5a.5.5 0 0 0-.5.5v1z" />
                <circle cx="8.5" cy="19" r="2" />
                <circle cx="15.5" cy="19" r="2" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-white text-xs tracking-wider uppercase">RED HORIZON</span>
              <span className="text-[8px] px-1 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold hidden sm:inline">
                CARBON V2.9
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* Active Case Selector Dropdown */}
          <div ref={caseDropdownRef} className="relative">
            <button
              onClick={handleToggleCaseDropdown}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800/80 border border-slate-700/70 hover:border-emerald-500/50 text-[10px] text-slate-200 transition-colors cursor-pointer group"
              title="Tukar atau Urus Kes Siasatan"
            >
              <Briefcase size={12} className="text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-300 max-w-[120px] sm:max-w-[160px] truncate">
                {activeWs.name}
              </span>
              <span className="text-[9px] text-slate-400 hidden sm:inline">
                ({activeWs.data?.nodes?.length || 0} nod)
              </span>
              <ChevronDown size={11} className={`text-slate-400 transition-transform ${isCaseDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCaseDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[99980]" 
                  onClick={() => setIsCaseDropdownOpen(false)}
                />
                <div 
                  className="fixed z-[99990] w-72 bg-[#090e1a]/98 backdrop-blur-xl border border-emerald-500/50 rounded-xl shadow-[0_12px_45px_rgba(0,0,0,0.95)] p-2.5 text-xs font-mono ring-1 ring-emerald-500/30 animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    top: `${caseMenuPos.top}px`,
                    left: `${caseMenuPos.left}px`
                  }}
                >
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[10px] text-slate-400">
                    <span className="uppercase font-bold text-emerald-400 flex items-center gap-1">
                      <Briefcase size={11} /> Senarai Kes ({workspaces.length})
                    </span>
                    <button 
                      onClick={() => {
                        setIsCaseDropdownOpen(false);
                        onOpenModal('case_manager');
                      }}
                      className="text-cyan-400 hover:underline text-[9px] cursor-pointer"
                    >
                      Urus Semua
                    </button>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                    {workspaces.map(ws => {
                      const isCur = ws.id === activeWs.id;
                      return (
                        <button
                          key={ws.id}
                          onClick={() => {
                            if (!isCur) onSwitchWorkspace(ws.id);
                            setIsCaseDropdownOpen(false);
                          }}
                          className={`w-full text-left p-1.5 rounded flex items-center justify-between text-[10px] transition-colors cursor-pointer ${
                            isCur 
                              ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold' 
                              : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                          }`}
                        >
                          <span className="truncate">{ws.name}</span>
                          <span className="text-[8.5px] text-slate-400 shrink-0 font-mono">
                            {ws.data?.nodes?.length || 0} nod
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 mt-1.5 border-t border-white/10 flex gap-1.5">
                    <button
                      onClick={() => {
                        setIsCaseDropdownOpen(false);
                        const name = prompt("Nama Kod Misi / Kes Baharu:") || "KES_BARU";
                        onCreateWorkspace(name);
                      }}
                      className="flex-1 py-1 px-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded text-[9.5px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={11} /> Kes Baru
                    </button>
                    <button
                      onClick={() => {
                        setIsCaseDropdownOpen(false);
                        onSaveCase();
                      }}
                      className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded text-[9.5px] flex items-center justify-center gap-1 cursor-pointer"
                      title="Simpan Fail Kes .RHZ"
                    >
                      <Save size={11} />
                      <span>Simpan</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* Active Graph Layout Dropdown Selector (Top-level Always Accessible) */}
          <div ref={layoutDropdownRef} className="relative shrink-0">
            <button
              onClick={handleToggleLayoutDropdown}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-all cursor-pointer shadow-sm ${
                isLayoutDropdownOpen
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 hover:border-cyan-500/60 text-slate-200'
              }`}
              title="Pilih Topologi & Algoritma Susunan Graf"
            >
              <Workflow size={12} className="text-cyan-400 shrink-0" />
              <span className="text-[10px] text-slate-400 uppercase font-bold hidden md:inline">
                Susunan:
              </span>
              <span className="font-extrabold text-cyan-300 text-[10px] truncate max-w-[100px] sm:max-w-[130px]">
                {layoutNames[currentLayout] || currentLayout}
              </span>
              <ChevronDown size={11} className={`text-slate-400 transition-transform duration-150 ${isLayoutDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLayoutDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[99980]" 
                  onClick={() => setIsLayoutDropdownOpen(false)}
                />
                <div 
                  className="fixed z-[99990] w-80 sm:w-96 bg-[#090e1a]/98 backdrop-blur-2xl border border-cyan-500/50 rounded-xl shadow-[0_16px_50px_rgba(0,0,0,0.95)] p-2.5 text-xs font-mono ring-1 ring-cyan-500/30 animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    top: `${layoutMenuPos.top}px`,
                    left: `${layoutMenuPos.left}px`,
                    maxHeight: 'calc(100vh - 60px)',
                    overflowY: 'auto'
                  }}
                >
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] text-slate-400">
                    <span className="uppercase font-extrabold text-cyan-400 flex items-center gap-1.5 tracking-wider">
                      <Workflow size={12} /> Topologi Graf (9 Algoritma)
                    </span>
                    {onToggleRenderMode && (
                      <button 
                        onClick={() => {
                          onToggleRenderMode();
                        }}
                        className="text-amber-400 hover:text-amber-300 hover:underline text-[9.5px] cursor-pointer flex items-center gap-1 font-bold"
                        title="Tukar antara mod kad skematik Flowsint atau nod klasik"
                      >
                        <CreditCard size={10} />
                        <span>{nodeRenderMode === 'schematic' ? 'Kad: ON' : 'Nod: Bulat'}</span>
                      </button>
                    )}
                  </div>

                  {/* Layout Categories List */}
                  <div className="space-y-2.5 max-h-[65vh] overflow-y-auto custom-scrollbar pr-0.5">
                    {/* GROUP 1: PERISIKAN & PIPELINE */}
                    <div>
                      <div className="text-[8.5px] uppercase font-bold text-slate-500 px-1 mb-1 tracking-wider">
                        Susunan Perisikan & Pipeline
                      </div>
                      <div className="space-y-1">
                        {[
                          { id: 'schematic', name: 'Skematik Flowsint (Kad Blueprint)', icon: <Workflow size={13} className="text-amber-400" />, desc: 'Kad teratur mengikut saluran peringkat kemas' },
                          { id: 'orthogonal', name: 'Maltego Orthogonal (Melintang)', icon: <Network size={13} className="text-emerald-400" />, desc: 'Garisan siku tepat 90° mendatar untuk cetakan rasmi' },
                          { id: 'orthogonal_vertical', name: 'Maltego Orthogonal (Menegak)', icon: <Network size={13} className="text-cyan-400 rotate-90" />, desc: 'Lajur menegak bersiku 90° untuk rantaian kuasa' },
                        ].map(l => {
                          const isCur = currentLayout === l.id;
                          return (
                            <button
                              key={l.id}
                              onClick={() => {
                                onLayoutChange(l.id as LayoutMode);
                                setIsLayoutDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                                isCur
                                  ? 'bg-cyan-950/80 border border-cyan-400/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold'
                                  : 'hover:bg-slate-800/70 text-slate-300 border border-slate-800/60 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`p-1.5 rounded-md shrink-0 ${isCur ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-400'}`}>
                                  {l.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className={`text-[11px] font-bold truncate ${isCur ? 'text-white' : 'text-slate-200'}`}>
                                    {l.name}
                                  </div>
                                  <div className="text-[9px] text-slate-400 truncate max-w-[220px] sm:max-w-[260px]">
                                    {l.desc}
                                  </div>
                                </div>
                              </div>
                              {isCur && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 text-[8.5px] font-black tracking-wide ml-2 uppercase">
                                  AKTIF
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* GROUP 2: STRUKTUR HUBUNGAN & RANTAIAN */}
                    <div>
                      <div className="text-[8.5px] uppercase font-bold text-slate-500 px-1 mb-1 tracking-wider">
                        Struktur Hubungan & Organisasi
                      </div>
                      <div className="space-y-1">
                        {[
                          { id: 'force', name: 'Susunan Organik (Force-Directed)', icon: <Share2 size={13} className="text-cyan-400" />, desc: 'Fizik graviti anti-tindih dinamik (Maltego default)' },
                          { id: 'hierarchy', name: 'Hierarki Piramid (Top-Down)', icon: <Layers size={13} className="text-amber-400" />, desc: 'Struktur kepimpinan dalang ke ahli bawahan' },
                          { id: 'cluster', name: 'Kelompok Kategori Entiti', icon: <Shapes size={13} className="text-purple-400" />, desc: 'Asingkan pulau nod mengikut jenis sasaran/aset' },
                        ].map(l => {
                          const isCur = currentLayout === l.id;
                          return (
                            <button
                              key={l.id}
                              onClick={() => {
                                onLayoutChange(l.id as LayoutMode);
                                setIsLayoutDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                                isCur
                                  ? 'bg-cyan-950/80 border border-cyan-400/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold'
                                  : 'hover:bg-slate-800/70 text-slate-300 border border-slate-800/60 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`p-1.5 rounded-md shrink-0 ${isCur ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-400'}`}>
                                  {l.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className={`text-[11px] font-bold truncate ${isCur ? 'text-white' : 'text-slate-200'}`}>
                                    {l.name}
                                  </div>
                                  <div className="text-[9px] text-slate-400 truncate max-w-[220px] sm:max-w-[260px]">
                                    {l.desc}
                                  </div>
                                </div>
                              </div>
                              {isCur && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 text-[8.5px] font-black tracking-wide ml-2 uppercase">
                                  AKTIF
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* GROUP 3: GEOMETRI, AUDIT & GEOSPASIAL */}
                    <div>
                      <div className="text-[8.5px] uppercase font-bold text-slate-500 px-1 mb-1 tracking-wider">
                        Geometri, Inventori & GIS
                      </div>
                      <div className="space-y-1">
                        {[
                          { id: 'circle', name: 'Radial Sepusat (Bulatan)', icon: <Circle size={13} className="text-blue-400" />, desc: 'Analisis keterpusatan dari hub sasaran utama' },
                          { id: 'grid', name: 'Matriks Grid Sekata', icon: <Grid size={13} className="text-slate-400" />, desc: 'Petak sekata untuk audit visual inventori data' },
                          { id: 'map', name: 'Unjuran Peta Satelit GIS', icon: <MapIcon size={13} className="text-rose-400" />, desc: 'Unjurkan koordinat GPS ke peta satelit interaktif' },
                        ].map(l => {
                          const isCur = currentLayout === l.id;
                          return (
                            <button
                              key={l.id}
                              onClick={() => {
                                onLayoutChange(l.id as LayoutMode);
                                setIsLayoutDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                                isCur
                                  ? 'bg-cyan-950/80 border border-cyan-400/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold'
                                  : 'hover:bg-slate-800/70 text-slate-300 border border-slate-800/60 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`p-1.5 rounded-md shrink-0 ${isCur ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-400'}`}>
                                  {l.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className={`text-[11px] font-bold truncate ${isCur ? 'text-white' : 'text-slate-200'}`}>
                                    {l.name}
                                  </div>
                                  <div className="text-[9px] text-slate-400 truncate max-w-[220px] sm:max-w-[260px]">
                                    {l.desc}
                                  </div>
                                </div>
                              </div>
                              {isCur && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 text-[8.5px] font-black tracking-wide ml-2 uppercase">
                                  AKTIF
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setIsLayoutDropdownOpen(false);
                        setActiveTab('layout');
                        setIsRibbonCollapsed(false);
                      }}
                      className="text-[9.5px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <span>Buka Tab Reben Susunan</span>
                      <ArrowRight size={10} />
                    </button>
                    {onToggleRenderMode && (
                      <button
                        onClick={() => {
                          onToggleRenderMode();
                        }}
                        className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] border border-slate-600 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CreditCard size={10} className="text-amber-400" />
                        <span>Tukar Mod Kad</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Ribbon Navigation Tabs (Maltego Carbon Tabs) */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar no-scrollbar">
          {[
            { id: 'investigate', label: 'Siasat & Input', icon: <Database size={11} />, badge: null },
            { id: 'transforms', label: 'Transformasi OSINT', icon: <Zap size={11} />, badge: null },
            { id: 'layout', label: 'Susunan Graf', icon: <Workflow size={11} />, badge: detectedConflictsCount > 0 ? detectedConflictsCount : null },
            { id: 'geospatial', label: 'Geospasial & GIS', icon: <Globe size={11} />, badge: currentLayout === 'map' ? 'PETA' : null },
            { id: 'evidence', label: 'Bukti & Laporan', icon: <FileText size={11} />, badge: null },
            { id: 'copilot', label: 'AI Copilot', icon: <Brain size={11} />, badge: selectedNodes.length > 0 ? selectedNodes.length : null },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as RibbonTab);
                  if (isRibbonCollapsed) setIsRibbonCollapsed(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wide transition-all cursor-pointer shrink-0 ${
                  isActive && !isRibbonCollapsed
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className={isActive && !isRibbonCollapsed ? 'text-cyan-400' : 'text-slate-500'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span className="px-1 py-0.2 rounded-full text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Toggle Ribbon Collapse / Expand */}
          <button
            onClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-1"
            title={isRibbonCollapsed ? "Buka Reben Perintah (Ctrl+B)" : "Sembunyi Reben Perintah (Ctrl+B)"}
          >
            {isRibbonCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>

        {/* Right: Quick Access Toolbar & Utilities */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* Quick Undo */}
          <Tooltip title="Batalkan Tindakan (Undo)" shortcut="Ctrl+Z" position="bottom">
            <button
              onClick={onUndo}
              disabled={historyLength === 0}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                historyLength > 0 ? 'text-cyan-400 hover:bg-cyan-950/40' : 'text-slate-600 opacity-40 cursor-not-allowed'
              }`}
            >
              <RotateCcw size={13} />
            </button>
          </Tooltip>

          {/* Quick Delete */}
          <Tooltip title="Padam Entiti Terpilih" shortcut="Del" position="bottom" disabled={selectedNodes.length === 0}>
            <button
              onClick={onDeleteSelected}
              disabled={selectedNodes.length === 0}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                selectedNodes.length > 0 ? 'text-rose-400 hover:bg-rose-950/40' : 'text-slate-600 opacity-40 cursor-not-allowed'
              }`}
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>

          {/* Quick Merge (if >=2 nodes) */}
          {selectedNodes.length >= 2 && (
            <Tooltip title={`Gabungkan ${selectedNodes.length} Nod Terpilih`} position="bottom">
              <button
                onClick={onMergeNodes}
                className="flex items-center gap-1 px-1.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[9px] font-bold hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                <Combine size={12} />
                <span className="hidden sm:inline">Gabung</span>
              </button>
            </Tooltip>
          )}

          {/* Quick Radial Dial */}
          <Tooltip title="Dail Tindakan Pantas Maltego 360°" position="bottom">
            <button
              onClick={onOpenRadial}
              disabled={!activeNode && selectedNodes.length === 0}
              className={`p-1.5 rounded border transition-all cursor-pointer ${
                selectedNodes.length > 1
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : selectedNodes.length === 1
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'border-slate-800 text-slate-500'
              }`}
            >
              <Radar size={13} className={selectedNodes.length > 1 ? 'animate-spin' : ''} />
            </button>
          </Tooltip>

          {/* AI Copilot Float Button */}
          <Tooltip title="Pusat Ejen Risikan Autonomi" position="bottom">
            <button
              onClick={onToggleAIChat}
              className={`p-1.5 rounded border transition-all cursor-pointer relative ${
                showAIChat
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40'
              }`}
            >
              <Brain size={13} />
              {selectedNodes.length > 0 && !showAIChat && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
              )}
            </button>
          </Tooltip>

          <div className="h-4 w-px bg-white/10 mx-0.5 hidden lg:block" />

          {/* Environment & System Monitors */}
          <div className="hidden xl:flex items-center">
            <EnvironmentManager />
          </div>
          <div className="hidden lg:flex items-center">
            <SystemMonitor backendStatus={backendStatus} isMobile={isMobile} />
          </div>

          {/* Eco Mode */}
          <Tooltip title="Mod Penjimatan Kuasa / Beban Grafik Ringan" position="bottom">
            <button
              onClick={onToggleLowPower}
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                isLowPower 
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-400' 
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-emerald-400'
              }`}
            >
              <Zap size={13} className={isLowPower ? 'fill-emerald-400' : ''} />
            </button>
          </Tooltip>

          {/* Settings */}
          <Tooltip title="Tetapan Sistem & API" position="bottom">
            <button
              onClick={() => onOpenModal('settings')}
              className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500 transition-colors cursor-pointer"
            >
              <Settings size={13} />
            </button>
          </Tooltip>

          {/* OPSEC Lock */}
          <Tooltip title="Kunci Terminal (OPSEC Screen Lock)" position="bottom">
            <button
              onClick={onLockApp}
              className="p-1.5 rounded bg-slate-900 border border-slate-700 text-rose-400 hover:bg-rose-950/40 hover:border-rose-500 transition-colors cursor-pointer"
            >
              <Lock size={13} />
            </button>
          </Tooltip>

          {/* Master Key */}
          <Tooltip title="Akses Pentadbir (Master Key Gate)" position="bottom">
            <button
              onClick={onOpenMasterKey}
              className="p-1.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <Key size={13} />
            </button>
          </Tooltip>

          {/* Fullscreen */}
          <Tooltip title={isFullscreen ? "Keluar Skrin Penuh" : "Skrin Penuh (F11)"} position="bottom">
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
            </button>
          </Tooltip>

        </div>
      </div>

      {/* 2. MALTEGO COMMAND RIBBON EXPANDABLE CONTENT BAR */}
      {!isRibbonCollapsed && (
        <div className="px-3 py-1.5 bg-[#0e1320] border-b border-slate-800/80 flex items-center gap-4 overflow-x-auto custom-scrollbar min-h-[46px] animate-in slide-in-from-top-1 duration-150">
          
          {/* TAB 1: INVESTIGATE & INPUT */}
          {activeTab === 'investigate' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 px-1 border-r border-slate-700/60 mr-1 hidden sm:inline">
                Kemasukan Data
              </span>

              <button
                onClick={() => onOpenModal('manual')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Tambah Nod Sasaran Manual"
              >
                <Plus size={12} className="text-cyan-400" />
                <span>+ Entiti Baru</span>
              </button>

              <button
                onClick={() => onOpenModal('import')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Import fail CSV, JSON, atau fail .RHZ"
              >
                <Database size={12} className="text-emerald-400" />
                <span>Ingest Data</span>
              </button>

              <button
                onClick={() => onOpenModal('global_search')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Carian Mendalam Merentas Semua Nod (Ctrl+F)"
              >
                <Search size={12} className="text-cyan-400" />
                <span>Carian Global</span>
              </button>

              <button
                onClick={() => onOpenModal('vault')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Pengimbas Big Data & Pangkalan Data Kebocoran"
              >
                <HardDrive size={12} className="text-amber-400" />
                <span>Big Data Scanner</span>
              </button>

              {onOpenEnricherHub && (
                <button
                  onClick={onOpenEnricherHub}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/50 text-cyan-200 text-[10px] font-bold uppercase transition-all cursor-pointer shadow-sm"
                  title="Hab Modul Pengayaan (POI, Kripto, Rangkaian)"
                >
                  <Zap size={12} className="text-cyan-400 animate-pulse" />
                  <span>Enricher Hub</span>
                </button>
              )}

              <div className="h-4 w-px bg-slate-700 mx-1" />

              <button
                onClick={() => onOpenModal('offline_logic')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Ekstrak IP, Emel, Telefon secara Luar Talian"
              >
                <Binary size={12} className="text-slate-400" />
                <span>Offline Regex</span>
              </button>

              <button
                onClick={() => onOpenModal('dork_builder')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Pembina Carian Google Dork Lanjutan"
              >
                <Search size={12} className="text-slate-400" />
                <span>Dork Builder</span>
              </button>

              <button
                onClick={() => onOpenModal('extension_builder')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Jana Skrip Suntikan Pelayar Tampermonkey"
              >
                <Webhook size={12} className="text-slate-400" />
                <span>Web Extension</span>
              </button>
            </div>
          )}

          {/* TAB 2: TRANSFORMS & INTEL */}
          {activeTab === 'transforms' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 px-1 border-r border-slate-700/60 mr-1 hidden sm:inline">
                Enjin Transformasi
              </span>

              <button
                onClick={() => onOpenModal('google_socint')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/60 text-cyan-200 text-[10px] font-bold uppercase transition-all cursor-pointer shadow-sm"
                title="Google SOCINT Custom Search Studio (CX: 53a0041f2f24f4e3b)"
              >
                <Search size={12} className="text-cyan-300" />
                <span>Google SOCINT</span>
              </button>

              <button
                onClick={() => onOpenModal('osint_engine')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Carian OSINT merentas berbilang platform"
              >
                <Filter size={12} className="text-amber-400" />
                <span>Smart OSINT</span>
              </button>

              <button
                onClick={() => onOpenModal('watson_recon')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="IBM Watson Cognitive Recon & NER Engine"
              >
                <Brain size={12} className="text-cyan-400 animate-pulse" />
                <span>Watson NER Recon</span>
              </button>

              <button
                onClick={() => onOpenModal('autonomous_agent')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Ejen Risikan Autonomi Penjelajah Graf"
              >
                <Radar size={12} className="text-rose-400" />
                <span>Auto Scout Agent</span>
              </button>

              <button
                onClick={() => onOpenModal('phone_intel')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Pusat Perisikan Nombor Telefon & Telko"
              >
                <Smartphone size={12} className="text-emerald-400" />
                <span>Phone Intel Hub</span>
              </button>

              <button
                onClick={() => onOpenModal('shodan_panel')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Pengimbas Peranti & Rangkaian Shodan"
              >
                <Server size={12} className="text-cyan-400" />
                <span>Shodan Infra</span>
              </button>

              <button
                onClick={() => onOpenModal('social_recon')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Analisis Rangkaian Media Sosial"
              >
                <MessageCircle size={12} className="text-purple-400" />
                <span>Social Recon</span>
              </button>

              <button
                onClick={onOpenBreachModal}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-rose-300 text-[10px] transition-colors cursor-pointer"
                title="Semakan Kebocoran Pangkalan Data"
              >
                <ShieldAlert size={12} className="text-rose-400" />
                <span>Breach Checker</span>
              </button>

              <button
                onClick={() => onOpenModal('stylometry')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Makmal Analisis Tatabahasa & Stilometri"
              >
                <Fingerprint size={12} className="text-slate-400" />
                <span>Stilometri</span>
              </button>
            </div>
          )}

          {/* TAB 3: GRAPH LAYOUT & ANALYSIS */}
          {activeTab === 'layout' && (
            <div className="flex items-center gap-1.5 text-xs flex-nowrap py-0.5">
              <span className="text-[9px] uppercase font-black text-cyan-400 px-1.5 border-r border-slate-700/60 mr-1 hidden md:inline tracking-wider shrink-0">
                Susunan Graf
              </span>

              {/* Button to open full Topology Dropdown Palette */}
              <button
                onClick={handleToggleLayoutDropdown}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-400/60 text-cyan-200 text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 shadow-sm"
                title="Buka Menu Dialog Penuh Topologi Graf"
              >
                <Workflow size={12} className="text-cyan-400" />
                <span>Semua Algoritma</span>
                <ChevronDown size={11} className="text-cyan-400" />
              </button>

              <div className="h-4 w-px bg-slate-700 mx-0.5 shrink-0" />

              {/* DIRECT SEGMENTED LAYOUT PALETTE - ALL 9 ALGORITHMS DIRECTLY VISIBLE */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-950/90 border border-slate-800 rounded-lg shrink-0 overflow-x-auto">
                {[
                  { id: 'schematic', name: 'Skematik', icon: <Workflow size={13} />, tip: 'Skematik Kad Blueprint (Flowsint)' },
                  { id: 'force', name: 'Organik', icon: <Share2 size={13} />, tip: 'Fizik Graviti Anti-Tindih (Force-Directed)' },
                  { id: 'orthogonal', name: 'Orthogonal H', icon: <Network size={13} />, tip: 'Maltego Melintang (Sudut 90°)' },
                  { id: 'orthogonal_vertical', name: 'Orthogonal V', icon: <Network size={13} className="rotate-90" />, tip: 'Maltego Menegak (Sudut 90°)' },
                  { id: 'hierarchy', name: 'Hierarki', icon: <Layers size={13} />, tip: 'Piramid Intel & Rantaian Kuasa' },
                  { id: 'cluster', name: 'Kelompok', icon: <Shapes size={13} />, tip: 'Asingkan Mengikut Jenis Entiti' },
                  { id: 'circle', name: 'Radial', icon: <Circle size={13} />, tip: 'Susunan Membulat Dari Pusat Hub' },
                  { id: 'grid', name: 'Grid', icon: <Grid size={13} />, tip: 'Susunan Petak Matriks Audit' },
                  { id: 'map', name: 'Peta GIS', icon: <MapIcon size={13} />, tip: 'Unjuran Peta Satelit Interaktif' }
                ].map(l => {
                  const isActive = currentLayout === l.id;
                  return (
                    <Tooltip key={l.id} title={l.tip} position="bottom">
                      <button
                        onClick={() => onLayoutChange(l.id as LayoutMode)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)] font-black'
                            : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <span className={isActive ? 'text-slate-950' : 'text-cyan-400'}>{l.icon}</span>
                        <span className="text-[10px] font-bold">{l.name}</span>
                      </button>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Render Mode: Schematic Card vs Classic Circle */}
              {onToggleRenderMode && (
                <button
                  onClick={onToggleRenderMode}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    nodeRenderMode === 'schematic'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Tukar antara Kad Skematik (Flowsint) atau Nod Bulat"
                >
                  <CreditCard size={12} />
                  <span>{nodeRenderMode === 'schematic' ? 'Gaya Kad (Flowsint)' : 'Gaya Bulat (Classic)'}</span>
                </button>
              )}

              <div className="h-4 w-px bg-slate-700 mx-1" />

              {/* Conflict & Anomaly Detector */}
              <button
                onClick={() => onOpenModal('conflict_detector')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                  detectedConflictsCount > 0
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Pengesan Percanggahan Alibi, Kronologi & Fakta"
              >
                <AlertTriangle size={12} className={detectedConflictsCount > 0 ? 'text-amber-400' : 'text-slate-400'} />
                <span>Pengesan Konflik</span>
                {detectedConflictsCount > 0 && (
                  <span className="px-1 bg-amber-500 text-slate-950 rounded-full text-[8px] font-black">
                    {detectedConflictsCount}
                  </span>
                )}
              </button>

              {/* Ontology Engine */}
              <button
                onClick={onOpenOntology}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Enjin Ontologi & Selesaikan Dead End Siasatan"
              >
                <Brain size={12} className="text-cyan-400" />
                <span>Enjin Ontologi</span>
              </button>

              {/* Triples RDF */}
              <button
                onClick={onOpenTriples}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Penjelajah Graf Triples Semantik [Subjek -> Predikat -> Objek]"
              >
                <Database size={12} className="text-indigo-400" />
                <span>Triples Semantik (RDF)</span>
              </button>

              {/* SNA */}
              <button
                onClick={() => onOpenModal('sna_panel')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Analisis Rangkaian Sosial & Metrik Keterpusatan"
              >
                <Network size={12} className="text-purple-400" />
                <span>SNA Metrik</span>
              </button>
            </div>
          )}

          {/* TAB 4: GEOSPATIAL & SURVEILLANCE */}
          {activeTab === 'geospatial' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 px-1 border-r border-slate-700/60 mr-1 hidden sm:inline">
                GIS & Pengawasan
              </span>

              <button
                onClick={() => {
                  if (currentLayout === 'map') onLayoutChange('force');
                  else onLayoutChange('map');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                  currentLayout === 'map'
                    ? 'bg-emerald-600 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'bg-slate-900 border-slate-700 text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-500/50'
                }`}
                title="Unjurkan Entiti ke atas Peta Satelit Interaktif (GIS)"
              >
                <MapIcon size={12} />
                <span>{currentLayout === 'map' ? 'Peta GIS: AKTIF' : 'Papar Peta GIS'}</span>
              </button>

              <button
                onClick={() => onOpenModal('geo_recon')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Peninjauan Geospasial, Triangulasi Koordinat & Radius Sasaran"
              >
                <Globe size={12} className="text-cyan-400" />
                <span>Tactical GEOINT</span>
              </button>

              <button
                onClick={onLaunchGoogleEarth}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Pandangan 3D Muka Bumi Google Earth"
              >
                <Globe size={12} className="text-blue-400" />
                <span>Google Earth 3D</span>
              </button>

              <button
                onClick={onLaunchStreetView}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Pengimejan Jalanan 360 Darjah Mapillary"
              >
                <Camera size={12} className="text-emerald-400" />
                <span>360° Street View</span>
              </button>

              <button
                onClick={onOpenTrafficVision}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Strim Kamera Trafik & CCTV Surveillance"
              >
                <Camera size={12} className="text-rose-400" />
                <span>Traffic CCTV</span>
              </button>

              <button
                onClick={() => onOpenModal('location_sting')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-rose-300 text-[10px] transition-colors cursor-pointer"
                title="Jana Pautan Umpan Penjejak Lokasi IP Sasaran"
              >
                <Crosshair size={12} className="text-rose-400" />
                <span>Location Sting</span>
              </button>
            </div>
          )}

          {/* TAB 5: EVIDENCE & REPORTS */}
          {activeTab === 'evidence' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 px-1 border-r border-slate-700/60 mr-1 hidden sm:inline">
                Eksport & Bukti
              </span>

              <button
                onClick={() => onOpenModal('intelligence_briefing')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold uppercase transition-all cursor-pointer shadow-sm"
                title="Pengeksport Taklimat Ketenteraan & Dossier Kes (Fasa 3)"
              >
                <FileText size={12} className="text-emerald-400" />
                <span>Military Briefing Dossier</span>
              </button>

              <button
                onClick={onSaveCase}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Simpan Pangkalan Data Kes (.RHZ)"
              >
                <Save size={12} className="text-emerald-400" />
                <span>Simpan Kes (.RHZ)</span>
              </button>

              <button
                onClick={onExportMaltego}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Eksport ke Format CSV Maltego / Gephi"
              >
                <Download size={12} className="text-blue-400" />
                <span>Eksport Maltego CSV</span>
              </button>

              <button
                onClick={onExportAIPrompt}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Salin Ringkasan Graf Berstruktur untuk ChatGPT / Claude"
              >
                <Copy size={12} className="text-purple-400" />
                <span>Export AI Prompt</span>
              </button>

              <div className="h-4 w-px bg-slate-700 mx-1" />

              <button
                onClick={() => onOpenModal('forensic_vault')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Bilik Kebal Artifak Digital Enkripsi"
              >
                <Layers size={12} className="text-cyan-400" />
                <span>Forensic Vault</span>
              </button>

              <button
                onClick={() => onOpenModal('file_scanner')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Analisis Fail Binari & Metadata Dokumen"
              >
                <FileSearch size={12} className="text-slate-400" />
                <span>File Forensics</span>
              </button>

              <button
                onClick={() => onOpenModal('web_capture')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Tangkapan Skrin Bukti Web (SnapRender)"
              >
                <Camera size={12} className="text-slate-400" />
                <span>Web Snapshot</span>
              </button>

              <button
                onClick={() => onOpenModal('share_trace')}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Bongkar Pautan Dipendekkan & Rantaian Pengalihan"
              >
                <LinkIcon size={12} className="text-slate-400" />
                <span>Link ShareTrace</span>
              </button>

              <button
                onClick={onOpenTimeline}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] transition-colors cursor-pointer"
                title="Peluncur Garis Masa & Kronologi Peristiwa"
              >
                <Clock size={12} className="text-amber-400" />
                <span>Timeline</span>
              </button>

              <button
                onClick={onClearWorkspace}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-rose-950/60 text-rose-400 text-[10px] transition-colors cursor-pointer ml-auto border border-rose-900/40"
                title="Padam Semua Nod dalam Kanvas Semasa"
              >
                <Trash2 size={12} />
                <span>Kosongkan Kanvas</span>
              </button>
            </div>
          )}

          {/* TAB 6: AI COPILOT */}
          {activeTab === 'copilot' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 px-1 border-r border-slate-700/60 mr-1 hidden sm:inline">
                Kecerdasan Buatan
              </span>

              <button
                onClick={onToggleAIChat}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-[10px] font-bold uppercase transition-all cursor-pointer shadow-sm"
                title="Buka Chat AI Copilot yang Berupaya Melakukan Tindakan Graf Secara Langsung"
              >
                <Brain size={12} className="text-cyan-400 animate-pulse" />
                <span>Agentic Chat Copilot</span>
              </button>

              <button
                onClick={onRunSynthesis}
                disabled={synthesisLoading}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Jalankan Sintesis Neural Gemini ke atas Keseluruhan Graf"
              >
                <Sparkles size={12} className={`text-purple-400 ${synthesisLoading ? 'animate-spin' : ''}`} />
                <span>{synthesisLoading ? 'Mensintesis...' : 'Jalankan AI Synthesis'}</span>
              </button>

              {synthesisResult && (
                <button
                  onClick={() => onOpenModal('synthesis_report')}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase transition-all cursor-pointer"
                >
                  <FileSearch size={12} className="text-emerald-400" />
                  <span>Lihat Laporan Sintesis</span>
                </button>
              )}

              <button
                onClick={onOpenCollabChat}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-blue-300 text-[10px] transition-colors cursor-pointer"
                title="Bilik Sembang Pasukan Operasi Terenkripsi"
              >
                <Users size={12} className="text-blue-400" />
                <span>Sembang Pasukan Ops</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default MaltegoCommandRibbon;
