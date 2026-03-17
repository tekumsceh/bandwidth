import { useCallback, useEffect, useState } from 'react';

export type UpcomingEvent = {
  id: number;
  band_id: number;
  band_name: string;
  band_color?: string | null;
  event_date: string;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  status: string;
  event_price: number | string;
  currency: string;
  soundcheck_time?: string | null;
  set_time?: string | null;
  description?: string | null;
  band_paid_at?: string | null;
};

export type LedgerEvent = {
  date_id: number;
  band_id: number;
  band_name: string;
  band_color?: string | null;
  event_date: string;
  title: string | null;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  status: string;
  event_price: number | string;
  currency: string;
  allocated_eur: number | string;
  paid_eur: number | string;
};

export type BandOption = {
  id: number;
  name: string;
  color?: string | null;
};

type EventsPagePayload = {
  schedule: UpcomingEvent[];
  ledger: LedgerEvent[];
  bands: BandOption[];
  notifications: { pendingExpenses: number };
};

export function useEventsPageData() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([]);
  const [bandOptions, setBandOptions] = useState<BandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const toErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const refresh = useCallback(
    async (params?: {
      view?: 'schedule' | 'ledger' | 'all';
      timeline?: 'past' | 'upcoming' | 'all';
      band?: 'all' | number;
      ledgerMode?: 'unpaid' | 'all';
      archive?: boolean;
    }) => {
      const query = new URLSearchParams();
      if (params?.view) query.set('view', params.view);
      if (params?.timeline) query.set('timeline', params.timeline);
      if (params?.band && params.band !== 'all') query.set('band', String(params.band));
      if (params?.ledgerMode) query.set('ledgerMode', params.ledgerMode);
      if (params?.archive) query.set('archive', '1');
      const url = `http://localhost:5000/api/pages/events${query.toString() ? `?${query.toString()}` : ''}`;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load events page (${res.status})`);
        const json = (await res.json()) as EventsPagePayload;
        setEvents(json.schedule || []);
        setLedgerEvents(json.ledger || []);
        setBandOptions(json.bands || []);
        setLedgerError(null);
      } catch (e: unknown) {
        setError(toErrorMessage(e, 'Failed to load events page'));
        setLedgerError(toErrorMessage(e, 'Failed to load my ledger'));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const refreshLedger = useCallback(
    async (params?: { band?: 'all' | number; ledgerMode?: 'unpaid' | 'all'; archive?: boolean }) => {
      const query = new URLSearchParams();
      query.set('view', 'ledger');
      if (params?.band && params.band !== 'all') query.set('band', String(params.band));
      if (params?.ledgerMode) query.set('ledgerMode', params.ledgerMode);
      if (params?.archive) query.set('archive', '1');
      const url = `http://localhost:5000/api/pages/events?${query.toString()}`;

      try {
        setLedgerLoading(true);
        setLedgerError(null);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load my ledger (${res.status})`);
        const json = (await res.json()) as EventsPagePayload;
        setLedgerEvents(json.ledger || []);
      } catch (e: unknown) {
        setLedgerError(toErrorMessage(e, 'Failed to load my ledger'));
      } finally {
        setLedgerLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    refresh({ view: 'all', timeline: 'upcoming', ledgerMode: 'unpaid' });
  }, [refresh]);

  return {
    events,
    ledgerEvents,
    bandOptions,
    loading,
    error,
    ledgerLoading,
    ledgerError,
    refresh,
    refreshLedger,
  };
}

