// Отправка push через FCM и чистка невалидных токенов устройств (S10).
// Общий хелпер для всех триггеров — сама логика уведомления (кому, о чём)
// живёт в триггерах, здесь только механика отправки.

const { getMessaging } = require('firebase-admin/messaging');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Коды ошибок FCM, означающие «токен больше не существует» (устройство
// отписалось, приложение переустановлено, токен протух) — такие токены
// нужно вычищать из профиля, иначе следующая рассылка снова будет их
// пытаться использовать и снова получать ту же ошибку.
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
  'messaging/invalid-registration-token',
]);

/**
 * Отправляет одно уведомление всем токенам одного пользователя. Молча
 * ничего не делает, если у пользователя нет ни одного токена (уведомления
 * не включены) — это штатная ситуация, не ошибка.
 *
 * `webpush.fcmOptions.link` обязан быть абсолютным HTTPS-URL (иначе FCM
 * отклоняет отправку целиком) — а домен хостинга появится только в S12.
 * До тех пор, пока в конфиге функций не задан APP_URL, ссылку в
 * уведомлении просто не добавляем: клик по нему тогда открывает/фокусирует
 * вкладку без перехода на конкретный экран — деградация, а не ошибка.
 */
async function sendToUser(uid, tokens, { title, body, url }) {
  if (!Array.isArray(tokens) || tokens.length === 0) return;

  const message = { tokens, notification: { title, body } };
  if (process.env.APP_URL) {
    message.webpush = {
      fcmOptions: { link: `${process.env.APP_URL}${url}` },
      // Иконки появились в S11 — держим в одной ветке с link по той же причине:
      // оба поля требуют абсолютный URL. Дублируется в notify/index.mjs.
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
    await getFirestore()
      .collection('users')
      .doc(uid)
      .update({ notificationTokens: FieldValue.arrayRemove(...invalidTokens) });
  }
}

/** То же самое одному пользователю по uid — читает его токены сама. */
async function sendToUid(uid, payload) {
  const snap = await getFirestore().collection('users').doc(uid).get();
  if (!snap.exists) return;
  await sendToUser(uid, snap.data().notificationTokens, payload);
}

/** Рассылка одного уведомления множеству пользователей разом (broadcast). */
async function sendToUsers(userDocs, payload) {
  await Promise.all(
    userDocs
      .filter((user) => Array.isArray(user.notificationTokens) && user.notificationTokens.length > 0)
      .map((user) => sendToUser(user.id, user.notificationTokens, payload)),
  );
}

module.exports = { sendToUser, sendToUid, sendToUsers };
