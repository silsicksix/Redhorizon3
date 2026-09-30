export interface Transform {
    id: string;
    label: string;
    description: string;
    type: 'domain' | 'person' | 'phone' | 'email' | 'server' | 'any';
    iconName?: string;
    tags?: string[];
    provider?: 'maltego' | 'native';
    statusNote?: string;
}

export interface TransformPreset {
    id: string;
    title: string;
    description: string;
    category: 'person' | 'domain' | 'server' | 'phone' | 'general' | 'maltego';
    chain: string[];
    provider?: 'maltego' | 'native';
    statusNote?: string;
    defaultDorkConfig?: Partial<{
        targetSite: string;
        fileType: string;
        exactMatch: string;
        exclude: string;
        inUrl: string;
        inTitle: string;
        inText: string;
    }>;
}

export const AVAILABLE_TRANSFORMS: Transform[] = [
    // Maltego Standard Core Transforms (Classic OSINT & Hub Transforms)
    {
        id: 'MALTEGO_TO_DNS_NAME',
        label: 'To DNS Name [DNS from Domain]',
        description: 'Menukar domain induk kepada nama DNS subsistem (ns, mx, www, mail, vpn, cname)',
        type: 'domain',
        provider: 'maltego',
        tags: ['maltego', 'dns', 'subdomain', 'infrastructure'],
        statusNote: 'Berfungsi dengan resolusi DNS terus & enjin fallback.'
    },
    {
        id: 'MALTEGO_TO_IP_ADDRESS',
        label: 'To IP Address [DNS to IP]',
        description: 'Menyelesaikan domain atau hostname sasaran kepada alamat IPv4 / IPv6 langsung',
        type: 'domain',
        provider: 'maltego',
        tags: ['maltego', 'ip', 'resolve', 'dns'],
        statusNote: 'Berfungsi melalui resolver DNS & reverse query.'
    },
    {
        id: 'MALTEGO_TO_EMAIL_ADDRESSES',
        label: 'To Email addresses [From Domain/Org]',
        description: 'Mencari dan mengekstrak alamat e-mel kakitangan bersekutu dengan domain atau organisasi',
        type: 'domain',
        provider: 'maltego',
        tags: ['maltego', 'email', 'harvest', 'domain'],
        statusNote: 'Keberkesanan bergantung pada ketersediaan rekod awam & perlindungan privasi GDPR.'
    },
    {
        id: 'MALTEGO_TO_PERSON_ALIAS',
        label: 'To Aliases [Person to Usernames]',
        description: 'Mencari alias, nama pengguna (handle), dan variasi identiti digital individu',
        type: 'person',
        provider: 'maltego',
        tags: ['maltego', 'person', 'alias', 'social'],
        statusNote: 'Menggunakan korelasi heuristik nama dan enjin carian.'
    },
    {
        id: 'MALTEGO_TO_SOCIAL_ACCOUNTS',
        label: 'To Social Accounts [Person/Handle to Socials]',
        description: 'Mengenal pasti akaun aktif individu di X, LinkedIn, GitHub, Facebook & Telegram',
        type: 'person',
        provider: 'maltego',
        tags: ['maltego', 'social', 'footprint', 'recon'],
        statusNote: 'Bergantung pada status privasi profil sasaran.'
    },
    {
        id: 'MALTEGO_TO_PHONE_NUMBERS',
        label: 'To Phone Numbers [Extract Contact Numbers]',
        description: 'Mengekstrak dan memformat nombor telefon berdaftar atau jejak kontak entiti',
        type: 'person',
        provider: 'maltego',
        tags: ['maltego', 'phone', 'contact', 'telecom'],
        statusNote: 'Ketetapan tertakluk kepada pangkalan data terbuka & regulasi telekomunikasi.'
    },
    {
        id: 'MALTEGO_TO_NETBLOCK_ASN',
        label: 'To Netblock / Autonomous System [ASN]',
        description: 'Mengenal pasti julat blok IP (CIDR) dan nombor Sistem Autonomi (AS Number/BGP)',
        type: 'server',
        provider: 'maltego',
        tags: ['maltego', 'asn', 'bgp', 'netblock', 'network'],
        statusNote: 'Berfungsi menggunakan jadual laluan BGP awam & RIR WHOIS.'
    },
    {
        id: 'MALTEGO_TO_AFFILIATE_DOMAINS',
        label: 'To Affiliate Domains [Shared IP / CName]',
        description: 'Mencari domain atau anak syarikat lain yang berkongsi IP pelayan web (Reverse IP Lookup)',
        type: 'domain',
        provider: 'maltego',
        tags: ['maltego', 'reverse-ip', 'shared-host', 'affiliate'],
        statusNote: 'Domain di sebalik Cloudflare/WAF mungkin hanya memaparkan IP proksi.'
    },

    // Web & Dorking
    { id: 'DUCKDUCKGO_DORK', label: 'DuckDuckGo Dork', description: 'Carian dork privasi lanjutan dengan penapis parameter tapak, jenis fail, & inurl', type: 'any', tags: ['dork', 'search', 'privacy'] },
    { id: 'SOCIAL_MEDIA_DORK', label: 'Social Media Recon', description: 'Pengekstrakan jejak merentas platform Facebook, X/Twitter, LinkedIn, TikTok & Instagram', type: 'person', tags: ['social', 'profile', 'dork'] },
    { id: 'WAYBACK_ARCHIVE', label: 'Wayback Archive', description: 'Semak sejarah arkib dan jejak lampau laman web di Wayback Machine', type: 'domain', tags: ['archive', 'history', 'web'] },

    // Domain & DNS Intelligence
    { id: 'WHOIS_LOOKUP', label: 'WHOIS Lookup', description: 'Dapatkan maklumat pendaftaran, pemilikan domain, dan registrar', type: 'domain', tags: ['domain', 'whois', 'registrar'] },
    { id: 'DNS_LOOKUP', label: 'DNS Records Recon', description: 'Semak rekod A, MX, NS, TXT dan infrastruktur mail pelayan', type: 'domain', tags: ['dns', 'network', 'records'] },
    { id: 'VIRUSTOTAL_SCAN', label: 'VirusTotal Threat Intel', description: 'Semak reputasi domain/IP, pengesanan malware dan ancaman siber', type: 'domain', tags: ['threat', 'security', 'malware'] },

    // Infrastructure & Network
    { id: 'SHODAN_SCAN', label: 'Shodan Scanner', description: 'Imbas port terbuka, perkhidmatan pelayan, dan kerentanan CVE', type: 'server', tags: ['shodan', 'iot', 'ports'] },
    { id: 'IP_GEOLOCATE', label: 'IP Geolocation & ASN', description: 'Kesan lokasi geografi IP, pembekal ISP, dan maklumat autonomi ASN', type: 'server', tags: ['ip', 'geo', 'asn'] },

    // Person & Phone Intelligence
    { id: 'TRUECALLER_LOOKUP', label: 'Truecaller Search', description: 'Cari identiti pemanggil dan nama berdaftar nombor telefon', type: 'phone', tags: ['phone', 'callerid', 'contact'] },
    { id: 'NUMVERIFY_LOOKUP', label: 'NumVerify Validator', description: 'Sahkan format nombor, jenis talian (Mobile/Landline), dan pembekal syarikat telco', type: 'phone', tags: ['phone', 'carrier', 'validate'] },

    // AI & Automated Graph Expansion
    { id: 'GEMINI_ENTITY_EXPAND', label: 'AI Entity Auto-Expand', description: 'Analisis AI Gemini untuk mengekstrak entiti berkaitan dan menjana sub-nod terus ke graf', type: 'any', tags: ['ai', 'gemini', 'graph'] },
    { id: 'TAVILY_INTEL_SCAN', label: 'Tavily Deep Intel Scan', description: 'Carian risikan web pintar dan auto-jana nod bukti ke dalam graf', type: 'any', tags: ['tavily', 'intel', 'graph'] },
    { id: 'HORIZON_SCAN', label: 'Horizon12 Breach Recon', description: 'Imbasan korelasi pangkalan data tiris dan ancaman gelap', type: 'any', tags: ['breach', 'darkweb', 'leak'] },
];

