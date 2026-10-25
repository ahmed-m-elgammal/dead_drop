# 11 — Decision Log (ADR-style)

Format: **D# · Decision — Context → Decision → Rationale → Alternatives rejected → Consequences.** Status labels: *Adopted*, *Deferred*, *Revisit-if*.

---

**D1 · Positionless Investigator.** *Adopted (M1).*
Context: Scotland Yard-style detectives move on the board; ours plays over days asynchronously.
Decision: the Investigator has no board position; probes/stakeouts target any node, budget-gated.
Rationale: async pacing with a moving second side doubles the awaited-turn count and complicates probe semantics; the information duel is the game's identity.
Rejected: agent network with adjacency constraints (richer zoning, but a different, more 4X game and a much larger balance surface).
Consequences: capture depends purely on prediction; if M4 shows Investigators lack agency, the first fix is information volume, not movement.

**D2 · Sequential day phases (Fugitive moves → evidence → Investigator acts).** *Adopted.*
Context: async simultaneity is possible but complicates probe semantics ("probe *when*?").
Decision: strict per-day order per 03-rules §2.
Rationale: the Investigator's reactive loop is the game; simultaneity breaks it.
Rejected: simultaneous daily submission.
Consequences: Fugitive holds per-day initiative — measured as scenario S3 in the sim; if it dominates, the lever is budget values, not phase order.

**D3 · Probes inform; only stakeouts capture.** *Adopted.*
Context: original concept had probes capturing and adjacency stakeouts (audit A1).
Decision: probe = 1-bit information (1 IP); stakeout = armed trap capturing on next-day end-position match (3 IP).
Rationale: preserves the deduction→prediction arc; makes capture an earned, gamble-flavored event.
Rejected: probe-captures (collapses economy); adjacency triggers (4–7× stronger on hubs, unpredictable to the Fugitive).
Consequences: stakeout pricing (P8) becomes the single most balance-sensitive number.

**D4 · Stakeout/probe secrecy until case end.** *Adopted.*
Context: whether the Fugitive sees placements changes the whole Fugitive game (A13).
Decision: all Investigator actions are private until the verdict; full logs after.
Rationale: "the Fugitive plays against the calendar; the Investigator plays against the person."
Rejected: visible stakeouts (turns the game into area denial — revisit only as a separate ranked variant with its own balance work).
Consequences: Fugitive losses can feel arbitrary — mitigated by the mandatory post-case replay; noted as a playtest focus.

**D5 · Drops & gate public; drop completions are public events; start node public.** *Adopted.*
Context: route skeleton needed for deduction; start knowledge bounds opening entropy (A5/A6).
Decision: case config fully public (safehouse, 2 ordered drops, gate); drop completions broadcast.
Rationale: gives both roles a shared strategic skeleton; drop events act as structural position pins, replacing a denser reveal schedule.
Rejected: secret drops (aimless sweeping; breaks the containment verdict).
Consequences: total information volume is high — the reveal schedule was trimmed to compensate; S2 sweep validates.

**D6 · 2-drop MVP case shape; 3-drop deferred.** *Adopted (computed).*
Context: **[computed]** 3-drop 8-day cases are infeasible (min 12–13 days; 0/480 configs ≤ 8 days even at SP=16).
Decision: MVP = 2 ordered drops + gate, 8 days, SP 12; generator BFS gate min-days ∈ [5,7] (55/480 headroom).
Rejected: bigger stamina (sweep shows geometry-bound); longer cases (async attrition).
Consequences: "Grand Tour" 3-drop/10-day format is post-MVP content expansion, not a rules change.

**D7 · Manual belief markers; assist heatmap solo-only.** *Adopted.*
Context: a server-computed posterior is the answer key (A7).
Decision: players mark nodes manually (3-state cycle); the auto-heatmap exists only in solo, disclosed as an assist and used as a DDA lever.
Rejected: always-on heatmap; never-any-heatmap (newcomers need a scaffold).
Consequences: skill model measures markers vs. ground truth locally; some calibration fidelity lost vs. numeric posteriors — accepted.

