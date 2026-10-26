/**
 * Dead Drop — solo ladder (M3 W2, 06-uiux S7).
 *
 * 24 cases built by the ENGINE's C6 `buildLadder` (diversity-constrained,
 * seeded → every install sees the same ladder), with a fixed tier ramp:
 * cases 1–8 Random (teaching), 9–16 Cautious (sharp), 17–24 Deceptive
 * (boss). The ramp doubles as the M4 measurement frame for the 05-ai-spec
 * §3 hypothesis (probes-per-capture rises Random < Cautious < Deceptive).
 *
 * Progress lives on-device only (localStorage) — no accounts, no server
 * (10-roadmap §0 scope fence). Stars are a local proxy for the M4 skill
 * axes: capture efficiency + budget discipline.
 */
import type { Verdict } from '@dead-drop/engine';
import type { ArchetypeId } from './archetypes';
import { ARCHETYPES } from './archetypes';
import { VM } from './vm';
import { buildLadder } from '@dead-drop/engine';

export const LADDER_SEED = 20261026;
export const LADDER_SIZE = 24;

export interface LadderSlot {
  /** 0-based ladder position. */
  index: number;
  /** The case's generation seed — generateCase(VM, seed) reproduces it exactly. */
  seed: number;
  archetype: ArchetypeId;
  tier: string;
}

let cache: LadderSlot[] | null = null;

/** The 24 ladder slots (memoized — buildLadder is deterministic per seed). */
export function ladderSlots(): LadderSlot[] {
  if (cache) return cache;
  const cases = buildLadder(VM, LADDER_SEED, LADDER_SIZE);
  cache = cases.map((c, i) => {
    const archetype: ArchetypeId = i < 8 ? 'random' : i < 16 ? 'cautious' : 'deceptive';
    return { index: i, seed: c.config.seed, archetype, tier: ARCHETYPES[archetype].tier };
  });
  return cache;
}

/** Stars — local completion proxy (documented in ADR-006):
 *  CAPTURE with ≥4 IP left = 3 (efficient + disciplined) · CAPTURE = 2 ·
 *  EXPIRY = 1 (they ran out of clock) · ESCAPE/other = 0. */
export function starsFor(verdict: Verdict, intelLeft: number): 0 | 1 | 2 | 3 {
  if (verdict === 'CAPTURE') return intelLeft >= 4 ? 3 : 2;
  if (verdict === 'EXPIRY') return 1;
  return 0;
}

export interface LadderResult {
  verdict: Verdict;
  stars: 0 | 1 | 2 | 3;
  closedAt: number;
}

export interface LadderProgress {
  results: Partial<Record<number, LadderResult>>;
}

const LADDER_KEY = 'dd.m3w2.ladder.v1';

export function loadLadderProgress(): LadderProgress {
  try {
    const raw = window.localStorage.getItem(LADDER_KEY);
    if (!raw) return { results: {} };
    const parsed = JSON.parse(raw) as LadderProgress;
    if (parsed && typeof parsed === 'object' && parsed.results) return parsed;
    return { results: {} };
  } catch {
    return { results: {} };
  }
}

export function saveLadderResult(index: number, r: LadderResult): void {
  const p = loadLadderProgress();
  p.results[index] = r;
  try {
    window.localStorage.setItem(LADDER_KEY, JSON.stringify(p));
  } catch {
    /* private mode — ladder progress stays in memory for the session */
  }
}
