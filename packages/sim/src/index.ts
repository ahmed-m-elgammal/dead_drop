/**
 * @dead-drop/sim — public surface.
 *
 * M2 W3 scope (m2/M2-execution-plan.md §1 W3):
 *   - belief.ts: the Investigator-side exact belief filter (T10-compliant:
 *     belief lives OUTSIDE engine state)
 *   - policies.ts: the 5×4 scripted policy set (04-balance-sim §4.2)
 *   - harness.ts: case runner + Wilson-CI aggregation + matrix + determinism
 *   - sweeps.ts: scenario sweeps S1–S7 (04-balance-sim §4.4)
 *   - cli.ts: matrix | sweeps | determinism | all
 */
export * from './belief.js';
export * from './policies.js';
export * from './harness.js';
export * from './sweeps.js';
