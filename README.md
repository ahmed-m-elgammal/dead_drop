# Dead Drop — Design Documentation

**Version:** 1.0-rc1 · **Status:** Planning (no implementation) · **Supersedes:** §5 "DEAD DROP" in [`research/game-concept-research.md`](research/game-concept-research.md) wherever the two conflict.

Dead Drop is an asynchronous 1v1 hidden-movement deduction game: an **Investigator** hunts a **Fugitive** across a city map over 8 in-game days, using information, probes, and stakeouts. Mobile-first portrait, web-first, solo AI practice included.

## Document Map & Sources of Truth

| Doc | Contents | Authority |
|---|---|---|
| [00-audit.md](00-audit.md) | Critical audit of the original concept: 18 findings with impact/solution/trade-offs | Reference (reasoning) |
| [01-prd.md](01-prd.md) | Product requirements, scope, MVP boundary, success-metric hypotheses | **Source of truth: scope** |
| [02-gdd.md](02-gdd.md) | Design pillars, loops, role fantasies, difficulty philosophy, content model | **Source of truth: design intent** |
| [03-rules.md](03-rules.md) | Complete deterministic ruleset v1.0-alpha + state machines + worked examples | **Source of truth: rules** |
| [04-balance-sim.md](04-balance-sim.md) | Parameters, computed analytical checks, simulation methodology (not yet run) | **Source of truth: parameters & validation plan** |
| [05-ai-spec.md](05-ai-spec.md) | AI archetypes, investigator policy, skill model, adaptive difficulty (solo-only) | Source of truth: AI behavior |
| [06-uiux.md](06-uiux.md) | Screens, flows, onboarding, notifications, accessibility | Source of truth: UX |
| [07-architecture.md](07-architecture.md) | System boundaries, tech choice rationale, data model, case lifecycle | **Source of truth: architecture** |
| [08-api-security.md](08-api-security.md) | API contracts, idempotency, error envelope, hidden-info & privacy boundaries | Source of truth: API |
| [09-testing.md](09-testing.md) | Testing strategy and acceptance criteria per feature | Source of truth: QA |
| [10-roadmap.md](10-roadmap.md) | M1–M7 milestones, MVP vs post-MVP vs rejected, exit conditions | **Source of truth: plan** |
| [11-decisions.md](11-decisions.md) | Decision log (ADR-style) with rationale and rejected alternatives | Reference |
| [12-risks.md](12-risks.md) | Risk register with likelihood/impact/mitigation | Reference |
| [13-open-questions.md](13-open-questions.md) | Unresolved decisions requiring a human | Reference |
| [14-readiness.md](14-readiness.md) | Quality-gate results and blockers to implementation | **Gate document** |
| [assets/sample_map_alpha.json](assets/sample_map_alpha.json) | Concrete 48-node map (content data, versioned separately from rules) | **Source of truth: map data** |
| [research/game-concept-research.md](research/game-concept-research.md) | Upstream concept-research report (superseded where it conflicts) | Reference (upstream) |
| [tools/verification/](tools/verification/README.md) | Offline verification scripts + raw results (pure Python, no deps; verification, **not** simulation) | Reference (computation) |
| [m2/](m2/M2-execution-plan.md) | M2 planning & analysis (execution plan, AUD-003 generator-constraint resolution, toolchain ADR) | See M2 section |
| [packages/engine/](packages/engine/README.md) | `@dead-drop/engine` — pure deterministic engine package: type layer (T12), map validation, pinned feasibility gate, seeded generator (C1/C5/C6), **`resolve()` — the full §2 day resolution** (ADR-002 DRAFT-UNFREEZE), L1 fixtures | M2 W2 **done** (63/63 green) |

### M1 — Requirements & design validation (in progress)

| File | Contents | Status |
|---|---|---|
| [m1/M1-execution-plan.md](m1/M1-execution-plan.md) | Week-by-week M1 plan, exit tracking, M2 handoff | W1 done; W2–W3 tooling done, sessions+freeze pending |
| [m1/w1-rules-audit.md](m1/w1-rules-audit.md) | Week-1 rules-completeness audit + dispute log (DIS-001, AUD-002..005) | Executed |
| [m1/playtest-protocol.md](m1/playtest-protocol.md) | W2–W3 paper-playtest protocol with 3 verified cases (P1–P3) | Ready |
| [m1/kit/](m1/kit/README.md) | Paper-prototype kit: print map, reference cards, log sheets | v1.0 (ruleset 1.0.0-alpha.1) |
| [m1/sessions/](m1/sessions/README.md) | Session-transcription templates (S1/S2/S3), triage registry, engineered-state ledger | Tooling ready — **no session data may be fabricated** |
| [m1/engine-types/](m1/engine-types/README.md) | W2 engine type-spec draft (types only) + 10 drafting findings T1–T10 | Draft v0.1 |
| [m1/freeze-checklist.md](m1/freeze-checklist.md) | W3 close-out pre-flight: evidence gates, freeze Branch A/B, ready-to-paste gate texts | Pre-flight built |
| [m1/m2-handoff.md](m1/m2-handoff.md) | M2 handoff: constants, AUD-003 first task, type-layer contract | Pre-written (two `[AT FREEZE]` fields) |

