# 13 — Open Questions Requiring Human Decisions

These are decisions that should **not** be settled by the documentation alone — they need data, taste, or business judgment. Each lists options, the recommendation, and *when* the decision must be made. Nothing here blocks M1–M2 start unless noted.

| ID | Question | Options | Recommendation | Decide by |
|---|---|---|---|---|
| Q1 | **Does EXPIRY favor the right role?** (D8: Investigator wins Day-8 expiry) | (a) keep I-wins · (b) Fugitive-wins-ties · (c) tie-break by drops collected | Keep (a) for the sim; flip only if S1/S7 shows Investigators win passively at scale | M2 exit |
| Q2 | **Reveal schedule values** (days 3/6 district, day 4 transit) | (a) current · (b) denser {2,5,7}+{4} · (c) sparser {3,6} only | Run S2; pick by capture-day distribution + role band, not intuition | M2 exit |
| Q3 | **Disclosed IP handicaps in ranked?** (research-phase idea, deferred) | (a) never · (b) casual-only · (c) ranked with visible pre-case disclosure | (b) first if the skill floor bites; ranked stays pure until role win-rates are stable | M6 |
| Q4 | **Is the ±2 probes/day cap doing anything?** | Keep / remove / make it the stakeout instead | Instrument it; if never binding, simplify the rules text | M2 exit |
| Q5 | **Fugitive "no movement" transit reveal on Hold** — feature or trap? | (a) keep (current) · (b) Hold is silent on transit days | Keep (a): it makes Holds a real gamble; but confirm in playtest that Fugitives *understand* the risk | M4 |
| Q6 | **Tutorial depth** — teach both roles, or Investigator-first with Fugitive unlocked later? | (a) both up-front · (b) Investigator-first, Fugitive after case 3 | (b): the Investigator loop teaches the map; Fugitive fantasy lands better once stakes are understood | M3 start |
| Q7 | **Name & theme.** "Dead Drop" is a working title; districts (Harbor/Old Town/Market/Rail Yard) are placeholders. | Keep heist-noir · pivot spy/cold-war · cyber | Keep heist-noir for MVP; rename decision is cosmetic and cheap until store listing | M6 (store) |
| Q8 | **Rating system** — Glicko-2 vs Elo | (a) Glicko-2 (recommended) · (b) Elo K=32 | (a): handles inactivity and low-game-counts honestly, which async will produce | M6 start |
| Q9 | **Analytics vendor** (MVP needs product analytics; privacy posture constrains choices) | (a) self-hosted (Plausible/Umami) · (b) privacy-first SaaS · (c) none, local logs only | (b) with opt-out; (a) only if ops appetite allows | M3 start |
| Q10 | **Cross-device skill sync** post-accounts (D15 keeps the model on-device) | (a) never · (b) explicit opt-in sync | (b), opt-in, because reinstall otherwise wipes a player's sense of progress | M5 |
| Q11 | **Case ladder size at M3** (24 assumed) | 12 / 24 / 48 | 24: enough for archetype variety; 48 doubles generator QA for little gain | M3 start |
| Q12 | **What happens to a casual case when a player uninstalls?** | (a) deadlines continue → forfeit · (b) auto-void after 7 days of silence | (b) for casual only (friendlier); ranked keeps (a) | M5 |

**Explicitly parked (not open, decided):** client authority (never), PvP adaptation (never), purchasable info (never), auto-heatmap outside solo (never) — see 11-decisions D7/D11/D12.
