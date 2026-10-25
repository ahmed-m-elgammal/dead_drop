# Reference Cards & Log Sheets (print-cut)

Ruleset **1.0.0-alpha.1**. Numbers: SP 12 · IP 10 · probes ≤2/day (1 IP) · stakeout ≤1/day (3 IP, never on Day 8) · Holds ≤2/case (1 SP) · reveals: district Days 3 & 6, transit Day 4.

---

## CARD A — INVESTIGATOR (public side)

**Your win conditions:** CAPTURE (stakeout hit) · EXPIRY (Day 8 ends, no escape).

**Day resolution order** (you act only in step 6):
1. Fugitive moves (secret) → 2. armed stakeout resolves: position == armed node → **CAPTURE** → 3. reveals fire (Day 3/6 district, Day 4 transit) → 4. drop event if the Fugitive ends on the *pending* drop site → 5. ESCAPE check (both drops + on gate = they win) → 6. **you act** → 7. clock.

**Step 6 menu (IP 10 start, unspent IP carries over):**
| Action | Cost | Cap | Effect |
|---|---|---|---|
| Probe node X | 1 IP | 2/day | "Is the Fugitive's end-of-today position X?" HIT / MISS — information only, never a capture |
| Arm stakeout on node Y | 3 IP | 1/day | Captures iff the Fugitive *ends Day d+1* on Y. **Forbidden on Day 8.** Miss is silent to the Fugitive; consumed either way |
| Wait | 0 | — | Save IP; Day 8 arrives on its own |

**Reading the reveals:** district (Day 3/6) narrows 48 → 12 candidates (exactly 2 bits). Transit (Day 4) names the class of that day's move — "no movement" means the Fugitive Held. A probe HIT is a *historical pin* (they were there **today**); think in predictions: probe answers yesterday's question, stakeout prices tomorrow's.
**Endgame arithmetic:** 1 stakeout = 3 probes of budget. Time pressure reverses the "information-first" rule only when the calendar, not the belief, is your enemy.

---

## CARD B — FUGITIVE (hidden side)

**Your win condition:** ESCAPE — end any day on the gate **after** collecting both drops **in order** (drop 1 before drop 2). Otherwise: survive to the end of Day 8 (verdict EXPIRY — Investigator wins).

**Your day:** exactly one action, in secret, before the Investigator acts.
| Action | Cost | Cap | Notes |
|---|---|---|---|
| Move along one edge | 1 SP (Foot) · 2 SP (Tram) · 3 SP (Metro) | — | One edge per day, any class; no pass-through |
| Hold (stay) | 1 SP | 2 per case | A Hold **collects a drop** if you're on the pending site; but a Day-4 Hold reveals "no movement" publicly |
| (0 SP, nothing affordable) | 0 | — | Forced Hold, no SP cost, logged "Stranded" (§9.13) |

**What they know about you:** your start (safehouse — public), your district at the end of Days 3 & 6, your Day-4 transit class (or "no movement"), every drop completion (site + day), and *nothing else* — not your route, not your SP, not your Holds. Probes and stakeouts are invisible to you during the case.
**Texture of the map:** Foot keeps you inside a district (reveals implicate whole districts). Trams cross district lines at the ring spokes — the natural "did they cross?" edges. Metro is few, fast-to-read, and telegraphed: using it puts you near the hub spine in everyone's mental model.
**The drops are your leash:** the drop events convert your itinerary into public fact. Every detour you buy with slack SP is ambiguity you paid for; every day you linger is a day the calendar works for them.

---

## SHEET C — Public Case Sheet (one per case, table-visible)

```
CASE CONFIG (all public)                     ruleset 1.0.0-alpha.1
map: map_alpha v1.0.0        case id / seed: ______________
safehouse: ______            gate: ______
drop 1: ______               drop 2: ______
SP 12   IP 10   reveals: D3,D6 district · D4 transit
```

| Day | Fugitive action (public events only) | Reveal / drop event | Investigator actions | IP left | Notes (belief, deductions) |
|---|---|---|---|---|---|
| 1 | | | | 10 | |
| 2 | | | | | |
| 3 | | district: | | | |
| 4 | | transit: | | | |
| 5 | | | | | |
| 6 | | district: | | | |
| 7 | | | | | |
| 8 | | | verdict: | | |

*Investigator marks probe/stakeout results in Notes (private context is fine — the sheet records the case, not the belief). Verdicts: ESCAPE / CAPTURE / EXPIRY / FORFEIT_F / FORFEIT_I / VOID.*

## SHEET D — Fugitive Route Sheet (HIDDEN — one per case, Fugitive only)

```
Case id: ________  SP 12  Holds used: 0/2  Drops collected: 0/2
```

| Day | From → To | Class | SP cost | SP left | Drop collected? | Notes (paranoia is legal) |
|---|---|---|---|---|---|---|
| 1 | safehouse → | | | 12 | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |

## SHEET E — Dispute Log (one per session)

Every rules argument gets a row, whoever wins it. Rulings at the table are **provisional**; the rules doc is patched only via the audit workflow.

| # | Day / step | What happened | Rules point (cite § if known) | Table ruling (provisional) | Needs patch? (Y/N + one line) |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## SHEET F — Post-case mini-survey (per player, per case; 1–5 scale)

1. I understood what to do next at all times. …
2. The information I had felt *fair* for the position I was in. …
3. At least one decision today was genuinely hard. …
4. I would play this case again / play the other role. …
5. One thing that confused me (free text): ______________________

*(Same scales as the M4 protocol — 04-balance-sim §7 — so M1 notes stay comparable. Feelings are logged, never tuned on, during M1.)*
