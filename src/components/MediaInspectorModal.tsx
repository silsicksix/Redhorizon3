import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Film, 
  Music, 
  Clock, 
  HardDrive, 
  Maximize2, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Layers, 
  Hash, 
  Info, 
  ShieldCheck, 
  Share2, 
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  inspectMediaForensics, 
  MediaForensicMetadata, 
  formatBytes 
} from '../services/mediaForensicsService';

interface MediaInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaSource: {
    url?: string;
    file?: File | Blob;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
  } | null;
  onPinToCanvas?: (meta: MediaForensicMetadata) => void;
}

export const MediaInspectorModal: React.FC<MediaInspectorModalProps> = ({
  isOpen,
  onClose,
  mediaSource,
  onPinToCanvas
}) => {
  const [metadata, setMetadata] = useState<MediaForensicMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (!isOpen || !mediaSource) {
      setMetadata(null);
      return;
    }

    let isMounted = true;
    const inspect = async () => {
      setIsLoading(true);
      try {
        const source = mediaSource.file || mediaSource.url || '';
        const meta = await inspectMediaForensics(source, mediaSource.fileName, mediaSource.mimeType);
        if (isMounted) {
          if (mediaSource.fileSize && !meta.fileSize) {
            meta.fileSize = mediaSource.fileSize;
          }
          setMetadata(meta);
        }
      } catch (err) {
        console.error('Media forensic scan failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    inspect();

    return () => {
      isMounted = false;
    };
  }, [isOpen, mediaSource]);

  if (!isOpen || !mediaSource) return null;

  const isVideo = metadata?.mediaType === 'video' || mediaSource.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(mediaSource.fileName);
  const isAudio = metadata?.mediaType === 'audio' || mediaSource.mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(mediaSource.fileName);
  const mediaUrl = mediaSource.url || (mediaSource.file ? URL.createObjectURL(mediaSource.file) : '');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              {isVideo ? <Film size={18} /> : isAudio ? <Music size={18} /> : <FileText size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-cyan-400 font-mono">TACTICAL MEDIA FORENSICS</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 font-mono">
                  {isVideo ? 'VIDEO ASSET' : isAudio ? 'AUDIO STREAM' : 'BINARY FILE'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white truncate max-w-md">{mediaSource.fileName}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPinToCanvas && metadata && (
              <button
                onClick={() => {
                  onPinToCanvas(metadata);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                title="Sematkan fail media ini sebagai nod bukti ke atas Canvas"
              >
                <Layers size={13} />
                <span>Semat ke Canvas</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Main Tactical Player View */}
          <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
            {isVideo && mediaUrl ? (
              <div className="relative group bg-black flex flex-col items-center justify-center min-h-[260px] max-h-[380px]">
                <video 
                  ref={videoRef}
                  src={mediaUrl} 
                  controls 
                  playsInline 
                  className="w-full max-h-[380px] object-contain rounded-t-lg"
                />
              </div>
            ) : isAudio && mediaUrl ? (
              <div className="p-6 flex flex-col gap-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/20 rounded-full text-cyan-400 animate-pulse">
                      <Volume2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{mediaSource.fileName}</h4>
                      <p className="text-xs text-cyan-400 font-mono">
                        {metadata?.formattedDuration || '00:00'} • {formatBytes(metadata?.fileSize || mediaSource.fileSize || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Playback speed selector */}
                  <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-slate-400 px-1 font-mono">Kelajuan:</span>
                    {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setPlaybackSpeed(rate)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                          playbackSpeed === rate 
                            ? 'bg-cyan-500 text-slate-950' 
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                <audio 
                  ref={audioRef}
                  src={mediaUrl} 
                  controls 
                  className="w-full accent-cyan-500" 
                />
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Tiada pemapar langsung untuk jenis dokumen ini. Sila semak metadata terperinci di bawah.
              </div>
            )}
          </div>

          {/* Forensic Metadata Inspector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Column 1: Core Identifiers */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono border-b border-slate-800 pb-2">
                <Info size={14} /> PENGECAM STRUKTUR
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Saiz Fail:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {formatBytes(metadata?.fileSize || mediaSource.fileSize || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MIME / Container:</span>
                  <span className="font-mono text-cyan-300 truncate block">
                    {metadata?.mimeType || mediaSource.mimeType || 'unknown/binary'}
                  </span>
                </div>
                {metadata?.formattedDuration && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tempoh Durasi:</span>
                    <span className="font-mono text-emerald-400 font-bold">{metadata.formattedDuration}</span>
                  </div>
                )}
                {metadata?.dimensions && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Dimensi & Nisbah:</span>
                    <span className="font-mono text-slate-200">
                      {metadata.dimensions.width} x {metadata.dimensions.height} ({metadata.dimensions.aspectRatio})
                    </span>
                  </div>
                )}
                {metadata?.bitrateEstimate && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Anggaran Bitrate:</span>
                    <span className="font-mono text-amber-400">{metadata.bitrateEstimate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Codec & Technical Header */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono border-b border-slate-800 pb-2">
                <ShieldCheck size={14} /> KONTENA & ENCODER
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Maklumat Kontena Codec:</span>
                  <span className="font-mono text-slate-200 text-[11px] block">
                    {metadata?.codecInfo || metadata?.tags?.encoder || 'Standard Stream Container'}
                  </span>
                </div>
                {metadata?.lastModified && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Cap Masa Fail (Modified):</span>
                    <span className="font-mono text-slate-300 text-[10px]">{metadata.lastModified}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block text-[10px]">Protokol Penghantaran:</span>
                  <span className="font-mono text-sky-400 text-[11px] font-bold">
                    {mediaUrl.includes('telegram') ? '✈️ Telegram Headless Cloud Relay' : '🌐 Direct Web Stream / Blob'}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: Cryptographic Integrity */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono border-b border-slate-800 pb-2">
                <Hash size={14} /> INTEGRITI FORENSIK
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">SHA-256 Checksum:</span>
                  {metadata?.integrityHash?.sha256 ? (
                    <div className="mt-1 flex items-center gap-1.5 bg-slate-900 p-1.5 rounded border border-slate-800">
                      <span className="font-mono text-[9px] text-cyan-300 break-all leading-tight">
                        {metadata.integrityHash.sha256}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(metadata.integrityHash?.sha256 || '');
                          setCopiedHash(true);
                          setTimeout(() => setCopiedHash(false), 2000);
                        }}
                        className="text-[9px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded shrink-0"
                      >
                        {copiedHash ? '✓' : 'Salin'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-[10px] font-mono">Dikecualikan (&gt;15MB) untuk prestasi</span>
                  )}
                </div>

                {metadata?.rawHexDumpHeader && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Magic Byte Header (Hex):</span>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800 mt-1 max-h-16 overflow-y-auto">
                      <span className="font-mono text-[9px] text-slate-400 break-all block leading-tight">
                        {metadata.rawHexDumpHeader.slice(0, 70)}...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Pemeriksa Forensik Media RedHorizon OSINT • Sedia untuk analisis risikan lanjutan</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all text-xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
