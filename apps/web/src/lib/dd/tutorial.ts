/**
 * Dead Drop — tutorial script (M3 W2, 06-uiux §3 beats 1–3).
 *
 * Scripted case "caught in the act" on FIXED seed 6 (found offline via
 * scripts/m3_w2_tutorial_seed.mjs against the real generator):
 *   safehouse D3-06 · drop[0] D2-06 (Metro hub→hub, adjacent) ·
 *   drop[1] D4-07 · gate D1-08.
 *
 * Flow (Investigator role only — the fugitive mini-case is a later week):
 *   Day 1 — scripted Fugitive HOLDs at the safehouse (engine-submitted like
 *     any move; the store routes tutorial days through this script instead
 *     of the archetype planner).
 *     Beat 1  tap-drop     — map literacy: tap any published drop site.
 *     Beat 2  probe-sh     — first probe, guaranteed HIT: probe the
 *                            safehouse ("they never left").
 *     Beat 3  stakeout-drop— first stakeout: arm on drop[0] (3 IP, §5.2
 *                            line shown), then end the phase.
 *   Day 2 — scripted Fugitive MOVEs safehouse → drop[0] (arrival collects
 *     drop 1 per M2-001) and ends the day there → the stakeout resolves at
 *     day-2 step 2 (engine checks the post-move position) → CAPTURE.
 *     Beat 4  replay       — verdict card + "how you read them" replay intro.
 *
 * Guardrails (06-uiux §3): cannot be forfeited mid-beat; outcomes are fixed
 * regardless of play; completion flag unlocks the skip toggle.
 */
import type { NodeId } from '@dead-drop/engine';

export const TUTORIAL_SEED = 6;

export type TutorialBeat =
  | 'welcome' // intro card
  | 'tap-drop' // tap any drop-candidate square
  | 'probe-sh' // probe the safehouse (guaranteed HIT)
  | 'stakeout-drop' // arm a stakeout on drop[0]
  | 'end-phase' // end the phase; the night comes
  | 'replay'; // verdict card + replay intro

export interface TutorialStep {
  beat: TutorialBeat;
  title: string;
  body: string;
}

export const TUTORIAL_STEPS: Record<TutorialBeat, TutorialStep> = {
  welcome: {
    beat: 'welcome',
    title: 'The 60-second hunt',
    body: 'You are the Investigator. A Fugitive is moving through this city in secret — you will never see them, only the evidence the rules hand you. Learn the loop by catching one.',
  },
  'tap-drop': {
    beat: 'tap-drop',
    title: 'Start at the drops',
    body: 'The city published this heist\u2019s drop sites — the SQUARES. They must visit two of them, in order, before reaching the gate. Tap any drop site to look at it.',
  },
  'probe-sh': {
    beat: 'probe-sh',
    title: 'Your first probe',
    body: 'A probe answers one question about TODAY: \u201cwere you here?\u201d It costs 1 IP. They are still lying low at their safehouse (the TRIANGLE) — tap it, then probe it.',
  },
  'stakeout-drop': {
    beat: 'stakeout-drop',
    title: 'Arm a stakeout',
    body: 'They will move for the first drop next. Stake out that drop site — 3 IP, and it resolves tomorrow at step 2. The Fugitive will not be notified. Hold the button to commit.',
  },
  'end-phase': {
    beat: 'end-phase',
    title: 'End the phase',
    body: 'Your phase is done. End it — the night comes, they move, and tomorrow your stakeout checks where they ended up.',
  },
  replay: {
    beat: 'replay',
    title: 'That\u2019s the whole loop',
    body: 'CAPTURE. Evidence in, prediction out, caught in the act. The replay shows how you read them — every route, every probe, every reveal. Watch it after any case.',
  },
};

/** The scripted Fugitive's move for a given day. Day 1: HOLD at the
 *  safehouse. Day 2+: walk onto the pending drop (drop[0] by construction). */
export function tutorialFugitiveAction(
  day: number,
  position: NodeId,
  pendingDrop: NodeId,
): { kind: 'HOLD' } | { kind: 'MOVE'; to: NodeId } {
  void position;
  return day === 1 ? { kind: 'HOLD' } : { kind: 'MOVE', to: pendingDrop };
}

const DONE_KEY = 'dd.tutorial.done.v1';

export function isTutorialDone(): boolean {
  try {
    return window.localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialDone(): void {
  try {
    window.localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* ignore */
  }
}
