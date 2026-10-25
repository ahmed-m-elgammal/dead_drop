# 14 — Readiness Report (Quality-Gate Results)

**Date:** 2026-10-25 (G1 signed off at M2 close, same day) · **Scope:** documentation readiness for implementation start · **Verdict:**

> **CONDITIONALLY READY — implementation may begin at M1–M2. M3 (prototype build) is unblocked. M4/M5 are gated on simulation and playtest results. Three named blockers and one stop-line condition are active.**

## 1. Quality-gate checklist

| Gate (from the brief) | Result | Notes |
|---|---|---|
| Consistency across documents | **Pass** | Canonical values (8 days, 2 drops, SP 12, IP 10, probe 1/day-cap 2, stakeout 3/day-cap 1, reveals 3/6+4, clocks 24h/12h) cross-checked by automated grep across all 16 docs after writing; worked examples re-verified against `assets/sample_map_alpha.json` edges **[computed]** |
| Every core mechanic has rules + edge cases | **Pass** | 03-rules §2 resolution order + §9 edge table (12 cases) + 4 worked examples, all geometry-verified |
| Every planned feature has acceptance criteria | **Pass** | PRD §8 gates G1–G6; per-milestone acceptance in 10-roadmap; test-level criteria in 09-testing §3 |
| Decisions requiring prototype/playtest identified | **Pass** | 13-open-questions (12 items, each with a decide-by milestone); balance hypotheses flagged throughout as [hypothesis] |
| Unsupported market claims removed | **Pass** | No market-size or revenue claims anywhere in the doc set; gap statements are labeled absence-of-evidence (01-prd §2); research-phase citations stay in the research report |
| False precision removed | **Pass with note** | All computed numbers carry the [computed] label and point at the actual script; sim targets are labeled targets, not predictions. Residual risk: paper win-rate targets (45–55%) may be mistaken for promises — they are gates, not forecasts |
| Unresolved decisions flagged, not guessed | **Pass** | Q1 (expiry direction) and Q2 (reveal schedule) explicitly left to M2 data; D8 marked conditional |
| MVP achievable for a solo developer | **Pass** | MVP fence excludes server/accounts/MP/ads; engine-first ordering; 22–31 wk part-time plan with gates |
| Architecture supports expansion without premature complexity | **Pass** | No realtime, no Redis, no K8s; expansion points named (second map, 3-drop format, Capacitor, /v2 API) with their triggers |

## 2. Blockers (must clear before the *next* milestone)

| ID | Blocker | Blocks | Clearing action |
|---|---|---|---|
| B1 | **No simulation results exist.** All balance values are hypotheses; the 45–55% role band is unvalidated | M2 exit (G1) | Build engine + sim harness (M2 tasks 1–4); produce the report with Wilson CIs — **NARROWED at M2 close (W4): simulation results now exist ([w3 report](m2/w3-simulation-report.md), [w4 balance report v1](m2/w4-balance-report-v1.md), Wilson CIs throughout). The blocker's original subject ("no results") is cleared; the band validation itself is measured parameter-unreachable at scripted competence and is M4's question with human data — the specific retune list is signed into G1. What remains of B1 rides G3 (M4 playtest), not M2.** |
| B2 | **Ruleset v1.0-alpha is paper-only.** No human has played a full case with the final D1–D14 rulings | M1 exit | Paper-prototype 3 cases × both roles; log disputes; freeze tag — **untouched (human-gated; fabrication guard intact)** |
| B3 | **Map content headroom is thin-ish.** 55/480 configs qualify **[computed]**; if ladder diversity demands more, the drop pool needs widening (16→24) | M3 content | Generator QA during M2; widen pool if the diversity quota (04-balance-sim §6.6) fails — **CLOSED at M2 (W1/W2 evidence): pool widened to 24 with a documented 8-node selection; full conjunction 115/2208 ordered configs pass (4.8× the 24-case ladder need); the ladder produces with C6 diversity green — `m2/aud003-constraint-analysis.md`** |

## 2.1 G1 sign-off (M2 exit — 01-prd §8; signed 2026-10-25)

> **G1 — engine + simulation gates — SIGNED OFF (retune-list branch).** L1 green (tsc strict;
> vitest 148/148: 115-config full-space reconciliation, worked-example goldens, regression
> constants end-to-end, §9.1–9.13 rulings, T16 override + v1.1-candidate tests, sim suites).
> Determinism green over 10,000 seeds in BOTH parameter worlds (canonical `w3-results/determinism.json`
> and the measured v1.1 candidate `w4-results/retune-determinism.json` — 0 mismatches each).
> Role win-rate: the 45–55% band is NOT met at scripted competence (65.3–67.9% W3; 63.9% under
> the measured candidate) and is measured **parameter-unreachable** (S1 + S4 + W4) — closing per
> the exit condition's explicit alternative: **a specific retune list** ([w4-balance-report-v1.md §2](m2/w4-balance-report-v1.md)):
> the measured P8 3→4 candidate (§5-rejected, preserved for M4 with its pacing trade-off
> quantified) + the day-1 route-diversity content lever. The band itself remains a rated-HUMAN
> target, honestly carried to M4. Engine tagged `engine@1.0.0-alpha.0`.

## 3. Stop-line condition

**If the M4 playtest fails the fun gate (R2), M5 multiplayer work does not start.** The roadmap treats this as a stop line, not a schedule slip: diagnose (pacing / information volume / role fantasy), fix solo, re-gate. This is the single most important project-control decision in the plan.

## 4. What is intentionally *not* claimed

- No simulations, playtests, or user research have been performed — every such artifact in these docs is a *specification* for future work.
- No market-size, revenue, or competitor-landscape claims appear in this doc set; market evidence lives in the research report with citations and uncertainty labels, and its gap statements remain absence-of-evidence claims to be re-validated (B4 below, re-validated at M5 store scan).
- The research-phase "38/40" concept score is not treated as evidence of anything.

## 5. Conditional items to re-open at their gates

1. **Q1 expiry direction** — re-decide with S1/S7 data at M2 exit (D8 is conditional by design).
2. **Q3 ranked handicaps** — revisit with real role win-rates at M6.
3. **B4 market-gap re-validation** — a fresh store/market scan before M5 spend (the research was a point-in-time survey; new entrants may exist).
4. **R9 iOS push spike** — before M5 build, not after.

## 6. Implementation-order recommendation (first 3 weeks)

1. **Week 1:** M1 paper playtests (B2) in parallel with engine type definitions (03-rules §1 state model is the type spec).
2. **Week 2:** `packages/engine` `resolve()` + day-resolution tests (09-testing §2 list is the task list); generator + BFS gate (B3 instrumentation starts here).
3. **Week 3:** property tests (determinism, info-wall at engine level) + sim harness skeleton; first S1 runs by end of week.
