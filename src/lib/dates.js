// Работа с датами. В приложении одна временная зона — местная,
// поэтому дата поездки хранится строкой YYYY-MM-DD без времени.

const headerFormat = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** «понедельник, 2 сентября» — подпись под названием приложения. */
export function formatHeaderDate(date = new Date()) {
  return headerFormat.format(date);
}

/** YYYY-MM-DD по местному времени (не UTC, в отличие от toISOString). */
export function toDateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** Полоса дат для доски: вчера + сегодня + 5 дней вперёд, выходные помечены. */
export function getDateStrip(center = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(center, index - 1);
    const dow = date.getDay();
    return {
      date,
      dateKey: toDateKey(date),
      dow: WEEKDAYS_SHORT[dow],
      day: date.getDate(),
      isWeekend: dow === 0 || dow === 6,
    };
  });
}

/** Смена по времени прибытия: 1 смена 08:00–12:29, 2 смена 12:30–19:00. */
export function getShift(time) {
  return time < '12:30' ? 1 : 2;
}

export const SHIFTS = [
  { id: 1, label: '1 смена', range: '8:00–12:29' },
  { id: 2, label: '2 смена', range: '12:30–19:00' },
];
