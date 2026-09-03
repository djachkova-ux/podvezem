import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { logout } from '../lib/auth.js';
import { updateUserProfile } from '../lib/db.js';
import { QUEUES } from '../lib/constants.js';
import ChildrenList from '../components/ChildrenList.jsx';
import NotificationsToggle from '../components/NotificationsToggle.jsx';

const emptyCar = { plate: '', brand: '', color: '' };

export default function Profile() {
  const { user, profile } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name || '',
      isDriver: !!profile.isDriver,
      isCustomer: !!profile.isCustomer,
      homeQueue: profile.homeQueue || 1,
      address: profile.address || '',
      children: profile.children || [],
      car: profile.car || emptyCar,
      pickupQueues: profile.pickupQueues || [],
    });
  }, [profile]);

  if (!form) {
    return (
      <main className="screen">
        <h1 className="screen-title">Профиль</h1>
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  function update(patch) {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function togglePickupQueue(queue) {
    update({
      pickupQueues: form.pickupQueues.includes(queue)
        ? form.pickupQueues.filter((item) => item !== queue)
        : [...form.pickupQueues, queue].sort(),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        isDriver: form.isDriver,
        isCustomer: form.isCustomer,
      };
      if (form.isCustomer) {
        payload.address = form.address.trim();
        payload.homeQueue = Number(form.homeQueue);
        payload.children = form.children
          .map((child) => ({ ...child, name: child.name.trim(), age: Number(child.age) || 0 }))
          .filter((child) => child.name);
      }
      if (form.isDriver) {
        payload.car = {
          plate: form.car.plate.trim(),
          brand: form.car.brand.trim(),
          color: form.car.color.trim(),
        };
        payload.pickupQueues = form.pickupQueues;
      }
      await updateUserProfile(user.uid, payload);
      setSaved(true);
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="screen">
      <h1 className="screen-title">Профиль</h1>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="profile-name">Имя</label>
          <input
            id="profile-name"
            value={form.name}
            onChange={(event) => update({ name: event.target.value })}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="profile-phone">Телефон</label>
          <input id="profile-phone" value={profile.phone} disabled />
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.isCustomer}
            onChange={(event) => update({ isCustomer: event.target.checked })}
          />
          Я заказчик — ищу трансфер для ребёнка
        </label>

        {form.isCustomer && (
          <>
            <div className="field">
              <label htmlFor="profile-address">Адрес, откуда забирать</label>
              <input
                id="profile-address"
                value={form.address}
                onChange={(event) => update({ address: event.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="profile-queue">Очередь проживания</label>
              <select
                id="profile-queue"
                value={form.homeQueue}
                onChange={(event) => update({ homeQueue: Number(event.target.value) })}
              >
                {QUEUES.map((queue) => (
                  <option key={queue} value={queue}>
                    Очередь {queue}
                  </option>
                ))}
              </select>
            </div>

            <p className="section-title">Дети</p>
            <ChildrenList children={form.children} onChange={(children) => update({ children })} />
          </>
        )}

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.isDriver}
            onChange={(event) => update({ isDriver: event.target.checked })}
          />
          Я вожу — готов подвозить чужих детей
        </label>

        {form.isDriver && (
          <>
            <div className="field">
              <label htmlFor="profile-plate">Гос. номер</label>
              <input
                id="profile-plate"
                value={form.car.plate}
                onChange={(event) => update({ car: { ...form.car, plate: event.target.value } })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="profile-brand">Марка автомобиля</label>
              <input
                id="profile-brand"
                value={form.car.brand}
                onChange={(event) => update({ car: { ...form.car, brand: event.target.value } })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="profile-color">Цвет автомобиля</label>
              <input
                id="profile-color"
                value={form.car.color}
                onChange={(event) => update({ car: { ...form.car, color: event.target.value } })}
                required
              />
            </div>

            <p className="section-title">Забирает из очередей</p>
            <div className="checkbox-group">
              {QUEUES.map((queue) => (
                <label className="checkbox-chip" key={queue}>
                  <input
                    type="checkbox"
                    checked={form.pickupQueues.includes(queue)}
                    onChange={() => togglePickupQueue(queue)}
                  />
                  Очередь {queue}
                </label>
              ))}
            </div>
          </>
        )}

        {error && <p className="form-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
        {saved && !saving && <p className="muted">Сохранено.</p>}
      </form>

      <NotificationsToggle uid={user.uid} />

      <button className="btn btn-ghost" type="button" onClick={logout}>
        Выйти
      </button>
    </main>
  );
}
