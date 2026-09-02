import { SHIFTS } from '../lib/dates.js';

export default function ShiftFilter({ shift, onShiftChange, homeQueue, onlyMyQueue, onToggleMyQueue }) {
  return (
    <div className="filters">
      {SHIFTS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="chip"
          aria-pressed={shift === item.id}
          onClick={() => onShiftChange(shift === item.id ? null : item.id)}
        >
          {item.label} <span className="sub">{item.range}</span>
        </button>
      ))}
      {homeQueue && (
        <button type="button" className="chip" aria-pressed={onlyMyQueue} onClick={onToggleMyQueue}>
          Моя очередь · {homeQueue}
        </button>
      )}
    </div>
  );
}
