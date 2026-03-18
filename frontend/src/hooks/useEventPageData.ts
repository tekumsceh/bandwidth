import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../config/api';
import type {
  EventDetailData,
  EventPagePayload,
  FinanceSummary,
  LineupMember,
  PendingExpense,
} from '../types';

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
      const res = await fetch(apiUrl(`/api/pages/event/${eventId}`));
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

