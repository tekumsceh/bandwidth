import { useCallback, useEffect, useState } from 'react';

type BandDetail = {
  band: {
    id: number;
    name: string;
    color: string | null;
    is_solo: 0 | 1;
  };
  my_role: 'owner' | 'admin' | 'member';
};

type BandLedgerMember = {
  user_id: number;
  display_name: string;
};

type BandLedgerEvent = {
  date_id: number;
  event_date: string;
  title: string | null;
  band_paid_at: string | null;
  expenses_eur: number;
  members: {
    user_id: number;
    display_name: string;
    allocated_eur: number;
    paid_eur: number;
  }[];
};

type BandPagePayload = {
  detail: BandDetail;
  myEvents: {
    date_id: number;
    band_id: number;
    band_name: string;
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
  }[];
  canSeeLedger: boolean;
  ledgerEvents: BandLedgerEvent[];
  ledgerMembers: BandLedgerMember[];
};

export function useBandPageData(bandId?: string) {
  const [detail, setDetail] = useState<BandDetail | null>(null);
  const [ledgerMembers, setLedgerMembers] = useState<BandLedgerMember[]>([]);
  const [ledgerEvents, setLedgerEvents] = useState<BandLedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<BandPagePayload['myEvents']>([]);
  const [canSeeLedger, setCanSeeLedger] = useState(false);

  const toErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const refresh = useCallback(async () => {
    if (!bandId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/pages/band/${bandId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to load band (${res.status})`);
      }
      const payload = (await res.json()) as BandPagePayload;
      setDetail(payload.detail);
      setMyEvents(payload.myEvents || []);
      setCanSeeLedger(Boolean(payload.canSeeLedger));
      setLedgerEvents(payload.ledgerEvents || []);
      setLedgerMembers(payload.ledgerMembers || []);
    } catch (e: unknown) {
      setError(toErrorMessage(e, 'Failed to load band'));
    } finally {
      setLoading(false);
    }
  }, [bandId]);

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
    canSeeLedger,
    refresh,
  };
}

