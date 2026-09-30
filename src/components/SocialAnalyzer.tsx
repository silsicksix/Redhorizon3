
import React, { useState, useRef } from 'react';
import { Upload, MessageCircle, X, Network, AlertTriangle, Cpu } from 'lucide-react';
import { analyzeSocialGraph } from '../services/geminiService';
import { GraphData } from '../types';

interface SocialAnalyzerProps {
  onAnalysisComplete: (data: GraphData, report: string) => void;
  onClose: () => void;
// @FIX: Added 'warning' to the type definition to allow for more log types.
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
}

const SocialAnalyzer: React.FC<SocialAnalyzerProps> = ({ onAnalysisComplete, onClose, onLog }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(f => f.type.startsWith('image/'));
    if (validFiles.length !== newFiles.length) {
        onLog("Some non-image files were rejected.", 'warning');
    }
    setFiles(prev => [...prev, ...validFiles]);
  };

  const processImages = async () => {
    if (files.length === 0) return;
    setLoading(true);
    onLog(`Initializing batch analysis for ${files.length} screenshots...`, 'info');

    try {
        // Convert all to Base64
        const promises = files.map(file => {
            return new Promise<{ mimeType: string, data: string }>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const res = e.target?.result as string;
                    resolve({
                        mimeType: file.type,
                        data: res.split(',')[1] // remove prefix
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        const images = await Promise.all(promises);
        const result = await analyzeSocialGraph(images);
        
        onAnalysisComplete(result.graph, result.report);
        onLog("Social Graph Reconstruction Successful.", 'success');
        onClose();

    } catch (e: any) {
        onLog(`Analysis Failed: ${e.message}`, 'error');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80  p-4">
      <div className="w-full max-w-lg bg-[#0a0a0a] border-2 border-[#ff0033] text-[#ff0033] p-6 shadow-[0_0_30px_rgba(255,0,51,0.2)] font-mono relative">
        
        <div className="flex justify-between items-center mb-6 border-b border-[#ff0033]/50 pb-2">
          <h2 className="text-xl font-bold uppercase flex items-center gap-2">
            <MessageCircle /> Social Graph Reconstruction
          </h2>
          <button onClick={onClose}><X className="hover:text-white" /></button>
        </div>

        <div 
          className={`
            border-2 border-dashed h-48 flex flex-col items-center justify-center transition-all cursor-pointer relative
            ${dragActive ? 'border-white bg-[#ff0033]/20' : 'border-[#ff0033]/50 hover:border-[#ff0033] hover:bg-[#ff0033]/10'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? (
             <div className="text-center animate-pulse">
                <Network className="mx-auto mb-2 animate-bounce" />
                <p className="text-xl font-bold">ANALYZING CONVERSATION FLOW...</p>
                <p className="text-xs mt-2">MAPPING SENTIMENT & NODES</p>
             </div>
          ) : (
             <div className="text-center p-4">
                <Upload className="mx-auto w-10 h-10 mb-2 opacity-80" />
                <p className="font-bold">DRAG MULTIPLE SCREENSHOTS HERE</p>
                <p className="text-xs text-gray-500 mt-2">
                  Supports scrolling screenshots, comment threads, debate logs.
                </p>
             </div>
          )}
          <input 
            ref={inputRef}
            type="file" 
            className="hidden" 
            accept="image/*" 
            multiple
            onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} 
          />
        </div>

        {/* File Preview List */}
        {files.length > 0 && !loading && (
            <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-white font-bold">{files.length} IMAGES QUEUED</span>
                    <button onClick={() => setFiles([])} className="text-[10px] text-red-500 hover:text-white underline">CLEAR ALL</button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {files.map((f, i) => (
                        <div key={i} className="min-w-[60px] h-[60px] bg-gray-900 border border-gray-700 flex items-center justify-center relative group">
                            <span className="text-[9px] text-gray-500 truncate px-1">{f.name.substring(0,6)}..</span>
                            <div className="absolute inset-0 bg-red-900/80 hidden group-hover:flex items-center justify-center cursor-pointer" onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, idx) => idx !== i)) }}>
                                <X size={16} className="text-white" />
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="text-[10px] text-[#ff0033] mt-2 mb-1 border border-[#ff0033]/30 inline-block px-1 bg-[#ff0033]/10 w-full text-center">⚠️ MENGGUNAKAN KUOTA TOKEN AI PADA PENGANALISIS TEKS</div>
                <button 
                  onClick={processImages}
                  className="w-full mt-4 bg-[#ff0033] text-black font-bold py-2 uppercase hover:bg-white transition-all flex items-center justify-center gap-2"
                >
                    <Cpu size={14} /> EXECUTE FORENSIC ANALYSIS
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SocialAnalyzer;
