import { Node, Link, GraphData } from '../types';

/**
 * Calculates confidence score (0 - 100%) and level for an OSINT entity node.
 */
export const calculateConfidence = (node: Partial<Node>): { score: number; level: 'HIGH' | 'MEDIUM' | 'LOW' } => {
  let score = 30; // Base score for raw unverified node

  // Source count boost
  const sourceCount = node.sources ? node.sources.length : 0;
  if (sourceCount >= 3) score += 30;
  else if (sourceCount === 2) score += 20;
  else if (sourceCount === 1) score += 10;

  // Vault/Database match
  if (node.vaultMatch) score += 25;

  // Verified Status
  if (node.verificationStatus === 'VERIFIED') score += 20;
  else if (node.verificationStatus === 'DISPUTED') score -= 25;

  // Rich media / valid profile URL boost
  if (node.url && node.url.startsWith('http')) score += 10;
  if ((node.imageUrls && node.imageUrls.length > 0) || (node.imageUrl && node.imageUrl.length > 0)) score += 10;
  if (node.details && node.details.length > 50) score += 5;

  // Clamp score between 0 and 100
  const finalScore = Math.max(5, Math.min(100, score));

  let level: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (finalScore >= 75) level = 'HIGH';
  else if (finalScore >= 45) level = 'MEDIUM';

  return { score: finalScore, level };
};

/**
 * Normalizes a string for fuzzy entity matching (lowercased, stripped punctuation).
 */
const normalizeString = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

export interface DuplicateCandidate {
  primaryNode: Node;
  candidateNodes: Node[];
  similarityReason: string;
}

/**
 * Detects duplicate nodes in the graph based on exact label, URL match, or fuzzy handle match.
 */
export const findDuplicateCandidates = (nodes: Node[]): DuplicateCandidate[] => {
  const duplicates: DuplicateCandidate[] = [];
  const processedIds = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    if (processedIds.has(nodeA.id)) continue;

    const normA = normalizeString(nodeA.label);
    if (!normA) continue;

    const candidateMatches: { node: Node; reason: string }[] = [];

    for (let j = i + 1; j < nodes.length; j++) {
      const nodeB = nodes[j];
      if (processedIds.has(nodeB.id)) continue;

      const normB = normalizeString(nodeB.label);

      // Rule 1: Exact normalized label match
      if (normA === normB && normA.length > 2) {
        candidateMatches.push({ node: nodeB, reason: `Exact label match: "${nodeA.label}"` });
      }
      // Rule 2: Same direct URL
      else if (nodeA.url && nodeB.url && nodeA.url.trim().toLowerCase() === nodeB.url.trim().toLowerCase() && nodeA.url.length > 10) {
        candidateMatches.push({ node: nodeB, reason: `Matching URL: "${nodeA.url}"` });
      }
      // Rule 3: Label contained within another with same type (e.g. "Future Soldier" and "Future Soldier (Facebook)")
      else if (nodeA.type === nodeB.type && (normA.includes(normB) || normB.includes(normA)) && Math.min(normA.length, normB.length) > 4) {
        candidateMatches.push({ node: nodeB, reason: `Sub-string handle match (${nodeA.label} / ${nodeB.label})` });
      }
    }

    if (candidateMatches.length > 0) {
      processedIds.add(nodeA.id);
      candidateMatches.forEach(c => processedIds.add(c.node.id));

      duplicates.push({
        primaryNode: nodeA,
        candidateNodes: candidateMatches.map(c => c.node),
        similarityReason: candidateMatches[0].reason
      });
    }
  }

  return duplicates;
};

/**
 * Merges multiple secondary nodes into a primary target node without losing data provenance.
 */
