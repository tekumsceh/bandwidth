/** Shared shape for schedule / gig cards and strip views */
export type ScheduleEvent = {
  id: number;
  /** Required for asset deep links on strips */
  band_id?: number;
  band_name?: string;
  band_is_solo?: 0 | 1;
  band_color?: string | null;
  event_date: string;
  city: string | null;
  venue_name: string | null;
  soundcheck_time?: string | null;
  set_time?: string | null;
  status: string;
  description?: string | null;
  band_paid_at?: string | null;
  event_price?: number | string;
  currency?: string;
};
