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
  // Силуэт иконки приложения (design/app-icon.svg) — знак в шапке повторяет
  // то, что пользователь видит на домашнем экране телефона.
  brand: <path d="M5 18h8.5a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6H19" />,
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
  seat: (
    <>
      <path d="M7 4.5h10a2 2 0 0 1 2 2v7H5v-7a2 2 0 0 1 2-2Z" />
      <path d="M4 15h16a1.5 1.5 0 0 1 1.5 1.5v1A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-1A1.5 1.5 0 0 1 4 15Z" />
    </>
  ),
  seatFilled: (
    <>
      <path d="M7 4.5h10a2 2 0 0 1 2 2v7H5v-7a2 2 0 0 1 2-2Z" />
      <rect x="2.5" y="15" width="19" height="4" rx="1.6" />
    </>
  ),
  phone: (
    <path d="M7 3.5H4.8A1.8 1.8 0 0 0 3 5.4C3 13.9 10.1 21 18.6 21a1.8 1.8 0 0 0 1.9-1.8V17l-4.2-1.6-2 2a13.6 13.6 0 0 1-5.6-5.6l2-2Z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
};

const filledIcons = new Set(['seatFilled']);

export default function Icon({ name, ...rest }) {
  const shape = paths[name];
  if (!shape) return null;
  const filled = filledIcons.has(name);

  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
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
