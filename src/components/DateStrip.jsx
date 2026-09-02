import { getDateStrip } from '../lib/dates.js';

export default function DateStrip({ selectedKey, onSelect }) {
  const days = getDateStrip();

  return (
    <div className="dates">
      {days.map((day) => (
        <button
          key={day.dateKey}
          type="button"
          className={`date${day.isWeekend ? ' dim' : ''}`}
          aria-current={day.dateKey === selectedKey ? 'date' : undefined}
          onClick={() => onSelect(day.dateKey)}
        >
          <span className="dow">{day.dow}</span>
          <span className="num">{day.day}</span>
        </button>
      ))}
    </div>
  );
}
