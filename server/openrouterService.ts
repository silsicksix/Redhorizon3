let openRouterKeyIndex = 0;

export function getOpenRouterKeyPool(customKey?: string): string[] {
  const raw = (customKey && customKey.trim().length > 10) 
    ? customKey 
    : (process.env.OPENROUTER_API_KEY || "");
  
  if (!raw) return [];
  
  return raw
    .split(/[\n,;]+/)
    .map(k => k.trim())
    .filter(k => k.length > 15 && !k.includes("YOUR_") && !k.includes("dummy"));
}

export function getEffectiveOpenRouterKey(customKey?: string): string {
  const pool = getOpenRouterKeyPool(customKey);
  if (pool.length === 0) return "";
  openRouterKeyIndex = (openRouterKeyIndex + 1) % pool.length;
  return pool[openRouterKeyIndex];
}

export function hasValidOpenRouterKey(customKey?: string): boolean {
  const pool = getOpenRouterKeyPool(customKey);
  return pool.length > 0;
}

export function normalizeModelForProvider(model: string, isNvidiaDirect: boolean): string {
  let cleanModel = (model || "").trim();

  if (isNvidiaDirect) {
    // Strip OpenRouter-specific :free / :batch tags
    cleanModel = cleanModel.replace(/:free$/i, '').replace(/:batch$/i, '').trim();

    // Map common aliases to exact NVIDIA NIM integrate.api.nvidia.com endpoints
    if (cleanModel === 'nvidia/nemotron-3.5-lightning' || cleanModel.includes('3.5-lightning')) {
      return 'nvidia/nemotron-3.5-lightning-30b-a3b';
    }
    if (cleanModel === 'nvidia/nemotron-nano-12b-v2-vl' || cleanModel.includes('nano-12b')) {
      return 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
    }
    if (!cleanModel || cleanModel === 'openrouter/free' || cleanModel === 'custom') {
      return 'nvidia/llama-3.1-nemotron-70b-instruct';
    }
    return cleanModel;
  } else {
    // OpenRouter provider formatting
    if (cleanModel === 'nvidia/nemotron-3.5-lightning-30b-a3b') {
      return 'nvidia/nemotron-3.5-lightning:free';
    }
    if (!cleanModel || cleanModel === 'nvidia/llama-3.1-nemotron-70b-instruct') {
      // Use currently available free Nemotron on OpenRouter
      return 'nvidia/nemotron-3.5-lightning:free';
    }
    return cleanModel;
  }
}

export function getDefaultOpenRouterModel(customModel?: string, isNvidiaDirect: boolean = false): string {
  if (customModel && typeof customModel === "string" && customModel.trim().length > 2) {
    return normalizeModelForProvider(customModel.trim(), isNvidiaDirect);
  }
  const envModel = process.env.OPENROUTER_MODEL || "";
  if (envModel) {
    return normalizeModelForProvider(envModel, isNvidiaDirect);
  }
  return isNvidiaDirect ? "nvidia/llama-3.1-nemotron-70b-instruct" : "nvidia/nemotron-3.5-lightning:free";
}

export const cleanJsonOutput = (text: string) => {
  if (!text || typeof text !== 'string') return "{}";
  try {
    let clean = text.trim();
    // Strip thinking / reasoning tags
    clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    clean = clean.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

    // Extract markdown code block if present
    const markdownMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch && markdownMatch[1]) {
      clean = markdownMatch[1].trim();
    }

    // Match outermost object or array bounds
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      const lastBrace = clean.lastIndexOf('}');
      if (lastBrace !== -1 && lastBrace >= firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
      }
    } else if (firstBracket !== -1) {
      const lastBracket = clean.lastIndexOf(']');
      if (lastBracket !== -1 && lastBracket >= firstBracket) {
        clean = clean.substring(firstBracket, lastBracket + 1);
      }
    }

    // Try parsing; if failed, fix trailing commas
    try {
      JSON.parse(clean);
      return clean;
    } catch {
      const repaired = clean
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,\s*([\}\]])/g, '$1')
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .trim();
      JSON.parse(repaired);
      return repaired;
    }
  } catch (e) {
    return text.replace(/```json\s*|\s*```/g, "").trim();
  }
};

