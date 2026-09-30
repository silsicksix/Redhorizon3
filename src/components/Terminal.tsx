
import React, { useEffect, useRef, useState } from 'react';
import { LogEntry, Node, StrategyResult } from '../types';
import { 
    Terminal as TerminalIcon, Send, Play, Loader2, Target, 
    Fingerprint, ShieldAlert, Lightbulb, ChevronRight as ChevronRightIcon,
    Trash2, Search, Zap, Globe, Smartphone, Mail, User, RefreshCw, Database, Wrench, ExternalLink, Radar, Bot, Sparkles
} from 'lucide-react';
import StrategyPanel from './StrategyPanel';

interface TerminalProps {
  logs: LogEntry[];
  activeNode?: Node | null;
  strategyResult: StrategyResult | null;
  onGenerateStrategy: () => void;
  onParseOutput: (text: string, sourceNodeId: string) => void;
  onUpdateNode?: (node: Node) => void;
  strategyLoading: boolean;
  targetName: string;
  onClearStrategy?: () => void;
  backendUrl?: string; 
  activeBackend?: 'termux' | 'pc';
  activeTab?: 'logs' | 'toolkit' | 'advisor' | 'research';
  onTabChange?: (tab: 'logs' | 'toolkit' | 'advisor' | 'research') => void;
  leakCheckPhone?: string | null;
  allNodes?: Node[];
  onSelectNode?: (node: Node) => void;
  onTriggerRadialAction?: (actionKey: string, targetNode?: Node) => void;
}

