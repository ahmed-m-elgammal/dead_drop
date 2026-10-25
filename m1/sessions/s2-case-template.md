# S2 — Session Transcript (template)

> **Copy this file to `s2-transcript.md` when Session S2 actually happens. Do not fill any data
> cell before that.** Source: `m1/playtest-protocol.md` §1–2. Ruleset `1.0.0-alpha.1`, map_alpha v1.0.0.

- **Session:** S2 · **Partner:** B · **Date:** ____________ · **Facilitator:** Player A
- **Cases:** P2 ×2 (roles swapped between legs)
- **Deliberately exercised:** **§9.13** — the Fugitive **engineers SP = 0 before Day 8** so a day
  resolves as a *forced Hold at no SP cost* (added by the W1 audit, DIS-001 — pending table confirmation).
- **Clocks:** 2 min per Fugitive action / per Investigator phase, timed by the opponent; expiry =
  auto-Hold (if affordable, else §9.13) / auto-wait — log every expiry in Notes.

## Pre-session checklist

- [ ] Kit printed (map, Card A, Card B, Sheets C/D/E/F per leg) — `m1/kit/README.md`
- [ ] Public config read aloud; Fugitive takes hidden Sheet D
- [ ] **Par data stays quarantined** (facilitator-only): P2 min completion **6 days**, cheapest drop-2 route **6 SP**
- [ ] Fugitive (Player A in the leg where A plays F) has a written SP-burn plan to hit 0 SP before Day 8

## Engineering note — how to guarantee §9.13 occurs (facilitator, leg where A plays Fugitive)

Reach exactly **0 SP before the final day** — e.g., spend on Metro-class detours early (3 SP each),
mirroring worked example W3 but tighter, so that a *mid-case* day starts with 0 SP. Verify at that
day's resolution (§9.13, `1.0.0-alpha.1`):

1. The day resolves as a **forced Hold at no SP cost** — SP stays 0, `holds_used` is **unchanged**;
2. the public log carries a **"Stranded"** entry;
3. if that day were a transit-reveal day it would report "no movement" (conditional — note actual day);
4. **no capture or forfeit penalty** attaches to the stranded state; the case continues normally;
5. the Investigator side: confirm the table treats "Stranded" as public information (it is in the log).

Note for the freeze note: §9.13 says "no Move affordable — min edge cost is 1 everywhere — and no
Hold affordable". At 0 SP *with holds_used < 2*, is Hold affordable? **No — Hold costs 1 SP (§3.3)**,
so the ruling as written fires at 0 SP regardless of Hold budget. If the table argues otherwise,
that is a dispute row (the W1 audit reading: 0 SP ⇒ nothing affordable ⇒ §9.13). Record it verbatim.

If 0 SP was **not** reached in either leg (SP overspent the other way), record as *missed engineering*
— the session still counts, but the S2 purpose is unmet and must be re-run.

---

## Leg 1 — Case P2 (public config — Sheet C, read aloud)

```
CASE CONFIG (all public)                     ruleset 1.0.0-alpha.1
map: map_alpha v1.0.0        case id / seed: S2-L1 ____________
safehouse: D3-06 (Market hub)  gate: D4-02 (Rail Yard)
drop 1: D3-05                 drop 2: D4-03
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
| 1 | D3-06 → | | | 12 | | |
| 2–8 | | | | | | *(fill all rows)* |

### §9.13 verification (this leg)

- [ ] 0 SP reached before Day 8: day ____ · forced Hold fired: Y/N · SP stayed 0: Y/N · `holds_used` unchanged: Y/N · "Stranded" in log: Y/N · penalty attached: Y/N (expected N)
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

## Leg 2 — Case P2 (roles swapped)

```
CASE CONFIG (all public)                     ruleset 1.0.0-alpha.1
map: map_alpha v1.0.0        case id / seed: S2-L2 ____________
safehouse: D3-06 (Market hub)  gate: D4-02 (Rail Yard)
drop 1: D3-05                 drop 2: D4-03
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
| 1 | D3-06 → | | | 12 | | |
| 2–8 | | | | | | *(fill all rows)* |

### §9.13 verification (this leg)

- [ ] 0 SP reached before Day 8: day ____ · forced Hold fired: Y/N · SP stayed 0: Y/N · `holds_used` unchanged: Y/N · "Stranded" in log: Y/N · penalty attached: Y/N (expected N)
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
- **Engineered state S2 (§9.13):** exercised in Leg ____ / not exercised (re-run required)
- **Triage done:** [ ] every Sheet E row copied to `triage-log.md` with class (a)/(b)/(c)
- **Faster-than-par check:** any leg quicker than quarantined par is a *finding*, recorded here: ____________
- **Parking-lot entries** (one line each, who proposed, date — none enter the ruleset): ____________
