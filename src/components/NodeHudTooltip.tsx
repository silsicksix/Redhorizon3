import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Node, Link } from '../types';
import { resolveNodeBrandOrType } from '../utils/nodeIconResolver';
import { getProxiedImageUrl, extractImageUrl } from '../utils/imageUtils';
import { extractNodeCoordinates } from '../utils/geoUtils';
import { useGlobalStore } from '../store/GlobalStore';
import { 
  ShieldAlert, 
  MapPin, 
  Share2, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Tag, 
  ExternalLink,
  Target,
  Cpu,
  Fingerprint,
  Trash2,
  X,
  Sparkles,
  Copy,
  Check,
  GitFork,
  ShieldCheck,
  FileText,
  Navigation,
  Globe,
  Search
} from 'lucide-react';

const getDisplayImageUrl = (node: Node | null): string | null => {
  if (!node) return null;
  if (node.imageUrl && typeof node.imageUrl === 'string' && node.imageUrl.trim()) {
    return node.imageUrl.trim();
  }
  if (Array.isArray(node.imageUrls) && node.imageUrls.length > 0) {
    const lastValid = [...node.imageUrls].reverse().find(u => typeof u === 'string' && u.trim());
    if (lastValid) return lastValid.trim();
  }
  const autoExtractedImage = extractImageUrl(node.details) || extractImageUrl(node.label) || extractImageUrl(node.id);
  if (autoExtractedImage) return autoExtractedImage;

  if ((node.type === 'person' || node.type === 'social' || !node.type) && node.label) {
    const cleanLabel = String(node.label).trim();
    if (/^\d{8,20}$/.test(cleanLabel)) {
      return `https://graph.facebook.com/${cleanLabel}/picture?type=large`;
    }
  }
  return null;
};

export interface NodeHudTooltipProps {
  node: Node | null;
  position: { x: number; y: number } | null;
  links?: Link[];
  onDeleteNode?: (nodeId: string) => void;
  onClose?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const NodeHudTooltip: React.FC<NodeHudTooltipProps> = ({
  node,
  position,
  links = [],
  onDeleteNode,
  onClose,
  onMouseEnter,
  onMouseLeave
}) => {
  const { dispatch } = useGlobalStore();
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (confirmingDelete) {
      const timer = setTimeout(() => setConfirmingDelete(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmingDelete]);

  useEffect(() => {
    setConfirmingDelete(false);
  }, [node?.id]);

  if (!node || !position || typeof document === 'undefined') return null;

  // 1. Resolve Brand, Color and Category
  const meta = resolveNodeBrandOrType(node);
  const themeAccent = '#00f0ff'; // Cyber Tactical Cyan accent
  const brandColor = meta.brandColor || themeAccent;
  const displayImage = getDisplayImageUrl(node);

  // 2. Geospatial and Location Presence Detection
  const geoCoordinates = extractNodeCoordinates(node);
  const hasLocationData = Boolean(
    (node.lat !== undefined && (node.lng !== undefined || (node as any).lon !== undefined)) ||
    node.type === 'location' ||
    (node.metadata && ((node.metadata as any).latitude || (node.metadata as any).lat)) ||
    (geoCoordinates && geoCoordinates.source !== 'ESTIMATED_LOCATION')
  );

  // 3. Compute Connection Degree from Links
  const connectionCount = links.reduce((acc, l) => {
    const srcId = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const tgtId = typeof l.target === 'object' ? (l.target as any).id : l.target;
    if (srcId === node.id || tgtId === node.id) return acc + 1;
    return acc;
  }, 0);

  // 4. Quick Action Handlers
  const handleCopyText = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const textToCopy = node.label || node.id;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      dispatch({ type: 'ADD_LOG', payload: { message: `Klipbod: "${textToCopy}" berjaya disalin.`, type: 'info' } });
    } catch (err) {
      console.warn('Gagal menyalin:', err);
    }
  };

