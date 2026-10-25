/**
 * Dead Drop — solo game store (M3 W1).
 *
 * Architecture (07-architecture §2, Option B): the UI drives the REAL engine —
 * `CaseSession` is the only rules authority; the store never re-implements a
 * rule. What the store adds is:
 *   1. day-loop mediation (AI F-Planner submits through the same public API
 *      a human Fugitive would; §9.13 stranding is resolved via the engine's
 *      designed `resolveStranded()` contract),
 *   2. the action journal + deterministic replay: a case IS (seed +
 *      investigator submissions) — reload rebuilds the session by replaying
 *      the journal through the engine (07-architecture §4 "the case is the
 *      action list + config (replayable)").
 *      The AI is a deterministic function of the session, so Fugitive moves
 *      need no journaling: same seed ⇒ same route. This is the 05-ai-spec §7
 *      reproducibility property, live.
 *   3. role-scoped projection: the UI only ever sees `session.investigatorView()`.
 */
import { create } from 'zustand';
import { toast } from 'sonner';

import mapJson from '@/data/map_alpha.json';
import {
  CaseSession,
  EngineError,
  generateCase,
  investigatorLegality,
  validateCityMap,
  type ActionEnvelope,
  type CaseConfig,
  type CaseEndDisclosure,
  type InvestigatorSubmission,
  type InvestigatorView,
  type NodeId,
  type ValidatedMap,
  type Verdict,
} from '@dead-drop/engine';
import { fPlannerMove } from './f-planner';

export const VM: ValidatedMap = validateCityMap(mapJson);

export type MarkerKind = 'possible' | 'pinned' | 'cleared';
export type Mode = 'inspect' | 'probe' | 'stakeout';

interface CaseRecord {
  seed: number;
  /** Investigator submissions in order — the journal. Fugitive moves are
   *  deterministic from the seed and are NOT stored. */
  investigator: Array<ActionEnvelope<InvestigatorSubmission>>;
  verdict: Verdict | null;
  closedAt?: number;
}

const STORE_KEY = 'dd.m3w1.case.v1';

function loadRecord(): CaseRecord | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CaseRecord;
    if (typeof parsed?.seed !== 'number' || !Array.isArray(parsed.investigator)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveRecord(r: CaseRecord): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(r));
  } catch {
    /* private mode etc. — the case stays playable in memory */
  }
}

