import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GraphData, Node, Link } from '../types';
import { extractNodeCoordinates } from '../utils/geoUtils';
import { CopyableCoordinates } from './CopyableCoordinates';
import { Globe, Layers, Navigation, Crosshair, ZoomIn, ZoomOut, Maximize2, ShieldAlert, Sparkles, MapPin, ChevronLeft, ChevronRight, Target, Image as ImageIcon, Activity, Cpu, Radio, Eye, EyeOff, Sliders, Zap, Shield, Terminal, GripVertical, Move, Play, FileText, Download } from 'lucide-react';

import { getSessionCache, setSessionCache } from '../utils/sessionCache';
import { RoutePlaybackModal } from './RoutePlaybackModal';
import { exportGeointCSV } from '../utils/geointExporter';
import TrafficVisionMapModal from './TrafficVisionMapModal';
import { resolveNodeBrandOrType } from '../utils/nodeIconResolver';
import NodeHudTooltip from './NodeHudTooltip';

// Fix Leaflet's default icon path issues in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to programmatically manipulate map view
function MapViewController({ 
  center, 
  zoom, 
  fitBounds 
}: { 
  center?: [number, number]; 
  zoom?: number; 
  fitBounds?: L.LatLngBoundsExpression | null; 
}) {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => {
      if (map) {
        map.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    const container = map.getContainer();
    let observer: ResizeObserver | null = null;
    let resizeTimer: NodeJS.Timeout | null = null;

    if (container) {
      observer = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (map) map.invalidateSize();
        }, 150);
      });
      observer.observe(container);
    }

    handleResize();
    const t1 = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      if (observer) observer.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      clearTimeout(t1);
    };
  }, [map]);

  useEffect(() => {
    if (fitBounds) {
      map.fitBounds(fitBounds, { padding: [50, 50], maxZoom: 15 });
    } else if (center && zoom !== undefined) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, fitBounds, map]);

  return null;
}

function MapClickHandler({ onClick }: { onClick: () => void }) {
  useMapEvents({
    click: () => {
      onClick();
    }
  });
  return null;
}

interface InteractiveSpatialMapCanvasProps {
  data: GraphData;
  selectedNodes: Node[];
  onNodeClick: (node: Node, position: { x: number; y: number }, isShift: boolean) => void;
  onNodeDoubleClick?: (node: Node, position: { x: number; y: number }) => void;
  onNodeRightClick?: (node: Node, position: { x: number; y: number }) => void;
  onBackgroundClick: () => void;
  onDeleteNode?: (nodeId: string) => void;
}

export type MapStyle = 'dark' | 'satellite' | 'street' | 'humanitarian' | 'topo';

