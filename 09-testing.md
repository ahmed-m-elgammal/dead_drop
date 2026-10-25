# 09 — Testing Strategy & Acceptance Criteria

**Status:** plan. No tests, simulations, or playtests have been executed yet; everything below is the specification for them. The engine-first architecture (07-architecture §1) makes most of this cheap: the game is a pure function, so the test pyramid is top-heavy by design (many engine tests, few E2E).

## 1. Test layers

| Layer | Scope | Tooling (intended) | When |
|---|---|---|---|
| L1 Engine unit tests | Every rule in 03-rules.md, esp. §2 order, §5 actions, §9 edge cases | Vitest | From M2 |
| L2 Engine property tests | Determinism (same seed+actions → same outcome), info-wall (view scoping), generator constraints | fast-check (property-based) | From M2 |
| L3 Simulation harness | Balance matrix + sensitivity (04-balance-sim §4–5) | Node scripts + the engine; CSV/JSON reports | M2, rerun M4 |
| L4 API integration | 08-api-security contract: authz, idempotency, role-scoped views, deadline/forfeit cron | Vitest + test Postgres | M5 |
| L5 Client E2E | Happy paths: tutorial, one solo case, (M5) one async case incl. push opt-in | Playwright | M3, extended M5 |
| L6 Manual playtest | Feel, fairness, onboarding (04-balance-sim §7) | Protocol + telemetry | M4 |

## 2. The critical tests (named, because they protect the game's identity)

1. **Info-wall serialization test (L4):** for a corpus of random cases, assert the Investigator view never contains fugitive position/route/stamina/drops fields pre-verdict, and the Fugitive view never contains probe/stakeout fields pre-verdict. This is the #1 security property (08-api-security §3).
2. **Determinism test (L2):** identical (case seed, action list) reproduces byte-identical state and logs — on client, server, and sim harness.
3. **Day-resolution order test (L1):** a case where capture, reveal, drop, and escape all *would* fire on the same day asserts the §2 order: stakeout-check → evidence → drop → escape. (Constructed with a gate-adjacent drop on a reveal day with a stakeout armed.)
4. **Deadline/forfeit test (L4):** simulated clock advance → miss → nudge → 2nd miss → forfeit → rating applied; mutual-miss → VOID.
5. **Generator gate test (L2):** every generated case satisfies min-days ∈ [5,7], `drops[0] ≠ drops[1] ≠ gate`, anti-scripting prefix count ≥ 3 (04-balance-sim §6).
6. **AI information-wall audit (L2):** AI outputs are invariant to mutations of the opponent's private state (05-ai-spec §7).

## 3. Acceptance criteria per milestone (measurable)

| Milestone | Acceptance criteria (extract) |
|---|---|
| M1 Docs & paper rules | This doc set reviewed; 3 paper cases played end-to-end; all rule disputes resolved into 03-rules.md edits |
| M2 Rules & simulation | L1 suite green (target ≥ 120 cases covering §9 edge table); L3 report: role win-rates 45–55% or a written retune list; generator gate live; determinism property green over 10k seeds |
| M3 Solo prototype | L5 tutorial + solo ladder pass; 24-case ladder completable; solo assist & skill tiers function; zero known rule bugs (L1/L2 green); crash-free sessions ≥ 99% (Sentry) |
| M4 Balance & usability | 15–20-person playtest completed; fun gate (PRD §6) reported honestly either way; parameters v1.1 published with diff log; DDA director behind flag with sim-validated band behavior |
| M5 Async multiplayer | L4 green incl. info-wall; forfeit rate ≤ 15% in closed beta; push opt-in ≥ 60%; case completion ≥ 70% non-forfeit |
| M6 Ranked | Glicko-2 live on both ladders; matchmaking p50 < 24 h in queue; anomaly flags < 2% of cases; uptime ≥ 99%/30 days |
| M7 Monetization | Ads/offers live in solo/casual only (automated check: ranked case flow contains zero ad/ad-ready surfaces); capped ≤ 3/day; privacy review signed off |

## 4. Non-functional targets

| Area | Target |
|---|---|
| Case view p95 latency (MP) | < 300 ms |
| Action submit p95 (MP) | < 500 ms |
| Client bundle (PWA) | < 250 KB gzipped initial route |
| Offline solo | Fully playable airplane-mode; sync on reconnect |
| Accessibility | 130% text scale OK; color-blind-safe palette verified in playtest; screen-reader pass on core loop (post-MVP full audit) |

## 5. Known testing gaps (honest)

- No automated accessibility audit tooling chosen yet (axe integration is the default candidate; decided at M3).
- Push delivery reliability on iOS PWAs (16.4+ install flow) needs a real-device spike at M5 — flagged as a risk (12-risks R9).
- Load testing the cron/turn scheduler at real scale is untested until M5 beta; the state space is small but the deadline scan needs a load test plan.
- Fun cannot be asserted by any layer below L6; the plan treats L6 as a gate, not a formality.
