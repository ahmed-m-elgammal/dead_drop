/**
 * Dead Drop — player-skill measurement, Stage 3 (M3 W3).
 *
 * Spec: 05-ai-spec §4 — measured per ROLLING WINDOW (last 10 cases), stored
 * ON-DEVICE (privacy: no server profile before accounts exist), feeding solo
 * ladder gating, archetype blend selection, and (post-M4) the adaptive
 * director. No cross-player comparison, no transmission.
 *
 * Operationalization (registered ADR-007 D3 — the spec names the four axes
 * per role but not their formulas; these are the MVP formulas, computed from
 * each closed case's live engine state + §8.6 disclosure, persisted as
 * SkillFacts on the history record):
 *
 *   Investigator axes
 *     - efficiency:      probes per capture (window total ÷ captures; undefined
 *                        with zero captures — excluded from the composite)
 *     - calibration:     mean posterior mass the exact Bayesian tracker puts
 *                        on the TRUE final position at case end ("marker
 *                        agreement with ground truth", 0..1, higher better)
 *     - budget:          mean unspent-IP share at verdict (0..1, higher better)
 *     - stakeout conv.:  stakeout hits ÷ stakeouts placed (0..1, higher better;
 *                        probes never capture — probe/stakeout split, M1 AUD —
 *                        so a CAPTURE verdict is exactly one stakeout hit)
 *
 *   Fugitive axes
 *     - escape rate:     ESCAPE verdicts ÷ cases in the window
 *     - reveal exposure: mean share of reveal events that carried TRUE
 *                        information about the fugitive (0..1, LOWER better —
 *                        "how much truth each reveal carried")
 *     - stamina:         mean unspent-SP share at escape (0..1, higher better)
 *     - deception:       investigator stakeout miss rate faced (0..1, higher
 *                        better — read from the §8.6 disclosure's private log)
 *
 *   Tier per role: Novice / Analyst / Detective / Ghost-hunter — a weighted
 *   composite of the axis scores (each normalized 0..1; weights in
 *   TIERS_META, mirrored in the UI). Thresholds are an MVP calibration call
 *   (40/55/70) pending real skill-curve data (M4).
 */
import type { CaseEndDisclosure, CaseSession, Verdict } from '@dead-drop/engine';
import { BeliefTracker } from './belief-tracker';
import { listCaseRecords, type HistoryRecord } from './history';

/* -------------------------------------------------------------- SkillFacts */

export interface SkillFacts {
  /** Common. */
  verdict: Verdict;
  days: number;
  /** Investigator-role facts. */
  probes_used?: number;
  stakeouts_used?: number;
  stakeout_hits?: number;
  intel_left?: number;
  intel_budget?: number;
  /** Posterior mass on the true final position (calibration axis). */
  belief_mass_at_truth?: number;
  /** Fugitive-role facts. */
  sp_left?: number;
  sp_budget?: number;
  reveals_total?: number;
  reveals_true?: number;
  stakeouts_faced?: number;
  stakeout_misses?: number;
}

/** Posterior mass the exact tracker puts on the true final position, given
 *  the CLOSED session (calibration axis for investigator-role cases). */
export function beliefMassAtTruth(session: CaseSession): number {
  const disclosure = session.disclosure();
  const route = disclosure.fugitive_route;
  const finalNode = route[route.length - 1]?.to;
  if (!finalNode) return 0;
  const tracker = new BeliefTracker(
    session.vm,
    session.config.safehouse,
    session.config.stamina_budget,
    session.config.drops[0]!,
    session.config.drops[1]!,
    session.p,
  );
  const view = session.investigatorView();
  tracker.sync(view);
  tracker.markDay(view.day);
  return tracker.massAt(finalNode);
}

/** Collect the per-case skill facts at close, from live engine state + the
 *  §8.6 disclosure only. `role` is the role the HUMAN played. */
