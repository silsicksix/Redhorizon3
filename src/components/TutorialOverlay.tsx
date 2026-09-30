import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Book, Target, Search, FileText, Share2, Cpu, Globe, Key, Eye, Fingerprint, Database, 
    Users, ShieldAlert, Navigation, BrainCircuit, ScanSearch, Hash, FileCode, MapPin, Edit2, 
    MessageCircle, Briefcase, Binary, Layers, Network, Clock, Zap, Save, Download, Copy, 
    Trash2, HardDrive, Link as LinkIcon, Terminal, Smartphone, AlertTriangle, Check, 
    ChevronRight, Sparkles, Server, ArrowRight, Laptop, Filter, Code2, MonitorCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectDevice, DeviceInfo } from '../utils/deviceDetection';

interface TutorialOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

interface StepItem {
    stepNumber: number;
    title: string;
    command?: string;
    explanation: string;
    note?: string;
}

interface TroubleshootingItem {
    error: string;
    cause: string;
    solution: string;
    command?: string;
}

interface TutorialItem {
    id: string;
    icon: React.ReactNode;
    title: string;
    category: 'system' | 'radial' | 'termux';
    description: string;
    useCase?: string;
    steps?: StepItem[];
    troubleshooting?: TroubleshootingItem[];
    exampleCurl?: string;
    jsonExample?: string;
    quickCommands?: { label: string; cmd: string }[];
}

const termuxTutorials: TutorialItem[] = [
    {
        id: 'termux-installation-guide',
        icon: <Smartphone size={24} className="text-emerald-400" />,
        title: 'Panduan Pasang & Jalankan di Termux (Android)',
        category: 'termux',
        description: 'Panduan lengkap langkah demi langkah untuk memasang dan menjalankan enjin RedHorizon OSINT di dalam aplikasi Termux Android menggunakan Node.js.',
        useCase: 'Menjalankan enjin risikan OSINT secara terus dari telefon pintar Android anda tanpa memerlukan PC.',
        steps: [
            {
                stepNumber: 1,
                title: 'Kemas kini Repositori Termux',
                command: 'pkg update -y && pkg upgrade -y',
                explanation: 'Pastikan semua pakej asas Termux dikemas kini ke versi terkini bagi mengelakkan isu kebergantungan perpustakaan.',
                note: 'Jika ditanya soalan konfigurasi semasa kemas kini, tekan ENTER untuk kekalkan default.'
            },
            {
                stepNumber: 2,
                title: 'Pasang Node.js, Git & Perkakas Penting',
                command: 'pkg install nodejs-lts git curl nano openssh -y',
                explanation: 'RedHorizon dibina menggunakan Node.js (bukan pakej modul Python stand-alone). Pemasangan Node.js LTS adalah wajib.',
                note: 'Gunakan nodejs-lts untuk kestabilan maksimum di persekitaran Android ARM/ARM64.'
            },
            {
                stepNumber: 3,
                title: 'Klon / Masuk ke Direktori RedHorizon',
                command: 'git clone https://github.com/your-repo/redhorizon-osint.git && cd redhorizon-osint',
                explanation: 'Muat turun kod sumber aplikasi ke dalam storan peribadi Termux anda dan beralih ke folder projek.'
            },
            {
                stepNumber: 4,
                title: 'Pasang Pakej Kebergantungan (Dependencies)',
                command: 'npm install',
                explanation: 'Memasang semua modul TypeScript, Vite, dan Express yang diperlukan oleh aplikasi RedHorizon.'
            },
            {
                stepNumber: 5,
                title: 'Mulakan Pelayan Pembangunan (Dev Server)',
                command: 'npm run dev',
                explanation: 'Pelayan tempatan akan dimulakan pada port 3000 (http://localhost:3000).',
                note: 'Biarkan skrin Termux ini terus berjalan. Buka pelayar web (Chrome/Brave) di telefon anda dan layari http://localhost:3000.'
            }
        ],
        troubleshooting: [
            {
                error: "Error: Cannot find module / Command not found",
                cause: "Pakej dependensi atau arahan belum dipasang sepenuhnya di persekitaran Termux/PC.",
                solution: "Jalankan 'npm install' atau pasang modul yang diperlukan sebelum memulakan pelayan.",
                command: "npm install"
            },
            {
                error: "Error: EADDRINUSE: address already in use :::3000",
                cause: "Port 3000 sedang digunakan oleh proses lain atau sesi Node.js terdahulu masih aktif di latar belakang.",
                solution: "Hentikan proses Node.js lama menggunakan arahan killall.",
                command: "killall -9 node"
            }
        ]
    },
    {
        id: 'termux-cli-recon',
        icon: <Terminal size={24} className="text-emerald-400" />,
        title: 'Siasatan CLI dari Termux (Carian Target / SSM)',
        category: 'termux',
        description: 'Cara menjalankan pertanyaan siasatan entiti sasaran (seperti Syarikat, SSM, Individu, Nombor Telefon) terus dari command line Termux menggunakan cURL API.',
        useCase: 'Melakukan siasatan risikan pantas tanpa perlu membuka antaramuka grafik browser.',
        steps: [
            {
                stepNumber: 1,
                title: 'Pastikan Pelayan Aktif atau Gunakan URL Cloud',
                explanation: 'Anda boleh menghantar arahan cURL sama ada ke localhost:3000 (jika pelayan berjalan di Termux) atau ke URL pelayan cloud RedHorizon.'
            },
            {
                stepNumber: 2,
                title: 'Contoh Siasatan Korporat (Cth: Radicare (M) Sdn Bhd)',
                command: `curl -s -X POST "http://localhost:3000/api/gemini/generate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Lakukan siasatan OSINT terhadap entiti sasaran: Radicare (M) Sdn Bhd. Senaraikan: 1. No Pendaftaran SSM / Status Syarikat 2. Lembaga Pengarah & Pegangan Saham 3. Alamat Ibu Pejabat & Cawangan 4. Tender Kerajaan / Kontrak Utama 5. Jejak Berita & Risiko."
  }' | jq .text`,
                explanation: 'Menghantar payload siasatan mendalam kepada enjin AI RedHorizon dan memaparkan laporan terus di terminal anda.'
            },
            {
                stepNumber: 3,
                title: 'Contoh Carian Nombor Telefon / Truecaller Recon',
                command: `curl -s -X POST "http://localhost:3000/api/gemini/generate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Lakukan analisis nombor telefon sasaran +60123456789. Periksa profil nama, kemungkinan operator telekomunikasi, dan jejak kebocoran data jika ada."
  }' | jq .text`,
                explanation: 'Ekstrak profil dan jejak digital nombor telefon secara automatik melalui CLI.'
            }
        ],
        quickCommands: [
            {
                label: 'Carian Pantas Syarikat (SSM)',
                cmd: `curl -s -X POST "http://localhost:3000/api/gemini/generate" -H "Content-Type: application/json" -d '{"prompt":"Siasat profil SSM syarikat: Radicare (M) Sdn Bhd"}'`
            },
            {
                label: 'Carian Username / Gelaran Sasaran',
                cmd: `curl -s -X POST "http://localhost:3000/api/gemini/generate" -H "Content-Type: application/json" -d '{"prompt":"Lakukan username recon merentasi 500 platform untuk: target_username"}'`
            }
        ]
    },
    {
        id: 'termux-tunneling-uplink',
        icon: <Server size={24} className="text-emerald-400" />,
        title: 'Akses Dari Luar: Tunneling (Serveo / Pinggy / Localtunnel)',
        category: 'termux',
        description: 'Cara menyambungkan pelayan RedHorizon Termux anda supaya boleh diakses dari mana-mana peranti melalui terowong selamat (Public Tunnel) tanpa perlu root atau port forwarding.',
        useCase: 'Mengakses dashboard dari laptop atau berkongsi uplink dengan rakan sepasukan semasa pelayan berjalan di Termux telefon anda.',
        steps: [
            {
                stepNumber: 1,
                title: 'Buka Tab / Sesi Baharu di Termux',
                explanation: 'Sapu (swipe) dari tepi kiri skrin Termux ke kanan dan tekan "New Session" supaya pelayan dev tidak terhenti.'
            },
            {
                stepNumber: 2,
                title: 'Pilihan 1: Serveo.net (Paling Pantas, Tiada Install)',
                command: 'ssh -R 80:localhost:3000 serveo.net',
                explanation: 'Serveo akan memberikan satu URL awam HTTPS secara langsung seperti https://xxxx.serveo.net.'
            },
            {
                stepNumber: 3,
                title: 'Pilihan 2: Pinggy.io',
                command: 'ssh -p 443 -R0:localhost:3000 a.pinggy.io',
                explanation: 'Alternatif stabil yang memberikan pautan percuma HTTPS.'
            },
            {
                stepNumber: 4,
                title: 'Pilihan 3: Localtunnel',
                command: 'npx localtunnel --port 3000',
                explanation: 'Menggunakan pakej npm localtunnel untuk menghasilkan URL terowong.'
            }
        ]
    }
];

