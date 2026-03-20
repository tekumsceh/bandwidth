# Database structure — assessment (Bandwidth)

Scope: tables defined in `backend/src/services/schemaService.ts` (v2 migrations) plus domain tables described in `docs/pages-and-db-inventory.md`. **Core tables** (`users`, `bands`, `band_members`, `dates`, `payments`, …) are assumed to exist from earlier schema; they are not fully defined in-repo, so this is a **logical** review, not a full `SHOW CREATE TABLE` audit.

---

## Overall

- **InnoDB + FKs + sensible indexes** on hot paths (`user_sessions`, `io_patch_saves`, `date_io_patch_bindings`) — appropriate for MySQL.
- **No obvious “wrong” types** for money: ledger uses decimals where used in assets; finance domain should stay out of `FLOAT`.
- **Main tension**: **two parallel models for “patch”** (see below) — product/technical debt, not a single wrong choice.

---

## What’s in good shape

| Area | Why |
|------|-----|
| **Sessions** | Narrow table, indexed by `session_id`, `user_id`, `expires_at` — standard. |
| **Token tables** | Separate reset vs email-verify — clear lifecycle; hashed tokens, expiry. |
| **Interventions** | `date_id` + `band_id` — `band_id` is redundant if `dates.band_id` is always authoritative, but it speeds filters and keeps FK to `bands` without joining `dates` every time. |
| **Finance audit** | Append-only log with `details_json` — good for compliance/debug without bloating `payments` rows. |
| **I/O patch saves** | Single `LONGTEXT` JSON blob per save — **normal** for a document-style editor; avoids 32×N normalized tables unless you need SQL-level queries inside patch data. |
| **Date ↔ I/O binding** | `date_io_patch_bindings` PK on `date_id` — one binding per gig; correct. |

---

## Redundancy / overlap (candidates to simplify *later*)

1. **`asset_profiles.module_key = 'patch'` vs `io_patch_saves`**  
   - **Gear/setlists** use profiles + items + `date_asset_snapshots`.  
   - **I/O patch** is implemented as **`io_patch_saves.data_json`** (+ defaults/bindings).  
   - The **`patch` value in asset_profiles / snapshots** is a **second, parallel** “patch” concept (profile/items invoke path).  
   - **Assessment**: Not wrong, but **confusing**. Long-term: either align (e.g. optional link from `io_patch_saves` into asset flow) or drop `patch` from asset_profiles if unused in prod.

2. **`asset_profile_links` vs `asset_profiles.is_default`**  
   - Defaults can be expressed in multiple ways; ensure product rules are clear (per-user link vs band default profile).

3. **`page_listing_config` + `page_filter_config`**  
   - Two tables for admin UI. Could be merged into one **`page_config`** with JSON for filters — **fewer joins**, **less relational purity**. Only worth it if admin rarely queries filters independently.

4. **`password_reset_tokens` vs `email_verification_tokens`**  
   - Structurally similar — could be one **`user_one_time_tokens`** with `purpose` ENUM. **Saves a table**, **costs a careful migration**. Low priority.

5. **`date_io_patch_bindings.band_id`**  
   - Denormalized vs `dates.band_id`. **Keeps FK to `bands` and queries** without joining `dates`; acceptable. Triggers or app rules should keep it in sync with `dates.band_id` if a date could ever move bands (unlikely).

6. **`date_asset_snapshots`**  
   - Denormalized rows per line item — **wide** for big profiles, but **correct** for “frozen copy per gig”. Compression here means **fewer snapshot rows** (e.g. one JSON blob per date+module), not “smaller” without losing clarity — trade **queryability** vs **storage**.

---

## “Compress / remove” — realistic options

| Idea | Benefit | Risk / cost |
|------|---------|-------------|
| **Archive old audit rows** (`config_audit_log`, `finance_audit_log`) to cold storage or partition by month | Smaller working set | App changes for reads; legal retention rules |
| **Purge expired sessions/tokens** (scheduled job) | Smaller `user_sessions` / token tables | None if past `expires_at` |
| **Single JSON column** for page admin config | One row per page | Harder to validate/filter in SQL |
| **Merge token tables** | One maintenance path | Migration + testing |
| **Drop unused `patch` asset profile paths** | Less confusion | Product decision + migration |

**Not recommended without strong reason:** normalizing `io_patch_saves.data_json` into dozens of tables — high cost, little gain unless you need reporting on mic models across all bands in SQL.

---

## Index / integrity notes

- **`io_patch_saves`**: `(band_id, is_default)` — supports “get default” quickly; good.
- **`date_asset_snapshots`**: `(date_id, module_key)` — good for “all gear for this gig”.
- **`intervention_requests`**: multiple single-column keys; if you always filter `WHERE status = 'pending'`, a **composite** `(status, created_at)` might help — **measure** first.

---

## Bottom line

- The schema is **reasonable for a small/medium app**: clear separation of auth, admin config, finance audit, and assets.  
- **Biggest simplification lever** is **conceptual**: resolve **duplicate “patch” stories** (asset profile `patch` vs `io_patch_saves`).  
- **Biggest operational win** is usually **retention jobs** (sessions, tokens, old audits), not redesigning core tables.

When the core `dates` / `payments` DDL is available in-repo, a second pass can review **column-level** normalization and missing composite indexes on real query logs.
