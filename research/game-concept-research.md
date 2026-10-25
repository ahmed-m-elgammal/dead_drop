# Deep Research Report: Original Game Concepts Built Around a DDA-Driven Live-Ops System

**Prepared for:** a small (1–3 person) game team seeking a medium-to-hard game whose core loop natively supports (1) Dynamic Difficulty Adjustment via player modeling, (2) in-play loss prediction, (3) progress-scaled ad-reward optimization, (4) behavior-driven personalized offers, and (5) a non-conflicting multiplayer feature.
**Date:** October 2026. **Method:** multi-source investigation across academic literature (systematic reviews, IEEE/ACM papers), industry press and postmortems, GDC Vault, patent filings, app-store policy documents, and player communities (Reddit, Steam forums, ResetEra, board game communities), followed by structured candidate generation and scoring.

---

## 1. Executive Summary

After screening 19 exclusion-list-passing candidate concepts against eight weighted criteria, three concepts emerge as the strongest. All three are buildable by a tiny team, all three have clearly measurable win/loss states and hidden tuning parameters, and all three support the full five-part system without bending the design.

| # | Working Title | Genre | One-line pitch | Score /40 |
|---|---------------|-------|----------------|-----------|
| 1 | **Dead Drop** | Async 1v1 hidden-movement deduction | One player commits secret heist routes across a city grid; the other hunts them with sparse evidence and limited probes — Scotland Yard's pursuit–evasion duel, rebuilt as a turn-based asynchronous mobile duel with an AIDirector-style difficulty engine. | 38 |
| 2 | **Odd Tricks** | Co-op campaign trick-taking | A cooperative trick-taking campaign (in the spirit of the award-winning *The Crew*) where contract missions are served adaptively, an AI partner plays alongside you, and solver-computed win probability drives hints, difficulty, and offers. | 36 |
| 3 | **Leximancer** | Adaptive word-crafting combat roguelite | A word-combat RPG where the letter bag is a personalized player model: the game quietly serves letters tuned to your vocabulary frontier, so difficulty adjustment and skill growth are the same system. | 37 |

**Scoring ranked Dead Drop > Leximancer > Odd Tricks**, with a pinball roguelike (32/40) and a turn-based tactics roguelike (31/40) as the strongest rejected candidates. Full scoring in Section 4; full concept sheets in Sections 5–7; rejection table in Section 8.

> **Exclusion confirmation:** None of the three final concepts is a match-3, tower defense, block/merge, precision auto-runner, water-sort, Sudoku, traffic-jam, screw, hex-sort, Sokoban, bullet-heaven, network-management, or physics fruit-merge game, or a reskin/twist of any of them. See Section 9.

---

## 2. Method

### 2.1 Research process

The investigation ran in five rounds: (1) academic grounding on DDA and player modeling; (2) documented industry DDA systems; (3) monetization evidence (rewarded ads, offer optimization, patents, store policy); (4) loss-prediction and optimization methods; (5) multiplayer design patterns plus genre-level gap checks for each shortlisted candidate (board game pedigree, digital saturation, delisted predecessors, community complaints). Sources are numbered [S1]–[S27] and listed in Section 10.

### 2.2 Scoring rubric

Each candidate is scored 1–5 on the eight criteria supplied in the brief. The rubric was applied by asking, for each criterion, a concrete falsifiable question (e.g., for C2: "Can the game change difficulty through parameters a player does not directly see, without changing the visible rules?").

| Criterion | Question the score answers |
|---|---|
| C1 Win/loss signal | Is there a crisp, measurable win/loss state the model can be trained against? |
| C2 Hidden tunability | Does difficulty live in parameters the player never sees (RNG composition, spawn/serve policies, mission selection)? |
| C3 Data richness | Does ordinary play emit dense, labeled behavioral data? |
| C4 Monetization fit | Are there natural, non-forced moments for rewarded ads and purchase offers? |
| C5 Multiplayer fit | Can multiplayer ship without real-time servers (or with minimal infra)? |
| C6 Skill ceiling | Will medium-to-hard players stay engaged for months? |
| C7 Feasibility | Can a solo dev or tiny team ship and maintain it? |
| C8 Differentiation | Is there a demonstrable gap vs. existing titles? |

---

## 3. Research Findings: The Evidence Base for the Five System Parts

### 3.1 DDA via player modeling is mature, cheap, and grounded

Dynamic difficulty adjustment (DDA) is defined in the literature as a game's ability to adapt its challenge based on player-modeling strategies, with methods ranging from rule-based systems (fuzzy logic, heuristics) to machine learning (reinforcement learning, genetic algorithms, neural networks) [S1]. Two recent systematic literature reviews catalog the field: Víteková et al. (2026) reviewed 75 papers from 2020–2025 and found growing interest in player-model-driven DDA using performance, physiological, and emotional metrics [S1]; Souza et al. (2025) systematically reviewed implementation solutions in digital games [S2]. The theoretical anchor is flow theory: difficulty tracking skill keeps players in the flow channel [S1]. Bakkes et al.'s survey of player behavioural modelling establishes the broader discipline of inferring player traits from telemetry [S3].

Crucially for a small team, the most celebrated industry examples are **not** deep learning systems. They are small, bounded, parameterized systems:

- **Resident Evil 4 (2005)** ships a hidden "Dynamic Difficulty" rank that tracks item score, action score, and continues; playing well makes enemies more aggressive, struggling makes them passive and can suppress spawns entirely (e.g., two archers will not spawn in the village water-room if the player took enough hits earlier) [S6]. Community-documented, not officially detailed by Capcom.
- **XCOM 2** secretly "cheats for you in tactical combat" on every difficulty except Legend, more intensely at lower difficulties [S7]; on Rookie, squads are capped at 5 concurrent aliens, rookies start with +2 HP and +10 will, and the player's displayed hit chances are multiplied by 1.2 [S7 — XCOM wiki].
- **Left 4 Dead's AI Director** adjusts spawn intensity and item distribution (even converting pill pickups to med kits for struggling teams) based on team performance and "intensity" tracking [S5].
- **Duolingo's Birdbrain** — the most directly transferable commercial system — is an item-response-theory model that predicts the probability a learner answers an exercise correctly, then feeds a session generator that serves "Goldilocks difficulty" exercises; A/B tests showed better learning and better retention, and Duolingo frames the adaptation as teaching rather than as game manipulation [S8].

The player-experience literature also carries a warning that shapes this whole report: how DDA is implemented matters. An experimental comparison of no-DDA, system-oriented ramping DDA, and player-oriented DDA found meaningfully different effects on player experience [S4], and a 2025 study explicitly measures engagement, flow, **perceived fairness**, and satisfaction under adaptive difficulty [S9]. Players punish difficulty manipulation that feels like cheating (see 3.5).

