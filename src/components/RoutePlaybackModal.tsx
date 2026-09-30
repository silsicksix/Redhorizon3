import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Play, Pause, RotateCcw, FastForward, Navigation, MapPin, Gauge, Clock, ShieldAlert, Compass, Eye, CheckCircle2, Download, Sliders, Activity, Radio, Volume2, VolumeX } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Node } from '../types';
import { extractNodeCoordinates } from '../utils/geoUtils';
import { CopyableCoordinates } from './CopyableCoordinates';

// Fix Leaflet's default icon path issues in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to manage Leaflet map sizing, initial bounds, and smooth camera tracking
function PlaybackMapController({
  coords,
  followTarget,
  waypoints,
  isPlaying
}: {
  coords: [number, number];
  followTarget: boolean;
  waypoints: RouteWaypoint[];
  isPlaying: boolean;
}) {
  const map = useMap();
  const isInitialFitRef = useRef<boolean>(false);

  // Invalidate map size so Leaflet renders all map tiles cleanly inside the modal container
  useEffect(() => {
    const invalidate = () => {
      if (map) {
        map.invalidateSize();
      }
    };

    invalidate();
    const t1 = setTimeout(invalidate, 100);
    const t2 = setTimeout(invalidate, 300);
    const t3 = setTimeout(invalidate, 600);

    window.addEventListener('resize', invalidate);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', invalidate);
    };
  }, [map]);

  // Initial fit bounds to whole route on modal mount
  useEffect(() => {
    if (!isInitialFitRef.current && waypoints && waypoints.length >= 2 && map) {
      isInitialFitRef.current = true;
      try {
        const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lon]));
        map.fitBounds(bounds, { padding: [50, 50], animate: false });
      } catch (e) {
        // Fallback silently
      }
    }
  }, [map, waypoints]);

  // Smooth camera tracking without animation queue collisions
  useEffect(() => {
    if (followTarget && coords && map) {
      // Use animate: false to keep the target dead-center continuously during frame updates
      const currentZoom = Math.max(14, map.getZoom());
      map.setView(coords, currentZoom, { animate: false });
    }
  }, [coords, followTarget, map]);

  return null;
}

export interface RouteWaypoint {
  id: string;
  label: string;
  lat: number;
  lon: number;
  timestamp?: string;
  speed?: number; // km/h
  type?: string;
}

interface RoutePlaybackModalProps {
  nodes: Node[];
  initialSelectedNode?: Node | null;
  onClose: () => void;
}

// Calculate distance between two lat/lon points in kilometers (Haversine formula)
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate bearing angle between two points in degrees (0-360)
function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const brng = ((θ * 180) / Math.PI + 360) % 360;
  return Math.round(brng);
}

