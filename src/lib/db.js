// Firestore. Профиль пользователя (S2), предложения поездок водителей (S3-S4)
// и запросы заказчиков (S5).

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
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

/** Подписка на одно предложение (для экранов отклика и списка откликов). */
export function subscribeRideOffer(offerId, callback) {
  return onSnapshot(doc(db, 'rideOffers', offerId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
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

/**
 * Подписка на открытые запросы заказчиков на конкретную дату.
 * Сортировка по времени — на клиенте, как и для rideOffers.
 */
export function subscribeRequests(dateKey, callback) {
  const requestsQuery = query(
    collection(db, 'requests'),
    where('date', '==', dateKey),
    where('status', '==', 'open'),
  );
  return onSnapshot(requestsQuery, (snap) => {
    const requests = snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
    callback(requests);
  });
}

/**
 * Публикация нового запроса заказчиком. Адрес и очередь — снимком из
 * профиля; дети — выбранное подмножество из своего списка (childrenIds).
 */
export function createRequest(uid, profile, { date, arrivalTime, childrenIds, note }) {
  const children = profile.children.filter((child) => childrenIds.includes(child.id));
  const payload = {
    customerId: uid,
    customerName: profile.name,
    customerPhone: profile.phone,
    address: profile.address,
    homeQueue: profile.homeQueue,
    children,
    date,
    arrivalTime,
    status: 'open',
    createdAt: serverTimestamp(),
  };
  if (note) payload.note = note;
  return addDoc(collection(db, 'requests'), payload);
}

/**
 * Отклик заказчика на предложение водителя (S6). `offerDriverId` —
 * денормализованный владелец предложения, нужен правилам Firestore, чтобы
 * водитель мог читать и подтверждать отклики на свои поездки. Данные
 * заказчика и выбранные дети — снимком, как и в других коллекциях.
 */
export function createResponse(uid, profile, offer, { childrenIds, note }) {
  const children = profile.children.filter((child) => childrenIds.includes(child.id));
  const payload = {
    offerId: offer.id,
    offerDriverId: offer.driverId,
    customerId: uid,
    customerName: profile.name,
    customerPhone: profile.phone,
    address: profile.address,
    homeQueue: profile.homeQueue,
    children,
    date: offer.date,
    arrivalTime: offer.arrivalTime,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  if (note) payload.note = note;
  return addDoc(collection(db, 'responses'), payload);
}

/**
 * Подписка на отклики к конкретному предложению — экран водителя
 * «Отклики». Сортировка по времени создания на клиенте (без индекса).
 * Фильтр по `offerDriverId` здесь не для логики (все отклики предложения и
 * так принадлежат его водителю), а потому что правило чтения проверяет
 * именно это поле — Firestore не вычисляет правила построчно для list-
 * запросов, а статически убеждается, что запрос не может вернуть документ,
 * не проходящий правило; без явного фильтра по полю из правила весь запрос
 * получает permission-denied, даже если каждый документ по отдельности
 * прошёл бы проверку.
 */
export function subscribeOfferResponses(offerId, driverUid, callback) {
  const responsesQuery = query(
    collection(db, 'responses'),
    where('offerId', '==', offerId),
    where('offerDriverId', '==', driverUid),
  );
  return onSnapshot(responsesQuery, (snap) => {
    const responses = snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    callback(responses);
  });
}

/**
 * Подтверждение отклика водителем. Уменьшает свободные места у предложения
 * на количество детей в отклике; при достижении нуля предложение
 * закрывается и уходит с доски. Только `runTransaction` — иначе два
 * одновременных подтверждения могут увести места в минус.
 */
export async function confirmResponse(response) {
  const offerRef = doc(db, 'rideOffers', response.offerId);
  const responseRef = doc(db, 'responses', response.id);

  await runTransaction(db, async (tx) => {
    const [offerSnap, responseSnap] = await Promise.all([tx.get(offerRef), tx.get(responseRef)]);
    if (!offerSnap.exists() || !responseSnap.exists()) {
      throw new Error('not-found');
    }
    const offerData = offerSnap.data();
    const responseData = responseSnap.data();
    if (responseData.status !== 'pending') {
      throw new Error('already-handled');
    }
    const count = responseData.children.length;
    if (offerData.seatsFree < count) {
      throw new Error('not-enough-seats');
    }

    const seatsFree = offerData.seatsFree - count;
    tx.update(offerRef, seatsFree === 0 ? { seatsFree, status: 'closed' } : { seatsFree });
    tx.update(responseRef, { status: 'confirmed' });
  });
}

/** Отклонение отклика водителем — без изменения мест, транзакция не нужна. */
export function rejectResponse(responseId) {
  return updateDoc(doc(db, 'responses', responseId), { status: 'rejected' });
}

/** Подписка на один запрос (экраны отклика водителя и списка откликов, S7). */
export function subscribeRequest(requestId, callback) {
  return onSnapshot(doc(db, 'requests', requestId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/**
 * Отклик водителя на запрос заказчика (S7), зеркально createResponse.
 * `requestCustomerId` — денормализованный владелец запроса, нужен правилам
 * Firestore и list-запросу заказчика (см. урок из S6 в db.js выше).
 */
export function createRequestResponse(uid, profile, request, { note }) {
  const payload = {
    requestId: request.id,
    requestCustomerId: request.customerId,
    driverId: uid,
    driverName: profile.name,
    driverPhone: profile.phone,
    driverCar: profile.car,
    pickupQueues: profile.pickupQueues,
    date: request.date,
    arrivalTime: request.arrivalTime,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  if (note) payload.note = note;
  return addDoc(collection(db, 'requestResponses'), payload);
}

/**
 * Подписка на отклики водителей к конкретному запросу — экран заказчика.
 * Фильтр по `requestCustomerId` — по той же причине, что и в
 * subscribeOfferResponses (правило read проверяет именно это поле).
 */
export function subscribeRequestResponses(requestId, customerUid, callback) {
  const responsesQuery = query(
    collection(db, 'requestResponses'),
    where('requestId', '==', requestId),
    where('requestCustomerId', '==', customerUid),
  );
  return onSnapshot(responsesQuery, (snap) => {
    const responses = snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    callback(responses);
  });
}

/**
 * Подтверждение отклика водителя заказчиком. У запроса, в отличие от
 * предложения, нет счётчика мест — подтверждение любого одного отклика
 * сразу закрывает весь запрос. Транзакция нужна, чтобы два одновременных
 * подтверждения разных откликов не закрыли запрос дважды.
 */
export async function confirmRequestResponse(response) {
  const requestRef = doc(db, 'requests', response.requestId);
  const responseRef = doc(db, 'requestResponses', response.id);

  await runTransaction(db, async (tx) => {
    const [requestSnap, responseSnap] = await Promise.all([tx.get(requestRef), tx.get(responseRef)]);
    if (!requestSnap.exists() || !responseSnap.exists()) {
      throw new Error('not-found');
    }
    if (requestSnap.data().status !== 'open') {
      throw new Error('already-closed');
    }
    if (responseSnap.data().status !== 'pending') {
      throw new Error('already-handled');
    }

    tx.update(requestRef, { status: 'closed' });
    tx.update(responseRef, { status: 'confirmed' });
  });
}

/** Отклонение отклика водителя заказчиком — без изменения запроса. */
export function rejectRequestResponse(responseId) {
  return updateDoc(doc(db, 'requestResponses', responseId), { status: 'rejected' });
}
