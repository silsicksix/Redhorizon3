
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertTriangle, Cpu, Terminal, Clipboard, MessageSquareText, Save, FolderOpen, GitMerge, FileText, Lock, Unlock, Key, Info, FileQuestion, ArrowRight } from 'lucide-react';
import { LocalEntity, GraphData, CaseFile } from '../types';
import { parseRawIntelligence, analyzeTranscriptToGraph } from '../services/geminiService';
import { parseOfflineComments } from '../utils/offlineParser';
import { reportFileLoadProgress } from './FileLoadProgressHUD';
import * as XLSX from 'xlsx';

interface DataImportProps {
  onImport: (data: LocalEntity[]) => void;
  onRawImport?: (graph: GraphData) => void;
  onLoadCase?: (data: CaseFile, merge: boolean) => void;
  onSaveCase?: () => void;
  onClose: () => void;
}

const DataImport: React.FC<DataImportProps> = ({ onImport, onRawImport, onLoadCase, onSaveCase, onClose }) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'raw' | 'transcript' | 'case' | 'maltego'>('excel');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isMerge, setIsMerge] = useState(false); 
  
  const [needsPassword, setNeedsPassword] = useState(false);
  const [filePassword, setFilePassword] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [encryptionDetails, setEncryptionDetails] = useState<string>('');
  const [showManualHelp, setShowManualHelp] = useState(false);
  const [stripImages, setStripImages] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const caseInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleProcessRaw = async () => {
     if (!rawText.trim() || !onRawImport) return;
     setProcessing(true);
     setError(null);
     
     // 🚀 Intercept Red Horizon Data (bypass AI completely to preserve 100% of images and comments)
     if (activeTab === 'raw' && rawText.trim().startsWith('{') && rawText.includes('"comments"')) {
         try {
             const parsed = JSON.parse(rawText);
             if (parsed.source_url && parsed.comments) {
                 const graphData = parseOfflineComments(rawText);
                 onRawImport(graphData);
                 onClose();
                 return;
             }
         } catch (e) {
             // Fallback to standard flow if not valid JSON
         }
     }
     
     let textToProcess = rawText;
     if (stripImages) {
         try {
             // Parse JSON to safely strip out image arrays / properties without breaking the structure
             const parsedData = JSON.parse(rawText);
             const stripImageFields = (obj: any) => {
                 if (Array.isArray(obj)) {
                     for (let i = 0; i < obj.length; i++) {
                         if (typeof obj[i] === 'string' && obj[i].startsWith('http') && (obj[i].includes('fbcdn') || obj[i].includes('scontent') || obj[i].match(/\.(jpg|png|jpeg|gif|webp)/i))) {
                             obj[i] = "[IMG]";
                         } else if (typeof obj[i] === 'object' && obj[i] !== null) {
                             stripImageFields(obj[i]);
                         }
                     }
                 } else if (typeof obj === 'object' && obj !== null) {
                     for (const key in obj) {
                         if (key === 'avatar_url' || key === 'attached_images' || key === 'original_photo_links' || key === 'main_post_images') {
                             delete obj[key]; // Completely remove these keys to save maximum tokens
                         } else if (typeof obj[key] === 'string' && obj[key].startsWith('http') && (obj[key].includes('fbcdn') || obj[key].includes('scontent') || obj[key].match(/\.(jpg|png|jpeg|gif|webp)/i))) {
                             obj[key] = "[IMG]";
                         } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                             stripImageFields(obj[key]);
                         }
                     }
                 }
             };
             stripImageFields(parsedData);
             textToProcess = JSON.stringify(parsedData);
         } catch (e) {
             // Fallback for non-JSON text
             textToProcess = textToProcess.replace(/https?:\/\/[^"'\s,\]\}]*(fbcdn|scontent|external)[^"'\s,\]\}]*/gi, "");
             textToProcess = textToProcess.replace(/https?:\/\/[^"'\s,\]\}]*\.(jpg|jpeg|png|gif|webp)(\?[^"'\s]*)?/gi, "");
         }
     }
     
     try {
         let result = activeTab === 'transcript' ? await analyzeTranscriptToGraph(textToProcess) : await parseRawIntelligence(textToProcess);
         onRawImport(result.graph);
         onClose();
     } catch (e: any) { setError(`Parsing Failed: ${e.message}`); }
     finally { setProcessing(false); }
  };

  const loadTextFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => setRawText(e.target?.result as string);
      reader.readAsText(file);
  };

  const processCaseFile = (file: File) => {
      if (!onLoadCase) return;
      setProcessing(true);
      setError(null);

      reportFileLoadProgress({
        fileName: file.name,
        fileSize: file.size,
        progress: 15,
        stage: 'Membaca fail kes (.RHZ)...'
      });

      const reader = new FileReader();
      reader.onprogress = (pe) => {
        if (pe.lengthComputable) {
          const p = Math.round((pe.loaded / pe.total) * 35);
          reportFileLoadProgress({
            fileName: file.name,
            fileSize: file.size,
            progress: 15 + p,
            stage: `Membaca fail (${Math.round(pe.loaded / 1024)} KB)...`
          });
        }
      };

      reader.onload = (e) => {
          try {
              reportFileLoadProgress({
                fileName: file.name,
                fileSize: file.size,
                progress: 55,
                stage: 'Menyahkod struktur JSON & menapis entiti...'
              });

              const text = e.target?.result as string;
              if (!text) throw new Error("File is empty.");
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
              } else {
                  throw new Error("Invalid .RHZ / OSINT JSON structure. No entity nodes found.");
              }

              if (!extractedNodes || extractedNodes.length === 0) {
                  throw new Error("The file contains 0 valid entities.");
              }

              reportFileLoadProgress({
                fileName: file.name,
                fileSize: file.size,
                progress: 80,
                stage: `Menyusun ${extractedNodes.length} nod ke Canvas...`,
                totalEntities: extractedNodes.length
              });

              // Ensure every node has valid id, label, and type
              const sanitizedNodes = extractedNodes.map((n, idx) => ({
                  ...n,
                  id: String(n.id || `node_${Date.now()}_${idx}`),
                  label: String(n.label || n.name || n.title || `Entity #${idx + 1}`),
                  type: String(n.type || 'person')
              }));

              const sanitizedLinks = (extractedLinks || []).map((l, idx) => ({
                  ...l,
                  source: typeof l.source === 'object' ? l.source.id : String(l.source),
                  target: typeof l.target === 'object' ? l.target.id : String(l.target),
                  label: l.label ? String(l.label) : 'connected'
              }));

              const caseData: CaseFile = {
                  id: json.id || `case_${Date.now()}`,
                  caseName: caseName,
                  graph: {
                      nodes: sanitizedNodes,
                      links: sanitizedLinks
                  },
                  timestamp: json.timestamp || Date.now(),
                  version: json.version || '2.9.1',
                  synthesisResult: synthesisResult,
                  strategyResult: strategyResult
              };
              
              onLoadCase(caseData, isMerge);

              reportFileLoadProgress({
                fileName: file.name,
                fileSize: file.size,
                progress: 100,
                stage: `Selesai! ${sanitizedNodes.length} nod dibuka di Canvas.`,
                totalEntities: sanitizedNodes.length,
                isComplete: true
              });

              onClose();
          } catch (err: any) {
              setError("Failed to load case: " + err.message);
          } finally { setProcessing(false); }
      };
      reader.readAsText(file);
  };

  const processSpreadsheet = (file: File, password?: string) => {
    setError(null);
    if (file.name.toLowerCase().endsWith('.rhz') || file.name.toLowerCase().endsWith('.json')) {
        processCaseFile(file);
        return;
    }
    setProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        let workbook;
        try {
            workbook = XLSX.read(data, { type: 'array', password });
            setNeedsPassword(false);
        } catch (readError: any) {
            const msg = (readError.message || "").toLowerCase();
            if (msg.includes("password") || msg.includes("encrypted")) {
                setNeedsPassword(true);
                setPendingFile(file);
                if (password) setShowManualHelp(true);
                setProcessing(false);
                return;
            }
            throw readError;
        }

        if (!workbook) throw new Error("Workbook invalid.");
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!jsonData || jsonData.length < 2) throw new Error("No data rows found.");

        const headers = jsonData[0].map((h: any) => String(h).trim().toLowerCase());

        if (activeTab === 'maltego') {
            // Maltego CSV Import Logic
            const nodes: any[] = [];
            const links: any[] = [];
            const nodeMap = new Map();

            const sIdx = headers.findIndex(h => h === 'source');
            const stIdx = headers.findIndex(h => h === 'sourcetype');
            const tIdx = headers.findIndex(h => h === 'target');
            const ttIdx = headers.findIndex(h => h === 'targettype');
            const rIdx = headers.findIndex(h => h === 'relationship');
            const nIdx = headers.findIndex(h => h === 'notes');

            if (sIdx === -1) throw new Error("Invalid Maltego CSV: 'Source' column missing.");

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || !row[sIdx]) continue;

                const sourceLabel = String(row[sIdx]).trim();
                const sourceType = stIdx !== -1 && row[stIdx] ? String(row[stIdx]).trim() : 'person';
                const sourceId = `maltego_${sourceLabel.replace(/\s+/g, '_')}`;

                if (!nodeMap.has(sourceId)) {
                    const node = { id: sourceId, label: sourceLabel, type: sourceType, details: nIdx !== -1 ? String(row[nIdx] || '') : '' };
                    nodes.push(node);
                    nodeMap.set(sourceId, node);
                }

                const targetLabel = tIdx !== -1 && row[tIdx] ? String(row[tIdx]).trim() : null;
                if (targetLabel) {
                    const targetType = ttIdx !== -1 && row[ttIdx] ? String(row[ttIdx]).trim() : 'person';
                    const targetId = `maltego_${targetLabel.replace(/\s+/g, '_')}`;

                    if (!nodeMap.has(targetId)) {
                        const node = { id: targetId, label: targetLabel, type: targetType, details: '' };
                        nodes.push(node);
                        nodeMap.set(targetId, node);
                    }

                    links.push({
                        source: sourceId,
                        target: targetId,
                        label: rIdx !== -1 && row[rIdx] ? String(row[rIdx]).trim() : 'related_to'
                    });
                }
            }

            if (onRawImport) {
                onRawImport({ nodes, links });
                onClose();
            }
            return;
        }

        const entities: LocalEntity[] = [];
        const primaryIdx = headers.findIndex(h => ['name', 'nama', 'target', 'entity'].some(k => h.includes(k))) || 0;

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[primaryIdx]) continue;
            const label = String(row[primaryIdx]).trim();
            let details = "IMPORTED SPREADSHEET\n";
            row.forEach((cell, idx) => { if(cell && idx !== primaryIdx) details += `${headers[idx] || 'DATA'}: ${cell}\n`; });

            entities.push({ id: `xls_${Date.now()}_${i}`, label, type: 'person', details });
        }
        onImport(entities);
        onClose();
      } catch (err: any) { setError(err.message); }
      finally { setProcessing(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  // Added handleDrop to process dropped files in the Data Ingestion modal
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.rhz') || file.name.toLowerCase().endsWith('.json')) {
        processCaseFile(file);
      } else {
        processSpreadsheet(file);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80  p-4">
      <div className="w-full max-w-lg bg-[#0a0a0a] border-2 border-[#ff0033] text-[#ff0033] p-6 shadow-[0_0_30px_rgba(255,0,51,0.2)] font-mono relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="flex justify-between items-center mb-6 border-b border-[#ff0033]/50 pb-2">
          <h2 className="text-xl font-bold uppercase flex items-center gap-2">
            <Cpu /> Data Ingestion
          </h2>
          <button onClick={onClose}><X className="hover:text-white" /></button>
        </div>

        <div className="flex mb-4 gap-2 overflow-x-auto no-scrollbar pb-2">
            <button onClick={() => setActiveTab('excel')} className={`flex-1 py-1 px-2 text-[10px] font-bold uppercase flex items-center justify-center gap-1 ${activeTab === 'excel' ? 'bg-[#ff0033] text-black' : 'border border-[#ff0033]'}`}><FileSpreadsheet size={10} /> EXCEL</button>
            <button onClick={() => setActiveTab('raw')} className={`flex-1 py-1 px-2 text-[10px] font-bold uppercase flex items-center justify-center gap-1 ${activeTab === 'raw' ? 'bg-[#ff0033] text-black' : 'border border-[#ff0033]'}`}><Terminal size={10} /> LOGS</button>
            <button onClick={() => setActiveTab('transcript')} className={`flex-1 py-1 px-2 text-[10px] font-bold uppercase flex items-center justify-center gap-1 ${activeTab === 'transcript' ? 'bg-[#ff0033] text-black' : 'border border-[#ff0033]'}`}><MessageSquareText size={10} /> CHAT</button>
            <button onClick={() => setActiveTab('maltego')} className={`flex-1 py-1 px-2 text-[10px] font-bold uppercase flex items-center justify-center gap-1 ${activeTab === 'maltego' ? 'bg-[#ff0033] text-black' : 'border border-[#ff0033]'}`}><GitMerge size={10} /> MALTEGO</button>
            <button onClick={() => setActiveTab('case')} className={`flex-1 py-1 px-2 text-[10px] font-bold uppercase flex items-center justify-center gap-1 ${activeTab === 'case' ? 'bg-[#ff0033] text-black' : 'border border-[#ff0033]'}`}><Save size={10} /> LOAD .RHZ</button>
        </div>

        {activeTab === 'case' ? (
             <div className="flex flex-col gap-4">
                 <div className="p-4 bg-gray-900 border border-gray-700 text-center">
                    <h3 className="text-white font-bold mb-2">RESTORE SESSION</h3>
                    <div 
                        onClick={() => caseInputRef.current?.click()}
                        className="border-2 border-dashed border-emerald-500 p-8 cursor-pointer hover:bg-emerald-500/10 transition-all flex flex-col items-center gap-2"
                    >
                        <FolderOpen className="text-emerald-500" size={32} />
                        <span className="text-xs font-black text-emerald-500 uppercase">CLICK TO SELECT .RHZ FILE</span>
                    </div>
                    <input ref={caseInputRef} type="file" accept=".json,.rhz" className="hidden" onChange={(e) => { 
                        if(e.target.files && e.target.files.length > 0) {
                            processCaseFile(e.target.files[0]);
                        }
                        e.target.value = '';
                    }} />
                    
                    <div className="mt-4 flex flex-col gap-2">
                        <button 
                            onClick={() => setIsMerge(!isMerge)}
                            className={`flex items-center justify-center gap-2 px-3 py-2 text-[10px] border font-black uppercase tracking-widest ${isMerge ? 'border-cyan-500 text-cyan-500 bg-cyan-900/10' : 'border-gray-600 text-gray-600'}`}
                        >
                            <GitMerge size={12} />
                            {isMerge ? "MODE: APPEND (MERGE)" : "MODE: RESET (OVERWRITE)"}
                        </button>
                        <p className="text-[8px] text-gray-500">* Use Reset to clear current canvas before loading file.</p>
                    </div>
                 </div>
                 {onSaveCase && (
                    <button onClick={onSaveCase} className="bg-emerald-600 text-black w-full py-3 font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-white shadow-lg">
                        <Save size={14} /> DOWNLOAD CURRENT CASE (.RHZ)
                    </button>
                 )}
             </div>
        ) : activeTab === 'excel' || activeTab === 'maltego' ? (
            <div 
              className={`border-2 border-dashed h-64 flex flex-col items-center justify-center transition-all cursor-pointer ${dragActive ? 'border-white bg-[#ff0033]/20' : 'border-[#ff0033]/50 hover:border-[#ff0033] hover:bg-[#ff0033]/10'}`}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              {processing ? <div className="text-center animate-pulse"><p className="text-xl font-bold uppercase">Decoding...</p></div> : (
                 <div className="text-center p-4">
                    <FileSpreadsheet className="mx-auto w-12 h-12 mb-4 opacity-80" />
                    <p className="font-bold uppercase tracking-widest">
                        {activeTab === 'maltego' ? 'Drop Maltego CSV Here' : 'Drop Spreadsheet Here'}
                    </p>
                    {activeTab === 'maltego' && (
                        <p className="text-[8px] mt-2 text-gray-500 italic">Expected columns: Source, SourceType, Target, TargetType, Relationship</p>
                    )}
                    <p className="text-[9px] mt-2 text-purple-400 font-mono bg-purple-950/40 border border-purple-800/40 px-3 py-1 rounded max-w-sm mx-auto">
                      💡 Tip Fail Besar: Untuk fail 50MB - berbilang Gigabyte, buka modul The Vault (Hybrid Streamer) untuk pemprosesan Web Worker tanpa had memori pelayar.
                    </p>
                 </div>
              )}
              <input ref={inputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files && processSpreadsheet(e.target.files[0])} />
            </div>
        ) : (
            <div className="flex flex-col h-64">
                <textarea 
                    value={rawText} onChange={(e) => setRawText(e.target.value)}
                    placeholder="PASTE INTEL HERE..."
                    className="flex-1 bg-[#111] border border-gray-700 text-[#ff0033] text-xs font-mono p-4 resize-none focus:border-[#ff0033] outline-none mb-2"
                />
                <div className="flex items-center gap-2 mb-2 px-1">
                    <input 
                        type="checkbox" 
                        id="stripImages" 
                        checked={stripImages} 
                        onChange={(e) => setStripImages(e.target.checked)}
                        className="accent-[#ff0033]"
                    />
                    <label htmlFor="stripImages" className="text-[10px] text-gray-400 font-bold uppercase cursor-pointer hover:text-white transition-colors">
                        Strip image URLs (Saves AI Tokens)
                    </label>
                </div>
                <div className="text-[10px] text-[#ff0033] mb-1 border border-[#ff0033]/30 inline-block px-1 bg-[#ff0033]/10 w-full text-center">⚠️ MENGGUNAKAN KUOTA TOKEN AI PADA PENGANALISIS TEKS</div>
                <button 
                    onClick={handleProcessRaw} disabled={processing || !rawText}
                    className="w-full bg-[#ff0033] text-black font-black py-3 uppercase hover:bg-white flex items-center justify-center gap-2"
                >
                    {processing ? <Cpu className="animate-spin" size={14} /> : <Terminal size={14} />}
                    {processing ? "GEMINI ANALYZING..." : "MAP TO GRAPH"}
                </button>
            </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500 text-red-200 text-[10px] font-black uppercase flex items-center gap-2 animate-in fade-in">
            <AlertTriangle size={14} className="shrink-0" /> <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataImport;
