import { Workspace, CaseFile, GraphData } from '../types';
import { cleanGraphData } from '../store/GlobalStore';
import { initDB } from './db';

export interface RhzSnapshot {
  id: string;
  workspaceId: string;
  fileName: string;
  timestamp: number;
  nodeCount: number;
  linkCount: number;
  data: CaseFile;
  trigger: 'auto_2min' | 'manual' | 'shortcut' | 'disk_sync';
}

export interface RhzAutosaveState {
  enabled: boolean;
  intervalMinutes: number; // default 2
  intervalSeconds: number; // default 120
  remainingSeconds: number; // countdown: 120 -> 0
  activeFileName: string;
  workspaceId: string;
  lastSavedTimestamp: number | null;
  lastSavedNodeCount: number;
  status: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage: string | null;
  totalAutosaves: number;
  hasFileHandle: boolean;
  fileHandleName: string | null;
  isDirty: boolean;
}

const STORAGE_KEY_CONFIG = 'redhorizon_rhz_autosave_config';
const STORAGE_KEY_ACTIVE_FILE = 'redhorizon_rhz_active_file';
const VAULT_STORE_KEY_PREFIX = 'rhz_vault_snapshots_';
const MAX_SNAPSHOTS_PER_WORKSPACE = 15;

class RhzAutosaveService {
  private state: RhzAutosaveState = {
    enabled: true,
    intervalMinutes: 2,
    intervalSeconds: 120,
    remainingSeconds: 120,
    activeFileName: 'RED_HORIZON_MISSION.rhz',
    workspaceId: 'ws_default',
    lastSavedTimestamp: null,
    lastSavedNodeCount: 0,
    status: 'idle',
    errorMessage: null,
    totalAutosaves: 0,
    hasFileHandle: false,
    fileHandleName: null,
    isDirty: false
  };

  private listeners: Set<(state: RhzAutosaveState) => void> = new Set();
  private timer: any = null;
  private currentFileHandle: any = null; // FileSystemFileHandle
  private getActiveWorkspaceFn: (() => Workspace | null) | null = null;
  private onLogFn: ((msg: string, type: 'info' | 'warning' | 'error' | 'success') => void) | null = null;

  constructor() {
    this.loadSavedConfig();
    this.startTimer();
  }

  private loadSavedConfig() {
    try {
      if (typeof window === 'undefined') return;
      const rawConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (rawConfig) {
        const parsed = JSON.parse(rawConfig);
        this.state.enabled = parsed.enabled ?? true;
        this.state.intervalMinutes = parsed.intervalMinutes || 2;
        this.state.intervalSeconds = this.state.intervalMinutes * 60;
        this.state.remainingSeconds = this.state.intervalSeconds;
      }
      const rawActive = localStorage.getItem(STORAGE_KEY_ACTIVE_FILE);
      if (rawActive) {
        this.state.activeFileName = rawActive;
      }
    } catch (e) {
      console.warn('[RHZ AUTOSAVE] Error loading config:', e);
    }
  }

