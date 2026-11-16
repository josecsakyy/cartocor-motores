import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { firebaseConfig, MOTORS_COLLECTION_PATH } from '../config/firebase';
import { normalizeMotor, toStorage } from '../domain/motor';

const BATCH_LIMIT = 450; // Firestore admite hasta 500 operaciones por lote.

/*
 * Repositorio de motores en Firestore.
 * La caché persistente con varias pestañas hace que todas las ventanas abiertas
 * vean exactamente los mismos datos, incluso sin conexión.
 */
let instance = null;

/** Devuelve siempre la misma instancia: Firebase no admite inicializarse dos veces. */
export function createFirestoreRepository() {
  instance ??= init();
  return instance;
}

async function init() {
  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const auth = getAuth(app);
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);

  const motorsRef = collection(db, ...MOTORS_COLLECTION_PATH);

  return {
    mode: 'cloud',

    subscribe(onData, onError) {
      return onSnapshot(
        motorsRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          const motors = snapshot.docs.map((d) => normalizeMotor(d.data(), d.id));
          onData(motors, {
            fromCache: snapshot.metadata.fromCache,
            pendingWrites: snapshot.metadata.hasPendingWrites,
          });
        },
        onError,
      );
    },

    save(motor) {
      return setDoc(doc(motorsRef, motor.id), toStorage(motor));
    },

    async saveMany(motors) {
      for (let i = 0; i < motors.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        motors.slice(i, i + BATCH_LIMIT).forEach((m) => batch.set(doc(motorsRef, m.id), toStorage(m)));
        await batch.commit();
      }
    },

    remove(id) {
      return deleteDoc(doc(motorsRef, id));
    },
  };
}
