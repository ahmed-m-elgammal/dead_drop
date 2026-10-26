# ADR-011 — M3 W4.7: reference-board layout pass (left case-brief panel)

**Status:** Accepted · **Date:** 2026-10-26 · **Scope:** presentation-only

## Context

The player supplied a concrete reference image: a dark tactical investigation
interface — left column (branding, primary objective, phase steps, grouped
legend, compass), center parchment map, right column (case status, actions,
selected node, end-phase control, markers, evidence log). Directive: refine
the existing UI toward that target; explicitly **not** a redesign; keep
gameplay, state, map data, and interactions intact.

The W4.6 case-wall map already delivered the reference's *center* (cork +
paper street map + red strings). The audit against the reference found:

- **[G1]** No left information panel — branding, objective, phase, grouped
  legend and compass did not exist; the only legend was a floating strip
  pinned over the map.
- **[G2]** That strip crowds the paper plate and was occluded by the Next.js
  dev-tools button on the desktop dev surface.
- **[G3]** END PHASE lacked the reference's "advance" affordance (arrow,
  label/button split) and wrapped to two lines once padded.
- **[G4]** The fugitive seat had no equivalent panel, so the reference
  coherence was investigator-only.

## Decision

D1. **New `CaseBriefPanel.tsx` (~230 lines, presentation-only, zero deps):**
the left column, role-scoped via a `role` prop. Renders (a) bureau seal +
DEAD DROP + CASE № (same seed formula as CaseHeader), (b) PRIMARY OBJECTIVE
(investigator: "Corner the courier" / fugitive: "Serve the drops" — both
ruleset-true), (c) DAILY LOOP — the engine's real §1.3 Phase enum mapped to
its three observable steps (your actions / the courier moves / reveals land),
active step derived from `view.phase`, day counter live, (d) grouped LEGEND
(nodes / routes with exact `EDGE_STYLE` swatches and SP costs / string
markers) whose glyph set is role-scoped (fugitive sees "you — courier";
investigator sees probe-hit and stakeout-armed rings), (e) footer compass +
**real map stats counted from the validated map** (48 nodes · 84 routes ·
4 districts · "schematic — not to scale"). No fake data anywhere; no state;
status stays single-sourced in CaseHeader.

D2. **page.tsx:** panel mounted in BOTH seats (`hidden lg:flex w-[212px]`)
before the map. Mobile keeps the exact prior behavior (map primary, no left
column) — nothing restructured.

D3. **MapCanvas:** the pinned legend strip becomes `lg:hidden` — one legend
per viewport (desktop reads the left panel, mobile keeps the strip). Every
other map byte untouched (viewBox, zoom/pan, hit clamps, strings, reveals).

D4. **ActionBar:** END PHASE becomes label + `MoveRight` arrow
(`justify-between`); label span carries `text-[15px]` so the unlayered
`.btn-pixel-ghost` font-size conflict is avoided and the button stays on one
line through Day 8 ("ADVANCE TO DAY 8" worst case).

D5. **No new assets:** the seal, compass, and legend glyphs are inline SVG
matching the existing glyph language (CaseHeader badge convention). No AI
generation needed — nothing here wanted a bitmap, and the map must stay
vector/interactive.

## Verification

- Repo: `tsc --noEmit` clean; full `eslint src` clean; `next build` green;
  `npm run typecheck` (engine + sim) clean; **vitest 150/150** (engine
  byte-identical, W3 parity gate green).
- Live (agent-browser): intro → Bureau → investigator case №87709 → briefing
  → board render with left panel (objective, loop step 1 lit, grouped legend)
  → select D1-05 (red strings + pushpin) → Probe D1-05 (MISS toast, IP 10→9,
  probes 1/2, PRIVATE slip, markers header shows target) → END PHASE →
  DAY 2 slam, loop panel flips to day 2/8 and back to step 1, END PHASE now
  "ADVANCE TO DAY 3" on one line → fugitive case №93608 ("Serve the drops",
  "you — courier" legend row, step 2 lit) → commit D3-06→D3-07 metro (SP
  12→11, route ribbon, leak calendar advances, DAY 2 slam) → **zero page
  errors**.
- Viewports: 1440×900 (panel + map + column), 1024×768 (panel intact, legend
  scrolls), 390×844 both seats (panel hidden, mobile legend strip visible,
  stacking unchanged). Screenshots in `download/w47-*.png`.
- Found + fixed during verification: END PHASE wrapped to two lines at the
  350px column after adding tracking + arrow; resolved by dropping tracking
  and moving the size to the label span (D4).

## Consequences

- The three-column case screen now matches the reference's information
  architecture: identity/objective/legend left, map center, play right.
- The §1.3 phase structure is now *visible* to players (the daily loop), which
  the reference board emphasized and the rules doc always implied.
- Legend duplication is impossible per viewport (strip vs panel are
  breakpoint-exclusive).
- Store/engine/AI untouched; ruleset remains 1.0.0-alpha.1.
