
import React from 'react';
import { 
  User, Building2, MapPin, Phone, Server, Fingerprint, Share2, Mail, Shapes,
  Sparkles, Gem, Film, Ghost, Crosshair, Bug, Camera, Radio, FileText, Landmark, FileCode,
  Globe, Coins, Car, Flame, Compass, Video, AlertTriangle, Key, Bot, Orbit, BookOpen, Waves, Shield, Image
} from 'lucide-react';
import Tooltip from './Tooltip';

interface QuickGroupSelectorProps {
  onSelectType: (type: string) => void;
  activeType: string | null;
  availableTypes: string[];
  typeCounts?: Record<string, number>;
}

const QuickGroupSelector: React.FC<QuickGroupSelectorProps> = ({ onSelectType, activeType, availableTypes, typeCounts }) => {
  const typeConfig: Record<string, { icon: any, color: string, label: string }> = {
    person: { icon: <User size={13} />, color: '#22c55e', label: 'Individu / Sasaran' },
    organization: { icon: <Building2 size={13} />, color: '#6366f1', label: 'Organisasi / Syarikat' },
    company: { icon: <Building2 size={13} />, color: '#6366f1', label: 'Syarikat' },
    location: { icon: <MapPin size={13} />, color: '#10b981', label: 'Lokasi / Geospasial' },
    phone: { icon: <Phone size={13} />, color: '#f59e0b', label: 'Nombor Telefon' },
    server: { icon: <Server size={13} />, color: '#8b5cf6', label: 'Pelayan / IP' },
    domain: { icon: <Globe size={13} />, color: '#06b6d4', label: 'Domain & Laman Web' },
    personal_id: { icon: <Fingerprint size={13} />, color: '#f43f5e', label: 'Kad Pengenalan / Pasport' },
    social: { icon: <Share2 size={13} />, color: '#3b82f6', label: 'Profil Media Sosial' },
    social_media: { icon: <Share2 size={13} />, color: '#3b82f6', label: 'Profil Media Sosial' },
    social_profile: { icon: <Share2 size={13} />, color: '#3b82f6', label: 'Profil Media Sosial' },
    email: { icon: <Mail size={13} />, color: '#eab308', label: 'Alamat E-mel' },
    fictional_character: { icon: <Sparkles size={13} />, color: '#ec4899', label: 'Watak Fiksyen' },
    fictional_object: { icon: <Gem size={13} />, color: '#d946ef', label: 'Artifak Fiksyen' },
    found_footage: { icon: <Film size={13} />, color: '#f43f5e', label: 'Found Footage' },
    cryptid_myth: { icon: <Ghost size={13} />, color: '#06b6d4', label: 'Kriptid & Mitos' },
    weapon_hardware: { icon: <Crosshair size={13} />, color: '#fb7185', label: 'Senjata & Taktikal' },
    malware_payload: { icon: <Bug size={13} />, color: '#84cc16', label: 'Malware & Eksploit' },
    biometric_evidence: { icon: <Fingerprint size={13} />, color: '#14b8a6', label: 'Biometrik & DNA' },
    surveillance_device: { icon: <Camera size={13} />, color: '#38bdf8', label: 'Penderia / Kamera Pengintip' },
    broadcast_frequency: { icon: <Radio size={13} />, color: '#fbbf24', label: 'Frekuensi Radio' },
    classified_dossier: { icon: <FileText size={13} />, color: '#ef4444', label: 'Dokumen Dossier Rahsia' },
    financial_instrument: { icon: <Landmark size={13} />, color: '#10b981', label: 'Instrumen Kewangan' },
    bank_account: { icon: <Landmark size={13} />, color: '#10b981', label: 'Akaun Bank / Mule' },
    crypto_wallet: { icon: <Coins size={13} />, color: '#f59e0b', label: 'Dompet Kripto' },
    crypto: { icon: <Coins size={13} />, color: '#f59e0b', label: 'Dompet Kripto' },
    vehicle: { icon: <Car size={13} />, color: '#94a3b8', label: 'Kenderaan' },
    darkweb_forum: { icon: <Flame size={13} />, color: '#a855f7', label: 'Forum Darknet & Pasaran' },
    satellite_imagery: { icon: <Compass size={13} />, color: '#38bdf8', label: 'Imej Satelit 3D' },
    deepfake_media: { icon: <Video size={13} />, color: '#f43f5e', label: 'Tiruan Deepfake' },
    chemical_hazard: { icon: <AlertTriangle size={13} />, color: '#eab308', label: 'Bahan Hazard CBRN' },
    quantum_cipher: { icon: <Key size={13} />, color: '#06b6d4', label: 'Kunci Kriptografi Quantum' },
    ai_model_weights: { icon: <Bot size={13} />, color: '#8b5cf6', label: 'Model AI & Ejen Autonomi' },
    anomaly_portal: { icon: <Orbit size={13} />, color: '#ec4899', label: 'Portal Anomali' },
    occult_symbol: { icon: <BookOpen size={13} />, color: '#f97316', label: 'Simbol Okultisme & Grimoire' },
    subsea_cable: { icon: <Waves size={13} />, color: '#0284c7', label: 'Kabel Kapal Selam' },
    black_budget_project: { icon: <Shield size={13} />, color: '#dc2626', label: 'Projek Black Budget' },
    evidence: { icon: <FileText size={13} />, color: '#38bdf8', label: 'Bukti & Fail' },
    target_photo: { icon: <Image size={13} />, color: '#ec4899', label: 'Foto Sasaran' },
    file: { icon: <FileCode size={13} />, color: '#a855f7', label: 'Fail Dokumen' },
    unknown: { icon: <Shapes size={13} />, color: '#cbd5e1', label: 'Entiti Am / Tidak Diketahui' }
  };

  // Helper to format unknown dynamic type names nicely instead of collapsing into "Others"
  const getDynamicConfig = (type: string) => {
    if (typeConfig[type]) return typeConfig[type];
    
    const formattedLabel = type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());

    return {
      icon: <Shapes size={13} />,
      color: '#38bdf8',
      label: formattedLabel
    };
  };

  if (availableTypes.length === 0) return null;

  return (
    <div className="flex items-center gap-1 p-1 bg-black/85 backdrop-blur-md border border-cyan-500/40 rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.8)] pointer-events-auto max-w-[94vw] sm:max-w-max overflow-x-auto custom-scrollbar">
      <div className="px-2 text-[8px] sm:text-[9px] font-black text-cyan-400 uppercase tracking-wider border-r border-white/10 shrink-0 select-none flex items-center gap-1">
        KUMPULAN NOD ({availableTypes.length})
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {availableTypes.map(type => {
          const config = getDynamicConfig(type);
          const isActive = activeType === type;
          const count = typeCounts ? typeCounts[type] : undefined;
          const tooltipText = count !== undefined ? `${config.label} (${count} Nod)` : config.label;
          
          return (
            <Tooltip key={type} content={tooltipText} position="bottom">
              <button
                onClick={() => onSelectType(type)}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all shrink-0 cursor-pointer ${
                  isActive 
                    ? 'scale-110 shadow-[0_0_15px_var(--type-color)] font-bold' 
                    : 'opacity-60 hover:opacity-100 hover:bg-white/10 active:scale-95'
                }`}
                style={{ 
                  backgroundColor: isActive ? config.color : 'transparent',
                  color: isActive ? '#000' : config.color,
                  ['--type-color' as any]: config.color
                }}
              >
                {config.icon}
              </button>
            </Tooltip>
          );
        })}
      </div>
      {activeType && (
        <button 
          onClick={() => onSelectType('')}
          className="ml-1 px-2 py-0.5 text-[8px] sm:text-[9px] font-bold text-cyan-300 hover:text-white bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 rounded-full transition-colors shrink-0 uppercase tracking-widest cursor-pointer"
        >
          Reset Filter
        </button>
      )}
    </div>
  );
};

export default QuickGroupSelector;


