export type CurrentUser = {
  id: number;
  email: string;
  displayName: string;
  role: string;
  defaultCurrency?: string;
  localCurrency?: string;
};

/** Bands returned from GET /api/bands (session user). */
export type AppBandSummary = {
  id: number;
  name: string;
  color?: string | null;
  is_solo?: number | null;
};

export type UpcomingEvent = {
  id: number;
  band_id: number;
  band_name: string;
  /** Personal band — show as "me" in UI */
  band_is_solo?: 0 | 1;
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
  band_is_solo?: 0 | 1;
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

export type EventsPagePayload = {
  contractVersion?: string;
  schedule: UpcomingEvent[];
  ledger: LedgerEvent[];
  bands: BandOption[];
  notifications: { pendingExpenses: number };
};

export type EventDetailData = {
  id: number;
  band_id: number;
  band_name: string;
  band_is_solo?: 0 | 1;
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

export type EventPagePayload = {
  contractVersion?: string;
  event: EventDetailData;
  lineup: LineupMember[];
  finance: FinanceSummary;
  myLedgerRow: { allocated_eur: number; paid_eur: number } | null;
  canSeeBandFinance: boolean;
  canEditPlanning?: boolean;
  pendingExpenses: PendingExpense[];
};

export type BandDetail = {
  band: {
    id: number;
    name: string;
    color: string | null;
    is_solo: 0 | 1;
  };
  my_role: 'owner' | 'admin' | 'member';
};

export type BandLedgerMember = {
  user_id: number;
  display_name: string;
};

export type BandLedgerEvent = {
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

export type BandPagePayload = {
  contractVersion?: string;
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
  bandMembers: {
    user_id: number;
    display_name: string;
    role: 'owner' | 'admin' | 'member' | 'guest' | string;
  }[];
  canSeeLedger: boolean;
  ledgerEvents: BandLedgerEvent[];
  ledgerMembers: BandLedgerMember[];
};
