import { useEffect, useMemo, useState } from 'react';
import StatusBlock from '../components/StatusBlock';
import BackNavLink from '../components/BackNavLink';
import { apiUrl } from '../config/api';
import type { CurrentUser } from '../types';

type Props = {
  me: CurrentUser | null;
};

type ListingConfig = {
  page_key: string;
  default_view: string;
  default_timeline: string;
  default_ledger_mode: string;
  archive_enabled: number;
};

type FilterConfig = {
  id: number;
  page_key: string;
  filter_key: string;
  enabled: number;
  default_value: string | null;
  sort_order: number;
  options_json: string | null;
};

type InterventionRow = {
  id: number;
  date_id: number;
  band_id: number;
  status: string;
};

function AdminConfig({ me }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingConfig[]>([]);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [selectedPage, setSelectedPage] = useState('events');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [interventions, setInterventions] = useState<InterventionRow[]>([]);
  const [requestDateId, setRequestDateId] = useState('');
  const [requestBandId, setRequestBandId] = useState('');
  const [requestReason, setRequestReason] = useState('');

  const selectedListing = useMemo(
    () => listings.find((l) => l.page_key === selectedPage) || null,
    [listings, selectedPage],
  );
  const selectedFilters = useMemo(
    () => filters.filter((f) => f.page_key === selectedPage).sort((a, b) => a.sort_order - b.sort_order),
    [filters, selectedPage],
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfgRes, intRes] = await Promise.all([
        fetch(apiUrl('/api/admin/config/pages')),
        fetch(apiUrl('/api/interventions')),
      ]);
      if (!cfgRes.ok) {
        const json = await cfgRes.json().catch(() => null);
        throw new Error(json?.error || `Failed loading config (${cfgRes.status})`);
      }
      const cfgJson = (await cfgRes.json()) as { listings: ListingConfig[]; filters: FilterConfig[] };
      setListings(cfgJson.listings || []);
      setFilters(cfgJson.filters || []);
      if (intRes.ok) {
        setInterventions((await intRes.json()) as InterventionRow[]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load admin config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveListing = async () => {
    if (!selectedListing) return;
    setSaveMessage(null);
    const res = await fetch(apiUrl(`/api/admin/config/pages/${selectedPage}/listing`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedListing),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setSaveMessage(json?.error || 'Failed to save listing config');
      return;
    }
    setSaveMessage('Listing config saved.');
    await load();
  };

  const saveFilters = async () => {
    setSaveMessage(null);
    const payload = {
      filters: selectedFilters.map((f) => ({
        filter_key: f.filter_key,
        enabled: !!f.enabled,
        default_value: f.default_value,
        sort_order: f.sort_order,
        options_json: (() => {
          try {
            return f.options_json ? JSON.parse(f.options_json) : null;
          } catch {
            return null;
          }
        })(),
      })),
    };
    const res = await fetch(apiUrl(`/api/admin/config/pages/${selectedPage}/filters`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setSaveMessage(json?.error || 'Failed to save filters');
      return;
    }
    setSaveMessage('Filter config saved.');
    await load();
  };

  const submitIntervention = async () => {
    const dateId = Number(requestDateId);
    const bandId = Number(requestBandId);
    if (!Number.isFinite(dateId) || !Number.isFinite(bandId) || !requestReason.trim()) {
      setSaveMessage('Intervention request requires date id, band id and reason.');
      return;
    }
    const res = await fetch(apiUrl('/api/interventions/request'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date_id: dateId,
        band_id: bandId,
        reason: requestReason.trim(),
        scope_json: { note: 'Requested from app admin console' },
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setSaveMessage(json?.error || 'Failed to submit intervention request');
      return;
    }
    setSaveMessage('Intervention request submitted.');
    setRequestDateId('');
    setRequestBandId('');
    setRequestReason('');
    await load();
  };

  if (loading) return <div className="page"><StatusBlock kind="loading" message="Loading…" /></div>;
  if (error) return <div className="page"><StatusBlock kind="error" message={error} /></div>;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <BackNavLink />
          <h1>App admin config</h1>
          <div className="page-header-sub">Listing/filter schema and governance controls.</div>
        </div>
      </header>

      <section className="event-detail-section">
        <h2>Page config</h2>
        <div className="form-row">
          <label>
            <span>Page</span>
            <select value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)}>
              {Array.from(new Set(listings.map((l) => l.page_key))).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
          {selectedListing && (
            <>
              <label>
                <span>Default view</span>
                <input
                  value={selectedListing.default_view}
                  onChange={(e) =>
                    setListings((prev) =>
                      prev.map((l) =>
                        l.page_key === selectedPage ? { ...l, default_view: e.target.value } : l,
                      ),
                    )
                  }
                />
              </label>
              <label>
                <span>Default timeline</span>
                <input
                  value={selectedListing.default_timeline}
                  onChange={(e) =>
                    setListings((prev) =>
                      prev.map((l) =>
                        l.page_key === selectedPage ? { ...l, default_timeline: e.target.value } : l,
                      ),
                    )
                  }
                />
              </label>
            </>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-action btn-secondary" onClick={saveListing}>
            Save listing
          </button>
          <button type="button" className="btn btn-action btn-secondary" onClick={saveFilters}>
            Save filters
          </button>
        </div>
        {saveMessage && <p className="muted">{saveMessage}</p>}
      </section>

      <section className="event-detail-section" style={{ marginTop: '1rem' }}>
        <h2>Intervention requests</h2>
        <div className="form-row" style={{ marginBottom: '0.75rem' }}>
          <label>
            <span>Date ID</span>
            <input value={requestDateId} onChange={(e) => setRequestDateId(e.target.value)} />
          </label>
          <label>
            <span>Band ID</span>
            <input value={requestBandId} onChange={(e) => setRequestBandId(e.target.value)} />
          </label>
          <label>
            <span>Reason</span>
            <input value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
          </label>
          <button type="button" className="btn btn-action btn-secondary" onClick={submitIntervention}>
            Request fix
          </button>
        </div>
        {interventions.length === 0 ? (
          <p className="muted">No intervention requests.</p>
        ) : (
          <ul className="lineup-list">
            {interventions.map((r) => (
              <li key={r.id}>
                <span className="lineup-name">#{r.id}</span>
                <span className="lineup-role">
                  Date {r.date_id}, Band {r.band_id}, Status {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {me?.role === 'GOD' && (
        <section className="event-detail-section" style={{ marginTop: '1rem' }}>
          <h2>Admin grants</h2>
          <GodGrantForm onSaved={load} />
        </section>
      )}
    </div>
  );
}

function GodGrantForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [userId, setUserId] = useState('');
  const [accessLevel, setAccessLevel] = useState('config_admin');
  const [enabled, setEnabled] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setMsg(null);
    const id = Number(userId);
    if (!Number.isFinite(id)) {
      setMsg('Enter a valid user id');
      return;
    }
    const res = await fetch(apiUrl(`/api/admin/config/access/users/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ can_access_admin: enabled, access_level: accessLevel }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setMsg(json?.error || 'Failed saving grant');
      return;
    }
    setMsg('Grant updated.');
    await onSaved();
  };

  return (
    <>
      <div className="form-row">
        <label>
          <span>User ID</span>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} />
        </label>
        <label>
          <span>Access level</span>
          <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
            <option value="super_admin">super_admin</option>
            <option value="config_admin">config_admin</option>
            <option value="viewer">viewer</option>
          </select>
        </label>
        <label>
          <span>Enabled</span>
          <select value={enabled ? '1' : '0'} onChange={(e) => setEnabled(e.target.value === '1')}>
            <option value="1">enabled</option>
            <option value="0">disabled</option>
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-action btn-secondary" onClick={save}>
          Save grant
        </button>
      </div>
      {msg ? <p className="muted">{msg}</p> : null}
    </>
  );
}

export default AdminConfig;

