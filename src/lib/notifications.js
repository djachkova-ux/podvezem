// Push-уведомления на клиенте (S10, ТЗ 10). Firebase Cloud Messaging: токен
// устройства сохраняется в профиле, Cloud Functions (см. functions/) шлют
// на него уведомления по событиям в Firestore.
//
// Важное ограничение iOS (ТЗ 10): на iPhone push работает только если сайт
// добавлен на «Домой» через Safari (iOS 16.4+) и открыт как отдельное
// приложение — из вкладки браузера Notification API там просто не
// существует, isSupported() ниже сама вернёт false.

import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app, firebaseReady, vapidKey } from '../firebase.js';
import { addNotificationToken, removeNotificationToken } from './db.js';

let messagingPromise = null;

function getMessagingInstance() {
  if (!firebaseReady) return Promise.resolve(null);
  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported) => (supported ? getMessaging(app) : null));
  }
  return messagingPromise;
}

function ensureServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

/** Доступны ли push вообще в этом браузере/контексте (см. комментарий выше про iOS). */
export async function notificationsSupported() {
  return Boolean(await getMessagingInstance());
}

/** Текущее разрешение браузера: 'granted' | 'denied' | 'default'. */
export function getPermissionStatus() {
  return typeof Notification === 'undefined' ? 'default' : Notification.permission;
}

/**
 * Токен push этого устройства, если он уже есть — не спрашивает разрешение
 * (только читает уже выданный токен, если пользователь когда-то согласился).
 * Используется, чтобы понять, включены ли уведомления именно на этом
 * устройстве: разрешение браузера — штука липкая и на другой вкладке того
 * же сайта тоже 'granted', а вот регистрация токена в профиле — нет.
 */
export async function getCurrentToken() {
  const messaging = await getMessagingInstance();
  if (!messaging || getPermissionStatus() !== 'granted') return null;
  const registration = await ensureServiceWorker();
  return getToken(messaging, { vapidKey, serviceWorkerRegistration: registration }).catch(() => null);
}

/**
 * Запрашивает разрешение, регистрирует сервис-воркер и сохраняет токен
 * устройства в профиле. Бросает Error с кодом в `message`
 * ('unsupported' | 'permission-denied' | 'no-token') — экран профиля сам
 * решает, какой текст показать.
 */
export async function enableNotifications(uid) {
  const messaging = await getMessagingInstance();
  if (!messaging) throw new Error('unsupported');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('permission-denied');

  const registration = await ensureServiceWorker();
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('no-token');

  await addNotificationToken(uid, token);
  return token;
}

/** Отключает push на этом устройстве: убирает токен из профиля и у FCM. */
export async function disableNotifications(uid) {
  const token = await getCurrentToken();
  if (!token) return;
  await removeNotificationToken(uid, token);
  const messaging = await getMessagingInstance();
  if (messaging) await deleteToken(messaging).catch(() => {});
}

/**
 * Уведомления, пришедшие пока вкладка открыта и в фокусе. SDK их не
 * показывает как системные сама (это делает только сервис-воркер для
 * фоновых, см. public/firebase-messaging-sw.js), поэтому показываем вручную
 * через Notification API. Возвращает функцию отписки (или no-op, если push
 * не поддерживается).
 */
export async function listenForegroundMessages() {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const { title, body } = payload.notification ?? {};
    if (title && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  });
}
