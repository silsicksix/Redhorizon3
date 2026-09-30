import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  FileText,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Download,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Building,
  User,
  MapPin,
  Phone,
  Mail,
  Globe,
  Coins,
  Car,
  FileCode,
  Calendar,
  X,
  ExternalLink,
  ChevronRight,
  Database,
  Network,
  Lightbulb,
  Crosshair,
  GitBranch,
  Shield,
  Plus,
  Gem,
  Film,
  Ghost,
  Bug,
  Fingerprint,
  Camera,
  Radio,
  Landmark
} from 'lucide-react';
import { GraphData, Node, Link } from '../types';

export interface WatsonEntity {
  name: string;
  type: 
    | 'person' 
    | 'company' 
    | 'organization' 
    | 'location' 
    | 'phone' 
    | 'email' 
    | 'domain' 
    | 'crypto' 
    | 'vehicle' 
    | 'event' 
    | 'document' 
    | 'fictional_character'
    | 'fictional_object'
    | 'found_footage'
    | 'cryptid_myth'
    | 'weapon_hardware'
    | 'malware_payload'
    | 'biometric_evidence'
    | 'surveillance_device'
    | 'broadcast_frequency'
    | 'classified_dossier'
    | 'financial_instrument'
    | 'other';
  role?: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'suspicious' | 'critical_threat';
  confidence: number;
  relevanceScore?: number;
  aliases?: string[];
  attributes?: Record<string, string>;
  contextExcerpt?: string;
}

export interface WatsonRelation {
  source: string;
  target: string;
  predicate: string;
  relationshipType: 'hierarchy' | 'financial' | 'communication' | 'ownership' | 'kinship' | 'criminal_link' | 'geographical' | 'association';
  confidence: number;
  evidenceSnippet?: string;
}

export interface WatsonCognitiveResult {
  success: boolean;
  sourceType: 'text_dossier' | 'live_grounded_search';
  queryOrTitle?: string;
  executiveSummary: string;
  threatScore: number;
  overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'HIGH_RISK_THREAT';
  riskFlags: string[];
  keyCategories: string[];
  entities: WatsonEntity[];
  relations: WatsonRelation[];
  totalEntities: number;
  totalRelations: number;
  hypothesisAndInsights?: string[];
  hiddenCorrelations?: string[];
  suggestedActionItems?: string[];
  criticalVectors?: string[];
  timestamp: number;
  error?: string;
}

interface WatsonCognitiveModalProps {
  onClose: () => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
  onUpdateGraph: (data: { nodes?: Node[]; links?: any[]; replace?: boolean }) => void;
  graphData: GraphData;
  initialSelectedNodes?: Node[];
}

const SAMPLE_TEXT_1 = `Hasil siasatan awal terhadap kes skim pelaburan emas tidak wujud 'Aura Gold Global Sdn Bhd' (No SSM: 202101034988) mendapati syarikat ini beroperasi dari Suite 18-A, Menara Mercu, Jalan Ampang, 50450 Kuala Lumpur.
Pengarah Urusan syarikat dikenali sebagai Datuk Seri Ramli Bin Kassim (No IC: 780512-14-5891), manakala isterinya Datin Noraishah Binti Ahmad memegang 40% pegangan saham dan bertindak sebagai penandatangan utama akaun Maybank (No Akaun: 514012998877).
Sebanyak RM 4.8 Juta telah dipindahkan dari akaun syarikat ke alamat dompet kripto USDT TRC20: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t yang dikawal oleh seorang proksi bernama Kevin Wong (Talian WhatsApp: +6012-8899123, Emel: kevin.wong@auragold.io).
Laman web rasmi skim auragold.io dihoskan pada alamat IP 104.21.48.91 (Cloudflare) dan didaftarkan menggunakan domain registrar Namecheap Inc. Siasatan lanjut mendapati kenderaan mewah jenis Porsche Cayenne bernombor pendaftaran VEE 8888 didaftarkan atas nama Aura Gold Global Sdn Bhd.`;

const SAMPLE_TEXT_2 = `Laporan Risikan Transaksi Wang Haram Sindiket 'Phantom Apex':
Sindiket diketuai oleh Tan Sri Albert Low, pemilik Apex Mega Holdings Ltd yang berdaftar di British Virgin Islands (BVI). 
Wang haram disalurkan melalui syarikat cengkerang tempatan Apex Logistics Sdn Bhd di Pelabuhan Klang.
Ketua Operasi Logistik, Encik Murad Bin Hassan (No Tel: +6019-3344556), didapati kerap berkomunikasi dengan kapten kapal kargo MV Ocean Pearl (IMO: 9348821).
Transaksi berjumlah USD 1.2 Juta telah dikesan ke akaun peribadi Murat di CIMB Bank (No: 7041289901) sebelum dialihkan ke dompet Bitcoin: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa.`;

