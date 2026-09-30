import React, { useEffect, useState } from 'react';
import { FileCode, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';

export interface FileLoadProgressDetail {
  fileName: string;
  fileSize?: number;
  progress: number; // 0 to 100
  stage?: string;
  totalEntities?: number;
  isComplete?: boolean;
}

export const reportFileLoadProgress = (detail: FileLoadProgressDetail) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('redhorizon:file-load-progress', { detail }));
  }
};

/**
 * Helper to smoothly animate progress through realistic stages during file parsing & rendering
 */
export const runWithFileProgress = async <T,>(
  fileName: string,
  fileSize: number | undefined,
  task: (updateProgress: (percent: number, stage: string, entities?: number) => void) => Promise<T>
): Promise<T> => {
  reportFileLoadProgress({
    fileName,
    fileSize,
    progress: 10,
    stage: 'Membaca fail & menyahkod bait data...'
  });

  await new Promise(r => setTimeout(r, 80));

  reportFileLoadProgress({
    fileName,
    fileSize,
    progress: 35,
    stage: 'Menyahkod struktur JSON & menapis entiti...'
  });

  const updateProgress = (percent: number, stage: string, entities?: number) => {
    reportFileLoadProgress({
      fileName,
      fileSize,
      progress: Math.min(95, Math.max(10, percent)),
      stage,
      totalEntities: entities
    });
  };

  const result = await task(updateProgress);

  reportFileLoadProgress({
    fileName,
    fileSize,
    progress: 100,
    stage: 'Selesai! Memaparkan nod atas Canvas...',
    isComplete: true
  });

  return result;
};

export const FileLoadProgressHUD: React.FC = () => {
  const [data, setData] = useState<FileLoadProgressDetail | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: any = null;

    const handleProgressEvent = (e: Event) => {
      const customEvent = e as CustomEvent<FileLoadProgressDetail>;
      if (!customEvent.detail) return;

      const detail = customEvent.detail;
      setData(detail);
      setVisible(true);

      if (hideTimer) clearTimeout(hideTimer);

      if (detail.progress >= 100 || detail.isComplete) {
        hideTimer = setTimeout(() => {
          setVisible(false);
          setTimeout(() => setData(null), 400);
        }, 2200);
      }
    };

    window.addEventListener('redhorizon:file-load-progress', handleProgressEvent);
    return () => {
      window.removeEventListener('redhorizon:file-load-progress', handleProgressEvent);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!visible || !data) return null;

  const pct = Math.min(100, Math.max(0, Math.round(data.progress)));
  const sizeKb = data.fileSize ? Math.round(data.fileSize / 1024) : null;
  const isFinished = pct >= 100;

  return (
    <div 
      id="file-load-progress-hud"
      className="fixed top-14 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-3 max-w-[92vw] w-80 md:w-96"
    >
      <div className="bg-zinc-950/95 border border-cyan-500/50 rounded-lg p-2.5 shadow-[0_0_25px_rgba(6,182,212,0.35)] backdrop-blur-md font-mono flex flex-col gap-1.5">
        
        {/* TOP ROW: Icon + File Name + % Number */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {isFinished ? (
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 animate-in zoom-in" />
            ) : (
              <Loader2 size={15} className="text-cyan-400 shrink-0 animate-spin" />
            )}
            
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-white truncate max-w-[190px] md:max-w-[240px]">
                {data.fileName || 'Memuatkan Fail Kes (.RHZ)'}
              </span>
              {sizeKb !== null && (
                <span className="text-[9px] text-gray-400">
                  Saiz: <span className="text-cyan-300 font-bold">{sizeKb} KB</span>
                  {data.totalEntities ? ` • ${data.totalEntities} Entiti` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-xs font-black tracking-tight ${isFinished ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {pct}%
            </span>
            <button 
              onClick={() => setVisible(false)}
              className="text-gray-500 hover:text-gray-300 p-0.5"
              title="Tutup indikator"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* COMPACT PROGRESS BAR */}
        <div className="w-full bg-zinc-900 border border-white/10 rounded-full h-2 overflow-hidden relative">
          <div 
            className={`h-full transition-all duration-300 rounded-full ${
              isFinished 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]' 
                : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 shadow-[0_0_10px_rgba(6,182,212,0.7)]'
            }`}
            style={{ width: `${pct}%` }}
          />
          {!isFinished && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
              style={{ width: '40%', animationDuration: '1s' }}
            />
          )}
        </div>

        {/* BOTTOM STAGE STATUS TEXT */}
        <div className="flex items-center justify-between text-[9px] text-gray-400">
          <span className="truncate text-cyan-200/90 font-mono">
            {data.stage || (isFinished ? 'Sedia di Canvas.' : 'Memproses struktur graf...')}
          </span>
          {isFinished && (
            <span className="text-emerald-400 font-bold shrink-0 flex items-center gap-1">
              <Sparkles size={10} /> Selesai
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
export default FileLoadProgressHUD;
