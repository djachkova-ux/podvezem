// Иконки из макета. Набор пополняется по мере появления экранов —
// отдельного спрайта нет, чтобы не тянуть лишний файл в сборку.

const paths = {
  bus: (
    <>
      <rect x="3" y="3.5" width="18" height="13" rx="3" />
      <path d="M3 10h18M9 3.5v6.5" />
      <circle cx="7.5" cy="19" r="1.8" />
      <circle cx="16.5" cy="19" r="1.8" />
      <path d="M5 16.5v1M19 16.5v1" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="4" width="18" height="14" rx="2.5" />
      <path d="M7 9h6M7 13h9M12 18v2M9 21h6" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6H14a4 4 0 0 1 0 8h-4a4 4 0 0 0 0 8h5.5" strokeDasharray="2.5 3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
};

export default function Icon({ name, ...rest }) {
  const shape = paths[name];
  if (!shape) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {shape}
    </svg>
  );
}
