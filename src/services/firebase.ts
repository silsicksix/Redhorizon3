import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore,
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocFromServer,
  setDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  deleteDoc,
  getDocs,
  where,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import type { Node, Link, GraphData } from '../types';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Initialize Firebase SDK with user's dedicated project config
export const firebaseConfig = firebaseConfigJson && firebaseConfigJson.projectId ? {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
} : {
  apiKey: "AIzaSyCfautOePYW7k-I2fPHSnyl1nH7f8ffyiw",
  authDomain: "r3dhorizon-eb451.firebaseapp.com",
  projectId: "r3dhorizon-eb451",
  storageBucket: "r3dhorizon-eb451.firebasestorage.app",
  messagingSenderId: "367126559133",
  appId: "1:367126559133:web:b404744748ace52c3e5774",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with experimentalForceLongPolling to prevent iframe proxy/sandbox connection drops
const targetDbId = (firebaseConfigJson as any)?.firestoreDatabaseId || '(default)';
export const db = targetDbId && targetDbId !== '(default)'
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, targetDbId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });

// Firebase Skill Error Handling Definitions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Skill constraint: test connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or operating in offline resilient mode.");
    }
  }
}
testConnection().catch(() => {});

// Ensure auth check without forcing anonymous auth
export async function ensureAuth(): Promise<FirebaseUser | null> {
  if (!auth) return null;
  return auth.currentUser || null;
}

export interface OperativeProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'lead' | 'investigator' | 'analyst' | 'viewer';
  lastActive: number;
  activeNodeId?: string | null;
  activeNodeLabel?: string | null;
  activeNodeType?: string | null;
  activeModal?: string | null;
  activeTool?: string | null;
  currentActivity?: string | null;
  statusText?: string;
  isCanvasActive?: boolean;
}

export interface CollabMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  senderRole?: string;
  text: string;
  type: 'chat' | 'finding_broadcast' | 'urgent_intel' | 'node_share' | 'file_share' | 'case_share' | 'system' | 'ai_analyst';
  replyTo?: {
    messageId: string;
    senderName: string;
    senderRole?: string;
    text: string;
    type?: string;
  } | null;
  linkedNode?: {
    id: string;
    label: string;
    type: string;
    details?: string;
    imageUrl?: string;
  };
  fileAttachment?: {
    name: string;
    size: number;
    type: string;
    dataUrl?: string; // Compressed image or file text snippet
    telegramFileId?: string;
    telegramDownloadUrl?: string;
    isTelegramRelay?: boolean;
  };
  casePayload?: {
    caseName: string;
    totalEntities: number;
    totalLinks?: number;
    nodes: Node[];
    links: Link[];
    version?: string;
    telegramFileId?: string;
    telegramDownloadUrl?: string;
    isTelegramRelay?: boolean;
  };
  aiAnalystPayload?: {
    analystName: string;
    analystModel: string;
    suggestedTools?: Array<{
      id: string;
      name: string;
      modalId: string;
      icon: string;
      reason: string;
    }>;
    targetFocusNodeId?: string;
    matchedCanvasNodes?: Array<{
      nodeId: string;
      label: string;
      type: string;
      details?: string;
      url?: string;
      connectionsCount?: number;
      relevanceReason?: string;
      imageUrl?: string;
    }>;
    socialMediaNodes?: Array<{
      nodeId?: string;
      platform: string;
      platformName: string;
      symbol?: string;
      handleOrLabel: string;
      url?: string;
      relationship?: string;
      isCanvasNode: boolean;
      status?: string;
      details?: string;
      imageUrl?: string;
    }>;
    webSources?: Array<{
      title?: string;
      url?: string;
    }>;
    searchQueries?: string[];
  };
  timestamp: number;
  reactions?: Record<string, string[]>; // emoji: [userIds]
}

export interface RoomMetadata {
  id: string;
  name: string;
  createdById: string;
  createdByEmail: string;
  createdAt: number;
  passcode?: string;
  isPrivate?: boolean;
  isEliteOnly?: boolean;
  allowedEmails?: string[];
  description?: string;
}

// Helper to recursively remove undefined properties before sending to Firestore
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as any;
  }
  return data;
}

// Helper to strip or trim base64 data URIs and long strings for cloud sync
function sanitizeUrlOrBase64(val: string | null | undefined, maxChars = 100000): string | null {
  if (!val || typeof val !== 'string') return null;
  if (val.startsWith('data:')) {
    // Compressed thumbnails are typically 15KB-40KB. Cap at maxChars
    if (val.length <= maxChars) {
      return val;
    }
    return null;
  }
  if (val.length > 2000) return null;
  return val;
}

function sanitizeTextForSync(val: string | null | undefined, maxChars = 2000): string | null {
  if (!val || typeof val !== 'string') return null;
  if (val.startsWith('data:')) return null;
  if (val.length > maxChars) {
    return val.slice(0, maxChars) + '... [TRUNCATED]';
  }
  return val;
}

function getPayloadByteSize(obj: any): number {
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
  } catch (_) {
    return 10_000_000;
  }
}

// Google Authentication
export const loginWithGoogle = async (): Promise<OperativeProfile | null> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    return {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Operative',
      email: user.email || '',
      photoURL: user.photoURL || '',
      role: (user.email === 'fisaabilillah@gmail.com' || user.email === LEAD_ADMIN_EMAIL) ? 'lead' : 'investigator',
      lastActive: Date.now(),
    };
  } catch (error: any) {
    const errCode = error?.code || '';
    const errMsg = error?.message || String(error);
    if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) {
      console.warn('[Firebase Auth Notice] Domain not authorized in Firebase Console:', window.location.hostname);
    } else {
      console.warn('Google Sign-In notice:', errCode || errMsg);
    }
    throw error;
  }
};

