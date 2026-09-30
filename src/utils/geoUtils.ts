import { Node } from '../types';
import { getSessionCache, setSessionCache, generateCacheKey } from './sessionCache';

export interface GeoLocation {
  lat: number;
  lon: number;
  name: string;
  source: string;
}

// In-memory fast cache to avoid re-serializing session cache inside render loops
const memoryGeoCache = new Map<string, GeoLocation | null>();

// Specific Malaysian towns, districts, mukims and landmarks
export const MALAYSIA_TOWNS_DATABASE: Record<string, { lat: number; lon: number; state: string }> = {
  // PAHANG
  'temerloh': { lat: 3.4496, lon: 102.4175, state: 'Pahang' },
  'mentakab': { lat: 3.4862, lon: 102.3506, state: 'Pahang' },
  'bentong': { lat: 3.5218, lon: 101.9084, state: 'Pahang' },
  'raub': { lat: 3.7915, lon: 101.8576, state: 'Pahang' },
  'jerantut': { lat: 3.9358, lon: 102.3628, state: 'Pahang' },
  'kuala lipis': { lat: 4.1843, lon: 102.0468, state: 'Pahang' },
  'lipis': { lat: 4.1843, lon: 102.0468, state: 'Pahang' },
  'pekan': { lat: 3.4836, lon: 103.3996, state: 'Pahang' },
  'rompin': { lat: 2.8170, lon: 103.4870, state: 'Pahang' },
  'kuala rompin': { lat: 2.8170, lon: 103.4870, state: 'Pahang' },
  'maran': { lat: 3.5857, lon: 102.7731, state: 'Pahang' },
  'bera': { lat: 3.2500, lon: 102.5000, state: 'Pahang' },
  'triang': { lat: 3.2431, lon: 102.4184, state: 'Pahang' },
  'jengka': { lat: 3.7719, lon: 102.5539, state: 'Pahang' },
  'bandar tun abdul razak': { lat: 3.7719, lon: 102.5539, state: 'Pahang' },
  'muadzam shah': { lat: 3.0603, lon: 103.0903, state: 'Pahang' },
  'cameron highlands': { lat: 4.4706, lon: 101.3785, state: 'Pahang' },
  'tanah rata': { lat: 4.4632, lon: 101.3797, state: 'Pahang' },
  'brinchang': { lat: 4.4922, lon: 101.3888, state: 'Pahang' },
  'ringlet': { lat: 4.4167, lon: 101.3833, state: 'Pahang' },
  'genting highlands': { lat: 3.4237, lon: 101.7932, state: 'Pahang' },
  'genting': { lat: 3.4237, lon: 101.7932, state: 'Pahang' },
  'bukit tinggi': { lat: 3.3512, lon: 101.8286, state: 'Pahang' },
  'bukit fraser': { lat: 3.7126, lon: 101.7371, state: 'Pahang' },
  'fraser hill': { lat: 3.7126, lon: 101.7371, state: 'Pahang' },
  'kuantan': { lat: 3.8077, lon: 103.3260, state: 'Pahang' },
  'gambang': { lat: 3.7081, lon: 103.1040, state: 'Pahang' },
  'cherating': { lat: 4.1265, lon: 103.3897, state: 'Pahang' },
  'sungai lembing': { lat: 3.9142, lon: 103.0347, state: 'Pahang' },
  'taman negara': { lat: 4.3833, lon: 102.4000, state: 'Pahang' },

  // WILAYAH PERSEKUTUAN
  'kuala lumpur': { lat: 3.1390, lon: 101.6869, state: 'Wilayah Persekutuan' },
  'kl': { lat: 3.1390, lon: 101.6869, state: 'Wilayah Persekutuan' },
  'klcc': { lat: 3.1579, lon: 101.7116, state: 'Wilayah Persekutuan' },
  'bukit bintang': { lat: 3.1466, lon: 101.7109, state: 'Wilayah Persekutuan' },
  'bangsar': { lat: 3.1319, lon: 101.6702, state: 'Wilayah Persekutuan' },
  'cheras': { lat: 3.1068, lon: 101.7259, state: 'Wilayah Persekutuan' },
  'kepong': { lat: 3.2195, lon: 101.6372, state: 'Wilayah Persekutuan' },
  'setapak': { lat: 3.1963, lon: 101.7122, state: 'Wilayah Persekutuan' },
  'wangsa maju': { lat: 3.2045, lon: 101.7360, state: 'Wilayah Persekutuan' },
  'mont kiara': { lat: 3.1678, lon: 101.6528, state: 'Wilayah Persekutuan' },
  'putrajaya': { lat: 2.9264, lon: 101.6964, state: 'Wilayah Persekutuan' },
  'labuan': { lat: 5.2831, lon: 115.2308, state: 'Wilayah Persekutuan' },

  // SELANGOR
  'shah alam': { lat: 3.0738, lon: 101.5183, state: 'Selangor' },
  'petaling jaya': { lat: 3.1073, lon: 101.6067, state: 'Selangor' },
  'pj': { lat: 3.1073, lon: 101.6067, state: 'Selangor' },
  'subang jaya': { lat: 3.0567, lon: 101.5851, state: 'Selangor' },
  'subang': { lat: 3.1289, lon: 101.5476, state: 'Selangor' },
  'cyberjaya': { lat: 2.9213, lon: 101.6559, state: 'Selangor' },
  'klang': { lat: 3.0449, lon: 101.4456, state: 'Selangor' },
  'port klang': { lat: 2.9999, lon: 101.3928, state: 'Selangor' },
  'kajang': { lat: 2.9927, lon: 101.7909, state: 'Selangor' },
  'bangi': { lat: 2.9634, lon: 101.7538, state: 'Selangor' },
  'bandar baru bangi': { lat: 2.9634, lon: 101.7538, state: 'Selangor' },
  'puchong': { lat: 3.0333, lon: 101.6167, state: 'Selangor' },
  'seri kembangan': { lat: 3.0333, lon: 101.7000, state: 'Selangor' },
  'serdang': { lat: 3.0227, lon: 101.7072, state: 'Selangor' },
  'rawang': { lat: 3.3217, lon: 101.5768, state: 'Selangor' },
  'selayang': { lat: 3.2425, lon: 101.6669, state: 'Selangor' },
  'gombak': { lat: 3.2535, lon: 101.7228, state: 'Selangor' },
  'ampang': { lat: 3.1499, lon: 101.7628, state: 'Selangor' },
  'banting': { lat: 2.8136, lon: 101.4988, state: 'Selangor' },
  'kuala langat': { lat: 2.8136, lon: 101.4988, state: 'Selangor' },
  'kuala selangor': { lat: 3.3400, lon: 101.2500, state: 'Selangor' },
  'sekinchan': { lat: 3.5100, lon: 101.1000, state: 'Selangor' },
  'sabak bernam': { lat: 3.6667, lon: 100.9833, state: 'Selangor' },
  'sepang': { lat: 2.6931, lon: 101.7483, state: 'Selangor' },
  'klia': { lat: 2.7456, lon: 101.7072, state: 'Selangor' },
  'semenyih': { lat: 2.9483, lon: 101.8442, state: 'Selangor' },
  'hulu langat': { lat: 3.1167, lon: 101.8167, state: 'Selangor' },
  'kuala kubu bharu': { lat: 3.5636, lon: 101.6581, state: 'Selangor' },

  // JOHOR
  'johor bahru': { lat: 1.4927, lon: 103.7414, state: 'Johor' },
  'jb': { lat: 1.4927, lon: 103.7414, state: 'Johor' },
  'iskandar puteri': { lat: 1.4206, lon: 103.6264, state: 'Johor' },
  'pasir gudang': { lat: 1.4725, lon: 103.9039, state: 'Johor' },
  'skudai': { lat: 1.5368, lon: 103.6593, state: 'Johor' },
  'kulai': { lat: 1.6586, lon: 103.5997, state: 'Johor' },
  'senai': { lat: 1.6000, lon: 103.6500, state: 'Johor' },
  'batu pahat': { lat: 1.8548, lon: 102.9325, state: 'Johor' },
  'muar': { lat: 2.0442, lon: 102.5689, state: 'Johor' },
  'kluang': { lat: 2.0251, lon: 103.3328, state: 'Johor' },
  'segamat': { lat: 2.5148, lon: 102.8158, state: 'Johor' },
  'pontian': { lat: 1.4877, lon: 103.3896, state: 'Johor' },
  'kota tinggi': { lat: 1.7381, lon: 103.8999, state: 'Johor' },
  'mersing': { lat: 2.4312, lon: 103.8405, state: 'Johor' },
  'tangkak': { lat: 2.2673, lon: 102.5453, state: 'Johor' },
  'yong peng': { lat: 2.0136, lon: 103.0653, state: 'Johor' },

  // PERAK
  'ipoh': { lat: 4.5975, lon: 101.0901, state: 'Perak' },
  'taiping': { lat: 4.8517, lon: 100.7329, state: 'Perak' },
  'teluk intan': { lat: 4.0259, lon: 101.0213, state: 'Perak' },
  'kuala kangsar': { lat: 4.7733, lon: 100.9417, state: 'Perak' },
  'manjung': { lat: 4.1954, lon: 100.6653, state: 'Perak' },
  'lumut': { lat: 4.2323, lon: 100.6298, state: 'Perak' },
  'sitiawan': { lat: 4.2167, lon: 100.7000, state: 'Perak' },
  'kampar': { lat: 4.3000, lon: 101.1500, state: 'Perak' },
  'tapah': { lat: 4.1969, lon: 101.2583, state: 'Perak' },
  'bagan datuk': { lat: 3.9875, lon: 100.7850, state: 'Perak' },
  'tanjung malim': { lat: 3.6833, lon: 101.5167, state: 'Perak' },
  'slim river': { lat: 3.8333, lon: 101.4000, state: 'Perak' },
  'parit buntar': { lat: 5.1267, lon: 100.4933, state: 'Perak' },
  'batu gajah': { lat: 4.4692, lon: 101.0411, state: 'Perak' },
  'gerik': { lat: 5.4267, lon: 101.1306, state: 'Perak' },

  // PENANG / PULAU PINANG
  'george town': { lat: 5.4164, lon: 100.3327, state: 'Penang' },
  'penang': { lat: 5.4164, lon: 100.3327, state: 'Penang' },
  'pulau pinang': { lat: 5.4164, lon: 100.3327, state: 'Penang' },
  'butterworth': { lat: 5.3991, lon: 100.3638, state: 'Penang' },
  'bukit mertajam': { lat: 5.3630, lon: 100.4667, state: 'Penang' },
  'bayan lepas': { lat: 5.2975, lon: 100.2583, state: 'Penang' },
  'seberang perai': { lat: 5.3833, lon: 100.4167, state: 'Penang' },
  'nibong tebal': { lat: 5.1658, lon: 100.4778, state: 'Penang' },
  'kepala batas': { lat: 5.5172, lon: 100.4278, state: 'Penang' },
  'balik pulau': { lat: 5.3522, lon: 100.2356, state: 'Penang' },

  // KEDAH
  'alor setar': { lat: 6.1248, lon: 100.3678, state: 'Kedah' },
  'sungai petani': { lat: 5.6470, lon: 100.4877, state: 'Kedah' },
  'kulim': { lat: 5.3647, lon: 100.5618, state: 'Kedah' },
  'langkawi': { lat: 6.3500, lon: 99.8000, state: 'Kedah' },
  'kuah': { lat: 6.3265, lon: 99.8432, state: 'Kedah' },
  'jitra': { lat: 6.2681, lon: 100.4217, state: 'Kedah' },
  'kubang pasu': { lat: 6.2681, lon: 100.4217, state: 'Kedah' },
  'baling': { lat: 5.6764, lon: 100.9189, state: 'Kedah' },
  'yan': { lat: 5.8000, lon: 100.3667, state: 'Kedah' },
  'sik': { lat: 5.8228, lon: 100.7444, state: 'Kedah' },
  'pendang': { lat: 5.9928, lon: 100.4794, state: 'Kedah' },
  'kuala kedah': { lat: 6.1078, lon: 100.2947, state: 'Kedah' },

  // KELANTAN
  'kota bharu': { lat: 6.1254, lon: 102.2381, state: 'Kelantan' },
  'pasir mas': { lat: 6.0431, lon: 102.1417, state: 'Kelantan' },
  'tumpat': { lat: 6.1978, lon: 102.1711, state: 'Kelantan' },
  'tanah merah': { lat: 5.8086, lon: 102.1472, state: 'Kelantan' },
  'machang': { lat: 5.7667, lon: 102.2167, state: 'Kelantan' },
  'pasir puteh': { lat: 5.8361, lon: 102.4042, state: 'Kelantan' },
  'bachok': { lat: 6.0667, lon: 102.4000, state: 'Kelantan' },
  'kuala krai': { lat: 5.5317, lon: 102.2008, state: 'Kelantan' },
  'gua musang': { lat: 4.8822, lon: 101.9686, state: 'Kelantan' },
  'jeli': { lat: 5.6986, lon: 101.8436, state: 'Kelantan' },
  'rantau panjang': { lat: 6.0197, lon: 101.9747, state: 'Kelantan' },

  // TERENGGANU
  'kuala terengganu': { lat: 5.3117, lon: 103.1324, state: 'Terengganu' },
  'kuala nerus': { lat: 5.3783, lon: 103.0858, state: 'Terengganu' },
  'kemaman': { lat: 4.2333, lon: 103.4167, state: 'Terengganu' },
  'chukai': { lat: 4.2500, lon: 103.4167, state: 'Terengganu' },
  'dungun': { lat: 4.7756, lon: 103.4169, state: 'Terengganu' },
  'marang': { lat: 5.2056, lon: 103.2058, state: 'Terengganu' },
  'besut': { lat: 5.8333, lon: 102.5500, state: 'Terengganu' },
  'jerteh': { lat: 5.7500, lon: 102.5000, state: 'Terengganu' },
  'setiu': { lat: 5.5000, lon: 102.7500, state: 'Terengganu' },
  'hulu terengganu': { lat: 5.0667, lon: 103.0167, state: 'Terengganu' },
  'kuala berang': { lat: 5.0667, lon: 103.0167, state: 'Terengganu' },
  'kerteh': { lat: 4.5142, lon: 103.4478, state: 'Terengganu' },

  // NEGERI SEMBILAN
  'seremban': { lat: 2.7258, lon: 101.9424, state: 'Negeri Sembilan' },
  'nilai': { lat: 2.8167, lon: 101.8000, state: 'Negeri Sembilan' },
  'port dickson': { lat: 2.5228, lon: 101.7959, state: 'Negeri Sembilan' },
  'jempol': { lat: 2.8000, lon: 102.4000, state: 'Negeri Sembilan' },
  'bahau': { lat: 2.8078, lon: 102.4069, state: 'Negeri Sembilan' },
  'kuala pilah': { lat: 2.7389, lon: 102.2486, state: 'Negeri Sembilan' },
  'tampin': { lat: 2.4700, lon: 102.2303, state: 'Negeri Sembilan' },
  'rembau': { lat: 2.5897, lon: 102.0911, state: 'Negeri Sembilan' },
  'jelebu': { lat: 2.9333, lon: 102.0667, state: 'Negeri Sembilan' },

  // MELAKA
  'melaka': { lat: 2.1896, lon: 102.2501, state: 'Melaka' },
  'malacca': { lat: 2.1896, lon: 102.2501, state: 'Melaka' },
  'alor gajah': { lat: 2.3803, lon: 102.2089, state: 'Melaka' },
  'jasin': { lat: 2.3106, lon: 102.4278, state: 'Melaka' },
  'ayer keroh': { lat: 2.2747, lon: 102.2858, state: 'Melaka' },
  'batu berendam': { lat: 2.2500, lon: 102.2500, state: 'Melaka' },
  'masjid tanah': { lat: 2.3500, lon: 102.1000, state: 'Melaka' },

  // PERLIS
  'kangar': { lat: 6.4414, lon: 100.1986, state: 'Perlis' },
  'arau': { lat: 6.4297, lon: 100.2694, state: 'Perlis' },
  'kuala perlis': { lat: 6.4000, lon: 100.1333, state: 'Perlis' },
  'padang besar': { lat: 6.6633, lon: 100.3200, state: 'Perlis' },

  // SABAH
  'kota kinabalu': { lat: 5.9804, lon: 116.0735, state: 'Sabah' },
  'kk': { lat: 5.9804, lon: 116.0735, state: 'Sabah' },
  'sandakan': { lat: 5.8402, lon: 118.1179, state: 'Sabah' },
  'tawau': { lat: 4.2447, lon: 117.8912, state: 'Sabah' },
  'lahad datu': { lat: 5.0267, lon: 118.3267, state: 'Sabah' },
  'keningau': { lat: 5.3378, lon: 116.1603, state: 'Sabah' },
  'semporna': { lat: 4.4817, lon: 118.6111, state: 'Sabah' },
  'kudat': { lat: 6.8836, lon: 116.8475, state: 'Sabah' },
  'ranau': { lat: 5.9536, lon: 116.6642, state: 'Sabah' },
  'kundasang': { lat: 5.9833, lon: 116.5667, state: 'Sabah' },
  'beaufort': { lat: 5.3472, lon: 115.7450, state: 'Sabah' },
  'papar': { lat: 5.7333, lon: 115.9333, state: 'Sabah' },
  'penampang': { lat: 5.9125, lon: 116.1158, state: 'Sabah' },
  'tuaran': { lat: 6.1794, lon: 116.2306, state: 'Sabah' },
  'kota belud': { lat: 6.3511, lon: 116.4306, state: 'Sabah' },

  // SARAWAK
  'kuching': { lat: 1.5533, lon: 110.3592, state: 'Sarawak' },
  'miri': { lat: 4.3995, lon: 113.9914, state: 'Sarawak' },
  'sibu': { lat: 2.3000, lon: 111.8167, state: 'Sarawak' },
  'bintulu': { lat: 3.1667, lon: 113.0333, state: 'Sarawak' },
  'samarahan': { lat: 1.4500, lon: 110.4500, state: 'Sarawak' },
  'kota samarahan': { lat: 1.4500, lon: 110.4500, state: 'Sarawak' },
  'serian': { lat: 1.1667, lon: 110.5667, state: 'Sarawak' },
  'sri aman': { lat: 1.2333, lon: 111.4667, state: 'Sarawak' },
  'sarikei': { lat: 2.1167, lon: 111.5167, state: 'Sarawak' },
  'mukah': { lat: 2.9000, lon: 112.0833, state: 'Sarawak' },
  'kapit': { lat: 2.0167, lon: 112.9333, state: 'Sarawak' },
  'limbang': { lat: 4.7500, lon: 115.0000, state: 'Sarawak' },
  'lawas': { lat: 4.8500, lon: 115.4000, state: 'Sarawak' },
  'betong': { lat: 1.4000, lon: 111.5333, state: 'Sarawak' },
  'bau': { lat: 1.4167, lon: 110.1500, state: 'Sarawak' },
};

