import { Node, Link, GraphData } from '../types';
import { isLocationNode } from './geoUtils';

/**
 * Normalizes an entity label or identifier for syntactic & semantic equality comparison.
 */
export function normalizeEntityKey(labelOrStr: string | null | undefined): string {
  if (!labelOrStr) return '';
  return String(labelOrStr)
    .trim()
    .toLowerCase()
    .replace(/^["']|["']$/g, '') // remove surrounding quotes
    .replace(/\s+/g, ' ');       // normalize multiple spaces
}

/**
 * Normalizes phone numbers for exact comparison (e.g., "+60 12-345 6789" -> "60123456789" / "0123456789").
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  // If starts with country code like 601, also allow matching 01
  if (digits.startsWith('60') && digits.length > 9) {
    return digits.substring(2); // '123456789'
  }
  if (digits.startsWith('0') && digits.length > 8) {
    return digits.substring(1); // '123456789'
  }
  return digits;
}

/**
 * Normalizes URLs for comparison (stripping protocol and trailing slashes).
 */
export function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  return String(url)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

/**
 * Extracts unique identifiers from node properties or details (e.g., FB_ID, PROFILE_URL, emails, phone numbers).
 */
export function extractNodeIdentifiers(node: Partial<Node>): {
  normalizedLabel: string;
  normalizedUrl: string;
  normalizedPhone: string;
  normalizedEmail: string;
  fbId?: string;
  username?: string;
} {
  const label = normalizeEntityKey(node.label || (node as any).name || (node as any).title);
  const url = normalizeUrl(node.url);
  let phone = '';
  let email = '';
  let fbId = '';
  let username = '';

  const details = String(node.details || '');

  // Check email
  if (node.type === 'email' || label.includes('@')) {
    email = label.replace(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, (m) => m.toLowerCase());
  }
  const emailMatch = details.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
  if (!email && emailMatch) {
    email = emailMatch[1].toLowerCase().trim();
  }

  // Check phone
  if (node.type === 'phone' || /^[+\d\s\-()]{7,}$/.test(label)) {
    phone = normalizePhoneNumber(label);
  }
  const phoneMatch = details.match(/(?:PHONE|TEL|HP|NO_TEL|Phone):\s*([+\d\s\-()]+)/i);
  if (!phone && phoneMatch) {
    phone = normalizePhoneNumber(phoneMatch[1]);
  }

  // Check FB_ID
  const fbMatch = details.match(/FB_ID:\s*([0-9a-zA-Z._-]+)/i);
  if (fbMatch && fbMatch[1] !== 'N/A' && fbMatch[1] !== 'unknown') {
    fbId = fbMatch[1].trim();
  }

  // Check Profile URL
  const profileUrlMatch = details.match(/PROFILE_URL:\s*(https?:\/\/[^\s\n]+)/i);
  const effectiveUrl = url || (profileUrlMatch ? normalizeUrl(profileUrlMatch[1]) : '');

  return {
    normalizedLabel: label,
    normalizedUrl: effectiveUrl,
    normalizedPhone: phone,
    normalizedEmail: email,
    fbId: fbId || undefined,
    username: username || undefined,
  };
}

/**
 * Checks if two nodes represent the same entity / have identical syntax or identifiers.
 */
export function areNodesSyntacticallyEqual(nodeA: Partial<Node>, nodeB: Partial<Node>): boolean {
  if (!nodeA || !nodeB) return false;

  // 1. Direct ID match
  if (nodeA.id && nodeB.id && String(nodeA.id).trim() === String(nodeB.id).trim()) {
    return true;
  }

  const idA = extractNodeIdentifiers(nodeA);
  const idB = extractNodeIdentifiers(nodeB);

  // 2. Direct exact label match (case-insensitive & trimmed)
  if (idA.normalizedLabel && idB.normalizedLabel && idA.normalizedLabel === idB.normalizedLabel) {
    return true;
  }

  // 3. Clean Alphanumeric label match (ignoring punctuation, spaces, brackets)
  const alphaA = idA.normalizedLabel.replace(/[^a-z0-9]/g, '');
  const alphaB = idB.normalizedLabel.replace(/[^a-z0-9]/g, '');
  if (alphaA && alphaB && alphaA.length >= 3 && alphaA === alphaB) {
    return true;
  }

  // 4. Email match
  if (idA.normalizedEmail && idB.normalizedEmail && idA.normalizedEmail === idB.normalizedEmail) {
    return true;
  }

  // 5. Phone number match
  if (idA.normalizedPhone && idB.normalizedPhone && idA.normalizedPhone.length >= 7 && idA.normalizedPhone === idB.normalizedPhone) {
    return true;
  }

  // 6. FB_ID match
  if (idA.fbId && idB.fbId && idA.fbId === idB.fbId) {
    return true;
  }

  // 7. Direct matching URL or Profile URL (excluding generic homepage URLs)
  if (idA.normalizedUrl && idB.normalizedUrl && idA.normalizedUrl === idB.normalizedUrl && idA.normalizedUrl.length > 5) {
    // Exclude generic search root URLs
    if (!idA.normalizedUrl.includes('google.com') && !idA.normalizedUrl.includes('facebook.com/search')) {
      return true;
    }
  }

  // 8. Identical Details/Syntax match
  if (nodeA.details && nodeB.details) {
    const cleanDetA = String(nodeA.details).trim().toLowerCase();
    const cleanDetB = String(nodeB.details).trim().toLowerCase();
    if (cleanDetA && cleanDetB && cleanDetA === cleanDetB) {
      return true;
    }
  }

  return false;
}

/**
 * Merges properties of an incoming node into an existing node without creating duplicates.
 */
export function mergeNodeData(target: Node, incoming: Partial<Node>): Node {
  const merged: Node = { ...target };
  const isDirectIdMatch = Boolean(target.id && incoming.id && String(target.id).trim() === String(incoming.id).trim());

  // 1. Label selection: Update label if direct ID match, or if target has placeholder/empty label
  if (incoming.label && incoming.label.trim()) {
    const trimmedLabel = incoming.label.trim();
    if (
      isDirectIdMatch ||
      !merged.label ||
      merged.label.startsWith('Entity #') ||
      merged.label === 'NEW_TARGET' ||
      merged.label === 'Source Page' ||
      (incoming as any).sourceType === 'manual' ||
      (incoming as any).isExplicitEdit
    ) {
      merged.label = trimmedLabel;
    }
  }

  // 2. Type upgrade / update
  if (incoming.type) {
    const genericTypes = ['source', 'web_result', 'general', 'unknown', 'entity', 'data', 'item'];
    if (
      isDirectIdMatch ||
      !merged.type ||
      genericTypes.includes(merged.type) ||
      (incoming as any).sourceType === 'manual' ||
      (incoming as any).isExplicitEdit
    ) {
      merged.type = incoming.type;
    }
  }

  // Auto-upgrade type to location if label/details contain location/address keywords
  const genericTypes = ['source', 'web_result', 'general', 'unknown', 'entity', 'data', 'item'];
  if (isLocationNode(merged) && (!merged.type || genericTypes.includes(merged.type))) {
    merged.type = 'location';
  }

  // 3. Details merging / updating
  if (incoming.details !== undefined) {
    if (isDirectIdMatch || (incoming as any).sourceType === 'manual' || (incoming as any).isExplicitEdit) {
      merged.details = incoming.details.trim();
    } else if (incoming.details.trim()) {
      if (!merged.details || !merged.details.trim()) {
        merged.details = incoming.details.trim();
      } else {
        const existingLines = merged.details.split('\n').map(l => l.trim()).filter(Boolean);
        const incomingLines = incoming.details.split('\n').map(l => l.trim()).filter(Boolean);
        const existingSet = new Set(existingLines);

        const newLinesToAdd = incomingLines.filter(line => !existingSet.has(line));
        if (newLinesToAdd.length > 0) {
          merged.details = `${merged.details.trim()}\n${newLinesToAdd.join('\n')}`;
        }
      }
    }
  }

  // 4. Image merging: Respect explicit incoming properties
  if (incoming.imageUrl !== undefined) {
    merged.imageUrl = incoming.imageUrl;
  }
  if (incoming.imageUrls !== undefined) {
    merged.imageUrls = incoming.imageUrls;
  } else {
    const existingImgs = Array.isArray(merged.imageUrls) ? merged.imageUrls : (merged.imageUrl ? [merged.imageUrl] : []);
    const incomingImgs = Array.isArray(incoming.imageUrls) ? incoming.imageUrls : (incoming.imageUrl ? [incoming.imageUrl] : []);
    
    const combinedImgs = Array.from(new Set([...existingImgs, ...incomingImgs]))
      .filter(u => typeof u === 'string' && u.trim().length > 0 && !u.startsWith('[IMG]'));

    merged.imageUrls = combinedImgs;
  }

  if (!merged.imageUrl && merged.imageUrls && merged.imageUrls.length > 0) {
    merged.imageUrl = merged.imageUrls[0];
  }

  // 5. URL & Metadata merging
  if (incoming.url !== undefined) {
    if (isDirectIdMatch || !merged.url) {
      merged.url = incoming.url;
    }
  }

  if (incoming.reports && (!merged.reports || !merged.reports.includes(incoming.reports))) {
    merged.reports = merged.reports ? `${merged.reports}\n---\n${incoming.reports}` : incoming.reports;
  }

  if (incoming.sourceType) {
    merged.sourceType = incoming.sourceType;
  }

  if (incoming.eventDate) {
    merged.eventDate = incoming.eventDate;
  }

  if (incoming.tags && Array.isArray(incoming.tags)) {
    merged.tags = Array.from(new Set([...(merged.tags || []), ...incoming.tags]));
  }

  // Preserve coordinates if target already has them
  if (target.x !== undefined) merged.x = target.x;
  if (target.y !== undefined) merged.y = target.y;

  return merged;
}

/**
 * Takes existing graph data and an incoming payload (nodes + links), deduplicates nodes
 * with identical syntax/identity, merges their properties, and remaps all links to point
 * to the consolidated nodes.
 */
export function mergeAndDeduplicateGraph(
  existingGraph: GraphData,
  incomingPayload: { nodes?: (Partial<Node> & { id: string })[]; links?: Link[]; replace?: boolean }
): GraphData {
  if (incomingPayload.replace) {
    // If replace is requested, we still deduplicate within the incoming nodes list!
    const nodesList = incomingPayload.nodes || [];
    const consolidatedNodes: Node[] = [];
    const idRemap = new Map<string, string>(); // incomingId -> targetConsolidatedId

    for (const rawNode of nodesList) {
      const existingMatch = consolidatedNodes.find(n => areNodesSyntacticallyEqual(n, rawNode));
      if (existingMatch) {
        idRemap.set(String(rawNode.id), existingMatch.id);
        const merged = mergeNodeData(existingMatch, rawNode);
        const idx = consolidatedNodes.findIndex(n => n.id === existingMatch.id);
        if (idx !== -1) consolidatedNodes[idx] = merged;
      } else {
        const determinedType = rawNode.type && rawNode.type !== 'person' ? rawNode.type : (isLocationNode(rawNode) ? 'location' : (rawNode.type || 'person'));
        const fullNode: Node = {
          ...rawNode,
          id: String(rawNode.id),
          label: String(rawNode.label || (rawNode as any).name || rawNode.id),
          type: String(determinedType),
          details: rawNode.details ? String(rawNode.details) : '',
        } as Node;
        consolidatedNodes.push(fullNode);
        idRemap.set(String(rawNode.id), fullNode.id);
      }
    }

    const nodeIds = new Set(consolidatedNodes.map(n => n.id));
    const consolidatedLinks: Link[] = [];

    (incomingPayload.links || []).forEach(l => {
      let s = typeof l.source === 'object' && l.source ? String((l.source as any).id) : String(l.source);
      let t = typeof l.target === 'object' && l.target ? String((l.target as any).id) : String(l.target);

      // Apply remapping
      if (idRemap.has(s)) s = idRemap.get(s)!;
      if (idRemap.has(t)) t = idRemap.get(t)!;

      if (s === t) return; // Disallow self-loops if both collapsed to the same node
      if (!nodeIds.has(s) || !nodeIds.has(t)) return;

      const linkExists = consolidatedLinks.some(existing => {
        const es = typeof existing.source === 'object' && existing.source ? String((existing.source as any).id) : String(existing.source);
        const et = typeof existing.target === 'object' && existing.target ? String((existing.target as any).id) : String(existing.target);
        return (es === s && et === t) || (es === t && et === s && existing.label === l.label);
      });

      if (!linkExists) {
        consolidatedLinks.push({ ...l, source: s, target: t, label: l.label ? String(l.label) : '' });
      }
    });

    return { nodes: consolidatedNodes, links: consolidatedLinks };
  }

  // Incremental merge: Merge incoming nodes into existingGraph.nodes
  const existingNodes: Node[] = [...(existingGraph.nodes || [])];
  const existingLinks: Link[] = [...(existingGraph.links || [])];
  const idRemap = new Map<string, string>(); // incomingId -> targetExistingId

  (incomingPayload.nodes || []).forEach(incomingNode => {
    const rawId = String(incomingNode.id);
    // Find matching existing node by ID, label, phone, email, or syntax equality
    const matchIndex = existingNodes.findIndex(n => areNodesSyntacticallyEqual(n, incomingNode));

    if (matchIndex > -1) {
      // Syntactically equal node exists -> Merge into existing node without creating a new node!
      const targetExistingNode = existingNodes[matchIndex];
      idRemap.set(rawId, targetExistingNode.id);
      existingNodes[matchIndex] = mergeNodeData(targetExistingNode, incomingNode);
    } else {
      // No existing match -> Add new node
      const determinedType = incomingNode.type && incomingNode.type !== 'person' ? incomingNode.type : (isLocationNode(incomingNode) ? 'location' : (incomingNode.type || 'person'));
      const fullNode: Node = {
        ...incomingNode,
        id: rawId,
        label: String(incomingNode.label || (incomingNode as any).name || rawId),
        type: String(determinedType),
        details: incomingNode.details ? String(incomingNode.details) : '',
      } as Node;
      existingNodes.push(fullNode);
      idRemap.set(rawId, fullNode.id);
    }
  });

  const nodeIds = new Set(existingNodes.map(n => n.id));
  const nodeLabelMap = new Map(existingNodes.map(n => [n.label.toLowerCase().trim(), n.id]));

  (incomingPayload.links || []).forEach(newLink => {
    let s = typeof newLink.source === 'object' && newLink.source ? String((newLink.source as any).id) : String(newLink.source);
    let t = typeof newLink.target === 'object' && newLink.target ? String((newLink.target as any).id) : String(newLink.target);

    // Apply remapping from node merges
    if (idRemap.has(s)) s = idRemap.get(s)!;
    if (idRemap.has(t)) t = idRemap.get(t)!;

    // Fallback: match by label if ID is missing from nodeIds
    if (!nodeIds.has(s) && nodeLabelMap.has(s.toLowerCase().trim())) {
      s = nodeLabelMap.get(s.toLowerCase().trim())!;
    }
    if (!nodeIds.has(t) && nodeLabelMap.has(t.toLowerCase().trim())) {
      t = nodeLabelMap.get(t.toLowerCase().trim())!;
    }

    if (s === t) return; // Prevent self-referencing links
    if (!nodeIds.has(s) || !nodeIds.has(t)) return;

    const linkExists = existingLinks.some(l => {
      const ls = typeof l.source === 'object' && l.source ? String((l.source as any).id) : String(l.source);
      const lt = typeof l.target === 'object' && l.target ? String((l.target as any).id) : String(l.target);
      return (ls === s && lt === t) || (ls === t && lt === s && l.label === newLink.label);
    });

    if (!linkExists) {
      existingLinks.push({ ...newLink, source: s, target: t, label: newLink.label ? String(newLink.label) : '' });
    }
  });

  return { nodes: existingNodes, links: existingLinks };
}
