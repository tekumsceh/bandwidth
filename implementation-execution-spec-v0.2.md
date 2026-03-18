# Bandwidth Execution Spec (v0.2 baseline)

This document completes the active execution to-dos with concrete, discrete steps.
It is intentionally implementation-oriented so we can execute one item at a time.

## 1) Information Architecture: Sidebar + Page Map

### Final sidebar grouping
1. **Work**
   - `Schedule` -> `/events` (default view mode: schedule)
   - `My ledger` -> `/events?view=ledger` (same page, ledger mode)
   - `Create event` -> `/events/new`
2. **Bands**
   - `My bands` group (dynamic list from `/api/bands`)
   - Each item -> `/bands/:id`
3. **Assets** (phase-gated, hidden until ready)
   - `Gear` -> `/assets/gear`
   - `Setlists` -> `/assets/setlists`
   - `I/O patch` -> `/assets/patch`
4. **Account**
   - `Settings` -> `/settings`
   - `Auth` pages (outside sidebar):
     - `/login`
     - `/register`
5. **Administration**
   - `Admin config` -> `/admin/config` (visible only if backend says can-access)
6. **Temporary Lab** (already feature-flagged)
   - `/_lab/testing-ground`
   - `/_lab/plan-overview`
   - `/_lab/plan-execution`

### Page ownership and purpose
- `/events`: user-centric command center (schedule + personal ledger).
- `/events/:id`: date nucleus page (planning/ops + date ledger separation).
- `/bands/:id`: band-centric overview and band ledger (role-gated).
- `/admin/config`: app-level configuration only, never direct band finance mutation.

### Route-state model (explicit)
- Query params are canonical for view/filter state:
  - `view`: `schedule | ledger`
  - `timeline`: `upcoming | past | all`
  - `bandId`: `all | <id>`
  - `archive`: `0 | 1`
- Rule: URL state is source of truth for refresh/share consistency.

## 2) RBAC Matrix (App vs Band Domains)

### Roles
- App roles: `GOD`, delegated app admin (`super_admin`, `config_admin`, `viewer`).
- Band roles: `owner`, `admin`, `member`, `guest`.

### Core constraints (must stay true)
- App admin privileges do not imply band finance edit rights.
- Band admin privileges do not imply app admin rights.
- Every user is `owner` on their own solo band.

### Permission matrix
| Area / Action | GOD | App Admin (config_admin) | Band Owner/Admin | Band Member | Guest |
|---|---|---|---|---|---|
| Open `/admin/config` | Yes | Yes (if granted) | No* | No | No |
| Edit app listing/filter config | Yes | Yes | No | No | No |
| See all bands globally | Optional admin tool only | Optional admin tool only | No | No | No |
| Open band page `/bands/:id` if member | Yes (read) | Yes (read) | Yes | Yes | Yes (if active guest) |
| Edit band planning on future date | No by default** | No by default** | Yes | No | No |
| Edit money baseline before lock | No by default** | No by default** | Yes | No | No |
| Request expense on date | If in band context | If in band context | Yes | Yes | No |
| Approve/reject expense request | No by default** | No by default** | Yes | No | No |
| Mark personal payout received (`member_paid`) | If relevant user | If relevant user | Yes (for own user) | Yes (self only) | No |
| Mark band paid status | No by default** | No by default** | Yes | No | No |

\* unless also a band member for that band.
\** unless explicitly also owner/admin in the specific band.

### Enforcement points
- Backend source of truth:
  - `backend/src/middleware/authz.ts`
  - `backend/src/services/authzService.ts`
  - `backend/src/services/lifecycleService.ts`
- Frontend only mirrors visibility; it is not security.

## 3) Auth Architecture (Google + Email/Password)

### Target account model
- Single `users` row per real person.
- Identity methods linked to user:
  - Google OAuth identity.
  - Email/password identity.
- Login with either method resolves to same user profile.

### Data model additions
1. `users.password_hash` (nullable for OAuth-only users).
2. `users.email_verified_at` (nullable).
3. `users.auth_provider` (`google`, `password`, `hybrid`) for quick diagnostics.
4. Optional dedicated table `user_identities` for extensibility:
   - `user_id`, `provider`, `provider_subject`, `created_at`, unique constraints.

