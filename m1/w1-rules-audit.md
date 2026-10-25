# M1 Week 1 — Rules-Completeness Audit & Dispute Log

**Status:** executed 2026-10-25 (Week 1 of M1, per 10-roadmap M1 task 4 pre-flight) · **Ruleset audited:** `1.0.0-alpha` · **Outcome:** ruleset patched to `1.0.0-alpha.1` (one gap ruling, two clarifications); all mechanical claims re-verified computationally.

**Method.** Every mechanical claim in 03-rules.md that could be checked without playing was re-verified against the canonical map data (`assets/sample_map_alpha.json`) by a fresh, independent script (`/home/z/my-project/scripts/dd_m1_w1_validation.py`, raw output `/home/z/my-project/scripts/m1_w1_validation_results.json`). This is deliberately *not* a re-run of the original `dd_map_and_calcs.py` — re-deriving from the JSON (the declared source of truth for map data) is the point. Claims labeled **[verified]** below were checked this way. Claims that only human play can settle are listed for Weeks 2–3 and are **not** claimed here.

---

## 1. Edge-case rulings (03-rules §9.1–9.12) — verification

The M1 acceptance criterion is "every §9 edge case has a ruling; no TBD left in 03-rules.md". A grep for `TBD|TODO|TBA|unclear|undefined` returns zero matches **[verified]**. Each ruling was then re-read against §2's resolution order for internal consistency:

| § | Ruling re-verified | Consistency check performed | Result |
|---|---|---|---|
| 9.1 | Illegal fugitive move rejected; deadline stands | Matches §3.1 legality predicate (adjacency ∧ stamina ≥ cost ∧ Hold cap) | OK |
| 9.2 | Overspend/over-cap rejected atomically | Matches §5.3 budgets (10 IP, ≤2 probes, ≤1 stakeout) | OK |
| 9.3 | Stakeout on Day 8 rejected | Matches §5.2; §2 step 6 wording agrees ("not on day 8") | OK |
| 9.4 | Day-8 probe legal but outcome-irrelevant | Probe (§5.1) targets "today" = Day 8; verdict EXPIRY already fixed at step 7 regardless of result. Consistent. | OK |
| 9.5 | Gate is ordinary ground until drops complete | Follows from §2 step 5 requiring `drops_collected == 2` | OK |
| 9.6 | Stakeout on currently-occupied node legal; captures only if still there next day-end | §2 step 2 compares *end-of-day* position; W4 exercises it | OK |
| 9.7 | Hold on Day 4 → "no movement" reveal | §2 step 3 parenthetical agrees; W2 exercises it | OK |
| 9.8 | Generator forbids `drops[0] == drops[1]` and `gate ∈ drops` | Matches 04-balance-sim §6.1 pools; both gate nodes ∉ drop pool **[verified]** (D1-08, D4-02 not among the 16) | OK |
| 9.9 | Disconnect → no commit; re-fetch; deadline unchanged | Consistent with 08-api-security idempotency design | OK |
| 9.10 | Duplicate submission returns original result | Idempotency key per action | OK |
| 9.11 | Mutual abandonment → VOID | §6 table agrees; no rating change | OK |
| 9.12 | Live cases resolve under creation `ruleset_version` | §11 versioning agrees | OK |

**New gap found and ruled (see §4, DIS-001):** §9 did not cover a Fugitive who cannot afford *any* action (0 SP). Patched as **§9.13** in `1.0.0-alpha.1`.

## 2. Worked examples (§10 W1–W4) — geometry & ledger re-verification

All 14 map edges cited by W1–W4 exist on the canonical map with the stated transit class **[verified: 14/14 present, 0 missing]**. The W3 stamina ledger (1+3+3+1+1+1+1+1) sums to exactly 12 of 12 SP **[verified]**. W4's pinned node D3-06 is indeed a declared safehouse **[verified]**, and the canonical case's gate (D1-08) and drops (D2-09, D1-10) are legal pool members **[verified]**. The canonical case's minimal completion re-computes to **7 days** under BFS over (node, stamina, drop-progress) — matching the doc's [computed] claim; the cheapest drop-2-completion route costs 6 SP (via D2-08→D2-09→D2-10→D2-11→T→D1-10), leaving ≥5 SP of endgame slack **[verified]**.

## 3. Re-verification of the [computed] parameter claims

