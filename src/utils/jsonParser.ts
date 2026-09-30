/**
 * Robust JSON extraction & repair utility for AI responses (Gemini, OpenRouter, Nemotron, DeepSeek, etc.)
 */
export function extractAndParseJSON<T = any>(text: string | null | undefined, fallback: T = {} as T): T {
    if (!text || typeof text !== 'string') return fallback;

    let clean = text.trim();

    // 1. Strip reasoning/thinking tags (e.g. DeepSeek R1, Nemotron Reasoning, Qwen)
    clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    clean = clean.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

    // 2. Extract from markdown codeblock if present
    const markdownMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch && markdownMatch[1]) {
        clean = markdownMatch[1].trim();
    }

    // 3. Extract JSON object or array bounds
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');

    let candidate = clean;
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        const lastBrace = clean.lastIndexOf('}');
        if (lastBrace !== -1 && lastBrace >= firstBrace) {
            candidate = clean.substring(firstBrace, lastBrace + 1);
        }
    } else if (firstBracket !== -1) {
        const lastBracket = clean.lastIndexOf(']');
        if (lastBracket !== -1 && lastBracket >= firstBracket) {
            candidate = clean.substring(firstBracket, lastBracket + 1);
        }
    }

    // Direct parse attempt
    try {
        return JSON.parse(candidate);
    } catch (e1) {
        // 4. Sanitize and repair common LLM JSON syntax anomalies
        try {
            const repaired = candidate
                // Remove line comments: // comment
                .replace(/\/\/.*$/gm, '')
                // Remove multi-line comments: /* ... */
                .replace(/\/\*[\s\S]*?\*\//g, '')
                // Remove trailing commas before closing braces/brackets
                .replace(/,\s*([\}\]])/g, '$1')
                // Fix unquoted property keys (word: value -> "word": value)
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
                .trim();

            return JSON.parse(repaired);
        } catch (e2) {
            // 5. Try escaping unescaped newlines in JSON string literals
            try {
                const fixNewlines = candidate.replace(/(?<=:\s*"[^"]*)\n([^"]*")/g, '\\n$1');
                return JSON.parse(fixNewlines);
            } catch (e3) {
                // If everything fails, return fallback without throwing or flooding console
                return fallback;
            }
        }
    }
}

export const cleanJsonOutput = (text: string): string => {
    try {
        const parsed = extractAndParseJSON(text, null);
        if (parsed !== null) {
            return JSON.stringify(parsed);
        }
    } catch {}

    let clean = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    clean = clean.replace(/```json\s*|\s*```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? match[0] : clean;
};
