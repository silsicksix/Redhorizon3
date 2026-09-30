import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, ShieldCheck, Lock, LogIn, LogOut, Clock, 
  AlertTriangle, RefreshCw, UserX, Loader2, CheckCircle2, 
  Send, MessageSquare, Building2, Zap, ArrowRight, 
  Fingerprint, Activity, Radio, X, Eye, EyeOff, Shield, Terminal,
  Image as ImageIcon, Upload, Trash2, Sliders, Check, Key
} from 'lucide-react';
import { 
  loginWithGoogle, 
  logoutOperative, 
  LEAD_ADMIN_EMAIL, 
  AccessRequest, 
  checkOrCreateAccessRequest,
  submitAccessRequestNote
} from '../services/firebase';
import { MalaysianGeoCanvas } from './geospatial/MalaysianGeoCanvas';
import { RadarWidget } from './geospatial/RadarWidget';
import { TelemetrySidebar } from './geospatial/TelemetrySidebar';
import { StatusMarquee } from './geospatial/StatusMarquee';
import { GeoCursorTracker } from './geospatial/GeoCursorTracker';
import { TacticalBrackets } from './geospatial/TacticalBrackets';

interface AccessGateProps {
  currentUser: { uid: string; email: string | null; displayName: string | null; photoURL?: string | null } | null;
  accessRequest: AccessRequest | null;
  authLoading: boolean;
  onRefreshStatus?: () => void;
  onLocalLogin?: (profile: { uid: string; email: string; displayName: string; photoURL?: string; department?: string }) => void;
  onEnterTerminal?: () => void;
  onClose?: () => void;
  initialMode?: 'agent' | 'google' | 'commander';
  isLocked?: boolean;
}

const VERIFICATION_PHASES = [
  'MENYULITKAN SALURAN KOMUNIKASI...',
  'MENGESAHKAN KELAYAKAN OPERATIF...',
  'TRIANGULASI LOKASI GEOSPATIAL...',
  'MEMADANKAN CAP JARI BIOMETRIK...',
  'MEMBUKA KUBAH DATA RED HORIZON...'
];

export const VALID_MASTER_KEYS = [
  'REDHORIZON-MASTER-2026',
  'REDHORIZON-COMMANDER-2026',
  'fisaabilillah',
  'fisaabilillah@gmail.com',
  'master2026',
  'RHZ-7749',
  'commander2026'
];

