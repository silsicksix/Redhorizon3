import dns from "dns/promises";
import tls from "tls";
import net from "net";
import crypto from "crypto";

export interface ToolResult {
  tool: string;
  category: "dns" | "whois" | "ip" | "web" | "email" | "social" | "archive";
  title: string;
  summary: string;
  rawText: string;
  structuredData?: any;
  targetVariant?: string;
  discoveredEntities?: Array<{
    label: string;
    type: "person" | "domain" | "ip" | "email" | "phone" | "server" | "location" | "social" | "vulnerability" | "repo";
    details?: string;
    relationship?: string;
    targetVariant?: string;
  }>;
}

// Clean domain utility
export function cleanDomain(domain: string): string {
  let d = domain.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.split("/")[0];
  d = d.split(":")[0];
  return d;
}

// 1. DNS LOOKUP
export async function runDnsLookup(domainInput: string): Promise<ToolResult> {
  const domain = cleanDomain(domainInput);
  const rtypes = ["A", "AAAA", "MX", "NS", "TXT"];
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];

  try {
    const fetchPromises = rtypes.map(async (rtype) => {
      try {
        const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${rtype}`, {
          signal: AbortSignal.timeout(6000),
          headers: { Accept: "application/json" },
        });
        if (!resp.ok) return { rtype, records: [] };
        const data: any = await resp.json();
        const answers = (data.Answer || []).map((a: any) => a.data).filter(Boolean);
        return { rtype, records: answers };
      } catch {
        return { rtype, records: [] };
      }
    });

    const results = await Promise.all(fetchPromises);
    for (const res of results) {
      if (res.records.length > 0) {
        lines.push(`${res.rtype}: ${res.records.join(", ")}`);
        if (res.rtype === "A" || res.rtype === "AAAA") {
          for (const ip of res.records) {
            discovered.push({
              label: ip,
              type: "ip",
              details: `Resolved IP for domain ${domain}`,
              relationship: "resolves_to",
            });
          }
        } else if (res.rtype === "MX") {
          for (const mx of res.records) {
            const mxHost = mx.split(" ").pop();
            if (mxHost) {
              discovered.push({
                label: mxHost,
                type: "server",
                details: `Mail Exchanger for ${domain}`,
                relationship: "mail_server",
              });
            }
          }
        }
      }
    }
  } catch (err: any) {
    lines.push(`DNS Error: ${err.message}`);
  }

  const rawText = lines.length > 0 ? lines.join("\n") : "No DNS records found.";
  return {
    tool: "dns_lookup",
    category: "dns",
    title: `DNS Records for ${domain}`,
    summary: lines.slice(0, 3).join(" | ") || "No records",
    rawText,
    discoveredEntities: discovered,
  };
}

// 2. CERTIFICATE TRANSPARENCY (crt.sh)
export async function runCertLookup(domainInput: string): Promise<ToolResult> {
  const domain = cleanDomain(domainInput);
  const discovered: ToolResult["discoveredEntities"] = [];
  const lines: string[] = [];

  try {
    const resp = await fetch(`https://crt.sh/?q=%.${encodeURIComponent(domain)}&output=json`, {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36" },
    });
    if (!resp.ok) throw new Error(`crt.sh returned status ${resp.status}`);
    const entries: any = await resp.json();
    const names = new Set<string>();

    if (Array.isArray(entries)) {
      for (const e of entries) {
        const val = e.name_value || "";
        for (const sub of val.split("\n")) {
          const cleanSub = sub.trim().toLowerCase();
          if (cleanSub && cleanSub.includes(domain) && !cleanSub.includes("*")) {
            names.add(cleanSub);
          }
        }
      }
    }

    const sortedNames = Array.from(names).sort();
    lines.push(`Discovered ${sortedNames.length} certificate subdomains for ${domain}:`);
    for (const sub of sortedNames.slice(0, 30)) {
      lines.push(`  - ${sub}`);
      discovered.push({
        label: sub,
        type: "domain",
        details: `Subdomain identified via Certificate Transparency (crt.sh)`,
        relationship: "subdomain_of",
      });
    }
  } catch (err: any) {
    lines.push(`crt.sh lookup error: ${err.message}`);
  }

  return {
    tool: "cert_lookup",
    category: "dns",
    title: `Certificate Subdomains (crt.sh) for ${domain}`,
    summary: lines[0] || "No certificates found",
    rawText: lines.join("\n"),
    discoveredEntities: discovered,
  };
}

