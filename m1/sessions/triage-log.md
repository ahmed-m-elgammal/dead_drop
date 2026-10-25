# M1 Dispute Triage Log (Weeks 2–3)

**Status:** registry open, zero rows · **Sources:** Sheet E of every session transcript in this
directory · **Rules registry:** `../w1-rules-audit.md` §6 (all rules changes land there too).

Rubric (protocol §2.5, binding for M1):

| Class | Meaning | Action |
|---|---|---|
| **(a)** | Rules-text bug — the text is wrong / contradictory / silent where it must speak | Patch `03-rules.md`, bump `ruleset_version` patch level, change note in 03-rules §11 + W1-audit §6 registry |
| **(b)** | Ambiguity — text is right but easy to misread | Clarify wording only (no behavior change); still a patch-level bump if normative text is touched |
| **(c)** | Design smell — rule works as written but feels wrong at the table | **No change.** Log verbatim as an M4 playtest question, tagged `feeling-not-data` |

Hard constraints during M1: **never retune parameters**; table rulings are provisional; disputes are
recorded whoever "wins" the argument; nothing is argued past 3 minutes at the table.

## Registry

| ID | Session / leg | Day / step | What happened | Rules point | Class | Disposition | 03-rules change (→ version) | Status |
|---|---|---|---|---|---|---|---|---|
| **M2-001** | M2 W2 engine work (ADR-002) — not a table dispute | n/a (analysis) | S1's AUD-004 engineered procedure ("Hold **on the pending** drop site", completion fires on the Hold day) is **structurally unreachable**: (1) arriving at a pending site collects it that same day (§2 step 4 checks the post-move position; W2 example confirms arrival-collection), and (2) the in-order rule means no legal route leaves the fugitive standing on a still-pending site at a day start (to be there with the site pending, they must have arrived while the *other* drop was pending, then left to collect it, then returned — collecting on that arrival). The clarified *rule* (position-based check, fires after Hold too) is correct and engine-tested via direct state construction. | §2 step 4 / §3.3 (AUD-004) | **(b)** wording — session TEMPLATE defect, not a rules defect | S1 template's engineering note rewritten to a reachable procedure (template is M1 tooling, not the frozen ruleset); white-box test pins the check; S1's checklist item stays satisfiable | none (rules text unchanged; still `1.0.0-alpha.1`) | **closed (2026-10-25)** |

*(rows below this line are populated only by triage after real sessions)*

## Engineered-state ledger (not disputes — freeze-note evidence)

| Session | State | Exercised? | Evidence (transcript anchor) |
|---|---|---|---|
| S1 | AUD-004 Hold-collects-drop (§2 step 4 / §3.3) | pending | |
| S2 | §9.13 forced Hold at 0 SP (DIS-001 ruling) | pending | |
| S3 | free play — no engineered state | n/a | |

## Parking lot (scope creep — reviewed at M1 close; nothing enters the ruleset)

Per `../M1-execution-plan.md` §4: one line + who proposed it + date. Kept here so the freeze note
can show it was reviewed and left empty or deferred.

*(empty)*
