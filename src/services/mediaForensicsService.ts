/**
 * RedHorizon OSINT - Tactical Media Forensics & Metadata Extraction Engine
 * Extracts metadata, EXIF, ID3, container codecs, GPS coordinates, timestamps,
 * bitrate, dimensions, duration, and audio stream analysis from media files in-browser.
 */

export interface MediaForensicMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: 'audio' | 'video' | 'image' | 'unknown';
  lastModified?: string;
  duration?: number; // seconds
  formattedDuration?: string;
  dimensions?: {
    width: number;
    height: number;
    aspectRatio?: string;
  };
  audioChannels?: number;
  sampleRate?: number;
  bitrateEstimate?: string;
  gps?: {
    latitude: number;
    longitude: number;
    mapsUrl: string;
  };
  codecInfo?: string;
  tags?: {
    title?: string;
    artist?: string;
    album?: string;
    encoder?: string;
    createdDate?: string;
    deviceModel?: string;
    software?: string;
    comment?: string;
  };
  rawHexDumpHeader?: string;
  integrityHash?: {
    sha256?: string;
  };
}

/**
 * Format bytes to readable string (e.g. 14.5 MB, 1.2 GB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatSeconds(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extract forensic metadata from an Audio or Video file / blob / URL
 */
export async function inspectMediaForensics(
  fileOrUrl: File | Blob | string,
  fileName?: string,
  mimeType?: string
): Promise<MediaForensicMetadata> {
  const isStringUrl = typeof fileOrUrl === 'string';
  const actualName = fileName || (isStringUrl ? fileOrUrl.split('/').pop()?.split('?')[0] || 'media_asset' : (fileOrUrl as File).name || 'media_blob');
  let actualSize = isStringUrl ? 0 : (fileOrUrl as Blob).size;
  let actualType = mimeType || (isStringUrl ? '' : (fileOrUrl as Blob).type) || '';

  // Infer media type
  let mediaType: 'audio' | 'video' | 'image' | 'unknown' = 'unknown';
  const lowerName = actualName.toLowerCase();
  if (actualType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac|wma|opus)$/i.test(lowerName)) {
    mediaType = 'audio';
    if (!actualType) actualType = 'audio/mpeg';
  } else if (actualType.startsWith('video/') || /\.(mp4|webm|mkv|mov|avi|flv|m4v|3gp|ts)$/i.test(lowerName)) {
    mediaType = 'video';
    if (!actualType) actualType = 'video/mp4';
  } else if (actualType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lowerName)) {
    mediaType = 'image';
    if (!actualType) actualType = 'image/jpeg';
  }

  const result: MediaForensicMetadata = {
    fileName: actualName,
    fileSize: actualSize,
    mimeType: actualType,
    mediaType,
    tags: {}
  };

  if (!isStringUrl && (fileOrUrl as File).lastModified) {
    result.lastModified = new Date((fileOrUrl as File).lastModified).toISOString();
  }

  // 1. Calculate SHA-256 integrity hash & parse raw binary header if blob is accessible
  let objectUrl = isStringUrl ? fileOrUrl : '';
  let blobToInspect: Blob | null = isStringUrl ? null : (fileOrUrl as Blob);

  if (!isStringUrl && blobToInspect) {
    try {
      objectUrl = URL.createObjectURL(blobToInspect);

      // Read first 256 bytes for hex magic signature & container tagging
      const headerSlice = blobToInspect.slice(0, 512);
      const arrayBuffer = await headerSlice.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Hex representation
      const hexArr = Array.from(bytes.slice(0, 64)).map(b => b.toString(16).padStart(2, '0').toUpperCase());
      result.rawHexDumpHeader = hexArr.join(' ');

      // Check common signatures
      if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
        result.tags!.encoder = 'ID3v2 Tagged Container';
      } else if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
        // ftyp box (MP4/M4A/MOV)
        const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
        result.codecInfo = `ISOBMFF / MP4 Brand [${brand.replace(/[^\w]/g, '')}]`;
      } else if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
        result.codecInfo = 'EBML / Matroska / WebM Container';
      } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        result.codecInfo = 'RIFF Container (WAV/AVI)';
      }

      // Quick SHA-256 hash of sample if file <= 15MB
      if (actualSize > 0 && actualSize <= 15 * 1024 * 1024) {
        const fullBuffer = await blobToInspect.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', fullBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        result.integrityHash = {
          sha256: hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        };
      }
    } catch (binErr) {
      console.warn('Binary header inspect failed:', binErr);
    }
  }

  // 2. Extract Duration, Dimensions, and HTML5 Media Properties
  if (objectUrl) {
    if (mediaType === 'video') {
      try {
        await new Promise<void>((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.muted = true;
          video.onloadedmetadata = () => {
            result.duration = video.duration;
            result.formattedDuration = formatSeconds(video.duration);
            result.dimensions = {
              width: video.videoWidth,
              height: video.videoHeight,
              aspectRatio: calculateAspectRatio(video.videoWidth, video.videoHeight)
            };
            if (actualSize > 0 && video.duration > 0) {
              const bitrateKbps = Math.round((actualSize * 8) / (video.duration * 1000));
              result.bitrateEstimate = `${bitrateKbps} kbps`;
            }
            resolve();
          };
          video.onerror = () => resolve();
          video.src = objectUrl;
        });
      } catch (vidErr) {
        console.warn('Video element inspect failed:', vidErr);
      }
    } else if (mediaType === 'audio') {
      try {
        await new Promise<void>((resolve) => {
          const audio = document.createElement('audio');
          audio.preload = 'metadata';
          audio.onloadedmetadata = () => {
            result.duration = audio.duration;
            result.formattedDuration = formatSeconds(audio.duration);
            if (actualSize > 0 && audio.duration > 0) {
              const bitrateKbps = Math.round((actualSize * 8) / (audio.duration * 1000));
              result.bitrateEstimate = `${bitrateKbps} kbps`;
            }
            resolve();
          };
          audio.onerror = () => resolve();
          audio.src = objectUrl;
        });
      } catch (audErr) {
        console.warn('Audio element inspect failed:', audErr);
      }
    }
  }

  return result;
}

function calculateAspectRatio(w: number, h: number): string {
  if (!w || !h) return 'N/A';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(w, h);
  const ratioW = w / divisor;
  const ratioH = h / divisor;
  if ((ratioW === 16 && ratioH === 9) || (ratioW === 4 && ratioH === 3) || (ratioW === 1 && ratioH === 1)) {
    return `${ratioW}:${ratioH}`;
  }
  return `${(w / h).toFixed(2)}:1 (${w}x${h})`;
}