// 3. SUBDOMAIN BRUTE-FORCE (Google DoH)
const COMMON_SUBDOMAINS = [
  "www", "mail", "smtp", "imap", "pop", "webmail", "ns1", "ns2", "dns",
  "vpn", "remote", "portal", "admin", "dev", "staging", "test", "api",
  "app", "blog", "shop", "store", "cdn", "static", "assets", "img",
  "git", "gitlab", "jenkins", "ci", "docs", "support", "help", "status",
  "dashboard", "secure", "login", "auth", "sso", "cloud", "ftp", "db"
];

export async function runSubdomainBruteforce(domainInput: string): Promise<ToolResult> {
  const domain = cleanDomain(domainInput);
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];

  const checks = COMMON_SUBDOMAINS.map(async (word) => {
    const host = `${word}.${domain}`;
    try {
      const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return null;
      const data: any = await resp.json();
      if (data && data.Answer) {
        const ips = data.Answer.filter((a: any) => a.type === 1).map((a: any) => a.data);
        if (ips.length > 0) {
          return { host, ips };
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const resolved = (await Promise.all(checks)).filter(Boolean);
  lines.push(`Resolved ${resolved.length} active live subdomains via DNS DoH:`);
  for (const item of resolved) {
    if (!item) continue;
    lines.push(`  ${item.host} -> ${item.ips.join(", ")}`);
    discovered.push({
      label: item.host,
      type: "domain",
      details: `Active host resolving to: ${item.ips.join(", ")}`,
      relationship: "subdomain_of",
    });
  }

  return {
    tool: "subdomain_bruteforce",
    category: "dns",
    title: `Subdomain Probe for ${domain}`,
    summary: `Found ${resolved.length} active subdomains`,
    rawText: lines.join("\n"),
    discoveredEntities: discovered,
  };
}

// 4. IP GEOLOCATION & ISP (ip-api.com)
export async function runIpLookup(ipInput: string): Promise<ToolResult> {
  const ip = ipInput.trim();
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];
  let structuredData: any = null;

  try {
    const resp = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,zip,lat,lon,isp,org,as,reverse,query`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data: any = await resp.json();
    if (data.status === "success") {
      structuredData = data;
      lines.push(`IP Address: ${data.query}`);
      lines.push(`Country: ${data.country}`);
      lines.push(`Region / City: ${data.regionName}, ${data.city} (${data.zip || "N/A"})`);
      lines.push(`Coordinates: ${data.lat}, ${data.lon}`);
      lines.push(`ISP: ${data.isp}`);
      lines.push(`Organization: ${data.org}`);
      lines.push(`ASN: ${data.as}`);
      if (data.reverse) lines.push(`Reverse DNS: ${data.reverse}`);

      if (data.city || data.country) {
        discovered.push({
          label: `${data.city || data.regionName}, ${data.country}`,
          type: "location",
          details: `Latitude: ${data.lat}, Longitude: ${data.lon} | ISP: ${data.isp}`,
          relationship: "located_at",
        });
      }
      if (data.org || data.isp) {
        discovered.push({
          label: data.org || data.isp,
          type: "server",
          details: `ASN: ${data.as} | ISP: ${data.isp}`,
          relationship: "hosted_by",
        });
      }
    } else {
      lines.push(`IP Lookup Failed: ${data.message || "Unknown error"}`);
    }
  } catch (err: any) {
    lines.push(`IP Lookup Exception: ${err.message}`);
  }

  return {
    tool: "ip_lookup",
    category: "ip",
    title: `IP Geolocation & ISP for ${ip}`,
    summary: lines.slice(1, 4).join(" | ") || "IP Lookup failed",
    rawText: lines.join("\n"),
    structuredData,
    discoveredEntities: discovered,
  };
}

// 5. ASN LOOKUP (BGPView API)
export async function runAsnLookup(asnInput: string): Promise<ToolResult> {
  const num = asnInput.replace(/[^0-9]/g, "");
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];

  if (!num) {
    return {
      tool: "asn_lookup",
      category: "ip",
      title: `ASN Lookup for ${asnInput}`,
      summary: "Invalid ASN number provided",
      rawText: "Invalid ASN",
      discoveredEntities: [],
    };
  }

  try {
    const [infoResp, prefixResp] = await Promise.all([
      fetch(`https://api.bgpview.io/asn/${num}`, { signal: AbortSignal.timeout(8000) }),
      fetch(`https://api.bgpview.io/asn/${num}/prefixes`, { signal: AbortSignal.timeout(8000) }),
    ]);

    const infoData: any = await infoResp.json();
    const prefixData: any = await prefixResp.json();

    if (infoData && infoData.status === "ok") {
      const d = infoData.data || {};
      lines.push(`ASN: AS${num}`);
      lines.push(`Name: ${d.name || "N/A"}`);
      lines.push(`Description: ${d.description_short || "N/A"}`);
      lines.push(`Country: ${d.country_code || "N/A"}`);
      if (d.website) lines.push(`Website: ${d.website}`);

      discovered.push({
        label: `AS${num} - ${d.name || "Autonomous System"}`,
        type: "server",
        details: `BGP Autonomous System: ${d.description_short || ""}`,
        relationship: "bgp_routing",
      });
    }

    if (prefixData && prefixData.status === "ok") {
      const v4 = prefixData.data?.ipv4_prefixes || [];
      lines.push(`\nIPv4 Announced Prefixes (${v4.length}):`);
      for (const p of v4.slice(0, 15)) {
        lines.push(`  - ${p.prefix} (${p.name || "N/A"})`);
      }
    }
  } catch (err: any) {
    lines.push(`ASN Lookup Error: ${err.message}`);
  }

  return {
    tool: "asn_lookup",
    category: "ip",
    title: `ASN Intelligence AS${num}`,
    summary: lines.slice(1, 3).join(" | ") || "ASN lookup completed",
    rawText: lines.join("\n"),
    discoveredEntities: discovered,
  };
}

// 6. PASSIVE PORT / SERVICE / VULNERABILITY (Shodan InternetDB)
export async function runPassivePortScan(ipInput: string): Promise<ToolResult> {
  const ip = ipInput.trim();
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];

  try {
    const resp = await fetch(`https://internetdb.shodan.io/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (resp.status === 404) {
      lines.push(`No indexed open ports/services found in Shodan InternetDB for ${ip}.`);
    } else if (resp.ok) {
      const data: any = await resp.json();
      if (data.ports && data.ports.length > 0) {
        lines.push(`Open Ports: ${data.ports.join(", ")}`);
      }
      if (data.hostnames && data.hostnames.length > 0) {
        lines.push(`Hostnames: ${data.hostnames.join(", ")}`);
        for (const h of data.hostnames) {
          discovered.push({
            label: h,
            type: "domain",
            details: `Shodan Reverse Hostname for ${ip}`,
            relationship: "associated_host",
          });
        }
      }
      if (data.cpes && data.cpes.length > 0) {
        lines.push(`CPEs: ${data.cpes.slice(0, 10).join(", ")}`);
      }
      if (data.vulns && data.vulns.length > 0) {
        lines.push(`Known CVE Vulnerabilities (${data.vulns.length}): ${data.vulns.join(", ")}`);
        for (const cve of data.vulns.slice(0, 8)) {
          discovered.push({
            label: cve,
            type: "vulnerability",
            details: `Exposed CVE vulnerability on host ${ip}`,
            relationship: "vulnerable_to",
          });
        }
      }
      if (data.tags && data.tags.length > 0) {
        lines.push(`Tags: ${data.tags.join(", ")}`);
      }
    }
  } catch (err: any) {
    lines.push(`Passive Port Scan Error: ${err.message}`);
  }

  return {
    tool: "port_scan_passive",
    category: "ip",
    title: `Passive Shodan Security Scan for ${ip}`,
    summary: lines[0] || "No exposed services indexed",
    rawText: lines.join("\n"),
    discoveredEntities: discovered,
  };
}

// 7. GITHUB OSINT RECON
export async function runGithubRecon(usernameInput: string, targetVariant?: string): Promise<ToolResult> {
  const username = usernameInput.trim().replace(/^@/, "");
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];

  try {
    const [userResp, reposResp] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "RedHorizon-OSINT-Agent" },
      }),
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=8`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "RedHorizon-OSINT-Agent" },
      }),
    ]);

    if (userResp.ok) {
      const u: any = await userResp.json();
      lines.push(`Username: ${u.login}`);
      if (u.name) lines.push(`Name: ${u.name}`);
      if (u.company) lines.push(`Company: ${u.company}`);
      if (u.location) lines.push(`Location: ${u.location}`);
      if (u.email) lines.push(`Email: ${u.email}`);
      if (u.blog) lines.push(`Website/Blog: ${u.blog}`);
      if (u.bio) lines.push(`Bio: ${u.bio}`);
      lines.push(`Public Repos: ${u.public_repos} | Followers: ${u.followers}`);
      lines.push(`Account Created: ${u.created_at}`);

      if (u.email) {
        discovered.push({
          label: u.email,
          type: "email",
          details: `Public GitHub email for ${username}`,
          relationship: "contact_email",
          targetVariant: targetVariant || username,
        });
      }
      if (u.company) {
        discovered.push({
          label: u.company,
          type: "person",
          details: `Affiliated Company from GitHub profile`,
          relationship: "works_at",
          targetVariant: targetVariant || username,
        });
      }
      if (u.location) {
        discovered.push({
          label: u.location,
          type: "location",
          details: `Stated GitHub location for ${username}`,
          relationship: "located_at",
          targetVariant: targetVariant || username,
        });
      }

      if (reposResp.ok) {
        const repos: any = await reposResp.json();
        if (Array.isArray(repos) && repos.length > 0) {
          lines.push(`\nRecent Public Repositories:`);
          for (const r of repos) {
            lines.push(`  - ${r.name} (${r.language || "Misc"}, ⭐ ${r.stargazers_count}) -> ${r.html_url}`);
            discovered.push({
              label: r.name,
              type: "repo",
              details: `GitHub repo: ${r.description || "No description"} (${r.language || "Code"})`,
              relationship: "authored_repo",
              targetVariant: targetVariant || username,
            });
          }
        }
      }
    } else {
      lines.push(`No public GitHub account found for '${username}' (HTTP ${userResp.status}).`);
    }
  } catch (err: any) {
    lines.push(`GitHub Recon Error: ${err.message}`);
  }

  return {
    tool: "github_recon",
    category: "social",
    title: `GitHub Reconnaissance for @${username}`,
    summary: lines.slice(0, 3).join(" | ") || "GitHub search finished",
    rawText: lines.join("\n"),
    targetVariant: targetVariant || username,
    discoveredEntities: discovered,
  };
}

