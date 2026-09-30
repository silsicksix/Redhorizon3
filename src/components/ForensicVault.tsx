import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, Upload, X, MapPin, MessageSquare, ShieldAlert, Fingerprint, Clock, 
  ScanEye, ArrowRight, Check, Plus, AlertTriangle, Loader2, Cpu, Minimize2, 
  Maximize2, Sparkles, Brain, RefreshCw, Eye, Database, Info, Trash2, Zap,
  History, Bookmark, Share2, Copy, FileText, Search, ExternalLink, HardDrive,
  CheckCircle2, FolderArchive, Image as ImageIcon
} from 'lucide-react';
import { performMultiModalForensics } from '../services/geminiService';
import { GraphData, Node, Link } from '../types';

interface ForensicVaultProps {
  onClose: () => void;
  onExplode: (data: GraphData) => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
}

type Objective = 'SENTIMENT' | 'GEOLOCATION' | 'EVIDENCE' | 'STYLISTIC' | 'TIMELINE' | 'SMART_STRATEGY';

export interface ForensicImageArtifact {
  name: string;
  type: string;
  dataUrl: string;
}

export interface ForensicVaultRecord {
  id: string;
  timestamp: number;
  title: string;
  neuralDepth: 'STANDARD' | 'DEEP' | 'QUANTUM';
  selectedObjectives: Objective[];
  context: string;
  images: ForensicImageArtifact[];
  results: {
    summary: string;
    findings: { type: string; description: string; confidence: string }[];
    entities: { label: string; type: string; details: string }[];
  };
}

const STORAGE_KEY = 'redhorizon_forensic_vault_archive';

const loadHistoryFromStorage = (): ForensicVaultRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Forensic Vault: Gagal memuat arkib sejarah:", e);
    return [];
  }
};

