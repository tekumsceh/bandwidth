import { useCallback, useEffect, useState } from 'react';

export type EventDetailData = {
  id: number;
  band_id: number;
  band_name: string;
  band_color: string | null;
  event_date: string;
  title: string | null;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  load_in_time: string | null;
  soundcheck_time: string | null;
  doors_time: string | null;
  set_time: string | null;
  curfew_time: string | null;
  status: string;
  event_price: number | string;
  currency: string;
  organizer_contact?: string | null;
  tech_contact?: string | null;
  tech_notes: string | null;
  hospitality_notes: string | null;
  description: string | null;
  band_paid_at?: string | null;
};

export type LineupMember = {
  id: number;
  user_id: number;
  display_name: string;
  email: string;
  role: string | null;
  is_confirmed: 0 | 1;
  notes: string | null;
};

export type FinanceSummary = {
  totals: Record<string, number>;
  members: { user_id: number; display_name: string; allocated_eur: number; paid_eur: number }[];
};

export type PendingExpense = {
  id: number;
  user_id: number;
  display_name: string;
  label: string;
  amount_eur: number;
  created_at: string;
};

type EventPagePayload = {
  event: EventDetailData;
  lineup: LineupMember[];
  finance: FinanceSummary;
  myLedgerRow: { allocated_eur: number; paid_eur: number } | null;
  canSeeBandFinance: boolean;
  canEditPlanning?: boolean;
  pendingExpenses: PendingExpense[];
};

export function useEventPageData(eventId?: string) {
  const [data, setData] = useState<EventDetailData | null>(null);
  const [lineup, setLineup] = useState<LineupMember[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canSeeBandFinance, setCanSeeBandFinance] = useState(false);
  const [canEditPlanning, setCanEditPlanning] = useState(false);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [myLedgerRow, setMyLedgerRow] = useState<{ allocated_eur: number; paid_eur: number } | null>(null);

  const toErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const refresh = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/pages/event/${eventId}`);
      if (!res.ok) throw new Error(`Failed to load event (${res.status})`);
      const payload = (await res.json()) as EventPagePayload;
      setData(payload.event);
      setLineup(payload.lineup || []);
      setFinance(payload.finance || null);
      setMyLedgerRow(payload.myLedgerRow || null);
      setCanSeeBandFinance(Boolean(payload.canSeeBandFinance));
      setCanEditPlanning(Boolean(payload.canEditPlanning));
      setPendingExpenses(payload.pendingExpenses || []);
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to load event'));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
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
  };
}

