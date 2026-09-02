import { Navigate, Route, Routes } from 'react-router-dom';
import AppHead from './components/AppHead.jsx';
import TabBar from './components/TabBar.jsx';
import DriversBoard from './screens/DriversBoard.jsx';
import RequestsBoard from './screens/RequestsBoard.jsx';
import MyTrips from './screens/MyTrips.jsx';
import Profile from './screens/Profile.jsx';
import { firebaseReady } from './firebase.js';

function ConfigNotice() {
  return (
    <p className="config-notice">
      Firebase не настроен: скопируйте <code>.env.example</code> в <code>.env.local</code> и
      подставьте ключи проекта. Данные пока не загружаются.
    </p>
  );
}

export default function App() {
  return (
    <div className="app">
      <AppHead />
      {!firebaseReady && <ConfigNotice />}

      <Routes>
        <Route path="/" element={<Navigate to="/board/drivers" replace />} />
        <Route path="/board" element={<Navigate to="/board/drivers" replace />} />
        <Route path="/board/drivers" element={<DriversBoard />} />
        <Route path="/board/requests" element={<RequestsBoard />} />
        <Route path="/trips" element={<MyTrips />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/board/drivers" replace />} />
      </Routes>

      <TabBar />
    </div>
  );
}