const saveHistoryToStorage = (records: ForensicVaultRecord[]) => {
  try {
    // Keep max 25 recent jobs to prevent localStorage overflow
    const trimmed = records.slice(0, 25);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e: any) {
    console.warn("Forensic Vault: Quota storage warning, trimming older items:", e);
    try {
      const lighter = records.slice(0, 10).map(r => ({
        ...r,
        // Keep slightly smaller images if storage is tight
        images: r.images.slice(0, 4)
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lighter));
    } catch {
      // Ignore if still fails
    }
  }
};

const ForensicVault: React.FC<ForensicVaultProps> = ({ onClose, onExplode, onLog }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Objective, 3: Results
  const [files, setFiles] = useState<File[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<Objective[]>(['EVIDENCE', 'SMART_STRATEGY']); 
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [neuralDepth, setNeuralDepth] = useState<'STANDARD' | 'DEEP' | 'QUANTUM'>('DEEP');
  
  // Current Active Record Data
  const [currentRecord, setCurrentRecord] = useState<ForensicVaultRecord | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<Set<number>>(new Set());
  const [activeImagePreview, setActiveImagePreview] = useState<string | null>(null);
  
  // History State
  const [history, setHistory] = useState<ForensicVaultRecord[]>(() => loadHistoryFromStorage());
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveHistoryToStorage(history);
  }, [history]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = (Array.from(e.target.files) as File[]).filter(f => f.type.startsWith('image/'));
      if (valid.length !== e.target.files.length) {
        onLog("Forensic Lab: Non-image files filtered.", 'warning');
      }
      setFiles(prev => [...prev, ...valid]);
    }
  };

  const toggleObjective = (obj: Objective) => {
    setSelectedObjectives(prev => 
      prev.includes(obj) ? prev.filter(o => o !== obj) : [...prev, obj]
    );
  };

  const toggleEntitySelection = (index: number) => {
    const next = new Set(selectedEntities);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedEntities(next);
  };

  const selectAllEntities = () => {
    if (!currentRecord) return;
    if (selectedEntities.size === currentRecord.results.entities.length) {
      setSelectedEntities(new Set()); 
    } else {
      setSelectedEntities(new Set((currentRecord.results.entities || []).map((_, i) => i)));
    }
  };

  const executeAnalysis = async () => {
    if (selectedObjectives.length === 0 || files.length === 0) return;
    setLoading(true);
    onLog(`Forensic Lab: Memulakan Multi-Vector Vision (${neuralDepth} MODE)...`, 'info');

    try {
      const promises = files.map(file => {
        return new Promise<ForensicImageArtifact>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const res = e.target?.result as string;
            resolve({ name: file.name, type: file.type, dataUrl: res });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const loadedImages = await Promise.all(promises);
      const geminiPayload = loadedImages.map(img => ({
        mimeType: img.type,
        data: img.dataUrl.split(',')[1] || ''
      }));

      const enhancedContext = `
        [MISSION PARAMETERS]
        ANALYSIS_DEPTH: ${neuralDepth}
        OBJECTIVES: ${selectedObjectives.join(', ')}
        TACTICAL_CONTEXT: ${context || 'None provided'}
        
        [AI CORE DIRECTIVE]
        Perform exhaustive multi-vector OSINT forensic vision analysis. 
        Extract text, objects, vehicles, faces, identifiers, license plates, badges, uniform insignias, and metadata clues. 
        Search for temporal cues (clocks, calendars, sunlight shadows) and geospatial markers (flora, signs, architectural styles, weather).
        Cross-reference artifacts between all provided images to find logical connection vectors and synthesize a cohesive tactical dossier.
      `;
      
      const data = await performMultiModalForensics(geminiPayload, selectedObjectives, enhancedContext);
      
      const newRecordId = `fv_${Date.now()}`;
      const firstFileName = files[0]?.name || 'Bukti_Imej';
      const cleanTitle = files.length === 1 
        ? `Analisis Forensik: ${firstFileName}` 
        : `Analisis Forensik: ${firstFileName} (+${files.length - 1} Imej)`;

      const newRecord: ForensicVaultRecord = {
        id: newRecordId,
        timestamp: Date.now(),
        title: cleanTitle,
        neuralDepth,
        selectedObjectives: [...selectedObjectives],
        context,
        images: loadedImages,
        results: data
      };

      setCurrentRecord(newRecord);
      setSelectedEntities(new Set((data?.entities || []).map((_, i) => i)));
      
      // Auto-save to persistent history
      setHistory(prev => [newRecord, ...prev.filter(h => h.id !== newRecord.id)]);
      
      setStep(3);
      onLog("Forensic Lab: Analisis Multi-Vector selesai. Hasil disimpan ke Arkib Sejarah Forensik.", 'success');
      if (isMinimized) setIsMinimized(false);

    } catch (e: any) {
      onLog(`Forensic Lab Error: ${e.message}`, 'error');
      setLoading(false);
      if (isMinimized) setIsMinimized(false);
    } finally {
      setLoading(false);
    }
  };

  // Restore past record from archive
  const handleLoadPastRecord = (record: ForensicVaultRecord) => {
    setCurrentRecord(record);
    setSelectedEntities(new Set((record.results.entities || []).map((_, i) => i)));
    setNeuralDepth(record.neuralDepth);
    setSelectedObjectives(record.selectedObjectives);
    setContext(record.context);
    setStep(3);
    setShowHistoryModal(false);
    onLog(`Forensic Vault: Rekod arkib "${record.title}" berjaya dimuatkan semula.`, 'info');
  };

  const handleDeleteHistoryRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Adakah anda pasti mahu memadam rekod analisis forensik ini dari arkib tempatan?")) {
      setHistory(prev => prev.filter(r => r.id !== id));
      if (currentRecord?.id === id) {
        setCurrentRecord(null);
        setStep(1);
      }
      onLog("Forensic Vault: Rekod arkib telah dipadam.", 'info');
    }
  };

  const handleCopyReport = (record: ForensicVaultRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const formatted = `# ${record.title}
Tarikh: ${new Date(record.timestamp).toLocaleString('ms-MY')}
Kedalaman: ${record.neuralDepth} | Objektif: ${record.selectedObjectives.join(', ')}

---
## RUMUSAN STRATEGIK
${record.results.summary}

---
## VEKTOR PENEMUAN FORENSIK
${record.results.findings.map(f => `• [${f.type}] (${f.confidence} Conf): ${f.description}`).join('\n')}

---
## ENTITI TERHUBUNG (${record.results.entities.length})
${record.results.entities.map(e => `• ${e.label} (${e.type}): ${e.details}`).join('\n')}
`;
    navigator.clipboard.writeText(formatted);
    setCopiedReportId(record.id);
    setTimeout(() => setCopiedReportId(null), 2000);
    onLog("Forensic Vault: Laporan penuh disalin ke papan keratan (clipboard).", 'success');
  };

  // Deploy Master Forensic Evidence Node with ALL analyzed images and rich dossier
  const handleDeployMasterForensicNode = (record: ForensicVaultRecord, includeEntities: boolean = true) => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    
    const masterNodeId = `forensic_master_${record.id}`;
    const primaryImgUrl = record.images[0]?.dataUrl || '';
    const allImageUrls = record.images.map(img => img.dataUrl);

    const fullDossierMarkdown = `# LAPORAN PENUH FORENSIC VAULT (MULTI-VECTOR COGNITIVE LAB)

**ID Kes Analisis:** \`${record.id}\`  
**Tarikh/Masa:** ${new Date(record.timestamp).toLocaleString('ms-MY')}  
**Kedalaman Neural:** ${record.neuralDepth} Mode  
**Objektif:** ${record.selectedObjectives.join(', ')}  
**Jumlah Imej Dianalisis:** ${record.images.length} Bahan Bukti Visual  

---

## 📌 RUMUSAN STRATEGIK RISIKAN
${record.results.summary}

---

## ⚡ VEKTOR PENEMUAN & INDIKATOR (FORENSIC HITS)
${record.results.findings.map((f, i) => `### ${i+1}. [${f.type}] - Kredibiliti: ${f.confidence}\n${f.description}`).join('\n\n')}

---

## 🧬 ENTITI DIKENALPASTI (${record.results.entities.length})
${record.results.entities.map(e => `* **${e.label}** (${e.type}): ${e.details}`).join('\n')}
`;

    const notesAndIntelligenceDetails = `[INTELLIGENCE & CATATAN FORENSIK VAULT]
