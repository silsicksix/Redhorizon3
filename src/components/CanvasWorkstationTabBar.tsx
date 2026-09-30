import React, { useState, useEffect, useRef } from 'react';
import { Workspace } from '../types';
import { 
  Plus, X, Edit2, Check, Copy, Trash2, Layers, 
  ExternalLink, ArrowRight, Shield, Sparkles, ChevronDown, 
  Lock, AlertTriangle, Monitor, Share2, MoveRight
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CanvasWorkstationTabBarProps {
  workspaces: Workspace[];
  activeWsId: string;
  onSwitchWorkspace: (id: string) => void;
  onCreateWorkspace: (name?: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDuplicateWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onClearWorkspace?: () => void;
  selectedNodesCount?: number;
  onTransferSelectedNodes?: (targetWsId: string, deleteFromSource?: boolean) => void;
  maxWorkspaces?: number;
}

export const CanvasWorkstationTabBar: React.FC<CanvasWorkstationTabBarProps> = ({
  workspaces,
  activeWsId,
  onSwitchWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onClearWorkspace,
  selectedNodesCount = 0,
  onTransferSelectedNodes,
  maxWorkspaces = 3
}) => {
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const [menuOpenWsId, setMenuOpenWsId] = useState<string | null>(null);
  const [transferMenuOpen, setTransferMenuOpen] = useState(false);
  const [showMaxTooltip, setShowMaxTooltip] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeWsIndex = workspaces.findIndex(w => w.id === activeWsId);
  const isAtMax = workspaces.length >= maxWorkspaces;

  // Keyboard shortcuts: Alt+1, Alt+2, Alt+3 to switch, Alt+N for new canvas, Alt+W to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing when typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.altKey) {
        if (e.key === '1' && workspaces[0]) {
          e.preventDefault();
          onSwitchWorkspace(workspaces[0].id);
        } else if (e.key === '2' && workspaces[1]) {
          e.preventDefault();
          onSwitchWorkspace(workspaces[1].id);
        } else if (e.key === '3' && workspaces[2]) {
          e.preventDefault();
          onSwitchWorkspace(workspaces[2].id);
        } else if ((e.key === 'n' || e.key === 'N') && !isAtMax) {
          e.preventDefault();
          onCreateWorkspace();
        } else if ((e.key === 'w' || e.key === 'W') && workspaces.length > 1) {
          e.preventDefault();
          setConfirmCloseId(activeWsId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspaces, activeWsId, isAtMax, onSwitchWorkspace, onCreateWorkspace]);

  // Click outside listener to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        setMenuOpenWsId(null);
        setTransferMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = (ws: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWsId(ws.id);
    setEditingName(ws.name);
    setMenuOpenWsId(null);
  };

  const handleSaveRename = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editingName.trim()) {
      onRenameWorkspace(id, editingName.trim().toUpperCase());
    }
    setEditingWsId(null);
  };

  const handleCreateNew = () => {
    if (isAtMax) {
      setShowMaxTooltip(true);
      setTimeout(() => setShowMaxTooltip(false), 3000);
      return;
    }
    const nextNumber = workspaces.length + 1;
    const defaultName = `CANVAS_${nextNumber}_INVESTIGATION`;
    onCreateWorkspace(defaultName);
  };

  return (
    <div className="w-full bg-[#08080c]/90 border-b border-white/10 px-2 py-0.5 flex items-center justify-between gap-1.5 select-none relative z-[45] backdrop-blur-md min-h-[28px]">
      {/* Left: Maltego Canvas Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar flex-1 min-w-0 py-0">
        {/* Brand/Label Pill */}
        <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-black/60 border border-white/10 rounded text-[9px] font-mono font-bold text-gray-400 shrink-0 uppercase tracking-wider">
          <Layers size={10} className="text-cyan-400" />
          <span>CANVAS</span>
          <span className="text-cyan-300 bg-cyan-950/80 px-1 py-0 rounded border border-cyan-500/30 text-[8px]">
            {workspaces.length}/{maxWorkspaces}
          </span>
        </div>

        {/* Tab Items */}
        {workspaces.map((ws, idx) => {
          const isActive = ws.id === activeWsId;
          const nodeCount = ws.data?.nodes?.length || 0;
          const linkCount = ws.data?.links?.length || 0;
          const isEditing = editingWsId === ws.id;

          return (
            <div
              key={ws.id}
              onClick={() => {
                if (!isActive) onSwitchWorkspace(ws.id);
              }}
              onDoubleClick={(e) => handleStartRename(ws, e)}
              className={`group relative flex items-center gap-1.5 px-2 py-0.5 rounded transition-all cursor-pointer font-mono text-xs border shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-cyan-950/90 border-cyan-500/80 text-white shadow-[0_0_8px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/30'
                  : 'bg-black/40 border-white/5 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/20'
              }`}
              title={`Canvas ${idx + 1}: ${ws.name} (Klik untuk aktifkan, Dwi-klik untuk tukar nama, Alt+${idx + 1})`}
            >
              {/* Active Tab Indicator Bar */}
              {isActive && (
                <div className="absolute top-0 left-1.5 right-1.5 h-[1.5px] bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
              )}

              {/* Number Badge with Shortcut */}
              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
                isActive 
                  ? 'bg-cyan-500 text-black font-black' 
                  : 'bg-white/10 text-gray-400 group-hover:text-white'
              }`}>
                {idx + 1}
              </span>

              {/* Title / Inline Rename */}
              {isEditing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveRename(ws.id, e);
                  }}
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    onBlur={() => handleSaveRename(ws.id)}
                    className="bg-black border border-cyan-500 px-1 py-0 text-[10px] text-white uppercase outline-none rounded font-mono w-24 h-4"
                  />
                  <button
                    type="submit"
                    className="text-cyan-400 hover:text-white p-0.5"
                    title="Simpan Nama"
                  >
                    <Check size={10} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`font-bold uppercase tracking-wider text-[10px] truncate max-w-[100px] sm:max-w-[140px] ${
                    isActive ? 'text-cyan-300 font-semibold' : 'text-gray-300'
                  }`}>
                    {ws.name || `CANVAS_${idx + 1}`}
                  </span>
                  
                  {/* Entity Count Badge */}
                  <span className={`px-1 py-0 rounded text-[8.5px] font-medium border ${
                    isActive 
                      ? 'bg-cyan-900/50 border-cyan-500/40 text-cyan-200' 
                      : 'bg-black/60 border-white/10 text-gray-500'
                  }`}>
                    {nodeCount}
                  </span>
                </div>
              )}

              {/* Action Buttons: Rename, Close */}
              <div className="flex items-center gap-0.5 ml-0.5 opacity-60 group-hover:opacity-100">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={(e) => handleStartRename(ws, e)}
                    className="p-0.5 hover:text-cyan-400 text-gray-500 rounded transition-colors"
                    title="Tukar Nama Canvas"
                  >
                    <Edit2 size={9} />
                  </button>
                )}

                {/* Close Canvas Tab Button (Only when more than 1 canvas open) */}
                {workspaces.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (nodeCount > 1) {
                        setConfirmCloseId(ws.id);
                      } else {
                        onDeleteWorkspace(ws.id);
                      }
                    }}
                    className="p-0.5 hover:text-red-400 text-gray-500 hover:bg-red-950/50 rounded transition-colors"
                    title={`Tutup Canvas ${idx + 1} (${ws.name})`}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Canvas Button / Max Limit Indicator */}
        {!isAtMax ? (
          <Tooltip
            title="Tambah Ruang Kerja Kanvas (New Canvas)"
            tutorial="Buka helaian kanvas siasatan baharu (sehingga 3 serentak) untuk membina hipotesis alternatif tanpa mengganggu siasatan utama."
            shortcut="Alt + N"
            category="MULTI-KANVAS"
            accentColor="emerald"
            position="bottom"
          >
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 hover:text-white rounded transition-all text-[10px] font-mono font-bold shrink-0 cursor-pointer group"
            >
              <Plus size={11} className="text-emerald-400 group-hover:rotate-90 transition-transform" />
              <span className="uppercase tracking-wider">Canvas Baru</span>
            </button>
          </Tooltip>
        ) : (
          <div 
            className="relative flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900/60 border border-amber-500/30 text-amber-400/90 rounded text-[9px] font-mono shrink-0 cursor-help"
            title="Maksimum 3 Canvas Workstation telah dicapai. Tutup salah satu canvas jika ingin menambah ruang kerja baru."
            onClick={() => setShowMaxTooltip(!showMaxTooltip)}
          >
            <Lock size={9} className="text-amber-400" />
            <span>3/3 MAKS</span>
          </div>
        )}
      </div>

      {/* Right: Quick Multi-Canvas Utility */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Cross-Canvas Transfer Pill */}
        {selectedNodesCount > 0 && workspaces.length > 1 && onTransferSelectedNodes && (
          <div className="relative" ref={menuRef}>
            <Tooltip
              title="Pindahkan / Salin Nod ke Kanvas Lain"
              tutorial="Pindahkan atau salin entiti nod terpilih ke tab kanvas siasatan lain untuk pengasingan kluster data atau sub-siasatan."
              category="PEMINDAHAN DATA"
              accentColor="purple"
              position="bottom"
            >
              <button
                type="button"
                onClick={() => setTransferMenuOpen(!transferMenuOpen)}
                className="flex items-center gap-1 px-2 py-0.5 bg-purple-950/80 border border-purple-500/60 text-purple-200 text-[10px] font-mono font-bold rounded hover:border-purple-400 hover:text-white transition-all shadow-[0_0_8px_rgba(168,85,247,0.3)] animate-pulse cursor-pointer"
              >
                <MoveRight size={10} className="text-purple-400" />
                <span>HANTAR ({selectedNodesCount})</span>
                <ChevronDown size={9} />
              </button>
            </Tooltip>

            {transferMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-60 bg-[#0d0d14] border border-purple-500/50 rounded-lg shadow-2xl p-2 z-[9999] font-mono text-xs space-y-1 backdrop-blur-xl">
                <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider px-2 py-1 border-b border-white/10 flex items-center justify-between">
                  <span>Hantar ke Canvas Lain</span>
                  <span className="text-gray-400">{selectedNodesCount} nod</span>
                </div>
                {workspaces
                  .filter(w => w.id !== activeWsId)
                  .map((targetWs) => (
                    <div key={targetWs.id} className="flex flex-col gap-1 p-1.5 bg-black/40 hover:bg-purple-950/40 rounded border border-white/5 transition-colors">
                      <div className="flex items-center justify-between text-zinc-200 font-bold text-[11px]">
                        <span className="truncate max-w-[130px]">{targetWs.name}</span>
                        <span className="text-[9px] text-zinc-500">{targetWs.data?.nodes?.length || 0} nod</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onTransferSelectedNodes(targetWs.id, false);
                            setTransferMenuOpen(false);
                          }}
                          className="flex-1 py-0.5 px-1.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded text-[9px] font-bold border border-purple-500/40 transition-colors"
                        >
                          Salin
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onTransferSelectedNodes(targetWs.id, true);
                            setTransferMenuOpen(false);
                          }}
                          className="flex-1 py-0.5 px-1.5 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 rounded text-[9px] font-bold border border-indigo-500/40 transition-colors"
                        >
                          Pindah
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Duplicate Active Canvas to New Tab Button (if < 3) */}
        {!isAtMax && (
          <Tooltip
            title="Duplikasi Kanvas Semasa (Clone Canvas)"
            tutorial="Klon seluruh graf aktif bersama hubungan dan nota ke tab kanvas baharu untuk simulasi senario tanpa mengubah graf asal."
            category="DUPLIKASI"
            accentColor="cyan"
            position="bottom"
          >
            <button
              type="button"
              onClick={() => onDuplicateWorkspace(activeWsId)}
              className="hidden md:flex items-center gap-1 px-1.5 py-0.5 bg-black/50 border border-white/10 hover:border-cyan-500/40 text-gray-400 hover:text-cyan-300 rounded text-[9px] font-mono transition-all cursor-pointer"
            >
              <Copy size={9} />
              <span>Duplikasi</span>
            </button>
          </Tooltip>
        )}
      </div>

      {/* Max Canvas Limit Alert / Tooltip Modal */}
      {showMaxTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-zinc-950 border border-amber-500/80 rounded-lg p-3 shadow-2xl z-50 font-mono text-xs text-amber-300 max-w-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-white uppercase text-[11px]">Had 3 Canvas Workstation</div>
            <p className="text-[10px] text-zinc-300 leading-snug">
              Sistem mengekalkan had maksimum <strong>3 ruang kerja serentak</strong> untuk kestabilan memori dan prestasi rendering graf masa nyata. Sila tutup mana-mana canvas sedia ada untuk membuka ruang kerja baru.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setShowMaxTooltip(false)}
            className="text-zinc-400 hover:text-white p-1"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Confirmation Modal for Closing a Canvas with active nodes */}
      {confirmCloseId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0e0e16] border border-red-500/60 rounded-xl p-5 max-w-md w-full shadow-[0_0_30px_rgba(239,68,68,0.3)] font-mono space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400 border-b border-red-500/20 pb-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 animate-pulse" />
              <div className="font-bold text-sm uppercase text-white">Tutup Ruang Kerja Canvas?</div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Adakah anda pasti ingin menutup canvas{' '}
              <span className="text-cyan-400 font-bold uppercase">
                "{workspaces.find(w => w.id === confirmCloseId)?.name}"
              </span>
              ? Nod dan pautan dalam graf ini akan ditutup dari paparan aktif.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCloseId(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteWorkspace(confirmCloseId);
                  setConfirmCloseId(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_12px_rgba(239,68,68,0.5)] flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Ya, Tutup Canvas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
