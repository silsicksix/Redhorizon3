/**
 * RED HORIZON - DEAD END DETECTOR & AUTO-HEALER
 * Identifies investigation roadblocks, isolated data islands, ambiguous links,
 * and eliminates dead ends using ontological reasoning.
 */

import { Node, Link, GraphData } from '../types';
import { extractOntologySlotsFromText } from './ontologyNormalizer';
import { ONTOLOGY_CLASSES, ONTOLOGY_PREDICATES } from './ontologySchema';

export type DeadEndType = 
  | 'ISOLATED_ORPHAN'            // Nod terpencil tanpa sebarang pautan
  | 'UNSTRUCTURED_MANUAL_DATA'   // Maklumat terperangkap dalam teks mentah tanpa slot ontologi
  | 'AMORPHOUS_LINK'             // Pautan gelap tanpa makna semantik (hanya 'connected_to')
  | 'UNVERIFIED_SINGLE_SOURCE'   // Sasaran berisiko tinggi tetapi tiada sokongan silang
  | 'MISSING_TARGET_IDENTIFIERS' // Entiti tanpa nombor telefon, NRIC atau akaun
  | 'PENDING_ENRICHER_PIVOT';    // Entiti sedia diperluaskan tetapi penganalisis belum menjalankan tool

export interface DeadEndIssue {
  id: string;
  type: DeadEndType;
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY';
  title: string;
  description: string;
  affectedNodeIds: string[];
  affectedLinkIndices?: number[];
  recommendation: string;
  autoFixAvailable: boolean;
  fixActionLabel?: string;
}

export interface DeadEndAuditReport {
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  opportunityCount: number;
  issues: DeadEndIssue[];
  healthScore: number; // 0 - 100 (100 = Kalis Ralat & Tiada Dead End)
}

/**
 * Audits the current graph to expose all reasons why an investigation hits a dead end.
 */
export function auditInvestigationDeadEnds(graphData: GraphData): DeadEndAuditReport {
  const nodes = graphData.nodes || [];
  const links = graphData.links || [];
  const issues: DeadEndIssue[] = [];

  // Compute node degree
  const degreeMap = new Map<string, number>();
  nodes.forEach(n => degreeMap.set(n.id, 0));

  links.forEach(l => {
    const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
    degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
    degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
  });

  // 1. Detect Isolated Orphan Nodes
  nodes.forEach(n => {
    const deg = degreeMap.get(n.id) || 0;
    if (deg === 0) {
      issues.push({
        id: `deadend_orphan_${n.id}`,
        type: 'ISOLATED_ORPHAN',
        severity: 'CRITICAL',
        title: `Nod Terpencil Tanpa Hubungan: [${n.label}]`,
        description: `Entiti ini berdiri bersendirian di kanvas tanpa sebarang kaitan dengan rangkaian kes. Siasatan terhenti kerana ketiadaan konteks hubungan.`,
        affectedNodeIds: [n.id],
        recommendation: `Jalankan Enjin Inferens atau gunakan 'Modular Enricher Hub' untuk membongkar entiti sekutu bagi [${n.label}].`,
        autoFixAvailable: true,
        fixActionLabel: 'Kesan Kaitan Secara Automatik'
      });
    }
  });

  // 2. Detect Unstructured Manual Data (Information trapped in free-text)
  nodes.forEach(n => {
    const combined = `${n.label || ''} ${n.details || ''}`;
    const slots = extractOntologySlotsFromText(combined);
    
    // Check if node has extracted slots that haven't been promoted or used as typed nodes
    if (slots.length > 0 && (!n.metadata?.ontologySlots || n.metadata.ontologySlots.length === 0)) {
      const slotSummary = slots.map(s => s.label).join(', ');
      issues.push({
        id: `deadend_unstructured_${n.id}`,
        type: 'UNSTRUCTURED_MANUAL_DATA',
        severity: 'CRITICAL',
        title: `Maklumat Risikan Terperangkap Dalam Teks: [${n.label}]`,
        description: `Entiti ini mengandungi maklumat penting yang belum distrukturkan: (${slotSummary}). Enricher dan modul carian automatik tidak dapat memproses maklumat ini secara langsung.`,
        affectedNodeIds: [n.id],
        recommendation: `Pecahkan atribut ini ke dalam Slot Ontologi Rasmi atau jana sub-nod automatik (Telefon, NRIC, Plat Kenderaan).`,
        autoFixAvailable: true,
        fixActionLabel: 'Strukturkan Atribut Ontologi'
      });
    }
  });

  // 3. Detect Amorphous Links (Generic / Blind links)
  links.forEach((l, idx) => {
    const rawLabel = String(l.label || '').trim().toLowerCase();
    if (!rawLabel || rawLabel === 'connected_to' || rawLabel === 'link' || rawLabel === 'connected') {
      const s = typeof l.source === 'object' ? (l.source as any).label || (l.source as any).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as any).label || (l.target as any).id : l.target;
      issues.push({
        id: `deadend_link_${idx}`,
        type: 'AMORPHOUS_LINK',
        severity: 'WARNING',
        title: `Hubungan Gelap / Tanpa Semantik: [${s}] ↔ [${t}]`,
        description: `Pautan hanya dilabelkan sebagai '${l.label || 'tanpa label'}'. Komputer tidak dapat membezakan sama ada ini hubungan kewangan, pemilikan, atau komunikasi.`,
        affectedNodeIds: [],
        affectedLinkIndices: [idx],
        recommendation: `Tingkatkan hubungan ini ke predikat ontologi yang sah (cth: 'transfers_funds_to', 'owns', 'communicates_with').`,
        autoFixAvailable: true,
        fixActionLabel: 'Gunakan Predikat Semantik Piawai'
      });
    }
  });

  // 4. Missing Critical Identifiers on Person of Interest (POI)
  nodes.forEach(n => {
    if (n.type === 'person') {
      const combined = `${n.label || ''} ${n.details || ''}`;
      const slots = extractOntologySlotsFromText(combined);
      const hasPhone = slots.some(s => s.category === 'PHONE');
      const hasNric = slots.some(s => s.category === 'NRIC');
      
      if (!hasPhone && !hasNric && (!n.aliases || n.aliases.length === 0)) {
        issues.push({
          id: `deadend_no_id_${n.id}`,
          type: 'MISSING_TARGET_IDENTIFIERS',
          severity: 'WARNING',
          title: `Sasaran POI Kekurangan Pengecam Utama: [${n.label}]`,
          description: `Sasaran individu ini tidak mempunyai No. Telefon, MyKad, atau Alias yang disahkan. Pencarian data terbuka akan menghasilkan terlalu banyak false-positive.`,
          affectedNodeIds: [n.id],
          recommendation: `Jalankan modul 'De-obfuscate Alias' atau masukkan nombor telefon suspek untuk membuka jalan siasatan.`,
          autoFixAvailable: false,
          fixActionLabel: 'Buka Profiler POI'
        });
      }
    }
  });

  // 5. Pending High-Value Enricher Opportunities
  nodes.forEach(n => {
    const classDef = ONTOLOGY_CLASSES[n.type];
    if (classDef && classDef.suggestedPivots.length > 0) {
      const deg = degreeMap.get(n.id) || 0;
      if (deg <= 2) {
        const topPivot = classDef.suggestedPivots[0];
        issues.push({
          id: `deadend_pivot_${n.id}`,
          type: 'PENDING_ENRICHER_PIVOT',
          severity: 'OPPORTUNITY',
          title: `Peluang Pembongkaran Baharu: [${n.label}]`,
          description: `Nod bertipe '${classDef.label}' sedia untuk dikembangkan dengan modul risikan [${topPivot.label}].`,
          affectedNodeIds: [n.id],
          recommendation: topPivot.description,
          autoFixAvailable: false,
          fixActionLabel: `Jalankan ${topPivot.label}`
        });
      }
    }
  });

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;
  const opportunityCount = issues.filter(i => i.severity === 'OPPORTUNITY').length;

  // Calculate health score: 100 - (critical * 15) - (warning * 5)
  let healthScore = 100 - (criticalCount * 18) - (warningCount * 6);
  if (nodes.length === 0) healthScore = 100;
  healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

  return {
    totalIssues: issues.length,
    criticalCount,
    warningCount,
    opportunityCount,
    issues,
    healthScore
  };
}

