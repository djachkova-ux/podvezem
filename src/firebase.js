// Инициализация Firebase. Ключи берутся из .env.local (см. .env.example),
// в репозиторий они не попадают.
//
// Пока ключи не заданы, приложение не падает: firebaseReady === false,
// экраны показывают предупреждение, а auth и db остаются null.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(config)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseReady = missing.length === 0;

let app = null;
let auth = null;
let db = null;

if (firebaseReady) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn(
    `[Подвезём] Firebase не настроен: не заданы ${missing.join(', ')}. ` +
      'Скопируйте .env.example в .env.local и подставьте ключи проекта из Firebase Console.',
  );
}

export { app, auth, db };
