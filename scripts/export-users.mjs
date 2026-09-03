// Выгружает профили пользователей (users) в CSV — для просмотра/архива вне
// Firebase Console. Использует Admin SDK (полный доступ, в обход правил
// Firestore, которые обычному клиенту разрешают читать только свой профиль).
//
// Разовая подготовка:
//   1. Firebase Console → Настройки проекта → Сервисные аккаунты →
//      Generate new private key.
//   2. Сохранить файл как serviceAccountKey.json в корень проекта
//      (уже в .gitignore — в git не попадёт).
//
// Запуск: npm run export:users
// Результат: export/users-<дата>.csv (тоже в .gitignore — содержит ПДн).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const keyPath = join(rootDir, 'serviceAccountKey.json');

if (!existsSync(keyPath)) {
  console.error(
    'Не найден serviceAccountKey.json в корне проекта.\n' +
      'Firebase Console → Настройки проекта → Сервисные аккаунты → Generate new private key.',
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function csvCell(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toIso(timestamp) {
  return timestamp?.toDate ? timestamp.toDate().toISOString() : '';
}

const columns = [
  'uid',
  'name',
  'phone',
  'address',
  'homeQueue',
  'isCustomer',
  'isDriver',
  'carPlate',
  'carBrand',
  'carColor',
  'startStreet',
  'pickupQueues',
  'childrenCount',
  'childrenNames',
  'agreementAccepted',
  'agreementVersion',
  'agreementAcceptedAt',
  'privacyAccepted',
  'privacyVersion',
  'privacyAcceptedAt',
  'createdAt',
];

const snap = await db.collection('users').get();
const rows = snap.docs.map((docSnap) => {
  const data = docSnap.data();
  const children = Array.isArray(data.children) ? data.children : [];
  return [
    docSnap.id,
    data.name,
    data.phone,
    data.address,
    data.homeQueue,
    data.isCustomer,
    data.isDriver,
    data.car?.plate,
    data.car?.brand,
    data.car?.color,
    data.startStreet,
    (data.pickupQueues || []).join(' '),
    children.length,
    children.map((child) => child.name).join('; '),
    data.agreementAccepted,
    data.agreementVersion,
    toIso(data.agreementAcceptedAt),
    data.privacyAccepted,
    data.privacyVersion,
    toIso(data.privacyAcceptedAt),
    toIso(data.createdAt),
  ];
});

const lines = [columns.join(','), ...rows.map((row) => row.map(csvCell).join(','))];

const exportDir = join(rootDir, 'export');
mkdirSync(exportDir, { recursive: true });
const dateStamp = new Date().toISOString().slice(0, 10);
const outPath = join(exportDir, `users-${dateStamp}.csv`);
writeFileSync(outPath, '﻿' + lines.join('\r\n'), 'utf8');

console.log(`Выгружено профилей: ${rows.length}`);
console.log(`Файл: ${outPath}`);
process.exit(0);