export const logoutOperative = async (roomId?: string, uid?: string) => {
  try {
    const targetUid = uid || auth.currentUser?.uid;
    if (targetUid && roomId) {
      await removePresence(roomId, targetUid).catch(() => {});
    }
    localStorage.removeItem('redhorizon_local_user');
    await signOut(auth).catch(() => {});
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (
      errMsg.toLowerCase().includes('closing') ||
      errMsg.toLowerCase().includes('hidden') ||
      errMsg.toLowerCase().includes('indexeddb') ||
      err?.code === 'auth/internal-error'
    ) {
      console.warn('Logout notification (Database closing/hidden ignored gracefully):', errMsg);
    } else {
      console.error('Logout error:', err);
    }
  }
};

// Update Operative Presence in Room
export const updatePresence = async (
  roomId: string,
  profile: OperativeProfile,
  activityDetails?: {
    activeNodeId?: string | null;
    activeNodeLabel?: string | null;
    activeNodeType?: string | null;
    activeModal?: string | null;
    activeTool?: string | null;
    currentActivity?: string | null;
    isCanvasActive?: boolean;
    statusText?: string;
  } | string | null
) => {
  if (!roomId || !profile.uid) return;
  try {
    const presenceRef = doc(db, 'rooms', roomId, 'presence', profile.uid);
    const isLegacyNodeId = typeof activityDetails === 'string';
    const activeNodeId = isLegacyNodeId ? activityDetails : activityDetails?.activeNodeId || profile.activeNodeId || null;
    const activeNodeLabel = !isLegacyNodeId ? (activityDetails?.activeNodeLabel || profile.activeNodeLabel || null) : (profile.activeNodeLabel || null);
    const activeNodeType = !isLegacyNodeId ? (activityDetails?.activeNodeType || profile.activeNodeType || null) : (profile.activeNodeType || null);
    const activeModal = !isLegacyNodeId ? (activityDetails?.activeModal || profile.activeModal || null) : (profile.activeModal || null);
    const activeTool = !isLegacyNodeId ? (activityDetails?.activeTool || profile.activeTool || null) : (profile.activeTool || null);
    const currentActivity = !isLegacyNodeId ? (activityDetails?.currentActivity || profile.currentActivity || null) : (profile.currentActivity || null);
    const isCanvasActive = !isLegacyNodeId ? (activityDetails?.isCanvasActive !== undefined ? activityDetails.isCanvasActive : profile.isCanvasActive) : profile.isCanvasActive;
    const statusText = !isLegacyNodeId ? (activityDetails?.statusText || profile.statusText) : profile.statusText;

    const payload = sanitizeForFirestore({
      ...profile,
      activeNodeId,
      activeNodeLabel,
      activeNodeType,
      activeModal,
      activeTool,
      currentActivity,
      isCanvasActive: isCanvasActive ?? true,
      statusText: statusText || undefined,
      lastActive: Date.now(),
    });
    await setDoc(presenceRef, payload, { merge: true });
  } catch (err) {
    console.warn('Presence update error:', err);
  }
};

// Remove Operative Presence when leaving
export const removePresence = async (roomId: string, uid: string) => {
  if (!roomId || !uid) return;
  try {
    const presenceRef = doc(db, 'rooms', roomId, 'presence', uid);
    await deleteDoc(presenceRef);
  } catch (err) {
    console.warn('Presence remove error:', err);
  }
};

// Listen to Active Operatives
export const subscribeToPresence = (
  roomId: string,
  onUpdate: (operatives: OperativeProfile[]) => void
) => {
  if (!roomId) return () => {};
  const presenceCol = collection(db, 'rooms', roomId, 'presence');
  return onSnapshot(
    presenceCol,
    (snapshot) => {
      const ops: OperativeProfile[] = [];
      const now = Date.now();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as OperativeProfile;
        // Filter out stale users (> 5 minutes inactive)
        if (now - (data.lastActive || 0) < 5 * 60 * 1000) {
          ops.push(data);
        }
      });
      onUpdate(ops);
    },
    (err) => {
      console.warn('Presence listen error:', err);
    }
  );
};

