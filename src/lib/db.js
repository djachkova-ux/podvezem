// Firestore. Профиль пользователя (S2) и предложения поездок водителей (S3).
// Коллекция запросов заказчиков добавится в S5.

import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase.js';

function userRef(uid) {
  return doc(db, 'users', uid);
}

export function createUserProfile(uid, data) {
  return setDoc(userRef(uid), { ...data, createdAt: serverTimestamp() });
}

export function updateUserProfile(uid, data) {
  return updateDoc(userRef(uid), data);
}

/** Подписка на профиль текущего пользователя. */
export function subscribeUserProfile(uid, callback) {
  return onSnapshot(userRef(uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/**
 * Подписка на открытые предложения водителей на конкретную дату.
 * Сортировка по времени — на клиенте, чтобы не заводить составной индекс.
 */
export function subscribeRideOffers(dateKey, callback) {
  const offersQuery = query(
    collection(db, 'rideOffers'),
    where('date', '==', dateKey),
    where('status', '==', 'open'),
  );
  return onSnapshot(offersQuery, (snap) => {
    const offers = snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
    callback(offers);
  });
}
