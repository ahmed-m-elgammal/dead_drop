# M3 — Playable Single-Player Prototype (execution plan)

**Status:** W1 done (2026-10-26) · **Dependencies:** M2 closed (`engine@1.0.0-alpha.0`, G1 signed off) · **Exit gate:** G2 (10-roadmap M3 — L5 pass, tutorial completion ≥70% internal, zero known rule bugs, crash-free ≥99%) · **W1 decisions:** [ADR-005](adr-005-m3-w1-web.md)

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

### W2 — Content + AI stage 2 + replay
- Fugitive archetypes Random / Cautious / Deceptive (05-ai-spec §3) + difficulty select on setup.
- `buildLadder` (engine, 24 cases) → solo ladder screen S7 with completion stars (local).
- IndexedDB case history + replay viewer S6 (per-day scrubber).
- Tutorial beats 1–3 (scripted case, 06-uiux §3).
- CI: root npm install + engine build + `next build` for apps/web (make the repo the buildable source of truth; retire the sandbox engine lift).

### W3 — Fugitive-side playable + polish
- Case screen S2 (Fugitive view): route ribbon, stamina bar, leak calendar, commit-move bottom sheet.
- Baseline Investigator AI `I-GreedyProbe` (05-ai-spec §2) so both roles are playable solo.
- Skill measurement stage 3 (on-device rolling windows, 05-ai-spec §4).

### W4 — Hardening + dogfood
- PWA install/offline shell, settings S9, reduced-motion pass, text-scale pass.
- Analytics events + Sentry (roadmap task 7).
- Internal dogfood round 1 (roadmap task 8) → fix list.

### W5 (buffer) — G2 pre-flight
- L5 suite from 09-testing mapped onto the app; zero known rule bugs line; crash-free instrumentation honest.
- Exit: G2 sign-off into 14-readiness.

## Standing constraints (unchanged)

- Ruleset frozen at `1.0.0-alpha.1` until M1 human sessions close (freeze-checklist); engine default path byte-identical.
- The engine is the only rules authority; every AI obeys the same information walls as humans (05-ai-spec §2/§3 anti-cheat parity).
- No server, no accounts, no MP, no ads in MVP (10-roadmap §0 scope fence).