// Send Collaborative Message / Finding Broadcast
export const sendCollabMessage = async (
  roomId: string,
  message: Omit<CollabMessage, 'id' | 'timestamp'>
) => {
  if (!roomId) throw new Error('Room ID required');
  try {
    const messagesCol = collection(db, 'rooms', roomId, 'messages');
    
    // Stage 1: Build sanitized message with defensive field caps
    const hasCasePayload = Boolean(message.casePayload && message.casePayload.nodes && message.casePayload.nodes.length > 0);

    let sanitizedFileAttachment = message.fileAttachment ? {
      name: String(message.fileAttachment.name || '').slice(0, 200),
      size: Number(message.fileAttachment.size || 0),
      type: String(message.fileAttachment.type || ''),
      // When casePayload is included, do not duplicate raw text/json in dataUrl
      dataUrl: hasCasePayload ? null : sanitizeUrlOrBase64(message.fileAttachment.dataUrl, 80000),
      telegramFileId: message.fileAttachment.telegramFileId ? String(message.fileAttachment.telegramFileId) : undefined,
      telegramDownloadUrl: message.fileAttachment.telegramDownloadUrl ? String(message.fileAttachment.telegramDownloadUrl) : undefined,
      isTelegramRelay: Boolean(message.fileAttachment.isTelegramRelay)
    } : null;

    let sanitizedCaseNodes = message.casePayload?.nodes ? message.casePayload.nodes.slice(0, 400).map((n, idx) => ({
      id: String(n.id || `node_${Date.now()}_${idx}`),
      label: String(n.label || `Entity #${idx + 1}`).slice(0, 200),
      type: String(n.type || 'person').slice(0, 60),
      details: sanitizeTextForSync(n.details, 600),
      imageUrl: sanitizeUrlOrBase64(n.imageUrl, 40000),
      x: typeof n.x === 'number' ? Math.round(n.x) : undefined,
      y: typeof n.y === 'number' ? Math.round(n.y) : undefined
    })) : [];

    let sanitizedCaseLinks = message.casePayload?.links ? message.casePayload.links.slice(0, 800).map(l => ({
      source: typeof l.source === 'object' ? String((l.source as any).id) : String(l.source),
      target: typeof l.target === 'object' ? String((l.target as any).id) : String(l.target),
      label: String(l.label || 'connected').slice(0, 80)
    })) : [];

    let sanitizedCasePayload = hasCasePayload ? {
      caseName: String(message.casePayload?.caseName || 'Case File').slice(0, 200),
      totalEntities: Number(message.casePayload?.totalEntities || sanitizedCaseNodes.length),
      totalLinks: Number(message.casePayload?.totalLinks || sanitizedCaseLinks.length),
      version: String(message.casePayload?.version || '2.9.1'),
      nodes: sanitizedCaseNodes,
      links: sanitizedCaseLinks,
      telegramFileId: message.casePayload?.telegramFileId ? String(message.casePayload.telegramFileId) : undefined,
      telegramDownloadUrl: message.casePayload?.telegramDownloadUrl ? String(message.casePayload.telegramDownloadUrl) : undefined,
      isTelegramRelay: Boolean(message.casePayload?.isTelegramRelay)
    } : null;

    const baseMsg = {
      senderId: String(message.senderId || ''),
      senderName: String(message.senderName || 'Operative'),
      senderPhoto: sanitizeUrlOrBase64(message.senderPhoto, 30000) || undefined,
      senderRole: message.senderRole || 'investigator',
      text: String(message.text || '').slice(0, 5000),
      type: message.type || 'chat',
      replyTo: message.replyTo ? {
        messageId: String(message.replyTo.messageId || ''),
        senderName: String(message.replyTo.senderName || 'Operative').slice(0, 100),
        senderRole: message.replyTo.senderRole ? String(message.replyTo.senderRole).slice(0, 40) : undefined,
        text: String(message.replyTo.text || '').slice(0, 300),
        type: message.replyTo.type ? String(message.replyTo.type).slice(0, 40) : undefined,
      } : null,
      linkedNode: message.linkedNode ? {
        id: String(message.linkedNode.id || ''),
        label: String(message.linkedNode.label || '').slice(0, 200),
        type: String(message.linkedNode.type || 'entity').slice(0, 80),
        details: sanitizeTextForSync(message.linkedNode.details, 400),
        imageUrl: sanitizeUrlOrBase64(message.linkedNode.imageUrl, 40000)
      } : null,
      fileAttachment: sanitizedFileAttachment,
      casePayload: sanitizedCasePayload,
      timestamp: Date.now(),
    };

    let payload = sanitizeForFirestore(baseMsg);
    const MAX_SAFE_MSG_BYTES = 700_000; // 700 KB safety limit (Firestore max: 1,048,576 bytes)

    // Stage 2: If message payload exceeds 700KB, strip embedded node image data and reduce details
    if (getPayloadByteSize(payload) > MAX_SAFE_MSG_BYTES) {
      if (sanitizedFileAttachment) {
        sanitizedFileAttachment.dataUrl = null;
      }
      if (sanitizedCasePayload && sanitizedCasePayload.nodes) {
        sanitizedCasePayload.nodes = sanitizedCasePayload.nodes.map(n => ({
          ...n,
          imageUrl: n.imageUrl && n.imageUrl.startsWith('http') ? n.imageUrl : null,
          details: n.details ? n.details.slice(0, 150) : null
        }));
      }
      payload = sanitizeForFirestore({
        ...baseMsg,
        fileAttachment: sanitizedFileAttachment,
        casePayload: sanitizedCasePayload
      });
    }

    // Stage 3: If still over 700KB, slice nodes to top 200
    if (getPayloadByteSize(payload) > MAX_SAFE_MSG_BYTES && sanitizedCasePayload && sanitizedCasePayload.nodes) {
      const slicedNodes = sanitizedCasePayload.nodes.slice(0, 200);
      const validIds = new Set(slicedNodes.map(n => n.id));
      const slicedLinks = (sanitizedCasePayload.links || []).filter(l => validIds.has(l.source) && validIds.has(l.target));
      
      sanitizedCasePayload = {
        ...sanitizedCasePayload,
        nodes: slicedNodes,
        links: slicedLinks
      };

      payload = sanitizeForFirestore({
        ...baseMsg,
        fileAttachment: sanitizedFileAttachment,
        casePayload: sanitizedCasePayload
      });
    }

    await addDoc(messagesCol, payload);
  } catch (err) {
    console.error('Failed to send message:', err);
    throw err;
  }
};

