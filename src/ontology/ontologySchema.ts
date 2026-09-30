/**
 * RED HORIZON - INTELLIGENCE ONTOLOGY SCHEMA
 * Formal Semantic Knowledge Representation for Law Enforcement & OSINT Investigations
 */

export type OntologyClassCategory = 
  | 'IDENTITY'
  | 'COMMUNICATIONS'
  | 'FINANCIAL'
  | 'LOGISTICS'
  | 'CYBER_INFRA'
  | 'SPATIO_TEMPORAL'
  | 'TACTICAL_EVIDENCE';

export interface OntologyPropertyDef {
  key: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'coordinate' | 'boolean' | 'enum';
  format?: string;
  isIdentifier?: boolean; // Can be used for deterministic cross-entity matching
  example?: string;
}

export interface OntologyPivotOption {
  id: string;
  label: string;
  category: 'enricher' | 'transform' | 'search' | 'visual';
  toolTarget: string;
  description: string;
  iconName?: string;
}

export interface OntologyClassDef {
  id: string;
  label: string;
  category: OntologyClassCategory;
  description: string;
  icon: string;
  color: string;
  aliases: string[];
  properties: OntologyPropertyDef[];
  suggestedPivots: OntologyPivotOption[];
}

export interface OntologyPredicateDef {
  id: string;
  label: string;
  category: 'OWNERSHIP' | 'FINANCIAL' | 'COMMUNICATION' | 'ORGANIZATIONAL' | 'SPATIO_TEMPORAL' | 'IDENTITY' | 'ASSOCIATION' | 'LOGISTICS';
  inverse?: string;
  isSymmetric?: boolean;
  isTransitive?: boolean;
  allowedSourceClasses: string[];
  allowedTargetClasses: string[];
  description: string;
  weight: number; // For graph path-finding and risk propagation
}

/**
 * Standard Intelligence Classes
 */
