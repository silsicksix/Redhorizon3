import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Camera, MapPin, Search, Radio, Brain, Compass, 
  Layers, Plus, Minus, Crosshair, ChevronUp, ChevronDown, 
  X, Phone, User, Globe, AlertTriangle, ShieldCheck, 
  ExternalLink, Sparkles, Sliders, Smartphone, Check, 
  Share2, Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Maximize2, Eye, Shield, Hash, MessageSquare, Terminal as TerminalIcon,
  CircleDot, Move, Flame, ChevronRight, ChevronLeft, Power
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Node, Link, Workspace } from '../types';
import { useGlobalStore } from '../store/GlobalStore';

interface MobileTacticalControlHubProps {
  activeWs: Workspace;
  activeNode: Node | null;
  selectedNodes: Node[];
  onSelectNode: (node: Node) => void;
  onOpenModal: (modalId: string) => void;
  onAddNode: (node: Partial<Node> & { id: string }) => void;
  onLinkNodes?: (sourceId: string, targetId: string, label: string) => void;
  autosaveHUD?: React.ReactNode;
}

type MobileTab = 'MENU' | 'CARDS' | 'SEARCH' | 'CAPTURE' | 'GPS' | 'AI_AGENT';
type JoystickStyle = 'HYBRID_2IN1' | 'ANALOG_ML' | 'TACTICAL_CROSS';

