/**
 * REDHORIZON - HYBRID BIG DATA STREAMING INGESTION SERVICE
 * Coordinates Progressive Chunk Streaming and Dedicated Web Worker Ingestion.
 * Supports auto-fallback, entity resolution, and direct ontological graph integration.
 */

import { Node, Link, GraphData } from '../types';

export type IngestionMode = 'auto' | 'chunk_stream' | 'web_worker';

export interface IngestionConfig {
  mode: IngestionMode;
  query?: string;
  useRegex?: boolean;
  enableOntology?: boolean;
  autoExtract?: boolean;
  chunkSizeBytes?: number;
  maxMatchesToRetain?: number;
}

export interface IngestionTelemetry {
  fileName: string;
  bytesProcessed: number;
  totalBytes: number;
  percent: number;
  rowsProcessed: number;
  matchesFound: number;
  entitiesExtracted: number;
  triplesGenerated: number;
  speedRowsPerSec: number;
  memoryEstimateMb: number;
  activeEngine: 'Web Worker (Background Thread)' | 'Progressive Chunk Stream (Main Thread)';
  currentStage: string;
}

export interface IngestionSummary {
  fileName: string;
  totalRows: number;
  totalMatches: number;
  totalEntities: number;
  totalTriples: number;
  durationSeconds: string;
  speedAvg: number;
  engineUsed: string;
}

export interface IngestionCallbacks {
  onTelemetry: (telemetry: IngestionTelemetry) => void;
  onBatch: (matches: any[], nodes: Node[], links: Link[]) => void;
  onComplete: (summary: IngestionSummary) => void;
  onError: (err: string) => void;
}

export class HybridIngestionSession {
  private worker: Worker | null = null;
  private abortController: AbortController | null = null;
  private isRunning: boolean = false;

  constructor() {}

  /**
   * Start processing a big data file with selected or auto-detected mode
   */
  public async start(file: File, config: IngestionConfig, callbacks: IngestionCallbacks): Promise<void> {
    this.stop();
    this.isRunning = true;
    this.abortController = new AbortController();

    const AUTO_WORKER_THRESHOLD = 50 * 1024 * 1024; // 50MB
    let selectedMode: 'chunk_stream' | 'web_worker' = 'chunk_stream';

    if (config.mode === 'web_worker') {
      selectedMode = 'web_worker';
    } else if (config.mode === 'chunk_stream') {
      selectedMode = 'chunk_stream';
    } else {
      // Auto Mode
      selectedMode = file.size >= AUTO_WORKER_THRESHOLD ? 'web_worker' : 'chunk_stream';
    }

    if (selectedMode === 'web_worker') {
      try {
        await this.runWorkerMode(file, config, callbacks);
        return;
      } catch (err: any) {
        console.warn('Web Worker startup failed, falling back to Chunk Stream:', err);
        // Fallback to Progressive Chunk Stream if worker couldn't start
        selectedMode = 'chunk_stream';
      }
    }

    // Run Chunk Stream Mode
    await this.runChunkStreamMode(file, config, callbacks);
  }

