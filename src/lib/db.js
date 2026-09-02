// Firestore. Профиль пользователя (S2) и предложения поездок водителей (S3).
// Коллекция запросов заказчиков добавится в S5.

import {
  addDoc,
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

/**
 * Публикация нового предложения водителем. Данные о водителе и авто
 * берутся снимком из профиля на момент публикации (см. rideOffers в S3).
 */
export function createRideOffer(uid, profile, { date, arrivalTime, seatsTotal, note }) {
  const payload = {
    driverId: uid,
    driverName: profile.name,
    driverPhone: profile.phone,
    driverCar: profile.car,
    pickupQueues: profile.pickupQueues,
    date,
    arrivalTime,
    seatsTotal,
    seatsFree: seatsTotal,
    status: 'open',
    createdAt: serverTimestamp(),
  };
  if (note) payload.note = note;
  return addDoc(collection(db, 'rideOffers'), payload);
}