export const RoutePlaybackModal: React.FC<RoutePlaybackModalProps> = ({
  nodes,
  initialSelectedNode,
  onClose
}) => {
  // Extract all geocoded waypoints from nodes
  const rawWaypoints = useMemo(() => {
    const list: RouteWaypoint[] = [];
    nodes.forEach((n, idx) => {
      const coords = extractNodeCoordinates(n);
      if (coords) {
        // Simulated timestamps if missing
        const date = new Date(Date.now() - (nodes.length - idx) * 15 * 60 * 1000);
        list.push({
          id: n.id,
          label: n.label,
          lat: coords.lat,
          lon: coords.lon,
          timestamp: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: n.type
        });
      }
    });
    return list;
  }, [nodes]);

  // If fewer than 2 waypoints exist, generate a realistic tactical route around default center
  const waypoints = useMemo(() => {
    if (rawWaypoints.length >= 2) return rawWaypoints;

    // Use initial node coordinate or default to KL Malaysia coordinates
    const baseLat = rawWaypoints[0]?.lat || 3.1390;
    const baseLon = rawWaypoints[0]?.lon || 101.6869;

    return [
      { id: 'wp-1', label: rawWaypoints[0]?.label || 'PUNCA_LOKASI_1', lat: baseLat, lon: baseLon, timestamp: '08:00:00' },
      { id: 'wp-2', label: 'CHECKPOINT_UTAMA_A', lat: baseLat + 0.012, lon: baseLon + 0.008, timestamp: '08:15:30' },
      { id: 'wp-3', label: 'HELAI_PERSEKUTUAN_B', lat: baseLat + 0.024, lon: baseLon + 0.019, timestamp: '08:32:10' },
      { id: 'wp-4', label: 'STESEN_PENGUMPULAN_C', lat: baseLat + 0.018, lon: baseLon + 0.035, timestamp: '08:48:00' },
      { id: 'wp-5', label: 'PERIMETER_SASARAN_AKHIR', lat: baseLat + 0.035, lon: baseLon + 0.048, timestamp: '09:10:15' }
    ];
  }, [rawWaypoints]);

  // Total route distance in KM
  const totalDistance = useMemo(() => {
    let dist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      dist += getHaversineDistance(waypoints[i].lat, waypoints[i].lon, waypoints[i + 1].lat, waypoints[i + 1].lon);
    }
    return dist;
  }, [waypoints]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0); // 0.0 to 1.0
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [followTarget, setFollowTarget] = useState<boolean>(true);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite' | 'street' | 'humanitarian' | 'topo'>('dark');

  // 100% Free Map Layers (No API Key required)
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
  const [soundAlert, setSoundAlert] = useState<boolean>(true);

  // Animation frame ref
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Calculate current interpolated position based on progress
  const currentInterpolatedState = useMemo(() => {
    if (waypoints.length === 0) return { lat: 3.1390, lon: 101.6869, bearing: 0, speed: 0, currDist: 0, currentSegmentIdx: 0 };
    if (waypoints.length === 1) return { lat: waypoints[0].lat, lon: waypoints[0].lon, bearing: 0, speed: 0, currDist: 0, currentSegmentIdx: 0 };

    const totalSegments = waypoints.length - 1;
    const globalProg = Math.max(0, Math.min(1, progress));
    const scaledProg = globalProg * totalSegments;
    const segmentIdx = Math.min(Math.floor(scaledProg), totalSegments - 1);
    const segmentProgress = scaledProg - segmentIdx;

    const p1 = waypoints[segmentIdx];
    const p2 = waypoints[segmentIdx + 1];

    const currentLat = p1.lat + (p2.lat - p1.lat) * segmentProgress;
    const currentLon = p1.lon + (p2.lon - p1.lon) * segmentProgress;

    const bearing = getBearing(p1.lat, p1.lon, p2.lat, p2.lon);
    const segDist = getHaversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);

    // Calculate cumulative distance up to current progress
    let cumDist = 0;
    for (let i = 0; i < segmentIdx; i++) {
      cumDist += getHaversineDistance(waypoints[i].lat, waypoints[i].lon, waypoints[i + 1].lat, waypoints[i + 1].lon);
    }
    cumDist += segDist * segmentProgress;

    // Simulated speed between 30km/h and 90km/h
    const speed = Math.round(45 + Math.sin(scaledProg * Math.PI * 2) * 20);

    return {
      lat: currentLat,
      lon: currentLon,
      bearing,
      speed,
      currDist: cumDist,
      currentSegmentIdx: segmentIdx
    };
  }, [progress, waypoints]);

  // Main playback loop
  useEffect(() => {
    if (!isPlaying) return;

    lastTimeRef.current = performance.now();

    const updateLoop = (now: number) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Base duration for full route playback at 1x is 30 seconds
      const step = (deltaSec / 30) * speedMultiplier;

      setProgress(prev => {
        const next = prev + step;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });

      animRef.current = requestAnimationFrame(updateLoop);
    };

    animRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, speedMultiplier]);

  const handleRestart = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  const handleStepNext = () => {
    if (waypoints.length <= 1) return;
    const segStep = 1 / (waypoints.length - 1);
    setProgress(prev => Math.min(1, Math.floor(prev / segStep + 1.001) * segStep));
  };

  const handleStepPrev = () => {
    if (waypoints.length <= 1) return;
    const segStep = 1 / (waypoints.length - 1);
    setProgress(prev => Math.max(0, Math.floor(prev / segStep - 0.001) * segStep));
  };

  // Custom vehicle/target animated icon
  const vehicleIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-vehicle-playback-icon',
      html: `
        <div class="relative flex items-center justify-center w-12 h-12 -ml-6 -mt-6">
          <div class="absolute inset-0 rounded-full border-2 border-[#00f0ff] opacity-60 animate-ping"></div>
          <div class="absolute inset-1 rounded-full border border-red-500 opacity-80"></div>
          <div class="relative w-8 h-8 rounded-full bg-black/90 border-2 border-[#ff0033] shadow-[0_0_15px_#ff0033] flex items-center justify-center transition-transform duration-200" style="transform: rotate(${currentInterpolatedState.bearing}deg);">
            <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-[#00f0ff]"></div>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  }, [currentInterpolatedState.bearing]);

  // Route Polyline positions
  const routePolylineCoords: [number, number][] = useMemo(() => {
    return waypoints.map(w => [w.lat, w.lon]);
  }, [waypoints]);

  // Export playback route as CSV
  const exportRouteCSV = () => {
    const csvRows = [
      ['WAYPOINT_INDEX', 'LABEL', 'LATITUDE', 'LONGITUDE', 'TIMESTAMP'],
      ...waypoints.map((w, idx) => [idx + 1, `"${w.label}"`, w.lat, w.lon, w.timestamp || 'N/A'])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Route_Playback_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 select-none pointer-events-auto"
    >
      <div className="w-full max-w-6xl h-[90vh] bg-[#050508] border border-[#00f0ff]/40 shadow-[0_0_80px_rgba(0,240,255,0.15)] font-mono flex flex-col rounded-sm overflow-hidden relative">
        
        {/* Header HUD */}
        <div className="flex justify-between items-center p-3 sm:px-5 bg-black/80 border-b border-[#00f0ff]/30 z-30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/50 text-[#00f0ff] animate-pulse">
              <Navigation size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-[0.2em] uppercase">
                  SIMULASI PERGERAKAN MASA-NYATA (ROUTE PLAYBACK)
                </h2>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#ff0033]/20 text-[#ff0033] border border-[#ff0033]/50 animate-pulse">
                  LIVE TRACKING
                </span>
              </div>
              <div className="text-[10px] text-gray-400 flex items-center gap-4 mt-0.5">
                <span>CHECKPOINTS: <strong className="text-[#00f0ff]">{waypoints.length} POINT</strong></span>
                <span>JUMLAH JARAK: <strong className="text-white">{totalDistance.toFixed(2)} KM</strong></span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="hover:text-white text-[#ff0033] transition-colors p-1 hover:rotate-90 duration-300"
          >
            <X size={22} />
          </button>
        </div>

        {/* Main Workspace Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* Map Viewer */}
          <div className="flex-1 relative bg-black">
            <style>{`
              .leaflet-container { background: #000 !important; font-family: monospace; }
              .leaflet-control-attribution { display: none; }
            `}</style>

            <MapContainer
              center={[currentInterpolatedState.lat, currentInterpolatedState.lon]}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url={tileUrl}
                maxZoom={19}
              />

              <PlaybackMapController 
                coords={[currentInterpolatedState.lat, currentInterpolatedState.lon]} 
                followTarget={followTarget} 
                waypoints={waypoints}
                isPlaying={isPlaying}
              />

              {/* Waypoint Markers */}
              {waypoints.map((wp, idx) => (
                <Marker
                  key={wp.id}
                  position={[wp.lat, wp.lon]}
                  icon={L.divIcon({
                    className: 'custom-wp-icon',
                    html: `
                      <div class="relative flex items-center justify-center">
                        <div class="w-6 h-6 rounded-full bg-black/90 border border-[#00f0ff] text-[10px] text-[#00f0ff] font-bold flex items-center justify-center shadow-[0_0_8px_#00f0ff]">
                          ${idx + 1}
                        </div>
                      </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  })}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-1 font-mono text-[10px] text-white bg-black">
                      <div className="font-bold text-[#00f0ff]">{wp.label}</div>
                      <div>Lat: {wp.lat.toFixed(5)}</div>
                      <div>Lon: {wp.lon.toFixed(5)}</div>
                      <div className="text-gray-400">{wp.timestamp}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Path Polyline */}
              <Polyline
                positions={routePolylineCoords}
                pathOptions={{
                  color: '#00f0ff',
                  weight: 3,
                  opacity: 0.8,
                  dashArray: '8, 8'
                }}
              />

              {/* Active Moving Vehicle Marker */}
              <Marker
                position={[currentInterpolatedState.lat, currentInterpolatedState.lon]}
                icon={vehicleIcon}
              />

              {/* Pulsing Radius around target */}
              <Circle
                center={[currentInterpolatedState.lat, currentInterpolatedState.lon]}
                radius={300}
                pathOptions={{ color: '#ff0033', fillColor: '#ff0033', fillOpacity: 0.15, weight: 1 }}
              />
            </MapContainer>

            {/* Overlay Telemetry HUD on Map */}
            <div className="absolute top-4 left-4 z-[999] bg-black/85 border border-[#00f0ff]/50 p-3 backdrop-blur-md text-[10px] space-y-1.5 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              <div className="flex justify-between items-center text-[#00f0ff] font-bold border-b border-[#00f0ff]/30 pb-1">
                <span className="flex items-center gap-1.5">
                  <Activity size={12} className="animate-pulse" /> TELEMETRI SASARAN
                </span>
                <span className="text-gray-400">WAYPOINT #{currentInterpolatedState.currentSegmentIdx + 1}/{waypoints.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-300 items-center">
                <span>KOORDINAT:</span> 
                <div className="text-right">
                  <CopyableCoordinates lat={currentInterpolatedState.lat} lon={currentInterpolatedState.lon} />
                </div>
                <span>AARAH/BEARING:</span> <strong className="text-[#00f0ff] text-right">{currentInterpolatedState.bearing}°</strong>
                <span>KELAJUAN:</span> <strong className="text-[#10b981] text-right">{currentInterpolatedState.speed} KM/H</strong>
                <span>JARAK TEMPUH:</span> <strong className="text-white text-right">{currentInterpolatedState.currDist.toFixed(2)} KM</strong>
              </div>
            </div>

            {/* Top Right Quick Controls */}
            <div className="absolute top-4 right-4 z-[999] flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-1 bg-black/80 p-1 border border-gray-700 backdrop-blur-md">
                <button
                  onClick={() => setMapStyle('dark')}
                  className={`px-2 py-1 text-[9px] font-bold uppercase transition-all ${mapStyle === 'dark' ? 'bg-[#00f0ff] text-black shadow-[0_0_8px_#00f0ff]' : 'text-gray-400 hover:text-white'}`}
                  title="Esri World Dark Gray"
                >
                  Dark
                </button>
                <button
                  onClick={() => setMapStyle('satellite')}
                  className={`px-2 py-1 text-[9px] font-bold uppercase transition-all ${mapStyle === 'satellite' ? 'bg-[#00f0ff] text-black shadow-[0_0_8px_#00f0ff]' : 'text-gray-400 hover:text-white'}`}
                  title="Esri World Imagery Satelit HD"
                >
                  Satelit
                </button>
                <button
                  onClick={() => setMapStyle('street')}
                  className={`px-2 py-1 text-[9px] font-bold uppercase transition-all ${mapStyle === 'street' ? 'bg-[#00f0ff] text-black shadow-[0_0_8px_#00f0ff]' : 'text-gray-400 hover:text-white'}`}
                  title="OpenStreetMap Standard"
                >
                  OSM
                </button>
                <button
                  onClick={() => setMapStyle('humanitarian')}
                  className={`px-2 py-1 text-[9px] font-bold uppercase transition-all ${mapStyle === 'humanitarian' ? 'bg-[#00f0ff] text-black shadow-[0_0_8px_#00f0ff]' : 'text-gray-400 hover:text-white'}`}
                  title="OSM Humanitarian HOT"
                >
                  HOT
                </button>
                <button
                  onClick={() => setMapStyle('topo')}
                  className={`px-2 py-1 text-[9px] font-bold uppercase transition-all ${mapStyle === 'topo' ? 'bg-[#00f0ff] text-black shadow-[0_0_8px_#00f0ff]' : 'text-gray-400 hover:text-white'}`}
                  title="Esri Topographic Map"
                >
                  Topo
                </button>
              </div>

              <button
                onClick={() => setFollowTarget(!followTarget)}
                className={`px-3 py-1.5 text-[10px] font-bold border transition-all flex items-center gap-1.5 backdrop-blur-md ${
                  followTarget
                    ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff]'
                    : 'bg-black/80 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Eye size={12} /> {followTarget ? 'Kamera: Ikut Sasaran' : 'Kamera: Bebas'}
              </button>
              <button
                onClick={exportRouteCSV}
                className="px-3 py-1.5 text-[10px] font-bold bg-black/80 border border-gray-700 text-gray-300 hover:border-[#00f0ff] hover:text-[#00f0ff] transition-all flex items-center gap-1.5 backdrop-blur-md"
              >
                <Download size={12} /> CSV Route
              </button>
            </div>
          </div>

          {/* Right Sidebar - Checkpoints List & Info */}
          <div className="w-full lg:w-80 bg-[#030306] border-l border-[#00f0ff]/30 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            
            <div className="border border-[#00f0ff]/30 bg-[#00f0ff]/5 p-3 rounded-sm">
              <span className="text-[10px] font-bold text-[#00f0ff] uppercase tracking-wider block mb-1">Status Simulasi</span>
              <div className="text-lg font-bold text-white flex items-center justify-between">
                <span>{isPlaying ? 'PLAYBACK AKTIF' : progress >= 1 ? 'SIMULASI SELESAI' : 'DIHENTIKAN'}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-[#10b981] animate-ping' : 'bg-amber-500'}`}></span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Laluan dikesan melalui logik rentas-koordinat nod kes.
              </p>
            </div>

            {/* Checkpoints Timeline list */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                Senarai Waypoint Checkpoint ({waypoints.length})
              </span>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {waypoints.map((wp, idx) => {
                  const isCurrent = idx === currentInterpolatedState.currentSegmentIdx;
                  const isPassed = idx < currentInterpolatedState.currentSegmentIdx;

                  return (
                    <div
                      key={wp.id}
                      onClick={() => setProgress(idx / Math.max(1, waypoints.length - 1))}
                      className={`p-2.5 border rounded-sm transition-all cursor-pointer flex items-start gap-2.5 ${
                        isCurrent
                          ? 'border-[#00f0ff] bg-[#00f0ff]/10 text-white shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                          : isPassed
                          ? 'border-gray-800 bg-black/40 text-gray-400 hover:border-gray-600'
                          : 'border-gray-900 bg-black/20 text-gray-500 hover:border-gray-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isCurrent ? 'bg-[#00f0ff] text-black' : isPassed ? 'bg-gray-800 text-gray-300' : 'bg-gray-900 text-gray-600'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0 text-[10px]">
                        <div className="font-bold truncate text-gray-200">{wp.label}</div>
                        <div className="mt-0.5">
                          <CopyableCoordinates lat={wp.lat} lon={wp.lon} />
                        </div>
                        {wp.timestamp && (
                          <div className="text-[9px] text-[#00f0ff]/80 mt-0.5">{wp.timestamp}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Playback Control Bar */}
        <div className="bg-black border-t border-[#00f0ff]/30 p-3 sm:px-6 flex flex-col gap-2 z-30">
          
          {/* Timeline Slider */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400 font-mono shrink-0">
              {(progress * 100).toFixed(0)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00f0ff]"
            />
            <span className="text-[10px] text-[#00f0ff] font-mono shrink-0">
              100%
            </span>
          </div>

          {/* Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestart}
                className="p-2 bg-black border border-gray-800 hover:border-[#00f0ff] text-gray-300 hover:text-white transition-all rounded-sm"
                title="Restart"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={handleStepPrev}
                className="p-2 bg-black border border-gray-800 hover:border-[#00f0ff] text-gray-300 hover:text-white transition-all rounded-sm"
                title="Previous Waypoint"
              >
                <Navigation size={14} className="-rotate-90" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2 text-[11px] font-bold border flex items-center gap-2 transition-all rounded-sm ${
                  isPlaying
                    ? 'bg-[#ff0033]/20 border-[#ff0033] text-[#ff0033]'
                    : 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff]'
                }`}
              >
                {isPlaying ? <><Pause size={14} /> Jeda</> : <><Play size={14} /> Mainkan</>}
              </button>
              <button
                onClick={handleStepNext}
                className="p-2 bg-black border border-gray-800 hover:border-[#00f0ff] text-gray-300 hover:text-white transition-all rounded-sm"
                title="Next Waypoint"
              >
                <Navigation size={14} className="rotate-90" />
              </button>
            </div>

            {/* Speed Multiplier Selectors */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest hidden sm:inline">Kelajuan:</span>
              {[0.5, 1, 2, 5, 10].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeedMultiplier(s)}
                  className={`px-2 py-1 text-[10px] font-bold border transition-all rounded-sm ${
                    speedMultiplier === s
                      ? 'bg-[#00f0ff] text-black border-[#00f0ff]'
                      : 'bg-black border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
