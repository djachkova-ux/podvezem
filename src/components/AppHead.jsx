import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { formatHeaderDate } from '../lib/dates.js';

const boards = [
  { to: '/board/drivers', label: 'Водители' },
  { to: '/board/requests', label: 'Запросы' },
];

export default function AppHead() {
  const { pathname } = useLocation();
  const onBoard = boards.some((board) => board.to === pathname);

  return (
    <header className="app-head">
      <div className="brand-row">
        <span className="brand-mark">
          <Icon name="brand" width="20" height="20" />
        </span>
        <span>
          <span className="brand">Подвезём</span>
          <br />
          <span className="brand-date">{formatHeaderDate()}</span>
        </span>
      </div>

      {onBoard && (
        <div className="segmented">
          {boards.map((board) => (
            <Link
              key={board.to}
              to={board.to}
              aria-current={pathname === board.to ? 'page' : undefined}
            >
              {board.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
