// Сервис-воркер для фоновых push (S10) — показывает уведомление, когда
// вкладка приложения свёрнута или закрыта. Файл лежит в public/, Vite не
// обрабатывает его и не подставляет import.meta.env, поэтому конфиг
// Firebase-проекта продублирован здесь как есть. Это не секрет: ключ
// веб-приложения Firebase рассчитан на то, чтобы быть публичным, реальная
// защита — правила Firestore/Auth, не он (см. src/firebase.js).
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBnRfjHkiN8zokD3OWAWYa2eZ3cGYR76es',
  authDomain: 'podvezyom.firebaseapp.com',
  projectId: 'podvezyom',
  storageBucket: 'podvezyom.firebasestorage.app',
  messagingSenderId: '176342241729',
  appId: '1:176342241729:web:c3e6ae1616544d8f211f40',
});

// Дальше по части push ничего не нужно: compat-SDK сам показывает фоновое
// уведомление по payload.notification и сам обрабатывает клик по нему через
// webpush.fcmOptions.link (см. functions/lib/messaging.js) — открывает или
// фокусирует вкладку на нужном экране.
firebase.messaging();

// --- Установка приложения и офлайн (S11) ---
//
// Обработчик fetch ниже нужен не ради скорости: Chrome считает сайт
// устанавливаемым (и выдаёт beforeinstallprompt, на котором построена
// подсказка в src/components/InstallHint.jsx) только если у активного
// сервис-воркера есть обработчик fetch. Поэтому push и установка живут в
// одном файле — два воркера на один scope '/' не уживутся, второй просто
// вытеснит первый.

const CACHE = 'podvezem-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Firestore, FCM и шрифты Google — мимо кэша: у них своя логика offline
  // и свои заголовки, наше вмешательство только навредит.
  if (url.origin !== self.location.origin) return;

  // Переходы по приложению — сеть вперёд, кэш как запасной вариант: так
  // свежая сборка подхватывается сразу, но в метро приложение всё же
  // откроется.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached || Response.error())),
    );
    return;
  }

  // Сборка Vite складывает сюда файлы с хэшем в имени — они неизменны,
  // поэтому отдаём из кэша сразу и не ходим в сеть.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
