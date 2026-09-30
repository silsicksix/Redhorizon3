
import React from 'react';
import { TimelineEvent } from '../types';
import { X, Clock } from 'lucide-react';

interface TimelineProps {
  events: TimelineEvent[];
  onClose: () => void;
}

const Timeline: React.FC<TimelineProps> = ({ events, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90  p-4">
        <div className="w-full max-w-2xl bg-[#0a0a0a] border-2 border-blue-500 p-6 font-mono max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-blue-500 font-bold uppercase flex items-center gap-2"><Clock /> Temporal Analysis</h3>
                <button onClick={onClose}><X className="text-blue-500 hover:text-white" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar relative pl-4 border-l border-gray-800">
                {events.length === 0 ? (
                    <div className="text-gray-600 text-center py-10">No temporal data available.</div>
                ) : (
                    events.map((e, i) => (
                        <div key={i} className="mb-6 relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 bg-blue-500 rounded-full border-4 border-black"></div>
                            <div className="text-xs text-blue-400 font-bold mb-1">{e.year}</div>
                            <div className="text-white font-bold text-sm mb-1">{e.event}</div>
                            <div className="text-[10px] text-gray-500 uppercase bg-gray-900 inline-block px-1 rounded">{e.type}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

export default Timeline;
