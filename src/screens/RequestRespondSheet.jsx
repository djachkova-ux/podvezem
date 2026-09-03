import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createRequestResponse, subscribeRequest } from '../lib/db.js';

export default function RequestRespondSheet() {
  const { requestId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(undefined);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    setRequest(undefined);
    return subscribeRequest(requestId, setRequest);
  }, [user, requestId]);

  if (!profile || request === undefined) {
    return (
      <main className="screen">
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  const canRespond = profile.isDriver && profile.car?.plate && profile.pickupQueues?.length > 0;

  if (!canRespond) {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/board/requests">
          ← Назад к доске
        </Link>
        <h1 className="screen-title">Отклик на запрос</h1>
        <div className="placeholder">
          <span>
            Чтобы откликаться на запросы, в профиле нужно включить «Я вожу», указать авто и
            очереди, откуда забираете детей.
          </span>
        </div>
        <Link className="btn btn-primary" to="/profile">
          Перейти в профиль
        </Link>
      </main>
    );
  }

  if (!request || request.status !== 'open') {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/board/requests">
          ← Назад к доске
        </Link>
        <h1 className="screen-title">Отклик на запрос</h1>
        <div className="placeholder">
          <span>Этот запрос больше не доступен — возможно, его уже закрыли.</span>
        </div>
      </main>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createRequestResponse(user.uid, profile, request, { note: note.trim() });
      navigate('/board/requests');
    } catch {
      setError('Не удалось отправить отклик. Попробуйте ещё раз.');
      setSaving(false);
    }
  }

  const count = request.children.length;

  return (
    <main className="screen">
      <Link className="auth-switch" to="/board/requests">
        ← Назад к доске
      </Link>
      <h1 className="screen-title">Отклик на запрос</h1>
      <p className="muted">
        {request.customerName} · {request.arrivalTime} · {count} {count === 1 ? 'ребёнок' : 'детей'}
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="response-note">Комментарий (необязательно)</label>
          <input
            id="response-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Например: заеду в 7:50"
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
