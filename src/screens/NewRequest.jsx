import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createRequest } from '../lib/db.js';
import { toDateKey } from '../lib/dates.js';

export default function NewRequest() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(() => toDateKey());
  const [arrivalTime, setArrivalTime] = useState('08:00');
  const [childrenIds, setChildrenIds] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!profile) {
    return (
      <main className="screen">
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  const canPublish = profile.isCustomer && profile.address && profile.children?.length > 0;

  if (!canPublish) {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/board/requests">
          ← Назад к доске
        </Link>
        <h1 className="screen-title">Новый запрос</h1>
        <div className="placeholder">
          <span>
            Чтобы искать трансфер, в профиле нужно включить «Я заказчик», указать адрес и
            добавить хотя бы одного ребёнка.
          </span>
        </div>
        <Link className="btn btn-primary" to="/profile">
          Перейти в профиль
        </Link>
      </main>
    );
  }

  function toggleChild(id) {
    setChildrenIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (childrenIds.length === 0) {
      setError('Выберите хотя бы одного ребёнка.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createRequest(user.uid, profile, {
        date,
        arrivalTime,
        childrenIds,
        note: note.trim(),
      });
      navigate('/board/requests');
    } catch {
      setError('Не удалось опубликовать. Попробуйте ещё раз.');
      setSaving(false);
    }
  }

  return (
    <main className="screen">
      <Link className="auth-switch" to="/board/requests">
        ← Назад к доске
      </Link>
      <h1 className="screen-title">Новый запрос</h1>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="request-date">Дата</label>
          <input
            id="request-date"
            type="date"
            min={toDateKey()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="request-time">Время прибытия в школу</label>
          <input
            id="request-time"
            type="time"
            value={arrivalTime}
            onChange={(event) => setArrivalTime(event.target.value)}
            required
          />
        </div>

        <p className="section-title">Дети</p>
        <div className="checkbox-group">
          {profile.children.map((child) => (
            <label className="checkbox-chip" key={child.id}>
              <input
                type="checkbox"
                checked={childrenIds.includes(child.id)}
                onChange={() => toggleChild(child.id)}
              />
              {child.name}
            </label>
          ))}
        </div>

        <div className="field">
          <label htmlFor="request-note">Комментарий (необязательно)</label>
          <input
            id="request-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Например: можно немного подождать"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Публикуем…' : 'Опубликовать'}
        </button>
      </form>
    </main>
  );
}
