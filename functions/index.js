// Точка входа Cloud Functions (S10 — push-уведомления). Сама логика
// триггеров разнесена по lib/, здесь только инициализация Admin SDK и
// сборка плоского экспорта.

const { initializeApp } = require('firebase-admin/app');
const { setGlobalOptions } = require('firebase-functions/v2');

initializeApp();
// europe-west1 — ближайший к региону Firestore проекта (eur3) регион с
// поддержкой Cloud Functions 2-го поколения.
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

Object.assign(exports, require('./lib/broadcastTriggers'));
Object.assign(exports, require('./lib/responseTriggers'));
Object.assign(exports, require('./lib/requestResponseTriggers'));
