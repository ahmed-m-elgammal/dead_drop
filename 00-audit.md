# 00 — Critical Audit of the Original Concept

**Input:** §5 "DEAD DROP" of the research report (the only prior design artifact). **Method:** each claim and mechanic was re-derived, checked for internal consistency, tested against the async/mobile constraints, and — where checkable — verified computationally (see the **[computed]** labels; calculations live in `scripts/dd_map_and_calcs.py`, outputs in `scripts/balance_calc_results.json`). No market evidence is asserted in this audit; market claims from the research phase remain cited there and are out of scope here.

**Verdict up front:** the concept's identity (async 1v1 hidden-movement deduction, mobile portrait, solo AI practice) survives the audit. Its mechanics do not survive unchanged. Five mechanics were cut or replaced, two parameter guesses were falsified by computation, and the ranked/monetization design needed stronger trust firewalls. Each finding below states the problem, impact, proposed resolution, alternatives considered, and trade-offs accepted.

---

## A1. Capture was ambiguously defined (probe vs. stakeout)

**Problem.** The original text has the Investigator win by "a probe landing on the true node, or a stakeout when the Fugitive ends their day adjacent." A probe that *captures* and a stakeout that triggers on *adjacency* are two half-overlapping, under-specified capture rules. Impact: without a precise capture rule, "probe = information or capture?" is unanswerable, and adjacency-based capture would make stakeouts ambushes on 6–7 nodes at once (degree of the staked node), which the Fugitive can neither predict nor respect.

**Resolution.** Strict separation. **Probes never capture** — they return one bit ("was the Fugitive at node X at end of today?"). **Stakeouts are the only capture mechanic** — an armed stakeout captures if the Fugitive *ends* a day on that exact node the following day. Adjacency is removed entirely.

**Alternatives.** (a) Probes capture too — rejected: collapses the two actions into one economy and removes the deduction→prediction arc. (b) Adjacency stakeouts — rejected: makes stakeouts 4–7× stronger on hub nodes, unbalanceable, and feels unfair. (c) Stakeout triggers on *passing through* — rejected: invisible mid-edge checks are opaque and unverifiable for players.

