import { Link, useLocation } from 'react-router-dom';
import { DollarSign, LayoutGrid, Settings } from 'lucide-react';
import {
  PRIMARY_HUB_NAV,
  PRIMARY_HUB_SETUP,
  eventsHubHrefPreservingQuery,
  isEventsHubPathname,
} from '../config/navigation';

const HUB_ICONS = {
  dashboard: LayoutGrid,
  finance: DollarSign,
} as const;

function PrimaryHubNav() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const raw = (params.get('view') || 'dashboard').toLowerCase();
  const normalized = raw === 'ledger' ? 'ledger' : 'dashboard';

  const isSetupActive = location.pathname === PRIMARY_HUB_SETUP.to;

  return (
    <nav className="app-primary-nav" aria-label="Main">
      {PRIMARY_HUB_NAV.map((item) => {
        const isActive =
          isEventsHubPathname(location.pathname) &&
          (item.view === 'dashboard' ? normalized === 'dashboard' : normalized === 'ledger');
        const Icon = HUB_ICONS[item.view];
        return (
          <Link
            key={item.key}
            to={eventsHubHrefPreservingQuery(item.view, location.search)}
            className={`app-primary-nav-link${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span>{item.label}</span>
            <Icon className="app-primary-nav-icon" size={15} strokeWidth={2.25} aria-hidden />
          </Link>
        );
      })}
      <Link
        key={PRIMARY_HUB_SETUP.key}
        to={PRIMARY_HUB_SETUP.to}
        className={`app-primary-nav-link app-primary-nav-link--setup${isSetupActive ? ' active' : ''}`}
        aria-current={isSetupActive ? 'page' : undefined}
      >
        <span>{PRIMARY_HUB_SETUP.label}</span>
        <Settings className="app-primary-nav-icon" size={15} strokeWidth={2.25} aria-hidden />
      </Link>
    </nav>
  );
}

export default PrimaryHubNav;
