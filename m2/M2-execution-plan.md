# M2 Execution Plan — Rules Engine & Mathematical Simulation (3–4 weeks)

**Status:** Weeks 1–3 **executed** (2026-10-25) · Week 4 in progress · Milestone owner: designer/developer ·
Tracks the M2 row in 10-roadmap §1 and consumes `m1/m2-handoff.md` (frozen-inputs contract) +
`m2/aud003-constraint-analysis.md` (pinned generator semantics).

## 0. What M2 is for (and what it must not become)

M2 turns the frozen rules text into a **pure deterministic engine package** and uses it to run the
first real balance simulation — the artifact four later milestones consume (sim harness, server
authority, replay, solo AI). What M2 must **not** become: a UI milestone (no rendering, no client),
a tuning exercise ahead of data (parameter changes only via the §4.5/S-sweep evidence and the
≤1-pass retune rule), or a scope window for multiplayer/AI-behavior work (fenced to 01-prd MVP
boundary; scripted policies only). The engine implements the ruleset **exactly as written** —
determinism guarantee included (no RNG in resolution; the only randomness is the seeded generator).

## 1. Week-by-week

### Week 1 — generator-constraint semantics (AUD-003) — **DONE**

| # | Deliverable | Where | Acceptance evidence |
|---|---|---|---|
| 1 | C3 semantics pinned (4 candidate readings defined; **C3-A min-cost** adopted with rationale; window = days 1–3 end positions) | `m2/aud003-constraint-analysis.md` §1 | Decision log line; readings co-reported for auditability |
| 2 | Full conjunction C2∧C3∧C4 counted, conventions named | same, §3 | 8/960 base under the pin; W1's strict 7 reproduced exactly (independent-machinery reconciliation) |
| 3 | Authorized lever evaluated and adopted: drop pool 16→24 (8 documented nodes) | same, §4 + `tools/verification/m2_aud003_pool24.json` | Exact recount: **115/2208** pass (4.8× the 24-case ladder need); 3rd safehouse evaluated, not adopted |
| 4 | Generator constraint spec v1.0 (C1–C6 restated + C5 feasibility-report schema per T8) | same, §6 | Pointer note landed in 04-balance-sim §6 |
| 5 | W1 erratum: C4 helper accepted either gate → case-gate semantics corrected | `m1/w1-rules-audit.md` §8 | Published M1 numbers unchanged (7 → 7) |
| 6 | This execution plan | `m2/M2-execution-plan.md` | — |

New machine-verifiable facts: 115 qualifying case configs (list committed), per-config gate
values (`min_days`, `min_cost_sp`, `n_prefixes`, C4 margin) computable by the pinned script —
these become the generator's acceptance fixtures in Week 2.

### Week 2 — engine package: types, resolve(), generator + BFS gate — **DONE**

**Gate at week start (two decisions — TAKEN 2026-10-25, user-authorized session):**
- **Freeze dependency:** `resolve()` implements the *frozen* ruleset — Week 2 coding waits for the
  M1 freeze tag (`m1-freeze-<version>`, per `m1/freeze-checklist.md` §2). The **generator +
  feasibility gate are methodology, not rules**: their spec is pinned and freeze-independent, so
  generator code may start immediately. **→ Originally respected (pre-flight shipped generator-side
  only); subsequently RE-SCOPED by [ADR-002](adr-002-resolve-unlock.md): `resolve()` was implemented
  against the frozen *text* of `1.0.0-alpha.1` with a DRAFT-UNFREEZE marker — the fabrication guard
  is untouched, and freeze-checklist §1 now carries a transcript-reconciliation gate for the real
  S1–S3 logs.**
- **Toolchain:** the engine is a pure TypeScript package (10-roadmap M2 task 1; types lifted
  verbatim from `m1/engine-types/dead-drop.types.ts`). This environment has run Python-only so
  far (stdlib-only constraint applies to *verification scripts*); standing up Node + a TS
  toolchain (and deciding package layout `packages/engine`) is a Week-2 pre-flight, not a
  design question. **→ Taken and recorded: [`adr-001-toolchain.md`](adr-001-toolchain.md).**

