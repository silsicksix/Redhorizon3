import React, { useState, useEffect, useRef } from 'react';
import { 
  Minus, 
  Square, 
  Maximize2, 
  Minimize2, 
  X, 
  Move, 
  Layers, 
  Sparkles,
  ChevronUp,
  Maximize,
  Minimize
} from 'lucide-react';

export interface TacticalModalWrapperProps {
  modalId: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onMinimizeToggle: () => void;
  children: React.ReactNode;
  defaultWidth?: number | string;
  defaultHeight?: number | string;
  minWidth?: number;
  minHeight?: number;
  accentColor?: string; // default red/cyan
}

export const TacticalModalWrapper: React.FC<TacticalModalWrapperProps> = ({
  modalId,
  title,
  subtitle,
  icon,
  isOpen,
  isMinimized,
  onClose,
  onMinimizeToggle,
  children,
  defaultWidth = 1100,
  defaultHeight = 780,
  minWidth = 500,
  minHeight = 400,
  accentColor = '#ff0033'
}) => {
  // Stored dimensions in localStorage per modalId
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem(`redhorizon_modal_width_${modalId}`);
    if (saved) {
      const num = Number(saved);
      if (!isNaN(num) && num > 300) return Math.min(window.innerWidth - 20, num);
    }
    return typeof defaultWidth === 'number' ? Math.min(window.innerWidth - 40, defaultWidth) : 1100;
  });

  const [height, setHeight] = useState<number>(() => {
    const saved = localStorage.getItem(`redhorizon_modal_height_${modalId}`);
    if (saved) {
      const num = Number(saved);
      if (!isNaN(num) && num > 300) return Math.min(window.innerHeight - 30, num);
    }
    return typeof defaultHeight === 'number' ? Math.min(window.innerHeight - 50, defaultHeight) : 780;
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return localStorage.getItem(`redhorizon_modal_fullscreen_${modalId}`) === 'true';
  });

  const [resizing, setResizing] = useState<'right' | 'bottom' | 'corner' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize listener
  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        
        if (resizing === 'right' || resizing === 'corner') {
          const newW = Math.max(minWidth, Math.min(window.innerWidth - 20, (clientX - rect.left) * 2));
          setWidth(newW);
          localStorage.setItem(`redhorizon_modal_width_${modalId}`, String(Math.round(newW)));
        }

        if (resizing === 'bottom' || resizing === 'corner') {
          const newH = Math.max(minHeight, Math.min(window.innerHeight - 40, (clientY - rect.top) * 2));
          setHeight(newH);
          localStorage.setItem(`redhorizon_modal_height_${modalId}`, String(Math.round(newH)));
        }
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [resizing, modalId, minWidth, minHeight]);

  if (!isOpen) return null;
  if (isMinimized) return null; // Rendered in MinimizedDock bar

  const toggleFullscreen = () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    localStorage.setItem(`redhorizon_modal_fullscreen_${modalId}`, String(next));
  };

  const setPreset = (preset: 'compact' | 'normal' | 'wide' | 'fullscreen') => {
    if (preset === 'fullscreen') {
      setIsFullscreen(true);
      localStorage.setItem(`redhorizon_modal_fullscreen_${modalId}`, 'true');
      return;
    }

    setIsFullscreen(false);
    localStorage.setItem(`redhorizon_modal_fullscreen_${modalId}`, 'false');

    let w = 1100;
    let h = 780;

    if (preset === 'compact') {
      w = Math.min(window.innerWidth - 40, 820);
      h = Math.min(window.innerHeight - 60, 580);
    } else if (preset === 'normal') {
      w = Math.min(window.innerWidth - 40, 1100);
      h = Math.min(window.innerHeight - 60, 780);
    } else if (preset === 'wide') {
      w = Math.min(window.innerWidth - 30, Math.floor(window.innerWidth * 0.94));
      h = Math.min(window.innerHeight - 40, Math.floor(window.innerHeight * 0.92));
    }

    setWidth(w);
    setHeight(h);
    localStorage.setItem(`redhorizon_modal_width_${modalId}`, String(w));
    localStorage.setItem(`redhorizon_modal_height_${modalId}`, String(h));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Resizable Modal Window Container */}
      <div 
        ref={containerRef}
        style={isFullscreen ? {
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          borderRadius: 0
        } : {
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '98vw',
          maxHeight: '96vh'
        }}
        className={`relative flex flex-col bg-[#080808] border border-red-500/40 rounded-xl shadow-[0_0_50px_rgba(255,0,51,0.25)] overflow-hidden transition-[width,height] ${
          resizing ? 'transition-none pointer-events-auto select-none' : 'duration-150'
        }`}
      >
        
        {/* RESIZE DRAG HANDLERS (when not fullscreen) */}
        {!isFullscreen && (
          <>
            {/* Right Resizer */}
            <div 
              onMouseDown={(e) => { e.preventDefault(); setResizing('right'); }}
              onTouchStart={() => setResizing('right')}
              title="Tarik untuk laraskan kelebaran tetingkap modul"
              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-red-500/50 z-50 transition-colors flex items-center justify-center group"
            >
              <div className="w-0.5 h-12 bg-red-500/30 group-hover:bg-red-400 transition-colors rounded-full" />
            </div>

            {/* Bottom Resizer */}
            <div 
              onMouseDown={(e) => { e.preventDefault(); setResizing('bottom'); }}
              onTouchStart={() => setResizing('bottom')}
              title="Tarik untuk laraskan ketinggian tetingkap modul"
              className="absolute left-0 right-0 bottom-0 h-2.5 cursor-ns-resize hover:bg-red-500/50 z-50 transition-colors flex items-center justify-center group"
            >
              <div className="h-0.5 w-16 bg-red-500/30 group-hover:bg-red-400 transition-colors rounded-full" />
            </div>

            {/* Bottom-Right Corner Resizer */}
            <div 
              onMouseDown={(e) => { e.preventDefault(); setResizing('corner'); }}
              onTouchStart={() => setResizing('corner')}
              title="Tarik penjuru untuk laraskan kelebaran & ketinggian serentak"
              className="absolute right-0 bottom-0 w-5 h-5 cursor-nwse-resize hover:bg-red-500/70 z-50 transition-colors rounded-tl-lg flex items-end justify-end p-0.5"
            >
              <div className="w-2 h-2 border-r-2 border-b-2 border-red-400/80" />
            </div>
          </>
        )}

        {/* UNIVERSAL TOP TACTICAL CONTROL BAR */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#120406] via-[#1a080c] to-[#0c0406] border-b border-red-500/40 select-none shrink-0">
          
          {/* Left Title & Status */}
          <div className="flex items-center gap-2.5 overflow-hidden">
            {icon && (
              <div className="text-red-400 shrink-0 flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs md:text-sm text-white tracking-wider truncate uppercase">
                  {title}
                </span>
                <span className="text-[8px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-mono font-bold border border-red-500/40 uppercase hidden sm:inline">
                  MODUL AKTIF
                </span>
                {!isFullscreen && (
                  <span className="text-[9px] font-mono text-zinc-500 hidden md:inline">
                    ({Math.round(width)} × {Math.round(height)}px)
                  </span>
                )}
              </div>
              {subtitle && (
                <span className="text-[9px] font-mono text-zinc-400 truncate">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Right Window Action Controls (Presets, Minimize, Maximize, Close) */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* Quick Size Presets */}
            <div className="hidden sm:flex items-center gap-0.5 bg-black/80 p-0.5 rounded border border-red-500/30 text-[8px] font-mono mr-1">
              <button
                onClick={() => setPreset('compact')}
                className="px-1.5 py-0.5 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                title="Saiz Kompak (820px)"
              >
                Kompak
              </button>
              <button
                onClick={() => setPreset('normal')}
                className="px-1.5 py-0.5 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                title="Saiz Standard (1100px)"
              >
                Standard
              </button>
              <button
                onClick={() => setPreset('wide')}
                className="px-1.5 py-0.5 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                title="Saiz Lebar (94%)"
              >
                Lebar
              </button>
            </div>

            {/* Minimize Button */}
            <button
              onClick={onMinimizeToggle}
              title="Kecilkan tetingkap ke bar dock bawah (Minimize)"
              className="p-1 rounded text-zinc-400 hover:text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <Minus size={14} />
            </button>

            {/* Maximize / Restore Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Kembalikan saiz tetingkap" : "Paparan Skrin Penuh (Maximize)"}
              className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="Tutup tetingkap modul"
              className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* MODAL MAIN CONTENT CONTAINER */}
        <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
          {children}
        </div>

      </div>
    </div>
  );
};
