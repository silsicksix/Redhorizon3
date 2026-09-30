/**
 * RedHorizon OSINT - Telegram Headless Storage & Transport Relay Engine
 * Zero-Server Client-Side Integration for Unlimited (>1MB - 50MB) Case & File Sharing
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface TelegramRelayConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  botUsername?: string;
  chatTitle?: string;
  autoRelayCases: boolean;
  autoRelayImages: boolean;
  autoBroadcastIntel: boolean;
  lastConnectedAt?: number;
}

export interface TelegramUploadResult {
  ok: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
  telegramMessageId?: number;
  error?: string;
}

const STORAGE_KEY = 'redhorizon_telegram_relay_config';

/**
 * Get stored Telegram configuration with multi-layer fallback:
 * 1. LocalStorage
 * 2. Environment Variables (VITE_TELEGRAM_BOT_TOKEN & VITE_TELEGRAM_CHAT_ID)
 */
export function getStoredTelegramConfig(): TelegramRelayConfig {
  const envBotToken = (import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string) || '';
  const envChatId = (import.meta.env.VITE_TELEGRAM_CHAT_ID as string) || '';

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const botToken = parsed.botToken || envBotToken;
      const chatId = parsed.chatId || envChatId;
      return {
        enabled: parsed.enabled ?? Boolean(botToken && chatId),
        botToken,
        chatId,
        botUsername: parsed.botUsername || '',
        chatTitle: parsed.chatTitle || '',
        autoRelayCases: parsed.autoRelayCases ?? true,
        autoRelayImages: parsed.autoRelayImages ?? true,
        autoBroadcastIntel: parsed.autoBroadcastIntel ?? true,
        lastConnectedAt: parsed.lastConnectedAt
      };
    }
  } catch (err) {
    console.warn('Failed to load telegram config from localStorage:', err);
  }

  const hasEnvConfig = Boolean(envBotToken && envChatId);

  return {
    enabled: hasEnvConfig,
    botToken: envBotToken,
    chatId: envChatId,
    botUsername: '',
    chatTitle: '',
    autoRelayCases: true,
    autoRelayImages: true,
    autoBroadcastIntel: true
  };
}

/**
 * Save Telegram configuration to both LocalStorage and Firestore Cloud Database
 */
export function saveStoredTelegramConfig(config: Partial<TelegramRelayConfig>): TelegramRelayConfig {
  const current = getStoredTelegramConfig();
  const updated: TelegramRelayConfig = { 
    ...current, 
    ...config,
    // Auto enable if token & chatId are provided
    enabled: config.enabled !== undefined ? config.enabled : Boolean((config.botToken || current.botToken) && (config.chatId || current.chatId))
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save telegram config to localStorage:', err);
  }

  // Asynchronously sync to Firestore Database
  try {
    if (db) {
      setDoc(doc(db, 'system_config', 'telegram_relay'), {
        ...updated,
        updatedAt: Date.now()
      }, { merge: true }).catch((err) => {
        console.warn('Firestore telegram config sync notice:', err);
      });
    }
  } catch (err) {
    console.warn('Failed to write telegram config to Firestore:', err);
  }

  // Notify active UI components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:telegram-config-updated', { detail: updated }));
  }

  return updated;
}

/**
 * Synchronize Telegram configuration from Firestore Cloud Database
 */
export async function syncTelegramConfigFromFirestore(): Promise<TelegramRelayConfig | null> {
  try {
    if (!db) return null;
    const ref = doc(db, 'system_config', 'telegram_relay');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const cloudData = snap.data() as Partial<TelegramRelayConfig>;
      if (cloudData.botToken || cloudData.chatId) {
        const updated = saveStoredTelegramConfig(cloudData);
        return updated;
      }
    }
  } catch (err) {
    console.warn('Failed to sync telegram config from Firestore:', err);
  }
  return null;
}

/**
 * Reset and clear Telegram configuration
 */
export function clearStoredTelegramConfig(): TelegramRelayConfig {
  const cleared: TelegramRelayConfig = {
    enabled: false,
    botToken: '',
    chatId: '',
    botUsername: '',
    chatTitle: '',
    autoRelayCases: true,
    autoRelayImages: true,
    autoBroadcastIntel: true
  };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}

  try {
    if (db) {
      setDoc(doc(db, 'system_config', 'telegram_relay'), cleared, { merge: true }).catch(() => {});
    }
  } catch (_) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:telegram-config-updated', { detail: cleared }));
  }

  return cleared;
}

// Auto-run background Firestore sync on module load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncTelegramConfigFromFirestore().catch(() => {});
  }, 1000);
}

/**
 * Verify Telegram Bot Token and Chat ID connection
 */
export async function testTelegramConnection(botToken: string, chatId: string): Promise<{
  success: boolean;
  botUsername?: string;
  chatTitle?: string;
  error?: string;
}> {
  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();

  if (!cleanToken) {
    return { success: false, error: 'Sila masukkan Bot Token dari @BotFather.' };
  }

  try {
    // 1. Verify Bot Token
    const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const meData = await meRes.json();

    if (!meData.ok) {
      return { 
        success: false, 
        error: meData.description || 'Bot Token tidak sah. Sila semak semula token dari @BotFather.' 
      };
    }

    const botUsername = meData.result?.username || 'Bot';

    // 2. If Chat ID is provided, verify chat access
    let chatTitle = '';
    if (cleanChatId) {
      try {
        const chatRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getChat?chat_id=${encodeURIComponent(cleanChatId)}`);
        const chatData = await chatRes.json();
        if (chatData.ok) {
          chatTitle = chatData.result?.title || chatData.result?.first_name || `Chat #${cleanChatId}`;
        } else {
          return {
            success: false,
            botUsername,
            error: `Bot disahkan (@${botUsername}), tetapi tidak dapat mengakses Chat ID "${cleanChatId}". Pastikan bot telah dimasukkan ke dalam group/channel tersebut atau mulakan chat (/start).`
          };
        }
      } catch (chatErr: any) {
        console.warn('Failed to fetch getChat:', chatErr);
      }
    }

    return {
      success: true,
      botUsername,
      chatTitle
    };
  } catch (err: any) {
    console.error('Telegram connection test error:', err);
    return {
      success: false,
      error: err?.message || 'Ralat sambungan ke Telegram API. Periksa talian internet.'
    };
  }
}

