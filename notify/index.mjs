// Push-уведомления (S10) без Cloud Functions — тариф Blaze заблокирован на
// стороне Google (два billing account закрыты подряд с вердиктом "not in
// good standing", см. ХЭНДОФФ). Тот же набор из 6 сценариев ТЗ 10, что и в
// functions/lib/*Triggers.js (тот код оставлен нетронутым — если Blaze
// когда-нибудь откроется, его можно будет задеплоить вместо этого файла),
// только вместо мгновенного триггера на запись в Firestore — периодический
// опрос из GitHub Actions (.github/workflows/notify.yml, раз в 10 минут).
//
// Курсоры последнего обработанного момента по каждому из 6 сценариев лежат
// в system/notifyState. Firestore Admin SDK не подчиняется security rules —
// эта коллекция не описана в firestore.rules и не должна: клиент её не
// видит и никогда не должен видеть.
//
// Запуск: node notify/index.mjs
// Нужен GOOGLE_APPLICATION_CREDENTIALS (путь к JSON сервисного аккаунта из
// Firebase Console → Project settings → Service accounts) и, опционально,
// APP_URL — иначе push уходят без ссылки-перехода (см. sendToUser ниже).

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
  'messaging/invalid-registration-token',
]);

initializeApp();
const db = getFirestore();

// --- Отправка (перенесено без изменений из functions/lib/messaging.js) ---

async function sendToUser(uid, tokens, { title, body, url }) {
  if (!Array.isArray(tokens) || tokens.length === 0) return;

  const message = { tokens, notification: { title, body } };
  if (process.env.APP_URL) {
    message.webpush = {
      fcmOptions: { link: `${process.env.APP_URL}${url}` },
      // Иконки появились в S11. Оба поля требуют абсолютный URL, поэтому живут
      // в той же ветке, что и link: без APP_URL уведомление уходит с иконкой
      // браузера по умолчанию — деградация, не ошибка отправки.
      notification: {
        icon: `${process.env.APP_URL}/icons/icon-192.png`,
        badge: `${process.env.APP_URL}/icons/badge-96.png`,
      },
    };
  }

  const response = await getMessaging().sendEachForMulticast(message);

  const invalidTokens = response.responses
    .map((result, index) => (!result.success && INVALID_TOKEN_CODES.has(result.error?.code) ? tokens[index] : null))
    .filter(Boolean);

  if (invalidTokens.length > 0) {
    await db.collection('users').doc(uid).update({ notificationTokens: FieldValue.arrayRemove(...invalidTokens) });
  }
}

async function sendToUid(uid, payload) {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return;
  await sendToUser(uid, snap.data().notificationTokens, payload);
}

async function sendToUsers(userDocs, payload) {
  await Promise.all(
    userDocs
      .filter((user) => Array.isArray(user.notificationTokens) && user.notificationTokens.length > 0)
      .map((user) => sendToUser(user.id, user.notificationTokens, payload)),
  );
}

// --- Курсоры ---------------------------------------------------------------

const STATE_REF = db.collection('system').doc('notifyState');
const CURSOR_FIELDS = [
  'rideOffers',
  'requests',
  'responsesCreated',
  'responsesUpdated',
  'requestResponsesCreated',
  'requestResponsesUpdated',
];

/**
 * При первом запуске курсоров ещё нет — если начать с нулевой отметки
 * времени, первый же прогон разошлёт push по всей уже существующей базе
 * разом (например, все открытые предложения на доске). Вместо этого на
 * первом запуске курсоры выставляются на «сейчас» и обработка пропускается;
 * реальный опрос начнётся со следующего запуска (через ~10 минут).
 */
async function loadCursors() {
  const snap = await STATE_REF.get();
  if (snap.exists) return snap.data();

  const now = Timestamp.now();
  await STATE_REF.set(Object.fromEntries(CURSOR_FIELDS.map((field) => [field, now])));
  return null;
}

// --- Опрос по сценариям (зеркально functions/lib/*Triggers.js) -------------

/** Новое предложение водителя → всем заказчикам. Шаблонные (S9) — пропуск. */
async function pollNewRideOffers(cursor) {
  const snap = await db.collection('rideOffers').where('createdAt', '>', cursor).orderBy('createdAt').get();
  if (snap.empty) return cursor;

  const customersSnap = await db.collection('users').where('isCustomer', '==', true).get();
  const customers = customersSnap.docs.map((item) => ({ id: item.id, ...item.data() }));

  for (const docSnap of snap.docs) {
    const offer = docSnap.data();
    if (offer.templateId) continue;
    await sendToUsers(customers, {
      title: 'Новая поездка на доске',
      body: `${offer.driverName} · ${offer.arrivalTime} · мест: ${offer.seatsTotal}`,
      url: '/board/drivers',
    });
  }
  return snap.docs.at(-1).data().createdAt;
}

