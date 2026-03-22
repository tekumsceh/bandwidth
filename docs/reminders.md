# Reminders

## Next product work (roadmap)

See **`docs/roadmap-next.md`** for the current backlog: date interactions & creation, finance rework, gear page, setlists (lyrics + song names in DB), I/O → tech rider (PDF, send to people, hospitality rider). Dashboard & I/O baseline are largely done; iterate from there.

**Setlists:** manager scaffold is at **`/assets/setlists`** (dashboard toolbar **Setlist** icon). Implementation plan: **`docs/setlist-strategy.md`**.

---

## Browser DevTools console noise (not the app)

If you see **`Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received`**, that almost always comes from a **Chrome extension** (async `chrome.runtime` messaging), **not** from this codebase. To confirm: **Incognito** with extensions disabled, or a clean profile. You can’t fix it in app code—disable/update the offending extension or filter the console.

## Rider creator (I/O patch & assets)

The **I/O patch** (and related gear / setlist flows) are essentially a **rider builder**: engineers use them to define inputs, outputs, and channel assignments that mirror a live console / tour book. Mention this in product copy and UX when it helps users understand the mental model.

**TODO (later):** Lean into “rider” language where appropriate (onboarding, empty states, docs); consider a dedicated rider export or snapshot if the product direction supports it.

## I/O patch mic / stand lists

**TODO (revisit):** Whether to move microphone and stand option lists out of `ioPatchConstants.ts` into JSON and/or DB with caching. Currently kept as code constants; revisit if you need admin edits without deploy or per-tenant lists.

## Phone layout and behaviour

**TODO:** Revisit and refine the I/O patch page phone layout and behaviour. The current responsive implementation (patch table accordion, 4-channel portrait ranges, sidebar handle) is a first pass—adjust to match the intended mobile UX:

- Verify patch table accordion flow (below strips, same width, collapse/expand, fullscreen behaviour).
- Verify 4-channel portrait ranges and strip layout on narrow viewports.
- Verify sidebar accordion (hidden by default, 25px handle, slide-in).
- Test on real devices; tune breakpoints and touch targets as needed.

## Database structure review

High-level schema notes (redundancy, simplification ideas, what *not* to normalize): **`docs/db-assessment.md`**.
