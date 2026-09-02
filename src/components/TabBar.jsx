import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';

// Три вкладки из макета. Доска внутри переключается между водителями
// и запросами, поэтому в навигации она одна: активной её держит match —
// префикс пути, а не конкретный адрес ссылки.
const tabs = [
  { to: '/board/drivers', match: '/board', icon: 'board', label: 'Доска' },
  { to: '/trips', match: '/trips', icon: 'route', label: 'Поездки' },
  { to: '/profile', match: '/profile', icon: 'user', label: 'Профиль' },
];

export default function TabBar() {
  const { pathname } = useLocation();

  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className="tap"
          aria-current={pathname.startsWith(tab.match) ? 'page' : undefined}
        >
          <Icon name={tab.icon} />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
