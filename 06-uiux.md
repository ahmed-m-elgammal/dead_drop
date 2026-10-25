# 06 — UI/UX Specification

**Status:** design spec, pre-implementation. Portrait-first web PWA; all primary actions reachable one-handed in the bottom 60% of the screen. Defers to 03-rules.md for behavior; this doc defines screens, states, and flows.

## 1. Screen inventory

| # | Screen | Purpose | Key elements |
|---|---|---|---|
| S0 | Onboarding / Tutorial | Teach by playing ("The Vermeer Slip") | Scripted case, tooltip beats, skip toggle (after first completion) |
| S1 | Home | Entry point | Continue-case card (with deadline countdown), Solo ladder, (M5: Cases lobby), Settings |
| S2 | Case — Fugitive view | Plan & commit today's move | Map, route ribbon, stamina bar, leak calendar, drop/gate markers, "Commit move" bottom sheet |
| S3 | Case — Investigator view | Read evidence, spend IP | Map + belief markers toolbar, evidence log, IP gauge, Probe mode / Stakeout mode toggles, "End phase" sheet |
| S4 | Case — waiting state | Opponent's turn | Deadline countdown, last events digest, no input (read-only map) |
| S5 | Reveal modal | Scheduled evidence fires | District/transit/"no movement" card; animation minimal (respects reduced-motion) |
| S6 | Verdict / Replay | Case end | Verdict card, **Replay overlay**: true route vs. probes vs. stakeouts vs. reveals, per-day scrubber; "what you missed" beat |
| S7 | Solo ladder | Case selection | 24 cases, stars/completion, archetype badge per case |
| S8 | Lobby (M5) | Casual async | Case type (casual), role picker (queue), active cases list |
| S9 | Settings | Preferences | Deadlines in local time/UTC toggle, notifications, reduced motion, text size, assist heatmap (solo only), language |
| S10 | Profile (M6) | Ratings & history | Two ladders (Investigator/Fugitive), case history, anomaly-flag status (self-view) |

## 2. Core interaction: the map

- **Rendering:** vector map, 4 districts in distinct hues **plus** distinct icons/patterns and name labels (never color-only). Pan + pinch/zoom; node hit targets ≥ 44 px.
- **Layers (toggle chips):** drops/gate (always on), my markers, reveals, (solo assist: heatmap — explicitly badged "Assist").
- **Belief markers (Investigator):** three-tap cycle per node — *none → possible (?) → pinned (!) → cleared (✕)*. Long-press clears. Markers are local-only (never transmitted — they are the player's thinking, and the opponent must never see them).
- **Action sheets:** bottom sheets, one decision per sheet. Fugitive: route preview shows transit class, SP cost, and "what the calendar will say about this move" (e.g., "Day 4 move will be publicly revealed as: Tram"). Investigator: probe sheet lists target + cost + remaining IP; stakeout sheet requires a hold-to-confirm (irreversible 3 IP) with an explicit "The Fugitive will not be notified" line.

## 3. Onboarding flow (S0)

1. Beat 1 (Investigator, day 1): "The city published this heist's drop sites. Start there." → tap drop site.
2. Beat 2: first probe (guaranteed HIT — scripted AI) → "A probe answers one question about *today*."
3. Beat 3: first stakeout → capture → confetti-less verdict card → **replay overlay** introduced as "how you read them."
4. Beat 4 (Fugitive mini-case, 3 days): plan a route around the leak calendar; experience one reveal and one escape.
5. Guardrails: tutorial cannot be forfeited; deadlines paused; ratings untouched. Loss protection: the scripted outcomes are fixed regardless of play.

## 4. Notifications (M5+; copy examples)

| Event | Push | Digest |
|---|---|---|
| Your turn (deadline T-6h/T-3h) | "The Fugitive is moving in Old Town. Your probe budget awaits." | — |
| Public reveal fired | "Day 3 evidence: the Fugitive was in the Harbor." | ✓ |
| Drop completed | "Drop 1 landed at the Fish Market — day 6." | ✓ |
| Verdict | "Case closed: ESCAPE. See how it happened." | ✓ |
| Opponent missed a deadline | "Your opponent is stalling. One more miss and the case is yours." | — |
| Max 1 digest/day; critical pushes only for your-turn and verdict. All copy includes local deadline. |

## 5. Empty / error / edge states

- **Opponent offline:** expected state; countdown + "they have 14 h left."
- **Opponent missed once:** amber banner on both views.
- **You missed once:** red banner with exact forfeit deadline.
- **Void case:** neutral card, no rating change, "both of you went dark."
- **Offline client:** cached case view (read-only); submissions queue with idempotency keys and auto-retry; explicit "will send when online" chip.
- **Assist heatmap in solo:** badge + "Adaptive assist is on — solo only" footnote.

## 6. Accessibility & localization

- Color-blind safety: 4-district palette chosen for deuteranopia/protanopia separation **and** paired with icons (anchor, tower, scale, rail) + labels.
- Text scale to 130% without layout loss (bottom sheets scroll).
- One-hand reach: all action triggers in the bottom 60%; map interactions above.
- Reduced motion: reveal modal crossfades instead of slides; no map fly-to animations.
- No reaction-time mechanics anywhere; deadlines are generous by design (rules §7).
- Screen reader: node labels, evidence log entries, and verdicts are announced; full audit is a post-MVP task (09-testing §5).
- Localization: all strings externalized from M3; MVP ships English only.

## 7. Retention mechanics (design intent, honest)

- **Post-case replay as the hook:** every verdict ends with the story — players return to *watch themselves win or lose*, then shareable result cards (M5+, no account needed for the card image).
- **Ladder rhythm (M6):** seasons of 4 weeks; two role ladders; visible calibration stat ("your markers matched the truth 61% of the time — top 20% of Analysts") — skill made visible without social pressure.
- **Solo ladder completion:** 24 cases with archetype variety; completion badge; no daily-login rewards (the case cadence *is* the habit loop).
