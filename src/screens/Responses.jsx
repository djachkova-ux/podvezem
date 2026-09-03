// Лента входящих и исходящих откликов, ждущих решения или уже отклонённых
// (S16) — по push-уведомлению «Новый отклик…» / «Отклик отклонён» теперь
// ведём именно сюда, а не на экран конкретного предложения/запроса (тот мог
// уже устареть или не открыться из PWA-контекста).
//
// Категории — по типу сущности («поездки» = responses к rideOffers,
// «запросы» = requestResponses), а не по тому, я отправитель или получатель:
// внутри каждой категории могут быть и мои pending-отклики на чужие
// предложения/запросы (жду решения, без действий), и pending-отклики,
// которые получил я сам и должен подтвердить/отклонить, и уже отклонённые —
// с обеих сторон. Ровно то же разбиение на 4 роли, что и в MyTrips (S8),
// поэтому переиспользуем те же подписки, offerCache/requestCache и TripCard.

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  confirmRequestResponse,
  confirmResponse,
  getRequest,
  getRideOffer,
  rejectRequestResponse,
  rejectResponse,
  subscribeRequestResponsesAsCustomer,
  subscribeRequestResponsesAsDriver,
  subscribeResponsesAsCustomer,
  subscribeResponsesAsDriver,
} from '../lib/db.js';
import { buildResponses } from '../lib/trips.js';
import TripCard from '../components/TripCard.jsx';

/** Новые (pending) — наверх, внутри групп — свежие сначала. */
function sortByRecency(list) {
  return [...list].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return (b.raw.createdAt?.toMillis?.() ?? 0) - (a.raw.createdAt?.toMillis?.() ?? 0);
  });
}

export default function Responses() {
  const { user } = useAuth();
  const [respCustomer, setRespCustomer] = useState(null);
  const [respDriver, setRespDriver] = useState(null);
  const [reqRespDriver, setReqRespDriver] = useState(null);
  const [reqRespCustomer, setReqRespCustomer] = useState(null);
  const [offerCache, setOfferCache] = useState({});
  const [requestCache, setRequestCache] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    return subscribeResponsesAsCustomer(user.uid, setRespCustomer);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeResponsesAsDriver(user.uid, setRespDriver);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeRequestResponsesAsDriver(user.uid, setReqRespDriver);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeRequestResponsesAsCustomer(user.uid, setReqRespCustomer);
  }, [user]);

  // Отклики-заказчика на предложения не содержат данных о водителе — их
  // подтягиваем разово из rideOffers (см. комментарий в db.js/MyTrips.jsx).
  useEffect(() => {
    const missing = [...new Set((respCustomer || []).map((r) => r.offerId))].filter(
      (id) => !offerCache[id],
    );
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => getRideOffer(id))).then((offers) => {
      setOfferCache((prev) => {
        const next = { ...prev };
        offers.forEach((offer, i) => {
          if (offer) next[missing[i]] = offer;
        });
        return next;
      });
    });
  }, [respCustomer, offerCache]);

  // Симметрично — отклики водителя на запросы не содержат данных заказчика.
  useEffect(() => {
    const missing = [...new Set((reqRespDriver || []).map((r) => r.requestId))].filter(
      (id) => !requestCache[id],
    );
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => getRequest(id))).then((requests) => {
      setRequestCache((prev) => {
        const next = { ...prev };
        requests.forEach((request, i) => {
          if (request) next[missing[i]] = request;
        });
        return next;
      });
    });
  }, [reqRespDriver, requestCache]);

  const loading =
    respCustomer === null || respDriver === null || reqRespDriver === null || reqRespCustomer === null;

  const responses = useMemo(() => {
    if (loading) return [];
    return buildResponses({ respCustomer, respDriver, reqRespDriver, reqRespCustomer, offerCache, requestCache });
  }, [loading, respCustomer, respDriver, reqRespDriver, reqRespCustomer, offerCache, requestCache]);

  const rideResponses = useMemo(
    () => sortByRecency(responses.filter((trip) => trip.kind === 'response')),
    [responses],
  );
  const requestResponses = useMemo(
    () => sortByRecency(responses.filter((trip) => trip.kind === 'requestResponse')),
    [responses],
  );

  async function handleConfirm(trip) {
    setBusyKey(trip.key);
    setActionError('');
    try {
      if (trip.kind === 'response') await confirmResponse(trip.raw);
      else await confirmRequestResponse(trip.raw);
    } catch (err) {
      setActionError(
        err.message === 'not-enough-seats'
          ? 'Свободных мест уже не хватает на этот отклик.'
          : err.message === 'already-closed'
            ? 'Запрос уже закрыт другим откликом.'
            : 'Не удалось подтвердить отклик. Попробуйте ещё раз.',
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleReject(trip) {
    setBusyKey(trip.key);
    setActionError('');
    try {
      if (trip.kind === 'response') await rejectResponse(trip.id);
      else await rejectRequestResponse(trip.id);
    } catch {
      setActionError('Не удалось отклонить отклик. Попробуйте ещё раз.');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="screen">
      <h1 className="screen-title">Отклики</h1>
      <p className="muted">Новые и отклонённые — по вашим поездкам и запросам.</p>

      {actionError && <p className="form-error">{actionError}</p>}

      {loading && <p className="muted">Загрузка…</p>}

      {!loading && (
        <>
          <section className="response-group">
            <h2 className="group-title">Отклики на поездки</h2>
            {rideResponses.length === 0 ? (
              <p className="board-empty">Здесь пока пусто.</p>
            ) : (
              <div className="route">
                {rideResponses.map((trip) => (
                  <article key={trip.key} className="ride is-open">
                    <TripCard
                      trip={trip}
                      busy={busyKey === trip.key}
                      onConfirm={() => handleConfirm(trip)}
                      onReject={() => handleReject(trip)}
                    />
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="response-group">
            <h2 className="group-title">Отклики на запросы</h2>
            {requestResponses.length === 0 ? (
              <p className="board-empty">Здесь пока пусто.</p>
            ) : (
              <div className="route">
                {requestResponses.map((trip) => (
                  <article key={trip.key} className="ride is-open">
                    <TripCard
                      trip={trip}
                      busy={busyKey === trip.key}
                      onConfirm={() => handleConfirm(trip)}
                      onReject={() => handleReject(trip)}
                    />
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
