import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Cpu, Sparkles, Check, Info, ShieldAlert } from 'lucide-react';

export type GpuDensityMode = '1080p' | '2k' | '4k';

interface GpuDensityControlProps {
  mode: GpuDensityMode;
  onChangeMode: (newMode: GpuDensityMode) => void;
}

export const GpuDensityControl: React.FC<GpuDensityControlProps> = ({ mode, onChangeMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = () => {
    switch (mode) {
      case '4k':
        return { short: '4K Ultra', text: '4K Ultra-Density (1.95x View)', color: 'text-purple-400 border-purple-500/60 bg-purple-950/40' };
      case '2k':
        return { short: '2K HD', text: '2K High-DPI (1.18x View)', color: 'text-cyan-400 border-cyan-500/60 bg-cyan-950/40' };
      default:
        return { short: '1080p Std', text: '1080p Standard (1.0x)', color: 'text-emerald-400 border-emerald-500/60 bg-emerald-950/40' };
    }
  };

  const currentConfig = getLabel();

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(0,0,0,0.5)] ${currentConfig.color} hover:brightness-125`}
          title="Tukar Mod DPI & Saiz GPU Density (Virtual 2K/4K Scaling)"
        >
          <Cpu size={12} className={mode !== '1080p' ? 'animate-pulse text-cyan-300' : 'text-emerald-400'} />
          <span className="font-mono">{currentConfig.short}</span>
          <span className="text-[8px] opacity-70 bg-black/50 px-1 py-0.2 rounded border border-white/10 hidden xl:inline">
            GPU
          </span>
        </button>

        <button
          onClick={() => setShowInfoModal(true)}
          className="p-1 text-gray-400 hover:text-cyan-300 hover:bg-white/10 rounded transition-colors cursor-pointer"
          title="Maklumat Analisis Pro & Kontra Mod Ultra GPU Density"
        >
          <Info size={13} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-[120%] right-0 w-72 bg-[#080b12] border-2 border-cyan-500/50 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.95)] z-[110] backdrop-blur-xl p-2.5 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <Sparkles size={12} /> GPU Virtual DPI Scale
            </span>
            <span className="text-[8px] font-mono bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/40">
              HW ACCEL
            </span>
          </div>

          {/* Option 1: 1080p Standard */}
          <button
            onClick={() => {
              onChangeMode('1080p');
              setIsOpen(false);
            }}
            className={`w-full p-2 rounded text-left flex items-start justify-between border transition-all cursor-pointer ${
              mode === '1080p'
                ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-black/50 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <div>
              <div className="text-[11px] font-bold flex items-center gap-1.5 text-emerald-400">
                1080p Standard Mode (1.0x)
              </div>
              <div className="text-[9px] text-gray-400 leading-tight mt-0.5">
                Saiz asas standard. Butang & ikon bersaiz biasa, mesra skrin sentuh peranti mudah alih.
              </div>
            </div>
            {mode === '1080p' && <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />}
          </button>

          {/* Option 2: 2K High-DPI */}
          <button
            onClick={() => {
              onChangeMode('2k');
              setIsOpen(false);
            }}
            className={`w-full p-2 rounded text-left flex items-start justify-between border transition-all cursor-pointer ${
              mode === '2k'
                ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-black/50 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <div>
              <div className="text-[11px] font-bold flex items-center gap-1.5 text-cyan-300">
                2K High-DPI Mode (0.85x Scale)
              </div>
              <div className="text-[9px] text-gray-400 leading-tight mt-0.5">
                Keluasan ruang kerja +18%. Graf & teks lebih tajam dengan pecutan GPU hardware.
              </div>
            </div>
            {mode === '2k' && <Check size={14} className="text-cyan-400 shrink-0 mt-0.5" />}
          </button>

          {/* Option 3: 4K Ultra Density */}
          <button
            onClick={() => {
              onChangeMode('4k');
              setIsOpen(false);
            }}
            className={`w-full p-2 rounded text-left flex items-start justify-between border transition-all cursor-pointer ${
              mode === '4k'
                ? 'bg-purple-950/60 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-black/50 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <div>
              <div className="text-[11px] font-bold flex items-center gap-1.5 text-purple-300">
                4K Ultra-Density Mode (0.72x Scale)
              </div>
              <div className="text-[9px] text-gray-400 leading-tight mt-0.5">
                Pandangan taktikal maksimum +95% keluasan ruang kerja. Sesuai untuk persekitaran monitor 2K/4K atau analisis data masif.
              </div>
            </div>
            {mode === '4k' && <Check size={14} className="text-purple-400 shrink-0 mt-0.5" />}
          </button>

          <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[8px] text-gray-500 font-mono">
            <span>DPI: {mode === '4k' ? '300 DPI' : mode === '2k' ? '220 DPI' : '120 DPI'}</span>
            <span>HW Compositing: Active</span>
          </div>
        </div>
      )}

      {/* Pro & Con Analysis Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d16] border-2 border-cyan-500/70 rounded-xl max-w-xl w-full p-5 shadow-[0_0_50px_rgba(0,240,255,0.2)] text-white flex flex-col gap-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="text-cyan-400" size={20} />
                <h3 className="font-bold text-base tracking-wide text-cyan-300">
                  Analisis Pro & Kontra Mod Virtual GPU Density (2K/4K)
                </h3>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded text-xs font-mono"
              >
                Tutup [ESC]
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
              <p>
                Mod Virtual GPU Density menukar skala nisbah paparan UI (<code className="text-cyan-400">Viewport Scale & DevicePixelRatio</code>) bagi memberikan paparan ketumpatan tinggi yang seolah-olah berada di monitor resolusi 2K atau 4K.
              </p>

              {/* Pro Section */}
              <div className="bg-emerald-950/30 border border-emerald-500/40 p-3.5 rounded-lg space-y-2">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles size={14} /> Kelebihan (Pro UX & Visual Analysis)
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-emerald-200/90 text-[11px]">
                  <li>
                    <strong className="text-emerald-300">Keluasan Ruang Kerja Hingga +95%:</strong> Menampilkan rangkaian nod OSINT dan garis masa yang jauh lebih banyak dalam satu paparan tanpa tatalan berlebihan.
                  </li>
                  <li>
                    <strong className="text-emerald-300">Ketajaman Visual Taktikal:</strong> Teks kecil, label metadata, dan garisan hubungan graf kelihatan sangat jelas dan tajam tanpa kesan kabur (*pixelation*).
                  </li>
                  <li>
                    <strong className="text-emerald-300">Pecutan Lapisan GPU:</strong> Memaksa rendering *hardware compositing* bagi memastikan animasi nod dan peta kekal lancar pada 60-120 FPS.
                  </li>
                </ul>
              </div>

              {/* Con Section */}
              <div className="bg-amber-950/30 border border-amber-500/40 p-3.5 rounded-lg space-y-2">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldAlert size={14} /> Keburukan / Risiko (Kontra & Limitasi)
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-amber-200/90 text-[11px]">
                  <li>
                    <strong className="text-amber-300">Sasaran Sentuhan Terlalu Kecil (Touch Targets):</strong> Pada peranti telefon mudah alih, butang dan nod 4K menjadi sangat kecil dan memerlukan ketepatan sentuhan jari yang tinggi.
                  </li>
                  <li>
                    <strong className="text-amber-300">Penggunaan Bateri & Haba:</strong> Memaksa render piksel 4K meningkatkan beban GPU peranti dan boleh menyebabkan peningkatan haba atau bateri lebih cepat berkurang.
                  </li>
                  <li>
                    <strong className="text-amber-300">Prestasi Peranti Lama:</strong> Peranti Android/iOS berspesifikasi rendah mungkin mengalami *stuttering* sekiranya mod 4K dipaksa.
                  </li>
                </ul>
              </div>

              {/* Recommendation */}
              <div className="bg-cyan-950/40 border border-cyan-500/40 p-3 rounded-lg text-[11px] text-cyan-200">
                💡 <strong>Syor Penggunaan:</strong> Gunakan mod <strong className="text-white">1080p Standard</strong> untuk peranti mudah alih/telefon, mod <strong className="text-cyan-300">2K HD</strong> untuk komputer riba, dan mod <strong className="text-purple-300">4K Ultra</strong> apabila disambungkan ke monitor luaran bersaiz besar.
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="bg-cyan-500 text-black font-bold px-4 py-1.5 rounded text-xs hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                Faham & Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