export function collectSkillFacts(session: CaseSession, role: 'investigator' | 'fugitive'): SkillFacts {
  const disclosure: CaseEndDisclosure = session.disclosure();
  const verdict = session.state.verdict!;
  const facts: SkillFacts = { verdict, days: session.state.day };

  const privateLog = disclosure.private_log_investigator;
  const stakeoutsPlaced = privateLog.filter((e) => e.kind === 'STAKEOUT_PLACED').length;
  const stakeoutMisses = privateLog.filter((e) => e.kind === 'STAKEOUT_MISS').length;

  if (role === 'investigator') {
    facts.probes_used = privateLog.filter((e) => e.kind === 'PROBE_RESULT').length;
    facts.stakeouts_used = stakeoutsPlaced;
    // Probes never capture (probe/stakeout split) — CAPTURE ⇔ one stakeout hit.
    facts.stakeout_hits = verdict === 'CAPTURE' ? 1 : 0;
    facts.intel_left = disclosure.investigator.intel;
    facts.intel_budget = session.config.intel_budget;
    facts.belief_mass_at_truth = beliefMassAtTruth(session);
  } else {
    facts.sp_left = disclosure.fugitive.stamina;
    facts.sp_budget = session.config.stamina_budget;
    // How much truth each scheduled reveal carried, read off the disclosure.
    const route = disclosure.fugitive_route;
    let total = 0;
    let truthful = 0;
    for (const ev of disclosure.log) {
      if (ev.kind === 'DISTRICT_REVEAL') {
        total++;
        const entry = route.find((r) => r.day === ev.day);
        if (entry && session.vm.districtOf.get(entry.to) === ev.district) truthful++;
      } else if (ev.kind === 'TRANSIT_REVEAL') {
        total++;
        const entry = route.find((r) => r.day === ev.day);
        const trueCls = entry?.edge_class ?? null;
        if ((trueCls ?? 'NO_MOVEMENT') === ev.move_class) truthful++;
      }
    }
    facts.reveals_total = total;
    facts.reveals_true = truthful;
    facts.stakeouts_faced = stakeoutsPlaced;
    facts.stakeout_misses = stakeoutMisses;
  }
  return facts;
}

/* ------------------------------------------------------- windows and tiers */

export const WINDOW_SIZE = 10; // 05-ai-spec §4: rolling last-10

export type SkillTier = 'Novice' | 'Analyst' | 'Detective' | 'Ghost-hunter';

export interface SkillAxis {
  id: string;
  label: string;
  /** Normalized 0..1, higher = stronger. `null` = not measurable this window. */
  value: number | null;
  /** Human-readable raw value behind `value`. */
  raw: string;
  hint: string;
}

export interface RoleSkill {
  role: 'investigator' | 'fugitive';
  cases: number; // window fill (0 → everything null)
  tier: SkillTier;
  composite: number | null; // 0..100
  axes: SkillAxis[];
}

const TIER_CUTS: Array<{ min: number; tier: SkillTier }> = [
  { min: 70, tier: 'Ghost-hunter' },
  { min: 55, tier: 'Detective' },
  { min: 40, tier: 'Analyst' },
  { min: 0, tier: 'Novice' },
];

function tierOf(composite: number | null): SkillTier {
  if (composite === null) return 'Novice';
  for (const c of TIER_CUTS) if (composite >= c.min) return c.tier;
  return 'Novice';
}

const mean = (xs: number[]): number | null =>
  xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

export function investigatorSkill(records: HistoryRecord[]): RoleSkill {
  const win = records
    .filter((r) => (r.role ?? 'investigator') === 'investigator' && r.skill)
    .sort((a, b) => b.closedAt - a.closedAt)
    .slice(0, WINDOW_SIZE)
    .map((r) => r.skill!);
  const n = win.length;

  const captures = win.filter((f) => f.verdict === 'CAPTURE').length;
  const probes = win.reduce((a, f) => a + (f.probes_used ?? 0), 0);
  const efficiency = captures > 0 ? probes / captures : null;
  const calibration = mean(win.map((f) => f.belief_mass_at_truth ?? 0));
  const budget = mean(win.filter((f) => f.intel_budget).map((f) => (f.intel_left ?? 0) / f.intel_budget!));
  const stakes = win.reduce((a, f) => a + (f.stakeouts_used ?? 0), 0);
  const hits = win.reduce((a, f) => a + (f.stakeout_hits ?? 0), 0);
  const conversion = stakes > 0 ? hits / stakes : null;

  // Composite: calibration 30% · conversion 30% · budget 20% · efficiency 20%
  // (efficiency inverted — fewer probes per capture is stronger; a window
  // with no captures contributes 0 for that axis, honestly harsh).
  const effScore = efficiency === null ? (captures === 0 && n > 0 ? 0 : null) : Math.max(0, 1 - (efficiency - 2) / 10);
  const parts: Array<{ w: number; v: number | null }> = [
    { w: 0.3, v: calibration },
    { w: 0.3, v: conversion },
    { w: 0.2, v: budget },
    { w: 0.2, v: effScore },
  ];
  const wsum = parts.reduce((a, p) => a + (p.v !== null ? p.w : 0), 0);
  const composite =
    n === 0 || wsum === 0
      ? null
      : Math.round((parts.reduce((a, p) => a + (p.v !== null ? p.w * p.v : 0), 0) / wsum) * 100);

  return {
    role: 'investigator',
    cases: n,
    tier: tierOf(composite),
    composite,
    axes: [
      {
        id: 'efficiency', label: 'Probe efficiency',
        value: effScore,
        raw: captures > 0 ? `${probes} probes / ${captures} capture${captures > 1 ? 's' : ''}` : captures === 0 && n > 0 ? 'no captures yet' : '—',
        hint: 'Probes per capture — lower is sharper (05-ai-spec §4).',
      },
      {
        id: 'calibration', label: 'Belief calibration',
        value: calibration,
        raw: calibration === null ? '—' : `${Math.round(calibration * 100)}% mass on truth`,
        hint: 'Mean exact-posterior mass on the true final position at case end.',
      },
      {
        id: 'budget', label: 'Budget discipline',
        value: budget,
        raw: budget === null ? '—' : `${Math.round(budget * 100)}% IP unspent`,
        hint: 'Unspent intel at verdict — don\'t die with IP in your pocket.',
      },
      {
        id: 'conversion', label: 'Stakeout conversion',
        value: conversion,
        raw: stakes > 0 ? `${hits}/${stakes} stakes hit` : 'no stakeouts yet',
        hint: 'Stakeout hits ÷ stakeouts placed.',
      },
    ],
  };
}