// Toggle Message Emoji Reaction
export const toggleMessageReaction = async (
  roomId: string,
  messageId: string,
  emoji: string,
  userId: string
) => {
  if (!roomId || !messageId || !userId) return;
  try {
    const msgRef = doc(db, 'rooms', roomId, 'messages', messageId);
    const snap = await getDocs(query(collection(db, 'rooms', roomId, 'messages'), where('__name__', '==', messageId)));
    if (!snap.empty) {
      const currentReactions: Record<string, string[]> = snap.docs[0].data().reactions || {};
      const currentList = currentReactions[emoji] || [];
      let updatedList: string[];
      if (currentList.includes(userId)) {
        updatedList = currentList.filter(id => id !== userId);
      } else {
        updatedList = [...currentList, userId];
      }
      
      const newReactions = { ...currentReactions, [emoji]: updatedList };
      if (updatedList.length === 0) {
        delete newReactions[emoji];
      }

      await updateDoc(msgRef, {
        reactions: sanitizeForFirestore(newReactions)
      });
    }
  } catch (err) {
    console.warn('Reaction error:', err);
  }
};

// Listen to Realtime Chat Messages
export const subscribeToMessages = (
  roomId: string,
  onUpdate: (messages: CollabMessage[]) => void,
  msgLimit = 1000
) => {
  if (!roomId) return () => {};
  const messagesCol = collection(db, 'rooms', roomId, 'messages');
  // Query newest messages descending so we never miss recent messages after threshold
  const q = query(messagesCol, orderBy('timestamp', 'desc'), limit(msgLimit));
  
  let fallbackUnsub: (() => void) | null = null;

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const messages: CollabMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messages.push({
          id: docSnap.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderPhoto: data.senderPhoto,
          senderRole: data.senderRole,
          text: data.text,
          type: data.type || 'chat',
          replyTo: data.replyTo || null,
          linkedNode: data.linkedNode,
          fileAttachment: data.fileAttachment,
          casePayload: data.casePayload,
          timestamp: data.timestamp || Date.now(),
          reactions: data.reactions || {},
        });
      });
      // Sort chronologically ascending for chat timeline display
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      onUpdate(messages);
    },
    (err) => {
      console.warn('Primary messages query error, switching to resilient fallback:', err);
      // Fallback: Query collection directly without complex index dependency
      try {
        const fallbackQ = query(messagesCol, limit(msgLimit));
        fallbackUnsub = onSnapshot(fallbackQ, (snapshot) => {
          const messages: CollabMessage[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            messages.push({
              id: docSnap.id,
              senderId: data.senderId,
              senderName: data.senderName,
              senderPhoto: data.senderPhoto,
              senderRole: data.senderRole,
              text: data.text,
              type: data.type || 'chat',
              replyTo: data.replyTo || null,
              linkedNode: data.linkedNode,
              fileAttachment: data.fileAttachment,
              casePayload: data.casePayload,
              timestamp: data.timestamp || Date.now(),
              reactions: data.reactions || {},
            });
          });
          messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          onUpdate(messages);
        }, (fallbackErr: any) => {
          console.warn('Fallback messages query notice (running in local room mode):', fallbackErr?.message || fallbackErr);
        });
      } catch (fErr: any) {
        console.warn('Notice: Failed to initialize fallback message listener, local mode active:', fErr?.message || fErr);
      }
    }
  );

  return () => {
    unsub();
    if (fallbackUnsub) fallbackUnsub();
  };
};

// Delete Message from Collaborative Room (In-App Only)
export const deleteCollabMessage = async (roomId: string, messageId: string) => {
  if (!roomId || !messageId) return;
  try {
    const msgRef = doc(db, 'rooms', roomId, 'messages', messageId);
    await deleteDoc(msgRef);
  } catch (err) {
    console.error('Failed to delete message:', err);
    throw err;
  }
};

// Purge all messages from a specific room in Firestore
export const purgeAllRoomMessages = async (roomId: string): Promise<number> => {
  if (!roomId) return 0;
  try {
    const messagesCol = collection(db, 'rooms', roomId, 'messages');
    const snapshot = await getDocs(messagesCol);
    const count = snapshot.docs.length;
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
    return count;
  } catch (err) {
    console.error('Failed to purge room messages:', err);
    throw err;
  }
};

// Purge live cloud canvas from Firestore room
export const purgeRoomLiveCanvas = async (roomId: string): Promise<void> => {
  if (!roomId) return;
  try {
    const graphDoc = doc(db, 'rooms', roomId, 'workspaces', 'active_canvas');
    await deleteDoc(graphDoc);
  } catch (err) {
    console.error('Failed to purge live room canvas:', err);
    throw err;
  }
};

// Purge and destroy an entire operation room (messages, canvas, presence, room metadata)
export const purgeEntireOperationRoom = async (roomId: string): Promise<void> => {
  if (!roomId) return;
  try {
    // 1. Purge all messages in subcollection
    const messagesCol = collection(db, 'rooms', roomId, 'messages');
    const msgSnap = await getDocs(messagesCol);
    await Promise.all(msgSnap.docs.map(d => deleteDoc(d.ref)));

    // 2. Purge all presence in subcollection
    const presenceCol = collection(db, 'rooms', roomId, 'presence');
    const presSnap = await getDocs(presenceCol);
    await Promise.all(presSnap.docs.map(d => deleteDoc(d.ref)));

    // 3. Purge workspaces
    const graphDoc = doc(db, 'rooms', roomId, 'workspaces', 'active_canvas');
    await deleteDoc(graphDoc).catch(() => {});

    // 4. Purge room doc itself
    const roomRef = doc(db, 'rooms', roomId);
    await deleteDoc(roomRef).catch(() => {});
  } catch (err) {
    console.error('Failed to purge entire operation room from Firestore:', err);
    throw err;
  }
};

