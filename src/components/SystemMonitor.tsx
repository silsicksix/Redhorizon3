
import React, { useState } from 'react';
import { Wifi, WifiOff, Loader2, Zap, Cpu, ChevronDown } from 'lucide-react';

interface SystemMonitorProps {
    backendStatus: 'online' | 'offline' | 'checking' | 'disabled';
    isMobile?: boolean;
}

const SystemMonitor: React.FC<SystemMonitorProps> = ({ backendStatus, isMobile }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusDisplay = () => {
      if (backendStatus === 'online') {
          return {
              color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
              badgeColor: 'bg-emerald-500',
              icon: <Wifi size={11} className="text-emerald-400" />,
              text: 'UPLINK ACTIVE',
              subText: isMobile ? 'MOBILE_NODE_ONLINE' : 'STATION_NODE_ONLINE',
          };
      }
      if (backendStatus === 'offline') {
          return {
              color: 'text-red-400 bg-red-950/60 border-red-500/50',
              badgeColor: 'bg-red-500',
              icon: <WifiOff size={11} className="text-red-400" />,
              text: 'LINK SEVERED',
              subText: 'BACKEND_UNREACHABLE',
          };
      }
      if (backendStatus === 'checking') {
          return {
              color: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
              badgeColor: 'bg-amber-500',
              icon: <Loader2 size={11} className="text-amber-400 animate-spin" />,
              text: 'SYNCING',
              subText: 'WAITING_FOR_ACK',
          };
      }
      return {
          color: 'text-zinc-300 bg-black/60 border-zinc-700/60',
          badgeColor: 'bg-zinc-500',
          icon: <Zap size={11} className="text-zinc-400" />,
          text: 'STANDALONE',
          subText: isMobile ? 'MOBILE_LOCAL_ONLY' : 'STATION_LOCAL_ONLY',
      };
  };

  const status = getStatusDisplay();
  const archLabel = isMobile ? 'ARM64' : 'X64';

  return (
    <div className="relative shrink-0 font-mono text-[9px]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all hover:border-cyan-400/80 cursor-pointer shadow-sm ${status.color}`}
        title={`Seni Bina: ${isMobile ? 'ANDROID_ARM64' : 'DESKTOP_X64'} | Status: ${status.text} (${status.subText})`}
      >
        {/* Arch Indicator */}
        <span className="flex items-center gap-1 text-zinc-300 font-bold border-r border-white/10 pr-1.5">
          <Cpu size={11} className="text-cyan-400" />
          <span>{archLabel}</span>
        </span>

        {/* Status Indicator */}
        <span className="flex items-center gap-1 font-black uppercase tracking-wider">
          {status.icon}
          <span>{status.text}</span>
        </span>

        <ChevronDown size={10} className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[190]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-60 bg-[#0d0d0d] border border-cyan-500/40 rounded-lg shadow-2xl z-[200] p-2.5 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 text-[9px] font-bold text-cyan-400 uppercase">
              <span className="flex items-center gap-1">
                <Cpu size={12} /> Status Stesen & Arkitektur
              </span>
              <span className="text-emerald-400">{archLabel}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] bg-black/60 p-2 rounded border border-zinc-800">
                <span className="text-zinc-400">Seni Bina (Arch):</span>
                <span className="text-white font-bold">{isMobile ? 'ANDROID_ARM64' : 'DESKTOP_X64'}</span>
              </div>

              <div className="flex items-center justify-between text-[10px] bg-black/60 p-2 rounded border border-zinc-800">
                <span className="text-zinc-400">Status Sambungan:</span>
                <span className={`font-bold uppercase ${status.color.split(' ')[0]}`}>
                  {status.text}
                </span>
              </div>

              <div className="text-[9px] text-zinc-500 bg-zinc-950 p-1.5 rounded border border-zinc-900 font-mono text-center truncate">
                Mod Operasi: <span className="text-zinc-300 font-bold">{status.subText}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemMonitor;

