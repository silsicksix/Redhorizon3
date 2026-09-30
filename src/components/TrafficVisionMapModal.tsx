import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, ExternalLink, RefreshCw, X, Minimize2, MapPin,
  Crop, ChevronDown, ChevronUp, ZoomIn, Sliders, RotateCcw, Expand,
  ArrowLeftRight, ArrowUpDown, Video, Move, GripHorizontal, Camera,
  Loader2, Radio, Compass, ShieldAlert, Sparkles
} from 'lucide-react';

interface TrafficVisionMapModalProps {
  onClose: () => void;
  initialUrl?: string;
  onOpenMapillaryModal?: () => void;
  onOpenGoogleEarthModal?: () => void;
}

export const TrafficVisionMapModal: React.FC<TrafficVisionMapModalProps> = ({
  onClose,
  initialUrl = "https://trafficvision.live/map/?country=Malaysia",
  onOpenMapillaryModal,
  onOpenGoogleEarthModal
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>(initialUrl);
  const [key, setKey] = useState<number>(0);
  const [viewState, setViewState] = useState<'MODAL' | 'FULLSCREEN' | 'MINIMIZED'>('MODAL');
  
  // Clean Mode defaults: Only top Header cropped (70px), NO horizontal sliding/side-crop (cropRight = 0)
  const [cropCleanMode, setCropCleanMode] = useState<boolean>(true);
  const [cropTop, setCropTop] = useState<number>(70); // Default 70px cleanly hides TrafficVision top header
  const [cropRight, setCropRight] = useState<number>(0); // 0px - Tidak meluncurkan atau menolak paparan ke tepi
  const [cropBottom, setCropBottom] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(100); // 80% to 250%
  const [showSizeControls, setShowSizeControls] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // DRAGGABLE POSITION STATE (Offset in px)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const animFrameRef = useRef<number | null>(null);

  // RESIZABLE DIMENSIONS STATE (Spacious default size for optimal map display)
  const [modalWidth, setModalWidth] = useState<number>(() => Math.min(1180, Math.floor(window.innerWidth * 0.95)));
  const [modalHeight, setModalHeight] = useState<number>(() => Math.min(760, Math.floor(window.innerHeight * 0.90)));
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; width: number; height: number }>({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  const presets = [
    { label: '🇲🇾 Malaysia (Peta Penuh CCTV)', url: 'https://trafficvision.live/map/?country=Malaysia', query: '3.1578,101.7120' },
    { label: '🌍 Global Live CCTV Map (155k+)', url: 'https://trafficvision.live/map/', query: '20.0000,0.0000' },
    { label: '🇲🇾 KL / Lembah Klang', url: 'https://trafficvision.live/map/?country=Malaysia&search=Kuala%20Lumpur', query: '3.1578,101.7120' },
    { label: '🇲🇾 Johor Bahru / CIQ', url: 'https://trafficvision.live/map/?country=Malaysia&search=Johor', query: '1.4655,103.7651' },
    { label: '🇲🇾 Pulau Pinang', url: 'https://trafficvision.live/map/?country=Malaysia&search=Penang', query: '5.4141,100.3288' },
    { label: '🇲🇾 Sabah & Sarawak', url: 'https://trafficvision.live/map/?country=Malaysia&search=Sabah', query: '5.9804,116.0735' },
    { label: '🇸🇬 SG / Woodlands & Tuas', url: 'https://trafficvision.live/map/?country=Singapore', query: '1.4432,103.7686' },
    { label: '🇮🇩 ID / Jakarta & Jawa', url: 'https://trafficvision.live/map/?country=Indonesia', query: '-6.2088,106.8456' },
    { label: '🇹🇭 TH / Bangkok', url: 'https://trafficvision.live/map/?country=Thailand', query: '13.7563,100.5018' },
    { label: '🛣️ Jalanow (Live MY Highway CCTV)', url: 'https://www.jalanow.com/', query: '3.1578,101.7120' },
    { label: '🌦️ Windy Live Webcams (Radar & Cam)', url: 'https://www.windy.com/-Webcams/webcams?3.158,101.712,11', query: '3.1578,101.7120' },
  ];

  const [selectedPresetQuery, setSelectedPresetQuery] = useState<string>('3.1578,101.7120');

  const handleRefresh = () => {
    setIsLoading(true);
    setKey(prev => prev + 1);
  };

  const handleApplyCleanMode = () => {
    setCropCleanMode(true);
    setCropTop(70);
    setCropRight(0);
    setCropBottom(0);
    setZoomScale(100);
  };

  const handleResetSize = () => {
    setCropCleanMode(true);
    setCropTop(70);
    setCropRight(0);
    setCropBottom(0);
    setZoomScale(100);
    setPosition({ x: 0, y: 0 });
    setModalWidth(Math.min(1180, Math.floor(window.innerWidth * 0.95)));
    setModalHeight(Math.min(760, Math.floor(window.innerHeight * 0.90)));
  };

  // Listen to window size changes and dynamically adjust the modal
  useEffect(() => {
    const handleResize = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const maxW = isPortrait ? window.innerWidth * 0.98 : window.innerWidth * 0.95;
      const maxH = isPortrait ? window.innerHeight * 0.80 : window.innerHeight * 0.92;

      setModalWidth(prev => {
        if (prev > maxW) return Math.floor(maxW);
        return prev;
      });

      setModalHeight(prev => {
        if (prev > maxH) return Math.floor(maxH);
        return prev;
      });

      setPosition(prev => {
        const boundX = window.innerWidth / 2 - 50;
        const boundY = window.innerHeight / 2 - 50;
        return {
          x: Math.max(-boundX, Math.min(prev.x, boundX)),
          y: Math.max(-boundY, Math.min(prev.y, boundY))
        };
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // --- UNIFIED DRAGGING HEADER HANDLER (MOUSE + TOUCH + POINTER) ---
  const handleHeaderStart = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    if (viewState === 'FULLSCREEN') return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('select')) {
      return;
    }

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      posX: position.x,
      posY: position.y
    };
  };

  // --- UNIFIED RESIZING HANDLER (MOUSE + TOUCH + POINTER) ---
  const handleResizeStart = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (viewState === 'FULLSCREEN') return;

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      width: modalWidth,
      height: modalHeight
    };
  };

  // GLOBAL LISTENERS FOR DRAGGING AND RESIZING
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        if (isDragging) {
          const dx = clientX - dragStartRef.current.mouseX;
          const dy = clientY - dragStartRef.current.mouseY;
          setPosition({
            x: dragStartRef.current.posX + dx,
            y: dragStartRef.current.posY + dy
          });
        } else if (isResizing) {
          const dx = clientX - resizeStartRef.current.mouseX;
          const dy = clientY - resizeStartRef.current.mouseY;
          setModalWidth(Math.max(340, Math.min(window.innerWidth * 0.99, resizeStartRef.current.width + dx)));
          setModalHeight(Math.max(260, Math.min(window.innerHeight * 0.99, resizeStartRef.current.height + dy)));
        }
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging || isResizing) {
        handleMove(e.clientX, e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if ((isDragging || isResizing) && e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseLeaveOrUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };

    if (isDragging || isResizing) {
      if (window.PointerEvent) {
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('pointerup', handleMouseLeaveOrUp);
        window.addEventListener('pointercancel', handleMouseLeaveOrUp);
      } else {
        window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY), { passive: true });
        window.addEventListener('mouseup', handleMouseLeaveOrUp);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleMouseLeaveOrUp);
      }
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handleMouseLeaveOrUp);
      window.removeEventListener('pointercancel', handleMouseLeaveOrUp);
      window.removeEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
      window.removeEventListener('mouseup', handleMouseLeaveOrUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseLeaveOrUp);
    };
  }, [isDragging, isResizing]);

  const isFullscreen = viewState === 'FULLSCREEN';
  const isMinimized = viewState === 'MINIMIZED';

  return (
    <>
      {/* GLOBAL OVERLAY WHEN DRAGGING OR RESIZING */}
      {(isDragging || isResizing) && (
        <div className="fixed inset-0 z-[10000] cursor-grabbing select-none bg-transparent" />
      )}

      {/* MINIMIZED FLOATING BAR */}
      {isMinimized && (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <div className="bg-zinc-950/95 border border-cyan-500/60 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-2 backdrop-blur-md">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <Video size={14} className="text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white tracking-wider uppercase hidden sm:inline">
              TRAFFICVISION CCTV
            </span>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setViewState('MODAL')}
                className="p-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-400 text-cyan-300 rounded text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                title="Kembangkan Modal CCTV"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 bg-red-950 hover:bg-red-900 text-red-300 rounded border border-red-500/40 cursor-pointer transition-all hover:scale-105 flex items-center justify-center"
                title="Tutup Modal CCTV"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER - FLOATING WITHOUT BACKDROP BLUR */}
      <div className={`fixed z-[9999] transition-colors duration-200 ${isMinimized ? 'hidden' : ''} ${
        isFullscreen 
          ? 'inset-0 p-0 bg-black pointer-events-auto' 
          : 'inset-0 pointer-events-none p-1 md:p-3 flex items-center justify-center overflow-hidden'
      }`}>
        <div 
          className={`bg-zinc-950 border-2 rounded-xl flex flex-col overflow-hidden shadow-2xl relative select-none pointer-events-auto ${
            isDragging || isResizing ? 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.5)] cursor-grabbing' : 'border-cyan-500/60 transition-all duration-200'
          } ${isFullscreen ? 'w-full h-full rounded-none' : ''}`}
          style={!isFullscreen ? {
            width: `${modalWidth}px`,
            height: `${modalHeight}px`,
            transform: `translate(${position.x}px, ${position.y}px)`,
            maxWidth: '99vw',
            maxHeight: '99vh'
          } : undefined}
        >
          
          {/* DRAGGABLE TOP HEADER BAR */}
          <div 
            onMouseDown={handleHeaderStart}
            onTouchStart={handleHeaderStart}
            onPointerDown={handleHeaderStart}
            style={{ touchAction: 'none' }}
            className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-cyan-500/40 gap-2 shrink-0 z-30 font-mono ${
              !isFullscreen ? 'cursor-grab active:cursor-grabbing touch-none hover:bg-zinc-900/90' : ''
            }`}
            title={!isFullscreen ? "💡 SERET HEADER INI UNTUK MENGALIHKAN POSISI MODAL DI SKRIN" : undefined}
          >
            
            {/* LEFT: GRIP HANDLE & TITLE */}
            <div className="flex items-center gap-2 shrink-0">
              {!isFullscreen && (
                <div className="text-cyan-400/80 hover:text-cyan-300 p-0.5 rounded cursor-grab" title="Seret untuk alih posisi">
                  <GripHorizontal size={18} />
                </div>
              )}
              <div className="p-1 bg-cyan-950 border border-cyan-500/50 rounded text-cyan-400 flex items-center gap-1">
                <Video size={14} className="animate-pulse text-cyan-400" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[11px] md:text-xs font-black text-white tracking-wider uppercase">
                    TRAFFICVISION <span className="text-cyan-400">GIS MAP</span>
                  </h2>
                  <span className="hidden sm:inline-block text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                    LIVE CCTV
                  </span>
                </div>
              </div>
            </div>

            {/* CENTER: REGION & LOCATION PRESET SELECTOR */}
            <div className="flex items-center gap-1 flex-1 max-w-[220px] sm:max-w-xs md:max-w-sm mx-1">
              <MapPin size={13} className="text-cyan-400 shrink-0 hidden sm:inline" />
              <select
                value={currentUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  setIsLoading(true);
                  setCurrentUrl(url);
                  const p = presets.find(item => item.url === url);
                  if (p) setSelectedPresetQuery(p.query);
                }}
                className="w-full bg-zinc-900 border border-cyan-500/40 text-cyan-300 text-[11px] rounded px-2 py-1 font-mono focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
              >
                {presets.map((p, idx) => (
                  <option key={idx} value={p.url}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* RIGHT: ACTION BUTTONS (EXTERNAL TAB, GOOGLE EARTH, MAPILLARY, SIZE, REFRESH, CLOSE) */}
            <div className="flex items-center gap-1 shrink-0">
              
              {/* OPEN IN NEW TAB (DIRECT BROWSER VIEW) */}
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="p-1 bg-zinc-900 hover:bg-cyan-950 text-cyan-400 hover:text-cyan-200 border border-cyan-500/40 rounded transition-all cursor-pointer hover:scale-105 flex items-center justify-center"
                title="Buka Peta TrafficVision di Tab Pelayar Baharu"
              >
                <ExternalLink size={14} />
              </a>

              {/* GOOGLE EARTH 3D APP BUTTON */}
              <button
                onClick={() => {
                  if (onOpenGoogleEarthModal) {
                    onOpenGoogleEarthModal();
                  } else {
                    const lat = selectedPresetQuery.split(',')[0] || '3.1578';
                    const lng = selectedPresetQuery.split(',')[1] || '101.7120';
                    const geoUri = `geo:${lat},${lng}?q=${lat},${lng}`;
                    const webUrl = `https://earth.google.com/web/@${lat},${lng},1000a,35y,0h,0t,0r`;
                    const isAndroid = /android/i.test(navigator.userAgent.toLowerCase());
                    if (isAndroid) {
                      window.location.href = geoUri;
                      setTimeout(() => window.open(webUrl, '_blank'), 500);
                    } else {
                      window.open(webUrl, '_blank');
                    }
                  }
                }}
                className="px-1.5 py-1 bg-blue-950 hover:bg-blue-900 text-cyan-300 border border-blue-400/80 rounded transition-all cursor-pointer shadow-sm hover:scale-105 hidden sm:flex items-center gap-1 text-[10px] font-bold"
                title="Pelancaran Terus Google Earth 3D"
              >
                <Globe size={13} className="text-cyan-300" />
                <span>Earth</span>
              </button>

              {/* MAPILLARY 360° APP BUTTON */}
              <button
                onClick={() => {
                  if (onOpenMapillaryModal) {
                    onOpenMapillaryModal();
                  } else {
                    const lat = selectedPresetQuery.split(',')[0] || '3.1578';
                    const lng = selectedPresetQuery.split(',')[1] || '101.7120';
                    const geoUri = `geo:${lat},${lng}?q=${lat},${lng}`;
                    const webUrl = `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=17&focus=photo`;
                    const isAndroid = /android/i.test(navigator.userAgent.toLowerCase());
                    if (isAndroid) {
                      window.location.href = geoUri;
                      setTimeout(() => window.open(webUrl, '_blank'), 500);
                    } else {
                      window.open(webUrl, '_blank');
                    }
                  }
                }}
                className="px-1.5 py-1 bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-400/80 rounded transition-all cursor-pointer shadow-sm hover:scale-105 hidden sm:flex items-center gap-1 text-[10px] font-bold"
                title="Pelancaran Terus Mapillary 360°"
              >
                <Camera size={13} className="text-teal-300" />
                <span>360°</span>
              </button>

              {/* CLEAN CROP MODE TOGGLE (HEADER + CHAT HIDE) */}
              <button
                onClick={() => {
                  if (cropCleanMode) {
                    setCropCleanMode(false);
                    setCropTop(0);
                    setCropRight(0);
                    setCropBottom(0);
                  } else {
                    handleApplyCleanMode();
                  }
                }}
                className={`px-2 py-1 rounded transition-all cursor-pointer hover:scale-105 flex items-center gap-1 text-[10px] font-bold border ${
                  cropCleanMode && cropTop > 0
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                }`}
                title="Mod Peta Bersih: Sembunyikan Header & Ruangan Chat secara automatik"
              >
                <Crop size={13} className={cropCleanMode ? "text-emerald-400" : ""} />
                <span className="hidden md:inline">{cropCleanMode ? '✓ Peta Bersih' : 'Mod Bersih'}</span>
              </button>

              {/* SIZE & ZOOM CONTROLS PANEL TOGGLE */}
              <button
                onClick={() => setShowSizeControls(!showSizeControls)}
                className={`p-1 rounded transition-all cursor-pointer hover:scale-105 flex items-center justify-center border ${
                  showSizeControls || zoomScale !== 100 || cropTop !== 115 || cropRight !== 360
                    ? 'bg-amber-950 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                    : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-white'
                }`}
                title="Pelarasan Dimensi Saiz, Crop & Zoom"
              >
                <Sliders size={14} />
              </button>

              {/* REFRESH */}
              <button
                onClick={handleRefresh}
                className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded transition-all cursor-pointer hover:scale-105 flex items-center justify-center active:rotate-180"
                title="Muat semula Peta CCTV"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
              </button>

              {/* RESET POSITION & SIZE */}
              <button
                onClick={handleResetSize}
                className="p-1 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700 rounded transition-all cursor-pointer hover:scale-105 flex items-center justify-center"
                title="Set Semula Posisi & Mod Peta Bersih Lalai"
              >
                <RotateCcw size={14} />
              </button>

              {/* MINIMIZE */}
              <button
                onClick={() => setViewState('MINIMIZED')}
                className="p-1 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-zinc-700 rounded transition-all cursor-pointer hover:scale-105 flex items-center justify-center"
                title="Sorokkan Ke Bar Terapung"
              >
                <ChevronDown size={14} />
              </button>

              {/* FULLSCREEN TOGGLE */}
              <button
                onClick={() => setViewState(isFullscreen ? 'MODAL' : 'FULLSCREEN')}
                className="p-1 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-zinc-700 rounded transition-all cursor-pointer hover:scale-105 flex items-center justify-center"
                title={isFullscreen ? "Keluar Skrin Penuh" : "Skrin Penuh"}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Expand size={14} />}
              </button>

              {/* CLOSE */}
              <button
                onClick={onClose}
                className="p-1 bg-red-950 hover:bg-red-800 text-red-300 border border-red-500/60 rounded transition-all cursor-pointer hover:scale-105 flex items-center justify-center ml-1"
                title="Tutup Modal TrafficVision"
              >
                <X size={14} />
              </button>

            </div>
          </div>

          {/* QUICK SOURCE CHIPS SUB-HEADER */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 border-b border-cyan-500/20 overflow-x-auto text-[10px] font-mono no-scrollbar shrink-0">
            <span className="text-zinc-400 shrink-0 font-bold">Sumber Peta:</span>
            
            <button
              onClick={() => {
                setIsLoading(true);
                setCurrentUrl('https://trafficvision.live/map/?country=Malaysia');
                setSelectedPresetQuery('3.1578,101.7120');
                handleApplyCleanMode();
              }}
              className={`px-2 py-0.5 rounded shrink-0 font-bold border transition-all ${
                currentUrl.includes('country=Malaysia') && !currentUrl.includes('search=')
                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                  : 'bg-zinc-950 text-cyan-300 border-cyan-500/40 hover:bg-zinc-800'
              }`}
            >
              🇲🇾 Malaysia (Peta Penuh GIS)
            </button>

            <button
              onClick={() => {
                setIsLoading(true);
                setCurrentUrl('https://trafficvision.live/map/');
                setSelectedPresetQuery('20.0000,0.0000');
                handleApplyCleanMode();
              }}
              className={`px-2 py-0.5 rounded shrink-0 font-bold border transition-all ${
                currentUrl === 'https://trafficvision.live/map/'
                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                  : 'bg-zinc-950 text-cyan-300 border-cyan-500/40 hover:bg-zinc-800'
              }`}
            >
              🌍 Peta Global (155k+ CCTV)
            </button>

            <button
              onClick={() => {
                setIsLoading(true);
                setCurrentUrl('https://trafficvision.live/map/?country=Malaysia&search=Kuala%20Lumpur');
                setSelectedPresetQuery('3.1578,101.7120');
                handleApplyCleanMode();
              }}
              className={`px-2 py-0.5 rounded shrink-0 font-bold border transition-all ${
                currentUrl.includes('Kuala%20Lumpur')
                  ? 'bg-cyan-500 text-black border-cyan-300'
                  : 'bg-zinc-950 text-cyan-300 border-cyan-500/40 hover:bg-zinc-800'
              }`}
            >
              🏢 KL / Klang Valley
            </button>

            <button
              onClick={() => {
                setIsLoading(true);
                setCurrentUrl('https://trafficvision.live/map/?country=Malaysia&search=Johor');
                setSelectedPresetQuery('1.4655,103.7651');
                handleApplyCleanMode();
              }}
              className={`px-2 py-0.5 rounded shrink-0 font-bold border transition-all ${
                currentUrl.includes('Johor')
                  ? 'bg-cyan-500 text-black border-cyan-300'
                  : 'bg-zinc-950 text-cyan-300 border-cyan-500/40 hover:bg-zinc-800'
              }`}
            >
              🌉 Johor CIQ / Causeway
            </button>

            <button
              onClick={() => {
                setIsLoading(true);
                setCurrentUrl('https://trafficvision.live/map/?country=Malaysia&search=Penang');
                setSelectedPresetQuery('5.4141,100.3288');
                handleApplyCleanMode();
              }}
              className={`px-2 py-0.5 rounded shrink-0 font-bold border transition-all ${
                currentUrl.includes('Penang')
                  ? 'bg-cyan-500 text-black border-cyan-300'
                  : 'bg-zinc-950 text-cyan-300 border-cyan-500/40 hover:bg-zinc-800'
              }`}
            >
              🌉 Pulau Pinang
            </button>

            <button
              onClick={() => {
                setIsLoading(true);
                setCurrentUrl('https://www.jalanow.com/');
                setSelectedPresetQuery('3.1578,101.7120');
                setCropTop(0);
                setCropRight(0);
              }}
              className={`px-2 py-0.5 rounded shrink-0 font-bold border transition-all ${
                currentUrl.includes('jalanow.com')
                  ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                  : 'bg-zinc-950 text-emerald-300 border-emerald-500/40 hover:bg-zinc-800'
              }`}
            >
              🛣️ Jalanow (Live PLUS CCTV)
            </button>

            <button
              onClick={() => {
                setIsLoading(true);
                setCurrentUrl('https://www.windy.com/-Webcams/webcams?3.158,101.712,11');
                setSelectedPresetQuery('3.1578,101.7120');
                setCropTop(0);
                setCropRight(0);
              }}
              className={`px-2 py-0.5 rounded shrink-0 font-bold border transition-all ${
                currentUrl.includes('windy.com')
                  ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                  : 'bg-zinc-950 text-amber-300 border-amber-500/40 hover:bg-zinc-800'
              }`}
            >
              🌦️ Windy Live Radar & Webcams
            </button>
          </div>

          {/* DYNAMIC SIZE & CROP CONTROLS DRAWER */}
          {showSizeControls && (
            <div className="bg-zinc-950/95 border-b border-cyan-500/30 p-2.5 text-xs font-mono select-none flex flex-wrap items-center justify-between gap-3 z-20 shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                
                {/* QUICK CROP PRESETS */}
                <div className="flex items-center gap-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <Crop size={13} /> Mod Crop:
                  </span>
                  <button 
                    onClick={() => {
                      setCropCleanMode(true);
                      setCropTop(70);
                      setCropRight(0);
                      setCropBottom(0);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      cropTop === 70 && cropRight === 0
                        ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
                        : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    }`}
                    title="Pangkas Header Sahaja (70px) - Posisi 1:1 Asal"
                  >
                    🎯 Pangkas Header Sahaja (70px)
                  </button>
                  <button 
                    onClick={() => {
                      setCropCleanMode(true);
                      setCropTop(115);
                      setCropRight(360);
                      setCropBottom(0);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      cropTop === 115 && cropRight === 360
                        ? 'bg-cyan-500 text-black border-cyan-300' 
                        : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    }`}
                    title="Pangkas Header & Anjak Sisi Chat"
                  >
                    Header + Chat Sisi
                  </button>
                  <button 
                    onClick={() => {
                      setCropCleanMode(false);
                      setCropTop(0);
                      setCropRight(0);
                      setCropBottom(0);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      cropTop === 0 && cropRight === 0
                        ? 'bg-zinc-300 text-black border-white' 
                        : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    }`}
                    title="Paparan Web Asal Penuh"
                  >
                    Penuh (0px)
                  </button>
                </div>

                {/* SLIDER CROP ATAS (HEADER) */}
                <div className="flex items-center gap-1.5 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] whitespace-nowrap">Pangkas Atas (Header):</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    value={cropTop} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCropTop(val);
                      setCropCleanMode(val > 0 || cropRight > 0);
                    }}
                    className="w-20 accent-emerald-400 cursor-pointer"
                  />
                  <span className="text-emerald-400 font-bold text-[10px] min-w-[32px]">{cropTop}px</span>
                </div>

                {/* ZOOM SCALE CONTROLS */}
                <div className="flex items-center gap-1">
                  <span className="text-cyan-400 font-bold flex items-center gap-1 text-[11px]">
                    <ZoomIn size={13} /> Zoom:
                  </span>
                  {[90, 100, 110, 125, 140].map(z => (
                    <button
                      key={z}
                      onClick={() => setZoomScale(z)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        zoomScale === z 
                          ? 'bg-cyan-500 text-black border-cyan-300' 
                          : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                      }`}
                    >
                      {z}%
                    </button>
                  ))}
                </div>

              </div>

              <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                <span className="text-zinc-500">Saiz:</span>
                <span className="text-cyan-400 font-mono">{Math.round(modalWidth)} x {Math.round(modalHeight)}px</span>
              </div>
            </div>
          )}

          {/* MAIN IFRAME VIEWPORT WITH MAP RENDERING */}
          <div className="relative flex-1 w-full h-full bg-[#050807] overflow-hidden">
            
            {/* LOADING OVERLAY */}
            {isLoading && (
              <div className="absolute inset-0 z-10 bg-zinc-950 flex flex-col items-center justify-center gap-3 text-cyan-400 font-mono">
                <div className="relative flex items-center justify-center">
                  <Loader2 size={36} className="animate-spin text-cyan-400" />
                  <Radio size={16} className="absolute text-emerald-400 animate-ping" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-white">
                    Memuatkan Peta Interaktif TrafficVision...
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Memaparkan 155,000+ Titik Kamera Trafik (Header Dipangkas Secara Bersih)
                  </p>
                </div>
              </div>
            )}

            {/* TRANSFORM CONTAINER FOR CLEAN AUTO-CROPPED MAP RENDERING & ZOOM */}
            <div 
              className="relative w-full h-full transition-all duration-150 overflow-hidden"
              style={{
                marginTop: cropCleanMode && cropTop > 0 ? `-${cropTop}px` : '0px',
                marginRight: cropCleanMode && cropRight > 0 ? `-${cropRight}px` : '0px',
                width: cropCleanMode && cropRight > 0 ? `calc(100% + ${cropRight}px)` : '100%',
                height: cropCleanMode && (cropTop > 0 || cropBottom > 0) ? `calc(100% + ${cropTop + cropBottom}px)` : '100%',
                transform: zoomScale !== 100 ? `scale(${zoomScale / 100})` : 'none',
                transformOrigin: 'top left',
              }}
            >
              <iframe
                key={key}
                src={currentUrl}
                title="TrafficVision Live GIS Traffic Map"
                className="w-full h-full border-0 bg-[#050807]"
                allow="autoplay; fullscreen; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads"
                onLoad={() => setIsLoading(false)}
              />
            </div>
          </div>

          {/* INTERACTIVE DRAG-TO-RESIZE CORNER HANDLE */}
          {!isFullscreen && (
            <div 
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
              onPointerDown={handleResizeStart}
              style={{ touchAction: 'none' }}
              className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-cyan-500/90 via-cyan-500/40 to-transparent cursor-se-resize flex items-end justify-end p-1 rounded-tl z-50 hover:scale-125 transition-transform"
              title="Seret sudut ini untuk melaraskan saiz modal di skrin"
            >
              <div className="w-3 h-3 border-r-2 border-b-2 border-white/90" />
            </div>
          )}

          {/* FOOTER STATUS BAR */}
          <div className="px-3 py-1.5 bg-zinc-950 border-t border-cyan-500/30 text-[10px] text-zinc-400 font-mono flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-300 font-bold uppercase">TRAFFICVISION GIS GLOBAL:</span>
              <span className="text-cyan-400 truncate max-w-[200px] md:max-w-[320px]">{currentUrl}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Zoom: <span className="text-cyan-400 font-bold">{zoomScale}%</span></span>
              <span>Crop Atas: <span className="text-emerald-400 font-bold">{cropTop}px</span></span>
              <span className="hidden sm:inline text-zinc-500">
                {Math.round(modalWidth)}x{Math.round(modalHeight)}px
              </span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default TrafficVisionMapModal;