// Execute complete client-side zero-trace wipe (LocalStorage, SessionStorage, IndexedDB, Caches)
export const executeZeroTraceLocalPurge = async (): Promise<void> => {
  try {
    // 1. Clear LocalStorage & SessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // 2. Clear IndexedDB databases
    if (window.indexedDB) {
      try {
        window.indexedDB.deleteDatabase('RedHorizonDB');
        if (indexedDB.databases) {
          const dbs = await indexedDB.databases();
          for (const dbInfo of dbs) {
            if (dbInfo.name) {
              window.indexedDB.deleteDatabase(dbInfo.name);
            }
          }
        }
      } catch (e) {
        console.warn('IndexedDB purge notice:', e);
      }
    }

    // 3. Clear CacheStorage
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (e) {
        console.warn('CacheStorage purge notice:', e);
      }
    }
  } catch (err) {
    console.error('Local zero-trace purge failed:', err);
    throw err;
  }
};

// Sync Graph / Canvas Live to Cloud Room
export const syncLiveGraphToRoom = async (
  roomId: string,
  graphData: GraphData,
  author: OperativeProfile
) => {
  if (!roomId || !graphData) return;
  try {
    const graphDoc = doc(db, 'rooms', roomId, 'workspaces', 'active_canvas');
    
    // Stage 1: Standard Sanitization (strip base64 data URIs, truncate long text > 2000 chars)
    let cleanNodes = (graphData.nodes || []).map(n => {
      const sanitizedImageUrls = Array.isArray(n.imageUrls)
        ? n.imageUrls.map(u => sanitizeUrlOrBase64(u)).filter(Boolean) as string[]
        : [];

      const sanitizedSources = Array.isArray(n.sources)
        ? n.sources.slice(0, 10).map(s => ({
            sourceName: String(s.sourceName || '').slice(0, 100),
            timestamp: String(s.timestamp || ''),
            url: sanitizeUrlOrBase64(s.url),
            details: sanitizeTextForSync(s.details, 500)
          }))
        : [];

      return {
        id: String(n.id || ''),
        label: String(n.label || '').slice(0, 300),
        type: String(n.type || 'entity').slice(0, 100),
        details: sanitizeTextForSync(n.details, 2000),
        imageUrl: sanitizeUrlOrBase64(n.imageUrl),
        imageUrls: sanitizedImageUrls,
        reports: sanitizeTextForSync(n.reports, 2000),
        htmlReportUrl: sanitizeUrlOrBase64(n.htmlReportUrl),
        sourceType: n.sourceType ? String(n.sourceType).slice(0, 100) : null,
        url: sanitizeUrlOrBase64(n.url),
        vaultMatch: Boolean(n.vaultMatch),
        vaultSource: n.vaultSource ? String(n.vaultSource).slice(0, 100) : null,
        confidenceScore: typeof n.confidenceScore === 'number' ? n.confidenceScore : null,
        confidenceLevel: n.confidenceLevel || null,
        verificationStatus: n.verificationStatus || null,
        sources: sanitizedSources,
        aliases: Array.isArray(n.aliases) ? n.aliases.slice(0, 10).map(a => String(a).slice(0, 100)) : [],
        mergedFromIds: Array.isArray(n.mergedFromIds) ? n.mergedFromIds.slice(0, 10) : [],
        x: typeof n.x === 'number' ? Math.round(n.x) : null,
        y: typeof n.y === 'number' ? Math.round(n.y) : null,
        fx: typeof n.fx === 'number' ? Math.round(n.fx) : null,
        fy: typeof n.fy === 'number' ? Math.round(n.fy) : null,
      };
    });

    let cleanLinks = (graphData.links || []).map(l => ({
      source: typeof l.source === 'object' ? String((l.source as Node).id) : String(l.source),
      target: typeof l.target === 'object' ? String((l.target as Node).id) : String(l.target),
      label: String(l.label || '').slice(0, 150),
      isVault: Boolean(l.isVault)
    }));

    let payload = sanitizeForFirestore({
      nodes: cleanNodes,
      links: cleanLinks,
      updatedAt: Date.now(),
      updatedBy: {
        uid: author.uid || 'anon',
        name: author.displayName || 'Operative',
        email: author.email || ''
      }
    });

    const MAX_SAFE_BYTES = 800_000; // 800 KB (well below 1,048,576 bytes limit)

    // Stage 2: If still oversized, drop non-essential heavy fields (reports, htmlReportUrl, sources)
    if (getPayloadByteSize(payload) > MAX_SAFE_BYTES) {
      cleanNodes = cleanNodes.map(n => ({
        ...n,
        reports: null,
        htmlReportUrl: null,
        sources: [],
        details: n.details ? n.details.slice(0, 500) + '... [TRUNCATED]' : null
      }));
      payload = sanitizeForFirestore({
        nodes: cleanNodes,
        links: cleanLinks,
        updatedAt: Date.now(),
        updatedBy: payload.updatedBy
      });
    }

    // Stage 3: If still oversized, strip details and non-essential arrays completely but PRESERVE imageUrl / imageUrls
    if (getPayloadByteSize(payload) > MAX_SAFE_BYTES) {
      cleanNodes = cleanNodes.map(n => ({
        ...n,
        details: null,
        reports: null,
        htmlReportUrl: null,
        sources: [],
        aliases: [],
        mergedFromIds: []
      }));
      payload = sanitizeForFirestore({
        nodes: cleanNodes,
        links: cleanLinks,
        updatedAt: Date.now(),
        updatedBy: payload.updatedBy
      });
    }

    // Stage 4: If still oversized (e.g. thousands of nodes), slice node list to fit within 800 KB
    if (getPayloadByteSize(payload) > MAX_SAFE_BYTES) {
      const allowedNodesCount = Math.max(10, Math.floor(cleanNodes.length * 0.5));
      cleanNodes = cleanNodes.slice(0, allowedNodesCount);
      const validNodeIds = new Set(cleanNodes.map(n => n.id));
      cleanLinks = cleanLinks.filter(l => validNodeIds.has(l.source as string) && validNodeIds.has(l.target as string));
      
      payload = sanitizeForFirestore({
        nodes: cleanNodes,
        links: cleanLinks,
        updatedAt: Date.now(),
        updatedBy: payload.updatedBy
      });
    }

    await ensureAuth();
    await setDoc(graphDoc, payload, { merge: true });
  } catch (err: any) {
    console.warn('Notice: Cloud graph sync offline or restricted, operating locally:', err?.message || err);
  }
};

