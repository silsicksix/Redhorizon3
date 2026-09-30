import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type TooltipAccent = 'cyan' | 'amber' | 'emerald' | 'rose' | 'purple' | 'blue';

export interface TooltipProps {
  content?: string;
  title?: string;
  tutorial?: string;
  tip?: string;
  shortcut?: string;
  category?: string;
  accentColor?: TooltipAccent;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
  className?: string;
}

const ACCENT_STYLES: Record<TooltipAccent, {
  border: string;
  bgGlow: string;
  titleText: string;
  badgeBg: string;
  corner: string;
  tipText: string;
}> = {
  cyan: {
    border: 'border-cyan-400/50',
    bgGlow: 'shadow-[0_0_25px_rgba(34,230,255,0.25)]',
    titleText: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300',
    corner: 'border-cyan-400',
    tipText: 'text-cyan-400/90'
  },
  amber: {
    border: 'border-amber-400/50',
    bgGlow: 'shadow-[0_0_25px_rgba(255,183,3,0.25)]',
    titleText: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
    corner: 'border-amber-400',
    tipText: 'text-amber-400/90'
  },
  emerald: {
    border: 'border-emerald-400/50',
    bgGlow: 'shadow-[0_0_25px_rgba(16,185,129,0.25)]',
    titleText: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
    corner: 'border-emerald-400',
    tipText: 'text-emerald-400/90'
  },
  rose: {
    border: 'border-rose-400/50',
    bgGlow: 'shadow-[0_0_25px_rgba(244,63,94,0.25)]',
    titleText: 'text-rose-300',
    badgeBg: 'bg-rose-500/20 border-rose-400/40 text-rose-300',
    corner: 'border-rose-400',
    tipText: 'text-rose-400/90'
  },
  purple: {
    border: 'border-purple-400/50',
    bgGlow: 'shadow-[0_0_25px_rgba(168,85,247,0.25)]',
    titleText: 'text-purple-300',
    badgeBg: 'bg-purple-500/20 border-purple-400/40 text-purple-300',
    corner: 'border-purple-400',
    tipText: 'text-purple-400/90'
  },
  blue: {
    border: 'border-blue-400/50',
    bgGlow: 'shadow-[0_0_25px_rgba(59,130,246,0.25)]',
    titleText: 'text-blue-300',
    badgeBg: 'bg-blue-500/20 border-blue-400/40 text-blue-300',
    corner: 'border-blue-400',
    tipText: 'text-blue-400/90'
  }
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  title,
  tutorial,
  tip,
  shortcut,
  category,
  accentColor = 'cyan',
  children,
  position = 'bottom',
  delay = 150,
  disabled = false,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    transform: string;
    actualPosition: 'top' | 'bottom' | 'left' | 'right';
  }>({
    top: 0,
    left: 0,
    transform: 'translate(-50%, 0)',
    actualPosition: position
  });

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let computedPosition = position;

    // Check if bottom overflows viewport
    if (computedPosition === 'bottom' && rect.bottom + 220 > vh && rect.top > 220) {
      computedPosition = 'top';
    } else if (computedPosition === 'top' && rect.top < 220 && rect.bottom + 220 <= vh) {
      computedPosition = 'bottom';
    }

    let top = 0;
    let left = 0;
    let transform = 'translate(-50%, 0)';

    // Approximate width half to prevent edge overflow
    const halfWidth = 160;

    if (computedPosition === 'bottom') {
      top = rect.bottom + 8;
      left = Math.max(halfWidth + 12, Math.min(vw - halfWidth - 12, rect.left + rect.width / 2));
      transform = 'translate(-50%, 0)';
    } else if (computedPosition === 'top') {
      top = rect.top - 8;
      left = Math.max(halfWidth + 12, Math.min(vw - halfWidth - 12, rect.left + rect.width / 2));
      transform = 'translate(-50%, -100%)';
    } else if (computedPosition === 'left') {
      top = Math.max(60, Math.min(vh - 60, rect.top + rect.height / 2));
      left = rect.left - 8;
      transform = 'translate(-100%, -50%)';
    } else if (computedPosition === 'right') {
      top = Math.max(60, Math.min(vh - 60, rect.top + rect.height / 2));
      left = rect.right + 8;
      transform = 'translate(0, -50%)';
    }

    setCoords({
      top,
      left,
      transform,
      actualPosition: computedPosition
    });
  }, [position]);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updatePosition();
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const handleClickOrPointer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;
    const handleGlobalClickOrDismiss = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsVisible(false);
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('pointerdown', handleGlobalClickOrDismiss, true);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('pointerdown', handleGlobalClickOrDismiss, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // If there's neither content nor title/tutorial, render children directly
  if (!content && !title && !tutorial) {
    return <>{children}</>;
  }

  const isRichTutorial = !!(title || tutorial || tip || shortcut || category);
  const styles = ACCENT_STYLES[accentColor] || ACCENT_STYLES.cyan;

  const tooltipElement = isVisible && typeof document !== 'undefined' ? (
    createPortal(
      <div
        style={{
          position: 'fixed',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          transform: coords.transform,
          zIndex: 99999999
        }}
        className="pointer-events-none transition-opacity duration-150 animate-in fade-in zoom-in-95"
      >
        {isRichTutorial ? (
          /* RICH TACTICAL MICRO-TUTORIAL HUD TOOLTIP */
          <div
            className={`w-72 sm:w-80 rounded-md border ${styles.border} bg-[#020b12]/98 p-3 font-mono text-xs backdrop-blur-2xl ${styles.bgGlow} relative overflow-hidden shadow-2xl ring-1 ring-white/10`}
          >
            {/* Tactical Corner Accents */}
            <span className={`absolute left-0 top-0 h-1.5 w-1.5 border-l-2 border-t-2 ${styles.corner}`} />
            <span className={`absolute right-0 top-0 h-1.5 w-1.5 border-r-2 border-t-2 ${styles.corner}`} />
            <span className={`absolute bottom-0 left-0 h-1.5 w-1.5 border-b-2 border-l-2 ${styles.corner}`} />
            <span className={`absolute bottom-0 right-0 h-1.5 w-1.5 border-b-2 border-r-2 ${styles.corner}`} />

            {/* Header: Title + Category / Shortcut */}
            <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-1.5">
              <div className="flex flex-col">
                {category && (
                  <span className={`inline-block w-max px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider rounded border ${styles.badgeBg} mb-0.5`}>
                    {category}
                  </span>
                )}
                <span className={`font-bold tracking-wide text-xs ${styles.titleText}`}>
                  {title || content}
                </span>
              </div>

              {shortcut && (
                <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-gray-300 border border-white/15 shadow-inner">
                  {shortcut}
                </span>
              )}
            </div>

            {/* Body: Tutorial Explanation */}
            {tutorial && (
              <div className="mt-2 text-[10.5px] leading-relaxed text-slate-200 font-sans">
                {tutorial}
              </div>
            )}

            {/* Simple content fallback if no separate tutorial */}
            {!tutorial && content && (
              <div className="mt-1.5 text-[10.5px] leading-relaxed text-slate-300 font-sans">
                {content}
              </div>
            )}

            {/* Footer: Tactical Tip / Best Practice */}
            {tip && (
              <div className="mt-2.5 flex items-start gap-1.5 border-t border-white/10 pt-1.5 text-[9.5px] leading-tight text-amber-200/90 font-mono">
                <span className="shrink-0 text-amber-400 font-bold">💡 TIPS:</span>
                <span>{tip}</span>
              </div>
            )}
          </div>
        ) : (
          /* SIMPLE COMPACT TACTICAL TOOLTIP */
          <div
            className={`whitespace-nowrap rounded border ${styles.border} bg-[#020b12]/98 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200 shadow-2xl backdrop-blur-2xl ${styles.bgGlow} ring-1 ring-white/10`}
          >
            {content}
          </div>
        )}
      </div>,
      document.body
    )
  ) : null;

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClickOrPointer}
    >
      {children}
      {tooltipElement}
    </div>
  );
};

export default Tooltip;
