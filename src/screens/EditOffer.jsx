import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  deleteRideOffer,
  subscribeOfferResponses,
  subscribeRideOffer,
  updateRideOffer,
} from '../lib/db.js';
import { toDateKey } from '../lib/dates.js';

const seatOptions = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Редактирование своей уже опубликованной поездки (S14). Правки и снятие с
 * доски запрещены, пока есть хоть один неотвеченный (`pending`) отклик —
 * иначе можно было бы, например, уменьшить число мест из-под уже
 * ожидающего отклика заказчика, который об этом не узнает.
 */
export default function EditOffer() {
  const { offerId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(undefined);
  const [responses, setResponses] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    setOffer(undefined);
    return subscribeRideOffer(offerId, setOffer);
  }, [user, offerId]);

  useEffect(() => {
    if (!user) return undefined;
    setResponses(null);
    return subscribeOfferResponses(offerId, user.uid, setResponses);
  }, [user, offerId]);

  useEffect(() => {
    if (!offer) return;
    setForm({
      date: offer.date,
      arrivalTime: offer.arrivalTime,
      seatsTotal: offer.seatsTotal,
      note: offer.note || '',
    });
  }, [offer]);

  if (offer === undefined || responses === null) {
    return (
      <main className="screen">
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  if (!offer || offer.driverId !== user?.uid) {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/trips">
          ← Назад к поездкам
        </Link>
        <div className="placeholder">
          <span>Эта поездка недоступна или принадлежит другому водителю.</span>
        </div>
      </main>
    );
  }

  if (offer.status !== 'open') {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/trips">
          ← Назад к поездкам
        </Link>
        <h1 className="screen-title">Изменить поездку</h1>
        <div className="placeholder">
          <span>Эта поездка уже закрыта — редактирование недоступно.</span>
        </div>
      </main>
    );
  }

  const hasPending = responses.some((r) => r.status === 'pending');

  if (hasPending) {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/trips">
          ← Назад к поездкам
        </Link>
        <h1 className="screen-title">Изменить поездку</h1>
        <div className="placeholder">
          <span>
            На эту поездку есть неотвеченные отклики — сначала подтвердите или отклоните их,
            потом можно будет изменить или снять публикацию.
          </span>
        </div>
        <Link className="btn btn-primary" to={`/board/drivers/${offerId}/responses`}>
          Смотреть отклики
        </Link>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="screen">
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateRideOffer(offer, {
        date: form.date,
        arrivalTime: form.arrivalTime,
        seatsTotal: Number(form.seatsTotal),
        note: form.note.trim(),
      });
      navigate('/trips');
    } catch (err) {
      setError(
        err.message === 'not-enough-seats'
          ? 'Уже подтверждено больше мест, чем вы указываете — сначала увеличьте число мест.'
          : 'Не удалось сохранить. Попробуйте ещё раз.',
      );
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError('');
    try {
      await deleteRideOffer(offerId);
      navigate('/trips');
    } catch {
      setError('Не удалось снять публикацию. Попробуйте ещё раз.');
      setSaving(false);
    }
  }

  return (
    <main className="screen">
      <Link className="auth-switch" to="/trips">
        ← Назад к поездкам
      </Link>
      <h1 className="screen-title">Изменить поездку</h1>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="offer-date">Дата</label>
          <input
            id="offer-date"
            type="date"
            min={toDateKey()}
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="offer-time">Время прибытия в школу</label>
          <input
            id="offer-time"
            type="time"
            value={form.arrivalTime}
            onChange={(event) => setForm({ ...form, arrivalTime: event.target.value })}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="offer-seats">Свободных мест</label>
          <select
            id="offer-seats"
            value={form.seatsTotal}
            onChange={(event) => setForm({ ...form, seatsTotal: event.target.value })}
          >
            {seatOptions.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="offer-note">Комментарий (необязательно)</label>
          <input
            id="offer-note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            placeholder="Например: могу забрать пораньше"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>

      <button className="btn btn-ghost" type="button" disabled={saving} onClick={handleDelete}>
        Снять поездку с доски
      </button>
    </main>
  );
}