/**
 * Universal OpenRouter Chat Completion caller with NVIDIA Nemotron optimizations
 */
export async function callOpenRouterChat(
  prompt: string,
  options: {
    model?: string;
    apiKey?: string;
    systemInstruction?: string;
    responseMimeType?: string;
    temperature?: number;
  } = {}
): Promise<{ success: boolean; text: string; error?: string; modelUsed?: string }> {
  const key = getEffectiveOpenRouterKey(options.apiKey);
  if (!key) {
    return {
      success: false,
      text: "",
      error: "Sila masukkan API Key OpenRouter (sk-or-v1-...) atau NVIDIA Direct API Key (nvapi-...) dalam menu Tetapan."
    };
  }

  const isNvidiaDirect = key.startsWith("nvapi-");
  const model = getDefaultOpenRouterModel(options.model, isNvidiaDirect);
  const systemPrompt =
    options.systemInstruction ||
    "You are an elite cyber threat and OSINT intelligence specialist powered by NVIDIA Nemotron reasoning engine. Provide precise, analytical, and structured intelligence outputs.";

  const isJsonExpected = options.responseMimeType === "application/json" || prompt.includes("JSON");

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt }
  ];

  const payload: any = {
    model: model,
    messages: messages,
    temperature: options.temperature !== undefined ? options.temperature : 0.2,
    max_tokens: 4096
  };

  if (isJsonExpected) {
    payload.response_format = { type: "json_object" };
  }

  const targetUrl = isNvidiaDirect 
    ? "https://integrate.api.nvidia.com/v1/chat/completions" 
    : "https://openrouter.ai/api/v1/chat/completions";

  try {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    };

    if (!isNvidiaDirect) {
      headers["HTTP-Referer"] = "https://redhorizon-osint.local";
      headers["X-Title"] = "RedHorizon OSINT Recon Platform";
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const resText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(resText);
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errMsg = data?.error?.message || data?.detail || (resText.length < 150 ? resText : `HTTP ${response.status}: ${response.statusText}`);
      
      // If model not found or deprecated, try resilient fallback model
      const fallbackModel = isNvidiaDirect 
        ? (model !== "nvidia/llama-3.1-nemotron-70b-instruct" ? "nvidia/llama-3.1-nemotron-70b-instruct" : "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning")
        : (model !== "nvidia/nemotron-3.5-lightning:free" ? "nvidia/nemotron-3.5-lightning:free" : "nvidia/nemotron-3-super-120b-a12b:free");

      if ((errMsg.toLowerCase().includes("model") || errMsg.toLowerCase().includes("not found") || response.status === 404) && fallbackModel !== model) {
        console.warn(`[NEMOTRON AUTO-RETRY] Retrying with fallback model: ${fallbackModel} due to error: ${errMsg}`);
        payload.model = fallbackModel;
        const retryResp = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
        if (retryResp.ok) {
          const retryData = await retryResp.json();
          const retryContent = retryData.choices?.[0]?.message?.content || "";
          return {
            success: true,
            text: retryContent,
            modelUsed: `${fallbackModel} (auto-recovered)`
          };
        }
      }

      return { 
        success: false, 
        text: "", 
        error: isNvidiaDirect 
          ? `[NVIDIA Direct API]: ${errMsg}` 
          : `[OpenRouter API]: ${errMsg}`, 
        modelUsed: model 
      };
    }

    if (!data) {
      return { success: false, text: "", error: "Respons daripada pelayan API bukan dalam format JSON yang sah.", modelUsed: model };
    }

    const content = data.choices?.[0]?.message?.content || "";
    return {
      success: true,
      text: content,
      modelUsed: data.model || model
    };
  } catch (err: any) {
    return {
      success: false,
      text: "",
      error: err.message || "Gagal menyambung ke endpoint API.",
      modelUsed: model
    };
  }
}

