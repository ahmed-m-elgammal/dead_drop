# ADR-012 — M3 W4.8: implement the reference-board investigation map

**Date:** 2026-10-26 · **Status:** ACCEPTED (implemented + verified) · **Supersedes:** the map presentation parts of ADR-010 (W4.6 case-wall plate) — the cork-frame inset plate is replaced by a full-bleed parchment panel; ADR-010's other decisions (label resolver, hit clamp, red strings) carry forward.

## Context

The player escalated: *"Critical Fix: Implement the Actual Game Map UI — the previous implementation did not properly implement the map design shown in the reference. The central investigation map is the highest priority."* A concrete reference mockup was supplied: left info panel · **large central aged-parchment map** · right gameplay panel, with district names at the map's corners, teal solid metro / orange dashed tram / muted steel roads, distinct gate/drop/safehouse/node glyphs, zoom controls top-right.

Live audit (agent-browser, 1440×900, both seats) confirmed the map WAS rendering and interactive, but did not match the reference. Root causes, in order of visual impact:

- **D-cause 1 — portrait plate in a near-square panel.** `geometry.ts` shipped a 760×1000 viewBox (W1 port of the paper prototype). The desktop central panel measures ≈830×876; `preserveAspectRatio` letterboxed the portrait plate to ≈638px wide → ~190px dead margins per side; the map read as a narrow strip, not the reference's large central parchment.
- **D-cause 2 — districts packed.** Quadrant centers 330px apart with R=165 rings → adjacent districts' ring edges nearly touched at the four seams (the symptom W4.5's label resolver fought). The reference spreads districts wide.
- **D-cause 3 — washed-out paper.** The W4.6 tile was ultra-low-contrast cream; the reference shows an aged TAN parchment with visible printed city blocks/streets.
- **D-cause 4 — inverted route hierarchy.** `sortedEdges` drew Foot ON TOP (M→T→F rank); the reference reads transit-first (metro dominant, roads the subtle under-layer).
- **D-cause 5 — hidden breakage.** `ReplayViewer` hardcoded `viewBox="0 0 760 1000"`; any geometry change would desync it.

## Decision

D1 — **Near-square plate that fills the panel.** `VIEW_W=880, VIEW_H=920` (aspect 0.956; measured central panels are ≈0.95–1.0 on 1440/1536/1680 widths; mobile 54vh container also near-square). District quadrant centers spread to (242,232)/(638,232)/(242,688)/(638,688), R=170 → ≥46px clear between adjacent rings at the seams (was ~11px). Ring/rotation semantics (hub 06 faces center) unchanged from W1.

D2 — **Full-bleed parchment inside a dark tactical bezel.** New `.map-frame` CSS (near-black navy frame, steel-blue inner line, deep drop) replaces `cork-board` as the map container; the paper rect now spans the whole viewBox (no inset cork reveal), rounded corners via clipPath, plus a faint 46px survey grid and an age-vignette radial overlay (all non-interactive underlay). Tape + corner-pin chrome removed (reference shows a clean panel). `cork-board` class kept (unused elsewhere today, zero risk).

D3 — **Richer aged-parchment texture.** `scripts/m3_map_paper.py` edited in place (same file, same 256px seamless recipe, seed 20261028): tan base (226,209,176), two-tone city-block washes + building hatching, stronger printed streets/avenues, age stains, slight blur. Contrast stays moderate — SVG layers dominate. Graceful fallback (flat parchment) unchanged.

D4 — **Reference route hierarchy.** `EDGE_STYLE` retuned: F `#5b6a85` w1.6 (muted steel-blue), T `#c0782e` w2.3 dash 8,5 (orange), M `#2e6e63` w4.4 (teal). Render order flipped to **F→T→M** (`sortedEdges` rank + new `EDGE_PASS_ORDER`); MapCanvas renders per-class passes, each with a paper-color casing (width+3) so crossings stay separable. Legend swatches (CaseBriefPanel + mobile strip) now read `EDGE_STYLE` directly — single source (the panel's RouteSwatch previously hardcoded a stale copy).

D5 — **District names pinned to the plate's corners** (reference layout): D1 start@(22,34), D2 end@(VIEW_W−120,34), D3 start@(22,VIEW_H−18), D4 end@(VIEW_W−24,VIEW_H−18). `DistrictLayout` gained `anchor`. Top-right reserves clearance for the zoom controls on BOTH viewports (HTML-px buttons eat ~108 viewBox units on a 390px phone, ~51 on desktop — D2 initially clipped "OLD TOWN" at VIEW_W−68 and under the mobile controls; fixed to −120). Reveal loop still draws around the REGION (x/y/plateR); the "revealed · day N" stamp follows the corner label. ReplayViewer's district labels follow `d.anchor`.

D6 — **ReplayViewer follows the geometry** — viewBox built from `VIEW_W/VIEW_H` imports (its night-city replay style is otherwise untouched).

## NOT done (scope discipline)

- No engine/store/AI/sim changes — node ids, edges, classes, districts, gates, safehouses, drops all render from the validated map as before; only screen placement/paint changed.
- No fake data: the reference's seed/case#s/node positions were NOT copied; "Harbor" keeps the data's spelling (reference spells "HARBOUR").
- No side-panel work beyond what the map legend consistency required (RouteSwatch single-sourcing) — per the brief, panel polishing stays paused until the map is verified.

## Verification record (all run live, 2026-10-26)

- **Live E2E (agent-browser):** investigator case №20737 (seed 106420737) — plate fills the central panel edge-to-edge; districts stamped at corners (crops fix-10-top/bot); select D1-06 → red pushpin + strings + neighbor rings + right-panel node card; Probe D1-06 → probes 1/2, IP 10→9; zoom ×1.35 → labels crisp, strings scale; drag-pan + FIT reset; END PHASE ×3 → DAY 4, **MARKET reveal**: red-pen double loop + amber wash + corner stamp "revealed · day 3" + evidence note with photo; transit reveal logged. Fugitive cases №45826/№43894 — YOU pin at own safehouse (D2-07 / D3-06), role-scoped objective/legend ("Serve the drops", "you — courier"), Courier panel (stamina 12/12, drops, gate, leak calendar) intact; select D1-07 strings to its neighbors. Mobile 390×844 — map + mobile legend strip, corner labels clear after D5 fix. **Zero page errors on final cold renders** (one transient `</svg>` parse error appeared mid-edit during HMR; cold reload + `tsc` + `eslint` clean — artifact of sequential edits, not the shipped file).
- **Repo suite:** `npm run typecheck` clean; `vitest run` **150/150** (11 files) — engine default path byte-identical, W3 web-port parity gate green; `apps/web` `eslint src` exit 0; `next build` green.

## Consequences

- The map is now the reference's large central parchment: fills the panel, districts at corners, transit-first hierarchy, aged paper.
- Geometry constants (`VIEW_W/VIEW_H`) are the single source for both interactive and replay maps; portrait-era hardcoded values are gone from components.
- Route legend/swatches derive from `EDGE_STYLE` — future retunes can't desync panel vs map.
- Seam congestion eliminated structurally (spread centers), so the W4.5 label resolver now resolves trivially (radial anchors almost always win).
