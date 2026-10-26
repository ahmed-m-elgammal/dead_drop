# ADR-008 — M3 W4: art & immersion sprint 1 "NOIR PIXEL"

Date: 2026-10-26 · Status: ACCEPTED · Scope: `apps/web` presentation layer only

## Context

After W1–W3 the prototype was functionally complete (both roles solo-playable on the real
engine, ladder/tutorial/replay/skill live) but read as an admin dashboard: paper-white
panels, default shadcn chrome, no art, no narrative frame. Player verdict: *"build a real
game, not this dashboard-looking UI — generate assets, pixel art, wall-board + case-files
UI, a story; surprise me."* The player-facing priority for W4 moved from hardening to
juice; the hardening scope (PWA/settings/telemetry/dogfood) shifts to W5.

Hard constraints carried in: the engine is the only rules authority; both seats obey the
§1.3/§5.2 information walls; ruleset frozen at 1.0.0-alpha.1; engine default path
byte-identical (150/150 incl. the W3 sim-port parity gate must stay green).

## Decisions

**D1 — Art direction "NOIR PIXEL", locked.** One city, one lamp, one manhunt. Palette:
ink navy `#0b101b` page, panel `#141d30`, paper cream `#e8ddc7`, brass amber `#e8a33d`
(primary), blood red `#a62f2f` (danger/stakeout), muted teal `#3d7068` (reveals/metro),
mint `#58b98a` (success/your-phase). Fonts via `next/font/google`: Press Start 2P
(logo/title only), Special Elite (case files, notes, stamps), VT323 (terminal HUD:
day/IP/phase strips); Geist Sans stays for body/rules text legibility. Every generated
asset ends with the same style suffix so the set reads as one game.

**D2 — Asset pipeline: AI generate → PIL chunkify.** 7 assets generated with the image
SDK (title city 1440×704; detective + courier portraits; 4-suspect lineup; CAPTURE /
ESCAPE / EXPIRY verdict vignettes), then post-processed (`scripts/m3_w4_pixelate.py`):
median-cut palette quantization → nearest-neighbor downscale (the "chunky pixel grid")
→ display-size NEAREST resize. 2 textures (cork, paper) are procedural
(`scripts/m3_w4_textures.py`) — noise-per-pixel makes them seamless by construction and
immune to the model's inability to paint tileable textures. Total payload 389 KB.
Generators are persisted under `scripts/` (regenerable, not one-offs).

**D3 — Presentation-layer-only architecture.** Zero changes to `store.ts`, engine, AI,
history, ladder, skill. New flavor components live strictly outside rules authority:
`IntroCinematic` (once-per-device cold open, localStorage flag, skippable),
`CaseBriefing` (per case-open dossier; trigger key `seed-role-startedAt` in
sessionStorage so resume never re-triggers), `DayTransition` (day-increment watcher,
non-blocking 1.7s slam), `Typed` (typewriter with reduced-motion bypass). All effects
defer state updates through timeouts (react-hooks/set-state-in-effect clean).

**D4 — §1.3 audit of the briefing.** The dossier mentions only PUBLIC config facts:
safehouse node, both drop sites, gate, the reveal calendar (D3/D6 district, D4 transit),
and ruleset-level costs (IP/SP prices). No engine-private state is rendered anywhere.
The flavor framing ("Bureau of Public Safety — Night Division") is diegetic dressing
over the same public data the old setup screen printed.

**D5 — CSS-only juice, zero new dependencies.** Design-system primitives in
`globals.css`: `pixel-frame` (hard-shadow bevel panels), `paper-card` + `pin-note`
(pinned manila notes), `cork` surface, `stamp` (turbulence-masked rubber stamp),
`btn-pixel`/`btn-pixel-ghost`/`chip-pixel` controls, and keyframes: neon flicker, day
slam, stamp slam, pin pop, rain, thinking strip, ring pulse. `prefers-reduced-motion`
disables all of it. No framer-motion, no canvas libs — the game keeps its
offline-first PWA budget.

**D6 — Role-scoped fantasy.** Investigator = Bureau desk: badge card + mugshot
dossiers + case-number terminal + evidence corkboard (public events pinned as notes,
private probe results flagged as surveillance slips). Fugitive = Courier card: stamina
film-strip, leak calendar as a surveillance strip, route ribbon, corkboard "what the
paper published about you". Map reskinned to night-city (district plates, pale foot /
amber tram / teal metro edges, paper nodes, blood-red gate, teal safehouse) —
`EDGE_STYLE` colors are presentation-only; layout geometry untouched. Verdict = case
folder that slams shut with the verdict stamp + per-verdict vignette (CAPTURE/ESCAPE/
EXPIRY have art; FORFEIT_F/FORFEIT_I/VOID fall back to the stamp only). Ladder = the
precinct case wall (corkboard + pinned index cards). History/Skill/Tutorial/Replay
dialogs reskinned to the same system.

## Verification record

- Engine/sim: `npm run build` green; `vitest` **150/150** (default path byte-identical, parity gate green).
- Web: `eslint .` clean (sandbox AND repo configs); `next build` green; fonts resolve at build.
- agent-browser E2E, zero console errors: intro cinematic (plays once → skip) → Bureau →
  investigator case №424242 briefing (typewriter) → probe D2-04 → end phase → **DAY 2 slam** →
  abandon → fugitive case → courier briefing → commit D2-08 (11/12 SP, ribbon updates) →
  AI investigator turn behind the wall → **DAY 2 slam** on the fugitive seat.
- Bugs found + fixed in the loop: (1) procedural paper texture painted black — `Image.new`
  defaults to black and the base fill was missing; (2) fugitive Hold button wrapped to three
  lines; (3) briefing effect violated set-state-in-effect under the repo's stricter lint
  (sandbox lint now ignores the embedded `dead_drop/` tree — it is a separate repo, not app code).
- Asset pack ships in `apps/web/public/art/` (9 files); sync script (`m3_w1_sync_web.sh`)
  extended with `globals.css` + `public/art` copies.

## Consequences

- The prototype now presents as a noir detective game; both role fantasies are distinct.
- W5 inherits: audio pass (SFX/ambience), PWA install/offline shell, settings (the
  reduced-motion media query is already honored app-wide), text-scale pass, telemetry,
  dogfood round 1.
- Art additions should extend the locked palette/suffix pipeline; do not introduce a
  second illustration style.