| Claim (source) | Re-derived result | Verdict |
|---|---|---|
| Map: 48 nodes, 84 edges (56 F / 16 T / 12 M), connected, degree 2–7, districts 12 each (03 §1.1, 04 §3.1) | identical | **[verified]** |
| Canonical case min completion = 7 days (03 §10) | 7 | **[verified]** |
| "55/480 configs in band [5,7]" (04 §3.1, 01-prd §9, 14-readiness B3) | 55/480 reproduced **exactly** under the original convention (unordered drop enumeration, order fixed by pool position). Under the other two defensible conventions: 99/480 (either order) and **113/960 ordered** (~11.8% — same rate as 55/480 ≈ 11.5%) | **[verified, convention-dependent]** — see AUD-002 |
| Probe hit p = 1/48 ≈ 2.08%; district reveal removes exactly 2.00 bits (48→12); transit reveal ≤ log2(3) ≈ 1.58 bits (03 §4, 04 §3.2) | 48/12 = 4 ⇒ exactly 2 bits; log2(3) ≈ 1.585; 1/48 ≈ 0.02083 | **[verified]** |
| Blind probing hopeless: ~24 expected probes to first hit (03 §4) | 48/2 = 24 expected under uniform posterior vs. 10 IP / 2-per-day cap | **[verified]** |
| Generator constraint interactions (C2–C4, 04 §6) | **Not previously counted**: under the strict reading of C3 (≥3 distinct first-three-day prefixes among *exactly* minimal-day routes) only **7 of 960** ordered configs pass C2∧C3∧C4 | **[new finding]** — see AUD-003 |
| Stranding possibility (not previously checked) | Every node has ≥1 Foot edge (min incident cost = 1 everywhere), so a stranded state requires exactly 0 SP — which is reachable by legal play | **[new finding]** — see DIS-001 |

## 4. Findings & dispute log (M1 format: DIS-nn / AUD-nn)

### DIS-001 — Fugitive exhaustion (0 SP) has no ruling — **PATCHED, playtest-confirm**

