import React, { useState } from 'react';
import { Link2, X, Search, Zap, Save, User, Hash, Lock, LocateFixed, Database, ExternalLink } from 'lucide-react';

interface ShareTraceModalProps {
  onClose: () => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
  onUpdateGraph: (data: any) => void;
}

const ShareTraceModal: React.FC<ShareTraceModalProps> = ({ onClose, onLog, onUpdateGraph }) => {
  const [url, setUrl] = useState('');
  const [manualJson, setManualJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [useCliMode, setUseCliMode] = useState(false);
  const [useWpwMode, setUseWpwMode] = useState(false);
  const [useManualMode, setUseManualMode] = useState(false);
  const [results, setResults] = useState<{ 
    platform: string; 
    extractedData: Record<string, string>; 
    rawParams: Record<string, string>;
    profileData?: {
      avatarUrl?: string;
      username?: string;
      os?: string;
      followers?: string;
      created_at?: string;
      app_version?: string;
    };
  } | null>(null);

  const analyzeManualJson = () => {
    try {
      const data = JSON.parse(manualJson);
      onLog('JSON Manual berjaya diproses', 'success');

      let platformResult = data.platform || 'OSINT Manual (JSON)';
      let extracted: Record<string, string> = { "Jejak OSINT": "Tampalan JSON" };
      let wpwProfile: any = {};
      
      // Parse flexible fields for OSINT / WPW output
      wpwProfile.username = data.username || data.name || data.title || data.author || data.user || "Identiti JSON";
      wpwProfile.avatarUrl = data.avatarUrl || data.avatar || data.image || data.profile_pic || data.avatar_url || data.profile_image_url || data.pic || undefined;
      wpwProfile.os = data.os || data.description || data.bio || data.details || data.desc || "Data JSON Manual Diekstrak";
      wpwProfile.followers = data.followers || data.followerCount || undefined;
      wpwProfile.created_at = new Date().toISOString();

      // Fallback searches for avatar
      if (!wpwProfile.avatarUrl && (data.extractedData || data.data || data.osint)) {
          const extractSource = data.extractedData || data.data || data.osint;
          wpwProfile.avatarUrl = extractSource.avatarUrl || extractSource.avatar || extractSource.image || extractSource.profile_pic || extractSource.avatar_url || extractSource.profile_image_url || extractSource.pic || undefined;
      }

      if (data.extractedData || data.data || data.osint) {
          const extractSource = data.extractedData || data.data || data.osint;
          Object.entries(extractSource).forEach(([k, v]) => {
              if (v && typeof v === 'string') extracted[`Manual_${k}`] = v;
              if (v !== null && typeof v === 'number') extracted[`Manual_${k}`] = v.toString();
          });
      } else {
          // If flat json, extract other keys
          Object.entries(data).forEach(([k, v]) => {
              if (v && typeof v === 'string' && !['platform', 'username', 'name', 'avatarUrl', 'avatar', 'image', 'profile_pic', 'avatar_url', 'pic', 'profile_image_url', 'os', 'description', 'bio'].includes(k)) {
                  extracted[`Data_${k}`] = v;
              } else if (v !== null && typeof v === 'number') {
                  extracted[`Data_${k}`] = v.toString();
              }
          });
      }

      setResults({
          platform: platformResult,
          extractedData: extracted,
          rawParams: data.rawParams || data.raw || { status: 'Manual JSON Engine' },
          profileData: wpwProfile
      });
    } catch (e) {
      onLog('Format JSON tidak sah atau rosak.', 'error');
    }
  };

  const analyzeUrl = async () => {
    if (!url) {
      onLog('Sila masukkan URL untuk dianalisis.', 'warning');
      return;
    }

    setLoading(true);
    let traceMsg = `Memulakan enjin pelayan binaan Node.js...`;
    if (useCliMode) traceMsg = `Memulakan CLI Python Engine (ShareTrace)...`;
    if (useWpwMode) traceMsg = `Memulakan API Proxy (Whopostedwhat.com)...`;
    
    onLog(traceMsg, 'info');

    try {
      // Panggilan sebenar ke backend Express (server.ts) 
      const res = await fetch(`/api/sharetrace?url=${encodeURIComponent(url)}&cli=${useCliMode}&whopostedwhat=${useWpwMode}`);
      const data = await res.json();
      
      if (!data.success) {
          throw new Error(data.error || 'Gagal menyiasat URL');
      }

      if (data.isCli) {
          // Wrap CLI JSON logic into results
          onLog(`Data CLI berjaya dikesan`, 'success');
          setResults({
              platform: data.data.platform || 'CLI Output',
              extractedData: data.data.extracted || {},
              rawParams: { status: 'CLI Raw Data Available' }
          });
          setLoading(false);
          return;
      }

      if (data.isWpw) {
          onLog(`Enjin OSINT (Mode WPW) berjaya mengekstrak meta mendalam`, 'success');
          
          let platformResult = 'Dikesan melalui OSINT (WPW Mode)';
          let extracted: Record<string, string> = { "Jejak OSINT": "Selesai" };
          
          let namaProfil = data.meta?.ogTitle || data.meta?.title || "Identiti Utama";
          if (namaProfil.includes('TikTok') && namaProfil.includes('|')) {
               namaProfil = namaProfil.split('|')[0].trim();
          }

          let wpwProfile = {
              username: namaProfil,
              os: data.meta?.ogDesc ? (data.meta.ogDesc.length > 150 ? data.meta.ogDesc.substring(0, 150) + '...' : data.meta.ogDesc) : "Data OSINT Diekstrak.",
              avatarUrl: data.meta?.ogImage || undefined,
              followers: data.meta?.followers || undefined
          };

          if (data.osint && Object.keys(data.osint).length > 0) {
              Object.entries(data.osint).forEach(([k, v]) => {
                  if (typeof v === 'string') extracted[`OSINT_${k}`] = v;
              });
              if (data.osint.tiktok_nickname) {
                  wpwProfile.username = `${data.osint.tiktok_nickname} (@${data.osint.tiktok_username})`;
                  platformResult = 'TikTok OSINT';
              }
          }
          
          setResults({
              platform: platformResult,
              extractedData: extracted,
              rawParams: { status: 'Native OSINT Engine', URL: data.finalUrl || url },
              profileData: wpwProfile
          });
          setLoading(false);
          return;
      }

      onLog(`Jejak Web selesai. Semakan penjejakan metadata...`, 'info');

      // Menggunakan URL sasaran sebenar (selepas redirect bypass)
      let parsedUrl;
      try {
        parsedUrl = new URL(data.finalUrl);
      } catch (e) {
        onLog('URL Akhir tidak sah.', 'error');
        setLoading(false);
        return;
      }

      const params = Object.fromEntries(parsedUrl.searchParams.entries());
      const extractedData: Record<string, string> = {};
      let platform = "Tidak Diketahui";
      
      let profileData: any = {};

      const mockAvatars = []; // Removed mock avatars to prevent hallucination

      // Analisis Parameter Sebenar dari URL
      if (parsedUrl.hostname.includes('spotify.com') && params['si']) {
        platform = 'Spotify';
        extractedData['Share ID'] = params['si'];
        extractedData['Possible User Hash'] = params['si'].substring(0, 8) + '...';
      } else if (parsedUrl.hostname.includes('tiktok.com') || parsedUrl.hostname.includes('vm.tiktok.com') || data.finalUrl.includes('tiktok.com')) {
        platform = 'TikTok';
        if (params['share_app_id']) extractedData['App ID'] = params['share_app_id'];
        if (params['sec_user_id']) extractedData['Secured User ID'] = params['sec_user_id'];
        if (params['u_code']) extractedData['User Code'] = params['u_code'];
        if (params['social_share_type']) extractedData['Share Type'] = params['social_share_type'];
      } else if (parsedUrl.hostname.includes('vk.com')) {
        platform = 'VKontakte';
        if (params['w']) extractedData['Wall Post ID'] = params['w'];
      } else if (parsedUrl.hostname.includes('bilibili.com') || parsedUrl.hostname.includes('b23.tv')) {
        platform = 'Bilibili';
        if (params['buvid']) extractedData['BUVID (Device Identifier)'] = params['buvid'];
        if (params['up_id']) extractedData['Uploader/Sharer ID'] = params['up_id'];
        if (params['share_source']) extractedData['Share Source'] = params['share_source'];
      } else if (parsedUrl.hostname.includes('instagram.com')) {
        platform = 'Instagram';
        if (params['igsh']) extractedData['IG Share Hash'] = params['igsh'];
      } else if (params['utm_source'] || params['utm_medium']) {
         platform = 'Standard Marketing/Tracking';
         if (params['utm_source']) extractedData['UTM Source'] = params['utm_source'];
         if (params['utm_medium']) extractedData['UTM Medium'] = params['utm_medium'];
         if (params['utm_campaign']) extractedData['UTM Campaign'] = params['utm_campaign'];
      } else if (Object.keys(params).length > 0) {
          platform = 'Generik (Mempunyai Parameter)';
          for (const [key, val] of Object.entries(params)) {
             if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(val) && val.length > 10) {
                 try {
                     extractedData[`Nyahaudit Base64 (${key})`] = atob(val);
                 } catch(e) {}
             }
          }
      }

      // INTEGRASI DATA SEBENAR DARI GRAPH (META DATA)
      if (data.meta && (data.meta.title || data.meta.ogTitle || data.meta.ogImage)) {
          let namaProfil = data.meta.ogTitle || data.meta.title || "Meta Title Kosong";
          
          // Cleans up standard titles like "User (@username) | TikTok" -> "User (@username)"
          if (platform === 'TikTok' && namaProfil.includes('TikTok') && namaProfil.includes('|')) {
               namaProfil = namaProfil.split('|')[0].trim();
          }

          profileData = {
              username: namaProfil,
              avatarUrl: data.meta.ogImage || undefined,
              os: data.meta.ogDesc ? (data.meta.ogDesc.length > 150 ? data.meta.ogDesc.substring(0, 150) + '...' : data.meta.ogDesc) : undefined,
              followers: data.meta.followers || undefined,
              created_at: new Date().toISOString()
          };
          
          if (data.meta.jsonldData) {
              const ld = Array.isArray(data.meta.jsonldData) ? data.meta.jsonldData[0] : data.meta.jsonldData;
              if (ld && ld.interactionStatistic) {
                  // Try extract exact numbers
                  const stats = Array.isArray(ld.interactionStatistic) ? ld.interactionStatistic : [ld.interactionStatistic];
                  stats.forEach((s: any) => {
                      if (s.interactionType && s.userInteractionCount) {
                          extractedData[`JSON-LD Stat (${s.interactionType.split('/').pop()})`] = s.userInteractionCount;
                      }
                  });
              }
          }
      }

      if (Object.keys(extractedData).length === 0 && !data.meta?.title) {
        onLog('Tiada parameter penjejakan tersembunyi dikesan. Server disekat oleh pertahanan anti-bot (seperti Cloudflare).', 'warning');
      } else {
        onLog(`Jejak sebenar dikesan untuk platform: ${platform}`, 'success');
      }

      setResults({ platform, extractedData, rawParams: params, profileData: Object.keys(profileData).length > 0 ? profileData : undefined });
    } catch (e: any) {
      onLog(`Ralat semasa menganalisis pautan: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToGraph = () => {
    if (!results) return;

    const nodeId = 'st_' + Date.now();
    let details = `Analisis Pautan Perkongsian (ShareTrace)\nURL Asal: ${url}\nPlatform: ${results.platform}\n\n[Data Diekstrak]\n`;
    
    Object.entries(results.extractedData).forEach(([k, v]) => {
        details += `- ${k}: ${v}\n`;
    });

    if (results.profileData) {
        details += `\n[Profil Pengguna Dikesan]\n`;
        if (results.profileData.username) details += `- Pengguna: ${results.profileData.username}\n`;
        if (results.profileData.os) details += `- Peranti / OS: ${results.profileData.os}\n`;
        if (results.profileData.app_version) details += `- Versi App: ${results.profileData.app_version}\n`;
        if (results.profileData.created_at) details += `- Tarikh Dicipta: ${results.profileData.created_at}\n`;
    }

    details += `\n[Parameter Mentah]\n`;
    Object.entries(results.rawParams).forEach(([k, v]) => {
        details += `- ${k}: ${v}\n`;
    });

    const newData = {
      nodes: [
        {
          id: nodeId,
          label: `Trace: ${results.profileData?.username || results.platform}`,
          type: 'person',
          details: details,
          imageUrl: results.profileData?.avatarUrl,
          vaultMatch: true
        }
      ],
      links: []
    };

    onUpdateGraph(newData);
    onLog(`Keputusan ShareTrace dan Profil telah disimpan ke dalam Graf berpusat.`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0a0a0a] border border-fuchsia-900/50 rounded-xl shadow-2xl flex flex-col font-mono overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-fuchsia-900/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-fuchsia-900/30 flex items-center justify-center border border-fuchsia-500/50">
              <Link2 size={18} className="text-fuchsia-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">ShareTrace Analyzer</h2>
              <p className="text-[10px] text-gray-500">Mengekstrak ID & Metapengecaman dari Pautan Kongsian</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:text-white hover:bg-white/10 rounded transition-colors"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-2">
               <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {useManualMode ? "Tampal Data OSINT JSON" : "Masukkan Pautan / URL"}
               </label>
               <button 
                  onClick={() => setUseManualMode(!useManualMode)}
                  className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 underline font-bold"
               >
                  {useManualMode ? "Tukar Ke Pautan Biasa" : "Tukar Ke Mod Tampal JSON"}
               </button>
            </div>
            
            {!useManualMode ? (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="text" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Cth: https://open.spotify.com/track/123?si=abcdef123" 
                    className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 pl-9 text-sm text-white focus:outline-none focus:border-fuchsia-500 transition-colors placeholder:text-gray-700 font-mono"
                    onKeyDown={(e) => { if (e.key === 'Enter') analyzeUrl(); }}
                  />
                </div>
                <button 
                  onClick={analyzeUrl}
                  disabled={loading || !url}
                  className="bg-fuchsia-600 hover:bg-fuchsia-500 text-black font-bold uppercase tracking-wider text-xs px-6 py-2 rounded transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Zap size={14} className="animate-pulse" /> : <LocateFixed size={14} />}
                  {loading ? 'Tracer...' : 'Trace'}
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-start">
                <textarea 
                  value={manualJson}
                  onChange={(e) => setManualJson(e.target.value)}
                  placeholder={'{\n  "platform": "Scraped TikTok",\n  "username": "Target_Akaun",\n  "os": "Deskripsi",\n  "avatarUrl": "https://..."\n}'}
                  className="flex-1 w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500 transition-colors placeholder:text-gray-700 font-mono resize-y h-20"
                />
                <button 
                  onClick={analyzeManualJson}
                  disabled={!manualJson}
                  className="bg-[#34c759] hover:bg-[#2eaa4e] text-black font-bold uppercase tracking-wider text-xs px-4 py-2 rounded transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-20"
                >
                  <Database size={14} /> Parse
                </button>
              </div>
            )}
            
            {!useManualMode && (
              <>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <button 
                    onClick={() => { setUseCliMode(!useCliMode); if(!useCliMode) setUseWpwMode(false); }}
                    className={`text-[10px] uppercase font-bold px-2 py-1 flex items-center gap-1 rounded transition-colors ${useCliMode ? 'bg-[#ff0033]/20 text-[#ff0033] border border-[#ff0033]/50' : 'bg-white/5 text-gray-500 border border-white/10 hover:text-white'}`}
                  >
                    <Database size={12} /> Mod CLI Python (Soxoj)
                  </button>
                  <button 
                    onClick={() => { setUseWpwMode(!useWpwMode); if(!useWpwMode) setUseCliMode(false); }}
                    className={`text-[10px] uppercase font-bold px-2 py-1 flex items-center gap-1 rounded transition-colors ${useWpwMode ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50' : 'bg-white/5 text-gray-500 border border-white/10 hover:text-white'}`}
                  >
                    <Search size={12} /> Mod OSINT (WhoPostedWhat API)
                  </button>
                  <a 
                    href={url ? `https://share.whopostedwhat.com/?url=${encodeURIComponent(url)}` : 'https://share.whopostedwhat.com/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] uppercase font-bold px-2 py-1 flex items-center gap-1 rounded transition-colors bg-white/5 text-[#00ccff] border border-white/10 hover:bg-[#00ccff]/10 hover:border-[#00ccff]/50"
                  >
                    <ExternalLink size={12} /> Buka Laman Web WPW
                  </a>
                  <div className="flex-1"></div>
                </div>

                <p className="text-[10px] text-gray-500">
                  {useCliMode 
                    ? "Akan memanggil Python CLI asal (memerlukan backend dipasang modul python: sharetrace). Ia tiada paparan Meta."
                    : useWpwMode ? "Mengekstrak data menggunakan sambungan secara API kepada WhoPostedWhat dan mengekstrak graph ID yang tersembunyi."
                    : "Analisis berstruktur HANYA akan memaparkan data tepat tanpa mokup simulasi. Enjin akan menyelesaikan redirect secara automatik."}
                </p>
              </>
            )}
          </div>

          {results && (
            <div className="bg-black/40 border border-fuchsia-900/30 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-white/5">
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Platform Dikesan:</span>
                    <span className="text-sm font-black text-fuchsia-400">{results.platform}</span>
                 </div>
                 <button 
                    onClick={handleSaveToGraph}
                    className="bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-black border border-green-600/50 font-bold uppercase tracking-wider text-[10px] px-3 py-1 rounded transition-all flex items-center gap-1.5"
                  >
                    <Save size={12} /> Map To Graph
                  </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Profile Data (if extracted) */}
                  {results.profileData && Object.keys(results.profileData).length > 0 && (
                      <div className="col-span-1 md:col-span-2 bg-black/40 border border-[#ff0033]/30 p-3 rounded-lg flex items-center gap-4 mb-2 shadow-[0_0_15px_rgba(255,0,51,0.1)]">
                          {results.profileData.avatarUrl ? (
                              <img src={results.profileData.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-16 h-16 rounded-lg object-cover border border-[#ff0033]/50" />
                          ) : (
                              <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-600">
                                  <User className="text-gray-500" size={24} />
                              </div>
                          )}
                          <div className="flex-1 space-y-1">
                              <h4 className="text-sm font-bold text-white uppercase tracking-wider">{results.profileData.username || 'Unknown User'}</h4>
                              <div className="flex flex-col gap-1 mt-2 text-[10px] text-gray-400">
                                  {results.profileData.os && <div><span className="text-gray-500 uppercase">Perincian / Bio: </span><span className="text-cyan-400 font-medium">{results.profileData.os}</span></div>}
                                  {results.profileData.followers && <div><span className="text-gray-500 uppercase">Pengikut: </span><span className="text-fuchsia-400 font-black">{results.profileData.followers}</span></div>}
                                  {results.profileData.created_at && <div><span className="text-gray-500 uppercase">Waktu Dikesan: </span><span className="text-white bg-white/10 px-1 py-0.5 rounded font-mono">{new Date(results.profileData.created_at).toLocaleString()}</span></div>}
                              </div>
                          </div>
                      </div>
                  )}

                  {!results.profileData || Object.keys(results.profileData).length === 0 ? (
                      <div className="col-span-1 md:col-span-2 text-[10px] text-orange-400 border border-orange-500/30 p-2 rounded bg-orange-500/10 mb-2">
                        <strong>Nota OSINT:</strong> Gambar profil dan maklumat lanjut gagal diekstrak secara terus kerana perlindungan pelayan sasaran. Sosial media moden (TikTok/Instagram) memerlukan simulasi pelayar aktif ATAU akaun yang sah untuk melihat metadata tersembunyi.
                      </div>
                  ) : null}

                  {/* Extracted Data */}
                  <div>
                      <h3 className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <User size={12} /> Data Penjejakan Diekstrak
                      </h3>
                      {Object.keys(results.extractedData).length > 0 ? (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                              {Object.entries(results.extractedData).map(([k, v], i) => (
                                  <div key={i} className="bg-fuchsia-900/10 border border-fuchsia-500/20 p-2 rounded">
                                      <div className="text-[9px] text-gray-500 uppercase">{k}</div>
                                      <div className="text-xs text-white font-bold break-all">
                                          {(v.startsWith('http') && (v.match(/\.(jpeg|jpg|gif|png|webp|avif)/i) || k.toLowerCase().includes('avatar') || k.toLowerCase().includes('image') || k.toLowerCase().includes('pic'))) ? (
                                              <img src={v} alt={k} referrerPolicy="no-referrer" className="mt-2 max-h-32 rounded border border-fuchsia-500/30 object-contain" />
                                          ) : (
                                              v
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-xs text-gray-600 italic">Tiada tandatangan khusus dikesan.</div>
                      )}
                  </div>

                  {/* Raw Params */}
                  <div>
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Hash size={12} /> Parameter Mentah Kandungan
                      </h3>
                      {Object.keys(results.rawParams).length > 0 ? (
                          <div className="space-y-2">
                              {Object.entries(results.rawParams).map(([k, v], i) => (
                                  <div key={i} className="bg-white/5 border border-white/10 p-2 rounded flex justify-between items-start gap-2">
                                      <div className="text-[10px] text-cyan-400 font-bold">{k}</div>
                                      <div className="text-[10px] text-gray-400 break-all text-right">{v}</div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-xs text-gray-600 italic">Tiada parameter URL (?key=value).</div>
                      )}
                  </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareTraceModal;
