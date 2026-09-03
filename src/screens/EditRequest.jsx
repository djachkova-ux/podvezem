import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  deleteRequest,
  subscribeRequest,
  subscribeRequestResponses,
  updateRequest,
} from '../lib/db.js';
import { toDateKey } from '../lib/dates.js';

/**
 * Редактирование своего уже опубликованного запроса (S14), симметрично
 * EditOffer. Правки и снятие с доски запрещены, пока есть неотвеченный
 * отклик водителя — та же причина, что и у предложений.
 */
export default function EditRequest() {
  const { requestId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(undefined);
  const [responses, setResponses] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    setRequest(undefined);
    return subscribeRequest(requestId, setRequest);
  }, [user, requestId]);

  useEffect(() => {
    if (!user) return undefined;
    setResponses(null);
    return subscribeRequestResponses(requestId, user.uid, setResponses);
  }, [user, requestId]);

  useEffect(() => {
    if (!request) return;
    setForm({
      date: request.date,
      arrivalTime: request.arrivalTime,
      childrenIds: request.children.map((child) => child.id),
      note: request.note || '',
    });
  }, [request]);

  if (request === undefined || responses === null || !profile) {
    return (
      <main className="screen">
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  if (!request || request.customerId !== user?.uid) {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/trips">
          ← Назад к поездкам
        </Link>
        <div className="placeholder">
          <span>Этот запрос недоступен или принадлежит другому заказчику.</span>
        </div>
      </main>
    );
  }

  if (request.status !== 'open') {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/trips">
          ← Назад к поездкам
        </Link>
        <h1 className="screen-title">Изменить запрос</h1>
        <div className="placeholder">
          <span>Этот запрос уже закрыт — редактирование недоступно.</span>
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
        <h1 className="screen-title">Изменить запрос</h1>
        <div className="placeholder">
          <span>
            На этот запрос есть неотвеченные отклики — сначала подтвердите или отклоните их,
            потом можно будет изменить или снять публикацию.
          </span>
        </div>
        <Link className="btn btn-primary" to={`/board/requests/${requestId}/responses`}>
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

  function toggleChild(id) {
    setForm((prev) => ({
      ...prev,
      childrenIds: prev.childrenIds.includes(id)
        ? prev.childrenIds.filter((item) => item !== id)
        : [...prev.childrenIds, id],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.childrenIds.length === 0) {
      setError('Выберите хотя бы одного ребёнка.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateRequest(requestId, profile, {
        date: form.date,
        arrivalTime: form.arrivalTime,
        childrenIds: form.childrenIds,
        note: form.note.trim(),
      });
      navigate('/trips');
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError('');
    try {
      await deleteRequest(requestId);
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
      <h1 className="screen-title">Изменить запрос</h1>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="request-date">Дата</label>
          <input
            id="request-date"
            type="date"
            min={toDateKey()}
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="request-time">Время прибытия в школу</label>
          <input
            id="request-time"
            type="time"
            value={form.arrivalTime}
            onChange={(event) => setForm({ ...form, arrivalTime: event.target.value })}
            required
          />
        </div>

        <p className="section-title">Дети</p>
        <div className="checkbox-group">
          {profile.children.map((child) => (
            <label className="checkbox-chip" key={child.id}>
              <input
                type="checkbox"
                checked={form.childrenIds.includes(child.id)}
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
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            placeholder="Например: можно немного подождать"
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>

      <button className="btn btn-ghost" type="button" disabled={saving} onClick={handleDelete}>
        Снять запрос с доски
      </button>
    </main>
  );
}