const systemModules: TutorialItem[] = [
    {
        id: 'collab-ops-room',
        icon: <Users size={24} className="text-cyan-400 animate-pulse" />,
        title: 'Bilik Operasi Kolaboratif & Sembang Langsung (Real-time Ops Room)',
        category: 'system',
        description: 'Sistem bilik gerakan siasatan langsung di awan (Google Cloud & Firestore). Membolehkan anda dan rakan-rakan berkolaborasi serentak: bersembang di ruang operasi, berkongsi nod sasaran dengan satu klik, dan melompat (Focus Canvas) terus ke nod yang dibincangkan rakan.',
        useCase: 'Apabila anda menjalankan operasi bersama 2 hingga 50 rakan sepasukan. Setiap penemuan baharu boleh dihebahkan ke chat dan diselaraskan ke kanvas semua ahli secara masa nyata.'
    },
    {
        id: 'advanced-search',
        icon: <Search size={24} />,
        title: 'Advanced Intel Discovery',
        category: 'system',
        description: 'Enjin carian sentral (Global Search) yang menjejaki dan mencari padanan kata kunci di setiap penjuru rekod timeline dan pangkalan data graf secara memyeluruh.',
        useCase: 'Apabila anda mempunyai lambakan node dan timeline yang terlalu panjang dan padat. Fungsi ini mempercepatkan pencarian suspek / target spesifik dengan segera.'
    },
    {
        id: 'case-manager',
        icon: <Briefcase size={24} />,
        title: 'Mission Control (Case Manager)',
        category: 'system',
        description: 'Pusat kawalan utama untuk mengurus ruang kerja (workspaces / kes) yang berbeza. Memisahkan konteks graf dan data antara satu siasatan dengan siasatan yang lain.',
        useCase: 'Apabila anda mahu memulakan siasatan baru tanpa mencampur-adukkan data kes sebelumnya.'
    },
    {
        id: 'smart-filter',
        icon: <Target size={24} />,
        title: 'File Scanner (Smart Data Extraction)',
        category: 'system',
        description: 'Anda boleh memuat naik fail PDF, TXT atau fail rawak. Sistem akan membaca kandungan secara chunking, mengekstrak entiti penting seperti nama, IP, email dan no. telefon secara berstruktur.',
        useCase: 'Apabila anda mempunyai lambakan fail dokumen siasatan yang perlu diurai (parse) secara berpusat kepada bentuk graf.'
    },
    {
        id: 'big-data',
        icon: <HardDrive size={24} />,
        title: 'Big Data Scanner (Logs/DUMPS)',
        category: 'system',
        description: 'Mencari dan memadan rentetan data spesifik daripada log/pangkalan data kebocoran pukal yang anda muat naik, untuk mencari padanan secara lansung dengan graf sedia ada.',
        useCase: 'Menyemak fail log besar (gigabytes) dari darkweb atau leak awam untuk melihat ada nama mangsa di dalamnya.'
    },
    {
        id: 'offline-logic',
        icon: <Binary size={24} />,
        title: 'Offline Regex',
        category: 'system',
        description: 'Menggunakan Regular Expressions (Regex) secara automatik untuk mengekstrak lambakan e-mel, IP, atau nombor yang berselerak daripada fail log yang kompleks sepenuhnya di dalam pelayar lokal anda tanpa dihantar ke AI server.',
        useCase: 'Apabila target data terlalu besar dan sensitif (e.g. data sulit telco).'
    },
    {
        id: 'image-intel',
        icon: <Eye size={24} />,
        title: 'Image Intelligence (EXIF)',
        category: 'system',
        description: 'Sistem akan mengekstrak EXIF metadata dari imej untuk mendedahkan model kamera, masa diambil, dan koordinat GPS terselindung di dalam fail gambar.',
        useCase: 'Memeriksa gambar yang di muat naik sasaran yang belum dibuang data metadatanya.'
    },
    {
        id: 'forensic-vault',
        icon: <Layers size={24} />,
        title: 'Forensic Vault',
        category: 'system',
        description: 'Makmal pemfailan digital. Sistem menyusun fail-fail berisiko seperti dokumen hasad, kemudian mengekstrak Hash fail (MD5/SHA) dan jejak pelayan (Indicators of Compromise).',
        useCase: 'Siasatan perisian tebusan (ransomware) atau fail virus dari insiden siber.'
    },
    {
        id: 'social-analyzer',
        icon: <MessageCircle size={24} />,
        title: 'Social Graph Analyzer',
        category: 'system',
        description: 'Modul menganalisis senarai kawan atau mutual followers untuk mencari titik pusat siapa dalang (hub) utama dalam sindiket yang membolehkan sasaran bergaul.',
        useCase: 'Menentukan siapa ketua dalam kawan-kawan suspek berdasarkan hubungan berbilang paksi (Mutual connections).'
    },
    {
        id: 'osint-engine',
        icon: <Search size={24} />,
        title: 'OSINT AI Engine (Deep Analysis)',
        category: 'system',
        description: 'Sistem analisis komprehensif menggunakan Gen-AI. Sistem boleh mengekstrak log JSON media sosial dan mengklasifikasikan tahap ancaman, emosi serta mencadangkan langkah-langkah serangan (Attack Vector) seterusnya.',
        useCase: 'Bila anda menerima dump komen JSON atau post media sosial yang banyak dan ingin merujuk AI untuk anomali.'
    },
    {
        id: 'stylometry',
        icon: <Fingerprint size={24} />,
        title: 'Stylometry Lab',
        category: 'system',
        description: 'AI akan menganalisis dua atau lebih sampel tulisan untuk mencari persamaan linguistik. Sistem melihat penggunaan kata, struktur ayat, tanda baca untuk membuktikan sama ada 2 akaun sosial dikawal oleh orang yang sama (Puppet/Sockpuppet accounts).',
        useCase: 'Menyiasat sama ada 2 akaun (contohnya scammer dan tukang sokong) di media sosial adalah individu yang sama.'
    },
    {
        id: 'sna-analysis',
        icon: <Network size={24} />,
        title: 'Network Analysis (SNA Math)',
        category: 'system',
        description: 'Melaksanakan pengiraan saintifik Matematik Analisis Rangkaian Sosial (SNA) antaranya "Degree Centrality", "Betweenness" untuk secara automatik mempamerkan graf nod yang mempunyai berat impak paling tinggi.',
        useCase: 'Apabila node sasaran mencapai puluhan, AI memformulasikan nombor untuk mencari "Top Broker" maklumat.'
    },
    {
        id: 'timeline',
        icon: <Clock size={24} />,
        title: 'Chronological Timeline',
        category: 'system',
        description: 'Menyemak imbas kronologi peristiwa kesemua pautan bermasa. Setiap node yang mengandungi tarikh kejadian (createdAt/timestamp) akan dipaparkan dalam bentuk garis masa berlapis (Gantt-like).',
        useCase: 'Membina jalan penceritaan secara berurutan bila kejadian komunikasi suspek A ke mangsa direkodkan.'
    },
    {
        id: 'geo-recon',
        icon: <MapPin size={24} />,
        title: 'Geospatial Reconnaissance',
        category: 'system',
        description: 'Map intel yang menggunakan API Geo untuk memetakan koordinat kepada kawasan fizikal serta menterjemah maklumat alamat (OSM/Leaflet).',
        useCase: 'Anda menerima IP Address (Sila extract geo dari IP dahulu dan node tersebut akan ada lat/long) atau GPS dari imej untuk dilihat secara visual.'
    },
    {
        id: 'report-generator',
        icon: <BrainCircuit size={24} />,
        title: 'Report Generator (Synthesis)',
        category: 'system',
        description: 'Memuktamadkan hasil kerja di papan graf kepada satu laporan risikan eksekutif akhir (PDF/Markdown) dibantu AI yang menjelaskan konklusi dari graf visual.',
        useCase: 'Mengeluarkan format siasatan bagi pembentangan kepada agensi atau stakeholder tertinggi (Strategic Synthesis).'
    },
    {
        id: 'transform-manager',
        icon: <Zap size={24} />,
        title: 'Transform Manager',
        category: 'system',
        description: 'Membolehkan jurutera ancaman mencipta arahan pasang-siap (Transformers API/Local script) untuk mengubah input Node kepada pelbagai Output tanpa coding keras (hardcoding).',
        useCase: 'Menambah arahan siasat pihak ketiga tersendiri seperti integrasi API Carian Polis yang hanya syarikat anda ada.'
    },
    {
        id: 'web-capture',
        icon: <Globe size={24} />,
        title: 'Web Screenshot (SnapRender)',
        category: 'system',
        description: 'Sistem bersepadu SnapRender API bertindak untuk menangkap adegan visual daripada URL (Screenshot). Ia membolehkan ciri OCR (Pengecaman Teks Optik) dari Gemini AI supaya sebarang teks dalam gambar akan diekstrak dan disuntik ke dalam nod. Ini membolehkan teks di dalam gambar tersebut searchable oleh Global Search (Advanced Intel Discovery) di kemudian hari.',
        useCase: 'Merakam bukti dari laman web pancingan data (phishing) atau sesawang ancaman secara cepat dan mengekstrak tulisan di dalamnya ke graf untuk dicari menggunakan Global Search jika jumlah graf sudah terlalu padat.'
    },
    {
        id: 'share-trace',
        icon: <LinkIcon size={24} />,
        title: 'ShareTrace (Link Analyzer)',
        category: 'system',
        description: 'Menemui asal-usul pemilik pautan perkongsian dengan mengekstrak parameter carian (seperti base64, hash, id pengguna). Ia meniru ciri Soxoj/ShareTrace untuk membongkar metahash atau ID pengguna di sebalik pautan kongsi dari platform seperti Spotify, TikTok, dan VK.',
        useCase: 'Apabila anda menjumpai pautan yang disebarkan dalam forum gelap, gunakan modul ini untuk menjejak siapakah pendaftar atau ID akaun asalnya.'
    },
    {
        id: 'export-tools',
        icon: <Save size={24} />,
        title: 'Save & Export Tools',
        category: 'system',
        description: 'Kombinasi alatan menyimpan (Save File .RHZ), eksport graf kompatibel kepada CSV Maltego (Standard Industri), serta eksport prompt graf ke format yang sedia di paste ke ChatGPT/Claude Luaran.',
        useCase: 'Bekerja cross-platform atau meneruskan siasatan di perisian OSINT komersial seperti Maltego CaseFile.'
    }
];

