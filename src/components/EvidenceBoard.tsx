
import React from 'react';
import { EvidenceItem, Node, EvidenceCategory } from '../types';
import { Trophy, X, Plus, Trash2 } from 'lucide-react';

interface EvidenceBoardProps {
  evidence: EvidenceItem[];
  selectedNode: Node | null;
  onAddEvidence: (node: Node, category: EvidenceCategory, notes: string) => void;
  onRemoveEvidence: (id: string) => void;
  onClose: () => void;
}

const EvidenceBoard: React.FC<EvidenceBoardProps> = ({ evidence, selectedNode, onAddEvidence, onRemoveEvidence, onClose }) => {
  const categories: EvidenceCategory[] = ['IDENTIFICATION', 'LOCATION', 'DIGITAL_FOOTPRINT', 'ASSOCIATE', 'DARK_WEB'];
  const totalPoints = evidence.reduce((acc, curr) => acc + curr.points, 0);

  return (
    <div className="absolute top-20 left-20 bottom-20 w-96 bg-[#1a1a1a] border-2 border-amber-500 shadow-2xl z-50 flex flex-col animate-in slide-in-from-left-10">
        <div className="bg-amber-600 text-black p-3 font-bold uppercase flex justify-between items-center">
            <span className="flex items-center gap-2"><Trophy size={16} /> Evidence Locker (CTF)</span>
            <button onClick={onClose}><X size={16} className="hover:text-white"/></button>
        </div>

        <div className="bg-black/50 p-4 border-b border-gray-700 text-center">
            <div className="text-[10px] text-gray-400 uppercase tracking-widest">Total Score</div>
            <div className="text-4xl font-black text-amber-500">{totalPoints}</div>
            <div className="text-[10px] text-gray-500 mt-1">Capture The Flag Mode</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {evidence.length === 0 ? (
                <div className="text-center text-gray-600 text-xs italic mt-10">No evidence collected yet.</div>
            ) : (
                evidence.map(item => (
                    <div key={item.id} className="bg-black border border-amber-900/50 p-3 relative group">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[9px] bg-amber-900/20 text-amber-500 px-1 rounded font-bold">{item.category}</span>
                            <span className="text-xs font-bold text-white">+{item.points}</span>
                        </div>
                        <div className="text-xs text-gray-300 font-bold mb-1">{item.label}</div>
                        <div className="text-[10px] text-gray-500">{item.notes}</div>
                        <button onClick={() => onRemoveEvidence(item.id)} className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                    </div>
                ))
            )}
        </div>

        {selectedNode && (
            <div className="p-4 border-t border-gray-700 bg-gray-900">
                <div className="text-xs text-gray-400 mb-2">Add <strong>{selectedNode.label}</strong> as evidence:</div>
                <div className="grid grid-cols-2 gap-2">
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => onAddEvidence(selectedNode, cat, "Manual capture")}
                            className="bg-black border border-gray-700 hover:border-amber-500 text-[9px] text-gray-300 py-1"
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default EvidenceBoard;
