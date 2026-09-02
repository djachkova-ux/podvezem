import Icon from './Icon.jsx';
import QueueTag from './QueueTag.jsx';
import SeatMeter from './SeatMeter.jsx';
import { getShift, SHIFTS } from '../lib/dates.js';
import { digitsOnly } from '../lib/phone.js';

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function RideCard({ offer, isOwn }) {
  const shift = SHIFTS.find((item) => item.id === getShift(offer.arrivalTime));

  return (
    <div className="ride-card">
      <div className="ride-top">
        <span className="time">{offer.arrivalTime}</span>
        <span className="time-note">в школе</span>
        <span className="shift">{shift.label}</span>
      </div>

      <div className="who">
        <span className="avatar">{getInitials(offer.driverName)}</span>
        <div>
          <p className="name">{offer.driverName}</p>
          <p className="car">
            {offer.driverCar.brand} · {offer.driverCar.color} ·{' '}
            <span className="plate">{offer.driverCar.plate}</span>
          </p>
        </div>
      </div>

      <div className="queues">
        {offer.pickupQueues.map((queue) => (
          <QueueTag key={queue} queue={queue} />
        ))}
      </div>

      <SeatMeter total={offer.seatsTotal} free={offer.seatsFree} />

      {offer.note && <p className="note">{offer.note}</p>}

      <div className="actions">
        {isOwn ? (
          <p className="own-note">Это ваша поездка</p>
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
        {offer.driverPhone && (
          <a
            className="btn btn-icon"
            href={`tel:+${digitsOnly(offer.driverPhone)}`}
            aria-label={`Позвонить: ${offer.driverName}`}
          >
            <Icon name="phone" className="i" />
          </a>
        )}
      </div>
    </div>
  );
}
