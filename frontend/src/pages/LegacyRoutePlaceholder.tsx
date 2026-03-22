import BackNavLink from '../components/BackNavLink';
import { eventsHubHref } from '../config/navigation';

type Props = {
  title: string;
  body: string;
  /** Optional small reference (e.g. id) */
  refLabel?: string;
};

/** Stub shell for routes we keep alive but have not rebuilt in the console / strip layout yet. */
export default function LegacyRoutePlaceholder({ title, body, refLabel }: Props) {
  return (
    <div className="page">
      <BackNavLink fallbackTo={eventsHubHref('dashboard')} />
      <div className="page-header page-header--hub" style={{ marginTop: '1rem' }}>
        <h1 className="page-header-hub-title">{title}</h1>
        <p className="page-header-sub">{body}</p>
        {refLabel ? <p className="page-header-meta">{refLabel}</p> : null}
      </div>
    </div>
  );
}