// Subscribe to Live Cloud Canvas Updates
export const subscribeToCloudGraph = (
  roomId: string,
  onUpdate: (data: { nodes: Node[]; links: Link[]; updatedAt: number; updatedBy?: any; isNewRoom?: boolean }) => void
) => {
  if (!roomId) return () => {};
  const graphDoc = doc(db, 'rooms', roomId, 'workspaces', 'active_canvas');
  return onSnapshot(
    graphDoc,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate({
          nodes: data.nodes || [],
          links: data.links || [],
          updatedAt: data.updatedAt || Date.now(),
          updatedBy: data.updatedBy,
          isNewRoom: false
        });
      } else {
        // Document does not exist in Firestore room workspace yet
        onUpdate({
          nodes: [],
          links: [],
          updatedAt: Date.now(),
          updatedBy: { uid: 'system_purge', name: 'OPSEC Purge' },
          isNewRoom: true
        });
      }
    },
    (err) => {
      console.warn('Cloud graph listen error:', err);
    }
  );
};

// Fetch or initialize room metadata with security passcode
export const getOrCreateRoomMetadata = async (
  roomId: string,
  defaultPasscode = 'RH2026',
  userEmail = ''
): Promise<RoomMetadata> => {
  if (!roomId) throw new Error('Room ID required');
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: roomId,
        name: data.name || roomId,
        createdById: data.createdById || 'system',
        createdByEmail: data.createdByEmail || userEmail,
        createdAt: data.createdAt || Date.now(),
        passcode: data.passcode || defaultPasscode,
        isPrivate: Boolean(data.isPrivate),
        isEliteOnly: Boolean(data.isEliteOnly),
        allowedEmails: data.allowedEmails || [],
        description: data.description || ''
      };
    } else {
      const newRoom: RoomMetadata = {
        id: roomId,
        name: roomId,
        createdById: auth.currentUser?.uid || 'system',
        createdByEmail: auth.currentUser?.email || userEmail || 'system@field-ops.local',
        createdAt: Date.now(),
        passcode: defaultPasscode,
        isPrivate: false,
        isEliteOnly: false,
        allowedEmails: [],
        description: 'Operation Collaborative Chat Room'
      };
      await setDoc(roomRef, sanitizeForFirestore(newRoom), { merge: true });
      return newRoom;
    }
  } catch (err) {
    console.warn('Error fetching or creating room metadata:', err);
    return {
      id: roomId,
      name: roomId,
      createdById: 'system',
      createdByEmail: userEmail,
      createdAt: Date.now(),
      passcode: defaultPasscode,
      isEliteOnly: false
    };
  }
};

// Create or update custom operation room with passcode & Elite Agent restriction
export const createCustomRoom = async (
  roomId: string,
  passcode: string,
  isEliteOnly: boolean,
  userEmail = ''
): Promise<RoomMetadata> => {
  if (!roomId) throw new Error('ID Bilik diperlukan');
  const cleanId = roomId.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', cleanId);
  const snap = await getDoc(roomRef);

  if (snap.exists()) {
    const existing = snap.data();
    const updatedData = {
      passcode: passcode.trim() || existing.passcode || 'RH2026',
      isEliteOnly: Boolean(isEliteOnly),
      isPrivate: Boolean(isEliteOnly),
      updatedByEmail: userEmail || auth.currentUser?.email || '',
      updatedAt: Date.now()
    };
    await setDoc(roomRef, sanitizeForFirestore(updatedData), { merge: true });
    return {
      id: cleanId,
      name: existing.name || cleanId,
      createdById: existing.createdById || auth.currentUser?.uid || 'system',
      createdByEmail: existing.createdByEmail || userEmail || '',
      createdAt: existing.createdAt || Date.now(),
      passcode: passcode.trim() || existing.passcode || 'RH2026',
      isPrivate: Boolean(existing.isPrivate || isEliteOnly),
      isEliteOnly: Boolean(isEliteOnly),
      allowedEmails: existing.allowedEmails || [],
      description: existing.description || (isEliteOnly ? 'Bilik Akses Terhad Elite Agent' : 'Bilik Operasi Pasukan')
    };
  }

  const newRoom: RoomMetadata = {
    id: cleanId,
    name: cleanId,
    createdById: auth.currentUser?.uid || 'system',
    createdByEmail: auth.currentUser?.email || userEmail || 'system@field-ops.local',
    createdAt: Date.now(),
    passcode: passcode.trim() || 'RH2026',
    isPrivate: Boolean(isEliteOnly),
    isEliteOnly: Boolean(isEliteOnly),
    allowedEmails: [],
    description: isEliteOnly ? 'Bilik Akses Terhad Elite Agent' : 'Bilik Operasi Pasukan'
  };

  await setDoc(roomRef, sanitizeForFirestore(newRoom), { merge: true });
  return newRoom;
};

