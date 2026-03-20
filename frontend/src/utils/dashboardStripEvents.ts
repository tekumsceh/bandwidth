import type { ScheduleEvent } from '../components/scheduleTypes';

/** Dashboard overview row shows 7 gig strips (+ add). */
export const DASHBOARD_STRIP_EVENT_SLOTS = 7;

export function startOfTodayMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** Local calendar day start for an event_date (YYYY-MM-DD). */
export function eventDayStartMs(ev: ScheduleEvent): number {
  const d = new Date(ev.event_date);
  if (Number.isNaN(d.getTime())) return 0;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Up to 7 gigs: all upcoming first (soonest first), then past (most recent first) to fill.
 * Respects band filter; drops cancelled.
 */
export function buildDashboardStripEventList(
  events: ScheduleEvent[],
  bandFilter: 'all' | number,
): ScheduleEvent[] {
  const pool = events.filter((ev) => {
    if (ev.status === 'cancelled') return false;
    if (bandFilter !== 'all' && ev.band_id !== bandFilter) return false;
    return true;
  });

  const todayMs = startOfTodayMs();

  const upcoming = pool
    .filter((ev) => eventDayStartMs(ev) >= todayMs)
    .sort((a, b) => eventDayStartMs(a) - eventDayStartMs(b));

  const past = pool
    .filter((ev) => eventDayStartMs(ev) < todayMs)
    .sort((a, b) => eventDayStartMs(b) - eventDayStartMs(a));

  const merged: ScheduleEvent[] = [];
  for (const u of upcoming) {
    if (merged.length >= DASHBOARD_STRIP_EVENT_SLOTS) break;
    merged.push(u);
  }
  for (const p of past) {
    if (merged.length >= DASHBOARD_STRIP_EVENT_SLOTS) break;
    merged.push(p);
  }

  return merged;
}

/**
 * Single strip that gets full band-tinted background: earliest upcoming (local day) that is not done.
 */
export function dashboardStripPrimaryEventId(
  events: ScheduleEvent[],
  bandFilter: 'all' | number,
): number | null {
  const todayMs = startOfTodayMs();
  const pool = events.filter((ev) => {
    if (ev.status === 'cancelled') return false;
    if (bandFilter !== 'all' && ev.band_id !== bandFilter) return false;
    if (ev.status.toLowerCase() === 'done') return false;
    return true;
  });

  const upcoming = pool
    .filter((ev) => eventDayStartMs(ev) >= todayMs)
    .sort((a, b) => eventDayStartMs(a) - eventDayStartMs(b));

  return upcoming[0]?.id ?? null;
}
