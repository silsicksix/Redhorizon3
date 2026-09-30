import React from 'react';

export const RadarWidget: React.FC = () => {
  return (
    <div className="pointer-events-none absolute bottom-16 right-8 hidden h-44 w-44 lg:block">
      <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-[0_0_12px_rgba(34,230,255,0.35)]">
        <defs>
          <radialGradient id="radarFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0affd8" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#0891b2" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#031722" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22e6ff" stopOpacity="0" />
            <stop offset="100%" stopColor="#22e6ff" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Concentric Rings */}
        <circle cx="100" cy="100" r="92" fill="url(#radarFade)" stroke="#22e6ff" strokeWidth="1" strokeOpacity="0.5" />
        <circle cx="100" cy="100" r="68" fill="none" stroke="#22e6ff" strokeWidth="0.6" strokeOpacity="0.3" strokeDasharray="3 3" />
        <circle cx="100" cy="100" r="44" fill="none" stroke="#22e6ff" strokeWidth="0.6" strokeOpacity="0.35" />
        <circle cx="100" cy="100" r="20" fill="none" stroke="#22e6ff" strokeWidth="0.6" strokeOpacity="0.4" />

        {/* Crosshairs */}
        <line x1="8" y1="100" x2="192" y2="100" stroke="#22e6ff" strokeWidth="0.6" strokeOpacity="0.4" />
        <line x1="100" y1="8" x2="100" y2="192" stroke="#22e6ff" strokeWidth="0.6" strokeOpacity="0.4" />
        <line x1="35" y1="35" x2="165" y2="165" stroke="#22e6ff" strokeWidth="0.4" strokeOpacity="0.2" />
        <line x1="35" y1="165" x2="165" y2="35" stroke="#22e6ff" strokeWidth="0.4" strokeOpacity="0.2" />

        {/* Rotating Radar Sweep Cone */}
        <g className="anim-spin-slow origin-center">
          <path d="M100 100 L100 8 A92 92 0 0 1 185 64 Z" fill="url(#sweepGrad)" opacity="0.6" />
          <line x1="100" y1="100" x2="185" y2="64" stroke="#e0ffff" strokeWidth="1.2" />
        </g>

        {/* Rotating Outer Reticle */}
        <g className="anim-spin-rev origin-center">
          <circle cx="100" cy="100" r="86" fill="none" stroke="#ffb703" strokeWidth="0.8" strokeDasharray="6 24 2 12" strokeOpacity="0.55" />
        </g>

        {/* Blip Indicators */}
        <circle cx="140" cy="80" r="2.5" fill="#ffb703" className="animate-ping" />
        <circle cx="140" cy="80" r="2" fill="#ffb703" />
        <circle cx="70" cy="130" r="1.8" fill="#34d399" />
        <circle cx="125" cy="145" r="1.8" fill="#34d399" />

        {/* Radar Center Dot & Outer Labels */}
        <circle cx="100" cy="100" r="2.5" fill="#22e6ff" />
        <text x="104" y="24" fill="#22e6ff" fontSize="7" fontFamily="Share Tech Mono, monospace" fillOpacity="0.7">N 000°</text>
        <text x="168" y="104" fill="#22e6ff" fontSize="7" fontFamily="Share Tech Mono, monospace" fillOpacity="0.7">E 090°</text>
        <text x="104" y="188" fill="#22e6ff" fontSize="7" fontFamily="Share Tech Mono, monospace" fillOpacity="0.7">S 180°</text>
        <text x="14" y="104" fill="#22e6ff" fontSize="7" fontFamily="Share Tech Mono, monospace" fillOpacity="0.7">W 270°</text>
      </svg>
      <div className="mt-1 text-center font-mono text-[9px] tracking-[0.24em] text-cyan-400/80">
        IMBASAN UDARA & MARITIM
      </div>
    </div>
  );
};
