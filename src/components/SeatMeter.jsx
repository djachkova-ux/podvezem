import Icon from './Icon.jsx';

function seatsLabel(free) {
  if (free === 0) return 'Мест нет';
  if (free === 1) return 'Осталось 1 место';
  if (free >= 2 && free <= 4) return `${free} места свободны`;
  return `${free} мест свободно`;
}

export default function SeatMeter({ total, free }) {
  const taken = total - free;
  const low = free > 0 && free <= 1;

  return (
    <div className={`seats${low ? ' low' : ''}`}>
      <span className="seat-row">
        {Array.from({ length: taken }, (_, index) => (
          <Icon key={`t${index}`} name="seatFilled" className="i seat-taken" />
        ))}
        {Array.from({ length: free }, (_, index) => (
          <Icon key={`f${index}`} name="seat" className="i seat-free" />
        ))}
      </span>
      <span className="seats-label">{seatsLabel(free)}</span>
    </div>
  );
}
