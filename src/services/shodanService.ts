
import { ShodanHost } from "../types";

export const scanHostWithShodan = async (apiKey: string, query: string, customBackendUrl?: string): Promise<ShodanHost> => {
  
  if (customBackendUrl && customBackendUrl.includes('http')) {
      try {
          const cleanUrl = customBackendUrl.trim().replace(/\/$/, '');
          const response = await fetch(`${cleanUrl}/api/shodan?query=${encodeURIComponent(query)}&key=${apiKey}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true',
                'bypass-tunnel-reminder': 'true'
            }
          });
          if (!response.ok) throw new Error("Local Backend Error");
          const data = await response.json();
          return { ...data, isSimulated: false } as ShodanHost;
      } catch (e) {
          console.warn("Local Backend Failed, falling back to CORS Proxy mode.", e);
      }
  }

  if (!apiKey) {
    return getSimulationData(query, "API Key Missing");
  }

  const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const isIp = ipv4Pattern.test(query.trim());

  let targetUrl = '';
  if (isIp) {
      targetUrl = `https://api.shodan.io/shodan/host/${query}?key=${apiKey}`;
  } else {
      targetUrl = `https://api.shodan.io/shodan/host/search?key=${apiKey}&query=${encodeURIComponent(query)}&limit=1`;
  }

  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    });
    
    if (response.status === 401) throw new Error("Invalid Shodan API Key.");
    if (response.status === 404) throw new Error("Target not found.");
    
    if (!response.ok) throw new Error(`Shodan API Error: ${response.statusText}`);

    const data = await response.json();

    if (!isIp && data.matches && data.matches.length > 0) {
        const topMatch = data.matches[0];
        return {
            ip_str: topMatch.ip_str,
            org: topMatch.org,
            isp: topMatch.isp,
            os: topMatch.os,
            ports: topMatch.port ? [topMatch.port] : [],
            hostnames: topMatch.hostnames || [],
            country_name: topMatch.location?.country_name || 'Unknown',
            city: topMatch.location?.city || 'Unknown',
            last_update: topMatch.timestamp,
            vulns: topMatch.vulns ? Object.keys(topMatch.vulns) : [],
            data: [{
                port: topMatch.port,
                data: topMatch.data,
                product: topMatch.product || 'Unknown Service'
            }],
            isSimulated: false
        } as ShodanHost;
    }

    return { ...data, isSimulated: false } as ShodanHost;

  } catch (error: any) {
    if (apiKey) {
      throw error;
    }
    return getSimulationData(query, `Connection Blocked or Failed: ${error.message}`);
  }
};

const getSimulationData = (query: string, reason: string): ShodanHost => {
    return {
        ip_str: query.includes('.') ? query : "104.21.55.2",
        org: "Simulation Network (Fallback)",
        isp: "Cloudflare Inc.",
        os: "Linux 5.4.0-generic",
        ports: [80, 443, 8080, 22],
        hostnames: [query, `www.${query}`, "cdn.target-node.net"],
        country_name: "United States",
        city: "San Francisco",
        last_update: new Date().toISOString(),
        vulns: ["CVE-2023-44487", "CVE-2022-22965"],
        data: [
            { port: 443, data: "HTTP/1.1 200 OK\nServer: cloudflare\nDate: " + new Date().toUTCString(), product: "Cloudflare Web Server" },
            { port: 22, data: "SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5", product: "OpenSSH" }
        ],
        isSimulated: true
    };
};