export function fugitiveSkill(records: HistoryRecord[]): RoleSkill {
  const win = records
    .filter((r) => r.role === 'fugitive' && r.skill)
    .sort((a, b) => b.closedAt - a.closedAt)
    .slice(0, WINDOW_SIZE)
    .map((r) => r.skill!);
  const n = win.length;

  const escapes = win.filter((f) => f.verdict === 'ESCAPE').length;
  const escapeRate = n > 0 ? escapes / n : null;
  const exposure = mean(
    win
      .filter((f) => (f.reveals_total ?? 0) > 0)
      .map((f) => (f.reveals_true ?? 0) / f.reveals_total!),
  );
  const stamina = mean(
    win.filter((f) => f.verdict === 'ESCAPE' && f.sp_budget).map((f) => (f.sp_left ?? 0) / f.sp_budget!),
  );
  const faced = win.reduce((a, f) => a + (f.stakeouts_faced ?? 0), 0);
  const misses = win.reduce((a, f) => a + (f.stakeout_misses ?? 0), 0);
  const deception = faced > 0 ? misses / faced : null;

  // Composite: escape rate 40% · deception 25% · reveal exposure (inverted)
  // 20% · stamina 15%. Exposure with no reveals yet contributes null, not 1.
  const exposureScore = exposure === null ? null : 1 - exposure;
  const parts: Array<{ w: number; v: number | null }> = [
    { w: 0.4, v: escapeRate },
    { w: 0.25, v: deception },
    { w: 0.2, v: exposureScore },
    { w: 0.15, v: stamina },
  ];
  const wsum = parts.reduce((a, p) => a + (p.v !== null ? p.w : 0), 0);
  const composite =
    n === 0 || wsum === 0
      ? null
      : Math.round((parts.reduce((a, p) => a + (p.v !== null ? p.w * p.v : 0), 0) / wsum) * 100);

  return {
    role: 'fugitive',
    cases: n,
    tier: tierOf(composite),
    composite,
    axes: [
      {
        id: 'escape', label: 'Escape rate',
        value: escapeRate,
        raw: `${escapes}/${n} escaped`,
        hint: 'ESCAPE verdicts ÷ cases in the window.',
      },
      {
        id: 'deception', label: 'Deception success',
        value: deception,
        raw: faced > 0 ? `${misses}/${faced} stakes missed you` : 'no stakeouts faced yet',
        hint: 'Investigator stakeout miss rate while they hunted you.',
      },
      {
        id: 'exposure', label: 'Reveal-day exposure',
        value: exposureScore,
        raw: exposure === null ? '—' : `${Math.round(exposure * 100)}% of reveals were true`,
        hint: 'How much truth each scheduled reveal carried — lower is better.',
      },
      {
        id: 'stamina', label: 'Stamina discipline',
        value: stamina,
        raw: stamina === null ? '—' : `${Math.round(stamina * 100)}% SP unspent`,
        hint: 'Unspent stamina share on escapes — efficiency headroom.',
      },
    ],
  };
}

/** Both roles' rolling-window readouts, from the on-device history. */
export async function loadSkillProfiles(): Promise<{ investigator: RoleSkill; fugitive: RoleSkill }> {
  const records = await listCaseRecords();
  return { investigator: investigatorSkill(records), fugitive: fugitiveSkill(records) };
}
