import { openDB, IDBPDatabase } from 'idb';
import { Workspace, ModelConfig } from '../types';

const DB_NAME = 'RedHorizonDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase | null> | null = null;

export const initDB = async (): Promise<IDBPDatabase | null> => {
    if (typeof window === 'undefined' || !window.indexedDB) {
        return null;
    }

    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('workspaces')) {
                    db.createObjectStore('workspaces', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'id' });
                }
            },
            blocked() {
                console.warn('IndexedDB database open blocked');
            },
            blocking() {
                if (dbPromise) {
                    dbPromise.then(db => db?.close()).catch(() => {});
                    dbPromise = null;
                }
            },
            terminated() {
                dbPromise = null;
            }
        }).catch(err => {
            console.warn('IndexedDB open error (will use localStorage fallback):', err);
            dbPromise = null;
            return null;
        });
    }

    try {
        const db = await dbPromise;
        if (!db) return null;
        return db;
    } catch (err) {
        console.warn('IndexedDB connection error:', err);
        dbPromise = null;
        return null;
    }
};

// Fallback helper for LocalStorage workspace storage
const getFallbackWorkspaces = (): Workspace[] => {
    try {
        const raw = localStorage.getItem('rh_workspaces_backup');
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        return [];
    }
};

const saveFallbackWorkspaces = (workspaces: Workspace[]) => {
    try {
        localStorage.setItem('rh_workspaces_backup', JSON.stringify(workspaces));
    } catch (_) {}
};

export const saveWorkspace = async (workspace: Workspace) => {
    try {
        const db = await initDB();
        if (db) {
            await db.put('workspaces', workspace);
            return;
        }
    } catch (e) {
        console.warn('saveWorkspace IDB error (falling back to localStorage):', e);
        dbPromise = null;
    }
    
    // LocalStorage Fallback
    const list = getFallbackWorkspaces();
    const idx = list.findIndex(w => w.id === workspace.id);
    if (idx >= 0) list[idx] = workspace;
    else list.push(workspace);
    saveFallbackWorkspaces(list);
};

export const deleteWorkspace = async (id: string) => {
    try {
        const db = await initDB();
        if (db) {
            await db.delete('workspaces', id);
        }
    } catch (e) {
        console.warn('deleteWorkspace IDB error:', e);
        dbPromise = null;
    }

    // LocalStorage Fallback
    const list = getFallbackWorkspaces().filter(w => w.id !== id);
    saveFallbackWorkspaces(list);
};

export const syncWorkspaces = async (currentWorkspaces: Workspace[]) => {
    try {
        const db = await initDB();
        if (db) {
            const existing = await db.getAllKeys('workspaces');
            const currentIds = new Set(currentWorkspaces.map(w => w.id));

            for (const key of existing) {
                if (!currentIds.has(String(key))) {
                    await db.delete('workspaces', key);
                }
            }

            for (const ws of currentWorkspaces) {
                await db.put('workspaces', ws);
            }
            saveFallbackWorkspaces(currentWorkspaces);
            return;
        }
    } catch (e) {
        console.warn('syncWorkspaces IDB error (using localStorage fallback):', e);
        dbPromise = null;
    }

    saveFallbackWorkspaces(currentWorkspaces);
};

export const getWorkspaces = async (): Promise<Workspace[]> => {
    try {
        const db = await initDB();
        if (db) {
            const items = await db.getAll('workspaces');
            if (items && items.length > 0) {
                return items;
            }
        }
    } catch (e) {
        console.warn('getWorkspaces IDB error:', e);
        dbPromise = null;
    }

    return getFallbackWorkspaces();
};

export const saveConfig = async (config: ModelConfig) => {
    try {
        const db = await initDB();
        if (db) {
            await db.put('config', { id: 'current', ...config });
            localStorage.setItem('rh_config_backup', JSON.stringify(config));
            return;
        }
    } catch (e) {
        console.warn('saveConfig IDB error:', e);
        dbPromise = null;
    }

    try {
        localStorage.setItem('rh_config_backup', JSON.stringify(config));
    } catch (_) {}
};

export const getConfig = async (): Promise<ModelConfig | null> => {
    try {
        const db = await initDB();
        if (db) {
            const cfg = await db.get('config', 'current');
            if (cfg) return cfg;
        }
    } catch (e) {
        console.warn('getConfig IDB error:', e);
        dbPromise = null;
    }

    try {
        const raw = localStorage.getItem('rh_config_backup');
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
};