/**
 * Upload raw File or Blob (up to 2GB via Telegram Bot / Local API Server or Webhook)
 */
export async function uploadFileToTelegram(
  file: File | Blob,
  fileName: string,
  caption?: string,
  customConfig?: TelegramRelayConfig,
  onUploadProgress?: (percent: number) => void
): Promise<TelegramUploadResult> {
  const config = customConfig || getStoredTelegramConfig();
  const botToken = config.botToken.trim();
  const chatId = config.chatId.trim();

  if (!botToken || !chatId) {
    throw new Error('Telegram Relay belum dikonfigurasi. Sila masukkan Bot Token dan Chat ID dalam tetapan sembang.');
  }

  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('document', file, fileName);

  const tacticalCaption = caption || `🛰️ [REDHORIZON OSINT RELAY]\n📁 File: ${fileName}\n⏱️ Time: ${new Date().toISOString()}`;
  formData.append('caption', tacticalCaption.slice(0, 1024));

  // If XMLHttpRequest is available, track upload progress
  if (typeof XMLHttpRequest !== 'undefined' && onUploadProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.telegram.org/bot${botToken}/sendDocument`);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onUploadProgress(percent);
        }
      };

      xhr.onload = async () => {
        try {
          const uploadData = JSON.parse(xhr.responseText);
          if (!uploadData.ok) {
            reject(new Error(uploadData.description || 'Gagal memuat naik fail ke Telegram Relay.'));
            return;
          }

          const doc = uploadData.result?.document || uploadData.result?.video || uploadData.result?.audio || uploadData.result?.photo?.slice(-1)[0];
          const fileId = doc?.file_id;
          const fileSize = doc?.file_size || file.size;
          const mimeType = doc?.mime_type || (file instanceof File ? file.type : 'application/octet-stream');

          const directUrl = await getTelegramDownloadUrl(fileId, config);

          resolve({
            ok: true,
            fileId,
            fileName,
            fileSize,
            mimeType,
            downloadUrl: directUrl,
            telegramMessageId: uploadData.result?.message_id
          });
        } catch (parseErr) {
          reject(parseErr);
        }
      };

      xhr.onerror = () => reject(new Error('Ralat sambungan rangkaian semasa memuat naik fail ke Telegram.'));
      xhr.send(formData);
    });
  }

  const uploadRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: formData
  });

  const uploadData = await uploadRes.json();
  if (!uploadData.ok) {
    throw new Error(uploadData.description || 'Gagal memuat naik fail ke Telegram Relay.');
  }

  const doc = uploadData.result?.document || uploadData.result?.video || uploadData.result?.audio || uploadData.result?.photo?.slice(-1)[0];
  const fileId = doc?.file_id;
  const fileSize = doc?.file_size || file.size;
  const mimeType = doc?.mime_type || (file instanceof File ? file.type : 'application/octet-stream');

  // Obtain direct download URL via getFile
  const directUrl = await getTelegramDownloadUrl(fileId, config);

  return {
    ok: true,
    fileId,
    fileName,
    fileSize,
    mimeType,
    downloadUrl: directUrl,
    telegramMessageId: uploadData.result?.message_id
  };
}

/**
 * Get direct download CDN URL for a Telegram file_id
 */
export async function getTelegramDownloadUrl(
  fileId: string, 
  customConfig?: TelegramRelayConfig
): Promise<string> {
  const config = customConfig || getStoredTelegramConfig();
  const botToken = config.botToken.trim();

  if (!botToken || !fileId) return '';

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
    }
  } catch (err) {
    console.warn('Failed to resolve Telegram getFile:', err);
  }

  return '';
}

/**
 * Download and unpack a .rhz case file or JSON from a Telegram URL with progress tracking
 */
export async function downloadAndParseTelegramRhzFile(
  downloadUrl: string,
  onProgress?: (percent: number, status: string) => void
): Promise<any> {
  if (onProgress) onProgress(15, 'Menyambung ke Telegram Cloud Relay...');

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Gagal memuat turun fail dari Telegram (HTTP ${response.status})`);
  }

  if (onProgress) onProgress(45, 'Menerima paket data kes...');
  const text = await response.text();

  if (onProgress) onProgress(75, 'Membongkar dan menyahkod struktur entiti...');
  const parsed = JSON.parse(text);

  if (onProgress) onProgress(95, 'Mengoptimumkan visual graf...');
  return parsed;
}

/**
 * Broadcast tactical text or urgent intel message to Telegram Group
 */
export async function sendTelegramBroadcast(
  text: string,
  customConfig?: TelegramRelayConfig
): Promise<boolean> {
  const config = customConfig || getStoredTelegramConfig();
  const botToken = config.botToken.trim();
  const chatId = config.chatId.trim();

  if (!config.enabled || !botToken || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await res.json();
    return data.ok === true;
  } catch (err) {
    console.warn('Failed to broadcast to Telegram:', err);
    return false;
  }
}