export const ONTOLOGY_CLASSES: Record<string, OntologyClassDef> = {
  person: {
    id: 'person',
    label: 'Individu / Sasaran (POI)',
    category: 'IDENTITY',
    description: 'Manusia, sasaran siasatan, saksi, mangsa, atau pemegang peranan jenayah.',
    icon: 'User',
    color: '#06b6d4',
    aliases: ['poi', 'target', 'suspect', 'individual', 'manusia'],
    properties: [
      { key: 'full_name', label: 'Nama Penuh', description: 'Nama rasmi mengikut kad pengenalan atau rekod rasmi', type: 'string', isIdentifier: true },
      { key: 'nric', label: 'No. Kad Pengenalan (NRIC)', description: 'Nombor MyKad 12-digit (YYMMDD-PB-###G)', type: 'string', isIdentifier: true, example: '901015-08-5431' },
      { key: 'passport', label: 'No. Pasport', description: 'Nombor pasport antarabangsa', type: 'string', isIdentifier: true },
      { key: 'dob', label: 'Tarikh Lahir', description: 'Tarikh lahir sasaran (YYYY-MM-DD)', type: 'date' },
      { key: 'gender', label: 'Jantina', description: 'Lelaki / Perempuan', type: 'string' },
      { key: 'state_of_origin', label: 'Negeri Asal', description: 'Negeri kelahiran berdasarkan kod MyKad atau rekod JPN', type: 'string' },
      { key: 'aliases', label: 'Nama Samaran / Alias', description: 'Nama panggilan, handle samaran atau samaran jalanan', type: 'string' },
      { key: 'primary_phone', label: 'No. Telefon Utama', description: 'Nombor talian atau WhatsApp yang aktif', type: 'string', isIdentifier: true },
    ],
    suggestedPivots: [
      { id: 'poi_name_alias', label: 'De-obfuscate Alias & Fonetik', category: 'enricher', toolTarget: 'poi_name_alias', description: 'Bongkar nama samaran, leetspeak dan variasi fonetik Melayu/Inggeris' },
      { id: 'poi_nric_demographics', label: 'Demografik MyKad & JPN', category: 'enricher', toolTarget: 'poi_nric_demographics', description: 'Ekstrak tarikh lahir, jantina, negeri dan verifikasi algoritma Luhn' },
      { id: 'poi_phone_telco', label: 'Analisis Pembekal Telco', category: 'enricher', toolTarget: 'poi_phone_telco', description: 'Kesan penyedia perkhidmatan (Celcom, Maxis, Digi, U Mobile)' },
      { id: 'social_recon', label: 'Peninjauan Profil Sosial', category: 'transform', toolTarget: 'SOCIAL_RECON', description: 'Cari akaun FB, Telegram, X, TikTok, IG dan forum' },
      { id: 'reverse_face_search', label: 'Pengecaman Wajah & Biometrik', category: 'enricher', toolTarget: 'poi_face_search', description: 'Cari imej muka sepadan merentasi pangkalan data' },
    ]
  },

  organization: {
    id: 'organization',
    label: 'Organisasi / Syarikat',
    category: 'IDENTITY',
    description: 'Syarikat Sendirian Berhad, pertubuhan berdaftar, sindiket, atau agensi.',
    icon: 'Building2',
    color: '#8b5cf6',
    aliases: ['company', 'syarikat', 'enterprise', 'sdn bhd', 'ngo', 'syndicate'],
    properties: [
      { key: 'company_name', label: 'Nama Syarikat / Organisasi', description: 'Nama rasmi berdaftar mengikut SSM atau ROS', type: 'string', isIdentifier: true },
      { key: 'ssm_reg', label: 'No. Pendaftaran SSM', description: 'Nombor 12 digit baharu atau format lama (XXXXXX-X)', type: 'string', isIdentifier: true, example: '202101012345' },
      { key: 'tax_no', label: 'No. Cukai (LHDN)', description: 'Nombor fail cukai syarikat', type: 'string', isIdentifier: true },
      { key: 'incorporation_date', label: 'Tarikh Penubuhan', description: 'Tarikh syarikat didaftarkan', type: 'date' },
      { key: 'registered_address', label: 'Alamat Berdaftar', description: 'Premis rasmi atau alamat setiausaha syarikat', type: 'string' },
      { key: 'status', label: 'Status Operasi', description: 'Aktif, Winding Up, Dormant, Strike Off', type: 'string' },
    ],
    suggestedPivots: [
      { id: 'ssm_company_profile', label: 'Ekstrak Profil SSM Malaysia', category: 'enricher', toolTarget: 'company_ssm_lookup', description: 'Dapatkan senarai Pengarah, Pemegang Saham, dan Modal Berbayar' },
      { id: 'corporate_web_recon', label: 'Imbasan Domain & Web Korporat', category: 'enricher', toolTarget: 'domain_whois_dns', description: 'Siasat pemilikan domain syarikat dan alamat IP hos' },
      { id: 'ubo_network_graph', label: 'Peta Pemilikan Benefisiari (UBO)', category: 'visual', toolTarget: 'GENERATE_UBO_GRAPH', description: 'Rungkai struktur pemegang saham bertingkat dan syarikat cengkerang' },
    ]
  },

  phone: {
    id: 'phone',
    label: 'Talian Telefon / WhatsApp',
    category: 'COMMUNICATIONS',
    description: 'Nombor mudah alih, talian tetap, akaun VoIP, atau ID SIM card.',
    icon: 'Phone',
    color: '#10b981',
    aliases: ['telephone', 'mobile', 'whatsapp', 'msisdn', 'hotline'],
    properties: [
      { key: 'e164', label: 'Format Antarabangsa (E.164)', description: 'Contoh: +60123456789', type: 'string', isIdentifier: true },
      { key: 'local_format', label: 'Format Tempatan', description: 'Contoh: 012-345 6789', type: 'string' },
      { key: 'country_code', label: 'Kod Negara', description: 'MY (+60), SG (+65), ID (+62), etc.', type: 'string' },
      { key: 'telco_carrier', label: 'Syarikat Telco', description: 'CelcomDigi, Maxis, U Mobile, Yoodo, Yes', type: 'string' },
      { key: 'line_type', label: 'Jenis Talian', description: 'Prabayar (Prepaid), Pascabayar (Postpaid), VoIP', type: 'string' },
      { key: 'imei', label: 'Nombor IMEI Berhubung', description: 'Pengenalpastian perkakasan peranti', type: 'string', isIdentifier: true },
    ],
    suggestedPivots: [
      { id: 'poi_phone_telco', label: 'Imbasan HLR & Telco Carrier', category: 'enricher', toolTarget: 'poi_phone_telco', description: 'Sahkan status talian aktif, operator dan kod MNC/MCC' },
      { id: 'whatsapp_lookup', label: 'Pengecaman Profil WhatsApp', category: 'transform', toolTarget: 'WHATSAPP_CHECK', description: 'Periksa gambar profil, status, dan bio WhatsApp' },
      { id: 'location_sting', label: 'Penyetempatan Sel Telekomunikasi', category: 'enricher', toolTarget: 'location_sting', description: 'Peta menara sel dan anggaran kawasan geofence' },
    ]
  },

  crypto: {
    id: 'crypto',
    label: 'Dompet Kripto / Rantaian Blok',
    category: 'FINANCIAL',
    description: 'Alamat akaun blockchain, bursa berpusat (CEX), smart contract, atau transaksi.',
    icon: 'Coins',
    color: '#f59e0b',
    aliases: ['crypto_wallet', 'blockchain', 'wallet', 'bitcoin', 'ethereum', 'usdt'],
    properties: [
      { key: 'address', label: 'Alamat Dompet (Wallet Address)', description: 'Public address (0x..., bc1..., T..., etc.)', type: 'string', isIdentifier: true },
      { key: 'blockchain', label: 'Rantaian Blok (Network)', description: 'Bitcoin, Ethereum, Tron (TRC20), Solana, BSC', type: 'string' },
      { key: 'balance', label: 'Baki Terkini', description: 'Jumlah aset dalam dompet', type: 'number' },
      { key: 'is_mixer', label: 'Indikator Pengadun (Mixer)', description: 'Berkait Tornado Cash, Blender.io, Wasabi', type: 'boolean' },
      { key: 'attributed_entity', label: 'Entiti Dikenal Pasti (CEX/Whale)', description: 'Binance, Huobi, Luno, Ransomware Group', type: 'string' },
    ],
    suggestedPivots: [
      { id: 'crypto_wallet_tracer', label: 'Jejak Transaksi Rantaian Blok', category: 'enricher', toolTarget: 'crypto_wallet_tracer', description: 'Kesan punca dana, alamat deposit bursa, dan alamat rakan transaksi' },
      { id: 'crypto_risk_aml', label: 'Skrin Risiko AML & Sekatan OFAC', category: 'enricher', toolTarget: 'crypto_risk_aml', description: 'Periksa senarai hitam pengganas, ransomware, dan pasaran gelap' },
      { id: 'crypto_hop_expansion', label: 'Pecahkan Laluan 2-Hop / 3-Hop', category: 'visual', toolTarget: 'EXPAND_CRYPTO_HOPS', description: 'Visualkan corak pelupusan dan pengaliran wang haram' },
    ]
  },

  bank_account: {
    id: 'bank_account',
    label: 'Akaun Bank / Keldai Akaun',
    category: 'FINANCIAL',
    description: 'Akaun perbankan komersial, kad debit/kredit, atau akaun keldai sindiket.',
    icon: 'CreditCard',
    color: '#ec4899',
    aliases: ['bank', 'financial_account', 'mule_account', 'akaun_bank'],
    properties: [
      { key: 'account_number', label: 'Nombor Akaun', description: 'Nombor akaun bank berangka', type: 'string', isIdentifier: true },
      { key: 'bank_name', label: 'Nama Bank', description: 'Maybank, CIMB, Public Bank, RHB, Hong Leong, dsb.', type: 'string' },
      { key: 'account_holder', label: 'Nama Pemegang Akaun', description: 'Nama individu atau syarikat berdaftar', type: 'string' },
      { key: 'is_mule', label: 'Status Keldai Akaun (Semak Mule)', description: 'Tersenarai dalam rekod NSRC / CCID PDRM', type: 'boolean' },
    ],
    suggestedPivots: [
      { id: 'semak_mule_check', label: 'Semak Rekod Keldai (CCID Mule)', category: 'enricher', toolTarget: 'semak_mule_check', description: 'Padankan nombor akaun dengan pangkalan data penipuan komersial' },
      { id: 'bank_owner_correlation', label: 'Kaitkan dengan Pemegang Akaun (POI)', category: 'transform', toolTarget: 'CORRELATE_OWNER', description: 'Cari individu yang mempunyai nama atau NRIC yang sama' },
    ]
  },

  vehicle: {
    id: 'vehicle',
    label: 'Kenderaan / Pengecaman Plat',
    category: 'LOGISTICS',
    description: 'Kereta, motosikal, lori, van, bot atau kenderaan suspek.',
    icon: 'Car',
    color: '#ef4444',
    aliases: ['car', 'motorcycle', 'plate', 'kenderaan', 'lori', 'anpr'],
    properties: [
      { key: 'plate_number', label: 'Nombor Pendaftaran / Plat', description: 'Contoh: WXX 1234, VAA 888, B 1234 CD', type: 'string', isIdentifier: true },
      { key: 'make_model', label: 'Jenama & Model', description: 'Honda Civic, Toyota Hilux, Proton X50, Yamaha Y15', type: 'string' },
      { key: 'color', label: 'Warna Kenderaan', description: 'Hitam, Putih, Kelabu, Merah', type: 'string' },
      { key: 'chassis_no', label: 'No. Casis (VIN)', description: 'Nombor Pengenalan Kenderaan (17 aksara)', type: 'string', isIdentifier: true },
      { key: 'engine_no', label: 'No. Enjin', description: 'Nombor siri blok enjin', type: 'string' },
    ],
    suggestedPivots: [
      { id: 'cctv_traffic_playback', label: 'Imbasan Laluan Kamera CCTV/LPR', category: 'visual', toolTarget: 'TRAFFIC_LPR_SCAN', description: 'Kesan lintasan plat di lebuhraya PLUS, DBKL, dan pusat pemeriksaan' },
      { id: 'vehicle_owner_trace', label: 'Kesan Pemilikan Kenderaan', category: 'enricher', toolTarget: 'vehicle_owner_trace', description: 'Hubungkan nombor plat dengan pemilik atau syarikat sewa' },
    ]
  },

  location: {
    id: 'location',
    label: 'Lokasi / Premis Fizikal',
    category: 'SPATIO_TEMPORAL',
    description: 'Alamat tempat kediaman, safehouse, koordinat GPS, atau zon pertemuan.',
    icon: 'MapPin',
    color: '#0ea5e9',
    aliases: ['premise', 'safehouse', 'address', 'coordinates', 'geo', 'tempat'],
    properties: [
      { key: 'address', label: 'Alamat Penuh', description: 'Jalan, Poskod, Bandar, Negeri', type: 'string' },
      { key: 'latitude', label: 'Latitud', description: 'Koordinat GPS WGS84', type: 'coordinate' },
      { key: 'longitude', label: 'Longitud', description: 'Koordinat GPS WGS84', type: 'coordinate' },
      { key: 'mgrs', label: 'Grid Tentera (MGRS)', description: 'Koordinat format taktikal tentera', type: 'string' },
      { key: 'premise_type', label: 'Kategori Premis', description: 'Kondominium, Gudang, Hotel, Pejabat, Tanah Lapang', type: 'string' },
    ],
    suggestedPivots: [
      { id: 'streetview_360', label: 'Tinjauan 360° Google Street View', category: 'visual', toolTarget: 'OPEN_STREETVIEW', description: 'Lihat struktur fizikal bangunan, pintu masuk, dan persekitaran' },
      { id: 'cctv_nearby_recon', label: 'Imbasan CCTV & Penderia Berdekatan', category: 'enricher', toolTarget: 'cctv_nearby_recon', description: 'Cari kamera trafik aktif dalam radius 500m dari lokasi ini' },
      { id: 'geofence_co_presence', label: 'Kesan Pertemuan Entiti (Co-Presence)', category: 'transform', toolTarget: 'INFER_CO_PRESENCE', description: 'Cari semua suspek atau kenderaan yang pernah hadir di lokasi ini' },
    ]
  },

  cyber_infra: {
    id: 'cyber_infra',
    label: 'Infrastruktur Siber (IP & Domain)',
    category: 'CYBER_INFRA',
    description: 'Alamat IP, Nama Domain, Pelayan C2, Sijil SSL, atau Perkhidmatan Awan.',
    icon: 'Globe',
    color: '#6366f1',
    aliases: ['ip', 'domain', 'server', 'c2', 'asn', 'dns'],
    properties: [
      { key: 'domain_name', label: 'Nama Domain / Hostname', description: 'Contoh: target-portal.com', type: 'string', isIdentifier: true },
      { key: 'ip_address', label: 'Alamat IPv4 / IPv6', description: 'Contoh: 104.21.55.2', type: 'string', isIdentifier: true },
      { key: 'asn', label: 'Nombor Sistem Berautonomi (ASN)', description: 'Contoh: AS13335 Cloudflare', type: 'string' },
      { key: 'ssl_fingerprint', label: 'Cap Jari Sijil SSL (SHA-256)', description: 'Hash sijil enkripsi web', type: 'string', isIdentifier: true },
    ],
    suggestedPivots: [
      { id: 'shodan_infra_scan', label: 'Imbasan Port & Kerentanan Shodan', category: 'enricher', toolTarget: 'shodan_host_recon', description: 'Periksa port terbuka, perisian pelayan, dan kerentanan CVE' },
      { id: 'whois_dns_recon', label: 'DNS Passive & Rekod Sejarah WHOIS', category: 'enricher', toolTarget: 'domain_whois_dns', description: 'Bongkar alamat emel pendaftar, name server, dan IP asal di sebalik CDN' },
    ]
  },

  incident_event: {
    id: 'incident_event',
    label: 'Acara / Insiden Operasi',
    category: 'SPATIO_TEMPORAL',
    description: 'Transaksi besar, serbuan, pertemuan bersemuka, mesyuarat, atau panggilan kecemasan.',
    icon: 'Calendar',
    color: '#f97316',
    aliases: ['event', 'meeting', 'raid', 'incident', 'insiden'],
    properties: [
      { key: 'event_title', label: 'Tajuk Acara', description: 'Ringkasan insiden', type: 'string' },
      { key: 'timestamp', label: 'Cap Masa Acara', description: 'Tarikh dan masa tepat ISO 8601', type: 'date' },
      { key: 'duration_minutes', label: 'Tempoh Masa (Minit)', description: 'Anggaran tempoh kejadian', type: 'number' },
      { key: 'significance', label: 'Tahap Kepentingan', description: 'KRITIKAL, TINGGI, SEDERHANA, RUTIN', type: 'string' },
    ],
    suggestedPivots: [
      { id: 'timeline_playback', label: 'Main Semula Garis Masa Temporal', category: 'visual', toolTarget: 'OPEN_TIMELINE', description: 'Visualkan susunan kronologi peristiwa sebelum dan selepas kejadian' },
    ]
  }
};