// 8. RIGOROUS USERNAME ENUMERATION ACROSS VERIFIABLE PLATFORMS (ANTI-FALSE-POSITIVE)
export async function runUsernameEnum(usernameInput: string, targetVariant?: string): Promise<ToolResult> {
  const username = usernameInput.trim().replace(/^@/, "");
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];
  const foundSites: string[] = [];

  // Skip invalid/empty usernames or strings with spaces
  if (!username || /\s/.test(username) || username.length < 2) {
    return {
      tool: "username_enum",
      category: "social",
      title: `Cross-Platform Footprint for @${username}`,
      summary: "Invalid username format for enumeration",
      rawText: "Target must be a valid single-token username without spaces.",
      targetVariant: targetVariant || username,
      discoveredEntities: [],
    };
  }

  const verifiers = [
    {
      site: "GitHub",
      url: `https://github.com/${username}`,
      check: async () => {
        const resp = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
          signal: AbortSignal.timeout(6000),
          headers: { "User-Agent": "RedHorizon-OSINT-Agent/3.0" }
        });
        if (resp.status === 200) {
          const data: any = await resp.json();
          return { found: true, details: `GitHub: ${data.name || username} (${data.public_repos || 0} repos, ${data.followers || 0} followers)` };
        }
        return { found: false };
      }
    },
    {
      site: "GitLab",
      url: `https://gitlab.com/${username}`,
      check: async () => {
        const resp = await fetch(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`, {
          signal: AbortSignal.timeout(6000),
          headers: { "User-Agent": "RedHorizon-OSINT-Agent/3.0" }
        });
        if (resp.ok) {
          const data: any = await resp.json();
          if (Array.isArray(data) && data.length > 0 && data[0].username?.toLowerCase() === username.toLowerCase()) {
            return { found: true, details: `GitLab User: ${data[0].name || username}` };
          }
        }
        return { found: false };
      }
    },
    {
      site: "Reddit",
      url: `https://www.reddit.com/user/${username}`,
      check: async () => {
        const resp = await fetch(`https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`, {
          signal: AbortSignal.timeout(6000),
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) OSINT/1.0" }
        });
        if (resp.ok) {
          const data: any = await resp.json();
          if (data?.data?.name && !data.data.is_suspended) {
            return { found: true, details: `Reddit User: u/${data.data.name} (Karma: ${(data.data.total_karma || 0)})` };
          }
        }
        return { found: false };
      }
    },
    {
      site: "Dev.to",
      url: `https://dev.to/${username}`,
      check: async () => {
        const resp = await fetch(`https://dev.to/api/users/by_username?url=${encodeURIComponent(username)}`, {
          signal: AbortSignal.timeout(6000),
          headers: { "User-Agent": "RedHorizon-OSINT-Agent/3.0" }
        });
        if (resp.status === 200) {
          const data: any = await resp.json();
          if (data?.username) {
            return { found: true, details: `Dev.to Author: ${data.name || username}` };
          }
        }
        return { found: false };
      }
    },
    {
      site: "HackerNews",
      url: `https://news.ycombinator.com/user?id=${username}`,
      check: async () => {
        const resp = await fetch(`https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(username)}.json`, {
          signal: AbortSignal.timeout(6000)
        });
        if (resp.ok) {
          const data: any = await resp.json();
          if (data && data.id && data.created) {
            return { found: true, details: `HackerNews User: ${data.id} (Karma: ${data.karma || 0})` };
          }
        }
        return { found: false };
      }
    },
    {
      site: "Keybase",
      url: `https://keybase.io/${username}`,
      check: async () => {
        const resp = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?usernames=${encodeURIComponent(username)}`, {
          signal: AbortSignal.timeout(6000)
        });
        if (resp.ok) {
          const data: any = await resp.json();
          if (data?.status?.code === 0 && data?.them?.[0] !== null && data?.them?.[0]?.basics?.username) {
            return { found: true, details: `Keybase Cryptographic Identity: ${data.them[0].basics.username}` };
          }
        }
        return { found: false };
      }
    },
    {
      site: "Telegram",
      url: `https://t.me/${username}`,
      check: async () => {
        const resp = await fetch(`https://t.me/${encodeURIComponent(username)}`, {
          signal: AbortSignal.timeout(6000),
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        if (resp.ok) {
          const html = await resp.text();
          // Real Telegram users/channels have tgme_page_title and don't say "If you have Telegram, you can contact"
          const hasTitle = html.includes('class="tgme_page_title"') || html.includes('class="tgme_page_extra"');
          const isNotFound = html.includes("If you have Telegram, you can view and join") && !html.includes('class="tgme_page_title"');
          if (hasTitle && !isNotFound) {
            return { found: true, details: `Telegram Public User/Channel: @${username}` };
          }
        }
        return { found: false };
      }
    }
  ];

  const results = await Promise.allSettled(verifiers.map(async (v) => {
    try {
      const res = await v.check();
      return { site: v.site, url: v.url, ...res };
    } catch {
      return { site: v.site, url: v.url, found: false };
    }
  }));

  lines.push(`Strict Verification Footprint scan for '@${username}':`);
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.found) {
      const val = r.value;
      lines.push(`  [✓ VERIFIED] ${val.site}: ${val.url}`);
      foundSites.push(val.site);
      discovered.push({
        label: `${username} (${val.site})`,
        type: "social",
        details: val.details || `Sahkan akaun wujud di ${val.site}: ${val.url}`,
        relationship: "account_on",
        targetVariant: targetVariant || username,
      });
    }
  }

  if (foundSites.length === 0) {
    lines.push(`  [-] Tiada profil awam sah disahkan secara automatik merentasi rangkaian yang diuji.`);
  }

  return {
    tool: "username_enum",
    category: "social",
    title: `Cross-Platform Footprint for @${username}`,
    summary: foundSites.length > 0 ? `Disahkan wujud di: ${foundSites.join(", ")}` : "Tiada padanan sah ditemui",
    rawText: lines.join("\n"),
    targetVariant: targetVariant || username,
    discoveredEntities: discovered,
  };
}

