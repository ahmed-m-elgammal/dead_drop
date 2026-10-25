# M2 Execution Plan — Rules Engine & Mathematical Simulation (3–4 weeks)

**Status:** Week 1 **executed** (2026-10-25) · Weeks 2–4 planned · Milestone owner: designer/developer ·
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

### Week 2 — engine package: types, resolve(), generator + BFS gate

**Gate at week start (two decisions, recorded here when taken):**
- **Freeze dependency:** `resolve()` implements the *frozen* ruleset — Week 2 coding waits for the
  M1 freeze tag (`m1-freeze-<version>`, per `m1/freeze-checklist.md` §2). The **generator +
  feasibility gate are methodology, not rules**: their spec is pinned and freeze-independent, so
  generator code may start immediately.
- **Toolchain:** the engine is a pure TypeScript package (10-roadmap M2 task 1; types lifted
  verbatim from `m1/engine-types/dead-drop.types.ts`). This environment has run Python-only so
  far (stdlib-only constraint applies to *verification scripts*); standing up Node + a TS
  toolchain (and deciding package layout `packages/engine`) is a Week-2 pre-flight, not a
  design question.

Tasks:
1. `packages/engine` scaffold; lift the type draft; carry **T1–T10** into the test plan
   (esp. T2 derive-don't-store, T4 FORCED_HOLD engine-resolved, T8 generator asserts, T9
   consumed-stakeout fixture).
2. `resolve()` — the exact §2 seven-step sequence as pure functions; verdicts per §6;
   §9.1–9.13 validation predicates; idempotent action application (§9.10 shape).
3. Case generator: seeded sampling per C1; feasibility gate per C2–C4 (pinned semantics);
   C5 feasibility report emitted per case; C6 batch ordering.
4. **L1 fixtures first** (09-testing §1): the four regression constants — P1 6d/5SP, P2 6d/6SP,
   P3 6d/7SP, canonical 7d/6SP — asserted against `tools/verification/dd_m1_w1_validation.py`
   as the independent oracle; the 115-config list asserted via the generator's own gate.
5. **L2 property tests** (09-testing §2): determinism (same seed+actions ⇒ same transcript),
   info-wall (InvestigatorView never contains fugitive-hidden fields — T2), §9.8 invariants
   hold for every generated case (T8), stakeout consumption (T9).

**Week 2 exit:** engine@0.x runs a full case headlessly from a seed to a verdict; L1 green;
generator produces the 24-case ladder with C5 reports.

### Week 3 — simulation harness + policy matrix + sweeps

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

**Week 3 exit:** full matrix + sweeps recorded with conventions named in outputs; S2 verdict on
the reveal schedule written down.

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
| L1 regression fixtures green (4 constants + 115-config gate) | pending (W2) | test run logs vs `dd_m1_w1_validation.py` oracle |
| Determinism over 10k seeds | pending (W2–W3) | harness output |
| Role win-rate 45–55% (or specific retune list) | pending (W3–W4) | balance report v1 |
| No policy pair >65% at α=0.05 | pending (W3) | matrix table |
| ≥60% captures on days 4–8 | pending (W3) | capture-day histogram |
| Stakeout hit-rate > posterior mass at placement | pending (W3) | calibration table |
| ≤1 parameter pass, logged (if any) | pending (W4) | 04 §2 diff log |

## 3. Risks to M2 itself (from 12-risks, operationalized)

- **Reveal schedule wrong** (named M2 risk): S2 is the readout; the fix ladder is content-ish
  first (P9/P10 variants), rules last (10-roadmap §3).
- **Sim policies too weak to expose dominance:** add `I-Calendar` variants before touching rules.
- **Engine/sim scope creep:** UI, multiplayer, ML agents, monetization are fenced out
  (m2-handoff §4); anything else goes to the parking lot below.
- **Freeze slippage:** Week 2's `resolve()` start is the only freeze-dependent task; generator +
  fixtures + harness scaffolding are freeze-independent and keep the week productive.

## 4. Parking lot (created empty; nothing is in it yet)

*(populated from M2 work notes; each entry: one line + date; reviewed at M2 close — none enter
the ruleset without a new audit round)*
