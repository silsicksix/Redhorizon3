import { ModelConfig } from '../types';
import { extractAndParseJSON, cleanJsonOutput } from '../utils/jsonParser';

export interface StandardAIResponse {
    text: string;
    json?: any;
}

const safeParseResponse = async (res: Response): Promise<any> => {
    try {
        const text = await res.text();
        if (!text || text.trim().startsWith('<') || text.toLowerCase().includes('<!doctype html>')) {
            return null;
        }
        return JSON.parse(cleanJsonOutput(text));
    } catch {
        return null;
    }
};

let clientGeminiKeyIndex = 0;

export const generateText = async (prompt: string, config: ModelConfig, systemInstruction?: string): Promise<StandardAIResponse> => {
    // Universal Direct Client-side Gemini Helper with Multi-Key Pool & Round-Robin (For Vercel / Static Hosting / Standalone SPA)
    const callDirectClientGemini = async (apiKey: string, modelName?: string): Promise<StandardAIResponse> => {
        if (!apiKey) return { text: "" };
        
        // Extract all keys if separated by commas, semicolons, or newlines
        const keyPool = apiKey
            .split(/[\n,;]+/)
            .map(k => k.trim())
            .filter(k => k.length > 5 && !k.includes('YOUR_') && !k.includes('dummy'));

        if (keyPool.length === 0) return { text: "" };

        const primaryModel = modelName || config.modelName || 'gemini-3.7-flash';
        const candidateModels = [primaryModel, 'gemini-2.5-flash', 'gemini-1.5-flash'];

        // Try keys starting from current round-robin index
        const startIndex = clientGeminiKeyIndex % keyPool.length;
        const orderedKeys = [
            ...keyPool.slice(startIndex),
            ...keyPool.slice(0, startIndex)
        ];

        for (const cleanKey of orderedKeys) {
            clientGeminiKeyIndex = (clientGeminiKeyIndex + 1) % keyPool.length;

            for (const model of candidateModels) {
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                temperature: 0.4,
                                maxOutputTokens: 4096
                            }
                        })
                    });

                    if (res.ok) {
                        const data = await safeParseResponse(res);
                        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        if (text && text.trim().length > 0) {
                            return { text };
                        }
                    } else {
                        const errData = await res.json().catch(() => null);
                        const code = errData?.error?.code || res.status;
                        // If key invalid or quota exceeded on this key, advance to next key in pool
                        if (code === 400 || code === 403 || code === 429) {
                            break; // break model loop and try next key in pool
                        }
                    }
                } catch (err: any) {
                    console.warn(`[Direct Client Gemini] Error on key ${cleanKey.slice(0, 8)}... (${model}):`, err?.message || err);
                }
            }
        }
        return { text: "" };
    };

    // Universal Server Gemini Fallback Helper
    const runGeminiFallback = async (reason: string): Promise<StandardAIResponse> => {
        console.warn(`[AI Resilience Gateway] Falling back to Gemini 3.7 Flash (${reason})`);
        try {
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    apiKey: config.apiKey,
                    options: {
                        model: config.modelName || 'gemini-3.7-flash',
                        systemInstruction: systemInstruction || "You are an elite OSINT intelligence analyst.",
                        useSearch: !!config?.useSearch
                    }
                })
            });

            if (res.ok) {
                const data = await safeParseResponse(res);
                if (data?.text) {
                    return { text: data.text };
                }
            }
        } catch (geminiErr) {
            console.warn("[AI Resilience Gateway] Gemini server call warning:", geminiErr);
        }

        // Direct Client Fallback if server is not available (Vercel)
        if (config.apiKey && config.apiKey.trim().length > 5) {
            return callDirectClientGemini(config.apiKey, config.modelName);
        }

        return { text: "" };
    };

    // 1. OPENROUTER / NVIDIA NEMOTRON PROVIDER
    if (config.provider === 'openrouter') {
        const activeKey = config.openrouterApiKey || config.apiKey || "";
        const activeModel = config.openrouterModel || config.modelName || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
        
        try {
            // First attempt server-side proxy
            const res = await fetch('/api/ai/openrouter-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    options: {
                        model: activeModel,
                        apiKey: activeKey,
                        systemInstruction: systemInstruction || "You are an elite OSINT intelligence analyst powered by NVIDIA Nemotron."
                    }
                })
            });

            if (res.ok) {
                const data = await safeParseResponse(res);
                if (data?.success && typeof data.text === 'string' && data.text.trim().length > 0) {
                    return { text: data.text };
                }
            }
        } catch (serverErr) {
            console.warn("[aiRegistry] Server openrouter-generate error:", serverErr);
        }

        // Direct API fetch if client has key
        if (activeKey && activeKey.trim().length > 10) {
            try {
                const isNvidiaKey = activeKey.startsWith("nvapi-");
                const directUrl = isNvidiaKey 
                    ? "https://integrate.api.nvidia.com/v1/chat/completions" 
                    : "https://openrouter.ai/api/v1/chat/completions";

                const directModel = isNvidiaKey 
                    ? activeModel.replace(/:free$/i, '').replace(/:batch$/i, '').trim()
                    : activeModel;

                const headers: Record<string, string> = {
                    "Authorization": `Bearer ${activeKey.trim()}`,
                    "Content-Type": "application/json"
                };

                if (!isNvidiaKey) {
                    headers["HTTP-Referer"] = window.location.origin || "https://redhorizon-osint.local";
                    headers["X-Title"] = "RedHorizon OSINT Recon Platform";
                }

                const directRes = await fetch(directUrl, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        model: directModel || (isNvidiaKey ? "nvidia/llama-3.1-nemotron-70b-instruct" : "nvidia/nemotron-3.5-lightning:free"),
                        messages: [
                            { role: "system", content: systemInstruction || "You are an elite OSINT intelligence analyst powered by NVIDIA Nemotron." },
                            { role: "user", content: prompt }
                        ],
                        temperature: 0.2,
                        max_tokens: 4096
                    })
                });

                if (directRes.ok) {
                    const directData = await safeParseResponse(directRes);
                    const text = directData?.choices?.[0]?.message?.content || "";
                    if (text) return { text };
                }
            } catch (err: any) {
                console.warn(`[aiRegistry] Nemotron direct fetch error: ${err?.message || err}`);
            }
        }

        // Graceful failover to Gemini
        return runGeminiFallback("OpenRouter key invalid, absent, or unreachable");
    }

    // 2. GOOGLE GEMINI PROVIDER (Server-side Proxy + Direct Client Fallback)
    if (config.provider === 'google' || !config.provider) {
        return runGeminiFallback("Standard Gemini Execution");
    }

    // 3. DEEPSEEK / LOCAL PROVIDER (Ollama/LMStudio)
    if (config.provider === 'custom' || config.provider === 'deepseek') {
        try {
            const endpoint = config.provider === 'deepseek' 
                ? 'https://api.deepseek.com' 
                : (config.customAiEndpoint || 'http://localhost:11434/v1');
            const url = `${endpoint.replace(/\/$/, '')}/chat/completions`;
            
            const payload = {
                model: config.modelName || (config.provider === 'deepseek' ? 'deepseek-chat' : 'local-model'),
                messages: [
                    { role: "system", content: systemInstruction || "You are an OSINT intelligence analyst." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            };

            const headers: any = { "Content-Type": "application/json" };
            if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;

            const res = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await safeParseResponse(res);
                const text = data?.choices?.[0]?.message?.content || "";
                if (text) return { text };
            }
        } catch (error: any) {
            console.warn(`[AI Provider Error]: ${error?.message || error}`);
        }

        // Automatic fallback to Gemini if DeepSeek key invalid or API unreachable
        return runGeminiFallback("DeepSeek/Custom AI authentication failed or offline");
    }

    return runGeminiFallback("Defaulting to Gemini");
};

export const generateJSON = async (prompt: string, schema: any, config: ModelConfig): Promise<any> => {
    const schemaString = schema && Object.keys(schema).length > 0 ? `\n${JSON.stringify(schema, null, 2)}\n` : '';
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON matching this schema structure:${schemaString}\nNo markdown codeblocks.`;

    const res = await generateText(jsonPrompt, config, "You are a specialized OSINT JSON data extraction engine. Output strictly raw JSON without explanations.");
    return extractAndParseJSON(res.text, {});
};
