import React, { useState } from 'react';
import { X, ShieldAlert, Key, Globe, Search, Copy, Check, ExternalLink, Cloud, FileText, AlertTriangle, RefreshCw, Lock } from 'lucide-react';
import { SecretLeakMatch, DorkItem, CloudReconResult, ExposureRiskScoreCard } from '../../server/claudeOsintTradecraft';

interface TradecraftReconModalProps {
  onClose: () => void;
  onLog: (msg: string, type?: string) => void;
  initialTarget?: string;
}

export const TradecraftReconModal: React.FC<TradecraftReconModalProps> = ({ onClose, onLog, initialTarget = '' }) => {
  const [activeTab, setActiveTab] = useState<'DORKS' | 'SECRET_SCAN' | 'CLOUD_RECON'>('DORKS');
  const [target, setTarget] = useState(initialTarget);
  
  // Tab 1: Dorks State
  const [dorks, setDorks] = useState<DorkItem[]>([]);
  const [isGeneratingDorks, setIsGeneratingDorks] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Tab 2: Secret Scan State
  const [scanText, setScanText] = useState('');
  const [secretResults, setSecretResults] = useState<SecretLeakMatch[]>([]);
  const [isScanningSecrets, setIsScanningSecrets] = useState(false);

  // Tab 3: Cloud Recon State
  const [cloudResult, setCloudResult] = useState<{
    cloudData?: CloudReconResult;
    secretLeaks?: SecretLeakMatch[];
    riskCard?: ExposureRiskScoreCard;
  } | null>(null);
  const [isScanningCloud, setIsScanningCloud] = useState(false);

  // Auto generate dorks if target provided
  React.useEffect(() => {
    if (initialTarget && dorks.length === 0) {
      handleGenerateDorks();
    }
  }, [initialTarget]);

  const handleGenerateDorks = async () => {
    if (!target.trim()) {
      onLog('Sila masukkan domain atau nama sasaran.', 'warning');
      return;
    }
    setIsGeneratingDorks(true);
    try {
      const res = await fetch('/api/osint/dorks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim() })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.dorks)) {
        setDorks(data.dorks);
        onLog(`Berjaya menjana ${data.dorks.length} preset dorks untuk "${target}".`, 'success');
      } else {
        onLog(data.error || 'Gagal menjana dorks.', 'error');
      }
    } catch (e: any) {
      onLog(`Ralat sambungan: ${e.message}`, 'error');
    } finally {
      setIsGeneratingDorks(false);
    }
  };

  const handleScanSecrets = async () => {
    if (!scanText.trim()) {
      onLog('Sila masukkan teks atau kandungan kod untuk disaring.', 'warning');
      return;
    }
    setIsScanningSecrets(true);
    try {
      const res = await fetch('/api/osint/scan-secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: scanText, locationHint: `Input Pengguna (${target || 'Manual'})` })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.matches)) {
        setSecretResults(data.matches);
        if (data.matches.length > 0) {
          onLog(`AMARAN KRITIKAL: Dikesan ${data.matches.length} rahsia/kunci akses terbocor!`, 'error');
        } else {
          onLog('Tiada kebocoran kunci rahsia/API dikesan dalam teks.', 'success');
        }
      }
    } catch (e: any) {
      onLog(`Ralat saringan rahsia: ${e.message}`, 'error');
    } finally {
      setIsScanningSecrets(false);
    }
  };

  const handleRunCloudRecon = async () => {
    if (!target.trim()) {
      onLog('Sila masukkan domain sasaran (contoh: target.com).', 'warning');
      return;
    }
    setIsScanningCloud(true);
    try {
      const res = await fetch('/api/osint/cloud-recon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDomain: target.trim(), textContent: scanText })
      });
      const data = await res.json();
      if (data.success) {
        setCloudResult(data);
        onLog(`Imbasan Cloud Recon & Skor Risiko selesai untuk "${target}". Skor: ${data.riskCard?.totalScore}/100`, 'success');
      } else {
        onLog(data.error || 'Gagal imbasan cloud recon.', 'error');
      }
    } catch (e: any) {
      onLog(`Ralat cloud recon: ${e.message}`, 'error');
    } finally {
      setIsScanningCloud(false);
    }
  };

  const copyDork = (dorkQuery: string, idx: number) => {
    navigator.clipboard.writeText(dorkQuery);
    setCopiedIndex(idx);
    onLog('Dork disalin ke papan keratan', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#090a0f] border border-cyan-500/30 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-zinc-100 font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-zinc-950 to-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wider text-cyan-400 uppercase flex items-center gap-2">
                Claude-OSINT Tradecraft Engine
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/40">
                  v2.9.1 RECON
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Penyaring Kebocoran Rahsia, Preset Dorks, Imbasan Baldi Awan & Penilaian Skor Risiko Kerentanan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Input Bar */}
        <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-950/80 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full relative">
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Masukkan Domain / Pengguna / Organisasi Sasaran (contoh: target.com)..."
              className="w-full px-4 py-2 bg-zinc-900/90 border border-zinc-700/80 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <button
            onClick={() => {
              if (activeTab === 'DORKS') handleGenerateDorks();
              else if (activeTab === 'CLOUD_RECON') handleRunCloudRecon();
              else handleScanSecrets();
            }}
            className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} className={(isGeneratingDorks || isScanningCloud || isScanningSecrets) ? 'animate-spin' : ''} />
            Jana & Imbas Sasaran
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 px-6">
          <button
            onClick={() => setActiveTab('DORKS')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'DORKS'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search size={14} />
            Preset Dorks Engine ({dorks.length})
          </button>

          <button
            onClick={() => setActiveTab('SECRET_SCAN')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'SECRET_SCAN'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Key size={14} />
            Secret-RegEx Scanner {secretResults.length > 0 && `(${secretResults.length} Ralat)`}
          </button>

          <button
            onClick={() => setActiveTab('CLOUD_RECON')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'CLOUD_RECON'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cloud size={14} />
            Cloud & Domain Risk Recon
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-950/30">
          
          {/* TAB 1: DORKS ENGINE */}
          {activeTab === 'DORKS' && (
            <div className="space-y-4">
              {dorks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                  <Search size={36} className="mx-auto text-zinc-600 mb-3" />
                  <p className="text-sm font-bold text-zinc-300">Tiada Dorks Dijana Lagi</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                    Masukkan nama domain atau organisasi sasaran di atas dan tekan <strong>Jana & Imbas Sasaran</strong> untuk menghasilkan dorks Google, GitHub, Shodan & Censys.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dorks.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/40 rounded-xl transition-all space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded font-mono ${
                          item.category === 'GOOGLE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          item.category === 'GITHUB' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          item.category === 'SHODAN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {item.category}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.threatLevel === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' :
                          item.threatLevel === 'HIGH' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {item.threatLevel}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-zinc-100">{item.title}</h4>
                      <p className="text-[11px] text-zinc-400">{item.purpose}</p>

                      <div className="p-2.5 bg-black rounded-lg border border-zinc-800 font-mono text-[11px] text-cyan-300 break-all select-all flex items-center justify-between gap-2">
                        <span className="truncate">{item.dorkQuery}</span>
                        <button
                          onClick={() => copyDork(item.dorkQuery, idx)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white shrink-0"
                          title="Salin Dork"
                        >
                          {copiedIndex === idx ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>

                      <a
                        href={item.searchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 pt-1"
                      >
                        Buka Carian Langsung <ExternalLink size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SECRET REGEX SCANNER */}
          {activeTab === 'SECRET_SCAN' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Saringan Teks / Kod Sumber Bagi Kebocoran Kunci Rahsia</span>
                  <span className="text-zinc-500 font-normal normal-case">80+ Corak RegEx Berpresisi Tinggi</span>
                </label>
                <textarea
                  value={scanText}
                  onChange={(e) => setScanText(e.target.value)}
                  placeholder="Tampal teks kandungan, kod sumber HTML/JS, fail .env, atau data HTTP header di sini untuk disaring..."
                  rows={6}
                  className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleScanSecrets}
                  disabled={isScanningSecrets || !scanText.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2"
                >
                  <Key size={14} /> Imbas Kebocoran Rahsia Sekarang
                </button>
              </div>

              {secretResults.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={14} />
                    Dikesan {secretResults.length} Kebocoran Kunci Rahsia
                  </h3>
                  <div className="space-y-2">
                    {secretResults.map((sec, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-300">{sec.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              sec.severity === 'CRITICAL' ? 'bg-red-500 text-black' : 'bg-amber-500 text-black'
                            }`}>
                              {sec.severity}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-zinc-400">
                            Potongan Terbocor: <span className="text-amber-200 font-bold">{sec.matchedSnippet}</span>
                          </p>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">{sec.location}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLOUD & DOMAIN RECON */}
          {activeTab === 'CLOUD_RECON' && (
            <div className="space-y-4">
              {!cloudResult ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                  <Cloud size={36} className="mx-auto text-zinc-600 mb-3" />
                  <p className="text-sm font-bold text-zinc-300">Sedia Imbas Awan & Keselamatan Domain</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                    Imbasan ini akan menguji pendedahan AWS S3 Buckets, pangkalan data Firebase Realtime DB, serta rekod SPF & DMARC sasaran secara automatik.
                  </p>
                  <button
                    onClick={handleRunCloudRecon}
                    disabled={isScanningCloud || !target.trim()}
                    className="mt-4 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                  >
                    Mulakan Imbasan Cloud Recon
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Risk Score Header */}
                  {cloudResult.riskCard && (
                    <div className="p-4 bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-950 border border-purple-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">
                          Skor Risiko Pendedahan OSINT
                        </span>
                        <h3 className="text-xl font-black text-white">{cloudResult.riskCard.target}</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Penilaian risiko berasaskan metodologi <em>Claude-OSINT Exposure Matrix</em>
                        </p>
                      </div>

                      <div className="text-center sm:text-right">
                        <div className="text-3xl font-black text-purple-400 font-mono">
                          {cloudResult.riskCard.totalScore} <span className="text-xs text-zinc-500 font-normal">/ 100</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block mt-1 ${
                          cloudResult.riskCard.riskRating === 'CRITICAL' ? 'bg-red-500 text-black' :
                          cloudResult.riskCard.riskRating === 'HIGH' ? 'bg-amber-500 text-black' :
                          'bg-emerald-500 text-black'
                        }`}>
                          PENILAIAN: {cloudResult.riskCard.riskRating}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* DNS Security */}
                  {cloudResult.cloudData?.dnsSecurity && (
                    <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                        <Lock size={14} className="text-cyan-400" /> Keselamatan Domain & E-mel (DNS)
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {cloudResult.cloudData.dnsSecurity.riskAssessment}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 font-mono text-[11px]">
                        <div className="p-2 bg-black rounded border border-zinc-800">
                          <span className="text-zinc-500 block">REKOD SPF:</span>
                          <span className={cloudResult.cloudData.dnsSecurity.hasSpf ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                            {cloudResult.cloudData.dnsSecurity.spfRecord || 'TIADA REKOD SPF'}
                          </span>
                        </div>
                        <div className="p-2 bg-black rounded border border-zinc-800">
                          <span className="text-zinc-500 block">REKOD DMARC:</span>
                          <span className={cloudResult.cloudData.dnsSecurity.hasDmarc ? 'text-emerald-400' : 'text-amber-400 font-bold'}>
                            {cloudResult.cloudData.dnsSecurity.dmarcRecord || 'TIADA REKOD DMARC'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* S3 Buckets */}
                  {cloudResult.cloudData?.s3Buckets && cloudResult.cloudData.s3Buckets.length > 0 && (
                    <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                        <Cloud size={14} className="text-purple-400" /> Keputusan Baldi AWS S3
                      </h4>
                      <div className="space-y-2">
                        {cloudResult.cloudData.s3Buckets.map((b, i) => (
                          <div key={i} className="p-2.5 bg-black rounded-lg border border-zinc-800 flex items-center justify-between text-xs font-mono">
                            <span className="text-zinc-300">{b.bucketName}.s3.amazonaws.com</span>
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              b.status === 'PUBLIC_EXPOSED' ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {cloudResult.riskCard?.recommendations && (
                    <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                        Langkah Mitigasi & Cadangan Keselamatan
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-zinc-300">
                        {cloudResult.riskCard.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex justify-between items-center text-xs text-zinc-500">
          <span>Perdagangan OSINT elementalsouls/Claude-OSINT dikuasai enjin Red Horizon</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-bold uppercase transition-all"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