// Update Room Special Passcode
export const updateRoomPasscode = async (
  roomId: string,
  newPasscode: string,
  userEmail = ''
): Promise<void> => {
  if (!roomId || !newPasscode) throw new Error('Room ID and new passcode required');
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await setDoc(roomRef, sanitizeForFirestore({
      passcode: newPasscode.trim(),
      updatedByEmail: userEmail || auth.currentUser?.email || '',
      updatedAt: Date.now()
    }), { merge: true });
  } catch (err) {
    console.error('Failed to update room passcode:', err);
    throw err;
  }
};

// Subscribe to Room Metadata changes (e.g. passcode changes)
export const subscribeToRoomMetadata = (
  roomId: string,
  onUpdate: (room: RoomMetadata | null) => void
) => {
  if (!roomId) return () => {};
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          id: roomId,
          name: data.name || roomId,
          createdById: data.createdById || 'system',
          createdByEmail: data.createdByEmail || '',
          createdAt: data.createdAt || Date.now(),
          passcode: data.passcode || 'RH2026',
          isPrivate: Boolean(data.isPrivate),
          isEliteOnly: Boolean(data.isEliteOnly),
          allowedEmails: data.allowedEmails || [],
          description: data.description || ''
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('Room metadata listen error:', err);
    }
  );
};

// Subscribe to all created operation rooms list
export const subscribeToAllRooms = (
  onUpdate: (rooms: RoomMetadata[]) => void
) => {
  const roomsRef = collection(db, 'rooms');
  return onSnapshot(
    roomsRef,
    (snap) => {
      const list: RoomMetadata[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || docSnap.id,
          createdById: data.createdById || 'system',
          createdByEmail: data.createdByEmail || 'Sistem',
          createdAt: data.createdAt || Date.now(),
          passcode: data.passcode || 'RH2026',
          isPrivate: Boolean(data.isPrivate),
          isEliteOnly: Boolean(data.isEliteOnly),
          allowedEmails: data.allowedEmails || [],
          description: data.description || ''
        });
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('All rooms listen error:', err);
      onUpdate([]);
    }
  );
};

// Delete operation room by ID (Elite Agent capability)
export const deleteOperationRoom = async (roomId: string): Promise<void> => {
  if (!roomId) return;
  const roomRef = doc(db, 'rooms', roomId.trim().toUpperCase());
  await deleteDoc(roomRef);
};

// ==========================================
// LEAD ADMIN ACCESS CONTROL & INVESTIGATOR APPROVALS
// ==========================================
export const LEAD_ADMIN_EMAIL = 'fisaabilillah@gmail.com';
export const LEAD_ADMIN_TITLE = 'Elite Agent';

export const getProtectedEmailDisplay = (email?: string | null): string => {
  if (!email) return 'Penyiasat';
  if (email.trim().toLowerCase() === LEAD_ADMIN_EMAIL.toLowerCase()) {
    return 'Elite Agent [Identiti Sulit/Terenkripsi]';
  }
  return email;
};

export interface AccessRequest {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  role?: 'lead' | 'investigator' | 'analyst' | 'viewer';
  notes?: string;
  department?: string;
}

