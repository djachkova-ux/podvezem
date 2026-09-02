import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppHead from './components/AppHead.jsx';
import TabBar from './components/TabBar.jsx';
import DriversBoard from './screens/DriversBoard.jsx';
import RequestsBoard from './screens/RequestsBoard.jsx';
import NewOffer from './screens/NewOffer.jsx';
import MyTrips from './screens/MyTrips.jsx';
import Profile from './screens/Profile.jsx';
import Login from './screens/Login.jsx';
import Register from './screens/Register.jsx';
import { firebaseReady } from './firebase.js';
import { useAuth } from './context/AuthContext.jsx';

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

      <Routes>
        <Route path="/" element={<Navigate to="/board/drivers" replace />} />
        <Route path="/board" element={<Navigate to="/board/drivers" replace />} />
        <Route path="/board/drivers" element={<DriversBoard />} />
        <Route path="/board/drivers/new" element={<NewOffer />} />
        <Route path="/board/requests" element={<RequestsBoard />} />
        <Route path="/trips" element={<MyTrips />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/board/drivers" replace />} />
      </Routes>

      {!onAuthScreen && <TabBar />}
    </div>
  );
}
