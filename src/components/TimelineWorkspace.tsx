import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useGlobalStore } from '../store/GlobalStore';
import { Node } from '../types';
import { 
    Clock, ChevronLeft, ChevronRight, Image as ImageIcon, MessageCircle, FileText, X, 
    ExternalLink, Search, Filter, ShieldAlert, MapPin, Database, Copy, Check, Zap, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NodeBrandIcon, resolveNodeBrandOrType } from '../utils/nodeIconResolver';

interface TimelineWorkspaceProps {
    nodes: Node[];
    links?: any[];
    selectedNodeIds?: string[];
    onClose: () => void;
    onOpenGeoRecon?: (node: Node) => void;
}

interface TimelineEvent {
    node: Node;
    date: Date;
    timestamp: number;
}

const TimelineWorkspace: React.FC<TimelineWorkspaceProps> = ({ nodes, links, selectedNodeIds, onClose, onOpenGeoRecon }) => {
    const { state, dispatch } = useGlobalStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
    const [copiedJson, setCopiedJson] = useState<boolean>(false);
    
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [zoom, setZoom] = useState<number>(1);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Naive date parser to extract dates from node details or labels
    const extractDate = (text: string): Date | null => {
        if (!text) return null;
        
        // Match ISO Datetimes like 2024-05-12T14:30:00Z
        const isoMatch = text.match(/\b(20\d{2}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d(?::[0-5]\d)?(?:Z|[+-]\d{2}:\d{2})?)\b/);
        if (isoMatch) return new Date(isoMatch[1]);

        // Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
        const ymdMatch = text.match(/\b(19|20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
        if (ymdMatch) return new Date(ymdMatch[0].replace(/\./g, '-'));

        // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        const dmyMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](19|20\d{2})\b/);
        if (dmyMatch) {
            const parts = dmyMatch[0].split(/[-/.]/);
            const d = parts[0];
            const m = parts[1];
            const y = parts[2];
            return new Date(`${y}-${m}-${d}`);
        }

        // Try to match "Jan 1, 2024", "12 Mei 2024", etc.
        const monthRegex = '(?:Jan|Feb|Mar|Mac|Apr|May|Mei|Jun|Jul|Aug|Ogos|Sep|Sept|Oct|Okt|Nov|Dec|Dis)';
        const stringDateMatch = text.match(new RegExp(`\\b${monthRegex}[a-z]* \\d{1,2},? \\d{4}\\b`, 'i'));
        if (stringDateMatch) return new Date(stringDateMatch[0].replace(/Mei/i, 'May').replace(/Mac/i, 'Mar').replace(/Ogos/i, 'Aug').replace(/Okt/i, 'Oct').replace(/Dis/i, 'Dec'));

        const invertedStringDateMatch = text.match(new RegExp(`\\b\\d{1,2} ${monthRegex}[a-z]* \\d{4}\\b`, 'i'));
        if (invertedStringDateMatch) return new Date(invertedStringDateMatch[0].replace(/Mei/i, 'May').replace(/Mac/i, 'Mar').replace(/Ogos/i, 'Aug').replace(/Okt/i, 'Oct').replace(/Dis/i, 'Dec'));

        return null;
    };

    const events = useMemo(() => {
        const extracted: TimelineEvent[] = [];
        
        let relevantNodes = nodes;
        if (selectedNodeIds && selectedNodeIds.length > 0) {
            const connectedIds = new Set<string>();
            selectedNodeIds.forEach(id => connectedIds.add(id));
            
            if (links) {
                links.forEach(l => {
                    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                    
                    if (selectedNodeIds.includes(sourceId)) connectedIds.add(targetId);
                    if (selectedNodeIds.includes(targetId)) connectedIds.add(sourceId);
                });
            }
            relevantNodes = nodes.filter(n => connectedIds.has(n.id));
        }

        relevantNodes.forEach(node => {
            const textToParse = `${node.label} ${node.details || ''} ${node.timestamp || ''} ${node.eventDate || ''}`;
            let date = extractDate(textToParse);

            if (!date && (node.timestamp || node.eventDate)) {
                const raw = Date.parse(node.timestamp || node.eventDate || '');
                if (!isNaN(raw)) date = new Date(raw);
            }
            
            // Fallback for demo timeline if node has no date
            if (!date) {
                date = new Date(Date.now() - (extracted.length * 86400000 * 2));
            }

            extracted.push({
                node,
                date,
                timestamp: date.getTime()
            });
        });

        // Sort chronologically
        return extracted.sort((a, b) => a.timestamp - b.timestamp);
    }, [nodes, links, selectedNodeIds]);

    // Deep multi-field search and category filtering
    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            const n = e.node;

            // Category filter match
            if (activeCategoryFilter === 'HIGH_RISK') {
                if (!n.isConflictFlagged && (!n.riskScore || n.riskScore < 60)) return false;
            } else if (activeCategoryFilter === 'GEOINT') {
                const hasGeo = n.lat !== undefined || n.lng !== undefined || n.type?.includes('location') || n.type?.includes('geo') || (n.details && /latitude|longitude|coords|lat|lng/i.test(n.details));
                if (!hasGeo) return false;
            } else if (activeCategoryFilter === 'MEDIA') {
                if (!n.imageUrls?.length && !n.type?.includes('image') && !n.type?.includes('photo')) return false;
            } else if (activeCategoryFilter === 'SOCIAL') {
                const isSocial = n.type?.includes('social') || n.type?.includes('user') || n.type?.includes('profile') || n.type?.includes('comment');
                if (!isSocial) return false;
            }

            // Keyword Search query match across ALL node metadata
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();

            // Search label & details
            if (n.label.toLowerCase().includes(q)) return true;
            if (n.details && n.details.toLowerCase().includes(q)) return true;
            if (n.id.toLowerCase().includes(q)) return true;
            if (n.type && n.type.toLowerCase().includes(q)) return true;
            if (n.group && n.group.toLowerCase().includes(q)) return true;
            if (n.category && n.category.toLowerCase().includes(q)) return true;

            // Search tags
            if (n.tags && n.tags.some(t => t.toLowerCase().includes(q))) return true;

            // Search sources
            if (n.sources && n.sources.some(s => (s.sourceName && s.sourceName.toLowerCase().includes(q)) || (s.details && s.details.toLowerCase().includes(q)) || (s.url && s.url.toLowerCase().includes(q)))) return true;

            // Search metadata object
            if (n.metadata) {
                const metaStr = JSON.stringify(n.metadata).toLowerCase();
                if (metaStr.includes(q)) return true;
            }

            return false;
        });
    }, [events, searchQuery, activeCategoryFilter]);

    const handleScrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const handleScrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    const highlightText = (text: string, query: string) => {
        if (!text) return null;
        if (!query || !query.trim()) return <>{text}</>;
        const lowerQ = query.toLowerCase();
        const lowerT = text.toLowerCase();
        if (!lowerT.includes(lowerQ)) return <>{text}</>;
        
        const parts = [];
        let startIndex = 0;
        let p = lowerT.indexOf(lowerQ, startIndex);
        let i = 0;
        while (p !== -1) {
            parts.push(<span key={i++}>{text.substring(startIndex, p)}</span>);
            parts.push(
                <span key={i++} className="bg-amber-500/40 text-amber-200 font-bold border-b-2 border-amber-400 animate-[pulse_2s_infinite] px-0.5 mx-px rounded-sm shadow-[0_0_10px_rgba(245,158,11,0.6)]">
                    {text.substring(p, p + query.length)}
                </span>
            );
            startIndex = p + query.length;
            p = lowerT.indexOf(lowerQ, startIndex);
        }
        parts.push(<span key={i++}>{text.substring(startIndex)}</span>);
        return <>{parts}</>;
    };

    const renderDetails = (text?: string | null) => {
        if (!text) return null;
        
        const lines = text.split('\n');
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const seenProfileUrl = new Set<string>();
        const seenImageUrl = new Set<string>();

        const elements = [];
        let i = 0;
        
        while (i < lines.length) {
            let line = lines[i];
            
            if (line.startsWith('PROFILE_URL:')) {
                if (seenProfileUrl.has(line)) { i++; continue; }
                seenProfileUrl.add(line);
            }
            if (line.startsWith('IMAGE_URL:')) {
                if (seenImageUrl.has(line)) { i++; continue; }
                seenImageUrl.add(line);
            }
            
            if (line.startsWith('Original Time:')) {
                const timeText = line.replace('Original Time:', '').trim();
                let commentUrl = '';
                
                if (i + 1 < lines.length && lines[i+1].startsWith('COMMENT_URL:')) {
                    commentUrl = lines[i+1].replace('COMMENT_URL:', '').trim();
                    i++; 
                }
                
                elements.push(
                    <div key={`idx-${i}`} className="mb-1">
                        <span className="text-gray-500 font-bold">Original Time: </span>
                        {commentUrl ? (
                            <a 
                                href={commentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline cursor-pointer"
                                onClick={e => e.stopPropagation()}
                            >
                                {highlightText(timeText, searchQuery)} <ExternalLink size={10} className="inline-block ml-1" />
                            </a>
                        ) : (
                            <span className="text-gray-300 font-bold">{highlightText(timeText, searchQuery)}</span>
                        )}
                    </div>
                );
                i++;
                continue;
            }
            
            if (line.startsWith('COMMENT_URL:')) {
                i++; continue; 
            }

            if (!line.trim()) {
                elements.push(<br key={`br-${i}`} />);
                i++;
                continue;
            }

            const parts = line.split(urlRegex);
            const isComment = line.toLowerCase().includes('comment') || line.toLowerCase().startsWith('>');
            const isSnippet = line.startsWith('Snippet:');
            
            const keyMatch = line.match(/^([\w\s_-]+):/);
            let key = '';
            if (keyMatch && keyMatch[1].length < 40) { 
                key = keyMatch[0];
            }

            elements.push(
                <div key={`idx-${i}`} className={`mb-1 ${isComment || isSnippet ? 'pl-3 border-l-2 border-amber-500/50 text-gray-300 bg-amber-500/5 py-1 rounded-r mt-2' : ''}`}>
                    {parts.map((part, j) => {
                        if (part.match(urlRegex)) {
                            return (
                                <a 
                                    key={j} 
                                    href={part} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-amber-400 hover:underline break-all"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {highlightText(part, searchQuery)}
                                </a>
                            );
                        }
                        
                        if (key && j === 0 && part.startsWith(key)) {
                            const rest = part.substring(key.length);
                            return (
                                <span key={j}>
                                    <strong className="text-white font-bold">{highlightText(key, searchQuery)}</strong>
                                    {highlightText(rest, searchQuery)}
                                </span>
                            );
                        }

                        return <span key={j}>{highlightText(part, searchQuery)}</span>;
                    })}
                </div>
            );
            i++;
        }

        return <>{elements}</>;
    };

    const selectedEvent = filteredEvents.find(e => e.node.id === selectedEventId);

    // Compute degree connections count for selected node
    const selectedNodeLinksCount = useMemo(() => {
        if (!selectedEvent || !links) return 0;
        const targetId = selectedEvent.node.id;
        return links.filter(l => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            return s === targetId || t === targetId;
        }).length;
    }, [selectedEvent, links]);

    const handleCopyJsonPayload = () => {
        if (!selectedEvent) return;
        navigator.clipboard.writeText(JSON.stringify(selectedEvent.node, null, 2));
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
    };

    return (
        <div className="absolute inset-0 bg-[#000000] z-50 flex flex-col font-mono overflow-hidden select-none">
            {/* Header HUD */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border-b border-[#00ccff]/30 bg-gradient-to-r from-[#00ccff]/15 via-black to-transparent gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="bg-[#00ccff]/20 hover:bg-[#00ccff] text-[#00ccff] hover:text-black p-2 rounded transition-colors cursor-pointer"
                        title="Tutup Timeline Workspace"
                    >
                        <X size={20} />
                    </button>
                    <div>
                        <h2 className="text-[#00ccff] font-bold text-xl uppercase tracking-widest flex items-center gap-2">
                            <Clock className="text-[#00ccff]" /> WORKSPACE GARIS MASA KRONOLOGI
                        </h2>
                        <div className="text-[#00ccff]/70 text-xs flex items-center gap-3 mt-0.5">
                            <span>HUD Analisis Forensik Masa</span>
                            <span className="text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-[10px]">
                                {filteredEvents.length} / {events.length} NOD DENGAN METADATA MASA
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* Search & Zoom Controls */}
                <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                    {/* Zoom Bar */}
                    <div className="flex items-center gap-1 border border-[#00ccff]/40 rounded p-1 bg-black/60">
                        <button onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.4))} className="text-[#00ccff] hover:bg-[#00ccff]/20 px-2 font-bold cursor-pointer">-</button>
                        <span className="text-[#00ccff] text-xs w-10 text-center font-bold">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(prev => Math.min(prev + 0.2, 2.5))} className="text-[#00ccff] hover:bg-[#00ccff]/20 px-2 font-bold cursor-pointer">+</button>
                    </div>

                    {/* Deep Keyword Search Input */}
                    <div className="relative flex-1 md:w-80">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00ccff]/60" />
                        <input
                            type="text"
                            placeholder="CARI KEYWORD, IP, AKAUN, HASHTAG..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-black/80 border border-[#00ccff]/50 text-[#00ccff] pl-9 pr-3 py-1.5 outline-none focus:border-[#00ccff] focus:bg-[#00ccff]/20 rounded placeholder:text-[#00ccff]/40 text-xs font-mono transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-white">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Category Filter Chips Bar */}
            <div className="flex items-center gap-2 px-4 py-2 bg-black/80 border-b border-[#00ccff]/20 overflow-x-auto text-xs">
                <span className="text-[#00ccff]/60 font-bold uppercase text-[10px] flex items-center gap-1 mr-2">
                    <Filter size={12} /> TAPISAN:
                </span>
                {[
                    { id: 'ALL', label: 'SEMUA NOD' },
                    { id: 'HIGH_RISK', label: 'ANOMALI & RISIKO HIGH', icon: ShieldAlert },
                    { id: 'GEOINT', label: 'LOKASI / GEOINT', icon: MapPin },
                    { id: 'MEDIA', label: 'IMEJ & MEDIA', icon: ImageIcon },
                    { id: 'SOCIAL', label: 'MEDIA SOSIAL & AKAUN', icon: MessageCircle },
                ].map((chip) => {
                    const IconComp = chip.icon;
                    return (
                        <button
                            key={chip.id}
                            onClick={() => setActiveCategoryFilter(chip.id)}
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                activeCategoryFilter === chip.id
                                    ? 'bg-[#00ccff] text-black shadow-[0_0_12px_#00ccff] font-black'
                                    : 'bg-black/60 border border-[#00ccff]/30 text-[#00ccff] hover:bg-[#00ccff]/20'
                            }`}
                        >
                            {IconComp && <IconComp size={11} />}
                            {chip.label}
                        </button>
                    );
                })}
            </div>

            {/* Main Stage */}
            <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
                
                {/* Background Grid for HUD look */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                     style={{ backgroundImage: 'linear-gradient(#00ccff 1px, transparent 1px), linear-gradient(90deg, #00ccff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                ></div>

                {/* Timeline Axis - Centered with full vertical clearance */}
                <div className="flex-1 relative w-full h-full min-h-[420px] flex items-center">
                    {/* The Center Axis Line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-[#00ccff]/40 top-1/2 -translate-y-1/2 shadow-[0_0_12px_rgba(0,204,255,0.6)]"></div>
                    
                    <button onClick={handleScrollLeft} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/90 border-2 border-[#00ccff] text-[#00ccff] p-2.5 hover:bg-[#00ccff] hover:text-black transition-all rounded-full shadow-[0_0_20px_rgba(0,204,255,0.4)] cursor-pointer">
                        <ChevronLeft size={20} />
                    </button>
                    
                    <button onClick={handleScrollRight} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/90 border-2 border-[#00ccff] text-[#00ccff] p-2.5 hover:bg-[#00ccff] hover:text-black transition-all rounded-full shadow-[0_0_20px_rgba(0,204,255,0.4)] cursor-pointer">
                        <ChevronRight size={20} />
                    </button>

                    {/* Scrollable Container with ample vertical clearance to eliminate clipping */}
                    <div 
                        ref={scrollContainerRef}
                        className="absolute inset-x-14 inset-y-0 overflow-x-auto overflow-y-auto custom-scrollbar flex items-center px-10 py-6"
                    >
                        <div className="flex items-center gap-14 transition-transform duration-300 ease-out min-w-max py-4"
                             style={{ transform: `scale(${zoom})`, transformOrigin: 'left center' }}
                        >
                            {filteredEvents.length === 0 ? (
                                <div className="text-[#00ccff]/60 w-[800px] text-center font-bold text-sm bg-black/80 border border-[#00ccff]/30 p-8 rounded shadow-xl">
                                    TIADA KRONOLOGI REKOD DIJUMPAI MENGIKUT KRITERIA CARIAN KEYWORD & TAPISAN
                                </div>
                            ) : (
                                filteredEvents.map((evt, idx) => {
                                    const isSelected = selectedEventId === evt.node.id;
                                    const isTop = idx % 2 === 0;

                                    return (
                                        <div 
                                            key={evt.node.id} 
                                            className="relative flex flex-col items-center min-w-[280px] w-[280px] shrink-0 h-[420px]"
                                        >
                                            {/* Upper Block: Top Card + Connector Line */}
                                            <div className="h-[190px] w-full flex flex-col items-center justify-end relative">
                                                {isTop && (
                                                    <>
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className={`w-full p-3 border ${isSelected ? 'border-[#00ccff] shadow-[0_0_25px_rgba(0,204,255,0.5)] bg-[#00ccff]/25' : 'border-[#00ccff]/40 bg-black/90 hover:border-[#00ccff]'} cursor-pointer transition-all backdrop-blur-md rounded z-10`}
                                                            onClick={() => setSelectedEventId(evt.node.id)}
                                                        >
                                                            <div className="text-[#00ccff] text-[11px] mb-1 font-bold tracking-wider flex items-center justify-between">
                                                                <span>{evt.date.toLocaleDateString()} {evt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                {evt.node.isConflictFlagged && (
                                                                    <span className="text-[9px] bg-red-600/90 text-white font-black px-1.5 py-0.2 rounded uppercase animate-pulse">
                                                                        ANOMALI
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-white text-xs font-semibold truncate flex items-center gap-2" title={evt.node.label}>
                                                                <NodeBrandIcon node={evt.node} size={15} />
                                                                {highlightText(evt.node.label, searchQuery)}
                                                            </div>
                                                            {evt.node.details && (
                                                                <div className="text-gray-400 text-[10px] line-clamp-2 mt-1.5 font-mono leading-tight bg-white/5 p-1.5 rounded border border-white/5">
                                                                    {highlightText(evt.node.details.replace(/[*#_`]/g, ''), searchQuery)}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span 
                                                                    className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border shrink-0"
                                                                    style={{
                                                                        color: resolveNodeBrandOrType(evt.node).brandColor,
                                                                        borderColor: `${resolveNodeBrandOrType(evt.node).brandColor}50`,
                                                                        backgroundColor: `${resolveNodeBrandOrType(evt.node).brandColor}15`
                                                                    }}
                                                                >
                                                                    {resolveNodeBrandOrType(evt.node).brandName}
                                                                </span>
                                                                <span className="text-gray-400 text-[10px] truncate">
                                                                    {highlightText(evt.node.type, searchQuery)}
                                                                </span>
                                                            </div>
                                                        </motion.div>
                                                        <div className={`w-0.5 h-6 bg-gradient-to-b from-[#00ccff]/60 to-[#00ccff] ${isSelected ? 'w-1 bg-cyan-400 shadow-[0_0_10px_#00ccff]' : ''}`}></div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Center Axis Marker Dot */}
                                            <div className="h-[40px] flex items-center justify-center relative z-20">
                                                <div 
                                                    className={`w-4 h-4 rounded-full border-2 ${isSelected ? 'border-white bg-[#00ccff] scale-150 shadow-[0_0_20px_#00ccff]' : 'border-[#00ccff] bg-black hover:bg-[#00ccff]/50'} transition-all cursor-pointer`}
                                                    onClick={() => setSelectedEventId(evt.node.id)}
                                                />
                                            </div>

                                            {/* Lower Block: Bottom Card + Connector Line */}
                                            <div className="h-[190px] w-full flex flex-col items-center justify-start relative">
                                                {!isTop && (
                                                    <>
                                                        <div className={`w-0.5 h-6 bg-gradient-to-b from-[#00ccff] to-[#00ccff]/60 ${isSelected ? 'w-1 bg-cyan-400 shadow-[0_0_10px_#00ccff]' : ''}`}></div>
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className={`w-full p-3 border ${isSelected ? 'border-[#00ccff] shadow-[0_0_25px_rgba(0,204,255,0.5)] bg-[#00ccff]/25' : 'border-[#00ccff]/40 bg-black/90 hover:border-[#00ccff]'} cursor-pointer transition-all backdrop-blur-md rounded z-10`}
                                                            onClick={() => setSelectedEventId(evt.node.id)}
                                                        >
                                                            <div className="text-[#00ccff] text-[11px] mb-1 font-bold tracking-wider flex items-center justify-between">
                                                                <span>{evt.date.toLocaleDateString()} {evt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                {evt.node.isConflictFlagged && (
                                                                    <span className="text-[9px] bg-red-600/90 text-white font-black px-1.5 py-0.2 rounded uppercase animate-pulse">
                                                                        ANOMALI
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-white text-xs font-semibold truncate flex items-center gap-2" title={evt.node.label}>
                                                                <NodeBrandIcon node={evt.node} size={15} />
                                                                {highlightText(evt.node.label, searchQuery)}
                                                            </div>
                                                            {evt.node.details && (
                                                                <div className="text-gray-400 text-[10px] line-clamp-2 mt-1.5 font-mono leading-tight bg-white/5 p-1.5 rounded border border-white/5">
                                                                    {highlightText(evt.node.details.replace(/[*#_`]/g, ''), searchQuery)}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span 
                                                                    className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border shrink-0"
                                                                    style={{
                                                                        color: resolveNodeBrandOrType(evt.node).brandColor,
                                                                        borderColor: `${resolveNodeBrandOrType(evt.node).brandColor}50`,
                                                                        backgroundColor: `${resolveNodeBrandOrType(evt.node).brandColor}15`
                                                                    }}
                                                                >
                                                                    {resolveNodeBrandOrType(evt.node).brandName}
                                                                </span>
                                                                <span className="text-gray-400 text-[10px] truncate">
                                                                    {highlightText(evt.node.type, searchQuery)}
                                                                </span>
                                                            </div>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Detailed HUD Inspector Drawer for Selected Event */}
                <AnimatePresence>
                    {selectedEvent && (
                        <motion.div 
                            initial={{ opacity: 0, x: 80 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 80 }}
                            className="absolute top-3 right-3 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] max-w-[420px] bg-black/95 border-2 border-[#00ccff] shadow-[0_0_40px_rgba(0,204,255,0.4)] backdrop-blur-2xl p-4 sm:p-5 z-40 flex flex-col max-h-[calc(100vh-6rem)] rounded"
                        >
                            <div className="flex justify-between items-start border-b border-[#00ccff]/30 pb-3 mb-4">
                                <div>
                                    <div className="text-[#00ccff] text-[10px] font-bold tracking-[0.2em] mb-1 flex items-center gap-1">
                                        <Cpu size={12} /> HUD INSPEKTOR METADATA NOD
                                    </div>
                                    <div className="text-white font-bold text-base flex items-center gap-2">
                                        <NodeBrandIcon node={selectedEvent.node} size={18} />
                                        <span>{highlightText(selectedEvent.node.label, searchQuery)}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedEventId(null)} className="text-[#00ccff]/60 hover:text-[#00ccff] p-1 cursor-pointer">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-4">
                                
                                {/* Key Metrics Grid */}
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    <div className="border border-[#00ccff]/30 p-2.5 bg-[#00ccff]/5 rounded">
                                        <div className="text-[#00ccff]/60 text-[9px] uppercase font-bold">JENIS ENTITI</div>
                                        <div className="text-white font-bold truncate mt-0.5">{highlightText(selectedEvent.node.type, searchQuery)}</div>
                                    </div>
                                    <div className="border border-[#00ccff]/30 p-2.5 bg-[#00ccff]/5 rounded">
                                        <div className="text-[#00ccff]/60 text-[9px] uppercase font-bold">KUMPULAN / KATALOG</div>
                                        <div className="text-amber-300 font-bold truncate mt-0.5">{selectedEvent.node.group || selectedEvent.node.category || 'AM'}</div>
                                    </div>
                                    <div className="border border-[#00ccff]/30 p-2.5 bg-[#00ccff]/5 rounded">
                                        <div className="text-[#00ccff]/60 text-[9px] uppercase font-bold">ID NOD</div>
                                        <div className="text-gray-300 font-mono text-[10px] truncate mt-0.5" title={selectedEvent.node.id}>
                                            {highlightText(selectedEvent.node.id, searchQuery)}
                                        </div>
                                    </div>
                                    <div className="border border-[#00ccff]/30 p-2.5 bg-[#00ccff]/5 rounded">
                                        <div className="text-[#00ccff]/60 text-[9px] uppercase font-bold">SAMBUNGAN PAUTAN</div>
                                        <div className="text-cyan-300 font-bold mt-0.5">{selectedNodeLinksCount} Pautan Berhubung</div>
                                    </div>
                                </div>

                                {/* Timestamp Matrix */}
                                <div className="border border-[#00ccff]/40 p-3 bg-black/60 rounded flex flex-col gap-1 text-xs">
                                    <div className="text-[#00ccff] font-bold text-[10px] uppercase flex items-center gap-1.5">
                                        <Clock size={12} /> CAP MASA REKOD KRONOLOGI
                                    </div>
                                    <div className="text-white font-bold">
                                        {selectedEvent.date.toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                    <div className="text-cyan-400 text-[11px] font-mono">
                                        Waktu: {selectedEvent.date.toLocaleTimeString()} (UTC ISO: {selectedEvent.date.toISOString()})
                                    </div>
                                </div>

                                {/* Images gallery if available */}
                                {selectedEvent.node.imageUrls && selectedEvent.node.imageUrls.length > 0 && (
                                     <div className="border border-[#00ccff]/30 p-2 bg-black/50 rounded">
                                        <div className="text-[#00ccff]/70 text-[10px] font-bold uppercase mb-2">GALERI IMEJ TANGKAPAN BUKTI</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {selectedEvent.node.imageUrls.map((url, i) => (
                                                <div key={i} className="border border-[#00ccff]/40 p-1 relative overflow-hidden rounded group">
                                                    <img src={url} alt={`Asset ${i}`} className="w-full h-24 object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            ))}
                                        </div>
                                     </div>
                                )}

                                {/* Details & Text Content */}
                                <div className="border border-[#00ccff]/20 p-3 bg-black/60 rounded text-xs leading-relaxed whitespace-pre-wrap font-mono text-gray-300">
                                    <div className="text-[#00ccff]/70 text-[10px] font-bold uppercase mb-1">DOKUMEN & KANDUNGAN PELEPASAN:</div>
                                    {renderDetails(selectedEvent.node.details)}
                                </div>

                                {/* Metadata Objects Inspector */}
                                {selectedEvent.node.metadata && (
                                    <div className="border border-cyan-500/40 p-3 bg-black/80 rounded">
                                        <div className="text-cyan-400 font-bold text-[10px] uppercase mb-2 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5"><Database size={12} /> JADUAL INSPEKTOR METADATA KHAS:</span>
                                        </div>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar text-[11px] font-mono">
                                            {Object.entries(selectedEvent.node.metadata).map(([k, v]) => (
                                                <div key={k} className="flex items-start justify-between border-b border-cyan-900/40 pb-1">
                                                    <span className="text-cyan-300 font-bold">{highlightText(k, searchQuery)}:</span>
                                                    <span className="text-gray-300 font-mono text-right max-w-[200px] break-all">
                                                        {highlightText(typeof v === 'object' ? JSON.stringify(v) : String(v), searchQuery)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 pt-2">
                                    <button 
                                        onClick={handleCopyJsonPayload}
                                        className="w-full bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 font-bold text-xs uppercase tracking-wider py-2 rounded transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {copiedJson ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                        {copiedJson ? 'METADATA JSON DISALIN!' : 'SALIN DATA METADATA JSON'}
                                    </button>

                                    {onOpenGeoRecon && (
                                        <button 
                                            onClick={() => onOpenGeoRecon(selectedEvent.node)}
                                            className="w-full bg-gradient-to-r from-emerald-950 to-black hover:from-emerald-900 hover:to-emerald-950 border border-emerald-500/60 text-emerald-400 font-bold text-xs uppercase tracking-wider py-2 rounded transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <MapPin size={14} />
                                            LANCARKAN IMBASAN LOKASI GEOINT
                                        </button>
                                    )}
                                </div>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TimelineWorkspace;

