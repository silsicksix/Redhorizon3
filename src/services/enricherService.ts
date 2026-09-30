export type EnricherCategory = "all" | "poi" | "crypto" | "network" | "infrastructure";

export interface EnricherDefinition {
  id: string;
  name: string;
  category: "poi" | "crypto" | "network" | "infrastructure";
  description: string;
  applicableTypes: string[];
  icon: string;
  badge: string;
  priority: number;
}

export interface EnrichedEntityNode {
  id: string;
  label: string;
  type: string;
  details?: string;
  imageUrl?: string;
  confidence?: number;
  properties?: Record<string, any>;
  vaultMatch?: boolean;
}

export interface EnrichedEntityLink {
  source: string;
  target: string;
  label: string;
  relationship?: string;
  confidence?: number;
}

export interface EnricherExecutionResult {
  enricherId: string;
  enricherName: string;
  category: "poi" | "crypto" | "network" | "infrastructure";
  target: string;
  targetType: string;
  summary: string;
  discoveredNodes: EnrichedEntityNode[];
  discoveredLinks: EnrichedEntityLink[];
  structuredData: Record<string, any>;
  riskLevel?: "low" | "medium" | "high" | "critical";
  executionTimeMs: number;
  sources: string[];
}

export async function fetchEnricherCatalog(): Promise<EnricherDefinition[]> {
  try {
    const res = await fetch('/api/enrichers/catalog');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.catalog || [];
  } catch (err) {
    console.warn('[EnricherService] Failed to fetch catalog, using client fallback:', err);
    return [
      {
        id: "poi_name_alias",
        name: "Penguraian Nama & Alias (POI De-Obfuscator)",
        category: "poi",
        description: "Menganalisis nama penuh sasaran, gelaran kehormat (Dato/Tan Sri), nama samaran & slang.",
        applicableTypes: ["person", "suspect", "user", "target"],
        icon: "UserCheck",
        badge: "POI UTAMA",
        priority: 1,
      },
      {
        id: "poi_phone_telco",
        name: "Penyiasatan Nombor Telefon & Telco Carrier",
        category: "poi",
        description: "Mengenal pasti pembekal talian telco (CelcomDigi, Maxis, dll.), pautan WhatsApp & Telegram.",
        applicableTypes: ["phone", "person", "target"],
        icon: "PhoneCall",
        badge: "TELCO INTEL",
        priority: 2,
      },
      {
        id: "poi_nric_demographics",
        name: "Penyahkod Demografi Kad Pengenalan (NRIC/IC)",
        category: "poi",
        description: "Mengekstrak tarikh lahir tepat, umur, negeri kelahiran (kod PB), dan jantina.",
        applicableTypes: ["person", "document", "id", "target"],
        icon: "IdCard",
        badge: "DEMOGRAFI RASMI",
        priority: 3,
      },
      {
        id: "poi_vehicle_plate",
        name: "Pemprofilan Nombor Pendaftaran Kenderaan",
        category: "poi",
        description: "Menganalisis awalan negeri plat JPJ, anggaran tahun, & matriks semakan saman rasmi.",
        applicableTypes: ["vehicle", "person", "target"],
        icon: "Car",
        badge: "KENDERAAN JPJ",
        priority: 4,
      },
      {
        id: "crypto_chain_detect",
        name: "Pengesanan Multi-Chain Alamat Kripto",
        category: "crypto",
        description: "Mengenal pasti rantaian blok (Bitcoin, Ethereum, Tron TRC-20, Solana) dan lejar.",
        applicableTypes: ["crypto", "wallet", "financial", "target"],
        icon: "Coins",
        badge: "KRIPTO MULTI-CHAIN",
        priority: 5,
      },
      {
        id: "crypto_wallet_balance",
        name: "Baki & Aktiviti Transaksi Lejar Langsung",
        category: "crypto",
        description: "Menyemak baki langsung pada lejar awam blockchain dan aktiviti transaksi.",
        applicableTypes: ["crypto", "wallet", "financial", "target"],
        icon: "Activity",
        badge: "ON-CHAIN BALANCE",
        priority: 6,
      },
      {
        id: "net_dns_pivot",
        name: "Pivot DNS Lengkap (A, AAAA, MX, NS, TXT)",
        category: "network",
        description: "Mengekstrak semua rekod DNS berwibawa bagi domain dan memetakan rekod IP.",
        applicableTypes: ["domain", "server", "ip", "target"],
        icon: "Globe",
        badge: "DNS RECORDS",
        priority: 7,
      }
    ];
  }
}

export async function executeEnricher(
  enricherId: string,
  target: string,
  targetType: string = "person",
  context: string = ""
): Promise<EnricherExecutionResult> {
  const res = await fetch('/api/enrichers/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enricherId, target, targetType, context }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Gagal menjalankan enricher (${res.status})`);
  }

  return await res.json();
}
