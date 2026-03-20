import type { ReactNode } from 'react';
import BackNavLink from './BackNavLink';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
  actions?: ReactNode;
};

function EventsHeaderShell({ title, subtitle, children, showBack = true, actions }: Props) {
  return (
    <div className="events-header-shell">
      <header className={`page-header page-header--hub${actions ? ' page-header--with-actions' : ''}`}>
        <div className="page-header-hub-main">
          {showBack ? <BackNavLink /> : null}
          <h1 className="page-header-hub-title">{title}</h1>
          {subtitle ? <p className="page-header-hub-sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header-hub-actions">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export default EventsHeaderShell;