/** Новый запрос заказчика → всем водителям. */
async function pollNewRequests(cursor) {
  const snap = await db.collection('requests').where('createdAt', '>', cursor).orderBy('createdAt').get();
  if (snap.empty) return cursor;

  const driversSnap = await db.collection('users').where('isDriver', '==', true).get();
  const drivers = driversSnap.docs.map((item) => ({ id: item.id, ...item.data() }));

  for (const docSnap of snap.docs) {
    const request = docSnap.data();
    await sendToUsers(drivers, {
      title: 'Новый запрос на трансфер',
      body: `${request.customerName} · ${request.arrivalTime}`,
      url: '/board/requests',
    });
  }
  return snap.docs.at(-1).data().createdAt;
}

/** Новый отклик заказчика → водителю-владельцу предложения. */
async function pollNewResponses(cursor) {
  const snap = await db.collection('responses').where('createdAt', '>', cursor).orderBy('createdAt').get();
  if (snap.empty) return cursor;

  for (const docSnap of snap.docs) {
    const response = docSnap.data();
    await sendToUid(response.offerDriverId, {
      title: 'Новый отклик на вашу поездку',
      body: `${response.customerName} · ${response.arrivalTime}`,
      url: '/responses',
    });
  }
  return snap.docs.at(-1).data().createdAt;
}

/**
 * Смена статуса отклика заказчика → противоположной стороне.
 * `confirmed`/`rejected` решает водитель — уведомляем заказчика; `cancelled`
 * снимает заказчик (п. 7.7 ТЗ) — уведомляем водителя.
 */
async function pollResponseStatusChanges(cursor) {
  const snap = await db.collection('responses').where('updatedAt', '>', cursor).orderBy('updatedAt').get();
  if (snap.empty) return cursor;

  for (const docSnap of snap.docs) {
    const after = docSnap.data();
    if (after.status === 'confirmed') {
      await sendToUid(after.customerId, {
        title: 'Отклик подтверждён',
        body: `Ваша поездка на ${after.arrivalTime} подтверждена водителем`,
        url: '/trips',
      });
    } else if (after.status === 'rejected') {
      await sendToUid(after.customerId, {
        title: 'Отклик отклонён',
        body: `Поездку на ${after.arrivalTime} водитель не подтвердил`,
        url: '/responses',
      });
    } else if (after.status === 'cancelled') {
      await sendToUid(after.offerDriverId, {
        title: 'Поездка отменена',
        body: `${after.customerName} отменил бронь на ${after.arrivalTime}`,
        url: '/trips',
      });
    }
  }
  return snap.docs.at(-1).data().updatedAt;
}

/** Новый отклик водителя → заказчику-владельцу запроса. */
async function pollNewRequestResponses(cursor) {
  const snap = await db.collection('requestResponses').where('createdAt', '>', cursor).orderBy('createdAt').get();
  if (snap.empty) return cursor;

  for (const docSnap of snap.docs) {
    const response = docSnap.data();
    await sendToUid(response.requestCustomerId, {
      title: 'Новый отклик на ваш запрос',
      body: `${response.driverName} · ${response.arrivalTime}`,
      url: '/responses',
    });
  }
  return snap.docs.at(-1).data().createdAt;
}

/**
 * Смена статуса отклика водителя → водителю (зеркально responses).
 * `confirmed`/`rejected`/`cancelled` — все решает заказчик (п. 8.4 ТЗ),
 * во всех трёх случаях уведомляется водитель — автор отклика.
 */
async function pollRequestResponseStatusChanges(cursor) {
  const snap = await db.collection('requestResponses').where('updatedAt', '>', cursor).orderBy('updatedAt').get();
  if (snap.empty) return cursor;

  for (const docSnap of snap.docs) {
    const after = docSnap.data();
    if (after.status === 'confirmed') {
      await sendToUid(after.driverId, {
        title: 'Отклик подтверждён',
        body: `Заказчик подтвердил поездку на ${after.arrivalTime}`,
        url: '/trips',
      });
    } else if (after.status === 'rejected') {
      await sendToUid(after.driverId, {
        title: 'Отклик отклонён',
        body: `Запрос на ${after.arrivalTime} закрыт без вас`,
        url: '/responses',
      });
    } else if (after.status === 'cancelled') {
      await sendToUid(after.driverId, {
        title: 'Поездка отменена',
        body: `Заказчик отменил бронь на ${after.arrivalTime}`,
        url: '/trips',
      });
    }
  }
  return snap.docs.at(-1).data().updatedAt;
}

// --- Точка входа -------------------------------------------------------

async function main() {
  const cursors = await loadCursors();
  if (!cursors) {
    console.log('Первый запуск: курсоры инициализированы на текущий момент, опрос начнётся со следующего раза.');
    return;
  }

  const next = {
    rideOffers: await pollNewRideOffers(cursors.rideOffers),
    requests: await pollNewRequests(cursors.requests),
    responsesCreated: await pollNewResponses(cursors.responsesCreated),
    responsesUpdated: await pollResponseStatusChanges(cursors.responsesUpdated),
    requestResponsesCreated: await pollNewRequestResponses(cursors.requestResponsesCreated),
    requestResponsesUpdated: await pollRequestResponseStatusChanges(cursors.requestResponsesUpdated),
  };

  await STATE_REF.set(next);
  console.log('Опрос завершён.', next);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
