import { Node, Link, GraphData, DecisionProvenance, SynthesisResult, ProvenanceCategory } from '../types';

/**
 * Semantica Provenance Engine
 * Translates AI conclusions, hypotheses, and strategic synthesis verdicts into
 * first-class graph decision nodes with W3C PROV-O inspired evidence links (evidenced_by, contradicts, smoking_gun).
 */

export function createDecisionProvenance(
  title: string,
  verdict: string,
  rationale: string,
  supportingNodeIds: string[],
  category: ProvenanceCategory = 'CORRELATION',
  confidence: number = 85,
  contradictingNodeIds: string[] = [],
  suggestedAction: string = ''
): DecisionProvenance {
  const cleanId = `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: cleanId,
    title,
    verdict,
    confidence,
    rationale,
    timestamp: new Date().toISOString(),
    supportingNodeIds,
    contradictingNodeIds,
    ruleOrModelUsed: 'Gemini 3.1 Pro / Semantica PROV-O Engine',
    category,
    suggestedAction: suggestedAction || 'Sahkan pautan bukti fizikal atau geoint tambahan.'
  };
}

/**
 * Automatically extracts structured Semantica Provenance Findings from a SynthesisResult
 * if the synthesis did not already provide explicit findings.
 */
export function extractProvenanceFromSynthesis(
  synthesis: SynthesisResult,
  nodes: Node[]
): DecisionProvenance[] {
  if (synthesis.provenanceFindings && synthesis.provenanceFindings.length > 0) {
    return synthesis.provenanceFindings;
  }

  const findings: DecisionProvenance[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 1. Primary Smoking Gun Provenance Decision
  if (synthesis.smokingGun && synthesis.smokingGun !== 'N/A') {
    // Find nodes mentioned in smoking gun or relevant types
    const matchedEvidenceIds: string[] = [];
    const lowerGun = synthesis.smokingGun.toLowerCase();
    
    nodes.forEach(n => {
      if (
        lowerGun.includes(n.label.toLowerCase()) || 
        (n.type === 'phone' && lowerGun.includes('telefon')) ||
        (n.type === 'email' && lowerGun.includes('emel')) ||
        (n.type === 'vault' && lowerGun.includes('databreach'))
      ) {
        matchedEvidenceIds.push(n.id);
      }
    });

    // If none specifically mentioned, pick highest confidence nodes
    if (matchedEvidenceIds.length === 0 && nodes.length > 0) {
      matchedEvidenceIds.push(...nodes.slice(0, Math.min(3, nodes.length)).map(n => n.id));
    }

    findings.push({
      id: `prov_smoking_gun_${Date.now()}`,
      title: `Bukti Kukuh (Smoking Gun): ${synthesis.verdict || 'Anomali Kritikal'}`,
      verdict: synthesis.smokingGun,
      confidence: Math.max(synthesis.confidenceScore || 80, 85),
      rationale: `AI mengenalpasti bukti ini sebagai titik penentu utama dalam penyiasatan berdasarkan analisis silang graf.`,
      timestamp: new Date().toISOString(),
      supportingNodeIds: Array.from(new Set(matchedEvidenceIds)),
      ruleOrModelUsed: 'Semantica Provenance Core / PROV-O',
      category: 'ATTRIBUTION',
      suggestedAction: synthesis.suggestedNextSteps || 'Jalankan pengesahan forensik langsung pada nod bukti terbabit.'
    });
  }

  // 2. Extract Reasoning Steps as Sub-Hypotheses
  if (synthesis.reasoning && Array.isArray(synthesis.reasoning)) {
    synthesis.reasoning.forEach((reason, idx) => {
      if (!reason || reason.trim().length < 5) return;
      const lowerR = reason.toLowerCase();
      const matchedIds: string[] = [];
      
      nodes.forEach(n => {
        if (lowerR.includes(n.label.toLowerCase())) {
          matchedIds.push(n.id);
        }
      });

      if (matchedIds.length === 0 && nodes[idx % nodes.length]) {
        matchedIds.push(nodes[idx % nodes.length].id);
      }

      findings.push({
        id: `prov_infer_${Date.now()}_${idx}`,
        title: `Inferens Keputusan #${idx + 1}`,
        verdict: reason,
        confidence: Math.max(65, (synthesis.confidenceScore || 75) - (idx * 5)),
        rationale: `Inferens deduktif yang terhasil daripada topologi hubungan entiti graf.`,
        timestamp: new Date().toISOString(),
        supportingNodeIds: Array.from(new Set(matchedIds)),
        ruleOrModelUsed: 'Semantica Rule Engine / Gemini 3.1 Pro',
        category: idx % 2 === 0 ? 'CORRELATION' : 'TIMELINE_INFERENCE',
        suggestedAction: 'Semak salasilah rantaian bukti berkaitan.'
      });
    });
  }

  return findings;
}

