import React, { useState, useMemo } from 'react';
import { Node, Link, Workspace } from '../types';
import { 
  Search, Globe, Trash2, Edit2, Link as LinkIcon, Database, Phone, MessageCircle, 
  Share2, Map, Shield, UserSearch, FileSearch, Cpu, ShieldAlert, 
  Sparkles, Radar, Image as ImageIcon, X, Target, Zap, ChevronRight,
  Smartphone, Send, MessageSquare, Combine, GitMerge, Clock, Download,
  ExternalLink, Lock, CheckCircle2, AlertTriangle, Layers, Network, ArrowRight, Brain
} from 'lucide-react';
import { extractNodeCommentsAndIntel } from '../utils/socialCommentUtils';

export interface RadialMenuProps {
  node: Node;
  selectedNodes?: Node[];
  position: { x: number; y: number };
  onAction: (action: string, customPayload?: any) => void;
  onClose: () => void;
  workspaces?: Workspace[];
}

export type TransformCategory = 'all' | 'ai' | 'recon' | 'leak' | 'social' | 'graph' | 'geo';

export interface RadialMenuItem {
  id: string;
  label: string;
  shortLabel?: string;
  category: 'ai' | 'recon' | 'leak' | 'social' | 'graph' | 'geo';
  icon: React.ReactNode;
  description: string;
  applicableTypes: ('person' | 'domain' | 'server' | 'ip' | 'phone' | 'email' | 'location' | 'organization' | 'comment' | 'any' | 'multi_only')[];
  color?: string;
  badgeColor?: string;
  priority?: number;
  isMultiSupported?: boolean;
}