// Global major cities, landmarks and address keywords
export const GLOBAL_CITIES_DATABASE: Record<string, { lat: number; lon: number; state: string }> = {
  // UNITED KINGDOM / LONDON & SURROUNDINGS
  'baker street': { lat: 51.5237, lon: -0.1585, state: 'London, UK' },
  'oxford street': { lat: 51.5145, lon: -0.1444, state: 'London, UK' },
  'downing street': { lat: 51.5034, lon: -0.1276, state: 'London, UK' },
  '10 downing street': { lat: 51.5034, lon: -0.1276, state: 'London, UK' },
  'westminster': { lat: 51.4975, lon: -0.1357, state: 'London, UK' },
  'london bridge': { lat: 51.5079, lon: -0.0877, state: 'London, UK' },
  'trafalgar square': { lat: 51.5080, lon: -0.1281, state: 'London, UK' },
  'piccadilly circus': { lat: 51.5101, lon: -0.1342, state: 'London, UK' },
  'soho': { lat: 51.5137, lon: -0.1328, state: 'London, UK' },
  'kensington': { lat: 51.5014, lon: -0.1919, state: 'London, UK' },
  'chelsea': { lat: 51.4875, lon: -0.1687, state: 'London, UK' },
  'camden': { lat: 51.5416, lon: -0.1433, state: 'London, UK' },
  'greenwich': { lat: 51.4826, lon: -0.0077, state: 'London, UK' },
  'heathrow': { lat: 51.4700, lon: -0.4543, state: 'London, UK' },
  'london': { lat: 51.5074, lon: -0.1278, state: 'United Kingdom' },
  'manchester': { lat: 53.4808, lon: -2.2426, state: 'United Kingdom' },
  'birmingham': { lat: 52.4862, lon: -1.8904, state: 'United Kingdom' },
  'leeds': { lat: 53.8008, lon: -1.5491, state: 'United Kingdom' },
  'glasgow': { lat: 55.8642, lon: -4.2518, state: 'United Kingdom' },
  'edinburgh': { lat: 55.9533, lon: -3.1883, state: 'United Kingdom' },
  'liverpool': { lat: 53.4084, lon: -2.9916, state: 'United Kingdom' },
  'bristol': { lat: 51.4545, lon: -2.5879, state: 'United Kingdom' },
  'sheffield': { lat: 53.3811, lon: -1.4701, state: 'United Kingdom' },
  'cambridge': { lat: 52.2053, lon: 0.1218, state: 'United Kingdom' },
  'oxford': { lat: 51.7520, lon: -1.2577, state: 'United Kingdom' },
  'newcastle': { lat: 54.9783, lon: -1.6178, state: 'United Kingdom' },
  'brighton': { lat: 50.8225, lon: -0.1372, state: 'United Kingdom' },
  'windsor': { lat: 51.4839, lon: -0.6044, state: 'United Kingdom' },
  'cardiff': { lat: 51.4816, lon: -3.1791, state: 'United Kingdom' },
  'belfast': { lat: 54.5973, lon: -5.9301, state: 'United Kingdom' },
  'dublin': { lat: 53.3498, lon: -6.2603, state: 'Ireland' },

  // UNITED STATES & CANADA
  'new york': { lat: 40.7128, lon: -74.0060, state: 'USA' },
  'new york city': { lat: 40.7128, lon: -74.0060, state: 'USA' },
  'nyc': { lat: 40.7128, lon: -74.0060, state: 'USA' },
  'manhattan': { lat: 40.7831, lon: -73.9712, state: 'USA' },
  'brooklyn': { lat: 40.6782, lon: -73.9442, state: 'USA' },
  'wall street': { lat: 40.7060, lon: -74.0088, state: 'USA' },
  'times square': { lat: 40.7580, lon: -73.9855, state: 'USA' },
  'washington': { lat: 38.9072, lon: -77.0369, state: 'USA' },
  'washington dc': { lat: 38.9072, lon: -77.0369, state: 'USA' },
  'los angeles': { lat: 34.0522, lon: -118.2437, state: 'USA' },
  'chicago': { lat: 41.8781, lon: -87.6298, state: 'USA' },
  'san francisco': { lat: 37.7749, lon: -122.4194, state: 'USA' },
  'silicon valley': { lat: 37.3875, lon: -122.0575, state: 'USA' },
  'miami': { lat: 25.7617, lon: -80.1918, state: 'USA' },
  'boston': { lat: 42.3601, lon: -71.0589, state: 'USA' },
  'seattle': { lat: 47.6062, lon: -122.3321, state: 'USA' },
  'houston': { lat: 29.7604, lon: -95.3698, state: 'USA' },
  'dallas': { lat: 32.7767, lon: -96.7970, state: 'USA' },
  'las vegas': { lat: 36.1699, lon: -115.1398, state: 'USA' },
  'toronto': { lat: 43.6532, lon: -79.3832, state: 'Canada' },
  'vancouver': { lat: 49.2827, lon: -123.1207, state: 'Canada' },
  'montreal': { lat: 45.5017, lon: -73.5673, state: 'Canada' },

  // EUROPE
  'paris': { lat: 48.8566, lon: 2.3522, state: 'France' },
  'champs-elysees': { lat: 48.8698, lon: 2.3075, state: 'France' },
  'eiffel tower': { lat: 48.8584, lon: 2.2945, state: 'France' },
  'lyon': { lat: 45.7640, lon: 4.8357, state: 'France' },
  'marseille': { lat: 43.2965, lon: 5.3698, state: 'France' },
  'berlin': { lat: 52.5200, lon: 13.4050, state: 'Germany' },
  'munich': { lat: 48.1351, lon: 11.5820, state: 'Germany' },
  'frankfurt': { lat: 50.1109, lon: 8.6821, state: 'Germany' },
  'hamburg': { lat: 53.5511, lon: 9.9937, state: 'Germany' },
  'rome': { lat: 41.9028, lon: 12.4964, state: 'Italy' },
  'milan': { lat: 45.4642, lon: 9.1900, state: 'Italy' },
  'venice': { lat: 45.4408, lon: 12.3155, state: 'Italy' },
  'amsterdam': { lat: 52.3676, lon: 4.9041, state: 'Netherlands' },
  'rotterdam': { lat: 51.9244, lon: 4.4777, state: 'Netherlands' },
  'madrid': { lat: 40.4168, lon: -3.7038, state: 'Spain' },
  'barcelona': { lat: 41.3851, lon: 2.1734, state: 'Spain' },
  'brussels': { lat: 50.8503, lon: 4.3517, state: 'Belgium' },
  'vienna': { lat: 48.2082, lon: 16.3738, state: 'Austria' },
  'zurich': { lat: 47.3769, lon: 8.5417, state: 'Switzerland' },
  'geneva': { lat: 46.2044, lon: 6.1432, state: 'Switzerland' },
  'stockholm': { lat: 59.3293, lon: 18.0686, state: 'Sweden' },
  'oslo': { lat: 59.9139, lon: 10.7522, state: 'Norway' },
  'copenhagen': { lat: 55.6761, lon: 12.5683, state: 'Denmark' },
  'athens': { lat: 37.9838, lon: 23.7275, state: 'Greece' },
  'moscow': { lat: 55.7558, lon: 37.6173, state: 'Russia' },
  'saint petersburg': { lat: 59.9343, lon: 30.3351, state: 'Russia' },
  'istanbul': { lat: 41.0082, lon: 28.9784, state: 'Turkey' },

  // ASIA & MIDDLE EAST & OCEANIA
  'tokyo': { lat: 35.6762, lon: 139.6503, state: 'Japan' },
  'osaka': { lat: 34.6937, lon: 135.5023, state: 'Japan' },
  'kyoto': { lat: 35.0116, lon: 135.7681, state: 'Japan' },
  'beijing': { lat: 39.9042, lon: 116.4074, state: 'China' },
  'shanghai': { lat: 31.2304, lon: 121.4737, state: 'China' },
  'hong kong': { lat: 22.3193, lon: 114.1694, state: 'China' },
  'singapore': { lat: 1.3521, lon: 103.8198, state: 'Singapore' },
  'jakarta': { lat: -6.2088, lon: 106.8456, state: 'Indonesia' },
  'bali': { lat: -8.6705, lon: 115.2126, state: 'Indonesia' },
  'surabaya': { lat: -7.2575, lon: 112.7521, state: 'Indonesia' },
  'bangkok': { lat: 13.7563, lon: 100.5018, state: 'Thailand' },
  'phuket': { lat: 7.8804, lon: 98.3923, state: 'Thailand' },
  'seoul': { lat: 37.5665, lon: 126.9780, state: 'South Korea' },
  'manila': { lat: 14.5995, lon: 120.9842, state: 'Philippines' },
  'hanoi': { lat: 21.0285, lon: 105.8542, state: 'Vietnam' },
  'ho chi minh': { lat: 10.8231, lon: 106.6297, state: 'Vietnam' },
  'sydney': { lat: -33.8688, lon: 151.2093, state: 'Australia' },
  'melbourne': { lat: -37.8136, lon: 144.9631, state: 'Australia' },
  'dubai': { lat: 25.2048, lon: 55.2708, state: 'UAE' },
  'abu dhabi': { lat: 24.4539, lon: 54.3773, state: 'UAE' },
  'riyadh': { lat: 24.7136, lon: 46.6753, state: 'Saudi Arabia' },
  'jeddah': { lat: 21.5433, lon: 39.1728, state: 'Saudi Arabia' },
  'cairo': { lat: 30.0444, lon: 31.2357, state: 'Egypt' },
  'new delhi': { lat: 28.6139, lon: 77.2090, state: 'India' },
  'mumbai': { lat: 19.0760, lon: 72.8777, state: 'India' }
};

