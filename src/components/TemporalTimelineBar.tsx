import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, RotateCcw, Clock, Calendar, 
  Sparkles, Filter, ChevronUp, ChevronDown, Activity, AlertTriangle, Eye,
  GitBranch, Zap, Layers, Target, CheckCircle2
} from 'lucide-react';
import { GraphData, Node, Link } from '../types';

interface TemporalTimelineBarProps {
  graphData: GraphData;
  onTimelineFilterChange: (timeRange: [number, number] | null, currentTime: number | null, activeNodeIds?: Set<string> | null) => void;
  isVisible: boolean;
  onToggleVisible: () => void;
}

export const TemporalTimelineBar: React.FC<TemporalTimelineBarProps> = ({
  graphData,
  onTimelineFilterChange,
  isVisible,
  onToggleVisible
}) => {
  // Mode selection: 'temporal' (Chronological Time) vs 'cascade' (Degree Hop Propagation 1 -> N)
  const [playMode, setPlayMode] = useState<'temporal' | 'cascade'>('temporal');

  // Extract all valid timestamps from nodes & links
  const { timeBounds, nodeTimelineMap, eventPoints } = useMemo(() => {
    let minT = Infinity;
    let maxT = -Infinity;
    const events: Array<{ id: string; label: string; timestamp: number; type: string; isAnomaly?: boolean }> = [];
    const map = new Map<string, number>();

    const processDate = (id: string, label: string, dateStr?: string, type = 'node', isAnomaly = false) => {
      if (!dateStr) return;
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) {
        if (parsed < minT) minT = parsed;
        if (parsed > maxT) maxT = parsed;
        map.set(id, parsed);
        events.push({ id, label, timestamp: parsed, type, isAnomaly });
      }
    };

    // Process Nodes
    graphData.nodes.forEach((n, idx) => {
      const dateVal = n.timestamp || n.eventDate || (n.sources && n.sources[0]?.timestamp);
      if (dateVal) {
        processDate(n.id, n.label, dateVal, n.type || 'node', n.isConflictFlagged || false);
      } else {
        // Fallback offset for demonstration timeline if node has no date
        const fallbackTime = Date.now() - ((graphData.nodes.length - idx) * 86400000 * 3);
        if (fallbackTime < minT) minT = fallbackTime;
        if (fallbackTime > maxT) maxT = fallbackTime;
        map.set(n.id, fallbackTime);
        events.push({ id: n.id, label: n.label, timestamp: fallbackTime, type: n.type || 'node', isAnomaly: n.isConflictFlagged || false });
      }
    });

    // Process Links
    graphData.links.forEach((l) => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      const linkId = `${srcId}-${tgtId}`;
      const dateVal = l.timestamp || l.eventDate;
      if (dateVal) {
        processDate(linkId, l.label || 'link', dateVal, 'link');
      }
    });

    if (minT === Infinity || maxT === -Infinity || minT === maxT) {
      const now = Date.now();
      minT = now - (30 * 86400000); // 30 days ago
      maxT = now;
    }

    // Sort events
    events.sort((a, b) => a.timestamp - b.timestamp);

    return {
      timeBounds: { min: minT, max: maxT },
      nodeTimelineMap: map,
      eventPoints: events
    };
  }, [graphData]);

  // Propagation BFS Tree Calculation (For Cascade Mode: 1 node -> Thousands of nodes)
  const [selectedSeedNodeId, setSelectedSeedNodeId] = useState<string | null>(null);

  const { seedNode, nodeHopMap, maxHop, hopNodeCounts } = useMemo(() => {
    if (!graphData.nodes.length) {
      return { seedNode: null, nodeHopMap: new Map<string, number>(), maxHop: 0, hopNodeCounts: [] };
    }

    // Determine seed node: Selected or node with highest connected links degree or oldest node
    let seed: Node | undefined;
    if (selectedSeedNodeId) {
      seed = graphData.nodes.find(n => n.id === selectedSeedNodeId);
    }
    if (!seed) {
      // Find node with highest degree
      const degreeMap = new Map<string, number>();
      graphData.links.forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
        degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
      });
      let maxDeg = -1;
      graphData.nodes.forEach(n => {
        const deg = degreeMap.get(n.id) || 0;
        if (deg > maxDeg) {
          maxDeg = deg;
          seed = n;
        }
      });
    }
    if (!seed) seed = graphData.nodes[0];

    // Build Adjacency List
    const adj = new Map<string, string[]>();
    graphData.links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (!adj.has(s)) adj.set(s, []);
      if (!adj.has(t)) adj.set(t, []);
      adj.get(s)!.push(t);
      adj.get(t)!.push(s);
    });

    // BFS from seed
    const hopMap = new Map<string, number>();
    const queue: Array<{ id: string; hop: number }> = [{ id: seed.id, hop: 0 }];
    hopMap.set(seed.id, 0);

    let highestHop = 0;
    while (queue.length > 0) {
      const { id, hop } = queue.shift()!;
      if (hop > highestHop) highestHop = hop;

      const neighbors = adj.get(id) || [];
      for (const nbr of neighbors) {
        if (!hopMap.has(nbr)) {
          hopMap.set(nbr, hop + 1);
          queue.push({ id: nbr, hop: hop + 1 });
        }
      }
    }

    // Handle disconnected nodes (assign to highestHop + 1)
    const disconnectedHop = highestHop + 1;
    let finalMaxHop = highestHop;
    graphData.nodes.forEach(n => {
      if (!hopMap.has(n.id)) {
        hopMap.set(n.id, disconnectedHop);
        finalMaxHop = disconnectedHop;
      }
    });

    // Calculate node count at each hop
    const counts: number[] = new Array(finalMaxHop + 1).fill(0);
    hopMap.forEach((hop) => {
      if (hop <= finalMaxHop) counts[hop]++;
    });

    return {
      seedNode: seed,
      nodeHopMap: hopMap,
      maxHop: finalMaxHop,
      hopNodeCounts: counts
    };
  }, [graphData, selectedSeedNodeId]);

  // Timeline Slider & Playback States
  const [rangeMin, setRangeMin] = useState<number>(timeBounds.min);
  const [rangeMax, setRangeMax] = useState<number>(timeBounds.max);
  const [currentTime, setCurrentTime] = useState<number>(timeBounds.max);
  const [currentHop, setCurrentHop] = useState<number>(maxHop);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [filterMode, setFilterMode] = useState<'playback' | 'range'>('playback');

  // Sync initial bounds
  useEffect(() => {
    setRangeMin(timeBounds.min);
    setRangeMax(timeBounds.max);
    setCurrentTime(timeBounds.max);
    setCurrentHop(maxHop);
  }, [timeBounds.min, timeBounds.max, maxHop]);

  // Ref to hold stable onTimelineFilterChange callback
  const onFilterChangeRef = useRef(onTimelineFilterChange);
  useEffect(() => {
    onFilterChangeRef.current = onTimelineFilterChange;
  });

  // Track last emitted values to prevent redundant parent updates
  const lastEmittedRef = useRef<any>(null);

  // Playback timer interval
  useEffect(() => {
    if (isPlaying) {
      if (playMode === 'temporal') {
        const stepMs = ((timeBounds.max - timeBounds.min) / 150) * speed;
        const interval = setInterval(() => {
          setCurrentTime(prev => {
            const next = prev + stepMs;
            if (next >= rangeMax) {
              setIsPlaying(false);
              return rangeMax;
            }
            return next;
          });
        }, 80);
        return () => clearInterval(interval);
      } else {
        // Cascade Hop Mode Playback
        const interval = setInterval(() => {
          setCurrentHop(prev => {
            if (prev >= maxHop) {
              setIsPlaying(false);
              return maxHop;
            }
            return prev + 1;
          });
        }, 1000 / speed);
        return () => clearInterval(interval);
      }
    }
  }, [isPlaying, speed, timeBounds.min, timeBounds.max, rangeMax, playMode, maxHop]);

  // Active nodes computation for Cascade Mode
  const activeCascadeNodeIds = useMemo(() => {
    if (playMode !== 'cascade') return null;
    const activeSet = new Set<string>();
    nodeHopMap.forEach((hop, nodeId) => {
      if (hop <= currentHop) {
        activeSet.add(nodeId);
      }
    });
    return activeSet;
  }, [playMode, nodeHopMap, currentHop]);

  // Notify parent of filter change securely
  useEffect(() => {
    if (!isVisible) {
      if (!lastEmittedRef.current || lastEmittedRef.current.isVisible !== false) {
        lastEmittedRef.current = { isVisible: false };
        onFilterChangeRef.current(null, null, null);
      }
      return;
    }

    if (playMode === 'cascade') {
      onFilterChangeRef.current(null, null, activeCascadeNodeIds);
      return;
    }

    const currentMin = filterMode === 'playback' ? timeBounds.min : rangeMin;
    const currentMax = filterMode === 'playback' ? currentTime : rangeMax;
    const activeCurrent = filterMode === 'playback' ? currentTime : null;

    onFilterChangeRef.current([currentMin, currentMax], activeCurrent, null);
  }, [filterMode, rangeMin, rangeMax, currentTime, isVisible, timeBounds.min, timeBounds.max, playMode, activeCascadeNodeIds]);

  const formatDate = (ms: number) => {
    if (!ms || isNaN(ms)) return '-';
    const d = new Date(ms);
    return d.toLocaleDateString('ms-MY', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReset = () => {
    setIsPlaying(false);
    if (playMode === 'temporal') {
      setCurrentTime(timeBounds.min);
      setRangeMin(timeBounds.min);
      setRangeMax(timeBounds.max);
    } else {
      setCurrentHop(0);
    }
  };

  const handleStep = (direction: 'back' | 'forward') => {
    if (playMode === 'temporal') {
      const stepMs = (timeBounds.max - timeBounds.min) / 20;
      setCurrentTime(prev => {
        const next = direction === 'back' ? prev - stepMs : prev + stepMs;
        return Math.max(timeBounds.min, Math.min(timeBounds.max, next));
      });
    } else {
      setCurrentHop(prev => {
        const next = direction === 'back' ? prev - 1 : prev + 1;
        return Math.max(0, Math.min(maxHop, next));
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  // Calculate percentage for progress slider
  const totalDuration = timeBounds.max - timeBounds.min || 1;
  const currentPercent = Math.min(100, Math.max(0, ((currentTime - timeBounds.min) / totalDuration) * 100));

  // Compute active node count statistics for HUD
  const totalGraphNodesCount = graphData.nodes.length;
  let currentActiveNodesCount = totalGraphNodesCount;
  if (playMode === 'cascade' && activeCascadeNodeIds) {
    currentActiveNodesCount = activeCascadeNodeIds.size;
  } else if (playMode === 'temporal' && filterMode === 'playback') {
    currentActiveNodesCount = graphData.nodes.filter(n => {
      const dateVal = n.timestamp || n.eventDate || (n.sources && n.sources[0]?.timestamp);
      if (!dateVal) return true;
      const ms = Date.parse(dateVal);
      return isNaN(ms) ? true : ms <= currentTime;
    }).length;
  }

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-5xl bg-zinc-950/95 border border-cyan-500/50 rounded-xl p-3 shadow-[0_0_35px_rgba(0,204,255,0.25)] backdrop-blur-md text-cyan-100 font-mono text-xs flex flex-col gap-2.5 transition-all">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-cyan-400 animate-pulse" />
          <span className="font-black uppercase tracking-wider text-white text-xs">
            PELUNCUR MASA & ENJIN SIMULASI PENYEBARAN
          </span>

          {/* Mode Selector Toggle */}
          <div className="flex items-center bg-black/80 rounded border border-cyan-500/40 p-0.5 ml-2">
            <button
              onClick={() => { setPlayMode('temporal'); setIsPlaying(false); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                playMode === 'temporal' ? 'bg-cyan-900 text-cyan-200 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock size={11} /> Kronologi Masa
            </button>
            <button
              onClick={() => { setPlayMode('cascade'); setIsPlaying(false); setCurrentHop(0); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                playMode === 'cascade' ? 'bg-amber-900 text-amber-200 border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <GitBranch size={11} /> Penyebaran Nod (1 ➔ Ribuan)
            </button>
          </div>
        </div>

        {/* HUD Stats & Close */}
        <div className="flex items-center gap-3">
          {/* Active Nodes Growth Counter Badge */}
          <div className="text-[11px] font-mono font-bold bg-cyan-950/80 border border-cyan-500/50 px-3 py-1 rounded flex items-center gap-2 text-cyan-200">
            <Zap size={12} className="text-yellow-400 animate-bounce" />
            <span>NOD AKTIF: <strong className="text-white text-xs">{currentActiveNodesCount.toLocaleString()}</strong> / {totalGraphNodesCount.toLocaleString()}</span>
          </div>

          <button
            onClick={onToggleVisible}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
            title="Sembunyikan Peluncur Masa"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      {/* TRACK & EVENT TICK VISUALIZER */}
      {playMode === 'temporal' ? (
        <div className="relative w-full h-8 bg-black/80 rounded border border-cyan-500/30 flex items-center px-2 select-none">
          {/* Progress Background */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-950/80 via-cyan-900/50 to-cyan-500/30 rounded-l pointer-events-none transition-all duration-100"
            style={{ width: `${filterMode === 'playback' ? currentPercent : 100}%` }}
          />

          {/* Event density ticks along timeline */}
          {eventPoints.map((evt) => {
            const pct = Math.min(100, Math.max(0, ((evt.timestamp - timeBounds.min) / totalDuration) * 100));
            return (
              <div
                key={evt.id}
                onClick={() => setCurrentTime(evt.timestamp)}
                className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-3.5 rounded-full cursor-pointer transition-all hover:scale-150 group z-10 ${
                  evt.isAnomaly 
                    ? 'bg-red-500 shadow-[0_0_10px_#ff0033]' 
                    : 'bg-cyan-400/70 hover:bg-white'
                }`}
                style={{ left: `${pct}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-950 border border-cyan-500/60 rounded px-2 py-1 text-[10px] text-white font-mono whitespace-nowrap z-50 shadow-xl pointer-events-none">
                  <span className="font-bold text-cyan-300">{evt.label}</span>
                  <span className="block text-zinc-400 text-[9px]">{formatDate(evt.timestamp)}</span>
                </div>
              </div>
            );
          })}

          <input
            type="range"
            min={timeBounds.min}
            max={timeBounds.max}
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            className="w-full relative z-20 accent-cyan-400 cursor-pointer bg-transparent"
          />
        </div>
      ) : (
        /* CASCADE PROPAGATION HOP SLIDER */
        <div className="relative w-full bg-black/90 rounded border border-amber-500/40 p-2 flex flex-col gap-2 select-none">
          <div className="flex items-center justify-between text-[11px] text-amber-300 font-mono">
            <div className="flex items-center gap-2">
              <Target size={13} className="text-amber-400" />
              <span>NOD BENIH (ORIGIN SEED): <strong className="text-white font-bold">{seedNode?.label || 'Utama'}</strong></span>
            </div>
            <div>
              LAPIS PENYEBARAN (HOP): <strong className="text-amber-400 text-xs">HOP {currentHop} / {maxHop}</strong>
            </div>
          </div>

          <div className="relative w-full flex items-center">
            <input
              type="range"
              min={0}
              max={maxHop}
              step={1}
              value={currentHop}
              onChange={(e) => setCurrentHop(parseInt(e.target.value))}
              className="w-full relative z-20 accent-amber-400 cursor-pointer bg-transparent h-2"
            />
          </div>

          {/* Hop Steps Indicator */}
          <div className="flex justify-between items-center px-1 text-[9px] text-zinc-400">
            {Array.from({ length: maxHop + 1 }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentHop(idx)}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
                  currentHop === idx ? 'bg-amber-500 text-black font-black scale-110 shadow-[0_0_8px_#f59e0b]' : 'hover:text-white'
                }`}
              >
                Hop {idx} ({hopNodeCounts[idx] || 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PLAYBACK CONTROLS & SPEED */}
      <div className="flex items-center justify-between pt-1">
        
        {/* Left Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded border border-white/10 transition-all cursor-pointer"
            title="Reset ke Permulaan (1 Nod)"
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={() => handleStep('back')}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded border border-white/10 transition-all cursor-pointer"
            title="Undur Langkah"
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded border font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-950 border-amber-500 text-amber-300'
                : 'bg-cyan-950 border-cyan-400 text-cyan-300 hover:bg-cyan-900'
            }`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'PAUSE' : playMode === 'cascade' ? 'MAIN SIMULASI PENYEBARAN' : 'MAIN KRONOLOGI'}</span>
          </button>

          <button
            onClick={() => handleStep('forward')}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded border border-white/10 transition-all cursor-pointer"
            title="Maju Langkah"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 uppercase font-mono">Kelajuan Playback:</span>
          <div className="flex gap-1 bg-black/60 rounded p-0.5 border border-white/10">
            {[1, 2, 5, 10, 20].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                  speed === spd
                    ? 'bg-cyan-900 text-cyan-200 border border-cyan-400'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default TemporalTimelineBar;

