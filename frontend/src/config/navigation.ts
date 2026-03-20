export const APP_ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  events: '/events',
  createEvent: '/events/new',
  eventDetail: '/events/:id',
  bandDetail: '/bands/:id',
  assetsGear: '/assets/gear',
  assetsSetlists: '/assets/setlists',
  assetsPatch: '/assets/patch',
  settings: '/settings',
  adminConfig: '/admin/config',
  labTestingGround: '/_lab/testing-ground',
} as const;

/** Events hub query `view=` — Dashboard / Dates / Finance */
export const EVENTS_VIEW = {
  dashboard: 'dashboard',
  dates: 'schedule',
  finance: 'ledger',
} as const;

export const eventsHubHref = (view: keyof typeof EVENTS_VIEW) =>
  `${APP_ROUTES.events}?view=${EVENTS_VIEW[view]}`;

/** Events hub link while keeping `bandId`, `timeline`, etc. from current URL */
export function eventsHubHrefPreservingQuery(view: keyof typeof EVENTS_VIEW, currentSearch: string) {
  const next = new URLSearchParams(currentSearch);
  next.set('view', EVENTS_VIEW[view]);
  const q = next.toString();
  return q ? `${APP_ROUTES.events}?${q}` : APP_ROUTES.events;
}

export type NavItem = {
  key: string;
  label: string;
  to: string;
  end?: boolean;
};

export const WORK_NAV_ITEMS: readonly NavItem[] = [
  { key: 'events', label: 'Events', to: eventsHubHref('dashboard'), end: true },
  { key: 'create-event', label: 'New event', to: APP_ROUTES.createEvent },
] as const;

/** Top bar: Dashboard / Finance (+ Setup → settings) — Events hub `view=` (schedule via URL/sidebar) */
export const PRIMARY_HUB_NAV: readonly { key: string; label: string; view: 'dashboard' | 'finance' }[] = [
  { key: 'hub-dashboard', label: 'Dashboard', view: 'dashboard' },
  { key: 'hub-finance', label: 'Finance', view: 'finance' },
] as const;

/** Fourth pill — outside Events `view` (console “Setup”) */
export const PRIMARY_HUB_SETUP = { key: 'hub-setup', label: 'Setup', to: APP_ROUTES.settings } as const;

export const ACCOUNT_NAV_ITEMS: readonly NavItem[] = [
  { key: 'settings', label: 'Settings', to: APP_ROUTES.settings },
] as const;

export const ASSET_NAV_ITEMS: readonly NavItem[] = [
  { key: 'assets-gear', label: 'Gear', to: APP_ROUTES.assetsGear },
  { key: 'assets-setlists', label: 'Setlists', to: APP_ROUTES.assetsSetlists },
  { key: 'assets-patch', label: 'I/O patch', to: APP_ROUTES.assetsPatch },
] as const;

/** Deep-link to gear / setlists / patch with band + date (gig) preselected */
export function assetPageHref(
  page: 'gear' | 'setlists' | 'patch',
  bandId: number,
  dateId: number,
) {
  const base =
    page === 'gear'
      ? APP_ROUTES.assetsGear
      : page === 'setlists'
        ? APP_ROUTES.assetsSetlists
        : APP_ROUTES.assetsPatch;
  const q = new URLSearchParams({
    bandId: String(bandId),
    dateId: String(dateId),
  });
  return `${base}?${q.toString()}`;
}

export const TEMP_LAB_NAV_ITEMS: readonly NavItem[] = [
  { key: 'testing-ground', label: 'Testing ground', to: APP_ROUTES.labTestingGround },
] as const;
