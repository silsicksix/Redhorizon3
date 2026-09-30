import React, { useState } from 'react';
import { 
  Globe, ExternalLink, X, MapPin, Smartphone, Zap, Navigation, ShieldCheck, CheckCircle2
} from 'lucide-react';

interface GoogleEarthModalProps {
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
}

export const GoogleEarthModal: React.FC<GoogleEarthModalProps> = ({
  onClose,
  initialLat = 3.1578,
  initialLng = 101.7120
}) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: initialLat, lng: initialLng });
  const [customInput, setCustomInput] = useState<string>(`${initialLat}, ${initialLng}`);
  const [lastStatus, setLastStatus] = useState<string>('');

  const presets = [
    { label: '🇲🇾 KL CC / Petronas Towers', lat: 3.1578, lng: 101.7120 },
    { label: '🇲🇾 Putrajaya Administrative Centre', lat: 2.9264, lng: 101.6964 },
    { label: '🇲🇾 Johor Bahru / CIQ Border', lat: 1.4655, lng: 103.7651 },
    { label: '🇸🇬 Singapore Woodlands Checkpoint', lat: 1.4432, lng: 103.7686 },
    { label: '🇮🇩 Jakarta Monas, Indonesia', lat: -6.1754, lng: 106.8272 },
    { label: '🇺🇸 New York City, USA', lat: 40.7128, lng: -74.0060 },
  ];

  // Helper to open external app link safely breaking out of iframe
  const launchUrl = (url: string, statusMsg: string) => {
    setLastStatus(statusMsg);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 150);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  // 1. Android Native Package Intent (com.google.earth)
  const handleAndroidIntent = () => {
    const intentUrl = `intent://earth.google.com/web/@${coords.lat},${coords.lng},1000a,35y,0h,0t,0r#Intent;scheme=https;package=com.google.earth;S.browser_fallback_url=${encodeURIComponent(`https://earth.google.com/web/@${coords.lat},${coords.lng},1000a,35y,0h,0t,0r`)};end`;
    launchUrl(intentUrl, `Membuka Google Earth via Android Intent (com.google.earth)...`);
  };

  // 2. Native Geo Intent (geo:) - Triggers OS app picker for Google Earth / Maps
  const handleGeoIntent = () => {
    const geoUrl = `geo:${coords.lat},${coords.lng}?q=${coords.lat},${coords.lng}(Google Earth 3D)`;
    launchUrl(geoUrl, `Membuka Native Geo Protocol (geo:${coords.lat},${coords.lng})...`);
  };

  // 3. Direct Google Earth Web URL
  const handleDirectWeb = () => {
    const webUrl = `https://earth.google.com/web/@${coords.lat},${coords.lng},1000a,35y,0h,0t,0r`;
    launchUrl(webUrl, `Membuka Google Earth Web 3D di Tab Baru...`);
  };

  const handleSelectPreset = (lat: number, lng: number) => {
    setCoords({ lat, lng });
    setCustomInput(`${lat}, ${lng}`);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = customInput.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setCoords({ lat, lng });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none p-2 sm:p-4 flex items-center justify-center overflow-y-auto">
      <div className="bg-zinc-950 border-2 border-blue-500/60 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl font-mono text-white flex flex-col pointer-events-auto">
        
        {/* HEADER */}
        <div className="p-3 bg-gradient-to-r from-blue-950 via-zinc-900 to-zinc-950 border-b border-blue-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-900/80 border border-blue-400 rounded-lg text-blue-300">
              <Globe size={18} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase text-blue-300">
                PELANCAR GOOGLE EARTH 3D
              </h2>
              <p className="text-[10px] text-zinc-400">Panggil terus Aplikasi Google Earth pada peranti mobile/desktop</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/40 rounded-lg text-red-300 cursor-pointer transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 space-y-4">
          
          {/* COORDINATES DISPLAY & FORM */}
          <div className="p-3 bg-zinc-900/80 border border-blue-500/30 rounded-xl space-y-2">
            <label className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <MapPin size={14} /> Koordinat Sasaran 3D:
            </label>
            <form onSubmit={handleInputSubmit} className="flex gap-2">
              <input 
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="cth: 3.1578, 101.7120"
                className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 border border-blue-400 text-blue-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                Set
              </button>
            </form>
          </div>

          {/* PRESETS */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
              Pilihan Lokasi Pantas:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(p.lat, p.lng)}
                  className={`px-2.5 py-1.5 text-left rounded-lg text-xs border transition-all cursor-pointer flex items-center justify-between ${
                    coords.lat === p.lat && coords.lng === p.lng
                      ? 'bg-blue-950 border-blue-400 text-blue-200 font-bold'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  <span className="truncate">{p.label}</span>
                  {coords.lat === p.lat && coords.lng === p.lng && (
                    <CheckCircle2 size={12} className="text-blue-400 shrink-0 ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* LAUNCH BUTTONS */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap size={14} /> Pilihan Kaedah Pelancaran Aplikasi Peranti:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              
              {/* ANDROID INTENT */}
              <button
                onClick={handleAndroidIntent}
                className="p-3 bg-blue-950/80 hover:bg-blue-900 border border-blue-400/80 hover:border-blue-300 rounded-xl text-left space-y-1 cursor-pointer transition-all hover:scale-[1.02] group shadow-lg"
              >
                <div className="text-xs font-bold text-blue-300 group-hover:text-blue-200 flex items-center gap-1.5">
                  <Smartphone size={16} /> Android Native Intent
                </div>
                <div className="text-[10px] text-zinc-400">
                  Buka terus App Google Earth terpasang (`com.google.earth`)
                </div>
              </button>

              {/* GEO INTENT */}
              <button
                onClick={handleGeoIntent}
                className="p-3 bg-teal-950/80 hover:bg-teal-900 border border-teal-400/80 hover:border-teal-300 rounded-xl text-left space-y-1 cursor-pointer transition-all hover:scale-[1.02] group shadow-lg"
              >
                <div className="text-xs font-bold text-teal-300 group-hover:text-teal-200 flex items-center gap-1.5">
                  <Navigation size={16} /> Native Geo URI (`geo:`)
                </div>
                <div className="text-[10px] text-zinc-400">
                  Pemicu pemilih aplikasi Android OS (Google Earth / Maps)
                </div>
              </button>

            </div>

            {/* DIRECT WEB LINK */}
            <button
              onClick={handleDirectWeb}
              className="w-full p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-xl text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <ExternalLink size={14} className="text-cyan-400" />
              <span>Buka Google Earth Web 3D di Tab Penyemak Imbas Baru</span>
            </button>
          </div>

          {/* STATUS DISPLAY */}
          {lastStatus && (
            <div className="p-2.5 bg-blue-950/60 border border-blue-500/40 rounded-lg text-xs text-blue-300 flex items-center gap-2">
              <ShieldCheck size={14} className="shrink-0" />
              <span className="truncate">{lastStatus}</span>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
          <span>REDHORIZON OSINT — GOOGLE EARTH LAUNCHER</span>
          <span>LAT: {coords.lat} | LNG: {coords.lng}</span>
        </div>

      </div>
    </div>
  );
};

export default GoogleEarthModal;