// 9. GRAVATAR IDENTITY LOOKUP
export async function runGravatarLookup(emailInput: string, targetVariant?: string): Promise<ToolResult> {
  const email = emailInput.trim().toLowerCase();
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];

  const md5 = crypto.createHash("md5").update(email).digest("hex");
  const avatarUrl = `https://www.gravatar.com/avatar/${md5}?d=404`;
  const profileUrl = `https://www.gravatar.com/${md5}.json`;

  try {
    const [avatarResp, profileResp] = await Promise.all([
      fetch(avatarUrl, { method: "HEAD", signal: AbortSignal.timeout(6000) }),
      fetch(profileUrl, { signal: AbortSignal.timeout(6000) }),
    ]);

    const hasAvatar = avatarResp.status === 200;
    lines.push(`Target Email: ${email}`);
    lines.push(`Gravatar Hash: ${md5}`);
    lines.push(`Avatar Registered: ${hasAvatar ? "YES" : "NO"}`);
    if (hasAvatar) {
      lines.push(`Avatar URL: https://www.gravatar.com/avatar/${md5}`);
    }

    if (profileResp.ok) {
      const pData: any = await profileResp.json();
      if (pData.entry && pData.entry.length > 0) {
        const entry = pData.entry[0];
        if (entry.displayName) {
          lines.push(`Display Name: ${entry.displayName}`);
          discovered.push({
            label: entry.displayName,
            type: "person",
            details: `Gravatar Profile Identity (${email})`,
            relationship: "identity_of",
            targetVariant: targetVariant || email,
          });
        }
        if (entry.aboutMe) lines.push(`Bio/About: ${entry.aboutMe}`);
        if (entry.currentLocation) lines.push(`Location: ${entry.currentLocation}`);
        if (entry.accounts) {
          lines.push(`Linked Profiles: ${entry.accounts.map((a: any) => `${a.shortname}: ${a.url}`).join(", ")}`);
        }
      }
    }
  } catch (err: any) {
    lines.push(`Gravatar lookup error: ${err.message}`);
  }

  return {
    tool: "gravatar_lookup",
    category: "email",
    title: `Gravatar Identity for ${email}`,
    summary: lines[2] || "Gravatar check completed",
    rawText: lines.join("\n"),
    targetVariant: targetVariant || email,
    discoveredEntities: discovered,
  };
}

