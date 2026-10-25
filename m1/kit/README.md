# Paper-Prototype Kit v1.0 (ruleset 1.0.0-alpha.1)

M1 deliverable per 10-roadmap M1 task 2. Purpose: play full cases on paper so the rules are exercised by humans before any engine code exists (14-readiness blocker B2). Everything here is a printable design artifact — **not** game code.

## Contents

| File | What it is | Print |
|---|---|---|
| `map_print.html` | The city (`map_alpha` v1.0.0) rendered from the canonical JSON: 48 nodes, 84 edges styled by transit class, 16 drop candidates (squares), 2 gates (black diamonds), 2 safehouses (black triangles) | 1 copy, **A4 landscape**, per table (open in a browser → Ctrl/Cmd+P, "Background graphics" ON, scale 100%) |
| `reference-and-logsheets.md` | Investigator reference card · Fugitive reference card · public case sheet · hidden Fugitive route sheet · dispute log · post-case mini-survey | 1× each card per player; 1× case sheet + route sheet **per case**; 1× dispute log per session; survey per player per case |

Assembly per table: printed map + 3–4 small tokens for the Fugitive's secret position tracking (the route sheet is the real record; a spare token helps), a pencil each, and the two reference cards. **The Fugitive keeps their route sheet hidden at all times** — the Investigator sees only public events and their own probe/stakeout results.

## How the map encodes the rules

- **Every edge costs one day** regardless of class; the class is the *stamina* price and the *evidence* texture (Foot 1 SP — stays in-district; Tram 2 SP — the natural "did they cross?" edge; Metro 3 SP — the telegraphed hub spine, §3.2 of 03-rules).
- **Districts** are the four gray plates: Harbor (D1, NW), Old Town (D2, NE), Market (D3, SW), Rail Yard (D4, SE). District reveals (Days 3 & 6) name one of these four.
- **Squares** = the 16 legal drop sites the case generator draws from; **black diamonds** = the 2 gates (escape only after both drops, in order); **black triangles** = the 2 public safehouses (Fugitive start).
- Hub rotation is deliberate: each district's node 06 (the metro hub) faces the table center so the four thick Metro spokes and hub ring read at a glance — "if they used Metro, they are *near the middle or on a spoke*."

## Reaching the audited edge states on purpose

Two rulings added by the Week-1 audit should be *exercised*, not just read (m1/w1-rules-audit §5):

- **§9.13 stranding (DIS-001):** in at least one case, a Fugitive should spend down to exactly 0 SP before Day 8 and take the forced Hold. The route sheet's SP column makes this easy to engineer.
- **AUD-004 (Hold collects a drop):** at least once, a Fugitive should Hold on the pending drop site to collect it, accepting the "no movement" reveal risk.

Players should log both in the dispute log whether or not they "feel right" — M1 collects feelings, it does not tune on them (10-roadmap M1 risk note).

## Versioning & reuse (long-term hooks)

- The kit pins `ruleset 1.0.0-alpha.1` and `map_alpha v1.0.0` in its title block; regenerate via `scripts/dd_m1_kit_map.py` whenever the map JSON or ruleset bumps. The map HTML is generated data — never hand-edit it.
- The three verified playtest cases (m1/playtest-protocol.md §3) double as **regression fixtures** for the M2 engine: their computed minimums (P1: 6 days / P2: 6 / P3: 6 / canonical: 7; cheapest drop-2 SP 5/6/7/6) are expected constants in L1 tests (09-testing §1).
- The dispute log format (DIS-nn) and the mini-survey questions are the seeds of the M4 playtest instruments (04-balance-sim §7) — same IDs, same scales, so M1 data stays comparable.
