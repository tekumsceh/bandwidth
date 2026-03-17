import { useEffect, useMemo, useState } from 'react';

type CurrencyPrefPayload = {
  default_currency: string;
  local_currency: string;
  supported_currencies: string[];
};

function detectDeviceCurrency() {
  try {
    const detected = Intl.NumberFormat().resolvedOptions().currency;
    if (detected && /^[A-Z]{3}$/.test(detected)) return detected;
  } catch {
    // ignore and fallback
  }
  return 'EUR';
}

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [supported, setSupported] = useState<string[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState('EUR');
  const [localCurrency, setLocalCurrency] = useState('EUR');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:5000/api/me/preferences/currency');
        const json = (await res.json()) as CurrencyPrefPayload;
        if (!res.ok) {
          throw new Error((json as any)?.error || `Failed to load settings (${res.status})`);
        }
        setSupported(json.supported_currencies || ['EUR', 'RSD']);
        setDefaultCurrency(json.default_currency || 'EUR');
        setLocalCurrency(json.local_currency || 'EUR');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const options = useMemo(() => supported.map((c) => ({ id: c, label: c })), [supported]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch('http://localhost:5000/api/me/preferences/currency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_currency: defaultCurrency,
          local_currency: localCurrency,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed to save settings (${res.status})`);
      setStatus('Currency preferences saved.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-header-sub">Choose your default and local currencies.</p>
        </div>
      </div>

      <section className="event-form settings-form">
        <div className="form-row">
          <label>
            <span>Default currency</span>
            <select value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Local currency</span>
            <select value={localCurrency} onChange={(e) => setLocalCurrency(e.target.value)}>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-secondary btn-action"
            onClick={() => setLocalCurrency(detectDeviceCurrency())}
            disabled={saving || loading}
          >
            Use device currency
          </button>
          <button type="button" className="btn btn-action" onClick={save} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <p className="muted">
          Default currency is your primary bookkeeping currency. Local currency is your on-the-ground spending context.
        </p>
        <p className="muted">Displayed converted amounts are rounded for readability.</p>

        {loading && <p className="muted">Loading settings…</p>}
        {error && <p className="muted" style={{ color: '#fecaca' }}>{error}</p>}
        {status && <p className="muted" style={{ color: '#86efac' }}>{status}</p>}
      </section>
    </div>
  );
}

export default Settings;

