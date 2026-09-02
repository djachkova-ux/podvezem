import QueueTag from './QueueTag.jsx';
import { getShift, SHIFTS } from '../lib/dates.js';

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

export default function RequestCard({ request, isOwn }) {
  const shift = SHIFTS.find((item) => item.id === getShift(request.arrivalTime));
  const count = request.children.length;

  return (
    <div className="ride-card">
      <div className="ride-top">
        <span className="time">{request.arrivalTime}</span>
        <span className="time-note">в школе</span>
        <span className="shift">{shift.label}</span>
      </div>

      <div className="who">
        <span className="avatar">{getInitials(request.customerName)}</span>
        <div>
          <p className="name">{request.customerName}</p>
          <p className="car">
            {count} {childrenWord(count)}: {request.children.map((child) => child.name).join(', ')}
          </p>
        </div>
      </div>

      <div className="queues">
        <QueueTag queue={request.homeQueue} />
      </div>

      <p className="note">
        {isOwn ? `Адрес: ${request.address}` : 'Адрес будет виден после отклика'}
      </p>

      {request.note && <p className="note">{request.note}</p>}

      <div className="actions">
        {isOwn ? (
          <p className="own-note">Это ваш запрос</p>
        ) : (
          <button
            className="btn btn-primary"
            type="button"
            disabled
            title="Отклики появятся в одной из следующих сессий"
          >
            Откликнуться
          </button>
        )}
      </div>
    </div>
  );
}
