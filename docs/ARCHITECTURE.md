# Bandwidth — architecture & maintenance notes

## Goals

- **Maintainability**: clear boundaries (shell vs pages vs domain components).
- **Performance**: smaller initial JS via route-level code splitting; avoid mega-files.

## Frontend (`frontend/src/`)

| Area | Purpose |
|------|---------|
| **`App.tsx`** | Auth bootstrap only (`/api/me`), login gate, `<BrowserRouter>`. No layout chrome. |
| **`shell/`** | Logged-in chrome: `AuthenticatedShell` (top bar, drawer nav, main, status bar), `AppStatusBar`. |
| **`routes/lazyPages.tsx`** | `React.lazy()` page loaders — each major route is a separate chunk. |
| **`config/`** | API base URL, navigation constants, feature flags (`tempMode`). |
| **`contexts/`** | Cross-cutting React context (e.g. hub status bar extras). |
| **`hooks/`** | Data fetching hooks (`useEventsPageData`, `useEventPageData`, …). |
| **`pages/`** | Route-level screens; may compose `components/`. **Dashboard** overview is strip cards only (no title row); **I/O patch** renders inside a framed `.io-patch-workspace` in the main shell. **Band** filter is the left `EventBandRail` (same as `/events`) for `/events` and all `/assets/*` routes — not duplicated in page headers. |
| **`components/`** | Reusable UI (lists, toolbars, shells for specific flows). |
| **`pages/assets/`** | Gear / setlists / I/O patch. |
| **`types.ts`** | Shared TS types for API payloads. |

### I/O patch (`pages/assets/`)

- **`IOPatchPage.tsx`** — route page: URL params, viewport hooks, accordion layout, strip/table JSX; delegates data to **`useIoPatchState`**.
- **`io-patch/useIoPatchState.ts`** — band list, patch state, localStorage + API restore, save/load list, popups, channel handlers.
- **`io-patch/`** — also: `IoPatchIcons.tsx`, `IoPatchModals.tsx`, `IoPatchTables.tsx`, `IoPatchStripControls.tsx`, `patchTableUtils.ts` (shared table text).
- **`ioPatchConstants.ts`** / **`ioPatchHooks.ts`** — constants and viewport hooks.
- **`ioPatchStorage.ts`** — local persistence shape for patch state.
- **`utils/fuzzyMatch.ts`** — reusable word-wise filter for searchable dropdowns (I/O mic list and elsewhere).

### What we intentionally keep eager

- **Login / Reset password / Verify email** in the unauthenticated `App` branch — small and needed for first paint.

### Suggested next refactors

1. Trim **`EventDetail.tsx`** / **`Dashboard.tsx`** by moving sections into `components/event/` and colocating hooks.
3. Add **ESLint** rules: `max-lines` (warn per file), `import/no-cycle` (if cycles appear).
4. Consider **`@/` path alias** in `tsconfig` + Vite for shorter imports (`@/shell/...`).

## Backend (`backend/src/`)

| Area | Purpose |
|------|---------|
| **`index.ts`** | Express app wiring. |
| **`routes/`** | HTTP handlers (`auth`, `bands`, `dates`, `pages`, `assets`, `me`, …). |
| **`services/`** | DB and domain logic — prefer keeping routes thin. |
| **`middleware/`** | Session / authz. |

When a service grows, split by **domain** (e.g. `assetsService` submodules) rather than one god-file.

## Conventions

- **Reference UI tokens** live in `App.css` as `:root` `--ref-*` variables (aligned with I/O patch look).
- **New pages**: default export; add to `routes/lazyPages.tsx` + `AuthenticatedShell` routes.