const Terminal: React.FC<TerminalProps> = ({ 
  logs, activeNode, strategyResult, onGenerateStrategy, 
  onParseOutput, onUpdateNode, strategyLoading, targetName, onClearStrategy, 
  backendUrl, activeBackend = 'termux', activeTab: controlledTab, onTabChange, leakCheckPhone,
  allNodes = [], onSelectNode, onTriggerRadialAction
}) => {
  const [internalTab, setInternalTab] = useState<'logs' | 'toolkit' | 'advisor' | 'research'>('logs');
  const activeTab = controlledTab || internalTab;
  
  const setActiveTab = (tab: 'logs' | 'toolkit' | 'advisor' | 'research') => {
    if (onTabChange) onTabChange(tab);
    else setInternalTab(tab);
  };

  const [executingId, setExecutingId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<LogEntry[]>([]);
  const [manualCmd, setManualCmd] = useState('');
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput, logs]);

  const handleExecuteCommand = async (cmd: string, id?: string) => {
      if (!cmd.trim()) return;
      setActiveTab('logs');
      setManualCmd('');

      if (!backendUrl) {
          setTerminalOutput(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `[SYS] Backend offline. Hubungkan di Settings.`, type: 'warning' }]);
          return;
      }

      if (id !== undefined) setExecutingId(id);
      const promptTag = activeBackend === 'pc' ? 'root@pc:~$' : 'root@termux:~$';
      setTerminalOutput(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `${promptTag} ${cmd}`, type: 'warning' }]);

      abortControllerRef.current = new AbortController();
      let accumulatedText = '';

      try {
          // Added tunnel skip headers to the execution fetch
          const response = await fetch(`${backendUrl}/api/execute`, {
              method: 'POST',
              credentials: 'omit',
              headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'bypass-tunnel-reminder': 'true'
              },
              body: JSON.stringify({ command: cmd }),
              signal: abortControllerRef.current.signal
          });

          if (!response.body) throw new Error("No response body from server.");

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
              const { value, done } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              accumulatedText += chunk;

              const lines = chunk.split('\n').filter(l => l.trim());
              lines.forEach(line => {
                  setTerminalOutput(prev => [...prev, {
                      timestamp: new Date().toLocaleTimeString(),
                      message: line,
                      type: 'info'
                  }]);
              });
          }

          if (activeNode && accumulatedText.length > 20) {
              const entries: LogEntry[] = [{ 
                  timestamp: new Date().toLocaleTimeString(), 
                  message: `[SYS] Scan complete. Transmitting intelligence to Neural Engine...`, 
                  type: 'success' 
              }];

              const htmlMatch = accumulatedText.match(/(?:reports\/)?(report_[a-zA-Z0-9_.-]+\.html)/i);
              if (htmlMatch) {
                  const filename = htmlMatch[1];
                  const folder = accumulatedText.includes(`reports/${filename}`) ? 'reports/' : '';
                  const reportUrl = `${backendUrl}/files/${folder}${filename}`;
                  entries.push({
                      timestamp: new Date().toLocaleTimeString(),
                      message: `[SYS] HTML Report Generated!`,
                      type: 'success',
                      action: {
                          text: `View ${filename}`,
                          url: reportUrl
                      }
                  });
                  // Update the node directly to persist the URL
                  if (onUpdateNode) {
                      onUpdateNode({ ...activeNode, htmlReportUrl: reportUrl });
                  }
              }

              setTerminalOutput(prev => [...prev, ...entries]);
              onParseOutput(accumulatedText, activeNode.id);
          }

      } catch (e: any) {
          setTerminalOutput(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `[ERROR] ${e.message}`, type: 'error' }]);
      } finally {
          setExecutingId(null);
      }
  };

  const cleanTarget = activeNode ? activeNode.label.replace(/[^a-zA-Z0-9_.-]/g, '') : '';
  const cleanTargetQuoted = activeNode ? `"${activeNode.label.replace(/"/g, '\\"')}"` : '""';
  const cleanSafeFilename = cleanTarget.replace(/[^a-zA-Z0-9_-]/g, '_') || 'target';

  const isPc = activeBackend === 'pc';

  const maintenanceTools = [
    { id: 'full_update_pc', name: isPc ? 'Update PC & Tools' : 'Update Termux & Tools', desc: isPc ? 'Kemaskini penuh PC/Linux/WSL (pip3)' : 'Kemaskini penuh Termux dan semua tools', cmd: isPc ? 'pip3 install --upgrade pip && pip3 install --upgrade ghunt sherlock-project holehe phoneinfoga socialscan langchain langgraph' : 'pkg update -y && pkg upgrade -y && pip install --upgrade pip && pip install --upgrade ghunt sherlock-project holehe phoneinfoga socialscan langchain langgraph' },
    ...(!isPc ? [{ id: 'fix_shebang', name: 'Fix Interpreters', desc: 'Repair "bad interpreter" errors', cmd: 'pkg install -y termux-tools && termux-fix-shebang $(which ghunt sherlock holehe phoneinfoga 2>/dev/null)' }] : []),
    { id: 'fix_sherlock', name: 'Fix Sherlock', desc: 'Install missing sherlock_project module', cmd: isPc ? 'python -m pip uninstall -y sherlock && python -m pip install --upgrade sherlock-project' : 'pip uninstall -y sherlock && pip install --upgrade sherlock-project' },
    { id: 'ghunt_login', name: 'GHunt Login', desc: 'Refresh Google session/cookies', cmd: 'ghunt login' },
    { id: 'update_pip', name: 'Update Armory', desc: 'Force rebuild pip packages', cmd: isPc ? 'python -m pip install --upgrade ghunt sherlock-project holehe phoneinfoga socialscan' : 'pip install --upgrade ghunt sherlock-project holehe phoneinfoga socialscan' },
    ...(!isPc ? [{ id: 'pkg_upgrade', name: 'System Upgrade', desc: 'Full Termux package sync', cmd: 'pkg update && pkg upgrade -y' }] : []),
    { id: 'clean_cache', name: 'Purge Cache', desc: 'Clear temporary scan data', cmd: isPc ? 'python -m pip cache purge' : 'rm -rf ~/.cache/pip && rm -rf /tmp/*' }
  ];

  const toolGroups = activeNode ? [
      {
          phase: 'PHASE 1: IDENTITY RECON (USERNAME)',
          icon: <User size={14} className="text-[var(--theme-color)]"/>,
          tools: [
            { id: 'sherlock', name: 'Sherlock', desc: 'Deep scan 350+ social networks', cmd: isPc ? `python -m sherlock ${cleanTarget} --print-found` : `sherlock ${cleanTarget} --print-found`, fixCmd: isPc ? `python -m pip install --upgrade sherlock-project` : `pip uninstall -y sherlock && pip install --upgrade sherlock-project`, installCmd: `git clone https://github.com/sherlock-project/sherlock.git && cd sherlock && python3 -m pip install -r requirements.txt` },
            { id: 'stalker_strike', name: 'Stalker-Strike', desc: 'Target footprint & social profile tracer', cmd: isPc ? `python3 -m stalker_strike --target ${cleanTargetQuoted}` : `python -m stalker_strike --target ${cleanTargetQuoted}`, fixCmd: isPc ? `pip3 install --upgrade stalker-strike` : `pip install --upgrade stalker-strike`, installCmd: `git clone https://github.com/29nls/stalker-strike.git && cd stalker-strike && pip3 install -r requirements.txt` },
            { id: 'maigret', name: 'Maigret', desc: 'Advanced dossier collection', cmd: `maigret ${cleanTarget} -a --html --txt`, fixCmd: isPc ? `pip3 install --upgrade maigret` : `pip install --upgrade maigret`, installCmd: `git clone https://github.com/soxoj/maigret && cd maigret && pip3 install .` },
            { id: 'blackbird', name: 'Blackbird', desc: 'Fast username enumeration', cmd: `blackbird -u ${cleanTarget}`, fixCmd: isPc ? `pip3 install --upgrade blackbird` : `pip install --upgrade blackbird`, installCmd: `git clone https://github.com/p1ngul1n0/blackbird && cd blackbird && pip3 install -r requirements.txt` },
            { id: 'whatsmyname', name: 'WhatsMyName', desc: 'Cross-reference username database', cmd: `whatsmyname -u ${cleanTarget}`, fixCmd: isPc ? `pip3 install --upgrade whatsmyname` : `pip install --upgrade whatsmyname`, installCmd: `git clone https://github.com/WebBreacher/WhatsMyName.git && cd WhatsMyName && pip3 install -r requirements.txt` }
          ]
      },
      {
          phase: 'PHASE 2: COMMS INTERCEPTION (EMAIL/PHONE)',
          icon: <Mail size={14} className="text-[var(--accent-color)]"/>,
          tools: [
            { id: 'holehe', name: 'Holehe', desc: 'Check registered email accounts', cmd: `holehe ${cleanTargetQuoted}`, fixCmd: isPc ? `pip3 install --upgrade holehe` : `pip install --upgrade holehe`, installCmd: `git clone https://github.com/megadose/holehe.git && cd holehe && python3 setup.py install` },
            { id: 'phoneinfoga', name: 'PhoneInfoga', desc: 'Intl. number intelligence', cmd: `phoneinfoga scan -n ${cleanTarget.replace(/[^0-9]/g, '')}`, fixCmd: isPc ? `pip3 install --upgrade phoneinfoga` : `pkg update && pkg install -y tur-repo && pkg install -y phoneinfoga`, installCmd: `curl -sSL https://raw.githubusercontent.com/sundowndev/phoneinfoga/master/support/scripts/install | bash` },
            { id: 'socialscan', name: 'SocialScan', desc: 'Check email usage availability', cmd: `socialscan ${cleanTargetQuoted}`, fixCmd: isPc ? `pip3 install --upgrade socialscan` : `pip install --upgrade socialscan`, installCmd: `git clone https://github.com/iojw/socialscan.git && cd socialscan && pip3 install .` },
            { id: 'ghunt', name: 'GHunt (Google)', desc: 'Extract Google Account details', cmd: `ghunt email ${cleanTargetQuoted}`, fixCmd: isPc ? `pip3 install --upgrade ghunt` : `pip install --upgrade ghunt`, installCmd: `pip3 install --upgrade pip && pip3 install ghunt` }
          ]
      },
      {
          phase: 'PHASE 3: INFRASTRUCTURE (WEB/DOMAIN)',
          icon: <Globe size={14} className="text-emerald-400"/>,
          tools: [
            { id: 'theharvester', name: 'TheHarvester', desc: 'Gather emails, subdomains, hosts', cmd: `theHarvester -d ${cleanTarget} -b all -f report_${cleanSafeFilename}.html`, fixCmd: isPc ? `pip3 install --upgrade theHarvester` : `pip install --upgrade theHarvester`, installCmd: `git clone https://github.com/laramies/theHarvester.git && cd theHarvester && pip3 install -r requirements/base.txt` },
            { id: 'photon', name: 'Photon', desc: 'High-speed crawler & extractor', cmd: `photon -u ${cleanTargetQuoted}`, fixCmd: isPc ? `pip3 install --upgrade photon` : `pip install --upgrade photon`, installCmd: `git clone https://github.com/s0md3v/Photon.git && cd Photon && pip3 install -r requirements.txt` },
            { id: 'sf_cli', name: 'SpiderFoot (CLI)', desc: 'Run headless scan (Quick)', cmd: `python3 sf.py -s ${cleanTargetQuoted} -q`, fixCmd: `pip3 install --upgrade pyOpenSSL cryptography lxml`, installCmd: `git clone https://github.com/smicallef/spiderfoot.git && cd spiderfoot && pip3 install -r requirements.txt` }
          ]
      },
      {
          phase: isPc ? 'SYSTEM MAINTENANCE & REPAIR (PC / LINUX / WSL)' : 'SYSTEM MAINTENANCE & REPAIR (ANDROID TERMUX)',
          icon: <RefreshCw size={14} className="text-orange-400"/>,
          tools: maintenanceTools
      }
  ] : [
      {
          phase: isPc ? 'SYSTEM MAINTENANCE & REPAIR (PC / LINUX / WSL)' : 'SYSTEM MAINTENANCE & REPAIR (ANDROID TERMUX)',
          icon: <RefreshCw size={14} className="text-orange-400"/>,
          tools: maintenanceTools
      }
  ];

  return (
    <div className="h-full w-full bg-[#050505] font-mono text-xs flex flex-col glass-panel shadow-2xl relative">
      <div className="flex border-b border-[#ff0033]/20 bg-black/80 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('logs')} className={`flex-1 py-3 px-2 text-[10px] font-black uppercase flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'logs' ? 'bg-[#ff0033]/20 text-[#ff0033] border-b-2 border-[#ff0033]' : 'text-gray-500 hover:text-[#ff0033] hover:bg-[#ff0033]/5'}`}><TerminalIcon size={12} /> Console</button>
          <button onClick={() => setActiveTab('toolkit')} className={`flex-1 py-3 px-2 text-[10px] font-black uppercase flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'toolkit' ? 'bg-[#00ccff]/20 text-[#00ccff] border-b-2 border-[#00ccff]' : 'text-gray-500 hover:text-[#00ccff] hover:bg-[#00ccff]/5'}`}><ShieldAlert size={12} /> Armory</button>
          <button onClick={() => setActiveTab('advisor')} className={`flex-1 py-3 px-2 text-[10px] font-black uppercase flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'advisor' ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/5'}`}><Lightbulb size={12} /> Advisor</button>
          <button onClick={() => setActiveTab('research')} className={`flex-1 py-3 px-2 text-[10px] font-black uppercase flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'research' ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-purple-500 hover:bg-purple-500/5'}`}><Search size={12} /> Research</button>
      </div>

      <div className="flex-1 overflow-hidden relative">
          {activeTab === 'logs' && (
              <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar font-mono text-[11px] md:text-xs bg-black">
                    {[...logs, ...terminalOutput].map((log, i) => (
                        <div key={i} className="flex gap-2 border-b border-white/5 pb-1">
                            <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                            <span className={`break-all whitespace-pre-wrap ${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-emerald-500' : log.type === 'warning' ? 'text-yellow-500' : 'text-gray-300'}`}>
                                {log.message}
                                {log.action && (
                                    <a href={log.action.url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 font-bold text-[#ff0033] hover:text-white underline relative top-0.5">
                                        <ExternalLink size={12}/> {log.action.text}
                                    </a>
                                )}
                            </span>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                  <div className="p-3 bg-black border-t border-white/10 flex gap-3">
                      <span className="text-[var(--theme-color)] font-black text-[11px] md:text-xs">{isPc ? 'root@pc:~$' : 'root@termux:~$'}</span>
                      <input type="text" value={manualCmd} onChange={(e) => setManualCmd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleExecuteCommand(manualCmd)} className="flex-1 bg-transparent border-none outline-none text-white text-[11px] md:text-xs" />
                  </div>
              </div>
          )}

          {activeTab === 'toolkit' && (
              <div className="h-full overflow-y-auto p-4 custom-scrollbar bg-black/20">
                  {activeNode ? (
                      <div className="space-y-6">
                          <div className="text-white font-black uppercase text-[11px] italic flex items-center gap-2 border-b border-white/10 pb-2">
                              <Target size={14} className="text-[var(--theme-color)]"/> Target Lock: {activeNode.label}
                          </div>
                          {toolGroups.map((group, gIdx) => (
                              <div key={gIdx} className="space-y-3">
                                  <div className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2 bg-white/5 p-1">
                                    {group.icon} {group.phase}
                                  </div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {group.tools.map((tool) => (
                                        <div key={tool.id} className="bg-black/60 border border-white/5 p-3 hover:border-[var(--accent-color)] transition-all flex justify-between items-center group">
                                            <div>
                                                <h4 className="text-white font-black uppercase text-[10px] group-hover:text-[var(--accent-color)]">{tool.name}</h4>
                                                <p className="text-[9px] text-gray-500">{tool.desc}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                {(tool as any).installCmd && (
                                                    <button onClick={() => handleExecuteCommand((tool as any).installCmd, tool.id + '_install')} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 p-2 hover:bg-emerald-500 hover:text-black transition-all rounded-sm flex items-center gap-1" title={`Install ${tool.name} from GitHub`}>
                                                        {executingId === tool.id + '_install' ? <Loader2 className="animate-spin" size={14}/> : <Database size={14}/>}
                                                    </button>
                                                )}
                                                {(tool as any).fixCmd && (
                                                    <button onClick={() => handleExecuteCommand((tool as any).fixCmd, tool.id + '_fix')} className="bg-orange-500/10 text-orange-400 border border-orange-500/30 p-2 hover:bg-orange-500 hover:text-black transition-all rounded-sm" title={`Fix/Repair ${tool.name}`}>
                                                        {executingId === tool.id + '_fix' ? <Loader2 className="animate-spin" size={14}/> : <Wrench size={14}/>}
                                                    </button>
                                                )}
                                                <button onClick={() => handleExecuteCommand(tool.cmd, tool.id)} className="bg-[var(--accent-color)]/20 text-[var(--accent-color)] border border-[var(--accent-color)]/40 p-2 hover:bg-[var(--accent-color)] hover:text-black transition-all rounded-sm">
                                                  {executingId === tool.id ? <Loader2 className="animate-spin" size={14}/> : <Play size={14}/>}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-4">
                          <Target size={48} className="opacity-20 animate-pulse" />
                          <div className="text-center">
                              <p className="uppercase font-black text-xs tracking-widest">NO TARGET SELECTED</p>
                              <p className="text-[9px] mt-2 opacity-50">Select an entity on the graph to load weaponry.</p>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'advisor' && (
              <StrategyPanel 
                strategyResult={strategyResult} 
                targetName={targetName} 
                onGenerate={onGenerateStrategy} 
                onExecuteCommand={(cmd) => {
                    handleExecuteCommand(cmd);
                    setActiveTab('logs');
                }} 
                onSwitchToArmory={(targetNodeLabel, toolId) => {
                    if (targetNodeLabel && onSelectNode && allNodes.length > 0) {
                        const matched = allNodes.find(n => n.label.toLowerCase() === targetNodeLabel.toLowerCase());
                        if (matched) onSelectNode(matched);
                    }
                    setActiveTab('toolkit');
                }}
                onTriggerRadialAction={(actionKey, targetNode) => {
                    if (onTriggerRadialAction) {
                        onTriggerRadialAction(actionKey, targetNode || activeNode || undefined);
                    }
                }}
                onFocusNode={(nodeLabelOrId) => {
                    if (onSelectNode && allNodes.length > 0) {
                        const matched = allNodes.find(n => n.label.toLowerCase() === nodeLabelOrId.toLowerCase() || n.id === nodeLabelOrId);
                        if (matched) onSelectNode(matched);
                    }
                }}
                loading={strategyLoading} 
                onClear={onClearStrategy}
                activeNode={activeNode}
                allNodes={allNodes}
              />
          )}

          <div className={`h-full w-full bg-black overflow-hidden relative ${activeTab === 'research' ? 'block' : 'hidden'}`}>
              <iframe 
                src="https://chat-research.tavily.com/" 
                className="w-full h-full border-none"
                title="Tavily Research Chat"
                allow="clipboard-read; clipboard-write"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                  <button 
                    onClick={() => {
                        const iframe = document.querySelector('iframe[title="Tavily Research Chat"]') as HTMLIFrameElement;
                        if (iframe) iframe.src = iframe.src;
                    }}
                    className="p-1.5 bg-black/60 hover:bg-purple-600 text-white rounded border border-white/10 transition-all"
                    title="Refresh Research"
                  >
                    <RefreshCw size={12} />
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Terminal;