// 10. EMAIL VALIDATION & MX PROBE
export async function runEmailValidate(emailInput: string): Promise<ToolResult> {
  const email = emailInput.trim();
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];

  const isValidSyntax = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  lines.push(`Email: ${email}`);
  lines.push(`Syntax Format: ${isValidSyntax ? "VALID" : "INVALID"}`);

  if (isValidSyntax) {
    const domain = email.split("@")[1].toLowerCase();
    try {
      const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
        signal: AbortSignal.timeout(6000),
      });
      const data: any = await resp.json();
      const mx = (data.Answer || []).map((a: any) => a.data).filter(Boolean);
      if (mx.length > 0) {
        lines.push(`Domain MX Servers (${mx.length}): ${mx.slice(0, 5).join(", ")}`);
        lines.push(`Deliverable Domain: LIKELY (MX Active)`);
        for (const s of mx.slice(0, 2)) {
          discovered.push({
            label: s.split(" ").pop() || s,
            type: "server",
            details: `Mail Server for ${domain}`,
            relationship: "mx_route",
          });
        }
      } else {
        lines.push(`Deliverable Domain: NO MX RECORDS DETECTED`);
      }
    } catch (e: any) {
      lines.push(`MX Check Error: ${e.message}`);
    }
  }

  return {
    tool: "email_validate",
    category: "email",
    title: `Email Validation for ${email}`,
    summary: lines.slice(1, 3).join(" | "),
    rawText: lines.join("\n"),
    discoveredEntities: discovered,
  };
}

