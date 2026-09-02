import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { subscribeRideOffers } from '../lib/db.js';
import { getShift, toDateKey } from '../lib/dates.js';
import DateStrip from '../components/DateStrip.jsx';
import ShiftFilter from '../components/ShiftFilter.jsx';
import RideCard from '../components/RideCard.jsx';
import Icon from '../components/Icon.jsx';

function seatsWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'свободное место';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'свободных места';
  return 'свободных мест';
}

export default function DriversBoard() {
  const { user, profile } = useAuth();
  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [shift, setShift] = useState(null);
  const [onlyMyQueue, setOnlyMyQueue] = useState(false);
  const [offers, setOffers] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    setOffers(null);
    return subscribeRideOffers(dateKey, setOffers);
  }, [user, dateKey]);

  const filtered = useMemo(() => {
    if (!offers) return [];
    return offers.filter((offer) => {
      if (shift && getShift(offer.arrivalTime) !== shift) return false;
      if (onlyMyQueue && !offer.pickupQueues.includes(profile?.homeQueue)) return false;
      return true;
    });
  }, [offers, shift, onlyMyQueue, profile]);

  const freeSeats = filtered.reduce((sum, offer) => sum + offer.seatsFree, 0);

  return (
    <>
      <main className="screen">
        <DateStrip selectedKey={dateKey} onSelect={setDateKey} />
        <ShiftFilter
          shift={shift}
          onShiftChange={setShift}
          homeQueue={profile?.homeQueue}
          onlyMyQueue={onlyMyQueue}
          onToggleMyQueue={() => setOnlyMyQueue((value) => !value)}
        />

        <p className="board-note">
          <span>
            <strong>{filtered.length} поездок</strong> на этот день · {freeSeats} {seatsWord(freeSeats)}
          </span>
        </p>

        {offers === null && <p className="muted">Загрузка…</p>}

        {offers !== null && filtered.length === 0 && (
          <p className="board-empty">На эту дату подходящих поездок пока нет.</p>
        )}

        {filtered.length > 0 && (
          <div className="route">
            {filtered.map((offer) => (
              <article key={offer.id} className="ride is-open">
                <RideCard offer={offer} isOwn={offer.driverId === user?.uid} />
              </article>
            ))}
          </div>
        )}
      </main>

      {profile?.isDriver && (
        <Link to="/board/drivers/new" className="fab">
          <Icon name="plus" className="i" />
          Поездка
        </Link>
      )}
    </>
  );
}
