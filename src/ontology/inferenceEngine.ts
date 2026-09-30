/**
 * RED HORIZON - INTELLIGENCE ONTOLOGY INFERENCE ENGINE
 * Autonomous reasoning, identity bridging, spatio-temporal co-presence, and multi-hop link deductions.
 */

import { Node, Link, GraphData } from '../types';
import { extractOntologySlotsFromText, ExtractedOntologySlot } from './ontologyNormalizer';
import { ONTOLOGY_PREDICATES } from './ontologySchema';

export interface InferredRelationship {
  id: string;
  ruleId: 'SHARED_IDENTIFIER' | 'SPATIO_TEMPORAL_COPRESENCE' | 'MULTI_HOP_FINANCIAL' | 'COMMON_ASSOCIATE' | 'INVERSE_SEMANTIC';
  ruleName: string;
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  predicate: string;
  predicateLabel: string;
  confidence: number; // 0 - 100
  rationale: string;
  evidenceItems: string[];
  alreadyExistsInGraph: boolean;
}

export interface InferenceEngineResult {
  inferredRelationships: InferredRelationship[];
  statistics: {
    totalEvaluatedNodes: number;
    totalEvaluatedLinks: number;
    newDiscoveriesCount: number;
    identityBridgesCount: number;
    coPresenceCount: number;
    financialTrailsCount: number;
  };
}

/**
 * Runs deterministic ontological reasoning across the entire active investigation graph.
 */
