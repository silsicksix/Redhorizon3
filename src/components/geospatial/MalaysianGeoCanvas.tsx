import React, { useEffect, useRef, useState } from 'react';

// Exact geospatial projection parameters matching Malaysian coordinates
const MAP_W = 1000;
const MAP_H = 400;
const LNG_MIN = 98.8;
const LNG_SPAN = 21.4;
const LAT_MAX = 7.9;
const SCALE_FACTOR = MAP_W / LNG_SPAN;

export function projectCoordinate([lng, lat]: [number, number]): [number, number] {
  return [
    (lng - LNG_MIN) * SCALE_FACTOR,
    (LAT_MAX - lat) * SCALE_FACTOR
  ];
}

export function generateSvgPath(points: Array<[number, number]>): string {
  if (!points || points.length === 0) return '';
  return points.map((coord, i) => {
    const [x, y] = projectCoordinate(coord);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

// 1. High-Fidelity Vector Geometries for Semenanjung, Sarawak & Sabah (Detailed Coastlines)
export const MALAYSIA_REGIONS: Array<{ id: string; name: string; poly: Array<[number, number]> }> = [
  {
    id: 'semenanjung',
    name: 'Semenanjung Malaysia',
    poly: [
      [100.18, 6.72], [100.28, 6.64], [100.42, 6.48], [100.72, 6.32], [101.02, 5.92], 
      [101.42, 5.75], [101.88, 5.96], [102.16, 6.22], [102.26, 6.16], [102.42, 5.98], 
      [102.62, 5.82], [102.82, 5.68], [103.14, 5.34], [103.32, 4.96], [103.44, 4.78], 
      [103.46, 4.42], [103.44, 4.22], [103.40, 4.02], [103.34, 3.82], [103.38, 3.52], 
      [103.52, 3.12], [103.64, 2.82], [103.78, 2.64], [103.88, 2.44], [104.14, 2.12], 
      [104.28, 1.84], [104.24, 1.58], [104.12, 1.34], [103.82, 1.46], [103.62, 1.38], 
      [103.51, 1.26], [103.44, 1.48], [103.28, 1.68], [102.94, 1.86], [102.56, 2.06], 
      [102.24, 2.18], [102.04, 2.38], [101.82, 2.52], [101.56, 2.76], [101.38, 2.92], 
      [101.28, 3.02], [101.22, 3.26], [101.24, 3.42], [101.12, 3.68], [100.94, 3.86], 
      [100.82, 4.02], [100.62, 4.22], [100.56, 4.46], [100.62, 4.74], [100.42, 5.12], 
      [100.38, 5.42], [100.34, 5.62], [100.28, 6.02], [100.24, 6.12], [100.16, 6.38], 
      [100.12, 6.48], [100.18, 6.72]
    ]
  },
  {
    id: 'sarawak',
    name: 'Sarawak',
    poly: [
      [109.64, 2.08], [109.78, 1.82], [109.88, 1.68], [110.12, 1.74], [110.32, 1.72], 
      [110.48, 1.62], [110.62, 1.52], [110.92, 1.42], [111.14, 1.54], [111.28, 1.78], 
      [111.42, 2.04], [111.32, 2.32], [111.58, 2.52], [112.08, 2.92], [112.44, 3.06], 
      [112.82, 3.18], [113.04, 3.18], [113.12, 3.32], [113.38, 3.52], [113.68, 3.82], 
      [113.88, 4.02], [113.98, 4.38], [114.02, 4.54], [114.08, 4.60], [114.36, 4.58], 
      [114.78, 4.34], [115.02, 4.76], [115.24, 4.96], [115.42, 5.02], [115.58, 4.42], 
      [115.42, 3.82], [115.12, 3.28], [114.62, 2.84], [114.18, 2.38], [113.72, 1.94], 
      [113.18, 1.62], [112.44, 1.38], [111.82, 1.12], [111.24, 0.98], [110.62, 1.08], 
      [109.84, 1.42], [109.64, 2.08]
    ]
  },
  {
    id: 'sabah',
    name: 'Sabah',
    poly: [
      [115.42, 5.02], [115.58, 5.28], [115.82, 5.58], [116.06, 5.96], [116.18, 6.18], 
      [116.42, 6.42], [116.68, 6.82], [116.74, 7.03], [116.84, 6.88], [117.02, 6.58], 
      [117.22, 6.72], [117.48, 6.64], [117.72, 6.22], [118.02, 5.94], [118.12, 5.84], 
      [118.42, 5.72], [118.98, 5.52], [119.27, 5.24], [118.98, 4.96], [118.62, 4.88], 
      [118.34, 4.68], [118.62, 4.42], [118.24, 4.22], [117.89, 4.24], [117.68, 4.16], 
      [117.22, 4.16], [116.82, 4.38], [116.24, 4.62], [115.82, 4.88], [115.42, 5.02]
    ]
  }
];

// Strategic Federal & State Islands
export const MALAYSIA_ISLANDS: Array<{ name: string; at: [number, number]; r: number }> = [
  { name: 'Langkawi', at: [99.78, 6.36], r: 5.5 },
  { name: 'Penang', at: [100.26, 5.38], r: 4.8 },
  { name: 'Pangkor', at: [100.56, 4.22], r: 3.2 },
  { name: 'Tioman', at: [104.16, 2.78], r: 3.6 },
  { name: 'Labuan', at: [115.24, 5.32], r: 4.5 },
  { name: 'Redang', at: [103.01, 5.77], r: 3.2 },
  { name: 'Perhentian', at: [102.75, 5.90], r: 2.8 },
  { name: 'Banggi', at: [117.16, 7.24], r: 4.2 },
  { name: 'Layang-Layang', at: [113.84, 7.38], r: 2.8 }
];

// State Internal Boundaries (Tactical Lines)
export const STATE_INTERIOR_LINES: Array<Array<[number, number]>> = [
  // Perak / Pahang / Selangor Main Range (Banjaran Titiwangsa)
  [[101.42, 5.75], [101.55, 4.80], [101.75, 3.80], [101.90, 3.05], [102.16, 2.42]],
  // Kelantan / Terengganu
  [[102.26, 5.80], [102.55, 5.20], [102.80, 4.60]],
  // Pahang / Johor
  [[102.80, 2.60], [103.40, 2.50], [103.78, 2.64]],
  // Sarawak Divisions (Kuching - Sibu - Bintulu - Miri)
  [[111.42, 2.04], [111.60, 1.40]],
  [[113.04, 3.18], [113.20, 2.20]],
  // Sabah Divisions (West Coast - Sandakan - Tawau)
  [[116.74, 6.00], [117.10, 5.20], [117.68, 4.16]]
];

// Strategic Intelligence & Telemetry Nodes across Malaysia
export interface TelemetryNode {
  code: string;
  name: string;
  at: [number, number];
  tier: number;
}

export const TELEMETRY_NODES: TelemetryNode[] = [
  { code: 'KUL', name: 'Kuala Lumpur HQ', at: [101.69, 3.14], tier: 1 },
  { code: 'PJY', name: 'Cyberjaya Core', at: [101.65, 2.92], tier: 2 },
  { code: 'JHB', name: 'Johor Gateway', at: [103.76, 1.49], tier: 1 },
  { code: 'PEN', name: 'Penang Node', at: [100.33, 5.41], tier: 1 },
  { code: 'IPH', name: 'Ipoh Relay', at: [101.09, 4.59], tier: 2 },
  { code: 'KBR', name: 'Kota Bharu', at: [102.24, 6.12], tier: 2 },
  { code: 'TGG', name: 'K. Terengganu', at: [103.14, 5.33], tier: 2 },
  { code: 'KTN', name: 'Kuantan Fiber', at: [103.33, 3.81], tier: 1 },
  { code: 'MKZ', name: 'Melaka Straits', at: [102.25, 2.19], tier: 2 },
  { code: 'KCH', name: 'Kuching Borneo', at: [110.36, 1.55], tier: 1 },
  { code: 'SBW', name: 'Sibu Mid-Point', at: [111.83, 2.30], tier: 2 },
  { code: 'BTU', name: 'Bintulu Hub', at: [113.04, 3.17], tier: 2 },
  { code: 'MYY', name: 'Miri Intel', at: [113.99, 4.39], tier: 1 },
  { code: 'BKI', name: 'Kota Kinabalu', at: [116.07, 5.98], tier: 1 },
  { code: 'SDK', name: 'Sandakan Radar', at: [118.12, 5.84], tier: 2 },
  { code: 'TWU', name: 'Tawau ESSZONE', at: [117.89, 4.24], tier: 1 }
];

export const NODE_LOOKUP: Record<string, TelemetryNode> = TELEMETRY_NODES.reduce(
  (acc, item) => {
    acc[item.code] = item;
    return acc;
  },
  {} as Record<string, TelemetryNode>
);

// High-speed Subsea & Interstate Cyber Mesh Links
export const SUBSEA_LINKS: Array<[string, string]> = [
  ['PEN', 'IPH'],
  ['IPH', 'KUL'],
  ['KUL', 'PJY'],
  ['PJY', 'MKZ'],
  ['MKZ', 'JHB'],
  ['KBR', 'TGG'],
  ['TGG', 'KTN'],
  ['KTN', 'KUL'],
  ['KTN', 'MYY'],      // East Coast -> Miri subsea cable
  ['KUL', 'KCH'],      // KL -> Kuching submarine trunk line
  ['JHB', 'KCH'],      // Southern subsea fiber
  ['KCH', 'SBW'],
  ['SBW', 'BTU'],
  ['BTU', 'MYY'],
  ['MYY', 'BKI'],
  ['BKI', 'SDK'],
  ['SDK', 'TWU']
];

interface MalaysianGeoCanvasProps {
  pointerPos?: { x: number; y: number };
  isScanning?: boolean;
  customBgUrl?: string | null;
  customBgOpacity?: number;
}

export const MalaysianGeoCanvas: React.FC<MalaysianGeoCanvasProps> = ({
  pointerPos = { x: -9999, y: -9999 },
  isScanning = false,
  customBgUrl = null,
  customBgOpacity = 0.65
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [layout, setLayout] = useState({
    w: 1200,
    h: 600,
    scale: 1,
    ox: 0,
    oy: 0
  });

  const pointerRef = useRef(pointerPos);
  useEffect(() => {
    pointerRef.current = pointerPos;
  }, [pointerPos]);

  const scanningRef = useRef(isScanning);
  useEffect(() => {
    scanningRef.current = isScanning;
  }, [isScanning]);

  // Window Resize Observer for Precise Geospatial Matrix
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth || 1200;
      const h = window.innerHeight || 600;

      // Fit 1000x400 map centered with comfortable padding
      const scale = Math.min((w * 0.90) / MAP_W, (h * 0.82) / MAP_H);
      const ox = (w - MAP_W * scale) / 2;
      const oy = (h - MAP_H * scale) / 2;

      setLayout({ w, h, scale, ox, oy });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Curated, Minimal & Elegant Plexus Animation (Reduced clutter, ultra sleek)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = layout.w * dpr;
    canvas.height = layout.h * dpr;
    canvas.style.width = `${layout.w}px`;
    canvas.style.height = `${layout.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Generate curated, minimal points around Malaysia regions + strategic nodes
    const particles: Array<{
      x: number;
      y: number;
      ax: number;
      ay: number;
      vx: number;
      vy: number;
      kind: number;
      spd: number;
      amp: number;
      phase: number;
    }> = [];

    // 1. Anchored Node Particles for each telemetry site
    TELEMETRY_NODES.forEach((n) => {
      const [px, py] = projectCoordinate(n.at);
      const sx = layout.ox + px * layout.scale;
      const sy = layout.oy + py * layout.scale;
      particles.push({
        x: sx,
        y: sy,
        ax: sx,
        ay: sy,
        vx: 0,
        vy: 0,
        kind: 0, // High-importance telemetry node
        spd: 0.4,
        amp: 1.0,
        phase: Math.random() * Math.PI * 2
      });
    });

    // 2. Light strategic perimeter particles along Malaysia (step increased to 48 for clean negative space)
    const step = 48;
    for (let py = 40; py <= MAP_H - 40; py += step) {
      for (let px = 40; px <= MAP_W - 40; px += step) {
        const isSemenanjung = px >= 60 && px <= 250 && py >= 50 && py <= 340;
        const isBorneo = px >= 500 && px <= 940 && py >= 50 && py <= 350;
        const isSouthChinaSeaRelay = px >= 280 && px <= 460 && py >= 140 && py <= 260 && Math.random() < 0.12;

        if ((isSemenanjung || isBorneo || isSouthChinaSeaRelay) && Math.random() < 0.22) {
          const sx = layout.ox + px * layout.scale;
          const sy = layout.oy + py * layout.scale;
          particles.push({
            x: sx,
            y: sy,
            ax: sx,
            ay: sy,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
            kind: 1, // Strategic field node
            spd: 0.25 + Math.random() * 0.3,
            amp: 0.8 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2
          });
        }
      }
    }

    // 3. Gentle ambient floating points (reduced to 12)
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: Math.random() * layout.w,
        y: Math.random() * layout.h,
        ax: 0,
        ay: 0,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        kind: 2, // Floating ambient dust
        spd: 0.6,
        amp: 0,
        phase: 0
      });
    }

    let animId = 0;
    let time = 0;
    let scanXNorm = -0.15;

    // Controlled connection distance to avoid dense spiderwebs
    const maxDist = Math.max(28, 36 * layout.scale);
    const cellSize = maxDist;
    const gridCols = Math.ceil(layout.w / cellSize) + 1;
    const gridRows = Math.ceil(layout.h / cellSize) + 1;

    const render = () => {
      time += 0.016;
      scanXNorm += scanningRef.current ? 0.0035 : 0.0012;
      if (scanXNorm > 1.25) scanXNorm = -0.25;

      const scanX = scanXNorm * layout.w;
      ctx.clearRect(0, 0, layout.w, layout.h);

      const pointer = pointerRef.current;

      // 1. Update particle positions
      for (const p of particles) {
        if (p.kind === 2) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -20) p.x = layout.w + 20;
          if (p.x > layout.w + 20) p.x = -20;
          if (p.y < -20) p.y = layout.h + 20;
          if (p.y > layout.h + 20) p.y = -20;
        } else {
          p.x = p.ax + Math.cos(time * p.spd + p.phase) * p.amp;
          p.y = p.ay + Math.sin(time * p.spd * 0.85 + p.phase * 1.7) * p.amp;
        }

        // Pointer gentle repulsion
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 14000 && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / 118) * 6;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
      }

      // 2. Spatial Hash Grid for fast clean connection lines
      const cells: number[][] = Array.from({ length: gridCols * gridRows }, () => []);
      particles.forEach((p, idx) => {
        const cx = Math.min(gridCols - 1, Math.max(0, Math.floor(p.x / cellSize)));
        const cy = Math.min(gridRows - 1, Math.max(0, Math.floor(p.y / cellSize)));
        cells[cy * gridCols + cx].push(idx);
      });

      // 3. Draw inter-particle mesh links (Minimal, high precision & non-intrusive)
      ctx.lineWidth = 0.6;
      for (let cy = 0; cy < gridRows; cy++) {
        for (let cx = 0; cx < gridCols; cx++) {
          const cell = cells[cy * gridCols + cx];
          if (!cell.length) continue;

          for (let dy = 0; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dy === 0 && dx < 0) continue;
              const ncx = cx + dx;
              const ncy = cy + dy;
              if (ncx < 0 || ncy < 0 || ncx >= gridCols || ncy >= gridRows) continue;

              const neighborCell = cells[ncy * gridCols + ncx];
              for (const i of cell) {
                for (const j of neighborCell) {
                  if (j <= i) continue;
                  const pi = particles[i];
                  const pj = particles[j];
                  const ddx = pi.x - pj.x;
                  const ddy = pi.y - pj.y;
                  const dist = Math.hypot(ddx, ddy);
                  if (dist > maxDist) continue;

                  // Clean, subtle line alpha
                  let alpha = (pi.kind === 2 && pj.kind === 2 ? 0.03 : 0.12) * (1 - dist / maxDist);
                  const midX = (pi.x + pj.x) / 2;
                  const distToScan = Math.abs(midX - scanX);
                  let scanBoost = 0;
                  if (distToScan < 80) {
                    scanBoost = 1 - distToScan / 80;
                    alpha += scanBoost * 0.25;
                  }

                  if (alpha > 0.01) {
                    ctx.strokeStyle = scanBoost > 0.25 
                      ? `rgba(160, 255, 246, ${alpha.toFixed(3)})` 
                      : `rgba(34, 214, 255, ${alpha.toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(pi.x, pi.y);
                    ctx.lineTo(pj.x, pj.y);
                    ctx.stroke();
                  }
                }
              }
            }
          }
        }
      }

      // 4. Draw particle points
      for (const p of particles) {
        const distToScan = Math.abs(p.x - scanX);
        const scanProximity = distToScan < 80 ? 1 - distToScan / 80 : 0;
        let radius = p.kind === 0 ? 1.4 : p.kind === 1 ? 0.85 : 0.6;
        radius += scanProximity * 0.8;

        const baseAlpha = (p.kind === 0 ? 0.75 : p.kind === 1 ? 0.35 : 0.15) + scanProximity * 0.35;
        ctx.fillStyle = scanProximity > 0.3
          ? `rgba(190, 255, 250, ${Math.min(1, baseAlpha)})`
          : p.kind === 0
          ? `rgba(255, 183, 3, ${baseAlpha})`
          : `rgba(34, 190, 225, ${baseAlpha})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Connect cursor to closest particle only
      if (pointer.x > -1000) {
        let nearestDist = 100;
        let nearestP: any = null;
        for (const p of particles) {
          const dist = Math.hypot(p.x - pointer.x, p.y - pointer.y);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestP = p;
          }
        }
        if (nearestP) {
          ctx.strokeStyle = `rgba(255, 183, 3, ${(0.28 * (1 - nearestDist / 100)).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(nearestP.x, nearestP.y);
          ctx.stroke();
        }
      }

      // 6. Subtle Lidar sweep light wave
      const sweepGrad = ctx.createLinearGradient(scanX - 50, 0, scanX + 10, 0);
      sweepGrad.addColorStop(0, 'rgba(34, 230, 255, 0)');
      sweepGrad.addColorStop(0.85, 'rgba(34, 230, 255, 0.05)');
      sweepGrad.addColorStop(1, 'rgba(180, 255, 255, 0.25)');
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(scanX - 50, 0, 60, layout.h);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [layout]);

  // Map Transformation Matrix
  const transform = `translate(${layout.ox} ${layout.oy}) scale(${layout.scale})`;

  // Lat/Long Graticules
  const lngLines: number[] = [];
  for (let lng = 99; lng <= 120; lng += 2) {
    lngLines.push(projectCoordinate([lng, 0])[0]);
  }
  const latLines: number[] = [];
  for (let lat = 1; lat <= 8; lat += 1) {
    latLines.push(projectCoordinate([99, lat])[1]);
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Background Layer: Custom Wallpaper (if uploaded/selected) OR Default Cyber Abyss */}
      {customBgUrl ? (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ 
            backgroundImage: `url(${customBgUrl})`,
            opacity: customBgOpacity 
          }}
        />
      ) : null}

      {/* Dark Ambient Radial Tint */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,#06323f_0%,#031722_45%,#01070d_100%)] opacity-90" />
      <div className="hud-grid absolute inset-0 opacity-40" />

      {/* SVG Geospatial Vector Layer for Malaysia */}
      <svg
        className="absolute inset-0 h-full w-full"
        width={layout.w}
        height={layout.h}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="landFill" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#0affd8" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#0891b2" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#062a3a" stopOpacity="0.32" />
          </linearGradient>

          <filter id="coastGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern id="hatch" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#22e6ff" strokeWidth="0.5" opacity="0.08" />
          </pattern>
        </defs>

        <g transform={transform}>
          {/* Lat/Lng Coordinate Graticule Grid */}
          <g opacity="0.2">
            {lngLines.map((x, idx) => (
              <line
                key={`lng-${idx}`}
                x1={x}
                y1={-30}
                x2={x}
                y2={MAP_H + 30}
                stroke="#22e6ff"
                strokeWidth="0.5"
                strokeDasharray="4 8"
                strokeOpacity={idx % 2 === 0 ? 0.35 : 0.12}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {latLines.map((y, idx) => (
              <line
                key={`lat-${idx}`}
                x1={-40}
                y1={y}
                x2={MAP_W + 40}
                y2={y}
                stroke="#22e6ff"
                strokeWidth="0.5"
                strokeDasharray="4 8"
                strokeOpacity={idx % 2 === 0 ? 0.35 : 0.12}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>

          {/* Geographical Watermark Labels */}
          <g opacity="0.4" fontFamily="monospace" fontSize="9" fill="#22e6ff" letterSpacing="0.25em">
            <text x="140" y="380">SELAT MELAKA</text>
            <text x="360" y="160">LAUT CHINA SELATAN</text>
            <text x="120" y="180" fontSize="11" fontWeight="bold" opacity="0.75">SEMENANJUNG MALAYSIA</text>
            <text x="640" y="240" fontSize="11" fontWeight="bold" opacity="0.75">SARAWAK</text>
            <text x="820" y="140" fontSize="11" fontWeight="bold" opacity="0.75">SABAH</text>
            <text x="910" y="200">LAUT SULU</text>
          </g>

          {/* Main Landmass Polygons: Peninsular, Sarawak, Sabah (Vector Silhouettes with Glow) */}
          <g filter="url(#coastGlow)">
            {MALAYSIA_REGIONS.map((region) => (
              <path
                key={region.id}
                d={generateSvgPath(region.poly)}
                fill="url(#landFill)"
                stroke="#3ff3ff"
                strokeWidth="1.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity="0.95"
              />
            ))}
          </g>

          {/* Crosshatch Fill */}
          <g>
            {MALAYSIA_REGIONS.map((region) => (
              <path
                key={`hatch-${region.id}`}
                d={generateSvgPath(region.poly)}
                fill="url(#hatch)"
              />
            ))}
          </g>

          {/* Internal Tactical State Division Lines */}
          <g opacity="0.3">
            {STATE_INTERIOR_LINES.map((pts, lIdx) => (
              <path
                key={`int-line-${lIdx}`}
                d={pts.map((pt, i) => {
                  const [px, py] = projectCoordinate(pt);
                  return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
                }).join(' ')}
                fill="none"
                stroke="#0affd8"
                strokeWidth="0.7"
                strokeDasharray="3 4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>

          {/* Animated Coastal Energy Flow Dash */}
          <g>
            {MALAYSIA_REGIONS.map((region) => (
              <path
                key={`dash-${region.id}`}
                d={generateSvgPath(region.poly)}
                fill="none"
                stroke="#c9fff6"
                strokeWidth="1.2"
                strokeDasharray="16 280"
                vectorEffect="non-scaling-stroke"
                style={{
                  animationName: 'dash-flow',
                  animationDuration: `${isScanning ? 5 : 12}s`,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite'
                }}
                opacity="0.85"
              />
            ))}
          </g>

          {/* Federal Strategic Islands */}
          {MALAYSIA_ISLANDS.map((island) => {
            const [cx, cy] = projectCoordinate(island.at);
            return (
              <g key={island.name}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={island.r}
                  fill="#0affd8"
                  fillOpacity="0.25"
                  stroke="#3ff3ff"
                  strokeWidth="0.9"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}

          {/* Subsea Fiber Optic Mesh & Arcs */}
          <g>
            {SUBSEA_LINKS.map(([fromCode, toCode], idx) => {
              const nodeA = NODE_LOOKUP[fromCode];
              const nodeB = NODE_LOOKUP[toCode];
              if (!nodeA || !nodeB) return null;

              const posA = projectCoordinate(nodeA.at);
              const posB = projectCoordinate(nodeB.at);

              const midX = (posA[0] + posB[0]) / 2;
              const midY = (posA[1] + posB[1]) / 2;
              const dx = posB[0] - posA[0];
              const dy = posB[1] - posA[1];
              const dist = Math.hypot(dx, dy);

              // Gentle arc curvature for realistic subsea layout
              const arcOffset = Math.min(22, dist * 0.12) * (idx % 2 === 0 ? 1 : -1);
              const ctrlX = midX - (dy / (dist || 1)) * arcOffset;
              const ctrlY = midY + (dx / (dist || 1)) * arcOffset;

              return (
                <g key={`${fromCode}-${toCode}`}>
                  <path
                    d={`M${posA[0]} ${posA[1]} Q${ctrlX} ${ctrlY} ${posB[0]} ${posB[1]}`}
                    fill="none"
                    stroke="#22e6ff"
                    strokeWidth="0.6"
                    strokeOpacity="0.20"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={`M${posA[0]} ${posA[1]} Q${ctrlX} ${ctrlY} ${posB[0]} ${posB[1]}`}
                    fill="none"
                    stroke={idx % 4 === 0 ? '#ffb703' : '#8ffff2'}
                    strokeWidth="1.0"
                    strokeDasharray="4 160"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      animationName: 'dash-flow',
                      animationDuration: `${(isScanning ? 3.5 : 8) + (idx % 4)}s`,
                      animationTimingFunction: 'linear',
                      animationIterationCount: 'infinite'
                    }}
                    opacity="0.80"
                  />
                </g>
              );
            })}
          </g>

          {/* Data Hub & Radar Telemetry Nodes */}
          <g>
            {TELEMETRY_NODES.map((node, idx) => {
              const [nx, ny] = projectCoordinate(node.at);
              const radius = node.tier === 1 ? 3.0 : 1.8;

              return (
                <g key={node.code}>
                  {node.tier === 1 && (
                    <circle
                      cx={nx}
                      cy={ny}
                      r={8}
                      fill="none"
                      stroke="#22e6ff"
                      strokeWidth="0.7"
                      vectorEffect="non-scaling-stroke"
                      style={{
                        transformBox: 'fill-box',
                        transformOrigin: 'center',
                        animationName: 'pulse-ring',
                        animationDuration: `${3.2 + (idx % 3) * 0.6}s`,
                        animationTimingFunction: 'ease-out',
                        animationIterationCount: 'infinite'
                      }}
                    />
                  )}
                  <circle
                    cx={nx}
                    cy={ny}
                    r={radius}
                    fill={node.tier === 1 ? '#ffb703' : '#7df9ff'}
                    fillOpacity="0.95"
                  />
                  {node.tier === 1 && (
                    <React.Fragment>
                      <line
                        x1={nx}
                        y1={ny}
                        x2={nx + 14}
                        y2={ny - 12}
                        stroke="#ffb703"
                        strokeWidth="0.6"
                        strokeOpacity="0.75"
                        vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1={nx + 14}
                        y1={ny - 12}
                        x2={nx + 42}
                        y2={ny - 12}
                        stroke="#ffb703"
                        strokeWidth="0.6"
                        strokeOpacity="0.75"
                        vectorEffect="non-scaling-stroke"
                      />
                      <text
                        x={nx + 16}
                        y={ny - 15}
                        fill="#ffb703"
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="0.08em"
                      >
                        {node.code}
                      </text>
                    </React.Fragment>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* 2D Canvas Layer for Subtle Interactive Particle Nodes */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
