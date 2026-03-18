# Pages & DB Inventory

Vision: **Payout-style control center** as the main UI paradigm—switch views (like I/O patch In/Out toggle) instead of separate form-heavy pages. Channel strip as the nucleus. Defer forms; simplify DB where possible.

---

## Pages (current)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 1 | **Dashboard** | `/events` | Schedule + Ledger. Tabs: Schedule / Ledger. Filters: timeline, band, ledger mode. |
| 2 | **Create Event** | `/events/new` | Quick-create date. Form: band, date, title. |
| 3 | **Event Detail** | `/events/:id` | Single date: payments, expenses, approve/reject, band-paid, member-paid. |
| 4 | **Band Dashboard** | `/bands/:id` | Band hub. Tabs: Overview / Ledger. Filters: timeline, archive. |
| 5 | **Settings** | `/settings` | User preferences: default currency, local currency. Form. |
| 6 | **Admin Config** | `/admin/config` | Page listing config, filter config, interventions, access. Forms + tables. |
| 7 | **Gear** | `/assets/gear` | Asset profiles (gear). Profiles + items, band-scoped. |
| 8 | **Setlists** | `/assets/setlists` | Asset profiles (setlists). Same pattern as Gear. |
| 9 | **I/O Patch** | `/assets/patch` | Reference UI. Strips, In/Out toggle, range selector, save/load dropdowns. |
| 10 | **Testing Ground** | `/_lab/testing-ground` | Dev-only. No DB. |
| — | **Login** | `/login` | Auth. |
| — | **Register** | `/register` | Auth (same component as Login). |
| — | **Reset Password** | `/reset-password` | Auth flow. |
| — | **Verify Email** | `/verify-email` | Auth flow. |

---

## Associated DB tables

### Core domain (used by most pages)
| Table | Purpose |
|-------|---------|
| `users` | Accounts, auth (password_hash, google_id, email_verified_at, currencies). |
| `bands` | Band metadata. |
| `band_members` | User ↔ band membership. |
| `dates` | Events (gig/date). band_id, date, title, … |
| `date_members` | Who’s on a date (derived from band or overridden). |
| `payments` | Expenses: user_id, date_id, amount, status, category, etc. |

### Auth & sessions
| Table | Purpose |
|-------|---------|
| `user_sessions` | Session tokens. |
| `password_reset_tokens` | Password reset flow. |
| `email_verification_tokens` | Email verification flow. |

### Admin / config
| Table | Purpose |
|-------|---------|
| `admin_access` | Who can access admin. |
| `page_listing_config` | Default view/timeline/ledger per page. |
| `page_filter_config` | Filter options per page. |
| `config_audit_log` | Config change history. |
| `intervention_requests` | Manual interventions (e.g. unlock dates). |
| `finance_audit_log` | Finance mutation audit. |

### Assets
| Table | Purpose |
|-------|---------|
| `asset_profiles` | Gear/setlist/patch profiles. module_key, scope, band_id, owner_user_id. |
| `asset_profile_items` | Items in a profile. profile_id, item_key, label, category, qty, notes. |
| `asset_profile_links` | User ↔ profile default per band. |
| `date_asset_snapshots` | Snapshot of assets for a date. |
| `io_patch_saves` | Saved I/O patch JSON per band. |

---

## APIs per page

| Page | APIs | Notes |
|------|------|-------|
| Dashboard | `/api/pages/events`, `/api/me/preferences/currency`, `/api/me/fx`, `/api/me/pay/date`, `/api/me/pay/bulk`, `/api/dates/quick` | Pay/approve actions. |
| Create Event | `/api/bands`, `/api/dates` (POST) | Single form submit. |
| Event Detail | `/api/dates/:id`, `/api/dates/:id/payments`, band-paid, member-paid, expenses approve/reject | Many mutations. |
| Band Dashboard | `/api/pages/band/:id` | One aggregate endpoint. |
| Settings | `/api/me/preferences/currency` | Single form. |
| Admin Config | `/api/admin/config/pages`, `/api/interventions`, listing, filters, access | Multiple forms. |
| Gear / Setlists | `/api/assets/profiles/*`, `/api/assets/items/*`, combined, invoke | Asset CRUD. |
| I/O Patch | `/api/assets/patch/*`, `/api/bands`, `/api/pages/band/:id` | Patch save/load/default. |

---

## Patch-page migration plan (per page)

Each page will be reviewed to:
- Adopt strip-based layout (like I/O patch).
- Replace forms with strip controls / dropdowns where possible.
- Use view switching (In/Out style) as control center.
- Simplify DB if redundant.

| Page | Best course of action |
|------|------------------------|
| **Dashboard** | Make the control center. Toggle: Schedule / Ledger (already). Strips = events (schedule) or transactions (ledger). Range/timeline = filter bar as strip-style buttons. |
| **Create Event** | Avoid form. Could become: “New date” strip or inline strip in Dashboard with band + date + title as controls. |
| **Event Detail** | Strips = payments/expenses. Each expense = one strip. Actions (approve/reject, pay) = strip buttons. |
| **Band Dashboard** | Same as Dashboard: Overview / Ledger toggle. Strips = events or members/payouts. |
| **Settings** | Minimal. Could be 1–2 strips (currency as dropdown). Or keep as simple panel. |
| **Admin Config** | More complex. Could be strip-per-page-config or strip-per-intervention. Defer details. |
| **Gear** | Strips = gear items. Profile selector = range-style. Add/edit = strip controls. |
| **Setlists** | Same as Gear. Strips = songs. |
| **I/O Patch** | Reference implementation. No change. |

---

## Deferred

- Plan Overview, Plan Execution (deleted).
- Phone layout refinement (see `reminders.md`).
- Channel strip carousel (swipe, snap-to-strip).
