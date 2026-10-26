# ADR-007 — M3 W3: fugitive-side playable (S2), the measured I-GreedyProbe on-device, and Stage-3 skill measurement

**Status:** accepted (2026-10-26) · **Scope:** M3 Week 3 (roadmap M3 W3) · **Supersedes:** nothing · **Companion:** `adr-005-m3-w1-web.md`, `adr-006-m3-w2-content-ai-replay.md`, `m3/M3-execution-plan.md`

## Context

W2 shipped the investigator-side game (archetypes, ladder, history/replay, tutorial). W3's pre-registered scope closes the loop: the HUMAN can now sit in either seat. That requires (1) a fugitive case screen (06-uiux S2: route ribbon, stamina bar, leak calendar, commit-move bottom sheet), (2) an Investigator AI (05-ai-spec §2's `I-GreedyProbe`) that plays behind the same §1.3 wall, and (3) Stage-3 skill measurement (05-ai-spec §4, rolling windows, on-device).

## Decisions

### D1 — The web AI is a VERBATIM PORT of the sim's measured policy, and parity is a permanent test

`apps/web/src/lib/dd/belief-tracker.ts` is a line-for-line port of `packages/sim/src/belief.ts` (the M2 W3 exact Bayesian filter that produced the recorded 133,500-case matrix), and `apps/web/src/lib/dd/i-greedy.ts` ports the sim's `I-GreedyProbe` decide loop plus the harness's step-6 action loop (decide → submit until WAIT). Rationale: the on-device opponent must be the SAME opponent the balance data describes — a re-derivation would silently diverge from the measured policy (the sim's pilot fixed three real defects in this exact code; a fresh implementation would re-expose them).

Parity is enforced, not assumed: `packages/sim/test/w3-webport-parity.test.ts` drives 55 randomized cases through the REAL engine (random feasible fugitive moves + noisy probes/stakeouts, so both trackers consume reveals, drop completions, STRANDED, probe HIT/MISS, stakeout misses), snapshots every investigator decision, and requires bit-close posteriors (1e-12) on node marginals, argmax, and predictive argmax — under canonical AND T16-override parameters. Suite total: 150/150.

- **Case identity (fugitive role):** (seed + role + the HUMAN's fugitive journal). The AI Investigator is a pure function of public state (no RNG — lexicographic tie-breaks), so replaying the journal through the engine + `runInvestigatorAi` reproduces the case bit-for-bit. Same model as W2's (seed + archetype + investigator journal), now role-scoped. One AI path everywhere (live, resume-replay, history-rebuild) — the ADR-005 D3 discipline, extended to the second seat.

### D2 — The web opponent is the MEASURED policy, including its stakeout convention

05-ai-spec §2's prose says I-GreedyProbe "stakes only when the posterior maximum ≥ 0.4 **and remaining days ≤ 4**"; the sim's recorded policy gates on mass only (the M2 W3 header records the pilot-justified hybrid: GATE on current posterior ≥ 0.4, AIM at the predictive argmax — the §2-step-2 resolution moment). The web AI ports the MEASURED code. The spec's ≤4 clause stays a spec-side question for M4's AI-spec reconciliation (it describes no recorded run); deviating on-device would make the app's opponent something the balance numbers never measured. Registered here so the M4 pass can rule on the clause with this decision in hand.

### D3 — Skill measurement: the spec's four axes per role get explicit MVP formulas; tiers are a documented calibration call

`apps/web/src/lib/dd/skill.ts` operationalizes 05-ai-spec §4. Per closed case, facts are collected from LIVE engine state + the §8.6 disclosure at finalize (`collectSkillFacts`) and persisted on the history record (no extra store; the replay viewer and the skill windows share one source of truth):

- **Investigator:** efficiency (window probes ÷ captures; undefined with zero captures), calibration (mean exact-posterior mass on the TRUE final position — a fresh tracker is synced once at close), budget (mean unspent-IP share), stakeout conversion (hits ÷ stakes; probes never capture, so CAPTURE ⇔ one stakeout hit).
- **Fugitive:** escape rate, deception (stakeouts-faced miss rate, read from the disclosure's private log — §8.6 makes it visible at close even though it was silent in life), reveal exposure (share of scheduled reveals that carried TRUE information, route vs log), stamina discipline (unspent-SP share on escapes).
- **Windows/tiers:** rolling last 10 closed cases per role, on-device (localStorage/IndexedDB only — no transmission, per spec). Scalar tier Novice / Analyst / Detective / Ghost-hunter from a weighted composite (investigator: calibration .30 / conversion .30 / budget .20 / efficiency .20; fugitive: escape .40 / deception .25 / exposure(inv) .20 / stamina .15; weights renormalized over measurable axes). Thresholds 40/55/70 are an MVP calibration call — revisited at M4 with real skill-curve data. Unmeasurable axes contribute `null` and drop out honestly (they never count as strength).

### D4 — Fugitive S2 screen: role-scoped projection layers; stakeouts stay silent by rule

The map renders role-scoped views only: fugitive mode pins the player's OWN position ("YOU") and suppresses every investigator-private layer (probe pins, armed-stakeout ring, belief halo). Stakeouts are silent to the fugitive in life (§5.2) and become visible only inside the §8.6 verdict card ("Their private results — revealed at close"). The panel carries the S2 spec items: stamina bar (segmented, red ≤3), drop/gate checklist, route ribbon (the player's own journal + public STRANDED events), leak calendar (scheduled D3/D4/D6/D8 with what ACTUALLY leaked so far), and the commit sheet (cheapest parallel edge per T15, class + SP + "leaves N SP" + a transit-reveal warning when today's move publishes).

### D5 — §9.13 stranded days auto-resolve; the S2 banner is a defensive fallback

A stranded day has zero player agency (FORCED_HOLD is engine-produced, T4). The shared `aiInvestigatorTurn` helper therefore auto-resolves consecutive stranded days after each AI turn (live play, resume-replay, history-rebuild alike), with a toast per day. The panel's stranded banner + "Resolve stranded day" button remains as a defensive fallback (e.g. unexpected resume states) but is normally unreachable — browser-verified: a 12-SP burn to SP=0 produced four public §9.13 days and the day-8 EXPIRY, journaled correctly (stranded days are engine-produced, never journaled).

### D6 — Role views project MUTABLE engine state: the store clones at the boundary

Found during W3 E2E: `investigatorView()`/`fugitiveView()` return projections whose `log` / `private_log_investigator` are the engine's LIVE arrays (pushed in place, never cloned). Any React memo keyed on array identity (`MapCanvas` reveal tints and HIT pins — a latent W1 hazard — plus the new panel's leak calendar) goes stale. Fix at one boundary: the store's `projectI()/projectF()` shallow-clone the live arrays on every projection; data is identical, identity is fresh. Component-level memos were left intact where identity is now guaranteed. Engine untouched (0 rules churn; 150/150 including the parity gate).

## Verification record (sandbox host, agent-browser; all green, zero console errors)

- **Capture (AI kill chain):** seed 1624445643 — day-1 probe HIT on the lexicographic modal node → tracker locks → stakeout armed at the PREDICTIVE argmax → capture at the player's next submission. Verdict card frames the loss for the fugitive seat; the evidence tab shows the investigator's private results as §8.6 reveals.
- **Escape:** seed 31337 (offline pre-verified route, W2 tutorial-seed method) — drop[0] day 1, gate day 5, ESCAPE, 2/3 stakeout misses faced across the session's cases.
- **Expiry + §9.13:** seed 4, 12-SP metro burn → four public stranded days → day-8 EXPIRY; route table shows 4 moves ×3 SP + 4 stranded ×0.
- **Reload-resume (fugitive):** case resumed mid-way reproduced day/SP/ribbon exactly (journal replay + deterministic AI investigator).
- **History replay (fugitive-role records):** both records rebuilt through the engine + AI investigator (scrubbers max = route length); role badge in the history list.
- **Skill profile:** windows update from closed cases (0/1 escaped → 1/2; deception 2/3; exposure/stamina axes populated; tiers Novice).
- **Investigator regression:** probe MISS toast, end-phase day advance, journal intact after the store refactor.
- **Build closure (repo space):** npm ci → typecheck → vitest 150/150 (148 + 2 parity) → engine+sim build → web lint → `next build`, all green.

## Consequences

- Both seats are solo-playable against spec-faithful opponents; the M4 AI-spec reconciliation owns the ≤4-days clause (D2) and the tier-threshold calibration (D3).
- The parity test permanently couples `apps/web`'s tracker to `packages/sim`'s — a sim-side change now fails the web suite until the port follows (intended: one measured opponent).
- Fugitive-side cases are solo-only (no ladder); ladder stays investigator-side (S7 unchanged). Fugitive ladder/queue design belongs to M5+.
