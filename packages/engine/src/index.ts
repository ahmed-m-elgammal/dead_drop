/**
 * @dead-drop/engine — public surface.
 *
 * M2 W2 scope (m2/M2-execution-plan.md W2; ADR-002 for resolve()):
 *   - the type layer (types.ts, M1 lift + T12 amendment),
 *   - map loading/validation (map.ts),
 *   - the PINNED case-config feasibility gate (feasibility.ts),
 *   - the seeded case generator + C5 reports + C6 batching (generator.ts),
 *   - resolve(): the §2 seven-step day resolution, §5 actions, §6 verdicts,
 *     §9 edge rulings, §9.10 idempotency, §8.6 disclosure (engine.ts)
 *     — DRAFT-UNFREEZE per ADR-002; transcript reconciliation at M1 freeze.
 */
export * from './types.js';
export * from './map.js';
export * from './feasibility.js';
export * from './generator.js';
export * from './engine.js';
