
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { Workspace, ModelConfig, LogEntry, GraphData, Node, Link, EvidenceItem } from '../types';
import { saveWorkspace, getWorkspaces, saveConfig, getConfig, syncWorkspaces, deleteWorkspace } from '../services/db';
import { mergeAndDeduplicateGraph, areNodesSyntacticallyEqual, mergeNodeData } from '../utils/graphMergeUtils';

const APP_VERSION = 'rh_v14_tavily_final_v3';

export function cleanGraphData(data: GraphData): GraphData {
    if (!data) return { nodes: [], links: [] };
    const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
    const rawLinks = Array.isArray(data.links) ? data.links : [];

    // Automatically deduplicate & consolidate nodes sharing identical syntax, label, ID, or unique identifiers
    const consolidated = mergeAndDeduplicateGraph({ nodes: [], links: [] }, { nodes: rawNodes, links: rawLinks, replace: true });
    return consolidated;
}

interface GlobalState {
    workspaces: Workspace[];
    activeWsId: string;
    config: ModelConfig;
    logs: LogEntry[];
    backendStatus: 'online' | 'offline' | 'checking' | 'disabled';
    vaultFiles: File[];
    history: GraphData[];
    selectionMode: 'single' | 'multi';
}

const initialState: GlobalState = {
    workspaces: [{ 
        id: 'ws_default', 
        name: 'PRIMARY_RECON', 
        layoutMode: 'force', 
        timestamp: Date.now(), 
        data: { 
            nodes: [{ 
                id: 'start_node_01', 
                label: 'NEW_TARGET', 
                type: 'person',
                details: 'Starting Point. Right-click to Edit or Delete.'
            }], 
            links: [] 
        },
        evidence: []
    }],
    activeWsId: 'ws_default',
    config: { 
        provider: 'google',
        modelName: 'gemini-3.7-flash', 
        apiKey: '', 
        tavilyApiKey: '', 
        googleCseId: '53a0041f2f24f4e3b',
        googleCseApiKey: '',
        thinkingBudget: 0, 
        useSearch: true, 
        customBackendUrl: '',
        pcBackendUrl: 'http://localhost:5000',
        activeBackend: 'termux',
        customAiEndpoint: '',
        visual: {
            themeColor: '#ff0033',
            nodeSize: 22,
            linkDistance: 140,
            showParticles: true,
            gridOpacity: 0.1,
            wallpaperUrl: '',
            graphRenderer: 'canvas',
            lowPowerMode: false
        }
    },
    logs: [],
    backendStatus: 'disabled',
    vaultFiles: [],
    history: [],
    selectionMode: 'single'
};

type Action = 
  | { type: 'LOAD_SAVED_STATE', payload: Partial<GlobalState> }
  | { type: 'ADD_LOG', payload: { message: string, type: LogEntry['type'] } }
  | { type: 'UPDATE_CONFIG', payload: ModelConfig }
  | { type: 'SET_BACKEND_STATUS', payload: GlobalState['backendStatus'] }
  | { type: 'UPDATE_GRAPH', payload: { nodes?: (Partial<Node> & { id: string })[], links?: Link[], replace?: boolean } }
  | { type: 'DELETE_NODE', payload: string }
  | { type: 'DELETE_MULTIPLE_NODES', payload: string[] }
  | { type: 'CLEAR_GRAPH', payload?: any }
  | { type: 'SWITCH_WORKSPACE', payload: string }
  | { type: 'RENAME_WORKSPACE', payload: { id: string, name: string } }
  | { type: 'CREATE_WORKSPACE', payload: string | Partial<Workspace> }
  | { type: 'DUPLICATE_WORKSPACE', payload: string }
  | { type: 'IMPORT_WORKSPACE', payload: { name: string, graph: GraphData, evidence?: EvidenceItem[], synthesisResult?: any, strategyResult?: any, layoutMode?: any } }
  | { type: 'DELETE_WORKSPACE', payload: string }
  | { type: 'SET_LAYOUT', payload: any }
  | { type: 'ADD_EVIDENCE', payload: EvidenceItem }
  | { type: 'REMOVE_EVIDENCE', payload: string }
  | { type: 'SET_VAULT_FILES', payload: File[] }
  | { type: 'SET_SYNTHESIS_RESULT', payload: any }
  | { type: 'SET_STRATEGY_RESULT', payload: any }
  | { type: 'UNDO' }
  | { type: 'MERGE_NODES', payload: string[] }
  | { type: 'COPY_NODES_TO_WORKSPACE', payload: { targetWsId: string, nodeIds: string[], deleteFromSource?: boolean } }
  | { type: 'SET_SELECTION_MODE', payload: 'single' | 'multi' };