/**
 * Generates a full Graph Node & connected Links for a single Decision Provenance item.
 */
export function generateProvenanceNodeAndLinks(
  finding: DecisionProvenance,
  existingNodes: Node[],
  offsetIndex: number = 0
): { node: Node; links: Link[] } {
  const nodeId = `decision_${finding.id}`;
  
  // Calculate a strategic position near the center or near supporting evidence nodes
  let avgX = 0;
  let avgY = 0;
  let validCount = 0;

  finding.supportingNodeIds.forEach(id => {
    const target = existingNodes.find(n => n.id === id);
    if (target && typeof target.x === 'number' && typeof target.y === 'number') {
      avgX += target.x;
      avgY += target.y;
      validCount++;
    }
  });

  const posX = validCount > 0 ? (avgX / validCount) + (offsetIndex * 45) : 0;
  const posY = validCount > 0 ? (avgY / validCount) - 120 - (offsetIndex * 30) : -100;

  // Formulate markdown-rich details
  const supportingLabels = finding.supportingNodeIds
    .map(id => existingNodes.find(n => n.id === id)?.label || id)
    .join(', ');

  const detailsMarkdown = [
    `[SEMANTICA PROVENANCE DECISION NODE]`,
    `----------------------------------------`,
    `Kategori: ${finding.category}`,
    `Tahap Keyakinan: ${finding.confidence}%`,
    `Enjin / Model: ${finding.ruleOrModelUsed || 'Semantica PROV-O Engine'}`,
    `Masa Penjanaan: ${new Date(finding.timestamp || Date.now()).toLocaleString()}`,
    `----------------------------------------`,
    `KEPUTUSAN / HIPOTESIS:`,
    finding.verdict,
    ``,
    `RASIONAL & LOGIK INFERENS:`,
    finding.rationale,
    ``,
    `RANTAIAN BUKTI SOKONGAN (EVIDENCE LINEAGE):`,
    supportingLabels || 'Semua nod terhubung dalam kelompok graf.',
    ``,
    `CADANGAN TINDAKAN PENYIASAT:`,
    finding.suggestedAction || 'Sahkan integriti data dengan rekod rasmi.'
  ].join('\n');

  const provenanceNode: Node = {
    id: nodeId,
    label: `🔮 ${finding.title.length > 28 ? finding.title.substring(0, 26) + '...' : finding.title}`,
    type: 'hypothesis',
    details: detailsMarkdown,
    confidenceScore: finding.confidence,
    confidenceLevel: finding.confidence >= 80 ? 'HIGH' : (finding.confidence >= 60 ? 'MEDIUM' : 'LOW'),
    verificationStatus: 'VERIFIED',
    provenanceData: finding,
    x: posX,
    y: posY,
    sources: [
      {
        sourceName: finding.ruleOrModelUsed || 'Semantica Intelligence Model',
        timestamp: finding.timestamp || new Date().toISOString(),
        details: finding.rationale
      }
    ]
  };

  const links: Link[] = [];

  // Create links from this Decision Node to all supporting evidence nodes
  finding.supportingNodeIds.forEach(evidenceId => {
    if (existingNodes.some(n => n.id === evidenceId)) {
      links.push({
        source: nodeId,
        target: evidenceId,
        label: finding.category === 'ATTRIBUTION' ? 'smoking_gun' : 'evidenced_by'
      });
    }
  });

  // Create links to contradicting nodes if any
  if (finding.contradictingNodeIds && finding.contradictingNodeIds.length > 0) {
    finding.contradictingNodeIds.forEach(contraId => {
      if (existingNodes.some(n => n.id === contraId)) {
        links.push({
          source: nodeId,
          target: contraId,
          label: 'contradicts'
        });
      }
    });
  }

  return { node: provenanceNode, links };
}

/**
 * Applies multiple provenance findings into an existing GraphData, avoiding duplicates.
 */
export function applyProvenanceFindingsToGraph(
  findings: DecisionProvenance[],
  graphData: GraphData
): { updatedNodes: Node[]; updatedLinks: Link[]; addedCount: number } {
  const currentNodes = [...(graphData.nodes || [])];
  const currentLinks = [...(graphData.links || [])];
  let addedCount = 0;

  findings.forEach((finding, idx) => {
    const expectedNodeId = `decision_${finding.id}`;
    const alreadyExists = currentNodes.some(n => n.id === expectedNodeId);

    if (!alreadyExists) {
      const { node, links } = generateProvenanceNodeAndLinks(finding, currentNodes, idx);
      currentNodes.push(node);
      currentLinks.push(...links);
      addedCount++;
    }
  });

  return {
    updatedNodes: currentNodes,
    updatedLinks: currentLinks,
    addedCount
  };
}
