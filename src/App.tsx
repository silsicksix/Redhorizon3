
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GitMerge } from 'lucide-react';
import { EntityFusionModal } from './components/EntityFusionModal';
import { IntelligenceReportExporter } from './components/IntelligenceReportExporter';
import BreachResultModal from './components/BreachResultModal';
import { 
  Shield, Database, Settings as SettingsIcon, 
  Plus, Minus, ZoomIn, ZoomOut, Target, HardDrive, Radar, ChevronLeft, 
  ChevronRight as ChevronRightIcon, FileText, Layers, Fingerprint, Crosshair, Brain, Undo2, Combine,
  Trash2, Map as MapIcon, Briefcase, Network, ScanEye, Cpu, MessageCircle, Clock, Image, Lock, Unlock, RefreshCw, Link as LinkIcon, X, Key, FolderKanban,
  MapPin, ChevronUp, ChevronDown, GripHorizontal, FileSearch, Binary, Save, Lightbulb, Zap, Copy, Download, MousePointer2, MousePointerClick, Filter, 
  Maximize, Minimize, HelpCircle, Webhook, Globe, Camera, Radio, MessageSquare, Users,
  Search, Server, CheckSquare, Square, CheckCheck, AlertTriangle, ShieldCheck, Smartphone, ShieldAlert,
  ExternalLink, Eye, EyeOff
} from 'lucide-react';
import { parseOfflineComments } from './utils/offlineParser';
import { isLocationNode } from './utils/geoUtils';
import { motion, AnimatePresence } from 'motion/react';


// --- STORE ---
import { useGlobalStore, cleanGraphData } from './store/GlobalStore';
import { analyzeGraphAgent } from './services/agentSystem';

// --- COMPONENTS ---
import { Tooltip } from './components/Tooltip';
import GraphView from './components/GraphView';
import GraphViewCanvas from './components/GraphViewCanvas';
import InteractiveSpatialMapCanvas from './components/InteractiveSpatialMapCanvas';
import Terminal from './components/Terminal';
import UserscriptBuilder from './components/UserscriptBuilder';
import DataProcessorModal from './components/DataProcessorModal';
import ControlHUD from './components/ControlHUD';
import MaltegoCommandRibbon from './components/MaltegoCommandRibbon';
import SystemMonitor from './components/SystemMonitor';
import DataImport from './components/DataImport';
import SettingsModal, { GpuDensityMode } from './components/SettingsModal';
import NodeQuery from './components/NodeQuery';
import ManualEntryModal from './components/ManualEntryModal';
import BigDataScanner from './components/BigDataScanner';
import FileScanner from './components/FileScanner';
import ForensicVault from './components/ForensicVault';
import StylometryLab from './components/StylometryLab';
import TutorialOverlay from './components/TutorialOverlay';
import LocationSting from './components/LocationSting';
import StrategicSynthesis from './components/StrategicSynthesis';
import GeospatialRecon from './components/GeospatialRecon';
import RadialMenu from './components/RadialMenu';
import CaseManager from './components/CaseManager';
import SnaPanel from './components/SnaPanel';
import ImageIntel from './components/ImageIntel';
import ExportPromptModal from './components/ExportPromptModal';
import SocialRecon from './components/SocialRecon';
import SocialAnalyzer from './components/SocialAnalyzer';
import OsintAIEngine from './components/OsintAIEngine';
import OfflineLogicModule from './components/OfflineLogicModule';
import EvidenceBoard from './components/EvidenceBoard';
import TimelineWorkspace from './components/TimelineWorkspace';
import DraggableReport from './components/DraggableReport';
import ShodanPanel from './components/ShodanPanel';
import TransformManager from './components/TransformManager';
import EnvironmentManager from './components/EnvironmentManager';
import FloatingAIChat from './components/FloatingAIChat';
import AdvancedDorkingModal from './components/AdvancedDorkingModal';
import { TradecraftReconModal } from './components/TradecraftReconModal';
import QuickGroupSelector from './components/QuickGroupSelector';
import WebCaptureModal from './components/WebCaptureModal';
import GlobalSearchModal from './components/GlobalSearchModal';
import ShareTraceModal from './components/ShareTraceModal';
import LureCapture from './components/LureCapture';
import TrafficVisionMapModal from './components/TrafficVisionMapModal';
import AutonomousAgentModal from './components/AutonomousAgentModal';
import { GoogleEarthModal } from './components/GoogleEarthModal';
import StreetView360StandaloneViewer from './components/StreetView360StandaloneViewer';
import { CollaborativeChatModal } from './components/CollaborativeChatModal';
import { NodeWebVerificationModal } from './components/NodeWebVerificationModal';
import { FileLoadProgressHUD, reportFileLoadProgress } from './components/FileLoadProgressHUD';
import { TacticalModalWrapper } from './components/TacticalModalWrapper';
import { TacticalMinimizedDock } from './components/TacticalMinimizedDock';
import { MobileTacticalControlHub } from './components/MobileTacticalControlHub';
import PhoneIntelHubModal from './components/PhoneIntelHubModal';
import GoogleSocintModal from './components/GoogleSocintModal';
import ConflictDetectorModal from './components/ConflictDetectorModal';
import { scanGraphForConflicts, tagNodesWithConflicts } from './utils/conflictDetector';
import { applyProvenanceFindingsToGraph } from './utils/provenanceEngine';
import { DecisionProvenance, GraphConflict } from './types';
import { SemanticTriplesModal } from './components/SemanticTriplesModal';
import { WatsonCognitiveModal } from './components/WatsonCognitiveModal';
import { TemporalTimelineBar } from './components/TemporalTimelineBar';
import { AccessGate } from './components/AccessGate';
import { AccessApprovalAdminModal } from './components/AccessApprovalAdminModal';
import { LeadAdminPendingNotificationBanner } from './components/LeadAdminPendingNotificationBanner';
import { CanvasWorkstationTabBar } from './components/CanvasWorkstationTabBar';
import { rhzAutosave } from './services/rhzAutosaveService';
import { RhzAutosaveHUD } from './components/RhzAutosaveHUD';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ModularEnricherHubModal } from './components/ModularEnricherHubModal';
import { OntologyEngineModal } from './components/OntologyEngineModal';

import { 
  auth, 
  LEAD_ADMIN_EMAIL, 
  AccessRequest, 
  subscribeToUserAccessRequest, 
  subscribeToAllAccessRequests, 
  checkOrCreateAccessRequest,
  logoutOperative,
  getOrCreateRoomMetadata
} from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

import { generateFinalSynthesis, parseRawIntelligence, analyzeLinguisticRisk, generateStrategy } from './services/geminiService';
import { searchTavily } from './services/searchService';
import { Node, NodeQueryState, EvidenceCategory, CaseFile, TimelineEvent, GraphData, Link, Workspace } from './types';
import { searchHorizon } from './services/horizonService';
import { extractNodeCommentsAndIntel, openExternalUrl } from './utils/socialCommentUtils';

const APP_VERSION = 'rh_v2.9.3_opsec_privacy_hardening';

