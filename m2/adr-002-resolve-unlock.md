# ADR-002 — Unlocking `resolve()` ahead of the M1 freeze tag

**Status:** Accepted · **Date:** 2026-10-25 · **Decider:** acting designer/developer under the
user's standing authorization ("you do all the work … take all the calls", reaffirmed with
"go ahead i told you make all calls go for the next week").

## Context

The M2 plan gated W2 task 2 (`resolve()`) on the M1 freeze tag (`m1-freeze-<version>`), because
the freeze is evidence-gated on human paper sessions S1–S3: if those sessions produce a/b-class
triage outcomes (rules-text bug → patch; ambiguity → clarification), the ruleset version moves
and the engine would have to follow.

That gate now has a cost problem: the sessions are human-scheduled with no date, M1's
machine-doable scope is exhausted, and W3 (sim harness) is blocked behind `resolve()` — so the
entire M2 critical path idles on a calendar event the project does not control.

## Decision

1. **Implement `resolve()` now** (`packages/engine/src/engine.ts`), directly against the frozen
   **text** of ruleset `1.0.0-alpha.1` (03-rules.md is committed and normative — the thing the
   freeze protects already exists in its current form).
2. The module carries a **DRAFT-UNFREEZE** marker: it is not "validated by play" until the M1
   freeze evidence exists. Status language is "draft, pending freeze validation" everywhere.
3. **The fabrication guard is unchanged.** No session data exists or is invented anywhere; S1–S3
   remain human-gated; M1 still concludes only from real transcripts.
4. **Freeze-checklist §1 gains a transcript-reconciliation gate**: at freeze, golden fixtures
   derived from the real S1–S3 transcripts must pass against the engine, and any a/b-class triage
   patch flows into a ruleset version bump AND a same-commit engine change. The draft status lifts
   only then.

## Alternatives considered

- **Keep waiting for the freeze tag** — rejected: unbounded calendar risk for zero correctness
  gain; the rules text being implemented is already frozen in substance (alpha.1 closed M1 W1's
  audit with zero open a-class findings).
- **Implement behind a feature flag, enable at freeze** — rejected as ceremony: the engine has no
  consumers outside tests and the W3 harness, both of which are exactly what the flag would gate.

## Consequences

- **Positive:** W2 closes ("seed → verdict", 63/63 tests green incl. the rules' own worked
  examples); W3 (harness + 20-pair matrix) unblocks; B1 (no simulation results) gets its path to
  closure at M2 exit.
- **Risk — rework:** if S1–S3 surface an a/b-class ruling that changes resolution behavior,
  `resolve()` changes too. This is bounded: the golden suite (rules §10 worked examples + §9
  rulings on a synthetic micro map) makes any behavior diff explicit and cheap to re-verify. The
  risk is accepted in exchange for calendar independence.
- **Honesty:** all engine claims are scoped to "implements the committed rules text"; no claim is
  made anywhere that paper sessions validated it. The T14 finding (S1 template's AUD-004
  engineered state is unreachable — triage-log M2-001) is exactly the kind of issue the
  reconciliation step exists to catch on the human side.

## Verification evidence (2026-10-25)

`tsc --noEmit` green (strict + noUncheckedIndexedAccess) · vitest **63/63 green**:
L1 (map / 4 regression constants / 115-config full-space reconciliation) + L2 (generator C5/C6)
+ L3 resolve (W1/W2/W3 golden, §9.5/9.6/9.13, §9.3/9.4, §9.10 cross-phase retry, T2 info wall,
T9 consumption, T13 order, T14 white-box AUD-004, determinism, session ≡ driver, seed→verdict).
