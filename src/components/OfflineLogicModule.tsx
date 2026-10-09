
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
      // Robust client-side regex extraction (Offline pattern logic)
      const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi) || [];
      const phones = text.match(/(\+?6?01[0-9]-*[0-9]{7,8})/g) || [];
      const urls = text.match(/(https?:\/\/[^\s]+)/g) || [];
      const nrics = text.match(/\b\d{6}[- ]?\d{2}[- ]?\d{4}\b/g) || [];
      const ips = text.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g) || [];

      const nodes: any[] = [];
      const links: any[] = [];
      const timestamp = Date.now();
      const rootId = `logic_${timestamp}`;

      nodes.push({ id: rootId, label: 'OFFLINE_EXTRACT', type: 'file', details: `Source Text Block (${text.length} aksara)` });

      // Clean NRIC (MyKad)
      [...new Set(nrics)].forEach((ic, i) => {
          const cleanIc = ic.replace(/\D/g, '');
          if (cleanIc.length === 12) {
              const formatted = `${cleanIc.substring(0, 6)}-${cleanIc.substring(6, 8)}-${cleanIc.substring(8)}`;
              const id = `nric_${cleanIc}`;
              nodes.push({ id, label: formatted, type: 'person', details: `MyKad NRIC: ${formatted}` });
              links.push({ source: rootId, target: id, label: 'contains_identity' });
          }
      });

      // Emails
      [...new Set(emails)].forEach((e, i) => {
          const norm = e.toLowerCase().trim();
          const id = `email_${norm.replace(/[^a-z0-9]/g, '_')}`;
          nodes.push({ id, label: norm, type: 'email', details: `Emel: ${norm}` });
          links.push({ source: rootId, target: id, label: 'contains' });
      });

      // Phones
      [...new Set(phones)].forEach((p, i) => {
          let clean = p.replace(/[^\d+]/g, '');
          if (clean.startsWith('0')) clean = '+60' + clean.substring(1);
          const id = `phone_${clean.replace('+', '')}`;
          nodes.push({ id, label: clean, type: 'phone', details: `Telefon: ${clean}` });
          links.push({ source: rootId, target: id, label: 'contains' });
      });
      
      // IPs
      [...new Set(ips)].forEach((ip, i) => {
          if (ip !== '127.0.0.1' && ip !== '0.0.0.0') {
              const id = `ip_${ip.replace(/\./g, '_')}`;
              nodes.push({ id, label: ip, type: 'ip_address', details: `Alamat IP: ${ip}` });
              links.push({ source: rootId, target: id, label: 'contains' });
          }
      });

      // URLs
      [...new Set(urls)].forEach((u, i) => {
          const id = `url_${timestamp}_${i}`;
          nodes.push({ id, label: u.length > 50 ? u.substring(0, 47) + '...' : u, type: 'domain', details: `URL: ${u}`, url: u });
          links.push({ source: rootId, target: id, label: 'contains' });
      });

      if (nodes.length > 1) {
          onImport({ nodes, links });
          onLog(`Logik luar talian berjaya mengekstrak ${nodes.length - 1} entiti unik (Emel, Tel, MyKad, IP, URL).`, 'success');
          onClose();
      } else {
          onLog("Tiada corak entiti (Emel, Tel, MyKad, IP, URL) dikesan dalam teks.", 'warning');
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
