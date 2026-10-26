/**
 * Dead Drop — solo game store (M3 W3).
 *
 * Architecture (07-architecture §2, Option B): the UI drives the REAL engine —
 * `CaseSession` is the only rules authority; the store never re-implements a
 * rule. What the store adds is:
 *   1. day-loop mediation for EITHER role (W3):
 *        investigator role — the AI Fugitive (archetype blend, 05-ai-spec §3)
 *        submits through the same public API a human would; §9.13 stranding
 *        resolves via the engine's `resolveStranded()` contract;
 *        fugitive role — the HUMAN submits `submitFugitive()` (or the engine's
 *        `resolveStranded()` when §9.13 leaves no legal action) and the AI
 *        Investigator I-GreedyProbe (05-ai-spec §2, verbatim sim port) acts
 *        through `submitInvestigator()` — same wall, same engine calls;
 *        tutorial days run a scripted controller, also engine-submitted,
 *   2. the action journal + deterministic replay: a case IS (seed + role +
 *      the HUMAN's journal). Investigator-role: fugitive moves replay from
 *      (seed, archetype). Fugitive-role: the AI Investigator is a pure
 *      function of the public state (exact Bayesian tracker, no RNG), so
 *      replaying the human's fugitive journal reproduces it bit-for-bit.
 *   3. role-scoped projection: the UI sees `investigatorView()` OR
 *      `fugitiveView()` — never both, never the raw state,
 *   4. case lifecycle: solo cases (either role), the 24-case investigator
 *      ladder (06-uiux S7), tutorial beats 1–3 (investigator-only), and the
 *      closed-case history archive (IndexedDB) with Stage-3 skill facts
 *      (05-ai-spec §4) collected from live engine state at close.
 */
import { create } from 'zustand';
import { toast } from 'sonner';

