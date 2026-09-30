
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    Zap, Cpu, RefreshCw, X, Copy, Check,
    Search, Send, HardDrive, Edit2, Trash2, 
    User, UserCheck, ShieldCheck, Target, Camera, ScanEye, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, Globe, LayoutGrid, Network, Save, Upload, FileText, Brain, Database, Link as LinkIcon, Plus, Sparkles, PanelRightClose, PanelRightOpen, Eye, EyeOff, CheckCircle2, Image as ImageIcon, Loader2,
    MessageSquare, Clock
} from 'lucide-react';
import { NodeQueryState, Node } from '../types';
import { performVisualRecon, searchTargetVisualMatches, VisualImageMatch } from '../services/geminiService';
import { searchTavily, searchTavilyImages } from '../services/searchService';
import { useGlobalStore } from '../store/GlobalStore';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NodeBrandIcon, resolveNodeBrandOrType } from '../utils/nodeIconResolver';
import { getProxiedImageUrl, extractImageUrl } from '../utils/imageUtils';
import { extractNodeCommentsAndIntel, openExternalUrl, getPlatformBrandColor } from '../utils/socialCommentUtils';

interface NodeQueryProps {
  node: Node | null;
  isMinimized: boolean;
  queryState: NodeQueryState | undefined;
  onExternalUplink: () => void;
  onSendQuery: (query: string) => void;
  onToggleMinimize: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onVaultSearch?: () => void;
  onUpdateNode: (node: Partial<Node> & { id: string }) => void; // NEW: Callback to save changes to store
  onParseData?: (text: string, sourceNodeId: string) => void;
}

