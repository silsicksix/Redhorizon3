export interface OsintAgentToolItem {
  id: string;
  name: string;
  category: "dns" | "whois" | "ip" | "web" | "email" | "social" | "archive";
  desc: string;
}

export interface OsintToolFinding {
  tool: string;
  category: "dns" | "whois" | "ip" | "web" | "email" | "social" | "archive";
  title: string;
  summary: string;
  rawText: string;
  targetVariant?: string;
  discoveredEntities?: Array<{
    label: string;
    type: "person" | "domain" | "ip" | "email" | "phone" | "server" | "location" | "social" | "vulnerability" | "repo";
    details?: string;
    relationship?: string;
    targetVariant?: string;
  }>;
}

export interface OsintAgentScanResult {
  success: boolean;
  target: string;
  targetVariations?: string[];
  detectedType: string;
  executionTimeMs: number;
  toolsRun: number;
  results: OsintToolFinding[];
  logs: string[];
  graph: {
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      details?: string;
      confidenceScore?: number;
      confidenceLevel?: "HIGH" | "MEDIUM" | "LOW";
      sourceType?: string;
      targetVariant?: string;
    }>;
    links: Array<{
      source: string;
      target: string;
      label: string;
    }>;
  };
  summary: {
    verdict: string;
    riskScore: number;
    threatLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
    keyFindings: string[];
    attackSurface: string[];
    recommendedNextSteps: string[];
    matchedVariations?: Array<{
      variant: string;
      activeAccountsCount: number;
      platforms: string[];
    }>;
  };
}

// Dynamic Target Variation Generator (Heuristic & Matrix Delimiter Engine)
export function generateTargetVariations(input: string, maxCount = 5): string[] {
  const raw = input.trim().replace(/^@/, "");
  if (!raw) return [];

  const results: string[] = [];
  const add = (v: string) => {
    const clean = v.trim();
    if (clean && !results.includes(clean) && results.length < maxCount) {
      results.push(clean);
    }
  };

  // 1. Slot 1: Base / Canonical input
  add(raw);

  // Parse text part vs numeric part (e.g. "Ahmad69" -> "Ahmad", "69")
  const parts = raw.split(/([0-9]+|[-_.\s]+)/).filter((p) => p && !/^[-_.\s]+$/.test(p));
  const textPart = parts.find((p) => /^[a-zA-Z]+$/.test(p)) || raw;
  const numPart = parts.find((p) => /^[0-9]+$/.test(p)) || "";

  if (textPart && numPart) {
    // 2. Slot 2: Hyphen separator (Ahmad-69)
    add(`${textPart}-${numPart}`);
    // 3. Slot 3: Underscore separator (Ahmad_69)
    add(`${textPart}_${numPart}`);

    // 4. Slot 4: Digit split separator (Ahmad_6_9 or Ahmad-6-9)
    if (numPart.length >= 2) {
      const splitNum = numPart.split("").join("_");
      add(`${textPart}_${splitNum}`);
    } else {
      add(`${textPart}.${numPart}`);
    }

    // 5. Slot 5: Dot separator / Lowercase normalized (ahmad.69 or ahmad_69)
    add(`${textPart.toLowerCase()}.${numPart}`);
    add(`${textPart.toLowerCase()}_${numPart}`);
    add(`x_${textPart.toLowerCase()}${numPart}`);
    add(`${textPart.toLowerCase()}${numPart}_`);
  } else {
    // Words without digits (e.g. "AhmadRazak", "JohnDoe", "Ahmad")
    const words = raw.split(/(?=[A-Z])|[-_.\s]+/).filter(Boolean);
    if (words.length >= 2) {
      const w1 = words[0];
      const w2 = words.slice(1).join("");
      add(`${w1}-${w2}`);
      add(`${w1}_${w2}`);
      add(`${w1.toLowerCase()}.${w2.toLowerCase()}`);
      add(`${w1}_${w2}_official`);
      add(`real_${w1}${w2}`);
    } else {
      // Single word, e.g. "Ahmad"
      add(`${raw}_official`);
      add(`real_${raw}`);
      add(`${raw}-my`);
      add(`${raw}_01`);
      add(`x_${raw}`);
    }
  }

  // Fill up to maxCount if needed with clean variants
  const fallbackDecorators = [`${raw}_`, `_${raw}`, `${raw}01`, `${raw}_my`, `the_${raw}`];
  for (const f of fallbackDecorators) {
    if (results.length >= maxCount) break;
    add(f);
  }

  return results.slice(0, maxCount);
}

export async function runAutonomousScan(
  target: string,
  options?: {
    targets?: string[];
    targetVariations?: string[];
    targetType?: "auto" | "domain" | "ip" | "email" | "username" | "person";
    categories?: Array<"dns" | "whois" | "ip" | "web" | "email" | "social" | "archive">;
    depth?: "quick" | "balanced" | "deep";
  }
): Promise<OsintAgentScanResult> {
  const resp = await fetch("/api/osint-agent/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target,
      targets: options?.targets || options?.targetVariations,
      targetVariations: options?.targetVariations || options?.targets,
      targetType: options?.targetType || "auto",
      categories: options?.categories,
      depth: options?.depth || "balanced",
    }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: "Network request failed" }));
    throw new Error(errorData.error || `HTTP ${resp.status}`);
  }

  return await resp.json();
}

export async function runSingleOsintTool(toolName: string, target: string): Promise<OsintToolFinding> {
  const resp = await fetch(`/api/osint-agent/tool/${encodeURIComponent(toolName)}?target=${encodeURIComponent(target)}`);
  if (!resp.ok) {
    throw new Error(`Tool execution failed with status ${resp.status}`);
  }
  const data = await resp.json();
  return data.result;
}

export async function fetchAvailableOsintTools(): Promise<OsintAgentToolItem[]> {
  const resp = await fetch("/api/osint-agent/tools");
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.tools || [];
}