**Pre-flight — EXECUTED 2026-10-25 (evidence):**

1. Toolchain stood up per ADR-001: Node v24.21.0 · TypeScript 5.9.3 (`strict` +
   `noUncheckedIndexedAccess`, NodeNext ESM) · npm workspaces · vitest 3.2.7. DevDeps at the
   workspace root only; `@dead-drop/engine` declares **zero runtime dependencies**.
2. `packages/engine` scaffolded; type draft lifted verbatim (provenance banner; lift-time
   divergences registered as **T11** in `m1/engine-types/README.md`, never silently patched).
3. The pinned feasibility gate ported 1:1 from the Python oracle (`src/feasibility.ts`), with
   the oracle's internal cross-checks (BFS min-days ≡ forward-DP first completion) preserved.
4. L1 fixtures emitted by the new `tools/verification/dd_m2_emit_fixtures.py` — per-config
   measured gate values for all passes, hard-asserted at emit time to be **set-identical (115/115)**
   to the independent M2-W1 recount. New convention-named fact: C2-only in-band on the 24-pool
   = **435/2208** (ordered).
5. **Verification: `tsc --noEmit` green; vitest 21/21 green** — including the dual-language
   reconciliation (TS gate ≡ Python fixtures over the full 2,208-space, every field) and the
   four regression constants; L2 generator properties green (seed determinism, C6 diversity
   ≤50% + no-consecutive, §9.8/T8 asserts, C5 report completeness over 5 ladder seeds).
6. W2 exit line already met at generator level: the engine runs the generator headlessly from a
   seed to a C5-reported case and produces the 24-case ladder. The remainder of the W2 exit
   ("runs a full case to a verdict") waits on `resolve()` — freeze-gated.

Tasks:
1. ~~`packages/engine` scaffold; lift the type draft; carry **T1–T10** into the test plan~~ —
   **DONE (pre-flight)**; T1–T10 + T11–T15 carried: T2/T9 landed with the `resolve()` tests, T8
   asserts shipped in the generator, T12–T15 registered at implementation time.
2. ~~`resolve()` — the exact §2 seven-step sequence as pure functions; verdicts per §6;
   §9.1–9.13 validation predicates; idempotent action application (§9.10 shape)~~ — **DONE
   (ADR-002, DRAFT-UNFREEZE)**: `src/engine.ts` — `CaseSession` (phase-gated, idempotency journal,
   role views, §8.6 disclosure, clock-layer forfeit/void) + `runScriptedCase` pure driver.
   Verified by golden tests: rules §10 worked examples W1/W2/W3 (incl. IP/SP ledgers and event
   order), §9.3/9.4/9.5/9.6/9.7/9.13, §9.10 cross-phase retry, T2 info wall, T9 stakeout
   consumption, determinism (session ≡ driver), and all four regression constants escaping
   end-to-end on min-days routes.
3. ~~Case generator: seeded sampling per C1; feasibility gate per C2–C4 (pinned semantics);
   C5 feasibility report emitted per case; C6 batch ordering~~ — **DONE (pre-flight, verified)**.
4. ~~**L1 fixtures first** (09-testing §1): the four regression constants — P1 6d/5SP, P2 6d/6SP,
   P3 6d/7SP, canonical 7d/6SP — asserted against `tools/verification/dd_m1_w1_validation.py`
   as the independent oracle; the 115-config list asserted via the generator's own gate~~ —
   **DONE (pre-flight)**: constants + full 115-record reconciliation green; oracle contract held
   (fixtures emitted BY the Python side, asserted BY the TS side).
5. ~~**L2 property tests** (09-testing §2): determinism (same seed+actions ⇒ same transcript),
   info-wall (InvestigatorView never contains fugitive-hidden fields — T2), §9.8 invariants
   hold for every generated case (T8), stakeout consumption (T9)~~ — **DONE (W2 close)**:
   generator-side slice was green at pre-flight; the resolve()-dependent properties (info wall,
   consumption, determinism, idempotency) are green in `l3-resolve-properties.test.ts` on the
   synthetic micro map (`test/micro-map.ts`), plus the T14 white-box pin of the AUD-004
   position-based check.

