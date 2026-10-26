# M3 — Playable Single-Player Prototype (execution plan)

**Status:** W3 done (2026-10-26) — both roles solo-playable · **Dependencies:** M2 closed (`engine@1.0.0-alpha.0`, G1 signed off) · **Exit gate:** G2 (10-roadmap M3 — L5 pass, tutorial completion ≥70% internal, zero known rule bugs, crash-free ≥99%) · **W1 decisions:** [ADR-005](adr-005-m3-w1-web.md) · **W2:** [ADR-006](adr-006-m3-w2-content-ai-replay.md) · **W3:** [ADR-007](adr-007-m3-w3-fugitive-side.md)

## Week-by-week plan (4–5 wks; W1 executed)

### W1 — Foundations + playable loop (DONE)
- `apps/web` scaffold in the monorepo (Next 16 + TS strict + Tailwind 4 + shadcn/ui + zustand), portrait shell.
- Engine-on-client: `CaseSession` drives everything; UI renders `investigatorView()` only (ADR-005 D1).
- Map renderer: paper-map geometry ported to a portrait vector viewBox; glyph-coded pools; zoom/pan; reveal tint; drop badges; armed-stakeout ring.
- Investigator case screen (06-uiux S3): probe (1 IP, ≤2/day), stakeout (3 IP, hold-to-confirm, §5.2 line), wait/end-phase; IP gauge; evidence log with private-flagged entries.
- Belief markers (?/!/✕) — local-only; optional rules-mechanical "belief halo".
- Stage-1 AI `F-Planner` (05-ai-spec §2): deterministic, feasibility-filtered, public-channel belief scoring (ADR-005 D2).
- Verdict card with §8.6 disclosure replay (true route + your evidence + "what you missed").
- Persistence: seed + investigator journal → deterministic replay on reload (ADR-005 D3).
- Verified: browser E2E green path (see ADR-005 verification record); ruleset untouched at `1.0.0-alpha.1`.

