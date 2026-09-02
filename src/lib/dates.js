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
