import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createResponse, subscribeRideOffer } from '../lib/db.js';

export default function RespondSheet() {
  const { offerId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(undefined);
  const [childrenIds, setChildrenIds] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    setOffer(undefined);
    return subscribeRideOffer(offerId, setOffer);
  }, [user, offerId]);

  if (!profile || offer === undefined) {
    return (
      <main className="screen">
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  const canRespond = profile.isCustomer && profile.address && profile.children?.length > 0;

  if (!canRespond) {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/board/drivers">
          ← Назад к доске
        </Link>
        <h1 className="screen-title">Отклик на поездку</h1>
        <div className="placeholder">
          <span>
            Чтобы откликаться на поездки, в профиле нужно включить «Я заказчик», указать адрес и
            добавить хотя бы одного ребёнка.
          </span>
        </div>
        <Link className="btn btn-primary" to="/profile">
          Перейти в профиль
        </Link>
      </main>
    );
  }

  if (!offer || offer.status !== 'open') {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/board/drivers">
          ← Назад к доске
        </Link>
        <h1 className="screen-title">Отклик на поездку</h1>
        <div className="placeholder">
          <span>Эта поездка больше не доступна — возможно, места уже заняли.</span>
        </div>
      </main>
    );
  }

  const limit = offer.seatsFree;

  function toggleChild(id) {
    setChildrenIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= limit) return prev;
      return [...prev, id];
    });
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
      await createResponse(user.uid, profile, offer, { childrenIds, note: note.trim() });
      navigate('/board/drivers');
    } catch {
      setError('Не удалось отправить отклик. Попробуйте ещё раз.');
      setSaving(false);
    }
  }

  return (
    <main className="screen">
      <Link className="auth-switch" to="/board/drivers">
        ← Назад к доске
      </Link>
      <h1 className="screen-title">Отклик на поездку</h1>
      <p className="muted">
        {offer.driverName} · {offer.arrivalTime} · свободно мест: {limit}
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <p className="section-title">Кого везём</p>
        <div className="checkbox-group">
          {profile.children.map((child) => {
            const checked = childrenIds.includes(child.id);
            return (
              <label className="checkbox-chip" key={child.id}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && childrenIds.length >= limit}
                  onChange={() => toggleChild(child.id)}
                />
                {child.name}
              </label>
            );
          })}
        </div>
        <p className="field-hint">Можно выбрать не больше {limit} ребёнка(детей) — по числу мест.</p>

        <div className="field">
          <label htmlFor="response-note">Комментарий (необязательно)</label>
          <input
            id="response-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Например: выйдем к подъезду"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Отправляем…' : 'Отправить отклик'}
        </button>
      </form>
    </main>
  );
}
