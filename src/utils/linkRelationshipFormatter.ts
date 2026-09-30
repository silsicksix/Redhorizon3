import { Node, Link } from '../types';
import { resolveNodeBrandOrType } from './nodeIconResolver';

export interface FormattedLinkMetadata {
  edgeText: string;
  sourceTypeLabel: string;
  targetTypeLabel: string;
  relationship: string;
  badgeColor: string;
  sourceColor: string;
  targetColor: string;
  directionIcon: string;
}

/**
 * Standardizes OSINT node category names in clean uppercase/bilingual Maltego format
 */
export function formatCategoryLabel(type?: string): string {
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
    case 'document': return 'DOKUMEN';
    case 'classified_dossier': return 'DOSSIER SULIT';
    case 'fictional_character': return 'WATAK FIKSYEN';
    case 'fictional_object': return 'ARTIKFAK';
    case 'found_footage': return 'PITA RAKAMAN';
    case 'cryptid_myth': return 'KRIPTID';
    case 'weapon_hardware': return 'SENJATA';
    case 'malware_payload': return 'MALWARE';
    case 'biometric_evidence': return 'BIOMETRIK';
    case 'surveillance_device': return 'PENDERIA';
    case 'broadcast_frequency': return 'FREKUENSI';
    case 'financial_instrument': return 'KEWANGAN';
    case 'darkweb_forum': return 'FORUM DARKNET';
    case 'satellite_imagery': return 'IMEJ SATELIT';
    case 'deepfake_media': return 'DEEPFAKE';
    case 'chemical_hazard': return 'CBRN HAZARD';
    case 'quantum_cipher': return 'KRIPTOGRAFI';
    case 'ai_model_weights': return 'MODEL AI';
    case 'anomaly_portal': return 'ANOMALI';
    case 'occult_symbol': return 'OKULTISME';
    case 'subsea_cable': return 'KABEL BAWAH LAUT';
    case 'black_budget_project': return 'BLACK BUDGET';
    case 'evidence': return 'BUKTI';
    default: return (type || 'ENTITI').toUpperCase();
  }
}

/**
 * Resolves node object whether it is an object reference or ID string
 */
export function resolveNode(nodeOrId: string | Node | undefined, allNodes: Node[]): Node | undefined {
  if (!nodeOrId) return undefined;
  if (typeof nodeOrId === 'object' && nodeOrId !== null) {
    return nodeOrId as Node;
  }
  return allNodes.find(n => n.id === nodeOrId);
}

/**
 * Derives a Maltego-style edge descriptor showing Parent/Source -> Child/Target type metadata
 * Example formats:
 * - "OWNS • [INDIVIDU ➔ TELEFON]"
 * - "ASSOCIATED_WITH • [ORGANISASI ➔ INDIVIDU]"
 * - "HOSTS • [DOMAIN ➔ LOKASI]"
 */
export function getLinkMetadataInfo(link: any, allNodes: Node[]): FormattedLinkMetadata {
  const sourceNode = resolveNode(link.source, allNodes);
  const targetNode = resolveNode(link.target, allNodes);

  const sourceCategory = formatCategoryLabel(sourceNode?.type);
  const targetCategory = formatCategoryLabel(targetNode?.type);

  const sourceMeta = sourceNode ? resolveNodeBrandOrType(sourceNode) : null;
  const targetMeta = targetNode ? resolveNodeBrandOrType(targetNode) : null;

  const rawRelation = link.label ? String(link.label).trim()
    : (link.relationship ? String(link.relationship).trim()
    : (link.type ? String(link.type).trim() : ''));

  // Clean up relationship name (e.g. "linked_to" -> "LINKED TO")
  let cleanRel = rawRelation.replace(/_/g, ' ').toUpperCase();

  // If no relationship was explicitly set, infer semantic default based on parent & child types
  if (!cleanRel) {
    const sType = String(sourceNode?.type || '').toLowerCase();
    const tType = String(targetNode?.type || '').toLowerCase();

    if (sType === 'person' && tType === 'phone') cleanRel = 'NOMBOR HUBUNGAN';
    else if (sType === 'person' && (tType === 'social' || tType === 'social_media')) cleanRel = 'AKAUN SOSIAL';
    else if (sType === 'person' && tType === 'location') cleanRel = 'LOKASI / KEDIAMAN';
    else if (sType === 'person' && (tType === 'organization' || tType === 'company')) cleanRel = 'AFILIASI';
    else if (sType === 'organization' && tType === 'person') cleanRel = 'ANGGOTA / KAKITANGAN';
    else if (sType === 'domain' && tType === 'location') cleanRel = 'LOKASI PELAYAN';
    else if (tType === 'crypto') cleanRel = 'DOMPET KRIPTO';
    else if (tType === 'vehicle') cleanRel = 'KENDERAAN BERDAFTAR';
    else if (tType === 'evidence') cleanRel = 'BAHAN BUKTI';
    else cleanRel = 'HUBUNGAN';
  }

  // Edge text format matching Maltego transform hierarchy: RELATION • [PARENT ➔ CHILD]
  const edgeText = `${cleanRel} • [${sourceCategory} ➔ ${targetCategory}]`;

  // Color selection
  let badgeColor = '#38bdf8'; // default cyan
  if (cleanRel.includes('CONTRADICT') || cleanRel.includes('PERCANGGAHAN')) {
    badgeColor = '#ef4444';
  } else if (cleanRel.includes('SMOKING') || cleanRel.includes('SAHIH') || cleanRel.includes('BUKTI')) {
    badgeColor = '#10b981';
  } else if (link.isVault) {
    badgeColor = '#f59e0b';
  } else if (targetMeta?.brandColor) {
    badgeColor = targetMeta.brandColor;
  }

  return {
    edgeText,
    sourceTypeLabel: sourceCategory,
    targetTypeLabel: targetCategory,
    relationship: cleanRel,
    badgeColor,
    sourceColor: sourceMeta?.brandColor || '#ef4444',
    targetColor: targetMeta?.brandColor || '#38bdf8',
    directionIcon: '➔'
  };
}
