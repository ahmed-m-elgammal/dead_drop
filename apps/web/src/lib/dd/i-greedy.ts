/**
 * Dead Drop — I-GreedyProbe, the Stage-1 Investigator baseline (M3 W3).
 *
 * Spec: 05-ai-spec §2 ("probes the modal node of a tracked belief
 * distribution; stakes only when the posterior maximum ≥ 0.4 and remaining
 * days ≤ 4" — the ≤4 gate is NOT in the policy; see below) as implemented by
 * packages/sim/src/policies.ts (M2 W3). The web AI is a VERBATIM port of the
 * sim policy that produced the recorded balance numbers — the same opponent
 * the data describes, not a re-derivation. The sim header records the
 * pilot-justified stakeout convention (2026-10-25):
 *
 *   - GATE on the CURRENT posterior max ≥ 0.4 (where they are),
 *   - AIM at the PREDICTIVE argmax (where they'll be at §2-step-2 resolution,
 *     one unobserved day ahead) — targeting today's argmax converted 86%
 *     probe accuracy into 0 captures against a moving fugitive.
 *
 * A note on the spec's "remaining days ≤ 4" clause: the M2 sim measured the
 * policy WITHOUT that gate (the recorded runs' I-GreedyProbe/I-Calendar rows
 * gate on mass only — see policies.ts). The web AI ports the MEASURED
 * policy; deviating here would make the on-device opponent something other
 * than the balance data's subject. Registered as ADR-007 D2.
 *
 * Anti-cheat parity (normative, 05-ai-spec §2): the policy is a pure
 * function of the InvestigatorView — the same public log + private probe
 * results a human Investigator may write down. It never reads fugitive
 * state; TypeScript's InvestigatorView is the wall (fugitive block is
 * structurally empty). No RNG anywhere — fully deterministic.
 */
import {
  investigatorLegality,
  type CaseSession,
  type EffectiveParams,
  type InvestigatorSubmission,
  type InvestigatorView,
} from '@dead-drop/engine';
import { BeliefTracker } from './belief-tracker';

/** Build the case's tracker. Call ONCE per case (it consumes events
 *  incrementally and must persist across days); reuse it for the whole case. */
export function makeTracker(session: CaseSession): BeliefTracker {
  return new BeliefTracker(
    session.vm,
    session.config.safehouse,
    session.config.stamina_budget,
    session.config.drops[0]!,
    session.config.drops[1]!,
    session.p,
  );
}

/** One decision (§2 step 6), verbatim sim semantics:
 *  stakeout (gated) → probe (modal node) → WAIT. */
export function greedyProbeDecide(
  tracker: BeliefTracker,
  view: InvestigatorView,
  params: EffectiveParams,
): InvestigatorSubmission {
  tracker.sync(view);
  tracker.markDay(view.day);

  const leg = investigatorLegality(view, params);
  const modal = tracker.maxNode();

  // Stakeout: GATE on the current posterior (where they are), AIM at the
  // predictive argmax (where they'll be at §2-step-2 resolution).
  if (leg.stakeout && modal.mass >= 0.4) {
    const pred = tracker.predictiveMaxNode();
    return { kind: 'STAKEOUT', target: pred.node };
  }

  if (leg.probe) {
    return { kind: 'PROBE', target: modal.node };
  }

  return { kind: 'WAIT' };
}

/** Run the AI Investigator's step-6 actions through the engine's public API
 *  until WAIT ends the phase — the same loop the sim harness runs
 *  (harness.ts §2 step 6), so live play, reload-resume, and history replay
 *  produce bit-identical investigator behavior. One path everywhere.
 *
 *  `tracker` is the case-long BeliefTracker (incremental event consumer).
 *  Deterministic: no RNG, lexicographic tie-breaks, engine-idempotent keys. */
export function runInvestigatorAi(
  session: CaseSession,
  tracker: BeliefTracker,
  onAction?: (action: InvestigatorSubmission, day: number) => void,
): void {
  let idx = 0;
  while (session.state.verdict === null && session.state.phase === 'INVESTIGATOR_ACTIONS') {
    if (++idx > 64) {
      throw new Error(`[AI-I] investigator action loop guard on day ${session.state.day}`);
    }
    const action = greedyProbeDecide(tracker, session.investigatorView(), session.p);
    if (action.kind === 'WAIT') {
      session.endInvestigatorPhase();
      break;
    }
    session.submitInvestigator({ idempotency_key: `ai-i-${session.state.day}-${idx}`, action });
    onAction?.(action, session.state.day);
  }
}
