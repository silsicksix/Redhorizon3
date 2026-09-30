import React, { useState, useRef } from 'react';
import { Workspace, CaseFile } from '../types';
import { 
  Briefcase, Plus, Trash2, X, Archive, Clock, Edit2, Check, Copy, 
  Download, Upload, Search, ShieldAlert, Network, FileText, 
  ExternalLink, Sparkles, AlertTriangle, RefreshCw
} from 'lucide-react';

interface CaseManagerProps {
  cases: Workspace[];
  activeCaseId: string;
  onSwitchCase: (id: string) => void;
  onCreateCase: (name: string) => void;
  onRenameCase: (id: string, newName: string) => void;
  onDuplicateCase: (id: string) => void;
  onDeleteCase: (id: string) => void;
  onExportCase: (ws: Workspace) => void;
  onImportCase: (caseFile: CaseFile) => void;
  onClose: () => void;
}

export const CaseManager: React.FC<CaseManagerProps> = ({
  cases,
  activeCaseId,
  onSwitchCase,
  onCreateCase,
  onRenameCase,
  onDuplicateCase,
  onDeleteCase,
  onExportCase,
  onImportCase,
  onClose
}) => {
  const [newCaseName, setNewCaseName] = useState('');
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeWorkspace = cases.find(c => c.id === activeCaseId) || cases[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCaseName.trim()) {
      onCreateCase(newCaseName.trim().toUpperCase());
      setNewCaseName('');
    }
  };

  const handleStartRename = (c: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCaseId(c.id);
    setEditingName(c.name);
  };

  const handleSaveRename = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editingName.trim()) {
      onRenameCase(id, editingName.trim().toUpperCase());
    }
    setEditingCaseId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          if (!text) return;
          const json = JSON.parse(text);

          let extractedNodes: any[] = [];
          let extractedLinks: any[] = [];
          let caseName = file.name.replace(/\.(rhz|json)$/i, '');
          let synthesisResult = json.synthesisResult || null;
          let strategyResult = json.strategyResult || null;

          if (Array.isArray(json)) {
            extractedNodes = json;
          } else if (json.graph && Array.isArray(json.graph.nodes)) {
            extractedNodes = json.graph.nodes;
            extractedLinks = json.graph.links || [];
            if (json.caseName) caseName = json.caseName;
          } else if (json.data && Array.isArray(json.data.nodes)) {
            extractedNodes = json.data.nodes;
            extractedLinks = json.data.links || [];
            if (json.caseName || json.name) caseName = json.caseName || json.name;
          } else if (Array.isArray(json.nodes)) {
            extractedNodes = json.nodes;
            extractedLinks = json.links || [];
            if (json.caseName || json.name) caseName = json.caseName || json.name;
          } else if (json.workspaces && Array.isArray(json.workspaces) && json.workspaces[0]?.data?.nodes) {
            const ws = json.workspaces[0];
            extractedNodes = ws.data.nodes;
            extractedLinks = ws.data.links || [];
            if (ws.name) caseName = ws.name;
            if (ws.synthesisResult) synthesisResult = ws.synthesisResult;
            if (ws.strategyResult) strategyResult = ws.strategyResult;
          }

          const sanitizedNodes = (extractedNodes || []).map((n, idx) => ({
            ...n,
            id: String(n.id || `node_${Date.now()}_${idx}`),
            label: String(n.label || n.name || n.title || `Entity #${idx + 1}`),
            type: String(n.type || 'person')
          }));

          const sanitizedLinks = (extractedLinks || []).map((l) => ({
            ...l,
            source: typeof l.source === 'object' ? l.source.id : String(l.source),
            target: typeof l.target === 'object' ? l.target.id : String(l.target),
            label: l.label ? String(l.label) : 'connected'
          }));

          const caseFile: CaseFile = {
            id: json.id || `case_${Date.now()}`,
            caseName: caseName,
            graph: { nodes: sanitizedNodes, links: sanitizedLinks },
            timestamp: json.timestamp || Date.now(),
            version: json.version || '2.9.1',
            synthesisResult,
            strategyResult
          };

          onImportCase(caseFile);
        } catch (err: any) {
          alert("Gagal membaca fail kes: " + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  const filteredCases = cases.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full text-gray-200 font-mono flex flex-col space-y-4">
      {/* Hidden File Input for .RHZ / .JSON Import */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept=".rhz,.json" 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      {/* TOP HUD: CURRENT ACTIVE MISSION SUMMARY */}
      {activeWorkspace && (
        <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-black to-emerald-950/20 border border-emerald-500/40 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded font-black bg-emerald-500 text-black animate-pulse">
                  MISI AKTIF (CURRENT MISSION)
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  ID: {activeWorkspace.id}
                </span>
              </div>
              <div className="text-base font-bold text-white tracking-wide mt-0.5 flex items-center gap-2">
                {activeWorkspace.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 border border-gray-800 rounded text-emerald-400">
              <Network size={12} />
              <span className="font-bold">{activeWorkspace.data?.nodes?.length || 0}</span>
              <span className="text-gray-500 text-[10px]">Entiti</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 border border-gray-800 rounded text-cyan-400">
              <Archive size={12} />
              <span className="font-bold">{activeWorkspace.data?.links?.length || 0}</span>
              <span className="text-gray-500 text-[10px]">Pautan</span>
            </div>
            {activeWorkspace.evidence && activeWorkspace.evidence.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 border border-gray-800 rounded text-amber-400">
                <FileText size={12} />
                <span className="font-bold">{activeWorkspace.evidence.length}</span>
                <span className="text-gray-500 text-[10px]">Bukti</span>
              </div>
            )}
            <button
              onClick={() => onExportCase(activeWorkspace)}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-black border border-emerald-500/50 rounded transition-all text-xs font-bold"
              title="Muat Turun Fail Kes (.RHZ)"
            >
              <Download size={12} /> Backup Kes
            </button>
          </div>
        </div>
      )}

      {/* CONTROLS: CREATE NEW MISSION & IMPORT CASE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <form onSubmit={handleCreate} className="md:col-span-2 flex gap-1.5">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={newCaseName}
              onChange={(e) => setNewCaseName(e.target.value)}
              disabled={cases.length >= 3}
              placeholder={cases.length >= 3 ? "MAKSIMUM 3 CANVAS DICAPAI (TUTUP SATU DAHULU)..." : "MASUKKAN KOD MISI / NAMA KES BAHARU..."}
              className="w-full bg-black/80 border border-gray-700 text-emerald-400 text-xs p-2.5 rounded outline-none focus:border-emerald-500 placeholder-gray-600 transition-colors uppercase font-mono disabled:opacity-50"
            />
          </div>
          <button 
            type="submit" 
            disabled={!newCaseName.trim() || cases.length >= 3}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-black font-black px-4 py-2.5 rounded transition-all uppercase text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            title={cases.length >= 3 ? "Maksimum 3 Canvas Workstation telah dibuka." : "Buka Canvas Misi Baru"}
          >
            <Plus size={15} /> {cases.length >= 3 ? "Maks 3 Canvas" : "Buka Misi"}
          </button>
        </form>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-cyan-500 text-cyan-400 font-bold px-3 py-2.5 rounded transition-all text-xs uppercase"
        >
          <Upload size={14} /> Import Fail Kes (.RHZ)
        </button>
      </div>

      {/* SEARCH AND CASE COUNT BAR */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-800/80">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tapis senarai misi kes..."
            className="w-full bg-black/60 border border-gray-800 text-xs pl-8 pr-2 py-1.5 rounded outline-none focus:border-gray-600 text-gray-300 placeholder-gray-600"
          />
        </div>
        <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
          <span>Jumlah Kes Disimpan:</span>
          <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded">{cases.length}</span>
        </div>
      </div>

      {/* WORKSPACE / CASE LIST */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredCases.length === 0 && (
          <div className="text-center text-gray-500 py-10 border border-dashed border-gray-800 rounded bg-black/40">
            Tiada misi atau kes yang sepadan dengan carian.
          </div>
        )}

        {filteredCases.map((c) => {
          const isActive = c.id === activeCaseId;
          const nodeCount = c.data?.nodes?.length || 0;
          const linkCount = c.data?.links?.length || 0;
          const evidenceCount = c.evidence?.length || 0;
          const isEditing = editingCaseId === c.id;
          const isDeleting = confirmDeleteId === c.id;

          return (
            <div 
              key={c.id} 
              onClick={() => {
                if (!isEditing && !isDeleting) {
                  onSwitchCase(c.id);
                }
              }}
              className={`
                p-3 rounded border transition-all relative group flex flex-col sm:flex-row sm:items-center justify-between gap-3
                ${isActive 
                  ? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30' 
                  : 'border-gray-800 bg-[#0d0d0d] hover:border-gray-600 hover:bg-[#121212]'}
                ${!isEditing ? 'cursor-pointer' : ''}
              `}
            >
              {/* LEFT: CASE INFO */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isActive ? (
                    <span className="text-[9px] font-black bg-emerald-600 text-black px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">
                      SEDANG DISIASAT
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-gray-500 bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded uppercase shrink-0">
                      ARKIB / KES
                    </span>
                  )}

                  {isEditing ? (
                    <form onSubmit={(e) => handleSaveRename(c.id, e)} className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="bg-black border border-emerald-500 text-emerald-400 text-xs px-2 py-0.5 rounded outline-none font-bold uppercase"
                        autoFocus
                      />
                      <button 
                        type="submit" 
                        className="p-1 bg-emerald-600 text-black rounded hover:bg-white"
                        title="Simpan Nama"
                      >
                        <Check size={12} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditingCaseId(null)}
                        className="p-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
                        title="Batal"
                      >
                        <X size={12} />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`font-bold text-sm uppercase tracking-wide truncate ${isActive ? 'text-emerald-300' : 'text-gray-200'}`}>
                        {c.name}
                      </span>
                      <button
                        onClick={(e) => handleStartRename(c, e)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-emerald-400 transition-opacity p-0.5"
                        title="Tukar Nama Kes"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* METRICS ROW */}
                <div className="text-[10px] text-gray-400 flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock size={11} className="text-gray-500" /> 
                    {new Date(c.timestamp || Date.now()).toLocaleDateString()} {new Date(c.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-gray-700">•</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Network size={11} /> {nodeCount} Entiti
                  </span>
                  <span className="text-gray-700">•</span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Archive size={11} /> {linkCount} Pautan
                  </span>
                  {evidenceCount > 0 && (
                    <>
                      <span className="text-gray-700">•</span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <FileText size={11} /> {evidenceCount} Bukti
                      </span>
                    </>
                  )}
                  {c.synthesisResult?.verdict && (
                    <>
                      <span className="text-gray-700">•</span>
                      <span className="px-1.5 py-0.2 bg-purple-950/60 border border-purple-800 text-purple-300 text-[9px] rounded font-bold">
                        {c.synthesisResult.verdict}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* RIGHT: ACTION BUTTONS */}
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {!isActive ? (
                  <button
                    onClick={() => {
                      onSwitchCase(c.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black border border-emerald-400 rounded transition-all text-xs font-black uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    title="Beralih & Buka Siasatan Ini"
                  >
                    Beralih & Buka
                  </button>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/50 px-2 py-0.5 rounded">
                    SEDANG DIBUKA
                  </span>
                )}

                <button
                  onClick={() => onDuplicateCase(c.id)}
                  className="p-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-cyan-400 border border-gray-800 rounded transition-all"
                  title="Salin / Duplikasi Misi Kes (Fork)"
                >
                  <Copy size={13} />
                </button>

                <button
                  onClick={() => onExportCase(c)}
                  className="p-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-emerald-400 border border-gray-800 rounded transition-all"
                  title="Muat Turun Fail .RHZ"
                >
                  <Download size={13} />
                </button>

                {isDeleting ? (
                  <div className="flex items-center gap-1 bg-red-950/80 border border-red-800 p-1 rounded">
                    <span className="text-[10px] text-red-300 px-1 font-bold">Padam?</span>
                    <button
                      onClick={() => {
                        onDeleteCase(c.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-black uppercase"
                    >
                      Ya
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px]"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(c.id)}
                    className="p-1.5 bg-gray-900 hover:bg-red-950/60 text-gray-500 hover:text-red-400 border border-gray-800 hover:border-red-800 rounded transition-all"
                    title="Padam Misi Kes"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER TIPS */}
      <div className="text-[11px] text-gray-500 bg-black/40 border border-gray-800/80 p-2.5 rounded flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-emerald-400" />
          <span>Setiap fail kes disimpan secara berasingan dengan data graf, nod, dan rumusan tersendiri.</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white px-3 py-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded text-xs transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};

export default CaseManager;
