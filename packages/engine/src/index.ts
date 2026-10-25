/**
 * @dead-drop/engine — public surface.
 *
 * M2 W2 pre-flight scope (m2/M2-execution-plan.md W2):
 *   - the verbatim type layer (types.ts),
 *   - map loading/validation (map.ts),
 *   - the PINNED case-config feasibility gate (feasibility.ts),
 *   - the seeded case generator + C5 reports + C6 batching (generator.ts).
 *
 * Deliberately NOT here yet (freeze-gated per the plan): resolve() — the
 * §2 seven-step day resolution — starts only after the M1 freeze tag
 * (`m1-freeze-<version>`, m1/freeze-checklist.md §2).
 */
export * from './types.js';
export * from './map.js';
export * from './feasibility.js';
export * from './generator.js';