### W2 — Content + AI stage 2 + replay (DONE — [ADR-006](adr-006-m3-w2-content-ai-replay.md))
- Fugitive archetypes Random / Cautious / Deceptive (05-ai-spec §3, verbatim knobs) as seeded selection policies over the W1 feasibility-filtered candidate list + difficulty select on setup; per-day `mulberry32` streams keyed (seed, archetype, day) — replay bit-exact (browser-verified).
- `buildLadder` (engine, 24 cases, M2 C6 diversity) → solo ladder screen S7 with tier ramp 1–8 Random / 9–16 Cautious / 17–24 Deceptive and local completion stars.
- IndexedDB case history + replay viewer S6 (per-day scrubber over the engine's `disclosure()` — rebuilt from seed + archetype + journal through the shared day-runner, never snapshotted).
- Tutorial beats 1–3 (fixed seed 6, scripted Fugitive: HOLD day 1 → walk onto drop[0] day 2 → day-2 step-2 stakeout CAPTURE), beat gating in the store, coach-bar spotlight, completion flag.
- CI: `.github/workflows/web-ci.yml` — npm ci → engine+sim tsc → vitest → web lint → `next build` for apps/web against the BUILT engine dist (repo is the buildable source of truth; sandbox lift's build role retired).

### W3 — Fugitive-side playable + polish (DONE — [ADR-007](adr-007-m3-w3-fugitive-side.md))
- Case screen S2 (Fugitive view): route ribbon, stamina bar, leak calendar (scheduled + what actually leaked), commit-move bottom sheet with T15-cheapest edge, reveal warnings, §9.13 stranded handling. DONE.
- Baseline Investigator AI `I-GreedyProbe` (05-ai-spec §2) so both roles are playable solo. DONE — verbatim sim port (`packages/sim` belief + policy), parity-gated by `packages/sim/test/w3-webport-parity.test.ts` (posteriors bit-close across 55 randomized engine-driven cases, canonical + T16 overrides); deterministic from public state, so fugitive-role case identity = (seed + role + human journal).
- Skill measurement stage 3 (on-device rolling windows, 05-ai-spec §4). DONE — per-case facts from live engine state + §8.6 disclosure at finalize, persisted on the history record; last-10 windows per role, four axes each, Novice/Analyst/Detective/Ghost-hunter tiers (formulas + weights registered in ADR-007 D3; thresholds recalibrated at M4).
- Found + fixed in E2E: role views project MUTABLE engine arrays → store clones at the boundary (`projectI/projectF`); covers the same latent W1 hazard in map reveal tints/HIT pins (ADR-007 D6).

### W4 — Art & immersion sprint 1 "NOIR PIXEL" (DONE — [ADR-008](adr-008-m3-w4-noir-art-pass.md))
- Re-scoped on player feedback ("dashboard-looking UI"): the player-facing goal moved from hardening to juice — real-game presentation, generated art, story shell. Original W4 hardening scope (PWA shell, settings S9, telemetry, dogfood) shifts to W5; G2 pre-flight becomes W6 (buffer).
- Art pipeline: locked noir palette + three-font system (Press Start 2P / Special Elite / VT323); 7 AI-generated pixel-art assets (title city, 2 portraits, lineup, 3 verdict vignettes) run through a PIL chunkify/quantize post-processor; 2 procedural seamless textures (cork, paper); total 389 KB in `apps/web/public/art/`.
- Story layer (presentation-only): once-per-device cold-open intro cinematic; case-briefing dossier per case-open (public-config facts only — §1.3 audited); "DAY N" slam transitions with flavor lines; typewriter component honoring prefers-reduced-motion.
- Full reskin of every surface on the noir design system (CSS-only, zero new deps): night-city map, Bureau setup desk, evidence corkboard + pinned notes, fugitive Courier card, case-folder verdict slam with verdict art, case-wall ladder, archive/service-record dialogs, noir toasts.
- Zero rules churn: store/engine/AI untouched (150/150 incl. parity gate); briefing content audit — drops/gate/safehouse/reveal calendar only, all public config.
- E2E found + fixed: procedural paper texture generated black (Image.new default base never painted), fugitive Hold-button text wrap, briefing effect setState-in-effect (repo lint stricter than sandbox — sandbox eslint now ignores the embedded repo tree).

### W4.5 — Incremental UI/UX polish sprint (DONE — [ADR-009](adr-009-m3-polish-uiux.md))
- Player-framed as "improve, don't replace": audit-driven fixes on the live game, no redesign. Presentation-only — store/engine/AI byte-untouched (150/150 incl. parity gate).
- Map readability: deterministic label resolver (seam labels no longer collide), ink label halos, edge-casing underlay for crossing legibility, hit-radius clamp (seam twins' hit areas no longer overlap — later-rendered twin used to swallow clicks).
- Sidebar IA: CaseHeader extracted as the single status anchor (file tab, DAY/IP/probes/armed, glyph-matched config badges, compact halo toggle); ActionBar deduplicated to turn indicator + controls; right column order = status → actions → tools → evidence.
- Evidence scanability: district reveals carry pixel surveillance-photo thumbnails in both seats' logs; briefing dossier gains the safehouse-district polaroid; archetype dossiers gain mugshots. Asset pack 9 → 17 files (same locked W4 style + PIL pipeline); every img degrades gracefully (onError drops the frame, never the note).

### W5 — Hardening + dogfood (re-scoped from W4)
- PWA install/offline shell, settings S9, reduced-motion pass, text-scale pass.
- Audio pass (Web Audio SFX/ambience — deferred from W4 art sprint to keep one sprint one theme).
- Analytics events + Sentry (roadmap task 7).
- Internal dogfood round 1 (roadmap task 8) → fix list.

### W6 (buffer) — G2 pre-flight
- L5 suite from 09-testing mapped onto the app; zero known rule bugs line; crash-free instrumentation honest.
- Exit: G2 sign-off into 14-readiness.

## Standing constraints (unchanged)

- Ruleset frozen at `1.0.0-alpha.1` until M1 human sessions close (freeze-checklist); engine default path byte-identical.
- The engine is the only rules authority; every AI obeys the same information walls as humans (05-ai-spec §2/§3 anti-cheat parity).
- No server, no accounts, no MP, no ads in MVP (10-roadmap §0 scope fence).
