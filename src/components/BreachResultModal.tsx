import React from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, ExternalLink, Database } from 'lucide-react';

interface BreachResultModalProps {
  result: any;
  onClose: () => void;
}

export default function BreachResultModal({ result, onClose }: BreachResultModalProps) {
  if (!result) return null;

  const isBreached = result.found && result.found.length > 0;
  const isError = result.message && result.message.includes('exceeded');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80  p-4">
      <div className="bg-[#0a0a0a] border border-[#ff0033]/50 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-[0_0_30px_rgba(255,0,51,0.2)]">
        <div className="h-12 border-b border-[#ff0033]/30 flex items-center justify-between px-4 bg-[#111]">
          <h2 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#ff0033]" />
            Breach Check Results
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs">
          {isError ? (
            <div className="space-y-4 text-amber-500">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle size={20} />
                <span>API QUOTA EXCEEDED</span>
              </div>
              <p className="text-gray-400">{result.message}</p>
            </div>
          ) : isBreached ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-500 font-bold">
                <AlertTriangle size={20} />
                <span>BREACH DETECTED</span>
              </div>
              <p className="text-gray-400">The email was found in the following breaches:</p>
              <div className="space-y-2">
                {result.found.map((breach: string, index: number) => (
                  <div key={index} className="bg-white/5 p-2 border border-white/10 text-white flex items-center justify-between group">
                    <span>{breach}</span>
                    {breach.toLowerCase().includes('facebook') && (
                      <span className="text-[8px] bg-[#ff0033]/20 text-[#ff0033] px-1 rounded border border-[#ff0033]/30 animate-pulse">ZUCKERED MATCH</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Deep Link to Zuckered */}
              <div className="mt-8 pt-4 border-t border-white/10">
                 <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-blue-400 font-black uppercase tracking-widest text-[10px] mb-1 flex items-center gap-2">
                            <Database size={14} />
                            Facebook Leak Verification
                        </h3>
                        <p className="text-gray-500 text-[9px] leading-relaxed">
                            Verify if this target was part of the 533M Facebook leak specifically through Zuckered's specialized database.
                        </p>
                    </div>
                    <button 
                        onClick={() => window.open(`https://haveibeenzuckered.com/`, '_blank')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-black uppercase transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-blue-600/20"
                    >
                        Check Zuckered <ExternalLink size={12} />
                    </button>
                 </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-emerald-500 font-bold">
                <CheckCircle size={20} />
                <span>NO BREACHES DETECTED BY PRIMARY ENGINE</span>
              </div>
              
              {/* Secondary check even if primary fails */}
              <div className="bg-white/5 border border-white/10 p-4 rounded">
                 <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Deep Search Recommendation</h3>
                 <p className="text-gray-400 text-[9px] mb-4">The primary API found no results, but specialized regional leaks (like the Facebook data leak) may still contain this data.</p>
                 <button 
                    onClick={() => window.open(`https://haveibeenzuckered.com/`, '_blank')}
                    className="w-full py-2 bg-black border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2"
                 >
                    Verifikasi di HaveIBeenZuckered.com <Database size={12} />
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
