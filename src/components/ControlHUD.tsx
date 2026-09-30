
import React from 'react';
import { LayoutMode } from '../types';
import { Layers, Grid, Circle, Share2, Shapes, Network, Workflow, Zap, CreditCard, Map as MapIcon } from 'lucide-react';
import { Tooltip, TooltipAccent } from './Tooltip';

interface ControlHUDProps {
  currentLayout: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
  nodeRenderMode?: 'classic' | 'schematic';
  onToggleRenderMode?: () => void;
  onOpenEnricherHub?: () => void;
}

interface LayoutItem {
  id: LayoutMode;
  icon: React.ReactNode;
  title: string;
  tutorial: string;
  tip?: string;
  category: string;
  accentColor: TooltipAccent;
}

const ControlHUD: React.FC<ControlHUDProps> = ({ 
  currentLayout, 
  onLayoutChange,
  nodeRenderMode = 'classic',
  onToggleRenderMode,
  onOpenEnricherHub
}) => {
  const layouts: LayoutItem[] = [
    { 
      id: 'schematic', 
      icon: <Workflow size={16} />, 
      title: 'Skematik Saluran (Flowsint / Pipeline Blueprint)',
      tutorial: 'Menyusun graf mengikut saluran peringkat (Pipeline Stages): Sasaran POI ➔ Pengenal Pasti ➔ Korporat ➔ Siber ➔ Kewangan/Kripto dengan paparan kad teratur.',
      tip: 'Paling kemas, teratur & bebas silang — mereplikasikan estetika Flowsint & Maltego Blueprint.',
      category: 'SKEMATIK FLOWSINT',
      accentColor: 'amber'
    },
    { 
      id: 'force', 
      icon: <Share2 size={16} />, 
      title: 'Susunan Organik (Force-Directed)',
      tutorial: 'Menyusun entiti dan pautan secara fizik graviti anti-tindih, membiarkan nod-nod berkait rapat berkumpul secara dinamik mengikut kekuatan hubungan.',
      tip: 'Sesuai untuk meneroka kluster perhubungan rangkaian secara bebas dan interaktif.',
      category: 'SUSUNAN GRAF',
      accentColor: 'cyan'
    },
    { 
      id: 'orthogonal', 
      icon: <Network size={16} />, 
      title: 'Maltego Orthogonal (Melintang / Horizontal)',
      tutorial: 'Menyusun graf gaya penyiasatan perisikan profesional dengan garisan sambungan bersiku tepat 90° secara melintang.',
      tip: 'Paling kemas untuk laporan risikan & cetakan dossier kes penyiasatan rasmi.',
      category: 'SUSUNAN PERISIKAN',
      accentColor: 'emerald'
    },
    { 
      id: 'orthogonal_vertical', 
      icon: <Network size={16} className="rotate-90" />, 
      title: 'Maltego Orthogonal (Menegak / Vertical)',
      tutorial: 'Menyusun nod mengikut lajur menegak mengikut tahap/peringkat dengan garisan sambungan siku 90° tegak.',
      tip: 'Ideal untuk rantaian kuasa menegak, garis masa dan struktur hierarki lajur.',
      category: 'SUSUNAN PERISIKAN',
      accentColor: 'cyan'
    },
    { 
      id: 'hierarchy', 
      icon: <Layers size={16} />, 
      title: 'Hierarki / Piramid Intel (Top-Down)',
      tutorial: 'Memaparkan struktur kepimpinan dan rantaian perintah dari atas ke bawah (organisasi, sindiket, atau pokok genealogi).',
      tip: 'Gunakan untuk mengesan dalang utama (mastermind) atau aliran arahan sindiket.',
      category: 'RANTAIAN KUASA',
      accentColor: 'amber'
    },
    { 
      id: 'cluster', 
      icon: <Shapes size={16} />, 
      title: 'Kelompokkan Mengikut Jenis Entiti',
      tutorial: 'Mengasingkan nod secara automatik ke dalam pulau kategori berbeza (cth: Suspek, Akaun Bank, Telefon, Lokasi, Syarikat).',
      tip: 'Membantu melihat pecahan aset dan kategori entiti yang paling mendominasi kes.',
      category: 'KATEGORI ENTITI',
      accentColor: 'purple'
    },
    { 
      id: 'circle', 
      icon: <Circle size={16} />, 
      title: 'Susunan Membulat (Radial)',
      tutorial: 'Menempatkan nod-nod di atas jejari bulatan sepusat untuk membandingkan tahap keterkaitan dari pusat siasatan.',
      tip: 'Sangat efektif untuk analisis hub berpusat (Central Hub Analysis).',
      category: 'RADIAL GEOMETRI',
      accentColor: 'blue'
    },
    { 
      id: 'grid', 
      icon: <Grid size={16} />, 
      title: 'Susunan Grid Matriks',
      tutorial: 'Menyusun setiap entiti dalam petak grid sekata bagi memudahkan audit visual inventori dan perbandingan atribut satu demi satu.',
      tip: 'Gunakan semasa menapis kuantiti entiti yang banyak sebelum pemetaan hubungan.',
      category: 'INVENTORI & AUDIT',
      accentColor: 'cyan'
    },
    { 
      id: 'map', 
      icon: <MapIcon size={16} />, 
      title: 'Unjuran Peta Geospasial (GIS Satelit)',
      tutorial: 'Memetakan entiti yang mempunyai koordinat geografi terus ke atas unjuran peta satelit interaktif dengan nod berasaskan lokasi sebenar.',
      tip: 'Gunakan untuk peninjauan fizikal lokasi, pergerakan sasaran dan analisis zon geoint.',
      category: 'GEOSPASIAL & GIS',
      accentColor: 'purple'
    },
  ];

  return (
    <div className="relative flex items-center gap-1 px-1.5 py-1 border border-[#00f0ff]/30 rounded-lg bg-black/80 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.15)] shrink-0 group">
      {/* Corner cybertech accents */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#00f0ff] pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#00f0ff] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-[#00f0ff] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#00f0ff] pointer-events-none"></div>

      {/* Layout Selection */}
      {layouts.map((l) => (
        <Tooltip 
          key={l.id} 
          title={l.title}
          tutorial={l.tutorial}
          tip={l.tip}
          category={l.category}
          accentColor={l.accentColor}
          position="bottom"
        >
          <button
            onClick={() => onLayoutChange(l.id)}
            className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer relative ${
              currentLayout === l.id 
                ? 'bg-[#00f0ff] text-black font-bold shadow-[0_0_12px_#00f0ff]' 
                : 'text-gray-400 hover:text-[#00f0ff] hover:bg-[#00f0ff]/10'
            }`}
          >
            {l.icon}
            {currentLayout === l.id && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-black rounded-full"></span>
            )}
          </button>
        </Tooltip>
      ))}

      {/* Separator */}
      {(onToggleRenderMode || onOpenEnricherHub) && (
        <div className="w-px h-4 bg-white/15 mx-1" />
      )}

      {/* Schematic Card View Mode Toggle */}
      {onToggleRenderMode && (
        <Tooltip
          title={nodeRenderMode === 'schematic' ? "Gaya Kad Skematik: AKTIF (Flowsint Style)" : "Tukar ke Gaya Kad Skematik (Flowsint Style)"}
          tutorial="Paparan kad reka bentuk skematik teknologi dengan lencana jenis entiti, port sambungan, dan maklumat ringkas pada setiap nod."
          tip="Aktifkan untuk rupa visual seperti Flowsint & React Flow!"
          category="GAYA PAPARAN"
          accentColor="amber"
          position="bottom"
        >
          <button
            onClick={onToggleRenderMode}
            className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 text-xs ${
              nodeRenderMode === 'schematic'
                ? 'bg-amber-500 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            <CreditCard size={15} />
          </button>
        </Tooltip>
      )}

      {/* Modular Enricher Hub Launcher */}
      {onOpenEnricherHub && (
        <Tooltip
          title="Modular Enricher Hub (POI, Kripto & Rangkaian)"
          tutorial="Buka hab modul pengayaan berkuasa tinggi untuk membongkar identiti POI, nombor telefon, MyKad, lejar kripto, dan rekod domain."
          tip="Modul pluggable melebihi keupayaan Flowsint dengan enjin AI Red Horizon."
          category="ENRICHER HUB"
          accentColor="cyan"
          position="bottom"
        >
          <button
            onClick={onOpenEnricherHub}
            className="p-1.5 rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 text-xs bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-500 hover:to-blue-500 text-cyan-300 hover:text-white border border-cyan-500/40 shadow-sm"
          >
            <Zap size={15} className="text-cyan-400 hover:text-white animate-pulse" />
          </button>
        </Tooltip>
      )}
    </div>
  );
};

export default ControlHUD;