export const InteractiveSpatialMapCanvas: React.FC<InteractiveSpatialMapCanvasProps> = ({
  data,
  selectedNodes,
  onNodeClick,
  onNodeDoubleClick,
  onNodeRightClick,
  onBackgroundClick,
  onDeleteNode
}) => {
  const [mapStyle, setMapStyleState] = useState<MapStyle>(() => {
    return getSessionCache<MapStyle>('rh_map_style') || 'dark';
  });

  const [isHudExpanded, setIsHudExpanded] = useState<boolean>(false);
  const [showScanlines, setShowScanlines] = useState<boolean>(true);
  const [showVectorMetrics, setShowVectorMetrics] = useState<boolean>(true);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(true);
  const [showPlaybackModal, setShowPlaybackModal] = useState<boolean>(false);
  const [showTrafficVisionModal, setShowTrafficVisionModal] = useState<boolean>(false);
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<{ node: Node; position: { x: number; y: number } } | null>(null);
  const isHoveringTooltipRef = useRef(false);

  useEffect(() => {
    if (!hoveredNodeInfo) return;
    const handleGlobalClick = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-hud-tooltip="true"]')) {
        return;
      }
      setHoveredNodeInfo(null);
    };
    window.addEventListener('pointerdown', handleGlobalClick, true);
    return () => {
      window.removeEventListener('pointerdown', handleGlobalClick, true);
    };
  }, [hoveredNodeInfo]);

  const handleExportMapCSV = () => {
    const firstGeocoded = geocodedNodes[0];
    exportGeointCSV({
      targetLabel: firstGeocoded ? firstGeocoded.node.label : 'SPATIAL_MAP_TARGETS',
      targetType: 'SPATIAL_CANVAS_EXPORT',
      coords: firstGeocoded ? { lat: firstGeocoded.lat, lon: firstGeocoded.lon } : null,
      sourceType: 'SPATIAL_MAP_CANVAS',
      intelText: `Jumlah Nod Ter-plot: ${geocodedNodes.length}. Vektor Hubungan: ${mapLinks.length}.`,
      threatLevel: overallThreat.label
    });
  };

  // Draggable HUD States & Logic
  const [hud1Pos, setHud1Pos] = useState<{ x: number; y: number }>({ x: 16, y: 16 });
  const hud1DragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; currentX: number; currentY: number }>({ startX: 0, startY: 0, initialX: 16, initialY: 16, currentX: 16, currentY: 16 });
  const hud1DOMRef = useRef<HTMLDivElement>(null);

  const [hud2Pos, setHud2Pos] = useState<{ x: number; y: number } | null>(null);
  const hud2DragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; currentX: number; currentY: number }>({ startX: 0, startY: 0, initialX: 0, initialY: 0, currentX: 0, currentY: 0 });
  const hud2DOMRef = useRef<HTMLDivElement>(null);

  // Keep HUDs within screen bounds on resize/orientation change
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - 120; // Approx max width
      const maxY = window.innerHeight - 80;

      setHud1Pos(prev => {
        const newX = Math.max(8, Math.min(maxX, prev.x));
        const newY = Math.max(8, Math.min(maxY, prev.y));
        if (hud1DOMRef.current) {
          hud1DOMRef.current.style.left = `${newX}px`;
          hud1DOMRef.current.style.top = `${newY}px`;
        }
        return { x: newX, y: newY };
      });

      setHud2Pos(prev => {
        if (!prev) return prev;
        const newX = Math.max(8, Math.min(maxX, prev.x));
        const newY = Math.max(8, Math.min(maxY, prev.y));
        if (hud2DOMRef.current) {
          hud2DOMRef.current.style.left = `${newX}px`;
          hud2DOMRef.current.style.top = `${newY}px`;
        }
        return { x: newX, y: newY };
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const animFrameRef1 = useRef<number | null>(null);
  const handleHud1PointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    hud1DragRef.current = {
      ...hud1DragRef.current,
      startX: e.clientX,
      startY: e.clientY,
      initialX: hud1Pos.x,
      initialY: hud1Pos.y,
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (animFrameRef1.current) cancelAnimationFrame(animFrameRef1.current);
      animFrameRef1.current = requestAnimationFrame(() => {
        const deltaX = ev.clientX - hud1DragRef.current.startX;
        const deltaY = ev.clientY - hud1DragRef.current.startY;
        const newX = Math.max(8, Math.min(window.innerWidth - 120, hud1DragRef.current.initialX + deltaX));
        const newY = Math.max(8, Math.min(window.innerHeight - 80, hud1DragRef.current.initialY + deltaY));
        
        if (hud1DOMRef.current) {
          hud1DOMRef.current.style.left = `${newX}px`;
          hud1DOMRef.current.style.top = `${newY}px`;
        }
        hud1DragRef.current.currentX = newX;
        hud1DragRef.current.currentY = newY;
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (animFrameRef1.current) cancelAnimationFrame(animFrameRef1.current);
      // Sync state at the very end
      setHud1Pos({ x: hud1DragRef.current.currentX, y: hud1DragRef.current.currentY });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const animFrameRef2 = useRef<number | null>(null);
  const handleHud2PointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const currentElem = e.currentTarget.closest('.hud-panel-container');
    const rect = currentElem ? currentElem.getBoundingClientRect() : { left: window.innerWidth - 300, top: 16 };
    const initialX = hud2Pos ? hud2Pos.x : rect.left;
    const initialY = hud2Pos ? hud2Pos.y : rect.top;

    hud2DragRef.current = {
      ...hud2DragRef.current,
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY,
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (animFrameRef2.current) cancelAnimationFrame(animFrameRef2.current);
      animFrameRef2.current = requestAnimationFrame(() => {
        const deltaX = ev.clientX - hud2DragRef.current.startX;
        const deltaY = ev.clientY - hud2DragRef.current.startY;
        const newX = Math.max(8, Math.min(window.innerWidth - 120, hud2DragRef.current.initialX + deltaX));
        const newY = Math.max(8, Math.min(window.innerHeight - 80, hud2DragRef.current.initialY + deltaY));
        
        if (hud2DOMRef.current) {
          hud2DOMRef.current.style.left = `${newX}px`;
          hud2DOMRef.current.style.top = `${newY}px`;
          hud2DOMRef.current.style.right = 'auto'; // Disable initial right anchoring when dragged
        }
        hud2DragRef.current.currentX = newX;
        hud2DragRef.current.currentY = newY;
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (animFrameRef2.current) cancelAnimationFrame(animFrameRef2.current);
      setHud2Pos({ x: hud2DragRef.current.currentX, y: hud2DragRef.current.currentY });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const setMapStyle = (style: MapStyle) => {
    setMapStyleState(style);
    setSessionCache('rh_map_style', style);
  };
  const [showLinksOnMap, setShowLinksOnMap] = useState<boolean>(true);
  const [antiOverlapEnabled, setAntiOverlapEnabled] = useState<boolean>(true);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<L.LatLngBoundsExpression | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Extract geocoded nodes with anti-overlap spacing and smart multi-directional label positions
  const geocodedNodes = useMemo(() => {
    const result: { 
      node: Node; 
      lat: number; 
      lon: number; 
      displayLat: number; 
      displayLon: number; 
      labelPosIndex: number; 
      source: string 
    }[] = [];

    const coordGroupCounts = new Map<string, number>();

    (data.nodes || []).forEach((n, globalIdx) => {
      const coords = extractNodeCoordinates(n);
      if (coords) {
        // Group nodes within ~100 meters
        const coordKey = `${coords.lat.toFixed(3)},${coords.lon.toFixed(3)}`;
        const groupCount = coordGroupCounts.get(coordKey) || 0;
        coordGroupCounts.set(coordKey, groupCount + 1);

        // Micro-spiral offset if multiple nodes share near-identical coordinates
        let displayLat = coords.lat;
        let displayLon = coords.lon;
        if (antiOverlapEnabled && groupCount > 0) {
          const angle = groupCount * ((2 * Math.PI) / 5); // 5-arm star
          const offsetDist = 0.0028 * Math.ceil(groupCount / 5); // ~250m offset ring
          displayLat += offsetDist * Math.cos(angle);
          displayLon += offsetDist * Math.sin(angle) * 1.25;
        }

        result.push({
          node: n,
          lat: coords.lat,
          lon: coords.lon,
          displayLat,
          displayLon,
          labelPosIndex: antiOverlapEnabled ? groupCount : globalIdx,
          source: coords.source
        });
      }
    });
    return result;
  }, [data.nodes, antiOverlapEnabled]);

  // Overall cyberthreat score computation
  const overallThreat = useMemo(() => {
    if (!geocodedNodes.length) return { score: 45, label: 'TERKAWAL', color: '#00f0ff' };
    let highCount = 0;
    geocodedNodes.forEach(g => {
      if (g.node.vaultMatch || g.node.type === 'person' || g.node.type === 'phone' || g.node.type === 'email') highCount++;
    });
    const ratio = highCount / geocodedNodes.length;
    if (ratio > 0.5) return { score: 88, label: 'KRITIKAL', color: '#ff0033' };
    if (ratio > 0.2) return { score: 72, label: 'AMARAN TINGGI', color: '#f59e0b' };
    return { score: 52, label: 'TERKAWAL', color: '#10b981' };
  }, [geocodedNodes]);

  // Create a quick lookup map of node ID to coordinates
  const nodeCoordsMap = useMemo(() => {
    const map = new Map<string, [number, number]>();
    geocodedNodes.forEach(item => {
      map.set(item.node.id, [item.displayLat, item.displayLon]);
    });
    return map;
  }, [geocodedNodes]);

  // Extract links between geocoded nodes with midpoint vectors
  const mapLinks = useMemo(() => {
    if (!showLinksOnMap) return [];
    const links: { 
      id: string; 
      sourcePos: [number, number]; 
      targetPos: [number, number]; 
      midPos: [number, number];
      label: string; 
      isVault?: boolean 
    }[] = [];
    
    (data.links || []).forEach((l, idx) => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;

      const srcPos = nodeCoordsMap.get(srcId);
      const tgtPos = nodeCoordsMap.get(tgtId);

      if (srcPos && tgtPos) {
        const midPos: [number, number] = [
          (srcPos[0] + tgtPos[0]) / 2,
          (srcPos[1] + tgtPos[1]) / 2
        ];
        links.push({
          id: `link-${srcId}-${tgtId}-${idx}`,
          sourcePos: srcPos,
          targetPos: tgtPos,
          midPos: midPos,
          label: l.label || 'HUBUNGAN',
          isVault: l.isVault
        });
      }
    });
    return links;
  }, [data.links, nodeCoordsMap, showLinksOnMap]);

  // Create custom marker icon generator with Cybertech Threat Badges and Anti-Overlap Multi-Directional placement
  const createNodeIcon = (node: Node, isSelected: boolean, posIndex: number = 0) => {
    const meta = resolveNodeBrandOrType(node);
    const isLocation = node.type === 'location';
    const isVault = node.vaultMatch;
    const isHighThreat = isVault || node.type === 'person' || node.type === 'phone';
    
    const color = isSelected ? '#ffffff' : meta.brandColor;

    const threatTag = isVault 
      ? '<span class="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-amber-500/30 text-amber-300 border border-amber-500/60 shrink-0">VAULT</span>' 
      : isHighThreat 
      ? '<span class="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-red-500/30 text-red-300 border border-red-500/60 shrink-0">HIGH</span>'
      : '';

    // Smart multi-directional label offset placement based on posIndex
    let labelPlacementClass = 'top-9 left-1/2 -translate-x-1/2'; // 0: Bottom
    const dir = posIndex % 4;
    if (dir === 1) {
      labelPlacementClass = 'bottom-9 left-1/2 -translate-x-1/2'; // 1: Top
    } else if (dir === 2) {
      labelPlacementClass = 'left-9 top-1/2 -translate-y-1/2'; // 2: Right
    } else if (dir === 3) {
      labelPlacementClass = 'right-9 top-1/2 -translate-y-1/2'; // 3: Left
    }

    return L.divIcon({
      className: 'custom-map-node-icon',
      html: `
        <div class="relative flex flex-col items-center justify-center cursor-pointer group">
          ${isSelected || isHighThreat ? `<div class="absolute -inset-3 rounded-full border border-[${color}] animate-ping opacity-60"></div>` : ''}
          
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-xl backdrop-blur-md transition-all duration-300 group-hover:scale-125 group-hover:z-[9999]" style="background-color: rgba(5,5,5,0.95); border-color: ${color}; box-shadow: 0 0 14px ${color}aa;">
            <svg viewBox="0 0 24 24" width="16" height="16" class="shrink-0" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));">
              <path d="${meta.svgPath}" fill="${meta.brand === 'github' ? '#ffffff' : color}"></path>
            </svg>
          </div>

          <div class="absolute ${labelPlacementClass} pointer-events-none group-hover:z-[9999] transition-all">
            <div class="flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-mono font-black text-white bg-[#080812]/98 border border-[#00f0ff]/50 shadow-[0_6px_30px_rgba(0,0,0,0.98)] backdrop-blur-md group-hover:border-[#00f0ff] group-hover:scale-110 group-hover:bg-black transition-all whitespace-nowrap">
              <span class="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px]" style="background-color: ${color}"></span>
              <span class="max-w-[180px] truncate inline-block leading-tight tracking-wide">${node.label}</span>
              <span class="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase shrink-0" style="background-color: ${color}25; color: ${color}; border: 1px solid ${color}60;">${meta.brandName}</span>
              ${threatTag}
            </div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  // Recenter / Fit bounds handler
  const handleFitBounds = () => {
    if (geocodedNodes.length > 0) {
      const bounds = L.latLngBounds(geocodedNodes.map(g => [g.displayLat, g.displayLon]));
      setFitBoundsTrigger(bounds);
    } else {
      // Default to global/Malaysia bounding center
      setFitBoundsTrigger(L.latLngBounds([[1.2, 99.5], [7.2, 119.5]]));
    }
  };

  // Automatically fit map view to geocoded nodes on load or change
  useEffect(() => {
    if (geocodedNodes.length > 0) {
      const bounds = L.latLngBounds(geocodedNodes.map(g => [g.displayLat, g.displayLon]));
      setFitBoundsTrigger(bounds);
    }
  }, [geocodedNodes]);

  // Map Tile Layers mapping (100% Free, Zero API Keys, Carto removed)
  const tileUrl = useMemo(() => {
    switch (mapStyle) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'humanitarian':
        return 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
      case 'topo':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
      case 'street':
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'dark':
      default:
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    }
  }, [mapStyle]);

  // Calculate non-geocoded nodes count
  const nonGeocodedCount = (data.nodes || []).length - geocodedNodes.length;

  return (
    <div className="w-full h-full relative bg-black overflow-hidden select-none">
      <style>{`
        .leaflet-container {
          background: #050505 !important;
          font-family: monospace;
          width: 100%;
          height: 100%;
        }
        .leaflet-tile-container {
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .custom-map-node-icon {
          z-index: 200 !important;
          overflow: visible !important;
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .custom-map-node-icon:hover {
          z-index: 9999 !important;
        }
        .custom-vector-metric-icon {
          z-index: 100 !important;
          overflow: visible !important;
          will-change: transform;
          transform: translateZ(0);
        }
        .leaflet-control-attribution {
          display: none !important;
        }
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border: none !important;
        }
        .leaflet-popup-tip {
          background: #0a0a0a !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          line-height: 1.2 !important;
        }
      `}</style>

      {/* TOP CONTROLS HUD (Drapsible & Disorok) */}
      <div 
        ref={hud1DOMRef}
        className="absolute z-[500] pointer-events-auto"
        style={{ left: `${hud1Pos.x}px`, top: `${hud1Pos.y}px` }}
      >
        {!isHudExpanded ? (
          <div className="flex items-center gap-1 bg-black/85 p-1 rounded-lg border border-[#ff0033]/50 backdrop-blur-md shadow-[0_0_15px_rgba(255,0,51,0.3)]">
            <div 
              onPointerDown={handleHud1PointerDown} 
              className="cursor-move touch-none p-1 hover:bg-white/10 rounded text-gray-400 hover:text-[#ff0033] transition-colors"
              title="Alihkan HUD Peta (Drag & Drop)"
            >
              <GripVertical size={14} />
            </div>
            <button
              onClick={() => setIsHudExpanded(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-[#ff0033] hover:text-white transition-all group cursor-pointer"
              title="Kembangkan Kawalan Peta Tactical GIS"
            >
              <Globe size={16} className="animate-spin-slow text-[#ff0033] group-hover:scale-110 transition-transform" />
              <span className="text-xs font-mono font-black uppercase tracking-wider hidden sm:inline">Tactical GIS</span>
              <ChevronRight size={14} className="text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 bg-black/85 p-1.5 rounded-lg border border-[#ff0033]/50 backdrop-blur-md shadow-[0_0_20px_rgba(255,0,51,0.25)] transition-all animate-in fade-in slide-in-from-left-2">
            {/* Drag Handle */}
            <div 
              onPointerDown={handleHud1PointerDown} 
              className="cursor-move touch-none p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-[#ff0033] transition-colors flex items-center gap-1"
              title="Pegang & Alihkan HUD"
            >
              <GripVertical size={14} />
              <Move size={12} className="text-[#ff0033]/70" />
            </div>

            <button
              onClick={() => setIsHudExpanded(false)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-black text-[#ff0033] border-r border-white/20 hover:text-white transition-colors cursor-pointer group"
              title="Disorok / Kuncupkan Kawalan Peta"
            >
              <Globe size={15} className="animate-spin-slow text-[#ff0033]" />
              <span className="uppercase tracking-widest hidden sm:inline">Tactical GIS</span>
              <EyeOff size={13} className="text-gray-400 group-hover:text-[#ff0033] transition-colors ml-1" />
            </button>

            {/* Style Selector (Free Map Layers) */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded border border-white/10 overflow-x-auto max-w-[400px]">
              <button
                onClick={() => setMapStyle('dark')}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap ${mapStyle === 'dark' ? 'bg-[#ff0033] text-black shadow-[0_0_10px_#ff0033]' : 'text-gray-400 hover:text-white'}`}
                title="Esri World Dark Gray Canvas (Tanpa API Key)"
              >
                Dark GIS
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap ${mapStyle === 'satellite' ? 'bg-[#ff0033] text-black shadow-[0_0_10px_#ff0033]' : 'text-gray-400 hover:text-white'}`}
                title="Esri World Imagery HD Satelit (Tanpa API Key)"
              >
                Satelit HD
              </button>
              <button
                onClick={() => setMapStyle('street')}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap ${mapStyle === 'street' ? 'bg-[#ff0033] text-black shadow-[0_0_10px_#ff0033]' : 'text-gray-400 hover:text-white'}`}
                title="OpenStreetMap Standard (Tanpa API Key)"
              >
                OSM Standard
              </button>
              <button
                onClick={() => setMapStyle('humanitarian')}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap ${mapStyle === 'humanitarian' ? 'bg-[#ff0033] text-black shadow-[0_0_10px_#ff0033]' : 'text-gray-400 hover:text-white'}`}
                title="Humanitarian OpenStreetMap HOT (Tanpa API Key)"
              >
                OSM HOT
              </button>
              <button
                onClick={() => setMapStyle('topo')}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all whitespace-nowrap ${mapStyle === 'topo' ? 'bg-[#ff0033] text-black shadow-[0_0_10px_#ff0033]' : 'text-gray-400 hover:text-white'}`}
                title="Esri World Topographic Map (Tanpa API Key)"
              >
                Topografi
              </button>
            </div>

            {/* Links Toggle */}
            <button
              onClick={() => setShowLinksOnMap(!showLinksOnMap)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all border ${showLinksOnMap ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-white/10 text-gray-400 hover:text-white'}`}
              title="Tunjuk sambungan hubungan pada peta"
            >
              {showLinksOnMap ? 'Vektor: On' : 'Vektor: Off'}
            </button>

            {/* TrafficVision Live GIS Map Modal Button */}
            <button
              onClick={() => setShowTrafficVisionModal(true)}
              className="px-3 py-1 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center gap-2 cursor-pointer transition-all border border-cyan-300 animate-pulse"
              title="Buka Peta Live Interaktif TrafficVision (Malaysia)"
            >
              <Globe size={14} className="animate-spin-slow text-cyan-200" />
              <span>PETA TRAFFICVISION LIVE (GIS)</span>
            </button>

            {/* Anti-Overlap Label Toggle */}
            <button
              onClick={() => setAntiOverlapEnabled(!antiOverlapEnabled)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all border ${antiOverlapEnabled ? 'border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.2)]' : 'border-white/10 text-gray-400 hover:text-white'}`}
              title="Cegah pertindihan label lokasi atas peta"
            >
              {antiOverlapEnabled ? 'Label Teratur: ON' : 'Label Teratur: OFF'}
            </button>

            {/* Simulasi Pergerakan Masa-Nyata (Playback) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaybackModal(true);
              }}
              className="px-2 py-1 rounded text-[10px] font-bold uppercase transition-all border border-[#00f0ff] bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30 flex items-center gap-1 shadow-[0_0_10px_rgba(0,240,255,0.3)] cursor-pointer"
              title="Mainkan Simulasi Pergerakan Laluan Sasaran"
            >
              <Play size={12} className="text-[#00f0ff] animate-pulse" />
              <span>Playback Laluan</span>
            </button>

            {/* Eksport GEOINT CSV */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleExportMapCSV();
              }}
              className="px-2 py-1 rounded text-[10px] font-bold uppercase transition-all border border-gray-700 bg-white/5 text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Eksport Data GEOINT CSV"
            >
              <Download size={11} className="text-cyan-400" />
              <span>CSV Data</span>
            </button>

            {/* Fit Bounds */}
            <button
              onClick={handleFitBounds}
              className="p-1.5 bg-white/10 hover:bg-[#ff0033] text-white hover:text-black rounded transition-all border border-white/10"
              title="Fokus Semua Lokasi Malaysia"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* TOP RIGHT - CYBERTECH TACTICAL HUD TELEMETRY WIDGET (Draggable & Disorok) */}
      <div 
        ref={hud2DOMRef}
        className="absolute z-[500] pointer-events-auto hud-panel-container"
        style={hud2Pos ? { left: `${hud2Pos.x}px`, top: `${hud2Pos.y}px` } : { top: '16px', right: '16px' }}
      >
        {!isTelemetryOpen ? (
          <div className="flex items-center gap-1 bg-black/85 p-1 rounded-lg border border-[#00f0ff]/40 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <div 
              onPointerDown={handleHud2PointerDown} 
              className="cursor-move touch-none p-1 hover:bg-white/10 rounded text-gray-400 hover:text-[#00f0ff] transition-colors"
              title="Alihkan Telemetri HUD (Drag & Drop)"
            >
              <GripVertical size={14} />
            </div>
            <button
              onClick={() => setIsTelemetryOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-[#00f0ff] hover:text-white transition-all cursor-pointer group"
              title="Tunjukkan / Buka Telemetri Siber OSINT"
            >
              <Activity size={16} className="animate-pulse text-[#00f0ff] group-hover:scale-110 transition-transform" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">Telemetri HUD</span>
            </button>
          </div>
        ) : (
          <div className="w-72 bg-black/90 border border-[#00f0ff]/40 rounded-xl p-3 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.8)] text-white font-mono text-xs relative overflow-hidden transition-all animate-in fade-in slide-in-from-top-2">
            {/* Cybertech corner accents */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#00f0ff]"></div>
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#00f0ff]"></div>
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#00f0ff]"></div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#00f0ff]"></div>

            {/* HUD Header (Draggable Handle) */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 select-none">
              <div 
                onPointerDown={handleHud2PointerDown}
                className="flex items-center gap-1.5 text-[#00f0ff] font-black tracking-wider text-[11px] cursor-move touch-none hover:text-white transition-colors"
                title="Pegang & Alihkan Telemetri HUD"
              >
                <GripVertical size={14} className="text-[#00f0ff]/70" />
                <Cpu size={14} className="animate-spin-slow text-[#00f0ff]" />
                <span>CYBER HUD OSINT</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsTelemetryOpen(false)}
                  className="p-1 text-gray-400 hover:text-[#00f0ff] hover:bg-[#00f0ff]/10 rounded transition-colors cursor-pointer"
                  title="Disorok / Sembunyikan Panel"
                >
                  <EyeOff size={13} />
                </button>
              </div>
            </div>

            {/* Threat Index Meter Bar */}
            <div className="bg-white/5 p-2 rounded border border-white/10 mb-2">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-gray-300">INDEKS ANCAMAN SIBER:</span>
                <span className="font-bold" style={{ color: overallThreat.color }}>
                  {overallThreat.score}% [{overallThreat.label}]
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full transition-all duration-500 rounded-full shadow-[0_0_10px_currentColor]" 
                  style={{ width: `${overallThreat.score}%`, backgroundColor: overallThreat.color }}
                ></div>
              </div>
            </div>

            {/* Telemetry Metrics */}
            <div className="grid grid-cols-2 gap-1.5 text-[9px] mb-2">
              <div className="bg-white/5 p-1.5 rounded border border-white/5 flex flex-col">
                <span className="text-gray-400">ENTITI PLOTTED</span>
                <span className="font-bold text-emerald-400 text-[11px]">
                  {geocodedNodes.length}/{data.nodes?.length || 0}
                </span>
              </div>
              <div className="bg-white/5 p-1.5 rounded border border-white/5 flex flex-col">
                <span className="text-gray-400">SAMBUNGAN VEKTOR</span>
                <span className="font-bold text-[#00f0ff] text-[11px]">{mapLinks.length} VEKTOR</span>
              </div>
            </div>

            {/* Cyber Controls */}
            <div className="flex flex-col gap-1 border-t border-white/10 pt-2 text-[9px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 flex items-center gap-1">
                  <Sliders size={11} className="text-[#00f0ff]" /> Grid CRT & Scanlines:
                </span>
                <button
                  onClick={() => setShowScanlines(!showScanlines)}
                  className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all ${showScanlines ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50' : 'bg-white/5 text-gray-400'}`}
                >
                  {showScanlines ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300 flex items-center gap-1">
                  <Radio size={11} className="text-emerald-400" /> Metrik Vektor Hubungan:
                </span>
                <button
                  onClick={() => setShowVectorMetrics(!showVectorMetrics)}
                  className={`px-1.5 py-0.5 rounded font-bold uppercase transition-all ${showVectorMetrics ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-white/5 text-gray-400'}`}
                >
                  {showVectorMetrics ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* GPS Telemetry Footer */}
            <div className="mt-2 text-[8px] text-gray-500 flex items-center justify-between pt-1 border-t border-white/5">
              <span className="flex items-center gap-1"><Zap size={9} className="text-amber-400" /> GPS SATELLITE: ONLINE</span>
              <span>256-BIT ENCRYPTED</span>
            </div>
          </div>
        )}
      </div>

      {/* CYBERTECH CRT SCANLINES & GRID OVERLAY */}
      {showScanlines && (
        <div className="absolute inset-0 pointer-events-none z-[400] overflow-hidden opacity-25">
          <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,3px_100%]"></div>
        </div>
      )}

      {/* MAP CANVAS */}
      <MapContainer
        center={[4.2105, 101.9758]} // Center of Malaysia
        zoom={6}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        preferCanvas={true}
        wheelDebounceTime={0}
        wheelPxPerZoomLevel={60}
        tapHold={false}
        ref={mapRef}
      >
        <MapClickHandler onClick={onBackgroundClick} />
        <TileLayer
          url={tileUrl}
          className={mapStyle === 'satellite' ? 'filter contrast-125 sepia-[0.2] opacity-90' : 'opacity-90'}
          maxZoom={19}
        />

        <MapViewController fitBounds={fitBoundsTrigger} />

        {/* Link Polylines */}
        {mapLinks.map(link => (
          <React.Fragment key={link.id}>
            <Polyline
              positions={[link.sourcePos, link.targetPos]}
              pathOptions={{
                color: link.isVault ? '#f59e0b' : '#ff0033',
                weight: link.isVault ? 3 : 2,
                dashArray: '6, 8',
                opacity: 0.75
              }}
            />

            {/* Connection Vector Metrics Badges */}
            {showVectorMetrics && (
              <Marker
                position={link.midPos}
                icon={L.divIcon({
                  className: 'custom-vector-metric-icon',
                  html: `
                    <div class="bg-black/90 text-[8px] font-mono font-bold text-cyan-400 border border-cyan-500/40 px-1.5 py-0.5 rounded shadow-lg backdrop-blur-md flex items-center gap-1 whitespace-nowrap -translate-x-1/2 -translate-y-1/2">
                      <span class="w-1 h-1 rounded-full bg-cyan-400 animate-pulse"></span>
                      <span>${link.label.toUpperCase()}</span>
                      <span class="text-gray-400 text-[7px]">[95%]</span>
                    </div>
                  `,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0]
                })}
                interactive={false}
              />
            )}
          </React.Fragment>
        ))}

        {/* Geocoded Node Markers */}
        {geocodedNodes.map(({ node, displayLat, displayLon, labelPosIndex, source }) => {
          const isSelected = selectedNodes.some(sn => sn.id === node.id);

          return (
            <React.Fragment key={node.id}>
              {/* Radar pulse effect for selected location */}
              {isSelected && (
                <Circle
                  center={[displayLat, displayLon]}
                  radius={20000}
                  pathOptions={{ color: '#ff0033', fillColor: '#ff0033', fillOpacity: 0.15, dashArray: '4, 4' }}
                />
              )}

              <Marker
                position={[displayLat, displayLon]}
                icon={createNodeIcon(node, isSelected, labelPosIndex)}
                eventHandlers={{
                  mouseover: (e) => {
                    setHoveredNodeInfo({
                      node,
                      position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY }
                    });
                  },
                  mouseout: () => {
                    if (!isHoveringTooltipRef.current) {
                      setTimeout(() => {
                        if (!isHoveringTooltipRef.current) {
                          setHoveredNodeInfo(null);
                        }
                      }, 250);
                    }
                  },
                  click: (e) => {
                    e.originalEvent.stopPropagation();
                    setHoveredNodeInfo({
                      node,
                      position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY }
                    });
                    onNodeClick(node, { x: e.originalEvent.clientX, y: e.originalEvent.clientY }, e.originalEvent.shiftKey);
                  },
                  dblclick: (e) => {
                    e.originalEvent.stopPropagation();
                    if (onNodeDoubleClick) onNodeDoubleClick(node, { x: e.originalEvent.clientX, y: e.originalEvent.clientY });
                  },
                  contextmenu: (e) => {
                    e.originalEvent.preventDefault();
                    e.originalEvent.stopPropagation();
                    if (onNodeRightClick) onNodeRightClick(node, { x: e.originalEvent.clientX, y: e.originalEvent.clientY });
                  }
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="bg-black/95 text-white p-2 border border-white/10 hover:border-[#ff0033]/30 transition-colors font-mono text-xs rounded min-w-[210px] max-w-[260px] shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5">
                      <span className="font-bold text-[#ff0033] uppercase truncate tracking-wide max-w-[140px]">{node.label}</span>
                      <span className="text-[9px] text-gray-300 uppercase bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{node.type}</span>
                    </div>

                    {/* TARGET IMAGE INFO DISPLAY */}
                    <div className="relative w-full h-24 mb-1.5 rounded border border-white/10 bg-black/80 overflow-hidden flex items-center justify-center group">
                      {node.imageUrl || (node.imageUrls && node.imageUrls[0]) ? (
                        <img 
                          src={node.imageUrl || (node.imageUrls && node.imageUrls[0])} 
                          alt={node.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900/80 to-black p-2 text-center relative">
                          <div className="absolute inset-0 bg-[radial-gradient(#ff0033_1px,transparent_1px)] [background-size:8px_8px] opacity-15"></div>
                          <Target size={20} className="text-[#ff0033]/70 mb-1 animate-pulse" />
                          <span className="text-[9px] font-mono text-gray-400 uppercase tracking-tight">Profil Visual Sasaran</span>
                          <span className="text-[8px] font-mono text-gray-600 uppercase">OSINT DOSIER PREVIEW</span>
                        </div>
                      )}
                      <div className="absolute top-1 left-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-mono text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shadow">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>TARGET RECON</span>
                      </div>
                    </div>

                    {node.details && (
                      <p className="text-[10px] text-gray-300 line-clamp-2 mb-1.5 leading-snug">{node.details}</p>
                    )}
                    <div className="text-[9px] text-[#00ccff] flex items-center justify-between pt-1 border-t border-white/10">
                      <span>KOORDINAT:</span>
                      <CopyableCoordinates lat={displayLat} lon={displayLon} />
                    </div>
                    <div className="text-[8px] text-gray-400 mt-1 flex items-center justify-between border-t border-white/10 pt-1">
                      <span>Sumber: {source}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onNodeClick(node, { x: e.clientX, y: e.clientY }, false);
                          if (onNodeDoubleClick) onNodeDoubleClick(node, { x: e.clientX, y: e.clientY });
                        }}
                        className="text-[#ff0033] hover:text-white font-mono font-bold hover:underline cursor-pointer bg-[#ff0033]/15 px-1.5 py-0.5 rounded border border-[#ff0033]/40 transition-all"
                      >
                        [Recon Radius 5KM]
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* BOTTOM SPATIAL STATUS BAR */}
      <div className="absolute bottom-4 left-4 z-[500] pointer-events-auto bg-black/80 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center gap-3 text-gray-300 shadow-lg">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <MapPin size={12} className="animate-bounce" />
          <span>{geocodedNodes.length} Entiti Terplot Atas Peta</span>
        </div>
        {nonGeocodedCount > 0 && (
          <div className="text-gray-500 border-l border-white/20 pl-3">
            ({nonGeocodedCount} entiti maya/tanpa koordinat kekal dalam Indeks Aset)
          </div>
        )}
      </div>

      {showPlaybackModal && (
        <RoutePlaybackModal
          nodes={data.nodes || []}
          onClose={() => setShowPlaybackModal(false)}
        />
      )}

      {showTrafficVisionModal && (
        <TrafficVisionMapModal
          onClose={() => setShowTrafficVisionModal(false)}
        />
      )}

      {/* Tactical Node HUD Tooltip */}
      <NodeHudTooltip 
        node={hoveredNodeInfo?.node || null} 
        position={hoveredNodeInfo?.position || null} 
        links={data.links} 
        onDeleteNode={(nodeId) => {
          if (onDeleteNode) onDeleteNode(nodeId);
          setHoveredNodeInfo(null);
        }}
        onClose={() => setHoveredNodeInfo(null)}
        onMouseEnter={() => { isHoveringTooltipRef.current = true; }}
        onMouseLeave={() => { isHoveringTooltipRef.current = false; }}
      />
    </div>
  );
};

export default InteractiveSpatialMapCanvas;
