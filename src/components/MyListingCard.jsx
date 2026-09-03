import { Link } from 'react-router-dom';
import QueueTag from './QueueTag.jsx';

const kindLabels = { offer: 'Моя поездка', request: 'Мой запрос' };

/**
 * Карточка своей открытой публикации (S14) — вкладка «Мои публикации» в
 * «Поездках». Действия ведут в экран редактирования: там же живёт снятие
 * с доски и проверка на неотвеченные отклики, здесь только ссылка.
 */
export default function MyListingCard({ listing }) {
  const { kind, dateLabel, arrivalTime, title, queues, note, editHref } = listing;

  return (
    <div className="ride-card">
      <div className="ride-top">
        <span className="time">{arrivalTime}</span>
        <span className="time-note">в школе</span>
        <span className="shift">{kindLabels[kind]}</span>
      </div>

      <p className="note">
        {dateLabel} · {title}
      </p>

      <div className="queues">
        {(queues || []).map((queue) => (
          <QueueTag key={queue} queue={queue} />
        ))}
      </div>

      {note && <p className="note">{note}</p>}

      <div className="actions">
        <Link className="btn btn-primary" to={editHref}>
          Изменить
        </Link>
      </div>
    </div>
  );
}
