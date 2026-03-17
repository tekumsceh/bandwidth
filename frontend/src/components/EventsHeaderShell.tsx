import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
};

function EventsHeaderShell({ title, children }: Props) {
  return (
    <div className="events-header-shell">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
        </div>
      </header>
      {children}
    </div>
  );
}

export default EventsHeaderShell;