const nodeActionsTutorial: TutorialItem[] = [
    {
        id: 'node-edit-link',
        icon: <Edit2 size={24} />,
        title: 'Asas: Edit, Link & Delete',
        category: 'radial',
        description: 'Tindakan asas (Basic Actions) untuk mengawal node di atas kanvas. Anda boleh mengubah pangkalan maklumat, menyambung dua node yang berbeza untuk membongkar hubungkait, atau memadam node yang tidak relevan secara manual.',
        useCase: 'Apabila anda mahu merapikan graf siasatan secara manual, menambah maklumat hasil temubual secara terus pada entiti sedia ada.'
    },
    {
        id: 'node-search-ai',
        icon: <Search size={24} />,
        title: 'Carian: Brave, AI Search & Yandex',
        category: 'radial',
        description: 'Enjin carian web yang disepadukan dengan AI. Carian Brave/Yandex memberi maklumat indeks internet terkini manakala AI Search mengguna pakai parameter model untuk merumuskan profil peribadi ke dalam bentuk graf.',
        useCase: 'Menggali carian umum, menyemak berita, dan merumuskan carian profil daripada enjin carian awam.'
    },
    {
        id: 'node-social',
        icon: <Users size={24} />,
        title: 'Social: Social Recon & Socials',
        category: 'radial',
        description: 'Menggunakan parameter spesifik seperti Username atau Nama Penuh untuk mencari akaun yang berpadanan di serata 500+ platform web dan pelbagai laman sosial lain (misalnya Reddit, Github, Pinterest).',
        useCase: 'Apabila menjumpai username suspek (contoh: "shadow_hacker_99") dan mahu tahu platform apa lagi yang mereka guna dengan nama yang sama.'
    },
    {
        id: 'node-leaks',
        icon: <ShieldAlert size={24} />,
        title: 'Breaches: Check Leaks & Vault',
        category: 'radial',
        description: 'Menyambung ke API risikan kebocoran data awam (Data Breaches / Leak Lookups). Mencari rekod pangkalan data usang dan tertiris yang mungkin pernah bocor di dalam Dark Web.',
        useCase: 'Menyemak adakah emel atau kata laluan suspek pernah terbocor (untuk pengesahan profil atau pivot target kepada password peribadi).'
    },
    {
        id: 'node-phone',
        icon: <MessageCircle size={24} />,
        title: 'Phone: Truecaller & WhatsApp',
        category: 'radial',
        description: 'Alatan khusus untuk menganalisis nombor telefon sahaja. Sistem akan membuat carian terus ke rangkaian Truecaller (Caller ID) serta menyemak pendaftaran di aplikasi pemesejan WhatsApp.',
        useCase: 'Mengenalpasti identiti sebenar pemanggil berdaftar (Caller ID), atau menyemak gambar profil WhatsApp dari nombor telefon pra-bayar (Burner Phone).'
    },
    {
        id: 'node-domain',
        icon: <Globe size={24} />,
        title: 'Network: Whois & Dork',
        category: 'radial',
        description: 'Mendapatkan maklumat pendaftaran identiti pelayan dan domain (Whois). Dork pula menghasilkan carian Google automatik menggunakan arahan operator "OSINT Dorks" untuk fail atau jejak tersembunyi.',
        useCase: 'Menyiasat pihak utama pendaftar laman web phishing, atau mencari maklumat emel sulit yang masih terindeks oleh Google bot di internet.'
    },
    {
        id: 'node-geo',
        icon: <MapPin size={24} />,
        title: 'Geospatial: Sat View (Map HUD)',
        category: 'radial',
        description: 'Paparan peta satelit dan jalanraya secara visual. Node "Location" atau "IP Address" yang dijana akan mempunyai data koordinat terselindung (Lat/Long). Menu ini menjadikan lokasi sebagai pemetaan yang boleh dilihat.',
        useCase: 'Melihat bentuk rupa bumi dan lanskap alamat bangunan, atau kedudukan koordinat pelayan web scammer secara visual.'
    }
];

