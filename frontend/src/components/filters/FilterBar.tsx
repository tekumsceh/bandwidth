import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  summary?: ReactNode;
  className?: string;
};

function FilterBar({ children, summary, className }: Props) {
  return (
    <div className={className || 'filter-bar'}>
      <div className="filter-bar-controls">{children}</div>
      {summary ? <div className="filter-bar-summary">{summary}</div> : null}
    </div>
  );
}

export default FilterBar;

