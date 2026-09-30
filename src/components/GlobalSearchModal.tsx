import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { NodeBrandIcon, resolveNodeBrandOrType } from '../utils/nodeIconResolver';

interface Node {
  id: string;
  label: string;
  type?: string;
  details?: string;
  url?: string;
  timestamp?: string;
  vaultMatch?: boolean;
}

interface GlobalSearchModalProps {
  nodes: Node[];
  onSelectNode: (id: string) => void;
  onClose: () => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ nodes, onSelectNode, onClose }) => {
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) return nodes;
    
    const lowerQuery = query.toLowerCase();
    
    return nodes.filter(node => {
      const matchLabel = node.label.toLowerCase().includes(lowerQuery);
      const matchDetails = node.details ? node.details.toLowerCase().includes(lowerQuery) : false;
      const matchType = node.type ? node.type.toLowerCase().includes(lowerQuery) : false;
      return matchLabel || matchDetails || matchType;
    });
  }, [nodes, query]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim() || !text) return <span>{text}</span>;
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    return (
      <span className="break-all whitespace-pre-wrap">
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase().trim() ? (
            <span key={i} className="bg-cyan-500/30 text-cyan-200 border border-cyan-500/50 px-1 rounded font-bold">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex justify-center p-4 lg:p-12 font-mono" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-4xl bg-[#0a0a0a] border border-[#ff0033]/30 rounded-xl flex flex-col overflow-hidden shadow-2xl shadow-[#ff0033]/10 h-[80vh] mt-10">
        
        {/* Header */}
        <div className="h-16 border-b border-[#ff0033]/20 flex items-center px-4 bg-gradient-to-r from-[#ff0033]/10 to-transparent relative">
            <div className="absolute left-4">
                <Search className="text-[#ff0033]" size={20} />
            </div>
            <input 
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Global Search: E.g., 'SnapRender', IP, name, text OCR in images..."
                className="w-full bg-transparent border-none outline-none text-white text-lg pl-10 pr-10 font-bold placeholder:text-gray-600"
            />
            <button onClick={onClose} className="absolute right-4 text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 bg-black">
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-4">
             {searchResults.length} Match(es) Found in Graph
          </div>
          
          {searchResults.length === 0 ? (
              <div className="text-center text-gray-600 mt-20 italic">No node found matching "{query}"</div>
          ) : (
              searchResults.map(node => {
                  const meta = resolveNodeBrandOrType(node);
                  return (
                  <div 
                     key={node.id}
                     onClick={() => onSelectNode(node.id)}
                     className="bg-[#111] hover:bg-[#ff0033]/10 border border-white/5 hover:border-[#ff0033]/50 p-4 rounded-lg cursor-pointer transition-all group"
                  >
                      <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-black rounded border border-white/10 group-hover:border-[#ff0033]/50 flex items-center justify-center">
                                  <NodeBrandIcon node={node} size={16} />
                              </div>
                              <h3 className="text-white font-bold text-sm tracking-wide">{highlightText(node.label, query)}</h3>
                              <span 
                                className="text-[9px] px-2 py-0.5 rounded uppercase font-bold border"
                                style={{
                                  backgroundColor: `${meta.brandColor}15`,
                                  borderColor: `${meta.brandColor}40`,
                                  color: meta.brandColor
                                }}
                              >
                                  {meta.brandName}
                              </span>
                          </div>
                      </div>
                      
                      {node.details && (
                          <div className="mt-3 pl-12 text-xs text-gray-400 leading-relaxed max-h-24 overflow-hidden relative">
                              <div className="whitespace-pre-wrap font-sans">{highlightText(node.details, query)}</div>
                              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#111] group-hover:from-transparent to-transparent"></div>
                          </div>
                      )}
                  </div>
                  );
              })
          )}
        </div>
        
      </div>
    </div>
  );
};

export default GlobalSearchModal;
