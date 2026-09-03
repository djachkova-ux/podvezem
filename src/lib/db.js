// Firestore. Профиль пользователя (S2), предложения поездок водителей (S3-S4)
// и запросы заказчиков (S5).

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { getRepeatDates } from './dates.js';

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
 * Токены устройств для push (S10). Массив, а не одно поле — пользователь
 * может включить уведомления на нескольких устройствах разом (телефон +
 * компьютер). `arrayUnion`/`arrayRemove` сами дедуплицируют, отдельная
 * транзакция не нужна.
 */
export function addNotificationToken(uid, token) {
  return updateDoc(userRef(uid), { notificationTokens: arrayUnion(token) });
}

export function removeNotificationToken(uid, token) {
  return updateDoc(userRef(uid), { notificationTokens: arrayRemove(token) });
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
    driverStartStreet: profile.startStreet,
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
 * Повторяющееся предложение (S9, ТЗ 6.1): шаблон «дни недели + время» на
 * месяц вперёд. Сам шаблон сохраняется в `offerTemplates` (для истории и
 * будущего управления), а на каждую подходящую дату сразу создаётся
 * самостоятельный документ `rideOffers` с меткой `templateId` — отмена или
 * удаление одной даты (через уже существующее правило `delete` у владельца)
 * никак не задевает остальные, они не связаны между собой ничем, кроме этой
 * метки.
 */
export async function createRideOfferTemplate(
  uid,
  profile,
  { weekdays, arrivalTime, seatsTotal, note },
) {
  const dates = getRepeatDates(weekdays);
  if (dates.length === 0) throw new Error('no-dates-in-horizon');

  const templateRef = doc(collection(db, 'offerTemplates'));
  const batch = writeBatch(db);
  batch.set(templateRef, {
    driverId: uid,
    weekdays,
    arrivalTime,
    seatsTotal,
    note: note || null,
    createdAt: serverTimestamp(),
  });

  const offerPayload = {
    driverId: uid,
    driverName: profile.name,
    driverPhone: profile.phone,
    driverCar: profile.car,
    driverStartStreet: profile.startStreet,
    pickupQueues: profile.pickupQueues,
    arrivalTime,
    seatsTotal,
    seatsFree: seatsTotal,
    status: 'open',
    templateId: templateRef.id,
    createdAt: serverTimestamp(),
  };
  if (note) offerPayload.note = note;

  dates.forEach((date) => {
    const offerRef = doc(collection(db, 'rideOffers'));
    batch.set(offerRef, { ...offerPayload, date });
  });

  await batch.commit();
  return { templateId: templateRef.id, count: dates.length };
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
    tx.update(responseRef, { status: 'confirmed', updatedAt: serverTimestamp() });
  });
}

/**
 * Отклонение отклика водителем — без изменения мест, транзакция не нужна.
 * `updatedAt` (как и в confirm/cancel ниже) — курсор для polling-опроса
 * push-уведомлений (S10, `notify/index.mjs`): без него нечем отличить
 * «отклик только что сменил статус» от «отклик существует давно».
 */
export function rejectResponse(responseId) {
  return updateDoc(doc(db, 'responses', responseId), { status: 'rejected', updatedAt: serverTimestamp() });
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
    driverStartStreet: profile.startStreet,
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
    tx.update(responseRef, { status: 'confirmed', updatedAt: serverTimestamp() });
  });
}

/** Отклонение отклика водителя заказчиком — без изменения запроса. */
export function rejectRequestResponse(responseId) {
  return updateDoc(doc(db, 'requestResponses', responseId), { status: 'rejected', updatedAt: serverTimestamp() });
}

// --- Мои поездки (S8) ---------------------------------------------------
// Активная поездка — это подтверждённый (`confirmed`) или уже завершённый
// (`delivered`) документ `responses`/`requestResponses`. У пользователя
// может быть до четырёх ролей одновременно (роли не взаимоисключающие),
// поэтому четыре независимых подписки, каждая фильтрует по тому полю,
// которое проверяет правило `read` (см. уроки S6/S7 выше). Статус не
// фильтруется на сервере — экран сам делит на «активные»/«архив» и
// игнорирует `pending`/`rejected`/`cancelled`.

