import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackNavLink from '../components/BackNavLink';
import { apiUrl } from '../config/api';

type Band = {
  id: number;
  name: string;
};

const INITIAL_FORM = {
  band_id: '',
  event_date: '',
  title: '',
  venue_name: '',
  city: '',
  country: '',
  address: '',
  load_in_time: '',
  soundcheck_time: '',
  doors_time: '',
  set_time: '',
  curfew_time: '',
  organizer_contact: '',
  tech_contact: '',
  tech_notes: '',
  hospitality_notes: '',
  event_price: '',
  currency: 'EUR',
  description: '',
};

function CreateEvent() {
  const [bands, setBands] = useState<Band[]>([]);
  const [loadingBands, setLoadingBands] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const navigate = useNavigate();
  const toErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  useEffect(() => {
    const loadBands = async () => {
      setLoadingBands(true);
      setError(null);
      try {
        const res = await fetch(apiUrl('/api/bands'));
        if (!res.ok) throw new Error(`Failed to load bands (${res.status})`);
        const json = await res.json();
        setBands(json);
      } catch (e: unknown) {
        setError(toErrorMessage(e, 'Failed to load bands'));
      } finally {
        setLoadingBands(false);
      }
    };
    loadBands();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(INITIAL_FORM),
    [form],
  );

  const handleBack = () => {
    if (isDirty) {
      const ok = window.confirm(
        'You have started filling in this show. If you go back now, changes will be lost. Continue?',
      );
      if (!ok) return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent, goToFinance: boolean) => {
    e.preventDefault();
    if (!form.band_id || !form.event_date) {
      setError('Band and date are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        band_id: Number(form.band_id),
        event_price: form.event_price ? Number(form.event_price) : 0,
      };
      const res = await fetch(apiUrl('/api/dates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to create event (${res.status})`);
      }
      const created = await res.json();
      navigate(goToFinance ? `/events/${created.id}?tab=finance` : `/events/${created.id}`);
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to create event'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Create event</h1>
          <div className="page-header-sub">Fill in what, when, where and who.</div>
        </div>
        <div className="page-header-meta">
          <BackNavLink className="back-nav-link" onBeforeBack={handleBack} />
        </div>
      </header>

      {error && <div className="page-status error">{error}</div>}

      <form
        className="event-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e, false);
        }}
      >
        <div className="form-row">
          <label>
            <span>Band / project</span>
            <select
              name="band_id"
              value={form.band_id}
              onChange={handleChange}
              disabled={loadingBands}
              required
            >
              <option value="">Select band</option>
              {bands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Date</span>
            <input
              type="date"
              name="event_date"
              value={form.event_date}
              onChange={handleChange}
              required
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            <span>Venue</span>
            <input
              type="text"
              name="venue_name"
              value={form.venue_name}
              onChange={handleChange}
              placeholder="Venue name"
            />
          </label>
          <label>
            <span>City</span>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="City"
            />
          </label>
          <label>
            <span>Country</span>
            <input
              type="text"
              name="country"
              value={form.country}
              onChange={handleChange}
              placeholder="Country"
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            <span>Venue address</span>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Street, number, etc."
            />
          </label>
        </div>

        <h2 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Times
        </h2>
        <div className="form-row">
          <label>
            <span>Load‑in</span>
            <input
              type="time"
              name="load_in_time"
              value={form.load_in_time}
              onChange={handleChange}
            />
          </label>
          <label>
            <span>Soundcheck</span>
            <input
              type="time"
              name="soundcheck_time"
              value={form.soundcheck_time}
              onChange={handleChange}
            />
          </label>
          <label>
            <span>Doors</span>
            <input
              type="time"
              name="doors_time"
              value={form.doors_time}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            <span>Show</span>
            <input
              type="time"
              name="set_time"
              value={form.set_time}
              onChange={handleChange}
            />
          </label>
          <label>
            <span>End / Curfew</span>
            <input
              type="time"
              name="curfew_time"
              value={form.curfew_time}
              onChange={handleChange}
            />
          </label>
        </div>

        <h2 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Contacts
        </h2>
        <div className="form-row">
          <label>
            <span>Organizer contact</span>
            <input
              type="text"
              name="organizer_contact"
              value={form.organizer_contact}
              onChange={handleChange}
              placeholder="Name, phone, email…"
            />
          </label>
          <label>
            <span>Tech contact</span>
            <input
              type="text"
              name="tech_contact"
              value={form.tech_contact}
              onChange={handleChange}
              placeholder="Name, phone, email…"
            />
          </label>
        </div>

        <h2 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Tech notes
        </h2>
        <div className="form-row">
          <label>
            <span>Tech notes</span>
            <textarea
              name="tech_notes"
              value={form.tech_notes}
              onChange={handleChange}
              rows={3}
              placeholder="Backline, PA, staging, special requirements…"
            />
          </label>
        </div>

        <h2 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          Hospitality
        </h2>
        <div className="form-row">
          <label>
            <span>Hospitality notes</span>
            <textarea
              name="hospitality_notes"
              value={form.hospitality_notes}
              onChange={handleChange}
              rows={3}
              placeholder="Hotel / apartment, check‑in, meals, dressing rooms…"
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            <span>Notes</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Anything important about this show…"
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-action" disabled={saving}>
            {saving ? 'Saving…' : 'Create show'}
          </button>
          <button
            type="button"
            className="btn btn-action btn-secondary"
            disabled={saving}
            onClick={(e) => handleSubmit(e as unknown as FormEvent, true)}
          >
            {saving ? 'Saving…' : 'Create & ledger'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateEvent;