/**
 * OpenRouter / Nemotron Intelligence Dossier & Topology Synthesis
 */
export async function openrouterFinalSynthesis(
  graph: any,
  additionalContext: string = "",
  options: { apiKey?: string; model?: string } = {}
) {
  const nodes = graph?.nodes || [];
  const sanitizedNodes = nodes.map((node: any) => {
    const { imageUrl, imageUrls, ...rest } = node;
    let details = rest.details || "";
    if (details.length > 1500) details = details.substring(0, 1500) + "...[TRUNCATED]";
    if (details.startsWith("data:image/")) details = "[IMAGE_DATA_REMOVED]";
    return { ...rest, details };
  });

  const prompt = `ACT AS: NVIDIA Nemotron Cyber Threat & OSINT Intelligence Strategic Analyst.
Synthesize the provided target network topology and raw context into a high-level strategic intelligence dossier.

CRITICAL INSTRUCTION:
Return ONLY valid JSON matching this schema:
{
  "verdict": "string (e.g. THREAT_ELEVATED / NEXUS_IDENTIFIED)",
  "codename": "string (e.g. OPERATION_NEMOTRON_SWEEP)",
  "threatLevel": "CRITICAL | ELEVATED | MODERATE | LOW",
  "confidenceScore": number (0-100),
  "summary": "comprehensive multi-paragraph analytical summary of the target, behavioral markers, and exposure",
  "reasoning": ["key deduction 1", "key deduction 2", "key deduction 3"],
  "smokingGun": "pivotal entity or link discovered",
  "suggestedNextSteps": "tactical recommendations for operational follow-up"
}

TOPOLOGY NODES:
${JSON.stringify(sanitizedNodes)}

ADDITIONAL CONTEXT:
${additionalContext.substring(0, 10000)}`;

  const res = await callOpenRouterChat(prompt, {
    apiKey: options.apiKey,
    model: options.model || "nvidia/llama-3.1-nemotron-70b-instruct",
    responseMimeType: "application/json",
    systemInstruction: "You are NVIDIA Nemotron OSINT Synthesis Engine. Output strictly JSON matching the required schema."
  });

  if (res.success && res.text) {
    try {
      const parsed = JSON.parse(cleanJsonOutput(res.text));
      if (parsed.summary) {
        return parsed;
      }
    } catch {}
  }

  throw new Error(res.error || "OpenRouter Nemotron failed to synthesize intelligence.");
}

/**
 * OpenRouter / Nemotron Raw Intelligence Extraction to Graph
 */
export async function openrouterParseIntelligence(
  text: string,
  options: { apiKey?: string; model?: string } = {}
) {
  const prompt = `Analisis data intelijen berikut dan ekstrak entiti ke dalam format Graph (Nodes & Links).
Gunakan ketelitian tinggi NVIDIA Nemotron untuk mengesan entiti tersembunyi.

DATA RAW:
"${text}"

FORMAT OUTPUT (JSON SAHAJA):
{
  "graph": {
    "nodes": [
      {
        "id": "string",
        "label": "string",
        "type": "person | organization | location | phone | email | ip | domain | personal_id | social",
        "details": "string"
      }
    ],
    "links": [
      {
        "source": "node_id_1",
        "target": "node_id_2",
        "label": "string (cth: associates_with, registered_to, host_of)"
      }
    ]
  }
}`;

  const res = await callOpenRouterChat(prompt, {
    apiKey: options.apiKey,
    model: options.model || "nvidia/llama-3.1-nemotron-70b-instruct",
    responseMimeType: "application/json",
    systemInstruction: "You are an entity extraction engine powered by NVIDIA Nemotron. Extract nodes and links in strict JSON."
  });

  if (res.success && res.text) {
    try {
      const parsed = JSON.parse(cleanJsonOutput(res.text));
      if (parsed.graph && Array.isArray(parsed.graph.nodes)) {
        return parsed;
      }
    } catch {}
  }

  throw new Error(res.error || "OpenRouter entity extraction failed.");
}
