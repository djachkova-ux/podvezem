// Обёртка над Firebase Auth. Регистрация и вход принимают телефон и пароль,
// внутри он превращается в служебный email — см. phone.js.

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase.js';
import { phoneToEmail } from './phone.js';

function requireAuth() {
  if (!auth) throw new Error('Firebase не настроен: заполните .env.local');
  return auth;
}

export async function registerWithPhone(phone, password) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), phoneToEmail(phone), password);
  return credential.user;
}

export async function loginWithPhone(phone, password) {
  const credential = await signInWithEmailAndPassword(requireAuth(), phoneToEmail(phone), password);
  return credential.user;
}

export function logout() {
  return signOut(requireAuth());
}

/** Подписка на смену пользователя; при ненастроенном Firebase сразу отдаёт null. */
export function subscribeAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

const errorMessages = {
  'auth/email-already-in-use': 'Этот номер телефона уже зарегистрирован.',
  'auth/invalid-credential': 'Неверный телефон или пароль.',
  'auth/wrong-password': 'Неверный телефон или пароль.',
  'auth/user-not-found': 'Неверный телефон или пароль.',
  'auth/weak-password': 'Пароль слишком короткий — минимум 6 символов.',
  'auth/invalid-email': 'Проверьте номер телефона.',
  'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже.',
};

export function authErrorMessage(error) {
  return errorMessages[error?.code] || 'Что-то пошло не так. Попробуйте ещё раз.';
}
