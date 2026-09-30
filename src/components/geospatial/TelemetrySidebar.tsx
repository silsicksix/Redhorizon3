import React, { useState, useEffect, useRef } from 'react';
import { TELEMETRY_NODES } from './MalaysianGeoCanvas';

export const TacticalPanel: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = ''
}) => {
  return (
    <div className={`clip-panel border border-cyan-400/25 bg-[#03161f]/75 backdrop-blur-md ${className}`}>
      <div className="flex items-center justify-between border-b border-cyan-400/20 px-3 py-1.5">
        <span className="font-mono text-[9px] font-bold tracking-[0.24em] text-cyan-300/90">
          {title}
        </span>
        <span className="flex gap-1">
          <i className="block h-1 w-1 bg-cyan-400/70" />
          <i className="block h-1 w-1 bg-cyan-400/40" />
          <i className="block h-1 w-1 bg-amber-400/80" />
        </span>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  );
};

// 1. Satellite Feeds
const getRandomPings = () => {
  return [...TELEMETRY_NODES]
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map(n => ({
      code: n.code,
      name: n.name,
      ping: (6 + Math.random() * 45).toFixed(0)
    }));
};

export const SatelliteFeeds: React.FC = () => {
  const [nodes, setNodes] = useState(getRandomPings);

  useEffect(() => {
    const timer = setInterval(() => setNodes(getRandomPings()), 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-1.5 font-mono text-[10px] text-cyan-200/85">
      {nodes.map(n => (
        <div key={n.code} className="flex items-center justify-between gap-2">
          <span className="font-bold text-cyan-400/80">{n.code}</span>
          <span className="flex-1 truncate text-[9px] text-cyan-100/70">{n.name}</span>
          <span className="font-bold text-amber-300">{n.ping}ms</span>
        </div>
      ))}
    </div>
  );
};

// 2. Network Integrity
export const NetworkIntegrity: React.FC = () => {
  const [metrics, setMetrics] = useState([82, 94, 88, 42]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(prev =>
        prev.map(val => Math.max(25, Math.min(99, val + (Math.random() - 0.5) * 18)))
      );
    }, 1100);
    return () => clearInterval(timer);
  }, []);

  const labels = ['UPLINK', 'ENKRIPSI', 'GPS LOCK', 'BEBAN'];

  return (
    <div className="space-y-2">
      {metrics.map((val, idx) => (
        <div key={labels[idx]}>
          <div className="flex justify-between font-mono text-[9px] text-cyan-400/80">
            <span>{labels[idx]}</span>
            <span className="font-bold text-cyan-100">{val.toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-1 w-full bg-cyan-950/80">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-amber-300 shadow-[0_0_8px_rgba(34,230,255,0.8)] transition-all duration-700"
              style={{ width: `${val}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// 3. System Log
const SYSTEM_LOGS = [
  'IMBASAN SEKTOR SEMENANJUNG... OK',
  'TRIANGULASI SABAH TERKUNCI',
  'PAKET 0x4F2A DISULITKAN',
  'NOD SARAWAK DISEGERAKKAN',
  'SUAPAN LIDAR: 1024 TITIK/S',
  'SAMBUNGAN SATELIT MEASAT-3D',
  'PROTOKOL AES-512 AKTIF',
  'ANOMALI TIADA DIKESAN',
  'KALIBRASI GRID 1° SELESAI',
  'BUFFER TELEMETRI DIBERSIHKAN'
];

export const SystemLogTicker: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const countRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      countRef.current++;
      setLogs(prev => [
        ...prev,
        `${String(countRef.current).padStart(3, '0')} ${SYSTEM_LOGS[countRef.current % SYSTEM_LOGS.length]}`
      ].slice(-5));
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-[74px] space-y-1 overflow-hidden font-mono text-[9px] leading-tight text-emerald-300/85">
      {logs.map((item, idx) => (
        <div key={`${item}-${idx}`} className="anim-rise truncate">
          <span className="text-emerald-500/70">›</span> {item}
        </div>
      ))}
    </div>
  );
};

// Left Sidebar Main Container
export const TelemetrySidebar: React.FC = () => {
  return (
    <div className="pointer-events-none absolute left-6 top-1/2 hidden w-64 -translate-y-1/2 flex-col gap-3 xl:flex z-10">
      <TacticalPanel title="SUAPAN SATELIT">
        <SatelliteFeeds />
      </TacticalPanel>

      <TacticalPanel title="INTEGRITI RANGKAIAN">
        <NetworkIntegrity />
      </TacticalPanel>

      <TacticalPanel title="LOG SISTEM">
        <SystemLogTicker />
      </TacticalPanel>
    </div>
  );
};
