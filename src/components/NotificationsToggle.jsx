// Переключатель push-уведомлений в профиле (S10). Отдельный компонент, а не
// кусок Profile.jsx — у него своя асинхронная логика (проверка поддержки,
// текущего токена), не связанная с формой профиля и её сохранением.

import { useEffect, useState } from 'react';
import {
  disableNotifications,
  enableNotifications,
  getCurrentToken,
  getPermissionStatus,
  notificationsSupported,
} from '../lib/notifications.js';

const ERROR_MESSAGES = {
  'permission-denied': 'Уведомления заблокированы в настройках браузера для этого сайта.',
  'no-token': 'Не удалось получить токен устройства. Попробуйте ещё раз.',
};

export default function NotificationsToggle({ uid }) {
  const [supported, setSupported] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    notificationsSupported().then(async (isSupported) => {
      if (cancelled) return;
      setSupported(isSupported);
      if (isSupported) {
        const token = await getCurrentToken();
        if (!cancelled) setEnabled(Boolean(token));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (supported === null) return null;

  if (!supported) {
    return (
      <p className="muted">
        Push-уведомления недоступны в этом браузере. На iPhone добавьте сайт на «Домой» через
        Safari и откройте его оттуда — из обычной вкладки они не работают.
      </p>
    );
  }

  async function toggle() {
    setBusy(true);
    setError('');
    try {
      if (enabled) {
        await disableNotifications(uid);
        setEnabled(false);
      } else {
        await enableNotifications(uid);
        setEnabled(true);
      }
    } catch (err) {
      setError(ERROR_MESSAGES[err.message] || 'Не удалось изменить настройку. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  const blocked = getPermissionStatus() === 'denied';

  return (
    <div className="field">
      <label className="checkbox-row">
        <input type="checkbox" checked={enabled} disabled={busy || blocked} onChange={toggle} />
        Push-уведомления о новых поездках и откликах
      </label>
      {blocked && <p className="muted">Разрешите уведомления для сайта в настройках браузера.</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