  const handleAiDeepRecon = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: node.id } }));
    window.dispatchEvent(new CustomEvent('app:trigger-node-recon', { detail: { node } }));
    dispatch({ type: 'ADD_LOG', payload: { message: `Memulakan Deep Recon AI ke atas: ${node.label || node.id}`, type: 'info' } });
  };

  const handleExpandConnections = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: node.id } }));
    window.dispatchEvent(new CustomEvent('app:expand-node', { detail: { node } }));
    dispatch({ type: 'ADD_LOG', payload: { message: `Menganalisis dan mengembangkan sambungan bagi: ${node.label || node.id}`, type: 'info' } });
  };

  const handleToggleGroundTruth = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newVerified = !node.isGroundVerified;
    dispatch({
      type: 'UPDATE_GRAPH',
      payload: {
        nodes: [{ id: node.id, isGroundVerified: newVerified, confidenceLevel: newVerified ? 'HIGH' : 'MEDIUM' }]
      }
    });
    dispatch({
      type: 'ADD_LOG',
      payload: { 
        message: `${node.label || node.id} ditandai sebagai: ${newVerified ? 'GROUND TRUTH DISAHKAN' : 'BELUM DISAHKAN'}`, 
        type: newVerified ? 'success' : 'warning' 
      }
    });
  };

  const handleToggleConflict = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newConflict = !node.isConflictFlagged;
    dispatch({
      type: 'UPDATE_GRAPH',
      payload: {
        nodes: [{ id: node.id, isConflictFlagged: newConflict }]
      }
    });
    dispatch({
      type: 'ADD_LOG',
      payload: { 
        message: `${node.label || node.id} ${newConflict ? 'DIBENDERAKAN SEBAGAI KONFLIK' : 'dibersihkan dari konflik'}`, 
        type: newConflict ? 'error' : 'info' 
      }
    });
  };

  const handleOpenMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: node.id } }));
    window.dispatchEvent(new CustomEvent('app:open-tactical-hub', { detail: { tab: 'geospatial', nodeId: node.id } }));
    dispatch({ type: 'ADD_LOG', payload: { message: `Membuka radar peta geospatial bagi: ${node.label || node.id}`, type: 'info' } });
  };

  const handleOpenWebVerify = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: node.id } }));
    window.dispatchEvent(new CustomEvent('app:verify-node-web', { detail: { node } }));
    dispatch({ type: 'ADD_LOG', payload: { message: `Melancarkan siasatan web OSINT bagi: ${node.label || node.id}`, type: 'info' } });
  };

  const handleOpenDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: node.id } }));
  };

  // 5. Screen Boundary Clamping
  const CARD_WIDTH = 340;
  const CARD_HEIGHT = 420;
  const OFFSET_X = 18;
  const OFFSET_Y = 18;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // Horizontal position: flip left if overflowing right edge
  let posX = position.x + OFFSET_X;
  if (posX + CARD_WIDTH > vw - 16) {
    posX = position.x - CARD_WIDTH - OFFSET_X;
  }
  posX = Math.max(12, Math.min(vw - CARD_WIDTH - 12, posX));

  // Vertical position: flip up if overflowing bottom edge
  let posY = position.y + OFFSET_Y;
  if (posY + CARD_HEIGHT > vh - 16) {
    posY = position.y - CARD_HEIGHT - OFFSET_Y;
  }
  posY = Math.max(12, Math.min(vh - CARD_HEIGHT - 12, posY));

  // Verification & Confidence logic
  const hasConflict = !!node.isConflictFlagged || (node.activeConflicts && node.activeConflicts.length > 0);
  const confidenceScore = node.confidenceScore !== undefined 
    ? node.confidenceScore 
    : (node.isGroundVerified ? 100 : (node.confidenceLevel === 'HIGH' ? 90 : (node.confidenceLevel === 'MEDIUM' ? 70 : 50)));

  return createPortal(
    <div
      data-hud-tooltip="true"
      style={{
        position: 'fixed',
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${CARD_WIDTH}px`,
        zIndex: 99999999,
        pointerEvents: 'auto'
      }}
      className="transition-all duration-150 animate-in fade-in zoom-in-95 select-none"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div 
        className="relative overflow-hidden rounded-xl border bg-[#020912]/95 p-3.5 font-mono text-xs text-slate-100 shadow-[0_0_35px_rgba(0,0,0,0.9)] backdrop-blur-2xl ring-1 ring-white/15"
        style={{
          borderColor: `${brandColor}77`,
          boxShadow: `0 0 25px ${brandColor}25, 0 10px 40px rgba(0,0,0,0.95)`
        }}
      >
        {/* Cyber Tactical Corner Accents */}
        <span className="absolute left-0 top-0 h-2.5 w-2.5 border-l-2 border-t-2" style={{ borderColor: brandColor }} />
        <span className="absolute right-0 top-0 h-2.5 w-2.5 border-r-2 border-t-2" style={{ borderColor: brandColor }} />
        <span className="absolute bottom-0 left-0 h-2.5 w-2.5 border-b-2 border-l-2" style={{ borderColor: brandColor }} />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b-2 border-r-2" style={{ borderColor: brandColor }} />

        {/* Subtle Scanline Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px]"
        />

        {/* TOP STATUS BAR */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border shadow-sm"
              style={{
                backgroundColor: `${brandColor}20`,
                borderColor: `${brandColor}55`,
                color: brandColor
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: brandColor }} />
              {meta.brandName || node.type?.toUpperCase() || 'ENTITI OSINT'}
            </span>

            {node.vaultMatch && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Database size={9} />
                VAULT
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasConflict ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse">
                <AlertTriangle size={9} />
                KONFLIK
              </span>
            ) : node.isGroundVerified ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 size={9} />
                VERIFIED
              </span>
            ) : (
              <span className="text-[8px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                KEYAKINAN: {confidenceScore}%
              </span>
            )}

            {/* DELETE NODE TRASH ICON BUTTON */}
            {onDeleteNode && (
              confirmingDelete ? (
                <div className="flex items-center gap-1 ml-1 shrink-0 animate-in fade-in duration-150">
                  <button
                    type="button"
                    id={`hud-delete-confirm-${node.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteNode(node.id);
                      if (onClose) onClose();
                    }}
                    className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer pointer-events-auto shadow-[0_0_10px_rgba(225,29,72,0.5)] active:scale-95 transition-all"
                    title="Sahkan padam nod ini sekarang"
                  >
                    <Check size={9} className="stroke-[3]" />
                    <span>Padam?</span>
                  </button>
                  <button
                    type="button"
                    id={`hud-delete-cancel-${node.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setConfirmingDelete(false);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[8px] cursor-pointer pointer-events-auto border border-white/10"
                    title="Batal padam"
                  >
                    <X size={9} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id={`hud-delete-btn-${node.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setConfirmingDelete(true);
                  }}
                  className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-200 border border-rose-500/40 hover:border-rose-500/70 transition-all duration-150 flex items-center justify-center cursor-pointer pointer-events-auto hover:scale-110 active:scale-95 ml-1 shrink-0"
                  title="Padam Nod Ini (Delete Node)"
                >
                  <Trash2 size={11} className="text-rose-400" />
                </button>
              )
            )}

            {/* CLOSE HUD BUTTON */}
            {onClose && (
              <button
                type="button"
                id={`hud-close-btn-${node.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onClose();
                }}
                className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/10 transition-colors flex items-center justify-center cursor-pointer pointer-events-auto ml-0.5"
                title="Tutup HUD Tooltip"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* MAIN IDENTITY & AVATAR SECTION */}
        <div className="flex items-start gap-3 mb-2.5">
          {/* Avatar or Icon Frame */}
          <div className="relative shrink-0">
            {displayImage ? (
              <div 
                className="w-12 h-12 rounded-lg overflow-hidden border-2 bg-black relative shadow-inner group"
                style={{ borderColor: brandColor }}
              >
                <img 
                  src={getProxiedImageUrl(displayImage) || displayImage} 
                  alt={node.label || node.id}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src.includes('/api/proxy-image') && displayImage) {
                      target.src = displayImage;
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                />
                <div 
                  className="absolute inset-0 border border-white/20 pointer-events-none rounded-md"
                />
              </div>
            ) : (
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center border-2 bg-black/60 shadow-inner"
                style={{ 
                  borderColor: `${brandColor}88`,
                  backgroundColor: `${brandColor}15` 
                }}
              >
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-6 h-6"
                  style={{ fill: meta.brand === 'github' ? '#ffffff' : brandColor }}
                >
                  <path d={meta.svgPath} />
                </svg>
              </div>
            )}
            
            {/* Mini Radar Node Indicator */}
            <div 
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#020912] border flex items-center justify-center shadow-md"
              style={{ borderColor: brandColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brandColor }} />
            </div>
          </div>

          {/* Target Name & Unique Identifiers */}
          <div className="min-w-0 flex-1">
            <h4 
              className="text-sm font-bold truncate leading-tight tracking-wide"
              style={{ color: brandColor }}
              title={node.label || node.id}
            >
              {node.label || node.id}
            </h4>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 truncate">
              <Fingerprint size={10} className="shrink-0 text-slate-500" />
              <span className="truncate">ID: {node.id}</span>
            </div>
            {node.sourceType && (
              <div className="text-[9px] text-teal-400 font-mono mt-0.5 truncate">
                SUMBER: {node.sourceType.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* METRICS & ATTRIBUTES GRID */}
        <div className="grid grid-cols-2 gap-1.5 mb-2.5 text-[9.5px]">
          {/* Sambungan Graf */}
          <div className="bg-white/5 p-1.5 rounded border border-white/10 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Share2 size={10} className="text-cyan-400" />
              HUBUNGAN:
            </span>
            <span className="font-bold text-white">
              {connectionCount} {connectionCount === 1 ? 'Nod' : 'Nod'}
            </span>
          </div>

          {/* Koordinat GPS / Lokasi (Bersyarat mengikut kehadiran data lokasi sebenar) */}
          <div className="bg-white/5 p-1.5 rounded border border-white/10 flex items-center justify-between truncate">
            <span className="text-slate-400 flex items-center gap-1 shrink-0">
              <MapPin size={10} className={hasLocationData ? "text-emerald-400" : "text-slate-500"} />
              LOKASI:
            </span>
            <span className={`font-bold truncate ml-1 text-[8.5px] ${hasLocationData ? 'text-emerald-300' : 'text-slate-400'}`}>
              {node.lat !== undefined && (node.lng !== undefined || (node as any).lon !== undefined)
                ? `${node.lat.toFixed(3)}, ${((node.lng ?? (node as any).lon) as number).toFixed(3)}`
                : (hasLocationData ? (geoCoordinates?.name || 'Aktif Peta') : 'Tiada Data GPS')}
            </span>
          </div>
        </div>

        {/* ALIASES / TAGS (if available) */}
        {((node.aliases && node.aliases.length > 0) || (node.tags && node.tags.length > 0)) && (
          <div className="mb-2 flex flex-wrap gap-1">
            {node.aliases?.slice(0, 3).map((alias, idx) => (
              <span key={`a-${idx}`} className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[8px] truncate max-w-[120px]">
                aka: {alias}
              </span>
            ))}
            {node.tags?.slice(0, 3).map((tag, idx) => (
              <span key={`t-${idx}`} className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[8px] flex items-center gap-0.5">
                <Tag size={7} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* INTEL REPORT / DETAILS SNIPPET */}
        {node.details && (
          <div className="bg-black/60 p-2 rounded border border-white/10 mb-2.5">
            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Cpu size={9} className="text-cyan-400" />
              RINGKASAN INTELIJEN:
            </div>
            <p className="text-[10px] text-slate-300 line-clamp-3 leading-relaxed font-sans select-text">
              {node.details}
            </p>
          </div>
        )}

        {/* QUICK INVESTIGATIVE ACTION BAR (BAR TINDAKAN PANTAS SIASATAN) */}
        <div className="mb-2.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-1.5">
          <div className="text-[8px] font-bold tracking-wider text-cyan-400/90 uppercase mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Target size={9} className="text-cyan-400 animate-pulse" />
              TINDAKAN PANTAS SIASATAN
            </span>
            {copied && (
              <span className="text-[8px] text-emerald-400 font-bold flex items-center gap-0.5 animate-in fade-in">
                <Check size={8} />
                DISALIN!
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1">
            {/* 1. AI Deep Recon */}
            <button
              type="button"
              id={`hud-action-recon-${node.id}`}
              onClick={handleAiDeepRecon}
              className="flex flex-col items-center justify-center p-1.5 rounded bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-cyan-100 transition-all cursor-pointer pointer-events-auto active:scale-95 group"
              title="Jalankan AI Deep Recon / Imbasan OSINT"
            >
              <Sparkles size={12} className="text-cyan-400 group-hover:scale-110 transition-transform mb-0.5" />
              <span className="text-[7.5px] font-bold uppercase tracking-tight">AI Recon</span>
            </button>

            {/* 2. Expand Connections */}
            <button
              type="button"
              id={`hud-action-expand-${node.id}`}
              onClick={handleExpandConnections}
              className="flex flex-col items-center justify-center p-1.5 rounded bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-100 transition-all cursor-pointer pointer-events-auto active:scale-95 group"
              title="Kembangkan sambungan & analisis hubungan entiti"
            >
              <GitFork size={12} className="text-purple-400 group-hover:scale-110 transition-transform mb-0.5" />
              <span className="text-[7.5px] font-bold uppercase tracking-tight">Expand</span>
            </button>

            {/* 3. Copy Label / Value */}
            <button
              type="button"
              id={`hud-action-copy-${node.id}`}
              onClick={handleCopyText}
              className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all cursor-pointer pointer-events-auto active:scale-95 group ${
                copied 
                  ? 'bg-emerald-500/30 border-emerald-500/70 text-emerald-300' 
                  : 'bg-slate-700/30 hover:bg-slate-700/50 border-white/20 text-slate-200 hover:text-white'
              }`}
              title="Salin nama entiti / ID ke klipbod"
            >
              {copied ? (
                <Check size={12} className="text-emerald-400 mb-0.5" />
              ) : (
                <Copy size={12} className="text-slate-300 group-hover:scale-110 transition-transform mb-0.5" />
              )}
              <span className="text-[7.5px] font-bold uppercase tracking-tight">{copied ? 'Disalin' : 'Salin'}</span>
            </button>

            {/* 4. Toggle Ground Truth / Conflict */}
            <button
              type="button"
              id={`hud-action-verify-${node.id}`}
              onClick={handleToggleGroundTruth}
              className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all cursor-pointer pointer-events-auto active:scale-95 group ${
                node.isGroundVerified
                  ? 'bg-emerald-500/25 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/40'
                  : 'bg-emerald-950/30 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:text-emerald-200'
              }`}
              title={node.isGroundVerified ? 'Entiti ini telah disahkan sebagai Ground Truth' : 'Tandai entiti ini sebagai Ground Truth disahkan'}
            >
              <ShieldCheck size={12} className="text-emerald-400 group-hover:scale-110 transition-transform mb-0.5" />
              <span className="text-[7.5px] font-bold uppercase tracking-tight">{node.isGroundVerified ? 'Sah ✓' : 'Sahkan'}</span>
            </button>
          </div>

          {/* Secondary Action Row: Geospatial Satellite (Only if Location exists) OR OSINT Web Recon (if no Location) + Conflict Toggle + Full Details */}
          <div className="flex items-center gap-1 mt-1 pt-1 border-t border-white/5">
            {/* Geospatial Map button - ONLY shown if node contains location data */}
            {hasLocationData ? (
              <button
                type="button"
                id={`hud-action-map-${node.id}`}
                onClick={handleOpenMap}
                className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 text-[8px] font-bold transition-all cursor-pointer pointer-events-auto"
                title="Buka radar peta taktikal geospatial"
              >
                <Navigation size={10} className="text-emerald-400" />
                <span>PETA GPS</span>
              </button>
            ) : (
              <button
                type="button"
                id={`hud-action-web-verify-${node.id}`}
                onClick={handleOpenWebVerify}
                className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40 text-[8px] font-bold transition-all cursor-pointer pointer-events-auto group"
                title="Jalankan carian OSINT langsung & pengesahan fakta internet"
              >
                <Search size={10} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>SIASATAN WEB</span>
              </button>
            )}

            {/* Flag / Unflag Conflict */}
            <button
              type="button"
              id={`hud-action-conflict-${node.id}`}
              onClick={handleToggleConflict}
              className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded border text-[8px] font-bold transition-all cursor-pointer pointer-events-auto ${
                node.isConflictFlagged
                  ? 'bg-rose-500/30 border-rose-500/60 text-rose-300'
                  : 'bg-rose-950/20 hover:bg-rose-500/20 border-rose-500/30 text-rose-400 hover:text-rose-200'
              }`}
              title="Tandai / bersihkan konflik data"
            >
              <AlertTriangle size={10} />
              <span>{node.isConflictFlagged ? 'BATAL KONFLIK' : 'TANDAI KONFLIK'}</span>
            </button>

            {/* Open Full Notes / Inspector */}
            <button
              type="button"
              id={`hud-action-details-${node.id}`}
              onClick={handleOpenDetails}
              className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-slate-800/60 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white text-[8px] font-bold transition-all cursor-pointer pointer-events-auto"
              title="Buka panel perincian penuh entiti"
            >
              <FileText size={10} className="text-cyan-400" />
              <span>PANEL NOTA</span>
            </button>
          </div>
        </div>

        {/* TACTICAL HOTKEYS / QUICK GUIDE FOOTER */}
        <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[8.5px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-300 font-bold">[KLIK]</span>
            <span className="text-slate-300">Pilih / Perincian</span>
          </div>

          {/* Dwi-Klik: HANYA paparkan 'Fokus Peta' jika nod mempunyai data lokasi! Jika tiada lokasi, paparkan 'Siasatan Web' */}
          {hasLocationData ? (
            <div className="flex items-center gap-1.5">
              <span className="text-amber-300 font-bold">[DWI-KLIK]</span>
              <span className="text-emerald-300 font-semibold">Fokus Peta</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="font-bold text-cyan-300">[DWI-KLIK]</span>
              <span className="text-cyan-200">Siasatan Web</span>
            </div>
          )}

          {onDeleteNode && (
            <button
              type="button"
              id={`hud-delete-footer-${node.id}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDeleteNode(node.id);
                if (onClose) onClose();
              }}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:underline cursor-pointer pointer-events-auto transition-colors ml-auto active:scale-95"
              title="Padam nod ini serta-merta dari kanvas graf"
            >
              <Trash2 size={10} />
              <span className="font-bold">[PADAM NOD]</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NodeHudTooltip;

