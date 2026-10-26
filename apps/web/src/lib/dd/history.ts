/**
 * Dead Drop — case history archive (M3 W2).
 *
 * IndexedDB store of CLOSED cases. Storage follows ADR-005 D3's model — a
 * case IS (seed + investigator journal) — so the archive stays small and
 * the §8.6 replay is REBUILT deterministically from the journal through the
 * real engine + the real AI (same archetype stream), never snapshotted.
 * IndexedDB upgrades the storage, not the model (07-architecture §4).
 *
 * The current OPEN case still lives in localStorage (fast synchronous
 * resume); this store is the history the replay viewer browses.
 */
import {
  CaseSession,
  generateCase,
  type ActionEnvelope,
  type CaseConfig,
  type CaseEndDisclosure,
  type InvestigatorSubmission,
  type Verdict,
} from '@dead-drop/engine';
import type { ArchetypeId } from './archetypes';
import { runDays } from './archetypes';
import { VM } from './vm';

export type CaseSource = 'solo' | 'ladder' | 'tutorial';

export interface HistoryRecord {
  id: string;
  seed: number;
  archetype: ArchetypeId;
  /** Investigator submissions in order — the journal (fugitive moves are
   *  deterministic from seed + archetype and are NOT stored). */
  journal: Array<ActionEnvelope<InvestigatorSubmission>>;
  verdict: Verdict;
  stars: 0 | 1 | 2 | 3 | null;
  source: CaseSource;
  ladderIndex: number | null;
  startedAt: number;
  closedAt: number;
}

const DB_NAME = 'dead-drop';
const DB_VERSION = 1;
const STORE = 'cases';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('closedAt', 'closedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
        t.oncomplete = () => db.close();
      }),
  );
}

export function saveCaseRecord(rec: HistoryRecord): Promise<void> {
  return tx('readwrite', (s) => s.put(rec) as IDBRequest<IDBValidKey>).then(() => undefined);
}

export async function listCaseRecords(): Promise<HistoryRecord[]> {
  try {
    const all = await tx<HistoryRecord[]>('readonly', (s) => s.getAll() as IDBRequest<HistoryRecord[]>);
    return all.sort((a, b) => b.closedAt - a.closedAt);
  } catch {
    return []; // no IndexedDB (private mode etc.) — history is best-effort
  }
}

export async function deleteCaseRecord(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id) as unknown as IDBRequest<undefined>).catch(() => undefined);
}

/** Rebuild the §8.6 disclosure from (seed + archetype + journal) through the
 *  REAL engine + REAL AI — the replay is the original case, bit-for-bit.
 *  Throws if the journal does not reach a verdict (corrupt/truncated rows). */
export function replayCase(rec: HistoryRecord | {
  seed: number;
  archetype: ArchetypeId;
  journal: Array<ActionEnvelope<InvestigatorSubmission>>;
  source?: CaseSource;
}): { config: CaseConfig; disclosure: CaseEndDisclosure } {
  const config = generateCase(VM, rec.seed).config;
  const session = new CaseSession(VM, config);
  runDays(session, config, rec.archetype, { scripted: rec.source === 'tutorial' });
  for (const env of rec.journal) {
    if (session.state.verdict !== null) break;
    session.submitInvestigator(env); // fresh session: journal replays cleanly
    if (session.state.phase === 'FUGITIVE_MOVE' && session.state.verdict === null) {
      runDays(session, config, rec.archetype, { scripted: rec.source === 'tutorial' });
    }
  }
  return { config, disclosure: session.disclosure() };
}