**Week 2 exit — MET (2026-10-25):** engine@0.2.0-alpha.0 runs a full case headlessly from a seed
to a verdict (generator → C1–C6 case → min-days script → ESCAPE, five seeds verified); L1 green
(tsc strict + **63/63** vitest incl. the 115-config full-space reconciliation); generator produces
the 24-case ladder with C5 reports. Remaining W2-adjacent work is the W3 harness, not the engine.

### Week 3 — simulation harness + policy matrix + sweeps — **DONE (2026-10-25)**

- Headless driver (04-balance-sim §4.1): ≥1,000 cases/sec/order-of-magnitude target (est.).
- Scripted policies (§4.2): fugitive F-Beeline / F-Random / F-LeakAware / F-Deceptive /
  F-SlackBurner × investigator I-GreedyProbe / I-Calendar / I-Aggressive / I-Random — the 20-pair
  matrix, N ≥ 1,000 seeded cases per pair per configuration.
- Outputs (§4.3): Wilson 95% CIs on role win-rates; capture-day histogram; IP/SP unspent;
  probe hit-rate vs chance; stakeout hit-rate vs posterior mass at placement.
- Scenario sweeps (§4.4): S1 (P3×P4 grid), S2 (reveal-schedule variants — the roadmap's named
  risk), S3 (initiative control), S4 (stakeout pricing), S5 (Hold economy), S6 (case length),
  S7 (degenerate-strategy probes). Q1 (EXPIRY direction) and Q4 (2-probe cap binding?) get their
  first real readouts here (m2-handoff §5).

**Week 3 exit — MET (2026-10-25):** full matrix + sweeps recorded with conventions named in
outputs; S2 verdict written down. Evidence: [`w3-simulation-report.md`](w3-simulation-report.md)
(+ raw JSONs in [`w3-results/`](w3-results/), engine package [`packages/sim`](../packages/sim/README.md)).
Recorded run: 20,000 matrix cases (20 pairs × N=1,000, CRN) + 52,000 sweep cases (26 cells ×
N=500) + 1,500 S7 camping-pricing addendum cases + 60,000 determinism double-runs (10,000 seeds ×
3 pairs, full-transcript digests, **0 mismatches**). Throughput 995 cases/s full-policy layer /
831 cases/s engine-level (§4.1 order-of-magnitude met). §4.5 scorecard: calibration PASS; band,
dominance (I-Aggressive camping 70.7–93.2%), and capture-pacing lines FAIL with measured evidence
→ W4 retune list (headline candidate: P8 3→4). Three pilot-phase policy defects fixed before the
recorded run (registered in the policy header); zero rules churn; T16/ADR-003 override surface
added to the engine (default path byte-identical).

### Week 4 — balance report v1, retune, engine tag, G1

- Balance report v1: one-page parameter verdict + retune list (§4.3 format).
- Apply **≤1 parameter pass** (10-roadmap M2 task 5) only if §4.5 bands are violated; every
  adopted change lands in 04-balance-sim §2 with a version bump and moves ≥2 metrics in the
  desired direction without regressing a third (§5 rule).
- Tag `engine@1.0.0-alpha`; write G1 sign-off into 14-readiness (gate doc updates at milestone
  exits); B1 (no simulation results) closes here if the bands are met — B3 closes on the
  generator evidence from Week 1/2 (headroom 4.8×).

**Week 4 exit / M2 exit condition (10-roadmap):** G1 signed off — L1 green; role win-rate in the
45–55% band **or** a specific retune list; determinism green over 10k seeds.

## 2. Exit-criteria tracking (G1, 01-prd §8)

