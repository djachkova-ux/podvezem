// Текущий пользователь и его профиль — доступны всему приложению через
// useAuth(). Пока Firebase не настроен, authReady сразу true и user = null,
// чтобы приложение не зависало на загрузке.

import { createContext, useContext, useEffect, useState } from 'react';
import { firebaseReady } from '../firebase.js';
import { subscribeAuth } from '../lib/auth.js';
import { subscribeUserProfile } from '../lib/db.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(!firebaseReady);

  useEffect(() => {
    return subscribeAuth((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) setProfile(null);
    });
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeUserProfile(user.uid, setProfile);
  }, [user]);

  return <AuthContext.Provider value={{ user, profile, authReady }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return context;
}
