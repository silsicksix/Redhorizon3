import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  Brain, X, Send, Minus, Maximize2, GripHorizontal, Sparkles, Loader2, 
  CheckCircle2, Zap, Play, Terminal, Database, ShieldAlert, Smartphone, 
  MapPin, Globe, RefreshCw, Trash2, ChevronRight, Layers, Radio, ExternalLink,
  BookOpen, ListOrdered
} from 'lucide-react';
import { Node, Link, ModelConfig, GraphData } from '../types';
import Markdown from 'react-markdown';
import { TacticalPreOrderDrawer } from './TacticalPreOrderDrawer';
import { OSINT_TACTICAL_PHASES } from '../data/tacticalPreOrders';

export interface AgenticAction {
  action: 'CREATE_NODES' | 'LINK_NODES' | 'TRIGGER_OSINT_SCAN' | 'TRIGGER_BREACH_CHECK' | 'TRIGGER_PHONE_INTEL' | 'TRIGGER_GEO_PLOT' | 'TRIGGER_SYNTHESIS' | 'DELETE_NODES';
  description?: string;
  nodes?: Node[];
  links?: Link[];
  target?: string;
  term?: string;
  phoneNumber?: string;
  location?: string;
  lat?: number;
  lon?: number;
  nodeIds?: string[];
  executed?: boolean;
}

export interface AgenticResponseData {
  intent?: 'conversational' | 'operational' | 'hybrid';
  strategic_assessment: string;
  tactical_plan?: string[];
  actions?: AgenticAction[];
  suggested_followups?: string[];
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  intent?: 'conversational' | 'operational' | 'hybrid';
  tacticalPlan?: string[];
  actions?: AgenticAction[];
  suggestedFollowups?: string[];
  webSources?: Array<{ title: string; url: string }>;
  isExecuting?: boolean;
  executedSuccess?: boolean;
}

interface FloatingAIChatProps {
  selectedNodes: Node[];
  allNodes?: Node[];
  allLinks?: Link[];
  activeNode?: Node | null;
  config: ModelConfig;
  onClose: () => void;
  onUpdateGraph?: (graph: Partial<GraphData>) => void;
  onExecuteRadialAction?: (action: string, customPayload?: any) => void;
  onExecuteUIAction?: (action: string, payload?: any) => void;
  onLog?: (msg: string, type: 'info' | 'warning' | 'error' | 'success') => void;
  onDeleteNodes?: (nodeIds: string[]) => void;
}

// Sanitizer functions to strip circular references (such as D3 dragGroup, link object references, etc.)
const safeSanitizeNodes = (nodesList: any[] = []) => {
  if (!Array.isArray(nodesList)) return [];
  return nodesList.slice(0, 100).map(n => {
    if (!n || typeof n !== 'object') return null;
    return {
      id: String(n.id || ''),
      label: String(n.label || n.id || ''),
      type: String(n.type || 'entity'),
      details: typeof n.details === 'string' ? n.details.substring(0, 300) : ''
    };
  }).filter(Boolean);
};

const safeSanitizeLinks = (linksList: any[] = []) => {
  if (!Array.isArray(linksList)) return [];
  return linksList.slice(0, 120).map(l => {
    if (!l || typeof l !== 'object') return null;
    const srcId = typeof l.source === 'object' && l.source !== null ? String(l.source.id || '') : String(l.source || '');
    const tgtId = typeof l.target === 'object' && l.target !== null ? String(l.target.id || '') : String(l.target || '');
    return {
      source: srcId,
      target: tgtId,
      label: typeof l.label === 'string' ? l.label : ''
    };
  }).filter(l => l && l.source && l.target);
};

