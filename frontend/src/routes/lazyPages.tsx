import { lazy } from 'react';

/** Route-level code splitting — keeps initial bundle smaller; pages load on demand. */
export const LazyDashboard = lazy(() => import('../pages/Dashboard'));
export const LazyBandDashboard = lazy(() => import('../pages/BandDashboard'));
export const LazyCreateEvent = lazy(() => import('../pages/CreateEvent'));
export const LazyEventDetail = lazy(() => import('../pages/EventDetail'));
export const LazySettings = lazy(() => import('../pages/Settings'));
export const LazyGearPage = lazy(() => import('../pages/assets/Gear'));
export const LazySetlistsPage = lazy(() => import('../pages/assets/Setlists'));
export const LazyPatchPage = lazy(() => import('../pages/assets/Patch'));
export const LazyAdminConfig = lazy(() => import('../pages/AdminConfig'));
export const LazyTestingGround = lazy(() => import('../pages/temp/TestingGround'));
