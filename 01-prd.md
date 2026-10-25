# 01 — Product Requirements (PRD)

**Version:** 1.0-rc1 · **Owner:** product/design · **Status:** planning, pre-implementation

## 1. Vision

Dead Drop is an asynchronous 1v1 hidden-movement deduction duel. One player plans a heist route across a living city map; the other hunts them with sparse evidence, forensic probes, and one well-placed stakeout. Every case fits into a coffee-break-per-day habit over roughly a week — chess-by-correspondence tension with mobile-game pacing.

## 2. Problem

- Hidden-movement deduction (Scotland Yard lineage) has no modern asynchronous mobile form; existing digital versions are synchronous pass-and-play companions.
- Existing async mobile games with real depth are overwhelmingly word/puzzle/strategy imports; there is no deduction duel built notification-first.
- Solo deduction games lack structured mastery (ratings, calibration, fair difficulty curves).

These are research-phase observations, carried from the cited research report; they are **gap hypotheses to be re-validated** with a store/market scan before M5 (see 14-readiness, blocker B4).

## 3. Target users

| Persona | Description | Primary mode |
|---|---|---|
| **"Commute Analyst"** (primary) | 25–45, plays daily-brain-game rituals (wordle-like, chess puzzles). Wants a 3–5 min/day decision with real depth. No tolerance for realtime pressure or grind. | Solo ladder → casual async |
| **"Heist Planner"** (secondary) | Board-game enthusiast who likes asymmetric 2p duels (Scotland Yard, Specter Ops). Wants a ranked ladder and outsmarting humans. | Casual async → ranked |

Not targets (MVP): realtime PvP players, young children (reading-heavy UI), players seeking sessions >10 min.

## 4. Goals

1. Ship a deterministic, fair, rules-complete deduction duel whose outcome depends only on decisions — no RNG in capture resolution, no hidden per-player adaptation outside solo.
2. Make the async loop friction-free: one action per phase, deadlines that respect daily life, and a post-case replay that teaches.
3. Build the shared rules engine once and reuse it for client, server, simulation, and replay (four consumers, one artifact).
4. Validate fun and balance *before* building server infrastructure (M2 gates M3; M4 gates M5).

### Non-goals (MVP)

- Realtime anything (no realtime netcode, no chat).
- Monetization, ads, offers, IAP (deferred to M7; see 00-audit A11).
- Multiple maps, user-generated content, clan/social systems.
- Native app packaging (web-first PWA; Capacitor wrap is post-MVP).
- Full WCAG certification (baseline accessibility only, see 06-uiux §6).

## 5. MVP scope fence

**In MVP (M1–M4):**

- Ruleset v1.0-alpha implemented as a pure, deterministic engine (shared package).
- One map (`map_alpha`), case generator with BFS feasibility gate, 24-case solo ladder.
- Solo play vs. 3 scripted AI Fugitive archetypes + 1 baseline AI Investigator; manual belief markers; solo assist heatmap (disclosed, toggleable).
- Onboarding: two scripted tutorial cases (one per role).
- Local persistence, replay/log viewer, analytics events (privacy-preserving, opt-out).
- Simulation harness producing the balance report (this is an MVP deliverable, not optional).

**Out of MVP (explicitly deferred):** accounts/auth, backend, async MP, matchmaking, ratings, notifications infra, ranked, monetization, second map, 3-drop "Grand Tour" cases, leagues.

**Rejected (do not build):** client-authoritative hidden state; per-player hidden adaptation in PvP; purchasable information/power; randomized paid items; auto-heatmap outside solo; stakeout visibility variant; chat. Rationale in 00-audit and 11-decisions.

## 6. Success metrics (hypotheses — no baselines exist yet)

All targets are hypotheses to be validated at M4 playtest; they are not market claims.

| Metric | Hypothesis target | Why it matters |
|---|---|---|
| Tutorial completion | ≥ 80% of installs finish both tutorial cases | Onboarding is the difficulty curve (A15) |
| Case 1 (post-tutorial) completion | ≥ 60% | First real case must not churn |
| Solo ladder completion curve | 40–60% per case, falling variance by case 10 | The adaptive band (05-ai-spec §5) |
| Median probes-per-capture (Investigator, case 5+) | 4–7, improving with case index | Deduction is being learned |
| Role win-rate at equal skill (sim + playtest) | 45–55% per role | Core fairness gate (M2 exit) |
| P(true position) calibration of player markers | Positive correlation with play count | Skill model works (M4) |
| Playtest "would play again" (top-2-box) | ≥ 60% | Fun gate before MP investment |

Instrumentation: client events (phase completed, markers used, tutorial steps) + engine replay; no third-party ad/analytics SDKs in MVP beyond a privacy-respecting product-analytics choice made at M3 (decision logged, not yet made — Q9).

## 7. Platform & constraints

- **Platform:** web app, portrait-first (min 360×640), installable PWA; desktop portrait-column fallback.
- **Team:** 1 developer (+ playtesters). Budget: nights-and-weekends realistic.
- **Tech constraints:** TypeScript everywhere; no realtime infrastructure; server-authoritative hidden state (from M5; solo is local-first before that).
- **Privacy:** no account required for solo (MVP); player model (skill estimation) computed on-device; no cross-site tracking; GDPR/CCPA posture documented at M5 when accounts arrive (08-api-security §6).

## 8. Release gates

| Gate | Requirement |
|---|---|
| G1 (end M2) | Rules engine passes full rule test-suite; simulation report shows role win-rates within 45–55% band or produces a specific retune list |
| G2 (end M3) | Playable solo prototype: 24-case ladder completable, zero known rule bugs, tutorial completion ≥ 70% in internal testing |
| G3 (end M4) | 15–20 person closed playtest: fun gate + tuned parameters v1.1 + written balance findings |
| G4 (end M5) | Casual async: case completion ≥ 70% (non-forfeit), forfeit rate ≤ 15%, notification opt-in ≥ 60% |
| G5 (end M6) | Ranked live: rating system stable, anomaly flags < 2% of cases, uptime ≥ 99% over 30 days |
| G6 (end M7) | Monetization live in solo/casual only, verified no ranked purchasables; store packaging approved |

## 9. Dependencies & assumptions

- Assumes map_alpha's geometry supports the difficulty bands — **[computed]** feasibility headroom exists (55/480 configs in band) but *fun* headroom is unproven.
- Assumes the investigator prediction game (stakeouts) feels fair at 3 IP cost — [hypothesis], M2/M4 test.
- Assumes Web Push reliability is adequate for deadlines — [hypothesis], tested at M5.