// 11. WAYBACK MACHINE SNAPSHOTS & HISTORY
export async function runWaybackLookup(urlInput: string): Promise<ToolResult> {
  let url = urlInput.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];

  try {
    const [availResp, cdxResp] = await Promise.all([
      fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(8000),
      }),
      fetch(
        `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&fl=timestamp,statuscode,original&collapse=timestamp:4&limit=100`,
        { signal: AbortSignal.timeout(10000) }
      ),
    ]);

    const availData: any = await availResp.json();
    const snapshot = availData?.archived_snapshots?.closest;
    if (snapshot && snapshot.available) {
      lines.push(`Closest Archived Snapshot:`);
      lines.push(`  URL: ${snapshot.url}`);
      lines.push(`  Timestamp: ${snapshot.timestamp}`);
      lines.push(`  HTTP Status: ${snapshot.status}`);
    } else {
      lines.push(`No immediate snapshot in Wayback availability API.`);
    }

    if (cdxResp.ok) {
      const cdxData: any = await cdxResp.json();
      if (Array.isArray(cdxData) && cdxData.length > 1) {
        const rows = cdxData.slice(1);
        const years = new Set(rows.map((r: any) => String(r[0]).substring(0, 4)));
        lines.push(`\nTotal Timeline Archive Captures: ${rows.length}`);
        lines.push(`First Recorded: ${rows[0][0]} | Last Recorded: ${rows[rows.length - 1][0]}`);
        lines.push(`Archived Years: ${Array.from(years).sort().join(", ")}`);
      }
    }
  } catch (err: any) {
    lines.push(`Wayback Lookup Error: ${err.message}`);
  }

  return {
    tool: "wayback_lookup",
    category: "archive",
    title: `Wayback History for ${url}`,
    summary: lines.slice(0, 2).join(" | ") || "Archive search completed",
    rawText: lines.join("\n"),
    discoveredEntities: discovered,
  };
}

