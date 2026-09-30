import React, { useState, useMemo } from 'react';
import { 
  Database, Network, Download, Plus, Trash2, Search, Filter, 
  X, CheckCircle2, RefreshCw, FileText, Share2, Sparkles, Code, Copy, Check 
} from 'lucide-react';
import { GraphData, Node, Link, SemanticTriple } from '../types';
import { TacticalModalWrapper } from './TacticalModalWrapper';

interface SemanticTriplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphData: GraphData;
  onAddNodeLinkFromTriple?: (subject: string, predicate: string, object: string) => void;
  onSelectNode?: (nodeId: string) => void;
}

export const SemanticTriplesModal: React.FC<SemanticTriplesModalProps> = ({
  isOpen,
  onClose,
  graphData,
  onAddNodeLinkFromTriple,
  onSelectNode,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [predicateFilter, setPredicateFilter] = useState<string>('ALL');
  const [exportFormat, setExportFormat] = useState<'jsonld' | 'ntriples' | 'turtle' | 'csv'>('jsonld');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'triples' | 'editor' | 'sparql' | 'export'>('triples');

  // Form state for adding custom triple
  const [newSubject, setNewSubject] = useState('');
  const [newPredicate, setNewPredicate] = useState('associated_with');
  const [newObject, setNewObject] = useState('');
  const [newConfidence, setNewConfidence] = useState(85);
  const [newProvenance, setNewProvenance] = useState('Manual OSINT Analyst');

  // Custom triples state
  const [customTriples, setCustomTriples] = useState<SemanticTriple[]>([]);

  // Convert graph data into standardized triples
  const graphTriples = useMemo(() => {
    const triples: SemanticTriple[] = [];
    const nodeMap = new Map<string, Node>();
    
    graphData.nodes.forEach(n => nodeMap.set(n.id, n));

    // Convert Links to Triples
    graphData.links.forEach((l, idx) => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      const srcNode = nodeMap.get(srcId);
      const tgtNode = nodeMap.get(tgtId);

      triples.push({
        id: `link-triple-${idx}`,
        subjectId: srcId,
        subjectLabel: srcNode?.label || srcId,
        predicate: l.label ? l.label.toLowerCase().replace(/\s+/g, '_') : 'connected_to',
        objectId: tgtId,
        objectLabel: tgtNode?.label || tgtId,
        isLiteral: false,
        confidence: srcNode?.confidenceScore || 80,
        timestamp: l.timestamp || l.eventDate || new Date().toISOString(),
        provenance: 'Graph Relationship'
      });
    });

    // Convert Node Attributes (Details, Types, Aliases, Vault sources) to Literal Triples
    graphData.nodes.forEach(n => {
      // Type triple
      triples.push({
        id: `node-type-${n.id}`,
        subjectId: n.id,
        subjectLabel: n.label,
        predicate: 'has_type',
        objectId: n.type,
        objectLabel: n.type.toUpperCase(),
        isLiteral: true,
        confidence: 100,
        provenance: 'Entity Schema'
      });

      // Brand triple
      if (n.brand) {
        triples.push({
          id: `node-brand-${n.id}`,
          subjectId: n.id,
          subjectLabel: n.label,
          predicate: 'classified_as',
          objectId: n.brand,
          objectLabel: n.brand,
          isLiteral: true,
          confidence: 90,
          provenance: 'Classification'
        });
      }

      // Vault Match triple
      if (n.vaultMatch && n.vaultSource) {
        triples.push({
          id: `node-vault-${n.id}`,
          subjectId: n.id,
          subjectLabel: n.label,
          predicate: 'matched_in_vault',
          objectId: n.vaultSource,
          objectLabel: n.vaultSource,
          isLiteral: true,
          confidence: 95,
          provenance: 'Forensic Vault DB'
        });
      }

      // Aliases triples
      if (n.aliases && n.aliases.length > 0) {
        n.aliases.forEach((alias, aIdx) => {
          triples.push({
            id: `node-alias-${n.id}-${aIdx}`,
            subjectId: n.id,
            subjectLabel: n.label,
            predicate: 'has_alias',
            objectId: alias,
            objectLabel: alias,
            isLiteral: true,
            confidence: 85,
            provenance: 'Social Recon'
          });
        });
      }
    });

    return [...triples, ...customTriples];
  }, [graphData, customTriples]);

  // Unique predicates for filtering
  const availablePredicates = useMemo(() => {
    return Array.from(new Set(graphTriples.map(t => t.predicate)));
  }, [graphTriples]);

  // Filtered triples
  const filteredTriples = useMemo(() => {
    return graphTriples.filter(t => {
      const matchSearch = searchTerm === '' || 
        t.subjectLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.predicate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.objectLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.provenance && t.provenance.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchPredicate = predicateFilter === 'ALL' || t.predicate === predicateFilter;
      
      return matchSearch && matchPredicate;
    });
  }, [graphTriples, searchTerm, predicateFilter]);

  // SPARQL / Query State
  const [sparqlQuery, setSparqlQuery] = useState('SELECT ?subject ?predicate ?object WHERE {\n  ?subject ?predicate ?object .\n  FILTER (?predicate = "connected_to" || ?predicate = "has_type")\n}');
  const [queryResults, setQueryResults] = useState<SemanticTriple[] | null>(null);

  const handleExecuteQuery = () => {
    let lowerQuery = sparqlQuery.toLowerCase();
    
    // Extract search terms from simple SPARQL query or keywords
    let filterTerm = '';
    if (lowerQuery.includes('filter')) {
      const filterMatch = lowerQuery.match(/filter\s*\(\s*\?(?:predicate|s|p|o)\s*=\s*"([^"]+)"/i);
      if (filterMatch) filterTerm = filterMatch[1].toLowerCase();
    }

    if (filterTerm) {
      const res = graphTriples.filter(t => t.predicate.toLowerCase().includes(filterTerm) || t.subjectLabel.toLowerCase().includes(filterTerm) || t.objectLabel.toLowerCase().includes(filterTerm));
      setQueryResults(res);
    } else {
      setQueryResults(filteredTriples);
    }
  };

  // Export string generators
  const exportDataString = useMemo(() => {
    if (exportFormat === 'jsonld') {
      const jsonLd = {
        "@context": {
          "@vocab": "https://redhorizon.osint/ontology#",
          "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
          "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
          "xsd": "http://www.w3.org/2001/XMLSchema#",
          "subject": "@id",
          "predicate": "rdfs:label",
          "object": "rdf:value",
          "confidence": "xsd:integer",
          "provenance": "xsd:string"
        },
        "@graph": filteredTriples.map(t => ({
          "@id": `https://redhorizon.osint/entity/${encodeURIComponent(t.subjectId)}`,
          "label": t.subjectLabel,
          [t.predicate]: t.isLiteral ? t.objectLabel : {
            "@id": `https://redhorizon.osint/entity/${encodeURIComponent(t.objectId)}`,
            "label": t.objectLabel
          },
          "meta:confidence": t.confidence || 80,
          "meta:provenance": t.provenance || "OSINT System"
        }))
      };
      return JSON.stringify(jsonLd, null, 2);
    } 
    
    if (exportFormat === 'ntriples') {
      return filteredTriples.map(t => {
        const sub = `<https://redhorizon.osint/entity/${encodeURIComponent(t.subjectId)}>`;
        const pred = `<https://redhorizon.osint/pred/${encodeURIComponent(t.predicate)}>`;
        const obj = t.isLiteral 
          ? `"${t.objectLabel.replace(/"/g, '\\"')}"^^<http://www.w3.org/2001/XMLSchema#string>` 
          : `<https://redhorizon.osint/entity/${encodeURIComponent(t.objectId)}>`;
        return `${sub} ${pred} ${obj} .`;
      }).join('\n');
    }

    if (exportFormat === 'turtle') {
      let ttl = `@prefix osint: <https://redhorizon.osint/ontology#> .\n`;
      ttl += `@prefix entity: <https://redhorizon.osint/entity/> .\n`;
      ttl += `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n`;
      
      filteredTriples.forEach(t => {
        const objStr = t.isLiteral ? `"${t.objectLabel}"` : `entity:${encodeURIComponent(t.objectId)}`;
        ttl += `entity:${encodeURIComponent(t.subjectId)} osint:${t.predicate} ${objStr} .\n`;
      });
      return ttl;
    }

    if (exportFormat === 'csv') {
      let csv = `Subject_ID,Subject_Label,Predicate,Object_ID,Object_Label,Is_Literal,Confidence,Provenance,Timestamp\n`;
      filteredTriples.forEach(t => {
        csv += `"${t.subjectId}","${t.subjectLabel.replace(/"/g, '""')}","${t.predicate}","${t.objectId}","${t.objectLabel.replace(/"/g, '""')}",${t.isLiteral},${t.confidence || 80},"${t.provenance || ''}","${t.timestamp || ''}"\n`;
      });
      return csv;
    }

    return '';
  }, [filteredTriples, exportFormat]);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportDataString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = exportFormat === 'jsonld' ? 'json' : exportFormat === 'ntriples' ? 'nt' : exportFormat === 'turtle' ? 'ttl' : 'csv';
    const mime = exportFormat === 'csv' ? 'text/csv' : 'application/text';
    const blob = new Blob([exportDataString], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redhorizon_semantic_triples_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddCustomTriple = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newObject.trim()) return;

    const newT: SemanticTriple = {
      id: `custom-triple-${Date.now()}`,
      subjectId: newSubject.toLowerCase().replace(/\s+/g, '_'),
      subjectLabel: newSubject.trim(),
      predicate: newPredicate.trim().toLowerCase().replace(/\s+/g, '_'),
      objectId: newObject.toLowerCase().replace(/\s+/g, '_'),
      objectLabel: newObject.trim(),
      isLiteral: true,
      confidence: newConfidence,
      provenance: newProvenance,
      timestamp: new Date().toISOString()
    };

    setCustomTriples(prev => [newT, ...prev]);

    if (onAddNodeLinkFromTriple) {
      onAddNodeLinkFromTriple(newSubject, newPredicate, newObject);
    }

    setNewSubject('');
    setNewObject('');
  };

  if (!isOpen) return null;

  return (
    <TacticalModalWrapper
      modalId="semantic-triples"
      title="PENYERAGAMAN TRIPLES SEMANTIK (RDF/SPO ENGINE)"
      isOpen={isOpen}
      isMinimized={isMinimized}
      onClose={onClose}
      onMinimizeToggle={() => setIsMinimized(!isMinimized)}
      icon={<Database className="text-cyan-400" size={18} />}
    >
      <div className="flex flex-col h-[75vh] max-h-[700px] text-xs font-mono text-cyan-100">
        
        {/* TOP TAB NAVIGATION */}
        <div className="flex items-center gap-1 border-b border-cyan-500/20 pb-2 mb-3 shrink-0 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('triples')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-all cursor-pointer ${
              activeTab === 'triples'
                ? 'bg-cyan-950 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Network size={14} />
            <span>Senarai Triples ({graphTriples.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-cyan-950 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Plus size={14} />
            <span>Cipta Triple Manual</span>
          </button>

          <button
            onClick={() => setActiveTab('sparql')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-all cursor-pointer ${
              activeTab === 'sparql'
                ? 'bg-cyan-950 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Code size={14} />
            <span>SPARQL Query</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'bg-cyan-950 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Share2 size={14} />
            <span>Eksport Data (JSON-LD / N-Triples)</span>
          </button>
        </div>

        {/* TAB 1: TRIPLES LIST */}
        {activeTab === 'triples' && (
          <div className="flex-1 flex flex-col min-h-0 gap-3">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 bg-zinc-900/80 p-2 rounded border border-white/10">
              <div className="flex-1 relative min-w-[200px]">
                <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Cari Subjek, Predikat, atau Objek..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded pl-8 pr-3 py-1 text-xs text-cyan-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Filter size={13} className="text-cyan-400" />
                <span className="text-[10px] uppercase text-zinc-400">Predikat:</span>
                <select
                  value={predicateFilter}
                  onChange={(e) => setPredicateFilter(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded px-2 py-1 text-xs text-cyan-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Semua Predikat ({availablePredicates.length})</option>
                  {availablePredicates.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="text-[10px] text-cyan-400/80 ml-auto font-mono">
                Menampilkan <span className="text-white font-bold">{filteredTriples.length}</span> daripada {graphTriples.length} Triples
              </div>
            </div>

            {/* Triples Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/10 rounded bg-black/40">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-950 sticky top-0 border-b border-white/10 text-[10px] uppercase tracking-wider text-cyan-400 z-10">
                  <tr>
                    <th className="p-2 border-r border-white/5">Subjek (Subject)</th>
                    <th className="p-2 border-r border-white/5">Predikat (Predicate)</th>
                    <th className="p-2 border-r border-white/5">Objek (Object)</th>
                    <th className="p-2 border-r border-white/5 w-20 text-center">Keyakinan</th>
                    <th className="p-2 w-32">Sumber / Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px]">
                  {filteredTriples.map((t) => (
                    <tr 
                      key={t.id} 
                      className="hover:bg-cyan-950/30 transition-colors group cursor-pointer"
                      onClick={() => onSelectNode && onSelectNode(t.subjectId)}
                    >
                      <td className="p-2 font-bold text-white border-r border-white/5">
                        <span className="text-cyan-300 hover:underline">{t.subjectLabel}</span>
                        <span className="block text-[9px] text-zinc-500 font-mono font-normal">id: {t.subjectId}</span>
                      </td>

                      <td className="p-2 text-emerald-400 font-semibold border-r border-white/5 font-mono">
                        <span className="bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[10px]">
                          :{t.predicate}
                        </span>
                      </td>

                      <td className="p-2 border-r border-white/5">
                        {t.isLiteral ? (
                          <span className="text-amber-300 font-mono text-[10px]">"{t.objectLabel}"</span>
                        ) : (
                          <span className="text-cyan-300 hover:underline font-bold" onClick={(e) => { e.stopPropagation(); onSelectNode && onSelectNode(t.objectId); }}>
                            {t.objectLabel}
                          </span>
                        )}
                      </td>

                      <td className="p-2 text-center border-r border-white/5 font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          (t.confidence || 0) >= 80 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                        }`}>
                          {t.confidence || 80}%
                        </span>
                      </td>

                      <td className="p-2 text-zinc-400 text-[10px] truncate max-w-[120px]">
                        {t.provenance || 'Graph Linked'}
                      </td>
                    </tr>
                  ))}

                  {filteredTriples.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500">
                        Tiada triple semantik ditemui sepadan dengan carian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL TRIPLE EDITOR */}
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col gap-4 p-3 bg-zinc-950/60 rounded border border-white/10 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2">
              <Plus className="text-emerald-400" size={16} />
              <span className="font-bold text-sm text-white">Tambah Hubungan Triples Baru</span>
            </div>

            <form onSubmit={handleAddCustomTriple} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Subject */}
                <div>
                  <label className="block text-[10px] uppercase text-cyan-400 mb-1">Subjek (Entiti Asal)</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Mejar Ahmad / 192.168.1.1"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Predicate */}
                <div>
                  <label className="block text-[10px] uppercase text-cyan-400 mb-1">Predikat (Aksi / Hubungan)</label>
                  <select
                    value={newPredicate}
                    onChange={(e) => setNewPredicate(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded px-3 py-1.5 text-xs text-emerald-300 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="associated_with">associated_with (Berhubung Dengan)</option>
                    <option value="member_of">member_of (Ahli Kumpulan)</option>
                    <option value="owns">owns (Memiliki Aset/Domain)</option>
                    <option value="communicates_with">communicates_with (Berkomunikasi)</option>
                    <option value="located_in">located_in (Lokasi)</option>
                    <option value="operates_server">operates_server (Mengendali Pelayan)</option>
                    <option value="has_alias">has_alias (Kata Samaran)</option>
                    <option value="suspected_in">suspected_in (Disyaki Dalam)</option>
                  </select>
                </div>

                {/* Object */}
                <div>
                  <label className="block text-[10px] uppercase text-cyan-400 mb-1">Objek (Entiti Sasaran / Nilai)</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Syarikat Alpha / +6012345678"
                    value={newObject}
                    onChange={(e) => setNewObject(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Confidence Slider */}
                <div>
                  <label className="block text-[10px] uppercase text-cyan-400 mb-1">
                    Skor Keyakinan OSINT: <span className="text-white font-bold">{newConfidence}%</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={newConfidence}
                    onChange={(e) => setNewConfidence(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Provenance */}
                <div>
                  <label className="block text-[10px] uppercase text-cyan-400 mb-1">Sumber Risikan (Provenance)</label>
                  <input
                    type="text"
                    placeholder="cth: Laporan Operasi OSINT / Shodan Recon"
                    value={newProvenance}
                    onChange={(e) => setNewProvenance(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-900 to-cyan-900 hover:from-emerald-800 hover:to-cyan-800 text-white font-bold py-2 px-4 rounded border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Simpan & Integrasi Ke Graf Interaktif</span>
              </button>
            </form>

            {/* Custom Triples Summary */}
            {customTriples.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-3">
                <span className="text-xs font-bold text-cyan-300 block mb-2">
                  Triples Manual Ditambah ({customTriples.length})
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {customTriples.map((ct) => (
                    <div key={ct.id} className="flex items-center justify-between bg-black/60 p-2 rounded border border-white/5 text-[11px]">
                      <div>
                        <span className="font-bold text-white">{ct.subjectLabel}</span>{' '}
                        <span className="text-emerald-400 font-mono">:{ct.predicate}</span>{' '}
                        <span className="text-cyan-300">{ct.objectLabel}</span>
                      </div>
                      <button
                        onClick={() => setCustomTriples(prev => prev.filter(x => x.id !== ct.id))}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Padam Triple"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SPARQL QUERY ENGINE */}
        {activeTab === 'sparql' && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="bg-zinc-950 p-2 rounded border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Code size={14} className="text-amber-400" />
                  Pengenalan Enjin Kueri SPARQL / RDF
                </span>
                <button
                  onClick={handleExecuteQuery}
                  className="flex items-center gap-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                >
                  <Sparkles size={13} />
                  <span>Jalankan Kueri</span>
                </button>
              </div>

              <textarea
                value={sparqlQuery}
                onChange={(e) => setSparqlQuery(e.target.value)}
                rows={4}
                className="w-full bg-black/80 font-mono text-emerald-400 text-xs p-2.5 rounded border border-white/10 focus:outline-none focus:border-cyan-500 leading-relaxed"
              />
            </div>

            {/* Query Results */}
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/10 rounded bg-black/40 p-2">
              <span className="text-[10px] uppercase text-zinc-400 font-mono block mb-2">
                Hasil Kueri ({queryResults ? queryResults.length : filteredTriples.length} Padanan)
              </span>

              <div className="space-y-1">
                {(queryResults || filteredTriples).map((res) => (
                  <div key={res.id} className="p-2 bg-zinc-900/60 rounded border border-white/5 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-cyan-300 font-bold">{res.subjectLabel}</span>{' '}
                      <span className="text-amber-400 font-mono font-semibold">[{res.predicate}]</span>{' '}
                      <span className="text-white">{res.objectLabel}</span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500">{res.provenance}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EXPORT triples */}
        {activeTab === 'export' && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-zinc-900/80 p-2 rounded border border-white/10">
              <div className="flex items-center gap-2">
                <Share2 size={14} className="text-cyan-400" />
                <span className="font-bold text-xs text-white">Format Eksport Semantik:</span>
                <div className="flex gap-1">
                  {(['jsonld', 'ntriples', 'turtle', 'csv'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        exportFormat === fmt
                          ? 'bg-cyan-900 text-cyan-200 border border-cyan-400'
                          : 'bg-black/60 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1 rounded border border-white/20 text-xs transition-all cursor-pointer"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'Tercopy!' : 'Salin Text'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 bg-gradient-to-r from-cyan-950 to-emerald-950 hover:from-cyan-900 hover:to-emerald-900 text-cyan-300 px-3 py-1 rounded border border-cyan-500/50 text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Muat Turun Fail</span>
                </button>
              </div>
            </div>

            <div className="flex-1 border border-white/10 rounded bg-black/90 p-3 overflow-y-auto custom-scrollbar font-mono text-[11px] text-emerald-400 whitespace-pre leading-relaxed select-text">
              {exportDataString}
            </div>
          </div>
        )}

      </div>
    </TacticalModalWrapper>
  );
};

export default SemanticTriplesModal;
