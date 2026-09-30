import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  User,
  Share2, 
  Radio, 
  AlertTriangle, 
  LogOut, 
  LogIn, 
  Minimize2, 
  Maximize2, 
  X, 
  Target, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldAlert, 
  RefreshCw, 
  GripHorizontal, 
  Lock,
  ChevronDown,
  Layers,
  Zap,
  Globe,
  CornerDownRight,
  Sliders,
  Smile,
  Info,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Plus,
  FileCode,
  Film,
  Music,
  Play,
  Trash2,
  Flame,
  AlertOctagon,
  RotateCcw,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  Skull,
  CornerUpLeft,
  AtSign,
  Quote,
  Reply,
  Bot,
  Cpu,
  Brain,
  Search,
  ExternalLink,
  Lightbulb,
  Compass,
  Navigation,
  ArrowRight,
  Terminal,
  Activity,
  Loader2,
  Eye,
  EyeOff,
  Key,
  Unlock,
  Mail,
  FolderKanban
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { consultAIAnalyst, AIAnalystResponse, SocialNodeIntel, MatchedCanvasNodeIntel } from '../services/aiAnalystService';
import { MediaInspectorModal } from './MediaInspectorModal';
import { MediaForensicMetadata } from '../services/mediaForensicsService';
import { 
  auth, 
  loginWithGoogle, 
  logoutOperative, 
  updatePresence, 
  removePresence, 
  subscribeToPresence, 
  sendCollabMessage, 
  subscribeToMessages, 
  toggleMessageReaction,
  deleteCollabMessage,
  syncLiveGraphToRoom,
  subscribeToCloudGraph,
  purgeAllRoomMessages,
  purgeRoomLiveCanvas,
  purgeEntireOperationRoom,
  executeZeroTraceLocalPurge,
  getOrCreateRoomMetadata,
  createCustomRoom,
  updateRoomPasscode,
  subscribeToRoomMetadata,
  subscribeToAllRooms,
  deleteOperationRoom,
  getProtectedEmailDisplay,
  RoomMetadata,
  OperativeProfile, 
  CollabMessage,
  LEAD_ADMIN_EMAIL 
} from '../services/firebase';
import { 
  getStoredTelegramConfig, 
  saveStoredTelegramConfig, 
  clearStoredTelegramConfig,
  syncTelegramConfigFromFirestore,
  testTelegramConnection, 
  uploadFileToTelegram, 
  downloadAndParseTelegramRhzFile, 
  sendTelegramBroadcast,
  TelegramRelayConfig 
} from '../services/telegramService';
import { compressImage } from '../utils/imageCompressor';
import { onAuthStateChanged } from 'firebase/auth';
import type { Node, Link, GraphData } from '../types';
import { reportFileLoadProgress } from './FileLoadProgressHUD';

export const getOperativeActivity = (modalId?: string | null, activeNode?: Node | null) => {
  if (modalId) {
    switch (modalId) {
      case 'geo_recon':
      case 'cctv_hub':
        return { tool: 'GIS & TrafficVision', action: 'Mengimbas peta geospatial & CCTV', icon: '🌐' };
      case 'timeline':
        return { tool: 'Timeline Forensik', action: 'Menganalisis garis masa kronologi', icon: '⏱️' };
      case 'image_intel':
        return { tool: 'Visual Intel & EXIF', action: 'Mengekstrak metadata foto/imej', icon: '📷' };
      case 'social_recon':
      case 'social_analyzer':
        return { tool: 'Social Recon OSINT', action: 'Menganalisis profil media sosial', icon: '💬' };
      case 'entity_fusion':
        return { tool: 'Entity Fusion (Fasa 1)', action: 'Menggabungkan resolusi entiti', icon: '🔀' };
      case 'intelligence_briefing':
        return { tool: 'Briefing Exporter (Fasa 3)', action: 'Menjana dokumen laporan risikan', icon: '📄' };
      case 'sna_panel':
        return { tool: 'SNA Network Graph', action: 'Mengira metriks centrality rangkaian', icon: '🕸️' };
      case 'stylometry':
        return { tool: 'Stylometry Lab', action: 'Menganalisis corak teks & kepengarangan', icon: '✍️' };
      case 'dork_builder':
        return { tool: 'Google Dorking Engine', action: 'Membina sintaks carian dork lanjutan', icon: '🔎' };
      case 'autonomous_agent':
        return { tool: 'Auto Recon Drone', action: 'Menjalankan siasatan bot autonomi', icon: '🤖' };
      case 'forensic_vault':
        return { tool: 'Forensic Vault', action: 'Menyemak arkib bukti forensik', icon: '🗄️' };
      case 'location_sting':
        return { tool: 'Location Sting Payload', action: 'Menjejak koordinat lokasi aktif', icon: '🎯' };
      case 'web_capture':
        return { tool: 'SnapRender Web Capture', action: 'Menangkap paparan web halaman sasaran', icon: '📸' };
      case 'share_trace':
        return { tool: 'ShareTrace Link Inspector', action: 'Memeriksa jejak pautan pancingan', icon: '🔗' };
      case 'osint_engine':
        return { tool: 'Smart OSINT Engine', action: 'Mencari pangkalan data OSINT global', icon: '⚡' };
      default:
        return { tool: modalId.replace(/_/g, ' ').toUpperCase(), action: `Menggunakan modul ${modalId}`, icon: '🛠️' };
    }
  }

  if (activeNode) {
    return {
      tool: 'Canvas Utama',
      action: `Meneliti entiti: "${activeNode.label}" (${activeNode.type})`,
      icon: '🎯'
    };
  }

  return {
    tool: 'Canvas Utama',
    action: 'Menyiasat dicanvas graf',
    icon: '📊'
  };
};

const playMentionChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch (_) {}
};

export interface AIAnalystAgent {
  id: string;
  mentionTag: string;
  aliases: string[];
  name: string;
  provider: string;
  model: string;
  badge: string;
  icon: string;
  desc: string;
  accent: string;
  border: string;
  role: 'ai_analyst';
  isAI: true;
}

export const AI_ANALYST_ROSTER: AIAnalystAgent[] = [
  {
    id: 'ai_gemini',
    mentionTag: 'ai',
    aliases: ['gemini', 'google'],
    name: 'Gemini Neural Analyst',
    provider: 'Google DeepMind',
    model: 'gemini-3.7-flash',
    badge: 'Gemini AI',
    icon: '🧠',
    desc: 'Analisis pintar graf keseluruhan, jurang maklumat & sintesis risikan',
    accent: 'from-amber-500 to-orange-500',
    border: 'border-amber-400',
    role: 'ai_analyst',
    isAI: true
  },
  {
    id: 'ai_deepseek',
    mentionTag: 'deepseek',
    aliases: ['r1', 'deepseek-r1'],
    name: 'DeepSeek-R1 Reasoner',
    provider: 'DeepSeek (OpenRouter)',
    model: 'deepseek-r1',
    badge: 'DeepSeek-R1',
    icon: '⚡',
    desc: 'Penaakulan mendalam (Chain-of-Thought), de-anonimiti & kriptik forensik',
    accent: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-400',
    role: 'ai_analyst',
    isAI: true
  },
  {
    id: 'ai_nemotron',
    mentionTag: 'nomatron',
    aliases: ['nemotron', 'nvidia'],
    name: 'NVIDIA Nemotron 30B',
    provider: 'NVIDIA AI (OpenRouter)',
    model: 'nemotron-3-nano-omni-30b',
    badge: 'NVIDIA Nemotron',
    icon: '🛡️',
    desc: 'Pemodelan ancaman siber, vektor serangan & peninjauan proaktif',
    accent: 'from-emerald-500 to-green-600',
    border: 'border-emerald-400',
    role: 'ai_analyst',
    isAI: true
  },
  {
    id: 'ai_analyst',
    mentionTag: 'analyst',
    aliases: ['lead', 'osint'],
    name: 'Lead Tactical OSINT Officer',
    provider: 'RedHorizon Autonomous',
    model: 'autonomous-swarm',
    badge: 'OSINT Lead',
    icon: '🕵️',
    desc: 'Cadangan langkah alatan RedHorizon (Social Recon, Dorking, EXIF, GIS)',
    accent: 'from-purple-500 to-indigo-600',
    border: 'border-purple-400',
    role: 'ai_analyst',
    isAI: true
  },
  {
    id: 'ai_scout',
    mentionTag: 'scout',
    aliases: ['drone', 'recon'],
    name: 'Auto Recon Scout Drone',
    provider: 'RedHorizon Recon Hub',
    model: 'gemini-3.7-flash',
    badge: 'Auto Scout',
    icon: '🌐',
    desc: 'Peninjauan jejak digital & pengimbasan profil entiti sasaran',
    accent: 'from-pink-500 to-rose-600',
    border: 'border-pink-400',
    role: 'ai_analyst',
    isAI: true
  }
];

interface CollaborativeChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNode?: Node | null;
  allNodes: Node[];
  graphData: GraphData;
  onFocusNode: (nodeId: string, shouldCloseChat?: boolean) => void;
  onUpdateGraphFromCloud?: (nodes: Node[], links: any[]) => void;
  onLoadCase?: (caseFile: any, merge: boolean, fileName?: string, fileSize?: number) => void;
  onBroadcastFinding?: (node: Node) => void;
  activeModal?: string | null;
  onMentionAlertChange?: (alert: { unreadCount: number; latestSender?: string; latestText?: string; messageId?: string; room: string } | null) => void;
  shareNodeTarget?: Node | null;
  onClearShareNodeTarget?: () => void;
  onOpenModal?: (modalId: string, node?: Node) => void;
  onRoomStatusChange?: (status: { roomId: string; isUnlocked: boolean; isEliteOnly?: boolean }) => void;
}