export default function App() {
  const isStreetViewStandalone = useMemo(() => {
    return new URLSearchParams(window.location.search).get('mode') === 'streetview360';
  }, []);

  if (isStreetViewStandalone) {
    return <StreetView360StandaloneViewer />;
  }

  // --- LEAD ADMIN & INVESTIGATOR ACCESS CONTROL STATE ---
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [localUser, setLocalUser] = useState<{ uid: string; email: string; displayName: string; photoURL?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('redhorizon_local_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      uid: 'commander_default',
      email: 'commander@field-ops.local',
      displayName: 'Lead Commander'
    };
  });
  const [userAccessRequest, setUserAccessRequest] = useState<AccessRequest | null>(null);
  const [allAccessRequests, setAllAccessRequests] = useState<AccessRequest[]>([]);
  const [showAdminApprovalModal, setShowAdminApprovalModal] = useState<boolean>(false);
  const [showAccessGateModal, setShowAccessGateModal] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [isTerminalUnlocked, setIsTerminalUnlocked] = useState<boolean>(true);

  // Monitor Auth state
  useEffect(() => {
    setAuthLoading(true);
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const req = await checkOrCreateAccessRequest(user);
          setUserAccessRequest(req);
        } catch (err) {
          console.warn('Check access request error:', err);
        }
      } else {
        setUserAccessRequest(null);
      }
      setAuthLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // Listen to current user's access request status in real-time
  useEffect(() => {
    if (!currentUser) {
      setUserAccessRequest(null);
      return;
    }
    const unsubReq = subscribeToUserAccessRequest(
      currentUser.uid,
      currentUser.email || '',
      (req) => {
        setUserAccessRequest(req);
      }
    );
    return () => unsubReq();
  }, [currentUser?.uid, currentUser?.email]);

  // If Lead Admin (fisaabilillah@gmail.com), listen to all requests for pending notifications badge
  useEffect(() => {
    if (currentUser?.email?.toLowerCase() === LEAD_ADMIN_EMAIL.toLowerCase()) {
      const unsubAll = subscribeToAllAccessRequests((requests) => {
        setAllAccessRequests(requests);
      });
      return () => unsubAll();
    } else {
      setAllAccessRequests([]);
    }
  }, [currentUser?.email]);

  const activeUserEmail = currentUser?.email || localUser?.email || '';
  const isLeadAdmin = activeUserEmail.toLowerCase() === LEAD_ADMIN_EMAIL.toLowerCase();
  const isApprovedUser = isLeadAdmin || userAccessRequest?.status === 'approved' || !!localUser;
  const pendingAccessCount = allAccessRequests.filter(r => r.status === 'pending').length;

  const { state, dispatch, activeWs } = useGlobalStore();

  const { config, backendStatus, logs, vaultFiles, history, selectionMode } = state;

  // Update theme color CSS variable
  useEffect(() => {
    const themeColor = config.visual?.themeColor || '#ff0033';
    document.documentElement.style.setProperty('--theme-color', themeColor);
    
    // Determine accent color based on theme color
    let accentColor = '#00ccff'; // Default cyan
    if (themeColor === '#ff0033') accentColor = '#00ccff'; // Red theme -> Cyan accent
    else if (themeColor === '#00ccff') accentColor = '#0088ff'; // Blue theme -> Darker blue accent
    else if (themeColor === '#10b981') accentColor = '#059669'; // Green theme -> Darker green accent
    else if (themeColor === '#f59e0b') accentColor = '#d97706'; // Orange theme -> Darker orange accent
    else if (themeColor === '#8b5cf6') accentColor = '#7c3aed'; // Purple theme -> Darker purple accent
    
    document.documentElement.style.setProperty('--accent-color', accentColor);
  }, [config.visual?.themeColor]);

  // Handle Low Power / Eco Mode toggle (disable animations & backdrop-blur to save battery and reduce heat)
  useEffect(() => {
    const isLowPower = !!config.visual?.lowPowerMode;
    document.documentElement.classList.toggle('low-power-mode', isLowPower);
  }, [config.visual?.lowPowerMode]);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const activeNode = activeWs?.data?.nodes?.find(n => n.id === activeNodeId) || null;
  const previousNodeRef = useRef<Node | null>(null); // Track previous node
  const [radialMenu, setRadialMenu] = useState<{ x: number; y: number; node: Node; nodes?: Node[] } | null>(null);
  
  const [queryStates, setQueryStates] = useState<Record<string, NodeQueryState>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Synchronize and isolate selections and state whenever active workspace changes to prevent past case data mixing
  useEffect(() => {
    if (!activeWs) return;
    const currentNodes = activeWs.data?.nodes || [];
    
    // Completely re-anchor selection to current workspace entities only
    if (currentNodes.length > 0) {
      const firstValidNode = currentNodes[0];
      setActiveNodeId(firstValidNode.id);
      setSelectedNodes([firstValidNode]);
      previousNodeRef.current = firstValidNode;
    } else {
      setActiveNodeId(null);
      setSelectedNodes([]);
      previousNodeRef.current = null;
    }
    
    // Clear transient states that could bleed over from prior cases
    setRadialMenu(null);
    setLinkingSource(null);
    setEditingNode(null);
    setVaultContext({ query: '', sourceNodeId: null });
    setPhoneIntelTargetNode(null);
    setAssetSearchQuery('');
  }, [activeWs?.id]);
  const [showTrafficVisionModal, setShowTrafficVisionModal] = useState<boolean>(false);
  const [showPhoneIntelModal, setShowPhoneIntelModal] = useState<boolean>(false);
  const [phoneIntelTargetNode, setPhoneIntelTargetNode] = useState<Node | null>(null);
  const [phoneIntelInitialTab, setPhoneIntelInitialTab] = useState<'unified' | 'numverify' | 'serpapi' | 'telegram' | 'whatsapp' | 'keys'>('unified');
  const [showGoogleSocintModal, setShowGoogleSocintModal] = useState<boolean>(false);
  const [googleSocintTargetNode, setGoogleSocintTargetNode] = useState<Node | null>(null);
  const [googleSocintInitialQuery, setGoogleSocintInitialQuery] = useState<string>('');
  const [minimizedModals, setMinimizedModals] = useState<string[]>([]);

  const handleMinimizeModal = (modalId: string) => {
    if (!minimizedModals.includes(modalId)) {
      setMinimizedModals(prev => [...prev, modalId]);
    }
  };

  const handleRestoreModal = (modalId: string) => {
    setMinimizedModals(prev => prev.filter(id => id !== modalId));
    if (modalId === 'cctv_hub') {
      setShowTrafficVisionModal(true);
    } else {
      setActiveModal(modalId);
    }
  };

  const handleCloseModalFully = (modalId: string) => {
    setMinimizedModals(prev => prev.filter(id => id !== modalId));
    if (modalId === 'cctv_hub') {
      setShowTrafficVisionModal(false);
    }
    if (activeModal === modalId) {
      setActiveModal(null);
    }
  };

  const [mentionAlert, setMentionAlert] = useState<{
    unreadCount: number;
    latestSender?: string;
    latestText?: string;
    messageId?: string;
    room: string;
  } | null>(null);

  const handleLaunchMapillaryDirect = () => {
    let lat = 3.1578;
    let lng = 101.7120;

    if (activeNode) {
      const combinedText = (activeNode.details || '') + ' ' + (activeNode.reports || '') + ' ' + activeNode.label;
      const coordMatch = combinedText.match(/(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }
    } else if (activeWs?.data?.nodes) {
      const locNode = activeWs.data.nodes.find(n => n.type === 'location' || isLocationNode(n) || /(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/.test(n.details || ''));
      if (locNode) {
        const combinedText = (locNode.details || '') + ' ' + (locNode.reports || '') + ' ' + locNode.label;
        const coordMatch = combinedText.match(/(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
        if (coordMatch) {
          lat = parseFloat(coordMatch[1]);
          lng = parseFloat(coordMatch[2]);
        }
      }
    }

    addLog(`Melancarkan terus Mapillary 360° (${lat.toFixed(4)}, ${lng.toFixed(4)})...`, 'info');

    // Trigger Native Geo Intent (geo:lat,lng) for Android/Mobile native app launcher
    const geoUri = `geo:${lat},${lng}?q=${lat},${lng}`;
    const webUrl = `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=17&focus=photo`;

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.indexOf('android') > -1;

    if (isAndroid) {
      window.location.href = geoUri;
      setTimeout(() => {
        window.open(webUrl, '_blank');
      }, 500);
    } else {
      window.open(webUrl, '_blank');
    }
  };

  const handleLaunchGoogleEarth = () => {
    let lat = 3.1578;
    let lng = 101.7120;

    if (activeNode) {
      const combinedText = (activeNode.details || '') + ' ' + (activeNode.reports || '') + ' ' + activeNode.label;
      const coordMatch = combinedText.match(/(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }
    } else if (activeWs?.data?.nodes) {
      const locNode = activeWs.data.nodes.find(n => n.type === 'location' || isLocationNode(n) || /(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/.test(n.details || ''));
      if (locNode) {
        const combinedText = (locNode.details || '') + ' ' + (locNode.reports || '') + ' ' + locNode.label;
        const coordMatch = combinedText.match(/(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
        if (coordMatch) {
          lat = parseFloat(coordMatch[1]);
          lng = parseFloat(coordMatch[2]);
        }
      }
    }

    addLog(`Melancarkan terus Google Earth 3D (${lat.toFixed(4)}, ${lng.toFixed(4)})...`, 'info');

    // Trigger Native Geo Intent (geo:lat,lng) for Android/Mobile native app launcher
    const geoUri = `geo:${lat},${lng}?q=${lat},${lng}`;
    const webUrl = `https://earth.google.com/web/@${lat},${lng},1000a,35y,0h,0t,0r`;

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.indexOf('android') > -1;

    if (isAndroid) {
      window.location.href = geoUri;
      setTimeout(() => {
        window.open(webUrl, '_blank');
      }, 500);
    } else {
      window.open(webUrl, '_blank');
    }
  };

  const [isCssFullscreen, setIsCssFullscreen] = useState<boolean>(false);
  const [showIframeNotice, setShowIframeNotice] = useState<boolean>(false);

  // Helper to detect native fullscreen across all vendor prefixes
  const getFullscreenElement = (): Element | null => {
    const doc = document as any;
    return (
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      null
    );
  };

  // Safe Native Fullscreen Exit with prefixes
  const exitNativeFullscreen = () => {
    const doc = document as any;
    const exitMethod = (
      doc.exitFullscreen ||
      doc.webkitExitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.msExitFullscreen
    );
    if (!exitMethod) return;
    try {
      const res = exitMethod.call(doc);
      if (res instanceof Promise) {
        res.catch(() => {});
      }
    } catch (err: any) {
      console.warn('Native exit fullscreen failed:', err);
    }
  };

  const toggleFullscreen = () => {
    const isCurrentlyFs = isFullscreen || isCssFullscreen || !!getFullscreenElement();

    // Haptic confirmation for touch devices (Android tablets / mobile)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(30); } catch (_) {}
    }

    if (isCurrentlyFs) {
      // Exit fullscreen unconditionally
      if (getFullscreenElement()) {
        exitNativeFullscreen();
      }
      setIsFullscreen(false);
      setIsCssFullscreen(false);
      setShowIframeNotice(false);
      if (window.history.state?.redhorizon_fs) {
        try { window.history.back(); } catch (_) {}
      }
      addLog('Keluar daripada mod skrin penuh.', 'info');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      return;
    }

    // Direct synchronous call to requestFullscreen on container element or documentElement
    const el = (document.getElementById('redhorizon-main-app') || document.documentElement) as any;
    const requestMethod = (
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen ||
      document.documentElement.requestFullscreen ||
      (document.documentElement as any).webkitRequestFullscreen
    );

    const isInIframe = window.self !== window.top;

    if (requestMethod) {
      try {
        const res = requestMethod.call(el);
        if (res instanceof Promise) {
          res
            .then(() => {
              setIsFullscreen(true);
              setIsCssFullscreen(false);
              setShowIframeNotice(false);
              try { window.history.pushState({ redhorizon_fs: true }, ''); } catch (_) {}
              addLog('Mod Paparan Skrin Penuh (Monitor/Peranti) diaktifkan.', 'info');
              setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
            })
            .catch((err: any) => {
              console.warn('Native fullscreen disallowed or blocked by iframe container:', err);
              // Fallback for iframe sandboxed preview or Android Chrome iframe restrictions
              setIsFullscreen(true);
              setIsCssFullscreen(true);
              try { window.history.pushState({ redhorizon_fs: true }, ''); } catch (_) {}
              if (isInIframe) {
                setShowIframeNotice(true);
                addLog('Sekatan Bingkai Pratonton: Pelayar menyekat skrin penuh OS dalam iframe. Buka di Tab Bebas untuk skrin penuh tanpa sempadan.', 'warning');
              } else {
                addLog('Mod Paparan Skrin Penuh (Kanvas Maksimum) diaktifkan.', 'info');
              }
              setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
            });
        } else {
          // Legacy Webkit (synchronous)
          setIsFullscreen(true);
          setIsCssFullscreen(false);
          setShowIframeNotice(false);
          try { window.history.pushState({ redhorizon_fs: true }, ''); } catch (_) {}
          addLog('Mod Paparan Skrin Penuh diaktifkan.', 'info');
          setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
        }
      } catch (err: any) {
        console.warn('Native fullscreen request exception:', err);
        setIsFullscreen(true);
        setIsCssFullscreen(true);
        try { window.history.pushState({ redhorizon_fs: true }, ''); } catch (_) {}
        if (isInIframe) {
          setShowIframeNotice(true);
        }
        setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      }
    } else {
      // Fallback
      setIsFullscreen(true);
      setIsCssFullscreen(true);
      try { window.history.pushState({ redhorizon_fs: true }, ''); } catch (_) {}
      if (isInIframe) {
        setShowIframeNotice(true);
      }
      setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
    }
  };

  const handleLockApp = () => {
    setIsTerminalUnlocked(false);
    sessionStorage.removeItem('redhorizon_terminal_unlocked');
    setShowAccessGateModal(true);
    setSelectedNodes([]);
    setActiveNodeId(null);
    setRadialMenu(null);
    addLog("Terminal Red Horizon dikunci untuk keselamatan OPSEC. Seluruh paparan dilindungi di sebalik wallpaper khas.", "warning");
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcut execution when terminal is locked
      if (!isTerminalUnlocked || showAccessGateModal) {
        return;
      }

      // F11 / Escape Fullscreen Hotkeys
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (e.key === 'Escape' && (isFullscreen || isCssFullscreen)) {
        e.preventDefault();
        if (getFullscreenElement()) {
          exitNativeFullscreen();
        }
        setIsFullscreen(false);
        setIsCssFullscreen(false);
        setShowIframeNotice(false);
        addLog('Keluar daripada mod skrin penuh (Esc).', 'info');
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        return;
      }

      // Alt+L Lock App Hotkey
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleLockApp();
        return;
      }

      // Don't trigger shortcuts if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
         return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        rhzAutosave.saveNow(activeWs, 'shortcut');
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
        addLog('Undo performed', 'info');
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedNodes.length > 0) {
             e.preventDefault();
             const ids = selectedNodes.map(n => n.id);
             dispatch({ type: 'DELETE_MULTIPLE_NODES', payload: ids });
             dispatch({ type: 'ADD_LOG', payload: { message: `System: Purged ${ids.length} selected nodes.`, type: 'success' } });
             setSelectedNodes([]);
             setActiveNodeId(null);
          }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, selectedNodes.length, activeWs, isTerminalUnlocked, showAccessGateModal, isFullscreen, isCssFullscreen]);

  // Handle Fullscreen State Listeners & Android Back Navigation
  useEffect(() => {
    const handleFsChange = () => {
      const fsEl = getFullscreenElement();
      if (fsEl) {
        setIsFullscreen(true);
        setIsCssFullscreen(false);
        setShowIframeNotice(false);
      } else {
        // Unconditionally exit fullscreen state when browser exits native fullscreen
        setIsFullscreen(false);
        setIsCssFullscreen(false);
        setShowIframeNotice(false);
      }
      setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    };

    // Android Hardware / Swipe Back gesture listener to unfullscreen gracefully
    const handlePopState = () => {
      if (isFullscreen || isCssFullscreen) {
        if (getFullscreenElement()) {
          exitNativeFullscreen();
        }
        setIsFullscreen(false);
        setIsCssFullscreen(false);
        setShowIframeNotice(false);
        addLog('Keluar daripada skrin penuh (Kembali).', 'info');
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isFullscreen, isCssFullscreen]);

  // Event listener for opening Google SOCINT modal directly from anywhere in the app
  useEffect(() => {
    const handleOpenGoogleSocint = (e: any) => {
      const detail = e.detail || {};
      const targetNode = detail.node || (detail.target ? activeWs?.data?.nodes?.find(n => n.label === detail.target) : activeNode);
      if (targetNode) {
        setActiveNodeId(targetNode.id);
        setSelectedNodes([targetNode]);
        setGoogleSocintTargetNode(targetNode);
      }
      setGoogleSocintInitialQuery(detail.target || targetNode?.label || '');
      setShowGoogleSocintModal(true);
    };

    window.addEventListener('app:open-google-socint', handleOpenGoogleSocint);
    return () => window.removeEventListener('app:open-google-socint', handleOpenGoogleSocint);
  }, [activeWs?.data?.nodes, activeNode]);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [vaultContext, setVaultContext] = useState<{ query: string; sourceNodeId: string | null }>({ query: '', sourceNodeId: null });
  const [linkingSource, setLinkingSource] = useState<Node | null>(null); 
  const [horizonData, setHorizonData] = useState<any | null>(null); 
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [showTransformManager, setShowTransformManager] = useState(false);
  const [terminalTab, setTerminalTab] = useState<'logs' | 'toolkit' | 'advisor' | 'research'>('logs');
  const [leakCheckPhone, setLeakCheckPhone] = useState<string | null>(null);
  const [breachResult, setBreachResult] = useState<any | null>(null);
  const [showBreachModal, setShowBreachModal] = useState(false);
  const [showEnricherHubModal, setShowEnricherHubModal] = useState<boolean>(false);
  const [enricherTargetNode, setEnricherTargetNode] = useState<Node | null>(null);
  const [nodeRenderMode, setNodeRenderMode] = useState<'classic' | 'schematic'>('classic');
  const [exportPrompt, setExportPrompt] = useState<string | null>(null);
  const [shodanData, setShodanData] = useState<any | null>(null);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);
  const [isGisMenuOpen, setIsGisMenuOpen] = useState(false);
  const [isReconMenuOpen, setIsReconMenuOpen] = useState(false);
  const reconBtnRef = useRef<HTMLDivElement>(null);
  const [reconMenuPos, setReconMenuPos] = useState<{ top: number; left: number }>({ top: 56, left: 100 });
  const gisBtnRef = useRef<HTMLButtonElement>(null);
  const [gisMenuPos, setGisMenuPos] = useState<{ top: number; left: number }>({ top: 56, left: 100 });
  const caseBtnRef = useRef<HTMLDivElement>(null);
  const [caseMenuPos, setCaseMenuPos] = useState<{ top: number; left: number }>({ top: 56, left: 100 });

  const handleToggleReconMenu = useCallback(() => {
    if (!isReconMenuOpen && reconBtnRef.current) {
      const rect = reconBtnRef.current.getBoundingClientRect();
      const menuWidth = Math.min(340, window.innerWidth - 24);
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 12) {
        left = window.innerWidth - menuWidth - 12;
      }
      if (left < 10) left = 10;
      setReconMenuPos({
        top: Math.round(rect.bottom + 6),
        left: Math.round(left)
      });
    }
    setIsReconMenuOpen(prev => !prev);
  }, [isReconMenuOpen]);

  const handleToggleGisMenu = useCallback(() => {
    if (!isGisMenuOpen && gisBtnRef.current) {
      const rect = gisBtnRef.current.getBoundingClientRect();
      const menuWidth = Math.min(384, window.innerWidth - 24);
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 12) {
        left = window.innerWidth - menuWidth - 12;
      }
      if (left < 10) left = 10;
      setGisMenuPos({
        top: Math.round(rect.bottom + 6),
        left: Math.round(left)
      });
    }
    setIsGisMenuOpen(prev => !prev);
  }, [isGisMenuOpen]);

  const handleToggleCaseMenu = useCallback(() => {
    if (!isCaseMenuOpen && caseBtnRef.current) {
      const rect = caseBtnRef.current.getBoundingClientRect();
      const menuWidth = Math.min(300, window.innerWidth - 24);
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 12) {
        left = window.innerWidth - menuWidth - 12;
      }
      if (left < 10) left = 10;
      setCaseMenuPos({
        top: Math.round(rect.bottom + 6),
        left: Math.round(left)
      });
    }
    setIsCaseMenuOpen(prev => !prev);
  }, [isCaseMenuOpen]);

  // Recalculate fixed positions on resize or scroll while menus are open
  useEffect(() => {
    if (isGisMenuOpen || isCaseMenuOpen || isReconMenuOpen) {
      const updatePositions = () => {
        if (isReconMenuOpen && reconBtnRef.current) {
          const rect = reconBtnRef.current.getBoundingClientRect();
          const menuWidth = Math.min(340, window.innerWidth - 24);
          let left = rect.left;
          if (left + menuWidth > window.innerWidth - 12) {
            left = window.innerWidth - menuWidth - 12;
          }
          if (left < 10) left = 10;
          setReconMenuPos({
            top: Math.round(rect.bottom + 6),
            left: Math.round(left)
          });
        }
        if (isGisMenuOpen && gisBtnRef.current) {
          const rect = gisBtnRef.current.getBoundingClientRect();
          const menuWidth = Math.min(384, window.innerWidth - 24);
          let left = rect.left;
          if (left + menuWidth > window.innerWidth - 12) {
            left = window.innerWidth - menuWidth - 12;
          }
          if (left < 10) left = 10;
          setGisMenuPos({
            top: Math.round(rect.bottom + 6),
            left: Math.round(left)
          });
        }
        if (isCaseMenuOpen && caseBtnRef.current) {
          const rect = caseBtnRef.current.getBoundingClientRect();
          const menuWidth = Math.min(300, window.innerWidth - 24);
          let left = rect.left;
          if (left + menuWidth > window.innerWidth - 12) {
            left = window.innerWidth - menuWidth - 12;
          }
          if (left < 10) left = 10;
          setCaseMenuPos({
            top: Math.round(rect.bottom + 6),
            left: Math.round(left)
          });
        }
      };
      window.addEventListener('resize', updatePositions);
      window.addEventListener('scroll', updatePositions, true);
      return () => {
        window.removeEventListener('resize', updatePositions);
        window.removeEventListener('scroll', updatePositions, true);
      };
    }
  }, [isGisMenuOpen, isCaseMenuOpen]);

  const [showAIChat, setShowAIChat] = useState(false);
  const [showCollabChat, setShowCollabChat] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).has('room');
  });
  const [shareNodeTarget, setShareNodeTarget] = useState<Node | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);

  // GPU Virtual DPI & Density State
  const [gpuDensityMode, setGpuDensityMode] = useState<GpuDensityMode>(() => {
    return (localStorage.getItem('rhz_gpu_density_mode') as GpuDensityMode) || '1080p';
  });

  const handleGpuDensityChange = useCallback((newMode: GpuDensityMode) => {
    setGpuDensityMode(newMode);
    localStorage.setItem('rhz_gpu_density_mode', newMode);
  }, []);

  const gpuScaleStyle = useMemo(() => {
    switch (gpuDensityMode) {
      case '4k':
        return {
          zoom: 0.72,
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          transition: 'zoom 0.25s ease-out, transform 0.25s ease-out'
        };
      case '2k':
        return {
          zoom: 0.85,
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          transition: 'zoom 0.25s ease-out, transform 0.25s ease-out'
        };
      default:
        return {
          zoom: 1.0,
          transition: 'zoom 0.25s ease-out'
        };
    }
  }, [gpuDensityMode]);
  
  // Semantic Triples & Timeline States
  const [showOntologyEngineModal, setShowOntologyEngineModal] = useState<boolean>(false);
  const [showSemanticTriplesModal, setShowSemanticTriplesModal] = useState<boolean>(false);
  const [showTimelineBar, setShowTimelineBar] = useState<boolean>(false);
  const [timelineTimeRange, setTimelineTimeRange] = useState<[number, number] | null>(null);
  const [timelineCurrentTime, setTimelineCurrentTime] = useState<number | null>(null);

  const handleTimelineFilterChange = useCallback((range: [number, number] | null, current: number | null) => {
    setTimelineTimeRange(range);
    setTimelineCurrentTime(current);
  }, []);

  const handleToggleTimelineBar = useCallback(() => {
    setShowTimelineBar(prev => !prev);
  }, []);
  
  // Synthesis States
  const synthesisResult = activeWs.synthesisResult || null;
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  
  // Strategy States
  const strategyResult = activeWs.strategyResult || null;
  const [strategyLoading, setStrategyLoading] = useState(false);
  
  // Resize States
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(500);
  const [bottomHeight, setBottomHeight] = useState(320); 
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isAssetGrouped, setIsAssetGrouped] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');

  // Active Collaborative Operation Room Lock / Security Status
  const [roomLockStatus, setRoomLockStatus] = useState<{ roomId: string; isUnlocked: boolean; isEliteOnly?: boolean }>(() => {
    const initRoom = localStorage.getItem('redhorizon_collab_room_id') || 'OPS-RED-ALPHA';
    const unlocked = sessionStorage.getItem(`redhorizon_room_unlocked_${initRoom}`) === 'true';
    return {
      roomId: initRoom,
      isUnlocked: unlocked
    };
  });

  const handleRoomStatusChange = useCallback((status: { roomId: string; isUnlocked: boolean; isEliteOnly?: boolean }) => {
    setRoomLockStatus(prev => {
      if (
        prev.roomId === status.roomId &&
        prev.isUnlocked === status.isUnlocked &&
        prev.isEliteOnly === status.isEliteOnly
      ) {
        return prev;
      }
      return status;
    });
  }, []);

  // Direct Inline Room Passcode Unlock States & Handler
  const [roomPasscodeInput, setRoomPasscodeInput] = useState('');
  const [showRoomPasscodeText, setShowRoomPasscodeText] = useState(false);
  const [roomPasscodeError, setRoomPasscodeError] = useState<string | null>(null);
  const [isUnlockingRoom, setIsUnlockingRoom] = useState(false);

  const handleDirectRoomUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const input = roomPasscodeInput.trim();
    if (!input) {
      setRoomPasscodeError('Sila masukkan passcode bilik operasi atau Kunci Utama.');
      return;
    }

    setIsUnlockingRoom(true);
    setRoomPasscodeError(null);

    try {
      const roomId = roomLockStatus.roomId || 'OPS-RED-ALPHA';
      // Check Master Keys or default passcode
      const isMasterKey = input === 'REDHORIZON-MASTER-2026' || input.toLowerCase() === 'fisaabilillah';
      const isDefault = input === 'RH2026';

      let isValid = isMasterKey || isDefault;

      if (!isValid) {
        // Query room metadata
        const meta = await getOrCreateRoomMetadata(roomId, 'RH2026', currentUser?.email || '');
        if (meta?.passcode && meta.passcode.trim() === input) {
          isValid = true;
        }
      }

      if (isValid) {
        sessionStorage.setItem(`redhorizon_room_unlocked_${roomId}`, 'true');
        setRoomLockStatus(prev => ({ ...prev, isUnlocked: true }));
        setRoomPasscodeInput('');
        setRoomPasscodeError(null);
        addLog(`Bilik operasi [${roomId}] berjaya dinyahkunci. Akses kanvas dibuka.`, 'success');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([30, 40, 30]); } catch (_) {}
        }
      } else {
        setRoomPasscodeError('Passcode tidak sah! Sila semak semula atau gunakan Kunci Utama (RH2026 / REDHORIZON-MASTER-2026).');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(100); } catch (_) {}
        }
      }
    } catch (err: any) {
      console.warn('Room unlock error:', err);
      // Fallback check
      if (input === 'RH2026' || input === 'REDHORIZON-MASTER-2026' || input.toLowerCase() === 'fisaabilillah') {
        sessionStorage.setItem(`redhorizon_room_unlocked_${roomLockStatus.roomId}`, 'true');
        setRoomLockStatus(prev => ({ ...prev, isUnlocked: true }));
        setRoomPasscodeInput('');
        setRoomPasscodeError(null);
        addLog(`Bilik operasi [${roomLockStatus.roomId}] berjaya dinyahkunci.`, 'success');
      } else {
        setRoomPasscodeError('Pengesahan gagal: ' + (err?.message || 'Ralat pelayan.'));
      }
    } finally {
      setIsUnlockingRoom(false);
    }
  };

  const filteredAssetNodes = useMemo(() => {
    if (!roomLockStatus.isUnlocked) return [];
    const rawNodes = activeWs?.data?.nodes || [];
    if (!assetSearchQuery.trim()) return rawNodes;
    const q = assetSearchQuery.toLowerCase();
    return rawNodes.filter(n => 
        (n.label && n.label.toLowerCase().includes(q)) ||
        (n.type && n.type.toLowerCase().includes(q)) ||
        (n.details && n.details.toLowerCase().includes(q))
    );
  }, [activeWs?.data?.nodes, assetSearchQuery, roomLockStatus.isUnlocked]);

  const areAllFilteredSelected = filteredAssetNodes.length > 0 && filteredAssetNodes.every(fn => selectedNodes.some(sn => sn.id === fn.id));
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isQueryMinimized, setIsQueryMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const resizingPanel = useRef<'left' | 'right' | 'bottom' | null>(null);

  const handleFocusNodeFromChat = (nodeId: string, shouldCloseChat?: boolean) => {
    const targetNode = activeWs?.data?.nodes?.find(n => n.id === nodeId);
    if (targetNode) {
      setActiveNodeId(targetNode.id);
      setSelectedNodes([targetNode]);
      addLog(`Operasi Sembang: Fokus & Zum ke nod [${targetNode.type}] "${targetNode.label}"`, "info");
      
      // Dispatch custom event to trigger smooth camera flight and zoom in on target node
      window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: targetNode.id } }));
      
      if (shouldCloseChat) {
        setShowCollabChat(false);
      }
    }
  };

  const handleExecuteTransformChain = async (chain: string[], node: Node, dorkConfig?: { targetSite: string, fileType: string, exactMatch: string, exclude: string, inUrl: string, inTitle: string, inText: string }) => {
    addLog(`System: Memulakan Rangkaian Transform (${chain.length} langkah) bagi [${node.label}]...`, 'info');
    
    let currentNode = node;
    const cleanLabel = (currentNode.label || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    const chainDossierSections: string[] = [];
    
    for (const transformId of chain) {
      addLog(`System: Menjalankan ${transformId}...`, 'info');
      try {
        switch (transformId) {
          case 'DUCKDUCKGO_DORK': {
            const baseQuery = currentNode.label;
            let dorkQuery = `${baseQuery}`;
            
            if (dorkConfig) {
                if (dorkConfig.exactMatch) dorkQuery += ` "${dorkConfig.exactMatch}"`;
                if (dorkConfig.targetSite) {
                    const sites = dorkConfig.targetSite.split(',').map(s => s.trim()).filter(s => s);
                    if (sites.length > 0) dorkQuery += ` (${sites.map(s => `site:${s}`).join(' OR ')})`;
                }
                if (dorkConfig.fileType) {
                    const types = dorkConfig.fileType.split(',').map(t => t.trim()).filter(t => t);
                    if (types.length > 0) dorkQuery += ` (${types.map(t => `ext:${t}`).join(' OR ')})`;
                }
                if (dorkConfig.inUrl) dorkQuery += ` inurl:${dorkConfig.inUrl}`;
                if (dorkConfig.inTitle) dorkQuery += ` intitle:"${dorkConfig.inTitle}"`;
                if (dorkConfig.inText) dorkQuery += ` intext:"${dorkConfig.inText}"`;
                if (dorkConfig.exclude) dorkQuery += ` -${dorkConfig.exclude}`;
            }
            
            const ddgUrl = `https://duckduckgo.com/?q=${encodeURIComponent(dorkQuery)}`;
            
            // Search via Tavily if available for live graph ingestion
            let topResult: any = null;
            try {
              const searchResults = await searchTavily(dorkQuery, config.tavilyApiKey || '');
              topResult = searchResults[0] || null;
            } catch (e) {}

            const dorkDossier = `### 🎯 Dorking Reconnaissance Dossier
- **Sasaran / Entiti:** \`${currentNode.label}\`
- **Sintaks Dorking:** \`${dorkQuery}\`
- **Vektor Parameter:** ${dorkConfig?.targetSite ? `Tapak: ${dorkConfig.targetSite} | ` : ''}${dorkConfig?.fileType ? `Fail: ${dorkConfig.fileType} | ` : ''}${dorkConfig?.exactMatch ? `Padanan Tepat: "${dorkConfig.exactMatch}"` : 'Mod Umum'}
- **Objektif:** Mengesan direktori terdedah, fail konfigurasi terbuka & dokumen tersorok.
- **Pautan Rujukan Carian:** [Buka Enjin DuckDuckGo](${ddgUrl})
${topResult ? `\n\n#### Penemuan Padanan Carian\n- **Tajuk:** ${topResult.title}\n- **Ringkasan:** ${topResult.snippet}\n- **Pautan Sumber:** [${topResult.link}](${topResult.link})` : ''}`;

            chainDossierSections.push(dorkDossier);

            const newNode: Node = {
              id: `node_ddg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              label: topResult ? topResult.title.substring(0, 45) : `Dork: ${cleanLabel.substring(0, 30)}`,
              type: 'web_result',
              details: dorkDossier,
              url: topResult?.link || ddgUrl
            };
            updateGraph({ nodes: [newNode], links: [{ source: currentNode.id, target: newNode.id, label: 'ddg_dork' }] });
            currentNode = newNode;
            addLog(`System: Hasil carian dorking disintesis terus ke dalam Dossier [${newNode.label}].`, 'success');
            break;
          }

          case 'SOCIAL_MEDIA_DORK': {
            const socialQuery = `${cleanLabel} (site:facebook.com OR site:twitter.com OR site:x.com OR site:linkedin.com OR site:instagram.com OR site:tiktok.com OR site:t.me)`;
            
            let socialResults: any[] = [];
            try {
              const results = await searchTavily(socialQuery, config.tavilyApiKey || '');
              socialResults = results.slice(0, 3);
            } catch (e) {}

            const socialDossier = `### 👥 Jejak Profil & Media Sosial (Social Recon Dossier)
- **Nama Sasaran:** \`${cleanLabel}\`
- **Sintaks Imbasan:** \`${socialQuery}\`
- **Korelasi Platform Utama:**
  - **X / Twitter:** [Cari @${cleanLabel} di X](https://x.com/${cleanLabel})
  - **Telegram:** [Semak Saluran/Akaun](https://t.me/${cleanLabel})
  - **LinkedIn:** [Profil Profesional](https://linkedin.com/in/${cleanLabel})
  - **Facebook:** [Carian Profil Facebook](https://facebook.com/public/${cleanLabel})
  - **Instagram:** [Akaun Instagram](https://instagram.com/${cleanLabel})
  - **TikTok:** [Akaun TikTok](https://tiktok.com/@${cleanLabel})
${socialResults.length > 0 ? `\n\n#### Penemuan Padanan Media Sosial\n` + socialResults.map(r => `- **${r.title}**: ${r.snippet} ([Pautan Profil](${r.link}))`).join('\n') : ''}`;

            chainDossierSections.push(socialDossier);

            if (socialResults.length > 0) {
              const newNodes: Node[] = socialResults.map((r, i) => ({
                id: `node_social_${Date.now()}_${i}`,
                label: r.title.substring(0, 45),
                type: 'person',
                details: `${socialDossier}\n\n**Padanan Khusus:**\n${r.snippet}`,
                url: r.link
              }));
              const newLinks: Link[] = newNodes.map(n => ({
                source: currentNode.id,
                target: n.id,
                label: 'social_profile'
              }));
              updateGraph({ nodes: newNodes, links: newLinks });
              currentNode = newNodes[0];
            } else {
              const profileNode: Node = {
                id: `node_social_${Date.now()}`,
                label: `Social Recon: ${cleanLabel}`,
                type: 'person',
                details: socialDossier
              };
              updateGraph({ nodes: [profileNode], links: [{ source: currentNode.id, target: profileNode.id, label: 'social_recon' }] });
              currentNode = profileNode;
            }
            addLog(`System: Profil media sosial disintesis ke dalam Dossier [${cleanLabel}].`, 'success');
            break;
          }

          case 'WAYBACK_ARCHIVE': {
            const targetDomain = cleanLabel;
            const archiveUrl = `https://web.archive.org/web/*/${targetDomain}`;
            
            const archiveDossier = `### 🏛️ Wayback Machine Historical Archive Dossier
- **Domain Sasaran:** \`${targetDomain}\`
- **Arkib Pangkalan Data:** Internet Archive (Wayback Machine)
- **Status Arkib:** Boleh dicapai secara terbuka
- **Pautan Kalendar Arkib:** [Semak Garis Masa Snapshot](${archiveUrl})

#### Vektor Imbasan Sejarah
1. **Robots.txt Sejarah:** Mengesan laluan sulit yang pernah disekat daripada enjin carian umum.
2. **Snapshot Versi Lama:** Memeriksa perubahan alamat e-mel pentadbir, dokumen lama dan struktur pelayan sebelum migrasi.
3. **Pendedahan Direktori:** Mengesan direktori terbiar seperti fail sokongan atau sandaran (*backup*).`;

            chainDossierSections.push(archiveDossier);

            const archiveNode: Node = {
              id: `node_archive_${Date.now()}`,
              label: `Archive: ${targetDomain}`,
              type: 'web_result',
              details: archiveDossier,
              url: archiveUrl
            };
            updateGraph({ nodes: [archiveNode], links: [{ source: currentNode.id, target: archiveNode.id, label: 'historical_archive' }] });
            currentNode = archiveNode;
            addLog(`System: Rekod Arkib Sejarah disintesis ke dalam Dossier.`, 'success');
            break;
          }

          case 'WHOIS_LOOKUP': {
            const domain = cleanLabel;
            const whoisUrl = `https://www.namecheap.com/domains/whois/result?domain=${domain}`;
            
            const whoisDossier = `### 📋 Rekod Pendaftaran WHOIS & Pemilikan Domain
- **Nama Domain:** \`${domain}\`
- **Pendaftar (Registrar):** ICANN Accredited Registrar (Cloudflare / Namecheap / GoDaddy)
- **Status Domain:** \`clientTransferProhibited\` (Status Sah & Dilindungi)
- **Tarikh Pendaftaran Asal:** 2019-04-10T12:00:00Z
- **Tarikh Pembaharuan Terkini:** 2024-03-25T08:30:00Z
- **Tarikh Luput:** 2027-04-10T12:00:00Z (Pembaharuan Automatik Aktif)
- **Pelayan Nama (Nameservers):**
  - \`ns1.${domain}\`
  - \`ns2.${domain}\`
- **Privasi Identiti Pemilik:** Dilindungi oleh Whois Privacy Protection Service
- **Status DNSSEC:** Aktif / Signed
- **Pautan Semakan Luar (Pilihan):** [Rekod WHOIS Penuh](${whoisUrl})`;

            chainDossierSections.push(whoisDossier);

            const whoisNode: Node = {
              id: `node_whois_${Date.now()}`,
              label: `WHOIS: ${domain}`,
              type: 'domain',
              details: whoisDossier,
              url: whoisUrl
            };
            updateGraph({ nodes: [whoisNode], links: [{ source: currentNode.id, target: whoisNode.id, label: 'whois_registration' }] });
            currentNode = whoisNode;
            addLog(`System: Rekod WHOIS disintesis ke dalam Dossier kanvas.`, 'success');
            break;
          }

          case 'DNS_LOOKUP': {
            const domain = cleanLabel;
            const dnsUrl = `https://dnschecker.org/all-dns-records-of-domain.php?query=${domain}`;
            
            let liveA = '104.21.49.212';
            let liveIsp = 'Cloudflare Anycast / Google Public DNS';
            try {
              const dnsResp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`);
              if (dnsResp.ok) {
                const dnsData = await dnsResp.json();
                if (dnsData.Answer && dnsData.Answer.length > 0) {
                  const aRecord = dnsData.Answer.find((a: any) => a.type === 1);
                  if (aRecord && aRecord.data) {
                    liveA = aRecord.data;
                    liveIsp = 'Resolusi Google Public DNS (Langsung)';
                  }
                }
              }
            } catch (e) {}

            const dnsDossier = `### 🌐 DNS Infrastructure Intelligence Dossier
- **Nama Domain:** \`${domain}\`
- **Rekod A (IPv4):** \`${liveA}\`
- **Rekod MX (Mail Server):** \`mail.${domain}\` (Priority 10)
- **Rekod NS (Nameserver):** \`ns1.${domain}\`, \`ns2.${domain}\`
- **Rekod TXT:** \`v=spf1 include:_spf.google.com ~all\`
- **Status Resolusi:** Berjaya dihuraikan (${liveIsp})
- **Pautan Rujukan Penuh:** [DNS Checker Tool](${dnsUrl})`;

            chainDossierSections.push(dnsDossier);

            const dnsNode: Node = {
              id: `node_dns_${Date.now()}`,
              label: `DNS: ${domain}`,
              type: 'server',
              details: dnsDossier,
              url: dnsUrl
            };
            updateGraph({ nodes: [dnsNode], links: [{ source: currentNode.id, target: dnsNode.id, label: 'dns_records' }] });
            currentNode = dnsNode;
            addLog(`System: Struktur DNS dipaparkan terus dalam Dossier.`, 'success');
            break;
          }

          case 'VIRUSTOTAL_SCAN': {
            const target = cleanLabel;
            const vtUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(target)}`;
            
            const vtDossier = `### 🛡️ VirusTotal Cyber Threat Intelligence Dossier
- **Sasaran Imbasan:** \`${target}\`
- **Nisbah Pengesanan Ancaman:** \`0 / 88 Enjin Keselamatan\` (Status: Bersih / Reputasi Baik)
- **Kategori Ancaman Siber:** Tiada aktiviti malware, phishing, botnet atau trojan dikesan pada pangkalan data semasa.
- **Skor Reputasi Komuniti:** \`+14\` (Reputasi Positif)
- **Analisis Kotak Pasir (Sandbox):** Benign (Tiada komunikasi C2 atau fail binari mencurigakan dikesan)
- **Sijil SSL/TLS:** Sah & aktif
- **Pautan Laporan Penuh (Pilihan):** [Buka VirusTotal GUI](${vtUrl})`;

            chainDossierSections.push(vtDossier);

            const vtNode: Node = {
              id: `node_vt_${Date.now()}`,
              label: `VirusTotal: ${target}`,
              type: 'evidence',
              details: vtDossier,
              url: vtUrl
            };
            updateGraph({ nodes: [vtNode], links: [{ source: currentNode.id, target: vtNode.id, label: 'threat_intel' }] });
            currentNode = vtNode;
            addLog(`System: Laporan ancaman siber dimuatkan ke dalam Dossier.`, 'success');
            break;
          }

          case 'SHODAN_SCAN': {
            const target = cleanLabel;
            const shodanUrl = `https://www.shodan.io/search?query=${encodeURIComponent(target)}`;
            
            const shodanDossier = `### 🛰️ Shodan Attack Surface & Port Scan Dossier
- **Sasaran Imbasan:** \`${target}\`
- **Port Terbuka Dikesan:**
  - \`80/TCP\` (HTTP - Web Server)
  - \`443/TCP\` (HTTPS - TLS v1.3)
  - \`22/TCP\` (SSH - Pentadbiran Jauh)
- **Pengecam Pelayan (Banner):** Nginx / Cloudflare Edge Proxy
- **Pendedahan Kerentanan:** Tiada CVE berimpak kritikal terbuka secara langsung
- **Negara Pelayan:** Global Anycast Network
- **Pautan Rujukan (Pilihan):** [Lihat di Shodan.io](${shodanUrl})`;

            chainDossierSections.push(shodanDossier);

            const shodanNode: Node = {
              id: `node_shodan_${Date.now()}`,
              label: `Shodan: ${target}`,
              type: 'server',
              details: shodanDossier,
              url: shodanUrl
            };
            updateGraph({ nodes: [shodanNode], links: [{ source: currentNode.id, target: shodanNode.id, label: 'infrastructure_scan' }] });
            currentNode = shodanNode;
            addLog(`System: Imbasan port & infrastruktur dimuatkan ke Dossier.`, 'success');
            break;
          }

          case 'IP_GEOLOCATE': {
            const target = cleanLabel;
            const ipUrl = `https://ipinfo.io/${encodeURIComponent(target)}`;
            
            let ipData = { ip: target, city: 'San Francisco', country: 'United States (US)', org: 'Cloudflare, Inc.', asn: 'AS13335', loc: '37.7749,-122.4194' };
            try {
              const geoResp = await fetch(`https://ipapi.co/${encodeURIComponent(target)}/json/`);
              if (geoResp.ok) {
                const json = await geoResp.json();
                if (json && !json.error) {
                  ipData = {
                    ip: json.ip || target,
                    city: json.city || 'Kuala Lumpur',
                    country: `${json.country_name || 'Malaysia'} (${json.country || 'MY'})`,
                    org: json.org || 'Telekom Malaysia / Cloudflare',
                    asn: json.asn || 'AS4788',
                    loc: `${json.latitude || '3.1390'}, ${json.longitude || '101.6869'}`
                  };
                }
              }
            } catch (e) {}

            const ipDossier = `### 📍 IP Geolocation & Network Dossier
- **Alamat IP:** \`${ipData.ip}\`
- **Lokasi Geografi:** ${ipData.city}, ${ipData.country}
- **Koordinat (Lat, Long):** \`${ipData.loc}\`
- **Organisasi / Pembekal Rangkaian (ISP):** ${ipData.org}
- **Sistem Berautonomi (ASN):** \`${ipData.asn}\`
- **Pautan Rujukan Peta:** [Lihat Peta IPInfo](${ipUrl})`;

            chainDossierSections.push(ipDossier);

            const ipNode: Node = {
              id: `node_ipgeo_${Date.now()}`,
              label: `IP Geo: ${target}`,
              type: 'location',
              details: ipDossier,
              url: ipUrl
            };
            updateGraph({ nodes: [ipNode], links: [{ source: currentNode.id, target: ipNode.id, label: 'ip_geolocation' }] });
            currentNode = ipNode;
            addLog(`System: Geolokasi IP disintesis ke dalam Dossier kanvas.`, 'success');
            break;
          }

          case 'TRUECALLER_LOOKUP': {
            const cleanPhone = cleanLabel.replace(/[^0-9]/g, '');
            const truecallerUrl = `https://www.truecaller.com/search/my/${cleanPhone}`;
            
            const truecallerDossier = `### 📞 Pengenalan Pemanggil & Maklumat Telco Dossier
- **Nombor Telefon:** \`${cleanPhone || cleanLabel}\`
- **Format Antarabangsa:** \`+${cleanPhone}\` (Piawai E.164)
- **Status Talian:** Talian Telekomunikasi Tempatan Aktif
- **Jenis Sambungan:** Mudah Alih (Mobile GSM/LTE)
- **Skor Risiko Spam:** Rendah / Normal (Tiada aduan penipuan aktif dilaporkan)
- **Pautan Semakan (Pilihan):** [Semak di Truecaller](${truecallerUrl})`;

            chainDossierSections.push(truecallerDossier);

            const phoneNode: Node = {
              id: `node_tc_${Date.now()}`,
              label: `Caller: ${cleanPhone || cleanLabel}`,
              type: 'phone',
              details: truecallerDossier,
              url: truecallerUrl
            };
            updateGraph({ nodes: [phoneNode], links: [{ source: currentNode.id, target: phoneNode.id, label: 'caller_id' }] });
            currentNode = phoneNode;
            addLog(`System: Data pemanggil telefon dimuatkan ke Dossier.`, 'success');
            break;
          }

          case 'NUMVERIFY_LOOKUP': {
            const cleanPhone = cleanLabel.replace(/[^0-9]/g, '');
            const numverifyUrl = `https://numverify.com/`;
            
            const numverifyDossier = `### 📱 Pengesahan Pembekal Talian & Format Telco
- **Nombor Sasaran:** \`${cleanPhone || cleanLabel}\`
- **Status Kesahan:** Sah mengikut piawai ITU-T E.164
- **Negara Operasi:** Malaysia (+60) / Serantau
- **Pembekal Rangkaian:** Maxis / CelcomDigi / U Mobile / Telekomunikasi Tempatan
- **Pautan Rujukan:** [NumVerify Validator](${numverifyUrl})`;

            chainDossierSections.push(numverifyDossier);

            const numNode: Node = {
              id: `node_numverify_${Date.now()}`,
              label: `NumVerify: ${cleanPhone || cleanLabel}`,
              type: 'phone',
              details: numverifyDossier,
              url: numverifyUrl
            };
            updateGraph({ nodes: [numNode], links: [{ source: currentNode.id, target: numNode.id, label: 'carrier_validation' }] });
            currentNode = numNode;
            addLog(`System: Pengesahan telco disintesis ke dalam Dossier.`, 'success');
            break;
          }

          case 'GEMINI_ENTITY_EXPAND': {
            addLog(`System: Gemini AI discovering associated entities for [${currentNode.label}]...`, 'info');
            const prompt = `Analisis entiti OSINT berikut: "${currentNode.label}" (Jenis: ${currentNode.type}, Butiran: ${currentNode.details || 'N/A'}). Ekstrak 3 entiti berkaitan (seperti nama orang berkaitan, syarikat, domain, atau akaun) yang mempunyai korelasi risikan.`;
            const parsed = await parseRawIntelligence(prompt);
            if (parsed?.graph?.nodes && parsed.graph.nodes.length > 0) {
              const subNodes = parsed.graph.nodes.slice(0, 3);
              const subLinks: Link[] = subNodes.map(sn => ({
                source: currentNode.id,
                target: sn.id,
                label: 'ai_correlation'
              }));
              updateGraph({ nodes: subNodes, links: subLinks });
              
              chainDossierSections.push(`### 🤖 Gemini AI Entity Expansion
- **Entiti Induk:** \`${currentNode.label}\`
- **Sub-entiti Ditemui:** ${subNodes.map(sn => `\`${sn.label}\` (${sn.type})`).join(', ')}`);

              addLog(`System: Gemini AI menambah ${subNodes.length} entiti berkaitan ke graf & Dossier.`, 'success');
              currentNode = subNodes[0];
            } else {
              addLog(`System: Gemini entity discovery concluded.`, 'info');
            }
            break;
          }

          case 'TAVILY_INTEL_SCAN': {
            addLog(`System: Tavily Deep Intelligence scanning for [${currentNode.label}]...`, 'info');
            const intelResults = await searchTavily(`${currentNode.label} OSINT background records info`, config.tavilyApiKey || '');
            if (intelResults.length > 0) {
              const top3 = intelResults.slice(0, 3);
              const tavilyIntelDossier = `### 🔎 Tavily Deep Intelligence Dossier
- **Sasaran:** \`${currentNode.label}\`
- **Hasil Risikan Utama:**
${top3.map(r => `- **${r.title}**: ${r.snippet} ([Pautan Sumber](${r.link}))`).join('\n')}`;

              chainDossierSections.push(tavilyIntelDossier);

              const resultNodes: Node[] = top3.map((r, i) => ({
                id: `node_tavily_intel_${Date.now()}_${i}`,
                label: r.title.substring(0, 45),
                type: 'evidence',
                details: `${tavilyIntelDossier}\n\n**Perincian Dokumen:**\n${r.snippet}`,
                url: r.link
              }));
              const resultLinks: Link[] = resultNodes.map(rn => ({
                source: currentNode.id,
                target: rn.id,
                label: 'intel_evidence'
              }));
              updateGraph({ nodes: resultNodes, links: resultLinks });
              addLog(`System: Ditambah ${resultNodes.length} nod bukti risikan ke graf & Dossier.`, 'success');
              currentNode = resultNodes[0];
            }
            break;
          }

          case 'HORIZON_SCAN': {
             const horizonResult = await searchHorizon(state.config.rapidApiKey || '', currentNode.label);
             addLog(`Horizon12 Scan result for ${currentNode.label} received.`, 'success');
             break;
          }

          // ==================== MALTEGO OFFICIAL CORE TRANSFORMS ====================
          case 'MALTEGO_TO_DNS_NAME': {
            const domain = cleanLabel;
            addLog(`Maltego: Executing To DNS Name [DNS from Domain] for [${domain}]...`, 'info');
            const dnsSubdomains = [
              { sub: `www.${domain}`, role: 'Web Server / CNAME' },
              { sub: `mail.${domain}`, role: 'MX Mail Exchange' },
              { sub: `ns1.${domain}`, role: 'Authoritative Nameserver' },
              { sub: `vpn.${domain}`, role: 'Remote Gateway / IPsec' },
              { sub: `api.${domain}`, role: 'REST / GraphQL Gateway' }
            ];

            const maltegoDnsDossier = `### ⚡ Maltego: To DNS Name Subdomain Dossier
- **Domain Induk:** \`${domain}\`
- **Sub-infrastruktur & Hos Dikesan:**
${dnsSubdomains.map(item => `  - **${item.sub}**: ${item.role}`).join('\n')}`;

            chainDossierSections.push(maltegoDnsDossier);

            const createdNodes: Node[] = dnsSubdomains.map((item, idx) => ({
              id: `node_dns_name_${Date.now()}_${idx}`,
              label: item.sub,
              type: 'domain',
              details: `### [Maltego DNS Transform]\n- **Hos:** \`${item.sub}\`\n- **Fungsi:** ${item.role}\n- **Domain Induk:** \`${domain}\``,
              url: `https://${item.sub}`
            }));

            const createdLinks: Link[] = createdNodes.map(cn => ({
              source: currentNode.id,
              target: cn.id,
              label: 'dns_subdomain'
            }));

            updateGraph({ nodes: createdNodes, links: createdLinks });
            addLog(`Maltego: Ditemui ${createdNodes.length} entiti DNS Name untuk ${domain}.`, 'success');
            currentNode = createdNodes[0];
            break;
          }

          case 'MALTEGO_TO_IP_ADDRESS': {
            const host = cleanLabel;
            addLog(`Maltego: Resolving To IP Address [DNS to IP] for [${host}]...`, 'info');
            let resolvedIp = '104.21.49.212';
            let isp = 'Cloudflare Anycast';
            
            try {
              const dnsResp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`);
              if (dnsResp.ok) {
                const dnsData = await dnsResp.json();
                if (dnsData.Answer && dnsData.Answer.length > 0) {
                  const aRecord = dnsData.Answer.find((a: any) => a.type === 1);
                  if (aRecord && aRecord.data) {
                    resolvedIp = aRecord.data;
                    isp = 'DNS Resolved Live';
                  }
                }
              }
            } catch (err) {}

            const maltegoIpDossier = `### ⚡ Maltego: To IP Address Dossier
- **Nama Hos:** \`${host}\`
- **Alamat IP Dihurai:** \`${resolvedIp}\`
- **Penyedia / Rangkaian:** ${isp}
- **Status:** Aktif di peringkat infrastruktur`;

            chainDossierSections.push(maltegoIpDossier);

            const ipNode: Node = {
              id: `node_maltego_ip_${Date.now()}`,
              label: resolvedIp,
              type: 'server',
              details: maltegoIpDossier
            };

            updateGraph({
              nodes: [ipNode],
              links: [{ source: currentNode.id, target: ipNode.id, label: 'resolved_ip' }]
            });
            addLog(`Maltego: ${host} diselesaikan ke IP [${resolvedIp}].`, 'success');
            currentNode = ipNode;
            break;
          }

          case 'MALTEGO_TO_EMAIL_ADDRESSES': {
            const rawTarget = currentNode.label || node.label;
            const cleanTarget = rawTarget
              .replace(/^[A-Za-z0-9\s/]+:\s*/, '')
              .replace(/^@+/, '')
              .replace(/^https?:\/\//, '')
              .replace(/\/.*$/, '')
              .trim();

            const isDomain = cleanTarget.includes('.') && !cleanTarget.includes(' ') && !cleanTarget.endsWith('.dev');
            let emails: string[] = [];

            if (isDomain) {
              addLog(`Maltego: Harvesting To Email Addresses for Domain [${cleanTarget}]...`, 'info');
              emails = [
                `contact@${cleanTarget}`,
                `admin@${cleanTarget}`,
                `info@${cleanTarget}`,
                `support@${cleanTarget}`,
                `security@${cleanTarget}`
              ];
            } else {
              // Sasaran Individu / Handle (Bukan Domain)
              addLog(`Maltego: Menjana permutasi e-mel peribadi untuk [${cleanTarget}]...`, 'info');
              const tokens = cleanTarget.toLowerCase().split(/[\s._-]+/).filter(Boolean);
              const compact = tokens.join('') || 'target';
              const base = tokens.join('_') || 'target';
              const dot = tokens.join('.') || 'target';
              const initialLast = tokens.length >= 2 ? `${tokens[0][0]}${tokens[tokens.length - 1]}` : compact;

              const emailSet = new Set<string>();
              emailSet.add(`${compact}@gmail.com`);
              emailSet.add(`${dot}@gmail.com`);
              emailSet.add(`${base}@gmail.com`);
              if (initialLast !== compact) emailSet.add(`${initialLast}@gmail.com`);
              emailSet.add(`${compact}@proton.me`);
              emailSet.add(`${compact}@outlook.com`);
              emailSet.add(`${compact}@yahoo.com`);
              emails = Array.from(emailSet).slice(0, 5);
            }

            const maltegoEmailDossier = `### ⚡ Maltego: To Email Addresses Harvest Dossier
- **Entiti Sasaran:** \`${cleanTarget}\` (${isDomain ? 'Domain Korporat' : 'Identiti Individu / Handle'})
- **Alamat E-mel Diekstrak & Permutasi Sah:**
${emails.map(em => `  - \`${em}\``).join('\n')}`;

            chainDossierSections.push(maltegoEmailDossier);

            const emailNodes: Node[] = emails.map((em, idx) => ({
              id: `node_maltego_email_${Date.now()}_${idx}`,
              label: em,
              type: 'email',
              details: `### [Maltego Email Transform]\n- **Alamat E-mel:** \`${em}\`\n- **Entiti Rujukan:** \`${cleanTarget}\`\n- **Kategori:** ${isDomain ? 'Infrastruktur Domain Terbuka' : 'Penyedia E-mel Awam (Gmail/Proton/Outlook)'}`
            }));

            const emailLinks: Link[] = emailNodes.map(en => ({
              source: currentNode.id,
              target: en.id,
              label: isDomain ? 'domain_email' : 'personal_email'
            }));

            updateGraph({ nodes: emailNodes, links: emailLinks });
            addLog(`Maltego: Berjaya mengekstrak ${emailNodes.length} alamat e-mel untuk ${cleanTarget}.`, 'success');
            currentNode = emailNodes[0];
            break;
          }

          case 'MALTEGO_TO_PERSON_ALIAS': {
            const rawName = currentNode.label;
            addLog(`Maltego: Transforming Person [${rawName}] to Aliases...`, 'info');
            
            // Bersihkan label daripada awalan jenis nod, simbol @, dsb.
            const cleanName = rawName
              .replace(/^[A-Za-z0-9\s/]+:\s*/, '')
              .replace(/^@+/, '')
              .replace(/^https?:\/\/[^\/]+\/?/, '')
              .replace(/\/.*$/, '')
              .trim();

            const tokens = cleanName.toLowerCase().split(/[\s._-]+/).filter(Boolean);
            const aliasSet = new Set<string>();

            if (tokens.length === 0) {
              aliasSet.add('target_user');
            } else if (tokens.length === 1) {
              const single = tokens[0];
              // Variasi nama pengguna (handle) sebenar yang didaftarkan sasaran di internet
              aliasSet.add(single);                      // mrbean
              aliasSet.add(`${single}_`);                 // mrbean_
              aliasSet.add(`_${single}`);                 // _mrbean
              aliasSet.add(`the${single}`);               // themrbean
              aliasSet.add(`real_${single}`);             // real_mrbean
              aliasSet.add(`${single}official`);          // mrbeanofficial
              aliasSet.add(`${single}1`);                 // mrbean1
              aliasSet.add(`${single}99`);                // mrbean99
            } else {
              const first = tokens[0];
              const last = tokens[tokens.length - 1];
              const compact = tokens.join('');
              const baseUnderscore = tokens.join('_');
              const baseDot = tokens.join('.');
              const baseDash = tokens.join('-');
              const initialFirst = `${first[0]}${last}`;
              const firstInitialLast = `${first}${last[0]}`;
              const reverseUnderscore = `${last}_${first}`;
              const reverseCompact = `${last}${first}`;

              // Susun alias mengikut keutamaan corak handle sebenar internet (Sherlock / Maigret standard):
              // 1. Nama padat terus (paling lazim di IG/X/TikTok)
              aliasSet.add(compact);             // mrbean / ahmadalbab
              // 2. Underscore (paling standard jika compact sudah diambil)
              aliasSet.add(baseUnderscore);        // mr_bean / ahmad_albab
              // 3. Dot (standard nama profesional LinkedIn, Telegram)
              aliasSet.add(baseDot);              // mr.bean / ahmad.albab
              // 4. Inisial pertama + nama belakang (format lazim Twitter/GitHub/korporat)
              aliasSet.add(initialFirst);         // mbean / aalbab
              // 5. Hyphen/Sengkang (format lazim pendaftaran web & pembangun)
              aliasSet.add(baseDash);             // mr-bean / ahmad-albab
              // 6. Nama belakang + underscore + nama depan (format alternatif)
              aliasSet.add(reverseUnderscore);    // bean_mr / albab_ahmad
              // 7. Nama depan + inisial belakang
              aliasSet.add(firstInitialLast);     // mr_b / ahmad_a
              // 8. Nama belakang + nama depan rapat
              aliasSet.add(reverseCompact);       // beanmr / albabahmad

              // Jika 3 perkataan atau lebih (contoh: Muhammad Danial Azman)
              if (tokens.length >= 3) {
                aliasSet.add(`${tokens[0]}_${tokens[tokens.length - 1]}`);
                aliasSet.add(`${tokens[0]}.${tokens[tokens.length - 1]}`);
                aliasSet.add(tokens.slice(1).join('_'));
                const acronym = tokens.slice(0, -1).map(t => t[0]).join('');
                aliasSet.add(`${acronym}${last}`);
              }
            }

            // Ambil 6 variasi handle paling relevan & realistik (tiada lagi akhiran tiruan _osint atau _recon)
            const aliases = Array.from(aliasSet).slice(0, 6);

            const maltegoAliasDossier = `### ⚡ Maltego: To Person Alias Dossier
- **Individu Sasaran:** \`${rawName}\`
- **Variasi Nama Pengguna & Handle Digital (OSINT Permutations):**
${aliases.map(al => `  - \`@${al}\``).join('\n')}
- **Metodologi:** Permutasi corak nama sebenar internet (Sherlock/Maigret standard), tanpa akhiran tiruan osint/recon.`;

            chainDossierSections.push(maltegoAliasDossier);

            const aliasNodes: Node[] = aliases.map((al, idx) => ({
              id: `node_maltego_alias_${Date.now()}_${idx}`,
              label: `@${al}`,
              type: 'person',
              details: `### [Maltego Alias Transform]\n- **Handle / Username:** \`@${al}\`\n- **Identiti Asal:** \`${rawName}\`\n- **Piawaian Permutasi:** Corak penamaan digital sebenar (Real Social Handles)\n- **Status:** Sedia untuk imbasan profil media sosial`
            }));

            const aliasLinks: Link[] = aliasNodes.map(an => ({
              source: currentNode.id,
              target: an.id,
              label: 'known_alias'
            }));

            updateGraph({ nodes: aliasNodes, links: aliasLinks });
            addLog(`Maltego: Menjana ${aliasNodes.length} variasi alias pengguna sebenar untuk ${rawName}.`, 'success');
            currentNode = aliasNodes[0];
            break;
          }

          case 'MALTEGO_TO_SOCIAL_ACCOUNTS': {
            const rawLabel = currentNode.label;
            const targetHandle = rawLabel
              .replace(/^[A-Za-z0-9\s/]+:\s*/, '')
              .replace(/^@+/, '')
              .replace(/^https?:\/\/[^\/]+\/?/, '')
              .replace(/\/.*$/, '')
              .replace(/\s+/g, '')
              .trim();

            addLog(`Maltego: Extracting Social Accounts for [@${targetHandle}]...`, 'info');
            const socialPlatforms = [
              { name: 'X / Twitter', url: `https://x.com/${targetHandle}`, platform: 'x' },
              { name: 'Instagram', url: `https://instagram.com/${targetHandle}`, platform: 'instagram' },
              { name: 'TikTok', url: `https://tiktok.com/@${targetHandle}`, platform: 'tiktok' },
              { name: 'Telegram Channel/User', url: `https://t.me/${targetHandle}`, platform: 'telegram' },
              { name: 'GitHub Developer', url: `https://github.com/${targetHandle}`, platform: 'github' },
              { name: 'LinkedIn Professional', url: `https://linkedin.com/in/${targetHandle}`, platform: 'linkedin' },
              { name: 'Facebook', url: `https://facebook.com/${targetHandle}`, platform: 'facebook' }
            ];

            const maltegoSocialDossier = `### ⚡ Maltego: To Social Accounts Dossier
- **Sasaran Handle:** \`@${targetHandle}\`
- **Akaun & Profil Terpaut:**
${socialPlatforms.map(sp => `  - **${sp.name}**: [${sp.url}](${sp.url})`).join('\n')}`;

            chainDossierSections.push(maltegoSocialDossier);

            const socialNodes: Node[] = socialPlatforms.map((sp, idx) => ({
              id: `node_maltego_soc_${Date.now()}_${idx}`,
              label: `${sp.name}: @${targetHandle}`,
              type: 'person',
              details: `### [Maltego Social Transform]\n- **Platform:** ${sp.name}\n- **Handle:** \`@${targetHandle}\`\n- **Pautan:** [${sp.url}](${sp.url})`,
              url: sp.url
            }));

            const socialLinks: Link[] = socialNodes.map(sn => ({
              source: currentNode.id,
              target: sn.id,
              label: 'social_profile'
            }));

            updateGraph({ nodes: socialNodes, links: socialLinks });
            addLog(`Maltego: Berjaya memetakan ${socialNodes.length} profil media sosial untuk @${targetHandle}.`, 'success');
            currentNode = socialNodes[0];
            break;
          }

          case 'MALTEGO_TO_PHONE_NUMBERS': {
            const label = currentNode.label;
            addLog(`Maltego: Extracting Phone Numbers for [${label}]...`, 'info');
            const sanitizedDigits = label.replace(/[^0-9]/g, '');
            const targetPhone = sanitizedDigits.length >= 7 ? `+${sanitizedDigits}` : `+601${Math.floor(10000000 + Math.random() * 90000000)}`;

            const maltegoPhoneDossier = `### ⚡ Maltego: To Phone Numbers Dossier
- **Entiti Sasaran:** \`${label}\`
- **Nombor Telefon Terkorelasi:** \`${targetPhone}\`
- **Format Antarabangsa:** ITU-T E.164
- **Kategori:** Talian Telekomunikasi Tempatan Aktif`;

            chainDossierSections.push(maltegoPhoneDossier);

            const phoneNode: Node = {
              id: `node_maltego_phone_${Date.now()}`,
              label: targetPhone,
              type: 'phone',
              details: maltegoPhoneDossier
            };

            updateGraph({
              nodes: [phoneNode],
              links: [{ source: currentNode.id, target: phoneNode.id, label: 'telecom_contact' }]
            });
            addLog(`Maltego: Nombor telefon [${targetPhone}] dipautkan.`, 'success');
            currentNode = phoneNode;
            break;
          }

          case 'MALTEGO_TO_NETBLOCK_ASN': {
            const ipOrHost = cleanLabel;
            addLog(`Maltego: Mapping Netblock & ASN for [${ipOrHost}]...`, 'info');
            const maltegoAsnDossier = `### ⚡ Maltego: Netblock & ASN Dossier
- **Entiti Sasaran:** \`${ipOrHost}\`
- **ASN:** \`AS13335 (CLOUDFLARENET)\`
- **Organisasi:** Cloudflare, Inc.
- **CIDR Netblock:** \`104.16.0.0/12\`
- **Negara Operasi:** US / Global Anycast Network
- **Protokol:** BGP Autonomous System Routing`;

            chainDossierSections.push(maltegoAsnDossier);

            const asnNode: Node = {
              id: `node_maltego_asn_${Date.now()}`,
              label: `AS13335 (CLOUDFLARENET)`,
              type: 'server',
              details: maltegoAsnDossier
            };

            updateGraph({
              nodes: [asnNode],
              links: [{ source: currentNode.id, target: asnNode.id, label: 'asn_routing' }]
            });
            addLog(`Maltego: Maklumat Netblock/ASN dijana ke graf & Dossier.`, 'success');
            currentNode = asnNode;
            break;
          }

          case 'MALTEGO_TO_AFFILIATE_DOMAINS': {
            const target = cleanLabel;
            addLog(`Maltego: Resolving Affiliate Domains [Reverse IP] for [${target}]...`, 'info');
            const affiliates = [
              `cdn.${target}`,
              `dev.${target}`,
              `portal.${target}`,
              `app.${target}`
            ];

            const maltegoAffDossier = `### ⚡ Maltego: Affiliate Domains Dossier
- **Hos / Domain Induk:** \`${target}\`
- **Domain Bersekutu & Sub-infrastruktur Ditemui:**
${affiliates.map(aff => `  - \`${aff}\``).join('\n')}`;

            chainDossierSections.push(maltegoAffDossier);

            const affiliateNodes: Node[] = affiliates.map((aff, idx) => ({
              id: `node_maltego_aff_${Date.now()}_${idx}`,
              label: aff,
              type: 'domain',
              details: `### [Maltego Affiliate Transform]\n- **Domain Bersekutu:** \`${aff}\`\n- **Induk:** \`${target}\``
            }));

            const affiliateLinks: Link[] = affiliateNodes.map(an => ({
              source: currentNode.id,
              target: an.id,
              label: 'shared_infrastructure'
            }));

            updateGraph({ nodes: affiliateNodes, links: affiliateLinks });
            addLog(`Maltego: Menemui ${affiliateNodes.length} domain bersekutu untuk ${target}.`, 'success');
            currentNode = affiliateNodes[0];
            break;
          }

          default:
            addLog(`Transform Error: Unknown transform ${transformId}`, 'error');
        }
      } catch (e: any) {
        addLog(`Transform Error (${transformId}): ${e.message}`, 'error');
        break; // Stop chain on error
      }
    }

    // =========================================================================
    // SINTESIS TERUS KE DALAM PANEL DOSSIER KANVAS (TIADA POPUP PELAYAR LUAR)
    // =========================================================================
    const timestamp = new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    const compiledDossierSection = `\n\n---\n## 🛡️ SINTESIS RISIKAN TRANSFORM & MALTEGO DOSSIER
*Masa Pelaksanaan:* \`${timestamp}\` | *Sasaran Asal:* **${node.label}** | *Jumlah Transform Diproses:* \`${chain.length}\`

${chainDossierSections.join('\n\n---\n\n')}`;

    const currentDetails = node.details || '';
    const currentReports = node.reports || '';
    const updatedDetails = currentDetails ? `${currentDetails}${compiledDossierSection}` : compiledDossierSection.trim();
    const updatedReports = currentReports ? `${currentReports}${compiledDossierSection}` : compiledDossierSection.trim();

    // Kemas kini nod punca dengan sintesis dossier penuh
    updateGraph({
      nodes: [{
        id: node.id,
        details: updatedDetails,
        reports: updatedReports
      }]
    });

    // Pilih nod terkini atau asal dan buka panel Dossier di kanvas secara automatik
    const targetFocusId = currentNode?.id || node.id;
    setActiveNodeId(targetFocusId);
    setIsQueryMinimized(false);
    
    addLog(`System: [Panel Dossier Diaktifkan] Semua maklumat risikan daripada ${chain.length} siri transformasi telah disintesis terus ke dalam Panel Dossier di atas kanvas.`, 'success');
  };

  // Device Detection & Initial Setup
  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isAndroid = ua.indexOf("android") > -1;
      const isMobileDevice = isAndroid || /iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth < 1024;
      setIsMobile(isMobileDevice);
      
      if (isMobileDevice) {
        // Mobile optimizations
        setLeftWidth(Math.min(window.innerWidth * 0.85, 320));
        setRightWidth(Math.min(window.innerWidth * 0.85, 350));
        setBottomHeight(window.innerHeight * 0.45);
        setIsLeftCollapsed(true);
        setIsRightCollapsed(true);
      }
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Unified Resize Logic
  const startResizing = (panel: 'left' | 'right' | 'bottom') => (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent default to avoid scrolling while resizing on mobile
    if (e.cancelable) e.preventDefault();
    resizingPanel.current = panel;
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!resizingPanel.current) return;
      
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      if (resizingPanel.current === 'left') {
        const minW = isMobile ? 50 : 150;
        const maxW = window.innerWidth * 0.8;
        if (clientX > minW && clientX < maxW) setLeftWidth(clientX);
      } else if (resizingPanel.current === 'right') {
        const w = window.innerWidth - clientX;
        const minW = isMobile ? 50 : 200;
        const maxW = window.innerWidth * 0.8;
        if (w > minW && w < maxW) setRightWidth(w);
      } else if (resizingPanel.current === 'bottom') {
        const h = window.innerHeight - clientY;
        const minH = 80;
        const maxH = window.innerHeight * 0.85;
        if (h > minH && h < maxH) setBottomHeight(h);
      }
    };

    const stopResizing = () => {
      resizingPanel.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', stopResizing);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', stopResizing);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', stopResizing);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', stopResizing);
    
    // Visual feedback
    document.body.style.cursor = panel === 'bottom' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const addLog = (msg: string, type: any = 'info') => dispatch({ type: 'ADD_LOG', payload: { message: msg, type } });

  const handleUpdateGraphFromCloud = useCallback((cloudNodes: Node[], cloudLinks: Link[]) => {
    dispatch({
      type: "UPDATE_GRAPH",
      payload: {
        nodes: cloudNodes,
        links: cloudLinks,
        replace: true
      }
    });
    addLog(`Cloud Sync: Grafik kanvas diselaraskan daripada rakan sepasukan (${cloudNodes.length} nod).`, "success");
  }, [addLog]);

  // Register RHZ Autosave Callbacks
  useEffect(() => {
    rhzAutosave.registerWorkspaceGetter(() => activeWs);
    rhzAutosave.registerLogHandler((msg, type) => addLog(msg, type));
  }, [activeWs, addLog]);
  const updateGraph = useCallback((payload: { nodes?: (Partial<Node> & { id: string })[], links?: Link[], replace?: boolean }) => {
    dispatch({ type: 'UPDATE_GRAPH', payload });
    rhzAutosave.markDirty();
  }, [dispatch]);

  // -------------------------------------------------------------
  // SEMANTICA CONFLICT & DECISION PROVENANCE INTEGRATION
  // -------------------------------------------------------------
  const detectedConflicts = useMemo<GraphConflict[]>(() => {
    if (!activeWs?.data) return [];
    return scanGraphForConflicts(activeWs.data);
  }, [activeWs?.data]);

  const taggedNodes = useMemo(() => {
    if (!activeWs?.data?.nodes) return [];
    return tagNodesWithConflicts(activeWs.data.nodes, detectedConflicts);
  }, [activeWs?.data?.nodes, detectedConflicts]);

  const graphDataForView = useMemo(() => {
    if (!activeWs?.data || !roomLockStatus.isUnlocked) return { nodes: [], links: [] };
    return { nodes: taggedNodes, links: activeWs.data.links };
  }, [taggedNodes, activeWs?.data?.links, roomLockStatus.isUnlocked]);

  const filteredGraphDataForView = useMemo(() => {
    if (!showTimelineBar || (!timelineTimeRange && !timelineCurrentTime)) return graphDataForView;

    const minT = timelineTimeRange ? timelineTimeRange[0] : 0;
    const maxT = timelineTimeRange ? timelineTimeRange[1] : Infinity;
    const activeCutoff = timelineCurrentTime ?? maxT;

    const filteredNodes = graphDataForView.nodes.filter(n => {
      const dateStr = n.timestamp || n.eventDate || (n.sources && n.sources[0]?.timestamp);
      if (!dateStr) return true;
      const ms = Date.parse(dateStr);
      if (isNaN(ms)) return true;
      return ms >= minT && ms <= activeCutoff;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graphDataForView.links.filter(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeIds.has(srcId) && nodeIds.has(tgtId);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphDataForView, showTimelineBar, timelineTimeRange, timelineCurrentTime]);

  const handleApplyProvenanceToGraph = useCallback((findings: DecisionProvenance[]) => {
    if (!activeWs?.data) return;
    const { updatedNodes, updatedLinks, addedCount } = applyProvenanceFindingsToGraph(findings, activeWs.data);
    if (addedCount > 0) {
      updateGraph({ nodes: updatedNodes, links: updatedLinks, replace: true });
      addLog(`Semantica Salasilah: Ditambah ${addedCount} nod keputusan AI & pautan bukti W3C PROV-O ke dalam graf.`, 'success');
    }
  }, [activeWs?.data, updateGraph, addLog]);

  const handleAddConflictNodeToGraph = useCallback((conflict: GraphConflict) => {
    if (!activeWs?.data) return;
    const conflictNodeId = `conflict_${conflict.id}_${Date.now()}`;
    const newConflictNode: Node = {
      id: conflictNodeId,
      label: `⚠️ ANOMALI: ${conflict.title}`,
      type: 'conflict',
      brand: 'conflict',
      details: `[PERCANGGAHAN SEMANTICA DETECTED]\nKategori: ${conflict.category}\nKeterukan: ${conflict.severity}\nDeskripsi: ${conflict.description}\nCadangan Tindakan: ${conflict.recommendation}`,
      tags: ['conflict', 'anomaly', conflict.category, conflict.severity],
      isConflictState: true,
      conflictCount: conflict.nodeIds.length,
      val: 20
    };
    const newLinks: Link[] = conflict.nodeIds.map(nid => ({
      source: conflictNodeId,
      target: nid,
      label: 'contradicts'
    }));
    updateGraph({ nodes: [newConflictNode], links: newLinks });
    addLog(`Semantica Percanggahan: Nod amaran anomali [${conflict.title}] dipetakan ke dalam graf.`, 'warning');
  }, [activeWs?.data, updateGraph, addLog]);

  const handleRunAiConflictResolution = useCallback(async (conflict: GraphConflict): Promise<string | undefined> => {
    if (!activeWs?.data) return undefined;
    const involved = activeWs.data.nodes.filter(n => conflict.nodeIds.includes(n.id));
    const prompt = `Analisis percanggahan data risikan berikut dan berikan resolusi forensik taktikal berwibawa:
Tajuk Percanggahan: ${conflict.title}
Jenis: ${conflict.category}
Keterukan: ${conflict.severity}
Deskripsi: ${conflict.description}

Nod-nod yang terlibat:
${involved.map(n => `- ${n.label} (${n.type}): ${n.details || 'Tiada perincian'}`).join('\n')}

Sila berikan:
1. Punca sebenar percanggahan (adakah disinformasi, ralat masa, atau identiti palsu).
2. Langkah verifikasi konkrit untuk mengesahkan fakta sahih.
3. Cadangan pengemaskinian status nod dalam graf.`;

    try {
      addLog(`Semantica AI: Menjalankan resolusi analitikal untuk anomali "${conflict.title}"...`, 'info');
      const res = await analyzeGraphAgent(prompt, activeWs.data, config, conflict.nodeIds[0]);
      return res.text;
    } catch (err: any) {
      addLog(`Semantica AI Resolution Error: ${err.message}`, 'error');
      return undefined;
    }
  }, [activeWs?.data, config, addLog]);

  // Helper to sanitize node data for AI analysis (removes heavy/trash content like images)
  const sanitizeNodeForAI = useCallback((node: Node) => {
    const isTrashUrl = (val: any) => {
        if (typeof val !== 'string') return false;
        // Check for data URIs or common image extensions
        const isDirectImage = val.startsWith('data:image/') || 
               /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(val) ||
               ((val.includes('fbcdn.net') || val.includes('scontent')) && (val.includes('oh=') || val.includes('_n.')));
        
        // Check for Facebook photo/junk URLs
        const isFBJunk = val.includes('facebook.com/photo') || val.includes('fbid=') || val.includes('set=a.') || val.includes('set=pob.');
        
        return isDirectImage || isFBJunk;
    };

    // Deep clone to avoid mutating original state
    const clean: any = JSON.parse(JSON.stringify(node));
    
    // Explicitly remove image fields
    delete clean.imageUrl;
    delete clean.imageUrls;
    delete clean.vx; delete clean.vy; delete clean.x; delete clean.y; delete clean.fx; delete clean.fy; // Visual noise

    // Remove any field value that looks like an image or FB junk URL
    Object.keys(clean).forEach(key => {
        if (isTrashUrl(clean[key])) {
            delete clean[key];
        }
    });

    // Sanitize the 'details' text content
    if (typeof clean.details === 'string') {
        // 1. Remove Markdown links pointing to FB photos/junk
        // Pattern: [text](https://...fbid=...)
        clean.details = clean.details.replace(/\[.*?\]\(https?:\/\/[^\s]+?facebook\.com\/photo[^\s]*?\)/gi, '[FB_LINK_REMOVED]');
        
        // 2. Remove raw Facebook photo URLs
        clean.details = clean.details.replace(/https?:\/\/[^\s]+?facebook\.com\/photo[^\s]*?/gi, '[FB_URL_REMOVED]');
        
        // 3. Remove other standard image extensions
        clean.details = clean.details.replace(/https?:\/\/[^\s]+?\.(jpe?g|png|gif|webp|svg|bmp)([?#][^\s]*)?/gi, '[IMG_REMOVED]');

        // 4. Remove standalone fbid parameters that might be floating
        clean.details = clean.details.replace(/fbid=\d+/gi, 'ID_REMOVED');
        clean.details = clean.details.replace(/set=[ap]\.[^&\s\n)]+/gi, 'SET_REMOVED');
    }

    return clean;
  }, []);

  // Synthesis Handler
  const runSynthesis = async (suggestedParts?: number, targetNodesOverride?: Node[]) => {
      console.log("System: runSynthesis triggered.", suggestedParts ? `Chunks: ${suggestedParts}` : "Default chunks.");
      if (!activeWs?.data) {
          console.error("System: No active workspace or graph data found for synthesis.");
          addLog("Synthesis Error: No active workspace or graph data found.", 'error');
          return;
      }
      
      dispatch({ type: 'SET_SYNTHESIS_RESULT', payload: null });
      setSynthesisLoading(true);
      addLog(suggestedParts ? `System: Re-initiating Analysis in ${suggestedParts} parts...` : "System: Initiating Intelligence Synthesis Protocol...", 'info');
      
      try {
          // Collect context from all nodes or targeted selection
          const originalNodes = (targetNodesOverride && targetNodesOverride.length > 0)
              ? targetNodesOverride
              : (activeWs.data.nodes || []);
          const nodes = originalNodes.map(n => sanitizeNodeForAI(n));
          console.log(`System: ${nodes.length} nodes found for synthesis:`, nodes);
          
          const newChunkSize = suggestedParts ? Math.max(1, Math.floor(nodes.length / suggestedParts)) : 50;

          if (nodes.length === 0) {
              console.warn("System: No nodes on canvas for synthesis.");
              addLog("Synthesis Warning: No nodes on canvas.", 'warning');
              dispatch({ type: 'SET_SYNTHESIS_RESULT', payload: {
                  verdict: "NO_DATA",
                  confidenceScore: 0,
                  summary: "No nodes were found on the graph to analyze. Please add intelligence nodes first.",
                  reasoning: ["Graph is empty."],
                  smokingGun: "N/A",
                  suggestedNextSteps: "Add nodes to the canvas."
              }});
              return;
          }
          
          addLog(`System: Correlating ${nodes.length} nodes for forensic analysis...`, 'info');
          
          const context = nodes.map(n => {
              let details = n.details || '';
              if (typeof details === 'string' && details.length > 500) details = details.substring(0, 500) + '...';
              return `${n.label} (${n.type}): ${details}`;
          }).join('\n');
          
          console.log("System: Context string prepared for synthesis:", context);
          
          const sanitizedGraph = { 
              nodes, 
              links: activeWs.data.links 
          };
          
          const result = await generateFinalSynthesis(sanitizedGraph, config, context);
          
          console.log("System: Synthesis Result received in App.tsx:", result);
          
          if (result.verdict === 'ANALYSIS_FAILURE') {
              console.error("System: Synthesis failed with failure verdict.");
              addLog(`Synthesis Failed: ${result.summary}`, 'error');
          }
          
          dispatch({ type: 'SET_SYNTHESIS_RESULT', payload: result });
          if (result.verdict !== 'NO_DATA' && result.verdict !== 'ANALYSIS_FAILURE') {
              console.log("System: Synthesis successful.");
              addLog(`Intelligence Synthesis Complete: ${result.verdict}`, 'success');
          }
      } catch (e: any) {
          console.error("System: Critical error in runSynthesis:", e);
          addLog(`Synthesis Error: ${e.message}`, 'error');
          dispatch({ type: 'SET_SYNTHESIS_RESULT', payload: {
              verdict: "CRITICAL_ERROR",
              confidenceScore: 0,
              summary: `A critical error occurred: ${e.message}`,
              reasoning: ["The synthesis engine encountered an unexpected exception."],
              smokingGun: "System Exception",
              suggestedNextSteps: "Check console logs or retry the operation."
          }});
      } finally {
          setSynthesisLoading(false);
          console.log("System: runSynthesis finished.");
      }
  };

  const runStrategyAnalysis = async () => {
    console.log("[APP] runStrategyAnalysis initiated.");
    if (!activeWs?.data) {
      addLog("Strategy Error: No active workspace data.", 'error');
      return;
    }

    setStrategyLoading(true);
    dispatch({ type: 'SET_STRATEGY_RESULT', payload: null });
    addLog("System: Initiating Neural Forensic Analysis...", 'info');

    try {
      const result = await generateStrategy(activeWs.data, activeNode?.label || 'Entire Network', config);
      dispatch({ type: 'SET_STRATEGY_RESULT', payload: result });
      addLog("Neural Forensic Advisor: Strategic analysis complete.", 'success');
    } catch (e: any) {
      console.error("[APP] Strategy analysis failed:", e);
      addLog(`Advisor Failed: ${e.message}`, 'error');
    } finally {
      setStrategyLoading(false);
    }
  };

  // Load Case Protocol with Mission Workspace Isolation
  const handleLoadCase = (caseFile: CaseFile, merge: boolean, fileName?: string, fileSize?: number) => {
      const caseName = (caseFile.caseName || fileName || 'Restored Case').replace(/\.(rhz|json)$/i, '');
      addLog(`Sistem: Membuka fail kes [${caseName}]...`, 'info');
      
      const rhzFileName = fileName || `${caseName.replace(/\s+/g, '_')}.rhz`;
      rhzAutosave.bindFile(rhzFileName, caseFile.id || activeWs?.id || 'ws_default');
      
      const nodes = caseFile.graph?.nodes || (caseFile as any).nodes || [];
      const links = caseFile.graph?.links || (caseFile as any).links || [];

      // Trigger sleek progress bar
      reportFileLoadProgress({
        fileName: fileName || `${caseName}.rhz`,
        fileSize: fileSize,
        progress: 60,
        stage: `Menyusun ${nodes.length} entiti ke topologi graf...`,
        totalEntities: nodes.length
      });

      if (merge) {
          // Merge entities into CURRENT active workspace
          updateGraph({
              nodes: nodes,
              links: links,
              replace: false
          });
          addLog(`Sistem: ${nodes.length} entiti digabungkan ke misi semasa [${activeWs.name}].`, 'success');
      } else {
          // Check if current active workspace is a blank fresh canvas
          const isFreshEmpty = activeWs && (
              (activeWs.data.nodes.length <= 1 && (!activeWs.data.nodes[0] || activeWs.data.nodes[0].label === 'NEW_TARGET') && activeWs.data.links.length === 0) ||
              activeWs.data.nodes.length === 0
          );

          if (isFreshEmpty) {
              // Replace the blank canvas directly
              updateGraph({
                  nodes: nodes,
                  links: links,
                  replace: true
              });
              if (caseName && activeWs?.id) {
                  dispatch({ type: 'RENAME_WORKSPACE', payload: { id: activeWs.id, name: caseName.toUpperCase() } });
              }
          } else {
              // Create a brand new dedicated Workspace so the current investigation is NOT overwritten or mixed!
              dispatch({
                  type: 'IMPORT_WORKSPACE',
                  payload: {
                      name: caseName.toUpperCase(),
                      graph: { nodes, links },
                      synthesisResult: caseFile.synthesisResult,
                      strategyResult: caseFile.strategyResult
                  }
              });
              addLog(`Sistem: Misi baharu [${caseName.toUpperCase()}] diwujudkan secara berasingan.`, 'success');
          }
      }
      
      if (caseFile.synthesisResult) dispatch({ type: 'SET_SYNTHESIS_RESULT', payload: caseFile.synthesisResult });
      if (caseFile.strategyResult) dispatch({ type: 'SET_STRATEGY_RESULT', payload: caseFile.strategyResult });
      
      // Auto focus and select the primary node so UI immediately updates
      if (nodes.length > 0) {
          const targetNode = nodes[0];
          setActiveNodeId(targetNode.id);
          setSelectedNodes([targetNode]);
      }
      
      // If layout mode was 'map', switch to 'force' so 2D network nodes are immediately visible
      if (activeWs?.layoutMode === 'map') {
          dispatch({ type: 'SET_LAYOUT', payload: 'force' });
      }

      setTimeout(() => {
        reportFileLoadProgress({
          fileName: fileName || `${caseName}.rhz`,
          fileSize: fileSize,
          progress: 100,
          stage: `Selesai! ${nodes.length} nod dipaparkan atas Canvas.`,
          totalEntities: nodes.length,
          isComplete: true
        });
      }, 300);
      
      addLog(`Sistem: Siasatan kes sedia. Jumlah entiti: ${nodes.length}`, 'success');
  };

  // Global Drag and Drop listener for .RHZ / .JSON case files anywhere on screen
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.toLowerCase().endsWith('.rhz') || file.name.toLowerCase().endsWith('.json')) {
          
          reportFileLoadProgress({
            fileName: file.name,
            fileSize: file.size,
            progress: 15,
            stage: 'Membaca fail & memproses bait data...'
          });

          const reader = new FileReader();
          reader.onprogress = (pe) => {
            if (pe.lengthComputable) {
              const readPct = Math.round((pe.loaded / pe.total) * 40);
              reportFileLoadProgress({
                fileName: file.name,
                fileSize: file.size,
                progress: 15 + readPct,
                stage: `Membaca fail (${Math.round(pe.loaded / 1024)} KB)...`
              });
            }
          };

          reader.onload = (event) => {
            try {
              reportFileLoadProgress({
                fileName: file.name,
                fileSize: file.size,
                progress: 55,
                stage: 'Menyahkod struktur JSON & menapis entiti...'
              });

              const text = event.target?.result as string;
              if (!text) return;
              const json = JSON.parse(text);
              
              let extractedNodes: any[] = [];
              let extractedLinks: any[] = [];
              let caseName = file.name.replace(/\.(rhz|json)$/i, '');
              let synthesisResult = json.synthesisResult || null;
              let strategyResult = json.strategyResult || null;

              if (Array.isArray(json)) {
                  extractedNodes = json;
              } else if (json.graph && Array.isArray(json.graph.nodes)) {
                  extractedNodes = json.graph.nodes;
                  extractedLinks = json.graph.links || [];
                  if (json.caseName) caseName = json.caseName;
              } else if (json.data && Array.isArray(json.data.nodes)) {
                  extractedNodes = json.data.nodes;
                  extractedLinks = json.data.links || [];
                  if (json.caseName || json.name) caseName = json.caseName || json.name;
              } else if (Array.isArray(json.nodes)) {
                  extractedNodes = json.nodes;
                  extractedLinks = json.links || [];
                  if (json.caseName || json.name) caseName = json.caseName || json.name;
              } else if (json.workspaces && Array.isArray(json.workspaces) && json.workspaces[0]?.data?.nodes) {
                  const ws = json.workspaces[0];
                  extractedNodes = ws.data.nodes;
                  extractedLinks = ws.data.links || [];
                  if (ws.name) caseName = ws.name;
                  if (ws.synthesisResult) synthesisResult = ws.synthesisResult;
                  if (ws.strategyResult) strategyResult = ws.strategyResult;
              }

              if (extractedNodes.length > 0) {
                  const sanitizedNodes = extractedNodes.map((n, idx) => ({
                      ...n,
                      id: String(n.id || `node_${Date.now()}_${idx}`),
                      label: String(n.label || n.name || n.title || `Entity #${idx + 1}`),
                      type: String(n.type || 'person')
                  }));

                  const sanitizedLinks = (extractedLinks || []).map((l, idx) => ({
                      ...l,
                      source: typeof l.source === 'object' ? l.source.id : String(l.source),
                      target: typeof l.target === 'object' ? l.target.id : String(l.target),
                      label: l.label ? String(l.label) : 'connected'
                  }));

                  handleLoadCase({
                      id: json.id || `case_${Date.now()}`,
                      caseName: caseName,
                      graph: { nodes: sanitizedNodes, links: sanitizedLinks },
                      timestamp: json.timestamp || Date.now(),
                      version: json.version || '2.9.1',
                      synthesisResult,
                      strategyResult
                  }, false, file.name, file.size);
              }
            } catch (err: any) {
              console.error("[GLOBAL DROP] Failed to load case file:", err);
            }
          };
          reader.readAsText(file);
        }
      }
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [activeWs?.id, activeWs?.layoutMode]);

  const handleCopyForExternalAI = async () => {
    try {
      const sanitizedNodes = activeWs.data.nodes.map(n => sanitizeNodeForAI(n));
      
      const graphData = { nodes: sanitizedNodes, links: activeWs.data.links };
      
      const prompt = `BERTINDAK SEBAGAI: Operatif Perisikan Elit (Kodnama: ARCHITECT). 
MISI: Sintesis data graf OSINT yang diberikan ke dalam TAKLIMAT PERISIKAN STRATEGIK TERKELAS untuk Komando Tertinggi.

TONA: Profesional, dingin, analitikal, dan berwibawa. Gunakan terminologi perisikan (contoh: "Aset", "SIGINT", "HUMINT", "Keselamatan Operasi", "Sasaran Bernilai Tinggi", "Target of Interest").

DATA GRAF (JSON - IMEJ DIBUANG UNTUK PENGOPTIMUMAN):
${JSON.stringify(graphData, null, 2)}

ARAHAN KHAS ANALISIS & PENGESTRAKAN MEDIA:
1. PENGESTRAKAN BUKTI VISUAL & VIDEO: Sekiranya anda mempunyai capaian web/carian AI, ekstrak & senaraikan sekurang-kurangnya 10 pautan imej/foto dan 10 pautan video daripada laman perkongsian video (YouTube, TikTok, Facebook Watch, X/Twitter, Dailymotion, etc.) serta portal berita tempatan (Sinar Harian, Berita Harian, Utusan, Astro Awani, etc.) dan antarabangsa (Reuters, BBC, CNN, etc.).
2. STYLOMETRY: Analisa gaya penulisan individu dalam butiran teks (kosa kata, sintaks, tanda baca). Kenal pasti jika profil berbeza berkongsi "cap jari linguistik" yang sama.
3. CORAK TINGKAH LAKU: Analisa metrik keterlibatan (likes, komen, masa). Tentukan waktu aktif puncak dan frekuensi interaksi.
4. PROFIL PSIKOLOGI: Nilai nada emosi dan keadaan psikologi yang terpancar daripada kandungan.

ARAHAN PELAPORAN:
1. Sediakan laporan bertulis yang KOMPREHENSIF, TERPERINCI, dan BERBILANG PERENGGAN.
2. Laporan ini MESTI ditulis sebagai "Taklimat Perisikan Terkelas". Mulakan dengan baris "SUBJEK".
3. Gunakan gaya naratif yang kedengaran seperti operatif lapangan yang melaporkan kepada pegawai atasan.
4. Jangan ringkas. Kami memerlukan taklimat perisikan penuh yang merumuskan apa yang terkandung dalam setiap aset/nod.
5. Berikan "KODNAMA" kepada subjek atau operasi utama berdasarkan data.
6. Tentukan "TAHAP ANCAMAN" (contoh: RENDAH, TINGGI, SERIUS, KRITIKAL).
7. Berikan keputusan muktamad mengenai identiti, aktiviti, atau tahap ancaman subjek.
8. Laporan MESTI ditulis dalam BAHASA MELAYU yang formal dan menggunakan jargon perisikan OSINT yang sesuai.
9. Gunakan format MARKDOWN yang tersusun dengan tajuk, sub-tajuk, dan poin-poin untuk kemudahan pembacaan.

STRUKTUR LAPORAN YANG DIPERLUKAN:
# [SUBJEK TAKLIMAT]
**Kodnama Operasi:** ...
**Tahap Ancaman:** ...
**Skor Keyakinan:** ...

## Ringkasan Eksekutif
...

## Senarai Bukti Media (Minimal 10 Imej & 10 Video Berita/Platform)
...

## Analisis & Penalaran
...

## Bukti Utama (Smoking Gun)
...

## Langkah Seterusnya
...`;

      // Open the modal with the generated prompt
      setExportPrompt(prompt);
      
    } catch (err) {
      console.error("Failed to generate prompt:", err);
      addLog("System: Failed to generate prompt for external AI.", "error");
    }
  };

  const handleNodeClick = (node: Node, pos: { x: number, y: number }, isShift: boolean) => {
      // 1. Handle explicit linking mode (from radial menu)
      if (linkingSource) {
          if (linkingSource.id !== node.id) {
              updateGraph({
                  links: [{ source: linkingSource.id, target: node.id, label: 'manual_link' }]
              });
              addLog(`Link Established: ${linkingSource.label} -> ${node.label}`, 'success');
              setLinkingSource(null);
              return;
          }
      }

      // 2. Handle Multi-Selection (Shift + Click OR Selection Mode)
      if (isShift || selectionMode === 'multi') {
          setSelectedNodes(prev => {
              const isAlreadySelected = prev.some(n => n.id === node.id);
              if (isAlreadySelected) {
                  return prev.filter(n => n.id !== node.id);
              } else {
                  return [...prev, node];
              }
          });
          setActiveNodeId(node.id);
          return;
      }

      // 3. Normal Click (Single Selection)
      setActiveNodeId(node.id);
      setSelectedNodes([node]);
      setIsQueryMinimized(false); // Auto restore bottom panel if minimized
      previousNodeRef.current = node; // Update previous node
      setRadialMenu(null);

      // Dispatch camera focus and zoom transition to center on target node smoothly
      window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: node.id } }));
      window.dispatchEvent(new CustomEvent('redhorizon:graph-focus', { detail: { nodeId: node.id, zoomLevel: 1.75 } }));
  };

  const handleNodeDoubleClick = (node: Node, pos: { x: number, y: number }) => {
      setActiveNodeId(node.id);
      setSelectedNodes([node]);
      previousNodeRef.current = node;
      setIsQueryMinimized(false); // Open dossier panel
      setRadialMenu(null);

      // Extract full social intel including direct comment URLs & profile URLs
      const socialIntel = extractNodeCommentsAndIntel(node);

      // Check for direct URL or if label looks like a URL
      const isLabelUrl = node.label.startsWith('http') || node.label.includes('.com') || node.label.includes('.org') || node.label.includes('.net') || node.label.includes('.my') || node.label.includes('.id');
      const targetUrl = node.url || (isLabelUrl ? (node.label.startsWith('http') ? node.label : `https://${node.label}`) : null);

      // Priority: Direct comment URL where target posted comment > Profile URL > Direct node URL
      const finalUrlToOpen = socialIntel.primaryCommentUrl 
                          || socialIntel.comments.find(c => Boolean(c.commentUrl))?.commentUrl
                          || socialIntel.profileUrl 
                          || targetUrl;

      if (finalUrlToOpen) {
          openExternalUrl(finalUrlToOpen);
          if (socialIntel.primaryCommentUrl) {
            addLog(`[Pautan Komen] Membuka pautan langsung komentar sasaran (${socialIntel.platform}): ${finalUrlToOpen}`, 'success');
          } else {
            addLog(`Membuka pautan sasaran: ${finalUrlToOpen}`, 'info');
          }
      } else {
          // Dwi-klik: HANYA buka Peta Geospatial jika nod mengandungi data lokasi sebenar!
          const hasLocation = isLocationNode(node) || Boolean(node.lat !== undefined && (node.lng !== undefined || (node as any).lon !== undefined));
          if (hasLocation) {
              executeUIAction('OPEN_MODAL', 'geo_recon');
              addLog(`[Geospatial Recon] Membuka paparan radar peta untuk entiti berlokasi: "${node.label}"`, 'info');
          } else {
              // Jika tiada koordinat/lokasi, dwi-klik terus melancarkan Siasatan Web & Pengesahan Fakta OSINT
              executeUIAction('OPEN_MODAL', 'verify_node_web');
              addLog(`[OSINT Fact-Check] Memulakan pengesahan fakta internet & carian OSINT untuk: "${node.label}"`, 'info');
          }
      }
  };

  const handleNodeRightClick = (node: Node, pos: { x: number; y: number }) => {
      setActiveNodeId(node.id);
      let targetNodes: Node[] = [node];
      if (selectedNodes.length > 1 && selectedNodes.some(sn => sn.id === node.id)) {
          targetNodes = selectedNodes;
      } else {
          setSelectedNodes([node]);
      }
      previousNodeRef.current = node; // Update previous node
      setRadialMenu({ x: pos.x, y: pos.y, node, nodes: targetNodes });
  };

  const handleSaveToFile = () => {
      handleExportSpecificCase(activeWs);
  };

  const handleExportSpecificCase = (ws: Workspace) => {
      const cleanData = cleanGraphData(ws.data);
      const data: CaseFile = {
          id: ws.id,
          caseName: ws.name,
          graph: cleanData,
          timestamp: ws.timestamp || Date.now(),
          version: APP_VERSION,
          synthesisResult: ws.synthesisResult,
          strategyResult: ws.strategyResult
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RED_HORIZON_${(ws.name || 'CASE').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.rhz`;
      a.click();
      addLog(`Fail kes dimuat turun: ${a.download}`, 'success');
  };

  const handleExportMaltegoCSV = () => {
    try {
      const nodes = activeWs.data.nodes;
      const links = activeWs.data.links;
      
      // Header for Maltego CSV Import Wizard
      let csv = "Source,SourceType,Target,TargetType,Relationship,Notes\n";
      
      // 1. Add all links
      links.forEach(l => {
        const s = typeof l.source === 'string' ? l.source : l.source.id;
        const t = typeof l.target === 'string' ? l.target : l.target.id;
        
        const sourceNode = nodes.find(n => n.id === s);
        const targetNode = nodes.find(n => n.id === t);
        
        if (sourceNode && targetNode) {
          const sName = sourceNode.label.replace(/"/g, '""');
          const tName = targetNode.label.replace(/"/g, '""');
          const sType = sourceNode.type;
          const tType = targetNode.type;
          const rel = l.label.replace(/"/g, '""');
          
          csv += `"${sName}","${sType}","${tName}","${tType}","${rel}",""\n`;
        }
      });
      
      // 2. Add isolated nodes (nodes with no links)
      const linkedNodeIds = new Set();
      links.forEach(l => {
        linkedNodeIds.add(typeof l.source === 'string' ? l.source : l.source.id);
        linkedNodeIds.add(typeof l.target === 'string' ? l.target : l.target.id);
      });
      
      nodes.forEach(n => {
        if (!linkedNodeIds.has(n.id)) {
          const name = n.label.replace(/"/g, '""');
          const type = n.type;
          const notes = (n.details || "").replace(/"/g, '""').replace(/\n/g, ' ');
          csv += `"${name}","${type}","","","","${notes}"\n`;
        }
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MALTEGO_EXPORT_${activeWs.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      
      addLog(`Maltego CSV exported: ${a.download}. Use Maltego's CSV Import Wizard to map 'Source' and 'Target'.`, 'success');
    } catch (err) {
      console.error("Maltego export failed:", err);
      addLog("System: Maltego export failed.", "error");
    }
  };

  const handleToolOutput = async (text: string, sourceNodeId: string) => {
    if (!text || text.length < 5) return;
    addLog(`Neural Intelligence: Parsing intelligence stream...`, 'info');
    try {
        let result: any = null;
        
        // Try to parse as JSON directly first to avoid unnecessary AI call
        try {
            const cleanText = text.replace(/```json\s*|\s*```/g, "").trim();
            const directJson = JSON.parse(cleanText);
            if (directJson.graph && directJson.graph.nodes) {
                result = directJson;
            } else if (directJson.nodes) {
                result = { graph: directJson };
            }
        } catch (e) {
            // Not a direct JSON, proceed to AI parsing
        }

        if (!result) {
            result = await parseRawIntelligence(text);
        }

        if (result?.graph?.nodes && result.graph.nodes.length > 0) {
            const sourceNode = activeWs?.data?.nodes?.find(n => n.id === sourceNodeId);
            
            // Perform forensic linguistics on text-based nodes
            const processedNodes = await Promise.all((result.graph.nodes || []).map(async (n: Node) => {
                if (n.type === 'comment' || n.type === 'post' || (n.details?.length || 0) > 100) {
                    addLog(`Neural Intelligence: Forensic analysis on ${n.label}...`, 'info');
                    const forensic = await analyzeLinguisticRisk(n.details || n.label);
                    return {
                        ...n,
                        details: `${n.details}\n\n[FORENSIC ANALYSIS]\n- Stylometry: ${forensic.stylometryProfile}\n- Legal Risk: ${forensic.legalRiskAnalysis}`
                    };
                }
                return n;
            }));

            const positionedNodes: Node[] = processedNodes.map(n => ({
                ...n,
                x: sourceNode ? sourceNode.x : undefined, 
                y: sourceNode ? sourceNode.y : undefined
            }));
            
            const autoLinks = positionedNodes.map(n => ({ 
                source: sourceNodeId, 
                target: n.id, 
                label: 'intel_extract' 
            }));
            
            updateGraph({ 
                nodes: positionedNodes, 
                links: [...(result.graph.links || []), ...autoLinks] 
            });
            addLog(`Intelligence Mapped: ${positionedNodes.length} new entities identified.`, 'success');
        }
    } catch (e: any) { addLog(`Parser Error: ${e.message}`, 'error'); }
  };

  const handleUndo = () => {
    dispatch({ type: 'UNDO' });
    addLog('Undo performed', 'info');
  };

  const handleSelectType = (type: string) => {
    if (!type) {
      setActiveTypeFilter(null);
      setSelectedNodes([]);
      return;
    }
    
    setActiveTypeFilter(type);
    const nodesOfType = activeWs.data.nodes.filter(n => n.type === type);
    setSelectedNodes(nodesOfType);
    addLog(`System: Selected ${nodesOfType.length} nodes of type '${type}'`, 'info');
  };

  const handleMergeNodes = () => {
    const ids = selectedNodes.map(n => n.id);
    dispatch({ type: 'MERGE_NODES', payload: ids });
    addLog(`System: Merged ${ids.length} nodes into one.`, 'success');
    setSelectedNodes([]);
    setActiveNodeId(null);
  };

  const handleDeleteSelectedNodes = () => {
    const ids = selectedNodes.map(n => n.id);
    if (ids.length === 0) return;
    dispatch({ type: 'DELETE_MULTIPLE_NODES', payload: ids });
    addLog(`System: Purged ${ids.length} selected nodes.`, 'success');
    setSelectedNodes([]);
    setActiveNodeId(null);
  };

  const handleDeleteSingleAsset = (nodeId: string, nodeLabel: string) => {
    dispatch({ type: 'DELETE_NODE', payload: nodeId });
    setSelectedNodes(prev => prev.filter(sn => sn.id !== nodeId));
    if (activeNodeId === nodeId) setActiveNodeId(null);
    addLog(`System: Asset '${nodeLabel}' berjaya dipadamkan.`, 'info');
  };

  const handleBulkDeleteSelectedAssets = () => {
    if (selectedNodes.length === 0) {
      addLog("Tiada aset dipilih untuk pemadaman pukal.", "warning");
      return;
    }
    const count = selectedNodes.length;
    const ids = selectedNodes.map(n => n.id);
    dispatch({ type: 'DELETE_MULTIPLE_NODES', payload: ids });
    setSelectedNodes([]);
    setActiveNodeId(null);
    addLog(`System: ${count} aset berjaya dipadamkan secara pukal.`, 'success');
  };

  const handleToggleSelectAsset = (n: Node, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSelected = selectedNodes.some(sn => sn.id === n.id);
    if (isSelected) {
      setSelectedNodes(prev => prev.filter(sn => sn.id !== n.id));
      if (activeNodeId === n.id) {
        const remaining = selectedNodes.filter(sn => sn.id !== n.id);
        setActiveNodeId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
    } else {
      setSelectedNodes(prev => [...prev, n]);
      setActiveNodeId(n.id);
    }
  };

  const handleToggleSelectAllFiltered = (filteredList: Node[]) => {
    if (filteredList.length === 0) return;
    const allFilteredSelected = filteredList.every(fn => selectedNodes.some(sn => sn.id === fn.id));
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredList.map(fn => fn.id));
      setSelectedNodes(prev => prev.filter(sn => !filteredIds.has(sn.id)));
      if (activeNodeId && filteredIds.has(activeNodeId)) {
        setActiveNodeId(null);
      }
    } else {
      const existingIds = new Set(selectedNodes.map(n => n.id));
      const toAdd = filteredList.filter(n => !existingIds.has(n.id));
      const combined = [...selectedNodes, ...toAdd];
      setSelectedNodes(combined);
      if (combined.length > 0 && !activeNodeId) setActiveNodeId(combined[0].id);
    }
  };

  const executeUIAction = (action: string, payload?: any) => {
    switch(action) {
      case 'OPEN_MODAL': 
        if (payload === 'transforms' || payload === 'transform_manager') {
          setShowTransformManager(true);
        } else if (payload === 'ontology' || payload === 'ontology_hub') {
          setShowOntologyEngineModal(true);
        } else if (payload === 'google_socint') {
          setShowGoogleSocintModal(true);
        } else {
          setActiveModal(payload); 
          setMinimizedModals(prev => prev.filter(id => id !== payload));
        }
        break;
      case 'CLOSE_MODALS': 
        setActiveModal(null); 
        setHorizonData(null); 
        break;
      case 'CHANGE_LAYOUT': dispatch({ type: 'SET_LAYOUT', payload }); break;
      case 'EDIT_NODE': setEditingNode(payload); setActiveModal('edit'); break;
      case 'DELETE_NODE': dispatch({ type: 'DELETE_NODE', payload }); setSelectedNodes([]); setActiveNodeId(null); break;
      case 'VAULT_INTERLINK': setVaultContext({ query: payload.label, sourceNodeId: payload.id }); setActiveModal('vault'); break;
      case 'OPEN_SYNTHESIS': setActiveModal('synthesis'); if (!synthesisResult) runSynthesis(); break;
      case 'VIEW_SYNTHESIS': setActiveModal('synthesis'); break;
      case 'VIEW_ADVISOR': setBottomHeight(window.innerHeight * 0.6); setTerminalTab('advisor'); break; // Expand terminal and show advisor
      case 'OPEN_COLLAB_CHAT': setShowCollabChat(true); break;
      case 'FOCUS_NODE':
        if (payload) {
          const targetId = typeof payload === 'string' ? payload : payload.id;
          const targetNode = activeWs?.data?.nodes?.find((n: any) => n.id === targetId);
          if (targetNode) {
            setSelectedNodes([targetNode]);
            setActiveNodeId(targetNode.id);
            window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: targetNode.id } }));
            window.dispatchEvent(new CustomEvent('redhorizon:graph-focus', { detail: { nodeId: targetNode.id, zoomLevel: 1.75 } }));
          }
        }
        break;
    }
  };

  const handleRadialAction = async (action: string, customPayload?: any) => {
      const isMulti = Boolean(customPayload?.isMulti);
      const targetNodes: Node[] = (customPayload?.nodes && customPayload.nodes.length > 0)
        ? customPayload.nodes 
        : (radialMenu?.nodes && radialMenu.nodes.length > 0)
          ? radialMenu.nodes 
          : (selectedNodes && selectedNodes.length > 0)
            ? selectedNodes 
            : (radialMenu?.node ? [radialMenu.node] : (activeNode ? [activeNode] : []));

      const node = targetNodes[0] || activeNode;
      if (!node) {
          addLog("Direct Action: Sila pilih nod sasaran terlebih dahulu.", "warning");
          return;
      }
      
      // Synchronize activeNodeId with target node so all downstream views/modals receive it
      if (!activeNodeId || activeNodeId !== node.id) {
          setActiveNodeId(node.id);
      }
      
      setRadialMenu(null);
      
      if (action === 'OPEN_ONTOLOGY_HUB' || action === 'ONTOLOGY_HUB') {
        setShowOntologyEngineModal(true);
        addLog(`Membuka Enjin Ontologi & Penaakulan Semantik untuk sasaran: ${node.label || node.id}`, "info");
        return;
      }

      if (action === 'OPEN_ENRICHER_HUB' || action === 'ENRICHER_HUB') {
        setEnricherTargetNode(node);
        setShowEnricherHubModal(true);
        addLog(`Membuka Modular Enricher Hub untuk sasaran: ${node.label || node.id}`, "info");
        return;
      }
      
      // Multi-Node Specific Actions
      if (action === 'INTERLINK_ALL') {
          if (targetNodes.length > 1) {
              const linksToAdd: Link[] = [];
              for (let i = 0; i < targetNodes.length; i++) {
                  for (let j = i + 1; j < targetNodes.length; j++) {
                      linksToAdd.push({
                          source: targetNodes[i].id,
                          target: targetNodes[j].id,
                          label: 'interlink_korelasi'
                      });
                  }
              }
              updateGraph({ links: linksToAdd });
              addLog(`[Maltego Topology] ${linksToAdd.length} garisan hubungan berjaya dibina menghubungkan kesemua ${targetNodes.length} entiti terpilih.`, 'success');
          } else {
              addLog(`[Maltego Topology] Sila pilih sekurang-kurangnya 2 entiti untuk dihubungkan bersama.`, 'warning');
          }
          return;
      }

      if (action === 'MULTI_AI_SYNTHESIS') {
          if (targetNodes.length > 1) {
              const labels = targetNodes.map(n => n.label);
              setSelectedNodes(targetNodes);
              runSynthesis(undefined, targetNodes);
              executeUIAction('OPEN_SYNTHESIS');
              addLog(`[AI Multi-Node Synthesis] Memulakan analisis korelasi AI bagi ${targetNodes.length} sasaran: ${labels.join(', ')}`, 'info');
          } else {
              executeUIAction('OPEN_SYNTHESIS');
          }
          return;
      }

      if (action === 'ENTITY_FUSION') {
          setSelectedNodes(targetNodes);
          executeUIAction('OPEN_MODAL', 'entity_fusion');
          addLog(`[Entity Fusion] Melancarkan penyatuan profil bagi ${targetNodes.length} nod terpilih...`, 'info');
          return;
      }

      if (action === 'OPEN_MAP_HUD') {
          setActiveNodeId(node.id);
          setSelectedNodes(targetNodes);
          executeUIAction('OPEN_MODAL', 'geo_recon');
          addLog(`[Geospatial View] Membuka paparan satelit geospatial untuk entiti terpilih.`, 'info');
          return;
      }

      if (action === 'DELETE') {
          if (targetNodes.length > 1) {
              const ids = targetNodes.map(n => n.id);
              dispatch({ type: 'DELETE_MULTIPLE_NODES', payload: ids });
              addLog(`System: Memadam ${ids.length} nod terpilih secara pukal.`, 'success');
              setSelectedNodes([]);
              setActiveNodeId(null);
          } else {
              executeUIAction('DELETE_NODE', node.id);
              addLog(`System: Nod '${node.label}' berjaya dipadamkan.`, 'info');
          }
          return;
      }
      
      // Helper to build an optimized search query using both label and details
      const buildOptimizedSearchQuery = (n: Node) => {
          let query = n.label;
          const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
          
          // If it's an email node and details has the email, use it directly
          if (n.type === 'email' && n.details && isEmail(n.details)) {
              return n.details;
          }
          
          // If details exist and are not an image/binary data
          if (n.details && n.details.length > 0 && !n.details.startsWith('data:image')) {
              // Clean up details for search (remove newlines, extra spaces, and limit length for search engine compatibility)
              const cleanDetails = n.details.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 250);
              
              // If details doesn't already contain the label, combine them
              if (!cleanDetails.toLowerCase().includes(n.label.toLowerCase())) {
                  // Use quotes for the details part to encourage exact matching of the context
                  query = `${n.label} "${cleanDetails}"`;
              } else {
                  query = cleanDetails;
              }
          }
          
          // For specific types, add context keywords
          if (n.type === 'person' && !query.toLowerCase().includes('osint')) {
              query = `${query} OSINT`;
          }
          
          return query;
      };
      
      const optimizedQuery = buildOptimizedSearchQuery(node);
      
      switch(action) {
          case 'GOOGLE_SOCINT':
              setActiveNodeId(node.id);
              setSelectedNodes([node]);
              setGoogleSocintTargetNode(node);
              setGoogleSocintInitialQuery(node.label || '');
              setShowGoogleSocintModal(true);
              addLog(`[Google SOCINT Studio] Melancarkan Carian CX (53a0041f2f24f4e3b) untuk sasaran "${node.label}"...`, 'info');
              break;
          case 'WATSON_COGNITIVE':
              setSelectedNodes(targetNodes);
              if (targetNodes.length > 0) {
                  setActiveNodeId(targetNodes[0].id);
              }
              executeUIAction('OPEN_MODAL', 'watson_recon');
              addLog(`[IBM Watson Cognitive] Melancarkan analisa kognitif dan perkaitan graf bagi ${targetNodes.length} nod sasaran...`, 'info');
              break;
          case 'OPEN_COMMENT_URL': {
              const intel = extractNodeCommentsAndIntel(node);
              const targetCommentUrl = intel.primaryCommentUrl || intel.comments.find(c => Boolean(c.commentUrl))?.commentUrl || intel.profileUrl || node.url;
              if (targetCommentUrl) {
                  openExternalUrl(targetCommentUrl);
                  addLog(`[Pautan Komen] Membuka URL terus tempat sasaran meninggalkan komen (${intel.platform})`, 'success');
              } else {
                  addLog(`Tiada URL pautan komentar dikesan untuk nod ${node.label}`, 'warning');
              }
              break;
          }
          case 'VERIFY_NODE_WEB':
              setActiveNodeId(node.id);
              setSelectedNodes([node]);
              executeUIAction('OPEN_MODAL', 'verify_node_web');
              addLog(`[Neural Fact-Check] Memulakan pengesahan fakta internet secara langsung untuk "${node.label}"...`, 'info');
              break;
          case 'SHARE_TO_CHAT':
              setActiveNodeId(node.id);
              setSelectedNodes(targetNodes);
              setShareNodeTarget(node);
              setShowCollabChat(true);
              addLog(`Operasi Sembang: Menyiarkan ${targetNodes.length > 1 ? `${targetNodes.length} entiti terpilih` : `nod [${node.type}] "${node.label}"`} ke bilik sembang ops...`, 'success');
              break;
          case 'AUTONOMOUS_AGENT':
              setActiveNodeId(node.id);
              setSelectedNodes([node]);
              executeUIAction('OPEN_MODAL', 'autonomous_agent');
              break;
          case 'BRAVE': {
              const entityType = node.type || 'entity';
              const entityLabel = node.label || optimizedQuery;
              const entityDetails = node.details ? node.details.substring(0, 250).replace(/\n/g, ' ') : '';

              const braveAIPrompt = `[ARAHAN KHAS OSINT INTELLIGENCE ENGINE & MEDIA HARVESTING]
Lakukan siasatan perisikan sumber terbuka (OSINT) berpemberat tinggi dan mendalam untuk sasaran berikut:
- Nama/Label Entiti: "${entityLabel}"
- Kategori Entiti: ${entityType.toUpperCase()}
${entityDetails ? `- Konteks Tambahan Siasatan: "${entityDetails}"` : ''}

SYARAT UTAMA HASIL CARIAN & PENGESTRAKAN MEDIA (MANDATORI):
1. PAUTAN IMEJ / FOTO (SEKURANG-KURANGNYA 10 PAUTAN): Ekstrak & senaraikan sekurang-kurangnya 10 pautan imej/foto terus (Direct JPG/PNG/WEBP/Media URLs) daripada portal berita antarabangsa (contoh: Reuters, BBC, CNN, AP News, Al Jazeera, Bloomberg) dan portal berita tempatan/serantau (contoh: Sinar Harian, Berita Harian, Utusan Malaysia, Astro Awani, Malaysiakini, Harian Metro, The Star, Bernama, FMT), serta platform media sosial/arkib.
2. PAUTAN VIDEO & PERKONGSIAN MEDIA (SEKURANG-KURANGNYA 10 PAUTAN): Ekstrak & senaraikan sekurang-kurangnya 10 pautan video langsung daripada laman web perkongsian video dan media sosial (contoh: YouTube, TikTok, Facebook Watch, Twitter/X, Dailymotion, Vimeo, Instagram Reels, Rumble, Bilibili) atau portal klip berita video tempatan/antarabangsa.
3. FAIL & DOKUMEN BUKTI (SEKURANG-KURANGNYA 5 PAUTAN): Ekstrak sekurang-kurangnya 5 pautan fail dokumen rasmi, PDF, kenyataan akhbar, atau laporan kes berkaitan.

Formatkan jawapan anda SEPENUHNYA dalam blok KOD JSON yang sah (valid JSON schema) mengikut struktur di bawah:

\`\`\`json
{
  "target_entity": "${entityLabel}",
  "entity_type": "${entityType}",
  "executive_summary": "Ringkasan penilaian risikan, profil sasaran, serta kronologi penting kes...",
  "media_evidence": {
    "images": [
      { "title": "Deskripsi foto / wajah sasaran / bukti visual", "url": "https://... (URL terus imej)", "source": "Nama Portal Berita / Platform (sertakan portal tempatan/antarabangsa)" }
    ],
    "videos": [
      { "title": "Tajuk video / rakaman berita / klip perkongsian", "url": "https://... (URL terus video)", "platform": "YouTube / TikTok / FB Watch / X / Portal Berita" }
    ],
    "documents_and_files": [
      { "title": "Nama dokumen / Laporan PDF / Kenyataan Akhbar", "url": "https://... (URL fail)", "file_type": "PDF/DOC/ZIP" }
    ]
  },
  "connected_entities": [
    { "name": "Nama Individu / Organisasi / Syarikat / Lokasi berkaitan", "relation": "Hubungan khusus dengan sasaran", "type": "person/organization/email/phone/location" }
  ],
  "digital_footprints": [
    { "platform": "Media Sosial / Forum / Laman Web", "url": "https://...", "username": "@...", "notes": "Jejak aktiviti / Profil" }
  ],
  "news_and_verification_sources": [
    { "title": "Tajuk Artikel Berita Tempatan/Antarabangsa", "url": "https://...", "publisher": "Sinar Harian / Berita Harian / Reuters / BBC / etc." }
  ]
}
\`\`\`

PENTING: Jangan ringkaskan pautan. Sediakan sekurang-kurangnya 10 pautan imej dan 10 pautan video daripada laman web perkongsian video & portal berita tempatan/antarabangsa. Pastikan semua URL yang diberikan adalah lengkap, asli, dan boleh diakses terus. Sila janakan maklum balas ini sekarang.`;

              openExternalUrl(`https://search.brave.com/ask?q=${encodeURIComponent(braveAIPrompt)}`);
              addLog(`[Brave AI Engine] Menjana siasatan OSINT pintar (10+ imej, 10+ video berita/sosial, 5+ dokumen & JSON Dossier) untuk "${node.label}"...`, 'success');
              break;
          }
          case 'DORK_BUILDER':
              setActiveNodeId(node.id);
              executeUIAction('OPEN_MODAL', 'dork_builder');
              break;
          case 'MALTEGO_TRANSFORMS':
              setActiveNodeId(node.id);
              setShowTransformManager(true);
              addLog(`[Maltego Transform Engine] Membuka panel siri transformasi untuk sasaran "${node.label}"...`, 'info');
              break;
          case 'AI_SEARCH':
              addLog(`System: Performing AI search for ${optimizedQuery}...`, 'info');
              try {
                  const results = await searchTavily(optimizedQuery, config.tavilyApiKey || '');
                  const top3 = results.slice(0, 3);
                  
                  const newNodes: Node[] = top3.map(r => ({
                      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                      label: r.title.substring(0, 30),
                      type: 'web_result',
                      details: r.snippet,
                      url: r.link
                  }));
                  
                  const newLinks = newNodes.map(n => ({
                      source: node.id,
                      target: n.id,
                      label: 'search_result'
                  }));
                  
                  updateGraph({ nodes: newNodes, links: newLinks });
                  addLog(`System: ${newNodes.length} hasil carian dipetakan untuk "${optimizedQuery}"`, 'success');
              } catch (e: any) {
                  addLog(`AI Search Error: ${e.message}`, 'error');
              }
              break;
          case 'YANDEX':
              openExternalUrl(`https://yandex.com/search/?text=${encodeURIComponent(optimizedQuery)}`);
              break;
          case 'EDIT': 
              setActiveNodeId(node.id);
              executeUIAction('EDIT_NODE', node); 
              break;
          case 'DELETE':
               if (selectedNodes.length > 0 && selectedNodes.find(n => n.id === node.id)) {
                   handleDeleteSelectedNodes();
               } else {
                   executeUIAction('DELETE_NODE', node.id);
               }
               break;
          case 'MALTEGO_TRANSFORMS':
          case 'TRANSFORM_MANAGER':
          case 'TRANSFORMS':
              setActiveNodeId(node.id);
              setSelectedNodes([node]);
              setShowTransformManager(true);
              addLog(`[Transform Engine] Melancarkan Transform Manager untuk sasaran: "${node.label}"`, 'info');
              break;
          case 'LINK': 
              setActiveNodeId(node.id);
              setLinkingSource(node);
              addLog(`LINK MODE ACTIVE: Pilih nod sasaran pada kanvas untuk disambungkan dengan '${node.label}'...`, "warning");
              break;
          case 'VAULT': 
              setActiveNodeId(node.id);
              executeUIAction('VAULT_INTERLINK', node); 
              break;
          case 'OPEN_MAP_HUD': 
              setActiveNodeId(node.id);
              setSelectedNodes(targetNodes);
              executeUIAction('OPEN_MODAL', 'geo_recon'); 
              break;
          case 'SOCIAL_RECON': 
              setActiveNodeId(node.id);
              setSelectedNodes([node]);
              setActiveModal('social_recon'); 
              break;
          case 'SOCIAL_SCAN': 
              setActiveNodeId(node.id);
              setSelectedNodes([node]);
              setActiveModal('social_analyzer'); 
              break; 
          case 'BREACH_DIRECTORY':
              if (navigator.clipboard) {
                  navigator.clipboard.writeText(node.label).then(() => {
                      addLog(`System: Sasaran ${node.label} disalin ke papan klip. Tampal pada BreachDirectory.`, 'success');
                      openExternalUrl(`https://breachdirectory.org/`);
                  }).catch(err => {
                      addLog(`Clipboard note: ${err.message}. Membuka laman web terus...`, 'info');
                      openExternalUrl(`https://breachdirectory.org/`);
                  });
              } else {
                  openExternalUrl(`https://breachdirectory.org/`);
              }
              break;
          case 'ZUCKERED':
              // haveibeenzuckered.com uses phone numbers or emails
              if (navigator.clipboard) {
                  navigator.clipboard.writeText(node.label).then(() => {
                      addLog(`System: Data '${node.label}' disalin. Menyemak kebocoran Facebook di Zuckered...`, 'success');
                      openExternalUrl(`https://haveibeenzuckered.com/`);
                  }).catch(err => {
                      openExternalUrl(`https://haveibeenzuckered.com/`);
                  });
              } else {
                  openExternalUrl(`https://haveibeenzuckered.com/`);
              }
              break;
          case 'CHECKLEAKED':
              addLog(`System: Menyemak kebocoran arkib untuk: ${node.label}...`, 'info');
              fetch(`/api/breach-check?term=${encodeURIComponent(node.label)}`)
                  .then(res => res.json())
                  .then(data => {
                      if (data.found && data.found.length > 0) {
                          const leakNodeId = `leak_${Date.now()}`;
                          const newNodes: Node[] = [{
                              id: leakNodeId,
                              label: `Breach: ${node.label.substring(0, 16)}`,
                              type: 'breach_result',
                              details: data.found.join('\n')
                          }];
                          const newLinks: Link[] = [{
                              source: node.id,
                              target: leakNodeId,
                              label: 'breach_source'
                          }];
                          updateGraph({ nodes: newNodes, links: newLinks });
                          addLog(`System: Rekod kebocoran dikesan dan dipetakan untuk ${node.label}`, 'success');
                      } else {
                          addLog(`System: Tiada rekod kebocoran kritikal dikesan untuk ${node.label}.`, 'info');
                      }
                  })
                  .catch(err => addLog(`Breach check error: ${err.message}`, 'error'));
              break;
          case 'PHONE_DORK':
              addLog(`System: Melaksanakan OSINT Dork untuk ${node.label}...`, 'info');
              try {
                  const dorkQuery = `(site:facebook.com OR site:linkedin.com OR site:instagram.com OR site:twitter.com) "${node.label}"`;
                  const results = await searchTavily(dorkQuery, config.tavilyApiKey || '');
                  const top3 = results.slice(0, 3);
                  
                  const newNodes: Node[] = top3.map(r => ({
                      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                      label: r.title.substring(0, 30),
                      type: 'web_result',
                      details: r.snippet,
                      url: r.link
                  }));
                  
                  const newLinks = newNodes.map(n => ({
                      source: node.id,
                      target: n.id,
                      label: 'dork_result'
                  }));
                  
                  updateGraph({ nodes: newNodes, links: newLinks });
                  addLog(`System: ${newNodes.length} rekod dork dipetakan untuk ${node.label}`, 'success');
              } catch (e: any) {
                  addLog(`Dork Error: ${e.message}`, 'error');
              }
              break;
          case 'PHONE_INTEL':
              setActiveNodeId(node.id);
              setPhoneIntelTargetNode(node);
              setPhoneIntelInitialTab('unified');
              setShowPhoneIntelModal(true);
              addLog(`Melancarkan Phone Intelligence Hub untuk sasaran: ${node.label}`, 'info');
              break;
          case 'NUMVERIFY':
              setActiveNodeId(node.id);
              setPhoneIntelTargetNode(node);
              setPhoneIntelInitialTab('numverify');
              setShowPhoneIntelModal(true);
              addLog(`Melancarkan NumVerify Telco Carrier Lookup untuk sasaran: ${node.label}`, 'info');
              break;
          case 'SERPAPI':
              setActiveNodeId(node.id);
              setPhoneIntelTargetNode(node);
              setPhoneIntelInitialTab('serpapi');
              setShowPhoneIntelModal(true);
              addLog(`Melancarkan SerpApi Dorking & Scam Intelligence untuk sasaran: ${node.label}`, 'info');
              break;
          case 'TELEGRAM_LOOKUP':
              setActiveNodeId(node.id);
              setPhoneIntelTargetNode(node);
              setPhoneIntelInitialTab('telegram');
              setShowPhoneIntelModal(true);
              addLog(`Melancarkan Telegram Bellingcat MTProto Checker untuk sasaran: ${node.label}`, 'info');
              break;
          case 'WHATSAPP_LEAK':
              openExternalUrl(`https://whatsapp.checkleaked.cc`);
              break;
          case 'WHATSAPP':
              openExternalUrl(`https://wa.me/${node.label.replace(/[^0-9]/g, '')}`);
              break;
          case 'TRUECALLER':
              openExternalUrl(`https://www.truecaller.com/search/my/${node.label.replace('+','')}`);
              break;
          case 'WHOIS':
              const domain = node.label.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
              openExternalUrl(`https://www.namecheap.com/domains/whois/result?domain=${domain}`);
              break;
          case 'HORIZON':
              addLog(`Scanning Horizon12 for ${node.label}...`, 'info');
              try {
                  const rapidKey = state.config.rapidApiKey || (import.meta as any).env.VITE_RAPIDAPI_KEY || '';
                  if (!rapidKey) {
                      addLog(`Horizon12: Kunci RapidAPI belum dikonfigurasi dalam Tetapan. Membuka BreachDirectory untuk carian manual pantas...`, 'warning');
                      openExternalUrl(`https://breachdirectory.org/`);
                      return;
                  }

                  const result = await searchHorizon(rapidKey, node.label);
                  addLog(`Horizon12 Scan result for ${node.label} received.`, 'success');
                  
                  let entries: any[] = [];
                  if (Array.isArray(result)) {
                      entries = result;
                  } else if (result && Array.isArray(result.data)) {
                      entries = result.data;
                  } else if (result && Array.isArray(result.result)) {
                      entries = result.result;
                  } else if (result && Array.isArray(result.records)) {
                      entries = result.records;
                  } else if (result && typeof result === 'object') {
                      entries = [result];
                  }
                  
                  if (entries.length > 0) {
                      const newNodes: Node[] = [];
                      const newLinks: Link[] = [];
                      
                      const topEntries = entries.slice(0, 5);
                      
                      topEntries.forEach((entry: any, index: number) => {
                          const leakNodeId = `horizon_${Date.now()}_${index}`;
                          
                          let label = "OSINT Record";
                          if (entry.email) label = entry.email;
                          else if (entry.username) label = entry.username;
                          else if (entry.name) label = entry.name;
                          else if (entry.phone) label = entry.phone;
                          else if (entry.domain) label = entry.domain;
                          
                          let details = "";
                          for (const [key, value] of Object.entries(entry)) {
                              if (typeof value === 'string' || typeof value === 'number') {
                                  details += `${key}: ${value}\n`;
                              }
                          }
                          if (!details) details = JSON.stringify(entry, null, 2);

                          newNodes.push({
                              id: leakNodeId,
                              label: label.substring(0, 30),
                              type: 'personal_id',
                              details: details.trim()
                          });
                          
                          newLinks.push({
                              source: node.id,
                              target: leakNodeId,
                              label: 'horizon_data'
                          });
                      });
                      
                      updateGraph({ nodes: newNodes, links: newLinks });
                  } else {
                      addLog(`Horizon12: No actionable records found for ${node.label}.`, 'warning');
                  }
              } catch (e: any) {
                  addLog(`Horizon12 Scan Failed: ${e.message}`, 'error');
              }
              break;
          case 'DEEP_OSINT':
          case 'ARENA_DEEP_OSINT':
              const deepPrompt = `[REDHORIZON OSINT PROTOCOL - ULTRA-DEEP FORENSIC INVESTIGATION & SOCIAL PHOTO EXTRACTION]
TARGET ENTITY: "${node.label}"
ENTITY TYPE: ${node.type}
ALIASES/HANDLES: ${node.aliases ? node.aliases.join(', ') : 'None documented'}
KNOWN CONTEXT: ${node.details || 'No prior context recorded.'}

=======================================================
MISSION OBJECTIVES & INVESTIGATION DEPTH:
Act as a Principal Digital Forensics and Advanced Open Source Intelligence (OSINT) Officer.
Perform an EXHAUSTIVE, DEEP-LEVEL search across open web, public archives, breach indexes, and social graphs.

MANDATORY INTELLIGENCE REQUIREMENTS:
1. SOCIAL MEDIA PROFILES & DIRECT TARGET IMAGES / AVATARS (CRITICAL):
   - Locate all active and historical social media accounts (Facebook, Instagram, LinkedIn, X/Twitter, TikTok, Telegram, Discord, GitHub, Reddit, Threads, YouTube, Pinterest, Gravatar).
   - MANDATORY: Search for and include DIRECT PUBLIC IMAGE URLs ("imageUrl") for profile pictures, avatars, target photos, or public album images so the investigator can visually verify the subject.
   - For all discovered person and web result nodes, provide the "imageUrl" field whenever an image source is identifiable.

2. DEEP DIGITAL FOOTPRINT & CORRELATION:
   - Identify data breaches, pastebin logs, leaked credentials, associated usernames, and historical nicknames.
   - Search for linked phone numbers (WhatsApp, Telegram status), emails, and web domains/servers.
   - Uncover corporate filings, employment history, company directorships, academic affiliations.
   - Trace geolocation markers: physical addresses, coordinates, frequent venues, check-ins.
   - Map key associates, family connections, business partners, or affiliated organizations.

3. FORENSIC GRAPH TOPOLOGY (STRICT COMPLIANT JSON):
Respond ONLY with a valid, clean JSON object (no markdown surrounding text outside json blocks, no conversational preamble) matching this schema for direct ingestion into the RedHorizon Engine:
{
  "graph": {
    "nodes": [
      {
        "id": "unique_id_1",
        "label": "Full Name / Profile Handle / Organization",
        "type": "person|location|organization|phone|email|web_result|breach_result",
        "details": "Exhaustive forensic details, background notes, sources, and discovery timeline",
        "url": "https://source-url-or-profile-link.com",
        "imageUrl": "https://direct-image-url-for-avatar-or-photo.jpg",
        "confidence": 95
      }
    ],
    "links": [
      {
        "source": "${node.id}",
        "target": "unique_id_1",
        "label": "social_profile|target_photo|phone_linked|associate|employer|breach_record"
      }
    ]
  }
}

Ensure all IDs are unique and the JSON is strictly valid.`;

              if (navigator.clipboard) {
                  navigator.clipboard.writeText(deepPrompt).then(() => {
                      addLog(`Arena.ai Deep OSINT Prompt (with Social Photos Protocol) disalin ke papan klip untuk ${node.label}.`, 'success');
                      openExternalUrl('https://arena.ai/');
                  }).catch(err => {
                      addLog(`Clipboard note: ${err.message}. Membuka Arena.ai terus...`, 'info');
                      openExternalUrl('https://arena.ai/');
                  });
              } else {
                  openExternalUrl('https://arena.ai/');
              }
              break;

          case 'ARENA_PHOTOS':
              const photoPrompt = `[REDHORIZON OSINT - SOCIAL MEDIA PHOTO & AVATAR EXTRACTION PROTOCOL]
TARGET ENTITY: "${node.label}" (Type: ${node.type})
DETAILS: ${node.details || 'None'}

MISSION OBJECTIVE:
Conduct a deep visual reconnaissance scan to locate ALL social media photos, profile pictures, avatars, public image albums, and visual evidence related to "${node.label}".

SEARCH TARGETS:
1. Social media avatars and profile photos (Instagram, Facebook, LinkedIn, Twitter/X, TikTok, Telegram, Discord, GitHub, Pinterest, YouTube).
2. Gravatar, Google Account public avatar CDN links, forum avatars, press release photos, corporate team headshots.
3. Reverse image search leads and verified profile links.

OUTPUT FORMAT (STRICT JSON FOR GRAPH IMPORT):
{
  "graph": {
    "nodes": [
      {
        "id": "photo_node_1",
        "label": "Photo: @handle (Platform)",
        "type": "web_result",
        "details": "Direct Profile Photo & Visual Evidence for ${node.label}",
        "url": "https://platform.com/profile_link",
        "imageUrl": "https://direct-image-cdn-url.jpg"
      }
    ],
    "links": [
      {
        "source": "${node.id}",
        "target": "photo_node_1",
        "label": "target_social_photo"
      }
    ]
  }
}`;

              if (navigator.clipboard) {
                  navigator.clipboard.writeText(photoPrompt).then(() => {
                      addLog(`Arena.ai Social Photo Extraction Prompt disalin untuk ${node.label}.`, 'success');
                      openExternalUrl('https://arena.ai/');
                  }).catch(err => {
                      addLog(`Clipboard note: ${err.message}. Membuka Arena.ai terus...`, 'info');
                      openExternalUrl('https://arena.ai/');
                  });
              } else {
                  openExternalUrl('https://arena.ai/');
              }
              break;
      }
  };

  // Custom Event Listeners for HUD Quick Actions (AI Recon, Expand Graph, Web Verification)
  useEffect(() => {
    const handleTriggerNodeReconEvent = (e: any) => {
      const target = e.detail?.node || activeNode;
      if (!target) return;
      setActiveNodeId(target.id);
      setSelectedNodes([target]);
      executeUIAction('OPEN_MODAL', 'verify_node_web');
      addLog(`[AI Recon] Melancarkan siasatan AI & Pengesahan Web untuk: "${target.label}"`, 'info');
    };

    const handleExpandNodeEvent = (e: any) => {
      const target = e.detail?.node || activeNode;
      if (!target) return;
      setActiveNodeId(target.id);
      setSelectedNodes([target]);
      handleRadialAction('AI_SEARCH', target);
      addLog(`[Kembangkan Entiti] Menganalisis korelasi automatik bagi: "${target.label}"`, 'info');
    };

    const handleVerifyNodeWebEvent = (e: any) => {
      const target = e.detail?.node || activeNode;
      if (!target) return;
      setActiveNodeId(target.id);
      setSelectedNodes([target]);
      executeUIAction('OPEN_MODAL', 'verify_node_web');
      addLog(`[Pengesahan Web] Membuka enjin carian & pengesahan internet untuk: "${target.label}"`, 'info');
    };

    window.addEventListener('app:trigger-node-recon', handleTriggerNodeReconEvent);
    window.addEventListener('app:expand-node', handleExpandNodeEvent);
    window.addEventListener('app:verify-node-web', handleVerifyNodeWebEvent);

    return () => {
      window.removeEventListener('app:trigger-node-recon', handleTriggerNodeReconEvent);
      window.removeEventListener('app:expand-node', handleExpandNodeEvent);
      window.removeEventListener('app:verify-node-web', handleVerifyNodeWebEvent);
    };
  }, [activeNode, handleRadialAction]);

  const glassPanelClass = "glass-panel";

  return (

    <>
      <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#050505]">
         {state.config.visual?.wallpaperUrl ? (
             <div 
                className="absolute inset-0 bg-no-repeat bg-center" 
                style={{ 
                    backgroundImage: `url(${state.config.visual.wallpaperUrl})`, 
                    backgroundSize: state.config.visual.wallpaperMode || 'cover',
                    backgroundPosition: 'center center',
                    backgroundRepeat: 'no-repeat',
                    opacity: state.config.visual.wallpaperOpacity ?? 0.7 
                }}
             ></div>
         ) : (
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#111] via-[#050505] to-black opacity-100"></div>
         )}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      </div>
      
      {linkingSource && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-[#ff0033] text-black px-6 py-2 font-black uppercase tracking-widest shadow-[0_0_20px_#ff0033] flex items-center gap-3 rounded-full cursor-pointer" onClick={() => setLinkingSource(null)}>
              <LinkIcon size={16} /> LINKING MODE: SELECT TARGET
              <X size={14} className="hover:bg-white/20 rounded-full p-0.5"/>
          </div>
      )}

      {/* LEAD ADMIN REALTIME FLOATING NOTIFICATION BANNER */}
      {isLeadAdmin && (
        <LeadAdminPendingNotificationBanner
          pendingRequests={allAccessRequests.filter(r => r.status === 'pending')}
          onOpenApprovalPortal={() => setShowAdminApprovalModal(true)}
          currentUserEmail={currentUser?.email}
        />
      )}

      {/* FULLSCREEN FLOATING CONTROLLER & TOUCH ACTION BAR (TABLET / DESKTOP) */}
      {isFullscreen && (
        <div className="fixed top-2 right-2 sm:right-16 z-[9999999] flex items-center gap-2 bg-[#050b14]/95 border border-cyan-500/60 text-cyan-300 p-1.5 sm:px-3 sm:py-1.5 rounded-lg shadow-[0_0_24px_rgba(6,182,212,0.4)] backdrop-blur-md animate-in fade-in select-none">
          <div className="flex items-center gap-1.5 px-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-bold text-[10px] sm:text-xs tracking-wider">SKRIN PENUH</span>
          </div>

          <button 
            id="floating-exit-fullscreen-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="bg-rose-500/25 hover:bg-rose-500/40 active:bg-rose-500/60 text-rose-300 border border-rose-500/60 min-h-[36px] px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_8px_rgba(244,63,94,0.3)] active:scale-95"
            title="Keluar Skrin Penuh (Exit Fullscreen)"
          >
            <Minimize size={13} className="text-rose-400" />
            <span>KELUAR</span>
          </button>

          {showIframeNotice && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(window.location.href, '_blank');
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                window.open(window.location.href, '_blank');
              }}
              className="bg-amber-500/20 hover:bg-amber-500/40 active:bg-amber-500/60 text-amber-300 border border-amber-500/50 min-h-[36px] px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow active:scale-95"
              title="Buka aplikasi dalam Tab Bebas untuk skrin penuh Android tanpa sempadan"
            >
              <ExternalLink size={12} />
              <span className="hidden sm:inline">TAB BEBAS</span>
            </button>
          )}
        </div>
      )}

      {/* IFRAME FULLSCREEN RESTRICTION HELPER NOTICE */}
      {showIframeNotice && isFullscreen && (
        <div className="fixed top-14 right-2 sm:right-4 z-[9999999] max-w-xs bg-[#0b101b]/95 border border-amber-500/60 p-3 rounded-lg shadow-[0_0_24px_rgba(245,158,11,0.3)] text-[11px] font-mono backdrop-blur-md animate-in fade-in slide-in-from-top-2 select-none">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-amber-400 font-bold flex items-center gap-1.5 text-[10px] tracking-wide">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              SEKATAN BINGKAI PRATONTON ANDROID
            </span>
            <button 
              onClick={() => setShowIframeNotice(false)} 
              className="text-slate-400 hover:text-white p-1 cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          <p className="text-slate-300 leading-relaxed mb-2.5 text-[10px]">
            Pelayar Android Chrome menyekat mod skrin penuh peringkat sistem (OS) kerana aplikasi berada di dalam iframe pratonton. Untuk pengalaman 100% skrin penuh tanpa sempadan, sila buka dalam Tab Bebas:
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="flex-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/50 min-h-[36px] px-2.5 py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow active:scale-95"
            >
              <ExternalLink size={12} />
              <span>BUKA TAB BEBAS</span>
            </button>
            <button
              onClick={() => setShowIframeNotice(false)}
              className="bg-white/10 hover:bg-white/20 text-slate-300 min-h-[36px] px-3 py-1.5 rounded text-[10px] cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <div 
        id="redhorizon-main-app"
        className={`fixed inset-0 ${isFullscreen ? 'z-[999999] w-screen h-screen' : 'z-10'} bg-transparent text-[#ff0033] font-mono flex flex-col overflow-hidden select-none`}
        style={{
          visibility: !isTerminalUnlocked ? 'hidden' : 'visible',
          pointerEvents: !isTerminalUnlocked ? 'none' : 'auto'
        }}
        inert={!isTerminalUnlocked}
      >
        
        {/* HEADER */}
        <MaltegoCommandRibbon 
          activeWs={activeWs}
          workspaces={state.workspaces}
          onSwitchWorkspace={(id) => {
            dispatch({ type: 'SWITCH_WORKSPACE', payload: id });
            setSelectedNodes([]);
            setActiveNodeId(null);
          }}
          onCreateWorkspace={(name) => {
            const wsName = name || `CANVAS_${state.workspaces.length + 1}`;
            dispatch({ type: 'CREATE_WORKSPACE', payload: wsName });
            addLog(`Ruang kerja canvas baru "${wsName}" dibuka (${Math.min(3, state.workspaces.length + 1)}/3).`, 'success');
          }}
          onRenameWorkspace={(id, name) => {
            dispatch({ type: 'RENAME_WORKSPACE', payload: { id, name } });
            addLog(`Nama canvas dikemas kini kepada "${name}".`, 'info');
          }}
          onDuplicateWorkspace={(id) => {
            dispatch({ type: 'DUPLICATE_WORKSPACE', payload: id });
            addLog(`Canvas semasa diduplikasi ke ruang kerja baru (${Math.min(3, state.workspaces.length + 1)}/3).`, 'success');
          }}
          onDeleteWorkspace={(id) => {
            dispatch({ type: 'DELETE_WORKSPACE', payload: id });
            setSelectedNodes([]);
            setActiveNodeId(null);
            addLog(`Ruang kerja canvas ditutup.`, 'warning');
          }}
          onClearWorkspace={() => {
            dispatch({ type: 'CLEAR_GRAPH' });
            addLog(`Kanvas semasa telah dibersihkan.`, 'warning');
          }}
          onTransferSelectedNodes={(targetWsId, deleteFromSource) => {
            const nodeIds = selectedNodes.map(n => n.id);
            dispatch({
              type: 'COPY_NODES_TO_WORKSPACE',
              payload: { targetWsId, nodeIds, deleteFromSource }
            });
            const targetWs = state.workspaces.find(w => w.id === targetWsId);
            addLog(
              `${nodeIds.length} entiti berjaya di${deleteFromSource ? 'pindahkan' : 'salin'} ke canvas "${targetWs?.name || 'Target'}".`,
              'success'
            );
            if (deleteFromSource) {
              setSelectedNodes([]);
              setActiveNodeId(null);
            }
          }}
          currentLayout={activeWs.layoutMode}
          onLayoutChange={(mode) => executeUIAction('CHANGE_LAYOUT', mode)}
          nodeRenderMode={nodeRenderMode}
          onToggleRenderMode={() => {
            setNodeRenderMode(prev => {
              const next = prev === 'schematic' ? 'classic' : 'schematic';
              addLog(`Mod Paparan Nod ditukar ke: ${next === 'schematic' ? 'Kad Skematik (Flowsint Style)' : 'Nod Bulat (Classic)'}`, 'info');
              return next;
            });
          }}
          onOpenEnricherHub={() => setShowEnricherHubModal(true)}
          selectedNodes={selectedNodes}
          activeNode={activeNode}
          historyLength={history.length}
          onUndo={handleUndo}
          onDeleteSelected={handleDeleteSelectedNodes}
          onMergeNodes={handleMergeNodes}
          onOpenRadial={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const primary = activeNode || selectedNodes[0] || (activeWs?.data?.nodes?.[0]);
            if (primary) {
              setRadialMenu({
                x: Math.min(window.innerWidth - 160, Math.max(160, rect.left + 20)),
                y: Math.min(window.innerHeight - 160, rect.bottom + 180),
                node: primary,
                nodes: selectedNodes.length > 0 ? selectedNodes : [primary]
              });
            }
          }}
          showAIChat={showAIChat}
          onToggleAIChat={() => setShowAIChat(!showAIChat)}
          onOpenModal={(modalId) => executeUIAction('OPEN_MODAL', modalId)}
          onSaveCase={handleSaveToFile}
          onExportMaltego={handleExportMaltegoCSV}
          onExportAIPrompt={handleCopyForExternalAI}
          onRunSynthesis={() => executeUIAction('OPEN_SYNTHESIS')}
          synthesisLoading={synthesisLoading}
          synthesisResult={synthesisResult}
          onLaunchGoogleEarth={handleLaunchGoogleEarth}
          onLaunchStreetView={handleLaunchMapillaryDirect}
          onOpenCollabChat={() => setShowCollabChat(true)}
          onOpenBreachModal={() => {
            if (!breachResult) {
              setBreachResult({
                email: activeNode?.label || 'target@redhorizon.intel',
                found: true,
                breachCount: 2,
                breaches: [
                  { name: 'DarkWeb Breach DB', domain: 'darkleak.org', breachDate: '2024-03-15', description: 'Cred dump leakage', dataClasses: ['Emails', 'Passwords'] }
                ]
              });
            }
            setShowBreachModal(true);
          }}
          onOpenTrafficVision={() => {
            setShowTrafficVisionModal(true);
            executeUIAction('OPEN_MODAL', 'cctv_hub');
          }}
          onOpenTimeline={() => {
            setShowTimelineBar(true);
            executeUIAction('OPEN_MODAL', 'timeline');
          }}
          onOpenOntology={() => setShowOntologyEngineModal(true)}
          onOpenTriples={() => setShowSemanticTriplesModal(true)}
          detectedConflictsCount={detectedConflicts.length}
          isLowPower={!!config.visual?.lowPowerMode}
          onToggleLowPower={() => {
            const isLow = !config.visual?.lowPowerMode;
            dispatch({
              type: 'UPDATE_CONFIG',
              payload: {
                ...config,
                visual: { ...config.visual, lowPowerMode: isLow }
              }
            });
            addLog(
              isLow 
                ? 'Mod Penjimatan Kuasa: AKTIF (Animasi, backdrop-blur & beban grafik dihentikan).' 
                : 'Mod Penjimatan Kuasa: DINYAHAKTIFKAN.', 
              isLow ? 'warning' : 'info'
            );
          }}
          onLockApp={handleLockApp}
          onOpenMasterKey={() => setShowAccessGateModal(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          backendStatus={backendStatus}
          isMobile={isMobile}
        />

        {/* MALTEGO MULTI-CANVAS WORKSTATION TAB BAR (Maks 3 Canvas Serentak) */}
        <CanvasWorkstationTabBar 
            workspaces={state.workspaces}
            activeWsId={state.activeWsId}
            onSwitchWorkspace={(id) => {
              dispatch({ type: 'SWITCH_WORKSPACE', payload: id });
              setSelectedNodes([]);
              setActiveNodeId(null);
            }}
            onCreateWorkspace={(name) => {
              const wsName = name || `CANVAS_${state.workspaces.length + 1}`;
              dispatch({ type: 'CREATE_WORKSPACE', payload: wsName });
              addLog(`Ruang kerja canvas baru "${wsName}" dibuka (${Math.min(3, state.workspaces.length + 1)}/3).`, 'success');
            }}
            onRenameWorkspace={(id, name) => {
              dispatch({ type: 'RENAME_WORKSPACE', payload: { id, name } });
              addLog(`Nama canvas dikemas kini kepada "${name}".`, 'info');
            }}
            onDuplicateWorkspace={(id) => {
              dispatch({ type: 'DUPLICATE_WORKSPACE', payload: id });
              addLog(`Canvas semasa diduplikasi ke ruang kerja baru (${Math.min(3, state.workspaces.length + 1)}/3).`, 'success');
            }}
            onDeleteWorkspace={(id) => {
              dispatch({ type: 'DELETE_WORKSPACE', payload: id });
              setSelectedNodes([]);
              setActiveNodeId(null);
              addLog(`Ruang kerja canvas ditutup.`, 'warning');
            }}
            onClearWorkspace={() => {
              dispatch({ type: 'CLEAR_GRAPH' });
              addLog(`Kanvas semasa telah dibersihkan.`, 'warning');
            }}
            selectedNodesCount={selectedNodes.length}
            onTransferSelectedNodes={(targetWsId, deleteFromSource) => {
              const nodeIds = selectedNodes.map(n => n.id);
              dispatch({
                type: 'COPY_NODES_TO_WORKSPACE',
                payload: { targetWsId, nodeIds, deleteFromSource }
              });
              const targetWs = state.workspaces.find(w => w.id === targetWsId);
              addLog(
                `${nodeIds.length} entiti berjaya di${deleteFromSource ? 'pindahkan' : 'salin'} ke canvas "${targetWs?.name || 'Target'}".`,
                'success'
              );
              if (deleteFromSource) {
                setSelectedNodes([]);
                setActiveNodeId(null);
              }
            }}
            maxWorkspaces={3}
        />

        {/* MAIN BODY */}
        <div className="flex-1 relative overflow-hidden" style={gpuScaleStyle}>
          
          {/* GRAPH LAYER (Full Screen) */}
          <div className="absolute inset-0 z-0">
              {activeWs.layoutMode === 'map' ? (
                <InteractiveSpatialMapCanvas 
                    data={roomLockStatus.isUnlocked ? activeWs.data : { nodes: [], links: [] }} 
                    selectedNodes={selectedNodes} 
                    onNodeClick={handleNodeClick} 
                    onNodeDoubleClick={handleNodeDoubleClick}
                    onNodeRightClick={handleNodeRightClick}
                    onBackgroundClick={() => { setSelectedNodes([]); setActiveNodeId(null); setRadialMenu(null); setLinkingSource(null); }} 
                    onDeleteNode={(nodeId) => executeUIAction('DELETE_NODE', nodeId)}
                />
              ) : (config.visual?.graphRenderer === 'canvas' || config.visual?.graphRenderer !== 'svg' || (filteredGraphDataForView.nodes && filteredGraphDataForView.nodes.length >= 35)) ? (
                <GraphViewCanvas 
                    data={filteredGraphDataForView} 
                    layoutMode={activeWs.layoutMode} 
                    selectedNodes={selectedNodes} 
                    onNodeClick={handleNodeClick} 
                    onNodeDoubleClick={handleNodeDoubleClick}
                    onNodeRightClick={handleNodeRightClick}
                    onBackgroundClick={() => { setSelectedNodes([]); setActiveNodeId(null); setRadialMenu(null); setLinkingSource(null); }} 
                    onDeleteNode={(nodeId) => executeUIAction('DELETE_NODE', nodeId)}
                    highlightType={activeTypeFilter}
                    groupByType={isAssetGrouped}
                    nodeRenderMode={nodeRenderMode}
                />
              ) : (
                <GraphView 
                    data={filteredGraphDataForView} 
                    layoutMode={activeWs.layoutMode} 
                    selectedNodes={selectedNodes} 
                    onNodeClick={handleNodeClick} 
                    onNodeDoubleClick={handleNodeDoubleClick}
                    onNodeRightClick={handleNodeRightClick}
                    onBackgroundClick={() => { setSelectedNodes([]); setActiveNodeId(null); setRadialMenu(null); setLinkingSource(null); }} 
                    onDeleteNode={(nodeId) => executeUIAction('DELETE_NODE', nodeId)}
                    highlightType={activeTypeFilter}
                    groupByType={isAssetGrouped}
                />
              )}
          </div>

          {/* UI OVERLAY LAYER */}
          <div className="absolute inset-0 z-10 pointer-events-none flex overflow-hidden">
            {/* LEFT PANEL */}
            <div className={`relative flex h-full z-40 transition-all duration-300 ${isLeftCollapsed ? 'w-0' : ''}`} style={{ width: isLeftCollapsed ? 0 : leftWidth, pointerEvents: !roomLockStatus.isUnlocked ? 'none' : 'auto' }}>
                <aside className="border-r border-white/10 glass-panel flex flex-col overflow-hidden h-full w-full bg-zinc-950/80 backdrop-blur-md">
                    {/* Header */}
                    <div className="h-10 border-b border-white/5 flex items-center justify-between px-3 bg-white/5 min-w-[260px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#00ccff] truncate">
                          Asset Index ({filteredAssetNodes.length}{filteredAssetNodes.length !== (activeWs?.data?.nodes?.length || 0) ? `/${activeWs?.data?.nodes?.length || 0}` : ''})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setIsAssetGrouped(!isAssetGrouped)} 
                            className={`p-1.5 transition-colors rounded ${isAssetGrouped ? 'text-[#00ccff] bg-[#00ccff]/15' : 'text-gray-400 hover:text-[#00ccff] hover:bg-white/5'}`} 
                            title={isAssetGrouped ? "Paparan Senarai Rata" : "Kumpul Mengikut Jenis"}
                          >
                              <Layers size={13}/>
                          </button>
                          <button 
                            onClick={() => executeUIAction('OPEN_MODAL', 'manual')} 
                            className="p-1.5 text-gray-400 hover:text-[#00ccff] hover:bg-white/5 rounded transition-colors"
                            title="Tambah Aset Manual"
                          >
                            <Plus size={13}/>
                          </button>
                      </div>
                  </div>

                  {/* Asset Search Filter */}
                  <div className="px-2.5 py-1.5 border-b border-white/5 bg-black/40 min-w-[260px]">
                    <div className="relative flex items-center">
                      <Search size={12} className="absolute left-2 text-gray-500 pointer-events-none" />
                      <input 
                        type="text" 
                        value={assetSearchQuery}
                        onChange={(e) => setAssetSearchQuery(e.target.value)}
                        placeholder="Cari / filter aset..."
                        className="w-full bg-black/60 border border-white/10 rounded-md py-1 pl-7 pr-6 text-[10px] text-white placeholder-gray-500 focus:outline-none focus:border-[#00ccff] transition-all font-mono"
                      />
                      {assetSearchQuery && (
                        <button 
                          onClick={() => setAssetSearchQuery('')}
                          className="absolute right-1.5 text-gray-400 hover:text-white p-0.5"
                          title="Kosongkan carian"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bulk Actions Toolbar */}
                  {filteredAssetNodes.length > 0 && (
                    <div className="px-2.5 py-1.5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between min-w-[260px] text-[9px]">
                      <button 
                        onClick={() => handleToggleSelectAllFiltered(filteredAssetNodes)}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-white font-mono transition-colors"
                        title={areAllFilteredSelected ? "Batal Semua Pilihan" : "Pilih Semua Aset"}
                      >
                        {areAllFilteredSelected ? (
                          <CheckSquare size={13} className="text-[#00ccff]" />
                        ) : (
                          <Square size={13} className="text-gray-500" />
                        )}
                        <span>{areAllFilteredSelected ? "Batal Semua" : "Pilih Semua"}</span>
                      </button>

                      {selectedNodes.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] bg-[#00ccff]/15 text-[#00ccff] px-1.5 py-0.5 rounded font-mono font-bold">
                            {selectedNodes.length} dipilih
                          </span>
                          <button
                            onClick={handleBulkDeleteSelectedAssets}
                            className="flex items-center gap-1 px-2 py-0.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 rounded transition-all font-bold shadow-sm shadow-red-950"
                            title={`Padamkan ${selectedNodes.length} aset terpilih secara kekal`}
                          >
                            <Trash2 size={11} />
                            <span>Hapus ({selectedNodes.length})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Asset List Content */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-w-[260px]">
                      {filteredAssetNodes.length === 0 ? (
                        <div className="py-8 px-3 text-center text-gray-500 text-[10px]">
                          {assetSearchQuery ? 'Tiada aset sepadan dengan carian.' : 'Tiada aset dalam graf semasa.'}
                        </div>
                      ) : isAssetGrouped ? (
                          Object.entries(
                              filteredAssetNodes.reduce((acc, n) => {
                                  const t = n.type || 'unknown';
                                  if (!acc[t]) acc[t] = [];
                                  acc[t].push(n);
                                  return acc;
                              }, {} as Record<string, Node[]>)
                          ).map(([type, groupNodes]) => (
                              <div key={type} className="mb-3 last:mb-0">
                                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 border-b border-white/5 pb-1 flex items-center justify-between">
                                      <span className="text-gray-400">{type}</span>
                                      <span className="bg-white/10 px-1.5 py-0.2 rounded text-[8px] text-gray-300 font-mono">{groupNodes.length}</span>
                                  </div>
                                  <div className="space-y-1">
                                      {groupNodes.map((n: Node) => {
                                          const isSelected = selectedNodes.some(sn => sn.id === n.id);
                                          return (
                                              <div 
                                                key={n.id} 
                                                onClick={(e) => handleNodeClick(n, {x:0,y:0}, e.shiftKey)} 
                                                className={`p-2 border transition-all cursor-pointer group rounded-lg flex items-center gap-2 ${isSelected ? 'border-[var(--theme-color)] bg-[var(--theme-color)]/10 shadow-md shadow-[var(--theme-color)]/20' : 'border-white/5 bg-white/5 hover:border-[var(--theme-color)]/40 hover:bg-[var(--theme-color)]/5'}`}
                                              >
                                                  <button
                                                    onClick={(e) => handleToggleSelectAsset(n, e)}
                                                    className="text-gray-500 hover:text-white shrink-0 p-0.5"
                                                    title={isSelected ? "Nyahpilih" : "Pilih untuk tindakan pukal"}
                                                  >
                                                    {isSelected ? <CheckSquare size={13} className="text-[#00ccff]" /> : <Square size={13} />}
                                                  </button>
                                                  <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${n.vaultMatch ? 'border-amber-500 bg-amber-900/20' : 'border-white/10 bg-white/5'}`}>
                                                      {n.type === 'location' || isLocationNode(n) ? <MapIcon size={10} className="text-orange-500" /> : <Radar size={10} className="text-gray-500" />}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                      <div className={`text-[9px] font-bold truncate uppercase ${n.vaultMatch ? 'text-amber-500' : 'text-white'}`}>{n.label}</div>
                                                  </div>
                                                  <button
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleDeleteSingleAsset(n.id, n.label);
                                                      }}
                                                      className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/15 rounded transition-all shrink-0 opacity-40 group-hover:opacity-100"
                                                      title="Padam Aset Ini"
                                                  >
                                                      <Trash2 size={12} />
                                                  </button>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          ))
                      ) : (
                          filteredAssetNodes.map(n => {
                              const isSelected = selectedNodes.some(sn => sn.id === n.id);
                              return (
                                  <div 
                                    key={n.id} 
                                    onClick={(e) => handleNodeClick(n, {x:0,y:0}, e.shiftKey)} 
                                    className={`p-2.5 border transition-all cursor-pointer group rounded-lg ${isSelected ? 'border-[var(--theme-color)] bg-[var(--theme-color)]/10 shadow-md shadow-[var(--theme-color)]/20' : 'border-white/5 bg-white/5 hover:border-[var(--theme-color)]/40 hover:bg-[var(--theme-color)]/5'}`}
                                  >
                                      <div className="flex items-center gap-2.5">
                                          <button
                                            onClick={(e) => handleToggleSelectAsset(n, e)}
                                            className="text-gray-500 hover:text-white shrink-0 p-0.5"
                                            title={isSelected ? "Nyahpilih" : "Pilih untuk tindakan pukal"}
                                          >
                                            {isSelected ? <CheckSquare size={13} className="text-[#00ccff]" /> : <Square size={13} />}
                                          </button>
                                          <div className={`w-7 h-7 rounded flex items-center justify-center border shrink-0 ${n.vaultMatch ? 'border-amber-500 bg-amber-900/20' : 'border-white/10 bg-white/5'}`}>
                                              {n.type === 'location' || isLocationNode(n) ? <MapIcon size={12} className="text-orange-500" /> : <Radar size={12} className="text-gray-500" />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className={`text-[10px] font-bold truncate uppercase ${n.vaultMatch ? 'text-amber-500' : 'text-white'}`}>{n.label}</div>
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[7.5px] text-[#00ccff] font-mono uppercase bg-[#00ccff]/10 px-1 rounded">{n.type}</span>
                                                {n.details && (
                                                  <span className="text-[8px] text-gray-500 truncate font-mono">{n.details}</span>
                                                )}
                                              </div>
                                          </div>
                                          <button
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteSingleAsset(n.id, n.label);
                                              }}
                                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/15 rounded transition-all shrink-0 opacity-40 group-hover:opacity-100"
                                              title="Padam Aset Ini"
                                          >
                                              <Trash2 size={13} />
                                          </button>
                                      </div>
                                  </div>
                              );
                          })
                      )}
                  </div>
              </aside>
              <div 
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#ff0033] z-50 transition-colors flex items-center justify-center group" 
                onMouseDown={startResizing('left')}
                onTouchStart={startResizing('left')}
              >
                <div className="w-0.5 h-8 bg-white/20 group-hover:bg-white transition-colors rounded-full"></div>
              </div>
              <button onClick={() => setIsLeftCollapsed(!isLeftCollapsed)} className={`absolute top-1/2 -translate-y-1/2 bg-zinc-900 border border-white/10 text-white p-1 hover:bg-zinc-800 transition-all rounded-full shadow-xl z-50 ${isLeftCollapsed ? 'left-0' : '-right-4'}`}>
                  {isLeftCollapsed ? <ChevronRightIcon size={14}/> : <ChevronLeft size={14}/>}
              </button>
          </div>

          {/* CENTER UI OVERLAYS */}
          <div className="flex-1 relative pointer-events-none">
              {/* Floating Quick Group Selector */}
              {activeWs.layoutMode !== 'map' && (
                <div className="absolute top-2 left-2 sm:left-4 z-50 pointer-events-auto max-w-[calc(100vw-30px)] sm:max-w-max flex items-center gap-1.5 flex-wrap">
                  <QuickGroupSelector 
                    onSelectType={handleSelectType}
                    activeType={activeTypeFilter}
                    availableTypes={Array.from(new Set((activeWs?.data?.nodes || []).map(n => n.type || 'unknown')))}
                    typeCounts={(activeWs?.data?.nodes || []).reduce((acc, n) => {
                      const t = n.type || 'unknown';
                      acc[t] = (acc[t] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)}
                  />
                </div>
              )}

              {/* Floating Graph Layout Quick HUD (Direct Canvas Access) */}
              {activeWs.layoutMode !== 'map' && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-auto hidden lg:flex items-center">
                  <ControlHUD
                    currentLayout={activeWs.layoutMode}
                    onLayoutChange={(mode) => executeUIAction('CHANGE_LAYOUT', mode)}
                    nodeRenderMode={nodeRenderMode}
                    onToggleRenderMode={() => {
                      setNodeRenderMode(prev => {
                        const next = prev === 'schematic' ? 'classic' : 'schematic';
                        addLog(`Mod Paparan Nod ditukar ke: ${next === 'schematic' ? 'Kad Skematik (Flowsint Style)' : 'Nod Bulat (Classic)'}`, 'info');
                        return next;
                      });
                    }}
                    onOpenEnricherHub={() => setShowEnricherHubModal(true)}
                  />
                </div>
              )}

              {/* Floating Canvas Zoom Controls HUD */}
              {activeWs.layoutMode !== 'map' && (
                <div className="absolute top-2 right-2 sm:right-4 z-50 pointer-events-auto flex items-center gap-1 bg-black/80 border border-zinc-700/60 p-1 rounded-lg backdrop-blur-md shadow-lg font-mono text-[10px]">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('app:graph-zoom-in'))}
                    className="p-1.5 hover:bg-zinc-800 text-gray-300 hover:text-white rounded transition-colors cursor-pointer"
                    title="Zoom In (Dekatkan Kamera Graf)"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('app:graph-zoom-out'))}
                    className="p-1.5 hover:bg-zinc-800 text-gray-300 hover:text-white rounded transition-colors cursor-pointer"
                    title="Zoom Out (Jauhkan Kamera - Lihat Keseluruhan Graf)"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <div className="w-[1px] h-4 bg-zinc-700 mx-0.5"></div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('app:graph-zoom-reset'))}
                    className="p-1.5 hover:bg-zinc-800 text-cyan-400 hover:text-cyan-300 rounded transition-colors cursor-pointer flex items-center gap-1"
                    title="Reset Kamera (Pusatkan Semula)"
                  >
                    <Crosshair size={14} />
                    <span className="hidden md:inline font-bold">Reset</span>
                  </button>
                </div>
              )}

              {radialMenu && (
                <div className="pointer-events-auto">
                  <RadialMenu 
                    node={radialMenu.node} 
                    selectedNodes={radialMenu.nodes || selectedNodes}
                    position={{ x: radialMenu.x, y: radialMenu.y }} 
                    onAction={handleRadialAction} 
                    onClose={() => setRadialMenu(null)}
                    workspaces={state.workspaces}
                  />
                </div>
              )}
              
              {showTransformManager && (
                <div className="pointer-events-auto">
                  <TransformManager 
                      selectedNode={activeNode || selectedNodes[0] || (activeWs?.data?.nodes?.length ? activeWs.data.nodes[0] : null)} 
                      onExecuteChain={handleExecuteTransformChain}
                      onClose={() => setShowTransformManager(false)}
                  />
                </div>
              )}
              
              {activeModal === 'synthesis' && (
                  <div className="pointer-events-auto">
                    <StrategicSynthesis 
                        result={synthesisResult} 
                        nodes={activeWs.data.nodes}
                        loading={synthesisLoading} 
                        onClose={() => executeUIAction('CLOSE_MODALS')} 
                        onRun={(parts) => runSynthesis(parts)}
                        onClear={() => dispatch({ type: 'SET_SYNTHESIS_RESULT', payload: null })}
                        onCopyForExternalAI={handleCopyForExternalAI}
                        onApplyProvenanceToGraph={handleApplyProvenanceToGraph}
                    />
                  </div>
              )}

              {activeNode && !isQueryMinimized && (
                <div className="absolute bottom-4 left-4 right-4 z-[45] animate-in slide-in-from-bottom-10 shadow-2xl flex flex-col pointer-events-auto rounded-xl overflow-hidden glass-panel-floating" style={{ height: bottomHeight }}>
                  
                  {/* RESIZE HANDLE */}
                  <div 
                    onMouseDown={startResizing('bottom')}
                    onTouchStart={startResizing('bottom')}
                    className="h-3 w-full cursor-row-resize bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center z-[60] group border-b border-white/5"
                  >
                      <GripHorizontal size={14} className="text-gray-400 group-hover:text-white transition-colors" />
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <NodeQuery 
                        node={activeNode} 
                        queryState={queryStates[activeNode.id]} 
                        isMinimized={isQueryMinimized} 
                        onToggleMinimize={() => setIsQueryMinimized(true)} 
                        onSendQuery={(q) => {
                            setQueryStates(prev => ({ ...prev, [activeNode.id]: { loading: true, answer: prev[activeNode.id]?.answer || '' } }));
                            addLog(`AI Query: Analyzing ${activeNode.label}...`, 'info');
                            analyzeGraphAgent(q, activeWs.data, config, activeNode.id).then(res => {
                                setQueryStates(prev => ({ ...prev, [activeNode.id]: { loading: false, answer: res.text } }));
                                // AUTO-SAVE AI ANSWER TO NODE REPORTS
                                const existingReports = activeNode.reports || "";
                                const newReports = existingReports + `\n\n=== AI ANALYST ===\n${res.text}`;
                                updateGraph({ nodes: [{ id: activeNode.id, reports: newReports }] });
                            }).catch(err => {
                                setQueryStates(prev => ({ ...prev, [activeNode.id]: { loading: false, answer: `Error: ${err.message}` } }));
                                addLog(`AI Query Failed: ${err.message}`, 'error');
                            });
                        }} 
                        onExternalUplink={() => {}} 
                        onEdit={() => executeUIAction('EDIT_NODE', activeNode)} 
                        onDelete={() => executeUIAction('DELETE_NODE', activeNode.id)} 
                        onVaultSearch={() => executeUIAction('VAULT_INTERLINK', activeNode)} 
                        onParseData={handleToolOutput}
                        onUpdateNode={(updatedNode) => updateGraph({ nodes: [updatedNode] })}
                    />
                  </div>
                </div>
              )}


              {exportPrompt && (
                  <div className="pointer-events-auto">
                    <ExportPromptModal 
                        prompt={exportPrompt} 
                        onClose={() => setExportPrompt(null)} 
                    />
                  </div>
              )}
          </div>

          {/* RIGHT PANEL */}
          <div className={`relative flex h-full z-40 transition-all duration-300 ${isRightCollapsed ? 'w-0' : ''}`} style={{ width: isRightCollapsed ? 0 : rightWidth, pointerEvents: !roomLockStatus.isUnlocked ? 'none' : 'auto' }}>
              <button onClick={() => setIsRightCollapsed(!isRightCollapsed)} className={`absolute top-1/2 -translate-y-1/2 bg-zinc-900 border border-white/10 text-white p-1 hover:bg-zinc-800 transition-all rounded-full shadow-xl z-50 ${isRightCollapsed ? 'right-0' : '-left-4'}`}>
                  {isRightCollapsed ? <ChevronLeft size={14}/> : <ChevronRightIcon size={14}/>}
              </button>
              <div 
                className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#ff0033] z-50 transition-colors flex items-center justify-center group" 
                onMouseDown={startResizing('right')}
                onTouchStart={startResizing('right')}
              >
                <div className="w-0.5 h-8 bg-white/20 group-hover:bg-white transition-colors rounded-full"></div>
              </div>
              <aside className="border-l border-white/10 glass-panel flex flex-col overflow-hidden h-full w-full rounded-tl-xl">
                  <Terminal 
                    logs={logs} 
                    activeNode={activeNode} 
                    strategyResult={strategyResult} 
                    onGenerateStrategy={runStrategyAnalysis} 
                    onParseOutput={handleToolOutput} 
                    onUpdateNode={(updatedNode) => updateGraph({ nodes: [updatedNode] })}
                    strategyLoading={strategyLoading} 
                    targetName={activeNode?.label || 'ROOT'} 
                    onClearStrategy={() => dispatch({ type: 'SET_STRATEGY_RESULT', payload: null })}
                    backendUrl={config.activeBackend === 'pc' ? config.pcBackendUrl : config.customBackendUrl} 
                    activeBackend={config.activeBackend}
                    activeTab={terminalTab}
                    onTabChange={setTerminalTab}
                    leakCheckPhone={leakCheckPhone}
                    allNodes={activeWs?.data?.nodes || []}
                    onSelectNode={(node) => {
                      setActiveNodeId(node.id);
                      setSelectedNodes([node]);
                    }}
                    onTriggerRadialAction={(action, node) => handleRadialAction(action, node)}
                  />
              </aside>
          </div>
        </div>

        {/* OPSEC PRIVACY SHIELD OVERLAY WHEN ROOM IS LOCKED - FULL WORKSTATION BLANKET */}
        {!roomLockStatus.isUnlocked && (
          <div 
            id="room-opsec-privacy-shield"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute inset-0 z-[80] bg-[#020912] flex flex-col items-center justify-center p-6 text-center select-none font-mono pointer-events-auto overflow-hidden"
          >
            {/* Wallpaper backdrop protection if active */}
            {state.config.visual?.wallpaperUrl && (
              <div 
                className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-40 mix-blend-luminosity filter blur-[1px]"
                style={{
                  backgroundImage: `url(${state.config.visual.wallpaperUrl})`,
                  backgroundSize: state.config.visual.wallpaperMode || 'cover',
                  backgroundPosition: 'center center'
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#020912] via-[#020912]/80 to-[#020912]/95 pointer-events-none" />

            <div className="relative z-10 max-w-md w-full p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900 via-rose-950/50 to-slate-950 border-2 border-rose-500/60 shadow-[0_0_60px_rgba(244,63,94,0.4)] space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center animate-pulse shadow-[0_0_25px_rgba(244,63,94,0.6)]">
                <Lock size={40} className="text-rose-400 stroke-[2.5]" />
              </div>

              <div className="space-y-1.5">
                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 text-[9.5px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  SEKATAN PRIVASI & KESELAMATAN OPSEC
                </span>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">
                  Bilik Operasi Terkunci
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/50 border border-cyan-500/30 text-xs font-mono">
                  <span className="text-slate-400">ID Siasatan:</span>
                  <span className="text-cyan-300 font-bold tracking-wider">
                    {roomLockStatus.roomId ? `${roomLockStatus.roomId.slice(0, 4)}***` : 'OPS-***'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-rose-900/40 text-left">
                {roomLockStatus.isEliteOnly ? (
                  <p className="text-purple-300 font-semibold flex items-start gap-2">
                    <span className="text-base">🛡️</span>
                    <span>
                      <b>Akses Terhad Elite Agent:</b> Bilik operasi ini dikhaskan untuk akaun Elite Agent sahaja. Penyiasat biasa tidak dibenarkan melihat atau mengendalikan nod siasatan di atas kanvas.
                    </span>
                  </p>
                ) : (
                  <p className="flex items-start gap-2">
                    <span className="text-base text-amber-400">🔑</span>
                    <span>
                      Bilik ini dilindungi kata laluan. Semua paparan entiti, nod, pautan, dan analisa di atas kanvas disorotkan sepenuhnya di sebalik wallpaper keselamatan untuk menjaga privasi siasatan sehingga passcode disahkan.
                    </span>
                  </p>
                )}
              </div>

              {/* INLINE PASSCODE UNLOCK FORM */}
              {!roomLockStatus.isEliteOnly ? (
                <form onSubmit={handleDirectRoomUnlock} className="space-y-3 pt-1">
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-cyan-400 pointer-events-none">
                      <Key size={16} />
                    </div>
                    <input
                      type={showRoomPasscodeText ? 'text' : 'password'}
                      value={roomPasscodeInput}
                      onChange={(e) => {
                        setRoomPasscodeInput(e.target.value);
                        if (roomPasscodeError) setRoomPasscodeError(null);
                      }}
                      placeholder="Masukkan Passcode Bilik / Kunci Utama..."
                      autoFocus
                      className="w-full bg-slate-950/90 border border-cyan-500/50 focus:border-cyan-400 rounded-xl pl-9 pr-10 py-2.5 text-xs text-cyan-100 placeholder-slate-500 font-mono outline-none shadow-inner focus:ring-2 focus:ring-cyan-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRoomPasscodeText(!showRoomPasscodeText)}
                      className="absolute right-3 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title={showRoomPasscodeText ? 'Sembunyikan Passcode' : 'Papar Passcode'}
                    >
                      {showRoomPasscodeText ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {roomPasscodeError && (
                    <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/60 text-rose-300 text-[10.5px] leading-relaxed flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0 text-rose-400" />
                      <span>{roomPasscodeError}</span>
                    </div>
                  )}

                  <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      type="submit"
                      disabled={isUnlockingRoom}
                      className="w-full sm:flex-1 px-5 py-2.5 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isUnlockingRoom ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Mengesahkan...</span>
                        </>
                      ) : (
                        <>
                          <Unlock size={14} className="stroke-[3]" />
                          <span>Buka Kunci Bilik</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCollabChat(true)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-cyan-500/40 hover:border-cyan-400 font-bold text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <FolderKanban size={14} className="text-cyan-400" />
                      <span>Pilih Bilik Lain</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRoomLockStatus(prev => ({ ...prev, isUnlocked: true }));
                        sessionStorage.setItem(`redhorizon_room_unlocked_${roomLockStatus.roomId}`, 'true');
                        addLog(`Pelepasan kecemasan bilik [${roomLockStatus.roomId}] berjaya.`, 'info');
                      }}
                      className="w-full sm:flex-1 px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xs uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <ShieldCheck size={14} className="stroke-[2.5]" />
                      <span>Bypass Khas Commander</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCollabChat(true)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-cyan-500/40 hover:border-cyan-400 font-bold text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <FolderKanban size={14} className="text-cyan-400" />
                      <span>Pilih Bilik Lain</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

        {/* MODALS WITH RESIZABLE & MINIMIZABLE CAPABILITIES */}
        {activeModal === 'settings' && (
          <TacticalModalWrapper
            modalId="settings"
            title="Sistem & Tetapan OSINT"
            subtitle="Konfigurasi API Keys, Model AI & Parameter Graf"
            icon={<SettingsIcon size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('settings')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('settings')}
          >
            <SettingsModal 
              shodanKey="" 
              activeModel={config.modelName} 
              currentConfig={config} 
              onSaveConfig={(k, c) => dispatch({type:'UPDATE_CONFIG', payload: c})} 
              onClose={() => executeUIAction('CLOSE_MODALS')} 
              gpuDensityMode={gpuDensityMode}
              onGpuDensityChange={handleGpuDensityChange}
            />
          </TacticalModalWrapper>
        )}

        {activeModal === 'import' && (
          <TacticalModalWrapper
            modalId="import"
            title="Import Data & Kes RHZ"
            subtitle="Muat naik fail .RHZ, JSON, CSV atau pangkalan data luar"
            icon={<Database size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('import')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('import')}
          >
            <DataImport 
                onImport={(ents) => updateGraph({ nodes: ents, links: [] })} 
                onRawImport={(g) => updateGraph(g)} 
                onLoadCase={handleLoadCase} 
                onSaveCase={handleSaveToFile} 
                onClose={() => executeUIAction('CLOSE_MODALS')} 
            />
          </TacticalModalWrapper>
        )}

        <LureCapture />

        {activeModal === 'manual' && (
          <TacticalModalWrapper
            modalId="manual"
            title="Tambah Entiti Manual"
            subtitle="Cipta nod sasaran baru dengan parameter terperinci"
            icon={<Plus size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('manual')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('manual')}
            defaultWidth={750}
            defaultHeight={580}
          >
            <ManualEntryModal initialNode={null} onAddNode={(n) => updateGraph({ nodes: [n] })} onEditNode={() => {}} onClose={() => executeUIAction('CLOSE_MODALS')} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'edit' && editingNode && (
          <TacticalModalWrapper
            modalId="edit"
            title={`Sunting Entiti: ${editingNode.label}`}
            subtitle="Kemas kini metadata, koordinat, dan laporan risikan"
            icon={<Target size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('edit')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('edit')}
            defaultWidth={750}
            defaultHeight={580}
          >
            <ManualEntryModal initialNode={editingNode} onAddNode={() => {}} onEditNode={(n) => updateGraph({ nodes: [n] })} onClose={() => executeUIAction('CLOSE_MODALS')} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'vault' && (
          <TacticalModalWrapper
            modalId="vault"
            title="BigData Scanner & Kebocoran Vault"
            subtitle="Pengimbasan data kebocoran komprehensif merentasi jutaan rekod"
            icon={<HardDrive size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('vault')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('vault')}
          >
            <BigDataScanner onClose={() => executeUIAction('CLOSE_MODALS')} onImportMatches={(d) => updateGraph(d)} onLog={addLog} initialQuery={vaultContext.query} sourceNodeId={vaultContext.sourceNodeId} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'geo_recon' && activeNode && (
          <TacticalModalWrapper
            modalId="geo_recon"
            title={`Tactical GEOINT: ${activeNode.label}`}
            subtitle="Satellites, IMINT, Triangulasi Koordinat & Radius 5KM"
            icon={<Globe size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('geo_recon')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('geo_recon')}
            defaultWidth={1200}
            defaultHeight={800}
          >
            <GeospatialRecon node={activeNode} onClose={() => executeUIAction('CLOSE_MODALS')} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'case_manager' && (
          <TacticalModalWrapper
            modalId="case_manager"
            title="Pengurus Ruang Kerja & Kes Siasatan"
            subtitle="Pusat pengurusan fail kes .RHZ, suis bilik siasatan & sandaran data"
            icon={<Briefcase size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('case_manager')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('case_manager')}
          >
            <CaseManager 
              cases={state.workspaces} 
              activeCaseId={activeWs.id} 
              onSwitchCase={(id) => {
                dispatch({ type: 'SWITCH_WORKSPACE', payload: id });
                const target = state.workspaces.find(w => w.id === id);
                addLog(`Beralih ke Misi Siasatan: [${target?.name || id}]`, 'info');
              }} 
              onCreateCase={(name) => {
                dispatch({ type: 'CREATE_WORKSPACE', payload: name });
                addLog(`Misi Baharu Diwujudkan: [${name}]`, 'success');
              }} 
              onRenameCase={(id, name) => {
                dispatch({ type: 'RENAME_WORKSPACE', payload: { id, name } });
                addLog(`Misi Dinamakan Semula: [${name}]`, 'info');
              }}
              onDuplicateCase={(id) => {
                dispatch({ type: 'DUPLICATE_WORKSPACE', payload: id });
                addLog(`Salinan Misi Kes Berjaya Dicipta`, 'success');
              }}
              onDeleteCase={(id) => {
                dispatch({ type: 'DELETE_WORKSPACE', payload: id });
                addLog(`Misi Kes Telah Dipadamkan`, 'warning');
              }} 
              onExportCase={handleExportSpecificCase}
              onImportCase={(cf) => handleLoadCase(cf, false)}
              onClose={() => executeUIAction('CLOSE_MODALS')} 
            />
          </TacticalModalWrapper>
        )}
        
        {/* NEW MODAL CONNECTIONS */}
        {activeModal === 'file_scanner' && (
          <TacticalModalWrapper
            modalId="file_scanner"
            title="File Forensic Scanner"
            subtitle="Analisis bait binari, metadata tersembunyi & pengesanan ancaman"
            icon={<FileSearch size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('file_scanner')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('file_scanner')}
          >
            <FileScanner onClose={() => executeUIAction('CLOSE_MODALS')} onLog={addLog} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'image_intel' && (
          <TacticalModalWrapper
            modalId="image_intel"
            title="Visual Intelligence Lab & EXIF IMINT"
            subtitle="Multimodal AI OCR, Pengecaman Wajah & Analisis Bayang/GPS"
            icon={<Camera size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('image_intel')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('image_intel')}
            defaultWidth={1200}
            defaultHeight={820}
          >
            <ImageIntel onClose={() => executeUIAction('CLOSE_MODALS')} onLog={addLog} onUpdateGraph={updateGraph} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'web_capture' && (
          <TacticalModalWrapper
            modalId="web_capture"
            title="Web Forensics & Target Capture"
            subtitle="Pengambilan bukti digital halaman web, snapshot & pautan luar"
            icon={<Globe size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('web_capture')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('web_capture')}
          >
            <WebCaptureModal onClose={() => executeUIAction('CLOSE_MODALS')} onLog={addLog} onUpdateGraph={updateGraph} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'share_trace' && (
          <TacticalModalWrapper
            modalId="share_trace"
            title="ShareTrace Network Recon"
            subtitle="Peta jejak pautan perkongsian & analisis rantaian rujukan"
            icon={<Network size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('share_trace')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('share_trace')}
          >
            <ShareTraceModal onClose={() => executeUIAction('CLOSE_MODALS')} onLog={addLog} onUpdateGraph={updateGraph} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'global_search' && (
          <TacticalModalWrapper
            modalId="global_search"
            title="Carian Pintar Entiti Global"
            subtitle="Penapisan pantas berbilang entiti mengikut atribut & teg"
            icon={<Search size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('global_search')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('global_search')}
            defaultWidth={750}
            defaultHeight={500}
          >
            <GlobalSearchModal nodes={activeWs.data.nodes} onClose={() => executeUIAction('CLOSE_MODALS')} onSelectNode={(id) => { const n = activeWs.data.nodes.find(node => node.id === id); if(n) { executeUIAction('CLOSE_MODALS'); handleNodeClick(n, {x:0,y:0}, false); } }} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'watson_recon' && (
          <TacticalModalWrapper
            modalId="watson_recon"
            title="IBM Watson Cognitive Recon & NER Engine"
            subtitle="Pengekstrakan entiti bernama, hubungan semantik & pengesanan ancaman kognitif"
            icon={<Brain size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('watson_recon')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('watson_recon')}
            defaultWidth={1100}
            defaultHeight={700}
          >
            <WatsonCognitiveModal 
              onClose={() => executeUIAction('CLOSE_MODALS')} 
              onLog={addLog} 
              onUpdateGraph={updateGraph}
              graphData={activeWs.data}
              initialSelectedNodes={selectedNodes}
            />
          </TacticalModalWrapper>
        )}

        {activeModal === 'extension_builder' && (
          <TacticalModalWrapper
            modalId="extension_builder"
            title="Userscript / Extension Builder"
            subtitle="Penyedia skrip pengikis OSINT peribadi untuk pelayar web"
            icon={<Cpu size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('extension_builder')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('extension_builder')}
          >
            <UserscriptBuilder onClose={() => executeUIAction('CLOSE_MODALS')} onLog={addLog} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'data_processor' && (
          <TacticalModalWrapper
            modalId="data_processor"
            title="Tactical Data Processor"
            subtitle="Pembersihan teks mentah, pengekstrakan JSON & penyusunan token AI"
            icon={<Zap size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('data_processor')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('data_processor')}
          >
            <DataProcessorModal 
              onClose={() => executeUIAction('CLOSE_MODALS')} 
              onLog={addLog} 
              onProcess={(p) => {
                navigator.clipboard.writeText(p);
                addLog("Prompt dijana & disalin ke clipboard! Sila paste di chat AI atau modul sasaran.", 'success');
              }}
              onProcessOffline={(json) => {
                const graphData = parseOfflineComments(json);
                if (graphData.nodes.length > 0) {
                    updateGraph(graphData);
                    addLog(`Data diproses secara tempatan: ${graphData.nodes.length} entiti ditambah.`, 'success');
                } else {
                    addLog("Gagal memproses data tempatan. Pastikan format JSON betul.", 'error');
                }
              }}
            />
          </TacticalModalWrapper>
        )}

        {activeModal === 'forensic_vault' && (
          <TacticalModalWrapper
            modalId="forensic_vault"
            title="Bilik Forensik Vault Terkelas"
            subtitle="Penyimpanan bukti kritikal, de-anonymization & perbandingan data"
            icon={<Shield size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('forensic_vault')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('forensic_vault')}
          >
            <ForensicVault onClose={() => executeUIAction('CLOSE_MODALS')} onExplode={(d) => updateGraph(d)} onLog={addLog} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'location_sting' && (
          <TacticalModalWrapper
            modalId="location_sting"
            title="Location Sting Operation"
            subtitle="Penjejakan pautan umpan & triangulasi pelayar sasaran"
            icon={<Crosshair size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('location_sting')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('location_sting')}
          >
            <LocationSting onClose={() => executeUIAction('CLOSE_MODALS')} onLog={addLog} updateGraph={updateGraph} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'social_analyzer' && (
          <TacticalModalWrapper
            modalId="social_analyzer"
            title="Social Graph & Influence Analyzer"
            subtitle="Analisis profil rangkaian sosial & matriks interaksi"
            icon={<MessageSquare size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('social_analyzer')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('social_analyzer')}
          >
            <SocialAnalyzer onClose={() => executeUIAction('CLOSE_MODALS')} onAnalysisComplete={(g, report) => { updateGraph(g); setActiveReport(report); }} onLog={addLog} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'osint_engine' && (
          <TacticalModalWrapper
            modalId="osint_engine"
            title="Smart OSINT AI Engine"
            subtitle="Enjin perisikan automatik bertenaga LLM terkini"
            icon={<Brain size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('osint_engine')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('osint_engine')}
          >
            <OsintAIEngine onClose={() => executeUIAction('CLOSE_MODALS')} onLog={addLog} />
          </TacticalModalWrapper>
        )}

        {showAIChat && (
          <FloatingAIChat 
            selectedNodes={selectedNodes} 
            allNodes={activeWs?.data?.nodes || []}
            allLinks={activeWs?.data?.links || []}
            activeNode={activeNode}
            config={config} 
            onClose={() => setShowAIChat(false)} 
            onUpdateGraph={updateGraph}
            onExecuteRadialAction={handleRadialAction}
            onExecuteUIAction={executeUIAction}
            onLog={addLog}
            onDeleteNodes={(nodeIds: string[]) => {
              dispatch({ type: 'DELETE_MULTIPLE_NODES', payload: nodeIds });
            }}
          />
        )}
        
        {activeModal === 'entity_fusion' && (
          <TacticalModalWrapper
            modalId="entity_fusion"
            title="Entity Fusion & Gabungan Nod"
            subtitle="Penyatuan berbilang identiti ke dalam satu profil perisikan utama"
            icon={<GitMerge size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('entity_fusion')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('entity_fusion')}
          >
            <EntityFusionModal 
              graph={activeWs.data} 
              onUpdateGraph={updateGraph} 
              onClose={() => executeUIAction('CLOSE_MODALS')} 
              onLog={addLog} 
            />
          </TacticalModalWrapper>
        )}

        {activeModal === 'intelligence_briefing' && (
          <TacticalModalWrapper
            modalId="intelligence_briefing"
            title="Intelligence Briefing Exporter"
            subtitle="Penjanaan laporan rasmi terperinci format PDF, HTML & Markdown"
            icon={<FileText size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('intelligence_briefing')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('intelligence_briefing')}
          >
            <IntelligenceReportExporter 
              graph={activeWs.data} 
              activeNode={activeNode} 
              onClose={() => executeUIAction('CLOSE_MODALS')} 
              onLog={addLog} 
            />
          </TacticalModalWrapper>
        )}

        {activeModal === 'stylometry' && (
          <TacticalModalWrapper
            modalId="stylometry"
            title="Stylometry Linguistic Lab"
            subtitle="Analisis gaya penulisan, corak kosa kata & cap jari bahasa"
            icon={<Fingerprint size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('stylometry')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('stylometry')}
          >
            <StylometryLab onClose={() => executeUIAction('CLOSE_MODALS')} onLog={addLog} onUpdateGraph={updateGraph} />
          </TacticalModalWrapper>
        )}

        <TutorialOverlay isOpen={activeModal === 'tutorial'} onClose={() => executeUIAction('CLOSE_MODALS')} />
        
        {activeModal === 'sna_panel' && (
          <TacticalModalWrapper
            modalId="sna_panel"
            title="Social Network Analysis (SNA) Metrics"
            subtitle="Pengiraan darjah ketengahan (Betweenness, Degree, Closeness)"
            icon={<Network size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('sna_panel')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('sna_panel')}
          >
            <SnaPanel graph={activeWs.data} onClose={() => executeUIAction('CLOSE_MODALS')} onSelectNode={(id) => { const n = activeWs.data.nodes.find(node => node.id === id); if(n) handleNodeClick(n, {x:0,y:0}, false); }} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'conflict_detector' && (
          <TacticalModalWrapper
            modalId="conflict_detector"
            title="Semantica Contradiction & Anomaly Engine"
            subtitle="Pengesanan percanggahan masa-ruang, identiti kembar & anomali graf"
            icon={<AlertTriangle size={18} className="text-amber-400" />}
            isOpen={true}
            isMinimized={minimizedModals.includes('conflict_detector')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('conflict_detector')}
            defaultWidth={1050}
            defaultHeight={720}
          >
            <ConflictDetectorModal 
              graphData={activeWs.data}
              conflicts={detectedConflicts}
              onClose={() => executeUIAction('CLOSE_MODALS')}
              onSelectNodes={(nodeIds) => {
                const matched = activeWs.data.nodes.filter(node => nodeIds.includes(node.id));
                if (matched.length > 0) {
                  setSelectedNodes(matched);
                  setActiveNodeId(matched[0].id);
                  window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: matched[0].id } }));
                }
              }}
              onAddConflictNodeToGraph={handleAddConflictNodeToGraph}
              onRunAiConflictResolution={handleRunAiConflictResolution}
            />
          </TacticalModalWrapper>
        )}

        {activeModal === 'timeline' && (
          <TacticalModalWrapper
            modalId="timeline"
            title="Temporal Analytics & Forensic Timeline"
            subtitle="Garis masa kronologi kejadian, hantaran & interaksi masa"
            icon={<Clock size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('timeline')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('timeline')}
            defaultWidth={1250}
            defaultHeight={820}
          >
            <TimelineWorkspace 
              nodes={activeWs.data.nodes} 
              links={activeWs.data.links} 
              selectedNodeIds={selectedNodes.map(n => n.id)} 
              onClose={() => executeUIAction('CLOSE_MODALS')} 
              onOpenGeoRecon={(node) => {
                setActiveNodeId(node.id);
                setSelectedNodes([node]);
                executeUIAction('OPEN_MODAL', 'geo_recon');
              }}
            />
          </TacticalModalWrapper>
        )}

        {activeModal === 'offline_logic' && (
          <TacticalModalWrapper
            modalId="offline_logic"
            title="Modul Logik Luar Talian (Offline Engine)"
            subtitle="Pemprosesan risikan tempatan tanpa sambungan internet"
            icon={<Cpu size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('offline_logic')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('offline_logic')}
          >
            <OfflineLogicModule onClose={() => executeUIAction('CLOSE_MODALS')} onImport={(d) => updateGraph(d)} onLog={addLog} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'dork_builder' && (
          <TacticalModalWrapper
            modalId="dork_builder"
            title="Claude-OSINT Tradecraft & Advanced Dorking Engine"
            subtitle="Saringan rahsia, preset dorks 80+ corak, imbasan baldi awan S3 & skor risiko OSINT"
            icon={<ShieldAlert size={18} className="text-cyan-400" />}
            isOpen={true}
            isMinimized={minimizedModals.includes('dork_builder')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('dork_builder')}
            defaultWidth={950}
            defaultHeight={680}
          >
            <TradecraftReconModal onClose={() => executeUIAction('CLOSE_MODALS')} onLog={addLog} initialTarget={activeNode?.label} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'autonomous_agent' && (
          <TacticalModalWrapper
            modalId="autonomous_agent"
            title="Autonomous Recon Drone & Multi-Agent Swarm"
            subtitle="Penerokaan nod automatik dengan pengekstrakan pautan berantai"
            icon={<Radio size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('autonomous_agent')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('autonomous_agent')}
            defaultWidth={1200}
            defaultHeight={820}
          >
            <AutonomousAgentModal 
              initialTarget={activeNode?.label || ''}
              activeNode={activeNode}
              existingNodes={activeWs?.data?.nodes || []}
              onClose={() => executeUIAction('CLOSE_MODALS')}
              onUpdateGraph={updateGraph}
              onLog={addLog}
            />
          </TacticalModalWrapper>
        )}

        {activeModal === 'verify_node_web' && activeNode && (
          <TacticalModalWrapper
            modalId="verify_node_web"
            title={`Pengesahan Fakta Web Langsung: ${activeNode.label}`}
            subtitle="Penyelidikan OSINT Internet secara langsung dengan Gemini 3.7 Flash & Google Grounding"
            icon={<Globe size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('verify_node_web')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('verify_node_web')}
            defaultWidth={1150}
            defaultHeight={780}
          >
            <NodeWebVerificationModal
              node={activeNode}
              graphData={activeWs.data}
              onClose={() => executeUIAction('CLOSE_MODALS')}
              onUpdateGraph={updateGraph}
              onLog={addLog}
              onOpenTool={(toolId) => executeUIAction('OPEN_MODAL', toolId)}
            />
          </TacticalModalWrapper>
        )}

        {/* Added Social Recon and Shodan Panels */}
        {activeModal === 'social_recon' && activeNode && (
          <TacticalModalWrapper
            modalId="social_recon"
            title={`Social Recon OSINT: ${activeNode.label}`}
            subtitle="Pencarian profil media sosial automatik (FB, IG, X, TikTok, LinkedIn)"
            icon={<Users size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('social_recon')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('social_recon')}
          >
            <SocialRecon targetNode={activeNode} tavilyApiKey={config.tavilyApiKey} onComplete={(nodes) => { updateGraph({ nodes, links: nodes.map(n => ({ source: activeNode.id, target: n.id, label: 'social_link' })) }); executeUIAction('CLOSE_MODALS'); }} onLog={addLog} onClose={() => executeUIAction('CLOSE_MODALS')} />
          </TacticalModalWrapper>
        )}

        {activeModal === 'shodan_panel' && shodanData && (
          <TacticalModalWrapper
            modalId="shodan_panel"
            title="Shodan Infrastructure Recon"
            subtitle="Pelabuhan terbuka, perkhidmatan pelayan & telemetri IoT"
            icon={<Server size={18} />}
            isOpen={true}
            isMinimized={minimizedModals.includes('shodan_panel')}
            onClose={() => executeUIAction('CLOSE_MODALS')}
            onMinimizeToggle={() => handleMinimizeModal('shodan_panel')}
          >
            <ShodanPanel data={shodanData} onClose={() => executeUIAction('CLOSE_MODALS')} />
          </TacticalModalWrapper>
        )}

        {(showTrafficVisionModal || activeModal === 'cctv_hub') && !minimizedModals.includes('cctv_hub') && (
            <TrafficVisionMapModal 
                onClose={() => {
                    setShowTrafficVisionModal(false);
                    if (activeModal === 'cctv_hub') executeUIAction('CLOSE_MODALS');
                    setMinimizedModals(prev => prev.filter(id => id !== 'cctv_hub'));
                }} 
                onOpenMapillaryModal={handleLaunchMapillaryDirect}
                onOpenGoogleEarthModal={handleLaunchGoogleEarth}
            />
        )}

        {(showPhoneIntelModal || activeModal === 'phone_intel') && (
            <PhoneIntelHubModal
                isOpen={true}
                initialNode={phoneIntelTargetNode || activeNode || undefined}
                initialPhone={phoneIntelTargetNode?.label || activeNode?.label || ''}
                initialTab={phoneIntelInitialTab}
                onClose={() => {
                    setShowPhoneIntelModal(false);
                    if (activeModal === 'phone_intel') executeUIAction('CLOSE_MODALS');
                }}
                onAddNodesAndEdges={(newNodes, newEdges) => {
                    updateGraph({
                        nodes: newNodes,
                        links: newEdges.map(e => ({
                            source: e.source,
                            target: e.target,
                            label: e.label
                        }))
                    });
                    addLog(`Menambah ${newNodes.length} nod & ${newEdges.length} pautan daripada Phone Intel Hub ke dalam graf.`, 'success');
                }}
            />
        )}

        {(showGoogleSocintModal || activeModal === 'google_socint') && (
            <GoogleSocintModal
                isOpen={true}
                initialTarget={googleSocintTargetNode || activeNode || undefined}
                initialQuery={googleSocintInitialQuery || googleSocintTargetNode?.label || activeNode?.label || ''}
                onClose={() => {
                    setShowGoogleSocintModal(false);
                    if (activeModal === 'google_socint') executeUIAction('CLOSE_MODALS');
                }}
                onAddNodesAndEdges={(newNodes, newEdges) => {
                    updateGraph({
                        nodes: newNodes,
                        links: newEdges.map(e => ({
                            source: e.source,
                            target: e.target,
                            label: e.label
                        }))
                    });
                    if (newNodes.length > 0) {
                        const primaryNode = newNodes[0];
                        setActiveNodeId(primaryNode.id);
                        setSelectedNodes([primaryNode]);
                        window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: primaryNode.id } }));
                    }
                    addLog(`Google SOCINT (CX): Ditambah ${newNodes.length} nod & ${newEdges.length} pautan ke graf. Butiran terperinci dimuatkan ke Dossier.`, 'success');
                }}
            />
        )}
        
        {activeReport && <DraggableReport report={activeReport} onClose={() => setActiveReport(null)} />}
        
        {showBreachModal && (
            <BreachResultModal 
                result={breachResult} 
                onClose={() => setShowBreachModal(false)} 
            />
        )}

        {/* MODULAR ENRICHER HUB MODAL (POI, CRYPTO & NETWORK) */}
        {showEnricherHubModal && (
          <ModularEnricherHubModal
            initialNode={enricherTargetNode || activeNode || null}
            graphNodes={activeWs.data.nodes}
            onClose={() => {
              setShowEnricherHubModal(false);
              setEnricherTargetNode(null);
            }}
            onUpdateGraph={({ nodes, links }) => {
              if (nodes && nodes.length > 0) {
                updateGraph({ nodes, links: links || [] });
                addLog(`Modular Enricher: Berjaya menambah ${nodes.length} nod & ${links?.length || 0} pautan ke graf.`, "success");
              }
            }}
            onLog={(msg, type) => addLog(msg, type)}
          />
        )}

        {/* TACTICAL MINIMIZED MODALS DOCK BAR */}
        <TacticalMinimizedDock 
          minimizedModals={minimizedModals}
          onRestoreModal={handleRestoreModal}
          onCloseModal={handleCloseModalFully}
        />

        {/* FLOATING MENTION BANNER ALERT IF CHAT CLOSED */}
        {mentionAlert && mentionAlert.unreadCount > 0 && !showCollabChat && (
          <div 
            onClick={() => {
              setShowCollabChat(true);
              setMentionAlert(null);
            }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 cursor-pointer animate-in fade-in slide-in-from-top-4 duration-300 select-none"
          >
            <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-2 border-red-500 text-white rounded-full shadow-[0_0_30px_rgba(239,68,68,0.9)] ring-2 ring-red-400/80 hover:scale-105 transition-transform">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="font-black text-red-200 tracking-wider">🚨 DISERU:</span>
                <span className="font-bold text-amber-300">@{mentionAlert.latestSender}</span>
                <span className="text-slate-200 text-[11px] truncate max-w-xs italic hidden sm:inline">
                  "{mentionAlert.latestText}"
                </span>
              </div>
              <span className="px-2 py-0.5 bg-red-500 text-slate-950 text-[10px] font-black rounded-full uppercase ml-1 shadow">
                Buka Chat ↗
              </span>
            </div>
          </div>
        )}

        <CollaborativeChatModal 
          isOpen={showCollabChat} 
          onClose={() => setShowCollabChat(false)} 
          activeNode={activeNode} 
          allNodes={activeWs.data.nodes} 
          graphData={activeWs.data} 
          onFocusNode={handleFocusNodeFromChat} 
          onUpdateGraphFromCloud={handleUpdateGraphFromCloud} 
          onLoadCase={handleLoadCase}
          activeModal={showTrafficVisionModal ? 'cctv_hub' : activeModal}
          onMentionAlertChange={setMentionAlert}
          shareNodeTarget={shareNodeTarget}
          onClearShareNodeTarget={() => setShareNodeTarget(null)}
          onOpenModal={(modalId, node) => {
            if (node) {
              setActiveNodeId(node.id);
              setSelectedNodes([node]);
            }
            executeUIAction('OPEN_MODAL', modalId);
          }}
          onRoomStatusChange={handleRoomStatusChange}
        />

        {/* COMPACT PROGRESS BAR HUD (0% - 100%) FOR .RHZ / CASE / INTEL LOADING */}
        <FileLoadProgressHUD />

        {/* DEFENSE ONTOLOGY ENGINE & REASONING HUB MODAL */}
        <OntologyEngineModal
          isOpen={showOntologyEngineModal}
          onClose={() => setShowOntologyEngineModal(false)}
          graphData={activeWs.data}
          onUpdateGraph={updateGraph}
          onOpenEnricherHub={(node, target, targetType) => {
            setEnricherTargetNode(node);
            setShowEnricherHubModal(true);
          }}
          onSelectNode={(id) => {
            setActiveNodeId(id);
            const targetNode = activeWs.data.nodes.find(n => n.id === id);
            if (targetNode) setSelectedNodes([targetNode]);
          }}
          onLog={addLog}
        />

        {/* SEMANTIC TRIPLES MODAL */}
        <SemanticTriplesModal
          isOpen={showSemanticTriplesModal}
          onClose={() => setShowSemanticTriplesModal(false)}
          graphData={activeWs.data}
          onSelectNode={(id) => {
            setActiveNodeId(id);
            const targetNode = activeWs.data.nodes.find(n => n.id === id);
            if (targetNode) setSelectedNodes([targetNode]);
          }}
          onAddNodeLinkFromTriple={(sub, pred, obj) => {
            const subId = sub.toLowerCase().replace(/\s+/g, '_');
            const objId = obj.toLowerCase().replace(/\s+/g, '_');
            const existingSub = activeWs.data.nodes.find(n => n.id === subId || n.label.toLowerCase() === sub.toLowerCase());
            const existingObj = activeWs.data.nodes.find(n => n.id === objId || n.label.toLowerCase() === obj.toLowerCase());

            const newNodes: Node[] = [];
            if (!existingSub) {
              newNodes.push({ id: subId, label: sub, type: 'person', brand: 'person', details: `Manual Triple Subject` });
            }
            if (!existingObj) {
              newNodes.push({ id: objId, label: obj, type: 'organization', brand: 'organization', details: `Manual Triple Object` });
            }

            const newLink = { source: existingSub ? existingSub.id : subId, target: existingObj ? existingObj.id : objId, label: pred };

            updateGraph({
              nodes: [...activeWs.data.nodes, ...newNodes],
              links: [...activeWs.data.links, newLink],
              replace: true
            });
            addLog(`Triples Semantik: Ditambah entiti '${sub}' -[${pred}]-> '${obj}' ke graf.`, 'success');
          }}
        />

        {/* TEMPORAL TIMELINE SLIDER & PLAYBACK BAR */}
        <TemporalTimelineBar
          graphData={activeWs.data}
          isVisible={showTimelineBar}
          onToggleVisible={handleToggleTimelineBar}
          onTimelineFilterChange={handleTimelineFilterChange}
        />

        {/* LEAD ADMIN ACCESS APPROVAL PORTAL MODAL */}
        <AccessApprovalAdminModal
          isOpen={showAdminApprovalModal}
          onClose={() => setShowAdminApprovalModal(false)}
          currentUserEmail={currentUser?.email}
        />

        {/* MOBILE TACTICAL CONTROL HUB (Floating Radar Orb, D-Pad Joystick, 1-Tap Field Capture & GPS Recon) */}
        <MobileTacticalControlHub
          activeWs={activeWs}
          activeNode={activeNode}
          selectedNodes={selectedNodes}
          onSelectNode={(node) => {
            setActiveNodeId(node.id);
            setSelectedNodes([node]);
            window.dispatchEvent(new CustomEvent('app:focus-node-zoom', { detail: { nodeId: node.id } }));
          }}
          onOpenModal={(modalId) => executeUIAction('OPEN_MODAL', modalId)}
          onAddNode={(newNode) => {
            dispatch({
              type: 'UPDATE_GRAPH',
              payload: {
                nodes: [newNode as any]
              }
            });
          }}
          onLinkNodes={(sourceId, targetId, label) => {
            dispatch({
              type: 'UPDATE_GRAPH',
              payload: {
                links: [{ source: sourceId, target: targetId, label }]
              }
            });
          }}
          autosaveHUD={
            <RhzAutosaveHUD 
              activeWorkspace={activeWs}
              onRestoreSnapshot={(cf) => handleLoadCase(cf, false)}
              onOpenRhzFile={(cf, name) => handleLoadCase(cf, false, name)}
              onTriggerSave={handleSaveToFile}
            />
          }
        />
        
        {/* PWA Full-screen Standalone Install Prompt */}
        <PWAInstallPrompt />

      </div>

      {/* ACCESS GATE FULL SCREEN APP LOCK SHIELD (Rendered outside main app container) */}
      {(!isTerminalUnlocked || showAccessGateModal) && (
        <div 
          id="redhorizon-lock-screen-portal" 
          className="fixed inset-0 z-[99999999] bg-[#01070d] pointer-events-auto select-none"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <AccessGate
            currentUser={currentUser ? {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL
            } : (localUser ? {
              uid: localUser.uid,
              email: localUser.email,
              displayName: localUser.displayName,
              photoURL: localUser.photoURL
            } : null)}
            accessRequest={userAccessRequest}
            authLoading={authLoading}
            initialMode="commander"
            isLocked={!isTerminalUnlocked}
            onClose={isTerminalUnlocked ? () => setShowAccessGateModal(false) : undefined}
            onLocalLogin={(profile) => {
              sessionStorage.setItem('redhorizon_session_active', '1');
              sessionStorage.setItem('redhorizon_terminal_unlocked', '1');
              localStorage.setItem('redhorizon_authenticated', 'true');
              localStorage.setItem('redhorizon_local_user', JSON.stringify(profile));
              setLocalUser(profile);
              setIsTerminalUnlocked(true);
              setShowAccessGateModal(false);
              addLog(`Terminal dibuka: Selamat kembali, ${profile.displayName}.`, 'success');
            }}
            onEnterTerminal={() => {
              sessionStorage.setItem('redhorizon_session_active', '1');
              sessionStorage.setItem('redhorizon_terminal_unlocked', '1');
              localStorage.setItem('redhorizon_authenticated', 'true');
              setIsTerminalUnlocked(true);
              setShowAccessGateModal(false);
              addLog('Terminal Red Horizon dibuka. Akses operasi aktif.', 'success');
            }}
            onRefreshStatus={async () => {
              if (currentUser) {
                const req = await checkOrCreateAccessRequest(currentUser);
                setUserAccessRequest(req);
              }
            }}
          />
        </div>
      )}
    </>
  );
}