export const WatsonCognitiveModal: React.FC<WatsonCognitiveModalProps> = ({
  onClose,
  onLog,
  onUpdateGraph,
  graphData,
  initialSelectedNodes = []
}) => {
  // Tabs: 'canvas' (Analyze Selected Nodes in Canvas Context), 'text' (Raw Text Extraction), 'search' (Live Web Recon)
  const [activeTab, setActiveTab] = useState<'canvas' | 'text' | 'search'>(
    initialSelectedNodes && initialSelectedNodes.length > 0 ? 'canvas' : 'canvas'
  );

  // Selected Nodes for Canvas Tab
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(
    initialSelectedNodes.map(n => n.id)
  );
  const [customPrompt, setCustomPrompt] = useState('');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [result, setResult] = useState<WatsonCognitiveResult | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [entitySearch, setEntitySearch] = useState('');
  const [copiedTriples, setCopiedTriples] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<WatsonEntity | null>(null);

  // If initial nodes change from props, update selection
  useEffect(() => {
    if (initialSelectedNodes && initialSelectedNodes.length > 0) {
      setSelectedNodeIds(initialSelectedNodes.map(n => n.id));
      setActiveTab('canvas');
    } else if (graphData.nodes.length > 0 && selectedNodeIds.length === 0) {
      // Auto-select first node or two if available
      setSelectedNodeIds(graphData.nodes.slice(0, 2).map(n => n.id));
    }
  }, [initialSelectedNodes, graphData.nodes]);

  // Toggle a node selection for Canvas Analysis
  const toggleNodeSelection = (id: string) => {
    setSelectedNodeIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllNodes = () => {
    setSelectedNodeIds(graphData.nodes.map(n => n.id));
  };

  const clearSelectedNodes = () => {
    setSelectedNodeIds([]);
  };

  // 1. Analyze Selected Nodes in Context of Whole Canvas
  const handleAnalyzeCanvas = async () => {
    if (selectedNodeIds.length === 0) {
      onLog('Sila pilih sekurang-kurangnya satu nod sasaran daripada kanvas.', 'warning');
      return;
    }

    setLoading(true);
    setProgressStage('Menghubungi IBM Watson Cognitive Reasoner...');
    setResult(null);
    setSelectedEntity(null);

    const targetNodes = graphData.nodes.filter(n => selectedNodeIds.includes(n.id)).map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      details: n.details,
      riskScore: n.riskScore,
      tags: n.tags,
      attributes: (n as any).attributes || (n as any).metadata
    }));

    const allNodes = graphData.nodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      details: n.details ? n.details.slice(0, 300) : undefined,
      riskScore: n.riskScore,
      tags: n.tags
    }));

    const allLinks = graphData.links.map(l => ({
      source: typeof l.source === 'object' ? (l.source as any).id : String(l.source),
      target: typeof l.target === 'object' ? (l.target as any).id : String(l.target),
      label: l.label,
      notes: (l as any).notes
    }));

    try {
      setTimeout(() => setProgressStage('Menganalisis Korelasi Topologi Graf & Perkaitan Multi-Hop...'), 1000);
      setTimeout(() => setProgressStage('Merangka Hipotesis Risikan & Menjana Triples Hubungan Baharu...'), 2200);

      const res = await fetch('/api/watson/analyze-canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedNodes: targetNodes,
          allGraphNodes: allNodes,
          allGraphLinks: allLinks,
          customInstruction: customPrompt.trim() || undefined
        })
      });

      const data: WatsonCognitiveResult = await res.json();
      if (res.ok && data.success) {
        setResult(data);
        onLog(`Watson Cognitive Reasoner: Berjaya menganalisis ${targetNodes.length} nod sasaran dalam konteks keseluruhan kanvas (${allNodes.length} nod, ${allLinks.length} pautan)!`, 'success');
      } else {
        throw new Error(data.error || 'Gagal menganalisis konteks kanvas.');
      }
    } catch (err: any) {
      onLog(`Ralat Watson Reasoner: ${err.message || 'Gagal memproses analisis kanvas.'}`, 'error');
    } finally {
      setLoading(false);
      setProgressStage('');
    }
  };

  // 2. Extract Text Report
  const handleExtractText = async () => {
    if (!inputText.trim()) {
      onLog('Sila masukkan teks dokumen atau tampal artikel siasatan terlebih dahulu.', 'warning');
      return;
    }

    setLoading(true);
    setProgressStage('Menghubungi IBM Watson Cognitive Engine...');
    setResult(null);
    setSelectedEntity(null);

    try {
      setTimeout(() => setProgressStage('Melakukan De-konstruksi Semantik & Named Entity Recognition (NER)...'), 800);
      setTimeout(() => setProgressStage('Memetakan Hubungan Ontologi & Pengiraan Matriks Risiko...'), 1800);

      const res = await fetch('/api/watson/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });

      const data: WatsonCognitiveResult = await res.json();
      if (res.ok && data.success) {
        setResult(data);
        onLog(`Watson Cognitive Recon: Berjaya mengekstrak ${data.totalEntities} entiti dan ${data.totalRelations} hubungan semantik!`, 'success');
      } else {
        throw new Error(data.error || 'Gagal mengekstrak entiti kognitif.');
      }
    } catch (err: any) {
      onLog(`Ralat Watson Engine: ${err.message || 'Gagal memproses pengekstrakan.'}`, 'error');
    } finally {
      setLoading(false);
      setProgressStage('');
    }
  };

  // 3. Search & Extract
  const handleSearchExtract = async () => {
    if (!searchQuery.trim()) {
      onLog('Sila masukkan kata kunci sasaran carian.', 'warning');
      return;
    }

    setLoading(true);
    setProgressStage('Menjalankan Carian Berita & Rekod Awam dengan Google Search Grounding...');
    setResult(null);
    setSelectedEntity(null);

    try {
      setTimeout(() => setProgressStage('Menghimpunkan Sumber Risikan & Melakukan Pengesanan Entiti...'), 1200);
      setTimeout(() => setProgressStage('Membina Graf Pengetahuan Kognitif (Cognitive Knowledge Graph)...'), 2400);

      const res = await fetch('/api/watson/search-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });

      const data: WatsonCognitiveResult = await res.json();
      if (res.ok && data.success) {
        setResult(data);
        onLog(`Watson Live Search: Berjaya memetakan ${data.totalEntities} entiti daripada web langsung untuk "${searchQuery}"!`, 'success');
      } else {
        throw new Error(data.error || 'Gagal memproses carian langsung.');
      }
    } catch (err: any) {
      onLog(`Ralat Watson Live Search: ${err.message || 'Gagal memproses carian.'}`, 'error');
    } finally {
      setLoading(false);
      setProgressStage('');
    }
  };

  // Convert extracted entities and relations into RedHorizon Graph Nodes & Links
  const handleInjectIntoGraph = () => {
    if (!result || (result.entities.length === 0 && result.relations.length === 0)) {
      onLog('Tiada entiti atau hubungan baharu untuk dipindahkan ke dalam graf.', 'warning');
      return;
    }

    const newNodes: Node[] = [];
    const newLinks: any[] = [];
    const existingNodeLabels = new Map(graphData.nodes.map(n => [n.label.toLowerCase().trim(), n.id]));

    // Helper to get or create node ID
    const entityIdMap = new Map<string, string>();

    result.entities.forEach((entity, idx) => {
      const cleanLabel = entity.name.trim();
      const existingId = existingNodeLabels.get(cleanLabel.toLowerCase());
      
      let nodeId = existingId;
      if (!nodeId) {
        nodeId = `watson_${entity.type}_${Date.now()}_${idx}`;
        entityIdMap.set(cleanLabel.toLowerCase(), nodeId);

        let nodeType = entity.type;
        let nodeBrand = entity.type;

        if (entity.type === 'company' || entity.type === 'organization') {
          nodeType = 'organization';
          nodeBrand = 'organization';
        }

        let nodeDetails = `[WATSON KOGNITIF INTEL]
- Kategori: ${entity.type.toUpperCase()}
- Peranan: ${entity.role || 'Sasaran Siasatan'}
- Tahap Keyakinan: ${entity.confidence}%
- Penilaian Risiko: ${entity.sentiment?.toUpperCase() || 'NEUTRAL'}`;

        if (entity.contextExcerpt) {
          nodeDetails += `\n- Bukti / Konteks: "${entity.contextExcerpt}"`;
        }

        if (entity.attributes && Object.keys(entity.attributes).length > 0) {
          nodeDetails += `\n\n[ATRIBUT ENTITI]`;
          Object.entries(entity.attributes).forEach(([k, v]) => {
            nodeDetails += `\n- ${k}: ${v}`;
          });
        }

        newNodes.push({
          id: nodeId,
          label: cleanLabel,
          type: nodeType,
          brand: nodeBrand,
          details: nodeDetails,
          confidenceScore: entity.confidence,
          riskScore: entity.sentiment === 'critical_threat' ? 95 : entity.sentiment === 'suspicious' ? 75 : 20,
          tags: [
            'Watson Recon',
            entity.type.toUpperCase(),
            ...(entity.aliases || [])
          ]
        });
      } else {
        entityIdMap.set(cleanLabel.toLowerCase(), existingId);
      }
    });

    // Build relations / links
    result.relations.forEach((rel) => {
      const srcLabel = rel.source.trim().toLowerCase();
      const tgtLabel = rel.target.trim().toLowerCase();

      const sourceId = entityIdMap.get(srcLabel) || existingNodeLabels.get(srcLabel);
      const targetId = entityIdMap.get(tgtLabel) || existingNodeLabels.get(tgtLabel);

      if (sourceId && targetId && sourceId !== targetId) {
        newLinks.push({
          source: sourceId,
          target: targetId,
          label: rel.predicate.replace(/_/g, ' ').toLowerCase(),
          confidenceScore: rel.confidence,
          notes: rel.evidenceSnippet || `Watson ${rel.relationshipType} connection (${rel.confidence}%)`
        });
      }
    });

    if (newNodes.length > 0 || newLinks.length > 0) {
      onUpdateGraph({
        nodes: newNodes,
        links: newLinks
      });
      onLog(`⚡ Berjaya memindahkan ${newNodes.length} nod baharu dan ${newLinks.length} hubungan semantik ke atas kanvas siasatan!`, 'success');
    } else {
      onLog('Semua entiti dan hubungan sudah wujud dalam kanvas.', 'info');
    }
  };

  const handleCopyTriples = () => {
    if (!result) return;
    const triples = result.relations.map(r => `<${r.source}> <http://redhorizon.osint/predicate/${r.predicate}> <${r.target}> .`).join('\n');
    navigator.clipboard.writeText(triples);
    setCopiedTriples(true);
    setTimeout(() => setCopiedTriples(false), 2000);
    onLog('RDF Semantic Triples berjaya disalin ke papan keratan.', 'info');
  };

  const handleExportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watson_recon_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onLog('Fail data Watson Recon berjaya dimuat turun.', 'success');
  };

  const handleExportMaltegoCsv = () => {
    if (!result) return;
    let csv = `Type,Name,Role,Sentiment,Confidence,Attributes\n`;
    result.entities.forEach(e => {
      const attrs = e.attributes ? Object.entries(e.attributes).map(([k, v]) => `${k}=${v}`).join('; ') : '';
      csv += `"${e.type}","${e.name.replace(/"/g, '""')}","${(e.role || '').replace(/"/g, '""')}","${e.sentiment || 'neutral'}",${e.confidence},"${attrs.replace(/"/g, '""')}"\n`;
    });

    csv += `\nSource,Predicate,Target,Confidence,Evidence\n`;
    result.relations.forEach(r => {
      csv += `"${r.source.replace(/"/g, '""')}","${r.predicate}","${r.target.replace(/"/g, '""')}",${r.confidence},"${(r.evidenceSnippet || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maltego_watson_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onLog('Fail Maltego CSV berjaya dieksport.', 'success');
  };

  // Filtered entities
  const filteredEntities = (result?.entities || []).filter(e => {
    if (entityFilter !== 'ALL' && e.type !== entityFilter) return false;
    if (entitySearch.trim()) {
      const query = entitySearch.toLowerCase();
      const matchName = e.name.toLowerCase().includes(query);
      const matchRole = e.role?.toLowerCase().includes(query);
      return matchName || matchRole;
    }
    return true;
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'person': return <User size={14} className="text-cyan-400" />;
      case 'company':
      case 'organization': return <Building size={14} className="text-amber-400" />;
      case 'location': return <MapPin size={14} className="text-emerald-400" />;
      case 'phone': return <Phone size={14} className="text-blue-400" />;
      case 'email': return <Mail size={14} className="text-purple-400" />;
      case 'domain': return <Globe size={14} className="text-teal-400" />;
      case 'crypto': return <Coins size={14} className="text-yellow-400" />;
      case 'vehicle': return <Car size={14} className="text-rose-400" />;
      case 'event': return <Calendar size={14} className="text-indigo-400" />;
      case 'fictional_character': return <Sparkles size={14} className="text-pink-400" />;
      case 'fictional_object': return <Gem size={14} className="text-fuchsia-400" />;
      case 'found_footage': return <Film size={14} className="text-rose-400" />;
      case 'cryptid_myth': return <Ghost size={14} className="text-cyan-400" />;
      case 'weapon_hardware': return <Crosshair size={14} className="text-red-400" />;
      case 'malware_payload': return <Bug size={14} className="text-lime-400" />;
      case 'biometric_evidence': return <Fingerprint size={14} className="text-teal-400" />;
      case 'surveillance_device': return <Camera size={14} className="text-sky-400" />;
      case 'broadcast_frequency': return <Radio size={14} className="text-amber-400" />;
      case 'classified_dossier': return <FileText size={14} className="text-red-500" />;
      case 'financial_instrument': return <Landmark size={14} className="text-emerald-400" />;
      default: return <FileCode size={14} className="text-slate-400" />;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'critical_threat':
        return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-950 text-rose-300 border border-rose-500/60 flex items-center gap-1">🚨 ANCAMAN KRITIKAL</span>;
      case 'suspicious':
        return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-950 text-amber-300 border border-amber-500/60 flex items-center gap-1">⚠️ MERAGUKAN</span>;
      case 'negative':
        return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-950 text-red-300 border border-red-500/40">NEGATIF</span>;
      case 'positive':
        return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/40">BERSIH / POSITIF</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-300 border border-slate-700">NEUTRAL</span>;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#070b13] text-slate-200 font-mono select-none overflow-hidden">
      {/* Header Banner */}
      <div className="px-5 py-3 border-b border-cyan-500/20 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/30 to-purple-500/20 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Brain size={20} className="text-cyan-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                IBM Watson Cognitive Recon & Reasoning
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 tracking-widest">
                ONTOLOGY NLU & GRAPH REASONING
              </span>
              <span className="px-1.5 py-0.2 rounded text-[7.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                100% FREE (GEMINI 3.7 FLASH)
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Analisa kognitif nod kanvas secara kontekstual, pemetaan hubungan tersembunyi, dan pengekstrakan entiti pintar tanpa kos API.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-cyan-500/30">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'canvas'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)] font-black'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
            }`}
          >
            <Network size={13} />
            <span>Analisis Nod Kanvas ({selectedNodeIds.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)] font-black'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
            }`}
          >
            <FileText size={13} />
            <span>Teks / Dokumen Luaran</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)] font-black'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
            }`}
          >
            <Globe size={13} />
            <span>Carian Berita Web</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Side: Input Configuration & Prompt */}
        <div className="w-full lg:w-[440px] xl:w-[480px] border-r border-cyan-500/10 bg-slate-950/80 p-4 flex flex-col gap-3.5 overflow-y-auto custom-scrollbar shrink-0">
          {activeTab === 'canvas' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Network size={14} /> Pilih Nod Sasaran ({selectedNodeIds.length} / {graphData.nodes.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={selectAllNodes}
                    className="text-[9.5px] px-2 py-0.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded cursor-pointer transition-colors"
                  >
                    Pilih Semua
                  </button>
                  <button
                    onClick={clearSelectedNodes}
                    className="text-[9.5px] px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 rounded cursor-pointer transition-colors"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pilih nod-nod yang ingin disiasat. Watson akan membaca atribut nod terpilih berlatarbelakangkan <b>seluruh {graphData.nodes.length} nod & {graphData.links.length} pautan</b> di atas kanvas untuk membongkar korelasi tersembunyi, hipotesis kognitif, dan titik pertemuan.
              </p>

              {/* Node Selection List */}
              <div className="border border-cyan-500/20 bg-black/60 rounded-xl p-2 max-h-[190px] overflow-y-auto custom-scrollbar space-y-1.5">
                {graphData.nodes.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    Tiada nod di atas kanvas. Sila tambah nod terlebih dahulu atau gunakan mod Teks/Carian.
                  </div>
                ) : (
                  graphData.nodes.map(n => {
                    const isSelected = selectedNodeIds.includes(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => toggleNodeSelection(n.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/80 border border-cyan-400/80 text-white font-bold'
                            : 'bg-slate-900/50 hover:bg-slate-800/80 border border-transparent text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                            isSelected ? 'bg-cyan-400 text-slate-950 font-black' : 'border border-slate-700 text-transparent'
                          }`}>
                            ✓
                          </div>
                          <div className="truncate">
                            <span className="text-white">{n.label}</span>
                            <span className="ml-1.5 text-[9.5px] uppercase text-cyan-400/80 font-mono">[{n.type}]</span>
                          </div>
                        </div>
                        {n.riskScore && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-300 border border-rose-500/30">
                            Risiko {n.riskScore}%
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Custom Investigator Instruction */}
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1"><Lightbulb size={12} className="text-yellow-400" /> Fokus / Arahan Khas Siasatan (Pilihan):</span>
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Cth: Cari perkaitan pemilikan bersilang antara sasaran, jejak transaksi kripto tidak langsung, atau kesan corak sindiket proksi..."
                  className="w-full h-16 p-2 bg-black/70 border border-cyan-500/30 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono resize-none leading-relaxed custom-scrollbar"
                />
              </div>

              <button
                onClick={handleAnalyzeCanvas}
                disabled={loading || selectedNodeIds.length === 0}
                className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer mt-auto ${
                  loading || selectedNodeIds.length === 0
                    ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin text-slate-950" />
                    <span>Menganalisis Kognitif Kanvas...</span>
                  </>
                ) : (
                  <>
                    <Brain size={15} />
                    <span>Analisis Konteks Kanvas Watson ({selectedNodeIds.length} Nod) ⚡</span>
                  </>
                )}
              </button>
            </>
          ) : activeTab === 'text' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} /> Dokumen / Teks Siasatan
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">Contoh:</span>
                  <button
                    onClick={() => setInputText(SAMPLE_TEXT_1)}
                    className="text-[9.5px] px-2 py-0.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded cursor-pointer transition-colors"
                  >
                    Skim Emas
                  </button>
                  <button
                    onClick={() => setInputText(SAMPLE_TEXT_2)}
                    className="text-[9.5px] px-2 py-0.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 rounded cursor-pointer transition-colors"
                  >
                    Wang Haram
                  </button>
                </div>
              </div>

              <div className="relative flex-1 flex flex-col min-h-[220px]">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Tampal artikel berita, laporan risikan, transkrip temubual, rekod SSM/pendaftaran, transaksi bank, atau teks kebocoran data di sini..."
                  className="w-full h-full min-h-[220px] p-3 bg-black/70 border border-cyan-500/30 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono resize-none leading-relaxed custom-scrollbar"
                />
                {inputText && (
                  <button
                    onClick={() => setInputText('')}
                    className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-400 bg-black/60 rounded"
                    title="Kosongkan Teks"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
                <span>Jumlah Aksara: {inputText.length}</span>
                <span className="text-cyan-400">Watson NLU Ontologi Ready</span>
              </div>

              <button
                onClick={handleExtractText}
                disabled={loading || !inputText.trim()}
                className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  loading || !inputText.trim()
                    ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin text-slate-950" />
                    <span>Menganalisis Kognitif...</span>
                  </>
                ) : (
                  <>
                    <Brain size={15} />
                    <span>Laksana Watson Entity Extraction ⚡</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={14} /> Carian Sasaran Langsung (Web Recon)
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Masukkan nama suspek, syarikat, nama operasi, atau entiti. Sistem akan mengumpulkan maklumat terkini melalui <b>Google Search Grounding</b> dan memproses struktur entiti ala IBM Watson.
              </p>

              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-cyan-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchExtract()}
                    placeholder="Cth: Skim Pelaburan Forex XYZ Malaysia, Datuk Seri X..."
                    className="w-full py-2.5 pl-9 pr-8 bg-black/70 border border-cyan-500/40 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Quick Query Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[9.5px] text-slate-500 self-center">Cadangan Carian:</span>
                  {[
                    'Sindiket Macau Scam Malaysia',
                    'Aura Gold Global scam',
                    'Syarikat cengkerang BVI pelaburan'
                  ].map((pill, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchQuery(pill)}
                      className="text-[9.5px] px-2 py-0.5 bg-slate-900 hover:bg-cyan-950 border border-cyan-500/30 text-cyan-300 rounded cursor-pointer transition-colors"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSearchExtract}
                disabled={loading || !searchQuery.trim()}
                className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer mt-auto ${
                  loading || !searchQuery.trim()
                    ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin text-slate-950" />
                    <span>Mencari & Mengekstrak...</span>
                  </>
                ) : (
                  <>
                    <Search size={15} />
                    <span>Cari & Bina Graf Watson 🌐</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Telemetry Progress Bar while loading */}
          {loading && (
            <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Sparkles size={14} className="animate-spin text-cyan-400" />
                <span>{progressStage || 'Memproses Maklumat Kognitif...'}</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full w-3/4 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[10.5px] text-slate-400 space-y-1.5 leading-relaxed mt-auto">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Database size={13} />
              <span>Ciri Kognitif IBM Watson:</span>
            </div>
            <ul className="space-y-1 list-disc list-inside text-slate-400">
              <li><b className="text-slate-200">Korelasi Multi-Nod:</b> Hubung kait nod terpilih secara mendalam terhadap seluruh kanvas.</li>
              <li><b className="text-slate-200">Hipotesis Kognitif:</b> Kesan sindiket, proksi, dan pemindahan aset berselindung.</li>
              <li><b className="text-slate-200">Pindahan Terus 1-Klik:</b> Tambah nod & pautan baharu terus ke graf.</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Visual Results, Graph Entities & Threat Matrix */}
        <div className="flex-1 flex flex-col bg-[#050811] overflow-hidden min-h-0">
          {result ? (
            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-4 space-y-4">
              {/* Executive Summary & Threat Matrix Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 border border-cyan-500/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                      Penilaian Kognitif Watson & Siasatan
                    </span>
                    {getSentimentBadge(result.overallSentiment.toLowerCase())}
                  </div>

                  {/* Threat Score Pill */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">SKOR ANCAMAN / RISIKO:</span>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 rounded-full border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                      <ShieldAlert size={14} className="text-rose-400" />
                      <span className="text-xs font-black text-rose-300">
                        {result.threatScore} / 10
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {result.executiveSummary}
                </p>

                {/* Risk Flags & Categories */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {result.riskFlags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 flex items-center gap-1"
                    >
                      <AlertTriangle size={10} className="text-rose-400 shrink-0" />
                      <span>{flag}</span>
                    </span>
                  ))}
                  {result.keyCategories.map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40"
                    >
                      #{cat}
                    </span>
                  ))}
                  {result.criticalVectors && result.criticalVectors.map((v, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40"
                    >
                      ⚡ {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Cognitive Hypotheses & Hidden Correlations Panel (If Available) */}
              {((result.hypothesisAndInsights && result.hypothesisAndInsights.length > 0) || (result.hiddenCorrelations && result.hiddenCorrelations.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Hypotheses */}
                  {result.hypothesisAndInsights && result.hypothesisAndInsights.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider">
                        <Lightbulb size={14} />
                        <span>Hipotesis Risikan Kognitif</span>
                      </div>
                      <div className="space-y-1.5">
                        {result.hypothesisAndInsights.map((hypo, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-slate-200 leading-relaxed font-sans flex items-start gap-2">
                            <span className="text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                            <span>{hypo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hidden Correlations & Suggested Actions */}
                  <div className="space-y-3">
                    {result.hiddenCorrelations && result.hiddenCorrelations.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-cyan-400 uppercase tracking-wider">
                          <Network size={14} />
                          <span>Korelasi Tersembunyi dalam Graf</span>
                        </div>
                        <div className="space-y-1.5">
                          {result.hiddenCorrelations.map((corr, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-200 leading-relaxed font-sans flex items-start gap-2">
                              <span className="text-cyan-400 font-bold shrink-0">🔗</span>
                              <span>{corr}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.suggestedActionItems && result.suggestedActionItems.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                          <Crosshair size={13} />
                          <span>Tindakan Siasatan Dicadangkan</span>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-300 font-sans list-disc list-inside">
                          {result.suggestedActionItems.map((act, idx) => (
                            <li key={idx} className="leading-snug">{act}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/90 rounded-xl border border-cyan-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    Entiti: <b className="text-cyan-400">{result.totalEntities}</b> | Hubungan: <b className="text-amber-400">{result.totalRelations}</b>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Copy Triples */}
                  <button
                    onClick={handleCopyTriples}
                    className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedTriples ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedTriples ? 'Disalin!' : 'Salin RDF Triples'}</span>
                  </button>

                  {/* Export Maltego CSV */}
                  <button
                    onClick={handleExportMaltegoCsv}
                    className="px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Maltego CSV</span>
                  </button>

                  {/* Export JSON */}
                  <button
                    onClick={handleExportJson}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    <span>JSON</span>
                  </button>

                  {/* DIRECT INJECT TO GRAPH CANVAS */}
                  <button
                    onClick={handleInjectIntoGraph}
                    className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <Zap size={14} className="fill-slate-950" />
                    <span>⚡ Pindahkan Terus ke Graf Kanvas</span>
                  </button>
                </div>
              </div>

              {/* Entities & Relations Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* Extracted Entities List (7 cols) */}
                <div className="xl:col-span-7 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={14} /> Senarai Entiti Dikesan ({filteredEntities.length})
                    </span>

                    {/* Filter Category */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                        className="bg-black/80 border border-cyan-500/30 rounded-lg px-2 py-1 text-[10px] text-cyan-300 font-mono focus:outline-none"
                      >
                        <option value="ALL">Semua Kategori</option>
                        <option value="person">Orang / Suspek</option>
                        <option value="company">Syarikat / SSM</option>
                        <option value="location">Lokasi / Alamat</option>
                        <option value="phone">No Telefon</option>
                        <option value="email">Emel</option>
                        <option value="domain">Domain / Web</option>
                        <option value="crypto">Aset Kripto</option>
                        <option value="vehicle">Kenderaan</option>
                        <option value="document">Dokumen / Akaun</option>
                      </select>

                      <input
                        type="text"
                        value={entitySearch}
                        onChange={(e) => setEntitySearch(e.target.value)}
                        placeholder="Tapis entiti..."
                        className="bg-black/80 border border-cyan-500/30 rounded-lg px-2 py-1 text-[10px] text-white placeholder-slate-600 w-28 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {filteredEntities.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">
                        Tiada entiti berasingan perlu ditambah.
                      </div>
                    ) : (
                      filteredEntities.map((entity, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedEntity(entity)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                            selectedEntity?.name === entity.name
                              ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                              : 'bg-slate-950/60 hover:bg-slate-900/80 border-slate-800/80 hover:border-cyan-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-1.5 rounded-lg bg-black/60 border border-slate-800 shrink-0">
                                {getEntityIcon(entity.type)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-white truncate">
                                  {entity.name}
                                </h4>
                                {entity.role && (
                                  <p className="text-[10px] text-cyan-300 font-bold truncate">
                                    {entity.role}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {getSentimentBadge(entity.sentiment)}
                              <span className="text-[9.5px] font-mono text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-500/30">
                                {entity.confidence}%
                              </span>
                            </div>
                          </div>

                          {/* Attributes preview */}
                          {entity.attributes && Object.keys(entity.attributes).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1 text-[9px] text-slate-400">
                              {Object.entries(entity.attributes).map(([k, v], aIdx) => (
                                <span key={aIdx} className="bg-black/40 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                                  <b className="text-slate-300">{k}:</b> {v}
                                </span>
                              ))}
                            </div>
                          )}

                          {entity.contextExcerpt && (
                            <p className="mt-1.5 text-[9.5px] text-slate-400 italic font-sans truncate">
                              "{entity.contextExcerpt}"
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Semantic Relations & Triples (5 cols) */}
                <div className="xl:col-span-5 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 size={14} /> Hubungan Semantik ({result.relations.length})
                  </span>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                    {result.relations.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">
                        Tiada hubungan baharu dikesan.
                      </div>
                    ) : (
                      result.relations.map((rel, rIdx) => (
                        <div
                          key={rIdx}
                          className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs font-mono"
                        >
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <span className="font-bold text-cyan-300 truncate max-w-[120px]">
                              {rel.source}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[8.5px] font-black bg-amber-950/80 text-amber-300 border border-amber-500/40 uppercase">
                              {rel.predicate.replace(/_/g, ' ')}
                            </span>
                            <span className="font-bold text-cyan-300 truncate max-w-[120px]">
                              {rel.target}
                            </span>
                          </div>

                          {rel.evidenceSnippet && (
                            <p className="text-[9.5px] text-slate-400 font-sans italic line-clamp-2">
                              "{rel.evidenceSnippet}"
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[8.5px] text-slate-500 pt-1 border-t border-slate-800/40">
                            <span className="uppercase text-amber-400/80 font-bold">{rel.relationshipType}</span>
                            <span>Keyakinan: {rel.confidence}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <Brain size={32} className="text-cyan-400" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Enjin Kognitif Watson Bersedia
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pilih nod sasaran di sebelah kiri untuk menganalisa konteks penuh kanvas graf, atau gunakan mod Teks/Carian Web. Watson Engine akan menjana hipotesis risikan dan membongkar korelasi tersembunyi secara automatik.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
