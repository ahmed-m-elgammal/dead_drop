# S1 — Session Transcript (template)

> **Copy this file to `s1-transcript.md` when Session S1 actually happens. Do not fill any data
> cell before that.** Source: `m1/playtest-protocol.md` §1–2. Ruleset `1.0.0-alpha.1`, map_alpha v1.0.0.

- **Session:** S1 · **Partner:** B · **Date:** ____________ · **Facilitator:** Player A
- **Cases:** P1 ×2 (roles swapped between legs)
- **Deliberately exercised:** **AUD-004** — the Fugitive **Holds on the pending drop site** at
  least once across the session (Hold-collects-drop is legal per §2 step 4 / §3.3, position-based).
- **Clocks:** 2 min per Fugitive action / per Investigator phase, timed by the opponent; expiry =
  auto-Hold (if affordable, else §9.13) / auto-wait — log every expiry in Notes (no forfeit bookkeeping on paper).

## Pre-session checklist

- [ ] Kit printed (map, Card A, Card B, Sheets C/D/E/F per leg) — `m1/kit/README.md`
- [ ] Public config read aloud; Fugitive takes hidden Sheet D
- [ ] **Par data stays quarantined** (facilitator-only): P1 min completion **6 days**, cheapest drop-2 route **5 SP**
- [ ] Fugitive (Player A in the leg where A plays F) has a written plan to trigger the AUD-004 Hold-collect

## Engineering note — how to guarantee AUD-004 occurs (facilitator, leg where A plays Fugitive)

Arrive at the pending drop site with a *spare* day and ≥1 SP with `holds_used < 2`, then **Hold**
on the site instead of moving off. Verify at that day's resolution:

1. §2 step 4 fires the public event `Drop N completed at site X (day d)` **even though no Move happened**;
2. SP decreases by exactly 1 (Hold cost, §3.3);
3. if that day is Day 4, the transit reveal reports **"no movement"** (§9.7) — note the information price paid;
4. the Fugitive does **not** get told about any stakeout that silently missed that day (§5.2).

If the Hold-collect did **not** happen in either leg (both raced through), record it as a *missed
engineering* — the session still counts, but the S1 purpose is unmet and must be re-run.

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
