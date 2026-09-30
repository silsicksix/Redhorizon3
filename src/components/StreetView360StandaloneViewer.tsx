import React, { useState } from 'react';
import { Compass, ExternalLink, ArrowLeft, Search, Shield, MapPin, Globe, CheckCircle } from 'lucide-react';

export default function StreetView360StandaloneViewer() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('query') || '3.1578, 101.7120'; // Default KLCC

  const [query, setQuery] = useState<string>(initialQuery);
  const [activeQuery, setActiveQuery] = useState<string>(initialQuery);

  // Helper to parse lat, lng
  const parseCoords = (text: string) => {
    const match = text.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
    if (match) {
      return { lat: match[1], lng: match[2] };
    }
    return null;
  };

  // Helper for Direct Android Google Maps App Intent
  const getAndroidAppIntentUrl = (targetQuery: string = activeQuery) => {
    const parsed = parseCoords(targetQuery);
    if (parsed) {
      return `google.streetview:cbll=${parsed.lat},${parsed.lng}`;
    }
    return `google.streetview:cbll=3.1578,101.7120`;
  };

  // Helper for Direct Google Earth Application Launch
  const getGoogleEarthAppUrl = (targetQuery: string = activeQuery) => {
    const parsed = parseCoords(targetQuery);
    if (parsed) {
      return `https://earth.google.com/web/@${parsed.lat},${parsed.lng},1000a,35y,0h,0t,0r`;
    }
    return `https://earth.google.com/web/search/${encodeURIComponent(targetQuery)}`;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setActiveQuery(query.trim());
    }
  };

  const cctvHotspots = [
    { label: '🇲🇾 DBKL KLCC', coords: '3.1578, 101.7120', name: 'KLCC Junction, Jalan Ampang' },
    { label: '🇲🇾 Federal Highway Subang', coords: '3.0815, 101.5832', name: 'Federal Highway Subang Toll' },
    { label: '🇲🇾 PLUS Highway Rawang', coords: '3.3221, 101.5768', name: 'PLUS Expressway Rawang' },
    { label: '🇲🇾 LDP Sunway', coords: '3.0732, 101.6075', name: 'LDP Highway Sunway' },
    { label: '🇲🇾 NKVE Damansara', coords: '3.1345, 101.6218', name: 'NKVE Toll Damansara' },
    { label: '🇲🇾 Penang Bridge (KM 4.2)', coords: '5.3536, 100.3512', name: 'Penang Bridge Middle Span' },
    { label: '🇲🇾 Johor CIQ Causeway', coords: '1.4655, 103.7651', name: 'Johor Bahru CIQ Complex' },
    { label: '🇸🇬 Woodlands Checkpoint', coords: '1.4432, 103.7686', name: 'Woodlands Checkpoint Singapore' },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col p-3 md:p-6 select-none">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-amber-500/40 pb-3 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.close()}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> TUTUP
          </button>
          <div>
            <h1 className="text-sm md:text-base font-bold text-amber-400 flex items-center gap-2">
              <Compass className="animate-spin text-amber-500" size={20} />
              PELANCAR MOD 3D STREET VIEWER & GOOGLE EARTH
            </h1>
            <p className="text-[11px] text-zinc-400">
              RedHorizon OSINT — Direct Native App Launcher (Google Maps 3D & Google Earth 3D)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded text-xs font-bold flex items-center gap-1.5">
            <CheckCircle size={14} /> NO IFRAME — DIRECT NATIVE APP LAUNCH
          </span>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-zinc-900 border border-amber-500/50 p-4 rounded-xl shadow-xl mb-6 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Masukkan Koordinat GPS / Nama Lokasi (contoh: 3.1578, 101.7120)..."
              className="w-full bg-black border border-amber-500/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
            />
            <Search size={16} className="absolute right-3 top-3 text-zinc-400" />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs md:text-sm rounded-lg transition-colors cursor-pointer"
          >
            SEMAK
          </button>
        </form>

        {/* HOTSPOT QUICK CHIPS */}
        <div className="space-y-1.5 pt-1">
          <div className="text-amber-400 font-bold text-xs flex items-center gap-1">
            <MapPin size={14} /> HOTSPOT CCTV POPULAR:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cctvHotspots.map((spot, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(spot.coords);
                  setActiveQuery(spot.coords);
                }}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all border ${
                  activeQuery === spot.coords
                    ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                    : 'bg-black hover:bg-amber-950 text-amber-300 border-amber-500/30'
                }`}
              >
                {spot.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVE LOCATION LAUNCH CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        
        {/* CARD 1: GOOGLE MAPS ANDROID APP NATIVE (MOD 3D STREET VIEWER) */}
        <div className="bg-gradient-to-br from-emerald-950/80 to-zinc-950 border-2 border-emerald-500/80 p-5 rounded-2xl flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-emerald-500 text-black font-bold rounded-md text-xs">
                APLIKASI GOOGLE MAPS NATIVE
              </span>
              <Shield className="text-emerald-400" size={20} />
            </div>

            <h2 className="text-base md:text-lg font-bold text-white mb-2">
              📱 APLIKASI GOOGLE MAPS (MOD 3D STREET VIEWER)
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Membuka paparan Mod 3D Street Viewer secara terus di dalam aplikasi asal Google Maps pada Samsung Galaxy Tab S8 / peranti Android anda.
            </p>

            <div className="p-3 bg-black/80 rounded-lg border border-emerald-500/40 text-xs text-emerald-300 font-mono mb-4">
              <div>KOORDINAT AKTIF:</div>
              <div className="text-white font-bold text-sm mt-0.5">{activeQuery}</div>
            </div>
          </div>

          <a
            href={getAndroidAppIntentUrl()}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-bold rounded-xl text-center flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.8)] transition-all cursor-pointer text-sm animate-pulse"
          >
            <ExternalLink size={18} />
            <span>BUKA SEKARANG (APP GOOGLE MAPS 3D)</span>
          </a>
        </div>

        {/* CARD 2: GOOGLE EARTH APPLICATION */}
        <div className="bg-gradient-to-br from-blue-950/80 to-zinc-950 border-2 border-cyan-500/80 p-5 rounded-2xl flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-cyan-500 text-black font-bold rounded-md text-xs">
                APLIKASI GOOGLE EARTH
              </span>
              <Globe className="text-cyan-400" size={20} />
            </div>

            <h2 className="text-base md:text-lg font-bold text-white mb-2">
              🌍 APLIKASI GOOGLE EARTH (MOD 3D EARTH)
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Membuka paparan 3D Globe dan bangunan 3D realistik secara terus di dalam aplikasi asal Google Earth yang dipasang pada tablet / telefon anda.
            </p>

            <div className="p-3 bg-black/80 rounded-lg border border-cyan-500/40 text-xs text-cyan-300 font-mono mb-4">
              <div>KOORDINAT AKTIF:</div>
              <div className="text-white font-bold text-sm mt-0.5">{activeQuery}</div>
            </div>
          </div>

          <a
            href={getGoogleEarthAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(6,182,212,0.6)] transition-all cursor-pointer text-sm"
          >
            <Globe size={18} />
            <span>BUKA SEKARANG (APP GOOGLE EARTH 3D)</span>
          </a>
        </div>

      </div>

      {/* FOOTER */}
      <div className="mt-6 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500 flex items-center justify-between font-mono">
        <span>REDHORIZON OSINT v2.9.1 — NATIVE APP DIRECT LAUNCHER</span>
        <span>MOD 3D STREET VIEWER & GOOGLE EARTH COMPATIBLE</span>
      </div>

    </div>
  );
}
