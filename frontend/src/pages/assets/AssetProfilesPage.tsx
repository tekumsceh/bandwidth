import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiUrl } from '../../config/api';

type ModuleKey = 'gear' | 'setlist' | 'patch';

type Props = {
  moduleKey: ModuleKey;
  title: string;
};

type BandOption = { id: number; name: string };
type Profile = { id: number; name: string; is_default: number };
type AssetItem = {
  id: number;
  label: string;
  category: string | null;
  qty: number;
  notes: string | null;
};

export default function AssetProfilesPage({ moduleKey, title }: Props) {
  const [searchParams] = useSearchParams();
  const initialBandId = Number(searchParams.get('bandId') || NaN);
  const [bands, setBands] = useState<BandOption[]>([]);
  const [bandId, setBandId] = useState<number | null>(null);
  const [tab, setTab] = useState<'personal' | 'band' | 'combined' | 'invoke'>('personal');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [items, setItems] = useState<AssetItem[]>([]);
  const [combinedRows, setCombinedRows] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [dateId, setDateId] = useState('');

  useEffect(() => {
    const loadBands = async () => {
      const res = await fetch(apiUrl('/api/bands'));
      if (!res.ok) return;
      const json = (await res.json()) as BandOption[];
      setBands(json);
      if (json.length > 0) {
        const matched = Number.isFinite(initialBandId) ? json.find((b) => b.id === initialBandId) : null;
        setBandId((curr) => curr ?? matched?.id ?? json[0].id);
      }
    };
    void loadBands();
  }, [initialBandId]);

  const scope = useMemo(() => (tab === 'band' ? 'band' : 'personal'), [tab]);

  const loadProfiles = async () => {
    if (!bandId || tab === 'combined' || tab === 'invoke') return;
    setError(null);
    const res = await fetch(apiUrl(`/api/assets/profiles/${moduleKey}/${bandId}?scope=${scope}`));
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || 'Failed to load profiles');
      return;
    }
    const nextProfiles = (json?.profiles || []) as Profile[];
    setProfiles(nextProfiles);
    const fallback = nextProfiles.find((p) => p.is_default)?.id ?? nextProfiles[0]?.id ?? null;
    setSelectedProfileId(fallback);
  };

  const loadItems = async () => {
    if (!bandId || !selectedProfileId || tab === 'combined' || tab === 'invoke') {
      setItems([]);
      return;
    }
    const res = await fetch(apiUrl(`/api/assets/items/${moduleKey}/${bandId}/${selectedProfileId}`));
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || 'Failed to load items');
      return;
    }
    setItems((json?.items || []) as AssetItem[]);
  };

  const loadCombined = async () => {
    if (!bandId || moduleKey !== 'gear' || tab !== 'combined') {
      setCombinedRows([]);
      return;
    }
    const res = await fetch(apiUrl(`/api/assets/combined/gear/${bandId}`));
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || 'Failed to load combined');
      return;
    }
    setCombinedRows(json?.combined || []);
  };

  useEffect(() => {
    void loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bandId, tab, moduleKey]);

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bandId, selectedProfileId, moduleKey, tab]);

  useEffect(() => {
    void loadCombined();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bandId, moduleKey, tab]);

  const createProfile = async () => {
    if (!bandId || !newProfileName.trim()) return;
    const res = await fetch(apiUrl(`/api/assets/profiles/${moduleKey}/${bandId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, name: newProfileName.trim() }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || 'Failed to create profile');
      return;
    }
    setNewProfileName('');
    setStatus('Profile created.');
    await loadProfiles();
  };

  const setDefault = async () => {
    if (!bandId || !selectedProfileId) return;
    const res = await fetch(apiUrl(`/api/assets/profiles/${moduleKey}/${bandId}/${selectedProfileId}/default`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || 'Failed to set default');
      return;
    }
    setStatus('Default profile updated.');
    await loadProfiles();
  };

  const addItem = async () => {
    if (!bandId || !selectedProfileId || !newItemLabel.trim()) return;
    const res = await fetch(apiUrl(`/api/assets/items/${moduleKey}/${bandId}/${selectedProfileId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newItemLabel.trim(), qty: 1 }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || 'Failed to add item');
      return;
    }
    setNewItemLabel('');
    setStatus('Item added.');
    await loadItems();
  };

  const invokeDefaults = async () => {
    if (!bandId || !dateId.trim()) return;
    const res = await fetch(apiUrl(`/api/assets/invoke/${moduleKey}/${bandId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateId: Number(dateId) }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || 'Failed to invoke defaults');
      return;
    }
    setStatus('Default profile invoked to date snapshot.');
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <div className="page-header-sub">Click-first profile management (personal + band scopes).</div>
        </div>
      </header>

      <section className="event-detail-section">
        <div className="assets-toolbar">
          <label>
            <span>Band</span>
            <select value={bandId ?? ''} onChange={(e) => setBandId(Number(e.target.value))}>
              {bands.map((band) => (
                <option key={band.id} value={band.id}>
                  {band.name}
                </option>
              ))}
            </select>
          </label>
          <div className="tabs">
            {[
              ['personal', 'Personal'],
              ['band', 'Band'],
              ['combined', 'Combined'],
              ['invoke', 'Invoke'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`tab-button ${tab === value ? 'active' : ''}`}
                onClick={() => setTab(value as any)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {(tab === 'personal' || tab === 'band') && (
          <>
            <div className="assets-grid">
              <div>
                <h2>Profiles</h2>
                <div className="assets-chip-row">
                  {profiles.map((profile) => (
                    <button
                      type="button"
                      key={profile.id}
                      className={`auth-proto-pill ${selectedProfileId === profile.id ? 'active' : ''}`}
                      onClick={() => setSelectedProfileId(profile.id)}
                    >
                      {profile.name}
                    </button>
                  ))}
                </div>
                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="New profile name"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                  />
                  <button type="button" className="btn btn-action" onClick={createProfile}>
                    Create profile
                  </button>
                  <button type="button" className="btn btn-filter" onClick={setDefault} disabled={!selectedProfileId}>
                    Set default
                  </button>
                </div>
              </div>
              <div>
                <h2>Items</h2>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Add item label"
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                  />
                  <button type="button" className="btn btn-action" onClick={addItem} disabled={!selectedProfileId}>
                    Add item
                  </button>
                </div>
                <ul className="lineup-list" style={{ marginTop: '0.75rem' }}>
                  {items.map((item) => (
                    <li key={item.id}>
                      <span className="lineup-name">{item.label}</span>
                      <span className="lineup-role">x{Number(item.qty || 0).toFixed(0)}</span>
                    </li>
                  ))}
                  {items.length === 0 && <li className="muted">No items yet.</li>}
                </ul>
              </div>
            </div>
          </>
        )}

        {tab === 'combined' && (
          <div>
            <h2>Combined view</h2>
            <ul className="lineup-list">
              {combinedRows.map((row, idx) => (
                <li key={`${row.label}-${idx}`}>
                  <span className="lineup-name">{row.label}</span>
                  <span className="lineup-role">
                    {row.source || 'band'} • x{Number(row.qty || 0).toFixed(0)}
                  </span>
                </li>
              ))}
              {combinedRows.length === 0 && <li className="muted">No combined rows available.</li>}
            </ul>
          </div>
        )}

        {tab === 'invoke' && (
          <div className="form-row">
            <label>
              <span>Date id</span>
              <input type="number" value={dateId} onChange={(e) => setDateId(e.target.value)} placeholder="Date id" />
            </label>
            <button type="button" className="btn btn-action" onClick={invokeDefaults}>
              Apply default profile to date
            </button>
          </div>
        )}

        {status && <p className="auth-proto-status ok">{status}</p>}
        {error && <p className="auth-proto-status err">{error}</p>}
      </section>
    </div>
  );
}

