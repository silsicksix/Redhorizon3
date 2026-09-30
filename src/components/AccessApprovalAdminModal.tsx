import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, UserCheck, UserX, Clock, Search, RefreshCw, 
  X, Check, AlertCircle, Shield, Users, Mail, Sparkles, Filter, 
  ChevronRight, Key, Lock, UserPlus, Send, Copy, ExternalLink, MessageSquareQuote
} from 'lucide-react';
import { 
  AccessRequest, 
  subscribeToAllAccessRequests, 
  updateAccessRequestStatus, 
  preApproveInvestigatorByEmail,
  LEAD_ADMIN_EMAIL 
} from '../services/firebase';

interface AccessApprovalAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

export const AccessApprovalAdminModal: React.FC<AccessApprovalAdminModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail
}) => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Pre-approve invite states
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'investigator' | 'analyst' | 'viewer'>('investigator');
  const [inviting, setInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAllAccessRequests((data) => {
      setRequests(data);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const filteredRequests = requests.filter(req => {
    if (filterTab !== 'all' && req.status !== filterTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        req.email.toLowerCase().includes(q) || 
        req.displayName.toLowerCase().includes(q) ||
        (req.notes && req.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleStatusChange = async (
    uid: string, 
    email: string, 
    newStatus: 'approved' | 'rejected' | 'pending',
    role: 'lead' | 'investigator' | 'analyst' | 'viewer' = 'investigator'
  ) => {
    setActionLoadingId(uid);
    setErrorNotice(null);
    try {
      await updateAccessRequestStatus(uid, newStatus, role, '', currentUserEmail || LEAD_ADMIN_EMAIL);
      const actionTxt = newStatus === 'approved' ? 'DILULUSKAN' : newStatus === 'rejected' ? 'DITOLAK' : 'DIKEMBALIKAN KE PENDING';
      setSuccessNotice(`Akses untuk ${email} telah berjaya ${actionTxt}.`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to update access request:', err);
      setErrorNotice(err?.message || 'Gagal mengemaskini status permohonan.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePreApproveInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setErrorNotice('Sila masukkan alamat e-mel rakan yang sah.');
      return;
    }

    setInviting(true);
    setErrorNotice(null);
    try {
      await preApproveInvestigatorByEmail(
        inviteEmail.trim(),
        inviteName.trim() || 'Penyiasat Jemputan',
        inviteRole,
        'Dijemput awal oleh Lead Admin',
        currentUserEmail || LEAD_ADMIN_EMAIL
      );
      setSuccessNotice(`E-mel ${inviteEmail} berjaya dipra-luluskan! Rakan anda kini boleh log masuk terus tanpa sekatan.`);
      setInviteEmail('');
      setInviteName('');
      setShowInviteForm(false);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Gagal mempra-luluskan permohonan.');
    } finally {
      setInviting(false);
    }
  };

  const handleCopyAppUrl = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 font-mono select-none">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-[0_0_60px_rgba(8,145,178,0.35)] flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-cyan-500/30 bg-slate-950/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/20 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                  PORTAL KEBENARAN KESELAMATAN (ELITE AGENT)
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[9px] font-bold text-cyan-300 uppercase">
                  ELITE AGENT • TOP SECRET CLEARANCE
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Uruskan kebenaran masuk rakan penyiasat dan bilik siasatan Red Horizon OSINT.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                showInviteForm 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                  : 'bg-cyan-950/60 hover:bg-cyan-900 border-cyan-500/40 text-cyan-300'
              }`}
            >
              <UserPlus size={14} />
              <span className="hidden sm:inline">Pra-Luluskan / Jemput</span>
              <span className="sm:hidden">Jemput</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Success / Error Alerts */}
        {successNotice && (
          <div className="px-5 py-2.5 bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button onClick={() => setSuccessNotice(null)} className="text-emerald-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {errorNotice && (
          <div className="px-5 py-2.5 bg-rose-950/90 border-b border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-between shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button onClick={() => setErrorNotice(null)} className="text-rose-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* PRE-APPROVE INVITE FORM (ACCORDION) */}
        {showInviteForm && (
          <form onSubmit={handlePreApproveInvite} className="p-4 bg-slate-950 border-b border-amber-500/30 text-xs flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold uppercase text-[11px]">
                <Sparkles size={14} />
                <span>Pra-Luluskan Rakan Penyiasat Menggunakan E-Mel</span>
              </div>
              <button
                type="button"
                onClick={handleCopyAppUrl}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedLink ? 'Pautan Disalin!' : 'Salin Pautan Web OSINT'}</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              Jika rakan anda belum memohon atau sedang menunggu, masukkan alamat Gmail rakan anda di bawah. Sistem akan pra-luluskan secara serta-merta supaya mereka terus dapat akses apabila membuka aplikasi.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">E-Mel Gmail Rakan (Wajib):</label>
                <input
                  type="email"
                  required
                  placeholder="contoh: rakan@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Nama Penyiasat / Kod Panggilan:</label>
                <input
                  type="text"
                  placeholder="contoh: Detektif Azman"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Peranan Akses:</label>
                <div className="flex items-center gap-2">
                  <select
                    value={inviteRole}
                    onChange={(e: any) => setInviteRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="investigator">Penyiasat (Investigator)</option>
                    <option value="analyst">Penganalisis (Analyst)</option>
                    <option value="viewer">Pemerhati (Viewer)</option>
                  </select>

                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={12} />
                    <span>{inviting ? 'Menyimpan...' : 'Pra-Luluskan'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Stats Summary Bar & Search Controls */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          
          {/* Quick Counter Badges */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                filterTab === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Users size={14} />
              <span>Semua ({requests.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                filterTab === 'pending'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-amber-300'
              }`}
            >
              <Clock size={14} className="text-amber-400" />
              <span>Pending ({pendingCount})</span>
              {pendingCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setFilterTab('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                filterTab === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-emerald-300'
              }`}
            >
              <UserCheck size={14} className="text-emerald-400" />
              <span>Diluluskan ({approvedCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                filterTab === 'rejected'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-rose-300'
              }`}
            >
              <UserX size={14} className="text-rose-400" />
              <span>Ditolak ({rejectedCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari e-mel, nama, nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/70"
            />
          </div>

        </div>

        {/* Main List Container */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs font-mono">
              <Users size={32} className="mx-auto text-slate-600 mb-2" />
              <p>Tiada rekod permohonan {filterTab !== 'all' ? `berstatus ${filterTab}` : ''} ditemui.</p>
              {filterTab === 'pending' && (
                <p className="text-[11px] text-cyan-400 mt-2">
                  Jika rakan anda belum memohon, anda boleh klik butang <strong>"Pra-Luluskan / Jemput"</strong> di atas.
                </p>
              )}
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isLead = req.email.toLowerCase() === LEAD_ADMIN_EMAIL.toLowerCase();
              const isLoading = actionLoadingId === req.uid;

              return (
                <div
                  key={req.uid}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    req.status === 'pending'
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-400'
                      : req.status === 'approved'
                      ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40'
                      : 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/50'
                  }`}
                >
                  {/* Left: User Info & Status */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {req.photoURL ? (
                      <img src={req.photoURL} alt="" className="w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold flex items-center justify-center text-sm shrink-0">
                        {req.displayName?.charAt(0) || 'P'}
                      </div>
                    )}

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">{req.displayName}</span>
                        
                        {/* Status Badge */}
                        {req.status === 'approved' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[9px] font-black uppercase flex items-center gap-1">
                            <Check size={10} /> Diluluskan
                          </span>
                        )}
                        {req.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500 text-amber-300 text-[9px] font-black uppercase flex items-center gap-1 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                            <Clock size={10} /> Menunggu Kelulusan
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/40 text-rose-300 text-[9px] font-black uppercase flex items-center gap-1">
                            <X size={10} /> Ditolak
                          </span>
                        )}

                        {isLead && (
                          <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[9px] font-bold uppercase">
                            Lead Admin
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 font-mono flex items-center gap-2 mt-0.5">
                        <Mail size={12} className="text-cyan-400 shrink-0" />
                        <span className="truncate select-all">
                          {isLead ? 'Elite Agent [Identiti Sulit/Terenkripsi]' : req.email}
                        </span>
                      </div>

                      {/* Notes / Department / Justification */}
                      {(req.notes || req.department) && (
                        <div className="mt-1.5 p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-amber-200/90 flex items-start gap-1.5">
                          <MessageSquareQuote size={13} className="text-amber-400 shrink-0 mt-0.5" />
                          <span className="italic">"{req.notes || req.department}"</span>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-3 flex-wrap">
                        <span>Memohon: {new Date(req.requestedAt).toLocaleString('ms-MY')}</span>
                        {req.reviewedBy && (
                          <span>
                            Disemak: {req.reviewedBy.toLowerCase() === LEAD_ADMIN_EMAIL.toLowerCase() ? 'Elite Agent (Lead Commander)' : req.reviewedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    {isLead ? (
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-3 py-1.5 rounded-lg border border-cyan-500/40">
                        Akses Kekal (Elite Agent)
                      </span>
                    ) : (
                      <>
                        {req.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleStatusChange(req.uid, req.email, 'approved', 'investigator')}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <UserCheck size={14} className="stroke-[3]" />
                            <span>Luluskan Akses</span>
                          </button>
                        )}

                        {req.status === 'approved' && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleStatusChange(req.uid, req.email, 'rejected')}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <UserX size={13} />
                            <span>Tarik Balik Akses</span>
                          </button>
                        )}

                        {req.status === 'rejected' && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleStatusChange(req.uid, req.email, 'approved', 'investigator')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs uppercase flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <UserCheck size={13} />
                            <span>Buka Semula Akses</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 text-[10.5px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono shrink-0">
          <span>Hanya akaun yang diluluskan oleh <strong className="text-cyan-300">Elite Agent (Lead Commander)</strong> berhak memasuki UI aplikasi dan ruangan chat.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-[10px] cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
