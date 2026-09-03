import QueueTag from './QueueTag.jsx';
import Icon from './Icon.jsx';
import { digitsOnly } from '../lib/phone.js';

function getInitials(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const statusLabels = {
  delivered: 'Поездка завершена',
  cancelled: 'Отменена',
};

/**
 * Карточка «моей поездки» — общая для всех четырёх ролей (заказчик/водитель
 * × предложение/запрос). Что показывать и какая кнопка активна, решает сам
 * `trip`, собранный в MyTrips.jsx (см. нормализацию там).
 */
export default function TripCard({ trip, busy, onCancel, onComplete }) {
  const {
    status,
    dateLabel,
    arrivalTime,
    otherName,
    otherPhone,
    otherCar,
    otherStartStreet,
    queues,
    address,
    childrenLabel,
    note,
    myRole,
  } = trip;

  return (
    <div className="ride-card">
      <div className="who">
        <span className="avatar">{getInitials(otherName)}</span>
        <div>
          <p className="name">{otherName || 'Без имени'}</p>
          <p className="car">
            {otherCar
              ? `${otherCar.brand} · ${otherCar.color} · ${otherCar.plate}`
              : childrenLabel}
          </p>
        </div>
      </div>

      {otherStartStreet && <p className="note">Выезжает с: {otherStartStreet}</p>}

      <div className="queues">
        {(queues || []).map((queue) => (
          <QueueTag key={queue} queue={queue} />
        ))}
      </div>

      <p className="note">
        {dateLabel} · {arrivalTime}
      </p>
      {address && <p className="note">Адрес: {address}</p>}
      {note && <p className="note">{note}</p>}

      <div className="actions">
        {status === 'confirmed' && myRole === 'customer' && (
          <button className="btn btn-ghost" type="button" disabled={busy} onClick={onCancel}>
            Отменить поездку
          </button>
        )}
        {status === 'confirmed' && myRole === 'driver' && (
          <button className="btn btn-primary" type="button" disabled={busy} onClick={onComplete}>
            Закончить поездку
          </button>
        )}
        {status !== 'confirmed' && <p className="own-note">{statusLabels[status]}</p>}
        {otherPhone && (
          <a
            className="btn btn-icon"
            href={`tel:+${digitsOnly(otherPhone)}`}
            aria-label={`Позвонить: ${otherName}`}
          >
            <Icon name="phone" className="i" />
          </a>
        )}
      </div>
    </div>
  );
}
