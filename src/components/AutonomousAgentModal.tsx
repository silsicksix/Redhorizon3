import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Radar,
  Shield,
  ShieldAlert,
  Zap,
  Globe,
  Terminal as TerminalIcon,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Download,
  X,
  Layers,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Server,
  Mail,
  User,
  Clock,
  Fingerprint,
  RefreshCw,
  PlusCircle,
  Network,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
  Tv,
  Move,
  Users,
  Target,
  SlidersHorizontal,
  Shuffle,
  Check,
  ListOrdered
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  runAutonomousScan,
  runSingleOsintTool,
  fetchAvailableOsintTools,
  generateTargetVariations,
  OsintAgentScanResult,
  OsintToolFinding,
  OsintAgentToolItem,
} from "../services/osintAgentService";
import { Node, GraphData } from "../types";

interface AutonomousAgentModalProps {
  initialTarget?: string;
  activeNode?: Node | null;
  existingNodes?: Node[];
  onClose: () => void;
  onUpdateGraph: (graph: Partial<GraphData>) => void;
  onLog: (msg: string, type: "info" | "warning" | "error" | "success") => void;
}

export const AutonomousAgentModal: React.FC<AutonomousAgentModalProps> = ({
  initialTarget = "",
  activeNode,
  existingNodes = [],
  onClose,
  onUpdateGraph,
  onLog,
}) => {
  const initialBaseTarget = initialTarget || activeNode?.label || "Ahmad69";
  const [target, setTarget] = useState(initialBaseTarget);
  const [targetType, setTargetType] = useState<"auto" | "domain" | "ip" | "email" | "username" | "person">("auto");
  const [depth, setDepth] = useState<"quick" | "balanced" | "deep">("balanced");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "dns", "whois", "ip", "web", "email", "social", "archive"
  ]);

  // 5 Dynamic Target Variations Swarm Matrix
  const [isMultiTargetActive, setIsMultiTargetActive] = useState<boolean>(true);
  const [isMultiTargetExpanded, setIsMultiTargetExpanded] = useState<boolean>(true);
  const [permutationStyle, setPermutationStyle] = useState<"standard" | "digits" | "decorators" | "leet" | "custom">("standard");
  const [targetVariations, setTargetVariations] = useState<string[]>(() =>
    generateTargetVariations(initialBaseTarget, 5)
  );
  const [enabledVariations, setEnabledVariations] = useState<boolean[]>([true, true, true, true, true]);

  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<OsintAgentScanResult | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"summary" | "tools" | "graph" | "logs">("summary");
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [selectedEntitiesToInject, setSelectedEntitiesToInject] = useState<Record<string, boolean>>({});

  const logsEndRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Helper to generate dynamic variations based on selected style
  const computeVariationsForStyle = useCallback((base: string, style: "standard" | "digits" | "decorators" | "leet" | "custom") => {
    const raw = base.trim().replace(/^@/, "");
    if (!raw) return ["", "", "", "", ""];

    const parts = raw.split(/([0-9]+|[-_.\s]+)/).filter((p) => p && !/^[-_.\s]+$/.test(p));
    const textPart = parts.find((p) => /^[a-zA-Z]+$/.test(p)) || raw;
    const numPart = parts.find((p) => /^[0-9]+$/.test(p)) || "";

    if (style === "digits" && textPart && numPart) {
      const splitNum = numPart.split("").join("_");
      const dashSplit = numPart.split("").join("-");
      const dotSplit = numPart.split("").join(".");
      return [
        raw,
        `${textPart}_${splitNum}`,
        `${textPart}-${dashSplit}`,
        `${textPart.toLowerCase()}.${dotSplit}`,
        `${textPart}0${numPart}`,
      ].slice(0, 5);
    }

    if (style === "decorators") {
      return [
        raw,
        `x_${raw}`,
        `${raw}_official`,
        `real_${raw}`,
        `_${raw}_`,
      ].slice(0, 5);
    }

    if (style === "leet") {
      const leetText = textPart.replace(/a/gi, "4").replace(/e/gi, "3").replace(/i/gi, "1").replace(/o/gi, "0");
      return [
        raw,
        `${leetText}${numPart}`,
        `${textPart}_19${numPart.length === 2 ? numPart : "90"}`,
        `${textPart}_MY`,
        `the_${textPart.toLowerCase()}`,
      ].slice(0, 5);
    }

    // Default "standard"
    return generateTargetVariations(raw, 5);
  }, []);

  // Update target variations when base target changes
  const handleTargetChange = (newTarget: string) => {
    setTarget(newTarget);
    if (permutationStyle !== "custom") {
      const updated = computeVariationsForStyle(newTarget, permutationStyle);
      setTargetVariations(updated);
    }
  };

  const handleApplyPermutationStyle = (style: "standard" | "digits" | "decorators" | "leet" | "custom") => {
    setPermutationStyle(style);
    if (style !== "custom") {
      const updated = computeVariationsForStyle(target, style);
      setTargetVariations(updated);
    }
  };

  const handleUpdateSingleVariationSlot = (index: number, val: string) => {
    setPermutationStyle("custom");
    setTargetVariations((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleToggleVariationSlot = (index: number) => {
    setEnabledVariations((prev) => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  // Manual Resizing & Orientation States
  const getInitialDimensions = () => {
    if (typeof window === "undefined") return { width: 1024, height: 750 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobilePortrait = vw < 768 && vh > vw;
    if (isMobilePortrait) {
      return { width: Math.max(340, Math.min(vw - 16, 500)), height: Math.min(vh - 24, 780) };
    }
    return {
      width: Math.min(vw - 32, 1080),
      height: Math.min(vh - 40, 820)
    };
  };

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>(getInitialDimensions);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activePreset, setActivePreset] = useState<"portrait" | "standard" | "landscape" | "custom">("standard");

  // Keep dimensions bounded on window resize
  useEffect(() => {
    const handleWindowResize = () => {
      setDimensions((prev) => ({
        width: Math.min(prev.width, window.innerWidth - 16),
        height: Math.min(prev.height, window.innerHeight - 16)
      }));
    };
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  // Preset Layout Switchers
  const applyPreset = (preset: "portrait" | "standard" | "landscape" | "maximized") => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (preset === "maximized") {
      setIsMaximized(true);
      return;
    }

    setIsMaximized(false);
    if (preset === "portrait") {
      setActivePreset("portrait");
      setDimensions({
        width: Math.min(vw - 20, 520),
        height: Math.min(vh - 30, 860)
      });
    } else if (preset === "landscape") {
      setActivePreset("landscape");
      setDimensions({
        width: Math.min(vw - 24, 1380),
        height: Math.min(vh - 36, 880)
      });
    } else {
      setActivePreset("standard");
      setDimensions({
        width: Math.min(vw - 32, 1024),
        height: Math.min(vh - 40, 780)
      });
    }
  };

  // Interactive Drag Resizing Handler (Supports both Mouse and Touch for Mobile/Tablet)
  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent, direction: "both" | "horizontal" | "vertical" | "bottom-left") => {
    e.preventDefault();
    e.stopPropagation();

    const startX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const startY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    setIsMaximized(false);
    setActivePreset("custom");

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      const minW = 320;
      const maxW = Math.max(340, window.innerWidth - 16);
      const minH = 340;
      const maxH = Math.max(360, window.innerHeight - 20);

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction === "both" || direction === "horizontal") {
        newWidth = Math.min(maxW, Math.max(minW, startWidth + deltaX * 2));
      } else if (direction === "bottom-left") {
        newWidth = Math.min(maxW, Math.max(minW, startWidth - deltaX * 2));
      }

      if (direction === "both" || direction === "vertical" || direction === "bottom-left") {
        newHeight = Math.min(maxH, Math.max(minH, startHeight + deltaY));
      }

      setDimensions({ width: Math.round(newWidth), height: Math.round(newHeight) });
    };

    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, [dimensions]);

  // Auto-detect target type for helper badge
  const detectedBadge = (() => {
    const t = target.trim();
    if (!t) return "NONE";
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t)) return "EMAIL";
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(t)) return "IP ADDRESS";
    if (/^https?:\/\//.test(t) || /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(t)) return "DOMAIN";
    if (t.startsWith("@") || /^[a-zA-Z0-9_-]{3,24}$/.test(t)) return "USERNAME";
    return "ORGANIZATION / PERSON";
  })();

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleStartScan = async () => {
    if (!target.trim()) {
      onLog("Autonomous Agent: Sila nyatakan sasaran siasatan OSINT.", "warning");
      return;
    }

    // Determine target variations array (up to 5 targets)
    const activeTargets = isMultiTargetActive
      ? targetVariations
          .filter((_, idx) => enabledVariations[idx])
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [target.trim()];

    const finalTargetList = activeTargets.length > 0 ? activeTargets : [target.trim()];

    setIsLoading(true);
    setLiveLogs([
      `[${new Date().toLocaleTimeString()}] Memulakan Unit Dron Pengintip OSINT Automatik pada sasaran asas: "${target.trim()}"...`,
      isMultiTargetActive && finalTargetList.length > 1
        ? `[${new Date().toLocaleTimeString()}] [MATRIKS DINAMIK AKTIF] Melancarkan serbuan serentak pada ${finalTargetList.length} sasaran alias: [${finalTargetList.join(", ")}]`
        : `[${new Date().toLocaleTimeString()}] Mod sasaran tunggal diaktifkan.`,
    ]);
    setScanResult(null);
    setActiveTab("logs");

    try {
      onLog(`Unit Auto Scout memulakan siasatan matriks (${finalTargetList.length} sasaran): ${finalTargetList.join(", ")}`, "info");
      const result = await runAutonomousScan(target.trim(), {
        targets: finalTargetList,
        targetVariations: finalTargetList,
        targetType,
        categories: selectedCategories as any,
        depth,
      });

      setScanResult(result);
      setLiveLogs(result.logs || []);

      // Pre-select all discovered entities
      const initialSelection: Record<string, boolean> = {};
      result.graph.nodes.forEach((n) => {
        initialSelection[n.id] = true;
      });
      setSelectedEntitiesToInject(initialSelection);

      setActiveTab("summary");
      onLog(
        `Imbasan Auto Scout selesai: ${result.toolsRun} operasi terlaksana pada ${finalTargetList.length} sasaran, ${result.graph.nodes.length} entiti berjaya dipetakan.`,
        "success"
      );
    } catch (err: any) {
      setLiveLogs((prev) => [...prev, `[ERROR] Imbasan gagal: ${err.message}`]);
      onLog(`Autonomous Agent failed: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInjectToGraph = () => {
    if (!scanResult) return;

    const nodesToAdd: Node[] = scanResult.graph.nodes
      .filter((n) => selectedEntitiesToInject[n.id])
      .map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        details: n.details,
        confidenceScore: n.confidenceScore || 85,
        confidenceLevel: n.confidenceLevel || "HIGH",
        verificationStatus: "VERIFIED",
        sourceType: n.sourceType || "Autonomous OSINT Agent",
      }));

    const validNodeIds = new Set(nodesToAdd.map((n) => n.id));
    const linksToAdd = scanResult.graph.links.filter(
      (l) => validNodeIds.has(l.source) && validNodeIds.has(l.target)
    );

    if (nodesToAdd.length === 0) {
      onLog("No entities selected for graph injection.", "warning");
      return;
    }

    onUpdateGraph({
      nodes: nodesToAdd,
      links: linksToAdd,
    });

    onLog(
      `Successfully injected ${nodesToAdd.length} entities and ${linksToAdd.length} links into Tactical Graph Canvas!`,
      "success"
    );
    onClose();
  };

  const handleExportJson = () => {
    if (!scanResult) return;
    const blob = new Blob([JSON.stringify(scanResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osint_dossier_${target.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onLog("Dossier exported to JSON file.", "success");
  };

  const isNarrow = dimensions.width < 720;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 select-none overflow-hidden">
      <div 
        ref={modalContainerRef}
        style={{
          width: isMaximized ? "99vw" : `${dimensions.width}px`,
          height: isMaximized ? "97vh" : `${dimensions.height}px`,
          maxWidth: "99vw",
          maxHeight: "98vh"
        }}
        className="bg-zinc-950/95 border border-white/15 rounded-2xl flex flex-col shadow-2xl overflow-hidden font-mono text-xs relative select-text transition-all duration-75"
      >
        
        {/* TOP HEADER */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-zinc-900/80 gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 relative shrink-0">
              <Radar size={18} className={isLoading ? "animate-spin" : ""} />
              {isLoading && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black tracking-wider text-white">AUTONOMOUS OSINT AGENT</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v2.9.1 NATIVE
                </span>
                {!isNarrow && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    PASSIVE RECON
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 hidden sm:block">
                Autonomous passive intelligence pipeline with cross-tool reasoning & graph correlation
              </p>
            </div>
          </div>

          {/* WINDOW SIZING PRESETS & WINDOW CONTROLS */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Layout Presets */}
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => applyPreset("portrait")}
                title="Mod Potret (Tegak / Telefon: 480px)"
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                  activePreset === "portrait" && !isMaximized
                    ? "bg-red-600 text-white font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Smartphone size={14} />
                <span className="hidden md:inline text-[9px]">Potret</span>
              </button>

              <button
                onClick={() => applyPreset("standard")}
                title="Mod Standard (Komputer / Laptop: 1024px)"
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                  activePreset === "standard" && !isMaximized
                    ? "bg-red-600 text-white font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Monitor size={14} />
                <span className="hidden md:inline text-[9px]">Standard</span>
              </button>

              <button
                onClick={() => applyPreset("landscape")}
                title="Mod Landskap (Lebar: 1380px)"
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                  activePreset === "landscape" && !isMaximized
                    ? "bg-red-600 text-white font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Tv size={14} />
                <span className="hidden md:inline text-[9px]">Landskap</span>
              </button>

              <button
                onClick={() => applyPreset(isMaximized ? "standard" : "maximized")}
                title={isMaximized ? "Pulihkan Saiz (Restore)" : "Skrin Penuh (Maximize)"}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                  isMaximized
                    ? "bg-emerald-600 text-white font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>

            {/* Live Size Pill */}
            <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-black/40 rounded-lg border border-white/5 text-[9px] text-zinc-400">
              <Move size={10} className="text-zinc-500" />
              <span>{Math.round(dimensions.width)}×{Math.round(dimensions.height)}</span>
            </div>

            <button
              onClick={onClose}
              title="Tutup Tetingkap"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-600 text-zinc-400 hover:text-white flex items-center justify-center transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* TARGET INPUT & CONTROLS */}
        <div className="p-3 sm:p-4 bg-zinc-900/30 border-b border-white/5 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={target}
                onChange={(e) => handleTargetChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleStartScan()}
                placeholder="Contoh nama sasaran: Ahmad69, target_user, domain.com..."
                className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono tracking-wide"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-white/10">
                  {detectedBadge}
                </span>
              </div>
            </div>

            {/* Quick target from existing node dropdown */}
            {existingNodes.length > 0 && (
              <select
                onChange={(e) => e.target.value && handleTargetChange(e.target.value)}
                className="bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-500"
                defaultValue=""
              >
                <option value="" disabled>
                  Pilih dari Kanvas ({existingNodes.length})
                </option>
                {existingNodes.slice(0, 20).map((n) => (
                  <option key={n.id} value={n.label}>
                    {n.label} ({n.type})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleStartScan}
              disabled={isLoading || !target.trim()}
              className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shrink-0 ${
                isLoading || !target.trim()
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-900/30 hover:scale-[1.02]"
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  IMBASAN AKTIF...
                </>
              ) : (
                <>
                  <Play size={14} className="fill-current" />
                  LANCARKAN DRON ({isMultiTargetActive ? enabledVariations.filter(Boolean).length : 1} SASARAN)
                </>
              )}
            </button>
          </div>

          {/* 5 DYNAMIC TARGET VARIATIONS SWARM PANEL */}
          <div className="rounded-xl border border-red-500/20 bg-gradient-to-b from-red-950/20 to-black/40 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMultiTargetActive((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                    isMultiTargetActive
                      ? "bg-red-600 border-red-400 text-white shadow-sm shadow-red-900/40"
                      : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Users size={12} />
                  <span>Matriks 5 Sasaran Dinamik</span>
                  <span className="px-1.5 py-0.2 bg-black/40 rounded text-[9px] font-mono">
                    {enabledVariations.filter(Boolean).length}/5 Aktif
                  </span>
                </button>

                <button
                  onClick={() => setIsMultiTargetExpanded((prev) => !prev)}
                  className="text-zinc-400 hover:text-zinc-200 text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5"
                >
                  <span>{isMultiTargetExpanded ? "Tutup Tetapan Dron" : "Papar 5 Slot Sasaran"}</span>
                  {isMultiTargetExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              </div>

              {/* Style Presets */}
              {isMultiTargetActive && isMultiTargetExpanded && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase mr-1">Preset Varian:</span>
                  {[
                    { id: "standard", label: "Pemisah (- _ .)" },
                    { id: "digits", label: "Digit (_6_9)" },
                    { id: "decorators", label: "Awalan (x_ / real_)" },
                    { id: "leet", label: "Gaya Leet/MY" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleApplyPermutationStyle(p.id as any)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all border ${
                        permutationStyle === p.id
                          ? "bg-red-500/20 border-red-500 text-red-300"
                          : "bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const fresh = computeVariationsForStyle(target, "standard");
                      setTargetVariations(fresh);
                      setPermutationStyle("standard");
                    }}
                    title="Jana semula variasi sasaran"
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 text-[9px]"
                  >
                    <Shuffle size={11} />
                  </button>
                </div>
              )}
            </div>

            {/* 5 Slot Target Input Badges / Inputs */}
            {isMultiTargetActive && isMultiTargetExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                {targetVariations.map((variant, idx) => {
                  const isEnabled = enabledVariations[idx];
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl border transition-all flex flex-col gap-1.5 ${
                        isEnabled
                          ? "bg-zinc-900/90 border-red-500/30 text-white"
                          : "bg-black/40 border-white/5 text-zinc-500 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black font-mono uppercase tracking-wider text-red-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Dron #{idx + 1}
                        </span>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggleVariationSlot(idx)}
                          className="accent-red-500 w-3.5 h-3.5 rounded cursor-pointer"
                          title="Aktif/Nyahaktifkan dron ini"
                        />
                      </div>
                      <input
                        type="text"
                        value={variant}
                        onChange={(e) => handleUpdateSingleVariationSlot(idx, e.target.value)}
                        placeholder={`Sasaran #${idx + 1}`}
                        className="w-full bg-black/80 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PARAMETERS & CATEGORIES BAR */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold mr-1">Modul Recon:</span>
              {[
                { id: "dns", label: "DNS / Certs" },
                { id: "ip", label: "IP & ASN" },
                { id: "web", label: "Web / Robots" },
                { id: "email", label: "Email / MX" },
                { id: "social", label: "Social Recon" },
                { id: "archive", label: "Wayback" },
              ].map((c) => {
                const active = selectedCategories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-medium transition-all ${
                      active
                        ? "bg-red-500/20 border-red-500/40 text-red-300 font-bold"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 uppercase font-bold">Kedalaman:</span>
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                {(["quick", "balanced", "deep"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                      depth === d ? "bg-white/20 text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MULTI-AGENT SPECIALIST MATRIX BAR */}
          <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] bg-black/30 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} />
                Agent Pipeline:
              </span>
              <span className="px-2 py-0.5 bg-cyan-950/60 border border-cyan-700/40 text-cyan-300 rounded font-mono">
                Agent 3: Multi-Target Permutator (Dynamic 5-Drone Matrix)
              </span>
              <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-700/40 text-amber-300 rounded font-mono">
                Agent 2: Cross-Alias Correlator (Nemotron Ultra 550B)
              </span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Parallel Multi-Target Acceleration [READY]</span>
            </div>
          </div>
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 border-b border-white/10 bg-zinc-950 gap-2 shrink-0 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { id: "summary", label: "Executive Brief", icon: Shield },
              { id: "tools", label: `Tool Findings (${scanResult?.results.length || 0})`, icon: Zap },
              { id: "graph", label: `Entities to Inject (${scanResult?.graph.nodes.length || 0})`, icon: Network },
              { id: "logs", label: "Agent Telemetry Stream", icon: TerminalIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap ${
                    active
                      ? "border-red-500 text-white"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Icon size={14} className={active ? "text-red-400" : ""} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {scanResult && (
            <div className="flex items-center gap-2 py-1">
              <button
                onClick={handleExportJson}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1 text-[10px] font-bold"
              >
                <Download size={11} /> EXPORT
              </button>
              <button
                onClick={handleInjectToGraph}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 text-[10px] font-black tracking-wider shadow-lg shadow-emerald-900/30"
              >
                <PlusCircle size={11} /> INJECT ALL
              </button>
            </div>
          )}
        </div>

        {/* MAIN BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/60">
          {/* 1. EXECUTIVE BRIEF */}
          {activeTab === "summary" && (
            <div className="space-y-6">
              {!scanResult ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-500 space-y-3">
                  <Radar size={40} className="text-zinc-600 stroke-[1.5]" />
                  <div>
                    <p className="text-sm font-bold text-zinc-400">Drone Station Ready</p>
                    <p className="text-xs text-zinc-600">Enter a target above and launch the autonomous OSINT agent.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* METRIC SCORE BANNER */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">THREAT LEVEL</span>
                      <div className="flex items-center gap-2 mt-2">
                        <ShieldAlert
                          size={24}
                          className={
                            scanResult.summary.threatLevel === "CRITICAL"
                              ? "text-red-500"
                              : scanResult.summary.threatLevel === "HIGH"
                              ? "text-orange-500"
                              : "text-emerald-500"
                          }
                        />
                        <span className="text-lg font-black text-white">
                          {scanResult.summary.threatLevel}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1">
                        Risk Score: {scanResult.summary.riskScore}/100
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">EXECUTION TIME</span>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock size={20} className="text-blue-400" />
                        <span className="text-lg font-black text-white">
                          {(scanResult.executionTimeMs / 1000).toFixed(2)}s
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1">Parallel Micro-Engines</span>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">TOOLS EXECUTED</span>
                      <div className="flex items-center gap-2 mt-2">
                        <Zap size={20} className="text-yellow-400" />
                        <span className="text-lg font-black text-white">
                          {scanResult.toolsRun}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1">Zero-Noise Passive Probes</span>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">CORRELATED ENTITIES</span>
                      <div className="flex items-center gap-2 mt-2">
                        <Network size={20} className="text-emerald-400" />
                        <span className="text-lg font-black text-white">
                          {scanResult.graph.nodes.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1">
                        {scanResult.graph.links.length} Relational Links
                      </span>
                    </div>
                  </div>

                  {/* MULTI-TARGET VARIATION RECONNAISSANCE MATRIX */}
                  {scanResult.summary.matchedVariations && scanResult.summary.matchedVariations.length > 0 && (
                    <div className="p-5 rounded-2xl bg-zinc-900/90 border border-red-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white font-bold">
                          <Users size={16} className="text-red-400" />
                          <span>KEPUTUSAN MATRIKS SASARAN DINAMIK ({scanResult.summary.matchedVariations.length} SASARAN DIKORELASI)</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {scanResult.summary.matchedVariations.filter((m) => m.activeAccountsCount > 0).length} daripada {scanResult.summary.matchedVariations.length} dikesan aktif
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                        {scanResult.summary.matchedVariations.map((item, idx) => {
                          const hasHits = item.activeAccountsCount > 0;
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                                hasHits
                                  ? "bg-red-950/30 border-red-500/40 text-white shadow-sm shadow-red-950/50"
                                  : "bg-black/40 border-white/5 text-zinc-500"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 mb-1">
                                  <span>Dron #{idx + 1}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded font-bold ${
                                      hasHits ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-zinc-800 text-zinc-500"
                                    }`}
                                  >
                                    {hasHits ? "AKTIF" : "TIADA REKOD"}
                                  </span>
                                </div>
                                <div className="font-mono font-bold text-xs text-white truncate" title={item.variant}>
                                  {item.variant}
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-white/5 space-y-1">
                                <div className="text-[10px] text-zinc-400">
                                  Jejak Akaun: <span className="text-white font-bold">{item.activeAccountsCount}</span>
                                </div>
                                {item.platforms && item.platforms.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {item.platforms.map((p, pIdx) => (
                                      <span
                                        key={pIdx}
                                        className="px-1.5 py-0.2 rounded bg-white/10 text-zinc-200 text-[8px] font-mono"
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-zinc-600 italic">Tiada platform terbuka</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* KEY FINDINGS & ATTACK SURFACE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
                      <div className="flex items-center gap-2 text-white font-bold">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span>TACTICAL FINDINGS</span>
                      </div>
                      <ul className="space-y-2">
                        {scanResult.summary.keyFindings.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-zinc-300 text-[11px] leading-relaxed">
                            <span className="text-red-400 font-bold">•</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
                      <div className="flex items-center gap-2 text-white font-bold">
                        <AlertTriangle size={16} className="text-amber-400" />
                        <span>ATTACK SURFACE & EXPOSURE</span>
                      </div>
                      <ul className="space-y-2">
                        {scanResult.summary.attackSurface.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-zinc-300 text-[11px] leading-relaxed">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* NEXT STEPS */}
                  <div className="p-5 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-300 font-bold">
                        <Sparkles size={16} className="text-red-400" />
                        <span>TACTICAL RECON RECOMMENDATIONS</span>
                      </div>
                      <button
                        onClick={handleInjectToGraph}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold transition-all shadow"
                      >
                        INJECT DISCOVERIES INTO GRAPH CANVAS
                      </button>
                    </div>
                    <ul className="space-y-1.5">
                      {scanResult.summary.recommendedNextSteps.map((step, i) => (
                        <li key={i} className="text-zinc-300 text-[11px] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 2. TOOL RESULTS MATRIX */}
          {activeTab === "tools" && (
            <div className="space-y-4">
              {!scanResult || scanResult.results.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">No tool results available. Run a scan first.</div>
              ) : (
                scanResult.results.map((res, idx) => {
                  const isExpanded = !!expandedTools[res.tool];
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-zinc-900/70 overflow-hidden transition-all"
                    >
                      <div
                        onClick={() =>
                          setExpandedTools((prev) => ({ ...prev, [res.tool]: !prev[res.tool] }))
                        }
                        className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-white/10 text-zinc-300 border border-white/10">
                            {res.category}
                          </span>
                          {res.targetVariant && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                              @{res.targetVariant}
                            </span>
                          )}
                          <span className="font-bold text-white text-xs">{res.title}</span>
                          <span className="text-zinc-500 text-[11px] truncate max-w-md">
                            — {res.summary}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {res.discoveredEntities && res.discoveredEntities.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                              +{res.discoveredEntities.length} entities
                            </span>
                          )}
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 border-t border-white/10 bg-black/40 space-y-3">
                          <pre className="p-3 rounded-lg bg-black/80 border border-white/10 text-zinc-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {res.rawText}
                          </pre>
                          {res.discoveredEntities && res.discoveredEntities.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-zinc-400 uppercase font-bold">
                                Extracted Artifacts:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {res.discoveredEntities.map((ent, eIdx) => (
                                  <span
                                    key={eIdx}
                                    className="px-2 py-1 rounded bg-zinc-800 border border-white/10 text-zinc-200 text-[10px] flex items-center gap-1.5"
                                  >
                                    <span className="text-[8px] uppercase text-zinc-400 font-bold">
                                      [{ent.type}]
                                    </span>
                                    {ent.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 3. ENTITIES TO INJECT */}
          {activeTab === "graph" && (
            <div className="space-y-4">
              {!scanResult ? (
                <div className="text-center py-12 text-zinc-500">No entities discovered yet.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="text-xs text-zinc-300">
                      Select intelligence artifacts to inject into the active workspace graph:
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const all: Record<string, boolean> = {};
                          scanResult.graph.nodes.forEach((n) => (all[n.id] = true));
                          setSelectedEntitiesToInject(all);
                        }}
                        className="text-[10px] text-blue-400 hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-zinc-600">|</span>
                      <button
                        onClick={() => setSelectedEntitiesToInject({})}
                        className="text-[10px] text-zinc-400 hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {scanResult.graph.nodes.map((node) => {
                      const isSelected = !!selectedEntitiesToInject[node.id];
                      return (
                        <div
                          key={node.id}
                          onClick={() =>
                            setSelectedEntitiesToInject((prev) => ({
                              ...prev,
                              [node.id]: !prev[node.id],
                            }))
                          }
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                            isSelected
                              ? "bg-red-950/20 border-red-500/50 text-white"
                              : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:bg-white/5"
                          }`}
                        >
                          <div className="space-y-1 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded text-[8px] uppercase font-bold bg-white/10 border border-white/10 text-zinc-300">
                                {node.type}
                              </span>
                              {(node as any).targetVariant && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-red-500/20 border border-red-500/30 text-red-300">
                                  @{(node as any).targetVariant}
                                </span>
                              )}
                              <span className="font-bold text-xs text-white">{node.label}</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-tight line-clamp-2">
                              {node.details}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 accent-red-500 rounded"
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 4. LOGS TELEMETRY */}
          {activeTab === "logs" && (
            <div className="h-full">
              <div className="p-4 rounded-xl bg-black/90 border border-white/10 font-mono text-xs text-emerald-400 space-y-1.5 min-h-[300px] overflow-y-auto">
                {liveLogs.length === 0 ? (
                  <div className="text-zinc-600">Telemetry engine idle. Waiting for task launch...</div>
                ) : (
                  liveLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed">
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-3 sm:p-4 bg-zinc-900/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0 relative">
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <Shield size={14} className="text-red-400" />
            <span className="truncate max-w-[280px] sm:max-w-md">Autonomous Recon Drone ready for instant tactical correlation.</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition-colors"
            >
              CLOSE
            </button>
            {scanResult && (
              <button
                onClick={handleInjectToGraph}
                className="px-4 sm:px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all shadow-lg shadow-emerald-900/30"
              >
                <PlusCircle size={14} />
                INJECT {Object.values(selectedEntitiesToInject).filter(Boolean).length} NODES
              </button>
            )}
          </div>
        </div>

        {/* INTERACTIVE RESIZE HANDLERS (MOUSE + TOUCH) */}
        {!isMaximized && (
          <>
            {/* Bottom-Right Corner Handle */}
            <div
              onMouseDown={(e) => startResizing(e, "both")}
              onTouchStart={(e) => startResizing(e, "both")}
              title="Tarik untuk ubah saiz tetingkap (Drag to resize)"
              className="absolute bottom-0 right-0 w-6 h-6 flex items-end justify-end p-1 cursor-nwse-resize z-50 text-zinc-500 hover:text-red-400 select-none group"
            >
              <svg viewBox="0 0 16 16" width="12" height="12" className="fill-current opacity-60 group-hover:opacity-100 transition-opacity">
                <circle cx="13" cy="13" r="1.5" />
                <circle cx="9" cy="13" r="1.5" />
                <circle cx="13" cy="9" r="1.5" />
                <circle cx="5" cy="13" r="1.5" />
                <circle cx="9" cy="9" r="1.5" />
                <circle cx="13" cy="5" r="1.5" />
              </svg>
            </div>

            {/* Bottom-Left Corner Handle */}
            <div
              onMouseDown={(e) => startResizing(e, "bottom-left")}
              onTouchStart={(e) => startResizing(e, "bottom-left")}
              title="Tarik untuk ubah saiz tetingkap (Drag to resize)"
              className="absolute bottom-0 left-0 w-5 h-5 cursor-nesw-resize z-50 select-none"
            />

            {/* Right Border Handle */}
            <div
              onMouseDown={(e) => startResizing(e, "horizontal")}
              onTouchStart={(e) => startResizing(e, "horizontal")}
              className="absolute top-10 right-0 w-2 bottom-6 cursor-ew-resize z-40 hover:bg-red-500/20 transition-colors select-none"
            />

            {/* Bottom Border Handle */}
            <div
              onMouseDown={(e) => startResizing(e, "vertical")}
              onTouchStart={(e) => startResizing(e, "vertical")}
              className="absolute bottom-0 left-6 right-6 h-2 cursor-ns-resize z-40 hover:bg-red-500/20 transition-colors select-none"
            />
          </>
        )}

      </div>
    </div>
  );
};

export default AutonomousAgentModal;
