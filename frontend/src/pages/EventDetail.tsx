import { useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { apiUrl } from '../config/api';
import EventInfoSection from '../components/EventInfoSection';
import MyDateLedgerSection from '../components/MyDateLedgerSection';
import BandLedgerSection from '../components/BandLedgerSection';
import EventHeaderMeta from '../components/EventHeaderMeta';
import PendingExpensesPanel from '../components/PendingExpensesPanel';
import EventLedgerActions from '../components/EventLedgerActions';
import StatusBlock from '../components/StatusBlock';
import TabSwitch from '../components/TabSwitch';
import { useEventPageData } from '../hooks/useEventPageData';
import { displayBandName } from '../utils/bandDisplay';

function EventDetail() {
  const { id } = useParams();
  const {
    data,
    lineup,
    finance,
    loading,
    error,
    canSeeBandFinance,
    canEditPlanning,
    pendingExpenses,
    myLedgerRow,
    setError,
    refresh,
  } = useEventPageData(id);
  const [savingIncoming, setSavingIncoming] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [incomingAmount, setIncomingAmount] = useState('');
  const [incomingLabel, setIncomingLabel] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseLabel, setExpenseLabel] = useState('');
  const [myPaidAmount, setMyPaidAmount] = useState('');
  const [savingMyPaid, setSavingMyPaid] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    event_date: '',
    status: 'tentative',
    city: '',
    country: '',
    venue_name: '',
    address: '',
    title: '',
    description: '',
    load_in_time: '',
    soundcheck_time: '',
    doors_time: '',
    set_time: '',
    curfew_time: '',
    organizer_contact: '',
    tech_contact: '',
    tech_notes: '',
    hospitality_notes: '',
  });
  const location = useLocation();
  const initialTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'ledger') return 'ledger';
    if (tab === 'execution') return 'execution';
    return 'overview';
  }, [location.search]);
  const [activeTab, setActiveTab] = useState<'overview' | 'execution' | 'ledger'>(initialTab);
  const toErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const canRequestExpense = false;

  const hydrateEditForm = (event: typeof data) => {
    if (!event) return;
    setEditForm({
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 10) : '',
      status: event.status || 'tentative',
      city: event.city || '',
      country: event.country || '',
      venue_name: event.venue_name || '',
      address: event.address || '',
      title: event.title || '',
      description: event.description || '',
      load_in_time: event.load_in_time || '',
      soundcheck_time: event.soundcheck_time || '',
      doors_time: event.doors_time || '',
      set_time: event.set_time || '',
      curfew_time: event.curfew_time || '',
      organizer_contact: event.organizer_contact || '',
      tech_contact: event.tech_contact || '',
      tech_notes: event.tech_notes || '',
      hospitality_notes: event.hospitality_notes || '',
    });
  };

  const reloadEventPage = async () => {
    await refresh();
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    setSavingEdit(true);
    try {
      const res = await fetch(apiUrl(`/api/dates/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || `Failed to save event (${res.status})`);
      }
      setEditing(false);
      await reloadEventPage();
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to save event'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddIncoming = async () => {
    if (!id || !incomingAmount) return;
    setSavingIncoming(true);
    try {
      const payload = {
        kind: 'incoming',
        amount_eur: Number(incomingAmount),
        label: incomingLabel || 'Incoming',
      };
      const res = await fetch(apiUrl(`/api/dates/${id}/payments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to add incoming (${res.status})`);
      }
      setIncomingAmount('');
      setIncomingLabel('');
      await reloadEventPage();
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to add incoming'));
    } finally {
      setSavingIncoming(false);
    }
  };

  const handleAddExpense = async () => {
    if (!id || !expenseAmount) return;
    setSavingExpense(true);
    try {
      const payload = {
        kind: 'expense',
        amount_eur: Number(expenseAmount),
        label: expenseLabel || 'Expense',
      };
      const res = await fetch(apiUrl(`/api/dates/${id}/payments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to add expense (${res.status})`);
      }
      setExpenseAmount('');
      setExpenseLabel('');
      await reloadEventPage();
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to add expense'));
    } finally {
      setSavingExpense(false);
    }
  };

  const handleAddMyPaid = async () => {
    if (!id || !myPaidAmount) return;
    setSavingMyPaid(true);
    try {
      const payload = {
        kind: 'member_paid',
        amount_eur: Number(myPaidAmount),
      };
      const res = await fetch(apiUrl(`/api/dates/${id}/payments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to log my payment (${res.status})`);
      }
      setMyPaidAmount('');
      await reloadEventPage();
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to log my payment'));
    } finally {
      setSavingMyPaid(false);
    }
  };

  const handleBandPaid = async () => {
    if (!id) return;
    try {
      const res = await fetch(apiUrl(`/api/dates/${id}/band-paid`), {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to mark band paid (${res.status})`);
      }
      await reloadEventPage();
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to mark band paid'));
    }
  };

  const handleMemberPaidFlag = async () => {
    if (!id) return;
    try {
      const res = await fetch(apiUrl(`/api/dates/${id}/member-paid`), {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to mark this date as paid (${res.status})`);
      }
      await reloadEventPage();
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to mark this date as paid'));
    }
  };

  const handleApproveExpense = async (paymentId: number) => {
    if (!id) return;
    try {
      const res = await fetch(
        apiUrl(`/api/dates/${id}/expenses/${paymentId}/approve`),
        { method: 'POST' },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to approve expense (${res.status})`);
      }
      await reloadEventPage();
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to approve expense'));
    }
  };

  const handleRejectExpense = async (paymentId: number) => {
    if (!id) return;
    try {
      const res = await fetch(
        apiUrl(`/api/dates/${id}/expenses/${paymentId}/reject`),
        { method: 'POST' },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to reject expense (${res.status})`);
      }
      await reloadEventPage();
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to reject expense'));
    }
  };

  if (loading) return <div className="page"><StatusBlock kind="loading" message="Loading…" /></div>;
  if (error) return <div className="page"><StatusBlock kind="error" message={error} /></div>;
  if (!data) return <div className="page"><StatusBlock kind="empty" message="Event not found." /></div>;

  const eventDate = new Date(data.event_date);
  const dateStr = eventDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formatTime = (t: string | null) =>
    t
      ? new Date(`1970-01-01T${t}`).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  return (
    <div className="page">
      <EventHeaderMeta
        activeTab={activeTab}
        title={data.title}
        bandName={displayBandName(data.band_name, data.band_is_solo)}
        venueName={data.venue_name}
        dateStr={dateStr}
        city={data.city}
        country={data.country}
        status={data.status}
      />

      <TabSwitch
        value={activeTab}
        onChange={(next) => setActiveTab(next as 'overview' | 'execution' | 'ledger')}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'execution', label: 'Execution' },
          {
            value: 'ledger',
            label: canSeeBandFinance ? 'Ledger' : 'My ledger',
            badge: canSeeBandFinance ? pendingExpenses.length || undefined : undefined,
          },
        ]}
      />

      {activeTab === 'overview' && (
        <>
          <EventInfoSection
            data={data}
            lineup={lineup}
            dateStr={dateStr}
            formatTime={formatTime}
          />
          {canEditPlanning && (
            <section className="event-detail-section" style={{ marginTop: '1rem' }}>
              <h2>Edit event</h2>
              {!editing ? (
                <button
                  type="button"
                  className="btn btn-action"
                  onClick={() => {
                    hydrateEditForm(data);
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              ) : (
                <div className="edit-event-form">
                  <div className="form-row">
                    <label>
                      <span>Date</span>
                      <input
                        type="date"
                        value={editForm.event_date}
                        onChange={(e) => setEditForm((s) => ({ ...s, event_date: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Status</span>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value }))}
                      >
                        <option value="tentative">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="done">Done</option>
                      </select>
                    </label>
                    <label>
                      <span>Title</span>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      <span>City</span>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => setEditForm((s) => ({ ...s, city: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Country</span>
                      <input
                        type="text"
                        value={editForm.country}
                        onChange={(e) => setEditForm((s) => ({ ...s, country: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Venue</span>
                      <input
                        type="text"
                        value={editForm.venue_name}
                        onChange={(e) => setEditForm((s) => ({ ...s, venue_name: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      <span>Load in</span>
                      <input
                        type="time"
                        value={editForm.load_in_time}
                        onChange={(e) => setEditForm((s) => ({ ...s, load_in_time: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Soundcheck</span>
                      <input
                        type="time"
                        value={editForm.soundcheck_time}
                        onChange={(e) => setEditForm((s) => ({ ...s, soundcheck_time: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Doors</span>
                      <input
                        type="time"
                        value={editForm.doors_time}
                        onChange={(e) => setEditForm((s) => ({ ...s, doors_time: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Show</span>
                      <input
                        type="time"
                        value={editForm.set_time}
                        onChange={(e) => setEditForm((s) => ({ ...s, set_time: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>Curfew</span>
                      <input
                        type="time"
                        value={editForm.curfew_time}
                        onChange={(e) => setEditForm((s) => ({ ...s, curfew_time: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="form-row form-row-full">
                    <label>
                      <span>Description</span>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-action"
                      onClick={() => setEditing(false)}
                      disabled={savingEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-action"
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                    >
                      {savingEdit ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {activeTab === 'execution' && (
        <section className="event-detail-section">
          <h2>Execution</h2>
          <ul className="detail-list">
            <li>
              <span>Status</span>
              <strong>{data.status || 'tentative'}</strong>
            </li>
            <li>
              <span>Load-in</span>
              <strong>{formatTime(data.load_in_time) || '—'}</strong>
            </li>
            <li>
              <span>Soundcheck</span>
              <strong>{formatTime(data.soundcheck_time) || '—'}</strong>
            </li>
            <li>
              <span>Doors</span>
              <strong>{formatTime(data.doors_time) || '—'}</strong>
            </li>
            <li>
              <span>Show</span>
              <strong>{formatTime(data.set_time) || '—'}</strong>
            </li>
            <li>
              <span>Curfew</span>
              <strong>{formatTime(data.curfew_time) || '—'}</strong>
            </li>
          </ul>
          <div style={{ marginTop: '0.75rem' }}>
            <h2 style={{ marginBottom: '0.25rem' }}>Notes</h2>
            <p className="muted">{data.description || 'No execution notes yet.'}</p>
          </div>
        </section>
      )}

      {activeTab === 'ledger' && (
        <>
          <div className="event-detail-grid">
            <MyDateLedgerSection data={data} dateStr={dateStr} myLedgerRow={myLedgerRow} />
            <BandLedgerSection canSeeBandFinance={canSeeBandFinance} finance={finance} />
          </div>
          <PendingExpensesPanel
            canSeeBandFinance={canSeeBandFinance}
            pendingExpenses={pendingExpenses}
            onApprove={handleApproveExpense}
            onReject={handleRejectExpense}
          />
          <EventLedgerActions
            canSeeBandFinance={canSeeBandFinance}
            canRequestExpense={canRequestExpense}
            incomingAmount={incomingAmount}
            setIncomingAmount={setIncomingAmount}
            incomingLabel={incomingLabel}
            setIncomingLabel={setIncomingLabel}
            expenseAmount={expenseAmount}
            setExpenseAmount={setExpenseAmount}
            expenseLabel={expenseLabel}
            setExpenseLabel={setExpenseLabel}
            myPaidAmount={myPaidAmount}
            setMyPaidAmount={setMyPaidAmount}
            savingIncoming={savingIncoming}
            savingExpense={savingExpense}
            savingMyPaid={savingMyPaid}
            onAddIncoming={handleAddIncoming}
            onAddExpense={handleAddExpense}
            onAddMyPaid={handleAddMyPaid}
            onBandPaid={handleBandPaid}
            onMemberPaidFlag={handleMemberPaidFlag}
          />
        </>
      )}
    </div>
  );
}

export default EventDetail;

