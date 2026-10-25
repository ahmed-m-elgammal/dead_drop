# Engine Type-Spec Draft — What Type-Drafting Validated (M1 W2 parallel task)

**Status:** draft v0.1 (types only, deliberately not compiled) · **Source:** `03-rules.md` §1–§2, ruleset `1.0.0-alpha.1` · **Artifact:** [`dead-drop.types.ts`](dead-drop.types.ts)

Per the M1 execution plan (Week 2, parallel 60-min task): "draft the engine's TypeScript type
definitions straight from 03-rules §1 — *the state model is the type spec* — types only, no
resolution logic". The point of the exercise is requirements validation: transcribing §1 into
types forces every implicit decision to become explicit, and every mismatch to surface *now*,
before M2 builds the real engine.

## 1. Type → rules mapping (traceability)

| Type / const in `dead-drop.types.ts` | Anchored to | Notes |
|---|---|---|
| `RULESET_VERSION`, `MAP_ID_ALPHA`, `MAP_VERSION_ALPHA` | 03 §11, §9.12 | Map data versioned on its own clock |
| `NodeId`, `DistrictId`, `EdgeClass`, `CityMap*` | §1.1 + `assets/sample_map_alpha.json` | `EdgeClass` mirrors the JSON `type` field exactly (`F/T/M`) |
| `CaseConfig`, `RevealSchedule` | §1.2 | Visibility comments copied from the §1.2 table |
| `Verdict`, `Winner`, `VERDICT_WINNER` | §6 table | Winner mapping kept as **data** so the engine cannot re-derive it inconsistently |
| `Phase`, `ResolutionStep` | §1.3 + §2 | See finding T1 |
| `Day` | §1.3 (`day: 1..8`) | See finding T3 |
| `FugitiveSubmission`, `FugitiveResolvedAction` | §3.1, §3.3, §9.13 | See finding T4 |
| `InvestigatorSubmission` | §2 step 6, §5.1–5.3 | Caps and Day-8 stakeout ban are engine validations, not types |
| `ActionEnvelope<A>` | §9.10 + 08-api-security §4 | Idempotency is part of the action contract, not a transport detail |
| `PublicEvent`, `PrivateInvestigatorEvent` | §1.3 logs, §2 steps 2–5, §4, §5.2, §9.13 | Includes `STRANDED` (added by `1.0.0-alpha.1`) |
| `FugitiveState`, `InvestigatorState`, `CaseState` | §1.3 (verbatim shape) | Field-for-field |
| `InvestigatorView`, `FugitiveView`, `HiddenBlock`, `CaseEndDisclosure` | §1.3 exhaustive hidden/public list | See findings T2, T5 |

## 2. Findings surfaced by the draft (the actual validation output)

These are **drafting findings, not disputes** — no table session produced them, so they do not
enter the triage registry. None requires a rules change; each is an implementation decision now
written down where M2 will find it.

| # | Finding | Disposition |
|---|---|---|
| **T1** | §1.3 exposes 4 phases but §2 defines 7 steps; the mapping (step 1 = `FUGITIVE_MOVE`, steps 2–5 = `RESOLVING`, step 6 = `INVESTIGATOR_ACTIONS`, step 7 = transition) is implicit. An engine that treats step 7 as a phase would double-advance the clock. | `ResolutionStep` added to the spec as an *internal-only* type; engines expose only `Phase`. No rules change (the rules text is right; the mapping is now explicit). |
| **T2** | The Investigator's view of `FugitiveState` is **structurally empty** — every fugitive field (position, stamina, holds, drops) is on §1.3's hidden list. Consequence: `drops_collected` for the Investigator must be *derived from public events*, never stored as a mirrored field — a duplicated counter is a hidden-info leak waiting to happen in the M3 API. | `InvestigatorView` typed with an empty fugitive block; M3 note recorded: derive, don't store. |
| **T3** | `Day` must stay `number`, not `1|2|…|8`: P1 is swept by S6 (case length 7/8/9). Same logic for `holds_used` (P6 → S5) and `probes_today` (P7 → S4). Literal-union types are reserved for facts **fixed by rules logic** (the verdict set, `drops_collected: 0|1|2` — P2 is [computed]-pinned). | Rule of thumb recorded here; ranges validated at case load. |
| **T4** | §9.13's forced Hold is **not a submission** — it is an engine-resolved outcome. Folding it into the submission type would let clients "submit" stranding. | `FugitiveSubmission` (legal client actions) vs `FugitiveResolvedAction` (adds `FORCED_HOLD`) split at the type level. |
| **T5** | The Fugitive's view strips the entire investigator block **and** `private_log_investigator`; but at case end §8.6 reveals full logs *plus route* — so `CaseEndDisclosure` is a distinct type, not a phase flag. | Separate `CaseEndDisclosure` type. |
| **T6** | `VERDICT_WINNER` as a `const` table (not a function): the §6 mapping is data. A function invites re-derivation drift; a table is diffable against the rules text in review. | Kept as data. |
| **T7** | `ActionEnvelope<A>` generalizes idempotency across both roles' actions — §9.10 says "per action", not "per fugitive action". The M3 API must therefore issue keys for probes/stakeouts too, not only moves. | Confirmed by 08-api-security §4; envelope typed generically. |
| **T8** | Type constraints cannot express §9.8 (`drops[0] ≠ drops[1]`, `gate ∉ drops`) — that obligation belongs to the **generator** (04 §6). If the generator and the type agree only by convention, a generator regression would produce type-valid, rule-invalid cases. | Logged for M2: the generator's feasibility report (04 §6.5) must assert the §9.8 invariants explicitly. |
| **T9** | `stakeout_armed: NodeId | null` cannot express "consumed on hit or miss alike" — nulling is step-2 transition logic. Anyone reading only types could keep the stakeout armed after a miss. | JSDoc warning added; M2 engine tests must include a consumed-after-miss fixture (protocol P-cases will exercise it). |
| **T10** | Belief/heatmap (the Investigator's mental model, and the solo assist) is deliberately **absent** from engine state — §1.3 has no belief field, and 06-uiux owns the assist. Putting belief in `CaseState` would imply server-authoritative belief, which is wrong for PvP and right for solo only. | Belief stays UI/AI-layer (06-uiux, 05-ai-spec); the types encode the boundary by omission. |

## 3. What this draft does NOT do

- It does not implement anything: no functions, no state transitions, no legality checks —
  those are M2 engine work against the frozen ruleset.
- It does not replace `03-rules.md`: the rules text remains the single source of truth; the
  file is a lossless *view* of §1–§2 plus the ten implementation notes above.
- It was not compiled or type-checked (no toolchain exists by M1 design); syntax is kept
  plain (no exotic generics) so that the M2 engine can lift it verbatim.

## 4. M2 handoff additions (extends `../M1-execution-plan.md` W3 handoff list)

1. Lift `dead-drop.types.ts` into the engine package as the starting type layer.
2. Carry findings T1–T10 into engine test planning (especially T2 derive-don't-store,
   T8 generator invariants, T9 consumed-stakeout fixture).
3. Keep the parameter table (`PARAMETERS_V1_0_0_ALPHA_1`) as the single importable
   source of parameter values so sweeps (04 §4.4) read them, never hard-code them.
