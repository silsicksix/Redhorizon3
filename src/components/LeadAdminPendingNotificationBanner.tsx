import React, { useEffect, useRef, useState } from 'react';
import { 
  ShieldAlert, ShieldCheck, UserCheck, UserX, Clock, ChevronRight, 
  Sparkles, X, Mail, Bell, BellRing, Volume2, VolumeX, CheckCircle2 
} from 'lucide-react';
import { 
  AccessRequest, 
  updateAccessRequestStatus, 
  LEAD_ADMIN_EMAIL 
} from '../services/firebase';

interface LeadAdminPendingNotificationBannerProps {
  pendingRequests: AccessRequest[];
  onOpenApprovalPortal: () => void;
  currentUserEmail?: string | null;
}

// Simple Web Audio API Synth to play tactical alert chime for new pending request
const playTacticalChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Note 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    // Note 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (_) {
    // AudioContext autoplay restriction safeguard
  }
};

export const LeadAdminPendingNotificationBanner: React.FC<LeadAdminPendingNotificationBannerProps> = ({
  pendingRequests,
  onOpenApprovalPortal,
  currentUserEmail
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [lastNotifiedCount, setLastNotifiedCount] = useState(0);
  const [quickSuccessMsg, setQuickSuccessMsg] = useState<string | null>(null);

  const pendingCount = pendingRequests.length;

  // Play sound when new pending requests arrive
  useEffect(() => {
    if (pendingCount > lastNotifiedCount && pendingCount > 0) {
      if (soundEnabled) {
        playTacticalChime();
      }
      setIsMinimized(false); // Pop open if minimized
    }
    setLastNotifiedCount(pendingCount);
  }, [pendingCount, lastNotifiedCount, soundEnabled]);

  if (pendingCount === 0) return null;

  const latestRequest = pendingRequests[0];

  const handleQuickApprove = async (req: AccessRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(req.uid);
    try {
      await updateAccessRequestStatus(req.uid, 'approved', 'investigator', 'Diluluskan segera melalui Notis Header Lead Admin', currentUserEmail || LEAD_ADMIN_EMAIL);
      setQuickSuccessMsg(`Akses ${req.displayName} (${req.email}) DILULUSKAN!`);
      setTimeout(() => setQuickSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Quick approve error:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickReject = async (req: AccessRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(req.uid);
    try {
      await updateAccessRequestStatus(req.uid, 'rejected', 'investigator', 'Ditolak melalui Notis Header Lead Admin', currentUserEmail || LEAD_ADMIN_EMAIL);
      setQuickSuccessMsg(`Permohonan ${req.displayName} ditolak.`);
      setTimeout(() => setQuickSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Quick reject error:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed top-14 right-4 z-[9998] cursor-pointer animate-bounce select-none font-mono"
        title="Klik untuk melihat butiran permohonan penyiasat baru"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-slate-950 font-black text-xs border-2 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.9)] ring-2 ring-amber-400">
          <BellRing size={15} className="animate-spin text-slate-950" />
          <span>{pendingCount} PERMOHONAN BARU</span>
        </div>
      </div>
    );
  }

  return (
    <aside aria-label="Notifikasi Permohonan Siasatan" className="fixed top-12 left-1/2 -translate-x-1/2 z-[9998] w-[95%] max-w-4xl select-none font-mono transition-all duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-slate-950/95 border-2 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.5)] text-slate-100 p-3 sm:p-4 backdrop-blur-xl ring-2 ring-amber-500/40">
        
        {/* Glow corner indicator */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {quickSuccessMsg ? (
          <div className="flex items-center justify-between py-1 px-2 text-emerald-400 font-bold text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{quickSuccessMsg}</span>
            </div>
            <button 
              onClick={() => setQuickSuccessMsg(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
            >
              OK
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            
            {/* Left: Lead Alert Icon + User Details */}
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-amber-600/30 border border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                  <ShieldAlert size={22} className="animate-pulse" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center border border-white shadow">
                  {pendingCount}
                </span>
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                
                {/* Header Tag */}
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="px-2 py-0.2 rounded bg-amber-500 text-slate-950 font-black text-[9.5px] uppercase tracking-wider">
                    PERMOHONAN SIASATAN BARU
                  </span>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    {pendingCount === 1 ? '1 orang rakan menunggu' : `${pendingCount} orang rakan menunggu`}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    • {new Date(latestRequest.requestedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* User Identity Info */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <strong className="text-white font-bold truncate">{latestRequest.displayName}</strong>
                  <span className="text-cyan-300 text-[11px] flex items-center gap-1 truncate font-mono">
                    <Mail size={11} className="text-cyan-400 shrink-0" />
                    {latestRequest.email}
                  </span>
                </div>

                {/* Optional Note / Department if provided */}
                {(latestRequest.notes || latestRequest.department) && (
                  <p className="text-[10.5px] text-slate-300 mt-0.5 line-clamp-1 italic text-slate-300">
                    "{latestRequest.notes || latestRequest.department}"
                  </p>
                )}
              </div>

            </div>

            {/* Right: Instant Action Controls */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
              
              {/* Audio toggle button */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Bunyi amaran aktif" : "Bunyi amaran disenyapkan"}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  soundEnabled 
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900' 
                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                }`}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>

              {/* Quick Instant Approve Button */}
              <button
                disabled={actionLoadingId === latestRequest.uid}
                onClick={(e) => handleQuickApprove(latestRequest, e)}
                className="py-2 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <UserCheck size={14} className="stroke-[3]" />
                <span>Luluskan Sekarang</span>
              </button>

              {/* View all portal modal button */}
              <button
                onClick={onOpenApprovalPortal}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <span>Portal ({pendingCount})</span>
                <ChevronRight size={13} />
              </button>

              {/* Minimize/Close banner */}
              <button
                onClick={() => setIsMinimized(true)}
                title="Kecilkan notis"
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

          </div>
        )}

      </div>
    </aside>
  );
};