### Session model
- HttpOnly secure cookie session (`sid`) with server-side session store table.
- Sliding expiration:
  - Idle timeout: 7 days.
  - Absolute timeout: 30 days.
- CSRF protection on mutating endpoints.

### Login/linking rules
1. Google callback returns verified email.
2. If matching user email exists:
   - Link Google identity if not linked yet.
3. If no user exists:
   - Create user with default role `musician`.
4. Email/password login:
   - Requires verified email (or explicit temporary policy).
5. Duplicate identity conflict:
   - Hard-fail and log security event.

### Auth API contract (minimal)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/auth/session`

## 4) Schema Roadmap (Invites, Assets, Sharing/Email, i18n)

### Migration wave order (low risk)
1. **Wave A: auth/session foundation**
   - Add password/email verification/session tables.
2. **Wave B: invitations and membership workflows**
   - `band_invites` table with token, expiry, inviter, status.
3. **Wave C: assets**
   - `gear_items`, `setlists`, `setlist_items`, `io_patches`, `io_patch_channels`.
4. **Wave D: sharing + email**
   - `share_links`, `email_outbox`, `email_deliveries`.
5. **Wave E: i18n**
   - `i18n_locales`, `i18n_messages`, optional tenant/app overrides.

### Per-wave checklist
- forward migration
- backward migration
- seed defaults (if needed)
- smoke query check
- app compatibility check

### Backward compatibility rules
- Additive migrations first (nullable/defaulted columns).
- Dual-read period for changed fields where needed.
- Remove legacy columns only after two stable milestones.

## 5) Phased Epics with Acceptance Criteria and Sequence

### Epic 1: Foundation and Security
**Scope**
- finalize IA + RBAC in code guards
- implement auth/session foundation

**Acceptance**
- unauthorized user cannot access admin config APIs/routes
- `/api/me` still works for current frontend shape
- login/logout flows pass manual smoke checks

### Epic 2: Data Contracts and Filtering
**Scope**
- stabilize `/api/pages/*` payloads
- apply backend-first filtering and archive gates

**Acceptance**
- events schedule fetches only requested timeline scope
- ledger defaults to unpaid without loading archive payload
- query params reflect current filter state

### Epic 3: Reusable UI Platform
**Scope**
- shared filter component + listing shell + form consistency layer

**Acceptance**
- same filter primitives used in Events and Band views
- listing shell handles loading/empty/error consistently
- inputs/buttons match global style contracts

### Epic 4: Core Hubs v2
**Scope**
- Events hub v2
- Event detail v2 with lock rules
- Band hub v2 with role-aware tabs
- Personal ledger drilldown and pay actions

**Acceptance**
- future date planning editable by owner/admin only
- locked dates prevent baseline money edits
- members see only personal ledger details unless band admin

### Epic 5: Admin Controls and Governance
**Scope**
- GOD/delegated admin control plane
- config audit + feature-freeze/priority gates

**Acceptance**
- config changes are audited
- temp pages blocked from production by guard script
- phase gate checklist required before enabling new features

## Discrete implementation sequence (next execution queue)

1. Add docs and code constants for final sidebar/page map.
2. Implement RBAC guard refinements and deny-by-default checks.
3. Introduce auth module with session middleware (without deleting current fallback yet).
4. Add migration wave A (auth/session) and run schema verification.
5. Switch `/api/me` identity source to session.
6. Lock page contracts for `/api/pages/events`, `/api/pages/event/:id`, `/api/pages/band/:id`.
7. Refactor Events page to URL-driven filter state.
8. Adopt shared listing/filter primitives in Band page.
9. Enforce lifecycle lock checks on all money mutation endpoints.
10. Add regression tests for RBAC + lifecycle + auth session flows.

## Definition of Done for each queued step
- backend build passes
- frontend build passes
- manual smoke list executed
- one commit on feature branch
- merge to `release/v0.2.0-2026-03-07`
- annotate milestone tag when a full epic completes

## Final Pass Checklist (UI/UX polish and release prep)
- Redo `Login` page visuals (layout, typography, spacing, visual hierarchy, and mobile fit).
- Recheck avatar/account menu interaction polish (anchor alignment, keyboard accessibility, close behavior).
- Global copy pass for labels and helper text consistency.
- Final responsive pass on form-heavy screens.
- Final visual consistency pass for temporary pages and hide/remove readiness.
