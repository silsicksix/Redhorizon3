import React from 'react';

interface GeoCursorTrackerProps {
  pos: { x: number; y: number };
}

export const GeoCursorTracker: React.FC<GeoCursorTrackerProps> = ({ pos }) => {
  if (pos.x < 0 || pos.y < 0) return null;

  // Approximate Malaysian geospatial coordinate mapping from screen coordinates
  const lat = (7.5 - (pos.y / (typeof window !== 'undefined' ? window.innerHeight : 800)) * 6.5).toFixed(4);
  const lng = (99.5 + (pos.x / (typeof window !== 'undefined' ? window.innerWidth : 1280)) * 20.0).toFixed(4);

  return (
    <div
      className="pointer-events-none fixed z-30 hidden font-mono text-[9px] leading-tight text-cyan-300 md:block transition-transform duration-75"
      style={{
        left: `${pos.x + 16}px`,
        top: `${pos.y + 16}px`
      }}
    >
      <div className="flex items-center gap-1.5 border border-cyan-400/30 bg-[#02121b]/85 px-2 py-1 shadow-[0_0_12px_rgba(34,230,255,0.3)] backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="text-amber-300 font-bold">{lat}°N</span>
        <span className="text-cyan-400/60">/</span>
        <span className="text-cyan-200 font-bold">{lng}°E</span>
      </div>
    </div>
  );
};