- **Situation:** Fugitive at 0 SP before Day 8: every move costs ≥1 (map has no cheaper edge) and Hold costs 1 SP ⇒ no legal action exists. §9 was silent. Not hypothetical: 0 SP is reachable by legal play (W3 ends at exactly 12/12).
- **Ruling (now §9.13):** the day resolves as a *forced Hold at no SP cost*; `holds_used` unchanged; log shows "Stranded"; a transit reveal on that day reports "no movement". No capture penalty, no forfeit.
- **Rationale:** exhaustion is self-inflicted exposure, not a rules crime; a capture/forfeit penalty would convert SP into a hard survival timer and change the game (audit A3's "ambiguity slack" role). Forced Hold is deterministic, keeps the EXPIRY direction intact, and the public "no movement" signal still punishes the error informationally.
- **Status:** patched into 03-rules `1.0.0-alpha.1`; **pending table confirmation** in Weeks 2–3 (deliberately engineer this state in a paper case by running SP to 0 before Day 8).

### AUD-002 — "55/480" lacked its counting convention — **CLARIFIED**

The number is correct but convention-dependent. Patched a one-line parenthetical into 04-balance-sim §3.1 naming the convention (unordered drop enumeration, pool-position order; ordered space 113/960, same ~11.8% rate). No conclusion changes.

### AUD-003 — Generator constraint interaction uncounted; C3 ambiguous — **LOGGED for M2 (B3 sharpened)**

The 55/480 (or 113/960) headroom counts constraint C2 (band) only. The other three generator constraints (§6.3 anti-scripting, §6.4 endgame race, §6.6 diversity quota) were never counted together with it. Under a strict C3 reading, only **7/960** ordered configs survive C2∧C3∧C4 — while the MVP ladder needs 24. Two possibilities, both acceptable now and decidable at M2: (a) C3's wording ("minimal-cost", the prefix window) is looser than my strict reading and admits many more; (b) the drop pool must widen 16→24, which 04-balance-sim §6 already pre-authorizes as a *content-data* change (no rules churn). **Action logged into the M2 handoff:** pin C3's exact semantics before writing the generator; count the full conjunction; pre-plan the pool widening. No 03-rules change (generator is methodology, not rules).

### AUD-004 — Hold-on-a-drop-site completes the drop — **CLARIFIED (no behavior change)**

§2's step-4 drop check is purely position-based, so Holding on the pending drop site collects it (costs 1 SP; "no movement" reveal risk on Day 4). This is a real, interesting tactic (camp your own drop at an information price), and it *follows* from the normative sequence — but players will argue about it at the table, so 03-rules §3.3/§2 step 4 now state it explicitly. Also checked the analogous gate case: a state "at the gate with both drops, not escaped" is unreachable (gate ≠ drop per 9.8; arriving with drops done escapes immediately), so no second ruling is needed.

### AUD-005 — Stakeout-hit precedence over same-day events — **CONFIRMED intended**

§2 step 2 runs before evidence/drop/escape steps, so a capture preempts the day's drop event and reveal. Consequence worth stating in playtest notes: the public log of a capture case may lack that day's drop event; this is by design, not a bug.

### AUD-006..008 — non-findings

Day-8 probe (9.4), per-phase deadlines (§7), and version-pinned live cases (9.12/§11) each re-checked; all internally consistent; no changes.

## 5. What Week 1 does **not** establish

Nothing here proves balance, fun, or teachability — those are M2 (simulation) and M4 (playtest) outputs, and 14-readiness blockers B1/B2/B3 remain open as written. This audit closes only the *mechanical* pre-flight for the paper-playtest weeks: the rules text is now internally consistent, geometry-verified, and gap-free to the audit's knowledge. Two mechanical states (DIS-001 stranding; AUD-004 Hold-collects-drop) are deliberately to be *triggered on purpose* during paper play so the rulings are exercised, not just read.

## 6. Registry of changes made in Week 1

| File | Change | Reason |
|---|---|---|
| 03-rules.md | + §9.13 (forced-Hold stranding); + Hold-completes-drop sentence in §2.4/§3.3; version → `1.0.0-alpha.1` with change note in §11 | DIS-001, AUD-004 |
| 04-balance-sim.md | + counting-convention parenthetical in §3.1 | AUD-002 |
| m1/* (this directory) | M1 execution plan, this audit, playtest protocol, paper-prototype kit | M1 tasks 2–4 |
| scripts/dd_m1_w1_validation.py | independent verification harness (kept for M2 regression reuse) | method |
| m1/sessions/*, m1/engine-types/*, m1/freeze-checklist.md, m1/m2-handoff.md | Week-2/3 tooling (transcription kit, type-spec draft T1–T10, freeze pre-flight, M2 handoff draft) — see README doc map | M1 plan W2–W3 |

## 7. M1 close-out registry (added Week 3; filled ONLY at freeze from real session artifacts)

**Status:** skeleton (2026-10-25). Rows are filled exclusively from `m1/sessions/s{n}-transcript.md` and `m1/sessions/triage-log.md` evidence per `m1/freeze-checklist.md` — never anticipated. Empty rows at freeze mean M1 does not close.

### 7.1 Tally (acceptance line: Player A ≥3 cases as Investigator AND ≥3 as Fugitive)

| Session | Partner | Case | Leg | A's role | Verdict | Engineered/watch state exercised | Notes |
|---|---|---|---|---|---|---|---|
| S1 | B | P1 | 1 | | | AUD-004 (engineered): Y/N | |
| S1 | B | P1 | 2 | | | AUD-004 (engineered): Y/N | |
| S2 | B | P2 | 1 | | | §9.13 (engineered): Y/N | |
| S2 | B | P2 | 2 | | | §9.13 (engineered): Y/N | |
| S3 | C | P3 | 1 | | | watch (natural): | |
| S3 | C | P3 | 2 | | | watch (natural): | |

**Totals at freeze:** A as Investigator ___/3 · A as Fugitive ___/3 · partners: B, C · disputes triaged ___/___

### 7.2 Ruling-confirmation line for the freeze note (10-roadmap acceptance)

Every §9 ruling carries its W1 textual verification (§1 above); the two engineered states carry table confirmation iff their S1/S2 checklist rows are checked. Freeze wording (Branch A/B per `m1/freeze-checklist.md` §2): *"every §9 ruling confirmed in text (W1 audit §1) and the two audited-unplayed states confirmed at the table (S1 AUD-004, S2 §9.13) — or patched and re-ruled (`1.0.0-beta`)."*
