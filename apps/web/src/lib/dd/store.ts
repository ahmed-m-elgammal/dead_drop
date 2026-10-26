/**
 * Dead Drop — solo game store (M3 W2).
 *
 * Architecture (07-architecture §2, Option B): the UI drives the REAL engine —
 * `CaseSession` is the only rules authority; the store never re-implements a
 * rule. What the store adds is:
 *   1. day-loop mediation (the AI — archetype blend per 05-ai-spec §3 —
 *      submits through the same public API a human Fugitive would; §9.13
 *      stranding resolves via the engine's `resolveStranded()` contract;
 *      tutorial days run a scripted controller, also engine-submitted),
 *   2. the action journal + deterministic replay: a case IS (seed +
 *      archetype + investigator submissions). Reload rebuilds the session by
 *      replaying the journal through the engine and re-running the SAME
 *      archetype's per-day seeded streams — same seed ⇒ same route
 *      (05-ai-spec §7 reproducibility, live for every archetype),
 *   3. role-scoped projection: the UI only ever sees `session.investigatorView()`,
 *   4. case lifecycle: solo cases, the 24-case ladder (06-uiux S7), tutorial
 *      beats 1–3 (06-uiux §3), and the closed-case history archive (IndexedDB).
 */
import { create } from 'zustand';
import { toast } from 'sonner';

import {
  CaseSession,
  EngineError,
  generateCase,
  investigatorLegality,
  type ActionEnvelope,
  type CaseConfig,
  type CaseEndDisclosure,
  type InvestigatorSubmission,
  type InvestigatorView,
  type NodeId,
  type Verdict,
} from '@dead-drop/engine';
import { runDays, type ArchetypeId } from './archetypes';
import { VM } from './vm';
import { ladderSlots, saveLadderResult, starsFor } from './ladder';
import {
  saveCaseRecord,
  type CaseSource,
  type HistoryRecord,
} from './history';
import {
  TUTORIAL_SEED,
  isTutorialDone,
  markTutorialDone,
  type TutorialBeat,
} from './tutorial';

export { VM };
export type { ArchetypeId };

export type MarkerKind = 'possible' | 'pinned' | 'cleared';
export type Mode = 'inspect' | 'probe' | 'stakeout';
export type Screen = 'setup' | 'case' | 'ladder';

interface CaseRecord {
  seed: number;
  /** Archetype this case is played against — part of the case's identity:
   *  replay = (seed + archetype + journal). W1 records default to baseline. */
  archetype: ArchetypeId;
  /** Investigator submissions in order — the journal. Fugitive moves are
   *  deterministic from (seed, archetype) and are NOT stored. */
  investigator: Array<ActionEnvelope<InvestigatorSubmission>>;
  verdict: Verdict | null;
  closedAt?: number;
  startedAt: number;
  source: CaseSource;
  ladderIndex?: number | null;
  /** Live tutorial beat (tutorial cases only) so a reload resumes mid-beat. */
  tutorialBeat?: TutorialBeat;
}

const STORE_KEY = 'dd.m3w1.case.v1';

function loadRecord(): CaseRecord | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CaseRecord>;
    if (typeof parsed?.seed !== 'number' || !Array.isArray(parsed.investigator)) return null;
    // W1 back-compat: records predate archetype/source metadata.
    return {
      ...parsed,
      archetype: parsed.archetype ?? 'baseline',
      source: parsed.source ?? 'solo',
      startedAt: parsed.startedAt ?? Date.now(),
    } as CaseRecord;
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

function cancelAiTimer(): void {
  if (aiTimer !== null) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }
}

export interface StartOptions {
  resume?: CaseRecord;
  archetype?: ArchetypeId;
  source?: CaseSource;
  ladderIndex?: number | null;
}

export interface TutorialState {
  beat: TutorialBeat;
}

export interface DDState {
  screen: Screen;
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
  tutorial: TutorialState | null;
  tutorialDone: boolean;

  hydrate: () => void;
  goSetup: () => void;
  goLadder: () => void;
  startCase: (seed: number, opts?: StartOptions) => void;
  startLadderCase: (index: number) => void;
  resumeCase: () => void;
  abandonCase: () => void;
  select: (n: NodeId | null) => void;
  setMode: (m: Mode) => void;
  setMarker: (n: NodeId, kind: MarkerKind | undefined) => void;
  toggleHalo: () => void;
  probe: (n: NodeId) => void;
  stakeout: (n: NodeId) => void;
  endPhase: () => void;
  startTutorial: () => void;
  advanceTutorial: () => void;
  finishTutorial: () => void;
}