/**
 * Standard Intelligence Predicates (Hubungan Semantik)
 */
export const ONTOLOGY_PREDICATES: Record<string, OntologyPredicateDef> = {
  owns: {
    id: 'owns',
    label: 'Memiliki / Memegang (Owns)',
    category: 'OWNERSHIP',
    inverse: 'owned_by',
    isSymmetric: false,
    allowedSourceClasses: ['person', 'organization'],
    allowedTargetClasses: ['crypto', 'bank_account', 'vehicle', 'cyber_infra', 'location'],
    description: 'Subjek mempunyai pemilikan sah atau kawalan efektif ke atas objek sasaran.',
    weight: 95
  },
  owned_by: {
    id: 'owned_by',
    label: 'Dimiliki Oleh (Owned By)',
    category: 'OWNERSHIP',
    inverse: 'owns',
    isSymmetric: false,
    allowedSourceClasses: ['crypto', 'bank_account', 'vehicle', 'cyber_infra', 'location'],
    allowedTargetClasses: ['person', 'organization'],
    description: 'Objek berada di bawah kawalan atau hak milik subjek.',
    weight: 95
  },
  operates_vehicle: {
    id: 'operates_vehicle',
    label: 'Memandu / Menggunakan Kenderaan',
    category: 'LOGISTICS',
    inverse: 'operated_by',
    isSymmetric: false,
    allowedSourceClasses: ['person'],
    allowedTargetClasses: ['vehicle'],
    description: 'Individu dikesan memandu atau menggunakan kenderaan semasa insiden.',
    weight: 90
  },
  operated_by: {
    id: 'operated_by',
    label: 'Dipandu / Dikendalikan Oleh',
    category: 'LOGISTICS',
    inverse: 'operates_vehicle',
    isSymmetric: false,
    allowedSourceClasses: ['vehicle'],
    allowedTargetClasses: ['person'],
    description: 'Kenderaan dipandu oleh individu berkenaan.',
    weight: 90
  },
  transfers_funds_to: {
    id: 'transfers_funds_to',
    label: 'Memindahkan Dana Ke',
    category: 'FINANCIAL',
    inverse: 'received_funds_from',
    isSymmetric: false,
    isTransitive: true,
    allowedSourceClasses: ['person', 'organization', 'crypto', 'bank_account'],
    allowedTargetClasses: ['person', 'organization', 'crypto', 'bank_account'],
    description: 'Aliran transaksi kewangan atau pemindahan aset digital.',
    weight: 90
  },
  received_funds_from: {
    id: 'received_funds_from',
    label: 'Menerima Dana Dari',
    category: 'FINANCIAL',
    inverse: 'transfers_funds_to',
    isSymmetric: false,
    isTransitive: true,
    allowedSourceClasses: ['person', 'organization', 'crypto', 'bank_account'],
    allowedTargetClasses: ['person', 'organization', 'crypto', 'bank_account'],
    description: 'Penerimaan dana hasil pindahan dari punca kewangan.',
    weight: 90
  },
  communicates_with: {
    id: 'communicates_with',
    label: 'Berkomunikasi Dengan',
    category: 'COMMUNICATION',
    isSymmetric: true,
    allowedSourceClasses: ['person', 'phone'],
    allowedTargetClasses: ['person', 'phone'],
    description: 'Panggilan suara, SMS, chat WhatsApp, atau mesej bersulit.',
    weight: 85
  },
  co_located_at: {
    id: 'co_located_at',
    label: 'Hadir Di Lokasi',
    category: 'SPATIO_TEMPORAL',
    inverse: 'location_of',
    isSymmetric: false,
    allowedSourceClasses: ['person', 'vehicle', 'incident_event'],
    allowedTargetClasses: ['location'],
    description: 'Kehadiran fizikal dikesan melalui CCTV, GPS, atau saksi mata.',
    weight: 85
  },
  co_present_with: {
    id: 'co_present_with',
    label: 'Pertemuan Spatio-Temporal (Co-Presence)',
    category: 'SPATIO_TEMPORAL',
    isSymmetric: true,
    allowedSourceClasses: ['person', 'vehicle'],
    allowedTargetClasses: ['person', 'vehicle'],
    description: 'Dikesan berada di koordinat/premis yang sama pada jendela masa serentak.',
    weight: 88
  },
  director_of: {
    id: 'director_of',
    label: 'Pengarah / Lembaga Syarikat',
    category: 'ORGANIZATIONAL',
    inverse: 'has_director',
    isSymmetric: false,
    allowedSourceClasses: ['person'],
    allowedTargetClasses: ['organization'],
    description: 'Memegang jawatan pengarah atau pembuat keputusan di SSM.',
    weight: 95
  },
  has_director: {
    id: 'has_director',
    label: 'Mempunyai Pengarah',
    category: 'ORGANIZATIONAL',
    inverse: 'director_of',
    isSymmetric: false,
    allowedSourceClasses: ['organization'],
    allowedTargetClasses: ['person'],
    description: 'Syarikat mempunyai individu ini sebagai pengarah berdaftar.',
    weight: 95
  },
  shares_identifier_with: {
    id: 'shares_identifier_with',
    label: 'Berkongsi Pengecam Unik (Shared Identity Bridge)',
    category: 'IDENTITY',
    isSymmetric: true,
    allowedSourceClasses: ['person', 'organization', 'phone', 'vehicle', 'crypto', 'bank_account'],
    allowedTargetClasses: ['person', 'organization', 'phone', 'vehicle', 'crypto', 'bank_account'],
    description: 'Berkongsi NRIC, no telefon, alamat emel, atau nombor akaun yang sama.',
    weight: 99
  },
  accomplice_of: {
    id: 'accomplice_of',
    label: 'Rakan Subahat (Accomplice)',
    category: 'ASSOCIATION',
    isSymmetric: true,
    allowedSourceClasses: ['person'],
    allowedTargetClasses: ['person'],
    description: 'Bersekongkol dalam aktiviti jenayah atau kartel yang sama.',
    weight: 80
  },
  associated_with: {
    id: 'associated_with',
    label: 'Berkaitan / Bersekutu',
    category: 'ASSOCIATION',
    isSymmetric: true,
    allowedSourceClasses: ['person', 'organization', 'vehicle', 'location', 'crypto', 'phone'],
    allowedTargetClasses: ['person', 'organization', 'vehicle', 'location', 'crypto', 'phone'],
    description: 'Hubungan umum yang disahkan atau disyaki oleh penganalisis.',
    weight: 60
  }
};