  private saveConfig() {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({
        enabled: this.state.enabled,
        intervalMinutes: this.state.intervalMinutes
      }));
      localStorage.setItem(STORAGE_KEY_ACTIVE_FILE, this.state.activeFileName);
    } catch (e) {
      console.warn('[RHZ AUTOSAVE] Error saving config:', e);
    }
  }

  public registerWorkspaceGetter(fn: () => Workspace | null) {
    this.getActiveWorkspaceFn = fn;
  }

  public registerLogHandler(fn: (msg: string, type: 'info' | 'warning' | 'error' | 'success') => void) {
    this.onLogFn = fn;
  }

  public subscribe(listener: (state: RhzAutosaveState) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const copy = { ...this.state };
    this.listeners.forEach(fn => {
      try {
        fn(copy);
      } catch (err) {
        console.error('[RHZ AUTOSAVE] Listener error:', err);
      }
    });
  }

  public getState(): RhzAutosaveState {
    return { ...this.state };
  }

  public markDirty() {
    if (!this.state.isDirty) {
      this.state.isDirty = true;
      this.notify();
    }
  }

  public bindFile(fileName: string, wsId: string, fileHandle: any = null) {
    let cleanName = (fileName || 'RED_HORIZON_CASE.rhz').trim();
    if (!cleanName.toLowerCase().endsWith('.rhz')) {
      cleanName = cleanName.replace(/\.json$/i, '') + '.rhz';
    }

    this.state.activeFileName = cleanName;
    this.state.workspaceId = wsId;
    this.state.remainingSeconds = this.state.intervalSeconds;
    this.state.status = 'idle';
    this.state.errorMessage = null;

    if (fileHandle) {
      this.currentFileHandle = fileHandle;
      this.state.hasFileHandle = true;
      this.state.fileHandleName = fileHandle.name || cleanName;
    } else {
      this.currentFileHandle = null;
      this.state.hasFileHandle = false;
      this.state.fileHandleName = null;
    }

    this.saveConfig();
    this.notify();

    if (this.onLogFn) {
      this.onLogFn(`Autosave .RHZ diaktifkan untuk [${cleanName}] (Selang masa: ${this.state.intervalMinutes} minit)`, 'info');
    }
  }

  public setIntervalMinutes(minutes: number) {
    const validMinutes = Math.max(1, Math.min(60, minutes));
    this.state.intervalMinutes = validMinutes;
    this.state.intervalSeconds = validMinutes * 60;
    this.state.remainingSeconds = this.state.intervalSeconds;
    this.saveConfig();
    this.notify();

    if (this.onLogFn) {
      this.onLogFn(`Selang masa autosave .RHZ ditukar ke ${validMinutes} minit.`, 'info');
    }
  }

  public toggleAutosave(enabled?: boolean) {
    const next = enabled !== undefined ? enabled : !this.state.enabled;
    this.state.enabled = next;
    if (next) {
      this.state.remainingSeconds = this.state.intervalSeconds;
    }
    this.saveConfig();
    this.notify();

    if (this.onLogFn) {
      this.onLogFn(next ? `Autosave .RHZ diaktifkan (Setiap ${this.state.intervalMinutes} min).` : `Autosave .RHZ dinyahaktifkan.`, next ? 'info' : 'warning');
    }
  }

  public resetCountdown() {
    this.state.remainingSeconds = this.state.intervalSeconds;
    this.notify();
  }

  private startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    if (!this.state.enabled) return;

    if (this.state.remainingSeconds > 1) {
      this.state.remainingSeconds -= 1;
      this.notify();
    } else {
      // Timer reached 0! Trigger autosave
      this.state.remainingSeconds = this.state.intervalSeconds;
      this.executeAutosave('auto_2min');
    }
  }

  public async saveNow(targetWs?: Workspace, trigger: 'auto_2min' | 'manual' | 'shortcut' | 'disk_sync' = 'manual'): Promise<boolean> {
    return this.executeAutosave(trigger, targetWs);
  }

  private async executeAutosave(
    trigger: 'auto_2min' | 'manual' | 'shortcut' | 'disk_sync',
    specificWs?: Workspace
  ): Promise<boolean> {
    const ws = specificWs || (this.getActiveWorkspaceFn ? this.getActiveWorkspaceFn() : null);
    if (!ws || !ws.data) {
      return false;
    }

    const nodeCount = ws.data.nodes?.length || 0;
    const linkCount = ws.data.links?.length || 0;

    // If completely empty target placeholder and never modified, skip silent auto-save to save storage
    if (trigger === 'auto_2min' && nodeCount <= 1 && (!ws.data.nodes[0] || ws.data.nodes[0].label === 'NEW_TARGET') && linkCount === 0 && !this.state.isDirty) {
      return false;
    }

    this.state.status = 'saving';
    this.state.errorMessage = null;
    this.notify();

    try {
      const cleanData = cleanGraphData(ws.data);
      const fileName = this.state.activeFileName || `RED_HORIZON_${(ws.name || 'CASE').replace(/\s+/g, '_')}.rhz`;

      const caseFile: CaseFile = {
        id: ws.id,
        caseName: ws.name || fileName.replace(/\.rhz$/i, ''),
        graph: cleanData,
        timestamp: Date.now(),
        version: 'rh_v14_tavily_final_v3',
        synthesisResult: ws.synthesisResult,
        strategyResult: ws.strategyResult
      };

      const jsonString = JSON.stringify(caseFile, null, 2);

      // 1. If FileSystemFileHandle is available and granted, write directly to user's disk file
      let savedToDiskDirect = false;
      if (this.currentFileHandle) {
        try {
          const writable = await this.currentFileHandle.createWritable();
          await writable.write(jsonString);
          await writable.close();
          savedToDiskDirect = true;
        } catch (diskErr: any) {
          console.warn('[RHZ AUTOSAVE] FileSystemFileHandle write failed, falling back to vault:', diskErr);
        }
      }

      // 2. Persist to IndexedDB / LocalStorage Snapshots Vault
      await this.saveSnapshotToVault({
        id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workspaceId: ws.id,
        fileName: fileName,
        timestamp: Date.now(),
        nodeCount: cleanData.nodes.length,
        linkCount: cleanData.links.length,
        data: caseFile,
        trigger: trigger
      });

      // 3. Keep a fast local emergency recovery mirror in localStorage
      try {
        localStorage.setItem(`rhz_latest_autosave_${ws.id}`, jsonString);
        localStorage.setItem(`rhz_latest_autosave_meta_${ws.id}`, JSON.stringify({
          fileName,
          timestamp: Date.now(),
          nodes: cleanData.nodes.length,
          links: cleanData.links.length
        }));
      } catch (_) {}

      // Update state
      this.state.status = 'saved';
      this.state.lastSavedTimestamp = Date.now();
      this.state.lastSavedNodeCount = cleanData.nodes.length;
      this.state.totalAutosaves += 1;
      this.state.isDirty = false;
      this.state.remainingSeconds = this.state.intervalSeconds;
      this.notify();

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const destText = savedToDiskDirect ? `ke fail cakera [${this.state.fileHandleName || fileName}]` : `ke peti simpanan selamat (Vault Autosave)`;

      if (this.onLogFn) {
        if (trigger === 'auto_2min') {
          this.onLogFn(`💾 [AUTOSAVE .RHZ - ${this.state.intervalMinutes} MIN]: Fail '${fileName}' berjaya disimpan ${destText} pada ${timeStr} (${cleanData.nodes.length} entiti, ${cleanData.links.length} pautan).`, 'success');
        } else if (trigger === 'shortcut') {
          this.onLogFn(`💾 [SIMPAN PANTAS]: Fail '${fileName}' berjaya disimpan (${cleanData.nodes.length} entiti).`, 'success');
        } else {
          this.onLogFn(`💾 Fail kerja .RHZ [${fileName}] disimpan dengan jayanya.`, 'success');
        }
      }

      // Return to idle status after 4 seconds
      setTimeout(() => {
        if (this.state.status === 'saved') {
          this.state.status = 'idle';
          this.notify();
        }
      }, 4000);

      return true;
    } catch (err: any) {
      console.error('[RHZ AUTOSAVE] Autosave failed:', err);
      this.state.status = 'error';
      this.state.errorMessage = err?.message || 'Gagal menyimpan fail .rhz';
      this.notify();

      if (this.onLogFn) {
        this.onLogFn(`Ralat Autosave .RHZ: ${this.state.errorMessage}`, 'error');
      }
      return false;
    }
  }

  // File System Access API: Pick an existing .rhz or .json file to open & bind handle
  public async openRhzWithFilePicker(): Promise<{ fileContent: CaseFile; fileName: string } | null> {
    if (typeof window === 'undefined' || !(window as any).showOpenFilePicker) {
      return null;
    }

    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Red Horizon Case (.rhz, .json)',
            accept: {
              'application/json': ['.rhz', '.json']
            }
          }
        ],
        multiple: false
      });

      if (!handle) return null;

      const file = await handle.getFile();
      const text = await file.text();
      const json = JSON.parse(text);

      let extractedNodes: any[] = [];
      let extractedLinks: any[] = [];
      let caseName = file.name.replace(/\.(rhz|json)$/i, '');
      let synthesisResult = json.synthesisResult || null;
      let strategyResult = json.strategyResult || null;

      if (Array.isArray(json)) {
        extractedNodes = json;
      } else if (json.graph && Array.isArray(json.graph.nodes)) {
        extractedNodes = json.graph.nodes;
        extractedLinks = json.graph.links || [];
        if (json.caseName) caseName = json.caseName;
      } else if (json.data && Array.isArray(json.data.nodes)) {
        extractedNodes = json.data.nodes;
        extractedLinks = json.data.links || [];
        if (json.caseName || json.name) caseName = json.caseName || json.name;
      } else if (Array.isArray(json.nodes)) {
        extractedNodes = json.nodes;
        extractedLinks = json.links || [];
        if (json.caseName || json.name) caseName = json.caseName || json.name;
      }

      const caseFile: CaseFile = {
        id: json.id || `case_${Date.now()}`,
        caseName: caseName,
        graph: { nodes: extractedNodes, links: extractedLinks },
        timestamp: json.timestamp || Date.now(),
        version: json.version || 'rh_v14_tavily_final_v3',
        synthesisResult,
        strategyResult
      };

      this.bindFile(file.name, caseFile.id, handle);
      return { fileContent: caseFile, fileName: file.name };
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('[RHZ AUTOSAVE] openRhzWithFilePicker error:', e);
      }
      return null;
    }
  }

  // File System Access API: Link a local disk file for direct in-place background writes
  public async linkDiskFile(ws: Workspace): Promise<boolean> {
    if (typeof window === 'undefined' || !(window as any).showSaveFilePicker) {
      // Fallback: download current file
      this.downloadCurrentRhz(ws);
      return true;
    }

    try {
      const defaultName = this.state.activeFileName || `RED_HORIZON_${(ws.name || 'CASE').replace(/\s+/g, '_')}.rhz`;
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: defaultName,
        types: [
          {
            description: 'Red Horizon Workspace (.rhz)',
            accept: {
              'application/json': ['.rhz']
            }
          }
        ]
      });

      if (handle) {
        this.currentFileHandle = handle;
        this.state.hasFileHandle = true;
        this.state.fileHandleName = handle.name;
        this.state.activeFileName = handle.name;
        this.saveConfig();
        this.notify();

        // Write immediately
        await this.executeAutosave('disk_sync', ws);
        return true;
      }
      return false;
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('[RHZ AUTOSAVE] Link disk file error:', e);
      }
      return false;
    }
  }

  public downloadCurrentRhz(ws: Workspace) {
    const cleanData = cleanGraphData(ws.data);
    const fileName = this.state.activeFileName || `RED_HORIZON_${(ws.name || 'CASE').replace(/\s+/g, '_')}.rhz`;
    const data: CaseFile = {
      id: ws.id,
      caseName: ws.name,
      graph: cleanData,
      timestamp: Date.now(),
      version: 'rh_v14_tavily_final_v3',
      synthesisResult: ws.synthesisResult,
      strategyResult: ws.strategyResult
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    this.state.lastSavedTimestamp = Date.now();
    this.state.status = 'saved';
    this.notify();

    if (this.onLogFn) {
      this.onLogFn(`Fail kes .RHZ dimuat turun: ${fileName}`, 'success');
    }
  }

  // Snapshot Vault Methods
  private async saveSnapshotToVault(snapshot: RhzSnapshot) {
    try {
      const key = `${VAULT_STORE_KEY_PREFIX}${snapshot.workspaceId}`;
      const raw = localStorage.getItem(key);
      let list: RhzSnapshot[] = raw ? JSON.parse(raw) : [];

      // Add to front
      list.unshift(snapshot);

      // Keep maximum snapshots
      if (list.length > MAX_SNAPSHOTS_PER_WORKSPACE) {
        list = list.slice(0, MAX_SNAPSHOTS_PER_WORKSPACE);
      }

      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('[RHZ AUTOSAVE] saveSnapshotToVault error:', e);
    }
  }

  public getSnapshots(workspaceId: string): RhzSnapshot[] {
    try {
      const key = `${VAULT_STORE_KEY_PREFIX}${workspaceId}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  public clearSnapshots(workspaceId: string) {
    try {
      localStorage.removeItem(`${VAULT_STORE_KEY_PREFIX}${workspaceId}`);
      this.notify();
    } catch (_) {}
  }
}

export const rhzAutosave = new RhzAutosaveService();