**Trade-off.** Capture now requires the Investigator to *predict* rather than *confirm*, which raises the skill floor and makes the last step of every capture a gamble. This is intended (it creates the game's signature tension) but must be tuned via the stakeout-cost parameter (04-balance-sim P8).

## A2. "Analyses" (zone rule-out) was a redundant third resource

**Problem.** Three investigator resources (probes, analyses, stakeouts) with overlapping functions. Impact: rules bloat, UI complexity, and a resource whose value collapses after any district reveal (ruling out a zone the evidence already cleared).

**Resolution.** Cut. Two actions remain: Probe (1 IP) and Stakeout (3 IP). Zone-level information comes from the scheduled district reveals instead.

**Alternatives.** Keep analyses as a "bulk buy" (3 IP = rule out a district) — rejected for MVP; it may return post-MVP as a solo-mode assist if playtesting shows information starvation.

**Trade-off.** The Investigator's decision space is narrower (2 actions). Accepted for MVP simplicity; the reveal schedule carries the strategic rhythm.

## A3. The Fugitive's stamina "forcing" behavior was impossible as written

**Problem.** Original: stamina "forces you near the investigator's historical probe patterns." In PvP the Fugitive cannot see probe history (A8 resolves why they shouldn't), so this mechanic is unimplementable as written. Impact: a core sentence of the concept was decorative.

**Resolution.** Stamina is re-purposed honestly: it prices transit classes and **Holds**, and its real function is to create *route-ambiguity slack*. A Fugitive with surplus stamina can afford deceptive detours and Holds; a starved one must beeline the shortest path and becomes predictable. **[computed]** On map_alpha, minimal completion cost for representative 2-drop cases is ~8–10 SP; the canonical budget SP=12 leaves ~2–4 SP of deliberate slack.

**Alternatives.** Stamina regen per day — rejected for MVP (a second clock to balance). No stamina at all — rejected: removes the transit-cost game and the Hold economy.

**Trade-off.** Stamina is now a soft pressure, not a hard timer. If simulation shows it never binds, the budget drops (sensitivity plan in 04-balance-sim §5).

## A4. The original case shape (3 drops, 8–10 days) is geometrically infeasible **[computed]**

**Problem.** Exhaustive BFS over the sample map (48 nodes, 84 edges) shows: the *most feasible* 3-drop + gate case requires **12 minimal days** at SP=14 (and 13 with the widened candidate pool); **0 of 480** drop/gate/start configurations complete within 8 days even at SP=16. Three ordered drops across a 4-district map is a 12–15 day tour. Impact: the original "10–14 day case, 3 drops" concept was internally inconsistent — the Fugitive could not actually win inside the advertised window on any tested configuration.

**Resolution.** MVP case shape: **2 ordered drops + 1 gate, 8 days, SP=12**. The case generator must verify by BFS that minimal completion days ∈ [5,7] before accepting a case. **[computed]** With a 16-site candidate pool, 55/480 configurations qualify (11.5%) — enough ladder variety for MVP. A "Grand Tour" 3-drop format (10 days) is post-MVP.

**Alternatives.** (a) Bigger SP budget — falsified by sweep: feasibility is bound by day-geometry, not stamina. (b) 9–10 day cases — rejected for MVP: async attrition scales with case length (A10). (c) Denser map — deferred; map v1.1 with 16 drop candidates already improved headroom 4→9 (8-pool) → 55 (16-pool).

**Trade-off.** Two drops give the Investigator two exact position pins (drops are public events, A6) — less hidden depth than three. Accepted; the reveal schedule and stakeout mind-games carry the mid-game.

## A5. Start position was unspecified

**Problem.** Whether the Investigator knows where the Fugitive starts was never stated. Impact: with an unknown start among 48 nodes, opening probes are near-blind (**[computed]** 2.08% hit probability under a uniform posterior), and Day 1–2 becomes rng-flavored for new players.

**Resolution.** The Fugitive's **start node (safehouse) is public** — matching the Scotland Yard convention, where detectives begin knowing Mr. X's start. Day-1 uncertainty is bounded by the start node's degree (2–7 options).

**Alternatives.** Secret start among the two safehouse candidates — rejected for MVP: it doubles early-game entropy before the player has learned anything; may return as a difficulty tier.

**Trade-off.** Experts lose some opening mystery. Accepted: the drop schedule and reveal days re-open uncertainty fast.

## A6. Drop-site information model was ambiguous

**Problem.** Original: drops are "collected" with "the fugitive informed privately." If drop completions are private and sites are secret, the Investigator has no route skeleton to deduce against; if sites are secret but completions public, the game contradicts itself.

**Resolution.** **Both public:** the case's two active drop sites (from a 16-candidate pool) and the exit gate are marked on the map from Day 0, and each drop completion is a public event (site + day). The Fugitive's route therefore has a known, ordered skeleton; the mind-game is *which path, which transit, which day* — not *where*.

**Alternatives.** Secret drop sites — rejected: turns the mid-game into aimless sweeping, which playtests of hidden-movement games conventionally punish; also incompatible with the containment win condition.

**Trade-off.** Each drop completion is effectively one exact position pin. The scheduled reveal budget was reduced accordingly (days 3 & 6 district, day 4 transit — down from a denser sketch) to keep total information in a tunable band (04-balance-sim §5).

## A7. The auto-heatmap solves the game for the player

**Problem.** The original concept gives the Investigator a "persistent probability heatmap." A server-computed Bayesian posterior on the map *is the answer key*: it converts deduction into texture-reading, kills the skill ceiling, and makes losing feel like theft.

**Resolution.** The Investigator's belief tracking is **manual**: three marker states per node (possible / pinned / cleared). The auto-heatmap exists only as a **solo-mode assist**, is disclosed as an assist, and is one of the adaptive-difficulty levers (05-ai-spec §5). In casual and ranked it is unavailable. Player-marked beliefs are still measurable (vs. ground truth) for the skill model — measurement does not require showing the answer.

**Alternatives.** Heatmap always on — rejected (A7's problem). Heatmap never — rejected: solo newcomers need a scaffold; the research-phase player model explicitly wanted calibration data.

**Trade-off.** Manual markers are more work on a phone; the marker UI must be three-tap fast (06-uiux). Calibration analytics lose some fidelity vs. a numeric posterior; accepted.

## A8. Any per-player difficulty adaptation in PvP is rigging

**Problem.** The original concept let "ranked fugitive behavior parameters" vary and hinted at adaptive evidence. In a duel, adapting *anything hidden* per player is indistinguishable from rigging — the same suspicion that permanently haunts letter-dealing in popular word games (documented in the research phase) and rubber-band AI.

**Resolution.** **Ranked and casual cases are fully deterministic:** fixed reveal schedules, fixed budgets, generator-verified cases, unique seeds per match. All adaptation lives in **solo mode only** (AI archetype blend, ±1 IP, ±2 SP, assist heatmap, optional reveal upgrades). This is the report-wide trust firewall, now applied strictly to this game.

**Alternatives.** Disclosed handicaps in ranked (extra IP for lower-rated players, visible pre-case) — deferred, not rejected: it is trust-compatible by design (transparent, like golf handicaps), but adding it before we have role win-rate data would be tuning in the dark. Logged as open question Q3.

**Trade-off.** Ranked newcomers face fixed-strength opposition with no guardrails; matchmaking bands (±100 rating) must carry that load.

## A9. Timeout and draw conditions did not exist

**Problem.** Original: Fugitive wins by escape, Investigator by capture. Nothing says what happens at Day 8, when a player vanishes, or whether a draw exists. Impact: unplayable async — someone must own the clock.

**Resolution.** (1) **Day-8 expiry without escape = Investigator win** (hypothesis, see below). (2) Turn deadlines: casual 24h/phase, ranked 12h/phase; first miss = nudge notification, **two consecutive misses = forfeit**. (3) **No draws**: if both players would be forfeited for the same day (mutual abandonment), the case is voided with no rating change. (4) Explicit forfeit action for either role, with a one-tap confirm.

**Why Investigator wins expiry:** the Fugitive has full route freedom and the escape check can fire any day from the minimum; the expiry rule exists to prevent infinite evasion, not to be a primary strategy. **[hypothesis]** This makes the Fugitive the clock-owner and the Investigator the pressure-side; simulation must confirm the resulting win-rate split (target: 45–55% per role at equal skill). Alternative (Fugitive wins ties) would push Investigators to hyper-aggression — flagged as open question Q1, to be settled by the M2 simulation, not by fiat.

**Trade-off.** A passive-but-lucky Investigator can win by schedule. Accepted as a rare fallback vs. idle opponents; forfeit rules cover actual idleness.

## A10. Asynchronous pacing and abandonment were unspecified

**Problem.** "A case runs 10–14 rounds" with per-day phases means 20–28 awaited turns — at 24h/phase that is 3–4 real weeks. Impact: notification fatigue, stale cases, rating purgatory.

**Resolution.** 8-day case ⇒ ≤16 player actions (2 phases/day × 8 days) ⇒ ~4–8 real days in casual, ~2–4 in ranked, hours in an active match. Deadline ladder: reminder at T-6h, deadline, grace miss, forfeit on 2nd consecutive miss. "Your turn" is always a single crisp action (one move, or one action bundle). Push digest (max 1 summary/day) plus critical pushes (your turn, reveal day, capture).

**Alternatives.** Simultaneous daily submission (both act, then resolve) — rejected: it breaks the Investigator's reactive loop, which is the game; also complicates probe semantics ("probe *when*?").

**Trade-off.** Sequential phases mean the Fugitive always acts first each day — a slight initiative edge that the sim must measure (04-balance-sim §4, scenario S3).

## A11. Monetization leaked power into ranked

**Problem.** Original concept: rewarded ad "+1 probe today," offers for consumable toolkits — with no mode firewall. Impact: any purchasable information advantage in a deduction duel is pay-to-win by definition, and store-policy-wise, randomized paid items would trigger odds-disclosure obligations (research-phase finding, carried forward).

**Resolution.** **Mode firewall:** monetization exists only in solo and casual, capped (≤3 rewarded ads/day), and buys comfort/convenience (solo continue, extra probe in *casual only*, cosmetics). **Ranked is untouched by money or ads — permanently.** No randomized paid items of any kind. Monetization itself is deferred to M7 — the MVP ships with zero ads so that retention and fairness data are clean.

**Alternatives.** Ads in casual from M5 — deferred with monetization; shipping ads early contaminates playtest telemetry.

**Trade-off.** Slower path to revenue. Accepted: a deduction duel lives or dies on perceived fairness.

## A12. Cheating and collusion cannot be fully prevented — say so, and shrink the surface

**Problem.** Async 1v1 invites friend-boosting (two accounts, one human playing both sides badly as the Fugitive), timer abuse, and out-of-band info sharing. The original concept named the risk but had no mitigation plan. Impact: rated integrity erodes silently.

**Resolution (defense in depth, MVP-appropriate):** (1) Server-authoritative hidden state — the Fugitive's path never exists on the Investigator's client; probe/stakeout evaluation happens server-side (08-api-security). (2) Unique per-match case seeds; stakeout placements are **secret until case end** (A13), so the Fugitive cannot map the Investigator's belief state live. (3) Two-queue ratings (Investigator ladder, Fugitive ladder) reduce self-play incentive vs. a single ladder. (4) Post-case anomaly flags (route entropy, probe-placement correlation with the true path — detectable server-side *after* the case). (5) Honest limit, documented: **out-of-band collusion between humans is detectable only statistically; no MVP feature eliminates it.**

**Alternatives.** Client-side game state (deterministic lockstep) — rejected outright: hidden information makes it trivially cheatable. Live anti-cheat review — out of scope for a solo dev at MVP.

**Trade-off.** Server authority costs a real backend (07-architecture). Accepted — there is no honest alternative for a hidden-information duel.

## A13. Stakeout visibility was a hidden fork

**Problem.** Whether the Fugitive can see stakeouts being placed changes the entire Fugitive game and was never stated.

**Resolution.** Stakeouts are **secret until case end**: placement, misses, and locations are revealed in the post-case log only. Probes are likewise private to the Investigator. Public information is exactly: the map, drop sites/gate, the reveal schedule, reveals as they fire, and drop completions. One line captures the resulting design: *the Fugitive plays against the calendar; the Investigator plays against the person.*

**Alternatives.** Visible stakeouts (area-denial reading) — rejected for MVP: it converts the game into visible 4X-style zoning, a different (and more host-facing) game; revisit post-MVP as a ranked variant only with new balance work.

**Trade-off.** Fugitive misses feel arbitrary ("why did I lose?") — mitigated by the mandatory post-case log replay showing every probe/stakeout vs. the true route (a core learning feature, 06-uiux).

## A14. Content treadmill → cases are parameters, not content

**Problem.** "Maps and case variants" as content implies an art/content pipeline a solo dev cannot sustain.

**Resolution.** One handcrafted map (map_alpha v1.1, `assets/sample_map_alpha.json` **[computed: connected, 48 nodes, 84 edges, degree 2–7]**). A **case** = {2 ordered drop sites of 16, 1 gate of 2, 1 safehouse start of 2, SP/IP budgets, reveal schedule} — all filtered by the BFS feasibility gate (min-days ∈ [5,7]). Narrative flavor is a thin generated layer (case titles), never mechanical.

**Alternatives.** Multiple maps at launch — rejected; second map is post-MVP and gated on playtest demand. User-generated cases — rejected indefinitely (balance + collusion surface).

**Trade-off.** Visual sameness across cases. Mitigated by district theming and case-title flavor; accepted for MVP.

## A15. Onboarding is the real difficulty curve

**Problem.** Deduction games lose newcomers in the first loss: "I had no idea what to do." The original concept's answer ("the tutorial must teach heatmap reading") was thin, and A7 removed the heatmap from normal play.

**Resolution.** Onboarding = one scripted first case per role ("The Vermeer Slip"): fixed case config, forced friendly reveals, tooltip-driven markers, and a **guaranteed forgiving outcome** (as Investigator: the AI Fugitive is scripted to make one detectable mistake; as Fugitive: the AI Investigator probes badly). Loss protection: the tutorial case cannot be forfeited and does not touch ratings. Post-case log replay is introduced here — it is the actual teaching tool.

**Alternatives.** Text/manual — rejected. Video — rejected (cost, retention).

**Trade-off.** Scripted cases need bespoke content (one-time cost, ~2 case configs). Accepted.

## A16. Accessibility gaps

**Problem.** District-color evidence is color-critical; async play spans timezones; one-hand portrait reach was asserted, not designed.

**Resolution.** Districts get color **plus** icon/pattern and name labels (never color-only). All deadlines in local time with UTC shown in settings. Primary actions in the thumb zone; the map is pan/zoom with node-hit targets ≥44px. Reduced-motion setting; no skill based on reaction time anywhere. Screen-reader labels on nodes/log entries (baseline, not full WCAG audit — flagged in 09-testing).

**Trade-off.** Pattern+color map art costs more than color-only. Accepted.

## A17. Feasibility pressure on a solo developer

**Problem.** The full research-phase vision (solo+MP+ranked+DDA+ads+offers) is a multi-month system stack. Impact: the classic solo-dev failure is not the game — it's the perimeter.

**Resolution.** Strict MVP fence (01-prd §5): solo prototype + rules engine + one map + 3 AI archetypes + manual markers. Backend, MP, ranked, monetization are later milestones with explicit exit conditions (10-roadmap). The shared deterministic rules engine is built first because every later milestone (sim, server, replay) consumes it — one artifact, four uses.

**Alternatives.** Start with MP server — rejected: balance must exist before strangers meet it.

**Trade-off.** Later visible progress (MP arrives at M5). Accepted; documented so expectations are set.

## A18. Research-phase assumptions downgraded or cut

| Original claim | Audit disposition |
|---|---|
| "P(catch) computable in closed form from the heatmap" | **Downgraded:** closed-form exists only under simplifying assumptions (uniform posterior, greedy play). Real P(catch) needs the simulation harness. Kept as a solo-director *heuristic*, not ground truth. |
| "Informant event upgrades evidence quality" (solo DDA) | **Kept, solo-only, bounded:** one scheduled reveal may be upgraded (district→exact) at fixed case positions; never mid-day. |
| "Case reconstruction replay" as an ad reward | **Cut:** post-case replay is free (it's the teaching tool); selling it would be hostile. Replaced by solo "continue after loss" as the primary ad moment. |
| "Stakeouts trigger when the Fugitive ends their day adjacent" | **Cut** (A1). |
| "Analyses / zone rule-outs" | **Cut** (A2). |
| "Stamina forces fugitive near probe patterns" | **Cut, re-purposed** (A3). |
| "Disclosed IP handicaps in ranked" | **Deferred** with data-gating (A8, Q3). |
| Research score "38/40" | **Relabeled:** a research-phase estimate, not a validation. Balance and fun are unproven until M2/M4. |

---

## What survives the audit intact

- **Identity:** async 1v1 hidden-movement deduction; Investigator vs. Fugitive; mobile portrait; solo AI practice.
- **The information duel:** sparse scheduled evidence + budgeted probes vs. route-planning against a public leak calendar.
- **The two-queue async multiplayer pattern** (turn storage + push, no realtime servers).
- **The trust architecture:** hidden DDA in solo only; deterministic, seed-fixed competitive play.
