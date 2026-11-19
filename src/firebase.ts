import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  limit,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { fromDoc } from './data/seedSales';
import type { Sale, UserProfile } from './types/sale';
import {
  buildSalePayload,
  buildUserUpdatePatch,
  isValidDocId,
  normalizeUserProfile,
} from './utils/cloudPayloads';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

function initDb(): Firestore {
  const dbId = firebaseConfig.firestoreDatabaseId || undefined;
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      dbId,
    );
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = initDb();
export const googleProvider = new GoogleAuthProvider();

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function loadOrCreateUserProfile(fbUser: FirebaseUser): Promise<UserProfile> {
  if (!isValidDocId(fbUser.uid)) {
    throw new Error('Invalid user ID');
  }
  const path = `users/${fbUser.uid}`;
  const ref = doc(db, 'users', fbUser.uid);

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (snap.exists()) {
    return normalizeUserProfile(fbUser, snap.data() as Record<string, unknown>);
  }

  const initialProfile = normalizeUserProfile(fbUser);
  const payload = {
    uid: fbUser.uid,
    name: initialProfile.name,
    email: initialProfile.email,
    payments: initialProfile.payments,
    savedIds: initialProfile.savedIds,
    listingOrder: initialProfile.listingOrder || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload);
    return initialProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserProfileFields(
  uid: string,
  fields: Partial<Pick<UserProfile, 'name' | 'payments' | 'savedIds' | 'listingOrder'>>,
): Promise<void> {
  if (!isValidDocId(uid)) {
    throw new Error('Invalid user ID');
  }
  const { hasChanges, patch } = buildUserUpdatePatch(fields, serverTimestamp());
  if (!hasChanges) return;

  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    await updateDoc(ref, patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

const PUBLIC_SALES_LIMIT = 300;

export function subscribePublicSales(
  onData: (sales: Sale[]) => void,
  onError: (err: unknown) => void,
): Unsubscribe {
  const salesQuery = query(
    collection(db, 'sales'),
    where('status', '==', 'active'),
    limit(PUBLIC_SALES_LIMIT),
  );
  return onSnapshot(
    salesQuery,
    (snapshot) => {
      const uid = auth.currentUser?.uid || null;
      const list = snapshot.docs
        .map((d) => fromDoc(d.id, d.data(), uid))
        .filter((item): item is Sale => item !== null);
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'sales');
      } catch (wrapped) {
        onError(wrapped);
      }
    },
  );
}

export async function createSaleInCloud(sale: Sale): Promise<{ droppedPhotos: boolean }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  if (!isValidDocId(sale.id)) throw new Error('Invalid sale ID');
  const path = `sales/${sale.id}`;
  const { payload, droppedPhotos } = buildSalePayload(sale, user.uid, false, serverTimestamp());
  try {
    await setDoc(doc(db, 'sales', sale.id), payload);
    return { droppedPhotos };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSaleInCloud(sale: Sale): Promise<{ droppedPhotos: boolean }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  if (!isValidDocId(sale.id)) throw new Error('Invalid sale ID');
  const path = `sales/${sale.id}`;
  const { payload, droppedPhotos } = buildSalePayload(sale, user.uid, true, serverTimestamp());
  try {
    await updateDoc(doc(db, 'sales', sale.id), payload);
    return { droppedPhotos };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSaleInCloud(saleId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  if (!isValidDocId(saleId)) throw new Error('Invalid sale ID');
  const path = `sales/${saleId}`;
  try {
    await deleteDoc(doc(db, 'sales', saleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
