
import { GraphData, ModelConfig, Node } from '../types';
import { generateText, generateJSON } from './aiRegistry';

/**
 * AGENT SYSTEM (RAG - Retrieval Augmented Generation)
 * Instead of a vector DB (which is overkill for <1000 nodes),
 * we serialize the graph topology into a text context ("The Knowledge Graph").
 */

const serializeGraphContext = (graph: GraphData, focusedNodeId?: string): string => {
    if (graph.nodes.length === 0) return "Graph is empty.";

    const nodesDesc = graph.nodes.map(n => {
        const isFocused = n.id === focusedNodeId;
        // For focused node, show full details and reports. For others, show a decent chunk.
        const details = isFocused 
            ? n.details 
            : (n.details?.length && n.details.length > 500 ? n.details.substring(0, 500) + '...' : n.details);
        
        const reports = isFocused 
            ? n.reports 
            : (n.reports?.length && n.reports.length > 300 ? n.reports.substring(0, 300) + '...' : n.reports);

        return `ID:${n.id} | LABEL:${n.label} | TYPE:${n.type}${isFocused ? ' [FOCUSED_TARGET]' : ''}
DETAILS: ${details || 'N/A'}
REPORTS: ${reports || 'N/A'}
--`;
    }).join('\n');

    const linksDesc = graph.links.map(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return `${s} --[${l.label}]--> ${t}`;
    }).join('\n');

    return `
=== CURRENT INTELLIGENCE GRAPH ===
NODES:
${nodesDesc}

CONNECTIONS:
${linksDesc}
==================================
    `;
};

export const analyzeGraphAgent = async (
    query: string, 
    graph: GraphData, 
    config: ModelConfig,
    focusedNodeId?: string
): Promise<{ text: string, newNodes?: Node[] }> => {

    const context = serializeGraphContext(graph, focusedNodeId);
    const focusedNode = graph.nodes.find(n => n.id === focusedNodeId);

    const prompt = `
    ACT AS: Operatif Perisikan Elit (Master OSINT Intelligence Analyst).
    MISI: Analisis data graf perisikan yang diberikan untuk menjawab pertanyaan pengguna.
    
    KONTEKS GRAF:
    ${context}

    TARGET FOKUS: ${focusedNode ? `${focusedNode.label} (${focusedNode.type})` : 'Tiada fokus spesifik'}

    PERTANYAAN PENGGUNA: "${query}"

    ARAHAN MANDATORI:
    1. ANALISIS MENDALAM: Anda mempunyai akses terus ke DOSSIER (Details) dan REPORTS bagi setiap entiti. Sila baca dengan teliti setiap komen, maklumat profil, dan log yang ada. JANGAN SESEKALI menyatakan anda tiada akses jika data tersebut ada dalam konteks di atas.
    2. JANGAN ABAIKAN DATA: Jika dossier mengandungi komen dari target atau butiran peribadi, anda MESTI menyertakannya dalam analisis jika relevan untuk menjawab query.
    3. PENAAKULAN LOGIK: Hubungkan titik-titik (connect the dots) antara entiti berdasarkan hubungan (Connections) dan data teks. Cari corak tingkah laku atau kaitan geografi/sosial.
    4. GAYA PENULISAN: Gunakan nada yang profesional, analitikal, dan tajam (Intelligence Briefing). Tunjukkan wibawa seorang pakar perisikan.
    5. BAHASA: Jawab dalam Bahasa Melayu yang mantap, teknikal, dan mudah difahami oleh komando operasi.
    6. DETERMINISME & LANGKAH SETERUSNYA: Anda berkuasa menentukan hala tuju penyiasatan. Di akhir laporan, wajib berikan "CADANGAN OPERASI" (Next Steps) yang spesifik (contoh: "Gunakan Maigret untuk cari profil alias 'X'", "Lakukan kaitan silang dengan nod 'Y'").
    
    LAPORKAN:
    - Ringkasan Penemuan (Summary)
    - Analisis Perincian (Meneroka Dossier/Komen)
    - Unsur Hubung Kait (Connections)
    - Langkah Seterusnya (Next Steps)
    `;

    const response = await generateText(prompt, config, "You are an elite autonomous intelligence analyst. You have deep access into all dossier data.");
    return { text: response.text };
};

export const autoExpandAgent = async (
    targetNodeId: string,
    graph: GraphData,
    config: ModelConfig
): Promise<{ nodes: any[], links: any[] }> => {
    
    const targetNode = graph.nodes.find(n => n.id === targetNodeId);
    if (!targetNode) throw new Error("Target node not found.");

    const context = serializeGraphContext(graph);

    const prompt = `
    TARGET: ${targetNode.label} (${targetNode.type})
    CURRENT GRAPH CONTEXT: ${context}

    TASK: Based on general knowledge and the context, predict/hallucinate 3-5 likely related entities that should be investigated next. 
    e.g. If target is a Company, suggest "CEO", "Competitor", "Location".
    
    OUTPUT: JSON format with 'nodes' and 'links'.
    `;

    // Using a simpler schema approach for the registry
    try {
        const schema = {
            type: "object",
            properties: {
                nodes: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            label: { type: "string" },
                            type: { type: "string" }
                        }
                    }
                },
                links: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            source: { type: "string" },
                            target: { type: "string" },
                            label: { type: "string" }
                        }
                    }
                }
            }
        };
        const res = await generateJSON(prompt, schema, config);
        return res.graph || res; // Handle variations in output structure
    } catch (e) {
        return { nodes: [], links: [] };
    }
};