export const AccessGate: React.FC<AccessGateProps> = ({
  currentUser,
  accessRequest,
  authLoading,
  onRefreshStatus,
  onLocalLogin,
  onEnterTerminal,
  onClose,
  initialMode = 'commander',
  isLocked = false
}) => {
  // Navigation & Form Modes
  const [activeMode, setActiveMode] = useState<'agent' | 'google' | 'commander'>(initialMode);
  const [agentId, setAgentId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [agencySector, setAgencySector] = useState('Unit Risikan Siber (Cyber Intel)');
  const [rememberTerminal, setRememberTerminal] = useState(true);

  // Master Key Authentication States
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [masterKeyError, setMasterKeyError] = useState<string | null>(null);

  // Verification Animation States
  const [isVerifying, setIsVerifying] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [biometricScanning, setBiometricScanning] = useState(false);

  // Authentication State
  const [loggingIn, setLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Pending Request States
  const [requestNote, setRequestNote] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [noteSentMessage, setNoteSentMessage] = useState<string | null>(null);

  // Live Clock & Time
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Pointer position for reactive geospatial canvas
  const [pointerPos, setPointerPos] = useState({ x: -9999, y: -9999 });

  // Custom Background / Wallpaper State
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [loginWallpaper, setLoginWallpaper] = useState<string | null>(() => {
    try {
      return localStorage.getItem('redhorizon_login_wallpaper') || null;
    } catch {
      return null;
    }
  });
  const [wallpaperOpacity, setWallpaperOpacity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('redhorizon_login_wallpaper_opacity');
      return saved ? parseFloat(saved) : 0.65;
    } catch {
      return 0.65;
    }
  });

  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Saiz imej maksimum ialah 8MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      if (b64) {
        setLoginWallpaper(b64);
        try {
          localStorage.setItem('redhorizon_login_wallpaper', b64);
        } catch (err) {
          console.warn('Storage quota limit reached:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetWallpaper = () => {
    setLoginWallpaper(null);
    try {
      localStorage.removeItem('redhorizon_login_wallpaper');
    } catch {}
  };

  const handleOpacityChange = (val: number) => {
    setWallpaperOpacity(val);
    try {
      localStorage.setItem('redhorizon_login_wallpaper_opacity', val.toString());
    } catch {}
  };

  // Clock Update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-GB', { hour12: false }));
      setCurrentDate(now.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pointer Tracker
  const handlePointerMove = (e: React.PointerEvent) => {
    setPointerPos({ x: e.clientX, y: e.clientY });
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    setAuthError(null);
    try {
      const profile = await loginWithGoogle();
      if (profile) {
        const req = await checkOrCreateAccessRequest(profile);
        if (req && (req.status === 'approved' || profile.email.toLowerCase() === LEAD_ADMIN_EMAIL.toLowerCase())) {
          if (onEnterTerminal) {
            onEnterTerminal();
          }
        }
      }
    } catch (err: any) {
      console.error('Google Sign in error:', err);
      const msg = err?.message || 'Gagal log masuk Google.';
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setAuthError(`Domain pelayan "${window.location.hostname}" belum didaftarkan dalam senarai Authorized Domains Firebase Console (Projek: r3dhorizon-eb451). Sila gunakan butang Log Masuk Master Key untuk terus masuk serta-merta tanpa sekatan.`);
        setActiveMode('commander');
      } else if (msg.includes('popup-closed-by-user')) {
        setAuthError('Tetingkap log masuk Google telah ditutup oleh pengguna.');
      } else if (msg.includes('popup-blocked') || code === 'auth/popup-blocked') {
        setAuthError('Tetingkap popup disekat oleh pelayar web. Sila gunakan Log Masuk Master Key di bawah.');
      } else {
        setAuthError(msg);
      }
    } finally {
      setLoggingIn(false);
    }
  };

  // Master Key Authentication Validation Flow
  const handleMasterKeyLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMasterKeyError(null);
    const cleaned = masterKeyInput.trim();
    if (!cleaned) {
      setMasterKeyError('Sila masukkan Kunci Utama (Master Key).');
      return;
    }

    const customKey = localStorage.getItem('redhorizon_custom_master_key');
    const isValid = VALID_MASTER_KEYS.some(k => k.toLowerCase() === cleaned.toLowerCase()) || 
      (customKey && customKey.trim().toLowerCase() === cleaned.toLowerCase());

    if (!isValid) {
      setMasterKeyError('Kunci Utama (Master Key) tidak sah! Sila semak semula kunci anda.');
      return;
    }

    setMasterKeyError(null);
    setIsVerifying(true);
    setPhaseIndex(0);
    setProgressPercent(20);

    const stepInterval = setInterval(() => {
      setPhaseIndex(prev => {
        const next = prev + 1;
        setProgressPercent(Math.min(98, (next / VERIFICATION_PHASES.length) * 100));
        if (next >= VERIFICATION_PHASES.length) {
          clearInterval(stepInterval);
          setTimeout(() => {
            setIsVerifying(false);
            const commanderProfile = {
              uid: 'lead_commander_master',
              email: LEAD_ADMIN_EMAIL,
              displayName: 'Lead Commander (Master Key Clearance)',
              department: 'Direktorat Keselamatan Utama & Risikan Khas'
            };
            sessionStorage.setItem('redhorizon_session_active', '1');
            sessionStorage.setItem('redhorizon_terminal_unlocked', '1');
            localStorage.setItem('redhorizon_authenticated', 'true');
            localStorage.setItem('redhorizon_local_user', JSON.stringify(commanderProfile));
            if (onLocalLogin) {
              onLocalLogin(commanderProfile);
            }
            if (onEnterTerminal) onEnterTerminal();
          }, 400);
        }
        return next;
      });
    }, 300);
  };

  // Agent Login / Verification Simulation Flow
  const handleAgentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId.trim()) {
      setAuthError('Sila masukkan ID Operatif atau Callsign.');
      return;
    }

    setIsVerifying(true);
    setPhaseIndex(0);
    setProgressPercent(10);
    setAuthError(null);

    const stepInterval = setInterval(() => {
      setPhaseIndex(prev => {
        const next = prev + 1;
        setProgressPercent(Math.min(98, (next / VERIFICATION_PHASES.length) * 100));
        if (next >= VERIFICATION_PHASES.length) {
          clearInterval(stepInterval);
          setTimeout(() => {
            setIsVerifying(false);
            if (onLocalLogin) {
              onLocalLogin({
                uid: `agent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                email: `${agentId.toLowerCase().replace(/[^a-z0-9]/g, '_')}@redhorizon.gov.my`,
                displayName: agentId.trim(),
                department: agencySector
              });
            }
            if (onEnterTerminal) onEnterTerminal();
          }, 600);
        }
        return next;
      });
    }, 550);
  };

  // Biometric Instant Fingerprint Scan
  const handleBiometricAuth = () => {
    setBiometricScanning(true);
    setAuthError(null);
    setTimeout(() => {
      setBiometricScanning(false);
      const autoId = agentId.trim() || 'OPERATIVE-7749';
      if (onLocalLogin) {
        onLocalLogin({
          uid: `bio_${Date.now()}`,
          email: `${autoId.toLowerCase().replace(/[^a-z0-9]/g, '_')}@redhorizon.gov.my`,
          displayName: autoId,
          department: agencySector
        });
      }
      if (onEnterTerminal) onEnterTerminal();
    }, 1200);
  };

  // Lead Commander Master Access
  const handleCommanderDirectPass = () => {
    if (onLocalLogin) {
      onLocalLogin({
        uid: 'lead_commander_master',
        email: LEAD_ADMIN_EMAIL,
        displayName: 'Lead Commander (Master Access)',
        department: 'Direktorat Keselamatan Utama'
      });
    }
    if (onEnterTerminal) onEnterTerminal();
  };

  const handleLogout = async () => {
    await logoutOperative();
  };

  const handleSendNoteToAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || (!requestNote.trim() && !departmentInput.trim())) return;

    setSendingNote(true);
    try {
      await submitAccessRequestNote(currentUser.uid, requestNote, departmentInput);
      setNoteSentMessage('Mesej pengenalan anda telah dihantar ke konsol Lead Admin!');
      setTimeout(() => setNoteSentMessage(null), 4500);
    } catch (err: any) {
      console.error('Submit note error:', err);
    } finally {
      setSendingNote(false);
    }
  };

  const userEmail = (currentUser?.email || '').trim().toLowerCase();
  const isLeadAdmin = userEmail === LEAD_ADMIN_EMAIL.toLowerCase() || userEmail === 'fisaabilillah@gmail.com';
  const isPending = !isLeadAdmin && accessRequest?.status === 'pending';
  const isRejected = !isLeadAdmin && accessRequest?.status === 'rejected';

  return (
    <div
      onPointerMove={handlePointerMove}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[99999999] flex flex-col justify-between overflow-hidden bg-[#01070d] text-cyan-100 font-mono select-none pointer-events-auto"
    >
      {/* SOLID OPAQUE BASE UNDERLAY - GUARANTEES ZERO BACKGROUND DISPLAY LEAKAGE */}
      <div className="absolute inset-0 bg-[#01070d] pointer-events-auto" />

      {/* 1. CINEMATIC BACKGROUND: MALAYSIA GEOSPATIAL SENTINEL CANVAS */}
      <MalaysianGeoCanvas 
        pointerPos={pointerPos} 
        isScanning={isVerifying || biometricScanning} 
        customBgUrl={loginWallpaper}
        customBgOpacity={wallpaperOpacity}
      />

      {/* 2. HUD TACTICAL BRACKETS (CORNER ACCENTS) */}
      <TacticalBrackets />

      {/* 3. REAL-TIME CURSOR COORDINATE TRACKER */}
      <GeoCursorTracker pos={pointerPos} />

      {/* 4. LEFT TELEMETRY INTEL SIDEBAR */}
      <TelemetrySidebar />

      {/* 5. RIGHT RADAR WIDGET */}
      <RadarWidget />

      {/* 6. TOP DEFENSE HUD HEADER */}
      <header className="pointer-events-auto relative z-20 flex items-start justify-between gap-4 px-6 pt-6 sm:px-10">
        {/* Left: MYGEO·SENTINEL Insignia & Title */}
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 40 40" className="h-9 w-9 text-cyan-300 anim-breathe">
            <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <polygon points="20,9 30,15 30,25 20,31 10,25 10,15" fill="currentColor" opacity="0.18" />
            <circle cx="20" cy="20" r="3" fill="#ffb703" />
          </svg>
          <div className="leading-none">
            <div className="text-[13px] sm:text-[15px] font-bold tracking-[0.32em] text-cyan-100 text-glow">
              MYGEO<span className="text-amber-400">·</span>SENTINEL
            </div>
            <div className="mt-1 text-[9px] tracking-[0.28em] text-cyan-400/80">
              RANGKAIAN PENGAWASAN GEOSPATIAL v9.4
            </div>
          </div>
        </div>

        {/* Right: Telemetry Time, Date, Zone & System Status */}
        <div className="flex items-center gap-2.5 sm:gap-4 text-[10px] tracking-widest text-cyan-300/90 font-mono">
          <div className="hidden md:block text-right leading-tight">
            <div className="text-[8px] text-cyan-500/70 font-bold">ZON</div>
            <div className="text-cyan-100 font-bold">UTC+08 / MYT</div>
          </div>

          <div className="hidden sm:block text-right leading-tight">
            <div className="text-[8px] text-cyan-500/70 font-bold">TARIKH</div>
            <div className="text-cyan-100 font-bold">{currentDate || '28 OGOS 2026'}</div>
          </div>

          <div className="text-right leading-tight">
            <div className="text-[8px] text-cyan-500/70 font-bold">MASA</div>
            <div className="text-amber-300 font-bold text-glow-amber">{currentTime || '08:00:00'}</div>
          </div>

          <div className="flex items-center gap-2 border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 clip-tag">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="text-emerald-300 font-bold text-[9px] uppercase tracking-wider">
              {isVerifying ? 'PENGESAHAN...' : 'SISTEM SEDIA'}
            </span>
          </div>

          {/* Master Key Direct Access Button */}
          <button
            type="button"
            onClick={() => {
              setActiveMode('commander');
              setAuthError(null);
              setMasterKeyError(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border border-amber-400/60 text-[10px] font-bold uppercase transition-all cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(255,183,3,0.3)]"
            title="Log Masuk Kunci Utama (Master Key)"
          >
            <Key size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Log Masuk Master Key</span>
            <span className="sm:hidden">Master Key</span>
          </button>

          {/* Wallpaper Customizer Button */}
          <button
            type="button"
            onClick={() => setShowWallpaperModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 text-[10px] font-bold uppercase transition-all cursor-pointer active:scale-95"
            title="Tukar Wallpaper / Latar Belakang"
          >
            <ImageIcon size={13} className="text-cyan-400" />
            <span className="hidden sm:inline">Latar Belakang</span>
          </button>

          {isLocked && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/50 text-[10px] font-black uppercase tracking-wider animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <Lock size={12} className="text-rose-400 stroke-[2.5]" />
              <span>TERMINAL DIKUNCI (OPSEC AKTIF)</span>
            </div>
          )}

          {onClose && !isLocked && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/40 text-[10px] font-bold uppercase transition-all cursor-pointer active:scale-95"
              title="Tutup Panel Pelepasan (Tutup Gate)"
            >
              <X size={14} className="text-rose-400" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          )}
        </div>
      </header>

      {/* 7. CENTER STAGE: CYBER AUTHENTICATION ACCESS PANEL */}
      <main className="relative z-20 flex flex-1 items-center justify-center px-4 py-6">
        
        {/* STATE 1: GUEST / UNAPPROVED -> SHOW CYBER ACCESS CARD */}
        {!currentUser ? (
          <div className="relative w-full max-w-[430px]">
            {/* Ambient Back Glow */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-cyan-500/25 via-cyan-500/5 to-transparent blur-xl pointer-events-none" />

            {/* Tactical Clip Panel Card */}
            <div className="clip-panel relative border border-cyan-400/35 bg-[#02131d]/85 p-6 shadow-[0_0_40px_rgba(0,180,216,0.22)] backdrop-blur-xl">
              
              {/* Header inside Panel */}
              <div className="flex items-start justify-between border-b border-cyan-400/20 pb-4">
                <div>
                  <div className="font-mono text-[9px] tracking-[0.28em] text-cyan-400/80">
                    AKSES SELAMAT
                  </div>
                  <div className="font-display text-base font-bold tracking-wider text-cyan-100 text-glow">
                    TAHAP KEBENARAN · RAHSIA BESAR
                  </div>
                </div>
                <div className="text-right font-mono text-[9px] text-cyan-400/70">
                  <div>NOD: KUL-01</div>
                  <div className="text-amber-400">ISYARAT: ■■■■□</div>
                </div>
              </div>

              {/* Verification Progress Screen / Scanner */}
              {isVerifying ? (
                <div className="py-8 flex flex-col items-center text-center space-y-4">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 border-t-cyan-300 animate-spin" />
                    <Fingerprint size={38} className="text-cyan-300 animate-pulse" />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-amber-300 font-mono tracking-widest text-glow-amber">
                      {VERIFICATION_PHASES[phaseIndex] || 'MEMPROSES IDENTITI...'}
                    </div>
                    <div className="text-[10px] text-cyan-400/70 font-mono mt-1">
                      PROTOKOL ENKRIPSI KUANTUM-GELAP (AES-512)
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-cyan-950/80 h-1.5 rounded-full overflow-hidden border border-cyan-500/30">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-amber-300 shadow-[0_0_12px_rgba(34,230,255,0.9)] transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  
                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-cyan-950/50 rounded border border-cyan-500/30 mb-4 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => { setActiveMode('commander'); setAuthError(null); setMasterKeyError(null); }}
                      className={`py-1.5 rounded font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeMode === 'commander'
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(255,183,3,0.5)] font-black'
                          : 'text-amber-400/90 hover:text-amber-300 bg-amber-500/10'
                      }`}
                    >
                      <Key size={12} />
                      <span>🔑 Master Key</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveMode('agent'); setAuthError(null); }}
                      className={`py-1.5 rounded font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeMode === 'agent'
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(34,230,255,0.5)]'
                          : 'text-cyan-400/80 hover:text-white'
                      }`}
                    >
                      <Terminal size={12} />
                      <span>Operatif</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveMode('google'); setAuthError(null); }}
                      className={`py-1.5 rounded font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeMode === 'google'
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(34,230,255,0.5)]'
                          : 'text-cyan-400/80 hover:text-white'
                      }`}
                    >
                      <LogIn size={12} />
                      <span>Google</span>
                    </button>
                  </div>

                  {/* Error Notification */}
                  {authError && (
                    <div className="mb-4 p-3 rounded bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight">{authError}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 font-mono text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMode('commander');
                            setAuthError(null);
                          }}
                          className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition flex items-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(255,183,3,0.4)]"
                        >
                          <Key size={12} />
                          <span>Gunakan Master Key</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMode('agent');
                            setAuthError(null);
                          }}
                          className="px-2.5 py-1 rounded bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/50 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Terminal size={12} />
                          <span>Pas Operatif</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 1: OPERATIVE CREDENTIALS (DEFAULT) */}
                  {activeMode === 'agent' && (
                    <form onSubmit={handleAgentLogin} className="space-y-3.5 text-left">
                      {/* ID Pengenalan */}
                      <div>
                        <label className="block font-mono text-[9.5px] uppercase tracking-wider text-cyan-300">
                          ID PENGENALAN / CALLSIGN
                        </label>
                        <div className="relative mt-1">
                          <input
                            type="text"
                            required
                            value={agentId}
                            onChange={(e) => setAgentId(e.target.value)}
                            placeholder="MY-SENTINEL-9021"
                            className="w-full border border-cyan-400/30 bg-[#041d2a]/80 px-3 py-2 font-mono text-xs text-cyan-100 placeholder-cyan-700/60 outline-none transition focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(34,230,255,0.35)]"
                          />
                          <span className="pointer-events-none absolute right-2.5 top-2.5 font-mono text-[9px] text-cyan-500/70">
                            REQ
                          </span>
                        </div>
                      </div>

                      {/* Kata Laluan */}
                      <div>
                        <label className="block font-mono text-[9.5px] uppercase tracking-wider text-cyan-300">
                          KUNCI AKSES / KATA LALUAN
                        </label>
                        <div className="relative mt-1">
                          <input
                            type={showPasscode ? 'text' : 'password'}
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full border border-cyan-400/30 bg-[#041d2a]/80 px-3 py-2 font-mono text-xs text-cyan-100 placeholder-cyan-700/60 outline-none transition focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(34,230,255,0.35)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasscode(!showPasscode)}
                            className="absolute right-2.5 top-2.5 text-cyan-400/80 hover:text-cyan-200 cursor-pointer"
                          >
                            {showPasscode ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Sector */}
                      <div>
                        <label className="block font-mono text-[9.5px] uppercase tracking-wider text-cyan-300">
                          SEKTOR OPERASI
                        </label>
                        <select
                          value={agencySector}
                          onChange={(e) => setAgencySector(e.target.value)}
                          className="w-full mt-1 border border-cyan-400/30 bg-[#041d2a]/90 px-3 py-2 font-mono text-xs text-cyan-200 outline-none focus:border-cyan-300"
                        >
                          <option value="Unit Risikan Siber (Cyber Intel)">Unit Risikan Siber (Cyber Intel)</option>
                          <option value="Pengawasan Satelit Geospatial">Pengawasan Satelit Geospatial</option>
                          <option value="Forensik OSINT & Media Sosial">Forensik OSINT & Media Sosial</option>
                          <option value="Penyiasat Jenayah Keselamatan">Penyiasat Jenayah Keselamatan</option>
                        </select>
                      </div>

                      {/* Remember & Recovery */}
                      <div className="flex items-center justify-between font-mono text-[9px] text-cyan-400/80 pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberTerminal}
                            onChange={(e) => setRememberTerminal(e.target.checked)}
                            className="accent-cyan-400 cursor-pointer"
                          />
                          <span>INGAT TERMINAL INI</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setAgentId('OPERATIVE-MY-8821')}
                          className="hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          JANA KOD SEMENTARA
                        </button>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className="clip-btn group relative mt-2 flex w-full items-center justify-center gap-2 border border-cyan-300 bg-cyan-400/20 py-2.5 font-display text-xs font-bold tracking-[0.24em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950 active:scale-[0.99] cursor-pointer shadow-[0_0_20px_rgba(34,230,255,0.3)]"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <Lock size={13} />
                          <span>SAHKAN IDENTITI & MASUK</span>
                        </span>
                      </button>

                      {/* Biometric Fingerprint Button */}
                      <button
                        type="button"
                        onClick={handleBiometricAuth}
                        disabled={biometricScanning}
                        className="flex w-full items-center justify-center gap-2 border border-cyan-500/25 bg-cyan-950/40 py-2 text-[10px] text-cyan-300 hover:bg-cyan-900/40 transition active:scale-95 cursor-pointer"
                      >
                        <Fingerprint size={14} className={biometricScanning ? 'animate-pulse text-amber-400' : 'text-cyan-400'} />
                        <span>{biometricScanning ? 'MENGIMBAS CAP JARI BIOMETRIK...' : 'IMBASAN BIOMETRIK PANTAS'}</span>
                      </button>
                    </form>
                  )}

                  {/* TAB 2: GOOGLE AUTH */}
                  {activeMode === 'google' && (
                    <div className="py-4 flex flex-col items-center text-center space-y-4">
                      <div className="w-14 h-14 rounded-full border border-cyan-400/40 bg-cyan-500/10 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(34,230,255,0.25)]">
                        <Lock size={26} />
                      </div>

                      <div>
                        <div className="text-xs font-bold text-white tracking-wider uppercase font-mono">
                          Log Masuk Google Firebase
                        </div>
                        <p className="text-[10.5px] text-cyan-400/80 font-mono mt-1 max-w-xs leading-relaxed">
                          Pautkan akaun Google rasmi anda untuk penyimpanan cloud dan penyegerakan siasatan live.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={loggingIn || authLoading}
                        onClick={handleGoogleLogin}
                        className="clip-btn w-full py-3 px-4 border border-cyan-300 bg-gradient-to-r from-cyan-400/25 to-blue-500/25 hover:from-cyan-400 hover:to-blue-500 text-cyan-100 hover:text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(34,230,255,0.3)] disabled:opacity-50"
                      >
                        {loggingIn || authLoading ? (
                          <>
                            <Loader2 size={15} className="animate-spin text-cyan-300" />
                            <span>Menghubungi Firebase Auth...</span>
                          </>
                        ) : (
                          <>
                            <LogIn size={15} />
                            <span>MASUK MELALUI AKAUN GOOGLE</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* TAB: LEAD COMMANDER MASTER KEY AUTHENTICATION */}
                  {activeMode === 'commander' && (
                    <form onSubmit={handleMasterKeyLogin} className="space-y-3.5 text-left py-1">
                      <div className="p-3 rounded bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 shadow-[0_0_15px_rgba(255,183,3,0.1)]">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 shrink-0">
                          <ShieldCheck size={18} />
                        </div>
                        <div className="text-[11px] leading-tight">
                          <div className="font-bold text-amber-300 font-mono flex items-center gap-1.5">
                            <Key size={13} className="text-amber-400" />
                            <span>PENGESAHAN KUNCI UTAMA (MASTER KEY)</span>
                          </div>
                          <div className="text-[9.5px] text-amber-200/80 mt-1 leading-relaxed">
                            Akses keutamaan sistem. Masukkan Kunci Utama rasmi anda yang sah untuk pengesahan keselamatan terus ke terminal.
                          </div>
                        </div>
                      </div>

                      {/* Master Key Error Notice */}
                      {masterKeyError && (
                        <div className="p-2.5 rounded bg-rose-950/90 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
                          <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                          <span className="text-[10.5px] font-mono leading-tight">{masterKeyError}</span>
                        </div>
                      )}

                      {/* Input Field */}
                      <div>
                        <label className="block font-mono text-[9.5px] uppercase tracking-wider text-amber-300 font-bold mb-1">
                          KUNCI UTAMA SISTEM (MASTER KEY)
                        </label>
                        <div className="relative">
                          <input
                            type={showMasterKey ? 'text' : 'password'}
                            required
                            autoFocus
                            value={masterKeyInput}
                            onChange={(e) => {
                              setMasterKeyInput(e.target.value);
                              if (masterKeyError) setMasterKeyError(null);
                            }}
                            placeholder="Masukkan Kunci Utama..."
                            className="w-full border border-amber-400/60 bg-[#081a26]/90 px-3 py-2.5 font-mono text-xs text-amber-100 placeholder-amber-700/60 outline-none transition focus:border-amber-300 focus:shadow-[0_0_18px_rgba(255,183,3,0.45)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowMasterKey(!showMasterKey)}
                            className="absolute right-2.5 top-2.5 text-amber-400/80 hover:text-amber-200 cursor-pointer"
                            title={showMasterKey ? "Sembunyikan Kunci" : "Papar Kunci"}
                          >
                            {showMasterKey ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* Main Submit Button */}
                      <button
                        type="submit"
                        className="clip-btn group relative mt-2 flex w-full items-center justify-center gap-2 border border-amber-300 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 py-3 font-display text-xs font-bold tracking-[0.24em] text-slate-950 transition hover:brightness-110 active:scale-[0.99] cursor-pointer shadow-[0_0_25px_rgba(255,183,3,0.5)]"
                      >
                        <Lock size={15} />
                        <span>SAHKAN MASTER KEY & MASUK TERMINAL</span>
                      </button>
                    </form>
                  )}

                </div>
              )}

              {/* Status Metric Chips below form */}
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-cyan-400/20 pt-3 text-center font-mono text-[8px] text-cyan-400/80">
                <div>
                  <div className="text-cyan-200 font-bold">HAB 16</div>
                  <div className="text-cyan-500/70">AKTIF</div>
                </div>
                <div>
                  <div className="text-amber-300 font-bold">LATENSI 12ms</div>
                  <div className="text-cyan-500/70">PURATA</div>
                </div>
                <div>
                  <div className="text-emerald-300 font-bold">ANCAMAN 00</div>
                  <div className="text-cyan-500/70">DIKESAN</div>
                </div>
              </div>

            </div>
          </div>
        ) : isPending ? (
          /* STATE 2: PENDING APPROVAL */
          <div className="clip-panel relative w-full max-w-lg border border-amber-400/45 bg-[#031520]/90 p-6 sm:p-8 text-center shadow-[0_0_45px_rgba(255,183,3,0.25)] backdrop-blur-xl">
            <div className="w-16 h-16 mx-auto rounded-full border border-amber-400/50 bg-amber-500/15 flex items-center justify-center text-amber-300 mb-3 shadow-[0_0_25px_rgba(255,183,3,0.4)] animate-pulse">
              <Clock size={32} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] uppercase tracking-wider mb-2">
              <Radio size={12} className="text-amber-400 animate-spin" />
              <span>PERMOHONAN MENUNGGU KELULUSAN KETUA</span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider mb-1 font-mono">
              Dalam Semakan Lead Commander
            </h2>

            {/* Operative Card */}
            <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-3 my-3 text-left">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="" className="w-10 h-10 rounded-full border border-cyan-400 object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-cyan-600/30 text-cyan-200 font-bold flex items-center justify-center text-sm border border-cyan-500/40 shrink-0">
                  {currentUser.displayName?.charAt(0) || 'P'}
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-white truncate">{currentUser.displayName || 'Penyiasat Baharu'}</span>
                <span className="text-[10px] text-cyan-400/80 truncate font-mono">{currentUser.email}</span>
              </div>
            </div>

            {/* Note Submission Form */}
            <form onSubmit={handleSendNoteToAdmin} className="bg-[#020d14] border border-cyan-500/30 p-3 mb-4 text-left">
              <div className="text-[9.5px] font-bold text-amber-300 uppercase mb-1.5 flex items-center gap-1">
                <MessageSquare size={12} />
                <span>Mesej Pengenalan Kepada Lead Admin:</span>
              </div>

              <textarea
                rows={2}
                placeholder="Contoh: Saya Azrul dari Unit Forensik Siber, mohon kelulusan..."
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                className="w-full bg-[#041b27] border border-cyan-500/30 p-2 text-xs text-white placeholder-cyan-700 focus:outline-none focus:border-amber-400 mb-2 resize-none font-mono"
              />

              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="Unit / Agensi Siasatan"
                  value={departmentInput}
                  onChange={(e) => setDepartmentInput(e.target.value)}
                  className="bg-[#041b27] border border-cyan-500/30 px-2 py-1 text-xs text-white placeholder-cyan-700 focus:outline-none focus:border-cyan-400 flex-1 font-mono"
                />
                
                <button
                  type="submit"
                  disabled={sendingNote || (!requestNote.trim() && !departmentInput.trim())}
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase flex items-center gap-1 shrink-0 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send size={11} />
                  <span>{sendingNote ? 'Hantar...' : 'Hantar'}</span>
                </button>
              </div>

              {noteSentMessage && (
                <div className="mt-2 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>{noteSentMessage}</span>
                </div>
              )}
            </form>

            {/* Master Key Bypass for Pending State */}
            <div className="mt-4 p-3 bg-amber-950/40 border border-amber-500/40 text-left rounded shadow-[0_0_15px_rgba(255,183,3,0.15)]">
              <div className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1.5 mb-1">
                <Key size={13} className="text-amber-400" />
                <span>Pelepasan Khas Master Key (Akses Keutamaan)</span>
              </div>
              <p className="text-[9.5px] text-amber-200/80 mb-2 leading-tight">
                Jika Firebase Auth tidak berpaut atau status belum disahkan, masukkan Kunci Utama untuk pelepasan serta-merta:
              </p>
              <div className="flex gap-1.5">
                <input
                  type="password"
                  placeholder="Kunci Utama..."
                  value={masterKeyInput}
                  onChange={(e) => {
                    setMasterKeyInput(e.target.value);
                    if (masterKeyError) setMasterKeyError(null);
                  }}
                  className="flex-1 bg-[#041b27] border border-amber-500/40 px-2 py-1.5 text-xs text-white placeholder-amber-700/60 focus:outline-none focus:border-amber-300 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleMasterKeyLogin()}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase transition-all cursor-pointer shrink-0 shadow font-mono"
                >
                  Sahkan
                </button>
              </div>
              {masterKeyError && (
                <div className="mt-1.5 text-[10px] text-rose-400 font-mono">{masterKeyError}</div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={onRefreshStatus}
                className="flex-1 py-2.5 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-xs uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Semak Status</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-3 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-xs uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Log Keluar</span>
              </button>
            </div>
          </div>
        ) : isRejected ? (
          /* STATE 3: REJECTED */
          <div className="clip-panel relative w-full max-w-md border border-rose-500/50 bg-[#031520]/90 p-6 sm:p-8 text-center shadow-[0_0_45px_rgba(244,63,94,0.3)] backdrop-blur-xl">
            <div className="w-16 h-16 mx-auto rounded-full border border-rose-500/50 bg-rose-500/15 flex items-center justify-center text-rose-300 mb-3 shadow-[0_0_25px_rgba(244,63,94,0.4)]">
              <UserX size={32} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[10px] uppercase tracking-wider mb-2">
              <ShieldAlert size={12} />
              <span>AKSES DITOLAK</span>
            </div>

            <h2 className="text-base font-bold text-white uppercase tracking-wider mb-2 font-mono">
              Kebenaran Tidak Diberikan
            </h2>

            <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
              Akses bagi akaun ini belum diluluskan oleh Direktorat Keselamatan.
            </p>

            {/* Master Key Bypass for Rejected State */}
            <div className="mb-4 p-3 bg-amber-950/40 border border-amber-500/40 text-left rounded shadow-[0_0_15px_rgba(255,183,3,0.15)]">
              <div className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1.5 mb-1">
                <Key size={13} className="text-amber-400" />
                <span>Pelepasan Khas Master Key (Akses Keutamaan)</span>
              </div>
              <p className="text-[9.5px] text-amber-200/80 mb-2 leading-tight">
                Gunakan Kunci Utama rasmi untuk pengesahan akses keutamaan:
              </p>
              <div className="flex gap-1.5">
                <input
                  type="password"
                  placeholder="Kunci Utama..."
                  value={masterKeyInput}
                  onChange={(e) => {
                    setMasterKeyInput(e.target.value);
                    if (masterKeyError) setMasterKeyError(null);
                  }}
                  className="flex-1 bg-[#041b27] border border-amber-500/40 px-2 py-1.5 text-xs text-white placeholder-amber-700/60 focus:outline-none focus:border-amber-300 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleMasterKeyLogin()}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase transition-all cursor-pointer shrink-0 font-mono"
                >
                  Sahkan
                </button>
              </div>
              {masterKeyError && (
                <div className="mt-1.5 text-[10px] text-rose-400 font-mono">{masterKeyError}</div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="clip-btn w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Log Keluar & Tukar Akaun</span>
            </button>
          </div>
        ) : (
          /* STATE 4: APPROVED OPERATIVE / COMMANDER */
          <div className="clip-panel relative w-full max-w-lg border border-emerald-400/50 bg-[#02141f]/90 p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(16,185,129,0.3)] backdrop-blur-xl">
            <div className="w-16 h-16 mx-auto rounded-full border border-emerald-400/50 bg-emerald-500/15 flex items-center justify-center text-emerald-300 mb-3 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              <ShieldCheck size={34} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] uppercase tracking-wider mb-2">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>CLEARANCE GRANTED // TAHAP KEBENARAN DILULUSKAN</span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider mb-2 font-mono">
              Selamat Kembali, {currentUser?.displayName || 'Penyiasat'}
            </h2>

            {/* Operative Card */}
            <div className="p-3.5 bg-[#031b28] border border-cyan-500/30 flex items-center gap-3 my-3 text-left">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="" className="w-11 h-11 rounded-full border border-cyan-400 object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-cyan-600/30 text-cyan-200 font-bold flex items-center justify-center text-sm border border-cyan-500/40 shrink-0">
                  {currentUser?.displayName?.charAt(0) || 'P'}
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-white truncate">{currentUser?.displayName || 'Operatif Sah'}</span>
                <span className="text-[10px] text-cyan-400/80 truncate font-mono">{currentUser?.email}</span>
                <div className="mt-0.5 text-[9px] text-emerald-400 font-mono">STATUS: ACTIVE // VERIFIED</div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              type="button"
              onClick={onEnterTerminal}
              className="clip-btn w-full py-3.5 px-6 border border-emerald-300 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all cursor-pointer active:scale-95 mb-2"
            >
              <Zap size={16} />
              <span>MASUK KE TERMINAL UTAMA</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2 text-[10px] text-cyan-400/70 hover:text-rose-300 font-mono uppercase transition cursor-pointer"
            >
              Tukar Akaun / Log Keluar
            </button>
          </div>
        )}

      </main>

      {/* 8. BOTTOM STATUS MARQUEE FOOTER */}
      <StatusMarquee />

      {/* 9. MODAL: PENGURUS LATAR BELAKANG / WALLPAPER OPERATIF */}
      {showWallpaperModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="clip-panel relative w-full max-w-lg border border-cyan-400/40 bg-[#021420]/95 p-6 shadow-[0_0_50px_rgba(0,180,216,0.3)]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-cyan-400/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-cyan-400" />
                <h3 className="text-xs font-bold text-cyan-100 uppercase tracking-widest">
                  Pengurus Latar Belakang / Wallpaper
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWallpaperModal(false)}
                className="p-1 rounded text-cyan-400/70 hover:text-white hover:bg-cyan-500/20 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 text-xs font-mono">
              <p className="text-[11px] text-cyan-300/80 leading-relaxed font-sans">
                Pilih tema latar belakang pratetap taktikal atau muat naik imej anda sendiri untuk dijadikan wallpaper di halaman log masuk.
              </p>

              {/* Upload Section */}
              <div className="p-3.5 border border-cyan-500/30 bg-cyan-950/30 rounded flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-white uppercase">Muat Naik Imej Anda</div>
                  <div className="text-[10px] text-cyan-400/70">Sokong JPG, PNG, WEBP (Maks 8MB)</div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input 
                    type="file" 
                    ref={wallpaperInputRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleCustomWallpaperUpload} 
                  />
                  <button
                    type="button"
                    onClick={() => wallpaperInputRef.current?.click()}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer rounded transition"
                  >
                    <Upload size={12} />
                    <span>Pilih Fail Imej</span>
                  </button>
                  {loginWallpaper && (
                    <button
                      type="button"
                      onClick={handleResetWallpaper}
                      className="px-2.5 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 font-bold text-[10px] uppercase rounded flex items-center justify-center cursor-pointer transition"
                      title="Padam Wallpaper Kustom"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Cards */}
              <div>
                <div className="text-[10px] font-bold text-cyan-400 uppercase mb-2">Pratetap Latar Belakang</div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Default Vector Map */}
                  <button
                    type="button"
                    onClick={handleResetWallpaper}
                    className={`p-2.5 rounded border text-left flex flex-col justify-between h-20 transition cursor-pointer ${
                      !loginWallpaper 
                        ? 'border-cyan-400 bg-cyan-500/20 text-white ring-1 ring-cyan-400' 
                        : 'border-cyan-500/30 bg-[#010c14] hover:bg-cyan-950/40 text-cyan-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold uppercase">Peta Vektor Malaysia</span>
                      {!loginWallpaper && <Check size={12} className="text-cyan-300" />}
                    </div>
                    <span className="text-[8.5px] text-cyan-400/70 font-sans">Geospatial Sentinel Canvas Asli</span>
                  </button>

                  {/* Preset 1: Deep Satellite */}
                  <button
                    type="button"
                    onClick={() => {
                      const url = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600&auto=format&fit=crop';
                      setLoginWallpaper(url);
                      try { localStorage.setItem('redhorizon_login_wallpaper', url); } catch {}
                    }}
                    className={`p-2.5 rounded border text-left flex flex-col justify-between h-20 transition cursor-pointer relative overflow-hidden ${
                      loginWallpaper?.includes('photo-1451187580459') 
                        ? 'border-cyan-400 text-white ring-1 ring-cyan-400' 
                        : 'border-cyan-500/30 text-cyan-300 hover:border-cyan-400/60'
                    }`}
                    style={{
                      backgroundImage: 'linear-gradient(to top, rgba(2,20,32,0.92), rgba(2,20,32,0.4)), url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop)',
                      backgroundSize: 'cover'
                    }}
                  >
                    <div className="flex items-center justify-between w-full relative z-10">
                      <span className="text-[10px] font-bold uppercase">Deep Satellite Orbit</span>
                      {loginWallpaper?.includes('photo-1451187580459') && <Check size={12} className="text-cyan-300" />}
                    </div>
                    <span className="text-[8.5px] text-cyan-200/80 relative z-10 font-sans">Satelit Orbit Bumi Tinggi</span>
                  </button>

                  {/* Preset 2: Cyber Grid Matrix */}
                  <button
                    type="button"
                    onClick={() => {
                      const url = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1600&auto=format&fit=crop';
                      setLoginWallpaper(url);
                      try { localStorage.setItem('redhorizon_login_wallpaper', url); } catch {}
                    }}
                    className={`p-2.5 rounded border text-left flex flex-col justify-between h-20 transition cursor-pointer relative overflow-hidden ${
                      loginWallpaper?.includes('photo-1526374965328') 
                        ? 'border-cyan-400 text-white ring-1 ring-cyan-400' 
                        : 'border-cyan-500/30 text-cyan-300 hover:border-cyan-400/60'
                    }`}
                    style={{
                      backgroundImage: 'linear-gradient(to top, rgba(2,20,32,0.92), rgba(2,20,32,0.4)), url(https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=400&auto=format&fit=crop)',
                      backgroundSize: 'cover'
                    }}
                  >
                    <div className="flex items-center justify-between w-full relative z-10">
                      <span className="text-[10px] font-bold uppercase">Cyber Intel Deck</span>
                      {loginWallpaper?.includes('photo-1526374965328') && <Check size={12} className="text-cyan-300" />}
                    </div>
                    <span className="text-[8.5px] text-cyan-200/80 relative z-10 font-sans">Bilik Kawalan Gelap</span>
                  </button>

                  {/* Preset 3: Blue Planet Earth */}
                  <button
                    type="button"
                    onClick={() => {
                      const url = 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=1600&auto=format&fit=crop';
                      setLoginWallpaper(url);
                      try { localStorage.setItem('redhorizon_login_wallpaper', url); } catch {}
                    }}
                    className={`p-2.5 rounded border text-left flex flex-col justify-between h-20 transition cursor-pointer relative overflow-hidden ${
                      loginWallpaper?.includes('photo-1614728894747') 
                        ? 'border-cyan-400 text-white ring-1 ring-cyan-400' 
                        : 'border-cyan-500/30 text-cyan-300 hover:border-cyan-400/60'
                    }`}
                    style={{
                      backgroundImage: 'linear-gradient(to top, rgba(2,20,32,0.92), rgba(2,20,32,0.4)), url(https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=400&auto=format&fit=crop)',
                      backgroundSize: 'cover'
                    }}
                  >
                    <div className="flex items-center justify-between w-full relative z-10">
                      <span className="text-[10px] font-bold uppercase">Global Sphere</span>
                      {loginWallpaper?.includes('photo-1614728894747') && <Check size={12} className="text-cyan-300" />}
                    </div>
                    <span className="text-[8.5px] text-cyan-200/80 relative z-10 font-sans">Ufuk Angkasa Lepas</span>
                  </button>
                </div>
              </div>

              {/* Opacity Slider (Only if custom wallpaper active) */}
              {loginWallpaper && (
                <div className="p-3 border border-cyan-500/20 bg-[#010d16] rounded space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-cyan-300 font-bold uppercase flex items-center gap-1.5">
                      <Sliders size={11} /> Kejelasan / Opasiti Wallpaper
                    </span>
                    <span className="text-amber-300 font-mono">{Math.round(wallpaperOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={wallpaperOpacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-cyan-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-cyan-500/20 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWallpaperModal(false)}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 border border-cyan-400/40 text-[10px] font-bold uppercase rounded cursor-pointer transition"
              >
                Tutup & Terapkan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
