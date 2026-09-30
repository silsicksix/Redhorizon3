import React, { useState, useEffect, useRef } from 'react';
import { Node } from '../types';
import { 
    AVAILABLE_TRANSFORMS, 
    DEFAULT_TRANSFORM_PRESETS, 
    Transform, 
    TransformPreset 
} from '../services/transforms';
import { 
    Zap, 
    Search, 
    Play, 
    Trash2, 
    Plus, 
    ArrowUp, 
    ArrowDown, 
    Minus, 
    Maximize2, 
    Minimize2,
    X, 
    Save, 
    Bookmark, 
    Globe, 
    User, 
    Server, 
    Phone, 
    Sparkles, 
    SlidersHorizontal, 
    ChevronDown, 
    ChevronUp, 
    RotateCcw, 
    Check, 
    Shield, 
    Layers,
    Info,
    ExternalLink,
    AlertTriangle,
    HelpCircle,
    Move,
    GripHorizontal
} from 'lucide-react';

interface TransformManagerProps {
    selectedNode: Node | null;
    onExecuteChain: (
        chain: string[], 
        node: Node, 
        dorkConfig?: { 
            targetSite: string; 
            fileType: string; 
            exactMatch: string; 
            exclude: string; 
            inUrl: string; 
            inTitle: string; 
            inText: string; 
        }
    ) => Promise<void> | void;
    onClose: () => void;
}

const STORAGE_CUSTOM_PRESETS_KEY = 'redhorizon_custom_transform_presets_v1';
const STORAGE_DISCLAIMER_DISMISSED_KEY = 'redhorizon_maltego_disclaimer_dismissed_v1';
const STORAGE_POS_KEY = 'redhorizon_transform_pos_v2';
const STORAGE_SIZE_KEY = 'redhorizon_transform_size_v2';

