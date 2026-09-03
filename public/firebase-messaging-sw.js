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

// Дальше ничего не нужно: compat-SDK сам показывает фоновое уведомление по
// payload.notification и сам обрабатывает клик по нему через
// webpush.fcmOptions.link (см. functions/lib/messaging.js) — открывает или
// фокусирует вкладку на нужном экране.
firebase.messaging();