export const GLOBAL_COUNTRY_CENTERS: Record<string, { lat: number; lon: number; state: string }> = {
  'uk': { lat: 55.3781, lon: -3.4360, state: 'United Kingdom' },
  'united kingdom': { lat: 55.3781, lon: -3.4360, state: 'United Kingdom' },
  'england': { lat: 52.3555, lon: -1.1743, state: 'United Kingdom' },
  'scotland': { lat: 56.4907, lon: -4.2026, state: 'United Kingdom' },
  'wales': { lat: 52.1307, lon: -3.7837, state: 'United Kingdom' },
  'usa': { lat: 37.0902, lon: -95.7129, state: 'United States' },
  'us': { lat: 37.0902, lon: -95.7129, state: 'United States' },
  'united states': { lat: 37.0902, lon: -95.7129, state: 'United States' },
  'america': { lat: 37.0902, lon: -95.7129, state: 'United States' },
  'france': { lat: 46.2276, lon: 2.2137, state: 'France' },
  'germany': { lat: 51.1657, lon: 10.4515, state: 'Germany' },
  'italy': { lat: 41.8719, lon: 12.5674, state: 'Italy' },
  'spain': { lat: 40.4637, lon: -3.7492, state: 'Spain' },
  'japan': { lat: 36.2048, lon: 138.2529, state: 'Japan' },
  'china': { lat: 35.8617, lon: 104.1954, state: 'China' },
  'indonesia': { lat: -0.7893, lon: 113.9213, state: 'Indonesia' },
  'thailand': { lat: 15.8700, lon: 100.9925, state: 'Thailand' },
  'singapore': { lat: 1.3521, lon: 103.8198, state: 'Singapore' },
  'australia': { lat: -25.2744, lon: 133.7751, state: 'Australia' },
  'russia': { lat: 61.5240, lon: 105.3188, state: 'Russia' },
  'saudi arabia': { lat: 23.8859, lon: 45.0792, state: 'Saudi Arabia' },
  'uae': { lat: 23.4241, lon: 53.8478, state: 'United Arab Emirates' },
  'egypt': { lat: 26.8206, lon: 30.8025, state: 'Egypt' },
  'canada': { lat: 56.1304, lon: -106.3468, state: 'Canada' },
  'india': { lat: 20.5937, lon: 78.9629, state: 'India' }
};

