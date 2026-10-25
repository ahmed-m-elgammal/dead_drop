# M2 / AUD-003 — Generator-Constraint Semantics: Pinned, Counted, Lever-Resolved

**Status:** executed 2026-10-25 (M2 Week 1, first task per `m1/m2-handoff.md` §2 — deliberately
before any generator code exists) · **Script:** `tools/verification/dd_m2_aud003_constraints.py`
(raw outputs: `m2_aud003_results.json`, `m2_aud003_recount_results.json`, selection record:
`m2_aud003_pool24.json`) · **Ruleset impact: none** (generator is methodology, not rules —
03-rules untouched, version stays `1.0.0-alpha.1`).

**What problem this closes.** AUD-003 (M1 W1 audit) found that the generator's three binding
constraints had never been counted together: the "55/480" headroom figure counts constraint C2
only, and under a strict reading of C3 only **7/960** ordered configurations survive the
conjunction C2∧C3∧C4 — against a 24-case ladder need. The handoff ordered three things: pin C3's
exact semantics, count the full conjunction, and pre-plan the authorized lever (drop-candidate
pool 16→24, a content-data change per 04-balance-sim §6). All three are done here, and every
number below carries its counting convention (the AUD-002 lesson).

---

## 1. The pin — C3's exact semantics

04-balance-sim §6.3 reads: *"Require ≥3 distinct minimal-cost first-three-day route prefixes
(anti-scripting: prevents cases solvable by one memorized route)."* Two words were ambiguous:
**minimal-cost** (which currency, and minimal among which routes?) and the **prefix window**
(which three days; positions or moves?).

### 1.1 Definitions (all four candidate readings, precisely)

Shared machinery: a **route** is a legal action sequence; for all efficient readings routes are
moves-only, because deleting a Hold from any route yields a shorter, cheaper route with identical
positions — so a Hold can never appear on a minimal-cost, minimal-day, or Pareto-frontier route.
A **prefix** is the ordered triple of end-of-day positions on days 1–3 (window rationale in §1.3).
A config passes C3 under a reading iff its reading's route set yields **≥3 distinct prefixes**.

| Reading | Route set whose prefixes are counted | Character |
|---|---|---|
| **C3-A `mincost`** | routes completing at globally **minimal SP cost** (≤8 days, ≤12 SP) | doc-literal |
| **C3-B `minday`** | routes completing in **exactly minimal days** (within SP) | W1 audit's strict gloss |
| **C3-C `pareto`** | routes on the **(days, cost) Pareto frontier** (ties broken toward fewer days) | strictest rational-choice set |
| **C3-D `inbudget`** | any **budget-legal completion by day 8** (Holds allowed in the opening) | loose diagnostic, not a gate candidate |

Note the three readings are genuinely different sets, not nested approximations: a slow-but-cheap
min-cost route can be Pareto-dominated (equal cost exists at fewer days), and only the *cheapest*
min-day route sits on the frontier (W1-style enumeration counts all min-day routes).

### 1.2 Pinned reading: **C3-A (minimal SP cost)** — and why

**Decision (design call, M2 W1):** C3 means *≥3 distinct first-three-day end-position prefixes
among globally minimal-SP-cost completing routes*.

1. **It is the text.** "Minimal-cost" in 03-rules' cost language means stamina; days are
   consistently called "days" (C2 says "minimal completion days", C4 says "within 3 days"). The
   min-day reading (B) was the W1 auditor's gloss, not the doc's word.
2. **Clean division of labor across the three constraints.** The fugitive optimizes two
   currencies — days (clock: EXPIRY is an Investigator win) and SP (the ambiguity-slack resource).
   The constraint set already assigns each dimension a gate: **C2 owns time** (band [5,7]
   guarantees clock sanity), **C3 owns SP-choice diversity** (this pin), **C4 owns the endgame
   race** (3-day gate reach at surviving SP). Reading C3 as min-day (B) or Pareto (C) makes one
   constraint police both currencies, double-covering time and starving the ladder (§3).
3. **The anti-scripting intent is met.** A case passing C3-A offers a rational, slack-preserving
   fugitive ≥3 equally cheap openings, so no memorized route covers the efficient play. Openings
   that burn SP are deliberately *not* gated: spending slack to be unpredictable is the A3
   stamina game, not scriptedness — and C3-D's diagnostic shows that dimension is abundant
   (§3), so it needs no protection.
4. **It survives contact with the ladder; the stricter variants do not** (§3, §4). Pinning a
   semantics the authorized lever cannot sustain would force either an unauthorized content
   change or a silent reinterpretation later — both worse than pinning the defensible reading now.

**Recorded fallbacks.** C3-B and C3-C counts are co-reported everywhere (§3, §4) so the decision
is auditable; if a future M2 simulation shows frontier diversity (not just cost diversity)
predicts investigation difficulty, promoting C3-C to a **new** constraint C7 is a normal,
auditable change — a reinterpretation of C3 after cases ship is not.

### 1.3 Prefix window: days 1–3, end-of-day positions