export const MobileTacticalControlHub: React.FC<MobileTacticalControlHubProps> = ({
  activeWs,
  activeNode,
  selectedNodes,
  onSelectNode,
  onOpenModal,
  onAddNode,
  onLinkNodes,
  autosaveHUD
}) => {
  const { state, dispatch } = useGlobalStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>('MENU');
  const [showVirtualDpad, setShowVirtualDpad] = useState<boolean>(false);
  const [isEdgeTabExpanded, setIsEdgeTabExpanded] = useState<boolean>(false);
  const [dpadPosition, setDpadPosition] = useState<'left' | 'right'>('left');
  const [joystickStyle, setJoystickStyle] = useState<JoystickStyle>('HYBRID_2IN1');
  const [controlMode, setControlMode] = useState<'PAN' | 'TARGET_HOP'>('PAN');
  const [joystickOpacity, setJoystickOpacity] = useState<number>(0.65);
  const [showOpacitySlider, setShowOpacitySlider] = useState<boolean>(false);
  const [isMobileDensityActive, setIsMobileDensityActive] = useState<boolean>(false);
  const [cardFilterType, setCardFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile Legends Analog Stick State
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isStickActive, setIsStickActive] = useState<boolean>(false);
  const [stickAngle, setStickAngle] = useState<number>(0);
  const [stickIntensity, setStickIntensity] = useState<number>(0);
  const [isTurboActive, setIsTurboActive] = useState<boolean>(false);

  const stickContainerRef = useRef<HTMLDivElement>(null);
  const stickLoopRef = useRef<number | null>(null);
  const stickVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isTurboRef = useRef<boolean>(false);
  const controlModeRef = useRef<'PAN' | 'TARGET_HOP'>('PAN');
  const lastHopTimeRef = useRef<number>(0);

  // 1-Tap Field Capture Form State
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [captureLabel, setCaptureLabel] = useState<string>('');
  const [captureType, setCaptureType] = useState<'evidence' | 'person' | 'location' | 'vehicle' | 'social'>('evidence');
  const [captureNotes, setCaptureNotes] = useState<string>('');
  const [includeGpsWithCapture, setIncludeGpsWithCapture] = useState<boolean>(true);
  const [isCapturingGps, setIsCapturingGps] = useState<boolean>(false);
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; accuracy: number; address?: string } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // AI Field Prompt State
  const [aiFieldPrompt, setAiFieldPrompt] = useState<string>('');
  const [aiFieldResponse, setAiFieldResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Listen for external trigger (e.g. from Tools & Modules menu)
  useEffect(() => {
    const handleOpenTacticalHub = () => {
      setIsOpen(true);
    };
    window.addEventListener('app:open-tactical-hub', handleOpenTacticalHub);
    return () => {
      window.removeEventListener('app:open-tactical-hub', handleOpenTacticalHub);
    };
  }, []);

  // File input ref for camera trigger
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep isTurboRef & controlModeRef synced
  useEffect(() => {
    isTurboRef.current = isTurboActive;
  }, [isTurboActive]);

  useEffect(() => {
    controlModeRef.current = controlMode;
  }, [controlMode]);

  // Haptic feedback utility
  const triggerHaptic = (duration = 15) => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(duration);
      } catch (e) {
        // ignore
      }
    }
  };

  // Hop to Next / Prev Node in Target Lock mode
  const hopToNextNode = (dir: 'next' | 'prev') => {
    const nodes = activeWs.data.nodes || [];
    if (nodes.length === 0) return;
    triggerHaptic(18);
    const currentIndex = activeNode ? nodes.findIndex(n => n.id === activeNode.id) : -1;
    let nextIdx = 0;
    if (dir === 'next') {
      nextIdx = (currentIndex + 1) % nodes.length;
    } else {
      nextIdx = (currentIndex - 1 + nodes.length) % nodes.length;
    }
    const target = nodes[nextIdx];
    if (target) {
      onSelectNode(target);
      if (typeof target.x === 'number' && typeof target.y === 'number') {
        window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { id: target.id, x: target.x, y: target.y } }));
      }
    }
  };

  // Continuous loop when Analog Stick is dragged (Fluid movement like Mobile Legends)
  useEffect(() => {
    const loop = () => {
      const { x, y } = stickVectorRef.current;
      const mode = controlModeRef.current;
      if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) {
        if (mode === 'PAN') {
          const turboMultiplier = isTurboRef.current ? 2.5 : 1.0;
          const panSpeed = 12 * turboMultiplier;
          const dx = x * panSpeed;
          const dy = y * panSpeed;
          window.dispatchEvent(new CustomEvent('redhorizon:graph-pan', { detail: { dx, dy } }));
        } else if (mode === 'TARGET_HOP') {
          const now = Date.now();
          if (now - lastHopTimeRef.current > 380) {
            if (x > 0.35 || y > 0.35) {
              hopToNextNode('next');
              lastHopTimeRef.current = now;
            } else if (x < -0.35 || y < -0.35) {
              hopToNextNode('prev');
              lastHopTimeRef.current = now;
            }
          }
        }
      }
      stickLoopRef.current = requestAnimationFrame(loop);
    };

    stickLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (stickLoopRef.current) cancelAnimationFrame(stickLoopRef.current);
    };
  }, []);

  // Handle ML Analog Touch / Mouse Drag
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsStickActive(true);
    triggerHaptic(12);
    updateStickPosition(clientX, clientY);
  };

  const updateStickPosition = (clientX: number, clientY: number) => {
    if (!stickContainerRef.current) return;
    const rect = stickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const maxRadius = rect.width / 2 - 10; // boundary
    let rawDx = clientX - centerX;
    let rawDy = clientY - centerY;

    const distance = Math.hypot(rawDx, rawDy);
    const angle = Math.atan2(rawDy, rawDx);
    setStickAngle(angle);

    const clampedDist = Math.min(distance, maxRadius);
    const normalizedIntensity = clampedDist / maxRadius;
    setStickIntensity(normalizedIntensity);

    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setStickOffset({ x: clampedX, y: clampedY });
    stickVectorRef.current = {
      x: (clampedX / maxRadius),
      y: (clampedY / maxRadius)
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isStickActive) return;
    updateStickPosition(clientX, clientY);
  };

  const handlePointerUp = () => {
    setIsStickActive(false);
    setStickOffset({ x: 0, y: 0 });
    setStickIntensity(0);
    stickVectorRef.current = { x: 0, y: 0 };
  };

  // Global mousemove/mouseup listener when dragging analog stick on PC/laptop
  useEffect(() => {
    const onGlobalMouseMove = (e: MouseEvent) => {
      if (isStickActive) {
        handlePointerMove(e.clientX, e.clientY);
      }
    };
    const onGlobalMouseUp = () => {
      if (isStickActive) {
        handlePointerUp();
      }
    };
    const onGlobalTouchMove = (e: TouchEvent) => {
      if (isStickActive && e.touches.length > 0) {
        handlePointerMove(e.touches.item(0)!.clientX, e.touches.item(0)!.clientY);
      }
    };
    const onGlobalTouchEnd = () => {
      if (isStickActive) {
        handlePointerUp();
      }
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
    window.addEventListener('touchmove', onGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', onGlobalTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
      window.removeEventListener('touchmove', onGlobalTouchMove);
      window.removeEventListener('touchend', onGlobalTouchEnd);
    };
  }, [isStickActive]);

  // Toggle mobile density style on root
  useEffect(() => {
    if (isMobileDensityActive) {
      document.documentElement.classList.add('mobile-touch-mode');
    } else {
      document.documentElement.classList.remove('mobile-touch-mode');
    }
  }, [isMobileDensityActive]);

  // Handle Realtime Device Geolocation
  const handleFetchCurrentGps = () => {
    triggerHaptic(25);
    setIsCapturingGps(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('GPS tidak disokong oleh pelayar atau peranti ini.');
      setIsCapturingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let formattedAddress = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              formattedAddress = data.display_name;
            }
          }
        } catch (e) {
          // fallback
        }

        setGpsData({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          address: formattedAddress
        });
        setIsCapturingGps(false);
      },
      (err) => {
        setGpsError(`Ralat GPS: ${err.message || 'Sila benarkan akses lokasi.'}`);
        setIsCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 1-Tap Save Location Node to Graph
  const handleSaveGpsNode = () => {
    if (!gpsData) return;
    triggerHaptic(30);

    const nodeId = `geo_field_${Date.now()}`;
    const newLocationNode: Node = {
      id: nodeId,
      label: `FIELD_LOC: ${gpsData.address?.slice(0, 30) || `${gpsData.lat.toFixed(4)}, ${gpsData.lng.toFixed(4)}`}`,
      type: 'location',
      details: `[LOKASI LAPANGAN DIKESAN]\nLat: ${gpsData.lat}\nLng: ${gpsData.lng}\nKetepatan: ±${gpsData.accuracy}m\nAlamat: ${gpsData.address || 'Tiada maklumat'}\nMasa: ${new Date().toLocaleString('ms-MY')}`
    };

    onAddNode(newLocationNode);

    if (activeNode && activeNode.id !== nodeId && onLinkNodes) {
      onLinkNodes(activeNode.id, nodeId, 'DIKESAN_PADA_LOKASI');
    }

    dispatch({
      type: 'ADD_LOG',
      payload: {
        message: `📍 GPS Lapangan direkodkan (${gpsData.lat.toFixed(4)}, ${gpsData.lng.toFixed(4)}) ke dalam graf siasatan.`,
        type: 'success'
      }
    });

    setGpsData(null);
    setIsOpen(false);
  };

  // Handle Photo / Camera Upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setCapturedImageBase64(base64);
        if (!captureLabel) {
          setCaptureLabel(file.name.replace(/\.[^/.]+$/, '').slice(0, 24) || 'BUKTI_LAPANGAN');
        }
        triggerHaptic(20);
      };
      reader.readAsDataURL(file);

      if (includeGpsWithCapture && !gpsData) {
        handleFetchCurrentGps();
      }
    }
  };

  // Save Captured Evidence Node
  const handleSaveCapturedEvidence = () => {
    if (!captureLabel.trim()) return;
    triggerHaptic(30);

    const nodeId = `evidence_field_${Date.now()}`;
    let detailsText = `[BUKTI LAPANGAN MUDAH ALIH]\nNota: ${captureNotes || 'Diambil dari kamera telefon penyiasat'}\nTarikh: ${new Date().toLocaleString('ms-MY')}`;
    
    if (gpsData) {
      detailsText += `\nKoordinat GPS: ${gpsData.lat}, ${gpsData.lng}\nKetepatan: ±${gpsData.accuracy}m\nAlamat: ${gpsData.address || '-'}`;
    }

    const newEvidenceNode: Node = {
      id: nodeId,
      label: captureLabel.toUpperCase(),
      type: captureType,
      imageUrl: capturedImageBase64 || undefined,
      details: detailsText
    };

    onAddNode(newEvidenceNode);

    if (activeNode && activeNode.id !== nodeId && onLinkNodes) {
      onLinkNodes(activeNode.id, nodeId, 'LAMPIRAN_BUKTI');
    }

    dispatch({
      type: 'ADD_LOG',
      payload: {
        message: `📸 Bukti Lapangan [${captureLabel}] berjaya dimasukkan ke dalam graf siasatan.`,
        type: 'success'
      }
    });

    setCapturedImageBase64(null);
    setCaptureLabel('');
    setCaptureNotes('');
    setIsOpen(false);
  };

  // Quick AI Field Synthesis Request
  const handleRunAiFieldQuery = async (quickPromptText?: string) => {
    const textToSend = quickPromptText || aiFieldPrompt;
    if (!textToSend.trim()) return;

    triggerHaptic(20);
    setIsAiLoading(true);
    setAiFieldResponse(null);

    try {
      const nodesSummary = (activeWs.data.nodes || [])
        .map(n => `- [${n.type?.toUpperCase() || 'ENTITI'}] ${n.label}: ${n.details?.slice(0, 100) || ''}`)
        .slice(0, 30)
        .join('\n');

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Anda adalah Pembantu Risikan Taktikal Lapangan RedHorizon OSINT untuk penyiasat yang sedang bertugas di telefon mudah alih atau laptop. Berikan jawapan ringkas, padat, berfokuskan strategi taktikal dan tindakan penyiasatan seterusnya.\n\nDATA GRAF KES SEMASA (${activeWs.name}):\n${nodesSummary}\n\nSOALAN PENYIASAT:\n${textToSend}`,
          model: 'gemini-2.5-flash'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiFieldResponse(data.text || data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tiada maklum balas daripada AI.');
      } else {
        setAiFieldResponse('Ralat menyambung ke Enjin AI Risikan. Sila semak sambungan rangkaian.');
      }
    } catch (err: any) {
      setAiFieldResponse(`Ralat: ${err.message || 'Gagal berkomunikasi dengan AI.'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Step Movement Dispatchers (Discrete clicks on Crosshair or Cross buttons)
  const dispatchGraphPan = (dx: number, dy: number) => {
    triggerHaptic(10);
    window.dispatchEvent(new CustomEvent('redhorizon:graph-pan', { detail: { dx, dy } }));
  };

  const dispatchGraphZoom = (delta: number) => {
    triggerHaptic(15);
    window.dispatchEvent(new CustomEvent('redhorizon:graph-zoom', { detail: { delta } }));
    window.dispatchEvent(new CustomEvent(delta > 0 ? 'app:graph-zoom-in' : 'app:graph-zoom-out'));
  };

  const dispatchCenterFocus = () => {
    triggerHaptic(20);
    window.dispatchEvent(new CustomEvent('redhorizon:graph-center'));
    window.dispatchEvent(new CustomEvent('app:graph-zoom-reset'));
  };

  // Filtered nodes list for Card View
  const filteredNodes = useMemo(() => {
    let list = activeWs.data.nodes || [];
    if (cardFilterType !== 'ALL') {
      list = list.filter(n => n.type === cardFilterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => 
        (n.label && n.label.toLowerCase().includes(q)) || 
        (n.details && n.details.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeWs.data.nodes, cardFilterType, searchQuery]);

  const totalEntities = activeWs.data.nodes?.length || 0;
  const totalLinks = activeWs.data.links?.length || 0;

  return (
    <>
      {/* 1. FLOATING BORDERLESS TACTICAL ANALOG JOYSTICK (MOBILE LEGENDS HUD STYLE) */}
      {showVirtualDpad && (
        <div 
          className={`fixed bottom-20 z-[85] ${dpadPosition === 'left' ? 'left-3 sm:left-6' : 'right-3 sm:right-6'} select-none transition-all duration-200 pointer-events-auto font-mono`}
          style={{
            opacity: isStickActive ? 1.0 : joystickOpacity
          }}
        >
          {/* Top Borderless Micro Control Bar */}
          <div className="flex items-center justify-between gap-1 mb-2 px-1">
            {/* Control Mode Pills */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-black/60 backdrop-blur-md border border-cyan-500/30">
              <button
                onClick={() => { triggerHaptic(15); setControlMode('PAN'); }}
                className={`px-2 py-0.5 rounded-full text-[8.5px] font-black tracking-wide transition-all ${
                  controlMode === 'PAN' 
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_#00f0ff]' 
                    : 'text-gray-400 hover:text-cyan-300'
                }`}
                title="Mod Pan Kanvas Graf 360°"
              >
                🌐 PAN
              </button>
              <button
                onClick={() => { triggerHaptic(15); setControlMode('TARGET_HOP'); }}
                className={`px-2 py-0.5 rounded-full text-[8.5px] font-black tracking-wide transition-all ${
                  controlMode === 'TARGET_HOP' 
                    ? 'bg-amber-400 text-black shadow-[0_0_10px_#f59e0b]' 
                    : 'text-gray-400 hover:text-amber-300'
                }`}
                title="Mod Lompat Sasaran / Kunci Entiti Seterusnya"
              >
                🎯 SASARAN
              </button>
            </div>

            {/* Micro Tools: Opacity, Mode Flip, Style, Close */}
            <div className="flex items-center gap-1">
              {/* Opacity Adjuster Trigger */}
              <button
                onClick={() => {
                  triggerHaptic(10);
                  setShowOpacitySlider(prev => !prev);
                }}
                className={`p-1.5 rounded-full backdrop-blur-md border transition-all text-[9px] font-bold ${
                  showOpacitySlider 
                    ? 'bg-cyan-500 text-black border-cyan-300' 
                    : 'bg-black/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-950/60'
                }`}
                title="Laraskan Kejernihan / Ketelusan Joystick"
              >
                <Eye size={12} />
              </button>

              {/* Style Switcher (Hybrid 2-in-1 vs Analog vs D-Pad) */}
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setJoystickStyle(prev => {
                    if (prev === 'HYBRID_2IN1') return 'ANALOG_ML';
                    if (prev === 'ANALOG_ML') return 'TACTICAL_CROSS';
                    return 'HYBRID_2IN1';
                  });
                }}
                className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-500/40 hover:bg-cyan-950/60 text-[8.5px] font-black flex items-center gap-1"
                title="Tukar Gaya: 2-in-1 Gabungan / Analog MOBA / Salib D-Pad"
              >
                {joystickStyle === 'HYBRID_2IN1' && (
                  <>
                    <Zap size={11} className="text-amber-400 animate-pulse" />
                    <span>2-IN-1 HYBRID</span>
                  </>
                )}
                {joystickStyle === 'ANALOG_ML' && (
                  <>
                    <CircleDot size={11} className="text-cyan-400" />
                    <span>ANALOG</span>
                  </>
                )}
                {joystickStyle === 'TACTICAL_CROSS' && (
                  <>
                    <Move size={11} className="text-emerald-400" />
                    <span>D-PAD</span>
                  </>
                )}
              </button>

              {/* Left/Right Flip */}
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setDpadPosition(prev => prev === 'left' ? 'right' : 'left');
                }}
                className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-gray-300 border border-gray-700 hover:text-white text-[9px]"
                title="Alih ke Kiri / Kanan Skrin"
              >
                {dpadPosition === 'left' ? '👉' : '👈'}
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setShowVirtualDpad(false);
                }}
                className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-rose-400 border border-rose-500/40 hover:bg-rose-950/60"
                title="Tutup Virtual Controller"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Floating Opacity Slider Popup */}
          <AnimatePresence>
            {showOpacitySlider && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                className="mb-2 p-2 rounded-2xl bg-black/80 backdrop-blur-xl border border-cyan-500/40 shadow-xl flex flex-col gap-1.5 text-[9.5px]"
              >
                <div className="flex items-center justify-between text-cyan-300 font-bold px-1">
                  <span>Tahap Kejernihan (Opacity):</span>
                  <span className="text-white font-black">{Math.round(joystickOpacity * 100)}%</span>
                </div>
                
                {/* Opacity Range Slider */}
                <input
                  type="range"
                  min="0.15"
                  max="1.0"
                  step="0.05"
                  value={joystickOpacity}
                  onChange={(e) => setJoystickOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />

                {/* Quick Preset Buttons */}
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {[
                    { label: 'Halimunan', val: 0.2 },
                    { label: 'Lembut', val: 0.45 },
                    { label: 'Jelas', val: 0.7 },
                    { label: 'Padu', val: 1.0 }
                  ].map(p => (
                    <button
                      key={p.val}
                      onClick={() => {
                        triggerHaptic(10);
                        setJoystickOpacity(p.val);
                      }}
                      className={`py-0.5 rounded text-[8px] font-bold border transition-all ${
                        Math.abs(joystickOpacity - p.val) < 0.08
                          ? 'bg-cyan-500 text-black border-cyan-300'
                          : 'bg-black/50 text-gray-400 border-gray-700 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN CONTROLLER (BORDERLESS HUD FLOATING DIRECTLY ON SCREEN) */}
          <div className="relative flex items-center justify-center">
            
            {/* ----------------- GAYA 0: 2-IN-1 HYBRID (ANALOG MOBA + SALIB D-PAD) ----------------- */}
            {joystickStyle === 'HYBRID_2IN1' ? (
              <div className="relative flex items-center justify-center">
                
                {/* Outer Circular Tactical Radar Base & Drag Surface */}
                <div 
                  ref={stickContainerRef}
                  onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    if (e.touches.length > 0) {
                      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-full transition-all cursor-grab active:cursor-grabbing flex items-center justify-center select-none touch-none ${
                    isStickActive 
                      ? 'border-2 border-cyan-400 bg-cyan-950/30 backdrop-blur-[2px] shadow-[0_0_35px_rgba(6,182,212,0.65)]' 
                      : 'border border-cyan-500/40 bg-black/35 backdrop-blur-[1px] hover:border-cyan-400/70 shadow-[0_0_20px_rgba(0,0,0,0.6)]'
                  }`}
                >
                  {/* Concentric Holographic Radar Guides & Cross Lines */}
                  <div className="absolute inset-3 rounded-full border border-cyan-400/20 border-dashed animate-spin-slow pointer-events-none" />
                  <div className="absolute inset-7 rounded-full border border-cyan-500/25 pointer-events-none" />
                  <div className="absolute inset-12 rounded-full border border-cyan-500/15 border-dotted pointer-events-none" />
                  
                  {/* Cross Axis Grid Lines */}
                  <div className="absolute w-full h-[1px] bg-cyan-500/15 pointer-events-none" />
                  <div className="absolute h-full w-[1px] bg-cyan-500/15 pointer-events-none" />

                  {/* 4 CARDINAL D-PAD CROSS STEP BUTTONS (INTEGRATED ON THE PERIMETER) */}
                  {/* UP D-PAD BUTTON */}
                  <button
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      triggerHaptic(15);
                      if (controlMode === 'TARGET_HOP') {
                        hopToNextNode('prev');
                      } else {
                        dispatchGraphPan(0, isTurboActive ? -140 : -70);
                      }
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      triggerHaptic(15);
                      if (controlMode === 'TARGET_HOP') {
                        hopToNextNode('prev');
                      } else {
                        dispatchGraphPan(0, isTurboActive ? -140 : -70);
                      }
                    }}
                    className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-xl bg-cyan-950/80 hover:bg-cyan-500 hover:text-black border border-cyan-400/80 active:scale-85 text-cyan-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_10px_rgba(6,182,212,0.5)] z-20 pointer-events-auto transition-all cursor-pointer group"
                    title="Nudge Atas / Salib UP"
                  >
                    <ArrowUp size={15} className="group-hover:scale-110 transition-transform" />
                  </button>

                  {/* DOWN D-PAD BUTTON */}
                  <button
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      triggerHaptic(15);
                      if (controlMode === 'TARGET_HOP') {
                        hopToNextNode('next');
                      } else {
                        dispatchGraphPan(0, isTurboActive ? 140 : 70);
                      }
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      triggerHaptic(15);
                      if (controlMode === 'TARGET_HOP') {
                        hopToNextNode('next');
                      } else {
                        dispatchGraphPan(0, isTurboActive ? 140 : 70);
                      }
                    }}
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-xl bg-cyan-950/80 hover:bg-cyan-500 hover:text-black border border-cyan-400/80 active:scale-85 text-cyan-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_10px_rgba(6,182,212,0.5)] z-20 pointer-events-auto transition-all cursor-pointer group"
                    title="Nudge Bawah / Salib DOWN"
                  >
                    <ArrowDown size={15} className="group-hover:scale-110 transition-transform" />
                  </button>

                  {/* LEFT D-PAD BUTTON */}
                  <button
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      triggerHaptic(15);
                      if (controlMode === 'TARGET_HOP') {
                        hopToNextNode('prev');
                      } else {
                        dispatchGraphPan(isTurboActive ? -140 : -70, 0);
                      }
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      triggerHaptic(15);
                      if (controlMode === 'TARGET_HOP') {
                        hopToNextNode('prev');
                      } else {
                        dispatchGraphPan(isTurboActive ? -140 : -70, 0);
                      }
                    }}
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-cyan-950/80 hover:bg-cyan-500 hover:text-black border border-cyan-400/80 active:scale-85 text-cyan-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_10px_rgba(6,182,212,0.5)] z-20 pointer-events-auto transition-all cursor-pointer group"
                    title="Nudge Kiri / Salib LEFT"
                  >
                    <ArrowLeft size={15} className="group-hover:scale-110 transition-transform" />
                  </button>

                  {/* RIGHT D-PAD BUTTON */}
                  <button
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      triggerHaptic(15);
                      if (controlMode === 'TARGET_HOP') {
                        hopToNextNode('next');
                      } else {
                        dispatchGraphPan(isTurboActive ? 140 : 70, 0);
                      }
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      triggerHaptic(15);
                      if (controlMode === 'TARGET_HOP') {
                        hopToNextNode('next');
                      } else {
                        dispatchGraphPan(isTurboActive ? 140 : 70, 0);
                      }
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-cyan-950/80 hover:bg-cyan-500 hover:text-black border border-cyan-400/80 active:scale-85 text-cyan-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_10px_rgba(6,182,212,0.5)] z-20 pointer-events-auto transition-all cursor-pointer group"
                    title="Nudge Kanan / Salib RIGHT"
                  >
                    <ArrowRight size={15} className="group-hover:scale-110 transition-transform" />
                  </button>

                  {/* Center Optical Crosshair */}
                  <div className="absolute w-7 h-7 rounded-full border border-cyan-500/50 flex items-center justify-center pointer-events-none">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_6px_#00f0ff]" />
                  </div>

                  {/* Dynamic Trajectory Vector Line */}
                  {isStickActive && (
                    <div 
                      className="absolute h-0.5 bg-gradient-to-r from-transparent to-cyan-400 pointer-events-none origin-left z-10"
                      style={{
                        width: `${stickIntensity * 55}px`,
                        left: '50%',
                        top: '50%',
                        transform: `rotate(${stickAngle}rad)`
                      }}
                    />
                  )}

                  {/* 360° Dynamic Draggable Thumb Knob (Floating Neon Orb) */}
                  <div
                    style={{
                      transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
                      transition: isStickActive ? 'none' : 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                    }}
                    className={`relative w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center border-2 shadow-2xl pointer-events-none select-none z-15 ${
                      isStickActive
                        ? 'bg-gradient-to-br from-cyan-300 via-teal-400 to-cyan-600 border-white text-black shadow-[0_0_25px_#00f0ff]'
                        : 'bg-gradient-to-br from-gray-950 via-cyan-950 to-black border-cyan-400/80 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                    }`}
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 border border-cyan-300/50 flex items-center justify-center">
                      <Move size={16} className={isStickActive ? 'animate-pulse text-black' : 'text-cyan-300'} />
                    </div>
                  </div>
                </div>

                {/* Floating Orbiting Satellite Action Badges */}
                <div className={`absolute -top-2 ${dpadPosition === 'left' ? '-right-10' : '-left-10'} flex flex-col gap-1.5 pointer-events-auto`}>
                  {/* Turbo Boost */}
                  <button
                    onClick={() => {
                      triggerHaptic(20);
                      setIsTurboActive(prev => !prev);
                    }}
                    className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 ${
                      isTurboActive 
                        ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.9)]' 
                        : 'bg-black/60 text-amber-400 border-amber-500/40 hover:bg-amber-950/50'
                    }`}
                    title="Lajukan Kelajuan (Turbo 2.5x)"
                  >
                    <Flame size={15} className={isTurboActive ? 'animate-bounce' : ''} />
                  </button>

                  {/* Recenter / Focus Reticle */}
                  <button
                    onClick={dispatchCenterFocus}
                    className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-cyan-300 hover:bg-cyan-500 hover:text-black border border-cyan-500/50 flex items-center justify-center transition-all active:scale-90 shadow-lg"
                    title="Pusatkan Graf Semula (Recenter)"
                  >
                    <Crosshair size={16} />
                  </button>

                  {/* Zoom In */}
                  <button
                    onClick={() => dispatchGraphZoom(1)}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-emerald-300 hover:bg-emerald-500 hover:text-black border border-emerald-500/50 flex items-center justify-center text-xs font-black transition-all active:scale-90"
                    title="Zoom In Kanvas"
                  >
                    <Plus size={14} />
                  </button>

                  {/* Zoom Out */}
                  <button
                    onClick={() => dispatchGraphZoom(-1)}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-rose-300 hover:bg-rose-500 hover:text-black border border-rose-500/50 flex items-center justify-center text-xs font-black transition-all active:scale-90"
                    title="Zoom Out Kanvas"
                  >
                    <Minus size={14} />
                  </button>
                </div>

                {/* Target Hop Extra Direct Controls when in Target Lock Mode */}
                {controlMode === 'TARGET_HOP' && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/40">
                    <button
                      onClick={() => hopToNextNode('prev')}
                      className="text-[8.5px] font-bold text-amber-300 hover:text-white px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30"
                    >
                      ◀ Lepas
                    </button>
                    <span className="text-[8px] text-gray-400">
                      {activeNode?.label ? activeNode.label.slice(0, 10) : 'Lompat'}
                    </span>
                    <button
                      onClick={() => hopToNextNode('next')}
                      className="text-[8.5px] font-bold text-amber-300 hover:text-white px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30"
                    >
                      Seterusnya ▶
                    </button>
                  </div>
                )}

              </div>
            ) : joystickStyle === 'ANALOG_ML' ? (
              /* ----------------- GAYA 1: BORDERLESS MOBA ANALOG JOYSTICK ----------------- */
              <div className="relative flex items-center justify-center">
                
                {/* Borderless Holographic Outer Circular Base */}
                <div 
                  ref={stickContainerRef}
                  onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    if (e.touches.length > 0) {
                      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  className={`relative w-40 h-40 rounded-full transition-all cursor-grab active:cursor-grabbing flex items-center justify-center select-none touch-none ${
                    isStickActive 
                      ? 'border-2 border-cyan-400 bg-cyan-950/25 backdrop-blur-[2px] shadow-[0_0_35px_rgba(6,182,212,0.6)]' 
                      : 'border border-cyan-500/40 bg-black/20 backdrop-blur-[1px] hover:border-cyan-400/70 shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                  }`}
                >
                  {/* Concentric Holographic Radar Guides */}
                  <div className="absolute inset-2 rounded-full border border-cyan-400/25 border-dashed animate-spin-slow pointer-events-none" />
                  <div className="absolute inset-6 rounded-full border border-cyan-500/30 pointer-events-none" />
                  <div className="absolute inset-10 rounded-full border border-cyan-500/20 border-dotted pointer-events-none" />

                  {/* 4 Cardinal Vector Markers */}
                  <div className="absolute top-1.5 text-[10px] font-black text-cyan-400/70 pointer-events-none drop-shadow-[0_0_4px_#00f0ff]">▲</div>
                  <div className="absolute bottom-1.5 text-[10px] font-black text-cyan-400/70 pointer-events-none drop-shadow-[0_0_4px_#00f0ff]">▼</div>
                  <div className="absolute left-2 text-[10px] font-black text-cyan-400/70 pointer-events-none drop-shadow-[0_0_4px_#00f0ff]">◀</div>
                  <div className="absolute right-2 text-[10px] font-black text-cyan-400/70 pointer-events-none drop-shadow-[0_0_4px_#00f0ff]">▶</div>

                  {/* Center Optical Crosshair */}
                  <div className="absolute w-7 h-7 rounded-full border border-cyan-500/50 flex items-center justify-center pointer-events-none">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_6px_#00f0ff]" />
                  </div>

                  {/* Dynamic Trajectory Vector Line */}
                  {isStickActive && (
                    <div 
                      className="absolute h-0.5 bg-gradient-to-r from-transparent to-cyan-400 pointer-events-none origin-left"
                      style={{
                        width: `${stickIntensity * 55}px`,
                        left: '50%',
                        top: '50%',
                        transform: `rotate(${stickAngle}rad)`
                      }}
                    />
                  )}

                  {/* Dynamic Draggable Thumb Knob (Floating Neon Orb) */}
                  <div
                    style={{
                      transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
                      transition: isStickActive ? 'none' : 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                    }}
                    className={`relative w-15 h-15 rounded-full flex items-center justify-center border-2 shadow-2xl pointer-events-none select-none ${
                      isStickActive
                        ? 'bg-gradient-to-br from-cyan-300 via-teal-400 to-cyan-600 border-white text-black shadow-[0_0_25px_#00f0ff]'
                        : 'bg-gradient-to-br from-gray-950 via-cyan-950 to-black border-cyan-400/80 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-black/40 border border-cyan-300/50 flex items-center justify-center">
                      <Move size={17} className={isStickActive ? 'animate-pulse text-black' : 'text-cyan-300'} />
                    </div>
                  </div>
                </div>

                {/* Floating Orbiting Satellite Action Badges */}
                <div className={`absolute -top-2 ${dpadPosition === 'left' ? '-right-10' : '-left-10'} flex flex-col gap-1.5 pointer-events-auto`}>
                  {/* Turbo Boost */}
                  <button
                    onClick={() => {
                      triggerHaptic(20);
                      setIsTurboActive(prev => !prev);
                    }}
                    className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-all active:scale-90 ${
                      isTurboActive 
                        ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.9)]' 
                        : 'bg-black/60 text-amber-400 border-amber-500/40 hover:bg-amber-950/50'
                    }`}
                    title="Lajukan Kelajuan (Turbo 2.5x)"
                  >
                    <Flame size={15} className={isTurboActive ? 'animate-bounce' : ''} />
                  </button>

                  {/* Recenter / Focus Reticle */}
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); dispatchCenterFocus(); }}
                    onTouchStart={(e) => { e.stopPropagation(); dispatchCenterFocus(); }}
                    onClick={(e) => { e.stopPropagation(); dispatchCenterFocus(); }}
                    className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-cyan-300 hover:bg-cyan-500 hover:text-black border border-cyan-500/50 flex items-center justify-center transition-all active:scale-90 shadow-lg cursor-pointer"
                    title="Pusatkan Graf Semula (Recenter)"
                  >
                    <Crosshair size={16} />
                  </button>

                  {/* Zoom In */}
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); dispatchGraphZoom(1); }}
                    onTouchStart={(e) => { e.stopPropagation(); dispatchGraphZoom(1); }}
                    onClick={(e) => { e.stopPropagation(); dispatchGraphZoom(1); }}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-emerald-300 hover:bg-emerald-500 hover:text-black border border-emerald-500/50 flex items-center justify-center text-xs font-black transition-all active:scale-90 cursor-pointer"
                    title="Zoom In Kanvas"
                  >
                    <Plus size={14} />
                  </button>

                  {/* Zoom Out */}
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); dispatchGraphZoom(-1); }}
                    onTouchStart={(e) => { e.stopPropagation(); dispatchGraphZoom(-1); }}
                    onClick={(e) => { e.stopPropagation(); dispatchGraphZoom(-1); }}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-rose-300 hover:bg-rose-500 hover:text-black border border-rose-500/50 flex items-center justify-center text-xs font-black transition-all active:scale-90 cursor-pointer"
                    title="Zoom Out Kanvas"
                  >
                    <Minus size={14} />
                  </button>
                </div>

                {/* Target Hop Extra Direct Controls when in Target Lock Mode */}
                {controlMode === 'TARGET_HOP' && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/40">
                    <button
                      onClick={() => hopToNextNode('prev')}
                      className="text-[8.5px] font-bold text-amber-300 hover:text-white px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30"
                    >
                      ◀ Lepas
                    </button>
                    <span className="text-[8px] text-gray-400">
                      {activeNode?.label ? activeNode.label.slice(0, 10) : 'Lompat'}
                    </span>
                    <button
                      onClick={() => hopToNextNode('next')}
                      className="text-[8.5px] font-bold text-amber-300 hover:text-white px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30"
                    >
                      Seterusnya ▶
                    </button>
                  </div>
                )}

              </div>
            ) : (
              /* ----------------- GAYA 2: BORDERLESS CLASSIC TACTICAL CROSS D-PAD ----------------- */
              <div className="relative flex flex-col items-center">
                
                {/* 4-Way Direction Cross Matrix (Borderless Floating HUD) */}
                <div className="grid grid-cols-3 gap-1.5 w-36 h-36 place-items-center">
                  <div />
                  {/* UP */}
                  <button
                    onMouseDown={() => controlMode === 'TARGET_HOP' ? hopToNextNode('prev') : dispatchGraphPan(0, -70)}
                    onTouchStart={() => controlMode === 'TARGET_HOP' ? hopToNextNode('prev') : dispatchGraphPan(0, -70)}
                    className="w-10 h-10 rounded-2xl bg-cyan-950/50 hover:bg-cyan-500 hover:text-black border border-cyan-400/60 active:scale-90 text-cyan-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  >
                    <ArrowUp size={20} />
                  </button>
                  <div />

                  {/* LEFT */}
                  <button
                    onMouseDown={() => controlMode === 'TARGET_HOP' ? hopToNextNode('prev') : dispatchGraphPan(-70, 0)}
                    onTouchStart={() => controlMode === 'TARGET_HOP' ? hopToNextNode('prev') : dispatchGraphPan(-70, 0)}
                    className="w-10 h-10 rounded-2xl bg-cyan-950/50 hover:bg-cyan-500 hover:text-black border border-cyan-400/60 active:scale-90 text-cyan-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  {/* CENTER / RETICLE FOCUS */}
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); dispatchCenterFocus(); }}
                    onTouchStart={(e) => { e.stopPropagation(); dispatchCenterFocus(); }}
                    onClick={(e) => { e.stopPropagation(); dispatchCenterFocus(); }}
                    className="w-10 h-10 rounded-full bg-cyan-500/30 hover:bg-cyan-400 hover:text-black border-2 border-cyan-400 active:scale-90 text-cyan-300 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.6)] backdrop-blur-md cursor-pointer"
                    title="Pusatkan Sasaran"
                  >
                    <Crosshair size={18} className="animate-pulse" />
                  </button>

                  {/* RIGHT */}
                  <button
                    onMouseDown={() => controlMode === 'TARGET_HOP' ? hopToNextNode('next') : dispatchGraphPan(70, 0)}
                    onTouchStart={() => controlMode === 'TARGET_HOP' ? hopToNextNode('next') : dispatchGraphPan(70, 0)}
                    className="w-10 h-10 rounded-2xl bg-cyan-950/50 hover:bg-cyan-500 hover:text-black border border-cyan-400/60 active:scale-90 text-cyan-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  >
                    <ArrowRight size={20} />
                  </button>

                  <div />
                  {/* DOWN */}
                  <button
                    onMouseDown={() => controlMode === 'TARGET_HOP' ? hopToNextNode('next') : dispatchGraphPan(0, 70)}
                    onTouchStart={() => controlMode === 'TARGET_HOP' ? hopToNextNode('next') : dispatchGraphPan(0, 70)}
                    className="w-10 h-10 rounded-2xl bg-cyan-950/50 hover:bg-cyan-500 hover:text-black border border-cyan-400/60 active:scale-90 text-cyan-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  >
                    <ArrowDown size={20} />
                  </button>
                  <div />
                </div>

                {/* Floating Quick Zoom Satellite for D-Pad */}
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); dispatchGraphZoom(1); }}
                    onTouchStart={(e) => { e.stopPropagation(); dispatchGraphZoom(1); }}
                    onClick={(e) => { e.stopPropagation(); dispatchGraphZoom(1); }}
                    className="px-2.5 py-1 rounded-full bg-emerald-950/70 backdrop-blur-md text-emerald-300 hover:bg-emerald-500 hover:text-black border border-emerald-500/50 flex items-center gap-1 text-[9px] font-bold active:scale-95 cursor-pointer"
                  >
                    <Plus size={11} /> ZOOM IN
                  </button>
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); dispatchGraphZoom(-1); }}
                    onTouchStart={(e) => { e.stopPropagation(); dispatchGraphZoom(-1); }}
                    onClick={(e) => { e.stopPropagation(); dispatchGraphZoom(-1); }}
                    className="px-2.5 py-1 rounded-full bg-rose-950/70 backdrop-blur-md text-rose-300 hover:bg-rose-500 hover:text-black border border-rose-500/50 flex items-center gap-1 text-[9px] font-bold active:scale-95 cursor-pointer"
                  >
                    <Minus size={11} /> OUT
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* 2. TUCKED-IN LEFT SCREEN BORDER SLIDE-OUT DRAWER FOR VIRTUAL D-PAD */}
      <div className="fixed left-0 bottom-12 sm:bottom-16 z-[90] select-none pointer-events-auto font-mono">
        <AnimatePresence mode="wait">
          {!isEdgeTabExpanded ? (
            /* COLLAPSED DISCREET EDGE TAB (HUGS LEFT SCREEN BORDER) */
            <motion.button
              key="collapsed-edge-tab"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -10, opacity: 0 }}
              onClick={() => {
                triggerHaptic(15);
                setIsEdgeTabExpanded(true);
              }}
              className="group relative h-14 w-5 sm:w-6 rounded-r-xl bg-black/80 hover:bg-cyan-950/80 backdrop-blur-md border-y border-r-2 border-cyan-500/60 flex flex-col items-center justify-center gap-1 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all cursor-pointer hover:w-7 active:scale-95"
              title="Slide Out / Buka Menu Virtual Joystick"
              aria-label="Slide out virtual joystick control tab"
            >
              {/* Dynamic Status Beacon */}
              <div className="relative flex h-2 w-2">
                {showVirtualDpad && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${showVirtualDpad ? 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]' : 'bg-gray-600'}`}></span>
              </div>

              {/* Edge Handle Icon */}
              <ChevronRight size={13} className="text-cyan-400/90 group-hover:translate-x-0.5 transition-transform" />

              {/* Mini Glow Bar */}
              <div className="w-0.5 h-3 rounded-full bg-cyan-500/50 group-hover:bg-cyan-400" />
            </motion.button>
          ) : (
            /* EXPANDED SLIDE-OUT TACTICAL CONTROLLER DRAWER */
            <motion.div
              key="expanded-edge-drawer"
              initial={{ x: -180, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -180, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="relative p-3 rounded-r-2xl bg-[#06101d]/95 backdrop-blur-2xl border-y border-r-2 border-cyan-500/70 shadow-[0_0_30px_rgba(0,0,0,0.9),0_0_20px_rgba(6,182,212,0.4)] flex flex-col gap-2.5 min-w-[210px] max-w-[240px]"
            >
              {/* Header & Tuck-in Button */}
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${showVirtualDpad ? 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]' : 'bg-gray-500'}`} />
                  <span className="text-[10px] font-black text-cyan-300 tracking-wider">
                    JOYSTICK KAWALAN
                  </span>
                </div>
                
                {/* Tuck In / Collapse Button */}
                <button
                  onClick={() => {
                    triggerHaptic(10);
                    setIsEdgeTabExpanded(false);
                  }}
                  className="p-1 rounded-md bg-black/60 text-cyan-400 hover:bg-cyan-950 border border-cyan-500/30 transition-all hover:text-white"
                  title="Sorok Semula ke Tepi Border"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>

              {/* Primary ON / OFF Toggle Action */}
              <button
                onClick={() => {
                  triggerHaptic(25);
                  setShowVirtualDpad(prev => !prev);
                }}
                className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-[11px] font-black tracking-wide transition-all shadow-md active:scale-95 cursor-pointer ${
                  showVirtualDpad
                    ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                    : 'bg-black/70 text-gray-300 border-gray-700 hover:border-cyan-500/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Power size={14} className={showVirtualDpad ? 'text-black' : 'text-gray-400'} />
                  <span>{showVirtualDpad ? 'JOYSTICK AKTIF' : 'JOYSTICK MATI'}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                  showVirtualDpad ? 'bg-black text-cyan-300' : 'bg-gray-800 text-gray-400'
                }`}>
                  {showVirtualDpad ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Mode Selector within Drawer */}
              <div className="flex flex-col gap-1">
                <span className="text-[8.5px] text-gray-400 font-bold uppercase tracking-wider">Mod Gerakan:</span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => { triggerHaptic(15); setControlMode('PAN'); }}
                    className={`py-1 rounded text-[8px] font-black border transition-all ${
                      controlMode === 'PAN' 
                        ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400' 
                        : 'bg-black/50 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    🌐 PAN
                  </button>
                  <button
                    onClick={() => { triggerHaptic(15); setControlMode('TARGET_HOP'); }}
                    className={`py-1 rounded text-[8px] font-black border transition-all ${
                      controlMode === 'TARGET_HOP' 
                        ? 'bg-amber-500/30 text-amber-200 border-amber-400' 
                        : 'bg-black/50 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    🎯 SASARAN
                  </button>
                </div>
              </div>

              {/* Joystick Style Selector within Drawer */}
              <div className="flex flex-col gap-1">
                <span className="text-[8.5px] text-gray-400 font-bold uppercase tracking-wider">Gaya Pengawal:</span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => { triggerHaptic(15); setJoystickStyle('HYBRID_2IN1'); }}
                    className={`py-1 px-0.5 rounded text-[7.5px] font-black border transition-all flex flex-col items-center gap-0.5 ${
                      joystickStyle === 'HYBRID_2IN1' 
                        ? 'bg-amber-500/30 text-amber-200 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                        : 'bg-black/50 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    <Zap size={10} className="text-amber-400" />
                    <span>2-IN-1 HYBRID</span>
                  </button>
                  <button
                    onClick={() => { triggerHaptic(15); setJoystickStyle('ANALOG_ML'); }}
                    className={`py-1 px-0.5 rounded text-[7.5px] font-black border transition-all flex flex-col items-center gap-0.5 ${
                      joystickStyle === 'ANALOG_ML' 
                        ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]' 
                        : 'bg-black/50 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    <CircleDot size={10} className="text-cyan-400" />
                    <span>ANALOG</span>
                  </button>
                  <button
                    onClick={() => { triggerHaptic(15); setJoystickStyle('TACTICAL_CROSS'); }}
                    className={`py-1 px-0.5 rounded text-[7.5px] font-black border transition-all flex flex-col items-center gap-0.5 ${
                      joystickStyle === 'TACTICAL_CROSS' 
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
                        : 'bg-black/50 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    <Move size={10} className="text-emerald-400" />
                    <span>SALIB D-PAD</span>
                  </button>
                </div>
              </div>

              {/* Sub Tuck Button */}
              <button
                onClick={() => {
                  triggerHaptic(10);
                  setIsEdgeTabExpanded(false);
                }}
                className="w-full py-1 text-[8.5px] text-center text-cyan-400/80 hover:text-cyan-300 hover:underline flex items-center justify-center gap-1 mt-0.5"
              >
                <ChevronLeft size={11} /> Sorok Tab ke Tepi Skrin
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. FULL MOBILE TACTICAL BOTTOM SHEET & COMMAND MATRIX */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] z-[96] bg-[#080d1a] border-t-2 border-cyan-500/80 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.3)] flex flex-col overflow-hidden font-mono text-gray-100"
            >
              
              {/* Drag Handle & Header */}
              <div className="px-4 pt-3 pb-2 border-b border-cyan-500/20 bg-[#0c1424] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
                  <div>
                    <div className="text-[12px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Pusat Taktikal Lapangan</span>
                      <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                        FIELD OPS
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-400 flex items-center gap-2">
                      <span>Misi: <strong className="text-white">{activeWs.name}</strong></span>
                      <span>•</span>
                      <span>{totalEntities} Nod / {totalLinks} Pautan</span>
                    </div>
                  </div>
                </div>

                {/* Density Switcher & Close */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      triggerHaptic(15);
                      setIsMobileDensityActive(prev => !prev);
                    }}
                    className={`px-2 py-1 rounded text-[9px] font-bold border transition-all flex items-center gap-1 ${
                      isMobileDensityActive
                        ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                    title="Besarkan saiz teks & butang untuk paparan telefon"
                  >
                    <Sliders size={11} />
                    <span>{isMobileDensityActive ? 'Touch 110%' : 'Touch Normal'}</span>
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-black/40 border-b border-gray-800 gap-1 overflow-x-auto custom-scrollbar shrink-0">
                <button
                  onClick={() => { triggerHaptic(10); setActiveTab('MENU'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                    activeTab === 'MENU' ? 'bg-cyan-500 text-black font-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Layers size={12} /> Alatan Lapangan
                </button>

                <button
                  onClick={() => { triggerHaptic(10); setActiveTab('CARDS'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                    activeTab === 'CARDS' ? 'bg-cyan-500 text-black font-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <User size={12} /> Mod Kad ({totalEntities})
                </button>

                <button
                  onClick={() => { triggerHaptic(10); setActiveTab('CAPTURE'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                    activeTab === 'CAPTURE' ? 'bg-cyan-500 text-black font-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Camera size={12} /> + Bukti Foto
                </button>

                <button
                  onClick={() => { triggerHaptic(10); setActiveTab('GPS'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                    activeTab === 'GPS' ? 'bg-cyan-500 text-black font-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <MapPin size={12} /> + GPS Semasa
                </button>

                <button
                  onClick={() => { triggerHaptic(10); setActiveTab('AI_AGENT'); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                    activeTab === 'AI_AGENT' ? 'bg-purple-500 text-black font-black shadow' : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <Brain size={12} /> AI Lapangan
                </button>
              </div>

              {/* TAB CONTENTS */}
              <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar space-y-3">
                
                {/* ----------------- 1. MENU UTAMA ALATAN LAPANGAN ----------------- */}
                {activeTab === 'MENU' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      
                      {/* 1-Tap Foto Bukti */}
                      <button
                        onClick={() => { triggerHaptic(15); setActiveTab('CAPTURE'); }}
                        className="p-3 rounded-xl bg-gradient-to-br from-cyan-950/60 to-black border border-cyan-500/40 hover:border-cyan-400 text-left group flex flex-col justify-between h-24"
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                            <Camera size={16} />
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">KAMERA</span>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-cyan-200">Tangkap Bukti Foto</div>
                          <div className="text-[8.5px] text-gray-400 mt-0.5">Ambil foto & rekod terus ke graf</div>
                        </div>
                      </button>

                      {/* 1-Tap GPS Pin */}
                      <button
                        onClick={() => { triggerHaptic(15); setActiveTab('GPS'); }}
                        className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/60 to-black border border-emerald-500/40 hover:border-emerald-400 text-left group flex flex-col justify-between h-24"
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                            <MapPin size={16} />
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">GEO-STING</span>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-emerald-200">Pin GPS Lapangan</div>
                          <div className="text-[8.5px] text-gray-400 mt-0.5">Simpan koordinat semasa peranti</div>
                        </div>
                      </button>

                      {/* Carian Pantas Telefon / Breach */}
                      <button
                        onClick={() => {
                          triggerHaptic(15);
                          setIsOpen(false);
                          onOpenModal('phone_intel');
                        }}
                        className="p-3 rounded-xl bg-gradient-to-br from-blue-950/60 to-black border border-blue-500/40 hover:border-blue-400 text-left group flex flex-col justify-between h-24"
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 group-hover:bg-blue-500 group-hover:text-black transition-all">
                            <Phone size={16} />
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-500/40">INTEL</span>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-blue-200">Phone & Identity Hub</div>
                          <div className="text-[8.5px] text-gray-400 mt-0.5">Truecaller, WhatsApp, Kebocoran</div>
                        </div>
                      </button>

                      {/* Mod Kad Senarai */}
                      <button
                        onClick={() => { triggerHaptic(15); setActiveTab('CARDS'); }}
                        className="p-3 rounded-xl bg-gradient-to-br from-amber-950/60 to-black border border-amber-500/40 hover:border-amber-400 text-left group flex flex-col justify-between h-24"
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 group-hover:bg-amber-500 group-hover:text-black transition-all">
                            <Layers size={16} />
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/40">{totalEntities} NOD</span>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-amber-200">Mod Kad Entiti</div>
                          <div className="text-[8.5px] text-gray-400 mt-0.5">Lihat senarai entiti mesra sentuhan</div>
                        </div>
                      </button>

                      {/* AI Risikan Lapangan */}
                      <button
                        onClick={() => { triggerHaptic(15); setActiveTab('AI_AGENT'); }}
                        className="p-3 rounded-xl bg-gradient-to-br from-purple-950/60 to-black border border-purple-500/40 hover:border-purple-400 text-left group flex flex-col justify-between h-24"
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 group-hover:bg-purple-500 group-hover:text-black transition-all">
                            <Brain size={16} />
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-500/40">GEMINI</span>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-purple-200">AI Assistant Lapangan</div>
                          <div className="text-[8.5px] text-gray-400 mt-0.5">Analisa segera & strategi siasatan</div>
                        </div>
                      </button>

                    </div>

                    {/* Quick Joystick Trigger Banner */}
                    <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Move size={18} className="text-cyan-400" />
                        <div>
                          <div className="text-[10px] font-bold text-cyan-200">MOBA Analog Joystick</div>
                          <div className="text-[8.5px] text-gray-400">Navigasi graf 360° lancar & kawalan simulator 3D</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic(20);
                          setShowVirtualDpad(prev => !prev);
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-500 text-black text-[9.5px] font-black uppercase"
                      >
                        {showVirtualDpad ? 'Tutup' : 'Buka Joystick'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ----------------- 2. MOD KAD ENTITI (MOBILE LIST VIEW) ----------------- */}
                {activeTab === 'CARDS' && (
                  <div className="space-y-2.5">
                    
                    {/* Search & Filter Bar */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari entiti / suspek..."
                          className="w-full bg-black/60 border border-gray-700 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      </div>

                      {/* Type Filter Select */}
                      <select
                        value={cardFilterType}
                        onChange={(e) => setCardFilterType(e.target.value)}
                        className="bg-black/80 border border-cyan-500/40 rounded-lg px-2 py-1.5 text-[10px] font-bold text-cyan-300 focus:outline-none"
                      >
                        <option value="ALL">Semua Jenis</option>
                        <option value="person">Individu / Suspek</option>
                        <option value="organization">Organisasi / Syarikat</option>
                        <option value="location">Lokasi GPS</option>
                        <option value="phone">Telefon</option>
                        <option value="social_media">Media Sosial</option>
                        <option value="fictional_character">Watak Fiksyen</option>
                        <option value="fictional_object">Objek / Artifak</option>
                        <option value="found_footage">Found Footage</option>
                        <option value="cryptid_myth">Kriptid / Mitos</option>
                        <option value="weapon_hardware">Senjata / Taktikal</option>
                        <option value="malware_payload">Malware / Exploit</option>
                        <option value="biometric_evidence">Biometrik / DNA</option>
                        <option value="surveillance_device">Penderia / Pengintip</option>
                        <option value="broadcast_frequency">Frekuensi Isyarat</option>
                        <option value="classified_dossier">Dossier Rahsia</option>
                        <option value="financial_instrument">Kewangan / Keldai</option>
                        <option value="evidence">Bukti Foto / Fail</option>
                        <option value="vehicle">Kenderaan</option>
                      </select>
                    </div>

                    {/* Nodes Cards List */}
                    {filteredNodes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-xs">
                        Tiada entiti dijumpai untuk kriteria ini.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredNodes.map(node => {
                          const isSelected = selectedNodes.some(n => n.id === node.id);
                          return (
                            <div
                              key={node.id}
                              onClick={() => {
                                triggerHaptic(15);
                                onSelectNode(node);
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                                  : 'bg-black/60 border-gray-800 hover:border-cyan-500/50'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                {/* Avatar / Node Icon */}
                                {node.imageUrl ? (
                                  <img 
                                    src={node.imageUrl} 
                                    alt={node.label} 
                                    className="w-10 h-10 rounded-lg object-cover border border-cyan-500/50 shrink-0" 
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 font-black text-xs">
                                    {node.type?.slice(0, 2).toUpperCase() || 'ID'}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-white truncate">{node.label}</h4>
                                    <span className="text-[8px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-mono">
                                      {node.type || 'unknown'}
                                    </span>
                                  </div>

                                  {node.details && (
                                    <p className="text-[9.5px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                      {node.details}
                                    </p>
                                  )}

                                  {/* Quick Action Badges */}
                                  <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-gray-800/80">
                                    {node.type === 'phone' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          triggerHaptic(15);
                                          onOpenModal('phone_intel');
                                        }}
                                        className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40 text-[8.5px] font-bold flex items-center gap-1"
                                      >
                                        <Phone size={9} /> Semak No.
                                      </button>
                                    )}

                                    {node.type === 'location' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          triggerHaptic(15);
                                          onOpenModal('geo_recon');
                                        }}
                                        className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[8.5px] font-bold flex items-center gap-1"
                                      >
                                        <MapPin size={9} /> Buka Peta
                                      </button>
                                    )}

                                    <span className="text-[8px] text-gray-500 ml-auto font-mono">
                                      ID: {node.id.slice(0, 8)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ----------------- 3. 1-TAP TANGKAP BUKTI KAMERA ----------------- */}
                {activeTab === 'CAPTURE' && (
                  <div className="space-y-3">
                    <div className="text-[11px] text-gray-300 leading-snug">
                      Ambil gambar terus dari kamera telefon atau muat naik dokumen bukti lapangan untuk dimasukkan ke dalam graf kes siasatan.
                    </div>

                    {/* Camera Trigger Box */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 rounded-2xl p-4 text-center cursor-pointer bg-cyan-950/20 hover:bg-cyan-950/40 transition-all flex flex-col items-center justify-center gap-2"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />

                      {capturedImageBase64 ? (
                        <div className="relative w-full max-h-48 overflow-hidden rounded-xl border border-cyan-400">
                          <img src={capturedImageBase64} alt="Bukti Lapangan" className="w-full h-full object-cover" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCapturedImageBase64(null);
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-black/80 text-rose-400 border border-rose-500/50"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            <Camera size={26} />
                          </div>
                          <div>
                            <div className="text-xs font-black text-cyan-300">Ketuk untuk Buka Kamera / Pilih Foto</div>
                            <div className="text-[9px] text-gray-400">Menyokong JPEG, PNG, Tangkapan Skrin</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Node Metadata Form */}
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-300">Label Bukti / Nama Suspek:</label>
                        <input
                          type="text"
                          value={captureLabel}
                          onChange={(e) => setCaptureLabel(e.target.value)}
                          placeholder="Contoh: RESIT_HOTEL_01 / SUSPEK_X"
                          className="w-full bg-black/70 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-300">Kategori:</label>
                          <select
                            value={captureType}
                            onChange={(e) => setCaptureType(e.target.value as any)}
                            className="w-full bg-black/70 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono mt-1"
                          >
                            <option value="evidence">Bukti / Dokumen</option>
                            <option value="person">Suspek / Individu</option>
                            <option value="organization">Organisasi / Syarikat</option>
                            <option value="location">Lokasi Fizikal</option>
                            <option value="fictional_character">Watak Fiksyen</option>
                            <option value="fictional_object">Objek / Artifak</option>
                            <option value="found_footage">Found Footage</option>
                            <option value="cryptid_myth">Kriptid / Mitos</option>
                            <option value="weapon_hardware">Senjata / Taktikal</option>
                            <option value="malware_payload">Malware / Kod</option>
                            <option value="biometric_evidence">Biometrik / DNA</option>
                            <option value="surveillance_device">Peranti Pengintip</option>
                            <option value="broadcast_frequency">Isyarat / Frekuensi</option>
                            <option value="classified_dossier">Dossier Rahsia</option>
                            <option value="financial_instrument">Kewangan / Keldai</option>
                            <option value="vehicle">Kenderaan</option>
                            <option value="social">Media Sosial</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-300">Sertakan GPS Telefon:</label>
                          <button
                            onClick={() => setIncludeGpsWithCapture(!includeGpsWithCapture)}
                            className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold border mt-1 flex items-center justify-center gap-1.5 transition-all ${
                              includeGpsWithCapture 
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50' 
                                : 'bg-black/60 text-gray-400 border-gray-700'
                            }`}
                          >
                            <MapPin size={12} />
                            <span>{includeGpsWithCapture ? 'GPS Aktif' : 'GPS Mati'}</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-300">Nota / Huraian Bukti:</label>
                        <textarea
                          rows={2}
                          value={captureNotes}
                          onChange={(e) => setCaptureNotes(e.target.value)}
                          placeholder="Catatan tambahan mengenai bukti ini..."
                          className="w-full bg-black/70 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono mt-1"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleSaveCapturedEvidence}
                      disabled={!captureLabel.trim()}
                      className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.6)] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check size={15} /> Simpan Bukti ke Graf
                    </button>
                  </div>
                )}

                {/* ----------------- 4. 1-TAP GEO-STING / GPS LAPANGAN ----------------- */}
                {activeTab === 'GPS' && (
                  <div className="space-y-3">
                    <div className="text-[11px] text-gray-300 leading-snug">
                      Dapatkan koordinat satelit GPS peranti telefon anda secara masa nyata dan pautkannya terus ke sasaran siasatan semasa.
                    </div>

                    {/* Geolocation Fetch Card */}
                    <div className="p-3.5 rounded-2xl bg-black/60 border border-emerald-500/40 space-y-3">
                      <button
                        onClick={handleFetchCurrentGps}
                        disabled={isCapturingGps}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      >
                        <MapPin size={15} className={isCapturingGps ? 'animate-bounce' : ''} />
                        <span>{isCapturingGps ? 'Mencerap Satelit GPS...' : 'Cerap GPS Semasa'}</span>
                      </button>

                      {gpsError && (
                        <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-[10px]">
                          {gpsError}
                        </div>
                      )}

                      {gpsData && (
                        <div className="space-y-1.5 pt-2 border-t border-gray-800 text-[10.5px]">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Latitud:</span>
                            <span className="font-bold text-emerald-300">{gpsData.lat.toFixed(6)}°</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Longitud:</span>
                            <span className="font-bold text-emerald-300">{gpsData.lng.toFixed(6)}°</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ketepatan:</span>
                            <span className="text-emerald-400 font-mono">±{gpsData.accuracy} meter</span>
                          </div>
                          {gpsData.address && (
                            <div className="pt-1 text-[9.5px] text-gray-300 leading-tight">
                              <span className="text-gray-400">Alamat Dikesan:</span> {gpsData.address}
                            </div>
                          )}

                          <button
                            onClick={handleSaveGpsNode}
                            className="w-full mt-2 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                          >
                            <Check size={14} /> Pautkan Koordinat ke Graf
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ----------------- 5. AI RISIKAN LAPANGAN (GEMINI) ----------------- */}
                {activeTab === 'AI_AGENT' && (
                  <div className="space-y-3">
                    <div className="text-[11px] text-gray-300 leading-snug">
                      Tanyakan soalan risikan atau minta cadangan langkah operasi taktikal seterusnya berdasarkan data graf kes semasa.
                    </div>

                    {/* Quick Query Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                      <button
                        onClick={() => handleRunAiFieldQuery('Siapakah entiti atau suspek paling berisiko tinggi / berhubung rapat dalam kes ini?')}
                        className="px-2 py-1 rounded-lg bg-purple-950/70 border border-purple-500/40 text-[9px] font-bold text-purple-300 hover:bg-purple-800 whitespace-nowrap"
                      >
                        ⚡ Analisa Suspek Utama
                      </button>
                      <button
                        onClick={() => handleRunAiFieldQuery('Apakah corak sambungan atau laluan paling mencurigakan antara nod?')}
                        className="px-2 py-1 rounded-lg bg-purple-950/70 border border-purple-500/40 text-[9px] font-bold text-purple-300 hover:bg-purple-800 whitespace-nowrap"
                      >
                        🔍 Corak Hubungan
                      </button>
                      <button
                        onClick={() => handleRunAiFieldQuery('Cadangkan 3 langkah siasatan fizikal / penjejakan seterusnya.')}
                        className="px-2 py-1 rounded-lg bg-purple-950/70 border border-purple-500/40 text-[9px] font-bold text-purple-300 hover:bg-purple-800 whitespace-nowrap"
                      >
                        🎯 Langkah Taktikal Seterusnya
                      </button>
                    </div>

                    {/* Custom Prompt Input */}
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={aiFieldPrompt}
                        onChange={(e) => setAiFieldPrompt(e.target.value)}
                        placeholder="Contoh: Buat rumusan ringkas mengenai aktiviti suspek..."
                        className="w-full bg-black/70 border border-purple-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                      />

                      <button
                        onClick={() => handleRunAiFieldQuery()}
                        disabled={isAiLoading || !aiFieldPrompt.trim()}
                        className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-[0_0_15px_rgba(168,85,247,0.5)] cursor-pointer"
                      >
                        <Sparkles size={14} className={isAiLoading ? 'animate-spin' : ''} />
                        <span>{isAiLoading ? 'Menjana Analisa...' : 'Jana Analisa AI Lapangan'}</span>
                      </button>
                    </div>

                    {/* AI Response Output */}
                    {aiFieldResponse && (
                      <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 text-purple-100 text-[11px] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line custom-scrollbar">
                        <div className="text-[9px] font-bold text-purple-400 mb-1 flex items-center gap-1">
                          <Brain size={11} /> LAPORAN RISIKAN AI:
                        </div>
                        {aiFieldResponse}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

