# Reminders

## Rider creator (I/O patch & assets)

The **I/O patch** (and related gear / setlist flows) are essentially a **rider builder**: engineers use them to define inputs, outputs, and channel assignments that mirror a live console / tour book. Mention this in product copy and UX when it helps users understand the mental model.

**TODO (later):** Lean into “rider” language where appropriate (onboarding, empty states, docs); consider a dedicated rider export or snapshot if the product direction supports it.

## Phone layout and behaviour

**TODO:** Revisit and refine the I/O patch page phone layout and behaviour. The current responsive implementation (patch table accordion, 4-channel portrait ranges, sidebar handle) is a first pass—adjust to match the intended mobile UX:

- Verify patch table accordion flow (below strips, same width, collapse/expand, fullscreen behaviour).
- Verify 4-channel portrait ranges and strip layout on narrow viewports.
- Verify sidebar accordion (hidden by default, 25px handle, slide-in).
- Test on real devices; tune breakpoints and touch targets as needed.

## Database structure review

When you plan schema work, start from **`backend/src/services/schemaService.ts`** (and migrations / SQL alongside it). There is no separate `db-assessment` doc in-repo right now—add notes here or a new doc if you want a written review.
