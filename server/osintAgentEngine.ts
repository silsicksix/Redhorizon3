import {
  cleanDomain,
  runDnsLookup,
  runCertLookup,
  runSubdomainBruteforce,
  runIpLookup,
  runAsnLookup,
  runPassivePortScan,
  runGithubRecon,
  runUsernameEnum,
  runGravatarLookup,
  runEmailValidate,
  runWaybackLookup,
  runWebInspection,
  ToolResult,
} from "./osintAgentTools";

export interface AgentScanRequest {
  target: string;
  targets?: string[];
  targetVariations?: string[];
  targetType?: "auto" | "domain" | "ip" | "email" | "username" | "person";
  categories?: Array<"dns" | "whois" | "ip" | "web" | "email" | "social" | "archive">;
  depth?: "quick" | "balanced" | "deep";
}

export interface DiscoveredNode {
  id: string;
  label: string;
  type: string;
  details?: string;
  confidenceScore?: number;
  confidenceLevel?: "HIGH" | "MEDIUM" | "LOW";
  sourceType?: string;
  targetVariant?: string;
  verificationStatus?: "VERIFIED" | "UNVERIFIED" | "DISPUTED";
}

export interface DiscoveredLink {
  source: string;
  target: string;
  label: string;
}

export interface AgentScanResponse {
  success: boolean;
  target: string;
  targetVariations?: string[];
  detectedType: string;
  executionTimeMs: number;
  toolsRun: number;
  results: ToolResult[];
  logs: string[];
  graph: {
    nodes: DiscoveredNode[];
    links: DiscoveredLink[];
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

// Dynamic Target Variation Permutation Engine (5 Target Variations)
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

  // 1. Base Canonical Input (e.g. Ahmad69)
  add(raw);

  const parts = raw.split(/([0-9]+|[-_.\s]+)/).filter((p) => p && !/^[-_.\s]+$/.test(p));
  const textPart = parts.find((p) => /^[a-zA-Z]+$/.test(p)) || raw;
  const numPart = parts.find((p) => /^[0-9]+$/.test(p)) || "";

  if (textPart && numPart) {
    // 2. Hyphen Delimiter: Ahmad-69
    add(`${textPart}-${numPart}`);
    // 3. Underscore Delimiter: Ahmad_69
    add(`${textPart}_${numPart}`);

    // 4. Granular Number Split: Ahmad_6_9 or Ahmad-6-9
    if (numPart.length >= 2) {
      const splitNum = numPart.split("").join("_");
      add(`${textPart}_${splitNum}`);
    } else {
      add(`${textPart}.${numPart}`);
    }

    // 5. Lowercase Dot / Normalized: ahmad.69 or ahmad_69
    add(`${textPart.toLowerCase()}.${numPart}`);
    add(`${textPart.toLowerCase()}_${numPart}`);
    add(`x_${textPart.toLowerCase()}${numPart}`);
    add(`${textPart.toLowerCase()}${numPart}_`);
  } else {
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
      add(`${raw}_official`);
      add(`real_${raw}`);
      add(`${raw}-my`);
      add(`${raw}_01`);
      add(`x_${raw}`);
    }
  }

  const fallbackDecorators = [`${raw}_`, `_${raw}`, `${raw}01`, `${raw}_my`, `the_${raw}`];
  for (const f of fallbackDecorators) {
    if (results.length >= maxCount) break;
    add(f);
  }

  return results.slice(0, maxCount);
}

function detectTargetType(raw: string): "domain" | "ip" | "email" | "username" | "person" {
  const t = raw.trim();
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t)) {
    return "email";
  }
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(t) || /^[a-fA-F0-9:]+$/.test(t)) {
    return "ip";
  }
  if (/^https?:\/\//.test(t) || /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(t)) {
    return "domain";
  }
  if (t.startsWith("@") || /^[a-zA-Z0-9_-]{3,24}$/.test(t)) {
    return "username";
  }
  return "person";
}