**D8 · EXPIRY = Investigator win; no draws.** *Adopted, with sim gate.*
Context: async needs a total verdict function (A9).
Decision: Day-8 expiry without escape → Investigator wins; mutual abandonment → VOID; forfeits per §7 clocks.
Rationale: the Fugitive owns the clock and the escape check; expiry is an anti-idle guard, not a strategy.
Rejected: Fugitive-wins-ties (would push Investigators into hyper-aggression).
Consequences: **[hypothesis]** — Q1 must be confirmed by sim S1/S7 before ranked ships; flagged in 14-readiness as a conditional.

**D9 · No retro-probes.** *Adopted.*
Context: "was the fugitive here *yesterday*?" would double probe value and muddle the daily rhythm.
Decision: probes always interrogate the just-resolved day.
Consequences: information is perishable by design — the day rhythm gains urgency.

**D10 · Two-queue rated ladders (Investigator / Fugitive).** *Adopted (M6).*
Context: asymmetric roles make a single ladder and random role assignment messy.
Decision: separate queues and ratings per role; matchmaking pairs cross-queue.
Rejected: single ladder with role-adjusted expected scores (opaque, hard to explain).
Consequences: early-queue wait is the main risk (R8); a combined ladder is a revisit-if population data demands it.

**D11 · DDA solo-only, disclosed, bounded.** *Adopted.*
Context: research-phase system requires adaptive difficulty; audit A8 forbids hidden adaptation in PvP.
Decision: all adaptation (archetype blend, ±IP/±SP, assist heatmap, one informant upgrade) is solo-only, disclosed in the case log, and bounds-capped (05-ai-spec §5).
Rationale: keeps ranked deterministic and seed-auditable.
Consequences: ranked newcomers face fixed-strength opposition; matchmaking bands carry that load.

**D12 · Monetization deferred to M7 with a permanent ranked firewall.** *Adopted.*
Decision: no ads/IAP in MVP; when they arrive: solo/casual only, ≤3 rewarded/day, cosmetics-first, never information/power, never randomized paid items.
Rationale: deduction duels live on perceived fairness; early ads contaminate playtest telemetry (A11).
Consequences: slower revenue; accepted deliberately.

**D13 · Web-first PWA + shared TS engine + Fastify/Postgres; no realtime infra.** *Adopted.*
Context: 07-architecture options A–D.
Decision: Option B (monorepo, engine-as-pure-function, boring server).
Rationale: one engine = four consumers; hidden-info integrity needs server authority; no realtime requirement exists.
Rejected: BaaS (leaky domain logic), realtime stacks (overkill), client-authority (fatal), game engines (wrong tool for map+forms).
Consequences: solo dev operates a small server from M5; runbook required (R6).

**D14 · Cut list from the research concept.** *Adopted.* Zone-rule-out "analyses" (redundant), "stamina forces you near probe patterns" (unimplementable in PvP — re-purposed as ambiguity slack, A3), "case reconstruction replay" ad reward (the replay is free — it's the teacher), ranked IP handicaps (deferred, data-gated, Q3).

**D15 · Skill model stays on-device through MVP and beyond.** *Adopted.*
Decision: player-model tiers computed and stored locally; no server-side player profiles; ranked uses only match outcomes.
Rationale: privacy posture + the model is a convenience, not a competitive input.
Consequences: cross-device skill continuity needs an explicit opt-in sync later (open question Q10).

**D16 · M2 W4 retune: measure, obey the pre-registered §5 rule, adopt nothing.** *Adopted (M2 W4).*
Context: W3 measured band/dominance/pacing FAIL and named P8 3→4 as the headline lever; 04 §5 requires ≥2 desired metric moves without regressing a third.
Decision: the candidate was measured CRN-paired (20-pair matrix + 10k-seed determinism, `m2/w4-results/`) — camping dominance decisively fixed (93.2→65.6) but pacing regressed (1.9→0.6%) — **not adopted**; parameter table stays v1.0-alpha; the candidate is preserved as data (`RETUNED_CANDIDATE_P8_4`) for M4 re-evaluation with human play.
Rationale: the pre-registered rule exists to stop headline-fix adoption pressure; rules churn before any human session is the freeze discipline's last resort.
Consequences: M4 inherits a pre-measured decision (including the pacing trade-off); the band/pacing root cause is the opening-information structure — M2-exit map revision inherits the day-1 route-diversity brief. Full record: ADR-004, w4-balance-report-v1.md.
