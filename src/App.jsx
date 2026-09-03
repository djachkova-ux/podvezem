import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import AppHead from './components/AppHead.jsx';
import InstallHint from './components/InstallHint.jsx';
import TabBar from './components/TabBar.jsx';
import DriversBoard from './screens/DriversBoard.jsx';
import RequestsBoard from './screens/RequestsBoard.jsx';
import NewOffer from './screens/NewOffer.jsx';
import NewRequest from './screens/NewRequest.jsx';
import EditOffer from './screens/EditOffer.jsx';
import EditRequest from './screens/EditRequest.jsx';
import RespondSheet from './screens/RespondSheet.jsx';
import OfferResponses from './screens/OfferResponses.jsx';
import RequestRespondSheet from './screens/RequestRespondSheet.jsx';
import RequestResponses from './screens/RequestResponses.jsx';
import MyTrips from './screens/MyTrips.jsx';
import Responses from './screens/Responses.jsx';
import Profile from './screens/Profile.jsx';
import Login from './screens/Login.jsx';
import Register from './screens/Register.jsx';
import { db, firebaseReady } from './firebase.js';
import { useAuth } from './context/AuthContext.jsx';
import { listenForegroundMessages } from './lib/notifications.js';

function ConfigNotice() {
  return (
    <p className="config-notice">
      Firebase не настроен: скопируйте <code>.env.example</code> в <code>.env.local</code> и
      подставьте ключи проекта. Данные пока не загружаются.
    </p>
  );
}

const authRoutes = ['/login', '/register'];

export default function App() {
  const { user, authReady } = useAuth();
  const { pathname } = useLocation();
  const onAuthScreen = authRoutes.includes(pathname);

  // Уведомления, пришедшие пока вкладка открыта и в фокусе (S10) — фоновые
  // показывает сервис-воркер сам, foreground нужно показывать вручную.
  useEffect(() => {
    if (!user) return undefined;
    let unsubscribe;
    let cancelled = false;
    listenForegroundMessages().then((fn) => {
      if (cancelled) fn();
      else unsubscribe = fn;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);

  // Установленное на экран PWA-приложение, свёрнутое в трей/App Switcher,
  // теряет сетевое соединение на уровне ОС (особенно жёстко на iOS) — вместе
  // с ним обрывается и watch-стрим, на котором держатся все onSnapshot-
  // подписки (доска, «Мои поездки»). Свой ретрай SDK не всегда просыпается
  // сразу при возврате на передний план, поэтому пересобираем соединение
  // явно: `visibilitychange` — обычное сворачивание/разворачивание,
  // `pageshow` — восстановление страницы из bfcache на iOS Safari, где
  // `visibilitychange` может не сработать вовсе.
  useEffect(() => {
    if (!db) return undefined;
    let reconnecting = false;
    const reconnect = () => {
      if (document.visibilityState !== 'visible' || reconnecting) return;
      reconnecting = true;
      disableNetwork(db)
        .then(() => enableNetwork(db))
        .finally(() => {
          reconnecting = false;
        });
    };
    document.addEventListener('visibilitychange', reconnect);
    window.addEventListener('pageshow', reconnect);
    return () => {
      document.removeEventListener('visibilitychange', reconnect);
      window.removeEventListener('pageshow', reconnect);
    };
  }, []);

  // Без ключей Firebase auth/db отключены — пускаем всех без гейтинга,
  // как и раньше в S1.
  if (firebaseReady && !authReady) {
    return <div className="app-loading">Загрузка…</div>;
  }

  if (firebaseReady && !user && !onAuthScreen) {
    return <Navigate to="/login" replace />;
  }

  if (firebaseReady && user && onAuthScreen) {
    return <Navigate to="/board/drivers" replace />;
  }

  return (
    <div className="app">
      {!onAuthScreen && <AppHead />}
      {!firebaseReady && <ConfigNotice />}
      {!onAuthScreen && <InstallHint />}

      <Routes>
        <Route path="/" element={<Navigate to="/board/drivers" replace />} />
        <Route path="/board" element={<Navigate to="/board/drivers" replace />} />
        <Route path="/board/drivers" element={<DriversBoard />} />
        <Route path="/board/drivers/new" element={<NewOffer />} />
        <Route path="/board/drivers/:offerId/edit" element={<EditOffer />} />
        <Route path="/board/drivers/:offerId/respond" element={<RespondSheet />} />
        <Route path="/board/drivers/:offerId/responses" element={<OfferResponses />} />
        <Route path="/board/requests" element={<RequestsBoard />} />
        <Route path="/board/requests/new" element={<NewRequest />} />
        <Route path="/board/requests/:requestId/edit" element={<EditRequest />} />
        <Route path="/board/requests/:requestId/respond" element={<RequestRespondSheet />} />
        <Route path="/board/requests/:requestId/responses" element={<RequestResponses />} />
        <Route path="/trips" element={<MyTrips />} />
        <Route path="/responses" element={<Responses />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/board/drivers" replace />} />
      </Routes>

      {!onAuthScreen && <TabBar />}
    </div>
  );
}