const NodeQuery: React.FC<NodeQueryProps> = ({ 
  node, queryState, onSendQuery, onToggleMinimize, onEdit, onDelete, onVaultSearch, onUpdateNode, onParseData 
}) => {
  const { state, dispatch, activeWs } = useGlobalStore();
  const [localInput, setLocalInput] = useState('');
  const [isScanningVisual, setIsScanningVisual] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [isImportingToGraph, setIsImportingToGraph] = useState(false);
  const [isPastingJson, setIsPastingJson] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  
  // Neural Command Mode (expanded, compact icon rail, collapsed hidden)
  const [neuralMode, setNeuralMode] = useState<'expanded' | 'compact' | 'collapsed'>(() => {
    const saved = localStorage.getItem('redhorizon_neural_cmd_mode');
    if (saved === 'expanded' || saved === 'compact' || saved === 'collapsed') return saved;
    return 'compact'; // Default to compact icon rail to give Dossier maximum space!
  });

  const handleSetNeuralMode = (mode: 'expanded' | 'compact' | 'collapsed') => {
    setNeuralMode(mode);
    localStorage.setItem('redhorizon_neural_cmd_mode', mode);
  };

  const [showMiniQueryPopup, setShowMiniQueryPopup] = useState(false);
  const [isVisualCollapsed, setIsVisualCollapsed] = useState(false);
  
  // Editable Dossier State
  const [dossierText, setDossierText] = useState('');
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [reportsText, setReportsText] = useState('');
  const [activeTab, setActiveTab] = useState<'dossier' | 'reports' | 'network'>('dossier');
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [visualCandidates, setVisualCandidates] = useState<VisualImageMatch[]>([]);
  const [showVisualSelectorModal, setShowVisualSelectorModal] = useState(false);
  const [visualSearchQuery, setVisualSearchQuery] = useState('');
  const [visualSuccessMsg, setVisualSuccessMsg] = useState<string | null>(null);
  const [visualDiagnostics, setVisualDiagnostics] = useState<any>(null);
  const [visualEngineFilter, setVisualEngineFilter] = useState<string>('ALL');
  
  // Visual Search Context Options
  const [targetMode, setTargetMode] = useState<'AUTO' | 'PORTRAIT' | 'EVIDENCE' | 'LOCATION' | 'ORGANIZATION' | 'SOCIAL' | 'CRIME_NEWS'>('AUTO');
  const [strictFilter, setStrictFilter] = useState<boolean>(true);

  // Compute connected entities for target context grounding
  const connectedEntities = React.useMemo(() => {
    const activeWs = state.workspaces?.find((w: any) => w.id === state.activeWsId);
    const graphData = activeWs?.data;
    if (!node || !graphData) return [];
    const connectedIds = new Set<string>();
    (graphData.links || []).forEach((link: any) => {
      const src = typeof link.source === 'object' ? link.source.id : link.source;
      const tgt = typeof link.target === 'object' ? link.target.id : link.target;
      if (src === node.id) connectedIds.add(tgt);
      if (tgt === node.id) connectedIds.add(src);
    });
    return (graphData.nodes || [])
      .filter((n: any) => connectedIds.has(n.id) && n.label && n.id !== node.id)
      .map((n: any) => n.label.trim())
      .filter(Boolean);
  }, [node?.id, state.workspaces, state.activeWsId]);

  // Initialize visual search query whenever active node changes (Manual trigger only)
  useEffect(() => {
    if (node?.label) {
      setVisualSearchQuery(node.label);
      setVisualError(null);
      setVisualSuccessMsg(null);
    }
  }, [node?.id, node?.label]);
  
  const handleDeleteImage = (imgUrl: string) => {
      if (!node) return;
      
      // Filter out the image from imageUrls array
      const currentImages = (node.imageUrls && node.imageUrls.length > 0) 
        ? node.imageUrls.filter(Boolean) 
        : (node.imageUrl ? [node.imageUrl] : []);
      
      const newImages = currentImages.filter(img => img !== imgUrl && img !== getProxiedImageUrl(imgUrl));
      
      // If the image was the main imageUrl or we have remaining images, update accordingly
      const newMainUrl = newImages.length > 0 ? newImages[0] : '';

      // Clean reference if present in dossier or reports
      let cleanDossier = dossierText;
      let cleanReports = reportsText;
      if (cleanDossier.includes(imgUrl)) {
          cleanDossier = cleanDossier.split(imgUrl).join('');
      }
      if (cleanReports.includes(imgUrl)) {
          cleanReports = cleanReports.split(imgUrl).join('');
      }

      setDossierText(cleanDossier);
      setReportsText(cleanReports);

      onUpdateNode({ 
          id: node.id, 
          imageUrls: newImages, 
          imageUrl: newMainUrl,
          details: cleanDossier,
          reports: cleanReports
      });

      if (enlargedImage === imgUrl) {
          setEnlargedImage(null);
      }
  };

  const handleClearAllImages = () => {
      if (!node) return;
      onUpdateNode({
          id: node.id,
          imageUrls: [],
          imageUrl: ''
      });
      setEnlargedImage(null);
  };

  const handleAddCustomImageUrl = () => {
      if (!customImageUrl.trim() || !node) return;
      const url = customImageUrl.trim();
      const current = node.imageUrls ? [...node.imageUrls] : (node.imageUrl ? [node.imageUrl] : []);
      const newImages = Array.from(new Set([url, ...current]));
      onUpdateNode({
          id: node.id,
          imageUrls: newImages,
          imageUrl: url
      });
      setCustomImageUrl('');
      setShowUrlModal(false);
  };

  const [searchResults, setSearchResults] = useState<{title: string, link: string, snippet: string, source: string}[] | null>(null);

  const handleCopyArenaPrompt = () => {
      if (!node) return;

      const networkDesc = neighbors.map(n => 
          `- Berhubung dengan ${n.node?.label} (${n.node?.type}) melalui pautan "${n.link.label}" [Arah: ${n.direction}]`
      ).join('\n');

      const fullPrompt = `PERINTAH ANALISIS OSINT MENDALAM (REDHORIZON EXTERNAL UPLINK)
-------------------------------------------------------
SILA BERTINDAK SEBAGAI PEGAWAI PERISIKAN DIGITAL & PAKAR FORENSIK OSINT TERTINGGI.
TUGAS ANDA: JALANKAN SIASATAN MENDALAM (DEEP OSINT) TERHADAP ENTITI BERIKUT SECARA MENYELURUH.

-- DATA SASARAN (TARGET ENTITY) --
IDENTITI / NAMA: ${node.label}
JENIS ENTITI: ${node.type}
ALIAS / NAMA LAIN: ${node.aliases ? node.aliases.join(', ') : 'Tiada rekod'}

-- DOSSIER & MAKLUMAT TERPERINCI --
${dossierText || "Tiada data dossier direkodkan."}

-- LAPORAN & LOG TAMBAHAN --
${reportsText || "Tiada laporan tambahan."}

-- HUBUNGAN RANGKAIAN (NETWORK CONTEXT) --
${networkDesc || "Tiada hubungan rangkaian dikesan dalam graf semasa."}

-- ARAHAN ANALISIS & PENCARIAN MENDALAM (DEEP SEARCH) --
1. PENCARIAN GAMBAR & PROFIL MEDIA SOSIAL (HIGH PRIORITY):
   - Jejak dan senaraikan semua akaun media sosial (Facebook, Instagram, LinkedIn, X/Twitter, TikTok, Telegram, Discord, GitHub, Threads, Pinterest).
   - Ekstrak pautan URL gambar profil (Profile Pictures / Avatars / Album gambar awam) sasaran untuk analisis visual biometrik.
2. ANALISIS FOOTPRINT DIGITAL & KEBOCORAN DATA:
   - Siasat kebocoran data (data leaks, database breach dumps, pastebin, breached credentials).
   - Kenal pasti nombor telefon, emel alternatif, akaun perbankan, dan alamat IP berkait.
3. KORELASI LATAR BELAKANG & GEOLOKASI:
   - Analisa rekod perniagaan, syarikat berkait, jawatan profesional, dan latar belakang pendidikan.
   - Ekstrak kordinat geolokasi, alamat rumah/pejabat, dan lokasi lazim.
4. PROFIL PSIKOLOGI & CORAK TINGKAH LAKU:
   - Berikan penilaian psikologi, corak tingkah laku (behavioral patterns), serta potensi risiko/kerentanan.
5. CADANGAN 3 LANGKAH TEKNIKAL SETERUSNYA:
   - Gariskan tindakan OSINT proaktif seterusnya untuk merungkai rangkaian tersembunyi.

JAWAB SECARA TERPERINCI, MENDALAM DAN PROFESIONAL DALAM FORMAT LAPORAN PERISIKAN:`;

      navigator.clipboard.writeText(fullPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 3000);
  };

  // Sync internal state with Node Details whenever node changes
  useEffect(() => {
      if (node) {
          setDossierText(node.details || '');
          setReportsText(node.reports || '');
          setIsDirty(false);
      }
  }, [node?.id, node?.details, node?.reports]);

  const handleDossierChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDossierText(e.target.value);
      setIsDirty(true);
  };

  const handleReportsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReportsText(e.target.value);
      setIsDirty(true);
  };

  const saveDossier = () => {
      if (node) {
          onUpdateNode({ id: node.id, details: dossierText, reports: reportsText });
          setIsDirty(false);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && node) {
          const file = e.target.files[0];
          
          const reader = new FileReader();
          reader.onload = (ev) => {
              const base64 = ev.target?.result as string;
              
              // If it's a GIF, SVG, or small image (< 1MB), use it directly to preserve animation/quality
              if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.size < 1024 * 1024) {
                  const newImages = node.imageUrls ? [...node.imageUrls, base64] : [base64];
                  onUpdateNode({ id: node.id, imageUrls: newImages, imageUrl: base64 });
                  if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
                  return;
              }

              // For large images, compress using Canvas to prevent browser memory crash
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  const MAX_SIZE = 1024; // Max dimension

                  if (width > height) {
                      if (width > MAX_SIZE) {
                          height *= MAX_SIZE / width;
                          width = MAX_SIZE;
                      }
                  } else {
                      if (height > MAX_SIZE) {
                          width *= MAX_SIZE / height;
                          height = MAX_SIZE;
                      }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(img, 0, 0, width, height);
                  
                  const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                  const newImages = node.imageUrls ? [...node.imageUrls, compressedBase64] : [compressedBase64];
                  onUpdateNode({ id: node.id, imageUrls: newImages, imageUrl: compressedBase64 });
                  if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
              };
              img.src = base64;
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSmartQuery = (query?: string) => {
      const q = query || localInput;
      if (q.trim()) {
          onSendQuery(q);
          setLocalInput('');
          setSearchResults(null);
          setActiveTab('reports'); // Switch to reports tab to show progress/result
      }
  };

  const handleDeepSearch = async () => {
      if (!node) return;
      setIsSearching(true);
      setSearchResults(null);
      setVisualError(null);

      try {
          if (!state.config.tavilyApiKey) throw new Error("Tavily API Key not configured in Settings.");
          const query = localInput.trim() || node.label;
          const results = await searchTavily(query, state.config.tavilyApiKey);
          setSearchResults(results);
          setActiveTab('reports');
      } catch (e: any) {
          setVisualError(e.message);
      } finally {
          setIsSearching(false);
      }
  };

  const handleImportToGraph = async () => {
      if (!searchResults || !node || !onParseData) return;
      setIsImportingToGraph(true);

      const compiledIntelligence = `
      SOURCE: TAVILY_ADVANCED_SEARCH
      TARGET_ENTITY: ${node.label}
      
      SEARCH_RESULTS:
      ${searchResults.map((r, i) => `
      [RESULT ${i+1}]
      TITLE: ${r.title}
      URL: ${r.link}
      CONTENT: ${r.snippet}
      `).join('\n')}
      `;

      await onParseData(compiledIntelligence, node.id);
      
      // Auto-append to reports as well
      const newReports = reportsText + `\n\n=== WEB RECON LOG ===\n${searchResults.length} records found via Tavily.\nSee Graph for new nodes.`;
      setReportsText(newReports);
      onUpdateNode({ id: node.id, reports: newReports });
      
      setIsImportingToGraph(false);
  };

  const handleDeepVisualScan = async (customQuery?: string) => {
      if (!node) return;
      const targetQuery = (typeof customQuery === 'string' && customQuery.trim()) 
        ? customQuery.trim() 
        : (visualSearchQuery.trim() || node.label.trim());

      if (!targetQuery) return;

      if (!visualSearchQuery || visualSearchQuery.trim() !== targetQuery) {
          setVisualSearchQuery(targetQuery);
      }

      // Open modal IMMEDIATELY so user sees real-time scanning radar & findings without delay!
      setShowVisualSelectorModal(true);
      setIsScanningVisual(true);
      setVisualError(null);
      setVisualSuccessMsg(null);
      
      try {
          const activeCase = state.workspaces?.find((w: any) => w.id === state.activeWsId);
          const matchResult = await searchTargetVisualMatches(targetQuery, {
              tavilyApiKey: state.config.tavilyApiKey,
              nodeType: node.type,
              maxResults: 20,
              caseName: activeCase?.name || state.activeWsId,
              caseDescription: activeCase?.name,
              connectedEntities: connectedEntities,
              notes: node.details || dossierText,
              tags: node.tags || [],
              targetMode: targetMode,
              strictContextFilter: strictFilter
          });

          const candidates = matchResult.results || [];
          const candidateUrls = matchResult.imageUrls || candidates.map(c => c.url).filter(Boolean);
          setVisualDiagnostics(matchResult.diagnostics || null);
          setVisualEngineFilter('ALL');

          if (candidateUrls.length > 0) {
              const existingImages = (node.imageUrls && node.imageUrls.length > 0) 
                  ? node.imageUrls 
                  : (node.imageUrl ? [node.imageUrl] : []);
              
              const combinedImages = Array.from(new Set([...candidateUrls, ...existingImages])).slice(0, 12);
              const primaryImg = matchResult.primaryImage || combinedImages[0];

              // Update node in global graph
              onUpdateNode({
                  id: node.id,
                  imageUrl: primaryImg,
                  imageUrls: combinedImages
              });

              setVisualCandidates(candidates);
              const engineStats = matchResult.diagnostics?.engineBreakdown;
              const statsStr = engineStats ? Object.entries(engineStats).filter(([_, count]: any) => count > 0).map(([eng, count]) => `${eng}: ${count}`).join(', ') : '';
              setVisualSuccessMsg(`${candidateUrls.length} imej visual sasaran berjaya dijumpai! ${statsStr ? `(${statsStr})` : ''}`);
          } else {
              setVisualError(`Tiada padanan imej konteks automatik ditemui untuk "${targetQuery}". Anda boleh menukar kata kunci di atas atau menampal URL imej secara terus.`);
          }
      } catch (e: any) {
          setVisualError(e.message || "Carian visual sasaran gagal.");
      } finally {
          setIsScanningVisual(false);
      }
  };

  const launchExternalImageSearch = (engine: 'lens' | 'yandex' | 'bing' | 'tineye' | 'facecheck' | 'pimeyes' | 'google_text', customUrl?: string) => {
    const currentImg = customUrl || node?.imageUrl || displayImageUrls[0];
    const targetName = visualSearchQuery.trim() || node?.label?.trim() || '';

    if (engine === 'lens') {
      if (currentImg && currentImg.startsWith('http')) {
        window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(currentImg)}`, '_blank');
      } else {
        window.open(`https://images.google.com/`, '_blank');
      }
    } else if (engine === 'yandex') {
      if (currentImg && currentImg.startsWith('http')) {
        window.open(`https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(currentImg)}`, '_blank');
      } else {
        window.open(`https://yandex.com/images/search?text=${encodeURIComponent(targetName)}`, '_blank');
      }
    } else if (engine === 'bing') {
      if (currentImg && currentImg.startsWith('http')) {
        window.open(`https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=${encodeURIComponent(currentImg)}`, '_blank');
      } else {
        window.open(`https://www.bing.com/images/search?q=${encodeURIComponent(targetName)}`, '_blank');
      }
    } else if (engine === 'tineye') {
      if (currentImg && currentImg.startsWith('http')) {
        window.open(`https://tineye.com/search?url=${encodeURIComponent(currentImg)}`, '_blank');
      } else {
        window.open(`https://tineye.com/`, '_blank');
      }
    } else if (engine === 'facecheck') {
      window.open('https://facecheck.id', '_blank');
    } else if (engine === 'pimeyes') {
      window.open('https://pimeyes.com', '_blank');
    } else if (engine === 'google_text') {
      window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(targetName)}`, '_blank');
    }
  };

  const handleSelectCandidateAsPrimary = (imgUrl: string) => {
      if (!node) return;
      const existing = (node.imageUrls && node.imageUrls.length > 0) 
          ? node.imageUrls 
          : (node.imageUrl ? [node.imageUrl] : []);
      const updatedList = Array.from(new Set([imgUrl, ...existing])).slice(0, 10);
      
      onUpdateNode({
          id: node.id,
          imageUrl: imgUrl,
          imageUrls: updatedList
      });
      setVisualSuccessMsg("Foto profil sasaran berjaya dikemaskini!");
  };

  const handleAddCandidateToGallery = (imgUrl: string) => {
      if (!node) return;
      const existing = (node.imageUrls && node.imageUrls.length > 0) 
          ? node.imageUrls 
          : (node.imageUrl ? [node.imageUrl] : []);
      if (!existing.includes(imgUrl)) {
          const updatedList = [...existing, imgUrl].slice(0, 10);
          onUpdateNode({
              id: node.id,
              imageUrls: updatedList,
              imageUrl: node.imageUrl || imgUrl
          });
          setVisualSuccessMsg("Imej ditambah ke galeri sasaran!");
      }
  };

  const handleProcessJson = async () => {
      if (!jsonInput.trim() || !node || !onParseData) return;
      setIsImportingToGraph(true);
      
      try {
          // Attempt to parse JSON locally to extract specific fields like urlImage
          let parsedData: any = null;
          try {
              const cleanInput = jsonInput.replace(/```json\s*|\s*```/g, "").trim();
              parsedData = JSON.parse(cleanInput);
              
              if (parsedData.urlImage) {
                  const faceCheckId = `node_${Date.now()}_facecheck`;
                  const yandexId = `node_${Date.now()}_yandex`;
                  
                  const newNodes = [
                      {
                          id: faceCheckId,
                          label: 'FaceCheck.id',
                          type: '1',
                          url: `https://facecheck.id/#url=${parsedData.urlImage}`,
                          x: node.x ? node.x + 80 : undefined,
                          y: node.y ? node.y + 80 : undefined,
                      },
                      {
                          id: yandexId,
                          label: 'Yandex Image',
                          type: '2',
                          url: `https://yandex.com/images/search?rpt=imageview&url=${parsedData.urlImage}`,
                          x: node.x ? node.x - 80 : undefined,
                          y: node.y ? node.y + 80 : undefined,
                      }
                  ];
                  
                  const newLinks = [
                      { source: node.id, target: faceCheckId, label: 'reverse_search' },
                      { source: node.id, target: yandexId, label: 'reverse_search' }
                  ];
                  
                  dispatch({ type: 'UPDATE_GRAPH', payload: { nodes: newNodes, links: newLinks } });
              }

              // Integrate OSINT Data directly into Dossier
              if (parsedData.osint_data) {
                  let updatedDossier = dossierText + `\n\n### OSINT Import Data\n`;
                  if (parsedData.osint_data.author) updatedDossier += `- **Author:** ${parsedData.osint_data.author}\n`;
                  if (parsedData.osint_data.author_url) updatedDossier += `- **URL:** ${parsedData.osint_data.author_url}\n`;
                  if (parsedData.osint_data.target_photo_link) {
                      updatedDossier += `- **Original High-Res Photo:** [Klik Di Sini](${parsedData.osint_data.target_photo_link})\n`;
                  }
                  if (parsedData.osint_data.about_profile_data) {
                      updatedDossier += `\n**About/Intro:**\n${parsedData.osint_data.about_profile_data}\n`;
                  }
                  
                  // Extract Original Links into Dossier for clicking!
                  if (parsedData.osint_data.original_photo_links && parsedData.osint_data.original_photo_links.length > 0) {
                      updatedDossier += `\n**Original Photos:**\n`;
                      parsedData.osint_data.original_photo_links.forEach((link: string) => {
                          updatedDossier += `- [${link}](${link})\n`;
                      });
                  }

                  let allExtractedImages: string[] = [
                      ...(node.imageUrls || []),
                      ...(node.imageUrl ? [node.imageUrl] : [])
                  ];

                  if (parsedData.osint_data.author_avatar) allExtractedImages.push(parsedData.osint_data.author_avatar);
                  if (parsedData.osint_data.main_post_images) allExtractedImages.push(...parsedData.osint_data.main_post_images);
                  
                  if (parsedData.comments) {
                      parsedData.comments.forEach((c: any) => {
                          if (c.user && c.profile_url) updatedDossier += `- **Friend/Commenter:** [${c.user}](${c.profile_url})\n`;
                          if (c.avatar_url) allExtractedImages.push(c.avatar_url);
                          if (c.attached_images) allExtractedImages.push(...c.attached_images);
                          if (c.original_photo_links) {
                              c.original_photo_links.forEach((link: string) => {
                                  updatedDossier += `  - Image Link: [${link}](${link})\n`;
                              });
                          }
                      });
                  }
                  
                  const uniqueImages = [...new Set(allExtractedImages)].filter(img => typeof img === 'string' && img.startsWith('http'));
                  
                  setDossierText(updatedDossier);
                  onUpdateNode({ 
                      id: node.id, 
                      details: updatedDossier,
                      imageUrl: uniqueImages.length > 0 ? uniqueImages[0] : node.imageUrl,
                      imageUrls: uniqueImages
                  });
              }
          } catch (jsonErr) {
              console.warn("Could not parse JSON locally, proceeding with AI parsing only.", jsonErr);
          }

          let intelligenceToParse = jsonInput;
          try {
              const cleanInput = jsonInput.replace(/```json\s*|\s*```/g, "").trim();
              JSON.parse(cleanInput);
              // If it's valid JSON, pass the clean JSON directly so handleToolOutput can parse it without AI
              intelligenceToParse = cleanInput;
          } catch (e) {
              intelligenceToParse = `
              SOURCE: OSINT_JSON_IMPORT
              TARGET_ENTITY: ${node.label}
              
              RAW_JSON_DATA:
              ${jsonInput}
              `;
          }

          await onParseData(intelligenceToParse, node.id);
          
          const newReports = reportsText + `\n\n=== OSINT IMPORT LOG ===\nData imported.\nSee Graph for new nodes.`;
          setReportsText(newReports);
          onUpdateNode({ id: node.id, reports: newReports });
          
          setIsPastingJson(false);
          setJsonInput('');
      } catch (e: any) {
          setVisualError(e.message || "JSON Import Failed.");
      } finally {
          setIsImportingToGraph(false);
      }
  };

  const neighbors = activeWs.data.links
    .filter(l => {
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      return s === node.id || t === node.id;
    })
    .map(l => {
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      const neighborId = s === node.id ? t : s;
      const neighborNode = activeWs.data.nodes.find(n => n.id === neighborId);
      return {
        link: l,
        node: neighborNode,
        direction: s === node.id ? 'out' : 'in'
      };
    })
    .filter(n => n.node);

  if (!node) return null;
  
  // Extract social intelligence, comments, snippets and direct comment URLs
  const socialIntel = extractNodeCommentsAndIntel(node);

  // Determine if URL exists in label for quick link
  const isLabelUrl = node.label.startsWith('http') || node.label.includes('.com');
  const targetUrl = node.url || (isLabelUrl ? (node.label.startsWith('http') ? node.label : `https://${node.label}`) : null);
  const isShareUrl = targetUrl && (
      targetUrl.includes('tiktok.com') || 
      targetUrl.includes('instagr.am') || targetUrl.includes('instagram.com') ||
      targetUrl.includes('pin.it') || targetUrl.includes('perplexity.ai') ||
      targetUrl.includes('claude.ai') || targetUrl.includes('subtack.com') ||
      targetUrl.includes('suno.com') || targetUrl.includes('t.me') ||
      targetUrl.includes('sharepoint.com') || targetUrl.includes('1drv.ms') ||
      targetUrl.includes('discord.gg')
  );
  
  // Determine if node is a CVE
  const isCve = node.label.toUpperCase().startsWith('CVE-');

  // Reliable image URLs from node state only (no zombie regex resurrection)
  const rawImageUrls = (node.imageUrls && node.imageUrls.length > 0 ? node.imageUrls : (node.imageUrl ? [node.imageUrl] : []))
      .map(img => typeof img === 'string' ? img : (img as any)?.url)
      .filter((img): img is string => typeof img === 'string' && img.trim().length > 0);
  const displayImageUrls = Array.from(new Set(rawImageUrls));

  return (
    <div className="w-full h-full flex bg-[#0a0a0a]/95 border-t-2 border-[var(--theme-color)] animate-in slide-in-from-bottom-10 duration-500 overflow-hidden relative">
      
      {/* Enlarged Image Modal - Portal */}
      {enlargedImage && createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/95 flex flex-col items-center justify-center p-6" onClick={() => setEnlargedImage(null)}>
              <div className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                  <img 
                    src={getProxiedImageUrl(enlargedImage)} 
                    alt="Enlarged" 
                    referrerPolicy="no-referrer" 
                    className="max-w-[90vw] max-h-[75vh] object-contain shadow-2xl rounded border border-gray-800 bg-black" 
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                  />
                  <div className="mt-4 flex items-center gap-3">
                      {node && node.imageUrl !== enlargedImage && (
                          <button 
                            onClick={() => {
                              handleSelectCandidateAsPrimary(enlargedImage);
                              setEnlargedImage(null);
                            }} 
                            className="bg-[var(--theme-color)] hover:opacity-90 text-black text-xs font-black px-4 py-2 rounded flex items-center gap-2 shadow-lg transition-all uppercase"
                            title="Jadikan gambar ini sebagai foto profil utama sasaran"
                          >
                              <Target size={14} /> JADIKAN GAMBAR PROFIL UTAMA (SET PRIMARY)
                          </button>
                      )}
                      <button 
                        onClick={() => handleDeleteImage(enlargedImage)} 
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 shadow-lg transition-all"
                        title="Padam imej ini daripada sasaran"
                      >
                          <Trash2 size={14} /> PADAM GAMBAR INI (DELETE)
                      </button>
                      <button 
                        onClick={() => setEnlargedImage(null)} 
                        className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 transition-all"
                      >
                          <X size={14} /> TUTUP (CLOSE)
                      </button>
                  </div>
              </div>
              <button className="absolute top-5 right-5 text-gray-400 hover:text-white" onClick={() => setEnlargedImage(null)}><X size={32} /></button>
          </div>,
          document.body
      )}

      {/* Direct Image URL Modal */}
      {showUrlModal && createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowUrlModal(false)}>
              <div className="bg-[#111] border border-[var(--theme-color)]/40 p-5 rounded-lg max-w-md w-full shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <LinkIcon size={14} className="text-[var(--theme-color)]" /> Tambah URL Imej Sasaran
                      </span>
                      <button onClick={() => setShowUrlModal(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                      Tampal pautan langsung gambar profil sebenar (cth. dari Facebook, Instagram, LinkedIn, X, atau mana-mana pautan imej .jpg/.png):
                  </p>
                  <input 
                      type="url" 
                      value={customImageUrl} 
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-black border border-gray-700 text-white px-3 py-2 text-xs rounded focus:border-[var(--theme-color)] outline-none font-mono"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomImageUrl(); }}
                  />
                  <div className="flex justify-end gap-2 pt-2">
                      <button 
                          onClick={() => setShowUrlModal(false)} 
                          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 rounded"
                      >
                          Batal
                      </button>
                      <button 
                          onClick={handleAddCustomImageUrl} 
                          disabled={!customImageUrl.trim()}
                          className="px-4 py-1.5 text-xs bg-[var(--theme-color)] text-black font-black uppercase rounded hover:opacity-90 disabled:opacity-40"
                      >
                          Simpan Imej
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* Visual Target Matcher & Candidate Gallery Modal */}
      {showVisualSelectorModal && createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4" onClick={() => setShowVisualSelectorModal(false)}>
              <div className="bg-[#0c0d0e] border-2 border-[var(--theme-color)]/60 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="p-3.5 sm:p-4 border-b border-white/10 bg-black/90 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-[var(--theme-color)]/20 border border-[var(--theme-color)]/50 rounded-lg text-[var(--theme-color)] shadow-[0_0_15px_rgba(var(--theme-color-rgb),0.3)]">
                              <ScanEye size={20} className={isScanningVisual ? "animate-pulse" : ""} />
                          </div>
                          <div>
                              <div className="flex items-center gap-2">
                                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                                      Carian Visual Web &amp; Risikan Imej Sasaran
                                  </h3>
                                  {isScanningVisual && (
                                      <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/50 rounded text-[9px] font-mono animate-pulse flex items-center gap-1">
                                          <Loader2 size={9} className="animate-spin" /> SEDANG MENYEDUT
                                      </span>
                                  )}
                              </div>
                              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                  {isScanningVisual ? 'Mengimbas Bing Visual, Tavily AI, Google Grounding, Wikipedia & Arkib Media...' : `${visualCandidates.length} foto berkait dikesan melalui berbilang enjin risikan.`}
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setShowVisualSelectorModal(false)} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                          <X size={18} />
                      </button>
                  </div>

                  {/* Smart Search Bar with Mod Focus */}
                  <div className="p-3 bg-zinc-950 border-b border-white/10 space-y-2">
                      <div className="flex gap-2">
                          <div className="relative flex-1">
                              <input 
                                  type="text" 
                                  value={visualSearchQuery} 
                                  onChange={(e) => setVisualSearchQuery(e.target.value)}
                                  placeholder="Masukkan nama sasaran, gelaran, nombor kes, atau syarikat..."
                                  className="w-full bg-black/90 border border-zinc-700 text-white pl-8 pr-3 py-1.5 text-xs rounded-md focus:border-[var(--theme-color)] outline-none font-mono placeholder:text-zinc-600"
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleDeepVisualScan(visualSearchQuery); }}
                              />
                              <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
                          </div>

                          <select 
                              value={targetMode} 
                              onChange={(e: any) => setTargetMode(e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] font-mono rounded-md px-2 py-1 focus:outline-none focus:border-[var(--theme-color)]"
                              title="Fokus Mod Visual"
                          >
                              <option value="AUTO">🎯 Auto (Konteks Kes)</option>
                              <option value="PORTRAIT">👤 Wajah / Profil</option>
                              <option value="CRIME_NEWS">📰 Mahkamah / PDRM</option>
                              <option value="ORGANIZATION">🏢 Syarikat / Logo</option>
                              <option value="SOCIAL">🌐 Media Sosial</option>
                              <option value="EVIDENCE">🧾 Bukti / Resit</option>
                              <option value="LOCATION">📍 Lokasi / Bangunan</option>
                          </select>

                          <button 
                              onClick={() => handleDeepVisualScan(visualSearchQuery)}
                              disabled={isScanningVisual || !visualSearchQuery.trim()}
                              className="px-3.5 py-1.5 bg-[var(--theme-color)] text-black font-black text-xs uppercase tracking-wider rounded-md hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-md shrink-0"
                          >
                              {isScanningVisual ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                              {isScanningVisual ? 'Mengimbas...' : 'Cari Semula'}
                          </button>
                      </div>

                      {/* Engine Live Status Bar */}
                      <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 px-1">
                          <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
                                  <span className="text-cyan-300 font-bold">Bing &amp; Web HD</span>
                              </span>
                              <span className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${state.config.tavilyApiKey ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-500'}`}></span>
                                  <span className={state.config.tavilyApiKey ? 'text-emerald-300 font-bold' : 'text-zinc-500'}>Tavily AI: {state.config.tavilyApiKey ? 'AKTIF' : 'SEDIA'}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]"></span>
                                  <span className="text-blue-300 font-bold">Google Grounding</span>
                              </span>
                              <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]"></span>
                                  <span className="text-purple-300 font-bold">Wikipedia/Commons</span>
                              </span>
                          </div>
                          <label className="flex items-center gap-1 text-[8px] text-zinc-400 cursor-pointer select-none">
                              <input 
                                  type="checkbox" 
                                  checked={strictFilter} 
                                  onChange={(e) => setStrictFilter(e.target.checked)}
                                  className="rounded accent-[var(--theme-color)]"
                              />
                              <span>Tapis Stok Umum</span>
                          </label>
                      </div>
                  </div>

                  {/* Engine Filter Tabs */}
                  {visualCandidates.length > 0 && !isScanningVisual && (
                      <div className="px-4 py-2 bg-black/60 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[9px] font-mono">
                          <span className="text-zinc-500 uppercase font-bold mr-1">Enjin:</span>
                          <button 
                              onClick={() => setVisualEngineFilter('ALL')}
                              className={`px-2 py-0.5 rounded transition-all ${visualEngineFilter === 'ALL' ? 'bg-[var(--theme-color)] text-black font-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                          >
                              SEMUA ({visualCandidates.length})
                          </button>
                          {visualCandidates.filter(c => c.engine === 'wikidata').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('wikidata')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'wikidata' ? 'bg-teal-400 text-black font-black border-teal-300' : 'bg-teal-950/40 text-teal-300 border-teal-700/60 hover:bg-teal-900/50'}`}
                              >
                                  💎 WIKIDATA ({visualCandidates.filter(c => c.engine === 'wikidata').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'deezer').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('deezer')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'deezer' ? 'bg-fuchsia-500 text-black font-black border-fuchsia-400' : 'bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-700/60 hover:bg-fuchsia-900/50'}`}
                              >
                                  🎵 DEEZER / ARTIS ({visualCandidates.filter(c => c.engine === 'deezer').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'tvmaze').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('tvmaze')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'tvmaze' ? 'bg-rose-500 text-black font-black border-rose-400' : 'bg-rose-950/40 text-rose-300 border-rose-700/60 hover:bg-rose-900/50'}`}
                              >
                                  🎬 TVMAZE / PELAKON ({visualCandidates.filter(c => c.engine === 'tvmaze').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'youtube').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('youtube')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'youtube' ? 'bg-red-500 text-black font-black border-red-400' : 'bg-red-950/40 text-red-300 border-red-700/60 hover:bg-red-900/50'}`}
                              >
                                  ▶️ YOUTUBE ({visualCandidates.filter(c => c.engine === 'youtube').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'clearbit').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('clearbit')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'clearbit' ? 'bg-indigo-500 text-black font-black border-indigo-400' : 'bg-indigo-950/40 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900/50'}`}
                              >
                                  🏢 CLEARBIT / LOGO ({visualCandidates.filter(c => c.engine === 'clearbit').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'google_images').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('google_images')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'google_images' ? 'bg-blue-400 text-black font-black border-blue-300' : 'bg-blue-950/40 text-blue-300 border-blue-700/60 hover:bg-blue-900/50'}`}
                              >
                                  🌐 GOOGLE IMAGES ({visualCandidates.filter(c => c.engine === 'google_images').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'bing').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('bing')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'bing' ? 'bg-cyan-400 text-black font-black border-cyan-300' : 'bg-cyan-950/40 text-cyan-300 border-cyan-700/60 hover:bg-cyan-900/50'}`}
                              >
                                  BING HD ({visualCandidates.filter(c => c.engine === 'bing').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'tavily').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('tavily')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'tavily' ? 'bg-cyan-500 text-black font-black border-cyan-400' : 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60 hover:bg-cyan-900/50'}`}
                              >
                                  TAVILY ({visualCandidates.filter(c => c.engine === 'tavily').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'google_grounding').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('google_grounding')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'google_grounding' ? 'bg-blue-500 text-black font-black border-blue-400' : 'bg-blue-950/40 text-blue-400 border-blue-800/60 hover:bg-blue-900/50'}`}
                              >
                                  GOOGLE ({visualCandidates.filter(c => c.engine === 'google_grounding').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'wikipedia').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('wikipedia')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'wikipedia' ? 'bg-emerald-500 text-black font-black border-emerald-400' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/50'}`}
                              >
                                  WIKIPEDIA ({visualCandidates.filter(c => c.engine === 'wikipedia').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'duckduckgo').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('duckduckgo')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'duckduckgo' ? 'bg-amber-500 text-black font-black border-amber-400' : 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/50'}`}
                              >
                                  DUCKDUCKGO ({visualCandidates.filter(c => c.engine === 'duckduckgo').length})
                              </button>
                          )}
                          {visualCandidates.filter(c => c.engine === 'yahoo').length > 0 && (
                              <button 
                                  onClick={() => setVisualEngineFilter('yahoo')}
                                  className={`px-2 py-0.5 rounded transition-all border ${visualEngineFilter === 'yahoo' ? 'bg-purple-500 text-black font-black border-purple-400' : 'bg-purple-950/40 text-purple-400 border-purple-800/60 hover:bg-purple-900/50'}`}
                              >
                                  YAHOO ({visualCandidates.filter(c => c.engine === 'yahoo').length})
                              </button>
                          )}
                      </div>
                  )}

                  {/* Candidates Grid or Live Scanning Radar HUD */}
                  <div className="p-4 overflow-y-auto custom-scrollbar flex-1 max-h-[55vh]">
                      {isScanningVisual ? (
                          /* LIVE SCANNING RADAR HUD */
                          <div className="py-6 flex flex-col items-center justify-center space-y-6">
                              {/* Radar Visual */}
                              <div className="relative w-28 h-28 flex items-center justify-center">
                                  <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-30"></div>
                                  <div className="absolute inset-2 rounded-full border border-cyan-500/40"></div>
                                  <div className="absolute inset-6 rounded-full border border-dashed border-cyan-400/50 animate-spin" style={{ animationDuration: '6s' }}></div>
                                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/10 to-transparent animate-spin" style={{ animationDuration: '3s' }}></div>
                                  <div className="relative p-3 bg-cyan-950/80 border border-cyan-400 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                      <ScanEye size={28} className="text-cyan-400 animate-pulse" />
                                  </div>
                              </div>

                              {/* Progress status & engine logs */}
                              <div className="text-center space-y-2 max-w-md">
                                  <div className="text-sm font-black text-white font-mono flex items-center justify-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                                      MENYEDUT IMEJ UNTUK "{visualSearchQuery || node?.label}"
                                  </div>
                                  <div className="text-[11px] text-cyan-300/90 font-mono bg-black/60 border border-cyan-900/50 rounded-lg p-2.5 space-y-1 text-left">
                                      <div className="flex items-center gap-1.5 text-cyan-400">
                                          <Check size={11} /> 1. Menyahkod kata kunci &amp; entiti konteks kes
                                      </div>
                                      <div className="flex items-center gap-1.5 text-blue-300 animate-pulse">
                                          <Loader2 size={11} className="animate-spin shrink-0" /> 2. Mengimbas Bing Visual, Tavily AI &amp; Google Grounding
                                      </div>
                                      <div className="flex items-center gap-1.5 text-zinc-400">
                                          <Clock size={11} /> 3. Menyedut foto berita &amp; menilai skor relevansi
                                      </div>
                                  </div>
                              </div>

                              {/* Skeleton Cards Preview */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full opacity-60">
                                  {[1, 2, 3, 4, 5, 6].map((sk) => (
                                      <div key={sk} className="h-32 bg-zinc-900/60 border border-zinc-800/80 rounded-lg overflow-hidden relative animate-pulse flex items-center justify-center">
                                          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                                          <ImageIcon size={20} className="text-zinc-700" />
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ) : (() => {
                          const displayedCandidates = visualCandidates.filter(c => {
                              if (visualEngineFilter === 'ALL') return true;
                              return c.engine === visualEngineFilter;
                          });

                          if (displayedCandidates.length === 0) {
                              return (
                                  <div className="text-center py-10 text-zinc-500 space-y-3">
                                      <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-full w-fit mx-auto">
                                          <ImageIcon size={32} className="opacity-40 text-zinc-400" />
                                      </div>
                                      <div className="space-y-1">
                                          <p className="text-xs font-bold text-zinc-300">Tiada padanan imej automatik ditemui untuk "{visualSearchQuery}".</p>
                                          <p className="text-[10px] text-zinc-500 max-w-md mx-auto">
                                              Anda boleh mencari dengan nama alternatif sasaran di atas, atau gunakan alat muat naik manual / pautan URL di bawah.
                                          </p>
                                      </div>
                                      <div className="flex items-center justify-center gap-2 pt-2">
                                          <button 
                                              onClick={() => setShowUrlModal(true)}
                                              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold flex items-center gap-1.5"
                                          >
                                              <LinkIcon size={12} /> Tampal URL Terus
                                          </button>
                                          <button 
                                              onClick={() => fileInputRef.current?.click()}
                                              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold flex items-center gap-1.5"
                                          >
                                              <Upload size={12} /> Muat Naik Dari Fail
                                          </button>
                                      </div>
                                  </div>
                              );
                          }

                          return (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {displayedCandidates.map((cand, idx) => {
                                      const isCurrentPrimary = node?.imageUrl === cand.url;
                                      const engineName = cand.engine || 'web';
                                      return (
                                          <div 
                                              key={idx} 
                                              className={`relative group bg-black/70 border ${isCurrentPrimary ? 'border-[var(--theme-color)] ring-1 ring-[var(--theme-color)]' : 'border-zinc-800 hover:border-zinc-600'} rounded-lg overflow-hidden flex flex-col justify-between transition-all shadow-md`}
                                          >
                                              {/* Image Frame */}
                                              <div className="w-full h-32 sm:h-36 bg-zinc-950 overflow-hidden relative flex items-center justify-center">
                                                  <img 
                                                      src={getProxiedImageUrl(cand.thumbnail || cand.url)} 
                                                      alt={cand.title || `Candidate ${idx + 1}`}
                                                      referrerPolicy="no-referrer"
                                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                      onError={(e) => {
                                                          const target = e.currentTarget as HTMLImageElement;
                                                          if (target.src.includes('/api/proxy-image') && (cand.thumbnail || cand.url)) {
                                                              target.src = cand.thumbnail || cand.url;
                                                          } else {
                                                              target.src = 'https://www.transparenttextures.com/patterns/carbon-fibre.png';
                                                              target.className = 'w-full h-full object-cover opacity-20';
                                                          }
                                                      }}
                                                  />
                                                  {isCurrentPrimary && (
                                                      <div className="absolute top-1.5 left-1.5 bg-[var(--theme-color)] text-black text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md z-10">
                                                          <CheckCircle2 size={10} /> UTAMA
                                                      </div>
                                                  )}
                                                  {cand.relevanceScore !== undefined && (
                                                      <div className={`absolute top-1.5 right-1.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded backdrop-blur-md shadow-md z-10 ${
                                                          cand.relevanceScore >= 80 ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40' :
                                                          cand.relevanceScore >= 50 ? 'bg-amber-950/90 text-amber-300 border border-amber-500/40' :
                                                          'bg-zinc-900/90 text-zinc-400 border border-zinc-700'
                                                      }`}>
                                                          {cand.relevanceScore}% Konteks
                                                      </div>
                                                  )}
                                                  <div className="absolute bottom-1 right-1 bg-black/85 backdrop-blur-xs text-[8px] font-mono text-zinc-300 px-1.5 py-0.5 rounded flex items-center gap-1 border border-white/10">
                                                      {cand.category && <span className="text-[var(--accent-color)] font-bold">[{cand.category}]</span>}
                                                      {engineName === 'wikidata' ? (
                                                          <span className="text-teal-300 font-bold">💎 WIKIDATA</span>
                                                      ) : engineName === 'deezer' ? (
                                                          <span className="text-fuchsia-300 font-bold">🎵 DEEZER</span>
                                                      ) : engineName === 'tvmaze' ? (
                                                          <span className="text-rose-300 font-bold">🎬 TVMAZE</span>
                                                      ) : engineName === 'bing' ? (
                                                          <span className="text-cyan-300 font-bold">⚡ BING</span>
                                                      ) : engineName === 'tavily' ? (
                                                          <span className="text-cyan-400 font-bold">⚡ TAVILY</span>
                                                      ) : engineName === 'google_grounding' ? (
                                                          <span className="text-blue-400 font-bold">🌐 GOOGLE</span>
                                                      ) : engineName === 'wikipedia' ? (
                                                          <span className="text-emerald-400 font-bold">📖 WIKI</span>
                                                      ) : engineName === 'duckduckgo' ? (
                                                          <span className="text-amber-400 font-bold">🦆 DDG</span>
                                                      ) : engineName === 'yahoo' ? (
                                                          <span className="text-purple-400 font-bold">🟣 YAHOO</span>
                                                      ) : (
                                                          <span>{engineName === 'youtube' ? '▶️ YOUTUBE' : engineName === 'clearbit' ? '🏢 CLEARBIT' : engineName === 'google_images' ? '🌐 GOOGLE' : (cand.source || 'web')}</span>
                                                      )}
                                                  </div>
                                              </div>

                                              {/* Title & Actions */}
                                              <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-between bg-zinc-900/70">
                                                  <div>
                                                      <div className="text-[10px] text-zinc-200 font-medium line-clamp-2 leading-tight">
                                                          {cand.title || `Imej Sasaran #${idx + 1}`}
                                                      </div>
                                                      {cand.contextReason && (
                                                          <div className="text-[8px] text-cyan-300/80 font-mono mt-1 line-clamp-1">
                                                              ℹ️ {cand.contextReason}
                                                          </div>
                                                      )}
                                                  </div>
                                                  <div className="flex items-center gap-1 pt-1 border-t border-white/5">
                                                      <button 
                                                          onClick={() => handleSelectCandidateAsPrimary(cand.url)}
                                                          className={`flex-1 py-1 px-1.5 rounded text-[9px] font-black uppercase tracking-tight flex items-center justify-center gap-1 transition-all ${
                                                              isCurrentPrimary 
                                                                  ? 'bg-[var(--theme-color)]/20 text-[var(--theme-color)] border border-[var(--theme-color)]/40'
                                                                  : 'bg-white/10 hover:bg-[var(--theme-color)] text-white hover:text-black'
                                                          }`}
                                                          title="Jadikan Foto Profil Utama"
                                                      >
                                                          <Target size={10} /> {isCurrentPrimary ? 'Foto Utama' : 'Pilih Profil'}
                                                      </button>
                                                      <button 
                                                          onClick={() => handleAddCandidateToGallery(cand.url)}
                                                          className="p-1 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/15 rounded"
                                                          title="Tambah ke Koleksi Galeri"
                                                      >
                                                          <Plus size={12} />
                                                      </button>
                                                      <a 
                                                          href={cand.url} 
                                                          target="_blank" 
                                                          rel="noreferrer"
                                                          className="p-1 text-zinc-400 hover:text-cyan-400 bg-white/5 hover:bg-white/15 rounded"
                                                          title="Buka Pautan Asal"
                                                      >
                                                          <ExternalLink size={12} />
                                                      </a>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          );
                      })()}
                  </div>

                  {/* Footer */}
                  <div className="p-3 bg-black/95 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-3">
                          <button 
                              onClick={() => { setShowVisualSelectorModal(false); setShowUrlModal(true); }}
                              className="text-zinc-400 hover:text-cyan-300 flex items-center gap-1 text-[10px]"
                          >
                              <LinkIcon size={11} /> Tampal URL
                          </button>
                          <button 
                              onClick={() => { setShowVisualSelectorModal(false); fileInputRef.current?.click(); }}
                              className="text-zinc-400 hover:text-cyan-300 flex items-center gap-1 text-[10px]"
                          >
                              <Upload size={11} /> Muat Naik Fail
                          </button>
                      </div>
                      <button 
                          onClick={() => setShowVisualSelectorModal(false)}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold"
                      >
                          Tutup
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(255,0,51,0.1)_1px,transparent_1px)] bg-[size:100%_4px]"></div>

      {/* SECTION 1: TARGET PHOTO / VISUAL IDENTIFIER */}
      {isVisualCollapsed ? (
        <div className="w-11 border-r border-[var(--theme-color)]/20 flex flex-col items-center justify-between py-3 bg-[var(--theme-color)]/5 shrink-0 select-none">
          <button
            onClick={() => setIsVisualCollapsed(false)}
            className="p-1 text-zinc-400 hover:text-cyan-400 hover:bg-white/10 rounded transition-all cursor-pointer"
            title="Kembangkan Panel Visual"
          >
            <ChevronRight size={14} />
          </button>
          
          <button
            onClick={() => setIsVisualCollapsed(false)}
            className="w-8 h-8 rounded border border-[var(--theme-color)]/40 overflow-hidden bg-black shrink-0 cursor-pointer hover:border-[var(--theme-color)] transition-all"
            title="Buka Imej Sasaran"
          >
            {displayImageUrls.length > 0 ? (
              <img 
                src={getProxiedImageUrl(node.imageUrl || displayImageUrls[0])} 
                alt={node.label}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <User size={14} />
              </div>
            )}
          </button>

          <span className="[writing-mode:vertical-rl] rotate-180 text-[8px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-500 hover:text-zinc-300 cursor-pointer" onClick={() => setIsVisualCollapsed(false)}>
            VISUAL ID
          </span>

          <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-color)] opacity-60" />
        </div>
      ) : (
        <div className="w-64 border-r border-[var(--theme-color)]/20 flex flex-col p-4 bg-[var(--theme-color)]/5 relative text-center shrink-0 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
              Visual Identifier
            </span>
            <button
              onClick={() => setIsVisualCollapsed(true)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded hover:bg-white/5 transition-all"
              title="Kecilkan / Suruk Visual Panel"
            >
              <ChevronLeft size={13} />
            </button>
          </div>
          <div className="relative group mx-auto mb-2">
              <div className="w-40 h-40 border-2 border-[var(--theme-color)] rounded-sm overflow-hidden shadow-[0_0_20px_rgba(255,0,51,0.3)] bg-black flex items-center justify-center relative">
                  {displayImageUrls.length > 0 ? (
                      <img 
                        src={getProxiedImageUrl(node.imageUrl || displayImageUrls[0])} 
                        alt={node.label}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        referrerPolicy="no-referrer"
                        onClick={() => setEnlargedImage(node.imageUrl || displayImageUrls[0])}
                        onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const fallback = node.imageUrl || displayImageUrls[0];
                            if (target.src.includes('/api/proxy-image') && fallback) {
                                target.src = fallback;
                            } else {
                                target.src = 'https://www.transparenttextures.com/patterns/carbon-fibre.png';
                                target.className = 'w-full h-full object-cover opacity-20';
                            }
                        }}
                      />
                  ) : (
                      <div className="text-gray-800 flex flex-col items-center">
                          <User size={48} strokeWidth={1} />
                          <span className="text-[10px] uppercase font-black tracking-tighter opacity-20 mt-2">No Visual Data</span>
                      </div>
                  )}
                  
                  {isScanningVisual && (
                      <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
                           <ScanEye className="text-[var(--theme-color)] animate-pulse" size={40} />
                           <div className="w-full h-1 bg-[var(--theme-color)] absolute top-1/2 animate-[scanline_2s_linear_infinite]"></div>
                      </div>
                  )}
                  
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[var(--theme-color)]/20 to-transparent"></div>
                  
                  {/* UPLOAD & ACTION OVERLAY */}
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white/10 hover:bg-[var(--theme-color)] text-white hover:text-black rounded-full transition-all"
                        title="Muat Naik Fail Imej"
                      >
                          <Upload size={14} />
                      </button>
                      <button 
                        onClick={() => setShowUrlModal(true)}
                        className="p-2 bg-white/10 hover:bg-[var(--theme-color)] text-white hover:text-black rounded-full transition-all"
                        title="Tampal URL Imej"
                      >
                          <LinkIcon size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeepVisualScan()}
                        className="p-2 bg-white/10 hover:bg-[var(--accent-color)] text-white hover:text-black rounded-full transition-all"
                        title="Carian Visual Web"
                      >
                          <ScanEye size={14} />
                      </button>
                      {displayImageUrls.length > 0 && (
                          <button 
                            onClick={() => {
                              const mainImg = node.imageUrl || displayImageUrls[0];
                              if (mainImg) handleDeleteImage(mainImg);
                            }}
                            className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-all"
                            title="Padam Foto Profil Utama Ini"
                          >
                              <Trash2 size={14} />
                          </button>
                      )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
              
              {/* GALLERY THUMBNAILS */}
              {displayImageUrls.length > 0 && (
                  <div className="mt-2.5 w-full space-y-1 bg-black/40 border border-white/5 p-1.5 rounded text-left">
                      <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400">
                          <span className="font-bold text-zinc-300">GALERI IMEJ ({displayImageUrls.length})</span>
                          <span className="text-[7.5px] text-zinc-500 font-sans">Klik 🎯 = Foto Utama | 🗑️ = Padam</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto max-w-full py-1 px-1 custom-scrollbar justify-start">
                          {displayImageUrls.map((img, i) => {
                              if (!img) return null;
                              const isMain = (node.imageUrl === img) || (i === 0 && !node.imageUrl);
                              return (
                                <div key={i} className="relative group flex-shrink-0 w-12 h-12 my-1">
                                    <img 
                                      src={getProxiedImageUrl(img)} 
                                      alt="thumb" 
                                      referrerPolicy="no-referrer" 
                                      className={`w-full h-full object-cover cursor-pointer rounded border bg-black transition-all ${
                                          isMain ? 'border-[var(--theme-color)] ring-2 ring-[var(--theme-color)]/70' : 'border-zinc-700 opacity-80 hover:opacity-100'
                                      }`} 
                                      onClick={() => setEnlargedImage(img)} 
                                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} 
                                    />
                                    {isMain ? (
                                        <div className="absolute -top-1.5 -left-1 bg-[var(--theme-color)] text-black text-[6px] font-black px-1 py-0.2 rounded shadow-md z-30 uppercase tracking-tighter">
                                            UTAMA
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSelectCandidateAsPrimary(img); }}
                                            className="absolute -top-1 -left-1 bg-zinc-900/95 hover:bg-[var(--theme-color)] text-zinc-300 hover:text-black border border-white/20 p-1 rounded-full shadow-lg z-30 transition-all cursor-pointer"
                                            title="Jadikan Foto Profil Utama"
                                        >
                                            <Target size={10} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}
                                        className="absolute -top-1 -right-1 bg-red-600/95 hover:bg-red-500 text-white p-1 rounded-full shadow-lg z-30 transition-all cursor-pointer"
                                        title="Padam Imej Ini"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              {/* QUICK VISUAL RECON ACTIONS */}
              <div className="mt-2.5 space-y-1.5 w-full">
                  {/* MOD KONTEKS FOCUS SELECTOR */}
                  <div className="p-1.5 bg-black/80 border border-zinc-800 rounded text-left space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-mono font-bold text-zinc-400 uppercase">
                          <span>Fokus Mod Visual:</span>
                          <span className="text-[var(--accent-color)]">{targetMode}</span>
                      </div>
                      <select 
                          value={targetMode} 
                          onChange={(e: any) => setTargetMode(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-[9px] font-mono rounded px-1.5 py-1 focus:outline-none focus:border-[var(--theme-color)]"
                      >
                          <option value="AUTO">🎯 Auto (Sesuai Konteks Kes)</option>
                          <option value="PORTRAIT">👤 Wajah / Foto Profil</option>
                          <option value="CRIME_NEWS">📰 Mahkamah / Siasatan / PDRM</option>
                          <option value="ORGANIZATION">🏢 Syarikat / Logo / Premis</option>
                          <option value="SOCIAL">🌐 Profil Media Sosial</option>
                          <option value="EVIDENCE">🧾 Bukti / Resit / Transaksi</option>
                          <option value="LOCATION">📍 Bangunan / Satelit</option>
                      </select>

                      <div className="flex items-center justify-between pt-1">
                          <label className="flex items-center gap-1 text-[8px] text-zinc-400 cursor-pointer select-none">
                              <input 
                                  type="checkbox" 
                                  checked={strictFilter} 
                                  onChange={(e) => setStrictFilter(e.target.checked)}
                                  className="rounded accent-[var(--theme-color)]"
                              />
                              <span>Tapis Stok Umum</span>
                          </label>
                          {connectedEntities.length > 0 && (
                              <span className="text-[8px] text-cyan-400 font-mono">
                                  +{connectedEntities.length} Entiti Kes
                              </span>
                          )}
                      </div>
                  </div>

                  {/* Engine connectivity status indicator */}
                  <div className="flex items-center justify-between text-[7.5px] font-mono px-1.5 py-1 bg-black/60 border border-white/5 rounded text-zinc-400">
                      <span className="flex items-center gap-1" title={state.config.tavilyApiKey ? "Kunci Tavily API Berfungsi" : "Tavily API Key pilihan (masukkan di Tetapan jika ada)"}>
                          <span className={`w-1.5 h-1.5 rounded-full ${state.config.tavilyApiKey ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-zinc-500'}`}></span>
                          <span className={state.config.tavilyApiKey ? 'text-cyan-300 font-bold' : 'text-zinc-500'}>Tavily: {state.config.tavilyApiKey ? 'AKTIF' : 'SEDIA'}</span>
                      </span>
                      <span className="flex items-center gap-1" title="Google Search Grounding Engine">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]"></span>
                          <span className="text-blue-300 font-bold">Google AI</span>
                      </span>
                      <span className="flex items-center gap-1" title="Wikipedia, DuckDuckGo & Arkib Imej">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
                          <span className="text-emerald-300 font-bold">Web 6x</span>
                      </span>
                  </div>

                  <button
                      onClick={() => handleDeepVisualScan()}
                      disabled={isScanningVisual}
                      className="w-full py-1.5 px-2 bg-[var(--theme-color)]/20 hover:bg-[var(--theme-color)] text-[var(--theme-color)] hover:text-black border border-[var(--theme-color)]/40 rounded text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                      title="Imbas internet berasaskan konteks kes dan entiti berkaitan"
                  >
                      {isScanningVisual ? (
                          <>
                              <Loader2 size={12} className="animate-spin" />
                              Mengimbas Tavily &amp; Google...
                          </>
                      ) : (
                          <>
                              <ScanEye size={12} />
                              Carian Visual Konteks
                          </>
                      )}
                  </button>

                  <div className="grid grid-cols-3 gap-1">
                      <button
                          onClick={() => fileInputRef.current?.click()}
                          className="py-1 px-1 bg-white/5 hover:bg-white/15 text-zinc-300 border border-white/10 rounded text-[8px] font-bold uppercase tracking-tight flex items-center justify-center gap-1 transition-all"
                          title="Muat naik fail dari peranti"
                      >
                          <Upload size={10} /> Muat Naik
                      </button>
                      <button
                          onClick={() => setShowUrlModal(true)}
                          className="py-1 px-1 bg-white/5 hover:bg-white/15 text-zinc-300 border border-white/10 rounded text-[8px] font-bold uppercase tracking-tight flex items-center justify-center gap-1 transition-all"
                          title="Tampal pautan langsung URL imej"
                      >
                          <LinkIcon size={10} /> URL Pautan
                      </button>
                      <button
                          onClick={() => setShowVisualSelectorModal(true)}
                          className={`py-1 px-1 rounded text-[8px] font-bold uppercase tracking-tight flex items-center justify-center gap-1 transition-all border ${
                              visualCandidates.length > 0 
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30' 
                                  : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/15'
                          }`}
                          title="Buka galeri padanan carian visual"
                      >
                          <LayoutGrid size={10} /> Galeri ({visualCandidates.length || displayImageUrls.length})
                      </button>
                  </div>

                  {/* REVERSE IMAGE SEARCH & OSINT ENGINE LAUNCHERS */}
                  <div className="p-1.5 bg-black/60 border border-zinc-800/80 rounded text-left space-y-1">
                      <div className="flex items-center justify-between text-[7.5px] font-mono text-zinc-400">
                          <span className="font-bold text-zinc-300">OSINT REVERSE IMAGE:</span>
                          <span className="text-[7px] text-cyan-400">Lensa &amp; Enjin</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                          <button
                              onClick={() => launchExternalImageSearch('lens')}
                              className="py-1 px-0.5 bg-zinc-900 hover:bg-blue-600 hover:text-white text-zinc-300 border border-zinc-700 rounded text-[7.5px] font-bold flex items-center justify-center gap-0.5 transition-all"
                              title="Carian Imej Berbalik Google Lens"
                          >
                              <Globe size={9} /> Lens
                          </button>
                          <button
                              onClick={() => launchExternalImageSearch('yandex')}
                              className="py-1 px-0.5 bg-zinc-900 hover:bg-red-600 hover:text-white text-zinc-300 border border-zinc-700 rounded text-[7.5px] font-bold flex items-center justify-center gap-0.5 transition-all"
                              title="Carian Imej Berbalik Yandex Visual"
                          >
                              <Search size={9} /> Yandex
                          </button>
                          <button
                              onClick={() => launchExternalImageSearch('bing')}
                              className="py-1 px-0.5 bg-zinc-900 hover:bg-cyan-600 hover:text-white text-zinc-300 border border-zinc-700 rounded text-[7.5px] font-bold flex items-center justify-center gap-0.5 transition-all"
                              title="Carian Imej Berbalik Bing Visual"
                          >
                              <ScanEye size={9} /> Bing
                          </button>
                          <button
                              onClick={() => launchExternalImageSearch('facecheck')}
                              className="py-1 px-0.5 bg-zinc-900 hover:bg-emerald-600 hover:text-white text-zinc-300 border border-zinc-700 rounded text-[7.5px] font-bold flex items-center justify-center gap-0.5 transition-all"
                              title="Pengecaman Wajah FaceCheck.id"
                          >
                              <UserCheck size={9} /> FaceCheck
                          </button>
                      </div>
                  </div>

                  {visualSuccessMsg && (
                      <div className="p-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded text-left text-[9px] text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 size={11} className="shrink-0 text-emerald-400" />
                          <span className="truncate">{visualSuccessMsg}</span>
                      </div>
                  )}

                  {visualError && (
                      <div className="p-1.5 bg-rose-950/60 border border-rose-500/40 rounded text-left text-[9px] text-rose-300 flex items-center gap-1">
                          <X size={11} className="shrink-0 text-rose-400 cursor-pointer" onClick={() => setVisualError(null)} />
                          <span className="line-clamp-2">{visualError}</span>
                      </div>
                  )}
              </div>

              {/* FASA 1: CONFIDENCE SCORE & PROVENANCE BADGE */}
              <div className="mt-3 p-2 bg-black/60 border border-gray-800 rounded text-left space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-gray-400">Confidence Rating:</span>
                  <span className={`font-black uppercase ${
                    (node.confidenceScore || 30) >= 75 ? 'text-emerald-400' :
                    (node.confidenceScore || 30) >= 45 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {node.confidenceScore || 30}% ({node.confidenceLevel || 'LOW'})
                  </span>
                </div>
                
                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      (node.confidenceScore || 30) >= 75 ? 'bg-emerald-500' :
                      (node.confidenceScore || 30) >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${node.confidenceScore || 30}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-1 border-t border-gray-900">
                  <span>Provenances: {node.sources?.length || (node.sourceType ? 1 : 0)} sources</span>
                  <span className="text-cyan-400 uppercase font-bold">{node.verificationStatus || 'UNVERIFIED'}</span>
                </div>
              </div>
          </div>
          
          <div className="w-full space-y-4">
              <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                      <NodeBrandIcon node={node} size={16} />
                      <h3 className="text-sm font-black text-white uppercase tracking-tighter truncate max-w-[170px]">{node.label}</h3>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                      <span 
                        className="text-[8px] px-2 py-0.5 font-black rounded-sm uppercase border"
                        style={{
                          backgroundColor: `${resolveNodeBrandOrType(node).brandColor}20`,
                          borderColor: `${resolveNodeBrandOrType(node).brandColor}60`,
                          color: resolveNodeBrandOrType(node).brandColor
                        }}
                      >
                        {resolveNodeBrandOrType(node).brandName}
                      </span>
                      <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">ID::{node.id.substring(0,8)}</span>
                  </div>
              </div>

              {/* TECHNICAL IDENTIFIERS PANEL */}
              <div className="bg-black/60 border border-[var(--theme-color)]/20 p-2 text-left rounded-sm space-y-2">
                  <div className="text-[8px] uppercase font-black text-gray-500 border-b border-white/5 pb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Cpu size={10} /> Identifiers & Pautan</span>
                      {socialIntel.platform !== 'web' && (
                        <span className="text-[7px] px-1 py-0.5 rounded font-mono font-bold uppercase" style={{ color: socialIntel.brandColor }}>
                          {socialIntel.platform}
                        </span>
                      )}
                  </div>
                  
                  {/* Extract FB_ID, Profile URL, and Direct Comment URL */}
                  {(() => {
                      const fbId = socialIntel.fbId;
                      const profileUrl = socialIntel.profileUrl;
                      const commentUrl = socialIntel.primaryCommentUrl;
                      
                      return (
                          <div className="space-y-1.5">
                              {fbId && (
                                  <div className="flex flex-col gap-0.5">
                                      <span className="text-[7px] text-gray-400 uppercase font-bold">Facebook ID</span>
                                      <code className="text-[10px] text-[var(--accent-color)] font-black bg-white/5 px-2 py-1 rounded truncate">
                                          {fbId}
                                      </code>
                                  </div>
                              )}
                              {profileUrl && (
                                  <div className="flex flex-col gap-0.5">
                                      <span className="text-[7px] text-gray-400 uppercase font-bold">Profil Sasaran ({socialIntel.platform})</span>
                                      <button 
                                        onClick={() => openExternalUrl(profileUrl)}
                                        className="text-[9px] text-blue-400 hover:text-blue-300 font-bold hover:underline flex items-center gap-1 truncate text-left"
                                      >
                                          <ExternalLink size={10} className="shrink-0" /> <span className="truncate">{profileUrl}</span>
                                      </button>
                                  </div>
                              )}
                              {commentUrl && (
                                  <div className="flex flex-col gap-0.5 bg-amber-500/10 border border-amber-500/30 p-1.5 rounded">
                                      <span className="text-[7px] text-amber-400 uppercase font-black flex items-center gap-1">
                                          <MessageSquare size={9} /> Pautan Komentar Langsung
                                      </span>
                                      <button 
                                        onClick={() => openExternalUrl(commentUrl)}
                                        className="text-[9px] text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 truncate text-left mt-0.5"
                                        title={commentUrl}
                                      >
                                          <ExternalLink size={10} className="shrink-0 text-amber-400" /> <span className="truncate">{commentUrl}</span>
                                      </button>
                                  </div>
                              )}
                              {!fbId && !profileUrl && !commentUrl && (
                                  <div className="text-[8px] text-gray-600 italic py-1 text-center">
                                      No identifiers detected in dossier.
                                  </div>
                              )}
                          </div>
                      );
                  })()}
              </div>
              
              {/* PRIMARY ACTION BUTTONS */}
              <button 
                  onClick={() => {
                      window.dispatchEvent(new CustomEvent('app:open-google-socint', { detail: { target: node.label, node } }));
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-950/80 via-blue-950/80 to-cyan-950/80 border border-cyan-500/70 text-cyan-300 py-2 px-2 text-[10px] font-black uppercase hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] rounded-sm"
                  title="Imbas Profil & Jejak Sosial menggunakan Google Custom Search (SOCINT CX: 53a0041f2f24f4e3b)"
              >
                  <Search size={12} className="text-cyan-400" /> GOOGLE CSE SOCINT (CX)
                  <ExternalLink size={10} />
              </button>

              {socialIntel.primaryCommentUrl && (
                  <button 
                      onClick={() => openExternalUrl(socialIntel.primaryCommentUrl)}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500/20 border border-amber-500 text-amber-300 py-2 px-2 text-[10px] font-black uppercase hover:bg-amber-500 hover:text-black transition-all animate-pulse shadow-md rounded-sm"
                  >
                      <MessageSquare size={12} /> BUKA PAUTAN KOMEN
                      <ExternalLink size={10} />
                  </button>
              )}

              {targetUrl && targetUrl !== socialIntel.primaryCommentUrl && (
                  <div className="space-y-2 w-full">
                      <button 
                          onClick={() => openExternalUrl(targetUrl)}
                          className="w-full flex items-center justify-center gap-2 bg-black border border-[var(--accent-color)] text-[var(--accent-color)] py-2 px-2 text-[10px] font-black uppercase hover:bg-[var(--accent-color)] hover:text-black transition-all"
                      >
                          <Globe size={12} /> BUKA PAUTAN SUMBER
                          <ExternalLink size={10} />
                      </button>
                      
                      {isShareUrl && (
                          <button 
                              onClick={() => openExternalUrl(`https://share.whopostedwhat.com/?url=${encodeURIComponent(targetUrl)}`)}
                              className="w-full flex items-center justify-center gap-2 bg-[#ff0033]/10 border border-[#ff0033] text-[#ff0033] py-2 px-2 text-[10px] font-black uppercase hover:bg-[#ff0033] hover:text-black transition-all"
                          >
                              <Search size={12} /> ShareTrace OSINT
                              <ExternalLink size={10} />
                          </button>
                      )}
                  </div>
              )}

              {isCve && (
                  <button 
                      onClick={() => onSendQuery(`Explain the security vulnerability ${node.label} and its potential impact.`)}
                      className="mt-2 w-full flex items-center justify-center gap-2 bg-black border border-yellow-500 text-yellow-400 py-2 px-2 text-[10px] font-black uppercase hover:bg-yellow-500 hover:text-black transition-all"
                  >
                      <Brain size={12} /> EXPLAIN CVE
                  </button>
              )}

              {!isPastingJson && (
                  <button 
                      onClick={() => setIsPastingJson(true)}
                      className="mt-2 w-full flex items-center justify-center gap-2 bg-black border border-orange-500 text-orange-400 py-2 px-2 text-[10px] font-black uppercase hover:bg-orange-500 hover:text-black transition-all"
                  >
                      <Database size={12} /> IMPORT OSINT/LEAKS JSON
                  </button>
              )}

              {isPastingJson && (
                  <div className="mt-3 w-full animate-in fade-in duration-300">
                      <textarea 
                          value={jsonInput}
                          onChange={(e) => setJsonInput(e.target.value)}
                          placeholder="Paste CheckLeaked JSON here..."
                          className="w-full h-24 bg-black/80 border border-orange-500/50 text-orange-400 text-[9px] font-mono p-2 custom-scrollbar resize-none focus:outline-none focus:border-orange-500"
                      />
                      <div className="flex gap-2 mt-1">
                          <button 
                              onClick={handleProcessJson}
                              disabled={isImportingToGraph || !jsonInput.trim()}
                              className="flex-1 bg-orange-500 text-black py-1.5 text-[9px] font-black uppercase hover:bg-orange-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                              {isImportingToGraph ? <RefreshCw className="animate-spin" size={10} /> : <Database size={10} />}
                              PROCESS
                          </button>
                          <button 
                              onClick={() => { setIsPastingJson(false); setJsonInput(''); }}
                              className="px-2 bg-black border border-gray-600 text-gray-400 hover:text-white hover:border-white transition-all flex items-center justify-center"
                          >
                              <X size={12} />
                          </button>
                      </div>
                  </div>
              )}

              {visualError && <div className="text-[8px] text-red-500 font-bold mt-2 bg-red-900/20 px-1 py-0.5 break-all">{visualError}</div>}
          </div>
        </div>
      )}

      {/* SECTION 2: EDITABLE INTELLIGENCE DOSSIER & REPORTS */}
      <div className="flex-1 flex flex-col border-r border-[var(--theme-color)]/20 min-w-0">
          <div className="h-8 border-b border-[var(--theme-color)]/10 flex items-center px-4 justify-between bg-black/40 shrink-0">
              <div className="flex gap-4 h-full">
                  <button 
                      onClick={() => setActiveTab('dossier')}
                      className={`text-[9px] font-black tracking-[0.4em] uppercase flex items-center gap-2 h-full border-b-2 transition-all ${activeTab === 'dossier' ? 'text-[var(--theme-color)] border-[var(--theme-color)]' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
                  >
                      <ShieldCheck size={12}/> Dossier
                  </button>
                  <button 
                      onClick={() => setActiveTab('reports')}
                      className={`text-[9px] font-black tracking-[0.4em] uppercase flex items-center gap-2 h-full border-b-2 transition-all ${activeTab === 'reports' ? 'text-[var(--accent-color)] border-[var(--accent-color)]' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
                  >
                      <FileText size={12}/> AI & Tavily
                  </button>
                  <button 
                      onClick={() => setActiveTab('network')}
                      className={`text-[9px] font-black tracking-[0.4em] uppercase flex items-center gap-2 h-full border-b-2 transition-all ${activeTab === 'network' ? 'text-amber-500 border-amber-500' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
                  >
                      <Network size={12}/> Network
                  </button>
              </div>
              <div className="flex items-center gap-2">
                  {/* Space & Layout Selector for Neural Command */}
                  <div className="hidden sm:flex items-center bg-black/60 border border-white/10 rounded p-0.5 text-[8px] font-mono">
                    <span className="text-zinc-500 px-1 font-bold">NEURAL:</span>
                    <button
                      onClick={() => handleSetNeuralMode('collapsed')}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${neuralMode === 'collapsed' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                      title="Suruk Neural Command ke tepi (Maksimum ruang Dossier)"
                    >
                      Suruk
                    </button>
                    <button
                      onClick={() => handleSetNeuralMode('compact')}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${neuralMode === 'compact' ? 'bg-cyan-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                      title="Mod Ikon sahaja (Lebih luas)"
                    >
                      Ikon
                    </button>
                    <button
                      onClick={() => handleSetNeuralMode('expanded')}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${neuralMode === 'expanded' ? 'bg-[var(--theme-color)] text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                      title="Paparan penuh"
                    >
                      Penuh
                    </button>
                  </div>

                  {isDirty && (
                      <button onClick={saveDossier} className="flex items-center gap-1 text-[9px] bg-[var(--theme-color)] text-black px-2 py-0.5 font-bold animate-pulse rounded-sm">
                          <Save size={10}/> SAVE CHANGES
                      </button>
                  )}
                  <button onClick={onVaultSearch} className="text-gray-500 hover:text-[var(--accent-color)] transition-all p-1" title="Search in Vault"><HardDrive size={12} /></button>
                  <button onClick={onDelete} className="text-gray-500 hover:text-[var(--theme-color)] transition-all p-1" title="Delete Entity"><Trash2 size={12} /></button>
              </div>
          </div>
          
          <div className="flex-1 overflow-hidden relative bg-[#0a0a0a]">
              {queryState?.loading || isSearching ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                      <RefreshCw className="animate-spin text-[var(--theme-color)]" size={32} />
                      <span className="text-[10px] uppercase font-black tracking-widest animate-pulse">
                           {isSearching ? "Running Advanced Deep Search..." : "Neural Decoding in Progress..."}
                      </span>
                  </div>
               ) : activeTab === 'reports' ? (
                  <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
                      {/* AI Analysis Result Display */}
                      {queryState?.answer && (
                          <div className="p-4 border-b border-[var(--theme-color)]/20 bg-black/40">
                              <div className="text-[9px] text-[var(--theme-color)] font-black uppercase mb-2 flex items-center gap-2">
                                  <Brain size={12}/> AI Analysis Result
                              </div>
                              <div className="text-white text-[11px] leading-relaxed font-mono whitespace-pre-wrap bg-[#050505] p-3 border border-white/5 rounded-sm">
                                  {queryState.answer}
                              </div>
                          </div>
                      )}

                      {searchResults && (
                          <div className="p-4 border-b border-white/10 shrink-0">
                              <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-4">
                                  <span className="text-[10px] text-gray-500 uppercase">Found {searchResults.length} records</span>
                                  <div className="flex gap-3">
                                      <button 
                                        onClick={handleImportToGraph} 
                                        disabled={isImportingToGraph}
                                        className="text-[9px] bg-purple-900/50 text-purple-400 hover:bg-purple-600 hover:text-white px-3 py-1 uppercase font-bold border border-purple-600/30 transition-all flex items-center gap-2"
                                      >
                                          {isImportingToGraph ? <RefreshCw className="animate-spin" size={10} /> : <Network size={10} />}
                                          {isImportingToGraph ? 'PARSING...' : 'MAP TO GRAPH'}
                                      </button>
                                      <button onClick={() => setSearchResults(null)} className="text-[9px] text-[var(--theme-color)] hover:underline uppercase">Clear Results</button>
                                  </div>
                              </div>
                              {searchResults.map((res, i) => (
                                  <div key={i} className={`mb-4 group ${res.source.includes('AI') ? 'bg-purple-900/10 p-3 border border-purple-500/50 rounded-sm' : ''}`}>
                                      {res.source.includes('AI') && <div className="text-[9px] text-purple-400 font-black uppercase mb-1 flex items-center gap-2"><Zap size={10}/> AI Generated Answer</div>}
                                      <a href={res.link} target="_blank" rel="noreferrer" className="text-[var(--accent-color)] font-bold hover:underline block truncate uppercase text-xs mb-1">{res.title}</a>
                                      <div className="text-[9px] text-gray-600 truncate mb-1">{res.link}</div>
                                      <p className={`text-gray-400 text-[10px] leading-tight ${res.source.includes('AI') ? 'text-white font-medium' : ''}`}>{res.snippet}</p>
                                  </div>
                              ))}
                          </div>
                      )}
                      
                      <div className="flex-1 p-4">
                          <label className="text-[9px] text-gray-500 uppercase font-black mb-2 block">Manual Reports / Notes</label>
                          <textarea 
                              value={reportsText}
                              onChange={handleReportsChange}
                              onBlur={saveDossier}
                              placeholder="[REPORTS EMPTY] Add manual notes here..."
                              className="w-full h-full bg-[#050505] text-[var(--accent-color)] font-mono text-[11px] outline-none resize-none leading-relaxed selection:bg-[var(--accent-color)] selection:text-black border-none placeholder-gray-800"
                          />
                      </div>
                  </div>
               ) : activeTab === 'network' ? (
                  <div className="h-full flex flex-col overflow-y-auto custom-scrollbar p-4 space-y-4">
                      <div className="text-[10px] text-amber-500 font-black uppercase flex items-center gap-2 mb-2">
                          <Network size={14}/> Network Context & Relationships
                      </div>
                      
                      {neighbors.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-gray-700">
                              <Network size={32} className="opacity-20 mb-2" />
                              <span className="text-[10px] uppercase font-bold">No established links found for this entity.</span>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {neighbors.map((n, i) => (
                                  <div key={i} className="bg-black/40 border border-white/5 p-3 rounded-sm group hover:border-amber-500/50 transition-all">
                                      <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                              <span className="text-[10px] font-black text-white uppercase">{n.node?.label}</span>
                                          </div>
                                          <span className="text-[8px] bg-amber-900/30 text-amber-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-amber-500/20">
                                              {n.node?.type}
                                          </span>
                                      </div>
                                      
                                      <div className="text-[11px] text-gray-400 leading-relaxed italic border-l-2 border-amber-500/30 pl-3 py-1">
                                          {n.direction === 'out' ? (
                                              <>Entiti <span className="text-white font-bold">{node.label}</span> mempunyai hubungan <span className="text-amber-400 font-bold">"{n.link.label}"</span> terhadap <span className="text-white font-bold">{n.node?.label}</span>.</>
                                          ) : (
                                              <>Entiti <span className="text-white font-bold">{n.node?.label}</span> dikesan mempunyai hubungan <span className="text-amber-400 font-bold">"{n.link.label}"</span> terhadap <span className="text-white font-bold">{node.label}</span>.</>
                                          )}
                                      </div>
                                      
                                      <div className="mt-2 flex justify-end">
                                          <button 
                                            onClick={() => handleSmartQuery(`Analyze the relationship between ${node.label} and ${n.node?.label} based on the current graph context.`)}
                                            className="text-[8px] text-gray-500 hover:text-amber-500 flex items-center gap-1 uppercase font-black tracking-widest transition-all"
                                          >
                                              <Brain size={10} /> AI Deep Dive
                                          </button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                      
                      <div className="mt-auto pt-4 border-t border-white/5">
                          <p className="text-[8px] text-gray-600 leading-tight italic">
                              * Network context is derived from active graph topology. Use AI Deep Dive for cross-referenced intelligence.
                          </p>
                      </div>
                  </div>
               ) : (
                  <div className="h-full flex flex-col p-4 bg-[#050505] overflow-y-auto custom-scrollbar">
                      {node.htmlReportUrl && (
                          <div className="mb-4">
                              <a 
                                  href={node.htmlReportUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex items-center justify-center gap-2 bg-[#ff0033]/20 hover:bg-[#ff0033] border border-[#ff0033] text-white py-3 px-4 rounded-sm transition-all shadow-[0_0_15px_rgba(255,0,51,0.2)] font-black tracking-widest text-[11px] uppercase group"
                              >
                                  <ExternalLink size={16} className="text-[#ff0033] group-hover:text-black transition-colors" />
                                  <span className="group-hover:text-black transition-colors">Open Maigret Full HTML Report</span>
                              </a>
                          </div>
                      )}
                      
                      {/* DETECTED TARGET COMMENTS & DIRECT LINKS SECTION */}
                      {socialIntel.comments.length > 0 && (
                          <div className="mb-4 bg-[#0d0d12] border border-amber-500/40 rounded p-3 text-left space-y-2.5 shadow-lg">
                              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                                  <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                      <MessageSquare size={13} className="text-amber-400 animate-pulse" />
                                      Komentar Sasaran Dikesan ({socialIntel.comments.length})
                                  </span>
                                  <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase" style={{ backgroundColor: `${socialIntel.brandColor}22`, color: socialIntel.brandColor, border: `1px solid ${socialIntel.brandColor}55` }}>
                                      {socialIntel.platform}
                                  </span>
                              </div>

                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                  {socialIntel.comments.map((cmt, idx) => (
                                      <div key={cmt.id || idx} className="bg-white/5 border border-white/10 rounded p-2.5 space-y-1.5 hover:border-amber-500/50 transition-colors">
                                          <div className="flex items-center justify-between text-[9px] text-gray-400">
                                              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                                                  <User size={10} className="text-amber-400" />
                                                  {cmt.author || node.label}
                                              </span>
                                              {cmt.timestamp && (
                                                  <span className="text-gray-500 font-mono flex items-center gap-1">
                                                      <Clock size={10} /> {cmt.timestamp}
                                                  </span>
                                              )}
                                          </div>

                                          {cmt.snippet && (
                                              <div className="text-[11px] font-mono text-amber-200/90 bg-black/60 border-l-2 border-amber-400 pl-2.5 py-1.5 my-1 italic leading-relaxed">
                                                  "{cmt.snippet}"
                                              </div>
                                          )}

                                          <div className="flex flex-wrap items-center gap-2 pt-1">
                                              {cmt.commentUrl && (
                                                  <button
                                                      onClick={() => openExternalUrl(cmt.commentUrl)}
                                                      className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-300 border border-amber-500/60 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all shadow-sm group"
                                                      title={cmt.commentUrl}
                                                  >
                                                      <MessageSquare size={11} className="group-hover:scale-110 transition-transform" />
                                                      Buka Pautan Komen
                                                      <ExternalLink size={10} />
                                                  </button>
                                              )}

                                              {cmt.profileUrl && (
                                                  <button
                                                      onClick={() => openExternalUrl(cmt.profileUrl)}
                                                      className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 border border-blue-500/40 px-2 py-1 rounded text-[9px] font-bold uppercase transition-all"
                                                  >
                                                      <Globe size={10} />
                                                      Profil Sasaran
                                                      <ExternalLink size={9} />
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2">
                              <FileText size={12}/> Notes & Intelligence
                          </span>
                          <button 
                              onClick={() => setIsEditingDossier(!isEditingDossier)}
                              className="text-[9px] bg-white/5 hover:bg-[var(--theme-color)] hover:text-black px-2 py-1 rounded-sm transition-all flex items-center gap-1"
                          >
                              <Edit2 size={10} /> {isEditingDossier ? "VIEW" : "EDIT"}
                          </button>
                      </div>

                      {isEditingDossier ? (
                          <textarea 
                              value={dossierText}
                              onChange={handleDossierChange}
                              onBlur={saveDossier}
                              placeholder="[DOSSIER EMPTY] No intelligence data found. Run a scan or input manual notes here..."
                              className="w-full min-h-[150px] flex-1 bg-[#111] p-3 text-[var(--accent-color)] font-mono text-[11px] outline-none resize-none leading-relaxed selection:bg-[var(--accent-color)] selection:text-black border border-white/5 rounded-sm placeholder-gray-800"
                          />
                      ) : (
                          <div 
                              onDoubleClick={() => setIsEditingDossier(true)}
                              className="w-full min-h-[150px] flex-1 bg-transparent text-gray-300 font-sans text-xs outline-none overflow-y-auto leading-relaxed cursor-text markdown-styles"
                          >
                              {dossierText ? (
                                  <div className="markdown-body font-mono text-[11px] leading-relaxed text-gray-300">
                                      <Markdown
                                          remarkPlugins={[remarkGfm]}
                                          components={{
                                              h1: ({node, ...props}) => <h1 className="text-sm font-black text-white mt-4 mb-2 uppercase tracking-widest border-b border-white/10 pb-1" {...props} />,
                                              h2: ({node, ...props}) => <h2 className="text-xs font-bold text-white mt-3 mb-1 uppercase tracking-wide" {...props} />,
                                              h3: ({node, ...props}) => <h3 className="text-[11px] font-bold text-[var(--theme-color)] mt-3 mb-1 uppercase" {...props} />,
                                              ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-3 space-y-1" {...props} />,
                                              ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-3 space-y-1" {...props} />,
                                              p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                                              a: ({node, ...props}) => {
                                                const href = props.href || '';
                                                const isCommentLink = href.includes('/posts/') || href.includes('/comments/') || href.includes('comment_id=') || href.includes('/status/') || href.includes('/video/');
                                                return (
                                                  <a 
                                                    className={isCommentLink ? "inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px] hover:bg-amber-500 hover:text-black transition-all underline mx-1" : "text-[var(--accent-color)] hover:underline"} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    {...props}
                                                  >
                                                    {isCommentLink && <MessageSquare size={10} className="shrink-0 text-amber-400" />}
                                                    {props.children}
                                                    <ExternalLink size={9} className="shrink-0 opacity-70" />
                                                  </a>
                                                );
                                              },
                                              strong: ({node, ...props}) => <strong className="text-white font-black" {...props} />,
                                              blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-[var(--theme-color)] pl-3 italic text-gray-400 bg-white/5 py-1 pr-2 my-2" {...props} />,
                                              code: ({node, ...props}) => {
                                                const match = /language-(\w+)/.exec(props.className || '')
                                                return match 
                                                  ? <pre className="bg-black p-3 border border-white/5 rounded-sm overflow-x-auto my-3"><code className="text-[var(--theme-color)] font-mono text-[10px]" {...props} /></pre>
                                                  : <code className="bg-black text-[var(--accent-color)] px-1 py-0.5 rounded-sm font-mono text-[10px]" {...props} />
                                              }
                                          }}
                                      >
                                          {dossierText}
                                      </Markdown>
                                  </div>
                              ) : (
                                  <span className="text-gray-800 italic font-mono text-[11px]">[DOSSIER EMPTY] No intelligence data found. Double click or click EDIT to input manual notes here...</span>
                              )}
                          </div>
                      )}
                      
                      {/* Media Section */}
                      <div className="border-t border-gray-800 pt-4 mt-4 shrink-0">
                           <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-3 flex items-center justify-between">
                               <span className="flex items-center gap-2"><Camera size={12} /> Dossier Media / Evidence</span>
                               <div className="flex items-center gap-1.5">
                                   <button 
                                       onClick={() => fileInputRef.current?.click()}
                                       className="text-[9px] bg-white/5 hover:bg-[var(--theme-color)] hover:text-black px-2 py-1 rounded-sm transition-all flex items-center gap-1"
                                       title="Muat naik fail foto dari peranti"
                                   >
                                       <Upload size={10} /> + UPLOAD
                                   </button>
                                   <button 
                                       onClick={() => setShowUrlModal(true)}
                                       className="text-[9px] bg-white/5 hover:bg-[var(--theme-color)] hover:text-black px-2 py-1 rounded-sm transition-all flex items-center gap-1"
                                       title="Tampal pautan langsung imej"
                                   >
                                       <LinkIcon size={10} /> + URL
                                   </button>
                                   {displayImageUrls.length > 0 && (
                                       <button 
                                           onClick={handleClearAllImages}
                                           className="text-[9px] bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-800/40 px-2 py-1 rounded-sm transition-all flex items-center gap-1"
                                           title="Padam semua imej sasaran ini"
                                       >
                                           <Trash2 size={10} /> PADAM SEMUA
                                       </button>
                                   )}
                               </div>
                           </div>
                           
                           {displayImageUrls.length === 0 ? (
                               <div className="text-[10px] text-gray-600 italic text-center py-6 border border-dashed border-gray-800 rounded bg-white/5 space-y-2">
                                   <p>Tiada media atau gambar profil disimpan.</p>
                                   <p className="text-[9px] text-gray-500">Klik <strong>+ UPLOAD</strong> untuk memilih fail atau <strong>+ URL</strong> untuk tampal pautan gambar profil sasaran.</p>
                               </div>
                           ) : (
                               <div className="grid grid-cols-4 gap-2">
                                   {displayImageUrls.map((img, i) => {
                                       if (!img) return null;
                                       return (
                                           <div key={i} className="relative group/media aspect-square rounded overflow-hidden border border-gray-800 cursor-pointer bg-black" onClick={() => setEnlargedImage(img)}>
                                               <img 
                                                 src={getProxiedImageUrl(img)} 
                                                 alt="media" 
                                                 referrerPolicy="no-referrer" 
                                                 className="w-full h-full object-cover hover:opacity-75 transition-opacity" 
                                                 onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} 
                                               />
                                               <button 
                                                   onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}
                                                   className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded shadow-lg z-20 transition-all opacity-80 hover:opacity-100"
                                                   title="Padam Gambar Ini"
                                               >
                                                   <Trash2 size={12} />
                                               </button>
                                           </div>
                                       );
                                   })}
                               </div>
                           )}
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* SECTION 3: NEURAL UPLINK (INPUT & SUGGESTIONS) */}
      {neuralMode === 'collapsed' ? (
        /* COLLAPSED / SURUK KE TEPI MODE: Slim Right-Edge Expand Tab */
        <div className="w-8 bg-black/90 border-l border-zinc-800 flex flex-col items-center justify-between py-3 shrink-0 select-none z-10">
          <button
            onClick={() => handleSetNeuralMode('compact')}
            className="p-1 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 rounded transition-all cursor-pointer"
            title="Buka Neural Command (Mod Ikon)"
          >
            <ChevronLeft size={16} className="text-amber-400 animate-pulse" />
          </button>

          <button
            onClick={() => handleSetNeuralMode('compact')}
            className="flex flex-col items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer group py-4"
            title="Klik untuk buka panel Neural Command"
          >
            <Zap size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="[writing-mode:vertical-rl] rotate-180 text-[8.5px] font-mono font-bold tracking-[0.25em] uppercase text-zinc-400 group-hover:text-amber-300">
              NEURAL COMMAND
            </span>
          </button>

          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="Gemini Uplink Ready" />
        </div>
      ) : neuralMode === 'compact' ? (
        /* COMPACT / IKON SAHAJA MODE: Ultra-Slim 56px Tactical Icon Rail */
        <div className="w-14 bg-black/85 border-l border-[var(--theme-color)]/20 flex flex-col items-center justify-between py-2 shrink-0 select-none z-10 transition-all">
          {/* Header Controls for Rail */}
          <div className="flex flex-col items-center gap-1 border-b border-white/10 pb-2 w-full px-1">
            <div className="flex items-center justify-between w-full px-1">
              <button
                onClick={() => handleSetNeuralMode('expanded')}
                className="p-1 text-zinc-400 hover:text-cyan-300 hover:bg-white/10 rounded transition-all cursor-pointer"
                title="Kembangkan ke teks penuh (Expand)"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => handleSetNeuralMode('collapsed')}
                className="p-1 text-zinc-400 hover:text-red-400 hover:bg-white/10 rounded transition-all cursor-pointer"
                title="Suruk panel ke tepi (Hide)"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <span className="text-[7.5px] font-mono font-bold text-zinc-500 uppercase tracking-tighter">
              IKON
            </span>
          </div>

          {/* Action Icon Rail */}
          <div className="flex-1 flex flex-col items-center gap-2 py-2 overflow-y-auto custom-scrollbar w-full px-1.5">
            {/* Quick AI Query / Input Popover Trigger */}
            <div className="relative group/btn w-full flex justify-center">
              <button
                onClick={() => setShowMiniQueryPopup(prev => !prev)}
                className={`p-2.5 rounded border transition-all cursor-pointer shadow-md ${showMiniQueryPopup ? 'bg-[var(--theme-color)] text-black border-[var(--theme-color)] shadow-[0_0_10px_var(--theme-color)]' : 'bg-black/80 border-white/10 text-white hover:border-[var(--theme-color)] hover:text-[var(--theme-color)]'}`}
                title="Tanya AI / Query Input"
              >
                <Search size={15} />
              </button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover/btn:flex flex-col whitespace-nowrap bg-slate-950 border border-[var(--theme-color)]/40 px-2 py-1 rounded text-[10px] font-mono text-white shadow-2xl z-50 pointer-events-none">
                <span className="font-bold text-[var(--theme-color)]">Tanya AI (Custom Query)</span>
                <span className="text-[8px] text-zinc-400">Taip soalan atau arahan analisis</span>
              </div>
            </div>

            {/* Deep Audit */}
            <div className="relative group/btn w-full flex justify-center">
              <button
                onClick={() => handleSmartQuery("ANALISIS MENDALAM: Sila bedah keseluruhan dossier, komen, dan hubungan entiti ini. Berikan profil psikologi, corak tingkah laku, dan kaitan tersembunyi yang dikesan.")}
                className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all cursor-pointer shadow-md hover:shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                title="Deep Intelligence Audit"
              >
                <Brain size={15} />
              </button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover/btn:flex flex-col whitespace-nowrap bg-slate-950 border border-emerald-500/50 px-2 py-1 rounded text-[10px] font-mono text-white shadow-2xl z-50 pointer-events-none">
                <span className="font-bold text-emerald-400">Deep Intelligence Audit</span>
                <span className="text-[8px] text-zinc-400">Analisis profil & corak psikologi</span>
              </div>
            </div>

            {/* Copy Arena Prompt */}
            <div className="relative group/btn w-full flex justify-center">
              <button
                onClick={handleCopyArenaPrompt}
                className={`p-2.5 rounded border transition-all cursor-pointer shadow-md ${copiedPrompt ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'bg-amber-950/40 border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-black'}`}
                title={copiedPrompt ? "Telah Disalin!" : "Salin Prompt External / Arena"}
              >
                {copiedPrompt ? <Check size={15} /> : <Copy size={15} />}
              </button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover/btn:flex flex-col whitespace-nowrap bg-slate-950 border border-amber-500/50 px-2 py-1 rounded text-[10px] font-mono text-white shadow-2xl z-50 pointer-events-none">
                <span className="font-bold text-amber-400">{copiedPrompt ? "Disalin ke Clipboard!" : "Salin Prompt Arena"}</span>
                <span className="text-[8px] text-zinc-400">Eksport prompt perisikan penuh</span>
              </div>
            </div>

            {/* Quick Bio */}
            <div className="relative group/btn w-full flex justify-center">
              <button
                onClick={() => handleSmartQuery("Detailed biography and public record")}
                className="p-2.5 rounded bg-black/80 border border-white/10 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-950/40 transition-all cursor-pointer"
                title="Get Public Bio"
              >
                <Target size={15} />
              </button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover/btn:flex flex-col whitespace-nowrap bg-slate-950 border border-cyan-500/40 px-2 py-1 rounded text-[10px] font-mono text-white shadow-2xl z-50 pointer-events-none">
                <span className="font-bold text-cyan-400">Get Public Bio</span>
                <span className="text-[8px] text-zinc-400">Latar belakang & rekod awam</span>
              </div>
            </div>

            {/* Leak Check */}
            <div className="relative group/btn w-full flex justify-center">
              <button
                onClick={() => handleSmartQuery("Search for leaked emails and passwords")}
                className="p-2.5 rounded bg-black/80 border border-white/10 text-rose-400 hover:border-rose-400 hover:bg-rose-950/40 transition-all cursor-pointer"
                title="Leak & Password Check"
              >
                <Zap size={15} />
              </button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover/btn:flex flex-col whitespace-nowrap bg-slate-950 border border-rose-500/40 px-2 py-1 rounded text-[10px] font-mono text-white shadow-2xl z-50 pointer-events-none">
                <span className="font-bold text-rose-400">Leak Check</span>
                <span className="text-[8px] text-zinc-400">Cari emel/kredensial bocor</span>
              </div>
            </div>

            {/* Social Graph */}
            <div className="relative group/btn w-full flex justify-center">
              <button
                onClick={() => handleSmartQuery("Map social connections and associates")}
                className="p-2.5 rounded bg-black/80 border border-white/10 text-blue-400 hover:border-blue-400 hover:bg-blue-950/40 transition-all cursor-pointer"
                title="Social Graph Recon"
              >
                <Cpu size={15} />
              </button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover/btn:flex flex-col whitespace-nowrap bg-slate-950 border border-blue-500/40 px-2 py-1 rounded text-[10px] font-mono text-white shadow-2xl z-50 pointer-events-none">
                <span className="font-bold text-blue-400">Social Graph</span>
                <span className="text-[8px] text-zinc-400">Peta kaitan media sosial</span>
              </div>
            </div>

            {/* Geo Scan */}
            <div className="relative group/btn w-full flex justify-center">
              <button
                onClick={() => handleSmartQuery("Extract physical locations and metadata")}
                className="p-2.5 rounded bg-black/80 border border-white/10 text-indigo-400 hover:border-indigo-400 hover:bg-indigo-950/40 transition-all cursor-pointer"
                title="Geo & Location Scan"
              >
                <Camera size={15} />
              </button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover/btn:flex flex-col whitespace-nowrap bg-slate-950 border border-indigo-500/40 px-2 py-1 rounded text-[10px] font-mono text-white shadow-2xl z-50 pointer-events-none">
                <span className="font-bold text-indigo-400">Geo Scan</span>
                <span className="text-[8px] text-zinc-400">Ekstrak lokasi fizikal & EXIF</span>
              </div>
            </div>

            {/* Tavily Recon */}
            <div className="relative group/btn w-full flex justify-center">
              <button
                onClick={() => handleDeepSearch()}
                disabled={isSearching}
                className="p-2.5 rounded bg-purple-950/40 border border-purple-800 text-purple-400 hover:bg-purple-600 hover:text-white transition-all cursor-pointer"
                title="Tavily Web Search"
              >
                {isSearching ? <RefreshCw size={15} className="animate-spin" /> : <LayoutGrid size={15} />}
              </button>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover/btn:flex flex-col whitespace-nowrap bg-slate-950 border border-purple-500/40 px-2 py-1 rounded text-[10px] font-mono text-white shadow-2xl z-50 pointer-events-none">
                <span className="font-bold text-purple-400">Tavily Web Recon</span>
                <span className="text-[8px] text-zinc-400">Carian web mendalam masa nyata</span>
              </div>
            </div>
          </div>

          {/* Bottom Status Dot */}
          <div className="pt-2 border-t border-white/10 w-full flex justify-center items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Gemini Uplink Ready" />
          </div>

          {/* Mini Query Popover Dialog if triggered from compact mode */}
          {showMiniQueryPopup && (
            <div className="fixed bottom-24 right-16 z-[99999] bg-slate-950 border border-[var(--theme-color)] p-3 rounded-lg shadow-2xl w-80 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                <span className="text-[10px] font-mono font-bold text-[var(--theme-color)] uppercase flex items-center gap-1.5">
                  <Search size={12} /> Neural Query
                </span>
                <button onClick={() => setShowMiniQueryPopup(false)} className="text-zinc-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSmartQuery();
                      setShowMiniQueryPopup(false);
                    }
                  }}
                  placeholder="Taip soalan analisis..."
                  className="flex-1 bg-black border border-zinc-700 text-white text-xs px-2.5 py-1.5 rounded outline-none font-mono focus:border-[var(--theme-color)]"
                  autoFocus
                />
                <button
                  onClick={() => {
                    handleSmartQuery();
                    setShowMiniQueryPopup(false);
                  }}
                  disabled={queryState?.loading || !localInput.trim()}
                  className="px-3 bg-[var(--theme-color)] text-black rounded font-bold text-xs hover:opacity-90 disabled:opacity-40"
                >
                  <Send size={13} />
                </button>
              </div>
              <div className="text-[8.5px] text-[#ff0033] mt-2 bg-[#ff0033]/10 border border-[#ff0033]/30 px-1 py-0.5 rounded text-center">
                ⚠️ Menggunakan kuota token AI
              </div>
            </div>
          )}
        </div>
      ) : (
        /* EXPANDED FULL-WIDTH MODE (w-72 or w-80) */
        <div className="w-72 sm:w-80 flex flex-col bg-black/40 shrink-0 transition-all">
          <div className="h-8 border-b border-[var(--theme-color)]/10 flex items-center px-3 bg-black/60 justify-between shrink-0">
            <span className="text-[9px] font-black text-gray-400 tracking-[0.3em] uppercase flex items-center gap-2 truncate">
              <Zap size={12} className="text-amber-400" /> Neural Command
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSetNeuralMode('compact')}
                className="px-1.5 py-0.5 text-[8px] font-mono bg-white/5 hover:bg-white/15 text-cyan-300 rounded border border-cyan-500/30 transition-all cursor-pointer"
                title="Tukar ke mod Ikon sahaja (Beri ruang Dossier)"
              >
                Ikon
              </button>
              <button
                onClick={() => handleSetNeuralMode('collapsed')}
                className="p-1 text-gray-400 hover:text-amber-300 hover:bg-white/10 rounded transition-all cursor-pointer"
                title="Suruk ke tepi"
              >
                <ChevronRight size={13} />
              </button>
              <button onClick={onToggleMinimize} className="p-1 text-gray-400 hover:text-white transition-all cursor-pointer">
                <ChevronDown size={13} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto custom-scrollbar">
            <div className="relative group">
              <input 
                type="text" 
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSmartQuery()}
                placeholder="Execute intelligence query..."
                className="w-full bg-black/60 border border-[var(--theme-color)]/30 text-white text-[11px] py-2.5 pl-9 pr-8 outline-none focus:border-[var(--theme-color)] transition-all placeholder-gray-600 italic font-mono rounded-sm"
                disabled={queryState?.loading}
              />
              <Search className="absolute left-3 top-3 text-[var(--theme-color)]/50 group-focus-within:text-[var(--theme-color)]" size={13} />
              <button 
                onClick={() => handleSmartQuery()} 
                disabled={queryState?.loading || !localInput.trim()}
                className="absolute right-1.5 top-1.5 bg-[var(--theme-color)] text-black p-1.5 hover:bg-white transition-all disabled:opacity-20 rounded-sm"
              >
                <Send size={12} />
              </button>
            </div>
            
            <div className="text-[9px] text-[#ff0033] border border-[#ff0033]/30 px-1 py-0.5 bg-[#ff0033]/10 w-full text-center rounded-sm font-mono">
              ⚠️ QUERY MENGGUNAKAN KUOTA TOKEN AI
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2">
              <button 
                onClick={() => handleSmartQuery("ANALISIS MENDALAM: Sila bedah keseluruhan dossier, komen, dan hubungan entiti ini. Berikan profil psikologi, corak tingkah laku, dan kaitan tersembunyi yang dikesan.")} 
                className="col-span-2 text-[9px] font-black bg-emerald-900/20 border border-emerald-500/50 text-emerald-400 p-2 hover:bg-emerald-500 hover:text-black transition-all uppercase flex items-center justify-center gap-2 rounded-sm shadow-sm"
              >
                <Brain size={12}/> DEEP INTELLIGENCE AUDIT
              </button>

              <button 
                onClick={handleCopyArenaPrompt} 
                className={`col-span-2 text-[9px] font-black p-2 transition-all uppercase flex items-center justify-center gap-2 border rounded-sm ${copiedPrompt ? 'bg-amber-500 text-black border-amber-500' : 'bg-black border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-black'}`}
              >
                {copiedPrompt ? <Check size={12}/> : <Copy size={12}/>}
                {copiedPrompt ? 'PROMPT COPIED!' : 'COPY ARENA / EXTERNAL PROMPT'}
              </button>

              <button onClick={() => handleSmartQuery("Detailed biography and public record")} className="text-[8px] font-black text-gray-400 border border-white/10 p-2 hover:border-cyan-400 hover:text-cyan-300 transition-all uppercase flex items-center gap-1.5 rounded-sm bg-black/40">
                <Target size={10} className="text-cyan-400" /> Get Bio
              </button>

              <button onClick={() => handleSmartQuery("Search for leaked emails and passwords")} className="text-[8px] font-black text-gray-400 border border-white/10 p-2 hover:border-rose-400 hover:text-rose-300 transition-all uppercase flex items-center gap-1.5 rounded-sm bg-black/40">
                <Zap size={10} className="text-rose-400" /> Leak Check
              </button>

              <button onClick={() => handleSmartQuery("Map social connections and associates")} className="text-[8px] font-black text-gray-400 border border-white/10 p-2 hover:border-blue-400 hover:text-blue-300 transition-all uppercase flex items-center gap-1.5 rounded-sm bg-black/40">
                <Cpu size={10} className="text-blue-400" /> Social Graph
              </button>

              <button onClick={() => handleSmartQuery("Extract physical locations and metadata")} className="text-[8px] font-black text-gray-400 border border-white/10 p-2 hover:border-indigo-400 hover:text-indigo-300 transition-all uppercase flex items-center gap-1.5 rounded-sm bg-black/40">
                <Camera size={10} className="text-indigo-400" /> Geo Scan
              </button>
            </div>

            {/* EXTERNAL SEARCH BUTTONS */}
            <div className="border-t border-white/10 pt-2.5 mt-1">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1.5 font-mono">Deep Web Recon</span>
              <button 
                onClick={() => handleDeepSearch()} 
                disabled={isSearching}
                className="w-full bg-purple-900/20 border border-purple-800/60 text-purple-400 hover:bg-purple-600 hover:text-white py-2 text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-2 rounded-sm"
              >
                <LayoutGrid size={11} /> Tavily Advanced Search
              </button>
              {!state.config.tavilyApiKey && (
                <div className="text-[7.5px] text-red-400 mt-1 italic text-center">* Configure Keys in Settings</div>
              )}
            </div>
          </div>

          <div className="p-2 border-t border-white/5 bg-black/60 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[7px] text-emerald-500 font-mono font-black tracking-widest">GEMINI_UPLINK_READY</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeQuery;