// Generic State level fallback coordinates (Used ONLY if no town matches)
export const MALAYSIA_STATE_CENTERS: Record<string, { lat: number; lon: number; state: string }> = {
  'pahang': { lat: 3.8077, lon: 103.3260, state: 'Pahang' }, // Kuantan (Ibu Negeri)
  'selangor': { lat: 3.0738, lon: 101.5183, state: 'Selangor' }, // Shah Alam
  'johor': { lat: 1.4927, lon: 103.7414, state: 'Johor' }, // Johor Bahru
  'perak': { lat: 4.5975, lon: 101.0901, state: 'Perak' }, // Ipoh
  'kedah': { lat: 6.1248, lon: 100.3678, state: 'Kedah' }, // Alor Setar
  'kelantan': { lat: 6.1254, lon: 102.2381, state: 'Kelantan' }, // Kota Bharu
  'terengganu': { lat: 5.3117, lon: 103.1324, state: 'Terengganu' }, // Kuala Terengganu
  'negeri sembilan': { lat: 2.7258, lon: 101.9424, state: 'Negeri Sembilan' }, // Seremban
  'n.sembilan': { lat: 2.7258, lon: 101.9424, state: 'Negeri Sembilan' },
  'melaka': { lat: 2.1896, lon: 102.2501, state: 'Melaka' }, // Melaka
  'perlis': { lat: 6.4414, lon: 100.1986, state: 'Perlis' }, // Kangar
  'penang': { lat: 5.4164, lon: 100.3327, state: 'Penang' }, // George Town
  'pulau pinang': { lat: 5.4164, lon: 100.3327, state: 'Penang' },
  'sabah': { lat: 5.9804, lon: 116.0735, state: 'Sabah' }, // Kota Kinabalu
  'sarawak': { lat: 1.5533, lon: 110.3592, state: 'Sarawak' }, // Kuching
  'wilayah persekutuan': { lat: 3.1390, lon: 101.6869, state: 'Wilayah Persekutuan' },
  'malaysia': { lat: 4.2105, lon: 101.9758, state: 'Malaysia' },
};

