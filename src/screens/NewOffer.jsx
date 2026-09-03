import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createRideOffer, createRideOfferTemplate } from '../lib/db.js';
import { toDateKey, WEEKDAY_OPTIONS } from '../lib/dates.js';

const seatOptions = [1, 2, 3, 4, 5, 6, 7, 8];

export default function NewOffer() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(() => toDateKey());
  const [arrivalTime, setArrivalTime] = useState('08:00');
  const [seatsTotal, setSeatsTotal] = useState(4);
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleWeekday(value) {
    setWeekdays((prev) =>
      prev.includes(value) ? prev.filter((day) => day !== value) : [...prev, value],
    );
  }

  if (!profile) {
    return (
      <main className="screen">
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  const canPublish = profile.isDriver && profile.car?.plate && profile.pickupQueues?.length > 0;

  if (!canPublish) {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/board/drivers">
          ← Назад к доске
        </Link>
        <h1 className="screen-title">Новое предложение</h1>
        <div className="placeholder">
          <span>
            Чтобы публиковать поездки, в профиле нужно включить «Я вожу», указать авто и очереди,
            откуда забираете детей.
          </span>
        </div>
        <Link className="btn btn-primary" to="/profile">
          Перейти в профиль
        </Link>
      </main>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (repeat && weekdays.length === 0) {
      setError('Выберите хотя бы один день недели.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (repeat) {
        await createRideOfferTemplate(user.uid, profile, {
          weekdays,
          arrivalTime,
          seatsTotal: Number(seatsTotal),
          note: note.trim(),
        });
      } else {
        await createRideOffer(user.uid, profile, {
          date,
          arrivalTime,
          seatsTotal: Number(seatsTotal),
          note: note.trim(),
        });
      }
      navigate('/board/drivers');
    } catch {
      setError('Не удалось опубликовать. Попробуйте ещё раз.');
      setSaving(false);
    }
  }

  return (
    <main className="screen">
      <Link className="auth-switch" to="/board/drivers">
        ← Назад к доске
      </Link>
      <h1 className="screen-title">Новое предложение</h1>

      <form className="form" onSubmit={handleSubmit}>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={repeat}
            onChange={(event) => setRepeat(event.target.checked)}
          />
          Повторять по дням недели (на месяц вперёд)
        </label>

        {repeat ? (
          <div className="field">
            <label>Дни недели</label>
            <div className="checkbox-group">
              {WEEKDAY_OPTIONS.map((option) => (
                <label className="checkbox-chip" key={option.value}>
                  <input
                    type="checkbox"
                    checked={weekdays.includes(option.value)}
                    onChange={() => toggleWeekday(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="offer-date">Дата</label>
            <input
              id="offer-date"
              type="date"
              min={toDateKey()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="offer-time">Время прибытия в школу</label>
          <input
            id="offer-time"
            type="time"
            value={arrivalTime}
            onChange={(event) => setArrivalTime(event.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="offer-seats">Свободных мест</label>
          <select
            id="offer-seats"
            value={seatsTotal}
            onChange={(event) => setSeatsTotal(event.target.value)}
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
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Например: могу забрать пораньше"
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