const TUTORIAL_SEQUENCE: TutorialBeat[] = [
  'welcome',
  'tap-drop',
  'probe-sh',
  'stakeout-drop',
  'end-phase',
];

function aiDay(
  session: CaseSession,
  config: CaseConfig,
  arch: ArchetypeId,
  tutorial: boolean,
): void {
  runDays(
    session,
    config,
    arch,
    { scripted: tutorial },
    () => toast.info('The Fugitive is stranded — forced Hold at no cost (§9.13).'),
  );
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
  tutorial: null,
  tutorialDone: false,

  hydrate: () => {
    const rec = loadRecord();
    set({
      resumable: rec && rec.verdict === null ? rec : null,
      tutorialDone: isTutorialDone(),
    });
  },

  goSetup: () => set({ screen: 'setup' }),
  goLadder: () => set({ screen: 'ladder' }),

  startCase: (seed, opts) => {
    cancelAiTimer();
    const resuming = opts?.resume;
    const archetype: ArchetypeId = resuming?.archetype ?? opts?.archetype ?? 'random';
    const source: CaseSource = resuming?.source ?? opts?.source ?? 'solo';
    const ladderIndex = resuming?.ladderIndex ?? opts?.ladderIndex ?? null;

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

    const record: CaseRecord = resuming
      ? {
          ...resuming,
          seed,
          archetype,
          source,
          ladderIndex,
          investigator: [...resuming.investigator],
          verdict: null,
          closedAt: undefined,
        }
      : { seed, archetype, source, ladderIndex, investigator: [], verdict: null, startedAt: Date.now() };

    const isTutorial = source === 'tutorial';
    try {
      aiDay(session, config, archetype, isTutorial); // day 1 fugitive move → investigator phase
      for (const env of record.investigator) {
        session.submitInvestigator(env); // fresh session: journal replays cleanly
        if (session.state.phase === 'FUGITIVE_MOVE' && session.state.verdict === null) {
          aiDay(session, config, archetype, isTutorial);
        }
      }
    } catch (err) {
      toast.error(`Replay failed — starting fresh (${String(err)})`);
      session = new CaseSession(VM, config);
      record.investigator = [];
      record.verdict = null;
      record.closedAt = undefined;
      aiDay(session, config, archetype, isTutorial);
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
      tutorial: isTutorial ? { beat: record.tutorialBeat ?? 'welcome' } : null,
    });
  },

  startLadderCase: (index) => {
    const slot = ladderSlots()[index];
    if (!slot) {
      toast.error('Ladder slot not found.');
      return;
    }
    get().startCase(slot.seed, {
      archetype: slot.archetype,
      source: 'ladder',
      ladderIndex: index,
    });
  },

  resumeCase: () => {
    const rec = get().resumable;
    if (rec) get().startCase(rec.seed, { resume: rec });
  },

  abandonCase: () => {
    cancelAiTimer();
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
      tutorial: null,
    });
  },

  select: (n) => {
    const { tutorial, config } = get();
    if (tutorial && n !== null) {
      if (tutorial.beat === 'tap-drop') {
        const node = VM.map.nodes.find((x) => x.id === n);
        if (!node?.is_drop_candidate) return; // tutorial focus: drops first
        get().advanceTutorial();
      } else if (tutorial.beat === 'probe-sh' && n !== config?.safehouse) {
        return;
      } else if (tutorial.beat === 'stakeout-drop' && n !== config?.drops[0]) {
        return;
      }
    }
    set({ selected: n });
  },

  setMode: (m) => {
    const { tutorial, config } = get();
    if (tutorial && config) {
      if (tutorial.beat === 'probe-sh' && m !== 'probe') return;
      if (tutorial.beat === 'stakeout-drop' && m !== 'stakeout') return;
    }
    set({ mode: m });
  },

  setMarker: (n, kind) => {
    const markers = { ...get().markers };
    if (kind === undefined) delete markers[n];
    else markers[n] = kind;
    set({ markers });
  },
  toggleHalo: () => set({ beliefHalo: !get().beliefHalo }),

  probe: (n) => {
    const { session, config, record, tutorial } = get();
    if (!session || !config || !record || session.state.verdict !== null) return;
    if (session.state.phase !== 'INVESTIGATOR_ACTIONS') {
      toast.warning('The Fugitive is moving — probes open in your phase.');
      return;
    }
    if (tutorial) {
      if (tutorial.beat !== 'probe-sh' || n !== config.safehouse) {
        toast.info('Follow the spotlight — probe the safehouse.');
        return;
      }
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
      if (tutorial && tutorial.beat === 'probe-sh') get().advanceTutorial();
      set({ view: session.investigatorView() });
    } catch (err) {
      toast.error(`Engine rejected probe: ${errText(err)}`);
    }
  },

  stakeout: (n) => {
    const { session, config, record, tutorial } = get();
    if (!session || !config || !record || session.state.verdict !== null) return;
    if (session.state.phase !== 'INVESTIGATOR_ACTIONS') {
      toast.warning('The Fugitive is moving — stakeouts open in your phase.');
      return;
    }
    if (tutorial) {
      if (tutorial.beat !== 'stakeout-drop' || n !== config.drops[0]) {
        toast.info('Follow the spotlight — stake out the first drop site.');
        return;
      }
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
      if (tutorial && tutorial.beat === 'stakeout-drop') get().advanceTutorial();
      set({ view: session.investigatorView() });
    } catch (err) {
      toast.error(`Engine rejected stakeout: ${errText(err)}`);
    }
  },

  endPhase: () => {
    const { session, config, record, tutorial } = get();
    if (!session || !config || !record || session.state.verdict !== null) return;
    if (session.state.phase !== 'INVESTIGATOR_ACTIONS') return;
    if (tutorial && tutorial.beat !== 'end-phase') {
      toast.info('Follow the spotlight — finish the current step first.');
      return;
    }
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
    if (tutorial) get().advanceTutorial(); // end-phase → next beat lands after resolution
    set({ view: session.investigatorView() });

    if (session.state.verdict !== null) {
      finalizeOver(set, get, session, record);
      return;
    }
    // Brief UX beat so the day transition reads — determinism unaffected.
    set({ aiThinking: true });
    aiTimer = setTimeout(() => {
      aiTimer = null;
      const s = get().session;
      const c = get().config;
      const rec = get().record;
      if (!s || !c || !rec) return;
      try {
        aiDay(s, c, rec.archetype, rec.source === 'tutorial');
      } catch (err) {
        toast.error(`AI day failed: ${errText(err)}`);
      }
      set({ aiThinking: false, view: s.investigatorView() });
      if (s.state.verdict !== null) finalizeOver(set, get, s, rec);
    }, 700);
  },

  startTutorial: () => {
    get().startCase(TUTORIAL_SEED, { archetype: 'baseline', source: 'tutorial' });
  },

  advanceTutorial: () => {
    const { tutorial, record } = get();
    if (!tutorial) return;
    const i = TUTORIAL_SEQUENCE.indexOf(tutorial.beat);
    const next = TUTORIAL_SEQUENCE[Math.min(i + 1, TUTORIAL_SEQUENCE.length - 1)]!;
    tutorial.beat = next;
    if (record) {
      record.tutorialBeat = next;
      saveRecord(record);
    }
    set({ tutorial: { ...tutorial } });
  },

  finishTutorial: () => {
    markTutorialDone();
    get().abandonCase();
    set({ tutorialDone: true });
  },
}));

