# M1 Freeze Checklist (Week 3 close-out pre-flight)

**Status:** pre-flight built (2026-10-25) · **Executes:** immediately after S3 + its triage ·
**Produces:** ruleset freeze tag, tally in `w1-rules-audit.md` §7, 14-readiness B2 closure, `m2-handoff.md` finalization.

**Honesty gate:** every box below requires *evidence from a real session artifact* (`m1/sessions/s{n}-transcript.md`,
`triage-log.md`). A box that cannot be evidenced stays unchecked and M1 does **not** close — the
exit condition (10-roadmap) is ruleset frozen **+** paper findings logged, and findings cannot be
logged on behalf of people who never sat down.

## 0. Pre-freeze mechanical state (verified 2026-10-25, re-verify at freeze)

| Check | Method | Result (2026-10-25) | Re-run at freeze |
|---|---|---|---|
| No TBD/TODO in `03-rules.md` | grep `TBD\|TODO\|TBA\|unclear\|undefined` | **0 matches — CLEAN** | ☐ |
| Worked-example geometry still valid | no rules changes since `1.0.0-alpha.1` → still valid; re-run only if a class-(a) patch landed | valid (no churn) | ☐ (only if patched) |
| Engineered-state ledger | `m1/sessions/triage-log.md` | S1/AUD-004 pending · S2/§9.13 pending | ☐ |
| All disputes triaged | `triage-log.md` registry | zero rows (no sessions yet) | ☐ zero untriaged |

## 1. Session evidence gates (human — cannot be done by automation)

- ☐ S1 transcript exists (`s1-transcript.md`) with **AUD-004 Hold-collect exercised** in ≥1 leg
- ☐ S2 transcript exists (`s2-transcript.md`) with **§9.13 forced-Hold exercised** in ≥1 leg
- ☐ S3 transcript exists (`s3-transcript.md`) — free play, natural-occurrence watch recorded
- ☐ Every Sheet E row across S1–S3 appears in `triage-log.md` with class (a)/(b)/(c) — zero untriaged
- ☐ Cumulative tally meets the acceptance line: **Player A ≥3 cases as Investigator AND ≥3 as Fugitive**

## 2. Freeze decision (pick exactly one branch)

**Branch A — S3 triage produced NO class-(a) patch:**
- `03-rules.md` §11 gets: *"frozen as `1.0.0-alpha.1` (final alpha) at M1 close; see w1-rules-audit §7 tally."*
- Git: `git tag m1-freeze-1.0.0-alpha.1 && git push --tags`

**Branch B — S3 triage produced ≥1 class-(a) patch:**
- Land the patch, bump `ruleset_version` → **`1.0.0-beta`** with a §11 change note; re-run the §0 grep; re-verify any affected worked example.
- `03-rules.md` §11 gets: *"frozen as `1.0.0-beta` at M1 close (S3 triage patch: <one-line>); see w1-rules-audit §7 tally."*
- Git: `git tag m1-freeze-1.0.0-beta && git push --tags`

*(Class-(b) clarifications may ride along under either branch; they are wording-only, no behavior change.)*

## 3. Gate-document updates (only AFTER §1 is fully checked — gate docs update at milestone exits)

- ☐ `14-readiness.md` — **B2 closure** (ready-to-paste, fill the bracketed evidence):
  > **B2 — "ruleset is paper-only" — CLOSED.** All three paper sessions executed (S1–S3, transcripts in
  > `m1/sessions/`); Player A completed ≥3 cases per role against 2 partners (tally: `w1-rules-audit.md` §7);
  > the two deliberately engineered states were exercised at the table (AUD-004 in S<[1|3]>, §9.13 in S2)
  > and every dispute was triaged (zero untriaged rows in `m1/sessions/triage-log.md`). Ruleset frozen
  > as `<version per §2>`; M2 may now build the engine against it.
- ☐ `14-readiness.md` — **B1 (no simulation results) and B3 (map/generator headroom) remain OPEN** — explicitly untouched; add one line: *"unchanged at M1 close; M2 addresses B1 (04 §4) and B3 (AUD-003)."*
- ☐ `w1-rules-audit.md` §7 — fill the tally + ruling-confirmation tables from the transcripts.

## 4. M2 handoff finalization

- ☐ `m1/m2-handoff.md` — replace the two `[AT FREEZE]` fields (version tag; tally + zero-disputes line) with the real values; everything else is pre-written and freeze-independent.
- ☐ Confirm the handoff names **AUD-003 (C3 semantics + full C2∧C3∧C4 conjunction count)** as the first M2 generator task, with the pre-authorized lever (drop-candidate pool 16→24 — a content-data change, 04-balance-sim §6).

## 5. Explicitly out of scope at freeze (carried, not closed)

- Win-rate feelings / parameter hunches from S1–S3 → M4 question list, tagged `feeling-not-data` (protocol §4).
- Parking-lot entries → reviewed at M1 close in `triage-log.md`, none enter the ruleset.
- Balance simulation, case generator, engine implementation → **M2** (04-balance-sim §4; m2-handoff).
