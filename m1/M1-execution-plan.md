# M1 Execution Plan — Requirements & Design Validation (3 weeks)

**Status:** Week 1 **executed** (2026-10-25) · Weeks 2–3 tooling pre-built (sessions + freeze evidence-gated) · Milestone owner: designer/developer (+ 2 playtest partners) · Tracks the M1 row in 10-roadmap §1.

## 0. What M1 is for (and what it must not become)

M1 proves the ruleset is complete, teachable, and playable *on paper* before any code exists. It is deliberately the cheapest milestone in the roadmap: everything it produces is either markdown, printable paper, or throwaway verification scripts. What M1 must **not** become: a tuning exercise (parameters are M2/M4 outputs), a scope-growth window (new mechanics discovered here go to the parking lot, not the rules), or a documentation rewrite (the doc set from the planning phase is frozen as the baseline; M1 amends it only through the dispute workflow).

## 1. Week-by-week

### Week 1 — mechanical pre-flight, kit, protocol — **DONE**

| # | Deliverable | Where | Acceptance evidence |
|---|---|---|---|
| 1 | Independent verification harness (fresh derivation from `assets/sample_map_alpha.json`, not a re-run of the planning-phase script) | `scripts/dd_m1_w1_validation.py` + `scripts/m1_w1_validation_results.json` | All structural claims re-verified; worked examples 14/14 edges present; canonical case = 7 days; "55/480" reproduced exactly and its counting convention identified |
| 2 | Rules-completeness audit: §9.1–9.12 consistency, worked-example ledgers, [computed]-claim re-checks, dispute log | `m1/w1-rules-audit.md` | 1 gap found & ruled (DIS-001 → §9.13); 1 convention clarified (AUD-002); 1 M2-blocking ambiguity logged (AUD-003); 1 tactic made explicit (AUD-004) |
| 3 | Ruleset patch | 03-rules.md → `1.0.0-alpha.1`; 04-balance-sim §3.1 note | Change log recorded in 03-rules §11; no parameter or resolution-order changes |
| 4 | Paper-prototype kit | `m1/kit/` (print map HTML generated from JSON, reference cards, 4 log sheets) | Map sanity-checked (48 labels, 84 edge lines, glyph counts match pools); assembly instructions in `m1/kit/README.md` |
| 5 | Playtest protocol with 3 fully-verified cases | `m1/playtest-protocol.md` | P1/P2/P3 pass feasibility band + generator constraints; par data quarantined as facilitator-only |

### Week 2 — playtest sessions S1–S2

**Status (2026-10-25): W2 tooling pre-built and pushed to the repo; the sessions themselves are
human-gated.** Ready and waiting: `m1/sessions/` (S1/S2 transcription templates with engineered-
state checklists, `triage-log.md` registry, fabrication guard) and `m1/engine-types/` (the
parallel type-drafting task below — **done**, draft v0.1 with findings T1–T10 recorded in its
README). Remaining human work is exactly the two session runs + transcriptions + triage calls.

- Run S1 (Case P1 ×2 with partner B; exercise AUD-004) and S2 (Case P2 ×2; engineer SP = 0 → §9.13) per `m1/playtest-protocol.md` §1–2.
- After each: transcribe `m1/sessions/s{n}-transcript.md` (copy from the pre-built template: case sheet + route sheet + dispute rows + surveys + engineered-state verification), then 30-min triage (bug / ambiguity / smell) into `m1/sessions/triage-log.md`.
- Patch rules only via triage class (a)/(b); every patch bumps the version and lands in the audit registry.
- Parallel 60-min task (keeps M2 warm, zero rules churn): draft the engine's TypeScript type definitions straight from 03-rules §1 (the state model is the type spec) — *types only, no resolution logic*. → **Done:** `m1/engine-types/dead-drop.types.ts` + findings T1–T10 (incl. derive-don't-store for Investigator's view of fugitive state; generator obligations unexpressible in types; FORCED_HOLD is engine-resolved, never submitted).

**Week 2 exit:** 2 sessions transcribed; all disputes classified; zero untriaged rows. *(Tooling half of this is already in place; the exit line itself remains gated on the human sessions.)*

### Week 3 — session S3, freeze, handoff

**Status (2026-10-25): W3 tooling pre-built and pushed to the repo; the session and the freeze
itself remain evidence-gated.** Ready and waiting: `m1/sessions/s3-case-template.md` (free-play
watch list instead of engineered states), `m1/freeze-checklist.md` (§0 mechanical checks already
run — no-TBD grep clean; §1 session evidence gates; §2 freeze Branch A/B with ready-to-paste tag
texts; §3 14-readiness B2 closure paste-text), and `m1/m2-handoff.md` (pre-written; two `[AT FREEZE]`
fields). `w1-rules-audit.md` §7 close-out registry skeleton is in place.

- Run S3 (Case P3 ×2 with partner C; free play + optional repeat).
- Re-run the no-TBD grep on 03-rules.md; confirm the §9.13 and AUD-004 states were actually exercised at the table (protocol §1 table).
- **Freeze:** tag the ruleset as `1.0.0-alpha` final (or `1.0.0-beta` if S3 triage forced a patch) in 03-rules §11; write the tally table (cases per role per partner) into the audit's registry section.
- Update 14-readiness: blocker **B2 closed** (with session-file evidence); B1/B3 unchanged; note AUD-003 into the M2 task list.
- Produce the **M2 handoff note** (`m1/m2-handoff.md`, half a page): frozen version tag; the four regression constants (P1 6d/5SP, P2 6d/6SP, P3 6d/7SP, canonical 7d/6SP); the C3-semantics question (AUD-003) as the *first* M2 generator task; the type-definition draft from Week 2. → **Pre-written:** all freeze-independent content is in place; only the two `[AT FREEZE]` fields remain.

**Week 3 exit / M1 exit condition (10-roadmap):** ruleset frozen + paper findings logged. Both acceptance lines met: every §9 ruling confirmed at the table or patched; no TBD; both roles ≥3 paper cases.

## 2. Exit-criteria tracking

| Criterion (10-roadmap M1) | Status | Evidence at close |
|---|---|---|
| Every §9 edge case has a ruling | **met for the text** (audit §1); table confirmation pending | w1-rules-audit §1; session dispute logs (W2–W3) |
| No "TBD" in 03-rules.md | **met** (grep clean) | re-run at freeze |
| Both roles ≥3 cases on paper | pending | `m1/sessions/` + tally table |
| Ruleset frozen + findings logged | pending | version tag in 03-rules §11; audit registry |

## 3. Risks to M1 itself (from 12-risks, operationalized)

- **"Rules feel flat on paper"** (10-roadmap M1 risk): expected; surveys (Sheet F) record it, nothing tunes on it. If sessions are *boring* rather than *flat*, that distinction goes verbatim into the M4 question list.
- **Partner no-shows:** any partner can be swapped without protocol changes (cases are partner-agnostic); the acceptance line counts Player A's cases.
- **Scope-creep temptation:** any "wouldn't it be cool if…" at the table goes to the parking lot section of the session file with a one-line description. Nothing else. New mechanics are a design-phase activity with a new audit round, not a table ruling.

## 4. Parking lot (created empty; nothing is in it yet)

*(populated from session files; each entry: one line + who proposed it + date; reviewed at M1 close — none enter the ruleset)*
