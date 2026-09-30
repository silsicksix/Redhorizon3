
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { GraphData, Node, Link, LayoutMode } from '../types';
import { useGlobalStore } from '../store/GlobalStore';
import { resolveNodeBrandOrType } from '../utils/nodeIconResolver';
import { getLinkMetadataInfo } from '../utils/linkRelationshipFormatter';
import { getProxiedImageUrl, extractImageUrl } from '../utils/imageUtils';
import NodeHudTooltip from './NodeHudTooltip';

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

interface GraphViewProps {
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
}

const GraphView: React.FC<GraphViewProps> = ({ data, highlightType, layoutMode, selectedNodes, onNodeClick, onNodeDoubleClick, onNodeRightClick, onBackgroundClick, onDeleteNode, groupByType }) => {
  const { state } = useGlobalStore();
  const { config } = state;
  const visualConfig = useMemo(() => config.visual || { nodeSize: 22, linkDistance: 140, themeColor: '#ff0033', showParticles: true, gridOpacity: 0.1 }, [config.visual]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<{ node: Node; position: { x: number; y: number } } | null>(null);
  const isHoveringTooltipRef = useRef(false);

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
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const draggedNodesRef = useRef<Set<string>>(new Set());
  const prevLayoutModeRef = useRef<LayoutMode>(layoutMode);
  const nodesRef = useRef<any[]>([]);
  const linksRef = useRef<any[]>([]);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const selectedNodesRef = useRef<Node[]>(selectedNodes);
  const highlightTypeRef = useRef<string | null>(highlightType);
  const callbacksRef = useRef({ onNodeClick, onNodeDoubleClick, onNodeRightClick, onBackgroundClick, groupByType });

  useEffect(() => {
    callbacksRef.current = { onNodeClick, onNodeDoubleClick, onNodeRightClick, onBackgroundClick, groupByType };
  });

  useEffect(() => {
    selectedNodesRef.current = selectedNodes;
    highlightTypeRef.current = highlightType;
  }, [selectedNodes, highlightType]);

  const getNodeColor = (d: any) => {
      return resolveNodeBrandOrType(d).brandColor;
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !svg.parentElement) return;

    const parent = svg.parentElement;

    const updateSize = () => {
      if (parent) {
        const { width, height } = parent.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(parent);

    window.addEventListener('resize', updateSize);
    document.addEventListener('fullscreenchange', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
      document.removeEventListener('fullscreenchange', updateSize);
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    const { width, height } = dimensions;
    
    if (visualConfig.gridOpacity > 0) {
        const defs = svg.append("defs");
        const pattern = defs.append("pattern")
            .attr("id", "grid")
            .attr("width", 40)
            .attr("height", 40)
            .attr("patternUnits", "userSpaceOnUse");
        pattern.append("path")
            .attr("d", "M 40 0 L 0 0 0 40")
            .attr("fill", "none")
            .attr("stroke", visualConfig.themeColor)
            .attr("stroke-width", 0.5)
            .attr("opacity", visualConfig.gridOpacity);
        svg.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "url(#grid)");
    }

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .filter((event) => {
        if (event.touches && event.touches.length > 1) return true;
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown' && event.button !== 0) return true;
        // Yield touch/mouse events on node groups to d3.drag for individual node movement
        if (event.target && (event.target as Element).closest && (event.target as Element).closest('.node-group')) {
          return false;
        }
        return !event.ctrlKey;
      })
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        g.attr("transform", event.transform.toString());
      });

    // Retain user camera zoom and pan position when data or timeline slider updates
    g.attr("transform", transformRef.current.toString());
    svg.call(zoom as any).call(zoom.transform as any, transformRef.current);

    const existingNodes = new Map(nodesRef.current.map((n: any) => [n.id, n]));
    const isNewDataset = nodesRef.current.length === 0;
    if (isNewDataset) {
      transformRef.current = d3.zoomIdentity;
      svg.call(zoom.transform as any, d3.zoomIdentity);
    }
    const nodes = (data?.nodes || []).map(d => {
        const existing = existingNodes.get(d.id);
        if (existing) {
            return { ...d, x: existing.x, y: existing.y, vx: existing.vx, vy: existing.vy, fx: existing.fx, fy: existing.fy };
        }
        return { ...d };
    });
    nodesRef.current = nodes;

    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const nodeLabelMap = new Map(nodes.map((n: any) => [n.label?.toLowerCase()?.trim(), n.id]));

    const links = (data?.links || [])
      .map(d => {
        let s = typeof d.source === 'object' && d.source ? d.source.id : d.source;
        let t = typeof d.target === 'object' && d.target ? d.target.id : d.target;
        if (!nodeIds.has(s) && nodeLabelMap.has(String(s).toLowerCase().trim())) {
          s = nodeLabelMap.get(String(s).toLowerCase().trim());
        }
        if (!nodeIds.has(t) && nodeLabelMap.has(String(t).toLowerCase().trim())) {
          t = nodeLabelMap.get(String(t).toLowerCase().trim());
        }
        return { ...d, source: s, target: t };
      })
      .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));
    linksRef.current = links;

    // Calculate node degrees for centrality scaling
    const nodeDegrees = new Map<string, number>();
    links.forEach(l => {
        const s = typeof l.source === 'object' && l.source ? String((l.source as any).id) : String(l.source);
        const t = typeof l.target === 'object' && l.target ? String((l.target as any).id) : String(l.target);
        nodeDegrees.set(s, (nodeDegrees.get(s) || 0) + 1);
        nodeDegrees.set(t, (nodeDegrees.get(t) || 0) + 1);
    });

    const centerX = width / 2;
    const centerY = height / 2;
    const spacing = visualConfig.linkDistance * 1.2;

    const layoutChanged = prevLayoutModeRef.current !== layoutMode;
    if (layoutChanged) {
        draggedNodesRef.current.clear();
        prevLayoutModeRef.current = layoutMode;
    }

    const applyLayout = () => {
        // Partition nodes if highlightType is active
        const focusNodes = highlightType ? nodes.filter((n: any) => n.type === highlightType) : [];
        const otherNodes = highlightType ? nodes.filter((n: any) => n.type !== highlightType) : nodes;

        const applyToGroup = (groupNodes: any[], groupCenterX: number, groupCenterY: number, groupWidth: number, groupHeight: number) => {
            if (groupNodes.length === 0) return;
            
            switch(layoutMode) {
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
                        if (!draggedNodesRef.current.has(n.id)) {
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
                            if (!draggedNodesRef.current.has(n.id)) {
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
                            if (!draggedNodesRef.current.has(n.id)) {
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
                        // Calculate anchor for this cluster
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
                            if (!draggedNodesRef.current.has(n.id)) {
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
                            if (!draggedNodesRef.current.has(node.id)) {
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

                    groupNodes.forEach((n: any) => {
                        incomingCounts.set(n.id, 0);
                        outgoingAdj.set(n.id, []);
                        undirectedAdj.set(n.id, []);
                    });

                    links.forEach((l: any) => {
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

                    groupNodes.forEach((node: any) => {
                        if (!visited.has(node.id)) {
                            const compNodes: any[] = [];
                            const q = [node.id];
                            visited.add(node.id);
                            while (q.length > 0) {
                                const currId = q.shift()!;
                                const nObj = groupNodes.find((n: any) => n.id === currId);
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

                    let totalComponentsWidth = 0;
                    const compWidths: number[] = [];

                    components.forEach((compNodes) => {
                        let roots = compNodes.filter((n: any) => (incomingCounts.get(n.id) || 0) === 0);
                        if (roots.length === 0) {
                            let bestNode = compNodes[0];
                            let maxDeg = -1;
                            compNodes.forEach((n: any) => {
                                const deg = (outgoingAdj.get(n.id)?.length || 0) + (incomingCounts.get(n.id) || 0);
                                if (deg > maxDeg) { maxDeg = deg; bestNode = n; }
                            });
                            roots = [bestNode];
                        }

                        const levels = new Map<string, number>();
                        const q: { id: string; level: number }[] = [];
                        const compVisited = new Set<string>();

                        roots.forEach((r: any) => {
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
                        compNodes.forEach((n: any) => {
                            if (!levels.has(n.id)) levels.set(n.id, maxLvl + 1);
                        });

                        const levelGroups = new Map<number, any[]>();
                        compNodes.forEach((n: any) => {
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

                        let roots = compNodes.filter((n: any) => (incomingCounts.get(n.id) || 0) === 0);
                        if (roots.length === 0) {
                            let bestNode = compNodes[0];
                            let maxDeg = -1;
                            compNodes.forEach((n: any) => {
                                const deg = (outgoingAdj.get(n.id)?.length || 0) + (incomingCounts.get(n.id) || 0);
                                if (deg > maxDeg) { maxDeg = deg; bestNode = n; }
                            });
                            roots = [bestNode];
                        }

                        const levels = new Map<string, number>();
                        const q: { id: string; level: number }[] = [];
                        const compVisited = new Set<string>();

                        roots.forEach((r: any) => {
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
                        compNodes.forEach((n: any) => {
                            if (!levels.has(n.id)) levels.set(n.id, maxLvl + 1);
                        });

                        const levelGroups = new Map<number, any[]>();
                        compNodes.forEach((n: any) => {
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
                                nodesInLevel.forEach((n: any, i: number) => {
                                    if (!draggedNodesRef.current.has(n.id)) {
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
                                nodesInLevel.forEach((n: any, i: number) => {
                                    if (!draggedNodesRef.current.has(n.id)) {
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
                        if (!draggedNodesRef.current.has(n.id)) {
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
            applyToGroup(nodes, centerX, centerY, width, height);
        }
    };

    applyLayout();

    // Precompute centers for node types if grouping
    const uniqueTypes = Array.from(new Set(nodes.map(n => (n as any).type || 'unknown')));
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

    // High-precision anti-overlap physics engine
    const isLargeGraph = nodes.length > 120;
    const simulation = d3.forceSimulation<any>(nodes)
      .alphaDecay(isLargeGraph ? 0.09 : 0.07) // Rapid cooling so nodes settle into place quickly without endless movement
      .velocityDecay(0.42) // Smooth movement without erratic oscillations
      .force("link", d3.forceLink<any, any>(links).id(d => d.id).distance(groupByType ? visualConfig.linkDistance * 0.8 : visualConfig.linkDistance * 1.35).strength(0.45))
      .force("charge", d3.forceManyBody().strength(isLargeGraph ? -450 : -800).distanceMin(35).distanceMax(1800))
      .force("center", groupByType ? null : d3.forceCenter(centerX, centerY).strength(0.03)) // Very gentle centering so nodes don't bunch up
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
      .force("collide", d3.forceCollide<any>().radius((d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          const nodeRadius = (visualConfig.nodeSize || 22) * scaleFactor;
          const labelLength = (d.label || '').length;
          // Anti-overlap buffer accounting for node body, avatar, and label text
          const labelBuffer = Math.min(labelLength * 3.8, 60);
          const degreeBuffer = Math.min(degree * 5, 35);
          return Math.max(nodeRadius + 22, 42) + labelBuffer + degreeBuffer;
      }).strength(1.0).iterations(isLargeGraph ? 3 : 5));

    // Warm restart for layout changes
    if (layoutChanged) {
        simulation.alpha(0.8).restart();
    }

    // Stop simulation early if there are too many nodes to prevent long-term lag
    if (nodes.length > 200) {
        simulation.alphaMin(0.05); 
    }

    const defs = svg.append("defs");
    
    // Create arrow markers - Skip for very large graphs to save render time
    if (nodes.length < 150) {
        const uniqueColors = Array.from(new Set([...nodes.map((n: any) => getNodeColor(n)), visualConfig.themeColor, '#f59e0b']));
        uniqueColors.forEach(color => {
            defs.append("marker")
                .attr("id", `arrow-${color.replace('#', '')}`)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", visualConfig.nodeSize + 8)
                .attr("refY", 0)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("path")
                .attr("fill", color)
                .attr("d", "M0,-5L10,0L0,5");
        });
    }

    // Performance: Disable filters to save massive GPU overhead on tablets
    const useFilters = false;
    if (useFilters) {
        const filter = defs.append("filter").attr("id", "nodeGlow");
        filter.append("feGaussianBlur").attr("stdDeviation", "2").attr("result", "blur");
        filter.append("feMerge").selectAll("feMergeNode").data(["blur", "SourceGraphic"]).join("feMergeNode").attr("in", d => d);

        const goldFilter = defs.append("filter").attr("id", "goldGlow");
        goldFilter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
        goldFilter.append("feFlood").attr("flood-color", "#f59e0b").attr("result", "color");
        goldFilter.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "goldBlur");
        goldFilter.append("feMerge").selectAll("feMergeNode").data(["goldBlur", "SourceGraphic"]).join("feMergeNode").attr("in", d => d);
    }

    const link = g.append("g")
      .attr("stroke-opacity", nodes.length > 100 ? 0.3 : 0.6)
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("fill", "none")
      .attr("stroke-width", (d: any) => {
          const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
          const targetId = typeof d.target === 'object' ? d.target.id : d.target;
          const isSelected = selectedNodes.some(sn => sn.id === sourceId || sn.id === targetId);
          return isSelected ? 3 : 1.2;
      })
      .attr("class", (d: any) => {
          const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
          const targetId = typeof d.target === 'object' ? d.target.id : d.target;
          const isSelected = selectedNodes.some(sn => sn.id === sourceId || sn.id === targetId);
          return isSelected ? "link-line link-selected" : "link-line";
      })
      .attr("stroke", (d: any) => {
          const label = (d.label || '').toLowerCase();
          if (label === 'contradicts') return '#ef4444';
          if (label === 'smoking_gun') return '#10b981';
          if (label === 'evidenced_by') return '#c084fc';
          if (d.isVault) return '#f59e0b';
          const sourceNode = typeof d.source === 'object' ? d.source : nodes.find((n:any) => n.id === d.source);
          return sourceNode ? getNodeColor(sourceNode) : visualConfig.themeColor;
      })
      .attr("stroke-dasharray", (d: any) => {
          const label = (d.label || '').toLowerCase();
          if (label === 'contradicts' || label === 'evidenced_by') return '4,4';
          return 'none';
      })
      .attr("marker-end", (d: any) => {
          if (nodes.length >= 150) return "none";
          if (d.isVault) return `url(#arrow-f59e0b)`;
          const sourceNode = typeof d.source === 'object' ? d.source : nodes.find((n:any) => n.id === d.source);
          const color = sourceNode ? getNodeColor(sourceNode) : visualConfig.themeColor;
          return `url(#arrow-${color.replace('#', '')})`;
      });

    // Maltego-style edge metadata labels (showing relation & parent-to-child entity category)
    const linkLabelGroup = g.append("g")
      .attr("class", "link-labels-layer")
      .style("pointer-events", "none")
      .selectAll("g")
      .data(links)
      .join("g")
      .attr("class", "link-label-item");

    linkLabelGroup.append("rect")
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", "rgba(9, 11, 17, 0.92)")
      .attr("stroke", (d: any) => {
        const meta = getLinkMetadataInfo(d, nodes);
        return `${meta.badgeColor}cc`;
      })
      .attr("stroke-width", 0.75)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.85))");

    linkLabelGroup.append("text")
      .attr("class", "link-label-text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", "8.5px")
      .attr("font-family", "'JetBrains Mono', monospace, sans-serif")
      .attr("font-weight", "600")
      .attr("fill", "#e2e8f0")
      .text((d: any) => {
        const meta = getLinkMetadataInfo(d, nodes);
        return meta.edgeText;
      });

    // Size the rects to fit text with padding
    linkLabelGroup.each(function(this: any) {
      const group = d3.select(this);
      const textNode = group.select<SVGTextElement>("text").node();
      if (textNode) {
        const bbox = textNode.getBBox();
        const padX = 5;
        const padY = 2;
        group.select("rect")
          .attr("x", bbox.x - padX)
          .attr("y", bbox.y - padY)
          .attr("width", bbox.width + padX * 2)
          .attr("height", bbox.height + padY * 2);
      }
    });

    let lastClickTime = 0;
    let lastClickNodeId = '';

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "grab")
      .attr("class", "node-group")
      .style("touch-action", "none")
      .call(d3.drag<any, any>()
        .filter((event) => !event.ctrlKey && (event.button === undefined || event.button === 0))
        .on("start", (e, d) => {
        setHoveredNodeInfo(null);
        if (!e.active) simulation.alphaTarget(0.3).restart();
        
        // Determine drag group: if highlighted by type/brand or multiple selected, drag the whole group together
        const nodeType = (d.type || '').toLowerCase();
        const nodeBrand = (d.brand || '').toLowerCase();
        const activeHighlight = (highlightTypeRef.current || '').toLowerCase();
        
        const isMatchedHighlight = !!activeHighlight && (
          nodeType === activeHighlight ||
          nodeBrand === activeHighlight ||
          (d.tags && Array.isArray(d.tags) && d.tags.some((t: string) => t.toLowerCase() === activeHighlight))
        );

        const isSelected = selectedNodesRef.current.some(sn => sn.id === d.id);
        const isMultiSelected = isSelected && selectedNodesRef.current.length > 1;

        let dragGroup: any[] = [d];
        if (isMatchedHighlight) {
          // If the group (e.g. Person, Org, etc.) is highlighted/active, drag ALL nodes in this group together!
          dragGroup = nodes.filter((n: any) => {
            const nType = (n.type || '').toLowerCase();
            const nBrand = (n.brand || '').toLowerCase();
            return (
              nType === activeHighlight ||
              nBrand === activeHighlight ||
              (n.tags && Array.isArray(n.tags) && n.tags.some((t: string) => t.toLowerCase() === activeHighlight))
            );
          });
        } else if (isMultiSelected) {
          // If multiple nodes are selected and the user drags one of them, drag all selected nodes together!
          dragGroup = nodes.filter((n: any) => selectedNodesRef.current.some(sn => sn.id === n.id));
        } else if (e.sourceEvent && (e.sourceEvent.shiftKey || e.sourceEvent.ctrlKey) && isSelected) {
          dragGroup = nodes.filter((n: any) => selectedNodesRef.current.some(sn => sn.id === n.id));
        }
        
        // Store initial positions for all nodes in the group
        dragGroup.forEach(n => {
          n.__initialX = n.x;
          n.__initialY = n.y;
          n.fx = n.x;
          n.fy = n.y;
          draggedNodesRef.current.add(n.id);
        });
        
        e.subject.dragGroup = dragGroup;
        e.subject.initialMouseX = e.x;
        e.subject.initialMouseY = e.y;
        e.subject.startX = e.x;
        e.subject.startY = e.y;
        e.subject.startTime = Date.now();
        e.subject.hasMoved = false;

        const srcEvt = e.sourceEvent;
        const touch = srcEvt?.touches?.[0] || srcEvt?.changedTouches?.[0];
        e.subject.clientStartX = touch ? touch.clientX : (srcEvt?.clientX || 0);
        e.subject.clientStartY = touch ? touch.clientY : (srcEvt?.clientY || 0);
      })
      .on("drag", (e) => {
        const dx = e.x - e.subject.initialMouseX;
        const dy = e.y - e.subject.initialMouseY;
        const dist = Math.hypot(e.x - e.subject.startX, e.y - e.subject.startY);
        
        if (dist > 4) {
          e.subject.hasMoved = true;
          e.subject.dragGroup.forEach((n: any) => {
            n.fx = n.__initialX + dx;
            n.fy = n.__initialY + dy;
          });
        }
      })
      .on("end", (e, d) => {
        if (!e.active) simulation.alphaTarget(0);
        
        // STICKY NODES: Lock dropped position firmly
        e.subject.dragGroup.forEach((n: any) => {
          n.fx = n.x;
          n.fy = n.y;
        });

        // If it was a quick tap/click without drag movement, trigger node click reliably across PC and mobile
        const elapsed = Date.now() - (e.subject.startTime || 0);
        if (!e.subject.hasMoved && elapsed < 400) {
          const now = Date.now();
          const isDbl = (lastClickNodeId === d.id) && (now - lastClickTime < 350);
          const posX = e.subject.clientStartX || 0;
          const posY = e.subject.clientStartY || 0;

          if (isDbl && callbacksRef.current.onNodeDoubleClick) {
            callbacksRef.current.onNodeDoubleClick(d as any, { x: posX, y: posY });
            lastClickNodeId = '';
            lastClickTime = 0;
          } else {
            lastClickNodeId = d.id;
            lastClickTime = now;
            callbacksRef.current.onNodeClick(d as any, { x: posX, y: posY }, e.sourceEvent?.shiftKey || false);
          }
        }
      }));

    // Invisible hit area for easier touch/click ("fat finger" friendly for Android)
    node.append("circle")
      .attr("r", Math.max(visualConfig.nodeSize * 3.5, 55))
      .attr("fill", "rgba(0,0,0,0.001)")
      .attr("pointer-events", "all")
      .style("touch-action", "none")
      .attr("stroke", "none");

    node.append("circle")
      .attr("class", "node-circle")
      .attr("r", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return visualConfig.nodeSize * scaleFactor;
      })
      .attr("fill", (d: any) => {
        if (d.type === 'hypothesis' || d.type === 'decision') return '#2e1065';
        if (d.type === 'conflict') return '#450a0a';
        return d.vaultMatch ? "#1a1000" : "#050505";
      })
      .attr("stroke", (d: any) => {
        if (d.isConflictFlagged || (d.activeConflicts && d.activeConflicts.length > 0)) return '#ef4444';
        if (d.type === 'hypothesis' || d.type === 'decision') return '#c084fc';
        return selectedNodes.some(sn => sn.id === d.id) ? '#fff' : getNodeColor(d);
      })
      .attr("stroke-width", (d: any) => {
        if (d.isConflictFlagged || (d.activeConflicts && d.activeConflicts.length > 0)) return 3.5;
        if (d.type === 'hypothesis' || d.type === 'decision') return 3;
        return d.vaultMatch ? 4 : (selectedNodes.some(sn => sn.id === d.id) ? 4 : 2);
      })
      .attr("stroke-dasharray", (d: any) => {
        if (d.isConflictFlagged || (d.activeConflicts && d.activeConflicts.length > 0)) return '3,2';
        return 'none';
      })
      .style("filter", (d: any) => useFilters ? (d.vaultMatch ? "url(#goldGlow)" : "url(#nodeGlow)") : "none");

    // Conflict Alert Indicator Badge (Top-Left)
    const conflictBadge = node.filter((d: any) => !!d.isConflictFlagged || (d.activeConflicts && d.activeConflicts.length > 0))
      .append("g")
      .attr("class", "conflict-badge-group")
      .attr("pointer-events", "none");

    conflictBadge.append("circle")
      .attr("cx", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return -(visualConfig.nodeSize * scaleFactor) * 0.7;
      })
      .attr("cy", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return -(visualConfig.nodeSize * scaleFactor) * 0.7;
      })
      .attr("r", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return Math.max(7, (visualConfig.nodeSize * scaleFactor) * 0.45);
      })
      .attr("fill", "#dc2626")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", "1.5");

    conflictBadge.append("text")
      .text("⚠️")
      .attr("x", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return -(visualConfig.nodeSize * scaleFactor) * 0.7;
      })
      .attr("y", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return -(visualConfig.nodeSize * scaleFactor) * 0.7 + 3.5;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", "9px");

    // Add image if available
    node.filter((d: any) => !!getDisplayImageUrl(d))
      .append("image")
      .attr("href", (d: any) => getProxiedImageUrl(getDisplayImageUrl(d)) || '')
      .attr("xlink:href", (d: any) => getProxiedImageUrl(getDisplayImageUrl(d)) || '')
      .attr("referrerPolicy", "no-referrer")
      .attr("x", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return -visualConfig.nodeSize * scaleFactor;
      })
      .attr("y", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return -visualConfig.nodeSize * scaleFactor;
      })
      .attr("width", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return visualConfig.nodeSize * 2 * scaleFactor;
      })
      .attr("height", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return visualConfig.nodeSize * 2 * scaleFactor;
      })
      .style("clip-path", "circle(50% at 50% 50%)")
      .attr("preserveAspectRatio", "xMidYMid slice")
      .on("error", function(event, d: any) {
          // On image load failure, try direct url first if was proxied, else hide
          const original = getDisplayImageUrl(d);
          const currentHref = d3.select(this).attr("href");
          if (original && currentHref && currentHref.includes('/api/proxy-image') && !original.startsWith('data:')) {
              d3.select(this).attr("href", original).attr("xlink:href", original);
          } else {
              d3.select(this).style("display", "none");
              d3.select(this.parentNode as Element).select(".node-icon-group").style("display", "block");
          }
      });

    // Vector Icon Group for crisp social media / phone / entity logos
    const iconGroup = node.append("g")
      .attr("class", "node-icon-group")
      .attr("pointer-events", "none")
      .style("display", (d: any) => (!!getDisplayImageUrl(d) && nodes.length < 100) ? "none" : "block");

    iconGroup.append("path")
      .attr("d", (d: any) => resolveNodeBrandOrType(d).svgPath)
      .attr("fill", (d: any) => {
        const meta = resolveNodeBrandOrType(d);
        return meta.brand === 'github' ? '#ffffff' : meta.brandColor;
      })
      .attr("transform", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          const iconSize = visualConfig.nodeSize * scaleFactor * 1.15;
          const scale = iconSize / 24;
          return `translate(${-iconSize / 2}, ${-iconSize / 2}) scale(${scale})`;
      })
      .style("filter", "drop-shadow(0px 2px 3px rgba(0,0,0,0.8))");

    // Mini Corner Badge for nodes with image avatars
    const badgeGroup = node.filter((d: any) => !!getDisplayImageUrl(d))
      .append("g")
      .attr("class", "node-badge-group")
      .attr("pointer-events", "none");

    badgeGroup.append("circle")
      .attr("cx", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return (visualConfig.nodeSize * scaleFactor) * 0.65;
      })
      .attr("cy", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return (visualConfig.nodeSize * scaleFactor) * 0.65;
      })
      .attr("r", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return Math.max(6, (visualConfig.nodeSize * scaleFactor) * 0.42);
      })
      .attr("fill", (d: any) => resolveNodeBrandOrType(d).brandColor)
      .attr("stroke", "#09090b")
      .attr("stroke-width", "1.5");

    badgeGroup.append("path")
      .attr("d", (d: any) => resolveNodeBrandOrType(d).svgPath)
      .attr("fill", "#ffffff")
      .attr("transform", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          const radius = visualConfig.nodeSize * scaleFactor;
          const badgeRadius = Math.max(6, radius * 0.42);
          const badgeX = radius * 0.65;
          const badgeY = radius * 0.65;
          const iconSize = badgeRadius * 1.25;
          const scale = iconSize / 24;
          return `translate(${badgeX - iconSize / 2}, ${badgeY - iconSize / 2}) scale(${scale})`;
      });

    // Node labels - always visible and legible
    node.append("text")
      .attr("class", "node-label")
      .text((d: any) => d.label || d.id)
      .attr("dy", (d: any) => {
          const degree = nodeDegrees.get(d.id) || 0;
          const scaleFactor = Math.min(2, 1 + (degree * 0.15));
          return (visualConfig.nodeSize * scaleFactor) + 15;
      })
      .attr("text-anchor", "middle")
      .attr("fill", (d: any) => d.vaultMatch ? "#f59e0b" : "#fff")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.9), 0 0 6px #000")
      .style("pointer-events", "none")
      .style("opacity", 1)
      .style("display", "block");

    node.on("mouseenter", (event, d) => {
      setHoveredNodeInfo({
        node: d as Node,
        position: { x: event.clientX, y: event.clientY }
      });
    });

    node.on("mousemove", (event, d) => {
      setHoveredNodeInfo({
        node: d as Node,
        position: { x: event.clientX, y: event.clientY }
      });
    });

    node.on("mouseleave", () => {
      if (!isHoveringTooltipRef.current) {
        setTimeout(() => {
          if (!isHoveringTooltipRef.current) {
            setHoveredNodeInfo(null);
          }
        }, 250);
      }
    });

    node.on("click", (event, d) => {
      event.stopPropagation();
      setHoveredNodeInfo({
        node: d as Node,
        position: { x: event.clientX, y: event.clientY }
      });
      callbacksRef.current.onNodeClick(d as any, { x: event.clientX, y: event.clientY }, event.shiftKey);
    });

    node.on("dblclick", (event, d) => {
      event.stopPropagation();
      if (callbacksRef.current.onNodeDoubleClick) callbacksRef.current.onNodeDoubleClick(d as any, { x: event.clientX, y: event.clientY });
    });

    node.on("contextmenu", (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        if(callbacksRef.current.onNodeRightClick) callbacksRef.current.onNodeRightClick(d as any, { x: event.clientX, y: event.clientY });
    });

    simulation.on("tick", () => {
      link.attr("d", (d: any) => {
          const sx = d.source.x || 0;
          const sy = d.source.y || 0;
          const tx = d.target.x || 0;
          const ty = d.target.y || 0;

          if (layoutMode === 'orthogonal_vertical') {
              // Maltego vertical stepped 90° right angle
              const midX = sx + (tx - sx) * 0.5;
              return `M${sx},${sy} L${midX},${sy} L${midX},${ty} L${tx},${ty}`;
          } else if (layoutMode === 'orthogonal') {
              // Maltego stepped 90° right angle
              const midY = sy + (ty - sy) * 0.5;
              return `M${sx},${sy} L${sx},${midY} L${tx},${midY} L${tx},${ty}`;
          } else if (layoutMode === 'hierarchy') {
              // Direct straight line
              return `M${sx},${sy} L${tx},${ty}`;
          } else {
              const dx = tx - sx;
              const dy = ty - sy;
              const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Curvature factor
              return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
          }
      });
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);

      linkLabelGroup.attr("transform", (d: any) => {
        const sx = d.source.x || 0;
        const sy = d.source.y || 0;
        const tx = d.target.x || 0;
        const ty = d.target.y || 0;
        let midX = (sx + tx) / 2;
        let midY = (sy + ty) / 2;

        if (layoutMode === 'orthogonal') {
          midY = sy + (ty - sy) * 0.5;
        } else if (layoutMode === 'orthogonal_vertical') {
          midX = sx + (tx - sx) * 0.5;
        }

        return `translate(${midX},${midY})`;
      });

      // Freeze node positions firmly once simulation settles so nodes stop moving
      if (simulation.alpha() < 0.02) {
        nodes.forEach((n: any) => {
          if (n.x !== undefined && n.y !== undefined) {
            n.fx = n.x;
            n.fy = n.y;
          }
        });
      }
    });

    simulationRef.current = simulation;

    // Dynamic Camera Fly-To & Zoom-In when a node is focused
    const handleZoomToNode = (event: any) => {
      const targetNodeId = event.detail?.nodeId;
      if (!targetNodeId || !svgRef.current) return;

      const targetNode = nodesRef.current.find((n: any) => n.id === targetNodeId);
      if (!targetNode) return;

      const targetScale = event.detail?.zoomLevel || 1.75;
      const nodeX = targetNode.x !== undefined ? targetNode.x : (width / 2);
      const nodeY = targetNode.y !== undefined ? targetNode.y : (height / 2);

      const leftAside = document.querySelector('aside');
      const leftSidebarWidth = leftAside && leftAside.offsetWidth > 0 ? leftAside.offsetWidth : 0;
      const visibleCenterX = leftSidebarWidth > 0 ? (leftSidebarWidth + (width - leftSidebarWidth) / 2) : (width / 2);
      const visibleCenterY = height / 2;

      const targetTx = visibleCenterX - (nodeX * targetScale);
      const targetTy = visibleCenterY - (nodeY * targetScale);

      const targetTransform = d3.zoomIdentity.translate(targetTx, targetTy).scale(targetScale);

      d3.select(svgRef.current)
        .transition()
        .duration(850)
        .ease(d3.easeCubicInOut)
        .call(zoom.transform as any, targetTransform);
    };

    window.addEventListener('app:focus-node-zoom', handleZoomToNode);
    window.addEventListener('redhorizon:graph-focus', handleZoomToNode);

    const handleGraphZoomIn = () => {
      if (!svgRef.current) return;
      d3.select(svgRef.current).transition().duration(300).call(zoom.scaleBy as any, 1.35);
    };

    const handleGraphZoomOut = () => {
      if (!svgRef.current) return;
      d3.select(svgRef.current).transition().duration(300).call(zoom.scaleBy as any, 0.72);
    };

    const handleGraphZoomReset = () => {
      if (!svgRef.current) return;
      transformRef.current = d3.zoomIdentity;
      d3.select(svgRef.current).transition().duration(400).call(zoom.transform as any, d3.zoomIdentity);
    };

    const handleCustomPan = (e: any) => {
      if (!svgRef.current) return;
      const dx = e.detail?.dx || 0;
      const dy = e.detail?.dy || 0;
      const t = transformRef.current;
      const nextTransform = t.translate(-dx / t.k, -dy / t.k);
      transformRef.current = nextTransform;
      d3.select(svgRef.current).call(zoom.transform as any, nextTransform);
    };

    const handleCustomZoom = (e: any) => {
      const delta = e.detail?.delta || 0;
      if (delta > 0) {
        handleGraphZoomIn();
      } else if (delta < 0) {
        handleGraphZoomOut();
      }
    };

    window.addEventListener('app:graph-zoom-in', handleGraphZoomIn);
    window.addEventListener('app:graph-zoom-out', handleGraphZoomOut);
    window.addEventListener('app:graph-zoom-reset', handleGraphZoomReset);
    window.addEventListener('redhorizon:graph-pan', handleCustomPan);
    window.addEventListener('redhorizon:graph-zoom', handleCustomZoom);
    window.addEventListener('redhorizon:graph-center', handleGraphZoomReset);

    return () => { 
      window.removeEventListener('app:focus-node-zoom', handleZoomToNode);
      window.removeEventListener('redhorizon:graph-focus', handleZoomToNode);
      window.removeEventListener('app:graph-zoom-in', handleGraphZoomIn);
      window.removeEventListener('app:graph-zoom-out', handleGraphZoomOut);
      window.removeEventListener('app:graph-zoom-reset', handleGraphZoomReset);
      window.removeEventListener('redhorizon:graph-pan', handleCustomPan);
      window.removeEventListener('redhorizon:graph-zoom', handleCustomZoom);
      window.removeEventListener('redhorizon:graph-center', handleGraphZoomReset);
      simulation.stop(); 
    };
  }, [data, dimensions, layoutMode, visualConfig]);

  // Separate useEffect for handling selection highlights without restarting simulation
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    
    svg.selectAll(".node-circle")
      .attr("stroke", (d: any) => selectedNodes.some(sn => sn.id === d.id) ? '#fff' : getNodeColor(d))
      .attr("stroke-width", (d: any) => d.vaultMatch ? 4 : (selectedNodes.some(sn => sn.id === d.id) ? 4 : 2));
      
    svg.selectAll(".node-label")
      .style("display", "block");

    svg.selectAll(".link-line")
      .attr("stroke-width", (d: any) => {
          const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
          const targetId = typeof d.target === 'object' ? d.target.id : d.target;
          const isSelected = selectedNodes.some(sn => sn.id === sourceId || sn.id === targetId);
          return isSelected ? 3 : 1.2;
      })
      .attr("class", (d: any) => {
          const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
          const targetId = typeof d.target === 'object' ? d.target.id : d.target;
          const isSelected = selectedNodes.some(sn => sn.id === sourceId || sn.id === targetId);
          return isSelected ? "link-line link-selected" : "link-line";
      });
  }, [selectedNodes]);

  return (
    <div className="w-full h-full relative bg-transparent overflow-hidden">
        <style>{`
          .link-selected {
            stroke-opacity: 1 !important; 
            stroke-width: 4px !important;
          }
        `}</style>
        <svg 
            ref={svgRef} 
            className="w-full h-full" 
            style={{ touchAction: 'none' }} 
            onClick={onBackgroundClick} 
            onContextMenu={(e) => { e.preventDefault(); }} 
        />
        <div className="absolute bottom-6 left-6 pointer-events-none opacity-40 hidden sm:block">
            <div className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: visualConfig.themeColor }}>
              System_Topology_V14 :: {layoutMode}
            </div>
            <div className="text-[8px] text-white/50">D3_FORCE_PENALIZED_DECAY</div>
        </div>

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
    </div>
  );
};

export default GraphView;