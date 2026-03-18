import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../config/api';
import type { BandDetail, BandLedgerEvent, BandLedgerMember, BandPagePayload } from '../types';

type BandPageQuery = {
  timeline?: 'upcoming' | 'past' | 'all';
  archive?: boolean;
};

export function useBandPageData(bandId?: string, query?: BandPageQuery) {
  const [detail, setDetail] = useState<BandDetail | null>(null);
  const [ledgerMembers, setLedgerMembers] = useState<BandLedgerMember[]>([]);
  const [ledgerEvents, setLedgerEvents] = useState<BandLedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<BandPagePayload['myEvents']>([]);
  const [bandMembers, setBandMembers] = useState<BandPagePayload['bandMembers']>([]);
  const [canSeeLedger, setCanSeeLedger] = useState(false);

  const toErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const refresh = useCallback(async () => {
    if (!bandId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query?.timeline) params.set('timeline', query.timeline);
      if (query?.archive) params.set('archive', '1');
      const querySuffix = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(apiUrl(`/api/pages/band/${bandId}${querySuffix}`));
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to load band (${res.status})`);
      }
      const payload = (await res.json()) as BandPagePayload;
      setDetail(payload.detail);
      setMyEvents(payload.myEvents || []);
      setBandMembers(payload.bandMembers || []);
      setCanSeeLedger(Boolean(payload.canSeeLedger));
      setLedgerEvents(payload.ledgerEvents || []);
      setLedgerMembers(payload.ledgerMembers || []);
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to load band'));
    } finally {
      setLoading(false);
    }
  }, [bandId, query?.timeline, query?.archive]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    detail,
    ledgerMembers,
    ledgerEvents,
    loading,
    error,
    myEvents,
    bandMembers,
    canSeeLedger,
    refresh,
  };
}