export const FloatingAIChat: React.FC<FloatingAIChatProps> = ({
  selectedNodes = [],
  allNodes = [],
  allLinks = [],
  activeNode,
  config,
  onClose,
  onUpdateGraph,
  onExecuteRadialAction,
  onExecuteUIAction,
  onLog,
  onDeleteNodes
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoExecute, setAutoExecute] = useState(true);
  const [showPreOrders, setShowPreOrders] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState({ width: 460, height: 580 });
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Scroll to bottom smoothly
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const activeTargets = selectedNodes.length > 0 
        ? selectedNodes.map(n => n.label).join(', ')
        : (activeNode ? activeNode.label : null);

      let intro = "Salam. **Red Horizon Dwi-Pintar AI** sedia membantu.\n\nSistem kini dilengkapi **Kecerdasan Hibrid (Dual-Core)**:\n- 💬 **Soalan Santai & Pengetahuan Am**: Anda bebas bertanyakan apa sahaja—fakta dunia, sains, berita semasa, panduan keselamatan siber, atau berbual secara santai.\n- 🎯 **Operasi Taktikal OSINT**: Mengarahkan siasatan sasaran, menjejak profil/syarikat/telefon, menyemak kebocoran data, dan memetakan entiti terus ke kanvas graf.";
      
      if (activeTargets) {
        intro += `\n\n🎯 **Sasaran Kanvas Semasa:** \`${activeTargets}\``;
      }

      setMessages([
        {
          role: 'ai',
          content: intro,
          timestamp: Date.now(),
          intent: 'conversational',
          suggestedFollowups: activeTargets ? [
            `Siasat profil penuh "${activeTargets}" dan petakan ke graf`,
            `Apakah teknik OSINT terbaik untuk sasaran ini?`,
            `Semak kebocoran data tiris bagi "${activeTargets}"`
          ] : [
            "Apa itu OSINT dan bagaimana ia berfungsi?",
            "Bagaimana cara terbaik melindungi privasi di internet?",
            "Bina sasaran baru untuk siasatan korporat"
          ]
        }
      ]);
    }
  }, []);

  // Execute an action directly onto the graph canvas
  const executeDirectives = (actions: AgenticAction[]) => {
    if (!actions || actions.length === 0) return;

    let nodesAddedCount = 0;
    let linksAddedCount = 0;
    const newNodesToPush: Node[] = [];
    const newLinksToPush: Link[] = [];

    actions.forEach(act => {
      // 1. Create Nodes
      if (act.action === 'CREATE_NODES' && Array.isArray(act.nodes)) {
        act.nodes.forEach((n, idx) => {
          // Avoid duplicate nodes by ID or exact label
          const exists = allNodes.some(existing => existing.id === n.id || existing.label.toLowerCase() === n.label.toLowerCase());
          if (!exists) {
            newNodesToPush.push({
              id: n.id || `agent_${Date.now()}_${idx}`,
              label: n.label,
              type: n.type || 'entity',
              details: n.details || 'Dijana secara autonomi oleh Agentic Commander',
              url: n.url
            });
            nodesAddedCount++;
          }
        });
      }

      // 2. Link Nodes
      if (act.action === 'LINK_NODES' && Array.isArray(act.links)) {
        act.links.forEach(l => {
          newLinksToPush.push({
            source: l.source,
            target: l.target,
            label: l.label || 'korelasi'
          });
          linksAddedCount++;
        });
      }

      // 3. Trigger OSINT Scan
      if (act.action === 'TRIGGER_OSINT_SCAN' && act.target && onExecuteRadialAction) {
        const dummyNode: Node = {
          id: `scan_target_${Date.now()}`,
          label: act.target,
          type: 'person',
          details: 'Sasaran imbasan autonomi'
        };
        onExecuteRadialAction('AUTONOMOUS_AGENT', { nodes: [dummyNode] });
      }

      // 4. Trigger Breach Check
      if (act.action === 'TRIGGER_BREACH_CHECK' && act.term && onExecuteRadialAction) {
        const dummyNode: Node = {
          id: `leak_target_${Date.now()}`,
          label: act.term,
          type: act.term.includes('@') ? 'email' : 'phone',
          details: 'Sasaran semakan kebocoran'
        };
        onExecuteRadialAction('CHECKLEAKED', { nodes: [dummyNode] });
      }

      // 5. Trigger Phone Intel
      if (act.action === 'TRIGGER_PHONE_INTEL' && act.phoneNumber && onExecuteRadialAction) {
        const dummyNode: Node = {
          id: `phone_target_${Date.now()}`,
          label: act.phoneNumber,
          type: 'phone',
          details: 'Sasaran risikan telefon'
        };
        onExecuteRadialAction('PHONE_INTEL', { nodes: [dummyNode] });
      }

      // 6. Trigger Geo Plot
      if (act.action === 'TRIGGER_GEO_PLOT') {
        if (act.location) {
          const locNode: Node = {
            id: `geo_${Date.now()}`,
            label: act.location,
            type: 'location',
            details: `Koordinat: ${act.lat || 0}, ${act.lon || 0}`
          };
          newNodesToPush.push(locNode);
          nodesAddedCount++;
        }
        if (onExecuteUIAction) {
          onExecuteUIAction('OPEN_MODAL', 'geo_recon');
        }
      }

      // 7. Delete Nodes
      if (act.action === 'DELETE_NODES' && act.nodeIds && act.nodeIds.length > 0 && onDeleteNodes) {
        onDeleteNodes(act.nodeIds);
        onLog?.(`[Agentic Commander] Memadam ${act.nodeIds.length} nod seperti yang diarahkan.`, 'info');
      }

      // 8. Trigger Synthesis
      if (act.action === 'TRIGGER_SYNTHESIS' && onExecuteUIAction) {
        onExecuteUIAction('OPEN_SYNTHESIS');
      }
    });

    // Push new graph elements if any
    if (newNodesToPush.length > 0 || newLinksToPush.length > 0) {
      if (onUpdateGraph) {
        onUpdateGraph({
          nodes: newNodesToPush,
          links: newLinksToPush
        });
      }
      onLog?.(`[Agentic Commander] Berjaya memetakan ${nodesAddedCount} nod baharu & ${linksAddedCount} pautan hubungan ke atas graf kanvas.`, 'success');
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = { role: 'user', content: textToSend, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);

    try {
      const cleanNodes = safeSanitizeNodes(allNodes);
      const cleanLinks = safeSanitizeLinks(allLinks);
      const cleanSelected = safeSanitizeNodes(selectedNodes.length > 0 ? selectedNodes : (activeNode ? [activeNode] : []));

      const payload = {
        prompt: textToSend,
        currentGraph: {
          nodes: cleanNodes,
          links: cleanLinks
        },
        selectedNodes: cleanSelected,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        config: {
          apiKey: config?.apiKey,
          modelName: config?.modelName
        }
      };

      const res = await fetch('/api/ai/agentic-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (json.success && json.data) {
        const data: AgenticResponseData = json.data;
        const actions = data.actions || [];
        const followups = data.suggested_followups || [];
        const webSources = json.webSources || [];
        const intent = data.intent || (actions.length > 0 ? 'operational' : 'conversational');

        const aiMsg: Message = {
          role: 'ai',
          content: data.strategic_assessment || "Arahan atau pertanyaan telah diproses.",
          timestamp: Date.now(),
          intent,
          tacticalPlan: data.tactical_plan,
          actions,
          suggestedFollowups: followups,
          webSources,
          executedSuccess: autoExecute && actions.length > 0
        };

        setMessages(prev => [...prev, aiMsg]);

        // Auto execute actions if setting is enabled and actions exist
        if (autoExecute && actions.length > 0) {
          executeDirectives(actions);
        }
      } else {
        throw new Error(json.error || "Gagal memproses arahan strategik.");
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: `⚠️ **Ralat Operasi:** ${err.message}\n\nSila pastikan sambungan pelayan stabil atau cuba berikan arahan dalam ayat yang lebih terperinci.`,
          timestamp: Date.now()
        }
      ]);
      onLog?.(`[Agentic Error] ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Resizing logic
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const startX = clientX;
    const startY = clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const newWidth = Math.max(isMinimized ? 200 : 340, startWidth + (currentX - startX));
      const newHeight = Math.max(isMinimized ? 40 : 350, startHeight + (currentY - startY));
      setSize({ width: newWidth, height: newHeight });
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMove as any);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove as any);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove as any);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove as any, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        width: isMinimized ? 260 : size.width,
        height: isMinimized ? 44 : size.height
      }}
      className="fixed bottom-20 right-4 sm:right-8 z-[100] bg-slate-950/98 backdrop-blur-2xl border border-cyan-500/40 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden"
      style={{ 
        boxShadow: '0 0 35px rgba(6, 182, 212, 0.25), 0 20px 45px rgba(0,0,0,0.95)',
        resize: isMinimized ? 'none' : 'both'
      }}
    >
      {/* Top Drag Handle Header */}
      <div 
        className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 border-b border-cyan-500/30 cursor-move handle select-none"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 font-mono">
            <Brain size={14} className="text-cyan-400" />
            Agentic Command & AI Chat
          </span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-[8px] font-mono text-cyan-300 uppercase">
            Dwi-Mod: Am + OSINT
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isMinimized ? "Kembangkan" : "Kecilkan"}
          >
            {isMinimized ? <Maximize2 size={12} /> : <Minus size={12} />}
          </button>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-rose-600 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Controls Bar: Context & Auto-Execute Toggle */}
          <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 text-[9.5px]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-slate-400 uppercase font-bold whitespace-nowrap">Sasaran:</span>
              {selectedNodes.length > 0 ? (
                selectedNodes.slice(0, 3).map(n => (
                  <span key={n.id} className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono whitespace-nowrap flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-cyan-400" />
                    {n.label.substring(0, 18)}
                  </span>
                ))
              ) : activeNode ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 font-mono whitespace-nowrap flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-blue-400" />
                  {activeNode.label.substring(0, 20)}
                </span>
              ) : (
                <span className="text-slate-500 italic">Seluruh Kanvas Graf ({allNodes.length} entiti)</span>
              )}
            </div>

            {/* Action Buttons: SOP Doctrine & Auto-Execute Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPreOrders(!showPreOrders)}
                className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  showPreOrders 
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                    : 'bg-cyan-950/70 hover:bg-cyan-900 border-cyan-500/40 text-cyan-300'
                }`}
                title="Buka Doktrin SOP & Senarai Pre-Order Taktikal OSINT (Fasa 1 hingga Fasa 5)"
              >
                <BookOpen size={10} className={showPreOrders ? 'text-black' : 'text-cyan-400'} />
                <span>{showPreOrders ? 'Tutup SOP' : '📋 Doktrin SOP'}</span>
              </button>

              {/* Auto Execute Toggle Switch */}
              <button
                onClick={() => setAutoExecute(!autoExecute)}
                className={`px-2 py-0.5 rounded border text-[9px] font-mono flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  autoExecute 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Jika diaktifkan, sebarang tindakan nod, hubungan dan imbasan akan dieksekusi terus ke atas kanvas graf."
              >
                <Zap size={10} className={autoExecute ? 'text-emerald-400 animate-pulse' : 'text-slate-500'} />
                <span>{autoExecute ? 'Autonomi: AKTIF' : 'Autonomi: MANUAL'}</span>
              </button>
            </div>
          </div>

          {/* Main Area: Either Messages Feed OR TacticalPreOrderDrawer */}
          {showPreOrders ? (
            <div className="flex-1 overflow-hidden">
              <TacticalPreOrderDrawer
                activeTarget={selectedNodes.length > 0 ? selectedNodes[0].label : (activeNode ? activeNode.label : '')}
                selectedNodes={selectedNodes}
                onClose={() => setShowPreOrders(false)}
                onSelectPrompt={(promptText, autoSend) => {
                  setShowPreOrders(false);
                  if (autoSend) {
                    handleSend(promptText);
                  } else {
                    setInput(promptText);
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar bg-slate-950/95">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Chat Bubble */}
                  <div className={`max-w-[92%] p-3.5 rounded-xl text-xs shadow-lg leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-cyan-900/90 to-blue-950/90 border border-cyan-500/50 text-cyan-50 rounded-tr-none' 
                      : 'bg-slate-900/95 border border-slate-700/80 text-slate-200 rounded-tl-none'
                  }`}>
                    {/* Sender Header */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/5 opacity-80">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {msg.role === 'ai' ? (
                          msg.intent === 'conversational' || (!msg.actions?.length && !msg.tacticalPlan?.length) ? (
                            <Sparkles size={12} className="text-amber-400" />
                          ) : (
                            <Brain size={12} className="text-cyan-400" />
                          )
                        ) : (
                          <Terminal size={12} className="text-blue-400" />
                        )}
                        <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-300">
                          {msg.role === 'ai' ? (
                            msg.intent === 'conversational' || (!msg.actions?.length && !msg.tacticalPlan?.length)
                              ? 'Red Horizon • AI Pintar'
                              : 'Autonomous Lead Strategist'
                          ) : 'Pengguna / Komander'}
                        </span>
                        {msg.role === 'ai' && (
                          <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-mono uppercase font-semibold ${
                            msg.intent === 'conversational' || (!msg.actions?.length && !msg.tacticalPlan?.length)
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {msg.intent === 'conversational' || (!msg.actions?.length && !msg.tacticalPlan?.length) ? 'Perbualan Am' : 'Operasi Graf'}
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] font-mono text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Message Content */}
                    <div className="prose prose-invert prose-xs max-w-none text-slate-200 leading-relaxed font-sans">
                      <Markdown>{msg.content}</Markdown>
                    </div>

                    {/* Tactical Plan List if provided */}
                    {msg.tacticalPlan && msg.tacticalPlan.length > 0 && (
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-950/70 border border-cyan-500/30">
                        <div className="text-[9.5px] font-mono font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                          <Layers size={11} />
                          Pelan Taktikal Operasi:
                        </div>
                        <div className="space-y-1">
                          {msg.tacticalPlan.map((step, sIdx) => (
                            <div key={sIdx} className="text-[10.5px] text-slate-300 font-mono flex items-start gap-1.5">
                              <span className="text-cyan-400 font-bold">•</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Directives Card */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 p-2.5 rounded-lg bg-gradient-to-r from-emerald-950/50 to-slate-950 border border-emerald-500/40">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 uppercase">
                            <CheckCircle2 size={12} className="text-emerald-400" />
                            <span>Tindakan Terus Dijalankan ({msg.actions.length}):</span>
                          </div>
                          {!autoExecute && (
                            <button
                              onClick={() => executeDirectives(msg.actions || [])}
                              className="px-2 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-mono font-bold hover:bg-emerald-400 cursor-pointer flex items-center gap-1 transition-all"
                            >
                              <Play size={9} />
                              Jalankan Ke Graf
                            </button>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {msg.actions.map((act, aIdx) => (
                            <div key={aIdx} className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 border border-white/5 text-[9.5px] font-mono">
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <span className="font-bold text-cyan-300">{act.action}:</span>
                                <span className="text-slate-400">{act.description || 'Pelaksanaan operasi'}</span>
                              </div>
                              {act.nodes && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-bold">
                                  +{act.nodes.length} nod
                                </span>
                              )}
                              {act.links && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[8px] font-bold">
                                  +{act.links.length} pautan
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {autoExecute && (
                          <div className="mt-2 flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono">
                            <Zap size={10} className="animate-pulse" />
                            <span>Disegerakkan secara langsung ke kanvas graf.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Web Sources Grounding Citations */}
                    {msg.webSources && msg.webSources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                        <span className="text-[8.5px] font-mono text-slate-400 uppercase">Sumber Sahih:</span>
                        {msg.webSources.slice(0, 3).map((src, srcIdx) => (
                          <a
                            key={srcIdx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[8.5px] text-cyan-300 font-mono flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink size={9} />
                            {src.title.substring(0, 20)}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Suggested Followups */}
                  {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && idx === messages.length - 1 && (
                    <div className="mt-2 pl-2 flex flex-wrap gap-1.5 max-w-[95%]">
                      {msg.suggestedFollowups.map((fup, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSend(fup)}
                          className="px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950/80 border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 text-[9.5px] font-mono transition-all text-left flex items-center gap-1 cursor-pointer shadow-sm hover:scale-[1.02]"
                        >
                          <ChevronRight size={10} className="text-cyan-400" />
                          <span>{fup}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900/95 border border-cyan-500/50 p-3.5 rounded-xl rounded-tl-none flex items-center gap-2.5 shadow-xl">
                    <Loader2 size={16} className="animate-spin text-cyan-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-cyan-300 font-mono font-bold tracking-wider animate-pulse uppercase">
                        Agen Autonomi Sedang Menganalisis...
                      </span>
                      <span className="text-[8.5px] text-slate-400 font-mono">
                        Meneroka web terbuka, menyusun perisikan & merangka nod kanvas
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Quick Action Chips Bar (With General & Tactical Short-Cuts) */}
          <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setShowPreOrders(true)}
              className="px-2 py-0.5 rounded bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/50 text-[8.5px] font-mono font-bold text-cyan-300 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 shadow-sm"
              title="Buka Doktrin SOP Penuh (13 Modul Taktikal Berperingkat)"
            >
              <ListOrdered size={10} className="text-cyan-400" />
              <span>📋 SOP Doktrin</span>
            </button>
            <button
              onClick={() => handleSend("Terangkan secara ringkas apa itu OSINT dan bagaimana data terbuka digunakan dalam siasatan moden?")}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-500/40 text-[8.5px] font-mono text-amber-300 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1"
            >
              <span>💬 Apa Itu OSINT?</span>
            </button>
            <button
              onClick={() => handleSend("Apakah 5 langkah terbaik untuk melindungi privasi peribadi dan jejak digital di internet hari ini?")}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/40 text-[8.5px] font-mono text-emerald-300 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1"
            >
              <span>🛡️ Tip Privasi</span>
            </button>
            <button
              onClick={() => {
                const target = selectedNodes[0]?.label || activeNode?.label || 'Sasaran Utama';
                handleSend(`Laksanakan Fasa 1.1: Siasat profil dan footprint digital sasaran "${target}". Kumpulkan latar belakang, peranan rasmi, entiti bersekutu, dan petakan nod sasaran utama ke atas graf kanvas.`);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500/40 text-[8.5px] font-mono text-slate-300 hover:text-cyan-300 whitespace-nowrap cursor-pointer transition-all"
            >
              1.1 Recon
            </button>
            <button
              onClick={() => {
                const target = selectedNodes[0]?.label || activeNode?.label || 'Sasaran Utama';
                handleSend(`Laksanakan Fasa 1.2: Periksa pendaftaran syarikat, rekod SSM, status pengarah dan pemegang saham yang berkaitan dengan "${target}". Petakan syarikat bersekutu dan hubungkan pengarah bersama ke atas graf.`);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500/40 text-[8.5px] font-mono text-slate-300 hover:text-cyan-300 whitespace-nowrap cursor-pointer transition-all"
            >
              1.2 SSM
            </button>
            <button
              onClick={() => {
                const target = selectedNodes[0]?.label || activeNode?.label || 'Sasaran Utama';
                handleSend(`Laksanakan Fasa 2.1: Semak rekod kebocoran data tiris (data breach archives) untuk "${target}". Kenal pasti insiden pelanggaran data, akaun terjejas, rekod kompromi, dan petakan entiti kebocoran ke graf.`);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-[8.5px] font-mono text-slate-300 hover:text-rose-300 whitespace-nowrap cursor-pointer transition-all"
            >
              2.1 Data Tiris
            </button>
            <button
              onClick={() => {
                const target = selectedNodes[0]?.label || activeNode?.label || 'Sasaran Utama';
                handleSend(`Laksanakan Fasa 3.1: Hubungkan pengarah bersama, sekutu perniagaan, dan proksi yang berkongsi alamat pejabat atau entiti pendaftaran dengan "${target}". Tunjukkan korelasi pemilikan langsung atau tidak langsung di atas graf.`);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-500/40 text-[8.5px] font-mono text-slate-300 hover:text-purple-300 whitespace-nowrap cursor-pointer transition-all"
            >
              3.1 Rangkaian
            </button>
            <button
              onClick={() => {
                const target = selectedNodes[0]?.label || activeNode?.label || 'Sasaran Utama';
                handleSend(`Laksanakan Fasa 4.1: Ekstrak alamat fizikal, ibu pejabat operasi, atau premis berdaftar sasaran "${target}" dan plotkan titik lokasi geospatial ke atas kanvas serta peta satelit.`);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/40 text-[8.5px] font-mono text-slate-300 hover:text-emerald-300 whitespace-nowrap cursor-pointer transition-all"
            >
              4.1 GEOINT
            </button>
            <button
              onClick={() => {
                const target = selectedNodes[0]?.label || activeNode?.label || 'Sasaran Utama';
                handleSend(`Laksanakan Fasa 5.1: Jalankan analisis sentraliti graf kognitif untuk menilai keseluruhan rangkaian sekitar "${target}". Kenal pasti siapa dalang utama (central kingpin) dan siapa yang bertindak sebagai broker atau perantara.`);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-500/40 text-[8.5px] font-mono text-slate-300 hover:text-amber-300 whitespace-nowrap cursor-pointer transition-all"
            >
              5.1 Dalang
            </button>
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/95">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tanya soalan umum, minta penerangan konsep, atau beri arahan operasi OSINT..."
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-lg pl-3 pr-10 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-all resize-none h-16 custom-scrollbar leading-relaxed"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="absolute right-2 bottom-2.5 p-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-lg hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
                title="Hantar Soalan atau Arahan"
              >
                <Send size={13} />
              </button>
            </div>

            <div className="mt-2 flex justify-between items-center text-[8px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Dwi-Mod Aktif: Soalan Am + Operasi OSINT • Carian Terus Google Search</span>
              </span>
              <div 
                className="w-3.5 h-3.5 cursor-nwse-resize flex items-center justify-center text-slate-500 hover:text-white"
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
                title="Tarik untuk melaraskan saiz tetingkap"
              >
                <GripHorizontal size={11} className="rotate-45" />
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default FloatingAIChat;