/** Мои поездки как заказчика по предложениям водителей. */
export function subscribeResponsesAsCustomer(uid, callback) {
  const q = query(collection(db, 'responses'), where('customerId', '==', uid));
  return onSnapshot(q, (snap) => callback(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
}

/** Мои поездки как водителя по своим предложениям. */
export function subscribeResponsesAsDriver(uid, callback) {
  const q = query(collection(db, 'responses'), where('offerDriverId', '==', uid));
  return onSnapshot(q, (snap) => callback(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
}

/** Мои поездки как водителя по чужим запросам. */
export function subscribeRequestResponsesAsDriver(uid, callback) {
  const q = query(collection(db, 'requestResponses'), where('driverId', '==', uid));
  return onSnapshot(q, (snap) => callback(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
}

/** Мои поездки как заказчика по своим запросам. */
export function subscribeRequestResponsesAsCustomer(uid, callback) {
  const q = query(collection(db, 'requestResponses'), where('requestCustomerId', '==', uid));
  return onSnapshot(q, (snap) => callback(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
}

/**
 * Разовое чтение предложения/запроса — для карточки «моя поездка», где
 * нужны контакты второй стороны, которых нет на самом отклике (см. хэндофф
 * S8: `responses` хранит снимок заказчика, но не водителя, и наоборот у
 * `requestResponses`). Реального времени тут не нужно, `onSnapshot` был бы
 * избыточен.
 */
export async function getRideOffer(offerId) {
  const snap = await getDoc(doc(db, 'rideOffers', offerId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getRequest(requestId) {
  const snap = await getDoc(doc(db, 'requests', requestId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Заказчик снимает подтверждённый резерв на предложение водителя (п. 7.7
 * ТЗ). Места возвращаются, предложение переоткрывается, если было закрыто.
 * Транзакция симметрична `confirmResponse`.
 */
export async function cancelResponse(response) {
  const offerRef = doc(db, 'rideOffers', response.offerId);
  const responseRef = doc(db, 'responses', response.id);

  await runTransaction(db, async (tx) => {
    const [offerSnap, responseSnap] = await Promise.all([tx.get(offerRef), tx.get(responseRef)]);
    if (!offerSnap.exists() || !responseSnap.exists()) {
      throw new Error('not-found');
    }
    if (responseSnap.data().status !== 'confirmed') {
      throw new Error('already-handled');
    }

    const offerData = offerSnap.data();
    const seatsFree = offerData.seatsFree + response.children.length;
    tx.update(offerRef, { seatsFree, status: 'open' });
    tx.update(responseRef, { status: 'cancelled', updatedAt: serverTimestamp() });
  });
}

/** Водитель завершает поездку по своему предложению — просто смена статуса. */
export function completeResponse(responseId) {
  return updateDoc(doc(db, 'responses', responseId), { status: 'delivered' });
}

/**
 * Заказчик снимает подтверждённый резерв на запрос (п. 8.4 ТЗ, симметрично
 * п. 7.7). У запроса нет счётчика мест — просто возвращаем `status: 'open'`.
 */
export async function cancelRequestResponse(response) {
  const requestRef = doc(db, 'requests', response.requestId);
  const responseRef = doc(db, 'requestResponses', response.id);

  await runTransaction(db, async (tx) => {
    const [requestSnap, responseSnap] = await Promise.all([tx.get(requestRef), tx.get(responseRef)]);
    if (!requestSnap.exists() || !responseSnap.exists()) {
      throw new Error('not-found');
    }
    if (responseSnap.data().status !== 'confirmed') {
      throw new Error('already-handled');
    }

    tx.update(requestRef, { status: 'open' });
    tx.update(responseRef, { status: 'cancelled', updatedAt: serverTimestamp() });
  });
}

/** Водитель завершает поездку по чужому запросу — просто смена статуса. */
export function completeRequestResponse(responseId) {
  return updateDoc(doc(db, 'requestResponses', responseId), { status: 'delivered' });
}

// --- Мои публикации: редактирование и снятие (S14) ----------------------
// Раньше свой уже опубликованный запрос/предложение нельзя было ни найти
// отдельно от общей доски, ни изменить, ни снять — только дождаться отклика
// или молча оставить висеть. Правила Firestore это уже разрешали владельцу
// (`rideOffers`/`requests` update/delete), не хватало только экранов.

/** Подписка на мои открытые предложения — вкладка «Мои публикации». */
export function subscribeMyRideOffers(uid, callback) {
  const q = query(collection(db, 'rideOffers'), where('driverId', '==', uid), where('status', '==', 'open'));
  return onSnapshot(q, (snap) => {
    const offers = snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (a.date + a.arrivalTime).localeCompare(b.date + b.arrivalTime));
    callback(offers);
  });
}

/** Подписка на мои открытые запросы, симметрично subscribeMyRideOffers. */
export function subscribeMyRequests(uid, callback) {
  const q = query(collection(db, 'requests'), where('customerId', '==', uid), where('status', '==', 'open'));
  return onSnapshot(q, (snap) => {
    const requests = snap.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (a.date + a.arrivalTime).localeCompare(b.date + b.arrivalTime));
    callback(requests);
  });
}

/**
 * Редактирование своего открытого предложения. Экран-вызывающий сам не даёт
 * дойти сюда, если на предложение есть неотвеченные (`pending`) отклики —
 * здесь только пересчёт `seatsFree`, чтобы не потерять уже подтверждённые
 * места: если часть мест занята подтверждёнными откликами, новое
 * `seatsTotal` не может стать меньше занятого.
 */
export function updateRideOffer(offer, { date, arrivalTime, seatsTotal, note }) {
  const occupied = offer.seatsTotal - offer.seatsFree;
  const seatsFree = seatsTotal - occupied;
  if (seatsFree < 0) throw new Error('not-enough-seats');
  return updateDoc(doc(db, 'rideOffers', offer.id), {
    date,
    arrivalTime,
    seatsTotal,
    seatsFree,
    note: note || deleteField(),
  });
}

/** Снятие своего открытого предложения с доски. */
export function deleteRideOffer(offerId) {
  return deleteDoc(doc(db, 'rideOffers', offerId));
}

/**
 * Редактирование своего открытого запроса, симметрично updateRideOffer.
 * Дети — пересобираем снимок из актуального профиля по выбранным id, как и
 * при создании (см. createRequest).
 */
export function updateRequest(requestId, profile, { date, arrivalTime, childrenIds, note }) {
  const children = profile.children.filter((child) => childrenIds.includes(child.id));
  return updateDoc(doc(db, 'requests', requestId), {
    date,
    arrivalTime,
    children,
    note: note || deleteField(),
  });
}

/** Снятие своего открытого запроса с доски. */
export function deleteRequest(requestId) {
  return deleteDoc(doc(db, 'requests', requestId));
}