// Malaysian Postcode to location mapping (5-digit postal code heuristics)
export const MALAYSIAN_POSTCODE_PREFIXES: { prefix: number; lat: number; lon: number; name: string; state: string }[] = [
  { prefix: 28000, lat: 3.4496, lon: 102.4175, name: 'Temerloh', state: 'Pahang' },
  { prefix: 28400, lat: 3.4862, lon: 102.3506, name: 'Mentakab', state: 'Pahang' },
  { prefix: 28700, lat: 3.5218, lon: 101.9084, name: 'Bentong', state: 'Pahang' },
  { prefix: 27600, lat: 3.7915, lon: 101.8576, name: 'Raub', state: 'Pahang' },
  { prefix: 27000, lat: 3.9358, lon: 102.3628, name: 'Jerantut', state: 'Pahang' },
  { prefix: 27200, lat: 4.1843, lon: 102.0468, name: 'Kuala Lipis', state: 'Pahang' },
  { prefix: 26600, lat: 3.4836, lon: 103.3996, name: 'Pekan', state: 'Pahang' },
  { prefix: 26800, lat: 2.8170, lon: 103.4870, name: 'Kuala Rompin', state: 'Pahang' },
  { prefix: 26500, lat: 3.5857, lon: 102.7731, name: 'Maran', state: 'Pahang' },
  { prefix: 28200, lat: 3.2500, lon: 102.5000, name: 'Bera / Triang', state: 'Pahang' },
  { prefix: 26400, lat: 3.7719, lon: 102.5539, name: 'Bandar Tun Abdul Razak Jengka', state: 'Pahang' },
  { prefix: 26700, lat: 3.0603, lon: 103.0903, name: 'Muadzam Shah', state: 'Pahang' },
  { prefix: 39000, lat: 4.4706, lon: 101.3785, name: 'Cameron Highlands', state: 'Pahang' },
  { prefix: 69000, lat: 3.4237, lon: 101.7932, name: 'Genting Highlands', state: 'Pahang' },
  { prefix: 25000, lat: 3.8077, lon: 103.3260, name: 'Kuantan', state: 'Pahang' },
  { prefix: 26300, lat: 3.7081, lon: 103.1040, name: 'Gambang', state: 'Pahang' },
  { prefix: 26080, lat: 4.1265, lon: 103.3897, name: 'Cherating', state: 'Pahang' },
];