function finalizeOver(
  set: (partial: Partial<DDState>) => void,
  get: () => DDState,
  session: CaseSession,
  record: CaseRecord,
): void {
  record.verdict = session.state.verdict;
  record.closedAt = Date.now();
  saveRecord(record);

  const v = session.state.verdict;
  if (v === null) return; // caller only finalizes over a resolved session
  const verdict: Verdict = v;
  const intelLeft = session.investigatorView().investigator.intel;
  const stars = starsFor(verdict, intelLeft);

  // Archive the closed case (IndexedDB, best-effort) — the replay viewer's source.
  const rec: HistoryRecord = {
    id: `${record.seed}-${record.archetype}-${record.closedAt}`,
    seed: record.seed,
    archetype: record.archetype,
    journal: [...record.investigator],
    verdict,
    stars,
    source: record.source,
    ladderIndex: record.ladderIndex ?? null,
    startedAt: record.startedAt,
    closedAt: record.closedAt,
  };
  void saveCaseRecord(rec).catch(() => undefined);

  if (record.source === 'ladder' && record.ladderIndex !== null && record.ladderIndex !== undefined) {
    saveLadderResult(record.ladderIndex, { verdict, stars, closedAt: record.closedAt });
  }

  set({ disclosure: session.disclosure(), aiThinking: false, view: session.investigatorView() });

  if (record.source === 'tutorial') {
    set({ tutorial: { beat: 'replay' } });
    return;
  }
  if (verdict === 'CAPTURE' || verdict === 'EXPIRY') toast.success(`Case closed — ${verdict}. You win.`);
  else if (verdict === 'ESCAPE') toast.error('Case closed — ESCAPE. The Fugitive is gone.');
  else toast.info(`Case closed — ${verdict}.`);
}

function errText(err: unknown): string {
  if (err instanceof EngineError) return `${err.code} — ${err.message}`;
  return String(err);
}
