import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_ROUTES } from '../config/navigation';
import { useAppStatusBar } from '../contexts/AppStatusBarContext';
import type { CurrentUser } from '../types';

type Props = {
  me: CurrentUser;
  pendingExpensesCount: number;
};

function formatClock(d: Date) {
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** Bottom strip: hub context (colorful), account (left), clock (right). */
export function AppStatusBar({ me, pendingExpensesCount }: Props) {
  const { hubStatusExtras } = useAppStatusBar();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const localPart = me.email.split('@')[0] ?? '';
  const initials = (localPart.slice(0, 2).padEnd(2, '?') || '??').toUpperCase();

  return (
    <footer className="app-status-bar" role="contentinfo">
      <div className="app-status-bar-inner">
        <div className="app-status-bar-left">
          {hubStatusExtras ? (
            <>
              <div className="app-status-bar-hub" aria-label="Page context">
                {hubStatusExtras}
              </div>
              <span className="app-status-bar-sep" aria-hidden>
                ·
              </span>
            </>
          ) : null}
          <Link
            to={APP_ROUTES.settings}
            className="app-status-bar-user app-status-bar-user--compact"
            aria-label="Account & settings"
          >
            <div className="app-status-bar-user-avatar" aria-hidden>
              {initials}
            </div>
            <div className="app-status-bar-user-text">
              <div className="app-status-bar-user-name">
                {me.email}
                {pendingExpensesCount > 0 && (
                  <span
                    className="badge badge-warning"
                    style={{ marginLeft: '0.35rem', fontSize: 'inherit' }}
                    title="There are pending expenses awaiting approval"
                  >
                    {pendingExpensesCount}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </div>

        <div className="app-status-bar-right">
          <time className="app-status-bar-text app-status-bar-clock" dateTime={now.toISOString()}>
            {formatClock(now)}
          </time>
        </div>
      </div>
    </footer>
  );
}