/**
 * Automatically structures unstructured text and updates node metadata to eliminate dead ends.
 */
export function autoStructurizeNodeSlots(node: Node): { updatedNode: Node; generatedSubNodes: Node[]; generatedLinks: Link[] } {
  const combined = `${node.label || ''} ${node.details || ''}`;
  const slots = extractOntologySlotsFromText(combined);

  const updatedNode: Node = {
    ...node,
    metadata: {
      ...(node.metadata || {}),
      ontologySlots: slots,
      isOntologyNormalized: true,
      lastNormalizedAt: new Date().toISOString()
    }
  };

  const generatedSubNodes: Node[] = [];
  const generatedLinks: Link[] = [];

  // Generate linked sub-nodes for high confidence identifiers (Phone, Plate, Crypto, NRIC)
  slots.forEach((slot, sIdx) => {
    let subNodeType = 'entity';
    let predLabel = 'shares_identifier_with';
    let subLabel = slot.normalizedValue;

    if (slot.category === 'PHONE') {
      subNodeType = 'phone';
      predLabel = 'owns';
      subLabel = slot.normalizedValue;
    } else if (slot.category === 'PLATE') {
      subNodeType = 'vehicle';
      predLabel = 'operates_vehicle';
      subLabel = slot.normalizedValue;
    } else if (slot.category === 'CRYPTO') {
      subNodeType = 'crypto';
      predLabel = 'owns';
      subLabel = slot.normalizedValue;
    } else if (slot.category === 'NRIC') {
      subNodeType = 'personal_id';
      predLabel = 'shares_identifier_with';
      subLabel = slot.metadata?.formatted || slot.normalizedValue;
    }

    const subId = `sub_${slot.category.toLowerCase()}_${slot.normalizedValue.replace(/[^a-zA-Z0-9]/g, '_')}`;

    generatedSubNodes.push({
      id: subId,
      label: subLabel,
      type: subNodeType,
      details: `Diekstrak secara automatik melalui Enjin Ontologi dari [${node.label}]. Kategori: ${slot.category}`,
      confidenceScore: slot.confidence,
      sourceType: 'ontology_extractor',
      timestamp: new Date().toISOString()
    });

    generatedLinks.push({
      source: node.id,
      target: subId,
      label: predLabel,
      timestamp: new Date().toISOString()
    });
  });

  return { updatedNode, generatedSubNodes, generatedLinks };
}