  /**
   * Stop/Abort current execution
   */
  public stop() {
    this.isRunning = false;
    if (this.worker) {
      try {
        this.worker.postMessage({ action: 'ABORT' });
        this.worker.terminate();
      } catch (_) {}
      this.worker = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Worker-based execution (Dedicated thread, zero UI lag)
   */
  private async runWorkerMode(file: File, config: IngestionConfig, callbacks: IngestionCallbacks): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('../workers/bigDataStreamingWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent) => {
          if (!this.isRunning) return;
          const { action, payload } = event.data;

          if (action === 'TELEMETRY_UPDATE') {
            const tel = payload.telemetry;
            callbacks.onTelemetry({
              ...tel,
              fileName: file.name,
              activeEngine: 'Web Worker (Background Thread)'
            });

            if ((payload.matches?.length || 0) > 0 || (payload.newNodes?.length || 0) > 0) {
              const sanitizedNodes: Node[] = (payload.newNodes || []).map((n: any) => ({
                id: n.id,
                label: n.label,
                type: n.type,
                details: n.details,
                vaultMatch: true,
                vaultSource: file.name,
                metadata: n.metadata
              }));

              const sanitizedLinks: Link[] = (payload.newLinks || []).map((l: any) => ({
                source: l.source,
                target: l.target,
                label: l.label,
                isVault: true
              }));

              callbacks.onBatch(payload.matches || [], sanitizedNodes, sanitizedLinks);
            }
          } else if (action === 'COMPLETE') {
            this.isRunning = false;
            if ((payload.remainingNodes?.length || 0) > 0 || (payload.remainingMatches?.length || 0) > 0) {
              const sanitizedNodes: Node[] = (payload.remainingNodes || []).map((n: any) => ({
                id: n.id,
                label: n.label,
                type: n.type,
                details: n.details,
                vaultMatch: true,
                vaultSource: file.name,
                metadata: n.metadata
              }));
              const sanitizedLinks: Link[] = (payload.remainingLinks || []).map((l: any) => ({
                source: l.source,
                target: l.target,
                label: l.label,
                isVault: true
              }));
              callbacks.onBatch(payload.remainingMatches || [], sanitizedNodes, sanitizedLinks);
            }

            callbacks.onComplete({
              fileName: file.name,
              totalRows: payload.totalRows,
              totalMatches: payload.totalMatches,
              totalEntities: payload.totalEntities,
              totalTriples: payload.totalTriples,
              durationSeconds: payload.durationSeconds,
              speedAvg: payload.speedAvg,
              engineUsed: 'Web Worker (Background Thread)'
            });

            if (this.worker) {
              this.worker.terminate();
              this.worker = null;
            }
            resolve();
          } else if (action === 'ERROR') {
            this.isRunning = false;
            callbacks.onError(payload);
            if (this.worker) {
              this.worker.terminate();
              this.worker = null;
            }
            reject(new Error(payload));
          } else if (action === 'ABORTED') {
            this.isRunning = false;
            resolve();
          }
        };

        this.worker.onerror = (err) => {
          this.isRunning = false;
          callbacks.onError(`Worker error: ${err.message}`);
          reject(err);
        };

        // Post start command to worker
        this.worker.postMessage({
          action: 'START',
          payload: {
            file,
            config: {
              query: config.query,
              useRegex: config.useRegex,
              enableOntology: config.enableOntology !== false,
              autoExtract: config.autoExtract !== false,
              chunkSizeBytes: config.chunkSizeBytes || 12 * 1024 * 1024,
              maxMatchesToRetain: config.maxMatchesToRetain || 2000
            }
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Progressive Chunk Stream Mode (Main thread with cooperative yielding)
   */
  private async runChunkStreamMode(file: File, config: IngestionConfig, callbacks: IngestionCallbacks): Promise<void> {
    const chunkSizeBytes = config.chunkSizeBytes || 10 * 1024 * 1024;
    const query = (config.query || '').trim();
    const queryLower = query.toLowerCase();
    const useRegex = !!config.useRegex;
    const enableOntology = config.enableOntology !== false;
    const autoExtract = config.autoExtract !== false;

    let queryRegex: RegExp | null = null;
    if (useRegex && query) {
      try {
        queryRegex = new RegExp(query, 'i');
      } catch (err: any) {
        callbacks.onError(`Regex tidak sah: ${err.message}`);
        return;
      }
    }

    let offset = 0;
    let rowsProcessed = 0;
    let matchesFound = 0;
    let entitiesExtracted = 0;
    let triplesGenerated = 0;
    let leftover = '';
    const startTime = Date.now();
    let lastTelemetryTime = startTime;

    const seenEntityKeys = new Set<string>();

    while (offset < file.size) {
      if (!this.isRunning || this.abortController?.signal.aborted) break;

      const chunk = file.slice(offset, offset + chunkSizeBytes);
      const text = await chunk.text();
      const content = leftover + text;
      const lines = content.split(/\r?\n/);
      leftover = lines.pop() || '';

      const matchBuffer: any[] = [];
      const nodeBuffer: Node[] = [];
      const linkBuffer: Link[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        rowsProcessed++;

        let isMatch = false;
        if (!query) isMatch = true;
        else if (useRegex && queryRegex) isMatch = queryRegex.test(line);
        else isMatch = line.toLowerCase().includes(queryLower);

        if (isMatch) {
          matchesFound++;
          if (matchBuffer.length < 500) {
            matchBuffer.push({
              id: `m_${rowsProcessed}`,
              line: line.length > 250 ? line.substring(0, 250) + '...' : line,
              rawLine: line,
              lineNumber: rowsProcessed,
              fileName: file.name
            });
          }

          if (enableOntology && autoExtract) {
            // Quick regex tests
            const emails = line.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) || [];
            const phones = line.match(/(?:\+?60|0)1[0-46-9][- ]?\d{7,8}\b/g) || line.match(/\b\+?[1-9]\d{8,13}\b/g) || [];
            const nrics = line.match(/\b\d{6}[- ]?\d{2}[- ]?\d{4}\b/g) || [];
            const ips = line.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g) || [];
            const eths = line.match(/\b0x[a-fA-F0-9]{40}\b/g) || [];

            const rowEntities: Node[] = [];

            for (const nric of nrics) {
              const digits = nric.replace(/\D/g, '');
              if (digits.length === 12 && !seenEntityKeys.has(`nric:${digits}`)) {
                seenEntityKeys.add(`nric:${digits}`);
                const ent: Node = {
                  id: `nric_${digits}`,
                  label: `${digits.substring(0, 6)}-${digits.substring(6, 8)}-${digits.substring(8)}`,
                  type: 'person',
                  details: `MyKad NRIC: ${digits}\nSumber: ${file.name} (Brs: ${rowsProcessed})`,
                  vaultMatch: true,
                  vaultSource: file.name
                };
                rowEntities.push(ent);
                nodeBuffer.push(ent);
                entitiesExtracted++;
              }
            }

            for (const phone of phones) {
              let clean = phone.replace(/[^\d+]/g, '');
              if (clean.startsWith('0')) clean = '+60' + clean.substring(1);
              if (!seenEntityKeys.has(`phone:${clean}`)) {
                seenEntityKeys.add(`phone:${clean}`);
                const ent: Node = {
                  id: `phone_${clean.replace('+', '')}`,
                  label: clean,
                  type: 'phone',
                  details: `No Tel: ${clean}\nSumber: ${file.name}`,
                  vaultMatch: true,
                  vaultSource: file.name
                };
                rowEntities.push(ent);
                nodeBuffer.push(ent);
                entitiesExtracted++;
              }
            }

            for (const email of emails) {
              const norm = email.toLowerCase().trim();
              if (!seenEntityKeys.has(`email:${norm}`)) {
                seenEntityKeys.add(`email:${norm}`);
                const ent: Node = {
                  id: `email_${norm.replace(/[^a-zA-Z0-9]/g, '_')}`,
                  label: norm,
                  type: 'email',
                  details: `Emel: ${norm}\nSumber: ${file.name}`,
                  vaultMatch: true,
                  vaultSource: file.name
                };
                rowEntities.push(ent);
                nodeBuffer.push(ent);
                entitiesExtracted++;
              }
            }

            for (const ip of ips) {
              if (ip !== '127.0.0.1' && !seenEntityKeys.has(`ip:${ip}`)) {
                seenEntityKeys.add(`ip:${ip}`);
                const ent: Node = {
                  id: `ip_${ip.replace(/\./g, '_')}`,
                  label: ip,
                  type: 'ip_address',
                  details: `IP: ${ip}\nSumber: ${file.name}`,
                  vaultMatch: true,
                  vaultSource: file.name
                };
                rowEntities.push(ent);
                nodeBuffer.push(ent);
                entitiesExtracted++;
              }
            }

            for (const eth of eths) {
              const norm = eth.toLowerCase();
              if (!seenEntityKeys.has(`crypto:${norm}`)) {
                seenEntityKeys.add(`crypto:${norm}`);
                const ent: Node = {
                  id: `eth_${norm.substring(2, 10)}`,
                  label: `${norm.substring(0, 6)}...${norm.substring(norm.length - 4)}`,
                  type: 'crypto_wallet',
                  details: `Crypto: ${norm}\nSumber: ${file.name}`,
                  vaultMatch: true,
                  vaultSource: file.name
                };
                rowEntities.push(ent);
                nodeBuffer.push(ent);
                entitiesExtracted++;
              }
            }

            // Create Semantic Triples between discovered entities
            if (rowEntities.length >= 2) {
              const root = rowEntities[0];
              for (let k = 1; k < rowEntities.length; k++) {
                const trg = rowEntities[k];
                let label = 'associated_with';
                if (trg.type === 'phone') label = 'uses_phone';
                else if (trg.type === 'email') label = 'communicates_via';
                else if (trg.type === 'ip_address') label = 'accessed_from_ip';
                else if (trg.type === 'crypto_wallet') label = 'transferred_crypto';

                linkBuffer.push({
                  source: root.id,
                  target: trg.id,
                  label,
                  isVault: true
                });
                triplesGenerated++;
              }
            }
          }
        }
      }

      offset += chunkSizeBytes;

      if (matchBuffer.length > 0 || nodeBuffer.length > 0) {
        callbacks.onBatch(matchBuffer, nodeBuffer, linkBuffer);
      }

      const now = Date.now();
      const elapsed = Math.max((now - startTime) / 1000, 0.05);
      const speed = Math.round(rowsProcessed / elapsed);
      const pct = Math.min(Math.round((offset / file.size) * 100), 100);

      callbacks.onTelemetry({
        fileName: file.name,
        bytesProcessed: Math.min(offset, file.size),
        totalBytes: file.size,
        percent: pct,
        rowsProcessed,
        matchesFound,
        entitiesExtracted,
        triplesGenerated,
        speedRowsPerSec: speed,
        memoryEstimateMb: Math.round(seenEntityKeys.size * 0.0004 + 30),
        activeEngine: 'Progressive Chunk Stream (Main Thread)',
        currentStage: offset >= file.size ? 'Selesai' : `Menghurai baris data (${speed.toLocaleString()} bps)...`
      });

      // Cooperative yield to keep UI interactive
      await new Promise(r => setTimeout(r, 0));
    }

    const totalDuration = Math.max((Date.now() - startTime) / 1000, 0.1);
    callbacks.onComplete({
      fileName: file.name,
      totalRows: rowsProcessed,
      totalMatches: matchesFound,
      totalEntities: entitiesExtracted,
      totalTriples: triplesGenerated,
      durationSeconds: totalDuration.toFixed(2),
      speedAvg: Math.round(rowsProcessed / totalDuration),
      engineUsed: 'Progressive Chunk Stream (Main Thread)'
    });
    this.isRunning = false;
  }
}