### 3.2 Loss prediction: proven in churn and correctness modeling, transferable to sessions

There is no well-known off-the-shelf "loss predictor" product, but the components are well established in two adjacent literatures:

- **Churn/survival modeling in social games.** Periáñez et al. (IEEE DSAA 2016) built survival-ensemble models on mobile social game telemetry that predict each player's probability of churning as a function of time and identify behavioral risk factors, significantly outperforming Cox regression [S15]. The same machinery — behavioral features → time-to-event model — applies to "probability this run ends in loss," with the censoring problem solved identically.
- **Correctness/outcome prediction.** Duolingo's Birdbrain is, functionally, a per-interaction loss predictor: it estimates P(correct) for the next exercise and drives difficulty selection with it [S8]. Resident Evil 4's rank system is an implicit, rule-based loss predictor (it intervenes when predicted failure risk is high) [S6].

Design implication: a small team should implement loss prediction as an **interpretable, rule-and-heuristic v1** (trajectory features: HP curve, resource curve, streak state) with an upgrade path to a logistic/IRT-style model, mirroring how Birdbrain started as IRT logistic regression rather than deep learning [S8].

### 3.3 Reward optimization: rewarded ads are the format that fits

Rewarded video is opt-in and consent-based, and is reported to be the highest-eCPM mobile ad format (commonly cited US ranges of $10–$40 eCPM for casual games vs. $5–$15 for interstitials) [S13]. Unity Ads data reported via industry press indicates 62% of mobile gamers regularly view rewarded video and 71% prefer the format [S13], and Unity's own 2023 Gaming Report notes only ~3% of players convert to paying, which structurally makes ad-reward design the monetization backbone for most of the audience [S13]. (These figures are industry-reported estimates; see the uncertainty log.)

The optimization part is standard operations research: reward **magnitude** (e.g., 2 vs. 5 letter swaps), **timing** (post-failure vs. pre-boss), and **framing** (x2 streak multiplier) are levers that can be tuned with contextual bandits, which are the established industry tool for exactly this class of sequential personalization decision [S14].

### 3.4 Personalized offers: bandits work, but the manipulation line is litigated

Contextual bandits — multi-armed bandits conditioned on user context — are the standard industry pattern for serving the best offer/variant per user in real time, used across marketing platforms and called out specifically for gaming live-ops [S14]. But the gaming industry's own record defines the trust boundary:

- **Activision's 2017 patent** US20160005270A1, "System and method for driving microtransactions in multiplayer video games," described matchmaking that would pair players to influence game-related purchases; it was widely covered and criticized, and Activision stated it had not been implemented [S10].
- **EA's 2021 patent** US20170259177A1 on dynamic difficulty adjustment explicitly targets engagement maintenance via difficulty tuning, and press coverage framed it as AI-driven playtime extension [S11].
- Academic work on **dark patterns in game design** treats exactly these designs as manipulative when they exploit player psychology against the player's interest [S27].

So the design principle adopted throughout this report: **personalize the difficulty curve and the reward for watching ads in the player's favor; personalize offers by segment and moment, never by squeezing a detected frustration state** — and never let purchase offers be the visible consequence of hidden difficulty manipulation.

### 3.5 Multiplayer patterns that cooperate with the system instead of fighting it

Research surfaced a clear conflict and three clean resolutions.

**The conflict:** hidden DDA is radioactive anywhere players compare outcomes directly. Rubber-band AI is one of the most widely detested mechanics in gaming, with community documentation across dozens of racing titles [S25] and press coverage of even Nintendo's newest Mario Kart drawing "rubber-banding nightmare" criticism for its adaptive AI [S25]. Word game players have spent years accusing their own games of letter-rigging (multiple ongoing Reddit threads in r/WordsWithFriends and r/scrabble about controlled letter draws [S21]) — whether or not the rigging is real, the *suspicion* is permanent. Any DDA that touches ranked PvP outcomes will be read as rigging.

**The three patterns that work, all evidenced:**

1. **Asynchronous turn-based multiplayer** — the entire genre of async play (GDC Vault's dedicated talk on its power in mobile [S16]; the deep-dive on Solium Infernum's multi-turns-per-day async design [S16]) works at message-passing complexity: no real-time server, no tick sync, trivial for a tiny team, and it *is* the design of the finalist concepts here rather than a bolt-on.
2. **Daily seeded content** — Slay the Spire's Daily Climb puts every player on an identical seeded run with identical modifiers and a leaderboard [S17]. Seeding removes the DDA/multiplayer conflict entirely: in a seeded mode the difficulty engine is frozen, so comparisons are fair by construction.
3. **Transparent handicaps instead of hidden steering** — golf's handicap index exists precisely to make unequal players comparable through a *disclosed* adjustment [S26]. Disclosed handicaps are accepted; hidden rubber-bands are not.

**Extracted architecture rule for all three finalists:** hidden DDA operates only in solo/PvE progression; competitive multiplayer runs on fixed seeds or fully visible rules with rating-based, disclosed handicaps; co-op multiplayer may adapt *which* mission is served next but never the resolution of a played deal.

### 3.6 Trust and app-store policy as hard constraints

- **Loot-box-style randomness is a regulated surface.** Google Play has, since 2019, required apps offering randomized purchased items to disclose the odds of receiving each type of item in advance of purchase, in line with Apple's App Store policy [S12]. Any "buy a mystery bag" offer design is therefore both a trust and compliance risk.
- **Difficulty-manipulation-for-monetization is a reputational minefield** with patents and press coverage that players actively remember [S10][S11], and academic dark-pattern frameworks name the pattern [S27].
- **Personalization that visibly helps the player is framed positively** — Duolingo's Birdbrain is publicized as a feature, A/B-tested for learning benefit, and marketed [S8]. The same framing ("adaptive practice," "difficulty that respects your time") is available to games that put the adaptation on the player's side.

---
## 4. Candidate Generation and Scoring

Nineteen concepts were generated across deduction games, card games, word games, tabletop adaptations, roguelites, and niche digital genres, filtered against the exclusion list (all 19 below pass it), then scored with the Section 2.2 rubric.

