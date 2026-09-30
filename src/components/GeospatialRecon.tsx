
import React, { useState, useEffect } from 'react';
import { X, MapPin, Globe, Satellite, Sun, Moon, Clock, ExternalLink, Crosshair, Navigation, Loader2, SignalHigh, FileText, Download, Play, Layers } from 'lucide-react';
import { Node } from '../types';
import { resolveLocationCoordinates, extractAddressFromText, fetchGeospatialIntel } from '../services/geminiService';
import { extractNodeCoordinates } from '../utils/geoUtils';
import { CopyableCoordinates } from './CopyableCoordinates';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import Markdown from 'react-markdown';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { exportGeointCSV } from '../utils/geointExporter';
import { RoutePlaybackModal } from './RoutePlaybackModal';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom sweeping radar icon
const radarIcon = L.divIcon({
  className: 'custom-radar-icon',
  html: `
    <div class="relative flex items-center justify-center w-16 h-16 -ml-8 -mt-8">
        <div class="absolute inset-0 rounded-full border-2 border-red-500 opacity-50 animate-ping"></div>
        <div class="absolute inset-2 rounded-full border border-red-500 opacity-30"></div>
        <div class="absolute w-full h-[1px] bg-red-500/50"></div>
        <div class="absolute h-full w-[1px] bg-red-500/50"></div>
        <div class="absolute w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_red]"></div>
        <div class="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,0,0,0.5)_90deg,transparent_90deg)] animate-spin" style="animation-duration: 2s;"></div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

function MapZoomController({ coords }: { coords: {lat: number, lon: number} | null }) {
    const map = useMap();
    useEffect(() => {
        if (coords) {
            // Start zoomed out, then fly into target to simulate "satellite zoom-in" movie effect
            map.setView([coords.lat, coords.lon], 5, { animate: false });
            setTimeout(() => {
                map.flyTo([coords.lat, coords.lon], 18, { duration: 3, easeLinearity: 0.1 });
            }, 1000);
        }
    }, [coords, map]);
    return null;
}

interface GeospatialReconProps {
  node: Node;
  onClose: () => void;
}

const GeospatialRecon: React.FC<GeospatialReconProps> = ({ node, onClose }) => {
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiResolving, setAiResolving] = useState(false);
  const [sourceType, setSourceType] = useState('INITIALIZING');
  const [zoomLevel, setZoomLevel] = useState(0);
  const [intelText, setIntelText] = useState<string | null>(null);
  const [showPlaybackModal, setShowPlaybackModal] = useState<boolean>(false);

  const handleExportCSV = () => {
    exportGeointCSV({
      targetLabel: node.label,
      targetType: node.type,
      coords,
      sourceType,
      intelText,
      localTime: getLocalTime(),
      threatLevel: node.vaultMatch ? 'VAULT_MATCH_ALERT' : 'EVALUATED_GEOINT'
    });
  };

  // Extract location data on mount
  useEffect(() => {
    const init = async () => {
        setLoading(true);
        // 1. Try to find explicit coordinates in details/reports
        const combinedText = (node.details || '') + '\n' + (node.reports || '');
        const coordMatch = combinedText.match(/(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
        
        if (coordMatch) {
          setCoords({ lat: parseFloat(coordMatch[1]), lon: parseFloat(coordMatch[2]) });
          setQuery(`${coordMatch[1]},${coordMatch[2]}`);
          setSourceType('METADATA_EXTRACT');
          setLoading(false);
          return;
        }

        // 2. Try High-Precision Server GEOINT Geocoding with Google Search Grounding & Context
        setAiResolving(true);
        setSourceType('SATELLITE_SCANNING');
        try {
            // First attempt: Detailed search using node label + details context
            const highPrecisionResult = await resolveLocationCoordinates(node.label, combinedText, node.type || 'location');
            if (highPrecisionResult && highPrecisionResult.lat && highPrecisionResult.lon && highPrecisionResult.source !== 'DEFAULT_COORDINATES') {
                setCoords({ lat: highPrecisionResult.lat, lon: highPrecisionResult.lon });
                setSourceType(highPrecisionResult.source);
                if (highPrecisionResult.address) setQuery(highPrecisionResult.address);
                setAiResolving(false);
                setLoading(false);
                return;
            }
        } catch (e) {
            console.warn("High-precision geocoding initial attempt skipped:", e);
        }

        // 3. Check instant Malaysian Geo Database / Postcode resolver
        const localGeo = extractNodeCoordinates(node);
        if (localGeo && localGeo.source !== 'ESTIMATED_LOCATION') {
          setCoords({ lat: localGeo.lat, lon: localGeo.lon });
          setQuery(localGeo.name || node.label);
          setSourceType(localGeo.source || 'GEO_DATABASE');
          setLoading(false);
          setAiResolving(false);
          return;
        }

        // 4. Fallback to label (City Name / Address)
        setQuery(node.label);
        
        // 5. HYBRID TRIANGULATION (OSINT + AI address extraction)
        try {
            // Extract address first
            const extractedAddress = await extractAddressFromText(combinedText);
            
            let result = null;
            
            // Try extracted address first
            if (extractedAddress) {
                setQuery(extractedAddress);
                result = await resolveLocationCoordinates(extractedAddress, combinedText, node.type);
            }
            
            // If that failed, try the label
            if (!result || !result.lat) {
                setQuery(node.label);
                result = await resolveLocationCoordinates(node.label, combinedText, node.type);
            }
            
            // If that failed, try combined text as last resort
            if (!result || !result.lat) {
                result = await resolveLocationCoordinates(combinedText, '', node.type);
            }

            if (result && result.lat && result.lon) {
                setCoords({ lat: result.lat, lon: result.lon });
                setSourceType(result.source || 'HYBRID_RESOLVE');
                // Optionally update query to address for better external links
                if (result.address) setQuery(result.address);
            } else if (localGeo) {
                setCoords({ lat: localGeo.lat, lon: localGeo.lon });
                setSourceType(localGeo.source);
            }
        } catch (e) {
            console.error("Auto-Geocoding failed", e);
            if (localGeo) {
                setCoords({ lat: localGeo.lat, lon: localGeo.lon });
                setSourceType(localGeo.source);
            } else {
                setSourceType('TRIANGULATION_FAILED');
            }
        } finally {
            setAiResolving(false);
            setLoading(false);
        }

        // Simulate HUD zoom level counter
        const interval = setInterval(() => {
            setZoomLevel(prev => {
                const current = prev + Math.random() * 2;
                return current > 99.9 ? 99.9 : current;
            });
        }, 100);

        return () => clearInterval(interval);
    };

    init();
  }, [node]);

  useEffect(() => {
    if (coords) {
        fetchGeospatialIntel(coords.lat, coords.lon).then(intel => {
            setIntelText(intel);
        });
    }
  }, [coords]);

  const getLocalTime = () => {
      const date = new Date();
      return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const googleEarthUrl = `https://earth.google.com/web/search/${encodeURIComponent(query)}`;
  const wazeUrl = coords 
    ? `https://www.waze.com/live-map/directions?to=ll.${coords.lat},${coords.lon}`
    : `https://www.waze.com/live-map/search?q=${encodeURIComponent(query)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-6xl bg-[#030303] border border-[#ff0033]/50 shadow-[0_0_80px_rgba(255,0,51,0.15)] font-mono flex flex-col h-[85vh] relative overflow-hidden rounded-sm">
        
        {/* Cinematic HUD Overlays */}
        <div className="absolute inset-0 pointer-events-none z-20">
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-[#ff0033]/70"></div>
            <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-[#ff0033]/70"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-[#ff0033]/70"></div>
            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-[#ff0033]/70"></div>
            
            {/* Scanlines Effect */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(transparent_50%,rgba(255,0,51,1)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
            
            {/* Scrolling code lines left edge */}
            <div className="absolute left-2 top-1/4 h-1/2 flex flex-col gap-1 text-[6px] text-[#ff0033]/40 font-mono opacity-50 flex flex-col-reverse overflow-hidden">
                {Array.from({length: 20}).map((_, i) => (
                    <div key={i} className="whitespace-nowrap">0x{Math.floor(Math.random()*16777215).toString(16).toUpperCase().padStart(6,'0')} : EXEC</div>
                ))}
            </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-[#ff0033]/30 bg-[#ff0033]/5 z-30">
          <div className="flex items-center gap-3">
             <div className="relative">
                 <Globe className="text-[#ff0033]" size={20} />
                 <div className="absolute inset-0 animate-ping opacity-50"><Globe className="text-[#ff0033]" size={20} /></div>
             </div>
             <div>
               <h2 className="text-lg font-black text-white tracking-[0.2em] uppercase flex items-center gap-2">
                 TACTICAL GEOINT <span className="text-[10px] text-[#ff0033] bg-[#ff0033]/10 px-1 border border-[#ff0033]/50">RESTRICTED</span>
               </h2>
               <div className="flex gap-4 text-[10px] text-gray-400 items-center">
                   <span className="flex items-center gap-1"><Crosshair size={10} className="text-[#ff0033]"/> TARGET: {node.label}</span>
                   {coords && <CopyableCoordinates lat={coords.lat} lon={coords.lon} label="TGT_LOC" />}
               </div>
             </div>
          </div>
          <button onClick={onClose} className="hover:text-white text-[#ff0033] transition-colors hover:rotate-90 duration-300"><X /></button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden z-20 relative">
            
            {/* LEFT: Map Visualization */}
            <div className="flex-1 relative bg-black border-r border-[#ff0033]/30">
                {loading || aiResolving ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[#ff0033] bg-[#050505]">
                        <div className="relative mb-6">
                            <Crosshair size={64} className="animate-spin-slow opacity-50" strokeWidth={1} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Satellite size={24} className="animate-pulse" />
                            </div>
                        </div>
                        <div className="text-sm font-black tracking-[0.3em] uppercase">
                            {aiResolving ? "INITIALIZING HYBRID TACTICAL LINK" : "ALIGNING SATELLITE OPTICS"}
                        </div>
                        <div className="mt-4 flex gap-1">
                            {Array.from({length: 10}).map((_, i) => (
                                <div key={i} className={`w-1 h-3 ${i < (zoomLevel/10) ? 'bg-[#ff0033] shadow-[0_0_5px_#ff0033]' : 'bg-[#ff0033]/20'}`}></div>
                            ))}
                        </div>
                        <div className="text-[10px] mt-4 font-mono text-[#ff0033] opacity-70 uppercase tracking-widest">{sourceType}... {zoomLevel.toFixed(1)}%</div>
                    </div>
                ) : (
                    <>
                       {coords ? (
                           <div className="h-full w-full relative">
                               <style>{`
                                   .leaflet-container { background: #000 !important; font-family: monospace; }
                                   .leaflet-control-attribution { display: none; }
                                   .leaflet-marker-icon { z-index: 1000 !important; }
                               `}</style>
                               <MapContainer 
                                   center={[coords.lat, coords.lon]} 
                                   zoom={5} 
                                   style={{ height: '100%', width: '100%' }}
                                   zoomControl={false}
                               >
                                   <TileLayer 
                                      url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
                                      className="filter contrast-125 sepia-[0.3] hue-rotate-[-30deg] opacity-80"
                                      maxZoom={20}
                                   />
                                   <MapZoomController coords={coords} />
                                   
                                   {/* The sweeping target radar */}
                                   <Marker position={[coords.lat, coords.lon]} icon={radarIcon} />
                                   
                                   {/* The 500m, 1.5KM and 5KM radius threat & recon zones */}
                                   <Circle 
                                      center={[coords.lat, coords.lon]} 
                                      radius={500} 
                                      pathOptions={{ color: '#ff0033', fillColor: '#ff0033', fillOpacity: 0.1, dashArray: '4 8' }} 
                                   />
                                   <Circle 
                                      center={[coords.lat, coords.lon]} 
                                      radius={1500} 
                                      pathOptions={{ color: '#ff0033', weight: 1, fillColor: 'transparent', opacity: 0.3 }} 
                                   />
                                   <Circle 
                                      center={[coords.lat, coords.lon]} 
                                      radius={5000} 
                                      pathOptions={{ color: '#00f0ff', weight: 1.5, fillColor: '#00f0ff', fillOpacity: 0.05, dashArray: '6 6' }} 
                                   />
                               </MapContainer>
                           </div>
                       ) : (
                           <div className="flex flex-col items-center justify-center h-full text-[#ff0033]/50 p-8 text-center bg-[#050505]">
                               <MapPin size={64} className="mb-4 opacity-50" />
                               <p className="font-black tracking-[0.2em] uppercase text-white">Target Ghosted</p>
                               <p className="text-xs mt-2 max-w-sm border-t border-[#ff0033]/20 pt-2 font-mono">
                                   Coordinates unresolvable. Target "{node.label}" is employing counter-surveillance or identifier is too vague to lock coordinates.
                               </p>
                           </div>
                       )}
                       
                       {/* Map HUD Overlay Details */}
                       {coords && (
                           <div className="absolute top-4 left-4 z-[999] pointer-events-auto group">
                               <div className="bg-black/80 border border-[#ff0033]/50 p-2 backdrop-blur-sm shadow-[0_0_15px_rgba(255,0,51,0.2)]">
                                   <div className="flex justify-between items-center gap-4 mb-2 border-b border-[#ff0033]/30 pb-1">
                                       <div className="flex items-center gap-1.5 text-[10px] text-[#ff0033] font-bold">
                                           <SignalHigh size={12} className="animate-pulse" /> SATELLITE LINK LOCKED
                                       </div>
                                       <span className="text-[10px] text-white">ALT_500M</span>
                                   </div>
                                   <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-mono whitespace-nowrap items-center">
                                        <div className="text-gray-500">KOORDINAT</div>
                                        <div className="text-right">
                                          <CopyableCoordinates lat={coords.lat} lon={coords.lon} />
                                        </div>
                                        <div className="text-gray-500">HEADING</div><div className="text-white text-right">043.5 DEG TRUE</div>
                                        <div className="text-gray-500">VELOCITY</div><div className="text-white text-right">0.0 KNOTS (STATIONARY)</div>
                                   </div>
                               </div>
                           </div>
                       )}

                       <div className="absolute bottom-4 right-4 z-[999] pointer-events-none text-right">
                           <div className="text-[10px] font-bold text-[#ff0033] tracking-[0.2em] mb-1 opacity-80 backdrop-blur-sm bg-black/40 px-2">VISUAL INTEL ENGINES</div>
                           <div className="text-[8px] text-white tracking-widest bg-black/60 px-2 py-0.5 border border-[#ff0033]/20">{sourceType.replace(/_/g, ' ')}</div>
                       </div>
                    </>
                )}
            </div>

            {/* RIGHT: Intel & Controls */}
            <div className="w-full md:w-80 bg-[#030303] p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar border-l border-[#ff0033]/20">
                
                {/* Time Analysis */}
                <div className="border border-[#ff0033]/40 bg-[#ff0033]/5 p-4 relative overflow-hidden shadow-[inset_0_0_20px_rgba(255,0,51,0.1)]">
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className="text-[10px] font-bold text-[#ff0033] uppercase tracking-[0.2em]">Local Intel</span>
                        <Clock size={14} className="text-[#ff0033] animate-pulse"/>
                    </div>
                    <div className="text-2xl font-mono text-white font-black relative z-10 tracking-widest">
                        {getLocalTime()} <span className="text-[10px] text-gray-500 font-normal">SYS_T</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 relative z-10 font-bold uppercase tracking-wider">
                        {parseInt(getLocalTime().split(':')[0]) > 18 || parseInt(getLocalTime().split(':')[0]) < 6 
                            ? <><Moon size={12} className="text-blue-400" /> Night Ops Visibility</>
                            : <><Sun size={12} className="text-amber-500" /> Daylight Target</>
                        }
                    </div>
                </div>

                {/* Actions & Exports Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-[#ff0033]/30 pb-1">
                        <label className="text-[10px] uppercase font-bold text-[#ff0033] tracking-[0.2em] flex items-center gap-1.5">
                            <Crosshair size={12} className="text-[#ff0033]" /> TINDAKAN & OPERASI GEOINT
                        </label>
                        <span className="text-[8px] px-1.5 py-0.2 bg-[#ff0033]/20 text-[#ff0033] font-bold border border-[#ff0033]/40">v2.9.1</span>
                    </div>
                    
                    {/* Hero Primary Action: Route Playback */}
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowPlaybackModal(true);
                        }}
                        className="w-full border border-[#00f0ff] bg-gradient-to-r from-[#00f0ff]/20 via-[#00f0ff]/10 to-transparent hover:from-[#00f0ff]/30 text-[#00f0ff] p-3 text-[10px] font-bold tracking-[0.1em] uppercase transition-all flex items-center justify-between shadow-[0_0_20px_rgba(0,240,255,0.2)] group cursor-pointer rounded-sm relative overflow-hidden"
                    >
                        <div className="flex items-center gap-2.5 relative z-10">
                            <div className="w-7 h-7 rounded bg-[#00f0ff]/20 border border-[#00f0ff] flex items-center justify-center">
                                <Play size={14} className="text-[#00f0ff] animate-pulse" /> 
                            </div>
                            <div className="text-left">
                                <div className="text-white font-extrabold text-[11px] tracking-wider">SIMULASI LALUAN MASA-NYATA</div>
                                <div className="text-[9px] text-[#00f0ff]/80 font-normal">PLAYBACK PERGERAKAN SASARAN</div>
                            </div>
                        </div>
                        <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#00f0ff]" />
                    </button>

                    {/* GEOINT Data Export Button */}
                    <div className="bg-black/60 border border-gray-800 p-2.5 rounded-sm space-y-1.5">
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Download size={11} className="text-cyan-400" /> EXPORT DATA RAW GEOINT & KOORDINAT
                        </div>
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleExportCSV();
                            }}
                            className="w-full border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20 py-2.5 text-[10px] font-bold tracking-[0.05em] uppercase transition-all flex items-center justify-center gap-2 cursor-pointer rounded-sm"
                        >
                            <Download size={13} className="text-cyan-400" /> MUAT TURUN DATA GEOINT (CSV)
                        </button>
                    </div>

                    {/* External Navigation Mapping Matrix - Compact 3-Column Grid */}
                    <div className="space-y-1.5">
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Pautan Platform Pemetaan Luar</div>
                        <div className="grid grid-cols-3 gap-1.5">
                            <button 
                                onClick={() => window.open(googleMapsUrl, '_blank')}
                                className="border border-gray-800 bg-black/80 hover:border-blue-500 hover:bg-blue-500/10 text-gray-300 hover:text-white py-2 px-1 text-[9px] font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 group rounded-sm"
                                title="Buka Google Maps / Street View"
                            >
                                <MapPin size={14} className="text-blue-500 group-hover:scale-110 transition-transform" /> 
                                <span className="text-[8px] tracking-tight">G_MAPS</span>
                            </button>

                            <button 
                                onClick={() => window.open(googleEarthUrl, '_blank')}
                                className="border border-gray-800 bg-black/80 hover:border-cyan-500 hover:bg-cyan-500/10 text-gray-300 hover:text-white py-2 px-1 text-[9px] font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 group rounded-sm"
                                title="Buka Google Earth 3D"
                            >
                                <Satellite size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" /> 
                                <span className="text-[8px] tracking-tight">G_EARTH 3D</span>
                            </button>

                            <button 
                                onClick={() => window.open(wazeUrl, '_blank')}
                                className="border border-gray-800 bg-black/80 hover:border-emerald-500 hover:bg-emerald-500/10 text-gray-300 hover:text-white py-2 px-1 text-[9px] font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 group rounded-sm"
                                title="Buka Waze Routing Intel"
                            >
                                <Navigation size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" /> 
                                <span className="text-[8px] tracking-tight">WAZE ROUTE</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Coordinates Raw Output Block / Geospatial Intel */}
                <div className="mt-auto h-48 flex flex-col">
                    <label className="text-[9px] uppercase font-bold text-gray-400 mb-1 block tracking-[0.2em] flex items-center justify-between shrink-0">
                        Maklumat Analisis Radius (5KM Target) <SignalHigh size={10} className="text-green-500"/>
                    </label>
                    <div className="bg-[#050505] border border-gray-800 p-3 font-mono text-[10px] text-gray-300 break-words flex-1 overflow-y-auto custom-scrollbar relative shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                        {intelText ? (
                            <div className="text-[10px] [&>h1]:text-[12px] [&>h1]:font-bold [&>h1]:text-[#ff0033] [&>p]:mb-2 [&>ul]:list-disc [&>ul]:padding-left-4 [&>ul]:ml-4 [&>ul]:mb-2 [&>li]:mb-1 [&>a]:text-[#00ccff] [&>a]:underline">
                                <Markdown>{intelText}</Markdown>
                            </div>
                        ) : coords ? (
                            <div className="animate-pulse text-[#ff0033] flex flex-col items-center justify-center h-full gap-2">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="opacity-70">Menganalisis Titik Kepentingan (POI)...</span>
                            </div>
                        ) : (
                            <div className="text-gray-500 flex flex-col items-center justify-center h-full">
                                &gt; MENUNGGU KOORDINAT LOKASI...<br/>
                            </div>
                        )}
                    </div>
                </div>

            </div>

        </div>
        
        {/* Footer info bar */}
        <div className="h-6 bg-black border-t border-[#ff0033]/30 flex items-center justify-between px-4 z-40 text-[8px] font-bold text-gray-500 tracking-widest">
            <div className="flex items-center gap-4">
                <span>SYSTEM: NOMAD_GEOINT_CORE</span>
                <span className="text-[#ff0033]">WARNING: ACTIVE TARGETING</span>
            </div>
            <div>[ AUTHORIZED CLEARANCE LEVEL 5 ]</div>
        </div>
      </div>

      {showPlaybackModal && (
        <RoutePlaybackModal
          nodes={[node]}
          initialSelectedNode={node}
          onClose={() => setShowPlaybackModal(false)}
        />
      )}
    </div>
  );
};

export default GeospatialRecon;
