/**
 * Session Cache Utility for RedHorizon OSINT Engine
 * Automatically purged by the browser when the tab/browser is closed (sessionStorage).
 * Saves API quota and speeds up instant re-renders for identical queries & map views.
 */

export function generateCacheKey(prefix: string, input: any): string {
  try {
    const raw = typeof input === 'string' ? input : JSON.stringify(input);
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `rh_cache_${prefix}_${hash}`;
  } catch (e) {
    return `rh_cache_${prefix}_${String(input).substring(0, 30)}`;
  }
}

export function getSessionCache<T>(key: string): T | null {
  try {
    const item = sessionStorage.getItem(key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    return parsed.data as T;
  } catch (e) {
    return null;
  }
}

export function setSessionCache<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data: value
    }));
  } catch (e) {
    console.warn('SessionStorage quota exceeded or unavailable', e);
  }
}

export function clearSessionCache(prefix?: string): void {
  try {
    if (!prefix) {
      sessionStorage.clear();
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(`rh_cache_${prefix}`)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch (e) {
    console.warn('Failed to clear session cache', e);
  }
}
