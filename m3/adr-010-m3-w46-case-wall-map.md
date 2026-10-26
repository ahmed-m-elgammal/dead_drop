# ADR-010: M3 W4.6 — case-wall map pass (cork board + paper map + red strings)

- **Status**: Accepted (2026-10-26)
- **Scope**: presentation-only. Engine, store, AI, session schema, map geometry
  data (node positions, edges, districts, glyph language, label resolver,
  hit-radius clamp) byte-untouched. Ruleset stays `1.0.0-alpha.1`; 150/150
  tests green including the W3 parity gate.

## Context

The player supplied a reference image (classic detective cork board: paper
city map pinned center, red pins + red string connections, taped photos,
stamped notes) with one line of direction: *"see the style of this board i
need to make it like this so Make the map easier to read."*

This sits inside the standing W4.5 framing — improve, don't replace. The map
is the game's most-touched surface and was the last major surface still
rendering as a dark night-city plate (navy `#0e1524`, pale glyphs), visually
disjoint from the cork/paper evidence surfaces the rest of the app already
uses (Sidebar evidence board, LadderScreen wall, `.cork`/`.paper-card`
primitives from W4).

## Decision

**D1 — The map becomes the case wall's pinned paper map (not a new screen).**
`MapCanvas` keeps its viewBox, zoom/pan, hit-target, halo/ring/pin layers and
every interaction. Only the paint changes:

- Board surface: `.cork-board` (warm cork + dark wood frame + inset shadow)
  replaces `pixel-frame` + the night vignette overlay.
- Paper plate: an SVG `<rect>` filled with a `<pattern>` tiling the new
  procedural `map-paper.png` (cream base + faint printed street grid — same
  wrap-aware recipe as W4's textures, `scripts/m3_map_paper.py`). The plate
  lives INSIDE the transformed `<g>`: it pans/zooms with the city, cork shows
  around the margins, crisp offset shadow + taped top corners + one pushpin
  bottom-right (the house pixel-shadow language). Graceful degradation: if
  the tile is missing the pattern's base `<rect>` stays flat cream.

**D2 — Ink-on-paper palette.** All text flips to dark ink with a light
paper halo (paint-order stroke) — the inverse of the night map's light-text/
dark-halo, and the single biggest readability win: node labels
`#5a4d38`/`#33291a` (important pools bold ink), district names stamped in the
typewriter face (`var(--font-type)`), legend recolored to match.

**D3 — Edge classes retuned for cream paper (data untouched).**
`EDGE_STYLE`: F thin slate-ink pencil `#5c6478` · T ochre twine `#b0722c`
dashed · M deep-teal ribbon `#2f6a5f`. The W1/W4 casing pass flips from dark
ink to a **cream knock-out** (`#ece2cc`, width+3, 0.85) — the transit-map
trick: paper shows between crossings, so the three classes stay separable
exactly where they overlap. Widths, dashes, render order (M under T under F)
unchanged.

**D4 — Red-string selection (the board's signature, now functional).**
Selecting a node re-renders its adjacent edges as sagging red threads
(quadratic Bézier, sag = clamp(len·0.09, 7, 16), bowing AWAY from the canvas
center so the fan never collapses into the metro spine; two-pass stroke
`#6d1d1d` under `#b23434`) plus red emphasis rings on the neighbor glyphs.
This answers "which moves/actions apply to this pin" at a glance in BOTH
seats (investigator inspect/probe/stakeout targeting; fugitive move
planning). Pure render: derived from the same `edges` list, pointer-events
none, no store/engine surface.

**D5 — Selected node = red pushpin.** The selection ring stays for
affordance continuity; a pushpin head (shadow ellipse, red head, specular
dot) drops onto the glyph. Reveal language: a revealed district gets a
**red-pen double loop** (two slightly rotated ellipses) + amber wash + dark
red stamped name + `revealed · day N` stamp — the detective circled it on
the map. Belief halo / armed ring / YOU / HIT pins / markers re-inked for
paper contrast (darker strokes, paper halos); shapes, glyphs and rules
meaning all unchanged.

**D6 — Asset audit before generating.** The restyle needed exactly ONE new
asset (the street-grid paper tile — procedural, seamless by construction,
2 KB-scale pattern use). Everything else reuses existing files/textures:
`cork.png`, `paper.png` (W4), SVG primitives, the `.string`/pin-note visual
language. No AI-image generation was required for this pass; no stock art;
nothing baked into bitmaps that must stay interactive (map, buttons, labels
all remain live components).

## Verification record (all real, run 2026-10-26)

- `tsc` sandbox app + repo `apps/web`: clean. Sandbox eslint on changed
  files: clean. Repo eslint `src/`: clean. `next build` (repo): green.
- Repo suite: **150/150** (11 files) — engine default path byte-identical,
  W3 parity gate green.
- Live browser (agent-browser, cold launch): **zero console errors**. Walk:
  intro → Bureau → case №61240 briefing → board render → select D1-08 (red
  strings + pushpin + neighbor rings) → Probe D1-07 (MISS toast, IP 10→9,
  probes 1/2) → end phase to DAY 4 (MARKET reveal: red-pen loop + amber
  wash + red stamp) → fugitive case (briefing "POCKET THE MAP", YOU pin,
  strings from own position, Courier panel intact) → mobile 390×844 stacks
  board → panel cleanly, legend wraps. Screenshots in `download/m3w45-*.png`.
- Early HMR-era console errors (`MAX_HIT` TDZ, `CornerPin` not defined) were
  Fast-Refresh artifacts of editing mid-session; a cold browser relaunch
  showed zero errors and the sources pass tsc.

## Consequences

- The map now shares one material language with the rest of the game
  (cork + paper + red thread) while every interactive layer stays vector.
- Selection legibility no longer depends on the ring alone: strings + rings
  + pushpin form three redundant cues.
- Night-city palette remains reachable in git history (commit bc45895) if a
  future mode wants it.
