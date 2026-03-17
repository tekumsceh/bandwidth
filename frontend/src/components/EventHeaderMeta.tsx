type Props = {
  activeTab: 'overview' | 'execution' | 'ledger';
  title: string | null;
  bandName: string;
  venueName: string | null;
  dateStr: string;
  city: string | null;
  country: string | null;
  status: string;
};

function EventHeaderMeta({
  activeTab,
  title,
  bandName,
  venueName,
  dateStr,
  city,
  country,
  status,
}: Props) {
  const sectionTitle =
    activeTab === 'overview'
      ? 'Show overview'
      : activeTab === 'execution'
        ? 'Show execution'
        : 'Show ledger';

  return (
    <header className="page-header">
      <div className="page-header-main">
        <h1>
          {sectionTitle} – {title || `${bandName} @ ${venueName || 'TBA'}`}
        </h1>
        <div className="page-header-sub">
          {dateStr} • {city || '—'}, {country || '—'}
        </div>
      </div>
      <div className="page-header-meta">
        <span className="badge">{status}</span>
      </div>
    </header>
  );
}

export default EventHeaderMeta;