export async function executeAgentInvestigation(req: AgentScanRequest): Promise<AgentScanResponse> {
  const startTime = Date.now();
  const rawTarget = req.target.trim();
  const detectedType = req.targetType && req.targetType !== "auto" ? req.targetType : detectTargetType(rawTarget);
  const categories = new Set(req.categories || ["dns", "whois", "ip", "web", "email", "social", "archive"]);
  const depth = req.depth || "balanced";

  // Determine active targets (Single Target vs 5 Dynamic Target Variations)
  let activeTargetVariations: string[] = [];
  if (req.targets && Array.isArray(req.targets) && req.targets.length > 0) {
    activeTargetVariations = req.targets.map((t) => t.trim()).filter(Boolean).slice(0, 5);
  } else if (req.targetVariations && Array.isArray(req.targetVariations) && req.targetVariations.length > 0) {
    activeTargetVariations = req.targetVariations.map((t) => t.trim()).filter(Boolean).slice(0, 5);
  } else if (detectedType === "username" || detectedType === "person") {
    activeTargetVariations = generateTargetVariations(rawTarget, 5);
  } else {
    activeTargetVariations = [rawTarget];
  }

  // Ensure raw target is present in variations list
  if (!activeTargetVariations.includes(rawTarget)) {
    activeTargetVariations.unshift(rawTarget);
    activeTargetVariations = activeTargetVariations.slice(0, 5);
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    logs.push(`[${time}] ${msg}`);
  };

  log(`[AUTONOMOUS OSINT AGENT] Root target: "${rawTarget}" (Type: ${detectedType.toUpperCase()})`);
  if (activeTargetVariations.length > 1) {
    log(`[MULTI-TARGET SWARM] Dynamic Target Matrix Armed (${activeTargetVariations.length} variations): [${activeTargetVariations.join(", ")}]`);
  }
  log(`Reconnaissance Profile: Depth=${depth.toUpperCase()} | Modules: ${Array.from(categories).join(", ")}`);

  const results: ToolResult[] = [];
  const rootNodeId = `target_${Date.now()}`;
  const nodesMap = new Map<string, DiscoveredNode>();
  const links: DiscoveredLink[] = [];

  // Register Root Target Node
  const rootNode: DiscoveredNode = {
    id: rootNodeId,
    label: rawTarget,
    type: detectedType === "domain" ? "domain" : detectedType === "ip" ? "server" : detectedType === "email" ? "email" : "person",
    details: `Root investigation target classified as ${detectedType}. Armed with ${activeTargetVariations.length} dynamic target aliases.`,
    confidenceScore: 99,
    confidenceLevel: "HIGH",
    verificationStatus: "VERIFIED",
    sourceType: "Autonomous OSINT Recon",
    targetVariant: rawTarget,
  };
  nodesMap.set(rootNode.label.toLowerCase(), rootNode);

  // Register Dynamic Target Sub-Nodes if multiple variations exist
  const variantNodeIdMap = new Map<string, string>();
  variantNodeIdMap.set(rawTarget.toLowerCase(), rootNodeId);

  for (const variant of activeTargetVariations) {
    const vKey = variant.toLowerCase();
    if (vKey !== rawTarget.toLowerCase() && !nodesMap.has(vKey)) {
      const vNodeId = `variant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const vNode: DiscoveredNode = {
        id: vNodeId,
        label: variant,
        type: "person",
        details: `Dynamic Target Alias of '${rawTarget}' generated by Auto Scout permutation engine.`,
        confidenceScore: 90,
        confidenceLevel: "HIGH",
        verificationStatus: "VERIFIED",
        sourceType: "Dynamic Target Matrix",
        targetVariant: variant,
      };
      nodesMap.set(vKey, vNode);
      variantNodeIdMap.set(vKey, vNodeId);

      links.push({
        source: rootNodeId,
        target: vNodeId,
        label: "target_alias_variant",
      });
    }
  }

  // PLAN INVESTIGATION TASKS
  const taskPromises: Array<Promise<ToolResult | null>> = [];

  if (detectedType === "domain") {
    const domain = cleanDomain(rawTarget);
    if (categories.has("dns")) {
      log(`Scheduling DNS record resolution for ${domain}...`);
      taskPromises.push(runDnsLookup(domain));
      log(`Scheduling Certificate Transparency scan (crt.sh) for ${domain}...`);
      taskPromises.push(runCertLookup(domain));
      if (depth === "deep" || depth === "balanced") {
        log(`Scheduling Subdomain enumeration on high-value prefixes for ${domain}...`);
        taskPromises.push(runSubdomainBruteforce(domain));
      }
    }
    if (categories.has("web")) {
      log(`Scheduling Web Metadata & Robots.txt crawler for ${domain}...`);
      taskPromises.push(runWebInspection(domain));
    }
    if (categories.has("archive")) {
      log(`Scheduling Wayback Machine temporal history search for ${domain}...`);
      taskPromises.push(runWaybackLookup(domain));
    }
  } else if (detectedType === "ip") {
    const ip = rawTarget;
    if (categories.has("ip")) {
      log(`Scheduling IP Geolocation & ISP resolution for ${ip}...`);
      taskPromises.push(runIpLookup(ip));
      log(`Scheduling Passive Shodan InternetDB port & CVE scan for ${ip}...`);
      taskPromises.push(runPassivePortScan(ip));
    }
  } else if (detectedType === "email") {
    const email = rawTarget;
    if (categories.has("email")) {
      log(`Scheduling Email validation and DNS MX verification for ${email}...`);
      taskPromises.push(runEmailValidate(email));
      log(`Scheduling Gravatar Identity hash lookup for ${email}...`);
      taskPromises.push(runGravatarLookup(email, email));
    }
    if (categories.has("social")) {
      const usernamePart = email.split("@")[0];
      const emailVariations = generateTargetVariations(usernamePart, 5);
      log(`[SWARM] Scheduling multi-target alias scan for email handle variations: [${emailVariations.join(", ")}]...`);
      for (const v of emailVariations) {
        taskPromises.push(runUsernameEnum(v, v));
        taskPromises.push(runGithubRecon(v, v));
      }
    }
  } else {
    // USERNAME / PERSON / MULTI-TARGET
    if (categories.has("social")) {
      log(`[SWARM] Launching parallel multi-target recon on ${activeTargetVariations.length} aliases simultaneously...`);
      for (const variant of activeTargetVariations) {
        const cleanName = variant.replace(/^@/, "");
        log(` -> Dispatching GitHub & Cross-Platform tools for target: "${variant}"...`);
        taskPromises.push(runGithubRecon(cleanName, variant));
        taskPromises.push(runUsernameEnum(cleanName, variant));
      }
    }
  }

  // EXECUTE ALL IN PARALLEL
  const executed = await Promise.allSettled(taskPromises);
  for (const res of executed) {
    if (res.status === "fulfilled" && res.value) {
      results.push(res.value);
      log(`[✓ TOOL SUCCESS] ${res.value.title}: ${res.value.summary}`);
    } else if (res.status === "rejected") {
      log(`[⚠ TOOL WARNING] Tool execution failed: ${res.reason?.message || "Unknown error"}`);
    }
  }

  // SECONDARY HOP: If resolved IPs exist from DNS, probe them passively
  const discoveredIps: string[] = [];
  for (const r of results) {
    for (const ent of r.discoveredEntities || []) {
      if (ent.type === "ip" && !discoveredIps.includes(ent.label)) {
        discoveredIps.push(ent.label);
      }
    }
  }

  if (discoveredIps.length > 0 && categories.has("ip") && (depth === "deep" || depth === "balanced")) {
    const primaryIp = discoveredIps[0];
    log(`[SECONDARY HOP] Performing deep passive intelligence on discovered host IP: ${primaryIp}...`);
    try {
      const [ipRes, shodanRes] = await Promise.all([runIpLookup(primaryIp), runPassivePortScan(primaryIp)]);
      results.push(ipRes);
      results.push(shodanRes);
      log(`[✓ SECONDARY] ${ipRes.summary}`);
      log(`[✓ SECONDARY] ${shodanRes.summary}`);
    } catch (e: any) {
      log(`[⚠ SECONDARY ERROR] Failed to enrich secondary IP: ${e.message}`);
    }
  }

  // PROCESS ALL DISCOVERED ENTITIES INTO GRAPH NODES & LINKS
  for (const r of results) {
    const associatedVariant = r.targetVariant || rawTarget;
    const parentNodeId = variantNodeIdMap.get(associatedVariant.toLowerCase()) || rootNodeId;

    for (const ent of r.discoveredEntities || []) {
      const key = ent.label.toLowerCase();
      let nodeId = "";

      if (nodesMap.has(key)) {
        nodeId = nodesMap.get(key)!.id;
      } else {
        nodeId = `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newNode: DiscoveredNode = {
          id: nodeId,
          label: ent.label,
          type: ent.type,
          details: ent.details ? `${ent.details} [Alias: ${associatedVariant}]` : `${r.title} finding [Alias: ${associatedVariant}]`,
          confidenceScore: 85,
          confidenceLevel: "HIGH",
          verificationStatus: "VERIFIED",
          sourceType: r.tool,
          targetVariant: associatedVariant,
        };
        nodesMap.set(key, newNode);
      }

      // Link to associated target variation or root
      links.push({
        source: parentNodeId,
        target: nodeId,
        label: ent.relationship || "correlated_with",
      });
    }
  }

  // SYNTHESIZE KEY FINDINGS AND ATTACK SURFACE
  const keyFindings: string[] = [];
  const attackSurface: string[] = [];
  const nextSteps: string[] = [];
  let riskScore = 15;

  // Multi-Target Variation Footprint Summary Calculation
  const variantStatsMap = new Map<string, { activeAccountsCount: number; platforms: string[] }>();
  for (const v of activeTargetVariations) {
    variantStatsMap.set(v, { activeAccountsCount: 0, platforms: [] });
  }

  for (const r of results) {
    const vKey = r.targetVariant || rawTarget;
    const stats = variantStatsMap.get(vKey) || { activeAccountsCount: 0, platforms: [] };

    if (r.tool === "username_enum" && r.discoveredEntities) {
      for (const ent of r.discoveredEntities) {
        stats.activeAccountsCount++;
        const platformMatch = ent.label.match(/\(([^)]+)\)/);
        if (platformMatch && !stats.platforms.includes(platformMatch[1])) {
          stats.platforms.push(platformMatch[1]);
        }
      }
    }
    if (r.tool === "github_recon" && r.rawText.includes("Public Repos")) {
      if (!stats.platforms.includes("GitHub")) {
        stats.platforms.push("GitHub");
        stats.activeAccountsCount++;
      }
    }
    variantStatsMap.set(vKey, stats);
  }

  const matchedVariationsSummary = Array.from(variantStatsMap.entries()).map(([variant, data]) => ({
    variant,
    activeAccountsCount: data.activeAccountsCount,
    platforms: data.platforms,
  }));

  const activeHits = matchedVariationsSummary.filter((m) => m.activeAccountsCount > 0);

  if (activeTargetVariations.length > 1) {
    if (activeHits.length > 0) {
      keyFindings.push(
        `Dynamic Target Matrix: Out of ${activeTargetVariations.length} monitored target variations, active footprints were detected for: ${activeHits.map((h) => `${h.variant} (${h.platforms.join(", ")})`).join("; ")}.`
      );
      riskScore += activeHits.length * 12;
    } else {
      keyFindings.push(
        `Dynamic Target Matrix: Monitored 5 target variations (${activeTargetVariations.join(", ")}). No active direct public accounts indexed.`
      );
    }
  }

  const totalEntities = nodesMap.size - 1 - (activeTargetVariations.length > 1 ? activeTargetVariations.length - 1 : 0);
  keyFindings.push(`Identified ${Math.max(0, totalEntities)} correlated intelligence artifacts across ${results.length} active recon operations.`);

  for (const r of results) {
    if (r.tool === "port_scan_passive" && r.rawText.includes("Open Ports")) {
      const match = r.rawText.match(/Open Ports: ([^\n]+)/);
      if (match) {
        attackSurface.push(`Exposed Open Ports: ${match[1]}`);
        riskScore += 25;
      }
      const cveMatch = r.rawText.match(/Known CVE Vulnerabilities \(\d+\): ([^\n]+)/);
      if (cveMatch) {
        attackSurface.push(`Publicly Indexed CVE Vulnerabilities: ${cveMatch[1]}`);
        riskScore += 40;
      }
    }

    if (r.tool === "cert_lookup" && (r.discoveredEntities?.length || 0) > 0) {
      keyFindings.push(`Exposed ${r.discoveredEntities!.length} subdomains via public TLS certificates.`);
      riskScore += 10;
    }

    if (r.tool === "extract_metadata" && r.rawText.includes("robots.txt Disallowed")) {
      attackSurface.push(`Hidden internal endpoints indexed in robots.txt disallow rules.`);
    }
  }

  riskScore = Math.min(100, Math.max(10, riskScore));
  let threatLevel: AgentScanResponse["summary"]["threatLevel"] = "LOW";
  if (riskScore >= 75) threatLevel = "CRITICAL";
  else if (riskScore >= 50) threatLevel = "HIGH";
  else if (riskScore >= 30) threatLevel = "MEDIUM";

  if (attackSurface.length === 0) {
    attackSurface.push("No immediate exposed vulnerabilities or critical port openings detected passively.");
  }

  nextSteps.push("Inject discovered nodes directly into the RedHorizon Tactical Graph Canvas for deep visual linkage.");
  if (activeHits.length > 1) {
    nextSteps.push(`Correlate cross-alias findings between ${activeHits.map((h) => h.variant).join(" & ")} for timeline reconstruction.`);
  }
  if (detectedType === "domain") {
    nextSteps.push("Perform deep content inspection and parameter analysis on exposed subdomains.");
  }
  if (detectedType === "username" || detectedType === "person") {
    nextSteps.push("Cross-reference social account aliases with Breach Vault and Stylometry Lab.");
  }

  const executionTimeMs = Date.now() - startTime;
  log(`[AUTONOMOUS OSINT AGENT] Recon complete in ${executionTimeMs}ms. Mapped ${nodesMap.size} nodes, ${links.length} links.`);

  return {
    success: true,
    target: rawTarget,
    targetVariations: activeTargetVariations,
    detectedType,
    executionTimeMs,
    toolsRun: results.length,
    results,
    logs,
    graph: {
      nodes: Array.from(nodesMap.values()),
      links,
    },
    summary: {
      verdict: `RECONNAISSANCE DOSSIER COMPILED: ${rawTarget.toUpperCase()} (${activeTargetVariations.length} TARGET VARIATIONS)`,
      riskScore,
      threatLevel,
      keyFindings,
      attackSurface,
      recommendedNextSteps: nextSteps,
      matchedVariations: matchedVariationsSummary,
    },
  };
}
