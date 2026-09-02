import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { subscribeRequests } from '../lib/db.js';
import { getShift, toDateKey } from '../lib/dates.js';
import DateStrip from '../components/DateStrip.jsx';
import ShiftFilter from '../components/ShiftFilter.jsx';
import RequestCard from '../components/RequestCard.jsx';
import Icon from '../components/Icon.jsx';

function childrenWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ребёнок';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'ребёнка';
  return 'детей';
}

export default function RequestsBoard() {
  const { user, profile } = useAuth();
  const [dateKey, setDateKey] = useState(() => toDateKey());
  const [shift, setShift] = useState(null);
  const [onlyMyQueue, setOnlyMyQueue] = useState(false);
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    setRequests(null);
    return subscribeRequests(dateKey, setRequests);
  }, [user, dateKey]);

  const myQueuesLabel = profile?.pickupQueues?.length ? profile.pickupQueues.join(', ') : null;

  const filtered = useMemo(() => {
    if (!requests) return [];
    return requests.filter((request) => {
      if (shift && getShift(request.arrivalTime) !== shift) return false;
      if (onlyMyQueue && !profile?.pickupQueues?.includes(request.homeQueue)) return false;
      return true;
    });
  }, [requests, shift, onlyMyQueue, profile]);

  const totalChildren = filtered.reduce((sum, request) => sum + request.children.length, 0);

  return (
    <>
      <main className="screen">
        <DateStrip selectedKey={dateKey} onSelect={setDateKey} />
        <ShiftFilter
          shift={shift}
          onShiftChange={setShift}
          homeQueue={myQueuesLabel}
          onlyMyQueue={onlyMyQueue}
          onToggleMyQueue={() => setOnlyMyQueue((value) => !value)}
        />

        <p className="board-note">
          <span>
            <strong>{filtered.length} запросов</strong> на этот день · {totalChildren}{' '}
            {childrenWord(totalChildren)}
          </span>
        </p>

        {requests === null && <p className="muted">Загрузка…</p>}

        {requests !== null && filtered.length === 0 && (
          <p className="board-empty">На эту дату подходящих запросов пока нет.</p>
        )}

        {filtered.length > 0 && (
          <div className="route">
            {filtered.map((request) => (
              <article key={request.id} className="ride is-open">
                <RequestCard request={request} isOwn={request.customerId === user?.uid} />
              </article>
            ))}
          </div>
        )}
      </main>

      {profile?.isCustomer && (
        <Link to="/board/requests/new" className="fab">
          <Icon name="plus" className="i" />
          Запрос
        </Link>
      )}
    </>
  );
}
