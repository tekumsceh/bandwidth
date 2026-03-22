# Bandwidth refactor — action plan

Work in order; check off each segment before moving on.

## Segment 1 — Frontend dependency cleanup ✅ DONE
- Remove unused packages: `react-datepicker`, `react-day-picker`, `date-fns`.
- Remove orphan `react-datepicker` CSS import from `main.tsx`.
- Run `npm install` in `frontend` and confirm `npm run build`.

## Segment 2 — Shared error + fetch helpers ✅ DONE
- Add `src/utils/toErrorMessage.ts` (or `errors.ts`).
- Add `src/utils/apiJson.ts` — thin wrapper: `fetch` + `res.json()` with consistent error handling.
- Migrate `App.tsx`, `Dashboard.tsx`, `useEventsPageData.ts` (and one more page if easy).

## Segment 3 — Money / display helper ✅ DONE (deferred)
- Ledger UI removed; revisit when finance returns.

## Segment 4 — CSS modularization (incremental) ✅ DONE
- First slice: `frontend/src/styles/io-patch/` (`_workspace.css`, `_hub-bridge.css`, `index.css`); `IOPatchPage.css` imports the barrel; hub/dashboard bridge rules moved out of `App.css`.
- No visual redesign — move-only.

## Segment 5 — I/O patch UI code split ✅ DONE
- `io-patch/controls/` — one file per control family (`ChannelNum`, `LrToggle`, `LinkButton`, `MicSelector`, etc.); `controls/index.ts` barrel.
- `io-patch/StripFrame.tsx` — shared strip shell; `IOPatchPage` uses it for input/output channel columns.
- `IoPatchStripControls.tsx` re-exports `./controls` for any legacy imports.

## Segment 6 — Backend `dates.ts` decomposition ✅ DONE
- `routes/dates/index.ts` wires the router; `scheduleList.ts` (GET `/`), `financeStubs.ts` (501s + empty GET `/id/finance`), `crud.ts` (create/quick/update/detail/members).
- No behavior change; monolithic `routes/dates.ts` removed.

## Segment 7 — Repo hygiene ✅ DONE
- `.gitignore` tightened: `node_modules/`, `dist/`, `.env` / `**/.env`, `backend/uploads/`, `*.log`, `.DS_Store`, `Thumbs.db`.
- Removed ~1.8k accidentally tracked `backend/node_modules` paths from the index (`git rm -r --cached`); files stay on disk, ignored going forward.

## Segment 8 — Tests / docs smoke baseline
- Either restore one minimal API test or add `docs/DEV.md` (run backend, frontend, env vars).
- Optional: restore high-value deleted doc from git history if still relevant.

---

**Current segment:** _Segment 8 — Tests / docs smoke baseline_