import {
  CaseSession,
  EngineError,
  generateCase,
  investigatorLegality,
  isStranded,
  type ActionEnvelope,
  type CaseConfig,
  type CaseEndDisclosure,
  type FugitiveSubmission,
  type FugitiveView,
  type InvestigatorSubmission,
  type InvestigatorView,
  type NodeId,
  type Verdict,
} from '@dead-drop/engine';
import { runDays, type ArchetypeId } from './archetypes';
import { makeTracker, runInvestigatorAi } from './i-greedy';
import type { BeliefTracker } from './belief-tracker';
import { VM } from './vm';
import { ladderSlots, saveLadderResult, starsFor } from './ladder';
import {
  saveCaseRecord,
  type CaseSource,
  type HistoryRecord,
  type PlayerRole,
} from './history';
import { collectSkillFacts, type SkillFacts } from './skill';
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
  /** Which role the HUMAN plays — part of the case's identity:
   *  replay = (seed + role + the human's journal). W1/W2 records are
   *  investigator-side (loadRecord back-compat default). */
  role: PlayerRole;
  /** Archetype this case is played against (investigator role) — part of
   *  the case's identity. Fugitive-role cases face I-GreedyProbe. */
  archetype: ArchetypeId;
  /** Investigator submissions in order (investigator role) — the journal.
   *  Fugitive moves are deterministic from (seed, archetype), NOT stored. */
  investigator: Array<ActionEnvelope<InvestigatorSubmission>>;
  /** Fugitive submissions in order (fugitive role, W3) — the journal. The
   *  AI Investigator is deterministic from public state, NOT stored. */
  fugitive: Array<ActionEnvelope<FugitiveSubmission>>;
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
    // W1/W2 back-compat: records predate role/source metadata.
    return {
      ...parsed,
      role: parsed.role ?? 'investigator',
      fugitive: parsed.fugitive ?? [],
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
  role?: PlayerRole;
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
  /** Which role the HUMAN plays in the open case. */
  role: PlayerRole;
  config: CaseConfig | null;
  /** Investigator-role projection (investigator role only). */
  view: InvestigatorView | null;
  /** Fugitive-role projection (fugitive role only, W3). */
  fview: FugitiveView | null;
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
  /** The AI Investigator's case-long exact belief tracker (fugitive role).
   *  Lives across the whole case — it consumes events incrementally; on
   *  reload it is rebuilt by replaying the journal (deterministic). */
  aiTracker: BeliefTracker | null;

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
  /** Fugitive role (W3): commit today's submission. `null` = HOLD (or the
   *  §9.13 forced-Hold resolve when stranded — the store routes it). */
  fugitiveCommit: (to: NodeId | null) => void;
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

/** One AI-Investigator turn (fugitive role): §2 step 6 actions until WAIT,
 *  then auto-resolve any §9.13 stranded day (the human has no legal
 *  submission those days — the engine produces the forced Hold) and keep
 *  the loop going. Shared by live play AND journal replay — one AI path
 *  everywhere (ADR-005 D3 discipline). */
function aiInvestigatorTurn(
  session: CaseSession,
  tracker: BeliefTracker,
  onStranded?: () => void,
): void {
  runInvestigatorAi(session, tracker);
  while (
    session.state.verdict === null &&
    session.state.phase === 'FUGITIVE_MOVE' &&
    isStranded(session.vm, session.state, session.p)
  ) {
    session.resolveStranded();
    onStranded?.();
    // resolveStranded() mutated the phase (§9.13 → steps 2–5 → step 6); the
    // widened read defeats the loop's phase narrowing.
    const ph: string = session.state.phase;
    if (ph === 'INVESTIGATOR_ACTIONS') runInvestigatorAi(session, tracker);
  }
}


/** Role-scoped projections for the UI. The engine's views are projections
 *  over MUTABLE state (state.log is pushed in place, never cloned), so every
 *  projection clones the live arrays once at the boundary — downstream
 *  React memos key on array identity and would otherwise go stale (W3 fix;
 *  also covers the same latent W1 hazard in MapCanvas reveal tints / HIT
 *  pins). Data is identical — only identity changes. */
function projectI(session: CaseSession): InvestigatorView {
  const v = session.investigatorView();
  return { ...v, log: [...v.log], private_log_investigator: [...v.private_log_investigator] };
}
function projectF(session: CaseSession): FugitiveView {
  const v = session.fugitiveView();
  return { ...v, log: [...v.log] };
}

export const useDD = create<DDState>((set, get) => ({
  screen: 'setup',
  session: null,
  role: 'investigator',
  config: null,
  view: null,
  fview: null,
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
  aiTracker: null,

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
    const role: PlayerRole = resuming?.role ?? opts?.role ?? 'investigator';
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
          role,
          archetype,
          source,
          ladderIndex,
          investigator: [...(resuming.investigator ?? [])],
          fugitive: [...(resuming.fugitive ?? [])],
          verdict: null,
          closedAt: undefined,
        }
      : {
          seed, role, archetype, source, ladderIndex,
          investigator: [], fugitive: [], verdict: null, startedAt: Date.now(),
        };

    const isTutorial = source === 'tutorial';
    let tracker: BeliefTracker | null = null;
    try {
      if (role === 'fugitive') {
        // The HUMAN is the Fugitive: replay their journal; the AI
        // Investigator (I-GreedyProbe) is deterministic from public state.
        tracker = makeTracker(session);
        for (const env of record.fugitive) {
          if (session.state.verdict !== null) break;
          session.submitFugitive(env); // fresh session: journal replays cleanly
          aiInvestigatorTurn(session, tracker);
        }
      } else {
        aiDay(session, config, archetype, isTutorial); // day 1 fugitive move → investigator phase
        for (const env of record.investigator) {
          session.submitInvestigator(env); // fresh session: journal replays cleanly
          if (session.state.phase === 'FUGITIVE_MOVE' && session.state.verdict === null) {
            aiDay(session, config, archetype, isTutorial);
          }
        }
      }
    } catch (err) {
      toast.error(`Replay failed — starting fresh (${String(err)})`);
      session = new CaseSession(VM, config);
      record.investigator = [];
      record.fugitive = [];
      record.verdict = null;
      record.closedAt = undefined;
      tracker = role === 'fugitive' ? makeTracker(session) : null;
      if (role === 'investigator') aiDay(session, config, archetype, isTutorial);
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
      role,
      config,
      view: role === 'investigator' ? projectI(session) : null,
      fview: role === 'fugitive' ? projectF(session) : null,
      disclosure: over ? session.disclosure() : null,
      record,
      resumable: null,
      markers: {},
      selected: null,
      mode: 'inspect',
      aiThinking: false,
      aiTracker: tracker,
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
      role: 'investigator',
      config: null,
      view: null,
      fview: null,
      disclosure: null,
      record: null,
      resumable: null,
      markers: {},
      selected: null,
      mode: 'inspect',
      aiThinking: false,
      tutorial: null,
      aiTracker: null,
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
      set({ view: projectI(session) });
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
      set({ view: projectI(session) });
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
    set({ view: projectI(session) });

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
      set({ aiThinking: false, view: projectI(s) });
      if (s.state.verdict !== null) finalizeOver(set, get, s, rec);
    }, 700);
  },

  startTutorial: () => {
    get().startCase(TUTORIAL_SEED, { archetype: 'baseline', source: 'tutorial' });
  },

  /** Fugitive role (W3): the HUMAN commits today's submission.
   *  `null` = HOLD; when §9.13 leaves nothing affordable, the store routes
   *  the day through the engine's `resolveStranded()` (FORCED_HOLD is
   *  engine-produced, never a submission — T4). After steps 2–5 resolve,
   *  the AI Investigator (I-GreedyProbe) takes §2 step 6 behind the same
   *  wall — its actions are invisible here by rule (§1.3/§5.2). */
  fugitiveCommit: (to) => {
    const { session, config, record, role, aiTracker } = get();
    if (!session || !config || !record || session.state.verdict !== null) return;
    if (role !== 'fugitive' || !aiTracker) return;
    if (session.state.phase !== 'FUGITIVE_MOVE') {
      toast.warning('The Investigator is acting — your next move opens shortly.');
      return;
    }

    if (isStranded(session.vm, session.state, session.p)) {
      // §9.13 — the engine resolves the day; no journal entry (NOT a submission).
      try {
        session.resolveStranded();
      } catch (err) {
        toast.error(`Engine rejected stranded resolve: ${errText(err)}`);
        return;
      }
      toast.info('Stranded — 0 SP. The day resolves as a forced Hold at no cost (§9.13).');
    } else {
      const env: ActionEnvelope<FugitiveSubmission> =
        to === null
          ? { idempotency_key: `f-${session.state.day}-hold`, action: { kind: 'HOLD' } }
          : { idempotency_key: `f-${session.state.day}-move-${to}`, action: { kind: 'MOVE', to } };
      try {
        session.submitFugitive(env);
        record.fugitive.push(env);
        saveRecord(record);
      } catch (err) {
        toast.error(`Engine rejected move: ${errText(err)}`);
        return;
      }
    }

    set({ fview: projectF(session), selected: null });
    if (session.state.verdict !== null) {
      finalizeOver(set, get, session, record);
      return;
    }

    // Brief UX beat so the hand-off reads — determinism unaffected. The AI
    // Investigator's actions are NEVER rendered (the fugitive sees nothing
    // until the day marker lands; stakeouts are silent per §5.2).
    set({ aiThinking: true });
    aiTimer = setTimeout(() => {
      aiTimer = null;
      const s = get().session;
      const rec = get().record;
      const tr = get().aiTracker;
      if (!s || !rec || !tr) return;
      try {
        aiInvestigatorTurn(s, tr, () =>
          toast.info('Stranded again — the day resolved as a forced Hold (§9.13).'),
        );
      } catch (err) {
        toast.error(`AI investigator failed: ${errText(err)}`);
      }
      set({ aiThinking: false, fview: projectF(s) });
      if (s.state.verdict !== null) finalizeOver(set, get, s, rec);
    }, 700);
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
  const role: PlayerRole = record.role ?? 'investigator';

  // Stage-3 skill facts from live engine state (05-ai-spec §4) — collected
  // BEFORE any view projection, best-effort (skill never blocks a close).
  let skill: SkillFacts | undefined;
  try {
    skill = collectSkillFacts(session, role);
  } catch {
    skill = undefined;
  }

  // Archive the closed case (IndexedDB, best-effort) — the replay viewer's
  // and the skill windows' source.
  const rec: HistoryRecord = {
    id: `${record.seed}-${role}-${record.archetype}-${record.closedAt}`,
    seed: record.seed,
    archetype: record.archetype,
    role,
    journal: [...record.investigator],
    fugitiveJournal: role === 'fugitive' ? [...record.fugitive] : undefined,
    skill,
    verdict,
    stars: null,
    source: record.source,
    ladderIndex: record.ladderIndex ?? null,
    startedAt: record.startedAt,
    closedAt: record.closedAt,
  };
  if (role === 'investigator') {
    const intelLeft = session.investigatorView().investigator.intel;
    rec.stars = starsFor(verdict, intelLeft);
  }
  void saveCaseRecord(rec).catch(() => undefined);

  if (
    role === 'investigator' &&
    record.source === 'ladder' &&
    record.ladderIndex !== null &&
    record.ladderIndex !== undefined
  ) {
    saveLadderResult(record.ladderIndex, { verdict, stars: rec.stars ?? 0, closedAt: record.closedAt });
  }

  set({
    disclosure: session.disclosure(),
    aiThinking: false,
    view: role === 'investigator' ? projectI(session) : get().view,
    fview: role === 'fugitive' ? projectF(session) : get().fview,
  });

  if (record.source === 'tutorial') {
    set({ tutorial: { beat: 'replay' } });
    return;
  }
  if (role === 'fugitive') {
    if (verdict === 'ESCAPE') toast.success('Case closed — ESCAPE. You vanished into the city.');
    else if (verdict === 'CAPTURE') toast.error('Case closed — CAPTURE. They were waiting where you landed.');
    else toast.info(`Case closed — ${verdict}.`);
  } else {
    if (verdict === 'CAPTURE' || verdict === 'EXPIRY') toast.success(`Case closed — ${verdict}. You win.`);
    else if (verdict === 'ESCAPE') toast.error('Case closed — ESCAPE. The Fugitive is gone.');
    else toast.info(`Case closed — ${verdict}.`);
  }
}

function errText(err: unknown): string {
  if (err instanceof EngineError) return `${err.code} — ${err.message}`;
  return String(err);
}