const reducer = (state: GlobalState, action: Action): GlobalState => {
    const activeWs = state.workspaces.find(w => w.id === state.activeWsId) || state.workspaces[0];

    switch (action.type) {
        case 'LOAD_SAVED_STATE':
            const loadedConfig = action.payload.config;
            let mergedConfig = loadedConfig ? {
                ...state.config,
                ...loadedConfig,
                visual: { ...state.config.visual, ...(loadedConfig.visual || {}) }
            } : state.config;

            // Auto-migrate away from pro/older models to gemini-3.7-flash for default performance
            if (!mergedConfig.modelName || mergedConfig.modelName.includes('pro') || mergedConfig.modelName === 'gemini-3.6-flash') {
                mergedConfig = { ...mergedConfig, modelName: 'gemini-3.7-flash' };
            }

            // Clean up accidental OpenRouter keys stored in Gemini apiKey field
            if (mergedConfig.apiKey && (mergedConfig.apiKey.trim().startsWith('sk-or-v1-') || mergedConfig.apiKey.trim().startsWith('sk-or-'))) {
                if (!mergedConfig.openrouterApiKey) {
                    mergedConfig.openrouterApiKey = mergedConfig.apiKey.trim();
                }
                mergedConfig.apiKey = '';
            }

            let loadedWorkspaces = (action.payload.workspaces && action.payload.workspaces.length > 0)
                ? action.payload.workspaces.map(w => ({
                    ...w,
                    name: w.name || 'MISSION_WORKSPACE',
                    data: cleanGraphData(w.data),
                    evidence: Array.isArray(w.evidence) ? w.evidence : []
                }))
                : state.workspaces;

            // Deduplicate workspace IDs if any corrupted IDs existed
            const seenWsIds = new Set<string>();
            loadedWorkspaces = loadedWorkspaces.map(w => {
                let wsId = w.id;
                if (!wsId || seenWsIds.has(wsId)) {
                    wsId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                }
                seenWsIds.add(wsId);
                return { ...w, id: wsId };
            }).slice(0, 3);

            // Ensure activeWsId exists in loaded workspaces
            let nextActiveId = action.payload.activeWsId || state.activeWsId;
            if (!loadedWorkspaces.some(w => w.id === nextActiveId)) {
                nextActiveId = loadedWorkspaces[0]?.id || 'ws_default';
            }

            return { 
                ...state, 
                ...action.payload,
                workspaces: loadedWorkspaces,
                activeWsId: nextActiveId,
                config: mergedConfig
            };
        
        case 'ADD_LOG':
            const newLog = { 
                timestamp: new Date().toLocaleTimeString(), 
                message: action.payload.message, 
                type: action.payload.type 
            };
            return { ...state, logs: [newLog, ...state.logs].slice(0, 50) };

        case 'UPDATE_CONFIG':
            return { ...state, config: action.payload };

        case 'SET_BACKEND_STATUS':
            if (state.backendStatus === action.payload) return state;
            return { ...state, backendStatus: action.payload };

        case 'SET_VAULT_FILES':
            return { ...state, vaultFiles: action.payload };

        case 'SET_SELECTION_MODE':
            return { ...state, selectionMode: action.payload };

        case 'UNDO':
            if (state.history.length === 0) return state;
            const previousData = state.history[state.history.length - 1];
            const newHistory = state.history.slice(0, -1);
            
            return {
                ...state,
                history: newHistory,
                workspaces: state.workspaces.map(w => {
                    if (w.id !== state.activeWsId) return w;
                    return { ...w, data: previousData };
                })
            };

        case 'MERGE_NODES':
            if (action.payload.length < 2) return state;
            const dataBeforeMerge = JSON.parse(JSON.stringify(activeWs.data));
            
            return {
                ...state,
                history: [...state.history, dataBeforeMerge].slice(-20),
                workspaces: state.workspaces.map(w => {
                    if (w.id !== state.activeWsId) return w;
                    
                    const nodesToMerge = w.data.nodes.filter(n => action.payload.includes(n.id));
                    if (nodesToMerge.length < 2) return w;

                    const primary = nodesToMerge[0];
                    const secondaries = nodesToMerge.slice(1);
                    const secondaryIds = secondaries.map(s => s.id);

                    // Combine data
                    const mergedNode: Node = {
                        ...primary,
                        details: nodesToMerge.map(n => n.details).filter(Boolean).join('\n---\n'),
                        reports: nodesToMerge.map(n => n.reports).filter(Boolean).join('\n---\n'),
                        imageUrls: Array.from(new Set(nodesToMerge.flatMap(n => n.imageUrls || (n.imageUrl ? [n.imageUrl] : []))))
                    };

                    // Update nodes: keep primary (updated), remove secondaries
                    const newNodes = w.data.nodes
                        .filter(n => !secondaryIds.includes(n.id))
                        .map(n => n.id === primary.id ? mergedNode : n);

                    // Update links: redirect secondary links to primary
                    const newLinks = w.data.links.map(l => {
                        const s = typeof l.source === 'string' ? l.source : l.source.id;
                        const t = typeof l.target === 'string' ? l.target : l.target.id;
                        
                        let newSource = l.source;
                        let newTarget = l.target;

                        if (secondaryIds.includes(s)) newSource = primary.id;
                        if (secondaryIds.includes(t)) newTarget = primary.id;

                        return { ...l, source: newSource, target: newTarget };
                    }).filter(l => {
                        // Remove self-links created by merge
                        const s = typeof l.source === 'string' ? l.source : l.source.id;
                        const t = typeof l.target === 'string' ? l.target : l.target.id;
                        return s !== t;
                    });

                    // Deduplicate links
                    const uniqueLinks: Link[] = [];
                    newLinks.forEach(l => {
                        const s = typeof l.source === 'string' ? l.source : l.source.id;
                        const t = typeof l.target === 'string' ? l.target : l.target.id;
                        const exists = uniqueLinks.some(ul => {
                            const us = typeof ul.source === 'string' ? ul.source : ul.source.id;
                            const ut = typeof ul.target === 'string' ? ul.target : ul.target.id;
                            return us === s && ut === t && ul.label === l.label;
                        });
                        if (!exists) uniqueLinks.push(l);
                    });

                    return { ...w, data: { nodes: newNodes, links: uniqueLinks } };
                })
            };

        case 'UPDATE_GRAPH':
            const currentData = cleanGraphData(activeWs.data);
            return {
                ...state,
                history: [...state.history, currentData].slice(-20), // Keep last 20 steps
                workspaces: state.workspaces.map(w => {
                    if (w.id !== state.activeWsId) return w;
                    
                    const mergedData = mergeAndDeduplicateGraph(w.data, action.payload);
                    return {
                        ...w,
                        timestamp: Date.now(),
                        data: cleanGraphData(mergedData)
                    };
                })
            };
        
        case 'DELETE_NODE':
             const dataBeforeDelete = cleanGraphData(activeWs.data);
             return {
                ...state,
                history: [...state.history, dataBeforeDelete].slice(-20),
                workspaces: state.workspaces.map(w => {
                    if (w.id !== state.activeWsId) return w;
                    return {
                        ...w,
                        data: cleanGraphData({
                            nodes: w.data.nodes.filter(n => n.id !== action.payload),
                            links: w.data.links.filter(l => {
                                const s = typeof l.source === 'object' && l.source ? String((l.source as any).id) : String(l.source);
                                const t = typeof l.target === 'object' && l.target ? String((l.target as any).id) : String(l.target);
                                return s !== action.payload && t !== action.payload;
                            })
                        })
                    };
                })
             };

        case 'DELETE_MULTIPLE_NODES':
             const dataBeforeMultiDelete = cleanGraphData(activeWs.data);
             const idsToDelete = action.payload as string[];
             return {
                ...state,
                history: [...state.history, dataBeforeMultiDelete].slice(-20),
                workspaces: state.workspaces.map(w => {
                    if (w.id !== state.activeWsId) return w;
                    return {
                        ...w,
                        data: cleanGraphData({
                            nodes: w.data.nodes.filter(n => !idsToDelete.includes(n.id)),
                            links: w.data.links.filter(l => {
                                const s = typeof l.source === 'object' && l.source ? String((l.source as any).id) : String(l.source);
                                const t = typeof l.target === 'object' && l.target ? String((l.target as any).id) : String(l.target);
                                return !idsToDelete.includes(s) && !idsToDelete.includes(t);
                            })
                        })
                    };
                })
             };

        case 'CLEAR_GRAPH':
            const dataBeforeClear = cleanGraphData(activeWs.data);
            return {
                ...state,
                history: [...state.history, dataBeforeClear].slice(-20),
                workspaces: state.workspaces.map(w => {
                    if (w.id !== state.activeWsId) return w;
                    return { ...w, data: { nodes: [], links: [] } };
                })
            };

        case 'SWITCH_WORKSPACE':
            return { ...state, activeWsId: action.payload };
        
        case 'RENAME_WORKSPACE':
            return {
                ...state,
                workspaces: state.workspaces.map(w => 
                    w.id === action.payload.id ? { ...w, name: action.payload.name } : w
                )
            };

        case 'CREATE_WORKSPACE': {
            if (state.workspaces.length >= 3) {
                return state;
            }
            const objPayload = typeof action.payload === 'object' && action.payload !== null ? (action.payload as Partial<Workspace>) : null;
            const name = objPayload ? (objPayload.name || `CANVAS_${state.workspaces.length + 1}`) : (String(action.payload || '').trim() || `CANVAS_${state.workspaces.length + 1}`);
            const data = objPayload && objPayload.data 
                ? cleanGraphData(objPayload.data) 
                : { nodes: [{ id: `start_${Date.now()}`, label: 'NEW_TARGET', type: 'person', details: 'Starting Point. Right-click to Edit or Delete.' }], links: [] };
            
            const newWs: Workspace = {
                id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: name.toUpperCase(),
                layoutMode: (objPayload && objPayload.layoutMode) || 'force',
                timestamp: Date.now(),
                data: data,
                evidence: (objPayload && Array.isArray(objPayload.evidence)) ? objPayload.evidence : [],
                synthesisResult: objPayload ? objPayload.synthesisResult : null,
                strategyResult: objPayload ? objPayload.strategyResult : null
            };
            return { ...state, workspaces: [...state.workspaces, newWs], activeWsId: newWs.id };
        }

        case 'DUPLICATE_WORKSPACE': {
            if (state.workspaces.length >= 3) {
                return state;
            }
            const targetWs = state.workspaces.find(w => w.id === action.payload) || activeWs;
            if (!targetWs) return state;
            const clonedData = cleanGraphData(JSON.parse(JSON.stringify(targetWs.data)));
            const clonedWs: Workspace = {
                id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: `${targetWs.name} (SALINAN)`,
                layoutMode: targetWs.layoutMode || 'force',
                timestamp: Date.now(),
                data: clonedData,
                evidence: JSON.parse(JSON.stringify(targetWs.evidence || [])),
                synthesisResult: targetWs.synthesisResult ? JSON.parse(JSON.stringify(targetWs.synthesisResult)) : null,
                strategyResult: targetWs.strategyResult ? JSON.parse(JSON.stringify(targetWs.strategyResult)) : null
            };
            return { ...state, workspaces: [...state.workspaces, clonedWs], activeWsId: clonedWs.id };
        }

        case 'IMPORT_WORKSPACE': {
            const importedData = cleanGraphData(action.payload.graph);
            if (state.workspaces.length >= 3) {
                // If already at 3, replace the current active workspace instead of overflowing
                return {
                    ...state,
                    workspaces: state.workspaces.map(w => {
                        if (w.id !== state.activeWsId) return w;
                        return {
                            ...w,
                            name: (action.payload.name || w.name).toUpperCase(),
                            layoutMode: action.payload.layoutMode || w.layoutMode || 'force',
                            timestamp: Date.now(),
                            data: importedData,
                            evidence: action.payload.evidence || w.evidence || [],
                            synthesisResult: action.payload.synthesisResult || null,
                            strategyResult: action.payload.strategyResult || null
                        };
                    })
                };
            }
            const newWs: Workspace = {
                id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: (action.payload.name || `IMPORTED_CANVAS_${state.workspaces.length + 1}`).toUpperCase(),
                layoutMode: action.payload.layoutMode || 'force',
                timestamp: Date.now(),
                data: importedData,
                evidence: action.payload.evidence || [],
                synthesisResult: action.payload.synthesisResult || null,
                strategyResult: action.payload.strategyResult || null
            };
            return { ...state, workspaces: [...state.workspaces, newWs], activeWsId: newWs.id };
        }

        case 'COPY_NODES_TO_WORKSPACE': {
            const { targetWsId, nodeIds, deleteFromSource } = action.payload;
            if (!targetWsId || !nodeIds || nodeIds.length === 0) return state;
            const sourceWs = activeWs;
            const targetWs = state.workspaces.find(w => w.id === targetWsId);
            if (!targetWs || sourceWs.id === targetWs.id) return state;

            // Find nodes to transfer
            const nodesToCopy = sourceWs.data.nodes.filter(n => nodeIds.includes(n.id));
            if (nodesToCopy.length === 0) return state;

            // Find links between these nodes
            const linksToCopy = sourceWs.data.links.filter(l => {
                const s = typeof l.source === 'object' && l.source ? String((l.source as any).id) : String(l.source);
                const t = typeof l.target === 'object' && l.target ? String((l.target as any).id) : String(l.target);
                return nodeIds.includes(s) && nodeIds.includes(t);
            });

            const mergedTargetData = mergeAndDeduplicateGraph(targetWs.data, {
                nodes: nodesToCopy,
                links: linksToCopy
            });

            let updatedSourceData = sourceWs.data;
            if (deleteFromSource) {
                updatedSourceData = cleanGraphData({
                    nodes: sourceWs.data.nodes.filter(n => !nodeIds.includes(n.id)),
                    links: sourceWs.data.links.filter(l => {
                        const s = typeof l.source === 'object' && l.source ? String((l.source as any).id) : String(l.source);
                        const t = typeof l.target === 'object' && l.target ? String((l.target as any).id) : String(l.target);
                        return !nodeIds.includes(s) && !nodeIds.includes(t);
                    })
                });
            }

            return {
                ...state,
                workspaces: state.workspaces.map(w => {
                    if (w.id === targetWsId) {
                        return { ...w, data: cleanGraphData(mergedTargetData), timestamp: Date.now() };
                    }
                    if (deleteFromSource && w.id === sourceWs.id) {
                        return { ...w, data: updatedSourceData, timestamp: Date.now() };
                    }
                    return w;
                })
            };
        }

        case 'DELETE_WORKSPACE': {
            // Delete from persistent IndexedDB immediately
            deleteWorkspace(action.payload).catch(err => console.warn("Delete WS IDB failed", err));

            if (state.workspaces.length <= 1) {
                const resetWs: Workspace = {
                    id: `ws_${Date.now()}`,
                    name: 'PRIMARY_RECON',
                    layoutMode: 'force',
                    timestamp: Date.now(),
                    data: { nodes: [{ id: `start_${Date.now()}`, label: 'NEW_TARGET', type: 'person' }], links: [] },
                    evidence: []
                };
                return { ...state, workspaces: [resetWs], activeWsId: resetWs.id };
            }
            const remaining = state.workspaces.filter(w => w.id !== action.payload);
            let nextActiveId = state.activeWsId;
            if (state.activeWsId === action.payload) {
                nextActiveId = remaining[0].id;
            }
            return { ...state, workspaces: remaining, activeWsId: nextActiveId };
        }

        case 'SET_LAYOUT':
            return {
                ...state,
                workspaces: state.workspaces.map(w => w.id === state.activeWsId ? { ...w, layoutMode: action.payload } : w)
            };

        case 'ADD_EVIDENCE':
            return {
                ...state,
                workspaces: state.workspaces.map(w => w.id === state.activeWsId ? { ...w, evidence: [...w.evidence, action.payload] } : w)
            };

        case 'REMOVE_EVIDENCE':
            return {
                ...state,
                workspaces: state.workspaces.map(w => w.id === state.activeWsId ? { ...w, evidence: w.evidence.filter(e => e.id !== action.payload) } : w)
            };
        
        case 'SET_SYNTHESIS_RESULT':
            return {
                ...state,
                workspaces: state.workspaces.map(w => w.id === state.activeWsId ? { ...w, synthesisResult: action.payload } : w)
            };

        case 'SET_STRATEGY_RESULT':
            return {
                ...state,
                workspaces: state.workspaces.map(w => w.id === state.activeWsId ? { ...w, strategyResult: action.payload } : w)
            };

        default:
            return state;
    }
};

