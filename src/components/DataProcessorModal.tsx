import React, { useState } from 'react';
import { X, Cpu, Database, ArrowRight } from 'lucide-react';

interface DataProcessorModalProps {
  onClose: () => void;
  onLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onProcess: (finalPrompt: string) => void;
  onProcessOffline: (jsonInput: string) => void;
}

const DataProcessorModal: React.FC<DataProcessorModalProps> = ({ onClose, onLog, onProcess, onProcessOffline }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [targetModule, setTargetModule] = useState<'social' | 'stylometry' | 'osint'>('osint');

  const getPromptTemplate = () => {
    switch (targetModule) {
      case 'social':
        return `Analyze the following JSON social media interaction data:
        
        DATA:
        ${jsonInput}
        
        ARAHAN: Extract social network nodes, interaction types, and sentiment. 
        PENTING: 
        1. Pastikan atribut 'avatar_url' dalam data asal dipetakan ke field 'imageUrl' dalam node.
        2. Kekalkan FB_ID dan PROFILE_URL dalam field 'details' node tersebut.
        Return in GraphData JSON structure.`;
      case 'stylometry':
        return `Analyze the following JSON comment data for author stylometry:
        
        DATA:
        ${jsonInput}
        
        ARAHAN: Analyze writing style, linguistic markers, and profile personality. 
        PENTING: Sertakan PROFILE_URL, FB_ID, dan URL Gambar Profil (avatar_url) dalam laporan dossier tersebut.
        Return detailed stylistic report.`;
      case 'osint':
      default:
        return `Analyze the following OSINT data extracted from web:
        
        DATA:
        ${jsonInput}
        
        ARAHAN: Extract entiti, hubungan, dan konteks sebagai GraphData JSON. Fokus pada keterhubungan target dengan entiti lain.
        PENTING: Cari sebarang FB_ID, profile links, dan URL GAMBAR (imageUrl) yang ditemui.`;
    }
  };

  const handleProcess = (isOffline: boolean = false) => {
    if (!jsonInput.trim()) {
        onLog("Sila masukkan data JSON terlebih dahulu.", "error");
        return;
    }
    
    if (isOffline) {
        onProcessOffline(jsonInput);
    } else {
        const finalPrompt = getPromptTemplate();
        onProcess(finalPrompt);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl bg-[#0a0a0a] border-2 border-[#00ccff] text-[#00ccff] p-6 shadow-[0_0_30px_rgba(0,204,255,0.2)] font-mono relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="flex justify-between items-center mb-6 border-b border-[#00ccff]/50 pb-2">
          <h2 className="text-xl font-black uppercase flex items-center gap-2 text-white">
            <Cpu className="text-[#00ccff]" /> Smart Data Ingest
          </h2>
          <button onClick={onClose} className="hover:text-white"><X /></button>
        </div>

        <div className="mb-4">
            <label className="text-[10px] uppercase font-bold text-gray-400 mb-2 block">Pilih Modul Sasaran:</label>
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setTargetModule('social')} className={`p-2 text-xs border ${targetModule === 'social' ? 'bg-[#00ccff] text-black font-black' : 'border-[#00ccff] text-[#00ccff]'}`}>Social Analyzer</button>
                <button onClick={() => setTargetModule('stylometry')} className={`p-2 text-xs border ${targetModule === 'stylometry' ? 'bg-[#00ccff] text-black font-black' : 'border-[#00ccff] text-[#00ccff]'}`}>Stylometry Lab</button>
                <button onClick={() => setTargetModule('osint')} className={`p-2 text-xs border ${targetModule === 'osint' ? 'bg-[#00ccff] text-black font-black' : 'border-[#00ccff] text-[#00ccff]'}`}>OSINT Engine</button>
            </div>
        </div>

        <textarea 
            value={jsonInput} onChange={(e) => setJsonInput(e.target.value)}
            placeholder="PASTE JSON DATA HERE..."
            className="w-full h-64 bg-[#111] border border-gray-700 text-[#00ccff] text-xs font-mono p-4 resize-none focus:border-[#00ccff] outline-none mb-4"
        />

        <div className="flex gap-2">
            <button 
                onClick={() => handleProcess(false)}
                className="flex-1 bg-[#00ccff] text-black font-black py-3 uppercase hover:bg-white flex items-center justify-center gap-2"
            >
                <Cpu size={14} /> AI Processing
            </button>
            <button 
                onClick={() => handleProcess(true)}
                className="flex-1 bg-gray-700 text-white font-black py-3 uppercase hover:bg-gray-600 flex items-center justify-center gap-2"
            >
                <Database size={14} /> Offline Processing
            </button>
        </div>
      </div>
    </div>
  );
};

export default DataProcessorModal;