export const RadialMenu: React.FC<RadialMenuProps> = ({ 
  node, 
  selectedNodes = [], 
  position, 
  onAction, 
  onClose,
  workspaces = []
}) => {
  // Normalize target nodes: if selectedNodes contains nodes, use that, otherwise wrap single node
  const activeNodes = useMemo(() => {
    if (selectedNodes && selectedNodes.length > 0) {
      // Ensure current primary node is included if valid
      const hasNode = selectedNodes.some(n => n.id === node.id);
      return hasNode ? selectedNodes : [node, ...selectedNodes];
    }
    return [node];
  }, [node, selectedNodes]);

  const isMultiMode = activeNodes.length > 1;

  // Active Category Filter for Dial
  const [activeCategory, setActiveCategory] = useState<TransformCategory>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [hoveredItem, setHoveredItem] = useState<{
    item: RadialMenuItem;
    angle: number;
    isOuter: boolean;
    x: number;
    y: number;
    disabled: boolean;
    disabledReason?: string;
    applicableCount: number;
  } | null>(null);

  // Analyze types of active nodes for intelligence matching
  const nodeTypeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    activeNodes.forEach(n => {
      const type = (n.type || 'entity').toLowerCase();
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [activeNodes]);

  // Master definition of all possible tools, transforms and intelligence actions
  const allMenuItems: RadialMenuItem[] = useMemo(() => {
    const primarySocialIntel = extractNodeCommentsAndIntel(node);

    const items: RadialMenuItem[] = [];

    // Direct comment jump if available
    if (primarySocialIntel.hasDirectCommentLink || primarySocialIntel.primaryCommentUrl) {
      items.push({
        id: 'OPEN_COMMENT_URL',
        label: 'Pautan Komen Asal',
        shortLabel: 'Komen Asal',
        category: 'social',
        icon: <MessageSquare size={14} className="text-amber-400 animate-pulse" />,
        description: `Buka pautan langsung komentar target di ${primarySocialIntel.platform}`,
        applicableTypes: ['comment', 'person', 'any'],
        badgeColor: 'border-amber-500 text-amber-300',
        priority: 100,
        isMultiSupported: false
      });
    }

    // 1. AI & SYNTHESIS TOOLS
    items.push(
      {
        id: 'WATSON_COGNITIVE',
        label: isMultiMode ? `IBM Watson Multi-Node Reasoning (${activeNodes.length})` : 'IBM Watson Cognitive Recon',
        shortLabel: 'Watson Recon',
        category: 'ai',
        icon: <Brain size={14} className="text-cyan-400 animate-pulse" />,
        description: isMultiMode
          ? `Menganalisa perkaitan mendalam, hipotesis kognitif & korelasi tersembunyi antara ${activeNodes.length} nod sasaran dalam konteks keseluruhan kanvas graf.`
          : `Analisa kognitif & perkaitan kontekstual entiti "${node.label}" terhadap topologi keseluruhan kanvas siasatan.`,
        applicableTypes: ['any'],
        badgeColor: 'border-cyan-500 text-cyan-300',
        priority: 98,
        isMultiSupported: true
      },
      {
        id: 'MULTI_AI_SYNTHESIS',
        label: isMultiMode ? 'AI Multi-Node Synthesis & Bridge' : 'AI Strategic Synthesis',
        shortLabel: 'AI Synthesis',
        category: 'ai',
        icon: <Sparkles size={14} className="text-yellow-400 animate-pulse" />,
        description: isMultiMode 
          ? `Menganalisis korelasi & mencari titik pertemuan antara ${activeNodes.length} entiti terpilih`
          : `Analisis strategik komprehensif profil entiti "${node.label}"`,
        applicableTypes: ['any'],
        badgeColor: 'border-yellow-500 text-yellow-300',
        priority: 95,
        isMultiSupported: true
      },
      {
        id: 'VERIFY_NODE_WEB',
        label: isMultiMode ? 'Neural Fact-Check Pukal' : 'Sahkan Web (Google)',
        shortLabel: 'Sahkan Web',
        category: 'ai',
        icon: <Globe size={14} className="text-cyan-400" />,
        description: 'Pengesahan fakta internet & web grounding secara langsung',
        applicableTypes: ['any'],
        badgeColor: 'border-cyan-500 text-cyan-300',
        priority: 90,
        isMultiSupported: true
      },
      {
        id: 'AUTONOMOUS_AGENT',
        label: 'Drone Peninjau AI Scout',
        shortLabel: 'Auto Scout',
        category: 'ai',
        icon: <Radar size={14} className="text-red-400 animate-pulse" />,
        description: 'Ejen autonomi mengimbas dan membina nod secara automatik',
        applicableTypes: ['any'],
        badgeColor: 'border-red-500 text-red-300',
        priority: 88,
        isMultiSupported: true
      },
      {
        id: 'DEEP_OSINT',
        label: 'Arena Deep OSINT Dossier',
        shortLabel: 'Arena Deep',
        category: 'ai',
        icon: <Sparkles size={14} className="text-purple-400" />,
        description: 'Siasatan OSINT mendalam lengkap dengan korelasi visual',
        applicableTypes: ['any'],
        badgeColor: 'border-purple-500 text-purple-300',
        priority: 85,
        isMultiSupported: true
      },
      {
        id: 'AI_SEARCH',
        label: 'Tavily Deep Intel Search',
        shortLabel: 'AI Search',
        category: 'ai',
        icon: <Cpu size={14} className="text-emerald-400" />,
        description: 'Carian pintar risikan web & auto-peta nod ke dalam kanvas',
        applicableTypes: ['any'],
        badgeColor: 'border-emerald-500 text-emerald-300',
        priority: 82,
        isMultiSupported: true
      },
      {
        id: 'BRAVE',
        label: 'Brave AI Multi-Dossier (JSON)',
        shortLabel: 'Brave AI',
        category: 'ai',
        icon: <Search size={14} className="text-amber-400" />,
        description: 'Carian OSINT AI pintar: 10+ pautan imej & video (YouTube/TikTok/Berita), dokumen & JSON dossier',
        applicableTypes: ['any'],
        badgeColor: 'border-amber-500 text-amber-300',
        priority: 80,
        isMultiSupported: true
      },
      {
        id: 'OPEN_ONTOLOGY_HUB',
        label: 'Enjin Ontologi & Penaakulan Semantik',
        shortLabel: 'Ontologi & Inferens',
        category: 'graph',
        icon: <Brain size={14} className="text-cyan-400 animate-pulse" />,
        description: 'Jalankan penaakulan semantik, pembongkar Dead End, dan korelasi silang atribut (Identity Bridges).',
        applicableTypes: ['any'],
        badgeColor: 'border-cyan-500 text-cyan-300',
        priority: 95,
        isMultiSupported: true
      },
      {
        id: 'OPEN_ENRICHER_HUB',
        label: 'Modular Enricher Hub (POI, Kripto & Rangkaian)',
        shortLabel: 'Enricher Hub',
        category: 'recon',
        icon: <Zap size={14} className="text-amber-400 animate-pulse" />,
        description: 'Jalankan modul pengayaan data berkuasa tinggi (Profil POI, NRIC, SSM, Blockchain, Domain WHOIS) khusus untuk nod ini.',
        applicableTypes: ['any'],
        badgeColor: 'border-amber-500 text-amber-300',
        priority: 79,
        isMultiSupported: true
      },
      {
        id: 'DORK_BUILDER',
        label: 'Google / DDG Dork Builder',
        shortLabel: 'Dorking',
        category: 'recon',
        icon: <FileSearch size={14} className="text-blue-400" />,
        description: 'Pembina kueri pencarian mendalam dengan operator OSINT khusus',
        applicableTypes: ['any'],
        badgeColor: 'border-blue-500 text-blue-300',
        priority: 78,
        isMultiSupported: true
      },
      {
        id: 'MALTEGO_TRANSFORMS',
        label: 'Maltego Transforms & Chain Engine',
        shortLabel: 'Maltego Transforms',
        category: 'recon',
        icon: <Zap size={14} className="text-yellow-400" />,
        description: 'Jalankan siri transformasi Maltego (DNS, IP, E-mel, Alias, ASN, Gabungan)',
        applicableTypes: ['any'],
        badgeColor: 'border-yellow-500 text-yellow-300',
        priority: 77,
        isMultiSupported: false
      }
    );

    // 2. SOCIAL MEDIA & PERSON INTELLIGENCE
    items.push(
      {
        id: 'GOOGLE_SOCINT',
        label: isMultiMode ? `Google SOCINT Studio (${activeNodes.length} Sasaran)` : 'Google Custom Search (SOCINT)',
        shortLabel: 'Google SOCINT',
        category: 'social',
        icon: <Search size={14} className="text-cyan-400 animate-pulse" />,
        description: 'Carian jejak digital sosial mendalam (CX: 53a0041f2f24f4e3b) - IG, X, TikTok, FB, Telegram',
        applicableTypes: ['any'],
        badgeColor: 'border-cyan-500 text-cyan-300',
        priority: 76,
        isMultiSupported: true
      },
      {
        id: 'SOCIAL_RECON',
        label: isMultiMode ? 'Batch Social Media Recon' : 'Social Footprint Recon',
        shortLabel: 'Social Recon',
        category: 'social',
        icon: <UserSearch size={14} className="text-purple-400" />,
        description: 'Pengekstrakan jejak akaun di Facebook, X, IG, TikTok, LinkedIn & Telegram',
        applicableTypes: ['person', 'comment'],
        badgeColor: 'border-purple-500 text-purple-300',
        priority: 75,
        isMultiSupported: true
      },
      {
        id: 'SOCIAL_SCAN',
        label: 'Socials Relationship Graph',
        shortLabel: 'Socials Graph',
        category: 'social',
        icon: <Share2 size={14} className="text-sky-400" />,
        description: 'Pemetaan hubungan rangkaian media sosial dan rakan bersekutu',
        applicableTypes: ['person'],
        badgeColor: 'border-sky-500 text-sky-300',
        priority: 72,
        isMultiSupported: true
      },
      {
        id: 'SHARE_TO_CHAT',
        label: isMultiMode ? `Siarkan ${activeNodes.length} Nod ke Chat Ops` : 'Kongsi Entiti ke Chat Ops',
        shortLabel: 'Kongsi Chat',
        category: 'social',
        icon: <MessageCircle size={14} className="text-cyan-400" />,
        description: 'Siarkan data entiti ke bilik sembang siasatan operasi',
        applicableTypes: ['any'],
        badgeColor: 'border-cyan-500 text-cyan-300',
        priority: 70,
        isMultiSupported: true
      }
    );

    // 3. PHONE & TELECOM INTELLIGENCE
    items.push(
      {
        id: 'PHONE_INTEL',
        label: isMultiMode ? 'Batch Phone Intel Hub' : 'Pusat Risikan Telefon',
        shortLabel: 'Phone Hub',
        category: 'recon',
        icon: <Smartphone size={14} className="text-amber-400" />,
        description: 'Pusat risikan telefon bersepadu (NumVerify + SerpApi + TG + WA)',
        applicableTypes: ['phone'],
        badgeColor: 'border-amber-500 text-amber-300',
        priority: 68,
        isMultiSupported: true
      },
      {
        id: 'NUMVERIFY',
        label: 'NumVerify Carrier & Telco',
        shortLabel: 'NumVerify',
        category: 'recon',
        icon: <Phone size={14} className="text-cyan-400" />,
        description: 'Pengesahan talian telco, jenis talian (Mobile/VoIP) & format antarabangsa',
        applicableTypes: ['phone'],
        badgeColor: 'border-cyan-500 text-cyan-300',
        priority: 65,
        isMultiSupported: true
      },
      {
        id: 'SERPAPI',
        label: 'SerpApi Phone Dork & Scam',
        shortLabel: 'SerpApi Recon',
        category: 'recon',
        icon: <Search size={14} className="text-emerald-400" />,
        description: 'Carian rekod pangkalan data scam dan penipuan digital nombor telefon',
        applicableTypes: ['phone'],
        badgeColor: 'border-emerald-500 text-emerald-300',
        priority: 62,
        isMultiSupported: true
      },
      {
        id: 'TELEGRAM_LOOKUP',
        label: 'Telegram MTProto Checker',
        shortLabel: 'Telegram OSINT',
        category: 'social',
        icon: <Send size={14} className="text-sky-400" />,
        description: 'Semakan Bellingcat MTProto & carian profil akaun Telegram aktif',
        applicableTypes: ['phone', 'person'],
        badgeColor: 'border-sky-500 text-sky-300',
        priority: 60,
        isMultiSupported: true
      },
      {
        id: 'TRUECALLER',
        label: 'Truecaller Caller ID',
        shortLabel: 'Truecaller',
        category: 'recon',
        icon: <Shield size={14} className="text-emerald-400" />,
        description: 'Carian identiti nama berdaftar pemanggil antarabangsa',
        applicableTypes: ['phone'],
        badgeColor: 'border-emerald-500 text-emerald-300',
        priority: 58,
        isMultiSupported: true
      },
      {
        id: 'WHATSAPP',
        label: 'WhatsApp Direct Pivot',
        shortLabel: 'WhatsApp',
        category: 'social',
        icon: <MessageCircle size={14} className="text-emerald-400" />,
        description: 'Pautan terus mesej dan semakan profil WhatsApp',
        applicableTypes: ['phone'],
        badgeColor: 'border-emerald-500 text-emerald-300',
        priority: 55,
        isMultiSupported: true
      }
    );

    // 4. DOMAIN, IP & INFRASTRUCTURE INTELLIGENCE
    items.push(
      {
        id: 'WHOIS',
        label: isMultiMode ? 'Batch WHOIS & DNS Records' : 'WHOIS & DNS Recon',
        shortLabel: 'WHOIS / DNS',
        category: 'recon',
        icon: <Globe size={14} className="text-cyan-400" />,
        description: 'Dapatkan rekod pendaftaran domain, registrar, dan pemetaan DNS',
        applicableTypes: ['domain', 'server', 'ip'],
        badgeColor: 'border-cyan-500 text-cyan-300',
        priority: 52,
        isMultiSupported: true
      },
      {
        id: 'OPEN_MAP_HUD',
        label: isMultiMode ? 'Plot Entiti pada Peta Satelit' : 'Pandangan Satelit & GEOINT',
        shortLabel: 'Satelit / Map',
        category: 'geo',
        icon: <Map size={14} className="text-emerald-400" />,
        description: 'Plot koordinat GPS & paparan satelit geospatial interaktif',
        applicableTypes: ['location', 'server', 'ip', 'any'],
        badgeColor: 'border-emerald-500 text-emerald-300',
        priority: 50,
        isMultiSupported: true
      }
    );

    // 5. BREACH & DARK WEB LEAK DATA
    items.push(
      {
        id: 'BREACH_DIRECTORY',
        label: 'BreachDirectory Leak Scanner',
        shortLabel: 'BreachDir',
        category: 'leak',
        icon: <ShieldAlert size={14} className="text-red-400" />,
        description: 'Imbasan kebocoran kata laluan dan log data tiris global',
        applicableTypes: ['email', 'person', 'domain'],
        badgeColor: 'border-red-500 text-red-300',
        priority: 48,
        isMultiSupported: true
      },
      {
        id: 'CHECKLEAKED',
        label: 'CheckLeaked Breach Lookup',
        shortLabel: 'Check Leaks',
        category: 'leak',
        icon: <ShieldAlert size={14} className="text-rose-400" />,
        description: 'Semakan integriti pangkalan data tiris bagi e-mel, telefon, & IP',
        applicableTypes: ['email', 'phone', 'server', 'ip'],
        badgeColor: 'border-rose-500 text-rose-300',
        priority: 45,
        isMultiSupported: true
      },
      {
        id: 'HORIZON',
        label: 'Horizon12 Intelligence Base',
        shortLabel: 'Horizon12',
        category: 'leak',
        icon: <Database size={14} className="text-blue-400" />,
        description: 'Korelasi arkib pangkalan data perisikan keselamatan siber',
        applicableTypes: ['email', 'phone', 'domain', 'server', 'person'],
        badgeColor: 'border-blue-500 text-blue-300',
        priority: 42,
        isMultiSupported: true
      },
      {
        id: 'ZUCKERED',
        label: 'Zuckered Facebook Leak',
        shortLabel: 'Zuckered',
        category: 'leak',
        icon: <Database size={14} className="text-blue-400" />,
        description: 'Semakan penglibatan nombor telefon atau e-mel dalam kebocoran Facebook',
        applicableTypes: ['phone', 'email'],
        badgeColor: 'border-blue-500 text-blue-300',
        priority: 40,
        isMultiSupported: true
      },
      {
        id: 'VAULT',
        label: 'BigData Vault Archive Search',
        shortLabel: 'BigData Vault',
        category: 'leak',
        icon: <Database size={14} className="text-amber-400" />,
        description: 'Carian mendalam merentas arkib pangkalan data tiris tempatan',
        applicableTypes: ['person', 'email', 'phone'],
        badgeColor: 'border-amber-500 text-amber-300',
        priority: 38,
        isMultiSupported: true
      }
    );

    // 6. GRAPH TOPOLOGY, CONNECTIONS & WORKSPACES
    if (isMultiMode) {
      items.push(
        {
          id: 'INTERLINK_ALL',
          label: `Hubungkan Kesemua ${activeNodes.length} Nod (Interlink)`,
          shortLabel: 'Hubungkan Semua',
          category: 'graph',
          icon: <Network size={14} className="text-indigo-400 animate-pulse" />,
          description: 'Cipta sambungan hubungan dua hala antara kesemua nod terpilih',
          applicableTypes: ['any'],
          badgeColor: 'border-indigo-500 text-indigo-300',
          priority: 99,
          isMultiSupported: true
        },
        {
          id: 'ENTITY_FUSION',
          label: `Cantumkan ${activeNodes.length} Entiti (Entity Fusion)`,
          shortLabel: 'Cantumkan Entiti',
          category: 'graph',
          icon: <GitMerge size={14} className="text-emerald-400" />,
          description: 'Satukan berbilang identiti ke dalam satu profil perisikan utama',
          applicableTypes: ['any'],
          badgeColor: 'border-emerald-500 text-emerald-300',
          priority: 96,
          isMultiSupported: true
        }
      );
    } else {
      items.push(
        {
          id: 'EDIT',
          label: 'Sunting Data & Nota Entiti',
          shortLabel: 'Sunting',
          category: 'graph',
          icon: <Edit2 size={14} className="text-zinc-300" />,
          description: 'Ubah label, jenis entiti, nota risikan dan pautan URL',
          applicableTypes: ['any'],
          badgeColor: 'border-zinc-500 text-zinc-200',
          priority: 35,
          isMultiSupported: false
        },
        {
          id: 'LINK',
          label: 'Pautkan Sambungan Manual',
          shortLabel: 'Pautkan Nod',
          category: 'graph',
          icon: <LinkIcon size={14} className="text-indigo-400" />,
          description: 'Pautkan nod ini kepada entiti sasaran lain pada kanvas',
          applicableTypes: ['any'],
          badgeColor: 'border-indigo-500 text-indigo-300',
          priority: 32,
          isMultiSupported: false
        }
      );
    }

    // Common Graph & Deletion Action
    items.push({
      id: 'DELETE',
      label: isMultiMode ? `Padamkan ${activeNodes.length} Nod Terpilih (Bulk Purge)` : 'Padam Entiti dari Kanvas',
      shortLabel: isMultiMode ? `Padam (${activeNodes.length})` : 'Padam Nod',
      category: 'graph',
      icon: <Trash2 size={14} className="text-rose-500" />,
      color: 'text-rose-500 border-rose-500/50 hover:bg-rose-600',
      description: isMultiMode 
        ? `Hapuskan kesemua ${activeNodes.length} nod terpilih berserta sambungannya secara kekal`
        : `Hapuskan entiti "${node.label}" dari graf`,
      applicableTypes: ['any'],
      badgeColor: 'border-rose-500 text-rose-300',
      priority: 10,
      isMultiSupported: true
    });

    return items;
  }, [node, activeNodes, isMultiMode]);

  // SMART COMPATIBILITY CHECK FOR EACH ITEM
  const processedMenuItems = useMemo(() => {
    return allMenuItems.map(item => {
      // Check how many of the selected nodes match the tool's required types
      if (item.applicableTypes.includes('any')) {
        return {
          ...item,
          disabled: false,
          applicableCount: activeNodes.length,
          disabledReason: undefined
        };
      }

      // Check matching nodes with smart heuristics
      const matchingNodes = activeNodes.filter(n => {
        const type = (n.type || '').toLowerCase();
        if (item.applicableTypes.some(t => t.toLowerCase() === type)) {
          return true;
        }

        // Smart heuristic fallback: detect if node label or details naturally matches the required type
        const text = `${n.label || ''} ${n.details || ''}`.trim();
        const hasPhone = /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4,})/.test(text) || /^\+?\d{8,15}$/.test(n.label.replace(/\s+/g, ''));
        const hasEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text);
        const hasDomain = /^(https?:\/\/)?([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}(:\d+)?(\/.*)?$/i.test(n.label.trim()) || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(n.label.trim());
        const hasCoordinates = /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/.test(text);

        if (item.applicableTypes.includes('phone') && hasPhone) return true;
        if (item.applicableTypes.includes('email') && hasEmail) return true;
        if ((item.applicableTypes.includes('domain') || item.applicableTypes.includes('ip') || item.applicableTypes.includes('server')) && hasDomain) return true;
        if (item.applicableTypes.includes('location') && hasCoordinates) return true;

        return false;
      });

      const isCompatible = matchingNodes.length > 0;

      let disabledReason: string | undefined = undefined;
      if (!isCompatible) {
        const requiredNames = item.applicableTypes.map(t => {
          if (t === 'person') return 'Orang/Profil';
          if (t === 'domain') return 'Domain';
          if (t === 'server' || t === 'ip') return 'Pelayan/IP';
          if (t === 'phone') return 'Telefon';
          if (t === 'email') return 'E-mel';
          if (t === 'location') return 'Lokasi/GPS';
          if (t === 'comment') return 'Komentar';
          return t;
        }).join(' / ');

        disabledReason = `Tidak Sesuai: Alat ini memerlukan nod jenis '${requiredNames}' (${matchingNodes.length} ditemui)`;
      }

      return {
        ...item,
        disabled: !isCompatible,
        applicableCount: matchingNodes.length,
        disabledReason
      };
    });
  }, [allMenuItems, activeNodes]);

  // Filter based on active category & optional search
  const visibleItems = useMemo(() => {
    let list = processedMenuItems;
    if (activeCategory !== 'all') {
      list = list.filter(item => item.category === activeCategory);
    }
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      list = list.filter(item => 
        item.label.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }

    // Sort by priority, keeping active compatible items first
    return list.sort((a, b) => {
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      return (b.priority || 0) - (a.priority || 0);
    });
  }, [processedMenuItems, activeCategory, filterSearch]);

  // DUAL-RING RADIAL ORBIT GEOMETRY
  const { innerRing, outerRing } = useMemo(() => {
    if (visibleItems.length <= 8) {
      return { innerRing: visibleItems, outerRing: [] };
    }
    
    // Split into Core Inner Ring (up to 8 items) and Specialized Outer Ring (up to 12 items)
    const coreCount = Math.min(8, Math.ceil(visibleItems.length / 2));
    return {
      innerRing: visibleItems.slice(0, coreCount),
      outerRing: visibleItems.slice(coreCount, 20) // Cap max visible radial elements for clean visibility
    };
  }, [visibleItems]);

  const innerRadius = 78;
  const outerRadius = 136;

  // Viewport edge clamping so radial menu is never pushed offscreen
  const clampedX = Math.max(outerRadius + 40, Math.min(window.innerWidth - outerRadius - 40, position.x));
  const clampedY = Math.max(outerRadius + 70, Math.min(window.innerHeight - outerRadius - 70, position.y));

  return (
    <>
      {/* Click backdrop trap to close */}
      <div 
        className="fixed inset-0 z-[9998] pointer-events-auto bg-black/50 backdrop-blur-[2px] cursor-crosshair" 
        onClick={onClose}
      />

      <div 
        className="fixed z-[9999] pointer-events-none select-none animate-in fade-in zoom-in-95 duration-150"
        style={{ left: clampedX, top: clampedY }}
      >
        
        {/* Central Interactive Radial Stage */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-0 h-0 pointer-events-auto">
          
          {/* Subtle SVG Radar / Orbit Guides */}
          <svg 
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40 overflow-visible"
            width={outerRadius * 2 + 60} 
            height={outerRadius * 2 + 60}
            viewBox={`-${outerRadius + 30} -${outerRadius + 30} ${outerRadius * 2 + 60} ${outerRadius * 2 + 60}`}
          >
            <circle cx="0" cy="0" r={innerRadius} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-cyan-500/40" />
            {outerRing.length > 0 && (
              <circle cx="0" cy="0" r={outerRadius} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-rose-500/30" />
            )}
            {/* Crosshair lines */}
            <line x1={-outerRadius - 20} y1="0" x2={outerRadius + 20} y2="0" stroke="currentColor" strokeWidth="0.5" className="text-white/15" />
            <line x1="0" y1={-outerRadius - 20} x2="0" y2={outerRadius + 20} stroke="currentColor" strokeWidth="0.5" className="text-white/15" />
          </svg>

          {/* Quick Category Switcher Tabs Floating Above Hub */}
          <div className="absolute -top-[168px] left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/90 border border-white/10 p-1 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md whitespace-nowrap z-40">
            {(['all', 'ai', 'recon', 'social', 'leak', 'geo', 'graph'] as TransformCategory[]).map(cat => {
              const isActive = activeCategory === cat;
              const catLabels: Record<string, string> = {
                all: 'Semua',
                ai: '🧠 AI',
                recon: '🌐 Recon',
                social: '👤 Sosial',
                leak: '🛡️ Tiris',
                geo: '🗺️ Geo',
                graph: '🕸️ Graf'
              };
              return (
                <button
                  key={cat}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategory(cat);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.6)]' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {catLabels[cat] || cat}
                </button>
              );
            })}
          </div>

          {/* Center Target Hub */}
          <div 
            onClick={onClose}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-slate-950/95 border-2 shadow-[0_0_30px_rgba(6,182,212,0.4)] flex flex-col items-center justify-center p-1.5 cursor-pointer hover:border-red-500 hover:scale-105 transition-all group z-30 ${
              isMultiMode ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-cyan-500/80'
            }`}
            title="Klik untuk tutup menu dial"
          >
            <div className="text-[7px] font-mono font-black text-cyan-400 uppercase tracking-wider truncate max-w-[64px] text-center mb-0.5">
              {hoveredItem ? (
                hoveredItem.disabled ? (
                  <span className="text-red-400 flex items-center justify-center gap-0.5">
                    <Lock size={8} /> TIDAK SESUAI
                  </span>
                ) : (
                  hoveredItem.item.category?.toUpperCase()
                )
              ) : isMultiMode ? (
                <span className="text-amber-400 font-bold">{activeNodes.length} NOD TERPILIH</span>
              ) : (
                node.type?.toUpperCase() || 'ENTITI'
              )}
            </div>
            
            <div className="text-[9px] font-bold text-white uppercase text-center leading-tight truncate max-w-[66px] group-hover:text-red-400 transition-colors">
              {hoveredItem ? (
                <span className="text-amber-300 font-mono text-[8.5px] block leading-tight truncate">
                  {hoveredItem.item.shortLabel || hoveredItem.item.label}
                </span>
              ) : isMultiMode ? (
                <span className="truncate block text-amber-300 font-black">MALTEGO DIAL</span>
              ) : (
                <span className="truncate block">{node.label}</span>
              )}
            </div>

            <div className="mt-1 flex items-center justify-center gap-1 text-[7px] text-slate-400 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isMultiMode ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span>{hoveredItem ? (hoveredItem.disabled ? 'TERSEKAT' : 'TEKAN') : 'TUTUP'}</span>
            </div>
          </div>

          {/* INNER ORBIT BUTTONS */}
          {innerRing.map((item, index) => {
            const total = innerRing.length;
            const angle = (index * (360 / total) - 90) * (Math.PI / 180);
            const x = Math.cos(angle) * innerRadius;
            const y = Math.sin(angle) * innerRadius;

            const isHovered = hoveredItem?.item.id === item.id;
            const isDisabled = item.disabled;

            return (
              <div
                key={item.id}
                className={`absolute transition-transform ${isHovered ? 'z-40' : 'z-20'}`}
                style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
              >
                <button
                  disabled={isDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) {
                      onAction(item.id, { isMulti: isMultiMode, nodes: activeNodes });
                    }
                  }}
                  onMouseEnter={() => setHoveredItem({ 
                    item, 
                    angle, 
                    isOuter: false, 
                    x, 
                    y, 
                    disabled: isDisabled,
                    disabledReason: item.disabledReason,
                    applicableCount: item.applicableCount
                  })}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`relative w-9.5 h-9.5 rounded-full flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.85)] ${
                    isDisabled 
                      ? 'bg-slate-900/60 border border-slate-800 text-slate-600 cursor-not-allowed opacity-40 grayscale' 
                      : `bg-slate-950/95 border border-slate-700 hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-white text-slate-200 hover:scale-125 cursor-pointer ${item.color || ''}`
                  } ${isHovered && !isDisabled ? 'ring-2 ring-cyan-400 scale-125 bg-cyan-500/30' : ''}`}
                  aria-label={item.label}
                >
                  {item.icon}

                  {/* Multi-badge counter or lock badge */}
                  {isDisabled ? (
                    <div className="absolute -top-1 -right-1 bg-slate-900 border border-red-500/40 text-red-400 rounded-full p-0.5 shadow-sm">
                      <Lock size={8} />
                    </div>
                  ) : isMultiMode && item.applicableCount > 1 ? (
                    <div className="absolute -top-1 -right-1 bg-amber-500 text-black font-black text-[7px] px-1 rounded-full border border-black shadow-sm font-mono leading-tight">
                      {item.applicableCount}
                    </div>
                  ) : null}
                </button>
              </div>
            );
          })}

          {/* OUTER ORBIT BUTTONS (For additional specialized tools) */}
          {outerRing.map((item, index) => {
            const total = outerRing.length;
            // Stagger angle by half-step so outer items sit nicely around inner ring
            const angleOffset = (360 / total) / 2;
            const angle = (index * (360 / total) + angleOffset - 90) * (Math.PI / 180);
            const x = Math.cos(angle) * outerRadius;
            const y = Math.sin(angle) * outerRadius;

            const isHovered = hoveredItem?.item.id === item.id;
            const isDisabled = item.disabled;

            return (
              <div
                key={item.id}
                className={`absolute transition-transform ${isHovered ? 'z-40' : 'z-20'}`}
                style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
              >
                <button
                  disabled={isDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) {
                      onAction(item.id, { isMulti: isMultiMode, nodes: activeNodes });
                    }
                  }}
                  onMouseEnter={() => setHoveredItem({ 
                    item, 
                    angle, 
                    isOuter: true, 
                    x, 
                    y, 
                    disabled: isDisabled,
                    disabledReason: item.disabledReason,
                    applicableCount: item.applicableCount
                  })}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`relative w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.9)] ${
                    isDisabled
                      ? 'bg-slate-900/60 border border-slate-800 text-slate-600 cursor-not-allowed opacity-40 grayscale'
                      : `bg-slate-950/95 border border-rose-500/40 hover:border-rose-400 hover:bg-rose-500/20 hover:text-white text-slate-300 hover:scale-125 cursor-pointer ${item.color || ''}`
                  } ${isHovered && !isDisabled ? 'ring-2 ring-rose-400 scale-125 bg-rose-500/30' : ''}`}
                  aria-label={item.label}
                >
                  {item.icon}

                  {isDisabled ? (
                    <div className="absolute -top-1 -right-1 bg-slate-900 border border-red-500/40 text-red-400 rounded-full p-0.5 shadow-sm">
                      <Lock size={8} />
                    </div>
                  ) : isMultiMode && item.applicableCount > 1 ? (
                    <div className="absolute -top-1 -right-1 bg-amber-500 text-black font-black text-[7px] px-1 rounded-full border border-black shadow-sm font-mono leading-tight">
                      {item.applicableCount}
                    </div>
                  ) : null}
                </button>
              </div>
            );
          })}

          {/* TOP-LAYER HOISTED FLOATING TOOLTIP */}
          {hoveredItem && (() => {
            const baseRadius = hoveredItem.isOuter ? outerRadius : innerRadius;
            const tipDistance = baseRadius + (hoveredItem.isOuter ? 26 : 22);
            const tipX = Math.cos(hoveredItem.angle) * tipDistance;
            const tipY = Math.sin(hoveredItem.angle) * tipDistance;

            return (
              <div 
                className="absolute pointer-events-none z-[999999] animate-in fade-in zoom-in-95 duration-100"
                style={{
                  transform: `translate(${tipX}px, ${tipY}px) translate(-50%, -50%)`
                }}
              >
                <div className={`px-2.5 py-1.5 rounded-lg bg-slate-950/98 backdrop-blur-md border text-[9.5px] font-mono shadow-[0_0_25px_rgba(0,0,0,0.98)] flex flex-col gap-1 max-w-[240px] ${
                  hoveredItem.disabled 
                    ? 'border-red-500/60 text-slate-300' 
                    : hoveredItem.item.badgeColor || 'border-cyan-500 text-white'
                }`}>
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-0.5">
                    <span className="text-white font-black text-[10px] truncate">
                      {hoveredItem.item.label}
                    </span>
                    {hoveredItem.disabled ? (
                      <span className="text-[7.5px] font-bold px-1.5 py-0.2 bg-red-950/80 border border-red-500/50 text-red-400 rounded-full shrink-0 flex items-center gap-0.5">
                        <Lock size={8} /> Tidak Sesuai
                      </span>
                    ) : isMultiMode && (
                      <span className="text-[7.5px] font-bold px-1.5 py-0.2 bg-amber-950/80 border border-amber-500/50 text-amber-300 rounded-full shrink-0">
                        {hoveredItem.applicableCount} sasaran
                      </span>
                    )}
                  </div>

                  <div className="text-[8px] text-slate-300 leading-tight">
                    {hoveredItem.disabledReason ? (
                      <span className="text-red-300 flex items-start gap-1">
                        <AlertTriangle size={10} className="shrink-0 mt-0.5 text-red-400" />
                        <span>{hoveredItem.disabledReason}</span>
                      </span>
                    ) : (
                      hoveredItem.item.description
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </>
  );
};

export default RadialMenu;