// Check or Register Access Request for current user
export const checkOrCreateAccessRequest = async (user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}): Promise<AccessRequest> => {
  if (!user.email) {
    throw new Error('Akaun tanpa e-mel tidak dibenarkan.');
  }

  const normalizedEmail = user.email.trim().toLowerCase();
  const isLeadAdmin = normalizedEmail === LEAD_ADMIN_EMAIL.toLowerCase();

  const fallbackLeadAdminReq: AccessRequest = {
    uid: user.uid,
    email: normalizedEmail,
    displayName: user.displayName || 'Lead / Elite Agent',
    photoURL: user.photoURL || undefined,
    status: 'approved',
    requestedAt: Date.now(),
    reviewedAt: Date.now(),
    reviewedBy: 'SYSTEM_LEAD_ADMIN',
    role: 'lead',
    notes: 'Super Admin Lead Authority'
  };

  try {
    const requestRef = doc(db, 'access_requests', user.uid);
    let snap: any = null;
    try {
      snap = await getDoc(requestRef);
    } catch (readErr) {
      console.warn('Firestore read access_requests warning:', readErr);
    }

    if (isLeadAdmin) {
      try {
        await setDoc(requestRef, sanitizeForFirestore(fallbackLeadAdminReq), { merge: true });
      } catch (writeErr) {
        console.warn('Firestore write lead admin doc warning:', writeErr);
      }
      return fallbackLeadAdminReq;
    }

    // Check if there is an email-based pre-approval or existing record
    const emailSanitizedKey = `pre_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const emailPreRef = doc(db, 'access_requests', emailSanitizedKey);
    let emailPreSnap: any = null;
    try {
      emailPreSnap = await getDoc(emailPreRef);
    } catch (_) {}

    if (emailPreSnap && emailPreSnap.exists()) {
      const preData = emailPreSnap.data();
      if (preData.status === 'approved') {
        const mergedApprovedReq: AccessRequest = {
          uid: user.uid,
          email: normalizedEmail,
          displayName: user.displayName || preData.displayName || 'Penyiasat',
          photoURL: user.photoURL || undefined,
          status: 'approved',
          requestedAt: preData.requestedAt || Date.now(),
          reviewedAt: preData.reviewedAt || Date.now(),
          reviewedBy: preData.reviewedBy || LEAD_ADMIN_EMAIL,
          role: preData.role || 'investigator',
          notes: preData.notes || 'Pra-kelulusan melalui jemputan e-mel Lead Admin'
        };
        try {
          await setDoc(requestRef, sanitizeForFirestore(mergedApprovedReq), { merge: true });
          await deleteDoc(emailPreRef);
        } catch (_) {}
        return mergedApprovedReq;
      }
    }

    if (snap && snap.exists()) {
      const data = snap.data();
      return {
        uid: user.uid,
        email: normalizedEmail,
        displayName: data.displayName || user.displayName || 'Penyiasat',
        photoURL: data.photoURL || user.photoURL || undefined,
        status: data.status || 'pending',
        requestedAt: data.requestedAt || Date.now(),
        reviewedAt: data.reviewedAt,
        reviewedBy: data.reviewedBy,
        role: data.role || 'investigator',
        notes: data.notes || '',
        department: data.department || ''
      };
    } else {
      const newReq: AccessRequest = {
        uid: user.uid,
        email: normalizedEmail,
        displayName: user.displayName || 'Penyiasat',
        photoURL: user.photoURL || undefined,
        status: 'pending',
        requestedAt: Date.now(),
        role: 'investigator',
        notes: ''
      };
      try {
        await setDoc(requestRef, sanitizeForFirestore(newReq));
      } catch (err) {
        console.warn('Could not create new access request in Firestore:', err);
      }
      return newReq;
    }
  } catch (err) {
    console.error('Firestore access_requests error:', err);
    if (isLeadAdmin) {
      return fallbackLeadAdminReq;
    }
    return {
      uid: user.uid,
      email: normalizedEmail,
      displayName: user.displayName || 'Penyiasat',
      photoURL: user.photoURL || undefined,
      status: 'pending',
      requestedAt: Date.now(),
      role: 'investigator',
      notes: 'Offline / local fallback'
    };
  }
};

// Submit/Update custom note or justification for an access request
export const submitAccessRequestNote = async (
  uid: string,
  notes: string,
  department = ''
): Promise<void> => {
  if (!uid) return;
  const requestRef = doc(db, 'access_requests', uid);
  await setDoc(
    requestRef,
    sanitizeForFirestore({
      notes: notes.trim(),
      department: department.trim(),
      updatedAt: Date.now()
    }),
    { merge: true }
  );
};

// Lead Admin pre-approves an investigator by email before or as they log in
export const preApproveInvestigatorByEmail = async (
  email: string,
  displayName = 'Penyiasat Jemputan',
  role: 'lead' | 'investigator' | 'analyst' | 'viewer' = 'investigator',
  notes = 'Dijemput / Diluluskan awal oleh Lead Admin',
  reviewedByEmail = LEAD_ADMIN_EMAIL
): Promise<AccessRequest> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Sila masukkan e-mel yang sah.');
  }

  const emailSanitizedKey = `pre_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const requestRef = doc(db, 'access_requests', emailSanitizedKey);

  const preApprovedReq: AccessRequest = {
    uid: emailSanitizedKey,
    email: normalizedEmail,
    displayName: displayName || 'Penyiasat Jemputan',
    status: 'approved',
    requestedAt: Date.now(),
    reviewedAt: Date.now(),
    reviewedBy: reviewedByEmail,
    role,
    notes
  };

  await setDoc(requestRef, sanitizeForFirestore(preApprovedReq), { merge: true });
  return preApprovedReq;
};

// Subscribe to a specific user's access request status
export const subscribeToUserAccessRequest = (
  uid: string,
  userEmail: string,
  onUpdate: (req: AccessRequest | null) => void
) => {
  if (!uid) return () => {};

  const normalizedEmail = (userEmail || '').trim().toLowerCase();

  if (normalizedEmail === LEAD_ADMIN_EMAIL.toLowerCase()) {
    onUpdate({
      uid,
      email: normalizedEmail,
      displayName: 'Lead / Elite Agent',
      status: 'approved',
      requestedAt: Date.now(),
      role: 'lead'
    });
    return () => {};
  }

  const requestRef = doc(db, 'access_requests', uid);
  return onSnapshot(
    requestRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          uid,
          email: data.email || normalizedEmail,
          displayName: data.displayName || 'Penyiasat',
          photoURL: data.photoURL || undefined,
          status: data.status || 'pending',
          requestedAt: data.requestedAt || Date.now(),
          reviewedAt: data.reviewedAt,
          reviewedBy: data.reviewedBy,
          role: data.role || 'investigator',
          notes: data.notes || '',
          department: data.department || ''
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('Access request listen error:', err);
    }
  );
};

// Subscribe to ALL access requests (for Lead Admin fisaabilillah@gmail.com)
export const subscribeToAllAccessRequests = (
  onUpdate: (requests: AccessRequest[]) => void
) => {
  const reqCol = collection(db, 'access_requests');
  return onSnapshot(
    reqCol,
    (snap) => {
      const list: AccessRequest[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          uid: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || 'Penyiasat',
          photoURL: data.photoURL,
          status: data.status || 'pending',
          requestedAt: data.requestedAt || Date.now(),
          reviewedAt: data.reviewedAt,
          reviewedBy: data.reviewedBy,
          role: data.role || 'investigator',
          notes: data.notes || '',
          department: data.department || ''
        });
      });
      list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.requestedAt || 0) - (a.requestedAt || 0);
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('All access requests listen error:', err);
    }
  );
};

// Update access request status (Approve / Reject) by Admin
export const updateAccessRequestStatus = async (
  uid: string,
  status: 'approved' | 'rejected' | 'pending',
  role: 'lead' | 'investigator' | 'analyst' | 'viewer' = 'investigator',
  notes = '',
  reviewedByEmail = LEAD_ADMIN_EMAIL
): Promise<void> => {
  if (!uid) return;
  const requestRef = doc(db, 'access_requests', uid);
  await setDoc(
    requestRef,
    sanitizeForFirestore({
      status,
      role,
      notes,
      reviewedAt: Date.now(),
      reviewedBy: reviewedByEmail
    }),
    { merge: true }
  );
};


