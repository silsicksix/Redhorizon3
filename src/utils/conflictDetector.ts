import { Node, Link, GraphData, GraphConflict, ConflictCategory, ConflictSeverity } from '../types';
import { extractNodeCoordinates } from './geoUtils';

/**
 * Semantica Conflict & Anomaly Detection Engine
 * Scans graph topology and node metadata to uncover logical, spatio-temporal,
 * identity, and network contradictions between evidence items.
 */

// Helper to extract dates / timestamps from text
function extractTimestamps(text: string): { raw: string; timestamp: number }[] {
  if (!text) return [];
  const results: { raw: string; timestamp: number }[] = [];

  // ISO timestamp (2024-05-12T14:30:00)
  const isoMatches = text.match(/\b\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?\b/g);
  if (isoMatches) {
    isoMatches.forEach(m => {
      const parsed = Date.parse(m);
      if (!isNaN(parsed) && parsed > 946684800000) { // After year 2000
        results.push({ raw: m, timestamp: parsed });
      }
    });
  }

  // Malaysian format DD/MM/YYYY or DD-MM-YYYY
  const myMatches = text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/g);
  if (myMatches) {
    myMatches.forEach(m => {
      const parts = m.split(/[\/-]/);
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const mon = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const parsedDate = new Date(y, mon, d).getTime();
        if (!isNaN(parsedDate) && parsedDate > 946684800000) {
          results.push({ raw: m, timestamp: parsedDate });
        }
      }
    });
  }

  return results;
}

// Helper to extract IC/MyKad numbers
function extractICNumbers(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\b\d{6}-\d{2}-\d{4}\b/g) || text.match(/\b\d{12}\b/g);
  return matches ? Array.from(new Set(matches)) : [];
}

// Helper to extract Dates of Birth (DOB)
function extractDOBs(text: string): string[] {
  if (!text) return [];
  const dobMatches: string[] = [];
  const regex = /(?:tarikh lahir|dob|birth date|d\.o\.b|lahir pada)[:\s]+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,2})/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) dobMatches.push(match[1].trim());
  }
  return Array.from(new Set(dobMatches));
}