M1 status (2026-10-25): Weeks 1–3 tooling complete — ruleset at **`1.0.0-alpha.1`** (no-TBD grep clean, re-verified), session kit ready for S1–S3, freeze pre-flight + M2 handoff pre-written with `[AT FREEZE]` fields. M1 *closes* only when the human-run sessions produce transcript evidence (audit §7 tally) — then: freeze tag, B2 closure, handoff finalization.

### M2 — Rules engine & mathematical simulation (Week 1 + W2 pre-flight executed)

| File | Contents | Status |
|---|---|---|
| [m2/M2-execution-plan.md](m2/M2-execution-plan.md) | Week-by-week M2 plan (engine, sim harness, balance report), G1 exit tracking | W1 done; W2 pre-flight done; resolve() freeze-gated |
| [m2/aud003-constraint-analysis.md](m2/aud003-constraint-analysis.md) | AUD-003 resolution: C3 semantics **pinned** (min-cost), conjunction counted (8/960 base), lever adopted (drop pool 16→24 → **115/2208** pass, 4.8× ladder headroom), generator constraint spec v1.0 | Executed |
| [m2/adr-001-toolchain.md](m2/adr-001-toolchain.md) | Toolchain decision: Node 24 + TS 5.9 strict/NodeNext, npm workspaces, vitest; zero runtime deps for the engine | Accepted 2026-10-25 |

M2 status (2026-10-25): Week 1 (AUD-003) and **Week 2 executed** — toolchain per [ADR-001](m2/adr-001-toolchain.md); `packages/engine` ships the type layer (T12 amendment), the pinned feasibility gate (1:1 Python-oracle port), the seeded generator (C1/C5/C6) and **`resolve()`** — the §2 seven-step day resolution, unlocked ahead of the freeze tag by [ADR-002](m2/adr-002-resolve-unlock.md) with a DRAFT-UNFREEZE marker + a transcript-reconciliation gate in freeze-checklist §1 (the fabrication guard is untouched: S1–S3 remain human-gated, no session data exists). Verified: `tsc` strict green, vitest **63/63 green** — 115-config full-space reconciliation, the rules' own worked examples (W1/W2/W3) as golden tests, all four regression constants escaping end-to-end, §9.1–9.13 rulings on a synthetic micro map, and a seed→generator→verdict chain closing the W2 exit line. Next: W3 sim harness + 20-pair policy matrix. Sessions S1–S3 remain human-gated; M1 closes only on real transcript evidence.

## Conventions

- Ruleset and balance parameters are versioned (`ruleset_version`); cases store the version they were created with (see 07-architecture).
- Content data (maps, case configs, narrative flavor) is data, not code — kept in `assets/` or generated by the case generator with recorded seeds.
- Claims are labeled: **[computed]** = closed-form calculation actually performed (see `tools/verification/dd_map_and_calcs.py` output); **[hypothesis]** = to be validated by simulation or playtest; **[uncited]** = opinion/judgment.
- No balance claim in these documents is "proven." No simulation has been run yet. See 04-balance-sim §6 and 14-readiness.
- Mermaid diagrams are used for state machines, flows, and architecture.

## One-paragraph rules summary (see 03-rules.md for the binding text)

Each of 8 days resolves in a fixed order: the Fugitive secretly moves one node (Foot/Tram/Metro or Hold, paying stamina), any armed stakeout resolves (capture = Investigator win), scheduled evidence is revealed (district on days 3 & 6, transit class on day 4, drop completions are public), then the Investigator spends Intel Points on probes (information) and at most one stakeout (a trap that captures the Fugitive if they end the *next* day on the staked node). The Fugitive wins by ending a day on the public exit gate after collecting two ordered public drop sites; the Investigator wins by stakeout capture, or when Day 8 ends without an escape.