export const DEFAULT_TRANSFORM_PRESETS: TransformPreset[] = [
    {
        id: 'preset_maltego_full_domain',
        title: '⚡ Maltego Full Footprint [Domain Level 3]',
        description: 'To DNS Name ➔ To IP Address ➔ To Netblock/ASN ➔ To Affiliate Domains',
        category: 'maltego',
        chain: ['MALTEGO_TO_DNS_NAME', 'MALTEGO_TO_IP_ADDRESS', 'MALTEGO_TO_NETBLOCK_ASN', 'MALTEGO_TO_AFFILIATE_DOMAINS']
    },
    {
        id: 'preset_maltego_person_dossier',
        title: '🎯 Maltego Person Profiler [Person Level 2]',
        description: 'To Aliases ➔ To Social Accounts ➔ To Email Addresses ➔ AI Correlation',
        category: 'maltego',
        chain: ['MALTEGO_TO_PERSON_ALIAS', 'MALTEGO_TO_SOCIAL_ACCOUNTS', 'MALTEGO_TO_EMAIL_ADDRESSES', 'GEMINI_ENTITY_EXPAND']
    },
    {
        id: 'preset_domain_recon',
        title: '🌐 Siasatan Penuh Domain & DNS',
        description: 'WHOIS ➔ DNS Records ➔ Wayback Archive ➔ Dorking Dokumen Sulit',
        category: 'domain',
        chain: ['WHOIS_LOOKUP', 'DNS_LOOKUP', 'WAYBACK_ARCHIVE', 'DUCKDUCKGO_DORK'],
        defaultDorkConfig: {
            fileType: 'pdf, docx, xlsx, conf',
            exactMatch: 'sulit'
        }
    },
    {
        id: 'preset_person_footprint',
        title: '👤 Jejak Profil & Media Sosial',
        description: 'Social Recon ➔ DuckDuckGo Dork ➔ AI Entity Expansion',
        category: 'person',
        chain: ['SOCIAL_MEDIA_DORK', 'DUCKDUCKGO_DORK', 'GEMINI_ENTITY_EXPAND'],
        defaultDorkConfig: {
            exactMatch: ''
        }
    },
    {
        id: 'preset_server_threat',
        title: '⚡ Analisis Infrastruktur & Ancaman IP',
        description: 'IP Geolocation & ASN ➔ Shodan Scanner ➔ VirusTotal Threat Intel',
        category: 'server',
        chain: ['IP_GEOLOCATE', 'SHODAN_SCAN', 'VIRUSTOTAL_SCAN']
    },
    {
        id: 'preset_phone_recon',
        title: '📱 Pengesahan & Identiti Telefon',
        description: 'Truecaller Search ➔ NumVerify Validator ➔ DuckDuckGo Search',
        category: 'phone',
        chain: ['TRUECALLER_LOOKUP', 'NUMVERIFY_LOOKUP', 'DUCKDUCKGO_DORK']
    },
    {
        id: 'preset_ai_deep_graph',
        title: '🧠 AI Autonomous Intel Synthesis',
        description: 'Tavily Deep Intel ➔ AI Entity Auto-Expand ➔ DuckDuckGo Dork',
        category: 'general',
        chain: ['TAVILY_INTEL_SCAN', 'GEMINI_ENTITY_EXPAND', 'DUCKDUCKGO_DORK']
    },
    {
        id: 'preset_maltego_infra_full',
        title: '⚡ Maltego: Full Infrastructure Footprint',
        description: 'To DNS Name ➔ To IP Address ➔ Netblock & ASN ➔ Affiliate Domains',
        category: 'maltego',
        provider: 'maltego',
        statusNote: 'Resolusi DNS berasaskan pangkalan data awam & fallback.',
        chain: ['MALTEGO_TO_DNS_NAME', 'MALTEGO_TO_IP_ADDRESS', 'MALTEGO_TO_NETBLOCK_ASN', 'MALTEGO_TO_AFFILIATE_DOMAINS']
    },
    {
        id: 'preset_maltego_person_social',
        title: '⚡ Maltego: Person Identity & Social Mesh',
        description: 'To Person Alias ➔ To Social Accounts ➔ To Phone Numbers',
        category: 'maltego',
        provider: 'maltego',
        statusNote: 'Tertakluk kepada dasar privasi platform & ketersediaan pemegang.',
        chain: ['MALTEGO_TO_PERSON_ALIAS', 'MALTEGO_TO_SOCIAL_ACCOUNTS', 'MALTEGO_TO_PHONE_NUMBERS']
    },
    {
        id: 'preset_maltego_domain_harvest',
        title: '⚡ Maltego: Domain Recon & Email Harvest',
        description: 'WHOIS Lookup ➔ To Email Addresses ➔ To DNS Name ➔ To IP Address',
        category: 'maltego',
        provider: 'maltego',
        statusNote: 'WHOIS Privacy/Proxy mungkin menyembunyikan e-mel sebenar.',
        chain: ['WHOIS_LOOKUP', 'MALTEGO_TO_EMAIL_ADDRESSES', 'MALTEGO_TO_DNS_NAME', 'MALTEGO_TO_IP_ADDRESS']
    }
];

