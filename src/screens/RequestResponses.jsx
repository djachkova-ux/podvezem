import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  confirmRequestResponse,
  rejectRequestResponse,
  subscribeRequest,
  subscribeRequestResponses,
} from '../lib/db.js';
import QueueTag from '../components/QueueTag.jsx';
import Icon from '../components/Icon.jsx';
import { digitsOnly } from '../lib/phone.js';

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const statusLabels = {
  confirmed: 'Подтверждён',
  rejected: 'Отклонён',
};

function DriverResponseCard({ response, onConfirm, onReject, busy, disabled }) {
  return (
    <div className="ride-card">
      <div className="who">
        <span className="avatar">{getInitials(response.driverName)}</span>
        <div>
          <p className="name">{response.driverName}</p>
          <p className="car">
            {response.driverCar.brand} · {response.driverCar.color} ·{' '}
            <span className="plate">{response.driverCar.plate}</span>
          </p>
        </div>
      </div>

      <div className="queues">
        {response.pickupQueues.map((queue) => (
          <QueueTag key={queue} queue={queue} />
        ))}
      </div>

      {response.note && <p className="note">{response.note}</p>}

      <div className="actions">
        {response.status === 'pending' ? (
          <>
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy || disabled}
              onClick={onConfirm}
            >
              Подтвердить
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={onReject}>
              Отклонить
            </button>
          </>
        ) : (
          <p className="own-note">{statusLabels[response.status]}</p>
        )}
        {response.driverPhone && (
          <a
            className="btn btn-icon"
            href={`tel:+${digitsOnly(response.driverPhone)}`}
            aria-label={`Позвонить: ${response.driverName}`}
          >
            <Icon name="phone" className="i" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function RequestResponses() {
  const { requestId } = useParams();
  const { user } = useAuth();
  const [request, setRequest] = useState(undefined);
  const [responses, setResponses] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

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

  if (request === undefined || responses === null) {
    return (
      <main className="screen">
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  if (!request || request.customerId !== user?.uid) {
    return (
      <main className="screen">
        <Link className="auth-switch" to="/board/requests">
          ← Назад к доске
        </Link>
        <div className="placeholder">
          <span>Этот запрос недоступен или принадлежит другому заказчику.</span>
        </div>
      </main>
    );
  }

  async function handleConfirm(response) {
    setBusyId(response.id);
    setActionError('');
    try {
      await confirmRequestResponse(response);
    } catch (err) {
      setActionError(
        err.message === 'already-closed'
          ? 'Запрос уже закрыт другим откликом.'
          : 'Не удалось подтвердить отклик. Попробуйте ещё раз.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(response) {
    setBusyId(response.id);
    setActionError('');
    try {
      await rejectRequestResponse(response.id);
    } catch {
      setActionError('Не удалось отклонить отклик. Попробуйте ещё раз.');
    } finally {
      setBusyId(null);
    }
  }

  const requestClosed = request.status !== 'open';

  return (
    <main className="screen">
      <Link className="auth-switch" to="/board/requests">
        ← Назад к доске
      </Link>
      <h1 className="screen-title">Отклики</h1>
      <p className="muted">
        {request.arrivalTime} · {requestClosed ? 'запрос закрыт' : 'запрос открыт'}
      </p>

      {actionError && <p className="form-error">{actionError}</p>}

      {responses.length === 0 && <p className="board-empty">Пока никто не откликнулся.</p>}

      {responses.length > 0 && (
        <div className="route">
          {responses.map((response) => (
            <article key={response.id} className="ride is-open">
              <DriverResponseCard
                response={response}
                busy={busyId === response.id}
                disabled={requestClosed}
                onConfirm={() => handleConfirm(response)}
                onReject={() => handleReject(response)}
              />
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