| # | Candidate | One-line description |
|---|-----------|----------------------|
| 1 | **Async hidden-movement duel** | 1v1 pursuit–evasion deduction on a transit grid (Scotland Yard lineage), fully asynchronous |
| 2 | **Co-op campaign trick-taking** | Mission-based cooperative trick-taking (The Crew lineage) with AI partners and async play |
| 3 | **Adaptive word-crafting combat RPG** | Word-combat roguelite with a personalized letter-bag player model (Bookworm lineage) |
| 4 | Turn-based tactics roguelike | Into the Breach-style scenario tactics with procedural mission generation |
| 5 | Pinball roguelike | Roguelike progression layered on one deep pinball table (perks between balls) |
| 6 | Anomaly-spotting loop (Exit 8-like) | Spot-the-subtle-anomaly repetition loop in a single scene |
| 7 | Solitaire combat RPG | Klondike-family solitaire fused with RPG battles (Solitairica lineage) |
| 8 | Document-audit sim | Papers-Please-style judgment puzzle: process documents under shifting rules |
| 9 | Semantic-deduction daily | Guess the hidden word from semantic similarity feedback (Semantle lineage) |
| 10 | Async co-op deduction | Codenames-style clue-giving co-op, asynchronous |
| 11 | Guaranteed-solvable deduction (minesweeper-like) | Logic-mine deduction with provably solvable boards |
| 12 | Adaptive crossword daily | Crossword with clue-difficulty adaptation per solver model |
| 13 | Nonogram league | Nonogram puzzles with async leagues and co-op puzzles |
| 14 | Bridge-builder campaign | Physics construction puzzles with budget/material constraints |
| 15 | Dice-dungeon roguelike | Dice-allocation dungeon crawler (Dicey Dungeons lineage) |
| 16 | Trivia roguelike | Knowledge combat with adaptive question serving |
| 17 | Rhythm roguelike | Rhythm combat with procedurally generated tracks |
| 18 | Backgammon-with-mods | Classic backgammon plus modifier cards in async play |
| 19 | Mahjong-solitaire quest | Tile-removal solitaire with quest framing |

### 4.1 Scoring table (1–5 per criterion; 40 maximum)

| # | Candidate | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | Total |
|---|-----------|----|----|----|----|----|----|----|----|-------|
| 1 | Async hidden-movement duel | 5 | 5 | 4 | 4 | 5 | 5 | 5 | 5 | **38** |
| 3 | Adaptive word-crafting RPG | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 4 | **37** |
| 2 | Co-op campaign trick-taking | 5 | 5 | 5 | 3 | 5 | 5 | 4 | 4 | **36** |
| 5 | Pinball roguelike | 4 | 4 | 4 | 5 | 4 | 5 | 2 | 4 | 32 |
| 4 | Turn-based tactics roguelike | 5 | 5 | 4 | 2 | 4 | 5 | 3 | 3 | 31 |
| 7 | Solitaire combat RPG | 4 | 5 | 4 | 5 | 4 | 3 | 4 | 2 | 31 |
| 12 | Adaptive crossword daily | 4 | 5 | 4 | 4 | 4 | 4 | 2 | 3 | 30 |
| 17 | Rhythm roguelike | 4 | 5 | 5 | 3 | 3 | 5 | 2 | 3 | 30 |
| 9 | Semantic-deduction daily | 4 | 4 | 4 | 2 | 4 | 4 | 4 | 4 | 30 |
| 6 | Anomaly-spotting loop | 5 | 5 | 3 | 3 | 4 | 3 | 4 | 2 | 29 |
| 11 | Guaranteed-solvable deduction | 5 | 3 | 3 | 3 | 4 | 4 | 5 | 2 | 29 |
| 15 | Dice-dungeon roguelike | 5 | 4 | 4 | 3 | 3 | 4 | 4 | 2 | 29 |
| 16 | Trivia roguelike | 4 | 5 | 4 | 4 | 4 | 2 | 4 | 2 | 29 |
| 18 | Backgammon-with-mods | 5 | 2 | 4 | 2 | 5 | 5 | 4 | 2 | 29 |
| 8 | Document-audit sim | 4 | 4 | 4 | 2 | 3 | 4 | 3 | 4 | 28 |
| 19 | Mahjong-solitaire quest | 4 | 4 | 3 | 5 | 4 | 2 | 4 | 2 | 28 |
| 10 | Async co-op deduction | 4 | 3 | 4 | 2 | 4 | 4 | 3 | 2 | 26 |
| 13 | Nonogram league | 5 | 3 | 3 | 4 | 4 | 2 | 4 | 2 | 27 |
| 14 | Bridge-builder campaign | 5 | 4 | 4 | 2 | 3 | 4 | 3 | 2 | 27 |

**Selected for full development: #1, #3, #2.** The two strongest rejects (pinball roguelike, tactics roguelike) and every other cut are documented with reasons in Section 8.

---

## 5. Final Idea 1 — DEAD DROP (working title)

### 5.1 Concept

**Genre:** asymmetric 1v1 hidden-movement deduction, asynchronous. **Session length:** a 10–14 day "case" played out over hours or days. **Platform:** mobile-first, portrait.

**Core loop (as the Investigator):** each day you receive sparse evidence — the fugitive's transit type or district color on certain days, per Scotland Yard's periodic-surfacing convention [S18] — then spend from a limited budget of **probes** (pin one node: "was the fugitive here this day?") and **analyses** (rule-out a whole zone). Between days you study the map, mark your belief on a persistent probability heatmap, and decide where to stake out next.

**Core loop (as the Fugitive):** commit a secret route each day across a node network with three transit types of different speed, collect drops placed by the case generator, and manage a stamina economy that forces you near the investigator's historical probe patterns. Victory/defeat is binary and unambiguous: the Investigator wins by catching the Fugitive (a probe landing on the true node, or a stakeout when the Fugitive ends their day adjacent) before the case clock ends; the Fugitive wins by completing all drops and exiting the map. The board is small (40–60 nodes), the ruleset fits one screen, and a case runs 10–14 rounds — closer to a long chess opening than to a session game.

**What makes it different:** every existing hidden-movement board game (Scotland Yard, Whitehall Mystery, and kin) is designed for synchronous, pass-and-play or full-table play, and their digital versions follow suit; the research found no prominent mobile title that turns the pursuit–evasion duel into a true asynchronous, notification-driven duel between two remote players [S18][S16]. Meanwhile deduction lovers already sustain huge async ecosystems in other genres (daily word and chess puzzles). Dead Drop combines a Spiel-des-Jahres-winning mechanic [S18] with the async infrastructure pattern proven by GDC-documented turn-based mobile design [S16].

### 5.2 The five system parts, mapped specifically

