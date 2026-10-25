# S1 — Session Transcript (template)

> **Copy this file to `s1-transcript.md` when Session S1 actually happens. Do not fill any data
> cell before that.** Source: `m1/playtest-protocol.md` §1–2. Ruleset `1.0.0-alpha.1`, map_alpha v1.0.0.

- **Session:** S1 · **Partner:** B · **Date:** ____________ · **Facilitator:** Player A
- **Cases:** P1 ×2 (roles swapped between legs)
- **Deliberately exercised:** **AUD-004** — the drop-check triple (arrival-collect / no-double-fire on a
  Hold / in-order gating; see the engineering note and triage-log M2-001 for the 2026-10-25 revision)
  at least once across the session (§2 step 4 / §3.3, position-based).
- **Clocks:** 2 min per Fugitive action / per Investigator phase, timed by the opponent; expiry =
  auto-Hold (if affordable, else §9.13) / auto-wait — log every expiry in Notes (no forfeit bookkeeping on paper).

## Pre-session checklist

- [ ] Kit printed (map, Card A, Card B, Sheets C/D/E/F per leg) — `m1/kit/README.md`
- [ ] Public config read aloud; Fugitive takes hidden Sheet D
- [ ] **Par data stays quarantined** (facilitator-only): P1 min completion **6 days**, cheapest drop-2 route **5 SP**
- [ ] Fugitive (Player A in the leg where A plays Fugitive) has a written plan to run the AUD-004 drop-check triple (arrival-collect / no-double-fire / in-order)

## Engineering note — how to exercise AUD-004 (facilitator, leg where A plays Fugitive)

> **Patched 2026-10-25 (M2-001, triage-log):** the original note asked for a Hold *on the pending*
> site with the completion firing on the Hold day — that state is structurally unreachable (arrival
> at a pending site always collects; see M2-001 for the proof). The AUD-004 *rule* — the §2 step-4
> check is purely position-based and action-independent — is unchanged and is what this revised
> procedure exercises. Engine side is pinned by white-box test `l3-resolve-properties`.

Run this three-step check on the drop mechanics (fits naturally inside the P1 route plan):

1. **Arrival-collect.** Move onto the pending drop site (P1: `D2-06` is adjacent to the safehouse
   `D2-07`). Verify the public event `Drop 1 completed at site D2-06 (day d)` fires **that same day**.
2. **No-double-fire.** With a spare day, **Hold** on the just-collected site (`holds_used < 2`, ≥1 SP).
   Verify: **no** second drop event; SP decreases by exactly 1 (§3.3); if it is Day 4, the transit
   reveal reports **"no movement"** (§9.7 — note the information price paid); the Fugitive is **not**
   told about any stakeout that silently missed that day (§5.2).
3. **In-order.** Visit the drop-2 site (`D1-10`) while drop 1 is still pending, at any point in the
   leg. Verify **nothing fires** there until drop 1 has been collected (§2 step 4 in-order clause).

If the arrival-collect did **not** happen in either leg (both raced past `D2-06`), record it as a
*missed engineering* — the session still counts, but the S1 purpose is unmet and must be re-run.

---

## Leg 1 — Case P1 (public config — Sheet C, read aloud)

```
CASE CONFIG (all public)                     ruleset 1.0.0-alpha.1
map: map_alpha v1.0.0        case id / seed: S1-L1 ____________
safehouse: D2-07 (Old Town)  gate: D1-08 (Harbor)
drop 1: D2-06                drop 2: D1-10
SP 12   IP 10   reveals: D3,D6 district · D4 transit
```

- **Player A role:** Fugitive / Investigator (circle)  · **Partner B role:** the other

### Sheet C — public record

| Day | Fugitive action (public events only) | Reveal / drop event | Investigator actions | IP left | Notes (belief, deductions) |
|---|---|---|---|---|---|
| 1 | | | | 10 | |
| 2 | | | | | |
| 3 | | district: | | | |
| 4 | | transit: | | | |
| 5 | | | | | |
| 6 | | district: | | | |
| 7 | | | | | |
| 8 | | verdict: | | | |

### Sheet D — Fugitive route (HIDDEN; transcribe after the leg)

| Day | From → To | Class | SP cost | SP left | Drop collected? | Notes |
|---|---|---|---|---|---|---|
| 1 | D2-07 → | | | 12 | | |
| 2–8 | | | | | | *(fill all rows)* |

### AUD-004 verification (this leg)

- [ ] Hold-collect occurred: day ____ , site ____ · public event fired: Y/N · SP 1 deducted: Y/N · Day-4 "no movement" if applicable: Y/N/NA
- Table reaction (one line):

### Sheet E — disputes this leg

| # | Day / step | What happened | Rules point (cite § if known) | Table ruling (provisional) | Needs patch? (Y/N + one line) |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

### Sheet F — mini-survey (1–5 each, per player)

| Player | Q1 knew what to do | Q2 info felt fair | Q3 a hard decision | Q4 replay/other role | Q5 confusion (free text) |
|---|---|---|---|---|---|
| A | | | | | |
| B | | | | | |

---

## Leg 2 — Case P1 (roles swapped)

```
CASE CONFIG (all public)                     ruleset 1.0.0-alpha.1
map: map_alpha v1.0.0        case id / seed: S1-L2 ____________
safehouse: D2-07 (Old Town)  gate: D1-08 (Harbor)
drop 1: D2-06                drop 2: D1-10
SP 12   IP 10   reveals: D3,D6 district · D4 transit
```

- **Player A role:** Fugitive / Investigator (circle)  · **Partner B role:** the other

### Sheet C — public record

| Day | Fugitive action (public events only) | Reveal / drop event | Investigator actions | IP left | Notes (belief, deductions) |
|---|---|---|---|---|---|
| 1 | | | | 10 | |
| 2 | | | | | |
| 3 | | district: | | | |
| 4 | | transit: | | | |
| 5 | | | | | |
| 6 | | district: | | | |
| 7 | | | | | |
| 8 | | verdict: | | | |

### Sheet D — Fugitive route (HIDDEN; transcribe after the leg)

| Day | From → To | Class | SP cost | SP left | Drop collected? | Notes |
|---|---|---|---|---|---|---|
| 1 | D2-07 → | | | 12 | | |
| 2–8 | | | | | | *(fill all rows)* |

### AUD-004 verification (this leg)

- [ ] Hold-collect occurred: day ____ , site ____ · public event fired: Y/N · SP 1 deducted: Y/N · Day-4 "no movement" if applicable: Y/N/NA
- Table reaction (one line):

### Sheet E — disputes this leg

| # | Day / step | What happened | Rules point (cite § if known) | Table ruling (provisional) | Needs patch? (Y/N + one line) |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

### Sheet F — mini-survey (1–5 each, per player)

| Player | Q1 knew what to do | Q2 info felt fair | Q3 a hard decision | Q4 replay/other role | Q5 confusion (free text) |
|---|---|---|---|---|---|
| A | | | | | |
| B | | | | | |

---

## Session close

- **Tally (Player A):** cases as Investigator: ____ · cases as Fugitive: ____
- **Verdicts:** Leg 1: ____________ · Leg 2: ____________
- **Engineered state S1 (AUD-004):** exercised in Leg ____ / not exercised (re-run required)
- **Triage done:** [ ] every Sheet E row copied to `triage-log.md` with class (a)/(b)/(c)
- **Faster-than-par check:** if any leg "solved" the case quicker than the quarantined par, that is a *finding* (protocol §3), recorded here: ____________
- **Parking-lot entries** (one line each, who proposed, date — none enter the ruleset): ____________
