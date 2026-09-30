import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Node } from '../types';
import { X, Plus, Save, Edit2, Upload, Sparkles, Brain, Check, ShieldCheck, Tag } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import { extractOntologySlotsFromText, inferBestOntologyClass, ExtractedOntologySlot } from '../ontology/ontologyNormalizer';
import { ONTOLOGY_CLASSES } from '../ontology/ontologySchema';

interface ManualEntryModalProps {
  initialNode: Node | null;
  onAddNode: (node: Node) => void;
  onEditNode: (node: Node) => void;
  onClose: () => void;
}

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ initialNode, onAddNode, onEditNode, onClose }) => {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<Node['type']>('person');
  const [details, setDetails] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [userOverrodeType, setUserOverrodeType] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialNode) {
      setLabel(initialNode.label || '');
      setType(initialNode.type || 'person');
      setDetails(initialNode.details || '');
      setImageUrl(initialNode.imageUrl || '');
      setUserOverrodeType(true);
    }
  }, [initialNode]);

  // Real-time ontology slot extraction from label + details
  const extractedSlots = useMemo(() => {
    return extractOntologySlotsFromText(`${label} ${details}`);
  }, [label, details]);

  // Automatically suggest/switch ontology type if user hasn't explicitly locked it
  useEffect(() => {
    if (!userOverrodeType && (label || details)) {
      const suggested = inferBestOntologyClass(label, details, type);
      if (suggested && suggested !== type) {
        setType(suggested);
      }
    }
  }, [label, details, userOverrodeType, type]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, 400, 400, 0.65);
      setImageUrl(compressed);
    } catch (err) {
      console.error('Failed to compress image:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const nodeData: Node = {
      id: initialNode ? initialNode.id : `manual_${Date.now()}`,
      label: label.trim(),
      type,
      details: details.trim(),
      imageUrl: imageUrl || undefined,
      sourceType: 'manual',
      metadata: {
        ...(initialNode?.metadata || {}),
        ontologySlots: extractedSlots,
        ontologyClass: type,
        isOntologyNormalized: true,
        lastNormalizedAt: new Date().toISOString()
      }
    };

    if (initialNode) onEditNode(nodeData);
    else onAddNode(nodeData);
    onClose();
  };

  const selectedClassDef = ONTOLOGY_CLASSES[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg bg-[#0a0f18] border border-cyan-500/80 shadow-[0_0_35px_rgba(6,182,212,0.25)] p-6 font-mono text-gray-200">
        <div className="flex justify-between items-center mb-5 border-b border-cyan-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Brain className="text-cyan-400 animate-pulse" size={18} />
            <h3 className="text-cyan-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
              {initialNode ? <Edit2 size={15} /> : <Plus size={15} />}
              {initialNode ? 'Sunting Entiti (Ontology Ingestion)' : 'Daftar Entiti Baharu (Ontology Ingestion)'}
            </h3>
          </div>
          <button onClick={onClose}><X className="text-gray-500 hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-400 uppercase font-bold">Label / Nama Sasaran</label>
              {selectedClassDef && (
                <span className="text-[10px] text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-1.5 py-0.5 rounded font-bold">
                  Kelas: {selectedClassDef.label}
                </span>
              )}
            </div>
            <input 
              value={label} 
              onChange={e => setLabel(e.target.value)} 
              placeholder="cth: Wan Kalisa, 012-345 6789, WXX 1234, atau Syarikat Sdn Bhd"
              className="w-full bg-black/80 border border-gray-700 text-white text-sm p-2 outline-none focus:border-cyan-400 rounded" 
              autoFocus 
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Kelas Ontologi (Entity Class)</label>
            <select 
              value={type} 
              onChange={e => {
                setType(e.target.value as any);
                setUserOverrodeType(true);
              }} 
              className="w-full bg-black/80 border border-gray-700 text-white text-sm p-2 outline-none focus:border-cyan-400 rounded"
            >
              <optgroup label="Teras & Identiti (Core / Identity)">
                <option value="person">Individu / Sasaran (Person / POI)</option>
                <option value="organization">Syarikat / Organisasi (Organization / Company)</option>
                <option value="location">Lokasi / Premis / Safehouse (Location)</option>
                <option value="personal_id">Kad Pengenalan / Pasport (ID / Passport)</option>
              </optgroup>
              <optgroup label="Komunikasi, Siber & Logistik (Comms & Logistics)">
                <option value="phone">Nombor Telefon / WhatsApp (Phone)</option>
                <option value="vehicle">Kenderaan / Plat Pendaftaran (Vehicle)</option>
                <option value="crypto">Dompet Kripto / Rantaian Blok (Crypto Wallet)</option>
                <option value="email">Alamat E-mel (Email)</option>
                <option value="social_media">Profil Media Sosial (Social)</option>
                <option value="domain">Domain / Laman Web (Domain)</option>
                <option value="server">Pelayan / Alamat IP (Server / IP)</option>
              </optgroup>
              <optgroup label="Forensik & Taktikal Keselamatan (Tactical & Forensics)">
                <option value="financial_instrument">Akaun Bank / Keldai Akaun (Bank / Mule)</option>
                <option value="weapon_hardware">Senjata & Perkakasan Taktikal (Weapon)</option>
                <option value="classified_dossier">Dokumen Rahsia & Fail Sulit (Dossier)</option>
                <option value="darkweb_forum">Forum Darknet & Pasaran Gelap (Darknet)</option>
                <option value="incident_event">Acara / Pertemuan / Insiden (Event)</option>
              </optgroup>
              <optgroup label="Lain-lain (Others)">
                <option value="file">Fail Dokumen (File / Doc)</option>
                <option value="unknown">Lain-lain / Tidak Diketahui (Unknown)</option>
              </optgroup>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-400 uppercase font-bold">Maklumat Risikan (Intelligence Details)</label>
              <span className="text-[10px] text-gray-500">Mendukung nota bebas, NRIC, telefon, plat, hash</span>
            </div>
            <textarea 
              value={details} 
              onChange={e => setDetails(e.target.value)} 
              rows={3} 
              placeholder="Masukkan sebarang catatan, perbualan HUMINT, nombor telefon atau plat kereta..."
              className="w-full bg-black/80 border border-gray-700 text-white text-xs p-2 outline-none focus:border-cyan-400 rounded resize-none" 
            />
          </div>

          {/* Real-time Ontology Slot Detection Strip */}
          {extractedSlots.length > 0 && (
            <div className="bg-cyan-950/40 border border-cyan-800/60 p-2.5 rounded space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cyan-300 font-bold flex items-center gap-1">
                  <Sparkles size={11} className="text-cyan-400 animate-spin-slow" />
                  Atribut Ontologi Dikesan Secara Automatik ({extractedSlots.length}):
                </span>
                <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-bold">
                  <ShieldCheck size={10} /> Sedia Untuk Korelasi Silang
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {extractedSlots.map((slot, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1 text-[10px] bg-black/70 text-cyan-200 border border-cyan-700/60 px-2 py-0.5 rounded font-mono"
                  >
                    <Tag size={9} className="text-cyan-400" />
                    <span>{slot.label}</span>
                    {slot.metadata?.carrier && <span className="text-gray-400">({slot.metadata.carrier})</span>}
                    {slot.metadata?.stateOfOrigin && <span className="text-gray-400">({slot.metadata.stateOfOrigin})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-400 uppercase font-bold">Foto / URL Gambar Profil</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-cyan-400 hover:text-white flex items-center gap-1 font-bold underline"
              >
                <Upload size={11} /> {isCompressing ? 'Memampatkan...' : 'Muat Naik Gambar'}
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleImageFileChange} 
              className="hidden" 
            />
            <input 
              value={imageUrl} 
              onChange={e => setImageUrl(e.target.value)} 
              placeholder="https://... atau klik 'Muat Naik Gambar'" 
              className="w-full bg-black/80 border border-gray-700 text-white text-xs p-2 outline-none focus:border-cyan-400 rounded" 
            />
            {imageUrl && (
              <div className="mt-2 flex items-center gap-2 bg-zinc-900/90 p-2 rounded border border-zinc-800">
                <img src={imageUrl} alt="" className="w-10 h-10 object-cover rounded border border-cyan-500/40" />
                <span className="text-[10px] text-zinc-400 truncate flex-1">Gambar bersedia diselaraskan</span>
                <button type="button" onClick={() => setImageUrl('')} className="text-rose-400 text-xs font-bold">Padam</button>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold uppercase py-2.5 rounded transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-cyan-950"
          >
            <Save size={16} /> 
            <span>Simpan Entiti & Sahkan Ontologi</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManualEntryModal;