1. **DDA via player modeling.** In solo mode, the AI Fugitive is a parameterized behavior model: route entropy (how random its walks are), deception rate (probability of doubling back into cleared zones), caution radius (avoidance of recent probe sites), and drop-cluster tightness. The player model — rolling catch-rate, average probes-to-catch, heatmap calibration error (does the player's belief map match Bayesian ground truth?) — selects those parameters per case. Skills measured per player: route inference, economy management (probe budgeting), risk patience. Struggling investigators get talkative fugitives; experts get ghosts.
2. **Loss prediction.** The belief heatmap *is* the loss predictor: a Bayesian filter over the fugitive's possible positions is maintained anyway for gameplay; P(catch before day D) under the player's remaining probe budget is computable in closed form from it. When predicted P(catch) drops below the difficulty band target, the solo director can legitimately intervene *within* the fiction — e.g., an informant event that upgrades next day's evidence quality — exactly the kind of bounded, rule-based intervention documented in RE4/XCOM 2 [S6][S7].
3. **Reward optimization.** Rewarded ads buy: +1 probe today, a "case reconstruction" that replays evidence with hindsight, or case insurance (one failed stakeout forgiven). Bandit-managed levers: reward size scales with case depth (deep cases pay double probes), with loss probability (insurance offered when P(catch) is low), and with streak state. All placements are opt-in value exchanges at genuine decision points — the pattern with the strongest reported player acceptance [S13].
4. **Personalized offers.** Behavioral segments map to offers: "methodical" players (high heatmap usage, low probe waste) are offered case-pack bundles and cosmetic detective kits; "rushers" (high probe burn) are offered consumable forensic toolkits after losing streaks; Fugitive-side players who keep losing by one day are offered route-planning content. Offers are never triggered mid-win-streak, and nothing sold touches ranked play — the trust line drawn in Section 3.4 [S10][S27].
5. **Multiplayer.** The duel *is* the game: the Fugitive commits day-by-day routes asynchronously; the Investigator responds day-by-day; turns are stored state + push notifications, not a real-time session — the exact pattern GDC-recognized async mobile design describes [S16]. Ranked ladder uses a **disclosed handicap** in the golf-handicap tradition [S26]: lower-rated Investigators simply receive a larger probe budget, visible to both players before the case starts. The DDA engine never touches ranked cases — ranked fugitive behavior parameters are fixed by rating tier, not per-player.

### 5.3 Why the multiplayer fits

It is turn-based by definition (a pursuit–evasion duel cannot be real-time without becoming an action game), so it needs nothing more than turn storage and push — no netcode, no matchmaking latency, no sync bugs. Both roles are playable solo against the AI, so the single-player game doubles as ranked practice, and the same content (maps, case generator) serves both modes. Because the fugitive's route is committed before the investigator acts each day, there is no simultaneity problem to solve: one player can take turns per day, the other per week.

### 5.4 Evidence and market gap

- **Mechanic pedigree:** Scotland Yard won the Spiel des Jahres in 1983 and remains the reference pursuit–evasion board game; the genre (Scotland Yard, Whitehall Mystery, Mr. Jack) is alive on tabletop with active community discussion [S18].
- **Digital gap:** digital versions found during research are synchronous companions to the physical game (e.g., Ravensburger's Scotland Yard Master app) — a pass-and-play/tabletop model [S18]. No prominent dedicated async 1v1 hidden-movement duel was found on mobile app stores during this research (absence-of-evidence caveat in Section 11).
- **Deduction demand:** the sustained popularity of daily deduction formats (word puzzles, chess puzzles) and the resurgence of anomaly-hunting games [S28] indicate an audience for observation-and-inference loops on mobile.
- **System fit:** RE4's and XCOM 2's hidden adjustments [S6][S7] and Birdbrain's P(correct) modeling [S8] transfer directly: Dead Drop's belief filter gives it *better* loss-prediction machinery than any of them, because the game state is a probability distribution by design.

### 5.5 Risks and unknowns

- **Role balance.** Scotland Yard-class games are notoriously sensitive to fugitive-vs-investigator win rates; the case generator must be tuned per rating tier, and asymmetric balance work is the largest design cost. *Unknown until playtesting.*
- **New-player collapse.** A bad early investigator experience (getting outplayed with no idea why) is a churn cliff; the tutorial must teach heatmap reading, not just rules.
- **Cheating/coordination.** Ranked fugitives could pre-agreed routes with friends to boost ladders; needs mild anomaly detection on route entropy.
- **Niche breadth.** Hidden movement is beloved but not mass-market; the DDA system makes it accessible, but the ceiling on audience is unknown. *Marked uncertain — no market-size estimate was found in this research, and none is invented here.*
- **Content cadence.** Maps and case variants are the treadmill; procedural case generation with solver-verified solvability mitigates it.

### 5.6 Smallest playable prototype and first metrics

**Prototype (2–3 weeks, one dev):** one 48-node map, three AI fugitive archetypes (random/cautious/deceptive) with exposed parameters, 12-case solo ladder, local Bayesian heatmap, one rewarded-ad placement (+1 probe), no multiplayer backend (simulated async). *Deliberately excluded:* cosmetics, ranked ladder, second map.

**First metrics:** (a) case completion-rate curve across the 12 cases — the DDA target band is 40–60% completion per case with declining variance; (b) probes-to-catch vs. case index (learning signal); (c) belief-model calibration — player heatmap vs. Bayesian ground truth (correlation should rise with play); (d) +1-probe ad take-rate at low vs. high P(catch) states (reward-optimization signal); (e) D1/D7 retention split by role preference.

---
## 6. Final Idea 2 — ODD TRICKS (working title)

### 6.1 Concept

**Genre:** cooperative trick-taking campaign with an AI partner. **Session length:** one mission (a deal) in 3–5 minutes; chapters of 8–12 missions. **Platform:** mobile-first.

**Core loop:** each mission deals a compact trick-taking hand (original deck: four suits, 1–9, plus a small trump suit — deliberately simple, in the tradition validated by *The Crew*, the 50-mission cooperative trick-taking campaign that won the Kennerspiel des Jahres 2020 [S19]) and assigns **task cards**: win exactly the 4 of roses, make your partner take the final trick, nobody may take the third trump, and so on. Communication is limited to a token budget per mission. The team wins only if every task is satisfied; a single miss fails the mission. Between missions, a light roguelite meta: draft one crew-trait per chapter (mulligan tokens, one-card peeks, trump flexibility) that modifies future deals.

**Win/loss condition:** binary per mission (all tasks met or not) and legible mid-deal — after three tricks it is usually known whether the contract is dead. That mid-deal legibility is what makes loss prediction tractable and honest.

**What makes it different:** *The Crew* proved the co-op trick-taking campaign on tabletop and won major awards doing it [S19], but no strong modern mobile version exists: the mobile trick-taking market is dominated by classic-game gambling-adjacent platforms (Spades Plus et al. — Zynga paid $100M for Peak Games' card division largely for Spades Plus and Gin Rummy Plus [S24]) that are synchronous, competitive, and monetized through coin economies, *not* through campaign co-op. The gap is a premium-feeling, single-purchase-or-ads, co-op campaign trick-taker with an AI partner worth playing with.

### 6.2 The five system parts, mapped specifically

1. **DDA via player modeling.** The mission ladder is adaptive: the generator maintains several near-equivalent candidate missions at each step and the director chooses which to serve based on the player model (rolling first-try success rate, hint reliance, task-type breakdown — e.g., "strong at trump management, weak at exact-count tasks"). AI partner strength is itself a hidden knob: its card-play is heuristic-scored (double-dummy-informed; see below) with tunable "partner brilliance." This mirrors Duolingo's session-generator pattern: predict correctness, then serve material at the modeled frontier [S8].
2. **Loss prediction.** Card games are computationally tractable: an open-source double-dummy solver exists and is widely embedded (Bo Haglund's DDS, now maintained as dds-bridge, based on work from 2006 [S23]; Ginsberg's partition-search bridge AI is the academic ancestor [S23]). At deal time, the solver estimates P(mission success) under perfect information; mid-deal, the visible trick state updates it. This is a *better-grounded* loss predictor than any other genre candidate in this report, and it doubles as the AI partner's brain — one component, two system parts.
3. **Reward optimization.** Rewarded ads buy: one mulligan (replay the failed mission with one task relaxed), a pre-trick "partner signal" (a hint about the AI's plan), or a task reassignment token. Levers for bandits: mulligan generosity scales with chapter depth and with modeled P(success after mulligan) — cheap wins offered when the player is close, premium help when far. Placement at the post-failure screen is the canonical rewarded-ad moment [S13].
4. **Personalized offers.** Segment by behavior: repeat-failers on exact-count tasks are offered the "Counting School" strategy-guide chapter; players who blitz missions are offered cosmetics (card backs, partner avatars); streak-grinders get mulligan bundles. Crucially, offers never alter deal composition in ranked/league modes (see below), and no purchase changes card probabilities — paid randomization would trigger loot-box disclosure obligations [S12] and trust costs [S27].
5. **Multiplayer.** Trick-taking is strictly turn-based, so async co-op needs only a turn queue with a generous clock (the Solium Infernum pattern of "several turns per day" [S16]) plus push notifications. Three- and four-player async co-op campaigns become a shared-calendar social loop. The weekly league ladder uses **fixed deals** — every player gets the identical deal set, Slay-the-Spire-Daily-Climb style [S17] — so the DDA engine is structurally excluded from competitive comparison, resolving the rigging-trust conflict by construction [S21][S25].

### 6.3 Why the multiplayer fits

It is the lowest-infrastructure multiplayer possible: stored turns, no simultaneity, and a game whose rules were literally designed around playing cards one at a time in sequence. Co-op (rather than versus) also sidesteps the matchmaking-population problem that kills small-card-game PvP: two friends can run a chapter across a week. And because the AI partner can substitute for any seat, multiplayer is an *enhancement* of the solo loop, not a separate product — the same is true in reverse, so neither mode starves the other.

### 6.4 Evidence and market gap

- **Mechanic validated at the highest tabletop level:** *The Crew: The Quest for Planet Nine* (Thomas Sing, Kosmos 2019) won the 2020 Kennerspiel des Jahres with exactly this shape — 50 co-op trick-taking missions of escalating difficulty [S19]; multiple sequels followed (2021, 2024, 2026), indicating sustained demand [S19].
- **Mobile demand for trick-taking is proven but saturated in one model:** Spades Plus is a long-running top-grossing card platform, and Zynga's $100M acquisition of Peak's card division was explicitly for it [S24]. (Sensor Tower's store page shows monthly revenue estimates for Spades Plus [S24]; treated as estimates, not facts.)
- **AI feasibility is off-the-shelf:** dds-bridge is open source and embeddable [S23]; a Stanford CS229 project demonstrates learned double-dummy solvers [S23]. A tiny team gets a credible partner AI and a solver-based loss predictor from the same library.
- **Async pattern documented:** GDC Vault's dedicated talk on asynchronous mobile gaming [S16] and the Solium Infernum deep-dive [S16] establish both the design pattern and its retention economics.
- **Gap:** the research found co-op trick-taking on tabletop and synchronous competitive trick-taking on mobile, but no modern mobile co-op trick-taking *campaign* with adaptive mission serving — the intersection is open. *(Absence-of-evidence caveat, Section 11.)*

### 6.5 Risks and unknowns

- **AI partner quality is existential.** A partner that misplays in a co-op game is the single largest churn risk; heuristic + solver-assisted play must be tuned per skill tier, and partner "personality" (signals, style) is real design work. *Unknown until tested with players.*
- **Trick-taking literacy is declining.** Younger audiences may not know following-suit conventions; the tutorial burden is higher than for casual puzzle genres.
- **Mission content treadmill.** Handcrafted missions are cheap (a deal + tasks) but Chapter 20 needs procedural generation with solver verification of solvability — engineering effort, not design effort.
- **The Crew is the obvious comparison.** It is a physical game by another publisher; the digital campaign space is nonetheless unoccupied, and the meta-layer + adaptive serving + async co-op are original. Legal review of the exact task/communication rules is required to avoid a clone.
- **Monetization ceiling.** Co-op campaign audiences monetize worse than coin-based competitive card platforms; the model here is ads + cosmetics + guides, not premium currency. *Market-size uncertainty noted in Section 11.*

### 6.6 Smallest playable prototype and first metrics

**Prototype (3 weeks, one dev):** simplified deck (3 suits × 1–9, 4 trumps), 2-player co-op (you + one AI partner), 20 handcrafted missions with solver-checked solvability, loss-predictor v0 (deal-time solver estimate + mid-deal update), one rewarded placement (mulligan), no backend.

**First metrics:** (a) first-try success-rate curve across the 20 missions — DDA target band 35–65% with rising mid-curve; (b) hint/partner-signal take-rate vs. modeled P(success) (does the model's confidence predict real behavior?); (c) mulligan-ad conversion after first vs. repeat failures (reward-scaling signal); (d) D2 retention split by whether players read the tutorial (trick-taking literacy check); (e) correlation between deal-time solver P(success) and actual outcomes (loss-predictor AUC, target >0.75 before expanding).

---

## 7. Final Idea 3 — LEXIMANCER (working title)

### 7.1 Concept

**Genre:** word-crafting combat roguelite. **Session length:** one battle 2–3 minutes; a run 20–30 minutes. **Platform:** mobile-first, landscape or portrait.

**Core loop:** you are a wordsmith facing "word wraiths" in turn-based combat. Each turn you hold a hand of 8 letter tiles and spell a word to attack; longer and rarer words hit harder, tile powers (wilds, doubles, chains) modify the math. Enemies impose battle modifiers: frozen letters, required roots, no-repeated-letters edicts, timed rounds. Between battles you take a branching path — shops, forges (tile upgrades), elite fights — Slay-the-Spire-shaped. Win/loss is unambiguous HP combat in both directions.

**The differentiator is the letter bag.** Every word game deals letters from a fixed distribution (with Scrabble's tile frequencies as the canonical example). Leximancer's bag is a **player model**: an item-response-theory engine — the Birdbrain pattern [S8] — tracks which words you actually play, which you started and abandoned, and your speed, then quietly re-weights tile draws toward your vocabulary frontier: letters that make "almost-known" words spellable reach you more often. Difficulty adjustment and vocabulary growth are the same system. In practice mode the adaptation is disclosed as a teaching feature; in seeded competitive modes it is switched off.

**What makes it different:** the beloved ancestor of this genre — PopCap's Bookworm Adventures (2006), which fused word-forming with RPG combat — has been delisted since 2016: EA removed it from Steam and Origin, and by 2020 it was "erased from the internet" [S20]. The genre seat is empty, and no successor has shipped the modern live-ops system this report is built around. Meanwhile, word players' years-long rigging suspicions about letter dealing in popular word apps [S21] define the trust constraint: Leximancer leans into transparent, player-serving adaptation rather than hidden steering.

### 7.2 The five system parts, mapped specifically

1. **DDA via player modeling.** Three hidden layers: (a) the adaptive letter bag (above); (b) enemy stat scaling (HP/damage multipliers in ±15% bands around tier defaults); (c) modifier selection — the director serves modifiers that target the player's measured weaknesses (slow spellers get fewer timed rounds until their model improves; anagram-strong players get edicts that neutralize raw vocabulary). The player model is per-skill: anagramming speed, lexicon breadth (long/rare word rate), modifier adaptation.
2. **Loss prediction.** Combat is legible: HP trajectory plus **hand quality** — how many playable words ≥ damage-threshold exist in the current hand and what the next-bag draws allow — gives a rolling P(loss before next shop). Hand-quality scoring uses the game's own lexicon, so the predictor is cheap and deterministic; upgrade path to a trained model on (HP delta per turn, modifier load, swap history). This drives the director (serve a friendlier forge next) and the offer engine (below).
3. **Reward optimization.** Rewarded ads buy: letter swap (reroll N tiles — the canonical word-game rewarded ad), a muse hint (the first letter of the best available word), or a one-time shield (convert a hit into tile-freeze). Bandit levers: swap count scales with run depth (2 tiles early, 5 in the final chapter) and with modeled P(loss); muse hints are priced by word length revealed. All placements are opt-in and mid-combat, where the value exchange is felt [S13].
4. **Personalized offers.** Losing-streak players (P(loss) high across runs) get consumable bundles (potions, extra swaps) — help, not pay-to-win letters. Vocabulary-ambitious players (high rare-word usage) get the "Grand Lexicon" cosmetic + stats. Speed-runners get run-tracking cosmetics. No offer ever sells letters, tile power in seeded duels, or anything touching daily-competitive integrity; no randomized paid items (loot-box disclosure constraint [S12]).
5. **Multiplayer.** **Async seeded duels:** every player gets the same seed — same bag sequence, same enemy queue, same modifiers — and the run is scored (damage efficiency, words used); leaderboards and weekly leagues follow the Daily Climb pattern [S17]. Because seeds fix the letter stream, the adaptive bag cannot be accused of rigging comparisons — the structural solution to the WWF-style trust problem [S21]. Optional direct async duel: alternating attacks on a shared enemy with a turn clock. Neither needs real-time servers; both are turn/turn-based by construction [S16].

### 7.3 Why the multiplayer fits

Word games are the oldest success story in async mobile play, and seeded runs make the DDA conflict vanish: your practice sessions are personalized; your league entries are identical to everyone else's. The social loop (weekly league, friend challenges, "beat my run" share cards) is content-light and notification-driven [S16]. And because scoring is deterministic on a seed, anti-cheat is replay validation, not server simulation.

### 7.4 Evidence and market gap

- **Delisted genre ancestor:** Bookworm Adventures is confirmed delisted (removed from Steam/Origin in 2016; coverage of its full disappearance in 2020) [S20] — a cult-favorite genre seat with no current occupant.
- **The adaptive-serving pattern is proven to improve engagement:** Duolingo's Birdbrain personalizes exercise difficulty with an IRT model, is A/B-tested to improve both learning and retention, and is *marketed as a feature* [S8] — the exact framing Leximancer borrows for its disclosed practice-mode bag.
- **Players scrutinize letter dealing:** persistent community threads accuse major word apps of manipulating letter draws [S21] — evidence both that letter composition is the highest-leverage difficulty lever in the genre and that it must be handled transparently.
- **Lexicon content is free:** the ENABLE word list is explicitly public domain [S22], and open Scrabble-family lists (SOWPODS et al.) are available for lookup layers [S22] — removing the largest content cost of word games for a tiny team.
- **Roguelite structure is validated as an engagement frame:** Slay the Spire's Daily Climb demonstrates seeded daily competition with modifiers [S17].
- **Reward-ads fit:** letter-swap and hint placements are among the most natural rewarded-ad moments in any genre; rewarded video is the format players report preferring [S13].
- **Gap:** no shipped mobile title combines word-combat + adaptive letter serving + roguelite runs + seeded async leagues. *(Absence-of-evidence caveat, Section 11.)*

### 7.5 Risks and unknowns

- **Bookworm-clone perception.** The genre debt is real; the adaptive bag, roguelite structure, and duel league must be prominent from first session to establish identity. Legal: Bookworm's specific characters/UI are protected; word-combat as a mechanic is not, but review is required.
- **Non-English markets.** Lexicons per language are real work; ENABLE covers English only [S22]. Launch English-first.
- **Vocabulary gating.** The "medium-to-hard" skill ceiling exists (anagramming, lexicon breadth, modifier adaptation) but the adaptive bag must *not* dumb down the game for experts — the model needs a difficulty floor and expert-only bag modes.
- **Privacy/ML optics.** Modeling vocabulary per user is behavioral profiling; keep models on-device where possible and disclose per store privacy rules.
- **Pay-to-win optics.** Consumables that add swaps in *runs* are fine; the line (never sell letters, never sell seeded-run power) must be absolute and communicated.

### 7.6 Smallest playable prototype and first metrics

**Prototype (2–3 weeks, one dev):** hand of 8 tiles, 5 enemy types with 3 modifiers each, one chapter (8 battles) + one forge + one shop, bag DDA v0 (rule-based: weight draws toward letters in almost-played words; no ML yet), one rewarded placement (letter swap), local seeded daily run with self-leaderboard.

**First metrics:** (a) median word length by session index (skill growth under the adaptive bag — the core thesis: bag adaptation should raise it without raising perceived difficulty); (b) D1/D7 retention vs. bag-adaptive on/off (A/B within the prototype cohort); (c) swap-ad take-rate by run depth (reward-scaling signal); (d) hand-quality P(loss) vs. actual losses (predictor AUC); (e) seeded-daily participation rate (multiplayer appetite).

---

## 8. Rejected Candidates

| Candidate | Score | Why it was cut |
|---|---|---|
| Turn-based tactics roguelike (Into the Breach-like) | 31 | Best-in-class DDA story, but ad/offer moments felt forced and scenario-content scope exceeds a tiny team; lives too deep in a famous game's shadow. |
| Pinball roguelike | 32 | The strongest reject: monetization and skill ceiling are excellent, but 2D pinball physics quality is a make-or-break engineering risk and table content is a treadmill. |
| Solitaire combat RPG | 31 | Fusion of two well-known things reads derivative; skill ceiling modest for the medium-hard target. |
| Adaptive crossword daily | 30 | Clue-difficulty adaptation is a great DDA fit, but the constructor content pipeline is prohibitive for a small team. |
| Rhythm roguelike | 30 | Music licensing or generation is a heavy dependency, and mobile audio-latency UX is a trap. |
| Semantic-deduction daily (Semantle-like) | 30 | Needs embedding-model infrastructure; thin ad/offer hooks; one-guess-a-day loops cap monetization. |
| Anomaly-spotting loop (Exit 8-like) | 29 | The 2023 indie hit already spawned a documented clone wave (Steam curator lists, community threads) [S28]; content treadmill; weak offer moments. |
| Guaranteed-solvable deduction (minesweeper-like) | 29 | Any difficulty rigging of board generation is trust-fatal in a genre where fairness is the appeal; differentiation low. |
| Dice-dungeon roguelike (Dicey Dungeons-like) | 29 | Reads as a variant of a well-known recent title. |
| Trivia roguelike | 29 | Content treadmill plus a skill ceiling capped at recall; adaptive question serving is the whole genre already. |
| Backgammon-with-mods | 29 | Dice-rigging suspicions would be trust-fatal in a probabilistic classic; differentiation weak. |
| Document-audit sim (Papers-Please-like) | 28 | Tone clashes with ads/offers; narrative content pipeline too heavy. |
| Mahjong-solitaire quest | 28 | Adjacent to excluded tile-matching/merge space; low ceiling. |
| Bridge-builder campaign | 27 | Poly Bridge shadow; weak natural ad/offer moments. |
| Nonogram league | 27 | Saturated casual genre; low perceived ceiling. |
| Async co-op deduction (Codenames-like) | 26 | Four-player coordination friction; too close to a famous licensed title's identity. |

## 9. Exclusion Confirmation

**Confirmed:** none of the three final concepts — Dead Drop (hidden-movement deduction), Odd Tricks (co-op trick-taking), Leximancer (word-crafting combat roguelite) — is, or is a reskin, clone, or "twist" of, any game or genre on the exclusion list: match-3, tower defense, block/merge puzzles, precision auto-runner platformers, water sort, Sudoku, traffic-jam/parking puzzles, screw puzzles, hexa sort, Sokoban, bullet-heaven/auto-shooter roguelikes, network-management strategy, or physics fruit-merge games.

## 10. Sources

| # | Source | Used for |
|---|--------|----------|
| S1 | Víteková, Eichhorn, Pirker & Plecher (2026), "Dynamic Difficulty Adjustment in Serious Games: A Literature Review," *Information* 17(1):96, MDPI — https://www.mdpi.com/2078-2489/17/1/96 | DDA definitions, method taxonomy, flow theory |
| S2 | Souza et al. (2025), "Solutions for Dynamic Difficulty Adjustment in digital games" (systematic literature review), *Entertainment Computing*, ScienceDirect — https://www.sciencedirect.com/science/article/abs/pii/S1875952125001211 | DDA implementation solution space |
| S3 | Bakkes, Spronck & van Lankveld (2012), "Player behavioural modelling for video games," *Entertainment Computing* — https://www.sciencedirect.com/science/article/abs/pii/S1875952111000486 | Player modeling discipline |
| S4 | "Comparing Effects of Dynamic Difficulty Adjustment Systems on Player Experience," ACE/CHI PLAY proceedings (2017) — https://dl.acm.org/doi/10.1145/3116595.3116623 | DDA style affects player experience |
| S5 | "The Director," Left 4 Dead Wiki (Fandom); B. Bladh (2025), thesis on DDA evaluation citing AI Director spawning/item behavior — https://left4dead.fandom.com/wiki/The_Director; https://www.diva-portal.org/smash/get/diva2:1978688/FULLTEXT02 | L4D AI Director behaviors |
| S6 | "Main game (RE4) — Difficulty," Resident Evil Wiki (Fandom); "Game Changers: Dynamic Difficulty," Game Developer (2009) — https://residentevil.fandom.com/wiki/Main_game_(RE4); https://www.gamedeveloper.com/design/game-changers-dynamic-difficulty | RE4 hidden dynamic difficulty |
| S7 | Vigaroe, "Difficulty Levels" (XCOM 2 analysis); XCOM Wiki, "Game difficulty (XCOM 2)" — https://vigaroe.com/Analyses/XCOM2/DifficultyLevels; https://xcom.fandom.com/wiki/Game_difficulty_(XCOM_2) | XCOM 2 hidden combat cheating parameters |
| S8 | Duolingo, "Learning how to help you learn: Introducing Birdbrain!" (Duolingo Blog); IEEE Spectrum coverage — https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain; https://spectrum.ieee.org | IRT-based adaptive difficulty, A/B-tested engagement |
| S9 | "Adaptive Difficulty and Its Effect on Player Experience" (2025 preprint) — https://www.preprints.org/manuscript/202511.2251 | Perceived fairness of DDA |
| S10 | Activision patent US20160005270A1 (Google Patents); GamesIndustry.biz (Oct 2017); Kotaku (Oct 2017) — https://patents.google.com/patent/US20160005270A1/en; https://www.gamesindustry.biz/patent-which-pushes-microtransactions-through-matchmaking-granted-to-activision; https://kotaku.com/activision-patents-matchmaking-that-encourages-players-1819630937 | Matchmaking-for-monetization patent and backlash |
| S11 | EA patent US20170259177A1 (Google Patents); NME (Apr 2021); Syfy Wire (Apr 2021) — https://patents.google.com/patent/US20170259177A1/en; https://www.nme.com/news/ea-granted-patent-dynamic-difficulty-adjustment-technology-2915676; https://www.syfy.com/syfy-wire/ea-games-patents-difficulty-adjustment-based-on-playstyle | Engagement-driven DDA patent and framing |
| S12 | The Verge (May 2019), "Google's Play Store starts requiring games with loot boxes to disclose odds"; Fenwick insight — https://www.theverge.com/2019/5/29/18644648/google-play-store-loot-box-disclosure-family-friendly-policy-changes; https://www.fenwick.com/insights/publications/google-play-now-requires-disclosure-of-loot-box-odds | Loot-box odds disclosure policy (Google/Apple) |
| S13 | Unity blog, "Rewarded ad systems" (2025); feedmob citing Unity Ads stats (2023); Layer.ai glossary on rewarded video eCPM — https://unity.com/blog/rewarded-ad-systems; https://feedmob.com/mobileinsightsblog/rewarded-ads-are-for-more-than-just-gaming-apps; https://layer.ai/glossary/rewarded-video | Rewarded ad format stats and eCPM |
| S14 | Optimizely, "Contextual bandits: The next step in personalization"; Braze, "What is a multi-armed bandit?"; Metica (ex- King/analytics), "How to design contextual bandits" for gaming; Google Cloud AI blog on contextual bandits — https://www.optimizely.com/field-notes/articles/contextual-bandits-in-personalization; https://www.braze.com/resources/articles/multi-armed-bandit; https://www.metica.com/blog/how-to-design-contextual-bandits; https://cloud.google.com/blog/products/ai-machine-learning/how-to-build-better-contextual-bandits-machine-learning-models | Bandits as the offer/reward optimization method |
| S15 | Periáñez, Saas, Guitart & Magne (2016), "Churn Prediction in Mobile Social Games: Towards a Complete Assessment Using Survival Ensembles," IEEE DSAA; arXiv:1710.02264 — https://arxiv.org/abs/1710.02264 | Survival-model churn/behavior prediction on game telemetry |
| S16 | GDC Vault, "Turn-Based: The Power and Potential of Asynchronous Gaming in Mobile"; Game Developer, "Creating an asynchronous multiplayer in Solium Infernum" (2024) — https://gdcvault.com/play/1013751/; https://www.gamedeveloper.com/design/deep-dive-solium-infernum | Async turn-based multiplayer patterns |
| S17 | Rock Paper Shotgun (2018), "Slay The Spire daily challenge mode"; Slay the Spire Wiki, "Daily Challenge" — https://www.rockpapershotgun.com/slay-the-spire-daily-challenge-mode; https://slay-the-spire.fandom.com/wiki/Daily_Challenge | Seeded daily competitive pattern |
| S18 | Wikipedia, "Scotland Yard (board game)" — https://en.wikipedia.org/wiki/Scotland_Yard_(board_game) | SdJ 1983; pursuit–evasion conventions |
| S19 | Wikipedia, "The Crew (card game)"; retailer listings noting 2020 Kennerspiel des Jahres — https://en.wikipedia.org/wiki/The_Crew_(card_game) | Co-op trick-taking campaign pedigree and awards |
| S20 | Wikipedia, "Bookworm Adventures"; Rock Paper Shotgun (2020), "Bookworm Adventures has been erased from the internet" — https://en.wikipedia.org/wiki/Bookworm_Adventures; https://www.rockpapershotgun.com/bookworm-adventures-has-been-erased-from-the-internet-and-i-want-to-know-why | Delisting of the word-combat genre ancestor |
| S21 | Reddit community threads: r/WordsWithFriends ("Is Words with Friends corrupt?", "Words is rigged", "Letter probability"); r/scrabble ("Are the harder game modes rigged?") — reddit.com threads, 2021–2026 | Player distrust of letter dealing |
| S22 | ENABLE word list public-domain release (figshare; GitHub BartMassey/wordlists); SOWPODS lookup — https://figshare.com/articles/dataset/Enable_Scrabble_Dictionary/7492499; https://github.com/BartMassey/wordlists | Free lexicon sources |
| S23 | dds-bridge/dds (GitHub), Bo Haglund's double-dummy solver lineage; "Search Algorithms for a Bridge Double Dummy Solver" (Haglund); Stanford CS229 report on learned DDS — https://github.com/dds-bridge/dds; https://privat.bahnhof.se/wb758135/bridge/Alg-dds_x.pdf; https://cs229.stanford.edu/proj2016/report/Mernagh-LearningADoubleDummyBridgeSolver-report.pdf | Open-source card-play AI and solver |
| S24 | Poker Industry PRO (2017), "Zynga Expands Social Card Games Portfolio via Peak" ($100M card division acquisition); Sensor Tower, Spades Plus overview — https://pokerindustrypro.com/news/article/29432-zynga-expands-social-card-games-portfolio-peak-games; https://app.sensortower.com/overview/834185106 | Mobile trick-taking demand (Spades Plus) |
| S25 | Polygon coverage of Mario Kart World adaptive-AI criticism; "RubberBand A.I." documentation (Atrocious Gameplay Wiki); community threads (r/granturismo; Wreckfest forums) — https://www.polygon.com/gaming/606473/mario-kart-world-adaptive-ai-difficulty-drift-rubberbandin; https://atrociousgameplay.miraheze.org/wiki/RubberBand_A.I. | Player hostility to visible catch-up mechanics |
| S26 | NCGA, "Golf Handicap Index Explained" — https://ncga.org/handicap-101 | Transparent handicap as accepted fairness mechanism |
| S27 | Zagal, Björk & Lewis (2013), "Dark Patterns in the Design of Games," FDG (foundational academic reference); industry/analysis writing on monetization-driven DDA (LinkedIn analysis, 2026) — (well-known citation; verify against proceedings when formally publishing) | Ethical boundary of monetized difficulty design |
| S28 | Wikipedia, "The Exit 8"; ResetEra (Jan 2025), "The Exit 8 and its clones: how do we call this new genre?"; Steam curator, "Exit 8-likes & Anomaly Games" — https://en.wikipedia.org/wiki/The_Exit_8; https://www.resetera.com/threads/the-exit-8-and-its-clones-how-do-we-call-this-new-genre.1095741; https://store.steampowered.com/curator/45967956-Exit-8-likes-Anomaly-Games/ | Exit 8 success and subsequent clone flood |

## 11. Uncertainty Log

- **Unity rewarded-ad figures (62% / 71% / ~3% payers)** are industry-reported and drawn from vendor materials relayed via secondary coverage [S13]; treat as directional, not audited.
- **Sensor Tower Spades Plus revenue** figures are model estimates, not company disclosures [S24].
- **RE4 and XCOM 2 DDA details** are community-documented (wiki/fan analysis), not officially specified by Capcom or Firaxis [S6][S7].
- **Words With Friends / Scrabble GO rigging** is *accusation*, not proven fact; used only as evidence of permanent player suspicion [S21].
- **Market-gap claims for all three finalists** are absence-of-evidence claims ("no prominent title found during this research in the searched spaces"), not proofs of absence; a pre-production store audit is recommended.
- **Rubber-banding sources** are community documentation plus press criticism, suitable for establishing sentiment, not engineering fact [S25].
- **Zagal et al. 2013** is cited from professional knowledge as a foundational reference; verify the proceedings entry before formal publication [S27].