export const TransformManager: React.FC<TransformManagerProps> = ({ 
    selectedNode, 
    onExecuteChain, 
    onClose 
}) => {
    // Window state & positioning
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    // Initial position calculation (top-right by default)
    const [position, setPosition] = useState<{ x: number; y: number }>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_POS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    const maxX = Math.max(10, (typeof window !== 'undefined' ? window.innerWidth : 1024) - 200);
                    const maxY = Math.max(10, (typeof window !== 'undefined' ? window.innerHeight : 768) - 100);
                    return {
                        x: Math.max(10, Math.min(maxX, parsed.x)),
                        y: Math.max(10, Math.min(maxY, parsed.y))
                    };
                }
            }
        } catch {}
        const defaultX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 480) : 550;
        return { x: defaultX, y: 72 };
    });

    // Initial size calculation
    const [size, setSize] = useState<{ width: number; height: number }>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_SIZE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
                    return {
                        width: Math.max(340, Math.min(window.innerWidth - 20, parsed.width)),
                        height: Math.max(380, Math.min(window.innerHeight - 30, parsed.height))
                    };
                }
            }
        } catch {}
        const defW = typeof window !== 'undefined' ? Math.min(460, window.innerWidth - 24) : 460;
        const defH = typeof window !== 'undefined' ? Math.min(640, window.innerHeight - 80) : 640;
        return { width: defW, height: defH };
    });

    // Minimized bar position
    const [minimizedPos, setMinimizedPos] = useState<{ x: number; y: number }>(() => {
        const defaultX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 380) : 600;
        return { x: defaultX, y: 72 };
    });

    // Drag & Resize refs
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingMinimized, setIsDraggingMinimized] = useState(false);
    const [resizing, setResizing] = useState<'corner' | 'right' | 'bottom' | null>(null);

    const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
        startX: 0,
        startY: 0,
        posX: 0,
        posY: 0
    });

    const resizeStartRef = useRef<{ startX: number; startY: number; startW: number; startH: number }>({
        startX: 0,
        startY: 0,
        startW: 0,
        startH: 0
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const animFrameRef = useRef<number | null>(null);

    const [activeTab, setActiveTab] = useState<'catalog' | 'presets' | 'dork_config'>('catalog');
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'maltego' | 'domain' | 'person' | 'server' | 'phone' | 'any'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [savePresetOpen, setSavePresetOpen] = useState(false);
    const [newPresetTitle, setNewPresetTitle] = useState('');
    const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
    const [showDisclaimer, setShowDisclaimer] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_DISCLAIMER_DISMISSED_KEY) !== 'true';
        } catch {
            return true;
        }
    });
    const [isDisclaimerExpanded, setIsDisclaimerExpanded] = useState<boolean>(false);

    // Active Chain
    const [chain, setChain] = useState<string[]>(['DUCKDUCKGO_DORK']);
    
    // Custom Presets
    const [customPresets, setCustomPresets] = useState<TransformPreset[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_CUSTOM_PRESETS_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Dork Configs
    const [dorkConfig, setDorkConfig] = useState({
        targetSite: '',
        fileType: '',
        exactMatch: '',
        exclude: '',
        inUrl: '',
        inTitle: '',
        inText: ''
    });

    // Reset position back to top-right corner
    const handleResetPosition = (e: React.MouseEvent) => {
        e.stopPropagation();
        const defX = Math.max(16, window.innerWidth - 480);
        const defY = 72;
        const newPos = { x: defX, y: defY };
        setPosition(newPos);
        setMinimizedPos({ x: Math.max(16, window.innerWidth - 380), y: 72 });
        try {
            localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(newPos));
        } catch {}
        triggerToast('Posisi tetingkap telah diset semula.');
    };

    // Auto Clamp on window resize
    useEffect(() => {
        const handleWinResize = () => {
            setPosition(prev => {
                const maxX = Math.max(10, window.innerWidth - 150);
                const maxY = Math.max(10, window.innerHeight - 100);
                return {
                    x: Math.max(10, Math.min(maxX, prev.x)),
                    y: Math.max(10, Math.min(maxY, prev.y))
                };
            });
            setSize(prev => ({
                width: Math.min(window.innerWidth - 20, Math.max(340, prev.width)),
                height: Math.min(window.innerHeight - 30, Math.max(380, prev.height))
            }));
        };
        window.addEventListener('resize', handleWinResize);
        return () => window.removeEventListener('resize', handleWinResize);
    }, []);

    // ----------------------------------------------------
    // DRAGGING SYSTEM (Main Window)
    // ----------------------------------------------------
    const startDragging = (clientX: number, clientY: number) => {
        if (isMaximized) return;
        dragStartRef.current = {
            startX: clientX,
            startY: clientY,
            posX: position.x,
            posY: position.y
        };
        setIsDragging(true);
    };

    const handleHeaderMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('a')) {
            return;
        }
        startDragging(e.clientX, e.clientY);
    };

    const handleHeaderTouchStart = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('a')) {
            return;
        }
        if (e.touches.length === 1) {
            startDragging(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    // ----------------------------------------------------
    // DRAGGING SYSTEM (Minimized Bar)
    // ----------------------------------------------------
    const startDraggingMinimized = (clientX: number, clientY: number) => {
        dragStartRef.current = {
            startX: clientX,
            startY: clientY,
            posX: minimizedPos.x,
            posY: minimizedPos.y
        };
        setIsDraggingMinimized(true);
    };

    const handleMinimizedMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        startDraggingMinimized(e.clientX, e.clientY);
    };

    const handleMinimizedTouchStart = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        if (e.touches.length === 1) {
            startDraggingMinimized(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    // ----------------------------------------------------
    // RESIZING SYSTEM
    // ----------------------------------------------------
    const startResizing = (mode: 'corner' | 'right' | 'bottom', clientX: number, clientY: number) => {
        if (isMaximized) return;
        resizeStartRef.current = {
            startX: clientX,
            startY: clientY,
            startW: size.width,
            startH: size.height
        };
        setResizing(mode);
    };

    useEffect(() => {
        if (!isDragging && !isDraggingMinimized && !resizing) return;

        const handleMove = (clientX: number, clientY: number) => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

            animFrameRef.current = requestAnimationFrame(() => {
                if (isDragging) {
                    const dx = clientX - dragStartRef.current.startX;
                    const dy = clientY - dragStartRef.current.startY;
                    const maxX = Math.max(10, window.innerWidth - 120);
                    const maxY = Math.max(10, window.innerHeight - 60);
                    const newX = Math.max(10, Math.min(maxX, dragStartRef.current.posX + dx));
                    const newY = Math.max(10, Math.min(maxY, dragStartRef.current.posY + dy));
                    setPosition({ x: newX, y: newY });
                } else if (isDraggingMinimized) {
                    const dx = clientX - dragStartRef.current.startX;
                    const dy = clientY - dragStartRef.current.startY;
                    const maxX = Math.max(10, window.innerWidth - 200);
                    const maxY = Math.max(10, window.innerHeight - 50);
                    const newX = Math.max(10, Math.min(maxX, dragStartRef.current.posX + dx));
                    const newY = Math.max(10, Math.min(maxY, dragStartRef.current.posY + dy));
                    setMinimizedPos({ x: newX, y: newY });
                } else if (resizing) {
                    const dx = clientX - resizeStartRef.current.startX;
                    const dy = clientY - resizeStartRef.current.startY;

                    let newW = resizeStartRef.current.startW;
                    let newH = resizeStartRef.current.startH;

                    if (resizing === 'right' || resizing === 'corner') {
                        newW = Math.max(340, Math.min(window.innerWidth - position.x - 10, resizeStartRef.current.startW + dx));
                    }
                    if (resizing === 'bottom' || resizing === 'corner') {
                        newH = Math.max(380, Math.min(window.innerHeight - position.y - 10, resizeStartRef.current.startH + dy));
                    }

                    setSize({ width: newW, height: newH });
                }
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            handleMove(e.clientX, e.clientY);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const handleEnd = () => {
            if (isDragging) {
                setIsDragging(false);
                try {
                    localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(position));
                } catch {}
            }
            if (isDraggingMinimized) {
                setIsDraggingMinimized(false);
            }
            if (resizing) {
                setResizing(null);
                try {
                    localStorage.setItem(STORAGE_SIZE_KEY, JSON.stringify(size));
                } catch {}
            }
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEnd);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [isDragging, isDraggingMinimized, resizing, position, size]);

    // Auto-update notification helper
    const triggerToast = (msg: string) => {
        setShowSuccessToast(msg);
        setTimeout(() => setShowSuccessToast(null), 2500);
    };

    const addStep = (transformId: string) => {
        setChain(prev => [...prev, transformId]);
        triggerToast(`Langkah ditambahkan: ${AVAILABLE_TRANSFORMS.find(t => t.id === transformId)?.label || transformId}`);
    };

    const removeStep = (index: number) => {
        setChain(prev => prev.filter((_, i) => i !== index));
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === chain.length - 1) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        setChain(prev => {
            const newChain = [...prev];
            const temp = newChain[index];
            newChain[index] = newChain[targetIndex];
            newChain[targetIndex] = temp;
            return newChain;
        });
    };

    const clearChain = () => {
        setChain([]);
        triggerToast('Semua langkah rangkaian telah dikosongkan.');
    };

    const loadPreset = (preset: TransformPreset) => {
        setChain(preset.chain);
        if (preset.defaultDorkConfig) {
            setDorkConfig(prev => ({
                ...prev,
                ...preset.defaultDorkConfig
            }));
        }
        triggerToast(`Templat dimuatkan: "${preset.title}"`);
    };

    const handleSaveCustomPreset = () => {
        if (!newPresetTitle.trim() || chain.length === 0) return;
        const newPreset: TransformPreset = {
            id: `custom_preset_${Date.now()}`,
            title: newPresetTitle.trim(),
            description: `Tersuai (${chain.length} langkah): ${chain.map(id => AVAILABLE_TRANSFORMS.find(t => t.id === id)?.label || id).slice(0, 3).join(' ➔ ')}`,
            category: 'general',
            chain: [...chain],
            defaultDorkConfig: { ...dorkConfig }
        };
        const updated = [newPreset, ...customPresets];
        setCustomPresets(updated);
        try {
            localStorage.setItem(STORAGE_CUSTOM_PRESETS_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Error saving custom transform presets:', e);
        }
        setNewPresetTitle('');
        setSavePresetOpen(false);
        triggerToast(`Templat "${newPreset.title}" berjaya disimpan!`);
    };

    const handleDeleteCustomPreset = (presetId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = customPresets.filter(p => p.id !== presetId);
        setCustomPresets(updated);
        try {
            localStorage.setItem(STORAGE_CUSTOM_PRESETS_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Error deleting custom preset:', e);
        }
        triggerToast('Templat tersuai telah dipadam.');
    };

    const handleExecute = async () => {
        if (!selectedNode || chain.length === 0 || isExecuting) return;
        setIsExecuting(true);
        try {
            await onExecuteChain(chain, selectedNode, dorkConfig);
            triggerToast('Selesai! Maklumat risikan disintesis terus ke dalam Panel Dossier di atas kanvas.');
            setIsMinimized(true);
        } finally {
            setIsExecuting(false);
        }
    };

    // Filter transforms
    const filteredTransforms = AVAILABLE_TRANSFORMS.filter(t => {
        const matchesCategory = 
            categoryFilter === 'all' 
                ? true 
                : categoryFilter === 'maltego'
                    ? t.provider === 'maltego'
                    : t.type === categoryFilter || t.type === 'any';
        const matchesSearch = !searchQuery.trim() || 
            t.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) ||
            (t.provider && t.provider.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const hasDorkStep = chain.includes('DUCKDUCKGO_DORK') || chain.includes('SOCIAL_MEDIA_DORK');

    const getCategoryIcon = (type: string) => {
        switch (type) {
            case 'domain': return <Globe size={11} className="text-cyan-400" />;
            case 'person': return <User size={11} className="text-purple-400" />;
            case 'server': return <Server size={11} className="text-emerald-400" />;
            case 'phone': return <Phone size={11} className="text-amber-400" />;
            default: return <Sparkles size={11} className="text-[#ff0033]" />;
        }
    };

    // ----------------------------------------------------
    // MINIMIZED STATE (Compact Floating HUD Bar - Draggable)
    // ----------------------------------------------------
    if (isMinimized) {
        return (
            <div 
                style={{ 
                    position: 'fixed',
                    left: minimizedPos.x,
                    top: minimizedPos.y,
                    zIndex: 95
                }}
                onMouseDown={handleMinimizedMouseDown}
                onTouchStart={handleMinimizedTouchStart}
                className="bg-[#08080c]/95 border border-cyan-500/60 rounded-xl p-2.5 shadow-[0_0_25px_rgba(6,182,212,0.35)] backdrop-blur-xl text-white font-mono flex items-center gap-3 select-none w-80 sm:w-96 animate-in fade-in slide-in-from-top-2 cursor-grab active:cursor-grabbing hover:border-cyan-400 transition-colors pointer-events-auto"
                title="Klik & heret untuk ubah kedudukan"
            >
                <div className="p-1 text-cyan-400 opacity-60">
                    <Move size={13} />
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0 pointer-events-none">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-cyan-400 uppercase tracking-wider">
                            <Zap size={13} className="text-[#ff0033]" />
                            <span>TRANSFORM MANAGER</span>
                        </div>
                        <div className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                            <span className="text-white font-bold">{selectedNode?.label || 'Tiada Sasaran'}</span>
                            <span>•</span>
                            <span className="text-cyan-300 font-semibold">{chain.length} langkah</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(false);
                        }}
                        className="p-1.5 hover:bg-cyan-950/80 text-cyan-400 hover:text-white rounded border border-cyan-500/40 transition-colors cursor-pointer"
                        title="Kembangkan Semula Tetingkap Transform Manager"
                        aria-label="Kembangkan"
                    >
                        <Maximize2 size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="p-1.5 hover:bg-red-950/80 text-red-400 hover:text-white rounded border border-red-500/40 transition-colors cursor-pointer"
                        title="Tutup Transform Manager"
                        aria-label="Tutup"
                    >
                        <X size={13} />
                    </button>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------
    // EXPANDED STATE (Full Tactical Window - Draggable & Resizable)
    // ----------------------------------------------------
    const containerStyle: React.CSSProperties = isMaximized 
        ? {
            position: 'fixed',
            left: 8,
            top: 8,
            width: 'calc(100vw - 16px)',
            height: 'calc(100vh - 16px)',
            zIndex: 95
        }
        : {
            position: 'fixed',
            left: position.x,
            top: position.y,
            width: `${size.width}px`,
            height: `${size.height}px`,
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: 'calc(100vh - 16px)',
            zIndex: 95
        };

    return (
        <>
            {/* Transparent drag/resize capture overlay to prevent stuttering */}
            {(isDragging || isDraggingMinimized || !!resizing) && (
                <div className="fixed inset-0 z-[9990] cursor-grabbing select-none pointer-events-auto bg-transparent" />
            )}

            <div 
                ref={containerRef}
                style={containerStyle}
                className={`bg-[#0a0a10]/95 border border-[#ff0033]/70 rounded-xl text-white shadow-[0_0_40px_rgba(255,0,51,0.25)] backdrop-blur-2xl flex flex-col overflow-hidden font-mono animate-in fade-in zoom-in-95 duration-150 pointer-events-auto ${isDragging ? 'opacity-95 shadow-[0_0_50px_rgba(255,0,51,0.45)] ring-2 ring-[#ff0033]/60' : ''}`}
            >
                {/* WINDOW HEADER WITH DRAGGING HANDLE & CONTROLS */}
                <div 
                    onMouseDown={handleHeaderMouseDown}
                    onTouchStart={handleHeaderTouchStart}
                    className="bg-gradient-to-r from-black via-zinc-950 to-black p-2.5 px-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 cursor-grab active:cursor-grabbing group select-none"
                    title="Klik & heret bar ini untuk alih posisi tetingkap"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 bg-[#ff0033]/20 border border-[#ff0033]/50 rounded text-[#ff0033] shrink-0 group-hover:bg-[#ff0033]/30 transition-colors">
                            <Zap size={14} className="animate-pulse" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-xs font-black uppercase tracking-widest text-[#ff0033] truncate flex items-center gap-1">
                                    <span>TRANSFORM MANAGER</span>
                                    <Move size={11} className="text-gray-500 group-hover:text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </h2>
                                <span className="text-[9px] bg-red-950/80 border border-red-500/40 text-red-300 px-1 py-0.2 rounded font-bold hidden sm:inline">
                                    RESIZABLE
                                </span>
                            </div>
                            {selectedNode && (
                                <div className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                                    <span className="text-gray-500">SASARAN:</span>
                                    <span className="text-cyan-300 font-bold truncate max-w-[140px] sm:max-w-[220px]">
                                        {selectedNode.label}
                                    </span>
                                    <span className="text-[9px] px-1 bg-white/10 rounded text-gray-300 uppercase">
                                        {selectedNode.type}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* WINDOW ACTION CONTROLS */}
                    <div className="flex items-center gap-1 shrink-0">
                        {/* Reset Position button */}
                        <button 
                            type="button"
                            onClick={handleResetPosition}
                            className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-cyan-300 rounded border border-white/10 hover:border-cyan-500/40 transition-colors cursor-pointer"
                            title="Set Semula Kedudukan Tetingkap (Reset Posisi)"
                            aria-label="Reset Posisi"
                        >
                            <RotateCcw size={12} />
                        </button>

                        {/* Maximize / Restore Toggle button */}
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMaximized(!isMaximized);
                            }}
                            className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                            title={isMaximized ? "Kembali ke Saiz Biasa" : "Skrin Penuh (Maximize)"}
                            aria-label="Maximize / Restore"
                        >
                            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                        </button>

                        {/* Minimize to HUD bar button */}
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMinimized(true);
                            }}
                            className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                            title="Kecilkan ke Bar Terapung (Minimize)"
                            aria-label="Kecilkan Tetingkap"
                        >
                            <Minus size={13} />
                        </button>

                        {/* Close button */}
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-1.5 hover:bg-red-950/70 text-gray-400 hover:text-red-400 rounded border border-white/10 hover:border-red-500/40 transition-colors cursor-pointer"
                            title="Tutup Transform Manager (✕)"
                            aria-label="Tutup Tetingkap"
                        >
                            <X size={13} />
                        </button>
                    </div>
                </div>

            {/* TOAST ALERT */}
            {showSuccessToast && (
                <div className="bg-emerald-950/90 border-b border-emerald-500/50 text-emerald-300 text-[10px] px-3 py-1 flex items-center gap-1.5 animate-in slide-in-from-top duration-150 shrink-0">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{showSuccessToast}</span>
                </div>
            )}

            {/* DISCLAIMER BANNER FOR TRANSFORMS */}
            {showDisclaimer && (
                <div className="bg-amber-950/40 border-b border-amber-500/40 p-2 text-amber-200 text-[10px] flex flex-col gap-1.5 shrink-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-300">
                            <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                            <span>PENAFIAN TEKNIKAL & INTEGRASI MALTEGO</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsDisclaimerExpanded(!isDisclaimerExpanded)}
                                className="text-[9px] text-amber-300 hover:text-amber-100 underline flex items-center gap-0.5 cursor-pointer"
                            >
                                {isDisclaimerExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                <span>{isDisclaimerExpanded ? 'Ringkaskan' : 'Ketahui Lebih Lanjut'}</span>
                            </button>
                            <button
                                onClick={() => {
                                    setShowDisclaimer(false);
                                    try {
                                        localStorage.setItem(STORAGE_DISCLAIMER_DISMISSED_KEY, 'true');
                                    } catch {}
                                }}
                                className="text-amber-400/70 hover:text-amber-200 p-0.5 ml-1 cursor-pointer"
                                title="Faham & Tutup Penafian"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    </div>
                    <p className="text-[9px] text-amber-200/90 leading-relaxed">
                        Sila ambil perhatian: Transformasi berinspirasikan Maltego dan integrasi pihak ketiga bergantung kepada ketersediaan API awam, format data sasaran, had kadar (rate-limiting), serta perlindungan privasi (cth: sekatan Telegram, Cloudflare, WHOIS privacy). Tidak semua transform dijamin menghasilkan maklumat lengkap bagi setiap entiti.
                    </p>
                    {isDisclaimerExpanded && (
                        <div className="text-[8.5px] text-amber-200/80 bg-black/40 p-1.5 rounded border border-amber-500/20 space-y-1 font-mono">
                            <div>• <strong>DNS / IP Resolvers:</strong> Menggunakan Google Public DNS & heuristik rangkaian terbuka.</div>
                            <div>• <strong>Sosial & Telegram:</strong> Entiti swasta atau nombor bersembunyi tidak dapat diekstrak tanpa kredensial bot/kebenaran khusus.</div>
                            <div>• <strong>Kadar Had (Rate Limit):</strong> Panggilan berulang boleh disekat sementara oleh penyedia perkhidmatan (cth: Shodan, WHOIS).</div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB NAVIGATION */}
            <div className="flex items-center bg-black/60 border-b border-white/10 p-1 gap-1 text-[10px] shrink-0">
                <button
                    onClick={() => setActiveTab('catalog')}
                    className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 font-bold uppercase transition-all ${
                        activeTab === 'catalog'
                            ? 'bg-[#ff0033]/20 border border-[#ff0033]/60 text-white shadow-[0_0_10px_rgba(255,0,51,0.2)]'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Layers size={11} className={activeTab === 'catalog' ? 'text-[#ff0033]' : 'text-gray-400'} />
                    <span>Katalog ({AVAILABLE_TRANSFORMS.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('presets')}
                    className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 font-bold uppercase transition-all ${
                        activeTab === 'presets'
                            ? 'bg-cyan-950/80 border border-cyan-500/60 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Bookmark size={11} className={activeTab === 'presets' ? 'text-cyan-400' : 'text-gray-400'} />
                    <span>Templat ({DEFAULT_TRANSFORM_PRESETS.length + customPresets.length})</span>
                </button>
                {hasDorkStep && (
                    <button
                        onClick={() => setActiveTab('dork_config')}
                        className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 font-bold uppercase transition-all ${
                            activeTab === 'dork_config'
                                ? 'bg-purple-950/80 border border-purple-500/60 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <SlidersHorizontal size={11} className={activeTab === 'dork_config' ? 'text-purple-400' : 'text-gray-400'} />
                        <span>Dorking Config</span>
                    </button>
                )}
            </div>

            {/* TAB CONTENT (SCROLLABLE & ALWAYS ACCESSIBLE) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
                
                {/* ----------------- TAB 1: CATALOG ----------------- */}
                {activeTab === 'catalog' && (
                    <div className="space-y-2.5">
                        {/* Search & Category filter */}
                        <div className="space-y-1.5">
                            <div className="relative">
                                <Search size={12} className="absolute left-2.5 top-2.5 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Cari transform (cth: maltego, dork, dns, phone, shodan)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/80 border border-white/15 rounded pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#ff0033] transition-colors"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-2 text-gray-500 hover:text-white"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Category Pills */}
                            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 text-[9px]">
                                {[
                                    { id: 'all', label: 'Semua' },
                                    { id: 'maltego', label: '⚡ Maltego Core' },
                                    { id: 'domain', label: 'Domain/Web' },
                                    { id: 'person', label: 'Individu' },
                                    { id: 'server', label: 'Server/IP' },
                                    { id: 'phone', label: 'Telefon' },
                                    { id: 'any', label: 'Pelbagai' },
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategoryFilter(cat.id as any)}
                                        className={`px-2 py-0.5 rounded whitespace-nowrap border transition-all ${
                                            categoryFilter === cat.id
                                                ? 'bg-[#ff0033] text-black border-[#ff0033] font-bold shadow-[0_0_8px_rgba(255,0,51,0.4)]'
                                                : 'bg-black/60 text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Transforms List */}
                        <div className="space-y-1.5">
                            {filteredTransforms.length === 0 ? (
                                <div className="text-center py-6 text-gray-500 text-xs">
                                    Tiada transformasi dijumpai untuk carian ini.
                                </div>
                            ) : (
                                filteredTransforms.map((t) => {
                                    const isAdded = chain.includes(t.id);
                                    return (
                                        <div 
                                            key={t.id}
                                            className="bg-black/40 hover:bg-zinc-950 border border-white/10 hover:border-white/20 rounded p-2 transition-all flex items-start justify-between gap-2 group"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="p-1 rounded bg-white/5 border border-white/10">
                                                        {getCategoryIcon(t.type)}
                                                    </span>
                                                    <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                                                        {t.label}
                                                    </span>
                                                    {t.provider === 'maltego' && (
                                                        <span className="text-[8px] bg-red-950/80 text-red-300 border border-red-500/40 px-1 py-0.2 rounded font-bold">
                                                            MALTEGO
                                                        </span>
                                                    )}
                                                    <span className="text-[8px] bg-zinc-800 text-gray-300 px-1 py-0.2 rounded uppercase">
                                                        {t.type}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed line-clamp-2">
                                                    {t.description}
                                                </p>
                                                {t.tags && t.tags.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                        {t.tags.map(tag => (
                                                            <span key={tag} className="text-[8px] text-gray-500 bg-white/5 px-1 rounded">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => addStep(t.id)}
                                                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                                                    isAdded 
                                                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-900' 
                                                        : 'bg-[#ff0033]/20 hover:bg-[#ff0033] text-[#ff0033] hover:text-black border border-[#ff0033]/50'
                                                }`}
                                                title={isAdded ? "Tambah lagi langkah ini" : "Tambah ke rangkaian"}
                                            >
                                                <Plus size={11} />
                                                <span>{isAdded ? 'Tambah Lagi' : 'Guna'}</span>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ----------------- TAB 2: PRESETS ----------------- */}
                {activeTab === 'presets' && (
                    <div className="space-y-3">
                        {/* Save Current Chain as Preset */}
                        <div className="bg-zinc-950/80 border border-cyan-500/30 rounded p-2.5 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
                                <div className="flex items-center gap-1.5">
                                    <Save size={13} />
                                    <span>Simpan Rangkaian Semasa Sebagai Templat</span>
                                </div>
                                <span className="text-[9px] text-gray-400">({chain.length} langkah)</span>
                            </div>

                            {savePresetOpen ? (
                                <div className="space-y-2 pt-1">
                                    <input 
                                        type="text"
                                        placeholder="Nama Templat (cth: Siasatan Domain Penuh)"
                                        value={newPresetTitle}
                                        onChange={(e) => setNewPresetTitle(e.target.value)}
                                        className="w-full bg-black border border-cyan-500/50 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                                        autoFocus
                                    />
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button
                                            onClick={() => setSavePresetOpen(false)}
                                            className="px-2 py-1 text-[10px] text-gray-400 hover:text-white rounded"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            onClick={handleSaveCustomPreset}
                                            disabled={!newPresetTitle.trim() || chain.length === 0}
                                            className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] rounded transition-colors disabled:opacity-40"
                                        >
                                            Simpan Templat
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setSavePresetOpen(true)}
                                    disabled={chain.length === 0}
                                    className="w-full py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 hover:text-white rounded text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                                >
                                    <Plus size={12} />
                                    <span>Simpan Rangkaian ({chain.length} Langkah)</span>
                                </button>
                            )}
                        </div>

                        {/* Custom Saved Presets */}
                        {customPresets.length > 0 && (
                            <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1">
                                    <Bookmark size={10} />
                                    <span>Templat Tersuai Anda ({customPresets.length})</span>
                                </label>
                                <div className="space-y-1.5">
                                    {customPresets.map((preset) => (
                                        <div 
                                            key={preset.id}
                                            onClick={() => loadPreset(preset)}
                                            className="bg-black/60 hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-500/70 rounded p-2 transition-all cursor-pointer group flex items-start justify-between gap-2"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                                                        {preset.title}
                                                    </span>
                                                    <span className="text-[8px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-1 py-0.2 rounded font-bold">
                                                        {preset.chain.length} LANGKAH
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed truncate">
                                                    {preset.description}
                                                </p>
                                            </div>

                                            <button
                                                onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                                title="Padam Templat Ini"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Default Presets */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                                <Sparkles size={10} className="text-[#ff0033]" />
                                <span>Templat Rasmi Bawaan ({DEFAULT_TRANSFORM_PRESETS.length})</span>
                            </label>
                            <div className="space-y-1.5">
                                {DEFAULT_TRANSFORM_PRESETS.map((preset) => (
                                    <div 
                                        key={preset.id}
                                        onClick={() => loadPreset(preset)}
                                        className="bg-black/40 hover:bg-zinc-950 border border-white/10 hover:border-[#ff0033]/50 rounded p-2 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-xs font-bold text-white group-hover:text-[#ff0033] transition-colors">
                                                    {preset.title}
                                                </span>
                                                <span className="text-[8px] bg-red-950/70 text-red-300 border border-red-500/30 px-1 py-0.2 rounded font-bold">
                                                    {preset.chain.length} LANGKAH
                                                </span>
                                                <span className="text-[8px] bg-zinc-800 text-gray-400 px-1 py-0.2 rounded uppercase">
                                                    {preset.category}
                                                </span>
                                            </div>
                                            <button 
                                                className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 group-hover:bg-[#ff0033] text-gray-300 group-hover:text-black transition-all"
                                            >
                                                Muat
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                                            {preset.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ----------------- TAB 3: DORKING CONFIG ----------------- */}
                {activeTab === 'dork_config' && (
                    <div className="space-y-2.5">
                        <div className="bg-purple-950/30 border border-purple-500/30 rounded p-2 text-purple-200 text-[10px] flex items-center gap-2">
                            <SlidersHorizontal size={13} className="text-purple-400 shrink-0" />
                            <span>Konfigurasi parameter saringan Google/DuckDuckGo Dorking untuk langkah carian berantai.</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-left">
                            <div>
                                <label className="text-[8.5px] text-gray-300 block mb-0.5">Target Site/Domain (site:)</label>
                                <input 
                                    type="text" 
                                    placeholder="cth: gov.my, pdrm.gov.my" 
                                    className="w-full bg-black border border-gray-700 focus:border-purple-400 text-white text-xs p-1.5 rounded outline-none font-mono" 
                                    value={dorkConfig.targetSite} 
                                    onChange={e => setDorkConfig({...dorkConfig, targetSite: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="text-[8.5px] text-gray-300 block mb-0.5">Jenis Fail (ext/filetype)</label>
                                <input 
                                    type="text" 
                                    placeholder="cth: pdf, docx, xlsx, sql" 
                                    className="w-full bg-black border border-gray-700 focus:border-purple-400 text-white text-xs p-1.5 rounded outline-none font-mono" 
                                    value={dorkConfig.fileType} 
                                    onChange={e => setDorkConfig({...dorkConfig, fileType: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="text-[8.5px] text-gray-300 block mb-0.5">Frasa Tepat ("Exact Match")</label>
                                <input 
                                    type="text" 
                                    placeholder="cth: sulit, confidential" 
                                    className="w-full bg-black border border-gray-700 focus:border-purple-400 text-white text-xs p-1.5 rounded outline-none font-mono" 
                                    value={dorkConfig.exactMatch} 
                                    onChange={e => setDorkConfig({...dorkConfig, exactMatch: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="text-[8.5px] text-gray-300 block mb-0.5">Dlm URL (inurl:)</label>
                                <input 
                                    type="text" 
                                    placeholder="cth: admin, portal, login" 
                                    className="w-full bg-black border border-gray-700 focus:border-purple-400 text-white text-xs p-1.5 rounded outline-none font-mono" 
                                    value={dorkConfig.inUrl} 
                                    onChange={e => setDorkConfig({...dorkConfig, inUrl: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="text-[8.5px] text-gray-300 block mb-0.5">Dlm Tajuk (intitle:)</label>
                                <input 
                                    type="text" 
                                    placeholder="cth: index of, portal" 
                                    className="w-full bg-black border border-gray-700 focus:border-purple-400 text-white text-xs p-1.5 rounded outline-none font-mono" 
                                    value={dorkConfig.inTitle} 
                                    onChange={e => setDorkConfig({...dorkConfig, inTitle: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="text-[8.5px] text-gray-300 block mb-0.5">Kecualikan Kata Kunci (-)</label>
                                <input 
                                    type="text" 
                                    placeholder="cth: spam, fake" 
                                    className="w-full bg-black border border-gray-700 focus:border-purple-400 text-white text-xs p-1.5 rounded outline-none font-mono" 
                                    value={dorkConfig.exclude} 
                                    onChange={e => setDorkConfig({...dorkConfig, exclude: e.target.value})} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* CURRENT CHAIN BUILDER & EXECUTION PIPELINE */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <label className="text-[9px] uppercase font-bold text-gray-300 tracking-wider flex items-center gap-1.5">
                            <Zap size={11} className="text-[#ff0033]" />
                            <span>Rangkaian Transform Semasa ({chain.length})</span>
                        </label>
                        {chain.length > 0 && (
                            <button
                                onClick={clearChain}
                                className="text-[8.5px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer hover:underline"
                            >
                                <RotateCcw size={10} /> Kosongkan
                            </button>
                        )}
                    </div>

                    {/* Chain Steps List */}
                    <div className="bg-black/80 border border-white/10 rounded p-1.5 space-y-1 min-h-[60px] max-h-[150px] overflow-y-auto custom-scrollbar">
                        {chain.length === 0 ? (
                            <div className="text-[9px] text-gray-500 italic p-3 text-center">
                                Tiada langkah dalam rangkaian. Pilih mana-mana transform daripada katalog atau muatkan templat siap.
                            </div>
                        ) : (
                            chain.map((stepId, index) => {
                                const transformInfo = AVAILABLE_TRANSFORMS.find(t => t.id === stepId);
                                return (
                                    <div 
                                        key={`${stepId}_${index}`} 
                                        className="flex items-center justify-between text-[10px] bg-zinc-950/80 hover:bg-zinc-900 px-2 py-1 rounded border-l-2 border-[#ff0033] border-t border-r border-b border-white/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[9px] text-[#ff0033] font-bold shrink-0">
                                                {index + 1}.
                                            </span>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {getCategoryIcon(transformInfo?.type || 'any')}
                                                <span className="font-bold text-gray-200 truncate">
                                                    {transformInfo?.label || stepId}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 shrink-0">
                                            <button 
                                                onClick={() => moveStep(index, 'up')}
                                                disabled={index === 0}
                                                className="p-0.5 hover:text-cyan-400 disabled:opacity-20 text-gray-400 transition-colors"
                                                title="Alih ke Atas"
                                            >
                                                <ArrowUp size={10} />
                                            </button>
                                            <button 
                                                onClick={() => moveStep(index, 'down')}
                                                disabled={index === chain.length - 1}
                                                className="p-0.5 hover:text-cyan-400 disabled:opacity-20 text-gray-400 transition-colors"
                                                title="Alih ke Bawah"
                                            >
                                                <ArrowDown size={10} />
                                            </button>
                                            <button 
                                                onClick={() => removeStep(index)}
                                                className="p-0.5 hover:text-red-400 text-gray-400 transition-colors ml-1"
                                                title="Buang Langkah Ini"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>

            {/* WINDOW FOOTER & EXECUTE BUTTON (ALWAYS PINNED AND VISIBLE) */}
            <div className="p-2.5 px-3 bg-[#08080c]/95 border-t border-white/10 flex items-center justify-between gap-2 shrink-0 z-20">
                <div className="flex items-center gap-1 text-[9px] text-gray-400 min-w-0">
                    <Info size={11} className="text-cyan-400 shrink-0" />
                    <span className="truncate hidden sm:inline">
                        Sintesis risikan terus ke Panel Dossier kanvas
                    </span>
                    <span className="truncate sm:hidden">
                        Sintesis ke Dossier
                    </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                    >
                        Tutup
                    </button>
                    <button 
                        type="button"
                        onClick={handleExecute}
                        disabled={!selectedNode || chain.length === 0 || isExecuting}
                        className="bg-[#ff0033] hover:bg-[#d9002c] text-black font-black text-[10.5px] px-4 py-1.5 rounded uppercase tracking-wider transition-all disabled:opacity-40 disabled:hover:bg-[#ff0033] flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,0,51,0.4)] hover:shadow-[0_0_20px_rgba(255,0,51,0.6)] active:scale-95"
                    >
                        <Play size={12} className={isExecuting ? 'animate-spin' : ''} />
                        <span>{isExecuting ? 'Menjalankan...' : `Jalankan (${chain.length})`}</span>
                    </button>
                </div>
            </div>

            {/* RESIZE HANDLERS (RIGHT, BOTTOM & BOTTOM-RIGHT CORNER) */}
            {!isMaximized && (
                <>
                    {/* Right edge */}
                    <div 
                        onMouseDown={(e) => startResizing('right', e.clientX, e.clientY)}
                        onTouchStart={(e) => {
                            if (e.touches.length === 1) startResizing('right', e.touches[0].clientX, e.touches[0].clientY);
                        }}
                        className="absolute right-0 top-10 bottom-6 w-2 cursor-ew-resize hover:bg-[#ff0033]/40 z-30 transition-colors"
                        title="Tarik untuk ubah lebar"
                    />

                    {/* Bottom edge */}
                    <div 
                        onMouseDown={(e) => startResizing('bottom', e.clientX, e.clientY)}
                        onTouchStart={(e) => {
                            if (e.touches.length === 1) startResizing('bottom', e.touches[0].clientX, e.touches[0].clientY);
                        }}
                        className="absolute bottom-0 left-6 right-6 h-2 cursor-ns-resize hover:bg-[#ff0033]/40 z-30 transition-colors"
                        title="Tarik untuk ubah tinggi"
                    />

                    {/* Bottom-Right Corner handle */}
                    <div 
                        onMouseDown={(e) => startResizing('corner', e.clientX, e.clientY)}
                        onTouchStart={(e) => {
                            if (e.touches.length === 1) startResizing('corner', e.touches[0].clientX, e.touches[0].clientY);
                        }}
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-40 flex items-center justify-center group"
                        title="Tarik untuk ubah saiz tetingkap (Resize)"
                    >
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-gray-500 group-hover:text-[#ff0033] transition-colors fill-current">
                            <circle cx="8.5" cy="1.5" r="1" />
                            <circle cx="8.5" cy="5.5" r="1" />
                            <circle cx="4.5" cy="5.5" r="1" />
                            <circle cx="8.5" cy="9.5" r="1" />
                            <circle cx="4.5" cy="9.5" r="1" />
                            <circle cx="0.5" cy="9.5" r="1" />
                        </svg>
                    </div>
                </>
            )}
        </div>
        </>
    );
};

export default TransformManager;
