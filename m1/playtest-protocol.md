# M1 Paper-Playtest Protocol (Weeks 2–3)

**Status:** ready · **Closes:** 14-readiness blocker B2 ("ruleset is paper-only") · **Feeds:** ruleset freeze (`1.0.0-alpha` → final alpha tag), M2 engine test fixtures.

**Purpose.** Exercise the full ruleset with humans on paper: complete the acceptance line "both roles completed ≥3 cases each on paper", capture every rules dispute (DIS-nn), and deliberately trigger the two audited-but-unplayed states (§9.13 stranding; Hold-collects-drop). M1 collects observations; it does **not** tune parameters — balance is an M2/M4 output.

## 1. Personnel & sessions

- **Player A** = the designer/developer. **Partners B and C** = two different people, no rules homework required beyond the reference cards.
- 3 sessions × ~2.5 h. Each case is played twice (roles swapped) so each session yields one full case per role per partner.

| Session | Partner | Cases (each played twice, roles swapped) | Deliberately exercised |
|---|---|---|---|
| S1 | B | **P1** ×2 | AUD-004: Fugitive Holds on the pending drop site at least once |
| S2 | B | **P2** ×2 | §9.13: Fugitive engineers SP = 0 before Day 8 (forced Hold) |
| S3 | C | **P3** ×2 | Free play (no engineered state) + 1 repeat of any prior case if time |

Tally after S3: A has played 3 cases as Investigator and 3 as Fugitive, against 2 different partners ✓ (B and C each play 2–3 cases; any shortfall against partners does not affect the M1 acceptance line, which counts Player A's cases — record the tally in the freeze note regardless).

## 2. Table procedure (per case, ~60–90 min)

1. **Setup (5 min):** read the public case config aloud; both players take Card A / Card B; fill Sheet C header; Fugitive takes hidden Sheet D.
2. **Decision clocks (paper stand-in for async):** 2 minutes per Fugitive action, 2 minutes per Investigator phase, timed by the opponent. Expiry = auto-Hold (Fugitive, if affordable, else §9.13) / auto-wait (Investigator); log it — it previews the async deadline behavior (§7) without forfeit bookkeeping.
3. **Disputes:** any rules argument → Sheet E row; table plays the provisional ruling; never argue past 3 minutes.
4. **Immediately after:** both fill Sheet F (mini-survey); facilitator transcribes case sheets, route sheets, and dispute rows into `m1/sessions/s{n}-case.md` (one file per session).
5. **Triage (30 min, after each session):** classify each DIS row: **(a)** rules-text bug → patch 03-rules.md, bump `ruleset_version` patch level, note in audit §6 registry; **(b)** ambiguity (text is right, reading was easy to miss) → clarify wording only; **(c)** design smell (rule works as written, feels wrong) → no change; log for M4 playtest questions. Never retune parameters during M1.

## 3. The cases (config only — facilitator keeps par data to themselves)

All three were drawn from the 113/960 ordered configurations that pass the feasibility band, then filtered through the generator constraints (m1/w1-rules-audit §3); `ruleset 1.0.0-alpha.1`, `map_alpha v1.0.0`, SP 12 / IP 10 / reveals D3·D6 district, D4 transit throughout.

| Case | Safehouse | Drop 1 | Drop 2 | Gate | Flavor |
|---|---|---|---|---|---|
| **P1** | D2-07 (Old Town) | **D2-06** | **D1-10** | D1-08 (Harbor) | Drop 1 *is* the Old Town metro hub — a public landmark everyone knows; Harbor exit race |
| **P2** | D3-06 (Market hub) | **D3-05** | **D4-03** | D4-02 (Rail Yard) | Start on a hub, finish in Rail Yard — shortest named exit; the Investigator starts with a strong prior |
| **P3** | D3-06 (Market hub) | **D2-06** | **D1-10** | D1-08 (Harbor) | Same objective geometry as P1 from the *other* start — a built-in A/B on start-position pressure |

**Facilitator-only verification data** (do not read aloud): P1 min completion 6 days (cheapest drop-2 route 5 SP) · P2 min 6 days (6 SP) · P3 min 6 days (7 SP) · canonical example case (03-rules §10) min 7 days (6 SP). These constants become L1 regression fixtures in M2 (09-testing §1); also note the min-day routes are deliberately **not** written down anywhere player-visible — if a session "solves" a case faster than par, that is a finding, not a cheat.

**Warm-up option:** before S1, both players may replay the canonical case from 03-rules §10 W1/W2 against each other, with the worked examples as scripts, purely to internalize mechanics; warm-up cases don't count toward the tally.

## 4. Acceptance mapping (into the M1 exit gate)

| M1 acceptance criterion (10-roadmap) | Evidence produced |
|---|---|
| Every §9 edge case has a ruling | w1-rules-audit §1 (+ §9.13 added); session dispute logs confirm table usability |
| No "TBD" left in 03-rules.md | grep re-run at freeze (currently clean) |
| Both roles ≥3 cases on paper | session files in `m1/sessions/` + tally table in the freeze note |
| Ruleset frozen | `1.0.0-alpha` final tag after S3 triage with zero open disputes |

**Explicitly out of scope for these weeks:** win-rate feelings ("Investigator seems strong"), parameter hunches, map edits. They go verbatim into the M4 question list, tagged `feeling-not-data`, and are ignored for tuning until M2 simulates and M4 measures.
