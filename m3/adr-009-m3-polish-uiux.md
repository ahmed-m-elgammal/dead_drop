# ADR-009 — M3 polish sprint: incremental UI/UX pass (readability, hierarchy, evidence art)

Date: 2026-10-26
Status: ACCEPTED
Supersedes: nothing. Extends ADR-008 (NOIR PIXEL) on the same locked art direction.
Trigger: player directive — "improve, don't replace": incremental polish of the existing
game (no redesign), plus generating only the assets the existing game actually needs.

## Context

W4 shipped the noir skin; a live browser audit of both seats surfaced a ranked defect
list. The task was framed as incremental improvement with hard constraints: preserve
gameplay, rules, node IDs, data structures, save compatibility, hidden-information walls;
reuse components/tokens; smallest changes that produce meaningful UX gains.

Audit findings (verified live, agent-browser, zero console errors):
1. **[P1 map]** Node labels collide into unreadable blobs at the four district seams
   ("D1-05D2-06", "D1-02D2-09", "D3-08D4-06", …): adjacent districts' rings pass within
   ~11px at the quadrant joins, and the W1 radial label anchors point straight into the
   seam. Dense dashed tram crossings additionally drowned labels and foot edges.
2. **[P2 sidebar]** The action bar rendered ABOVE the case header, and DAY / IP /
   probes-today / armed-stakeout status appeared in BOTH the action bar strip and the
   case tab. The belief-halo toggle wrapped into a two-line blob.
3. **[P3 evidence]** District reveals — the key public evidence — rendered identically
   to day markers; case-config badges were plain text with no cross-reference to the map
   glyph language (squares / diamonds / triangles).
4. **[P4 setup]** Role stamps ("on duty"/"wanted") overlapped the portrait faces;
   archetype cards ("known associates") were text-only.
5. **[BUG]** Seam nodes' invisible hit areas overlapped (r=16 circles on nodes 11px
   apart): the later-rendered twin swallowed clicks (found while playing — selecting
   D1-05 selected D2-07).

Asset-gap audit: mugshots for the four archetype dossiers (setup screen, text-only),
district surveillance vignettes (evidence reveals + briefing), and NOTHING else —
FORFEIT/VOID verdict art was explicitly rejected (solo mode never surfaces those
verdicts; an unused asset violates the brief), as was any map/title re-skin.

## Decision

**D1 — Incremental, presentation-only.** Engine, store, AI, map data, event schemas,
save format: byte-untouched (`150/150` repo tests incl. the W3 webport parity gate).
No new dependencies. No screen rebuilt; six files edited, one extracted.

**D2 — Map readability (deterministic geometry passes in `geometry.ts`).**
- *Label resolver*: keep the W1 radial anchor as first choice; when its box clashes
  with a placed label or a foreign glyph, try 8 compass offsets around the node
  (deterministic order), else stack vertically. Pure function of map geometry —
  same map in, same placements out.
- *Ink halo* on node + district labels (`paint-order: stroke`) so text reads over lines.
- *Edge casing pass*: an ink underlay (+2.6px) beneath the three color passes; crossings
  separate cleanly. Visual only — edge data/render order unchanged.
- *Hit-radius clamp*: `hitR = min(16, nearestNeighbor/2 − 0.5)` — seam twins no longer
  overlap; targets still scale with zoom.

**D3 — Sidebar information architecture.** The case header is extracted to
`CaseHeader.tsx` and rendered FIRST (status anchor: file tab, DAY N/8, seed, IP, probes
today, armed stakeout, glyph badges, halo toggle, abandon). The action bar keeps only
the turn indicator + controls (its status line is deleted — single-sourcing). Right
column order: CaseHeader → ActionBar → markers → evidence. The belief-halo toggle is a
compact one-line chip.

**D4 — Evidence scanability.** District-reveal notes carry a taped pixel "surveillance
photo" (in both seats' logs, same `eventText → photo` mapping); case-config badges use
the map glyph shapes/colors (▲ safehouse ■ drops ◆ gate); the briefing dossier gains a
second polaroid — the safehouse district, "yesterday".

**D5 — Asset set (8 files, all with concrete integration points).** Generated via the
W4 pipeline (locked STYLE suffix → PIL quantize/chunkify, `m3_polish_*.mjs/.py`):
- 4 archetype mugshots → SetupScreen dossier cards.
- 4 district vignettes (D1 Harbor / D2 Old Town / D3 Market / D4 Rail Yard) →
  evidence-log reveal notes + CaseBriefing polaroid.
Missing images cannot break the app: every `<img>` has an `onError` that removes the
frame and keeps the note/text.

## Consequences

- Map seams are readable at k=1 and k≈2.5 (verified in-browser); seam misclicks fixed.
- Status appears exactly once per screen; the right column reads top-down as
  status → actions → tools → evidence.
- The asset pack grows 9 → 17 files, all in the same locked style; scripts ship with
  the repo (`scripts/m3_polish_gen_assets.mjs`, `m3_polish_pixelate.py`).
- Ruleset remains `1.0.0-alpha.1`; both seats solo-playable exactly as before;
  S1–S3 human-gated paper sessions remain the only M1-closing path.

## Verification record

- Sandbox: `eslint` clean (dd components + lib + app), `tsc --noEmit` clean for app
  code (residual errors are pre-existing sandbox template dirs, not app code),
  `next build` green.
- Repo: `npm run -s typecheck` clean; `vitest run` **150/150** (engine default path
  byte-identical, W3 webport parity gate green); `apps/web` `next build` green
  (includes TS) + `eslint .` clean.
- agent-browser E2E (desktop 1440×900 + mobile 390×844), zero console errors:
  investigator case — seam labels distinct at the four joins; zoom ×2 seam inspection;
  select D1-05 selects D1-05 (hit-clamp verified against its 11px twin D2-07); probe
  D1-01 → private slip + toast + IP 10→9; end phase ×3 → DAY slams → OLD TOWN reveal
  note renders with its surveillance photo + amber plate tint; transit reveal logged.
  Fugitive case — briefing polaroids (subject + district); YOU pin; commit D3-06→D2-06
  (metro 3 SP) → D1-06 (metro 3 SP); CAPTURE verdict by I-GreedyProbe on day 2/3 runs
  (legitimate kill chains; §8.6 disclosure tables correct). FugitiveLog district-reveal
  thumbnails share the verified Sidebar code path; a live reveal entry in FugitiveLog
  was not reached (both fugitive runs were captured before day-3 resolution) — noted
  honestly, no fabrication.
- Mobile 390×844: map → CaseHeader → ActionBar → markers/evidence stack cleanly,
  no overlap, halo chip on one line.