// 12. WEB METADATA & ROBOTS.TXT INSPECTION
export async function runWebInspection(urlInput: string): Promise<ToolResult> {
  let url = urlInput.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  const domain = cleanDomain(url);
  const lines: string[] = [];
  const discovered: ToolResult["discoveredEntities"] = [];

  try {
    const [pageResp, robotsResp] = await Promise.all([
      fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RedHorizonOSINT/2.5)" },
      }),
      fetch(`https://${domain}/robots.txt`, {
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RedHorizonOSINT/2.5)" },
      }),
    ]);

    if (pageResp.ok) {
      const html = await pageResp.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i);

      lines.push(`Page URL: ${pageResp.url}`);
      if (titleMatch) lines.push(`Title: ${titleMatch[1].trim()}`);
      if (descMatch) lines.push(`Meta Description: ${descMatch[1].trim()}`);
      if (authorMatch) {
        lines.push(`Author: ${authorMatch[1].trim()}`);
        discovered.push({
          label: authorMatch[1].trim(),
          type: "person",
          details: `Author metadata on ${domain}`,
          relationship: "authored_site",
        });
      }
    }

    if (robotsResp.ok) {
      const robotsTxt = await robotsResp.text();
      const disallows = Array.from(robotsTxt.matchAll(/Disallow:\s*(\S+)/gi)).map((m) => m[1]);
      const sitemaps = Array.from(robotsTxt.matchAll(/Sitemap:\s*(\S+)/gi)).map((m) => m[1]);
      if (disallows.length > 0) {
        lines.push(`\nrobots.txt Disallowed Endpoints (${disallows.length}):`);
        for (const d of disallows.slice(0, 10)) {
          lines.push(`  - ${d}`);
        }
      }
      if (sitemaps.length > 0) {
        lines.push(`Sitemaps: ${sitemaps.slice(0, 3).join(", ")}`);
      }
    }
  } catch (err: any) {
    lines.push(`Web Inspection Error: ${err.message}`);
  }

  return {
    tool: "extract_metadata",
    category: "web",
    title: `Web Metadata & Robots for ${domain}`,
    summary: lines.slice(1, 3).join(" | ") || "Web inspection completed",
    rawText: lines.join("\n"),
    discoveredEntities: discovered,
  };
}