// Helper to calculate approximate distance in KM between two lat/lng points (Haversine formula)
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extract lat/lng coordinates if present in details or node properties
function extractCoordinates(node: Node): { lat: number; lng: number; locationName?: string } | null {
  const geo = extractNodeCoordinates(node);
  if (geo) {
    return { lat: geo.lat, lng: geo.lon, locationName: geo.name };
  }

  const text = `${node.label} ${node.details || ''}`;
  
  // Explicit lat/lng pattern
  const latLngMatch = text.match(/([+-]?\d+\.\d+)[,\s]+([+-]?\d+\.\d+)/);
  if (latLngMatch) {
    const lat = parseFloat(latLngMatch[1]);
    const lng = parseFloat(latLngMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Known city heuristics for quick spatial verification
  const lower = text.toLowerCase();
  if (lower.includes('london') || lower.includes('uk')) {
    return { lat: 51.5074, lng: -0.1278, locationName: 'London, UK' };
  }
  if (lower.includes('bangkok') || lower.includes('thailand')) {
    return { lat: 13.7563, lng: 100.5018, locationName: 'Bangkok, Thailand' };
  }
  if (lower.includes('singapore') || lower.includes('singapura')) {
    return { lat: 1.3521, lng: 103.8198, locationName: 'Singapore' };
  }
  if (lower.includes('dubai') || lower.includes('uae')) {
    return { lat: 25.2048, lng: 55.2708, locationName: 'Dubai, UAE' };
  }

  return null;
}

/**
 * Primary Conflict Scanner
 * Runs deterministic multi-domain contradiction analysis across the entire graph.
 */
export function scanGraphForConflicts(graph: GraphData): GraphConflict[] {
  const conflicts: GraphConflict[] = [];
  const nodes = graph?.nodes || [];
  const links = graph?.links || [];

  if (nodes.length === 0) return [];

  // -------------------------------------------------------------
  // 1. SPATIO-TEMPORAL ANOMALIES (Impossible Travel / Simultaneous Presence)
  // -------------------------------------------------------------
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Check if both nodes belong to the same person / profile / device
      const isSameSubject = 
        nodeA.label.toLowerCase() === nodeB.label.toLowerCase() ||
        (nodeA.type === 'person' && nodeB.type === 'social' && nodeB.label.toLowerCase().includes(nodeA.label.toLowerCase())) ||
        links.some(l => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return (
            (s === nodeA.id && t === nodeB.id) ||
            (s === nodeB.id && t === nodeA.id)
          ) && (l.label.includes('owner') || l.label.includes('milik') || l.label.includes('alias') || l.label.includes('same_as'));
        });

      if (isSameSubject) {
        const coordsA = extractCoordinates(nodeA);
        const coordsB = extractCoordinates(nodeB);
        const timesA = extractTimestamps(`${nodeA.label} ${nodeA.details || ''}`);
        const timesB = extractTimestamps(`${nodeB.label} ${nodeB.details || ''}`);

        if (coordsA && coordsB && timesA.length > 0 && timesB.length > 0) {
          const distKm = haversineDistanceKm(coordsA.lat, coordsA.lng, coordsB.lat, coordsB.lng);
          
          if (distKm > 100) { // Locations are far apart
            timesA.forEach(ta => {
              timesB.forEach(tb => {
                const diffHours = Math.abs(ta.timestamp - tb.timestamp) / (1000 * 60 * 60);
                const requiredSpeed = distKm / Math.max(diffHours, 0.05);

                if (diffHours < 3 && requiredSpeed > 800) {
                  conflicts.push({
                    id: `conf_st_${nodeA.id}_${nodeB.id}_${Date.now()}`,
                    title: `Anomali Perjalanan Mustahil (Spatio-Temporal Contradiction)`,
                    category: 'SPATIO_TEMPORAL',
                    severity: 'CRITICAL',
                    description: `Entiti sasaran dikesan aktif di dua lokasi berjarak ${Math.round(distKm)} km dalam sela masa hanya ${diffHours.toFixed(1)} jam (memerlukan kelajuan ${Math.round(requiredSpeed)} km/j). Ini menunjukkan pemalsuan lokasi, perkongsian akaun (proxy), atau akaun palsu.`,
                    nodeIds: [nodeA.id, nodeB.id],
                    conflictingProperties: [
                      {
                        nodeId: nodeA.id,
                        nodeLabel: nodeA.label,
                        property: 'Lokasi & Masa',
                        value: `${coordsA.locationName || `${coordsA.lat.toFixed(2)}, ${coordsA.lng.toFixed(2)}`} @ ${ta.raw}`
                      },
                      {
                        nodeId: nodeB.id,
                        nodeLabel: nodeB.label,
                        property: 'Lokasi & Masa',
                        value: `${coordsB.locationName || `${coordsB.lat.toFixed(2)}, ${coordsB.lng.toFixed(2)}`} @ ${tb.raw}`
                      }
                    ],
                    recommendation: 'Jalankan pengesahan GeoIP dan rekod Exif imej untuk memastikan kesahihan pendaftaran peranti.',
                    detectedAt: new Date().toISOString()
                  });
                }
              });
            });
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 2. IDENTITY & DEMOGRAPHIC CONTRADICTIONS (DOB / IC / Status)
  // -------------------------------------------------------------
  const personNodes = nodes.filter(n => n.type === 'person' || n.type === 'social' || n.type === 'identity');

  personNodes.forEach(person => {
    const text = `${person.label} ${person.details || ''} ${person.reports || ''}`;
    const icList = extractICNumbers(text);
    const dobList = extractDOBs(text);

    // Contradicting IC Numbers in the same dossier
    if (icList.length > 1) {
      conflicts.push({
        id: `conf_ic_${person.id}_${Date.now()}`,
        title: `Percanggahan Nombor Pengenalan (MyKad / Pasport)`,
        category: 'IDENTITY',
        severity: 'CRITICAL',
        description: `Profil '${person.label}' memaparkan lebih daripada satu Nombor Pengenalan (${icList.join(', ')}). Boleh menandakan percubaan pencurian identiti atau penggunaan MyKad palsu.`,
        nodeIds: [person.id],
        conflictingProperties: icList.map((ic, i) => ({
          nodeId: person.id,
          nodeLabel: person.label,
          property: `Rekod IC #${i + 1}`,
          value: ic
        })),
        recommendation: 'Semak silang pangkalan data JPN / SPR untuk mengesahkan pemegang sah nombor kad pengenalan.',
        detectedAt: new Date().toISOString()
      });
    }

    // Contradicting DOBs
    if (dobList.length > 1) {
      conflicts.push({
        id: `conf_dob_${person.id}_${Date.now()}`,
        title: `Percanggahan Tarikh Lahir (DOB Inconsistency)`,
        category: 'IDENTITY',
        severity: 'WARNING',
        description: `Profil '${person.label}' mengandungi maklumat tarikh lahir berbeza (${dobList.join(' VS ')}).`,
        nodeIds: [person.id],
        conflictingProperties: dobList.map((dob, i) => ({
          nodeId: person.id,
          nodeLabel: person.label,
          property: `Tarikh Lahir #${i + 1}`,
          value: dob
        })),
        recommendation: 'Sahkan tarikh lahir dengan rekod dokumen rasmi atau carian semakan pendaftar.',
        detectedAt: new Date().toISOString()
      });
    }

    // Status conflict: Scammer vs Verified Official / Police
    const lower = text.toLowerCase();
    if ((lower.includes('scam') || person.type === 'scammer') && (person.verificationStatus === 'VERIFIED' || lower.includes('verified official'))) {
      conflicts.push({
        id: `conf_stat_${person.id}_${Date.now()}`,
        title: `Percanggahan Status Kesahihan & Rekod Jenayah`,
        category: 'VERIFICATION',
        severity: 'CRITICAL',
        description: `Nod '${person.label}' bertanda 'VERIFIED' tetapi turut diklasifikasikan sebagai suspek penipuan / scammer dalam rekod siasatan.`,
        nodeIds: [person.id],
        conflictingProperties: [
          {
            nodeId: person.id,
            nodeLabel: person.label,
            property: 'Status Kesahihan',
            value: person.verificationStatus || 'VERIFIED'
          },
          {
            nodeId: person.id,
            nodeLabel: person.label,
            property: 'Klasifikasi Jenayah',
            value: 'SUSPECT_SCAMMER'
          }
        ],
        recommendation: 'Kemas kini status kesahihan kepada DISPUTED serta semak semula sumber aduan CCID.',
        detectedAt: new Date().toISOString()
      });
    }
  });

  // -------------------------------------------------------------
  // 3. NETWORK & INFRASTRUCTURE ANOMALIES (Private IP vs Public Host)
  // -------------------------------------------------------------
  const ipNodes = nodes.filter(n => n.type === 'ip' || n.type === 'domain' || n.type === 'server');
  ipNodes.forEach(node => {
    const text = `${node.label} ${node.details || ''}`;
    const ipMatch = text.match(/\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.0\.0\.1)\b/);
    
    if (ipMatch && (text.includes('cloudflare') || text.includes('aws') || text.includes('overseas') || text.includes('public cdn'))) {
      conflicts.push({
        id: `conf_net_${node.id}_${Date.now()}`,
        title: `Anomali Penghalaan Rangkaian (RFC 1918 Private IP)`,
        category: 'NETWORK',
        severity: 'WARNING',
        description: `Nod infrastruktur '${node.label}' menggunakan alamat IP persendirian (${ipMatch[1]}) tetapi ditandakan sebagai pelayan awam / cloud CDN antarabangsa.`,
        nodeIds: [node.id],
        conflictingProperties: [
          {
            nodeId: node.id,
            nodeLabel: node.label,
            property: 'IP Address',
            value: ipMatch[1]
          },
          {
            nodeId: node.id,
            nodeLabel: node.label,
            property: 'Pengisytiharan Hosting',
            value: 'Public Cloud / International CDN'
          }
        ],
        recommendation: 'Lakukan imbasan DNS semula dan sahkan rekod rekursif A-record dan CNAME.',
        detectedAt: new Date().toISOString()
      });
    }
  });

  // -------------------------------------------------------------
  // 4. RELATIONAL CONTRADICTIONS (Denial vs Evidence Link)
  // -------------------------------------------------------------
  links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);

    if (sourceNode && targetNode) {
      const linkLabel = (link.label || '').toLowerCase();
      const sDetails = (sourceNode.details || '').toLowerCase();
      const tDetails = (targetNode.details || '').toLowerCase();

      // If link shows direct transaction or association, but details say "Denies acquaintance / Mengaku tidak kenal"
      if (
        (linkLabel.includes('transaction') || linkLabel.includes('co-conspirator') || linkLabel.includes('sekongkol') || linkLabel.includes('financial')) &&
        (sDetails.includes('tidak kenal') || sDetails.includes('denies knowing') || tDetails.includes('tidak kenal') || tDetails.includes('denies knowing'))
      ) {
        conflicts.push({
          id: `conf_rel_${sourceNode.id}_${targetNode.id}_${Date.now()}`,
          title: `Percanggahan Pengakuan Hubungan (Relational Denial vs Evidence)`,
          category: 'RELATIONAL',
          severity: 'CRITICAL',
          description: `Sasaran '${sourceNode.label}' atau '${targetNode.label}' mendakwa tidak mengenali antara satu sama lain, namun bukti graf mendokumentasikan pautan terus '${link.label}'.`,
          nodeIds: [sourceNode.id, targetNode.id],
          conflictingProperties: [
            {
              nodeId: sourceNode.id,
              nodeLabel: sourceNode.label,
              property: 'Kenyataan Sasaran',
              value: 'Mendakwa tidak mempunyai sebarang kaitan/kenalan.'
            },
            {
              nodeId: targetNode.id,
              nodeLabel: targetNode.label,
              property: 'Pautan Bukti Graf',
              value: `Hubungan Terus: ${link.label}`
            }
          ],
          recommendation: 'Sediakan soalan siasatan bertumpu kepada transaksi digital dan rekod panggilan antara kedua-dua entiti.',
          detectedAt: new Date().toISOString()
        });
      }
    }
  });

  return conflicts;
}

/**
 * Attaches conflict flags directly to graph nodes for real-time visual highlighting.
 */
export function tagNodesWithConflicts(nodes: Node[], conflicts: GraphConflict[]): Node[] {
  const conflictMap = new Map<string, GraphConflict[]>();

  conflicts.forEach(c => {
    c.nodeIds.forEach(id => {
      const existing = conflictMap.get(id) || [];
      existing.push(c);
      conflictMap.set(id, existing);
    });
  });

  return nodes.map(node => {
    const nodeConflicts = conflictMap.get(node.id);
    if (nodeConflicts && nodeConflicts.length > 0) {
      return {
        ...node,
        isConflictFlagged: true,
        activeConflicts: nodeConflicts
      };
    }
    return {
      ...node,
      isConflictFlagged: false,
      activeConflicts: []
    };
  });
}