The window is the ordered triple of the fugitive's positions at the end of days 1, 2, 3
(the safehouse itself excluded; W1's implementation used the identical `route[1:4]` window).
Rationale: days 1–3 are exactly the **blind window** — the first public reveal fires at the
*end* of day 3 (P9), and drop-completion events before that only reflect the forced itinerary.
This is the period an Investigator must play on prior reasoning alone, so it is the period where
memorization would pay. Distinctness is on position triples; with the map's single parallel-edge
pair (§5), the minimal-SP realization of each triple is used.

---

## 2. Independent machinery, validated against M1

The counting script is a fresh derivation from `assets/sample_map_alpha.json` (the declared
source of truth), not a re-run of any earlier harness. Hard sanity gates — the script exits
non-zero rather than emit numbers past a failed gate:

- Map structure: 48 nodes / 84 edges (56 F / 16 T / 12 M), connected, degree 2–7. **[verified]**
- Regression constants (`m1/m2-handoff.md` §3): P1 6d/5SP · P2 6d/6SP · P3 6d/7SP · canonical
  7d/6SP — min-days BFS and cheapest-drop-2 Dijkstra both reproduce every value. **[verified]**
- C2-only in-band: **113/960** ordered and **55/480** pool-order — both W1 figures reproduced
  exactly. **[verified]**
- **W1 reconciliation:** the strict W1 count (C3-B with C4 per the W1 helper) reproduces as
  **7/960 exactly** — the new prefix machinery agrees with the independently written W1 harness.

Per-config internals (BFS over (node, SP, drops) for min-days; Dijkstra over (node, drops) for
cheapest drop-2 cost; a backward k-layer DP for exactly-k-move completion costs; a forward
day-layered cost DP for the (days → min cost) profile; exhaustive 3-action opening enumeration
with position-based drop collection) are cross-checked inside the script: the forward DP's first
completion day must equal the BFS min-days on every config, and C4 is computed twice by
independent methods that must agree.

---

## 3. Base counts — the conjunction over the ordered 960 space

Space: 2 safehouses × 16×15 ordered distinct drops × 2 gates = **960** (gate∉drops and
drops[0]≠drops[1] hold structurally in the data — pools are disjoint; §9.8 is a generator assert
regardless, per T8). In-band (C2): **113**.

| Conjunction | Count /960 | vs ladder need 24 |
|---|---|---|
| C2 only | 113 | — |
| C2 ∧ C4 (case gate) | 102 | — |
| C2 ∧ C3-A | 8 | — |
| **C2 ∧ C3-A ∧ C4** | **8** | **✗ 3.0× short** |
| C2 ∧ C3-B ∧ C4 | 7 | ✗ |
| C2 ∧ C3-C ∧ C4 | 6 | ✗ |
| C2 ∧ C3-D ∧ C4 | 96 | ✓ but not a gate (counts dominated openings) |

Conclusion: AUD-003's fear is confirmed under **every** efficient-route reading — the three
constraints interact catastrophically on the 16-pool, and no reading ambiguity rescue exists.
The lever must fire.

### 3.1 Erratum found while re-deriving: W1's C4 helper accepted either gate

The W1 harness's `gate_in_3_from` returned success on reaching **either** gate node; rules §2
step 5 escapes only at **the case's gate**. The fresh script computes C4 both ways: the readings
disagree on **3 of 113** in-band base configs (and 0 among the 7 strict survivors — the
published W1 count of 7 is unchanged under the corrected semantics). Disposition: the corrected
(case-gate) C4 is normative for the generator from now on; a one-line erratum is appended to the
W1 audit (§8 there); no published M1 number changes.

---

## 4. The lever — pool 16→24, selected and exactly re-counted

**Selection rule (recorded in `m2_aud003_pool24.json`, applied outside the script so the choice
is auditable):** rank the 28 eligible nodes (non-pool, non-gate, non-safehouse — safehouses and
gates are excluded from ever becoming drop candidates as a content principle: a drop at your own
start, or at the escape gate, is degenerate) by C3-A marginal pass yield; tie-break by C3-C
yield, then node id. Take 8.

| Added node | District | C3-A marginal | C3-C marginal |
|---|---|---|---|
| D4-01 | D4 | +13 | +1 |
| D1-06 | D1 | +12 | +2 |
| D4-06 | D4 | +11 | +3 |
| D3-01 | D3 | +9 | 0 |
| D4-07 | D4 | +8 | +1 |
| D1-02 | D1 | +6 | 0 |
| D1-05 | D1 | +6 | +3 |
| D3-03 | D3 | +5 | 0 |

District coverage of the additions: D1 ×3, D3 ×2, D4 ×3 (D2 already contributes 4 pool members
and gains nothing worth adding — best D2 marginal was +4). Marginal sums over-count configs
containing two new nodes, so the decision was re-verified by **exact recount** over the full
widened space: 2 safehouses × 24×23 ordered drops × 2 gates = **2,208**.

| Conjunction (pool-24 space) | Count /2208 | vs ladder need 24 |
|---|---|---|
| **C2 ∧ C3-A ∧ C4 (pinned)** | **115** | **✓ 4.8× need** |
| C2 ∧ C3-B ∧ C4 | 25 | ✓ (barely) |
| C2 ∧ C3-C ∧ C4 | 14 | ✗ — lever cannot sustain the strictest reading |
| C2 ∧ C3-D ∧ C4 | 387 | — (diagnostic) |

**Lever verdict: adopted.** Pool 16→24 (the eight nodes above) is a content-data change to
`assets/sample_map_alpha.json`'s pool declaration — no rules churn, pre-authorized by
04-balance-sim §6. Under the pinned reading the generator now has 115 qualifying configurations
for a 24-case ladder: 4.8× headroom, which is what the C6 diversity quota needs to bite.

**Third safehouse: evaluated, NOT adopted.** The handoff authorized it as an optional rider.
With 115 ≥ 24 under the pin alone, the minimal-change principle wins — a third safehouse stays
unexercised headroom, to reconsider only if the C6 quota or a future 3-drop format starves.

**Pass-set composition (pinned reading, 115 configs):** 64 from safehouse D2-07 / 51 from
D3-06; 53 at gate D1-08 / 62 at gate D4-02; drop-district pairs span all four districts with the
largest single (pair, gate, safehouse) class at 11/115 ≈ 9.6% — no diversity quota risk at batch
level. Full list: `m2_aud003_recount_results.json` → `counts["C3-A"].pass_configs`.

---

## 5. Map content notes discovered in passing

- **One parallel-edge pair exists** (the same two nodes joined by two edge records of different
  classes). This is legal map content — a hop served by two transit classes — but it means a
  position triple can be realized at several SP spends. Convention adopted everywhere in this
  analysis (and to be adopted by the generator): the **minimal-SP realization** of a prefix is
  the one that counts. No rules impact; worth a line in the map's README notes at the next map
  version bump.
- Everything else structural re-verified clean (§2).

---

## 6. Generator constraint spec v1.0 (normative for M2, supersedes the ambiguity in 04 §6.3)

**C1 (pools).** Sample the safehouse from the safehouse pool (2), drops[2] as an ordered pair of
DISTINCT nodes from the drop-candidate pool (**24** after this resolution), and the gate from the
gate pool (2). Pools are pairwise disjoint by data; the generator still asserts it.

**C2 (feasibility band, unchanged).** BFS minimal completion days over (node, SP, drop-progress)
must lie in **[5,7]** at SP=12. Moves only (Hold is dominated for completion); escape = arrival
at the case's gate with both drops collected.

**C3 (anti-scripting, PINNED — this document §1).** The set of globally minimal-SP-cost
completing routes (≤8 days, ≤12 SP, moves only) must contain **≥3 distinct** end-of-day position
triples for days 1–3. Minimal-spend realization per prefix (parallel-edge convention, §5).

**C4 (endgame race, case-gate semantics).** Let c* = cheapest SP cost of arriving at the drop-2
site with drop-1 collected (any day count, budget-capped). The case's gate must be reachable
from the drop-2 site within **3 days** at SP remaining 12 − c* (existence of an affordable
≤3-move path). Escape checks target the case's gate only (§3.1 erratum).

**C5 (feasibility report — per case, recorded with the seed; implements T8).** Every published
case carries: `seed`; `map_id`+`map_version`; `ruleset_version`; the sampled config; and the
measured gate values `min_days ∈ [5,7]`, `min_cost_sp ≤ 12`, `n_prefixes ≥ 3`, `c4_margin_days`
(moves needed) — plus the structural asserts `drops[0] ≠ drops[1]`, `gate ∉ drops`, pools
disjoint. The report is the audit trail that the case was generated, not hand-picked.

**C6 (batch diversity, unchanged, now with headroom).** Per ladder batch: no district pair may
supply >50% of consecutive cases. With 115 qualifying configs and a max class share of ~10%,
C6 is satisfiable for the 24-case ladder; the ordering algorithm is M2 generator work.

**Explicitly rejected as gates:** C3-B (double-covers the time dimension C2 already owns) and
C3-D (counts dominated openings; kept as a reported diagnostic of raw opening freedom).

---

## 7. What this establishes — and what it does not

**Established [computed]:** C3's semantics are pinned with a documented rationale; the full
C2∧C3∧C4 conjunction is counted under four named readings on both the 960 and 2,208 spaces; the
pre-authorized lever is adopted with an auditable selection rule and suffices 4.8×; the W1
strict count of 7 is independently reproduced and its C4 helper's either-gate laxity is
corrected with zero published-number changes; B3's "map/generator headroom" concern is
materially resolved (8 → 115 qualifying configs).

**Not established:** balance, fun, or that 115 configs produce a *good* ladder — that is the M2
simulation's job (04-balance-sim §4, win-rate bands §4.5) and eventually M4's. C3-C remains
recorded as a possible future strictness upgrade (new constraint C7, not a reinterpretation).
The numbers here are generator-input facts, not player-facing claims.

**Decision log (this document):** PIN C3=C3-A · WINDOW days-1–3 end positions · LEVER pool
16→24 (8 nodes listed in §4) · SAFEHOUSE-3 not adopted · ERRATUM W1-C4 either-gate → case-gate
(counts unchanged) · PARALLEL-EDGE min-spend convention.
