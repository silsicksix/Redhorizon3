import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  HardDrive, Search, X, Database, FileText, Trash2, Maximize2, Minimize2, 
  FolderPlus, FilePlus, Loader2, Zap, AlertCircle, CheckCircle2, Clock, 
  Cpu, Link as LinkIcon, ShieldCheck, Activity, Brain, Network, Play, Pause,
  Layers, ArrowRight, Gauge, CheckSquare, Sparkles, Filter
} from 'lucide-react';
import { GraphData, Node, Link } from '../types';
import { useGlobalStore } from '../store/GlobalStore';
import { 
  HybridIngestionSession, 
  IngestionMode, 
  IngestionTelemetry, 
  IngestionSummary 
} from '../services/hybridIngestionService';

interface BigDataScannerProps {
  onClose: () => void;
  onImportMatches: (data: GraphData) => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
  initialQuery?: string;
  sourceNodeId?: string | null;
}

interface MatchResult {
  id: string;
  line: string;
  rawLine?: string;
  lineNumber: number;
  fileName: string;
}

export const BigDataScanner: React.FC<BigDataScannerProps> = ({ 
  onClose, 
  onImportMatches, 
  onLog, 
  initialQuery, 
  sourceNodeId 
}) => {
  const { state, dispatch, activeWs } = useGlobalStore();
  const [files, setFiles] = useState<File[]>(state.vaultFiles || []);
  const [query, setQuery] = useState(initialQuery || '');
  const [scanning, setScanning] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [liveFilter, setLiveFilter] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [autoExtract, setAutoExtract] = useState(true);
  const [enableOntologyTriples, setEnableOntologyTriples] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Ingestion Mode Selection
  const [ingestionMode, setIngestionMode] = useState<IngestionMode>('auto');

  // Live Extracted Nodes & Links Buffer
  const [extractedNodes, setExtractedNodes] = useState<Node[]>([]);
  const [extractedLinks, setExtractedLinks] = useState<Link[]>([]);
  const [liveStreamToCanvas, setLiveStreamToCanvas] = useState(false);

  // Live Telemetry HUD state
  const [telemetry, setTelemetry] = useState<IngestionTelemetry | null>(null);
  const [summaryReport, setSummaryReport] = useState<IngestionSummary | null>(null);
  const [activeEngineName, setActiveEngineName] = useState<string>('Standby');

  // File status map
  const [processingStatus, setProcessingStatus] = useState<Record<string, 'pending' | 'scanning' | 'done'>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const currentSessionRef = useRef<HybridIngestionSession | null>(null);

  const graphNodesLabels = useMemo(() => {
    if (!activeWs) return [];
    return activeWs.data.nodes.map(n => n.label).filter(l => l.length > 3);
  }, [activeWs]);

  useEffect(() => {
    dispatch({ type: 'SET_VAULT_FILES', payload: files });
    const newStatus: Record<string, 'pending' | 'scanning' | 'done'> = {};
    files.forEach(f => {
      newStatus[f.name] = processingStatus[f.name] || 'pending';
    });
    setProcessingStatus(newStatus);
  }, [files, dispatch]);

  useEffect(() => {
    if (initialQuery && files.length > 0 && !scanning) {
      runScan(initialQuery);
    }
  }, [initialQuery]);

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      if (currentSessionRef.current) {
        currentSessionRef.current.stop();
      }
    };
  }, []);

  const runScan = async (overrideQuery?: string) => {
    const activeQuery = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (files.length === 0) {
      onLog("The Vault: Sila masukkan sekurang-kurangnya satu fail sumber.", "warning");
      return;
    }

    setScanning(true);
    setMatches([]);
    setExtractedNodes([]);
    setExtractedLinks([]);
    setSelectedMatches(new Set());
    setSummaryReport(null);

    const initialStatus: Record<string, 'pending' | 'scanning' | 'done'> = {};
    files.forEach(f => initialStatus[f.name] = 'pending');
    setProcessingStatus(initialStatus);

    onLog(`The Vault: Memulakan pemprosesan hibrid [Mod: ${ingestionMode.toUpperCase()}]...`, 'info');

    // Process files sequentially with hybrid session
    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      const file = files[fIdx];
      setProcessingStatus(prev => ({ ...prev, [file.name]: 'scanning' }));

      const session = new HybridIngestionSession();
      currentSessionRef.current = session;

      try {
        await session.start(
          file,
          {
            mode: ingestionMode,
            query: activeQuery,
            useRegex,
            enableOntology: enableOntologyTriples,
            autoExtract,
            chunkSizeBytes: file.size > 200 * 1024 * 1024 ? 15 * 1024 * 1024 : 8 * 1024 * 1024,
            maxMatchesToRetain: 2000
          },
          {
            onTelemetry: (t) => {
              setTelemetry(t);
              setActiveEngineName(t.activeEngine);
            },
            onBatch: (newMatches, newNodes, newLinks) => {
              if (newMatches.length > 0) {
                setMatches(prev => {
                  const combined = [...prev, ...newMatches];
                  return combined.slice(0, 1500); // UI performance guard
                });
              }

              if (newNodes.length > 0) {
                setExtractedNodes(prev => {
                  const map = new Map<string, Node>();
                  prev.forEach(n => map.set(n.id, n));
                  newNodes.forEach(n => map.set(n.id, n));
                  return Array.from(map.values()).slice(0, 1000);
                });
              }

              if (newLinks.length > 0) {
                setExtractedLinks(prev => {
                  const map = new Map<string, Link>();
                  prev.forEach(l => map.set(`${l.source}->${l.target}->${l.label}`, l));
                  newLinks.forEach(l => map.set(`${l.source}->${l.target}->${l.label}`, l));
                  return Array.from(map.values()).slice(0, 1500);
                });
              }

              // If user toggled live stream to canvas
              if (liveStreamToCanvas && (newNodes.length > 0 || newLinks.length > 0)) {
                onImportMatches({
                  nodes: newNodes,
                  links: newLinks
                });
              }
            },
            onComplete: (summary) => {
              setSummaryReport(summary);
              setProcessingStatus(prev => ({ ...prev, [file.name]: 'done' }));
              onLog(`The Vault: [${file.name}] Selesai diproses! ${summary.totalRows.toLocaleString()} baris diimbas, ${summary.totalMatches} padanan, ${summary.totalEntities} entiti ontologi.`, 'success');
            },
            onError: (err) => {
              onLog(`The Vault: Ralat fail ${file.name} - ${err}`, 'error');
              setProcessingStatus(prev => ({ ...prev, [file.name]: 'done' }));
            }
          }
        );
      } catch (err: any) {
        onLog(`The Vault: Ralat sesi pemprosesan: ${err.message}`, 'error');
      }
    }

    setScanning(false);
    currentSessionRef.current = null;
  };

  const stopScan = () => {
    if (currentSessionRef.current) {
      currentSessionRef.current.stop();
      currentSessionRef.current = null;
    }
    setScanning(false);
    onLog("The Vault: Imbasan dihentikan oleh pengguna.", "warning");
  };

  const handleImport = () => {
    const itemsToImport = selectedMatches.size > 0 
      ? matches.filter(m => selectedMatches.has(m.id))
      : filteredMatches;

    if (itemsToImport.length === 0 && extractedNodes.length === 0) {
      onLog("The Vault: Tiada rekod atau entiti untuk di-import.", "warning");
      return;
    }

    const newNodes: Node[] = [];
    const newLinks: Link[] = [];

    // 1. Add records from matching lines
    itemsToImport.forEach((m, i) => {
      const parts = m.line.split(/[|,;\t:]/);
      const rootId = `vault_rec_${Date.now()}_${i}`;
      
      newNodes.push({
        id: rootId,
        label: parts[0]?.trim().substring(0, 50) || `Rekod ${m.lineNumber}`,
        type: 'breach',
        details: `SUMBER: ${m.fileName}\nBARIS: ${m.lineNumber}\nDATA RAW: ${m.rawLine || m.line}`,
        vaultMatch: true,
        vaultSource: m.fileName
      });

      if (sourceNodeId) {
        newLinks.push({ source: sourceNodeId, target: rootId, label: 'db_match', isVault: true });
      }
    });

    // 2. Include all extracted ontology nodes & links
    if (autoExtract || enableOntologyTriples) {
      extractedNodes.forEach(node => {
        if (!newNodes.some(n => n.id === node.id)) {
          newNodes.push(node);
        }
      });
      extractedLinks.forEach(link => {
        if (!newLinks.some(l => l.source === link.source && l.target === link.target && l.label === link.label)) {
          newLinks.push(link);
        }
      });
    }

    onImportMatches({ nodes: newNodes, links: newLinks });
    onLog(`The Vault: Berjaya memindahkan ${newNodes.length} nod dan ${newLinks.length} pautan ke Kanvas Graf.`, 'success');
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      onLog(`The Vault: ${newFiles.length} fail ditambah.`, 'info');
    }
  };

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  const toggleSelection = (id: string) => {
    setSelectedMatches(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredMatches = matches.filter(m => 
    liveFilter ? m.line.toLowerCase().includes(liveFilter.toLowerCase()) : true
  );

  const isAllFilteredSelected = filteredMatches.length > 0 && filteredMatches.every(m => selectedMatches.has(m.id));

  const toggleAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedMatches(prev => {
        const next = new Set(prev);
        filteredMatches.forEach(m => next.delete(m.id));
        return next;
      });
    } else {
      setSelectedMatches(prev => {
        const next = new Set(prev);
        filteredMatches.forEach(m => next.add(m.id));
        return next;
      });
    }
  };

  // Group extracted entities by category for summary chips
  const entityBreakdown = useMemo(() => {
    let nricCount = 0;
    let phoneCount = 0;
    let emailCount = 0;
    let ipCount = 0;
    let cryptoCount = 0;

    extractedNodes.forEach(n => {
      if (n.type === 'person' && n.label.includes('-')) nricCount++;
      else if (n.type === 'phone') phoneCount++;
      else if (n.type === 'email') emailCount++;
      else if (n.type === 'ip_address') ipCount++;
      else if (n.type === 'crypto_wallet') cryptoCount++;
    });

    return { nricCount, phoneCount, emailCount, ipCount, cryptoCount };
  }, [extractedNodes]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-[#050505] border border-purple-600 p-3 flex items-center gap-4 rounded shadow-[0_0_25px_rgba(147,51,234,0.4)] animate-in slide-in-from-left-5">
        <HardDrive className={`text-purple-400 ${scanning ? 'animate-pulse' : ''}`} size={20} />
        <div className="flex flex-col">
          <div className="text-[10px] text-white font-black uppercase tracking-widest flex items-center gap-1.5">
            The Vault // Hybrid Ingestion
            {scanning && <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />}
          </div>
          <div className="text-[8px] text-purple-400 font-bold mt-1 uppercase">
            {scanning 
              ? `Scanning... ${telemetry?.percent || 0}% (${telemetry?.speedRowsPerSec?.toLocaleString() || 0} rows/s)` 
              : `${files.length} Fail Sumber | ${matches.length} Padanan`}
          </div>
        </div>
        <button onClick={() => setIsMinimized(false)} className="text-purple-400 hover:text-white transition-colors">
          <Maximize2 size={16}/>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl bg-[#07060a] border-2 border-purple-600/90 shadow-[0_0_50px_rgba(147,51,234,0.3)] font-mono flex flex-col max-h-[94vh] overflow-hidden rounded-md">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-purple-600/50 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-black">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-950/60 border border-purple-500/40 rounded">
              <HardDrive className="text-purple-400" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">
                  The Vault // Hybrid Big Data & Leak Streamer
                </h2>
                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-purple-900/60 border border-purple-500/50 text-purple-200">
                  {activeEngineName}
                </span>
              </div>
              <p className="text-[8px] text-purple-400 font-bold tracking-[0.25em] mt-0.5 uppercase">
                High-Capacity Memory Safe Ingestion (Chunk Stream + Dedicated Web Worker)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMinimized(true)} 
              className="text-purple-400 p-2 hover:bg-white/10 rounded transition-all"
              title="Kecilkan ke Dock"
            >
              <Minimize2 size={18}/>
            </button>
            <button 
              onClick={() => { stopScan(); onClose(); }} 
              className="text-purple-400 p-2 hover:bg-white/10 rounded transition-all"
              title="Tutup"
            >
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* CONTROLS & ENGINE SELECTOR */}
        <div className="p-4 bg-purple-950/15 border-b border-purple-900/40 flex flex-col gap-3">
          
          {/* Top Bar: Engine Mode Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-black/60 border border-purple-900/50 p-2 rounded">
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
              <Cpu size={14} className="text-purple-400" />
              <span>PILIH ENJIN PEMPROSESAN:</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIngestionMode('auto')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded transition-all flex items-center gap-1.5 ${
                  ingestionMode === 'auto'
                    ? 'bg-purple-600 text-black shadow-[0_0_12px_rgba(147,51,234,0.6)] font-bold'
                    : 'bg-black border border-purple-900/60 text-gray-400 hover:text-white'
                }`}
                title="Sistem mengesan saiz fail secara automatik (<50MB Chunk Stream, >=50MB Web Worker)"
              >
                <Sparkles size={11} /> Auto-Detect (Pintar)
              </button>

              <button
                type="button"
                onClick={() => setIngestionMode('chunk_stream')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded transition-all flex items-center gap-1.5 ${
                  ingestionMode === 'chunk_stream'
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)] font-bold'
                    : 'bg-black border border-cyan-900/40 text-gray-400 hover:text-white'
                }`}
                title="Pilihan 2: Aliran Chunk Progresif baris demi baris di UI thread"
              >
                <Zap size={11} /> Chunk Stream (Progresif)
              </button>

              <button
                type="button"
                onClick={() => setIngestionMode('web_worker')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded transition-all flex items-center gap-1.5 ${
                  ingestionMode === 'web_worker'
                    ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.6)] font-bold'
                    : 'bg-black border border-emerald-900/40 text-gray-400 hover:text-white'
                }`}
                title="Pilihan 3: Dedicated Web Worker di thread CPU berasingan (Sifar lag, perlindungan RAM mutlak)"
              >
                <ShieldCheck size={11} /> Dedicated Web Worker (Background)
              </button>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/60" size={18} />
              <input 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && runScan()} 
                className="w-full bg-black border-2 border-purple-900/50 text-white text-sm py-3 pl-11 pr-4 outline-none focus:border-purple-500 font-mono placeholder-gray-600 rounded" 
                placeholder={useRegex ? "Corak Regex (cth: Ahmad.*Abdullah | 01[0-9]{8,9})..." : "Masukkan sasaran carian (Nama, MyKad, No Tel, Akaun, Emel)... atau biarkan kosong untuk ingest semua"}
              />
            </div>

            {/* Checkbox Options */}
            <div className="flex bg-black border-2 border-purple-900/50 divide-x divide-purple-900/50 items-center px-1 rounded h-[46px]">
              <label className="flex items-center gap-1.5 px-3 cursor-pointer text-[10px] font-bold text-gray-300 hover:text-white select-none">
                <input 
                  type="checkbox" 
                  checked={useRegex} 
                  onChange={(e) => setUseRegex(e.target.checked)} 
                  className="accent-purple-500 w-3.5 h-3.5" 
                />
                REGEX
              </label>

              <label className="flex items-center gap-1.5 px-3 cursor-pointer text-[10px] font-bold text-gray-300 hover:text-white select-none">
                <input 
                  type="checkbox" 
                  checked={autoExtract} 
                  onChange={(e) => setAutoExtract(e.target.checked)} 
                  className="accent-purple-500 w-3.5 h-3.5" 
                />
                <Cpu size={12} className="text-purple-400" />
                EKSTRAK ENTITI
              </label>

              <label className="flex items-center gap-1.5 px-3 cursor-pointer text-[10px] font-bold text-cyan-300 hover:text-white select-none" title="Membina hubungan bermakna (Person -> Uses_Phone, Owns_Account, dll) mengikut ontologi RedHorizon">
                <input 
                  type="checkbox" 
                  checked={enableOntologyTriples} 
                  onChange={(e) => setEnableOntologyTriples(e.target.checked)} 
                  className="accent-cyan-400 w-3.5 h-3.5" 
                />
                <Brain size={12} className="text-cyan-400" />
                ONTOLOGI TRIPLES
              </label>

              <label className="flex items-center gap-1.5 px-3 cursor-pointer text-[10px] font-bold text-yellow-300 hover:text-white select-none" title="Pancarkan nod baharu terus ke kanvas graf secara progresif semasa fail sedang diimbas">
                <input 
                  type="checkbox" 
                  checked={liveStreamToCanvas} 
                  onChange={(e) => setLiveStreamToCanvas(e.target.checked)} 
                  className="accent-yellow-400 w-3.5 h-3.5" 
                />
                <Activity size={12} className="text-yellow-400" />
                LIVE TO CANVAS
              </label>
            </div>

            {/* Scan / Abort Button */}
            {scanning ? (
              <button 
                onClick={stopScan}
                className="px-6 bg-red-600 text-white font-black uppercase text-xs hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 min-w-[130px] h-[46px] rounded"
              >
                <Pause size={16} /> Henti
              </button>
            ) : (
              <button 
                onClick={() => runScan()} 
                disabled={files.length === 0}
                className="px-6 bg-purple-600 text-black font-black uppercase text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(147,51,234,0.5)] flex items-center justify-center gap-2 disabled:opacity-30 min-w-[130px] h-[46px] rounded"
              >
                <Zap size={16} /> Imbas Vault
              </button>
            )}
          </div>

          {/* Source Volume Buttons & Live Telemetry HUD Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] pt-1">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex items-center gap-1.5 font-bold text-gray-300 hover:text-white uppercase tracking-wider bg-white/5 px-2.5 py-1 border border-white/10 rounded hover:border-purple-500 transition-all"
              >
                <FilePlus size={13} className="text-purple-400" /> Tambah Fail
              </button>
              <button 
                onClick={() => folderInputRef.current?.click()} 
                className="flex items-center gap-1.5 font-bold text-gray-300 hover:text-white uppercase tracking-wider bg-white/5 px-2.5 py-1 border border-white/10 rounded hover:border-purple-500 transition-all"
              >
                <FolderPlus size={13} className="text-purple-400" /> Ingest Folder
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
              <input ref={folderInputRef} type="file" {...{ webkitdirectory: "", directory: "" } as any} className="hidden" onChange={handleFileUpload} />
              
              <span className="text-gray-500">|</span>
              <span className="text-gray-400 font-bold">{files.length} Fail Dimuat</span>
            </div>

            {/* Live Metrics Gauge */}
            {telemetry && (
              <div className="flex items-center gap-3 bg-black/80 border border-purple-900/60 px-3 py-1 rounded">
                <div className="flex items-center gap-1 text-cyan-400 font-bold">
                  <Gauge size={12} />
                  <span>{telemetry.speedRowsPerSec.toLocaleString()} rows/s</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <ShieldCheck size={12} />
                  <span>RAM: ~{telemetry.memoryEstimateMb}MB (SAFE)</span>
                </div>
                <div className="flex items-center gap-1 text-purple-300 font-bold">
                  <Layers size={12} />
                  <span>Baris: {telemetry.rowsProcessed.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-yellow-400 font-bold">
                  <Brain size={12} />
                  <span>{extractedNodes.length} Entiti Ontologi</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar with Scanline */}
          {scanning && telemetry && (
            <div className="w-full bg-black/80 border border-purple-900/60 h-2 rounded overflow-hidden relative">
              <div 
                className="bg-gradient-to-r from-purple-600 via-cyan-400 to-emerald-400 h-full transition-all duration-200"
                style={{ width: `${telemetry.percent}%` }}
              />
            </div>
          )}
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: File Sources & Ontological Counters */}
          <div className="w-80 border-r border-purple-900/30 flex flex-col bg-black/50 shrink-0">
            <div className="p-2.5 border-b border-purple-900/30 bg-purple-950/20 text-[9px] font-black text-purple-300 uppercase tracking-widest flex justify-between items-center">
              <span>Fail Sumber Vault</span>
              <span className="text-gray-500 font-normal">{files.length} fail</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
              {files.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-gray-500 gap-2 p-4 text-center">
                  <HardDrive size={32} />
                  <p className="text-[10px] uppercase font-bold">Belum ada fail sumber dimuatkan.</p>
                  <p className="text-[8px] text-gray-500">Klik "Tambah Fail" atau drag & drop fail CSV, TSV, TXT, Log ke sini.</p>
                </div>
              ) : (
                files.map((f, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-2 border transition-all rounded ${
                      processingStatus[f.name] === 'scanning' 
                        ? 'bg-purple-900/30 border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.3)]' 
                        : processingStatus[f.name] === 'done'
                        ? 'bg-emerald-950/10 border-emerald-900/40 text-gray-300'
                        : 'bg-black/60 border-white/5 hover:border-purple-500/30 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {processingStatus[f.name] === 'done' ? (
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      ) : processingStatus[f.name] === 'scanning' ? (
                        <Loader2 size={12} className="text-purple-400 animate-spin shrink-0" />
                      ) : (
                        <Clock size={12} className="text-gray-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-[10px] truncate uppercase font-bold text-gray-200">
                          {f.name}
                        </div>
                        <div className="text-[8px] text-gray-500">
                          {(f.size / (1024 * 1024)).toFixed(1)} MB
                        </div>
                      </div>
                    </div>
                    {!scanning && (
                      <button 
                        onClick={() => removeFile(f.name)} 
                        className="opacity-40 hover:opacity-100 text-red-400 hover:text-red-300 p-1"
                        title="Buang fail"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Ontological Extracted Chips Summary */}
            {extractedNodes.length > 0 && (
              <div className="p-3 border-t border-purple-900/30 bg-purple-950/20 flex flex-col gap-1.5">
                <div className="text-[9px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                  <Brain size={12} /> Entiti Ontologi Dikesan:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[8px] font-bold">
                  <div className="bg-black/80 border border-cyan-900/50 p-1.5 rounded flex justify-between">
                    <span className="text-gray-400">MyKad NRIC:</span>
                    <span className="text-cyan-400 font-mono">{entityBreakdown.nricCount}</span>
                  </div>
                  <div className="bg-black/80 border border-green-900/50 p-1.5 rounded flex justify-between">
                    <span className="text-gray-400">No Tel:</span>
                    <span className="text-green-400 font-mono">{entityBreakdown.phoneCount}</span>
                  </div>
                  <div className="bg-black/80 border border-yellow-900/50 p-1.5 rounded flex justify-between">
                    <span className="text-gray-400">Emel:</span>
                    <span className="text-yellow-400 font-mono">{entityBreakdown.emailCount}</span>
                  </div>
                  <div className="bg-black/80 border border-purple-900/50 p-1.5 rounded flex justify-between">
                    <span className="text-gray-400">IP Awam:</span>
                    <span className="text-purple-400 font-mono">{entityBreakdown.ipCount}</span>
                  </div>
                  <div className="bg-black/80 border border-orange-900/50 p-1.5 rounded flex justify-between col-span-2">
                    <span className="text-gray-400">Crypto / Triples:</span>
                    <span className="text-orange-400 font-mono">{entityBreakdown.cryptoCount} / {extractedLinks.length} Triples</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Results Dashboard & Actions */}
          <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
            
            {/* Results Filter Toolbar */}
            <div className="p-2.5 border-b border-purple-900/30 bg-purple-950/20 flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span>Hasil Carian & Padanan Data</span>
                <span className="bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded text-[8px] font-mono">
                  {matches.length} baris
                </span>
                {extractedNodes.length > 0 && (
                  <span className="bg-cyan-900/40 text-cyan-300 px-2 py-0.5 rounded text-[8px] font-mono">
                    {extractedNodes.length} nod ontologi
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {matches.length > 0 && (
                  <>
                    <div className="flex items-center gap-1 bg-black border border-purple-900/60 px-2 py-0.5 rounded">
                      <Filter size={10} className="text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="Tapis paparan..." 
                        value={liveFilter}
                        onChange={(e) => setLiveFilter(e.target.value)}
                        className="bg-transparent text-white outline-none text-[9px] w-28 focus:w-40 transition-all font-mono"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white select-none">
                      <input 
                        type="checkbox" 
                        checked={isAllFilteredSelected} 
                        onChange={toggleAllFiltered} 
                        className="accent-purple-500 w-3 h-3" 
                      />
                      Pilih Semua
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Matches List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {filteredMatches.length === 0 && !scanning && (
                <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-40 gap-3">
                  <Search size={48} className="text-purple-600/40" />
                  <p className="text-xs uppercase font-bold">Tiada padanan ditemui.</p>
                  <p className="text-[10px] text-gray-500 max-w-sm text-center">
                    Gunakan borang carian di atas atau pilih "Imbas Vault" untuk mengekstrak entiti ontologi secara streaming.
                  </p>
                </div>
              )}

              {filteredMatches.map((m) => {
                const isSelected = selectedMatches.has(m.id);
                const foundInGraph = graphNodesLabels.filter(label => m.line.toLowerCase().includes(label.toLowerCase()));

                return (
                  <div 
                    key={m.id} 
                    onClick={() => toggleSelection(m.id)}
                    className={`bg-[#0a0910] border cursor-pointer p-2.5 transition-all relative overflow-hidden group flex gap-3 items-start rounded ${
                      isSelected ? 'border-purple-500 bg-purple-950/20' : 'border-gray-800 hover:border-purple-600/50'
                    }`}
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full ${isSelected ? 'bg-purple-500' : 'bg-transparent group-hover:bg-purple-600/40'}`} />
                    
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      readOnly 
                      className="mt-0.5 accent-purple-500 w-3.5 h-3.5 cursor-pointer"
                    />
                        
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-purple-400">
                          <FileText size={10} /> {m.fileName}
                        </span>
                        <span className="text-gray-600">::</span>
                        <span>Baris {m.lineNumber}</span>
                        {foundInGraph.length > 0 && (
                          <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.2 rounded flex items-center gap-1 border border-yellow-500/30 text-[8px]">
                            <LinkIcon size={9} /> {foundInGraph.length} Entiti Padan dalam Kanvas!
                          </span>
                        )}
                      </div>
                      <div className={`text-[10.5px] font-mono leading-relaxed break-all ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {m.line}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Ingest Action Bar */}
            <div className="p-3 border-t border-purple-900/40 bg-purple-950/20 flex items-center justify-between gap-3">
              <div className="text-[9px] text-gray-400 font-mono">
                {selectedMatches.size > 0 
                  ? `${selectedMatches.size} rekod dipilih` 
                  : `${filteredMatches.length} rekod sedia`} 
                {extractedNodes.length > 0 && ` + ${extractedNodes.length} nod ontologi`}
              </div>

              <button 
                onClick={handleImport} 
                disabled={filteredMatches.length === 0 && extractedNodes.length === 0} 
                className="bg-purple-600 text-black px-6 py-2.5 font-black uppercase text-xs tracking-wider hover:bg-white disabled:opacity-20 transition-all flex items-center gap-2 rounded shadow-[0_0_20px_rgba(147,51,234,0.4)]"
              >
                <Database size={14} /> Pindahkan ke Kanvas Graf ({selectedMatches.size > 0 ? selectedMatches.size : filteredMatches.length} Rekod)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BigDataScanner;