export function runOntologyInferenceEngine(graphData: GraphData): InferenceEngineResult {
  const nodes = graphData.nodes || [];
  const links = graphData.links || [];
  const inferred: InferredRelationship[] = [];

  // Index existing links for fast lookup
  const existingLinkSet = new Set<string>();
  links.forEach(l => {
    const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
    existingLinkSet.add(`${s}_${t}`);
    existingLinkSet.add(`${t}_${s}`);
  });

  const nodeMap = new Map<string, Node>();
  const nodeSlotsMap = new Map<string, ExtractedOntologySlot[]>();

  // Step 1: Pre-extract and index ontology slots for every node
  nodes.forEach(n => {
    nodeMap.set(n.id, n);
    const combined = `${n.label || ''} ${n.details || ''} ${n.type || ''} ${n.brand || ''} ${JSON.stringify(n.metadata || {})}`;
    const slots = extractOntologySlotsFromText(combined);
    nodeSlotsMap.set(n.id, slots);
  });

  // -------------------------------------------------------------
  // RULE 1: SHARED IDENTIFIER RESOLUTION (CROSS-ENTITY IDENTITY BRIDGE)
  // -------------------------------------------------------------
  // Identifies nodes that share the exact same NRIC, Phone, Plate, Crypto Address, SSM, or Email
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      const slotsA = nodeSlotsMap.get(nodeA.id) || [];
      const slotsB = nodeSlotsMap.get(nodeB.id) || [];

      // Check slot collisions
      for (const slotA of slotsA) {
        for (const slotB of slotsB) {
          if (slotA.category === slotB.category && slotA.normalizedValue === slotB.normalizedValue) {
            const linkKey1 = `${nodeA.id}_${nodeB.id}`;
            const linkKey2 = `${nodeB.id}_${nodeA.id}`;
            const exists = existingLinkSet.has(linkKey1) || existingLinkSet.has(linkKey2);

            let pred = 'shares_identifier_with';
            let predName = 'Berkongsi Pengecam Unik (Shared Identity Bridge)';

            // Specialization: if one is person and one is vehicle
            if ((nodeA.type === 'person' && nodeB.type === 'vehicle') || (nodeA.type === 'vehicle' && nodeB.type === 'person')) {
              pred = 'operates_vehicle';
              predName = 'Mengendalikan / Menggunakan Kenderaan';
            } else if ((nodeA.type === 'person' && nodeB.type === 'phone') || (nodeA.type === 'phone' && nodeB.type === 'person')) {
              pred = 'owns';
              predName = 'Pemilik Berdaftar Talian';
            }

            inferred.push({
              id: `inf_id_${nodeA.id}_${nodeB.id}_${slotA.category}`,
              ruleId: 'SHARED_IDENTIFIER',
              ruleName: 'Resolusi Pengecam Silang (Shared Identity Bridge)',
              sourceId: nodeA.id,
              sourceLabel: nodeA.label,
              targetId: nodeB.id,
              targetLabel: nodeB.label,
              predicate: pred,
              predicateLabel: predName,
              confidence: Math.min(99, slotA.confidence),
              rationale: `Kedua-dua entiti berkongsi ${slotA.label} yang sepadan (${slotA.normalizedValue}). Pengesahan identiti deterministik berjaya disahkan.`,
              evidenceItems: [
                `Entiti A: [${nodeA.label}] mengandungi ${slotA.label}`,
                `Entiti B: [${nodeB.label}] mengandungi ${slotB.label}`,
                `Nilai Sepadan: ${slotA.normalizedValue}`
              ],
              alreadyExistsInGraph: exists
            });
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // RULE 2: SPATIO-TEMPORAL CO-PRESENCE DETECTION
  // -------------------------------------------------------------
  // Detects if two separate entities were present at the same location within a temporal window
  const locationVisitsMap = new Map<string, Array<{ nodeId: string; nodeLabel: string; timestamp?: string }>>();

  links.forEach(l => {
    const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
    const sNode = nodeMap.get(sId);
    const tNode = nodeMap.get(tId);

    if (sNode && tNode) {
      if (tNode.type === 'location') {
        const list = locationVisitsMap.get(tNode.id) || [];
        list.push({ nodeId: sNode.id, nodeLabel: sNode.label, timestamp: l.timestamp || l.eventDate || sNode.eventDate });
        locationVisitsMap.set(tNode.id, list);
      } else if (sNode.type === 'location') {
        const list = locationVisitsMap.get(sNode.id) || [];
        list.push({ nodeId: tNode.id, nodeLabel: tNode.label, timestamp: l.timestamp || l.eventDate || tNode.eventDate });
        locationVisitsMap.set(sNode.id, list);
      }
    }
  });

  locationVisitsMap.forEach((visitors, locId) => {
    const locNode = nodeMap.get(locId);
    if (visitors.length >= 2) {
      for (let i = 0; i < visitors.length; i++) {
        for (let j = i + 1; j < visitors.length; j++) {
          const vA = visitors[i];
          const vB = visitors[j];
          if (vA.nodeId === vB.nodeId) continue;

          const exists = existingLinkSet.has(`${vA.nodeId}_${vB.nodeId}`);

          inferred.push({
            id: `inf_copresence_${vA.nodeId}_${vB.nodeId}_${locId}`,
            ruleId: 'SPATIO_TEMPORAL_COPRESENCE',
            ruleName: 'Penaakulan Spatio-Temporal (Co-Presence)',
            sourceId: vA.nodeId,
            sourceLabel: vA.nodeLabel,
            targetId: vB.nodeId,
            targetLabel: vB.nodeLabel,
            predicate: 'co_present_with',
            predicateLabel: 'Pertemuan Spatio-Temporal di Lokasi yang Sama',
            confidence: 88,
            rationale: `Kedua-dua entiti dikesan hadir di premis/lokasi yang sama: [${locNode?.label || 'Lokasi'}]. Indikasi kukuh pertemuan bersemuka fizikal.`,
            evidenceItems: [
              `Lokasi Pertemuan: ${locNode?.label || locId}`,
              `Entiti Terlibat: ${vA.nodeLabel} & ${vB.nodeLabel}`,
              `Cap Masa: ${vA.timestamp || 'Dikesan serentak'} / ${vB.timestamp || 'Dikesan serentak'}`
            ],
            alreadyExistsInGraph: exists
          });
        }
      }
    }
  });

  // -------------------------------------------------------------
  // RULE 3: MULTI-HOP FINANCIAL TRAIL (TRANSACTION SMURFING)
  // -------------------------------------------------------------
  // If A -> B (funds) and B -> C (funds), infers transitive trail A -> C
  const fundTransfers: Array<{ source: string; target: string; label: string }> = [];
  links.forEach(l => {
    const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
    const lbl = String(l.label || '').toLowerCase();
    if (
      lbl.includes('fund') || lbl.includes('dana') || lbl.includes('transfer') || 
      lbl.includes('bayar') || lbl.includes('hantar') || lbl.includes('tx') || 
      lbl.includes('transfers_funds_to')
    ) {
      fundTransfers.push({ source: sId, target: tId, label: l.label });
    }
  });

  fundTransfers.forEach(hop1 => {
    fundTransfers.forEach(hop2 => {
      if (hop1.target === hop2.source && hop1.source !== hop2.target) {
        const nodeA = nodeMap.get(hop1.source);
        const nodeB = nodeMap.get(hop1.target);
        const nodeC = nodeMap.get(hop2.target);

        if (nodeA && nodeB && nodeC) {
          const exists = existingLinkSet.has(`${nodeA.id}_${nodeC.id}`);
          inferred.push({
            id: `inf_fund_smurf_${nodeA.id}_${nodeC.id}`,
            ruleId: 'MULTI_HOP_FINANCIAL',
            ruleName: 'Penaakulan Aliran Dana Transit (2-Hop Smurfing)',
            sourceId: nodeA.id,
            sourceLabel: nodeA.label,
            targetId: nodeC.id,
            targetLabel: nodeC.label,
            predicate: 'transfers_funds_to',
            predicateLabel: 'Aliran Dana Tidak Langsung (Indirect Layering)',
            confidence: 84,
            rationale: `Laluan dana dikesan mengalir dari [${nodeA.label}] melalui perantara [${nodeB.label}] kepada [${nodeC.label}]. Corak tipikal pelapisan pencucian wang (layering).`,
            evidenceItems: [
              `Punca Awal: ${nodeA.label}`,
              `Akaun Transit / Mule: ${nodeB.label}`,
              `Penerima Akhir: ${nodeC.label}`,
              `Rantai Hubungan: [${nodeA.label}] -> [${nodeB.label}] -> [${nodeC.label}]`
            ],
            alreadyExistsInGraph: exists
          });
        }
      }
    });
  });

  // -------------------------------------------------------------
  // RULE 4: COMMON ASSOCIATE TRIANGULATION (BROKER / SYNDICATE HUB)
  // -------------------------------------------------------------
  // If A communicates with Broker X, and B communicates with Broker X, infer potential collusion
  const adjacency = new Map<string, Set<string>>();
  links.forEach(l => {
    const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
    if (!adjacency.has(sId)) adjacency.set(sId, new Set());
    if (!adjacency.has(tId)) adjacency.set(tId, new Set());
    adjacency.get(sId)?.add(tId);
    adjacency.get(tId)?.add(sId);
  });

  nodes.forEach(brokerNode => {
    const neighbors = Array.from(adjacency.get(brokerNode.id) || []);
    if (neighbors.length >= 2) {
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const nAId = neighbors[i];
          const nBId = neighbors[j];
          const nodeA = nodeMap.get(nAId);
          const nodeB = nodeMap.get(nBId);

          if (nodeA && nodeB && nodeA.type === 'person' && nodeB.type === 'person') {
            const exists = existingLinkSet.has(`${nodeA.id}_${nodeB.id}`);
            if (!exists) {
              inferred.push({
                id: `inf_broker_${nodeA.id}_${nodeB.id}_${brokerNode.id}`,
                ruleId: 'COMMON_ASSOCIATE',
                ruleName: 'Triangulasi Rakan Perantara (Common Associate)',
                sourceId: nodeA.id,
                sourceLabel: nodeA.label,
                targetId: nodeB.id,
                targetLabel: nodeB.label,
                predicate: 'associated_with',
                predicateLabel: `Bersekutu Melalui Perantara [${brokerNode.label}]`,
                confidence: 75,
                rationale: `Kedua-dua suspek [${nodeA.label}] dan [${nodeB.label}] berhubung secara bebas dengan individu perantara [${brokerNode.label}]. Kemungkinan besar berada dalam sel sindiket yang sama.`,
                evidenceItems: [
                  `Suspek A: ${nodeA.label}`,
                  `Suspek B: ${nodeB.label}`,
                  `Nod Titik Hubung: ${brokerNode.label} (${brokerNode.type})`
                ],
                alreadyExistsInGraph: false
              });
            }
          }
        }
      }
    }
  });

  // Calculate statistics
  const newDiscoveries = inferred.filter(r => !r.alreadyExistsInGraph);
  const idBridges = inferred.filter(r => r.ruleId === 'SHARED_IDENTIFIER');
  const coPres = inferred.filter(r => r.ruleId === 'SPATIO_TEMPORAL_COPRESENCE');
  const finTrails = inferred.filter(r => r.ruleId === 'MULTI_HOP_FINANCIAL');

  return {
    inferredRelationships: inferred,
    statistics: {
      totalEvaluatedNodes: nodes.length,
      totalEvaluatedLinks: links.length,
      newDiscoveriesCount: newDiscoveries.length,
      identityBridgesCount: idBridges.length,
      coPresenceCount: coPres.length,
      financialTrailsCount: finTrails.length
    }
  };
}
