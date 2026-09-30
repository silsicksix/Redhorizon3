import React, { useEffect, useRef, useState } from 'react';
import { GraphData, Node, Link, LayoutMode } from '../types';
import * as d3 from 'd3';
import { useGlobalStore } from '../store/GlobalStore';
import { resolveNodeBrandOrType, drawNodeIconOnCanvas } from '../utils/nodeIconResolver';
import { getLinkMetadataInfo } from '../utils/linkRelationshipFormatter';
import NodeHudTooltip from './NodeHudTooltip';

const getProxiedImageUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};

const extractImageUrl = (text?: string | null): string | null => {
    if (!text) return null;
    const cleanText = text.replace(/\\n/g, '\n');
    
    // 1. Direct explicit tags
    const match = cleanText.match(/(?:IMAGE_URL|URL Gambar Profil|Avatar_URL|Avatar|Gambar|avatar_url|Profile Picture|Image|Photo|URL Gambar|Attached Image \d+):\s*(https?:\/\/[^\s\n"'<>\\]+)/i)
        || cleanText.match(/(https?:\/\/[^\s\n"'<>\\]+\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?[^\s\n"'<>\\]*)?)/i)
        || cleanText.match(/(https?:\/\/[^\s\n"'<>\\]*(?:fbcdn|scontent|googleusercontent|twimg|discordapp|t\.me)[^\s\n"'<>\\]*)/i);
    if (match) return match[1] || match[0];

    // 2. Base64 embedded data URI
    const base64Match = cleanText.match(/(data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+)/i);
    if (base64Match) return base64Match[1];

    // 3. Facebook Profile URL converter to Graph API Avatar
    const fbMatch = cleanText.match(/facebook\.com\/(?:profile\.php\?id=(\d+)|([a-zA-Z0-9\._]+))/i);
    if (fbMatch) {
        const idOrUser = fbMatch[1] || fbMatch[2];
        if (idOrUser && !['pages', 'groups', 'watch', 'events', 'stories', 'reel', 'share'].includes(idOrUser.toLowerCase())) {
            return `https://graph.facebook.com/${idOrUser}/picture?type=large`;
        }
    }
    return null;
};

const getDisplayImageUrl = (node: any): string | null => {
    if (!node) return null;
    // 1. Direct imageUrl property
    if (node.imageUrl && typeof node.imageUrl === 'string' && node.imageUrl.trim()) {
        return node.imageUrl.trim();
    }
    // 2. imageUrls array
    if (Array.isArray(node.imageUrls) && node.imageUrls.length > 0) {
        const lastValid = [...node.imageUrls].reverse().find(u => typeof u === 'string' && u.trim());
        if (lastValid) return lastValid.trim();
    }
    // 3. Auto-extracted from details, label, or id
    const autoExtractedImage = extractImageUrl(node.details) || extractImageUrl(node.label) || extractImageUrl(node.id);
    if (autoExtractedImage) return autoExtractedImage;

    // 4. Numerical facebook id in label or id
    if ((node.type === 'person' || node.type === 'social' || !node.type) && node.label) {
        const cleanLabel = String(node.label).trim();
        if (/^\d{8,20}$/.test(cleanLabel)) {
            return `https://graph.facebook.com/${cleanLabel}/picture?type=large`;
        }
    }
    return null;
};

export function formatCategoryLabel(type: string): string {
  const t = String(type || '').toLowerCase().trim();
  switch (t) {
    case 'person': return 'INDIVIDU';
    case 'phone': return 'TELEFON';
    case 'location': return 'LOKASI';
    case 'organization':
    case 'company': return 'ORGANISASI';
    case 'domain': return 'DOMAIN';
    case 'crypto': return 'KRIPTO';
    case 'social':
    case 'social_media': return 'MEDIA SOSIAL';
    case 'vehicle': return 'KENDERAAN';
    case 'event': return 'ACARA';
    case 'document': return 'FAIL DOKUMEN';
    case 'classified_dossier': return 'DOSSIER SULIT';
    case 'fictional_character': return 'WATAK FIKSYEN';
    case 'fictional_object': return 'ARTIKFAK / OBJEK';
    case 'found_footage': return 'PITA RAKAMAN';
    case 'cryptid_myth': return 'KRIPTID / MITOS';
    case 'weapon_hardware': return 'SENJATA TAKTIKAL';
    case 'malware_payload': return 'MALWARE / EXPLOIT';
    case 'biometric_evidence': return 'BIOMETRIK / DNA';
    case 'surveillance_device': return 'PENDERIA PENGINTIP';
    case 'broadcast_frequency': return 'FREKUENSI ISYARAT';
    case 'financial_instrument': return 'KEWANGAN / KELDAI';
    case 'darkweb_forum': return 'FORUM DARKNET';
    case 'satellite_imagery': return 'IMEJ SATELIT';
    case 'deepfake_media': return 'TIRUAN DEEPFAKE';
    case 'chemical_hazard': return 'BAHAN HAZARD / CBRN';
    case 'quantum_cipher': return 'KUNCI KRIPTOGRAFI';
    case 'ai_model_weights': return 'MODEL AI / EJEN';
    case 'anomaly_portal': return 'ANOMALI PORTAL';
    case 'occult_symbol': return 'SIMBOL OKULTISME';
    case 'subsea_cable': return 'KABEL KAPAL SELAM';
    case 'black_budget_project': return 'PROJEK BLACK BUDGET';
    case 'evidence': return 'BUKTI / FAIL';
    default: return (type || 'ENTITI').toUpperCase();
  }
}

interface GraphViewCanvasProps {
  data: GraphData;
  highlightType: string | null;
  layoutMode: LayoutMode;
  selectedNodes: Node[];
  onNodeClick: (node: Node, position: { x: number, y: number }, isShift: boolean) => void;
  onNodeDoubleClick?: (node: Node, position: { x: number, y: number }) => void;
  onNodeRightClick?: (node: Node, position: { x: number, y: number }) => void;
  onBackgroundClick: () => void;
  onDeleteNode?: (nodeId: string) => void;
  groupByType?: boolean;
  nodeRenderMode?: 'classic' | 'schematic';
}

const GraphViewCanvas: React.FC<GraphViewCanvasProps> = ({ 
  data, 
  highlightType, 
  layoutMode, 
  selectedNodes, 
  onNodeClick, 
  onNodeDoubleClick, 
  onNodeRightClick, 
  onBackgroundClick,
  onDeleteNode,
  groupByType,
  nodeRenderMode
}) => {
  const { state } = useGlobalStore();
  const visualConfig = state.config.visual || { nodeSize: 22, linkDistance: 140, themeColor: '#ff0033', lowPowerMode: false };
  const isSchematic = layoutMode === 'schematic' || nodeRenderMode === 'schematic' || (visualConfig as any)?.nodeRenderMode === 'schematic';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>> | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const linksRef = useRef<Link[]>([]);
  const isDraggingRef = useRef(false);
  const lastClickTimeRef = useRef<{ time: number, id: string | null }>({ time: 0, id: null });
  const isHoveringTooltipRef = useRef(false);
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<{ node: Node; position: { x: number; y: number } } | null>(null);
  const selectedNodesRef = useRef<Node[]>(selectedNodes);
  const highlightTypeRef = useRef<string | null>(highlightType);
  const prevLayoutModeRef = useRef<LayoutMode>(layoutMode);

  useEffect(() => {
    if (!hoveredNodeInfo) return;
    const handleGlobalClick = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-hud-tooltip="true"]')) {
        return;
      }
      setHoveredNodeInfo(null);
    };
    window.addEventListener('pointerdown', handleGlobalClick, true);
    return () => {
      window.removeEventListener('pointerdown', handleGlobalClick, true);
    };
  }, [hoveredNodeInfo]);

  useEffect(() => {
    selectedNodesRef.current = selectedNodes;
    highlightTypeRef.current = highlightType;
    // Trigger a redraw if simulation is stopped
    if (simulationRef.current && simulationRef.current.alpha() < 0.01) {
        simulationRef.current.alpha(0.01).restart();
    }
  }, [selectedNodes, highlightType]);

  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Helper to get node color based on type, label, and platform brand
  const getNodeColor = (type?: string, label?: string, details?: string, url?: string, vaultMatch?: boolean) => {
    const meta = resolveNodeBrandOrType({ type, label, details, url, vaultMatch });
    return meta.brandColor;
  };

  // Trigger redraw when selection changes
  useEffect(() => {
      if (simulationRef.current) {
          simulationRef.current.alpha(0.01).restart();
      }
  }, [selectedNodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement!;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    
    // PERFORMANCE OPTIMIZATION: Handle Device Pixel Ratio (DPR)
    // High-DPI screens (4K/Retina) need scaling to look sharp, but we must be careful not to over-render.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d'); 
    if (!ctx) return;
    
    // Scale context to match DPR
    ctx.scale(dpr, dpr);

    // Preserve existing node physics state (x, y, vx, vy, fx, fy, __dragged)
    const existingNodes = new Map(nodesRef.current.map((n: any) => [n.id, n]));
    nodesRef.current = data.nodes.map((n: any) => {
      const existing = existingNodes.get(n.id);
      if (existing) {
        return { ...n, x: existing.x, y: existing.y, vx: existing.vx, vy: existing.vy, fx: existing.fx, fy: existing.fy, __dragged: existing.__dragged };
      }
      return { ...n };
    });

    // CRITICAL FIX: Ensure links use string IDs and only connect existing node IDs (with label fallback)
    const nodeIds = new Set(nodesRef.current.map((n: any) => n.id));
    const nodeLabelMap = new Map(nodesRef.current.map((n: any) => [n.label?.toLowerCase()?.trim(), n.id]));

    linksRef.current = (data.links || []).map((l: any) => {
      let s = typeof l.source === 'object' && l.source ? l.source.id : String(l.source);
      let t = typeof l.target === 'object' && l.target ? l.target.id : String(l.target);
      if (!nodeIds.has(s) && nodeLabelMap.has(s.toLowerCase().trim())) {
        s = nodeLabelMap.get(s.toLowerCase().trim())!;
      }
      if (!nodeIds.has(t) && nodeLabelMap.has(t.toLowerCase().trim())) {
        t = nodeLabelMap.get(t.toLowerCase().trim())!;
      }
      return {
        ...l,
        source: s,
        target: t
      };
    }).filter((l: any) => nodeIds.has(l.source) && nodeIds.has(l.target));

    // Calculate node degrees for centrality scaling
    const nodeDegrees = new Map<string, number>();
    linksRef.current.forEach((l: any) => {
        nodeDegrees.set(l.source, (nodeDegrees.get(l.source) || 0) + 1);
        nodeDegrees.set(l.target, (nodeDegrees.get(l.target) || 0) + 1);
    });

    const centerX = width / 2;
    const centerY = height / 2;
    const spacing = visualConfig.linkDistance * 1.2;

    const layoutChanged = prevLayoutModeRef.current !== layoutMode;
    if (layoutChanged) {
        nodesRef.current.forEach((n: any) => { n.__dragged = false; });
        prevLayoutModeRef.current = layoutMode;
    }

    // Apply layout only if layoutMode changed or new nodes added
    const applyLayout = () => {
      const focusNodes = highlightType ? nodesRef.current.filter((n: any) => n.type === highlightType) : [];
      const otherNodes = highlightType ? nodesRef.current.filter((n: any) => n.type !== highlightType) : nodesRef.current;

      const applyToGroup = (groupNodes: any[], groupCenterX: number, groupCenterY: number, groupWidth: number, groupHeight: number) => {
        if (groupNodes.length === 0) return;

        switch (layoutMode) {
          case 'grid': {
            const cols = Math.ceil(Math.sqrt(groupNodes.length));
            const cellWidth = Math.max(spacing, 150);
            const cellHeight = Math.max(spacing * 0.85, 120);
            const totalW = cols * cellWidth;
            const rows = Math.ceil(groupNodes.length / cols);
            const totalH = rows * cellHeight;
            const startX = groupCenterX - (totalW / 2) + (cellWidth / 2);
            const startY = groupCenterY - (totalH / 2) + (cellHeight / 2);

            groupNodes.forEach((n: any, i) => {
              if (!n.__dragged) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                n.fx = startX + (col * cellWidth);
                n.fy = startY + (row * cellHeight);
              }
            });
            break;
          }
          case 'circle': {
            const nodeCount = groupNodes.length;
            const arcSpacing = Math.max(105, (visualConfig.nodeSize || 22) * 4);
            if (nodeCount <= 24) {
              const radius = Math.max(180, (nodeCount * arcSpacing) / (2 * Math.PI));
              groupNodes.forEach((n: any, i) => {
                if (!n.__dragged) {
                  const angle = (i / nodeCount) * 2 * Math.PI - Math.PI / 2;
                  n.fx = groupCenterX + radius * Math.cos(angle);
                  n.fy = groupCenterY + radius * Math.sin(angle);
                }
              });
            } else {
              // Multi-orbit concentric rings for large node count to prevent overlapping
              const innerCount = Math.floor(nodeCount * 0.38);
              const outerCount = nodeCount - innerCount;
              const innerRadius = Math.max(180, (innerCount * arcSpacing) / (2 * Math.PI));
              const outerRadius = innerRadius + Math.max(160, arcSpacing * 1.4);

              groupNodes.forEach((n: any, i) => {
                if (!n.__dragged) {
                  if (i < innerCount) {
                    const angle = (i / innerCount) * 2 * Math.PI - Math.PI / 2;
                    n.fx = groupCenterX + innerRadius * Math.cos(angle);
                    n.fy = groupCenterY + innerRadius * Math.sin(angle);
                  } else {
                    const outerIdx = i - innerCount;
                    const angle = (outerIdx / outerCount) * 2 * Math.PI - Math.PI / 2;
                    n.fx = groupCenterX + outerRadius * Math.cos(angle);
                    n.fy = groupCenterY + outerRadius * Math.sin(angle);
                  }
                }
              });
            }
            break;
          }
          case 'cluster': {
            const typeMap = new Map<string, any[]>();
            groupNodes.forEach((n: any) => {
              const t = n.type || 'unknown';
              if (!typeMap.has(t)) typeMap.set(t, []);
              typeMap.get(t)!.push(n);
            });
            const types = Array.from(typeMap.keys());
            const clusterCount = types.length;

            // Determine overall cluster anchor radius
            const baseClusterRadius = Math.max(260, Math.min(groupWidth, groupHeight) * 0.42 + (clusterCount * 25));

            types.forEach((type, typeIdx) => {
              const typeNodes = typeMap.get(type) || [];
              let clusterX = groupCenterX;
              let clusterY = groupCenterY;
              if (clusterCount === 2) {
                const offset = Math.max(280, groupWidth * 0.28);
                clusterX = groupCenterX + (typeIdx === 0 ? -offset : offset);
              } else if (clusterCount > 2) {
                const angle = (typeIdx / clusterCount) * 2 * Math.PI - Math.PI / 2;
                clusterX = groupCenterX + baseClusterRadius * Math.cos(angle);
                clusterY = groupCenterY + baseClusterRadius * Math.sin(angle);
              }

              // Distribute nodes in this cluster with guaranteed anti-overlap Fermat/concentric packing
              typeNodes.forEach((n: any, i) => {
                if (!n.__dragged) {
                  if (typeNodes.length === 1) {
                    n.fx = clusterX;
                    n.fy = clusterY;
                  } else {
                    // Sunflower / Fermat Golden Spiral ensures minimum 90px distance between every node
                    const goldenAngle = 2.39996323; // ~137.5 degrees in radians
                    const nodeSpacing = Math.max(90, (visualConfig.nodeSize || 22) * 3.8);
                    const r = Math.sqrt(i + 1) * nodeSpacing;
                    const theta = i * goldenAngle;
                    n.fx = clusterX + r * Math.cos(theta);
                    n.fy = clusterY + r * Math.sin(theta);
                  }
                }
              });
            });
            break;
          }
          case 'schematic': {
            // FLOWSINT / MALTEGO SCHEMATIC PIPELINE LAYOUT
            // Group nodes into pipeline stages:
            // 0: POI / Target Individuals
            // 1: Direct Identifiers (Phone, Email, NRIC, Social)
            // 2: Entities & Footprints (Corporate, SSM, Vehicle, Location)
            // 3: Cyber Infra (Domain, IP, Server)
            // 4: Financial & Crypto (Crypto, Wallet, Bank)
            const getStageIndex = (node: any): number => {
              const t = (node.type || '').toLowerCase();
              const l = (node.label || '').toLowerCase();
              if (t === 'crypto' || t === 'wallet' || t === 'bank' || t.includes('crypto') || t.includes('kewangan') || l.includes('0x') || l.includes('btc') || l.includes('eth')) return 4;
              if (t === 'domain' || t === 'server' || t === 'ip' || t === 'network' || t === 'vulnerability' || t === 'repo') return 3;
              if (t === 'company' || t === 'organization' || t === 'vehicle' || t === 'location' || t === 'event' || t === 'evidence') return 2;
              if (t === 'phone' || t === 'email' || t === 'document' || t === 'nric' || t === 'id' || t === 'social' || t === 'username') return 1;
              if (t === 'person' || t === 'suspect' || t === 'target' || t === 'user' || t === 'individual') return 0;
              return 1;
            };

            const stages: any[][] = [[], [], [], [], []];
            groupNodes.forEach((node: any) => {
              const idx = Math.min(getStageIndex(node), 4);
              stages[idx].push(node);
            });

            const activeStages = stages.map((nodes, idx) => ({ nodes, idx })).filter(s => s.nodes.length > 0);
            const colSpacing = 280;
            const totalWidth = Math.max((activeStages.length - 1) * colSpacing, 0);
            const startX = groupCenterX - totalWidth / 2;

            activeStages.forEach((stageItem, colIdx) => {
              const colX = startX + colIdx * colSpacing;
              const count = stageItem.nodes.length;
              const rowSpacing = 80;
              const totalColH = (count - 1) * rowSpacing;
              const startY = groupCenterY - totalColH / 2;

              stageItem.nodes.forEach((node: any, rowIdx: number) => {
                if (!node.__dragged) {
                  node.fx = colX;
                  node.fy = startY + rowIdx * rowSpacing;
                  node.x = node.fx;
                  node.y = node.fy;
                }
              });
            });
            break;
          }
          case 'orthogonal':
          case 'orthogonal_vertical':
          case 'hierarchy': {
            const incomingCounts = new Map<string, number>();
            const outgoingAdj = new Map<string, string[]>();
            const undirectedAdj = new Map<string, string[]>();

            groupNodes.forEach(n => {
              incomingCounts.set(n.id, 0);
              outgoingAdj.set(n.id, []);
              undirectedAdj.set(n.id, []);
            });

            linksRef.current.forEach(l => {
              const src = typeof l.source === 'object' ? l.source.id : l.source;
              const tgt = typeof l.target === 'object' ? l.target.id : l.target;
              if (undirectedAdj.has(src) && undirectedAdj.has(tgt)) {
                outgoingAdj.get(src)!.push(tgt);
                incomingCounts.set(tgt, (incomingCounts.get(tgt) || 0) + 1);
                undirectedAdj.get(src)!.push(tgt);
                undirectedAdj.get(tgt)!.push(src);
              }
            });

            // Partition into connected graph clusters so disconnected sub-trees don't collide
            const visited = new Set<string>();
            const components: any[][] = [];

            groupNodes.forEach(node => {
              if (!visited.has(node.id)) {
                const compNodes: any[] = [];
                const q = [node.id];
                visited.add(node.id);
                while (q.length > 0) {
                  const currId = q.shift()!;
                  const nObj = groupNodes.find(n => n.id === currId);
                  if (nObj) compNodes.push(nObj);
                  (undirectedAdj.get(currId) || []).forEach(nbr => {
                    if (!visited.has(nbr)) {
                      visited.add(nbr);
                      q.push(nbr);
                    }
                  });
                }
                components.push(compNodes);
              }
            });

            const vSpacing = layoutMode === 'orthogonal' ? Math.max(spacing * 1.35, 180) : Math.max(spacing, 150);
            const hSpacing = layoutMode === 'orthogonal' ? Math.max(spacing * 1.45, 190) : Math.max(spacing * 1.25, 175);

            // Compute total horizontal span of all components to center them together
            let totalComponentsWidth = 0;
            const compWidths: number[] = [];

            components.forEach((compNodes) => {
              // In this component, find roots (nodes with 0 in-degree, or node with highest total connections)
              let roots = compNodes.filter(n => (incomingCounts.get(n.id) || 0) === 0);
              if (roots.length === 0) {
                let bestNode = compNodes[0];
                let maxDeg = -1;
                compNodes.forEach(n => {
                  const deg = (outgoingAdj.get(n.id)?.length || 0) + (incomingCounts.get(n.id) || 0);
                  if (deg > maxDeg) { maxDeg = deg; bestNode = n; }
                });
                roots = [bestNode];
              }

              // Assign levels via BFS starting from roots
              const levels = new Map<string, number>();
              const q: { id: string; level: number }[] = [];
              const compVisited = new Set<string>();

              roots.forEach(r => {
                levels.set(r.id, 0);
                q.push({ id: r.id, level: 0 });
                compVisited.add(r.id);
              });

              while (q.length > 0) {
                const { id, level } = q.shift()!;
                const children = outgoingAdj.get(id) || [];
                children.forEach(chId => {
                  if (!compVisited.has(chId)) {
                    compVisited.add(chId);
                    levels.set(chId, level + 1);
                    q.push({ id: chId, level: level + 1 });
                  }
                });
                (undirectedAdj.get(id) || []).forEach(nbrId => {
                  if (!compVisited.has(nbrId)) {
                    compVisited.add(nbrId);
                    levels.set(nbrId, level + 1);
                    q.push({ id: nbrId, level: level + 1 });
                  }
                });
              }

              let maxLvl = 0;
              levels.forEach(l => { if (l > maxLvl) maxLvl = l; });
              compNodes.forEach(n => {
                if (!levels.has(n.id)) levels.set(n.id, maxLvl + 1);
              });

              // Group nodes by level
              const levelGroups = new Map<number, any[]>();
              compNodes.forEach(n => {
                const lvl = levels.get(n.id)!;
                if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
                levelGroups.get(lvl)!.push(n);
              });

              let maxRowLen = 1;
              levelGroups.forEach(nodesInLevel => {
                if (nodesInLevel.length > maxRowLen) maxRowLen = nodesInLevel.length;
              });
              const compMaxLvl = Math.max(...Array.from(levelGroups.keys()), 0);
              const cWidth = layoutMode === 'orthogonal_vertical' ? (compMaxLvl + 1) * hSpacing : maxRowLen * hSpacing;
              compWidths.push(cWidth);
              totalComponentsWidth += cWidth + 120;
            });

            let currentCompStartX = groupCenterX - (totalComponentsWidth / 2);

            components.forEach((compNodes, compIdx) => {
              const cWidth = compWidths[compIdx];
              const compCenterX = currentCompStartX + (cWidth / 2);

              let roots = compNodes.filter(n => (incomingCounts.get(n.id) || 0) === 0);
              if (roots.length === 0) {
                let bestNode = compNodes[0];
                let maxDeg = -1;
                compNodes.forEach(n => {
                  const deg = (outgoingAdj.get(n.id)?.length || 0) + (incomingCounts.get(n.id) || 0);
                  if (deg > maxDeg) { maxDeg = deg; bestNode = n; }
                });
                roots = [bestNode];
              }

              const levels = new Map<string, number>();
              const q: { id: string; level: number }[] = [];
              const compVisited = new Set<string>();

              roots.forEach(r => {
                levels.set(r.id, 0);
                q.push({ id: r.id, level: 0 });
                compVisited.add(r.id);
              });

              while (q.length > 0) {
                const { id, level } = q.shift()!;
                const children = outgoingAdj.get(id) || [];
                children.forEach(chId => {
                  if (!compVisited.has(chId)) {
                    compVisited.add(chId);
                    levels.set(chId, level + 1);
                    q.push({ id: chId, level: level + 1 });
                  }
                });
                (undirectedAdj.get(id) || []).forEach(nbrId => {
                  if (!compVisited.has(nbrId)) {
                    compVisited.add(nbrId);
                    levels.set(nbrId, level + 1);
                    q.push({ id: nbrId, level: level + 1 });
                  }
                });
              }

              let maxLvl = 0;
              levels.forEach(l => { if (l > maxLvl) maxLvl = l; });
              compNodes.forEach(n => {
                if (!levels.has(n.id)) levels.set(n.id, maxLvl + 1);
              });

              const levelGroups = new Map<number, any[]>();
              compNodes.forEach(n => {
                const lvl = levels.get(n.id)!;
                if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
                levelGroups.get(lvl)!.push(n);
              });

              if (layoutMode === 'orthogonal_vertical') {
                const compMaxLvl = Math.max(...Array.from(levelGroups.keys()), 0);
                const totalWidth = compMaxLvl * hSpacing;
                const startX = compCenterX - (totalWidth / 2);

                levelGroups.forEach((nodesInLevel, lvl) => {
                  const levelHeight = nodesInLevel.length * vSpacing;
                  const startY = groupCenterY - (levelHeight / 2) + (vSpacing / 2);
                  const x = startX + (lvl * hSpacing);
                  nodesInLevel.forEach((n, i) => {
                    if (!n.__dragged) {
                      n.fx = x;
                      n.fy = startY + (i * vSpacing);
                    }
                  });
                });
              } else {
                const compMaxLvl = Math.max(...Array.from(levelGroups.keys()), 0);
                const totalHeight = compMaxLvl * vSpacing;
                const startY = groupCenterY - (totalHeight / 2);

                levelGroups.forEach((nodesInLevel, lvl) => {
                  const levelWidth = nodesInLevel.length * hSpacing;
                  const startX = compCenterX - (levelWidth / 2) + (hSpacing / 2);
                  const y = startY + (lvl * vSpacing);
                  nodesInLevel.forEach((n, i) => {
                    if (!n.__dragged) {
                      n.fx = startX + (i * hSpacing);
                      n.fy = y;
                    }
                  });
                });
              }

              currentCompStartX += cWidth + 120;
            });
            break;
          }
          default: // 'force' (Susunan Organik)
            groupNodes.forEach((n: any, i: number) => { 
                if (!n.__dragged) { 
                    n.fx = null;
                    n.fy = null;
                    // If node has no coordinates or is stacked on another node / center
                    const isUnsetOrStacked = n.x === undefined || n.y === undefined || isNaN(n.x) || isNaN(n.y) || 
                        (Math.abs(n.x - groupCenterX) < 2 && Math.abs(n.y - groupCenterY) < 2);
                    if (isUnsetOrStacked) {
                        const angle = (i / Math.max(1, groupNodes.length)) * 2 * Math.PI;
                        const r = 60 + Math.sqrt(i) * 45;
                        n.x = groupCenterX + r * Math.cos(angle) + (Math.random() - 0.5) * 30;
                        n.y = groupCenterY + r * Math.sin(angle) + (Math.random() - 0.5) * 30;
                    }
                }
            });
        }
      };

      if (highlightType) {
        // Divide canvas into two distinct islands with more separation
        // Focus Island (Left 35%) | Buffer (10%) | Main Island (Right 55%)
        const focusWidth = width * 0.35;
        const otherWidth = width * 0.55;
        const focusCenterX = focusWidth / 2;
        const otherCenterX = width - (otherWidth / 2);
        applyToGroup(focusNodes, focusCenterX, centerY, focusWidth, height);
        applyToGroup(otherNodes, otherCenterX, centerY, otherWidth, height);
      } else {
        applyToGroup(nodesRef.current, centerX, centerY, width, height);
      }
    };

    applyLayout();

    const draw = (transform: d3.ZoomTransform) => {
      // PERFORMANCE: Clear canvas efficiently - use clearRect to keep it transparent for background image
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      // PERFORMANCE OPTIMIZATION: Viewport Bounding Box Culling (World Coordinates)
      // Elements that do not intersect this bounding box are skipped from drawing
      const viewMargin = 120 / Math.max(transform.k, 0.05);
      const vLeft = -transform.x / transform.k - viewMargin;
      const vRight = (width - transform.x) / transform.k + viewMargin;
      const vTop = -transform.y / transform.k - viewMargin;
      const vBottom = (height - transform.y) / transform.k + viewMargin;

      // PERFORMANCE: Level of Detail (LOD) & Busy State
      const totalNodes = nodesRef.current.length;
      const isMacroLOD = transform.k < 0.35 || (totalNodes > 45 && transform.k < 0.52);
      const isBusy = totalNodes > 80 || transform.k < 0.4 || (simulationRef.current && simulationRef.current.alpha() > 0.3);

      // Draw links
      linksRef.current.forEach((link: any) => {
        const sx = link.source.x || 0;
        const sy = link.source.y || 0;
        const tx = link.target.x || 0;
        const ty = link.target.y || 0;

        // Viewport Culling: If both ends are on one side outside visible screen, skip entirely
        if ((sx < vLeft && tx < vLeft) ||
            (sx > vRight && tx > vRight) ||
            (sy < vTop && ty < vTop) ||
            (sy > vBottom && ty > vBottom)) {
          return;
        }

        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const isSelected = selectedNodesRef.current.some(sn => sn.id === sourceId || sn.id === targetId);

        ctx.beginPath();
        
        // PERFORMANCE: Use straight/orthogonal lines if requested or busy
        if (layoutMode === 'schematic') {
            // Flowsint Schematic Stepped / S-Curve Bezier Pipeline Connector
            const cardHalfW = 83;
            const startX = tx >= sx ? sx + cardHalfW : sx - cardHalfW;
            const endX = tx >= sx ? tx - cardHalfW : tx + cardHalfW;
            const midX = (startX + endX) / 2;

            ctx.moveTo(startX, sy);
            ctx.bezierCurveTo(midX, sy, midX, ty, endX, ty);
        } else if (layoutMode === 'orthogonal_vertical') {
            // Maltego orthogonal vertical stepped right-angle connector
            const midX = sx + (tx - sx) * 0.5;

            ctx.moveTo(sx, sy);
            ctx.lineTo(midX, sy);
            ctx.lineTo(midX, ty);
            ctx.lineTo(tx, ty);
        } else if (layoutMode === 'orthogonal') {
            // Maltego orthogonal horizontal stepped right-angle connector
            const midY = sy + (ty - sy) * 0.5;

            ctx.moveTo(sx, sy);
            ctx.lineTo(sx, midY);
            ctx.lineTo(tx, midY);
            ctx.lineTo(tx, ty);
        } else if (layoutMode === 'hierarchy' || (isBusy && !isSelected)) {
            // Crisp straight lines for hierarchy
            ctx.moveTo(sx, sy);
            ctx.lineTo(tx, ty);
        } else {
            const dx = tx - sx;
            const dy = ty - sy;
            const midX = (sx + tx) / 2;
            const midY = (sy + ty) / 2;
            const curvature = 0.2;
            const cpX = midX - dy * curvature;
            const cpY = midY + dx * curvature;
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(cpX, cpY, tx, ty);
        }
        
        if (isSelected && !visualConfig.lowPowerMode) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 / transform.k;
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 5;
        } else if (isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 / transform.k;
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        } else {
            const sourceColor = getNodeColor(link.source.type, link.source.label, link.source.details, link.source.url, link.source.vaultMatch);
            ctx.strokeStyle = `${sourceColor}44`; 
            ctx.lineWidth = 1 / transform.k;
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
        
        ctx.stroke();
      });

      // Render intelligent Maltego-style metadata labels on top of lines describing parent-to-child entity types and relation
      if ((!isMacroLOD || selectedNodesRef.current.length > 0) && (transform.k >= 0.28 || selectedNodesRef.current.length > 0)) {
        linksRef.current.forEach((link: any) => {
          const sourceNode = typeof link.source === 'object' ? link.source : nodesRef.current.find(n => n.id === link.source);
          const targetNode = typeof link.target === 'object' ? link.target : nodesRef.current.find(n => n.id === link.target);
          if (!sourceNode || !targetNode) return;

          const sourceId = sourceNode.id;
          const targetId = targetNode.id;
          const isSelected = selectedNodesRef.current.some(sn => sn.id === sourceId || sn.id === targetId);

          if (!isSelected && isMacroLOD) return;

          const sx = sourceNode.x || 0;
          const sy = sourceNode.y || 0;
          const tx = targetNode.x || 0;
          const ty = targetNode.y || 0;

          // Viewport culling for link labels
          let midX = (sx + tx) / 2;
          let midY = (sy + ty) / 2;

          if (layoutMode === 'orthogonal') {
            midY = sy + (ty - sy) * 0.5;
          } else if (layoutMode === 'orthogonal_vertical') {
            midX = sx + (tx - sx) * 0.5;
          }

          if (midX < vLeft || midX > vRight || midY < vTop || midY > vBottom) {
            return;
          }

          // Generate Maltego-style formatted metadata label: e.g. "HUBUNGAN • [INDIVIDU ➔ TELEFON]"
          const metaInfo = getLinkMetadataInfo(link, nodesRef.current);
          const edgeText = metaInfo.edgeText;

          // Compute screen-stabilized font size (9px equivalent on screen) so text doesn't shrink into unreadable specks when zoomed out
          const screenEdgeFontSize = 9;
          const worldEdgeFontSize = screenEdgeFontSize / Math.max(transform.k, 0.05);

          ctx.save();
          ctx.font = `600 ${worldEdgeFontSize}px "JetBrains Mono", monospace, -apple-system, sans-serif`;
          const textWidth = ctx.measureText(edgeText).width;
          const padX = 5 / Math.max(transform.k, 0.05);
          const padY = 2.5 / Math.max(transform.k, 0.05);
          const rectWidth = textWidth + padX * 2;
          const rectHeight = worldEdgeFontSize + padY * 2;
          const rectX = midX - rectWidth / 2;
          const rectY = midY - rectHeight / 2;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 5;

          ctx.fillStyle = isSelected ? 'rgba(5, 20, 35, 0.96)' : 'rgba(9, 11, 17, 0.92)';
          ctx.strokeStyle = isSelected ? '#00f0ff' : `${metaInfo.badgeColor}cc`;
          ctx.lineWidth = Math.max(0.8 / transform.k, 0.6);

          ctx.beginPath();
          const cornerRadius = 3.5 / Math.max(transform.k, 0.05);
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(rectX, rectY, rectWidth, rectHeight, cornerRadius);
          } else {
            ctx.rect(rectX, rectY, rectWidth, rectHeight);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isSelected ? '#00f0ff' : '#e2e8f0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(edgeText, midX, midY);
          ctx.restore();
        });
      }
      
      // Reset shadow for nodes
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw nodes
      nodesRef.current.forEach((node: any) => {
        const nx = node.x || 0;
        const ny = node.y || 0;
        const isSelected = selectedNodesRef.current.some(sn => sn.id === node.id);

        // Viewport Culling: Skip drawing if node is off-screen
        if (!isSelected && (nx < vLeft || nx > vRight || ny < vTop || ny > vBottom)) {
          return;
        }
        // Calculate dynamic radius based on centrality
        const degree = nodeDegrees.get(node.id) || 0;
        const scaleFactor = Math.min(2, 1 + (degree * 0.15));
        const dynamicRadius = visualConfig.nodeSize * scaleFactor;

        // Node color based on specific brand/type
        const nodeColor = getNodeColor(node.type, node.label, node.details, node.url, node.vaultMatch);
        ctx.fillStyle = nodeColor;

        // --- FLOWSINT SCHEMATIC TECH CARD RENDERING ---
        if (isSchematic) {
          const cardW = 166;
          const cardH = 54;
          const cardX = (node.x || 0) - cardW / 2;
          const cardY = (node.y || 0) - cardH / 2;
          const r = 6;

          ctx.save();
          if (isSelected) {
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 12;
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = Math.max(2 / transform.k, 1.5);
          } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 6;
            ctx.strokeStyle = nodeColor;
            ctx.lineWidth = Math.max(1.2 / transform.k, 0.9);
          }

          // Card Body: Solid tech card container
          ctx.fillStyle = isSelected ? '#121d2c' : '#0c121d';
          ctx.beginPath();
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(cardX, cardY, cardW, cardH, r);
          } else {
            ctx.rect(cardX, cardY, cardW, cardH);
          }
          ctx.fill();
          ctx.stroke();

          // Top Badge Strip with Entity Type
          const typeLabel = formatCategoryLabel(node.type);
          ctx.fillStyle = `${nodeColor}30`;
          ctx.beginPath();
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(cardX + 1, cardY + 1, cardW - 2, 14, [r - 1, r - 1, 0, 0]);
          } else {
            ctx.rect(cardX + 1, cardY + 1, cardW - 2, 14);
          }
          ctx.fill();

          // Type Badge Text
          ctx.fillStyle = nodeColor;
          ctx.font = '700 8.5px "JetBrains Mono", monospace, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`[${typeLabel}]`, cardX + 7, cardY + 8);

          // Left Port & Right Port Pins (Signature Flowsint Blueprint Ports)
          ctx.fillStyle = isSelected ? '#00f0ff' : nodeColor;
          ctx.beginPath();
          ctx.arc(cardX, node.y || 0, 3.5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cardX + cardW, node.y || 0, 3.5, 0, 2 * Math.PI);
          ctx.fill();

          // Icon or Avatar
          const iconR = 12;
          const iconCenterX = cardX + 18;
          const iconCenterY = cardY + 33;

          ctx.fillStyle = `${nodeColor}22`;
          ctx.strokeStyle = `${nodeColor}88`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(iconCenterX, iconCenterY, iconR, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          const imgUrl = getDisplayImageUrl(node);
          let imgDrawn = false;
          if (imgUrl) {
            const img = imageCache.current.get(imgUrl);
            if (img && img.complete && img.naturalWidth > 0) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(iconCenterX, iconCenterY, iconR - 1, 0, 2 * Math.PI);
              ctx.clip();
              ctx.drawImage(img, iconCenterX - iconR, iconCenterY - iconR, iconR * 2, iconR * 2);
              ctx.restore();
              imgDrawn = true;
            }
          }
          if (!imgDrawn) {
            drawNodeIconOnCanvas(ctx, node, iconCenterX, iconCenterY, iconR, transform.k, isSelected, false);
          }

          // Primary Label (Bold, crisp, truncated)
          ctx.fillStyle = isSelected ? '#ffffff' : '#e2e8f0';
          ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const fullLabel = node.label || node.id || '?';
          let displayLabel = fullLabel;
          const maxTextW = 118;
          if (ctx.measureText(displayLabel).width > maxTextW) {
            while (displayLabel.length > 3 && ctx.measureText(displayLabel + '...').width > maxTextW) {
              displayLabel = displayLabel.slice(0, -1);
            }
            displayLabel += '...';
          }
          ctx.fillText(displayLabel, cardX + 36, cardY + 28);

          // Secondary Subtitle / Details
          ctx.fillStyle = '#94a3b8';
          ctx.font = '500 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          let subText = node.details || node.type || '';
          if (subText.length > 22) subText = subText.substring(0, 20) + '...';
          ctx.fillText(subText, cardX + 36, cardY + 42);

          // Focus indicator for selected card
          if (isSelected) {
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cardX - 2, cardY - 2, cardW + 4, cardH + 4);
          }

          ctx.restore();
          return;
        }

        // --- LEVEL OF DETAIL (LOD) MACRO DOT-MATRIX MODE (MALTEGO / I2 STYLE) ---
        // Ultra-fast rendering when zoomed out or dense: skip image fetch, clip paths & text measure
        if (isMacroLOD && !isSelected) {
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, Math.max(dynamicRadius * 0.75, 7), 0, 2 * Math.PI);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Compact label only when reasonably visible
          if (transform.k >= 0.22) {
            const screenFontSize = 10;
            const worldFontSize = screenFontSize / Math.max(transform.k, 0.05);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = `600 ${worldFontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(node.label || node.id || '?', node.x || 0, (node.y || 0) + dynamicRadius + (worldFontSize * 0.8));
          }
          return;
        }

        // PERFORMANCE: Skip complex shadows if busy or in low power mode
        if (isSelected && !visualConfig.lowPowerMode) {
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3 / transform.k;
        } else if (isSelected) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3 / transform.k;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1 / transform.k;
        }

        ctx.beginPath();
        ctx.arc(node.x || 0, node.y || 0, dynamicRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Render images or vector icons on nodes
        let renderedImage = false;
        if (transform.k >= 0.2 || isSelected) {
            const imgUrl = getDisplayImageUrl(node);
            if (imgUrl) {
              const img = imageCache.current.get(imgUrl);
              if (img && img.complete && img.naturalWidth > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x || 0, node.y || 0, dynamicRadius - 2, 0, 2 * Math.PI);
                ctx.clip();
                
                const imgRatio = img.naturalWidth / img.naturalHeight;
                let drawWidth = dynamicRadius * 2;
                let drawHeight = dynamicRadius * 2;
                let offsetX = 0;
                let offsetY = 0;

                if (imgRatio > 1) {
                  drawWidth = drawHeight * imgRatio;
                  offsetX = (drawWidth - dynamicRadius * 2) / 2;
                } else {
                  drawHeight = drawWidth / imgRatio;
                  offsetY = (drawHeight - dynamicRadius * 2) / 2;
                }

                ctx.drawImage(img, (node.x || 0) - dynamicRadius - offsetX, (node.y || 0) - dynamicRadius - offsetY, drawWidth, drawHeight);
                ctx.restore();
                renderedImage = true;
                
                // Draw corner brand/phone badge over the avatar
                drawNodeIconOnCanvas(ctx, node, node.x || 0, node.y || 0, dynamicRadius, transform.k, isSelected, true);
              } else if (!img) {
                const newImg = new Image();
                const proxiedUrl = getProxiedImageUrl(imgUrl);
                newImg.src = proxiedUrl || imgUrl;
                newImg.onload = () => simulationRef.current?.alpha(0.05).restart();
                newImg.onerror = () => {
                   // Fallback: If proxy failed, attempt direct URL without crossOrigin restrictions
                   if (!imgUrl.startsWith('data:') && newImg.src !== imgUrl) {
                     const directImg = new Image();
                     directImg.src = imgUrl;
                     directImg.onload = () => {
                       imageCache.current.set(imgUrl, directImg);
                       simulationRef.current?.alpha(0.05).restart();
                     };
                   }
                };
                imageCache.current.set(imgUrl, newImg);
              }
            }
        }

        // When no photo image is rendered, draw the high-contrast crisp vector icon centered inside the node
        if (!renderedImage) {
          drawNodeIconOnCanvas(ctx, node, node.x || 0, node.y || 0, dynamicRadius, transform.k, isSelected, false);
        }

        // Draw Target Reticle & Beacon Rings for Selected/Focused Node
        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2.5 / transform.k;
          
          // Outer beacon ring
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, dynamicRadius + (9 / transform.k), 0, 2 * Math.PI);
          ctx.stroke();

          // Target crosshairs
          const tickDist = dynamicRadius + (15 / transform.k);
          const tickLen = 6 / transform.k;
          ctx.beginPath();
          ctx.moveTo(node.x || 0, (node.y || 0) - tickDist);
          ctx.lineTo(node.x || 0, (node.y || 0) - tickDist + tickLen);
          ctx.moveTo(node.x || 0, (node.y || 0) + tickDist);
          ctx.lineTo(node.x || 0, (node.y || 0) + tickDist - tickLen);
          ctx.moveTo((node.x || 0) - tickDist, node.y || 0);
          ctx.lineTo((node.x || 0) - tickDist + tickLen, node.y || 0);
          ctx.moveTo((node.x || 0) + tickDist, node.y || 0);
          ctx.lineTo((node.x || 0) + tickDist - tickLen, node.y || 0);
          ctx.stroke();
          ctx.restore();
        }

        // Node label - draw with dark background pill for high legibility at all zoom levels (Maltego Style)
        const labelText = node.label || node.id || '?';
        // World font size calculated so it always renders crisp and readable on screen (11px equivalent)
        const screenFontSize = 11;
        const worldFontSize = screenFontSize / Math.max(transform.k, 0.05);
        
        ctx.save();
        ctx.font = `600 ${worldFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const textWidth = ctx.measureText(labelText).width;
        const padX = 6 / Math.max(transform.k, 0.05);
        const padY = 3 / Math.max(transform.k, 0.05);
        const rectWidth = textWidth + padX * 2;
        const rectHeight = worldFontSize + padY * 2;
        const rectX = (node.x || 0) - rectWidth / 2;
        const rectY = (node.y || 0) + dynamicRadius + (5 / Math.max(transform.k, 0.05));

        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 6;

        // Draw crisp dark pill container
        ctx.fillStyle = isSelected ? 'rgba(8, 20, 30, 0.95)' : 'rgba(10, 10, 18, 0.92)';
        ctx.strokeStyle = isSelected ? '#00f0ff' : (node.vaultMatch ? '#f59e0b' : 'rgba(255, 255, 255, 0.28)');
        ctx.lineWidth = Math.max(1 / transform.k, 0.75);

        ctx.beginPath();
        const pillRadius = 4 / Math.max(transform.k, 0.05);
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(rectX, rectY, rectWidth, rectHeight, pillRadius);
        } else {
          ctx.rect(rectX, rectY, rectWidth, rectHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Render label text centered in pill
        ctx.fillStyle = isSelected ? '#00f0ff' : (node.vaultMatch ? '#fbbf24' : '#ffffff');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, node.x || 0, rectY + rectHeight / 2);
        ctx.restore();
      });
      ctx.restore();
    };

    // Precompute centers for node types if grouping
    const uniqueTypes = Array.from(new Set(nodesRef.current.map(n => (n as any).type || 'unknown')));
    const cols = Math.ceil(Math.sqrt(uniqueTypes.length));
    const typeCenters = new Map<string, {x: number, y: number}>();
    uniqueTypes.forEach((type, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        typeCenters.set(type, {
            x: width * 0.2 + (col * (width * 0.6 / Math.max(1, cols - 1 || 1))),
            y: height * 0.2 + (row * (height * 0.6 / Math.max(1, cols - 1 || 1)))
        });
    });

    // D3 Simulation with high-precision anti-overlap physics optimized for large graphs
    const totalNodesCount = nodesRef.current.length;
    const isDenseGraph = totalNodesCount > 40;
    const isHugeGraph = totalNodesCount > 90;

    const simulation = d3.forceSimulation(nodesRef.current as d3.SimulationNodeDatum[])
      .alphaDecay(isHugeGraph ? 0.08 : (isDenseGraph ? 0.06 : 0.038)) // Fast settling for dense graphs
      .alphaMin(0.018) // Freeze early when positions settle
      .velocityDecay(0.4) // High damping prevents wild oscillations
      .force('link', d3.forceLink(linksRef.current as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[])
        .id((d: any) => d.id)
        .distance(groupByType ? visualConfig.linkDistance * 0.8 : visualConfig.linkDistance * 1.25)
        .strength(0.45)
        .iterations(isDenseGraph ? 1 : 2))
      .force('charge', d3.forceManyBody()
        .strength(isHugeGraph ? -350 : (isDenseGraph ? -600 : -1000))
        .distanceMin(35)
        .distanceMax(isHugeGraph ? 600 : (isDenseGraph ? 1000 : 2000))) // Limit Barnes-Hut distance cutoff!
      .force('center', groupByType ? null : d3.forceCenter(centerX, centerY).strength(0.04))
      .force("x", d3.forceX().x((d: any) => {
          if (groupByType) {
              const tc = typeCenters.get(d.type || 'unknown');
              return tc ? tc.x : centerX;
          }
          if (!highlightType) return centerX;
          const focusCenterX = (width * 0.35) / 2;
          const otherCenterX = width - (width * 0.55 / 2);
          return d.type === highlightType ? focusCenterX : otherCenterX;
      }).strength(groupByType ? 0.6 : (highlightType ? 0.3 : 0.015)))
      .force("y", d3.forceY().y((d: any) => {
          if (groupByType) {
              const tc = typeCenters.get(d.type || 'unknown');
              return tc ? tc.y : centerY;
          }
          return centerY;
      }).strength(groupByType ? 0.6 : (highlightType ? 0.2 : 0.015)))
      .force('collide', d3.forceCollide<any>().radius((d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(1.8, 1 + (degree * 0.12));
          const nodeRadius = (visualConfig.nodeSize || 22) * scaleFactor;
          const labelLength = (d.label || '').length;
          const labelBuffer = isDenseGraph ? Math.min(labelLength * 2, 35) : Math.min(labelLength * 3.8, 60);
          const degreeBuffer = isDenseGraph ? Math.min(degree * 2.5, 20) : Math.min(degree * 5, 35);
          return Math.max(nodeRadius + 18, 36) + labelBuffer + degreeBuffer;
      }).strength(0.9).iterations(isDenseGraph ? 1 : 2));

    simulationRef.current = simulation;
    simulation.alpha(1).restart();

    // Zoom behavior
    const zoom = d3.zoom<HTMLCanvasElement, any>()
      .scaleExtent([0.1, 5])
      .filter((event) => {
        // Multi-touch gestures (e.g., 2+ finger pinch zoom) should always be handled by zoom
        if (event.touches && event.touches.length > 1) return true;
        // Wheel events should zoom
        if (event.type === 'wheel') return true;
        // Right clicks or non-primary mouse buttons pan
        if (event.type === 'mousedown' && event.button !== 0) return true;

        // Check if 1-finger touch or primary click lands on or near a node
        let clientX = event.clientX;
        let clientY = event.clientY;
        if (event.touches && event.touches.length > 0) {
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
        }

        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const transform = transformRef.current;
          const x = transform.invertX(clientX - rect.left);
          const y = transform.invertY(clientY - rect.top);
          const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
          const hitRadius = Math.max(visualConfig.nodeSize * (isTouchDevice ? 3.5 : 2.5), isTouchDevice ? 55 : 42) / transform.k;
          const targetNode = simulation.find(x, y, hitRadius);
          
          // If touching/clicking a node directly, disable zoom pan so d3.drag drags the individual node
          if (targetNode) {
            return false;
          }
        }
        return !event.ctrlKey;
      })
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        draw(event.transform);
      });

    // ResizeObserver and Fullscreen listener to keep canvas perfectly sized
    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (w === 0 || h === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      if (simulation) {
        simulation.force('center', d3.forceCenter(w / 2, h / 2));
        simulation.alpha(0.2).restart();
      }
      draw(transformRef.current);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(parent);

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    // Drag behavior
    const drag = d3.drag<HTMLCanvasElement, any>()
      .filter((event) => !event.ctrlKey)
      .subject((event) => {
        const transform = transformRef.current;
        let eventX = event.x;
        let eventY = event.y;
        
        if (event.sourceEvent && event.sourceEvent.touches && event.sourceEvent.touches.length > 0) {
          const rect = canvas.getBoundingClientRect();
          const touch = event.sourceEvent.touches[0];
          eventX = touch.clientX - rect.left;
          eventY = touch.clientY - rect.top;
        }

        const x = transform.invertX(eventX);
        const y = transform.invertY(eventY);
        
        // Increase hit radius for touch devices ("fat finger" friendly)
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (event.sourceEvent && event.sourceEvent.touches);
        const hitRadius = Math.max(visualConfig.nodeSize * (isTouchDevice ? 3.5 : 2.5), isTouchDevice ? 55 : 42) / transform.k;
        const node = simulation.find(x, y, hitRadius);
        if (node) {
          return {
            node: node,
            x: transform.applyX(node.x || 0),
            y: transform.applyY(node.y || 0)
          };
        }
        return null;
      })
      .on('start', (event) => {
        setHoveredNodeInfo(null);
        if (!event.active) simulation.alphaTarget(0.3).restart();
        
        const node = event.subject.node;
        const nodeType = (node.type || '').toLowerCase();
        const nodeBrand = (node.brand || '').toLowerCase();
        const activeHighlight = (highlightTypeRef.current || '').toLowerCase();

        const isMatchedHighlight = !!activeHighlight && (
          nodeType === activeHighlight ||
          nodeBrand === activeHighlight ||
          (node.tags && Array.isArray(node.tags) && node.tags.some((t: string) => t.toLowerCase() === activeHighlight))
        );

        const isSelected = selectedNodesRef.current.some(sn => sn.id === node.id);
        const isMultiSelected = isSelected && selectedNodesRef.current.length > 1;

        let dragGroup: any[] = [node];
        if (isMatchedHighlight) {
          // If the group (e.g. Person, Org, etc.) is highlighted, drag ALL nodes in this group together!
          dragGroup = nodesRef.current.filter(n => {
            const nType = (n.type || '').toLowerCase();
            const nBrand = (n.brand || '').toLowerCase();
            return (
              nType === activeHighlight ||
              nBrand === activeHighlight ||
              (n.tags && Array.isArray(n.tags) && n.tags.some((t: string) => t.toLowerCase() === activeHighlight))
            );
          });
        } else if (isMultiSelected) {
          // If multiple nodes are selected, drag all of them together!
          dragGroup = nodesRef.current.filter(n => selectedNodesRef.current.some(sn => sn.id === n.id));
        } else if (event.sourceEvent && (event.sourceEvent.shiftKey || event.sourceEvent.ctrlKey) && isSelected) {
          dragGroup = nodesRef.current.filter(n => selectedNodesRef.current.some(sn => sn.id === n.id));
        }
        
        // Store initial positions for all nodes in the group
        dragGroup.forEach(n => {
          n.__initialX = n.x;
          n.__initialY = n.y;
          n.fx = n.x;
          n.fy = n.y;
          n.__dragged = true;
        });
        
        event.subject.dragGroup = dragGroup;
        const transform = transformRef.current;

        let startX = event.x;
        let startY = event.y;
        let rawClientX = event.sourceEvent?.clientX || 0;
        let rawClientY = event.sourceEvent?.clientY || 0;

        if (event.sourceEvent && event.sourceEvent.touches && event.sourceEvent.touches.length > 0) {
          const rect = canvas.getBoundingClientRect();
          const touch = event.sourceEvent.touches[0];
          startX = touch.clientX - rect.left;
          startY = touch.clientY - rect.top;
          rawClientX = touch.clientX;
          rawClientY = touch.clientY;
        }

        event.subject.initialMouseX = transform.invertX(startX);
        event.subject.initialMouseY = transform.invertY(startY);
        event.subject.startClientX = rawClientX;
        event.subject.startClientY = rawClientY;
        event.subject.startTime = Date.now();
        event.subject.hasMoved = false;
      })
      .on('drag', (event) => {
        const transform = transformRef.current;
        
        let currentX = event.x;
        let currentY = event.y;
        if (event.sourceEvent && event.sourceEvent.touches && event.sourceEvent.touches.length > 0) {
          const rect = canvas.getBoundingClientRect();
          const touch = event.sourceEvent.touches[0];
          currentX = touch.clientX - rect.left;
          currentY = touch.clientY - rect.top;
        }

        const currentMouseX = transform.invertX(currentX);
        const currentMouseY = transform.invertY(currentY);
        
        const dx = currentMouseX - event.subject.initialMouseX;
        const dy = currentMouseY - event.subject.initialMouseY;
        const dist = Math.hypot(dx, dy);

        if (dist > 3) {
          event.subject.hasMoved = true;
          isDraggingRef.current = true;
          event.subject.dragGroup.forEach((n: any) => {
            n.fx = n.__initialX + dx;
            n.fy = n.__initialY + dy;
          });
          draw(transformRef.current);
        }
      })
      .on('end', (event) => {
        if (!event.active) simulation.alphaTarget(0);
        
        event.subject.dragGroup.forEach((n: any) => {
          n.fx = n.x;
          n.fy = n.y;
          n.__dragged = true;
        });

        const elapsed = Date.now() - (event.subject.startTime || 0);
        const node = event.subject.node;

        // Reliable Tap / Click detection on Canvas (both PC & Android)
        if (!event.subject.hasMoved && elapsed < 400 && node) {
          const clientX = event.subject.startClientX || 0;
          const clientY = event.subject.startClientY || 0;
          const now = Date.now();
          const lastClick = lastClickTimeRef.current;
          const isDoubleClick = lastClick.id === node.id && (now - lastClick.time) < 350;

          if (isDoubleClick) {
            if (onNodeDoubleClick) onNodeDoubleClick(node as Node, { x: clientX, y: clientY });
            lastClickTimeRef.current = { time: 0, id: null };
          } else {
            onNodeClick(node as Node, { x: clientX, y: clientY }, event.sourceEvent?.shiftKey || false);
            lastClickTimeRef.current = { time: now, id: node.id };
          }
          draw(transformRef.current);
        }
        
        setTimeout(() => { isDraggingRef.current = false; }, 80);
      });

    // CRITICAL FIX: Call drag BEFORE zoom. 
    // This ensures drag event listeners (especially touchstart) are registered first.
    // If zoom is registered first, it consumes touch events for panning, preventing drag from ever firing.
    d3.select(canvas).call(drag);
    d3.select(canvas).call(zoom).call(zoom.transform, transformRef.current);

    // Dynamic Camera Fly-To & Zoom-In when a node is focused (from AI Chat, search, left panel asset index, or click)
    const handleZoomToNode = (event: any) => {
      const targetNodeId = event.detail?.nodeId;
      if (!targetNodeId || !canvas || !canvas.parentElement) return;

      const targetNode = nodesRef.current.find(n => n.id === targetNodeId);
      if (!targetNode) return;

      const parent = canvas.parentElement;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const targetScale = event.detail?.zoomLevel || 1.75; // Optimal zoom level for readability & focus
      
      const nodeX = targetNode.x !== undefined ? targetNode.x : (w / 2);
      const nodeY = targetNode.y !== undefined ? targetNode.y : (h / 2);
      
      // Calculate offset visible center taking into account the left sidebar panel width
      const leftAside = document.querySelector('aside');
      const leftSidebarWidth = leftAside && leftAside.offsetWidth > 0 ? leftAside.offsetWidth : 0;
      const visibleCenterX = leftSidebarWidth > 0 ? (leftSidebarWidth + (w - leftSidebarWidth) / 2) : (w / 2);
      const visibleCenterY = h / 2;

      const targetTx = visibleCenterX - (nodeX * targetScale);
      const targetTy = visibleCenterY - (nodeY * targetScale);

      const targetTransform = d3.zoomIdentity.translate(targetTx, targetTy).scale(targetScale);

      d3.select(canvas)
        .transition()
        .duration(850)
        .ease(d3.easeCubicInOut)
        .call(zoom.transform, targetTransform)
        .on('end', () => {
          transformRef.current = targetTransform;
          draw(targetTransform);
        });
    };

    window.addEventListener('app:focus-node-zoom', handleZoomToNode);
    window.addEventListener('redhorizon:graph-focus', handleZoomToNode);

    const handleGraphZoomIn = () => {
      if (!canvas) return;
      d3.select(canvas).transition().duration(300).call(zoom.scaleBy, 1.35);
    };

    const handleGraphZoomOut = () => {
      if (!canvas) return;
      d3.select(canvas).transition().duration(300).call(zoom.scaleBy, 0.72);
    };

    const handleGraphZoomReset = () => {
      if (!canvas) return;
      transformRef.current = d3.zoomIdentity;
      d3.select(canvas).transition().duration(400).call(zoom.transform, d3.zoomIdentity);
    };

    const handleCustomPan = (e: any) => {
      if (!canvas) return;
      const dx = e.detail?.dx || 0;
      const dy = e.detail?.dy || 0;
      const t = transformRef.current;
      const nextTransform = t.translate(-dx / t.k, -dy / t.k);
      transformRef.current = nextTransform;
      d3.select(canvas).call(zoom.transform, nextTransform);
      draw(nextTransform);
    };

    const handleCustomZoom = (e: any) => {
      if (!canvas) return;
      const delta = e.detail?.delta || 0;
      const factor = delta > 0 ? 1.25 : 0.8;
      const t = transformRef.current;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const nextTransform = t.translate(cx, cy).scale(factor).translate(-cx, -cy);
      transformRef.current = nextTransform;
      d3.select(canvas).call(zoom.transform, nextTransform);
      draw(nextTransform);
    };

    window.addEventListener('app:graph-zoom-in', handleGraphZoomIn);
    window.addEventListener('app:graph-zoom-out', handleGraphZoomOut);
    window.addEventListener('app:graph-zoom-reset', handleGraphZoomReset);
    window.addEventListener('redhorizon:graph-pan', handleCustomPan);
    window.addEventListener('redhorizon:graph-zoom', handleCustomZoom);
    window.addEventListener('redhorizon:graph-center', handleGraphZoomReset);

    simulation.on('tick', () => {
      draw(transformRef.current);
      if (simulation.alpha() < 0.02) {
        nodesRef.current.forEach((n: any) => {
          if (n.x !== undefined && n.y !== undefined) {
            n.fx = n.x;
            n.fy = n.y;
          }
        });
        simulation.stop(); // Freeze physics to keep idle CPU usage at 0%
      }
    });

    return () => {
      window.removeEventListener('app:focus-node-zoom', handleZoomToNode);
      window.removeEventListener('redhorizon:graph-focus', handleZoomToNode);
      window.removeEventListener('app:graph-zoom-in', handleGraphZoomIn);
      window.removeEventListener('app:graph-zoom-out', handleGraphZoomOut);
      window.removeEventListener('app:graph-zoom-reset', handleGraphZoomReset);
      window.removeEventListener('redhorizon:graph-pan', handleCustomPan);
      window.removeEventListener('redhorizon:graph-zoom', handleCustomZoom);
      window.removeEventListener('redhorizon:graph-center', handleGraphZoomReset);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      simulation.stop();
      d3.select(canvas).on('.zoom', null);
      d3.select(canvas).on('.drag', null);
    };
  }, [data, visualConfig.linkDistance, visualConfig.nodeSize, layoutMode]);

  const handleInteraction = (event: React.MouseEvent | React.TouchEvent, isRightClick: boolean) => {
    if (isDraggingRef.current) return; // Ignore clicks if we are dragging

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const transform = transformRef.current;
    
    let clientX = 0;
    let clientY = 0;

    // Handle both Touch and Mouse events safely
    if ('touches' in event) {
      if (event.changedTouches && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      } else {
        return;
      }
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    const x = transform.invertX(clientX - rect.left);
    const y = transform.invertY(clientY - rect.top);

    // Hit detection using D3 simulation find (larger radius for touch)
    // Divide by transform.k so the hit area remains constant in screen pixels regardless of zoom
    const hitRadius = Math.max(visualConfig.nodeSize * 2.5, 40) / transform.k;
    const clickedNode = simulationRef.current?.find(x, y, hitRadius) || null;

    if (clickedNode) {
      if (isRightClick && onNodeRightClick) {
        onNodeRightClick(clickedNode as Node, { x: clientX, y: clientY });
      } else {
        const now = Date.now();
        const lastClick = lastClickTimeRef.current;
        const isDoubleClick = lastClick.id === clickedNode.id && (now - lastClick.time) < 300;

        if (isDoubleClick) {
          if (onNodeDoubleClick) onNodeDoubleClick(clickedNode as Node, { x: clientX, y: clientY });
          lastClickTimeRef.current = { time: 0, id: null };
        } else {
          onNodeClick(clickedNode as Node, { x: clientX, y: clientY }, event.shiftKey || false);
          lastClickTimeRef.current = { time: now, id: clickedNode.id };
          // Pin HUD tooltip to the clicked node so it stays open for inspection & deletion
          setHoveredNodeInfo({
            node: clickedNode as Node,
            position: { x: clientX, y: clientY }
          });
          // Trigger a redraw to immediately show selection changes
          if (simulationRef.current) {
              simulationRef.current.alpha(0.01).restart();
          }
        }
      }
    } else {
      onBackgroundClick();
      setHoveredNodeInfo(null);
      // Trigger a redraw to immediately show selection changes
      if (simulationRef.current) {
          simulationRef.current.alpha(0.01).restart();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      if (hoveredNodeInfo && !isHoveringTooltipRef.current) setHoveredNodeInfo(null);
      return;
    }
    // If user is currently hovering or interacting with the HUD tooltip, keep it open!
    if (isHoveringTooltipRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const transform = transformRef.current;
    const clientX = e.clientX;
    const clientY = e.clientY;
    const x = transform.invertX(clientX - rect.left);
    const y = transform.invertY(clientY - rect.top);
    const hitRadius = Math.max(visualConfig.nodeSize * 2.2, 35) / transform.k;
    const hoveredNode = simulationRef.current?.find(x, y, hitRadius) as Node | undefined;
    if (hoveredNode) {
      setHoveredNodeInfo({
        node: hoveredNode,
        position: { x: clientX, y: clientY }
      });
    }
  };

  const handleMouseLeave = () => {
    if (!isHoveringTooltipRef.current) {
      // Small debounce so user can move mouse into tooltip without it vanishing
      setTimeout(() => {
        if (!isHoveringTooltipRef.current) {
          setHoveredNodeInfo(null);
        }
      }, 250);
    }
  };

  return (
    <div className="w-full h-full relative bg-transparent overflow-hidden" onMouseLeave={handleMouseLeave}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full bg-transparent touch-none"
        onClick={(e) => handleInteraction(e, false)}
        onMouseMove={handleMouseMove}
        onTouchEnd={(e) => {
          // Prevent default to avoid triggering onClick right after touchEnd
          if (e.cancelable) e.preventDefault();
          handleInteraction(e, false);
        }}
        onContextMenu={(e) => { e.preventDefault(); handleInteraction(e, true); }}
      />

      {/* Tactical Node HUD Tooltip */}
      <NodeHudTooltip 
        node={hoveredNodeInfo?.node || null} 
        position={hoveredNodeInfo?.position || null} 
        links={data.links} 
        onDeleteNode={(nodeId) => {
          if (onDeleteNode) onDeleteNode(nodeId);
          setHoveredNodeInfo(null);
        }}
        onClose={() => setHoveredNodeInfo(null)}
        onMouseEnter={() => { isHoveringTooltipRef.current = true; }}
        onMouseLeave={() => { isHoveringTooltipRef.current = false; }}
      />

      {/* 60FPS Hardware Accelerated Canvas Status Indicator */}
      <div className="absolute bottom-2 left-3 z-30 pointer-events-none select-none hidden sm:flex items-center gap-2 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-cyan-500/30 text-[9px] font-mono text-cyan-400 shadow-lg shadow-black/60">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-bold tracking-wider">CANVAS 2D TURBO</span>
        <span className="text-zinc-600">|</span>
        <span className="text-zinc-300 font-bold">{data.nodes.length} NOD</span>
        {data.nodes.length >= 40 && (
          <span className="text-[7.5px] bg-cyan-950/90 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/40 uppercase tracking-widest font-black">
            CULLING &amp; LOD AKTIF
          </span>
        )}
      </div>
    </div>
  );
};

export default GraphViewCanvas;
