import type { ReactNode } from 'react';
import BackNavLink from './BackNavLink';

type Props = {
  title: string;
  children: ReactNode;
  showBack?: boolean;
};

function EventsHeaderShell({ title, children, showBack = true }: Props) {
  return (
    <div className="events-header-shell">
      <header className="page-header">
        <div>
          {showBack ? <BackNavLink /> : null}
          <h1>{title}</h1>
        </div>
      </header>
      {children}
    </div>
  );
}

export default EventsHeaderShell;