const GlobalContext = createContext<{
    state: GlobalState;
    dispatch: React.Dispatch<Action>;
    activeWs: Workspace;
}>({
    state: initialState,
    dispatch: () => null,
    activeWs: initialState.workspaces[0]
});

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const saveTimerRef = useRef<any>(null);

    useEffect(() => {
        const loadState = async () => {
            try {
                const savedConfig = await getConfig();
                const savedWorkspaces = await getWorkspaces();
                const savedActiveId = localStorage.getItem('rh_active_case_id') || localStorage.getItem(`${APP_VERSION}_active_id`);

                const payload: any = {};
                if (savedConfig) payload.config = savedConfig;
                if (savedActiveId) payload.activeWsId = savedActiveId;
                if (savedWorkspaces && savedWorkspaces.length > 0) payload.workspaces = savedWorkspaces;

                if (Object.keys(payload).length > 0) {
                    dispatch({ type: 'LOAD_SAVED_STATE', payload });
                }
            } catch(e) { console.error("Load Failed", e); }
        };
        loadState();
    }, []);

    // PERFORMANCE: Debounced saving to IndexedDB with automatic deletion sync
    useEffect(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        
        saveTimerRef.current = setTimeout(async () => {
            try {
                await saveConfig(state.config);
                localStorage.setItem('rh_active_case_id', state.activeWsId);
                localStorage.setItem(`${APP_VERSION}_active_id`, state.activeWsId);
                
                // Sync all workspaces to IndexedDB and purge orphaned keys
                await syncWorkspaces(state.workspaces);
            } catch(e) {
                console.error("Global State Save Failed", e);
            }
        }, 1200);

        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [state.config, state.workspaces, state.activeWsId]);

    useEffect(() => {
        const checkStatus = async () => {
            const url = state.config.activeBackend === 'pc' ? state.config.pcBackendUrl : state.config.customBackendUrl;
            
            if (!url || url.length < 5) {
                dispatch({ type: 'SET_BACKEND_STATUS', payload: 'disabled' });
                return;
            }

            try {
                let cleanUrl = url.trim().replace(/\/$/, '');
                if (!cleanUrl.startsWith('http')) {
                    cleanUrl = window.location.protocol === 'https:' ? 'https://' + cleanUrl : 'http://' + cleanUrl;
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                
                const res = await fetch(`${cleanUrl}/api/health`, { 
                    signal: controller.signal,
                    headers: { 
                        'ngrok-skip-browser-warning': 'true',
                        'bypass-tunnel-reminder': 'true',
                        'Content-Type': 'application/json'
                    },
                    mode: 'cors'
                });
                
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'online') {
                        dispatch({ type: 'SET_BACKEND_STATUS', payload: 'online' });
                        return;
                    }
                } 
                dispatch({ type: 'SET_BACKEND_STATUS', payload: 'offline' });

            } catch (err) {
                dispatch({ type: 'SET_BACKEND_STATUS', payload: 'offline' });
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Checked less frequently (30s) to save cycles
        return () => clearInterval(interval);
    }, [state.config.customBackendUrl, state.config.pcBackendUrl, state.config.activeBackend]);

    const activeWs = state.workspaces.find(w => w.id === state.activeWsId) || state.workspaces[0];

    return (
        <GlobalContext.Provider value={{ state, dispatch, activeWs }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobalStore = () => useContext(GlobalContext);
