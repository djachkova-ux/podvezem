// Засевает тестовые предложения водителей в rideOffers для доски (сессия S3).
// Запуск: node scripts/seed-ride-offers.mjs
// Читает ключи из .env.local (тот же файл, что использует Vite).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { addDoc, collection, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

function loadEnv(path) {
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv(join(rootDir, '.env.local'));

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

function digitsOnly(value) {
  return value.replace(/\D/g, '');
}

function phoneToEmail(value) {
  return `${digitsOnly(value)}@transfer.local`;
}

function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date(today);
dayAfter.setDate(dayAfter.getDate() + 2);

const password = 'test1234';

const drivers = [
  {
    phone: '+7 900 222-33-01',
    name: 'Ирина Ковалёва',
    car: { plate: 'А123ВС 150', brand: 'Renault Duster', color: 'синий' },
    pickupQueues: [1, 2],
    offers: [
      { date: toDateKey(today), arrivalTime: '08:15', seatsTotal: 4, seatsFree: 2, note: 'Могу забрать пораньше, если напишете с вечера.' },
      { date: toDateKey(tomorrow), arrivalTime: '08:15', seatsTotal: 4, seatsFree: 4 },
    ],
  },
  {
    phone: '+7 900 222-33-02',
    name: 'Дмитрий Панов',
    car: { plate: 'В456ЕК 190', brand: 'Kia Rio', color: 'белый' },
    pickupQueues: [3],
    offers: [{ date: toDateKey(today), arrivalTime: '08:30', seatsTotal: 3, seatsFree: 1 }],
  },
  {
    phone: '+7 900 222-33-03',
    name: 'Марина Швец',
    car: { plate: 'Е789МН 150', brand: 'Lada Vesta', color: 'серый' },
    pickupQueues: [1, 3],
    offers: [{ date: toDateKey(today), arrivalTime: '08:40', seatsTotal: 4, seatsFree: 3 }],
  },
  {
    phone: '+7 900 222-33-04',
    name: 'Алексей Громов',
    car: { plate: 'К321РС 750', brand: 'Hyundai Creta', color: 'чёрный' },
    pickupQueues: [1, 2, 3],
    offers: [
      { date: toDateKey(today), arrivalTime: '13:50', seatsTotal: 4, seatsFree: 3 },
      { date: toDateKey(dayAfter), arrivalTime: '13:30', seatsTotal: 4, seatsFree: 4 },
    ],
  },
];

async function ensureDriver(driver) {
  const email = phoneToEmail(driver.phone);
  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, email, password);
    console.log(`Вход: ${driver.name}`);
  } catch {
    credential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', credential.user.uid), {
      name: driver.name,
      phone: driver.phone,
      isCustomer: false,
      isDriver: true,
      address: '',
      homeQueue: driver.pickupQueues[0],
      children: [],
      car: driver.car,
      pickupQueues: driver.pickupQueues,
      createdAt: serverTimestamp(),
    });
    console.log(`Создан тестовый водитель: ${driver.name}`);
  }
  return credential.user;
}

for (const driver of drivers) {
  const user = await ensureDriver(driver);
  for (const offer of driver.offers) {
    await addDoc(collection(db, 'rideOffers'), {
      driverId: user.uid,
      driverName: driver.name,
      driverPhone: driver.phone,
      driverCar: driver.car,
      pickupQueues: driver.pickupQueues,
      status: 'open',
      createdAt: serverTimestamp(),
      ...offer,
    });
  }
  console.log(`  → добавлено предложений: ${driver.offers.length}`);
}

console.log('Готово.');
process.exit(0);
