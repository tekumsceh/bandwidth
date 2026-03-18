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

export type NavItem = {
  key: string;
  label: string;
  to: string;
  end?: boolean;
};

export const WORK_NAV_ITEMS: readonly NavItem[] = [
  { key: 'events', label: 'Events', to: APP_ROUTES.events, end: true },
  { key: 'create-event', label: 'New event', to: APP_ROUTES.createEvent },
] as const;

export const ACCOUNT_NAV_ITEMS: readonly NavItem[] = [
  { key: 'settings', label: 'Settings', to: APP_ROUTES.settings },
] as const;

export const ASSET_NAV_ITEMS: readonly NavItem[] = [
  { key: 'assets-gear', label: 'Gear', to: APP_ROUTES.assetsGear },
  { key: 'assets-setlists', label: 'Setlists', to: APP_ROUTES.assetsSetlists },
  { key: 'assets-patch', label: 'I/O patch', to: APP_ROUTES.assetsPatch },
] as const;

export const TEMP_LAB_NAV_ITEMS: readonly NavItem[] = [
  { key: 'testing-ground', label: 'Testing ground', to: APP_ROUTES.labTestingGround },
] as const;
