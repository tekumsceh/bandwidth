import { useCallback, useState } from 'react';
import type { BandOption, EventsPagePayload, LedgerEvent, UpcomingEvent } from '../types';
import { apiUrl } from '../config/api';

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
      if (params?.band && params.band !== 'all') query.set('bandId', String(params.band));
      if (params?.ledgerMode) query.set('ledgerMode', params.ledgerMode);
      if (params?.archive) query.set('archive', '1');
      const url = `${apiUrl('/api/pages/events')}${query.toString() ? `?${query.toString()}` : ''}`;

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
      if (params?.band && params.band !== 'all') query.set('bandId', String(params.band));
      if (params?.ledgerMode) query.set('ledgerMode', params.ledgerMode);
      if (params?.archive) query.set('archive', '1');
      const url = `${apiUrl('/api/pages/events')}?${query.toString()}`;

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