// Unified database for backwards compatibility
export const MALAYSIA_GEO_DATABASE: Record<string, { lat: number; lon: number; state?: string }> = {
  ...GLOBAL_CITIES_DATABASE,
  ...MALAYSIA_TOWNS_DATABASE,
  ...MALAYSIA_STATE_CENTERS
};

// Sorted arrays by key length descending to match longest/most specific names first
const ALL_TOWNS_AND_CITIES = {
  ...GLOBAL_CITIES_DATABASE,
  ...MALAYSIA_TOWNS_DATABASE
};

const SORTED_GLOBAL_CITIES = Object.entries(ALL_TOWNS_AND_CITIES).sort((a, b) => b[0].length - a[0].length);
const SORTED_COUNTRIES_AND_STATES = Object.entries({
  ...GLOBAL_COUNTRY_CENTERS,
  ...MALAYSIA_STATE_CENTERS
}).sort((a, b) => b[0].length - a[0].length);

/**
 * Asynchronously geocodes any freeform address query or location string using OpenStreetMap Nominatim API
 * Caches results automatically in memory and session cache.
 */
export async function geocodeAddressAsync(query: string): Promise<GeoLocation | null> {
  if (!query || typeof query !== 'string' || !query.trim()) return null;
  const cleaned = query.trim();
  const cacheKey = generateCacheKey('geo_async', cleaned.toLowerCase());

  if (memoryGeoCache.has(cacheKey)) {
    return memoryGeoCache.get(cacheKey) || null;
  }

  const sessionCached = getSessionCache<GeoLocation>(cacheKey);
  if (sessionCached) {
    memoryGeoCache.set(cacheKey, sessionCached);
    return sessionCached;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cleaned)}`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en,ms'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      const lat = parseFloat(first.lat);
      const lon = parseFloat(first.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        const res: GeoLocation = {
          lat,
          lon,
          name: first.display_name || cleaned,
          source: 'NOMINATIM_OSM_LIVE'
        };
        memoryGeoCache.set(cacheKey, res);
        setSessionCache(cacheKey, res);
        return res;
      }
    }
  } catch (e) {
    console.warn('[Geocoding API] Nominatim lookup error:', e);
  }

  memoryGeoCache.set(cacheKey, null);
  return null;
}

/**
 * Attempts to extract latitude & longitude for a node (Global & Malaysian locations)
 * Hierarchical matching:
 * 1. Explicit Decimal Coordinates (51.5074, -0.1278)
 * 2. Malaysian Postcode (e.g. 28000)
 * 3. Exact & Substring match in Global Cities & Malaysian Towns DB (London, Baker Street, Oxford Street, New York, Temerloh, etc.)
 * 4. Match in Global Countries & Malaysian States DB (UK, USA, France, Pahang, Selangor, etc.)
 * 5. Intelligent Fallback based on country/city keywords
 */
export function extractNodeCoordinates(node: Node): GeoLocation | null {
  const cacheKey = generateCacheKey('geo', `${node.id}_${node.label}_${node.details}_${node.reports || ''}`);
  
  if (memoryGeoCache.has(cacheKey)) {
    return memoryGeoCache.get(cacheKey) || null;
  }

  const sessionCached = getSessionCache<GeoLocation>(cacheKey);
  if (sessionCached) {
    memoryGeoCache.set(cacheKey, sessionCached);
    return sessionCached;
  }

  const rawLabel = (node.label || '').trim();
  const labelLower = rawLabel.toLowerCase();
  const detailsLower = (node.details || '').toLowerCase();
  const reportsLower = (node.reports || '').toLowerCase();
  const combinedText = `${labelLower} ${detailsLower} ${reportsLower}`;

  let res: GeoLocation | null = null;

  // 1. Direct Regex for Lat/Lon (e.g. 51.5074, -0.1278 or Lat: 51.5074 Lon: -0.1278)
  const coordMatch = combinedText.match(/(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      res = {
        lat,
        lon,
        name: rawLabel,
        source: 'EXPLICIT_COORDINATES'
      };
    }
  }

  // 2. Malaysian Postcode Extraction (e.g. "28000 Temerloh", "Poskod: 28000")
  if (!res) {
    const postcodeMatch = combinedText.match(/\b([0-9]{5})\b/);
    if (postcodeMatch) {
      const pc = parseInt(postcodeMatch[1], 10);
      const match = MALAYSIAN_POSTCODE_PREFIXES.find(p => Math.abs(p.prefix - pc) < 500);
      if (match) {
        res = {
          lat: match.lat,
          lon: match.lon,
          name: `${rawLabel} (${match.name}, ${match.state})`,
          source: `POSTCODE_${pc} (${match.name})`
        };
      }
    }
  }

  // 3. Match in Global Cities & Malaysian Towns Database (Longest key first)
  if (!res) {
    for (const [cityKey, entry] of SORTED_GLOBAL_CITIES) {
      if (cityKey.length < 3) continue;
      const regex = new RegExp(`(^|[^a-z0-9])${cityKey}([^a-z0-9]|$)`, 'i');
      if (regex.test(labelLower) || regex.test(combinedText)) {
        res = {
          lat: entry.lat,
          lon: entry.lon,
          name: `${rawLabel} (${cityKey.toUpperCase()}, ${entry.state})`,
          source: `GLOBAL_GEO_DB (${cityKey.toUpperCase()})`
        };
        break;
      }
    }
  }

  // 4. Country & State Level Match (UK, USA, France, Germany, Pahang, Selangor, etc.)
  if (!res) {
    for (const [regionKey, entry] of SORTED_COUNTRIES_AND_STATES) {
      const regex = new RegExp(`(^|[^a-z0-9])${regionKey}([^a-z0-9]|$)`, 'i');
      if (regex.test(labelLower) || regex.test(combinedText)) {
        res = {
          lat: entry.lat,
          lon: entry.lon,
          name: `${rawLabel} (${regionKey.toUpperCase()})`,
          source: `REGION_CENTER (${regionKey.toUpperCase()})`
        };
        break;
      }
    }
  }

  // 5. Intelligent Fallback: Check specific international keywords if node is location or address
  if (!res && (isLocationNode(node) || combinedText.includes('street') || combinedText.includes('road') || combinedText.includes('jalan') || combinedText.includes('alamat'))) {
    if (combinedText.includes('london') || combinedText.includes('uk') || combinedText.includes('united kingdom') || combinedText.includes('england')) {
      res = { lat: 51.5074, lon: -0.1278, name: `${rawLabel} (LONDON, UK)`, source: 'INTELLIGENT_FALLBACK_UK' };
    } else if (combinedText.includes('new york') || combinedText.includes('usa') || combinedText.includes('us') || combinedText.includes('america')) {
      res = { lat: 40.7128, lon: -74.0060, name: `${rawLabel} (NEW YORK, USA)`, source: 'INTELLIGENT_FALLBACK_USA' };
    } else if (combinedText.includes('paris') || combinedText.includes('france')) {
      res = { lat: 48.8566, lon: 2.3522, name: `${rawLabel} (PARIS, FRANCE)`, source: 'INTELLIGENT_FALLBACK_FRANCE' };
    } else if (combinedText.includes('tokyo') || combinedText.includes('japan')) {
      res = { lat: 35.6762, lon: 139.6503, name: `${rawLabel} (TOKYO, JAPAN)`, source: 'INTELLIGENT_FALLBACK_JAPAN' };
    } else if (combinedText.includes('singapore')) {
      res = { lat: 1.3521, lon: 103.8198, name: `${rawLabel} (SINGAPORE)`, source: 'INTELLIGENT_FALLBACK_SINGAPORE' };
    } else if (combinedText.includes('jakarta') || combinedText.includes('indonesia')) {
      res = { lat: -6.2088, lon: 106.8456, name: `${rawLabel} (JAKARTA, INDONESIA)`, source: 'INTELLIGENT_FALLBACK_INDONESIA' };
    } else {
      // General deterministic hash-offset fallback
      let hash = 0;
      for (let i = 0; i < node.id.length; i++) {
        hash = (hash << 5) - hash + node.id.charCodeAt(i);
        hash |= 0;
      }
      const offsetLat = ((hash % 100) / 1000);
      const offsetLon = (((hash >> 3) % 100) / 1000);

      // If text mentions malaysia, center in KL, otherwise offset around default global location
      const isMalaysianContext = combinedText.includes('malaysia') || combinedText.includes('kl') || combinedText.includes('selangor');
      const baseLat = isMalaysianContext ? 3.1390 : 51.5074;
      const baseLon = isMalaysianContext ? 101.6869 : -0.1278;

      res = {
        lat: baseLat + offsetLat,
        lon: baseLon + offsetLon,
        name: rawLabel,
        source: 'ESTIMATED_LOCATION'
      };
    }
  }

  memoryGeoCache.set(cacheKey, res);
  if (res) {
    setSessionCache(cacheKey, res);
  }

  return res;
}

/**
 * Advanced heuristic text analyzer for addresses, locations, landmarks, and geospatial coordinates.
 */
export function isLocationOrAddressText(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();

  // 1. Explicit Address / Location Key Labels
  if (/\b(alamat|address|lokasi|location|koordinat|coordinate|coordinates|gps|geospatial|geocoords|geocoding|checkpoint|waypoint|site|venue)\b/i.test(lower)) {
    return true;
  }

  // 2. Lat/Lon GPS numerical coordinates pattern (e.g., "3.1390, 101.6869" or "lat: 3.139, lon: 101.686" or "3.139° N, 101.686° E")
  if (
    /(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/.test(lower) ||
    /\b(lat|latitude|lon|lng|longitude)\b\s*[:=]?\s*-?\d+\.\d+/i.test(lower) ||
    /\d{1,3}°\s*\d{1,2}'?\s*[NnSs]\s*,\s*\d{1,3}°\s*\d{1,2}'?\s*[EeWw]/.test(lower)
  ) {
    return true;
  }

  // 3. Street / Road / Highway / Avenue prefixes or keywords
  if (
    /\b(jalan|jln|lorong|lrg|persiaran|psrn|lebuh|lebuhraya|solok|lingkaran)\b/i.test(lower) ||
    /\b(street|st\.|road|rd\.|avenue|ave\.|boulevard|blvd\.|drive|dr\.|lane|ln\.|way|court|ct\.|highway|hwy\.)\b/i.test(lower)
  ) {
    return true;
  }

  // 4. Area / Residential / Postal / Administrative markers
  if (
    /\b(taman|tmn|kampung|kg\.|bandar|bdr|seksyen|sek\.|presint|precinct|mukim|daerah|district|postcode|poskod|zipcode)\b/i.test(lower)
  ) {
    return true;
  }

  // 5. Structure / Facility address descriptors
  if (
    /\b(stesen|station|terminal|airport|lapangan terbang|pelabuhan|port|bangunan|building|menara|tower|plaza|mall|kompleks|complex|wisma|residence|residensi|condo|condominium|apartment|apt|flat|rumah|lot|blok|block)\b/i.test(lower) &&
    /\b(no|no\.|lot|unit|tingkat|floor|bdr|tmn|kg|jalan|jln|kl|selangor|johor|pahang|penang|perak|kedah|kelantan|terengganu|sabah|sarawak)\b/i.test(lower)
  ) {
    return true;
  }

  // 6. Address numbering patterns (e.g. "No. 12", "No 45", "Lot 100", "B-12-3") combined with Malaysian or International place/state names
  if (
    /\b(no|no\.|lot|unit|blok|block)\b\s*\d+/i.test(lower) &&
    /\b(kuala lumpur|kl|selangor|johor|penang|perak|kedah|pahang|kelantan|terengganu|negeri sembilan|melaka|sabah|sarawak|putrajaya|labuan|singapore|jakarta|london|new york|paris|tokyo|street|road|jalan|taman|kampung)\b/i.test(lower)
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a graph Node is a Location/Address node based on type, label, or details content.
 */
export function isLocationNode(node: { type?: string; label?: string; details?: string; url?: string } | null | undefined): boolean {
  if (!node) return false;
  const type = (node.type || '').toLowerCase().trim();
  if (
    type === 'location' || 
    type === 'address' || 
    type === 'gps' || 
    type === 'geo' || 
    type === 'geospatial' || 
    type === 'place' || 
    type === 'site' || 
    type === 'checkpoint' || 
    type === 'waypoint'
  ) {
    return true;
  }

  const label = node.label || '';
  const details = node.details || '';
  const url = node.url || '';
  const combined = `${label} ${details} ${url}`;

  return isLocationOrAddressText(combined);
}


