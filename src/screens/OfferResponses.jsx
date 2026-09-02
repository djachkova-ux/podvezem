import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { confirmResponse, rejectResponse, subscribeOfferResponses, subscribeRideOffer } from '../lib/db.js';
import QueueTag from '../components/QueueTag.jsx';

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function childrenWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ребёнок';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'ребёнка';
  return 'детей';
}

const statusLabels = {
  confirmed: 'Подтверждён',
  rejected: 'Отклонён',
};

function ResponseCard({ response, onConfirm, onReject, busy }) {
  const count = response.children.length;

  return (
    <div className="ride-card">
      <div className="who">
        <span className="avatar">{getInitials(response.customerName)}</span>
        <div>
          <p className="name">{response.customerName}</p>
          <p className="car">
            {count} {childrenWord(count)}: {response.children.map((child) => child.name).join(', ')}
          </p>
        </div>
      </div>

      <div className="queues">
        <QueueTag queue={response.homeQueue} />
      </div>

      <p className="note">Адрес: {response.address}</p>
      {response.note && <p className="note">{response.note}</p>}

      <div className="actions">
        {response.status === 'pending' ? (
          <>
            <button className="btn btn-primary" type="button" disabled={busy} onClick={onConfirm}>
              Подтвердить
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={onReject}>
              Отклонить
            </button>
          </>
        ) : (
          <p className="own-note">{statusLabels[response.status]}</p>
        )}
      </div>
    </div>
  );
}

export default function OfferResponses() {
  const { offerId } = useParams();
  const { user } = useAuth();
  const [offer, setOffer] = useState(undefined);
  const [responses, setResponses] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    setOffer(undefined);
    return subscribeRideOffer(offerId, setOffer);
  }, [user, offerId]);

  useEffect(() => {
    if (!user) return undefined;
    setResponses(null);
    return subscribeOfferResponses(offerId, setResponses);
  }, [user, offerId]);

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
        <Link className="auth-switch" to="/board/drivers">
          ← Назад к доске
        </Link>
        <div className="placeholder">
          <span>Эта поездка недоступна или принадлежит другому водителю.</span>
        </div>
      </main>
    );
  }

  async function handleConfirm(response) {
    setBusyId(response.id);
    setActionError('');
    try {
      await confirmResponse(response);
    } catch (err) {
      setActionError(
        err.message === 'not-enough-seats'
          ? 'Свободных мест уже не хватает на этот отклик.'
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
      await rejectResponse(response.id);
    } catch {
      setActionError('Не удалось отклонить отклик. Попробуйте ещё раз.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="screen">
      <Link className="auth-switch" to="/board/drivers">
        ← Назад к доске
      </Link>
      <h1 className="screen-title">Отклики</h1>
      <p className="muted">
        {offer.arrivalTime} · свободно мест: {offer.seatsFree}
      </p>

      {actionError && <p className="form-error">{actionError}</p>}

      {responses.length === 0 && <p className="board-empty">Пока никто не откликнулся.</p>}

      {responses.length > 0 && (
        <div className="route">
          {responses.map((response) => (
            <article key={response.id} className="ride is-open">
              <ResponseCard
                response={response}
                busy={busyId === response.id}
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