function clearRecord(): void {
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

let aiTimer: ReturnType<typeof setTimeout> | null = null;

export interface DDState {
  screen: 'setup' | 'case';
  session: CaseSession | null;
  config: CaseConfig | null;
  view: InvestigatorView | null;
  disclosure: CaseEndDisclosure | null;
  record: CaseRecord | null;
  /** Resumable open case found at hydration. */
  resumable: CaseRecord | null;
  markers: Record<NodeId, MarkerKind>;
  selected: NodeId | null;
  mode: Mode;
  aiThinking: boolean;
  beliefHalo: boolean;

  hydrate: () => void;
  startCase: (seed: number, resume?: CaseRecord) => void;
  resumeCase: () => void;
  abandonCase: () => void;
  select: (n: NodeId | null) => void;
  setMode: (m: Mode) => void;
  setMarker: (n: NodeId, kind: MarkerKind | undefined) => void;
  toggleHalo: () => void;
  probe: (n: NodeId) => void;
  stakeout: (n: NodeId) => void;
  endPhase: () => void;
}

function depsOf(session: CaseSession, config: CaseConfig) {
  return { vm: VM, config, params: session.p };
}

/** Run the AI Fugitive's day (steps 1–5) through the engine's public API. */
function runAiDay(session: CaseSession, config: CaseConfig): void {
  while (session.state.phase === 'FUGITIVE_MOVE' && session.state.verdict === null) {
    const action = fPlannerMove(depsOf(session, config), session.fugitiveView());
    if (action === null) {
      session.resolveStranded(); // §9.13 — engine-produced, never submitted
      toast.info('The Fugitive is stranded — forced Hold at no cost (§9.13).');
      continue;
    }
    session.submitFugitive({ idempotency_key: `ai-f-${session.state.day}`, action });
  }
}

function describe(action: InvestigatorSubmission): string {
  return action.kind === 'PROBE'
    ? `probe @ ${action.target}`
    : action.kind === 'STAKEOUT'
      ? `stakeout @ ${action.target}`
      : 'end phase';
}

export const useDD = create<DDState>((set, get) => ({
  screen: 'setup',
  session: null,
  config: null,
  view: null,
  disclosure: null,
  record: null,
  resumable: null,
  markers: {},
  selected: null,
  mode: 'inspect',
  aiThinking: false,
  beliefHalo: false,

  hydrate: () => {
    const rec = loadRecord();
    set({ resumable: rec && rec.verdict === null ? rec : null });
  },

  startCase: (seed, resume) => {
    if (aiTimer !== null) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    let session: CaseSession;
    let config: CaseConfig;
    try {
      const gen = generateCase(VM, seed);
      config = gen.config;
      session = new CaseSession(VM, config);
    } catch (err) {
      toast.error(`Case generation failed for seed ${seed}: ${String(err)}`);
      return;
    }

    const record: CaseRecord = resume
      ? { seed, investigator: [...resume.investigator], verdict: null, closedAt: undefined }
      : { seed, investigator: [], verdict: null };

    try {
      runAiDay(session, config); // day 1 fugitive move → investigator phase
      for (const env of record.investigator) {
        session.submitInvestigator(env); // fresh session: journal replays cleanly
        if (session.state.phase === 'FUGITIVE_MOVE') runAiDay(session, config);
      }
      if (record.investigator.length === 0 && record.verdict !== null) {
        // replaying a closed case is not a W1 flow; guard anyway
        record.verdict = null;
      }
    } catch (err) {
      toast.error(`Replay failed — starting fresh (${String(err)})`);
      session = new CaseSession(VM, config);
      record.investigator = [];
      record.verdict = null;
      runAiDay(session, config);
    }

    const over = session.state.verdict !== null;
    if (over) {
      record.verdict = session.state.verdict;
      record.closedAt = Date.now();
    }
    saveRecord(record);

    set({
      screen: 'case',
      session,
      config,
      view: session.investigatorView(),
      disclosure: over ? session.disclosure() : null,
      record,
      resumable: null,
      markers: {},
      selected: null,
      mode: 'inspect',
      aiThinking: false,
    });
  },

  resumeCase: () => {
    const rec = get().resumable;
    if (rec) get().startCase(rec.seed, rec);
  },

  abandonCase: () => {
    if (aiTimer !== null) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    clearRecord();
    set({
      screen: 'setup',
      session: null,
      config: null,
      view: null,
      disclosure: null,
      record: null,
      resumable: null,
      markers: {},
      selected: null,
      mode: 'inspect',
      aiThinking: false,
    });
  },

  select: (n) => set({ selected: n }),
  setMode: (m) => set({ mode: m }),
  setMarker: (n, kind) => {
    const markers = { ...get().markers };
    if (kind === undefined) delete markers[n];
    else markers[n] = kind;
    set({ markers });
  },
  toggleHalo: () => set({ beliefHalo: !get().beliefHalo }),

  probe: (n) => {
    const { session, config, record } = get();
    if (!session || !config || !record || session.state.verdict !== null) return;
    if (session.state.phase !== 'INVESTIGATOR_ACTIONS') {
      toast.warning('The Fugitive is moving — probes open in your phase.');
      return;
    }
    const leg = investigatorLegality(session.state, session.p);
    if (!leg.probe) {
      toast.warning('Probe unavailable (cap 2/day or out of IP).');
      return;
    }
    const env: ActionEnvelope<InvestigatorSubmission> = {
      idempotency_key: `i-${session.state.day}-probe-${n}-${session.state.investigator.probes_today}`,
      action: { kind: 'PROBE', target: n },
    };
    try {
      session.submitInvestigator(env);
      record.investigator.push(env);
      saveRecord(record);
      const last = session.state.private_log_investigator.at(-1);
      if (last?.kind === 'PROBE_RESULT') {
        if (last.result === 'HIT') toast.success(`Probe HIT — they ended today on ${n}.`);
        else toast.info(`Probe MISS at ${n} — not there today.`);
      }
      set({ view: session.investigatorView() });
    } catch (err) {
      toast.error(`Engine rejected probe: ${errText(err)}`);
    }
  },

  stakeout: (n) => {
    const { session, config, record } = get();
    if (!session || !config || !record || session.state.verdict !== null) return;
    if (session.state.phase !== 'INVESTIGATOR_ACTIONS') {
      toast.warning('The Fugitive is moving — stakeouts open in your phase.');
      return;
    }
    const leg = investigatorLegality(session.state, session.p);
    if (!leg.stakeout) {
      toast.warning(
        session.state.day >= session.p.P1_days_per_case
          ? 'Stakeouts are forbidden on Day 8 (§9.3).'
          : 'Stakeout unavailable (slot occupied or under 3 IP).',
      );
      return;
    }
    const env: ActionEnvelope<InvestigatorSubmission> = {
      idempotency_key: `i-${session.state.day}-stakeout-${n}`,
      action: { kind: 'STAKEOUT', target: n },
    };
    try {
      session.submitInvestigator(env);
      record.investigator.push(env);
      saveRecord(record);
      toast.success(
        `Stakeout armed on ${n} — resolves tomorrow at step 2. The Fugitive will not be notified.`,
        { duration: 5000 },
      );
      set({ view: session.investigatorView() });
    } catch (err) {
      toast.error(`Engine rejected stakeout: ${errText(err)}`);
    }
  },

  endPhase: () => {
    const { session, config, record } = get();
    if (!session || !config || !record || session.state.verdict !== null) return;
    if (session.state.phase !== 'INVESTIGATOR_ACTIONS') return;
    const env: ActionEnvelope<InvestigatorSubmission> = {
      idempotency_key: `i-${session.state.day}-wait-${record.investigator.length}`,
      action: { kind: 'WAIT' },
    };
    try {
      session.submitInvestigator(env); // WAIT == end phase (§2 step 6/7)
      record.investigator.push(env);
      saveRecord(record);
    } catch (err) {
      toast.error(`Engine rejected end-phase: ${errText(err)}`);
      return;
    }
    set({ view: session.investigatorView() });

    if (session.state.verdict !== null) {
      finalizeOver(set, session, record);
      return;
    }
    // Brief UX beat so the day transition reads — determinism unaffected.
    set({ aiThinking: true });
    aiTimer = setTimeout(() => {
      aiTimer = null;
      const s = get().session;
      const c = get().config;
      if (!s || !c) return;
      try {
        runAiDay(s, c);
      } catch (err) {
        toast.error(`AI day failed: ${errText(err)}`);
      }
      const rec = get().record!;
      set({ aiThinking: false, view: s.investigatorView() });
      if (s.state.verdict !== null) finalizeOver(set, s, rec);
    }, 700);
  },
}));

function finalizeOver(
  set: (partial: Partial<DDState>) => void,
  session: CaseSession,
  record: CaseRecord,
): void {
  record.verdict = session.state.verdict;
  record.closedAt = Date.now();
  saveRecord(record);
  const d = session.state.verdict;
  set({ disclosure: session.disclosure(), aiThinking: false, view: session.investigatorView() });
  if (d === 'CAPTURE' || d === 'EXPIRY') toast.success(`Case closed — ${d}. You win.`);
  else if (d === 'ESCAPE') toast.error(`Case closed — ESCAPE. The Fugitive is gone.`);
  else toast.info(`Case closed — ${d}.`);
}

function errText(err: unknown): string {
  if (err instanceof EngineError) return `${err.code} — ${err.message}`;
  return String(err);
}
