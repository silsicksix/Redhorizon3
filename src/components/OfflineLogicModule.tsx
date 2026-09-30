
import React, { useState } from 'react';
import { GraphData } from '../types';
import { Cpu, X, FileText, Upload } from 'lucide-react';

interface OfflineLogicModuleProps {
  onClose: () => void;
  onImport: (data: GraphData) => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
}

const OfflineLogicModule: React.FC<OfflineLogicModuleProps> = ({ onClose, onImport, onLog }) => {
  const [text, setText] = useState('');
  
  const handleExtract = () => {
      // Simple regex-based extraction (Offline logic)
      const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi) || [];
      const phones = text.match(/(\+?6?01[0-9]-*[0-9]{7,8})/g) || [];
      const urls = text.match(/(https?:\/\/[^\s]+)/g) || [];

      const nodes: any[] = [];
      const links: any[] = [];
      const rootId = `logic_${Date.now()}`;

      nodes.push({ id: rootId, label: 'OFFLINE_EXTRACT', type: 'file', details: 'Source Text Block' });

      [...new Set(emails)].forEach((e, i) => {
          const id = `email_${i}`;
          nodes.push({ id, label: e, type: 'email' });
          links.push({ source: rootId, target: id, label: 'contains' });
      });

      [...new Set(phones)].forEach((p, i) => {
          const id = `phone_${i}`;
          nodes.push({ id, label: p, type: 'phone' });
          links.push({ source: rootId, target: id, label: 'contains' });
      });
      
      [...new Set(urls)].forEach((u, i) => {
          const id = `url_${i}`;
          nodes.push({ id, label: u, type: 'domain' });
          links.push({ source: rootId, target: id, label: 'contains' });
      });

      if (nodes.length > 1) {
          onImport({ nodes, links });
          onLog(`Offline logic extracted ${nodes.length - 1} entities.`, 'success');
          onClose();
      } else {
          onLog("No patterns detected in text.", 'warning');
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90  p-4">
       <div className="w-full max-w-lg bg-[#0a0a0a] border border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.2)] p-6 font-mono">
           <div className="flex justify-between items-center mb-4 border-b border-blue-900 pb-2">
               <h3 className="text-blue-500 font-bold uppercase flex items-center gap-2">
                   <Cpu size={18} /> Offline Pattern Logic
               </h3>
               <button onClick={onClose}><X className="text-gray-500 hover:text-white" /></button>
           </div>
           
           <p className="text-xs text-gray-400 mb-4">
               Extract emails, phone numbers, and URLs using client-side regex. No API tokens required.
           </p>

           <textarea 
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full h-40 bg-black border border-gray-700 text-white text-xs p-3 outline-none focus:border-blue-500 mb-4"
              placeholder="Paste raw text dump here..."
           />

           <button onClick={handleExtract} className="w-full bg-blue-600 text-black font-bold py-2 uppercase hover:bg-white transition-all">
               RUN EXTRACTION
           </button>
       </div>
    </div>
  );
};

export default OfflineLogicModule;
