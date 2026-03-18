# Instrument icon selection (user choice)

The user has chosen their instrument icons via the Testing Ground (`/_lab/testing-ground`). The selection is mixed from:

- **Game Icons + Font Awesome** (GiDrum, GiGuitar, etc.) — localStorage key: `testing-ground-game-icons-selection`
- **Behringer X32** — localStorage key: `testing-ground-behringer-selection`
- **Wedge monitor** — `testing-ground-wedge-selection`
- **IEM body pack** — `testing-ground-iem-selection`
- **Font Awesome**, **Phosphor**, **Material** instrument sets — optional extras

When wiring icons into production (e.g. `instrumentIcons.tsx`, `IOPatchPage` mic/stand/wedge/IEM), use the checked items and labels from these localStorage keys. The "Your chosen instrument set" section at the top of Testing Ground shows the combined selection.
