import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  Save, Clock, CheckCircle2, AlertCircle, RefreshCw, HardDrive, 
  Download, Upload, FolderOpen, History, RotateCcw, ChevronDown, 
  ShieldCheck, Zap, Sliders, X, FileText, Check, AlertTriangle, GripHorizontal
} from 'lucide-react';
import { rhzAutosave, RhzAutosaveState, RhzSnapshot } from '../services/rhzAutosaveService';
import { Workspace, CaseFile } from '../types';

interface RhzAutosaveHUDProps {
  activeWorkspace: Workspace;
  onRestoreSnapshot?: (caseFile: CaseFile) => void;
  onOpenRhzFile?: (caseFile: CaseFile, fileName: string) => void;
  onTriggerSave?: () => void;
}

export const RhzAutosaveHUD: React.FC<RhzAutosaveHUDProps> = ({
  activeWorkspace,
  onRestoreSnapshot,
  onOpenRhzFile,
  onTriggerSave
}) => {
  const [state, setState] = useState<RhzAutosaveState>(rhzAutosave.getState());
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'snapshots' | 'settings'>('status');
  const [snapshots, setSnapshots] = useState<RhzSnapshot[]>([]);
  const [renamingName, setRenamingName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);

  // Drag State for Movable/Repositionable HUD Button
  const [isFloating, setIsFloating] = useState(false);
  const [fixedPos, setFixedPos] = useState<{ left: number; top: number } | null>(null);
  const fixedPosRef = useRef<{ left: number; top: number } | null>(null);
  fixedPosRef.current = fixedPos;

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; baseLeft: number; baseTop: number; moved: boolean; isDragging: boolean }>({
    startX: 0,
    startY: 0,
    baseLeft: 0,
    baseTop: 0,
    moved: false,
    isDragging: false
  });

  const menuRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('textarea') || target.closest('a')) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const baseLeft = isFloating && fixedPosRef.current ? fixedPosRef.current.left : rect.left;
    const baseTop = isFloating && fixedPosRef.current ? fixedPosRef.current.top : rect.top;

    if (!isFloating) {
      const initialPos = { left: baseLeft, top: baseTop };
      setFixedPos(initialPos);
      fixedPosRef.current = initialPos;
    }

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseLeft,
      baseTop,
      moved: false,
      isDragging: true
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current.isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 3) {
      dragStartRef.current.moved = true;
    }

    const btn = e.currentTarget;
    const w = btn.offsetWidth || 140;
    const h = btn.offsetHeight || 30;

    const newPos = {
      left: Math.max(8, Math.min(window.innerWidth - w - 8, dragStartRef.current.baseLeft + deltaX)),
      top: Math.max(8, Math.min(window.innerHeight - h - 8, dragStartRef.current.baseTop + deltaY))
    };

    fixedPosRef.current = newPos;
    setFixedPos(newPos);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    dragStartRef.current.isDragging = false;
    setIsDragging(false);

    if (!dragStartRef.current.moved) {
      setIsOpen(prev => !prev);
    } else if (!isFloating) {
      setIsFloating(true);
    }
  };

  // Subscribe to state updates
  useEffect(() => {
    const unsub = rhzAutosave.subscribe(newState => {
      setState(newState);
    });
    return unsub;
  }, []);

  // Update active file metadata when workspace changes
  useEffect(() => {
    if (activeWorkspace) {
      const defaultName = `${(activeWorkspace.name || 'RED_HORIZON_CASE').replace(/\s+/g, '_')}.rhz`;
      if (!state.activeFileName || state.workspaceId !== activeWorkspace.id) {
        rhzAutosave.bindFile(defaultName, activeWorkspace.id);
      }
    }
  }, [activeWorkspace?.id, activeWorkspace?.name]);

  // Load snapshots when menu is opened or workspace changes
  useEffect(() => {
    if (activeWorkspace?.id) {
      setSnapshots(rhzAutosave.getSnapshots(activeWorkspace.id));
    }
  }, [isOpen, state.lastSavedTimestamp, activeWorkspace?.id]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        !target.closest('.rhz-autosave-hud-btn')
      ) {
        setIsOpen(false);
        setIsRenaming(false);
        setRestoreConfirmId(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSaveNow = async () => {
    if (onTriggerSave) {
      onTriggerSave();
    } else {
      await rhzAutosave.saveNow(activeWorkspace, 'manual');
    }
  };

  const handleOpenDiskFile = async () => {
    const res = await rhzAutosave.openRhzWithFilePicker();
    if (res && onOpenRhzFile) {
      onOpenRhzFile(res.fileContent, res.fileName);
      setIsOpen(false);
    }
  };

  const handleLinkDiskFile = async () => {
    await rhzAutosave.linkDiskFile(activeWorkspace);
  };

  const handleDownloadRhz = () => {
    rhzAutosave.downloadCurrentRhz(activeWorkspace);
  };

  const handleSaveRename = () => {
    if (renamingName.trim()) {
      rhzAutosave.bindFile(renamingName.trim(), activeWorkspace.id);
      setIsRenaming(false);
    }
  };

  const handleRestore = (snap: RhzSnapshot) => {
    if (onRestoreSnapshot) {
      onRestoreSnapshot(snap.data);
      setRestoreConfirmId(null);
      setIsOpen(false);
    }
  };

  // Format seconds mm:ss
  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Format last saved time
  const formatTime = (ts: number | null) => {
    if (!ts) return 'Belum disimpan';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const progressPercent = Math.max(0, Math.min(100, Math.round(((state.intervalSeconds - state.remainingSeconds) / state.intervalSeconds) * 100)));

  const renderHUDButton = () => (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
      className={`rhz-autosave-hud-btn flex items-center gap-1.5 px-2 py-1 rounded border transition-all cursor-grab active:cursor-grabbing touch-none select-none ${
        state.status === 'saving'
          ? 'bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse'
          : state.status === 'saved'
          ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
          : state.status === 'error'
          ? 'bg-red-950/80 border-red-500/80 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
          : state.enabled
          ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-black border-emerald-500/40 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-950/80 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
          : 'bg-black/60 border-white/10 text-gray-500 hover:text-gray-300'
      }`}
      title={`Fail .RHZ Autosave (${state.enabled ? `${state.intervalMinutes} min` : 'Mati'}) - Tarik untuk alih atau klik untuk menu`}
    >
      <GripHorizontal size={11} className="text-emerald-500/60 shrink-0" />

      {/* Status Icon */}
      {state.status === 'saving' ? (
        <RefreshCw size={12} className="text-amber-400 animate-spin" />
      ) : state.status === 'saved' ? (
        <CheckCircle2 size={12} className="text-emerald-400" />
      ) : state.status === 'error' ? (
        <AlertCircle size={12} className="text-red-400" />
      ) : state.hasFileHandle ? (
        <HardDrive size={12} className="text-cyan-400" />
      ) : (
        <Save size={12} className={state.enabled ? "text-emerald-400" : "text-gray-500"} />
      )}

      {/* Text Details */}
      <div className="flex items-center gap-1.5">
        <span className="font-black text-[10px] tracking-wider uppercase hidden sm:inline">
          {state.status === 'saving' ? 'MENYIMPAN...' : state.status === 'saved' ? 'DISIMPAN' : '.RHZ AUTO'}
        </span>

        {state.enabled && (
          <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
            state.status === 'saving'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          }`}>
            {formatCountdown(state.remainingSeconds)}
          </span>
        )}

        {state.hasFileHandle && (
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" title="Disegerakkan terus ke fail cakera" />
        )}
      </div>

      <ChevronDown size={11} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'text-gray-400'}`} />
    </button>
  );

  const renderDropdownMenu = () => (
    <div
      ref={menuRef}
      className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-slate-950/95 border-2 border-emerald-500/60 rounded-lg shadow-[0_0_35px_rgba(16,185,129,0.25)] backdrop-blur-xl z-[100000] text-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-black border-b border-emerald-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <Save size={15} />
          </div>
          <div>
            <h4 className="text-xs font-black text-white tracking-wider uppercase flex items-center gap-1.5">
              Autosave Fail Kerja .RHZ
              <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-black rounded-full text-[8px]">
                2 MIN
              </span>
            </h4>
            <p className="text-[10px] text-emerald-400/80">Simpanan automatik ke fail & peti pemulihan</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isFloating && (
            <button
              type="button"
              onClick={() => { setIsFloating(false); setFixedPos(null); }}
              className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded border border-emerald-500/40 flex items-center gap-1 cursor-pointer"
              title="Kembalikan butang ke bar navigasi atas"
            >
              <RotateCcw size={10} /> Reset Posisi
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 bg-black/40 text-[10px] font-bold">
            <button
              onClick={() => setActiveTab('status')}
              className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'status'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ShieldCheck size={12} /> Status & Kawalan
            </button>
            <button
              onClick={() => setActiveTab('snapshots')}
              className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors relative ${
                activeTab === 'snapshots'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <History size={12} /> Sejarah ({snapshots.length})
              {snapshots.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'settings'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sliders size={12} /> Selang Masa
            </button>
          </div>

          {/* TAB 1: STATUS & CONTROLS */}
          {activeTab === 'status' && (
            <div className="p-3 space-y-3">
              {/* Active File Name Bar */}
              <div className="p-2.5 rounded bg-black/60 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">Nama Fail .RHZ:</span>
                  {!isRenaming ? (
                    <button
                      onClick={() => {
                        setRenamingName(state.activeFileName);
                        setIsRenaming(true);
                      }}
                      className="text-emerald-400 hover:underline text-[10px] flex items-center gap-1"
                    >
                      Ubah Nama
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveRename}
                      className="text-cyan-400 hover:underline text-[10px] flex items-center gap-1"
                    >
                      <Check size={10} /> Simpan
                    </button>
                  )}
                </div>

                {!isRenaming ? (
                  <div className="flex items-center gap-2 text-white font-bold text-xs truncate bg-slate-900/80 px-2 py-1.5 rounded border border-white/5">
                    <FileText size={13} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{state.activeFileName}</span>
                    {state.hasFileHandle && (
                      <span className="ml-auto px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded text-[9px] shrink-0">
                        Pautan Cakera
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={renamingName}
                      onChange={(e) => setRenamingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                      className="w-full bg-slate-900 border border-emerald-500/60 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Progress & Countdown Bar */}
              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <Clock size={12} className={state.enabled ? "animate-pulse text-emerald-400" : "text-gray-500"} />
                    Autosave seterusnya dalam:
                  </span>
                  <span className="font-mono font-black text-white text-xs bg-black/60 px-2 py-0.5 rounded border border-emerald-500/40">
                    {state.enabled ? formatCountdown(state.remainingSeconds) : 'DIMATIKAN'}
                  </span>
                </div>

                {state.enabled && (
                  <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-emerald-500/20">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-1000"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
                  <span>Terakhir disimpan:</span>
                  <span className="text-emerald-400 font-bold">{formatTime(state.lastSavedTimestamp)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>Jumlah Autosave Sesi:</span>
                  <span className="text-white font-mono">{state.totalAutosaves} kali</span>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleSaveNow}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded text-[11px] transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
                  title="Simpan fail .rhz sekarang (Ctrl+S)"
                >
                  <Save size={13} />
                  <span>Simpan Sekarang</span>
                </button>

                <button
                  onClick={handleDownloadRhz}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/40 text-emerald-400 rounded text-[11px] font-bold transition-all cursor-pointer"
                  title="Muat turun salinan fail .rhz"
                >
                  <Download size={13} />
                  <span>Muat Turun .RHZ</span>
                </button>
              </div>

              {/* Advanced File Sync Options */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <button
                  onClick={handleLinkDiskFile}
                  className="w-full flex items-center justify-between p-2 rounded bg-black/40 hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-500/40 text-left transition-all text-[10px] text-gray-300 hover:text-cyan-300 group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <HardDrive size={13} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="font-bold text-white">Pautkan ke Cakera Komputer</div>
                      <div className="text-[9px] text-gray-400">Autosave langsung ke fail cakera tanpa popup</div>
                    </div>
                  </div>
                  <ChevronDown size={12} className="-rotate-90 text-gray-500 group-hover:text-cyan-300" />
                </button>

                <button
                  onClick={handleOpenDiskFile}
                  className="w-full flex items-center justify-between p-2 rounded bg-black/40 hover:bg-emerald-950/40 border border-white/5 hover:border-emerald-500/40 text-left transition-all text-[10px] text-gray-300 hover:text-emerald-300 group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen size={13} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="font-bold text-white">Buka Fail .RHZ / .JSON Lain</div>
                      <div className="text-[9px] text-gray-400">Buka dan aktifkan autosave 2-minit serta-merta</div>
                    </div>
                  </div>
                  <ChevronDown size={12} className="-rotate-90 text-gray-500 group-hover:text-emerald-300" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 2-MINUTE SNAPSHOTS VAULT (RESTORE POINTS) */}
          {activeTab === 'snapshots' && (
            <div className="p-3 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between text-[10px] text-gray-400 pb-1 border-b border-white/10">
                <span>Peti Simpanan Snapshots (Maks: 15)</span>
                {snapshots.length > 0 && (
                  <button
                    onClick={() => rhzAutosave.clearSnapshots(activeWorkspace.id)}
                    className="text-red-400 hover:underline"
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              {snapshots.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-[11px] space-y-1">
                  <History size={24} className="mx-auto opacity-30 text-emerald-400" />
                  <p>Tiada snapshot autosave direkodkan lagi.</p>
                  <p className="text-[9px] text-gray-600">Autosave akan merakam snapshot setiap 2 minit secara automatik.</p>
                </div>
              ) : (
                snapshots.map((snap, idx) => (
                  <div
                    key={snap.id}
                    className="p-2 rounded bg-black/60 border border-white/10 hover:border-emerald-500/40 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="font-bold text-white">{formatTime(snap.timestamp)}</span>
                        <span className={`px-1 py-0.2 rounded text-[8px] font-black uppercase ${
                          snap.trigger === 'auto_2min'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : snap.trigger === 'shortcut'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {snap.trigger === 'auto_2min' ? 'Auto 2-Min' : snap.trigger === 'shortcut' ? 'Ctrl+S' : 'Manual'}
                        </span>
                      </div>
                      <span className="text-gray-400 text-[9px]">{new Date(snap.timestamp).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>{snap.nodeCount} nod · {snap.linkCount} pautan</span>
                      
                      <div className="flex items-center gap-1">
                        {restoreConfirmId === snap.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRestore(snap)}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[9px] font-bold"
                            >
                              Pasti Pulihkan?
                            </button>
                            <button
                              onClick={() => setRestoreConfirmId(null)}
                              className="p-0.5 text-gray-400 hover:text-white"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRestoreConfirmId(snap.id)}
                            className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded text-[9px] font-bold transition-colors cursor-pointer"
                            title="Pulihkan canvas ke versi snapshot ini"
                          >
                            <RotateCcw size={10} /> Pulihkan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: INTERVAL & SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-3 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-300 font-bold block">
                  Pilih Selang Masa Autosave:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { min: 1, label: '1 Minit' },
                    { min: 2, label: '2 Minit (Lalai)', recommended: true },
                    { min: 5, label: '5 Minit' },
                    { min: 10, label: '10 Minit' }
                  ].map(opt => (
                    <button
                      key={opt.min}
                      onClick={() => rhzAutosave.setIntervalMinutes(opt.min)}
                      className={`p-2 rounded border text-left text-[10px] transition-all cursor-pointer ${
                        state.intervalMinutes === opt.min && state.enabled
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt.label}</span>
                        {state.intervalMinutes === opt.min && state.enabled && (
                          <Check size={11} className="text-emerald-400" />
                        )}
                      </div>
                      {opt.recommended && (
                        <div className="text-[8px] text-emerald-400/70 mt-0.5">Disyorkan untuk operasi OSINT</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Master Toggle */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                <div>
                  <div className="text-xs font-bold text-white">Status Autosave .RHZ</div>
                  <div className="text-[9px] text-gray-400">
                    {state.enabled ? `Aktif secara automatik (${state.intervalMinutes} min)` : 'Dimatikan'}
                  </div>
                </div>

                <button
                  onClick={() => rhzAutosave.toggleAutosave()}
                  className={`px-3 py-1.5 rounded text-xs font-black transition-all cursor-pointer ${
                    state.enabled
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {state.enabled ? 'AKTIF' : 'MATI'}
                </button>
              </div>

              {/* Notice */}
              <div className="p-2 rounded bg-amber-950/20 border border-amber-500/30 text-[9px] text-amber-300/80 flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Autosave menyimpan fail kerja .RHZ anda ke IndexedDB dan peti sandaran setiap 2 minit supaya hasil risikan anda kekal selamat walaupun pelayar tertutup secara tidak sengaja.
                </span>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="p-2 bg-black/80 border-t border-white/5 text-[9px] text-gray-500 flex items-center justify-between">
            <span>Red Horizon Case Vault v2.9.1</span>
            <span className="text-emerald-500 font-mono">Pintasan: Ctrl+S</span>
          </div>
        </div>
  );

  const renderHeaderInline = () => {
    if (isFloating) {
      return (
        <button 
          type="button"
          onClick={() => { setIsFloating(false); setFixedPos(null); setIsOpen(true); }}
          className="shrink-0 font-mono text-[10px] px-2 py-1 rounded border border-dashed border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:text-white hover:bg-emerald-950/60 cursor-pointer flex items-center gap-1 select-none transition-all"
          title="Klik untuk kembalikan butang ke bar navigasi atas"
        >
          <GripHorizontal size={10} className="text-emerald-400" />
          <span>.RHZ (Terapung)</span>
        </button>
      );
    }
    
    const isDraggingInline = !isFloating && fixedPos !== null && isDragging;
    return (
      <div className="relative shrink-0 font-mono text-xs select-none" style={{ opacity: isDraggingInline ? 0 : 1 }}>
        {renderHUDButton()}
        {isOpen && !isFloating && renderDropdownMenu()}
      </div>
    );
  };

  return (
    <>
      {renderHeaderInline()}

      {fixedPos && ReactDOM.createPortal(
        <div 
          style={{
            position: 'fixed',
            left: `${fixedPos.left}px`,
            top: `${fixedPos.top}px`,
            zIndex: 999999,
            touchAction: 'none',
            pointerEvents: isFloating ? 'auto' : 'none'
          }}
          className="font-mono text-xs select-none"
        >
          { (isFloating || isDragging) ? renderHUDButton() : null }
          {isOpen && isFloating && renderDropdownMenu()}
        </div>,
        document.body
      )}
    </>
  );
};
