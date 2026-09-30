import React, { useState } from 'react';
import { GraphData, Node, Link } from '../types';
import { calculateConfidence } from '../services/entityResolutionService';
import { FileText, Shield, Download, Printer, Copy, Check, Sparkles, X, Database, Eye, Share2, Layers, AlertTriangle } from 'lucide-react';

interface IntelligenceReportExporterProps {
  graph: GraphData;
  activeNode?: Node | null;
  onClose: () => void;
  onLog: (msg: string, type: 'info' | 'warning' | 'success' | 'error') => void;
}

export const IntelligenceReportExporter: React.FC<IntelligenceReportExporterProps> = ({
  graph,
  activeNode,
  onClose,
  onLog
}) => {
  const [copied, setCopied] = useState(false);
  const [reportType, setReportType] = useState<'EXECUTIVE' | 'FULL' | 'STIX'>('EXECUTIVE');
  const [classification, setClassification] = useState<'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET'>('CONFIDENTIAL');

  // Generate STIX 2.1 JSON format
  const generateSTIXJSON = () => {
    const stixObjects = graph.nodes.map(n => {
      const conf = calculateConfidence(n);
      return {
        type: 'identity',
        spec_version: '2.1',
        id: `identity--${n.id}`,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        name: n.label,
        identity_class: n.type === 'organization' ? 'organization' : 'individual',
        description: n.details || '',
        confidence: conf.score,
        labels: [n.type, conf.level],
        external_references: n.url ? [{ source_name: n.sourceType || 'OSINT', url: n.url }] : []
      };
    });

    const stixRelationships = graph.links.map((l, idx) => {
      const sourceId = typeof l.source === 'object' ? (l.source as Node).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as Node).id : l.target;
      return {
        type: 'relationship',
        spec_version: '2.1',
        id: `relationship--rel_${idx}_${Date.now()}`,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        relationship_type: l.label || 'related-to',
        source_ref: `identity--${sourceId}`,
        target_ref: `identity--${targetId}`
      };
    });

    return JSON.stringify({
      type: 'bundle',
      id: `bundle--rh_${Date.now()}`,
      objects: [...stixObjects, ...stixRelationships]
    }, null, 2);
  };

  // Generate Text Briefing
  const generateTextBriefing = () => {
    const totalNodes = graph.nodes.length;
    const highConfNodes = graph.nodes.filter(n => calculateConfidence(n).level === 'HIGH').length;
    const medConfNodes = graph.nodes.filter(n => calculateConfidence(n).level === 'MEDIUM').length;

    let text = `=================================================================\n`;
    text += `[${classification}] REDHORIZON OSINT INTELLIGENCE BRIEFING\n`;
    text += `DATE/TIME: ${new Date().toUTCString()}\n`;
    text += `PRIMARY TARGET: ${activeNode ? activeNode.label : 'ALL WORKSPACE TARGETS'}\n`;
    text += `ENTITIES IN GRAPH: ${totalNodes} | HIGH CONFIDENCE: ${highConfNodes} | MED: ${medConfNodes}\n`;
    text += `=================================================================\n\n`;

    text += `1. EXECUTIVE SUMMARY:\n`;
    text += `Analysis conducted on target graph containing ${totalNodes} nodes and ${graph.links.length} inter-relationships. `;
    if (activeNode) {
      text += `Target ${activeNode.label} (${activeNode.type}) is currently flagged under primary investigation.`;
    }
    text += `\n\n`;

    text += `2. ENTITY INVENTORY & CONFIDENCE RATING:\n`;
    graph.nodes.forEach((n, i) => {
      const conf = calculateConfidence(n);
      text += `[#${i + 1}] ${n.label.toUpperCase()} (${n.type.toUpperCase()})\n`;
      text += `    - Confidence Score: ${conf.score}% [${conf.level}]\n`;
      text += `    - Verification: ${n.verificationStatus || 'UNVERIFIED'}\n`;
      if (n.details) text += `    - Bio/Details: ${n.details}\n`;
      if (n.url) text += `    - URL: ${n.url}\n`;
      if (n.sources && n.sources.length > 0) {
        text += `    - Provenance Audit (${n.sources.length} sources):\n`;
        n.sources.forEach(s => {
          text += `        * ${s.sourceName} @ ${s.timestamp} ${s.url ? `(${s.url})` : ''}\n`;
        });
      }
      text += `\n`;
    });

    text += `3. CHAIN OF EVIDENCE & PROVENANCE AUDIT:\n`;
    text += `All digital artifacts were extracted via automated OSINT & Dorking APIs.\n`;
    text += `Verified CDN domains & Cross-referencing applied under FASA 1 Entity Resolution.\n`;
    text += `=================================================================\n`;
    text += `END OF BRIEFING - CLASSIFIED REPORT\n`;

    return text;
  };

  const currentOutputText = reportType === 'STIX' ? generateSTIXJSON() : generateTextBriefing();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentOutputText);
    setCopied(true);
    onLog('[FASA 3: REPORT EXPORTER] Intelligence Briefing copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `REDHORIZON_BRIEFING_${reportType}_${Date.now()}.${reportType === 'STIX' ? 'json' : 'txt'}`;
    const blob = new Blob([currentOutputText], { type: reportType === 'STIX' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onLog(`[FASA 3: REPORT EXPORTER] Downloaded report file "${filename}".`, 'success');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>REDHORIZON MILITARY BRIEFING REPORT</title>
            <style>
              body { font-family: monospace; background: #fff; color: #000; padding: 20px; font-size: 12px; }
              h1 { border-bottom: 2px solid #000; padding-bottom: 5px; }
              pre { whitespace: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <h1>[${classification}] REDHORIZON INTELLIGENCE REPORT</h1>
            <pre>${generateTextBriefing()}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0c10] border border-cyan-500/50 shadow-[0_0_30px_rgba(0,240,255,0.2)] w-full max-w-4xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-950/80 via-black to-cyan-950/80 px-5 py-4 border-b border-cyan-500/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400">
              <FileText size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                  FASA 3: INTELLIGENCE BRIEFING & AUDIT EXPORTER
                </span>
                <span className="text-xs font-mono text-gray-400">Chain of Evidence & STIX 2.1 Export</span>
              </div>
              <h2 className="text-lg font-black text-white tracking-wide mt-0.5">
                Penjana Laporan Taktikal & Audit Bukti
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTROLS BAR */}
        <div className="bg-gray-900/90 p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400 font-bold uppercase">Format Laporan:</span>
            <div className="flex bg-black/60 p-1 rounded border border-gray-800">
              <button
                onClick={() => setReportType('EXECUTIVE')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  reportType === 'EXECUTIVE' ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Ringkasan Eksekutif
              </button>
              <button
                onClick={() => setReportType('FULL')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  reportType === 'FULL' ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Audit Penuh (Full Chain)
              </button>
              <button
                onClick={() => setReportType('STIX')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  reportType === 'STIX' ? 'bg-purple-500 text-black shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                STIX 2.1 Standard JSON
              </button>
            </div>
          </div>

          {/* CLASSIFICATION SELECTOR */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400 font-bold uppercase">Klasifikasi:</span>
            <select
              value={classification}
              onChange={(e: any) => setClassification(e.target.value)}
              className="bg-black/80 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold py-1 px-2.5 rounded outline-none"
            >
              <option value="CONFIDENTIAL">CONFIDENTIAL</option>
              <option value="SECRET">SECRET</option>
              <option value="TOP_SECRET">TOP SECRET / OSINT ONLY</option>
            </select>
          </div>
        </div>

        {/* REPORT CONTENT VIEWPORT */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#050608] custom-scrollbar">
          <div className="relative">
            <pre className="text-xs font-mono text-cyan-300 leading-relaxed whitespace-pre-wrap bg-black/80 p-4 rounded-lg border border-cyan-500/30 selection:bg-cyan-500 selection:text-black">
              {currentOutputText}
            </pre>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-black/95 p-4 border-t border-gray-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <Shield size={16} className="text-cyan-400" />
            <span>Format Terpiawai STIX / MIL-STD OSINT Export</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Salin Laporan'}
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={14} /> Cetak / Save PDF
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all cursor-pointer"
            >
              <Download size={14} /> Muat Turun Fail
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
