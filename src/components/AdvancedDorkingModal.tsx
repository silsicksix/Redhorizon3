import React, { useState } from 'react';
import { X, Globe, Search, Copy, Check, ExternalLink } from 'lucide-react';

interface AdvancedDorkingModalProps {
  onClose: () => void;
  onLog: (msg: string, type?: string) => void;
  initialTarget?: string;
}

const AdvancedDorkingModal: React.FC<AdvancedDorkingModalProps> = ({ onClose, onLog, initialTarget }) => {
  const [target, setTarget] = useState(initialTarget || '');
  const [site, setSite] = useState('');
  const [fileType, setFileType] = useState('');
  const [inText, setInText] = useState('');
  const [inTitle, setInTitle] = useState('');
  const [inUrl, setInUrl] = useState('');
  const [exclude, setExclude] = useState('');
  const [engine, setEngine] = useState<'Google' | 'DuckDuckGo' | 'Bing' | 'Yandex' | 'Brave'>('Google');
  
  const [copied, setCopied] = useState(false);

  const generateDork = () => {
    let query = target ? `"${target}"` : '';

    if (site) query += ` site:${site}`;
    if (fileType) {
      const types = fileType.split(/[,|\s]+/).map(t => t.trim().replace(/^\./, '')).filter(t => t);
      if (types.length === 1) {
        query += ` filetype:${types[0]}`;
      } else if (types.length > 1) {
        query += ` (${types.map(t => `filetype:${t}`).join(' OR ')})`;
      }
    }
    // Helper to wrap value correctly to avoid double quotes and handle OR logic
    const wrapOperator = (op: string, val: string) => {
      if (!val) return '';
      const trimmed = val.trim();
      
      // If it's a complex expression (contains OR or is already quoted/wrapped)
      if (trimmed.includes(' OR ') || 
          trimmed.includes(' | ') || 
          (trimmed.startsWith('"') && trimmed.endsWith('"')) || 
          (trimmed.startsWith('(') && trimmed.endsWith(')'))) {
        return ` ${op}:(${trimmed})`;
      }
      
      // If it contains spaces, wrap in quotes
      if (trimmed.includes(' ')) {
        return ` ${op}:"${trimmed}"`;
      }
      
      return ` ${op}:${trimmed}`;
    };

    query += wrapOperator('intext', inText);
    query += wrapOperator('intitle', inTitle);
    
    if (inUrl) query += ` inurl:${inUrl.trim()}`;
    if (exclude) {
      const excludes = exclude.split(',').map(e => `-"${e.trim()}"`);
      query += ` ${excludes.join(' ')}`;
    }

    return query.trim();
  };

  const dorkQuery = generateDork();

  const handleCopy = () => {
    if (!dorkQuery) return;
    navigator.clipboard.writeText(dorkQuery);
    setCopied(true);
    onLog('Dork Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = () => {
    if (!dorkQuery) {
        onLog('Dork query is empty', 'warning');
        return;
    }
    let url = '';
    const q = encodeURIComponent(dorkQuery);
    
    switch (engine) {
      case 'Google':
        url = `https://www.google.com/search?q=${q}`;
        break;
      case 'DuckDuckGo':
        url = `https://duckduckgo.com/?q=${q}`;
        break;
      case 'Bing':
        url = `https://www.bing.com/search?q=${q}`;
        break;
      case 'Yandex':
        url = `https://yandex.com/search/?text=${q}`;
        break;
      case 'Brave':
        url = `https://search.brave.com/search?q=${q}`;
        break;
    }

    window.open(url, '_blank');
    onLog(`Executing Dork on ${engine}`, 'info');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-[var(--theme-color)]/20 w-full max-w-2xl text-white font-mono flex flex-col shadow-[0_0_50px_rgba(255,0,51,0.15)] rounded-lg overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--theme-color)]/20 bg-[var(--theme-color)]/5">
          <div className="flex items-center gap-3">
            <Globe className="text-[var(--theme-color)]" size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-200">Advanced Dork Builder</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          <p className="text-xs text-gray-400">
            Create highly specific search queries using Google/DuckDuckGo operators to unearth sensitive indexed files, directories, and data.
          </p>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 text-[10px]">
             <span className="text-[var(--theme-color)] font-bold py-1">PRESETS:</span>
             <button 
               onClick={() => { setSite('facebook.com'); setInText('"@gmail.com" OR "@yahoo.com" OR "@hotmail.com"'); setInTitle(''); setInUrl(''); setFileType(''); }}
               className="bg-blue-900/30 text-blue-400 border border-blue-500/30 px-2 py-1 rounded hover:bg-blue-900/50"
             >
               FB Emails
             </button>
             <button 
               onClick={() => { setSite('linkedin.com/in'); setInText('"@gmail.com"'); setInTitle(''); setInUrl(''); setFileType(''); }}
               className="bg-blue-900/30 text-blue-400 border border-blue-500/30 px-2 py-1 rounded hover:bg-blue-900/50"
             >
               LinkedIn Emails
             </button>
             <button 
               onClick={() => { setSite('facebook.com'); setInText('"010" OR "011" OR "012" OR "013" OR "014" OR "015" OR "016" OR "017" OR "018" OR "019"'); setInTitle('whatsapp OR tel OR contact OR wasap OR "wa.me"'); setInUrl(''); setFileType(''); }}
               className="bg-green-900/30 text-green-400 border border-green-500/30 px-2 py-1 rounded hover:bg-green-900/50"
             >
               MY Phone
             </button>
             <button 
               onClick={() => { setInText('password OR credentials OR pass OR secret'); setSite(''); setInTitle(''); setInUrl(''); setFileType('env, log, txt, sql'); }}
               className="bg-red-900/30 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-900/50"
             >
               Exposed Credentials
             </button>
             <button 
               onClick={() => { setSite(''); setInText(''); setInTitle('index of'); setInUrl(''); setFileType(''); }}
               className="bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded hover:bg-yellow-900/50"
             >
               Open Directories
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Target Keyword */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[10px] uppercase font-bold text-[var(--theme-color)]">Target Keyword / Phrase</label>
              <input 
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder='e.g., "confidential" or John Doe'
                className="w-full bg-black border border-white/10 p-2 text-xs text-white focus:outline-none focus:border-[var(--theme-color)]"
              />
            </div>

            {/* Site */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Target Site / Domain (site:)</label>
              <input 
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g., target.com or gov.my"
                className="w-full bg-black border border-white/10 p-2 text-xs text-white focus:outline-none focus:border-[var(--theme-color)]"
              />
            </div>

            {/* File Type */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">File Type (filetype:)</label>
              <input 
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                placeholder="e.g., pdf, xlsx, doc (comma separated)"
                className="w-full bg-black border border-white/10 p-2 text-xs text-white focus:outline-none focus:border-[var(--theme-color)]"
              />
            </div>

            {/* In Text */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Must Contain in Text (intext:)</label>
              <input 
                value={inText}
                onChange={(e) => setInText(e.target.value)}
                placeholder="e.g., password, confidential"
                className="w-full bg-black border border-white/10 p-2 text-xs text-white focus:outline-none focus:border-[var(--theme-color)]"
              />
            </div>

            {/* In Title */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Must Contain in Title (intitle:)</label>
              <input 
                value={inTitle}
                onChange={(e) => setInTitle(e.target.value)}
                placeholder="e.g., index of, admin"
                className="w-full bg-black border border-white/10 p-2 text-xs text-white focus:outline-none focus:border-[var(--theme-color)]"
              />
            </div>

            {/* In URL */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Must Contain in URL (inurl:)</label>
              <input 
                value={inUrl}
                onChange={(e) => setInUrl(e.target.value)}
                placeholder="e.g., wp-admin, login"
                className="w-full bg-black border border-white/10 p-2 text-xs text-white focus:outline-none focus:border-[var(--theme-color)]"
              />
            </div>

             {/* Exclude */}
             <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Exclude Words (-word)</label>
              <input 
                value={exclude}
                onChange={(e) => setExclude(e.target.value)}
                placeholder="e.g., manual, example (comma separated)"
                className="w-full bg-black border border-white/10 p-2 text-xs text-white focus:outline-none focus:border-[var(--theme-color)]"
              />
            </div>

          </div>

          <div className="mt-4 border border-white/10 p-3 bg-black/50 relative">
            <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Generated Dork</div>
            <div className="text-sm text-white font-bold break-all">{dorkQuery || <span className="text-gray-600 italic">No query parameters set</span>}</div>
            
            <button 
              onClick={handleCopy}
              className={`absolute top-2 right-2 p-1.5 rounded transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--theme-color)]/20 bg-black/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
           <div className="flex items-center gap-2 w-full sm:w-auto">
             <span className="text-xs text-gray-400 uppercase font-bold">Engine:</span>
             <select 
               value={engine} 
               onChange={(e: any) => setEngine(e.target.value)}
               className="bg-[#0a0a0a] border border-white/10 text-white text-xs p-1 focus:outline-none focus:border-[var(--theme-color)]"
             >
               <option value="Google">Google</option>
               <option value="DuckDuckGo">DuckDuckGo</option>
               <option value="Bing">Bing</option>
               <option value="Yandex">Yandex</option>
               <option value="Brave">Brave</option>
             </select>
           </div>
           
           <div className="flex w-full sm:w-auto gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-bold uppercase transition-all rounded flex-1 sm:flex-none text-center">
                Close
            </button>
            <button onClick={handleSearch} className="px-4 py-2 bg-[var(--theme-color)] hover:bg-red-500 text-black text-xs font-bold uppercase transition-all rounded flex items-center justify-center gap-2 flex-1 sm:flex-none">
                <Search size={14} /> SEARCH
            </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default AdvancedDorkingModal;