Tarikh: ${new Date(record.timestamp).toLocaleString('ms-MY')}
Kedalaman: ${record.neuralDepth} | Objektif: ${record.selectedObjectives.join(', ')}
Bahan Bukti: ${record.images.length} fail imej dilampirkan.
Konteks: ${record.context || 'Tiada'}

[VEKTOR PENEMUAN UTAMA]
${record.results.findings.map(f => `• [${f.type}] (${f.confidence} Conf): ${f.description}`).join('\n')}

[RUMUSAN STRATEGIK]
${record.results.summary}`;

    // Master Forensic Node
    const masterNode: Node = {
      id: masterNodeId,
      label: `🔍 [FORENSIK] ${record.title}`,
      type: 'evidence',
      imageUrl: primaryImgUrl,
      imageUrls: allImageUrls,
      details: notesAndIntelligenceDetails,
      reports: fullDossierMarkdown,
      confidenceScore: 98,
      confidenceLevel: 'HIGH',
      verificationStatus: 'VERIFIED',
      isGroundVerified: true,
      tags: ['FORENSIK', 'VAULT', 'MULTI_IMAGE', 'DOSSIER_READY'],
      sources: [{
        sourceName: 'Forensic Vault Vision Lab',
        timestamp: new Date(record.timestamp).toISOString(),
        details: `${record.images.length} imej diimbas (${record.neuralDepth} mode)`
      }]
    };

    nodes.push(masterNode);

    // Linked Entities
    if (includeEntities) {
      record.results.entities.forEach((ent, i) => {
        if (!selectedEntities.has(i)) return;

        const entityNodeId = `ent_vault_${record.id}_${i}`;
        let type = 'unknown';
        const t = ent.type.toLowerCase();
        
        if (t.includes('person') || t.includes('suspect') || t.includes('individu')) type = 'person';
        else if (t.includes('location') || t.includes('place') || t.includes('lokasi') || t.includes('geo')) type = 'location';
        else if (t.includes('car') || t.includes('vehicle') || t.includes('kenderaan') || t.includes('motor')) type = 'vehicle';
        else if (t.includes('phone') || t.includes('number') || t.includes('telefon')) type = 'phone';
        else if (t.includes('id') || t.includes('card') || t.includes('kad') || t.includes('lesen')) type = 'personal_id';
        else if (t.includes('org') || t.includes('company') || t.includes('syarikat') || t.includes('group')) type = 'organization';
        else type = 'evidence';
        
        nodes.push({
          id: entityNodeId,
          label: ent.label,
          type: type as any,
          details: `[INTELLIGENCE DIEKSTRAK DARI FORENSIK VAULT]\nSumber: ${record.title}\nJenis: ${ent.type}\nPenemuan: ${ent.details}`,
          reports: `### Entiti Diekstrak dari Analisis Forensik\n**Label:** ${ent.label}\n**Kategori:** ${ent.type}\n**Perincian Penemuan:** ${ent.details}\n**Master Kes:** ${record.title}`,
          confidenceScore: 92,
          confidenceLevel: 'HIGH',
          verificationStatus: 'VERIFIED',
          vaultMatch: true,
          vaultSource: 'Forensic Vault Lab',
          tags: ['ENTITI_FORENSIK', 'VAULT_EXTRACT']
        });

        links.push({ 
          source: masterNodeId, 
          target: entityNodeId, 
          label: 'bukti_visual',
          isVault: true 
        });
      });
    }

    onExplode({ nodes, links });
    onClose();
    onLog(`Forensic Vault: Berjaya membina Master Nod Forensik dengan ${allImageUrls.length} imej & ${nodes.length - 1} entiti terhubung ke kanvas!`, 'success');
  };

  const objectives: { id: Objective; label: string; icon: any; desc: string }[] = [
    { id: 'SMART_STRATEGY', label: 'Neural Strategy', icon: <Sparkles className="text-yellow-500"/>, desc: 'Korelasi automatik artifak untuk ramalan pergerakan & logik sasaran.' },
    { id: 'EVIDENCE', label: 'E-Evidence Scan', icon: <ShieldAlert className="text-red-500"/>, desc: 'Kesan bukti digital, dokumen sulit, senjata, atau penanda taktikal.' },
    { id: 'GEOLOCATION', label: 'Shadow Mapping', icon: <MapPin className="text-emerald-500"/>, desc: 'Triangulasi lokasi geografi melalui flora, cuaca, papan tanda, dan bayang matahari.' },
    { id: 'SENTIMENT', label: 'Psycho-Analysis', icon: <MessageSquare className="text-cyan-500"/>, desc: 'Analisis ekspresi mikro wajah dan nada emosi berkonteks.' },
    { id: 'STYLISTIC', label: 'Visual Idiolect', icon: <Fingerprint className="text-purple-500"/>, desc: 'Jejak pengarang/pelaku melalui tulisan tangan atau corak artifak digital.' },
    { id: 'TIMELINE', label: 'Chronos-Sync', icon: <Clock className="text-blue-500"/>, desc: 'Bina semula kronologi kejadian melalui variasi pencahayaan dan petunjuk visual.' },
  ];

  const filteredHistory = history.filter(item => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return item.title.toLowerCase().includes(q) || 
           item.results.summary.toLowerCase().includes(q) ||
           item.results.entities.some(e => e.label.toLowerCase().includes(q));
  });

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-24 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-[#050505] border-2 border-[#ff0033] shadow-[0_0_30px_rgba(255,0,51,0.6)] p-3 flex items-center gap-4 w-80 rounded-sm">
          <div className="relative">
            {loading ? <Loader2 className="text-[#ff0033] animate-spin" size={24} /> : <Eye className="text-green-500" size={24} />}
            {loading && <div className="absolute inset-0 bg-[#ff0033] blur-[10px] opacity-30"></div>}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-[11px] font-black text-white uppercase tracking-widest leading-tight truncate">
              {loading ? 'NEURAL VISION UPLINK ACTIVE' : 'FORENSIC VAULT LAB READY'}
            </div>
            <div className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black">
              {history.length} Rekod Arkib Disimpan
            </div>
          </div>
          <button onClick={() => setIsMinimized(false)} className="hover:bg-[#ff0033] hover:text-black p-1 text-[#ff0033] border border-[#ff0033]/20 transition-all">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 sm:p-4">
      <div className="w-full max-w-7xl bg-[#050505] border-2 border-[#ff0033] shadow-[0_0_100px_rgba(255,0,51,0.3)] font-mono flex flex-col h-[94vh] animate-in zoom-in-95 duration-300 relative overflow-hidden">
        
        {/* Background grid effect */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(255,0,51,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,51,0.1)_1px,transparent_1px)] bg-[size:30px_30px]"></div>

        {/* Top Navbar */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[#ff0033]/50 bg-[#ff0033]/10 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
             <div className="bg-[#ff0033] text-black p-2 rounded-sm shadow-[0_0_20px_#ff0033]"><Layers size={24} /></div>
             <div>
               <h2 className="text-xl sm:text-2xl font-black text-white tracking-widest uppercase italic leading-none">Forensic Vision Vault</h2>
               <p className="text-[9px] sm:text-[10px] text-[#ff0033] font-black tracking-[0.3em] mt-1.5">MULTI-MODAL COGNITIVE ANALYZER & PERMANENT ARCHIVE</p>
             </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
              {/* History Button with Badge */}
              <button 
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-2 bg-black/80 hover:bg-white/10 text-amber-400 border border-amber-500/40 hover:border-amber-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded transition-all shadow-sm"
                title="Buka Arkib Sejarah Analisis Forensik"
              >
                <History size={14} className="text-amber-400" />
                <span className="hidden sm:inline">Arkib Sejarah</span>
                <span className="bg-amber-500 text-black px-1.5 py-0.2 rounded-full text-[9px] font-black">{history.length}</span>
              </button>

              <div className="hidden md:flex items-center gap-2 bg-black/50 px-3 py-1.5 border border-white/5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-gray-400">GEMINI_3.7_FLASH_READY</span>
              </div>
              <button onClick={() => setIsMinimized(true)} className="p-2 text-[#ff0033] hover:bg-[#ff0033] hover:text-black transition-all border border-[#ff0033]/30 rounded">
                <Minimize2 size={18} />
              </button>
              <button onClick={onClose} className="p-2 hover:text-white text-[#ff0033] bg-white/5 rounded-sm ml-1 border border-white/10">
                <X size={18} />
              </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden relative z-10">
            
            {loading && (
                <div className="absolute inset-0 z-50 bg-[#050505]/98 flex flex-col items-center justify-center animate-in fade-in duration-700">
                    <div className="relative mb-10">
                        <div className="absolute inset-0 bg-[#ff0033] blur-[80px] opacity-40 rounded-full animate-pulse"></div>
                        <div className="relative z-10 p-8 border-2 border-[#ff0033] rounded-full">
                            <Brain size={100} className="text-[#ff0033] animate-pulse" />
                        </div>
                        <div className="absolute -top-4 -right-8 bg-white text-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_white]">
                          {neuralDepth} COGNITIVE SCAN
                        </div>
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-black text-white tracking-[0.3em] uppercase animate-pulse italic">Memproses Artifak Visual</h3>
                    <div className="mt-8 flex gap-4">
                        <div className="w-3.5 h-3.5 bg-[#ff0033] rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_15px_#ff0033]"></div>
                        <div className="w-3.5 h-3.5 bg-[#ff0033] rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_15px_#ff0033]"></div>
                        <div className="w-3.5 h-3.5 bg-[#ff0033] rounded-full animate-bounce shadow-[0_0_15px_#ff0033]"></div>
                    </div>
                    <div className="mt-12 text-center space-y-2 max-w-xl px-4">
                        <p className="text-white font-black text-xs uppercase tracking-[0.2em] opacity-80">Menjalankan Multi-Vector OSINT Extraction</p>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Mengekstrak korelasi visual • Triangulasi geospatial • Sintesis dossier risikan</p>
                    </div>
                    <button onClick={() => setIsMinimized(true)} className="mt-12 border border-[#ff0033] text-[#ff0033] hover:bg-[#ff0033] hover:text-black px-8 py-2.5 text-xs font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(255,0,51,0.2)]">
                      Kecilkan Tetingkap (Minimize)
                    </button>
                </div>
            )}

            {/* STEP 1: Upload Images */}
            {step === 1 && (
                <div className="w-full flex flex-col items-center justify-center p-6 sm:p-12 animate-in fade-in duration-700 bg-black/20 overflow-y-auto">
                    <div 
                        onClick={() => inputRef.current?.click()}
                        className="w-full max-w-3xl h-80 sm:h-96 border-4 border-dashed border-[#ff0033]/20 hover:border-[#ff0033] hover:bg-[#ff0033]/5 flex flex-col items-center justify-center cursor-pointer transition-all mb-8 group rounded-lg shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-[#ff0033]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Upload size={64} className="text-[#ff0033]/40 group-hover:text-[#ff0033] mb-4 transition-all group-hover:scale-110" />
                        <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-[0.2em] italic group-hover:text-[#ff0033] transition-colors text-center px-4">
                          Muat Naik Bahan Bukti Imej
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-gray-500 mt-3 font-black uppercase tracking-[0.2em] text-center px-4">
                          Frame CCTV • Foto Sasaran/Suspek • Dokumen Rahsia • Log Taktikal (Batch Imej Disokong)
                        </p>
                        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
                    </div>
                    
                    {files.length > 0 ? (
                        <div className="w-full max-w-3xl animate-in slide-in-from-bottom-10 duration-500">
                            <div className="flex justify-between items-center text-[11px] font-black text-gray-400 mb-3 border-b border-white/10 pb-2">
                                <span className="uppercase tracking-[0.2em] flex items-center gap-2 text-emerald-400">
                                  <Database size={14}/> {files.length} BAHAN BUKTI TERSEDIA UNTUK DIANALISIS
                                </span>
                                <button onClick={() => setFiles([])} className="text-[#ff0033] hover:text-white transition-colors flex items-center gap-1">
                                  <Trash2 size={12}/> KOSONGKAN QUEUE
                                </button>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                                {files.map((f, i) => (
                                    <div key={i} className="min-w-[130px] h-28 bg-black border border-white/10 flex items-center justify-center text-[10px] text-gray-400 relative overflow-hidden group shadow-xl hover:border-[#ff0033]/50 transition-all rounded">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-80 z-10"></div>
                                        <span className="z-20 truncate px-2 font-black uppercase text-[9px]">{f.name}</span>
                                        <div className="absolute top-1.5 right-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={14} className="text-white bg-red-600 rounded-sm cursor-pointer" onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, idx) => idx !== i)); }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={() => setStep(2)}
                                className="w-full mt-6 bg-[#ff0033] text-black font-black py-4 uppercase italic tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_30px_rgba(255,0,51,0.4)] flex items-center justify-center gap-3 text-sm"
                            >
                                TETAPKAN PARAMETER & OBJEKTIF <ArrowRight size={20} />
                            </button>
                        </div>
                    ) : history.length > 0 && (
                        <div className="w-full max-w-3xl mt-2 border-t border-white/10 pt-4 flex items-center justify-between">
                            <span className="text-[11px] text-gray-500 font-mono">Terdapat {history.length} rekod analisis forensik terdahulu dalam arkib.</span>
                            <button 
                              onClick={() => setShowHistoryModal(true)}
                              className="text-[11px] text-amber-400 hover:text-white underline font-bold flex items-center gap-1.5"
                            >
                              <History size={13} /> Semak Arkib Sejarah Forensik
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: Objective & Parameter Selection */}
            {step === 2 && (
                <div className="w-full p-6 sm:p-10 flex flex-col animate-in slide-in-from-right-20 duration-700 overflow-y-auto custom-scrollbar bg-black/30">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b border-white/10 pb-4 gap-4">
                        <div>
                            <h3 className="text-white text-2xl sm:text-3xl font-black uppercase italic flex items-center gap-3">
                                <ScanEye className="text-[#ff0033]" size={30}/> Parameter Kognitif Forensik
                            </h3>
                            <p className="text-gray-500 text-[10px] font-black tracking-[0.2em] mt-1">PILIH VEKTOR PENYIASATAN BUKTI VISUAL</p>
                        </div>
                        <div className="flex bg-black border border-white/10 p-1 rounded gap-1.5">
                             {['STANDARD', 'DEEP', 'QUANTUM'].map(d => (
                                <button 
                                  key={d} 
                                  onClick={() => setNeuralDepth(d as any)} 
                                  className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] rounded transition-all ${neuralDepth === d ? 'bg-[#ff0033] text-black shadow-[0_0_15px_#ff0033]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    {d}
                                </button>
                             ))}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {objectives.map((obj) => (
                            <button
                                key={obj.id}
                                onClick={() => toggleObjective(obj.id)}
                                className={`
                                    p-5 border-2 text-left transition-all relative overflow-hidden group rounded
                                    ${selectedObjectives.includes(obj.id)
                                        ? 'border-[#ff0033] bg-[#ff0033]/10 text-white shadow-[0_0_20px_rgba(255,0,51,0.2)]' 
                                        : 'border-white/5 bg-black/40 text-gray-500 hover:border-[#ff0033]/40'}
                                `}
                            >
                                <div className={`mb-3 transition-transform group-hover:scale-110 ${selectedObjectives.includes(obj.id) ? 'text-[#ff0033]' : 'text-gray-600'}`}>
                                    {React.cloneElement(obj.icon as React.ReactElement<any>, { size: 28 })}
                                </div>
                                <div className="font-black text-[11px] uppercase mb-1.5 tracking-[0.15em]">{obj.label}</div>
                                <div className="text-[9px] leading-relaxed opacity-70 font-bold uppercase">{obj.desc}</div>
                                {selectedObjectives.includes(obj.id) && (
                                    <div className="absolute top-3 right-3 text-[#ff0033] animate-in zoom-in"><Check size={18} strokeWidth={4} /></div>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="mb-8">
                        <label className="text-[10px] text-gray-400 uppercase font-black mb-2 block tracking-[0.2em] flex items-center gap-2">
                          <Info size={13}/> Konteks Taktikal / Petunjuk Awal (Pilihan)
                        </label>
                        <textarea 
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="Masukkan maklumat sasaran, lokasi disyaki, nama individu, atau korelasi awal untuk memfokuskan analisis AI..."
                            className="w-full bg-black/60 border border-white/10 text-white text-xs p-4 h-28 outline-none focus:border-[#ff0033] transition-all font-mono shadow-inner placeholder-gray-700 font-bold rounded"
                        />
                    </div>

                    <div className="flex gap-4 mt-auto">
                        <button onClick={() => setStep(1)} className="px-8 border border-white/20 text-gray-400 hover:text-white hover:border-[#ff0033] uppercase text-xs font-black tracking-wider transition-all rounded">
                          Kembali
                        </button>
                        <button 
                            onClick={executeAnalysis}
                            disabled={selectedObjectives.length === 0 || loading}
                            className="flex-1 bg-[#ff0033] text-black font-black py-4 uppercase italic tracking-[0.3em] hover:bg-white flex items-center justify-center gap-3 transition-all disabled:opacity-30 shadow-[0_0_40px_rgba(255,0,51,0.3)] text-sm rounded"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Brain size={20} />}
                            {loading ? 'MEMPROSES SYNAPSES...' : 'LANCARKAN ANALISIS FORENSIK NEURAL'}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Results, Intelligence Brief & Canvas Deployment */}
            {step === 3 && currentRecord && (
                <div className="w-full flex flex-col md:flex-row animate-in fade-in duration-700 h-full overflow-hidden bg-black/10">
                    
                    {/* Left Column: Vector Hits & Analyzed Images Gallery */}
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-[#ff0033]/20 bg-[#0a0a0a]/90 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col shadow-2xl">
                        
                        {/* Gallery of analyzed images */}
                        <div className="mb-6">
                            <h4 className="text-white font-black text-xs uppercase mb-3 tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-2"><ImageIcon size={14} className="text-[#ff0033]"/> Bahan Bukti Visual ({currentRecord.images.length})</span>
                                <span className="text-[9px] text-gray-500 font-mono">{new Date(currentRecord.timestamp).toLocaleTimeString()}</span>
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                {currentRecord.images.map((img, i) => (
                                    <div 
                                      key={i} 
                                      onClick={() => setActiveImagePreview(img.dataUrl)}
                                      className="h-20 bg-black border border-white/10 hover:border-[#ff0033] cursor-pointer rounded overflow-hidden relative group transition-all"
                                    >
                                        <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Eye size={16} className="text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <h4 className="text-[#ff0033] font-black text-xs uppercase mb-4 border-b border-[#ff0033]/30 pb-2 italic tracking-[0.2em] flex items-center justify-between">
                            <span className="flex items-center gap-2"><Zap size={15}/> Vektor Penemuan ({currentRecord.results.findings.length})</span>
                            <span className="text-[9px] bg-[#ff0033]/20 text-[#ff0033] px-2 py-0.5 rounded">{currentRecord.neuralDepth}</span>
                        </h4>
                        
                        <div className="space-y-3 flex-1">
                            {(currentRecord.results.findings || []).map((find, i) => (
                                <div key={i} className="bg-black border border-white/5 p-3 hover:border-[#ff0033]/40 transition-all group shadow relative overflow-hidden rounded">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-[#ff0033] opacity-40"></div>
                                    <div className="flex justify-between items-center mb-1.5 pl-1.5">
                                        <span className="text-[9px] bg-white/5 text-gray-300 px-2 py-0.5 rounded uppercase font-black tracking-wider border border-white/10">{find.type}</span>
                                        <div className={`text-[9px] font-black px-1.5 py-0.5 rounded ${find.confidence.toLowerCase().includes('high') ? 'bg-green-600 text-black' : 'bg-amber-500 text-black'}`}>{find.confidence} CONF</div>
                                    </div>
                                    <p className="text-[11px] text-gray-300 leading-relaxed font-mono pl-1.5 group-hover:text-white transition-colors">
                                      "{find.description}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Strategic Intelligence Brief, Entities & Deploy Actions */}
                    <div className="w-full md:w-2/3 p-6 sm:p-8 bg-black/40 overflow-y-auto custom-scrollbar flex flex-col relative">
                        <div className="absolute top-5 right-10 p-4 opacity-5 pointer-events-none"><Sparkles size={200} /></div>
                        
                        {/* Dossier Brief Section */}
                        <div className="mb-8 relative z-10">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                <div>
                                    <h3 className="text-white font-black text-xl sm:text-2xl uppercase italic tracking-tight decoration-[#ff0033] underline decoration-2">
                                      Strategic Intelligence Dossier
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-mono mt-1">{currentRecord.title}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => handleCopyReport(currentRecord)}
                                      className="text-[10px] bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1.5 rounded font-mono flex items-center gap-1.5 transition-all"
                                    >
                                      {copiedReportId === currentRecord.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                      {copiedReportId === currentRecord.id ? 'Tersalin!' : 'Salin Laporan'}
                                    </button>
                                    <div className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 px-2.5 py-1 font-black uppercase tracking-wider rounded">
                                      Tersimpan Dalam Arkib
                                    </div>
                                </div>
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none text-gray-200 whitespace-pre-wrap leading-relaxed border-l-4 border-[#ff0033] pl-4 sm:pl-6 bg-black/60 p-5 sm:p-6 shadow-2xl font-mono text-xs border border-white/5 tracking-wide rounded">
                                {currentRecord.results.summary}
                            </div>
                        </div>

                        {/* Entities Grid Section */}
                        <div className="mt-4 pt-6 border-t border-white/10 flex-1 relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-white font-black text-sm uppercase flex items-center gap-2 tracking-wider">
                                    <Brain size={18} className="text-[#ff0033]" />
                                    Entiti Dikenalpasti ({(currentRecord.results.entities || []).length})
                                </h4>
                                <button 
                                  onClick={selectAllEntities} 
                                  className="text-[10px] font-black text-[#ff0033] hover:text-white underline uppercase tracking-wider bg-black px-3 py-1.5 border border-[#ff0033]/20 transition-all rounded"
                                >
                                    {selectedEntities.size === (currentRecord.results.entities || []).length ? 'BATALKAN PILIHAN' : 'PILIH SEMUA ENTITI'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                                {(currentRecord.results.entities || []).map((ent, i) => (
                                    <div 
                                        key={i}
                                        onClick={() => toggleEntitySelection(i)}
                                        className={`
                                            cursor-pointer p-4 border transition-all relative group rounded
                                            ${selectedEntities.has(i) 
                                                ? 'bg-[#ff0033]/15 border-[#ff0033] shadow-[0_0_20px_rgba(255,0,51,0.2)]' 
                                                : 'bg-black/80 border-white/5 hover:border-white/20 hover:bg-black'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wider border ${selectedEntities.has(i) ? 'bg-[#ff0033] text-black border-[#ff0033]' : 'bg-white/5 text-gray-500 border-white/10'}`}>
                                                {ent.type}
                                            </span>
                                            {selectedEntities.has(i) && <Check size={18} className="text-[#ff0033] animate-in zoom-in" strokeWidth={3} />}
                                        </div>
                                        <div className="text-sm font-black text-white truncate mb-1 uppercase tracking-tight italic">{ent.label}</div>
                                        <div className="text-[9px] text-gray-400 line-clamp-2 leading-relaxed font-mono">{ent.details}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons: Deploy Master Node */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-white/10 pt-6 mt-auto">
                                <button 
                                  onClick={() => { setStep(1); setFiles([]); setCurrentRecord(null); }} 
                                  className="text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                     <RefreshCw size={14} /> ANALISIS KES BARU
                                </button>
                                
                                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                    <button 
                                        onClick={() => handleDeployMasterForensicNode(currentRecord, false)}
                                        className="flex-1 sm:flex-none border border-emerald-500/60 bg-emerald-950/40 hover:bg-emerald-600 hover:text-black text-emerald-300 px-4 py-3 font-bold uppercase text-[11px] tracking-wider transition-all rounded flex items-center justify-center gap-2"
                                        title="Jana 1 Master Nod khas sahaja dengan semua gambar dan dossier"
                                    >
                                        <HardDrive size={16} /> Jana Master Nod Sahaja
                                    </button>

                                    <button 
                                        onClick={() => handleDeployMasterForensicNode(currentRecord, true)}
                                        className="flex-1 sm:flex-none bg-[#ff0033] text-black px-6 py-3 font-black uppercase italic text-xs hover:bg-white transition-all shadow-[0_0_30px_rgba(255,0,51,0.5)] flex items-center justify-center gap-2.5 rounded"
                                        title="Jana Master Nod beserta semua entiti visual terhubung ke kanvas"
                                    >
                                        <Plus size={18} /> Jana Master Nod + {selectedEntities.size} Entiti ke Graf
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}

        </div>

        {/* IMAGE ENLARGED LIGHTBOX MODAL */}
        {activeImagePreview && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setActiveImagePreview(null)}>
            <div className="max-w-4xl max-h-[85vh] bg-[#111] border border-[#ff0033]/50 p-2 rounded relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveImagePreview(null)} className="absolute top-3 right-3 text-white bg-black/80 p-1.5 rounded-full hover:bg-[#ff0033] transition-all">
                <X size={18} />
              </button>
              <img src={activeImagePreview} alt="Enlarged forensic artifact" className="max-w-full max-h-[80vh] object-contain rounded" />
            </div>
          </div>
        )}

        {/* HISTORY ARCHIVE MODAL / DRAWER */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-4xl bg-[#080808] border-2 border-amber-500/70 shadow-[0_0_60px_rgba(245,158,11,0.2)] rounded font-mono flex flex-col max-h-[88vh] overflow-hidden">
              
              {/* Archive Header */}
              <div className="p-4 bg-amber-500/10 border-b border-amber-500/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 text-black rounded"><FolderArchive size={20} /></div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">Arkib Sejarah Analisis Forensik</h3>
                    <p className="text-[10px] text-amber-400 font-bold">Semua rumusan dan artifak imej disimpan secara tempatan</p>
                  </div>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-white p-1 rounded bg-white/5">
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-white/10 bg-black/40 flex items-center gap-3">
                <Search size={16} className="text-gray-500" />
                <input 
                  type="text" 
                  value={historySearch} 
                  onChange={(e) => setHistorySearch(e.target.value)} 
                  placeholder="Cari dalam arkib (tajuk fail, entiti, atau rumusan risikan)..." 
                  className="bg-transparent border-none text-white text-xs w-full outline-none font-mono placeholder-gray-600"
                />
                {historySearch && (
                  <button onClick={() => setHistorySearch('')} className="text-gray-500 hover:text-white text-xs">Kosongkan</button>
                )}
              </div>

              {/* Archive List */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <History size={40} className="mx-auto mb-3 opacity-30 text-amber-500" />
                    <p className="text-sm uppercase font-bold">Tiada rekod arkib forensik dijumpai.</p>
                    <p className="text-xs text-gray-600 mt-1">Lakukan analisis gambar baru untuk menyimpannya ke dalam arkib.</p>
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-black/70 border border-white/10 hover:border-amber-500/50 p-4 rounded transition-all group relative overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-white font-black text-sm uppercase group-hover:text-amber-400 transition-colors">
                              {item.title}
                            </h4>
                            <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-black">
                              {item.neuralDepth}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(item.timestamp).toLocaleString('ms-MY')} • {item.images.length} Imej Dianalisis • {item.results.findings.length} Vektor Penemuan • {item.results.entities.length} Entiti
                          </p>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => handleCopyReport(item, e)}
                            className="p-1.5 text-gray-400 hover:text-white bg-white/5 rounded border border-white/10 text-[10px] flex items-center gap-1"
                            title="Salin Laporan Penuh"
                          >
                            {copiedReportId === item.id ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                          </button>
                          <button 
                            onClick={() => handleDeployMasterForensicNode(item, true)}
                            className="px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-600 hover:text-black text-emerald-400 border border-emerald-700/50 text-[10px] font-bold uppercase rounded flex items-center gap-1.5 transition-all"
                            title="Jana terus Master Nod beserta entiti ke kanvas"
                          >
                            <HardDrive size={13} /> Jana ke Graf
                          </button>
                          <button 
                            onClick={() => handleLoadPastRecord(item)}
                            className="px-3 py-1.5 bg-amber-500 text-black hover:bg-white text-[10px] font-black uppercase rounded flex items-center gap-1.5 transition-all shadow"
                          >
                            <Eye size={13} /> Buka Semula
                          </button>
                          <button 
                            onClick={(e) => handleDeleteHistoryRecord(item.id, e)}
                            className="p-1.5 text-red-500 hover:text-white hover:bg-red-600/30 rounded border border-red-500/20"
                            title="Padam dari Arkib"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Image Thumbnails Strip */}
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 custom-scrollbar">
                        {item.images.map((img, idx) => (
                          <img 
                            key={idx} 
                            src={img.dataUrl} 
                            alt={img.name} 
                            className="w-16 h-12 object-cover border border-white/10 rounded cursor-pointer hover:border-amber-400 transition-all flex-shrink-0"
                            onClick={() => setActiveImagePreview(img.dataUrl)}
                          />
                        ))}
                      </div>

                      {/* Brief Snippet */}
                      <p className="text-[10px] text-gray-400 line-clamp-2 font-mono bg-white/5 p-2 rounded leading-relaxed">
                        {item.results.summary}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Archive Footer */}
              <div className="p-3 bg-black border-t border-white/10 flex justify-between items-center text-[10px] text-gray-500">
                <span>Jumlah Rekod Disimpan: {history.length}</span>
                {history.length > 0 && (
                  <button 
                    onClick={() => {
                      if (window.confirm("Adakah anda pasti mahu memadam SEMUA rekod arkib forensik?")) {
                        setHistory([]);
                        localStorage.removeItem(STORAGE_KEY);
                        onLog("Forensic Vault: Semua rekod arkib telah dikosongkan.", 'info');
                      }
                    }}
                    className="text-red-400 hover:text-white text-[9px] uppercase font-bold"
                  >
                    Kosongkan Semua Arkib
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForensicVault;
