import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  cancelRequestResponse,
  cancelResponse,
  completeRequestResponse,
  completeResponse,
  getRequest,
  getRideOffer,
  subscribeMyRequests,
  subscribeMyRideOffers,
  subscribeRequestResponsesAsCustomer,
  subscribeRequestResponsesAsDriver,
  subscribeResponsesAsCustomer,
  subscribeResponsesAsDriver,
} from '../lib/db.js';
import { buildMyListings, buildTrips } from '../lib/trips.js';
import TripCard from '../components/TripCard.jsx';
import MyListingCard from '../components/MyListingCard.jsx';

export default function MyTrips() {
  const { user } = useAuth();
  const [respCustomer, setRespCustomer] = useState(null);
  const [respDriver, setRespDriver] = useState(null);
  const [reqRespDriver, setReqRespDriver] = useState(null);
  const [reqRespCustomer, setReqRespCustomer] = useState(null);
  const [offerCache, setOfferCache] = useState({});
  const [requestCache, setRequestCache] = useState({});
  const [myOffers, setMyOffers] = useState(null);
  const [myRequests, setMyRequests] = useState(null);
  const [tab, setTab] = useState('active');
  const [busyKey, setBusyKey] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    return subscribeResponsesAsCustomer(user.uid, setRespCustomer);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeMyRideOffers(user.uid, setMyOffers);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeMyRequests(user.uid, setMyRequests);
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
  // подтягиваем разово из rideOffers (см. комментарий в db.js).
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

  const trips = useMemo(() => {
    if (loading) return [];
    return buildTrips({ respCustomer, respDriver, reqRespDriver, reqRespCustomer, offerCache, requestCache });
  }, [loading, respCustomer, respDriver, reqRespDriver, reqRespCustomer, offerCache, requestCache]);

  const active = trips
    .filter((trip) => trip.status === 'confirmed')
    .sort((a, b) => (a.date + a.arrivalTime).localeCompare(b.date + b.arrivalTime));
  const archive = trips
    .filter((trip) => trip.status === 'delivered')
    .sort((a, b) => (b.date + b.arrivalTime).localeCompare(a.date + a.arrivalTime));

  const listingsLoading = myOffers === null || myRequests === null;
  const listings = useMemo(() => {
    if (listingsLoading) return [];
    return buildMyListings({ offers: myOffers, requests: myRequests });
  }, [listingsLoading, myOffers, myRequests]);
  const myOfferListings = listings.filter((listing) => listing.kind === 'offer');
  const myRequestListings = listings.filter((listing) => listing.kind === 'request');

  const shown = tab === 'active' ? active : archive;

  async function handleCancel(trip) {
    setBusyKey(trip.key);
    setActionError('');
    try {
      if (trip.kind === 'response') await cancelResponse(trip.raw);
      else await cancelRequestResponse(trip.raw);
    } catch {
      setActionError('Не удалось отменить поездку. Попробуйте ещё раз.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleComplete(trip) {
    setBusyKey(trip.key);
    setActionError('');
    try {
      if (trip.kind === 'response') await completeResponse(trip.id);
      else await completeRequestResponse(trip.id);
    } catch {
      setActionError('Не удалось завершить поездку. Попробуйте ещё раз.');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="screen">
      <h1 className="screen-title">Поездки</h1>
      <p className="muted">Подтверждённые поездки — свои и чужие.</p>

      <div className="filters">
        <button className="chip" type="button" aria-pressed={tab === 'active'} onClick={() => setTab('active')}>
          Активные · {active.length}
        </button>
        <button className="chip" type="button" aria-pressed={tab === 'archive'} onClick={() => setTab('archive')}>
          Архив · {archive.length}
        </button>
        <button className="chip" type="button" aria-pressed={tab === 'mine'} onClick={() => setTab('mine')}>
          Мои публикации · {listings.length}
        </button>
      </div>

      {actionError && <p className="form-error">{actionError}</p>}

      {tab === 'mine' ? (
        <>
          {listingsLoading && <p className="muted">Загрузка…</p>}

          {!listingsLoading && listings.length === 0 && (
            <p className="board-empty">Открытых публикаций пока нет.</p>
          )}

          {!listingsLoading && listings.length > 0 && (
            <>
              <section className="response-group">
                <h2 className="group-title">Мои трансферы</h2>
                {myOfferListings.length === 0 ? (
                  <p className="board-empty">Открытых поездок пока нет.</p>
                ) : (
                  <div className="route">
                    {myOfferListings.map((listing) => (
                      <article key={listing.key} className="ride is-open">
                        <MyListingCard listing={listing} />
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="response-group">
                <h2 className="group-title">Мои запросы</h2>
                {myRequestListings.length === 0 ? (
                  <p className="board-empty">Открытых запросов пока нет.</p>
                ) : (
                  <div className="route">
                    {myRequestListings.map((listing) => (
                      <article key={listing.key} className="ride is-open">
                        <MyListingCard listing={listing} />
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      ) : (
        <>
          {loading && <p className="muted">Загрузка…</p>}

          {!loading && shown.length === 0 && (
            <p className="board-empty">
              {tab === 'active' ? 'Активных поездок пока нет.' : 'Архив пуст.'}
            </p>
          )}

          {!loading && shown.length > 0 && (
            <div className="route">
              {shown.map((trip) => (
                <article key={trip.key} className="ride is-open">
                  <TripCard
                    trip={trip}
                    busy={busyKey === trip.key}
                    onCancel={() => handleCancel(trip)}
                    onComplete={() => handleComplete(trip)}
                  />
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
