import React from 'react';

const STATUS_ITEMS = [
  'ENKRIPSI: KUANTUM-GELAP (RSA-4096 / AES-512)',
  'LOKASI: ZON EKONOMI EKSKLUSIF (ZEE) MALAYSIA',
  'NOD AKTIF: 16 HAB UTAMA TERHUBUNG',
  'STATUS: SISTEM SENTINEL DALAM TAHAP SIAP SIAGA',
  'TELEMETRI: MEASAT-3D STESYEN BUMI RAHSIA BESAR',
  'INTEGRITI GRID: 99.98% OPTIMUM'
];

export const StatusMarquee: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex h-7 items-center overflow-hidden border-t border-cyan-400/20 bg-[#020b12]/90 px-4 font-mono text-[9.5px] text-cyan-300/70 backdrop-blur-md">
      <div className="flex shrink-0 items-center gap-2 pr-4 text-amber-300 font-bold">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-400" />
        <span>STATUS LANGSUNG:</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex shrink-0 animate-marquee items-center gap-8 whitespace-nowrap">
          {STATUS_ITEMS.concat(STATUS_ITEMS).map((item, idx) => (
            <span key={idx} className="flex items-center gap-3">
              <span>{item}</span>
              <span className="text-cyan-600">■</span>
            </span>
          ))}
        </div>
      </div>

      <div className="hidden sm:flex shrink-0 items-center gap-4 pl-4 text-[9px] text-cyan-400/60 font-mono">
        <span>KOD SEKURITI: <strong className="text-cyan-200">#0x8F9C</strong></span>
        <span>LATENSI: <strong className="text-emerald-400">12ms</strong></span>
      </div>
    </div>
  );
};
