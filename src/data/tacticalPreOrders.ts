export interface TacticalPreOrderStep {
  id: string;
  phaseId: number;
  phaseName: string;
  stepCode: string;
  title: string;
  description: string;
  promptTemplate: string;
  canvasImpact: string;
  iconType: 'user' | 'building' | 'phone' | 'globe' | 'shield' | 'search' | 'network' | 'map' | 'brain' | 'alert' | 'file';
}

export interface TacticalPhase {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  color: string;
  steps: TacticalPreOrderStep[];
}

export const OSINT_TACTICAL_PHASES: TacticalPhase[] = [
  {
    id: 1,
    code: 'FASA 1',
    title: 'Peninjauan & Jejak Awal (Reconnaissance & Footprinting)',
    subtitle: 'Pengumpulan maklumat asas, identiti digital, struktur korporat & telekomunikasi',
    color: 'cyan',
    steps: [
      {
        id: 'step_1_1',
        phaseId: 1,
        phaseName: 'Peninjauan Asas',
        stepCode: '1.1',
        title: 'Peninjauan Profil & Identiti Digital',
        description: 'Menyiasat latar belakang peribadi, biografi, jawatan, dan entiti bersekutu sasaran.',
        promptTemplate: 'Laksanakan Fasa 1.1: Siasat profil dan footprint digital sasaran "{TARGET}". Kumpulkan latar belakang, peranan rasmi, entiti bersekutu, dan petakan nod sasaran utama ke atas graf kanvas.',
        canvasImpact: 'Menjana nod individu/sasaran dan pautan asas.',
        iconType: 'user'
      },
      {
        id: 'step_1_2',
        phaseId: 1,
        phaseName: 'Struktur Korporat',
        stepCode: '1.2',
        title: 'Pemilikan Syarikat, Pendaftaran SSM & Pemegang Saham',
        description: 'Menjejaki pendaftaran perniagaan, status syarikat Sdn Bhd/Berhad, pemegang taruh dan lembaga pengarah.',
        promptTemplate: 'Laksanakan Fasa 1.2: Periksa pendaftaran syarikat, rekod SSM, status pengarah dan pemegang saham yang berkaitan dengan "{TARGET}". Petakan syarikat bersekutu dan hubungkan pengarah bersama ke atas graf.',
        canvasImpact: 'Menjana nod syarikat dan pautan hubungan pengarah.',
        iconType: 'building'
      },
      {
        id: 'step_1_3',
        phaseId: 1,
        phaseName: 'Risikan Telekomunikasi',
        stepCode: '1.3',
        title: 'Pengesahan Talian Telefon & Profil Telco',
        description: 'Menganalisis nombor telefon sasaran, mengenal pasti pembawa (carrier), status aktif dan pengesanan pangkalan data scam.',
        promptTemplate: 'Laksanakan Fasa 1.3: Jalankan risikan talian telefon bagi "{TARGET}". Kenal pasti pembawa telco (CelcomDigi/Maxis/U Mobile/lain-lain), status talian, sejarah amaran spam/scam, dan pautkan talian telefon ke pemiliknya pada graf.',
        canvasImpact: 'Menjana nod telefon & melancarkan alat phone intelligence.',
        iconType: 'phone'
      },
      {
        id: 'step_1_4',
        phaseId: 1,
        phaseName: 'Infrastruktur Web',
        stepCode: '1.4',
        title: 'Pemetaan Domain Web, DNS & Pelayan Sasaran',
        description: 'Menjejaki nama domain, maklumat WHOIS, alamat IP pelayan hos dan infrastruktur digital.',
        promptTemplate: 'Laksanakan Fasa 1.4: Lakukan peninjauan domain web, rekod WHOIS, DNS pelayan dan alamat IP yang berkaitan dengan "{TARGET}". Petakan nod pelayan dan domain ke dalam topologi graf kanvas.',
        canvasImpact: 'Menjana nod domain, IP dan pelayan rangkaian.',
        iconType: 'globe'
      }
    ]
  },
  {
    id: 2,
    code: 'FASA 2',
    title: 'Pengesahan Kerentanan & Arkib Ketirisan (Breach & Deep Verification)',
    subtitle: 'Semakan pangkalan data tiris, kata laluan bocor, dan jejak akaun sosial',
    color: 'rose',
    steps: [
      {
        id: 'step_2_1',
        phaseId: 2,
        phaseName: 'Ujian Ketirisan Data',
        stepCode: '2.1',
        title: 'Semakan Kebocoran Data Tiris (Data Breach Archive)',
        description: 'Menyemak arkib ketirisan pangkalan data untuk e-mel, nombor telefon, atau identiti sasaran.',
        promptTemplate: 'Laksanakan Fasa 2.1: Semak rekod kebocoran data tiris (data breach archives) untuk "{TARGET}". Kenal pasti insiden pelanggaran data, akaun terjejas, rekod kompromi, dan petakan entiti kebocoran ke graf.',
        canvasImpact: 'Menjana nod breach_result & mencetuskan semakan kebocoran.',
        iconType: 'shield'
      },
      {
        id: 'step_2_2',
        phaseId: 2,
        phaseName: 'Jejak Media Sosial',
        stepCode: '2.2',
        title: 'Enumerasi Nama Pengguna & Cross-Platform Alias',
        description: 'Menjejaki alias, nama pengguna (handle), profil media sosial (LinkedIn, FB, Telegram, X) sasaran.',
        promptTemplate: 'Laksanakan Fasa 2.2: Lakukan enumerasi nama pengguna (handle) dan alias sasaran "{TARGET}" merentasi pelbagai platform digital dan media sosial. Hubungkan setiap akaun aktif yang ditemui ke profil induk pada kanvas.',
        canvasImpact: 'Menjana nod web_result dan pautan profil sosial.',
        iconType: 'search'
      }
    ]
  },
  {
    id: 3,
    code: 'FASA 3',
    title: 'Analisis Hubungan & Topologi Rangkaian (Link Analysis & Network)',
    subtitle: 'Mendedahkan proksi, pengarah bersama, entiti cengkerang & hubungan tersembunyi',
    color: 'purple',
    steps: [
      {
        id: 'step_3_1',
        phaseId: 3,
        phaseName: 'Korelasi Sekutu',
        stepCode: '3.1',
        title: 'Korelasi Pengarah Bersama & Entiti Cengkerang',
        description: 'Menganalisis individu dan syarikat yang berkongsi alamat berdaftar, setiausaha syarikat, atau pemilikan proksi.',
        promptTemplate: 'Laksanakan Fasa 3.1: Hubungkan pengarah bersama, sekutu perniagaan, dan proksi yang berkongsi alamat pejabat atau entiti pendaftaran dengan "{TARGET}". Tunjukkan korelasi pemilikan langsung atau tidak langsung di atas graf.',
        canvasImpact: 'Menjana pautan korelasi silang antara nod.',
        iconType: 'network'
      },
      {
        id: 'step_3_2',
        phaseId: 3,
        phaseName: 'Korelasi Komunikasi',
        stepCode: '3.2',
        title: 'Pengesanan Titik Hubungan Berkongsi (Pivot Points)',
        description: 'Mencari nombor telefon, e-mel atau domain yang dikongsi oleh lebih daripada satu entiti dalam siasatan.',
        promptTemplate: 'Laksanakan Fasa 3.2: Imbas semua nod semasa pada kanvas dan kenal pasti titik pertemuan (pivot points) seperti nombor telefon berkongsi, e-mel domain yang sama, atau alamat pendaftaran sepadan untuk "{TARGET}".',
        canvasImpact: 'Menyusun kluster nod berdasarkan titik pertemuan.',
        iconType: 'network'
      }
    ]
  },
  {
    id: 4,
    code: 'FASA 4',
    title: 'Risikan Geospatial & Jejak Fizikal (GEOINT & Physical Recon)',
    subtitle: 'Memplot lokasi geografi, premis operasi dan analisis zon kedekatan',
    color: 'emerald',
    steps: [
      {
        id: 'step_4_1',
        phaseId: 4,
        phaseName: 'Plot Geospatial',
        stepCode: '4.1',
        title: 'Plot Lokasi Operasi & Ibu Pejabat ke Peta Satelit',
        description: 'Mengekstrak alamat premis fizikal, pejabat atau kediaman sasaran dan memplot koordinat GPS.',
        promptTemplate: 'Laksanakan Fasa 4.1: Ekstrak alamat fizikal, ibu pejabat operasi, atau premis berdaftar sasaran "{TARGET}" dan plotkan titik lokasi geospatial ke atas kanvas serta peta satelit.',
        canvasImpact: 'Menjana nod location & melancarkan paparan geoint.',
        iconType: 'map'
      },
      {
        id: 'step_4_2',
        phaseId: 4,
        phaseName: 'Analisis Zon',
        stepCode: '4.2',
        title: 'Analisis Zon Kedekatan & Co-Location Premis',
        description: 'Menilai entiti atau kemudahan berhampiran yang beroperasi di dalam zon radius yang sama.',
        promptTemplate: 'Laksanakan Fasa 4.2: Jalankan analisis zon kedekatan fizikal dan co-location bagi premis "{TARGET}". Kenal pasti sama ada premis ini berkongsi bangunan atau kawasan dengan entiti berisiko tinggi lain.',
        canvasImpact: 'Menambah perincian geospatial zon radius.',
        iconType: 'map'
      }
    ]
  },
  {
    id: 5,
    code: 'FASA 5',
    title: 'Sintesis Kognitif & Penilaian Ancaman (Cognitive Synthesis & Reporting)',
    subtitle: 'Pengesanan dalang utama, indikator amaran merah dan rumusan perisikan komander',
    color: 'amber',
    steps: [
      {
        id: 'step_5_1',
        phaseId: 5,
        phaseName: 'Analisis Dalang',
        stepCode: '5.1',
        title: 'Analisis Sentraliti & Pengenalpastian Kingpin/Broker',
        description: 'Mengkaji tahap sentraliti rangkaian untuk menentukan siapa nod paling berpengaruh atau perantara.',
        promptTemplate: 'Laksanakan Fasa 5.1: Jalankan analisis sentraliti graf kognitif untuk menilai keseluruhan rangkaian sekitar "{TARGET}". Kenal pasti siapa dalang utama (central kingpin) dan siapa yang bertindak sebagai broker atau perantara.',
        canvasImpact: 'Melancarkan sintesis kognitif dan pembobotan nod.',
        iconType: 'brain'
      },
      {
        id: 'step_5_2',
        phaseId: 5,
        phaseName: 'Indikator Risiko',
        stepCode: '5.2',
        title: 'Pengesanan Anomali & Amaran Merah (Red Flag Indicators)',
        description: 'Menilai risiko penipuan, entiti dorman, nombor berisiko tinggi atau percanggahan fakta.',
        promptTemplate: 'Laksanakan Fasa 5.2: Imbas indikator amaran merah (red flags) bagi kes ini, termasuk syarikat tanpa rekod fizikal, pertindihan identiti, percanggahan tarikh atau rekod ketirisan keselamatan melibatkan "{TARGET}".',
        canvasImpact: 'Menjana amaran ancaman dan penandaan risiko pada nod.',
        iconType: 'alert'
      },
      {
        id: 'step_5_3',
        phaseId: 5,
        phaseName: 'Laporan Komander',
        stepCode: '5.3',
        title: 'Rumusan Eksekutif & Cadangan Tindakan Operasi',
        description: 'Menyediakan ringkasan perisikan komprehensif untuk tindakan lanjut pihak penguatkuasa atau komander.',
        promptTemplate: 'Laksanakan Fasa 5.3: Hasilkan rumusan eksekutif perisikan lengkap (Intelligence Briefing) mengenai "{TARGET}" dan keseluruhan kanvas graf semasa, merangkumi ringkasan bukti, penilaian ancaman, dan syor langkah taktikal seterusnya.',
        canvasImpact: 'Menyediakan dossier perisikan komprehensif dalam chat.',
        iconType: 'file'
      }
    ]
  }
];