| Criterion | Status | Evidence at close |
|---|---|---|
| L1 regression fixtures green (4 constants + 115-config gate) | **green (W2, generator + resolve level)** | vitest `l1-regression` + `l1-configs`: TS ≡ Python oracle, all 115 records field-equal; constants also pass end-to-end through `resolve()` as scripted ESCAPEs |
| Determinism over 10k seeds | **green (W3)** | `w3-results/determinism.json`: 10,000 seeds × 3 pairs, double-run, full-transcript digests — 0 mismatches |
| Role win-rate 45–55% (or specific retune list) | **pending W4 — retune list now exists** | W3 matrix: focal pairs 65.3–67.9% (CIs >55); W3 report §6 names the measured levers (P8 3→4; P3/P4 insensitive) |
| No policy pair >65% at α=0.05 | **measured: VIOLATED (W3)** — I-Aggressive camping 70.7–93.2% vs non-random fugitives | matrix table + `w3-results/s7-camping.json` (P8 pricing lever: 93.2% → 67.2% at P8=4) |
| ≥60% captures on days 4–8 | **measured: VIOLATED (W3)** — 0–11% (opening decided by day 2) | capture-day histograms in `w3-results/matrix.json` |
| Stakeout hit-rate > posterior mass at placement | **measured: PASS (W3)** — 49.9–52.6% vs 0.16–0.17 predictive mass (3× skill premium vs smart fugitives; calibrated vs noise) | calibration columns in `w3-results/matrix.json` |
| ≤1 parameter pass, logged (if any) | pending (W4) | 04 §2 diff log |

## 3. Risks to M2 itself (from 12-risks, operationalized)

- **Reveal schedule wrong** (named M2 risk): ~~S2 is the readout~~ — **S2 read: NOT confirmed.**
  The reveal schedule moved win-rates ≤4pp in its swept neighborhood ({3,6}/{4} vs {2,5,7}/{4} vs
  {3,6}/{4,7}); the case is decided before most reveals fire. Keep {3,6}/{4} into M4
  (`w3-simulation-report.md` §3 S2 verdict). The fix ladder stays content-first (P9/P10 variants),
  rules last.
- **Sim policies too weak to expose dominance:** ~~add `I-Calendar` variants before touching rules~~
  — superseded: the W3 matrix DID expose dominance (I-Aggressive camping), and the pilot loop
  surfaced/patched three policy defects (no objective seeking; delay-costing tier filters; a
  terminal-state blindness in the route helpers) with registrations in the policy header. Policy
  quality is now the recorded baseline for W4.
- **Engine/sim scope creep:** UI, multiplayer, ML agents, monetization are fenced out
  (m2-handoff §4); anything else goes to the parking lot below.
- **Freeze slippage:** ~~Week 2's `resolve()` start is the only freeze-dependent task~~ —
  neutralized by ADR-002 (DRAFT-UNFREEZE + reconciliation gate); M2 no longer waits on the
  human session calendar. Residual risk (rework if triage changes resolution behavior) is
  accepted and bounded by the golden suite.
- **NEW (W2 close):** S1's original AUD-004 engineered procedure was unreachable — caught and
  fixed before any human session was wasted (triage-log M2-001, T14). Watch for the same class
  of template defect in S2's §9.13 engineering (the §9.13 state IS reachable — 0 SP at any node
  — so no action needed).
- **NEW (W3 close):** the sim's W3 verdicts are scripted-competence-level, not human-level — the
  45–55 band target is defined for rated HUMAN play (04 §1). W4's balance report must carry both
  readings; do not retune to scripted numbers alone (the report's honesty section says the same).

## 4. Parking lot (created empty; nothing is in it yet)

*(populated from M2 work notes; each entry: one line + date; reviewed at M2 close — none enter
the ruleset without a new audit round)*

- 2026-10-25 (W3): F-LeakAware ≡ F-Beeline outcome-identical on map_alpha — if the calendar game
  is wanted, it must be priced (holds) or made structural (map content); tie-level leak
  preferences don't bind. Design decision for the W4 report (not a silent tweak).
- 2026-10-25 (W3): cross-case route repetition (F-Beeline exploitability) is a MATCHMAKING/rating
  concern (M6), not a generator concern — C3's anti-scripting constraint is per-case.