export const mergeNodes = (
  primaryNode: Node,
  secondaryNodes: Node[],
  allLinks: Link[]
): { mergedNode: Node; updatedLinks: Link[]; removedNodeIds: string[] } => {
  const removedIds = secondaryNodes.map(n => n.id);
  const secondaryMap = new Set(removedIds);

  // Combine aliases
  const aliasSet = new Set<string>(primaryNode.aliases || []);
  if (primaryNode.label) aliasSet.add(primaryNode.label);
  secondaryNodes.forEach(s => {
    if (s.label) aliasSet.add(s.label);
    if (s.aliases) s.aliases.forEach(a => aliasSet.add(a));
  });

  // Combine details
  let mergedDetails = primaryNode.details || '';
  secondaryNodes.forEach(s => {
    if (s.details && !mergedDetails.includes(s.details)) {
      mergedDetails += `\n[Merged Record (${s.label})]: ${s.details}`;
    }
  });

  // Combine image URLs
  const imgSet = new Set<string>(primaryNode.imageUrls || []);
  if (primaryNode.imageUrl) imgSet.add(primaryNode.imageUrl);
  secondaryNodes.forEach(s => {
    if (s.imageUrl) imgSet.add(s.imageUrl);
    if (s.imageUrls) s.imageUrls.forEach(img => imgSet.add(img));
  });

  // Combine sources/provenance
  const sourcesList = [...(primaryNode.sources || [])];
  if (sourcesList.length === 0) {
    sourcesList.push({
      sourceName: primaryNode.sourceType || 'Manual Entry',
      timestamp: new Date().toISOString(),
      url: primaryNode.url,
      details: 'Initial target entity'
    });
  }

  secondaryNodes.forEach(s => {
    if (s.sources && s.sources.length > 0) {
      s.sources.forEach(src => sourcesList.push(src));
    } else {
      sourcesList.push({
        sourceName: s.sourceType || 'Merge Fusion',
        timestamp: new Date().toISOString(),
        url: s.url,
        details: `Merged from entity ${s.label}`
      });
    }
  });

  const mergedFrom = [...(primaryNode.mergedFromIds || []), ...removedIds];

  const candidateMergedNode: Node = {
    ...primaryNode,
    details: mergedDetails.trim(),
    imageUrls: Array.from(imgSet),
    imageUrl: Array.from(imgSet)[0] || primaryNode.imageUrl,
    aliases: Array.from(aliasSet),
    sources: sourcesList,
    mergedFromIds: mergedFrom,
    vaultMatch: primaryNode.vaultMatch || secondaryNodes.some(s => s.vaultMatch)
  };

  // Recalculate confidence rating
  const { score, level } = calculateConfidence(candidateMergedNode);
  const mergedNode: Node = {
    ...candidateMergedNode,
    confidenceScore: score,
    confidenceLevel: level,
    verificationStatus: candidateMergedNode.verificationStatus || (score >= 75 ? 'VERIFIED' : 'UNVERIFIED')
  };

  // Rewire links
  const updatedLinks: Link[] = [];
  const linkKeySet = new Set<string>();

  allLinks.forEach(link => {
    const sourceId = typeof link.source === 'object' ? (link.source as Node).id : link.source;
    const targetId = typeof link.target === 'object' ? (link.target as Node).id : link.target;

    const newSource = secondaryMap.has(sourceId) ? primaryNode.id : sourceId;
    const newTarget = secondaryMap.has(targetId) ? primaryNode.id : targetId;

    // Avoid self-loops
    if (newSource === newTarget) return;

    const pairKey = `${newSource}_${newTarget}_${link.label}`;
    if (!linkKeySet.has(pairKey)) {
      linkKeySet.add(pairKey);
      updatedLinks.push({
        source: newSource,
        target: newTarget,
        label: link.label,
        isVault: link.isVault
      });
    }
  });

  return {
    mergedNode,
    updatedLinks,
    removedNodeIds: removedIds
  };
};

/**
 * Auto-fuses exact duplicates across a full graph dataset.
 */
export const autoResolveAndFuseGraph = (graph: GraphData): { updatedGraph: GraphData; mergeCount: number } => {
  const candidates = findDuplicateCandidates(graph.nodes);
  if (candidates.length === 0) {
    return { updatedGraph: graph, mergeCount: 0 };
  }

  let currentNodes = [...graph.nodes];
  let currentLinks = [...graph.links];
  let totalMerged = 0;

  for (const candidate of candidates) {
    // Re-verify candidate still exists in currentNodes
    const primaryExists = currentNodes.some(n => n.id === candidate.primaryNode.id);
    const validSecondaries = candidate.candidateNodes.filter(c => currentNodes.some(n => n.id === c.id));

    if (primaryExists && validSecondaries.length > 0) {
      const primaryNode = currentNodes.find(n => n.id === candidate.primaryNode.id)!;
      const { mergedNode, updatedLinks, removedNodeIds } = mergeNodes(primaryNode, validSecondaries, currentLinks);

      const removedSet = new Set(removedNodeIds);
      currentNodes = currentNodes.filter(n => !removedSet.has(n.id) && n.id !== mergedNode.id);
      currentNodes.push(mergedNode);
      currentLinks = updatedLinks;
      totalMerged += validSecondaries.length;
    }
  }

  return {
    updatedGraph: { nodes: currentNodes, links: currentLinks },
    mergeCount: totalMerged
  };
};