const allTutorials = [...termuxTutorials, ...systemModules, ...nodeActionsTutorial];

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isOpen, onClose }) => {
    const [device, setDevice] = useState<DeviceInfo>(() => detectDevice());
    const [platformFilter, setPlatformFilter] = useState<'auto' | 'android' | 'desktop' | 'system' | 'radial' | 'all'>('auto');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeTool, setActiveTool] = useState<TutorialItem>(() => {
        const d = detectDevice();
        return d.isAndroid ? termuxTutorials[0] : systemModules[0];
    });
    const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const currentDev = detectDevice();
            setDevice(currentDev);
            if (currentDev.isAndroid) {
                setActiveTool(termuxTutorials[0]);
            } else if (currentDev.isDesktop) {
                setActiveTool(systemModules[0]);
            }
        }
    }, [isOpen]);

    const handleCopy = (text: string, keyId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(keyId);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    // Filtered Tutorial list based on search and active tab
    const filteredTutorials = useMemo(() => {
        return allTutorials.filter(item => {
            // Check platform filter
            if (platformFilter === 'android' && item.category !== 'termux') return false;
            if (platformFilter === 'desktop' && item.category === 'termux') return false;
            if (platformFilter === 'system' && item.category !== 'system') return false;
            if (platformFilter === 'radial' && item.category !== 'radial') return false;
            if (platformFilter === 'auto') {
                if (device.isAndroid && item.category === 'system' && searchQuery.trim() === '') {
                    // prioritize termux on mobile auto
                }
            }

            // Check search query
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            const matchesTitle = item.title.toLowerCase().includes(query);
            const matchesDesc = item.description.toLowerCase().includes(query);
            const matchesUseCase = item.useCase?.toLowerCase().includes(query);
            const matchesSteps = item.steps?.some(s => 
                s.title.toLowerCase().includes(query) || 
                s.command?.toLowerCase().includes(query) || 
                s.explanation.toLowerCase().includes(query)
            );
            const matchesTroubleshoot = item.troubleshooting?.some(t => 
                t.error.toLowerCase().includes(query) || 
                t.solution.toLowerCase().includes(query) ||
                t.command?.toLowerCase().includes(query)
            );
            const matchesQuick = item.quickCommands?.some(q => 
                q.label.toLowerCase().includes(query) || 
                q.cmd.toLowerCase().includes(query)
            );

            return matchesTitle || matchesDesc || matchesUseCase || matchesSteps || matchesTroubleshoot || matchesQuick;
        });
    }, [platformFilter, searchQuery, device.isAndroid]);

    // Color theme map
    const categoryColors = {
        termux: {
            color: '#10b981', // Emerald
            border: 'border-emerald-500/30',
            bg: 'bg-emerald-500/20',
            text: 'text-emerald-400',
            badge: 'PANDUAN TERMUX & CLI (ANDROID)'
        },
        radial: {
            color: '#06b6d4', // Cyan
            border: 'border-cyan-500/30',
            bg: 'bg-cyan-500/20',
            text: 'text-cyan-400',
            badge: 'RADIAL NODE ACTIONS'
        },
        system: {
            color: '#ff0033', // Red
            border: 'border-[#ff0033]/30',
            bg: 'bg-[#ff0033]/20',
            text: 'text-[#ff0033]',
            badge: 'MODUL ANALISIS & SIASATAN'
        }
    };

    const currentCat = categoryColors[activeTool.category] || categoryColors.system;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-2 sm:p-4 lg:p-6 font-mono"
                >
                    <div className="w-full h-full max-w-7xl bg-[#09090b] border border-gray-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
                        {/* Top Header */}
                        <div className="border-b border-gray-800 p-3 sm:p-4 md:px-6 bg-gradient-to-r from-emerald-950/30 via-[#0a0a0c] to-[#ff0033]/15 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg flex-shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                    <Book className="text-emerald-400" size={22} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-white text-sm sm:text-base md:text-lg font-black tracking-wider uppercase">
                                            Pusat Panduan & Dokumentasi Operasi
                                        </h1>
                                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-black hidden sm:inline-block">
                                            v2.9.1
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold border ${
                                            device.isAndroid 
                                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                                                : 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                                        }`}>
                                            {device.isAndroid ? <Smartphone size={11} /> : <Laptop size={11} />}
                                            <span><strong>Dikesan:</strong> {device.summary}</span>
                                        </span>
                                        <span className="text-[10px] text-gray-400 hidden lg:inline-block">
                                            • {device.envTip}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Header Actions & Filter Pills */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-lg border border-gray-800 overflow-x-auto max-w-full">
                                    <button
                                        onClick={() => setPlatformFilter('auto')}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all whitespace-nowrap flex items-center gap-1 ${
                                            platformFilter === 'auto' 
                                                ? 'bg-amber-500 text-black font-black shadow' 
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        <Sparkles size={11} />
                                        Auto-Kesan ({device.platformName})
                                    </button>
                                    <button
                                        onClick={() => setPlatformFilter('android')}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all whitespace-nowrap flex items-center gap-1 ${
                                            platformFilter === 'android' 
                                                ? 'bg-emerald-500 text-black font-black shadow' 
                                                : 'text-emerald-400/80 hover:text-emerald-300'
                                        }`}
                                    >
                                        <Smartphone size={11} /> Android / Termux ({termuxTutorials.length})
                                    </button>
                                    <button
                                        onClick={() => setPlatformFilter('desktop')}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all whitespace-nowrap flex items-center gap-1 ${
                                            platformFilter === 'desktop' 
                                                ? 'bg-blue-500 text-black font-black shadow' 
                                                : 'text-blue-400/80 hover:text-blue-300'
                                        }`}
                                    >
                                        <Laptop size={11} /> PC / Desktop ({systemModules.length + nodeActionsTutorial.length})
                                    </button>
                                    <button
                                        onClick={() => setPlatformFilter('all')}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all whitespace-nowrap ${
                                            platformFilter === 'all' 
                                                ? 'bg-white text-black font-black shadow' 
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        Semua ({allTutorials.length})
                                    </button>
                                </div>

                                <button 
                                    onClick={onClose} 
                                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full ml-auto md:ml-2"
                                    title="Tutup Panduan (ESC)"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Quick 1-Click Installation Strip */}
                        <div className="bg-[#050505] border-b border-gray-800 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="p-1 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded flex-shrink-0">
                                    <Code2 size={13} />
                                </span>
                                <span className="font-bold text-gray-300 text-[11px] whitespace-nowrap">
                                    {device.isAndroid ? 'Skrip Pasang Pantas Termux:' : 'Skrip Mulakan PC:'}
                                </span>
                                <code className="text-[10px] sm:text-[11px] text-emerald-400 bg-black border border-gray-800 px-2.5 py-1 rounded truncate max-w-xl font-mono">
                                    {device.fullSetupScript}
                                </code>
                            </div>
                            <button
                                onClick={() => handleCopy(device.fullSetupScript, 'quick-full-script')}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded text-[10px] uppercase flex items-center gap-1.5 transition-all flex-shrink-0"
                            >
                                {copiedIndex === 'quick-full-script' ? (
                                    <>
                                        <Check size={12} />
                                        <span>Skrip Disalin!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} />
                                        <span>Salin 1-Click Skrip</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Main Body */}
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Left Sidebar Menu */}
                            <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-gray-800 bg-black/75 flex flex-col overflow-hidden flex-shrink-0">
                                {/* Search Input */}
                                <div className="p-3 border-b border-gray-800 bg-[#08080a]">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Cari modul, arahan cURL, ralat..."
                                            className="w-full bg-black border border-gray-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                                        />
                                        {searchQuery && (
                                            <button 
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500 font-bold px-1">
                                        <span>HASIL: {filteredTutorials.length} PANDUAN</span>
                                        {platformFilter !== 'all' && (
                                            <span className="text-amber-400 uppercase">
                                                Mod: {platformFilter}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* List of Guides */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                                    {filteredTutorials.length === 0 ? (
                                        <div className="p-6 text-center text-gray-500 space-y-2">
                                            <AlertTriangle size={24} className="mx-auto text-amber-500/60" />
                                            <p className="text-xs">Tiada panduan berpadanan dengan carian "{searchQuery}".</p>
                                            <button
                                                onClick={() => { setSearchQuery(''); setPlatformFilter('all'); }}
                                                className="text-[10px] text-emerald-400 underline font-bold"
                                            >
                                                Set Semula Carian
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {filteredTutorials.map((tool) => {
                                                const cat = categoryColors[tool.category] || categoryColors.system;
                                                const isSelected = activeTool.id === tool.id;
                                                return (
                                                    <button
                                                        key={tool.id}
                                                        onClick={() => setActiveTool(tool)}
                                                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all border ${
                                                            isSelected 
                                                                ? `${cat.bg} text-white ${cat.border} shadow-md` 
                                                                : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                                                        }`}
                                                    >
                                                        <div className={isSelected ? cat.text : 'text-gray-500'}>
                                                            {tool.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-xs tracking-wide truncate">
                                                                {tool.title}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                                                                <span className="capitalize">{tool.category}</span>
                                                                {tool.steps && <span>• {tool.steps.length} Langkah</span>}
                                                                {tool.troubleshooting && <span>• Troubleshooting</span>}
                                                            </div>
                                                        </div>
                                                        {isSelected && <ChevronRight size={14} className={cat.text} />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Detail View Panel */}
                            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#070709] custom-scrollbar">
                                <motion.div
                                    key={activeTool.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="max-w-4xl mx-auto space-y-6"
                                >
                                    {/* Header Banner */}
                                    <div className="flex items-start gap-4 pb-4 border-b border-gray-800">
                                        <div 
                                            className="w-14 h-14 sm:w-16 sm:h-16 bg-black border rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                                            style={{ 
                                                borderColor: `${currentCat.color}60`, 
                                                color: currentCat.color,
                                                boxShadow: `0 0 25px ${currentCat.color}15`
                                            }}
                                        >
                                            {React.cloneElement(activeTool.icon as React.ReactElement<any>, { size: 30 })}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div 
                                                className="text-[10px] uppercase tracking-widest font-black mb-1 flex items-center gap-1.5"
                                                style={{ color: currentCat.color }}
                                            >
                                                <span>{currentCat.badge}</span>
                                            </div>
                                            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wider">
                                                {activeTool.title}
                                            </h2>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="bg-black/70 border border-gray-800 p-4 sm:p-5 rounded-lg">
                                        <h3 className="text-[10px] text-gray-400 font-black tracking-widest mb-2 uppercase flex items-center gap-1.5">
                                            <FileText size={12} />
                                            <span>Penerangan & Konsep</span>
                                        </h3>
                                        <p className="text-gray-200 leading-relaxed text-xs sm:text-sm">
                                            {activeTool.description}
                                        </p>
                                    </div>

                                    {/* Use Case */}
                                    {activeTool.useCase && (
                                        <div 
                                            className="p-4 sm:p-5 rounded-r-lg border-l-2" 
                                            style={{ backgroundColor: `${currentCat.color}0a`, borderColor: currentCat.color }}
                                        >
                                            <h3 
                                                className="text-[10px] font-black tracking-widest mb-2 uppercase flex items-center gap-1.5" 
                                                style={{ color: currentCat.color }}
                                            >
                                                <Sparkles size={12} />
                                                <span>Senario Penggunaan Sebenar</span>
                                            </h3>
                                            <p className="text-white/90 leading-relaxed text-xs sm:text-sm">
                                                {activeTool.useCase}
                                            </p>
                                        </div>
                                    )}

                                    {/* Step-by-Step Guide */}
                                    {activeTool.steps && activeTool.steps.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-black tracking-widest text-emerald-400 uppercase flex items-center gap-2">
                                                    <Terminal size={14} />
                                                    <span>Langkah Demi Langkah (Step-by-Step)</span>
                                                </h3>
                                                <button
                                                    onClick={() => {
                                                        const allCmds = activeTool.steps!
                                                            .filter(s => s.command)
                                                            .map(s => `# ${s.title}\n${s.command}`)
                                                            .join('\n\n');
                                                        handleCopy(allCmds, 'copy-all-steps');
                                                    }}
                                                    className="px-2.5 py-1 bg-gray-800 hover:bg-emerald-500 hover:text-black text-gray-300 font-bold rounded text-[10px] flex items-center gap-1 transition-all"
                                                >
                                                    {copiedIndex === 'copy-all-steps' ? (
                                                        <>
                                                            <Check size={11} className="text-emerald-400" />
                                                            <span>Semua Langkah Disalin</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={11} />
                                                            <span>Salin Semua Langkah</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {activeTool.steps.map((step) => (
                                                    <div 
                                                        key={step.stepNumber} 
                                                        className="bg-black/80 border border-gray-800 rounded-lg p-4 transition-all hover:border-emerald-500/40"
                                                    >
                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                                    {step.stepNumber}
                                                                </span>
                                                                <h4 className="text-xs font-bold text-white tracking-wide">
                                                                    {step.title}
                                                                </h4>
                                                            </div>
                                                        </div>

                                                        <p className="text-gray-300 text-xs mb-2 leading-relaxed">
                                                            {step.explanation}
                                                        </p>

                                                        {step.command && (
                                                            <div className="relative group mt-2">
                                                                <div className="bg-[#050505] border border-emerald-950 p-3 rounded font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre pr-14">
                                                                    {step.command}
                                                                </div>
                                                                <button 
                                                                    onClick={() => handleCopy(step.command!, `step-${step.stepNumber}`)}
                                                                    className="absolute top-2 right-2 bg-gray-800 hover:bg-emerald-500 hover:text-black text-gray-300 p-1.5 rounded transition-all flex items-center gap-1 text-[10px] font-bold"
                                                                    title="Salin Arahan"
                                                                >
                                                                    {copiedIndex === `step-${step.stepNumber}` ? (
                                                                        <>
                                                                            <Check size={12} className="text-emerald-300" />
                                                                            <span>Disalin</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Copy size={12} />
                                                                            <span>Salin</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}

                                                        {step.note && (
                                                            <div className="mt-2 text-[10px] text-amber-400/90 flex items-start gap-1.5 bg-amber-950/20 border border-amber-500/20 p-2 rounded">
                                                                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                                                                <span>{step.note}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quick Commands */}
                                    {activeTool.quickCommands && activeTool.quickCommands.length > 0 && (
                                        <div className="bg-black/70 border border-gray-800 p-4 rounded-lg space-y-3">
                                            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <Zap size={14} className="text-yellow-400" />
                                                <span>Arahan Pantas (Quick Commands)</span>
                                            </h4>
                                            <div className="space-y-2">
                                                {activeTool.quickCommands.map((qc, idx) => (
                                                    <div key={idx} className="p-2.5 bg-[#080808] border border-gray-800 rounded">
                                                        <div className="text-[10px] text-gray-400 font-bold mb-1">{qc.label}:</div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <code className="text-[10px] text-emerald-400 overflow-x-auto block font-mono">
                                                                {qc.cmd}
                                                            </code>
                                                            <button
                                                                onClick={() => handleCopy(qc.cmd, `qc-${idx}`)}
                                                                className="bg-gray-800 hover:bg-emerald-500 hover:text-black p-1.5 rounded transition-all text-xs flex-shrink-0"
                                                                title="Salin"
                                                            >
                                                                {copiedIndex === `qc-${idx}` ? <Check size={12} className="text-emerald-300"/> : <Copy size={12}/>}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Troubleshooting Guide */}
                                    {activeTool.troubleshooting && activeTool.troubleshooting.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-black tracking-widest text-amber-400 uppercase flex items-center gap-2">
                                                <AlertTriangle size={14} />
                                                <span>Penyelesaian Ralat & Troubleshooting</span>
                                            </h3>

                                            <div className="space-y-3">
                                                {activeTool.troubleshooting.map((item, idx) => (
                                                    <div key={idx} className="bg-red-950/10 border border-red-500/30 rounded-lg p-4">
                                                        <div className="flex items-center gap-2 text-red-400 text-xs font-bold font-mono mb-2">
                                                            <X size={14} />
                                                            <span>Ralat: {item.error}</span>
                                                        </div>
                                                        <p className="text-gray-300 text-xs mb-2">
                                                            <strong className="text-gray-400">Punca: </strong>
                                                            {item.cause}
                                                        </p>
                                                        <div className="bg-black/70 border border-gray-800 p-3 rounded text-xs text-emerald-300 flex items-start gap-2">
                                                            <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <strong>Solusi: </strong> {item.solution}
                                                                {item.command && (
                                                                    <div className="mt-2 flex items-center gap-2">
                                                                        <code className="bg-[#050505] border border-emerald-900/60 px-2 py-1 rounded text-[11px] text-emerald-400 flex-1 truncate">
                                                                            {item.command}
                                                                        </code>
                                                                        <button
                                                                            onClick={() => handleCopy(item.command!, `ts-${idx}`)}
                                                                            className="bg-gray-800 hover:bg-emerald-500 hover:text-black p-1.5 rounded transition-all flex-shrink-0"
                                                                            title="Salin Arahan"
                                                                        >
                                                                            {copiedIndex === `ts-${idx}` ? <Check size={12}/> : <Copy size={12}/>}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {activeTool.id === 'osint-engine' && (
                                        <div className="bg-black/70 border border-gray-800 p-5 rounded-lg">
                                            <h3 className="text-xs text-gray-400 font-black tracking-widest mb-3 uppercase">
                                                Contoh Format Data (JSON)
                                            </h3>
                                            <p className="text-xs text-gray-400 mb-2">
                                                Salin senarai teks dari media sosial dan tukarkan kepada format JSON array untuk dibaca secara efisien oleh model AI:
                                            </p>
                                            <pre className="bg-black border border-gray-800 p-4 rounded text-xs text-emerald-400 overflow-x-auto">
{`[
  { "id": "1", "text": "Ini adalah komen pertama dari facebook" },
  { "id": "2", "text": "Ini pula komen kedua dari pos yang berbeza" }
]`}
                                            </pre>
                                        </div>
                                    )}
                                    
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TutorialOverlay;