export const CollaborativeChatModal: React.FC<CollaborativeChatModalProps> = ({
  isOpen,
  onClose,
  activeNode,
  allNodes,
  graphData,
  onFocusNode,
  onUpdateGraphFromCloud,
  onLoadCase,
  activeModal,
  onMentionAlertChange,
  shareNodeTarget,
  onClearShareNodeTarget,
  onOpenModal,
  onRoomStatusChange
}) => {
  const [isAIThinking, setIsAIThinking] = useState<string | null>(null);
  const [activeQuickChip, setActiveQuickChip] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<OperativeProfile>(() => {
    const guestId = localStorage.getItem('redhorizon_guest_uid') || 'guest_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('redhorizon_guest_uid', guestId);
    const guestName = localStorage.getItem('redhorizon_guest_name') || `Agent_${guestId.substring(6, 10)}`;
    const guestEmail = localStorage.getItem('redhorizon_guest_email') || 'guest@field-ops.local';
    return {
      uid: guestId,
      displayName: guestName,
      email: guestEmail,
      role: 'investigator',
      lastActive: Date.now(),
      isCanvasActive: true
    };
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authErrorNotice, setAuthErrorNotice] = useState<string | null>(null);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [roomId, setRoomId] = useState<string>(() => {
    return localStorage.getItem('redhorizon_collab_room_id') || 'OPS-RED-ALPHA';
  });
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [tempRoomInput, setTempRoomInput] = useState(roomId);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Room Special Passcode & Security States
  const [roomMetadata, setRoomMetadata] = useState<RoomMetadata | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscodeText, setShowPasscodeText] = useState(false);
  const [passcodeErrorNotice, setPasscodeErrorNotice] = useState<string | null>(null);
  const [isRoomUnlocked, setIsRoomUnlocked] = useState<boolean>(() => {
    const initRoom = localStorage.getItem('redhorizon_collab_room_id') || 'OPS-RED-ALPHA';
    return sessionStorage.getItem(`redhorizon_room_unlocked_${initRoom}`) === 'true';
  });
  const [newRoomPasscodeInput, setNewRoomPasscodeInput] = useState('');
  const [updatePasscodeStatus, setUpdatePasscodeStatus] = useState<{ success?: boolean; msg?: string }>({});
  const [showPasscodeInSettings, setShowPasscodeInSettings] = useState(false);

  // Create Room States
  const [createRoomIdInput, setCreateRoomIdInput] = useState('');
  const [createRoomPasscodeInput, setCreateRoomPasscodeInput] = useState('');
  const [createRoomIsEliteOnly, setCreateRoomIsEliteOnly] = useState(false);
  const [createRoomNotice, setCreateRoomNotice] = useState<{ success?: boolean; msg?: string } | null>(null);

  const isEliteAgent = Boolean(
    (currentUser?.email && currentUser.email.toLowerCase() === 'fisaabilillah@gmail.com') ||
    (currentUser?.email && currentUser.email.toLowerCase() === LEAD_ADMIN_EMAIL.toLowerCase()) ||
    currentUser?.role === 'lead'
  );

  const isGmailUser = Boolean(
    auth.currentUser &&
    currentUser.email &&
    !currentUser.email.includes('guest@') &&
    !currentUser.uid.startsWith('guest_') &&
    currentUser.email.includes('@')
  );

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthErrorNotice(null);
    try {
      const userProfile = await loginWithGoogle();
      if (userProfile && userProfile.email) {
        setCurrentUser(userProfile);
        setAuthErrorNotice(null);
      } else {
        setAuthErrorNotice('Log masuk Google tidak memberikan e-mel sah.');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      const msg = err?.message || 'Gagal log masuk melalui Google Provider.';
      if (err?.code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setAuthErrorNotice(`Domain pelayan (${window.location.hostname}) belum dimasukkan ke senarai Authorized Domains Firebase Console (Projek: r3dhorizon-eb451 -> Authentication -> Settings -> Authorized Domains). Anda boleh menggunakan Akses Operatif Sandbox di bawah untuk meneruskan perbualan.`);
      } else if (msg.includes('popup-closed-by-user')) {
        setAuthErrorNotice('Tetingkap popup log masuk telah ditutup oleh pengguna.');
      } else {
        setAuthErrorNotice(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUnlockRoomWithPasscode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPasscodeErrorNotice(null);

    // Elite Agent bypasses passcode completely
    if (isEliteAgent) {
      sessionStorage.setItem(`redhorizon_room_unlocked_${roomId}`, 'true');
      setIsRoomUnlocked(true);
      setPasscodeInput('');
      return;
    }

    // Check Elite Agent restriction first for non-Elite agents
    if (roomMetadata?.isEliteOnly && !isEliteAgent) {
      setPasscodeErrorNotice('⛔ AKSES DITOLAK: Bilik ini telah ditetapkan khas untuk Elite Agent sahaja. Penyiasat biasa tidak dibenarkan masuk.');
      setIsRoomUnlocked(false);
      return;
    }

    const expectedPasscode = roomMetadata?.passcode || 'RH2026';
    if (passcodeInput.trim() === expectedPasscode.trim()) {
      sessionStorage.setItem(`redhorizon_room_unlocked_${roomId}`, 'true');
      setIsRoomUnlocked(true);
      setPasscodeInput('');
    } else {
      setPasscodeErrorNotice('Kata Laluan Operasi Khas tidak sah! Sila semak semula password khas.');
    }
  };

  const handleSwitchRoom = (targetRoomId: string, isTargetEliteOnly?: boolean) => {
    const cleanId = targetRoomId.trim().toUpperCase();
    if (isTargetEliteOnly && !isEliteAgent) {
      alert('⛔ AKSES DITOLAK: Bilik ini dibuka khas untuk Elite Agent sahaja.');
      return;
    }
    setRoomId(cleanId);
    setTempRoomInput(cleanId);
    localStorage.setItem('redhorizon_collab_room_id', cleanId);
    if (isEliteAgent) {
      sessionStorage.setItem(`redhorizon_room_unlocked_${cleanId}`, 'true');
      setIsRoomUnlocked(true);
    }
    setActiveTab('chat');
    setCanvasAddSuccess(`Memasuki Bilik Operasi: ${cleanId}`);
    setTimeout(() => setCanvasAddSuccess(null), 3000);
  };

  const handleDeleteRoom = async (targetRoomId: string) => {
    if (!isEliteAgent) {
      alert('Hanya Elite Agent sahaja yang mempunyai kelulusan untuk memadam bilik operasi.');
      return;
    }
    const confirmDelete = window.confirm(`⚠️ KELULUSAN KESELAMATAN ELITE AGENT:\n\nAdakah anda pasti mahu memadam bilik "${targetRoomId}" secara kekal daripada Firebase Cloud?\n\nSemua akses bilik ini akan dipadamkan.`);
    if (!confirmDelete) return;

    try {
      await deleteOperationRoom(targetRoomId);
      if (roomId === targetRoomId) {
        setRoomId('OPS-RED-ALPHA');
        setTempRoomInput('OPS-RED-ALPHA');
        localStorage.setItem('redhorizon_collab_room_id', 'OPS-RED-ALPHA');
        sessionStorage.setItem('redhorizon_room_unlocked_OPS-RED-ALPHA', 'true');
        setIsRoomUnlocked(true);
      }
      setCanvasAddSuccess(`Bilik "${targetRoomId}" berjaya dipadam secara kekal oleh Elite Agent.`);
      setTimeout(() => setCanvasAddSuccess(null), 3000);
    } catch (err: any) {
      alert(`Gagal memadam bilik: ${err.message}`);
    }
  };

  const handleCreateCustomRoom = async () => {
    setCreateRoomNotice(null);
    if (!createRoomIdInput.trim()) {
      setCreateRoomNotice({ success: false, msg: 'Sila masukkan Kod / ID Bilik yang sah.' });
      return;
    }
    const cleanId = createRoomIdInput.trim().toUpperCase();
    const pass = createRoomPasscodeInput.trim() || 'RH2026';

    try {
      const createdMeta = await createCustomRoom(cleanId, pass, createRoomIsEliteOnly, currentUser.email);
      setRoomMetadata(createdMeta);
      setRoomId(cleanId);
      sessionStorage.setItem(`redhorizon_room_unlocked_${cleanId}`, 'true');
      setIsRoomUnlocked(true);
      setCreateRoomNotice({ 
        success: true, 
        msg: `Bilik "${cleanId}" berjaya dicipta & dimasuki! ${createRoomIsEliteOnly ? '(Akses Khas Elite Agent Sahaja 🛡️)' : '(Akses Semua Penyiasat)'}` 
      });
      setCreateRoomIdInput('');
      setCreateRoomPasscodeInput('');
    } catch (err: any) {
      setCreateRoomNotice({ success: false, msg: `Gagal mencipta bilik: ${err.message}` });
    }
  };

  const handleUpdatePasscode = async () => {
    if (!newRoomPasscodeInput.trim()) {
      setUpdatePasscodeStatus({ success: false, msg: 'Sila masukkan kata laluan khas baharu.' });
      return;
    }
    try {
      await updateRoomPasscode(roomId, newRoomPasscodeInput.trim(), currentUser.email);
      setUpdatePasscodeStatus({ success: true, msg: 'Kata laluan khas operasi berjaya dikemaskini!' });
      setNewRoomPasscodeInput('');
      setRoomMetadata(prev => prev ? { ...prev, passcode: newRoomPasscodeInput.trim() } : null);
    } catch (err: any) {
      setUpdatePasscodeStatus({ success: false, msg: `Gagal mengemaskini passcode: ${err.message}` });
    }
  };

  useEffect(() => {
    if (!isOpen || !roomId) return;
    localStorage.setItem('redhorizon_collab_room_id', roomId);
    getOrCreateRoomMetadata(roomId, 'RH2026', currentUser?.email).then((meta) => {
      setRoomMetadata(meta);
      if (isEliteAgent) {
        sessionStorage.setItem(`redhorizon_room_unlocked_${roomId}`, 'true');
        setIsRoomUnlocked(true);
      } else if (meta?.isEliteOnly && !isEliteAgent) {
        setIsRoomUnlocked(false);
        setPasscodeErrorNotice('⛔ AKSES DITOLAK: Bilik ini telah ditetapkan khas untuk Elite Agent sahaja. Akaun penyiasat anda tidak mempunyai tahap kelulusan Elite Agent.');
      }
    });

    const unsubMeta = subscribeToRoomMetadata(roomId, (meta) => {
      if (meta) {
        setRoomMetadata(meta);
        if (isEliteAgent) {
          sessionStorage.setItem(`redhorizon_room_unlocked_${roomId}`, 'true');
          setIsRoomUnlocked(true);
        } else if (meta.isEliteOnly && !isEliteAgent) {
          setIsRoomUnlocked(false);
          setPasscodeErrorNotice('⛔ AKSES DITOLAK: Bilik melepasi kawalan keselamatan Elite Agent sahaja.');
        }
      }
    });

    if (isEliteAgent) {
      sessionStorage.setItem(`redhorizon_room_unlocked_${roomId}`, 'true');
      setIsRoomUnlocked(true);
    } else if (roomMetadata?.isEliteOnly && !isEliteAgent) {
      setIsRoomUnlocked(false);
    } else {
      const unlockedInSession = sessionStorage.getItem(`redhorizon_room_unlocked_${roomId}`) === 'true';
      setIsRoomUnlocked(unlockedInSession);
    }

    return () => unsubMeta();
  }, [isOpen, roomId, isEliteAgent, roomMetadata?.isEliteOnly]);

  // Synchronize room lock status to parent App canvas
  const prevRoomStatusRef = useRef({ roomId: '', isUnlocked: false, isEliteOnly: false });
  useEffect(() => {
    const isEliteOnly = Boolean(roomMetadata?.isEliteOnly);
    if (
      prevRoomStatusRef.current.roomId !== roomId ||
      prevRoomStatusRef.current.isUnlocked !== isRoomUnlocked ||
      prevRoomStatusRef.current.isEliteOnly !== isEliteOnly
    ) {
      prevRoomStatusRef.current = { roomId, isUnlocked: isRoomUnlocked, isEliteOnly };
      onRoomStatusChange?.({
        roomId,
        isUnlocked: isRoomUnlocked,
        isEliteOnly
      });
    }
  }, [roomId, isRoomUnlocked, roomMetadata?.isEliteOnly, onRoomStatusChange]);
  
  const [messages, setMessages] = useState<CollabMessage[]>([]);
  const [onlineOps, setOnlineOps] = useState<OperativeProfile[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
    telegramFileId?: string;
    telegramDownloadUrl?: string;
    isTelegramRelay?: boolean;
    casePayload?: {
      caseName: string;
      totalEntities: number;
      totalLinks?: number;
      nodes: Node[];
      links: Link[];
      version?: string;
      telegramFileId?: string;
      telegramDownloadUrl?: string;
      isTelegramRelay?: boolean;
    };
  } | null>(null);
  const [isCompressingFile, setIsCompressingFile] = useState(false);
  const [isUploadingToTelegram, setIsUploadingToTelegram] = useState(false);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Telegram Headless Relay Configuration State
  const [telegramConfig, setTelegramConfig] = useState<TelegramRelayConfig>(getStoredTelegramConfig);
  const [telegramTestStatus, setTelegramTestStatus] = useState<{ testing: boolean; result?: string; success?: boolean }>({ testing: false });

  // Sync Telegram Configuration from Firestore and listen to global updates
  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e.detail) {
        setTelegramConfig(e.detail);
      }
    };
    window.addEventListener('app:telegram-config-updated', handleConfigUpdate);

    syncTelegramConfigFromFirestore().then((synced) => {
      if (synced) {
        setTelegramConfig(synced);
      }
    }).catch(() => {});

    return () => {
      window.removeEventListener('app:telegram-config-updated', handleConfigUpdate);
    };
  }, []);

  const [isLiveCanvasSync, setIsLiveCanvasSync] = useState<boolean>(() => {
    return localStorage.getItem('redhorizon_live_canvas_sync') !== 'false';
  });
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false
  });

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-drag="true"]') || target.closest('input') || target.closest('textarea') || target.closest('a')) {
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: dragPos.x,
      initialY: dragPos.y,
      moved: false
    };

    setIsDragging(true);

    const handleDragMove = (moveEv: MouseEvent | TouchEvent) => {
      if ('touches' in moveEv && moveEv.cancelable) {
        moveEv.preventDefault();
      }

      const curX = 'touches' in moveEv ? moveEv.touches[0].clientX : moveEv.clientX;
      const curY = 'touches' in moveEv ? moveEv.touches[0].clientY : moveEv.clientY;

      const deltaX = curX - dragStartRef.current.startX;
      const deltaY = curY - dragStartRef.current.startY;

      if (Math.hypot(deltaX, deltaY) > 3) {
        dragStartRef.current.moved = true;
      }

      setDragPos({
        x: dragStartRef.current.initialX + deltaX,
        y: dragStartRef.current.initialY + deltaY
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  };
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const saved = localStorage.getItem('redhorizon_collab_chat_width');
    return saved ? Math.max(340, Math.min(window.innerWidth - 30, Number(saved))) : 460;
  });
  const [chatHeight, setChatHeight] = useState<number>(() => {
    const saved = localStorage.getItem('redhorizon_collab_chat_height');
    return saved ? Math.max(400, Math.min(window.innerHeight - 50, Number(saved))) : 620;
  });
  const [isResizing, setIsResizing] = useState<'left' | 'top' | 'corner' | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'nodes' | 'ops' | 'telegram' | 'room_settings' | 'purge' | 'room_list'>('chat');
  const [nodeSearchTerm, setNodeSearchTerm] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('all');
  const [canvasAddSuccess, setCanvasAddSuccess] = useState<string | null>(null);

  // All Rooms List State & Subscription
  const [allOperationRooms, setAllOperationRooms] = useState<RoomMetadata[]>([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAllRooms((rooms) => {
      setAllOperationRooms(rooms);
    });
    return () => unsub();
  }, [isOpen]);

  // Resize handler with mouse & touch listeners
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (isResizing === 'left' || isResizing === 'corner') {
        const newWidth = Math.max(340, Math.min(window.innerWidth - 40, window.innerWidth - clientX - 16));
        setChatWidth(newWidth);
        localStorage.setItem('redhorizon_collab_chat_width', String(newWidth));
      }

      if (isResizing === 'top' || isResizing === 'corner') {
        const newHeight = Math.max(380, Math.min(window.innerHeight - 50, window.innerHeight - clientY - 16));
        setChatHeight(newHeight);
        localStorage.setItem('redhorizon_collab_chat_height', String(newHeight));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing]);

  // Mention Alert State & Tracking
  const [lastReadMentionTime, setLastReadMentionTime] = useState<number>(() => {
    return Number(localStorage.getItem(`redhorizon_last_read_mention_${roomId}`) || Date.now());
  });
  const [activeMentionBanner, setActiveMentionBanner] = useState<CollabMessage | null>(null);
  const prevMentionCountRef = useRef(0);

  // Tactical Zero-Trace & Firebase Purge State
  const [purgeDialog, setPurgeDialog] = useState<{
    open: boolean;
    type: 'messages' | 'canvas' | 'room' | 'local' | 'master';
    title: string;
    description: string;
    warningLevel: 'high' | 'critical';
  }>({ open: false, type: 'messages', title: '', description: '', warningLevel: 'high' });
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccessNotice, setPurgeSuccessNotice] = useState<string | null>(null);

  // Tactical Media Forensics Inspector State
  const [inspectingMedia, setInspectingMedia] = useState<{
    url?: string;
    file?: File | Blob;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
  } | null>(null);

  // Reply & Mention Feature States
  const [replyingTo, setReplyingTo] = useState<CollabMessage | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isIncomingSyncRef = useRef(false);
  const lastPushedFingerprintRef = useRef<string>('');
  const lastProcessedCloudTimestampRef = useRef<number>(0);

  // Persist live canvas sync preference
  useEffect(() => {
    localStorage.setItem('redhorizon_live_canvas_sync', isLiveCanvasSync ? 'true' : 'false');
  }, [isLiveCanvasSync]);

  // Read initial room from URL params if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let roomParam = params.get('room');
    if (!roomParam && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      roomParam = hashParams.get('room');
    }
    if (roomParam && roomParam.trim()) {
      const sanitized = roomParam.trim().toUpperCase();
      setRoomId(sanitized);
      setTempRoomInput(sanitized);
      localStorage.setItem('redhorizon_collab_room_id', sanitized);
    }
  }, []);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const activity = getOperativeActivity(activeModal, activeNode);
      if (firebaseUser) {
        const profile: OperativeProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Operative',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          role: firebaseUser.email === 'fisaabilillah@gmail.com' ? 'lead' : 'investigator',
          lastActive: Date.now(),
          activeNodeId: activeNode?.id || null,
          activeNodeLabel: activeNode?.label || null,
          activeNodeType: activeNode?.type || null,
          activeModal: activeModal || null,
          activeTool: activity.tool,
          currentActivity: activity.action,
          isCanvasActive: !activeModal
        };
        setCurrentUser(profile);
      } else {
        // Guest operative profile fallback
        const guestId = localStorage.getItem('redhorizon_guest_uid') || 'guest_' + Math.random().toString(36).substring(2, 8);
        localStorage.setItem('redhorizon_guest_uid', guestId);
        const guestName = localStorage.getItem('redhorizon_guest_name') || `Agent_${guestId.substring(6, 10)}`;
        const guestEmail = localStorage.getItem('redhorizon_guest_email') || 'guest@field-ops.local';
        setCurrentUser({
          uid: guestId,
          displayName: guestName,
          email: guestEmail,
          role: 'investigator',
          lastActive: Date.now(),
          activeNodeId: activeNode?.id || null,
          activeNodeLabel: activeNode?.label || null,
          activeNodeType: activeNode?.type || null,
          activeModal: activeModal || null,
          activeTool: activity.tool,
          currentActivity: activity.action,
          isCanvasActive: !activeModal
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Broadcast Presence updates (every 30s & on modal/node changes)
  const broadcastCurrentPresence = () => {
    if (!currentUser || !roomId) return;
    const activity = getOperativeActivity(activeModal, activeNode);
    updatePresence(roomId, currentUser, {
      activeNodeId: activeNode?.id || null,
      activeNodeLabel: activeNode?.label || null,
      activeNodeType: activeNode?.type || null,
      activeModal: activeModal || null,
      activeTool: activity.tool,
      currentActivity: activity.action,
      isCanvasActive: !activeModal
    });
  };

  // Update room presence & save room ID in storage
  useEffect(() => {
    if (!isOpen || !currentUser || !roomId) return;
    localStorage.setItem('redhorizon_collab_room_id', roomId);

    broadcastCurrentPresence();
    const interval = setInterval(() => {
      broadcastCurrentPresence();
    }, 30000);

    const unsubPresence = subscribeToPresence(roomId, (ops) => {
      setOnlineOps(ops);
    });

    return () => {
      clearInterval(interval);
      unsubPresence();
      if (currentUser?.uid) {
        removePresence(roomId, currentUser.uid);
      }
    };
  }, [isOpen, roomId, currentUser?.uid]);

  // Subscribe to Realtime Chat Messages (Independent of auth UID changes, preserving in-flight optimistic items)
  useEffect(() => {
    if (!isOpen || !roomId) return;

    const unsubMessages = subscribeToMessages(roomId, (serverMsgs) => {
      setMessages((prevMsgs) => {
        // Keep in-flight optimistic (temp_) messages until confirmed by Firestore
        const pendingOptimistic = prevMsgs.filter((localMsg) => {
          if (!localMsg.id.startsWith('temp_')) return false;

          const isConfirmed = serverMsgs.some((srv) => {
            if (srv.id === localMsg.id) return true;
            // Match finding broadcast by node ID
            if (localMsg.type === 'finding_broadcast' && srv.type === 'finding_broadcast') {
              if (localMsg.linkedNode?.id && srv.linkedNode?.id === localMsg.linkedNode.id) {
                return Math.abs((srv.timestamp || 0) - (localMsg.timestamp || 0)) < 60000;
              }
            }
            // Match standard chat text
            if (srv.senderId === localMsg.senderId && srv.text === localMsg.text) {
              return Math.abs((srv.timestamp || 0) - (localMsg.timestamp || 0)) < 60000;
            }
            return false;
          });

          const isFresh = Date.now() - (localMsg.timestamp || 0) < 45000;
          return !isConfirmed && isFresh;
        });

        const merged = [...serverMsgs, ...pendingOptimistic];
        merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        return merged;
      });
    });

    return () => {
      unsubMessages();
    };
  }, [roomId]);

  // Update operative target node / modal presence immediately
  useEffect(() => {
    if (currentUser && roomId) {
      broadcastCurrentPresence();
    }
  }, [activeNode?.id, activeNode?.label, activeModal]);

  // Mention Detection & Alert Notification Engine
  useEffect(() => {
    if (!currentUser || !roomId) return;
    const myName = currentUser.displayName?.toLowerCase().trim();
    const myEmail = currentUser.email?.toLowerCase().trim();
    const myEmailPrefix = currentUser.email ? currentUser.email.split('@')[0].toLowerCase().trim() : '';

    const mentions = messages.filter((msg) => {
      if (msg.senderId === currentUser.uid) return false;
      if (!msg.text) return false;
      const textLower = msg.text.toLowerCase();
      
      const isMentioned = 
        (myName && (textLower.includes(`@${myName}`) || (myName.length > 2 && textLower.includes(`@${myName.split(' ')[0]}`)))) ||
        (myEmail && textLower.includes(`@${myEmail}`)) ||
        (myEmailPrefix && textLower.includes(`@${myEmailPrefix}`));
      return isMentioned;
    });

    const unread = mentions.filter(m => m.timestamp > lastReadMentionTime);

    if (unread.length > 0) {
      const latest = unread[unread.length - 1];
      setActiveMentionBanner(latest);
      if (unread.length > prevMentionCountRef.current) {
        playMentionChime();
      }
      prevMentionCountRef.current = unread.length;

      if (onMentionAlertChange) {
        onMentionAlertChange({
          unreadCount: unread.length,
          latestSender: latest.senderName,
          latestText: latest.text,
          messageId: latest.id,
          room: roomId
        });
      }
    } else {
      setActiveMentionBanner(null);
      prevMentionCountRef.current = 0;
      if (onMentionAlertChange) {
        onMentionAlertChange(null);
      }
    }
  }, [messages, currentUser?.displayName, currentUser?.email, lastReadMentionTime, roomId]);

  // Acknowledge unread mentions when user views chat
  useEffect(() => {
    if (isOpen && !isMinimized && messages.length > 0) {
      const now = Date.now();
      setLastReadMentionTime(now);
      localStorage.setItem(`redhorizon_last_read_mention_${roomId}`, String(now));
      setActiveMentionBanner(null);
      if (onMentionAlertChange) {
        onMentionAlertChange(null);
      }
    }
  }, [isOpen, isMinimized, messages.length, roomId]);

  // Helper to compute a structural fingerprint for canvas topology (ignoring minor D3 physics x/y jitter)
  const getGraphStructureFingerprint = (nodes: Node[] = [], links: Link[] = []) => {
    const nodeIds = (nodes || []).map(n => `${n.id}:${n.label}:${n.type}:${Math.round((n.x || 0) / 60)}:${Math.round((n.y || 0) / 60)}`).sort().join('|');
    const linkIds = (links || []).map(l => {
      const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return `${s}->${t}:${l.label || ''}`;
    }).sort().join('|');
    return `${nodes?.length || 0}#${nodeIds}__${links?.length || 0}#${linkIds}`;
  };

  // Real-time Canvas Graph Sync Listener (Receiving updates from team members or system purge)
  useEffect(() => {
    if (!isOpen || !isLiveCanvasSync || !roomId || !onUpdateGraphFromCloud || !isRoomUnlocked) return;

    const unsubCloudGraph = subscribeToCloudGraph(roomId, (cloudData) => {
      if (cloudData.isNewRoom) {
        // Room active_canvas is empty/new in Firestore.
        // If local user has graphData nodes, push local graphData to Firestore so team members can see it!
        if (graphData && graphData.nodes && graphData.nodes.length > 0) {
          syncLiveGraphToRoom(roomId, graphData, currentUser);
          lastPushedFingerprintRef.current = getGraphStructureFingerprint(graphData.nodes || [], graphData.links || []);
        }
        return;
      }

      const isPurgeEvent = !cloudData.nodes || cloudData.nodes.length === 0;
      
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('redhorizon_guest_uid') : null;
      const currentUids = new Set([currentUser?.uid, guestId].filter(Boolean));
      const isSelfUpdate = Boolean(cloudData.updatedBy?.uid && currentUids.has(cloudData.updatedBy.uid));

      if (isPurgeEvent) {
        if ((graphData?.nodes?.length || 0) > 0) {
          isIncomingSyncRef.current = true;
          onUpdateGraphFromCloud([], []);
          setLastSyncTime(cloudData.updatedAt || Date.now());
          lastPushedFingerprintRef.current = getGraphStructureFingerprint([], []);
          setTimeout(() => {
            isIncomingSyncRef.current = false;
          }, 1500);
        }
        return;
      }

      // Ignore self updates (prevents echo feedback loop that re-renders canvas continuously)
      if (isSelfUpdate) {
        return;
      }

      // Only process updates from other users if timestamp is newer
      if (cloudData.updatedAt && cloudData.updatedAt > lastProcessedCloudTimestampRef.current) {
        lastProcessedCloudTimestampRef.current = cloudData.updatedAt;
        isIncomingSyncRef.current = true;
        onUpdateGraphFromCloud(cloudData.nodes || [], cloudData.links || []);
        setLastSyncTime(cloudData.updatedAt);
        lastPushedFingerprintRef.current = getGraphStructureFingerprint(cloudData.nodes || [], cloudData.links || []);
        setTimeout(() => {
          isIncomingSyncRef.current = false;
        }, 1500);
      }
    });

    return () => unsubCloudGraph();
  }, [isLiveCanvasSync, roomId, isRoomUnlocked, currentUser?.uid, onUpdateGraphFromCloud, graphData?.nodes?.length]);

  // Automatic Background Broadcast of local Graph changes to room
  useEffect(() => {
    if (!isLiveCanvasSync || !currentUser || !roomId || isIncomingSyncRef.current || !isRoomUnlocked) return;
    if (!graphData.nodes || graphData.nodes.length === 0) return;

    const fingerprint = getGraphStructureFingerprint(graphData.nodes, graphData.links);

    if (fingerprint === lastPushedFingerprintRef.current) return;

    const timer = setTimeout(async () => {
      if (isIncomingSyncRef.current) return;
      lastPushedFingerprintRef.current = fingerprint;
      try {
        await syncLiveGraphToRoom(roomId, graphData, currentUser);
        setLastSyncTime(Date.now());
      } catch (err) {
        console.warn('Auto canvas sync push error:', err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [graphData, isLiveCanvasSync, roomId, currentUser, isRoomUnlocked]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    if (activeTab === 'chat' && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isMinimized]);

  // Handle Chat File Attachment Select (With Automatic Canvas Image Compression & Full .RHZ Case Parsing + Telegram Relay for >1MB)
  const handleChatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingFile(true);
    try {
      const isRhzOrJson = file.name.toLowerCase().endsWith('.rhz') || file.name.toLowerCase().endsWith('.json');
      const isLargeFile = file.size > 800000; // > 800 KB
      const isTelegramReady = telegramConfig.enabled && Boolean(telegramConfig.botToken) && Boolean(telegramConfig.chatId);

      // If file is large (>800KB) and Telegram Relay is enabled, upload to Telegram storage
      let telegramResult: any = null;
      if (isLargeFile && isTelegramReady) {
        setIsUploadingToTelegram(true);
        try {
          telegramResult = await uploadFileToTelegram(
            file, 
            file.name, 
            `📁 [RELAY KES] Dikongsi oleh ${currentUser?.displayName || 'Operative'}: ${file.name} (${Math.round(file.size / 1024)} KB)`,
            telegramConfig
          );
        } catch (tgErr: any) {
          console.warn('Telegram upload error, falling back to local extraction:', tgErr);
        } finally {
          setIsUploadingToTelegram(false);
        }
      }

      if (file.type.startsWith('image/')) {
        if (telegramResult?.downloadUrl) {
          setAttachedFile({
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: telegramResult.downloadUrl,
            telegramFileId: telegramResult.fileId,
            telegramDownloadUrl: telegramResult.downloadUrl,
            isTelegramRelay: true
          });
        } else {
          // Compress image using HTML5 canvas (400x400 JPEG @ 65% quality -> ~15KB - 30KB)
          const compressed = await compressImage(file, 400, 400, 0.65);
          setAttachedFile({
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: compressed
          });
        }
      } else if (isRhzOrJson) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const rawText = evt.target?.result as string;
          let parsedCasePayload: any = null;

          try {
            const parsed = JSON.parse(rawText);
            let extractedNodes: any[] = [];
            let extractedLinks: any[] = [];
            let caseName = file.name.replace(/\.[^/.]+$/, "");

            if (Array.isArray(parsed)) {
              extractedNodes = parsed;
            } else if (parsed.graph && Array.isArray(parsed.graph.nodes)) {
              extractedNodes = parsed.graph.nodes;
              extractedLinks = parsed.graph.links || [];
              if (parsed.caseName) caseName = parsed.caseName;
            } else if (parsed.nodes && Array.isArray(parsed.nodes)) {
              extractedNodes = parsed.nodes;
              extractedLinks = parsed.links || [];
              if (parsed.caseName) caseName = parsed.caseName;
            } else if (parsed.workspaces && Array.isArray(parsed.workspaces) && parsed.workspaces[0]?.data?.nodes) {
              extractedNodes = parsed.workspaces[0].data.nodes;
              extractedLinks = parsed.workspaces[0].data.links || [];
              if (parsed.workspaces[0].name) caseName = parsed.workspaces[0].name;
            }

            if (extractedNodes.length > 0) {
              const sanitizedNodes: Node[] = extractedNodes.map((n, idx) => ({
                ...n,
                id: String(n.id || `node_${Date.now()}_${idx}`),
                label: String(n.label || n.name || `Entity #${idx + 1}`),
                type: String(n.type || 'person')
              }));

              const sanitizedLinks: Link[] = (extractedLinks || []).map(l => ({
                ...l,
                source: typeof l.source === 'object' ? String(l.source.id) : String(l.source),
                target: typeof l.target === 'object' ? String(l.target.id) : String(l.target),
                label: l.label ? String(l.label) : 'connected'
              }));

              parsedCasePayload = {
                caseName: caseName,
                totalEntities: sanitizedNodes.length,
                totalLinks: sanitizedLinks.length,
                nodes: sanitizedNodes,
                links: sanitizedLinks,
                version: parsed.version || '2.9.1',
                telegramFileId: telegramResult?.fileId,
                telegramDownloadUrl: telegramResult?.downloadUrl,
                isTelegramRelay: Boolean(telegramResult?.downloadUrl)
              };
            }
          } catch (parseErr) {
            console.warn('Failed to parse .rhz content as JSON:', parseErr);
          }

          setAttachedFile({
            name: file.name,
            size: file.size,
            type: 'application/rhz',
            dataUrl: telegramResult?.downloadUrl || undefined,
            telegramFileId: telegramResult?.fileId,
            telegramDownloadUrl: telegramResult?.downloadUrl,
            isTelegramRelay: Boolean(telegramResult?.downloadUrl),
            casePayload: parsedCasePayload || undefined
          });
        };
        reader.readAsText(file);
      } else {
        // For other document types
        if (file.size <= 60000) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const content = evt.target?.result as string;
            setAttachedFile({
              name: file.name,
              size: file.size,
              type: file.type,
              dataUrl: content,
              telegramFileId: telegramResult?.fileId,
              telegramDownloadUrl: telegramResult?.downloadUrl,
              isTelegramRelay: Boolean(telegramResult?.downloadUrl)
            });
          };
          reader.readAsDataURL(file);
        } else {
          setAttachedFile({
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: telegramResult?.downloadUrl,
            telegramFileId: telegramResult?.fileId,
            telegramDownloadUrl: telegramResult?.downloadUrl,
            isTelegramRelay: Boolean(telegramResult?.downloadUrl)
          });
        }
      }
    } catch (err) {
      console.error('Failed to attach file:', err);
    } finally {
      setIsCompressingFile(false);
      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
    }
  };

  // INGEST .RHZ CASE DIRECTLY ONTO CANVAS (NEVER CREATES A DUMMY SINGLE FILE NODE)
  const handleIngestCaseToCanvas = async (msg: CollabMessage | { fileAttachment: any; casePayload?: any }, merge: boolean) => {
    let caseNodes: Node[] = [];
    let caseLinks: Link[] = [];
    let caseName = msg.casePayload?.caseName || msg.fileAttachment?.name?.replace(/\.[^/.]+$/, "") || 'Fail Kes';
    const fileName = msg.fileAttachment?.name || `${caseName}.rhz`;
    const fileSize = msg.fileAttachment?.size || 0;

    // 1. Structured payload check
    if (msg.casePayload && Array.isArray(msg.casePayload.nodes) && msg.casePayload.nodes.length > 0) {
      caseNodes = msg.casePayload.nodes;
      caseLinks = msg.casePayload.links || [];
      if (msg.casePayload.caseName) caseName = msg.casePayload.caseName;
    } 
    // 2. Fetch from Telegram Relay CDN if downloadUrl is provided
    else if ((msg as any).casePayload?.telegramDownloadUrl || (msg as any).fileAttachment?.telegramDownloadUrl || (msg.fileAttachment?.dataUrl && msg.fileAttachment.dataUrl.startsWith('http'))) {
      const downloadUrl = (msg as any).casePayload?.telegramDownloadUrl || (msg as any).fileAttachment?.telegramDownloadUrl || msg.fileAttachment?.dataUrl;
      try {
        reportFileLoadProgress({
          fileName,
          fileSize,
          progress: 20,
          stage: 'Menyambung ke Telegram Cloud Relay...'
        });

        const parsed = await downloadAndParseTelegramRhzFile(downloadUrl, (pct, st) => {
          reportFileLoadProgress({ fileName, fileSize, progress: pct, stage: st });
        });

        let extractedNodes: any[] = [];
        let extractedLinks: any[] = [];

        if (Array.isArray(parsed)) {
          extractedNodes = parsed;
        } else if (parsed.graph && Array.isArray(parsed.graph.nodes)) {
          extractedNodes = parsed.graph.nodes;
          extractedLinks = parsed.graph.links || [];
          if (parsed.caseName) caseName = parsed.caseName;
        } else if (parsed.nodes && Array.isArray(parsed.nodes)) {
          extractedNodes = parsed.nodes;
          extractedLinks = parsed.links || [];
          if (parsed.caseName) caseName = parsed.caseName;
        } else if (parsed.workspaces && Array.isArray(parsed.workspaces) && parsed.workspaces[0]?.data?.nodes) {
          extractedNodes = parsed.workspaces[0].data.nodes;
          extractedLinks = parsed.workspaces[0].data.links || [];
          if (parsed.workspaces[0].name) caseName = parsed.workspaces[0].name;
        }

        caseNodes = extractedNodes.map((n, idx) => ({
          ...n,
          id: String(n.id || `node_${Date.now()}_${idx}`),
          label: String(n.label || n.name || `Entity #${idx + 1}`),
          type: String(n.type || 'person')
        }));

        caseLinks = extractedLinks.map(l => ({
          ...l,
          source: typeof l.source === 'object' ? String(l.source.id) : String(l.source),
          target: typeof l.target === 'object' ? String(l.target.id) : String(l.target),
          label: l.label ? String(l.label) : 'connected'
        }));
      } catch (tgErr) {
        console.error('Failed to download/parse case from Telegram:', tgErr);
      }
    }
    // 3. Decode from dataUrl if available
    else if (msg.fileAttachment?.dataUrl) {
      try {
        let jsonStr = '';
        const rawData = msg.fileAttachment.dataUrl;
        if (rawData.startsWith('data:')) {
          const commaIdx = rawData.indexOf(',');
          const header = commaIdx !== -1 ? rawData.slice(0, commaIdx) : '';
          const content = commaIdx !== -1 ? rawData.slice(commaIdx + 1) : rawData;
          if (header.includes('base64')) {
            try { jsonStr = decodeURIComponent(escape(atob(content))); } catch(_) { jsonStr = atob(content); }
          } else {
            try { jsonStr = decodeURIComponent(content); } catch(_) { jsonStr = content; }
          }
        } else {
          jsonStr = rawData;
        }

        const parsed = JSON.parse(jsonStr);
        let extractedNodes: any[] = [];
        let extractedLinks: any[] = [];

        if (Array.isArray(parsed)) {
          extractedNodes = parsed;
        } else if (parsed.graph && Array.isArray(parsed.graph.nodes)) {
          extractedNodes = parsed.graph.nodes;
          extractedLinks = parsed.graph.links || [];
          if (parsed.caseName) caseName = parsed.caseName;
        } else if (parsed.nodes && Array.isArray(parsed.nodes)) {
          extractedNodes = parsed.nodes;
          extractedLinks = parsed.links || [];
          if (parsed.caseName) caseName = parsed.caseName;
        } else if (parsed.workspaces && Array.isArray(parsed.workspaces) && parsed.workspaces[0]?.data?.nodes) {
          extractedNodes = parsed.workspaces[0].data.nodes;
          extractedLinks = parsed.workspaces[0].data.links || [];
          if (parsed.workspaces[0].name) caseName = parsed.workspaces[0].name;
        }

        caseNodes = extractedNodes.map((n, idx) => ({
          ...n,
          id: String(n.id || `node_${Date.now()}_${idx}`),
          label: String(n.label || n.name || `Entity #${idx + 1}`),
          type: String(n.type || 'person')
        }));

        caseLinks = extractedLinks.map(l => ({
          ...l,
          source: typeof l.source === 'object' ? String(l.source.id) : String(l.source),
          target: typeof l.target === 'object' ? String(l.target.id) : String(l.target),
          label: l.label ? String(l.label) : 'connected'
        }));
      } catch (err) {
        console.warn('Failed to parse .rhz dataUrl:', err);
      }
    }

    if (caseNodes.length === 0) {
      alert(`Amaran: Data entiti dalam fail kes "${fileName}" tidak dapat dinyahkod atau kosong.`);
      return;
    }

    // Step 1: Trigger HUD animation
    reportFileLoadProgress({
      fileName,
      fileSize,
      progress: 35,
      stage: `Menyahkod & menyusun ${caseNodes.length} nod kes...`,
      totalEntities: caseNodes.length
    });

    let finalNodes: Node[] = [];
    let finalLinks: Link[] = [];

    if (merge) {
      let baseNodes = graphData?.nodes ? [...graphData.nodes] : [];
      if (baseNodes.length === 1 && baseNodes[0].id === 'start_node_01' && baseNodes[0].label === 'NEW_TARGET') {
        baseNodes = [];
      }
      const existingIds = new Set(baseNodes.map(n => n.id));
      const newUnique = caseNodes.filter(n => !existingIds.has(n.id));
      finalNodes = [...baseNodes, ...newUnique];
      finalLinks = [...(graphData?.links || []), ...caseLinks];
    } else {
      finalNodes = caseNodes;
      finalLinks = caseLinks;
    }

    // Step 2: Use onLoadCase or onUpdateGraphFromCloud
    if (onLoadCase) {
      const fullCaseData = {
        id: `case_${Date.now()}`,
        caseName: caseName,
        graph: {
          nodes: caseNodes,
          links: caseLinks
        },
        timestamp: Date.now(),
        version: '2.9.1'
      };
      onLoadCase(fullCaseData, merge, fileName, fileSize);
    } else if (onUpdateGraphFromCloud) {
      onUpdateGraphFromCloud(finalNodes, finalLinks);
      if (onFocusNode && finalNodes.length > 0) {
        onFocusNode(finalNodes[0].id);
      }
    }

    // Step 3: Complete HUD
    reportFileLoadProgress({
      fileName,
      fileSize,
      progress: 100,
      stage: `Selesai! ${caseNodes.length} entiti dibuka atas Canvas.`,
      totalEntities: caseNodes.length,
      isComplete: true
    });

    setCanvasAddSuccess(`Kes "${caseName}" (${caseNodes.length} entiti) berjaya dimuatkan ke Canvas!`);
    setTimeout(() => setCanvasAddSuccess(null), 4000);

    // Step 4: Sync to room cloud
    if (roomId && currentUser) {
      try {
        await syncLiveGraphToRoom(roomId, { nodes: finalNodes, links: finalLinks }, currentUser);
        setLastSyncTime(Date.now());
      } catch (err) {
        console.warn('Failed to sync case to room:', err);
      }
    }
  };

  // Share current Canvas as a structured .RHZ Case to the Ops Room
  const handleShareCurrentCaseToChat = async () => {
    if (!currentUser || !roomId) {
      alert("Sila log masuk untuk berkongsi kes ke bilik ops.");
      return;
    }

    const cleanNodes = (graphData?.nodes || []).filter(n => !(n.id === 'start_node_01' && n.label === 'NEW_TARGET'));
    if (cleanNodes.length === 0) {
      alert("Canvas masih kosong! Tiada entiti untuk dikongsi.");
      return;
    }

    // Sanitize nodes into clean plain JSON objects (stripping circular references, d3 internal properties, etc.)
    const sanitizedNodes = cleanNodes.map((n, idx) => ({
      id: String(n.id || `node_${Date.now()}_${idx}`),
      label: String(n.label || `Entity #${idx + 1}`),
      type: String(n.type || 'person'),
      details: n.details ? String(n.details) : undefined,
      imageUrl: n.imageUrl ? String(n.imageUrl) : undefined,
      imageUrls: Array.isArray(n.imageUrls) ? n.imageUrls.map(String) : undefined,
      reports: n.reports ? String(n.reports) : undefined,
      htmlReportUrl: n.htmlReportUrl ? String(n.htmlReportUrl) : undefined,
      sourceType: n.sourceType ? String(n.sourceType) : undefined,
      url: n.url ? String(n.url) : undefined,
      vaultMatch: Boolean(n.vaultMatch),
      vaultSource: n.vaultSource ? String(n.vaultSource) : undefined,
      confidenceScore: typeof n.confidenceScore === 'number' ? n.confidenceScore : undefined,
      confidenceLevel: n.confidenceLevel || undefined,
      verificationStatus: n.verificationStatus || undefined,
      sources: Array.isArray(n.sources) ? n.sources.map(s => ({
        sourceName: String(s.sourceName || ''),
        timestamp: String(s.timestamp || ''),
        url: s.url ? String(s.url) : undefined,
        details: s.details ? String(s.details) : undefined
      })) : undefined,
      aliases: Array.isArray(n.aliases) ? n.aliases.map(String) : undefined,
      x: typeof n.x === 'number' ? Math.round(n.x) : undefined,
      y: typeof n.y === 'number' ? Math.round(n.y) : undefined,
    }));

    // Convert link source/target objects to string IDs safely (prevents circular structure JSON errors)
    const sanitizedLinks = (graphData?.links || []).map(l => ({
      source: typeof l.source === 'object' ? String((l.source as any).id) : String(l.source || ''),
      target: typeof l.target === 'object' ? String((l.target as any).id) : String(l.target || ''),
      label: String(l.label || 'connected'),
      isVault: Boolean(l.isVault)
    }));

    const caseName = `Kes Operasi ${roomId} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

    try {
      // 1. Instantly sync to room's active_canvas in Firestore so all live users get auto-updated canvas
      await syncLiveGraphToRoom(roomId, { nodes: sanitizedNodes, links: sanitizedLinks }, currentUser);
      setLastSyncTime(Date.now());

      // 2. Send case bundle card (.RHZ) into the chat room
      await sendCollabMessage(roomId, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhoto: currentUser.photoURL,
        senderRole: currentUser.role,
        text: `🗂️ Saya telah menyiarkan Kes Semasa Canvas (${sanitizedNodes.length} Entiti, ${sanitizedLinks.length} Hubungan). Tekan "BUKA & GANTI CANVAS" di bawah untuk memaparkan keseluruhan graf ini.`,
        type: 'case_share',
        fileAttachment: {
          name: `KES_${roomId}_${new Date().toISOString().slice(0, 10)}.rhz`,
          size: sanitizedNodes.length * 280,
          type: 'application/rhz'
        },
        casePayload: {
          caseName,
          totalEntities: sanitizedNodes.length,
          totalLinks: sanitizedLinks.length,
          nodes: sanitizedNodes,
          links: sanitizedLinks,
          version: '2.9.1'
        }
      });

      setCanvasAddSuccess(`Kes Canvas (${sanitizedNodes.length} entiti) berjaya disiarkan ke bilik operasi!`);
      setTimeout(() => setCanvasAddSuccess(null), 3500);
    } catch (err: any) {
      console.error("Gagal menyiarkan kes:", err);
      alert(`Gagal menyiarkan kes ke bilik operasi: ${err?.message || 'Ralat perkhidmatan'}`);
    }
  };

  // Add Shared Chat Image or Document directly as a Node onto the Live Canvas
  const handleAddFileToCanvas = async (fileAttachment: { name: string; size?: number; type?: string; dataUrl?: string }) => {
    if (!fileAttachment) return;

    const fileName = fileAttachment.name || 'Shared Intel File';
    const fileSize = fileAttachment.size || 0;
    const fileSizeKb = fileSize ? Math.round(fileSize / 1024) : 0;
    const hasDataUrl = Boolean(fileAttachment.dataUrl && fileAttachment.dataUrl.trim().length > 0);

    // If it's a .RHZ / .JSON file, redirect immediately to handleIngestCaseToCanvas
    const isRhzOrJson = fileName.toLowerCase().endsWith('.rhz') || fileName.toLowerCase().endsWith('.json');
    if (isRhzOrJson) {
      await handleIngestCaseToCanvas({ fileAttachment }, false);
      return;
    }

    reportFileLoadProgress({
      fileName,
      fileSize,
      progress: 60,
      stage: 'Menjana nod visual atas Canvas...'
    });

    const newNodeId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isImage = (hasDataUrl && (fileAttachment.dataUrl!.startsWith('data:image') || fileAttachment.dataUrl!.startsWith('http'))) || 
                    (fileAttachment.type && fileAttachment.type.startsWith('image/')) ||
                    /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(fileName);
    const isVideo = (fileAttachment.type && fileAttachment.type.startsWith('video/')) || /\.(mp4|webm|mov|mkv|avi)$/i.test(fileName);
    const isAudio = (fileAttachment.type && fileAttachment.type.startsWith('audio/')) || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileName);
    
    let nodeType: Node['type'] = 'file';
    if (isImage) nodeType = 'person';
    else if (isVideo) nodeType = 'media';
    else if (isAudio) nodeType = 'media';

    const newNode: Node = {
      id: newNodeId,
      label: fileName,
      type: nodeType,
      details: `${isVideo ? '📹 Rakaman Video Forensik' : isAudio ? '🎙️ Audio Risikan Forensik' : isImage ? '🖼️ Imej Bukti' : '📄 Dokumen Intel'}: ${fileName}${fileSizeKb > 0 ? ` (${fileSizeKb > 1024 ? `${(fileSizeKb / 1024).toFixed(1)} MB` : `${fileSizeKb} KB`})` : ''}`,
      imageUrl: hasDataUrl ? fileAttachment.dataUrl : undefined,
      imageUrls: hasDataUrl ? [fileAttachment.dataUrl!] : [],
      sourceType: 'chat_share'
    };

    // Filter out initial dummy start_node_01 if it's the only untouched node
    let baseNodes = graphData?.nodes ? [...graphData.nodes] : [];
    if (baseNodes.length === 1 && baseNodes[0].id === 'start_node_01' && baseNodes[0].label === 'NEW_TARGET') {
      baseNodes = [];
    }

    const newNodes = [...baseNodes, newNode];
    
    // Connect to active node if selected
    let newLinks = graphData?.links ? [...graphData.links] : [];
    if (activeNode && activeNode.id && activeNode.id !== newNodeId && baseNodes.some(n => n.id === activeNode.id)) {
      newLinks.push({
        source: activeNode.id,
        target: newNodeId,
        label: isImage ? 'lampiran_gambar' : 'lampiran_fail'
      });
    }

    // 1. Update local canvas state
    if (onUpdateGraphFromCloud) {
      onUpdateGraphFromCloud(newNodes, newLinks);
    }

    // 2. Automatically focus camera on the newly created node
    if (onFocusNode) {
      onFocusNode(newNodeId);
    }

    // 3. Show instant feedback toast
    setCanvasAddSuccess(`Nod "${fileName}" berjaya ditambah ke Canvas!`);
    setTimeout(() => setCanvasAddSuccess(null), 4000);

    reportFileLoadProgress({
      fileName,
      fileSize,
      progress: 100,
      stage: `Selesai! Nod "${fileName}" dipaparkan atas Canvas.`,
      isComplete: true
    });

    // 4. Broadcast immediately to all teammates in the Firestore room
    if (roomId && currentUser) {
      try {
        await syncLiveGraphToRoom(roomId, { nodes: newNodes, links: newLinks }, currentUser);
        setLastSyncTime(Date.now());
      } catch (err) {
        console.error('Failed to sync new file node to room:', err);
      }
    }
  };

  // Add Shared Linked Node directly to Live Canvas
  const handleAddLinkedNodeToCanvas = async (node: Partial<Node>) => {
    if (!node || !node.id) return;
    const existing = (graphData?.nodes || []).some(n => n.id === node.id);
    if (existing) {
      if (onFocusNode) onFocusNode(node.id);
      setCanvasAddSuccess(`Nod "${node.label || node.id}" sudah ada di Canvas (Difokuskan).`);
      setTimeout(() => setCanvasAddSuccess(null), 3000);
      return;
    }

    const newNode: Node = {
      id: String(node.id),
      label: String(node.label || 'Entity'),
      type: String(node.type || 'person'),
      details: node.details ? String(node.details) : '',
      imageUrl: node.imageUrl,
      imageUrls: node.imageUrls || (node.imageUrl ? [node.imageUrl] : []),
      sourceType: node.sourceType || 'chat_share'
    };

    let baseNodes = graphData?.nodes ? [...graphData.nodes] : [];
    if (baseNodes.length === 1 && baseNodes[0].id === 'start_node_01' && baseNodes[0].label === 'NEW_TARGET') {
      baseNodes = [];
    }

    const newNodes = [...baseNodes, newNode];
    let newLinks = graphData?.links ? [...graphData.links] : [];
    if (activeNode && activeNode.id && activeNode.id !== newNode.id && baseNodes.some(n => n.id === activeNode.id)) {
      newLinks.push({
        source: activeNode.id,
        target: newNode.id,
        label: 'dikongsi_sembang'
      });
    }

    if (onUpdateGraphFromCloud) {
      onUpdateGraphFromCloud(newNodes, newLinks);
    }
    if (onFocusNode) {
      onFocusNode(newNode.id);
    }
    setCanvasAddSuccess(`Nod "${newNode.label}" berjaya ditambah ke Canvas!`);
    setTimeout(() => setCanvasAddSuccess(null), 4000);

    if (roomId && currentUser) {
      try {
        await syncLiveGraphToRoom(roomId, { nodes: newNodes, links: newLinks }, currentUser);
        setLastSyncTime(Date.now());
      } catch (err) {
        console.error('Failed to sync linked node to room:', err);
      }
    }
  };

  // Add AI Discovered Social Media Node to Canvas
  const handleAddSocialNodeToCanvas = async (snode: SocialNodeIntel) => {
    if (!snode) return;
    const cleanId = snode.nodeId || `social_${snode.platform}_${Date.now()}`;
    const existing = (graphData?.nodes || []).find(n => n.id === cleanId || n.label.toLowerCase() === snode.handleOrLabel.toLowerCase());
    if (existing) {
      if (onFocusNode) onFocusNode(existing.id);
      setCanvasAddSuccess(`Nod akaun "${existing.label}" sudah wujud pada Canvas (Difokuskan).`);
      setTimeout(() => setCanvasAddSuccess(null), 3000);
      return;
    }

    const newNode: Node = {
      id: cleanId,
      label: snode.handleOrLabel,
      type: snode.platform || 'social',
      details: snode.details || `Akaun ${snode.platformName} sasaran${snode.url ? ` (${snode.url})` : ''}`,
      url: snode.url || '',
      imageUrl: snode.imageUrl,
      verificationStatus: 'VERIFIED',
      sourceType: 'ai_analyst'
    };

    let baseNodes = graphData?.nodes ? [...graphData.nodes] : [];
    if (baseNodes.length === 1 && baseNodes[0].id === 'start_node_01' && baseNodes[0].label === 'NEW_TARGET') {
      baseNodes = [];
    }

    const newNodes = [...baseNodes, newNode];
    let newLinks = graphData?.links ? [...graphData.links] : [];
    if (activeNode && activeNode.id && activeNode.id !== newNode.id && baseNodes.some(n => n.id === activeNode.id)) {
      newLinks.push({
        source: activeNode.id,
        target: newNode.id,
        label: snode.relationship || 'owns_social_account'
      });
    }

    if (onUpdateGraphFromCloud) {
      onUpdateGraphFromCloud(newNodes, newLinks);
    }
    if (onFocusNode) {
      onFocusNode(newNode.id);
    }
    setCanvasAddSuccess(`Nod media sosial "${newNode.label}" berjaya ditambah & dihubungkan ke Canvas!`);
    setTimeout(() => setCanvasAddSuccess(null), 4000);

    if (roomId && currentUser) {
      try {
        await syncLiveGraphToRoom(roomId, { nodes: newNodes, links: newLinks }, currentUser);
        setLastSyncTime(Date.now());
      } catch (err) {
        console.error('Failed to sync social node to room:', err);
      }
    }
  };

  // EXECUTE SECURE PURGE ACTIONS
  const confirmAndExecutePurge = async () => {
    if (!roomId) return;
    setIsPurging(true);
    try {
      if (purgeDialog.type === 'messages') {
        const count = await purgeAllRoomMessages(roomId);
        setMessages([]);
        setPurgeSuccessNotice(`Berjaya memadam ${count} mesej & perkongsian fail dari Firestore (${roomId}).`);
      } else if (purgeDialog.type === 'canvas') {
        isIncomingSyncRef.current = true;
        await purgeRoomLiveCanvas(roomId);
        if (onUpdateGraphFromCloud) {
          onUpdateGraphFromCloud([], []);
        }
        lastPushedFingerprintRef.current = '';
        setPurgeSuccessNotice(`Live Cloud Canvas untuk bilik (${roomId}) telah dipadam dan dikosongkan.`);
        setTimeout(() => {
          isIncomingSyncRef.current = false;
        }, 2000);
      } else if (purgeDialog.type === 'room') {
        isIncomingSyncRef.current = true;
        await purgeEntireOperationRoom(roomId);
        if (onUpdateGraphFromCloud) {
          onUpdateGraphFromCloud([], []);
        }
        lastPushedFingerprintRef.current = '';
        setMessages([]);
        setPurgeSuccessNotice(`Bilik Operasi (${roomId}) telah dihapuskan sepenuhnya dari Firestore.`);
        setRoomId('OPS-RED-ALPHA');
        setTempRoomInput('OPS-RED-ALPHA');
        localStorage.setItem('redhorizon_collab_room_id', 'OPS-RED-ALPHA');
        setTimeout(() => {
          isIncomingSyncRef.current = false;
        }, 2000);
      } else if (purgeDialog.type === 'local') {
        await executeZeroTraceLocalPurge();
        setPurgeSuccessNotice('Semua data tempatan (LocalStorage, SessionStorage, IndexedDB RedHorizonDB, Caches) telah dibersihkan tanpa jejak.');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else if (purgeDialog.type === 'master') {
        await purgeEntireOperationRoom(roomId).catch(() => {});
        await executeZeroTraceLocalPurge();
        setPurgeSuccessNotice('Pembersihan Taktikal Penuh Selesai. Sistem dimuat semula tanpa jejak...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
      setPurgeDialog({ open: false, type: 'messages', title: '', description: '', warningLevel: 'high' });
      setTimeout(() => setPurgeSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error('Purge error:', err);
      alert('Gagal melaksanakan operasi purge: ' + (err.message || err));
    } finally {
      setIsPurging(false);
    }
  };

  // List of operatives & AI analysts available for @mention
  const mentionCandidates = React.useMemo(() => {
    const list: { id: string; name: string; role: string; email?: string; photoURL?: string; isAI?: boolean; provider?: string; badge?: string; icon?: string; desc?: string }[] = [];
    const seen = new Set<string>();

    // 1. Add AI Analyst Agents first with high priority
    AI_ANALYST_ROSTER.forEach((ai) => {
      seen.add(ai.mentionTag.toLowerCase());
      list.push({
        id: ai.id,
        name: ai.mentionTag,
        role: 'ai_analyst',
        provider: ai.provider,
        badge: ai.badge,
        icon: ai.icon,
        desc: ai.desc,
        isAI: true
      });
    });

    // 2. Add online operatives
    onlineOps.forEach((op) => {
      if (op.displayName && !seen.has(op.displayName.toLowerCase())) {
        seen.add(op.displayName.toLowerCase());
        list.push({
          id: op.uid,
          name: op.displayName,
          role: op.role || 'investigator',
          email: op.email,
          photoURL: op.photoURL
        });
      }
    });

    // 3. Add senders from recent messages in this room
    messages.forEach((msg) => {
      if (msg.senderName && !seen.has(msg.senderName.toLowerCase())) {
        seen.add(msg.senderName.toLowerCase());
        list.push({
          id: msg.senderId || msg.senderName,
          name: msg.senderName,
          role: msg.senderRole || 'investigator',
          photoURL: msg.senderPhoto
        });
      }
    });

    // 4. Fallback default operatives if room is empty
    if (list.length === AI_ANALYST_ROSTER.length) {
      list.push({ id: 'lead', name: 'Commander', role: 'lead' });
      list.push({ id: 'analyst', name: 'Analyst', role: 'analyst' });
    }

    if (!mentionFilter.trim()) return list;
    const filterLower = mentionFilter.toLowerCase();
    return list.filter(c => 
      c.name.toLowerCase().includes(filterLower) || 
      (c.email && c.email.toLowerCase().includes(filterLower)) ||
      c.role.toLowerCase().includes(filterLower) ||
      (c.provider && c.provider.toLowerCase().includes(filterLower)) ||
      (c.desc && c.desc.toLowerCase().includes(filterLower))
    );
  }, [onlineOps, messages, mentionFilter]);

  // Scroll to a specific replied message and flash-highlight it
  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`collab-msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(messageId);
      setTimeout(() => {
        setHighlightedMsgId((prev) => (prev === messageId ? null : prev));
      }, 2500);
    }
  };

  // Select an operative or AI from @mention autocomplete
  const handleSelectMention = (candidateName: string) => {
    const input = chatInputRef.current;
    const cursorPos = input?.selectionStart ?? inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorPos);
    const textAfterCursor = inputText.slice(cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    let newText = '';
    let newCursorPos = 0;
    if (atIndex !== -1) {
      newText = textBeforeCursor.slice(0, atIndex) + `@${candidateName} ` + textAfterCursor;
      newCursorPos = atIndex + candidateName.length + 2;
    } else {
      newText = inputText + (inputText.endsWith(' ') ? '' : ' ') + `@${candidateName} `;
      newCursorPos = newText.length;
    }
    
    setInputText(newText);
    setShowMentionMenu(false);
    setMentionFilter('');
    setTimeout(() => {
      input?.focus();
      input?.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Input change handler with @mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    const cursorPos = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_.-]*)$/);
    if (atMatch) {
      setShowMentionMenu(true);
      setMentionFilter(atMatch[1]);
    } else {
      setShowMentionMenu(false);
    }
  };

  // Helper to render message text with clean Markdown, styling, and highlighted @mentions
  const renderMessageContent = (
    text: string, 
    currentUserName?: string, 
    currentUserEmail?: string,
    isAI: boolean = false
  ) => {
    if (!text) return null;

    // Check if text is from AI or contains markdown markers
    const hasMarkdown = isAI || /[*#_`~\[\]>]/.test(text) || text.includes('\n- ') || text.includes('\n1. ');

    if (hasMarkdown) {
      return (
        <div className="prose-cyber max-w-none text-slate-100 leading-relaxed break-words space-y-1.5">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <div className="flex items-center gap-1.5 text-xs font-black text-cyan-300 uppercase tracking-wider mt-2 mb-1 pb-1 border-b border-cyan-500/30">
                  <span className="text-cyan-400">⚡</span>
                  <span>{children}</span>
                </div>
              ),
              h2: ({ children }) => (
                <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300 uppercase tracking-wide mt-2 mb-1 pb-0.5 border-b border-amber-500/30">
                  <span className="text-amber-400">◆</span>
                  <span>{children}</span>
                </div>
              ),
              h3: ({ children }) => (
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-amber-200 mt-2 mb-0.5">
                  <span className="text-amber-400 font-mono text-[9px]">▶</span>
                  <span className="font-bold">{children}</span>
                </div>
              ),
              h4: ({ children }) => (
                <div className="text-[10px] font-bold text-cyan-200 uppercase tracking-wide mt-1.5 mb-0.5">
                  {children}
                </div>
              ),
              p: ({ children }) => (
                <p className="text-[10.5px] sm:text-[11px] text-slate-100 leading-relaxed mb-1.5 last:mb-0">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-amber-200 drop-shadow-sm">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="text-slate-300 italic">{children}</em>
              ),
              ul: ({ children }) => (
                <ul className="space-y-1 my-1 pl-3.5 list-disc list-outside marker:text-cyan-400 text-[10px]">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="space-y-1 my-1 pl-3.5 list-decimal list-outside marker:text-amber-400 font-mono text-[10px]">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-[10px] text-slate-200 leading-normal pl-0.5">
                  {children}
                </li>
              ),
              code: ({ children }) => {
                const codeText = String(children).replace(/\n$/, '');
                if (codeText.includes('\n')) {
                  return (
                    <pre className="p-2 rounded bg-black/90 border border-slate-700 text-cyan-300 font-mono text-[9.5px] overflow-x-auto my-1.5">
                      <code>{codeText}</code>
                    </pre>
                  );
                }
                return (
                  <code className="px-1.5 py-0.5 rounded bg-black/70 border border-slate-700/80 text-cyan-300 font-mono text-[9px] select-all">
                    {codeText}
                  </code>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-amber-400/80 bg-amber-950/20 px-2.5 py-1 my-1.5 rounded-r text-[9.5px] text-slate-300 italic">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto rounded border border-slate-700 bg-slate-950/80">
                  <table className="w-full text-left text-[9px] border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-slate-900 text-cyan-300 border-b border-slate-700">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="p-1.5 font-bold uppercase tracking-wider">{children}</th>
              ),
              td: ({ children }) => (
                <td className="p-1.5 border-t border-slate-800 text-slate-200">{children}</td>
              ),
              a: ({ href, children }) => {
                if (href && (href.startsWith('#') || href.startsWith('node:'))) {
                  const targetNodeId = href.replace(/^#|^node:/, '');
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onFocusNode) onFocusNode(targetNodeId);
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-400/60 font-mono font-bold text-[9px] transition-colors mx-0.5 active:scale-95"
                      title="Klik untuk fokus nod ini di canvas"
                    >
                      <Target size={9} className="text-cyan-400" />
                      <span>{children}</span>
                    </button>
                  );
                }
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 hover:text-cyan-200 underline inline-flex items-center gap-0.5 font-medium"
                  >
                    <span>{children}</span>
                    <ExternalLink size={9} className="inline ml-0.5" />
                  </a>
                );
              }
            }}
          >
            {text}
          </Markdown>
        </div>
      );
    }

    const parts = text.split(/(@[a-zA-Z0-9_.-]+)/g);
    return (
      <span className="whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            const rawTag = part.slice(1);
            const tagLower = rawTag.toLowerCase();
            const isMe = (currentUserName && tagLower === currentUserName.toLowerCase()) ||
                         (currentUserEmail && (
                           currentUserEmail.toLowerCase().includes(tagLower) ||
                           tagLower === currentUserEmail.split('@')[0].toLowerCase()
                         ));
            
            // Check if mention is an AI Analyst
            const aiMatch = AI_ANALYST_ROSTER.find(a => 
              a.mentionTag.toLowerCase() === tagLower || 
              a.aliases.some(alias => alias.toLowerCase() === tagLower)
            );

            if (aiMatch) {
              return (
                <span
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (chatInputRef.current) {
                      setInputText(prev => prev + (prev.endsWith(' ') ? '' : ' ') + `@${aiMatch.mentionTag} `);
                      chatInputRef.current.focus();
                    }
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold font-mono text-[9px] mx-0.5 transition-all cursor-pointer select-none bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-purple-500/20 text-amber-200 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.3)] hover:scale-105"
                  title={`AI Analyst (${aiMatch.name}) - Klik untuk seru dalam sembang`}
                >
                  <span className="text-[10px]">{aiMatch.icon}</span>
                  <AtSign size={8} className="text-amber-400" />
                  <span>{aiMatch.mentionTag}</span>
                  <span className="text-[7.5px] px-1 rounded bg-amber-950 text-amber-300 uppercase font-black">{aiMatch.badge}</span>
                </span>
              );
            }

            return (
              <span
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  if (chatInputRef.current) {
                    setInputText(prev => prev + (prev.endsWith(' ') ? '' : ' ') + `@${rawTag} `);
                    chatInputRef.current.focus();
                  }
                }}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold font-mono text-[9px] mx-0.5 transition-all cursor-pointer select-none ${
                  isMe
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/70 shadow-[0_0_10px_rgba(251,191,36,0.4)] ring-1 ring-amber-400/40'
                    : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400'
                }`}
                title={isMe ? 'Anda diseru dalam mesej ini! Klik untuk balas atau seru semula' : `Menyeru @${rawTag} (Klik untuk seru dalam sembang)`}
              >
                <AtSign size={8} className={isMe ? 'text-amber-300' : 'text-cyan-400'} />
                <span>{rawTag}</span>
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  // Comprehensive helper to resolve and extract canvas nodes for ANY message (guaranteeing focus & zoom availability)
  const resolveMatchedNodes = (msg: CollabMessage): MatchedCanvasNodeIntel[] => {
    // 1. Direct matched canvas nodes from payload
    if (msg.aiAnalystPayload?.matchedCanvasNodes && msg.aiAnalystPayload.matchedCanvasNodes.length > 0) {
      return msg.aiAnalystPayload.matchedCanvasNodes;
    }

    // 2. Direct target focus ID from payload
    if (msg.aiAnalystPayload?.targetFocusNodeId) {
      const found = allNodes?.find(n => n.id === msg.aiAnalystPayload?.targetFocusNodeId);
      if (found) {
        const conns = (graphData?.links || []).filter(l => {
          const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
          return s === found.id || t === found.id;
        }).length;
        return [{
          nodeId: found.id,
          label: found.label,
          type: found.type || 'entity',
          details: found.details,
          url: found.url,
          connectionsCount: conns,
          relevanceReason: 'Nod Sasaran Utama Analisis'
        }];
      }
    }

    // 3. Scan message text against allNodes
    if (allNodes && allNodes.length > 0 && msg.text) {
      const textLower = msg.text.toLowerCase();
      const matched: MatchedCanvasNodeIntel[] = [];
      const seenIds = new Set<string>();

      // Check active node first if mentioned in text
      if (activeNode && textLower.includes(activeNode.label.toLowerCase())) {
        seenIds.add(activeNode.id);
        const conns = (graphData?.links || []).filter(l => {
          const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
          return s === activeNode.id || t === activeNode.id;
        }).length;
        matched.push({
          nodeId: activeNode.id,
          label: activeNode.label,
          type: activeNode.type || 'entity',
          details: activeNode.details,
          url: activeNode.url,
          connectionsCount: conns,
          relevanceReason: 'Nod Sasaran Semasa'
        });
      }

      // Check other nodes in graph
      for (const n of allNodes) {
        if (seenIds.has(n.id)) continue;
        if (!n.label || n.label.trim().length < 3) continue;
        if (textLower.includes(n.label.toLowerCase())) {
          seenIds.add(n.id);
          const conns = (graphData?.links || []).filter(l => {
            const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
            const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
            return s === n.id || t === n.id;
          }).length;
          matched.push({
            nodeId: n.id,
            label: n.label,
            type: n.type || 'entity',
            details: n.details,
            url: n.url,
            connectionsCount: conns,
            relevanceReason: `Dikesan dalam teks perbualan`
          });
          if (matched.length >= 8) break;
        }
      }

      if (matched.length > 0) {
        return matched;
      }
    }

    // 4. For AI messages with no specific text match, fallback to active node or top connected hubs
    if ((msg.type === 'ai_analyst' || Boolean(msg.aiAnalystPayload)) && allNodes && allNodes.length > 0) {
      const topHubs = [...allNodes].map(n => {
        const conns = (graphData?.links || []).filter(l => {
          const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
          return s === n.id || t === n.id;
        }).length;
        return { ...n, conns };
      }).sort((a, b) => b.conns - a.conns);

      const fallbackList: MatchedCanvasNodeIntel[] = [];
      if (activeNode) {
        const conns = (graphData?.links || []).filter(l => {
          const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
          return s === activeNode.id || t === activeNode.id;
        }).length;
        fallbackList.push({
          nodeId: activeNode.id,
          label: activeNode.label,
          type: activeNode.type || 'entity',
          details: activeNode.details,
          url: activeNode.url,
          connectionsCount: conns,
          relevanceReason: 'Nod Sasaran Aktif di Canvas'
        });
      }

      topHubs.slice(0, activeNode ? 3 : 4).forEach(h => {
        if (!fallbackList.some(f => f.nodeId === h.id)) {
          fallbackList.push({
            nodeId: h.id,
            label: h.label,
            type: h.type || 'entity',
            details: h.details,
            url: h.url,
            connectionsCount: h.conns,
            relevanceReason: h.conns > 0 ? `Hub Utama (${h.conns} sambungan)` : `Entiti [${h.type}]`
          });
        }
      });

      return fallbackList;
    }

    return [];
  };

  // Trigger AI Analyst response in background and post to room
  const triggerAIAnalystResponse = async (mentionTag: string, userPrompt: string, senderName: string, chipId?: string) => {
    if (chipId) {
      setActiveQuickChip(chipId);
    }
    const cleanTag = mentionTag.toLowerCase().replace('@', '');
    const matchedAgent = AI_ANALYST_ROSTER.find(a => 
      a.mentionTag.toLowerCase() === cleanTag || 
      a.aliases.some(alias => alias.toLowerCase() === cleanTag)
    );

    const agentTitle = matchedAgent ? matchedAgent.name : 'AI Intelligence Analyst';
    setIsAIThinking(agentTitle);

    try {
      const aiResponse = await consultAIAnalyst({
        mentionTag,
        userPrompt,
        senderName,
        graphData,
        activeNode,
        recentMessages: messages.slice(-10).map(m => ({
          senderName: m.senderName,
          senderRole: m.senderRole,
          text: m.text,
          type: m.type,
          timestamp: m.timestamp
        }))
      });

      const aiCollabMsg: CollabMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        senderId: `ai_analyst_${cleanTag}`,
        senderName: aiResponse.analystName,
        senderRole: 'ai_analyst',
        text: aiResponse.content,
        type: 'ai_analyst',
        aiAnalystPayload: {
          analystName: aiResponse.analystName,
          analystModel: aiResponse.analystModel,
          suggestedTools: aiResponse.suggestedTools,
          targetFocusNodeId: aiResponse.targetFocusNodeId,
          matchedCanvasNodes: aiResponse.matchedCanvasNodes,
          socialMediaNodes: aiResponse.socialMediaNodes,
          webSources: aiResponse.webSources,
          searchQueries: aiResponse.searchQueries
        },
        timestamp: Date.now()
      };

      // Optimistic add locally
      setMessages(prev => [...prev, aiCollabMsg]);

      // Broadcast to Firebase Firestore room
      if (roomId) {
        await sendCollabMessage(roomId, {
          senderId: `ai_analyst_${cleanTag}`,
          senderName: aiResponse.analystName,
          senderRole: 'ai_analyst',
          text: aiResponse.content,
          type: 'ai_analyst',
          aiAnalystPayload: {
            analystName: aiResponse.analystName,
            analystModel: aiResponse.analystModel,
            suggestedTools: aiResponse.suggestedTools,
            targetFocusNodeId: aiResponse.targetFocusNodeId,
            matchedCanvasNodes: aiResponse.matchedCanvasNodes,
            socialMediaNodes: aiResponse.socialMediaNodes,
            webSources: aiResponse.webSources,
            searchQueries: aiResponse.searchQueries
          }
        });
      }

      playMentionChime();
    } catch (err) {
      console.error('AI Analyst invocation failed:', err);
    } finally {
      setIsAIThinking(null);
      setActiveQuickChip(null);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedFile) || !currentUser || !roomId) return;

    const isCase = Boolean(attachedFile?.casePayload);
    const textToSend = inputText.trim() || (isCase 
      ? `🗂️ Fail Kes Dikongsi: ${attachedFile?.casePayload?.caseName} (${attachedFile?.casePayload?.totalEntities} Entiti, ${attachedFile?.casePayload?.totalLinks || 0} Pautan Hubungan)`
      : (attachedFile ? `📎 Fail dikongsi: ${attachedFile.name}` : ''));
    const fileToSend = attachedFile;
    const replySnapshot = replyingTo ? {
      messageId: replyingTo.id,
      senderName: replyingTo.senderName,
      senderRole: replyingTo.senderRole,
      text: (replyingTo.text || replyingTo.fileAttachment?.name || replyingTo.casePayload?.caseName || 'Lampiran').slice(0, 150),
      type: replyingTo.type
    } : undefined;

    setInputText('');
    setAttachedFile(null);
    setReplyingTo(null);
    setShowMentionMenu(false);

    // Check for AI Analyst mention
    const aiMentionMatch = textToSend.match(/@(ai|gemini|deepseek|r1|nomatron|nemotron|nvidia|analyst|scout|osint)\b/i);

    // Optimistic UI update: Display message on local screen immediately
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const optimisticMessage: CollabMessage = {
      id: tempId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      senderPhoto: currentUser.photoURL,
      senderRole: currentUser.role,
      text: textToSend,
      replyTo: replySnapshot,
      fileAttachment: fileToSend ? {
        name: fileToSend.name,
        size: fileToSend.size,
        type: fileToSend.type,
        dataUrl: fileToSend.dataUrl,
        telegramFileId: fileToSend.telegramFileId,
        telegramDownloadUrl: fileToSend.telegramDownloadUrl,
        isTelegramRelay: fileToSend.isTelegramRelay
      } : undefined,
      casePayload: fileToSend?.casePayload || undefined,
      type: isCase ? 'case_share' : (fileToSend ? 'file_share' : (isUrgent ? 'urgent_intel' : 'chat')),
      timestamp: Date.now()
    };

    setMessages((prev) => {
      // Avoid duplicate temp
      if (prev.some(m => m.id === tempId)) return prev;
      return [...prev, optimisticMessage];
    });

    try {
      await sendCollabMessage(roomId, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhoto: currentUser.photoURL,
        senderRole: currentUser.role,
        text: textToSend,
        replyTo: replySnapshot,
        fileAttachment: fileToSend ? {
          name: fileToSend.name,
          size: fileToSend.size,
          type: fileToSend.type,
          dataUrl: fileToSend.dataUrl,
          telegramFileId: fileToSend.telegramFileId,
          telegramDownloadUrl: fileToSend.telegramDownloadUrl,
          isTelegramRelay: fileToSend.isTelegramRelay
        } : undefined,
        casePayload: fileToSend?.casePayload || undefined,
        type: isCase ? 'case_share' : (fileToSend ? 'file_share' : (isUrgent ? 'urgent_intel' : 'chat'))
      });

      // If an AI analyst was mentioned, trigger its response now
      const isSocialOrTargetQuestion = /((social|sosial)\s*media|media\s*sosial|akaun|node\s*(sosial|media|mana|yg|yang)|yang\s*mana\s*satu|mana\s*(nod|node|akaun|link|url|profil|sasaran)|profil|target|sasaran|twitter|instagram|facebook|tiktok|telegram|github|linkedin|youtube)/i.test(textToSend);

      if (aiMentionMatch) {
        triggerAIAnalystResponse(aiMentionMatch[0], textToSend, currentUser.displayName);
      } else if (isSocialOrTargetQuestion) {
        // Auto-consult AI Neural Lead Analyst for immediate tactical clarity
        triggerAIAnalystResponse('@ai', textToSend, currentUser.displayName);
      }

      // Also broadcast to Telegram Channel/Group if configured
      if (telegramConfig.enabled && telegramConfig.botToken && telegramConfig.chatId && !fileToSend?.isTelegramRelay) {
        const replyTag = replySnapshot ? ` [Membalas @${replySnapshot.senderName}]` : '';
        sendTelegramBroadcast(
          `🛰️ [OPS ${roomId}] ${currentUser.displayName}${replyTag}: ${textToSend}`,
          telegramConfig
        ).catch(() => {});
      }

      setIsUrgent(false);
    } catch (err: any) {
      console.error('Send message failed:', err);
      const errMsg = err?.message || 'Ralat semasa menghantar mesej.';
      setCanvasAddSuccess(`⚠️ Ralat penghantaran: ${errMsg.length > 80 ? 'Dokumen melebihi had saiz atau sambungan terputus.' : errMsg}`);
      setTimeout(() => setCanvasAddSuccess(null), 5000);
    }
  };

  // Broadcast Selected Node Finding
  const handleBroadcastNode = async (node: Node) => {
    if (!currentUser || !roomId) return;

    // Optimistic finding broadcast message
    const optimisticFinding: CollabMessage = {
      id: `temp_finding_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      senderPhoto: currentUser.photoURL,
      senderRole: currentUser.role,
      text: `📌 PENEMUAN BARU DIKONGSI: [${node.type.toUpperCase()}] "${node.label}"`,
      timestamp: Date.now(),
      type: 'finding_broadcast',
      linkedNode: {
        id: node.id,
        label: node.label,
        type: node.type,
        details: node.details,
        imageUrl: node.imageUrl || (node.imageUrls && node.imageUrls[0])
      }
    };

    setMessages(prev => {
      if (prev.some(m => m.type === 'finding_broadcast' && m.linkedNode?.id === node.id && Date.now() - (m.timestamp || 0) < 3000)) {
        return prev;
      }
      return [...prev, optimisticFinding];
    });

    try {
      await sendCollabMessage(roomId, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhoto: currentUser.photoURL,
        senderRole: currentUser.role,
        text: `📌 PENEMUAN BARU DIKONGSI: [${node.type.toUpperCase()}] "${node.label}"`,
        type: 'finding_broadcast',
        linkedNode: {
          id: node.id,
          label: node.label,
          type: node.type,
          details: node.details,
          imageUrl: node.imageUrl || (node.imageUrls && node.imageUrls[0])
        }
      });
      setCanvasAddSuccess(`Penemuan entiti [${node.type.toUpperCase()}] "${node.label}" berjaya dikongsi ke bilik sembang!`);
      setTimeout(() => setCanvasAddSuccess(null), 4000);
    } catch (err) {
      console.error('Broadcast finding error:', err);
    }
  };

  // Auto broadcast node payload when requested from RadialMenu
  useEffect(() => {
    if (isOpen && shareNodeTarget) {
      setActiveTab('chat');
      setIsMinimized(false);
      handleBroadcastNode(shareNodeTarget);
      if (onClearShareNodeTarget) {
        onClearShareNodeTarget();
      }
    }
  }, [isOpen, shareNodeTarget]);

  // Push Canvas to Cloud
  const handlePushCanvasToCloud = async () => {
    if (!currentUser || !roomId || !graphData) return;
    try {
      const cleanNodes = (graphData.nodes || []).filter(n => !(n.id === 'start_node_01' && n.label === 'NEW_TARGET'));
      const sanitizedNodes = cleanNodes.map((n, idx) => ({
        id: String(n.id || `node_${Date.now()}_${idx}`),
        label: String(n.label || `Entity #${idx + 1}`),
        type: String(n.type || 'person'),
        details: n.details ? String(n.details) : undefined,
        imageUrl: n.imageUrl ? String(n.imageUrl) : undefined,
        imageUrls: Array.isArray(n.imageUrls) ? n.imageUrls.map(String) : undefined,
        reports: n.reports ? String(n.reports) : undefined,
        htmlReportUrl: n.htmlReportUrl ? String(n.htmlReportUrl) : undefined,
        sourceType: n.sourceType ? String(n.sourceType) : undefined,
        url: n.url ? String(n.url) : undefined,
        vaultMatch: Boolean(n.vaultMatch),
        vaultSource: n.vaultSource ? String(n.vaultSource) : undefined,
        confidenceScore: typeof n.confidenceScore === 'number' ? n.confidenceScore : undefined,
        confidenceLevel: n.confidenceLevel || undefined,
        verificationStatus: n.verificationStatus || undefined,
        sources: Array.isArray(n.sources) ? n.sources.map(s => ({
          sourceName: String(s.sourceName || ''),
          timestamp: String(s.timestamp || ''),
          url: s.url ? String(s.url) : undefined,
          details: s.details ? String(s.details) : undefined
        })) : undefined,
        aliases: Array.isArray(n.aliases) ? n.aliases.map(String) : undefined,
        x: typeof n.x === 'number' ? Math.round(n.x) : undefined,
        y: typeof n.y === 'number' ? Math.round(n.y) : undefined,
      }));

      const sanitizedLinks = (graphData.links || []).map(l => ({
        source: typeof l.source === 'object' ? String((l.source as any).id) : String(l.source || ''),
        target: typeof l.target === 'object' ? String((l.target as any).id) : String(l.target || ''),
        label: String(l.label || 'connected'),
        isVault: Boolean(l.isVault)
      }));

      await syncLiveGraphToRoom(roomId, { nodes: sanitizedNodes, links: sanitizedLinks }, currentUser);
      setLastSyncTime(Date.now());
      setCanvasAddSuccess("Canvas kes berjaya disiarkan ke bilik operasi awan!");
      setTimeout(() => setCanvasAddSuccess(null), 3000);

      await sendCollabMessage(roomId, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderPhoto: currentUser.photoURL,
        senderRole: currentUser.role,
        text: `🔄 Menyelaraskan seluruh graf canvas (${sanitizedNodes.length} nod, ${sanitizedLinks.length} pautan) ke bilik operasi awan.`,
        type: 'system'
      });
    } catch (err: any) {
      console.error('Push canvas error:', err);
      alert(`Gagal menyiarkan canvas ke awan: ${err?.message || 'Ralat'}`);
    }
  };

  // Generate Invite URL - Uses direct web application origin to prevent 404 errors when shared
  const getInviteUrl = () => {
    let baseOrigin = window.location.origin;
    if (!baseOrigin || baseOrigin === 'null' || baseOrigin.includes('localhost')) {
      baseOrigin = window.location.href.split('?')[0].split('#')[0];
    } else {
      baseOrigin = `${baseOrigin}${window.location.pathname}`;
    }
    const cleanBase = baseOrigin.endsWith('/') ? baseOrigin : `${baseOrigin}/`;
    return `${cleanBase}?room=${encodeURIComponent(roomId)}`;
  };

  // Copy Room Invite Link
  const handleCopyRoomLink = () => {
    const url = getInviteUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handle Emoji Reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !roomId) return;
    await toggleMessageReaction(roomId, messageId, emoji, currentUser.uid);
  };

  // Delete message from in-app room chat only (Telegram backup stays intact)
  const handleDeleteMessage = async (messageId: string) => {
    if (!roomId || !messageId) return;
    try {
      await deleteCollabMessage(roomId, messageId);
      setCanvasAddSuccess("Mesej berjaya dipadam dari ruang sembang aplikasi.");
      setTimeout(() => setCanvasAddSuccess(null), 2500);
    } catch (err) {
      console.error("Gagal memadam mesej:", err);
      alert("Gagal memadam mesej dari bilik sembang.");
    }
  };

  if (!isOpen) return <div className="hidden" />;

  return (
    <div 
      style={{
        transform: (dragPos.x !== 0 || dragPos.y !== 0) ? `translate3d(${dragPos.x}px, ${dragPos.y}px, 0)` : undefined,
        willChange: isDragging ? 'transform' : 'auto',
        ...(!isMinimized && !isDocked ? {
          width: `${chatWidth}px`,
          height: `${chatHeight}px`,
          maxWidth: '96vw',
          maxHeight: '94vh'
        } : !isMinimized && isDocked ? {
          width: `${Math.max(380, chatWidth)}px`,
          maxWidth: '96vw'
        } : {})
      }}
      className={`fixed z-[90] font-mono text-xs select-none ${
        isResizing || isDragging ? 'transition-none pointer-events-auto select-none' : 'transition-all duration-200'
      } ${
        isDocked 
          ? 'right-0 top-0 bottom-0 shadow-2xl'
          : isMinimized 
            ? 'bottom-4 right-4 w-auto max-w-[210px] sm:max-w-[280px] h-11'
            : 'bottom-4 right-4'
      }`}
    >
      <div className="relative w-full h-full flex flex-col bg-slate-950/95 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-[0_0_35px_rgba(6,182,212,0.22)] overflow-hidden">
        
        {/* RESIZE DRAG HANDLERS (Left edge, Top edge, Top-Left Corner) */}
        {!isMinimized && !isDocked && (
          <>
            {/* Left Edge Resizer */}
            <div 
              onMouseDown={(e) => { e.preventDefault(); setIsResizing('left'); }}
              onTouchStart={() => setIsResizing('left')}
              title="Tarik untuk laraskan kelebaran tetingkap chat"
              className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-cyan-500/40 z-50 transition-colors flex items-center justify-center group"
            >
              <div className="w-0.5 h-10 bg-cyan-400/40 group-hover:bg-cyan-300 transition-colors rounded-full" />
            </div>

            {/* Top Edge Resizer */}
            <div 
              onMouseDown={(e) => { e.preventDefault(); setIsResizing('top'); }}
              onTouchStart={() => setIsResizing('top')}
              title="Tarik untuk laraskan ketinggian tetingkap chat"
              className="absolute left-0 right-0 top-0 h-2.5 cursor-ns-resize hover:bg-cyan-500/40 z-50 transition-colors flex items-center justify-center group"
            >
              <div className="h-0.5 w-10 bg-cyan-400/40 group-hover:bg-cyan-300 transition-colors rounded-full" />
            </div>

            {/* Top-Left Corner Resizer */}
            <div 
              onMouseDown={(e) => { e.preventDefault(); setIsResizing('corner'); }}
              onTouchStart={() => setIsResizing('corner')}
              title="Tarik penjuru untuk laraskan kelebaran & ketinggian serentak"
              className="absolute left-0 top-0 w-4 h-4 cursor-nwse-resize hover:bg-cyan-400/60 z-50 transition-colors rounded-br-lg"
            />
          </>
        )}

        {/* Docked Left Edge Resizer */}
        {!isMinimized && isDocked && (
          <div 
            onMouseDown={(e) => { e.preventDefault(); setIsResizing('left'); }}
            onTouchStart={() => setIsResizing('left')}
            title="Tarik untuk laraskan kelebaran dock sisi"
            className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-cyan-500/50 z-50 transition-colors flex items-center justify-center group"
          >
            <div className="w-0.5 h-16 bg-cyan-400/50 group-hover:bg-cyan-300 transition-colors rounded-full" />
          </div>
        )}
        
        {/* TOP TACTICAL HEADER (ULTRA-COMPACT & DRAGGABLE) */}
        <div 
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className="flex items-center justify-between px-2.5 py-1.5 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border-b border-cyan-500/30 select-none cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            <div className="relative flex items-center justify-center">
              <Radio size={12} className="text-cyan-400 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="font-black text-[10px] text-cyan-300 tracking-wider">BILIK OPS</span>
              <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-400 text-[8px] font-bold border border-cyan-500/30">
                {onlineOps.length} AKTIF
              </span>

              {/* Room Code Badge */}
              <button 
                onClick={() => setIsEditingRoom(!isEditingRoom)}
                className="text-[9px] text-slate-400 hover:text-cyan-300 flex items-center gap-0.5 transition-colors truncate text-left bg-slate-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20"
                title="Tukar kod bilik siasatan"
              >
                <Lock size={8} className="text-cyan-400/70" />
                <span className="font-semibold text-cyan-200 truncate">{roomId}</span>
                <Sliders size={8} className="opacity-50 hover:opacity-100 ml-0.5" />
              </button>

              {/* Security Status Badges */}
              {isGmailUser ? (
                <span className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-bold border border-emerald-500/40" title={currentUser.email === 'fisaabilillah@gmail.com' || currentUser.role === 'lead' ? 'Akaun Disahkan: Elite Agent [OPSEC Dilindungi]' : 'Akaun Disahkan: Penyiasat'}>
                  <ShieldCheck size={9} /> {currentUser.email === 'fisaabilillah@gmail.com' || currentUser.role === 'lead' ? 'ELITE AGENT' : 'GMAIL'}
                </span>
              ) : (
                <span className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[8px] font-bold border border-rose-500/40" title="Akaun Gmail Diperlukan">
                  <ShieldAlert size={9} /> NO-AUTH
                </span>
              )}

              {isRoomUnlocked ? (
                <span className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold border border-amber-500/40" title="Passcode Operasi Disahkan">
                  <Key size={9} /> UNLOCKED
                </span>
              ) : (
                <span className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold border border-amber-500/40" title="Perlukan Passcode Khas">
                  <Lock size={9} /> LOCKED
                </span>
              )}
            </div>
          </div>

          {/* Quick Width Presets & Window Control Buttons */}
          <div className="flex items-center gap-1">
            {allNodes && allNodes.length > 0 && onFocusNode && (
              <button
                type="button"
                onClick={() => {
                  const targetId = activeNode?.id || allNodes[0]?.id;
                  if (targetId) onFocusNode(targetId, true);
                }}
                title={`Lompat & Zum terus ke nod sasaran (${activeNode?.label || allNodes[0]?.label}) di Canvas`}
                className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[8px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all active:scale-95 shrink-0"
              >
                <Target size={10} className="stroke-[3] text-slate-950" />
                <span className="hidden sm:inline">ZUM SASARAN</span>
              </button>
            )}

            {!isMinimized && !isDocked && (
              <div className="hidden sm:flex items-center gap-0.5 bg-slate-950/80 px-1 py-0.2 rounded border border-cyan-500/20 mr-1 text-[8px] font-mono">
                <button
                  onClick={() => { setChatWidth(380); localStorage.setItem('redhorizon_collab_chat_width', '380'); }}
                  className={`px-1 py-0.2 rounded transition-all ${chatWidth <= 400 ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Saiz Kompak (380px)"
                >
                  S
                </button>
                <button
                  onClick={() => { setChatWidth(480); localStorage.setItem('redhorizon_collab_chat_width', '480'); }}
                  className={`px-1 py-0.2 rounded transition-all ${chatWidth > 400 && chatWidth <= 560 ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Saiz Standard (480px)"
                >
                  M
                </button>
                <button
                  onClick={() => { setChatWidth(680); localStorage.setItem('redhorizon_collab_chat_width', '680'); }}
                  className={`px-1 py-0.2 rounded transition-all ${chatWidth > 560 && chatWidth <= 760 ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Saiz Lebar (680px)"
                >
                  L
                </button>
                <button
                  onClick={() => { setChatWidth(880); localStorage.setItem('redhorizon_collab_chat_width', '880'); }}
                  className={`px-1 py-0.2 rounded transition-all ${chatWidth > 760 ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Saiz Ultra Lebar (880px)"
                >
                  XL
                </button>
              </div>
            )}

            <button
              onClick={() => setShowShareDialog(true)}
              title="Jemput Rakan Operasi & Salin Pautan"
              className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all"
            >
              <Share2 size={12} />
            </button>

            <button
              onClick={() => setIsDocked(!isDocked)}
              title={isDocked ? "Mod Terapung" : "Kekal di Tepi (Dock)"}
              className={`p-1 rounded transition-all hidden sm:block ${isDocked ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/20'}`}
            >
              <Layers size={12} />
            </button>

            <button
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Kembangkan Chat" : "Kecilkan (Minimize)"}
              className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all"
            >
              {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>

            <button
              onClick={onClose}
              title="Tutup Tetingkap"
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* LIVE OPERATIVES ACTIVITY RADAR STRIP (COMPACT) */}
        {onlineOps.length > 0 && !isMinimized && (
          <div className="px-2 py-0.5 bg-slate-950 border-b border-cyan-500/20 flex items-center gap-1 overflow-x-auto custom-scrollbar select-none text-[8.5px]">
            <span className="text-[8px] text-cyan-400/80 uppercase font-mono font-bold shrink-0 flex items-center gap-0.5">
              <Radio size={7} className="text-emerald-400 animate-pulse" /> Radar:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
              {onlineOps.map((op) => {
                const isMe = op.uid === currentUser?.uid;
                const targetNode = op.activeNodeId ? allNodes.find(n => n.id === op.activeNodeId) : null;
                const displayNodeLabel = targetNode?.label || op.activeNodeLabel;
                const activityIcon = op.activeModal ? '🛠️' : (displayNodeLabel ? '🎯' : '📊');
                const activityText = op.activeModal 
                  ? (op.activeTool || op.activeModal) 
                  : (displayNodeLabel ? `${displayNodeLabel}` : 'Canvas');

                return (
                  <div 
                    key={op.uid}
                    className={`flex items-center gap-1 px-1.5 py-0.2 rounded-full border shrink-0 transition-all ${
                      isMe 
                        ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200' 
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/60'
                    }`}
                    title={`${op.displayName} (${op.role.toUpperCase()}): ${op.currentActivity || activityText}`}
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span className="font-bold truncate max-w-[65px]">{isMe ? 'Anda' : op.displayName}</span>
                    <span className="text-[7.5px] text-slate-500">•</span>
                    <span className="text-[7.5px] text-cyan-300 truncate max-w-[90px] flex items-center gap-0.5">
                      <span>{activityIcon}</span>
                      <span className="truncate">{activityText}</span>
                    </span>
                    {op.activeNodeId && onFocusNode && !isMe && (
                      <button
                        onClick={() => onFocusNode(op.activeNodeId!)}
                        title={`Lompat ke nod "${displayNodeLabel || op.activeNodeId}"`}
                        className="p-0.5 hover:bg-cyan-500/30 text-cyan-300 rounded transition-transform hover:scale-110 ml-0.5"
                      >
                        <Target size={7} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FLASHING RED MENTION ALERT BANNER */}
        {activeMentionBanner && !isMinimized && (
          <div className="px-2.5 py-1 bg-gradient-to-r from-red-950 via-rose-950 to-red-900 border-b-2 border-red-500 text-white flex items-center justify-between gap-2 animate-pulse shadow-[0_0_18px_rgba(239,68,68,0.7)]">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-xs animate-bounce">🚨</span>
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-1 text-[9px]">
                  <span className="font-black text-red-200 uppercase tracking-wider">Diseru:</span>
                  <span className="font-bold text-amber-300">@{activeMentionBanner.senderName}</span>
                </div>
                <span className="text-[8.5px] text-slate-200 truncate italic">
                  "{activeMentionBanner.text}"
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setHighlightedMsgId(activeMentionBanner.id);
                  setActiveTab('chat');
                  setTimeout(() => {
                    const el = document.getElementById(`collab-msg-${activeMentionBanner.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 120);
                  setActiveMentionBanner(null);
                }}
                className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white font-black text-[8px] rounded uppercase shadow"
              >
                Lompat ↗
              </button>
              <button
                onClick={() => setActiveMentionBanner(null)}
                className="p-0.5 text-slate-300 hover:text-white"
                title="Tutup Alert"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* SHARE / INVITE DIALOG OVERLAY */}
        {showShareDialog && (
          <div className="p-2.5 bg-slate-900/95 border-b border-cyan-500/30 flex flex-col gap-2 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 flex items-center gap-1 text-[10px]">
                <Share2 size={11} /> Jemput Rakan Operasi Siasatan
              </span>
              <button 
                onClick={() => setShowShareDialog(false)} 
                className="text-slate-400 hover:text-white p-0.5"
              >
                ✕
              </button>
            </div>

            <p className="text-[9px] text-slate-300">
              Hantar pautan ini kepada pasukan anda untuk bilik <b className="text-cyan-200">{roomId}</b>.
            </p>

            <div className="flex items-center gap-1">
              <input 
                type="text" 
                readOnly 
                value={getInviteUrl()} 
                className="flex-1 bg-slate-950 border border-cyan-500/40 rounded px-2 py-1 text-[9px] text-cyan-200 select-all font-mono"
              />
              <button
                onClick={handleCopyRoomLink}
                className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-[9px] flex items-center gap-1 transition-all shadow"
              >
                {copiedLink ? <Check size={10} className="text-emerald-950 font-black" /> : <Copy size={10} />}
                <span>{copiedLink ? 'Disalin' : 'Salin'}</span>
              </button>
            </div>
          </div>
        )}

        {/* If Minimized - Show Quick Compact Draggable Floating Bar */}
        {isMinimized ? (
          <div 
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onClick={() => {
              if (!dragStartRef.current.moved) {
                setIsMinimized(false);
              }
            }}
            className="flex-1 px-2 py-1 flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing hover:bg-cyan-950/40 transition-colors touch-none select-none"
            title="Tarik untuk alih kedudukan atau klik untuk kembangkan chat"
          >
            <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
              <GripHorizontal size={12} className="text-cyan-400/70 shrink-0" />
              <div className="flex items-center gap-1 text-[10px] text-cyan-300 font-bold truncate">
                <MessageSquare size={11} className="text-cyan-400 shrink-0" />
                <span className="truncate">Chat</span>
                <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 rounded-full text-[8.5px] font-mono shrink-0">
                  {messages.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                data-no-drag="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(false);
                }}
                title="Kembangkan Chat (Maximize)"
                className="p-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 hover:text-white transition-all flex items-center gap-0.5 text-[9px] font-bold cursor-pointer"
              >
                <Maximize2 size={11} />
                <span className="hidden xs:inline">Buka</span>
              </button>

              <button
                type="button"
                data-no-drag="true"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                title="Tutup Chat"
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ROOM CODE CHANGER / SETTINGS BAR (EXPANDABLE) */}
            {isEditingRoom && (
              <div className="p-2 bg-slate-900/90 border-b border-cyan-500/20 flex flex-col gap-1.5 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between text-[9px] text-slate-300">
                  <span className="font-bold text-cyan-300">Tukar Bilik Operasi:</span>
                  <button onClick={() => setIsEditingRoom(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempRoomInput}
                    onChange={(e) => setTempRoomInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: KES-PETRONAS-01"
                    className="flex-1 bg-slate-950 border border-cyan-500/40 rounded px-2 py-0.5 text-[10px] text-cyan-200 focus:outline-none focus:border-cyan-400 uppercase font-mono"
                  />
                  <button
                    onClick={() => {
                      if (tempRoomInput.trim()) {
                        setRoomId(tempRoomInput.trim());
                        setIsEditingRoom(false);
                      }
                    }}
                    className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-[9px] transition-all"
                  >
                    Masuk
                  </button>
                </div>
              </div>
            )}

            {/* TAB NAVIGATION & LIVE CLOUD SYNC CONTROLS (ULTRA-COMPACT WITH CRISP ICONS) */}
            <div className="flex items-center justify-between px-2 py-1 bg-slate-950/90 border-b border-slate-800 text-[9px]">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setActiveTab('chat')}
                  title={`Ruangan Sembang (${messages.length} Mesej)`}
                  className={`px-2 py-0.5 rounded transition-all font-bold flex items-center gap-1 ${
                    activeTab === 'chat' 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare size={10} className="text-cyan-400" />
                  <span>Sembang</span>
                  <span className="text-[8px] opacity-75">({messages.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('nodes')}
                  title={`Direktori & Radar Nod Kanvas (${allNodes?.length || 0} Nod)`}
                  className={`px-2 py-0.5 rounded transition-all font-bold flex items-center gap-1 ${
                    activeTab === 'nodes' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.25)]' 
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  <Target size={10} className="text-amber-400" />
                  <span>Nod</span>
                  <span className="text-[8px] opacity-75">({allNodes?.length || 0})</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('ops')}
                  title={`Senarai Penyiasat Online (${onlineOps.length} Aktif)`}
                  className={`px-2 py-0.5 rounded transition-all font-bold flex items-center gap-1 ${
                    activeTab === 'ops' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users size={10} className="text-purple-400" />
                  <span>Ops</span>
                  <span className="text-[8px] opacity-75">({onlineOps.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('room_list')}
                  title={`Senarai Semua Bilik Operasi Dicipta (${allOperationRooms.length} Bilik)`}
                  className={`px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-1 ${
                    activeTab === 'room_list' 
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.3)]' 
                      : 'text-slate-400 hover:text-indigo-300'
                  }`}
                >
                  <FolderKanban size={10} className="text-indigo-400" />
                  <span>Bilik</span>
                  <span className="text-[8px] opacity-75">({allOperationRooms.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('telegram')}
                  title="Telegram Cloud Relay (Fail Saiz Besar)"
                  className={`px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-1 ${
                    activeTab === 'telegram' 
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_8px_rgba(14,165,233,0.2)]' 
                      : telegramConfig.enabled ? 'text-sky-400 hover:text-sky-200' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[9px]">✈️</span>
                  <span>TG</span>
                  {telegramConfig.enabled && <span className="w-1 h-1 rounded-full bg-sky-400 inline-block" />}
                </button>

                <button
                  onClick={() => setActiveTab('room_settings')}
                  title="Tetapan Bilik & Kata Laluan Khas Operasi"
                  className={`px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-1 ${
                    activeTab === 'room_settings' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]' 
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  <Key size={10} className="text-amber-400" />
                  <span>Passcode</span>
                </button>

                <button
                  onClick={() => setActiveTab('purge')}
                  title="Pembersihan Data Awan & LocalStorage (OPSEC)"
                  className={`px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-1 ${
                    activeTab === 'purge' 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]' 
                      : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  <Flame size={10} className="text-rose-400" />
                  <span>OPSEC</span>
                </button>
              </div>

              {/* Sync Graph Button & Live Auto-Sync Switch */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsLiveCanvasSync(!isLiveCanvasSync)}
                  title={isLiveCanvasSync ? "Live Canvas Auto-Sync Aktif" : "Manual Canvas Sync"}
                  className={`px-1.5 py-0.5 rounded border text-[8px] font-bold flex items-center gap-1 transition-all ${
                    isLiveCanvasSync 
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <span className={`w-1 h-1 rounded-full ${isLiveCanvasSync ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>{isLiveCanvasSync ? 'SYNC' : 'MANUAL'}</span>
                </button>

                <button
                  onClick={handlePushCanvasToCloud}
                  title="Hantar kedudukan graf ke Cloud sekarang"
                  className="p-1 bg-cyan-950/60 hover:bg-cyan-800/40 border border-cyan-500/40 rounded text-cyan-300 transition-all"
                >
                  <RefreshCw size={8} />
                </button>
              </div>
            </div>

            {/* LIVE FEEDBACK TOAST */}
            {canvasAddSuccess && (
              <div className="px-3 py-1.5 bg-emerald-950/90 border-b border-emerald-500/50 flex items-center justify-between text-[10px] text-emerald-200 animate-in fade-in slide-in-from-top-1">
                <span className="flex items-center gap-1.5 font-bold truncate">
                  <Check size={12} className="text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{canvasAddSuccess}</span>
                </span>
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded text-[9px] flex-shrink-0 ml-2 shadow"
                >
                  Lihat Canvas
                </button>
              </div>
            )}

            {/* MAIN CONTENT AREA WITH SECURITY GATES */}
            {!isGmailUser ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 relative overflow-y-auto custom-scrollbar font-mono">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 via-rose-600/10 to-amber-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
                  <ShieldAlert size={32} />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono font-bold text-[10px] uppercase tracking-wider mb-2">
                  <Lock size={12} /> Akses Dikekang • Gmail Auth Diperlukan
                </div>

                <h2 className="text-base font-black text-white uppercase tracking-wide mb-2">
                  Wajib Log Masuk Akaun Gmail
                </h2>

                <p className="text-[11px] text-slate-300 max-w-md leading-relaxed mb-5 font-mono">
                  Demi keselamatan risikan dan integriti maklumat operasi, ruangan sembang ini <strong className="text-rose-400 uppercase">TIDAK MEMBENARKAN</strong> akaun local/guest. Anda wajib log masuk dengan akaun Gmail / Google sah.
                </p>

                {authErrorNotice && (
                  <div className="w-full max-w-md mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-[10px] font-mono text-left flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                      <span>{authErrorNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentUser({
                          uid: 'lead_operative_bypass',
                          email: LEAD_ADMIN_EMAIL,
                          displayName: 'Lead Operative',
                          role: 'lead',
                          lastActive: Date.now()
                        });
                        setAuthErrorNotice(null);
                      }}
                      className="mt-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase flex items-center gap-1.5 self-start shadow-md cursor-pointer"
                    >
                      <ShieldCheck size={13} />
                      <span>Guna Akses Lead Operatif Utama</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleGoogleSignIn}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-slate-950" />
                        <span>Menyambung Google Auth...</span>
                      </>
                    ) : (
                      <>
                        <LogIn size={16} />
                        <span>Log Masuk Akaun Gmail</span>
                      </>
                    )}
                  </button>

                  <span className="text-[9px] text-slate-500 font-mono">
                    Status Semasa: <span className="text-rose-400 font-bold">Local / Guest Profile (Blocked)</span>
                  </span>
                </div>
              </div>
            ) : !isRoomUnlocked ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 relative overflow-y-auto custom-scrollbar font-mono">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-cyan-500/10 to-blue-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                  <Key size={32} />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-[10px] uppercase tracking-wider mb-2">
                  <Lock size={12} /> Security Gate • Kata Laluan Operasi Khas
                </div>

                <h2 className="text-base font-black text-white uppercase tracking-wide mb-1">
                  Masukkan Password Khas Ruangan
                </h2>

                <p className="text-[10px] text-slate-400 font-mono mb-3 flex items-center justify-center gap-1.5 flex-wrap">
                  <span>Bilik Operasi:</span>
                  <span className="text-cyan-300 font-bold px-1.5 py-0.5 bg-slate-900 border border-cyan-500/30 rounded">{roomId}</span>
                  {roomMetadata?.isEliteOnly && (
                    <span className="text-purple-300 font-bold px-2 py-0.5 bg-purple-950/80 border border-purple-500/50 rounded-full text-[9px] flex items-center gap-1">
                      <ShieldCheck size={10} className="text-purple-400" /> Elite Agent Sahaja 🛡️
                    </span>
                  )}
                </p>

                <p className="text-[11px] text-slate-300 max-w-md leading-relaxed mb-5 font-mono">
                  Sila masukkan kata laluan khas operasi untuk membuka kunci perbualan, direktori nod, dan kehadiran penyiasat dalam ruangan ini.
                </p>

                <form onSubmit={handleUnlockRoomWithPasscode} className="w-full max-w-xs space-y-3">
                  <div className="relative flex items-center">
                    <input
                      type={showPasscodeText ? "text" : "password"}
                      value={passcodeInput}
                      onChange={(e) => {
                        setPasscodeInput(e.target.value);
                        setPasscodeErrorNotice(null);
                      }}
                      placeholder="Masukkan Password Khas..."
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-amber-500/50 focus:border-amber-400 text-white font-mono text-[11px] rounded-xl outline-none focus:ring-1 focus:ring-amber-400 transition-all placeholder:text-slate-600"
                      autoFocus
                      disabled={Boolean(roomMetadata?.isEliteOnly && !isEliteAgent)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscodeText(!showPasscodeText)}
                      className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors"
                      title={showPasscodeText ? "Sembunyi Password" : "Papar Password"}
                    >
                      {showPasscodeText ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {passcodeErrorNotice && (
                    <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/60 text-rose-200 text-[9.5px] font-mono text-center flex items-center justify-center gap-1.5 animate-shake">
                      <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                      <span>{passcodeErrorNotice}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={Boolean(roomMetadata?.isEliteOnly && !isEliteAgent)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 cursor-pointer"
                  >
                    <ShieldCheck size={16} />
                    <span>Buka Kunci Ruangan Chat</span>
                  </button>

                  <div className="pt-2 text-[9px] text-slate-500 font-mono flex items-center justify-center gap-1">
                    <Lock size={11} className="text-cyan-400" />
                    <span>Kata laluan khas dilindungi untuk privasi bilik operasi.</span>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {/* MAIN CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar" ref={chatContainerRef}>
              
              {/* TAB 1: LIVE CHAT & FINDING FEED */}
              {activeTab === 'chat' && (
                <>
                  {/* GOOGLE AUTHENTICATION BANNER IF GUEST */}
                  {currentUser?.email === 'guest@field-ops.local' && (
                    <div className="p-2.5 rounded-lg bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-slate-900 border border-cyan-500/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-cyan-300 font-bold flex items-center gap-1">
                            <LogIn size={11} /> Akaun Operatif Pasukan
                          </span>
                          <span className="text-[9px] text-slate-400">
                            Identiti semasa: <strong className="text-amber-300">{currentUser.displayName}</strong> (Akaun Tetamu Tempatan)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleGoogleSignIn}
                            disabled={authLoading}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded text-[10px] shadow flex items-center gap-1 transition-all"
                          >
                            {authLoading ? 'Menyambung...' : 'Google Login'}
                          </button>
                          <button
                            onClick={() => {
                              setEditProfileName(currentUser.displayName || '');
                              setEditProfileEmail(currentUser.email !== 'guest@field-ops.local' ? currentUser.email : '');
                              setShowProfileEditModal(true);
                            }}
                            className="px-2.5 py-1 bg-cyan-800 hover:bg-cyan-700 text-cyan-100 font-bold rounded text-[10px] shadow flex items-center gap-1 transition-all"
                          >
                            <User size={10} /> Kemaskini Nama/Emel
                          </button>
                        </div>
                      </div>

                      {/* AUTH ERROR NOTICE IF POPUP BLOCKED / DOMAIN ERROR */}
                      {authErrorNotice && (
                        <div className="p-2.5 rounded bg-rose-950/90 border border-rose-500/60 flex flex-col gap-1.5 text-[10px] text-rose-200 animate-in fade-in">
                          <div className="flex items-center justify-between font-bold text-rose-300">
                            <span className="flex items-center gap-1">⚠️ Masalah Log Masuk Google (Domain Belum Dibenarkan)</span>
                            <button onClick={() => setAuthErrorNotice(null)} className="text-rose-400 hover:text-white font-bold cursor-pointer">✕</button>
                          </div>
                          <p className="text-[9px] text-rose-200/90 leading-tight">{authErrorNotice}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <button
                              onClick={() => {
                                const localUser = {
                                  uid: `op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                  displayName: 'Operatif Field-Ops',
                                  email: 'operative@field-ops.local',
                                  role: 'investigator' as const,
                                  lastActive: Date.now()
                                };
                                setCurrentUser(localUser);
                                localStorage.setItem('redhorizon_local_user', JSON.stringify(localUser));
                                setAuthErrorNotice(null);
                              }}
                              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded text-[9px] shadow cursor-pointer flex items-center gap-1"
                            >
                              ➔ Gunakan Akses Operatif Sandbox (Pantas)
                            </button>
                            <button
                              onClick={() => {
                                setEditProfileName(currentUser.displayName || '');
                                setEditProfileEmail('');
                                setShowProfileEditModal(true);
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded text-[9px] shadow cursor-pointer"
                            >
                              ➔ Kemaskini Profil Manual
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ACTIVE OPERATIVE IDENTITY STATUS */}
                  {currentUser && currentUser.email !== 'guest@field-ops.local' && (
                    <div className="px-2.5 py-1.5 rounded bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between text-[9px] text-slate-400">
                      <div className="flex items-center gap-1.5 truncate">
                        {currentUser.photoURL ? (
                          <img src={currentUser.photoURL} alt="" className="w-4 h-4 rounded-full flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950 font-bold text-[8px] flex-shrink-0">
                            {currentUser.displayName.charAt(0)}
                          </div>
                        )}
                        <span className="text-cyan-300 font-bold truncate">{currentUser.displayName}</span>
                        <span className="text-slate-400 font-mono text-[8px] truncate">
                          ({currentUser.email === 'fisaabilillah@gmail.com' || currentUser.role === 'lead' ? 'Elite Agent' : currentUser.email})
                        </span>
                        <span className="text-emerald-400 uppercase font-bold text-[8px]">[{currentUser.role}]</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditProfileName(currentUser.displayName || '');
                            setEditProfileEmail(currentUser.email || '');
                            setShowProfileEditModal(true);
                          }}
                          title="Tukar Nama / Call-sign"
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[9px] font-bold"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => logoutOperative(roomId, currentUser.uid)} 
                          title="Log Keluar Akaun"
                          className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                        >
                          <LogOut size={11} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ACTIVE SELECTED NODE QUICK SHARE BANNER */}
                  {activeNode && (
                    <div className="p-2 rounded bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <Target size={12} className="text-cyan-400 flex-shrink-0" />
                        <div className="flex flex-col truncate">
                          <span className="text-[9px] text-slate-400">Sasaran Terpilih Pada Skrin Anda:</span>
                          <span className="text-[10px] text-cyan-200 font-bold truncate">[{activeNode.type}] {activeNode.label}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBroadcastNode(activeNode)}
                        className="px-2 py-1 bg-cyan-600/80 hover:bg-cyan-500 text-slate-950 rounded font-bold text-[9px] flex-shrink-0 transition-all flex items-center gap-1"
                      >
                        <Share2 size={9} /> Kongsi ke Bilik
                      </button>
                    </div>
                  )}

                  {/* MESSAGES LIST */}
                  {messages.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-2">
                      <MessageSquare size={24} className="text-cyan-500/40 animate-pulse" />
                      <p className="text-[11px] font-semibold text-slate-400">Bilik Operasi Sedia.</p>
                      <p className="text-[9px]">Taip mesej atau tekan "Kongsi ke Bilik" untuk membincangkan sasaran bersama rakan sepasukan.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUser?.uid;
                      const isSystem = msg.type === 'system';
                      const isBroadcast = msg.type === 'finding_broadcast';
                      const isUrgentMsg = msg.type === 'urgent_intel';
                      const isMentioned = Boolean(
                        currentUser && !isMe && msg.text && (
                          (currentUser.displayName && msg.text.toLowerCase().includes(`@${currentUser.displayName.toLowerCase()}`)) ||
                          (currentUser.email && msg.text.toLowerCase().includes(`@${currentUser.email.split('@')[0].toLowerCase()}`))
                        )
                      );
                      const isFlashHighlighted = highlightedMsgId === msg.id;

                      if (isSystem) {
                        return (
                          <div key={msg.id} id={`collab-msg-${msg.id}`} className="py-1 px-2.5 rounded bg-slate-900/60 border border-slate-800 text-center text-[9px] text-slate-400 italic">
                            {msg.text}
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={msg.id} 
                          id={`collab-msg-${msg.id}`}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 group transition-all duration-300 ${
                            isFlashHighlighted ? 'bg-cyan-950/60 ring-2 ring-cyan-400 rounded-xl p-1.5 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : ''
                          }`}
                        >
                          {/* Sender name & time + Reply & Delete Action */}
                          <div className="flex items-center gap-1.5 px-1 text-[9px] text-slate-400">
                            {msg.senderPhoto && (
                              <img src={msg.senderPhoto} alt="" className="w-3.5 h-3.5 rounded-full" />
                            )}
                            <span className={`font-bold ${isMe ? 'text-cyan-300' : 'text-purple-300'}`}>
                              {isMe ? 'Anda' : msg.senderName}
                            </span>
                            <span className="text-slate-600 text-[8px]">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {/* Reply Action Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo(msg);
                                chatInputRef.current?.focus();
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-cyan-300 p-0.5 rounded ml-1 flex items-center gap-0.5 bg-slate-900/80 px-1 border border-slate-700/50 shadow-sm"
                              title="Balas mesej ini (Reply)"
                            >
                              <CornerUpLeft size={10} className="text-cyan-400" />
                              <span className="text-[8px] font-bold text-cyan-300">Balas</span>
                            </button>
                            
                            {/* In-App Delete Action (Available to sender or room lead) */}
                            {(isMe || currentUser?.role === 'lead' || currentUser?.email === 'fisaabilillah@gmail.com') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-400 p-0.5 rounded ml-0.5"
                                title="Padam mesej/fail dari ruang sembang aplikasi ini (Salinan sandaran di Telegram kekal selamat)"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>

                          {/* Message Bubble or Tactical Card */}
                          <div 
                            className={`max-w-[88%] p-2.5 rounded-xl text-[10px] leading-relaxed transition-all shadow-sm ${
                              msg.type === 'ai_analyst'
                                ? 'bg-gradient-to-br from-slate-900/95 via-amber-950/25 to-purple-950/30 border border-amber-500/50 text-slate-100 shadow-[0_0_20px_rgba(245,158,11,0.2)] rounded-tl-none'
                                : isUrgentMsg
                                  ? 'bg-rose-950/80 border border-rose-500/60 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                  : isMentioned
                                    ? 'bg-slate-900/95 border-2 border-amber-400/80 text-slate-100 shadow-[0_0_15px_rgba(251,191,36,0.25)] rounded-tl-none'
                                    : isBroadcast
                                      ? 'bg-gradient-to-br from-cyan-950/70 to-slate-900 border border-cyan-500/50 text-cyan-100'
                                      : isMe
                                        ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-100 rounded-tr-none'
                                        : 'bg-slate-900/90 border border-slate-700/80 text-slate-200 rounded-tl-none'
                            }`}
                          >
                            {/* AI Analyst Badge Header */}
                            {msg.type === 'ai_analyst' && (
                              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-amber-500/20">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-xs">
                                    🧠
                                  </div>
                                  <span className="font-black text-amber-300 tracking-wide text-[9.5px]">
                                    {msg.aiAnalystPayload?.analystName || msg.senderName || 'NEURAL OSINT ANALYST'}
                                  </span>
                                </div>
                                <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-mono text-[7.5px] font-bold border border-amber-500/40">
                                  {msg.aiAnalystPayload?.analystModel || 'AI SWARM'}
                                </span>
                              </div>
                            )}

                            {isUrgentMsg && (
                              <div className="flex items-center gap-1 text-[9px] font-black text-rose-400 uppercase mb-1">
                                <AlertTriangle size={11} className="animate-bounce" /> URGENT OPERATIONAL INTEL
                              </div>
                            )}

                            {isMentioned && (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold text-[8px] mb-1.5 animate-pulse">
                                <AtSign size={8} /> ANDA DISERU OLEH RAKAN
                              </div>
                            )}

                            {/* Quoted Replied Message Card */}
                            {msg.replyTo && (
                              <div 
                                onClick={() => scrollToMessage(msg.replyTo!.messageId)}
                                className="mb-2 p-1.5 rounded-lg bg-black/60 border-l-2 border-cyan-400 hover:bg-slate-950 hover:border-cyan-300 cursor-pointer transition-all flex flex-col gap-0.5 group/reply shadow-inner"
                                title="Klik untuk lompat ke mesej asal yang dibalas"
                              >
                                <div className="flex items-center justify-between text-[8px]">
                                  <span className="font-bold text-cyan-300 flex items-center gap-1">
                                    <CornerUpLeft size={9} className="text-cyan-400" />
                                    <span>Membalas {msg.replyTo.senderName}</span>
                                    {msg.replyTo.senderRole && (
                                      <span className="text-[7.5px] text-purple-300 uppercase font-mono">({msg.replyTo.senderRole})</span>
                                    )}
                                  </span>
                                  <span className="text-[7.5px] text-slate-500 group-hover/reply:text-cyan-300 transition-colors font-mono">↗ Pergi ke mesej</span>
                                </div>
                                <p className="text-[8.5px] text-slate-300 truncate italic font-sans">
                                  "{msg.replyTo.text}"
                                </p>
                              </div>
                            )}

                            {/* Message text with Clean Markdown / Mention Rendering */}
                            <div>
                              {renderMessageContent(
                                msg.text, 
                                currentUser?.displayName, 
                                currentUser?.email, 
                                msg.type === 'ai_analyst' || Boolean(msg.aiAnalystPayload)
                              )}
                            </div>

                            {/* CANVAS TARGET CONTROLS, FOCUS & FLY-TO ZOOM ACTIONS (ALWAYS AVAILABLE FOR ALL DETECTED & AI NODES) */}
                            {(() => {
                              const resolvedNodes = resolveMatchedNodes(msg);
                              const hasNodes = resolvedNodes.length > 0;
                              const isAI = msg.type === 'ai_analyst' || Boolean(msg.aiAnalystPayload);

                              if (!hasNodes && !isAI) return null;

                              const primaryNode = resolvedNodes[0];

                              return (
                                <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex flex-col gap-2.5">
                                  {/* PROMINENT INSTANT FLY-TO & ZOOM CANVAS BANNER */}
                                  {primaryNode && onFocusNode && (
                                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950 via-slate-950 to-orange-950/80 border border-amber-400/80 flex items-center justify-between gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow animate-pulse">
                                          🎯
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[10px] font-black text-amber-200 uppercase tracking-wide truncate">
                                            Sasaran Utama: {primaryNode.label}
                                          </span>
                                          <span className="text-[8px] text-slate-300 truncate">
                                            Klik butang untuk tutup sembang & zum kanvas terus ke sasaran
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => onFocusNode(primaryNode.nodeId, true)}
                                          className="px-3 py-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 active:scale-95 text-slate-950 font-black rounded-lg text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                                          title="Tutup tetingkap sembang dan terus melompat serta zum masuk ke nod ini di atas kanvas"
                                        >
                                          <span>🚀 Lompat & Zum Kanvas</span>
                                          <ArrowRight size={12} strokeWidth={3} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onFocusNode(primaryNode.nodeId, false)}
                                          className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all"
                                          title="Kunci sasaran ini di kanvas tanpa menutup sembang"
                                        >
                                          <Target size={11} />
                                          <span className="hidden sm:inline">Kunci</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* 1. AI & MESSAGE DISCOVERED CANVAS NODES & INSTANT SHORTCUTS */}
                                  {hasNodes && (
                                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex flex-col gap-2">
                                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/30">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-sm">🎯</span>
                                          <span className="text-[9.5px] font-black text-amber-300 uppercase tracking-wider font-mono">
                                            Pintasan & Kawalan Zum Nod Kanvas ({resolvedNodes.length})
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {resolvedNodes.length > 1 && onFocusNode && (
                                            <button
                                              type="button"
                                              onClick={() => onFocusNode(resolvedNodes[0].nodeId, true)}
                                              className="text-[7.5px] px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-mono uppercase transition-all shadow active:scale-95 flex items-center gap-1"
                                              title="Lompat & zum ke nod sasaran utama di canvas serta tutup sembang"
                                            >
                                              <span>🚀 Zum Utama</span>
                                              <ArrowRight size={9} />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 gap-1.5 max-h-[360px] overflow-y-auto pr-0.5 custom-scrollbar">
                                        {resolvedNodes.map((mnode, mnIdx) => {
                                          const typeLower = (mnode.type || '').toLowerCase();
                                          const isPerson = typeLower.includes('person') || typeLower.includes('suspect') || typeLower.includes('target') || typeLower.includes('individu');
                                          const isPhone = typeLower.includes('phone') || typeLower.includes('telefon') || typeLower.includes('contact');
                                          const isLocation = typeLower.includes('location') || typeLower.includes('geo') || typeLower.includes('tempat') || typeLower.includes('alamat');
                                          const isCyber = typeLower.includes('ip') || typeLower.includes('domain') || typeLower.includes('server') || typeLower.includes('host') || typeLower.includes('cve');
                                          const isFinance = typeLower.includes('bank') || typeLower.includes('finance') || typeLower.includes('crypto') || typeLower.includes('account') || typeLower.includes('kewangan');
                                          const isCompany = typeLower.includes('company') || typeLower.includes('org') || typeLower.includes('syarikat');
                                          const isSocial = typeLower.includes('social') || typeLower.includes('profile') || typeLower.includes('akaun') || typeLower.includes('media');
                                          const isVehicle = typeLower.includes('vehicle') || typeLower.includes('car') || typeLower.includes('kenderaan');

                                          const typeIcon = isPerson ? '👤' :
                                                           isPhone ? '📱' :
                                                           isLocation ? '📍' :
                                                           isCyber ? '🌐' :
                                                           isFinance ? '🏦' :
                                                           isCompany ? '🏢' :
                                                           isSocial ? '💬' :
                                                           isVehicle ? '🚗' : '🔷';

                                          return (
                                            <div 
                                              key={mnIdx}
                                              className="p-2 rounded-lg bg-slate-950/90 border border-slate-700/80 hover:border-amber-400/80 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 group/nodeCard"
                                            >
                                              {/* Left: Type Icon + Label + Metadata + Reason */}
                                              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black shrink-0 bg-slate-900 border border-amber-400/40 text-amber-300 shadow">
                                                  {typeIcon}
                                                </div>

                                                <div className="flex flex-col min-w-0 flex-1">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10.5px] font-black text-white group-hover/nodeCard:text-amber-300 transition-colors truncate max-w-[200px]">
                                                      {mnode.label}
                                                    </span>
                                                    <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-mono uppercase font-bold">
                                                      {mnode.type}
                                                    </span>
                                                    {mnode.connectionsCount !== undefined && (
                                                      <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                                                        🔗 {mnode.connectionsCount} hubung
                                                      </span>
                                                    )}
                                                    <span className="text-[7px] text-slate-500 font-mono">
                                                      #{mnode.nodeId}
                                                    </span>
                                                  </div>

                                                  {mnode.relevanceReason && (
                                                    <div className="text-[8px] text-amber-200/90 font-medium flex items-center gap-1 mt-0.5">
                                                      <span className="text-amber-400 text-[7px]">⚡</span>
                                                      <span className="truncate">{mnode.relevanceReason}</span>
                                                    </div>
                                                  )}

                                                  {mnode.details && (
                                                    <div className="text-[7.5px] text-slate-400 line-clamp-1 italic mt-0.5">
                                                      {mnode.details}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Right: Interactive Shortcut Buttons (Focus, Jump & Zoom, Recon, External URL) */}
                                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                                {/* Shortcut 1: Jump & Zoom on Canvas (Closes chat for maximum visibility) */}
                                                {onFocusNode && (
                                                  <button
                                                    type="button"
                                                    onClick={() => onFocusNode(mnode.nodeId, true)}
                                                    className="px-2.5 py-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black rounded text-[8px] uppercase tracking-wide flex items-center gap-1 transition-all shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                                    title="Lompat terus dan zum masuk ke nod ini di atas kanvas (menutup sembang)"
                                                  >
                                                    <ArrowRight size={10} strokeWidth={2.5} />
                                                    <span>🚀 Zum</span>
                                                  </button>
                                                )}

                                                {/* Shortcut 2: Focus & Lock without closing chat */}
                                                {onFocusNode && (
                                                  <button
                                                    type="button"
                                                    onClick={() => onFocusNode(mnode.nodeId, false)}
                                                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 active:scale-95 font-bold rounded text-[8px] uppercase tracking-wide flex items-center gap-1 transition-all"
                                                    title="Kunci sasaran ini di kanvas tanpa menutup tetingkap sembang"
                                                  >
                                                    <Target size={10} />
                                                    <span>🎯 Kunci</span>
                                                  </button>
                                                )}

                                                {/* Shortcut 3: Open Recon / Modal for Node */}
                                                {onOpenModal && (
                                                  <button
                                                    type="button"
                                                    onClick={() => onOpenModal('verify_node_web', { id: mnode.nodeId, label: mnode.label, type: mnode.type, details: mnode.details, url: mnode.url })}
                                                    className="px-1.5 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-cyan-300 hover:text-white border border-cyan-500/40 rounded text-[8px] font-bold flex items-center gap-1 transition-all"
                                                    title="Sahkan fakta dan periksa maklumat nod ini"
                                                  >
                                                    <Globe size={9} />
                                                    <span className="hidden sm:inline">Fact-Check</span>
                                                  </button>
                                                )}

                                                {/* Shortcut 4: Open external URL if exists */}
                                                {mnode.url && (
                                                  <a
                                                    href={mnode.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded transition-all"
                                                    title="Buka pautan luar nod ini"
                                                  >
                                                    <ExternalLink size={10} />
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                {/* 2. AI Discovered Social Media Nodes & Interactive Action Cards */}
                                {msg.aiAnalystPayload?.socialMediaNodes && msg.aiAnalystPayload.socialMediaNodes.length > 0 && (
                                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/60 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)] flex flex-col gap-2">
                                    <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/30">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm">📱</span>
                                        <span className="text-[9px] font-black text-cyan-300 uppercase tracking-wider font-mono">
                                          Nod & Profil Media Sosial Sasaran ({msg.aiAnalystPayload.socialMediaNodes.length})
                                        </span>
                                      </div>
                                      <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-400/50 font-bold font-mono uppercase">
                                        KLIK & FOKUS 🎯
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1.5">
                                      {msg.aiAnalystPayload.socialMediaNodes.map((snode, snIdx) => {
                                        const isTw = snode.platform === 'twitter';
                                        const isIg = snode.platform === 'instagram';
                                        const isFb = snode.platform === 'facebook';
                                        const isTt = snode.platform === 'tiktok';
                                        const isTg = snode.platform === 'telegram';
                                        const isGh = snode.platform === 'github';
                                        const isLi = snode.platform === 'linkedin';
                                        const isYt = snode.platform === 'youtube';

                                        return (
                                          <div 
                                            key={snIdx}
                                            className={`p-2 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all group/soc ${
                                              isTw ? 'bg-slate-950/90 border-slate-700/80 hover:border-slate-500' :
                                              isIg ? 'bg-gradient-to-r from-purple-950/40 via-pink-950/30 to-slate-950 border-fuchsia-500/40 hover:border-fuchsia-400' :
                                              isFb ? 'bg-blue-950/30 border-blue-500/40 hover:border-blue-400' :
                                              isTt ? 'bg-slate-950/90 border-rose-500/40 hover:border-rose-400' :
                                              isTg ? 'bg-sky-950/30 border-sky-500/40 hover:border-sky-400' :
                                              isGh ? 'bg-zinc-950/50 border-zinc-600/50 hover:border-zinc-400' :
                                              isLi ? 'bg-indigo-950/30 border-indigo-500/40 hover:border-indigo-400' :
                                              isYt ? 'bg-rose-950/30 border-rose-600/40 hover:border-rose-500' :
                                              'bg-slate-950/80 border-cyan-500/30 hover:border-cyan-400'
                                            }`}
                                          >
                                            {/* Left: Platform Icon Symbol + Label + Metadata */}
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black shrink-0 shadow border ${
                                                isTw ? 'bg-black text-white border-slate-700' :
                                                isIg ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white border-pink-400/50' :
                                                isFb ? 'bg-blue-600 text-white border-blue-400/60' :
                                                isTt ? 'bg-black text-rose-400 border-rose-500/50' :
                                                isTg ? 'bg-sky-500 text-white border-sky-300' :
                                                isGh ? 'bg-zinc-800 text-white border-zinc-600' :
                                                isLi ? 'bg-indigo-600 text-white border-indigo-400' :
                                                isYt ? 'bg-red-600 text-white border-red-400' :
                                                'bg-cyan-900 text-cyan-200 border-cyan-500/50'
                                              }`}>
                                                {snode.symbol || '🔗'}
                                              </div>

                                              <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="text-[10px] font-black text-white truncate group-hover/soc:text-cyan-200 transition-colors">
                                                    {snode.handleOrLabel}
                                                  </span>
                                                  <span className="text-[7.5px] px-1 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono">
                                                    {snode.platformName}
                                                  </span>
                                                  {snode.isCanvasNode ? (
                                                    <span className="text-[7px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold font-mono flex items-center gap-0.5">
                                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                      NOD KANVAS
                                                    </span>
                                                  ) : (
                                                    <span className="text-[7px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                                                      DIKESAN ⚡
                                                    </span>
                                                  )}
                                                </div>

                                                {snode.url ? (
                                                  <span className="text-[8px] text-cyan-400/80 hover:text-cyan-300 font-mono truncate max-w-[240px]">
                                                    {snode.url}
                                                  </span>
                                                ) : snode.details ? (
                                                  <span className="text-[7.5px] text-slate-400 line-clamp-1 italic">
                                                    {snode.details}
                                                  </span>
                                                ) : null}
                                              </div>
                                            </div>

                                            {/* Right: Action Buttons (Focus on Canvas, Open URL, Add to Canvas) */}
                                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                              {/* Button 1: Jump & Zoom on Canvas (Closes chat) */}
                                              {snode.nodeId && onFocusNode && (
                                                <button
                                                  type="button"
                                                  onClick={() => onFocusNode(snode.nodeId!, true)}
                                                  className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black rounded text-[8px] uppercase tracking-wide flex items-center gap-1 transition-all shadow"
                                                  title="Lompat terus dan zum masuk ke nod ini di atas kanvas (menutup sembang)"
                                                >
                                                  <ArrowRight size={10} strokeWidth={2.5} />
                                                  <span>Zum Kanvas</span>
                                                </button>
                                              )}

                                              {/* Button 2: Focus without closing chat */}
                                              {snode.nodeId && onFocusNode && (
                                                <button
                                                  type="button"
                                                  onClick={() => onFocusNode(snode.nodeId!, false)}
                                                  className="px-1.5 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-cyan-300 border border-cyan-500/40 rounded text-[8px] uppercase tracking-wide flex items-center gap-1 transition-all"
                                                  title="Kunci fokus ke nod ini di latar belakang kanvas"
                                                >
                                                  <Target size={10} />
                                                  <span>Kunci</span>
                                                </button>
                                              )}

                                              {/* Button: Open Account URL */}
                                              {snode.url ? (
                                                <a
                                                  href={snode.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 font-bold rounded text-[8px] uppercase tracking-wide flex items-center gap-1 transition-all shadow"
                                                  title={`Buka akaun profil ${snode.platformName} di tab baharu`}
                                                >
                                                  <Globe size={10} className="text-cyan-400" />
                                                  <span>Buka Akaun</span>
                                                  <ExternalLink size={9} />
                                                </a>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => onOpenModal?.('social_recon', activeNode || undefined)}
                                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 border border-amber-500/40 font-bold rounded text-[8px] uppercase tracking-wide flex items-center gap-1 transition-all"
                                                  title="Cari profil sasaran di Social Recon"
                                                >
                                                  <span>⚡ Scout</span>
                                                </button>
                                              )}

                                              {/* Button: Add to Canvas if not already a standalone canvas node */}
                                              {!snode.isCanvasNode && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleAddSocialNodeToCanvas(snode)}
                                                  className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 active:scale-95 text-emerald-300 border border-emerald-500/40 font-black rounded text-[8px] uppercase tracking-wide flex items-center gap-1 transition-all"
                                                  title="Sematkan nod media sosial ini ke kanvas graf"
                                                >
                                                  <Plus size={10} />
                                                  <span>Semat</span>
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Focus target entity button if identified */}
                                {msg.aiAnalystPayload?.targetFocusNodeId && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => onFocusNode?.(msg.aiAnalystPayload!.targetFocusNodeId!, true)}
                                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black flex items-center justify-between gap-1 text-[9px] uppercase tracking-wide transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)] active:scale-95 group/foc"
                                      title="Lompat dan zum terus ke sasaran ini di atas kanvas (tutup sembang)"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <ArrowRight size={12} strokeWidth={2.5} className="group-hover/foc:translate-x-0.5 transition-transform" />
                                        <span>🚀 Lompat & Zum Sasaran di Kanvas</span>
                                      </span>
                                      <span className="font-mono text-[8px] px-1.5 py-0.2 rounded bg-slate-950 text-cyan-300 uppercase font-bold">LOMPAT 🎯</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onFocusNode?.(msg.aiAnalystPayload!.targetFocusNodeId!, false)}
                                      className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold transition-all active:scale-95"
                                      title="Kunci fokus di kanvas tanpa menutup sembang"
                                    >
                                      <Target size={11} />
                                    </button>
                                  </div>
                                )}

                                {/* AI Web Grounding Citations Section */}
                                {((msg.aiAnalystPayload?.webSources && msg.aiAnalystPayload.webSources.length > 0) || (msg.aiAnalystPayload?.searchQueries && msg.aiAnalystPayload.searchQueries.length > 0)) && (
                                  <div className="p-2.5 rounded-lg bg-black/60 border border-cyan-900/50 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[8.5px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                                        <Globe size={11} className="text-cyan-400 animate-pulse" />
                                        <span>🌐 Carian & Pengesahan Web Google Live</span>
                                      </span>
                                      <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono">
                                        GROUNDED
                                      </span>
                                    </div>

                                    {/* Search queries executed */}
                                    {msg.aiAnalystPayload.searchQueries && msg.aiAnalystPayload.searchQueries.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {msg.aiAnalystPayload.searchQueries.map((q, qIdx) => (
                                          <span key={qIdx} className="text-[8px] bg-slate-900 border border-slate-800 text-cyan-200 px-1.5 py-0.5 rounded font-mono">
                                            🔍 {q}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Clickable Citations */}
                                    {msg.aiAnalystPayload.webSources && msg.aiAnalystPayload.webSources.length > 0 && (
                                      <div className="flex flex-col gap-1">
                                        {msg.aiAnalystPayload.webSources.slice(0, 4).map((src, sIdx) => (
                                          <a
                                            key={sIdx}
                                            href={src.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded flex items-center justify-between text-[8px] text-gray-300 hover:text-cyan-300 transition-all font-mono group/src"
                                          >
                                            <span className="truncate max-w-[200px]">{src.title || src.url}</span>
                                            <ExternalLink size={9} className="shrink-0 text-gray-500 group-hover/src:text-cyan-400" />
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Direct Live Web Verification Trigger Button */}
                                {activeNode && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenModal?.('verify_node_web', activeNode)}
                                    className="w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 hover:from-cyan-900 hover:to-slate-800 text-cyan-200 border border-cyan-500/50 flex items-center justify-between gap-1 text-[9px] font-bold transition-all shadow-sm group/vfy"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Globe size={11} className="text-cyan-400 group-hover/vfy:rotate-45 transition-transform" />
                                      <span>Sahkan Fakta Sasaran "{activeNode.label}" di Internet</span>
                                    </span>
                                    <span className="font-mono text-[8px] text-cyan-300 uppercase bg-cyan-900/60 px-1.5 py-0.5 rounded border border-cyan-400/40">
                                      FACT-CHECK ⚡
                                    </span>
                                  </button>
                                )}

                                {/* Suggested Tools Buttons */}
                                {msg.aiAnalystPayload?.suggestedTools && msg.aiAnalystPayload.suggestedTools.length > 0 && (
                                  <div className="flex flex-col gap-1.5">
                                    <span className="text-[8.5px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                                      <Lightbulb size={11} className="text-amber-400" />
                                      Langkah Tindakan OSINT Seterusnya:
                                    </span>
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {msg.aiAnalystPayload.suggestedTools.map((tool, tIdx) => (
                                        <div 
                                          key={tIdx}
                                          className="p-2 rounded-lg bg-slate-950/90 border border-amber-500/30 hover:border-amber-400/70 transition-all flex items-center justify-between gap-2"
                                        >
                                          <div className="flex flex-col overflow-hidden">
                                            <span className="text-[9.5px] font-bold text-white flex items-center gap-1">
                                              <span>{tool.name}</span>
                                            </span>
                                            {tool.reason && (
                                              <span className="text-[8px] text-slate-400 line-clamp-1">{tool.reason}</span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => onOpenModal?.(tool.modalId, activeNode || undefined)}
                                            className="px-2.5 py-1 rounded bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[8.5px] uppercase tracking-wide flex items-center gap-1 shrink-0 shadow-md transition-all active:scale-95"
                                            title={`Buka ${tool.name}`}
                                          >
                                            <span>⚡ Buka</span>
                                            <ExternalLink size={9} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ); })()}

                            {/* DEDICATED OSINT CASE BUNDLE CARD (.RHZ / .JSON) */}
                            {(msg.type === 'case_share' || msg.casePayload || msg.fileAttachment?.name?.toLowerCase().endsWith('.rhz') || msg.fileAttachment?.name?.toLowerCase().endsWith('.json')) ? (
                              <div className="mt-2 p-2.5 rounded-lg bg-gradient-to-br from-cyan-950/95 to-zinc-950 border border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.25)] flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shrink-0">
                                      <FileCode size={13} className="text-cyan-300" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[10px] font-black text-white truncate tracking-wide">
                                        {msg.casePayload?.caseName || msg.fileAttachment?.name || 'Fail Kes Forensik .RHZ'}
                                      </span>
                                      <span className="text-[8px] text-cyan-300 font-mono flex items-center gap-1.5 flex-wrap">
                                        <span>● {msg.casePayload?.totalEntities || (msg.casePayload?.nodes?.length) || '?'} Entiti Nod</span>
                                        <span>• {msg.casePayload?.totalLinks || (msg.casePayload?.links?.length) || '?'} Pautan Hubungan</span>
                                        {msg.fileAttachment?.size ? <span>• {Math.round(msg.fileAttachment.size / 1024)} KB</span> : null}
                                        {((msg.casePayload as any)?.isTelegramRelay || (msg.fileAttachment as any)?.isTelegramRelay) && (
                                          <span className="text-sky-300 font-bold bg-sky-950/80 px-1 rounded border border-sky-400/40">
                                            ✈️ TG Relay
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-200 font-mono text-[8px] font-bold border border-cyan-400/50">
                                    .RHZ CASE
                                  </span>
                                </div>

                                {/* Direct Ingest & Merge Action Buttons */}
                                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
                                  <button
                                    type="button"
                                    onClick={() => handleIngestCaseToCanvas(msg, false)}
                                    className="px-2 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[9px] rounded flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                                    title="Buka fail kes ini dan paparkan visual nod graf di Canvas"
                                  >
                                    <Sparkles size={11} className="text-emerald-200" /> BUKA & GANTI CANVAS
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleIngestCaseToCanvas(msg, true)}
                                    className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 font-bold text-[9px] rounded flex items-center justify-center gap-1 transition-all active:scale-95"
                                    title="Gabungkan semua nod entiti kes ini ke Canvas tanpa memadam graf sedia ada"
                                  >
                                    <Plus size={11} className="text-cyan-400" /> GABUNG ENTITI (+{msg.casePayload?.totalEntities || 'KES'})
                                  </button>
                                </div>
                              </div>
                            ) : msg.fileAttachment && (
                              /* STANDARD ATTACHED FILE CARD (IMAGES / AUDIO / VIDEO / DOCS) */
                              <div className="mt-2 p-2 rounded-lg bg-slate-950/90 border border-cyan-500/40 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-cyan-300 truncate max-w-[200px]">
                                    {msg.fileAttachment.type?.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(msg.fileAttachment.name) ? (
                                      <Film size={11} className="text-cyan-400 shrink-0" />
                                    ) : msg.fileAttachment.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/i.test(msg.fileAttachment.name) ? (
                                      <Music size={11} className="text-cyan-400 shrink-0" />
                                    ) : (
                                      <Paperclip size={11} className="text-cyan-400 shrink-0" />
                                    )}
                                    <span className="truncate">{msg.fileAttachment.name}</span>
                                  </span>
                                  <span className="text-[8px] text-slate-400 font-mono shrink-0">
                                    {msg.fileAttachment.size > 1024 * 1024 
                                      ? `${(msg.fileAttachment.size / (1024 * 1024)).toFixed(1)} MB` 
                                      : `${Math.round(msg.fileAttachment.size / 1024)} KB`}
                                  </span>
                                </div>

                                {/* AUDIO STREAM PREVIEW PLAYER */}
                                {(msg.fileAttachment.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(msg.fileAttachment.name)) && (
                                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-[8px] text-cyan-400 font-mono">
                                      <span className="flex items-center gap-1">
                                        <Music size={10} /> AUDIO STREAM FORENSIK
                                      </span>
                                      {(msg.fileAttachment as any).isTelegramRelay && (
                                        <span className="text-sky-300 font-bold bg-sky-950 px-1 rounded border border-sky-400/30">
                                          ✈️ TG Relay CDN
                                        </span>
                                      )}
                                    </div>
                                    {msg.fileAttachment.dataUrl && (
                                      <audio 
                                        src={msg.fileAttachment.dataUrl} 
                                        controls 
                                        preload="metadata"
                                        className="w-full h-7 accent-cyan-500 rounded bg-slate-950" 
                                      />
                                    )}
                                  </div>
                                )}

                                {/* VIDEO STREAM PREVIEW PLAYER */}
                                {(msg.fileAttachment.type?.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(msg.fileAttachment.name)) && (
                                  <div className="rounded overflow-hidden bg-black border border-slate-800 relative group/vid">
                                    {msg.fileAttachment.dataUrl ? (
                                      <video 
                                        src={msg.fileAttachment.dataUrl} 
                                        controls 
                                        preload="metadata"
                                        className="max-h-40 w-full object-contain bg-black" 
                                      />
                                    ) : (
                                      <div className="p-4 text-center text-slate-500 text-[10px]">
                                        Fail Video ({msg.fileAttachment.name})
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* IMAGE PREVIEW */}
                                {msg.fileAttachment.dataUrl && (msg.fileAttachment.dataUrl.startsWith('data:image') || msg.fileAttachment.type?.startsWith('image/')) && (
                                  <div className="relative group/img overflow-hidden rounded border border-slate-800">
                                    <img 
                                      src={msg.fileAttachment.dataUrl} 
                                      alt="" 
                                      className="max-h-36 w-full object-cover rounded" 
                                    />
                                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center p-2">
                                      <button
                                        type="button"
                                        onClick={() => handleAddFileToCanvas(msg.fileAttachment!)}
                                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] rounded flex items-center gap-1 shadow-lg transition-transform active:scale-95"
                                      >
                                        <Plus size={12} /> TAMBAH KE CANVAS PASUKAN
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-slate-800 gap-1.5">
                                  {/* Media Forensic Inspector Trigger Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInspectingMedia({
                                        url: msg.fileAttachment?.dataUrl,
                                        fileName: msg.fileAttachment!.name,
                                        fileSize: msg.fileAttachment!.size,
                                        mimeType: msg.fileAttachment!.type
                                      });
                                    }}
                                    className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-bold text-[8px] rounded flex items-center gap-1 transition-all active:scale-95 shadow"
                                    title="Imbas metadata EXIF, codec, durasi, dan integriti forensik fail ini"
                                  >
                                    <Maximize2 size={10} className="text-cyan-400" /> IMBAS METADATA
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleAddFileToCanvas(msg.fileAttachment!)}
                                    className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 font-black text-[8px] rounded flex items-center gap-1 transition-all active:scale-95 shadow shrink-0"
                                    title="Tambah gambar / audio / video sebagai nod di Canvas"
                                  >
                                    <Plus size={10} className="text-emerald-400" /> Semat Ke Canvas
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* LINKED NODE CARD (CLICKABLE TO JUMP ON CANVAS) */}
                            {msg.linkedNode && (
                              <div className="mt-2 p-2 rounded-lg bg-slate-950/80 border border-cyan-500/40 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-bold border border-cyan-500/30 uppercase">
                                    {msg.linkedNode.type}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleAddLinkedNodeToCanvas(msg.linkedNode!)}
                                      className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 rounded font-black text-[9px] flex items-center gap-1 transition-all shadow"
                                      title="Tambah nod ini ke Canvas anda"
                                    >
                                      <Plus size={10} /> TAMBAH
                                    </button>
                                    {onFocusNode && (
                                      <button
                                        type="button"
                                        onClick={() => onFocusNode(msg.linkedNode!.id)}
                                        className="px-2 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded font-black text-[9px] flex items-center gap-1 transition-all shadow"
                                        title="Fokus dan zoom nod ini di canvas utama"
                                      >
                                        <Target size={10} /> FOKUS
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-start gap-2 mt-0.5">
                                  {msg.linkedNode.imageUrl && (
                                    <img 
                                      src={msg.linkedNode.imageUrl} 
                                      alt="" 
                                      className="w-8 h-8 rounded object-cover border border-cyan-500/30 flex-shrink-0" 
                                    />
                                  )}
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="font-bold text-cyan-200 truncate">{msg.linkedNode.label}</span>
                                    {msg.linkedNode.details && (
                                      <span className="text-[9px] text-slate-400 line-clamp-2">{msg.linkedNode.details}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* EMOJI REACTIONS ROW */}
                            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                              {msg.reactions && Object.entries(msg.reactions).map(([emoji, uids]) => {
                                const hasReacted = currentUser?.uid ? uids.includes(currentUser.uid) : false;
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className={`px-1.5 py-0.2 rounded text-[9px] flex items-center gap-1 border transition-all ${
                                      hasReacted 
                                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold' 
                                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-600'
                                    }`}
                                  >
                                    <span>{emoji}</span>
                                    <span>{uids.length}</span>
                                  </button>
                                );
                              })}

                              {/* Quick Reaction Adder */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1">
                                {['👍', '🎯', '🔥', '⚠️'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className="p-0.5 rounded hover:bg-slate-800 text-[10px] transition-transform hover:scale-125"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* AI THINKING NEURAL INDICATOR */}
                  {isAIThinking && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-sm shadow animate-pulse">
                            🧠
                          </div>
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-amber-300">
                              {isAIThinking}
                            </span>
                            <span className="text-[7.5px] px-1 py-0.2 rounded bg-amber-950 text-amber-200 border border-amber-500/40 font-mono font-bold animate-pulse">
                              ANALYZING CANVAS & INTEL
                            </span>
                          </div>
                          <span className="text-[8.5px] text-slate-400">
                            Meneliti {graphData.nodes.length} nod graf dan perbualan untuk merangka langkah taktikal seterusnya...
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}

              {/* TAB: CANVAS NODES RADAR & DIRECTORY WITH DIRECT FLY-TO & ZOOM */}
              {activeTab === 'nodes' && (
                <div className="space-y-3 p-1">
                  {/* Top Stats Banner & Search Bar */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow">
                          🎯
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-amber-200 uppercase tracking-wide">Direktori & Radar Nod Kanvas</h4>
                          <p className="text-[8.5px] text-slate-400">Pilih mana-mana entiti untuk melompat & zum masuk terus di kanvas</p>
                        </div>
                      </div>
                      <span className="text-[8.5px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/50 font-mono font-bold">
                        {allNodes?.length || 0} ENTITI
                      </span>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400/70" />
                      <input
                        type="text"
                        value={nodeSearchTerm}
                        onChange={(e) => setNodeSearchTerm(e.target.value)}
                        placeholder="Cari entiti mengikut nama, nombor telefon, IP, domain, syarikat..."
                        className="w-full bg-slate-950/90 border border-amber-500/40 rounded-lg pl-8 pr-7 py-1.5 text-[9.5px] text-amber-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono shadow-inner"
                      />
                      {nodeSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setNodeSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px] p-0.5"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 text-[8px]">
                      {[
                        { id: 'all', label: 'Semua', icon: '🌐' },
                        { id: 'person', label: 'Individu', icon: '👤' },
                        { id: 'phone', label: 'Telefon', icon: '📱' },
                        { id: 'cyber', label: 'Siber / IP', icon: '💻' },
                        { id: 'location', label: 'Lokasi', icon: '📍' },
                        { id: 'finance', label: 'Kewangan', icon: '🏦' },
                        { id: 'company', label: 'Syarikat', icon: '🏢' },
                        { id: 'social', label: 'Media Sosial', icon: '💬' },
                        { id: 'vehicle', label: 'Kenderaan', icon: '🚗' },
                      ].map((cat) => {
                        const isSel = nodeTypeFilter === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setNodeTypeFilter(cat.id)}
                            className={`px-2 py-0.5 rounded-full border shrink-0 transition-all font-bold flex items-center gap-1 ${
                              isSel 
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                                : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-amber-500/40 hover:text-amber-200'
                            }`}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filtered Nodes List */}
                  {(() => {
                    const filtered = (allNodes || []).filter((n) => {
                      // Filter by search term
                      if (nodeSearchTerm.trim()) {
                        const term = nodeSearchTerm.toLowerCase();
                        const matchLabel = (n.label || '').toLowerCase().includes(term);
                        const matchType = (n.type || '').toLowerCase().includes(term);
                        const matchDetails = (n.details || '').toLowerCase().includes(term);
                        const matchUrl = (n.url || '').toLowerCase().includes(term);
                        if (!matchLabel && !matchType && !matchDetails && !matchUrl) return false;
                      }

                      // Filter by category
                      if (nodeTypeFilter !== 'all') {
                        const t = (n.type || '').toLowerCase();
                        if (nodeTypeFilter === 'person') return t.includes('person') || t.includes('suspect') || t.includes('target') || t.includes('individu');
                        if (nodeTypeFilter === 'phone') return t.includes('phone') || t.includes('telefon') || t.includes('contact');
                        if (nodeTypeFilter === 'cyber') return t.includes('ip') || t.includes('domain') || t.includes('server') || t.includes('host') || t.includes('cve') || t.includes('siber');
                        if (nodeTypeFilter === 'location') return t.includes('location') || t.includes('geo') || t.includes('tempat') || t.includes('alamat');
                        if (nodeTypeFilter === 'finance') return t.includes('bank') || t.includes('finance') || t.includes('crypto') || t.includes('account') || t.includes('kewangan');
                        if (nodeTypeFilter === 'company') return t.includes('company') || t.includes('org') || t.includes('syarikat');
                        if (nodeTypeFilter === 'social') return t.includes('social') || t.includes('profile') || t.includes('media') || t.includes('akaun');
                        if (nodeTypeFilter === 'vehicle') return t.includes('vehicle') || t.includes('car') || t.includes('kenderaan');
                      }

                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
                          <span className="text-2xl">🔍</span>
                          <p className="text-xs font-bold text-slate-300">Tiada nod ditemui</p>
                          <p className="text-[9px] text-slate-500 max-w-xs">
                            Cuba tukar kata kunci carian atau kategori penapis anda.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-0.5 custom-scrollbar">
                        {filtered.map((node) => {
                          const typeLower = (node.type || '').toLowerCase();
                          const isPerson = typeLower.includes('person') || typeLower.includes('suspect') || typeLower.includes('target') || typeLower.includes('individu');
                          const isPhone = typeLower.includes('phone') || typeLower.includes('telefon') || typeLower.includes('contact');
                          const isLocation = typeLower.includes('location') || typeLower.includes('geo') || typeLower.includes('tempat') || typeLower.includes('alamat');
                          const isCyber = typeLower.includes('ip') || typeLower.includes('domain') || typeLower.includes('server') || typeLower.includes('host') || typeLower.includes('cve');
                          const isFinance = typeLower.includes('bank') || typeLower.includes('finance') || typeLower.includes('crypto') || typeLower.includes('account') || typeLower.includes('kewangan');
                          const isCompany = typeLower.includes('company') || typeLower.includes('org') || typeLower.includes('syarikat');
                          const isSocial = typeLower.includes('social') || typeLower.includes('profile') || typeLower.includes('akaun') || typeLower.includes('media');
                          const isVehicle = typeLower.includes('vehicle') || typeLower.includes('car') || typeLower.includes('kenderaan');

                          const typeIcon = isPerson ? '👤' :
                                           isPhone ? '📱' :
                                           isLocation ? '📍' :
                                           isCyber ? '💻' :
                                           isFinance ? '🏦' :
                                           isCompany ? '🏢' :
                                           isSocial ? '💬' :
                                           isVehicle ? '🚗' : '🔷';

                          const connectionsCount = (graphData?.links || []).filter(l => {
                            const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
                            const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
                            return s === node.id || t === node.id;
                          }).length;

                          const isActive = activeNode?.id === node.id;

                          return (
                            <div
                              key={node.id}
                              className={`p-2.5 rounded-lg border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 group/nodeItem ${
                                isActive
                                  ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                  : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900'
                              }`}
                            >
                              {/* Left Info */}
                              <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 border shadow ${
                                  isActive
                                    ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                                    : 'bg-slate-950 border-amber-500/40 text-amber-300'
                                }`}>
                                  {typeIcon}
                                </div>

                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-black text-white group-hover/nodeItem:text-amber-200 transition-colors truncate max-w-[220px]">
                                      {node.label}
                                    </span>
                                    <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-mono uppercase font-bold">
                                      {node.type}
                                    </span>
                                    <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                                      🔗 {connectionsCount} hubung
                                    </span>
                                    {isActive && (
                                      <span className="text-[7px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black uppercase font-mono">
                                        SASARAN SEMASA
                                      </span>
                                    )}
                                  </div>

                                  {node.details && (
                                    <p className="text-[8px] text-slate-400 line-clamp-1 italic mt-0.5">
                                      {node.details}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Right Action Buttons */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                {/* Shortcut 1: Fly-To & Zoom on Canvas */}
                                {onFocusNode && (
                                  <button
                                    type="button"
                                    onClick={() => onFocusNode(node.id, true)}
                                    className="px-2.5 py-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black rounded text-[8.5px] uppercase tracking-wide flex items-center gap-1 transition-all shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                    title="Tutup tetingkap sembang dan terus lompat serta zum masuk ke nod ini di kanvas"
                                  >
                                    <ArrowRight size={10} strokeWidth={3} />
                                    <span>🚀 Zum Kanvas</span>
                                  </button>
                                )}

                                {/* Shortcut 2: Focus without closing chat */}
                                {onFocusNode && (
                                  <button
                                    type="button"
                                    onClick={() => onFocusNode(node.id, false)}
                                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded text-[8.5px] font-bold flex items-center gap-1 transition-all active:scale-95"
                                    title="Pilih dan kunci kamera ke nod ini di kanvas tanpa menutup chat"
                                  >
                                    <Target size={10} />
                                    <span>🎯 Kunci</span>
                                  </button>
                                )}

                                {/* Shortcut 3: Open Recon Modal */}
                                {onOpenModal && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenModal('verify_node_web', node)}
                                    className="p-1 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded text-[8px] transition-all"
                                    title="Periksa maklumat OSINT / pengesahan web entiti ini"
                                  >
                                    <Globe size={10} />
                                  </button>
                                )}

                                {/* Shortcut 4: Discuss in Chat */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInputText(`@ai tolong buat analisa mendalam mengenai entiti "${node.label}" [${node.type}]`);
                                    setActiveTab('chat');
                                    setTimeout(() => {
                                      if (chatInputRef.current) chatInputRef.current.focus();
                                    }, 80);
                                  }}
                                  className="p-1 bg-slate-950 hover:bg-slate-800 text-purple-300 border border-purple-500/40 rounded text-[8px] transition-all"
                                  title="Tanya AI Analyst mengenai entiti ini"
                                >
                                  <MessageSquare size={10} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: ACTIVE OPERATIVES LIST & TARGET STATUS */}
              {activeTab === 'ops' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-semibold">
                    <span className="flex items-center gap-1">
                      <Users size={11} className="text-cyan-400" /> Senarai Penyiasat & Aktiviti Semasa:
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      {onlineOps.length} Bersambung
                    </span>
                  </div>

                  {onlineOps.map((op) => {
                    const isMe = op.uid === currentUser?.uid;
                    const targetNode = op.activeNodeId ? allNodes.find(n => n.id === op.activeNodeId) : null;
                    const displayNodeLabel = targetNode?.label || op.activeNodeLabel;
                    const displayNodeType = targetNode?.type || op.activeNodeType;
                    const activityIcon = op.activeModal ? '🛠️' : (displayNodeLabel ? '🎯' : '📊');
                    const activityTool = op.activeTool || (op.activeModal ? op.activeModal.replace(/_/g, ' ').toUpperCase() : 'Canvas Utama');
                    const activityAction = op.currentActivity || (displayNodeLabel ? `Meneliti entiti: "${displayNodeLabel}" (${displayNodeType || 'node'})` : 'Menyiasat dicanvas graf');

                    return (
                      <div 
                        key={op.uid}
                        className={`p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                          isMe 
                            ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Avatar with Live Indicator */}
                          <div className="relative shrink-0">
                            {op.photoURL ? (
                              <img src={op.photoURL} alt="" className="w-9 h-9 rounded-full border-2 border-cyan-400/80 object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center font-black text-slate-950 text-sm shadow">
                                {op.displayName.charAt(0)}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-cyan-200 text-xs truncate">{op.displayName}</span>
                                {isMe && (
                                  <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-400 text-[8px] font-black border border-cyan-500/40">
                                    ANDA
                                  </span>
                                )}
                              </div>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0 ${
                                op.role === 'lead'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : op.role === 'analyst'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}>
                                {op.role}
                              </span>
                            </div>

                            <span className="text-[9px] text-slate-400 truncate block mt-0.5">
                              {op.email === 'fisaabilillah@gmail.com' || op.role === 'lead' ? 'Elite Agent [Identiti Sulit]' : op.email}
                            </span>
                          </div>
                        </div>

                        {/* Telemetry Status Card (What are they doing right now) */}
                        <div className="bg-slate-950/80 rounded-md p-2 border border-slate-800 flex flex-col gap-1 text-[10px]">
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-slate-400 flex items-center gap-1">
                              <span>{activityIcon}</span> Modul / Alat Aktif:
                            </span>
                            <span className="font-bold text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/30">
                              {activityTool}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-1 pt-1 border-t border-slate-900">
                            <span className="text-[9px] text-slate-300 flex-1 leading-snug">
                              🎯 <b className="text-cyan-200">{activityAction}</b>
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: Focus Node & Mention in Chat */}
                        <div className="flex items-center justify-end gap-1.5 pt-0.5">
                          {op.activeNodeId && onFocusNode && (
                            <button
                              onClick={() => {
                                onFocusNode(op.activeNodeId!);
                                setIsMinimized(true);
                              }}
                              className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded text-[9px] font-bold flex items-center gap-1 transition-all shadow"
                              title={`Lompat dan fokus ke nod ${displayNodeLabel || op.activeNodeId} di Canvas`}
                            >
                              <Target size={10} className="text-cyan-400" /> Fokus Nod dicanvas
                            </button>
                          )}

                          {!isMe && (
                            <button
                              onClick={() => {
                                const mentionTag = `@${op.displayName} `;
                                setInputText(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + mentionTag);
                                setActiveTab('chat');
                                setTimeout(() => {
                                  if (chatInputRef.current) {
                                    chatInputRef.current.focus();
                                  }
                                }, 50);
                              }}
                              className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded text-[9px] font-black flex items-center gap-1 transition-all shadow active:scale-95"
                              title={`Seru @${op.displayName} dalam sembang bilik operasi`}
                            >
                              <AtSign size={10} /> Seru Penyiasat
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: TELEGRAM HEADLESS CLOUD STORAGE RELAY SETTINGS */}
              {activeTab === 'telegram' && (
                <div className="space-y-3 p-1">
                  <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-500/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">✈️</span>
                        <div>
                          <h4 className="text-xs font-bold text-sky-200">Telegram Headless Cloud Relay</h4>
                          <p className="text-[9px] text-slate-400">Penyimpanan fail kes .rhz, video & audio (sehingga 2GB) tanpa had saiz Firestore</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={telegramConfig.enabled} 
                          onChange={(e) => {
                            const updated = { ...telegramConfig, enabled: e.target.checked };
                            setTelegramConfig(updated);
                            saveStoredTelegramConfig(updated);
                          }}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                      </label>
                    </div>

                    <p className="text-[9px] text-slate-300 leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800">
                      💡 <b>Storan Tersimpan Secara Kekal:</b> Token Bot dan Group ID yang anda taip di bawah disimpan secara automatik ke <b>LocalStorage</b> pelayar dan <b>Awan Firebase Firestore</b>. Anda tidak perlu memasukkannya semula setiap kali membuka aplikasi atau bertukar peranti.
                    </p>

                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-300 mb-1">Telegram Bot Token (dari @BotFather):</label>
                        <input
                          type="password"
                          value={telegramConfig.botToken}
                          onChange={(e) => {
                            const updated = { ...telegramConfig, botToken: e.target.value };
                            setTelegramConfig(updated);
                            saveStoredTelegramConfig(updated);
                          }}
                          placeholder="1234567890:ABCdefGhIJKlmNoPQRstuvwxYZ"
                          className="w-full bg-slate-950 border border-sky-500/40 rounded px-2.5 py-1.5 text-[10px] text-sky-100 placeholder-slate-600 focus:outline-none focus:border-sky-400 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-300 mb-1">Telegram Chat ID / Channel ID / Group ID:</label>
                        <input
                          type="text"
                          value={telegramConfig.chatId}
                          onChange={(e) => {
                            const updated = { ...telegramConfig, chatId: e.target.value };
                            setTelegramConfig(updated);
                            saveStoredTelegramConfig(updated);
                          }}
                          placeholder="Contoh: -100123456789 atau @channel_name atau 12345678"
                          className="w-full bg-slate-950 border border-sky-500/40 rounded px-2.5 py-1.5 text-[10px] text-sky-100 placeholder-slate-600 focus:outline-none focus:border-sky-400 font-mono"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded">
                        <div className="flex items-center gap-1">
                          <Check size={11} className="text-emerald-400" />
                          <span>Tersimpan secara automatik & diselaraskan ke Awan</span>
                        </div>
                        {telegramConfig.botToken && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Adakah anda pasti mahu memadam konfigurasi Telegram tersimpan?')) {
                                const cleared = clearStoredTelegramConfig();
                                setTelegramConfig(cleared);
                                setCanvasAddSuccess("Konfigurasi Telegram telah dipadam.");
                                setTimeout(() => setCanvasAddSuccess(null), 2500);
                              }
                            }}
                            className="text-[9px] text-rose-400 hover:text-rose-200 underline"
                          >
                            Reset / Padam
                          </button>
                        )}
                      </div>

                      {/* Test Connection Button */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          disabled={telegramTestStatus.testing || !telegramConfig.botToken || !telegramConfig.chatId}
                          onClick={async () => {
                            setTelegramTestStatus({ testing: true });
                            const res = await testTelegramConnection(telegramConfig.botToken, telegramConfig.chatId);
                            setTelegramTestStatus({
                              testing: false,
                              result: res.success 
                                ? `Sambungan Berjaya! Bot: @${res.botUsername || 'Active'}${res.chatTitle ? ` (${res.chatTitle})` : ''}` 
                                : res.error || 'Gagal menyambung ke Telegram.',
                              success: res.success
                            });
                          }}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-slate-950 font-bold rounded text-[10px] flex items-center gap-1.5 transition-all shadow"
                        >
                          {telegramTestStatus.testing ? <RefreshCw size={11} className="animate-spin" /> : <span>⚡ Uji Sambungan Bot</span>}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const saved = { ...telegramConfig };
                            saveStoredTelegramConfig(saved);
                            setCanvasAddSuccess("Konfigurasi Telegram tersimpan ke LocalStorage & Firestore Awan!");
                            setTimeout(() => setCanvasAddSuccess(null), 3000);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded transition-all border border-slate-700 flex items-center gap-1"
                        >
                          <Check size={10} className="text-emerald-400" /> Simpan & Segerakkan
                        </button>
                      </div>

                      {/* Test Connection Result Feedback */}
                      {telegramTestStatus.result && (
                        <div className={`p-2 rounded text-[9px] flex items-center gap-1.5 ${
                          telegramTestStatus.success 
                            ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300' 
                            : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                        }`}>
                          <span>{telegramTestStatus.success ? '✓' : '⚠️'}</span>
                          <span>{telegramTestStatus.result}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: FIREBASE & ZERO-TRACE PURGE SUITE */}
              {activeTab === 'purge' && (
                <div className="space-y-3.5 p-1">
                  {/* Status Banner */}
                  {purgeSuccessNotice && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-[10px] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      <span>{purgeSuccessNotice}</span>
                    </div>
                  )}

                  {/* Clarification Box */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-rose-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider">
                      <ShieldAlert size={14} className="text-rose-400" />
                      <span>Protokol Sanitasi & Purge Data (Zero-Trace)</span>
                    </div>
                    <p className="text-[9.5px] text-slate-300 leading-relaxed">
                      Semua perbualan, rekod bilik, pautan perkongsian fail .rhz, snapshot visual nod canvas, dan kehadiran penyiasat dalam <b>Firebase Firestore</b> boleh dipadamkan serta-merta bila-bila masa. Anda juga boleh menghapuskan semua jejak pada pelayar tempatan dengan satu klik.
                    </p>
                  </div>

                  {/* SECTION 1: CLOUD FIREBASE PURGE ACTIONS */}
                  <div className="p-3 rounded-lg bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-950 border border-rose-500/40 space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-500/20 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Flame size={13} className="text-rose-400" />
                        <span className="text-[11px] font-black text-rose-200 uppercase tracking-wide">Pembersihan Awan (Firebase Firestore)</span>
                      </div>
                      <span className="text-[8px] bg-rose-500/20 text-rose-300 font-mono px-1.5 py-0.5 rounded font-bold border border-rose-500/30">
                        BILIK: {roomId}
                      </span>
                    </div>

                    {/* Action 1: Purge Messages in Room */}
                    <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-bold text-white flex items-center gap-1.5">
                            <span>1. Purge Semua Mesej & Perkongsian Fail Bilik</span>
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-500/30">
                              {messages.length} mesej
                            </span>
                          </div>
                          <p className="text-[8.5px] text-slate-400 mt-0.5">
                            Memadam semua teks perbualan, kad entiti kes .rhz, fail lampiran, dan tindak balas emoji dalam bilik Firestore ini.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPurgeDialog({
                            open: true,
                            type: 'messages',
                            title: `Purge Semua Mesej Bilik (${roomId})`,
                            description: `Tindakan ini akan memadam kesemua ${messages.length} mesej dan lampiran fail dari Firebase Firestore secara kekal bagi bilik ${roomId}. Rakan sepasukan anda tidak lagi akan melihat sejarah sembang ini.`,
                            warningLevel: 'high'
                          })}
                          disabled={messages.length === 0}
                          className="px-2.5 py-1.5 bg-rose-600/30 hover:bg-rose-600 disabled:opacity-40 text-rose-200 hover:text-white border border-rose-500/40 rounded text-[9px] font-bold transition-all shrink-0 flex items-center gap-1"
                        >
                          <Trash2 size={10} /> Padam Mesej
                        </button>
                      </div>
                    </div>

                    {/* Action 2: Purge Cloud Live Canvas */}
                    <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-bold text-white">2. Purge Graf Live Canvas di Awan</div>
                          <p className="text-[8.5px] text-slate-400 mt-0.5">
                            Mengosongkan dan memadam dokumen graf kanvas aktif yang diselaraskan untuk bilik ini di Firestore.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPurgeDialog({
                            open: true,
                            type: 'canvas',
                            title: `Purge Live Canvas Bilik (${roomId})`,
                            description: `Tindakan ini akan memadam dokumen graf nod aktif bagi bilik ${roomId} di Firestore. Semua penyiasat yang berhubung dengan bilik ini akan menerima kemas kini kanvas kosong.`,
                            warningLevel: 'high'
                          })}
                          className="px-2.5 py-1.5 bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/40 rounded text-[9px] font-bold transition-all shrink-0 flex items-center gap-1"
                        >
                          <RotateCcw size={10} /> Kosongkan Canvas
                        </button>
                      </div>
                    </div>

                    {/* Action 3: Destroy / Nuke Entire Operation Room */}
                    <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/50 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-black text-rose-300 flex items-center gap-1">
                            <Skull size={11} className="text-rose-400" />
                            <span>3. Musnahkan Bilik Operasi Keseluruhan (Nuke Room)</span>
                          </div>
                          <p className="text-[8.5px] text-slate-400 mt-0.5">
                            Memadam sepenuhnya rekod bilik, semua subkoleksi mesej, data presens penyiasat, dan fail canvas dari Firestore.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPurgeDialog({
                            open: true,
                            type: 'room',
                            title: `Hancurkan & Padam Penuh Bilik Operasi (${roomId})`,
                            description: `AMARAN KRITIKAL: Tindakan ini akan MEMADAMKAN KESELURUHAN BILIK OPERASI (${roomId}) dari pangkalan data Firebase Firestore termasuk semua mesej, senarai penyiasat, dan fail kanvas. Tindakan ini TIDAK boleh dikembalikan.`,
                            warningLevel: 'critical'
                          })}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded text-[9px] transition-all shrink-0 flex items-center gap-1 shadow-[0_0_10px_rgba(225,29,72,0.4)]"
                        >
                          <Flame size={10} /> Nuke Bilik
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: LOCAL BROWSER ZERO-TRACE PURGE */}
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <HardDrive size={13} className="text-cyan-400" />
                        <span className="text-[11px] font-black text-cyan-200 uppercase tracking-wide">Pembersihan Tempatan (Pelayar & Kuki)</span>
                      </div>
                      <span className="text-[8px] bg-cyan-500/20 text-cyan-300 font-mono px-1.5 py-0.5 rounded font-bold">
                        LOCAL-FIRST
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-white">Zero-Trace Local Cache & Storage Cleanse</div>
                        <p className="text-[8.5px] text-slate-400 mt-0.5">
                          Memadamkan LocalStorage, SessionStorage, pangkalan data IndexedDB (RedHorizonDB), dan CacheStorage pada pelayar peranti ini.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPurgeDialog({
                          open: true,
                          type: 'local',
                          title: 'Pembersihan Tempatan Penuh (Zero-Trace)',
                          description: 'Tindakan ini akan mengosongkan semua data tempatan (LocalStorage, SessionStorage, IndexedDB RedHorizonDB, Caches) pada pelayar ini dan memuat semula aplikasi.',
                          warningLevel: 'high'
                        })}
                        className="px-2.5 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded text-[9px] transition-all shrink-0 flex items-center gap-1"
                      >
                        <ShieldCheck size={10} /> Purge Tempatan
                      </button>
                    </div>
                  </div>

                  {/* SECTION 3: MASTER TACTICAL PURGE (NUCLEAR COMBO) */}
                  <div className="p-3 rounded-lg bg-gradient-to-r from-red-950 via-zinc-950 to-rose-950 border border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.2)] space-y-2">
                    <div className="flex items-center gap-1.5 text-red-300 font-black text-xs uppercase">
                      <Skull size={14} className="text-red-400 animate-pulse" />
                      <span>Master Tactical Purge (Zero-Trace Penuh + Bilik Awan)</span>
                    </div>
                    <p className="text-[8.5px] text-slate-300 leading-relaxed">
                      Melaksanakan pemadaman dwilapisan serentak: Menghapuskan rekod bilik aktif dari awan Firebase Firestore DAN membersihkan keseluruhan storan pelayar tempatan tanpa meninggalkan sebarang jejak digital.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPurgeDialog({
                        open: true,
                        type: 'master',
                        title: 'MASTER TACTICAL PURGE (SEMUA TEMPATAN + BILIK AWAN)',
                        description: `AMARAN TERTINGGI: Tindakan ini akan memusnahkan bilik operasi ${roomId} di Firebase Firestore dan membersihkan semua data pelayar tempatan. Sistem akan dimulakan semula dalam keadaan asal yang bersih (Zero-Trace).`,
                        warningLevel: 'critical'
                      })}
                      className="w-full py-2.5 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-black text-[10px] rounded uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <Flame size={13} /> INITIATE MASTER TACTICAL PURGE
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: ROOM PASSCODE & SECURITY SETTINGS */}
              {activeTab === 'room_settings' && (
                <div className="space-y-3.5 p-1 font-mono">
                  {/* Room Security Status Overview */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wider">
                        <Key size={14} className="text-amber-400" />
                        <span>Tetapan Keselamatan Bilik Operasi</span>
                      </div>
                      <span className="text-[8.5px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                        🔒 Gmail Auth & Passcode Protected
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-300 leading-relaxed">
                      Bilik ini (<b className="text-cyan-300">{roomId}</b>) dilindungi dengan pengesahan identiti akaun Gmail rasmi serta kata laluan operasi khas.
                    </p>
                  </div>

                  {/* Section 1: Update Room ID */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-2">
                    <label className="text-[10px] font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Globe size={12} className="text-cyan-400" />
                      <span>Kod / Nama Bilik Operasi</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempRoomInput}
                        onChange={(e) => setTempRoomInput(e.target.value.toUpperCase())}
                        placeholder="Contoh: OPS-RED-ALPHA"
                        className="flex-1 bg-slate-950 border border-cyan-500/40 rounded-lg px-3 py-2 text-[11px] text-cyan-200 focus:outline-none focus:border-cyan-400 uppercase font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tempRoomInput.trim()) {
                            setRoomId(tempRoomInput.trim());
                            setCanvasAddSuccess(`Bilik operasi bertukar ke: ${tempRoomInput.trim()}`);
                            setTimeout(() => setCanvasAddSuccess(null), 3000);
                          }
                        }}
                        className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-[10px] uppercase rounded-lg transition-all shadow shrink-0"
                      >
                        Masuk Bilik
                      </button>
                    </div>
                  </div>

                  {/* Section 2: Update Room Special Passcode */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Key size={12} className="text-amber-400" />
                        <span>Kemaskini Kata Laluan Khas Operasi</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8.5px] text-slate-400 font-mono">
                          Passcode Semasa: <strong className="text-amber-300">{showPasscodeInSettings ? (roomMetadata?.passcode || 'RH2026') : '••••••••'}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPasscodeInSettings(!showPasscodeInSettings)}
                          className="text-slate-400 hover:text-amber-300 transition-colors p-0.5"
                          title={showPasscodeInSettings ? "Sembunyi Passcode" : "Papar Passcode"}
                        >
                          {showPasscodeInSettings ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-400 leading-normal">
                      Mengemas kini kata laluan khas di Firestore membolehkan anda menetapkan password baru untuk menyekat pencerobohan dan memastikan hanya ahli berkuasa sahaja dapat membaca perbualan.
                    </p>

                    {updatePasscodeStatus.msg && (
                      <div className={`p-2 rounded-lg text-[9.5px] font-mono flex items-center gap-1.5 ${
                        updatePasscodeStatus.success 
                          ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/50' 
                          : 'bg-rose-950/90 text-rose-200 border border-rose-500/50'
                      }`}>
                        {updatePasscodeStatus.success ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={13} className="text-rose-400 shrink-0" />}
                        <span>{updatePasscodeStatus.msg}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newRoomPasscodeInput}
                        onChange={(e) => setNewRoomPasscodeInput(e.target.value)}
                        placeholder="Taip Password Khas Baharu..."
                        className="flex-1 bg-slate-950 border border-amber-500/40 focus:border-amber-400 rounded-lg px-3 py-2 text-[11px] text-amber-200 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleUpdatePasscode}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-lg transition-all shadow shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <ShieldCheck size={12} />
                        <span>Simpan Password</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 2.5: Create Custom Room (Public or Elite Agent Restricted) */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/60 via-slate-900 to-purple-950/40 border border-cyan-500/50 space-y-3">
                    <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-cyan-200">
                        <Plus size={14} className="text-cyan-400" />
                        <span>Cipta Bilik Operasi Baharu (Kawalan Akses)</span>
                      </div>
                      <span className="text-[8px] bg-purple-500/20 text-purple-300 font-mono px-2 py-0.5 rounded-full border border-purple-500/40 font-bold uppercase flex items-center gap-1">
                        <ShieldCheck size={10} /> Mode Privasi
                      </span>
                    </div>

                    <p className="text-[9.5px] text-slate-300 leading-relaxed font-mono">
                      Setiap penyiasat boleh mencipta bilik operasi sendiri. Anda boleh menetapkan akses terbuka untuk <b>Semua Penyiasat</b> atau terhad khas untuk <b>Elite Agent Sahaja 🛡️</b>.
                    </p>

                    {createRoomNotice && (
                      <div className={`p-2 rounded-lg text-[9.5px] font-mono flex items-center gap-1.5 ${
                        createRoomNotice.success 
                          ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/50' 
                          : 'bg-rose-950/90 text-rose-200 border border-rose-500/50'
                      }`}>
                        {createRoomNotice.success ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={13} className="text-rose-400 shrink-0" />}
                        <span>{createRoomNotice.msg}</span>
                      </div>
                    )}

                    <div className="space-y-2.5 font-mono">
                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-300 mb-1 uppercase">Kod / ID Bilik Baharu:</label>
                        <input
                          type="text"
                          value={createRoomIdInput}
                          onChange={(e) => setCreateRoomIdInput(e.target.value.toUpperCase())}
                          placeholder="Contoh: OPS-ELITE-SECRET"
                          className="w-full bg-slate-950 border border-cyan-500/40 focus:border-cyan-400 rounded-lg px-3 py-2 text-[11px] text-cyan-200 focus:outline-none uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-300 mb-1 uppercase">Kata Laluan Khas Bilik:</label>
                        <input
                          type="password"
                          value={createRoomPasscodeInput}
                          onChange={(e) => setCreateRoomPasscodeInput(e.target.value)}
                          placeholder="Masukkan password khas bilik..."
                          className="w-full bg-slate-950 border border-amber-500/40 focus:border-amber-400 rounded-lg px-3 py-2 text-[11px] text-amber-200 focus:outline-none font-mono"
                        />
                      </div>

                      {/* Access Restriction Mode Toggle */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                        <span className="block text-[9.5px] font-bold text-amber-300 uppercase">Kelulusan Akses Kemasukan:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setCreateRoomIsEliteOnly(false)}
                            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                              !createRoomIsEliteOnly 
                                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              <Globe size={12} className="text-cyan-400" />
                              <span>Semua Penyiasat</span>
                            </div>
                            <p className="text-[8px] opacity-80 mt-0.5">Semua level penyiasat boleh masuk dengan kata laluan.</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCreateRoomIsEliteOnly(true)}
                            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                              createRoomIsEliteOnly 
                                ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-purple-300">
                              <ShieldCheck size={12} className="text-purple-400" />
                              <span>Elite Agent Sahaja 🛡️</span>
                            </div>
                            <p className="text-[8px] opacity-80 mt-0.5">Hanya Elite Agent sahaja yang dibenarkan memasuki bilik ini.</p>
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateCustomRoom}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-500 via-purple-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-[10.5px] uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles size={14} />
                        <span>Cipta & Masuk Bilik Sekarang</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 3: User Authentication Identity */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                      <User size={12} className="text-cyan-400" />
                      <span>Identiti Pengendali Gmail Disahkan</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {currentUser?.photoURL ? (
                          <img src={currentUser.photoURL} alt="" className="w-6 h-6 rounded-full border border-cyan-500/50 object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-cyan-600/30 text-cyan-200 font-bold flex items-center justify-center text-xs">
                            {currentUser?.displayName?.charAt(0) || 'G'}
                          </div>
                        )}
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[10px] font-bold text-white truncate">{currentUser?.displayName}</span>
                          <span className="text-[8.5px] text-emerald-400 truncate flex items-center gap-1">
                            <CheckCircle2 size={10} /> {currentUser?.email === 'fisaabilillah@gmail.com' || currentUser?.role === 'lead' ? 'Elite Agent [Encrypted]' : currentUser?.email}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await logoutOperative(roomId, currentUser.uid);
                          sessionStorage.removeItem(`redhorizon_room_unlocked_${roomId}`);
                          setIsRoomUnlocked(false);
                        }}
                        className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded text-[9px] font-bold uppercase transition-colors shrink-0 flex items-center gap-1"
                      >
                        <LogOut size={10} />
                        <span>Log Keluar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: ROOM LIST (SENARAI BILIK OPERASI) */}
              {activeTab === 'room_list' && (
                <div className="space-y-3 p-1 font-mono">
                  {/* Header & Quick Filter Banner */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-indigo-200">
                        <FolderKanban size={15} className="text-indigo-400" />
                        <span>Senarai Bilik Operasi ({allOperationRooms.length})</span>
                      </div>
                      {isEliteAgent && (
                        <span className="text-[8.5px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/50 font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                          <ShieldCheck size={11} /> Akses Elite Agent Active
                        </span>
                      )}
                    </div>

                    <p className="text-[9.5px] text-slate-300 leading-relaxed">
                      Pilih mana-mana bilik operasi untuk menyertai ruang sembang dan perkongsian data kanvas perisikan.
                      {isEliteAgent && (
                        <span className="text-purple-300 font-bold block mt-1">
                          🛡️ Kebenaran Elite Agent: Anda bebas memasuki mana-mana bilik tanpa passcode dan boleh memadam mana-mana bilik operasi.
                        </span>
                      )}
                    </p>

                    {/* Search Input & Quick Create Action */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={roomSearchQuery}
                          onChange={(e) => setRoomSearchQuery(e.target.value)}
                          placeholder="Cari ID bilik atau pereka..."
                          className="w-full bg-slate-950 border border-indigo-500/40 focus:border-indigo-400 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-indigo-200 focus:outline-none uppercase font-mono"
                        />
                        <Search size={12} className="absolute left-2.5 top-2.5 text-indigo-400" />
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('room_settings')}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-slate-950 font-black text-[9.5px] uppercase rounded-lg transition-all shadow shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Cipta Bilik</span>
                      </button>
                    </div>
                  </div>

                  {/* Rooms List */}
                  <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                    {allOperationRooms.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs font-mono bg-slate-900/40 rounded-xl border border-slate-800">
                        <FolderKanban size={32} className="mx-auto text-slate-600 mb-2 opacity-60" />
                        <p>Tiada bilik operasi ditemui dalam akaun Firestore.</p>
                      </div>
                    ) : (
                      allOperationRooms
                        .filter((r) => {
                          if (!roomSearchQuery.trim()) return true;
                          const q = roomSearchQuery.toLowerCase();
                          return r.id.toLowerCase().includes(q) || (r.createdByEmail && r.createdByEmail.toLowerCase().includes(q));
                        })
                        .map((r) => {
                          const isActiveRoom = r.id === roomId;
                          const canEnterDirectly = isEliteAgent || !r.isEliteOnly;

                          return (
                            <div
                              key={r.id}
                              className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                isActiveRoom
                                  ? 'bg-gradient-to-r from-cyan-950/70 via-slate-900 to-indigo-950/70 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                                  : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900'
                              }`}
                            >
                              <div className="flex flex-col space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-xs text-white uppercase tracking-wider font-mono">
                                    {r.id}
                                  </span>

                                  {isActiveRoom && (
                                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[8px] font-black uppercase flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Sedang Digunakan
                                    </span>
                                  )}

                                  {r.isEliteOnly ? (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/50 text-[8px] font-bold uppercase flex items-center gap-1">
                                      <ShieldCheck size={9} className="text-purple-400" /> Elite Agent Sahaja 🛡️
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800 text-[8px] font-bold uppercase flex items-center gap-1">
                                      <Globe size={9} className="text-cyan-400" /> Akses Awam 🌐
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[9px] text-slate-400 flex-wrap">
                                  <span>Pereka: <strong className="text-slate-200">{getProtectedEmailDisplay(r.createdByEmail)}</strong></span>
                                  <span>•</span>
                                  <span>Tarikh: {new Date(r.createdAt).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  {isEliteAgent && r.passcode && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-300 font-bold">Passcode: {r.passcode}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                {!isActiveRoom ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSwitchRoom(r.id, r.isEliteOnly)}
                                    disabled={!canEnterDirectly}
                                    className={`px-3 py-1.5 rounded-lg font-black text-[9.5px] uppercase tracking-wider flex items-center gap-1 transition-all shadow cursor-pointer ${
                                      canEnterDirectly
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    }`}
                                  >
                                    <LogIn size={11} />
                                    <span>{isEliteAgent ? 'Masuk (Bypass Passcode)' : 'Masuki Bilik'}</span>
                                  </button>
                                ) : (
                                  <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[9.5px] font-bold uppercase flex items-center gap-1">
                                    <CheckCircle2 size={11} className="text-emerald-400" />
                                    <span>Aktif</span>
                                  </span>
                                )}

                                {/* Elite Agent Delete Room Button */}
                                {isEliteAgent && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRoom(r.id)}
                                    title={`Padam bilik ${r.id} secara kekal (Kelulusan Elite Agent)`}
                                    className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-400 rounded-lg text-[9.5px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 size={11} />
                                    <span>Padam</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CHAT INPUT FORM */}
            {activeTab === 'chat' && (
              <form 
                onSubmit={handleSendMessage}
                className="relative p-2.5 bg-slate-900/95 border-t border-cyan-500/30 flex flex-col gap-1.5"
              >
                {/* AUTOCOMPLETE MENTION DROPDOWN POPUP */}
                {showMentionMenu && (
                  <div className="absolute bottom-full left-2 right-2 mb-1.5 bg-slate-950/95 backdrop-blur border border-cyan-500/60 rounded-xl p-2 shadow-[0_0_25px_rgba(6,182,212,0.35)] z-50 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2">
                    <div className="px-2 py-1 text-[8.5px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                      <span className="flex items-center gap-1"><AtSign size={10} className="text-cyan-400" /> Seru Rakan Operatives atau AI Neural Analyst:</span>
                      <button 
                        type="button" 
                        onClick={() => setShowMentionMenu(false)}
                        className="text-slate-500 hover:text-slate-300 text-[8px]"
                      >
                        ✕ Tutup
                      </button>
                    </div>
                    <div className="space-y-1">
                      {mentionCandidates.length === 0 ? (
                        <div className="px-3 py-2 text-center text-[9.5px] text-slate-500 italic">
                          Tiada entiti sepadan dengan "@{mentionFilter}"
                        </div>
                      ) : (
                        mentionCandidates.map((cand) => (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => handleSelectMention(cand.name)}
                            className={`w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-left transition-all group/cand ${
                              cand.isAI
                                ? 'bg-gradient-to-r from-slate-900/90 to-slate-950 hover:bg-slate-900 border-amber-500/30 hover:border-amber-400'
                                : 'hover:bg-cyan-950/80 hover:border-cyan-500/50 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              {cand.isAI ? (
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500/30 to-purple-500/30 border border-amber-400/50 flex items-center justify-center text-sm shrink-0 shadow-sm">
                                  {cand.icon || '🤖'}
                                </div>
                              ) : cand.photoURL ? (
                                <img src={cand.photoURL} alt="" className="w-5 h-5 rounded-full object-cover border border-cyan-500/40 shrink-0" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 flex items-center justify-center font-bold text-[9px] shrink-0">
                                  {cand.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex flex-col truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-bold truncate ${cand.isAI ? 'text-amber-200 group-hover/cand:text-amber-100 font-mono' : 'text-white group-hover/cand:text-cyan-200'}`}>
                                    @{cand.name}
                                  </span>
                                  {cand.isAI && (
                                    <span className="text-[7px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-black uppercase font-mono border border-amber-500/40">
                                      {cand.badge}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[8px] text-slate-400 truncate">{cand.desc || cand.provider || cand.email || cand.role}</span>
                              </div>
                            </div>
                            <span className={`text-[7.5px] px-1.5 py-0.5 rounded uppercase font-mono font-bold shrink-0 border ${
                              cand.isAI 
                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40' 
                                : 'bg-slate-900 text-purple-300 border-slate-800'
                            }`}>
                              {cand.isAI ? 'NEURAL AI' : cand.role}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Urgent intel switch & compression indicator */}
                <div className="flex items-center justify-between text-[9px] px-1">
                  <button
                    type="button"
                    onClick={() => setIsUrgent(!isUrgent)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all font-bold ${
                      isUrgent 
                        ? 'bg-rose-600 text-white animate-pulse' 
                        : 'text-slate-500 hover:text-rose-400'
                    }`}
                  >
                    <AlertTriangle size={10} /> {isUrgent ? 'URGENT INTEL AKTIF' : 'Tandai Urgent'}
                  </button>

                  <span className="text-slate-500 text-[8px]">
                    {isUploadingToTelegram ? '✈️ Memuat naik ke Telegram Relay...' : isCompressingFile ? 'Mengompres gambar...' : 'Taip @ untuk seru rakan • [Enter] hantar'}
                  </span>
                </div>

                {/* ACTIVE NODE QUICK TARGET INTEL BAR */}
                {activeNode && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 border border-cyan-500/50 shadow flex items-center justify-between gap-2 text-[9.5px]">
                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                      <span className="text-cyan-400 font-bold uppercase text-[8px] shrink-0 font-mono">Sasaran Canvas:</span>
                      <span className="text-white font-black truncate max-w-[120px] sm:max-w-[200px]">{activeNode.label}</span>
                      <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono text-[7.5px] border border-cyan-500/40 uppercase shrink-0">
                        {activeNode.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={Boolean(isAIThinking)}
                        onClick={() => {
                          const query = `@ai tolong analisa nod "${activeNode.label}" (${activeNode.type}) atas canvas. Yang mana satukah akaun atau nod media sosial sasaran ini? Sila senaraikan semua profil dan pautan.`;
                          triggerAIAnalystResponse('@ai', query, currentUser?.displayName || 'Penyiasat', 'active_social');
                        }}
                        className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded text-[8px] uppercase tracking-wide flex items-center gap-1 transition-all shadow active:scale-95"
                        title="Tanya AI Analyst: Node Sosial Media Mana Satu?"
                      >
                        {activeQuickChip === 'active_social' ? (
                          <>
                            <Loader2 size={10} className="animate-spin text-slate-950" />
                            <span>⏳ Tunggu sebentar...</span>
                          </>
                        ) : (
                          <span>📱 Node Sosial Media Mana?</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenModal?.('verify_node_web', activeNode)}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold rounded text-[8px] flex items-center gap-1 transition-all"
                        title="Fact-check nod sasaran ini di Google Live Search"
                      >
                        <Globe size={10} />
                        <span className="hidden sm:inline">Fact-Check</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenModal?.('social_recon', activeNode)}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-bold rounded text-[8px] flex items-center gap-1 transition-all"
                        title="Buka modul Social Recon"
                      >
                        <span>⚡ Recon</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* AI SCANNING & THINKING GLOBAL HUD INDICATOR */}
                {isAIThinking && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-amber-950/90 via-slate-950 to-orange-950/90 border border-amber-500/80 text-amber-200 text-[10px] font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse">
                    <Loader2 size={14} className="animate-spin text-amber-400 shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-300 uppercase tracking-wide flex items-center gap-1 text-[9.5px]">
                          <span>⏳ Tunggu sebentar... AI sedang memproses & mengimbas nod</span>
                        </span>
                        <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                          {graphData?.nodes?.length || 0} NOD DI KANVAS
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-300 font-normal truncate mt-0.5 font-mono">
                        {isAIThinking} :: Mengimbas korelasi, mengekstrak sasaran & menyediakan pintasan...
                      </span>
                    </div>
                  </div>
                )}

                {/* ACTIVE REPLY PREVIEW BANNER */}
                {replyingTo && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 border-l-4 border-cyan-400 border border-cyan-500/40 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-1 shadow-md">
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <CornerUpLeft size={13} className="text-cyan-400 shrink-0" />
                      <div className="flex flex-col overflow-hidden text-[9.5px]">
                        <div className="flex items-center gap-1 font-bold text-cyan-300 truncate">
                          <span>Membalas kepada: <b>{replyingTo.senderName}</b></span>
                          {replyingTo.senderRole && (
                            <span className="text-[7.5px] text-purple-300 uppercase font-mono">({replyingTo.senderRole})</span>
                          )}
                        </div>
                        <span className="text-slate-400 truncate italic text-[8.5px]">
                          "{replyingTo.text || replyingTo.fileAttachment?.name || replyingTo.casePayload?.caseName || 'Lampiran fail'}"
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 hover:bg-rose-950/80 rounded text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                      title="Batal membalas mesej ini"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* SMART OSINT DISCOVERY CHIPS FOR LARGE CANVAS GRAPHS */}
                {graphData?.nodes && graphData.nodes.length > 0 && !replyingTo && !attachedFile && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[8px]">
                    {/* Quick Broadcast / Share Case Canvas Button */}
                    <button
                      type="button"
                      onClick={handleShareCurrentCaseToChat}
                      className="px-2.5 py-1 rounded-full border border-emerald-500/60 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.3)] active:scale-95"
                      title="Siarkan kes canvas semasa kepada semua ahli bilik pasukan"
                    >
                      <Share2 size={10} className="text-emerald-400" />
                      <span>Siarkan Kes Canvas ({graphData.nodes.length})</span>
                    </button>

                    <span className="text-[7.5px] font-bold text-slate-500 uppercase shrink-0 font-mono flex items-center gap-1">
                      <Sparkles size={9} className="text-amber-400" />
                      <span>PINTASAN AI:</span>
                    </span>

                    {/* Chip 1: Hub & Sasaran Utama */}
                    <button
                      type="button"
                      disabled={Boolean(isAIThinking)}
                      onClick={() => {
                        const query = `@ai tolong cari dan senaraikan nod-nod sasaran utama dan hub yang paling banyak sambungan atas canvas, beserta butiran ringkas dan pintasan fokus.`;
                        triggerAIAnalystResponse('@ai', query, currentUser?.displayName || 'Penyiasat', 'hubs');
                      }}
                      className={`px-2.5 py-1 rounded-full border font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
                        isAIThinking
                          ? 'opacity-60 cursor-not-allowed bg-slate-950 border-slate-700 text-slate-400'
                          : 'bg-amber-950/70 hover:bg-amber-900 border-amber-500/50 text-amber-200 shadow-sm'
                      }`}
                      title="Cari nod-nod utama yang mempunyai sambungan tertinggi di canvas"
                    >
                      {activeQuickChip === 'hubs' ? (
                        <>
                          <Loader2 size={10} className="animate-spin text-amber-400" />
                          <span className="text-amber-300">⏳ Tunggu sebentar...</span>
                        </>
                      ) : (
                        <span>🎯 Hub & Sasaran Utama</span>
                      )}
                    </button>

                    {/* Chip 2: Nod Media Sosial */}
                    <button
                      type="button"
                      disabled={Boolean(isAIThinking)}
                      onClick={() => {
                        const query = `@ai tolong imbas semua nod profil dan akaun media sosial atas canvas serta senaraikan pintasannya.`;
                        triggerAIAnalystResponse('@ai', query, currentUser?.displayName || 'Penyiasat', 'social');
                      }}
                      className={`px-2.5 py-1 rounded-full border font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
                        isAIThinking
                          ? 'opacity-60 cursor-not-allowed bg-slate-950 border-slate-700 text-slate-400'
                          : 'bg-cyan-950/70 hover:bg-cyan-900 border-cyan-500/50 text-cyan-200 shadow-sm'
                      }`}
                      title="Cari semua akaun dan nod media sosial atas canvas"
                    >
                      {activeQuickChip === 'social' ? (
                        <>
                          <Loader2 size={10} className="animate-spin text-cyan-400" />
                          <span className="text-cyan-300">⏳ Tunggu sebentar...</span>
                        </>
                      ) : (
                        <span>📱 Nod Media Sosial</span>
                      )}
                    </button>

                    {/* Chip 3: Nod Siber & IP */}
                    <button
                      type="button"
                      disabled={Boolean(isAIThinking)}
                      onClick={() => {
                        const query = `@ai tolong cari nod-nod berkaitan siber, alamat IP, domain dan pelayan atas canvas berserta butiran ringkas.`;
                        triggerAIAnalystResponse('@ai', query, currentUser?.displayName || 'Penyiasat', 'cyber');
                      }}
                      className={`px-2.5 py-1 rounded-full border font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
                        isAIThinking
                          ? 'opacity-60 cursor-not-allowed bg-slate-950 border-slate-700 text-slate-400'
                          : 'bg-sky-950/70 hover:bg-sky-900 border-sky-500/50 text-sky-200 shadow-sm'
                      }`}
                      title="Cari nod berkaitan IP, domain, dan infrastruktur"
                    >
                      {activeQuickChip === 'cyber' ? (
                        <>
                          <Loader2 size={10} className="animate-spin text-sky-400" />
                          <span className="text-sky-300">⏳ Tunggu sebentar...</span>
                        </>
                      ) : (
                        <span>🌐 Nod Siber & IP</span>
                      )}
                    </button>

                    {/* Chip 4: Nod Kewangan & Syarikat */}
                    <button
                      type="button"
                      disabled={Boolean(isAIThinking)}
                      onClick={() => {
                        const query = `@ai tolong cari entiti kewangan, akaun bank, syarikat atau transaksi yang dikesan atas canvas.`;
                        triggerAIAnalystResponse('@ai', query, currentUser?.displayName || 'Penyiasat', 'finance');
                      }}
                      className={`px-2.5 py-1 rounded-full border font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
                        isAIThinking
                          ? 'opacity-60 cursor-not-allowed bg-slate-950 border-slate-700 text-slate-400'
                          : 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-500/50 text-emerald-200 shadow-sm'
                      }`}
                      title="Cari entiti kewangan, bank, dan transaksi"
                    >
                      {activeQuickChip === 'finance' ? (
                        <>
                          <Loader2 size={10} className="animate-spin text-emerald-400" />
                          <span className="text-emerald-300">⏳ Tunggu sebentar...</span>
                        </>
                      ) : (
                        <span>🏦 Nod Kewangan & Syarikat</span>
                      )}
                    </button>
                  </div>
                )}

                {/* ATTACHED FILE PREVIEW BAR */}
                {attachedFile && (
                  <div className={`flex items-center justify-between p-2 rounded-lg border text-[10px] ${
                    attachedFile.isTelegramRelay
                      ? 'bg-sky-950/90 border-sky-400 shadow-md text-white'
                      : attachedFile.casePayload 
                        ? 'bg-cyan-950/90 border-cyan-400 shadow-md text-white'
                        : 'bg-slate-950/90 border-cyan-500/50 text-cyan-200'
                  }`}>
                    <div className="flex items-center gap-2 overflow-hidden">
                      {attachedFile.casePayload ? (
                        <div className="w-7 h-7 rounded bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shrink-0">
                          <FileCode size={14} className="text-cyan-300" />
                        </div>
                      ) : attachedFile.dataUrl && (attachedFile.dataUrl.startsWith('data:image') || attachedFile.type.startsWith('image/')) ? (
                        <img src={attachedFile.dataUrl} alt="" className="w-7 h-7 rounded object-cover border border-cyan-400/40 shrink-0" />
                      ) : (
                        <FileText size={18} className="text-cyan-400 shrink-0" />
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-bold truncate">{attachedFile.name}</span>
                        {attachedFile.isTelegramRelay ? (
                          <span className="text-[8px] text-sky-300 font-mono font-bold flex items-center gap-1">
                            <span>✈️ Telegram Cloud Relay Disambung</span>
                            <span>• {Math.round(attachedFile.size / 1024)} KB</span>
                          </span>
                        ) : attachedFile.casePayload ? (
                          <span className="text-[8px] text-emerald-300 font-mono font-bold">
                            ✓ Terbuka: {attachedFile.casePayload.totalEntities} Entiti • {attachedFile.casePayload.totalLinks || 0} Pautan
                          </span>
                        ) : (
                          <span className="text-[8px] text-emerald-400 font-semibold">
                            ✓ Auto-Compressed ({Math.round(attachedFile.size / 1024)} KB)
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="p-1 hover:bg-rose-950/80 rounded text-rose-400 hover:text-rose-300 font-bold ml-2 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <input
                    type="file"
                    ref={chatFileInputRef}
                    onChange={handleChatFileSelect}
                    accept="image/*,video/*,audio/*,.rhz,.json,.pdf,.txt,.mp3,.mp4,.wav,.m4a,.webm,.mov,.ogg"
                    className="hidden"
                  />
                  
                  {/* Attach file / image button */}
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isCompressingFile}
                    className="p-2 bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-200 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 shrink-0"
                    title="Lampirkan Gambar atau Fail Kes .RHZ"
                  >
                    <Paperclip size={14} />
                  </button>

                  {/* Quick Share Current Workspace Case Button */}
                  <button
                    type="button"
                    onClick={handleShareCurrentCaseToChat}
                    className="p-2 bg-slate-950 border border-emerald-500/40 hover:border-emerald-400 text-emerald-400 hover:text-emerald-200 rounded-lg transition-all flex items-center justify-center shrink-0"
                    title="Kongsi Kes Canvas Semasa (.RHZ) kepada Bilik Pasukan"
                  >
                    <Share2 size={14} />
                  </button>

                  {/* Quick Mention Trigger Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!showMentionMenu) {
                        setShowMentionMenu(true);
                        setMentionFilter('');
                        if (chatInputRef.current) {
                          if (!inputText.endsWith('@')) {
                            setInputText(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' @' : '@'));
                          }
                          chatInputRef.current.focus();
                        }
                      } else {
                        setShowMentionMenu(false);
                      }
                    }}
                    className={`p-2 bg-slate-950 border rounded-lg transition-all flex items-center justify-center shrink-0 ${
                      showMentionMenu 
                        ? 'border-cyan-400 text-cyan-200 bg-cyan-950/60 shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                        : 'border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-200'
                    }`}
                    title="Seru rakan penyiasat (@mention)"
                  >
                    <AtSign size={14} />
                  </button>

                  <input
                    ref={chatInputRef}
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        if (showMentionMenu) setShowMentionMenu(false);
                        else if (replyingTo) setReplyingTo(null);
                      }
                    }}
                    placeholder={
                      replyingTo 
                        ? `Balas kepada @${replyingTo.senderName}...` 
                        : (attachedFile ? (attachedFile.casePayload ? 'Keterangan kes forensik ini...' : 'Tambah keterangan fail...') : 'Mesej kepada penyiasat (taip @ untuk seru)...')
                    }
                    className="flex-1 bg-slate-950 border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-3 py-2 text-[11px] text-cyan-100 placeholder-slate-600 focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachedFile) || isCompressingFile}
                    className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center shadow shrink-0"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </>
    )}
  </div>

      {/* TACTICAL MEDIA FORENSICS & METADATA INSPECTOR MODAL */}
      <MediaInspectorModal
        isOpen={Boolean(inspectingMedia)}
        onClose={() => setInspectingMedia(null)}
        mediaSource={inspectingMedia}
        onPinToCanvas={(meta) => {
          handleAddFileToCanvas({
            name: meta.fileName,
            size: meta.fileSize,
            type: meta.mimeType,
            dataUrl: inspectingMedia?.url
          });
        }}
      />

      {/* EDIT OPERATIVE PROFILE MODAL */}
      {showProfileEditModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/50 rounded-xl p-5 shadow-[0_0_40px_rgba(6,182,212,0.25)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                <User size={16} className="text-cyan-400" /> Tetapkan Identiti Operatif
              </span>
              <button onClick={() => setShowProfileEditModal(false)} className="text-slate-400 hover:text-white text-xs font-bold p-1">✕</button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded border border-slate-800">
              Masukkan nama panggilan (Call-sign) dan alamat emel rasmi anda. Maklumat ini akan diselaras dalam bilik sembang dan dipaparkan kepada rakan sepasukan.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-200 mb-1">Nama / Call-sign Operatif:</label>
                <input
                  type="text"
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  placeholder="Contoh: Analyst Ahmad / Lead Sarah"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-200 mb-1">Alamat Emel Akaun Operasi:</label>
                <input
                  type="email"
                  value={editProfileEmail}
                  onChange={(e) => setEditProfileEmail(e.target.value)}
                  placeholder="Contoh: ahmad@agency.gov.my"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowProfileEditModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmedName = editProfileName.trim() || currentUser.displayName;
                  const trimmedEmail = editProfileEmail.trim() || 'guest@field-ops.local';
                  
                  localStorage.setItem('redhorizon_guest_name', trimmedName);
                  localStorage.setItem('redhorizon_guest_email', trimmedEmail);
                  
                  const updatedProfile: OperativeProfile = {
                    ...currentUser,
                    displayName: trimmedName,
                    email: trimmedEmail,
                    lastActive: Date.now()
                  };
                  
                  setCurrentUser(updatedProfile);
                  updatePresence(roomId, updatedProfile);
                  setShowProfileEditModal(false);
                  setAuthErrorNotice(null);
                }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-lg text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center gap-1.5"
              >
                <Check size={14} /> Simpan Profil Operatif
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION PURGE DIALOG MODAL */}
      {purgeDialog.open && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-rose-500/80 rounded-xl max-w-md w-full p-5 shadow-[0_0_30px_rgba(244,63,94,0.35)] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-400 font-black text-sm uppercase tracking-wide border-b border-rose-500/30 pb-2.5">
              <AlertOctagon size={20} className="text-rose-500 shrink-0 animate-bounce" />
              <span>{purgeDialog.title}</span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed bg-rose-950/20 p-3 rounded border border-rose-500/20">
              <p>{purgeDialog.description}</p>
              <p className="text-rose-300 font-bold">
                ⚠️ Amaran: Tindakan ini akan memadam data secara kekal dan tidak boleh dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isPurging}
                onClick={() => setPurgeDialog({ open: false, type: 'messages', title: '', description: '', warningLevel: 'high' })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold rounded text-xs transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPurging}
                onClick={confirmAndExecutePurge}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black rounded text-xs transition-all shadow-[0_0_15px_rgba(225,29,72,0.5)] flex items-center gap-1.5"
              >
                {isPurging ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Sedang Memadam...</span>
                  </>
                ) : (
                  <>
                    <Flame size={13} />
                    <span>Ya, Laksanakan Purge Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

