# Paper-Prototype Kit v2 (ruleset 1.0.0-alpha.1)

M1 deliverable per 10-roadmap M1 task 2. Purpose: play full cases on paper so the rules are exercised by humans before any engine code exists (14-readiness blocker B2). Everything here is a printable design artifact — **not** game code.

## Print Pack v2 — the table kit (UX pass, 2026-10-26)

**Print this directory, not the v1 markdown, at the table.** Same ruleset, same rulings, same dispute/survey instruments — re-typeset as print-ready HTML (browser → Ctrl/Cmd+P, "Background graphics" ON) with three fixes the v1 kit lacked: (1) the seven-step day loop is on a **Day Mat** instead of buried in card prose; (2) each role gets a **duplex private sheet** (card front, working ledger back) instead of loose cards + separate record sheets; (3) the **table information protocol** — who announces what, how the Investigator acts in private, how the stakeout check runs at a 2-player table — is written down instead of improvised.

| File | What it is | Print | Who gets it |
|---|---|---|---|
| `print/0-read-first.html` | 5-minute both-player briefing: the game, the 7-step day, the table etiquette | 1 copy, A4 portrait | table, before the first case |
| `print/1-day-mat.html` | The 7 steps as numbered panels + stakeout script + special situations + verdicts | 1 copy, A4 **landscape** | table center |
| `print/2-investigator-sheet.html` | Duplex: card (actions / evidence / endgame arithmetic) + **belief tracker** (action ledger + per-day candidate set) | 1 per leg, A4 portrait, duplex | Investigator — **PRIVATE** until case end |
| `print/3-fugitive-sheet.html` | Duplex: card (actions / "what they know" / drop discipline) + **route ledger** (SP math, event prompts) | 1 per leg, A4 portrait, duplex | Fugitive — **HIDDEN** until case end |
| `print/4-case-record.html` | Sheet C v2: public config header + 8-day record with pre-printed reveal prompts | 1 per leg, A4 portrait | table (public) |
| `print/5-disputes-survey.html` | Sheets E+F merged: dispute rows (S{n}-nn ids) + standing paper-table notes + both players' survey | 1 per session, A4 portrait | table (public) |
| `print/6-facilitator-run-sheet.html` | Session timeline, print-pack checklist, **quarantined par data**, engineered-state procedures, transcription ≤30-min window, triage classes | 1 per session, A4 portrait, duplex | **facilitator only — off the table** |
| `map_print.html` | The city (`map_alpha` v1.0.0) rendered from the canonical JSON: 48 nodes, 84 edges styled by transit class, 16 drop candidates (squares), 2 gates (black diamonds), 2 safehouses (black triangles) | 1 copy, A4 **landscape**, per table | table center |

**Table information protocol (the v1 gap this closes).** During play the Fugitive sees *nothing* of the Investigator's sheet (probe/stakeout placements and results are hidden until case end, §1.3/§5.2), so the Investigator writes actions on their own sheet and the public Case Record's action column is filled **after** the case (§8.6). The stakeout check at a 2-player table runs as a named question ("did your day end on X?"); a miss therefore leaks one watched node to the Fugitive — an irreducible paper artifact (no referee available), logged once per session on the disputes sheet and carried to M4. Every other channel is rules-exact.

**v1 text source.** `reference-and-logsheets.md` remains the canonical wording of the cards/sheets (v1); the print pack is its re-typeset, table-optimized edition and does not change any number, ruling, or instrument id. When in doubt, diff against the v1 text and 03-rules.md — the rules doc always wins.

## How the map encodes the rules

- **Every edge costs one day** regardless of class; the class is the *stamina* price and the *evidence* texture (Foot 1 SP — stays in-district; Tram 2 SP — the natural "did they cross?" edge; Metro 3 SP — the telegraphed hub spine, §3.2 of 03-rules).
- **Districts** are the four gray plates: Harbor (D1, NW), Old Town (D2, NE), Market (D3, SW), Rail Yard (D4, SE). District reveals (Days 3 & 6) name one of these four.
- **Squares** = the 16 legal drop sites the case generator draws from; **black diamonds** = the 2 gates (escape only after both drops, in order); **black triangles** = the 2 public safehouses (Fugitive start).
- Hub rotation is deliberate: each district's node 06 (the metro hub) faces the table center so the four thick Metro spokes and hub ring read at a glance — "if they used Metro, they are *near the middle or on a spoke*."

## Reaching the audited edge states on purpose

Two rulings added by the Week-1 audit should be *exercised*, not just read (m1/w1-rules-audit §5):

- **§9.13 stranding (DIS-001):** in at least one case, a Fugitive should spend down to exactly 0 SP before Day 8 and take the forced Hold. The route sheet's SP column makes this easy to engineer.
- **AUD-004 (drop check is position-based):** exercise the drop-check triple at least once — arrival-collect (moving onto the pending site collects that same day), no-double-fire (a Hold on the just-collected site fires nothing and costs 1 SP), in-order (standing on drop 2 while drop 1 is pending does nothing). Procedure wording revised per triage-log M2-001: a Hold *on the pending* site collecting it is structurally unreachable — arrival always collects first.

Players should log both in the dispute log whether or not they "feel right" — M1 collects feelings, it does not tune on them (10-roadmap M1 risk note).

## Versioning & reuse (long-term hooks)

- The kit pins `ruleset 1.0.0-alpha.1` and `map_alpha v1.0.0` in its title block; regenerate via `scripts/dd_m1_kit_map.py` whenever the map JSON or ruleset bumps. The map HTML is generated data — never hand-edit it.
- The three verified playtest cases (m1/playtest-protocol.md §3) double as **regression fixtures** for the M2 engine: their computed minimums (P1: 6 days / P2: 6 / P3: 6 / canonical: 7; cheapest drop-2 SP 5/6/7/6) are expected constants in L1 tests (09-testing §1).
- The dispute log format (DIS-nn) and the mini-survey questions are the seeds of the M4 playtest instruments (04-balance-sim §7) — same IDs, same scales, so M1 data stays comparable.
