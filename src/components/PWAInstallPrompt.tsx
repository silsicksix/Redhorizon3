import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone, CheckCircle, ShieldAlert } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('rh_pwa_banner_dismissed') === 'true';
  });

  // If already installed and running fullscreen / standalone, do not show banner
  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem('rh_pwa_banner_dismissed', 'true');
    setDismissed(true);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General fallback guide
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {/* Floating Tactical PWA Install Banner */}
      <div 
        id="pwa-install-banner"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#09090b]/95 border border-red-500/40 backdrop-blur-md rounded-xl p-3.5 shadow-2xl shadow-red-950/40 text-slate-100 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-5 duration-300"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-red-400 uppercase">
                  PWA Standalone Mode
                </span>
                <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-mono">
                  Full Screen
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-100 leading-tight mt-0.5">
                Pasang ke Skrin Utama Telefon
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Buka secara skrin penuh tanpa bar URL pelayar untuk pengalaman penuh.
              </p>
            </div>
          </div>
          <button
            id="dismiss-pwa-banner"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-white/5 transition"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <button
            id="btn-install-pwa-action"
            onClick={handleInstallClick}
            className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 transition border border-red-400/40"
          >
            <Download className="w-3.5 h-3.5" />
            Pasang Aplikasi Sekarang
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs text-slate-400 hover:text-slate-300 py-2 px-2.5 rounded-lg hover:bg-white/5 transition"
          >
            Nanti
          </button>
        </div>
      </div>

      {/* Guided Modal for iOS Safari or manual browsers */}
      {showIOSGuide && (
        <div 
          id="pwa-install-guide-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-xl bg-[#09090b] border border-red-500/40 p-5 shadow-2xl text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Cara Pasang Skrin Penuh
                </h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                <Share2 className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">1. Tekan Menu / Butang Kongsi</strong>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Pada Chrome: Tekan 3 titik di atas kanan. Pada Safari (iPhone): Tekan ikon petak berpanah (Share) di bawah.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">2. Pilih &quot;Add to Home Screen&quot; / &quot;Install App&quot;</strong>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Pilih <em>Tambah ke Skrin Utama</em>. Ikon Red Horizon akan muncul di telefon anda!
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">3. Buka dari Skrin Telefon</strong>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Aplikasi akan automatik dilancarkan dalam mod <strong>Full Screen Standalone</strong> (tiada bar URL pelayar).
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
            >
              Faham &amp; Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
