
import React, { useState, useRef } from 'react';
import { FileText, Upload, X, Shield, Terminal, Cpu, Search, FileCode } from 'lucide-react';
import { computeFileHash, extractStrings, getHexHeader } from '../utils/fileUtils';
import { analyzeFileMetadata } from '../services/geminiService';

interface FileScannerProps {
  onClose: () => void;
// @FIX: Added 'warning' to the type definition to allow for more log types.
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
}

const FileScanner: React.FC<FileScannerProps> = ({ onClose, onLog }) => {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string>('');
  const [hexHead, setHexHead] = useState<string>('');
  const [strings, setStrings] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (f: File) => {
    setFile(f);
    setAnalysis(null);
    setLoading(true);
    onLog(`Mounting file: ${f.name} (${f.size} bytes)`, 'info');

    try {
      // 1. Compute Hash
      const h = await computeFileHash(f);
      setHash(h);
      
      // 2. Hex Header
      const hh = await getHexHeader(f);
      setHexHead(hh);

      // 3. Extract Strings
      onLog("Running strings extraction algorithm...", 'info');
      const s = await extractStrings(f);
      setStrings(s);
      
      onLog(`File mounted. Hash: ${h.substring(0,8)}...`, 'success');
    } catch (e: any) {
      onLog(`File processing error: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!file || !hash) return;
    setLoading(true);
    onLog("Transmitting metadata to Neural Network...", 'warning');
    
    try {
      const result = await analyzeFileMetadata({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        hash,
        hexHead,
        extractedStrings: strings.slice(0, 100) // Send top 100 relevant strings
      });
      setAnalysis(result);
      onLog("File forensics complete.", 'success');
    } catch (e: any) {
      onLog(`AI Analysis Error: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90  p-4">
      <div className="w-full max-w-5xl bg-[#050505] border-2 border-[#ff0033] shadow-[0_0_50px_rgba(255,0,51,0.2)] font-mono flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#ff0033]/50 bg-[#ff0033]/10">
          <div className="flex items-center gap-4">
             <FileText className="text-[#ff0033]" size={24} />
             <div>
               <h2 className="text-xl font-bold text-white tracking-widest uppercase">Deep File Inspector</h2>
               <p className="text-[10px] text-gray-400">METADATA • HASHING • STRINGS</p>
             </div>
          </div>
          <button onClick={onClose} className="hover:text-white text-[#ff0033]"><X /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: File Input & Stats */}
          <div className="w-4/12 border-r border-[#ff0033]/30 bg-[#0a0a0a] p-4 flex flex-col gap-4 overflow-y-auto">
             <div 
               onClick={() => inputRef.current?.click()}
               onDragOver={(e) => e.preventDefault()}
               onDrop={handleDrop}
               className="border-2 border-dashed border-[#ff0033]/40 hover:border-[#ff0033] hover:bg-[#ff0033]/10 h-32 flex flex-col items-center justify-center cursor-pointer transition-all"
             >
                <Upload className="text-[#ff0033] mb-2" />
                <p className="text-xs font-bold text-gray-400">DROP ANY FILE</p>
                <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
             </div>

             {file && (
                <div className="space-y-4">
                   <div className="bg-[#111] border border-gray-800 p-2">
                      <div className="text-[9px] text-gray-500 uppercase">File Name</div>
                      <div className="text-white text-xs truncate font-bold">{file.name}</div>
                   </div>
                   
                   <div className="bg-[#111] border border-gray-800 p-2">
                      <div className="text-[9px] text-gray-500 uppercase">SHA-256 Hash (Integrity)</div>
                      <div className="text-[#ff0033] text-[10px] break-all font-mono leading-tight">{hash}</div>
                      <button 
                        onClick={() => window.open(`https://www.virustotal.com/gui/search/${hash}`, '_blank')}
                        className="mt-2 w-full bg-blue-900/20 border border-blue-600 text-blue-500 hover:bg-blue-600 hover:text-black text-[9px] py-1 flex items-center justify-center gap-1"
                      >
                         <Shield size={10} /> CHECK VIRUSTOTAL
                      </button>
                   </div>

                   <div className="bg-[#111] border border-gray-800 p-2">
                      <div className="text-[9px] text-gray-500 uppercase">Magic Bytes (Hex)</div>
                      <div className="text-green-500 text-[10px] font-mono break-all">{hexHead}</div>
                   </div>

                    <div className="text-[10px] text-[#ff0033] mt-2 border border-[#ff0033]/30 inline-block px-1 bg-[#ff0033]/10 text-center w-full">⚠️ MENGGUNAKAN KUOTA TOKEN AI</div>
                   <button 
                     onClick={handleAIAnalysis}
                     disabled={loading}
                     className="w-full bg-[#ff0033] text-black font-bold py-3 uppercase flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-50"
                   >
                       {loading ? <Cpu className="animate-spin" /> : <Search />}
                       {loading ? 'ANALYZING...' : 'AI FORENSICS'}
                   </button>
                </div>
             )}
          </div>

          {/* RIGHT: Results & Strings */}
          <div className="w-8/12 bg-black flex flex-col">
             
             {/* Strings View */}
             <div className="h-1/2 border-b border-[#ff0033]/30 p-2 flex flex-col">
                <div className="flex justify-between items-center mb-2 px-2">
                   <h3 className="text-xs text-[#ff0033] font-bold uppercase flex items-center gap-2">
                      <Terminal size={14} /> Extracted Strings (ASCII/Unicode)
                   </h3>
                   <span className="text-[9px] text-gray-500">{strings.length} artifacts found</span>
                </div>
                <div className="flex-1 bg-[#0a0a0a] border border-gray-800 p-2 overflow-y-auto custom-scrollbar font-mono text-[10px] text-gray-400">
                   {strings.length > 0 ? (
                      strings.map((s, i) => (
                        <div key={i} className="border-b border-gray-900 pb-0.5 mb-0.5 hover:text-white break-all">
                           <span className="text-gray-600 select-none mr-2">{i.toString().padStart(4, '0')}</span>
                           {s}
                        </div>
                      ))
                   ) : (
                      <div className="h-full flex items-center justify-center text-gray-700 italic">No printable strings extracted yet.</div>
                   )}
                </div>
             </div>

             {/* AI Report View */}
             <div className="h-1/2 p-4 overflow-y-auto custom-scrollbar">
                {analysis ? (
                   <div>
                      <h3 className="text-[#ff0033] font-bold text-xs uppercase mb-2 flex items-center gap-2">
                         <FileCode size={14} /> AI Forensic Report
                      </h3>
                      <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed">
                         {analysis}
                      </div>
                   </div>
                ) : (
                   <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-50">
                      <Cpu size={48} className="mb-4" />
                      <p className="text-sm tracking-widest">AWAITING AI ANALYSIS</p>
                   </div>
                )}
             </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default FileScanner;
